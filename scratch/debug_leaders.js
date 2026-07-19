const fs = require('fs');
const vm = require('vm');

const sandbox = {
    console: console,
    require: require,
    setTimeout: setTimeout,
    clearTimeout: clearTimeout,
    setInterval: setInterval,
    clearInterval: clearInterval,
    process: process,
    Buffer: Buffer,
    __dirname: __dirname
};

sandbox.window = sandbox;
sandbox.global = sandbox;
sandbox.SketchProcessor = class { constructor() {} };
const createDummyElement = () => ({
    innerHTML: '',
    value: '',
    checked: false,
    style: {},
    addEventListener: () => {},
    appendChild: () => createDummyElement(),
    querySelectorAll: () => [],
    querySelector: () => createDummyElement(),
    getContext: () => ({ drawImage: () => {}, clearRect: () => {}, fillRect: () => {}, strokeRect: () => {}, fillText: () => {}, beginPath: () => {}, moveTo: () => {}, lineTo: () => {}, stroke: () => {}, fill: () => {} }),
    toDataURL: () => 'data:image/png;base64,abc',
    classList: {
        add: () => {},
        remove: () => {},
        contains: () => false,
        toggle: () => {}
    }
});
sandbox.alert = () => {};
sandbox.btoa = (str) => Buffer.from(str, 'binary').toString('base64');
sandbox.DOMParser = class {
    parseFromString(str, type) {
        return {
            querySelector: (sel) => {
                if (sel === 'svg') return {
                    getAttribute: () => '0 0 200 150',
                    setAttribute: () => {},
                    querySelector: () => null,
                    querySelectorAll: () => ({ forEach: () => {} }),
                    style: {}
                };
                return null;
            },
            documentElement: {}
        };
    }
};
sandbox.window.DOMParser = sandbox.DOMParser;

class MockXMLSerializer {
    serializeToString() { return '<svg></svg>'; }
}
sandbox.window.XMLSerializer = MockXMLSerializer;

class MockImage {
    constructor() {
        setTimeout(() => { if (this.onload) this.onload(); }, 5);
    }
}
sandbox.window.Image = MockImage;

const vals = {
    length: 192.0,
    fenceHeight: 41.0,
    postHeight: 45.75,
    topGap: 4.75,
    postSpacing: 48,
    postW: 1.5,
    postH: 1.5,
    postT: 0.1196,
    topRailH: 1.5,
    topRailW: 1.5,
    topRailT: 0.0598,
    botRailH: 1.5,
    botRailW: 1.5,
    botRailT: 0.0598,
    picketW: 0.5,
    picketSpacing: 4.0,
    slope: 0,
    postType: 'hss_rect',
    topRailType: 'hss_rect',
    botRailType: 'hss_rect',
    midRailType: 'hss_rect',
    picketType: 'none',
    includeBasePlates: 'no',
    railStyle: 'villa_balcony',
    midPosts: 'default',
    midPostCount: 3,
    leftPost: 'no',
    rightPost: 'yes',
    extraFlatBar: 'no',
    meshGridW: 2.0,
    meshGridH: 2.0,
    meshWireD: 0.135
};

const inputs = [];
for (const key in vals) {
    inputs.push({
        id: 'inp-' + key,
        type: typeof vals[key] === 'number' ? 'number' : 'text',
        value: vals[key].toString(),
        checked: vals[key] === 'yes',
        tagName: 'INPUT',
        addEventListener: () => {},
        style: {},
        appendChild: () => ({}),
        querySelectorAll: () => [],
        classList: { add: () => {}, remove: () => {} }
    });
}

sandbox.dynamicInputs = {
    querySelectorAll: () => inputs,
    querySelector: () => null,
    addEventListener: () => {}
};

