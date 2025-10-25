const sharp = require('sharp');
const path = require('path');

class ImageCompressionService {
    constructor() {
        this.compressionProfiles = {
            thumbnail: {
                width: 150,
                height: 150,
                quality: 80,
                format: 'jpeg',
                fit: 'cover'
            },
            small: {
                width: 400,
                height: 400,
                quality: 85,
                format: 'jpeg',
                fit: 'inside'
            },
            medium: {
                width: 800,
                height: 600,
                quality: 85,
                format: 'jpeg',
                fit: 'inside'
            },
            large: {
                width: 1200,
                height: 900,
                quality: 90,
                format: 'jpeg',
                fit: 'inside'
            },
            webp: {
                width: 800,
                height: 600,
                quality: 80,
                format: 'webp',
                fit: 'inside'
            },
            avif: {
                width: 800,
                height: 600,
                quality: 80,
                format: 'avif',
                fit: 'inside'
            }
        };
        
        this.optimizationSettings = {
            jpeg: {
                quality: 85,
                progressive: true,
                mozjpeg: true,
                optimize: true
            },
            png: {
                quality: 90,
                compressionLevel: 9,
                progressive: true,
                optimize: true
            },
            webp: {
                quality: 80,
                lossless: false,
                nearLossless: false,
                smartSubsample: true
            },
            avif: {
                quality: 80,
                lossless: false,
                effort: 4
            }
        };
    }

    // Compress image with specific profile
    async compressImage(imageBuffer, profile = 'medium', options = {}) {
        try {
            const config = { ...this.compressionProfiles[profile], ...options };
            
            const compressed = await sharp(imageBuffer)
                .resize(config.width, config.height, {
                    fit: config.fit,
                    withoutEnlargement: true,
                    position: 'center'
                })
                .toFormat(config.format, this.optimizationSettings[config.format])
                .toBuffer();
            
            return {
                buffer: compressed,
                originalSize: imageBuffer.length,
                compressedSize: compressed.length,
                compressionRatio: ((imageBuffer.length - compressed.length) / imageBuffer.length) * 100,
                format: config.format,
                dimensions: {
                    width: config.width,
                    height: config.height
                }
            };
        } catch (error) {
            throw new Error(`Compression failed: ${error.message}`);
        }
    }

    // Generate multiple sizes for responsive images
    async generateResponsiveImages(imageBuffer, sizes = ['thumbnail', 'small', 'medium', 'large']) {
        const results = {};
        
        for (const size of sizes) {
            try {
                const compressed = await this.compressImage(imageBuffer, size);
                results[size] = compressed;
            } catch (error) {
                console.error(`Failed to generate ${size} image:`, error);
                results[size] = { error: error.message };
            }
        }
        
        return results;
    }

    // Generate modern format images (WebP, AVIF)
    async generateModernFormats(imageBuffer, formats = ['webp', 'avif']) {
        const results = {};
        
        for (const format of formats) {
            try {
                const compressed = await this.compressImage(imageBuffer, format);
                results[format] = compressed;
            } catch (error) {
                console.error(`Failed to generate ${format} image:`, error);
                results[format] = { error: error.message };
            }
        }
        
        return results;
    }

    // Optimize image for web delivery
    async optimizeForWeb(imageBuffer, options = {}) {
        const {
            maxWidth = 1200,
            maxHeight = 900,
            quality = 85,
            format = 'jpeg',
            progressive = true
        } = options;
        
        try {
            const metadata = await sharp(imageBuffer).metadata();
            
            // Calculate optimal dimensions
            const aspectRatio = metadata.width / metadata.height;
            let targetWidth = maxWidth;
            let targetHeight = maxHeight;
            
            if (aspectRatio > 1) {
                targetHeight = Math.round(targetWidth / aspectRatio);
            } else {
                targetWidth = Math.round(targetHeight * aspectRatio);
            }
            
            const optimized = await sharp(imageBuffer)
                .resize(targetWidth, targetHeight, {
                    fit: 'inside',
                    withoutEnlargement: true
                })
                .toFormat(format, this.optimizationSettings[format])
                .toBuffer();
            
            return {
                buffer: optimized,
                originalSize: imageBuffer.length,
                optimizedSize: optimized.length,
                savings: ((imageBuffer.length - optimized.length) / imageBuffer.length) * 100,
                dimensions: {
                    original: { width: metadata.width, height: metadata.height },
                    optimized: { width: targetWidth, height: targetHeight }
                }
            };
        } catch (error) {
            throw new Error(`Web optimization failed: ${error.message}`);
        }
    }

