// Debug utilities for Celebrity Image Blocker
window.CelebrityBlockerDebug = {
    // Test if face-api is working
    async testFaceAPI() {
        console.log('🧪 Testing face-api.js...');
        
        if (typeof faceapi === 'undefined') {
            console.error('❌ face-api.js not loaded');
            return false;
        }
        
        try {
            await window.FaceMatcher.loadModels();
            console.log('✅ Models loaded successfully');
            
            // Try to create a test canvas
            const canvas = document.createElement('canvas');
            canvas.width = 100;
            canvas.height = 100;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = 'red';
            ctx.fillRect(0, 0, 100, 100);
            
            console.log('✅ Canvas created successfully');
            return true;
        } catch (error) {
            console.error('❌ Face-api test failed:', error);
            return false;
        }
    },
    
    // Get storage info
    async getStorageInfo() {
        try {
            const images = await window.StorageUtils.getCelebrityImages();
            console.log('📋 Storage info:', {
                count: images.length,
                images: images.map(img => ({
                    name: img.name,
                    size: img.dataUrl ? img.dataUrl.length : 'N/A'
                }))
            });
            return images;
        } catch (error) {
            console.error('❌ Error getting storage info:', error);
            return null;
        }
    },
    
    // Test image processing
    async testImageProcessing() {
        console.log('🧪 Testing image processing...');
        
        const images = document.querySelectorAll('img[src]');
        console.log(`Found ${images.length} images on page`);
        
        if (images.length > 0) {
            const testImg = images[0];
            console.log('Testing first image:', testImg.src);
            
            try {
                const descriptor = await window.FaceMatcher.getFaceDescriptor(testImg.src);
                if (descriptor) {
                    console.log('✅ Face detected in image');
                    return true;
                } else {
                    console.log('❌ No face detected in image');
                    return false;
                }
            } catch (error) {
                console.error('❌ Error processing image:', error);
                return false;
            }
        }
        
        return false;
    },
    
    // Force trigger blocking
    async forceTrigger() {
        console.log('🔧 Force triggering celebrity blocking...');
        
        // Reset all checked flags
        document.querySelectorAll('img[data-celebrity-checked]').forEach(img => {
            img.removeAttribute('data-celebrity-checked');
        });
        
        await window.FaceMatcher.blockMatchingImages();
    }
};

console.log('🐛 Debug utilities loaded. Use CelebrityBlockerDebug.testFaceAPI() to test.');
