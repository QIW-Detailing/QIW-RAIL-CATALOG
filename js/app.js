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
    
    // AutoCAD Interactive Dimensioning State
    let autocadDimModeActive = false;
    let customDimensionsList = [];
    let customDimFontSize = 12;
    let dimStartPoint = null;
    let activeSnapPoint = null;
    let cachedSnapPoints = [];

    // AutoCAD Dragging Annotation State
    let activeDraggedAnnotId = null;
    let activeDraggedAnnotType = null;
    let dragStartMousePos = null;
    let dragStartOffset = null;
    let annotationOffsets = {};
    
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
        
        const sx = snapPoint.x * scale;
        const sy = -snapPoint.y * scale;
        
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
        
        const x1 = startPoint.x * scale;
        const y1 = -startPoint.y * scale;
        const x2 = currentMouseX * scale;
        const y2 = -currentMouseY * scale;
        
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
                { val: 'plate', lbl: 'Plate / Flat Bar' },
                { val: 'hss_rect', lbl: 'HSS Rectangular' },
                { val: 'hss_circ', lbl: 'HSS Circular (Pipe)' },
                { val: 'w_beam', lbl: 'W-Beam' },
                { val: 'angles', lbl: 'Angle (L-Shape)' }
            ];

            let html = '<div class="inputs-grid">';
            
            // Style Selection
            html += generateSelectInput('Rail Style', 'railStyle', [
                { val: 'classical', lbl: 'Classical Style (Preset)' },
                { val: 'executive', lbl: 'Executive Style (Preset)' },
                { val: 'classic_custom', lbl: 'Classic Custom' },
                { val: 'executive_custom', lbl: 'Executive Custom' }
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
                { val: 'yes', lbl: 'Yes' },
                { val: 'none', lbl: 'None' }
            ], 'none');

            // Mid Post Count
            html += `<div id="grp-rail-midPostCount" class="input-group hidden">
                        <label>Number of Mid Posts</label>
                        <input type="number" id="inp-midPostCount" value="1" step="1" min="1">
                     </div>`;

            // Custom Options Wrapper
            html += `<div id="grp-rail-catalog-custom-options" class="hidden" style="grid-column: span 2; display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 15px; padding-top: 15px; border-top: 1px dashed var(--border-color);">`;
            
            // Heights
            html += generateNumInput('Fence Height (in)', 'fenceHeight', 41.0);
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

            // Mid Runner Profile
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

            // Picket Profile
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

            // Base Plates
            html += generateSelectInput('Base Plates', 'includeBasePlates', [{ val: 'no', lbl: 'None' }, { val: 'yes', lbl: 'Include Base Plates' }], 'no');
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

            html += `</div>`; // grp-rail-catalog-custom-options end
            html += '</div>'; // inputs-grid end

            dynamicInputs.innerHTML = html;

            // Wire listeners
            const railStyleSelect = document.getElementById('inp-railStyle');
            const customOptionsWrapper = document.getElementById('grp-rail-catalog-custom-options');
            const midPostsSelect = document.getElementById('inp-midPosts');
            const midPostCountGroup = document.getElementById('grp-rail-midPostCount');

            const toggleCustomOptions = () => {
                const style = railStyleSelect.value;
                if (style === 'classic_custom' || style === 'executive_custom') {
                    customOptionsWrapper.classList.remove('hidden');
                } else {
                    customOptionsWrapper.classList.add('hidden');
                }
            };

            const toggleMidPosts = () => {
                if (midPostsSelect.value === 'yes') {
                    midPostCountGroup.classList.remove('hidden');
                } else {
                    midPostCountGroup.classList.add('hidden');
                }
            };

            railStyleSelect.addEventListener('change', () => {
                toggleCustomOptions();
                renderCurrentCAD();
            });

            midPostsSelect.addEventListener('change', () => {
                toggleMidPosts();
                renderCurrentCAD();
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
        } else if (cat === 'rails_gates') {
            html += generateSelectInput('Detailing Type', 'railsGatesType', [
                { val: 'gates', lbl: 'Gates (Full Frame)' },
                { val: 'rails', lbl: 'Rails (Open Panel)' }
            ], 'gates');

            html += generateNumInput('Total Length (in)', 'length', 120);
            html += generateNumInput('Fence Height (in)', 'fenceHeight', 72);
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
                            if (lbl) lbl.textContent = isGates ? 'Gate Height (in)' : 'Fence Height (in)';
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
        cachedSnapPoints = [];
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
                const style = vals.railStyle || 'classical';
                
                // Set default presets or fetch custom values
                let fHeight = 41.0;
                let pHeight = 45.75;
                let postType = 'hss_rect';
                let postW = 1.5;
                let postH = 1.5;
                let postT = 0.1196; // 11GA
                let topRailType = 'hss_rect';
                let topRailW = 1.5;
                let topRailH = 1.5;
                let topRailT = 0.0598; // 16GA
                let botRailType = 'hss_rect';
                let botRailW = 1.5;
                let botRailH = 1.5;
                let botRailT = 0.0598; // 16GA
                let midRailType = 'none';
                let midRailW = 0;
                let midRailH = 0;
                let midRailT = 0;
                let midRailGap = 12.0;
                let picketType = 'hss_rect';
                let picketW = 0.5;
                let picketH = 0.5;
                let picketT = 0.0598; // 16GA
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
                    midRailGap = 12.0;
                    picketType = 'hss_rect';
                    picketW = 0.5;
                    picketH = 0.5;
                    picketT = 0.0598;
                    picketSpacing = 4.5;
                    includeBasePlates = 'no';
                } else {
                    // Custom classic_custom or executive_custom
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
                    bpHoleD = vals.basePlateHoleD !== undefined ? vals.basePlateHoleD : 0.5;
                    bpHoleOffsetX = vals.basePlateHoleOffsetX !== undefined ? vals.basePlateHoleOffsetX : 0.5;
                    bpHoleOffsetY = vals.basePlateHoleOffsetY !== undefined ? vals.basePlateHoleOffsetY : 0.25;
                }

                currentModel = CadEngine.createRailCatalog(
                    vals.length,
                    style,
                    vals.leftPost || 'yes',
                    vals.rightPost || 'yes',
                    vals.midPosts || 'none',
                    vals.midPosts === 'yes' ? (parseInt(vals.midPostCount) || 0) : 0,
                    fHeight,
                    pHeight,
                    postType,
                    postW,
                    postH,
                    postT,
                    topRailType,
                    topRailW,
                    topRailH,
                    topRailT,
                    botRailType,
                    botRailW,
                    botRailH,
                    botRailT,
                    midRailType,
                    midRailW,
                    midRailH,
                    midRailT,
                    midRailGap,
                    picketType,
                    picketW,
                    picketH,
                    picketT,
                    picketSpacing,
                    includeBasePlates,
                    bpW,
                    bpL,
                    bpH,
                    bpHoleD,
                    bpHoleOffsetX,
                    bpHoleOffsetY
                );

                const styleLabel = style === 'classical' ? 'Classical Style' : 
                                   style === 'executive' ? 'Executive Style' : 
                                   style === 'classic_custom' ? 'Classic Custom' : 'Executive Custom';
                dimText.textContent = `Rail: ${styleLabel} | Length: ${vals.length}" | H: ${fHeight}"`;
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
                    vals.kickPlateSize || 'PL11GA'
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
        } else if (cat === 'rails_gates') {
            const isGates = vals.railsGatesType === 'gates';
            const leftPostW = getPicketDimension(vals.leftPostType, vals.leftPostSize, vals.leftPostW);
            const rightPostW = getPicketDimension(vals.rightPostType, vals.rightPostSize, vals.rightPostW);
            const midPostW = getPicketDimension(vals.midPostType, vals.midPostSize, vals.midPostW);
            const pickW = getPicketDimension(vals.picketType, vals.picketSize, vals.picketW);
            const midPostCount = parseInt(vals.midPostCount) || 0;

            const clearWidth = vals.length - leftPostW - rightPostW;
            const numPickets = vals.picketSpacing > 0 ? Math.floor((clearWidth - pickW) / vals.picketSpacing) : 0;
            let finalPicketsCount = numPickets;
            if (midPostCount > 0 && !isGates && vals.postHeight > vals.fenceHeight) {
                const centerDist = vals.length - leftPostW/2 - rightPostW/2;
                const spanSpacing = centerDist / (midPostCount + 1);
                for (let i = 0; i < numPickets; i++) {
                    const px = leftPostW + (clearWidth - ((numPickets - 1) * vals.picketSpacing + pickW)) / 2 + i * vals.picketSpacing;
                    for (let j = 1; j <= midPostCount; j++) {
                        const midCx = leftPostW/2 + j * spanSpacing;
                        if (Math.abs(px + pickW/2 - midCx) < (midPostW/2 + pickW/2 + 0.1)) {
                            finalPicketsCount--;
                            break;
                        }
                    }
                }
            }

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
                    const drawingNo = drawingNoInput.value.trim() || 'D-101';
                    const cleanDrawingNo = drawingNo.toUpperCase().replace(/[^A-Z0-9]/g, '');
                    mainMarkInput.value = cleanDrawingNo + 'M1';
                };
                drawingNoInput.removeEventListener('input', updateMainMark);
                drawingNoInput.addEventListener('input', updateMainMark);
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
            const currWidth = parseFloat(el.getAttribute('stroke-width')) || 2.0;
            el.setAttribute('stroke-width', Math.max(5.0, currWidth * 3.5).toString());
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
            const targetW = 110;
            const targetH = 80;
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
            const pdfY = 110 - drawH / 2;

            doc.addImage(pngData, 'PNG', pdfX, pdfY, drawW, drawH);
            
            // --- DRAW BORDERS ---
            doc.setDrawColor(0, 0, 0);
            doc.setLineWidth(0.5);
            doc.rect(5, 5, 287, 200, 'S'); // Outer border
            doc.setLineWidth(0.2);
            doc.rect(7, 7, 283, 196, 'S'); // Inner border

            // Fetch inputs and define unified marks at the start of drawing/BOM
            const vals = {};
            dynamicInputs.querySelectorAll('input').forEach(inp => {
                vals[inp.id.replace('inp-', '')] = parseFloat(inp.value) || 0;
            });
            dynamicInputs.querySelectorAll('select').forEach(sel => {
                vals[sel.id.replace('inp-', '')] = sel.value;
            });

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

            let topMark = null, botMark = null, midMark = null, leftMark = null, rightMark = null;
            let midPostMark = null, picketMark = null, kpMark = null, bpMark = null;
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
                    midRailGap = 12.0;
                    picketType = 'hss_rect';
                    picketW = 0.5;
                    picketH = 0.5;
                    picketT = 0.0598;
                    picketSpacing = 4.5;
                    includeBasePlates = 'no';
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
                midPostCount = (vals.midPosts === 'yes') ? (parseInt(vals.midPostCount) || 0) : 0;

                // Count how many pickets are generated in this model
                let totalPicketCount = 0;
                const spanRanges = [];
                let currentL = (vals.leftPost === 'yes') ? postW : 0;
                
                const mpList = [];
                if (vals.midPosts === 'yes' && midPostCount > 0) {
                    const startXBound = (vals.leftPost === 'yes') ? postW : 0;
                    const endXBound = (vals.rightPost === 'yes') ? (vals.length - postW) : vals.length;
                    const centerDist = endXBound - startXBound;
                    const spanSpacing = centerDist / (midPostCount + 1);
                    for (let i = 1; i <= midPostCount; i++) {
                        const midCx = startXBound + i * spanSpacing;
                        mpList.push({ startX: midCx - postW/2, endX: midCx + postW/2 });
                    }
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

                topMark = getMark(topRailType !== 'none');
                botMark = getMark(botRailType !== 'none');
                midMark = getMark(midRailType !== 'none');
                leftMark = getMark(vals.leftPost === 'yes');
                rightMark = getMark(vals.rightPost === 'yes');
                midPostMark = getMark(vals.midPosts === 'yes' && midPostCount > 0);
                picketMark = getMark(picketType !== 'none' && finalPicketsCount > 0);
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

                clearWidth = vals.length - leftPostW - rightPostW;
                numPickets = vals.picketSpacing > 0 ? Math.floor((clearWidth - pickW) / vals.picketSpacing) : 0;
                finalPicketsCount = numPickets;
                if (midPostCount > 0 && !isGates && vals.postHeight > vals.fenceHeight) {
                    const centerDist = vals.length - leftPostW/2 - rightPostW/2;
                    const spanSpacing = centerDist / (midPostCount + 1);
                    for (let i = 0; i < numPickets; i++) {
                        const px = leftPostW + (clearWidth - ((numPickets - 1) * vals.picketSpacing + pickW)) / 2 + i * vals.picketSpacing;
                        for (let j = 1; j <= midPostCount; j++) {
                            const midCx = leftPostW/2 + j * spanSpacing;
                            if (Math.abs(px + pickW/2 - midCx) < (midPostW/2 + pickW/2 + 0.1)) {
                                finalPicketsCount--;
                                break;
                            }
                        }
                    }
                }

                topMark = getMark(vals.topRailType !== 'none');
                botMark = getMark(vals.botRailType !== 'none');
                midMark = getMark(vals.midRailType !== 'none');
                leftMark = getMark(vals.leftPostType !== 'none');
                rightMark = getMark(vals.rightPostType !== 'none');
                midPostMark = getMark(!isGates && midPostCount > 0 && vals.midPostType !== 'none');
                picketMark = getMark(vals.picketType !== 'none' && finalPicketsCount > 0);
                kpMark = getMark(isGates && vals.kickPlate && vals.kickPlate !== 'none');
                bpMark = getMark(!isGates && vals.includeBasePlates === 'yes');
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

            let cadMinX, cadMaxX, cadMinY, cadMaxY;
            let actualWidthInches, actualHeightInches;
            
            if (window.makerjs && currentModel) {
                const extents = makerjs.measure.modelExtents(currentModel);
                if (extents) {
                    cadMinX = extents.low[0];
                    cadMaxX = extents.high[0];
                    cadMinY = extents.low[1];
                    cadMaxY = extents.high[1];
                    actualWidthInches = extents.high[0] - extents.low[0];
                    actualHeightInches = extents.high[1] - extents.low[1];
                }
            }
            
            if (cadMinX === undefined) {
                cadMinX = minX / scale;
                cadMaxX = maxX / scale;
                cadMinY = minY / scale;
                cadMaxY = maxY / scale;
                actualWidthInches = widthVal / scale;
                actualHeightInches = heightVal / scale;
            }

            if (cat === 'rail_catalog') {
                const style = vals.railStyle || 'classical';
                
                let pHeight = (style === 'classical') ? 45.75 : (style === 'executive' ? 45.75 : (vals.postHeight || 36));
                let fHeight = (style === 'classical') ? 41.0 : (style === 'executive' ? 41.0 : (vals.fenceHeight || 36));
                let topH = (style === 'classical' || style === 'executive') ? 1.5 : getProfileDimension(vals.topRailType, vals.topRailSize, vals.topRailH || 1.5);
                let botH = (style === 'classical' || style === 'executive') ? 1.5 : getProfileDimension(vals.botRailType, vals.botRailSize, vals.botRailH || 1.5);
                let postW = (style === 'classical' || style === 'executive') ? 1.5 : getPicketDimension(vals.postType, vals.postSize, vals.postW || 1.5);
                let picketW = (style === 'classical' || style === 'executive') ? 0.5 : getPicketDimension(vals.picketType, vals.picketSize, vals.picketW || 0.5);
                let picketSpacing = (style === 'classical') ? 4.0 : (style === 'executive' ? 4.5 : (vals.picketSpacing || 4.0));
                let midPostCount = (vals.midPosts === 'yes') ? (parseInt(vals.midPostCount) || 0) : 0;
                let botY = pHeight - fHeight;

                // --- HORIZONTAL DIMENSIONS (TOP) ---
                // Tier 1 (Overall Length)
                drawCadDimension(0, pHeight, vals.length, pHeight, -28, formatFraction(vals.length));

                // Post Centers List
                const postCenters = [];
                postCenters.push((vals.leftPost === 'yes') ? (postW / 2) : 0);
                if (vals.midPosts === 'yes' && midPostCount > 0) {
                    const startXBound = (vals.leftPost === 'yes') ? postW : 0;
                    const endXBound = (vals.rightPost === 'yes') ? (vals.length - postW) : vals.length;
                    const centerDist = endXBound - startXBound;
                    const spanSpacing = centerDist / (midPostCount + 1);
                    for (let i = 1; i <= midPostCount; i++) {
                        postCenters.push(startXBound + i * spanSpacing);
                    }
                }
                postCenters.push((vals.rightPost === 'yes') ? (vals.length - postW / 2) : vals.length);

                // Tier 2 (Spans)
                for (let i = 0; i < postCenters.length - 1; i++) {
                    const c1 = postCenters[i];
                    const c2 = postCenters[i+1];
                    drawCadDimension(c1, pHeight, c2, pHeight, -20, formatFraction(c2 - c1));
                }

                // Tier 3 (Picket Patterns)
                for (let i = 0; i < postCenters.length - 1; i++) {
                    const c1 = postCenters[i];
                    const c2 = postCenters[i+1];
                    const spanDist = c2 - c1;
                    const numP = Math.max(0, Math.floor(spanDist / picketSpacing - 0.001));

                    if (numP >= 2) {
                        const p1 = c1 + picketSpacing;
                        const p2 = c1 + numP * picketSpacing;
                        const looseEndSpacing = c2 - p2;
                        
                        drawCadDimension(c1, pHeight, p1, pHeight, -12, formatFraction(picketSpacing));
                        drawCadDimension(p1, pHeight, p2, pHeight, -12, formatFraction(p2 - p1));
                        drawCadDimension(p2, pHeight, c2, pHeight, -12, formatFraction(looseEndSpacing));

                        const midPdf = cadToPdf((p1 + p2) / 2, pHeight);
                        const labelY = midPdf[1] - 12 + 3.2;
                        const labelText = `(${numP - 1}) SPACES @ ${formatFraction(picketSpacing)} O/C`;
                        doc.setFont('helvetica', 'normal');
                        doc.setFontSize(4.5 * (customDimFontSize / 12.0));
                        doc.text(labelText, midPdf[0], labelY, { align: "center" });
                    } else if (numP === 1) {
                        const pCenter = c1 + picketSpacing;
                        const looseEndSpacing = c2 - pCenter;
                        drawCadDimension(c1, pHeight, pCenter, pHeight, -12, formatFraction(picketSpacing));
                        drawCadDimension(pCenter, pHeight, c2, pHeight, -12, formatFraction(looseEndSpacing));
                    } else {
                        drawCadDimension(c1, pHeight, c2, pHeight, -12, formatFraction(spanDist));
                    }
                }

                // --- HORIZONTAL DIMENSIONS (BOTTOM - CLEAR OPENINGS) ---
                const clearSpans = [];
                let lastX = 0;
                
                const allPosts = [];
                if (vals.leftPost === 'yes') {
                    allPosts.push({ startX: 0, endX: postW });
                }
                if (vals.midPosts === 'yes' && midPostCount > 0) {
                    const startXBound = (vals.leftPost === 'yes') ? postW : 0;
                    const endXBound = (vals.rightPost === 'yes') ? (vals.length - postW) : vals.length;
                    const centerDist = endXBound - startXBound;
                    const spanSpacing = centerDist / (midPostCount + 1);
                    for (let i = 1; i <= midPostCount; i++) {
                        const midCx = startXBound + i * spanSpacing;
                        allPosts.push({ startX: midCx - postW/2, endX: midCx + postW/2 });
                    }
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

                clearSpans.forEach(span => {
                    drawCadDimension(span.start, 0, span.end, 0, 12, formatFraction(span.end - span.start));
                });

                // --- VERTICAL DIMENSIONS (RIGHT) ---
                // Stagger text on left and right to prevent overlapping clumsiness
                drawCadDimension(vals.length, pHeight - topH, vals.length, pHeight, 8, formatFraction(topH), "left");
                drawCadDimension(vals.length, botY + botH, vals.length, pHeight - topH, 8, formatFraction(pHeight - topH - (botY + botH)));
                drawCadDimension(vals.length, botY, vals.length, botY + botH, 8, formatFraction(botH), "left");
                drawCadDimension(vals.length, 0, vals.length, botY, 8, formatFraction(botY));
                
                drawCadDimension(vals.length, botY, vals.length, pHeight, 16, formatFraction(fHeight));
                drawCadDimension(vals.length, 0, vals.length, pHeight, 24, formatFraction(pHeight));

                // --- VERTICAL DIMENSIONS (LEFT) ---
                if (midPostCount > 0) {
                    const firstMidPostCx = postCenters[1];
                    drawCadDimension(firstMidPostCx, 0, firstMidPostCx, pHeight - topH, -8, formatFraction(pHeight - topH));
                }
            } else {
                drawCadDimension(cadMinX, cadMaxY, cadMaxX, cadMaxY, -8, formatFraction(actualWidthInches));
                drawCadDimension(cadMinX, cadMinY, cadMinX, cadMaxY, -8, formatFraction(actualHeightInches));
            }

            // --- DRAW CUSTOM AutoCAD DIMENSIONS ---
            customDimensionsList.forEach(dim => {
                drawCadDimensionDirect(dim);
            });

            // --- DRAW CALLOUT LEADERS ---
            if (cat === 'rail_catalog') {
                const leftLeaderX = Math.max(8, pdfX - 16);
                const rightLeaderX = Math.min(179, pdfX + drawW + 16);
                const style = vals.railStyle || 'classical';
                
                let pHeight = (style === 'classical') ? 45.75 : (style === 'executive' ? 45.75 : (vals.postHeight || 36));
                let fHeight = (style === 'classical') ? 41.0 : (style === 'executive' ? 41.0 : (vals.fenceHeight || 36));
                let topH = (style === 'classical' || style === 'executive') ? 1.5 : getProfileDimension(vals.topRailType, vals.topRailSize, vals.topRailH || 1.5);
                let botH = (style === 'classical' || style === 'executive') ? 1.5 : getProfileDimension(vals.botRailType, vals.botRailSize, vals.botRailH || 1.5);
                let midH = (style === 'classical') ? 0 : (style === 'executive' ? 1.5 : getProfileDimension(vals.midRailType, vals.midRailSize, vals.midRailH || 1.5));
                let midRailGap = (style === 'classical') ? 0 : (style === 'executive' ? 12.0 : (vals.midRailGap || 12.0));
                let postW = (style === 'classical' || style === 'executive') ? 1.5 : getPicketDimension(vals.postType, vals.postSize, vals.postW || 1.5);
                let picketW = (style === 'classical' || style === 'executive') ? 0.5 : getPicketDimension(vals.picketType, vals.picketSize, vals.picketW || 0.5);

                const effectiveEmbed = 0;
                const botY = pHeight - fHeight;

                // 1. Top Rail leader
                if (topMark) {
                    const cyTop = pHeight - topH / 2;
                    const pTop = cadToPdf(vals.length * 0.25, cyTop);
                    drawCadLeader(vals.length * 0.25, cyTop, leftLeaderX, pTop[1] - 5, topMark, "right", "leader-top-rail");
                }

                // 2. Bottom Rail leader
                if (botMark) {
                    const cyBot = botY + botH / 2;
                    const pBot = cadToPdf(vals.length * 0.25, cyBot);
                    drawCadLeader(vals.length * 0.25, cyBot, leftLeaderX, pBot[1] + 5, botMark, "right", "leader-bot-rail");
                }

                // 3. Left Corner Post leader
                if (leftMark) {
                    const cyLeft = pHeight * 0.5;
                    const pLeft = cadToPdf(postW / 2, cyLeft);
                    drawCadLeader(postW / 2, cyLeft, leftLeaderX, pLeft[1], leftMark, "right", "leader-left-post");
                }

                // 4. Right Corner Post leader
                if (rightMark) {
                    const cyRight = pHeight * 0.5;
                    const pRight = cadToPdf(vals.length - postW / 2, cyRight);
                    drawCadLeader(vals.length - postW / 2, cyRight, rightLeaderX, pRight[1], rightMark, "left", "leader-right-post");
                }

                // 5. Mid Runner leader
                if (midMark) {
                    const cyMid = pHeight - topH - midRailGap - midH / 2;
                    const pMid = cadToPdf(vals.length * 0.75, cyMid);
                    drawCadLeader(vals.length * 0.75, cyMid, rightLeaderX, pMid[1], midMark, "left", "leader-mid-rail");
                }

                // 6. Mid Post leader
                if (midPostMark && midPostCount > 0) {
                    const startXBound = (vals.leftPost === 'yes') ? postW : 0;
                    const endXBound = (vals.rightPost === 'yes') ? (vals.length - postW) : vals.length;
                    const centerDist = endXBound - startXBound;
                    const spanSpacing = centerDist / (midPostCount + 1);
                    const midCx = startXBound + spanSpacing;

                    const isExecutiveStyle = (style === 'executive' || style === 'executive_custom');
                    const mpH = isExecutiveStyle ? pHeight : (pHeight - topH);
                    const cyMidPost = mpH * 0.4;
                    const pMidPost = cadToPdf(midCx, cyMidPost);
                    drawCadLeader(midCx, cyMidPost, rightLeaderX, pMidPost[1] - 3, midPostMark, "left", "leader-mid-post");
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
                        const pickCx = leftPostCenter + vals.picketSpacing;

                        const picketBottomY = botY + botH;
                        const picketTopY = (midMark) ? (pHeight - topH - midRailGap - midH) : (pHeight - topH);
                        const pickCy = (picketBottomY + picketTopY) / 2;

                        const pPick = cadToPdf(pickCx, pickCy);
                        drawCadLeader(pickCx, pickCy, rightLeaderX, pPick[1] + 3, picketMark, "left", "leader-pickets");
                    }
                }
            } else if (cat === 'rails_gates') {
                const leftLeaderX = Math.max(8, pdfX - 16);
                const rightLeaderX = Math.min(179, pdfX + drawW + 16);
                const effectiveEmbed = isGates ? 0 : ((vals.includeBasePlates === 'yes') ? 0 : Math.max(0, vals.postHeight - vals.fenceHeight - 6.0));

                // 1. Top Runner / Rail leader
                if (topMark) {
                    const cyTop = (isGates ? (vals.fenceHeight - topH / 2) : (vals.postHeight - topH / 2)) - effectiveEmbed;
                    const pTop = cadToPdf(vals.length * 0.25, cyTop);
                    drawCadLeader(vals.length * 0.25, cyTop, leftLeaderX, pTop[1] - 5, topMark, "right", "leader-top-rail");
                }

                // 2. Bottom Runner / Rail leader
                if (botMark) {
                    const cyBot = (isGates ? (botH / 2) : ((vals.postHeight > vals.fenceHeight) ? (vals.postHeight - vals.fenceHeight + botH/2) : (botH / 2))) - effectiveEmbed;
                    const pBot = cadToPdf(vals.length * 0.25, cyBot);
                    drawCadLeader(vals.length * 0.25, cyBot, leftLeaderX, pBot[1] + 5, botMark, "right", "leader-bot-rail");
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
                    const pRight = cadToPdf(vals.length - rightPostW / 2, cyRight);
                    drawCadLeader(vals.length - rightPostW / 2, cyRight, rightLeaderX, pRight[1], rightMark, "left", "leader-right-post");
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
                            picketBottomY = (vals.midRailType !== 'none') ? midRailGap : ((vals.kickPlate !== 'none') ? kickPlateH : botH);
                            picketTopY = vals.fenceHeight - topH;
                        } else {
                            picketBottomY = (vals.midRailType !== 'none') ? (vals.postHeight - midRailGap) : ((vals.postHeight > vals.fenceHeight) ? (vals.postHeight - vals.fenceHeight + botH) : botH);
                            picketTopY = vals.postHeight - topH;
                        }
                        const pickCy = (picketBottomY + picketTopY) / 2;
                        const cyPick = pickCy - effectiveEmbed;

                        const pPick = cadToPdf(pickCx, cyPick);
                        drawCadLeader(pickCx, cyPick, rightLeaderX, pPick[1] - 4, picketMark, "left", "leader-pickets");
                    }
                }

                // 7. Kick Plate leader (if present)
                if (kpMark) {
                    const cyKp = (kickPlateH / 2) - effectiveEmbed;
                    const pKp = cadToPdf(vals.length * 0.75, cyKp);
                    drawCadLeader(vals.length * 0.75, cyKp, rightLeaderX, pKp[1] + 4, kpMark, "left", "leader-kickplate");
                }
            } else if (cat === 'fence') {
                const leftLeaderX = Math.max(8, pdfX - 16);
                const rightLeaderX = Math.min(179, pdfX + drawW + 16);

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
                    drawCadLeader(vals.length * 0.25, cyTop, leftLeaderX, pTop[1] - 5, topMark, "right", "leader-top-rail");
                }

                // 2. Post leader
                if (postMark) {
                    const cyPost = vals.postHeight * 0.5 - effectiveEmbed;
                    const pPost = cadToPdf(postW/2, cyPost);
                    drawCadLeader(postW/2, cyPost, leftLeaderX, pPost[1], postMark, "right", "leader-post");
                }

                // 3. Bottom Rail leader
                if (botMark) {
                    const cyBot = botY + botH/2 - effectiveEmbed;
                    const pBot = cadToPdf(vals.length * 0.25, cyBot);
                    drawCadLeader(vals.length * 0.25, cyBot, leftLeaderX, pBot[1] + 5, botMark, "right", "leader-bot-rail");
                }

                // 4. Mid Rail leader
                if (midMark) {
                    const cyMid = midY + midH/2 - effectiveEmbed;
                    const pMid = cadToPdf(vals.length * 0.75, cyMid);
                    drawCadLeader(vals.length * 0.75, cyMid, rightLeaderX, pMid[1], midMark, "left", "leader-mid-rail");
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
                        drawCadLeader(pickCx, cyPick, rightLeaderX, pPick[1] - 4, picketMark, "left", "leader-pickets");
                    }
                }
            }
            
            // Divider between CAD viewport and right-hand specification sheet
            doc.line(180, 7, 180, 175);
            // Horizontal divider above bottom blocks
            doc.line(7, 175, 290, 175);

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

            const pdfScale = (cadMaxX - cadMinX) > 0.001 ? (drawW / (cadMaxX - cadMinX)) : 1.0;

            function drawArrowhead(x, y, angle, size = 1.8) {
                const x1 = x - size * Math.cos(angle - Math.PI/6);
                const y1 = y - size * Math.sin(angle - Math.PI/6);
                const x2 = x - size * Math.cos(angle + Math.PI/6);
                const y2 = y - size * Math.sin(angle + Math.PI/6);
                doc.setFillColor(0, 0, 0);
                doc.triangle(x, y, x1, y1, x2, y2, 'F');
            }

            function drawCadDimensionDirect(dim) {
                const p1 = cadToPdf(dim.cx1, dim.cy1);
                const p2 = cadToPdf(dim.cx2, dim.cy2);
                const d1 = cadToPdf(dim.cdx1, dim.cdy1);
                const d2 = cadToPdf(dim.cdx2, dim.cdy2);
                
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
                
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(5.0 * (customDimFontSize / 12.0));
                doc.setTextColor(0, 0, 0);
                
                let textAngle = -arrowAngle * 180 / Math.PI;
                if (textAngle > 90) textAngle -= 180;
                if (textAngle < -90) textAngle += 180;
                
                const px = -dy / len;
                const py = dx / len;
                const textShiftMm = 1.8;
                const tx = midX + px * textShiftMm;
                const ty = midY + py * textShiftMm;
                
                const labelText = dim.text || formatFraction(Math.hypot(dim.cx2 - dim.cx1, dim.cy2 - dim.cy1));
                doc.text(labelText, tx, ty, { align: "center", angle: textAngle });
            }

            function drawCadDimension(cx1, cy1, cx2, cy2, offsetMm, text, textSide) {
                let finalOffsetMm = offsetMm;
                if (Math.abs(cy1 - cy2) < 0.01) {
                    if (offsetMm < 0) {
                        const scaleVal = CadEngine.isLibReady() ? 25.4 : 10;
                        const deltaY = annotationOffsets["dim-width"] !== undefined ? (annotationOffsets["dim-width"] - (35 / scaleVal)) : 0;
                        finalOffsetMm = offsetMm - (deltaY * pdfScale);
                    }
                } else if (Math.abs(cx1 - cx2) < 0.01) {
                    if (offsetMm < 0) {
                        const scaleVal = CadEngine.isLibReady() ? 25.4 : 10;
                        const deltaX = annotationOffsets["dim-height"] !== undefined ? (annotationOffsets["dim-height"] - (35 / scaleVal)) : 0;
                        finalOffsetMm = offsetMm - (deltaX * pdfScale);
                    }
                }

                const p1 = cadToPdf(cx1, cy1);
                const p2 = cadToPdf(cx2, cy2);
                
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
                
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(5.0 * (customDimFontSize / 12.0));
                doc.setTextColor(0, 0, 0);
                
                let textAngle = -arrowAngle * 180 / Math.PI;
                if (textAngle > 90) textAngle -= 180;
                if (textAngle < -90) textAngle += 180;
                
                let sideMult = Math.sign(finalOffsetMm);
                if (textSide === "left" || textSide === "opposite") {
                    sideMult = -sideMult;
                }
                const textShiftMm = 1.8 * sideMult;
                const tx = midX + px * textShiftMm;
                const ty = midY + py * textShiftMm;
                
                doc.text(text, tx, ty, { align: "center", angle: textAngle });
            }

            function drawCadLeader(targetCx, targetCy, labelPdfX, labelPdfY, text, textAlign = "left", leaderId = "") {
                let dx = 0, dy = 0;
                if (leaderId && annotationOffsets[leaderId]) {
                    dx = annotationOffsets[leaderId].dx * pdfScale;
                    dy = -annotationOffsets[leaderId].dy * pdfScale;
                }
                
                const target = cadToPdf(targetCx, targetCy);
                const finalLabelX = labelPdfX + dx;
                const finalLabelY = labelPdfY + dy;
                
                doc.setDrawColor(0, 0, 0);
                doc.setLineWidth(0.18);
                doc.line(finalLabelX, finalLabelY, target[0], target[1]);
                
                const angle = Math.atan2(target[1] - finalLabelY, target[0] - finalLabelX);
                drawArrowhead(target[0], target[1], angle, 1.2);
                
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(4.8 * (customDimFontSize / 12.0));
                doc.setTextColor(0, 0, 0);
                
                const textShift = textAlign === "left" ? 0.8 : -0.8;
                doc.text(text, finalLabelX + textShift, finalLabelY + 1.0, { align: textAlign });
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
            let desc = cat.toUpperCase();


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
                    const wVal = calculateWeight(vals.topRailType, vals.topRailSize, preciseSlopedWidth, { w: vals.topRailH, h: vals.topRailH, t: 0.12 }, numSpans);
                    
                    bomItems.push({
                        mark: topMark, 
                        qty: numSpans,
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
                    const wVal = calculateWeight(vals.postType, vals.postSize, vals.postHeight, { w: vals.postW, h: vals.postW, t: 0.15 }, numPosts);
                    
                    bomItems.push({
                        mark: postMark, 
                        qty: numPosts,
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
                    const wVal = calculateWeight(vals.botRailType, vals.botRailSize, preciseSlopedWidth, { w: vals.botRailH, h: vals.botRailH, t: 0.12 }, numSpans);
                    
                    bomItems.push({
                        mark: botMark,
                        qty: numSpans,
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
                    const wVal = calculateWeight(vals.midRailType, vals.midRailSize, preciseSlopedWidth, { w: vals.midRailH, h: vals.midRailH, t: 0.12 }, numSpans);
                    
                    bomItems.push({
                        mark: midMark,
                        qty: numSpans,
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
                    const wVal = calculateWeight(vals.picketType, vals.picketSize, picketH, { w: vals.picketW, h: vals.picketW, t: 0.08 }, totalPickets);
                    
                    bomItems.push({
                        mark: picketMark,
                        qty: totalPickets,
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
                    const wVal = calculateWeight('plate', vals.basePlateSize, bpL, { w: bpW, h: bpL, t: vals.basePlateT }, numPosts);
                    
                    bomItems.push({
                        mark: bpMark,
                        qty: numPosts,
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
                    midRailGap = 12.0;
                    picketType = 'hss_rect';
                    picketW = 0.5;
                    picketH = 0.5;
                    picketT = 0.0598;
                    picketSpacing = 4.5;
                    includeBasePlates = 'no';
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
                midPostCount = (vals.midPosts === 'yes') ? (parseInt(vals.midPostCount) || 0) : 0;
                const clearWidth = endXBound - startXBound - midPostCount * postW;
                const spanW = clearWidth / (midPostCount + 1);

                // Add Top Rail
                if (topMark) {
                    const name = (style === 'classical' || style === 'executive') ? `HSS 1.5x1.5x16GA` : (vals.topRailSize === 'CUSTOM' ? `HSS ${topRailW}x${topRailH}x${topRailT}` : vals.topRailSize);
                    
                    if (style === 'executive' || style === 'executive_custom') {
                        // Split top rail into segments
                        const segW = spanW + (vals.leftPost === 'yes' ? postW/2 : 0) + (vals.rightPost === 'yes' ? postW/2 : 0);
                        const wVal = calculateWeight(topRailType, (style === 'executive' ? 'CUSTOM' : vals.topRailSize), segW, { w: topRailW, h: topRailH, t: topRailT }, midPostCount + 1);
                        bomItems.push({
                            mark: topMark,
                            qty: midPostCount + 1,
                            desc: name,
                            remark: "TOP RUNNER",
                            len: formatFraction(segW),
                            weight: Math.round(wVal * 10) / 10,
                            shape: topRailType.toUpperCase(),
                            size: name,
                            len_dec: segW
                        });
                    } else {
                        // Continuous top rail
                        const wVal = calculateWeight(topRailType, (style === 'classical' ? 'CUSTOM' : vals.topRailSize), vals.length, { w: topRailW, h: topRailH, t: topRailT }, 1);
                        bomItems.push({
                            mark: topMark,
                            qty: 1,
                            desc: name,
                            remark: "TOP RUNNER",
                            len: formatFraction(vals.length),
                            weight: Math.round(wVal * 10) / 10,
                            shape: topRailType.toUpperCase(),
                            size: name,
                            len_dec: vals.length
                        });
                    }
                }

                // Add Bottom Rail
                if (botMark) {
                    const name = (style === 'classical' || style === 'executive') ? `HSS 1.5x1.5x16GA` : (vals.botRailSize === 'CUSTOM' ? `HSS ${botRailW}x${botRailH}x${botRailT}` : vals.botRailSize);
                    const wVal = calculateWeight(botRailType, (style === 'classical' || style === 'executive' ? 'CUSTOM' : vals.botRailSize), spanW, { w: botRailW, h: botRailH, t: botRailT }, midPostCount + 1);
                    bomItems.push({
                        mark: botMark,
                        qty: midPostCount + 1,
                        desc: name,
                        remark: "BOTTOM RUNNER",
                        len: formatFraction(spanW),
                        weight: Math.round(wVal * 10) / 10,
                        shape: botRailType.toUpperCase(),
                        size: name,
                        len_dec: spanW
                    });
                }

                // Add Mid Rail
                if (midMark && midRailType !== 'none') {
                    const name = (style === 'executive') ? `HSS 1.5x1.5x16GA` : (vals.midRailSize === 'CUSTOM' ? `HSS ${midRailW}x${midRailH}x${midRailT}` : vals.midRailSize);
                    const wVal = calculateWeight(midRailType, (style === 'executive' ? 'CUSTOM' : vals.midRailSize), spanW, { w: midRailW, h: midRailH, t: midRailT }, midPostCount + 1);
                    bomItems.push({
                        mark: midMark,
                        qty: midPostCount + 1,
                        desc: name,
                        remark: "MID RUNNER",
                        len: formatFraction(spanW),
                        weight: Math.round(wVal * 10) / 10,
                        shape: midRailType.toUpperCase(),
                        size: name,
                        len_dec: spanW
                    });
                }

                // Add Left Post
                if (leftMark) {
                    const name = (style === 'classical' || style === 'executive') ? `HSS 1.5x1.5x11GA` : (vals.postSize === 'CUSTOM' ? `HSS ${postW}x${postH}x${postT}` : vals.postSize);
                    const wVal = calculateWeight(postType, (style === 'classical' || style === 'executive' ? 'CUSTOM' : vals.postSize), pHeight, { w: postW, h: postH, t: postT }, 1);
                    bomItems.push({
                        mark: leftMark,
                        qty: 1,
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
                    const name = (style === 'classical' || style === 'executive') ? `HSS 1.5x1.5x11GA` : (vals.postSize === 'CUSTOM' ? `HSS ${postW}x${postH}x${postT}` : vals.postSize);
                    const wVal = calculateWeight(postType, (style === 'classical' || style === 'executive' ? 'CUSTOM' : vals.postSize), pHeight, { w: postW, h: postH, t: postT }, 1);
                    bomItems.push({
                        mark: rightMark,
                        qty: 1,
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
                    const name = (style === 'classical' || style === 'executive') ? `HSS 1.5x1.5x11GA` : (vals.postSize === 'CUSTOM' ? `HSS ${postW}x${postH}x${postT}` : vals.postSize);
                    const isExecutiveStyle = (style === 'executive' || style === 'executive_custom');
                    const mpH = isExecutiveStyle ? pHeight : (pHeight - topRailH);
                    const wVal = calculateWeight(postType, (style === 'classical' || style === 'executive' ? 'CUSTOM' : vals.postSize), mpH, { w: postW, h: postH, t: postT }, midPostCount);
                    bomItems.push({
                        mark: midPostMark,
                        qty: midPostCount,
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
                    const picketBottomY = botH;
                    const picketTopY = (midRailType !== 'none') ? (pHeight - topH - midRailGap - midH) : (pHeight - topH);
                    const picketLen = picketTopY - picketBottomY;
                    const wVal = calculateWeight(picketType, (style === 'classical' || style === 'executive' ? 'CUSTOM' : vals.picketSize), picketLen, { w: picketW, h: picketH, t: picketT }, finalPicketsCount);
                    
                    bomItems.push({
                        mark: picketMark,
                        qty: finalPicketsCount,
                        desc: name,
                        remark: "PICKET",
                        len: formatFraction(picketLen),
                        weight: Math.round(wVal * 10) / 10,
                        shape: picketType.toUpperCase(),
                        size: name,
                        len_dec: picketLen
                    });
                }

                // Add Base Plates
                if (bpMark && includeBasePlates === 'yes') {
                    const totalPostsCount = (vals.leftPost === 'yes' ? 1 : 0) + (vals.rightPost === 'yes' ? 1 : 0) + midPostCount;
                    if (totalPostsCount > 0) {
                        const bpName = vals.basePlateSize === 'CUSTOM' ? `PL ${vals.basePlateT}"` : vals.basePlateSize;
                        const wVal = calculateWeight('plate', vals.basePlateSize, bpL, { w: bpW, h: bpL, t: vals.basePlateT }, totalPostsCount);
                        
                        bomItems.push({
                            mark: bpMark,
                            qty: totalPostsCount,
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
                const topRailLen = vals.length;
                const preciseTopLen = Math.round((cos > 0.001 ? (topRailLen / cos) : topRailLen) * 16) / 16;
                
                let botRailLen = vals.length;
                if (isExtended) {
                    botRailLen = vals.length - leftPostW - rightPostW;
                }
                const preciseBotLen = Math.round((cos > 0.001 ? (botRailLen / cos) : botRailLen) * 16) / 16;
                
                let midRailLen = vals.length - leftPostW - rightPostW;
                const preciseMidLen = Math.round((cos > 0.001 ? (midRailLen / cos) : midRailLen) * 16) / 16;

                const midPostHeight = isExtended ? (vals.postHeight - vals.fenceHeight) : 0;
                const effectiveEmbed = (vals.includeBasePlates === 'yes') ? 0 : Math.max(0, vals.postHeight - vals.fenceHeight - 6.0);
                const finalMidPostHeight = midPostHeight + effectiveEmbed;

                const clearWidth = vals.length - leftPostW - rightPostW;
                const numPickets = vals.picketSpacing > 0 ? Math.floor((clearWidth - pickW) / vals.picketSpacing) : 0;
                
                // Subtract pickets that overlap mid posts
                let finalPicketsCount = numPickets;
                if (midPostCount > 0 && isExtended) {
                    const centerDist = vals.length - leftPostW/2 - rightPostW/2;
                    const spanSpacing = centerDist / (midPostCount + 1);
                    for (let i = 0; i < numPickets; i++) {
                        const px = leftPostW + (clearWidth - ((numPickets - 1) * vals.picketSpacing + pickW)) / 2 + i * vals.picketSpacing;
                        for (let j = 1; j <= midPostCount; j++) {
                            const midCx = leftPostW/2 + j * spanSpacing;
                            if (Math.abs(px + pickW/2 - midCx) < (midPostW/2 + pickW/2 + 0.1)) {
                                finalPicketsCount--;
                                break;
                            }
                        }
                    }
                }

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
                    const wVal = calculateWeight(vals.topRailType, vals.topRailSize, preciseTopLen, { w: vals.topRailH, h: vals.topRailH, t: 0.12 }, 1);
                    
                    bomItems.push({
                        mark: topMark,
                        qty: 1,
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
                    const wVal = calculateWeight(vals.botRailType, vals.botRailSize, preciseBotLen, { w: vals.botRailH, h: vals.botRailH, t: 0.12 }, 1);
                    
                    bomItems.push({
                        mark: botMark,
                        qty: 1,
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
                    const wVal = calculateWeight(vals.midRailType, vals.midRailSize, preciseMidLen, { w: vals.midRailH, h: vals.midRailH, t: 0.12 }, 1);
                    
                    bomItems.push({
                        mark: midMark,
                        qty: 1,
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
                    const wVal = calculateWeight(vals.leftPostType, vals.leftPostSize, runnerH, { w: vals.leftPostW, h: vals.leftPostW, t: 0.15 }, 1);
                    
                    bomItems.push({
                        mark: leftMark,
                        qty: 1,
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
                    const wVal = calculateWeight(vals.rightPostType, vals.rightPostSize, runnerH, { w: vals.rightPostW, h: vals.rightPostW, t: 0.15 }, 1);
                    
                    bomItems.push({
                        mark: rightMark,
                        qty: 1,
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
                    const wVal = calculateWeight(vals.midPostType, vals.midPostSize, finalMidPostHeight, { w: vals.midPostW, h: vals.midPostW, t: 0.15 }, midPostCount);
                    
                    bomItems.push({
                        mark: midPostMark,
                        qty: midPostCount,
                        desc: name,
                        remark: "MID POST",
                        len: formatFraction(finalMidPostHeight),
                        weight: Math.round(wVal * 10) / 10,
                        shape: vals.midPostType.toUpperCase(),
                        size: name,
                        len_dec: finalMidPostHeight
                    });
                }

                // Add Pickets
                if (picketMark) {
                    const picketBottomY = (isGates && vals.midRailType !== 'none') 
                        ? midRailGap 
                        : ((vals.kickPlate !== 'none') ? vals.kickPlateH : botH);
                    
                    const picketTopY = (vals.midRailType !== 'none') 
                        ? (isGates ? (vals.fenceHeight - topH) : (topY - midRailGap - midH)) 
                        : (vals.fenceHeight - topH);
                    const picketH = Math.max(2, picketTopY - picketBottomY);
                    
                    const name = vals.picketSize === 'CUSTOM' ? `HSS ${vals.picketW}x${vals.picketW}` : vals.picketSize;
                    const wVal = calculateWeight(vals.picketType, vals.picketSize, picketH, { w: vals.picketW, h: vals.picketW, t: 0.08 }, finalPicketsCount);
                    
                    bomItems.push({
                        mark: picketMark,
                        qty: finalPicketsCount,
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
                    const kpName = selectedPlate.name;
                    
                    const wVal = calculateWeight('plate', kickPlateSize, kpW, { w: kpW, h: kpH, t: kpT }, kpQty);
                    
                    bomItems.push({
                        mark: kpMark,
                        qty: kpQty,
                        desc: kpName,
                        remark: `KICK PL (${vals.kickPlate === '2_sides' ? '2S' : '1S'} ${isOuter ? 'OUT' : 'INN'})`,
                        len: formatFraction(kpW),
                        weight: Math.round(wVal * 10) / 10,
                        shape: 'PLATE',
                        size: kpName,
                        len_dec: kpW
                    });
                }

                // Add Base Plates
                if (bpMark) {
                    const totalPosts = (vals.leftPostType !== 'none' ? 1 : 0) + (vals.rightPostType !== 'none' ? 1 : 0) + (vals.midPostType !== 'none' ? midPostCount : 0);
                    const bpName = vals.basePlateSize === 'CUSTOM' ? `PL ${vals.basePlateT}"` : vals.basePlateSize;
                    const wVal = calculateWeight('plate', vals.basePlateSize, bpL, { w: bpW, h: bpL, t: vals.basePlateT }, totalPosts);
                    
                    bomItems.push({
                        mark: bpMark,
                        qty: totalPosts,
                        desc: `${bpW}x${bpL} Plate`,
                        remark: "BASE PLATE",
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
            
            // Draw empty rows up to the top of the bottom blocks (y = 175)
            while (currentY < 175) {
                const rowH = Math.min(5.5, 175 - currentY);
                if (rowH < 2) break;
                doc.rect(bomX, currentY, bomW, rowH, 'S');
                doc.line(187, currentY, 187, currentY + rowH);
                doc.line(201, currentY, 201, currentY + rowH);
                doc.line(232, currentY, 232, currentY + rowH);
                doc.line(243, currentY, 243, currentY + rowH);
                doc.line(254, currentY, 254, currentY + rowH);
                doc.line(266, currentY, 266, currentY + rowH);
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
                if (autocadDimToolbar) autocadDimToolbar.classList.remove('hidden');
                
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
                if (autocadDimToolbar) autocadDimToolbar.classList.add('hidden');
                
                dimStartPoint = null;
                activeSnapPoint = null;
                
                // Clean snap and temp overlay layers
                const svgElement = svgContainer.querySelector('svg');
                if (svgElement) {
                    const gSnap = svgElement.querySelector('.cad-snap-overlay');
                    if (gSnap) gSnap.innerHTML = "";
                    const gTemp = svgElement.querySelector('.cad-temp-dim-overlay');
                    if (gTemp) gTemp.innerHTML = "";
                }
            }
        });
    }

    // Font size controls
    const dimFontIncBtn = document.getElementById('dim-font-inc');
    const dimFontDecBtn = document.getElementById('dim-font-dec');
    const dimFontSizeVal = document.getElementById('dim-font-size-val');

    if (dimFontIncBtn) {
        dimFontIncBtn.addEventListener('click', () => {
            customDimFontSize = Math.min(32, customDimFontSize + 1);
            if (dimFontSizeVal) dimFontSizeVal.textContent = `${customDimFontSize}px`;
            if (currentMode === 'shapes') {
                renderCurrentCAD();
            } else if (currentMode === 'draft') {
                renderDraftSpace();
            }
        });
    }
    
    if (dimFontDecBtn) {
        dimFontDecBtn.addEventListener('click', () => {
            customDimFontSize = Math.max(6, customDimFontSize - 1);
            if (dimFontSizeVal) dimFontSizeVal.textContent = `${customDimFontSize}px`;
            if (currentMode === 'shapes') {
                renderCurrentCAD();
            } else if (currentMode === 'draft') {
                renderDraftSpace();
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
                vals[inp.id.replace('inp-', '')] = parseFloat(inp.value) || 0;
            });
            dynamicInputs.querySelectorAll('select').forEach(sel => {
                vals[sel.id.replace('inp-', '')] = sel.value;
            });
            
            const isGates = vals.railsGatesType === 'gates';
            const drawingNo = document.getElementById('exp-drawingNo')?.value || 'D-101';
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
                let fHeight = 41.0;
                let pHeight = 45.75;
                let postType = 'hss_rect';
                let postW = 1.5;
                let postH = 1.5;
                if (style === 'classical' || style === 'executive') {
                    postW = 1.5; postH = 1.5;
                } else {
                    postType = vals.postType || 'hss_rect';
                    postW = getPicketDimension(vals.postType, vals.postSize, vals.postW || 1.5);
                    postH = getProfileDimension(vals.postType, vals.postSize, vals.postW || 1.5);
                }
                let topH = (style === 'classical' || style === 'executive') ? 1.5 : getProfileDimension(vals.topRailType, vals.topRailSize, vals.topRailH || 1.5);
                let botH = (style === 'classical' || style === 'executive') ? 1.5 : getProfileDimension(vals.botRailType, vals.botRailSize, vals.botRailH || 1.5);
                let midH = (style === 'classical') ? 0 : (style === 'executive' ? 1.5 : getProfileDimension(vals.midRailType, vals.midRailSize, vals.midRailH || 1.5));
                let picketW = (style === 'classical' || style === 'executive') ? 0.5 : getPicketDimension(vals.picketType, vals.picketSize, vals.picketW || 0.5);
                let picketSpacing = (style === 'classical') ? 4.0 : (style === 'executive' ? 4.5 : (vals.picketSpacing || 4.0));
                let midPostCount = (vals.midPosts === 'yes') ? (parseInt(vals.midPostCount) || 0) : 0;
                let botY = pHeight - fHeight;
                let midRailGap = (style === 'classical') ? 0 : (style === 'executive' ? 12.0 : (vals.midRailGap || 12.0));

                const topMark = getMark(vals.topRailType !== 'none');
                const botMark = getMark(vals.botRailType !== 'none');
                const midMark = getMark(style !== 'classical' && vals.midRailType !== 'none');
                const leftMark = getMark(vals.leftPost === 'yes' && vals.postType !== 'none');
                const rightMark = getMark(vals.rightPost === 'yes' && vals.postType !== 'none');
                const midPostMark = getMark(vals.midPosts === 'yes' && midPostCount > 0 && vals.postType !== 'none');
                const picketMark = getMark(vals.picketType !== 'none');

                if (topMark) {
                    const sizeName = vals.topRailSize === 'CUSTOM' ? `HSS ${vals.topRailH}x${vals.topRailH}` : vals.topRailSize;
                    bomItems.push({ mark: topMark, remark: "TOP RAIL", desc: sizeName, qty: 1, len: formatFraction(vals.length) });
                }
                if (botMark) {
                    const sizeName = vals.botRailSize === 'CUSTOM' ? `HSS ${vals.botRailH}x${vals.botRailH}` : vals.botRailSize;
                    bomItems.push({ mark: botMark, remark: "BOTTOM RAIL", desc: sizeName, qty: 1, len: formatFraction(vals.length) });
                }
                if (leftMark) {
                    const sizeName = vals.postSize === 'CUSTOM' ? `HSS ${vals.postW}x${vals.postW}` : vals.postSize;
                    bomItems.push({ mark: leftMark, remark: "LEFT POST", desc: sizeName, qty: 1, len: formatFraction(pHeight) });
                }
                if (rightMark) {
                    const sizeName = vals.postSize === 'CUSTOM' ? `HSS ${vals.postW}x${vals.postW}` : vals.postSize;
                    bomItems.push({ mark: rightMark, remark: "RIGHT POST", desc: sizeName, qty: 1, len: formatFraction(pHeight) });
                }
                if (midMark) {
                    const sizeName = vals.midRailSize === 'CUSTOM' ? `HSS ${vals.midRailH}x${vals.midRailH}` : vals.midRailSize;
                    bomItems.push({ mark: midMark, remark: "MID RUNNER", desc: sizeName, qty: 1, len: formatFraction(vals.length) });
                }
                if (midPostMark) {
                    const sizeName = vals.postSize === 'CUSTOM' ? `HSS ${vals.postW}x${vals.postW}` : vals.postSize;
                    const isExecutiveStyle = (style === 'executive' || style === 'executive_custom');
                    const mpH = isExecutiveStyle ? pHeight : (pHeight - topH);
                    bomItems.push({ mark: midPostMark, remark: "MID POST", desc: sizeName, qty: midPostCount, len: formatFraction(mpH) });
                }
                if (picketMark) {
                    const sizeName = vals.picketSize === 'CUSTOM' ? `HSS ${vals.picketW}x${vals.picketW}` : vals.picketSize;
                    const picketBottomY = botY + botH;
                    const picketTopY = (midMark) ? (pHeight - topH - midRailGap - midH) : (pHeight - topH);
                    const picketH = picketTopY - picketBottomY;
                    bomItems.push({ mark: picketMark, remark: "PICKET", desc: sizeName, qty: "AR", len: formatFraction(picketH) });
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
                const clearWidth = vals.length - leftPostW - rightPostW;
                const numPickets = vals.picketSpacing > 0 ? Math.floor((clearWidth - pickW) / vals.picketSpacing) : 0;
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

                let preciseTopLen = vals.length;
                if (cos > 0.001) preciseTopLen = vals.length / cos;
                let preciseBotLen = vals.length;
                if (isExtended) preciseBotLen = vals.length - leftPostW - rightPostW;
                if (cos > 0.001) preciseBotLen = preciseBotLen / cos;
                let preciseMidLen = vals.length;
                if (isExtended) preciseMidLen = vals.length - leftPostW - rightPostW;
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
                if (picketMark) {
                    const sizeName = vals.picketSize === 'CUSTOM' ? `HSS ${vals.picketW}x${vals.picketW}` : vals.picketSize;
                    let picketBottomY = (vals.midRailType !== 'none') ? vals.midRailGap : ((vals.kickPlate !== 'none') ? kickPlateH : botH);
                    let picketTopY = vals.fenceHeight - topH;
                    if (!isGates) {
                        picketBottomY = (vals.midRailType !== 'none') ? (vals.postHeight - vals.midRailGap) : ((vals.postHeight > vals.fenceHeight) ? (vals.postHeight - vals.fenceHeight + botH) : botH);
                        picketTopY = vals.postHeight - topH;
                    }
                    const picketH = picketTopY - picketBottomY;
                    bomItems.push({ mark: picketMark, remark: "PICKET", desc: sizeName, qty: finalPicketsCount, len: formatFraction(picketH) });
                }
                if (kpMark) {
                    const kpW = vals.length - leftPostW - rightPostW;
                    bomItems.push({ mark: kpMark, remark: "KICK PLATE", desc: vals.kickPlateSize || "PL11GA", qty: 1, len: formatFraction(kpW) });
                }
                if (bpMark) {
                    const totalPosts = 2 + midPostCount;
                    const bpW = vals.basePlateW || 6.0;
                    const bpL = vals.basePlateL || 6.0;
                    bomItems.push({ mark: bpMark, remark: "BASE PLATE", desc: `${bpW}x${bpL} Plate`, qty: totalPosts, len: `${bpW}x${bpL}x${vals.basePlateT || 0.5}"` });
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
                const plateMark = mainMarkCode;
                const desc = `${vals.w}" x ${vals.h}" x ${vals.basePlateT || 0.5}" Plate`;
                bomItems.push({
                    mark: plateMark,
                    remark: vals.fabMethod === 'bent' ? "BENT PLATE" : "PLATE",
                    desc: desc,
                    qty: 1,
                    len: vals.fabMethod === 'bent' ? `${vals.leg1 + vals.leg2}"` : `${vals.w}"`
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
            
            const safePostSpacing = Math.max(1.0, vals.postSpacing || 48.0);
            const numSpans = Math.max(1, Math.round(vals.length / safePostSpacing));
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
                        const px = (leftPostW/2 + i * spanSpacing) * 25.4;
                        const py = px * tan;
                        handles.push({
                            x: px,
                            y: py + vals.fenceHeight * 25.4,
                            name: `rails-midpost-${i}`,
                            tooltip: `Mid Post ${i} Position`
                        });
                    }
                }
                handles.push({ x: vals.picketSpacing * 25.4, y: vals.fenceHeight * 25.4 - 4 * 25.4, name: 'fence-picket-spacing', tooltip: 'Drag to adjust Picket Spacing' });
                handles.push({ x: 0, y: vals.fenceHeight * 25.4, name: 'fence-height', tooltip: 'Drag to adjust Height' });
                handles.push({ x: vals.length / 2 * 25.4, y: (vals.length / 2 * 25.4) * tan, name: 'fence-slope', tooltip: 'Drag to adjust Bottom Slope' });
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
        const dragTarget = e.target.closest('.annot-text-draggable');
        if (dragTarget) {
            activeDraggedAnnotId = dragTarget.getAttribute('data-annot-id');
            activeDraggedAnnotType = dragTarget.getAttribute('data-annot-type');
            dragStartMousePos = { x: e.clientX, y: e.clientY };
            
            if (activeDraggedAnnotType === 'dimension') {
                dragStartOffset = annotationOffsets[activeDraggedAnnotId] !== undefined ? annotationOffsets[activeDraggedAnnotId] : (35 / (CadEngine.isLibReady() ? 25.4 : 10));
            } else if (activeDraggedAnnotType === 'leader') {
                const off = annotationOffsets[activeDraggedAnnotId];
                dragStartOffset = off ? { dx: off.dx, dy: off.dy } : { dx: 0, dy: 0 };
            } else {
                dragStartOffset = null;
            }
            
            e.preventDefault();
            e.stopPropagation();
            return;
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
                        
                        const scale = CadEngine.isLibReady() ? 25.4 : 10;
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
                
                const scale = CadEngine.isLibReady() ? 25.4 : 10;
                const deltaX = (cadPt2.x - cadPt1.x) / scale;
                const deltaY = -(cadPt2.y - cadPt1.y) / scale;
                
                if (activeDraggedAnnotType === 'dimension') {
                    if (activeDraggedAnnotId === 'dim-width') {
                        annotationOffsets['dim-width'] = dragStartOffset - deltaY;
                    } else if (activeDraggedAnnotId === 'dim-height') {
                        annotationOffsets['dim-height'] = dragStartOffset - deltaX;
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
                const scale = CadEngine.isLibReady() ? 25.4 : 10;
                const mouseCadX = svgPt.x / scale;
                const mouseCadY = -svgPt.y / scale;
                
                if (cachedSnapPoints.length === 0 && currentModel) {
                    cachedSnapPoints = getModelSnapPoints(currentModel, scale);
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
                    const sx = p.x * scale;
                    const sy = -p.y * scale;
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
        if (activeDraggedAnnotId) {
            activeDraggedAnnotId = null;
            activeDraggedAnnotType = null;
            dragStartMousePos = null;
            dragStartOffset = null;
        }
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
            const scale = CadEngine.isLibReady() ? 25.4 : 10;
            const mouseCadX = svgPt.x / scale;
            const mouseCadY = -svgPt.y / scale;

            const clickPoint = activeSnapPoint ? { x: activeSnapPoint.x, y: activeSnapPoint.y } : { x: mouseCadX, y: mouseCadY };
            
            if (!dimStartPoint) {
                dimStartPoint = { x: clickPoint.x, y: clickPoint.y };
            } else {
                const p1 = dimStartPoint;
                const p2 = { x: clickPoint.x, y: clickPoint.y };
                
                if (Math.hypot(p2.x - p1.x, p2.y - p1.y) > 0.01) {
                    let cx_mid = 0, cy_mid = 0;
                    if (window.makerjs && currentModel) {
                        const extents = makerjs.measure.modelExtents(currentModel);
                        if (extents) {
                            cx_mid = (extents.low[0] + extents.high[0]) / 2;
                            cy_mid = (extents.low[1] + extents.high[1]) / 2;
                        }
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
                    
                    const offsetInches = 35 / scale;
                    
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
        const scale = CadEngine.isLibReady() ? 25.4 : 10;
        
        let gAnnots = svg.querySelector('.cad-annotations-overlay');
        if (!gAnnots) {
            gAnnots = svg.ownerDocument.createElementNS("http://www.w3.org/2000/svg", "g");
            gAnnots.setAttribute("class", "cad-annotations-overlay");
            svg.appendChild(gAnnots);
        } else {
            gAnnots.innerHTML = "";
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
        let actualWidthInches = 0, actualHeightInches = 0;
        
        if (window.makerjs) {
            const extents = makerjs.measure.modelExtents(currentModel);
            if (extents) {
                cadMinX = extents.low[0] * scale;
                cadMaxX = extents.high[0] * scale;
                cadMinY = extents.low[1] * scale;
                cadMaxY = extents.high[1] * scale;
                actualWidthInches = extents.high[0] - extents.low[0];
                actualHeightInches = extents.high[1] - extents.low[1];
            }
        }
        
        if (cadMinX === undefined || isNaN(actualWidthInches) || actualWidthInches <= 0) {
            return;
        }

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

        // Helper to draw lines
        const drawLine = (x1, y1, x2, y2, stroke = "#ffaa00", width = "1.5", mStart = "", mEnd = "") => {
            const line = svg.ownerDocument.createElementNS("http://www.w3.org/2000/svg", "line");
            line.setAttribute("x1", x1);
            line.setAttribute("y1", y1);
            line.setAttribute("x2", x2);
            line.setAttribute("y2", y2);
            line.setAttribute("stroke", stroke);
            line.setAttribute("stroke-width", width);
            if (mStart) line.setAttribute("marker-start", `url(#${mStart})`);
            if (mEnd) line.setAttribute("marker-end", `url(#${mEnd})`);
            gAnnots.appendChild(line);
            return line;
        };

        // Helper to draw text
        const drawText = (val, x, y, anchor = "middle", rotation = 0, rx = 0, ry = 0) => {
            const text = svg.ownerDocument.createElementNS("http://www.w3.org/2000/svg", "text");
            text.setAttribute("x", x);
            text.setAttribute("y", y);
            text.setAttribute("fill", "#ffffff");
            text.setAttribute("font-family", "'JetBrains Mono', monospace, sans-serif");
            text.setAttribute("font-size", customDimFontSize + "px");
            text.setAttribute("font-weight", "bold");
            text.setAttribute("text-anchor", anchor);
            if (rotation) {
                text.setAttribute("transform", `rotate(${rotation}, ${rx}, ${ry})`);
            }
            text.textContent = val;
            gAnnots.appendChild(text);
            return text;
        };

        // 1. Horizontal Dimension
        const widthOffset = annotationOffsets["dim-width"] !== undefined ? annotationOffsets["dim-width"] : (35 / scale);
        const hY = -cadMaxY - (widthOffset * scale);
        // Extension lines
        drawLine(cadMinX, -cadMaxY, cadMinX, hY - 5, "#ffaa00", "0.5");
        drawLine(cadMaxX, -cadMaxY, cadMaxX, hY - 5, "#ffaa00", "0.5");
        // Dimension line
        drawLine(cadMinX, hY, cadMaxX, hY, "#ffaa00", "1.2", "annot-arrow-start", "annot-arrow-end");
        // Text
        const wText = drawText(formatFraction(actualWidthInches), (cadMinX + cadMaxX)/2, hY - 6);
        wText.setAttribute("class", "annot-text-draggable");
        wText.setAttribute("style", "cursor: move; pointer-events: auto;");
        wText.setAttribute("data-annot-id", "dim-width");
        wText.setAttribute("data-annot-type", "dimension");

        // 2. Vertical Dimension
        const heightOffset = annotationOffsets["dim-height"] !== undefined ? annotationOffsets["dim-height"] : (35 / scale);
        const vX = cadMinX - (heightOffset * scale);
        // Extension lines
        drawLine(cadMinX, -cadMinY, vX - 5, -cadMinY, "#ffaa00", "0.5");
        drawLine(cadMinX, -cadMaxY, vX - 5, -cadMaxY, "#ffaa00", "0.5");
        // Dimension line
        drawLine(vX, -cadMinY, vX, -cadMaxY, "#ffaa00", "1.2", "annot-arrow-start", "annot-arrow-end");
        // Text
        const hText = drawText(formatFraction(actualHeightInches), vX - 6, (-cadMinY - cadMaxY)/2, "middle", -90, vX - 6, (-cadMinY - cadMaxY)/2);
        hText.setAttribute("class", "annot-text-draggable");
        hText.setAttribute("style", "cursor: move; pointer-events: auto;");
        hText.setAttribute("data-annot-id", "dim-height");
        hText.setAttribute("data-annot-type", "dimension");

        // 3. Piece/Main Mark Callout Leaders (Only for rails_gates and fence)
        const vals = {};
        dynamicInputs.querySelectorAll('input').forEach(inp => {
            vals[inp.id.replace('inp-', '')] = parseFloat(inp.value) || 0;
        });
        dynamicInputs.querySelectorAll('select').forEach(sel => {
            vals[sel.id.replace('inp-', '')] = sel.value;
        });

        const drawingNo = document.getElementById('exp-drawingNo')?.value || 'D-101';
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
            
            let dx = 0, dy = 0;
            if (leaderId && annotationOffsets[leaderId]) {
                dx = annotationOffsets[leaderId].dx;
                dy = annotationOffsets[leaderId].dy;
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
            } else if (leaderId === "leader-bot-rail") {
                descLabel = isGates ? "BOTTOM RUNNER" : "BOTTOM RAIL";
                lengthVal = vals.length;
                if (isExtended) lengthVal = vals.length - (vals.leftPostW || vals.postW || 1.5) - (vals.rightPostW || vals.postW || 1.5);
                if (cos > 0.001) lengthVal = lengthVal / cos;
            } else if (leaderId === "leader-mid-rail") {
                descLabel = isGates ? "MID RUNNER" : "MID RAIL";
                lengthVal = vals.length;
                if (isExtended) lengthVal = vals.length - (vals.leftPostW || vals.postW || 1.5) - (vals.rightPostW || vals.postW || 1.5);
                if (cos > 0.001) lengthVal = lengthVal / cos;
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
                lengthVal = isExecutiveStyle ? runnerH : (runnerH - (vals.topRailH || 1.5));
            } else if (leaderId === "leader-pickets") {
                descLabel = "PICKET";
                let topH = (cat === 'rail_catalog') ? ((vals.railStyle === 'classical' || vals.railStyle === 'executive') ? 1.5 : (vals.topRailH || 1.5)) : (vals.topRailH || 1.5);
                let botH = (cat === 'rail_catalog') ? ((vals.railStyle === 'classical' || vals.railStyle === 'executive') ? 1.5 : (vals.botRailH || 1.5)) : (vals.botRailH || 1.5);
                let midH = (cat === 'rail_catalog') ? ((vals.railStyle === 'classical') ? 0 : (vals.railStyle === 'executive' ? 1.5 : (vals.midRailH || 1.5))) : (vals.midH || 1.5);
                let midRailGap = vals.midRailGap !== undefined ? vals.midRailGap : 12.0;
                let kickPlateH = vals.kickPlateH || 12.0;
                
                let picketBottomY, picketTopY;
                if (cat === 'rail_catalog') {
                    const style = vals.railStyle || 'classical';
                    let pHeight = (style === 'classical') ? 45.75 : (style === 'executive' ? 45.75 : (vals.postHeight || 36));
                    let fHeight = (style === 'classical') ? 41.0 : (style === 'executive' ? 41.0 : (vals.fenceHeight || 36));
                    let botY = pHeight - fHeight;
                    let midMarkActive = style !== 'classical' && vals.midRailType !== 'none';
                    
                    picketBottomY = botY + botH;
                    picketTopY = (midMarkActive) ? (pHeight - topH - midRailGap - midH) : (pHeight - topH);
                } else if (cat === 'rails_gates') {
                    if (isGates) {
                        picketBottomY = (vals.midRailType !== 'none') ? midRailGap : ((vals.kickPlate !== 'none') ? kickPlateH : botH);
                        picketTopY = vals.fenceHeight - topH;
                    } else {
                        picketBottomY = (vals.midRailType !== 'none') ? (vals.postHeight - midRailGap) : ((vals.postHeight > vals.fenceHeight) ? (vals.postHeight - vals.fenceHeight + botH) : botH);
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
                lengthVal = vals.length - (vals.leftPostW || vals.postW || 1.5) - (vals.rightPostW || vals.postW || 1.5);
            }
            
            const fullLabelText = lengthVal > 0 
                ? `${markText} (${descLabel} - ${formatFraction(lengthVal)})`
                : `${markText} (${descLabel})`;

            const svgCx = tcx * scale;
            const svgCy = -tcy * scale;
            
            const defaultLabelX = (side === "left") ? (cadMinX - 55) : (cadMaxX + 55);
            const defaultLabelY = svgCy - 12;
            
            const labelX = defaultLabelX + (dx * scale);
            const labelY = defaultLabelY - (dy * scale);
            
            const leader = svg.ownerDocument.createElementNS("http://www.w3.org/2000/svg", "line");
            leader.setAttribute("x1", labelX);
            leader.setAttribute("y1", labelY);
            leader.setAttribute("x2", svgCx);
            leader.setAttribute("y2", svgCy);
            leader.setAttribute("stroke", "#ffaa00");
            leader.setAttribute("stroke-width", "1.2");
            leader.setAttribute("fill", "none");
            leader.setAttribute("marker-end", "url(#leader-arrow)");
            gAnnots.appendChild(leader);
            
            const dot = svg.ownerDocument.createElementNS("http://www.w3.org/2000/svg", "circle");
            dot.setAttribute("cx", svgCx);
            dot.setAttribute("cy", svgCy);
            dot.setAttribute("r", "2.5");
            dot.setAttribute("fill", "#ffaa00");
            gAnnots.appendChild(dot);
            
            const textLenEstimate = fullLabelText.length * 6.5;
            const shelf = svg.ownerDocument.createElementNS("http://www.w3.org/2000/svg", "line");
            if (side === "left") {
                shelf.setAttribute("x1", labelX);
                shelf.setAttribute("y1", labelY);
                shelf.setAttribute("x2", labelX - textLenEstimate - 6);
                shelf.setAttribute("y2", labelY);
            } else {
                shelf.setAttribute("x1", labelX);
                shelf.setAttribute("y1", labelY);
                shelf.setAttribute("x2", labelX + textLenEstimate + 6);
                shelf.setAttribute("y2", labelY);
            }
            shelf.setAttribute("stroke", "#ffaa00");
            shelf.setAttribute("stroke-width", "1.2");
            gAnnots.appendChild(shelf);

            const text = svg.ownerDocument.createElementNS("http://www.w3.org/2000/svg", "text");
            text.setAttribute("x", side === "left" ? (labelX - 3) : (labelX + 3));
            text.setAttribute("y", labelY - 3);
            text.setAttribute("fill", "#ffffff");
            text.setAttribute("font-family", "'JetBrains Mono', monospace, sans-serif");
            text.setAttribute("font-size", "11px");
            text.setAttribute("font-weight", "bold");
            text.setAttribute("text-anchor", side === "left" ? "end" : "start");
            text.textContent = fullLabelText;
            
            text.setAttribute("class", "annot-text-draggable");
            text.setAttribute("style", "cursor: move; pointer-events: auto;");
            text.setAttribute("data-annot-id", leaderId);
            text.setAttribute("data-annot-type", "leader");
            
            gAnnots.appendChild(text);
        };

        if (cat === 'rails_gates') {
            const isGates = vals.railsGatesType === 'gates';
            const leftPostW = getPicketDimension(vals.leftPostType, vals.leftPostSize, vals.leftPostW);
            const rightPostW = getPicketDimension(vals.rightPostType, vals.rightPostSize, vals.rightPostW);
            const midPostW = getPicketDimension(vals.midPostType, vals.midPostSize, vals.midPostW);
            const topH = getProfileDimension(vals.topRailType, vals.topRailSize, vals.topRailH);
            const midH = getProfileDimension(vals.midRailType, vals.midRailSize, vals.midH);
            const botH = getProfileDimension(vals.botRailType, vals.botRailSize, vals.botRailH);
            const pickW = getPicketDimension(vals.picketType, vals.picketSize, vals.picketW);
            const midRailGap = vals.midRailGap !== undefined ? vals.midRailGap : 12.0;
            const kickPlateH = vals.kickPlateH || 12.0;
            const midPostCount = parseInt(vals.midPostCount) || 0;

            const clearWidth = vals.length - leftPostW - rightPostW;
            const numPickets = vals.picketSpacing > 0 ? Math.floor((clearWidth - pickW) / vals.picketSpacing) : 0;
            let finalPicketsCount = numPickets;
            if (midPostCount > 0 && !isGates && vals.postHeight > vals.fenceHeight) {
                const centerDist = vals.length - leftPostW/2 - rightPostW/2;
                const spanSpacing = centerDist / (midPostCount + 1);
                for (let i = 0; i < numPickets; i++) {
                    const px = leftPostW + (clearWidth - ((numPickets - 1) * vals.picketSpacing + pickW)) / 2 + i * vals.picketSpacing;
                    for (let j = 1; j <= midPostCount; j++) {
                        const midCx = leftPostW/2 + j * spanSpacing;
                        if (Math.abs(px + pickW/2 - midCx) < (midPostW/2 + pickW/2 + 0.1)) {
                            finalPicketsCount--;
                            break;
                        }
                    }
                }
            }

            const topMark = getMark(vals.topRailType !== 'none');
            const botMark = getMark(vals.botRailType !== 'none');
            const midMark = getMark(vals.midRailType !== 'none');
            const leftMark = getMark(vals.leftPostType !== 'none');
            const rightMark = getMark(vals.rightPostType !== 'none');
            const midPostMark = getMark(!isGates && midPostCount > 0 && vals.midPostType !== 'none');
            const picketMark = getMark(vals.picketType !== 'none' && finalPicketsCount > 0);
            const kpMark = getMark(isGates && vals.kickPlate && vals.kickPlate !== 'none');

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
                const my = isGates ? (midRailGap - midH/2) : (vals.postHeight - midRailGap - midH/2);
                drawViewportLeader(vals.length * 0.75, my, "right", midMark, "leader-mid-rail");
            }
            // 6. Pickets
            if (picketMark && numPickets > 0) {
                const usedWidth = (numPickets - 1) * vals.picketSpacing + pickW;
                const startX = leftPostW + (clearWidth - usedWidth) / 2;
                const midIdx = Math.floor(numPickets / 2);
                const pickCx = startX + midIdx * vals.picketSpacing + pickW / 2;
                
                let picketBottomY, picketTopY;
                if (isGates) {
                    picketBottomY = (vals.midRailType !== 'none') ? midRailGap : ((vals.kickPlate !== 'none') ? kickPlateH : botH);
                    picketTopY = vals.fenceHeight - topH;
                } else {
                    picketBottomY = (vals.midRailType !== 'none') ? (vals.postHeight - midRailGap) : ((vals.postHeight > vals.fenceHeight) ? (vals.postHeight - vals.fenceHeight + botH) : botH);
                    picketTopY = vals.postHeight - topH;
                }
                const pickCy = (picketBottomY + picketTopY) / 2;
                drawViewportLeader(pickCx, pickCy, "right", picketMark, "leader-pickets");
            }
            // 7. Kick Plate
            if (kpMark) {
                drawViewportLeader(vals.length * 0.75, kickPlateH / 2, "right", kpMark, "leader-kickplate");
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
            let pHeight = (style === 'classical') ? 45.75 : (style === 'executive' ? 45.75 : (vals.postHeight || 36));
            let fHeight = (style === 'classical') ? 41.0 : (style === 'executive' ? 41.0 : (vals.fenceHeight || 36));
            let topH = (style === 'classical' || style === 'executive') ? 1.5 : getProfileDimension(vals.topRailType, vals.topRailSize, vals.topRailH || 1.5);
            let botH = (style === 'classical' || style === 'executive') ? 1.5 : getProfileDimension(vals.botRailType, vals.botRailSize, vals.botRailH || 1.5);
            let midH = (style === 'classical') ? 0 : (style === 'executive' ? 1.5 : getProfileDimension(vals.midRailType, vals.midRailSize, vals.midRailH || 1.5));
            let postW = (style === 'classical' || style === 'executive') ? 1.5 : getPicketDimension(vals.postType, vals.postSize, vals.postW || 1.5);
            let picketW = (style === 'classical' || style === 'executive') ? 0.5 : getPicketDimension(vals.picketType, vals.picketSize, vals.picketW || 0.5);
            let picketSpacing = (style === 'classical') ? 4.0 : (style === 'executive' ? 4.5 : (vals.picketSpacing || 4.0));
            let midPostCount = (vals.midPosts === 'yes') ? (parseInt(vals.midPostCount) || 0) : 0;
            let botY = pHeight - fHeight;
            let midRailGap = (style === 'classical') ? 0 : (style === 'executive' ? 12.0 : (vals.midRailGap || 12.0));

            const topMark = getMark(vals.topRailType !== 'none');
            const botMark = getMark(vals.botRailType !== 'none');
            const midMark = getMark(style !== 'classical' && vals.midRailType !== 'none');
            const leftMark = getMark(vals.leftPost === 'yes' && vals.postType !== 'none');
            const rightMark = getMark(vals.rightPost === 'yes' && vals.postType !== 'none');
            const midPostMark = getMark(vals.midPosts === 'yes' && midPostCount > 0 && vals.postType !== 'none');
            const picketMark = getMark(vals.picketType !== 'none');

            // 1. Top Rail
            if (topMark) {
                const cyTop = pHeight - topH / 2;
                drawViewportLeader(vals.length * 0.25, cyTop, "left", topMark, "leader-top-rail");
            }
            // 2. Bottom Rail
            if (botMark) {
                const cyBot = botY + botH / 2;
                drawViewportLeader(vals.length * 0.25, cyBot, "left", botMark, "leader-bot-rail");
            }
            // 3. Left Post
            if (leftMark) {
                const cyLeft = pHeight * 0.5;
                drawViewportLeader(postW / 2, cyLeft, "left", leftMark, "leader-left-post");
            }
            // 4. Right Post
            if (rightMark) {
                const cyRight = pHeight * 0.5;
                drawViewportLeader(vals.length - postW / 2, cyRight, "right", rightMark, "leader-right-post");
            }
            // 5. Mid Runner
            if (midMark) {
                const cyMid = pHeight - topH - midRailGap - midH / 2;
                drawViewportLeader(vals.length * 0.75, cyMid, "right", midMark, "leader-mid-rail");
            }
            // 6. Mid Post
            if (midPostMark) {
                const startXBound = (vals.leftPost === 'yes') ? postW : 0;
                const endXBound = (vals.rightPost === 'yes') ? (vals.length - postW) : vals.length;
                const centerDist = endXBound - startXBound;
                const spanSpacing = centerDist / (midPostCount + 1);
                const midCx = startXBound + 1 * spanSpacing;
                const cyMidPost = pHeight * 0.5;
                drawViewportLeader(midCx, cyMidPost, "right", midPostMark, "leader-mid-post");
            }
            // 7. Pickets
            if (picketMark) {
                const startXBound = (vals.leftPost === 'yes') ? postW : 0;
                const endXBound = (vals.rightPost === 'yes') ? (vals.length - postW) : vals.length;
                const centerDist = endXBound - startXBound;
                const spanSpacing = centerDist / (midPostCount + 1);
                const pickCx = startXBound + picketSpacing;
                const cyPick = pHeight - topH - 5;
                drawViewportLeader(pickCx, cyPick, "right", picketMark, "leader-pickets");
            }
        }

        // 4. Render placed custom dimensions
        customDimensionsList.forEach(dim => {
            const x1 = dim.cx1 * scale;
            const y1 = -dim.cy1 * scale;
            const x2 = dim.cx2 * scale;
            const y2 = -dim.cy2 * scale;
            const dx1 = dim.cdx1 * scale;
            const dy1 = -dim.cdy1 * scale;
            const dx2 = dim.cdx2 * scale;
            const dy2 = -dim.cdy2 * scale;
            
            // Extension lines (thin cyan)
            drawLine(x1, y1, dx1, dy1, "#00d4ff", "0.5");
            drawLine(x2, y2, dx2, dy2, "#00d4ff", "0.5");
            
            // Dimension line with custom arrowheads
            drawLine(dx1, dy1, dx2, dy2, "#00d4ff", "1.2", "custom-arrow-start", "custom-arrow-end");
            
            // Aligned Text Label
            const midX = (dx1 + dx2) / 2;
            const midY = (dy1 + dy2) / 2;
            
            const len = Math.hypot(dx2 - dx1, dy2 - dy1);
            let tx = midX;
            let ty = midY;
            if (len > 0.001) {
                const nx = -(dy2 - dy1) / len;
                const ny = (dx2 - dx1) / len;
                // Offset text by 8 SVG pixels along the normal
                tx += nx * 8;
                ty += ny * 8;
            }
            
            const dx_cad = dim.cx2 - dim.cx1;
            const dy_cad = dim.cy2 - dim.cy1;
            const distInches = Math.hypot(dx_cad, dy_cad);
            const labelText = dim.text || formatFraction(distInches);
            
            // Rotate parallel to dimension line
            const angleRad = Math.atan2(dy2 - dy1, dx2 - dx1);
            let textAngle = angleRad * 180 / Math.PI;
            if (textAngle > 90) textAngle -= 180;
            if (textAngle < -90) textAngle += 180;
            
            const text = svg.ownerDocument.createElementNS("http://www.w3.org/2000/svg", "text");
            text.setAttribute("x", tx);
            text.setAttribute("y", ty);
            text.setAttribute("fill", "#00d4ff");
            text.setAttribute("font-family", "'JetBrains Mono', monospace, sans-serif");
            text.setAttribute("font-size", customDimFontSize + "px");
            text.setAttribute("font-weight", "bold");
            text.setAttribute("text-anchor", "middle");
            if (textAngle) {
                text.setAttribute("transform", `rotate(${textAngle}, ${tx}, ${ty})`);
            }
            text.textContent = labelText;
            gAnnots.appendChild(text);
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
