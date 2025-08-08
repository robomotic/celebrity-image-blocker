// Content script for celebrity image blocking
console.log('🚀 Celebrity Image Blocker content script loaded on:', window.location.href);

let isBlockingEnabled = true;
// Note: modelsLoaded is declared in face-matcher.js

// Initialize the extension when the page loads
async function initializeExtension() {
    try {
        console.log('🔄 Initializing Celebrity Image Blocker...');
        
        // Check if face-api is available (should be loaded via manifest)
        if (typeof faceapi === 'undefined') {
            throw new Error('face-api.js library not loaded');
        }
        console.log('✅ face-api.js library is available');
        
        // Load blocking settings
        const settings = await chrome.storage.local.get(['blockingEnabled']);
        isBlockingEnabled = settings.blockingEnabled !== false; // Default to true
        console.log('🔧 Blocking enabled:', isBlockingEnabled);
        
        if (!isBlockingEnabled) {
            console.log('❌ Face blocking is disabled. Skipping initialization.');
            return;
        }
        
        // Check if we have celebrity images to work with
        const celebrityImages = await window.StorageUtils.getCelebrityImages();
        console.log(`📋 Found ${celebrityImages.length} celebrity images in storage`);
        
        if (celebrityImages.length === 0) {
            console.log('❌ No celebrity images found. Please upload some images first.');
            return;
        }
        
        // Don't load models immediately - wait until we actually need them
        console.log('🔄 Extension ready. Models will be loaded on-demand when images are detected.');
        
        // Check if there are images on the page
        const images = document.querySelectorAll('img[src]');
        if (images.length > 0) {
            console.log(`🖼️ Found ${images.length} images on page. Loading models...`);
            
            // Load models only when needed
            await loadModelsIfNeeded();
            
            // Block existing images
            console.log('🖼️ Scanning existing images...');
            await window.FaceMatcher.blockMatchingImages();
        } else {
            console.log('📷 No images found on initial load. Models will load when images appear.');
        }
        
        // Set up observer for dynamically added images
        setupImageObserver();
        
        console.log('✅ Celebrity Image Blocker initialized');
    } catch (error) {
        console.error('❌ Error initializing Celebrity Image Blocker:', error);
        
        // Try to report error to background script
        try {
            chrome.runtime.sendMessage({
                action: 'logError',
                error: error.message,
                url: window.location.href
            });
        } catch (bgError) {
            console.error('❌ Could not report error to background script:', bgError);
        }
    }
}

// Load models only when needed
async function loadModelsIfNeeded() {
    try {
        // Check if face-api is available
        if (typeof faceapi === 'undefined') {
            throw new Error('face-api.js library not available');
        }
        
        console.log('📦 Loading face-api models...');
        await window.FaceMatcher.loadModels(); // This function handles the modelsLoaded check internally
        console.log('✅ Face-api models loaded successfully');
    } catch (error) {
        console.error('❌ Failed to load models:', error);
        throw error;
    }
}

// Set up MutationObserver to watch for new images
function setupImageObserver() {
    if (!isBlockingEnabled) {
        console.log('⏭️ Image observer skipped - blocking disabled');
        return;
    }
    
    console.log('👀 Setting up image observer...');
    
    const observer = new MutationObserver(async (mutations) => {
        if (!isBlockingEnabled) return; // Skip if disabled
        
        let foundNewImages = false;
        
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    // Check if the node itself is an image
                    if (node.tagName === 'IMG') {
                        foundNewImages = true;
                    }
                    // Check if the node contains images
                    else if (node.querySelectorAll) {
                        const images = node.querySelectorAll('img');
                        if (images.length > 0) {
                            foundNewImages = true;
                        }
                    }
                }
            });
        });
        
        if (foundNewImages) {
            console.log('🆕 New images detected, scanning for celebrity faces...');
            // Add a small delay to let images load
            setTimeout(async () => {
                try {
                    // Load models if not already loaded
                    await loadModelsIfNeeded();
                    await window.FaceMatcher.blockMatchingImages();
                } catch (error) {
                    console.error('❌ Error processing new images:', error);
                }
            }, 500);
        }
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    console.log('✅ Image observer set up successfully');
}

