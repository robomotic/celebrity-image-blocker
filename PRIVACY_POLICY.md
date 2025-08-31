# Privacy Policy for Celebrity Image Blocker

**Last Updated:** January 8, 2025  
**Version:** 1.0

## Overview

Celebrity Image Blocker ("the Extension") is a Chrome browser extension that helps users block images of specific celebrities on web pages using face recognition technology. This privacy policy explains how we handle your data and protect your privacy.

## Data Collection and Usage

### What Data We Collect

**WE DO NOT COLLECT ANY DATA.** This extension operates entirely on your local device.

### What Happens Locally on Your Device

**Local Storage Only:**
- Images you upload are stored only in your browser's local storage
- Facial feature data is computed and stored locally for matching
- Extension settings and preferences are saved locally
- All processing happens on your device

**No Data Collection:**
- **No Personal Information:** We do not collect names, email addresses, or any personally identifiable information
- **No Browsing History:** We do not track or store your browsing history or visited websites
- **No Image Content:** We do not store or analyze images from web pages you visit
- **No Usage Statistics:** We do not collect any usage data or analytics
- **No Error Reporting:** Error logs stay on your device only
- **No External Transmission:** Absolutely no data is sent to external servers or third parties

## How the Extension Works

### 100% Local Processing
- All face recognition processing occurs entirely on your device
- Uploaded celebrity images are stored only in your browser's local storage
- Face detection models are downloaded from CDN but processing is local
- No data ever leaves your device

### Face Recognition Technology
- Uses TensorFlow.js and face-api.js libraries for local face detection
- Facial feature vectors are computed and stored locally for matching
- Original uploaded images are processed and stored in your browser only
- Models are cached locally after first download

## Data Storage and Security

### Local Storage
- All data is stored using Chrome's secure local storage API
- Data remains on your device and is not synchronized across devices
- You have full control over your stored data

### Data Retention
- Data persists until you manually delete it through the extension
- Uninstalling the extension removes all stored data
- You can clear individual faces or all data at any time

### Security Measures
- Data is stored using Chrome's secure storage mechanisms
- No network transmission of sensitive data
- Face recognition models are loaded from trusted CDN sources

## Permissions Explanation

### Why We Need These Permissions

**"Access your data on websites" (`https://*/*`, `http://*/*`):**
- Required to scan and analyze images on websites you visit
- Limited to HTTP and HTTPS websites only (more restrictive than previous versions)
- Enables the extension to detect and block celebrity images
- No data from websites is collected or stored

**"Storage" permission:**
- Stores your uploaded celebrity images and settings locally
- Maintains your preferences and configuration
- All storage is local to your device

**"Active Tab" permission:**
- Allows the extension to work on the currently active tab
- Enables real-time image detection and blocking
- No tab data is collected or transmitted

## Third-Party Services

### Face-API.js Library and Models
- We use the face-api.js library loaded from jsDelivr CDN
- Face detection models are loaded on-demand from CDN to reduce extension size
- All processing happens locally in your browser after models are loaded
- No personal data or images are sent to the CDN
- Models are cached locally by your browser for faster subsequent loads
- Library source: `https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/`

### No Analytics or Tracking
- We do not use Google Analytics or any tracking services
- No usage data is collected or transmitted
- No cookies or tracking pixels are used

## Your Rights and Controls

### Data Control
- **View Data:** Access all stored celebrity images through the options page
- **Delete Data:** Remove individual images or clear all data
- **Export Data:** Download your stored images at any time
- **Disable Features:** Turn off face blocking or adjust settings

### Privacy Settings
- Configure maximum number of images to scan per page
- Set minimum image size thresholds
- Enable or disable the extension entirely
- Adjust performance settings based on your system

## Children's Privacy

This extension is not intended for use by children under 13 years of age. We do not knowingly collect personal information from children under 13.

## Changes to This Policy

We may update this privacy policy from time to time. Any changes will be reflected in the "Last Updated" date above. Continued use of the extension after changes constitutes acceptance of the updated policy.

## Open Source and Transparency

This extension is open source, and you can review the complete source code to verify our privacy practices. The code is available at: [github.com/robomotic](https://github.com/robomotic/celebrity-image-blocker)

## Contact Information

If you have questions about this privacy policy or the extension's data practices, please contact us:

- **GitHub:** [github.com/robomotic](https://github.com/robomotic/celebrity-image-blocker)
- **Issues:** Report privacy concerns through our GitHub issues page

## Legal Compliance

This extension complies with:
- Chrome Web Store Developer Program Policies
- General Data Protection Regulation (GDPR) principles
- California Consumer Privacy Act (CCPA) guidelines
- Other applicable privacy laws and regulations

## Summary

**Key Privacy Points:**
- ✅ All processing happens locally on your device
- ✅ No data is sent to external servers
- ✅ You control all stored data
- ✅ No personal information is collected
- ✅ No browsing history is tracked
- ✅ Open source and transparent
- ✅ Easy data deletion and management

---

*This privacy policy is designed to be transparent and comprehensive. If you have any questions or concerns, please don't hesitate to reach out through our GitHub repository.*