// Storage utility functions for Chrome extension
const STORAGE_KEY = 'celebrityImages';

// Save celebrity images to Chrome storage
function saveCelebrityImages(images) {
    return new Promise((resolve) => {
        chrome.storage.local.set({ [STORAGE_KEY]: images }, () => {
            resolve();
        });
    });
}

// Get celebrity images from Chrome storage
function getCelebrityImages() {
    return new Promise((resolve) => {
        chrome.storage.local.get([STORAGE_KEY], (result) => {
            resolve(result[STORAGE_KEY] || []);
        });
    });
}

// Add a single celebrity image
function addCelebrityImage(imageData) {
    return getCelebrityImages().then(images => {
        images.push(imageData);
        return saveCelebrityImages(images);
    });
}

// Clear all celebrity images
function clearCelebrityImages() {
    return new Promise((resolve) => {
        chrome.storage.local.remove([STORAGE_KEY], () => {
            resolve();
        });
    });
}

// Remove a specific celebrity image
function removeCelebrityImage(index) {
    return getCelebrityImages().then(images => {
        if (index >= 0 && index < images.length) {
            images.splice(index, 1);
            return saveCelebrityImages(images);
        }
    });
}

// Make functions available globally for content scripts
if (typeof window !== 'undefined') {
    window.StorageUtils = {
        saveCelebrityImages,
        getCelebrityImages,
        addCelebrityImage,
        clearCelebrityImages,
        removeCelebrityImage
    };
}