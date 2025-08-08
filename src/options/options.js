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

    // Check face-api.js availability
    setTimeout(() => {
        console.log('✅ Celebrity Image Blocker Options loaded');
        console.log('ℹ️ Face detection will occur during blocking, not during upload');
    }, 1000);

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
        
        // Select all checkbox in table header
        const selectAllCheckbox = document.getElementById('select-all-checkbox');
        if (selectAllCheckbox) {
            selectAllCheckbox.addEventListener('change', toggleSelectAll);
        }
    }

    async function loadImages() {
        try {
            const result = await chrome.storage.local.get(['celebrityImages']);
            allImages = result.celebrityImages || [];
            
            // Migrate existing images to add thumbnails if they don't have them
            let needsMigration = false;
            for (let i = 0; i < allImages.length; i++) {
                if (allImages[i].dataUrl && !allImages[i].thumbnailUrl) {
                    console.log(`Creating thumbnail for existing image: ${allImages[i].name}`);
                    try {
                        // For existing images, just create thumbnail from current dataUrl
                        // (These may not be face-cropped, but we'll keep them for backward compatibility)
                        allImages[i].thumbnailUrl = await createThumbnail(allImages[i].dataUrl, 64, 64);
                        needsMigration = true;
                    } catch (error) {
                        console.error('Error creating thumbnail for existing image:', error);
                        // If thumbnail creation fails, use original as fallback
                        allImages[i].thumbnailUrl = allImages[i].dataUrl;
                    }
                }
            }
            
            // Save migrated data if needed
            if (needsMigration) {
                console.log('Saving migrated thumbnail data...');
                await chrome.storage.local.set({ celebrityImages: allImages });
            }
            
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
            celebrityList.innerHTML = '<tr class="no-images"><td colspan="6">🎭 No celebrity faces added yet. Upload some images above to get started!</td></tr>';
            return;
        }

        celebrityList.innerHTML = allImages.map((image, index) => {
            const fileName = image.name.length > 64 ? image.name.substring(0, 61) + '...' : image.name;
            const fileExt = image.name.split('.').pop().toUpperCase() || 'Unknown';
            const fileSize = formatFileSize(image.dataUrl ? image.dataUrl.length : 0);
            // Use thumbnail for display, but keep original for face comparison
            const displayImage = image.thumbnailUrl || image.dataUrl;
            
            return `
                <tr class="image-row" data-index="${index}">
                    <td class="checkbox-col">
                        <input type="checkbox" class="row-checkbox" data-index="${index}">
                    </td>
                    <td class="thumbnail-col">
                        <img src="${displayImage}" alt="${image.name}" class="thumbnail-img">
                    </td>
                    <td class="filename-col">
                        <div class="filename-text" title="${image.name}">${fileName}</div>
                    </td>
                    <td class="type-col">${fileExt}</td>
                    <td class="size-col">${fileSize}</td>
                    <td class="action-col">
                        <button class="delete-row-btn" data-index="${index}">Delete</button>
                    </td>
                </tr>
            `;
        }).join('');

        // Add event listeners for checkboxes
        celebrityList.querySelectorAll('.row-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', function() {
                const index = parseInt(this.dataset.index);
                const row = this.closest('.image-row');
                
                if (this.checked) {
                    selectedImages.add(index);
                    row.classList.add('selected');
                } else {
                    selectedImages.delete(index);
                    row.classList.remove('selected');
                }
                
                updateBulkActions();
                updateSelectAllCheckbox();
            });
        });

        // Add event listeners for delete buttons
        celebrityList.querySelectorAll('.delete-row-btn').forEach(button => {
            button.addEventListener('click', function() {
                const index = parseInt(this.dataset.index);
                deleteImage(index);
            });
        });

        // Add event listeners for row clicks (excluding checkbox and button)
        celebrityList.querySelectorAll('.image-row').forEach(row => {
            row.addEventListener('click', function(e) {
                if (e.target.type !== 'checkbox' && !e.target.classList.contains('delete-row-btn')) {
                    const checkbox = this.querySelector('.row-checkbox');
                    checkbox.checked = !checkbox.checked;
                    checkbox.dispatchEvent(new Event('change'));
                }
            });
        });

        updateSelectAllCheckbox();
    }

    function updateSelectAllCheckbox() {
        const selectAllCheckbox = document.getElementById('select-all-checkbox');
        if (selectAllCheckbox) {
            selectAllCheckbox.checked = allImages.length > 0 && selectedImages.size === allImages.length;
            selectAllCheckbox.indeterminate = selectedImages.size > 0 && selectedImages.size < allImages.length;
        }
    }

    function updateBulkActions() {
        const hasSelection = selectedImages.size > 0;
        clearSelectedButton.disabled = !hasSelection;
        clearSelectedButton.textContent = hasSelection ? 
            `Delete Selected (${selectedImages.size})` : 'Delete Selected';
    }

    function toggleSelectAll() {
        const selectAllCheckbox = document.getElementById('select-all-checkbox');
        const allSelected = selectedImages.size === allImages.length && allImages.length > 0;
        
        if (allSelected) {
            // Deselect all
            selectedImages.clear();
            celebrityList.querySelectorAll('.row-checkbox').forEach(cb => cb.checked = false);
            celebrityList.querySelectorAll('.image-row').forEach(row => {
                row.classList.remove('selected');
            });
            selectAllButton.textContent = 'Select All';
        } else {
            // Select all
            selectedImages.clear();
            allImages.forEach((_, index) => selectedImages.add(index));
            celebrityList.querySelectorAll('.row-checkbox').forEach(cb => cb.checked = true);
            celebrityList.querySelectorAll('.image-row').forEach(row => {
                row.classList.add('selected');
            });
            selectAllButton.textContent = 'Deselect All';
        }
        
        updateBulkActions();
        updateSelectAllCheckbox();
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
                const originalDataUrl = await fileToDataUrl(file);
                console.log('File converted, original data URL length:', originalDataUrl.length);
                
                console.log('Detecting faces in image...');
                const faceDetectionResult = await detectAndCropFaces(originalDataUrl);
                
                if (faceDetectionResult.error) {
                    console.log('Face detection error:', faceDetectionResult.error);
                    showStatus(`${file.name}: ${faceDetectionResult.error}`, 'error');
                    continue;
                }
                
                console.log('Creating 64x64 thumbnail for display...');
                const thumbnailDataUrl = await createThumbnail(faceDetectionResult.croppedFace, 64, 64);
                console.log('Thumbnail created, data URL length:', thumbnailDataUrl.length);
                
                newImages.push({
                    name: file.name,
                    dataUrl: faceDetectionResult.croppedFace,  // Store cropped face for comparison
                    thumbnailUrl: thumbnailDataUrl,            // Store thumbnail for display
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
            const originalDataUrl = await urlToDataUrl(url);
            console.log('URL converted, original data URL length:', originalDataUrl.length);
            
            console.log('Detecting faces in image...');
            const faceDetectionResult = await detectAndCropFaces(originalDataUrl);
            
            if (faceDetectionResult.error) {
                console.log('Face detection error:', faceDetectionResult.error);
                showStatus(faceDetectionResult.error, 'error');
                return;
            }
            
            console.log('Creating 64x64 thumbnail for display...');
            const thumbnailDataUrl = await createThumbnail(faceDetectionResult.croppedFace, 64, 64);
            console.log('Thumbnail created, data URL length:', thumbnailDataUrl.length);
            
            const filename = url.split('/').pop().split('?')[0] || 'image-from-url';
            console.log('Generated filename:', filename);
            
            const newImage = {
                name: filename,
                dataUrl: faceDetectionResult.croppedFace,  // Store cropped face for comparison
                thumbnailUrl: thumbnailDataUrl,            // Store thumbnail for display
                uploadDate: new Date().toISOString(),
                size: originalDataUrl.length
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

    function createThumbnail(dataUrl, width, height) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            
            img.onload = function() {
                try {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    
                    // Set canvas size to desired thumbnail size
                    canvas.width = width;
                    canvas.height = height;
                    
                    // Calculate crop dimensions to maintain aspect ratio
                    const aspectRatio = img.width / img.height;
                    const targetAspectRatio = width / height;
                    
                    let sourceX = 0, sourceY = 0, sourceWidth = img.width, sourceHeight = img.height;
                    
                    if (aspectRatio > targetAspectRatio) {
                        // Image is wider than target - crop horizontally
                        sourceWidth = img.height * targetAspectRatio;
                        sourceX = (img.width - sourceWidth) / 2;
                    } else {
                        // Image is taller than target - crop vertically
                        sourceHeight = img.width / targetAspectRatio;
                        sourceY = (img.height - sourceHeight) / 2;
                    }
                    
                    // Draw the cropped and resized image
                    ctx.drawImage(
                        img,
                        sourceX, sourceY, sourceWidth, sourceHeight,  // Source rectangle
                        0, 0, width, height  // Destination rectangle
                    );
                    
                    // Convert to data URL with high quality
                    const thumbnailDataUrl = canvas.toDataURL('image/jpeg', 0.9);
                    resolve(thumbnailDataUrl);
                } catch (error) {
                    console.error('Error creating thumbnail:', error);
                    reject(error);
                }
            };
            
            img.onerror = function() {
                reject(new Error('Failed to load image for thumbnail creation'));
            };
            
            img.src = dataUrl;
        });
    }

    async function detectAndCropFaces(dataUrl) {
        try {
            console.log('Processing uploaded image...');
            
            // Simplified approach: store original image for face detection during blocking
            console.log('✅ Image stored - face detection will occur during web page scanning');
            
            // Return original image without face detection in options page
            return { croppedFace: dataUrl };
            
            console.log('Face-api.js is available, proceeding with face detection...');
            
            // Load models if not already loaded
            try {
                const extensionUrl = chrome.runtime.getURL('');
                const modelPath = extensionUrl + 'src/models';
                
                // Check if SSD MobileNet is loaded, if not load it
                if (!window.faceapi.nets.ssdMobilenetv1.isLoaded) {
                    console.log('Loading SSD MobileNet for face detection...');
                    try {
                        await window.faceapi.nets.ssdMobilenetv1.loadFromUri(modelPath);
                    } catch (localError) {
                        console.log('Local models failed, trying CDN...');
                        const cdnPath = 'https://justadudewhohacks.github.io/face-api.js/models';
                        await window.faceapi.nets.ssdMobilenetv1.loadFromUri(cdnPath);
                    }
                }
            } catch (modelError) {
                console.warn('Could not load face detection models, skipping face detection:', modelError);
                // Return original image without face detection
                return { croppedFace: dataUrl };
            }
            
            console.log('Creating image element for face detection...');
            const img = await loadImageFromDataUrl(dataUrl);
            
            console.log('Detecting faces...');
            const detections = await window.faceapi.detectAllFaces(img);
            console.log(`Found ${detections.length} face(s) in image`);
            
            if (detections.length === 0) {
                console.warn('No faces detected, but allowing upload anyway');
                // Return original image even if no faces detected
                return { croppedFace: dataUrl };
            }
            
            if (detections.length > 1) {
                return { error: 'Multiple faces detected. Please upload a photo with only one person (headshot).' };
            }
            
            // Exactly one face found - crop it
            const detection = detections[0];
            const box = detection.box;
            
            console.log('Face detected at:', {
                x: box.x,
                y: box.y,
                width: box.width,
                height: box.height
            });
            
            // Add some padding around the face (20% on each side)
            const padding = 0.2;
            const paddedX = Math.max(0, box.x - (box.width * padding));
            const paddedY = Math.max(0, box.y - (box.height * padding));
            const paddedWidth = Math.min(img.width - paddedX, box.width * (1 + 2 * padding));
            const paddedHeight = Math.min(img.height - paddedY, box.height * (1 + 2 * padding));
            
            // Create canvas for cropping
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Make the crop square by using the larger dimension
            const cropSize = Math.max(paddedWidth, paddedHeight);
            canvas.width = cropSize;
            canvas.height = cropSize;
            
            // Center the face in the square crop
            const offsetX = (cropSize - paddedWidth) / 2;
            const offsetY = (cropSize - paddedHeight) / 2;
            
            // Draw the cropped face
            ctx.drawImage(
                img,
                paddedX, paddedY, paddedWidth, paddedHeight,
                offsetX, offsetY, paddedWidth, paddedHeight
            );
            
            // Convert to data URL
            const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.9);
            console.log('Face cropped successfully, cropped image size:', croppedDataUrl.length);
            
            return { croppedFace: croppedDataUrl };
            
        } catch (error) {
            console.warn('Face detection failed, using original image:', error);
            // On any error, just return the original image
            return { croppedFace: dataUrl };
        }
    }

    function loadImageFromDataUrl(dataUrl) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = dataUrl;
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