sandbox.window.jspdf = {
    jsPDF: function() {
        return {
            setFont: () => {},
            setFontSize: () => {},
            setTextColor: () => {},
            setDrawColor: () => {},
            setFillColor: () => {},
            setLineWidth: () => {},
            setLineDashPattern: () => {},
            line: () => {},
            text: (txt, x, y) => {
                console.log(`TEXT DRAWN: "${txt}" at X=${x.toFixed(2)}, Y=${y.toFixed(2)}`);
            },
            rect: () => {},
            circle: () => {},
            triangle: () => {},
            addImage: () => {},
            getTextWidth: () => 5.0,
            output: () => 'pdf-data',
            internal: {
                pageSize: {
                    getWidth: () => 297,
                    getHeight: () => 210
                }
            }
        };
    }
};

sandbox.document = {
    getElementById: (id) => {
        if (id === 'sketch-canvas') {
            return {
                getContext: () => ({}),
                addEventListener: () => {},
                parentElement: { clientWidth: 800, clientHeight: 600 }
            };
        }
        const found = inputs.find(inp => inp.id === id);
        if (found) return found;
        if (id === 'shape-category') {
            return {
                value: 'rail_catalog',
                style: {},
                addEventListener: () => {},
                querySelectorAll: () => [],
                classList: { add: () => {}, remove: () => {} }
            };
        }
        if (id === 'dynamic-inputs') {
            return sandbox.dynamicInputs;
        }
        return createDummyElement();
    },
    createElement: () => createDummyElement(),
    addEventListener: () => {},
    querySelectorAll: (sel) => {
        if (sel === 'input' || sel === 'select' || sel === 'input, select') {
            return inputs;
        }
        return [];
    },
    querySelector: (sel) => {
        return createDummyElement();
    }
};
sandbox.shapeCategory = sandbox.document.getElementById('shape-category');

sandbox.balconyWizardState = {
    activeSetIdx: 0,
    activePanelType: 'main',
    sets: [
        {
            drawingBase: '1',
            quantity: 1,
            main: { ...vals },
            leftReturn: null,
            rightReturn: null
        }
    ]
};
sandbox.hiddenAnnotations = new Set();
sandbox.annotationOffsets = {};
sandbox.annotationProperties = {};

// Load dependencies
sandbox.makerjs = {
    measure: {
        modelExtents: () => ({ low: [0, 0], high: [vals.length, vals.postHeight] })
    }
};
sandbox.window.makerjs = sandbox.makerjs;

// Load shapes-db.js and execute in sandbox
const shapesDbCode = fs.readFileSync('js/shapes-db.js', 'utf8');
vm.runInNewContext(shapesDbCode, sandbox);

// Load cad-engine.js and execute in sandbox
let cadEngineCode = fs.readFileSync('js/cad-engine.js', 'utf8');
cadEngineCode = cadEngineCode.replace('const CadEngine =', 'var CadEngine =');
vm.runInNewContext(cadEngineCode, sandbox);
// Override CadEngine methods to bypass makerjs dependencies in node sandbox
sandbox.CadEngine.createCombinedBalconyModel = () => ({ models: {}, paths: {} });
sandbox.CadEngine.getPanelModel = () => ({ models: {}, paths: {} });
sandbox.CadEngine.createLoosePostModel = () => ({ models: {}, paths: {} });
sandbox.CadEngine.isLibReady = () => true;
sandbox.CadEngine.renderSVG = () => '<svg></svg>';
sandbox.CadEngine.renderClean2DSVG = () => '<svg></svg>';
sandbox.window.addEventListener = () => {};
sandbox.addEventListener = () => {};
// Capture DOMContentLoaded callback
let domContentLoadedCallback = null;
sandbox.document.addEventListener = (event, cb) => {
    if (event === 'DOMContentLoaded') {
        domContentLoadedCallback = cb;
    }
};

