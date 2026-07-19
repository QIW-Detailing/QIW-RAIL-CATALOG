const { chromium } = require('playwright');
const path = require('path');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
    page.on('pageerror', err => {
        console.error('BROWSER PAGE ERROR:', err.message);
        process.exit(1);
    });

    const htmlPath = path.resolve(__dirname, '../index.html');
    await page.goto(`file://${htmlPath}`);
    console.log("Page loaded successfully!");

    // Set Urban Balcony presets and trigger draw
    await page.evaluate(() => {
        // Find select element and set to urban_balcony
        const styleSelect = document.getElementById('railStyle');
        styleSelect.value = 'urban_balcony';
        styleSelect.dispatchEvent(new Event('change'));
    });
    console.log("Switched to urban_balcony!");

    // Generate Main PDF in page context
    console.log("Calling generateBlueprintPDF for main...");
    await page.evaluate(() => {
        const activePanelType = 'main';
        const activePanelId = 1;
        const vals = getActivePanelValues();
        const drawingNo = '1.0';
        generateBlueprintPDF(activePanelType, vals, drawingNo, activePanelId);
    });
    console.log("SUCCESS! Main PDF generated successfully!");

    // Generate Loose Post PDF in page context
    console.log("Calling generateBlueprintPDF for loosePost...");
    await page.evaluate(() => {
        const activePanelType = 'loosePost';
        const activePanelId = 1;
        const vals = getActivePanelValues();
        const drawingNo = '2.1';
        generateBlueprintPDF(activePanelType, vals, drawingNo, activePanelId);
    });
    console.log("SUCCESS! Loose Post PDF generated successfully!");

    await browser.close();
    process.exit(0);
})();
