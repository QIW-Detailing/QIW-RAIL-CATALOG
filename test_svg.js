const fs = require('fs');

global.Bezier = require('./bez.js');
const browserMaker = fs.readFileSync('./browser.maker.js', 'utf8');
eval(browserMaker); // This defines global.MakerJs and require
global.makerjs = MakerJs;

const shapesDbCode = fs.readFileSync('./js/shapes-db.js', 'utf8');
eval(shapesDbCode);

const cadEngineCode = fs.readFileSync('./js/cad-engine.js', 'utf8');
eval(cadEngineCode);

const model = CadEngine.createFence(
    144,    // length (12 feet)
    41,     // fenceHeight
    45.75,  // postHeight
    0.75,   // topGap
    48,     // postSpacing
    1.5,    // postW
    1.5,    // topRailH
    1.5,    // midRailH
    1.5,    // botRailH
    0.5,    // picketW
    4.0,    // picketSpacing
    0,      // slope
    'hss_rect',
    'plate',
    'plate',
    'plate',
    'plate',
    'no'
);

const svg = CadEngine.renderSVG(model);
console.log(svg.substring(0, 500));
