// Background script for Celebrity Image Blocker extension
console.log('Celebrity Image Blocker background script loaded');

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        console.log('Celebrity Image Blocker installed');
        
        // Initialize storage if needed
        chrome.storage.local.get(['celebrityImages'], (result) => {
            if (!result.celebrityImages) {
                chrome.storage.local.set({ celebrityImages: [] });
            }
        });
        
        // Initialize blocking as enabled by default
        chrome.storage.local.get(['blockingEnabled'], (result) => {
            if (result.blockingEnabled === undefined) {
                chrome.storage.local.set({ blockingEnabled: true });
            }
        });
    } else if (details.reason === 'update') {
        console.log('Celebrity Image Blocker updated');
    }
});

// Handle messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getCelebrityImages') {
        chrome.storage.local.get(['celebrityImages'], (result) => {
            sendResponse({ images: result.celebrityImages || [] });
        });
        return true; // Keep message channel open for async response
    }
    
    if (request.action === 'blockImage') {
        console.log('Image blocked:', request.imageUrl);
        sendResponse({ status: 'success' });
    }
    
    if (request.action === 'logError') {
        console.error('Content script error:', request.error);
        sendResponse({ status: 'logged' });
    }
});

// Handle storage changes to notify content scripts
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.celebrityImages) {
        console.log('Celebrity images updated in storage');
        
        // Notify all tabs about the change
        chrome.tabs.query({}, (tabs) => {
            tabs.forEach(tab => {
                chrome.tabs.sendMessage(tab.id, {
                    action: 'celebrityImagesUpdated',
                    images: changes.celebrityImages.newValue
                }).catch(() => {
                    // Ignore errors for tabs that don't have content script
                });
            });
        });
    }
});

// Badge management
function updateBadge() {
    chrome.storage.local.get(['celebrityImages'], (result) => {
        const count = result.celebrityImages ? result.celebrityImages.length : 0;
        chrome.action.setBadgeText({
            text: count > 0 ? count.toString() : ''
        });
        chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });
    });
}

// Update badge when storage changes
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.celebrityImages) {
        updateBadge();
    }
});

// Initialize badge on startup
updateBadge();