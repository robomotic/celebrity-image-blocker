document.addEventListener('DOMContentLoaded', function() {
    // UI Elements
    const fileUpload = document.getElementById('file-upload');
    const uploadButton = document.getElementById('upload-button');
    const urlInput = document.getElementById('url-input');
    const addFromUrlButton = document.getElementById('add-from-url');
    const celebrityList = document.getElementById('celebrity-list');
    const status = document.getElementById('status');
    const selectAllButton = document.getElementById('select-all-button');
    const clearSelectedButton = document.getElementById('clear-selected-button');
    const clearAllButton = document.getElementById('clear-all-button');
    const faceCountDisplay = document.getElementById('face-count-display');
    const storageSizeDisplay = document.getElementById('storage-size');

    let selectedImages = new Set();
    let allImages = [];

    // Initialize
    init();

    async function init() {
        await loadImages();
        setupEventListeners();
    }

    function setupEventListeners() {
        console.log('Setting up event listeners...');

        // File upload
        uploadButton.addEventListener('click', handleFileUpload);
        fileUpload.addEventListener('change', function() {
            uploadButton.textContent = this.files.length > 0 ? 
                `Upload ${this.files.length} file${this.files.length !== 1 ? 's' : ''}` : 'Upload Selected Files';
        });

        // URL upload
        addFromUrlButton.addEventListener('click', handleUrlUpload);
        urlInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') handleUrlUpload();
        });

        // Bulk actions
        selectAllButton.addEventListener('click', toggleSelectAll);
        clearSelectedButton.addEventListener('click', deleteSelectedImages);
        clearAllButton.addEventListener('click', clearAllImages);
    }

    async function loadImages() {
        try {
            const result = await chrome.storage.local.get(['celebrityImages']);
            allImages = result.celebrityImages || [];
            
            updateStats();
            renderImages();
        } catch (error) {
            console.error('Error loading images:', error);
            showStatus('Error loading images', 'error');
        }
    }

    function updateStats() {
        const totalSize = allImages.reduce((sum, img) => sum + (img.dataUrl ? img.dataUrl.length : 0), 0);
        
        faceCountDisplay.textContent = `${allImages.length} face${allImages.length !== 1 ? 's' : ''} in database`;
        storageSizeDisplay.textContent = `Storage: ${formatFileSize(totalSize)}`;
    }

    function renderImages() {
        if (allImages.length === 0) {
            celebrityList.innerHTML = '<div class="no-images">🎭 No faces in database yet.<br>Upload some celebrity images to get started!</div>';
            return;
        }

        celebrityList.innerHTML = allImages.map((image, index) => `
            <div class="image-container" data-index="${index}">
                <input type="checkbox" class="checkbox" data-index="${index}">
                <img src="${image.dataUrl}" alt="${image.name}" class="celebrity-image">
                <div class="image-info">
                    <div class="image-name">${image.name}</div>
                    <div class="image-date">Added: ${formatDate(image.uploadDate)}</div>
                    <div class="image-size">Size: ${formatFileSize(image.dataUrl ? image.dataUrl.length : 0)}</div>
                    <button class="delete-button" data-index="${index}">🗑️ Delete</button>
                </div>
            </div>
        `).join('');

        // Add event listeners
        celebrityList.querySelectorAll('.checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', function() {
                const index = parseInt(this.dataset.index);
                const container = this.closest('.image-container');
                
                if (this.checked) {
                    selectedImages.add(index);
                    container.classList.add('selected');
                } else {
                    selectedImages.delete(index);
                    container.classList.remove('selected');
                }
                
                updateBulkActions();
            });
        });

        celebrityList.querySelectorAll('.delete-button').forEach(button => {
            button.addEventListener('click', function() {
                const index = parseInt(this.dataset.index);
                deleteImage(index);
            });
        });

        celebrityList.querySelectorAll('.image-container').forEach(container => {
            container.addEventListener('click', function(e) {
                if (e.target.type !== 'checkbox' && !e.target.classList.contains('delete-button')) {
                    const checkbox = this.querySelector('.checkbox');
                    checkbox.checked = !checkbox.checked;
                    checkbox.dispatchEvent(new Event('change'));
                }
            });
        });
    }

    function updateBulkActions() {
        const hasSelection = selectedImages.size > 0;
        clearSelectedButton.disabled = !hasSelection;
        clearSelectedButton.textContent = hasSelection ? 
            `🗑️ Delete Selected (${selectedImages.size})` : '🗑️ Delete Selected';
    }

    function toggleSelectAll() {
        const allSelected = selectedImages.size === allImages.length && allImages.length > 0;
        
        if (allSelected) {
            // Deselect all
            selectedImages.clear();
            celebrityList.querySelectorAll('.checkbox').forEach(cb => cb.checked = false);
            celebrityList.querySelectorAll('.image-container').forEach(container => {
                container.classList.remove('selected');
            });
            selectAllButton.textContent = 'Select All';
        } else {
            // Select all
            selectedImages.clear();
            allImages.forEach((_, index) => selectedImages.add(index));
            celebrityList.querySelectorAll('.checkbox').forEach(cb => cb.checked = true);
            celebrityList.querySelectorAll('.image-container').forEach(container => {
                container.classList.add('selected');
            });
            selectAllButton.textContent = 'Deselect All';
        }
        
        updateBulkActions();
    }

    async function handleFileUpload() {
        console.log('File upload triggered');
        const files = fileUpload.files;
        console.log('Selected files:', files.length);
        
        if (files.length === 0) {
            console.log('No files selected');
            showStatus('Please select files to upload', 'error');
            return;
        }

        try {
            showStatus('Uploading files...', 'success');
            console.log('Starting file processing...');
            
            const newImages = [];
            for (const file of files) {
                console.log('Processing file:', file.name, file.type, file.size);
                
                if (!file.type.startsWith('image/')) {
                    console.log('Invalid file type:', file.type);
                    showStatus(`${file.name} is not a valid image`, 'error');
                    continue;
                }

                console.log('Converting file to data URL...');
                const dataUrl = await fileToDataUrl(file);
                console.log('File converted, data URL length:', dataUrl.length);
                
                newImages.push({
                    name: file.name,
                    dataUrl: dataUrl,
                    uploadDate: new Date().toISOString(),
                    size: file.size
                });
            }

            if (newImages.length > 0) {
                console.log('Adding faces to database:', newImages.length);
                await addImagesToDatabase(newImages);
                showStatus(`✅ Added ${newImages.length} face${newImages.length !== 1 ? 's' : ''} successfully!`, 'success');
                console.log('Reloading image list...');
                await loadImages();
                fileUpload.value = '';
                uploadButton.textContent = 'Upload Selected Files';
                console.log('File upload completed successfully');
            } else {
                console.log('No valid files to add');
                showStatus('No valid image files were processed', 'error');
            }
        } catch (error) {
            console.error('Error uploading files:', error);
            showStatus('Error uploading files: ' + error.message, 'error');
        }
    }

    async function handleUrlUpload() {
        console.log('URL upload triggered');
        const url = urlInput.value.trim();
        console.log('URL entered:', url);
        
        if (!url) {
            console.log('No URL provided');
            showStatus('Please enter a valid image URL', 'error');
            return;
        }

        // Basic URL validation
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            console.log('Invalid URL format');
            showStatus('URL must start with http:// or https://', 'error');
            return;
        }

        try {
            console.log('Starting URL processing...');
            showStatus('Loading image from URL...', 'success');
            
            console.log('Converting URL to data URL...');
            const dataUrl = await urlToDataUrl(url);
            console.log('URL converted, data URL length:', dataUrl.length);
            
            const filename = url.split('/').pop().split('?')[0] || 'image-from-url';
            console.log('Generated filename:', filename);
            
            const newImage = {
                name: filename,
                dataUrl: dataUrl,
                uploadDate: new Date().toISOString(),
                size: dataUrl.length
            };

            console.log('Adding face to database...');
            await addImagesToDatabase([newImage]);
            showStatus('✅ Face added from URL successfully!', 'success');
            console.log('Reloading image list...');
            await loadImages();
            urlInput.value = '';
            console.log('URL upload completed successfully');
        } catch (error) {
            console.error('Error loading from URL:', error);
            
            // Provide helpful error messages
            let errorMessage = 'Error loading image from URL';
            if (error.message.includes('CORS')) {
                errorMessage = 'This image cannot be loaded due to security restrictions. Try a different image URL.';
            } else if (error.message.includes('404') || error.message.includes('Not Found')) {
                errorMessage = 'Image not found at this URL. Please check the link.';
            } else if (error.message.includes('valid image')) {
                errorMessage = 'The URL does not point to a valid image file.';
            } else if (error.message.includes('Failed to fetch')) {
                errorMessage = 'Cannot access this URL. The server may be blocking requests.';
            }
            
            showStatus(errorMessage, 'error');
        }
    }

    async function deleteImage(index) {
        if (!confirm('Delete this face from the database?')) {
            return;
        }

        try {
            const updatedImages = [...allImages];
            updatedImages.splice(index, 1);
            
            await chrome.storage.local.set({ celebrityImages: updatedImages });
            showStatus('✅ Face deleted successfully', 'success');
            await loadImages();
            selectedImages.clear();
        } catch (error) {
            console.error('Error deleting image:', error);
            showStatus('Error deleting face', 'error');
        }
    }

    async function deleteSelectedImages() {
        if (selectedImages.size === 0) return;

        if (!confirm(`Delete ${selectedImages.size} selected face${selectedImages.size !== 1 ? 's' : ''}?`)) {
            return;
        }

        try {
            const indicesToDelete = Array.from(selectedImages).sort((a, b) => b - a);
            const updatedImages = [...allImages];
            
            indicesToDelete.forEach(index => {
                updatedImages.splice(index, 1);
            });

            await chrome.storage.local.set({ celebrityImages: updatedImages });
            selectedImages.clear();
            showStatus(`✅ Deleted ${indicesToDelete.length} face${indicesToDelete.length !== 1 ? 's' : ''}`, 'success');
            await loadImages();
        } catch (error) {
            console.error('Error deleting images:', error);
            showStatus('Error deleting faces', 'error');
        }
    }

    async function clearAllImages() {
        if (allImages.length === 0) {
            showStatus('Database is already empty', 'error');
            return;
        }

        if (!confirm(`Delete ALL ${allImages.length} faces from the database? This cannot be undone!`)) {
            return;
        }

        try {
            await chrome.storage.local.set({ celebrityImages: [] });
            selectedImages.clear();
            showStatus('✅ All faces cleared from database', 'success');
            await loadImages();
        } catch (error) {
            console.error('Error clearing images:', error);
            showStatus('Error clearing database', 'error');
        }
    }

    async function addImagesToDatabase(newImages) {
        const result = await chrome.storage.local.get(['celebrityImages']);
        const existingImages = result.celebrityImages || [];
        const updatedImages = [...existingImages, ...newImages];
        await chrome.storage.local.set({ celebrityImages: updatedImages });
    }

    function fileToDataUrl(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    function urlToDataUrl(url) {
        return new Promise((resolve, reject) => {
            console.log('Creating image element for URL:', url);
            const img = new Image();
            
            img.onload = function() {
                console.log('Image loaded successfully, dimensions:', img.width, 'x', img.height);
                try {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    console.log('Drawing image to canvas...');
                    ctx.drawImage(img, 0, 0);
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                    console.log('Canvas conversion complete, data URL length:', dataUrl.length);
                    resolve(dataUrl);
                } catch (canvasError) {
                    console.error('Canvas error (likely CORS):', canvasError);
                    tryFetchMethod(url).then(resolve).catch(reject);
                }
            };
            
            img.onerror = function(error) {
                console.error('Image loading failed:', error);
                tryFetchMethod(url).then(resolve).catch(() => {
                    reject(new Error('Failed to load image from URL. The image may not exist, or the server does not allow cross-origin access.'));
                });
            };
            
            console.log('Setting image source...');
            img.src = url;
        });
    }

    async function tryFetchMethod(url) {
        console.log('Trying fetch method for URL:', url);
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const blob = await response.blob();
            console.log('Fetched blob, size:', blob.size, 'type:', blob.type);
            
            if (!blob.type.startsWith('image/')) {
                throw new Error('URL does not point to a valid image');
            }
            
            const dataUrl = await blobToDataUrl(blob);
            console.log('Blob converted to data URL, length:', dataUrl.length);
            return dataUrl;
        } catch (fetchError) {
            console.error('Fetch method failed:', fetchError);
            throw fetchError;
        }
    }

    function blobToDataUrl(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    function formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    function formatDate(dateString) {
        if (!dateString) return 'Unknown';
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    }

    function showStatus(message, type) {
        status.textContent = message;
        status.className = `status ${type}`;
        status.style.display = 'block';
        
        setTimeout(() => {
            status.style.display = 'none';
        }, 5000);
    }
});
