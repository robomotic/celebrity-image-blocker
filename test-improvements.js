// Test script to validate the improved minimum size detection
// This script simulates the new size filtering logic

function testSizeFiltering() {
    console.log('🧪 Testing improved minimum size detection');
    
    // Mock settings with separate width and height
    const settings = {
        minWidth: 150,
        minHeight: 100
    };
    
    // Mock image data with various dimensions
    const testImages = [
        { width: 200, height: 200, name: 'square-large.jpg' },      // Should pass (200x200)
        { width: 160, height: 120, name: 'rectangular-wide.jpg' },  // Should pass (160x120)
        { width: 180, height: 90, name: 'too-short.jpg' },          // Should fail (height < 100)
        { width: 100, height: 150, name: 'too-narrow.jpg' },        // Should fail (width < 150)
        { width: 50, height: 50, name: 'too-small.jpg' },           // Should fail (both dimensions too small)
        { width: 300, height: 150, name: 'banner.jpg' },            // Should pass (300x150)
    ];
    
    console.log(`Settings: minWidth=${settings.minWidth}px, minHeight=${settings.minHeight}px`);
    console.log('Testing images:');
    
    let passCount = 0;
    testImages.forEach(img => {
        const passes = img.width >= settings.minWidth && img.height >= settings.minHeight;
        const status = passes ? '✅ PASS' : '❌ FAIL';
        console.log(`  ${status} ${img.name} (${img.width}x${img.height})`);
        
        if (passes) passCount++;
    });
    
    console.log(`\nResult: ${passCount}/${testImages.length} images would be processed`);
    
    // Test migration from old minSize setting
    console.log('\n🔄 Testing migration from old settings:');
    const oldSetting = { minSize: 200 };
    const migratedWidth = oldSetting.minSize;
    const migratedHeight = oldSetting.minSize;
    console.log(`Old setting: minSize=${oldSetting.minSize}px`);
    console.log(`Migrated to: minWidth=${migratedWidth}px, minHeight=${migratedHeight}px`);
    
    return true;
}

// Run the test
testSizeFiltering();
