const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

// Mock browser APIs
const dom = new JSDOM('<!DOCTYPE html><html><body><canvas id="viewport"></canvas></body></html>', {
    url: 'http://localhost/'
});
global.window = dom.window;
global.document = dom.window.document;
global.navigator = dom.window.navigator;
global.HTMLCanvasElement = dom.window.HTMLCanvasElement;
global.jsPDF = function() {
    return {
        setFont: () => {},
        setFontSize: () => {},
        setTextColor: () => {},
        setDrawColor: () => {},
        setLineWidth: () => {},
        setLineDashPattern: () => {},
        line: () => {},
        text: () => {},
        rect: () => {},
        circle: () => {},
        output: () => 'pdf-data',
        internal: {
            pageSize: {
                getWidth: () => 297,
                getHeight: () => 210
            }
        }
    };
};

// Mock canvas context
HTMLCanvasElement.prototype.getContext = () => ({
    clearRect: () => {},
    fillRect: () => {},
    strokeRect: () => {},
    fillText: () => {},
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    stroke: () => {},
    fill: () => {}
});

// Load app.js
const appJsPath = path.join(__dirname, '../js/app.js');
const appJsCode = fs.readFileSync(appJsPath, 'utf8');
eval(appJsCode);
console.log("app.js loaded successfully!");

// Trigger DOMContentLoaded
const event = new dom.window.Event('DOMContentLoaded');
dom.window.document.dispatchEvent(event);
console.log("DOMContentLoaded callback executed successfully!");

// Define test inputs
const mockVals = {
    length: 120,
    fenceHeight: 42,
    topGap: 2,
    leftPost: 'yes',
    rightPost: 'yes',
    midPosts: 'equal',
    postType: 'hss_1.5',
    postSize: '1 1/2"x1 1/2"x11GA',
    postW: 1.5,
    topRailType: 'hss_1.5',
    topRailSize: '1 1/2"x1 1/2"x16GA',
    topRailH: 1.5,
    botRailType: 'hss_1.5',
    botRailSize: '1 1/2"x1 1/2"x16GA',
    botRailH: 1.5,
    picketType: 'none',
    railStyle: 'urban_balcony', // Mesh style
    includeBasePlates: 'no'
};

// Generate Main PDF
console.log("Generating Main PDF...");
try {
    generateBlueprintPDF('main', mockVals, '1.0', 1);
    console.log("SUCCESS! Main PDF generated successfully!");
} catch (e) {
    console.error("FAIL! Main PDF generation failed:", e);
    process.exit(1);
}

// Generate Loose Post PDF
console.log("Generating Loose Post PDF...");
try {
    generateBlueprintPDF('loosePost', mockVals, '2.1', 1);
    console.log("SUCCESS! Loose Post PDF generated successfully!");
} catch (e) {
    console.error("FAIL! Loose Post PDF generation failed:", e);
    process.exit(1);
}