// Expose app.js
let appCode = fs.readFileSync('js/app.js', 'utf8');
appCode = appCode.replace('function generateBlueprintPDF', 'window.generateBlueprintPDF = function generateBlueprintPDF');
appCode = appCode.replace('let balconyWizardState = {', 'window.balconyWizardState = {');
appCode = appCode.replace("vals[id] = (inp.type === 'text') ? inp.value : (parseFloat(inp.value) || 0);", "vals[id] = (inp.type === 'text') ? inp.value : (parseFloat(inp.value) || 0);\n                console.log('INPUT READ:', id, vals[id]);");
appCode = appCode.replace('drawCadDimension(0, pHeight, vals.length, pHeight,', "console.log('length in vals at dim start:', vals.length, 'midPostCount:', vals.midPostCount);\n                  drawCadDimension(0, pHeight, vals.length, pHeight,");
appCode = appCode.replaceAll("if (isMeshStyle && activePanelType === 'main')", "if (false && isMeshStyle && activePanelType === 'main')");
appCode = appCode.replace("const style = vals.railStyle || 'classical';", "console.log('VALS AFTER COPY:', JSON.stringify(vals));\n            const style = vals.railStyle || 'classical';");

// Intercept print outputs of leaders
appCode = appCode.replace(
    'function drawTopBottomLeader(targetCx, targetCy, labelPdfX, labelPdfY, text, leaderId = "", isTop = true) {',
    'function drawTopBottomLeader(targetCx, targetCy, labelPdfX, labelPdfY, text, leaderId = "", isTop = true) {\n' +
    '    console.log(`LEADER ${leaderId}: text="${text}", targetCx=${targetCx}, labelPdfX=${labelPdfX.toFixed(2)}, finalY=${labelPdfY.toFixed(2)}`);\n' +
    '    console.log("extensionLinesPDF:", typeof extensionLinesPDF !== "undefined" ? extensionLinesPDF : "undefined");'
);

console.log("first replace index:", appCode.indexOf("window.generateBlueprintPDF"));
console.log("second replace index:", appCode.indexOf("console.log(`LEADER"));
console.log("INPUT READ replace index:", appCode.indexOf("INPUT READ"));

try {
    vm.runInNewContext(appCode, sandbox);
    console.log("app.js loaded successfully in VM!");
    if (domContentLoadedCallback) {
        domContentLoadedCallback();
        console.log("DOMContentLoaded callback executed successfully!");
    }
    console.log("typeof generateBlueprintPDF:", typeof sandbox.generateBlueprintPDF);
    console.log("typeof window.generateBlueprintPDF:", typeof sandbox.window.generateBlueprintPDF);
} catch (e) {
    console.error("CRITICAL! VM run failed:", e.message, e.stack);
}

if (sandbox.window.balconyWizardState) {
    const main = sandbox.window.balconyWizardState.sets[0].main;
    main.length = 192.0;
    main.midPostCount = 3;
    main.leftPost = 'no';
    main.rightPost = 'yes';
    main.railStyle = 'villa_balcony';
    main.midRailType = 'hss_rect';
    main.midPosts = 'default';
}

inputs.forEach(inp => {
    const key = inp.id.replace('inp-', '');
    if (vals[key] !== undefined) {
        inp.value = vals[key].toString();
        inp.checked = vals[key] === 'yes';
    }
});

console.log("length in set main:", sandbox.window.balconyWizardState.sets[0].main.length);
console.log("length in inputs[length]:", inputs.find(i => i.id === 'inp-length').value);

if (typeof sandbox.window.generateBlueprintPDF === 'function') {
    sandbox.window.generateBlueprintPDF(
        '1.0', 'F-202', 'J-303', '1P1', '0', 'Primer', false,
        'QUALITY IRONWORKS PROJECT', 'APEX BUILDERS', '123 STEEL WAY', 'HOUSTON, TX',
        'ENG', 'QIW', true, false, 1, 'main', false, null
    ).then(() => {
        console.log("PDF generated successfully!");
    }).catch(err => {
        console.error("PDF generation failed:", err);
    });
} else {
    console.error("generateBlueprintPDF is not a function!");
}