    // Create image with watermark
    async addWatermark(imageBuffer, watermarkOptions = {}) {
        const {
            text = 'Golden Source Technologies',
            position = 'bottom-right',
            opacity = 0.3,
            fontSize = 24,
            color = 'white'
        } = watermarkOptions;
        
        try {
            // Create watermark text
            const watermark = await sharp({
                text: {
                    text: text,
                    font: fontSize,
                    color: color,
                    align: 'center'
                }
            }).png().toBuffer();
            
            // Get image dimensions
            const metadata = await sharp(imageBuffer).metadata();
            
            // Calculate watermark position
            let left, top;
            switch (position) {
                case 'top-left':
                    left = 10;
                    top = 10;
                    break;
                case 'top-right':
                    left = metadata.width - 200;
                    top = 10;
                    break;
                case 'bottom-left':
                    left = 10;
                    top = metadata.height - 50;
                    break;
                case 'bottom-right':
                default:
                    left = metadata.width - 200;
                    top = metadata.height - 50;
                    break;
            }
            
            // Composite watermark onto image
            const watermarked = await sharp(imageBuffer)
                .composite([{
                    input: watermark,
                    left: left,
                    top: top,
                    blend: 'over'
                }])
                .jpeg({ quality: 85 })
                .toBuffer();
            
            return watermarked;
        } catch (error) {
            throw new Error(`Watermarking failed: ${error.message}`);
        }
    }

    // Create image with border
    async addBorder(imageBuffer, borderOptions = {}) {
        const {
            width = 2,
            color = '#000000',
            style = 'solid'
        } = borderOptions;
        
        try {
            const metadata = await sharp(imageBuffer).metadata();
            const newWidth = metadata.width + (width * 2);
            const newHeight = metadata.height + (width * 2);
            
            const bordered = await sharp(imageBuffer)
                .extend({
                    top: width,
                    bottom: width,
                    left: width,
                    right: width,
                    background: color
                })
                .jpeg({ quality: 85 })
                .toBuffer();
            
            return bordered;
        } catch (error) {
            throw new Error(`Border addition failed: ${error.message}`);
        }
    }

    // Convert image to different format
    async convertFormat(imageBuffer, targetFormat, options = {}) {
        try {
            const converted = await sharp(imageBuffer)
                .toFormat(targetFormat, this.optimizationSettings[targetFormat])
                .toBuffer();
            
            return {
                buffer: converted,
                originalFormat: (await sharp(imageBuffer).metadata()).format,
                targetFormat: targetFormat,
                originalSize: imageBuffer.length,
                convertedSize: converted.length
            };
        } catch (error) {
            throw new Error(`Format conversion failed: ${error.message}`);
        }
    }

