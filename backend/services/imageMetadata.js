const sharp = require('sharp');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

class ImageMetadataService {
    constructor() {
        this.metadataCache = new Map();
        this.cacheExpiry = 24 * 60 * 60 * 1000; // 24 hours
    }

    // Extract comprehensive metadata from image
    async extractMetadata(imageBuffer, options = {}) {
        try {
            const metadata = await sharp(imageBuffer).metadata();
            const stats = await sharp(imageBuffer).stats();
            
            const imageMetadata = {
                // Basic properties
                width: metadata.width,
                height: metadata.height,
                format: metadata.format,
                size: imageBuffer.length,
                channels: metadata.channels,
                density: metadata.density,
                hasAlpha: metadata.hasAlpha,
                hasProfile: metadata.hasProfile,
                
                // Color information
                colorspace: metadata.space,
                background: metadata.background,
                
                // EXIF data (if available)
                exif: metadata.exif ? this.parseExifData(metadata.exif) : null,
                
                // Color statistics
                dominantColors: this.extractDominantColors(stats),
                colorHistogram: this.generateColorHistogram(stats),
                
                // Technical properties
                orientation: metadata.orientation,
                isAnimated: metadata.pages > 1,
                pages: metadata.pages || 1,
                
                // Quality metrics
                quality: this.calculateQualityScore(metadata, stats),
                compression: this.estimateCompression(metadata),
                
                // Security and validation
                isValid: this.validateImageIntegrity(metadata),
                hasSuspiciousContent: this.checkSuspiciousContent(metadata),
                
                // Processing information
                processedAt: new Date().toISOString(),
                processingVersion: '1.0.0',
                
                // Hash for deduplication
                contentHash: crypto.createHash('sha256').update(imageBuffer).digest('hex'),
                perceptualHash: await this.generatePerceptualHash(imageBuffer)
            };
            
            return imageMetadata;
        } catch (error) {
            throw new Error(`Metadata extraction failed: ${error.message}`);
        }
    }

    // Parse EXIF data safely
    parseExifData(exifBuffer) {
        try {
            // Basic EXIF parsing - in production, use a proper EXIF library
            return {
                hasExif: true,
                size: exifBuffer.length,
                // Add more EXIF parsing as needed
            };
        } catch (error) {
            return {
                hasExif: false,
                error: error.message
            };
        }
    }

    // Extract dominant colors from image
    extractDominantColors(stats) {
        try {
            const channels = stats.channels;
            if (!channels || channels.length === 0) return [];
            
            // Simple dominant color extraction
            const colors = [];
            for (let i = 0; i < Math.min(channels.length, 3); i++) {
                const channel = channels[i];
                colors.push({
                    r: Math.round(channel.mean),
                    g: Math.round(channels[1]?.mean || channel.mean),
                    b: Math.round(channels[2]?.mean || channel.mean),
                    percentage: 100 / channels.length
                });
            }
            
            return colors;
        } catch (error) {
            return [];
        }
    }

    // Generate color histogram
    generateColorHistogram(stats) {
        try {
            const channels = stats.channels;
            if (!channels || channels.length === 0) return null;
            
            return {
                red: this.generateChannelHistogram(channels[0]),
                green: this.generateChannelHistogram(channels[1]),
                blue: this.generateChannelHistogram(channels[2])
            };
        } catch (error) {
            return null;
        }
    }

    // Generate histogram for a single channel
    generateChannelHistogram(channel) {
        if (!channel) return null;
        
        return {
            min: channel.min,
            max: channel.max,
            mean: channel.mean,
            stdev: channel.stdev,
            median: channel.median
        };
    }

    // Calculate image quality score
    calculateQualityScore(metadata, stats) {
        let score = 100;
        
        // Deduct for low resolution
        if (metadata.width < 800 || metadata.height < 600) {
            score -= 20;
        }
        
        // Deduct for poor color distribution
        if (stats.channels && stats.channels.length > 0) {
            const channel = stats.channels[0];
            if (channel.stdev < 20) {
                score -= 15; // Low contrast
            }
        }
        
        // Deduct for very large file size (inefficient compression)
        const pixels = metadata.width * metadata.height;
        const bytesPerPixel = metadata.size / pixels;
        if (bytesPerPixel > 2) {
            score -= 10;
        }
        
        return Math.max(0, Math.min(100, score));
    }

    // Estimate compression level
    estimateCompression(metadata) {
        const pixels = metadata.width * metadata.height;
        const bytesPerPixel = metadata.size / pixels;
        
        if (bytesPerPixel < 0.5) return 'high';
        if (bytesPerPixel < 1.0) return 'medium';
        return 'low';
    }

    // Validate image integrity
    validateImageIntegrity(metadata) {
        // Check for valid dimensions
        if (!metadata.width || !metadata.height || metadata.width <= 0 || metadata.height <= 0) {
            return false;
        }
        
        // Check for reasonable dimensions
        if (metadata.width > 10000 || metadata.height > 10000) {
            return false;
        }
        
        // Check for valid format
        const validFormats = ['jpeg', 'png', 'gif', 'webp', 'tiff'];
        if (!validFormats.includes(metadata.format)) {
            return false;
        }
        
        return true;
    }