// Listen for enable/disable messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('📨 Message received:', message.action);
    
    if (message.action === 'ping') {
        sendResponse({ pong: true });
        return true;
    }
    
    if (message.action === 'toggleBlocking') {
        isBlockingEnabled = message.enabled;
        console.log('🔄 Blocking toggled:', isBlockingEnabled ? 'enabled' : 'disabled');
        
        if (isBlockingEnabled) {
            // Re-initialize if enabled
            initializeExtension();
        } else {
            // Remove all blocking overlays if disabled
            const overlays = document.querySelectorAll('[data-celebrity-blocker="overlay"]');
            overlays.forEach(overlay => overlay.remove());
            console.log('🗑️ Removed all blocking overlays');
        }
        
        sendResponse({ success: true });
        return true;
    }
    
    if (message.action === 'getStatus') {
        sendResponse({
            enabled: isBlockingEnabled,
            url: window.location.href,
            faceApiLoaded: typeof faceapi !== 'undefined'
        });
        return true;
    }
    
    if (message.action === 'checkCompute') {
        console.log('🔍 Received compute check request');
        
        // Handle async operation properly
        (async () => {
            try {
                // Check if face-api library is available
                if (typeof faceapi === 'undefined') {
                    sendResponse({
                        success: false,
                        error: 'face-api.js library not available'
                    });
                    return;
                }
                
                if (typeof window.FaceMatcher === 'undefined') {
                    console.log('❌ FaceMatcher not available, checking if scripts loaded...');
                    
                    // Try to wait a bit for scripts to load
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    
                    if (typeof window.FaceMatcher === 'undefined') {
                        sendResponse({
                            success: false,
                            error: 'Face detection not available on this page. Scripts may not be loaded.'
                        });
                        return;
                    }
                }
                
                console.log('🔄 Starting compute check...');
                const results = await window.FaceMatcher.checkComputeResources();
                console.log('📊 Compute check completed:', results);
                
                // Auto-disable if resources are insufficient
                if (results.autoDisabled) {
                    isBlockingEnabled = false;
                    await chrome.storage.local.set({ blockingEnabled: false });
                    console.log('🚫 Auto-disabled due to insufficient resources');
                }
                
                sendResponse({ 
                    success: true, 
                    isAdequate: results.isAdequate,
                    details: results.details,
                    autoDisabled: results.autoDisabled,
                    metrics: results.metrics
                });
            } catch (error) {
                console.error('❌ Error during compute check:', error);
                sendResponse({ 
                    success: false, 
                    error: `Compute check failed: ${error.message}` 
                });
            }
        })();
        
        return true; // Keep the message channel open for async response
    }
    
    // Return false for unknown actions
    return false;
});

// Manual trigger function for debugging
window.triggerCelebrityBlocker = async function() {
    console.log('🔄 Manual trigger activated');
    await initializeExtension();
};

// Listen for storage changes to update blocking when new celebrities are added
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.celebrityImages) {
        console.log('📋 Celebrity images updated in storage, re-checking page');
        // Reset all checked flags so images are re-evaluated
        document.querySelectorAll('img[data-celebrity-checked]').forEach(img => {
            img.removeAttribute('data-celebrity-checked');
        });
        window.FaceMatcher.blockMatchingImages();
    }
});

// Add manual trigger function for debugging
window.triggerCelebrityBlock = async function() {
    console.log('🔧 Manual trigger activated');
    // Reset all checked flags
    document.querySelectorAll('img[data-celebrity-checked]').forEach(img => {
        img.removeAttribute('data-celebrity-checked');
    });
    await window.FaceMatcher.blockMatchingImages();
};

// Wait for DOM to be ready, then initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeExtension);
} else {
    // If DOM is already ready, wait a bit for other scripts to load
    setTimeout(initializeExtension, 500);
}

console.log('🏁 Content script setup complete');
