// Image analysis cache utility
// Manages local cache for image face detection results

class ImageCache {
    constructor() {
        this.maxCacheSize = 100 * 1024 * 1024; // 100 MB in bytes
        this.cacheName = 'celebrityImageCache';
        this.dbHashName = 'faceDbHash';
    }

    // Generate hash for image URL or data
    async generateImageHash(imageSrc) {
        try {
            // For data URLs, hash the data part
            if (imageSrc.startsWith('data:')) {
                const dataContent = imageSrc.split(',')[1] || imageSrc;
                return await this.hashString(dataContent.substring(0, 1000)); // First 1000 chars for efficiency
            }
            
            // For regular URLs, hash the URL itself
            return await this.hashString(imageSrc);
        } catch (error) {
            console.error('Error generating image hash:', error);
            return null;
        }
    }

    // Generate hash for face database
    async generateFaceDbHash(celebrityImages) {
        try {
            // Create a string representation of all celebrity images
            const dbString = celebrityImages
                .map(img => `${img.name}:${img.dataUrl.substring(0, 100)}`) // Use first 100 chars of each image
                .sort() // Sort to ensure consistent hash regardless of order
                .join('|');
            
            return await this.hashString(dbString);
        } catch (error) {
            console.error('Error generating face DB hash:', error);
            return null;
        }
    }

    // Hash a string using SubtleCrypto
    async hashString(str) {
        try {
            const encoder = new TextEncoder();
            const data = encoder.encode(str);
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        } catch (error) {
            console.error('Error hashing string:', error);
            return str; // Fallback to original string if hashing fails
        }
    }

    // Store cache entry
    async storeCacheEntry(imageHash, totalFaces, totalMatches, faceDbHash, matchedCelebrities = []) {
        try {
            const cache = await this.getCache();
            const timestamp = Date.now();
            
            const entry = {
                timestamp,
                imageHash,
                totalFaces,
                totalMatches,
                faceDbHash,
                matchedCelebrities // Store which celebrities were matched
            };

            cache[imageHash] = entry;
            
            // Manage cache size
            await this.manageCacheSize(cache);
            
            // Store updated cache
            await chrome.storage.local.set({ [this.cacheName]: cache });
            
            console.log(`📝 Cache entry stored: ${imageHash.substring(0, 8)}... (faces: ${totalFaces}, matches: ${totalMatches})`);
            
        } catch (error) {
            console.error('Error storing cache entry:', error);
        }
    }

    // Get cache entry
    async getCacheEntry(imageHash) {
        try {
            const cache = await this.getCache();
            return cache[imageHash] || null;
        } catch (error) {
            console.error('Error getting cache entry:', error);
            return null;
        }
    }

    // Check if image should be processed or can use cache
    async shouldProcessImage(imageSrc, currentFaceDbHash) {
        try {
            const imageHash = await this.generateImageHash(imageSrc);
            if (!imageHash) return { process: true, reason: 'Failed to generate image hash' };

            const cacheEntry = await this.getCacheEntry(imageHash);
            if (!cacheEntry) {
                return { process: true, reason: 'No cache entry found' };
            }

            // Check if face database has changed
            if (cacheEntry.faceDbHash !== currentFaceDbHash) {
                return { process: true, reason: 'Face database has changed' };
            }

            // Check cache age (expire after 7 days)
            const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
            if (Date.now() - cacheEntry.timestamp > maxAge) {
                return { process: true, reason: 'Cache entry expired' };
            }

            // If no faces were detected, skip processing
            if (cacheEntry.totalFaces === 0) {
                return { 
                    process: false, 
                    reason: 'No faces in cache',
                    shouldBlock: false,
                    cacheEntry 
                };
            }

            // If faces were found and matches exist, block the image
            if (cacheEntry.totalMatches > 0) {
                return { 
                    process: false, 
                    reason: 'Cache hit with matches',
                    shouldBlock: true,
                    matchedCelebrities: cacheEntry.matchedCelebrities,
                    cacheEntry 
                };
            }

            // Faces found but no matches, skip processing
            return { 
                process: false, 
                reason: 'Cache hit with no matches',
                shouldBlock: false,
                cacheEntry 
            };

        } catch (error) {
            console.error('Error checking cache:', error);
            return { process: true, reason: 'Cache check error' };
        }
    }

    // Get current cache
    async getCache() {
        try {
            const result = await chrome.storage.local.get([this.cacheName]);
            return result[this.cacheName] || {};
        } catch (error) {
            console.error('Error getting cache:', error);
            return {};
        }
    }

    // Manage cache size by removing oldest entries
    async manageCacheSize(cache) {
        try {
            // Estimate cache size (rough calculation)
            const cacheString = JSON.stringify(cache);
            const currentSize = new Blob([cacheString]).size;
            
            console.log(`💾 Current cache size: ${(currentSize / 1024 / 1024).toFixed(2)} MB`);

            if (currentSize > this.maxCacheSize) {
                console.log('🧹 Cache size limit exceeded, cleaning old entries...');
                
                // Sort entries by timestamp (oldest first)
                const entries = Object.entries(cache).sort((a, b) => a[1].timestamp - b[1].timestamp);
                
                // Remove oldest entries until we're under the limit
                while (entries.length > 0) {
                    const [imageHash] = entries.shift();
                    delete cache[imageHash];
                    
                    const newSize = new Blob([JSON.stringify(cache)]).size;
                    if (newSize <= this.maxCacheSize * 0.8) { // Clean to 80% of max size
                        break;
                    }
                }
                
                const finalSize = new Blob([JSON.stringify(cache)]).size;
                console.log(`✅ Cache cleaned. New size: ${(finalSize / 1024 / 1024).toFixed(2)} MB`);
            }
        } catch (error) {
            console.error('Error managing cache size:', error);
        }
    }

    // Get cache statistics
    async getCacheStats() {
        try {
            const cache = await this.getCache();
            const entries = Object.values(cache);
            const cacheString = JSON.stringify(cache);
            const size = new Blob([cacheString]).size;
            
            const totalEntries = entries.length;
            const totalWithFaces = entries.filter(e => e.totalFaces > 0).length;
            const totalWithMatches = entries.filter(e => e.totalMatches > 0).length;
            
            return {
                totalEntries,
                totalWithFaces,
                totalWithMatches,
                sizeBytes: size,
                sizeMB: (size / 1024 / 1024).toFixed(2)
            };
        } catch (error) {
            console.error('Error getting cache stats:', error);
            return {
                totalEntries: 0,
                totalWithFaces: 0,
                totalWithMatches: 0,
                sizeBytes: 0,
                sizeMB: '0.00'
            };
        }
    }

    // Clear all cache
    async clearCache() {
        try {
            await chrome.storage.local.remove([this.cacheName]);
            console.log('🗑️ Cache cleared');
        } catch (error) {
            console.error('Error clearing cache:', error);
        }
    }

    // Store current face database hash
    async storeFaceDbHash(hash) {
        try {
            await chrome.storage.local.set({ [this.dbHashName]: hash });
        } catch (error) {
            console.error('Error storing face DB hash:', error);
        }
    }

    // Get current face database hash
    async getFaceDbHash() {
        try {
            const result = await chrome.storage.local.get([this.dbHashName]);
            return result[this.dbHashName] || '';
        } catch (error) {
            console.error('Error getting face DB hash:', error);
            return '';
        }
    }
}

// Make available globally
if (typeof window !== 'undefined') {
    window.ImageCache = new ImageCache();
}