    // Check for suspicious content
    checkSuspiciousContent(metadata) {
        // Check for unusual properties that might indicate malicious content
        const suspicious = [];
        
        // Check for extremely large dimensions
        if (metadata.width > 50000 || metadata.height > 50000) {
            suspicious.push('extreme_dimensions');
        }
        
        // Check for unusual aspect ratio
        const aspectRatio = metadata.width / metadata.height;
        if (aspectRatio > 100 || aspectRatio < 0.01) {
            suspicious.push('unusual_aspect_ratio');
        }
        
        // Check for embedded profiles (potential security risk)
        if (metadata.hasProfile) {
            suspicious.push('embedded_profile');
        }
        
        return suspicious.length > 0 ? suspicious : null;
    }

    // Generate perceptual hash for duplicate detection
    async generatePerceptualHash(imageBuffer) {
        try {
            // Resize to 8x8 for hash generation
            const resized = await sharp(imageBuffer)
                .resize(8, 8, { fit: 'fill' })
                .grayscale()
                .raw()
                .toBuffer();
            
            // Calculate average
            const pixels = Array.from(resized);
            const average = pixels.reduce((sum, pixel) => sum + pixel, 0) / pixels.length;
            
            // Generate hash
            let hash = '';
            for (const pixel of pixels) {
                hash += pixel > average ? '1' : '0';
            }
            
            return hash;
        } catch (error) {
            return null;
        }
    }

    // Find similar images using perceptual hash
    async findSimilarImages(targetHash, threshold = 0.8) {
        const similar = [];
        
        for (const [hash, metadata] of this.metadataCache) {
            if (hash === 'perceptual') continue; // Skip non-hash entries
            
            const similarity = this.calculateHashSimilarity(targetHash, hash);
            if (similarity >= threshold) {
                similar.push({
                    metadata,
                    similarity,
                    hash
                });
            }
        }
        
        return similar.sort((a, b) => b.similarity - a.similarity);
    }

    // Calculate similarity between two hashes
    calculateHashSimilarity(hash1, hash2) {
        if (!hash1 || !hash2 || hash1.length !== hash2.length) {
            return 0;
        }
        
        let matches = 0;
        for (let i = 0; i < hash1.length; i++) {
            if (hash1[i] === hash2[i]) {
                matches++;
            }
        }
        
        return matches / hash1.length;
    }

    // Store metadata in cache
    storeMetadata(contentHash, metadata) {
        this.metadataCache.set(contentHash, {
            ...metadata,
            cachedAt: new Date().toISOString()
        });
        
        // Clean up expired entries
        this.cleanupCache();
    }

    // Get metadata from cache
    getMetadata(contentHash) {
        const cached = this.metadataCache.get(contentHash);
        if (!cached) return null;
        
        // Check if cache entry is expired
        const age = Date.now() - new Date(cached.cachedAt).getTime();
        if (age > this.cacheExpiry) {
            this.metadataCache.delete(contentHash);
            return null;
        }
        
        return cached;
    }

    // Clean up expired cache entries
    cleanupCache() {
        const now = Date.now();
        for (const [hash, metadata] of this.metadataCache) {
            const age = now - new Date(metadata.cachedAt).getTime();
            if (age > this.cacheExpiry) {
                this.metadataCache.delete(hash);
            }
        }
    }

    // Generate image fingerprint
    generateFingerprint(metadata) {
        const fingerprint = {
            dimensions: `${metadata.width}x${metadata.height}`,
            format: metadata.format,
            size: metadata.size,
            channels: metadata.channels,
            hasAlpha: metadata.hasAlpha,
            orientation: metadata.orientation
        };
        
        return crypto.createHash('md5')
            .update(JSON.stringify(fingerprint))
            .digest('hex');
    }

    // Validate metadata consistency
    validateMetadataConsistency(metadata) {
        const issues = [];
        
        // Check dimension consistency
        if (metadata.width && metadata.height) {
            const aspectRatio = metadata.width / metadata.height;
            if (aspectRatio < 0.1 || aspectRatio > 10) {
                issues.push('unusual_aspect_ratio');
            }
        }
        
        // Check size consistency
        if (metadata.size && metadata.width && metadata.height) {
            const pixels = metadata.width * metadata.height;
            const bytesPerPixel = metadata.size / pixels;
            if (bytesPerPixel > 10) {
                issues.push('unusually_large_file_size');
            }
        }
        
        // Check format consistency
        if (metadata.format === 'jpeg' && metadata.hasAlpha) {
            issues.push('jpeg_with_alpha_channel');
        }
        
        return issues.length > 0 ? issues : null;
    }

    // Get metadata summary
    getMetadataSummary(metadata) {
        return {
            basic: {
                dimensions: `${metadata.width}x${metadata.height}`,
                format: metadata.format,
                size: this.formatFileSize(metadata.size),
                quality: metadata.quality
            },
            technical: {
                channels: metadata.channels,
                hasAlpha: metadata.hasAlpha,
                orientation: metadata.orientation,
                compression: metadata.compression
            },
            security: {
                isValid: metadata.isValid,
                hasSuspiciousContent: metadata.hasSuspiciousContent,
                contentHash: metadata.contentHash
            }
        };
    }

    // Format file size for display
    formatFileSize(bytes) {
        const sizes = ['B', 'KB', 'MB', 'GB'];
        if (bytes === 0) return '0 B';
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }
}

module.exports = new ImageMetadataService();
