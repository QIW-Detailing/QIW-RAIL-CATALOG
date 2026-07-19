const fs = require('fs');
const vm = require('vm');

const sandbox = {
    console: console,
    Math: Math,
    parseFloat: parseFloat,
    parseInt: parseInt,
    Array: Array,
    Object: Object,
    String: String,
    RegExp: RegExp,
    Error: Error,
    Infinity: Infinity,
    isNaN: isNaN
};
sandbox.window = sandbox;

// Load maker.js
const makerCode = fs.readFileSync('browser.maker.js', 'utf8');
vm.runInNewContext(makerCode, sandbox);

// Load cad-engine.js
const cadEngineCode = fs.readFileSync('js/cad-engine.js', 'utf8');
vm.runInNewContext(cadEngineCode, sandbox);

console.log("CadEngine loaded! Keys:", Object.keys(sandbox.CadEngine || {}));

const set = {
    main: {
        railStyle: 'urban_balcony',
        length: 120.0,
        leftPost: 'yes',
        rightPost: 'yes',
        midPosts: 'default',
        postHeight: 45.75,
        fenceHeight: 41.0
    }
};

try {
    const model = sandbox.CadEngine.createCombinedBalconyModel(set, 'main', false);
    console.log("SUCCESS! Model keys:", Object.keys(model || {}));
    if (model && model.models) {
        console.log("Sub-models keys:", Object.keys(model.models));
    }
} catch (e) {
    console.error("FAILED to generate model:", e);
}
