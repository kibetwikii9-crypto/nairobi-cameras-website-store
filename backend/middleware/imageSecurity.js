const crypto = require('crypto');
const sharp = require('sharp');

class ImageSecurityMiddleware {
    constructor() {
        this.suspiciousPatterns = [
            /<script/i,
            /javascript:/i,
            /on\w+\s*=/i,
            /eval\s*\(/i,
            /expression\s*\(/i,
            /vbscript:/i,
            /data:text\/html/i,
            /data:application\/javascript/i
        ];
        
        this.allowedMimeTypes = [
            'image/jpeg',
            'image/jpg', 
            'image/png',
            'image/gif',
            'image/webp'
        ];
        
        this.maxFileSize = 5 * 1024 * 1024; // 5MB
        this.quarantineDir = './quarantine';
    }

    // Validate image content for security threats
    async validateImageContent(buffer) {
        try {
            // Check for suspicious patterns in file content
            const content = buffer.toString('utf8', 0, Math.min(buffer.length, 1024));
            
            for (const pattern of this.suspiciousPatterns) {
                if (pattern.test(content)) {
                    throw new Error('Suspicious content detected in image');
                }
            }

            // Validate image using sharp
            const metadata = await sharp(buffer).metadata();
            
            if (!metadata.width || !metadata.height) {
                throw new Error('Invalid image dimensions');
            }

            // Check for reasonable dimensions
            if (metadata.width > 10000 || metadata.height > 10000) {
                throw new Error('Image dimensions too large');
            }

            return {
                valid: true,
                metadata: {
                    width: metadata.width,
                    height: metadata.height,
                    format: metadata.format,
                    size: buffer.length
                }
            };
        } catch (error) {
            return {
                valid: false,
                error: error.message
            };
        }
    }

    // Sanitize image metadata
    async sanitizeImage(buffer) {
        try {
            // Remove EXIF data and other metadata
            const sanitized = await sharp(buffer)
                .jpeg({ 
                    quality: 85,
                    progressive: true,
                    mozjpeg: true
                })
                .toBuffer();

            return {
                success: true,
                buffer: sanitized,
                originalSize: buffer.length,
                newSize: sanitized.length
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Generate secure filename
    generateSecureFilename(originalName) {
        const timestamp = Date.now();
        const random = crypto.randomBytes(8).toString('hex');
        const ext = this.getFileExtension(originalName);
        
        return `img_${timestamp}_${random}${ext}`;
    }

    getFileExtension(filename) {
        return filename.toLowerCase().match(/\.[a-z0-9]+$/)?.[0] || '.jpg';
    }

    // Rate limiting for uploads
    createUploadRateLimit() {
        const uploadAttempts = new Map();
        
        return (req, res, next) => {
            const ip = req.ip || req.connection.remoteAddress;
            const now = Date.now();
            const windowMs = 15 * 60 * 1000; // 15 minutes
            const maxUploads = 10; // Max 10 uploads per window
            
            if (!uploadAttempts.has(ip)) {
                uploadAttempts.set(ip, { count: 0, resetTime: now + windowMs });
            }
            
            const attempts = uploadAttempts.get(ip);
            
            // Reset if window has passed
            if (now > attempts.resetTime) {
                attempts.count = 0;
                attempts.resetTime = now + windowMs;
            }
            
            if (attempts.count >= maxUploads) {
                return res.status(429).json({
                    success: false,
                    message: 'Too many upload attempts. Please try again later.',
                    retryAfter: Math.ceil((attempts.resetTime - now) / 1000)
                });
            }
            
            attempts.count++;
            next();
        };
    }

    // CSRF protection for uploads
    validateCSRFToken(req, res, next) {
        const token = req.headers['x-csrf-token'] || req.body._csrf;
        const sessionToken = req.session?.csrfToken;
        
        if (!token || !sessionToken || token !== sessionToken) {
            return res.status(403).json({
                success: false,
                message: 'Invalid CSRF token'
            });
        }
        
        next();
    }

    // Content Security Policy for images
    setImageCSP(req, res, next) {
        res.setHeader('Content-Security-Policy', 
            "default-src 'self'; " +
            "img-src 'self' data: https:; " +
            "script-src 'self' 'unsafe-inline'; " +
            "style-src 'self' 'unsafe-inline'"
        );
        next();
    }

    // Quarantine suspicious files
    async quarantineFile(buffer, filename, reason) {
        const fs = require('fs');
        const path = require('path');
        
        if (!fs.existsSync(this.quarantineDir)) {
            fs.mkdirSync(this.quarantineDir, { recursive: true });
        }
        
        const quarantinePath = path.join(
            this.quarantineDir, 
            `quarantine_${Date.now()}_${filename}`
        );
        
        fs.writeFileSync(quarantinePath, buffer);
        
        // Log quarantine event
        console.warn(`File quarantined: ${filename}, Reason: ${reason}`);
        
        return quarantinePath;
    }

    // Scan for malware patterns (basic implementation)
    scanForMalware(buffer) {
        const suspiciousSignatures = [
            Buffer.from([0x4D, 0x5A]), // PE executable
            Buffer.from([0x7F, 0x45, 0x4C, 0x46]), // ELF executable
            Buffer.from([0xCA, 0xFE, 0xBA, 0xBE]), // Java class
        ];
        
        for (const signature of suspiciousSignatures) {
            if (buffer.includes(signature)) {
                return {
                    clean: false,
                    threat: 'Executable code detected'
                };
            }
        }
        
        return { clean: true };
    }

    // Generate secure image URL
    generateSecureUrl(filename, options = {}) {
        const {
            expiresIn = 3600, // 1 hour
            includeHash = true
        } = options;
        
        const timestamp = Math.floor(Date.now() / 1000) + expiresIn;
        const hash = crypto.createHmac('sha256', process.env.SECRET_KEY || 'default')
            .update(filename + timestamp)
            .digest('hex')
            .substring(0, 16);
        
        return includeHash 
            ? `/images/uploads/${filename}?t=${timestamp}&h=${hash}`
            : `/images/uploads/${filename}`;
    }

    // Validate image URL
    validateImageUrl(url) {
        try {
            const urlObj = new URL(url);
            
            // Only allow HTTPS in production
            if (process.env.NODE_ENV === 'production' && urlObj.protocol !== 'https:') {
                return { valid: false, error: 'Only HTTPS URLs allowed in production' };
            }
            
            // Check for suspicious domains
            const suspiciousDomains = ['localhost', '127.0.0.1', '0.0.0.0'];
            if (suspiciousDomains.includes(urlObj.hostname)) {
                return { valid: false, error: 'Suspicious domain not allowed' };
            }
            
            return { valid: true };
        } catch (error) {
            return { valid: false, error: 'Invalid URL format' };
        }
    }

    // Audit log for image operations
    logImageOperation(operation, details) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            operation,
            details,
            ip: details.ip || 'unknown',
            userAgent: details.userAgent || 'unknown'
        };
        
        console.log(`[IMAGE_AUDIT] ${JSON.stringify(logEntry)}`);
    }
}

module.exports = new ImageSecurityMiddleware();
