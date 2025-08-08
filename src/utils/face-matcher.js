// Face matching utility using face-api.js
let modelsLoaded = false;
let modelLoadingPromise = null;

// Load face-api models from CDN only
async function loadModels() {
    if (modelsLoaded) return;
    if (modelLoadingPromise) return modelLoadingPromise;
    
    modelLoadingPromise = (async () => {
        try {
            console.log('🌐 Loading face-api models from CDN...');
            
            // Use CDN models to reduce extension size
            const cdnPath = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/model';
            console.log('CDN path:', cdnPath);
            
            // Load required models sequentially with error handling
            console.log('Loading SSD MobileNet v1...');
            await faceapi.nets.ssdMobilenetv1.loadFromUri(cdnPath);
            
            console.log('Loading Face Landmark 68 Net...');
            await faceapi.nets.faceLandmark68Net.loadFromUri(cdnPath);
            
            console.log('Loading Face Recognition Net...');
            await faceapi.nets.faceRecognitionNet.loadFromUri(cdnPath);
            
            modelsLoaded = true;
            console.log('✅ All face-api models loaded successfully from CDN');
            
            // Cache the models in browser cache for faster subsequent loads
            console.log('📦 Models are now cached in browser for faster future loads');
            
            return true;
        } catch (error) {
            console.error('❌ Error loading face-api models from CDN:', error);
            modelsLoaded = false;
            modelLoadingPromise = null;
            
            // Provide helpful error message
            if (error.message.includes('Failed to fetch')) {
                throw new Error('Unable to load face detection models. Please check your internet connection.');
            } else {
                throw new Error(`Failed to load face detection models: ${error.message}`);
            }
        }
    })();
    
    return modelLoadingPromise;
}

// Convert image to canvas for face-api processing
function createImageCanvas(imageSrc) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        
        // Handle cross-origin images
        img.crossOrigin = 'anonymous';
        
        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = img.naturalWidth || img.width;
                canvas.height = img.naturalHeight || img.height;
                
                // Ensure minimum size for face detection
                if (canvas.width < 50 || canvas.height < 50) {
                    reject(new Error('Image too small for face detection'));
                    return;
                }
                
                ctx.drawImage(img, 0, 0);
                console.log(`✅ Created canvas for image: ${canvas.width}x${canvas.height}`);
                resolve(canvas);
            } catch (error) {
                console.error('Error creating canvas:', error);
                reject(error);
            }
        };
        
        img.onerror = (error) => {
            console.error('Error loading image:', imageSrc, error);
            reject(new Error(`Failed to load image: ${imageSrc}`));
        };
        
        // Handle data URLs and regular URLs differently
        if (imageSrc.startsWith('data:')) {
            img.src = imageSrc;
        } else {
            // For external images, try to load directly first
            img.src = imageSrc;
        }
    });
}

// Get face descriptor from image with better error handling
async function getFaceDescriptor(imageSrc) {
    try {
        console.log('🔍 Getting face descriptor for:', imageSrc.substring(0, 100) + '...');
        
        await loadModels();
        const canvas = await createImageCanvas(imageSrc);
        
        console.log('🎯 Running face detection...');
        const detection = await faceapi.detectSingleFace(canvas)
            .withFaceLandmarks()
            .withFaceDescriptor();
        
        if (detection) {
            console.log('✅ Face detected and descriptor generated');
            return detection.descriptor;
        } else {
            console.log('❌ No face detected in image');
            return null;
        }
    } catch (error) {
        console.error('❌ Error getting face descriptor:', error);
        return null;
    }
}

// Check if an image matches any celebrity images
async function matchFace(inputImageSrc, celebrityImages) {
    try {
        console.log('🔄 Starting face matching process...');
        console.log('Input image:', inputImageSrc.substring(0, 100) + '...');
        console.log('Celebrity images to check:', celebrityImages.length);
        
        await loadModels();
        
        const inputDescriptor = await getFaceDescriptor(inputImageSrc);
        if (!inputDescriptor) {
            console.log('❌ Could not get face descriptor from input image');
            return false;
        }
        
        console.log('✅ Input face descriptor obtained');

        for (let i = 0; i < celebrityImages.length; i++) {
            const celebrityImage = celebrityImages[i];
            console.log(`🔍 Checking against celebrity image ${i + 1}/${celebrityImages.length}: ${celebrityImage.name}`);
            
            const celebrityDescriptor = await getFaceDescriptor(celebrityImage.dataUrl);
            if (celebrityDescriptor) {
                const distance = faceapi.euclideanDistance(inputDescriptor, celebrityDescriptor);
                console.log(`📏 Face distance: ${distance.toFixed(4)} (threshold: 0.6)`);
                
                if (distance < 0.6) { // Threshold for face matching
                    console.log('🎯 MATCH FOUND! Blocking image');
                    return { match: true, celebrity: celebrityImage.name, distance: distance };
                }
            } else {
                console.log(`❌ Could not get face descriptor from celebrity image: ${celebrityImage.name}`);
            }
        }
        
        console.log('❌ No face match found');
        return false;
    } catch (error) {
        console.error('❌ Error in face matching:', error);
        return false;
    }
}

