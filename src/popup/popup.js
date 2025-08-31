document.addEventListener('DOMContentLoaded', function () {
    // Main UI elements
    const enableCheckbox = document.getElementById('enable-blocking');
    const manageFacesButton = document.getElementById('manage-faces-button');
    const checkComputeButton = document.getElementById('check-compute-button');
    const faceCountDisplay = document.getElementById('face-count');
    const statusDisplay = document.getElementById('status');
    const maxScansInput = document.getElementById('max-scans');
    const minWidthInput = document.getElementById('min-width');
    const minHeightInput = document.getElementById('min-height');
    const similarityThresholdInput = document.getElementById('similarity-threshold');
    
    // Initialize the popup
    init();

    async function init() {
        await loadSettings();
        await updateFaceCount();
        setupEventListeners();
    }

    async function loadSettings() {
        try {
            const result = await chrome.storage.local.get([
                'blockingEnabled', 
                'maxScans', 
                'minWidth',
                'minHeight',
                'similarityThreshold',
                'minSize' // For migration from old setting
            ]);
            
            // Migrate old minSize setting to separate width/height if needed
            if (result.minSize && (!result.minWidth && !result.minHeight)) {
                await chrome.storage.local.set({ 
                    minWidth: result.minSize,
                    minHeight: result.minSize
                });
                console.log(`Migrated old minSize (${result.minSize}) to separate width/height settings`);
            }
            
            enableCheckbox.checked = result.blockingEnabled !== false; // Default to true
            maxScansInput.value = result.maxScans || 10; // Default to 10
            minWidthInput.value = result.minWidth || result.minSize || 200; // Default to 200, fallback to old minSize
            minHeightInput.value = result.minHeight || result.minSize || 200; // Default to 200, fallback to old minSize
            similarityThresholdInput.value = result.similarityThreshold || 0.6; // Default to 0.6
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }

    async function updateFaceCount() {
        try {
            const result = await chrome.storage.local.get(['celebrityImages']);
            const faces = result.celebrityImages || [];
            
            faceCountDisplay.textContent = `${faces.length} face${faces.length !== 1 ? 's' : ''} in database`;
            
            // Update manage button state
            manageFacesButton.textContent = faces.length > 0 ? 
                `Manage Celebrity Faces (${faces.length})` : 'Manage Celebrity Faces';
                
        } catch (error) {
            console.error('Error updating face count:', error);
            faceCountDisplay.textContent = 'Error loading faces';
        }
    }

    function setupEventListeners() {
        console.log('🔧 Setting up event listeners...');
        
        // Enable/disable toggle
        enableCheckbox.addEventListener('change', async function() {
            try {
                await chrome.storage.local.set({ blockingEnabled: this.checked });
                showStatus(this.checked ? 'Face blocking enabled' : 'Face blocking disabled', 'success');
                
                // Notify content scripts
                chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                    if (tabs[0]) {
                        chrome.tabs.sendMessage(tabs[0].id, {
                            action: 'toggleBlocking',
                            enabled: enableCheckbox.checked
                        }).catch(() => {
                            // Ignore errors for tabs without content script
                        });
                    }
                });
            } catch (error) {
                console.error('Error saving settings:', error);
                showStatus('Error saving settings', 'error');
            }
        });

        // Manage faces button - open options page in new tab
        manageFacesButton.addEventListener('click', function() {
            console.log('🔧 Opening face management in new tab...');
            chrome.tabs.create({
                url: chrome.runtime.getURL('src/options/options.html')
            });
            
            // Close the popup
            window.close();
        });

        // Check compute resources button
        checkComputeButton.addEventListener('click', async function() {
            await checkComputeResources();
        });

        // Max scans input
        maxScansInput.addEventListener('change', async function() {
            try {
                const value = parseInt(this.value);
                if (value >= 1 && value <= 100) {
                    await chrome.storage.local.set({ maxScans: value });
                    showStatus(`Max scans set to ${value}`, 'success');
                } else {
                    this.value = 10; // Reset to default
                    showStatus('Max scans must be between 1 and 100', 'error');
                }
            } catch (error) {
                console.error('Error saving max scans:', error);
                showStatus('Error saving max scans', 'error');
            }
        });

        // Min width input
        minWidthInput.addEventListener('change', async function() {
            try {
                const value = parseInt(this.value);
                if (value >= 50 && value <= 1000) {
                    await chrome.storage.local.set({ minWidth: value });
                    showStatus(`Min width set to ${value}px`, 'success');
                } else {
                    this.value = 200; // Reset to default
                    showStatus('Min width must be between 50 and 1000 pixels', 'error');
                }
            } catch (error) {
                console.error('Error saving min width:', error);
                showStatus('Error saving min width', 'error');
            }
        });

        // Min height input
        minHeightInput.addEventListener('change', async function() {
            try {
                const value = parseInt(this.value);
                if (value >= 50 && value <= 1000) {
                    await chrome.storage.local.set({ minHeight: value });
                    showStatus(`Min height set to ${value}px`, 'success');
                } else {
                    this.value = 200; // Reset to default
                    showStatus('Min height must be between 50 and 1000 pixels', 'error');
                }
            } catch (error) {
                console.error('Error saving min height:', error);
                showStatus('Error saving min height', 'error');
            }
        });

        // Similarity threshold input
        similarityThresholdInput.addEventListener('change', async function() {
            try {
                const value = parseFloat(this.value);
                if (value >= 0.1 && value <= 1.0) {
                    await chrome.storage.local.set({ similarityThreshold: value });
                    showStatus(`Similarity threshold set to ${value}`, 'success');
                } else {
                    this.value = 0.6; // Reset to default
                    showStatus('Similarity threshold must be between 0.1 and 1.0', 'error');
                }
            } catch (error) {
                console.error('Error saving similarity threshold:', error);
                showStatus('Error saving similarity threshold', 'error');
            }
        });
    }

    function showStatus(message, type) {
        statusDisplay.textContent = message;
        statusDisplay.className = `status ${type}`;
        statusDisplay.style.display = 'block';
        
        setTimeout(() => {
            statusDisplay.style.display = 'none';
        }, 3000);
    }

    async function checkComputeResources() {
        showStatus('Analyzing system resources...', 'success');
        checkComputeButton.disabled = true;
        checkComputeButton.textContent = 'Checking...';
        
        try {
            // Get the active tab
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (!tab) {
                showStatus('Please open a webpage to test resources', 'error');
                return;
            }

            // Check if the tab URL is accessible (not a chrome:// or extension page)
            if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('edge://')) {
                showStatus('Cannot run on system pages. Please open a regular webpage.', 'error');
                return;
            }

            // First, try to ping the content script to see if it's available
            let contentScriptAvailable = false;
            try {
                const pingResponse = await chrome.tabs.sendMessage(tab.id, { action: 'ping' });
                contentScriptAvailable = pingResponse && pingResponse.pong;
            } catch (pingError) {
                console.log('Content script ping failed:', pingError);
            }

            if (!contentScriptAvailable) {
                // Fallback to basic system check when content script isn't available
                showStatus('Content script not available. Running basic check...', 'success');
                const basicResults = await performBasicComputeCheck();
                showStatus(basicResults.details, basicResults.isAdequate ? 'success' : 'error');
                return;
            }

            // Try to send message with better error handling
            try {
                const response = await chrome.tabs.sendMessage(tab.id, {
                    action: 'checkCompute'
                });

                if (response && response.success) {
                    const { isAdequate, details, autoDisabled } = response;
                    
                    if (isAdequate) {
                        showStatus(details, 'success');
                    } else {
                        showStatus(details, 'error');
                        
                        if (autoDisabled) {
                            enableCheckbox.checked = false;
                            await chrome.storage.local.set({ blockingEnabled: false });
                            setTimeout(() => {
                                showStatus('Face blocking auto-disabled due to low resources', 'error');
                            }, 3500);
                        }
                    }
                } else if (response && !response.success) {
                    showStatus(`Test failed: ${response.error || 'Unknown error'}`, 'error');
                } else {
                    showStatus('No response from content script', 'error');
                }
            } catch (messageError) {
                console.error('Message error:', messageError);
                
                // Fallback to basic system check 
                showStatus('Running basic system check...', 'success');
                const basicResults = await performBasicComputeCheck();
                showStatus(basicResults.details, basicResults.isAdequate ? 'success' : 'error');
            }
        } catch (error) {
            console.error('Error checking compute resources:', error);
            showStatus('Error checking resources', 'error');
        } finally {
            checkComputeButton.disabled = false;
            checkComputeButton.textContent = 'Check Compute Resources';
        }
    }

    // Basic compute check that can run in popup context
    async function performBasicComputeCheck() {
        const results = {
            isAdequate: false,
            details: ''
        };

        try {
            // Check available memory
            const memoryInfo = navigator.deviceMemory || 'unknown';
            const hardwareConcurrency = navigator.hardwareConcurrency || 1;
            
            // Check WebGL support
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            const hasWebGL = !!gl;
            
            let adequacyScore = 0;
            let issues = [];
            
            // Memory check
            if (memoryInfo === 'unknown') {
                issues.push('Memory info unavailable');
                adequacyScore += 10;
            } else if (memoryInfo < 1) {
                issues.push(`Very low memory: ${memoryInfo}GB`);
            } else if (memoryInfo < 2) {
                issues.push(`Low memory: ${memoryInfo}GB`);
                adequacyScore += 15;
            } else if (memoryInfo >= 4) {
                adequacyScore += 35;
            } else {
                adequacyScore += 25;
            }
            
            // CPU cores check
            if (hardwareConcurrency < 2) {
                issues.push('Single core CPU');
                adequacyScore += 10;
            } else if (hardwareConcurrency >= 4) {
                adequacyScore += 25;
            } else {
                adequacyScore += 20;
            }
            
            // WebGL check
            if (!hasWebGL) {
                issues.push('No WebGL support');
            } else {
                adequacyScore += 20;
            }
            
            // Basic heuristic (no performance test available in popup)
            adequacyScore += 10; // Base score
            
            results.isAdequate = adequacyScore >= 40; // Lower threshold for basic check
            
            if (results.isAdequate) {
                results.details = `Basic check OK: ${memoryInfo}GB RAM, ${hardwareConcurrency} cores, WebGL: ${hasWebGL ? 'Yes' : 'No'}`;
            } else {
                results.details = `Basic check issues: ${issues.join(', ')} (Score: ${adequacyScore}/80)`;
                
                // Auto-disable for very low scores
                if (adequacyScore < 20) {
                    await chrome.storage.local.set({ blockingEnabled: false });
                    enableCheckbox.checked = false;
                }
            }
            
        } catch (error) {
            results.details = 'Basic system check failed';
        }
        
        return results;
    }

    // Listen for storage changes to update face count
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'local' && changes.celebrityImages) {
            updateFaceCount();
        }
    });
});