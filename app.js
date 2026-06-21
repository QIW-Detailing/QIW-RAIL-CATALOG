/**
 * SteelDraft Main Application Logic
 */

if (typeof makerjs === 'undefined' && typeof MakerJs !== 'undefined') {
    window.makerjs = MakerJs;
}

document.addEventListener('DOMContentLoaded', () => {
    // --- State ---
    let currentMode = 'shapes';
    let currentModel = null;
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
            svg.style.transition = isPanning ? 'none' : 'width 0.15s ease-out, height 0.15s ease-out';
            if (currentZoom === 1.0) {
                svg.style.width = '';
                svg.style.height = '';
                svg.style.maxWidth = '90%';
                svg.style.maxHeight = '90%';
            } else {
                svg.style.width = `${90 * currentZoom}%`;
                svg.style.height = `${90 * currentZoom}%`;
                svg.style.maxWidth = 'none';
                svg.style.maxHeight = 'none';
            }
            svg.style.transform = `translate(${currentPanX}px, ${currentPanY}px)`;
        }
        const valEl = document.getElementById('zoom-value');
        if (valEl) {
            valEl.textContent = `${Math.round(currentZoom * 100)}%`;
        }
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
            html += `<div style="grid-column: span 2; margin-bottom: 8px;">`;
            html += generateSelectInput('Fabrication Method', 'fabMethod', [
                { val: 'straight', lbl: 'Straight Cut' },
                { val: 'bent', lbl: 'Bent / Formed (Single Piece)' }
            ], 'straight');
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
            html += generateNumInput('Fence Height (in)', 'fenceHeight', 72);
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
        } else if (cat === 'plate') {
            html += generateNumInput('Plate Width (in)', 'w', 12);
            html += generateNumInput('Plate Height (in)', 'h', 12);
            html += generateNumInput('Hole Diameter (in)', 'holeD', 0.875);
            html += generateNumInput('Hole Offset X (in)', 'holeOffsetX', 1.5);
            html += generateNumInput('Hole Offset Y (in)', 'holeOffsetY', 1.5);
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
        if (cat === 'fence') {
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
                        customGroup.classList.add('hidden');
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
                        customGroup.classList.remove('hidden');
                    } else {
                        customGroup.classList.add('hidden');
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
            
            setupDynamicProfile('postType', 'postSize', 'grp-postW', 'postW', 'HSS3x3x16GA');
            setupDynamicProfile('topRailType', 'topRailSize', 'grp-topRailH', 'topRailH', 'HSS2x2x14GA');
            setupDynamicProfile('midRailType', 'midRailSize', 'grp-midRailH', 'midRailH', 'HSS1.5x1.5x16GA');
            setupDynamicProfile('botRailType', 'botRailSize', 'grp-botRailH', 'botRailH', 'HSS2x2x14GA');
            setupDynamicProfile('picketType', 'picketSize', 'grp-picketW', 'picketW', 'HSS1x1x16GA');

            const setupBasePlateProfile = () => {
                const includeSelect = document.getElementById('inp-includeBasePlates');
                const bpSizeGroup = document.getElementById('grp-basePlateSizeGroup');
                const bpWGroup = document.getElementById('grp-basePlateW');
                const bpLGroup = document.getElementById('grp-basePlateL');
                const bpTGroup = document.getElementById('grp-basePlateT');
                const bpSizeSelect = document.getElementById('inp-basePlateSize');
                
                if (!includeSelect || !bpSizeSelect) return;
                
                const updateVisibility = () => {
                    const active = includeSelect.value === 'yes';
                    if (active) {
                        bpSizeGroup.classList.remove('hidden');
                        bpWGroup.classList.remove('hidden');
                        bpLGroup.classList.remove('hidden');
                        document.getElementById('grp-basePlateHoleD').classList.remove('hidden');
                        document.getElementById('grp-basePlateHoleOffsetX').classList.remove('hidden');
                        document.getElementById('grp-basePlateHoleOffsetY').classList.remove('hidden');
                        toggleCustom();
                    } else {
                        bpSizeGroup.classList.add('hidden');
                        bpWGroup.classList.add('hidden');
                        bpLGroup.classList.add('hidden');
                        bpTGroup.classList.add('hidden');
                        document.getElementById('grp-basePlateHoleD').classList.add('hidden');
                        document.getElementById('grp-basePlateHoleOffsetX').classList.add('hidden');
                        document.getElementById('grp-basePlateHoleOffsetY').classList.add('hidden');
                    }
                };
                
                const toggleCustom = () => {
                    if (bpSizeSelect.value === 'CUSTOM') {
                        bpTGroup.classList.remove('hidden');
                    } else {
                        bpTGroup.classList.add('hidden');
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
            
            setupBasePlateProfile();

            // Bind Mid Runner type changes to toggle Mid Runner Gap visibility
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
            
            setupMidRailGapToggle();

            // Bind Post Height to dynamically toggle/reset Post Spacing
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
            
            setupPostSpacingToggle();
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
        if (fabMethodSelect && bendingOptions) {
            const toggleBending = () => {
                if (fabMethodSelect.value === 'bent') {
                    bendingOptions.classList.remove('hidden');
                } else {
                    bendingOptions.classList.add('hidden');
                }
            };
            fabMethodSelect.addEventListener('change', () => {
                toggleBending();
                renderCurrentCAD();
            });
            toggleBending();
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

    function renderCurrentCAD() {
        const cat = shapeCategory.value;
        const vals = {};
        
        dynamicInputs.querySelectorAll('input').forEach(inp => {
            vals[inp.id.replace('inp-', '')] = parseFloat(inp.value) || 0;
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
                    const totalSixteenths = Math.round(val * 16);
                    const inches = Math.floor(totalSixteenths / 16);
                    const sixteenths = totalSixteenths % 16;
                    if (sixteenths === 0) return `${inches}"`;
                    let num = sixteenths, den = 16;
                    while (num % 2 === 0) { num /= 2; den /= 2; }
                    if (inches === 0) return `${num}/${den}"`;
                    return `${inches} ${num}/${den}"`;
                };

                dimText.textContent = `Fence: ${Math.round(vals.length/12)}ft x ${Math.round(vals.fenceHeight/12)}ft | Rail Cut Length: ${formatFraction(preciseSlopedWidth)}`;
            } else if (cat === 'plate') {
                if (vals.fabMethod === 'bent') {
                    currentModel = CadEngine.createBentPlateMultiView(vals.leg1, vals.leg2, vals.insideRadius, vals.t || 0.25, vals.bendAngle, vals.w, null);
                    dimText.textContent = `Bent Plate: L1=${vals.leg1}" | L2=${vals.leg2}" | W=${vals.w}"`;
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
            if (svgElement && tweakModeActive) {
                injectDragHandles(svgElement);
            }
            
            // Re-apply zoom to the newly rendered SVG
            applyZoom();
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
                if (inp.id) vals[inp.id.replace('inp-', '')] = parseFloat(inp.value) || 0;
            });
            dynamicInputs.querySelectorAll('select').forEach(sel => {
                if (sel.id) vals[sel.id.replace('inp-', '')] = sel.value;
            });
        }

        const cleanDrawingNo = drawingNo.replace(/[^a-zA-Z0-9]/g, '');
        let pieceIndex = 11;
        let mainMarkAssigned = false;
        const dxfPieces = [];

        // Check if the current model is a fence by looking at its structure
        const hasPosts = currentModel.models && currentModel.models.posts && Object.keys(currentModel.models.posts.models || {}).length > 0;
        const hasPickets = currentModel.models && currentModel.models.pickets && Object.keys(currentModel.models.pickets.models || {}).length > 0;
        const hasRails = currentModel.models && currentModel.models.rails;
        const hasBasePlates = currentModel.models && currentModel.models.basePlates && Object.keys(currentModel.models.basePlates.models || {}).length > 0;

        if (cat === 'welded_assembly') {
            const selectedSizeId = document.getElementById('shape-size')?.value || 'HSS1.5x1.5x14GA';
            const selectedHss = SHAPES_DB['hss_rect'].find(s => s.id === selectedSizeId) || { w: 1.5, h: 1.5, t: 0.0747 };
            const W = vals.w || 12.0;
            const H = vals.h || 8.0;
            const D = vals.depth || 18.0;
            
            // 1. Bottom Front (Main Mark)
            const bottomModel = CadEngine.createHSSRect(W, selectedHss.h, selectedHss.t);
            dxfPieces.push({ mark: mainMarkUpper, model: bottomModel });
            
            // 2. Vertical Leg
            const legModel = CadEngine.createHSSRect(selectedHss.w, H, selectedHss.t);
            dxfPieces.push({ mark: `b${cleanDrawingNo}`.toLowerCase(), model: legModel });
            
            // 3. Side Runner
            const sideModel = CadEngine.createHSSRect(selectedHss.w, D, selectedHss.t);
            dxfPieces.push({ mark: `a${cleanDrawingNo}`.toLowerCase(), model: sideModel });
            
            // 4. Back Runner
            const backModel = CadEngine.createHSSRect(W, selectedHss.h, selectedHss.t);
            dxfPieces.push({ mark: `c${cleanDrawingNo}`.toLowerCase(), model: backModel });
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
            dxfPieces.push({ mark: mainMarkUpper, model: bentPiece });
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
            
            groups.forEach((g, idx) => {
                let markCode;
                if (idx === 0) {
                    markCode = mainMarkUpper;
                } else {
                    const shapeType = g.type.includes('hss') ? 'hss' : (g.type.includes('w_beam') ? 'w' : (g.type.includes('angles') ? 'angle' : 'plate'));
                    markCode = `${shapeType}${cleanDrawingNo}${pieceIndex++}`;
                }
                
                // Get the first member model of this group from currentModel
                const firstMember = g.members[0];
                if (currentModel.models && currentModel.models[firstMember.id]) {
                    const originalModel = currentModel.models[firstMember.id];
                    const singleModel = JSON.parse(JSON.stringify(originalModel));
                    
                    // Center the model and set its origin to [0,0]
                    singleModel.origin = [0, 0];
                    if (window.makerjs) makerjs.model.center(singleModel);
                    
                    dxfPieces.push({ mark: markCode.toUpperCase(), model: singleModel });
                }
            });
        } else if (hasPosts || hasRails || hasPickets || hasBasePlates) {
            // Fence Mode: Extract from rails, posts, pickets, plates
            
            // 1. Top Rail (Main Mark)
            if (hasRails && currentModel.models.rails.models && currentModel.models.rails.models.top) {
                const mark = mainMarkUpper;
                mainMarkAssigned = true;
                const keys = Object.keys(currentModel.models.rails.models.top.models || {});
                if (keys.length > 0) {
                    const topRailModel = currentModel.models.rails.models.top.models[keys[0]];
                    const singleTop = JSON.parse(JSON.stringify(topRailModel));
                    singleTop.origin = [0, 0];
                    if (window.makerjs) makerjs.model.center(singleTop);
                    dxfPieces.push({ mark, model: singleTop });
                }
            }

            // 2. Post
            if (hasPosts) {
                let mark = mainMarkUpper;
                if (!mainMarkAssigned) {
                    mainMarkAssigned = true;
                } else {
                    const postType = vals.postType || 'hss_rect';
                    const postShape = postType.includes('hss') ? 'hss' : (postType.includes('w_beam') ? 'w' : (postType.includes('angles') ? 'angle' : 'plate'));
                    mark = `${postShape}${cleanDrawingNo}${pieceIndex++}`.toUpperCase();
                }
                const keys = Object.keys(currentModel.models.posts.models || {});
                if (keys.length > 0) {
                    const postModel = currentModel.models.posts.models[keys[0]];
                    const singlePost = JSON.parse(JSON.stringify(postModel));
                    singlePost.origin = [0, 0];
                    if (window.makerjs) makerjs.model.center(singlePost);
                    dxfPieces.push({ mark, model: singlePost });
                }
            }

            // 3. Bottom Rail
            if (hasRails && currentModel.models.rails.models && currentModel.models.rails.models.bottom) {
                let mark = mainMarkUpper;
                if (!mainMarkAssigned) {
                    mainMarkAssigned = true;
                } else {
                    const botType = vals.botRailType || 'hss_rect';
                    const botShape = botType.includes('hss') ? 'hss' : (botType.includes('w_beam') ? 'w' : (botType.includes('angles') ? 'angle' : 'plate'));
                    mark = `${botShape}${cleanDrawingNo}${pieceIndex++}`.toUpperCase();
                }
                const keys = Object.keys(currentModel.models.rails.models.bottom.models || {});
                if (keys.length > 0) {
                    const botRailModel = currentModel.models.rails.models.bottom.models[keys[0]];
                    const singleBot = JSON.parse(JSON.stringify(botRailModel));
                    singleBot.origin = [0, 0];
                    if (window.makerjs) makerjs.model.center(singleBot);
                    dxfPieces.push({ mark, model: singleBot });
                }
            }

            // 4. Mid Rail
            if (hasRails && currentModel.models.rails.models && currentModel.models.rails.models.middle) {
                let mark = mainMarkUpper;
                if (!mainMarkAssigned) {
                    mainMarkAssigned = true;
                } else {
                    const midType = vals.midRailType || 'hss_rect';
                    const midShape = midType.includes('hss') ? 'hss' : (midType.includes('w_beam') ? 'w' : (midType.includes('angles') ? 'angle' : 'plate'));
                    mark = `${midShape}${cleanDrawingNo}${pieceIndex++}`.toUpperCase();
                }
                const keys = Object.keys(currentModel.models.rails.models.middle.models || {});
                if (keys.length > 0) {
                    const midRailModel = currentModel.models.rails.models.middle.models[keys[0]];
                    const singleMid = JSON.parse(JSON.stringify(midRailModel));
                    singleMid.origin = [0, 0];
                    if (window.makerjs) makerjs.model.center(singleMid);
                    dxfPieces.push({ mark, model: singleMid });
                }
            }

            // 5. Pickets
            if (hasPickets) {
                let mark = mainMarkUpper;
                if (!mainMarkAssigned) {
                    mainMarkAssigned = true;
                } else {
                    const picketType = vals.picketType || 'hss_rect';
                    const picketShape = picketType.includes('hss') ? 'hss' : (picketType.includes('w_beam') ? 'w' : (picketType.includes('angles') ? 'angle' : 'plate'));
                    mark = `${picketShape}${cleanDrawingNo}${pieceIndex++}`.toUpperCase();
                }
                const keys = Object.keys(currentModel.models.pickets.models || {});
                if (keys.length > 0) {
                    const picketModel = currentModel.models.pickets.models[keys[0]];
                    const singlePicket = JSON.parse(JSON.stringify(picketModel));
                    singlePicket.origin = [0, 0];
                    if (window.makerjs) makerjs.model.center(singlePicket);
                    dxfPieces.push({ mark, model: singlePicket });
                }
            }

            // 6. Base Plates
            if (hasBasePlates) {
                let mark = mainMarkUpper;
                if (!mainMarkAssigned) {
                    mainMarkAssigned = true;
                } else {
                    mark = `PLATE${cleanDrawingNo}${pieceIndex++}`.toUpperCase();
                }
                const keys = Object.keys(currentModel.models.basePlates.models || {});
                if (keys.length > 0) {
                    const bpModel = currentModel.models.basePlates.models[keys[0]];
                    const singleBp = JSON.parse(JSON.stringify(bpModel));
                    singleBp.origin = [0, 0];
                    if (window.makerjs) makerjs.model.center(singleBp);
                    dxfPieces.push({ mark, model: singleBp });
                }
            }
        }

        // Fallback: If dxfPieces is empty, add the currentModel itself centered as a piece drawing
        if (dxfPieces.length === 0) {
            const singleShape = JSON.parse(JSON.stringify(currentModel));
            singleShape.origin = [0, 0];
            if (window.makerjs) makerjs.model.center(singleShape);
            dxfPieces.push({ mark: mainMarkUpper, model: singleShape });
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
            
            // Execute actual PDF generation
            await generateBlueprintPDF(drawingNo, fabNo, jobNo, mainMark, revision, finishText, needFBOM, jobName, gc, address, cityState, drawnBy, checkedBy);
        });
    }

    async function generateBlueprintPDF(drawingNo, fabNo, jobNo, mainMark, revision, finishText, needFBOM, jobName = 'QUALITY IRONWORKS PROJECT', gc = 'APEX BUILDERS', address = '123 STEEL WAY', cityState = 'HOUSTON, TX', drawnBy = 'ENG', checkedBy = 'QIW') {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('landscape', 'mm', 'a4'); // A4 landscape: 297mm x 210mm
        const cat = shapeCategory.value;

        if (!currentModel) {
            alert("No active CAD model found. Please draw or select a design first.");
            return;
        }

        const svgElement = svgContainer.querySelector('svg');
        if (!svgElement) return;

        // Generate a clean 2D SVG directly from the model (removes all nested centerlines and thickness lines)
        const cleanSvgString = CadEngine.renderClean2DSVG(currentModel);
        
        // Parse the clean SVG string into a DOM element so we can modify it for print layout (high-contrast black lines)
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = cleanSvgString;
        const svgClone = tempDiv.querySelector('svg');
        if (!svgClone) return;
        
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

        // Ensure absolutely high-contrast black lines and white backgrounds (remove all blue and cyan colors)
        svgClone.querySelectorAll('*').forEach(el => {
            // Remove color properties and force pure black strokes
            if (el.getAttribute('stroke') && el.getAttribute('stroke') !== 'none' && el.getAttribute('stroke') !== 'inherit') {
                el.setAttribute('stroke', '#000000');
            }
            if (el.style.stroke && el.style.stroke !== 'none') {
                el.style.stroke = '#000000';
            }
            
            // Handle fill colors (force black or white/none)
            if (el.getAttribute('fill') && el.getAttribute('fill') !== 'none' && el.getAttribute('fill') !== 'white' && el.getAttribute('fill') !== '#ffffff' && el.getAttribute('fill') !== 'inherit') {
                el.setAttribute('fill', '#000000');
            }
            if (el.style.fill && el.style.fill !== 'none' && el.style.fill !== 'white' && el.style.fill !== 'rgb(255, 255, 255)' && el.style.fill !== '#ffffff') {
                el.style.fill = '#000000';
            }
        });

        svgClone.querySelectorAll('path, rect, circle, line').forEach(el => {
            const currWidth = parseFloat(el.getAttribute('stroke-width')) || 1.5;
            el.setAttribute('stroke-width', Math.max(2, currWidth * 1.5).toString());
        });
        
        svgClone.querySelectorAll('text').forEach(t => {
            t.setAttribute('fill', '#000000');
            t.setAttribute('font-weight', '700');
            t.style.fill = '#000000';
        });

        const svgData = new XMLSerializer().serializeToString(svgClone);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        const viewBoxAttr = svgElement.getAttribute('viewBox');
        const vb = viewBoxAttr ? viewBoxAttr.split(/[\s,]+/).map(Number) : (currentMode === 'draft' ? [-600, -400, 1200, 800] : [0, 0, 2000, 1500]);
        const vbWidth = vb[2] || (currentMode === 'draft' ? 1200 : 2000);
        const vbHeight = vb[3] || (currentMode === 'draft' ? 800 : 1500);
        const svgRatio = vbWidth / vbHeight;

        // Set canvas dimensions at a high resolution with matching aspect ratio
        canvas.width = 2000;
        canvas.height = 2000 / svgRatio;

        const svgBlob = new Blob([svgData], {type: 'image/svg+xml;charset=utf-8'});
        const url = URL.createObjectURL(svgBlob);

        img.onload = function() {
            ctx.fillStyle = "white";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            const pngData = canvas.toDataURL('image/png');
            
            // Available space in A4 Landscape is X = 7 to 180 (width 173), Y = 7 to 175 (height 168)
            // Target box centered inside X=7 to 180, Y=7 to 175
            const targetW = 165;
            const targetH = 160;
            const targetRatio = targetW / targetH;

            let drawW, drawH;
            if (svgRatio > targetRatio) {
                drawW = targetW;
                drawH = targetW / svgRatio;
            } else {
                drawH = targetH;
                drawW = targetH * svgRatio;
            }

            const pdfX = 93.5 - drawW / 2;
            const pdfY = 91 - drawH / 2;

            doc.addImage(pngData, 'PNG', pdfX, pdfY, drawW, drawH);
            
            // --- DRAW BORDERS ---
            doc.setDrawColor(0, 0, 0);
            doc.setLineWidth(0.5);
            doc.rect(5, 5, 287, 200, 'S'); // Outer border
            doc.setLineWidth(0.2);
            doc.rect(7, 7, 283, 196, 'S'); // Inner border
            
            // Divider between CAD viewport and right-hand specification sheet
            doc.line(180, 7, 180, 175);
            // Horizontal divider above bottom blocks
            doc.line(7, 175, 290, 175);

            // Fetch inputs
            const vals = {};
            dynamicInputs.querySelectorAll('input').forEach(inp => {
                vals[inp.id.replace('inp-', '')] = parseFloat(inp.value) || 0;
            });
            dynamicInputs.querySelectorAll('select').forEach(sel => {
                vals[sel.id.replace('inp-', '')] = sel.value;
            });

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
            
            const formatFraction = (val) => {
                const totalSixteenths = Math.round(val * 16);
                const inches = Math.floor(totalSixteenths / 16);
                const sixteenths = totalSixteenths % 16;
                if (sixteenths === 0) return `${inches}"`;
                let num = sixteenths, den = 16;
                while (num % 2 === 0) { num /= 2; den /= 2; }
                if (inches === 0) return `${num}/${den}"`;
                return `${inches} ${num}/${den}"`;
            };

            // --- CAD TO PDF COORDINATE MAPPING HELPERS ---
            const cadToPdf = (cx, cy) => {
                const x = pdfX + ((cx - vb[0]) / vbWidth) * drawW;
                // Maker.js Y goes up, PDF Y goes down, so we flip Y relative to the viewBox
                const y = pdfY + (1 - (cy - vb[1]) / vbHeight) * drawH;
                return [x, y];
            };

            const drawArrowhead = (x, y, angle, size = 1.8) => {
                const x1 = x - size * Math.cos(angle - Math.PI/6);
                const y1 = y - size * Math.sin(angle - Math.PI/6);
                const x2 = x - size * Math.cos(angle + Math.PI/6);
                const y2 = y - size * Math.sin(angle + Math.PI/6);
                doc.setFillColor(0, 0, 0);
                doc.triangle(x, y, x1, y1, x2, y2, 'F');
            };

            const drawCadDimension = (cx1, cy1, cx2, cy2, offsetMm, text) => {
                const p1 = cadToPdf(cx1, cy1);
                const p2 = cadToPdf(cx2, cy2);
                
                const dx = p2[0] - p1[0];
                const dy = p2[1] - p1[1];
                const len = Math.sqrt(dx*dx + dy*dy);
                if (len < 0.001) return;
                
                const px = -dy / len;
                const py = dx / len;
                
                const d1 = [p1[0] + px * offsetMm, p1[1] + py * offsetMm];
                const d2 = [p2[0] + px * offsetMm, p2[1] + py * offsetMm];
                
                // Draw extension lines
                const extAngle = Math.atan2(d1[1] - p1[1], d1[0] - p1[0]);
                const extLength = Math.sqrt((d1[0]-p1[0])**2 + (d1[1]-p1[1])**2);
                const extX1 = p1[0] + (extLength + 1.8) * Math.cos(extAngle);
                const extY1 = p1[1] + (extLength + 1.8) * Math.sin(extAngle);
                doc.setDrawColor(0, 0, 0);
                doc.setLineWidth(0.2);
                doc.line(p1[0], p1[1], extX1, extY1);
                
                const extX2 = p2[0] + (extLength + 1.8) * Math.cos(extAngle);
                const extY2 = p2[1] + (extLength + 1.8) * Math.sin(extAngle);
                doc.line(p2[0], p2[1], extX2, extY2);
                
                // Draw dimension line
                doc.line(d1[0], d1[1], d2[0], d2[1]);
                
                // Draw arrowheads
                const arrowAngle = Math.atan2(d2[1] - d1[1], d2[0] - d1[0]);
                drawArrowhead(d1[0], d1[1], arrowAngle + Math.PI, 1.5);
                drawArrowhead(d2[0], d2[1], arrowAngle, 1.5);
                
                // Draw text centered above the dimension line
                const midX = (d1[0] + d2[0]) / 2;
                const midY = (d1[1] + d2[1]) / 2;
                
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(5);
                doc.setTextColor(0, 0, 0);
                
                let textAngle = -arrowAngle * 180 / Math.PI;
                if (textAngle > 90) textAngle -= 180;
                if (textAngle < -90) textAngle += 180;
                
                const textShiftMm = 1.8 * Math.sign(offsetMm);
                const tx = midX + px * textShiftMm;
                const ty = midY + py * textShiftMm;
                
                doc.text(text, tx, ty, { align: "center", angle: textAngle });
            };

            const drawCadLeader = (targetCx, targetCy, labelPdfX, labelPdfY, text, textAlign = "left") => {
                const target = cadToPdf(targetCx, targetCy);
                
                doc.setDrawColor(0, 0, 0);
                doc.setLineWidth(0.18);
                doc.line(labelPdfX, labelPdfY, target[0], target[1]);
                
                const angle = Math.atan2(target[1] - labelPdfY, target[0] - labelPdfX);
                drawArrowhead(target[0], target[1], angle, 1.2);
                
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(4.8);
                doc.setTextColor(0, 0, 0);
                
                const textShift = textAlign === "left" ? 0.8 : -0.8;
                doc.text(text, labelPdfX + textShift, labelPdfY + 1.0, { align: textAlign });
            };

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
            let desc = cat.toUpperCase();
            
            const mainMarkUpper = mainMark.toUpperCase();
            const cleanDrawingNo = drawingNo.toLowerCase().replace(/[^a-z0-9]/g, '');

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
                        markCode = `${shapeType}${cleanDrawingNo}${pieceIndex++}`;
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
                    const totalWeight = wValSingle * g.qty;
                    
                    bomItems.push({
                        mark: markCode,
                        qty: g.qty,
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
                
                let mainMarkAssigned = false;
                let pieceIndex = 11;

                // Add Top Rail
                if (vals.topRailType !== 'none') {
                    const topRailName = vals.topRailSize === 'CUSTOM' ? `HSS ${vals.topRailH}x${vals.topRailH}` : vals.topRailSize;
                    const wVal = calculateWeight(vals.topRailType, vals.topRailSize, preciseSlopedWidth, { w: vals.topRailH, h: vals.topRailH, t: 0.12 }, numSpans);
                    
                    const markCode = mainMarkUpper;
                    mainMarkAssigned = true;
                    
                    bomItems.push({
                        mark: markCode, 
                        qty: numSpans,
                        desc: topRailName,
                        len: formatFraction(preciseSlopedWidth),
                        weight: Math.round(wVal * 10) / 10,
                        shape: vals.topRailType.toUpperCase(),
                        size: topRailName,
                        len_dec: preciseSlopedWidth
                    });
                }
                
                // Add Posts
                if (!noPosts) {
                    const postName = vals.postSize === 'CUSTOM' ? `HSS ${vals.postW}x${vals.postW}` : vals.postSize;
                    const wVal = calculateWeight(vals.postType, vals.postSize, vals.postHeight, { w: vals.postW, h: vals.postW, t: 0.15 }, numPosts);
                    
                    let markCode;
                    if (!mainMarkAssigned) {
                        markCode = mainMarkUpper;
                        mainMarkAssigned = true;
                    } else {
                        const postShape = vals.postType.includes('hss') ? 'hss' : (vals.postType.includes('w_beam') ? 'w' : (vals.postType.includes('angles') ? 'angle' : 'plate'));
                        markCode = `${postShape}${cleanDrawingNo}${pieceIndex++}`;
                    }
                    
                    bomItems.push({
                        mark: markCode, 
                        qty: numPosts,
                        desc: postName,
                        len: formatFraction(vals.postHeight),
                        weight: Math.round(wVal * 10) / 10,
                        shape: vals.postType.toUpperCase(),
                        size: postName,
                        len_dec: vals.postHeight
                    });
                }
                
                // Add Bottom Rail
                if (vals.botRailType !== 'none') {
                    const botRailName = vals.botRailSize === 'CUSTOM' ? `HSS ${vals.botRailH}x${vals.botRailH}` : vals.botRailSize;
                    const wVal = calculateWeight(vals.botRailType, vals.botRailSize, preciseSlopedWidth, { w: vals.botRailH, h: vals.botRailH, t: 0.12 }, numSpans);
                    
                    let markCode;
                    if (!mainMarkAssigned) {
                        markCode = mainMarkUpper;
                        mainMarkAssigned = true;
                    } else {
                        const botShape = vals.botRailType.includes('hss') ? 'hss' : (vals.botRailType.includes('w_beam') ? 'w' : (vals.botRailType.includes('angles') ? 'angle' : 'plate'));
                        markCode = `${botShape}${cleanDrawingNo}${pieceIndex++}`;
                    }
                    
                    bomItems.push({
                        mark: markCode,
                        qty: numSpans,
                        desc: botRailName,
                        len: formatFraction(preciseSlopedWidth),
                        weight: Math.round(wVal * 10) / 10,
                        shape: vals.botRailType.toUpperCase(),
                        size: botRailName,
                        len_dec: preciseSlopedWidth
                    });
                }
                
                // Add Mid Rail
                if (vals.midRailType !== 'none') {
                    const midRailName = vals.midRailSize === 'CUSTOM' ? `HSS ${vals.midRailH}x${vals.midRailH}` : vals.midRailSize;
                    const wVal = calculateWeight(vals.midRailType, vals.midRailSize, preciseSlopedWidth, { w: vals.midRailH, h: vals.midRailH, t: 0.12 }, numSpans);
                    
                    let markCode;
                    if (!mainMarkAssigned) {
                        markCode = mainMarkUpper;
                        mainMarkAssigned = true;
                    } else {
                        const midShape = vals.midRailType.includes('hss') ? 'hss' : (vals.midRailType.includes('w_beam') ? 'w' : (vals.midRailType.includes('angles') ? 'angle' : 'plate'));
                        markCode = `${midShape}${cleanDrawingNo}${pieceIndex++}`;
                    }
                    
                    bomItems.push({
                        mark: markCode,
                        qty: numSpans,
                        desc: midRailName,
                        len: formatFraction(preciseSlopedWidth),
                        weight: Math.round(wVal * 10) / 10,
                        shape: vals.midRailType.toUpperCase(),
                        size: midRailName,
                        len_dec: preciseSlopedWidth
                    });
                }
                
                // Add Pickets
                if (totalPickets > 0) {
                    const picketName = vals.picketSize === 'CUSTOM' ? `HSS ${vals.picketW}x${vals.picketW}` : vals.picketSize;
                    const wVal = calculateWeight(vals.picketType, vals.picketSize, picketH, { w: vals.picketW, h: vals.picketW, t: 0.08 }, totalPickets);
                    
                    let markCode;
                    if (!mainMarkAssigned) {
                        markCode = mainMarkUpper;
                        mainMarkAssigned = true;
                    } else {
                        const picketShape = vals.picketType.includes('hss') ? 'hss' : (vals.picketType.includes('w_beam') ? 'w' : (vals.picketType.includes('angles') ? 'angle' : 'plate'));
                        markCode = `${picketShape}${cleanDrawingNo}${pieceIndex++}`;
                    }
                    
                    bomItems.push({
                        mark: markCode,
                        qty: totalPickets,
                        desc: picketName,
                        len: formatFraction(picketH),
                        weight: Math.round(wVal * 10) / 10,
                        shape: vals.picketType.toUpperCase(),
                        size: picketName,
                        len_dec: picketH
                    });
                }
                
                // Add Base Plates
                if (vals.includeBasePlates === 'yes' && !noPosts) {
                    const bpName = vals.basePlateSize === 'CUSTOM' ? `PL ${vals.basePlateT}"` : vals.basePlateSize;
                    const wVal = calculateWeight('plate', vals.basePlateSize, bpL, { w: bpW, h: bpL, t: vals.basePlateT }, numPosts);
                    
                    let markCode;
                    if (!mainMarkAssigned) {
                        markCode = mainMarkUpper;
                        mainMarkAssigned = true;
                    } else {
                        markCode = `plate${cleanDrawingNo}${pieceIndex++}`;
                    }
                    
                    bomItems.push({
                        mark: markCode,
                        qty: numPosts,
                        desc: `${bpW}x${bpL} Plate`,
                        len: bpName,
                        weight: Math.round(wVal * 10) / 10,
                        shape: 'PLATE',
                        size: `${bpW}x${bpL}x${vals.basePlateT !== undefined ? vals.basePlateT : 0.5}`,
                        len_dec: bpL
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
                    mark: `b${cleanDrawingNo}`.toLowerCase(),
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
                    mark: `a${cleanDrawingNo}`.toLowerCase(),
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
                    mark: `c${cleanDrawingNo}`.toLowerCase(),
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
            // x-splits: 180 -> 188 -> 206 -> 234 -> 247 -> 260 -> 274 -> 282 -> 290
            doc.text("QTY", bomX + 4, subY + 3, { align: "center" });
            doc.text("TOTAL", bomX + 4, subY + 5.5, { align: "center" });
            
            doc.text("PIECE", bomX + 17, subY + 3, { align: "center" });
            doc.text("MARK", bomX + 17, subY + 5.5, { align: "center" });
            
            doc.text("DESCRIPTION", bomX + 34, subY + 4.5, { align: "center" });
            doc.text("LENGTH", bomX + 60.5, subY + 4.5, { align: "center" });
            
            doc.text("STEEL", bomX + 73.5, subY + 3, { align: "center" });
            doc.text("GRADE", bomX + 73.5, subY + 5.5, { align: "center" });
            
            doc.text("SURFACE", bomX + 87, subY + 3, { align: "center" });
            doc.text("FINISH", bomX + 87, subY + 5.5, { align: "center" });
            
            doc.text("REMARKS", bomX + 98, subY + 4.5, { align: "center" });
            
            doc.text("WEIGHT", bomX + 106, subY + 3, { align: "center" });
            doc.text("TOTAL", bomX + 106, subY + 5.5, { align: "center" });
            
            // Column Header Dividers
            doc.line(188, subY, 188, subY + 7);
            doc.line(206, subY, 206, subY + 7);
            doc.line(234, subY, 234, subY + 7);
            doc.line(247, subY, 247, subY + 7);
            doc.line(260, subY, 260, subY + 7);
            doc.line(274, subY, 274, subY + 7);
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
                }
                // Strip suffix like Gr. B / Gr. B / Gr B etc.
                return grade.replace(/\bgr[.\s]*[a-z0-9]+/gi, '').trim();
            };
            
            const straightItems = bomItems.filter(item => !item.isBent);
            const bentItems = bomItems.filter(item => item.isBent);
            
            const drawRow = (item) => {
                doc.rect(bomX, currentY, bomW, 5.5, 'S');
                doc.setFont('helvetica', 'normal');
                
                // Qty
                doc.text(item.qty.toString(), 184, currentY + 3.8, { align: "center" });
                // Piece Mark
                doc.setFont('helvetica', 'bold');
                doc.text(item.mark, 197, currentY + 3.8, { align: "center" });
                doc.setFont('helvetica', 'normal');
                // Description
                doc.text(item.desc, 208, currentY + 3.8, { align: "left" });
                // Length
                doc.text(item.len, 240.5, currentY + 3.8, { align: "center" });
                // Steel Grade
                const grade = item.grade || getSteelGrade(item.shape);
                doc.text(grade, 253.5, currentY + 3.8, { align: "center" });
                // Surface Finish
                let shortFinish = finishText.toUpperCase();
                if (shortFinish.length > 11) shortFinish = shortFinish.substring(0, 10) + '.';
                doc.text(shortFinish, 267, currentY + 3.8, { align: "center" });

                // Weight
                doc.text(item.weight.toFixed(1), 286, currentY + 3.8, { align: "center" });
                
                // Column Dividers
                doc.line(188, currentY, 188, currentY + 5.5);
                doc.line(206, currentY, 206, currentY + 5.5);
                doc.line(234, currentY, 234, currentY + 5.5);
                doc.line(247, currentY, 247, currentY + 5.5);
                doc.line(260, currentY, 260, currentY + 5.5);
                doc.line(274, currentY, 274, currentY + 5.5);
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
            
            // Draw empty rows up to the top of the bottom blocks (y = 175)
            while (currentY < 175) {
                const rowH = Math.min(5.5, 175 - currentY);
                if (rowH < 2) break;
                doc.rect(bomX, currentY, bomW, rowH, 'S');
                doc.line(188, currentY, 188, currentY + rowH);
                doc.line(206, currentY, 206, currentY + rowH);
                doc.line(234, currentY, 234, currentY + rowH);
                doc.line(247, currentY, 247, currentY + rowH);
                doc.line(260, currentY, 260, currentY + rowH);
                doc.line(274, currentY, 274, currentY + rowH);
                doc.line(282, currentY, 282, currentY + rowH);
                currentY += rowH;
            }

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
            
            const titleDesc = cat === 'fence' ? "INDUSTRIAL FENCE BLUEPRINT" : `${desc.toUpperCase()} FABRICATION`;
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

            // Save PDF drawing
            doc.save(`${drawingNo}_QUALITY_IRONWORKS_DRAWING.pdf`);
            URL.revokeObjectURL(url);
            
            // --- D. GENERATE EXCEL DETAILED BOM (.XLSX) IF REQUESTED ---
            if (needFBOM) {
                const getSteelGrade = (shapeName) => {
                    const s = (shapeName || '').toLowerCase();
                    let grade = 'A500';
                    if (s.includes('plate') || s.includes('pl')) {
                        grade = 'A36';
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

                    // Determine dimensions: only put dimension, don't put HSS
                    let dimCol = (item.desc || item.size || '').toUpperCase();
                    dimCol = dimCol.replace(/HSS/gi, '').replace(/\bHSS\b/gi, '').trim();

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
                    XLSX.writeFile(wb, `SteelDraft_FBOM_${drawingNo}.xlsx`);
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
                    a.download = `SteelDraft_FBOM_${drawingNo}.csv`;
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
        };
        img.src = url;
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
            }
            
            if (currentMode === 'shapes') {
                renderCurrentCAD();
            } else if (currentMode === 'draft') {
                renderDraftSpace();
            }
        });
    }

    function injectDragHandles(svg) {
        const cat = shapeCategory.value;
        const vals = {};
        
        dynamicInputs.querySelectorAll('input').forEach(inp => {
            vals[inp.id.replace('inp-', '')] = parseFloat(inp.value) || 0;
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
        let handles = [];
        
        if (cat === 'plate') {
            if (isReady) {
                const w = vals.w * 25.4, h = vals.h * 25.4, ox = (vals.w/2 - vals.holeOffsetX) * 25.4, oy = (vals.h/2 - vals.holeOffsetY) * 25.4;
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
        } else if (cat === 'fence') {
            const topH = getProfileDimension(vals.topRailType, vals.topRailSize, vals.topRailH);
            const picketW = getPicketDimension(vals.picketType, vals.picketSize, vals.picketW);
            
            const rad = vals.slope * Math.PI / 180;
            const tan = Math.tan(rad);
            
            const numSpans = Math.max(1, Math.round(vals.length / vals.postSpacing));
            const actualPostSpacing = vals.length / numSpans;
            
            if (isReady) {
                for (let i = 1; i < numSpans; i++) {
                    const px = i * actualPostSpacing * 25.4;
                    const py = px * tan;
                    handles.push({
                        x: px,
                        y: py + vals.fenceHeight * 25.4,
                        name: `fence-post-spacing-${i}`,
                        tooltip: `Drag Post ${i} to adjust Post Spacing`
                    });
                }
                handles.push({ x: vals.picketSpacing * 25.4, y: vals.fenceHeight * 25.4 - 4 * 25.4, name: 'fence-picket-spacing', tooltip: 'Drag to adjust Picket Spacing' });
                handles.push({ x: 0, y: vals.fenceHeight * 25.4, name: 'fence-height', tooltip: 'Drag to adjust Height' });
                handles.push({ x: vals.length / 2 * 25.4, y: (vals.length / 2 * 25.4) * tan, name: 'fence-slope', tooltip: 'Drag to adjust Bottom Slope' });
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
        } else if (cat === 'hss_rect') {
            if (isReady) {
                handles.push({ x: vals.w/2 * 25.4, y: 0, name: 'hss-width', tooltip: 'Drag to adjust Width' });
                handles.push({ x: 0, y: vals.h/2 * 25.4, name: 'hss-height', tooltip: 'Drag to adjust Height' });
            } else {
                const s = 10;
                handles.push({ x: vals.w * s, y: vals.h * s / 2, name: 'hss-width', tooltip: 'Drag to adjust Width' });
                handles.push({ x: vals.w * s / 2, y: vals.h * s, name: 'hss-height', tooltip: 'Drag to adjust Height' });
            }
        } else if (cat === 'hss_circ') {
            if (isReady) {
                handles.push({ x: vals.d/2 * 25.4, y: 0, name: 'hss-circ-diameter', tooltip: 'Drag to adjust Diameter' });
            } else {
                const s = 10;
                handles.push({ x: vals.d * s, y: vals.d * s / 2, name: 'hss-circ-diameter', tooltip: 'Drag to adjust Diameter' });
            }
        }
        
        const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
        g.setAttribute("class", "drag-handles-group");
        
        handles.forEach(h => {
            const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            circle.setAttribute("cx", h.x);
            circle.setAttribute("cy", h.y);
            if (isReady) {
                circle.setAttribute("r", Math.max(0.15, Math.min(vals.w || 5, vals.h || 5) * 0.04));
                circle.setAttribute("stroke-width", 0.03);
            } else {
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
            
            let memberGroup = e.target.closest('.draft-member') || 
                              e.target.closest('.draft-member-group') || 
                              e.target.closest('[data-member-id]');
            if (!memberGroup) {
                let el = e.target;
                while (el && el !== svgContainer) {
                    const id = el.id || "";
                    const cls = el.getAttribute('class') || "";
                    if (id.indexOf('member_') !== -1 || cls.indexOf('member_') !== -1 ||
                        id.indexOf('member-') !== -1 || cls.indexOf('member-') !== -1) {
                        memberGroup = el;
                        break;
                    }
                    el = el.parentElement;
                }
            }
            if (memberGroup) {
                const rawId = memberGroup.id || memberGroup.getAttribute('data-member-id') || (memberGroup.getAttribute('class') || "");
                let index = rawId.indexOf('member_');
                let isUnderscore = true;
                if (index === -1) {
                    index = rawId.indexOf('member-');
                    isUnderscore = false;
                }
                let memberId = null;
                if (index !== -1) {
                    const rawPart = rawId.substring(index).split(' ')[0];
                    memberId = isUnderscore ? rawPart : rawPart.replace(/-/g, '_');
                }
                logVisual(`Detected group key: "${rawId}", extracted memberId: "${memberId}"`, "info");
                
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
                            
                            const scale = CadEngine.isLibReady() ? 25.4 : 10;
                            dragStartMouseX = svgPt.x / scale;
                            dragStartMouseY = -svgPt.y / scale;
                            
                            dragStartMemberOrigin = [m.origin[0], m.origin[1]];
                        }
                        
                        renderDraftSpace();
                        e.preventDefault();
                    }
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
        if (isPanning) {
            currentPanX = e.clientX - panStartX;
            currentPanY = e.clientY - panStartY;
            panDelta += Math.abs(e.movementX) + Math.abs(e.movementY);
            applyZoom();
            e.preventDefault();
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
            
            const scale = CadEngine.isLibReady() ? 25.4 : 10;
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
        
        let dx = svgPt.x;
        let dy = svgPt.y;
        if (isReady) {
            dx = dx / 25.4;
            dy = dy / 25.4;
        }
        
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
        } else if (cat === 'fence') {
            const s = 4;
            const tan = Math.tan(parseFloat(document.getElementById('inp-slope').value || 0) * Math.PI / 180);
            
            if (isReady) {
                if (activeHandle.startsWith('fence-post-spacing-')) {
                    const postIndex = parseInt(activeHandle.replace('fence-post-spacing-', ''));
                    setVal('postSpacing', Math.max(12.0, dx / postIndex));
                } else if (activeHandle === 'fence-picket-spacing') {
                    setVal('picketSpacing', Math.max(1.0, dx));
                } else if (activeHandle === 'fence-height') {
                    const newHeight = Math.max(24.0, dy);
                    setVal('fenceHeight', newHeight);
                    const topGapVal = parseFloat(document.getElementById('inp-topGap').value) || 2.0;
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
                    const topGapVal = parseFloat(document.getElementById('inp-topGap').value) || 2.0;
                    const TG = topGapVal * s;
                    const groundY = (parseFloat(document.getElementById('inp-fenceHeight').value || 72) * s) + TG + maxRise + 50;
                    const newHeight = Math.max(24.0, (groundY - svgPt.y) / s);
                    setVal('fenceHeight', newHeight);
                    setVal('postHeight', newHeight + topGapVal + 8.0);
                } else if (activeHandle === 'fence-slope') {
                    const L = (parseFloat(document.getElementById('inp-length').value) || 120) * s;
                    const maxRise = Math.max(0, L * tan);
                    const topGapVal = parseFloat(document.getElementById('inp-topGap').value) || 2.0;
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
        
        try {
            currentModel = CadEngine.createCompositeDraft(draftMembers);
            let svg = CadEngine.renderSVG(currentModel);
            
            if (isDraggingDraftMember && cachedDragViewBox) {
                svg = svg.replace(/viewBox="[^"]*"/, `viewBox="${cachedDragViewBox}"`);
            } else {
                let minX = Infinity;
                let maxX = -Infinity;
                let minY = Infinity;
                let maxY = -Infinity;
                
                draftMembers.forEach(m => {
                    const x = m.origin[0];
                    const y = m.origin[1];
                    const halfL = (m.length || 60.0) / 2;
                    const size = Math.max(halfL, m.params.w || 0, m.params.h || 0, m.params.d || 0, m.params.leg1 || 0, m.params.leg2 || 0) + 8; // Member radius + 8" padding
                    minX = Math.min(minX, x - size);
                    maxX = Math.max(maxX, x + size);
                    minY = Math.min(minY, y - size);
                    maxY = Math.max(maxY, y + size);
                });
                
                // Fallback for empty drafting canvas
                if (draftMembers.length === 0) {
                    minX = -30;
                    maxX = 30;
                    minY = -20;
                    maxY = 20;
                } else {
                    // Impose a reasonable minimum view size of 30x20 inches centered on the midpoint
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
                // SVG Y coordinate goes down, whereas AutoCAD drafting space Y coordinate goes up.
                // So the SVG Y range should map minY to the bottom and maxY to the top.
                const svgMinY = -maxY * scale;
                const svgW = (maxX - minX) * scale;
                const svgH = (maxY - minY) * scale;
                
                const stableViewBox = `${svgMinX} ${svgMinY} ${svgW} ${svgH}`;
                svg = svg.replace(/viewBox="[^"]*"/, `viewBox="${stableViewBox}"`);
            }
            
            svgContainer.innerHTML = svg;
            
            const svgElement = svgContainer.querySelector('svg');
            if (svgElement) {
                draftMembers.forEach(m => {
                    const sanitizedId = m.id.replace(/_/g, '-');
                    let g = svgElement.querySelector(`g[id="${m.id}"]`) || 
                            svgElement.querySelector(`g.${m.id}`) ||
                            svgElement.querySelector(`g[id="${sanitizedId}"]`) ||
                            svgElement.querySelector(`g.${sanitizedId}`);
                    if (!g) {
                        g = Array.from(svgElement.querySelectorAll('g')).find(el => {
                            const id = el.id || "";
                            const cls = el.getAttribute('class') || "";
                            return id.indexOf(m.id) !== -1 || 
                                   cls.indexOf(m.id) !== -1 ||
                                   id.indexOf(sanitizedId) !== -1 ||
                                   cls.indexOf(sanitizedId) !== -1;
                        });
                    }
                    if (g) {
                        g.classList.add('draft-member');
                        g.setAttribute('data-member-id', m.id);
                        g.style.cursor = 'pointer';
                        
                        // Inject transparent hitbox covering bounding box for easy click-to-select and dragging
                        try {
                            let hitBoxX = 0, hitBoxY = 0, hitBoxW = 0, hitBoxH = 0;
                            let gotExtents = false;
                            
                            const scale = CadEngine.isLibReady() ? 25.4 : 10;
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
                                        // SVG Y goes down, MakerJS Y goes up.
                                        hitBoxY = -extents.high[1] * scale - 2;
                                        gotExtents = true;
                                    }
                                } catch (e) {
                                    console.warn("MakerJS extents failed, falling back to getBBox", e);
                                }
                            }
                            
                            if (!gotExtents) {
                                const bbox = g.getBBox();
                                if (bbox.width > 0 && bbox.height > 0) {
                                    hitBoxX = bbox.x - 2;
                                    hitBoxY = bbox.y - 2;
                                    hitBoxW = bbox.width + 4;
                                    hitBoxH = bbox.height + 4;
                                    gotExtents = true;
                                }
                            }
                            
                            if (gotExtents && hitBoxW > 0 && hitBoxH > 0) {
                                const hitBox = document.createElementNS("http://www.w3.org/2000/svg", "rect");
                                hitBox.setAttribute("x", hitBoxX);
                                hitBox.setAttribute("y", hitBoxY);
                                hitBox.setAttribute("width", hitBoxW);
                                hitBox.setAttribute("height", hitBoxH);
                                hitBox.setAttribute("fill", "rgba(0, 212, 255, 0.001)"); // transparent fill
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
            }
            applyZoom();
            updateDraftDimensionText();
        } catch (e) {
            console.error("Draft Render Error:", e);
        }
    }

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

    function injectCalloutLabels(svg) {
        let gCallouts = svg.querySelector('.draft-callouts-overlay');
        if (!gCallouts) {
            gCallouts = document.createElementNS("http://www.w3.org/2000/svg", "g");
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
            
            const leader = document.createElementNS("http://www.w3.org/2000/svg", "path");
            leader.setAttribute("d", `M ${cx} ${cy} L ${lx - 10} ${ly}`);
            leader.setAttribute("stroke", "#ffaa00");
            leader.setAttribute("stroke-width", "0.75");
            leader.setAttribute("fill", "none");
            gCallouts.appendChild(leader);
            
            const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            dot.setAttribute("cx", cx);
            dot.setAttribute("cy", cy);
            dot.setAttribute("r", "2");
            dot.setAttribute("fill", "#ffaa00");
            gCallouts.appendChild(dot);
            
            const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
            text.setAttribute("x", lx);
            text.setAttribute("y", ly + 4);
            text.setAttribute("fill", "#ffffff");
            text.setAttribute("font-family", "'JetBrains Mono', monospace");
            text.setAttribute("font-size", "10px");
            text.textContent = labelText;
            gCallouts.appendChild(text);
            
            const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
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

    // --- Interactive click on SVG background to deselect ---
    svgContainer.addEventListener('click', (e) => {
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
        
        let group = e.target.closest('.draft-member') || 
                    e.target.closest('.draft-member-group') || 
                    e.target.closest('[data-member-id]');
        if (!group) {
            let el = e.target;
            while (el && el !== svgContainer) {
                const id = el.id || "";
                const cls = el.getAttribute('class') || "";
                if (id.indexOf('member_') !== -1 || cls.indexOf('member_') !== -1 ||
                    id.indexOf('member-') !== -1 || cls.indexOf('member-') !== -1) {
                    group = el;
                    break;
                }
                el = el.parentElement;
            }
        }
        
        if (group) {
            const rawId = group.id || group.getAttribute('data-member-id') || (group.getAttribute('class') || "");
            let index = rawId.indexOf('member_');
            let isUnderscore = true;
            if (index === -1) {
                index = rawId.indexOf('member-');
                isUnderscore = false;
            }
            let memberId = null;
            if (index !== -1) {
                const rawPart = rawId.substring(index).split(' ')[0];
                memberId = isUnderscore ? rawPart : rawPart.replace(/-/g, '_');
            }
            logVisual(`Click detected group: "${rawId}", extracted memberId: "${memberId}"`, "info");
            if (memberId) {
                selectedMemberId = memberId;
                openDraftMemberEditor(memberId);
                renderDraftSpace();
                logVisual(`SUCCESS: Click selected member "${memberId}"`, "success");
                return;
            }
        }
        
        if (e.target.id === 'svg-container' || e.target.closest('#svg-container')) {
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
