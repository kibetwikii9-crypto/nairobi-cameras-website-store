const fs = require('fs');
const path = require('path');

class ImageMonitoringService {
    constructor() {
        this.metrics = {
            uploads: {
                total: 0,
                successful: 0,
                failed: 0,
                totalSize: 0,
                averageSize: 0
            },
            processing: {
                total: 0,
                averageTime: 0,
                compressionRatio: 0,
                errors: 0
            },
            delivery: {
                requests: 0,
                cacheHits: 0,
                cacheMisses: 0,
                averageResponseTime: 0,
                errors: 0
            },
            security: {
                blocked: 0,
                quarantined: 0,
                suspicious: 0,
                clean: 0
            }
        };
        
        this.performanceData = [];
        this.errorLog = [];
        this.logFile = path.join(__dirname, '../logs/image-monitoring.log');
        
        this.initializeLogging();
    }

    initializeLogging() {
        const logDir = path.dirname(this.logFile);
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
    }

    // Log image upload metrics
    logUpload(success, fileSize, processingTime, error = null) {
        this.metrics.uploads.total++;
        
        if (success) {
            this.metrics.uploads.successful++;
            this.metrics.uploads.totalSize += fileSize;
            this.metrics.uploads.averageSize = this.metrics.uploads.totalSize / this.metrics.uploads.successful;
        } else {
            this.metrics.uploads.failed++;
            if (error) {
                this.logError('upload_failed', error, { fileSize, processingTime });
            }
        }
        
        this.logPerformance('upload', {
            success,
            fileSize,
            processingTime,
            timestamp: new Date().toISOString()
        });
    }

    // Log image processing metrics
    logProcessing(success, originalSize, processedSize, processingTime, error = null) {
        this.metrics.processing.total++;
        
        if (success) {
            const compressionRatio = ((originalSize - processedSize) / originalSize) * 100;
            this.metrics.processing.compressionRatio = 
                (this.metrics.processing.compressionRatio + compressionRatio) / 2;
        } else {
            this.metrics.processing.errors++;
            if (error) {
                this.logError('processing_failed', error, { 
                    originalSize, 
                    processedSize, 
                    processingTime 
                });
            }
        }
        
        this.logPerformance('processing', {
            success,
            originalSize,
            processedSize,
            processingTime,
            compressionRatio: success ? ((originalSize - processedSize) / originalSize) * 100 : 0,
            timestamp: new Date().toISOString()
        });
    }

    // Log image delivery metrics
    logDelivery(cacheHit, responseTime, error = null) {
        this.metrics.delivery.requests++;
        
        if (cacheHit) {
            this.metrics.delivery.cacheHits++;
        } else {
            this.metrics.delivery.cacheMisses++;
        }
        
        // Update average response time
        this.metrics.delivery.averageResponseTime = 
            (this.metrics.delivery.averageResponseTime + responseTime) / 2;
        
        if (error) {
            this.metrics.delivery.errors++;
            this.logError('delivery_failed', error, { cacheHit, responseTime });
        }
        
        this.logPerformance('delivery', {
            cacheHit,
            responseTime,
            timestamp: new Date().toISOString()
        });
    }

    // Log security events
    logSecurity(event, details) {
        switch (event) {
            case 'blocked':
                this.metrics.security.blocked++;
                break;
            case 'quarantined':
                this.metrics.security.quarantined++;
                break;
            case 'suspicious':
                this.metrics.security.suspicious++;
                break;
            case 'clean':
                this.metrics.security.clean++;
                break;
        }
        
        this.logError('security_event', event, details);
    }

    // Log performance data
    logPerformance(operation, data) {
        this.performanceData.push({
            operation,
            ...data,
            timestamp: new Date().toISOString()
        });
        
        // Keep only last 1000 entries
        if (this.performanceData.length > 1000) {
            this.performanceData = this.performanceData.slice(-1000);
        }
    }

    // Log errors
    logError(type, error, context = {}) {
        const errorEntry = {
            type,
            error: error.message || error,
            context,
            timestamp: new Date().toISOString(),
            stack: error.stack
        };
        
        this.errorLog.push(errorEntry);
        
        // Keep only last 500 entries
        if (this.errorLog.length > 500) {
            this.errorLog = this.errorLog.slice(-500);
        }
        
        // Write to log file
        this.writeToLogFile(errorEntry);
    }

    // Write to log file
    writeToLogFile(entry) {
        try {
            const logEntry = JSON.stringify(entry) + '\n';
            fs.appendFileSync(this.logFile, logEntry);
        } catch (error) {
            console.error('Failed to write to log file:', error);
        }
    }