// Block images that match celebrity faces
async function blockMatchingImages() {
    try {
        console.log('🚀 Starting image blocking process...');
        
        // Load settings
        const settings = await chrome.storage.local.get(['maxScans', 'minSize']);
        const maxScans = settings.maxScans || 10;
        const minSize = settings.minSize || 200;
        
        console.log(`🔧 Settings: maxScans=${maxScans}, minSize=${minSize}px`);
        
        const celebrityImages = await window.StorageUtils.getCelebrityImages();
        console.log(`📋 Found ${celebrityImages.length} celebrity images in storage`);
        
        if (celebrityImages.length === 0) {
            console.log('❌ No celebrity images found, skipping blocking');
            return;
        }

        const allImages = document.querySelectorAll('img[src]:not([data-celebrity-checked])');
        console.log(`🖼️ Found ${allImages.length} unchecked images on page`);
        
        // Filter images by minimum size first, then limit by maxScans
        const validImages = [];
        for (const img of allImages) {
            const width = img.naturalWidth || img.width || 0;
            const height = img.naturalHeight || img.height || 0;
            
            if (width >= minSize && height >= minSize) {
                validImages.push(img);
                if (validImages.length >= maxScans) {
                    break;
                }
            }
        }
        
        console.log(`🎯 Processing ${validImages.length} images (filtered by size >= ${minSize}px, limited to ${maxScans})`);
        
        let blockedCount = 0;
        
        for (const img of validImages) {
            try {
                img.setAttribute('data-celebrity-checked', 'true');
                
                const width = img.naturalWidth || img.width || 0;
                const height = img.naturalHeight || img.height || 0;
                
                console.log(`🔍 Processing image: ${width}x${height} - ${img.src.substring(0, 50)}...`);
                
                const matchResult = await matchFace(img.src, celebrityImages);
                if (matchResult && matchResult.match) {
                    // Create a replacement div with info about what was blocked
                    const blockedDiv = document.createElement('div');
                    blockedDiv.style.cssText = `
                        width: ${img.offsetWidth || width}px;
                        height: ${img.offsetHeight || height}px;
                        background: linear-gradient(45deg, #ff6b6b, #ff8e8e);
                        border: 2px solid #ff4757;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        color: white;
                        font-family: Arial, sans-serif;
                        font-size: 14px;
                        font-weight: bold;
                        text-align: center;
                        box-sizing: border-box;
                        position: relative;
                    `;
                    blockedDiv.innerHTML = `
                        <div>
                            🚫 Celebrity Image Blocked<br>
                            <small>${matchResult.celebrity}</small>
                        </div>
                    `;
                    
                    // Replace the image with the blocked div
                    img.parentNode.replaceChild(blockedDiv, img);
                    blockedCount++;
                    
                    console.log(`🚫 BLOCKED: ${matchResult.celebrity} (distance: ${matchResult.distance.toFixed(4)})`);
                } else {
                    console.log(`✅ Image cleared - no celebrity match found`);
                }
                
                // Add small delay to prevent overwhelming the page
                await new Promise(resolve => setTimeout(resolve, 100));
                
            } catch (error) {
                console.error('❌ Error processing individual image:', error);
            }
        }
        
        // Mark all remaining unchecked images as checked to avoid reprocessing
        const remainingImages = document.querySelectorAll('img[src]:not([data-celebrity-checked])');
        remainingImages.forEach(img => img.setAttribute('data-celebrity-checked', 'true'));
        
        console.log(`✅ Image blocking complete. Blocked ${blockedCount} images.`);
        
        if (blockedCount > 0) {
            // Show notification
            showBlockedNotification(blockedCount);
        }
        
    } catch (error) {
        console.error('❌ Error in blockMatchingImages:', error);
    }
}