    // Create image collage
    async createCollage(images, options = {}) {
        const {
            layout = 'grid',
            spacing = 10,
            background = '#ffffff',
            maxWidth = 1200,
            maxHeight = 900
        } = options;
        
        try {
            if (images.length === 0) {
                throw new Error('No images provided for collage');
            }
            
            // Calculate grid dimensions
            const cols = Math.ceil(Math.sqrt(images.length));
            const rows = Math.ceil(images.length / cols);
            
            // Calculate cell dimensions
            const cellWidth = Math.floor((maxWidth - (spacing * (cols - 1))) / cols);
            const cellHeight = Math.floor((maxHeight - (spacing * (rows - 1))) / rows);
            
            // Resize all images to cell dimensions
            const resizedImages = [];
            for (const image of images) {
                const resized = await sharp(image)
                    .resize(cellWidth, cellHeight, { fit: 'cover' })
                    .jpeg({ quality: 85 })
                    .toBuffer();
                resizedImages.push(resized);
            }
            
            // Create composite operations
            const composite = [];
            for (let i = 0; i < resizedImages.length; i++) {
                const row = Math.floor(i / cols);
                const col = i % cols;
                
                composite.push({
                    input: resizedImages[i],
                    left: col * (cellWidth + spacing),
                    top: row * (cellHeight + spacing)
                });
            }
            
            // Create collage
            const collage = await sharp({
                create: {
                    width: maxWidth,
                    height: maxHeight,
                    channels: 3,
                    background: background
                }
            })
            .composite(composite)
            .jpeg({ quality: 85 })
            .toBuffer();
            
            return collage;
        } catch (error) {
            throw new Error(`Collage creation failed: ${error.message}`);
        }
    }

    // Analyze image and suggest optimization
    async analyzeAndOptimize(imageBuffer) {
        try {
            const metadata = await sharp(imageBuffer).metadata();
            const stats = await sharp(imageBuffer).stats();
            
            const analysis = {
                current: {
                    width: metadata.width,
                    height: metadata.height,
                    format: metadata.format,
                    size: imageBuffer.length,
                    channels: metadata.channels
                },
                recommendations: [],
                optimizedVersions: {}
            };
            
            // Check if image is too large
            if (metadata.width > 2000 || metadata.height > 2000) {
                analysis.recommendations.push({
                    type: 'resize',
                    message: 'Image is too large for web use',
                    suggestion: 'Resize to maximum 1200x900'
                });
            }
            
            // Check file size
            if (imageBuffer.length > 1024 * 1024) { // 1MB
                analysis.recommendations.push({
                    type: 'compress',
                    message: 'File size is too large',
                    suggestion: 'Compress to reduce file size'
                });
            }
            
            // Check format
            if (metadata.format === 'png' && !metadata.hasAlpha) {
                analysis.recommendations.push({
                    type: 'format',
                    message: 'PNG without transparency can be converted to JPEG',
                    suggestion: 'Convert to JPEG for better compression'
                });
            }
            
            // Generate optimized versions
            try {
                analysis.optimizedVersions.web = await this.optimizeForWeb(imageBuffer);
                analysis.optimizedVersions.thumbnail = await this.compressImage(imageBuffer, 'thumbnail');
                analysis.optimizedVersions.webp = await this.generateModernFormats(imageBuffer, ['webp']);
            } catch (error) {
                console.error('Failed to generate optimized versions:', error);
            }
            
            return analysis;
        } catch (error) {
            throw new Error(`Image analysis failed: ${error.message}`);
        }
    }

    // Batch process multiple images
    async batchProcess(images, operation, options = {}) {
        const results = [];
        
        for (let i = 0; i < images.length; i++) {
            try {
                let result;
                switch (operation) {
                    case 'compress':
                        result = await this.compressImage(images[i], options.profile || 'medium');
                        break;
                    case 'optimize':
                        result = await this.optimizeForWeb(images[i], options);
                        break;
                    case 'convert':
                        result = await this.convertFormat(images[i], options.format);
                        break;
                    default:
                        throw new Error(`Unknown operation: ${operation}`);
                }
                
                results.push({
                    index: i,
                    success: true,
                    result: result
                });
            } catch (error) {
                results.push({
                    index: i,
                    success: false,
                    error: error.message
                });
            }
        }
        
        return results;
    }
}

module.exports = new ImageCompressionService();