    // Get comprehensive metrics
    getMetrics() {
        const now = new Date();
        const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        
        // Filter recent data
        const recentPerformance = this.performanceData.filter(
            entry => new Date(entry.timestamp) > last24h
        );
        
        const recentErrors = this.errorLog.filter(
            entry => new Date(entry.timestamp) > last24h
        );
        
        return {
            metrics: this.metrics,
            recent: {
                performance: recentPerformance,
                errors: recentErrors,
                errorRate: recentErrors.length / Math.max(recentPerformance.length, 1)
            },
            cache: {
                hitRate: this.metrics.delivery.cacheHits / 
                    Math.max(this.metrics.delivery.requests, 1),
                missRate: this.metrics.delivery.cacheMisses / 
                    Math.max(this.metrics.delivery.requests, 1)
            },
            performance: {
                averageUploadTime: this.calculateAverageTime('upload'),
                averageProcessingTime: this.calculateAverageTime('processing'),
                averageDeliveryTime: this.metrics.delivery.averageResponseTime
            }
        };
    }

    // Calculate average time for operation
    calculateAverageTime(operation) {
        const operationData = this.performanceData.filter(
            entry => entry.operation === operation && entry.processingTime
        );
        
        if (operationData.length === 0) return 0;
        
        const totalTime = operationData.reduce(
            (sum, entry) => sum + entry.processingTime, 0
        );
        
        return totalTime / operationData.length;
    }

    // Get error summary
    getErrorSummary() {
        const errorTypes = {};
        
        this.errorLog.forEach(entry => {
            errorTypes[entry.type] = (errorTypes[entry.type] || 0) + 1;
        });
        
        return {
            totalErrors: this.errorLog.length,
            errorTypes,
            recentErrors: this.errorLog.slice(-10) // Last 10 errors
        };
    }

    // Get performance trends
    getPerformanceTrends(hours = 24) {
        const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
        
        const recentData = this.performanceData.filter(
            entry => new Date(entry.timestamp) > cutoff
        );
        
        const trends = {
            uploads: this.getTrendData(recentData, 'upload'),
            processing: this.getTrendData(recentData, 'processing'),
            delivery: this.getTrendData(recentData, 'delivery')
        };
        
        return trends;
    }

    // Get trend data for specific operation
    getTrendData(data, operation) {
        const operationData = data.filter(entry => entry.operation === operation);
        
        if (operationData.length === 0) {
            return { count: 0, averageTime: 0, successRate: 0 };
        }
        
        const successful = operationData.filter(entry => entry.success).length;
        const totalTime = operationData.reduce(
            (sum, entry) => sum + (entry.processingTime || 0), 0
        );
        
        return {
            count: operationData.length,
            averageTime: totalTime / operationData.length,
            successRate: successful / operationData.length
        };
    }

    // Generate health report
    generateHealthReport() {
        const metrics = this.getMetrics();
        const errorSummary = this.getErrorSummary();
        
        const health = {
            status: 'healthy',
            issues: [],
            recommendations: []
        };
        
        // Check upload success rate
        const uploadSuccessRate = this.metrics.uploads.successful / 
            Math.max(this.metrics.uploads.total, 1);
        
        if (uploadSuccessRate < 0.9) {
            health.status = 'warning';
            health.issues.push('Low upload success rate');
            health.recommendations.push('Check file validation and processing pipeline');
        }
        
        // Check error rate
        if (errorSummary.totalErrors > 100) {
            health.status = 'warning';
            health.issues.push('High error count');
            health.recommendations.push('Review error logs and fix recurring issues');
        }
        
        // Check cache hit rate
        const cacheHitRate = metrics.cache.hitRate;
        if (cacheHitRate < 0.5) {
            health.issues.push('Low cache hit rate');
            health.recommendations.push('Optimize caching strategy');
        }
        
        // Check processing time
        if (metrics.performance.averageProcessingTime > 5000) {
            health.issues.push('Slow image processing');
            health.recommendations.push('Optimize image processing pipeline');
        }
        
        return {
            health,
            metrics,
            errorSummary,
            timestamp: new Date().toISOString()
        };
    }

    // Reset metrics
    resetMetrics() {
        this.metrics = {
            uploads: { total: 0, successful: 0, failed: 0, totalSize: 0, averageSize: 0 },
            processing: { total: 0, averageTime: 0, compressionRatio: 0, errors: 0 },
            delivery: { requests: 0, cacheHits: 0, cacheMisses: 0, averageResponseTime: 0, errors: 0 },
            security: { blocked: 0, quarantined: 0, suspicious: 0, clean: 0 }
        };
        
        this.performanceData = [];
        this.errorLog = [];
        
        console.log('Image monitoring metrics reset');
    }
}

module.exports = new ImageMonitoringService();
