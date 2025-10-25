// Enhanced Image Handler for Frontend
class ImageHandler {
    constructor() {
        this.defaultImage = '/images/default.jpg';
        this.placeholderImage = '/images/placeholder.jpg';
        this.fallbackImages = [
            '/images/default.jpg',
            '/images/placeholder.jpg',
            'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&h=400&fit=crop&crop=center',
            'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=400&fit=crop&crop=center'
        ];
        this.failedImages = new Set();
        this.retryAttempts = new Map();
        this.maxRetries = 3;
    }

    // Enhanced image error handling
    handleImageError(img, options = {}) {
        const {
            fallbackIndex = 0,
            retryOnError = true,
            showLoadingState = true,
            customFallback = null
        } = options;

        // Prevent infinite loops
        img.onerror = null;
        
        // Remove loading class
        img.classList.remove('loading');
        
        // Get current image source
        const currentSrc = img.src;
        
        // Check if we've already tried this image
        if (this.failedImages.has(currentSrc)) {
            this.setFallbackImage(img, fallbackIndex, customFallback);
            return;
        }

        // Mark image as failed
        this.failedImages.add(currentSrc);
        
        // Try retry logic if enabled
        if (retryOnError && this.shouldRetry(currentSrc)) {
            this.retryImageLoad(img, currentSrc);
            return;
        }

        // Set fallback image
        this.setFallbackImage(img, fallbackIndex, customFallback);
        
        // Log error for monitoring
        console.warn(`Image failed to load: ${currentSrc}`);
    }

    // Set fallback image
    setFallbackImage(img, fallbackIndex, customFallback) {
        if (customFallback) {
            img.src = customFallback;
            return;
        }

        const fallbackSrc = this.fallbackImages[fallbackIndex] || this.defaultImage;
        img.src = fallbackSrc;
        
        // Add error class for styling
        img.classList.add('image-error');
        
        // Add alt text
        img.alt = img.alt || 'Image not available';
    }

    // Retry logic for failed images
    shouldRetry(src) {
        const attempts = this.retryAttempts.get(src) || 0;
        return attempts < this.maxRetries;
    }

    retryImageLoad(img, src) {
        const attempts = this.retryAttempts.get(src) || 0;
        this.retryAttempts.set(src, attempts + 1);
        
        // Add loading state
        img.classList.add('loading');
        
        // Retry with exponential backoff
        const delay = Math.pow(2, attempts) * 1000; // 1s, 2s, 4s
        
        setTimeout(() => {
            img.src = src + '?retry=' + attempts; // Add cache buster
        }, delay);
    }

    // Preload images with error handling
    async preloadImages(urls) {
        const promises = urls.map(url => this.preloadSingleImage(url));
        return Promise.allSettled(promises);
    }

    async preloadSingleImage(url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            
            img.onload = () => {
                resolve({ url, success: true });
            };
            
            img.onerror = () => {
                this.failedImages.add(url);
                reject({ url, success: false, error: 'Failed to load' });
            };
            
            img.src = url;
        });
    }

    // Validate image URL
    isValidImageUrl(url) {
        try {
            const urlObj = new URL(url);
            return ['http:', 'https:'].includes(urlObj.protocol);
        } catch {
            return false;
        }
    }

    // Get optimized image URL
    getOptimizedImageUrl(url, options = {}) {
        const {
            width = 400,
            height = 400,
            quality = 85,
            format = 'jpeg'
        } = options;

        // For external URLs, try to optimize
        if (url.includes('unsplash.com')) {
            return url.replace(/w=\d+&h=\d+/, `w=${width}&h=${height}`);
        }

        // For local images, return as-is
        return url;
    }

    // Create responsive image element
    createResponsiveImage(src, alt = '', options = {}) {
        const {
            sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
            loading = 'lazy',
            className = 'responsive-image'
        } = options;

        const img = document.createElement('img');
        img.src = src;
        img.alt = alt;
        img.loading = loading;
        img.className = className;
        img.sizes = sizes;

        // Add error handling
        img.onerror = () => this.handleImageError(img, options);

        return img;
    }

    // Batch process images with error handling
    processImageBatch(images, options = {}) {
        const {
            maxConcurrent = 5,
            retryFailed = true
        } = options;

        return this.processBatch(images, maxConcurrent, retryFailed);
    }

    async processBatch(images, maxConcurrent, retryFailed) {
        const results = [];
        const chunks = this.chunkArray(images, maxConcurrent);

        for (const chunk of chunks) {
            const promises = chunk.map(async (image) => {
                try {
                    const result = await this.preloadSingleImage(image.url || image);
                    return { ...image, ...result };
                } catch (error) {
                    if (retryFailed) {
                        return this.retryImageLoad(image, image.url || image);
                    }
                    return { ...image, error: error.message };
                }
            });

            const chunkResults = await Promise.allSettled(promises);
            results.push(...chunkResults.map(r => r.value || r.reason));
        }

        return results;
    }

    // Utility function to chunk array
    chunkArray(array, size) {
        const chunks = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    }

    // Clear failed images cache
    clearFailedCache() {
        this.failedImages.clear();
        this.retryAttempts.clear();
    }

    // Get image statistics
    getStats() {
        return {
            failedImages: this.failedImages.size,
            retryAttempts: this.retryAttempts.size,
            fallbackImages: this.fallbackImages.length
        };
    }
}

// Global image handler instance
window.imageHandler = new ImageHandler();

// Enhanced error handler for all images
document.addEventListener('DOMContentLoaded', function() {
    // Add error handling to all existing images
    const images = document.querySelectorAll('img');
    images.forEach(img => {
        if (!img.onerror) {
            img.onerror = function() {
                window.imageHandler.handleImageError(this);
            };
        }
    });
});

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ImageHandler;
}
