const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class ImageCacheService {
    constructor() {
        this.cacheDir = path.join(__dirname, '../cache/images');
        this.maxCacheSize = 100 * 1024 * 1024; // 100MB
        this.maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
        this.cacheStats = {
            hits: 0,
            misses: 0,
            evictions: 0,
            size: 0
        };
        
        this.initializeCache();
    }

    initializeCache() {
        if (!fs.existsSync(this.cacheDir)) {
            fs.mkdirSync(this.cacheDir, { recursive: true });
        }
        
        // Start cleanup interval
        setInterval(() => this.cleanup(), 60 * 60 * 1000); // Every hour
    }

    // Generate cache key for image
    generateCacheKey(url, options = {}) {
        const {
            width = 800,
            height = 600,
            quality = 85,
            format = 'jpeg'
        } = options;

        const keyData = `${url}_${width}x${height}_q${quality}_${format}`;
        return crypto.createHash('md5').update(keyData).digest('hex');
    }

    // Get cached image
    async getCachedImage(url, options = {}) {
        const cacheKey = this.generateCacheKey(url, options);
        const cachePath = path.join(this.cacheDir, `${cacheKey}.jpg`);
        
        try {
            if (fs.existsSync(cachePath)) {
                const stats = fs.statSync(cachePath);
                
                // Check if cache is still valid
                if (Date.now() - stats.mtime.getTime() < this.maxAge) {
                    this.cacheStats.hits++;
                    return {
                        found: true,
                        path: cachePath,
                        size: stats.size
                    };
                } else {
                    // Remove expired cache
                    fs.unlinkSync(cachePath);
                }
            }
        } catch (error) {
            console.error('Cache read error:', error);
        }
        
        this.cacheStats.misses++;
        return { found: false };
    }

    // Cache processed image
    async cacheImage(url, imageBuffer, options = {}) {
        const cacheKey = this.generateCacheKey(url, options);
        const cachePath = path.join(this.cacheDir, `${cacheKey}.jpg`);
        
        try {
            fs.writeFileSync(cachePath, imageBuffer);
            
            // Update cache stats
            this.cacheStats.size += imageBuffer.length;
            
            // Check if we need to evict old entries
            if (this.cacheStats.size > this.maxCacheSize) {
                await this.evictOldEntries();
            }
            
            return cachePath;
        } catch (error) {
            console.error('Cache write error:', error);
            throw error;
        }
    }

    // Evict old cache entries
    async evictOldEntries() {
        try {
            const files = fs.readdirSync(this.cacheDir);
            const fileStats = files.map(file => {
                const filePath = path.join(this.cacheDir, file);
                const stats = fs.statSync(filePath);
                return {
                    name: file,
                    path: filePath,
                    mtime: stats.mtime,
                    size: stats.size
                };
            });

            // Sort by modification time (oldest first)
            fileStats.sort((a, b) => a.mtime - b.mtime);

            // Remove oldest files until we're under the limit
            let removedSize = 0;
            for (const file of fileStats) {
                if (this.cacheStats.size - removedSize <= this.maxCacheSize * 0.8) {
                    break;
                }
                
                fs.unlinkSync(file.path);
                removedSize += file.size;
                this.cacheStats.evictions++;
            }
            
            this.cacheStats.size -= removedSize;
        } catch (error) {
            console.error('Cache eviction error:', error);
        }
    }

    // Cleanup expired cache entries
    async cleanup() {
        try {
            const files = fs.readdirSync(this.cacheDir);
            const now = Date.now();
            let cleanedSize = 0;
            let cleanedCount = 0;
            
            for (const file of files) {
                const filePath = path.join(this.cacheDir, file);
                const stats = fs.statSync(filePath);
                
                if (now - stats.mtime.getTime() > this.maxAge) {
                    fs.unlinkSync(filePath);
                    cleanedSize += stats.size;
                    cleanedCount++;
                }
            }
            
            this.cacheStats.size -= cleanedSize;
            
            if (cleanedCount > 0) {
                console.log(`Cleaned ${cleanedCount} expired cache entries (${(cleanedSize / 1024 / 1024).toFixed(2)}MB)`);
            }
        } catch (error) {
            console.error('Cache cleanup error:', error);
        }
    }

    // Get cache statistics
    getStats() {
        return {
            ...this.cacheStats,
            hitRate: this.cacheStats.hits / (this.cacheStats.hits + this.cacheStats.misses) || 0,
            sizeMB: (this.cacheStats.size / 1024 / 1024).toFixed(2)
        };
    }

    // Clear all cache
    clearCache() {
        try {
            const files = fs.readdirSync(this.cacheDir);
            for (const file of files) {
                fs.unlinkSync(path.join(this.cacheDir, file));
            }
            
            this.cacheStats = {
                hits: 0,
                misses: 0,
                evictions: 0,
                size: 0
            };
            
            console.log('Cache cleared');
        } catch (error) {
            console.error('Cache clear error:', error);
        }
    }

    // Preload images into cache
    async preloadImages(imageUrls, options = {}) {
        const results = [];
        
        for (const url of imageUrls) {
            try {
                const cached = await this.getCachedImage(url, options);
                if (!cached.found) {
                    // Process and cache image with timeout
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
                    
                    try {
                        const response = await fetch(url, { signal: controller.signal });
                        clearTimeout(timeoutId);
                        
                        if (response.ok) {
                            const buffer = await response.arrayBuffer();
                            const cachePath = await this.cacheImage(url, Buffer.from(buffer), options);
                            results.push({ url, cached: true, path: cachePath });
                        } else {
                            results.push({ url, cached: false, error: 'Failed to fetch' });
                        }
                    } catch (fetchError) {
                        clearTimeout(timeoutId);
                        if (fetchError.name === 'AbortError') {
                            results.push({ url, cached: false, error: 'Request timeout' });
                        } else {
                            results.push({ url, cached: false, error: fetchError.message });
                        }
                    }
                } else {
                    results.push({ url, cached: true, path: cached.path });
                }
            } catch (error) {
                results.push({ url, cached: false, error: error.message });
            }
        }
        
        return results;
    }

    // Get cache file path for serving
    getCacheFilePath(url, options = {}) {
        const cacheKey = this.generateCacheKey(url, options);
        return path.join(this.cacheDir, `${cacheKey}.jpg`);
    }

    // Check if cache file exists and is valid
    isCacheValid(url, options = {}) {
        const cachePath = this.getCacheFilePath(url, options);
        
        if (!fs.existsSync(cachePath)) {
            return false;
        }
        
        const stats = fs.statSync(cachePath);
        return Date.now() - stats.mtime.getTime() < this.maxAge;
    }
}

module.exports = new ImageCacheService();
