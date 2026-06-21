/**
 * SteelDraft Main Application Logic
 */

if (typeof makerjs === 'undefined' && typeof MakerJs !== 'undefined') {
    window.makerjs = MakerJs;
}

function formatFraction(val) {
    if (typeof val !== 'number' || isNaN(val)) return '0"';
    const totalSixteenths = Math.round(val * 16);
    const totalInches = Math.floor(totalSixteenths / 16);
    const sixteenths = totalSixteenths % 16;
    const feet = Math.floor(totalInches / 12);
    const inches = totalInches % 12;
    
    let fractionStr = '';
    if (sixteenths > 0) {
        let num = sixteenths, den = 16;
        while (num % 2 === 0) { num /= 2; den /= 2; }
        fractionStr = ` ${num}/${den}`;
    }
    
    if (feet > 0) {
        return `${feet}'-${inches}${fractionStr}"`;
    } else {
        if (inches === 0 && fractionStr !== '') {
            return `${fractionStr.trim()}"`;
        }
        return `${inches}${fractionStr}"`;
    }
}

function getProfileThickness(type, size, customVal) {
    if (type === 'none' || size === 'NONE') return 0;
    if (size === 'CUSTOM') return customVal;
    const shapes = SHAPES_DB[type] || [];
    const selected = shapes.find(s => s.id === size);
    if (selected) return selected.t || 0.12;
    return customVal;
}

function getPicketDimension(type, size, customVal) {
    if (type === 'none' || size === 'NONE') return 0;
    if (size === 'CUSTOM') return customVal;
    const shapes = SHAPES_DB[type] || [];
    const selected = shapes.find(s => s.id === size);
    if (selected) {
        if (type === 'hss_rect') return selected.w || 0;
        if (type === 'hss_circ') return selected.d || 0;
        if (type === 'w_beam') return selected.bf || 0;
        if (type === 'angles') return selected.leg1 || 0;
        if (type === 'plate') return selected.t || 0;
    }
    return customVal;
}

function getProfileDimension(type, size, customVal) {
    if (type === 'none' || size === 'NONE') return 0;
    if (size === 'CUSTOM') return customVal;
    const shapes = SHAPES_DB[type] || [];
    const selected = shapes.find(s => s.id === size);
    if (selected) {
        if (type === 'hss_rect') return selected.h || selected.w || 0;
        if (type === 'hss_circ') return selected.d || 0;
        if (type === 'w_beam') return selected.d || 0;
        if (type === 'angles') return selected.leg2 || selected.leg1 || 0;
        if (type === 'plate') return selected.t || 0;
    }
    return customVal;
}

function formatPlateDesc(sizeId, width) {
    let thick = sizeId || 'PL11GA';
    if (thick.startsWith('PL')) {
        thick = thick.substring(2);
    }
    if (thick.endsWith('GA')) {
        thick = thick.replace('GA', ' GA');
    }
    
    const formatFracLocal = (val) => {
        if (typeof val !== 'number' || isNaN(val)) return '0';
        const totalSixteenths = Math.round(val * 16);
        const totalInches = Math.floor(totalSixteenths / 16);
        const sixteenths = totalSixteenths % 16;
        if (sixteenths > 0) {
            let num = sixteenths, den = 16;
            while (num % 2 === 0) { num /= 2; den /= 2; }
            return totalInches === 0 ? `${num}/${den}` : `${totalInches} ${num}/${den}`;
        }
        return `${totalInches}`;
    };
}

function getResolvedPanelProperties(panel, style) {
    if (!panel) return null;
    let fHeight = panel.fenceHeight !== undefined ? panel.fenceHeight : 41.0;
    let pHeight = panel.postHeight !== undefined ? panel.postHeight : 45.75;
    let postType = panel.postType || 'hss_rect';
    let postW = panel.postW !== undefined ? panel.postW : 1.5;
    let postH = panel.postH !== undefined ? panel.postH : 1.5;
    let postT = panel.postT !== undefined ? panel.postT : 0.1196;
    let topRailType = panel.topRailType || 'hss_rect';
    let topRailW = panel.topRailW !== undefined ? panel.topRailW : 1.5;
    let topRailH = panel.topRailH !== undefined ? panel.topRailH : 1.5;
    let topRailT = panel.topRailT !== undefined ? panel.topRailT : 0.0598;
    let botRailType = panel.botRailType || 'hss_rect';
    let botRailW = panel.botRailW !== undefined ? panel.botRailW : 1.5;
    let botRailH = panel.botRailH !== undefined ? panel.botRailH : 1.5;
    let botRailT = panel.botRailT !== undefined ? panel.botRailT : 0.0598;
    let midRailType = panel.midRailType || 'none';
    let midRailW = panel.midRailW !== undefined ? panel.midRailW : 1.5;
    let midRailH = panel.midRailH !== undefined ? panel.midRailH : 1.5;
    let midRailT = panel.midRailT !== undefined ? panel.midRailT : 0.0598;
    let midRailGap = panel.midRailGap !== undefined ? panel.midRailGap : 12.0;
    let picketType = panel.picketType || 'hss_rect';
    let picketW = panel.picketW !== undefined ? panel.picketW : 0.5;
    let picketH = panel.picketH !== undefined ? panel.picketH : 0.5;
    let picketT = panel.picketT !== undefined ? panel.picketT : 0.0598;
    let picketSpacing = panel.picketSpacing !== undefined ? panel.picketSpacing : 4.0;
    let includeBasePlates = panel.includeBasePlates || 'no';
    let bpW = panel.basePlateW !== undefined ? panel.basePlateW : 6.0;
    let bpL = panel.basePlateL !== undefined ? panel.basePlateL : 6.0;
    let bpH = panel.basePlateT !== undefined ? panel.basePlateT : 0.5;
    let bpHoleD = panel.basePlateHoleD !== undefined ? panel.basePlateHoleD : 0.5;
    let bpHoleOffsetX = panel.basePlateHoleOffsetX !== undefined ? panel.basePlateHoleOffsetX : 0.5;
    let bpHoleOffsetY = panel.basePlateHoleOffsetY !== undefined ? panel.basePlateHoleOffsetY : 0.25;

    if (style === 'classical') {
        fHeight = 41.0; pHeight = 45.75;
        postType = 'hss_rect'; postW = 1.5; postH = 1.5; postT = 0.1196;
        topRailType = 'hss_rect'; topRailW = 1.5; topRailH = 1.5; topRailT = 0.0598;
        botRailType = 'hss_rect'; botRailW = 1.5; botRailH = 1.5; botRailT = 0.0598;
        midRailType = 'none';
        picketType = 'hss_rect'; picketW = 0.5; picketH = 0.5; picketT = 0.0598; picketSpacing = 4.0;
        includeBasePlates = 'no';
    } else if (style === 'executive') {
        fHeight = 41.0; pHeight = 45.75;
        postType = 'hss_rect'; postW = 1.5; postH = 1.5; postT = 0.1196;
        topRailType = 'hss_rect'; topRailW = 1.5; topRailH = 1.5; topRailT = 0.0598;
        botRailType = 'hss_rect'; botRailW = 1.5; botRailH = 1.5; botRailT = 0.0598;
        midRailType = 'hss_rect'; midRailW = 1.5; midRailH = 1.5; midRailT = 0.0598; midRailGap = 3.0;
        picketType = 'hss_rect'; picketW = 0.5; picketH = 0.5; picketT = 0.0598; picketSpacing = 4.0;
        includeBasePlates = 'no';
    } else if (style === 'urban_balcony') {
        fHeight = 41.0; pHeight = 45.75;
        postType = 'hss_rect'; postW = 1.5; postH = 1.5; postT = 0.1196;
        topRailType = 'hss_rect'; topRailW = 1.5; topRailH = 1.5; topRailT = 0.0598;
        botRailType = 'hss_rect'; botRailW = 1.5; botRailH = 1.5; botRailT = 0.0598;
        midRailType = 'none';
        picketType = 'none'; picketW = 0; picketH = 0; picketT = 0; picketSpacing = 0;
        includeBasePlates = 'no';
    } else if (style === 'villa_balcony') {
        fHeight = 41.0; pHeight = 45.75;
        postType = 'hss_rect'; postW = 1.5; postH = 1.5; postT = 0.1196;
        topRailType = 'hss_rect'; topRailW = 1.5; topRailH = 1.5; topRailT = 0.0598;
        botRailType = 'hss_rect'; botRailW = 1.5; botRailH = 1.5; botRailT = 0.0598;
        midRailType = 'hss_rect'; midRailW = 1.5; midRailH = 1.5; midRailT = 0.0598; midRailGap = 3.0;
        picketType = 'none'; picketW = 0; picketH = 0; picketT = 0; picketSpacing = 0;
        includeBasePlates = 'no';
    } else if (style === 'urban_custom' || style === 'villa_custom') {
        fHeight = panel.fenceHeight || 36;
        pHeight = panel.postHeight || 36;
        postType = panel.postType || 'hss_rect';
        postW = getPicketDimension(panel.postType, panel.postSize, panel.postW || 1.5);
        postH = getProfileDimension(panel.postType, panel.postSize, panel.postW || 1.5);
        postT = getProfileThickness(panel.postType, panel.postSize, panel.postW || 0.12);
        topRailType = panel.topRailType || 'hss_rect';
        topRailW = getPicketDimension(panel.topRailType, panel.topRailSize, panel.topRailH || 1.5);
        topRailH = getProfileDimension(panel.topRailType, panel.topRailSize, panel.topRailH || 1.5);
        topRailT = getProfileThickness(panel.topRailType, panel.topRailSize, panel.topRailH || 0.12);
        botRailType = panel.botRailType || 'hss_rect';
        botRailW = getPicketDimension(panel.botRailType, panel.botRailSize, panel.botRailH || 1.5);
        botRailH = getProfileDimension(panel.botRailType, panel.botRailSize, panel.botRailH || 1.5);
        botRailT = getProfileThickness(panel.botRailType, panel.botRailSize, panel.botRailH || 0.12);
        midRailType = (style === 'villa_custom') ? (panel.midRailType || 'hss_rect') : 'none';
        midRailW = getPicketDimension(midRailType, panel.midRailSize, panel.midRailH || 1.5);
        midRailH = getProfileDimension(midRailType, panel.midRailSize, panel.midRailH || 1.5);
        midRailT = getProfileThickness(midRailType, panel.midRailSize, panel.midRailH || 0.12);
        midRailGap = panel.midRailGap !== undefined ? panel.midRailGap : 12.0;
        picketType = 'none';
        picketW = 0; picketH = 0; picketT = 0; picketSpacing = 0;
        includeBasePlates = panel.includeBasePlates || 'no';
        bpW = panel.basePlateW || 6.0;
        bpL = panel.basePlateL || 6.0;
        bpH = getProfileDimension('plate', panel.basePlateSize, panel.basePlateT || 0.5);
        bpHoleD = panel.basePlateHoleD || 0.5;
        bpHoleOffsetX = panel.basePlateHoleOffsetX || 0.5;
        bpHoleOffsetY = panel.basePlateHoleOffsetY || 0.25;
    } else {
        fHeight = panel.fenceHeight || 36;
        pHeight = panel.postHeight || 36;
        postType = panel.postType || 'hss_rect';
        postW = getPicketDimension(panel.postType, panel.postSize, panel.postW || 1.5);
        postH = getProfileDimension(panel.postType, panel.postSize, panel.postW || 1.5);
        postT = getProfileThickness(panel.postType, panel.postSize, panel.postW || 0.12);
        topRailType = panel.topRailType || 'hss_rect';
        topRailW = getPicketDimension(panel.topRailType, panel.topRailSize, panel.topRailH || 1.5);
        topRailH = getProfileDimension(panel.topRailType, panel.topRailSize, panel.topRailH || 1.5);
        topRailT = getProfileThickness(panel.topRailType, panel.topRailSize, panel.topRailH || 0.12);
        botRailType = panel.botRailType || 'hss_rect';
        botRailW = getPicketDimension(panel.botRailType, panel.botRailSize, panel.botRailH || 1.5);
        botRailH = getProfileDimension(panel.botRailType, panel.botRailSize, panel.botRailH || 1.5);
        botRailT = getProfileThickness(panel.botRailType, panel.botRailSize, panel.botRailH || 0.12);
        midRailType = panel.midRailType || 'none';
        midRailW = getPicketDimension(panel.midRailType, panel.midRailSize, panel.midRailH || 1.5);
        midRailH = getProfileDimension(panel.midRailType, panel.midRailSize, panel.midRailH || 1.5);
        midRailT = getProfileThickness(panel.midRailType, panel.midRailSize, panel.midRailH || 0.12);
        midRailGap = panel.midRailGap !== undefined ? panel.midRailGap : 12.0;
        picketType = panel.picketType || 'hss_rect';
        picketW = getPicketDimension(panel.picketType, panel.picketSize, panel.picketW || 0.5);
        picketH = getProfileDimension(panel.picketType, panel.picketSize, panel.picketW || 0.5);
        picketT = getProfileThickness(panel.picketType, panel.picketSize, panel.picketW || 0.083);
        picketSpacing = panel.picketSpacing || 4.0;
        includeBasePlates = panel.includeBasePlates || 'no';
        bpW = panel.basePlateW || 6.0;
        bpL = panel.basePlateL || 6.0;
        bpH = getProfileDimension('plate', panel.basePlateSize, panel.basePlateT || 0.5);
        bpHoleD = panel.basePlateHoleD || 0.5;
        bpHoleOffsetX = panel.basePlateHoleOffsetX || 0.5;
        bpHoleOffsetY = panel.basePlateHoleOffsetY || 0.25;
    }

    return {
        length: panel.length || 0,
        fHeight, pHeight, postType, postW, postH, postT,
        topRailType, topRailW, topRailH, topRailT,
        botRailType, botRailW, botRailH, botRailT,
        midRailType, midRailW, midRailH, midRailT, midRailGap,
        picketType, picketW, picketH, picketT, picketSpacing,
        leftPost: panel.leftPost || 'yes',
        rightPost: panel.rightPost || 'yes',
        midPosts: panel.midPosts || 'none',
        midPostCount: (panel.midPosts === 'default' || panel.midPosts === 'yes') ? Math.max(0, Math.ceil((panel.length || 0) / 48) - 1) : ((panel.midPosts === 'custom' || panel.midPosts === 'custom_standard') ? (parseInt(panel.midPostCount) || 0) : 0),
        includeBasePlates, bpW, bpL, bpH, bpHoleD, bpHoleOffsetX, bpHoleOffsetY,
        meshGridW: panel.meshGridW !== undefined ? parseFloat(panel.meshGridW) : 2.0,
        meshGridH: panel.meshGridH !== undefined ? parseFloat(panel.meshGridH) : 2.0,
        meshWireD: panel.meshWireD !== undefined ? parseFloat(panel.meshWireD) : 0.135,
        extraFlatBar: panel.extraFlatBar || 'no'
    };
}
window.getResolvedPanelProperties = getResolvedPanelProperties;

function parseMeshSpec(meshType, spec, heightVal) {
    const clean = (spec || '').trim();
    const formattedHeight = formatFraction(heightVal).replace(/"/g, '');
    
    if (meshType === 'mesh') {
        const m = clean.match(/^(?:WWM)?\s*(\d+(?:\.\d+)?\s*x\s*\d+(?:\.\d+)?)\s*x\s*([0-9.#\/]+)/i);
        if (m) {
            const grid = m[1].replace(/\s+/g, '');
            let wire = m[2];
            if (wire.startsWith('0.')) {
                wire = wire.substring(1);
            }
            const bomDesc = `WWM${grid}x${wire}x${formattedHeight}`;
            const dimensions = `${grid} * ${wire} * ${formattedHeight}`;
            return { bomDesc, dimensions };
        }
        const fallbackGrid = clean.replace(/^WWM/i, '').trim();
        return {
            bomDesc: `${clean}x${formattedHeight}`,
            dimensions: `${fallbackGrid} * ${formattedHeight}`
        };
    } else if (meshType === 'xf') {
        const m = clean.match(/^(?:XF)?\s*([0-9.\/]+)\s*x\s*(?:#)?(\d+)(?:GA)?/i);
        if (m) {
            const opening = m[1];
            const gage = m[2];
            const bomDesc = `XF${opening}x#${gage}x${formattedHeight}`;
            const dimensions = `${opening} - ${gage}GAx${formattedHeight}`;
            return { bomDesc, dimensions };
        }
        const fallbackGage = clean.replace(/^XF/i, '').trim();
        return {
            bomDesc: `${clean}x${formattedHeight}`,
            dimensions: `${fallbackGage}x${formattedHeight}`
        };
    }
    return { bomDesc: clean, dimensions: clean };
}

function resolveMidPostCenters(length, leftPostOpt, rightPostOpt, midPostsOpt, midPostCount, postW, customSpacings, style) {
    const centers = [];
    if (midPostsOpt === 'none') return centers;

    const startXBound = (leftPostOpt === 'yes') ? postW : 0;
    const endXBound = (rightPostOpt === 'yes') ? (length - postW) : length;

    if (midPostsOpt === 'default' || midPostsOpt === 'yes') {
        const count = Math.max(0, Math.ceil(length / 48) - 1);
        if (count > 0) {
            const D = (length - (count - 1) * 48) / 2;
            for (let i = 1; i <= count; i++) {
                centers.push(D + (i - 1) * 48);
            }
        }
    } else if (midPostsOpt === 'custom_standard') {
        const count = midPostCount;
        if (count > 0) {
            const centerDist = endXBound - startXBound;
            const spanSpacing = centerDist / (count + 1);
            for (let i = 1; i <= count; i++) {
                centers.push(startXBound + i * spanSpacing);
            }
        }
    } else if (midPostsOpt === 'custom') {
        const count = midPostCount;
        let currentX = 0;
        for (let i = 0; i < count; i++) {
            const spacing = (customSpacings && customSpacings[i] !== undefined) ? customSpacings[i] : 48;
            currentX += spacing;
            centers.push(currentX);
        }
    }
    return centers;
}

function getPicketPositions(style, length, leftPostW, rightPostW, pickW, picketSpacing, midPostCount, midPostW, midPostsOpt = 'none', customSpacings = null) {
    let picketPositions = [];
    const isExecutive = (style === 'executive');
    if (isExecutive) {
        const leftPostOpt = leftPostW > 0 ? 'yes' : 'no';
        const rightPostOpt = rightPostW > 0 ? 'yes' : 'no';
        
        let startX, step, maxVal;
        if (leftPostOpt === 'yes') {
            startX = leftPostW / 2 + 4.0;
            step = 4.0;
            maxVal = rightPostOpt === 'yes' ? (length - rightPostW / 2 - 4.0 + 0.01) : (length - pickW);
            for (let x = startX; x <= maxVal; x += step) {
                picketPositions.push(x - pickW / 2);
            }
        } else if (rightPostOpt === 'yes') {
            const startX_right = length - rightPostW / 2 - 4.0;
            step = 4.0;
            const minVal = pickW;
            for (let x = startX_right; x >= minVal; x -= step) {
                picketPositions.push(x - pickW / 2);
            }
            picketPositions.reverse();
        } else {
            const clearWidth = length;
            const numPickets = Math.floor((clearWidth - pickW) / 4.0);
            if (numPickets > 0) {
                const usedWidth = (numPickets - 1) * 4.0 + pickW;
                const sX = (clearWidth - usedWidth) / 2;
                for (let i = 0; i < numPickets; i++) {
                    picketPositions.push(sX + i * 4.0);
                }
            }
        }
    } else {
        const clearWidth = length - leftPostW - rightPostW;
        const numPickets = picketSpacing > 0 ? Math.floor((clearWidth - pickW) / picketSpacing) : 0;
        if (numPickets > 0) {
            const usedWidth = (numPickets - 1) * picketSpacing + pickW;
            const startX = leftPostW + (clearWidth - usedWidth) / 2;
            for (let i = 0; i < numPickets; i++) {
                picketPositions.push(startX + i * picketSpacing);
            }
        }
    }

    // Filter out mid post overlaps
    const leftPostOpt = leftPostW > 0 ? 'yes' : 'no';
    const rightPostOpt = rightPostW > 0 ? 'yes' : 'no';
    const midPostCenters = resolveMidPostCenters(length, leftPostOpt, rightPostOpt, midPostsOpt, midPostCount, midPostW, customSpacings, style);
    
    if (midPostCenters.length > 0) {
        picketPositions = picketPositions.filter(px => {
            for (let j = 0; j < midPostCenters.length; j++) {
                const midCx = midPostCenters[j];
                if (Math.abs(px + pickW/2 - midCx) < (midPostW/2 + pickW/2 + 0.1)) {
                    return false;
                }
            }
            return true;
        });
    }

    return picketPositions;
}

document.addEventListener('DOMContentLoaded', () => {
    // --- State ---
    let currentMode = 'shapes';
    let pdfPreviewModeActive = false;
    let activePdfPreviewUrl = null;
    let currentModel = null;
    let isGeneratingZipBatch = false;
    let selectedShapeData = null;
    let tweakModeActive = false;
    let draftMembers = [];
    let selectedMemberId = null;
    let clipboardMember = null;
    let isDraggingDraftMember = false;
    let dragStartMouseX = 0;
    let dragStartMouseY = 0;
    let dragStartMemberOrigin = [0, 0];
    let cachedDragViewBox = null;
    let currentZoom = 1.0;
    let customSketchStrokes = null;
    let justSelectedInMousedown = false;
    
    const formatFraction = (val) => {
        if (typeof val !== 'number' || isNaN(val)) return '0"';
        const totalSixteenths = Math.round(val * 16);
        const totalInches = Math.floor(totalSixteenths / 16);
        const sixteenths = totalSixteenths % 16;
        const feet = Math.floor(totalInches / 12);
        const inches = totalInches % 12;
        
        let fractionStr = '';
        if (sixteenths > 0) {
            let num = sixteenths, den = 16;
            while (num % 2 === 0) { num /= 2; den /= 2; }
            fractionStr = ` ${num}/${den}`;
        }
        
        if (feet > 0) {
            return `${feet}'-${inches}${fractionStr}"`;
        } else {
            if (totalInches === 0 && sixteenths > 0) {
                return `${fractionStr.trim()}"`;
            }
            return `${inches}${fractionStr}"`;
        }
    };

    // AutoCAD Interactive Dimensioning State
    let autocadDimModeActive = false;
    let customDimensionsList = [];
    let customDimFontSize = 12;
    let customDimTextGap = 8;
    let dimStartPoint = null;
    let activeSnapPoint = null;
    let cachedSnapPoints = [];
    let activeDraggedGripIdx = null;
    let activeDraggedGripName = null;

    // AutoCAD Dragging Annotation State
    let activeDraggedAnnotId = null;
    let activeDraggedAnnotType = null;
    let activeDraggedAnnotAxis = 'Y';
    let dragStartMousePos = null;
    let dragStartMouseCadPos = null;
    let dragStartOffset = null;
    let annotationOffsets = {};
    let selectedAnnotId = null;
    let selectedAnnotType = null;
    let selectedCustomDimIdx = null;
    let hiddenAnnotations = new Set();
    let annotationProperties = {};

    // --- Custom Plate State ---
    let customPlatePoints = [[0, 0]];
    let customPlateHoles = [];
    let selectedCustomLineIdx = null;

    // --- Helper to convert set index to letter (A, B, ..., Z, AA, AB, ...) ---
    function getSetLetter(idx) {
        let letter = "";
        let temp = idx;
        while (temp >= 0) {
            letter = String.fromCharCode((temp % 26) + 65) + letter;
            temp = Math.floor(temp / 26) - 1;
        }
        return letter;
    }

    function resolveRailMarksAndSpans(vals, drawingNo, cat, style, postW, singleLen = null) {
        const cleanDrawingNo = drawingNo.toUpperCase().replace(/[^A-Z0-9]/g, '');
        
        // Calculate spans
        const clearSpans = [];
        if (cat === 'rail_catalog') {
            const midPostCount = (vals.midPosts === 'default' || vals.midPosts === 'yes') 
                ? Math.max(0, Math.ceil(vals.length / 48) - 1) 
                : ((vals.midPosts === 'custom' || vals.midPosts === 'custom_standard') ? (parseInt(vals.midPostCount) || 0) : 0);
            const startXBound = (vals.leftPost === 'yes') ? postW : 0;
            const endXBound = (vals.rightPost === 'yes') ? (vals.length - postW) : vals.length;
            
            const customSpacings = [];
            if (vals.midPosts === 'custom') {
                for (let i = 1; i <= midPostCount; i++) {
                    const spKey = `midPostSpacing-${i}`;
                    customSpacings.push(vals[spKey] !== undefined ? vals[spKey] : 48);
                }
            }

            let lastX = 0;
            const allPosts = [];
            if (vals.leftPost === 'yes') {
                allPosts.push({ startX: 0, endX: postW });
            }
            if (vals.midPosts !== 'none' && midPostCount > 0) {
                const resolvedCenters = resolveMidPostCenters(vals.length, vals.leftPost, vals.rightPost, vals.midPosts, midPostCount, postW, customSpacings, style);
                resolvedCenters.forEach(midCx => {
                    allPosts.push({ startX: midCx - postW/2, endX: midCx + postW/2 });
                });
            }
            if (vals.rightPost === 'yes') {
                allPosts.push({ startX: vals.length - postW, endX: vals.length });
            }

            for (let i = 0; i < allPosts.length; i++) {
                const p = allPosts[i];
                if (p.startX > lastX + 0.01) {
                    clearSpans.push({ start: lastX, end: p.startX });
                }
                lastX = p.endX;
            }
            if (vals.length > lastX + 0.01) {
                clearSpans.push({ start: lastX, end: vals.length });
            }
        } else {
            clearSpans.push({ start: 0, end: (singleLen !== null ? singleLen : vals.length) });
        }

        const roundTo16th = (val) => Math.round(val * 16) / 16;
        
        const bottomSegments = [];
        if (vals.botRailType !== 'none') {
            clearSpans.forEach((span, idx) => {
                const len = roundTo16th(span.end - span.start);
                bottomSegments.push({
                    idx: idx,
                    start: span.start,
                    end: span.end,
                    len: len
                });
            });
        }

        const midSegments = [];
        const hasMidRail = (cat === 'rail_catalog') ? (style === 'executive' || style === 'villa_balcony' || style === 'villa_custom' || style === 'executive_custom' || (style.includes('custom') && vals.midRailType !== 'none')) : (vals.midRailType !== 'none');
        if (hasMidRail) {
            clearSpans.forEach((span, idx) => {
                const len = roundTo16th(span.end - span.start);
                midSegments.push({
                    idx: idx,
                    start: span.start,
                    end: span.end,
                    len: len
                });
            });
        }

        const bottomUniqueLengths = [];
        bottomSegments.forEach(seg => {
            if (!bottomUniqueLengths.includes(seg.len)) {
                bottomUniqueLengths.push(seg.len);
            }
            const uIdx = bottomUniqueLengths.indexOf(seg.len);
            const suffix = uIdx === 0 ? "" : String.fromCharCode(64 + uIdx); // 65 is 'A'
            seg.mark = "a" + (cat === 'rail_catalog' ? drawingNo : cleanDrawingNo) + suffix;
        });

        const midUniqueLengths = [];
        midSegments.forEach(seg => {
            if (!midUniqueLengths.includes(seg.len)) {
                midUniqueLengths.push(seg.len);
            }
            const uIdx = midUniqueLengths.indexOf(seg.len);
            const suffix = uIdx === 0 ? "" : String.fromCharCode(64 + uIdx); // 65 is 'A'
            seg.mark = "b" + (cat === 'rail_catalog' ? drawingNo : cleanDrawingNo) + suffix;
        });

        return {
            bottomSegments,
            midSegments
        };
    }

    function getDefaultPanelConfig() {
        return {
            railStyle: 'classical',
            length: 120,
            leftPost: 'yes',
            rightPost: 'yes',
            midPosts: 'default',
            midPostCount: 1,
            postType: 'hss_rect',
            postSize: 'HSS1.5x1.5x14GA',
            postW: 1.5,
            postH: 1.5,
            postT: 0.1196,
            topRailType: 'hss_rect',
            topRailSize: 'HSS1.5x1.5x16GA',
            topRailW: 1.5,
            topRailH: 1.5,
            topRailT: 0.0598,
            botRailType: 'hss_rect',
            botRailSize: 'HSS1.5x1.5x16GA',
            botRailW: 1.5,
            botRailH: 1.5,
            botRailT: 0.0598,
            midRailType: 'none',
            midRailSize: 'HSS1.5x1.5x16GA',
            midRailW: 1.5,
            midRailH: 1.5,
            midRailT: 0.0598,
            midRailGap: 12.0,
            picketType: 'hss_rect',
            picketSize: 'HSS1/2x1/2x16GA',
            picketW: 0.5,
            picketH: 0.5,
            picketT: 0.0598,
            picketSpacing: 4.0,
            includeBasePlates: 'no',
            basePlateSize: 'PL1/2',
            basePlateW: 6.0,
            basePlateL: 6.0,
            basePlateT: 0.5,
            basePlateHoleD: 0.5,
            basePlateHoleOffsetX: 0.5,
            basePlateHoleOffsetY: 0.25,
            meshGridW: 2.0,
            meshGridH: 2.0,
            meshWireD: 0.135,
            extraFlatBar: 'no'
        };
    }

    // --- Balcony Wizard State ---
    let balconyWizardState = {
        sets: [
            {
                id: 1,
                drawingBase: "1",
                quantity: 1,
                main: getDefaultPanelConfig(),
                leftReturn: null,
                rightReturn: null
            }
        ],
        activeSetIdx: 0,
        activePanelType: 'main',
        step: 'main',
        tempSet: null
    };

    function getActiveBalconyDwgAndMark() {
        if (!balconyWizardState) {
            return { drawingNo: '1.0', mainMark: '1FB' };
        }
        const activeSet = balconyWizardState.tempSet || (balconyWizardState.sets ? balconyWizardState.sets[balconyWizardState.activeSetIdx] : null);
        if (!activeSet) return { drawingNo: '1.0', mainMark: '1FB' };
        const baseDwg = activeSet.drawingBase || '1';
        const panelType = balconyWizardState.activePanelType;
        
        let drawingNo = baseDwg + ".0";
        let mainMark = baseDwg + "FB";
        
        if (panelType === 'leftReturn') {
            drawingNo = baseDwg + ".2";
            mainMark = baseDwg + "LB";
        } else if (panelType === 'rightReturn') {
            drawingNo = activeSet.leftReturn ? (baseDwg + ".3") : (baseDwg + ".2");
            mainMark = baseDwg + "RB";
        }
        return { drawingNo, mainMark };
    }

    function saveCurrentInputsToActivePanel() {
        if (shapeCategory.value !== 'rail_catalog') return;
        const activeSet = balconyWizardState.tempSet || balconyWizardState.sets[balconyWizardState.activeSetIdx];
        const activePanel = balconyWizardState.activePanelType;
        const panelObj = activePanel === 'main' ? activeSet.main : (activePanel === 'leftReturn' ? activeSet.leftReturn : activeSet.rightReturn);
        if (!panelObj) return;

        dynamicInputs.querySelectorAll('input').forEach(inp => {
            const id = inp.id.replace('inp-', '');
            if (id === 'balconyDrawingNo' || id === 'railStyle') return;
            panelObj[id] = parseFloat(inp.value) || 0;
        });
        dynamicInputs.querySelectorAll('select').forEach(sel => {
            const id = sel.id.replace('inp-', '');
            if (id === 'balconyDrawingNo' || id === 'railStyle') return;
            panelObj[id] = sel.value;
        });
        
        const styleSelect = document.getElementById('inp-railStyle');
        if (styleSelect) {
            panelObj.railStyle = styleSelect.value;
        }

        // Collect custom spacings if midPosts is custom
        const midPostsSelect = document.getElementById('inp-midPosts');
        if (midPostsSelect && midPostsSelect.value === 'custom') {
            const midPostCountInput = document.getElementById('inp-midPostCount');
            const count = midPostCountInput ? (parseInt(midPostCountInput.value) || 0) : 0;
            const spacings = [];
            for (let i = 1; i <= count; i++) {
                const spInput = document.getElementById(`inp-midPostSpacing-${i}`);
                spacings.push(spInput ? (parseFloat(spInput.value) || 48) : 48);
            }
            panelObj.midPostSpacings = spacings;
        }
    }

    function loadActivePanelToInputs() {
        if (shapeCategory.value !== 'rail_catalog') return;
        const activeSet = balconyWizardState.tempSet || balconyWizardState.sets[balconyWizardState.activeSetIdx];
        const activePanel = balconyWizardState.activePanelType;
        const panelObj = activePanel === 'main' ? activeSet.main : (activePanel === 'leftReturn' ? activeSet.leftReturn : activeSet.rightReturn);
        if (!panelObj) return;

        for (const key in panelObj) {
            const inp = document.getElementById('inp-' + key);
            if (inp) {
                inp.value = panelObj[key];
            }
        }
        
        const styleSelect = document.getElementById('inp-railStyle');
        if (styleSelect) {
            styleSelect.value = panelObj.railStyle || 'classical';
        }
        
        const customOptionsWrapper = document.getElementById('grp-rail-catalog-custom-options');
        if (customOptionsWrapper) {
            const style = panelObj.railStyle || 'classical';
            if (style === 'classic_custom' || style === 'executive_custom' || style === 'urban_custom' || style === 'villa_custom') {
                customOptionsWrapper.classList.remove('hidden');
            } else {
                customOptionsWrapper.classList.add('hidden');
            }
        }

        const midPostsSelect = document.getElementById('inp-midPosts');
        const midPostCountGroup = document.getElementById('grp-rail-midPostCount');
        if (midPostsSelect && midPostCountGroup) {
            if (midPostsSelect.value === 'custom' || midPostsSelect.value === 'custom_standard') {
                midPostCountGroup.classList.remove('hidden');
            } else {
                midPostCountGroup.classList.add('hidden');
            }
        }

        // Load spacing values
        if (midPostsSelect && midPostsSelect.value === 'custom' && panelObj.midPostSpacings) {
            const count = parseInt(panelObj.midPostCount) || 0;
            for (let i = 1; i <= count; i++) {
                const spInput = document.getElementById(`inp-midPostSpacing-${i}`);
                if (spInput && panelObj.midPostSpacings[i - 1] !== undefined) {
                    spInput.value = panelObj.midPostSpacings[i - 1];
                }
            }
        }
    }
    
    // Viewport Panning State (AutoCAD-Style)
    let currentPanX = 0;
    let currentPanY = 0;
    let isPanning = false;
    let panStartX = 0;
    let panStartY = 0;
    let panModeActive = false;
    let panDelta = 0;

    const DRAFT_TEMPLATES = {
        hss_rect: { w: 4.0, h: 4.0, t: 0.25 },
        hss_circ: { d: 4.0, t: 0.25 },
        w_beam: { d: 8.0, bf: 4.0, tf: 0.375, tw: 0.25 },
        angles: { leg1: 4.0, leg2: 4.0, t: 0.25 },
        plate: { w: 12.0, h: 12.0 }
    };

    // --- DOM Elements ---
    const navButtons = document.querySelectorAll('.nav-btn');
    const shapeControls = document.getElementById('shapes-controls');
    const sketchControls = document.getElementById('sketch-controls');
    const cadView = document.getElementById('cad-view');
    const sketchView = document.getElementById('sketch-view');
    const svgContainer = document.getElementById('svg-container');
    const dynamicInputs = document.getElementById('dynamic-inputs');
    const shapeCategory = document.getElementById('shape-category');
    const dimText = document.getElementById('dim-text');
    const sketchCanvas = document.getElementById('sketch-canvas');
    const overlay = document.getElementById('processing-overlay');

    // --- Visual Debugging Logger ---
    function logVisual(msg, type = "info") {
        let debugContainer = document.getElementById('debug-log-overlay');
        if (!debugContainer) {
            debugContainer = document.createElement('div');
            debugContainer.id = 'debug-log-overlay';
            debugContainer.setAttribute('style', 'position: fixed; bottom: 80px; right: 24px; width: 320px; max-height: 220px; overflow-y: auto; background: rgba(10, 15, 20, 0.95); border: 1px solid var(--border-color); border-radius: 8px; padding: 12px; font-family: \"JetBrains Mono\", monospace; font-size: 10px; color: #fff; z-index: 99999; box-shadow: 0 10px 30px rgba(0,0,0,0.5); pointer-events: none; opacity: 0.9;');
            document.body.appendChild(debugContainer);
        }
        const color = type === "success" ? "#00ff88" : (type === "error" ? "#ff4444" : "#00d4ff");
        const logLine = document.createElement('div');
        logLine.style.marginBottom = "4px";
        logLine.style.borderBottom = "1px solid rgba(255,255,255,0.05)";
        logLine.style.paddingBottom = "4px";
        
        // Escape msg but allow HTML tags in our visual styling
        const safeMsg = msg.indexOf('<') !== -1 && msg.indexOf('>') !== -1 && (msg.indexOf('Mousedown on:') !== -1 || msg.indexOf('Click on:') !== -1)
            ? msg.replace(/</g, '&lt;').replace(/>/g, '&gt;')
            : msg;
            
        logLine.innerHTML = `<span style="color: ${color}">[${new Date().toLocaleTimeString()}]</span> ${safeMsg}`;
        debugContainer.appendChild(logLine);
        debugContainer.scrollTop = debugContainer.scrollHeight;
    }

    const safeGetFloat = (id, fallback = 0.0) => {
        const el = document.getElementById(id);
        return el ? (parseFloat(el.value) || fallback) : fallback;
    };

    const getSvgScale = (svg) => {
        const isReady = CadEngine.isLibReady();
        let scale = isReady ? 25.4 : 10.0;
        let actualWidthInches = 0;
        if (isReady && currentModel) {
            const extents = makerjs.measure.modelExtents(currentModel);
            if (extents) {
                actualWidthInches = extents.high[0] - extents.low[0];
            }
        }
        if (svg) {
            const viewBoxAttr = svg.getAttribute('viewBox');
            if (viewBoxAttr) {
                const vb = viewBoxAttr.split(/[\s,]+/).map(Number);
                if (vb.length === 4 && vb[2] > 0) {
                    if (actualWidthInches > 0) {
                        scale = vb[2] / actualWidthInches;
                    }
                }
            }
        }
        return scale;
    };

    const getModelExtents = () => {
        if (window.makerjs && currentModel) {
            return makerjs.measure.modelExtents(currentModel);
        }
        return null;
    };

    const cadToSvg = (x, y, scale, extents) => {
        if (!extents) return [x * scale, -y * scale];
        return [(x - extents.low[0]) * scale, (extents.high[1] - y) * scale];
    };

    const svgToCad = (x_svg, y_svg, scale, extents) => {
        if (!extents) return [x_svg / scale, -y_svg / scale];
        return [x_svg / scale + extents.low[0], extents.high[1] - y_svg / scale];
    };

    function findDraftMemberFromElement(el) {
        if (!el || el === svgContainer) return null;
        let current = el;
        while (current && current !== svgContainer && typeof current.getAttribute === 'function') {
            const id = current.getAttribute('id') || "";
            const cls = current.getAttribute('class') || "";
            const dataId = current.getAttribute('data-member-id') || "";
            
            // Try matching against our draftMembers IDs
            for (const m of draftMembers) {
                const sanitizedId = m.id.replace(/_/g, '-');
                if (id === m.id || id === sanitizedId ||
                    cls.split(' ').includes(m.id) || cls.split(' ').includes(sanitizedId) ||
                    dataId === m.id || dataId === sanitizedId) {
                    return m.id;
                }
                // Fallback: match by numbers if the ID contains timestamp patterns
                const mNumbers = m.id.match(/\d+/g);
                if (mNumbers && mNumbers.length >= 2) {
                    if ((id.indexOf(mNumbers[0]) !== -1 && id.indexOf(mNumbers[1]) !== -1) ||
                        (cls.indexOf(mNumbers[0]) !== -1 && cls.indexOf(mNumbers[1]) !== -1)) {
                        return m.id;
                    }
                }
            }
            
            // Substring fallback
            if (id.indexOf('member_') !== -1 || cls.indexOf('member_') !== -1 ||
                id.indexOf('member-') !== -1 || cls.indexOf('member-') !== -1) {
                let rawId = id || cls || "";
                let index = rawId.indexOf('member_');
                let isUnderscore = true;
                if (index === -1) {
                    index = rawId.indexOf('member-');
                    isUnderscore = false;
                }
                if (index !== -1) {
                    const rawPart = rawId.substring(index).split(' ')[0];
                    const matchedId = isUnderscore ? rawPart : rawPart.replace(/-/g, '_');
                    if (draftMembers.some(m => m.id === matchedId)) {
                        return matchedId;
                    }
                }
            }
            current = current.parentElement;
        }
        return null;
    }

    // --- Initialization ---
    const processor = new SketchProcessor(sketchCanvas);
    
    // Status Update & Async Load Listener
    const statusIndicator = document.querySelector('.status-indicator');
    if (!CadEngine.isLibReady()) {
        statusIndicator.innerHTML = '<span class="dot" style="background:#ffaa00"></span> Engine: Fallback Mode (Offline)';
        statusIndicator.title = "AISC Library (Maker.js) is unavailable. Using internal SVG renderer.";
        
        const loadWatcher = setInterval(() => {
            if (CadEngine.isLibReady()) {
                clearInterval(loadWatcher);
                statusIndicator.innerHTML = '<span class="dot pulse"></span> Engineering Engine Ready';
                statusIndicator.title = "";
                renderCurrentCAD();
            }
        }, 100);
        setTimeout(() => clearInterval(loadWatcher), 10000);
    } else {
        statusIndicator.innerHTML = '<span class="dot pulse"></span> Engineering Engine Ready';
        statusIndicator.title = "";
    }
    
    // Initial Render
    updateInputs();
    renderCurrentCAD();

    // --- Event Listeners ---

    // TAB Navigation
    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            navButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            currentMode = btn.dataset.mode;
            
            // Hide all control panels and view layers
            shapeControls.classList.add('hidden');
            sketchControls.classList.add('hidden');
            document.getElementById('draft-controls').classList.add('hidden');
            
            cadView.classList.add('hidden');
            sketchView.classList.add('hidden');
            
            const viewTitle = document.querySelector('.view-title');
            if (currentMode === 'shapes') {
                shapeControls.classList.remove('hidden');
                cadView.classList.remove('hidden');
                document.getElementById('toggle-interactive').classList.remove('hidden');
                if (viewTitle) viewTitle.textContent = "Dynamic Preview";
                renderCurrentCAD();
            } else if (currentMode === 'sketch') {
                sketchControls.classList.remove('hidden');
                sketchView.classList.remove('hidden');
                if (viewTitle) viewTitle.textContent = "Rough Sketchpad";
                processor.resize();
            } else if (currentMode === 'draft') {
                document.getElementById('draft-controls').classList.remove('hidden');
                cadView.classList.remove('hidden');
                document.getElementById('toggle-interactive').classList.add('hidden');
                if (viewTitle) viewTitle.textContent = "2D Drafting Canvas";
                renderDraftSpace();
            }
        });
    });

    // SHAPE Input Changes
    shapeCategory.addEventListener('change', updateInputs);
    
    dynamicInputs.addEventListener('input', renderCurrentCAD);
    dynamicInputs.addEventListener('change', renderCurrentCAD);

    // ACTION BUTTONS
    document.getElementById('generate-dxf').addEventListener('click', downloadDXF);
    document.getElementById('clear-canvas').addEventListener('click', () => processor.clear());
    document.getElementById('process-sketch').addEventListener('click', interpretSketch);

    // ZOOM BUTTONS & LOGIC
    
    function applyZoom() {
        const svg = svgContainer.querySelector('svg');
        if (svg) {
            svg.style.transition = isPanning ? 'none' : 'transform 0.15s ease-out';
            svg.style.width = '100%';
            svg.style.height = '100%';
            svg.style.maxWidth = '100%';
            svg.style.maxHeight = '100%';
            svg.style.transform = `translate(${currentPanX}px, ${currentPanY}px) scale(${currentZoom})`;
            svg.style.transformOrigin = 'center center';
        }
        const valEl = document.getElementById('zoom-value');
        if (valEl) {
            valEl.textContent = `${Math.round(currentZoom * 100)}%`;
        }
    }

    // --- AutoCAD Interactive Dimension Snap Extraction & Matrix Helpers ---
    function getModelSnapPoints(model) {
        const snaps = [];
        
        function addPoint(x, y, type) {
            if (isNaN(x) || isNaN(y)) return;
            const exists = snaps.some(p => Math.hypot(p.x - x, p.y - y) < 0.01);
            if (!exists) {
                snaps.push({ x, y, type });
            }
        }
        
        function walk(m, parentMatrix) {
            if (!m) return;
            
            const origin = m.origin || [0, 0];
            const angle = m.angle || 0;
            
            const rad = angle * Math.PI / 180;
            const cos = Math.cos(rad);
            const sin = Math.sin(rad);
            
            const localMatrix = [
                cos, -sin, origin[0],
                sin,  cos, origin[1],
                  0,    0,         1
            ];
            
            const currentMatrix = multiplyMatrices(parentMatrix, localMatrix);
            
            function transform(pt) {
                const x = pt[0];
                const y = pt[1];
                const tx = currentMatrix[0] * x + currentMatrix[1] * y + currentMatrix[2];
                const ty = currentMatrix[3] * x + currentMatrix[4] * y + currentMatrix[5];
                return [tx, ty];
            }
            
            if (m.paths) {
                for (const id in m.paths) {
                    const p = m.paths[id];
                    if (!p) continue;
                    
                    if (p.type === 'line' || p.type === 'Line') {
                        const p1 = transform(p.origin);
                        const p2 = transform(p.end);
                        addPoint(p1[0], p1[1], 'endpoint');
                        addPoint(p2[0], p2[1], 'endpoint');
                        addPoint((p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2, 'midpoint');
                    } else if (p.type === 'arc' || p.type === 'Arc') {
                        const center = transform(p.origin);
                        const r = p.radius;
                        const a1 = p.startAngle * Math.PI / 180;
                        const a2 = p.endAngle * Math.PI / 180;
                        
                        const localP1 = [p.origin[0] + r * Math.cos(a1), p.origin[1] + r * Math.sin(a1)];
                        const localP2 = [p.origin[0] + r * Math.cos(a2), p.origin[1] + r * Math.sin(a2)];
                        
                        let diff = a2 - a1;
                        if (diff < 0) diff += 2 * Math.PI;
                        const midA = a1 + diff / 2;
                        const localPm = [p.origin[0] + r * Math.cos(midA), p.origin[1] + r * Math.sin(midA)];
                        
                        const p1 = transform(localP1);
                        const p2 = transform(localP2);
                        const pm = transform(localPm);
                        
                        addPoint(p1[0], p1[1], 'endpoint');
                        addPoint(p2[0], p2[1], 'endpoint');
                        addPoint(pm[0], pm[1], 'midpoint');
                        addPoint(center[0], center[1], 'endpoint');
                    } else if (p.type === 'circle' || p.type === 'Circle') {
                        const center = transform(p.origin);
                        const r = p.radius;
                        addPoint(center[0], center[1], 'endpoint');
                        
                        const localP1 = [p.origin[0] + r, p.origin[1]];
                        const localP2 = [p.origin[0] - r, p.origin[1]];
                        const localP3 = [p.origin[0], p.origin[1] + r];
                        const localP4 = [p.origin[0], p.origin[1] - r];
                        
                        addPoint(transform(localP1)[0], transform(localP1)[1], 'endpoint');
                        addPoint(transform(localP2)[0], transform(localP2)[1], 'endpoint');
                        addPoint(transform(localP3)[0], transform(localP3)[1], 'endpoint');
                        addPoint(transform(localP4)[0], transform(localP4)[1], 'endpoint');
                    }
                }
            }
            
            if (m.models) {
                for (const id in m.models) {
                    walk(m.models[id], currentMatrix);
                }
            }
        }
        
        function multiplyMatrices(a, b) {
            return [
                a[0]*b[0] + a[1]*b[3], a[0]*b[1] + a[1]*b[4], a[0]*b[2] + a[1]*b[5] + a[2],
                a[3]*b[0] + a[4]*b[3], a[3]*b[1] + a[4]*b[4], a[3]*b[2] + a[4]*b[5] + a[5],
                0, 0, 1
            ];
        }
        
        const identity = [1, 0, 0,  0, 1, 0,  0, 0, 1];
        walk(model, identity);
        return snaps;
    }

    function renderSnapIndicator(svg, snapPoint, scale) {
        let gSnap = svg.querySelector('.cad-snap-overlay');
        if (!gSnap) {
            gSnap = svg.ownerDocument.createElementNS("http://www.w3.org/2000/svg", "g");
            gSnap.setAttribute("class", "cad-snap-overlay");
            svg.appendChild(gSnap);
        }
        gSnap.innerHTML = "";
        
        if (!snapPoint) return;
        
        const extents = getModelExtents();
        const [sx, sy] = cadToSvg(snapPoint.x, snapPoint.y, scale, extents);
        
        const svgRect = svg.getBoundingClientRect();
        const viewBoxAttr = svg.getAttribute('viewBox');
        const vb = viewBoxAttr ? viewBoxAttr.split(/[\s,]+/).map(Number) : [0,0,2000,1500];
        const vbWidth = vb[2] || 2000;
        const screenToSvgScale = svgRect.width > 0 ? (vbWidth / svgRect.width) : 1;
        const size = 10 * screenToSvgScale;
        
        if (snapPoint.type === 'endpoint') {
            const rect = svg.ownerDocument.createElementNS("http://www.w3.org/2000/svg", "rect");
            rect.setAttribute("x", sx - size/2);
            rect.setAttribute("y", sy - size/2);
            rect.setAttribute("width", size);
            rect.setAttribute("height", size);
            rect.setAttribute("fill", "none");
            rect.setAttribute("stroke", "#32cd32");
            rect.setAttribute("stroke-width", 2.0 * screenToSvgScale);
            gSnap.appendChild(rect);
        } else if (snapPoint.type === 'midpoint') {
            const polygon = svg.ownerDocument.createElementNS("http://www.w3.org/2000/svg", "polygon");
            const half = size / 2;
            const points = `${sx},${sy - half} ${sx - half},${sy + half} ${sx + half},${sy + half}`;
            polygon.setAttribute("points", points);
            polygon.setAttribute("fill", "none");
            polygon.setAttribute("stroke", "#32cd32");
            polygon.setAttribute("stroke-width", 2.0 * screenToSvgScale);
            gSnap.appendChild(polygon);
        }
    }

    function renderTempDimensionLine(svg, startPoint, currentMouseX, currentMouseY, scale) {
        let gTemp = svg.querySelector('.cad-temp-dim-overlay');
        if (!gTemp) {
            gTemp = svg.ownerDocument.createElementNS("http://www.w3.org/2000/svg", "g");
            gTemp.setAttribute("class", "cad-temp-dim-overlay");
            svg.appendChild(gTemp);
        }
        gTemp.innerHTML = "";
        
        if (!startPoint) return;
        
        const extents = getModelExtents();
        const [x1, y1] = cadToSvg(startPoint.x, startPoint.y, scale, extents);
        const [x2, y2] = cadToSvg(currentMouseX, currentMouseY, scale, extents);
        
        const line = svg.ownerDocument.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", x1);
        line.setAttribute("y1", y1);
        line.setAttribute("x2", x2);
        line.setAttribute("y2", y2);
        line.setAttribute("stroke", "#ffff00");
        line.setAttribute("stroke-width", "1.5");
        line.setAttribute("stroke-dasharray", "5,5");
        gTemp.appendChild(line);
        
        const distInches = Math.hypot(currentMouseX - startPoint.x, currentMouseY - startPoint.y);
        
        const formatFraction = (val) => {
            if (typeof val !== 'number' || isNaN(val)) return '0"';
            const totalSixteenths = Math.round(val * 16);
            const totalInches = Math.floor(totalSixteenths / 16);
            const sixteenths = totalSixteenths % 16;
            const feet = Math.floor(totalInches / 12);
            const inches = totalInches % 12;
            
            let fractionStr = '';
            if (sixteenths > 0) {
                let num = sixteenths, den = 16;
                while (num % 2 === 0) { num /= 2; den /= 2; }
                fractionStr = ` ${num}/${den}`;
            }
            
            if (feet > 0) {
                return `${feet}'-${inches}${fractionStr}"`;
            } else {
                if (totalInches === 0 && sixteenths > 0) {
                    return `${fractionStr.trim()}"`;
                }
                return `${inches}${fractionStr}"`;
            }
        };
        
        const mx = (x1 + x2) / 2;
        const my = (y1 + y2) / 2 - 10;
        
        const text = svg.ownerDocument.createElementNS("http://www.w3.org/2000/svg", "text");
        text.setAttribute("x", mx);
        text.setAttribute("y", my);
        text.setAttribute("fill", "#ffff00");
        text.setAttribute("font-family", "'JetBrains Mono', monospace, sans-serif");
        text.setAttribute("font-size", "12px");
        text.setAttribute("font-weight", "bold");
        text.setAttribute("text-anchor", "middle");
        text.textContent = formatFraction(distInches);
        gTemp.appendChild(text);
    }

    document.getElementById('zoom-in').addEventListener('click', () => {
        currentZoom = Math.min(50.0, currentZoom * 1.2);
        applyZoom();
    });
    document.getElementById('zoom-out').addEventListener('click', () => {
        currentZoom = Math.max(0.05, currentZoom / 1.2);
        applyZoom();
    });
    document.getElementById('zoom-reset').addEventListener('click', () => {
        currentZoom = 1.0;
        currentPanX = 0;
        currentPanY = 0;
        applyZoom();
    });

    // AutoCAD-style Scroll Wheel Zoom (Exponential Scaling)
    svgContainer.addEventListener('wheel', (e) => {
        e.preventDefault();
        const zoomRatio = 1.12;
        if (e.deltaY < 0) {
            currentZoom = Math.min(50.0, currentZoom * zoomRatio);
        } else {
            currentZoom = Math.max(0.05, currentZoom / zoomRatio);
        }
        applyZoom();
    }, { passive: false });

    // PDF Preview Mode Toggle Button Listener
    const togglePdfPreviewBtn = document.getElementById('toggle-pdf-preview');
    const pdfIframe = document.getElementById('pdf-preview-iframe');
    if (togglePdfPreviewBtn && pdfIframe) {
        togglePdfPreviewBtn.addEventListener('click', () => {
            pdfPreviewModeActive = !pdfPreviewModeActive;
            if (pdfPreviewModeActive) {
                // Hide SVG container, show iframe
                svgContainer.classList.add('hidden');
                pdfIframe.classList.remove('hidden');
                togglePdfPreviewBtn.classList.add('active');
                togglePdfPreviewBtn.querySelector('span').textContent = "PDF Preview On";
                togglePdfPreviewBtn.style.backgroundColor = 'rgba(255, 159, 67, 0.2)';
                togglePdfPreviewBtn.style.borderColor = '#ff9f43';
                updatePdfPreview();
            } else {
                // Show SVG container, hide iframe
                svgContainer.classList.remove('hidden');
                pdfIframe.classList.add('hidden');
                togglePdfPreviewBtn.classList.remove('active');
                togglePdfPreviewBtn.querySelector('span').textContent = "PDF Preview Off";
                togglePdfPreviewBtn.style.backgroundColor = 'transparent';
                togglePdfPreviewBtn.style.borderColor = 'var(--border-color)';
                // Revoke active preview URL to clean up
                if (activePdfPreviewUrl) {
                    URL.revokeObjectURL(activePdfPreviewUrl);
                    activePdfPreviewUrl = null;
                }
                pdfIframe.src = '';
                renderCurrentCAD();
            }
        });
    }

    // Panning Mode Toggle Button Listener
    const togglePanModeBtn = document.getElementById('toggle-pan-mode');
    if (togglePanModeBtn) {
        togglePanModeBtn.addEventListener('click', () => {
            panModeActive = !panModeActive;
            if (panModeActive) {
                // Coordinate with Tweak Mode
                if (tweakModeActive) {
                    const tweakBtn = document.getElementById('toggle-interactive');
                    if (tweakBtn) tweakBtn.click();
                }
                togglePanModeBtn.classList.add('active');
                togglePanModeBtn.querySelector('span').textContent = "Pan View On";
                togglePanModeBtn.style.backgroundColor = 'rgba(255, 170, 0, 0.2)';
                togglePanModeBtn.style.borderColor = 'var(--accent-secondary)';
                svgContainer.style.cursor = 'grab';
            } else {
                togglePanModeBtn.classList.remove('active');
                togglePanModeBtn.querySelector('span').textContent = "Pan View Off";
                togglePanModeBtn.style.backgroundColor = 'transparent';
                togglePanModeBtn.style.borderColor = 'var(--border-color)';
                svgContainer.style.cursor = '';
            }
        });
    }

    // Interactive Sidebar User Guide Toggle
    const toggleGuideBtn = document.getElementById('btn-toggle-guide');
    const guideContent = document.getElementById('draft-guide-content');
    const guideChevron = document.getElementById('guide-chevron');
    if (toggleGuideBtn && guideContent) {
        toggleGuideBtn.addEventListener('click', () => {
            const isHidden = guideContent.classList.toggle('hidden');
            if (guideChevron) {
                guideChevron.style.transform = isHidden ? 'rotate(0deg)' : 'rotate(180deg)';
            }
        });
    }

    // Block default middle-click autoscroll behavior
    svgContainer.addEventListener('auxclick', (e) => {
        if (e.button === 1) {
            e.preventDefault();
        }
    });

    // AutoCAD-style Keyboard Keybinds (Delete / Backspace to remove selected member)
    document.addEventListener('keydown', (e) => {
        if (currentMode === 'draft' && selectedMemberId) {
            // Ignore keypress if user is typing inside input boxes or textareas
            const tag = e.target.tagName;
            if (tag !== 'INPUT' && tag !== 'TEXTAREA') {
                if (e.key === 'Delete' || e.key === 'Backspace') {
                    e.preventDefault();
                    const deleteBtn = document.getElementById('draft-btn-delete');
                    if (deleteBtn) {
                        deleteBtn.click();
                        showToast("Member Deleted");
                    }
                }
            }
        }
    });

    // --- Core Functions ---

    function updateInputs() {
        const cat = shapeCategory.value;

        // Define helper functions at the top of updateInputs so they are available to all categories (e.g. rail_catalog, fence, rails_gates)
        const setupDynamicProfile = (typeId, sizeId, customGroupId, customInputId, defaultSize) => {
            const typeSelect = document.getElementById('inp-' + typeId);
            const sizeSelect = document.getElementById('inp-' + sizeId);
            const customGroup = document.getElementById(customGroupId);
            const customInput = document.getElementById('inp-' + customInputId);
            
            if (!typeSelect || !sizeSelect) return;
            
            const updateSizes = () => {
                const selectedType = typeSelect.value;
                
                if (selectedType === 'none') {
                    sizeSelect.innerHTML = `<option value="NONE">None</option>`;
                    sizeSelect.value = 'NONE';
                    if (customGroup) customGroup.classList.add('hidden');
                    if (sizeSelect.parentElement) {
                        sizeSelect.parentElement.classList.add('hidden');
                    }
                    return;
                }
                
                if (sizeSelect.parentElement) {
                    sizeSelect.parentElement.classList.remove('hidden');
                }
                
                const shapes = SHAPES_DB[selectedType] || [];
                sizeSelect.innerHTML = shapes.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
                
                // Set a default if it exists in the list
                if (shapes.some(s => s.id === defaultSize)) {
                    sizeSelect.value = defaultSize;
                } else if (shapes.length > 0) {
                    sizeSelect.value = shapes[0].id;
                }
                
                toggleCustom();
            };
            
            const toggleCustom = () => {
                if (sizeSelect.value === 'CUSTOM') {
                    if (customGroup) customGroup.classList.remove('hidden');
                } else {
                    if (customGroup) customGroup.classList.add('hidden');
                }
            };
            
            typeSelect.addEventListener('change', () => {
                updateSizes();
                renderCurrentCAD();
            });
            sizeSelect.addEventListener('change', () => {
                toggleCustom();
                renderCurrentCAD();
            });
            
            // Run initial population
            updateSizes();
        };

        const setupBasePlateProfile = () => {
            const includeSelect = document.getElementById('inp-includeBasePlates');
            const bpDetailsGroup = document.getElementById('grp-basePlateDetails');
            const bpTGroup = document.getElementById('grp-basePlateT');
            const bpSizeSelect = document.getElementById('inp-basePlateSize');
            
            if (!includeSelect || !bpSizeSelect) return;
            
            const updateVisibility = () => {
                const active = includeSelect.value === 'yes';
                if (bpDetailsGroup) {
                    if (active) {
                        bpDetailsGroup.classList.remove('hidden');
                        toggleCustom();
                    } else {
                        bpDetailsGroup.classList.add('hidden');
                    }
                }
            };
            
            const toggleCustom = () => {
                if (bpTGroup) {
                    if (bpSizeSelect.value === 'CUSTOM') {
                        bpTGroup.classList.remove('hidden');
                    } else {
                        bpTGroup.classList.add('hidden');
                    }
                }
            };
            
            // Populate size select with standard plates
            bpSizeSelect.innerHTML = SHAPES_DB['plate'].map(s => `<option value="${s.id}">${s.name}</option>`).join('');
            bpSizeSelect.value = 'PL1/2';
            
            includeSelect.addEventListener('change', () => {
                updateVisibility();
                renderCurrentCAD();
            });
            bpSizeSelect.addEventListener('change', () => {
                toggleCustom();
                renderCurrentCAD();
            });
            
            // Also trigger rendering when W/L/T/Hole dimensions change
            ['basePlateW', 'basePlateL', 'basePlateT', 'basePlateHoleD', 'basePlateHoleOffsetX', 'basePlateHoleOffsetY'].forEach(id => {
                const inp = document.getElementById('inp-' + id);
                if (inp) {
                    inp.addEventListener('input', renderCurrentCAD);
                    inp.addEventListener('change', renderCurrentCAD);
                }
            });
            
            updateVisibility();
        };

        const setupMidRailGapToggle = () => {
            const midType = document.getElementById('inp-midRailType');
            const midGapGroup = document.getElementById('grp-midRailGap');
            
            if (!midType || !midGapGroup) return;
            
            const updateGapVisibility = () => {
                if (midType.value === 'none') {
                    midGapGroup.classList.add('hidden');
                } else {
                    midGapGroup.classList.remove('hidden');
                }
            };
            
            midType.addEventListener('change', () => {
                updateGapVisibility();
                renderCurrentCAD();
            });
            
            // Trigger initial check
            updateGapVisibility();
        };

        const setupPostSpacingToggle = () => {
            const postHInput = document.getElementById('inp-postHeight');
            const postSInput = document.getElementById('inp-postSpacing');
            
            if (!postHInput || !postSInput) return;
            
            const updateSpacingVisibility = () => {
                const postVal = parseFloat(postHInput.value) || 0;
                const spacingGroup = postSInput.closest('.input-group');
                
                if (postVal === 0) {
                    postSInput.value = 0;
                    if (spacingGroup) {
                        spacingGroup.classList.add('hidden');
                    }
                } else {
                    if (spacingGroup) {
                        spacingGroup.classList.remove('hidden');
                    }
                }
            };
            
            postHInput.addEventListener('input', () => {
                updateSpacingVisibility();
                renderCurrentCAD();
            });
            
            postHInput.addEventListener('change', () => {
                updateSpacingVisibility();
                renderCurrentCAD();
            });
            
            // Run initial check on render
            updateSpacingVisibility();
        };

        
        if (cat === 'rail_catalog') {
            const runnerProfileOptions = [
                { val: 'none', lbl: 'None (Disabled)' },
                { val: 'plate', lbl: 'Plate / Flat Bar' },
                { val: 'hss_rect', lbl: 'HSS Rectangular' },
                { val: 'hss_circ', lbl: 'HSS Circular (Pipe)' },
                { val: 'w_beam', lbl: 'W-Beam' },
                { val: 'angles', lbl: 'Angle (L-Shape)' }
            ];
            const profileOptions = [
                { val: 'none', lbl: 'None (Disabled)' },
                { val: 'plate', lbl: 'Plate / Flat Bar' },
                { val: 'hss_rect', lbl: 'HSS Rectangular' },
                { val: 'hss_circ', lbl: 'HSS Circular (Pipe)' },
                { val: 'w_beam', lbl: 'W-Beam' },
                { val: 'angles', lbl: 'Angle (L-Shape)' }
            ];

            // Build Balcony Wizard UI
            const activeSet = balconyWizardState.tempSet || balconyWizardState.sets[balconyWizardState.activeSetIdx];
            const baseDwg = activeSet.drawingBase;
            const badgeText = balconyWizardState.tempSet ? 
                `Balcony ${getSetLetter(balconyWizardState.activeSetIdx)} [DRAFT]` : 
                `Balcony ${getSetLetter(balconyWizardState.activeSetIdx)} (Total: ${balconyWizardState.sets.length})`;

            let wizardHtml = `
                <div class="balcony-wizard-card" style="background: rgba(0, 212, 255, 0.04); border: 1px solid rgba(0, 212, 255, 0.25); border-radius: 8px; padding: 16px; margin-bottom: 20px; box-shadow: 0 4px 20px rgba(0,0,0,0.25); grid-column: span 2;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                        <h4 style="margin: 0; color: #00d4ff; font-family: 'Outfit', sans-serif; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; display: flex; align-items: center;">
                            <i data-lucide="layers" style="width: 16px; height: 16px; margin-right: 6px;"></i> Balcony Rail Configurator
                        </h4>
                        <span style="font-size: 11px; background: rgba(0,212,255,0.15); color: #00d4ff; padding: 2px 8px; border-radius: 12px; font-weight: bold;">
                            ${badgeText}
                        </span>
                    </div>
            `;

            // Active Set Select & Add buttons
            wizardHtml += `
                <div style="display: flex; gap: 8px; margin-bottom: 12px;">
                    <select id="wiz-active-set" style="flex: 1; padding: 6px 10px; background: #0f131a; border: 1px solid var(--border-color); border-radius: 6px; color: #fff; font-size: 13px;">
                        ${balconyWizardState.sets.map((set, idx) => `
                            <option value="${idx}" ${!balconyWizardState.tempSet && idx === balconyWizardState.activeSetIdx ? 'selected' : ''}>Balcony ${getSetLetter(idx)} (Base: ${set.drawingBase})</option>
                        `).join('')}
                        ${balconyWizardState.tempSet ? `
                            <option value="draft" selected>Balcony ${getSetLetter(balconyWizardState.activeSetIdx)} [DRAFT]</option>
                        ` : ''}
                    </select>
                    ${!balconyWizardState.tempSet && balconyWizardState.sets.length > 1 ? `
                        <button id="wiz-delete-set-btn" class="btn danger" style="padding: 6px 10px; font-size: 12px; background: rgba(255, 68, 68, 0.15); border: 1px solid rgba(255, 68, 68, 0.3); color: #ff6b6b; border-radius: 6px; font-weight: bold; cursor: pointer;" title="Delete Current Balcony">
                            Delete
                        </button>
                    ` : ''}
                    <button id="wiz-add-set-btn" class="btn primary" style="padding: 4px 10px; font-size: 14px; background: var(--accent-primary); color: #000; border-radius: 6px; border: none; font-weight: bold; cursor: pointer;" title="Start New Balcony (Draft)">
                        +
                    </button>
                </div>
            `;

            // Base Drawing Number Input
            wizardHtml += `
                <div style="display: flex; gap: 12px; margin-bottom: 12px;">
                    <div class="input-group" style="flex: 2;">
                        <label style="display: block; font-size: 11px; text-transform: uppercase; color: var(--text-dim); margin-bottom: 4px;">Base Drawing Number</label>
                        <input type="text" id="wiz-drawing-base" value="${baseDwg}" style="width: 100%; padding: 6px 10px; background: #0f131a; border: 1px solid var(--border-color); border-radius: 6px; color: #fff; font-size: 13px;">
                    </div>
                    <div class="input-group" style="flex: 1;">
                        <label style="display: block; font-size: 11px; text-transform: uppercase; color: var(--text-dim); margin-bottom: 4px;">Quantity</label>
                        <input type="number" id="wiz-set-qty" value="${activeSet.quantity || 1}" min="1" step="1" style="width: 100%; padding: 6px 10px; background: #0f131a; border: 1px solid var(--border-color); border-radius: 6px; color: #fff; font-size: 13px;">
                    </div>
                </div>
            `;

            const rightReturnDwg = activeSet.leftReturn ? `${baseDwg}.3` : `${baseDwg}.2`;
            const leftReturnDwg = `${baseDwg}.2`;

            // Panel view tabs (Main, Left Return, Right Return)
            wizardHtml += `
                <div style="display: flex; border-bottom: 1px solid var(--border-color); margin-bottom: 12px; gap: 4px;">
                    <button class="wiz-tab-btn ${balconyWizardState.activePanelType === 'main' ? 'active' : ''} ${!activeSet.main ? 'disabled-tab' : ''}" data-panel="main" style="flex: 1; padding: 6px; font-size: 11px; font-weight: bold; background: transparent; border: none; border-bottom: 2px solid ${balconyWizardState.activePanelType === 'main' ? '#00d4ff' : 'transparent'}; color: ${balconyWizardState.activePanelType === 'main' ? '#00d4ff' : 'var(--text-dim)'}; cursor: pointer; text-transform: uppercase; ${!activeSet.main ? 'opacity: 0.4;' : ''}">
                        Main (${activeSet.main ? `${baseDwg}.0` : 'None'})
                    </button>
                    <button class="wiz-tab-btn ${balconyWizardState.activePanelType === 'leftReturn' ? 'active' : ''} ${!activeSet.leftReturn ? 'disabled-tab' : ''}" data-panel="leftReturn" style="flex: 1; padding: 6px; font-size: 11px; font-weight: bold; background: transparent; border: none; border-bottom: 2px solid ${balconyWizardState.activePanelType === 'leftReturn' ? '#00d4ff' : 'transparent'}; color: ${balconyWizardState.activePanelType === 'leftReturn' ? '#00d4ff' : 'var(--text-dim)'}; cursor: pointer; text-transform: uppercase; ${!activeSet.leftReturn ? 'opacity: 0.4;' : ''}">
                        Left return (${activeSet.leftReturn ? leftReturnDwg : 'None'})
                    </button>
                    <button class="wiz-tab-btn ${balconyWizardState.activePanelType === 'rightReturn' ? 'active' : ''} ${!activeSet.rightReturn ? 'disabled-tab' : ''}" data-panel="rightReturn" style="flex: 1; padding: 6px; font-size: 11px; font-weight: bold; background: transparent; border: none; border-bottom: 2px solid ${balconyWizardState.activePanelType === 'rightReturn' ? '#00d4ff' : 'transparent'}; color: ${balconyWizardState.activePanelType === 'rightReturn' ? '#00d4ff' : 'var(--text-dim)'}; cursor: pointer; text-transform: uppercase; ${!activeSet.rightReturn ? 'opacity: 0.4;' : ''}">
                        Right return (${activeSet.rightReturn ? rightReturnDwg : 'None'})
                    </button>
                </div>
            `;

            // Wizard Guide / Step Actions
            wizardHtml += `<div class="wiz-guide-box" style="background: rgba(0,0,0,0.2); border-radius: 6px; padding: 12px; margin-bottom: 12px; font-size: 12px; line-height: 1.4;">`;
            
            if (balconyWizardState.tempSet) {
                const draftLetter = getSetLetter(balconyWizardState.activeSetIdx);
                wizardHtml += `
                    <div style="background: rgba(255, 170, 0, 0.1); border: 1px solid rgba(255, 170, 0, 0.3); padding: 8px 10px; border-radius: 6px; margin-bottom: 10px; font-size: 11px; color: #ffaa00; font-weight: bold; display: flex; align-items: center; justify-content: space-between;">
                        <span>DRAFT BALCONY ${draftLetter}</span>
                        <div style="display: flex; gap: 4px;">
                            <button id="wiz-save-draft-btn" class="btn success" style="padding: 2px 6px; font-size: 10px; background: #00ff88; color: #000; border: none; border-radius: 4px; font-weight: bold; cursor: pointer;">SAVE</button>
                            <button id="wiz-cancel-draft-btn" class="btn danger" style="padding: 2px 6px; font-size: 10px; background: #ff4d4d; color: #fff; border: none; border-radius: 4px; font-weight: bold; cursor: pointer;">DISCARD</button>
                        </div>
                    </div>
                `;
            }

            if (balconyWizardState.step === 'main') {
                wizardHtml += `
                    <div style="font-weight: bold; margin-bottom: 4px; color: #00d4ff;">Step 1: Main Panel</div>
                    <div style="color: var(--text-dim); margin-bottom: 8px;">Configure the Main Balcony Railing (${baseDwg}.0) below, then click save.</div>
                    <button id="wiz-save-main-btn" class="btn success" style="width: 100%; padding: 8px; font-size: 12px; font-weight: bold; background: #00ff88; color: #000; border-radius: 6px; border: none; cursor: pointer;">
                        Save Main Panel & Continue
                    </button>
                `;
            } else if (balconyWizardState.step === 'ask_leftReturn') {
                wizardHtml += `
                    <div style="font-weight: bold; margin-bottom: 4px; color: #00ff88;">Add Left Return?</div>
                    <div style="color: var(--text-dim); margin-bottom: 8px;">Would you like to add a Left Return for Balcony ${getSetLetter(balconyWizardState.activeSetIdx)}?</div>
                    <div style="display: flex; gap: 8px;">
                        <button id="wiz-add-r1-btn" class="btn primary" style="flex: 1; padding: 8px; font-weight: bold; background: #00d4ff; color: #000; border: none; border-radius: 6px; cursor: pointer;">
                            Yes, Add Left Return
                        </button>
                        <button id="wiz-skip-r1-btn" class="btn secondary" style="flex: 1; padding: 8px; font-weight: bold; background: transparent; border: 1px solid var(--border-color); color: #fff; border-radius: 6px; cursor: pointer;">
                            No Left Return
                        </button>
                    </div>
                `;
            } else if (balconyWizardState.step === 'edit_leftReturn') {
                wizardHtml += `
                    <div style="font-weight: bold; margin-bottom: 4px; color: #00d4ff;">Step 2: Edit Left Return</div>
                    <div style="color: var(--text-dim); margin-bottom: 8px;">Configure the Left Return (${baseDwg}.2) below.</div>
                    <div style="display: flex; flex-direction: column; gap: 8px;">
                        <button id="wiz-save-r1-btn" class="btn success" style="width: 100%; padding: 8px; font-size: 12px; font-weight: bold; background: #00ff88; color: #000; border-radius: 6px; border: none; cursor: pointer;">
                            Save Left Return & Continue
                        </button>
                        <button id="wiz-remove-r1-btn" class="btn secondary" style="width: 100%; padding: 6px; font-size: 11px; background: rgba(255, 68, 68, 0.1); border: 1px solid rgba(255, 68, 68, 0.3); color: #ff6b6b; border-radius: 6px; cursor: pointer;">
                            Remove Left Return
                        </button>
                    </div>
                `;
            } else if (balconyWizardState.step === 'ask_rightReturn') {
                wizardHtml += `
                    <div style="font-weight: bold; margin-bottom: 4px; color: #00ff88;">Add Right Return?</div>
                    <div style="color: var(--text-dim); margin-bottom: 8px;">Would you like to add a Right Return for Balcony ${getSetLetter(balconyWizardState.activeSetIdx)}?</div>
                    <div style="display: flex; gap: 8px;">
                        <button id="wiz-add-r2-btn" class="btn primary" style="flex: 1; padding: 8px; font-weight: bold; background: #00d4ff; color: #000; border: none; border-radius: 6px; cursor: pointer;">
                            Yes, Add Right Return
                        </button>
                        <button id="wiz-skip-r2-btn" class="btn secondary" style="flex: 1; padding: 8px; font-weight: bold; background: transparent; border: 1px solid var(--border-color); color: #fff; border-radius: 6px; cursor: pointer;">
                            No Right Return
                        </button>
                    </div>
                `;
            } else if (balconyWizardState.step === 'edit_rightReturn') {
                wizardHtml += `
                    <div style="font-weight: bold; margin-bottom: 4px; color: #00d4ff;">Step 3: Edit Right Return</div>
                    <div style="color: var(--text-dim); margin-bottom: 8px;">Configure the Right Return below.</div>
                    <div style="display: flex; flex-direction: column; gap: 8px;">
                        <button id="wiz-save-r2-btn" class="btn success" style="width: 100%; padding: 8px; font-size: 12px; font-weight: bold; background: #00ff88; color: #000; border-radius: 6px; border: none; cursor: pointer;">
                            Save Right Return & Finish
                        </button>
                        <button id="wiz-remove-r2-btn" class="btn secondary" style="width: 100%; padding: 6px; font-size: 11px; background: rgba(255, 68, 68, 0.1); border: 1px solid rgba(255, 68, 68, 0.3); color: #ff6b6b; border-radius: 6px; cursor: pointer;">
                            Remove Right Return
                        </button>
                    </div>
                `;
            } else if (balconyWizardState.step === 'done') {
                const draftSuffix = balconyWizardState.tempSet ? ' [DRAFT]' : '';
                wizardHtml += `
                    <div style="font-weight: bold; margin-bottom: 4px; color: #00ff88; text-transform: uppercase;">Balcony ${getSetLetter(balconyWizardState.activeSetIdx)}${draftSuffix} Complete!</div>
                    <div style="color: var(--text-dim); margin-bottom: 8px;">
                        ${balconyWizardState.tempSet ? 'Click SAVE at the top to save this balcony to your project.' : 'Click + to configure or check the next balcony.'}
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 8px;">
                        ${!balconyWizardState.tempSet ? `
                            <button id="wiz-start-draft-btn" class="btn primary" style="width: 100%; padding: 8px; font-size: 12px; font-weight: bold; background: #00d4ff; color: #000; border-radius: 6px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;">
                                <span style="font-size: 16px; font-weight: bold; line-height: 1;">+</span> NEW BALCONY
                            </button>
                        ` : ''}
                        ${balconyWizardState.activePanelType === 'leftReturn' ? `
                            <button id="wiz-remove-r1-btn" class="btn secondary" style="width: 100%; padding: 6px; font-size: 11px; background: rgba(255, 68, 68, 0.1); border: 1px solid rgba(255, 68, 68, 0.3); color: #ff6b6b; border-radius: 6px; cursor: pointer;">
                                Remove Left Return
                            </button>
                        ` : ''}
                        ${balconyWizardState.activePanelType === 'rightReturn' ? `
                            <button id="wiz-remove-r2-btn" class="btn secondary" style="width: 100%; padding: 6px; font-size: 11px; background: rgba(255, 68, 68, 0.1); border: 1px solid rgba(255, 68, 68, 0.3); color: #ff6b6b; border-radius: 6px; cursor: pointer;">
                                Remove Right Return
                            </button>
                        ` : ''}
                    </div>
                `;
            }
            wizardHtml += `</div></div>`;

            let html = '<div class="inputs-grid">' + wizardHtml;
            
            const activePanel = balconyWizardState.activePanelType;
            const panelObj = activePanel === 'main' ? activeSet.main : (activePanel === 'leftReturn' ? activeSet.leftReturn : activeSet.rightReturn);

            if (!panelObj) {
                const panelLabel = activePanel === 'main' ? 'Main Panel' : (activePanel === 'leftReturn' ? 'Left Return' : 'Right Return');
                const addBtnId = activePanel === 'main' ? 'wiz-warning-add-main-btn' : (activePanel === 'leftReturn' ? 'wiz-warning-add-left-btn' : 'wiz-warning-add-right-btn');
                html += `
                    <div style="grid-column: span 2; background: rgba(255, 170, 0, 0.05); border: 1px dashed rgba(255, 170, 0, 0.3); border-radius: 8px; padding: 24px; text-align: center; margin-top: 10px;">
                        <i data-lucide="alert-triangle" style="width: 32px; height: 32px; color: #ffaa00; margin: 0 auto 12px; display: block;"></i>
                        <h4 style="margin: 0 0 8px; color: #ffaa00; font-family: 'Outfit', sans-serif;">${panelLabel} is not added/active</h4>
                        <p style="margin: 0 0 16px; font-size: 13px; color: var(--text-dim);">This panel is currently deleted/not active. To design or edit it, add it to this balcony.</p>
                        <button id="${addBtnId}" class="btn success" style="padding: 8px 16px; font-size: 13px; font-weight: bold; background: #00ff88; color: #000; border-radius: 6px; border: none; cursor: pointer;">
                            Add ${panelLabel}
                        </button>
                    </div>
                `;
            } else {
                // Style Selection
                html += generateSelectInput('Rail Style', 'railStyle', [
                    { val: 'classical', lbl: 'Classical Style (Preset)' },
                    { val: 'executive', lbl: 'Executive Style (Preset)' },
                    { val: 'urban_balcony', lbl: 'Urban Balcony Rail (Preset)' },
                    { val: 'villa_balcony', lbl: 'Villa Balcony Rail (Preset)' },
                    { val: 'classic_custom', lbl: 'Classic Custom' },
                    { val: 'executive_custom', lbl: 'Executive Custom' },
                    { val: 'urban_custom', lbl: 'Urban Balcony Rail Custom' },
                    { val: 'villa_custom', lbl: 'Villa Balcony Rail Custom' }
                ], 'classical');

                // Length
                html += generateNumInput('Total Length (in)', 'length', 120);

                // Corner / Mid Posts Options
                html += generateSelectInput('Left Corner Post', 'leftPost', [
                    { val: 'yes', lbl: 'Yes' },
                    { val: 'none', lbl: 'None' }
                ], 'yes');
                
                html += generateSelectInput('Right Corner Post', 'rightPost', [
                    { val: 'yes', lbl: 'Yes' },
                    { val: 'none', lbl: 'None' }
                ], 'yes');

                html += generateSelectInput('Mid Posts', 'midPosts', [
                    { val: 'default', lbl: 'Default' },
                    { val: 'custom_standard', lbl: 'Custom standard' },
                    { val: 'custom', lbl: 'Custom' },
                    { val: 'none', lbl: 'None' }
                ], 'default');

                // Mid Post Count
                html += `<div id="grp-rail-midPostCount" class="input-group hidden">
                            <label>Number of Mid Posts</label>
                            <input type="number" id="inp-midPostCount" value="1" step="1" min="1">
                         </div>`;

                // Spacings wrapper (if custom)
                if (panelObj.midPosts === 'custom') {
                    const count = parseInt(panelObj.midPostCount) || 0;
                    html += `<div id="grp-rail-midPostSpacings" style="grid-column: span 2; display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 10px; padding: 10px; border: 1px dashed var(--border-color); border-radius: 6px; background: rgba(255,255,255,0.01);">`;
                    for (let i = 1; i <= count; i++) {
                        let labelText = "";
                        if (i === 1) {
                            labelText = `Spacing of 1st post (left corner to 1st post center)`;
                        } else if (i === 2) {
                            labelText = `Spacing of 2nd post (1st to 2nd center)`;
                        } else if (i === 3) {
                            labelText = `Spacing of 3rd post (2nd to 3rd center)`;
                        } else {
                            labelText = `Spacing of ${i}th post (${i-1} to ${i} center)`;
                        }
                        const defaultSpacing = panelObj.midPostSpacings?.[i - 1] !== undefined ? panelObj.midPostSpacings[i - 1] : 48;
                        html += `
                            <div class="input-group">
                                <label>${labelText}</label>
                                <input type="number" id="inp-midPostSpacing-${i}" value="${defaultSpacing}" step="0.1" min="0.1">
                            </div>
                        `;
                    }
                    html += `</div>`;
                }

                // Base Plates (always visible in main section)
                html += generateSelectInput('Base Plates', 'includeBasePlates', [
                    { val: 'no', lbl: 'None' },
                    { val: 'yes', lbl: 'Include Base Plates' }
                ], 'no');

                // Base Plate Details (sub-group toggled by includeBasePlates value)
                html += `<div id="grp-basePlateDetails" class="hidden" style="grid-column: span 2; display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 10px; margin-bottom: 10px; padding: 10px; border: 1px dashed var(--border-color); border-radius: 6px; background: rgba(255,255,255,0.01);">`;
                html += `<div id="grp-basePlateSizeGroup" class="input-group">
                            <label>Base Plate AISC Thickness</label>
                            <select id="inp-basePlateSize"></select>
                         </div>`;
                html += `<div id="grp-basePlateW" class="input-group">
                            <label>Base Plate Width (in)</label>
                            <input type="number" id="inp-basePlateW" value="6.0" step="0.01">
                         </div>`;
                html += `<div id="grp-basePlateL" class="input-group">
                            <label>Base Plate Length (in)</label>
                            <input type="number" id="inp-basePlateL" value="6.0" step="0.01">
                         </div>`;
                html += `<div id="grp-basePlateT" class="input-group">
                            <label>Base Plate Custom Thickness (in)</label>
                            <input type="number" id="inp-basePlateT" value="0.5" step="0.01">
                         </div>`;
                html += `<div id="grp-basePlateHoleD" class="input-group">
                            <label>Base Plate Hole Diameter (in)</label>
                            <input type="number" id="inp-basePlateHoleD" value="0.5" step="0.01">
                         </div>`;
                html += `<div id="grp-basePlateHoleOffsetX" class="input-group">
                            <label>Base Plate Hole Offset X (in)</label>
                            <input type="number" id="inp-basePlateHoleOffsetX" value="0.5" step="0.01">
                         </div>`;
                html += `<div id="grp-basePlateHoleOffsetY" class="input-group">
                            <label>Base Plate Hole Offset Y (in)</label>
                            <input type="number" id="inp-basePlateHoleOffsetY" value="0.25" step="0.01">
                         </div>`;
                html += `</div>`;

                // Custom Options Wrapper
                html += `<div id="grp-rail-catalog-custom-options" class="hidden" style="grid-column: span 2; display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 15px; padding-top: 15px; border-top: 1px dashed var(--border-color);">`;
                
                // Heights & Runner options (only visible for custom styles)
                html += `<div id="grp-rail-runner-custom-options" class="inputs-subgrid" style="grid-column: span 2; display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">`;
                
                // Heights
                html += generateNumInput('Panel Body Height (in)', 'fenceHeight', 41.0);
                html += generateNumInput('Post Height (in)', 'postHeight', 45.75);

                // Post Profile
                html += generateSelectInput('Post Profile', 'postType', runnerProfileOptions, 'hss_rect');
                html += `<div class="input-group">
                            <label>Post AISC Size</label>
                            <select id="inp-postSize"></select>
                         </div>`;
                html += `<div id="grp-postW" class="input-group hidden">
                            <label>Post Custom Dimension (in)</label>
                            <input type="number" id="inp-postW" value="1.5" step="0.01">
                         </div>`;

                // Top Runner Profile
                html += generateSelectInput('Top Runner Profile', 'topRailType', runnerProfileOptions, 'hss_rect');
                html += `<div class="input-group">
                            <label>Top Runner AISC Size</label>
                            <select id="inp-topRailSize"></select>
                         </div>`;
                html += `<div id="grp-topRailH" class="input-group hidden">
                            <label>Top Runner Custom Dim (in)</label>
                            <input type="number" id="inp-topRailH" value="1.5" step="0.01">
                         </div>`;

                // Bottom Runner Profile
                html += generateSelectInput('Bottom Runner Profile', 'botRailType', runnerProfileOptions, 'hss_rect');
                html += `<div class="input-group">
                            <label>Bottom Runner AISC Size</label>
                            <select id="inp-botRailSize"></select>
                         </div>`;
                html += `<div id="grp-botRailH" class="input-group hidden">
                            <label>Bottom Runner Custom Dim (in)</label>
                            <input type="number" id="inp-botRailH" value="1.5" step="0.01">
                         </div>`;

                // Mid Runner Profile section (hidden for classic_custom & urban_custom)
                html += `<div id="grp-midRailProfileSection" class="inputs-subgrid" style="grid-column: span 2; display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">`;
                html += generateSelectInput('Mid Runner Profile', 'midRailType', runnerProfileOptions, 'none');
                html += `<div class="input-group">
                            <label>Mid Runner AISC Size</label>
                            <select id="inp-midRailSize"></select>
                         </div>`;
                html += `<div id="grp-midRailH" class="input-group hidden">
                            <label>Mid Runner Custom Dim (in)</label>
                            <input type="number" id="inp-midRailH" value="1.5" step="0.01">
                         </div>`;
                html += `<div id="grp-midRailGap" class="input-group hidden">
                            <label>Mid Runner Gap (in)</label>
                            <input type="number" id="inp-midRailGap" value="12.0" step="0.1">
                         </div>`;
                html += `</div>`; // grp-midRailProfileSection end

                html += `</div>`; // grp-rail-runner-custom-options end

                // Picket Profile section (hidden for mesh styles)
                html += `<div id="grp-rail-picket-options" class="inputs-subgrid" style="grid-column: span 2; display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">`;
                html += generateSelectInput('Vertical Picket Profile', 'picketType', profileOptions, 'hss_rect');
                html += `<div class="input-group">
                            <label>Picket AISC Size</label>
                            <select id="inp-picketSize"></select>
                         </div>`;
                html += `<div id="grp-picketW" class="input-group hidden">
                            <label>Picket Custom Dim (in)</label>
                            <input type="number" id="inp-picketW" value="0.5" step="0.01">
                         </div>`;
                html += generateNumInput('Picket Spacing (in)', 'picketSpacing', 4.0);
                html += `</div>`; // grp-rail-picket-options end

                // Mesh Profile section (visible only for mesh styles)
                html += `<div id="grp-rail-mesh-options" class="inputs-subgrid hidden" style="grid-column: span 2; display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">`;
                html += generateNumInput('Mesh Grid Width (in)', 'meshGridW', 2.0);
                html += generateNumInput('Mesh Grid Height (in)', 'meshGridH', 2.0);
                html += generateNumInput('Mesh Wire Diameter (in)', 'meshWireD', 0.135);
                html += `<div style="display: none;">`;
                html += generateSelectInput('Extra Flat Bar', 'extraFlatBar', [
                    { val: 'no', lbl: 'No' },
                    { val: 'yes', lbl: 'Yes' }
                ], 'no');
                html += `</div>`;
                html += `</div>`; // grp-rail-mesh-options end

                html += `</div>`; // grp-rail-catalog-custom-options end

                // Render bottom Delete Panel button
                const panelLabel = activePanel === 'main' ? 'Main Panel' : (activePanel === 'leftReturn' ? 'Left Return' : 'Right Return');
                html += `
                    <div style="grid-column: span 2; display: flex; justify-content: flex-end; margin-top: 15px; padding-top: 15px; border-top: 1px solid var(--border-color);">
                        <button id="wiz-delete-active-panel-btn" class="btn danger" style="padding: 6px 12px; font-size: 12px; background: rgba(255, 68, 68, 0.15); border: 1px solid rgba(255, 68, 68, 0.3); color: #ff6b6b; border-radius: 6px; font-weight: bold; cursor: pointer;">
                            Delete ${panelLabel}
                        </button>
                    </div>
                `;
            }
            html += '</div>'; // inputs-grid end

            dynamicInputs.innerHTML = html;
            loadActivePanelToInputs();
            if (window.lucide) window.lucide.createIcons();

            // Wire listeners
            const railStyleSelect = document.getElementById('inp-railStyle');
            const customOptionsWrapper = document.getElementById('grp-rail-catalog-custom-options');
            const midPostsSelect = document.getElementById('inp-midPosts');
            const midPostCountGroup = document.getElementById('grp-rail-midPostCount');

            const toggleCustomOptions = () => {
                if (!railStyleSelect || !customOptionsWrapper) return;
                const style = railStyleSelect.value;
                const isCustomStyle = (style === 'classic_custom' || style === 'executive_custom' || style === 'urban_custom' || style === 'villa_custom');
                const isMeshStyle = (style === 'urban_balcony' || style === 'villa_balcony' || style === 'urban_custom' || style === 'villa_custom');

                if (isCustomStyle || isMeshStyle) {
                    customOptionsWrapper.classList.remove('hidden');
                } else {
                    customOptionsWrapper.classList.add('hidden');
                }

                const runnerGroup = document.getElementById('grp-rail-runner-custom-options');
                if (runnerGroup) {
                    if (isCustomStyle) {
                        runnerGroup.classList.remove('hidden');
                    } else {
                        runnerGroup.classList.add('hidden');
                    }
                }

                const midRunnerGroup = document.getElementById('grp-midRailProfileSection');
                if (midRunnerGroup) {
                    if (style === 'classic_custom' || style === 'urban_custom') {
                        midRunnerGroup.classList.add('hidden');
                        const midRailTypeSelect = document.getElementById('inp-midRailType');
                        if (midRailTypeSelect) {
                            midRailTypeSelect.value = 'none';
                        }
                    } else {
                        midRunnerGroup.classList.remove('hidden');
                    }
                }

                const picketGroup = document.getElementById('grp-rail-picket-options');
                if (picketGroup) {
                    if (isMeshStyle) {
                        picketGroup.classList.add('hidden');
                    } else {
                        picketGroup.classList.remove('hidden');
                    }
                }

                const meshGroup = document.getElementById('grp-rail-mesh-options');
                if (meshGroup) {
                    if (isMeshStyle) {
                        meshGroup.classList.remove('hidden');
                    } else {
                        meshGroup.classList.add('hidden');
                    }
                }
            };

            const toggleMidPosts = () => {
                if (!midPostsSelect || !midPostCountGroup) return;
                if (midPostsSelect.value === 'custom' || midPostsSelect.value === 'custom_standard') {
                    midPostCountGroup.classList.remove('hidden');
                } else {
                    midPostCountGroup.classList.add('hidden');
                }
            };

            if (railStyleSelect) {
                railStyleSelect.addEventListener('change', () => {
                    toggleCustomOptions();
                    saveCurrentInputsToActivePanel();
                    renderCurrentCAD();
                });
            }

            if (midPostsSelect) {
                midPostsSelect.addEventListener('change', () => {
                    toggleMidPosts();
                    saveCurrentInputsToActivePanel();
                    updateInputs();
                    renderCurrentCAD();
                });
            }

            const midPostCountInput = document.getElementById('inp-midPostCount');
            if (midPostCountInput) {
                midPostCountInput.addEventListener('input', () => {
                    saveCurrentInputsToActivePanel();
                    updateInputs();
                    renderCurrentCAD();
                });
            }

            // Wire Balcony Wizard components
            const wizActiveSet = document.getElementById('wiz-active-set');
            const wizDeleteSetBtn = document.getElementById('wiz-delete-set-btn');
            const wizAddSetBtn = document.getElementById('wiz-add-set-btn');
            const wizDrawingBase = document.getElementById('wiz-drawing-base');
            const wizTabBtns = document.querySelectorAll('.wiz-tab-btn');

            if (wizActiveSet) {
                wizActiveSet.addEventListener('change', (e) => {
                    if (e.target.value === 'draft') return;
                    saveCurrentInputsToActivePanel();
                    balconyWizardState.tempSet = null; // Discard draft if we switch away
                    balconyWizardState.activeSetIdx = parseInt(e.target.value);
                    balconyWizardState.activePanelType = 'main';
                    const set = balconyWizardState.sets[balconyWizardState.activeSetIdx];
                    if (set.rightReturn) {
                        balconyWizardState.step = 'done';
                    } else if (set.leftReturn) {
                        balconyWizardState.step = 'ask_rightReturn';
                    } else {
                        balconyWizardState.step = 'main';
                    }
                    updateInputs();
                    loadActivePanelToInputs();
                    renderCurrentCAD();
                });
            }

            if (wizDeleteSetBtn) {
                wizDeleteSetBtn.addEventListener('click', () => {
                    const activeSetIdx = balconyWizardState.activeSetIdx;
                    const letter = getSetLetter(activeSetIdx);
                    if (confirm(`Are you sure you want to delete Balcony ${letter}?`)) {
                        saveCurrentInputsToActivePanel(); // Save other sets
                        
                        // Remove the set
                        balconyWizardState.sets.splice(activeSetIdx, 1);
                        
                        // Re-index remaining sets
                        balconyWizardState.sets.forEach((set, idx) => {
                            set.id = idx + 1;
                            set.drawingBase = (idx + 1).toString();
                        });
                        
                        // Switch active index to a valid index
                        balconyWizardState.activeSetIdx = Math.max(0, activeSetIdx - 1);
                        balconyWizardState.activePanelType = 'main';
                        
                        const set = balconyWizardState.sets[balconyWizardState.activeSetIdx];
                        if (set.rightReturn) {
                            balconyWizardState.step = 'done';
                        } else if (set.leftReturn) {
                            balconyWizardState.step = 'ask_rightReturn';
                        } else {
                            balconyWizardState.step = 'main';
                        }
                        
                        updateInputs();
                        loadActivePanelToInputs();
                        renderCurrentCAD();
                    }
                });
            }

            if (wizAddSetBtn) {
                wizAddSetBtn.addEventListener('click', () => {
                    if (balconyWizardState.tempSet) {
                        alert("Please save or discard the current draft balcony first.");
                        return;
                    }
                    saveCurrentInputsToActivePanel();
                    
                    const nextId = balconyWizardState.sets.length + 1;
                    const prevSet = balconyWizardState.sets.length > 0 ? balconyWizardState.sets[balconyWizardState.sets.length - 1] : null;
                    const prevBase = prevSet ? (parseInt(prevSet.drawingBase) || nextId - 1) : 0;
                    const nextBase = (prevBase + 1).toString();
                    const nextMain = (prevSet && prevSet.main) ? JSON.parse(JSON.stringify(prevSet.main)) : getDefaultPanelConfig();
                    
                    // Create draft set instead of adding to sets array immediately!
                    balconyWizardState.tempSet = {
                        id: nextId,
                        drawingBase: nextBase,
                        quantity: 1,
                        main: nextMain,
                        leftReturn: null,
                        rightReturn: null
                    };
                    
                    balconyWizardState.activeSetIdx = balconyWizardState.sets.length;
                    balconyWizardState.activePanelType = 'main';
                    balconyWizardState.step = 'main';
                    
                    updateInputs();
                    loadActivePanelToInputs();
                    renderCurrentCAD();
                });
            }

            if (wizDrawingBase) {
                wizDrawingBase.addEventListener('input', (e) => {
                    const activeSet = balconyWizardState.tempSet || balconyWizardState.sets[balconyWizardState.activeSetIdx];
                    activeSet.drawingBase = e.target.value.trim() || "1";
                    
                    const tabs = document.querySelectorAll('.wiz-tab-btn');
                    if (tabs.length >= 3) {
                        tabs[0].textContent = `Main (${activeSet.drawingBase}B1)`;
                        tabs[1].textContent = `Return 1 (${activeSet.drawingBase}R1)`;
                        tabs[2].textContent = `Return 2 (${activeSet.drawingBase}R2)`;
                    }
                    saveCurrentInputsToActivePanel();
                });
            }

            const wizSetQty = document.getElementById('wiz-set-qty');
            if (wizSetQty) {
                wizSetQty.addEventListener('input', (e) => {
                    const activeSet = balconyWizardState.tempSet || balconyWizardState.sets[balconyWizardState.activeSetIdx];
                    activeSet.quantity = Math.max(1, parseInt(e.target.value) || 1);
                    saveCurrentInputsToActivePanel();
                    renderCurrentCAD();
                });
            }

            wizTabBtns.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const panelType = e.target.getAttribute('data-panel');
                    saveCurrentInputsToActivePanel();
                    balconyWizardState.activePanelType = panelType;
                    updateInputs();
                    loadActivePanelToInputs();
                    renderCurrentCAD();
                });
            });

            const saveMainBtn = document.getElementById('wiz-save-main-btn');
            const addR1Btn = document.getElementById('wiz-add-r1-btn');
            const skipR1Btn = document.getElementById('wiz-skip-r1-btn');
            const saveR1Btn = document.getElementById('wiz-save-r1-btn');
            const removeR1Btn = document.getElementById('wiz-remove-r1-btn');
            const addR2Btn = document.getElementById('wiz-add-r2-btn');
            const skipR2Btn = document.getElementById('wiz-skip-r2-btn');
            const saveR2Btn = document.getElementById('wiz-save-r2-btn');
            const removeR2Btn = document.getElementById('wiz-remove-r2-btn');
            const nextSetBtn = document.getElementById('wiz-next-set-btn');

            if (saveMainBtn) {
                saveMainBtn.addEventListener('click', () => {
                    saveCurrentInputsToActivePanel();
                    balconyWizardState.step = 'ask_leftReturn';
                    updateInputs();
                    loadActivePanelToInputs();
                    renderCurrentCAD();
                });
            }

            if (addR1Btn) {
                addR1Btn.addEventListener('click', () => {
                    const set = balconyWizardState.tempSet || balconyWizardState.sets[balconyWizardState.activeSetIdx];
                    set.leftReturn = JSON.parse(JSON.stringify(set.main || getDefaultPanelConfig()));
                    set.leftReturn.length = 36.0;
                    set.leftReturn.leftPost = 'yes';
                    set.leftReturn.rightPost = 'none';
                    set.leftReturn.midPosts = 'none';
                    set.leftReturn.midPostCount = 0;
                    
                    balconyWizardState.activePanelType = 'leftReturn';
                    balconyWizardState.step = 'edit_leftReturn';
                    updateInputs();
                    loadActivePanelToInputs();
                    renderCurrentCAD();
                });
            }

            if (skipR1Btn) {
                skipR1Btn.addEventListener('click', () => {
                    const set = balconyWizardState.tempSet || balconyWizardState.sets[balconyWizardState.activeSetIdx];
                    set.leftReturn = null;
                    balconyWizardState.step = 'ask_rightReturn';
                    updateInputs();
                    loadActivePanelToInputs();
                    renderCurrentCAD();
                });
            }

            if (saveR1Btn) {
                saveR1Btn.addEventListener('click', () => {
                    saveCurrentInputsToActivePanel();
                    balconyWizardState.step = 'ask_rightReturn';
                    updateInputs();
                    loadActivePanelToInputs();
                    renderCurrentCAD();
                });
            }

            if (removeR1Btn) {
                removeR1Btn.addEventListener('click', () => {
                    const set = balconyWizardState.tempSet || balconyWizardState.sets[balconyWizardState.activeSetIdx];
                    set.leftReturn = null;
                    balconyWizardState.activePanelType = 'main';
                    balconyWizardState.step = 'done';
                    updateInputs();
                    loadActivePanelToInputs();
                    renderCurrentCAD();
                });
            }

            if (addR2Btn) {
                addR2Btn.addEventListener('click', () => {
                    const set = balconyWizardState.tempSet || balconyWizardState.sets[balconyWizardState.activeSetIdx];
                    set.rightReturn = JSON.parse(JSON.stringify(set.leftReturn || set.main || getDefaultPanelConfig()));
                    set.rightReturn.length = 36.0;
                    set.rightReturn.leftPost = 'yes';
                    set.rightReturn.rightPost = 'none';
                    set.rightReturn.midPosts = 'none';
                    
                    balconyWizardState.activePanelType = 'rightReturn';
                    balconyWizardState.step = 'edit_rightReturn';
                    updateInputs();
                    loadActivePanelToInputs();
                    renderCurrentCAD();
                });
            }

            if (skipR2Btn) {
                skipR2Btn.addEventListener('click', () => {
                    const set = balconyWizardState.tempSet || balconyWizardState.sets[balconyWizardState.activeSetIdx];
                    set.rightReturn = null;
                    balconyWizardState.step = 'done';
                    updateInputs();
                    loadActivePanelToInputs();
                    renderCurrentCAD();
                });
            }

            if (saveR2Btn) {
                saveR2Btn.addEventListener('click', () => {
                    saveCurrentInputsToActivePanel();
                    balconyWizardState.step = 'done';
                    updateInputs();
                    loadActivePanelToInputs();
                    renderCurrentCAD();
                });
            }

            if (removeR2Btn) {
                removeR2Btn.addEventListener('click', () => {
                    const set = balconyWizardState.tempSet || balconyWizardState.sets[balconyWizardState.activeSetIdx];
                    set.rightReturn = null;
                    balconyWizardState.activePanelType = 'main';
                    balconyWizardState.step = 'done';
                    updateInputs();
                    loadActivePanelToInputs();
                    renderCurrentCAD();
                });
            }

            if (nextSetBtn) {
                nextSetBtn.addEventListener('click', () => {
                    if (wizAddSetBtn) wizAddSetBtn.click();
                });
            }

            // Wire up new draft balcony buttons
            const startDraftBtn = document.getElementById('wiz-start-draft-btn');
            const saveDraftBtn = document.getElementById('wiz-save-draft-btn');
            const cancelDraftBtn = document.getElementById('wiz-cancel-draft-btn');

            if (startDraftBtn) {
                startDraftBtn.addEventListener('click', () => {
                    if (wizAddSetBtn) wizAddSetBtn.click();
                });
            }

            if (saveDraftBtn) {
                saveDraftBtn.addEventListener('click', () => {
                    if (!balconyWizardState.tempSet) return;
                    saveCurrentInputsToActivePanel(); // Save any pending inputs
                    
                    // Add the draft set to the official sets array!
                    balconyWizardState.sets.push(balconyWizardState.tempSet);
                    balconyWizardState.activeSetIdx = balconyWizardState.sets.length - 1;
                    balconyWizardState.tempSet = null;
                    
                    // Stay on the same wizard step (e.g. done or edit) but now officially committed
                    updateInputs();
                    loadActivePanelToInputs();
                    renderCurrentCAD();
                });
            }

            if (cancelDraftBtn) {
                cancelDraftBtn.addEventListener('click', () => {
                    balconyWizardState.tempSet = null;
                    // Go back to the last saved set
                    balconyWizardState.activeSetIdx = Math.max(0, balconyWizardState.sets.length - 1);
                    const set = balconyWizardState.sets[balconyWizardState.activeSetIdx];
                    if (set.rightReturn) {
                        balconyWizardState.step = 'done';
                    } else if (set.leftReturn) {
                        balconyWizardState.step = 'ask_rightReturn';
                    } else {
                        balconyWizardState.step = 'main';
                    }
                    
                    updateInputs();
                    loadActivePanelToInputs();
                    renderCurrentCAD();
                });
            }

            const inputs = dynamicInputs.querySelectorAll('input, select');
            inputs.forEach(inp => {
                if (inp.id.startsWith('inp-')) {
                    inp.addEventListener('input', () => {
                        saveCurrentInputsToActivePanel();
                    });
                    inp.addEventListener('change', () => {
                        saveCurrentInputsToActivePanel();
                    });
                }
            });

            // Set up dynamic profile sizing for custom options
            setupDynamicProfile('postType', 'postSize', 'grp-postW', 'postW', 'HSS1.5x1.5x14GA');
            setupDynamicProfile('topRailType', 'topRailSize', 'grp-topRailH', 'topRailH', 'HSS1.5x1.5x16GA');
            setupDynamicProfile('botRailType', 'botRailSize', 'grp-botRailH', 'botRailH', 'HSS1.5x1.5x16GA');
            setupDynamicProfile('midRailType', 'midRailSize', 'grp-midRailH', 'midRailH', 'HSS1.5x1.5x16GA');
            setupDynamicProfile('picketType', 'picketSize', 'grp-picketW', 'picketW', 'HSS1/2x1/2x16GA');
            setupBasePlateProfile();
            setupMidRailGapToggle();

            // Setup general listeners
            ['length', 'midPostCount', 'fenceHeight', 'postHeight', 'picketSpacing'].forEach(id => {
                const inp = document.getElementById('inp-' + id);
                if (inp) {
                    inp.addEventListener('input', renderCurrentCAD);
                    inp.addEventListener('change', renderCurrentCAD);
                }
            });

            ['leftPost', 'rightPost'].forEach(id => {
                const inp = document.getElementById('inp-' + id);
                if (inp) {
                    inp.addEventListener('change', renderCurrentCAD);
                }
            });

            // Wire Warning Add Buttons and Delete Button
            const warningAddMainBtn = document.getElementById('wiz-warning-add-main-btn');
            const warningAddLeftBtn = document.getElementById('wiz-warning-add-left-btn');
            const warningAddRightBtn = document.getElementById('wiz-warning-add-right-btn');
            const deleteActivePanelBtn = document.getElementById('wiz-delete-active-panel-btn');

            if (warningAddMainBtn) {
                warningAddMainBtn.addEventListener('click', () => {
                    const set = balconyWizardState.tempSet || balconyWizardState.sets[balconyWizardState.activeSetIdx];
                    set.main = getDefaultPanelConfig();
                    balconyWizardState.activePanelType = 'main';
                    updateInputs();
                });
            }

            if (warningAddLeftBtn) {
                warningAddLeftBtn.addEventListener('click', () => {
                    const set = balconyWizardState.tempSet || balconyWizardState.sets[balconyWizardState.activeSetIdx];
                    set.leftReturn = JSON.parse(JSON.stringify(set.main || getDefaultPanelConfig()));
                    set.leftReturn.length = 36.0;
                    set.leftReturn.leftPost = 'yes';
                    set.leftReturn.rightPost = 'none';
                    set.leftReturn.midPosts = 'none';
                    set.leftReturn.midPostCount = 0;
                    
                    balconyWizardState.activePanelType = 'leftReturn';
                    balconyWizardState.step = 'edit_leftReturn';
                    updateInputs();
                });
            }

            if (warningAddRightBtn) {
                warningAddRightBtn.addEventListener('click', () => {
                    const set = balconyWizardState.tempSet || balconyWizardState.sets[balconyWizardState.activeSetIdx];
                    set.rightReturn = JSON.parse(JSON.stringify(set.leftReturn || set.main || getDefaultPanelConfig()));
                    set.rightReturn.length = 36.0;
                    set.rightReturn.leftPost = 'yes';
                    set.rightReturn.rightPost = 'none';
                    set.rightReturn.midPosts = 'none';
                    
                    balconyWizardState.activePanelType = 'rightReturn';
                    balconyWizardState.step = 'edit_rightReturn';
                    updateInputs();
                });
            }

            if (deleteActivePanelBtn) {
                deleteActivePanelBtn.addEventListener('click', () => {
                    const activePanel = balconyWizardState.activePanelType;
                    const panelLabel = activePanel === 'main' ? 'Main Panel' : (activePanel === 'leftReturn' ? 'Left Return' : 'Right Return');
                    if (confirm(`Are you sure you want to delete the ${panelLabel}?`)) {
                        saveCurrentInputsToActivePanel();
                        const set = balconyWizardState.tempSet || balconyWizardState.sets[balconyWizardState.activeSetIdx];
                        
                        if (activePanel === 'main') {
                            set.main = null;
                            if (set.leftReturn) {
                                balconyWizardState.activePanelType = 'leftReturn';
                            } else if (set.rightReturn) {
                                balconyWizardState.activePanelType = 'rightReturn';
                            } else {
                                balconyWizardState.activePanelType = 'main';
                            }
                        } else if (activePanel === 'leftReturn') {
                            set.leftReturn = null;
                            balconyWizardState.activePanelType = 'main';
                            balconyWizardState.step = 'done';
                        } else if (activePanel === 'rightReturn') {
                            set.rightReturn = null;
                            balconyWizardState.activePanelType = 'main';
                            balconyWizardState.step = 'done';
                        }
                        
                        updateInputs();
                    }
                });
            }

            // Initial trigger
            toggleCustomOptions();
            toggleMidPosts();
            renderCurrentCAD();
            return;
        }

        if (cat === 'custom_sketch') {
            let html = '<div class="inputs-grid">';
            html += `<div style="grid-column: span 2; border: 1px solid rgba(0, 212, 255, 0.15); background: rgba(0, 212, 255, 0.02); border-radius: 8px; padding: 16px; margin-bottom: 12px; font-family: 'Inter', sans-serif;">
                        <h4 style="margin: 0 0 6px 0; color: var(--accent-primary); font-size: 13px; font-weight: 600; display: flex; align-items: center; gap: 6px;">
                            <i data-lucide="pen-tool" style="width: 14px; height: 14px;"></i> Custom Sketch CAD
                        </h4>
                        <p style="margin: 0; font-size: 11px; color: var(--text-dim); line-height: 1.4;">
                            Precision vector paths reconstructed from your rough sketch. You can instantly export this custom layout as a DXF drawing package!
                        </p>
                     </div>`;
            html += `<div style="grid-column: span 2; margin-top: 12px;">
                        <button type="button" id="btn-edit-sketch" class="btn secondary" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 10px;">
                            <i data-lucide="edit-3" style="width: 14px; height: 14px;"></i> Edit Rough Sketch
                        </button>
                     </div>`;
            html += '</div>';
            dynamicInputs.innerHTML = html;

            const editBtn = document.getElementById('btn-edit-sketch');
            if (editBtn) {
                editBtn.addEventListener('click', () => {
                    const sketchNavBtn = document.querySelector('[data-mode="sketch"]');
                    if (sketchNavBtn) sketchNavBtn.click();
                });
            }
            if (window.lucide) {
                lucide.createIcons({
                    attrs: { class: 'lucide' },
                    nameAttr: 'data-lucide'
                });
            }
            return;
        }

        const shapes = SHAPES_DB[cat === 'welded_assembly' ? 'hss_rect' : cat];
        
        let html = '';
        
        if (cat === 'qiw_standards') {
            html += `<div class="input-group">
                        <label>QIW Standard Drawing Name</label>
                        <select id="qiw-part-select" style="border-color: var(--accent-secondary); font-weight: 600;">
                            <option value="">-- Select QIW Part Drawing --</option>
                            ${shapes.map(s => `<option value="${s.id}">${s.id} - ${s.category.toUpperCase()}</option>`).join('')}
                        </select>
                     </div>`;
            dynamicInputs.innerHTML = html;
            
            const qiwSelect = document.getElementById('qiw-part-select');
            if (qiwSelect) {
                qiwSelect.addEventListener('change', (e) => {
                    const partId = e.target.value;
                    const part = shapes.find(s => s.id === partId);
                    if (part) {
                        // Switch main Category to the part's underlying category
                        shapeCategory.value = part.category;
                        updateInputs();
                        
                        // Populate and force-update all individual inputs
                        Object.keys(part).forEach(key => {
                            if (key === 'category' || key === 'id' || key === 'name') return;
                            
                            const input = document.getElementById('inp-' + key);
                            if (input) {
                                input.value = part[key];
                                input.dispatchEvent(new Event('change'));
                            }
                        });
                        
                        // Specifically trigger sub-profile selects for Fence components
                        if (part.category === 'fence') {
                            ['postType', 'postSize', 'topRailType', 'topRailSize', 'midRailType', 'midRailSize', 'botRailType', 'botRailSize', 'picketType', 'picketSize', 'includeBasePlates', 'basePlateSize'].forEach(id => {
                                const select = document.getElementById('inp-' + id);
                                if (select && part[id] !== undefined) {
                                    select.value = part[id];
                                    select.dispatchEvent(new Event('change'));
                                }
                            });
                        }
                        
                        renderCurrentCAD();
                    }
                });
            }
            
            // Clear dim text and render a placeholder
            dimText.textContent = "QIW Standards Catalog";
            svgContainer.innerHTML = "<div style='color: var(--text-dim); text-align: center; padding: 40px;'><i data-lucide='ferris-wheel' style='width: 48px; height: 48px; margin: 0 auto 15px; color: var(--accent-secondary); display: block;'></i>Select a QIW drawing name from the dropdown to load and render the precision specification blueprint.</div>";
            if (window.lucide) lucide.createIcons();
            return;
        }
        
        // Select specific size
        html += `<div class="input-group">
                    <label>Standard AISC Size</label>
                    <select id="shape-size">
                        ${shapes.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
                    </select>
                 </div>`;

        // Bending/Forming Options for standard shapes
        if (['hss_rect', 'hss_circ', 'angles', 'plate'].includes(cat)) {
            const fabSelect = document.getElementById('inp-fabMethod');
            const fabMethod = fabSelect ? fabSelect.value : 'straight';
            const fabOptions = [
                { val: 'straight', lbl: 'Straight Cut' },
                { val: 'bent', lbl: 'Bent / Formed (Single Piece)' }
            ];
            if (cat === 'plate') {
                fabOptions.push({ val: 'custom', lbl: 'Custom Shaped Plate' });
            }
            html += `<div style="grid-column: span 2; margin-bottom: 8px;">`;
            html += generateSelectInput('Fabrication Method', 'fabMethod', fabOptions, fabMethod);
            html += `</div>`;
            
            html += `
            <div id="bending-options" class="hidden" style="grid-column: span 2; border: 1px dashed rgba(0, 212, 255, 0.2); padding: 12px; border-radius: 8px; margin-bottom: 12px; margin-top: 4px; background: rgba(0, 212, 255, 0.01);">
                <h4 style="margin: 0 0 8px 0; color: var(--accent-secondary); font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Bending Specifications</h4>
                <div class="inputs-grid" style="margin-bottom:0; gap: 10px;">
                    ${generateNumInput('Inside Radius (in)', 'insideRadius', 0.25)}
                    ${generateNumInput('Bend Angle (deg)', 'bendAngle', 90)}
                    ${(cat === 'plate' || cat === 'angles') ? generateNumInput('Leg 1 Length (in)', 'leg1', 4.0) : ''}
                    ${(cat === 'plate' || cat === 'angles') ? generateNumInput('Leg 2 Length (in)', 'leg2', 4.0) : ''}
                </div>
            </div>`;
        }

        // Add numerical inputs
        html += '<div class="inputs-grid">';
        
        const profileOptions = [
            { val: 'none', lbl: 'None (Disabled)' },
            { val: 'plate', lbl: 'Plate / Flat Bar' },
            { val: 'hss_rect', lbl: 'HSS Rectangular' },
            { val: 'hss_circ', lbl: 'HSS Circular (Pipe)' },
            { val: 'w_beam', lbl: 'W-Beam' },
            { val: 'angles', lbl: 'Angle (L-Shape)' }
        ];

        const runnerProfileOptions = [
            { val: 'none', lbl: 'None (Disabled)' },
            { val: 'plate', lbl: 'Plate / Flat Bar' },
            { val: 'hss_rect', lbl: 'HSS Rectangular' },
            { val: 'hss_circ', lbl: 'HSS Circular (Pipe)' },
            { val: 'w_beam', lbl: 'W-Beam' },
            { val: 'angles', lbl: 'Angle (L-Shape)' }
        ];

        if (cat === 'welded_assembly') {
            html += generateNumInput('Outside Width W (in)', 'w', 12);
            html += generateNumInput('Outside Height H (in)', 'h', 8);
            html += generateNumInput('Outside Depth D (in)', 'depth', 18);
            html += generateSelectInput('Assembly Grade', 'weldedGrade', [
                { val: 'A500', lbl: 'A500 (Standard)' },
                { val: 'A36', lbl: 'A36' }
            ], 'A500');
        } else if (cat === 'hss_rect') {
            html += generateNumInput('Width (in)', 'w', 4);
            html += generateNumInput('Height (in)', 'h', 4);
            html += generateNumInput('Thickness (in)', 't', 0.25);
        } else if (cat === 'hss_circ') {
            html += generateNumInput('Diameter (in)', 'd', 4);
            html += generateNumInput('Thickness (in)', 't', 0.25);
        } else if (cat === 'w_beam') {
            html += generateNumInput('Depth (in)', 'd', 10);
            html += generateNumInput('Flange Width (in)', 'bf', 6);
            html += generateNumInput('Flange Thick (in)', 'tf', 0.5);
            html += generateNumInput('Web Thick (in)', 'tw', 0.3);
        } else if (cat === 'angles') {
            html += generateNumInput('Leg 1 (in)', 'leg1', 4);
            html += generateNumInput('Leg 2 (in)', 'leg2', 4);
            html += generateNumInput('Thickness (in)', 't', 0.25);
        } else if (cat === 'fence') {
            html += generateNumInput('Total Length (in)', 'length', 120);
            html += generateNumInput('Panel Body Height (in)', 'fenceHeight', 72);
            html += generateNumInput('Post Height (in)', 'postHeight', 80);
            html += generateNumInput('Top Gap (in)', 'topGap', 2.0);
            html += generateNumInput('Post Spacing (in)', 'postSpacing', 48);

            // Post Profile & AISC standard sizes
            html += generateSelectInput('Post Profile', 'postType', runnerProfileOptions, 'hss_rect');
            html += `<div class="input-group">
                        <label>Post AISC Member</label>
                        <select id="inp-postSize"></select>
                     </div>`;
            html += `<div id="grp-postW" class="input-group hidden">
                        <label>Post Custom Dimension (in)</label>
                        <input type="number" id="inp-postW" value="3.0" step="0.01">
                     </div>`;
            
            // Top Runner Profile & AISC standard sizes
            html += generateSelectInput('Top Runner Profile', 'topRailType', runnerProfileOptions, 'hss_rect');
            html += `<div class="input-group">
                        <label>Top Runner AISC Member</label>
                        <select id="inp-topRailSize"></select>
                     </div>`;
            html += `<div id="grp-topRailH" class="input-group hidden">
                        <label>Top Runner Custom Dimension (in)</label>
                        <input type="number" id="inp-topRailH" value="2.0" step="0.01">
                     </div>`;
            
            // Mid Runner Profile & AISC standard sizes
            html += generateSelectInput('Mid Runner Profile', 'midRailType', runnerProfileOptions, 'none'); // Default Mid Runner to 'none' or keep 'hss_rect' but optionally 'none'
            html += `<div class="input-group">
                        <label>Mid Runner AISC Member</label>
                        <select id="inp-midRailSize"></select>
                     </div>`;
            html += `<div id="grp-midRailH" class="input-group hidden">
                        <label>Mid Runner Custom Dimension (in)</label>
                        <input type="number" id="inp-midRailH" value="1.5" step="0.01">
                     </div>`;
            html += `<div id="grp-midRailGap" class="input-group hidden">
                        <label>Mid Runner Gap (in)</label>
                        <input type="number" id="inp-midRailGap" value="12.0" step="0.1">
                     </div>`;
            
            // Bottom Runner Profile & AISC standard sizes
            html += generateSelectInput('Bottom Runner Profile', 'botRailType', runnerProfileOptions, 'hss_rect');
            html += `<div class="input-group">
                        <label>Bottom Runner AISC Member</label>
                        <select id="inp-botRailSize"></select>
                     </div>`;
            html += `<div id="grp-botRailH" class="input-group hidden">
                        <label>Bottom Runner Custom Dimension (in)</label>
                        <input type="number" id="inp-botRailH" value="2.0" step="0.01">
                     </div>`;
            
            // Vertical Picket Profile & AISC standard sizes
            html += generateSelectInput('Vertical Picket Profile', 'picketType', profileOptions, 'hss_rect');
            html += `<div class="input-group">
                        <label>Vertical Picket AISC Member</label>
                        <select id="inp-picketSize"></select>
                     </div>`;
            html += `<div id="grp-picketW" class="input-group hidden">
                        <label>Vertical Picket Custom Dimension (in)</label>
                        <input type="number" id="inp-picketW" value="0.75" step="0.01">
                     </div>`;
            
            html += generateNumInput('Picket Spacing (in)', 'picketSpacing', 4.0);
            html += generateNumInput('Slope at Bottom (deg)', 'slope', 0);
            html += generateSelectInput('Base Plates', 'includeBasePlates', [{ val: 'no', lbl: 'None' }, { val: 'yes', lbl: 'Include Base Plates' }], 'no');

            // Base Plate AISC thickness & dimensions
            html += `<div id="grp-basePlateSizeGroup" class="input-group hidden">
                        <label>Base Plate AISC Thickness</label>
                        <select id="inp-basePlateSize"></select>
                     </div>`;
            html += `<div id="grp-basePlateW" class="input-group hidden">
                        <label>Base Plate Width (in)</label>
                        <input type="number" id="inp-basePlateW" value="6.0" step="0.01">
                     </div>`;
            html += `<div id="grp-basePlateL" class="input-group hidden">
                        <label>Base Plate Length (in)</label>
                        <input type="number" id="inp-basePlateL" value="6.0" step="0.01">
                     </div>`;
            html += `<div id="grp-basePlateT" class="input-group hidden">
                        <label>Base Plate Custom Thickness (in)</label>
                        <input type="number" id="inp-basePlateT" value="0.5" step="0.01">
                     </div>`;
            html += `<div id="grp-basePlateHoleD" class="input-group hidden">
                        <label>Base Plate Hole Diameter (in)</label>
                        <input type="number" id="inp-basePlateHoleD" value="0.5" step="0.01">
                     </div>`;
            html += `<div id="grp-basePlateHoleOffsetX" class="input-group hidden">
                        <label>Base Plate Hole Offset X (in)</label>
                        <input type="number" id="inp-basePlateHoleOffsetX" value="0.5" step="0.01">
                     </div>`;
            html += `<div id="grp-basePlateHoleOffsetY" class="input-group hidden">
                        <label>Base Plate Hole Offset Y (in)</label>
                        <input type="number" id="inp-basePlateHoleOffsetY" value="0.25" step="0.01">
                     </div>`;
        } else if (cat === 'rails_gates') {
            html += generateSelectInput('Detailing Type', 'railsGatesType', [
                { val: 'gates', lbl: 'Gates (Full Frame)' },
                { val: 'rails', lbl: 'Rails (Open Panel)' }
            ], 'gates');

            html += generateNumInput('Total Length (in)', 'length', 120);
            html += generateNumInput('Panel Body Height (in)', 'fenceHeight', 72);
            html += `<div id="grp-postHeight" class="input-group">
                        <label>Post Height (in)</label>
                        <input type="number" id="inp-postHeight" value="72" step="0.01">
                     </div>`;

            // Gates Options Wrapper
            html += `<div id="grp-railsgates-gates-options" style="grid-column: span 2; display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">`;
            // Left Side Runner Profile & AISC standard sizes
            html += generateSelectInput('Left Side Runner Profile', 'leftPostType', runnerProfileOptions, 'hss_rect');
            html += `<div class="input-group">
                        <label>Left Side Runner AISC</label>
                        <select id="inp-leftPostSize"></select>
                     </div>`;
            html += `<div id="grp-leftPostW" class="input-group hidden">
                        <label>Left Side Runner Custom (in)</label>
                        <input type="number" id="inp-leftPostW" value="3.0" step="0.01">
                     </div>`;

            // Right Side Runner Profile & AISC standard sizes
            html += generateSelectInput('Right Side Runner Profile', 'rightPostType', runnerProfileOptions, 'hss_rect');
            html += `<div class="input-group">
                        <label>Right Side Runner AISC</label>
                        <select id="inp-rightPostSize"></select>
                     </div>`;
            html += `<div id="grp-rightPostW" class="input-group hidden">
                        <label>Right Side Runner Custom (in)</label>
                        <input type="number" id="inp-rightPostW" value="3.0" step="0.01">
                     </div>`;
            html += `</div>`;

            // Rails Options Wrapper
            html += `<div id="grp-railsgates-rails-options" class="hidden" style="grid-column: span 2; display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">`;
            html += generateNumInput('Number of Mid Posts', 'midPostCount', 1);
            html += generateSelectInput('Mid Post Profile', 'midPostType', runnerProfileOptions, 'hss_rect');
            html += `<div class="input-group">
                        <label>Mid Post AISC</label>
                        <select id="inp-midPostSize"></select>
                     </div>`;
            html += `<div id="grp-midPostW" class="input-group hidden">
                        <label>Mid Post Custom Dim (in)</label>
                        <input type="number" id="inp-midPostW" value="3.0" step="0.01">
                     </div>`;
            html += `</div>`;

            // Top, Mid, Bottom Runners (common)
            html += generateSelectInput('Top Runner Profile', 'topRailType', runnerProfileOptions, 'hss_rect');
            html += `<div class="input-group">
                        <label>Top Runner AISC Member</label>
                        <select id="inp-topRailSize"></select>
                     </div>`;
            html += `<div id="grp-topRailH" class="input-group hidden">
                        <label>Top Runner Custom Dim (in)</label>
                        <input type="number" id="inp-topRailH" value="2.0" step="0.01">
                     </div>`;
            
            html += generateSelectInput('Mid Runner Profile', 'midRailType', runnerProfileOptions, 'none');
            html += `<div class="input-group">
                        <label>Mid Runner AISC Member</label>
                        <select id="inp-midRailSize"></select>
                     </div>`;
            html += `<div id="grp-midRailH" class="input-group hidden">
                        <label>Mid Runner Custom Dim (in)</label>
                        <input type="number" id="inp-midRailH" value="1.5" step="0.01">
                     </div>`;
            html += `<div id="grp-midRailGap" class="input-group hidden">
                        <label>Mid Runner Gap (in)</label>
                        <input type="number" id="inp-midRailGap" value="12.0" step="0.1">
                     </div>`;
            
            html += generateSelectInput('Bottom Runner Profile', 'botRailType', runnerProfileOptions, 'hss_rect');
            html += `<div class="input-group">
                        <label>Bottom Runner AISC Member</label>
                        <select id="inp-botRailSize"></select>
                     </div>`;
            html += `<div id="grp-botRailH" class="input-group hidden">
                        <label>Bottom Runner Custom Dim (in)</label>
                        <input type="number" id="inp-botRailH" value="2.0" step="0.01">
                     </div>`;

            // Kick Plate Section (Gates only)
            html += `<div id="grp-railsgates-kickplate-section" style="grid-column: span 2; display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 8px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 12px;">`;
            html += generateSelectInput('Kick Plate', 'kickPlate', [
                { val: 'none', lbl: 'None' },
                { val: '1_side', lbl: '1 Side' },
                { val: '2_sides', lbl: '2 Sides' }
            ], 'none');
            html += `<div id="grp-kickPlateH" class="input-group hidden">
                        <label>Kick Plate Height (in)</label>
                        <input type="number" id="inp-kickPlateH" value="12.0" step="0.1">
                     </div>`;
            html += `<div id="grp-kickPlateWeld" class="input-group hidden">
                        <label>Kick Plate Weld Position</label>
                        <select id="inp-kickPlateWeld">
                            <option value="inner">Inner Part (Inside Frame)</option>
                            <option value="outer">Outer Part (Face of Frame)</option>
                        </select>
                     </div>`;
            html += `<div id="grp-kickPlateSizeGroup" class="input-group hidden">
                        <label>Kick Plate Thickness (Width)</label>
                        <select id="inp-kickPlateSize">
                            <option value="PL10GA">PL 10GA (0.1345")</option>
                            <option value="PL11GA" selected>PL 11GA (0.1196")</option>
                            <option value="PL12GA">PL 12GA (0.1046")</option>
                            <option value="PL3/16">PL 3/16" (0.1875")</option>
                            <option value="PL1/4">PL 1/4" (0.25")</option>
                        </select>
                     </div>`;
            html += `</div>`;

            // Wire Mesh / Expanded Metal Section (Gates only)
            html += `<div id="grp-railsgates-mesh-section" style="grid-column: span 2; display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 8px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 12px;">`;
            html += generateSelectInput('Wire Mesh / XF Type', 'meshType', [
                { val: 'none', lbl: 'None' },
                { val: 'mesh', lbl: 'Welded Wire Mesh' },
                { val: 'xf', lbl: 'Expanded Metal (XF)' }
            ], 'none');
            html += `<div id="grp-meshFbSize" class="input-group hidden">
                        <label>Mesh Flat Bar Size (e.g. FB1x1/8)</label>
                        <input type="text" id="inp-meshFbSize" value="FB1x1/8">
                     </div>`;
            html += `<div id="grp-meshSize" class="input-group hidden">
                        <label>Mesh / XF Spec (e.g. WWM2x2x0.135)</label>
                        <input type="text" id="inp-meshSize" value="WWM2x2x0.135">
                     </div>`;
            html += `</div>`;

            // Panic Bar Plate Section (Gates only)
            html += `<div id="grp-railsgates-panicbar-section" style="grid-column: span 2; display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 8px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 12px;">`;
            html += generateSelectInput('Panic Bar Plate', 'panicBarPlate', [
                { val: 'none', lbl: 'None' },
                { val: 'yes', lbl: 'Yes' }
            ], 'none');
            html += `<div id="grp-panicBarPlateGap" class="input-group hidden">
                        <label>Panic Bar Plate Center Gap (in)</label>
                        <input type="number" id="inp-panicBarPlateGap" value="36.0" step="0.1">
                     </div>`;
            html += `<div id="grp-panicBarPlateW" class="input-group hidden">
                        <label>Panic Bar Plate Width (in)</label>
                        <input type="number" id="inp-panicBarPlateW" value="8.0" step="0.1">
                     </div>`;
            html += `<div id="grp-panicBarPlateSizeGroup" class="input-group hidden">
                        <label>Panic Bar Plate Thickness</label>
                        <select id="inp-panicBarPlateSize">
                            <option value="PL10GA">PL 10GA (0.1345")</option>
                            <option value="PL11GA">PL 11GA (0.1196")</option>
                            <option value="PL12GA">PL 12GA (0.1046")</option>
                            <option value="PL3/16" selected>PL 3/16" (0.1875")</option>
                            <option value="PL1/4">PL 1/4" (0.25")</option>
                        </select>
                     </div>`;
            html += `</div>`;
            
            // Vertical Picket Profile & AISC standard sizes (common)
            html += generateSelectInput('Vertical Picket Profile', 'picketType', profileOptions, 'hss_rect');
            html += `<div class="input-group">
                        <label>Vertical Picket AISC Member</label>
                        <select id="inp-picketSize"></select>
                     </div>`;
            html += `<div id="grp-picketW" class="input-group hidden">
                        <label>Vertical Picket Custom Dim (in)</label>
                        <input type="number" id="inp-picketW" value="0.75" step="0.01">
                     </div>`;
            
            html += generateNumInput('Picket Spacing (in)', 'picketSpacing', 4.0);
            html += generateNumInput('Slope at Bottom (deg)', 'slope', 0);
            html += generateSelectInput('Base Plates', 'includeBasePlates', [{ val: 'no', lbl: 'None' }, { val: 'yes', lbl: 'Include Base Plates' }], 'no');

            // Base Plate AISC thickness & dimensions
            html += `<div id="grp-basePlateSizeGroup" class="input-group hidden">
                        <label>Base Plate AISC Thickness</label>
                        <select id="inp-basePlateSize"></select>
                     </div>`;
            html += `<div id="grp-basePlateW" class="input-group hidden">
                        <label>Base Plate Width (in)</label>
                        <input type="number" id="inp-basePlateW" value="6.0" step="0.01">
                     </div>`;
            html += `<div id="grp-basePlateL" class="input-group hidden">
                        <label>Base Plate Length (in)</label>
                        <input type="number" id="inp-basePlateL" value="6.0" step="0.01">
                     </div>`;
            html += `<div id="grp-basePlateT" class="input-group hidden">
                        <label>Base Plate Custom Thickness (in)</label>
                        <input type="number" id="inp-basePlateT" value="0.5" step="0.01">
                     </div>`;
            html += `<div id="grp-basePlateHoleD" class="input-group hidden">
                        <label>Base Plate Hole Diameter (in)</label>
                        <input type="number" id="inp-basePlateHoleD" value="0.5" step="0.01">
                     </div>`;
            html += `<div id="grp-basePlateHoleOffsetX" class="input-group hidden">
                        <label>Base Plate Hole Offset X (in)</label>
                        <input type="number" id="inp-basePlateHoleOffsetX" value="0.5" step="0.01">
                     </div>`;
            html += `<div id="grp-basePlateHoleOffsetY" class="input-group hidden">
                        <label>Base Plate Hole Offset Y (in)</label>
                        <input type="number" id="inp-basePlateHoleOffsetY" value="0.25" step="0.01">
                     </div>`;
        } else if (cat === 'plate') {
            const fabSelect = document.getElementById('inp-fabMethod');
            const fabMethod = fabSelect ? fabSelect.value : 'straight';
            if (fabMethod === 'custom') {
                let pointsListHtml = "";
                customPlatePoints.forEach((pt, idx) => {
                    const isStart = (idx === 0);
                    const lineIdx = idx - 1;
                    const isSelected = (selectedCustomLineIdx === lineIdx);
                    
                    if (isStart) {
                        pointsListHtml += `
                            <div class="custom-pt-row" style="display: flex; align-items: center; justify-content: space-between; padding: 4px 6px; border-bottom: 1px solid rgba(255,255,255,0.05); color: var(--accent-primary);">
                                <span style="font-size: 11px; font-weight: 600;">Point 1 (Start)</span>
                                <span style="font-size: 11px;">(0.00", 0.00")</span>
                            </div>
                        `;
                    } else {
                        pointsListHtml += `
                            <div class="custom-pt-row ${isSelected ? 'selected' : ''}" data-line-idx="${lineIdx}" style="display: flex; align-items: center; justify-content: space-between; padding: 4px 6px; border-bottom: 1px solid rgba(255,255,255,0.05); background: ${isSelected ? 'rgba(0, 212, 255, 0.15)' : 'transparent'}; cursor: pointer;">
                                <div style="display: flex; align-items: center; gap: 4px;">
                                    <span style="font-size: 11px; color: ${isSelected ? '#00d4ff' : 'var(--text-dim)'}; font-weight: ${isSelected ? 'bold' : 'normal'};">Line ${idx} (Pt ${idx+1})</span>
                                </div>
                                <div style="display: flex; align-items: center; gap: 4px;" class="prevent-row-click">
                                    <span style="font-size: 9px; color: var(--text-dim);">X:</span>
                                    <input type="number" class="inp-edit-custom-pt-x" data-idx="${idx}" value="${pt[0]}" step="0.1" style="width: 50px; background: #0f131a; color: #fff; border: 1px solid ${isSelected ? '#00d4ff' : 'var(--border-color)'}; border-radius: 4px; padding: 2px 4px; font-size: 11px;">
                                    <span style="font-size: 9px; color: var(--text-dim);">Y:</span>
                                    <input type="number" class="inp-edit-custom-pt-y" data-idx="${idx}" value="${pt[1]}" step="0.1" style="width: 50px; background: #0f131a; color: #fff; border: 1px solid ${isSelected ? '#00d4ff' : 'var(--border-color)'}; border-radius: 4px; padding: 2px 4px; font-size: 11px;">
                                    <button type="button" class="btn-delete-custom-pt" data-idx="${idx}" title="Delete this line segment" style="background: none; border: none; color: #ff6b6b; cursor: pointer; font-size: 14px; font-weight: bold; padding: 2px 4px; line-height: 1;">&times;</button>
                                </div>
                            </div>
                        `;
                    }
                });
                
                if (customPlatePoints.length >= 3) {
                    const closingLineIdx = customPlatePoints.length - 1;
                    const isSelected = (selectedCustomLineIdx === closingLineIdx);
                    pointsListHtml += `
                        <div class="custom-pt-row ${isSelected ? 'selected' : ''}" data-line-idx="${closingLineIdx}" style="display: flex; align-items: center; justify-content: space-between; padding: 4px 6px; border-bottom: 1px solid rgba(255,255,255,0.05); background: ${isSelected ? 'rgba(0, 212, 255, 0.15)' : 'transparent'}; cursor: pointer;">
                            <span style="font-size: 11px; color: ${isSelected ? '#00d4ff' : 'var(--text-dim)'}; font-weight: ${isSelected ? 'bold' : 'normal'};">Closing Line (Pt ${customPlatePoints.length} to Start)</span>
                            <span style="font-size: 10px; color: var(--text-dim); font-style: italic;">Auto-closes to (0,0)</span>
                        </div>
                    `;
                }

                let selectionPanelHtml = "";
                if (selectedCustomLineIdx !== null) {
                    const lineIdx = selectedCustomLineIdx;
                    const isClosing = (lineIdx === customPlatePoints.length - 1 && customPlatePoints.length >= 3);
                    const pStartIdx = lineIdx;
                    const pEndIdx = isClosing ? 0 : lineIdx + 1;
                    
                    const pStart = customPlatePoints[pStartIdx];
                    const pEnd = customPlatePoints[pEndIdx];
                    
                    selectionPanelHtml = `
                        <div style="margin-top: 10px; padding: 10px; border: 1px dashed #00d4ff; background: rgba(0, 212, 255, 0.04); border-radius: 8px;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                                <span style="font-weight: bold; color: #00d4ff; font-size: 11px; text-transform: uppercase;">Selected Segment: Line ${lineIdx + 1}</span>
                                <span style="font-size: 9px; background: rgba(0, 212, 255, 0.2); color: #00d4ff; padding: 2px 6px; border-radius: 4px;">Active Selection</span>
                            </div>
                            <p style="margin: 0 0 8px 0; font-size: 10px; color: var(--text-dim); line-height: 1.3;">
                                Connects Point ${pStartIdx + 1} (${pStart[0].toFixed(2)}", ${pStart[1].toFixed(2)}") to Point ${pEndIdx + 1} (${pEnd[0].toFixed(2)}", ${pEnd[1].toFixed(2)}")
                            </p>
                            ${isClosing ? `
                                <p style="margin: 0; font-size: 10px; color: #ffaa00; font-style: italic; line-height: 1.3;">
                                    Closing line endpoint is fixed at (0,0). To change its slope/direction, edit Point ${pStartIdx + 1}'s coordinates.
                                </p>
                            ` : `
                                <div style="display: flex; gap: 8px; align-items: flex-end; margin-bottom: 8px;">
                                    <div style="flex: 1;">
                                        <label style="font-size: 9px; display: block; color: var(--text-dim); margin-bottom: 2px;">End Pt ${pEndIdx + 1} X (in)</label>
                                        <input type="number" id="inp-selected-end-x" value="${pEnd[0]}" step="0.1" style="width: 100%; box-sizing: border-box; background: #0f131a; color: #fff; border: 1px solid var(--border-color); border-radius: 6px; padding: 4px 8px; font-size: 12px;">
                                    </div>
                                    <div style="flex: 1;">
                                        <label style="font-size: 9px; display: block; color: var(--text-dim); margin-bottom: 2px;">End Pt ${pEndIdx + 1} Y (in)</label>
                                        <input type="number" id="inp-selected-end-y" value="${pEnd[1]}" step="0.1" style="width: 100%; box-sizing: border-box; background: #0f131a; color: #fff; border: 1px solid var(--border-color); border-radius: 6px; padding: 4px 8px; font-size: 12px;">
                                    </div>
                                </div>
                                <div style="display: flex; gap: 6px;">
                                    <button type="button" id="btn-selected-delete" class="btn secondary" style="flex: 1; padding: 6px; font-size: 11px; background: rgba(255,68,68,0.1); color: #ff6b6b; border: 1px solid rgba(255,68,68,0.2); border-radius: 6px; cursor: pointer;">Delete Line</button>
                                    <button type="button" id="btn-selected-save" class="btn success" style="flex: 1; padding: 6px; font-size: 11px; background: #00ff88; color: #000; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">Apply</button>
                                </div>
                            `}
                        </div>
                    `;
                }
                
                let holesListHtml = "";
                if (customPlateHoles.length === 0) {
                    holesListHtml = `<div style="color: var(--text-dim); text-align: center; padding: 4px 0;">No holes defined yet.</div>`;
                } else {
                    customPlateHoles.forEach((h, idx) => {
                        holesListHtml += `<div style="display: flex; justify-content: space-between; align-items: center; padding: 2px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
                            <span>Hole ${idx+1}: Center (${h.x.toFixed(2)}", ${h.y.toFixed(2)}"), Dia: ${h.d.toFixed(3)}"</span>
                            <button type="button" class="btn-remove-hole" data-idx="${idx}" style="background: none; border: none; color: #ff6b6b; cursor: pointer; font-size: 10px; font-weight: bold; padding: 0 4px;">Delete</button>
                        </div>`;
                    });
                }
                
                const nextLineNum = customPlatePoints.length;

                html += `
                <div style="grid-column: span 2; border: 1px solid rgba(0, 212, 255, 0.15); background: rgba(0, 212, 255, 0.02); border-radius: 8px; padding: 12px; font-family: 'Inter', sans-serif;">
                    <h4 style="margin: 0 0 6px 0; color: #00d4ff; font-size: 12px; font-weight: 600; text-transform: uppercase;">1. Custom Plate Outline</h4>
                    <p style="margin: 0 0 8px 0; font-size: 11px; color: var(--text-dim); line-height: 1.3;">
                        Define outline points sequentially. The first point is fixed at (0,0). The last point will connect back to (0,0) automatically to close the plate. Click a segment in the preview or list to edit/delete it.
                    </p>
                    <div id="custom-plate-points-list" style="background: rgba(0,0,0,0.2); border-radius: 6px; padding: 8px; max-height: 150px; overflow-y: auto; margin-bottom: 10px; border: 1px solid rgba(255,255,255,0.05); font-family: 'JetBrains Mono', monospace;">
                        ${pointsListHtml}
                    </div>
                    
                    <div style="display: flex; gap: 8px; align-items: flex-end; margin-bottom: 10px;">
                        <div style="flex: 1;">
                            <label style="font-size: 10px; display: block; color: var(--text-dim); margin-bottom: 2px;">Line ${nextLineNum} Endpoint X (in)</label>
                            <input type="number" id="inp-custom-next-x" value="4.0" step="0.1" style="width: 100%; box-sizing: border-box; background: #0f131a; color: #fff; border: 1px solid var(--border-color); border-radius: 6px; padding: 6px 10px; font-size: 13px;">
                        </div>
                        <div style="flex: 1;">
                            <label style="font-size: 10px; display: block; color: var(--text-dim); margin-bottom: 2px;">Line ${nextLineNum} Endpoint Y (in)</label>
                            <input type="number" id="inp-custom-next-y" value="0.0" step="0.1" style="width: 100%; box-sizing: border-box; background: #0f131a; color: #fff; border: 1px solid var(--border-color); border-radius: 6px; padding: 6px 10px; font-size: 13px;">
                        </div>
                        <button type="button" id="btn-custom-save-point" class="btn success" style="padding: 6px 12px; font-weight: bold; background: #00ff88; color: #000; border: none; border-radius: 6px; cursor: pointer; height: 32px;">Save</button>
                    </div>
                    
                    <div style="display: flex; gap: 8px; margin-bottom: 4px;">
                        <button type="button" id="btn-custom-remove-last" class="btn secondary" style="flex: 1; padding: 6px; font-size: 11px; background: rgba(255,255,255,0.05); color: #fff; border: 1px solid var(--border-color); border-radius: 6px; cursor: pointer;">Remove Last Line</button>
                        <button type="button" id="btn-custom-reset-outline" class="btn secondary" style="flex: 1; padding: 6px; font-size: 11px; background: rgba(255,68,68,0.1); color: #ff6b6b; border: 1px solid rgba(255,68,68,0.2); border-radius: 6px; cursor: pointer;">Reset Outline</button>
                    </div>
                    
                    ${selectionPanelHtml}
                </div>

                <div style="grid-column: span 2; border: 1px solid rgba(0, 212, 255, 0.15); background: rgba(0, 212, 255, 0.02); border-radius: 8px; padding: 12px; font-family: 'Inter', sans-serif;">
                    <h4 style="margin: 0 0 6px 0; color: var(--accent-secondary); font-size: 12px; font-weight: 600; text-transform: uppercase;">2. Plate Holes</h4>
                    <div id="custom-plate-holes-list" style="background: rgba(0,0,0,0.2); border-radius: 6px; padding: 8px; max-height: 100px; overflow-y: auto; margin-bottom: 10px; border: 1px solid rgba(255,255,255,0.05); font-family: 'JetBrains Mono', monospace;">
                        ${holesListHtml}
                    </div>
                    
                    <div style="display: flex; gap: 6px; align-items: flex-end; margin-bottom: 10px;">
                        <div style="flex: 1;">
                            <label style="font-size: 10px; display: block; color: var(--text-dim); margin-bottom: 2px;">Center X</label>
                            <input type="number" id="inp-custom-hole-x" value="2.0" step="0.1" style="width: 100%; box-sizing: border-box; background: #0f131a; color: #fff; border: 1px solid var(--border-color); border-radius: 6px; padding: 6px 10px; font-size: 13px;">
                        </div>
                        <div style="flex: 1;">
                            <label style="font-size: 10px; display: block; color: var(--text-dim); margin-bottom: 2px;">Center Y</label>
                            <input type="number" id="inp-custom-hole-y" value="2.0" step="0.1" style="width: 100%; box-sizing: border-box; background: #0f131a; color: #fff; border: 1px solid var(--border-color); border-radius: 6px; padding: 6px 10px; font-size: 13px;">
                        </div>
                        <div style="flex: 1.2;">
                            <label style="font-size: 10px; display: block; color: var(--text-dim); margin-bottom: 2px;">Diameter</label>
                            <input type="number" id="inp-custom-hole-d" value="0.875" step="0.01" style="width: 100%; box-sizing: border-box; background: #0f131a; color: #fff; border: 1px solid var(--border-color); border-radius: 6px; padding: 6px 10px; font-size: 13px;">
                        </div>
                    </div>
                    <button type="button" id="btn-custom-add-hole" class="btn primary" style="width: 100%; padding: 8px; font-weight: bold; background: #00d4ff; color: #000; border: none; border-radius: 6px; cursor: pointer;">Add Hole</button>
                </div>
                `;
            } else {
                html += generateNumInput('Plate Width (in)', 'w', 12);
                html += generateNumInput('Plate Height (in)', 'h', 12);
                html += generateNumInput('Hole Diameter (in)', 'holeD', 0.875);
                html += generateNumInput('Hole Offset X (in)', 'holeOffsetX', 1.5);
                html += generateNumInput('Hole Offset Y (in)', 'holeOffsetY', 1.5);
            }
        } else if (cat === 'custom_sketch') {
            html += `<div style="grid-column: span 2; border: 1px solid rgba(0, 212, 255, 0.15); background: rgba(0, 212, 255, 0.02); border-radius: 8px; padding: 16px; margin-bottom: 12px; font-family: 'Inter', sans-serif;">
                        <h4 style="margin: 0 0 6px 0; color: var(--accent-primary); font-size: 13px; font-weight: 600; display: flex; align-items: center; gap: 6px;">
                            <i data-lucide="pen-tool" style="width: 14px; height: 14px;"></i> Custom Sketch CAD
                        </h4>
                        <p style="margin: 0; font-size: 11px; color: var(--text-dim); line-height: 1.4;">
                            Precision vector paths reconstructed from your rough sketch. You can instantly export this custom layout as a DXF drawing package!
                        </p>
                     </div>`;
            html += `<div style="grid-column: span 2; margin-top: 12px;">
                        <button type="button" id="btn-edit-sketch" class="btn secondary" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 10px;">
                            <i data-lucide="edit-3" style="width: 14px; height: 14px;"></i> Edit Rough Sketch
                        </button>
                     </div>`;
        }
        html += '</div>';

        // Hole configuration (except for plate, fence, and custom_sketch)
        if (cat !== 'plate' && cat !== 'fence' && cat !== 'custom_sketch') {
            html += `
            <div class="perforation-group">
                <h3>Fabrication / Holes</h3>
                <div class="inputs-grid">
                    ${generateNumInput('Hole Diameter (in)', 'h_d', 0)}
                    ${generateNumInput('Hole Count', 'h_count', 1)}
                    ${generateNumInput('Spacing (in)', 'h_spacing', 2)}
                </div>
            </div>`;
        }

        dynamicInputs.innerHTML = html;

        if (cat === 'custom_sketch') {
            const editBtn = document.getElementById('btn-edit-sketch');
            if (editBtn) {
                editBtn.addEventListener('click', () => {
                    const sketchNavBtn = document.querySelector('[data-mode="sketch"]');
                    if (sketchNavBtn) sketchNavBtn.click();
                });
            }
            if (window.lucide) {
                lucide.createIcons({
                    attrs: { class: 'lucide' },
                    nameAttr: 'data-lucide'
                });
            }
        }

        // Dynamic standard profile sizes bindings for Industrial Fence
        if (cat === 'fence' || cat === 'rails_gates') {
            if (cat === 'fence') {
                setupDynamicProfile('postType', 'postSize', 'grp-postW', 'postW', 'HSS3x3x16GA');
                setupDynamicProfile('topRailType', 'topRailSize', 'grp-topRailH', 'topRailH', 'HSS2x2x14GA');
                setupDynamicProfile('midRailType', 'midRailSize', 'grp-midRailH', 'midRailH', 'HSS1.5x1.5x16GA');
                setupDynamicProfile('botRailType', 'botRailSize', 'grp-botRailH', 'botRailH', 'HSS2x2x14GA');
                setupDynamicProfile('picketType', 'picketSize', 'grp-picketW', 'picketW', 'HSS1x1x16GA');
                setupBasePlateProfile();
                setupMidRailGapToggle();
                setupPostSpacingToggle();
            } else {
                setupDynamicProfile('leftPostType', 'leftPostSize', 'grp-leftPostW', 'leftPostW', 'HSS3x3x16GA');
                setupDynamicProfile('rightPostType', 'rightPostSize', 'grp-rightPostW', 'rightPostW', 'HSS3x3x16GA');
                setupDynamicProfile('midPostType', 'midPostSize', 'grp-midPostW', 'midPostW', 'HSS3x3x16GA');
                setupDynamicProfile('topRailType', 'topRailSize', 'grp-topRailH', 'topRailH', 'HSS2x2x14GA');
                setupDynamicProfile('midRailType', 'midRailSize', 'grp-midRailH', 'midRailH', 'HSS1.5x1.5x16GA');
                setupDynamicProfile('botRailType', 'botRailSize', 'grp-botRailH', 'botRailH', 'HSS2x2x14GA');
                setupDynamicProfile('picketType', 'picketSize', 'grp-picketW', 'picketW', 'HSS1x1x16GA');
                setupBasePlateProfile();
                setupMidRailGapToggle();

                // Dynamic UI toggles & labeling for Rails vs Gates detailing
                const setupRailsGatesToggles = () => {
                    const typeSelect = document.getElementById('inp-railsGatesType');
                    const gatesOptions = document.getElementById('grp-railsgates-gates-options');
                    const railsOptions = document.getElementById('grp-railsgates-rails-options');
                    const kickPlateSection = document.getElementById('grp-railsgates-kickplate-section');
                    const kickPlateSelect = document.getElementById('inp-kickPlate');
                    const kickPlateHGroup = document.getElementById('grp-kickPlateH');
                    
                    if (!typeSelect) return;
                    
                    const updateVisibility = () => {
                        const isGates = typeSelect.value === 'gates';
                        
                        // Dynamically update labels
                        const lenGroup = document.getElementById('inp-length')?.closest('.input-group');
                        if (lenGroup) {
                            const lbl = lenGroup.querySelector('label');
                            if (lbl) lbl.textContent = isGates ? 'Gate Length (in)' : 'Total Length (in)';
                        }
                        const fhGroup = document.getElementById('inp-fenceHeight')?.closest('.input-group');
                        if (fhGroup) {
                            const lbl = fhGroup.querySelector('label');
                            if (lbl) lbl.textContent = isGates ? 'Gate Height (in)' : 'Panel Body Height (in)';
                        }

                        const leftPostTypeGroup = document.getElementById('inp-leftPostType')?.closest('.input-group');
                        if (leftPostTypeGroup) {
                            const lbl = leftPostTypeGroup.querySelector('label');
                            if (lbl) lbl.textContent = isGates ? 'Left Side Runner Profile' : 'Left Corner Post Profile';
                        }
                        const leftPostSizeGroup = document.getElementById('inp-leftPostSize')?.closest('.input-group');
                        if (leftPostSizeGroup) {
                            const lbl = leftPostSizeGroup.querySelector('label');
                            if (lbl) lbl.textContent = isGates ? 'Left Side Runner AISC' : 'Left Corner Post AISC';
                        }
                        const leftPostWGroup = document.getElementById('grp-leftPostW');
                        if (leftPostWGroup) {
                            const lbl = leftPostWGroup.querySelector('label');
                            if (lbl) lbl.textContent = isGates ? 'Left Side Runner Custom (in)' : 'Left Corner Post Custom (in)';
                        }

                        const rightPostTypeGroup = document.getElementById('inp-rightPostType')?.closest('.input-group');
                        if (rightPostTypeGroup) {
                            const lbl = rightPostTypeGroup.querySelector('label');
                            if (lbl) lbl.textContent = isGates ? 'Right Side Runner Profile' : 'Right Corner Post Profile';
                        }
                        const rightPostSizeGroup = document.getElementById('inp-rightPostSize')?.closest('.input-group');
                        if (rightPostSizeGroup) {
                            const lbl = rightPostSizeGroup.querySelector('label');
                            if (lbl) lbl.textContent = isGates ? 'Right Side Runner AISC' : 'Right Corner Post AISC';
                        }
                        const rightPostWGroup = document.getElementById('grp-rightPostW');
                        if (rightPostWGroup) {
                            const lbl = rightPostWGroup.querySelector('label');
                            if (lbl) lbl.textContent = isGates ? 'Right Side Runner Custom (in)' : 'Right Corner Post Custom (in)';
                        }

                        const topRailTypeGroup = document.getElementById('inp-topRailType')?.closest('.input-group');
                        if (topRailTypeGroup) {
                            const lbl = topRailTypeGroup.querySelector('label');
                            if (lbl) lbl.textContent = isGates ? 'Top Runner Profile' : 'Top Rail Profile';
                        }
                        const topRailSizeGroup = document.getElementById('inp-topRailSize')?.closest('.input-group');
                        if (topRailSizeGroup) {
                            const lbl = topRailSizeGroup.querySelector('label');
                            if (lbl) lbl.textContent = isGates ? 'Top Runner AISC Member' : 'Top Rail AISC Member';
                        }
                        const topRailHGroup = document.getElementById('grp-topRailH');
                        if (topRailHGroup) {
                            const lbl = topRailHGroup.querySelector('label');
                            if (lbl) lbl.textContent = isGates ? 'Top Runner Custom Dim (in)' : 'Top Rail Custom Dim (in)';
                        }

                        const midRailTypeGroup = document.getElementById('inp-midRailType')?.closest('.input-group');
                        if (midRailTypeGroup) {
                            const lbl = midRailTypeGroup.querySelector('label');
                            if (lbl) lbl.textContent = isGates ? 'Mid Runner Profile' : 'Mid Rail Profile';
                        }
                        const midRailSizeGroup = document.getElementById('inp-midRailSize')?.closest('.input-group');
                        if (midRailSizeGroup) {
                            const lbl = midRailSizeGroup.querySelector('label');
                            if (lbl) lbl.textContent = isGates ? 'Mid Runner AISC Member' : 'Mid Rail AISC Member';
                        }
                        const midRailHGroup = document.getElementById('grp-midRailH');
                        if (midRailHGroup) {
                            const lbl = midRailHGroup.querySelector('label');
                            if (lbl) lbl.textContent = isGates ? 'Mid Runner Custom Dim (in)' : 'Mid Rail Custom Dim (in)';
                        }
                        const midRailGapGroup = document.getElementById('grp-midRailGap');
                        if (midRailGapGroup) {
                            const lbl = midRailGapGroup.querySelector('label');
                            if (lbl) lbl.textContent = isGates ? 'Mid Runner Gap (in)' : 'Mid Rail Gap (in)';
                        }

                        const botRailTypeGroup = document.getElementById('inp-botRailType')?.closest('.input-group');
                        if (botRailTypeGroup) {
                            const lbl = botRailTypeGroup.querySelector('label');
                            if (lbl) lbl.textContent = isGates ? 'Bottom Runner Profile' : 'Bottom Rail Profile';
                        }
                        const botRailSizeGroup = document.getElementById('inp-botRailSize')?.closest('.input-group');
                        if (botRailSizeGroup) {
                            const lbl = botRailSizeGroup.querySelector('label');
                            if (lbl) lbl.textContent = isGates ? 'Bottom Runner AISC Member' : 'Bottom Rail AISC Member';
                        }
                        const botRailHGroup = document.getElementById('grp-botRailH');
                        if (botRailHGroup) {
                            const lbl = botRailHGroup.querySelector('label');
                            if (lbl) lbl.textContent = isGates ? 'Bottom Runner Custom Dim (in)' : 'Bottom Rail Custom Dim (in)';
                        }

                        // Toggle sections and groupings
                        const postHGroup = document.getElementById('grp-postHeight');
                        const bpGroup = document.getElementById('inp-includeBasePlates')?.closest('.input-group');
                        
                        if (isGates) {
                            if (gatesOptions) gatesOptions.classList.remove('hidden');
                            if (railsOptions) railsOptions.classList.add('hidden');
                            if (kickPlateSection) kickPlateSection.classList.remove('hidden');
                            if (kickPlateSelect && kickPlateSelect.value !== 'none') {
                                if (kickPlateHGroup) kickPlateHGroup.classList.remove('hidden');
                                document.getElementById('grp-kickPlateWeld')?.classList.remove('hidden');
                                document.getElementById('grp-kickPlateSizeGroup')?.classList.remove('hidden');
                            } else {
                                if (kickPlateHGroup) kickPlateHGroup.classList.add('hidden');
                                document.getElementById('grp-kickPlateWeld')?.classList.add('hidden');
                                document.getElementById('grp-kickPlateSizeGroup')?.classList.add('hidden');
                            }
                            
                            // Wire Mesh options
                            const meshSection = document.getElementById('grp-railsgates-mesh-section');
                            const meshTypeSelect = document.getElementById('inp-meshType');
                            const meshFbGroup = document.getElementById('grp-meshFbSize');
                            const meshSizeGroup = document.getElementById('grp-meshSize');
                            if (meshSection) meshSection.classList.remove('hidden');
                            if (meshTypeSelect && meshTypeSelect.value !== 'none') {
                                if (meshFbGroup) meshFbGroup.classList.remove('hidden');
                                if (meshSizeGroup) meshSizeGroup.classList.remove('hidden');
                            } else {
                                if (meshFbGroup) meshFbGroup.classList.add('hidden');
                                if (meshSizeGroup) meshSizeGroup.classList.add('hidden');
                            }

                            // Panic Bar Plate options
                            const panicbarSection = document.getElementById('grp-railsgates-panicbar-section');
                            const panicBarSelect = document.getElementById('inp-panicBarPlate');
                            const pbpGapGroup = document.getElementById('grp-panicBarPlateGap');
                            const pbpWGroup = document.getElementById('grp-panicBarPlateW');
                            const pbpSizeGroup = document.getElementById('grp-panicBarPlateSizeGroup');
                            if (panicbarSection) panicbarSection.classList.remove('hidden');
                            if (panicBarSelect && panicBarSelect.value === 'yes') {
                                if (pbpGapGroup) pbpGapGroup.classList.remove('hidden');
                                if (pbpWGroup) pbpWGroup.classList.remove('hidden');
                                if (pbpSizeGroup) pbpSizeGroup.classList.remove('hidden');
                            } else {
                                if (pbpGapGroup) pbpGapGroup.classList.add('hidden');
                                if (pbpWGroup) pbpWGroup.classList.add('hidden');
                                if (pbpSizeGroup) pbpSizeGroup.classList.add('hidden');
                            }

                            // Hide post options in gates mode
                            if (postHGroup) postHGroup.classList.add('hidden');
                            if (bpGroup) bpGroup.classList.add('hidden');
                            document.getElementById('grp-basePlateSizeGroup')?.classList.add('hidden');
                            document.getElementById('grp-basePlateW')?.classList.add('hidden');
                            document.getElementById('grp-basePlateL')?.classList.add('hidden');
                            document.getElementById('grp-basePlateT')?.classList.add('hidden');
                            document.getElementById('grp-basePlateHoleD')?.classList.add('hidden');
                            document.getElementById('grp-basePlateHoleOffsetX')?.classList.add('hidden');
                            document.getElementById('grp-basePlateHoleOffsetY')?.classList.add('hidden');
                        } else {
                            if (gatesOptions) gatesOptions.classList.remove('hidden');
                            if (railsOptions) railsOptions.classList.remove('hidden');
                            if (kickPlateSection) kickPlateSection.classList.add('hidden');
                            if (kickPlateHGroup) kickPlateHGroup.classList.add('hidden');
                            document.getElementById('grp-kickPlateWeld')?.classList.add('hidden');
                            document.getElementById('grp-kickPlateSizeGroup')?.classList.add('hidden');
                            document.getElementById('grp-railsgates-mesh-section')?.classList.add('hidden');
                            document.getElementById('grp-meshFbSize')?.classList.add('hidden');
                            document.getElementById('grp-meshSize')?.classList.add('hidden');
                            document.getElementById('grp-railsgates-panicbar-section')?.classList.add('hidden');
                            document.getElementById('grp-panicBarPlateGap')?.classList.add('hidden');
                            document.getElementById('grp-panicBarPlateW')?.classList.add('hidden');
                            document.getElementById('grp-panicBarPlateSizeGroup')?.classList.add('hidden');
                            
                            // Show post options in rails mode
                            if (postHGroup) postHGroup.classList.remove('hidden');
                            if (bpGroup) bpGroup.classList.remove('hidden');
                            const active = document.getElementById('inp-includeBasePlates')?.value === 'yes';
                            if (active) {
                                document.getElementById('grp-basePlateSizeGroup')?.classList.remove('hidden');
                                document.getElementById('grp-basePlateW')?.classList.remove('hidden');
                                document.getElementById('grp-basePlateL')?.classList.remove('hidden');
                                document.getElementById('grp-basePlateHoleD')?.classList.remove('hidden');
                                document.getElementById('grp-basePlateHoleOffsetX')?.classList.remove('hidden');
                                document.getElementById('grp-basePlateHoleOffsetY')?.classList.remove('hidden');
                            }
                        }
                    };
                    
                    typeSelect.addEventListener('change', () => {
                        updateVisibility();
                        renderCurrentCAD();
                    });
                    if (kickPlateSelect) {
                        kickPlateSelect.addEventListener('change', () => {
                            updateVisibility();
                            renderCurrentCAD();
                        });
                    }
                    const meshTypeSelect = document.getElementById('inp-meshType');
                    if (meshTypeSelect) {
                        meshTypeSelect.addEventListener('change', () => {
                            const meshSizeInput = document.getElementById('inp-meshSize');
                            if (meshSizeInput) {
                                if (meshTypeSelect.value === 'mesh') {
                                    meshSizeInput.value = "WWM2x2x0.135";
                                } else if (meshTypeSelect.value === 'xf') {
                                    meshSizeInput.value = "XF1/2x#16";
                                }
                            }
                            updateVisibility();
                            renderCurrentCAD();
                        });
                    }
                    const panicBarSelect = document.getElementById('inp-panicBarPlate');
                    if (panicBarSelect) {
                        panicBarSelect.addEventListener('change', () => {
                            updateVisibility();
                            renderCurrentCAD();
                        });
                    }
                    
                    updateVisibility();
                };
                setupRailsGatesToggles();
            }
        }

        const sizeSelector = document.getElementById('shape-size');
        if (sizeSelector && shapes) {
            sizeSelector.addEventListener('change', (e) => {
                const selected = shapes.find(s => s.id === e.target.value);
                if (selected && !selected.custom) {
                    // If this is a fence shape, let's make sure we also trigger dynamic profile updates!
                    Object.keys(selected).forEach(key => {
                        const input = document.getElementById('inp-' + key);
                        if (input) {
                            input.value = selected[key];
                            // Force custom event so change handlers fire
                            input.dispatchEvent(new Event('change'));
                        }
                    });
                    renderCurrentCAD();
                }
            });
        }

        // Bending Options toggle visibility
        const fabMethodSelect = document.getElementById('inp-fabMethod');
        const bendingOptions = document.getElementById('bending-options');
        if (fabMethodSelect) {
            if (bendingOptions) {
                if (fabMethodSelect.value === 'bent') {
                    bendingOptions.classList.remove('hidden');
                } else {
                    bendingOptions.classList.add('hidden');
                }
            }
            fabMethodSelect.addEventListener('change', () => {
                updateInputs();
            });
        }

        // Wire custom plate wizard buttons if active
        if (cat === 'plate' && fabMethodSelect && fabMethodSelect.value === 'custom') {
            const btnSavePoint = document.getElementById('btn-custom-save-point');
            const btnRemoveLast = document.getElementById('btn-custom-remove-last');
            const btnResetOutline = document.getElementById('btn-custom-reset-outline');
            const btnAddHole = document.getElementById('btn-custom-add-hole');
            
            if (btnSavePoint) {
                btnSavePoint.addEventListener('click', () => {
                    const nextXInput = document.getElementById('inp-custom-next-x');
                    const nextYInput = document.getElementById('inp-custom-next-y');
                    if (nextXInput && nextYInput) {
                        const x = parseFloat(nextXInput.value) || 0;
                        const y = parseFloat(nextYInput.value) || 0;
                        customPlatePoints.push([x, y]);
                        updateInputs();
                    }
                });
            }
            if (btnRemoveLast) {
                btnRemoveLast.addEventListener('click', () => {
                    if (customPlatePoints.length > 1) {
                        customPlatePoints.pop();
                        selectedCustomLineIdx = null;
                        updateInputs();
                    }
                });
            }
            if (btnResetOutline) {
                btnResetOutline.addEventListener('click', () => {
                    customPlatePoints = [[0, 0]];
                    selectedCustomLineIdx = null;
                    updateInputs();
                });
            }
            if (btnAddHole) {
                btnAddHole.addEventListener('click', () => {
                    const hXInput = document.getElementById('inp-custom-hole-x');
                    const hYInput = document.getElementById('inp-custom-hole-y');
                    const hDInput = document.getElementById('inp-custom-hole-d');
                    if (hXInput && hYInput && hDInput) {
                        const x = parseFloat(hXInput.value) || 0;
                        const y = parseFloat(hYInput.value) || 0;
                        const d = parseFloat(hDInput.value) || 0.5;
                        customPlateHoles.push({ x, y, d });
                        updateInputs();
                    }
                });
            }
            
            // Wire inline point coordinate edits
            document.querySelectorAll('.inp-edit-custom-pt-x').forEach(inp => {
                inp.addEventListener('input', (e) => {
                    const idx = parseInt(inp.getAttribute('data-idx'));
                    const val = parseFloat(inp.value) || 0;
                    if (customPlatePoints[idx]) {
                        customPlatePoints[idx][0] = val;
                        renderCurrentCAD();
                    }
                });
                inp.addEventListener('change', () => {
                    updateInputs();
                });
            });
            document.querySelectorAll('.inp-edit-custom-pt-y').forEach(inp => {
                inp.addEventListener('input', (e) => {
                    const idx = parseInt(inp.getAttribute('data-idx'));
                    const val = parseFloat(inp.value) || 0;
                    if (customPlatePoints[idx]) {
                        customPlatePoints[idx][1] = val;
                        renderCurrentCAD();
                    }
                });
                inp.addEventListener('change', () => {
                    updateInputs();
                });
            });
            
            // Wire delete button for single line segment
            document.querySelectorAll('.btn-delete-custom-pt').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const idx = parseInt(btn.getAttribute('data-idx'));
                    if (idx > 0 && idx < customPlatePoints.length) {
                        customPlatePoints.splice(idx, 1);
                        selectedCustomLineIdx = null;
                        updateInputs();
                    }
                });
            });
            
            // Wire sidebar row click selection
            document.querySelectorAll('.custom-pt-row').forEach(row => {
                row.addEventListener('click', (e) => {
                    if (e.target.closest('.prevent-row-click')) return;
                    const lineIdx = parseInt(row.getAttribute('data-line-idx'));
                    if (!isNaN(lineIdx)) {
                        selectedCustomLineIdx = (selectedCustomLineIdx === lineIdx) ? null : lineIdx;
                        updateInputs();
                    }
                });
            });

            // Wire selection panel buttons
            const btnSelectedSave = document.getElementById('btn-selected-save');
            const btnSelectedDelete = document.getElementById('btn-selected-delete');
            if (btnSelectedSave) {
                btnSelectedSave.addEventListener('click', () => {
                    const inpX = document.getElementById('inp-selected-end-x');
                    const inpY = document.getElementById('inp-selected-end-y');
                    if (inpX && inpY && selectedCustomLineIdx !== null) {
                        const targetPtIdx = selectedCustomLineIdx + 1;
                        if (targetPtIdx < customPlatePoints.length) {
                            customPlatePoints[targetPtIdx][0] = parseFloat(inpX.value) || 0;
                            customPlatePoints[targetPtIdx][1] = parseFloat(inpY.value) || 0;
                            selectedCustomLineIdx = null;
                            updateInputs();
                        }
                    }
                });
            }
            if (btnSelectedDelete) {
                btnSelectedDelete.addEventListener('click', () => {
                    if (selectedCustomLineIdx !== null) {
                        const targetPtIdx = selectedCustomLineIdx + 1;
                        if (targetPtIdx < customPlatePoints.length) {
                            customPlatePoints.splice(targetPtIdx, 1);
                            selectedCustomLineIdx = null;
                            updateInputs();
                        }
                    }
                });
            }
            
            // Wire remove buttons for existing holes
            document.querySelectorAll('.btn-remove-hole').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const idx = parseInt(e.target.getAttribute('data-idx'));
                    if (!isNaN(idx)) {
                        customPlateHoles.splice(idx, 1);
                        updateInputs();
                    }
                });
            });
        }

        renderCurrentCAD();
    }

    function generateNumInput(label, id, def) {
        return `<div class="input-group">
                    <label>${label}</label>
                    <input type="number" id="inp-${id}" value="${def}" step="0.01">
                </div>`;
    }

    function generateSelectInput(label, id, options, def) {
        return `<div class="input-group">
                    <label>${label}</label>
                    <select id="inp-${id}">
                        ${options.map(o => `<option value="${o.val}" ${o.val === def ? 'selected' : ''}>${o.lbl}</option>`).join('')}
                    </select>
                </div>`;
    }

    async function updatePdfPreview() {
        if (isGeneratingZipBatch) return;
        const activeSet = balconyWizardState.tempSet || balconyWizardState.sets[balconyWizardState.activeSetIdx];
        if (!activeSet) return;
        
        const activeDwg = getActiveBalconyDwgAndMark();
        const style = (activeSet.main && activeSet.main.railStyle) ? activeSet.main.railStyle : 'classical';
        const finishText = 'primer';
        const needFBOM = false;
        
        const flatModel = CadEngine.createCombinedBalconyModel(activeSet, balconyWizardState.activePanelType, false);
        if (!flatModel) return;
        
        try {
            const result = await generateBlueprintPDF(
                activeDwg.drawingNo, 
                'F-202', 
                'J-303', 
                activeDwg.mainMark, 
                '0', 
                finishText, 
                needFBOM, 
                'QUALITY IRONWORKS PROJECT', 
                'APEX BUILDERS', 
                '123 STEEL WAY', 
                'HOUSTON, TX', 
                'ENG', 
                'QIW', 
                false, 
                false, 
                activeSet.quantity || 1, 
                balconyWizardState.activePanelType || 'main',
                true, // isPreviewOnly = true
                flatModel // customModelOverride
            );
            
            if (result && result.blobUrl) {
                const iframe = document.getElementById('pdf-preview-iframe');
                if (iframe) {
                    if (activePdfPreviewUrl) {
                        URL.revokeObjectURL(activePdfPreviewUrl);
                    }
                    activePdfPreviewUrl = result.blobUrl;
                    iframe.src = activePdfPreviewUrl;
                }
            }
        } catch (e) {
            console.error("Failed to generate real-time PDF preview:", e);
        }
    }

    function renderCurrentCAD(isPreview = true) {
        cachedSnapPoints = [];
        const cat = shapeCategory.value;
        const panelType = balconyWizardState.activePanelType || 'main';
        const vals = {};
        
        dynamicInputs.querySelectorAll('input').forEach(inp => {
            const id = inp.id.replace('inp-', '');
            vals[id] = (inp.type === 'text') ? inp.value : (parseFloat(inp.value) || 0);
        });
        dynamicInputs.querySelectorAll('select').forEach(sel => {
            vals[sel.id.replace('inp-', '')] = sel.value;
        });

        const getProfileDimension = (type, size, customVal) => {
            if (type === 'none' || size === 'NONE') return 0;
            if (size === 'CUSTOM') return customVal;
            const shapes = SHAPES_DB[type] || [];
            const selected = shapes.find(s => s.id === size);
            if (selected) {
                if (type === 'hss_rect') return selected.h || selected.w || 0;
                if (type === 'hss_circ') return selected.d || 0;
                if (type === 'w_beam') return selected.d || 0;
                if (type === 'angles') return selected.leg2 || selected.leg1 || 0;
                if (type === 'plate') return selected.t || 0;
            }
            return customVal;
        };

        const getPicketDimension = (type, size, customVal) => {
            if (type === 'none' || size === 'NONE') return 0;
            if (size === 'CUSTOM') return customVal;
            const shapes = SHAPES_DB[type] || [];
            const selected = shapes.find(s => s.id === size);
            if (selected) {
                if (type === 'hss_rect') return selected.w || 0;
                if (type === 'hss_circ') return selected.d || 0;
                if (type === 'w_beam') return selected.bf || 0;
                if (type === 'angles') return selected.leg1 || 0;
                if (type === 'plate') return selected.t || 0;
            }
            return customVal;
        };

        const holeCfg = {
            d: vals.h_d || 0,
            count: parseInt(vals.h_count) || 1,
            spacing: vals.h_spacing || 0
        };

        try {
            if (cat === 'hss_rect') {
                if (vals.fabMethod === 'bent') {
                    currentModel = CadEngine.createCurvedHSSRectMultiView(vals.insideRadius, vals.bendAngle, vals.w, vals.h, vals.t);
                    dimText.textContent = `Bent HSS Rect: R=${vals.insideRadius}" | Angle=${vals.bendAngle}°`;
                } else {
                    currentModel = CadEngine.createHSSRect(vals.w, vals.h, vals.t, holeCfg);
                    dimText.textContent = `W: ${vals.w}" | H: ${vals.h}"`;
                }
            } else if (cat === 'hss_circ') {
                if (vals.fabMethod === 'bent') {
                    currentModel = CadEngine.createCurvedHSSMultiView(vals.insideRadius, vals.bendAngle, vals.d, vals.t);
                    dimText.textContent = `Bent HSS Circ: R=${vals.insideRadius}" | Angle=${vals.bendAngle}°`;
                } else {
                    currentModel = CadEngine.createHSSCirc(vals.d, vals.t, holeCfg);
                    dimText.textContent = `D: ${vals.d}" | T: ${vals.t}"`;
                }
            } else if (cat === 'w_beam') {
                currentModel = CadEngine.createWBeam(vals.d, vals.bf, vals.tf, vals.tw, holeCfg);
                dimText.textContent = `W-Beam: ${vals.d}x${vals.bf}`;
            } else if (cat === 'angles') {
                if (vals.fabMethod === 'bent') {
                    currentModel = CadEngine.createBentPlateMultiView(vals.leg1, vals.leg2, vals.insideRadius, vals.t, vals.bendAngle, vals.leg1, null);
                    dimText.textContent = `Bent Angle: L1=${vals.leg1}" | L2=${vals.leg2}"`;
                } else {
                    currentModel = CadEngine.createAngle(vals.leg1, vals.leg2, vals.t, holeCfg);
                    dimText.textContent = `Angle: ${vals.leg1}x${vals.leg2}x${vals.t}`;
                }
            } else if (cat === 'fence') {
                const postW = getPicketDimension(vals.postType, vals.postSize, vals.postW);
                const topH = getProfileDimension(vals.topRailType, vals.topRailSize, vals.topRailH);
                const midH = getProfileDimension(vals.midRailType, vals.midRailSize, vals.midRailH);
                const botH = getProfileDimension(vals.botRailType, vals.botRailSize, vals.botRailH);
                const pickW = getPicketDimension(vals.picketType, vals.picketSize, vals.picketW);
                const bpW = vals.basePlateW || 6.0;
                const bpH = getProfileDimension('plate', vals.basePlateSize, vals.basePlateT);

                currentModel = CadEngine.createFence(
                    vals.length, 
                    vals.fenceHeight, 
                    vals.postHeight, 
                    vals.topGap !== undefined ? vals.topGap : 2.0,
                    vals.postSpacing, 
                    postW,
                    topH, 
                    midH, 
                    botH, 
                    pickW, 
                    vals.picketSpacing, 
                    vals.slope,
                    vals.postType || 'hss_rect',
                    vals.topRailType || 'plate',
                    vals.midRailType || 'plate',
                    vals.botRailType || 'plate',
                    vals.picketType || 'plate',
                    vals.includeBasePlates || 'no',
                    bpW,
                    bpH,
                    vals.basePlateHoleD !== undefined ? vals.basePlateHoleD : 0.5,
                    vals.basePlateHoleOffsetX !== undefined ? vals.basePlateHoleOffsetX : 0.5,
                    vals.basePlateHoleOffsetY !== undefined ? vals.basePlateHoleOffsetY : 0.25,
                    vals.midRailGap !== undefined ? vals.midRailGap : 12.0
                );
                // Calculate precise sloped rail cut length for user readout
                const noPosts = (vals.postType === 'none' || vals.postHeight === 0 || vals.postSpacing === 0);
                const numSpans = noPosts ? 1 : Math.max(1, Math.round(vals.length / (vals.postSpacing || 1)));
                const actualPostSpacing = noPosts ? vals.length : (vals.length / numSpans);
                const effectivePostW = noPosts ? 0 : postW;
                const clearWidth = actualPostSpacing - effectivePostW;
                
                const rad = vals.slope * Math.PI / 180;
                const cos = Math.cos(rad);
                const slopedWidth = cos > 0.001 ? (clearWidth / cos) : clearWidth;
                const preciseSlopedWidth = Math.round(slopedWidth * 16) / 16;
                
                const formatFraction = (val) => {
                    if (typeof val !== 'number' || isNaN(val)) return '0"';
                    const totalSixteenths = Math.round(val * 16);
                    const totalInches = Math.floor(totalSixteenths / 16);
                    const sixteenths = totalSixteenths % 16;
                    const feet = Math.floor(totalInches / 12);
                    const inches = totalInches % 12;
                    
                    let fractionStr = '';
                    if (sixteenths > 0) {
                        let num = sixteenths, den = 16;
                        while (num % 2 === 0) { num /= 2; den /= 2; }
                        fractionStr = ` ${num}/${den}`;
                    }
                    
                    if (feet > 0) {
                        return `${feet}'-${inches}${fractionStr}"`;
                    } else {
                        if (totalInches === 0 && sixteenths > 0) {
                            return `${fractionStr.trim()}"`;
                        }
                        return `${inches}${fractionStr}"`;
                    }
                };

                dimText.textContent = `Fence: ${Math.round(vals.length/12)}ft x ${Math.round(vals.fenceHeight/12)}ft | Rail Cut Length: ${formatFraction(preciseSlopedWidth)}`;
            } else if (cat === 'rail_catalog') {
                const activeSet = balconyWizardState.tempSet || balconyWizardState.sets[balconyWizardState.activeSetIdx];
                const style = (activeSet.main && activeSet.main.railStyle) ? activeSet.main.railStyle : ((activeSet.leftReturn && activeSet.leftReturn.railStyle) ? activeSet.leftReturn.railStyle : ((activeSet.rightReturn && activeSet.rightReturn.railStyle) ? activeSet.rightReturn.railStyle : 'classical'));
                
                currentModel = CadEngine.createCombinedBalconyModel(activeSet, balconyWizardState.activePanelType, isPreview);

                const activeDwgInfo = getActiveBalconyDwgAndMark();
                const styleLabel = style === 'classical' ? 'Classical Style' : 
                                   style === 'executive' ? 'Executive Style' : 
                                   style === 'classic_custom' ? 'Classic Custom' : 'Executive Custom';
                const currentLength = activeSet[balconyWizardState.activePanelType || 'main']?.length || 120;
                dimText.textContent = `Balcony ${getSetLetter(balconyWizardState.activeSetIdx)} (${activeDwgInfo.drawingNo}) | Mark: ${activeDwgInfo.mainMark} | Style: ${styleLabel} | Length: ${currentLength}"`;
            } else if (cat === 'rails_gates') {
                const isGates = vals.railsGatesType === 'gates';
                const leftPostW = getPicketDimension(vals.leftPostType, vals.leftPostSize, vals.leftPostW);
                const rightPostW = getPicketDimension(vals.rightPostType, vals.rightPostSize, vals.rightPostW);
                const midPostW = getPicketDimension(vals.midPostType, vals.midPostSize, vals.midPostW);
                const topH = getProfileDimension(vals.topRailType, vals.topRailSize, vals.topRailH);
                const midH = getProfileDimension(vals.midRailType, vals.midRailSize, vals.midRailH);
                const botH = getProfileDimension(vals.botRailType, vals.botRailSize, vals.botRailH);
                const pickW = getPicketDimension(vals.picketType, vals.picketSize, vals.picketW);
                const bpW = vals.basePlateW || 6.0;
                const bpH = getProfileDimension('plate', vals.basePlateSize, vals.basePlateT);

                 currentModel = CadEngine.createRailsGates(
                    vals.length,
                    vals.fenceHeight,
                    vals.postHeight,
                    leftPostW,
                    rightPostW,
                    midPostW,
                    parseInt(vals.midPostCount) || 0,
                    topH,
                    midH,
                    botH,
                    pickW,
                    vals.picketSpacing,
                    vals.slope,
                    vals.leftPostType || 'hss_rect',
                    vals.rightPostType || 'hss_rect',
                    vals.midPostType || 'hss_rect',
                    vals.topRailType || 'hss_rect',
                    vals.midRailType || 'none',
                    vals.botRailType || 'hss_rect',
                    vals.picketType || 'hss_rect',
                    vals.includeBasePlates || 'no',
                    bpW,
                    bpH,
                    vals.basePlateHoleD !== undefined ? vals.basePlateHoleD : 0.5,
                    vals.basePlateHoleOffsetX !== undefined ? vals.basePlateHoleOffsetX : 0.5,
                    vals.basePlateHoleOffsetY !== undefined ? vals.basePlateHoleOffsetY : 0.25,
                    vals.midRailGap !== undefined ? vals.midRailGap : 12.0,
                    vals.railsGatesType || 'gates',
                    vals.kickPlate || 'none',
                    vals.kickPlateH !== undefined ? vals.kickPlateH : 12.0,
                    vals.kickPlateWeld || 'inner',
                    vals.kickPlateSize || 'PL11GA',
                    vals.railStyle || 'classical',
                    vals.meshType || 'none',
                    vals.meshFbSize || 'FB1x1/8',
                    vals.meshSize || 'WWM2x2x0.135',
                    vals.panicBarPlate || 'none',
                    vals.panicBarPlateGap !== undefined ? vals.panicBarPlateGap : 36.0,
                    vals.panicBarPlateW !== undefined ? vals.panicBarPlateW : 8.0,
                    vals.panicBarPlateSize || 'PL3/16'
                );
                
                const isExtended = !isGates && (vals.postHeight > vals.fenceHeight);
                let botCutLen = vals.length;
                if (isExtended) {
                    botCutLen = vals.length - leftPostW - rightPostW;
                }
                const rad = vals.slope * Math.PI / 180;
                const cos = Math.cos(rad);
                const slopedBotCutLen = cos > 0.001 ? (botCutLen / cos) : botCutLen;
                const preciseSlopedBotCutLen = Math.round(slopedBotCutLen * 16) / 16;
                
                const formatFraction = (val) => {
                    if (typeof val !== 'number' || isNaN(val)) return '0"';
                    const totalSixteenths = Math.round(val * 16);
                    const totalInches = Math.floor(totalSixteenths / 16);
                    const sixteenths = totalSixteenths % 16;
                    const feet = Math.floor(totalInches / 12);
                    const inches = totalInches % 12;
                    
                    let fractionStr = '';
                    if (sixteenths > 0) {
                        let num = sixteenths, den = 16;
                        while (num % 2 === 0) { num /= 2; den /= 2; }
                        fractionStr = ` ${num}/${den}`;
                    }
                    
                    if (feet > 0) {
                        return `${feet}'-${inches}${fractionStr}"`;
                    } else {
                        if (totalInches === 0 && sixteenths > 0) {
                            return `${fractionStr.trim()}"`;
                        }
                        return `${inches}${fractionStr}"`;
                    }
                };

                dimText.textContent = `Rails & Gates: ${Math.round(vals.length/12)}ft x ${Math.round(vals.fenceHeight/12)}ft | Top Rail: ${formatFraction(vals.length)} | Bot Rail Cut: ${formatFraction(preciseSlopedBotCutLen)}`;
            } else if (cat === 'plate') {
                if (vals.fabMethod === 'bent') {
                    currentModel = CadEngine.createBentPlateMultiView(vals.leg1, vals.leg2, vals.insideRadius, vals.t || 0.25, vals.bendAngle, vals.w, null);
                    dimText.textContent = `Bent Plate: L1=${vals.leg1}" | L2=${vals.leg2}" | W=${vals.w}"`;
                } else if (vals.fabMethod === 'custom') {
                    currentModel = CadEngine.createCustomPlate(customPlatePoints, customPlateHoles);
                    dimText.textContent = `Custom Plate: ${customPlatePoints.length} Vertices | ${customPlateHoles.length} Holes`;
                } else {
                    currentModel = CadEngine.createPlate(vals.w, vals.h, vals.holeD, vals.holeOffsetX, vals.holeOffsetY);
                    dimText.textContent = `Plate: ${vals.w}" x ${vals.h}"`;
                }
            } else if (cat === 'welded_assembly') {
                const selectedSizeId = document.getElementById('shape-size')?.value || 'HSS1.5x1.5x14GA';
                const selectedHss = SHAPES_DB['hss_rect'].find(s => s.id === selectedSizeId) || { w: 1.5, h: 1.5, t: 0.0747 };
                currentModel = CadEngine.createWeldedUFrame(vals.w, vals.h, vals.depth, selectedHss.w, selectedHss.h, selectedHss.t);
                dimText.textContent = `Welded U-Frame: ${vals.w}" x ${vals.h}" x ${vals.depth}" (${selectedSizeId})`;
            } else if (cat === 'custom_sketch') {
                if (customSketchStrokes) {
                    currentModel = CadEngine.createFromStrokes(customSketchStrokes, sketchCanvas.width, sketchCanvas.height);
                    dimText.textContent = `Custom Sketch CAD: ${customSketchStrokes.length} Drawing Strokes`;
                } else {
                    currentModel = { models: {} };
                    dimText.textContent = `Custom Sketch CAD: Empty`;
                }
            }

            const svg = CadEngine.renderSVG(currentModel);
            svgContainer.innerHTML = svg;

            const svgElement = svgContainer.querySelector('svg');
            if (svgElement) {
                // Apply solid opaque fills to cover plates so pickets behind them are hidden
                const fillSolidPlates = (svgEl, color) => {
                    const selectors = [
                        '.kickPlate', '[id*="kickPlate"]', 'g[id$="kickPlate"]',
                        '.panicBarPlate', '[id*="panicBarPlate"]', 'g[id$="panicBarPlate"]',
                        'g[id*="FB"]', 'g[id*="fb"]', 'g[id$="meshFrame"] > g'
                    ];
                    selectors.forEach(sel => {
                        svgEl.querySelectorAll(sel).forEach(g => {
                            g.querySelectorAll('path, rect, polygon').forEach(p => {
                                p.setAttribute('fill', color);
                                p.setAttribute('fill-opacity', '1');
                            });
                        });
                    });
                };
                fillSolidPlates(svgElement, '#0b132b');

                if (currentMode !== 'draft') {
                    injectCADAnnotations(svgElement);
                }
                if (tweakModeActive) {
                    injectDragHandles(svgElement);
                }
            }
            
            // Re-apply zoom to the newly rendered SVG
            applyZoom();
            updateBOMPreview();
            if (pdfPreviewModeActive) {
                updatePdfPreview();
            }
        } catch (e) {
            console.error("CAD Engine Error:", e);
            alert("Diagnostic Alert - CAD Engine Error:\n" + e.message + "\n\nStack Trace:\n" + e.stack);
        }
    }

    function injectSketchProcessingModal(onCustom, onParametric) {
        // Remove existing if any
        const existing = document.getElementById('sketch-processing-modal');
        if (existing) existing.remove();

        const modalHtml = `
        <div id="sketch-processing-modal" class="modal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.6); backdrop-filter: blur(4px); z-index: 9999; display: flex; align-items: center; justify-content: center;">
            <div class="modal-content" style="background: #11151c; border: 1px solid #222d3d; border-radius: 12px; padding: 24px; max-width: 500px; width: 90%; box-shadow: 0 10px 30px rgba(0,0,0,0.5); color: #fff; font-family: 'Inter', sans-serif;">
                <h3 style="margin-top: 0; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; font-size: 18px; font-weight: 600; color: #00d4ff;">
                    <i data-lucide="cpu" style="width: 20px; height: 20px;"></i> Sketch Processing Options
                </h3>
                <p style="color: #8c9ba5; font-size: 13px; line-height: 1.5; margin-bottom: 20px;">
                    Select how you would like to process your drawing / reference image:
                </p>
                
                <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 24px;">
                    <!-- Option 1: Custom Vector CAD -->
                    <div id="sketch-opt-custom" style="border: 1px solid #222d3d; background: rgba(255,255,255,0.02); border-radius: 8px; padding: 16px; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.borderColor='#00ffff'; this.style.background='rgba(0, 255, 255, 0.03)'" onmouseout="this.style.borderColor='#222d3d'; this.style.background='rgba(255,255,255,0.02)'">
                        <h4 style="margin: 0 0 4px 0; font-size: 14px; font-weight: 600; color: #fff; display: flex; align-items: center; gap: 6px;">
                            <i data-lucide="pen-tool" style="width: 16px; height: 16px; color: #00ffff;"></i>
                            Extract Custom Vector CAD (Custom DXF)
                        </h4>
                        <p style="margin: 0; font-size: 11px; color: #8c9ba5; line-height: 1.4;">
                            Reconstructs your exact drawing layout into precision vector lines. Fits perfectly in a centered CAD viewport and exports natively to DXF.
                        </p>
                    </div>
                    
                    <!-- Option 2: AI Shape Recognition -->
                    <div id="sketch-opt-parametric" style="border: 1px solid #222d3d; background: rgba(255,255,255,0.02); border-radius: 8px; padding: 16px; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.borderColor='#00d4ff'; this.style.background='rgba(0, 212, 255, 0.03)'" onmouseout="this.style.borderColor='#222d3d'; this.style.background='rgba(255,255,255,0.02)'">
                        <h4 style="margin: 0 0 4px 0; font-size: 14px; font-weight: 600; color: #fff; display: flex; align-items: center; gap: 6px;">
                            <i data-lucide="sparkles" style="width: 16px; height: 16px; color: #00d4ff;"></i>
                            AI Parametric Shape Match (Standard Product)
                        </h4>
                        <p style="margin: 0; font-size: 11px; color: #8c9ba5; line-height: 1.4;">
                            Analyzes your drawing structure and maps it to a standard industrial fence, HSS Rect, or HSS Circ so you can edit standard parameters.
                        </p>
                    </div>
                </div>
                
                <div style="display: flex; justify-content: flex-end; gap: 12px; border-top: 1px solid #222d3d; padding-top: 16px;">
                    <button id="sketch-proc-cancel" class="btn secondary" style="padding: 8px 16px; background: transparent; border: 1px solid #222d3d; color: #8c9ba5; border-radius: 6px; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.color='#fff'; this.style.borderColor='#8c9ba5'" onmouseout="this.style.color='#8c9ba5'; this.style.borderColor='#222d3d'">Cancel</button>
                </div>
            </div>
        </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Render Lucide icons
        if (window.lucide) {
            lucide.createIcons({
                attrs: { class: 'lucide' },
                nameAttr: 'data-lucide'
            });
        }

        // Event listeners
        const modalEl = document.getElementById('sketch-processing-modal');
        
        document.getElementById('sketch-proc-cancel').addEventListener('click', () => {
            modalEl.remove();
        });

        document.getElementById('sketch-opt-custom').addEventListener('click', () => {
            modalEl.remove();
            onCustom();
        });

        document.getElementById('sketch-opt-parametric').addEventListener('click', () => {
            modalEl.remove();
            onParametric();
        });
    }

    async function interpretSketch() {
        if (processor.strokes.length === 0 && !processor.bgImage) {
            alert("Please draw some lines or upload a reference image first!");
            return;
        }

        overlay.classList.remove('hidden');
        
        // Artificial delay for "processing" feel
        await new Promise(r => setTimeout(r, 1500));
        
        const result = await processor.process();
        overlay.classList.add('hidden');

        if (!result) return;
        
        // If there are actual sketch strokes, show the options modal
        if (processor.strokes.length > 0) {
            injectSketchProcessingModal(
                () => {
                    // Option 1: Custom Vector CAD
                    customSketchStrokes = JSON.parse(JSON.stringify(processor.strokes));
                    document.querySelector('[data-mode="shapes"]').click();
                    shapeCategory.value = 'custom_sketch';
                    updateInputs();
                    renderCurrentCAD();
                },
                () => {
                    // Option 2: AI Parametric Match
                    document.querySelector('[data-mode="shapes"]').click();
                    shapeCategory.value = result.type;
                    updateInputs();
                    
                    Object.keys(result.params).forEach(key => {
                        const inp = document.getElementById('inp-' + key);
                        if (inp) inp.value = result.params[key];
                    });
                    
                    renderCurrentCAD();
                }
            );
        } else {
            // No strokes, just loaded reference image. Direct to parametric.
            document.querySelector('[data-mode="shapes"]').click();
            shapeCategory.value = result.type;
            updateInputs();
            Object.keys(result.params).forEach(key => {
                const inp = document.getElementById('inp-' + key);
                if (inp) inp.value = result.params[key];
            });
            renderCurrentCAD();
        }
    }

    function injectDxfModal() {
        if (document.getElementById('dxf-export-modal')) return;

        const modalHtml = `
        <div id="dxf-export-modal" class="modal hidden" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.6); backdrop-filter: blur(4px); z-index: 9999; display: flex; align-items: center; justify-content: center;">
            <div class="modal-content" style="background: #11151c; border: 1px solid #222d3d; border-radius: 12px; padding: 24px; max-width: 500px; width: 90%; box-shadow: 0 10px 30px rgba(0,0,0,0.5); color: #fff; font-family: 'Inter', sans-serif;">
                <h3 style="margin-top: 0; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; font-size: 18px; font-weight: 600; color: #00d4ff;">
                    <i data-lucide="download" style="width: 20px; height: 20px;"></i> Export CAD DXF Drawings
                </h3>
                <p style="color: #8c9ba5; font-size: 13px; line-height: 1.5; margin-bottom: 20px;">
                    Select how you would like to download your detailed 2D CAD DXF drawings:
                </p>
                
                <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 24px;">
                    <!-- Option 1: Consolidated Assembly -->
                    <div id="dxf-opt-assembly" style="border: 1px solid #222d3d; background: rgba(255,255,255,0.02); border-radius: 8px; padding: 16px; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.borderColor='#00d4ff'; this.style.background='rgba(0, 212, 255, 0.03)'" onmouseout="this.style.borderColor='#222d3d'; this.style.background='rgba(255,255,255,0.02)'">
                        <h4 style="margin: 0 0 4px 0; font-size: 14px; font-weight: 600; color: #fff;">Consolidated Assembly DXF</h4>
                        <p style="margin: 0; font-size: 11px; color: #8c9ba5; line-height: 1.4;">Download a single drawing containing the entire welded panel, rails, pickets, and posts as a single DXF file.</p>
                    </div>
                    
                    <!-- Option 2: Detailed Piece Drawings -->
                    <div id="dxf-opt-pieces" style="border: 1px solid #222d3d; background: rgba(255,255,255,0.02); border-radius: 8px; padding: 16px; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.borderColor='#00ffff'; this.style.background='rgba(0, 255, 255, 0.03)'" onmouseout="this.style.borderColor='#222d3d'; this.style.background='rgba(255,255,255,0.02)'">
                        <h4 style="margin: 0 0 4px 0; font-size: 14px; font-weight: 600; color: #fff;">Separate Detailing DXFs</h4>
                        <p style="margin: 0; font-size: 11px; color: #8c9ba5; line-height: 1.4;">Download the consolidated assembly DXF plus separate detailed 2D DXF files for the Main Mark and each unique Piece Mark centered at [0,0] (quantity = 1 per piece drawing).</p>
                    </div>
                </div>
                
                <div style="display: flex; justify-content: flex-end; gap: 12px; border-top: 1px solid #222d3d; padding-top: 16px;">
                    <button id="dxf-close" class="btn secondary" style="padding: 8px 16px; background: transparent; border: 1px solid #222d3d; color: #8c9ba5; border-radius: 6px; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.color='#fff'; this.style.borderColor='#8c9ba5'" onmouseout="this.style.color='#8c9ba5'; this.style.borderColor='#222d3d'">Cancel</button>
                </div>
            </div>
        </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Render lucide icons inside injected modal if loaded
        if (window.lucide) {
            lucide.createIcons({
                attrs: {
                    class: 'lucide'
                },
                nameAttr: 'data-lucide'
            });
        }

        // Add events
        document.getElementById('dxf-close').addEventListener('click', () => {
            document.getElementById('dxf-export-modal').classList.add('hidden');
        });
        
        document.getElementById('dxf-opt-assembly').addEventListener('click', () => {
            document.getElementById('dxf-export-modal').classList.add('hidden');
            triggerAssemblyDxfDownload();
        });

        document.getElementById('dxf-opt-pieces').addEventListener('click', () => {
            document.getElementById('dxf-export-modal').classList.add('hidden');
            triggerPiecesDxfDownload();
        });
    }

    function triggerAssemblyDxfDownload() {
        if (!currentModel) return;
        const dxf = CadEngine.exportDXF(currentModel);
        if (!dxf) return;
        const blob = new Blob([dxf], { type: 'application/dxf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `SteelDraft_Assembly_${document.getElementById('exp-drawingNo')?.value || 'D-101'}.dxf`;
        a.click();
        URL.revokeObjectURL(url);
    }

    async function triggerPiecesDxfDownload() {
        if (!currentModel) return;
        const cat = shapeCategory.value;
        const drawingNo = document.getElementById('exp-drawingNo')?.value || 'D-101';
        const mainMarkUpper = (document.getElementById('exp-mainMark')?.value || '100').toUpperCase();

        const useZip = typeof JSZip !== 'undefined';
        const zip = useZip ? new JSZip() : null;

        // If not using zip, download assembly individually first
        if (!useZip) {
            triggerAssemblyDxfDownload();
        } else {
            // If using zip, we add Assembly DXF to the zip package
            const assemblyDxf = CadEngine.exportDXF(currentModel);
            if (assemblyDxf) {
                zip.file(`SteelDraft_Assembly_${drawingNo}.dxf`, assemblyDxf);
            }
        }

        // Delay helper to prevent browser download throttling
        const delay = ms => new Promise(res => setTimeout(res, ms));

        // Get inputs safely
        const vals = {};
        if (dynamicInputs) {
            dynamicInputs.querySelectorAll('input').forEach(inp => {
                if (inp.id) {
                    const id = inp.id.replace('inp-', '');
                    vals[id] = (inp.type === 'text') ? inp.value : (parseFloat(inp.value) || 0);
                }
            });
            dynamicInputs.querySelectorAll('select').forEach(sel => {
                if (sel.id) vals[sel.id.replace('inp-', '')] = sel.value;
            });
        }

        const cleanDrawingNo = drawingNo.toUpperCase().replace(/[^A-Z0-9]/g, '');
        const mainMarkCode = cleanDrawingNo + 'M1';
        const dxfPieces = [];

        // Check if the current model has submodels
        const hasPosts = currentModel.models && currentModel.models.posts && Object.keys(currentModel.models.posts.models || {}).length > 0;
        const hasPickets = currentModel.models && currentModel.models.pickets && Object.keys(currentModel.models.pickets.models || {}).length > 0;
        const hasRails = currentModel.models && currentModel.models.rails;
        const hasBasePlates = currentModel.models && currentModel.models.basePlates && Object.keys(currentModel.models.basePlates.models || {}).length > 0;

        const getProfileDimension = (type, size, customVal) => {
            if (type === 'none' || size === 'NONE') return 0;
            if (size === 'CUSTOM') return customVal;
            const shapes = SHAPES_DB[type] || [];
            const selected = shapes.find(s => s.id === size);
            if (selected) {
                if (type === 'hss_rect') return selected.h || selected.w || 0;
                if (type === 'hss_circ') return selected.d || 0;
                if (type === 'w_beam') return selected.d || 0;
                if (type === 'angles') return selected.leg2 || selected.leg1 || 0;
                if (type === 'plate') return selected.t || 0;
            }
            return customVal;
        };

        const getPicketDimension = (type, size, customVal) => {
            if (type === 'none' || size === 'NONE') return 0;
            if (size === 'CUSTOM') return customVal;
            const shapes = SHAPES_DB[type] || [];
            const selected = shapes.find(s => s.id === size);
            if (selected) {
                if (type === 'hss_rect') return selected.w || 0;
                if (type === 'hss_circ') return selected.d || 0;
                if (type === 'w_beam') return selected.bf || 0;
                if (type === 'angles') return selected.leg1 || 0;
                if (type === 'plate') return selected.t || 0;
            }
            return customVal;
        };

        if (cat === 'welded_assembly') {
            const selectedSizeId = document.getElementById('shape-size')?.value || 'HSS1.5x1.5x14GA';
            const selectedHss = SHAPES_DB['hss_rect'].find(s => s.id === selectedSizeId) || { w: 1.5, h: 1.5, t: 0.0747 };
            const W = vals.w || 12.0;
            const H = vals.h || 8.0;
            const D = vals.depth || 18.0;
            
            // 1. Bottom Front (Main Mark)
            const bottomModel = CadEngine.createHSSRect(W, selectedHss.h, selectedHss.t);
            dxfPieces.push({ mark: mainMarkCode, model: bottomModel });
            
            // 2. Vertical Leg
            const legModel = CadEngine.createHSSRect(selectedHss.w, H, selectedHss.t);
            dxfPieces.push({ mark: `b${cleanDrawingNo.toUpperCase()}`, model: legModel });
            
            // 3. Side Runner
            const sideModel = CadEngine.createHSSRect(selectedHss.w, D, selectedHss.t);
            dxfPieces.push({ mark: `a${cleanDrawingNo.toUpperCase()}`, model: sideModel });
            
            // 4. Back Runner
            const backModel = CadEngine.createHSSRect(W, selectedHss.h, selectedHss.t);
            dxfPieces.push({ mark: `c${cleanDrawingNo.toUpperCase()}`, model: backModel });
        } else if (['hss_rect', 'hss_circ', 'angles', 'plate'].includes(cat) && vals.fabMethod === 'bent') {
            let bentPiece;
            if (cat === 'plate' || cat === 'angles') {
                bentPiece = CadEngine.createBentPlateSideView(vals.leg1, vals.leg2, vals.t || 0.25, vals.insideRadius);
            } else if (cat === 'hss_circ') {
                bentPiece = { paths: { insideArc: new makerjs.paths.Arc([0,0], vals.insideRadius - vals.d/2, 180, 180 + vals.bendAngle), outsideArc: new makerjs.paths.Arc([0,0], vals.insideRadius + vals.d/2, 180, 180 + vals.bendAngle) } };
            } else {
                bentPiece = { paths: { insideArc: new makerjs.paths.Arc([0,0], vals.insideRadius - vals.h/2, 180, 180 + vals.bendAngle), outsideArc: new makerjs.paths.Arc([0,0], vals.insideRadius + vals.h/2, 180, 180 + vals.bendAngle) } };
            }
            if (window.makerjs) makerjs.model.center(bentPiece);
            dxfPieces.push({ mark: mainMarkCode, model: bentPiece });
        } else if (currentMode === 'draft') {
            // Group draftMembers by unique properties (same as BOM grouping)
            const groups = [];
            draftMembers.forEach(m => {
                const lenSixteenths = Math.round(m.length * 16);
                const normalizedLen = lenSixteenths / 16;
                
                let key = `${m.type}_${m.size}_${normalizedLen}`;
                if (m.size === 'CUSTOM') {
                    if (m.type === 'hss_rect') key += `_${m.params.w}_${m.params.h}_${m.params.t}`;
                    else if (m.type === 'hss_circ') key += `_${m.params.d}_${m.params.t}`;
                    else if (m.type === 'w_beam') key += `_${m.params.d}_${m.params.bf}_${m.params.tf}_${m.params.tw}`;
                    else if (m.type === 'angles') key += `_${m.params.leg1}_${m.params.leg2}_${m.params.t}`;
                    else if (m.type === 'plate') key += `_${m.params.w}_${m.params.h}_${m.params.t}`;
                }
                
                const existing = groups.find(g => g.key === key);
                if (existing) {
                    existing.qty += 1;
                    existing.members.push(m);
                } else {
                    groups.push({
                        key: key,
                        type: m.type,
                        size: m.size,
                        length: normalizedLen,
                        params: m.params,
                        label: m.label || "",
                        qty: 1,
                        members: [m]
                    });
                }
            });
            
            // Sort groups by length descending, longest becomes Main Mark
            groups.sort((a, b) => b.length - a.length);
            
            let pieceIndex = 11;
            groups.forEach((g, idx) => {
                let markCode;
                if (idx === 0) {
                    markCode = mainMarkCode;
                } else {
                    const shapeType = g.type.includes('hss') ? 'hss' : (g.type.includes('w_beam') ? 'w' : (g.type.includes('angles') ? 'angle' : 'plate'));
                    markCode = `${shapeType}${cleanDrawingNo}${pieceIndex++}`;
                }
                
                const firstMember = g.members[0];
                if (currentModel.models && currentModel.models[firstMember.id]) {
                    const originalModel = currentModel.models[firstMember.id];
                    const singleModel = JSON.parse(JSON.stringify(originalModel));
                    
                    singleModel.origin = [0, 0];
                    if (window.makerjs) makerjs.model.center(singleModel);
                    
                    dxfPieces.push({ mark: markCode.toUpperCase(), model: singleModel });
                }
            });
        } else if (cat === 'rail_catalog') {
            const isLoose = (balconyWizardState.activePanelType === 'loosePost');
            const style = vals.railStyle || 'classical';
            const props = getResolvedPanelProperties(vals, style);
            
            // Helper to add centered model
            const addPiece = (mark, modelSource) => {
                if (!modelSource) return;
                const singleModel = JSON.parse(JSON.stringify(modelSource));
                singleModel.origin = [0, 0];
                if (window.makerjs) makerjs.model.center(singleModel);
                dxfPieces.push({ mark: mark, model: singleModel });
            };

            if (isLoose) {
                let includeBasePlates = props ? props.includeBasePlates : 'no';
                const isMeshStyle = (style === 'urban_balcony' || style === 'villa_balcony' || style === 'urban_custom' || style === 'villa_custom');
                
                // 1. Loose Post (aDrawingNo)
                if (currentModel.models.posts && currentModel.models.posts.models.loosePost) {
                    addPiece(`a${cleanDrawingNo.toUpperCase()}`, currentModel.models.posts.models.loosePost);
                }
                // 2. Base Plate (bDrawingNo)
                if (includeBasePlates === 'yes' && currentModel.models.basePlates && currentModel.models.basePlates.models.bpLoose) {
                    addPiece(`b${cleanDrawingNo.toUpperCase()}`, currentModel.models.basePlates.models.bpLoose);
                }
                // 3. Flat Bar Attachment (cDrawingNo)
                if (isMeshStyle && currentModel.models.posts && currentModel.models.posts.models.flatBarAttachment) {
                    addPiece(`c${cleanDrawingNo.toUpperCase()}`, currentModel.models.posts.models.flatBarAttachment);
                }
            } else {
                let picketType = (style === 'classical' || style === 'executive') ? 'hss_rect' : ((style === 'urban_balcony' || style === 'villa_balcony' || style === 'urban_custom' || style === 'villa_custom') ? 'none' : (vals.picketType || 'hss_rect'));
                let postW = (style === 'classical' || style === 'executive') ? 1.5 : getPicketDimension(vals.postType, vals.postSize, vals.postW || 1.5);
                let picketW = (style === 'classical' || style === 'executive') ? 0.5 : getPicketDimension(vals.picketType, vals.picketSize, vals.picketW || 0.5);
                let picketSpacing = (style === 'classical') ? 4.0 : (style === 'executive' ? 4.0 : (vals.picketSpacing || 4.0));
                let midPostCount = (vals.midPosts === 'default' || vals.midPosts === 'yes') ? Math.max(0, Math.ceil(vals.length / 48) - 1) : ((vals.midPosts === 'custom' || vals.midPosts === 'custom_standard') ? (parseInt(vals.midPostCount) || 0) : 0);
                
                const finalPicketsCount = getPicketPositions(
                    style,
                    vals.length,
                    (vals.leftPost === 'yes' ? postW : 0),
                    (vals.rightPost === 'yes' ? postW : 0),
                    picketW,
                    picketSpacing,
                    midPostCount,
                    postW
                ).length;

                let charCode = 97; // 'a'
                let mainMarkAssigned = false;
                const getMark = (isPresent) => {
                    if (!isPresent) return null;
                    if (!mainMarkAssigned) {
                        mainMarkAssigned = true;
                        return mainMarkUpper;
                    }
                    const m = String.fromCharCode(charCode) + cleanDrawingNo;
                    charCode++;
                    return m.toUpperCase();
                };

                const topMark = getMark(vals.topRailType !== 'none');
                const botMark = getMark(vals.botRailType !== 'none');
                const midMark = getMark(style === 'executive' || style === 'villa_balcony' || style === 'villa_custom' || style === 'executive_custom' || (style.includes('custom') && vals.midRailType !== 'none'));
                const leftMark = getMark(vals.leftPost === 'yes' && vals.postType !== 'none');
                const rightMark = getMark(vals.rightPost === 'yes' && vals.postType !== 'none');
                const midPostMark = getMark(vals.midPosts !== 'none' && midPostCount > 0 && vals.postType !== 'none');
                const picketMark = getMark(picketType !== 'none' && finalPicketsCount > 0);
                const isMeshStyle = (style === 'urban_balcony' || style === 'villa_balcony' || style === 'urban_custom' || style === 'villa_custom');
                const meshFbMark = getMark(isMeshStyle);
                const bpMark = getMark(vals.includeBasePlates === 'yes');

                // 1. Top Runner / Rail
                if (topMark && currentModel.models.rails && currentModel.models.rails.models.topRail) {
                    addPiece(topMark, currentModel.models.rails.models.topRail);
                }
                // 2. Bottom Runner / Rail
                if (botMark && currentModel.models.rails && currentModel.models.rails.models.botRail) {
                    addPiece(botMark, currentModel.models.rails.models.botRail);
                }
                // 3. Mid Runner / Rail (if present)
                if (midMark && currentModel.models.rails && currentModel.models.rails.models.midRail) {
                    addPiece(midMark, currentModel.models.rails.models.midRail);
                }
                // 4. Left Runner / Post
                if (leftMark && currentModel.models.posts && currentModel.models.posts.models.leftPost) {
                    addPiece(leftMark, currentModel.models.posts.models.leftPost);
                }
                // 5. Right Runner / Post
                if (rightMark && currentModel.models.posts && currentModel.models.posts.models.rightPost) {
                    addPiece(rightMark, currentModel.models.posts.models.rightPost);
                }
                // 6. Mid Posts (if present)
                if (midPostMark && midPostCount > 0 && currentModel.models.posts) {
                    const keys = Object.keys(currentModel.models.posts.models).filter(k => k.startsWith('midPost_'));
                    if (keys.length > 0) {
                        addPiece(midPostMark, currentModel.models.posts.models[keys[0]]);
                    }
                }
                // 7. Pickets (if present)
                if (picketMark && currentModel.models.pickets && currentModel.models.pickets.models) {
                    const keys = Object.keys(currentModel.models.pickets.models);
                    if (keys.length > 0) {
                        addPiece(picketMark, currentModel.models.pickets.models[keys[0]]);
                    }
                }
                // 8. Base Plates (if present)
                if (bpMark && vals.includeBasePlates === 'yes' && currentModel.models.basePlates && currentModel.models.basePlates.models) {
                    const keys = Object.keys(currentModel.models.basePlates.models);
                    if (keys.length > 0) {
                        addPiece(bpMark, currentModel.models.basePlates.models[keys[0]]);
                    }
                }
                // 9. Flat Bar Frame or Mesh Panel
                if (isMeshStyle && meshFbMark) {
                    if (currentModel.models.meshFrame && currentModel.models.meshFrame.models) {
                        const keys = Object.keys(currentModel.models.meshFrame.models);
                        if (keys.length > 0) {
                            addPiece(meshFbMark, currentModel.models.meshFrame.models[keys[0]]);
                        }
                    }
                }
            }
        } else if (cat === 'rails_gates') {
            const isGates = vals.railsGatesType === 'gates';
            const leftPostW = getPicketDimension(vals.leftPostType, vals.leftPostSize, vals.leftPostW);
            const rightPostW = getPicketDimension(vals.rightPostType, vals.rightPostSize, vals.rightPostW);
            const midPostW = getPicketDimension(vals.midPostType, vals.midPostSize, vals.midPostW);
            const pickW = getPicketDimension(vals.picketType, vals.picketSize, vals.picketW);
            const midPostCount = parseInt(vals.midPostCount) || 0;

            const finalPicketsCount = getPicketPositions(
                vals.railStyle || 'classical',
                vals.length,
                leftPostW,
                rightPostW,
                pickW,
                vals.picketSpacing,
                midPostCount,
                midPostW
            ).length;

            let charCode = 97; // 'a'
            let mainMarkAssigned = false;
            const getMark = (isPresent) => {
                if (!isPresent) return null;
                if (!mainMarkAssigned) {
                    mainMarkAssigned = true;
                    return mainMarkCode;
                }
                const m = String.fromCharCode(charCode) + cleanDrawingNo;
                charCode++;
                return m;
            };

            const topMark = getMark(vals.topRailType !== 'none');
            const botMark = getMark(vals.botRailType !== 'none');
            const midMark = getMark(vals.midRailType !== 'none');
            const leftMark = getMark(vals.leftPostType !== 'none');
            const rightMark = getMark(vals.rightPostType !== 'none');
            const midPostMark = getMark(!isGates && midPostCount > 0 && vals.midPostType !== 'none');
            const picketMark = getMark(vals.picketType !== 'none' && finalPicketsCount > 0);
            const kpMark = getMark(isGates && vals.kickPlate && vals.kickPlate !== 'none');
            const bpMark = getMark(!isGates && vals.includeBasePlates === 'yes');

            // Helper to add centered model
            const addPiece = (mark, modelSource) => {
                if (!modelSource) return;
                const singleModel = JSON.parse(JSON.stringify(modelSource));
                singleModel.origin = [0, 0];
                if (window.makerjs) makerjs.model.center(singleModel);
                dxfPieces.push({ mark: mark, model: singleModel });
            };

            // 1. Top Runner / Rail
            if (topMark && currentModel.models.rails && currentModel.models.rails.models.topRail) {
                addPiece(topMark, currentModel.models.rails.models.topRail);
            }
            // 2. Bottom Runner / Rail
            if (botMark && currentModel.models.rails && currentModel.models.rails.models.botRail) {
                addPiece(botMark, currentModel.models.rails.models.botRail);
            }
            // 3. Mid Runner / Rail (if present)
            if (midMark && currentModel.models.rails && currentModel.models.rails.models.midRail) {
                addPiece(midMark, currentModel.models.rails.models.midRail);
            }
            // 4. Left Runner / Post
            if (leftMark && currentModel.models.posts && currentModel.models.posts.models.leftPost) {
                addPiece(leftMark, currentModel.models.posts.models.leftPost);
            }
            // 5. Right Runner / Post
            if (rightMark && currentModel.models.posts && currentModel.models.posts.models.rightPost) {
                addPiece(rightMark, currentModel.models.posts.models.rightPost);
            }
            // 6. Mid Posts (if in rails mode and present)
            if (midPostMark && !isGates && midPostCount > 0 && currentModel.models.posts) {
                const keys = Object.keys(currentModel.models.posts.models).filter(k => k.startsWith('midPost_'));
                if (keys.length > 0) {
                    addPiece(midPostMark, currentModel.models.posts.models[keys[0]]);
                }
            }
            // 7. Pickets (if present)
            if (picketMark && currentModel.models.pickets && currentModel.models.pickets.models) {
                const keys = Object.keys(currentModel.models.pickets.models);
                if (keys.length > 0) {
                    addPiece(picketMark, currentModel.models.pickets.models[keys[0]]);
                }
            }
            // 8. Kick Plate (if present)
            if (kpMark && currentModel.models.kickPlate && currentModel.models.kickPlate.models && currentModel.models.kickPlate.models.plate) {
                addPiece(kpMark, currentModel.models.kickPlate.models.plate);
            }
            // 9. Base Plates (if in rails mode and present)
            if (bpMark && !isGates && vals.includeBasePlates === 'yes' && currentModel.models.basePlates && currentModel.models.basePlates.models) {
                const keys = Object.keys(currentModel.models.basePlates.models);
                if (keys.length > 0) {
                    addPiece(bpMark, currentModel.models.basePlates.models[keys[0]]);
                }
            }
        } else if (cat === 'fence') {
            const postW = getPicketDimension(vals.postType, vals.postSize, vals.postW);
            const pickW = getPicketDimension(vals.picketType, vals.picketSize, vals.picketW);
            const noPosts = (vals.postType === 'none' || vals.postHeight === 0 || vals.postSpacing === 0);
            const numSpans = noPosts ? 1 : Math.max(1, Math.round(vals.length / (vals.postSpacing || 1)));
            const actualPostSpacing = noPosts ? vals.length : (vals.length / numSpans);
            const effectivePostW = noPosts ? 0 : postW;
            const clearWidth = actualPostSpacing - effectivePostW;
            const numPickets = vals.picketSpacing > 0 ? Math.floor((clearWidth - pickW) / vals.picketSpacing) : 0;
            const totalPickets = numPickets * numSpans;

            let charCode = 97; // 'a'
            let mainMarkAssigned = false;
            const getMark = (isPresent) => {
                if (!isPresent) return null;
                if (!mainMarkAssigned) {
                    mainMarkAssigned = true;
                    return mainMarkCode;
                }
                const m = String.fromCharCode(charCode) + cleanDrawingNo;
                charCode++;
                return m;
            };

            const topMark = getMark(vals.topRailType !== 'none');
            const postMark = getMark(!noPosts && vals.postType !== 'none');
            const botMark = getMark(vals.botRailType !== 'none');
            const midMark = getMark(vals.midRailType !== 'none');
            const picketMark = getMark(vals.picketType !== 'none' && totalPickets > 0);
            const bpMark = getMark(vals.includeBasePlates === 'yes' && !noPosts);

            // Helper to add centered model
            const addPiece = (mark, modelSource) => {
                if (!modelSource) return;
                const singleModel = JSON.parse(JSON.stringify(modelSource));
                singleModel.origin = [0, 0];
                if (window.makerjs) makerjs.model.center(singleModel);
                dxfPieces.push({ mark: mark, model: singleModel });
            };

            // 1. Top Rail
            if (topMark && hasRails && currentModel.models.rails.models.top) {
                const keys = Object.keys(currentModel.models.rails.models.top.models || {});
                if (keys.length > 0) {
                    addPiece(topMark, currentModel.models.rails.models.top.models[keys[0]]);
                }
            }
            // 2. Post
            if (postMark && hasPosts) {
                const keys = Object.keys(currentModel.models.posts.models || {});
                if (keys.length > 0) {
                    addPiece(postMark, currentModel.models.posts.models[keys[0]]);
                }
            }
            // 3. Bottom Rail
            if (botMark && hasRails && currentModel.models.rails.models.bottom) {
                const keys = Object.keys(currentModel.models.rails.models.bottom.models || {});
                if (keys.length > 0) {
                    addPiece(botMark, currentModel.models.rails.models.bottom.models[keys[0]]);
                }
            }
            // 4. Mid Rail
            if (midMark && hasRails && currentModel.models.rails.models.middle) {
                const keys = Object.keys(currentModel.models.rails.models.middle.models || {});
                if (keys.length > 0) {
                    addPiece(midMark, currentModel.models.rails.models.middle.models[keys[0]]);
                }
            }
            // 5. Pickets
            if (picketMark && hasPickets) {
                const keys = Object.keys(currentModel.models.pickets.models || {});
                if (keys.length > 0) {
                    addPiece(picketMark, currentModel.models.pickets.models[keys[0]]);
                }
            }
            // 6. Base Plates
            if (bpMark && hasBasePlates) {
                const keys = Object.keys(currentModel.models.basePlates.models || {});
                if (keys.length > 0) {
                    addPiece(bpMark, currentModel.models.basePlates.models[keys[0]]);
                }
            }
        }

        // Fallback: If dxfPieces is empty, add the currentModel itself centered as a piece drawing
        if (dxfPieces.length === 0) {
            const singleShape = JSON.parse(JSON.stringify(currentModel));
            singleShape.origin = [0, 0];
            if (window.makerjs) makerjs.model.center(singleShape);
            dxfPieces.push({ mark: mainMarkCode, model: singleShape });
        }

        if (useZip) {
            // Compile separate DXFs in the ZIP
            for (const item of dxfPieces) {
                const dxf = CadEngine.exportDXF(item.model);
                if (dxf) {
                    zip.file(`SteelDraft_Piece_${item.mark}.dxf`, dxf);
                }
            }

            // Generate and download zip
            try {
                const content = await zip.generateAsync({ type: 'blob' });
                const url = URL.createObjectURL(content);
                const a = document.createElement('a');
                a.href = url;
                a.download = `SteelDraft_DXF_Package_${drawingNo}.zip`;
                a.click();
                URL.revokeObjectURL(url);
            } catch (e) {
                console.error("ZIP generation failed, falling back to individual downloads:", e);
                // Fallback to individual downloads
                for (const item of dxfPieces) {
                    await delay(250);
                    const dxf = CadEngine.exportDXF(item.model);
                    if (!dxf) continue;
                    const blob = new Blob([dxf], { type: 'application/dxf' });
                    const url = URL.createObjectURL(blob);
                    const aInner = document.createElement('a');
                    aInner.href = url;
                    aInner.download = `SteelDraft_Piece_${item.mark}.dxf`;
                    aInner.click();
                    URL.revokeObjectURL(url);
                }
            }
        } else {
            // Original fallback to individual downloads
            for (const item of dxfPieces) {
                await delay(250);
                const dxf = CadEngine.exportDXF(item.model);
                if (!dxf) continue;
                const blob = new Blob([dxf], { type: 'application/dxf' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `SteelDraft_Piece_${item.mark}.dxf`;
                a.click();
                URL.revokeObjectURL(url);
            }
        }
    }

    function downloadDXF() {
        if (!currentModel) return;
        injectDxfModal();
        document.getElementById('dxf-export-modal').classList.remove('hidden');
    }

    function compileActiveExportSheets() {
        const getResolvedPanelProperties = (panel, style) => {
            return window.getResolvedPanelProperties(panel, style);
        };

        const getPanelSignature = (panel, style, panelType, setIdx) => {
            const resolved = getResolvedPanelProperties(panel, style);
            if (!resolved) return "";
            const normalized = { ...resolved };
            if (normalized.leftPost !== normalized.rightPost) {
                normalized.leftPost = 'yes';
                normalized.rightPost = 'no';
            }
            normalized.panelType = panelType;
            normalized.midPostSpacings = panel.midPostSpacings || null;
            return "panel_" + JSON.stringify(normalized);
        };

        const getLoosePostSignature = (panel, style, setIdx) => {
            const resolved = getResolvedPanelProperties(panel, style);
            if (!resolved) return "";
            let pType = resolved.postType;
            let pW = resolved.postW;
            let pH = resolved.postH;
            let pT = resolved.postT;
            if (pType === 'none' || pType === 'no') {
                pType = 'hss_rect';
                pW = 1.5;
                pH = 1.5;
                pT = 0.1196;
            }
            const looseProps = {
                style: style, // Add style here to prevent combining loose posts of different styles
                pHeight: resolved.pHeight,
                postType: pType,
                postW: pW,
                postH: pH,
                postT: pT,
                topRailH: resolved.topRailH,
                includeBasePlates: resolved.includeBasePlates,
                bpW: resolved.bpW,
                bpL: resolved.bpL,
                bpH: resolved.bpH,
                bpHoleD: resolved.bpHoleD,
                bpHoleOffsetX: resolved.bpHoleOffsetX,
                bpHoleOffsetY: resolved.bpHoleOffsetY
            };
            return "loosepost_" + JSON.stringify(looseProps);
        };

        const allPanelItems = [];
        balconyWizardState.sets.forEach((set, setIdx) => {
            const baseDwg = set.drawingBase || (setIdx + 1).toString();
            const style = (set.main && set.main.railStyle) ? set.main.railStyle : ((set.leftReturn && set.leftReturn.railStyle) ? set.leftReturn.railStyle : ((set.rightReturn && set.rightReturn.railStyle) ? set.rightReturn.railStyle : 'classical'));
            const setQty = set.quantity || 1;

            // 1. Main Balcony
            if (set.main) {
                allPanelItems.push({
                    id: `set${setIdx}_main`,
                    setIdx: setIdx,
                    panelType: 'main',
                    panelData: set.main,
                    originalDrawingNo: baseDwg + ".0",
                    originalMainMark: baseDwg + "FB",
                    quantity: setQty,
                    signature: getPanelSignature(set.main, style, 'main', setIdx),
                    sheetName: `Balcony ${String.fromCharCode(65 + setIdx)} Main Rail`
                });

                // Check for loose posts
                const postType = set.main.postType || 'hss_rect';
                let looseQty = 0;
                if (set.main.leftPost === 'none' || set.main.leftPost === 'no') {
                    if (set.leftReturn) {
                        if (set.leftReturn.rightPost === 'none' || set.leftReturn.rightPost === 'no') looseQty++;
                    } else {
                        looseQty++;
                    }
                }
                if (set.main.rightPost === 'none' || set.main.rightPost === 'no') {
                    if (set.rightReturn) {
                        if (set.rightReturn.leftPost === 'none' || set.rightReturn.leftPost === 'no') looseQty++;
                    } else {
                        looseQty++;
                    }
                }
                if (set.leftReturn && (set.leftReturn.leftPost === 'none' || set.leftReturn.leftPost === 'no')) {
                    looseQty++;
                }
                if (set.rightReturn && (set.rightReturn.rightPost === 'none' || set.rightReturn.rightPost === 'no')) {
                    looseQty++;
                }

                if (looseQty > 0) {
                    allPanelItems.push({
                        id: `set${setIdx}_loosePost`,
                        setIdx: setIdx,
                        panelType: 'loosePost',
                        panelData: set.main,
                        originalDrawingNo: baseDwg + ".1",
                        originalMainMark: baseDwg + "P1",
                        quantity: looseQty * setQty,
                        signature: getLoosePostSignature(set.main, style, setIdx),
                        sheetName: `Loose Corner Post`
                    });
                }
            }

            // 2. Left Return
            if (set.leftReturn) {
                allPanelItems.push({
                    id: `set${setIdx}_leftReturn`,
                    setIdx: setIdx,
                    panelType: 'leftReturn',
                    panelData: set.leftReturn,
                    originalDrawingNo: baseDwg + ".2",
                    originalMainMark: baseDwg + "LB",
                    quantity: setQty,
                    signature: getPanelSignature(set.leftReturn, style, 'leftReturn', setIdx),
                    sheetName: `Balcony ${String.fromCharCode(65 + setIdx)} Left Return`
                });
            }

            // 3. Right Return
            if (set.rightReturn) {
                const rightDwgNo = set.leftReturn ? (baseDwg + ".3") : (baseDwg + ".2");
                allPanelItems.push({
                    id: `set${setIdx}_rightReturn`,
                    setIdx: setIdx,
                    panelType: 'rightReturn',
                    panelData: set.rightReturn,
                    originalDrawingNo: rightDwgNo,
                    originalMainMark: baseDwg + "RB",
                    quantity: setQty,
                    signature: getPanelSignature(set.rightReturn, style, 'rightReturn', setIdx),
                    sheetName: `Balcony ${String.fromCharCode(65 + setIdx)} Right Return`
                });
            }
        });

        // Group panels by identical physical parameters (signature)
        const groupsBySignature = {};
        allPanelItems.forEach(item => {
            if (!groupsBySignature[item.signature]) {
                groupsBySignature[item.signature] = [];
            }
            groupsBySignature[item.signature].push(item);
        });

        // Assign Masters and map relations
        Object.keys(groupsBySignature).forEach(sig => {
            const group = groupsBySignature[sig];
            const master = group[0];
            const totalQty = group.reduce((sum, item) => sum + item.quantity, 0);

            group.forEach(item => {
                item.masterDrawingNo = master.originalDrawingNo;
                item.masterMainMark = master.originalMainMark;
                item.isMaster = (item.id === master.id);
                item.groupTotalQty = totalQty;
            });
        });

        return allPanelItems.filter(item => item.isMaster);
    }

    function renderSheetManagerList(sheets) {
        const listContainer = document.getElementById('wiz-sheet-list');
        if (!listContainer) return;
        listContainer.innerHTML = '';
        
        sheets.forEach(sheet => {
            const isExcluded = !balconyWizardState.activeExportSheets.includes(sheet.originalDrawingNo);
            
            const div = document.createElement('div');
            div.className = 'sheet-item';
            div.style.display = 'flex';
            div.style.alignItems = 'center';
            div.style.justifyContent = 'space-between';
            div.style.padding = '8px 12px';
            div.style.background = 'rgba(255, 255, 255, 0.03)';
            div.style.border = '1px solid rgba(255, 255, 255, 0.08)';
            div.style.borderRadius = '6px';
            div.style.fontSize = '11px';
            div.style.marginBottom = '6px';
            
            const labelSpan = document.createElement('span');
            labelSpan.style.fontWeight = '500';
            labelSpan.innerHTML = `<strong style="color: var(--accent-primary); margin-right: 6px;">DWG ${sheet.originalDrawingNo}</strong> ${sheet.sheetName} (${sheet.groupTotalQty} REQD)`;
            if (isExcluded) {
                labelSpan.style.textDecoration = 'line-through';
                labelSpan.style.opacity = '0.5';
            }
            
            const actionBtn = document.createElement('button');
            actionBtn.type = 'button';
            if (isExcluded) {
                actionBtn.className = 'btn success';
                actionBtn.style.padding = '4px 10px';
                actionBtn.style.fontSize = '10px';
                actionBtn.style.background = '#00ff88';
                actionBtn.style.color = '#000';
                actionBtn.style.border = 'none';
                actionBtn.style.borderRadius = '4px';
                actionBtn.style.cursor = 'pointer';
                actionBtn.style.fontWeight = 'bold';
                actionBtn.innerHTML = 'Add';
                actionBtn.addEventListener('click', () => {
                    balconyWizardState.activeExportSheets.push(sheet.originalDrawingNo);
                    renderSheetManagerList(sheets);
                });
            } else {
                actionBtn.className = 'btn danger';
                actionBtn.style.padding = '4px 10px';
                actionBtn.style.fontSize = '10px';
                actionBtn.style.background = '#ff4d4d';
                actionBtn.style.color = '#fff';
                actionBtn.style.border = 'none';
                actionBtn.style.borderRadius = '4px';
                actionBtn.style.cursor = 'pointer';
                actionBtn.style.fontWeight = 'bold';
                actionBtn.innerHTML = 'Delete';
                actionBtn.addEventListener('click', () => {
                    balconyWizardState.activeExportSheets = balconyWizardState.activeExportSheets.filter(no => no !== sheet.originalDrawingNo);
                    renderSheetManagerList(sheets);
                });
            }
            
            div.appendChild(labelSpan);
            div.appendChild(actionBtn);
            listContainer.appendChild(div);
        });
    }

    // PDF Export Modal & Form Bindings
    const openExportModal = () => {
        if (currentMode === 'draft' && draftMembers.length === 0) {
            alert("Draft workspace is empty!");
            return;
        }
        
        const modal = document.getElementById('export-modal');
        if (modal) {
            modal.classList.remove('hidden');
            
            // Reset fields
            document.getElementById('exp-custom-finish-group').classList.add('hidden');
            document.getElementById('exp-finish').value = 'primer';
            document.getElementById('exp-customFinish').value = '';

            const drawingNoInput = document.getElementById('exp-drawingNo');
            const mainMarkInput = document.getElementById('exp-mainMark');
            if (drawingNoInput && mainMarkInput) {
                const updateMainMark = () => {
                    if (shapeCategory.value === 'rail_catalog') {
                        const info = getActiveBalconyDwgAndMark();
                        drawingNoInput.value = info.drawingNo;
                        mainMarkInput.value = info.mainMark;
                        return;
                    }
                    const drawingNo = drawingNoInput.value.trim() || 'D-101';
                    const cleanDrawingNo = drawingNo.toUpperCase().replace(/[^A-Z0-9]/g, '');
                    mainMarkInput.value = cleanDrawingNo + 'M1';
                };
                drawingNoInput.removeEventListener('input', updateMainMark);
                if (shapeCategory.value !== 'rail_catalog') {
                    drawingNoInput.addEventListener('input', updateMainMark);
                }
                updateMainMark();
                mainMarkInput.readOnly = true;
            }
            
            // Add custom finish toggles
            const finishSelect = document.getElementById('exp-finish');
            const customFinishGroup = document.getElementById('exp-custom-finish-group');
            
            if (finishSelect && customFinishGroup) {
                const toggleFinish = () => {
                    if (finishSelect.value === 'custom') {
                        customFinishGroup.classList.remove('hidden');
                        document.getElementById('exp-customFinish').required = true;
                    } else {
                        customFinishGroup.classList.add('hidden');
                        document.getElementById('exp-customFinish').required = false;
                    }
                };
                finishSelect.removeEventListener('change', toggleFinish);
                finishSelect.addEventListener('change', toggleFinish);
            }

            // Sheet Manager UI setup
            const sheetManager = document.getElementById('wiz-sheet-manager-container');
            if (sheetManager) {
                if (shapeCategory.value === 'rail_catalog') {
                    sheetManager.classList.remove('hidden');
                    const sheets = compileActiveExportSheets();
                    
                    // Initialize the active list if not already set or if sheets changed
                    if (!balconyWizardState.activeExportSheets) {
                        balconyWizardState.activeExportSheets = sheets.map(s => s.originalDrawingNo);
                    } else {
                        const currentDwgNos = sheets.map(s => s.originalDrawingNo);
                        balconyWizardState.activeExportSheets = balconyWizardState.activeExportSheets.filter(no => currentDwgNos.includes(no));
                        sheets.forEach(s => {
                            if (!balconyWizardState.activeExportSheets.includes(s.originalDrawingNo)) {
                                balconyWizardState.activeExportSheets.push(s.originalDrawingNo);
                            }
                        });
                    }
                    
                    renderSheetManagerList(sheets);
                } else {
                    sheetManager.classList.add('hidden');
                }
            }
        }
    };

    document.getElementById('generate-pdf').addEventListener('click', openExportModal);
    const genDraftPdfBtn = document.getElementById('generate-draft-pdf');
    if (genDraftPdfBtn) {
        genDraftPdfBtn.addEventListener('click', openExportModal);
    }

    const cancelBtn = document.getElementById('exp-cancel');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            const modal = document.getElementById('export-modal');
            if (modal) modal.classList.add('hidden');
        });
    }

    const submitBtn = document.getElementById('exp-submit');
    if (submitBtn) {
        submitBtn.addEventListener('click', async () => {
            const drawingNo = document.getElementById('exp-drawingNo').value.trim() || 'D-101';
            const fabNo = document.getElementById('exp-fabNo').value.trim() || 'F-202';
            const jobNo = document.getElementById('exp-jobNo').value.trim() || 'J-303';
            const mainMark = document.getElementById('exp-mainMark').value.trim() || '100';
            const revision = document.getElementById('exp-revision').value.trim() || '0';
            const finishSelect = document.getElementById('exp-finish').value;
            const customFinish = document.getElementById('exp-customFinish') ? document.getElementById('exp-customFinish').value.trim() : '';
            const needFBOM = document.getElementById('exp-needFBOM') ? document.getElementById('exp-needFBOM').checked : true;
            
            const jobName = document.getElementById('exp-jobName').value.trim() || 'QUALITY IRONWORKS PROJECT';
            const gc = document.getElementById('exp-gc').value.trim() || 'APEX BUILDERS';
            const address = document.getElementById('exp-address').value.trim() || '123 STEEL WAY';
            const cityState = document.getElementById('exp-cityState').value.trim() || 'HOUSTON, TX';
            const drawnBy = document.getElementById('exp-drawnBy').value.trim() || 'ENG';
            const checkedBy = document.getElementById('exp-checkedBy').value.trim() || 'QIW';
            
            let finishText = finishSelect === 'custom' ? customFinish : (finishSelect === 'primer' ? 'Primer' : 'Raw');
            if (!finishText) finishText = 'Raw';
            
            // Hide modal
            const modal = document.getElementById('export-modal');
            if (modal) modal.classList.add('hidden');
            
            if (shapeCategory.value === 'rail_catalog') {
                await generateBalconyZipBatch(fabNo, jobNo, revision, finishText, needFBOM, jobName, gc, address, cityState, drawnBy, checkedBy);
            } else {
                await generateBlueprintPDF(drawingNo, fabNo, jobNo, mainMark, revision, finishText, needFBOM, jobName, gc, address, cityState, drawnBy, checkedBy, false, false, 1, 'main', false, currentModel);
            }
        });
    }

    async function generateBalconyZipBatch(fabNo, jobNo, revision, finishText, needFBOM, jobName, gc, address, cityState, drawnBy, checkedBy) {
        const overlay = document.getElementById('processing-overlay');
        const origSetIdx = balconyWizardState.activeSetIdx;
        const origPanelType = balconyWizardState.activePanelType;
        const origTempSet = balconyWizardState.tempSet;
        isGeneratingZipBatch = true;
        
        try {
            if (overlay) {
                overlay.classList.remove('hidden');
                const statusText = overlay.querySelector('p') || overlay;
                if (statusText) statusText.textContent = "Compiling Balcony Set Drawings & BOM...";
            }

            saveCurrentInputsToActivePanel();
            balconyWizardState.tempSet = null;

        const zip = new JSZip();
        const masterBomRows = [];

        // Helper functions for signatures and properties resolution
        const getResolvedPanelProperties = (panel, style) => {
            return window.getResolvedPanelProperties(panel, style);
        };

        const getPanelSignature = (panel, style, panelType, setIdx) => {
            const resolved = getResolvedPanelProperties(panel, style);
            if (!resolved) return "";
            const normalized = { ...resolved };
            if (normalized.leftPost !== normalized.rightPost) {
                normalized.leftPost = 'yes';
                normalized.rightPost = 'no';
            }
            normalized.panelType = panelType;
            normalized.midPostSpacings = panel.midPostSpacings || null;
            return "panel_" + JSON.stringify(normalized);
        };

        const getLoosePostSignature = (panel, style, setIdx) => {
            const resolved = getResolvedPanelProperties(panel, style);
            if (!resolved) return "";
            let pType = resolved.postType;
            let pW = resolved.postW;
            let pH = resolved.postH;
            let pT = resolved.postT;
            if (pType === 'none' || pType === 'no') {
                pType = 'hss_rect';
                pW = 1.5;
                pH = 1.5;
                pT = 0.1196;
            }
            const looseProps = {
                style: style, // Add style here to prevent combining loose posts of different styles
                pHeight: resolved.pHeight,
                postType: pType,
                postW: pW,
                postH: pH,
                postT: pT,
                topRailH: resolved.topRailH,
                includeBasePlates: resolved.includeBasePlates,
                bpW: resolved.bpW,
                bpL: resolved.bpL,
                bpH: resolved.bpH,
                bpHoleD: resolved.bpHoleD,
                bpHoleOffsetX: resolved.bpHoleOffsetX,
                bpHoleOffsetY: resolved.bpHoleOffsetY
            };
            return "loosepost_" + JSON.stringify(looseProps);
        };

        // Build list of all panels to compile across all sets
        const allPanelItems = [];
        balconyWizardState.sets.forEach((set, setIdx) => {
            const baseDwg = set.drawingBase || (setIdx + 1).toString();
            const style = (set.main && set.main.railStyle) ? set.main.railStyle : ((set.leftReturn && set.leftReturn.railStyle) ? set.leftReturn.railStyle : ((set.rightReturn && set.rightReturn.railStyle) ? set.rightReturn.railStyle : 'classical'));
            const setQty = set.quantity || 1;

            // 1. Main Balcony
            if (set.main) {
                allPanelItems.push({
                    id: `set${setIdx}_main`,
                    setIdx: setIdx,
                    panelType: 'main',
                    panelData: set.main,
                    originalDrawingNo: baseDwg + ".0",
                    originalMainMark: baseDwg + "FB",
                    quantity: setQty,
                    signature: getPanelSignature(set.main, style, 'main', setIdx)
                });

                // Check for loose posts (corner posts set to 'none' on main balcony)
                const postType = set.main.postType || 'hss_rect';
                let looseQty = 0;
                if (set.main.leftPost === 'none' || set.main.leftPost === 'no') {
                    if (set.leftReturn) {
                        if (set.leftReturn.rightPost === 'none' || set.leftReturn.rightPost === 'no') looseQty++;
                    } else {
                        looseQty++;
                    }
                }
                if (set.main.rightPost === 'none' || set.main.rightPost === 'no') {
                    if (set.rightReturn) {
                        if (set.rightReturn.leftPost === 'none' || set.rightReturn.leftPost === 'no') looseQty++;
                    } else {
                        looseQty++;
                    }
                }
                if (set.leftReturn && (set.leftReturn.leftPost === 'none' || set.leftReturn.leftPost === 'no')) {
                    looseQty++;
                }
                if (set.rightReturn && (set.rightReturn.rightPost === 'none' || set.rightReturn.rightPost === 'no')) {
                    looseQty++;
                }

                if (looseQty > 0) {
                    allPanelItems.push({
                        id: `set${setIdx}_loosePost`,
                        setIdx: setIdx,
                        panelType: 'loosePost',
                        panelData: set.main,
                        originalDrawingNo: baseDwg + ".1",
                        originalMainMark: baseDwg + "P1",
                        quantity: looseQty * setQty,
                        signature: getLoosePostSignature(set.main, style, setIdx)
                    });
                }
            }

            // 2. Left Return
            if (set.leftReturn) {
                allPanelItems.push({
                    id: `set${setIdx}_leftReturn`,
                    setIdx: setIdx,
                    panelType: 'leftReturn',
                    panelData: set.leftReturn,
                    originalDrawingNo: baseDwg + ".2",
                    originalMainMark: baseDwg + "LB",
                    quantity: setQty,
                    signature: getPanelSignature(set.leftReturn, style, 'leftReturn', setIdx)
                });
            }

            // 3. Right Return
            if (set.rightReturn) {
                const rightDwgNo = set.leftReturn ? (baseDwg + ".3") : (baseDwg + ".2");
                allPanelItems.push({
                    id: `set${setIdx}_rightReturn`,
                    setIdx: setIdx,
                    panelType: 'rightReturn',
                    panelData: set.rightReturn,
                    originalDrawingNo: rightDwgNo,
                    originalMainMark: baseDwg + "RB",
                    quantity: setQty,
                    signature: getPanelSignature(set.rightReturn, style, 'rightReturn', setIdx)
                });
            }
        });

        // Group panels by identical physical parameters (signature) on the entire list first
        const initialGroupsBySignature = {};
        allPanelItems.forEach(item => {
            if (!initialGroupsBySignature[item.signature]) {
                initialGroupsBySignature[item.signature] = [];
            }
            initialGroupsBySignature[item.signature].push(item);
        });

        // Assign Masters and map relations on the entire list first
        Object.keys(initialGroupsBySignature).forEach(sig => {
            const group = initialGroupsBySignature[sig];
            const master = group[0];
            const totalQty = group.reduce((sum, item) => sum + item.quantity, 0);

            group.forEach(item => {
                item.masterDrawingNo = master.originalDrawingNo;
                item.masterMainMark = master.originalMainMark;
                item.isMaster = (item.id === master.id);
                item.groupTotalQty = totalQty;
            });
        });

        // Filter out excluded sheets if selected by the user in Sheet Manager (based on master drawing number)
        let filteredPanelItems = allPanelItems;
        if (balconyWizardState.activeExportSheets) {
            filteredPanelItems = allPanelItems.filter(item => balconyWizardState.activeExportSheets.includes(item.masterDrawingNo));
        }

        // Re-group filtered panels to get correct consolidated quantities for the selected set of sheets
        const groupsBySignature = {};
        filteredPanelItems.forEach(item => {
            if (!groupsBySignature[item.signature]) {
                groupsBySignature[item.signature] = [];
            }
            groupsBySignature[item.signature].push(item);
        });

        // Re-assign group quantities for filtered items
        Object.keys(groupsBySignature).forEach(sig => {
            const group = groupsBySignature[sig];
            const master = group[0];
            const totalQty = group.reduce((sum, item) => sum + item.quantity, 0);

            group.forEach(item => {
                item.masterDrawingNo = master.originalDrawingNo;
                item.masterMainMark = master.originalMainMark;
                item.isMaster = (item.id === master.id);
                item.groupTotalQty = totalQty;
            });
        });

        // Generate drawing PDFs for Master items only
        const uniqueMasterItems = filteredPanelItems.filter(item => item.isMaster);
        for (const p of uniqueMasterItems) {
            if (p.panelType === 'loosePost') {
                balconyWizardState.activeSetIdx = p.setIdx;
                balconyWizardState.activePanelType = 'main'; // loose post uses main inputs
                loadActivePanelToInputs();

                const resolved = getResolvedPanelProperties(p.panelData, p.panelData.railStyle || 'classical');
                if (resolved.postType === 'none' || resolved.postType === 'no') {
                    resolved.postType = 'hss_rect';
                    resolved.postW = 1.5;
                    resolved.postH = 1.5;
                    resolved.postT = 0.1196;
                }
                currentModel = CadEngine.createLoosePostModel(
                    resolved.postW, resolved.pHeight, resolved.topRailH, resolved.postType, resolved.postT,
                    resolved.includeBasePlates, resolved.bpW, resolved.bpL, resolved.bpH,
                    resolved.bpHoleD, resolved.bpHoleOffsetX, resolved.bpHoleOffsetY,
                    p.panelData.railStyle || 'classical', resolved.fHeight, resolved.botRailH, resolved.midRailType, resolved.midRailGap, resolved.midRailH
                );

                // Render manually to svgContainer
                svgContainer.innerHTML = CadEngine.renderClean2DSVG(currentModel);
                await new Promise(resolve => setTimeout(resolve, 150));
            } else {
                balconyWizardState.activeSetIdx = p.setIdx;
                balconyWizardState.activePanelType = p.panelType;
                loadActivePanelToInputs();
                renderCurrentCAD(false); // Render flat 2D panel!

                await new Promise(resolve => setTimeout(resolve, 150));
            }

            try {
                const isLoose = (p.panelType === 'loosePost');
                const result = await generateBlueprintPDF(
                    p.originalDrawingNo, fabNo, jobNo, p.originalMainMark, revision, finishText, 
                    false, jobName, gc, address, cityState, drawnBy, checkedBy, true, isLoose, p.groupTotalQty, p.panelType,
                    false, currentModel
                );

                if (result && result.pdfData) {
                    zip.file(`${p.originalDrawingNo}.pdf`, result.pdfData);
                }

                p.bomItems = result.bomItems;
            } catch (err) {
                console.error("Failed to generate PDF for Master: ", p.originalDrawingNo, err);
            }
        }

        // Build master BOM rows for consolidated BOM (excel/csv)
        Object.keys(groupsBySignature).forEach(sig => {
            const group = groupsBySignature[sig];
            const master = group[0];
            const totalGroupQty = group.reduce((sum, item) => sum + item.quantity, 0);
            const bomItems = master.bomItems || [];

            bomItems.forEach(item => {
                let shapeCol = (item.shape || '').toUpperCase();
                if (shapeCol.includes('HSS')) shapeCol = 'HSS';
                if (shapeCol === 'PLATE') shapeCol = 'PL';
                if (shapeCol === 'FLAT_BAR') shapeCol = 'FB';

                let dimCol = (item.size || item.desc || '').toUpperCase();
                dimCol = dimCol
                    .replace(/HSS/gi, '')
                    .replace(/\bPL\b/gi, '')
                    .replace(/\bFB\b/gi, '')
                    .replace(/^PL\s*/i, '')
                    .replace(/^FB\s*/i, '')
                    .trim();

                const lengthCol = item.len;
                const gradeCol = item.grade || (item.shape.toUpperCase() === 'WWM' ? 'WELDED' : (item.shape.toLowerCase().includes('plate') ? 'A36' : 'A500'));
                const finishCol = finishText.toUpperCase();
                const remarkCol = ""; // Remarks are kept empty per user request

                let categoryCol = "MISC";
                let subCategoryCol = "MISC";
                const descLower = (item.desc || '').toLowerCase();
                const markLower = (item.mark || '').toLowerCase();
                const shapeLower = (item.shape || '').toLowerCase();

                if (item.isBent) {
                    if (shapeLower.includes('plate') || shapeLower.includes('angle') || descLower.includes('plate') || descLower.includes('angle')) {
                        categoryCol = "PLATE";
                        subCategoryCol = "BENT PLATE";
                    } else {
                        categoryCol = "HSS";
                        subCategoryCol = "BENT HSS";
                    }
                } else if (item.isWeldedPiece) {
                    categoryCol = "WELDED";
                    subCategoryCol = "WELDED PIECE";
                } else if (shapeLower === 'plate' || descLower.includes('plate')) {
                    categoryCol = "PLATE";
                    subCategoryCol = "BASE PLATE";
                } else if (descLower.includes('picket') || markLower.includes('picket')) {
                    categoryCol = "PICKET";
                    subCategoryCol = "PICKET";
                } else if (descLower.includes('post') || markLower.includes('post')) {
                    categoryCol = "POST";
                    subCategoryCol = "POST";
                } else if (descLower.includes('top rail') || descLower.includes('top runner') || (descLower.includes('rail') && (markLower.includes('top') || descLower.includes('top')))) {
                    categoryCol = "RAIL";
                    subCategoryCol = "TOP RAIL";
                } else if (descLower.includes('bot rail') || descLower.includes('bottom rail') || descLower.includes('bot runner') || descLower.includes('bottom runner') || (descLower.includes('rail') && (markLower.includes('bot') || descLower.includes('bottom')))) {
                    categoryCol = "RAIL";
                    subCategoryCol = "BOTTOM RAIL";
                } else if (descLower.includes('mid rail') || descLower.includes('mid runner') || (descLower.includes('rail') && (markLower.includes('mid')))) {
                    categoryCol = "RAIL";
                    subCategoryCol = "MID RAIL";
                } else if (shapeLower.includes('hss')) {
                    categoryCol = "RAIL";
                    subCategoryCol = "RAIL";
                }

                const accumulatedQty = item.qty;

                masterBomRows.push([
                    "", // Approval Status
                    master.originalDrawingNo, // Drawing #
                    master.originalMainMark.toUpperCase(), // Main Mark
                    item.mark, // Piece Mark
                    accumulatedQty, // Consolidated Quantity
                    shapeCol, // Shape
                    dimCol, // Dimensions
                    lengthCol, // Length
                    gradeCol, // Grade
                    finishCol, // Finish
                    remarkCol, // Remark
                    categoryCol, // Category
                    subCategoryCol, // Sub-Category
                    "", // Sequence
                    "", // Lot #
                    ""  // Sequence Qty
                ]);
            });
        });

        // Generate Consolidated BOM File inside ZIP
        if (needFBOM && masterBomRows.length > 0) {
            const excelHeaders = [
                "Approval Status", "Drawing #", "Main Mark", "Piece Mark", "Quantity", 
                "Shape", "Dimensions", "Length", "Grade", "Finish", "Remark", 
                "Category", "Sub-Category", "Sequence", "Lot #", "Sequence Qty"
            ];

            if (window.XLSX) {
                const wb = XLSX.utils.book_new();
                const wsData = [excelHeaders, ...masterBomRows];
                const ws = XLSX.utils.aoa_to_sheet(wsData);
                XLSX.utils.book_append_sheet(wb, ws, "FBOM");
                const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
                zip.file(`FBOM-${jobNo}-${fabNo}.xlsx`, excelBuffer);
            } else {
                let csvContent = excelHeaders.map(h => `"${h}"`).join(",") + "\n";
                masterBomRows.forEach(row => {
                    csvContent += row.map(val => {
                        if (typeof val === 'number') return val;
                        return `"${(val || '').toString().replace(/"/g, '""')}"`;
                    }).join(",") + "\n";
                });
                zip.file(`FBOM-${jobNo}-${fabNo}.csv`, csvContent);
            }
        }

        // Generate Summary Report PDF and add to ZIP
        const { jsPDF } = window.jspdf;
        const summaryDoc = new jsPDF('portrait', 'mm', 'a4'); // A4: 210 x 297 mm
        
        // Borders
        summaryDoc.setDrawColor(0, 0, 0);
        summaryDoc.setLineWidth(0.5);
        summaryDoc.rect(5, 5, 200, 287, 'S'); // Outer border
        summaryDoc.setLineWidth(0.2);
        summaryDoc.rect(7, 7, 196, 283, 'S'); // Inner border

        // Title Block
        summaryDoc.setFont('helvetica', 'bold');
        summaryDoc.setFontSize(14);
        summaryDoc.text("STEELDRAFT BALCONY CONFIGURATOR", 105, 18, { align: "center" });
        summaryDoc.setFontSize(11);
        summaryDoc.text("BATCH EXPORT DRAWINGS & BOM SUMMARY REPORT", 105, 24, { align: "center" });

        // Job Information
        summaryDoc.setFontSize(8.5);
        summaryDoc.setFont('helvetica', 'bold');
        summaryDoc.text("JOB INFORMATION", 15, 36);
        summaryDoc.setFont('helvetica', 'normal');
        summaryDoc.text(`Job Name: ${jobName.toUpperCase()}`, 15, 42);
        summaryDoc.text(`Job Number: ${jobNo.toUpperCase()}`, 15, 47);
        summaryDoc.text(`GC: ${gc.toUpperCase()}`, 15, 52);
        summaryDoc.text(`Date: ${new Date().toLocaleDateString()}`, 120, 42);
        summaryDoc.text(`Revision: ${revision}`, 120, 47);
        summaryDoc.text(`Finish: ${finishText.toUpperCase()}`, 120, 52);

        summaryDoc.line(15, 56, 195, 56);

        // Optimization Narrative
        summaryDoc.setFont('helvetica', 'bold');
        summaryDoc.text("DRAWING SHEET OPTIMIZATION", 15, 63);
        summaryDoc.setFont('helvetica', 'normal');
        summaryDoc.setFontSize(8);
        const explanation = "To optimize fabrication and reduce duplicate paperwork, identical balconies, returns, and loose posts have been grouped onto single master drawing sheets. Drawing sheets are only generated for the first occurrence of each unique design. The table below provides a full map of all components, showing their original drawing numbers, the assigned master drawing sheets, and the final accumulated quantities.";
        summaryDoc.text(explanation, 15, 68, { maxWidth: 180 });

        summaryDoc.line(15, 78, 195, 78);

        // Table Header
        summaryDoc.setFont('helvetica', 'bold');
        summaryDoc.setFontSize(8);
        summaryDoc.text("SET / BALCONY", 17, 83);
        summaryDoc.text("COMPONENT", 50, 83);
        summaryDoc.text("ORIGINAL DWG", 90, 83);
        summaryDoc.text("ASSIGNED DWG", 125, 83);
        summaryDoc.text("QTY", 160, 83);
        summaryDoc.text("STATUS", 175, 83);

        summaryDoc.line(15, 85, 195, 85);

        // Populate Table Rows
        let tableY = 90;
        summaryDoc.setFont('helvetica', 'normal');
        summaryDoc.setFontSize(7.5);

        const componentOrder = { 'main': 1, 'loosePost': 2, 'leftReturn': 3, 'rightReturn': 4 };
        const sortedItems = [...filteredPanelItems].sort((a, b) => {
            if (a.setIdx !== b.setIdx) return a.setIdx - b.setIdx;
            return componentOrder[a.panelType] - componentOrder[b.panelType];
        });

        sortedItems.forEach(item => {
            if (tableY > 270) {
                summaryDoc.addPage();
                summaryDoc.setDrawColor(0, 0, 0);
                summaryDoc.setLineWidth(0.5);
                summaryDoc.rect(5, 5, 200, 287, 'S');
                summaryDoc.setLineWidth(0.2);
                summaryDoc.rect(7, 7, 196, 283, 'S');
                
                summaryDoc.setFont('helvetica', 'bold');
                summaryDoc.setFontSize(8);
                summaryDoc.text("SET / BALCONY", 17, 15);
                summaryDoc.text("COMPONENT", 50, 15);
                summaryDoc.text("ORIGINAL DWG", 90, 15);
                summaryDoc.text("ASSIGNED DWG", 125, 15);
                summaryDoc.text("QTY", 160, 15);
                summaryDoc.text("STATUS", 175, 15);
                summaryDoc.line(15, 17, 195, 17);
                tableY = 22;
                summaryDoc.setFont('helvetica', 'normal');
                summaryDoc.setFontSize(7.5);
            }

            const setLetter = `Balcony ${getSetLetter(item.setIdx)}`;
            let compLabel = "Main Balcony";
            if (item.panelType === 'leftReturn') compLabel = "Left Return";
            else if (item.panelType === 'rightReturn') compLabel = "Right Return";
            else if (item.panelType === 'loosePost') compLabel = "Loose Corner Post";

            const origDwg = `${item.originalDrawingNo} (${item.originalMainMark})`;
            const assignedDwg = `${item.masterDrawingNo} (${item.masterMainMark})`;
            const qtyStr = item.quantity.toString();
            const statusStr = item.isMaster ? "MASTER (Sheet Generated)" : `Shared with ${item.masterDrawingNo}`;

            summaryDoc.text(setLetter, 17, tableY);
            summaryDoc.text(compLabel, 50, tableY);
            summaryDoc.text(origDwg, 90, tableY);
            if (item.isMaster) {
                summaryDoc.setFont('helvetica', 'bold');
            }
            summaryDoc.text(assignedDwg, 125, tableY);
            summaryDoc.text(qtyStr, 162, tableY, { align: "center" });
            summaryDoc.text(statusStr, 175, tableY);
            summaryDoc.setFont('helvetica', 'normal');

            summaryDoc.line(15, tableY + 2, 195, tableY + 2, 'S');
            tableY += 6;
        });

        const summaryPdfData = summaryDoc.output('arraybuffer');
        zip.file("Summary_Report.pdf", summaryPdfData);

        // Restore original panel view
        balconyWizardState.tempSet = origTempSet;
        balconyWizardState.activeSetIdx = origSetIdx;
        balconyWizardState.activePanelType = origPanelType;
        loadActivePanelToInputs();
        renderCurrentCAD(true); // Restore original screen view (with interactive 3D preview)

        // Download ZIP file
        const zipContent = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(zipContent);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${jobName}-${fabNo}.zip`;
        a.click();
        URL.revokeObjectURL(url);
        
        // Show Success Notification Toast
        const toast = document.createElement('div');
        toast.className = 'ai-success-toast';
        toast.innerHTML = `<i data-lucide="check-circle" style="color:#000; vertical-align:middle; margin-right:4px;"></i> ZIP Package Export Completed!`;
        document.body.appendChild(toast);
        if (window.lucide) lucide.createIcons();
        
        setTimeout(() => {
            toast.style.animation = 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) reverse';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    } catch (e) {
        console.error("ZIP package generation failed: ", e);
        alert("Failed to build ZIP package. Error: " + e.message);
    } finally {
        isGeneratingZipBatch = false;
        balconyWizardState.tempSet = origTempSet;
        if (overlay) {
            overlay.classList.add('hidden');
            const statusText = overlay.querySelector('p');
            if (statusText) statusText.textContent = "Processing Engineering Geometry...";
        }
    }
    }    function generateBlueprintPDF(drawingNo, fabNo, jobNo, mainMark, revision, finishText, needFBOM, jobName = 'QUALITY IRONWORKS PROJECT', gc = 'APEX BUILDERS', address = '123 STEEL WAY', cityState = 'HOUSTON, TX', drawnBy = 'ENG', checkedBy = 'QIW', isZipBatch = false, isLoosePost = false, assemblyQty = 1, activePanelType = 'main', isPreviewOnly = false, customModelOverride = null) {
        return new Promise((resolve, reject) => {
            const { jsPDF } = window.jspdf;
            const modelToDraw = customModelOverride || currentModel;
            const doc = new jsPDF('landscape', 'mm', 'a4'); // A4 landscape: 297mm x 210mm
            const cat = shapeCategory.value;
            let desc = cat ? cat.toUpperCase() : "Drawing";

            // Fetch inputs at the start of the function
            const vals = {};
            dynamicInputs.querySelectorAll('input').forEach(inp => {
                const id = inp.id.replace('inp-', '');
                vals[id] = (inp.type === 'text') ? inp.value : (parseFloat(inp.value) || 0);
            });
            dynamicInputs.querySelectorAll('select').forEach(sel => {
                vals[sel.id.replace('inp-', '')] = sel.value;
            });

            if (isLoosePost) {
                if (vals.postType === 'none' || vals.postType === 'no') {
                    vals.postType = 'hss_rect';
                    vals.postSize = 'HSS 1.5x1.5x11GA';
                    vals.postW = 1.5;
                    vals.postH = 1.5;
                    vals.postT = 0.1196;
                }
            }

            const style = vals.railStyle || 'classical';
            const customSpacings = [];
            const tempMidPostsVal = vals.midPosts || 'default';
            const tempMidPostCount = parseInt(vals.midPostCount) || 0;
            if (tempMidPostsVal === 'custom') {
                for (let i = 1; i <= tempMidPostCount; i++) {
                    const spKey = `midPostSpacing-${i}`;
                    customSpacings.push(vals[spKey] !== undefined ? vals[spKey] : 48);
                }
            }

            const hasBasePlates = (vals.includeBasePlates === 'yes');
            const isMeshStyle = (style === 'urban_balcony' || style === 'villa_balcony' || style === 'urban_custom' || style === 'villa_custom');
            const hasTopDetails = !isLoosePost && (
                vals.includeBasePlates === 'yes'
            );

            let unpaddedMinX, unpaddedMaxX, unpaddedMinY, unpaddedMaxY;
            let cadMinX, cadMaxX, cadMinY, cadMaxY;
            let actualWidthInches, actualHeightInches;
            
            if (window.makerjs && modelToDraw) {
                const extents = makerjs.measure.modelExtents(modelToDraw);
                if (extents) {
                    unpaddedMinX = extents.low[0];
                    unpaddedMaxX = extents.high[0];
                    unpaddedMinY = extents.low[1];
                    unpaddedMaxY = extents.high[1];

                    cadMinX = unpaddedMinX;
                    cadMaxX = unpaddedMaxX;
                    cadMinY = unpaddedMinY;
                    cadMaxY = unpaddedMaxY;
                    
                    // Add 5% padding (min 0.5 inches) to prevent edge clipping (like missing bottom line)
                    const padX = Math.max(0.5, (unpaddedMaxX - unpaddedMinX) * 0.05);
                    const padY = Math.max(0.5, (unpaddedMaxY - unpaddedMinY) * 0.05);
                    cadMinX -= padX;
                    cadMaxX += padX;
                    cadMinY -= padY;
                    cadMaxY += padY;
                    
                    actualWidthInches = cadMaxX - cadMinX;
                    actualHeightInches = cadMaxY - cadMinY;
                }
            }

            if (!modelToDraw) {
                alert("No active CAD model found. Please draw or select a design first.");
                reject("No active CAD model");
                return;
            }

            const svgElement = svgContainer.querySelector('svg');
            if (!svgElement) {
                reject("No SVG element found");
                return;
            }

            // Generate a clean 2D SVG directly from the model (removes all nested centerlines and thickness lines) with black stroke
            let cleanSvgString = CadEngine.renderClean2DSVG(modelToDraw, { stroke: '#000000' });
            if (!cleanSvgString.includes('xmlns=')) {
                cleanSvgString = cleanSvgString.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
            }
            
            // Parse the clean SVG string into a DOM element in the SVG namespace
            const parser = new DOMParser();
            const docParsed = parser.parseFromString(cleanSvgString, 'image/svg+xml');
            const svgClone = docParsed.querySelector('svg');
            if (!svgClone) {
                reject("Failed to parse clean SVG");
                return;
            }

            if (!svgClone.getAttribute('xmlns')) {
                svgClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
            }
            
            // Remove draft guidance overlay if it exists
            const gGuide = svgClone.querySelector('.draft-guidance-overlay');
            if (gGuide) gGuide.remove();

            // Strip double lines (inner HSS wall thickness lines and centerlines) for outer-only 2D representation
            const innerSelector = [
                '.hss-inner-line', '.inner', '[class*="inner"]', '[id*="inner"]',
                '.center', '[class*="center"]', '[id*="center"]',
                '.topWall', '[class*="topWall"]', '[id*="topWall"]',
                '.botWall', '[class*="botWall"]', '[id*="botWall"]',
                '.legLine', '[class*="legLine"]', '[id*="legLine"]',
                '.topFlange', '[class*="topFlange"]', '[id*="topFlange"]',
                '.botFlange', '[class*="botFlange"]', '[id*="botFlange"]',
                '[class*="wall"]', '[id*="wall"]'
            ].join(', ');
            svgClone.querySelectorAll(innerSelector).forEach(el => el.remove());

            // Parse viewBox dimensions to calculate proportional stroke-width
            let viewBoxAttr = svgClone.getAttribute('viewBox') || svgElement.getAttribute('viewBox');
            let vb = viewBoxAttr ? viewBoxAttr.split(/[\s,]+/).map(Number) : (modelToDraw === 'draft' ? [-600, -400, 1200, 800] : [0, 0, 2000, 1500]);
            const origMinX = vb[0] !== undefined ? vb[0] : 0;
            const origMinY = vb[1] !== undefined ? vb[1] : 0;
            const origW = vb[2] || (modelToDraw === 'draft' ? 1200 : 2000);
            const origH = vb[3] || (modelToDraw === 'draft' ? 800 : 1500);

            let vbMinX = origMinX;
            let vbMinY = origMinY;
            let vbWidth = origW;
            let vbHeight = origH;

            // Calculate the padded viewBox dimensions matching the CAD coordinate mapping transformation
            if (unpaddedMinX !== undefined && unpaddedMaxX !== undefined && unpaddedMinY !== undefined && unpaddedMaxY !== undefined) {
                const unpaddedW = unpaddedMaxX - unpaddedMinX;
                const unpaddedH = unpaddedMaxY - unpaddedMinY;
                
                if (unpaddedW > 0.001 && unpaddedH > 0.001) {
                    const scaleX = origW / unpaddedW;
                    const scaleY = origH / unpaddedH;
                    
                    const padX = Math.max(0.5, unpaddedW * 0.05);
                    const padY = Math.max(0.5, unpaddedH * 0.05);
                    
                    const padX_svg = padX * scaleX;
                    const padY_svg = padY * scaleY;
                    
                    vbMinX = origMinX - padX_svg;
                    vbMinY = origMinY - padY_svg;
                    vbWidth = origW + 2 * padX_svg;
                    vbHeight = origH + 2 * padY_svg;
                }
            }
            
            let svgRatio = 1.33;
            if (cadMinX !== undefined && cadMinY !== undefined) {
                const w = cadMaxX - cadMinX;
                const h = cadMaxY - cadMinY;
                if (h > 0.001) {
                    svgRatio = w / h;
                }
            } else {
                svgRatio = vbWidth / vbHeight;
            }

            // Margins for dimensions & leaders
            const marginLeft = 20;
            const marginRight = 30;
            const marginTop = 35;
            const marginBottom = 33;

            // Page boundaries
            const pageXMin = 7;
            const pageXMax = 180;
            const pageYMin = 7;
            const pageYMax = 175;

            let availW = (pageXMax - pageXMin) - (marginLeft + marginRight); // 123
            let availH = (pageYMax - pageYMin) - (marginTop + marginBottom); // 113

            if (hasTopDetails) {
                availH = 49; // Cap available height to prevent overlap with top detail boxes and bottom dimensions/descriptions
            }

            if (isLoosePost) {
                availW = 40;
                availH = 110;
            }

            // Calculate scaled drawing dimensions
            let drawW, drawH;
            const scaleToFitWidth = availW;
            const scaleToFitHeight = availW / svgRatio;

            if (isLoosePost) {
                // Preserve aspect ratio for loose posts
                const fitW = availH * svgRatio;
                if (fitW <= availW) {
                    drawW = fitW;
                    drawH = availH;
                } else {
                    drawW = availW;
                    drawH = availW / svgRatio;
                }
            } else if (scaleToFitHeight <= availH) {
                drawW = availW;
                drawH = scaleToFitHeight;
            } else {
                drawH = availH;
                drawW = availH * svgRatio;
            }

            // Center horizontally
            const pdfX = 93.5 - drawW / 2;

            // Center vertically considering asymmetric top/bottom margins
            let pdfY;
            if (hasTopDetails) {
                const remainingYSpace = (pageYMax - 58) - (drawH + marginTop + marginBottom);
                const extraSpace = Math.max(0, remainingYSpace / 2);
                pdfY = 58 + marginTop + extraSpace;
            } else {
                const remainingYSpace = (pageYMax - pageYMin) - (drawH + marginTop + marginBottom);
                const extraSpace = Math.max(0, remainingYSpace / 2);
                pdfY = pageYMin + marginTop + extraSpace;
            }

            // 0.40mm line thickness on the PDF page translates to viewBox units as follows:
            const targetThicknessPdf = 0.40; 
            const lineThickness = targetThicknessPdf * (vbWidth / drawW);

        // Ensure absolutely high-contrast black lines and white backgrounds (remove all blue and cyan colors)
        svgClone.querySelectorAll('*').forEach(el => {
            if (!el) return;
            // Force stroke to black and fill to none for shape elements
            const tag = el.tagName ? el.tagName.toLowerCase() : '';
            if (['path', 'rect', 'circle', 'line', 'polygon'].includes(tag)) {
                el.setAttribute('stroke', '#000000');
                const isSolidPlate = el.closest && (
                    el.closest('.kickPlate') || el.closest('[id*="kickPlate"]') || el.closest('g[id$="kickPlate"]') ||
                    el.closest('.panicBarPlate') || el.closest('[id*="panicBarPlate"]') || el.closest('g[id$="panicBarPlate"]') ||
                    el.closest('[id*="FB"]') || el.closest('[id*="fb"]') || el.closest('g[id$="meshFrame"]')
                );
                const fillVal = isSolidPlate ? '#ffffff' : 'none';
                el.setAttribute('fill', fillVal);
                if (isSolidPlate) el.setAttribute('fill-opacity', '1');
                if (el.style) {
                    el.style.stroke = '#000000';
                    el.style.fill = fillVal;
                    if (isSolidPlate) el.style.fillOpacity = '1';
                }
            } else if (tag === 'text') {
                el.setAttribute('fill', '#000000');
                el.setAttribute('stroke', 'none');
                if (el.style) {
                    el.style.fill = '#000000';
                    el.style.stroke = 'none';
                }
            }
        });

        // Set the calculated thickness on all drawing paths to ensure clean, readable prints.
        // Pickets are drawn slightly thinner (0.22mm on PDF page) for visual contrast as requested by the user.
        svgClone.querySelectorAll('path, rect, circle, line, polygon').forEach(el => {
            if (!el) return;
            const id = el.getAttribute('id') || '';
            const className = el.getAttribute('class') || '';
            
            let thickness = lineThickness;
            if (id.toLowerCase().includes('picket') || className.toLowerCase().includes('picket')) {
                thickness = lineThickness * 0.55; // 0.22mm / 0.40mm = 0.55
            }
            
            if (el.setAttribute) {
                el.setAttribute('stroke-width', thickness.toString());
            }
            if (el.style) {
                el.style.strokeWidth = thickness.toString();
            }
        });
        
        svgClone.querySelectorAll('text').forEach(t => {
            if (!t) return;
            if (t.setAttribute) {
                t.setAttribute('fill', '#000000');
                t.setAttribute('font-weight', '700');
            }
            if (t.style) {
                t.style.fill = '#000000';
            }
        });

        // Set the calculated padded viewBox on the SVG clone to match coordinate scaling
        svgClone.setAttribute('viewBox', `${vbMinX} ${vbMinY} ${vbWidth} ${vbHeight}`);
        svgRatio = vbWidth / vbHeight;

        // Set the width and height of the SVG clone to match its intrinsic dimensions.
        svgClone.setAttribute('width', vbWidth.toFixed(2) + 'px');
        svgClone.setAttribute('height', vbHeight.toFixed(2) + 'px');

        const svgData = new XMLSerializer().serializeToString(svgClone);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();

        // Set canvas dimensions at a high resolution with matching aspect ratio
        canvas.width = 2000;
        canvas.height = 2000 / svgRatio;

        // Bypassing chrome incognito / sandboxing restrictions on blob URLs via Base64 data URI
        const base64Svg = btoa(unescape(encodeURIComponent(svgData)));
        const url = 'data:image/svg+xml;base64,' + base64Svg;

        img.onload = function() {
            // Introduce a short delay to guarantee that the browser has fully rasterized the SVG vectors before drawing to the canvas
            setTimeout(function() {
                try {
                    ctx.fillStyle = "white";
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                    const pngData = canvas.toDataURL('image/png');
                    
                    doc.addImage(pngData, 'PNG', pdfX, pdfY, drawW, drawH);
            
            // --- DRAW BORDERS ---
            doc.setDrawColor(0, 0, 0);
            doc.setLineWidth(0.5);
            doc.rect(5, 5, 287, 200, 'S'); // Outer border
            doc.setLineWidth(0.2);
            doc.rect(7, 7, 283, 196, 'S'); // Inner border

            // Input values are already resolved at the start of the function

            const scale = CadEngine.isLibReady() ? 25.4 : 10;
            const isGates = vals.railsGatesType === 'gates';
            const mainMarkUpper = mainMark.toUpperCase();

            // Helpers for profiles
            const getProfileDimension = (type, size, customVal) => {
                if (type === 'none' || size === 'NONE') return 0;
                if (size === 'CUSTOM') return customVal;
                const shapes = SHAPES_DB[type] || [];
                const selected = shapes.find(s => s.id === size);
                if (selected) {
                    if (type === 'hss_rect') return selected.h || selected.w || 0;
                    if (type === 'hss_circ') return selected.d || 0;
                    if (type === 'w_beam') return selected.d || 0;
                    if (type === 'angles') return selected.leg2 || selected.leg1 || 0;
                    if (type === 'plate') return selected.t || 0;
                }
                return customVal;
            };

            const getPicketDimension = (type, size, customVal) => {
                if (type === 'none' || size === 'NONE') return 0;
                if (size === 'CUSTOM') return customVal;
                const shapes = SHAPES_DB[type] || [];
                const selected = shapes.find(s => s.id === size);
                if (selected) {
                    if (type === 'hss_rect') return selected.w || 0;
                    if (type === 'hss_circ') return selected.d || 0;
                    if (type === 'w_beam') return selected.bf || 0;
                    if (type === 'angles') return selected.leg1 || 0;
                    if (type === 'plate') return selected.t || 0;
                }
                return customVal;
            };

            const cleanDrawingNo = drawingNo.toUpperCase().replace(/[^A-Z0-9]/g, '');
            const mainMarkCode = (cat === 'rail_catalog') ? mainMark.toUpperCase() : cleanDrawingNo + 'M1';
            
            let charCode = 97; // 'a'
            let mainMarkAssigned = false;
            const getMark = (isPresent) => {
                if (!isPresent) return null;
                if (!mainMarkAssigned) {
                    mainMarkAssigned = true;
                    return mainMarkCode;
                }
                const m = String.fromCharCode(charCode) + (cat === 'rail_catalog' ? drawingNo : cleanDrawingNo);
                charCode++;
                return m;
            };

            let topMark = null, botMark = null, midMark = null, leftMark = null, rightMark = null;
            let countLeftPost = 0, countRightPost = 0;
            let midPostMark = null, picketMark = null, kpMark = null, bpMark = null;
            let meshFbMark = null, meshPanelMark = null, pbpMark = null;
            let leftPostW = 0, rightPostW = 0, midPostW = 0, topH = 0, botH = 0, midH = 0, pickW = 0;
            let midRailGap = 12.0, kickPlateH = 12.0, midPostCount = 0;
            let noPosts = false, numSpans = 1, numPosts = 0, actualPostSpacing = 0, clearWidth = 0, numPickets = 0, finalPicketsCount = 0, totalPickets = 0;

            if (cat === 'rail_catalog') {
                const style = vals.railStyle || 'classical';
                let fHeight = 41.0;
                let pHeight = 45.75;
                let postType = 'hss_rect';
                let postW = 1.5;
                let postH = 1.5;
                let postT = 0.1196;
                let topRailType = 'hss_rect';
                let topRailW = 1.5;
                let topRailH = 1.5;
                let topRailT = 0.0598;
                let botRailType = 'hss_rect';
                let botRailW = 1.5;
                let botRailH = 1.5;
                let botRailT = 0.0598;
                let midRailType = 'none';
                let midRailW = 0;
                let midRailH = 0;
                let midRailT = 0;
                let midRailGap = 12.0;
                let picketType = 'hss_rect';
                let picketW = 0.5;
                let picketH = 0.5;
                let picketT = 0.0598;
                let picketSpacing = 4.0;
                let includeBasePlates = 'no';

                const getProfileThickness = (type, size, customVal) => {
                    if (type === 'none' || size === 'NONE') return 0;
                    if (size === 'CUSTOM') return customVal;
                    const shapes = SHAPES_DB[type] || [];
                    const selected = shapes.find(s => s.id === size);
                    if (selected) {
                        return selected.t || 0.12;
                    }
                    return customVal;
                };

                if (style === 'classical') {
                    fHeight = 41.0;
                    pHeight = 45.75;
                    postType = 'hss_rect';
                    postW = 1.5;
                    postH = 1.5;
                    postT = 0.1196;
                    topRailType = 'hss_rect';
                    topRailW = 1.5;
                    topRailH = 1.5;
                    topRailT = 0.0598;
                    botRailType = 'hss_rect';
                    botRailW = 1.5;
                    botRailH = 1.5;
                    botRailT = 0.0598;
                    midRailType = 'none';
                    picketType = 'hss_rect';
                    picketW = 0.5;
                    picketH = 0.5;
                    picketT = 0.0598;
                    picketSpacing = 4.0;
                    includeBasePlates = 'no';
                } else if (style === 'executive') {
                    fHeight = 41.0;
                    pHeight = 45.75;
                    postType = 'hss_rect';
                    postW = 1.5;
                    postH = 1.5;
                    postT = 0.1196;
                    topRailType = 'hss_rect';
                    topRailW = 1.5;
                    topRailH = 1.5;
                    topRailT = 0.0598;
                    botRailType = 'hss_rect';
                    botRailW = 1.5;
                    botRailH = 1.5;
                    botRailT = 0.0598;
                    midRailType = 'hss_rect';
                    midRailW = 1.5;
                    midRailH = 1.5;
                    midRailT = 0.0598;
                    midRailGap = 3.0;
                    picketType = 'hss_rect';
                    picketW = 0.5;
                    picketH = 0.5;
                    picketT = 0.0598;
                    picketSpacing = 4.0;
                    includeBasePlates = vals.includeBasePlates || 'no';
                } else if (style === 'urban_balcony') {
                    fHeight = 41.0;
                    pHeight = 45.75;
                    postType = 'hss_rect';
                    postW = 1.5;
                    postH = 1.5;
                    postT = 0.1196;
                    topRailType = 'hss_rect';
                    topRailW = 1.5;
                    topRailH = 1.5;
                    topRailT = 0.0598;
                    botRailType = 'hss_rect';
                    botRailW = 1.5;
                    botRailH = 1.5;
                    botRailT = 0.0598;
                    midRailType = 'none';
                    picketType = 'none';
                    picketW = 0;
                    picketH = 0;
                    picketT = 0;
                    picketSpacing = 0;
                    includeBasePlates = 'no';
                } else if (style === 'villa_balcony') {
                    fHeight = 41.0;
                    pHeight = 45.75;
                    postType = 'hss_rect';
                    postW = 1.5;
                    postH = 1.5;
                    postT = 0.1196;
                    topRailType = 'hss_rect';
                    topRailW = 1.5;
                    topRailH = 1.5;
                    topRailT = 0.0598;
                    botRailType = 'hss_rect';
                    botRailW = 1.5;
                    botRailH = 1.5;
                    botRailT = 0.0598;
                    midRailType = 'hss_rect';
                    midRailW = 1.5;
                    midRailH = 1.5;
                    midRailT = 0.0598;
                    midRailGap = 3.0;
                    picketType = 'none';
                    picketW = 0;
                    picketH = 0;
                    picketT = 0;
                    picketSpacing = 0;
                    includeBasePlates = 'no';
                } else if (style === 'urban_custom' || style === 'villa_custom') {
                    fHeight = vals.fenceHeight || 36;
                    pHeight = vals.postHeight || 36;
                    postType = vals.postType || 'hss_rect';
                    postW = getPicketDimension(vals.postType, vals.postSize, vals.postW || 1.5);
                    postH = getProfileDimension(vals.postType, vals.postSize, vals.postW || 1.5);
                    postT = getProfileThickness(vals.postType, vals.postSize, vals.postW || 0.12);
                    topRailType = vals.topRailType || 'hss_rect';
                    topRailW = getPicketDimension(vals.topRailType, vals.topRailSize, vals.topRailH || 1.5);
                    topRailH = getProfileDimension(vals.topRailType, vals.topRailSize, vals.topRailH || 1.5);
                    topRailT = getProfileThickness(vals.topRailType, vals.topRailSize, vals.topRailH || 0.12);
                    botRailType = vals.botRailType || 'hss_rect';
                    botRailW = getPicketDimension(vals.botRailType, vals.botRailSize, vals.botRailH || 1.5);
                    botRailH = getProfileDimension(vals.botRailType, vals.botRailSize, vals.botRailH || 1.5);
                    botRailT = getProfileThickness(vals.botRailType, vals.botRailSize, vals.botRailH || 0.12);
                    midRailType = (style === 'villa_custom') ? (vals.midRailType || 'hss_rect') : 'none';
                    midRailW = getPicketDimension(midRailType, vals.midRailSize, vals.midRailH || 1.5);
                    midRailH = getProfileDimension(midRailType, vals.midRailSize, vals.midRailH || 1.5);
                    midRailT = getProfileThickness(midRailType, vals.midRailSize, vals.midRailH || 0.12);
                    midRailGap = vals.midRailGap !== undefined ? vals.midRailGap : 12.0;
                    picketType = 'none';
                    picketW = 0; picketH = 0; picketT = 0; picketSpacing = 0;
                    includeBasePlates = vals.includeBasePlates || 'no';
                    bpW = vals.basePlateW || 6.0;
                    bpL = vals.basePlateL || 6.0;
                    bpH = getProfileDimension('plate', vals.basePlateSize, vals.basePlateT || 0.5);
                    bpHoleD = vals.basePlateHoleD || 0.5;
                    bpHoleOffsetX = vals.basePlateHoleOffsetX || 0.5;
                    bpHoleOffsetY = vals.basePlateHoleOffsetY || 0.25;
                } else {
                    fHeight = vals.fenceHeight || 36;
                    pHeight = vals.postHeight || 36;
                    postType = vals.postType || 'hss_rect';
                    postW = getPicketDimension(vals.postType, vals.postSize, vals.postW || 1.5);
                    postH = getProfileDimension(vals.postType, vals.postSize, vals.postW || 1.5);
                    postT = getProfileThickness(vals.postType, vals.postSize, vals.postW || 0.12);
                    
                    topRailType = vals.topRailType || 'hss_rect';
                    topRailW = getPicketDimension(vals.topRailType, vals.topRailSize, vals.topRailH || 1.5);
                    topRailH = getProfileDimension(vals.topRailType, vals.topRailSize, vals.topRailH || 1.5);
                    topRailT = getProfileThickness(vals.topRailType, vals.topRailSize, vals.topRailH || 0.12);
                    
                    botRailType = vals.botRailType || 'hss_rect';
                    botRailW = getPicketDimension(vals.botRailType, vals.botRailSize, vals.botRailH || 1.5);
                    botRailH = getProfileDimension(vals.botRailType, vals.botRailSize, vals.botRailH || 1.5);
                    botRailT = getProfileThickness(vals.botRailType, vals.botRailSize, vals.botRailH || 0.12);
                    
                    midRailType = vals.midRailType || 'none';
                    midRailW = getPicketDimension(vals.midRailType, vals.midRailSize, vals.midRailH || 1.5);
                    midRailH = getProfileDimension(vals.midRailType, vals.midRailSize, vals.midRailH || 1.5);
                    midRailT = getProfileThickness(vals.midRailType, vals.midRailSize, vals.midRailH || 0.12);
                    midRailGap = vals.midRailGap !== undefined ? vals.midRailGap : 12.0;

                    picketType = vals.picketType || 'hss_rect';
                    picketW = getPicketDimension(vals.picketType, vals.picketSize, vals.picketW || 0.5);
                    picketH = getProfileDimension(vals.picketType, vals.picketSize, vals.picketW || 0.5);
                    picketT = getProfileThickness(vals.picketType, vals.picketSize, vals.picketW || 0.083);
                    picketSpacing = vals.picketSpacing || 4.0;
                    includeBasePlates = vals.includeBasePlates || 'no';
                }

                leftPostW = (vals.leftPost === 'yes') ? postW : 0;
                rightPostW = (vals.rightPost === 'yes') ? postW : 0;
                midPostW = postW;
                topH = topRailH;
                botH = botRailH;
                midH = midRailH;
                pickW = picketW;
                midPostCount = (vals.midPosts === 'default' || vals.midPosts === 'yes') ? Math.max(0, Math.ceil(vals.length / 48) - 1) : ((vals.midPosts === 'custom' || vals.midPosts === 'custom_standard') ? (parseInt(vals.midPostCount) || 0) : 0);

                // Count how many pickets are generated in this model
                let totalPicketCount = 0;
                const spanRanges = [];
                let currentL = (vals.leftPost === 'yes') ? postW : 0;
                
                const mpList = [];
                if (vals.midPosts !== 'none' && midPostCount > 0) {
                    const resolvedCenters = resolveMidPostCenters(vals.length, vals.leftPost, vals.rightPost, vals.midPosts, midPostCount, postW, customSpacings, style);
                    resolvedCenters.forEach(midCx => {
                        mpList.push({ startX: midCx - postW/2, endX: midCx + postW/2 });
                    });
                }

                mpList.forEach(mp => {
                    spanRanges.push({ start: currentL, end: mp.startX });
                    currentL = mp.endX;
                });
                spanRanges.push({ start: currentL, end: (vals.rightPost === 'yes') ? (vals.length - postW) : vals.length });

                spanRanges.forEach(range => {
                    let leftPostCenter = range.start;
                    if (range.start > 0) {
                        leftPostCenter = range.start - postW / 2;
                    } else if (vals.leftPost === 'yes') {
                        leftPostCenter = postW / 2;
                    }

                    let rightPostCenter = range.end;
                    if (range.end < vals.length) {
                        rightPostCenter = range.end + postW / 2;
                    } else if (vals.rightPost === 'yes') {
                        rightPostCenter = vals.length - postW / 2;
                    }

                    const spanCenterDist = rightPostCenter - leftPostCenter;
                    const numP = Math.max(0, Math.floor(spanCenterDist / picketSpacing - 0.001));
                    if (numP > 0) totalPicketCount += numP;
                });
                finalPicketsCount = totalPicketCount;

                const hasLeft = (vals.leftPost === 'yes');
                const hasRight = (vals.rightPost === 'yes');

                countLeftPost = hasLeft ? 1 : 0;
                countRightPost = hasRight ? 1 : 0;

                topMark = getMark(topRailType !== 'none');
                botMark = getMark(botRailType !== 'none');
                midMark = getMark(midRailType !== 'none');
                leftMark = getMark(countLeftPost > 0 && postType !== 'none');
                rightMark = getMark(countRightPost > 0 && postType !== 'none');
                midPostMark = getMark(vals.midPosts !== 'none' && midPostCount > 0 && postType !== 'none');
                picketMark = getMark(picketType !== 'none' && finalPicketsCount > 0);
                const isMeshStyle = (style === 'urban_balcony' || style === 'villa_balcony' || style === 'urban_custom' || style === 'villa_custom');
                meshFbMark = getMark(isMeshStyle);
                meshPanelMark = getMark(isMeshStyle);
                bpMark = getMark(includeBasePlates === 'yes');
            } else if (cat === 'rails_gates') {
                leftPostW = getPicketDimension(vals.leftPostType, vals.leftPostSize, vals.leftPostW);
                rightPostW = getPicketDimension(vals.rightPostType, vals.rightPostSize, vals.rightPostW);
                midPostW = getPicketDimension(vals.midPostType, vals.midPostSize, vals.midPostW);
                topH = getProfileDimension(vals.topRailType, vals.topRailSize, vals.topRailH);
                botH = getProfileDimension(vals.botRailType, vals.botRailSize, vals.botRailH);
                midH = getProfileDimension(vals.midRailType, vals.midRailSize, vals.midRailH);
                pickW = getPicketDimension(vals.picketType, vals.picketSize, vals.picketW);
                midRailGap = vals.midRailGap !== undefined ? vals.midRailGap : 12.0;
                kickPlateH = vals.kickPlateH || 12.0;
                midPostCount = parseInt(vals.midPostCount) || 0;

                const picketPositions = getPicketPositions(
                    vals.railStyle || 'classical',
                    vals.length,
                    leftPostW,
                    rightPostW,
                    pickW,
                    vals.picketSpacing,
                    midPostCount,
                    midPostW
                );
                numPickets = picketPositions.length;
                finalPicketsCount = numPickets;

                topMark = getMark(vals.topRailType !== 'none');
                botMark = getMark(vals.botRailType !== 'none');
                midMark = getMark(vals.midRailType !== 'none');
                leftMark = getMark(vals.leftPostType !== 'none');
                rightMark = getMark(vals.rightPostType !== 'none');
                midPostMark = getMark(!isGates && midPostCount > 0 && vals.midPostType !== 'none');
                picketMark = getMark(vals.picketType !== 'none' && finalPicketsCount > 0);
                kpMark = getMark(isGates && vals.kickPlate && vals.kickPlate !== 'none');
                bpMark = getMark(!isGates && vals.includeBasePlates === 'yes');
                meshFbMark = getMark(isGates && vals.meshType && vals.meshType !== 'none');
                meshPanelMark = getMark(isGates && vals.meshType && vals.meshType !== 'none');
                pbpMark = getMark(isGates && vals.panicBarPlate === 'yes');
            } else if (cat === 'fence') {
                postW = getPicketDimension(vals.postType, vals.postSize, vals.postW);
                topH = getProfileDimension(vals.topRailType, vals.topRailSize, vals.topRailH);
                botH = getProfileDimension(vals.botRailType, vals.botRailSize, vals.botRailH);
                midH = getProfileDimension(vals.midRailType, vals.midRailSize, vals.midRailH);
                pickW = getPicketDimension(vals.picketType, vals.picketSize, vals.picketW);
                midRailGap = vals.midRailGap !== undefined ? vals.midRailGap : 12.0;

                noPosts = (vals.postType === 'none' || vals.postHeight === 0 || vals.postSpacing === 0);
                numSpans = noPosts ? 1 : Math.max(1, Math.round(vals.length / (vals.postSpacing || 1)));
                numPosts = noPosts ? 0 : numSpans + 1;
                actualPostSpacing = noPosts ? vals.length : (vals.length / numSpans);
                const effectivePostW = noPosts ? 0 : postW;
                clearWidth = actualPostSpacing - effectivePostW;
                numPickets = vals.picketSpacing > 0 ? Math.floor((clearWidth - pickW) / vals.picketSpacing) : 0;
                totalPickets = numPickets * numSpans;

                topMark = getMark(vals.topRailType !== 'none');
                postMark = getMark(!noPosts && vals.postType !== 'none');
                botMark = getMark(vals.botRailType !== 'none');
                midMark = getMark(vals.midRailType !== 'none');
                picketMark = getMark(vals.picketType !== 'none' && totalPickets > 0);
                bpMark = getMark(vals.includeBasePlates === 'yes' && !noPosts);
            }

            // --- DRAW GENERIC DIMENSIONS (CORNER-TO-CORNER) ---
            const minX = vb[0];
            const minY = vb[1];
            const widthVal = vb[2];
            const heightVal = vb[3];
            const maxX = minX + widthVal;
            const maxY = minY + heightVal;



            const pdfScale = (cadMaxX - cadMinX) > 0.001 ? (drawW / (cadMaxX - cadMinX)) : 1.0;
            const placedPdfLeaders = [];

            if (cat === 'rail_catalog' && !isLoosePost) {
                const style = vals.railStyle || 'classical';
                let picketType = (style === 'classical' || style === 'executive') ? 'hss_rect' : ((style === 'urban_balcony' || style === 'villa_balcony' || style === 'urban_custom' || style === 'villa_custom') ? 'none' : (vals.picketType || 'hss_rect'));
                
                let pHeight = (style === 'classical' || style === 'executive') ? 45.75 : (vals.postHeight || 42.0);
                let fHeight = (style === 'classical' || style === 'executive') ? 41.0 : (vals.fenceHeight || 36.0);
                let topH = (style === 'classical' || style === 'executive') ? 1.5 : getProfileDimension(vals.topRailType, vals.topRailSize, vals.topRailH || 1.5);
                let botH = (style === 'classical' || style === 'executive') ? 1.5 : getProfileDimension(vals.botRailType, vals.botRailSize, vals.botRailH || 1.5);
                let postW = (style === 'classical' || style === 'executive') ? 1.5 : getPicketDimension(vals.postType, vals.postSize, vals.postW || 1.5);
                let picketW = (style === 'classical' || style === 'executive') ? 0.5 : getPicketDimension(vals.picketType, vals.picketSize, vals.picketW || 0.5);
                let picketSpacing = (style === 'classical') ? 4.0 : (style === 'executive' ? 4.0 : (vals.picketSpacing || 4.0));
                let midPostCount = (vals.midPosts === 'default' || vals.midPosts === 'yes') ? Math.max(0, Math.ceil(vals.length / 48) - 1) : ((vals.midPosts === 'custom' || vals.midPosts === 'custom_standard') ? (parseInt(vals.midPostCount) || 0) : 0);
                 let botY = pHeight - fHeight;
 
                 // --- HORIZONTAL DIMENSIONS (TOP) ---
                 // Tier 1 (Overall Length)
                 drawCadDimension(0, pHeight, vals.length, pHeight, -28, formatFraction(vals.length), "middle", "dim-width");
 
                 // Post Centers List
                 const postCenters = [];
                 postCenters.push((vals.leftPost === 'yes') ? (postW / 2) : 0);
                 if (vals.midPosts !== 'none' && midPostCount > 0) {
                     const resolvedCenters = resolveMidPostCenters(vals.length, vals.leftPost, vals.rightPost, vals.midPosts, midPostCount, postW, customSpacings, style);
                     resolvedCenters.forEach(midCx => {
                         postCenters.push(midCx);
                     });
                 }
                postCenters.push((vals.rightPost === 'yes') ? (vals.length - postW / 2) : vals.length);

                // Tier 2 (Spans)
                for (let i = 0; i < postCenters.length - 1; i++) {
                    const c1 = postCenters[i];
                    const c2 = postCenters[i+1];
                    drawCadDimension(c1, pHeight, c2, pHeight, -20, formatFraction(c2 - c1), "middle", `dim-span-${i}`);
                }

                // Tier 3 (Picket Patterns)
                if (picketType !== 'none') {
                    for (let i = 0; i < postCenters.length - 1; i++) {
                        const c1 = postCenters[i];
                        const c2 = postCenters[i+1];
                        const spanDist = c2 - c1;
                        const numP = Math.max(0, Math.floor(spanDist / picketSpacing - 0.001));

                        const isLeftPost = (i > 0) || (vals.leftPost === 'yes');
                        const isRightPost = (i < postCenters.length - 2) || (vals.rightPost === 'yes');
                        const alignToRight = (!isLeftPost && isRightPost);

                        if (numP >= 2) {
                            let p1, p2, looseEndSpacing;
                            if (alignToRight) {
                                p2 = c2 - picketSpacing;
                                p1 = c2 - numP * picketSpacing;
                                looseEndSpacing = p1 - c1;

                                drawCadDimension(c1, pHeight, p1, pHeight, -12, formatFraction(looseEndSpacing), "middle", `dim-picket-end-${i}`);
                                drawCadDimension(p1, pHeight, p2, pHeight, -12, formatFraction(p2 - p1), "middle", `dim-picket-center-${i}`);
                                drawCadDimension(p2, pHeight, c2, pHeight, -12, formatFraction(picketSpacing), "middle", `dim-picket-start-${i}`);
                            } else {
                                p1 = c1 + picketSpacing;
                                p2 = c1 + numP * picketSpacing;
                                looseEndSpacing = c2 - p2;

                                drawCadDimension(c1, pHeight, p1, pHeight, -12, formatFraction(picketSpacing), "middle", `dim-picket-start-${i}`);
                                drawCadDimension(p1, pHeight, p2, pHeight, -12, formatFraction(p2 - p1), "middle", `dim-picket-center-${i}`);
                                drawCadDimension(p2, pHeight, c2, pHeight, -12, formatFraction(looseEndSpacing), "middle", `dim-picket-end-${i}`);
                            }

                            const slopeRad = (vals.slope || 0) * Math.PI / 180;
                            const cosS = Math.cos(slopeRad);
                            const sinS = Math.sin(slopeRad);
                            const cx = (p1 + p2) / 2;
                            const cy = pHeight;
                            const rx = cx * cosS - cy * sinS;
                            const ry = cx * sinS + cy * cosS;
                            const midPdf = cadToPdf(rx, ry);
                            const labelDeltaY = annotationOffsets[`dim-picket-text-${i}`] !== undefined ? annotationOffsets[`dim-picket-text-${i}`] : 0;
                            const labelY = midPdf[1] - 6.0 + labelDeltaY * pdfScale;
                            const labelText = `(${numP - 1}) SPACES @ ${formatFraction(picketSpacing)} O/C`;
                            doc.setFont('helvetica', 'normal');
                            doc.setFontSize(4.5 * (customDimFontSize / 12.0));
                            doc.text(labelText, midPdf[0], labelY, { align: "center" });
                        } else if (numP === 1) {
                            if (alignToRight) {
                                const pCenter = c2 - picketSpacing;
                                const looseEndSpacing = pCenter - c1;
                                drawCadDimension(c1, pHeight, pCenter, pHeight, -12, formatFraction(looseEndSpacing), "middle", `dim-picket-end-${i}`);
                                drawCadDimension(pCenter, pHeight, c2, pHeight, -12, formatFraction(picketSpacing), "middle", `dim-picket-start-${i}`);
                            } else {
                                const pCenter = c1 + picketSpacing;
                                const looseEndSpacing = c2 - pCenter;
                                drawCadDimension(c1, pHeight, pCenter, pHeight, -12, formatFraction(picketSpacing), "middle", `dim-picket-start-${i}`);
                                drawCadDimension(pCenter, pHeight, c2, pHeight, -12, formatFraction(looseEndSpacing), "middle", `dim-picket-end-${i}`);
                            }
                        } else {
                            drawCadDimension(c1, pHeight, c2, pHeight, -12, formatFraction(spanDist), "middle", `dim-picket-none-${i}`);
                        }
                    }
                }

                // --- HORIZONTAL DIMENSIONS (BOTTOM - CLEAR OPENINGS) ---
                const clearSpans = [];
                let lastX = 0;
                
                const allPosts = [];
                if (vals.leftPost === 'yes') {
                    allPosts.push({ startX: 0, endX: postW });
                }
                if (vals.midPosts !== 'none' && midPostCount > 0) {
                    const resolvedCenters = resolveMidPostCenters(vals.length, vals.leftPost, vals.rightPost, vals.midPosts, midPostCount, postW, customSpacings, style);
                    resolvedCenters.forEach(midCx => {
                        allPosts.push({ startX: midCx - postW/2, endX: midCx + postW/2 });
                    });
                }
                if (vals.rightPost === 'yes') {
                    allPosts.push({ startX: vals.length - postW, endX: vals.length });
                }

                for (let i = 0; i < allPosts.length; i++) {
                    const p = allPosts[i];
                    if (p.startX > lastX + 0.01) {
                        clearSpans.push({ start: lastX, end: p.startX });
                    }
                    lastX = p.endX;
                }
                if (vals.length > lastX + 0.01) {
                    clearSpans.push({ start: lastX, end: vals.length });
                }

                clearSpans.forEach((span, idx) => {
                    drawCadDimension(span.start, 0, span.end, 0, 12, formatFraction(span.end - span.start), "middle", `dim-clear-${idx}`);
                });

                // --- VERTICAL DIMENSIONS (RIGHT / LEFT for Left Return) ---
                const isLeftReturn = (activePanelType === 'leftReturn');
                const vDimX = isLeftReturn ? 0 : vals.length;
                const vDimOffset1 = isLeftReturn ? -8 : 8;
                const vDimOffset2 = isLeftReturn ? -16 : 16;
                const vDimOffset3 = isLeftReturn ? -24 : 24;

                drawCadDimension(vDimX, pHeight - topH, vDimX, pHeight, vDimOffset1, formatFraction(topH), "left", "dim-vert-top-cap");
                drawCadDimension(vDimX, botY + botH, vDimX, pHeight - topH, vDimOffset1, formatFraction(pHeight - topH - (botY + botH)), "middle", "dim-vert-mid-rail");
                drawCadDimension(vDimX, botY, vDimX, botY + botH, vDimOffset1, formatFraction(botH), "left", "dim-vert-bot-rail");
                drawCadDimension(vDimX, 0, vDimX, botY, vDimOffset1, formatFraction(botY), "middle", "dim-vert-ground");
                
                drawCadDimension(vDimX, botY, vDimX, pHeight, vDimOffset2, formatFraction(fHeight), "middle", "dim-vert-fence-height");
                drawCadDimension(vDimX, 0, vDimX, pHeight, vDimOffset3, formatFraction(pHeight), "middle", "dim-height");

                // --- VERTICAL DIMENSIONS (LEFT) ---
                if (midPostCount > 0) {
                    const firstMidPostCx = postCenters[1];
                    const mpH_dim = (style === 'executive') ? 44.25 : (pHeight - topH);
                    drawCadDimension(0, 0, 0, mpH_dim, -8, formatFraction(mpH_dim), "middle", "dim-vert-left-midpost");
                }
            } else if (isLoosePost) {
                const style = vals.railStyle || 'classical';
                const props = getResolvedPanelProperties(vals, style);
                const pHeight = props ? props.pHeight : 45.75;
                const postW = props ? props.postW : 1.5;
                const includeBasePlates = props ? props.includeBasePlates : 'no';
                const bpW = props ? props.basePlateW : 6.0;
                const bpH = props ? props.basePlateT : 0.5;

                const distToLeftMargin = (-cadMinX / (cadMaxX - cadMinX)) * drawW;
                const distToTopMargin = ((cadMaxY - pHeight) / (cadMaxY - cadMinY)) * drawH;

                // Vertical Stacked Dimensions (Left)
                const overallH = pHeight + (includeBasePlates === 'yes' ? bpH : 0);
                if (includeBasePlates === 'yes') {
                    drawCadDimension(0, -bpH, 0, pHeight, -(distToLeftMargin + 16), formatFeetInches(overallH), "middle", "dim-height-overall");
                    drawCadDimension(0, 0, 0, pHeight, -(distToLeftMargin + 8), formatFeetInches(pHeight), "middle", "dim-height-post");
                    drawCadDimension(0, -bpH, 0, 0, -(distToLeftMargin + 8), formatFraction(bpH), "middle", "dim-height-bp");
                } else {
                    drawCadDimension(0, 0, 0, pHeight, -(distToLeftMargin + 8), formatFeetInches(pHeight), "middle", "dim-height-post");
                }
                
                // Horizontal Stacked Dimensions (Top)
                if (includeBasePlates === 'yes') {
                    drawCadDimension(postW / 2 - bpW / 2, pHeight, postW / 2 + bpW / 2, pHeight, -(distToTopMargin + 16), formatFraction(bpW), "middle", "dim-width-overall");
                    drawCadDimension(0, pHeight, postW, pHeight, -(distToTopMargin + 8), formatFraction(postW), "middle", "dim-width-post");
                } else {
                    drawCadDimension(0, pHeight, postW, pHeight, -(distToTopMargin + 8), formatFraction(postW), "middle", "dim-width-post");
                }

                // Flat Bar Top Gap Dimension (Right)
                const isMeshStyle = (style === 'urban_balcony' || style === 'villa_balcony' || style === 'urban_custom' || style === 'villa_custom');
                if (isMeshStyle) {
                    const topRailH = props ? props.topRailH : 1.5;
                    const midRailType = props ? props.midRailType : 'none';
                    const midRailGap = props ? props.midRailGap : 12.0;
                    const midRailH = props ? props.midRailH : 1.5;
                    const hasMid = (style === 'villa_balcony' || (style === 'villa_custom' && midRailType !== 'none'));
                    const yEnd = hasMid ? (pHeight - topRailH - midRailGap - midRailH) : (pHeight - topRailH);
                    const fbGap = pHeight - yEnd;

                    const distToRightMargin = ((cadMaxX - postW) / (cadMaxX - cadMinX)) * drawW;
                    drawCadDimension(postW, yEnd, postW, pHeight, distToRightMargin + 8, formatFraction(fbGap), "middle", "dim-height-fb-gap");
                }

                // Vertical Dashed Centerline
                const startY_cl = (includeBasePlates === 'yes' ? -bpH : 0) - 2;
                const endY_cl = pHeight + 2;
                const clStart = cadToPdf(postW / 2, startY_cl);
                const clEnd = cadToPdf(postW / 2, endY_cl);
                doc.setDrawColor(0, 0, 0);
                doc.setLineWidth(0.18);
                doc.setLineDashPattern([2, 1.5], 0);
                doc.line(clStart[0], clStart[1], clEnd[0], clEnd[1]);
                doc.setLineDashPattern([], 0); // Restore solid line style
            } else {
                drawCadDimension(cadMinX, cadMaxY, cadMaxX, cadMaxY, -35, formatFraction(actualWidthInches), "middle", "dim-width");
                drawCadDimension(cadMinX, cadMinY, cadMinX, cadMaxY, -35, formatFraction(actualHeightInches), "middle", "dim-height");
            }

            // --- DRAW CUSTOM AutoCAD DIMENSIONS ---
            customDimensionsList.forEach((dim, idx) => {
                drawCadDimensionDirect(dim, idx);
            });

            // --- DRAW CALLOUT LEADERS ---
            if (cat === 'rail_catalog' && !isLoosePost) {
                const leftLeaderX = Math.max(22, pdfX - 10);
                const rightLeaderX = Math.min(170, pdfX + drawW + 10);
                
                const isLeftReturn = (activePanelType === 'leftReturn');
                const leaderLabelX = isLeftReturn ? rightLeaderX : leftLeaderX;
                const leaderAlign = isLeftReturn ? "left" : "right";
                
                const style = vals.railStyle || 'classical';
                
                let pHeight = (style === 'classical' || style === 'executive') ? 45.75 : (vals.postHeight || 42.0);
                let fHeight = (style === 'classical' || style === 'executive') ? 41.0 : (vals.fenceHeight || 36.0);
                let topH = (style === 'classical' || style === 'executive') ? 1.5 : getProfileDimension(vals.topRailType, vals.topRailSize, vals.topRailH || 1.5);
                let botH = (style === 'classical' || style === 'executive') ? 1.5 : getProfileDimension(vals.botRailType, vals.botRailSize, vals.botRailH || 1.5);
                let midH = (style === 'classical') ? 0 : (style === 'executive' ? 1.5 : getProfileDimension(vals.midRailType, vals.midRailSize, vals.midRailH || 1.5));
                let midRailGap = (style === 'classical') ? 0 : (style === 'executive' ? 3.0 : (vals.midRailGap || 12.0));
                let postW = (style === 'classical' || style === 'executive') ? 1.5 : getPicketDimension(vals.postType, vals.postSize, vals.postW || 1.5);
                let picketW = (style === 'classical' || style === 'executive') ? 0.5 : getPicketDimension(vals.picketType, vals.picketSize, vals.picketW || 0.5);

                const effectiveEmbed = 0;
                const botY = pHeight - fHeight;

                const railSpans = resolveRailMarksAndSpans(vals, drawingNo, cat, style, postW);

                // 1. Top Rail leader (1FB)
                if (topMark) {
                    const cyTop = pHeight - topH / 2;
                    const pTop = cadToPdf(vals.length * 0.25, cyTop);
                    drawCadLeader(vals.length * 0.25, cyTop, leaderLabelX, pTop[1], topMark, leaderAlign, "leader-top-rail");
                }

                // 2. Bottom Rail leaders (directly below each segment in empty space of bay)
                if (botMark && railSpans.bottomSegments.length > 0) {
                    const uniqueMarksSeen = new Set();
                    railSpans.bottomSegments.forEach(seg => {
                        if (!uniqueMarksSeen.has(seg.mark)) {
                            uniqueMarksSeen.add(seg.mark);
                            const segCenter = (seg.start + seg.end) / 2;
                            const pBot = cadToPdf(segCenter, botY);
                             
                             // Draw tiny vertical leader pointing up
                             const lineStartY = pBot[1] + 6.0;
                             const lineEndY = pBot[1];
                             doc.setLineWidth(0.15);
                             doc.setDrawColor(0, 0, 0);
                             doc.line(pBot[0], lineStartY, pBot[0], lineEndY);
                             drawArrowhead(pBot[0], lineEndY, -Math.PI / 2, 0.7); // pointing up
                             
                             // Draw text below the line
                             doc.setFont('helvetica', 'bold');
                             doc.setFontSize(4.5 * (customDimFontSize / 12.0));
                             doc.setTextColor(0, 0, 0);
                             doc.text(seg.mark, pBot[0], pBot[1] + 8.5, { align: "center" });
                         }
                     });
                }

                // 3. Left Corner Post leader
                if (leftMark) {
                    const cyLeft = pHeight * 0.8;
                    const pLeft = cadToPdf(postW / 2, cyLeft);
                    drawCadLeader(postW / 2, cyLeft, leaderLabelX, pLeft[1], leftMark, leaderAlign, "leader-left-post");
                }

                // 4. Right Corner Post leader
                if (rightMark) {
                    const cyRight = (leftMark && rightMark) ? (pHeight * 0.6) : (pHeight * 0.8);
                    const pRight = cadToPdf(vals.length - postW / 2, cyRight);
                    drawCadLeader(vals.length - postW / 2, cyRight, leaderLabelX, pRight[1], rightMark, leaderAlign, "leader-right-post");
                }

                // 5. Mid Runner leaders
                if (midMark && railSpans.midSegments.length > 0) {
                    const cyMid = pHeight - topH - midRailGap - midH / 2;
                    const uniqueMarksSeen = new Set();
                    railSpans.midSegments.forEach(seg => {
                        if (!uniqueMarksSeen.has(seg.mark)) {
                            uniqueMarksSeen.add(seg.mark);
                            const segCenter = (seg.start + seg.end) / 2;
                            const pMid = cadToPdf(segCenter, cyMid);
                            drawCadLeader(segCenter, cyMid, leaderLabelX, pMid[1], seg.mark, leaderAlign, "leader-mid-rail-" + seg.mark);
                        }
                    });
                }

                // 6. Mid Post leader
                if (midPostMark) {
                    const resolvedCenters = resolveMidPostCenters(vals.length, vals.leftPost, vals.rightPost, vals.midPosts, midPostCount, postW, customSpacings, style);
                    if (resolvedCenters.length > 0) {
                        const midCx = resolvedCenters[0];
                        const mpH = style === 'executive' ? 44.25 : (pHeight - topH);
                        const cyMidPost = mpH * 0.55;
                        const targetX = (leaderAlign === "right") ? (midCx - postW / 2) : (midCx + postW / 2);
                        const pMidPost = cadToPdf(targetX, cyMidPost);
                        drawCadLeader(targetX, cyMidPost, leaderLabelX, pMidPost[1], midPostMark, leaderAlign, "leader-mid-post");
                    }
                }

                // 7. Picket leader
                if (picketMark && finalPicketsCount > 0) {
                    const startX = (vals.leftPost === 'yes') ? postW : 0;
                    const endX = (midPostCount > 0) ? (startX + (vals.length - postW - (vals.leftPost === 'yes' ? postW : 0)) / (midPostCount + 1) - postW/2) : ((vals.rightPost === 'yes') ? (vals.length - postW) : vals.length);
                    
                    let leftPostCenter = startX;
                    if (startX > 0) {
                        leftPostCenter = startX - postW / 2;
                    } else if (vals.leftPost === 'yes') {
                        leftPostCenter = postW / 2;
                    }

                    let rightPostCenter = endX;
                    if (endX < vals.length) {
                        rightPostCenter = endX + postW / 2;
                    } else if (vals.rightPost === 'yes') {
                        rightPostCenter = vals.length - postW / 2;
                    }

                    const spanCenterDist = rightPostCenter - leftPostCenter;
                    const numP = Math.max(0, Math.floor(spanCenterDist / vals.picketSpacing - 0.001));
                    if (numP > 0) {
                        const pickCx = (leaderAlign === "right")
                            ? (leftPostCenter + vals.picketSpacing)
                            : (rightPostCenter - vals.picketSpacing);

                        const picketBottomY = botY + botH;
                        const picketTopY = (midMark) ? (pHeight - topH - midRailGap - midH) : (pHeight - topH);
                        const pickCy = picketBottomY + 6.0;

                        const pPick = cadToPdf(pickCx, pickCy);
                        drawCadLeader(pickCx, pickCy, leaderLabelX, pPick[1], picketMark, leaderAlign, "leader-pickets");
                    }
                }

                if (isMeshStyle) {
                    const startX = (vals.leftPost === 'yes') ? postW : 0;
                    const endX = (midPostCount > 0) ? (startX + (vals.length - postW - (vals.leftPost === 'yes' ? postW : 0)) / (midPostCount + 1) - postW/2) : ((vals.rightPost === 'yes') ? (vals.length - postW) : vals.length);
                    const spanW = endX - startX;
                    
                    const mBottomY = botY + botH;
                    const mTopY = (midMark) ? (pHeight - topH - midRailGap - midH) : (pHeight - topH);
                    const mHeight = mTopY - mBottomY;

                    if (meshFbMark) {
                        const fbY = mBottomY + 0.5;
                        const fbX = (leaderAlign === "right")
                            ? (startX + spanW * 0.3)
                            : (endX - spanW * 0.3);
                        const pFb = cadToPdf(fbX, fbY);
                        drawCadLeader(fbX, fbY, leaderLabelX, pFb[1], meshFbMark, leaderAlign, "leader-mesh-fb");
                    }
                    if (meshPanelMark) {
                        const mY = mBottomY + mHeight * 0.5;
                        const mX = (leaderAlign === "right")
                            ? (startX + spanW * 0.4)
                            : (endX - spanW * 0.4);
                        const pMesh = cadToPdf(mX, mY);
                        drawCadLeader(mX, mY, leaderLabelX, pMesh[1], meshPanelMark, leaderAlign, "leader-mesh-panel");
                    }
                }

                // Draw Section A cut line in elevation
                if (isMeshStyle) {
                    const postCenters = [];
                    postCenters.push((vals.leftPost === 'yes') ? (postW / 2) : 0);
                    if (vals.midPosts !== 'none' && midPostCount > 0) {
                        const resolvedCenters = resolveMidPostCenters(vals.length, vals.leftPost, vals.rightPost, vals.midPosts, midPostCount, postW, customSpacings, style);
                        resolvedCenters.forEach(midCx => {
                            postCenters.push(midCx);
                        });
                    }
                    postCenters.push((vals.rightPost === 'yes') ? (vals.length - postW / 2) : vals.length);

                    // Find the first bay index that has a post on its left
                    let targetBayIndex = 0;
                    for (let i = 0; i < postCenters.length - 1; i++) {
                        let hasPostAtLeft = false;
                        if (i === 0) {
                            hasPostAtLeft = (vals.leftPost === 'yes' && vals.postType !== 'none');
                        } else {
                            hasPostAtLeft = (vals.midPosts !== 'none' && midPostCount > 0 && vals.postType !== 'none');
                        }
                        if (hasPostAtLeft) {
                            targetBayIndex = i;
                            break;
                        }
                    }

                    if (postCenters.length >= 2) {
                        const cutX = (postCenters[targetBayIndex] + postCenters[targetBayIndex + 1]) / 2;
                        const hasMid = (style === 'villa_balcony' || (style === 'villa_custom' && vals.midRailType !== 'none'));
                        
                        const propsResolved = getResolvedPanelProperties(vals, style);
                        const pHeightResolved = propsResolved ? propsResolved.pHeight : 45.75;
                        const fHeightResolved = propsResolved ? propsResolved.fHeight : 41.0;
                        const topHResolved = propsResolved ? propsResolved.topRailH : 1.5;
                        const midRailGapResolved = propsResolved ? propsResolved.midRailGap : 12.0;
                        const midHResolved = propsResolved ? propsResolved.midRailH : 1.5;
                        
                        const topGapResolved = (style === 'classical' || style === 'executive' || style === 'urban_balcony' || style === 'villa_balcony') ? (pHeightResolved - fHeightResolved) : (vals.topGap !== undefined ? vals.topGap : 2.0);
                        const midRailTop = pHeightResolved - topGapResolved - topHResolved - midRailGapResolved;
                        const midRailBottom = midRailTop - midHResolved;
                        
                        const cutYTop = hasMid ? midRailTop : (pHeightResolved + 4);
                        const cutYBot = hasMid ? (midRailBottom - 12) : (pHeightResolved - 12);
                        
                        const pTop = cadToPdf(cutX, cutYTop);
                        const pBot = cadToPdf(cutX, cutYBot);
                        
                        // Draw vertical cut line
                        doc.setDrawColor(0, 0, 0);
                        doc.setLineWidth(0.35);
                        doc.line(pTop[0], pTop[1], pBot[0], pBot[1]);
                        
                        // Draw horizontal hook at the top pointing right
                        const hookLength = 6.0; // in mm
                        const hookEndX = pTop[0] + hookLength;
                        doc.line(pTop[0], pTop[1], hookEndX, pTop[1]);
                        
                        // Draw arrowhead pointing right at the end of the hook
                        drawArrowhead(hookEndX, pTop[1], 0, 1.8);
                        
                        // Draw text label "A" next to the arrowhead
                        doc.setFont('helvetica', 'bold');
                        doc.setFontSize(7);
                        doc.text("A", hookEndX + 1.5, pTop[1] + 2.5);
                    }
                }
            } else if (isLoosePost) {
                const style = vals.railStyle || 'classical';
                const props = getResolvedPanelProperties(vals, style);
                let pHeight = props ? props.pHeight : 45.75;
                let postW = props ? props.postW : 1.5;
                let includeBasePlates = props ? props.includeBasePlates : 'no';
                let bpH = props ? props.basePlateT : 0.5;
                let bpW = props ? props.basePlateW : 6.0;

                const postDwgMark = `a${drawingNo.toUpperCase()}`;
                const cyPost = pHeight * 0.5;
                const pPost = cadToPdf(postW, cyPost);
                drawCadLeader(postW, cyPost, pdfX + drawW + 16, pPost[1], postDwgMark, "left", "leader-loose-post");

                if (includeBasePlates === 'yes') {
                    const bpDwgMark = `b${drawingNo.toUpperCase()}`;
                    const cyBp = -bpH * 0.5;
                    const pBp = cadToPdf(postW / 2 + bpW / 2, cyBp);
                    drawCadLeader(postW / 2 + bpW / 2, cyBp, pdfX + drawW + 16, pBp[1], bpDwgMark, "left", "leader-loose-bp");
                }

                const isMeshStyle = (style === 'urban_balcony' || style === 'villa_balcony' || style === 'urban_custom' || style === 'villa_custom');
                if (isMeshStyle) {
                    const fH = props ? props.fHeight : 41.0;
                    const bY = pHeight - fH;
                    const bH = (props && props.botRailH !== undefined) ? props.botRailH : 1.5;
                    const tH = (props && props.topRailH !== undefined) ? props.topRailH : 1.5;
                    const mGap = (props && props.midRailGap !== undefined) ? props.midRailGap : 3.0;
                    const mH = (props && props.midRailH !== undefined) ? props.midRailH : 1.5;
                    const mType = props ? props.midRailType : 'none';

                    const yStart = bY + bH;
                    const hasMid = (style === 'villa_balcony' || (style === 'villa_custom' && mType !== 'none'));
                    const yEnd = hasMid ? (pHeight - tH - mGap - mH) : (pHeight - tH);
                    const fbHeight = yEnd - yStart;

                    if (fbHeight > 0) {
                        const fbDwgMark = `c${drawingNo.toUpperCase()}`;
                        const cyFb = yStart + fbHeight * 0.5;
                        const pFb = cadToPdf(postW + 0.5, cyFb);
                        drawCadLeader(postW + 0.5, cyFb, pdfX + drawW + 16, pFb[1], fbDwgMark, "left", "leader-loose-fb");
                    }
                }
            } else if (cat === 'rails_gates') {
                const leftLeaderX = Math.max(22, pdfX - 16);
                const rightLeaderX = Math.min(170, pdfX + drawW + 16);
                
                const isLeftReturn = (activePanelType === 'leftReturn');
                const leaderLabelX = isLeftReturn ? rightLeaderX : leftLeaderX;
                const leaderAlign = isLeftReturn ? "left" : "right";
                
                const effectiveEmbed = isGates ? 0 : ((vals.includeBasePlates === 'yes') ? 0 : Math.max(0, vals.postHeight - vals.fenceHeight - 6.0));

                // 1. Top Runner / Rail leader
                if (topMark) {
                    const cyTop = (isGates ? (vals.fenceHeight - topH / 2) : (vals.postHeight - topH / 2)) - effectiveEmbed;
                    const pTop = cadToPdf(vals.length * 0.25, cyTop);
                    drawCadLeader(vals.length * 0.25, cyTop, leftLeaderX, pTop[1], topMark, "right", "leader-top-rail");
                }

                // 2. Bottom Runner / Rail leader
                if (botMark) {
                    const cyBot = (isGates ? (botH / 2) : ((vals.postHeight > vals.fenceHeight) ? (vals.postHeight - vals.fenceHeight + botH/2) : (botH / 2))) - effectiveEmbed;
                    const pBot = cadToPdf(vals.length * 0.25, cyBot);
                    drawCadLeader(vals.length * 0.25, cyBot, leftLeaderX, pBot[1], botMark, "right", "leader-bot-rail");
                }

                // 3. Left Post / Runner leader
                if (leftMark) {
                    const cyLeft = (isGates ? (vals.fenceHeight * 0.5) : (vals.postHeight * 0.5)) - effectiveEmbed;
                    const pLeft = cadToPdf(leftPostW / 2, cyLeft);
                    drawCadLeader(leftPostW / 2, cyLeft, leftLeaderX, pLeft[1], leftMark, "right", "leader-left-post");
                }

                // 4. Right Post / Runner leader
                if (rightMark) {
                    const cyRight = (isGates ? (vals.fenceHeight * 0.5) : (vals.postHeight * 0.5)) - effectiveEmbed;
                    const cyRightAdjusted = (leftMark && rightMark) ? (cyRight - 5.0) : cyRight;
                    const pRightAdjusted = cadToPdf(vals.length - rightPostW / 2, cyRightAdjusted);
                    drawCadLeader(vals.length - rightPostW / 2, cyRightAdjusted, rightLeaderX, pRightAdjusted[1], rightMark, "left", "leader-right-post");
                }

                // 5. Mid Runner / Rail leader (if present)
                if (midMark) {
                    const cyMid = (isGates ? (midRailGap - midH / 2) : (vals.postHeight - midRailGap - midH / 2)) - effectiveEmbed;
                    const pMid = cadToPdf(vals.length * 0.75, cyMid);
                    drawCadLeader(vals.length * 0.75, cyMid, rightLeaderX, pMid[1], midMark, "left", "leader-mid-rail");
                }

                // 6. Pickets leader (if present)
                if (picketMark) {
                    if (numPickets > 0) {
                        const usedWidth = (numPickets - 1) * vals.picketSpacing + pickW;
                        const startX = leftPostW + (clearWidth - usedWidth) / 2;
                        const midIdx = Math.floor(numPickets / 2);
                        const pickCx = startX + midIdx * vals.picketSpacing + pickW / 2;
                        
                        let picketBottomY, picketTopY;
                        if (isGates) {
                            picketBottomY = (vals.midRailType !== 'none') ? midRailGap : ((vals.kickPlate !== 'none') ? (vals.kickPlateWeld === 'outer' ? kickPlateH : botH + kickPlateH) : botH);
                            picketTopY = vals.fenceHeight - topH;
                        } else {
                            picketBottomY = (vals.midRailType !== 'none') ? (vals.postHeight - midRailGap) : ((vals.postHeight > vals.fenceHeight) ? (vals.postHeight - vals.fenceHeight + botH) : botH);
                            picketTopY = vals.postHeight - topH;
                        }
                        const pickCy = (picketBottomY + picketTopY) / 2;
                        const cyPick = pickCy - effectiveEmbed;

                        const pPick = cadToPdf(pickCx, cyPick);
                        drawCadLeader(pickCx, cyPick, rightLeaderX, pPick[1], picketMark, "left", "leader-pickets");
                    }
                }

                // 7. Kick Plate leader (if present)
                if (kpMark) {
                    const cyKp = ((vals.kickPlateWeld === 'outer' ? 0 : botH) + kickPlateH / 2) - effectiveEmbed;
                    const pKp = cadToPdf(vals.length * 0.75, cyKp);
                    drawCadLeader(vals.length * 0.75, cyKp, rightLeaderX, pKp[1], kpMark, "left", "leader-kickplate");
                }
                
                // 8. Wire Mesh / Expanded Metal Frame FB and Panel leaders in PDF
                if (isGates && vals.meshType && vals.meshType !== 'none') {
                    const picketBottomY = (vals.midRailType !== 'none') ? vals.midRailGap : ((vals.kickPlate !== 'none') ? (vals.kickPlateWeld === 'outer' ? kickPlateH : botH + kickPlateH) : botH);
                    const mOpeningH = (vals.fenceHeight - topH) - picketBottomY;
                    const meshCenterY = picketBottomY + mOpeningH / 2;
                    const cyMesh = meshCenterY - effectiveEmbed;
                    
                    if (meshFbMark) {
                        const pMeshFb = cadToPdf(leftPostW + 4.0, cyMesh + 4.0);
                        drawCadLeader(leftPostW + 4.0, cyMesh + 4.0, leftLeaderX, pMeshFb[1], meshFbMark, "right", "leader-mesh-fb");
                    }
                    if (meshPanelMark) {
                        const pMeshPanel = cadToPdf(vals.length * 0.55, cyMesh);
                        drawCadLeader(vals.length * 0.55, cyMesh, rightLeaderX, pMeshPanel[1], meshPanelMark, "left", "leader-mesh-panel");
                    }
                }
                
                // 9. Panic Bar Plate leader in PDF
                if (isGates && vals.panicBarPlate === 'yes' && pbpMark) {
                    const pbpCenterGap = vals.panicBarPlateGap !== undefined ? vals.panicBarPlateGap : 36.0;
                    const cyPbp = pbpCenterGap - effectiveEmbed;
                    const pPbp = cadToPdf(vals.length * 0.5, cyPbp);
                    drawCadLeader(vals.length * 0.5, cyPbp, rightLeaderX, pPbp[1], pbpMark, "left", "leader-panicbar");
                }
            } else if (cat === 'fence') {
                const leftLeaderX = Math.max(22, pdfX - 16);
                const rightLeaderX = Math.min(170, pdfX + drawW + 16);
                
                const leaderLabelX = leftLeaderX; // Fence has no returns, vertical dimensions on right
                const leaderAlign = "right";

                const postW = getPicketDimension(vals.postType, vals.postSize, vals.postW);
                const topH = getProfileDimension(vals.topRailType, vals.topRailSize, vals.topRailH);
                const botH = getProfileDimension(vals.botRailType, vals.botRailSize, vals.botRailH);
                const midH = getProfileDimension(vals.midRailType, vals.midRailSize, vals.midRailH);
                const pickW = getPicketDimension(vals.picketType, vals.picketSize, vals.picketW);

                const noPosts = (vals.postType === 'none' || vals.postHeight === 0 || vals.postSpacing === 0);
                const effectiveEmbed = noPosts ? 0 : ((vals.includeBasePlates === 'yes') ? 0 : Math.max(0, vals.postHeight - vals.fenceHeight - vals.topGap - 6.0));
                const botY = noPosts ? 4.0 : (vals.postHeight - vals.topGap - vals.fenceHeight);
                const topY = noPosts ? (4.0 + vals.fenceHeight - topH) : (vals.postHeight - vals.topGap - topH);
                const midY = (vals.midRailType !== 'none') ? (topY - midRailGap - midH) : ((botY + topY) / 2);

                // 1. Top Rail leader (Main Mark)
                if (topMark) {
                    const cyTop = topY + topH/2 - effectiveEmbed;
                    const pTop = cadToPdf(vals.length * 0.25, cyTop);
                    drawCadLeader(vals.length * 0.25, cyTop, leaderLabelX, pTop[1], topMark, leaderAlign, "leader-top-rail");
                }

                // 2. Post leader
                if (postMark) {
                    const cyPost = vals.postHeight * 0.5 - effectiveEmbed;
                    const pPost = cadToPdf(postW/2, cyPost);
                    drawCadLeader(postW/2, cyPost, leaderLabelX, pPost[1], postMark, leaderAlign, "leader-post");
                }

                // 3. Bottom Rail leader
                if (botMark) {
                    const cyBot = botY + botH/2 - effectiveEmbed;
                    const pBot = cadToPdf(vals.length * 0.25, cyBot);
                    drawCadLeader(vals.length * 0.25, cyBot, leaderLabelX, pBot[1], botMark, leaderAlign, "leader-bot-rail");
                }

                // 4. Mid Rail leader
                if (midMark) {
                    const cyMid = midY + midH/2 - effectiveEmbed;
                    const pMid = cadToPdf(vals.length * 0.75, cyMid);
                    drawCadLeader(vals.length * 0.75, cyMid, leaderLabelX, pMid[1], midMark, leaderAlign, "leader-mid-rail");
                }

                // 5. Pickets leader
                if (picketMark) {
                    if (numPickets > 0) {
                        const usedWidth = (numPickets - 1) * vals.picketSpacing + pickW;
                        const startX = (noPosts ? 0 : postW) + (clearWidth - usedWidth) / 2;
                        const midIdx = Math.floor(numPickets / 2);
                        const pickCx = startX + midIdx * vals.picketSpacing + pickW/2;
                        
                        const picketY = (vals.botRailType === 'none') ? (botY + 4) : (botY + botH);
                        const picketTopY = (vals.midRailType !== 'none') ? (topY - midRailGap - midH) : topY;
                        const pickCy = (picketY + picketTopY)/2;
                        const cyPick = pickCy - effectiveEmbed;
                        const pPick = cadToPdf(pickCx, cyPick);
                        drawCadLeader(pickCx, cyPick, leaderLabelX, pPick[1], picketMark, leaderAlign, "leader-pickets");
                    }
                }
            }
            
            // --- DRAW DETAIL BOXES ---
            const formatAiscSize = (sizeStr) => {
                if (!sizeStr || sizeStr === 'NONE') return 'None';
                return sizeStr.replace(/1\.5/g, '1 1/2').replace(/1\/2/g, '1/2');
            };

            const drawBasePlateDetail = (doc, boxX, boxY, boxW, boxH, vals) => {
                const style = vals.railStyle || 'classical';
                let bpPostW = 1.5;
                let bpPostH = 1.5;
                if (cat === 'rail_catalog') {
                    bpPostW = (style === 'classical' || style === 'executive') ? 1.5 : getPicketDimension(vals.postType, vals.postSize, vals.postW || 1.5);
                    bpPostH = (style === 'classical' || style === 'executive') ? 1.5 : getProfileDimension(vals.postType, vals.postSize, vals.postW || 1.5);
                } else if (cat === 'rails_gates') {
                    bpPostW = getPicketDimension(vals.leftPostType, vals.leftPostSize, vals.leftPostW || 2.0);
                    bpPostH = getProfileDimension(vals.leftPostType, vals.leftPostSize, vals.leftPostW || 2.0);
                } else if (cat === 'fence') {
                    bpPostW = getPicketDimension(vals.postType, vals.postSize, vals.postW || 2.0);
                    bpPostH = getProfileDimension(vals.postType, vals.postSize, vals.postW || 2.0);
                }

                const bpW_val = parseFloat(vals.basePlateW) || 6.0;
                const bpL_val = parseFloat(vals.basePlateL) || 6.0;
                const bpT_val = parseFloat(vals.basePlateT) || 0.5;
                const bpHoleD_val = parseFloat(vals.basePlateHoleD) || 0.5;
                const bpHoleOffsetX_val = parseFloat(vals.basePlateHoleOffsetX) || 0.5;
                const bpHoleOffsetY_val = parseFloat(vals.basePlateHoleOffsetY) || 0.25;

                doc.setDrawColor(0, 0, 0);
                doc.setLineWidth(0.3);
                doc.setFillColor(255, 255, 255);
                doc.rect(boxX, boxY, boxW, boxH, 'FD');

                // Main Title
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(5.5);
                doc.setTextColor(0, 0, 0);
                doc.text("TYPICAL BASE PLATE DETAILS", boxX + boxW / 2, boxY + 4.5, { align: "center" });

                const bpScale = 18 / bpW_val;
                const bpDrawW = 18;
                const bpDrawL = bpL_val * bpScale;

                // --- 1. LEFT HALF: PLAN VIEW ---
                const cx1 = boxX + (boxW > 60 ? 22 : 14);
                const cy1 = boxY + boxH / 2 + 1;

                doc.setFont('helvetica', 'bold');
                doc.setFontSize(4.5);
                doc.text("PLAN VIEW", cx1, boxY + 9, { align: "center" });

                doc.setLineWidth(0.25);
                doc.rect(cx1 - bpDrawW / 2, cy1 - bpDrawL / 2, bpDrawW, bpDrawL, 'S');
                const postDrawW = bpPostW * bpScale;
                const postDrawH = bpPostH * bpScale;
                doc.setLineWidth(0.2);
                doc.rect(cx1 - postDrawW / 2, cy1 - postDrawH / 2, postDrawW, postDrawH, 'S');

                doc.setLineWidth(0.1);
                doc.setLineDashPattern([1, 1], 0);
                doc.line(cx1 - bpDrawW / 2 - 2, cy1, cx1 + bpDrawW / 2 + 2, cy1);
                doc.line(cx1, cy1 - bpDrawL / 2 - 2, cx1, cy1 + bpDrawL / 2 + 2);
                doc.setLineDashPattern([], 0);

                const hx1 = cx1 - bpDrawW / 2 + bpHoleOffsetX_val * bpScale;
                const hx2 = cx1 + bpDrawW / 2 - bpHoleOffsetX_val * bpScale;
                const hy1 = cy1 - bpDrawL / 2 + bpHoleOffsetY_val * bpScale;
                const hy2 = cy1 + bpDrawL / 2 - bpHoleOffsetY_val * bpScale;

                doc.setLineWidth(0.15);
                doc.circle(hx1, hy1, (bpHoleD_val * bpScale) / 2, 'S');
                doc.circle(hx2, hy1, (bpHoleD_val * bpScale) / 2, 'S');

                doc.setLineWidth(0.08);
                doc.setLineDashPattern([0.5, 0.5], 0);
                doc.line(hx1 - 1.5, hy1, hx1 + 1.5, hy1);
                doc.line(hx1, hy1 - 1.5, hx1, hy1 + 1.5);
                doc.line(hx2 - 1.5, hy1, hx2 + 1.5, hy1);
                doc.line(hx2, hy1 - 1.5, hx2, hy1 + 1.5);
                doc.setLineDashPattern([], 0);

                const dimY = cy1 + bpDrawL / 2 + 3.5;
                doc.setLineWidth(0.12);
                doc.line(cx1 - bpDrawW / 2, dimY, cx1 + bpDrawW / 2, dimY);
                doc.line(cx1 - bpDrawW / 2, dimY - 0.8, cx1 - bpDrawW / 2, dimY + 0.8);
                doc.line(cx1 + bpDrawW / 2, dimY - 0.8, cx1 + bpDrawW / 2, dimY + 0.8);

                doc.setFont('helvetica', 'normal');
                doc.setFontSize(3.8);
                doc.text(formatFraction(bpW_val) + " WIDTH", cx1, dimY + 3, { align: "center" });

                const dimX = cx1 + bpDrawW / 2 + (boxW > 60 ? 3.5 : 2.5);
                doc.line(dimX, cy1 - bpDrawL / 2, dimX, cy1 + bpDrawL / 2);
                doc.line(dimX - 0.8, cy1 - bpDrawL / 2, dimX + 0.8, cy1 - bpDrawL / 2);
                doc.line(dimX - 0.8, cy1 + bpDrawL / 2, dimX + 0.8, cy1 + bpDrawL / 2);

                doc.text(formatFraction(bpL_val) + " LG", dimX + (boxW > 60 ? 1.5 : 1.0), cy1 + 1, { align: "left" });

                doc.setLineWidth(0.18);
                const postLeaderStartX = cx1 - postDrawW / 4;
                const postLeaderStartY = cy1 - postDrawH / 4;
                const postLeaderEndX = cx1 - (boxW > 60 ? 10 : 8);
                const postLeaderEndY = cy1 - 10;
                doc.line(postLeaderStartX, postLeaderStartY, postLeaderEndX, postLeaderEndY);
                const postAngle = Math.atan2(postLeaderStartY - postLeaderEndY, postLeaderStartX - postLeaderEndX);
                drawArrowhead(postLeaderStartX, postLeaderStartY, postAngle, 0.8);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(boxW > 60 ? 4.5 : 3.5);
                doc.text(formatFraction(bpPostW) + "x" + formatFraction(bpPostH) + " HSS POST", postLeaderEndX - 0.8, postLeaderEndY + 0.5, { align: "right" });

                const holeLeaderStartX = hx1;
                const holeLeaderStartY = hy1;
                const holeLeaderEndX = cx1 - (boxW > 60 ? 10 : 8);
                const holeLeaderEndY = cy1 + 10;
                doc.line(holeLeaderStartX, holeLeaderStartY, holeLeaderEndX, holeLeaderEndY);
                const holeAngle = Math.atan2(holeLeaderStartY - holeLeaderEndY, holeLeaderStartX - holeLeaderEndX);
                drawArrowhead(holeLeaderStartX, holeLeaderStartY, holeAngle, 0.8);
                doc.text("(2) " + formatFraction(bpHoleD_val) + "\" \u00D8 HOLES", holeLeaderEndX - 0.8, holeLeaderEndY + 0.5, { align: "right" });

                // --- 2. RIGHT HALF: SECTION VIEW ---
                const cx2 = boxX + (boxW > 60 ? 60 : 38);
                const cy_top_surface = cy1 - 4;
                const bpDrawT = Math.max(1.2, bpT_val * bpScale);

                doc.setFont('helvetica', 'bold');
                doc.setFontSize(4.5);
                doc.text("SECTION A-A", cx2, boxY + 9, { align: "center" });

                doc.setLineWidth(0.25);
                doc.rect(cx2 - bpDrawW / 2, cy_top_surface, bpDrawW, bpDrawT, 'S');
                const postDrawH_side = 16;
                doc.rect(cx2 - postDrawW / 2, cy_top_surface - postDrawH_side, postDrawW, postDrawH_side, 'S');

                doc.setFillColor(0, 0, 0);
                doc.triangle(cx2 - postDrawW / 2, cy_top_surface, cx2 - postDrawW / 2 - 1.2, cy_top_surface, cx2 - postDrawW / 2, cy_top_surface - 1.2, 'F');
                doc.triangle(cx2 + postDrawW / 2, cy_top_surface, cx2 + postDrawW / 2 + 1.2, cy_top_surface, cx2 + postDrawW / 2, cy_top_surface - 1.2, 'F');

                const boltLx1 = cx2 - bpDrawW / 2 + bpHoleOffsetX_val * bpScale;
                const boltLx2 = cx2 + bpDrawW / 2 - bpHoleOffsetX_val * bpScale;
                doc.setLineWidth(0.2);
                doc.line(boltLx1, cy_top_surface + bpDrawT, boltLx1, cy_top_surface + bpDrawT + 8);
                doc.line(boltLx2, cy_top_surface + bpDrawT, boltLx2, cy_top_surface + bpDrawT + 8);
                doc.line(boltLx1 - 0.8, cy_top_surface + bpDrawT + 8, boltLx1 + 0.8, cy_top_surface + bpDrawT + 8);
                doc.line(boltLx2 - 0.8, cy_top_surface + bpDrawT + 8, boltLx2 + 0.8, cy_top_surface + bpDrawT + 8);

                const thickDimX = cx2 - bpDrawW / 2 - (boxW > 60 ? 3 : 2);
                doc.setLineWidth(0.12);
                doc.line(thickDimX, cy_top_surface, thickDimX, cy_top_surface + bpDrawT);
                doc.line(thickDimX - 0.6, cy_top_surface, thickDimX + 0.6, cy_top_surface);
                doc.line(thickDimX - 0.6, cy_top_surface + bpDrawT, thickDimX + 0.6, cy_top_surface + bpDrawT);
                
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(3.8);
                doc.text(formatFraction(bpT_val) + " THK", thickDimX - 1.0, cy_top_surface + bpDrawT / 2 + 1.2, { align: "right" });

                const weldLeaderStartX = cx2 - postDrawW / 2 - 0.4;
                const weldLeaderStartY = cy_top_surface - 0.4;
                const weldLeaderEndX = cx2 - (boxW > 60 ? 12 : 9);
                const weldLeaderEndY = cy_top_surface - 8;
                doc.setLineWidth(0.15);
                doc.line(weldLeaderStartX, weldLeaderStartY, weldLeaderEndX, weldLeaderEndY);
                const weldAngle = Math.atan2(weldLeaderStartY - weldLeaderEndY, weldLeaderStartX - weldLeaderEndX);
                drawArrowhead(weldLeaderStartX, weldLeaderStartY, weldAngle, 0.8);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(boxW > 60 ? 4.5 : 3.5);
                doc.text("3/16\" FILLET WELD TYP.", weldLeaderEndX - 0.6, weldLeaderEndY + 0.5, { align: "right" });
            };

            const drawWireMeshDetail = (doc, boxX, boxY, boxW, boxH, vals) => {
                doc.setDrawColor(0, 0, 0);
                doc.setLineWidth(0.3);
                doc.setFillColor(255, 255, 255);
                doc.rect(boxX, boxY, boxW, boxH, 'FD');

                const style = vals.railStyle || 'classical';
                
                // Geometry Center
                // Shift left slightly to make space for the angled leaders pointing to the labels on the right
                const cx = boxX + boxW * 0.38;
                const cy_top = boxY + 8;
                
                const scale = 5.5; // Scale down slightly to fit the angled leaders and text labels cleanly
                
                // Top rail square (1.5" x 1.5" usually, or custom)
                const trH = (style === 'classical' || style === 'executive' || style === 'urban_balcony' || style === 'villa_balcony') ? 1.5 : (vals.topRailH || 1.5);
                const trW = (style === 'classical' || style === 'executive' || style === 'urban_balcony' || style === 'villa_balcony') ? 1.5 : (vals.topRailW || 1.5);
                const trDrawW = trW * scale;
                const trDrawH = trH * scale;
                
                const topRunnerLeft = cx - trDrawW / 2;
                const postLeft = topRunnerLeft;
                const postRight = topRunnerLeft + trDrawW;
                const pDrawW = trDrawW; // Post aligns exactly under the top runner
                const pDrawH = 18; // shorter to keep it compact and balanced
                const fbY = cy_top + trDrawH;
                
                const meshGap = 0.5 * scale; // 1/2" gap to the right of the post left corner
                const fbX = postLeft + meshGap; // flat bar starts 1/2" from the left corner
                const fbT = 0.125 * scale; // 1/8" flat bar thickness
                const meshX = fbX + fbT; // wire mesh is attached to the right of the flat bar
                const fbDrawH = 1.0 * scale; // flat bar is a small line of 1" height attached to top runner bottom
                
                const postType = vals.postType || 'hss_rect';
                const midPostCount = (vals.midPosts === 'default' || vals.midPosts === 'yes') ? Math.max(0, Math.ceil(vals.length / 48) - 1) : ((vals.midPosts === 'custom' || vals.midPosts === 'custom_standard') ? (parseInt(vals.midPostCount) || 0) : 0);
                const hasPost = (postType !== 'none' && postType !== 'no') && (vals.leftPost === 'yes' || (vals.midPosts !== 'none' && midPostCount > 0));

                doc.setLineWidth(0.25);
                // Draw Top Runner
                doc.rect(topRunnerLeft, cy_top, trDrawW, trDrawH, 'S');
                
                // Draw top horizontal line extending past left/right
                doc.line(postLeft - 1.5, fbY, postRight + 1.5, fbY);
                
                if (hasPost) {
                    // Draw Post
                    doc.rect(postLeft, cy_top + trDrawH, pDrawW, pDrawH, 'S');
                }
                
                // Draw Wire Mesh WWM 2x2x0.135
                // vertical wire line running all the way down to bottom cut line
                doc.setLineWidth(0.35); // wire thickness
                doc.line(meshX, fbY, meshX, fbY + pDrawH);
                
                // Horizontal wires (dots) spaced vertically
                doc.setFillColor(0, 0, 0);
                const numDots = 4;
                const dotSpacing = pDrawH / (numDots + 1);
                for (let i = 1; i <= numDots; i++) {
                    const dotY = fbY + i * dotSpacing;
                    doc.circle(meshX, dotY, 0.35, 'FD');
                }
                
                // Draw Flat Bar FB 1x1/8 immediately to the left of the wire mesh
                // Drawn as a small vertical line of fbDrawH height attached to top runner bottom
                doc.setLineWidth(0.25);
                doc.line(fbX, fbY, fbX, fbY + fbDrawH);

                // Draw horizontal cut line at the bottom of post/flat bar
                doc.setLineWidth(0.2);
                const cutLineEndX = postRight + 1.5;
                doc.line(postLeft - 1.5, fbY + pDrawH, cutLineEndX, fbY + pDrawH);
                
                if (hasPost) {
                    // Draw bottom 1/2" dimension (inside centered label, aesthetic ticks)
                    const baselineY = fbY + pDrawH + 5; // 5 units below bottom cut line
                    doc.setLineWidth(0.12);
                    
                    // Vertical extension lines (aligned with post Left and wire mesh: meshX)
                    doc.line(postLeft, fbY + pDrawH, postLeft, baselineY + 1.5);
                    doc.line(meshX, fbY + pDrawH, meshX, baselineY + 1.5);
                    
                    // Horizontal dimension line (inside the gap)
                    doc.line(postLeft, baselineY, meshX, baselineY);
                    
                    // Slash ticks crossing the extension lines on the dimension line
                    doc.line(postLeft - 0.8, baselineY + 0.8, postLeft + 0.8, baselineY - 0.8);
                    doc.line(meshX - 0.8, baselineY + 0.8, meshX + 0.8, baselineY - 0.8);
                    
                    // Stacked fraction "1/2\"" placed centered inside the dimension line
                    const fractionX = (postLeft + meshX) / 2;
                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(3.8);
                    
                    // Numerator "1"
                    doc.text("1", fractionX, baselineY - 2.0, { align: "center" });
                    // Horizontal divider line
                    doc.line(fractionX - 0.9, baselineY - 1.5, fractionX + 0.9, baselineY - 1.5);
                    // Denominator "2"
                    doc.text("2", fractionX, baselineY - 0.2, { align: "center" });
                    // Double quote "\""
                    doc.text("\"", fractionX + 1.3, baselineY - 1.1);
                }
                
                // Draw Angled Leaders and labels (visually matching typical detail)
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(4.2);
                
                const rawTrText = (style === 'classical' || style === 'executive' || style === 'urban_balcony' || style === 'villa_balcony') ? `HSS 1 1/2x1 1/2x16GA` : (vals.topRailSize === 'CUSTOM' ? `HSS ${vals.topRailW}x${vals.topRailH}` : formatAiscSize(vals.topRailSize));
                const trSizeText = rawTrText.replace("HSS ", "HSS");
                
                const rawPText = (style === 'classical' || style === 'executive' || style === 'urban_balcony' || style === 'villa_balcony') ? `HSS 1 1/2x1 1/2x11GA` : (vals.postSize === 'CUSTOM' ? `HSS ${vals.postW}x${vals.postH}` : formatAiscSize(vals.postSize));
                const pSizeText = rawPText.replace("HSS ", "HSS");
                
                const meshGridW = vals.meshGridW !== undefined ? vals.meshGridW : 2.0;
                const meshGridH = vals.meshGridH !== undefined ? vals.meshGridH : 2.0;
                const meshWireD = vals.meshWireD !== undefined ? vals.meshWireD : 0.135;
                const meshText = `WWM${meshGridW}x${meshGridH}x${meshWireD}`;
                
                doc.setLineWidth(0.12);
                
                // 1. Top Runner (pointing up-right)
                const trLx1 = cx + trDrawW / 4;
                const trLy1 = cy_top + trDrawH / 2;
                const trLx2 = cx + trDrawW + 3;
                const trLy2 = cy_top - 1;
                const trLx3 = trLx2 + 4;
                doc.line(trLx1, trLy1, trLx2, trLy2);
                doc.line(trLx2, trLy2, trLx3, trLy2);
                
                const trAngle = Math.atan2(trLy2 - trLy1, trLx2 - trLx1);
                drawArrowhead(trLx1, trLy1, trAngle + Math.PI, 0.6);
                
                const hasMid = (style === 'villa_balcony' || (style === 'villa_custom' && vals.midRailType !== 'none'));
                const labelText = hasMid ? "MID RUNNER" : "TOP RUNNER";
                doc.text(trSizeText, trLx3 + 1, trLy2 - 0.5, { align: "left" });
                doc.text(labelText, trLx3 + 1, trLy2 + 1.2, { align: "left" });
                
                if (hasPost) {
                    // 2. Post (pointing middle-right)
                    const pLx1 = postRight;
                    const pLy1 = cy_top + trDrawH + pDrawH / 3;
                    const pLx2 = postRight + 6;
                    const pLy2 = cy_top + trDrawH + pDrawH / 3 + 2;
                    const pLx3 = pLx2 + 4;
                    doc.line(pLx1, pLy1, pLx2, pLy2);
                    doc.line(pLx2, pLy2, pLx3, pLy2);
                    
                    const pAngle = Math.atan2(pLy2 - pLy1, pLx2 - pLx1);
                    drawArrowhead(pLx1, pLy1, pAngle + Math.PI, 0.6);
                    
                    doc.text(pSizeText, pLx3 + 1, pLy2 - 0.5, { align: "left" });
                    doc.text("POST", pLx3 + 1, pLy2 + 1.2, { align: "left" });
                }
                
                // 3. Mesh Wire (pointing bottom-right)
                const mLx1 = meshX;
                const mLy1 = fbY + 2.5 * dotSpacing;
                const mLx2 = postRight + 4;
                const mLy2 = fbY + pDrawH + 1.5;
                const mLx3 = mLx2 + 4;
                doc.line(mLx1, mLy1, mLx2, mLy2);
                doc.line(mLx2, mLy2, mLx3, mLy2);
                
                const mAngle = Math.atan2(mLy2 - mLy1, mLx2 - mLx1);
                drawArrowhead(mLx1, mLy1, mAngle + Math.PI, 0.6);
                
                doc.text(meshText, mLx3 + 1, mLy2 - 0.5, { align: "left" });
                doc.text("WIRE MESH", mLx3 + 1, mLy2 + 1.2, { align: "left" });
                
                // 4. Flat Bar (pointing up-left)
                const fLx1 = fbX;
                const fLy1 = fbY + fbDrawH / 2;
                const fLx2 = fbX - 10;
                const fLy2 = fbY - 1;
                const fLx3 = fLx2 - 4;
                doc.line(fLx1, fLy1, fLx2, fLy2);
                doc.line(fLx2, fLy2, fLx3, fLy2);
                
                const fAngle = Math.atan2(fLy2 - fLy1, fLx2 - fLx1);
                drawArrowhead(fLx1, fLy1, fAngle + Math.PI, 0.6);
                
                doc.text("FB1x1/8", fLx3 - 1, fLy2 + 0.5, { align: "right" });
                
                // Bottom Title SECTION A (underlined)
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(6);
                const titleText = hasMid ? "DETAIL A" : "SECTION A";
                const titleX = boxX + boxW / 2;
                const titleY = boxY + boxH - 4.5;
                doc.text(titleText, titleX, titleY, { align: "center" });
                
                // Underline
                const textWidth = doc.getTextWidth(titleText);
                doc.setLineWidth(0.35); // Bolder underline
                doc.line(titleX - textWidth / 2, titleY + 0.5, titleX + textWidth / 2, titleY + 0.5);
            };

            const drawExtraFlatBarDetail = (doc, boxX, boxY, boxW, boxH, vals) => {
                doc.setDrawColor(0, 0, 0);
                doc.setLineWidth(0.3);
                doc.setFillColor(255, 255, 255);
                doc.rect(boxX, boxY, boxW, boxH, 'FD');

                doc.setFont('helvetica', 'bold');
                doc.setFontSize(5.5);
                doc.setTextColor(0, 0, 0);
                doc.text("DETAIL - CORNER POST FLAT BARS", boxX + boxW / 2, boxY + 4.5, { align: "center" });

                const cx = boxX + (boxW > 60 ? 30 : 20);
                const cy = boxY + boxH / 2 + 2;
                
                doc.setLineWidth(0.25);
                doc.rect(cx - 6, cy - 6, 12, 12, 'S');
                doc.setFillColor(0, 0, 0);
                doc.rect(cx - 7.5, cy - 6, 1.5, 12, 'FD');
                doc.rect(cx + 6, cy - 6, 1.5, 12, 'FD');
                
                doc.triangle(cx - 6, cy - 4, cx - 6, cy - 5.2, cx - 5.2, cy - 4, 'F');
                doc.triangle(cx - 6, cy + 4, cx - 6, cy + 5.2, cx - 5.2, cy + 4, 'F');
                doc.triangle(cx + 6, cy - 4, cx + 6, cy - 5.2, cx + 5.2, cy - 4, 'F');
                doc.triangle(cx + 6, cy + 4, cx + 6, cy + 5.2, cx + 5.2, cy + 4, 'F');
                
                const fontSize = boxW > 60 ? 4.2 : 3.5;
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(fontSize);
                
                const postTextX = boxW > 60 ? cx + 18 : cx + 12;
                doc.line(cx, cy, postTextX - 2, cy);
                drawArrowhead(cx, cy, Math.PI, 0.6);
                doc.text("HSS POST", postTextX, cy + 0.5, { align: "left" });
                
                const leftTextX = boxX + 2;
                doc.line(cx - 6.75, cy - 3, leftTextX + 16, cy - 14);
                drawArrowhead(cx - 6.75, cy - 3, Math.atan2(-3 - (-14), -6.75 - (leftTextX + 16)), 0.6);
                doc.text("WELDED FB (RETURN)", leftTextX, cy - 14 + 0.5, { align: "left" });
                
                const rightTextX = boxX + boxW - 2;
                doc.line(cx + 6.75, cy + 3, rightTextX - 22, cy + 14);
                drawArrowhead(cx + 6.75, cy + 3, Math.atan2(3 - 14, cx + 6.75 - (rightTextX - 22)), 0.6);
                doc.text("WELDED FB (MAIN)", rightTextX, cy + 14 + 0.5, { align: "right" });
            };

            const topDetails = [];
            if (vals.includeBasePlates === 'yes') {
                topDetails.push('base_plate');
            }

            topDetails.forEach((detail, index) => {
                const boxX = 8;
                const boxY = 8;
                const boxW = 82;
                const boxH = 50;
                
                if (detail === 'base_plate') {
                    drawBasePlateDetail(doc, boxX, boxY, boxW, boxH, vals);
                }
            });
            
            // Horizontal divider above bottom blocks
            doc.line(7, 175, 290, 175);

            function formatFeetInches(val) {
                if (typeof val !== 'number' || isNaN(val)) return '0';
                const totalSixteenths = Math.round(val * 16);
                const totalInches = Math.floor(totalSixteenths / 16);
                const sixteenths = totalSixteenths % 16;
                const feet = Math.floor(totalInches / 12);
                const inches = totalInches % 12;
                
                let fractionStr = '';
                if (sixteenths > 0) {
                    let num = sixteenths, den = 16;
                    while (num % 2 === 0) { num /= 2; den /= 2; }
                    fractionStr = ` ${num}/${den}`;
                }
                
                if (feet > 0) {
                    return `${feet}-${inches}${fractionStr}`;
                } else {
                    if (totalInches === 0 && sixteenths > 0) {
                        return `${fractionStr.trim()}`;
                    }
                    return `${inches}${fractionStr}`;
                }
            }

            function formatFraction(val) {
                if (typeof val !== 'number' || isNaN(val)) return '0"';
                const totalSixteenths = Math.round(val * 16);
                const totalInches = Math.floor(totalSixteenths / 16);
                const sixteenths = totalSixteenths % 16;
                const feet = Math.floor(totalInches / 12);
                const inches = totalInches % 12;
                
                let fractionStr = '';
                if (sixteenths > 0) {
                    let num = sixteenths, den = 16;
                    while (num % 2 === 0) { num /= 2; den /= 2; }
                    fractionStr = ` ${num}/${den}`;
                }
                
                if (feet > 0) {
                    return `${feet}'-${inches}${fractionStr}"`;
                } else {
                    if (totalInches === 0 && sixteenths > 0) {
                        return `${fractionStr.trim()}"`;
                    }
                    return `${inches}${fractionStr}"`;
                }
            }

            // --- CAD TO PDF COORDINATE MAPPING HELPERS ---

            function cadToPdf(cx, cy) {
                const x = pdfX + ((cx - cadMinX) / (cadMaxX - cadMinX)) * drawW;
                const y = pdfY + ((cadMaxY - cy) / (cadMaxY - cadMinY)) * drawH;
                return [x, y];
            }

            function drawArrowhead(x, y, angle, size = 2.28) {
                const length = size;
                const w_half = length * 0.222;
                const alpha = Math.atan2(w_half, length);
                const dist = Math.sqrt(length * length + w_half * w_half);
                const x1 = x - dist * Math.cos(angle - alpha);
                const y1 = y - dist * Math.sin(angle - alpha);
                const x2 = x - dist * Math.cos(angle + alpha);
                const y2 = y - dist * Math.sin(angle + alpha);
                doc.setFillColor(0, 0, 0);
                doc.triangle(x, y, x1, y1, x2, y2, 'F');
            }

            function drawCadDimensionDirect(dim, idx) {
                const customDimId = `custom-dim-${idx}`;
                if (hiddenAnnotations.has(customDimId)) return;
                
                const slopeRad = (vals.slope || 0) * Math.PI / 180;
                const cosS = Math.cos(slopeRad);
                const sinS = Math.sin(slopeRad);
                
                const rx1 = dim.cx1 * cosS - dim.cy1 * sinS;
                const ry1 = dim.cx1 * sinS + dim.cy1 * cosS;
                const rx2 = dim.cx2 * cosS - dim.cy2 * sinS;
                const ry2 = dim.cx2 * sinS + dim.cy2 * cosS;
                const rdx1 = dim.cdx1 * cosS - dim.cdy1 * sinS;
                const rdy1 = dim.cdx1 * sinS + dim.cdy1 * cosS;
                const rdx2 = dim.cdx2 * cosS - dim.cdy2 * sinS;
                const rdy2 = dim.cdx2 * sinS + dim.cdy2 * cosS;

                const p1 = cadToPdf(rx1, ry1);
                const p2 = cadToPdf(rx2, ry2);
                const d1 = cadToPdf(rdx1, rdy1);
                const d2 = cadToPdf(rdx2, rdy2);
                
                doc.setDrawColor(0, 0, 0);
                doc.setLineWidth(0.2);
                doc.line(p1[0], p1[1], d1[0], d1[1]);
                doc.line(p2[0], p2[1], d2[0], d2[1]);
                doc.line(d1[0], d1[1], d2[0], d2[1]);
                
                const dx = d2[0] - d1[0];
                const dy = d2[1] - d1[1];
                const len = Math.sqrt(dx*dx + dy*dy);
                if (len < 0.001) return;
                
                const arrowAngle = Math.atan2(dy, dx);
                if (len < 5.0) {
                    const extLen = 2.0;
                    doc.line(d1[0], d1[1], d1[0] - Math.cos(arrowAngle) * extLen, d1[1] - Math.sin(arrowAngle) * extLen);
                    doc.line(d2[0], d2[1], d2[0] + Math.cos(arrowAngle) * extLen, d2[1] + Math.sin(arrowAngle) * extLen);
                    drawArrowhead(d1[0], d1[1], arrowAngle, 1.2);
                    drawArrowhead(d2[0], d2[1], arrowAngle + Math.PI, 1.2);
                } else {
                    drawArrowhead(d1[0], d1[1], arrowAngle + Math.PI, 1.5);
                    drawArrowhead(d2[0], d2[1], arrowAngle, 1.5);
                }
                
                const midX = (d1[0] + d2[0]) / 2;
                const midY = (d1[1] + d2[1]) / 2;
                
                const spec = annotationProperties[customDimId] || {};
                const activeFontSize = spec.fontSize !== undefined ? spec.fontSize : customDimFontSize;
                const activeTextGap = spec.textGap !== undefined ? spec.textGap : customDimTextGap;
                
                const dx_cad = dim.cx2 - dim.cx1;
                const dy_cad = dim.cy2 - dim.cy1;
                const distInches = Math.hypot(dx_cad, dy_cad);
                const activeText = spec.text !== undefined && spec.text !== null ? spec.text : (dim.text || formatFraction(distInches));

                doc.setFont('helvetica', 'bold');
                doc.setFontSize(5.0 * (activeFontSize / 12.0));
                doc.setTextColor(0, 0, 0);
                
                let textAngle = -arrowAngle * 180 / Math.PI;
                if (textAngle > 90) textAngle -= 180;
                if (textAngle < -90) textAngle += 180;
                
                const px = -dy / len;
                const py = dx / len;
                const textShiftMm = 1.8 * (activeTextGap / 8.0);
                const tx = midX + px * textShiftMm;
                const ty = midY + py * textShiftMm;
                
                doc.text(activeText, tx, ty, { align: "center", angle: textAngle });
            }

            function drawCadDimension(cx1, cy1, cx2, cy2, offsetMm, text, textSide, dimId) {
                if (dimId && hiddenAnnotations.has(dimId)) return;

                let finalOffsetMm = offsetMm;
                if (dimId && annotationOffsets[dimId] !== undefined) {
                    finalOffsetMm += annotationOffsets[dimId] * pdfScale;
                } else {
                    if (Math.abs(cy1 - cy2) < 0.01) {
                        if (annotationOffsets["dim-width"] !== undefined) {
                            finalOffsetMm += annotationOffsets["dim-width"] * pdfScale;
                        }
                    } else if (Math.abs(cx1 - cx2) < 0.01) {
                        if (annotationOffsets["dim-height"] !== undefined) {
                            finalOffsetMm += annotationOffsets["dim-height"] * pdfScale;
                        }
                    }
                }

                const slopeRad = (vals.slope || 0) * Math.PI / 180;
                const cosS = Math.cos(slopeRad);
                const sinS = Math.sin(slopeRad);
                const rx1 = cx1 * cosS - cy1 * sinS;
                const ry1 = cx1 * sinS + cy1 * cosS;
                const rx2 = cx2 * cosS - cy2 * sinS;
                const ry2 = cx2 * sinS + cy2 * cosS;
                const p1 = cadToPdf(rx1, ry1);
                const p2 = cadToPdf(rx2, ry2);
                
                const dx = p2[0] - p1[0];
                const dy = p2[1] - p1[1];
                const len = Math.sqrt(dx*dx + dy*dy);
                if (len < 0.001) return;
                
                const px = -dy / len;
                const py = dx / len;
                
                const d1 = [p1[0] + px * finalOffsetMm, p1[1] + py * finalOffsetMm];
                const d2 = [p2[0] + px * finalOffsetMm, p2[1] + py * finalOffsetMm];
                
                // Draw extension lines
                const extAngle = Math.atan2(d1[1] - p1[1], d1[0] - p1[0]);
                const extLength = Math.sqrt((d1[0]-p1[0])**2 + (d1[1]-p1[1])**2);
                const gap = 0.76; // 0.03" gap from object
                const extOver = 1.52; // 0.06" extension beyond dimension line
                
                const startX1 = p1[0] + gap * Math.cos(extAngle);
                const startY1 = p1[1] + gap * Math.sin(extAngle);
                const extX1 = p1[0] + (extLength + extOver) * Math.cos(extAngle);
                const extY1 = p1[1] + (extLength + extOver) * Math.sin(extAngle);
                doc.setDrawColor(0, 0, 0);
                doc.setLineWidth(0.2);
                doc.line(startX1, startY1, extX1, extY1);
                
                const startX2 = p2[0] + gap * Math.cos(extAngle);
                const startY2 = p2[1] + gap * Math.sin(extAngle);
                const extX2 = p2[0] + (extLength + extOver) * Math.cos(extAngle);
                const extY2 = p2[1] + (extLength + extOver) * Math.sin(extAngle);
                doc.line(startX2, startY2, extX2, extY2);
                
                // Draw dimension line
                doc.line(d1[0], d1[1], d2[0], d2[1]);
                
                // Draw arrowheads
                const arrowAngle = Math.atan2(d2[1] - d1[1], d2[0] - d1[0]);
                if (len < 5.0) {
                    const extLen = 2.0;
                    doc.line(d1[0], d1[1], d1[0] - Math.cos(arrowAngle) * extLen, d1[1] - Math.sin(arrowAngle) * extLen);
                    doc.line(d2[0], d2[1], d2[0] + Math.cos(arrowAngle) * extLen, d2[1] + Math.sin(arrowAngle) * extLen);
                    
                    drawArrowhead(d1[0], d1[1], arrowAngle, 1.2);
                    drawArrowhead(d2[0], d2[1], arrowAngle + Math.PI, 1.2);
                } else {
                    drawArrowhead(d1[0], d1[1], arrowAngle + Math.PI, 1.5);
                    drawArrowhead(d2[0], d2[1], arrowAngle, 1.5);
                }
                
                const midX = (d1[0] + d2[0]) / 2;
                const midY = (d1[1] + d2[1]) / 2;
                
                // Look up specific properties
                const spec = (dimId && annotationProperties[dimId]) || {};
                const activeTextGap = spec.textGap !== undefined ? spec.textGap : customDimTextGap;
                const activeFontSize = spec.fontSize !== undefined ? spec.fontSize : customDimFontSize;
                const activeText = spec.text !== undefined && spec.text !== null ? spec.text : text;

                doc.setFont('helvetica', 'bold');
                doc.setFontSize(5.0 * (activeFontSize / 12.0));
                doc.setTextColor(0, 0, 0);
                
                let textAngle = -arrowAngle * 180 / Math.PI;
                if (textAngle > 90) textAngle -= 180;
                if (textAngle < -90) textAngle += 180;
                
                let sideMult = Math.sign(finalOffsetMm);
                if (textSide === "left" || textSide === "opposite") {
                    sideMult = -sideMult;
                }
                const textShiftMm = 1.8 * sideMult * (activeTextGap / 8.0);
                let tx = midX + px * textShiftMm;
                let staggerY = 0;
                let ty = midY + py * textShiftMm + staggerY;
                let textAlign = "center";

                // Check for small dimensions (< 10.0 mm on paper) to move text outside (vertical dimensions only)
                if (len < 10.0 && Math.abs(dx) < 0.1) {
                    textAngle = 0; // horizontal text
                    const dir = Math.sign(finalOffsetMm) || 1;
                    let L = 6.0;
                    let textStart = 1.2;
                    
                    if (dimId === 'dim-vert-ground') {
                        L = 12.0;
                        textStart = 6.8;
                    }
                    
                    tx = midX + textStart * dir;
                    ty = midY + 2.0; // slightly below the shoulder line
                    textAlign = (dir > 0) ? "left" : "right";
                    
                    doc.setLineWidth(0.15);
                    doc.line(midX, midY, midX + L * dir, midY);
                }
                
                doc.text(activeText, tx, ty, { align: textAlign, angle: textAngle });
            }

            function drawCadLeader(targetCx, targetCy, labelPdfX, labelPdfY, text, textAlign = "left", leaderId = "") {
                if (leaderId && hiddenAnnotations.has(leaderId)) return;
                
                const defaultLeaderOffsets = {
                    "leader-top-rail": { dx: 0, dy: 12 / 25.4 },
                    "leader-bot-rail": { dx: 0, dy: -12 / 25.4 },
                    "leader-left-post": { dx: 0, dy: 10 / 25.4 },
                    "leader-right-post": { dx: 0, dy: -12 / 25.4 },
                    "leader-mid-post": { dx: 0, dy: 10 / 25.4 },
                    "leader-mid-rail": { dx: 0, dy: -10 / 25.4 },
                    "leader-pickets": { dx: 0, dy: 10 / 25.4 },
                    "leader-kickplate": { dx: 0, dy: -10 / 25.4 },
                    "leader-post": { dx: 0, dy: 10 / 25.4 }
                };
                
                let dx = 0, dy = 0;
                const defOff = defaultLeaderOffsets[leaderId] || { dx: 0, dy: 0 };
                if (leaderId && annotationOffsets[leaderId]) {
                    dx = annotationOffsets[leaderId].dx * pdfScale;
                    dy = -annotationOffsets[leaderId].dy * pdfScale;
                } else {
                    dx = defOff.dx * pdfScale;
                    dy = -defOff.dy * pdfScale;
                }
                
                let tcx_offset = targetCx;
                let tcy_offset = targetCy;
                if (leaderId && annotationOffsets[leaderId]) {
                    tcx_offset += annotationOffsets[leaderId].tdx || 0;
                    tcy_offset += annotationOffsets[leaderId].tdy || 0;
                }
                
                const slopeRad = (vals.slope || 0) * Math.PI / 180;
                const cosS = Math.cos(slopeRad);
                const sinS = Math.sin(slopeRad);
                const rx = tcx_offset * cosS - tcy_offset * sinS;
                const ry = tcx_offset * sinS + tcy_offset * cosS;
                const target = cadToPdf(rx, ry);
                const finalLabelX = labelPdfX + dx;
                let finalLabelY = target[1] + dy;
                
                // Prevent vertical overlap on the same side margin (left or right)
                let attempts = 0;
                while (attempts < 20) {
                    let collision = false;
                    for (const lead of placedPdfLeaders) {
                        if (Math.abs(lead.x - finalLabelX) < 10 && Math.abs(lead.y - finalLabelY) < 3.8) {
                            collision = true;
                            break;
                        }
                    }
                    if (!collision) break;
                    finalLabelY += 4.5; // shift down
                    attempts++;
                }
                placedPdfLeaders.push({ x: finalLabelX, y: finalLabelY });
                
                let actualAlign = textAlign;
                if (actualAlign !== "center") {
                    actualAlign = (target[0] > finalLabelX) ? "left" : "right";
                }

                doc.setDrawColor(0, 0, 0);
                doc.setLineWidth(0.18);
                
                let ex = finalLabelX;
                let shoulderLength = 3.0;
                if (actualAlign === "left") {
                    ex = finalLabelX + shoulderLength;
                } else if (actualAlign === "right") {
                    ex = finalLabelX - shoulderLength;
                }
                
                if (leaderId === "leader-mid-post") {
                    const leftRailingEdge_pdf = cadToPdf(0, 0)[0];
                    const rightRailingEdge_pdf = cadToPdf(vals.length, 0)[0];
                    let shoulderEndX_pdf;
                    if (actualAlign === "left") {
                        shoulderEndX_pdf = Math.min(target[0] - 10.0, leftRailingEdge_pdf + 15.0);
                    } else {
                        shoulderEndX_pdf = Math.max(target[0] + 10.0, rightRailingEdge_pdf - 15.0);
                    }
                    doc.line(finalLabelX, finalLabelY, shoulderEndX_pdf, finalLabelY);
                    doc.line(shoulderEndX_pdf, finalLabelY, target[0], target[1]);
                    const finalAngle = Math.atan2(target[1] - finalLabelY, target[0] - shoulderEndX_pdf);
                    drawArrowhead(target[0], target[1], finalAngle, 2.28);
                } else {
                    if (actualAlign === "left") {
                        doc.line(finalLabelX, finalLabelY, ex, finalLabelY);
                    } else if (actualAlign === "right") {
                        doc.line(finalLabelX, finalLabelY, ex, finalLabelY);
                    }
                    doc.line(ex, finalLabelY, target[0], target[1]);
                    const finalAngle = Math.atan2(target[1] - finalLabelY, target[0] - ex);
                    drawArrowhead(target[0], target[1], finalAngle, 2.28);
                }
                
                // Get leader overrides
                const spec = (leaderId && annotationProperties[leaderId]) || {};
                const activeFontSize = spec.fontSize !== undefined ? spec.fontSize : 11;
                const activeText = spec.text !== undefined && spec.text !== null ? spec.text : text;

                doc.setFont('helvetica', 'bold');
                doc.setFontSize(4.8 * (activeFontSize / 11.0));
                doc.setTextColor(0, 0, 0);
                
                let cleanedText = activeText || "";
                if (cleanedText) {
                    cleanedText = cleanedText.split(/[\s(]/)[0];
                }
                
                let pdfTextAlign = actualAlign;
                let textShiftX = 0;
                let textShiftY = 0.6; // Center vertically on the shoulder line (finalLabelY)
                
                if (actualAlign === "left") {
                    pdfTextAlign = "right";
                    textShiftX = -0.8;
                } else if (actualAlign === "right") {
                    pdfTextAlign = "left";
                    textShiftX = 0.8;
                } else if (actualAlign === "center") {
                    textShiftY = -1.2;
                }
                
                doc.text(cleanedText, finalLabelX + textShiftX, finalLabelY + textShiftY, { align: pdfTextAlign });
            }

            // Draw Fence Dimensions and Callouts if in fence mode
            if (cat === 'fence') {
                const postW = getPicketDimension(vals.postType, vals.postSize, vals.postW);
                const topH = getProfileDimension(vals.topRailType, vals.topRailSize, vals.topRailH);
                const midH = getProfileDimension(vals.midRailType, vals.midRailSize, vals.midRailH);
                const botH = getProfileDimension(vals.botRailType, vals.botRailSize, vals.botRailH);
                const pickW = getPicketDimension(vals.picketType, vals.picketSize, vals.picketW);
                
                const noPosts = (vals.postType === 'none' || vals.postHeight === 0 || vals.postSpacing === 0);
                const effectivePostW = noPosts ? 0 : postW;
                const effectiveEmbed = noPosts ? 0 : ((vals.includeBasePlates === 'yes') ? 0 : Math.max(0, vals.postHeight - vals.fenceHeight - vals.topGap - 6.0));
                
                const rad = vals.slope * Math.PI / 180;
                const tan = Math.tan(rad);
                
                let botY, topY;
                if (noPosts) {
                    botY = 4.0;
                    topY = 4.0 + vals.fenceHeight - topH;
                } else {
                    botY = vals.postHeight - vals.topGap - vals.fenceHeight;
                    topY = vals.postHeight - vals.topGap - topH;
                }
                
                const numSpans = noPosts ? 1 : Math.max(1, Math.round(vals.length / (vals.postSpacing || 1)));
                const actualPostSpacing = noPosts ? vals.length : (vals.length / numSpans);
                
                // 1. Total Length Dimension Line - Removed per user request
                
                // 2. Fence Height Dimension Line - Removed per user request
                
                // 3. Member Callouts - Removed per user request
            }

            const calculateWeight = (type, size, length, customVal, qty) => {
                let lb_ft = 0;
                const steelFactor = 3.4;
                if (type === 'hss_rect') {
                    let w = 2.0, h = 2.0, t = 0.12;
                    if (size && size !== 'CUSTOM') {
                        const shapes = SHAPES_DB['hss_rect'] || [];
                        const s = shapes.find(item => item.id === size);
                        if (s) { w = s.w; h = s.h; t = s.t; }
                    } else {
                        w = parseFloat(customVal.w) || 2.0;
                        h = parseFloat(customVal.h) || 2.0;
                        t = parseFloat(customVal.t) || 0.12;
                    }
                    const area = 2 * t * (w + h - 2 * t);
                    lb_ft = area * steelFactor;
                } else if (type === 'hss_circ') {
                    let d = 2.375, t = 0.154;
                    if (size && size !== 'CUSTOM') {
                        const shapes = SHAPES_DB['hss_circ'] || [];
                        const s = shapes.find(item => item.id === size);
                        if (s) { d = s.d; t = s.t; }
                    } else {
                        d = parseFloat(customVal.d) || 2.375;
                        t = parseFloat(customVal.t) || 0.154;
                    }
                    const area = Math.PI * t * (d - t);
                    lb_ft = area * steelFactor;
                } else if (type === 'w_beam') {
                    let d = 8.0, bf = 4.0, tf = 0.25, tw = 0.23;
                    if (size && size !== 'CUSTOM') {
                        const shapes = SHAPES_DB['w_beam'] || [];
                        const s = shapes.find(item => item.id === size);
                        if (s) { d = s.d; bf = s.bf; tf = s.tf; tw = s.tw; }
                    } else {
                        d = parseFloat(customVal.d) || 8.0;
                        bf = parseFloat(customVal.bf) || 4.0;
                        tf = parseFloat(customVal.tf) || 0.25;
                        tw = parseFloat(customVal.tw) || 0.23;
                    }
                    const area = 2 * bf * tf + (d - 2 * tf) * tw;
                    lb_ft = area * steelFactor;
                } else if (type === 'angles') {
                    let leg1 = 3.0, leg2 = 3.0, t = 0.25;
                    if (size && size !== 'CUSTOM') {
                        const shapes = SHAPES_DB['angles'] || [];
                        const s = shapes.find(item => item.id === size);
                        if (s) { leg1 = s.leg1; leg2 = s.leg2; t = s.t; }
                    } else {
                        leg1 = parseFloat(customVal.leg1) || 3.0;
                        leg2 = parseFloat(customVal.leg2) || 3.0;
                        t = parseFloat(customVal.t) || 0.25;
                    }
                    const area = t * (leg1 + leg2 - t);
                    lb_ft = area * steelFactor;
                } else if (type === 'plate') {
                    let w = 6.0, h = 6.0, t = 0.5;
                    if (size && size !== 'CUSTOM') {
                        const shapes = SHAPES_DB['plate'] || [];
                        const s = shapes.find(item => item.id === size);
                        if (s) { t = s.t; }
                    } else {
                        t = parseFloat(customVal.t) || 0.5;
                    }
                    w = parseFloat(customVal.w) || 6.0;
                    h = parseFloat(customVal.h) || 6.0;
                    return w * h * t * 0.2836 * qty;
                }
                return lb_ft * (length / 12) * qty;
            };

            // Calculate active fence/structural values
            const bomItems = [];
            desc = cat.toUpperCase();


            if (currentMode === 'draft') {
                // Custom Drafting Space Assembly BOM
                desc = "CUSTOM ASSEMBLY";
                
                // Group draftMembers by type, size, length, and params (if size === 'CUSTOM')
                const groups = [];
                draftMembers.forEach(m => {
                    const lenSixteenths = Math.round(m.length * 16);
                    const normalizedLen = lenSixteenths / 16;
                    
                    let key = `${m.type}_${m.size}_${normalizedLen}`;
                    if (m.size === 'CUSTOM') {
                        if (m.type === 'hss_rect') key += `_${m.params.w}_${m.params.h}_${m.params.t}`;
                        else if (m.type === 'hss_circ') key += `_${m.params.d}_${m.params.t}`;
                        else if (m.type === 'w_beam') key += `_${m.params.d}_${m.params.bf}_${m.params.tf}_${m.params.tw}`;
                        else if (m.type === 'angles') key += `_${m.params.leg1}_${m.params.leg2}_${m.params.t}`;
                        else if (m.type === 'plate') key += `_${m.params.w}_${m.params.h}_${m.params.t}`;
                    }
                    
                    const existing = groups.find(g => g.key === key);
                    if (existing) {
                        existing.qty += 1;
                        existing.members.push(m);
                    } else {
                        groups.push({
                            key: key,
                            type: m.type,
                            size: m.size,
                            length: normalizedLen,
                            params: m.params,
                            label: m.label || "",
                            qty: 1,
                            members: [m]
                        });
                    }
                });
                
                // Sort groups by length descending, so longest becomes the Main Mark
                groups.sort((a, b) => b.length - a.length);
                
                let pieceIndex = 11;
                // Build BOM Items from groups
                groups.forEach((g, idx) => {
                    let markCode;
                    if (idx === 0) {
                        markCode = mainMarkUpper;
                    } else {
                        const shapeType = g.type.includes('hss') ? 'hss' : (g.type.includes('w_beam') ? 'w' : (g.type.includes('angles') ? 'angle' : 'plate'));
                        markCode = `${shapeType}${cleanDrawingNo}${pieceIndex++}`.toUpperCase();
                    }
                    
                    let itemDesc = "";
                    if (g.size === 'CUSTOM') {
                        if (g.type === 'hss_rect') itemDesc = `HSS ${g.params.w}x${g.params.h}x${g.params.t}`;
                        else if (g.type === 'hss_circ') itemDesc = `HSS PIPE ${g.params.d}x${g.params.t}`;
                        else if (g.type === 'w_beam') itemDesc = `W-BEAM ${g.params.d}x${g.params.bf}`;
                        else if (g.type === 'angles') itemDesc = `L-ANGLE ${g.params.leg1}x${g.params.leg2}x${g.params.t}`;
                        else if (g.type === 'plate') itemDesc = `${g.params.w}x${g.params.h} Plate`;
                    } else {
                        itemDesc = g.size;
                    }
                    
                    if (g.label) {
                        itemDesc += ` (${g.label})`;
                    }
                    
                    const wValSingle = calculateWeight(g.type, g.size, g.length, g.params, 1);
                    const totalWeight = wValSingle * g.qty * assemblyQty;
                    
                    bomItems.push({
                        mark: markCode,
                        qty: g.qty * assemblyQty,
                        desc: itemDesc,
                        len: g.type === 'plate' ? (g.size === 'CUSTOM' ? `PL ${g.params.t}"` : g.size) : formatFraction(g.length),
                        weight: Math.round(totalWeight * 10) / 10,
                        shape: g.type.toUpperCase(),
                        size: itemDesc,
                        len_dec: g.length
                    });
                });
            } else if (cat === 'fence') {
                const postW = getPicketDimension(vals.postType, vals.postSize, vals.postW);
                const topH = getProfileDimension(vals.topRailType, vals.topRailSize, vals.topRailH);
                const midH = getProfileDimension(vals.midRailType, vals.midRailSize, vals.midRailH);
                const botH = getProfileDimension(vals.botRailType, vals.botRailSize, vals.botRailH);
                const pickW = getPicketDimension(vals.picketType, vals.picketSize, vals.picketW);
                const bpW = vals.basePlateW || 6.0;
                const bpL = vals.basePlateL || 6.0;
                const bpH = getProfileDimension('plate', vals.basePlateSize, vals.basePlateT);
                const midRailGap = vals.midRailGap !== undefined ? vals.midRailGap : 12.0;

                const noPosts = (vals.postType === 'none' || vals.postHeight === 0 || vals.postSpacing === 0);
                const numSpans = noPosts ? 1 : Math.max(1, Math.round(vals.length / (vals.postSpacing || 1)));
                const numPosts = noPosts ? 0 : numSpans + 1;
                const actualPostSpacing = noPosts ? vals.length : (vals.length / numSpans);
                const effectivePostW = noPosts ? 0 : postW;
                const clearWidth = actualPostSpacing - effectivePostW;
                
                const rad = vals.slope * Math.PI / 180;
                const cos = Math.cos(rad);
                const slopedWidth = cos > 0.001 ? (clearWidth / cos) : clearWidth;
                const preciseSlopedWidth = Math.round(slopedWidth * 16) / 16;
                
                let botY, topY, midY;
                if (noPosts) {
                    botY = 4.0;
                    topY = 4.0 + vals.fenceHeight - topH;
                } else {
                    botY = vals.postHeight - vals.topGap - vals.fenceHeight;
                    topY = vals.postHeight - vals.topGap - topH;
                }
                if (vals.midRailType !== 'none') {
                    midY = topY - midRailGap - midH;
                } else {
                    midY = (botY + topY) / 2;
                }

                const picketY = (vals.botRailType === 'none') ? (botY + 4) : (botY + botH);
                const picketTopY = (vals.midRailType !== 'none') ? midY : ((vals.topRailType === 'none') ? (noPosts ? 4.0 + vals.fenceHeight : vals.postHeight - vals.topGap) : topY);
                const picketH = Math.max(2, picketTopY - picketY);
                
                const numPicketsInSpan = vals.picketSpacing > 0 ? Math.floor((clearWidth - pickW) / vals.picketSpacing) : 0;
                const totalPickets = numPicketsInSpan * numSpans;
                
                // Unified piece mark assignment
                const cleanDrawingNo = drawingNo.toUpperCase().replace(/[^A-Z0-9]/g, '');
                const mainMarkCode = cleanDrawingNo + 'M1';
                
                let charCode = 97; // 'a'
                let mainMarkAssigned = false;
                const getMark = (isPresent) => {
                    if (!isPresent) return null;
                    if (!mainMarkAssigned) {
                        mainMarkAssigned = true;
                        return mainMarkCode;
                    }
                    const m = String.fromCharCode(charCode) + cleanDrawingNo;
                    charCode++;
                    return m;
                };

                const topMark = getMark(vals.topRailType !== 'none');
                const postMark = getMark(!noPosts && vals.postType !== 'none');
                const botMark = getMark(vals.botRailType !== 'none');
                const midMark = getMark(vals.midRailType !== 'none');
                const picketMark = getMark(vals.picketType !== 'none' && totalPickets > 0);
                const bpMark = getMark(vals.includeBasePlates === 'yes' && !noPosts);

                // Add Top Rail
                if (topMark) {
                    const topRailName = vals.topRailSize === 'CUSTOM' ? `HSS ${vals.topRailH}x${vals.topRailH}` : vals.topRailSize;
                    const wVal = calculateWeight(vals.topRailType, vals.topRailSize, preciseSlopedWidth, { w: vals.topRailH, h: vals.topRailH, t: 0.12 }, numSpans * assemblyQty);
                    
                    bomItems.push({
                        mark: topMark, 
                        qty: numSpans * assemblyQty,
                        desc: topRailName,
                        remark: "TOP RAIL",
                        len: formatFraction(preciseSlopedWidth),
                        weight: Math.round(wVal * 10) / 10,
                        shape: vals.topRailType.toUpperCase(),
                        size: topRailName,
                        len_dec: preciseSlopedWidth
                    });
                }
                
                // Add Posts
                if (postMark) {
                    const postName = vals.postSize === 'CUSTOM' ? `HSS ${vals.postW}x${vals.postW}` : vals.postSize;
                    const wVal = calculateWeight(vals.postType, vals.postSize, vals.postHeight, { w: vals.postW, h: vals.postW, t: 0.15 }, numPosts * assemblyQty);
                    
                    bomItems.push({
                        mark: postMark, 
                        qty: numPosts * assemblyQty,
                        desc: postName,
                        remark: "POST",
                        len: formatFraction(vals.postHeight),
                        weight: Math.round(wVal * 10) / 10,
                        shape: vals.postType.toUpperCase(),
                        size: postName,
                        len_dec: vals.postHeight
                    });
                }
                
                // Add Bottom Rail
                if (botMark) {
                    const botRailName = vals.botRailSize === 'CUSTOM' ? `HSS ${vals.botRailH}x${vals.botRailH}` : vals.botRailSize;
                    const wVal = calculateWeight(vals.botRailType, vals.botRailSize, preciseSlopedWidth, { w: vals.botRailH, h: vals.botRailH, t: 0.12 }, numSpans * assemblyQty);
                    
                    bomItems.push({
                        mark: botMark,
                        qty: numSpans * assemblyQty,
                        desc: botRailName,
                        remark: "BOTTOM RAIL",
                        len: formatFraction(preciseSlopedWidth),
                        weight: Math.round(wVal * 10) / 10,
                        shape: vals.botRailType.toUpperCase(),
                        size: botRailName,
                        len_dec: preciseSlopedWidth
                    });
                }
                
                // Add Mid Rail
                if (midMark) {
                    const midRailName = vals.midRailSize === 'CUSTOM' ? `HSS ${vals.midRailH}x${vals.midRailH}` : vals.midRailSize;
                    const wVal = calculateWeight(vals.midRailType, vals.midRailSize, preciseSlopedWidth, { w: vals.midRailH, h: vals.midRailH, t: 0.12 }, numSpans * assemblyQty);
                    
                    bomItems.push({
                        mark: midMark,
                        qty: numSpans * assemblyQty,
                        desc: midRailName,
                        remark: "MID RAIL",
                        len: formatFraction(preciseSlopedWidth),
                        weight: Math.round(wVal * 10) / 10,
                        shape: vals.midRailType.toUpperCase(),
                        size: midRailName,
                        len_dec: preciseSlopedWidth
                    });
                }
                
                // Add Pickets
                if (picketMark) {
                    const picketName = vals.picketSize === 'CUSTOM' ? `HSS ${vals.picketW}x${vals.picketW}` : vals.picketSize;
                    const wVal = calculateWeight(vals.picketType, vals.picketSize, picketH, { w: vals.picketW, h: vals.picketW, t: 0.08 }, totalPickets * assemblyQty);
                    
                    bomItems.push({
                        mark: picketMark,
                        qty: totalPickets * assemblyQty,
                        desc: picketName,
                        remark: "PICKET",
                        len: formatFraction(picketH),
                        weight: Math.round(wVal * 10) / 10,
                        shape: vals.picketType.toUpperCase(),
                        size: picketName,
                        len_dec: picketH
                    });
                }
                
                // Add Base Plates
                if (bpMark) {
                    const bpName = vals.basePlateSize === 'CUSTOM' ? `PL ${vals.basePlateT}"` : vals.basePlateSize;
                    const wVal = calculateWeight('plate', vals.basePlateSize, bpL, { w: bpW, h: bpL, t: vals.basePlateT }, numPosts * assemblyQty);
                    
                    bomItems.push({
                        mark: bpMark,
                        qty: numPosts * assemblyQty,
                        desc: `${bpW}x${bpL} Plate`,
                        remark: "BASE PLATE",
                        len: bpName,
                        weight: Math.round(wVal * 10) / 10,
                        shape: 'PLATE',
                        size: `${bpW}x${bpL}x${vals.basePlateT !== undefined ? vals.basePlateT : 0.5}`,
                        len_dec: bpL
                    });
                }
            } else if (cat === 'rail_catalog') {
                if (isLoosePost) {
                    const style = vals.railStyle || 'classical';
                    const props = getResolvedPanelProperties(vals, style);
                    let pHeight = props ? props.pHeight : 45.75;
                    let topH = props ? props.topRailH : 1.5;
                    let postType = props ? props.postType : 'hss_rect';
                    let postSize = (style === 'classical' || style === 'executive' || style === 'urban_balcony' || style === 'villa_balcony') ? 'CUSTOM' : vals.postSize;
                    let postW = props ? props.postW : 1.5;
                    let postH = props ? props.postH : 1.5;
                    let postT = props ? props.postT : 0.1196;
                    
                    const postWeight = calculateWeight(postType, postSize, pHeight, { w: postW, h: postH, t: postT }, 1 * assemblyQty);
                    const postDwgName = (style === 'classical' || style === 'executive' || style === 'urban_balcony' || style === 'villa_balcony') ? `HSS 1.5x1.5x11GA` : (vals.postSize === 'CUSTOM' ? `HSS ${postW}x${postH}x${postT}` : vals.postSize);
                    
                    bomItems.push({
                        mark: `a${drawingNo.toUpperCase()}`,
                        qty: 1 * assemblyQty,
                        desc: postDwgName,
                        remark: "LOOSE POST",
                        len: formatFraction(pHeight),
                        weight: Math.round(postWeight * 10) / 10,
                        shape: postType.toUpperCase(),
                        size: postDwgName,
                        len_dec: pHeight,
                        grade: 'A500'
                    });
                    
                    const includeBasePlates = props ? props.includeBasePlates : 'no';
                    if (includeBasePlates === 'yes') {
                        let bpW = props ? props.basePlateW : 6.0;
                        let bpL = props ? props.basePlateL : 6.0;
                        let bpH = props ? props.basePlateT : 0.5;
                        const bpWeight = calculateWeight('plate', vals.basePlateSize, bpL, { w: bpW, h: bpL, t: bpH }, 1 * assemblyQty);
                        const bpName = vals.basePlateSize === 'CUSTOM' ? `PL ${bpH}"` : vals.basePlateSize;
                        
                        bomItems.push({
                            mark: `b${drawingNo.toUpperCase()}`,
                            qty: 1 * assemblyQty,
                            desc: `${bpW}x${bpL} Plate`,
                            remark: "BASE PLATE",
                            len: bpName,
                            weight: Math.round(bpWeight * 10) / 10,
                            shape: 'PLATE',
                            size: `${bpW}x${bpL}x${bpH}`,
                            len_dec: bpL,
                            grade: 'A36'
                        });
                    }

                    const isMeshStyle = (style === 'urban_balcony' || style === 'villa_balcony' || style === 'urban_custom' || style === 'villa_custom');
                    if (isMeshStyle) {
                        const botRailH = props ? props.botRailH : 1.5;
                        const topRailH = props ? props.topRailH : 1.5;
                        const midRailType = props ? props.midRailType : 'none';
                        const midRailH = props ? props.midRailH : 1.5;
                        const midRailGap = props ? props.midRailGap : 12.0;
                        const fenceHeight = props ? props.fHeight : 36.0;

                        const bY = pHeight - fenceHeight;
                        const yStart = bY + botRailH;
                        const hasMid = (style === 'villa_balcony' || (style === 'villa_custom' && midRailType !== 'none'));
                        const yEnd = hasMid ? (pHeight - topRailH - midRailGap - midRailH) : (pHeight - topRailH);
                        const fbHeight = yEnd - yStart;

                        if (fbHeight > 0) {
                            const fbWeight = calculateWeight('plate', 'CUSTOM', fbHeight, { w: 1.0, h: fbHeight, t: 0.125 }, 1 * assemblyQty);
                            bomItems.push({
                                mark: `c${drawingNo.toUpperCase()}`,
                                qty: 1 * assemblyQty,
                                desc: `FB 1"x1/8"`,
                                remark: "ATTACHED FB",
                                len: formatFraction(fbHeight),
                                weight: Math.round(fbWeight * 10) / 10,
                                shape: 'FLAT_BAR',
                                size: `1"x1/8"`,
                                len_dec: fbHeight,
                                grade: 'A36'
                            });
                        }
                    }
                } else {
                    const style = vals.railStyle || 'classical';
                    let fHeight = 41.0;
                    let pHeight = 45.75;
                    let postType = 'hss_rect';
                    let postW = 1.5;
                    let postH = 1.5;
                    let postT = 0.1196;
                    let topRailType = 'hss_rect';
                    let topRailW = 1.5;
                    let topRailH = 1.5;
                    let topRailT = 0.0598;
                    let botRailType = 'hss_rect';
                    let botRailW = 1.5;
                    let botRailH = 1.5;
                    let botRailT = 0.0598;
                    let midRailType = 'none';
                    let midRailW = 0;
                    let midRailH = 0;
                    let midRailT = 0;
                    let midRailGap = 12.0;
                    let picketType = 'hss_rect';
                    let picketW = 0.5;
                    let picketH = 0.5;
                    let picketT = 0.0598;
                    let picketSpacing = 4.0;
                    let includeBasePlates = 'no';
                    let bpW = 6.0;
                    let bpL = 6.0;
                    let bpH = 0.5;
                    let bpHoleD = 0.5;
                    let bpHoleOffsetX = 0.5;
                    let bpHoleOffsetY = 0.25;

                    const getProfileThickness = (type, size, customVal) => {
                        if (type === 'none' || size === 'NONE') return 0;
                        if (size === 'CUSTOM') return customVal;
                        const shapes = SHAPES_DB[type] || [];
                        const selected = shapes.find(s => s.id === size);
                        if (selected) {
                            return selected.t || 0.12;
                        }
                        return customVal;
                    };

                    if (style === 'classical') {
                        fHeight = 41.0;
                        pHeight = 45.75;
                        postType = 'hss_rect';
                        postW = 1.5;
                        postH = 1.5;
                        postT = 0.1196;
                        topRailType = 'hss_rect';
                        topRailW = 1.5;
                        topRailH = 1.5;
                        topRailT = 0.0598;
                        botRailType = 'hss_rect';
                        botRailW = 1.5;
                        botRailH = 1.5;
                        botRailT = 0.0598;
                        midRailType = 'none';
                        picketType = 'hss_rect';
                        picketW = 0.5;
                        picketH = 0.5;
                        picketT = 0.0598;
                        picketSpacing = 4.0;
                        includeBasePlates = 'no';
                    } else if (style === 'executive') {
                        fHeight = 41.0;
                        pHeight = 45.75;
                        postType = 'hss_rect';
                        postW = 1.5;
                        postH = 1.5;
                        postT = 0.1196;
                        topRailType = 'hss_rect';
                        topRailW = 1.5;
                        topRailH = 1.5;
                        topRailT = 0.0598;
                        botRailType = 'hss_rect';
                        botRailW = 1.5;
                        botRailH = 1.5;
                        botRailT = 0.0598;
                        midRailType = 'hss_rect';
                        midRailW = 1.5;
                        midRailH = 1.5;
                        midRailT = 0.0598;
                        midRailGap = 3.0;
                        picketType = 'hss_rect';
                        picketW = 0.5;
                        picketH = 0.5;
                        picketT = 0.0598;
                        picketSpacing = 4.0;
                        includeBasePlates = 'no';
                    } else if (style === 'urban_balcony') {
                        fHeight = 41.0;
                        pHeight = 45.75;
                        postType = 'hss_rect';
                        postW = 1.5;
                        postH = 1.5;
                        postT = 0.1196;
                        topRailType = 'hss_rect';
                        topRailW = 1.5;
                        topRailH = 1.5;
                        topRailT = 0.0598;
                        botRailType = 'hss_rect';
                        botRailW = 1.5;
                        botRailH = 1.5;
                        botRailT = 0.0598;
                        midRailType = 'none';
                        picketType = 'none';
                        picketW = 0; picketH = 0; picketT = 0; picketSpacing = 0;
                        includeBasePlates = 'no';
                    } else if (style === 'villa_balcony') {
                        fHeight = 41.0;
                        pHeight = 45.75;
                        postType = 'hss_rect';
                        postW = 1.5;
                        postH = 1.5;
                        postT = 0.1196;
                        topRailType = 'hss_rect';
                        topRailW = 1.5;
                        topRailH = 1.5;
                        topRailT = 0.0598;
                        botRailType = 'hss_rect';
                        botRailW = 1.5;
                        botRailH = 1.5;
                        botRailT = 0.0598;
                        midRailType = 'hss_rect';
                        midRailW = 1.5;
                        midRailH = 1.5;
                        midRailT = 0.0598;
                        midRailGap = 3.0;
                        picketType = 'none';
                        picketW = 0; picketH = 0; picketT = 0; picketSpacing = 0;
                        includeBasePlates = 'no';
                    } else if (style === 'urban_custom' || style === 'villa_custom') {
                        fHeight = vals.fenceHeight || 36;
                        pHeight = vals.postHeight || 36;
                        postType = vals.postType || 'hss_rect';
                        postW = getPicketDimension(vals.postType, vals.postSize, vals.postW || 1.5);
                        postH = getProfileDimension(vals.postType, vals.postSize, vals.postW || 1.5);
                        postT = getProfileThickness(vals.postType, vals.postSize, vals.postW || 0.12);
                        
                        topRailType = vals.topRailType || 'hss_rect';
                        topRailW = getPicketDimension(vals.topRailType, vals.topRailSize, vals.topRailH || 1.5);
                        topRailH = getProfileDimension(vals.topRailType, vals.topRailSize, vals.topRailH || 1.5);
                        topRailT = getProfileThickness(vals.topRailType, vals.topRailSize, vals.topRailH || 0.12);
                        
                        botRailType = vals.botRailType || 'hss_rect';
                        botRailW = getPicketDimension(vals.botRailType, vals.botRailSize, vals.botRailH || 1.5);
                        botRailH = getProfileDimension(vals.botRailType, vals.botRailSize, vals.botRailH || 1.5);
                        botRailT = getProfileThickness(vals.botRailType, vals.botRailSize, vals.botRailH || 0.12);
                        
                        midRailType = (style === 'villa_custom') ? (vals.midRailType || 'hss_rect') : 'none';
                        midRailW = getPicketDimension(midRailType, vals.midRailSize, vals.midRailH || 1.5);
                        midRailH = getProfileDimension(midRailType, vals.midRailSize, vals.midRailH || 1.5);
                        midRailT = getProfileThickness(midRailType, vals.midRailSize, vals.midRailH || 0.12);
                        midRailGap = vals.midRailGap !== undefined ? vals.midRailGap : 12.0;

                        picketType = 'none';
                        picketW = 0; picketH = 0; picketT = 0; picketSpacing = 0;
                        includeBasePlates = vals.includeBasePlates || 'no';
                        bpW = vals.basePlateW || 6.0;
                        bpL = vals.basePlateL || 6.0;
                        bpH = getProfileDimension('plate', vals.basePlateSize, vals.basePlateT || 0.5);
                        bpHoleD = vals.basePlateHoleD || 0.5;
                        bpHoleOffsetX = vals.basePlateHoleOffsetX || 0.5;
                        bpHoleOffsetY = vals.basePlateHoleOffsetY || 0.25;
                    } else {
                        fHeight = vals.fenceHeight || 36;
                        pHeight = vals.postHeight || 36;
                        postType = vals.postType || 'hss_rect';
                        postW = getPicketDimension(vals.postType, vals.postSize, vals.postW || 1.5);
                        postH = getProfileDimension(vals.postType, vals.postSize, vals.postW || 1.5);
                        postT = getProfileThickness(vals.postType, vals.postSize, vals.postW || 0.12);
                        
                        topRailType = vals.topRailType || 'hss_rect';
                        topRailW = getPicketDimension(vals.topRailType, vals.topRailSize, vals.topRailH || 1.5);
                        topRailH = getProfileDimension(vals.topRailType, vals.topRailSize, vals.topRailH || 1.5);
                        topRailT = getProfileThickness(vals.topRailType, vals.topRailSize, vals.topRailH || 0.12);
                        
                        botRailType = vals.botRailType || 'hss_rect';
                        botRailW = getPicketDimension(vals.botRailType, vals.botRailSize, vals.botRailH || 1.5);
                        botRailH = getProfileDimension(vals.botRailType, vals.botRailSize, vals.botRailH || 1.5);
                        botRailT = getProfileThickness(vals.botRailType, vals.botRailSize, vals.botRailH || 0.12);
                        
                        midRailType = vals.midRailType || 'none';
                        midRailW = getPicketDimension(vals.midRailType, vals.midRailSize, vals.midRailH || 1.5);
                        midRailH = getProfileDimension(vals.midRailType, vals.midRailSize, vals.midRailH || 1.5);
                        midRailT = getProfileThickness(vals.midRailType, vals.midRailSize, vals.midRailH || 0.12);
                        midRailGap = vals.midRailGap !== undefined ? vals.midRailGap : 12.0;

                        picketType = vals.picketType || 'hss_rect';
                        picketW = getPicketDimension(vals.picketType, vals.picketSize, vals.picketW || 0.5);
                        picketH = getProfileDimension(vals.picketType, vals.picketSize, vals.picketW || 0.5);
                        picketT = getProfileThickness(vals.picketType, vals.picketSize, vals.picketW || 0.083);
                        picketSpacing = vals.picketSpacing || 4.0;
                        includeBasePlates = vals.includeBasePlates || 'no';
                        bpW = vals.basePlateW || 6.0;
                        bpL = vals.basePlateL || 6.0;
                        bpH = getProfileDimension('plate', vals.basePlateSize, vals.basePlateT || 0.5);
                    }

                    const startXBound = (vals.leftPost === 'yes') ? postW : 0;
                    const endXBound = (vals.rightPost === 'yes') ? (vals.length - postW) : vals.length;
                    midPostCount = (vals.midPosts === 'default' || vals.midPosts === 'yes') ? Math.max(0, Math.ceil(vals.length / 48) - 1) : (vals.midPosts === 'custom' ? (parseInt(vals.midPostCount) || 0) : 0);
                    const clearWidth = endXBound - startXBound - midPostCount * postW;
                    const spanW = clearWidth / (midPostCount + 1);

                    const railSpans = resolveRailMarksAndSpans(vals, drawingNo, cat, style, postW);

                    // Add Top Rail
                    if (topMark) {
                        const name = (style === 'classical') ? `HSS 1.5x1.5x16GA` : (style === 'executive' ? `HSS 1.5x1x16GA` : (vals.topRailSize === 'CUSTOM' ? `HSS ${topRailW}x${topRailH}x${topRailT}` : vals.topRailSize));
                        const wVal = calculateWeight(topRailType, (style === 'classical' || style === 'executive' ? 'CUSTOM' : vals.topRailSize), vals.length, { w: topRailW, h: topRailH, t: topRailT }, 1 * assemblyQty);
                        bomItems.push({
                            mark: topMark,
                            qty: 1 * assemblyQty,
                            desc: name,
                            remark: "TOP RUNNER",
                            len: formatFraction(vals.length),
                            weight: Math.round(wVal * 10) / 10,
                            shape: topRailType.toUpperCase(),
                            size: name,
                            len_dec: vals.length
                        });
                    }

                    // Add Bottom Rail
                    if (botMark) {
                        const name = (style === 'classical' || style === 'executive') ? `HSS 1.5x1.5x16GA` : (vals.botRailSize === 'CUSTOM' ? `HSS ${botRailW}x${botRailH}x${botRailT}` : vals.botRailSize);
                        const bottomGroups = {};
                        railSpans.bottomSegments.forEach(seg => {
                            if (!bottomGroups[seg.mark]) {
                                bottomGroups[seg.mark] = { len: seg.len, qty: 0 };
                            }
                            bottomGroups[seg.mark].qty++;
                        });
                        Object.keys(bottomGroups).forEach(mark => {
                            const group = bottomGroups[mark];
                            const wVal = calculateWeight(botRailType, (style === 'classical' || style === 'executive' ? 'CUSTOM' : vals.botRailSize), group.len, { w: botRailW, h: botRailH, t: botRailT }, group.qty * assemblyQty);
                            bomItems.push({
                                mark: mark,
                                qty: group.qty * assemblyQty,
                                desc: name,
                                remark: "BOTTOM RUNNER",
                                len: formatFraction(group.len),
                                weight: Math.round(wVal * 10) / 10,
                                shape: botRailType.toUpperCase(),
                                size: name,
                                len_dec: group.len
                            });
                        });
                    }

                    // Add Mid Rail
                    if (midMark && midRailType !== 'none') {
                        const name = (style === 'executive' || style === 'villa_balcony') ? `HSS 1.5x1.5x16GA` : (vals.midRailSize === 'CUSTOM' ? `HSS ${midRailW}x${midRailH}x${midRailT}` : vals.midRailSize);
                        const midGroups = {};
                        railSpans.midSegments.forEach(seg => {
                            if (!midGroups[seg.mark]) {
                                midGroups[seg.mark] = { len: seg.len, qty: 0 };
                            }
                            midGroups[seg.mark].qty++;
                        });
                        Object.keys(midGroups).forEach(mark => {
                            const group = midGroups[mark];
                            const wVal = calculateWeight(midRailType, (style === 'executive' ? 'CUSTOM' : vals.midRailSize), group.len, { w: midRailW, h: midRailH, t: midRailT }, group.qty * assemblyQty);
                            bomItems.push({
                                mark: mark,
                                qty: group.qty * assemblyQty,
                                desc: name,
                                remark: "MID RUNNER",
                                len: formatFraction(group.len),
                                weight: Math.round(wVal * 10) / 10,
                                shape: midRailType.toUpperCase(),
                                size: name,
                                len_dec: group.len
                            });
                        });
                    }

                    // Add Left Post
                    if (leftMark) {
                        const name = (style === 'classical' || style === 'executive' || style === 'urban_balcony' || style === 'villa_balcony') ? `HSS 1.5x1.5x11GA` : (vals.postSize === 'CUSTOM' ? `HSS ${postW}x${postH}x${postT}` : vals.postSize);
                        const wVal = calculateWeight(postType, (style === 'classical' || style === 'executive' || style === 'urban_balcony' || style === 'villa_balcony' ? 'CUSTOM' : vals.postSize), pHeight, { w: postW, h: postH, t: postT }, 1 * assemblyQty);
                        bomItems.push({
                            mark: leftMark,
                            qty: 1 * assemblyQty,
                            desc: name,
                            remark: "LEFT POST",
                            len: formatFraction(pHeight),
                            weight: Math.round(wVal * 10) / 10,
                            shape: postType.toUpperCase(),
                            size: name,
                            len_dec: pHeight
                        });
                    }

                    // Add Right Post
                    if (rightMark) {
                        const name = (style === 'classical' || style === 'executive' || style === 'urban_balcony' || style === 'villa_balcony') ? `HSS 1.5x1.5x11GA` : (vals.postSize === 'CUSTOM' ? `HSS ${postW}x${postH}x${postT}` : vals.postSize);
                        const wVal = calculateWeight(postType, (style === 'classical' || style === 'executive' || style === 'urban_balcony' || style === 'villa_balcony' ? 'CUSTOM' : vals.postSize), pHeight, { w: postW, h: postH, t: postT }, 1 * assemblyQty);
                        bomItems.push({
                            mark: rightMark,
                            qty: 1 * assemblyQty,
                            desc: name,
                            remark: "RIGHT POST",
                            len: formatFraction(pHeight),
                            weight: Math.round(wVal * 10) / 10,
                            shape: postType.toUpperCase(),
                            size: name,
                            len_dec: pHeight
                        });
                    }

                    // Add Mid Posts
                    if (midPostMark && midPostCount > 0) {
                        const name = (style === 'classical' || style === 'executive' || style === 'urban_balcony' || style === 'villa_balcony') ? `HSS 1.5x1.5x11GA` : (vals.postSize === 'CUSTOM' ? `HSS ${postW}x${postH}x${postT}` : vals.postSize);
                        const isExecutiveStyle = (style === 'executive' || style === 'executive_custom');
                        const mpH = style === 'executive' ? 44.25 : (pHeight - topRailH);
                        const wVal = calculateWeight(postType, (style === 'classical' || style === 'executive' || style === 'urban_balcony' || style === 'villa_balcony' ? 'CUSTOM' : vals.postSize), mpH, { w: postW, h: postH, t: postT }, midPostCount * assemblyQty);
                        bomItems.push({
                            mark: midPostMark,
                            qty: midPostCount * assemblyQty,
                            desc: name,
                            remark: "MID POST",
                            len: formatFraction(mpH),
                            weight: Math.round(wVal * 10) / 10,
                            shape: postType.toUpperCase(),
                            size: name,
                            len_dec: mpH
                        });
                    }

                    // Add Pickets
                    if (picketMark && finalPicketsCount > 0) {
                        const name = (style === 'classical' || style === 'executive') ? `HSS 1/2x1/2x16GA` : (vals.picketSize === 'CUSTOM' ? `HSS ${picketW}x${picketH}x${picketT}` : vals.picketSize);
                        const picketBottomY = (pHeight - fHeight) + botH;
                        const picketTopY = (midRailType !== 'none') ? (pHeight - topH - midRailGap - midH) : (pHeight - topH);
                        const picketLen = picketTopY - picketBottomY;
                        const wVal = calculateWeight(picketType, (style === 'classical' || style === 'executive' ? 'CUSTOM' : vals.picketSize), picketLen, { w: picketW, h: picketH, t: picketT }, finalPicketsCount * assemblyQty);
                        
                        bomItems.push({
                            mark: picketMark,
                            qty: finalPicketsCount * assemblyQty,
                            desc: name,
                            remark: "PICKET",
                            len: formatFraction(picketLen),
                            weight: Math.round(wVal * 10) / 10,
                            shape: picketType.toUpperCase(),
                            size: name,
                            len_dec: picketLen
                        });
                    }

                    // Add Mesh Frame & Panel
                    const isMeshStyle = (style === 'urban_balcony' || style === 'villa_balcony' || style === 'urban_custom' || style === 'villa_custom');
                    if (isMeshStyle) {
                        const picketBottomY = (pHeight - fHeight) + botH;
                        const picketTopY = (midRailType !== 'none') ? (pHeight - topH - midRailGap - midH) : (pHeight - topH);
                        const fbHeight = picketTopY - picketBottomY;
                        
                        // Group by suffix/length for Horizontal Flat Bars and Wire Mesh Panels
                        const meshGroups = {};
                        railSpans.bottomSegments.forEach(seg => {
                            const baseMark = "a" + drawingNo;
                            const suffix = seg.mark.substring(baseMark.length);
                            const hMark = meshFbMark + suffix;
                            const pMark = meshPanelMark + suffix;
                            
                            if (!meshGroups[suffix]) {
                                meshGroups[suffix] = {
                                    len: seg.len,
                                    qty: 0,
                                    hMark: hMark,
                                    pMark: pMark
                                };
                            }
                            meshGroups[suffix].qty++;
                        });

                        // Horizontal flat bars
                        if (meshFbMark) {
                            Object.keys(meshGroups).forEach(suffix => {
                                const group = meshGroups[suffix];
                                const fbHorizQty = 2 * group.qty * assemblyQty;
                                const wValHoriz = calculateWeight('plate', 'CUSTOM', group.len, { w: 1.0, h: group.len, t: 0.125 }, fbHorizQty);
                                bomItems.push({
                                    mark: group.hMark,
                                    qty: fbHorizQty,
                                    desc: `FB 1"x1/8"`,
                                    remark: "MESH FRAME HORIZ",
                                    len: formatFraction(group.len),
                                    weight: Math.round(wValHoriz * 10) / 10,
                                    shape: 'FLAT_BAR',
                                    size: `1"x1/8"`,
                                    len_dec: group.len
                                });
                            });
                        }

                        // Vertical flat bars
                        if (meshFbMark) {
                            const leftOmitted = (vals.leftPost === 'no' || vals.leftPost === 'none') ? 1 : 0;
                            const rightOmitted = (vals.rightPost === 'no' || vals.rightPost === 'none') ? 1 : 0;
                            const fbVertQty = (2 * (midPostCount + 1) - leftOmitted - rightOmitted) * assemblyQty;
                            const wValVert = calculateWeight('plate', 'CUSTOM', fbHeight, { w: 1.0, h: fbHeight, t: 0.125 }, fbVertQty);
                            bomItems.push({
                                mark: meshFbMark,
                                qty: fbVertQty,
                                desc: `FB 1"x1/8"`,
                                remark: "MESH FRAME VERT",
                                len: formatFraction(fbHeight),
                                weight: Math.round(wValVert * 10) / 10,
                                shape: 'FLAT_BAR',
                                size: `1"x1/8"`,
                                len_dec: fbHeight
                            });
                        }

                        // Wire Mesh Panels
                        if (meshPanelMark) {
                            const meshGridW = vals.meshGridW !== undefined ? vals.meshGridW : 2.0;
                            const meshGridH = vals.meshGridH !== undefined ? vals.meshGridH : 2.0;
                            const meshWireD = vals.meshWireD !== undefined ? vals.meshWireD : 0.135;
                            const wwmSize = `${meshGridW}x${meshGridH}x${meshWireD} x ${formatFraction(fbHeight)}`;

                            Object.keys(meshGroups).forEach(suffix => {
                                const group = meshGroups[suffix];
                                const meshQty = group.qty * assemblyQty;
                                const meshAreaSqFt = (group.len * fbHeight) / 144.0;
                                const wValMesh = meshAreaSqFt * 1.5 * meshQty; // 1.5 lbs/sqft
                                const wwmDesc = `WWM ${meshGridW}x${meshGridH}x${meshWireD} x ${formatFraction(fbHeight)}`;
                                
                                bomItems.push({
                                    mark: group.pMark,
                                    qty: meshQty,
                                    desc: wwmDesc,
                                    remark: "WWM WIRE MESH",
                                    len: formatFraction(group.len),
                                    weight: Math.round(wValMesh * 10) / 10,
                                    shape: 'WWM',
                                    size: wwmSize,
                                    len_dec: group.len
                                });
                            });
                        }
                    }

                    if (vals.extraFlatBar === 'yes' && (activePanelType === 'leftReturn' || activePanelType === 'rightReturn') && vals.leftPost === 'yes') {
                        const picketBottomY = (pHeight - fHeight) + botH;
                        const picketTopY = (midRailType !== 'none') ? (pHeight - topH - midRailGap - midH) : (pHeight - topH);
                        const fbHeight = picketTopY - picketBottomY;
                        const wValExtra = calculateWeight('plate', 'CUSTOM', fbHeight, { w: 1.0, h: fbHeight, t: 0.125 }, 1 * assemblyQty);
                        bomItems.push({
                            mark: meshFbMark,
                            remark: "EXTRA CORNER FB",
                            desc: `FB 1"x1/8"`,
                            qty: 1 * assemblyQty,
                            len: formatFraction(fbHeight),
                            weight: Math.round(wValExtra * 10) / 10,
                            shape: 'FLAT_BAR',
                            size: '1"x1/8"',
                            len_dec: fbHeight
                        });
                    }

                    // Add Base Plates
                    if (bpMark && includeBasePlates === 'yes') {
                        const totalPostsCount = countLeftPost + countRightPost + midPostCount;
                        if (totalPostsCount > 0) {
                            const bpName = vals.basePlateSize === 'CUSTOM' ? `PL ${vals.basePlateT}"` : vals.basePlateSize;
                            const wVal = calculateWeight('plate', vals.basePlateSize, bpL, { w: bpW, h: bpL, t: vals.basePlateT }, totalPostsCount * assemblyQty);
                            
                            bomItems.push({
                                mark: bpMark,
                                qty: totalPostsCount * assemblyQty,
                                desc: `${bpW}x${bpL} Plate`,
                                remark: "BASE PLATE",
                                len: bpName,
                                weight: Math.round(wVal * 10) / 10,
                                shape: 'PLATE',
                                size: `${bpW}x${bpL}x${vals.basePlateT !== undefined ? vals.basePlateT : 0.5}`,
                                len_dec: bpL
                            });
                        }
                    }
                }
            } else if (cat === 'rails_gates') {
                const isGates = vals.railsGatesType === 'gates';
                const leftPostW = getPicketDimension(vals.leftPostType, vals.leftPostSize, vals.leftPostW);
                const rightPostW = getPicketDimension(vals.rightPostType, vals.rightPostSize, vals.rightPostW);
                const midPostW = getPicketDimension(vals.midPostType, vals.midPostSize, vals.midPostW);
                const topH = getProfileDimension(vals.topRailType, vals.topRailSize, vals.topRailH);
                const midH = getProfileDimension(vals.midRailType, vals.midRailSize, vals.midRailH);
                const botH = getProfileDimension(vals.botRailType, vals.botRailSize, vals.botRailH);
                const pickW = getPicketDimension(vals.picketType, vals.picketSize, vals.picketW);
                const bpW = vals.basePlateW || 6.0;
                const bpL = vals.basePlateL || 6.0;
                const bpH = getProfileDimension('plate', vals.basePlateSize, vals.basePlateT);
                const midRailGap = vals.midRailGap !== undefined ? vals.midRailGap : 12.0;

                const isExtended = !isGates && (vals.postHeight > vals.fenceHeight);
                const midPostCount = parseInt(vals.midPostCount) || 0;
                
                // Calculate correct sloped lengths
                const rad = vals.slope * Math.PI / 180;
                const cos = Math.cos(rad);
                const isPlateFrame = isGates && (vals.leftPostType === 'plate' || vals.rightPostType === 'plate' || vals.topRailType === 'plate' || vals.botRailType === 'plate');
                let topRailLen = vals.length;
                if (isPlateFrame) {
                    topRailLen = vals.length - leftPostW - rightPostW;
                }
                const preciseTopLen = Math.round((cos > 0.001 ? (topRailLen / cos) : topRailLen) * 16) / 16;
                
                let botRailLen = vals.length;
                if (isExtended || isPlateFrame) {
                    botRailLen = vals.length - leftPostW - rightPostW;
                }
                const preciseBotLen = Math.round((cos > 0.001 ? (botRailLen / cos) : botRailLen) * 16) / 16;
                
                let midRailLen = vals.length - leftPostW - rightPostW;
                const preciseMidLen = Math.round((cos > 0.001 ? (midRailLen / cos) : midRailLen) * 16) / 16;

                const midPostHeight = isExtended ? (vals.postHeight - vals.fenceHeight) : 0;
                const effectiveEmbed = (vals.includeBasePlates === 'yes') ? 0 : Math.max(0, vals.postHeight - vals.fenceHeight - 6.0);
                const finalMidPostHeight = midPostHeight + effectiveEmbed;

                const picketPositions = getPicketPositions(
                    vals.railStyle || 'classical',
                    vals.length,
                    leftPostW,
                    rightPostW,
                    pickW,
                    vals.picketSpacing,
                    midPostCount,
                    midPostW
                );
                const numPickets = picketPositions.length;
                let finalPicketsCount = numPickets;

                // Unified piece mark assignment
                const cleanDrawingNo = drawingNo.toUpperCase().replace(/[^A-Z0-9]/g, '');
                const mainMarkCode = cleanDrawingNo + 'M1';
                
                let charCode = 97; // 'a'
                let mainMarkAssigned = false;
                const getMark = (isPresent) => {
                    if (!isPresent) return null;
                    if (!mainMarkAssigned) {
                        mainMarkAssigned = true;
                        return mainMarkCode;
                    }
                    const m = String.fromCharCode(charCode) + cleanDrawingNo;
                    charCode++;
                    return m;
                };

                const topMark = getMark(vals.topRailType !== 'none');
                const botMark = getMark(vals.botRailType !== 'none');
                const midMark = getMark(vals.midRailType !== 'none');
                const leftMark = getMark(vals.leftPostType !== 'none');
                const rightMark = getMark(vals.rightPostType !== 'none');
                const midPostMark = getMark(!isGates && midPostCount > 0 && vals.midPostType !== 'none');
                const picketMark = getMark(vals.picketType !== 'none' && finalPicketsCount > 0);
                const kpMark = getMark(isGates && vals.kickPlate && vals.kickPlate !== 'none');
                const bpMark = getMark(!isGates && vals.includeBasePlates === 'yes');

                const botY = isExtended ? (vals.postHeight - vals.fenceHeight) : 0;
                const topY = vals.postHeight - topH;

                // Add Top Rail / Runner (Main Mark)
                if (topMark) {
                    const name = vals.topRailSize === 'CUSTOM' ? `HSS ${vals.topRailH}x${vals.topRailH}` : vals.topRailSize;
                    const wVal = calculateWeight(vals.topRailType, vals.topRailSize, preciseTopLen, { w: vals.topRailH, h: vals.topRailH, t: 0.12 }, 1 * assemblyQty);
                    
                    bomItems.push({
                        mark: topMark,
                        qty: 1 * assemblyQty,
                        desc: name,
                        remark: isGates ? "TOP RUNNER" : "TOP RAIL",
                        len: formatFraction(preciseTopLen),
                        weight: Math.round(wVal * 10) / 10,
                        shape: vals.topRailType.toUpperCase(),
                        size: name,
                        len_dec: preciseTopLen
                    });
                }

                // Add Bottom Rail / Runner
                if (botMark) {
                    const name = vals.botRailSize === 'CUSTOM' ? `HSS ${vals.botRailH}x${vals.botRailH}` : vals.botRailSize;
                    const wVal = calculateWeight(vals.botRailType, vals.botRailSize, preciseBotLen, { w: vals.botRailH, h: vals.botRailH, t: 0.12 }, 1 * assemblyQty);
                    
                    bomItems.push({
                        mark: botMark,
                        qty: 1 * assemblyQty,
                        desc: name,
                        remark: isGates ? "BOTTOM RUNNER" : "BOTTOM RAIL",
                        len: formatFraction(preciseBotLen),
                        weight: Math.round(wVal * 10) / 10,
                        shape: vals.botRailType.toUpperCase(),
                        size: name,
                        len_dec: preciseBotLen
                    });
                }

                // Add Mid Rail / Runner
                if (midMark) {
                    const name = vals.midRailSize === 'CUSTOM' ? `HSS ${vals.midRailH}x${vals.midRailH}` : vals.midRailSize;
                    const wVal = calculateWeight(vals.midRailType, vals.midRailSize, preciseMidLen, { w: vals.midRailH, h: vals.midRailH, t: 0.12 }, 1 * assemblyQty);
                    
                    bomItems.push({
                        mark: midMark,
                        qty: 1 * assemblyQty,
                        desc: name,
                        remark: isGates ? "MID RUNNER" : "MID RAIL",
                        len: formatFraction(preciseMidLen),
                        weight: Math.round(wVal * 10) / 10,
                        shape: vals.midRailType.toUpperCase(),
                        size: name,
                        len_dec: preciseMidLen
                    });
                }

                // Add Left Post / Runner
                const runnerH = isGates ? vals.fenceHeight : vals.postHeight;
                if (leftMark) {
                    const name = vals.leftPostSize === 'CUSTOM' ? `HSS ${vals.leftPostW}x${vals.leftPostW}` : vals.leftPostSize;
                    const wVal = calculateWeight(vals.leftPostType, vals.leftPostSize, runnerH, { w: vals.leftPostW, h: vals.leftPostW, t: 0.15 }, 1 * assemblyQty);
                    
                    bomItems.push({
                        mark: leftMark,
                        qty: 1 * assemblyQty,
                        desc: name,
                        remark: isGates ? "LEFT RUNNER" : "LEFT POST",
                        len: formatFraction(runnerH),
                        weight: Math.round(wVal * 10) / 10,
                        shape: vals.leftPostType.toUpperCase(),
                        size: name,
                        len_dec: runnerH
                    });
                }

                // Add Right Post / Runner
                if (rightMark) {
                    const name = vals.rightPostSize === 'CUSTOM' ? `HSS ${vals.rightPostW}x${vals.rightPostW}` : vals.rightPostSize;
                    const wVal = calculateWeight(vals.rightPostType, vals.rightPostSize, runnerH, { w: vals.rightPostW, h: vals.rightPostW, t: 0.15 }, 1 * assemblyQty);
                    
                    bomItems.push({
                        mark: rightMark,
                        qty: 1 * assemblyQty,
                        desc: name,
                        remark: isGates ? "RIGHT RUNNER" : "RIGHT POST",
                        len: formatFraction(runnerH),
                        weight: Math.round(wVal * 10) / 10,
                        shape: vals.rightPostType.toUpperCase(),
                        size: name,
                        len_dec: runnerH
                    });
                }

                // Add Mid Posts
                if (midPostMark) {
                    const name = vals.midPostSize === 'CUSTOM' ? `HSS ${vals.midPostW}x${vals.midPostW}` : vals.midPostSize;
                    const wVal = calculateWeight(vals.midPostType, vals.midPostSize, finalMidPostHeight, { w: vals.midPostW, h: vals.midPostW, t: 0.15 }, midPostCount * assemblyQty);
                    
                    bomItems.push({
                        mark: midPostMark,
                        qty: midPostCount * assemblyQty,
                        desc: name,
                        remark: "MID POST",
                        len: formatFraction(finalMidPostHeight),
                        weight: Math.round(wVal * 10) / 10,
                        shape: vals.midPostType.toUpperCase(),
                        size: name,
                        len_dec: finalMidPostHeight
                    });
                }                // Add Pickets
                if (picketMark && vals.picketType !== 'none') {
                    const picketBottomY = (isGates && vals.midRailType !== 'none') 
                        ? midRailGap 
                        : ((vals.kickPlate !== 'none') ? (vals.kickPlateWeld === 'outer' ? vals.kickPlateH : botH + vals.kickPlateH) : botH);
                    
                    const picketTopY = (vals.midRailType !== 'none') 
                        ? (isGates ? (vals.fenceHeight - topH) : (topY - midRailGap - midH)) 
                        : (vals.fenceHeight - topH);
                    const picketH = Math.max(2, picketTopY - picketBottomY);
                    
                    const name = vals.picketSize === 'CUSTOM' ? `HSS ${vals.picketW}x${vals.picketW}` : vals.picketSize;
                    const wVal = calculateWeight(vals.picketType, vals.picketSize, picketH, { w: vals.picketW, h: vals.picketW, t: 0.08 }, finalPicketsCount * assemblyQty);
                    
                    bomItems.push({
                        mark: picketMark,
                        qty: finalPicketsCount * assemblyQty,
                        desc: name,
                        remark: "PICKET",
                        len: formatFraction(picketH),
                        weight: Math.round(wVal * 10) / 10,
                        shape: vals.picketType.toUpperCase(),
                        size: name,
                        len_dec: picketH
                    });
                }

                // Add Kick Plate
                if (kpMark) {
                    const kpQty = vals.kickPlate === '2_sides' ? 2 : 1;
                    const kickPlateWeld = vals.kickPlateWeld || 'inner';
                    const kickPlateSize = vals.kickPlateSize || 'PL11GA';
                    
                    const isOuter = (kickPlateWeld === 'outer');
                    const kpW = isOuter ? vals.length : (vals.length - leftPostW - rightPostW);
                    const kpH = vals.kickPlateH || 12.0;
                    
                    const plates = SHAPES_DB['plate'] || [];
                    const selectedPlate = plates.find(p => p.id === kickPlateSize) || { t: 0.1196, name: '11 GA Plate' };
                    const kpT = selectedPlate.t;
                    const wVal = calculateWeight('plate', kickPlateSize, kpW, { w: kpW, h: kpH, t: kpT }, kpQty * assemblyQty);
                    
                    const kpDesc = formatPlateDesc(kickPlateSize, kpH);
                    bomItems.push({
                        mark: kpMark,
                        qty: kpQty * assemblyQty,
                        desc: kpDesc,
                        remark: `KICK PL (${vals.kickPlate === '2_sides' ? '2S' : '1S'} ${isOuter ? 'OUT' : 'INN'})`,
                        len: formatFraction(kpW),
                        weight: Math.round(wVal * 10) / 10,
                        shape: 'PLATE',
                        size: kpDesc,
                        len_dec: kpW
                    });
                }

                // Add Base Plates
                if (bpMark) {
                    const totalPosts = (vals.leftPostType !== 'none' ? 1 : 0) + (vals.rightPostType !== 'none' ? 1 : 0) + (vals.midPostType !== 'none' ? midPostCount : 0);
                    const bpName = vals.basePlateSize === 'CUSTOM' ? `PL ${vals.basePlateT}"` : vals.basePlateSize;
                    const wVal = calculateWeight('plate', vals.basePlateSize, bpL, { w: bpW, h: bpL, t: vals.basePlateT }, totalPosts * assemblyQty);
                    
                    bomItems.push({
                        mark: bpMark,
                        qty: totalPosts * assemblyQty,
                        desc: `${bpW}x${bpL} Plate`,
                        remark: "BASE PLATE",
                        len: bpName,
                        weight: Math.round(wVal * 10) / 10,
                        shape: 'PLATE',
                        size: `${bpW}x${bpL}x${vals.basePlateT !== undefined ? vals.basePlateT : 0.5}`,
                        len_dec: bpL
                    });
                }

                // Add Wire Mesh / XF Frame & Panel (Consolidated BOM)
                if (isGates && vals.meshType && vals.meshType !== 'none') {
                    const meshFbSize = vals.meshFbSize || 'FB1x1/8';
                    const meshSize = vals.meshSize || 'WWM2x2x0.135';
                    
                    const picketBottomY = (vals.midRailType !== 'none') 
                        ? midRailGap 
                        : ((vals.kickPlate !== 'none') ? (vals.kickPlateWeld === 'outer' ? vals.kickPlateH : botH + vals.kickPlateH) : botH);
                    const mOpeningW = vals.length - leftPostW - rightPostW;
                    const mOpeningH = (vals.fenceHeight - topH) - picketBottomY;
                    
                    const fbMark = getMark(true);
                    const meshPanelMark = getMark(true);
                    
                    const fbW = 1.0;
                    const fbT = 0.125;
                    const fbWtH = fbW * fbT * mOpeningW * 0.2833;
                    const fbWtV = fbW * fbT * mOpeningH * 0.2833;
                    
                    // Horizontal FBs
                    bomItems.push({
                        mark: fbMark + "H",
                        qty: 2 * assemblyQty,
                        desc: meshFbSize,
                        remark: "MESH FRAME FB",
                        len: formatFraction(mOpeningW),
                        weight: Math.round(fbWtH * 10) / 10,
                        shape: 'FLAT_BAR',
                        size: meshFbSize,
                        len_dec: mOpeningW
                    });
                    
                    // Vertical FBs
                    bomItems.push({
                        mark: fbMark + "V",
                        qty: 2 * assemblyQty,
                        desc: meshFbSize,
                        remark: "MESH FRAME FB",
                        len: formatFraction(mOpeningH),
                        weight: Math.round(fbWtV * 10) / 10,
                        shape: 'FLAT_BAR',
                        size: meshFbSize,
                        len_dec: mOpeningH
                    });
                    
                    const areaSqFt = (mOpeningW * mOpeningH) / 144.0;
                    const meshWtFactor = vals.meshType === 'mesh' ? 0.8 : 1.8;
                    const panelWt = areaSqFt * meshWtFactor;
                    
                    const parsedMesh = parseMeshSpec(vals.meshType, meshSize, mOpeningH);
                    bomItems.push({
                        mark: meshPanelMark,
                        qty: 1 * assemblyQty,
                        desc: parsedMesh.bomDesc,
                        remark: vals.meshType === 'mesh' ? "WWM WIRE MESH" : "EXPANDED METAL",
                        len: formatFraction(mOpeningW),
                        weight: Math.round(panelWt * 10) / 10,
                        shape: vals.meshType === 'mesh' ? 'WWM' : 'XF',
                        size: parsedMesh.dimensions,
                        len_dec: mOpeningW,
                        grade: vals.meshType === 'mesh' ? 'WELDED' : 'A36'
                    });
                }
                
                // Add Panic Bar Plate (Consolidated BOM)
                if (isGates && vals.panicBarPlate === 'yes') {
                    const pbpMark = getMark(true);
                    const pbpW = vals.panicBarPlateW || 8.0;
                    const pbpT = vals.panicBarPlateSize || 'PL3/16';
                    const pbpLen = vals.length - leftPostW - rightPostW;
                    
                    const plates = SHAPES_DB['plate'] || [];
                    const selectedPlate = plates.find(p => p.id === pbpT) || { t: 0.1875 };
                    const pbpThick = selectedPlate.t;
                    const pbpDesc = formatPlateDesc(pbpT, pbpW);
                    
                    const pbpWt = pbpLen * pbpW * pbpThick * 0.2833;
                    
                    bomItems.push({
                        mark: pbpMark,
                        qty: 1 * assemblyQty,
                        desc: pbpDesc,
                        remark: "PANIC BAR PLATE",
                        len: formatFraction(pbpLen),
                        weight: Math.round(pbpWt * 10) / 10,
                        shape: 'PLATE',
                        size: pbpDesc,
                        len_dec: pbpLen
                    });
                }
            } else if (cat === 'welded_assembly') {
                const selectedSizeId = document.getElementById('shape-size')?.value || 'HSS1.5x1.5x14GA';
                const selectedHss = SHAPES_DB['hss_rect'].find(s => s.id === selectedSizeId) || { w: 1.5, h: 1.5, t: 0.0747 };
                
                const W = vals.w || 12.0;
                const H = vals.h || 8.0;
                const D = vals.depth || 18.0;
                const grade = 'A500';
                
                // 1. Bottom Front Runner (Main Mark)
                const wVal1 = calculateWeight('hss_rect', selectedSizeId, W, selectedHss, 1);
                bomItems.push({
                    mark: mainMarkUpper,
                    qty: 1,
                    desc: `${selectedSizeId} (BOTTOM FRONT)`,
                    len: formatFraction(W),
                    weight: Math.round(wVal1 * 10) / 10,
                    shape: 'HSS',
                    size: selectedSizeId,
                    len_dec: W,
                    grade: grade,
                    isWeldedPiece: true
                });
                
                // 2. Vertical legs (Piece Mark b + cleanDrawingNo)
                const legLen = H;
                const wVal2 = calculateWeight('hss_rect', selectedSizeId, legLen, selectedHss, 4);
                bomItems.push({
                    mark: `b${cleanDrawingNo.toUpperCase()}`,
                    qty: 4,
                    desc: `${selectedSizeId} (VERTICAL LEGS)`,
                    len: formatFraction(legLen),
                    weight: Math.round(wVal2 * 10) / 10,
                    shape: 'HSS',
                    size: selectedSizeId,
                    len_dec: legLen,
                    grade: grade,
                    isWeldedPiece: true
                });
                
                // 3. Side horizontal runners (Piece Mark a + cleanDrawingNo)
                const sideLen = D;
                const wVal3 = calculateWeight('hss_rect', selectedSizeId, sideLen, selectedHss, 2);
                bomItems.push({
                    mark: `a${cleanDrawingNo.toUpperCase()}`,
                    qty: 2,
                    desc: `${selectedSizeId} (SIDE RUNNERS)`,
                    len: formatFraction(sideLen),
                    weight: Math.round(wVal3 * 10) / 10,
                    shape: 'HSS',
                    size: selectedSizeId,
                    len_dec: sideLen,
                    grade: grade,
                    isWeldedPiece: true
                });
                
                // 4. Back horizontal runner (Piece Mark c + cleanDrawingNo)
                const wVal4 = calculateWeight('hss_rect', selectedSizeId, W, selectedHss, 1);
                bomItems.push({
                    mark: `c${cleanDrawingNo.toUpperCase()}`,
                    qty: 1,
                    desc: `${selectedSizeId} (BOTTOM BACK)`,
                    len: formatFraction(W),
                    weight: Math.round(wVal4 * 10) / 10,
                    shape: 'HSS',
                    size: selectedSizeId,
                    len_dec: W,
                    grade: grade,
                    isWeldedPiece: true
                });
            } else if (cat === 'plate') {
                const shapes = SHAPES_DB['plate'] || [];
                const selectedSizeId = document.getElementById('shape-size')?.value || 'PL1/2';
                const selectedPlate = shapes.find(s => s.id === selectedSizeId) || { t: 0.5, name: '1/2" PL' };
                const plateT = selectedPlate.t;
                
                let rowDesc = "";
                let lenVal = `PL ${plateT}"`;
                let wVal = 0.0;
                let preciseLen = vals.w || 12.0;
                
                if (vals.fabMethod === 'custom') {
                    let minX = 0, maxX = 0, minY = 0, maxY = 0;
                    customPlatePoints.forEach(p => {
                        if (p[0] < minX) minX = p[0];
                        if (p[0] > maxX) maxX = p[0];
                        if (p[1] < minY) minY = p[1];
                        if (p[1] > maxY) maxY = p[1];
                    });
                    const bboxW = maxX - minX;
                    const bboxH = maxY - minY;
                    rowDesc = `Custom Plate ${formatFraction(bboxW)} x ${formatFraction(bboxH)} x ${plateT}"`;
                    wVal = bboxW * bboxH * plateT * 0.2836;
                    preciseLen = bboxW;
                } else if (vals.fabMethod === 'bent') {
                    const devLen = CadEngine.calculatePlateDevelopedLength(vals.leg1, vals.leg2, plateT, vals.insideRadius, vals.bendAngle);
                    rowDesc = `Bent Plate L1=${vals.leg1}" L2=${vals.leg2}" W=${vals.w}" x ${plateT}" BENT ${vals.bendAngle}° R=${vals.insideRadius}"`;
                    lenVal = formatFraction(devLen);
                    wVal = vals.w * devLen * plateT * 0.2836;
                    preciseLen = devLen;
                } else {
                    rowDesc = `${vals.w}" x ${vals.h}" x ${plateT}" Plate`;
                    wVal = vals.w * vals.h * plateT * 0.2836;
                }
                
                bomItems.push({
                    mark: mainMarkUpper,
                    qty: 1,
                    desc: rowDesc,
                    len: lenVal,
                    weight: Math.round(wVal * 10) / 10,
                    shape: 'PLATE',
                    size: rowDesc,
                    len_dec: preciseLen
                });
            } else {
                // Standard Shapes
                desc = document.getElementById('shape-size') ? document.getElementById('shape-size').options[document.getElementById('shape-size').selectedIndex].text : cat.toUpperCase();
                
                const isBent = (vals.fabMethod === 'bent') && ['hss_rect', 'hss_circ', 'angles', 'plate'].includes(cat);
                let preciseLen = 12.0; 
                
                if (isBent) {
                    if (cat === 'plate' || cat === 'angles') {
                        preciseLen = CadEngine.calculatePlateDevelopedLength(vals.leg1, vals.leg2, vals.t || 0.25, vals.insideRadius, vals.bendAngle);
                    } else {
                        preciseLen = CadEngine.calculateCurvedHSSLength(vals.insideRadius, vals.bendAngle);
                    }
                }
                
                const wVal = calculateWeight(cat, vals.size || vals.shapeSize, preciseLen, vals, 1);
                
                let rowDesc = desc;
                if (isBent) {
                    rowDesc += ` BENT ${vals.bendAngle}° R=${vals.insideRadius}"`;
                }
                
                bomItems.push({
                    mark: mainMarkUpper,
                    qty: 1,
                    desc: rowDesc,
                    len: formatFraction(preciseLen),
                    weight: Math.round(wVal * 10) / 10,
                    shape: cat.toUpperCase(),
                    size: desc,
                    len_dec: preciseLen,
                    isBent: isBent
                });
            }

            // --- A. DRAW BOM BOX ---
            const bomX = 180, bomY = 7, bomW = 110;
            
            // Header Row (BILL OF MATERIAL)
            doc.setFillColor(235, 238, 242);
            doc.rect(bomX, bomY, bomW, 8, 'FD');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8.5);
            doc.text("BILL OF MATERIAL", bomX + 55, bomY + 5.5, { align: "center" });
            
            const subY = bomY + 8;
            doc.setFillColor(245, 247, 250);
            doc.rect(bomX, subY, bomW, 7, 'FD');
            doc.setFontSize(5);
            
            // Column Headers
            // x-splits: 180 -> 187 -> 201 -> 232 -> 243 -> 254 -> 266 -> 282 -> 290
            doc.text("QTY", 183.5, subY + 3, { align: "center" });
            doc.text("TOTAL", 183.5, subY + 5.5, { align: "center" });
            
            doc.text("PIECE", 194, subY + 3, { align: "center" });
            doc.text("MARK", 194, subY + 5.5, { align: "center" });
            
            doc.text("DESCRIPTION", 216.5, subY + 4.5, { align: "center" });
            doc.text("LENGTH", 237.5, subY + 4.5, { align: "center" });
            
            doc.text("STEEL", 248.5, subY + 3, { align: "center" });
            doc.text("GRADE", 248.5, subY + 5.5, { align: "center" });
            
            doc.text("SURFACE", 260, subY + 3, { align: "center" });
            doc.text("FINISH", 260, subY + 5.5, { align: "center" });
            
            doc.text("REMARKS", 274, subY + 4.5, { align: "center" });
            
            doc.text("WEIGHT", 286, subY + 3, { align: "center" });
            doc.text("TOTAL", 286, subY + 5.5, { align: "center" });
            
            // Column Header Dividers
            doc.line(187, subY, 187, subY + 7);
            doc.line(201, subY, 201, subY + 7);
            doc.line(232, subY, 232, subY + 7);
            doc.line(243, subY, 243, subY + 7);
            doc.line(254, subY, 254, subY + 7);
            doc.line(266, subY, 266, subY + 7);
            doc.line(282, subY, 282, subY + 7);
            
            // Draw Rows
            let currentY = subY + 7;
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(5.5);
            
            const getSteelGrade = (shapeName) => {
                const s = (shapeName || '').toLowerCase();
                let grade = 'A500';
                if (s.includes('plate') || s.includes('pl')) {
                    grade = 'A36';
                } else if (s === 'wwm') {
                    grade = 'WELDED';
                }
                return grade.replace(/\bgr[.\s]*[a-z0-9]+/gi, '').trim();
            };
            
            const straightItems = bomItems.filter(item => !item.isBent);
            const bentItems = bomItems.filter(item => item.isBent);
            
            const drawCellText = (text, startX, cellWidth, alignment = "left", isBold = false) => {
                doc.setFont('helvetica', isBold ? 'bold' : 'normal');
                let currentSize = 5.5;
                doc.setFontSize(currentSize);
                let textW = doc.getTextWidth(text);
                const maxW = cellWidth - 2.0; // 2mm padding total
                while (textW > maxW && currentSize > 3.0) {
                    currentSize -= 0.1;
                    doc.setFontSize(currentSize);
                    textW = doc.getTextWidth(text);
                }
                
                let x = startX;
                if (alignment === "center") {
                    x = startX + cellWidth / 2;
                } else if (alignment === "left") {
                    x = startX + 1.2; // 1.2mm left padding
                } else if (alignment === "right") {
                    x = startX + cellWidth - 1.2; // 1.2mm right padding
                }
                
                doc.text(text, x, currentY + 3.8, { align: alignment });
                doc.setFontSize(5.5); // restore default
                doc.setFont('helvetica', 'normal');
            };

            const drawRow = (item) => {
                doc.rect(bomX, currentY, bomW, 5.5, 'S');
                
                // Qty
                drawCellText(item.qty.toString(), 180, 7, "center");
                // Piece Mark
                drawCellText(item.mark, 187, 14, "center", true);
                
                // Description (raw size only, e.g. HSS 2x2x1/8)
                const dText = item.desc || "";
                drawCellText(dText, 201, 31, "left");
                
                // Length
                drawCellText(item.len, 232, 11, "center");
                // Steel Grade
                const grade = item.grade || getSteelGrade(item.shape);
                drawCellText(grade, 243, 11, "center");
                // Surface Finish
                const shortFinish = finishText.toUpperCase();
                drawCellText(shortFinish, 254, 12, "center");
                
                // Remarks (descriptive labels like LEFT RUNNER, etc.)
                const rText = item.remark || "";
                drawCellText(rText, 266, 16, "left");
                
                // Weight
                drawCellText(item.weight.toFixed(1), 282, 8, "center");
                
                // Column Dividers
                doc.line(187, currentY, 187, currentY + 5.5);
                doc.line(201, currentY, 201, currentY + 5.5);
                doc.line(232, currentY, 232, currentY + 5.5);
                doc.line(243, currentY, 243, currentY + 5.5);
                doc.line(254, currentY, 254, currentY + 5.5);
                doc.line(266, currentY, 266, currentY + 5.5);
                doc.line(282, currentY, 282, currentY + 5.5);
                
                currentY += 5.5;
            };

            // Draw Straight Items
            if (straightItems.length > 0) {
                straightItems.forEach(item => {
                    if (currentY < 175) drawRow(item);
                });
            }
            
            // Draw Bent Items Divider & Items
            if (bentItems.length > 0 && currentY < 175) {
                doc.setFillColor(235, 238, 242);
                doc.rect(bomX, currentY, bomW, 5.5, 'FD');
                doc.setFont('helvetica', 'bold');
                doc.text("BENT ITEMS (FABRICATED)", bomX + 55, currentY + 3.8, { align: "center" });
                currentY += 5.5;
                
                bentItems.forEach(item => {
                    if (currentY < 175) drawRow(item);
                });
            }
            
            // Left blank - empty cells removed to save space and match clean AutoCAD styles
            doc.setDrawColor(0, 0, 0);
            doc.setLineWidth(0.2);
            doc.line(180, 7, 180, currentY);

            // Draw bottom-right details below the BOM box
            const bottomDetails = [];
            if (isMeshStyle && !isLoosePost) {
                bottomDetails.push('wire_mesh');
            }
            if (isMeshStyle && !isLoosePost && (activePanelType === 'leftReturn' || activePanelType === 'rightReturn') && vals.extraFlatBar === 'yes' && vals.leftPost === 'yes') {
                bottomDetails.push('extra_flat_bar');
            }

            if (bottomDetails.length > 0) {
                const boxY = currentY + 5;
                const boxH = 45;
                bottomDetails.forEach((detail, index) => {
                    let boxX, boxW;
                    if (bottomDetails.length === 1) {
                        boxX = bomX;
                        boxW = bomW;
                    } else {
                        boxW = (bomW - 4) / 2; // 53
                        boxX = index === 0 ? bomX : (bomX + boxW + 4);
                    }
                    if (detail === 'wire_mesh') {
                        drawWireMeshDetail(doc, boxX, boxY, boxW, boxH, vals);
                    } else if (detail === 'extra_flat_bar') {
                        drawExtraFlatBarDetail(doc, boxX, boxY, boxW, boxH, vals);
                    }
                });
            }

            // Draw Main Mark Label centered horizontally over the drawing
            const drawMainMarkLabel = () => {
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(8.5);
                doc.setTextColor(0, 0, 0);
                
                const mmText = mainMark.toUpperCase();
                const styleNameText = (style === 'classical') ? 'CLASSIC BALCONY RAIL' :
                                      (style === 'executive') ? 'EXECUTIVE BALCONY RAIL' :
                                      (style === 'urban_balcony') ? 'URBAN BALCONY RAIL' :
                                      (style === 'villa_balcony') ? 'VILLA BALCONY RAIL' :
                                      (style === 'urban_custom') ? 'URBAN CUSTOM RAIL' :
                                      (style === 'villa_custom') ? 'VILLA CUSTOM RAIL' :
                                      (style === 'classic_custom') ? 'CLASSIC CUSTOM RAIL' :
                                      (style === 'executive_custom') ? 'EXECUTIVE CUSTOM RAIL' : 'BALCONY RAIL';
                const reqText = `(${assemblyQty}) REQ'D - ${styleNameText}`;
                const scaleText = `SCALE 3/4" = 1'-0"`;
                
                const mmCenterX = pdfX + drawW / 2;
                const mmCenterY = 165;
                
                if (mmCenterY < 172) {
                    doc.text(mmText, mmCenterX, mmCenterY, { align: "center" });
                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(6.5);
                    doc.text(reqText, mmCenterX, mmCenterY + 4, { align: "center" });
                    doc.text(scaleText, mmCenterX, mmCenterY + 7.5, { align: "center" });
                }
            };
            drawMainMarkLabel();

            // --- DRAW BOTTOM TITLE BLOCKS (y = 175 to 203, height = 28mm) ---
            const blockY = 175;
            
            // Notice / Logo Cell: x = 7 to 75 (width = 68mm)
            doc.rect(7, blockY, 68, 28, 'S');
            // Drawing Log Cell: x = 75 to 145 (width = 70mm)
            doc.rect(75, blockY, 70, 28, 'S');
            // Project Info Cell: x = 145 to 230 (width = 85mm)
            doc.rect(145, blockY, 85, 28, 'S');
            // Drawing Details Cell: x = 230 to 265 (width = 35mm)
            doc.rect(230, blockY, 35, 28, 'S');
            // Fabrication/Sheet Cell: x = 265 to 290 (width = 25mm)
            doc.rect(265, blockY, 25, 28, 'S');

            // 1. Notice / Logo Cell Details
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.text("Quality Ironworks, Inc.", 41, blockY + 5.5, { align: "center" });
            doc.setFontSize(4.5);
            doc.text('"QUALITY PEOPLE MAKING A DIFFERENCE WITH QUALITY PRODUCTS"', 41, blockY + 8, { align: "center" });
            doc.text('est. 1994', 41, blockY + 10.5, { align: "center" });
            
            doc.rect(9, blockY + 12, 64, 14, 'S');
            doc.setFontSize(3.2);
            doc.setFont('helvetica', 'normal');
            const noticeText = "NOTICE: THIS DOCUMENT IS THE PROPERTY OF QUALITY IRONWORKS. NEITHER THIS DOCUMENT NOR ANY DATA OR INFORMATION HEREIN SHALL BE COPIED OR REPRODUCED IN ANY MANNER, LOANED, DISPOSED OF, OR USED FOR ANY PURPOSE WHATSOEVER, WITHOUT THE PRIOR WRITTEN CONSENT. THE BORROWER, IN CONSIDERATION OF SUCH LOAN, AGREES TO THE FOREGOING CONDITIONS AND TO RETURN THIS DOCUMENT ON REQUEST OR UPON COMPLETION OF THE SPECIFICALLY AUTHORIZED WORK FOR WHICH IT WAS USED.";
            doc.text(noticeText, 10, blockY + 14.5, { maxWidth: 62, align: "justify" });

            // 2. Drawing Log / Revision Table Details
            doc.setFillColor(245, 247, 250);
            doc.rect(75, blockY, 70, 4.5, 'FD');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(5);
            doc.text("NO.", 78, blockY + 3, { align: "center" });
            doc.text("DATE", 88.5, blockY + 3, { align: "center" });
            doc.text("DRAWING LOG", 116.5, blockY + 3, { align: "center" });
            doc.text("BY", 141, blockY + 3, { align: "center" });
            
            doc.line(81, blockY, 81, blockY + 28);
            doc.line(96, blockY, 96, blockY + 28);
            doc.line(137, blockY, 137, blockY + 28);
            
            const revRowY = blockY + 4.5;
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(5);
            
            const isNumerical = /^\d+$/.test(revision);
            const revDesc = isNumerical ? "FOR FABRICATION" : "FOR APPROVAL";
            const today = new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
            
            doc.text(revision, 78, revRowY + 3, { align: "center" });
            doc.text(today, 88.5, revRowY + 3, { align: "center" });
            doc.text(revDesc, 98, revRowY + 3, { align: "left" });
            doc.text(drawnBy, 141, revRowY + 3, { align: "center" });
            
            doc.line(75, revRowY, 145, revRowY);
            doc.line(75, revRowY + 4.5, 145, revRowY + 4.5);
            doc.line(75, revRowY + 9.0, 145, revRowY + 9.0);
            doc.line(75, revRowY + 13.5, 145, revRowY + 13.5);
            doc.line(75, revRowY + 18.0, 145, revRowY + 18.0);
            doc.line(75, revRowY + 22.5, 145, revRowY + 22.5);

            // 3. Project Info Details
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(5);
            doc.text("JOB NAME :", 147, blockY + 4.5);
            doc.text("ADDRESS :", 147, blockY + 9.5);
            doc.text("CITY/STATE :", 147, blockY + 14.5);
            doc.text("GC :", 147, blockY + 19.5);
            doc.text("DESCRIPTION :", 147, blockY + 24.5);
            
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(6);
            doc.text(jobName.toUpperCase(), 165, blockY + 4.5);
            doc.text(address.toUpperCase(), 165, blockY + 9.5);
            doc.text(cityState.toUpperCase(), 165, blockY + 14.5);
            doc.text(gc.toUpperCase(), 165, blockY + 19.5);
            
            let titleDesc = cat === 'fence' ? "INDUSTRIAL FENCE BLUEPRINT" : `${desc.toUpperCase()} FABRICATION`;
            if (cat === 'rail_catalog') {
                if (isLoosePost) {
                    titleDesc = "LOOSE CORNER POST";
                } else if (mainMark.toUpperCase().endsWith("FB")) {
                    titleDesc = "BALCONY MAIN RAIL";
                } else if (mainMark.toUpperCase().endsWith("LB") || mainMark.toUpperCase().endsWith("RB")) {
                    titleDesc = "BALCONY RETURN RAIL";
                } else {
                    titleDesc = "BALCONY RAIL";
                }
            }
            if (assemblyQty > 1) {
                titleDesc += ` - ${assemblyQty} REQD`;
            } else {
                titleDesc += ` - 1 REQD`;
            }
            doc.text(titleDesc.toUpperCase(), 165, blockY + 24.5);

            // 4. Drawing Details Details
            doc.line(230, blockY + 7.0, 265, blockY + 7.0);
            doc.line(230, blockY + 14.0, 265, blockY + 14.0);
            doc.line(230, blockY + 21.0, 265, blockY + 21.0);
            
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(5);
            doc.text("JOB NUMBER:", 232, blockY + 3.2);
            doc.text("DRAWN BY:", 232, blockY + 10.2);
            doc.text("CHECKED BY:", 232, blockY + 17.2);
            doc.text("DATE:", 232, blockY + 24.2);
            
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(5.5);
            doc.text(jobNo.toUpperCase(), 232, blockY + 5.8);
            doc.text(drawnBy.toUpperCase(), 232, blockY + 12.8);
            doc.text(checkedBy.toUpperCase(), 232, blockY + 19.8);
            doc.text(today, 232, blockY + 26.8);

            // 5. Fabrication & Sheet Details
            doc.line(265, blockY + 14, 290, blockY + 14);
            
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(4.5);
            doc.text("FAB NUMBER:", 267, blockY + 3.5);
            doc.text("SHEET NUMBER:", 267, blockY + 17.5);
            
            doc.setFontSize(8.5);
            doc.setFont('helvetica', 'bold');
            doc.text(fabNo.toUpperCase(), 277.5, blockY + 9.5, { align: "center" });
            doc.text(drawingNo.toUpperCase(), 277.5, blockY + 23.5, { align: "center" });

            if (isPreviewOnly) {
                const blob = doc.output('blob');
                const blobUrl = URL.createObjectURL(blob);
                resolve({ blobUrl: blobUrl, bomItems: bomItems });
                return;
            }

            if (isZipBatch) {
                if (url && url.indexOf('blob:') === 0) {
                    URL.revokeObjectURL(url);
                }
                resolve({ pdfData: doc.output('arraybuffer'), bomItems: bomItems });
                return;
            }

            // Save PDF drawing
            doc.save(`${drawingNo}.pdf`);
            if (url && url.indexOf('blob:') === 0) {
                URL.revokeObjectURL(url);
            }
            
            // --- D. GENERATE EXCEL DETAILED BOM (.XLSX) IF REQUESTED ---
            if (needFBOM) {
                const getSteelGrade = (shapeName) => {
                    const s = (shapeName || '').toLowerCase();
                    let grade = 'A500';
                    if (s.includes('plate') || s.includes('pl')) {
                        grade = 'A36';
                    } else if (s === 'wwm') {
                        grade = 'WELDED';
                    }
                    // Strip suffix like Gr. B / Gr. B / Gr B etc.
                    return grade.replace(/\bgr[.\s]*[a-z0-9]+/gi, '').trim();
                };

                const excelHeaders = [
                    "Approval Status", "Drawing #", "Main Mark", "Piece Mark", "Quantity", 
                    "Shape", "Dimensions", "Length", "Grade", "Finish", "Remark", 
                    "Category", "Sub-Category", "Sequence", "Lot #", "Sequence Qty"
                ];

                const excelRows = [];

                bomItems.forEach(item => {
                    // Determine shape: if it contains HSS, put only HSS
                    let shapeCol = (item.shape || '').toUpperCase();
                    if (shapeCol.includes('HSS')) {
                        shapeCol = 'HSS';
                    }
                    if (shapeCol === 'PLATE') shapeCol = 'PL';
                    if (shapeCol === 'FLAT_BAR') shapeCol = 'FB';

                    // Determine dimensions: only put dimension, don't put HSS/PL/FB
                    let dimCol = (item.size || item.desc || '').toUpperCase();
                    dimCol = dimCol
                        .replace(/HSS/gi, '')
                        .replace(/\bPL\b/gi, '')
                        .replace(/\bFB\b/gi, '')
                        .replace(/^PL\s*/i, '')
                        .replace(/^FB\s*/i, '')
                        .trim();

                    // Length: use formatted fraction (item.len)
                    const lengthCol = item.len;

                    // Grade:
                    const gradeCol = item.grade || getSteelGrade(item.shape);

                    // Finish:
                    const finishCol = finishText.toUpperCase();

                    // Remark: "Dont put anything in the remarks section both in pdf and excel" -> empty string
                    const remarkCol = "";

                    // Category and Sub-Category mapping
                    let categoryCol = "MISC";
                    let subCategoryCol = "MISC";

                    const descLower = (item.desc || '').toLowerCase();
                    const markLower = (item.mark || '').toLowerCase();
                    const shapeLower = (item.shape || '').toLowerCase();

                    if (item.isBent) {
                        if (shapeLower.includes('plate') || shapeLower.includes('angle') || descLower.includes('plate') || descLower.includes('angle')) {
                            categoryCol = "PLATE";
                            subCategoryCol = "BENT PLATE";
                        } else {
                            categoryCol = "HSS";
                            subCategoryCol = "BENT HSS";
                        }
                    } else if (item.isWeldedPiece) {
                        categoryCol = "WELDED";
                        subCategoryCol = "WELDED PIECE";
                    } else if (shapeLower === 'plate' || descLower.includes('plate')) {
                        categoryCol = "PLATE";
                        subCategoryCol = "BASE PLATE";
                    } else if (descLower.includes('picket') || markLower.includes('picket')) {
                        categoryCol = "PICKET";
                        subCategoryCol = "PICKET";
                    } else if (descLower.includes('post') || markLower.includes('post')) {
                        categoryCol = "POST";
                        subCategoryCol = "POST";
                    } else if (descLower.includes('top rail') || descLower.includes('top runner') || (descLower.includes('rail') && (markLower.includes('top') || descLower.includes('top')))) {
                        categoryCol = "RAIL";
                        subCategoryCol = "TOP RAIL";
                    } else if (descLower.includes('bot rail') || descLower.includes('bottom rail') || descLower.includes('bot runner') || descLower.includes('bottom runner') || (descLower.includes('rail') && (markLower.includes('bot') || descLower.includes('bottom')))) {
                        categoryCol = "RAIL";
                        subCategoryCol = "BOTTOM RAIL";
                    } else if (descLower.includes('mid rail') || descLower.includes('mid runner') || (descLower.includes('rail') && (markLower.includes('mid')))) {
                        categoryCol = "RAIL";
                        subCategoryCol = "MID RAIL";
                    } else if (shapeLower.includes('hss')) {
                        categoryCol = "RAIL";
                        subCategoryCol = "RAIL";
                    }

                    excelRows.push([
                        "", // Approval Status
                        drawingNo, // Drawing #
                        mainMarkUpper, // Main Mark
                        item.mark, // Piece Mark
                        item.qty, // Quantity
                        shapeCol, // Shape
                        dimCol, // Dimensions
                        lengthCol, // Length
                        gradeCol, // Grade
                        finishCol, // Finish
                        remarkCol, // Remark
                        categoryCol, // Category
                        subCategoryCol, // Sub-Category
                        "", // Sequence
                        "", // Lot #
                        ""  // Sequence Qty
                    ]);
                });

                if (window.XLSX) {
                    const wb = XLSX.utils.book_new();
                    const wsData = [excelHeaders, ...excelRows];
                    const ws = XLSX.utils.aoa_to_sheet(wsData);
                    XLSX.utils.book_append_sheet(wb, ws, "FBOM");
                    XLSX.writeFile(wb, `FBOM-${jobNo}-${fabNo}.xlsx`);
                } else {
                    console.warn("SheetJS XLSX library not loaded, falling back to CSV");
                    let csvContent = excelHeaders.map(h => `"${h}"`).join(",") + "\n";
                    excelRows.forEach(row => {
                        csvContent += row.map(val => {
                            if (typeof val === 'number') return val;
                            return `"${(val || '').toString().replace(/"/g, '""')}"`;
                        }).join(",") + "\n";
                    });
                    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                    const csvUrl = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = csvUrl;
                    a.download = `FBOM-${jobNo}-${fabNo}.csv`;
                    a.click();
                    URL.revokeObjectURL(csvUrl);
                }
            }
            
            // Show Success Notification Toast
            const toast = document.createElement('div');
            toast.className = 'ai-success-toast';
            toast.innerHTML = `<i data-lucide="check-circle" style="color:#000; vertical-align:middle; margin-right:4px;"></i> Drawing Export Completed!`;
            document.body.appendChild(toast);
            if (window.lucide) lucide.createIcons();
            
            setTimeout(() => {
                toast.style.animation = 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) reverse';
                setTimeout(() => toast.remove(), 300);
            }, 3000);
            resolve();
                } catch (err) {
                    reject(err);
                }
            }, 150);
        };
        img.onerror = (err) => {
            if (url && url.indexOf('blob:') === 0) {
                URL.revokeObjectURL(url);
            }
            reject(err);
        };
        img.src = url;
        });
    }

    // --- AI drawing assistant logic ---
    const applyAiButton = document.getElementById('apply-ai-changes');
    const aiTextArea = document.getElementById('ai-instructions');

    if (applyAiButton && aiTextArea) {
        applyAiButton.addEventListener('click', () => {
            const query = aiTextArea.value.trim().toLowerCase();
            if (!query) return;

            let changesMade = false;

            const setVal = (id, value) => {
                const input = document.getElementById('inp-' + id);
                if (input) {
                    input.value = value;
                    changesMade = true;
                }
            };

            const setSelect = (id, value) => {
                const select = document.getElementById('inp-' + id);
                if (select) {
                    select.value = value;
                    changesMade = true;
                }
            };

            // 1. Check for category switch
            if (query.includes('hss rectangular') || query.includes('hss rect') || query.includes('rectangular hss') || query.includes('rect hss')) {
                shapeCategory.value = 'hss_rect';
                updateInputs();
            } else if (query.includes('hss circular') || query.includes('hss circ') || query.includes('pipe') || query.includes('circular hss') || query.includes('circ hss')) {
                shapeCategory.value = 'hss_circ';
                updateInputs();
            } else if (query.includes('angle') || query.includes('l-shape')) {
                shapeCategory.value = 'angles';
                updateInputs();
            } else if (query.includes('w-beam') || query.includes('i-beam') || query.includes('beam')) {
                shapeCategory.value = 'w_beam';
                updateInputs();
            } else if (query.includes('fence') || query.includes('industrial fence')) {
                shapeCategory.value = 'fence';
                updateInputs();
            } else if (query.includes('plate') || query.includes('base plate')) {
                shapeCategory.value = 'plate';
                updateInputs();
            }

            // 2. Extract numeric values using regex
            const extractNum = (patterns) => {
                for (const p of patterns) {
                    const match = query.match(p);
                    if (match && match[1]) {
                        return parseFloat(match[1]);
                    }
                }
                return null;
            };

            // Length
            const lengthVal = extractNum([
                /length\s*(?:to|is|=)?\s*(\d+(?:\.\d+)?)/,
                /(\d+(?:\.\d+)?)\s*(?:inch|in)?"?\s*length/
            ]);
            if (lengthVal !== null) setVal('length', lengthVal);

            // Fence Height
            const fenceHVal = extractNum([
                /fence\s*height\s*(?:to|is|=)?\s*(\d+(?:\.\d+)?)/,
                /(\d+(?:\.\d+)?)\s*(?:inch|in)?"?\s*fence\s*height/
            ]);
            if (fenceHVal !== null) setVal('fenceHeight', fenceHVal);

            // Post Height
            const postHVal = extractNum([
                /post\s*height\s*(?:to|is|=)?\s*(\d+(?:\.\d+)?)/,
                /(\d+(?:\.\d+)?)\s*(?:inch|in)?"?\s*post\s*height/
            ]);
            if (postHVal !== null) setVal('postHeight', postHVal);

            if (postSVal !== null) setVal('postSpacing', postSVal);

            // Top Gap
            const topGapVal = extractNum([
                /top\s*gap\s*(?:to|is|=)?\s*(\d+(?:\.\d+)?)/,
                /gap\s*(?:to|is|=)?\s*(\d+(?:\.\d+)?)/,
                /(\d+(?:\.\d+)?)\s*(?:inch|in)?"?\s*top\s*gap/,
                /(\d+(?:\.\d+)?)\s*(?:inch|in)?"?\s*gap/
            ]);
            if (topGapVal !== null) setVal('topGap', topGapVal);

            // Slope
            const slopeVal = extractNum([
                /slope\s*(?:at\s*bottom|to|is|=)?\s*(\d+(?:\.\d+)?)/,
                /(\d+(?:\.\d+)?)\s*(?:deg|degree|degrees|%)\s*slope/
            ]);
            if (slopeVal !== null) setVal('slope', slopeVal);

            // Picket Width
            const picketWVal = extractNum([
                /picket\s*(?:width|dimension|size)\s*(?:to|is|=)?\s*(\d+(?:\.\d+)?)/,
                /(\d+(?:\.\d+)?)\s*(?:inch|in)?"?\s*picket\s*(?:width|dimension|size)/
            ]);
            if (picketWVal !== null) setVal('picketW', picketWVal);

            // Picket Spacing
            const picketSVal = extractNum([
                /picket\s*spacing\s*(?:to|is|=)?\s*(\d+(?:\.\d+)?)/,
                /(\d+(?:\.\d+)?)\s*(?:inch|in)?"?\s*picket\s*spacing/
            ]);
            if (picketSVal !== null) setVal('picketSpacing', picketSVal);

            // Top Runner Dimension
            const topRailH = extractNum([
                /top\s*(?:runner|rail)\s*(?:height|dimension|size)?\s*(?:to|is|=)?\s*(\d+(?:\.\d+)?)/,
                /(\d+(?:\.\d+)?)\s*(?:inch|in)?"?\s*top\s*(?:runner|rail)/
            ]);
            if (topRailH !== null) setVal('topRailH', topRailH);

            // Mid Runner Dimension
            const midRailH = extractNum([
                /mid\s*(?:runner|rail)\s*(?:height|dimension|size)?\s*(?:to|is|=)?\s*(\d+(?:\.\d+)?)/,
                /(\d+(?:\.\d+)?)\s*(?:inch|in)?"?\s*mid\s*(?:runner|rail)/
            ]);
            if (midRailH !== null) setVal('midRailH', midRailH);

            // Bottom Runner Dimension
            const botRailH = extractNum([
                /bottom\s*(?:runner|rail)\s*(?:height|dimension|size)?\s*(?:to|is|=)?\s*(\d+(?:\.\d+)?)/,
                /(\d+(?:\.\d+)?)\s*(?:inch|in)?"?\s*bottom\s*(?:runner|rail)/
            ]);
            if (botRailH !== null) setVal('botRailH', botRailH);

            // HSS Dimensions (for rect)
            const wVal = extractNum([
                /width\s*(?:to|is|=)?\s*(\d+(?:\.\d+)?)/,
                /(\d+(?:\.\d+)?)\s*(?:inch|in)?"?\s*width/
            ]);
            if (wVal !== null) setVal('w', wVal);

            const hVal = extractNum([
                /height\s*(?:to|is|=)?\s*(\d+(?:\.\d+)?)/,
                /(\d+(?:\.\d+)?)\s*(?:inch|in)?"?\s*height/
            ]);
            if (hVal !== null) setVal('h', hVal);

            const tVal = extractNum([
                /thickness\s*(?:to|is|=)?\s*(\d+(?:\.\d+)?)/,
                /(\d+(?:\.\d+)?)\s*(?:inch|in)?"?\s*thickness/
            ]);
            if (tVal !== null) setVal('t', tVal);

            // HSS circular diameter
            const dVal = extractNum([
                /diameter\s*(?:to|is|=)?\s*(\d+(?:\.\d+)?)/,
                /(\d+(?:\.\d+)?)\s*(?:inch|in)?"?\s*diameter/
            ]);
            if (dVal !== null) setVal('d', dVal);

            // Hole offsets for Plate
            const holeOffsetXVal = extractNum([
                /hole\s*offset\s*x\s*(?:to|is|=)?\s*(\d+(?:\.\d+)?)/,
                /offset\s*x\s*(?:to|is|=)?\s*(\d+(?:\.\d+)?)/
            ]);
            if (holeOffsetXVal !== null) setVal('holeOffsetX', holeOffsetXVal);

            const holeOffsetYVal = extractNum([
                /hole\s*offset\s*y\s*(?:to|is|=)?\s*(\d+(?:\.\d+)?)/,
                /offset\s*y\s*(?:to|is|=)?\s*(\d+(?:\.\d+)?)/
            ]);
            if (holeOffsetYVal !== null) setVal('holeOffsetY', holeOffsetYVal);

            const holeDVal = extractNum([
                /hole\s*diameter\s*(?:to|is|=)?\s*(\d+(?:\.\d+)?)/
            ]);
            if (holeDVal !== null) setVal('holeD', holeDVal);

            // 3. Member profile changes via text
            const extractProfileType = (element) => {
                if (query.includes(element + ' hss rect') || query.includes(element + ' rectangular hss')) return 'hss_rect';
                if (query.includes(element + ' hss circ') || query.includes(element + ' circular hss') || query.includes(element + ' pipe')) return 'hss_circ';
                if (query.includes(element + ' w-beam') || query.includes(element + ' i-beam') || query.includes(element + ' beam')) return 'w_beam';
                if (query.includes(element + ' angle') || query.includes(element + ' l-shape')) return 'angles';
                if (query.includes(element + ' plate') || query.includes(element + ' flat bar')) return 'plate';
                return null;
            };

            ['top runner', 'top rail'].forEach(lbl => {
                const type = extractProfileType(lbl);
                if (type) setSelect('topRailType', type);
            });
            ['bottom runner', 'bottom rail'].forEach(lbl => {
                const type = extractProfileType(lbl);
                if (type) setSelect('botRailType', type);
            });
            ['mid runner', 'mid rail'].forEach(lbl => {
                const type = extractProfileType(lbl);
                if (type) setSelect('midRailType', type);
            });
            ['picket', 'vertical picket'].forEach(lbl => {
                const type = extractProfileType(lbl);
                if (type) setSelect('picketType', type);
            });

            // 4. Intelligent exact size matching (e.g. HSS4x4x1/4, PIPE2SCH40, W8x10, L4x4x1/4, PL1/4)
            Object.keys(SHAPES_DB).forEach(catKey => {
                SHAPES_DB[catKey].forEach(shape => {
                    if (query.includes(shape.id.toLowerCase())) {
                        if (query.includes('top runner') || query.includes('top rail')) {
                            setSelect('topRailType', catKey);
                            const typeSelect = document.getElementById('inp-topRailType');
                            if (typeSelect) {
                                typeSelect.value = catKey;
                                typeSelect.dispatchEvent(new Event('change'));
                            }
                            setSelect('topRailSize', shape.id);
                        } else if (query.includes('mid runner') || query.includes('mid rail')) {
                            setSelect('midRailType', catKey);
                            const typeSelect = document.getElementById('inp-midRailType');
                            if (typeSelect) {
                                typeSelect.value = catKey;
                                typeSelect.dispatchEvent(new Event('change'));
                            }
                            setSelect('midRailSize', shape.id);
                        } else if (query.includes('bottom runner') || query.includes('bottom rail')) {
                            setSelect('botRailType', catKey);
                            const typeSelect = document.getElementById('inp-botRailType');
                            if (typeSelect) {
                                typeSelect.value = catKey;
                                typeSelect.dispatchEvent(new Event('change'));
                            }
                            setSelect('botRailSize', shape.id);
                        } else if (query.includes('picket')) {
                            setSelect('picketType', catKey);
                            const typeSelect = document.getElementById('inp-picketType');
                            if (typeSelect) {
                                typeSelect.value = catKey;
                                typeSelect.dispatchEvent(new Event('change'));
                            }
                            setSelect('picketSize', shape.id);
                        } else {
                            // General size selection
                            setSelect('shape-size', shape.id);
                            const sizeSelector = document.getElementById('shape-size');
                            if (sizeSelector) {
                                sizeSelector.value = shape.id;
                                sizeSelector.dispatchEvent(new Event('change'));
                            }
                        }
                    }
                });
            });

            if (changesMade) {
                renderCurrentCAD();
                aiTextArea.value = '';
                const successMsg = document.createElement('div');
                successMsg.className = 'ai-success-toast';
                successMsg.innerHTML = '<i data-lucide="check"></i> Drawing Updated!';
                document.body.appendChild(successMsg);
                lucide.createIcons();
                setTimeout(() => successMsg.remove(), 2000);
            } else {
                alert("I couldn't identify any changes from your instruction. Try something like 'Make post height 90' or 'Change top runner to HSS Rectangular'.");
            }
        });
    }

    // --- Direct Manipulation / Interactive Tweak Mode ---
    const toggleTweakBtn = document.getElementById('toggle-interactive');
    if (toggleTweakBtn) {
        toggleTweakBtn.addEventListener('click', () => {
            tweakModeActive = !tweakModeActive;
            
            const btnSpan = toggleTweakBtn.querySelector('span');
            
            if (tweakModeActive) {
                // Coordinate with Pan Mode
                if (panModeActive) {
                    const panBtn = document.getElementById('toggle-pan-mode');
                    if (panBtn) panBtn.click();
                }
                toggleTweakBtn.style.backgroundColor = 'rgba(0, 212, 255, 0.2)';
                toggleTweakBtn.style.borderColor = 'var(--accent-primary)';
                if (btnSpan) btnSpan.textContent = 'Tweak Mode On';
                toggleTweakBtn.style.boxShadow = '0 0 10px rgba(0, 212, 255, 0.4)';
            } else {
                toggleTweakBtn.style.backgroundColor = 'transparent';
                toggleTweakBtn.style.borderColor = 'var(--border-color)';
                if (btnSpan) btnSpan.textContent = 'Tweak Mode Off';
                toggleTweakBtn.style.boxShadow = 'none';
                selectedAnnotId = null; // Deselect on disable
            }
            
            updateAnnotToolbar();
            if (currentMode === 'shapes') {
                renderCurrentCAD();
            } else if (currentMode === 'draft') {
                renderDraftSpace();
            }
        });
    }

    // --- AutoCAD Interactive Dimensioning Event Listeners ---
    const toggleAutocadDimBtn = document.getElementById('toggle-autocad-dimensions');
    const autocadDimToolbar = document.getElementById('autocad-dim-toolbar');
    
    if (toggleAutocadDimBtn) {
        toggleAutocadDimBtn.addEventListener('click', () => {
            autocadDimModeActive = !autocadDimModeActive;
            
            // Coordinate with Tweak Mode and Pan Mode
            if (autocadDimModeActive) {
                if (tweakModeActive) {
                    if (toggleTweakBtn) toggleTweakBtn.click();
                }
                if (panModeActive) {
                    const panBtn = document.getElementById('toggle-pan-mode');
                    if (panBtn) panBtn.click();
                }
                toggleAutocadDimBtn.style.backgroundColor = 'rgba(0, 212, 255, 0.2)';
                toggleAutocadDimBtn.style.borderColor = '#00d4ff';
                toggleAutocadDimBtn.querySelector('span').textContent = 'AutoCAD Dim On';
                toggleAutocadDimBtn.style.boxShadow = '0 0 10px rgba(0, 212, 255, 0.4)';
                
                // Cache snap points
                if (currentModel) {
                    const scale = CadEngine.isLibReady() ? 25.4 : 10;
                    cachedSnapPoints = getModelSnapPoints(currentModel, scale);
                }
            } else {
                toggleAutocadDimBtn.style.backgroundColor = 'transparent';
                toggleAutocadDimBtn.style.borderColor = 'var(--border-color)';
                toggleAutocadDimBtn.querySelector('span').textContent = 'AutoCAD Dim Off';
                toggleAutocadDimBtn.style.boxShadow = 'none';
                
                dimStartPoint = null;
                activeSnapPoint = null;
                selectedAnnotId = null; // Deselect on disable
                
                // Clean snap and temp overlay layers
                const svgElement = svgContainer.querySelector('svg');
                if (svgElement) {
                    const gSnap = svgElement.querySelector('.cad-snap-overlay');
                    if (gSnap) gSnap.innerHTML = "";
                    const gTemp = svgElement.querySelector('.cad-temp-dim-overlay');
                    if (gTemp) gTemp.innerHTML = "";
                }
            }
            updateAnnotToolbar();
        });
    }

    function updateAnnotToolbar() {
        const autocadDimToolbar = document.getElementById('autocad-dim-toolbar');
        if (!autocadDimToolbar) return;

        const shouldShow = autocadDimModeActive || tweakModeActive || (selectedAnnotId !== null);
        if (shouldShow) {
            autocadDimToolbar.classList.remove('hidden');
        } else {
            autocadDimToolbar.classList.add('hidden');
        }

        if (!selectedAnnotId) {
            // No selection
            const delBtn = document.getElementById('delete-selected-dim');
            if (delBtn) delBtn.classList.add('hidden');
            const panelTitle = document.getElementById('autocad-dim-panel-title');
            if (panelTitle) panelTitle.textContent = "AutoCAD Dimensioning";
            
            // Set values to globals
            if (dimFontSizeVal) dimFontSizeVal.textContent = `${customDimFontSize}px`;
            if (dimTextGapVal) dimTextGapVal.textContent = `${customDimTextGap}px`;
            const overrideInput = document.getElementById('dim-text-override');
            if (overrideInput) overrideInput.value = "";
            return;
        }
        
        // We have a selection! Show delete button
        const delBtn = document.getElementById('delete-selected-dim');
        if (delBtn) delBtn.classList.remove('hidden');
        const panelTitle = document.getElementById('autocad-dim-panel-title');
        if (panelTitle) panelTitle.textContent = `Selected: ${selectedAnnotId}`;
        
        // Initialize annotationProperties entry if not present
        if (!annotationProperties[selectedAnnotId]) {
            annotationProperties[selectedAnnotId] = {};
        }
        const spec = annotationProperties[selectedAnnotId];
        
        // Get values
        let currentSize = spec.fontSize;
        if (currentSize === undefined) {
            if (selectedAnnotId.startsWith('custom-dim-')) {
                currentSize = customDimFontSize;
            } else if (selectedAnnotId.startsWith('leader-')) {
                currentSize = 11; // Leader default
            } else {
                currentSize = 12; // Standard dimension default
            }
        }
        
        let currentGap = spec.textGap;
        if (currentGap === undefined) {
            if (selectedAnnotId.startsWith('custom-dim-')) {
                currentGap = customDimTextGap;
            } else if (selectedAnnotId.startsWith('leader-')) {
                currentGap = 0; // Not applicable
            } else {
                currentGap = 8; // Default text gap
            }
        }
        
        if (dimFontSizeVal) dimFontSizeVal.textContent = `${currentSize}px`;
        if (dimTextGapVal) dimTextGapVal.textContent = `${currentGap}px`;
        
        const overrideInput = document.getElementById('dim-text-override');
        if (overrideInput) {
            overrideInput.value = spec.text !== undefined && spec.text !== null ? spec.text : "";
        }
    }

    // Font size controls
    const dimFontIncBtn = document.getElementById('dim-font-inc');
    const dimFontDecBtn = document.getElementById('dim-font-dec');
    const dimFontSizeVal = document.getElementById('dim-font-size-val');

    if (dimFontIncBtn) {
        dimFontIncBtn.addEventListener('click', () => {
            if (selectedAnnotId) {
                if (!annotationProperties[selectedAnnotId]) annotationProperties[selectedAnnotId] = {};
                const spec = annotationProperties[selectedAnnotId];
                let currentSize = spec.fontSize;
                if (currentSize === undefined) {
                    currentSize = selectedAnnotId.startsWith('custom-dim-') ? customDimFontSize : (selectedAnnotId.startsWith('leader-') ? 11 : 12);
                }
                spec.fontSize = Math.min(32, currentSize + 1);
            } else {
                customDimFontSize = Math.min(32, customDimFontSize + 1);
            }
            updateAnnotToolbar();
            if (currentMode === 'shapes') {
                renderCurrentCAD();
            } else if (currentMode === 'draft') {
                renderDraftSpace();
            }
        });
    }
    
    if (dimFontDecBtn) {
        dimFontDecBtn.addEventListener('click', () => {
            if (selectedAnnotId) {
                if (!annotationProperties[selectedAnnotId]) annotationProperties[selectedAnnotId] = {};
                const spec = annotationProperties[selectedAnnotId];
                let currentSize = spec.fontSize;
                if (currentSize === undefined) {
                    currentSize = selectedAnnotId.startsWith('custom-dim-') ? customDimFontSize : (selectedAnnotId.startsWith('leader-') ? 11 : 12);
                }
                spec.fontSize = Math.max(6, currentSize - 1);
            } else {
                customDimFontSize = Math.max(6, customDimFontSize - 1);
            }
            updateAnnotToolbar();
            if (currentMode === 'shapes') {
                renderCurrentCAD();
            } else if (currentMode === 'draft') {
                renderDraftSpace();
            }
        });
    }

    // Text gap controls
    const dimGapIncBtn = document.getElementById('dim-gap-inc');
    const dimGapDecBtn = document.getElementById('dim-gap-dec');
    const dimTextGapVal = document.getElementById('dim-text-gap-val');

    if (dimGapIncBtn) {
        dimGapIncBtn.addEventListener('click', () => {
            if (selectedAnnotId) {
                if (!annotationProperties[selectedAnnotId]) annotationProperties[selectedAnnotId] = {};
                const spec = annotationProperties[selectedAnnotId];
                let currentGap = spec.textGap;
                if (currentGap === undefined) {
                    currentGap = selectedAnnotId.startsWith('custom-dim-') ? customDimTextGap : 8;
                }
                spec.textGap = Math.min(60, currentGap + 1);
            } else {
                customDimTextGap = Math.min(60, customDimTextGap + 1);
            }
            updateAnnotToolbar();
            if (currentMode === 'shapes') {
                renderCurrentCAD();
            } else if (currentMode === 'draft') {
                renderDraftSpace();
            }
        });
    }
    
    if (dimGapDecBtn) {
        dimGapDecBtn.addEventListener('click', () => {
            if (selectedAnnotId) {
                if (!annotationProperties[selectedAnnotId]) annotationProperties[selectedAnnotId] = {};
                const spec = annotationProperties[selectedAnnotId];
                let currentGap = spec.textGap;
                if (currentGap === undefined) {
                    currentGap = selectedAnnotId.startsWith('custom-dim-') ? customDimTextGap : 8;
                }
                spec.textGap = Math.max(0, currentGap - 1);
            } else {
                customDimTextGap = Math.max(0, customDimTextGap - 1);
            }
            updateAnnotToolbar();
            if (currentMode === 'shapes') {
                renderCurrentCAD();
            } else if (currentMode === 'draft') {
                renderDraftSpace();
            }
        });
    }

    // Text override input listener
    const dimTextOverrideInput = document.getElementById('dim-text-override');
    if (dimTextOverrideInput) {
        dimTextOverrideInput.addEventListener('input', () => {
            if (selectedAnnotId) {
                if (!annotationProperties[selectedAnnotId]) annotationProperties[selectedAnnotId] = {};
                const textVal = dimTextOverrideInput.value.trim();
                annotationProperties[selectedAnnotId].text = textVal !== "" ? textVal : null;
                
                if (currentMode === 'shapes') {
                    renderCurrentCAD();
                } else if (currentMode === 'draft') {
                    renderDraftSpace();
                }
            }
        });
    }

    // Delete selected annotation listener
    const deleteSelectedDimBtn = document.getElementById('delete-selected-dim');
    if (deleteSelectedDimBtn) {
        deleteSelectedDimBtn.addEventListener('click', () => {
            if (selectedAnnotId) {
                hiddenAnnotations.add(selectedAnnotId);
                selectedAnnotId = null;
                updateAnnotToolbar();
                if (currentMode === 'shapes') {
                    renderCurrentCAD();
                } else if (currentMode === 'draft') {
                    renderDraftSpace();
                }
            }
        });
    }

    // Clear dimensions control
    const clearCustomDimsBtn = document.getElementById('clear-custom-dims');
    if (clearCustomDimsBtn) {
        clearCustomDimsBtn.addEventListener('click', () => {
            customDimensionsList = [];
            dimStartPoint = null;
            activeSnapPoint = null;
            selectedAnnotId = null;
            updateAnnotToolbar();
            if (currentMode === 'shapes') {
                renderCurrentCAD();
            } else if (currentMode === 'draft') {
                renderDraftSpace();
            }
        });
    }

    // BOM Preview Drawer Collapse/Expand
    const toggleBomBtn = document.getElementById('btn-toggle-bom');
    const bomPreviewPanel = document.getElementById('bom-preview-panel');
    const bomToggleText = document.getElementById('bom-toggle-text');
    const bomChevron = document.getElementById('bom-chevron');
    
    let bomCollapsed = false;
    if (toggleBomBtn && bomPreviewPanel) {
        toggleBomBtn.addEventListener('click', () => {
            bomCollapsed = !bomCollapsed;
            if (bomCollapsed) {
                bomPreviewPanel.style.maxHeight = '40px';
                if (bomToggleText) bomToggleText.textContent = 'Expand';
                if (bomChevron) bomChevron.style.transform = 'rotate(180deg)';
            } else {
                bomPreviewPanel.style.maxHeight = '200px';
                if (bomToggleText) bomToggleText.textContent = 'Collapse';
                if (bomChevron) bomChevron.style.transform = 'rotate(0deg)';
            }
        });
    }

    function updateBOMPreview() {
        const tbody = document.getElementById('bom-preview-body');
        if (!tbody) return;
        tbody.innerHTML = "";
        
        let bomItems = [];
        const scale = CadEngine.isLibReady() ? 25.4 : 10;
        
        if (currentMode === 'draft') {
            draftMembers.forEach((m, idx) => {
                const cleanId = m.id.replace(/member_/g, 'M-').substring(0, 10).toUpperCase();
                let desc = m.params.size || "";
                if (!desc || desc === 'CUSTOM') {
                    const w = m.params.w || m.params.bf || m.params.d || 4;
                    const h = m.params.h || m.params.d || 4;
                    desc = `${m.type.toUpperCase()} ${w}"x${h}"`;
                }
                const isSection = m.viewType === 'section';
                const lenVal = isSection ? (m.params.t || 0.25) : (m.length || 60);
                
                bomItems.push({
                    mark: cleanId,
                    remark: m.label || `${m.type.toUpperCase()} MEMBER`,
                    desc: desc,
                    qty: 1,
                    len: formatFraction(lenVal)
                });
            });
        } else if (currentMode === 'shapes' && currentModel) {
            const cat = shapeCategory.value;
            const vals = {};
            dynamicInputs.querySelectorAll('input').forEach(inp => {
                const id = inp.id.replace('inp-', '');
                vals[id] = (inp.type === 'text') ? inp.value : (parseFloat(inp.value) || 0);
            });
            dynamicInputs.querySelectorAll('select').forEach(sel => {
                vals[sel.id.replace('inp-', '')] = sel.value;
            });
            
            const isGates = vals.railsGatesType === 'gates';
            const drawingNo = document.getElementById('exp-drawingNo')?.value || 'D-101';
            const cleanDrawingNo = drawingNo.toUpperCase().replace(/[^A-Z0-9]/g, '');
            const activeDwgNo = (cat === 'rail_catalog') ? getActiveBalconyDwgAndMark().drawingNo : cleanDrawingNo;
            const mainMarkCode = (cat === 'rail_catalog') ? getActiveBalconyDwgAndMark().mainMark : (cleanDrawingNo + 'M1');
            
            let charCode = 97; // 'a'
            let mainMarkAssigned = false;
            const getMark = (isPresent) => {
                if (!isPresent) return null;
                if (!mainMarkAssigned) {
                    mainMarkAssigned = true;
                    return mainMarkCode;
                }
                const m = String.fromCharCode(charCode) + activeDwgNo;
                charCode++;
                return m;
            };

            const getProfileDimension = (type, size, customVal) => {
                if (type === 'none' || size === 'NONE') return 0;
                if (size === 'CUSTOM') return customVal;
                const shapes = SHAPES_DB[type] || [];
                const selected = shapes.find(s => s.id === size);
                if (selected) {
                    if (type === 'hss_rect') return selected.h || selected.w || 0;
                    if (type === 'hss_circ') return selected.d || 0;
                    if (type === 'w_beam') return selected.d || 0;
                    if (type === 'angles') return selected.leg2 || selected.leg1 || 0;
                    if (type === 'plate') return selected.t || 0;
                }
                return customVal;
            };

            const getPicketDimension = (type, size, customVal) => {
                if (type === 'none' || size === 'NONE') return 0;
                if (size === 'CUSTOM') return customVal;
                const shapes = SHAPES_DB[type] || [];
                const selected = shapes.find(s => s.id === size);
                if (selected) {
                    if (type === 'hss_rect') return selected.w || 0;
                    if (type === 'hss_circ') return selected.d || 0;
                    if (type === 'w_beam') return selected.bf || 0;
                    if (type === 'angles') return selected.leg1 || 0;
                    if (type === 'plate') return selected.t || 0;
                }
                return customVal;
            };

            if (cat === 'rail_catalog') {
                const style = vals.railStyle || 'classical';
                const props = getResolvedPanelProperties(vals, style);
                let fHeight = props ? props.fHeight : 41.0;
                let pHeight = props ? props.pHeight : 45.75;
                let postType = props ? props.postType : 'hss_rect';
                let postW = props ? props.postW : 1.5;
                let postH = props ? props.postH : 1.5;
                let postT = props ? props.postT : 0.1196;
                let topRailType = props ? props.topRailType : 'hss_rect';
                let topRailW = props ? props.topRailW : 1.5;
                let topRailH = props ? props.topRailH : 1.5;
                let topRailT = props ? props.topRailT : 0.0598;
                let botRailType = props ? props.botRailType : 'hss_rect';
                let botRailW = props ? props.botRailW : 1.5;
                let botRailH = props ? props.botRailH : 1.5;
                let botRailT = props ? props.botRailT : 0.0598;
                let midRailType = props ? props.midRailType : 'none';
                let midRailW = props ? props.midRailW : 1.5;
                let midRailH = props ? props.midRailH : 1.5;
                let midRailT = props ? props.midRailT : 0.0598;
                let midRailGap = props ? props.midRailGap : 12.0;
                let picketType = props ? props.picketType : 'none';
                let picketW = props ? props.picketW : 0.5;
                let picketH = props ? props.picketH : 0.5;
                let picketT = props ? props.picketT : 0.0598;
                let picketSpacing = props ? props.picketSpacing : 4.0;
                let includeBasePlates = props ? props.includeBasePlates : 'no';

                let topH = topRailH;
                let botH = botRailH;
                let midH = (midRailType === 'none') ? 0 : midRailH;
                let picketW_size = picketW;
                let midPostCount = (vals.midPosts === 'default' || vals.midPosts === 'yes') ? Math.max(0, Math.ceil(vals.length / 48) - 1) : (vals.midPosts === 'custom' ? (parseInt(vals.midPostCount) || 0) : 0);
                let botY = pHeight - fHeight;
                let midRailGap_size = midRailGap;

                const startXBound = (vals.leftPost === 'yes') ? postW : 0;
                const endXBound = (vals.rightPost === 'yes') ? (vals.length - postW) : vals.length;
                const clearWidth = endXBound - startXBound - midPostCount * postW;
                const spanW = clearWidth / (midPostCount + 1);

                const panelType = balconyWizardState.activePanelType || 'main';
                const isLoosePost = (panelType === 'loosePost');
                const hasLeft = (vals.leftPost === 'yes');
                const hasRight = (vals.rightPost === 'yes');

                let countLeftPost = 0;
                let countRightPost = 0;

                countLeftPost = hasLeft ? 1 : 0;
                countRightPost = hasRight ? 1 : 0;

                const topMark = getMark(vals.topRailType !== 'none');
                const botMark = getMark(vals.botRailType !== 'none');
                const midMark = getMark(style === 'executive' || style === 'villa_balcony' || style === 'villa_custom' || style === 'executive_custom' || (style.includes('custom') && vals.midRailType !== 'none'));
                const leftMark = getMark(countLeftPost > 0 && vals.postType !== 'none');
                const rightMark = getMark(countRightPost > 0 && vals.postType !== 'none');
                const midPostMark = getMark(vals.midPosts !== 'none' && midPostCount > 0 && vals.postType !== 'none');
                const picketMark = getMark(picketType !== 'none');
                const isMeshStyle = (style === 'urban_balcony' || style === 'villa_balcony' || style === 'urban_custom' || style === 'villa_custom');
                const meshFbMark = getMark(isMeshStyle);
                const meshPanelMark = getMark(isMeshStyle);
                const bpMark = getMark(vals.includeBasePlates === 'yes');

                const railSpans = resolveRailMarksAndSpans(vals, drawingNo, cat, style, postW);

                if (isLoosePost) {
                    const postDwgName = (style === 'classical' || style === 'executive' || style === 'urban_balcony' || style === 'villa_balcony') ? `HSS 1.5x1.5x11GA` : (vals.postSize === 'CUSTOM' ? `HSS ${postW}x${postH}x${postT}` : vals.postSize);
                    bomItems.push({
                        mark: `a${drawingNo.toUpperCase()}`,
                        remark: "LOOSE POST",
                        desc: postDwgName,
                        qty: 1,
                        len: formatFraction(pHeight),
                        shape: postType.toUpperCase(),
                        size: postDwgName
                    });
                    
                    if (vals.includeBasePlates === 'yes') {
                        const bpW = vals.basePlateW || 6.0;
                        const bpL = vals.basePlateL || 6.0;
                        const bpName = vals.basePlateSize === 'CUSTOM' ? `PL ${vals.basePlateT}"` : vals.basePlateSize;
                        bomItems.push({
                            mark: `b${drawingNo.toUpperCase()}`,
                            remark: "BASE PLATE",
                            desc: `${bpW}x${bpL} Plate`,
                            qty: 1,
                            len: bpName,
                            shape: 'PLATE',
                            size: `${bpW}x${bpL}x${vals.basePlateT !== undefined ? vals.basePlateT : 0.5}`
                        });
                    }

                    if (isMeshStyle) {
                        const fH = vals.fenceHeight !== undefined ? vals.fenceHeight : 41.0;
                        const bY = pHeight - fH;
                        const bH = botRailH !== undefined ? botRailH : 1.5;
                        const tH = topRailH !== undefined ? topRailH : 1.5;
                        const mGap = midRailGap !== undefined ? midRailGap : 3.0;
                        const mH = midRailH !== undefined ? midRailH : 1.5;
                        
                        const yStart = bY + bH;
                        const hasMid = (style === 'villa_balcony' || (style === 'villa_custom' && midRailType !== 'none'));
                        const yEnd = hasMid ? (pHeight - tH - mGap - mH) : (pHeight - tH);
                        const fbHeight = yEnd - yStart;

                        if (fbHeight > 0) {
                            bomItems.push({
                                mark: `c${drawingNo.toUpperCase()}`,
                                remark: "ATTACHED FB",
                                desc: `FB 1"x1/8"`,
                                qty: 1,
                                len: formatFraction(fbHeight),
                                shape: 'FLAT_BAR',
                                size: `1"x1/8"`
                            });
                        }
                    }
                } else {
                    if (topMark) {
                        const name = (style === 'classical' || style === 'executive') ? `HSS 1.5x1.5x16GA` : (vals.topRailSize === 'CUSTOM' ? `HSS ${postW}x${topH}` : vals.topRailSize);
                        bomItems.push({ mark: topMark, remark: "TOP RAIL", desc: name, qty: 1, len: formatFraction(vals.length) });
                    }
                    if (botMark) {
                        const name = (style === 'classical' || style === 'executive') ? `HSS 1.5x1.5x16GA` : (vals.botRailSize === 'CUSTOM' ? `HSS ${postW}x${botH}` : vals.botRailSize);
                        const bottomGroups = {};
                        railSpans.bottomSegments.forEach(seg => {
                            if (!bottomGroups[seg.mark]) {
                                bottomGroups[seg.mark] = { len: seg.len, qty: 0 };
                            }
                            bottomGroups[seg.mark].qty++;
                        });
                        Object.keys(bottomGroups).forEach(mark => {
                            const group = bottomGroups[mark];
                            bomItems.push({ mark: mark, remark: "BOTTOM RAIL", desc: name, qty: group.qty, len: formatFraction(group.len) });
                        });
                    }
                    if (leftMark) {
                        const name = (style === 'classical' || style === 'executive' || style === 'urban_balcony' || style === 'villa_balcony') ? `HSS 1.5x1.5x11GA` : (vals.postSize === 'CUSTOM' ? `HSS ${postW}x${postH}` : vals.postSize);
                        bomItems.push({ mark: leftMark, remark: "LEFT POST", desc: name, qty: 1, len: formatFraction(pHeight) });
                    }
                    if (rightMark) {
                        const name = (style === 'classical' || style === 'executive' || style === 'urban_balcony' || style === 'villa_balcony') ? `HSS 1.5x1.5x11GA` : (vals.postSize === 'CUSTOM' ? `HSS ${postW}x${postH}` : vals.postSize);
                        bomItems.push({ mark: rightMark, remark: "RIGHT POST", desc: name, qty: 1, len: formatFraction(pHeight) });
                    }
                    if (midMark) {
                        const name = (style === 'executive' || style === 'villa_balcony') ? `HSS 1.5x1.5x16GA` : (vals.midRailSize === 'CUSTOM' ? `HSS ${postW}x${midH}` : vals.midRailSize);
                        const midGroups = {};
                        railSpans.midSegments.forEach(seg => {
                            if (!midGroups[seg.mark]) {
                                midGroups[seg.mark] = { len: seg.len, qty: 0 };
                            }
                            midGroups[seg.mark].qty++;
                        });
                        Object.keys(midGroups).forEach(mark => {
                            const group = midGroups[mark];
                            bomItems.push({ mark: mark, remark: "MID RUNNER", desc: name, qty: group.qty, len: formatFraction(group.len) });
                        });
                    }
                    if (midPostMark) {
                        const name = (style === 'classical' || style === 'executive' || style === 'urban_balcony' || style === 'villa_balcony') ? `HSS 1.5x1.5x11GA` : (vals.postSize === 'CUSTOM' ? `HSS ${postW}x${postH}` : vals.postSize);
                        const mpH = style === 'executive' ? 44.25 : (pHeight - topH);
                        bomItems.push({ mark: midPostMark, remark: "MID POST", desc: name, qty: midPostCount, len: formatFraction(mpH) });
                    }
                    if (picketMark) {
                        const name = (style === 'classical' || style === 'executive') ? `HSS 1/2x1/2x16GA` : (vals.picketSize === 'CUSTOM' ? `HSS ${picketW}x${picketW}` : vals.picketSize);
                        const picketBottomY = botY + botH;
                        const picketTopY = (midMark) ? (pHeight - topH - midRailGap - midH) : (pHeight - topH);
                        const picketH = picketTopY - picketBottomY;
                        bomItems.push({ mark: picketMark, remark: "PICKET", desc: name, qty: "AR", len: formatFraction(picketH) });
                    }
                    if (isMeshStyle) {
                        const picketBottomY = botY + botH;
                        const picketTopY = (midMark) ? (pHeight - topH - midRailGap - midH) : (pHeight - topH);
                        const fbHeight = picketTopY - picketBottomY;

                        // Group by suffix/length for Horizontal Flat Bars and Wire Mesh Panels
                        const meshGroups = {};
                        railSpans.bottomSegments.forEach(seg => {
                            const baseMark = "a" + drawingNo;
                            const suffix = seg.mark.substring(baseMark.length);
                            const hMark = meshFbMark + suffix;
                            const pMark = meshPanelMark + suffix;
                            
                            if (!meshGroups[suffix]) {
                                meshGroups[suffix] = {
                                    len: seg.len,
                                    qty: 0,
                                    hMark: hMark,
                                    pMark: pMark
                                };
                            }
                            meshGroups[suffix].qty++;
                        });

                        // Horizontal flat bars
                        if (meshFbMark) {
                            Object.keys(meshGroups).forEach(suffix => {
                                const group = meshGroups[suffix];
                                bomItems.push({
                                    mark: group.hMark,
                                    remark: "MESH FRAME HORIZ",
                                    desc: `FB 1"x1/8"`,
                                    qty: 2 * group.qty,
                                    len: formatFraction(group.len),
                                    shape: 'FLAT_BAR',
                                    size: '1"x1/8"',
                                    len_dec: group.len
                                });
                            });
                        }

                        // Vertical flat bars
                        if (meshFbMark) {
                            const leftOmitted = (vals.leftPost === 'no' || vals.leftPost === 'none') ? 1 : 0;
                            const rightOmitted = (vals.rightPost === 'no' || vals.rightPost === 'none') ? 1 : 0;
                            const vertQty = 2 * (midPostCount + 1) - leftOmitted - rightOmitted;
                            bomItems.push({
                                mark: meshFbMark,
                                remark: "MESH FRAME VERT",
                                desc: `FB 1"x1/8"`,
                                qty: vertQty,
                                len: formatFraction(fbHeight),
                                shape: 'FLAT_BAR',
                                size: '1"x1/8"',
                                len_dec: fbHeight
                            });
                        }

                        // Wire Mesh Panels
                        if (meshPanelMark) {
                            const meshGridW = vals.meshGridW !== undefined ? vals.meshGridW : 2.0;
                            const meshGridH = vals.meshGridH !== undefined ? vals.meshGridH : 2.0;
                            const meshWireD = vals.meshWireD !== undefined ? vals.meshWireD : 0.135;
                            const wwmSize = `${meshGridW}x${meshGridH}x${meshWireD} x ${formatFraction(fbHeight)}`;

                            Object.keys(meshGroups).forEach(suffix => {
                                const group = meshGroups[suffix];
                                const wwmDesc = `WWM ${meshGridW}x${meshGridH}x${meshWireD} x ${formatFraction(fbHeight)}`;
                                bomItems.push({
                                    mark: group.pMark,
                                    remark: "WWM WIRE MESH",
                                    desc: wwmDesc,
                                    qty: group.qty,
                                    len: formatFraction(group.len),
                                    shape: 'WWM',
                                    size: wwmSize,
                                    len_dec: group.len
                                });
                            });
                        }

                        if (vals.extraFlatBar === 'yes' && (panelType === 'leftReturn' || panelType === 'rightReturn') && vals.leftPost === 'yes') {
                            bomItems.push({
                                mark: meshFbMark,
                                remark: "EXTRA CORNER FB",
                                desc: `FB 1"x1/8"`,
                                qty: 1,
                                len: formatFraction(fbHeight),
                                shape: 'FLAT_BAR',
                                size: '1"x1/8"'
                            });
                        }
                    }
                    if (bpMark && vals.includeBasePlates === 'yes') {
                        const totalPostsCount = countLeftPost + countRightPost + midPostCount;
                        if (totalPostsCount > 0) {
                            const bpName = vals.basePlateSize === 'CUSTOM' ? `PL ${vals.basePlateT}"` : vals.basePlateSize;
                            bomItems.push({
                                mark: bpMark,
                                remark: "BASE PLATE",
                                desc: `${vals.basePlateW || 6.0}x${vals.basePlateL || 6.0} Plate`,
                                qty: totalPostsCount,
                                len: bpName
                            });
                        }
                    }
                }
            } else if (cat === 'rails_gates') {
                const leftPostW = getPicketDimension(vals.leftPostType, vals.leftPostSize, vals.leftPostW);
                const rightPostW = getPicketDimension(vals.rightPostType, vals.rightPostSize, vals.rightPostW);
                const midPostW = getPicketDimension(vals.midPostType, vals.midPostSize, vals.midPostW);
                const topH = getProfileDimension(vals.topRailType, vals.topRailSize, vals.topRailH);
                const midH = getProfileDimension(vals.midRailType, vals.midRailSize, vals.midH);
                const botH = getProfileDimension(vals.botRailType, vals.botRailSize, vals.botRailH);
                const pickW = getPicketDimension(vals.picketType, vals.picketSize, vals.picketW);
                const kickPlateH = vals.kickPlateH || 12.0;
                const midPostCount = parseInt(vals.midPostCount) || 0;
                
                const isExtended = !isGates && (vals.postHeight > vals.fenceHeight);
                const picketPositions = getPicketPositions(
                    vals.railStyle || 'classical',
                    vals.length,
                    leftPostW,
                    rightPostW,
                    pickW,
                    vals.picketSpacing,
                    midPostCount,
                    midPostW
                );
                const numPickets = picketPositions.length;
                const finalPicketsCount = numPickets;

                const topMark = getMark(vals.topRailType !== 'none');
                const botMark = getMark(vals.botRailType !== 'none');
                const midMark = getMark(vals.midRailType !== 'none');
                const leftMark = getMark(vals.leftPostType !== 'none');
                const rightMark = getMark(vals.rightPostType !== 'none');
                const midPostMark = getMark(!isGates && midPostCount > 0 && vals.midPostType !== 'none');
                const picketMark = getMark(vals.picketType !== 'none' && finalPicketsCount > 0);
                const kpMark = getMark(isGates && vals.kickPlate && vals.kickPlate !== 'none');
                const bpMark = getMark(!isGates && vals.includeBasePlates === 'yes');

                const rad = vals.slope * Math.PI / 180;
                const cos = Math.cos(rad);

                const isPlateFrame = isGates && (vals.leftPostType === 'plate' || vals.rightPostType === 'plate' || vals.topRailType === 'plate' || vals.botRailType === 'plate');
                let preciseTopLen = vals.length;
                if (isPlateFrame) preciseTopLen = vals.length - leftPostW - rightPostW;
                if (cos > 0.001) preciseTopLen = preciseTopLen / cos;
                let preciseBotLen = vals.length;
                if (isExtended || isPlateFrame) preciseBotLen = vals.length - leftPostW - rightPostW;
                if (cos > 0.001) preciseBotLen = preciseBotLen / cos;
                let preciseMidLen = vals.length;
                if (isExtended || isPlateFrame) preciseMidLen = vals.length - leftPostW - rightPostW;
                if (cos > 0.001) preciseMidLen = preciseMidLen / cos;

                const runnerH = isGates ? vals.fenceHeight : vals.postHeight;

                if (topMark) {
                    const sizeName = vals.topRailSize === 'CUSTOM' ? `HSS ${vals.topRailH}x${vals.topRailH}` : vals.topRailSize;
                    bomItems.push({ mark: topMark, remark: isGates ? "TOP RUNNER" : "TOP RAIL", desc: sizeName, qty: 1, len: formatFraction(preciseTopLen) });
                }
                if (botMark) {
                    const sizeName = vals.botRailSize === 'CUSTOM' ? `HSS ${vals.botRailH}x${vals.botRailH}` : vals.botRailSize;
                    bomItems.push({ mark: botMark, remark: isGates ? "BOTTOM RUNNER" : "BOTTOM RAIL", desc: sizeName, qty: 1, len: formatFraction(preciseBotLen) });
                }
                if (midMark) {
                    const sizeName = vals.midRailSize === 'CUSTOM' ? `HSS ${vals.midRailH}x${vals.midRailH}` : vals.midRailSize;
                    bomItems.push({ mark: midMark, remark: isGates ? "MID RUNNER" : "MID RAIL", desc: sizeName, qty: 1, len: formatFraction(preciseMidLen) });
                }
                if (leftMark) {
                    const sizeName = vals.leftPostSize === 'CUSTOM' ? `HSS ${vals.leftPostW}x${vals.leftPostW}` : vals.leftPostSize;
                    bomItems.push({ mark: leftMark, remark: isGates ? "LEFT RUNNER" : "LEFT POST", desc: sizeName, qty: 1, len: formatFraction(runnerH) });
                }
                if (rightMark) {
                    const sizeName = vals.rightPostSize === 'CUSTOM' ? `HSS ${vals.rightPostW}x${vals.rightPostW}` : vals.rightPostSize;
                    bomItems.push({ mark: rightMark, remark: isGates ? "RIGHT RUNNER" : "RIGHT POST", desc: sizeName, qty: 1, len: formatFraction(runnerH) });
                }
                if (midPostMark) {
                    const sizeName = vals.midPostSize === 'CUSTOM' ? `HSS ${vals.midPostW}x${vals.midPostW}` : vals.midPostSize;
                    const finalMidPostHeight = runnerH - botH;
                    bomItems.push({ mark: midPostMark, remark: "MID POST", desc: sizeName, qty: midPostCount, len: formatFraction(finalMidPostHeight) });
                }
                let picketBottomY = (vals.midRailType !== 'none') ? vals.midRailGap : ((vals.kickPlate !== 'none') ? (vals.kickPlateWeld === 'outer' ? kickPlateH : botH + kickPlateH) : botH);
                let picketTopY = vals.fenceHeight - topH;
                if (!isGates) {
                    picketBottomY = (vals.midRailType !== 'none') ? (vals.postHeight - vals.midRailGap) : ((vals.postHeight > vals.fenceHeight) ? (vals.postHeight - vals.fenceHeight + botH) : botH);
                    picketTopY = vals.postHeight - topH;
                }
                const picketH = picketTopY - picketBottomY;

                if (picketMark && vals.picketType !== 'none' && finalPicketsCount > 0) {
                    const sizeName = vals.picketSize === 'CUSTOM' ? `HSS ${vals.picketW}x${vals.picketW}` : vals.picketSize;
                    bomItems.push({ mark: picketMark, remark: "PICKET", desc: sizeName, qty: finalPicketsCount, len: formatFraction(picketH) });
                }
                if (kpMark) {
                    const kpW = vals.length - leftPostW - rightPostW;
                    bomItems.push({ mark: kpMark, remark: "KICK PLATE", desc: formatPlateDesc(vals.kickPlateSize, vals.kickPlateH || 12.0), qty: 1, len: formatFraction(kpW) });
                }
                if (bpMark) {
                    const totalPosts = 2 + midPostCount;
                    const bpW = vals.basePlateW || 6.0;
                    const bpL = vals.basePlateL || 6.0;
                    bomItems.push({ mark: bpMark, remark: "BASE PLATE", desc: `${bpW}x${bpL} Plate`, qty: totalPosts, len: `${bpW}x${bpL}x${vals.basePlateT || 0.5}"` });
                }

                // Wire Mesh / XF Frame & Panel
                if (isGates && vals.meshType && vals.meshType !== 'none') {
                    const meshFbSize = vals.meshFbSize || 'FB1x1/8';
                    const meshSize = vals.meshSize || 'WWM2x2x0.135';
                    
                    const mOpeningW = vals.length - leftPostW - rightPostW;
                    const mOpeningH = (vals.fenceHeight - topH) - picketBottomY;
                    
                    const fbMark = getMark(true);
                    const meshPanelMark = getMark(true);
                    
                    // Horizontal FBs
                    const fbW = 1.0;
                    const fbT = 0.125;
                    const fbWtH = fbW * fbT * mOpeningW * 0.2833;
                    const fbWtV = fbW * fbT * mOpeningH * 0.2833;
                    
                    bomItems.push({
                        mark: fbMark + "H",
                        remark: "MESH FRAME FB",
                        desc: meshFbSize,
                        qty: 2,
                        len: formatFraction(mOpeningW),
                        weight: Math.round(fbWtH * 2 * 10) / 10,
                        shape: 'FLAT_BAR',
                        size: meshFbSize,
                        len_dec: mOpeningW
                    });
                    
                    // Vertical FBs
                    bomItems.push({
                        mark: fbMark + "V",
                        remark: "MESH FRAME FB",
                        desc: meshFbSize,
                        qty: 2,
                        len: formatFraction(mOpeningH),
                        weight: Math.round(fbWtV * 2 * 10) / 10,
                        shape: 'FLAT_BAR',
                        size: meshFbSize,
                        len_dec: mOpeningH
                    });
                    
                    // Mesh Panel
                    const areaSqFt = (mOpeningW * mOpeningH) / 144.0;
                    const meshWtFactor = vals.meshType === 'mesh' ? 0.8 : 1.8;
                    const panelWt = areaSqFt * meshWtFactor;
                    
                    const parsedMesh = parseMeshSpec(vals.meshType, meshSize, mOpeningH);
                    bomItems.push({
                        mark: meshPanelMark,
                        remark: vals.meshType === 'mesh' ? "WWM WIRE MESH" : "EXPANDED METAL",
                        desc: parsedMesh.bomDesc,
                        qty: 1,
                        len: formatFraction(mOpeningW),
                        weight: Math.round(panelWt * 10) / 10,
                        shape: vals.meshType === 'mesh' ? 'WWM' : 'XF',
                        size: parsedMesh.dimensions,
                        len_dec: mOpeningW
                    });
                }
                
                // Panic Bar Plate
                if (isGates && vals.panicBarPlate === 'yes') {
                    const pbpMark = getMark(true);
                    const pbpW = vals.panicBarPlateW || 8.0;
                    const pbpT = vals.panicBarPlateSize || 'PL3/16';
                    const pbpLen = vals.length - leftPostW - rightPostW;
                    const pbpDesc = formatPlateDesc(pbpT, pbpW);
                    
                    const plates = SHAPES_DB['plate'] || [];
                    const selectedPlate = plates.find(p => p.id === pbpT) || { t: 0.1875 };
                    const pbpThick = selectedPlate.t;
                    const pbpWt = pbpLen * pbpW * pbpThick * 0.2833;
                    
                    bomItems.push({
                        mark: pbpMark,
                        remark: "PANIC BAR PLATE",
                        desc: pbpDesc,
                        qty: 1,
                        len: formatFraction(pbpLen),
                        weight: Math.round(pbpWt * 10) / 10,
                        shape: 'PLATE',
                        size: pbpDesc,
                        len_dec: pbpLen
                    });
                }
            } else if (cat === 'fence') {
                const postW = getPicketDimension(vals.postType, vals.postSize, vals.postW);
                const topH = getProfileDimension(vals.topRailType, vals.topRailSize, vals.topRailH);
                const midH = getProfileDimension(vals.midRailType, vals.midRailSize, vals.midH);
                const botH = getProfileDimension(vals.botRailType, vals.botRailSize, vals.botRailH);
                const pickW = getPicketDimension(vals.picketType, vals.picketSize, vals.picketW);
                const midRailGap = vals.midRailGap !== undefined ? vals.midRailGap : 12.0;

                const noPosts = (vals.postType === 'none' || vals.postHeight === 0 || vals.postSpacing === 0);
                const numSpans = noPosts ? 1 : Math.max(1, Math.round(vals.length / (vals.postSpacing || 1)));
                const numPosts = noPosts ? 0 : numSpans + 1;
                const actualPostSpacing = noPosts ? vals.length : (vals.length / numSpans);
                const effectivePostW = noPosts ? 0 : postW;
                const clearWidth = actualPostSpacing - effectivePostW;
                const numPickets = vals.picketSpacing > 0 ? Math.floor((clearWidth - pickW) / vals.picketSpacing) : 0;
                const totalPickets = numPickets * numSpans;

                const topMark = getMark(vals.topRailType !== 'none');
                const postMark = getMark(!noPosts && vals.postType !== 'none');
                const botMark = getMark(vals.botRailType !== 'none');
                const midMark = getMark(vals.midRailType !== 'none');
                const picketMark = getMark(vals.picketType !== 'none' && totalPickets > 0);
                const bpMark = getMark(vals.includeBasePlates === 'yes' && !noPosts);

                const rad = vals.slope * Math.PI / 180;
                const cos = Math.cos(rad);

                let preciseTopLen = vals.length;
                if (cos > 0.001) preciseTopLen = vals.length / cos;
                let preciseBotLen = vals.length;
                if (!noPosts) preciseBotLen = vals.length - postW * numPosts;
                if (cos > 0.001) preciseBotLen = preciseBotLen / cos;
                let preciseMidLen = vals.length;
                if (!noPosts) preciseMidLen = vals.length - postW * numPosts;
                if (cos > 0.001) preciseMidLen = preciseMidLen / cos;

                if (topMark) {
                    const sizeName = vals.topRailSize === 'CUSTOM' ? `HSS ${vals.topRailH}x${vals.topRailH}` : vals.topRailSize;
                    bomItems.push({ mark: topMark, remark: "TOP RAIL", desc: sizeName, qty: 1, len: formatFraction(preciseTopLen) });
                }
                if (postMark) {
                    const sizeName = vals.postSize === 'CUSTOM' ? `HSS ${vals.postW}x${vals.postW}` : vals.postSize;
                    bomItems.push({ mark: postMark, remark: "POST", desc: sizeName, qty: numPosts, len: formatFraction(vals.postHeight) });
                }
                if (botMark) {
                    const sizeName = vals.botRailSize === 'CUSTOM' ? `HSS ${vals.botRailH}x${vals.botRailH}` : vals.botRailSize;
                    bomItems.push({ mark: botMark, remark: "BOTTOM RAIL", desc: sizeName, qty: 1, len: formatFraction(preciseBotLen) });
                }
                if (midMark) {
                    const sizeName = vals.midRailSize === 'CUSTOM' ? `HSS ${vals.midRailH}x${vals.midRailH}` : vals.midRailSize;
                    bomItems.push({ mark: midMark, remark: "MID RAIL", desc: sizeName, qty: 1, len: formatFraction(preciseMidLen) });
                }
                if (picketMark) {
                    const sizeName = vals.picketSize === 'CUSTOM' ? `HSS ${vals.picketW}x${vals.picketW}` : vals.picketSize;
                    const botY = noPosts ? 4.0 : (vals.postHeight - vals.topGap - vals.fenceHeight);
                    const topY = noPosts ? (4.0 + vals.fenceHeight - topH) : (vals.postHeight - vals.topGap - topH);
                    const picketY = (vals.botRailType === 'none') ? (botY + 4) : (botY + botH);
                    const picketTopY = (vals.midRailType !== 'none') ? (topY - midRailGap - midH) : topY;
                    const picketH = picketTopY - picketY;
                    bomItems.push({ mark: picketMark, remark: "PICKET", desc: sizeName, qty: totalPickets, len: formatFraction(picketH) });
                }
                if (bpMark) {
                    const bpW = vals.basePlateW || 6.0;
                    const bpL = vals.basePlateL || 6.0;
                    bomItems.push({ mark: bpMark, remark: "BASE PLATE", desc: `${bpW}x${bpL} Plate`, qty: numPosts, len: `${bpW}x${bpL}x${vals.basePlateT || 0.5}"` });
                }
            } else if (cat === 'plate') {
                const shapes = SHAPES_DB['plate'] || [];
                const selectedSizeId = document.getElementById('shape-size')?.value || 'PL1/2';
                const selectedPlate = shapes.find(s => s.id === selectedSizeId) || { t: 0.5, name: '1/2" PL' };
                const plateT = selectedPlate.t;
                
                let desc = "";
                let lenVal = `PL ${plateT}"`;
                
                if (vals.fabMethod === 'custom') {
                    let minX = 0, maxX = 0, minY = 0, maxY = 0;
                    customPlatePoints.forEach(p => {
                        if (p[0] < minX) minX = p[0];
                        if (p[0] > maxX) maxX = p[0];
                        if (p[1] < minY) minY = p[1];
                        if (p[1] > maxY) maxY = p[1];
                    });
                    const bboxW = maxX - minX;
                    const bboxH = maxY - minY;
                    desc = `Custom Plate ${formatFraction(bboxW)} x ${formatFraction(bboxH)} x ${plateT}"`;
                } else if (vals.fabMethod === 'bent') {
                    const devLen = CadEngine.calculatePlateDevelopedLength(vals.leg1, vals.leg2, plateT, vals.insideRadius, vals.bendAngle);
                    desc = `Bent Plate L1=${vals.leg1}" L2=${vals.leg2}" W=${vals.w}" x ${plateT}" BENT ${vals.bendAngle}° R=${vals.insideRadius}"`;
                    lenVal = formatFraction(devLen);
                } else {
                    desc = `${vals.w}" x ${vals.h}" x ${plateT}" Plate`;
                }
                
                bomItems.push({
                    mark: mainMarkCode,
                    remark: vals.fabMethod === 'bent' ? "BENT PLATE" : (vals.fabMethod === 'custom' ? "CUSTOM PLATE" : "PLATE"),
                    desc: desc,
                    qty: 1,
                    len: lenVal
                });
            }
        }
        
        if (bomItems.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="padding: 10px; text-align: center; color: var(--text-dim);">No piece marks detected for current configuration</td></tr>`;
            return;
        }

        bomItems.forEach(item => {
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
            tr.innerHTML = `
                <td style="padding: 6px 8px; font-family: 'JetBrains Mono', monospace; font-weight: bold; color: var(--accent-primary);">${item.mark}</td>
                <td style="padding: 6px 8px; font-weight: 500;">${item.remark}</td>
                <td style="padding: 6px 8px; color: var(--text-dim);">${item.desc}</td>
                <td style="padding: 6px 8px; text-align: center;">${item.qty}</td>
                <td style="padding: 6px 8px; text-align: right; font-weight: bold; font-family: 'JetBrains Mono', monospace; color: var(--accent-secondary);">${item.len}</td>
            `;
            tbody.appendChild(tr);
        });
    }


    function injectDragHandles(svg) {
        const cat = shapeCategory.value;
        const vals = {};
        
        dynamicInputs.querySelectorAll('input').forEach(inp => {
            const id = inp.id.replace('inp-', '');
            vals[id] = (inp.type === 'text') ? inp.value : (parseFloat(inp.value) || 0);
        });
        dynamicInputs.querySelectorAll('select').forEach(sel => {
            vals[sel.id.replace('inp-', '')] = sel.value;
        });

        // Helper to get true dimensions
        const getProfileDimension = (type, size, customVal) => {
            if (size === 'CUSTOM') return customVal;
            const shapes = SHAPES_DB[type] || [];
            const selected = shapes.find(s => s.id === size);
            if (selected) {
                if (type === 'hss_rect') return selected.h || selected.w || 0;
                if (type === 'hss_circ') return selected.d || 0;
                if (type === 'w_beam') return selected.d || 0;
                if (type === 'angles') return selected.leg2 || selected.leg1 || 0;
                if (type === 'plate') return selected.t || 0;
            }
            return customVal;
        };

        const getPicketDimension = (type, size, customVal) => {
            if (size === 'CUSTOM') return customVal;
            const shapes = SHAPES_DB[type] || [];
            const selected = shapes.find(s => s.id === size);
            if (selected) {
                if (type === 'hss_rect') return selected.w || 0;
                if (type === 'hss_circ') return selected.d || 0;
                if (type === 'w_beam') return selected.bf || 0;
                if (type === 'angles') return selected.leg1 || 0;
                if (type === 'plate') return selected.t || 0;
            }
            return customVal;
        };

        const isReady = CadEngine.isLibReady();
        const scale = getSvgScale(svg);
        const scaleFactor = scale / 25.4;
        let handles = [];
        
        if (cat === 'plate') {
            if (vals.fabMethod !== 'custom') {
                if (isReady) {
                    const w = vals.w * scale, h = vals.h * scale, ox = (vals.w/2 - vals.holeOffsetX) * scale, oy = (vals.h/2 - vals.holeOffsetY) * scale;
                    handles.push({ x: w/2, y: 0, name: 'plate-width', tooltip: 'Drag to adjust Width' });
                    handles.push({ x: 0, y: h/2, name: 'plate-height', tooltip: 'Drag to adjust Height' });
                    handles.push({ x: ox, y: oy, name: 'hole-offset', tooltip: 'Drag to adjust Hole Offsets' });
                } else {
                    const s = 10;
                    const sw = vals.w * s, sh = vals.h * s, offX = vals.holeOffsetX * s, offY = vals.holeOffsetY * s;
                    handles.push({ x: sw, y: sh/2, name: 'plate-width', tooltip: 'Drag to adjust Width' });
                    handles.push({ x: sw/2, y: sh, name: 'plate-height', tooltip: 'Drag to adjust Height' });
                    handles.push({ x: offX, y: offY, name: 'hole-offset', tooltip: 'Drag to adjust Hole Offsets' });
                }
            }
        } else if (cat === 'fence') {
            const topH = getProfileDimension(vals.topRailType, vals.topRailSize, vals.topRailH);
            const picketW = getPicketDimension(vals.picketType, vals.picketSize, vals.picketW);
            
            const rad = vals.slope * Math.PI / 180;
            const tan = Math.tan(rad);
            
            const safePostSpacing = Math.max(1.0, vals.postSpacing || 48.0);
            const numSpans = Math.max(1, Math.round(vals.length / safePostSpacing));
            const actualPostSpacing = vals.length / numSpans;
            
            if (isReady) {
                for (let i = 1; i < numSpans; i++) {
                    const px = i * actualPostSpacing * scale;
                    const py = px * tan;
                    handles.push({
                        x: px,
                        y: py + vals.fenceHeight * scale,
                        name: `fence-post-spacing-${i}`,
                        tooltip: `Drag Post ${i} to adjust Post Spacing`
                    });
                }
                handles.push({ x: vals.picketSpacing * scale, y: vals.fenceHeight * scale - 4 * scale, name: 'fence-picket-spacing', tooltip: 'Drag to adjust Picket Spacing' });
                handles.push({ x: 0, y: vals.fenceHeight * scale, name: 'fence-height', tooltip: 'Drag to adjust Height' });
                handles.push({ x: vals.length / 2 * scale, y: (vals.length / 2 * scale) * tan, name: 'fence-slope', tooltip: 'Drag to adjust Bottom Slope' });
            } else {
                const s = 4;
                const L = vals.length * s;
                const FH = vals.fenceHeight * s;
                const TG = (vals.topGap !== undefined ? vals.topGap : 2.0) * s;
                const PH = vals.postHeight * s;
                const rise = vals.length * tan;
                const maxRise = Math.max(0, rise);
                const groundY = FH + TG + maxRise * s + 50;
                
                for (let i = 1; i < numSpans; i++) {
                    const px = i * actualPostSpacing * s;
                    const pyBase = i * actualPostSpacing * tan * s;
                    const postY = groundY - pyBase - (FH + TG);
                    handles.push({
                        x: px,
                        y: postY,
                        name: `fence-post-spacing-${i}`,
                        tooltip: `Drag Post ${i} to adjust Post Spacing`
                    });
                }
                
                const picketX = vals.picketSpacing * s;
                const pyBasePicket = vals.picketSpacing * tan * s;
                const picketY = groundY - pyBasePicket - FH;
 
                handles.push({ x: picketX, y: picketY, name: 'fence-picket-spacing', tooltip: 'Drag to adjust Picket Spacing' });
                handles.push({ x: 10, y: groundY - FH, name: 'fence-height', tooltip: 'Drag to adjust Height' });
                handles.push({ x: L / 2, y: groundY - (vals.length / 2) * tan * s, name: 'fence-slope', tooltip: 'Drag to adjust Bottom Slope' });
            }
        } else if (cat === 'rails_gates') {
            const topH = getProfileDimension(vals.topRailType, vals.topRailSize, vals.topRailH);
            const picketW = getPicketDimension(vals.picketType, vals.picketSize, vals.picketW);
            
            const rad = vals.slope * Math.PI / 180;
            const tan = Math.tan(rad);
            
            const midPostCount = parseInt(vals.midPostCount) || 0;
            const leftPostW = getPicketDimension(vals.leftPostType, vals.leftPostSize, vals.leftPostW);
            const rightPostW = getPicketDimension(vals.rightPostType, vals.rightPostSize, vals.rightPostW);
            const midPostW = getPicketDimension(vals.midPostType, vals.midPostSize, vals.midPostW);

            if (isReady) {
                if (midPostCount > 0) {
                    const centerDist = vals.length - leftPostW/2 - rightPostW/2;
                    const spanSpacing = centerDist / (midPostCount + 1);
                    for (let i = 1; i <= midPostCount; i++) {
                        const px = (leftPostW/2 + i * spanSpacing) * scale;
                        const py = px * tan;
                        handles.push({
                            x: px,
                            y: py + vals.fenceHeight * scale,
                            name: `rails-midpost-${i}`,
                            tooltip: `Mid Post ${i} Position`
                        });
                    }
                }
                handles.push({ x: vals.picketSpacing * scale, y: vals.fenceHeight * scale - 4 * scale, name: 'fence-picket-spacing', tooltip: 'Drag to adjust Picket Spacing' });
                handles.push({ x: 0, y: vals.fenceHeight * scale, name: 'fence-height', tooltip: 'Drag to adjust Height' });
                handles.push({ x: vals.length / 2 * scale, y: (vals.length / 2 * scale) * tan, name: 'fence-slope', tooltip: 'Drag to adjust Bottom Slope' });
            } else {
                const s = 4;
                const L = vals.length * s;
                const FH = vals.fenceHeight * s;
                const PH = vals.postHeight * s;
                const rise = vals.length * tan;
                const maxRise = Math.max(0, rise);
                const groundY = FH + maxRise * s + 50;
                
                if (midPostCount > 0) {
                    const centerDist = L - (leftPostW * s)/2 - (rightPostW * s)/2;
                    const spanSpacing = centerDist / (midPostCount + 1);
                    for (let i = 1; i <= midPostCount; i++) {
                        const px = (leftPostW * s)/2 + i * spanSpacing;
                        const pyBase = px * tan;
                        const postY = groundY - pyBase - FH;
                        handles.push({
                            x: px,
                            y: postY,
                            name: `rails-midpost-${i}`,
                            tooltip: `Mid Post ${i} Position`
                        });
                    }
                }
                
                const picketX = vals.picketSpacing * s;
                const pyBasePicket = vals.picketSpacing * tan * s;
                const picketY = groundY - pyBasePicket - FH;
 
                handles.push({ x: picketX, y: picketY, name: 'fence-picket-spacing', tooltip: 'Drag to adjust Picket Spacing' });
                handles.push({ x: 10, y: groundY - FH, name: 'fence-height', tooltip: 'Drag to adjust Height' });
                handles.push({ x: L / 2, y: groundY - (vals.length / 2) * tan * s, name: 'fence-slope', tooltip: 'Drag to adjust Bottom Slope' });
            }
        } else if (cat === 'hss_rect') {
            if (isReady) {
                handles.push({ x: vals.w/2 * scale, y: 0, name: 'hss-width', tooltip: 'Drag to adjust Width' });
                handles.push({ x: 0, y: vals.h/2 * scale, name: 'hss-height', tooltip: 'Drag to adjust Height' });
            } else {
                const s = 10;
                handles.push({ x: vals.w * s, y: vals.h * s / 2, name: 'hss-width', tooltip: 'Drag to adjust Width' });
                handles.push({ x: vals.w * s / 2, y: vals.h * s, name: 'hss-height', tooltip: 'Drag to adjust Height' });
            }
        } else if (cat === 'hss_circ') {
            if (isReady) {
                handles.push({ x: vals.d/2 * scale, y: 0, name: 'hss-circ-diameter', tooltip: 'Drag to adjust Diameter' });
            } else {
                const s = 10;
                handles.push({ x: vals.d * s, y: vals.d * s / 2, name: 'hss-circ-diameter', tooltip: 'Drag to adjust Diameter' });
            }
        }
        
        const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
        g.setAttribute("class", "drag-handles-group");
        
        const extents = getModelExtents();
        
        handles.forEach(h => {
            const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            if (isReady) {
                const [cx_svg, cy_svg] = cadToSvg(h.x, h.y, scale, extents);
                circle.setAttribute("cx", cx_svg);
                circle.setAttribute("cy", cy_svg);
                circle.setAttribute("r", 5 * scaleFactor);
                circle.setAttribute("stroke-width", 1.5 * scaleFactor);
            } else {
                circle.setAttribute("cx", h.x);
                circle.setAttribute("cy", h.y);
                circle.setAttribute("r", 8);
                circle.setAttribute("stroke-width", 2);
            }
            circle.setAttribute("fill", "#ffaa00");
            circle.setAttribute("stroke", "#ffffff");
            circle.setAttribute("class", "drag-handle");
            circle.setAttribute("data-handle", h.name);
            circle.setAttribute("style", "cursor: move; filter: drop-shadow(0 0 6px #ffaa00);");
            
            const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
            title.textContent = h.tooltip;
            circle.appendChild(title);
            
            g.appendChild(circle);
        });
        
        svg.appendChild(g);
    }

    let isDragging = false;
    let activeHandle = null;
    
    svgContainer.addEventListener('mousedown', (e) => {
        const gripTarget = e.target.closest('.annot-grip-draggable');
        if (gripTarget) {
            const rawIdx = gripTarget.getAttribute('data-grip-dim-idx');
            activeDraggedGripIdx = isNaN(rawIdx) ? rawIdx : parseInt(rawIdx);
            activeDraggedGripName = gripTarget.getAttribute('data-grip-name');
            dragStartMousePos = { x: e.clientX, y: e.clientY };
            
            // Set selectedAnnotId based on grip point selection
            if (typeof activeDraggedGripIdx === 'string' && activeDraggedGripIdx.startsWith('leader-')) {
                selectedAnnotId = activeDraggedGripIdx;
            } else if (typeof activeDraggedGripIdx === 'string' && activeDraggedGripIdx.startsWith('dim-')) {
                selectedAnnotId = activeDraggedGripIdx;
            } else if (typeof activeDraggedGripIdx === 'number') {
                selectedAnnotId = `custom-dim-${activeDraggedGripIdx}`;
            }
            updateAnnotToolbar();
            if (currentMode === 'shapes') {
                renderCurrentCAD();
            } else if (currentMode === 'draft') {
                renderDraftSpace();
            }
            
            const svgElement = svgContainer.querySelector('svg');
            if (svgElement) {
                const pt = svgElement.createSVGPoint();
                pt.x = e.clientX;
                pt.y = e.clientY;
                const svgPt = pt.matrixTransform(svgElement.getScreenCTM().inverse());
                const scale = getSvgScale(svgElement);
                const extents = getModelExtents();
                const [mouseCadX, mouseCadY] = svgToCad(svgPt.x, svgPt.y, scale, extents);
                dragStartMouseCadPos = { x: mouseCadX, y: mouseCadY };
                
                if (activeDraggedGripName === 'leader-target') {
                    const leaderId = activeDraggedGripIdx;
                    if (!annotationOffsets[leaderId]) {
                        annotationOffsets[leaderId] = { dx: 0, dy: 0, tdx: 0, tdy: 0 };
                    }
                    const off = annotationOffsets[leaderId];
                    dragStartOffset = { tdx: off.tdx || 0, tdy: off.tdy || 0 };
                }
            }
            e.preventDefault();
            e.stopPropagation();
            return;
        }

        const dragTarget = e.target.closest('.annot-text-draggable');
        if (dragTarget) {
            activeDraggedAnnotId = dragTarget.getAttribute('data-annot-id');
            activeDraggedAnnotType = dragTarget.getAttribute('data-annot-type');
            activeDraggedAnnotAxis = dragTarget.getAttribute('data-axis') || 'Y';
            dragStartMousePos = { x: e.clientX, y: e.clientY };
            
            selectedAnnotId = activeDraggedAnnotId;
            updateAnnotToolbar();
            if (currentMode === 'shapes') {
                renderCurrentCAD();
            } else if (currentMode === 'draft') {
                renderDraftSpace();
            }
            
            if (activeDraggedAnnotType === 'dimension') {
                dragStartOffset = annotationOffsets[activeDraggedAnnotId] !== undefined ? annotationOffsets[activeDraggedAnnotId] : 0;
            } else if (activeDraggedAnnotType === 'leader') {
                const off = annotationOffsets[activeDraggedAnnotId];
                if (off) {
                    dragStartOffset = { dx: off.dx, dy: off.dy };
                } else {
                    const defaultLeaderOffsets = {
                        "leader-top-rail": { dx: 0, dy: 12 / 25.4 },
                        "leader-bot-rail": { dx: 0, dy: -12 / 25.4 },
                        "leader-left-post": { dx: 0, dy: 10 / 25.4 },
                        "leader-right-post": { dx: 0, dy: -12 / 25.4 },
                        "leader-mid-post": { dx: 0, dy: 10 / 25.4 },
                        "leader-mid-rail": { dx: 0, dy: -10 / 25.4 },
                        "leader-pickets": { dx: 0, dy: 10 / 25.4 },
                        "leader-kickplate": { dx: 0, dy: -10 / 25.4 },
                        "leader-post": { dx: 0, dy: 10 / 25.4 }
                    };
                    const defOff = defaultLeaderOffsets[activeDraggedAnnotId] || { dx: 0, dy: 0 };
                    dragStartOffset = { dx: defOff.dx, dy: defOff.dy };
                }
            } else {
                dragStartOffset = null;
            }
            
            e.preventDefault();
            e.stopPropagation();
            return;
        }

        // Deselect if clicking on empty space
        if (!e.target.closest('.drag-handle') && !e.target.closest('.drag-handles-group')) {
            if (selectedAnnotId !== null) {
                selectedAnnotId = null;
                updateAnnotToolbar();
                if (currentMode === 'shapes') {
                    renderCurrentCAD();
                } else if (currentMode === 'draft') {
                    renderDraftSpace();
                }
            }
        }

        const isMiddleButton = e.button === 1;
        if (panModeActive || isMiddleButton) {
            isPanning = true;
            panDelta = 0;
            panStartX = e.clientX - currentPanX;
            panStartY = e.clientY - currentPanY;
            svgContainer.style.cursor = 'grabbing';
            e.preventDefault();
            return;
        }

        if (currentMode === 'draft') {
            const tgtTag = e.target.tagName;
            const tgtId = e.target.id || "";
            const tgtClass = e.target.getAttribute('class') || "";
            logVisual(`Mousedown on: <${tgtTag}> (id: "${tgtId}", class: "${tgtClass}")`, "info");
            
            const memberId = findDraftMemberFromElement(e.target);
            logVisual(`Detected group key via robust traversal, extracted memberId: "${memberId}"`, "info");
            
            if (memberId) {
                selectedMemberId = memberId;
                justSelectedInMousedown = true;
                openDraftMemberEditor(memberId);
                logVisual(`SUCCESS: Selected member "${memberId}"`, "success");
                
                const m = draftMembers.find(item => item.id === memberId);
                if (m) {
                    isDraggingDraftMember = true;
                    
                    const svgElement = svgContainer.querySelector('svg');
                    if (svgElement) {
                        cachedDragViewBox = svgElement.getAttribute('viewBox');
                        
                        const pt = svgElement.createSVGPoint();
                        pt.x = e.clientX;
                        pt.y = e.clientY;
                        const svgPt = pt.matrixTransform(svgElement.getScreenCTM().inverse());
                        
                        const scale = getSvgScale(svgElement);
                        dragStartMouseX = svgPt.x / scale;
                        dragStartMouseY = -svgPt.y / scale;
                        
                        dragStartMemberOrigin = [m.origin[0], m.origin[1]];
                    }
                    
                    renderDraftSpace();
                    e.preventDefault();
                }
            }
            return;
        }

        const handle = e.target.closest('.drag-handle');
        if (handle) {
            isDragging = true;
            activeHandle = handle.getAttribute('data-handle');
            e.preventDefault();
        }
    });

    svgContainer.addEventListener('mousemove', (e) => {
        if (activeDraggedGripIdx !== null) {
            const svgElement = svgContainer.querySelector('svg');
            if (svgElement) {
                const pt = svgElement.createSVGPoint();
                pt.x = e.clientX;
                pt.y = e.clientY;
                const svgPt = pt.matrixTransform(svgElement.getScreenCTM().inverse());
                const scale = getSvgScale(svgElement);
                const extents = getModelExtents();
                const [mouseCadX, mouseCadY] = svgToCad(svgPt.x, svgPt.y, scale, extents);
                
                if (cachedSnapPoints.length === 0 && currentModel) {
                    cachedSnapPoints = getModelSnapPoints(currentModel);
                }
                
                const svgRect = svgElement.getBoundingClientRect();
                const viewBoxAttr = svgElement.getAttribute('viewBox');
                const vb = viewBoxAttr ? viewBoxAttr.split(/[\s,]+/).map(Number) : [0,0,2000,1500];
                const vbWidth = vb[2] || 2000;
                const screenToSvgScale = svgRect.width > 0 ? (vbWidth / svgRect.width) : 1;
                const threshold = 15 * screenToSvgScale;
                
                let closestSnap = null;
                let minDist = threshold;
                cachedSnapPoints.forEach(p => {
                    const [sx, sy] = cadToSvg(p.x, p.y, scale, extents);
                    const d = Math.hypot(sx - svgPt.x, sy - svgPt.y);
                    if (d < minDist) {
                        minDist = d;
                        closestSnap = p;
                    }
                });
                
                const dim = customDimensionsList[activeDraggedGripIdx];
                if (dim) {
                    if (activeDraggedGripName === 'p1') {
                        if (closestSnap) {
                            dim.cx1 = closestSnap.x;
                            dim.cy1 = closestSnap.y;
                        } else {
                            dim.cx1 = mouseCadX;
                            dim.cy1 = mouseCadY;
                        }
                    } else if (activeDraggedGripName === 'p2') {
                        if (closestSnap) {
                            dim.cx2 = closestSnap.x;
                            dim.cy2 = closestSnap.y;
                        } else {
                            dim.cx2 = mouseCadX;
                            dim.cy2 = mouseCadY;
                        }
                    } else if (activeDraggedGripName === 'd1' || activeDraggedGripName === 'd2') {
                        const dx = dim.cx2 - dim.cx1;
                        const dy = dim.cy2 - dim.cy1;
                        const len = Math.hypot(dx, dy);
                        if (len > 0.001) {
                            const nx = -dy / len;
                            const ny = dx / len;
                            const offset = (mouseCadX - dim.cx1) * nx + (mouseCadY - dim.cy1) * ny;
                            dim.cdx1 = dim.cx1 + nx * offset;
                            dim.cdy1 = dim.cy1 + ny * offset;
                            dim.cdx2 = dim.cx2 + nx * offset;
                            dim.cdy2 = dim.cy2 + ny * offset;
                        } else {
                            dim.cdx1 = mouseCadX;
                            dim.cdy1 = mouseCadY;
                            dim.cdx2 = mouseCadX;
                            dim.cdy2 = mouseCadY;
                        }
                    }
                } else if (activeDraggedGripName === 'leader-target') {
                    const leaderId = activeDraggedGripIdx;
                    if (!annotationOffsets[leaderId]) {
                        annotationOffsets[leaderId] = { dx: 0, dy: 0, tdx: 0, tdy: 0 };
                    }
                    const targetX = closestSnap ? closestSnap.x : mouseCadX;
                    const targetY = closestSnap ? closestSnap.y : mouseCadY;
                    if (dragStartMouseCadPos) {
                        const deltaX = targetX - dragStartMouseCadPos.x;
                        const deltaY = targetY - dragStartMouseCadPos.y;
                        annotationOffsets[leaderId].tdx = (dragStartOffset.tdx || 0) + deltaX;
                        annotationOffsets[leaderId].tdy = (dragStartOffset.tdy || 0) + deltaY;
                    }
                }
                
                activeSnapPoint = closestSnap;
                renderSnapIndicator(svgElement, activeSnapPoint, scale);
                
                if (currentMode === 'shapes') {
                    renderCurrentCAD();
                } else if (currentMode === 'draft') {
                    renderDraftSpace();
                }
            }
            e.preventDefault();
            return;
        }

        if (activeDraggedAnnotId) {
            const svgElement = svgContainer.querySelector('svg');
            if (svgElement) {
                const pt1 = svgElement.createSVGPoint();
                pt1.x = dragStartMousePos.x;
                pt1.y = dragStartMousePos.y;
                const cadPt1 = pt1.matrixTransform(svgElement.getScreenCTM().inverse());
                
                const pt2 = svgElement.createSVGPoint();
                pt2.x = e.clientX;
                pt2.y = e.clientY;
                const cadPt2 = pt2.matrixTransform(svgElement.getScreenCTM().inverse());
                
                const scale = getSvgScale(svgElement);
                const deltaX = (cadPt2.x - cadPt1.x) / scale;
                const deltaY = -(cadPt2.y - cadPt1.y) / scale;
                
                if (activeDraggedAnnotType === 'dimension') {
                    if (activeDraggedAnnotAxis === 'Y') {
                        annotationOffsets[activeDraggedAnnotId] = dragStartOffset + deltaY;
                    } else {
                        annotationOffsets[activeDraggedAnnotId] = dragStartOffset + deltaX;
                    }
                } else if (activeDraggedAnnotType === 'leader') {
                    annotationOffsets[activeDraggedAnnotId] = {
                        dx: dragStartOffset.dx + deltaX,
                        dy: dragStartOffset.dy + deltaY
                    };
                } else if (activeDraggedAnnotType === 'custom') {
                    const idx = parseInt(activeDraggedAnnotId.replace('custom-dim-', ''));
                    if (customDimensionsList[idx]) {
                        customDimensionsList[idx].cdx1 += deltaX;
                        customDimensionsList[idx].cdy1 += deltaY;
                        customDimensionsList[idx].cdx2 += deltaX;
                        customDimensionsList[idx].cdy2 += deltaY;
                    }
                }
                
                dragStartMousePos = { x: e.clientX, y: e.clientY };
                if (activeDraggedAnnotType === 'dimension') {
                    dragStartOffset = annotationOffsets[activeDraggedAnnotId];
                } else if (activeDraggedAnnotType === 'leader') {
                    dragStartOffset = { dx: annotationOffsets[activeDraggedAnnotId].dx, dy: annotationOffsets[activeDraggedAnnotId].dy };
                }
                
                if (currentMode === 'shapes') {
                    renderCurrentCAD();
                } else if (currentMode === 'draft') {
                    renderDraftSpace();
                }
            }
            e.preventDefault();
            return;
        }

        if (isPanning) {
            currentPanX = e.clientX - panStartX;
            currentPanY = e.clientY - panStartY;
            panDelta += Math.abs(e.movementX) + Math.abs(e.movementY);
            applyZoom();
            e.preventDefault();
            return;
        }

        if (autocadDimModeActive) {
            const svgElement = svgContainer.querySelector('svg');
            if (svgElement) {
                const pt = svgElement.createSVGPoint();
                pt.x = e.clientX;
                pt.y = e.clientY;
                const svgPt = pt.matrixTransform(svgElement.getScreenCTM().inverse());
                const scale = getSvgScale(svgElement);
                const extents = getModelExtents();
                const [mouseCadX, mouseCadY] = svgToCad(svgPt.x, svgPt.y, scale, extents);
                
                if (cachedSnapPoints.length === 0 && currentModel) {
                    cachedSnapPoints = getModelSnapPoints(currentModel);
                }
                
                const svgRect = svgElement.getBoundingClientRect();
                const viewBoxAttr = svgElement.getAttribute('viewBox');
                const vb = viewBoxAttr ? viewBoxAttr.split(/[\s,]+/).map(Number) : [0,0,2000,1500];
                const vbWidth = vb[2] || 2000;
                const screenToSvgScale = svgRect.width > 0 ? (vbWidth / svgRect.width) : 1;
                const threshold = 15 * screenToSvgScale;
                
                let closestSnap = null;
                let minDist = threshold;
                
                cachedSnapPoints.forEach(p => {
                    const [sx, sy] = cadToSvg(p.x, p.y, scale, extents);
                    const d = Math.hypot(sx - svgPt.x, sy - svgPt.y);
                    if (d < minDist) {
                        minDist = d;
                        closestSnap = p;
                    }
                });
                
                activeSnapPoint = closestSnap;
                
                renderSnapIndicator(svgElement, activeSnapPoint, scale);
                
                if (dimStartPoint) {
                    const targetX = activeSnapPoint ? activeSnapPoint.x : mouseCadX;
                    const targetY = activeSnapPoint ? activeSnapPoint.y : mouseCadY;
                    renderTempDimensionLine(svgElement, dimStartPoint, targetX, targetY, scale);
                }
            }
            return;
        }

        if (currentMode === 'draft' && isDraggingDraftMember && selectedMemberId) {
            const svgElement = svgContainer.querySelector('svg');
            if (!svgElement) return;
            
            const m = draftMembers.find(item => item.id === selectedMemberId);
            if (!m) return;
            
            const pt = svgElement.createSVGPoint();
            pt.x = e.clientX;
            pt.y = e.clientY;
            const svgPt = pt.matrixTransform(svgElement.getScreenCTM().inverse());
            
            const scale = getSvgScale(svgElement);
            const currentMouseX = svgPt.x / scale;
            const currentMouseY = -svgPt.y / scale;
            
            const dx = currentMouseX - dragStartMouseX;
            const dy = currentMouseY - dragStartMouseY;
            
            const newX = dragStartMemberOrigin[0] + dx;
            const newY = dragStartMemberOrigin[1] + dy;
            
            m.origin[0] = newX;
            m.origin[1] = newY;
            
            document.getElementById('draft-pos-x').value = newX.toFixed(2);
            document.getElementById('draft-pos-y').value = newY.toFixed(2);
            
            renderDraftSpace();
            
            const newSvgElement = svgContainer.querySelector('svg');
            if (newSvgElement) {
                drawDisplacementGuideline(newSvgElement, dragStartMemberOrigin, m.origin);
            }
            
            e.preventDefault();
            return;
        }

        if (!isDragging || !activeHandle) return;
        
        const svgElement = svgContainer.querySelector('svg');
        if (!svgElement) return;
        
        const pt = svgElement.createSVGPoint();
        pt.x = e.clientX;
        pt.y = e.clientY;
        const svgPt = pt.matrixTransform(svgElement.getScreenCTM().inverse());
        
        const isReady = CadEngine.isLibReady();
        const cat = shapeCategory.value;
        const scale = getSvgScale(svgElement);
        
        const vals = {};
        dynamicInputs.querySelectorAll('input').forEach(inp => {
            const id = inp.id.replace('inp-', '');
            vals[id] = (inp.type === 'text') ? inp.value : (parseFloat(inp.value) || 0);
        });
        dynamicInputs.querySelectorAll('select').forEach(sel => {
            vals[sel.id.replace('inp-', '')] = sel.value;
        });
        
        const extents = getModelExtents();
        const [cadMouseX, cadMouseY] = svgToCad(svgPt.x, svgPt.y, scale, extents);
        
        let dx = isReady ? cadMouseX : svgPt.x / scale;
        let dy = isReady ? cadMouseY : svgPt.y / scale;
        
        let changesMade = false;
        
        const setVal = (id, value) => {
            const input = document.getElementById('inp-' + id);
            if (input) {
                input.value = value.toFixed(2);
                changesMade = true;
                input.dispatchEvent(new Event('change'));
            }
        };

        if (cat === 'plate') {
            if (isReady) {
                if (activeHandle === 'plate-width') {
                    setVal('w', Math.max(2.0, Math.abs(dx) * 2));
                } else if (activeHandle === 'plate-height') {
                    setVal('h', Math.max(2.0, Math.abs(dy) * 2));
                } else if (activeHandle === 'hole-offset') {
                    const w = parseFloat(document.getElementById('inp-w').value) || 12;
                    const h = parseFloat(document.getElementById('inp-h').value) || 12;
                    setVal('holeOffsetX', Math.max(0.5, w/2 - Math.abs(dx)));
                    setVal('holeOffsetY', Math.max(0.5, h/2 - Math.abs(dy)));
                }
            } else {
                const s = 10;
                if (activeHandle === 'plate-width') {
                    setVal('w', Math.max(2.0, svgPt.x / s));
                } else if (activeHandle === 'plate-height') {
                    setVal('h', Math.max(2.0, svgPt.y / s));
                } else if (activeHandle === 'hole-offset') {
                    setVal('holeOffsetX', Math.max(0.5, svgPt.x / s));
                    setVal('holeOffsetY', Math.max(0.5, svgPt.y / s));
                }
            }
        } else if (cat === 'fence' || cat === 'rails_gates') {
            const s = 4;
            const tan = Math.tan(parseFloat(document.getElementById('inp-slope').value || 0) * Math.PI / 180);
            
            const leftPostW = getPicketDimension(vals.leftPostType, vals.leftPostSize, vals.leftPostW || 1.5);
            const rightPostW = getPicketDimension(vals.rightPostType, vals.rightPostSize, vals.rightPostW || 1.5);
            const midPostCount = parseInt(vals.midPostCount) || 0;
            
            if (isReady) {
                if (activeHandle.startsWith('fence-post-spacing-')) {
                    const postIndex = parseInt(activeHandle.replace('fence-post-spacing-', ''));
                    setVal('postSpacing', Math.max(12.0, dx / postIndex));
                } else if (activeHandle.startsWith('rails-midpost-')) {
                    const postIndex = parseInt(activeHandle.replace('rails-midpost-', ''));
                    const spanSpacing = (dx - leftPostW/2) / postIndex;
                    setVal('length', Math.max(12.0, leftPostW/2 + rightPostW/2 + (midPostCount + 1) * spanSpacing));
                } else if (activeHandle === 'fence-picket-spacing') {
                    setVal('picketSpacing', Math.max(1.0, dx));
                } else if (activeHandle === 'fence-height') {
                    const newHeight = Math.max(24.0, dy);
                    setVal('fenceHeight', newHeight);
                    const topGapVal = safeGetFloat('inp-topGap', 0.0);
                    setVal('postHeight', newHeight + topGapVal + 8.0);
                } else if (activeHandle === 'fence-slope') {
                    const angleRad = Math.atan2(dy, dx);
                    const slopeDeg = Math.max(0, Math.min(30, Math.round(angleRad * 180 / Math.PI)));
                    setVal('slope', slopeDeg);
                }
            } else {
                if (activeHandle.startsWith('fence-post-spacing-')) {
                    const postIndex = parseInt(activeHandle.replace('fence-post-spacing-', ''));
                    setVal('postSpacing', Math.max(12.0, (svgPt.x / s) / postIndex));
                } else if (activeHandle === 'fence-picket-spacing') {
                    setVal('picketSpacing', Math.max(1.0, svgPt.x / s));
                } else if (activeHandle === 'fence-height') {
                    const L = (parseFloat(document.getElementById('inp-length').value) || 120) * s;
                    const rise = L * tan;
                    const maxRise = Math.max(0, rise);
                    const topGapVal = safeGetFloat('inp-topGap', 0.0);
                    const TG = topGapVal * s;
                    const groundY = (parseFloat(document.getElementById('inp-fenceHeight').value || 72) * s) + TG + maxRise + 50;
                    const newHeight = Math.max(24.0, (groundY - svgPt.y) / s);
                    setVal('fenceHeight', newHeight);
                    setVal('postHeight', newHeight + topGapVal + 8.0);
                } else if (activeHandle === 'fence-slope') {
                    const L = (parseFloat(document.getElementById('inp-length').value) || 120) * s;
                    const maxRise = Math.max(0, L * tan);
                    const topGapVal = safeGetFloat('inp-topGap', 0.0);
                    const TG = topGapVal * s;
                    const groundY = (parseFloat(document.getElementById('inp-fenceHeight').value || 72) * s) + TG + maxRise + 50;
                    const dy = groundY - svgPt.y;
                    const dx = svgPt.x;
                    const angleRad = Math.atan2(dy, dx);
                    const slopeDeg = Math.max(0, Math.min(30, Math.round(angleRad * 180 / Math.PI)));
                    setVal('slope', slopeDeg);
                }
            }
        } else if (cat === 'hss_rect') {
            if (isReady) {
                if (activeHandle === 'hss-width') {
                    setVal('w', Math.max(1.0, Math.abs(dx) * 2));
                } else if (activeHandle === 'hss-height') {
                    setVal('h', Math.max(1.0, Math.abs(dy) * 2));
                }
            } else {
                const s = 10;
                if (activeHandle === 'hss-width') {
                    setVal('w', Math.max(1.0, svgPt.x / s));
                } else if (activeHandle === 'hss-height') {
                    setVal('h', Math.max(1.0, svgPt.y / s));
                }
            }
        } else if (cat === 'hss_circ') {
            if (isReady) {
                if (activeHandle === 'hss-circ-diameter') {
                    setVal('d', Math.max(1.0, Math.abs(dx) * 2));
                }
            } else {
                const s = 10;
                if (activeHandle === 'hss-circ-diameter') {
                    setVal('d', Math.max(1.0, svgPt.x / s));
                }
            }
        }
        
        if (changesMade) {
            renderCurrentCAD();
        }
    });

    window.addEventListener('mouseup', () => {
        activeDraggedGripIdx = null;
        activeDraggedGripName = null;
        activeDraggedAnnotId = null;
        activeDraggedAnnotType = null;
        dragStartMousePos = null;
        dragStartMouseCadPos = null;
        dragStartOffset = null;
        if (isPanning) {
            isPanning = false;
            svgContainer.style.cursor = panModeActive ? 'grab' : '';
        }
        if (isDraggingDraftMember) {
            isDraggingDraftMember = false;
            cachedDragViewBox = null;
            const svgElement = svgContainer.querySelector('svg');
            if (svgElement) {
                const gGuide = svgElement.querySelector('.draft-guidance-overlay');
                if (gGuide) gGuide.innerHTML = "";
            }
            renderDraftSpace();
        }
        isDragging = false;
        activeHandle = null;
    });

    // --- Draft Space Mode Logic & Handlers ---
      function renderDraftSpace() {
        if (currentMode !== 'draft') return;
        cachedSnapPoints = [];
        try {
            currentModel = CadEngine.createCompositeDraft(draftMembers);
            let svgString = CadEngine.renderSVG(currentModel);
            
            // Sync calculate bounding box without microscopic sizing for plates or section views
            let minX = Infinity;
            let maxX = -Infinity;
            let minY = Infinity;
            let maxY = -Infinity;
            
            draftMembers.forEach(m => {
                const x = m.origin[0];
                const y = m.origin[1];
                
                const isSection = m.viewType === 'section';
                const isPlate = m.type === 'plate';
                
                let shapeW = m.params.w || m.params.bf || m.params.d || m.params.leg1 || 4.0;
                let shapeH = m.params.h || m.params.d || m.params.leg2 || 4.0;
                
                if (!isPlate && !isSection) {
                    shapeW = m.length || 60.0;
                }
                
                const halfW = shapeW / 2;
                const halfH = shapeH / 2;
                const padding = 6.0; // 6 inches padding
                
                minX = Math.min(minX, x - halfW - padding);
                maxX = Math.max(maxX, x + halfW + padding);
                minY = Math.min(minY, y - halfH - padding);
                maxY = Math.max(maxY, y + halfH + padding);
            });
            
            if (draftMembers.length === 0) {
                minX = -30;
                maxX = 30;
                minY = -20;
                maxY = 20;
            } else {
                const midX = (minX + maxX) / 2;
                const midY = (minY + maxY) / 2;
                const spanX = Math.max(30.0, maxX - minX);
                const spanY = Math.max(20.0, maxY - minY);
                minX = midX - spanX / 2;
                maxX = midX + spanX / 2;
                minY = midY - spanY / 2;
                maxY = midY + spanY / 2;
            }
            
            const scale = CadEngine.isLibReady() ? 25.4 : 10;
            const svgMinX = minX * scale;
            const svgMinY = -maxY * scale;
            const svgW = (maxX - minX) * scale;
            const svgH = (maxY - minY) * scale;
            
            const stableViewBox = `${svgMinX} ${svgMinY} ${svgW} ${svgH}`;
            
            if (isDraggingDraftMember && cachedDragViewBox) {
                svgString = svgString.replace(/viewBox="[^"]*"/, `viewBox="${cachedDragViewBox}"`);
            } else {
                svgString = svgString.replace(/viewBox="[^"]*"/, `viewBox="${stableViewBox}"`);
            }
            
            // Synchronously process elements in memory using DOMParser
            const parser = new DOMParser();
            const doc = parser.parseFromString(svgString, "image/svg+xml");
            const svgElement = doc.querySelector('svg');
            
            if (svgElement) {
                draftMembers.forEach(m => {
                    const sanitizedId = m.id.replace(/_/g, '-');
                    const numbers = m.id.match(/\d+/g);
                    
                    let g = null;
                    if (numbers && numbers.length >= 2) {
                        g = svgElement.querySelector(`g[id*="${numbers[0]}"][id*="${numbers[1]}"]`) ||
                            svgElement.querySelector(`g[class*="${numbers[0]}"][class*="${numbers[1]}"]`);
                    }
                    if (!g) {
                        g = svgElement.querySelector(`g[id="${m.id}"]`) || 
                            svgElement.querySelector(`g.${m.id}`) ||
                            svgElement.querySelector(`g[id="${sanitizedId}"]`) ||
                            svgElement.querySelector(`g.${sanitizedId}`);
                    }
                    if (!g) {
                        g = Array.from(svgElement.querySelectorAll('g')).find(el => {
                            const id = el.getAttribute('id') || "";
                            const cls = el.getAttribute('class') || "";
                            if (id === m.id || id === sanitizedId || 
                                cls === m.id || cls === sanitizedId ||
                                cls.split(' ').includes(m.id) || cls.split(' ').includes(sanitizedId)) {
                                return true;
                            }
                            if (numbers && numbers.length >= 2) {
                                if ((id.indexOf(numbers[0]) !== -1 && id.indexOf(numbers[1]) !== -1) ||
                                    (cls.indexOf(numbers[0]) !== -1 && cls.indexOf(numbers[1]) !== -1)) {
                                    return true;
                                }
                            }
                            return id.indexOf(m.id) !== -1 || 
                                   cls.indexOf(m.id) !== -1 ||
                                   id.indexOf(sanitizedId) !== -1 ||
                                   cls.indexOf(sanitizedId) !== -1;
                        });
                    }
                    
                    if (g) {
                        g.classList.add('draft-member');
                        g.setAttribute('data-member-id', m.id);
                        g.setAttribute('id', m.id);
                        g.setAttribute('style', 'cursor: pointer; pointer-events: auto !important;');
                        
                        // Inject transparent hitbox covering bounding box for easy selection/dragging
                        try {
                            let hitBoxX = 0, hitBoxY = 0, hitBoxW = 0, hitBoxH = 0;
                            let gotExtents = false;
                            
                            const mModel = currentModel && currentModel.models && (currentModel.models[m.id] || currentModel.models[sanitizedId]);
                            if (window.makerjs && mModel) {
                                try {
                                    const localModel = JSON.parse(JSON.stringify(mModel));
                                    localModel.origin = [0, 0];
                                    const extents = makerjs.measure.modelExtents(localModel);
                                    if (extents) {
                                        hitBoxW = (extents.high[0] - extents.low[0]) * scale + 4;
                                        hitBoxH = (extents.high[1] - extents.low[1]) * scale + 4;
                                        hitBoxX = extents.low[0] * scale - 2;
                                        hitBoxY = -extents.high[1] * scale - 2;
                                        gotExtents = true;
                                    }
                                } catch (e) {
                                    console.warn("MakerJS extents failed, falling back to analytic", e);
                                }
                            }
                            
                            if (!gotExtents) {
                                const isSection = m.viewType === 'section';
                                const isPlate = m.type === 'plate';
                                let wVal = m.params.w || m.params.bf || m.params.d || m.params.leg1 || 4.0;
                                let hVal = m.params.h || m.params.d || m.params.leg2 || 4.0;
                                if (!isPlate && !isSection) {
                                    wVal = m.length || 60.0;
                                }
                                hitBoxW = wVal * scale + 4;
                                hitBoxH = hVal * scale + 4;
                                hitBoxX = -hitBoxW / 2;
                                hitBoxY = -hitBoxH / 2;
                                gotExtents = true;
                            }
                            
                            if (gotExtents && hitBoxW > 0 && hitBoxH > 0) {
                                const hitBox = doc.createElementNS("http://www.w3.org/2000/svg", "rect");
                                hitBox.setAttribute("x", hitBoxX);
                                hitBox.setAttribute("y", hitBoxY);
                                hitBox.setAttribute("width", hitBoxW);
                                hitBox.setAttribute("height", hitBoxH);
                                hitBox.setAttribute("fill", "rgba(0, 212, 255, 0.001)");
                                hitBox.setAttribute("stroke", "none");
                                hitBox.setAttribute("class", "draft-member-hitbox");
                                hitBox.setAttribute("style", "pointer-events: all !important; cursor: pointer;");
                                g.insertBefore(hitBox, g.firstChild);
                            }
                        } catch (err) {
                            console.warn("Failed to generate clickable hitbox for member", m.id, err);
                        }
                        
                        if (m.id === selectedMemberId) {
                            g.setAttribute('stroke-dasharray', '2,2');
                            g.setAttribute('stroke', '#ffaa00');
                            g.querySelectorAll('[stroke]').forEach(p => {
                                p.setAttribute('stroke', '#ffaa00');
                                p.setAttribute('stroke-width', '2.5');
                            });
                        }
                    }
                });
                
                injectCalloutLabels(svgElement);
                
                const serializer = new XMLSerializer();
                svgString = serializer.serializeToString(svgElement);
            }
            
            svgContainer.innerHTML = svgString;
            applyZoom();
            updateDraftDimensionText();
            updateBOMPreview();
        } catch (e) {
            console.error("Draft Render Error:", e);
        }
    }

    function injectCalloutLabels(svg) {
        let gCallouts = svg.querySelector('.draft-callouts-overlay');
        if (!gCallouts) {
            gCallouts = svg.ownerDocument.createElementNS("http://www.w3.org/2000/svg", "g");
            gCallouts.setAttribute("class", "draft-callouts-overlay");
            svg.appendChild(gCallouts);
        } else {
            gCallouts.innerHTML = "";
        }
        
        draftMembers.forEach(m => {
            let labelText = m.label || "";
            if (!labelText && m.hasHoles) {
                labelText = `${m.holes.count}x Ø${m.holes.d}" Holes`;
                if (m.hasBolts) {
                    labelText += ` w/ Ø${m.bolts.d}"x${m.bolts.len}" Bolts`;
                }
            }
            
            if (!labelText) return;
            
            const scale = CadEngine.isLibReady() ? 25.4 : 10;
            const ox = m.origin[0] * scale;
            const memberEl = svg.querySelector(`g[id="${m.id}"]`);
            if (!memberEl) return;
            
            let cx = ox, cy = -m.origin[1] * scale;
            try {
                const bbox = memberEl.getBBox();
                cx = bbox.x + bbox.width / 2;
                cy = bbox.y + bbox.height / 2;
            } catch(e) {}
            
            const lx = cx + 50;
            const ly = cy - 40;
            
            const leader = svg.ownerDocument.createElementNS("http://www.w3.org/2000/svg", "path");
            leader.setAttribute("d", `M ${cx} ${cy} L ${lx - 10} ${ly}`);
            leader.setAttribute("stroke", "#ffaa00");
            leader.setAttribute("stroke-width", "0.75");
            leader.setAttribute("fill", "none");
            gCallouts.appendChild(leader);
            
            const dot = svg.ownerDocument.createElementNS("http://www.w3.org/2000/svg", "circle");
            dot.setAttribute("cx", cx);
            dot.setAttribute("cy", cy);
            dot.setAttribute("r", "2");
            dot.setAttribute("fill", "#ffaa00");
            gCallouts.appendChild(dot);
            
            const text = svg.ownerDocument.createElementNS("http://www.w3.org/2000/svg", "text");
            text.setAttribute("x", lx);
            text.setAttribute("y", ly + 4);
            text.setAttribute("fill", "#ffffff");
            text.setAttribute("font-family", "'JetBrains Mono', monospace");
            text.setAttribute("font-size", "10px");
            text.textContent = labelText;
            gCallouts.appendChild(text);
            
            const line = svg.ownerDocument.createElementNS("http://www.w3.org/2000/svg", "line");
            line.setAttribute("x1", lx - 10);
            line.setAttribute("y1", ly);
            line.setAttribute("x2", lx + labelText.length * 6);
            line.setAttribute("y2", ly);
            line.setAttribute("stroke", "#ffaa00");
            line.setAttribute("stroke-width", "1");
            gCallouts.appendChild(line);
        });
    }

    function drawDisplacementGuideline(svg, startOrigin, currentOrigin) {
        let gGuide = svg.querySelector('.draft-guidance-overlay');
        if (!gGuide) {
            gGuide = document.createElementNS("http://www.w3.org/2000/svg", "g");
            gGuide.setAttribute("class", "draft-guidance-overlay");
            
            let defs = svg.querySelector('defs');
            if (!defs) {
                defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
                svg.insertBefore(defs, svg.firstChild);
            }
            
            const marker = document.createElementNS("http://www.w3.org/2000/svg", "marker");
            marker.setAttribute("id", "orange-arrow");
            marker.setAttribute("viewBox", "0 0 10 10");
            marker.setAttribute("refX", "5");
            marker.setAttribute("refY", "5");
            marker.setAttribute("markerWidth", "6");
            marker.setAttribute("markerHeight", "6");
            marker.setAttribute("orient", "auto-start-reverse");
            
            const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
            path.setAttribute("d", "M 0 0 L 10 5 L 0 10 z");
            path.setAttribute("fill", "#ff8800");
            marker.appendChild(path);
            defs.appendChild(marker);
            
            svg.appendChild(gGuide);
        } else {
            gGuide.innerHTML = "";
        }
        
        const scale = CadEngine.isLibReady() ? 25.4 : 10;
        const x1 = startOrigin[0] * scale;
        const y1 = -startOrigin[1] * scale;
        const x2 = currentOrigin[0] * scale;
        const y2 = -currentOrigin[1] * scale;
        
        const dx = currentOrigin[0] - startOrigin[0];
        const dy = currentOrigin[1] - startOrigin[1];
        const dist = Math.sqrt(dx*dx + dy*dy);
        
        if (dist < 0.1) return;
        
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", x1);
        line.setAttribute("y1", y1);
        line.setAttribute("x2", x2);
        line.setAttribute("y2", y2);
        line.setAttribute("stroke", "#ff8800");
        line.setAttribute("stroke-width", "1.5");
        line.setAttribute("stroke-dasharray", "4,4");
        line.setAttribute("marker-start", "url(#orange-arrow)");
        line.setAttribute("marker-end", "url(#orange-arrow)");
        gGuide.appendChild(line);
        
        const cx = (x1 + x2) / 2;
        const cy = (y1 + y2) / 2 - 10;
        
        const labelText = `D: ${dist.toFixed(2)}" (ΔX: ${dx.toFixed(2)}", ΔY: ${dy.toFixed(2)}")`;
        
        const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        rect.setAttribute("x", cx - labelText.length * 3.5);
        rect.setAttribute("y", cy - 10);
        rect.setAttribute("width", labelText.length * 7);
        rect.setAttribute("height", "15");
        rect.setAttribute("rx", "3");
        rect.setAttribute("fill", "rgba(10, 10, 15, 0.9)");
        rect.setAttribute("stroke", "#ff8800");
        rect.setAttribute("stroke-width", "0.5");
        gGuide.appendChild(rect);
        
        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.setAttribute("x", cx);
        text.setAttribute("y", cy + 1);
        text.setAttribute("text-anchor", "middle");
        text.setAttribute("fill", "#ffaa00");
        text.setAttribute("font-family", "'JetBrains Mono', monospace");
        text.setAttribute("font-size", "9px");
        text.setAttribute("font-weight", "600");
        text.textContent = labelText;
        gGuide.appendChild(text);
    }

    function openDraftMemberEditor(memberId) {
        const m = draftMembers.find(item => item.id === memberId);
        if (!m) return;
        
        document.getElementById('draft-editor-panel').classList.remove('hidden');
        document.getElementById('draft-empty-prompt').classList.add('hidden');
        
        document.getElementById('selected-member-title').textContent = `Selected: ${m.type.toUpperCase()} (${m.id.substring(m.id.length - 5)})`;
        
        document.getElementById('draft-member-rotation').value = m.rotation.toString();
        document.getElementById('draft-pos-x').value = m.origin[0].toFixed(2);
        document.getElementById('draft-pos-y').value = m.origin[1].toFixed(2);
        
        // Hide/show projection grid and length for Plate
        const isPlate = m.type === 'plate';
        const lengthViewGrid = document.getElementById('draft-length-view-grid');
        if (isPlate) {
            lengthViewGrid.classList.add('hidden');
        } else {
            lengthViewGrid.classList.remove('hidden');
            document.getElementById('draft-member-length').value = (m.length || 60.0).toString();
            document.getElementById('draft-member-view').value = m.viewType || 'profile';
        }

        // Populating AISC Standard Sizes select
        const sizeSelect = document.getElementById('draft-member-size');
        const dbShapes = SHAPES_DB[m.type] || [];
        
        let selectOptionsHtml = dbShapes.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
        selectOptionsHtml += `<option value="CUSTOM">Custom Dimensions...</option>`;
        sizeSelect.innerHTML = selectOptionsHtml;
        
        sizeSelect.value = m.size || "CUSTOM";
        
        // Conditional Custom Inputs rendering
        const dimsContainer = document.getElementById('draft-member-dims');
        if (sizeSelect.value === 'CUSTOM' || m.type === 'plate') {
            dimsContainer.classList.remove('hidden');
            let dimsHtml = "";
            if (m.type === 'hss_rect') {
                dimsHtml += generateDraftNumInput('Width (in)', 'dm-w', m.params.w);
                dimsHtml += generateDraftNumInput('Height (in)', 'dm-h', m.params.h);
                dimsHtml += generateDraftNumInput('Thickness (in)', 'dm-t', m.params.t);
            } else if (m.type === 'hss_circ') {
                dimsHtml += generateDraftNumInput('Diameter (in)', 'dm-d', m.params.d);
                dimsHtml += generateDraftNumInput('Thickness (in)', 'dm-t', m.params.t);
            } else if (m.type === 'w_beam') {
                dimsHtml += generateDraftNumInput('Depth (in)', 'dm-d', m.params.d);
                dimsHtml += generateDraftNumInput('Flange Width (in)', 'dm-bf', m.params.bf);
                dimsHtml += generateDraftNumInput('Flange Thick (in)', 'dm-tf', m.params.tf);
                dimsHtml += generateDraftNumInput('Web Thick (in)', 'dm-tw', m.params.tw);
            } else if (m.type === 'angles') {
                dimsHtml += generateDraftNumInput('Leg 1 (in)', 'dm-leg1', m.params.leg1);
                dimsHtml += generateDraftNumInput('Leg 2 (in)', 'dm-leg2', m.params.leg2);
                dimsHtml += generateDraftNumInput('Thickness (in)', 'dm-t', m.params.t);
            } else if (m.type === 'plate') {
                dimsHtml += generateDraftNumInput('Width (in)', 'dm-w', m.params.w);
                dimsHtml += generateDraftNumInput('Height (in)', 'dm-h', m.params.h);
                if (sizeSelect.value === 'CUSTOM') {
                    dimsHtml += generateDraftNumInput('Thickness (in)', 'dm-t', m.params.t || 0.5);
                }
            }
            dimsContainer.innerHTML = dimsHtml;
            
            // Wire dynamic inputs changes
            dimsContainer.querySelectorAll('input').forEach(inp => {
                inp.addEventListener('input', () => {
                    const paramKey = inp.id.replace('inp-dm-', '');
                    m.params[paramKey] = parseFloat(inp.value) || 0;
                    renderDraftSpace();
                });
            });
        } else {
            dimsContainer.classList.add('hidden');
        }

        // Perforation groups setup
        const hasHolesCheckbox = document.getElementById('draft-member-has-holes');
        hasHolesCheckbox.checked = m.hasHoles;
        
        const holesDetails = document.getElementById('draft-holes-details');
        if (m.hasHoles) {
            holesDetails.classList.remove('hidden');
        } else {
            holesDetails.classList.add('hidden');
        }
        
        document.getElementById('draft-hole-dia').value = m.holes.d;
        document.getElementById('draft-hole-count').value = m.holes.count;
        document.getElementById('draft-hole-spacing').value = m.holes.spacing;
        
        const hasBoltsCheckbox = document.getElementById('draft-member-has-bolts');
        hasBoltsCheckbox.checked = m.hasBolts;
        
        const boltsDetails = document.getElementById('draft-bolts-details');
        if (m.hasBolts && m.hasHoles) {
            boltsDetails.classList.remove('hidden');
        } else {
            boltsDetails.classList.add('hidden');
        }
        
        document.getElementById('draft-bolt-dia').value = m.bolts.d;
        document.getElementById('draft-bolt-len').value = m.bolts.len;
        document.getElementById('draft-member-label').value = m.label || "";
    }

    function generateDraftNumInput(label, id, val) {
        return `<div class="input-group">
                    <label>${label}</label>
                    <input type="number" id="inp-${id}" value="${val}" step="0.01">
                </div>`;
    }

    function closeDraftMemberEditor() {
        document.getElementById('draft-editor-panel').classList.add('hidden');
        document.getElementById('draft-empty-prompt').classList.remove('hidden');
    }

    function showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'ai-success-toast';
        toast.innerHTML = `<i data-lucide="check"></i> ${message}`;
        document.body.appendChild(toast);
        if (window.lucide) lucide.createIcons();
        setTimeout(() => toast.remove(), 2000);
    }

    svgContainer.addEventListener('click', (e) => {
        if (autocadDimModeActive) {
            if (panDelta > 5) {
                panDelta = 0;
                return;
            }
            
            const svgElement = svgContainer.querySelector('svg');
            if (!svgElement) return;
            const pt = svgElement.createSVGPoint();
            pt.x = e.clientX;
            pt.y = e.clientY;
            const svgPt = pt.matrixTransform(svgElement.getScreenCTM().inverse());
            const scale = getSvgScale(svgElement);
            const extents = getModelExtents();
            const [mouseCadX, mouseCadY] = svgToCad(svgPt.x, svgPt.y, scale, extents);

            const clickPoint = activeSnapPoint ? { x: activeSnapPoint.x, y: activeSnapPoint.y } : { x: mouseCadX, y: mouseCadY };
            
            if (!dimStartPoint) {
                dimStartPoint = { x: clickPoint.x, y: clickPoint.y };
            } else {
                const p1 = dimStartPoint;
                const p2 = { x: clickPoint.x, y: clickPoint.y };
                
                if (Math.hypot(p2.x - p1.x, p2.y - p1.y) > 0.01) {
                    let cx_mid = 0, cy_mid = 0;
                    const extents = getModelExtents();
                    if (extents) {
                        cx_mid = (extents.low[0] + extents.high[0]) / 2;
                        cy_mid = (extents.low[1] + extents.high[1]) / 2;
                    }
                    
                    const midX = (p1.x + p2.x) / 2;
                    const midY = (p1.y + p2.y) / 2;
                    const vx = midX - cx_mid;
                    const vy = midY - cy_mid;
                    
                    const dx = p2.x - p1.x;
                    const dy = p2.y - p1.y;
                    let nx = -dy;
                    let ny = dx;
                    
                    const dot = nx * vx + ny * vy;
                    if (dot < 0) {
                        nx = -nx;
                        ny = -ny;
                    }
                    
                    const len = Math.hypot(nx, ny);
                    if (len > 0.001) {
                        nx /= len;
                        ny /= len;
                    }
                    
                    const offsetInches = 35 / 25.4;
                    
                    const cdx1 = p1.x + nx * offsetInches;
                    const cdy1 = p1.y + ny * offsetInches;
                    const cdx2 = p2.x + nx * offsetInches;
                    const cdy2 = p2.y + ny * offsetInches;
                    
                    const overrideInput = document.getElementById('dim-text-override');
                    const text = overrideInput ? overrideInput.value.trim() : "";
                    if (overrideInput) overrideInput.value = "";
                    
                    customDimensionsList.push({
                        cx1: p1.x,
                        cy1: p1.y,
                        cx2: p2.x,
                        cy2: p2.y,
                        cdx1: cdx1,
                        cdy1: cdy1,
                        cdx2: cdx2,
                        cdy2: cdy2,
                        text: text || null
                    });
                    
                    if (currentMode === 'shapes') {
                        renderCurrentCAD();
                    } else if (currentMode === 'draft') {
                        renderDraftSpace();
                    }
                }
                
                dimStartPoint = null;
            }
            return;
        }
        
        if (currentMode !== 'draft') return;
        
        const tgtTag = e.target.tagName;
        const tgtId = e.target.id || "";
        const tgtClass = e.target.getAttribute('class') || "";
        logVisual(`Click on: <${tgtTag}> (id: "${tgtId}", class: "${tgtClass}")`, "info");
        
        // Prevent click trigger if they were panning
        if (panDelta > 5) {
            logVisual(`Click bypassed: panning active (panDelta: ${panDelta})`, "info");
            panDelta = 0;
            return;
        }

        // Avoid immediately deselecting a member we just selected during mousedown
        if (justSelectedInMousedown) {
            logVisual(`Click bypassed: member just selected in mousedown.`, "success");
            justSelectedInMousedown = false;
            return;
        }
        
        const memberId = findDraftMemberFromElement(e.target);
        logVisual(`Click detected group via robust traversal, extracted memberId: "${memberId}"`, "info");
        
        if (memberId) {
            selectedMemberId = memberId;
            openDraftMemberEditor(memberId);
            renderDraftSpace();
            logVisual(`SUCCESS: Click selected member "${memberId}"`, "success");
            return;
        }
        
        // Only deselect if they specifically click the background/empty area
        if (e.target === svgContainer || e.target.id === 'svg-container' || e.target.tagName.toLowerCase() === 'svg') {
            logVisual("Deselection triggered: clicked background empty area.", "info");
            selectedMemberId = null;
            closeDraftMemberEditor();
            renderDraftSpace();
        }
    });

    // --- Add draft members click handlers ---
    document.querySelectorAll('.add-draft-shape').forEach(btn => {
        btn.addEventListener('click', () => {
            const shapeType = btn.dataset.shape;
            const defaultParams = { ...DRAFT_TEMPLATES[shapeType] };
            
            const dbShapes = SHAPES_DB[shapeType] || [];
            const defaultSize = shapeType === 'plate' ? 'PL1/2' : (dbShapes.length > 0 ? dbShapes[0].id : 'CUSTOM');
            
            const newMember = {
                id: "member_" + Date.now() + "_" + Math.floor(Math.random()*1000),
                type: shapeType,
                size: defaultSize,
                length: 60.0,
                viewType: 'profile',
                params: defaultParams,
                rotation: 0,
                origin: [0, 0],
                hasHoles: false,
                holes: { d: 0.5, count: 2, spacing: 3.0 },
                hasBolts: false,
                bolts: { d: 0.5, len: 2.5 },
                label: ""
            };
            
            // Populate standard sizes if available
            if (newMember.size !== 'CUSTOM') {
                const selected = dbShapes.find(s => s.id === newMember.size);
                if (selected) {
                    newMember.params = { ...defaultParams, ...selected };
                }
            }
            
            draftMembers.push(newMember);
            selectedMemberId = newMember.id;
            
            openDraftMemberEditor(newMember.id);
            renderDraftSpace();
            showToast("Added " + shapeType.toUpperCase());
        });
    });

    // --- Member editor change handlers ---
    document.getElementById('draft-member-rotation').addEventListener('change', (e) => {
        if (!selectedMemberId) return;
        const m = draftMembers.find(item => item.id === selectedMemberId);
        if (m) {
            m.rotation = parseInt(e.target.value) || 0;
            renderDraftSpace();
        }
    });

    document.getElementById('draft-pos-x').addEventListener('input', (e) => {
        if (!selectedMemberId) return;
        const m = draftMembers.find(item => item.id === selectedMemberId);
        if (m) {
            m.origin[0] = parseFloat(e.target.value) || 0;
            renderDraftSpace();
        }
    });

    document.getElementById('draft-pos-y').addEventListener('input', (e) => {
        if (!selectedMemberId) return;
        const m = draftMembers.find(item => item.id === selectedMemberId);
        if (m) {
            m.origin[1] = parseFloat(e.target.value) || 0;
            renderDraftSpace();
        }
    });

    // Dynamic standard member sizes select handler
    document.getElementById('draft-member-size').addEventListener('change', (e) => {
        if (!selectedMemberId) return;
        const m = draftMembers.find(item => item.id === selectedMemberId);
        if (m) {
            m.size = e.target.value;
            if (m.size !== 'CUSTOM') {
                const shapes = SHAPES_DB[m.type] || [];
                const selected = shapes.find(s => s.id === m.size);
                if (selected) {
                    m.params = { ...m.params, ...selected };
                }
            }
            openDraftMemberEditor(selectedMemberId);
            renderDraftSpace();
        }
    });

    // Length input handler
    document.getElementById('draft-member-length').addEventListener('input', (e) => {
        if (!selectedMemberId) return;
        const m = draftMembers.find(item => item.id === selectedMemberId);
        if (m) {
            m.length = parseFloat(e.target.value) || 60.0;
            renderDraftSpace();
        }
    });

    // Projection View select handler
    document.getElementById('draft-member-view').addEventListener('change', (e) => {
        if (!selectedMemberId) return;
        const m = draftMembers.find(item => item.id === selectedMemberId);
        if (m) {
            m.viewType = e.target.value;
            renderDraftSpace();
        }
    });

    document.getElementById('draft-member-has-holes').addEventListener('change', (e) => {
        if (!selectedMemberId) return;
        const m = draftMembers.find(item => item.id === selectedMemberId);
        if (m) {
            m.hasHoles = e.target.checked;
            document.getElementById('draft-holes-details').classList.toggle('hidden', !m.hasHoles);
            if (!m.hasHoles) {
                m.hasBolts = false;
                document.getElementById('draft-member-has-bolts').checked = false;
                document.getElementById('draft-bolts-details').classList.add('hidden');
            }
            renderDraftSpace();
        }
    });
    
    document.getElementById('draft-hole-dia').addEventListener('input', (e) => {
        if (!selectedMemberId) return;
        const m = draftMembers.find(item => item.id === selectedMemberId);
        if (m && m.holes) {
            m.holes.d = parseFloat(e.target.value) || 0.5;
            renderDraftSpace();
        }
    });

    document.getElementById('draft-hole-count').addEventListener('input', (e) => {
        if (!selectedMemberId) return;
        const m = draftMembers.find(item => item.id === selectedMemberId);
        if (m && m.holes) {
            m.holes.count = parseInt(e.target.value) || 1;
            renderDraftSpace();
        }
    });

    document.getElementById('draft-hole-spacing').addEventListener('input', (e) => {
        if (!selectedMemberId) return;
        const m = draftMembers.find(item => item.id === selectedMemberId);
        if (m && m.holes) {
            m.holes.spacing = parseFloat(e.target.value) || 0;
            renderDraftSpace();
        }
    });

    document.getElementById('draft-member-has-bolts').addEventListener('change', (e) => {
        if (!selectedMemberId) return;
        const m = draftMembers.find(item => item.id === selectedMemberId);
        if (m) {
            m.hasBolts = e.target.checked;
            document.getElementById('draft-bolts-details').classList.toggle('hidden', !m.hasBolts);
            renderDraftSpace();
        }
    });
    
    document.getElementById('draft-bolt-dia').addEventListener('input', (e) => {
        if (!selectedMemberId) return;
        const m = draftMembers.find(item => item.id === selectedMemberId);
        if (m && m.bolts) {
            m.bolts.d = parseFloat(e.target.value) || 0.5;
            renderDraftSpace();
        }
    });

    document.getElementById('draft-bolt-len').addEventListener('input', (e) => {
        if (!selectedMemberId) return;
        const m = draftMembers.find(item => item.id === selectedMemberId);
        if (m && m.bolts) {
            m.bolts.len = parseFloat(e.target.value) || 2.5;
            renderDraftSpace();
        }
    });

    document.getElementById('draft-member-label').addEventListener('input', (e) => {
        if (!selectedMemberId) return;
        const m = draftMembers.find(item => item.id === selectedMemberId);
        if (m) {
            m.label = e.target.value.trim();
            renderDraftSpace();
        }
    });

    // --- Modify Member actions ---
    document.getElementById('draft-btn-copy').addEventListener('click', () => {
        if (!selectedMemberId) return;
        const m = draftMembers.find(item => item.id === selectedMemberId);
        if (m) {
            clipboardMember = JSON.parse(JSON.stringify(m));
            showToast("Member Copied!");
        }
    });

    document.getElementById('draft-btn-paste').addEventListener('click', () => {
        if (!clipboardMember) {
            alert("Clipboard is empty! Copy a member first.");
            return;
        }
        const copy = JSON.parse(JSON.stringify(clipboardMember));
        copy.id = "member_" + Date.now() + "_" + Math.floor(Math.random()*1000);
        copy.origin[0] += 5.0;
        copy.origin[1] += 5.0;
        
        draftMembers.push(copy);
        selectedMemberId = copy.id;
        
        openDraftMemberEditor(copy.id);
        renderDraftSpace();
        showToast("Member Pasted!");
    });

    document.getElementById('draft-btn-delete').addEventListener('click', () => {
        if (!selectedMemberId) return;
        const index = draftMembers.findIndex(item => item.id === selectedMemberId);
        if (index !== -1) {
            draftMembers.splice(index, 1);
            selectedMemberId = null;
            closeDraftMemberEditor();
            renderDraftSpace();
            showToast("Member Deleted");
        }
    });

    document.getElementById('draft-btn-array').addEventListener('click', () => {
        if (!selectedMemberId) {
            alert("Select a member first!");
            return;
        }
        const m = draftMembers.find(item => item.id === selectedMemberId);
        if (!m) return;
        
        const spacing = parseFloat(document.getElementById('draft-array-spacing').value) || 12.0;
        const axis = document.getElementById('draft-array-axis').value || 'X';
        const count = parseInt(document.getElementById('draft-array-count').value) || 3;
        
        if (count < 1) return;
        
        for (let i = 1; i <= count; i++) {
            const duplicate = JSON.parse(JSON.stringify(m));
            duplicate.id = "member_" + Date.now() + "_" + i + "_" + Math.floor(Math.random()*1000);
            
            if (axis === 'X') {
                duplicate.origin[0] += i * spacing;
            } else {
                duplicate.origin[1] += i * spacing;
            }
            
            if (duplicate.label) {
                duplicate.label = `${duplicate.label} (Array ${i})`;
            }
            
            draftMembers.push(duplicate);
        }
        
        renderDraftSpace();
        showToast(`Created ${count} array duplicates!`);
    });

    function updateDraftDimensionText() {
        if (draftMembers.length === 0) {
            dimText.textContent = "Empty Workspace";
            return;
        }
        
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        
        draftMembers.forEach(m => {
            const bx = m.origin[0];
            const by = m.origin[1];
            const w = m.params.w || m.params.bf || m.params.d || 4;
            const h = m.params.h || m.params.d || 4;
            
            minX = Math.min(minX, bx - w/2);
            maxX = Math.max(maxX, bx + w/2);
            minY = Math.min(minY, by - h/2);
            maxY = Math.max(maxY, by + h/2);
        });
        
        const totalW = maxX - minX;
        const totalH = maxY - minY;
        dimText.textContent = `Draft: ${totalW.toFixed(1)}"w x ${totalH.toFixed(1)}"h (${draftMembers.length} members)`;
    }

    function injectCADAnnotations(svg) {
        if (!currentModel) return;
        const cat = shapeCategory.value;
        
        const scale = getSvgScale(svg);
        const scaleFactor = scale / 25.4;
        let actualWidthInches = 0;
        let actualHeightInches = 0;
        let midPostCount = 0;
        
        const extents = window.makerjs ? makerjs.measure.modelExtents(currentModel) : null;
        if (extents) {
            actualWidthInches = extents.high[0] - extents.low[0];
            actualHeightInches = extents.high[1] - extents.low[1];
        }
        
        let gAnnots = svg.querySelector('.cad-annotations-overlay');
        if (!gAnnots) {
            gAnnots = svg.ownerDocument.createElementNS("http://www.w3.org/2000/svg", "g");
            gAnnots.setAttribute("class", "cad-annotations-overlay");
            svg.appendChild(gAnnots);
        } else {
            gAnnots.innerHTML = "";
        }
        // Store placed label bounding boxes for collision avoidance
        const placedLabels = [];
        const placedViewportLeaders = [];

        // Helper: compute approximate bounding box for a text label
        function computeLabelBBox(x, y, text, fontSize) {
          const approxWidth = text.length * fontSize * 0.6;
          const approxHeight = fontSize * 1.2;
          return {
            xMin: x - approxWidth / 2,
            xMax: x + approxWidth / 2,
            yMin: y - approxHeight / 2,
            yMax: y + approxHeight / 2
          };
        }

        // Helper: check if a bbox collides with any existing placed label
        function checkCollision(bbox) {
          for (const pl of placedLabels) {
            const ob = pl.bbox;
            if (bbox.xMin < ob.xMax && bbox.xMax > ob.xMin &&
                bbox.yMin < ob.yMax && bbox.yMax > ob.yMin) {
              return true;
            }
          }
          return false;
        }

        // Helper: add a placed label record
        function registerLabel(id, bbox) {
          placedLabels.push({ id, bbox });
        }
        
        // Define arrowheads markers in defs if not present
        let defs = svg.querySelector('defs');
        if (!defs) {
            defs = svg.ownerDocument.createElementNS("http://www.w3.org/2000/svg", "defs");
            svg.insertBefore(defs, svg.firstChild);
        }
        if (!defs.querySelector('#annot-arrow-start')) {
            const markerStart = svg.ownerDocument.createElementNS("http://www.w3.org/2000/svg", "marker");
            markerStart.setAttribute("id", "annot-arrow-start");
            markerStart.setAttribute("viewBox", "0 0 10 10");
            markerStart.setAttribute("refX", "0");
            markerStart.setAttribute("refY", "5");
            markerStart.setAttribute("markerWidth", "6");
            markerStart.setAttribute("markerHeight", "6");
            markerStart.setAttribute("orient", "auto-start-reverse");
            const pathStart = svg.ownerDocument.createElementNS("http://www.w3.org/2000/svg", "path");
            pathStart.setAttribute("d", "M 10 1.5 L 0 5 L 10 8.5 z");
            pathStart.setAttribute("fill", "#ffaa00");
            markerStart.appendChild(pathStart);
            defs.appendChild(markerStart);
        }
        if (!defs.querySelector('#annot-arrow-end')) {
            const markerEnd = svg.ownerDocument.createElementNS("http://www.w3.org/2000/svg", "marker");
            markerEnd.setAttribute("id", "annot-arrow-end");
            markerEnd.setAttribute("viewBox", "0 0 10 10");
            markerEnd.setAttribute("refX", "10");
            markerEnd.setAttribute("refY", "5");
            markerEnd.setAttribute("markerWidth", "6");
            markerEnd.setAttribute("markerHeight", "6");
            markerEnd.setAttribute("orient", "auto-start-reverse");
            const pathEnd = svg.ownerDocument.createElementNS("http://www.w3.org/2000/svg", "path");
            pathEnd.setAttribute("d", "M 0 1.5 L 10 5 L 0 8.5 z");
            pathEnd.setAttribute("fill", "#ffaa00");
            markerEnd.appendChild(pathEnd);
            defs.appendChild(markerEnd);
        }
        if (!defs.querySelector('#leader-arrow')) {
            const markerLeader = svg.ownerDocument.createElementNS("http://www.w3.org/2000/svg", "marker");
            markerLeader.setAttribute("id", "leader-arrow");
            markerLeader.setAttribute("viewBox", "0 0 10 10");
            markerLeader.setAttribute("refX", "10");
            markerLeader.setAttribute("refY", "5");
            markerLeader.setAttribute("markerWidth", "5");
            markerLeader.setAttribute("markerHeight", "5");
            markerLeader.setAttribute("orient", "auto-start-reverse");
            const pathLeader = svg.ownerDocument.createElementNS("http://www.w3.org/2000/svg", "path");
            pathLeader.setAttribute("d", "M 0 2 L 10 5 L 0 8 z");
            pathLeader.setAttribute("fill", "#ffaa00");
            markerLeader.appendChild(pathLeader);
            defs.appendChild(markerLeader);
        }
        if (!defs.querySelector('#custom-arrow-start')) {
            const markerStart = svg.ownerDocument.createElementNS("http://www.w3.org/2000/svg", "marker");
            markerStart.setAttribute("id", "custom-arrow-start");
            markerStart.setAttribute("viewBox", "0 0 10 10");
            markerStart.setAttribute("refX", "0");
            markerStart.setAttribute("refY", "5");
            markerStart.setAttribute("markerWidth", "6");
            markerStart.setAttribute("markerHeight", "6");
            markerStart.setAttribute("orient", "auto-start-reverse");
            const pathStart = svg.ownerDocument.createElementNS("http://www.w3.org/2000/svg", "path");
            pathStart.setAttribute("d", "M 10 1.5 L 0 5 L 10 8.5 z");
            pathStart.setAttribute("fill", "#00d4ff");
            markerStart.appendChild(pathStart);
            defs.appendChild(markerStart);
        }
        if (!defs.querySelector('#custom-arrow-end')) {
            const markerEnd = svg.ownerDocument.createElementNS("http://www.w3.org/2000/svg", "marker");
            markerEnd.setAttribute("id", "custom-arrow-end");
            markerEnd.setAttribute("viewBox", "0 0 10 10");
            markerEnd.setAttribute("refX", "10");
            markerEnd.setAttribute("refY", "5");
            markerEnd.setAttribute("markerWidth", "6");
            markerEnd.setAttribute("markerHeight", "6");
            markerEnd.setAttribute("orient", "auto-start-reverse");
            const pathEnd = svg.ownerDocument.createElementNS("http://www.w3.org/2000/svg", "path");
            pathEnd.setAttribute("d", "M 0 1.5 L 10 5 L 0 8.5 z");
            pathEnd.setAttribute("fill", "#00d4ff");
            markerEnd.appendChild(pathEnd);
            defs.appendChild(markerEnd);
        }

        // Get exact model extents
        let cadMinX, cadMaxX, cadMinY, cadMaxY;
        
        if (extents) {
            cadMinX = extents.low[0] * scale;
            cadMaxX = extents.high[0] * scale;
            cadMinY = extents.low[1] * scale;
            cadMaxY = extents.high[1] * scale;
        }
        
        if (cadMinX === undefined || isNaN(actualWidthInches) || actualWidthInches <= 0) {
            return;
        }

        // Helper to draw lines
        const drawLine = (x1, y1, x2, y2, stroke = "#ffaa00", width = "1.5", mStart = "", mEnd = "") => {
            const line = svg.ownerDocument.createElementNS("http://www.w3.org/2000/svg", "line");
            line.setAttribute("x1", x1);
            line.setAttribute("y1", y1);
            line.setAttribute("x2", x2);
            line.setAttribute("y2", y2);
            line.setAttribute("stroke", stroke);
            line.setAttribute("stroke-width", parseFloat(width) * scaleFactor);
            if (mStart) line.setAttribute("marker-start", `url(#${mStart})`);
            if (mEnd) line.setAttribute("marker-end", `url(#${mEnd})`);
            gAnnots.appendChild(line);
            return line;
        };

        // Helper to draw text
        const drawText = (val, x, y, anchor = "middle", rotation = 0, rx = 0, ry = 0, color = "#ffffff", fontSize = (customDimFontSize * scaleFactor)) => {
            const text = svg.ownerDocument.createElementNS("http://www.w3.org/2000/svg", "text");
            text.setAttribute("x", x);
            text.setAttribute("y", y);
            text.setAttribute("fill", color);
            text.setAttribute("font-family", "'JetBrains Mono', monospace, sans-serif");
            text.setAttribute("font-size", fontSize + "px");
            text.setAttribute("font-weight", "bold");
            text.setAttribute("text-anchor", anchor);
            if (rotation) {
                text.setAttribute("transform", `rotate(${rotation}, ${rx}, ${ry})`);
            }
            text.textContent = val;
            gAnnots.appendChild(text);
            return text;
        };

        const defaultLeaderOffsets = {
            "leader-top-rail": { dx: 0, dy: 12 / 25.4 },
            "leader-bot-rail": { dx: 0, dy: -12 / 25.4 },
            "leader-left-post": { dx: 0, dy: 10 / 25.4 },
            "leader-right-post": { dx: 0, dy: -12 / 25.4 },
            "leader-mid-post": { dx: 0, dy: 10 / 25.4 },
            "leader-mid-rail": { dx: 0, dy: -10 / 25.4 },
            "leader-pickets": { dx: 0, dy: 10 / 25.4 },
            "leader-kickplate": { dx: 0, dy: -10 / 25.4 },
            "leader-post": { dx: 0, dy: 10 / 25.4 }
        };

        const drawViewportDimension = (cx1, cy1, cx2, cy2, offsetMm, text, textSide, dimId) => {
            if (dimId && hiddenAnnotations.has(dimId)) return;
            
            let finalOffsetInches = offsetMm / 25.4;
            let axis = "Y";
            
            if (Math.abs(cy1 - cy2) < 0.01) {
                axis = "Y";
                if (dimId && annotationOffsets[dimId] !== undefined) {
                    finalOffsetInches += annotationOffsets[dimId];
                } else if (annotationOffsets["dim-width"] !== undefined) {
                    // Fallback to legacy global offset
                    if (offsetMm < 0) {
                        const deltaY = annotationOffsets["dim-width"];
                        finalOffsetInches += deltaY;
                    }
                }
            } else if (Math.abs(cx1 - cx2) < 0.01) {
                axis = "X";
                if (dimId && annotationOffsets[dimId] !== undefined) {
                    finalOffsetInches += annotationOffsets[dimId];
                } else if (annotationOffsets["dim-height"] !== undefined) {
                    // Fallback to legacy global offset
                    const deltaX = annotationOffsets["dim-height"];
                    finalOffsetInches += deltaX;
                }
            }

            const slopeRad = (vals.slope || 0) * Math.PI / 180;
            let rx1 = cx1;
            let ry1 = cy1;
            let rx2 = cx2;
            let ry2 = cy2;
            if (cat === 'fence') {
                ry1 = cy1 + cx1 * Math.tan(slopeRad);
                ry2 = cy2 + cx2 * Math.tan(slopeRad);
            } else {
                const cosS = Math.cos(slopeRad);
                const sinS = Math.sin(slopeRad);
                rx1 = cx1 * cosS - cy1 * sinS;
                ry1 = cx1 * sinS + cy1 * cosS;
                rx2 = cx2 * cosS - cy2 * sinS;
                ry2 = cx2 * sinS + cy2 * cosS;
            }

            const p1 = cadToSvg(rx1, ry1, scale, extents);
            const p2 = cadToSvg(rx2, ry2, scale, extents);
            
            const dx_dist = p2[0] - p1[0];
            const dy_dist = p2[1] - p1[1];
            const len = Math.sqrt(dx_dist*dx_dist + dy_dist*dy_dist);
            if (len < 0.001) return;
            
            const px = -dy_dist / len;
            const py = dx_dist / len;
            
            const offsetSvg = finalOffsetInches * scale;
            const d1 = [p1[0] + px * offsetSvg, p1[1] + py * offsetSvg];
            const d2 = [p2[0] + px * offsetSvg, p2[1] + py * offsetSvg];
            
            // Look up specific properties
            const spec = (dimId && annotationProperties[dimId]) || {};
            const activeTextGap = spec.textGap !== undefined ? spec.textGap : customDimTextGap;
            const activeFontSize = spec.fontSize !== undefined ? spec.fontSize : customDimFontSize;
            const activeText = spec.text !== undefined && spec.text !== null ? spec.text : text;
            
            const isSelected = selectedAnnotId === dimId;
            const dimColor = isSelected ? "#ff00ff" : "#ffaa00";
            const textColor = isSelected ? "#ff00ff" : "#ffffff";
            
            // Draw extension lines
            const extAngle = Math.atan2(d1[1] - p1[1], d1[0] - p1[0]);
            const extLength = Math.sqrt((d1[0]-p1[0])**2 + (d1[1]-p1[1])**2);
            const extX1 = p1[0] + (extLength + 5 * scaleFactor) * Math.cos(extAngle);
            const extY1 = p1[1] + (extLength + 5 * scaleFactor) * Math.sin(extAngle);
            const extX2 = p2[0] + (extLength + 5 * scaleFactor) * Math.cos(extAngle);
            const extY2 = p2[1] + (extLength + 5 * scaleFactor) * Math.sin(extAngle);
            
            drawLine(p1[0], p1[1], extX1, extY1, dimColor, "0.5");
            drawLine(p2[0], p2[1], extX2, extY2, dimColor, "0.5");
            
            // Draw dimension line
            drawLine(d1[0], d1[1], d2[0], d2[1], dimColor, "1.2", "annot-arrow-start", "annot-arrow-end");
            
            // Text positioning
            const midX = (d1[0] + d2[0]) / 2;
            const midY = (d1[1] + d2[1]) / 2;
            
            let sideMult = Math.sign(finalOffsetInches);
            if (textSide === "left" || textSide === "opposite") {
                sideMult = -sideMult;
            }
            const textShiftSvg = activeTextGap * sideMult * scaleFactor;
            let textAnchor = "middle";
            let tx = midX + px * textShiftSvg;
            let staggerY = 0;
            if (dimId === "dim-vert-mid-rail") {
                staggerY = -15; // Shift upwards by 15px
            } else if (dimId === "dim-vert-fence-height") {
                staggerY = 15; // Shift downwards by 15px
            }
            let ty = midY + py * textShiftSvg + staggerY;
            
            // Collision avoidance for dimension label
            let labelBBox = computeLabelBBox(tx, ty, activeText, activeFontSize * scaleFactor);
            if (checkCollision(labelBBox)) {
                // Simple offset strategy: try shifting in X direction
                const offset = 8 * scaleFactor;
                if (tx > midX) {
                    tx += offset;
                } else {
                    tx -= offset;
                }
                // Recompute bbox after shift
                labelBBox = computeLabelBBox(tx, ty, activeText, activeFontSize * scaleFactor);
            }
            registerLabel(dimId, labelBBox);
            
            const arrowAngle = Math.atan2(d2[1] - d1[1], d2[0] - d1[0]);
            let textAngle = arrowAngle * 180 / Math.PI;
            if (textAngle > 90) textAngle -= 180;
            if (textAngle < -90) textAngle += 180;

            const lenMm = len / scaleFactor;
            const paperDx = Math.abs(p2[0] - p1[0]) / scaleFactor;
            if (lenMm < 10.0 && paperDx < 0.1) {
                textAngle = 0; // horizontal text
                const dir = Math.sign(finalOffsetInches) || 1;
                let L = 6.0;
                let textStart = 1.2;
                
                if (dimId === 'dim-vert-ground') {
                    L = 12.0;
                    textStart = 6.8;
                }
                
                tx = midX + textStart * dir * scaleFactor;
                ty = midY + 2.0 * scaleFactor;
                textAnchor = (dir > 0) ? "start" : "end";
                
                // Draw horizontal leader line
                const leadLine = svg.ownerDocument.createElementNS("http://www.w3.org/2000/svg", "line");
                leadLine.setAttribute("x1", midX);
                leadLine.setAttribute("y1", midY);
                leadLine.setAttribute("x2", midX + L * dir * scaleFactor);
                leadLine.setAttribute("y2", midY);
                leadLine.setAttribute("stroke", dimColor);
                leadLine.setAttribute("stroke-width", 0.8 * scaleFactor);
                gAnnots.appendChild(leadLine);
            }
            
            const textNode = drawText(activeText, tx, ty, textAnchor, textAngle, tx, ty, textColor, activeFontSize * scaleFactor);
            if (dimId) {
                textNode.setAttribute("class", "annot-text-draggable");
                textNode.setAttribute("style", "cursor: move; pointer-events: auto;");
                textNode.setAttribute("data-annot-id", dimId);
                textNode.setAttribute("data-annot-type", "dimension");
                textNode.setAttribute("data-axis", axis);
            }
        };

        const vals = {};
        dynamicInputs.querySelectorAll('input').forEach(inp => {
            const id = inp.id.replace('inp-', '');
            vals[id] = (inp.type === 'text') ? inp.value : (parseFloat(inp.value) || 0);
        });
        dynamicInputs.querySelectorAll('select').forEach(sel => {
            vals[sel.id.replace('inp-', '')] = sel.value;
        });

        const panelType = balconyWizardState.activePanelType || 'main';
        const customSpacings = [];
        const tempMidPostsVal = vals.midPosts || 'default';
        const tempMidPostCount = parseInt(vals.midPostCount) || 0;
        if (tempMidPostsVal === 'custom') {
            for (let i = 1; i <= tempMidPostCount; i++) {
                const spKey = `midPostSpacing-${i}`;
                customSpacings.push(vals[spKey] !== undefined ? vals[spKey] : 48);
            }
        }

        const drawingNo = document.getElementById('exp-drawingNo')?.value || 'D-101';
        const cleanDrawingNo = drawingNo.toUpperCase().replace(/[^A-Z0-9]/g, '');
        const activeDwgNo = (cat === 'rail_catalog') ? getActiveBalconyDwgAndMark().drawingNo : cleanDrawingNo;
        const mainMarkCode = (cat === 'rail_catalog') ? getActiveBalconyDwgAndMark().mainMark : (cleanDrawingNo + 'M1');
        
        let charCode = 97; // 'a'
        let mainMarkAssigned = false;
        const getMark = (isPresent) => {
            if (!isPresent) return null;
            if (!mainMarkAssigned) {
                mainMarkAssigned = true;
                return mainMarkCode;
            }
            const m = String.fromCharCode(charCode) + activeDwgNo;
            charCode++;
            return m;
        };

        const getProfileDimension = (type, size, customVal) => {
            if (type === 'none' || size === 'NONE') return 0;
            if (size === 'CUSTOM') return customVal;
            const shapes = SHAPES_DB[type] || [];
            const selected = shapes.find(s => s.id === size);
            if (selected) {
                if (type === 'hss_rect') return selected.h || selected.w || 0;
                if (type === 'hss_circ') return selected.d || 0;
                if (type === 'w_beam') return selected.d || 0;
                if (type === 'angles') return selected.leg2 || selected.leg1 || 0;
                if (type === 'plate') return selected.t || 0;
            }
            return customVal;
        };

        const getPicketDimension = (type, size, customVal) => {
            if (type === 'none' || size === 'NONE') return 0;
            if (size === 'CUSTOM') return customVal;
            const shapes = SHAPES_DB[type] || [];
            const selected = shapes.find(s => s.id === size);
            if (selected) {
                if (type === 'hss_rect') return selected.w || 0;
                if (type === 'hss_circ') return selected.d || 0;
                if (type === 'w_beam') return selected.bf || 0;
                if (type === 'angles') return selected.leg1 || 0;
                if (type === 'plate') return selected.t || 0;
            }
            return customVal;
        };

        const drawViewportLeader = (tcx, tcy, side, markText, leaderId) => {
            if (!markText) return;
            if (leaderId && hiddenAnnotations.has(leaderId)) return;
            
            let dx = 0, dy = 0;
            const defOff = defaultLeaderOffsets[leaderId] || { dx: 0, dy: 0 };
            if (leaderId && annotationOffsets[leaderId]) {
                dx = annotationOffsets[leaderId].dx;
                dy = annotationOffsets[leaderId].dy;
            } else {
                dx = defOff.dx;
                dy = defOff.dy;
            }
            
            let descLabel = "";
            let lengthVal = 0;
            const rad = (vals.slope || 0) * Math.PI / 180;
            const cos = Math.cos(rad);
            const isGates = vals.railsGatesType === 'gates';
            const isExtended = !isGates && (vals.postHeight > vals.fenceHeight);
            
            if (leaderId === "leader-top-rail") {
                descLabel = isGates ? "TOP RUNNER" : "TOP RAIL";
                lengthVal = vals.length;
                if (cos > 0.001) lengthVal = vals.length / cos;
            } else if (leaderId === "leader-bot-rail" || leaderId === "leader-mid-rail") {
                descLabel = leaderId === "leader-bot-rail" 
                    ? (isGates ? "BOTTOM RUNNER" : "BOTTOM RAIL")
                    : (isGates ? "MID RUNNER" : "MID RAIL");
                
                if (shapeCategory.value === 'rail_catalog') {
                    const style = vals.railStyle || 'classical';
                    let postW = 1.5;
                    if (style !== 'classical' && style !== 'executive') {
                        postW = getPicketDimension(vals.postType, vals.postSize, vals.postW || 1.5);
                    }
                    const startXBound = (vals.leftPost === 'yes') ? postW : 0;
                    const endXBound = (vals.rightPost === 'yes') ? (vals.length - postW) : vals.length;
                    const midPostCount = (vals.midPosts === 'default' || vals.midPosts === 'yes') ? Math.max(0, Math.ceil(vals.length / 48) - 1) : ((vals.midPosts === 'custom' || vals.midPosts === 'custom_standard') ? (parseInt(vals.midPostCount) || 0) : 0);
                    const clearWidth = endXBound - startXBound - midPostCount * postW;
                    const spanW = clearWidth / (midPostCount + 1);
                    lengthVal = spanW;
                } else {
                    lengthVal = vals.length;
                    if (isExtended) lengthVal = vals.length - (vals.leftPostW || vals.postW || 1.5) - (vals.rightPostW || vals.postW || 1.5);
                    if (cos > 0.001) lengthVal = lengthVal / cos;
                }
            } else if (leaderId === "leader-left-post") {
                descLabel = isGates ? "LEFT RUNNER" : "LEFT POST";
                lengthVal = isGates ? vals.fenceHeight : vals.postHeight;
            } else if (leaderId === "leader-right-post") {
                descLabel = isGates ? "RIGHT RUNNER" : "RIGHT POST";
                lengthVal = isGates ? vals.fenceHeight : vals.postHeight;
            } else if (leaderId === "leader-post") {
                descLabel = "POST";
                lengthVal = vals.postHeight;
            } else if (leaderId === "leader-mid-post") {
                descLabel = "MID POST";
                const isExecutiveStyle = ((vals.railStyle || 'classical') === 'executive' || (vals.railStyle || 'classical') === 'executive_custom');
                const runnerH = isGates ? vals.fenceHeight : vals.postHeight;
                lengthVal = (vals.railStyle === 'executive') ? 44.25 : (isExecutiveStyle ? runnerH : (runnerH - (vals.topRailH || 1.5)));
            } else if (leaderId === "leader-pickets") {
                descLabel = "PICKET";
                let topH = (cat === 'rail_catalog') ? ((vals.railStyle === 'classical' || vals.railStyle === 'executive') ? 1.5 : (vals.topRailH || 1.5)) : (vals.topRailH || 1.5);
                let botH = (cat === 'rail_catalog') ? ((vals.railStyle === 'classical' || vals.railStyle === 'executive') ? 1.5 : (vals.botRailH || 1.5)) : (vals.botRailH || 1.5);
                let midH = (cat === 'rail_catalog') ? (vals.railStyle === 'classical' ? 0 : (vals.railStyle === 'executive' ? 1.5 : (vals.midRailH || 1.5))) : (vals.midH || 1.5);
                let midRailGap = vals.midRailGap !== undefined ? vals.midRailGap : 12.0;
                let kickPlateH = vals.kickPlateH || 12.0;
                
                let picketBottomY, picketTopY;
                if (cat === 'rail_catalog') {
                    const style = vals.railStyle || 'classical';
                    let pHeight = (style === 'classical' || style === 'executive') ? 45.75 : (vals.postHeight || 36);
                    let fHeight = (style === 'classical') ? 41.0 : (style === 'executive' ? 41.0 : (vals.fenceHeight || 36));
                    let botY = pHeight - fHeight;
                    let midMarkActive = style !== 'classical' && vals.midRailType !== 'none';
                    
                    picketBottomY = botY + botH;
                    picketTopY = (midMarkActive) ? (pHeight - topH - midRailGap - midH) : (pHeight - topH);
                } else if (cat === 'rails_gates') {
                    if (isGates) {
                        picketBottomY = (vals.midRailType !== 'none') ? midRailGap : ((vals.kickPlate !== 'none') ? (vals.kickPlateWeld === 'inner' ? botH + kickPlateH : kickPlateH) : botH);
                        picketTopY = vals.fenceHeight - topH;
                    } else {
                        picketBottomY = (vals.midRailType !== 'none') ? (vals.postHeight - vals.midRailGap) : ((vals.postHeight > vals.fenceHeight) ? (vals.postHeight - vals.fenceHeight + botH) : botH);
                        picketTopY = vals.postHeight - topH;
                    }
                } else { 
                    const noPosts = (vals.postType === 'none' || vals.postHeight === 0 || vals.postSpacing === 0);
                    const botY = noPosts ? 4.0 : (vals.postHeight - vals.topGap - vals.fenceHeight);
                    const topY = noPosts ? (4.0 + vals.fenceHeight - topH) : (vals.postHeight - vals.topGap - topH);
                    picketBottomY = (vals.botRailType === 'none') ? (botY + 4) : (botY + botH);
                    picketTopY = (vals.midRailType !== 'none') ? (topY - midRailGap - midH) : topY;
                }
                lengthVal = picketTopY - picketBottomY;
            } else if (leaderId === "leader-kickplate") {
                descLabel = "KICK PLATE";
                const isOuter = (vals.kickPlateWeld === 'outer');
                lengthVal = isOuter ? vals.length : (vals.length - (vals.leftPostW || vals.postW || 1.5) - (vals.rightPostW || vals.postW || 1.5));
            }

            let fullLabelText = "";
            if (leaderId === "leader-mesh-fb") {
                descLabel = "MESH FRAME FB";
                const sizeStr = vals.meshFbSize || "FB1x1/8";
                fullLabelText = `${markText}H/${markText}V (${descLabel} - ${sizeStr})`;
            } else if (leaderId === "leader-mesh-panel") {
                descLabel = vals.meshType === 'mesh' ? "WWM WIRE MESH" : "EXPANDED METAL";
                const sizeStr = vals.meshSize || "WWM2x2x0.135";
                
                const lPostW = getPicketDimension(vals.leftPostType, vals.leftPostSize, vals.leftPostW);
                const rPostW = getPicketDimension(vals.rightPostType, vals.rightPostSize, vals.rightPostW);
                const tH = getProfileDimension(vals.topRailType, vals.topRailSize, vals.topRailH);
                const bH = getProfileDimension(vals.botRailType, vals.botRailSize, vals.botRailH);
                const kpH = vals.kickPlateH || 12.0;
                
                const picketBottomY = (vals.midRailType !== 'none') ? vals.midRailGap : ((vals.kickPlate !== 'none') ? (vals.kickPlateWeld === 'inner' ? bH + kpH : kpH) : bH);
                const mOpeningH = (vals.fenceHeight - tH) - picketBottomY;
                const mOpeningW = vals.length - lPostW - rPostW;
                fullLabelText = `${markText} (${descLabel} - ${sizeStr} - ${formatFraction(mOpeningW)}x${formatFraction(mOpeningH)})`;
            } else if (leaderId === "leader-panicbar") {
                descLabel = "PANIC BAR PLATE";
                const pbpW = vals.panicBarPlateW || 8.0;
                const pbpT = vals.panicBarPlateSize || 'PL3/16';
                const pbpDesc = formatPlateDesc(pbpT, pbpW);
                const lPostW = getPicketDimension(vals.leftPostType, vals.leftPostSize, vals.leftPostW);
                const rPostW = getPicketDimension(vals.rightPostType, vals.rightPostSize, vals.rightPostW);
                const pbpLen = vals.length - lPostW - rPostW;
                fullLabelText = `${markText} (${descLabel} - ${pbpDesc} - ${formatFraction(pbpLen)})`;
            } else {
                fullLabelText = lengthVal > 0 
                    ? `${markText} (${descLabel} - ${formatFraction(lengthVal)})`
                    : `${markText} (${descLabel})`;
            }

            let tcx_offset = tcx;
            let tcy_offset = tcy;
            if (leaderId && annotationOffsets[leaderId]) {
                tcx_offset += annotationOffsets[leaderId].tdx || 0;
                tcy_offset += annotationOffsets[leaderId].tdy || 0;
            }
            const slopeRad = (vals.slope || 0) * Math.PI / 180;
            const cosS = Math.cos(slopeRad);
            const sinS = Math.sin(slopeRad);
            const rx = tcx_offset * cosS - tcy_offset * sinS;
            const ry = tcx_offset * sinS + tcy_offset * cosS;
            const [svgCx, svgCy] = cadToSvg(rx, ry, scale, extents);
            
            const defaultLabelX = (side === "left") ? (0 - 55 * scaleFactor) : (actualWidthInches * scale + 55 * scaleFactor);
            const defaultLabelY = svgCy - 12 * scaleFactor;
            
            const labelX = defaultLabelX + (dx * scale);
            const labelY = defaultLabelY - (dy * scale);
            
            let finalLabelX = labelX;
            let finalLabelY = labelY;
            
            // Prevent vertical overlap on the same side margin (left or right)
            let attempts = 0;
            while (attempts < 20) {
                let collision = false;
                for (const lead of placedViewportLeaders) {
                    if (Math.abs(lead.x - finalLabelX) < 10 * scaleFactor && Math.abs(lead.y - finalLabelY) < 4.5 * scaleFactor) {
                        collision = true;
                        break;
                    }
                }
                if (!collision) break;
                finalLabelY += 5.5 * scaleFactor; // shift down
                attempts++;
            }
            placedViewportLeaders.push({ x: finalLabelX, y: finalLabelY });
            
            const isSelected = selectedAnnotId === leaderId;
            const leaderColor = isSelected ? "#ff00ff" : "#ffaa00";
            const textColor = isSelected ? "#ff00ff" : "#ffffff";
            
            // Get leader overrides
            const spec = (leaderId && annotationProperties[leaderId]) || {};
            const activeFontSize = spec.fontSize !== undefined ? spec.fontSize : 11;
            const activeText = spec.text !== undefined && spec.text !== null ? spec.text : fullLabelText;
            let cleanedText = activeText || "";
            if (cleanedText) {
                cleanedText = cleanedText.split(/[\s(]/)[0];
            }

            let leader;
            if (leaderId === "leader-mid-post") {
                const leftRailingEdge_svg = cadToSvg(0, 0, scale, extents)[0];
                const rightRailingEdge_svg = cadToSvg(vals.length, 0, scale, extents)[0];
                let shoulderEndX_svg;
                if (side === "left") {
                    shoulderEndX_svg = Math.min(svgCx - 10 * scaleFactor, leftRailingEdge_svg + 15.0 * scaleFactor);
                } else {
                    shoulderEndX_svg = Math.max(svgCx + 10 * scaleFactor, rightRailingEdge_svg - 15.0 * scaleFactor);
                }
                
                leader = svg.ownerDocument.createElementNS("http://www.w3.org/2000/svg", "path");
                leader.setAttribute("d", `M ${finalLabelX} ${finalLabelY} L ${shoulderEndX_svg} ${finalLabelY} L ${svgCx} ${svgCy}`);
            } else {
                leader = svg.ownerDocument.createElementNS("http://www.w3.org/2000/svg", "line");
                leader.setAttribute("x1", finalLabelX);
                leader.setAttribute("y1", finalLabelY);
                leader.setAttribute("x2", svgCx);
                leader.setAttribute("y2", svgCy);
            }
            leader.setAttribute("stroke", leaderColor);
            leader.setAttribute("stroke-width", 1.2 * scaleFactor);
            leader.setAttribute("fill", "none");
            leader.setAttribute("marker-end", "url(#leader-arrow)");
            gAnnots.appendChild(leader);
            
            const dot = svg.ownerDocument.createElementNS("http://www.w3.org/2000/svg", "circle");
            dot.setAttribute("cx", svgCx);
            dot.setAttribute("cy", svgCy);
            dot.setAttribute("r", 4.5 * scaleFactor);
            dot.setAttribute("fill", leaderColor);
            dot.setAttribute("stroke", "#ffffff");
            dot.setAttribute("stroke-width", 1.2 * scaleFactor);
            dot.setAttribute("class", "annot-grip-draggable");
            dot.setAttribute("data-grip-dim-idx", leaderId);
            dot.setAttribute("data-grip-name", "leader-target");
            dot.setAttribute("style", "cursor: pointer; pointer-events: auto;");
            gAnnots.appendChild(dot);
            
            const textLenEstimate = cleanedText.length * (activeFontSize * 0.59) * scaleFactor;
            const shelf = svg.ownerDocument.createElementNS("http://www.w3.org/2000/svg", "line");
            if (side === "left") {
                shelf.setAttribute("x1", finalLabelX);
                shelf.setAttribute("y1", finalLabelY);
                shelf.setAttribute("x2", finalLabelX - textLenEstimate - 6 * scaleFactor);
                shelf.setAttribute("y2", finalLabelY);
            } else {
                shelf.setAttribute("x1", finalLabelX);
                shelf.setAttribute("y1", finalLabelY);
                shelf.setAttribute("x2", finalLabelX + textLenEstimate + 6 * scaleFactor);
                shelf.setAttribute("y2", finalLabelY);
            }
            shelf.setAttribute("stroke", leaderColor);
            shelf.setAttribute("stroke-width", 1.2 * scaleFactor);
            gAnnots.appendChild(shelf);

            // Collision avoidance for leader label (X-shifting only if needed)
            let leaderLabelX = side === "left" ? (finalLabelX - 3 * scaleFactor) : (finalLabelX + 3 * scaleFactor);
            let leaderLabelY = finalLabelY - 3 * scaleFactor;
            let leaderBBox = computeLabelBBox(leaderLabelX, leaderLabelY, cleanedText, activeFontSize * scaleFactor);
            if (checkCollision(leaderBBox)) {
                const offset = 8 * scaleFactor;
                if (side === "left") {
                    leaderLabelX -= offset;
                } else {
                    leaderLabelX += offset;
                }
                leaderBBox = computeLabelBBox(leaderLabelX, leaderLabelY, cleanedText, activeFontSize * scaleFactor);
            }
            registerLabel(leaderId, leaderBBox);

            const textNode = svg.ownerDocument.createElementNS("http://www.w3.org/2000/svg", "text");
            textNode.setAttribute("x", leaderLabelX);
            textNode.setAttribute("y", leaderLabelY);
            textNode.setAttribute("fill", textColor);
            textNode.setAttribute("font-family", "'JetBrains Mono', monospace, sans-serif");
            textNode.setAttribute("font-size", (activeFontSize * scaleFactor) + "px");
            textNode.setAttribute("font-weight", "bold");
            textNode.setAttribute("text-anchor", side === "left" ? "end" : "start");
            textNode.textContent = cleanedText;
            
            textNode.setAttribute("class", "annot-text-draggable");
            textNode.setAttribute("style", "cursor: move; pointer-events: auto;");
            textNode.setAttribute("data-annot-id", leaderId);
            textNode.setAttribute("data-annot-type", "leader");
            
            gAnnots.appendChild(textNode);
        };

        if (cat === 'rail_catalog') {
            const style = vals.railStyle || 'classical';
            const props = getResolvedPanelProperties(vals, style);
            let picketType = props ? props.picketType : 'hss_rect';
            let pHeight = props ? props.pHeight : 45.75;
            let fHeight = props ? props.fHeight : 41.0;
            let topH = props ? props.topRailH : 1.5;
            let botH = props ? props.botRailH : 1.5;
            let midRailType = props ? props.midRailType : 'none';
            let midH = props ? props.midRailH : 1.5;
            let postW = props ? props.postW : 1.5;
            let picketW = props ? props.picketW : 0.5;
            let picketSpacing = props ? props.picketSpacing : 4.0;
            midPostCount = (vals.midPosts === 'default' || vals.midPosts === 'yes') ? Math.max(0, Math.ceil(vals.length / 48) - 1) : ((vals.midPosts === 'custom' || vals.midPosts === 'custom_standard') ? (parseInt(vals.midPostCount) || 0) : 0);
            let botY = pHeight - fHeight;
            let midRailGap = props ? props.midRailGap : 12.0;

            // --- HORIZONTAL DIMENSIONS (TOP) ---
            // Tier 1 (Overall Length)
            drawViewportDimension(0, pHeight, vals.length, pHeight, -28, formatFraction(vals.length), "middle", "dim-width");

            // Post Centers List
            const postCenters = [];
            postCenters.push((vals.leftPost === 'yes') ? (postW / 2) : 0);
            if (vals.midPosts !== 'none' && midPostCount > 0) {
                const resolvedCenters = resolveMidPostCenters(vals.length, vals.leftPost, vals.rightPost, vals.midPosts, midPostCount, postW, customSpacings, style);
                resolvedCenters.forEach(midCx => {
                    postCenters.push(midCx);
                });
            }
            postCenters.push((vals.rightPost === 'yes') ? (vals.length - postW / 2) : vals.length);

            // Tier 2 (Spans)
            for (let i = 0; i < postCenters.length - 1; i++) {
                const c1 = postCenters[i];
                const c2 = postCenters[i+1];
                drawViewportDimension(c1, pHeight, c2, pHeight, -20, formatFraction(c2 - c1), "middle", `dim-span-${i}`);
            }

            // Tier 3 (Picket Patterns)
            if (picketType !== 'none') {
                for (let i = 0; i < postCenters.length - 1; i++) {
                    const c1 = postCenters[i];
                    const c2 = postCenters[i+1];
                    const spanDist = c2 - c1;
                    const numP = Math.max(0, Math.floor(spanDist / picketSpacing - 0.001));

                    const isLeftPost = (i > 0) || (vals.leftPost === 'yes');
                    const isRightPost = (i < postCenters.length - 2) || (vals.rightPost === 'yes');
                    const alignToRight = (!isLeftPost && isRightPost);

                    if (numP >= 2) {
                        let p1, p2, looseEndSpacing;
                        if (alignToRight) {
                            p2 = c2 - picketSpacing;
                            p1 = c2 - numP * picketSpacing;
                            looseEndSpacing = p1 - c1;

                            drawViewportDimension(c1, pHeight, p1, pHeight, -12, formatFraction(looseEndSpacing), "middle", `dim-picket-end-${i}`);
                            drawViewportDimension(p1, pHeight, p2, pHeight, -12, formatFraction(p2 - p1), "middle", `dim-picket-center-${i}`);
                            drawViewportDimension(p2, pHeight, c2, pHeight, -12, formatFraction(picketSpacing), "middle", `dim-picket-start-${i}`);
                        } else {
                            p1 = c1 + picketSpacing;
                            p2 = c1 + numP * picketSpacing;
                            looseEndSpacing = c2 - p2;

                            drawViewportDimension(c1, pHeight, p1, pHeight, -12, formatFraction(picketSpacing), "middle", `dim-picket-start-${i}`);
                            drawViewportDimension(p1, pHeight, p2, pHeight, -12, formatFraction(p2 - p1), "middle", `dim-picket-center-${i}`);
                            drawViewportDimension(p2, pHeight, c2, pHeight, -12, formatFraction(looseEndSpacing), "middle", `dim-picket-end-${i}`);
                        }

                        // Text Label: (numP - 1) SPACES @ picketSpacing O/C
                        const labelText = `(${numP - 1}) SPACES @ ${formatFraction(picketSpacing)} O/C`;
                        const slopeRad = (vals.slope || 0) * Math.PI / 180;
                        const cosS = Math.cos(slopeRad);
                        const sinS = Math.sin(slopeRad);
                        const cx = (p1 + p2) / 2;
                        const cy = pHeight;
                        const rx = cx * cosS - cy * sinS;
                        const ry = cx * sinS + cy * cosS;
                        const [midX_svg, midY_svg] = cadToSvg(rx, ry, scale, extents);
                        const labelDeltaY = annotationOffsets[`dim-picket-text-${i}`] !== undefined ? annotationOffsets[`dim-picket-text-${i}`] : 0;
                        const labelY_svg_correct = midY_svg + (-6.0 / 25.4 + labelDeltaY) * scale;
                        const textNode = drawText(labelText, midX_svg, labelY_svg_correct);
                        textNode.setAttribute("class", "annot-text-draggable");
                        textNode.setAttribute("style", "cursor: move; pointer-events: auto;");
                        textNode.setAttribute("data-annot-id", `dim-picket-text-${i}`);
                        textNode.setAttribute("data-annot-type", "dimension");
                        textNode.setAttribute("data-axis", "Y");
                    } else if (numP === 1) {
                        if (alignToRight) {
                            const pCenter = c2 - picketSpacing;
                            const looseEndSpacing = pCenter - c1;
                            drawViewportDimension(c1, pHeight, pCenter, pHeight, -12, formatFraction(looseEndSpacing), "middle", `dim-picket-end-${i}`);
                            drawViewportDimension(pCenter, pHeight, c2, pHeight, -12, formatFraction(picketSpacing), "middle", `dim-picket-start-${i}`);
                        } else {
                            const pCenter = c1 + picketSpacing;
                            const looseEndSpacing = c2 - pCenter;
                            drawViewportDimension(c1, pHeight, pCenter, pHeight, -12, formatFraction(picketSpacing), "middle", `dim-picket-start-${i}`);
                            drawViewportDimension(pCenter, pHeight, c2, pHeight, -12, formatFraction(looseEndSpacing), "middle", `dim-picket-end-${i}`);
                        }
                    } else {
                        drawViewportDimension(c1, pHeight, c2, pHeight, -12, formatFraction(spanDist), "middle", `dim-picket-none-${i}`);
                    }
                }
            }

            // --- HORIZONTAL DIMENSIONS (BOTTOM - CLEAR OPENINGS) ---
            const clearSpans = [];
            let lastX = 0;
            
            const allPosts = [];
            if (vals.leftPost === 'yes') {
                allPosts.push({ startX: 0, endX: postW });
            }
            if (vals.midPosts !== 'none' && midPostCount > 0) {
                const resolvedCenters = resolveMidPostCenters(vals.length, vals.leftPost, vals.rightPost, vals.midPosts, midPostCount, postW, customSpacings, style);
                resolvedCenters.forEach(midCx => {
                    allPosts.push({ startX: midCx - postW/2, endX: midCx + postW/2 });
                });
            }
            if (vals.rightPost === 'yes') {
                allPosts.push({ startX: vals.length - postW, endX: vals.length });
            }

            for (let i = 0; i < allPosts.length; i++) {
                const p = allPosts[i];
                if (p.startX > lastX + 0.01) {
                    clearSpans.push({ start: lastX, end: p.startX });
                }
                lastX = p.endX;
            }
            if (vals.length > lastX + 0.01) {
                clearSpans.push({ start: lastX, end: vals.length });
            }

            clearSpans.forEach((span, idx) => {
                drawViewportDimension(span.start, 0, span.end, 0, 12, formatFraction(span.end - span.start), "middle", `dim-clear-${idx}`);
            });

            // --- VERTICAL DIMENSIONS (RIGHT / LEFT for Left Return) ---
            const isLeftReturn = (panelType === 'leftReturn');
            const vDimX = isLeftReturn ? 0 : vals.length;
            const vDimOffset1 = isLeftReturn ? -8 : 8;
            const vDimOffset2 = isLeftReturn ? -16 : 16;
            const vDimOffset3 = isLeftReturn ? -24 : 24;

            drawViewportDimension(vDimX, pHeight - topH, vDimX, pHeight, vDimOffset1, formatFraction(topH), "left", "dim-vert-top-cap");
            drawViewportDimension(vDimX, botY + botH, vDimX, pHeight - topH, vDimOffset1, formatFraction(pHeight - topH - (botY + botH)), "middle", "dim-vert-mid-rail");
            drawViewportDimension(vDimX, botY, vDimX, botY + botH, vDimOffset1, formatFraction(botH), "left", "dim-vert-bot-rail");
            drawViewportDimension(vDimX, 0, vDimX, botY, vDimOffset1, formatFraction(botY), "middle", "dim-vert-ground");
            
            drawViewportDimension(vDimX, botY, vDimX, pHeight, vDimOffset2, formatFraction(fHeight), "middle", "dim-vert-fence-height");
            drawViewportDimension(vDimX, 0, vDimX, pHeight, vDimOffset3, formatFraction(pHeight), "middle", "dim-height");

            // --- VERTICAL DIMENSIONS (LEFT) ---
            if (midPostCount > 0) {
                const firstMidPostCx = postCenters[1];
                const mpH_dim = (style === 'executive') ? 44.25 : (pHeight - topH);
                drawViewportDimension(firstMidPostCx, 0, firstMidPostCx, mpH_dim, -8, formatFraction(mpH_dim), "middle", "dim-vert-left-midpost");
            }
        } else {
            // Standard width and height dimensions
            drawViewportDimension(cadMinX / scale, cadMaxY / scale, cadMaxX / scale, cadMaxY / scale, -35, formatFraction(actualWidthInches), "middle", "dim-width");
            drawViewportDimension(cadMinX / scale, cadMinY / scale, cadMinX / scale, cadMaxY / scale, -35, formatFraction(actualHeightInches), "middle", "dim-height");
        }

        const topMark = getMark(vals.topRailType !== 'none');
        const botMark = getMark(vals.botRailType !== 'none');
        const hasLeft = (vals.leftPost === 'yes');
        const hasRight = (vals.rightPost === 'yes');

        let countLeftPost = 0;
        let countRightPost = 0;

        countLeftPost = hasLeft ? 1 : 0;
        countRightPost = hasRight ? 1 : 0;

        const midMark = getMark(cat === 'rail_catalog' ? (vals.railStyle === 'executive' || vals.railStyle === 'villa_balcony' || vals.railStyle === 'villa_custom' || vals.railStyle === 'executive_custom' || (vals.railStyle.includes('custom') && vals.midRailType !== 'none')) : (vals.midRailType !== 'none'));
        const leftMark = getMark(cat === 'rail_catalog' ? (countLeftPost > 0 && vals.postType !== 'none') : (vals.leftPostType !== 'none'));
        const rightMark = getMark(cat === 'rail_catalog' ? (countRightPost > 0 && vals.postType !== 'none') : (vals.rightPostType !== 'none'));
        const midPostMark = getMark(cat === 'rail_catalog' ? (vals.midPosts !== 'none' && midPostCount > 0 && vals.postType !== 'none') : (vals.railsGatesType !== 'gates' && midPostCount > 0 && vals.midPostType !== 'none'));
        
        let picketMark, kpMark, numPickets, leftPostW, rightPostW, midPostW, clearWidth, postW, pickW, effectivePostW;
        if (cat === 'rails_gates') {
            const isGates = vals.railsGatesType === 'gates';
            leftPostW = getPicketDimension(vals.leftPostType, vals.leftPostSize, vals.leftPostW);
            rightPostW = getPicketDimension(vals.rightPostType, vals.rightPostSize, vals.rightPostW);
            midPostW = getPicketDimension(vals.midPostType, vals.midPostSize, vals.midPostW);
            const topH = getProfileDimension(vals.topRailType, vals.topRailSize, vals.topRailH);
            const botH = getProfileDimension(vals.botRailType, vals.botRailSize, vals.botRailH);
            pickW = getPicketDimension(vals.picketType, vals.picketSize, vals.picketW);
            const kickPlateH = vals.kickPlateH || 12.0;
            midPostCount = parseInt(vals.midPostCount) || 0;

            const picketPositions = getPicketPositions(
                vals.railStyle || 'classical',
                vals.length,
                leftPostW,
                rightPostW,
                pickW,
                vals.picketSpacing,
                midPostCount,
                midPostW
            );
            numPickets = picketPositions.length;
            let finalPicketsCount = numPickets;
            picketMark = getMark(vals.picketType !== 'none' && finalPicketsCount > 0);
            kpMark = getMark(isGates && vals.kickPlate && vals.kickPlate !== 'none');
            const meshFbMark = getMark(isGates && vals.meshType && vals.meshType !== 'none');
            const meshPanelMark = getMark(isGates && vals.meshType && vals.meshType !== 'none');
            const pbpMark = getMark(isGates && vals.panicBarPlate === 'yes');

            // 1. Top Rail
            if (topMark) {
                const ty = isGates ? (vals.fenceHeight - topH/2) : (vals.postHeight - topH/2);
                drawViewportLeader(vals.length * 0.25, ty, "left", topMark, "leader-top-rail");
            }
            // 2. Bottom Rail
            if (botMark) {
                const by = isGates ? (botH/2) : ((vals.postHeight > vals.fenceHeight) ? (vals.postHeight - vals.fenceHeight + botH/2) : (botH/2));
                drawViewportLeader(vals.length * 0.25, by, "left", botMark, "leader-bot-rail");
            }
            // 3. Left Post
            if (leftMark) {
                const ly = isGates ? (vals.fenceHeight * 0.5) : (vals.postHeight * 0.5);
                drawViewportLeader(leftPostW / 2, ly, "left", leftMark, "leader-left-post");
            }
            // 4. Right Post
            if (rightMark) {
                const ry = isGates ? (vals.fenceHeight * 0.5) : (vals.postHeight * 0.5);
                drawViewportLeader(vals.length - rightPostW/2, ry, "right", rightMark, "leader-right-post");
            }
            // 5. Mid Rail
            if (midMark) {
                const my = isGates ? (vals.midRailGap - 1.5/2) : (vals.postHeight - vals.midRailGap - 1.5/2);
                drawViewportLeader(vals.length * 0.75, my, "right", midMark, "leader-mid-rail");
            }
            // 6. Pickets
            if (picketMark && numPickets > 0) {
                const clearWidth = vals.length - leftPostW - rightPostW;
                const usedWidth = (numPickets - 1) * vals.picketSpacing + pickW;
                const startX = leftPostW + (clearWidth - usedWidth) / 2;
                const midIdx = Math.floor(numPickets / 2);
                const pickCx = startX + midIdx * vals.picketSpacing + pickW / 2;
                
                let picketBottomY, picketTopY;
                if (isGates) {
                    picketBottomY = (vals.midRailType !== 'none') ? vals.midRailGap : ((vals.kickPlate !== 'none') ? (vals.kickPlateWeld === 'outer' ? kickPlateH : botH + kickPlateH) : botH);
                    picketTopY = vals.fenceHeight - topH;
                } else {
                    picketBottomY = (vals.midRailType !== 'none') ? (vals.postHeight - vals.midRailGap) : ((vals.postHeight > vals.fenceHeight) ? (vals.postHeight - vals.fenceHeight + botH) : botH);
                    picketTopY = vals.postHeight - topH;
                }
                const pickCy = (picketBottomY + picketTopY) / 2;
                drawViewportLeader(pickCx, pickCy, "right", picketMark, "leader-pickets");
            }
            // 7. Kick Plate
            if (kpMark) {
                const kpCenterY = (vals.kickPlateWeld === 'outer' ? 0 : botH) + kickPlateH / 2;
                drawViewportLeader(vals.length * 0.75, kpCenterY, "right", kpMark, "leader-kickplate");
            }
            // 8. Wire Mesh / Expanded Metal Frame FB and Panel
            if (isGates && vals.meshType && vals.meshType !== 'none') {
                const picketBottomY = (vals.midRailType !== 'none') ? vals.midRailGap : ((vals.kickPlate !== 'none') ? (vals.kickPlateWeld === 'outer' ? kickPlateH : botH + kickPlateH) : botH);
                const mOpeningH = (vals.fenceHeight - topH) - picketBottomY;
                const meshCenterY = picketBottomY + mOpeningH / 2;
                
                if (meshFbMark) {
                    drawViewportLeader(leftPostW + 4.0, meshCenterY + 4.0, "left", meshFbMark, "leader-mesh-fb");
                }
                if (meshPanelMark) {
                    drawViewportLeader(vals.length * 0.55, meshCenterY, "right", meshPanelMark, "leader-mesh-panel");
                }
            }
            // 9. Panic Bar Plate
            if (isGates && vals.panicBarPlate === 'yes' && pbpMark) {
                const pbpCenterGap = vals.panicBarPlateGap !== undefined ? vals.panicBarPlateGap : 36.0;
                drawViewportLeader(vals.length * 0.5, pbpCenterGap, "right", pbpMark, "leader-panicbar");
            }
        } else if (cat === 'fence') {
            postW = getPicketDimension(vals.postType, vals.postSize, vals.postW);
            const topH = getProfileDimension(vals.topRailType, vals.topRailSize, vals.topRailH);
            const botH = getProfileDimension(vals.botRailType, vals.botRailSize, vals.botRailH);
            pickW = getPicketDimension(vals.picketType, vals.picketSize, vals.picketW);
            const midRailGap = vals.midRailGap !== undefined ? vals.midRailGap : 12.0;

            const noPosts = (vals.postType === 'none' || vals.postHeight === 0 || vals.postSpacing === 0);
            const numSpans = noPosts ? 1 : Math.max(1, Math.round(vals.length / (vals.postSpacing || 1)));
            const actualPostSpacing = noPosts ? vals.length : (vals.length / numSpans);
            effectivePostW = noPosts ? 0 : postW;
            clearWidth = actualPostSpacing - effectivePostW;
            numPickets = vals.picketSpacing > 0 ? Math.floor((clearWidth - pickW) / vals.picketSpacing) : 0;
            const totalPickets = numPickets * numSpans;

            const postMark = getMark(!noPosts && vals.postType !== 'none');
            picketMark = getMark(vals.picketType !== 'none' && totalPickets > 0);

            // 1. Top Rail
            if (topMark) {
                const ty = vals.postHeight - vals.topGap - topH/2;
                drawViewportLeader(vals.length * 0.25, ty, "left", topMark, "leader-top-rail");
            }
            // 2. Post
            if (postMark) {
                const py = vals.postHeight * 0.5;
                drawViewportLeader(postW/2, py, "left", postMark, "leader-post");
            }
            // 3. Bottom Rail
            if (botMark) {
                const by = vals.postHeight - vals.topGap - vals.fenceHeight + botH/2;
                drawViewportLeader(vals.length * 0.25, by, "left", botMark, "leader-bot-rail");
            }
            // 4. Mid Rail
            if (midMark) {
                const my = vals.postHeight - vals.topGap - topH - midRailGap - midH/2;
                drawViewportLeader(vals.length * 0.75, my, "right", midMark, "leader-mid-rail");
            }
            // 5. Pickets
            if (picketMark && numPickets > 0) {
                const usedWidth = (numPickets - 1) * vals.picketSpacing + pickW;
                const startX = (noPosts ? 0 : postW) + (clearWidth - usedWidth) / 2;
                const midIdx = Math.floor(numPickets / 2);
                const pickCx = startX + midIdx * vals.picketSpacing + pickW/2;
                
                const botY = noPosts ? 4.0 : (vals.postHeight - vals.topGap - vals.fenceHeight);
                const topY = noPosts ? (4.0 + vals.fenceHeight - topH) : (vals.postHeight - vals.topGap - topH);
                const picketY = (vals.botRailType === 'none') ? (botY + 4) : (botY + botH);
                const picketTopY = (vals.midRailType !== 'none') ? (topY - midRailGap - midH) : topY;
                const pickCy = (picketY + picketTopY)/2;
                drawViewportLeader(pickCx, pickCy, "right", picketMark, "leader-pickets");
            }
        } else if (cat === 'rail_catalog') {
            const style = vals.railStyle || 'classical';
            let pHeight = (style === 'classical' || style === 'executive') ? 45.75 : (vals.postHeight || 36);
            let fHeight = (style === 'classical' || style === 'executive') ? 41.0 : (vals.fenceHeight || 36);
            let topH = (style === 'classical' || style === 'executive') ? 1.5 : getProfileDimension(vals.topRailType, vals.topRailSize, vals.topRailH || 1.5);
            let botH = (style === 'classical' || style === 'executive') ? 1.5 : getProfileDimension(vals.botRailType, vals.botRailSize, vals.botRailH || 1.5);
            let midH = (style === 'classical') ? 0 : (style === 'executive' ? 1.5 : getProfileDimension(vals.midRailType, vals.midRailSize, vals.midRailH || 1.5));
            postW = (style === 'classical' || style === 'executive') ? 1.5 : getPicketDimension(vals.postType, vals.postSize, vals.postW || 1.5);
            let picketW = (style === 'classical' || style === 'executive') ? 0.5 : getPicketDimension(vals.picketType, vals.picketSize, vals.picketW || 0.5);
            let picketSpacing = (style === 'classical') ? 4.0 : (style === 'executive' ? 4.0 : (vals.picketSpacing || 4.0));
            midPostCount = (vals.midPosts === 'default' || vals.midPosts === 'yes') ? Math.max(0, Math.ceil(vals.length / 48) - 1) : ((vals.midPosts === 'custom' || vals.midPosts === 'custom_standard') ? (parseInt(vals.midPostCount) || 0) : 0);
            let botY = pHeight - fHeight;
            let midRailGap = (style === 'classical') ? 0 : (style === 'executive' ? 3.0 : (vals.midRailGap || 12.0));
            let picketType = (style === 'classical' || style === 'executive') ? 'hss_rect' : ((style === 'urban_balcony' || style === 'villa_balcony' || style === 'urban_custom' || style === 'villa_custom') ? 'none' : (vals.picketType || 'hss_rect'));

            picketMark = getMark(picketType !== 'none');
            const meshFbMark = getMark(style === 'urban_balcony' || style === 'villa_balcony' || style === 'urban_custom' || style === 'villa_custom');
            const meshPanelMark = getMark(style === 'urban_balcony' || style === 'villa_balcony' || style === 'urban_custom' || style === 'villa_custom');

            const railSpans = resolveRailMarksAndSpans(vals, activeDwgNo, cat, style, postW);

            const isLeftReturn = (panelType === 'leftReturn');
            const leaderSide = isLeftReturn ? "right" : "left";

            // 1. Top Rail
            if (topMark) {
                const cyTop = pHeight - topH / 2;
                drawViewportLeader(vals.length * 0.25, cyTop, leaderSide, topMark, "leader-top-rail");
            }
            // 2. Bottom Rail
            if (botMark && railSpans.bottomSegments.length > 0) {
                const uniqueMarksSeen = new Set();
                railSpans.bottomSegments.forEach(seg => {
                    if (!uniqueMarksSeen.has(seg.mark)) {
                        uniqueMarksSeen.add(seg.mark);
                        const segCenter = (seg.start + seg.end) / 2;
                        const [rx_svg, ry_svg] = cadToSvg(segCenter, botY, scale, extents); // Bottom of bottom rail
                        
                        // Bottom dimension line is at ground_svg_y + 12 * scaleFactor
                        // Draw line from ry_svg + 6 * scaleFactor to ry_svg
                        const ground_svg_y = ry_svg + (botY * scale);
                        const line = svg.ownerDocument.createElementNS("http://www.w3.org/2000/svg", "line");
                        line.setAttribute("x1", rx_svg);
                        line.setAttribute("y1", ry_svg + 6.0 * scaleFactor);
                        line.setAttribute("x2", rx_svg);
                        line.setAttribute("y2", ry_svg);
                        line.setAttribute("stroke", "#ffaa00");
                        line.setAttribute("stroke-width", 1.2 * scaleFactor);
                        line.setAttribute("marker-end", "url(#leader-arrow)");
                        gAnnots.appendChild(line);
                        
                        // Text at ry_svg + 8.5 * scaleFactor
                        const textNode = drawText(seg.mark, rx_svg, ry_svg + 8.5 * scaleFactor);
                        textNode.setAttribute("class", "annot-text-draggable");
                        textNode.setAttribute("style", "cursor: move; pointer-events: auto;");
                        textNode.setAttribute("data-annot-id", "leader-bot-rail-" + seg.mark);
                        textNode.setAttribute("data-annot-type", "dimension");
                    }
                });
            }
            // 3. Left Post
            if (leftMark) {
                const cyLeft = pHeight * 0.5;
                drawViewportLeader(postW / 2, cyLeft, leaderSide, leftMark, "leader-left-post");
            }
            // 4. Right Post
            if (rightMark) {
                const cyRight = pHeight * 0.5;
                drawViewportLeader(vals.length - postW / 2, cyRight, leaderSide, rightMark, "leader-right-post");
            }
            // 5. Mid Runner
            if (midMark && railSpans.midSegments.length > 0) {
                const cyMid = pHeight - topH - midRailGap - midH / 2;
                const uniqueMarksSeen = new Set();
                railSpans.midSegments.forEach(seg => {
                    if (!uniqueMarksSeen.has(seg.mark)) {
                        uniqueMarksSeen.add(seg.mark);
                        const segCenter = (seg.start + seg.end) / 2;
                        drawViewportLeader(segCenter, cyMid, leaderSide, seg.mark, "leader-mid-rail");
                    }
                });
            }
            // 6. Mid Post
            if (midPostMark) {
                const resolvedCenters = resolveMidPostCenters(vals.length, vals.leftPost, vals.rightPost, vals.midPosts, midPostCount, postW, customSpacings, style);
                if (resolvedCenters.length > 0) {
                    const midCx = resolvedCenters[0];
                    const cyMidPost = pHeight * 0.5;
                    const targetX = (leaderSide === "left") ? (midCx - postW / 2) : (midCx + postW / 2);
                    drawViewportLeader(targetX, cyMidPost, leaderSide, midPostMark, "leader-mid-post");
                }
            }
            // 7. Pickets
            if (picketMark) {
                const startXBound = (vals.leftPost === 'yes') ? postW : 0;
                const endXBound = (vals.rightPost === 'yes') ? (vals.length - postW) : vals.length;
                const pickCx = (leaderSide === "left")
                    ? (startXBound + picketSpacing)
                    : (endXBound - picketSpacing);
                
                const picketBottomY = botY + botH;
                const cyPick = picketBottomY + 6.0;
                drawViewportLeader(pickCx, cyPick, leaderSide, picketMark, "leader-pickets");
            }
            // 8. Mesh Frame & Panel leaders
            const isMeshStyle = (style === 'urban_balcony' || style === 'villa_balcony' || style === 'urban_custom' || style === 'villa_custom');
            if (isMeshStyle) {
                const startXBound = (vals.leftPost === 'yes') ? postW : 0;
                const endXBound = (vals.rightPost === 'yes') ? (vals.length - postW) : vals.length;
                const spanW = endXBound - startXBound;
                
                const picketBottomY = botY + botH;
                const picketTopY = (midMark) ? (pHeight - topH - midRailGap - midH) : (pHeight - topH);
                const mHeight = picketTopY - picketBottomY;
                
                const fbY = picketBottomY + 0.5;
                const fbX = (leaderSide === "left") ? (startXBound + spanW * 0.3) : (endXBound - spanW * 0.3);
                drawViewportLeader(fbX, fbY, leaderSide, meshFbMark, "leader-mesh-fb");
                
                const mY = picketBottomY + mHeight * 0.5;
                const mX = (leaderSide === "left") ? (startXBound + spanW * 0.4) : (endXBound - spanW * 0.4);
                drawViewportLeader(mX, mY, leaderSide, meshPanelMark, "leader-mesh-panel");
            }

            // Draw Section A cut line on viewport screen
            if (isMeshStyle) {
                const postCenters = [];
                postCenters.push((vals.leftPost === 'yes') ? (postW / 2) : 0);
                if (vals.midPosts !== 'none' && midPostCount > 0) {
                    const resolvedCenters = resolveMidPostCenters(vals.length, vals.leftPost, vals.rightPost, vals.midPosts, midPostCount, postW, customSpacings, style);
                    resolvedCenters.forEach(midCx => {
                        postCenters.push(midCx);
                    });
                }
                postCenters.push((vals.rightPost === 'yes') ? (vals.length - postW / 2) : vals.length);

                // Find the first bay index that has a post on its left
                let targetBayIndex = 0;
                for (let i = 0; i < postCenters.length - 1; i++) {
                    let hasPostAtLeft = false;
                    if (i === 0) {
                        hasPostAtLeft = (vals.leftPost === 'yes' && vals.postType !== 'none');
                    } else {
                        hasPostAtLeft = (vals.midPosts !== 'none' && midPostCount > 0 && vals.postType !== 'none');
                    }
                    if (hasPostAtLeft) {
                        targetBayIndex = i;
                        break;
                    }
                }

                if (postCenters.length >= 2) {
                    const cutX = (postCenters[targetBayIndex] + postCenters[targetBayIndex + 1]) / 2;
                    const hasMid = (style === 'villa_balcony' || (style === 'villa_custom' && vals.midRailType !== 'none'));
                    
                    const topGap = (style === 'classical' || style === 'executive' || style === 'urban_balcony' || style === 'villa_balcony') ? (pHeight - fHeight) : (vals.topGap !== undefined ? vals.topGap : 2.0);
                    const midRailTop = pHeight - topGap - topH - midRailGap;
                    const midRailBottom = midRailTop - midH;
                    
                    const cutYTop = hasMid ? midRailTop : (pHeight + 4);
                    const cutYBot = hasMid ? (midRailBottom - 12) : (pHeight - 12);
                    
                    // Translate CAD to SVG coordinates
                    const [pTopX, pTopY] = cadToSvg(cutX, cutYTop, scale, extents);
                    const [pBotX, pBotY] = cadToSvg(cutX, cutYBot, scale, extents);
                    
                    // Draw vertical line
                    const cutLine = svg.ownerDocument.createElementNS("http://www.w3.org/2000/svg", "line");
                    cutLine.setAttribute("x1", pTopX);
                    cutLine.setAttribute("y1", pTopY);
                    cutLine.setAttribute("x2", pBotX);
                    cutLine.setAttribute("y2", pBotY);
                    cutLine.setAttribute("stroke", "#ffaa00"); // matches other annot colors on screen
                    cutLine.setAttribute("stroke-width", 2.0 * scaleFactor);
                    gAnnots.appendChild(cutLine);
                    
                    // Draw horizontal hook pointing right
                    const hookLength = 15 * scaleFactor;
                    const pRightX = pTopX + hookLength;
                    
                    const hookLine = svg.ownerDocument.createElementNS("http://www.w3.org/2000/svg", "line");
                    hookLine.setAttribute("x1", pTopX);
                    hookLine.setAttribute("y1", pTopY);
                    hookLine.setAttribute("x2", pRightX);
                    hookLine.setAttribute("y2", pTopY);
                    hookLine.setAttribute("stroke", "#ffaa00");
                    hookLine.setAttribute("stroke-width", 2.0 * scaleFactor);
                    gAnnots.appendChild(hookLine);
                    
                    // Draw arrowhead pointing right at the end of the hook
                    const arrow = svg.ownerDocument.createElementNS("http://www.w3.org/2000/svg", "polygon");
                    const arrowSize = 6 * scaleFactor;
                    const pt1 = `${pRightX},${pTopY}`;
                    const pt2 = `${pRightX - arrowSize},${pTopY - arrowSize * 0.4}`;
                    const pt3 = `${pRightX - arrowSize},${pTopY + arrowSize * 0.4}`;
                    arrow.setAttribute("points", `${pt1} ${pt2} ${pt3}`);
                    arrow.setAttribute("fill", "#ffaa00");
                    gAnnots.appendChild(arrow);
                    
                    // Draw text label "A" next to the arrowhead
                    const textNode = svg.ownerDocument.createElementNS("http://www.w3.org/2000/svg", "text");
                    textNode.setAttribute("x", pRightX + 6 * scaleFactor);
                    textNode.setAttribute("y", pTopY + 4 * scaleFactor);
                    textNode.setAttribute("fill", "#ffffff");
                    textNode.setAttribute("font-family", "'JetBrains Mono', monospace, sans-serif");
                    textNode.setAttribute("font-size", (14 * scaleFactor) + "px");
                    textNode.setAttribute("font-weight", "bold");
                    textNode.setAttribute("text-anchor", "start");
                    textNode.textContent = "A";
                    gAnnots.appendChild(textNode);
                }
            }
        }

        // 4. Render placed custom dimensions
        customDimensionsList.forEach((dim, idx) => {
            const customDimId = `custom-dim-${idx}`;
            if (hiddenAnnotations.has(customDimId)) return;

            const isSelected = selectedAnnotId === customDimId;
            const dimColor = isSelected ? "#ff00ff" : "#00d4ff";

            const [x1, y1] = cadToSvg(dim.cx1, dim.cy1, scale, extents);
            const [x2, y2] = cadToSvg(dim.cx2, dim.cy2, scale, extents);
            const [dx1, dy1] = cadToSvg(dim.cdx1, dim.cdy1, scale, extents);
            const [dx2, dy2] = cadToSvg(dim.cdx2, dim.cdy2, scale, extents);
            
            // Extension lines (thin cyan) with a clean 4px gap from snap points
            const len1 = Math.hypot(dx1 - x1, dy1 - y1);
            let ex1 = x1, ey1 = y1;
            if (len1 > 0.001) {
                ex1 = x1 + (dx1 - x1) / len1 * 4 * scaleFactor;
                ey1 = y1 + (dy1 - y1) / len1 * 4 * scaleFactor;
            }
            const len2 = Math.hypot(dx2 - x2, dy2 - y2);
            let ex2 = x2, ey2 = y2;
            if (len2 > 0.001) {
                ex2 = x2 + (dx2 - x2) / len2 * 4 * scaleFactor;
                ey2 = y2 + (dy2 - y2) / len2 * 4 * scaleFactor;
            }
            drawLine(ex1, ey1, dx1, dy1, dimColor, "0.5");
            drawLine(ex2, ey2, dx2, dy2, dimColor, "0.5");
            
            // Dimension line with custom arrowheads
            drawLine(dx1, dy1, dx2, dy2, dimColor, "1.2", "custom-arrow-start", "custom-arrow-end");
            
            // Aligned Text Label
            const midX = (dx1 + dx2) / 2;
            const midY = (dy1 + dy2) / 2;
            
            const spec = annotationProperties[customDimId] || {};
            const activeFontSize = spec.fontSize !== undefined ? spec.fontSize : customDimFontSize;
            const activeTextGap = spec.textGap !== undefined ? spec.textGap : customDimTextGap;
            
            const len = Math.hypot(dx2 - dx1, dy2 - dy1);
            let tx = midX;
            let ty = midY;
            if (len > 0.001) {
                const nx = -(dy2 - dy1) / len;
                const ny = (dx2 - dx1) / len;
                // Offset text by activeTextGap SVG pixels along the normal
                tx += nx * activeTextGap * scaleFactor;
                ty += ny * activeTextGap * scaleFactor;
            }
            
            const dx_cad = dim.cx2 - dim.cx1;
            const dy_cad = dim.cy2 - dim.cy1;
            const distInches = Math.hypot(dx_cad, dy_cad);
            const labelText = spec.text !== undefined && spec.text !== null ? spec.text : (dim.text || formatFraction(distInches));
            
            // Rotate parallel to dimension line
            const angleRad = Math.atan2(dy2 - dy1, dx2 - dx1);
            let textAngle = angleRad * 180 / Math.PI;
            if (textAngle > 90) textAngle -= 180;
            if (textAngle < -90) textAngle += 180;
            
            const text = svg.ownerDocument.createElementNS("http://www.w3.org/2000/svg", "text");
            text.setAttribute("x", tx);
            text.setAttribute("y", ty);
            text.setAttribute("fill", dimColor);
            text.setAttribute("font-family", "'JetBrains Mono', monospace, sans-serif");
            text.setAttribute("font-size", (activeFontSize * scaleFactor) + "px");
            text.setAttribute("font-weight", "bold");
            text.setAttribute("text-anchor", "middle");
            if (textAngle) {
                text.setAttribute("transform", `rotate(${textAngle}, ${tx}, ${ty})`);
            }
            text.textContent = labelText;
            
            text.setAttribute("class", "annot-text-draggable");
            text.setAttribute("style", "cursor: move; pointer-events: auto;");
            text.setAttribute("data-annot-id", customDimId);
            text.setAttribute("data-annot-type", "custom");
            gAnnots.appendChild(text);
            
            // Render blue grips if AutoCAD interactive dimension mode is active
            if (autocadDimModeActive) {
                const gripSize = 6 * scaleFactor;
                const drawGrip = (gx, gy, gripName) => {
                    const rect = svg.ownerDocument.createElementNS("http://www.w3.org/2000/svg", "rect");
                    rect.setAttribute("x", gx - gripSize/2);
                    rect.setAttribute("y", gy - gripSize/2);
                    rect.setAttribute("width", gripSize);
                    rect.setAttribute("height", gripSize);
                    rect.setAttribute("fill", "#0088ff");
                    rect.setAttribute("stroke", "#ffffff");
                    rect.setAttribute("stroke-width", 1 * scaleFactor);
                    rect.setAttribute("class", "annot-grip-draggable");
                    rect.setAttribute("style", "cursor: pointer; pointer-events: auto;");
                    rect.setAttribute("data-grip-dim-idx", idx);
                    rect.setAttribute("data-grip-name", gripName);
                    gAnnots.appendChild(rect);
                };
                
                drawGrip(x1, y1, "p1");
                drawGrip(x2, y2, "p2");
                drawGrip(dx1, dy1, "d1");
                drawGrip(dx2, dy2, "d2");
            }
        });
    }

    // --- Master DXF/PDF exporters for Draft Space ---
    document.getElementById('generate-draft-dxf').addEventListener('click', () => {
        if (draftMembers.length === 0) {
            alert("Draft workspace is empty!");
            return;
        }
        
        try {
            const compositeModel = CadEngine.createCompositeDraft(draftMembers);
            const dxf = CadEngine.exportDXF(compositeModel);
            if (!dxf) return;
            
            const blob = new Blob([dxf], { type: 'application/dxf' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `SteelDraft_Custom_Assembly.dxf`;
            a.click();
            showToast("DXF Downloaded!");
        } catch (e) {
            alert("DXF export failed: " + e.message);
        }
    });
});