// Check system compute resources for face API
async function checkComputeResources() {
    console.log('🔍 Checking compute resources...');
    
    const results = {
        isAdequate: false,
        details: '',
        autoDisabled: false,
        metrics: {}
    };
    
    try {
        // Check available memory
        const memoryInfo = navigator.deviceMemory || 'unknown';
        const hardwareConcurrency = navigator.hardwareConcurrency || 1;
        
        console.log(`💾 Device Memory: ${memoryInfo}GB`);
        console.log(`🔧 Hardware Concurrency: ${hardwareConcurrency} cores`);
        
        results.metrics.memory = memoryInfo;
        results.metrics.cores = hardwareConcurrency;
        
        // Check WebGL support (important for face-api performance)
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        const hasWebGL = !!gl;
        results.metrics.webgl = hasWebGL;
        
        console.log(`🎮 WebGL Support: ${hasWebGL}`);
        
        // Performance test: time a simple face-api operation
        const startTime = performance.now();
        
        try {
            // Load models if not already loaded
            await loadModels();
            
            // Create a small test canvas for performance testing
            const testCanvas = document.createElement('canvas');
            testCanvas.width = 200;
            testCanvas.height = 200;
            const ctx = testCanvas.getContext('2d');
            
            // Fill with a simple pattern (simulating a face-like shape)
            ctx.fillStyle = '#f4c2a1'; // Skin tone
            ctx.fillRect(0, 0, 200, 200);
            ctx.fillStyle = '#000000'; // Eyes
            ctx.fillRect(60, 60, 20, 20);
            ctx.fillRect(120, 60, 20, 20);
            ctx.fillStyle = '#ff6b6b'; // Mouth
            ctx.fillRect(80, 120, 40, 10);
            
            // Test face detection performance
            const detection = await faceapi.detectSingleFace(testCanvas)
                .withFaceLandmarks()
                .withFaceDescriptor();
                
            const endTime = performance.now();
            const processingTime = endTime - startTime;
            
            console.log(`⏱️ Test processing time: ${processingTime.toFixed(2)}ms`);
            console.log(`👤 Test face detected: ${!!detection}`);
            results.metrics.testTime = processingTime;
            results.metrics.faceDetected = !!detection;
            
            // Determine if resources are adequate
            let adequacyScore = 0;
            let issues = [];
            
            // Memory check (minimum 2GB recommended for face-api)
            if (memoryInfo === 'unknown') {
                issues.push('Memory info unavailable');
                adequacyScore += 10; // Give some benefit of doubt
            } else if (memoryInfo < 1) {
                issues.push(`Very low memory: ${memoryInfo}GB (2GB+ recommended)`);
            } else if (memoryInfo < 2) {
                issues.push(`Low memory: ${memoryInfo}GB (2GB+ recommended)`);
                adequacyScore += 15;
            } else if (memoryInfo >= 4) {
                adequacyScore += 35;
            } else {
                adequacyScore += 25;
            }
            
            // CPU cores check
            if (hardwareConcurrency < 2) {
                issues.push(`Single core CPU (2+ cores recommended)`);
                adequacyScore += 10;
            } else if (hardwareConcurrency >= 4) {
                adequacyScore += 25;
            } else {
                adequacyScore += 20;
            }
            
            // WebGL check
            if (!hasWebGL) {
                issues.push('No WebGL support (impacts performance)');
            } else {
                adequacyScore += 10;
            }
            
            // Performance check
            if (processingTime > 10000) {
                issues.push(`Very slow processing: ${processingTime.toFixed(0)}ms (>10s)`);
            } else if (processingTime > 5000) {
                issues.push(`Slow processing: ${processingTime.toFixed(0)}ms (>5s)`);
                adequacyScore += 5;
            } else if (processingTime > 3000) {
                issues.push(`Moderate processing: ${processingTime.toFixed(0)}ms`);
                adequacyScore += 15;
            } else if (processingTime > 1000) {
                adequacyScore += 25;
            } else {
                adequacyScore += 30;
            }
            
            results.isAdequate = adequacyScore >= 50;
            
            if (results.isAdequate) {
                results.details = `✅ Score: ${adequacyScore}/100 | ${memoryInfo}GB RAM, ${hardwareConcurrency} cores, ${processingTime.toFixed(0)}ms test`;
            } else {
                results.details = `❌ Score: ${adequacyScore}/100 | Issues: ${issues.join(', ')}`;
                
                // Auto-disable if score is very low (critical performance issues)
                if (adequacyScore < 25) {
                    results.autoDisabled = true;
                    console.log('🚫 Auto-disabling face detection due to critical performance issues');
                }
            }
            
        } catch (modelError) {
            console.error('❌ Error during face-api test:', modelError);
            results.details = 'Face detection test failed - models may not be compatible';
            results.autoDisabled = true;
        }
        
    } catch (error) {
        console.error('❌ Error checking compute resources:', error);
        results.details = `System check failed: ${error.message}`;
        results.autoDisabled = true;
    }
    
    console.log('📊 Compute check results:', results);
    return results;
}

// Show notification when images are blocked
function showBlockedNotification(count) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #4CAF50;
        color: white;
        padding: 12px 20px;
        border-radius: 5px;
        font-family: Arial, sans-serif;
        font-size: 14px;
        z-index: 10000;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        transition: opacity 0.3s;
    `;
    notification.textContent = `🚫 Blocked ${count} celebrity image${count > 1 ? 's' : ''}`;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Make functions available globally
if (typeof window !== 'undefined') {
    window.FaceMatcher = {
        loadModels,
        getFaceDescriptor,
        matchFace,
        blockMatchingImages,
        checkComputeResources
    };
}