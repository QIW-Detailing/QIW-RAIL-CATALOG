const fs = require('fs');

// Load libraries
global.Bezier = require('./bez.js');
const browserMaker = fs.readFileSync('./browser.maker.js', 'utf8');
eval(browserMaker); // This defines global.MakerJs and require

global.makerjs = MakerJs;

// Load shapes database
const shapesDbCode = fs.readFileSync('./js/shapes-db.js', 'utf8');
eval(shapesDbCode);

// Load CAD Engine
const cadEngineCode = fs.readFileSync('./js/cad-engine.js', 'utf8');
eval(cadEngineCode);

console.log("Libraries loaded successfully. isLibReady = ", CadEngine.isLibReady());

try {
    const model = CadEngine.createFence(
        120,    // length
        72,     // fenceHeight
        80,     // postHeight
        48,     // postSpacing
        3.0,    // postW
        2.0,    // topRailH
        1.5,    // midRailH
        2.0,    // botRailH
        0.75,   // picketW
        4.0,    // picketSpacing
        0,      // slope
        'hss_rect',     // postType
        'hss_rect',     // topRailType
        'none',         // midRailType
        'hss_rect',     // botRailType
        'hss_rect',     // picketType
        'no',           // includeBasePlates
        6.0,    // bpW
        0.5     // bpH
    );
    console.log("SUCCESS! Model generated without errors.");
} catch (e) {
    console.error("FAILED! Error during createFence:", e.stack || e);
}
