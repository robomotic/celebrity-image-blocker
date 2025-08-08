#!/bin/bash

# Celebrity Image Blocker - Chrome Web Store Package Script
# This script creates a clean ZIP package for Chrome Web Store submission

set -e  # Exit on any error

# Configuration
EXTENSION_NAME="celebrity-image-blocker"
OUTPUT_DIR="./dist"
ZIP_FILE="${OUTPUT_DIR}/${EXTENSION_NAME}-store.zip"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Packaging Celebrity Image Blocker for Chrome Web Store${NC}"
echo "=================================================="

# Create output directory
echo -e "${YELLOW}📁 Creating output directory...${NC}"
mkdir -p "$OUTPUT_DIR"

# Remove existing ZIP file if it exists
if [ -f "$ZIP_FILE" ]; then
    echo -e "${YELLOW}🗑️  Removing existing package...${NC}"
    rm "$ZIP_FILE"
fi

# Create temporary directory for packaging
TEMP_DIR=$(mktemp -d)
PACKAGE_DIR="$TEMP_DIR/$EXTENSION_NAME"
mkdir -p "$PACKAGE_DIR"

echo -e "${YELLOW}📦 Copying essential files...${NC}"

# Copy essential extension files only
cp manifest.json "$PACKAGE_DIR/"

# Copy icons directory
cp -r icons/ "$PACKAGE_DIR/"

# Copy src directory (including face-api.js library)
echo -e "${YELLOW}📁 Copying source files...${NC}"
cp -r src/ "$PACKAGE_DIR/"

# Copy privacy policy HTML (required for store)
if [ -f "privacy-policy.html" ]; then
    cp privacy-policy.html "$PACKAGE_DIR/"
    echo "✅ Privacy policy included"
else
    echo -e "${RED}⚠️  Warning: privacy-policy.html not found${NC}"
fi

# Copy LICENSE if it exists (good practice)
if [ -f "LICENSE" ]; then
    cp LICENSE "$PACKAGE_DIR/"
    echo "✅ License included"
fi

echo -e "${YELLOW}🔍 Verifying package contents...${NC}"

# List what will be included in the package
echo "Package contents:"
find "$PACKAGE_DIR" -type f | sed "s|$PACKAGE_DIR/||" | sort | sed 's/^/  /'

# Count files
FILE_COUNT=$(find "$PACKAGE_DIR" -type f | wc -l)
echo ""
echo "Total files: $FILE_COUNT"

# Create ZIP file
echo -e "${YELLOW}🗜️  Creating ZIP package...${NC}"
cd "$TEMP_DIR"
zip -r "$OLDPWD/$ZIP_FILE" "$EXTENSION_NAME" > /dev/null

# Get back to original directory
cd "$OLDPWD"

# Get ZIP file size
ZIP_SIZE=$(du -h "$ZIP_FILE" | cut -f1)

# Cleanup
rm -rf "$TEMP_DIR"

echo -e "${GREEN}✅ Package created successfully!${NC}"
echo "=================================================="
echo "📄 File: $ZIP_FILE"
echo "📊 Size: $ZIP_SIZE"
echo ""

# Verify ZIP contents
echo -e "${YELLOW}📋 ZIP contents verification:${NC}"
unzip -l "$ZIP_FILE" | tail -n +4 | head -n -2 | awk '{print "  " $4}'

echo ""
echo -e "${GREEN}🎉 Ready for Chrome Web Store submission!${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Go to Chrome Web Store Developer Dashboard"
echo "2. Upload: $ZIP_FILE"
echo "3. Complete the store listing with screenshots and descriptions"
echo ""
echo -e "${YELLOW}Files excluded (documentation/development):${NC}"
echo "  • README.md"
echo "  • PRIVACY_POLICY.md (Markdown version)"
echo "  • screenshots/"
echo "  • .git/"
echo "  • .gitignore"
echo "  • CHROME_STORE_SUBMISSION_GUIDE.md"
echo "  • package-extension.sh"
echo "  • remove-models.sh"
echo "  • *.svg icon templates (icon_*.svg)"
echo "  • store-icon-* files"
echo ""
