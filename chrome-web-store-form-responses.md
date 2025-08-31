# Chrome Web Store Form Responses - Celebrity Image Blocker

## Permission Justifications

### activeTab justification:
The activeTab permission is required to inject content scripts and access the DOM of the currently active tab when the user clicks the extension icon. This allows the extension to scan images on the current webpage for celebrity faces and apply blocking overlays only when the user actively engages with the extension, ensuring minimal permissions while maintaining functionality.

### storage justification:
The storage permission is essential for saving user preferences and celebrity reference images locally. The extension stores uploaded celebrity photos, blocking settings (enabled/disabled state), and user preferences. This data needs to persist across browser sessions so users don't have to re-upload celebrity images each time they use the extension.

### Host permission justification:
The extension requires access to all HTTP and HTTPS websites (https://*/*, http://*/*) to scan and block celebrity images across any website the user visits. Since celebrities can appear on any website (news sites, social media, blogs, etc.), broad host permissions are necessary to provide comprehensive protection. The extension only activates its face detection when images are present on the page, minimizing resource usage.

### Remote code question:
**Yes, I am using remote code**

### Remote code justification:
The extension includes the face-api.js library (src/lib/face-api.min.js) which is a pre-built JavaScript library for face detection and recognition. This library is bundled with the extension package and loaded as part of the content scripts. While not fetched remotely at runtime, it is third-party code that performs the core AI-based face detection functionality required to identify and match celebrity faces in images.

## Data Usage

### Data Collection - What the Extension Collects:

**The extension should check NONE of the data collection boxes** because it does not collect any of the listed data types:

- ❌ **Personally identifiable information** - Not collected
- ❌ **Health information** - Not collected  
- ❌ **Financial and payment information** - Not collected
- ❌ **Authentication information** - Not collected
- ❌ **Personal communications** - Not collected
- ❌ **Location** - Not collected
- ❌ **Web history** - Not collected
- ❌ **User activity** - Not collected
- ❌ **Website content** - Not collected

### How the Extension Works:

The extension only stores data locally using Chrome's storage API:
- Celebrity reference images uploaded by the user (stored as data URLs)
- User preferences (blocking enabled/disabled, max scans, minimum image size)
- All data is stored locally on the user's device using chrome.storage.local
- No data is transmitted to external servers
- No user behavior, browsing history, or personal information is collected

### Disclosure Certifications:

You should check ALL THREE disclosure boxes:

✅ **I do not sell or transfer user data to third parties, outside of the approved use cases**
- The extension does not transmit any data externally

✅ **I do not use or transfer user data for purposes that are unrelated to my item's single purpose**  
- All stored data (celebrity images and settings) is used solely for the face blocking functionality

✅ **I do not use or transfer user data to determine creditworthiness or for lending purposes**
- The extension does not collect or use any financial or credit-related data

## Single Purpose Description

This extension automatically detects and blocks images containing faces of user-specified celebrities on web pages using AI-powered face recognition technology. 

The extension serves users who want to avoid seeing specific celebrities while browsing the internet, whether for personal preferences, mental health reasons, or to reduce distractions. Users upload reference photos of celebrities they wish to block through the extension's management interface. These images are processed and stored locally on the user's device.

When browsing any website, the extension scans images on the page using face detection algorithms (via the face-api.js library) to identify human faces. It then compares detected faces against the user's database of celebrity reference images. When a match is found, the extension immediately hides the image by overlaying it with a customizable blocking element, preventing the celebrity's image from being displayed.

Key features include:
- Real-time face detection and blocking on all websites
- Local storage of celebrity reference images (no data sent to external servers)
- Adjustable sensitivity settings for face matching
- Performance optimization to minimize impact on browsing speed
- Simple toggle to enable/disable blocking without removing stored celebrities
- Support for both static and dynamically loaded images

The extension operates entirely on the user's device, ensuring privacy and giving users complete control over which celebrity faces they want to block from their web browsing experience.

## Summary

The extension has a privacy-focused design that stores all data locally on the user's device. It does not collect, transmit, or sell any user data. The only data stored is what the user explicitly provides (celebrity images to block) and their preferences for how the extension operates.