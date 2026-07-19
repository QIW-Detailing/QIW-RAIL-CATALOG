if (typeof makerjs === 'undefined' && typeof MakerJs !== 'undefined') {
    window.makerjs = MakerJs;
}

function resolveMidPostCenters(length, leftPostOpt, rightPostOpt, midPostsOpt, midPostCount, postW, customSpacings, style, extra6 = false, panelType = 'main', deltaLeft = 0, deltaRight = 0) {
    const centers = [];
    if (midPostsOpt === 'none') return centers;

    let baseLength = length - (deltaLeft + deltaRight);
    let calcLength = baseLength;
    if (extra6) {
        calcLength = baseLength - (panelType === 'main' ? 12.0 : 6.0);
    }


    const startXBound = (leftPostOpt === 'yes' || leftPostOpt === 'corner') ? postW : 0;
    const endXBound = (rightPostOpt === 'yes' || rightPostOpt === 'corner') ? (calcLength - postW) : calcLength;

    if (midPostsOpt === 'default' || midPostsOpt === 'yes') {
        const count = Math.max(0, Math.ceil(calcLength / 48) - 1);
        if (count > 0) {
            const D = (calcLength - (count - 1) * 48) / 2;
            for (let i = 1; i <= count; i++) {
                let cx = D + (i - 1) * 48;
                if (extra6 && panelType === 'main') {
                    cx += 6.0;
                }
                cx += deltaLeft;
                centers.push(cx);
            }
        }
    } else if (midPostsOpt === 'custom_standard') {
        const count = midPostCount;
        if (count > 0) {
            const centerDist = endXBound - startXBound;
            const spanSpacing = centerDist / (count + 1);
            for (let i = 1; i <= count; i++) {
                let cx = startXBound + i * spanSpacing;
                if (extra6 && panelType === 'main') {
                    cx += 6.0;
                }
                cx += deltaLeft;
                centers.push(cx);
            }
        }
    } else if (midPostsOpt === 'custom') {
        const count = midPostCount;
        let currentX = 0;
        for (let i = 0; i < count; i++) {
            const spacing = (customSpacings && customSpacings[i] !== undefined) ? customSpacings[i] : 48;
            currentX += spacing;
            let cx = currentX;
            if (extra6 && panelType === 'main') {
                cx += 6.0;
            }
            cx += deltaLeft;
            centers.push(cx);
        }
    }
    return centers;
}

function getPicketPositions(style, length, leftPostW, rightPostW, pickW, picketSpacing, midPostCount, midPostW, midPostsOpt = 'none', customSpacings = null, extra6 = false, panelType = 'main', deltaLeft = 0, deltaRight = 0) {
    let picketPositions = [];
    
    let baseLength = length - (deltaLeft + deltaRight);
    const leftPostOpt = leftPostW > 0 ? 'yes' : 'no';
    const rightPostOpt = rightPostW > 0 ? 'yes' : 'no';
    
    // Resolve mid-post centers (on baseLength, relative to base length)
    const midPostCenters = resolveMidPostCenters(baseLength, leftPostOpt, rightPostOpt, midPostsOpt, midPostCount, midPostW, customSpacings, style, extra6, panelType, 0, 0);

    // Determine grid alignment anchor point
    let anchor = null;
    if (midPostCenters.length > 0) {
        anchor = midPostCenters[0];
    } else if (leftPostW > 0) {
        anchor = leftPostW / 2;
    } else if (rightPostW > 0) {
        anchor = baseLength - rightPostW / 2;
    }

    if (anchor !== null && picketSpacing > 0) {
        // Align picket centers to the anchor point on the picketSpacing grid
        const minCenter = leftPostW + pickW / 2;
        const maxCenter = baseLength - rightPostW / 2 - pickW / 2;
        
        // Find the range of integer multipliers (k)
        const startK = Math.ceil((minCenter - anchor) / picketSpacing);
        const endK = Math.floor((maxCenter - anchor) / picketSpacing);
        
        for (let k = startK; k <= endK; k++) {
            const cx = anchor + k * picketSpacing;
            picketPositions.push(cx - pickW / 2);
        }
    } else {
        // Centered fallback (no posts, or picketSpacing <= 0)
        const clearWidth = baseLength - leftPostW - rightPostW;
        const numPickets = picketSpacing > 0 ? Math.floor((clearWidth - pickW) / picketSpacing) : 0;
        if (numPickets > 0) {
            const usedWidth = (numPickets - 1) * picketSpacing + pickW;
            const startX = leftPostW + (clearWidth - usedWidth) / 2;
            for (let i = 0; i < numPickets; i++) {
                picketPositions.push(startX + i * picketSpacing);
            }
        }
    }

    // Shift pickets if left end is extended
    if (deltaLeft > 0) {
        picketPositions = picketPositions.map(px => px + deltaLeft);
    }

    // Filter out pickets that overlap with mid posts
    const midPostCentersShifted = resolveMidPostCenters(length, leftPostOpt, rightPostOpt, midPostsOpt, midPostCount, midPostW, customSpacings, style, extra6, panelType, deltaLeft, deltaRight);
    if (midPostCentersShifted.length > 0) {
        picketPositions = picketPositions.filter(px => {
            for (let j = 0; j < midPostCentersShifted.length; j++) {
                const midCx = midPostCentersShifted[j];
                if (Math.abs(px + pickW/2 - midCx) < (midPostW/2 + pickW/2 + 0.1)) {
                    return false;
                }
            }
            return true;
        });
    }

    return picketPositions;
}

const CadEngine = {
    resolveFreeEndExtensions: function(vals, style, panelType) {
        let deltaLeft = 0;
        let deltaRight = 0;
        const isClassicOrExec = (style === 'classical' || style === 'classic_custom' || style === 'executive' || style === 'executive_custom');
        if (vals.freeEnd4 && isClassicOrExec) {
            const leftPostOpt = vals.leftPost || 'yes';
            const rightPostOpt = vals.rightPost || 'yes';
            const hasLeftFree = (leftPostOpt === 'none' || leftPostOpt === 'corner_none' || leftPostOpt === 'no');
            const hasRightFree = (rightPostOpt === 'none' || rightPostOpt === 'corner_none' || rightPostOpt === 'no');
            
            let baseLen = vals.length || 120.0;
            const postW = vals.postW !== undefined ? vals.postW : 1.5;
            const midPostCount = (vals.midPosts === 'default' || vals.midPosts === 'yes') 
                ? Math.max(0, Math.ceil((vals.originalLength || vals.length) / 48) - 1) 
                : ((vals.midPosts === 'custom' || vals.midPosts === 'custom_standard') ? (parseInt(vals.midPostCount) || 0) : 0);
                
            // Calculate mid-post centers on base length (excluding freeEnd4 extension)
            const centers = resolveMidPostCenters(baseLen, leftPostOpt, rightPostOpt, vals.midPosts || 'none', midPostCount, postW, vals.midPostSpacings || null, style, vals.extra6, panelType, 0, 0);
            
            const pSpacing = vals.picketSpacing !== undefined ? vals.picketSpacing : 4.0;
            
            if (hasLeftFree) {
                let c2_base = baseLen;
                if (centers.length > 0) {
                    c2_base = centers[0];
                } else if (rightPostOpt === 'yes' || rightPostOpt === 'corner') {
                    c2_base = baseLen - postW / 2;
                }
                const c2_prime = 4.0 + Math.ceil((c2_base - 4.0) / pSpacing) * pSpacing;
                deltaLeft = Math.max(0, c2_prime - c2_base);
            }
            
            if (hasRightFree) {
                let c1 = 0;
                if (centers.length > 0) {
                    c1 = centers[centers.length - 1];
                } else if (leftPostOpt === 'yes' || leftPostOpt === 'corner') {
                    c1 = postW / 2;
                }
                const numP = Math.max(0, Math.floor((baseLen - c1) / pSpacing - 0.001));
                const p2 = c1 + numP * pSpacing;
                const c2_prime = p2 + 4.0;
                deltaRight = Math.max(0, c2_prime - baseLen);
            }
        }
        return { deltaLeft, deltaRight };
    },
    /**
     * Helper to check if Maker.js is available
     */
    isLibReady: function() {
        if (typeof makerjs === 'undefined' && typeof MakerJs !== 'undefined') {
            window.makerjs = MakerJs;
        }
        return typeof makerjs !== 'undefined';
    },

    /**
     * Generate Industrial Fence model
     */
    createFence: function(length, fenceHeight, postHeight, topGap, postSpacing, postW, topRailH, midRailH, botRailH, picketW, picketSpacing, slope, postType = 'hss_rect', topRailType = 'plate', midRailType = 'plate', botRailType = 'plate', picketType = 'plate', includeBasePlates = 'no', bpW = 6.0, bpH = 0.5, bpHoleD = 0.5, bpHoleOffsetX = 0.5, bpHoleOffsetY = 0.25, midRailGap = 12.0) {
        if (!this.isLibReady()) return this._fallback_fence(length, fenceHeight, postHeight, topGap, postSpacing, postW, topRailH, midRailH, botRailH, picketW, picketSpacing, slope, postType, topRailType, midRailType, botRailType, picketType, includeBasePlates, bpW, bpH, bpHoleD, bpHoleOffsetX, bpHoleOffsetY, midRailGap);

        const model = { 
            models: { 
                posts: { models: {} }, 
                rails: { models: {} },
                pickets: { models: {} }
            } 
        };
        if (includeBasePlates === 'yes') {
            model.models.basePlates = { models: {} };
        }
        
        const rad = slope * Math.PI / 180;
        const tan = Math.tan(rad);
        
        const noPosts = (postType === 'none' || postHeight === 0 || postSpacing === 0);
        const effectivePostW = noPosts ? 0 : postW;
        const effectiveEmbed = noPosts ? 0 : ((includeBasePlates === 'yes') ? 0 : Math.max(0, postHeight - fenceHeight - topGap - 6.0));
        
        // 1. Create Posts (Length represents the center-to-center of post 0 to last post)
        const numSpans = noPosts ? 1 : Math.max(1, Math.round(length / (postSpacing || 1)));
        const numPosts = noPosts ? 0 : numSpans + 1;
        const actualPostSpacing = noPosts ? length : (length / numSpans);
        const actualPostHeight = postHeight;
        
        if (!noPosts) {
            for (let i = 0; i < numPosts; i++) {
                const cx = i * actualPostSpacing;
                const px = cx - effectivePostW / 2;
                const pyBase = cx * tan;
                
                const post = { models: {}, paths: {} };
                post.models.outer = new makerjs.models.Rectangle(effectivePostW, actualPostHeight);
                
                const pt = 0.2; // post wall/flange thickness
                if (postType === 'hss_rect') {
                    if (effectivePostW > 2 * pt) {
                        post.models.inner = new makerjs.models.Rectangle(effectivePostW - 2 * pt, actualPostHeight - 2 * pt);
                        post.models.inner.origin = [pt, pt];
                    }
                } else if (postType === 'hss_circ') {
                    post.paths.center = new makerjs.paths.Line([effectivePostW / 2, 0], [effectivePostW / 2, actualPostHeight]);
                } else if (postType === 'w_beam') {
                    if (effectivePostW > 2 * pt) {
                        post.paths.flangeL = new makerjs.paths.Line([pt, 0], [pt, actualPostHeight]);
                        post.paths.flangeR = new makerjs.paths.Line([effectivePostW - pt, 0], [effectivePostW - pt, actualPostHeight]);
                    }
                } else if (postType === 'angles') {
                    if (effectivePostW > pt) {
                        post.paths.leg = new makerjs.paths.Line([pt, 0], [pt, actualPostHeight]);
                    }
                }
                
                post.origin = [px, pyBase - effectiveEmbed];
                model.models.posts.models['p' + i] = post;

                // Optional Base Plate at bottom of post
                if (includeBasePlates === 'yes') {
                    const plateW = bpW;
                    const plateH = bpH;
                    const bp = {
                        models: { outer: new makerjs.models.Rectangle(plateW, plateH) },
                        paths: {
                            h1: new makerjs.paths.Circle([bpHoleOffsetX, bpHoleOffsetY], bpHoleD / 2),
                            h2: new makerjs.paths.Circle([plateW - bpHoleOffsetX, bpHoleOffsetY], bpHoleD / 2)
                        }
                    };
                    
                    bp.origin = [cx - plateW/2, pyBase - effectiveEmbed - plateH];
                    makerjs.model.rotate(bp, slope, [cx, pyBase - effectiveEmbed]);
                    model.models.basePlates.models['bp' + i] = bp;
                }
            }
        }

        // 2. Create Rails (Welded to the inside faces of the posts, in between posts)
        let botY, topY, midY;
        if (noPosts) {
            botY = 4.0;
            topY = 4.0 + fenceHeight - topRailH;
        } else {
            botY = actualPostHeight - topGap - fenceHeight;
            topY = actualPostHeight - topGap - topRailH;
        }

        if (midRailType !== 'none') {
            midY = topY - midRailGap - midRailH;
        } else {
            midY = (botY + topY) / 2;
        }

        const createTiltedRailSpan = (cx_i, yIntercept, thickness, type) => {
            const rail = { models: {}, paths: {} };
            const clearWidth = actualPostSpacing - effectivePostW;
            
            // Calculate precise sloped length of the rail span: clearWidth / cos(slope)
            const cos = Math.cos(rad);
            const slopedWidth = cos > 0.001 ? (clearWidth / cos) : clearWidth;
            // Round to 1/16th inch precision
            const preciseSlopedWidth = Math.round(slopedWidth * 16) / 16;
            
            rail.models.outer = new makerjs.models.Rectangle(preciseSlopedWidth, thickness);
            
            const t = 0.2; // wall/flange thickness
            if (type === 'hss_rect') {
                if (thickness > 2 * t) {
                    rail.models.inner = new makerjs.models.Rectangle(preciseSlopedWidth, thickness - 2 * t);
                    rail.models.inner.origin = [0, t];
                }
            } else if (type === 'hss_circ') {
                rail.paths.center = new makerjs.paths.Line([0, thickness / 2], [preciseSlopedWidth, thickness / 2]);
            } else if (type === 'w_beam') {
                if (thickness > 2 * t) {
                    rail.paths.tf = new makerjs.paths.Line([0, thickness - t], [preciseSlopedWidth, thickness - t]);
                    rail.paths.bf = new makerjs.paths.Line([0, t], [preciseSlopedWidth, t]);
                }
            } else if (type === 'angles') {
                if (thickness > t) {
                    rail.paths.leg = new makerjs.paths.Line([0, t], [preciseSlopedWidth, t]);
                }
            }

            makerjs.model.rotate(rail, slope);
            const startX = cx_i + effectivePostW / 2;
            rail.origin = [startX, startX * tan - effectiveEmbed + yIntercept];
            return rail;
        };

        for (let i = 0; i < numSpans; i++) {
            const cx_i = i * actualPostSpacing;
            if (botRailType !== 'none') {
                if (!model.models.rails.models.bottom) model.models.rails.models.bottom = { models: {} };
                model.models.rails.models.bottom.models['span' + i] = createTiltedRailSpan(cx_i, botY, botRailH, botRailType);
            }
            if (midRailType !== 'none') {
                if (!model.models.rails.models.middle) model.models.rails.models.middle = { models: {} };
                model.models.rails.models.middle.models['span' + i] = createTiltedRailSpan(cx_i, midY, midRailH, midRailType);
            }
            if (topRailType !== 'none') {
                if (!model.models.rails.models.top) model.models.rails.models.top = { models: {} };
                model.models.rails.models.top.models['span' + i] = createTiltedRailSpan(cx_i, topY, topRailH, topRailType);
            }
        }

        // 3. Create Pickets (Vertical, ONLY inside post spans)
        const picketY = (botRailType === 'none') ? (botY + 4) : (botY + botRailH);
        const picketTopY = (midRailType !== 'none') ? midY : ((topRailType === 'none') ? (noPosts ? 4.0 + fenceHeight : actualPostHeight - topGap) : topY);
        const picketH = Math.max(2, picketTopY - picketY);
        
        let picketCount = 0;
        const clearWidth = actualPostSpacing - effectivePostW;
        const numPicketsInSpan = picketSpacing > 0 ? Math.floor((clearWidth - picketW) / picketSpacing) : 0;
        
        if (picketSpacing > 0 && numPicketsInSpan > 0 && numPicketsInSpan < 1000) {
            const occupiedWidth = (numPicketsInSpan - 1) * picketSpacing + picketW;
            const leftoverSpace = clearWidth - occupiedWidth;
            const margin = leftoverSpace / 2;
            
            for (let i = 0; i < numSpans; i++) {
                const cx_i = i * actualPostSpacing;
                const picketStartCenter = cx_i + effectivePostW / 2 + margin + picketW / 2;
                
                for (let k = 0; k < numPicketsInSpan; k++) {
                    const picketX = picketStartCenter + k * picketSpacing;
                    const pyBase = picketX * tan;
                    
                    const px = picketX - picketW / 2;
                    const py = pyBase - effectiveEmbed + picketY;
                    const w = picketW;
                    const h = picketH;
                    
                    const picket = { models: {}, paths: {} };
                    picket.models.outer = new makerjs.models.Rectangle(w, h);
                    
                    const pt = 0.15; // picket wall thickness
                    if (picketType === 'hss_rect') {
                        if (w > 2 * pt) {
                            picket.models.inner = new makerjs.models.Rectangle(w - 2 * pt, h);
                            picket.models.inner.origin = [pt, 0];
                        }
                    } else if (picketType === 'hss_circ') {
                        picket.paths.center = new makerjs.paths.Line([w / 2, 0], [w / 2, h]);
                    } else if (picketType === 'w_beam') {
                        if (w > 2 * pt) {
                            picket.paths.flangeL = new makerjs.paths.Line([pt, 0], [pt, h]);
                            picket.paths.flangeR = new makerjs.paths.Line([w - pt, 0], [w - pt, h]);
                        }
                    } else if (picketType === 'angles') {
                        if (w > pt) {
                            picket.paths.leg = new makerjs.paths.Line([pt, 0], [pt, h]);
                        }
                    }
                    
                    picket.origin = [px, py];
                    model.models.pickets.models['pick' + picketCount] = picket;
                    picketCount++;
                }
            }
        }

// Viewport dimensions layer removed per user request. Dimensions are only shown in PDF preview.
/*
if (typeof makerjs !== 'undefined' && makerjs.measure) {
    const bbox = makerjs.measure.modelExtents(model);
    const width = bbox.high[0] - bbox.low[0];
    const height = bbox.high[1] - bbox.low[1];
    const baseOffset = Math.max(0.5, Math.min(width, height) * 0.08);
    let bottomOffset = baseOffset;
    let topOffset = baseOffset + 0.3;
    let leftOffset = baseOffset;
    let rightOffset = baseOffset + 0.3;
    const dimModel = { models: {}, paths: {} };
    const makeDim = (startPt, endPt, dimOffset, isHorizontal) => {
        const dim = { models: {}, paths: {} };
        const perp = isHorizontal ? [0, dimOffset] : [dimOffset, 0];
        const startExt = [startPt[0] + perp[0], startPt[1] + perp[1]];
        const endExt = [endPt[0] + perp[0], endPt[1] + perp[1]];
        dim.paths.dimLine = new makerjs.paths.Line(startExt, endExt);
        const totalLen = Math.hypot(endPt[0] - startPt[0], endPt[1] - startPt[1]);
        const arrowSize = Math.max(0.2, totalLen * 0.015);
        const angle = Math.atan2(endExt[1] - startExt[1], endExt[0] - startExt[0]);
        dim.paths.arrow1a = new makerjs.paths.Line(startExt,
            [startExt[0] + Math.cos(angle + Math.PI / 6) * arrowSize,
             startExt[1] + Math.sin(angle + Math.PI / 6) * arrowSize]);
        dim.paths.arrow1b = new makerjs.paths.Line(startExt,
            [startExt[0] + Math.cos(angle - Math.PI / 6) * arrowSize,
             startExt[1] + Math.sin(angle - Math.PI / 6) * arrowSize]);
        dim.paths.arrow2a = new makerjs.paths.Line(endExt,
            [endExt[0] + Math.cos(angle + Math.PI - Math.PI / 6) * arrowSize,
             endExt[1] + Math.sin(angle + Math.PI - Math.PI / 6) * arrowSize]);
        dim.paths.arrow2b = new makerjs.paths.Line(endExt,
            [endExt[0] + Math.cos(angle + Math.PI + Math.PI / 6) * arrowSize,
             endExt[1] + Math.sin(angle + Math.PI + Math.PI / 6) * arrowSize]);
        const dimValue = (isHorizontal ? (endPt[0] - startPt[0]) : (endPt[1] - startPt[1])).toFixed(2);
        const txt = new makerjs.models.Text(dimValue, 0.4, "Arial");
        const mid = [(startExt[0] + endExt[0]) / 2, (startExt[1] + endExt[1]) / 2];
        const textOffset = isHorizontal ? [0, 0.2] : [0.2, 0];
        txt.origin = [mid[0] + textOffset[0], mid[1] + textOffset[1]];
        dim.models.label = txt;
        return dim;
    };
    let hDimBottom = makeDim([bbox.low[0], bbox.low[1]], [bbox.high[0], bbox.low[1]], -bottomOffset, true);
    let hDimTop = makeDim([bbox.low[0], bbox.high[1]], [bbox.high[0], bbox.high[1]], topOffset, true);
    let vDimLeft = makeDim([bbox.low[0], bbox.low[1]], [bbox.low[0], bbox.high[1]], -leftOffset, false);
    let vDimRight = makeDim([bbox.high[0], bbox.low[1]], [bbox.high[0], bbox.high[1]], rightOffset, false);
    const maxIter = 10;
    let iter = 0;
    const dimBBox = (dim) => makerjs.measure.modelExtents(dim);
    const boxesOverlap = (a, b) => !(a.high[0] < b.low[0] || a.low[0] > b.high[0] || a.high[1] < b.low[1] || a.low[1] > b.high[1]);
    while (iter < maxIter) {
        const dims = [hDimBottom, hDimTop, vDimLeft, vDimRight];
        const bboxes = dims.map(dimBBox);
        let overlapFound = false;
        for (let i = 0; i < bboxes.length; i++) {
            for (let j = i + 1; j < bboxes.length; j++) {
                if (boxesOverlap(bboxes[i], bboxes[j])) {
                    overlapFound = true;
                    break;
                }
            }
            if (overlapFound) break;
        }
        if (!overlapFound) break;
        bottomOffset += 0.25;
        topOffset += 0.25;
        leftOffset += 0.25;
        rightOffset += 0.25;
        hDimBottom = makeDim([bbox.low[0], bbox.low[1]], [bbox.high[0], bbox.low[1]], -bottomOffset, true);
        hDimTop = makeDim([bbox.low[0], bbox.high[1]], [bbox.high[0], bbox.high[1]], topOffset, true);
        vDimLeft = makeDim([bbox.low[0], bbox.low[1]], [bbox.low[0], bbox.high[1]], -leftOffset, false);
        vDimRight = makeDim([bbox.high[0], bbox.low[1]], [bbox.high[0], bbox.high[1]], rightOffset, false);
        iter++;
    }
    dimModel.models.hDimBottom = hDimBottom;
    dimModel.models.hDimTop = hDimTop;
    dimModel.models.vDimLeft = vDimLeft;
    dimModel.models.vDimRight = vDimRight;
    model.models.dimensions = dimModel;
}
*/
        return model;
    },

    _fallback_fence: (length, fenceHeight, postHeight, topGap, postSpacing, postW, topRailH, midRailH, botRailH, picketW, picketSpacing, slope, postType = 'hss_rect', topRailType = 'plate', midRailType = 'plate', botRailType = 'plate', picketType = 'plate', includeBasePlates = 'no', bpW = 6.0, bpH = 0.5, bpHoleD = 0.5, bpHoleOffsetX = 0.5, bpHoleOffsetY = 0.25, midRailGap = 12.0) => {
        const s = 4; // scale factor
        const L = length * s;
        const FH = fenceHeight * s;
        const TG = topGap * s;
        const PH = postHeight * s;
        const SP = postSpacing * s;
        const PW = picketW * s;
        const PS = picketSpacing * s;
        const rad = slope * Math.PI / 180;
        const tan = Math.tan(rad);
        
        let postsHtml = "";
        let basePlatesHtml = "";
        let railsHtml = "";
        let picketsHtml = "";
        
        const noPosts = (postType === 'none' || postHeight === 0 || postSpacing === 0);
        const effectivePH = noPosts ? fenceHeight * s : PH;
        const effectiveEmbed_scaled = noPosts ? 0 : ((includeBasePlates === 'yes') ? 0 : Math.max(0, postHeight - fenceHeight - topGap - 6.0) * s);
        
        const rise = length * tan;
        const maxRise = Math.max(0, rise);
        const groundY = (effectivePH - effectiveEmbed_scaled) + maxRise * s + 50;
        
        const numSpans = noPosts ? 1 : Math.max(1, Math.round(length / (postSpacing || 1)));
        const numPosts = noPosts ? 0 : numSpans + 1;
        const actualPostSpacing = noPosts ? length : (length / numSpans);
        const PW_scaled = noPosts ? 0 : postW * s;
        const effectivePostW = noPosts ? 0 : postW;

        // 1. Draw Posts
        if (!noPosts) {
            for (let i = 0; i < numPosts; i++) {
                const cx = i * actualPostSpacing;
                const px_scaled = (cx - postW / 2) * s;
                const pyBase = cx * tan;
                const pyBase_scaled = pyBase * s;
                const postY = groundY - pyBase_scaled - (PH - effectiveEmbed_scaled);
                
                let postInnerHtml = "";
                const pt = 0.2 * s;
                if (postType === 'hss_rect') {
                    if (PW_scaled > 2 * pt) {
                        postInnerHtml = `<rect class="hss-inner-line" x="${px_scaled + pt}" y="${postY + pt}" width="${PW_scaled - 2 * pt}" height="${PH - 2 * pt}" fill="none" stroke="#00d4ff" stroke-width="0.5" opacity="0.6"/>`;
                    }
                } else if (postType === 'hss_circ') {
                    postInnerHtml = `<line class="hss-inner-line" x1="${px_scaled + PW_scaled/2}" y1="${postY}" x2="${px_scaled + PW_scaled/2}" y2="${postY + PH}" stroke="#00d4ff" stroke-width="0.5" stroke-dasharray="2" opacity="0.6"/>`;
                } else if (postType === 'w_beam') {
                    if (PW_scaled > 2 * pt) {
                        postInnerHtml = `
                            <line class="hss-inner-line" x1="${px_scaled + pt}" y1="${postY}" x2="${px_scaled + pt}" y2="${postY + PH}" stroke="#00d4ff" stroke-width="0.5" opacity="0.6"/>
                            <line class="hss-inner-line" x1="${px_scaled + PW_scaled - pt}" y1="${postY}" x2="${px_scaled + PW_scaled - pt}" y2="${postY + PH}" stroke="#00d4ff" stroke-width="0.5" opacity="0.6"/>
                        `;
                    }
                } else if (postType === 'angles') {
                    if (PW_scaled > pt) {
                        postInnerHtml = `<line class="hss-inner-line" x1="${px_scaled + pt}" y1="${postY}" x2="${px_scaled + pt}" y2="${postY + PH}" stroke="#00d4ff" stroke-width="0.5" opacity="0.6"/>`;
                    }
                }
                
                postsHtml += `
                    <rect x="${px_scaled}" y="${postY}" width="${PW_scaled}" height="${PH}" fill="none" stroke="#00d4ff" stroke-width="2"/>
                    ${postInnerHtml}
                `;
                
                if (includeBasePlates === 'yes') {
                    const plateW = bpW;
                    const plateH = bpH;
                    const PW_scaled_bp = plateW * s;
                    const PH_scaled_bp = plateH * s;
                    
                    basePlatesHtml += `
                        <g transform="translate(${(cx * s)}, ${postY + PH}) rotate(${-slope})">
                            <rect x="${-PW_scaled_bp/2}" y="0" width="${PW_scaled_bp}" height="${PH_scaled_bp}" fill="none" stroke="#ffaa00" stroke-width="1.5"/>
                            <circle cx="${-PW_scaled_bp/2 + bpHoleOffsetX * s}" cy="${bpHoleOffsetY * s}" r="${(bpHoleD / 2) * s}" fill="none" stroke="#ffaa00" stroke-width="0.5"/>
                            <circle cx="${PW_scaled_bp/2 - bpHoleOffsetX * s}" cy="${bpHoleOffsetY * s}" r="${(bpHoleD / 2) * s}" fill="none" stroke="#ffaa00" stroke-width="0.5"/>
                        </g>
                    `;
                }
            }
        }
        
        // 2. Draw Rails
        let botY, topY, midY;
        if (noPosts) {
            botY = 4.0;
            topY = 4.0 + fenceHeight - topRailH;
        } else {
            botY = PH/s - topGap - fenceHeight;
            topY = PH/s - topGap - topRailH;
        }

        if (midRailType !== 'none') {
            midY = topY - midRailGap - midRailH;
        } else {
            midY = (botY + topY) / 2;
        }
        
        const drawTiltedRailSpan = (cx_i, yIntercept, thickness, type) => {
            const clearWidth = actualPostSpacing - effectivePostW;
            
            // Calculate precise sloped length of the rail span: clearWidth / cos(slope)
            const cos = Math.cos(rad);
            const slopedWidth = cos > 0.001 ? (clearWidth / cos) : clearWidth;
            // Round to 1/16th inch precision
            const preciseSlopedWidth = Math.round(slopedWidth * 16) / 16;
            
            const rx = (cx_i + effectivePostW / 2) * s;
            const ry = groundY - (yIntercept - (effectiveEmbed_scaled / s)) * s - thickness * s + (effectivePostW / 2 * tan * s) - (cx_i * tan * s);
            const w = preciseSlopedWidth * s;
            const h = thickness * s;
            const t = 0.2 * s;
            
            let innerHtml = "";
            if (type === 'hss_rect') {
                if (h > 2 * t) {
                    innerHtml = `<rect class="hss-inner-line" x="${rx}" y="${ry + t}" width="${w}" height="${h - 2 * t}" fill="none" stroke="#00d4ff" stroke-width="0.5" opacity="0.6"/>`;
                }
            } else if (type === 'hss_circ') {
                innerHtml = `<line class="hss-inner-line" x1="${rx}" y1="${ry + h/2}" x2="${rx + w}" y2="${ry + h/2}" stroke="#00d4ff" stroke-width="0.5" stroke-dasharray="2" opacity="0.6"/>`;
            } else if (type === 'w_beam') {
                if (h > 2 * t) {
                    innerHtml = `
                        <line class="hss-inner-line" x1="${rx}" y1="${ry + t}" x2="${rx + w}" y2="${ry + t}" stroke="#00d4ff" stroke-width="0.5" opacity="0.6"/>
                        <line class="hss-inner-line" x1="${rx}" y1="${ry + h - t}" x2="${rx + w}" y2="${ry + h - t}" stroke="#00d4ff" stroke-width="0.5" opacity="0.6"/>
                    `;
                }
            } else if (type === 'angles') {
                if (h > t) {
                    innerHtml = `<line class="hss-inner-line" x1="${rx}" y1="${ry + h - t}" x2="${rx + w}" y2="${ry + h - t}" stroke="#00d4ff" stroke-width="0.5" opacity="0.6"/>`;
                }
            }
            
            return `<g transform="rotate(${-slope}, ${rx}, ${ry + h})">
                <rect x="${rx}" y="${ry}" width="${w}" height="${h}" fill="none" stroke="#00d4ff" stroke-width="1.5"/>
                ${innerHtml}
            </g>`;
        };
        
        for (let i = 0; i < numSpans; i++) {
            const cx_i = i * actualPostSpacing;
            if (botRailType !== 'none') railsHtml += drawTiltedRailSpan(cx_i, botY, botRailH, botRailType);
            if (midRailType !== 'none') railsHtml += drawTiltedRailSpan(cx_i, midY, midRailH, midRailType);
            if (topRailType !== 'none') railsHtml += drawTiltedRailSpan(cx_i, topY, topRailH, topRailType);
        }
        
        // 3. Draw Pickets (Fitted ONLY inside post spans)
        const picketY_val = (botRailType === 'none') ? (botY + 4) : (botY + botRailH);
        const picketTopY_val = (midRailType !== 'none') ? midY : ((topRailType === 'none') ? (noPosts ? 4.0 + fenceHeight : PH/s - topGap) : topY);
        const picketH_val = Math.max(2, picketTopY_val - picketY_val);
        
        const clearWidth = actualPostSpacing - effectivePostW;
        const numPicketsInSpan = picketSpacing > 0 ? Math.floor((clearWidth - picketW) / picketSpacing) : 0;
        
        if (picketSpacing > 0 && numPicketsInSpan > 0 && numPicketsInSpan < 1000) {
            const occupiedWidth = (numPicketsInSpan - 1) * picketSpacing + picketW;
            const leftoverSpace = clearWidth - occupiedWidth;
            const margin = leftoverSpace / 2;
            
            for (let i = 0; i < numSpans; i++) {
                const cx_i = i * actualPostSpacing;
                const picketStartCenter = cx_i + effectivePostW / 2 + margin + picketW / 2;
                
                for (let k = 0; k < numPicketsInSpan; k++) {
                    const picketX = picketStartCenter + k * picketSpacing;
                    const picketX_scaled = picketX * s;
                    const pyBase = picketX * tan;
                    const pyBase_scaled = pyBase * s;
                    
                    const px = (picketX - picketW / 2) * s;
                    const py = groundY - pyBase_scaled - (picketTopY_val - (effectiveEmbed_scaled / s)) * s;
                    const pw = PW;
                    const ph = picketH_val * s;
                    const pt = 0.15 * s;
                    
                    let picketInnerHtml = "";
                    if (picketType === 'hss_rect') {
                        if (pw > 2 * pt) {
                            picketInnerHtml = `<rect class="hss-inner-line" x="${px + pt}" y="${py}" width="${pw - 2 * pt}" height="${ph}" fill="none" stroke="#00ffff" stroke-width="0.5" opacity="0.6"/>`;
                        }
                    } else if (picketType === 'hss_circ') {
                        picketInnerHtml = `<line class="hss-inner-line" x1="${px + pw/2}" y1="${py}" x2="${px + pw/2}" y2="${py + ph}" stroke="#00ffff" stroke-width="0.5" stroke-dasharray="2" opacity="0.6"/>`;
                    } else if (picketType === 'w_beam') {
                        if (pw > 2 * pt) {
                            picketInnerHtml = `
                                <line class="hss-inner-line" x1="${px + pt}" y1="${py}" x2="${px + pt}" y2="${py + ph}" stroke="#00ffff" stroke-width="0.5" opacity="0.6"/>
                                <line class="hss-inner-line" x1="${px + pw - pt}" y1="${py}" x2="${px + pw - pt}" y2="${py + ph}" stroke="#00ffff" stroke-width="0.5" opacity="0.6"/>
                            `;
                        }
                    } else if (picketType === 'angles') {
                        if (pw > pt) {
                            picketInnerHtml = `<rect class="hss-inner-line" x="${px + pt}" y="${py}" width="${pw - 2 * pt}" height="${ph}" fill="none" stroke="#00ffff" stroke-width="0.5" opacity="0.6"/>`;
                        }
                    }
                    
                    picketsHtml += `
                        <rect x="${px}" y="${py}" width="${pw}" height="${ph}" fill="none" stroke="#00ffff" stroke-width="1"/>
                        ${picketInnerHtml}
                    `;
                }
            }
        }
        
        const viewW = L + 50;
        const viewH = groundY + 100;
        const groundLineHtml = noPosts ? '' : `<line x1="${-postW/2 * s}" y1="${groundY + (postW/2 * tan * s)}" x2="${L + postW/2 * s}" y2="${groundY - rise * s - (postW/2 * tan * s)}" stroke="#555" stroke-width="2" stroke-dasharray="4"/>`;
        return `<svg viewBox="-20 -20 ${viewW} ${viewH}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
            ${groundLineHtml}
            ${postsHtml}
            ${basePlatesHtml}
            ${picketsHtml}
            ${railsHtml}
        </svg>`;
    },
    createHSSRect: function(w, h, t, holeConfig = null) {
        if (!this.isLibReady()) return this._fallback_rect(w, h, t, holeConfig);

        const outer = new makerjs.models.Rectangle(w, h);
        const inner = new makerjs.models.Rectangle(w - 2*t, h - 2*t);
        makerjs.model.center(inner);
        makerjs.model.center(outer);
        
        const model = { models: { outer, inner } };
        if (holeConfig && holeConfig.d > 0) {
            model.models.holes = this._createHolePattern(w, h, holeConfig);
        }
        return model;
    },

    /**
     * Generate a Circular HSS (Pipe) model
     */
    createHSSCirc: function(d, t, holeConfig = null) {
        if (!this.isLibReady()) return this._fallback_circ(d, t, holeConfig);
        const model = { models: { ring: new makerjs.models.Ring(d/2, (d/2) - t) } };
        if (holeConfig && holeConfig.d > 0) {
            // For circular, just put a hole in center for now
            model.models.holes = { paths: { h1: new makerjs.paths.Circle([0,0], holeConfig.d/2) } };
        }
        return model;
    },

    /**
     * Generate a W-Beam (I-Beam) model
     */
    createWBeam: function(d, bf, tf, tw, holeConfig = null) {
        if (!this.isLibReady()) return this._fallback_ibeam(d, bf, tf, tw, holeConfig);

        const model = { paths: {} };
        const hb = bf / 2, ht = tw / 2;

        model.paths.topFlange = new makerjs.paths.Line([-hb, d/2], [hb, d/2]);
        model.paths.tfbL = new makerjs.paths.Line([-hb, d/2 - tf], [-ht, d/2 - tf]);
        model.paths.tfbR = new makerjs.paths.Line([ht, d/2 - tf], [hb, d/2 - tf]);
        model.paths.tfeL = new makerjs.paths.Line([-hb, d/2], [-hb, d/2 - tf]);
        model.paths.tfeR = new makerjs.paths.Line([hb, d/2], [hb, d/2 - tf]);
        model.paths.webL = new makerjs.paths.Line([-ht, d/2 - tf], [-ht, -(d/2 - tf)]);
        model.paths.webR = new makerjs.paths.Line([ht, d/2 - tf], [ht, -(d/2 - tf)]);
        model.paths.botF = new makerjs.paths.Line([-hb, -d/2], [hb, -d/2]);
        model.paths.bfL = new makerjs.paths.Line([-hb, -(d/2 - tf)], [-ht, -(d/2 - tf)]);
        model.paths.bfR = new makerjs.paths.Line([ht, -(d/2 - tf)], [hb, -(d/2 - tf)]);
        model.paths.beL = new makerjs.paths.Line([-hb, -d/2], [-hb, -(d/2 - tf)]);
        model.paths.beR = new makerjs.paths.Line([hb, -d/2], [hb, -(d/2 - tf)]);

        if (holeConfig && holeConfig.d > 0) {
            model.models = { holes: this._createHolePattern(tw, d - 2*tf, holeConfig) };
        }

        return model;
    },

    /**
     * Generate AISC Angle model
     */
    createAngle: function(l1, l2, t, holeConfig = null) {
        if (!this.isLibReady()) return this._fallback_angle(l1, l2, t, holeConfig);

        const model = { paths: {} };
        model.paths.l1_out = new makerjs.paths.Line([0,0], [l1, 0]);
        model.paths.l1_end = new makerjs.paths.Line([l1, 0], [l1, t]);
        model.paths.l1_in = new makerjs.paths.Line([l1, t], [t, t]);
        model.paths.l2_in = new makerjs.paths.Line([t, t], [t, l2]);
        model.paths.l2_end = new makerjs.paths.Line([t, l2], [0, l2]);
        model.paths.l2_out = new makerjs.paths.Line([0, l2], [0, 0]);
        
        makerjs.model.center(model);
        return model;
    },

    /**
     * Generate Base Plate model
     */
    createPlate: function(w, h, holeD, holeOffsetX, holeOffsetY) {
        if (!this.isLibReady()) return this._fallback_plate(w, h, holeD, holeOffsetX, holeOffsetY);
        const plate = new makerjs.models.Rectangle(w, h);
        const r = holeD / 2;
        const model = {
            models: { plate },
            paths: {}
        };
        if (holeD > 0) {
            model.paths.h1 = new makerjs.paths.Circle([holeOffsetX, holeOffsetY], r);
            model.paths.h2 = new makerjs.paths.Circle([w - holeOffsetX, holeOffsetY], r);
            model.paths.h3 = new makerjs.paths.Circle([w - holeOffsetX, h - holeOffsetY], r);
            model.paths.h4 = new makerjs.paths.Circle([holeOffsetX, h - holeOffsetY], r);
        }
        return model;
    },

    /**
     * Generate Custom Plate model from outline vertices and hole coordinates
     */
    createCustomPlate: function(points, holes) {
        if (!this.isLibReady()) return { paths: {} };
        const model = { models: {}, paths: {} };
        
        if (Array.isArray(points) && points.length >= 2) {
            for (let i = 0; i < points.length; i++) {
                const p1 = points[i];
                const p2 = points[(i + 1) % points.length];
                
                if (points.length === 2 && i === 1) {
                    break;
                }
                
                model.paths['line' + i] = new makerjs.paths.Line(p1, p2);
            }
        } else {
            // Draw a tiny circle at origin so MakerJS has something to measure and doesn't crash on export
            model.paths.origin_dot = new makerjs.paths.Circle([0, 0], 0.05);
        }
        
        if (Array.isArray(holes) && holes.length > 0) {
            model.models.holes = { paths: {} };
            holes.forEach((h, idx) => {
                model.models.holes.paths['h' + idx] = new makerjs.paths.Circle([h.x, h.y], h.d / 2);
            });
        }
        return model;
    },

    calculatePlateDevelopedLength: function(leg1, leg2, t, insideRadius, bendAngle) {
        const R = parseFloat(insideRadius) || 0.25;
        const T = parseFloat(t) || 0.25;
        const theta = parseFloat(bendAngle) || 90;
        const K = 0.45;
        
        const thetaRad = theta * Math.PI / 180;
        const BA = thetaRad * (R + K * T);
        const OSSB = (R + T) * Math.tan(thetaRad / 2);
        const BD = 2 * OSSB - BA;
        
        const devLength = leg1 + leg2 - BD;
        return Math.max(0.1, Math.round(devLength * 16) / 16);
    },

    calculateCurvedHSSLength: function(radius, bendAngle) {
        const R = parseFloat(radius) || 12.0;
        const theta = parseFloat(bendAngle) || 90;
        const thetaRad = theta * Math.PI / 180;
        const length = R * thetaRad;
        return Math.max(0.1, Math.round(length * 16) / 16);
    },

    createBentPlateSideView: function(leg1, leg2, t, insideRadius) {
        if (!this.isLibReady()) return { paths: {} };
        const R = parseFloat(insideRadius) || 0.25;
        const T = parseFloat(t) || 0.25;
        const L1 = parseFloat(leg1) || 4.0;
        const L2 = parseFloat(leg2) || 4.0;
        
        const model = { paths: {} };
        model.paths.insideArc = new makerjs.paths.Arc([0,0], R, 180, 270);
        model.paths.outsideArc = new makerjs.paths.Arc([0,0], R + T, 180, 270);
        
        const leg1Top = L1 - (R + T);
        model.paths.leg1Inside = new makerjs.paths.Line([-R, 0], [-R, leg1Top]);
        model.paths.leg1Outside = new makerjs.paths.Line([-R - T, 0], [-R - T, leg1Top]);
        model.paths.leg1End = new makerjs.paths.Line([-R - T, leg1Top], [-R, leg1Top]);
        
        const leg2End = L2 - (R + T);
        model.paths.leg2Inside = new makerjs.paths.Line([0, -R], [leg2End, -R]);
        model.paths.leg2Outside = new makerjs.paths.Line([0, -R - T], [leg2End, -R - T]);
        model.paths.leg2End = new makerjs.paths.Line([leg2End, -R - T], [leg2End, -R]);
        
        return model;
    },

    createBentPlateMultiView: function(leg1, leg2, insideRadius, thickness, bendAngle, width, holeConfig) {
        if (!this.isLibReady()) return this._fallback_bent_plate(leg1, leg2, thickness, insideRadius, bendAngle, width, holeConfig);
        
        const R = parseFloat(insideRadius) || 0.25;
        const T = parseFloat(thickness) || 0.25;
        const L1 = parseFloat(leg1) || 4.0;
        const L2 = parseFloat(leg2) || 4.0;
        const theta = parseFloat(bendAngle) || 90;
        const W = parseFloat(width) || 6.0;
        
        // Calculate developed length
        const thetaRad = theta * Math.PI / 180;
        const K = 0.45;
        const BA = thetaRad * (R + K * T);
        const OSSB = (R + T) * Math.tan(thetaRad / 2);
        const BD = 2 * OSSB - BA;
        const devLen = L1 + L2 - BD;
        
        const model = { models: {} };
        
        // 1. Side / Folded Profile View
        const sideView = this.createBentPlateSideView(L1, L2, T, R);
        
        // 2. Flat developed pattern view
        const flatView = { models: {}, paths: {} };
        flatView.models.outer = new makerjs.models.Rectangle(devLen, W);
        
        const bendX = L1 - BD / 2;
        flatView.paths.bendLine = new makerjs.paths.Line([bendX, 0], [bendX, W]);
        
        // Set center for both
        makerjs.model.center(sideView);
        makerjs.model.center(flatView);
        
        // Distance them nicely
        const spacing = Math.max(8.0, L2 + devLen/2 + 2.0);
        sideView.origin = [-spacing / 2, 0];
        flatView.origin = [spacing / 2, 0];
        
        model.models.sideView = sideView;
        model.models.flatView = flatView;
        
        return model;
    },

    createCurvedHSSMultiView: function(radius, bendAngle, d, t) {
        if (!this.isLibReady()) return this._fallback_curved_hss(radius, bendAngle, d, t);
        
        const R = parseFloat(radius) || 12.0;
        const theta = parseFloat(bendAngle) || 90;
        const D = parseFloat(d) || 4.0;
        const T = parseFloat(t) || 0.25;
        
        const model = { models: {} };
        
        // 1. Profile View: concentric arcs
        const profileView = { paths: {} };
        const startAngle = 180;
        const endAngle = 180 + theta;
        
        profileView.paths.centerArc = new makerjs.paths.Arc([0,0], R, startAngle, endAngle);
        profileView.paths.insideArc = new makerjs.paths.Arc([0,0], R - D/2, startAngle, endAngle);
        profileView.paths.outsideArc = new makerjs.paths.Arc([0,0], R + D/2, startAngle, endAngle);
        
        // End caps
        const cosStart = Math.cos(startAngle * Math.PI / 180);
        const sinStart = Math.sin(startAngle * Math.PI / 180);
        profileView.paths.capStart = new makerjs.paths.Line(
            [(R - D/2) * cosStart, (R - D/2) * sinStart],
            [(R + D/2) * cosStart, (R + D/2) * sinStart]
        );
        
        const cosEnd = Math.cos(endAngle * Math.PI / 180);
        const sinEnd = Math.sin(endAngle * Math.PI / 180);
        profileView.paths.capEnd = new makerjs.paths.Line(
            [(R - D/2) * cosEnd, (R - D/2) * sinEnd],
            [(R + D/2) * cosEnd, (R + D/2) * sinEnd]
        );
        
        // 2. End View: Concentric hollow circles
        const endView = { models: { ring: new makerjs.models.Ring(D/2, D/2 - T) } };
        
        makerjs.model.center(profileView);
        makerjs.model.center(endView);
        
        const spacing = Math.max(8.0, R + D + 2.0);
        profileView.origin = [-spacing / 2, 0];
        endView.origin = [spacing / 2, 0];
        
        model.models.profileView = profileView;
        model.models.endView = endView;
        
        return model;
    },

    createCurvedHSSRectMultiView: function(radius, bendAngle, w, h, t) {
        if (!this.isLibReady()) return this._fallback_curved_hss(radius, bendAngle, h, t);
        
        const R = parseFloat(radius) || 12.0;
        const theta = parseFloat(bendAngle) || 90;
        const W = parseFloat(w) || 4.0;
        const H = parseFloat(h) || 4.0;
        const T = parseFloat(t) || 0.25;
        
        const model = { models: {} };
        
        // Profile View
        const profileView = { paths: {} };
        const startAngle = 180;
        const endAngle = 180 + theta;
        profileView.paths.insideArc = new makerjs.paths.Arc([0,0], R - H/2, startAngle, endAngle);
        profileView.paths.outsideArc = new makerjs.paths.Arc([0,0], R + H/2, startAngle, endAngle);
        
        // End caps
        const cosStart = Math.cos(startAngle * Math.PI / 180);
        const sinStart = Math.sin(startAngle * Math.PI / 180);
        profileView.paths.capStart = new makerjs.paths.Line(
            [(R - H/2) * cosStart, (R - H/2) * sinStart],
            [(R + H/2) * cosStart, (R + H/2) * sinStart]
        );
        
        const cosEnd = Math.cos(endAngle * Math.PI / 180);
        const sinEnd = Math.sin(endAngle * Math.PI / 180);
        profileView.paths.capEnd = new makerjs.paths.Line(
            [(R - H/2) * cosEnd, (R - H/2) * sinEnd],
            [(R + H/2) * cosEnd, (R + H/2) * sinEnd]
        );
        
        // End View: Concentric hollow rectangles
        const endView = { models: { 
            outer: new makerjs.models.Rectangle(W, H),
            inner: new makerjs.models.Rectangle(W - 2*T, H - 2*T)
        } };
        makerjs.model.center(endView.models.inner);
        makerjs.model.center(endView.models.outer);
        makerjs.model.center(endView);
        
        makerjs.model.center(profileView);
        
        const spacing = Math.max(8.0, R + H + 2.0);
        profileView.origin = [-spacing / 2, 0];
        endView.origin = [spacing / 2, 0];
        
        model.models.profileView = profileView;
        model.models.endView = endView;
        
        return model;
    },

    createWeldedUFrame: function(w, h, depth, tubeW, tubeH, tubeT) {
        if (!this.isLibReady()) return this._fallback_welded_u_frame(w, h, depth, tubeW, tubeH, tubeT);
        
        const W = parseFloat(w) || 12.0;
        const H = parseFloat(h) || 8.0;
        const D = parseFloat(depth) || 18.0;
        const tw = parseFloat(tubeW) || 1.5;
        const th = parseFloat(tubeH) || 1.5;
        const tt = parseFloat(tubeT) || 0.0747;
        
        const model = { models: {} };
        
        // 1. Front View (U-Shape with butt joints, sitting on top of bottom runner)
        const frontView = { models: {}, paths: {} };
        
        // Bottom runner goes horizontally from 0 to W
        frontView.models.bottom = new makerjs.models.Rectangle(W, th);
        frontView.models.bottom.origin = [0, 0];
        
        // Left and right vertical legs sit directly on top of the bottom runner, height H - th
        frontView.models.leftLeg = new makerjs.models.Rectangle(tw, H - th);
        frontView.models.leftLeg.origin = [0, th];
        
        frontView.models.rightLeg = new makerjs.models.Rectangle(tw, H - th);
        frontView.models.rightLeg.origin = [W - tw, th];
        
        // 2. Top View (Rectangular frame of size W by D with butt joints)
        const topView = { models: {}, paths: {} };
        
        // Side runners run full depth D
        topView.models.sideRunnerL = new makerjs.models.Rectangle(tw, D);
        topView.models.sideRunnerL.origin = [0, 0];
        
        topView.models.sideRunnerR = new makerjs.models.Rectangle(tw, D);
        topView.models.sideRunnerR.origin = [W - tw, 0];
        
        // Front and back runners butt between the side runners
        topView.models.frontRunner = new makerjs.models.Rectangle(W - 2 * tw, tw);
        topView.models.frontRunner.origin = [tw, 0];
        
        topView.models.backRunner = new makerjs.models.Rectangle(W - 2 * tw, tw);
        topView.models.backRunner.origin = [tw, D - tw];
        
        makerjs.model.center(frontView);
        makerjs.model.center(topView);
        
        const spacing = Math.max(8.0, W + 4.0);
        frontView.origin = [-spacing / 2, 0];
        topView.origin = [spacing / 2, 0];
        
        model.models.frontView = frontView;
        model.models.topView = topView;
        
        return model;
    },

    _fallback_bent_plate: function(leg1, leg2, thickness, insideRadius, bendAngle, width, holeConfig) {
        const s = 10;
        const L1 = leg1 * s, L2 = leg2 * s, W = width * s;
        return `<svg viewBox="-100 -50 400 200" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
            <path d="M 0 0 L 0 ${L1} L ${thickness*s} ${L1} L ${thickness*s} ${thickness*s} L ${L2} ${thickness*s} L ${L2} 0 Z" fill="none" stroke="#00d4ff" stroke-width="2"/>
            <rect x="200" y="0" width="${(L1+L2)*0.9}" height="${W}" fill="none" stroke="#00d4ff" stroke-width="2"/>
            <line x1="${200 + L1*0.9}" y1="0" x2="${200 + L1*0.9}" y2="${W}" stroke="#00d4ff" stroke-width="1" stroke-dasharray="3"/>
        </svg>`;
    },

    _fallback_curved_hss: function(radius, bendAngle, d, t) {
        const s = 10, R = radius * s, D = d * s;
        return `<svg viewBox="-150 -150 400 300" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
            <path d="M -${R} 0 A ${R} ${R} 0 0 1 0 ${R}" fill="none" stroke="#00d4ff" stroke-width="${D}"/>
            <circle cx="200" cy="0" r="${D/2}" fill="none" stroke="#00d4ff" stroke-width="2"/>
        </svg>`;
    },

    _fallback_welded_u_frame: function(w, h, depth, tubeW, tubeH, tubeT) {
        const s = 10, W = w * s, H = h * s, D = depth * s, tw = tubeW * s, th = tubeH * s;
        return `<svg viewBox="-150 -100 450 250" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
            <!-- Front View (U-Shape with butt joints) -->
            <rect x="-100" y="${H-th}" width="${W}" height="${th}" fill="none" stroke="#00d4ff" stroke-width="1.5"/>
            <rect x="-100" y="0" width="${tw}" height="${H-th}" fill="none" stroke="#00d4ff" stroke-width="1.5"/>
            <rect x="${-100 + W - tw}" y="0" width="${tw}" height="${H-th}" fill="none" stroke="#00d4ff" stroke-width="1.5"/>
            
            <!-- Top View (Rectangular frame with butt joints) -->
            <rect x="150" y="0" width="${tw}" height="${D}" fill="none" stroke="#00d4ff" stroke-width="1.5"/>
            <rect x="${150 + W - tw}" y="0" width="${tw}" height="${D}" fill="none" stroke="#00d4ff" stroke-width="1.5"/>
            <rect x="${150 + tw}" y="0" width="${W - 2*tw}" height="${tw}" fill="none" stroke="#00d4ff" stroke-width="1.5"/>
            <rect x="${150 + tw}" y="${D - tw}" width="${W - 2*tw}" height="${tw}" fill="none" stroke="#00d4ff" stroke-width="1.5"/>
        </svg>`;
    },


    _createHolePattern: function(w, h, cfg) {
        const paths = {};
        const count = cfg.count || 1;
        const spacing = cfg.spacing || 0;
        const totalW = (count - 1) * spacing;
        const startX = -totalW / 2;
        for (let i = 0; i < count; i++) {
            paths['h'+i] = new makerjs.paths.Circle([startX + i*spacing, 0], cfg.d/2);
        }
        return { paths };
    },

    /** Fallbacks **/
    _fallback_rect: (w, h, t, holeConfig) => {
        const s = 10, sw = w * s, sh = h * s, st = t * s;
        let holes = "";
        if (holeConfig && holeConfig.d > 0) {
            const hd = holeConfig.d * s;
            const cnt = holeConfig.count || 1;
            const sp = (holeConfig.spacing || 0) * s;
            const totalWidth = (cnt - 1) * sp;
            const startX = sw/2 - totalWidth/2;
            for(let i=0; i<cnt; i++) {
                holes += `<circle cx="${startX + i*sp}" cy="${sh/2}" r="${hd/2}" fill="#ffaa00" opacity="0.8"/>`;
            }
        }
        return `<svg viewBox="-20 -20 ${sw+40} ${sh+40}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
            <rect x="0" y="0" width="${sw}" height="${sh}" fill="none" stroke="#00d4ff" stroke-width="2"/>
            <rect x="${st}" y="${st}" width="${sw-2*st}" height="${sh-2*st}" fill="none" stroke="#00d4ff" stroke-width="1" stroke-dasharray="4"/>
            ${holes}
        </svg>`;
    },

    _fallback_circ: (d, t, holeConfig) => {
        const s = 10, sd = d * s, st = t * s;
        let hole = "";
        if (holeConfig && holeConfig.d > 0) {
            hole = `<circle cx="${sd/2}" cy="${sd/2}" r="${holeConfig.d*s/2}" fill="#ffaa00" opacity="0.8"/>`;
        }
        return `<svg viewBox="-20 -20 ${sd+40} ${sd+40}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
            <circle cx="${sd/2}" cy="${sd/2}" r="${sd/2}" fill="none" stroke="#00d4ff" stroke-width="2"/>
            <circle cx="${sd/2}" cy="${sd/2}" r="${sd/2-st}" fill="none" stroke="#00d4ff" stroke-width="1" stroke-dasharray="4"/>
            ${hole}
        </svg>`;
    },

    _fallback_ibeam: (d, bf, tf, tw, holeConfig) => {
        const s = 10, D=d*s, BF=bf*s, TF=tf*s, TW=tw*s;
        let holes = "";
        if (holeConfig && holeConfig.d > 0) {
            const hd = holeConfig.d * s, cnt = holeConfig.count || 1, sp = (holeConfig.spacing || 0) * s;
            const startY = D/2 - ((cnt-1)*sp)/2;
            for(let i=0; i<cnt; i++) {
                holes += `<circle cx="${BF/2}" cy="${startY + i*sp}" r="${hd/2}" fill="#ffaa00" opacity="0.8"/>`;
            }
        }
        return `<svg viewBox="-20 -20 ${BF+40} ${D+40}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
            <rect x="0" y="0" width="${BF}" height="${TF}" fill="none" stroke="#00d4ff" stroke-width="2"/>
            <rect x="${BF/2 - TW/2}" y="${TF}" width="${TW}" height="${D-2*TF}" fill="none" stroke="#00d4ff" stroke-width="2"/>
            <rect x="0" y="${D-TF}" width="${BF}" height="${TF}" fill="none" stroke="#00d4ff" stroke-width="2"/>
            ${holes}
        </svg>`;
    },

    _fallback_angle: (l1, l2, t, holeConfig) => {
        const s = 10, L1=l1*s, L2=l2*s, T=t*s;
        return `<svg viewBox="-20 -20 ${L1+40} ${L2+40}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
            <path d="M0,0 L${L1},0 L${L1},${T} L${T},${T} L${T},${L2} L0,${L2} Z" fill="none" stroke="#00d4ff" stroke-width="2"/>
        </svg>`;
    },

    _fallback_plate: (w, h, holeD, holeOffsetX, holeOffsetY) => {
        const s = 10, sw=w*s, sh=h*s, r=holeD/2*s, offX=holeOffsetX*s, offY=holeOffsetY*s;
        return `<svg viewBox="-20 -20 ${sw+40} ${sh+40}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
            <rect x="0" y="0" width="${sw}" height="${sh}" fill="none" stroke="#00d4ff" stroke-width="2"/>
            <circle cx="${offX}" cy="${offY}" r="${r}" fill="none" stroke="#ffaa00" stroke-width="1"/>
            <circle cx="${sw-offX}" cy="${offY}" r="${r}" fill="none" stroke="#ffaa00" stroke-width="1"/>
            <circle cx="${sw-offX}" cy="${sh-offY}" r="${r}" fill="none" stroke="#ffaa00" stroke-width="1"/>
            <circle cx="${offX}" cy="${sh-offY}" r="${r}" fill="none" stroke="#ffaa00" stroke-width="1"/>
        </svg>`;
    },

    createCompositeDraft: function(members) {
        if (!this.isLibReady()) return this._fallback_composite_draft(members);

        const composite = { models: {} };

        members.forEach((m) => {
            let mModel = { models: {}, paths: {} };
            
            // Resolve standard dimensions if size !== 'CUSTOM'
            let w = m.params.w;
            let h = m.params.h;
            let t = m.params.t;
            let d = m.params.d;
            let bf = m.params.bf;
            let tf = m.params.tf;
            let tw = m.params.tw;
            let leg1 = m.params.leg1;
            let leg2 = m.params.leg2;

            if (m.size && m.size !== 'CUSTOM') {
                const shapes = SHAPES_DB[m.type] || [];
                const selected = shapes.find(s => s.id === m.size);
                if (selected) {
                    if (m.type === 'hss_rect') { w = selected.w; h = selected.h; t = selected.t; }
                    else if (m.type === 'hss_circ') { d = selected.d; t = selected.t; }
                    else if (m.type === 'w_beam') { d = selected.d; bf = selected.bf; tf = selected.tf; tw = selected.tw; }
                    else if (m.type === 'angles') { leg1 = selected.leg1; leg2 = selected.leg2; t = selected.t; }
                    else if (m.type === 'plate') { t = selected.t; }
                }
            }

            const length = m.length || 60.0;
            const view = m.viewType || 'profile';

            if (m.type === 'hss_rect') {
                if (view === 'profile') {
                    const outer = new makerjs.models.Rectangle(length, h);
                    const topWall = new makerjs.paths.Line([0, t], [length, t]);
                    const botWall = new makerjs.paths.Line([0, h - t], [length, h - t]);
                    mModel = { models: { outer }, paths: { topWall, botWall } };
                    makerjs.model.center(mModel);
                } else {
                    const outer = new makerjs.models.Rectangle(w, h);
                    const inner = new makerjs.models.Rectangle(Math.max(0.1, w - 2*t), Math.max(0.1, h - 2*t));
                    makerjs.model.center(inner);
                    makerjs.model.center(outer);
                    mModel = { models: { outer, inner } };
                }
            } else if (m.type === 'hss_circ') {
                if (view === 'profile') {
                    const outer = new makerjs.models.Rectangle(length, d);
                    const topWall = new makerjs.paths.Line([0, t], [length, t]);
                    const botWall = new makerjs.paths.Line([0, d - t], [length, d - t]);
                    mModel = { models: { outer }, paths: { topWall, botWall } };
                    makerjs.model.center(mModel);
                } else {
                    mModel = { models: { ring: new makerjs.models.Ring(d/2, Math.max(0.05, (d/2) - t)) } };
                }
            } else if (m.type === 'w_beam') {
                if (view === 'profile') {
                    const outer = new makerjs.models.Rectangle(length, d);
                    const topFlange = new makerjs.paths.Line([0, tf], [length, tf]);
                    const botFlange = new makerjs.paths.Line([0, d - tf], [length, d - tf]);
                    mModel = { models: { outer }, paths: { topFlange, botFlange } };
                    makerjs.model.center(mModel);
                } else {
                    mModel = this.createWBeam(d, bf, tf, tw, null);
                }
            } else if (m.type === 'angles') {
                if (view === 'profile') {
                    const outer = new makerjs.models.Rectangle(length, leg2);
                    const legLine = new makerjs.paths.Line([0, t], [length, t]);
                    mModel = { models: { outer }, paths: { legLine } };
                    makerjs.model.center(mModel);
                } else {
                    mModel = this.createAngle(leg1, leg2, t, null);
                }
            } else if (m.type === 'plate') {
                const outer = new makerjs.models.Rectangle(w, h);
                makerjs.model.center(outer);
                mModel = { models: { plate: outer } };
            }

            if (!mModel) return;

            // Conditional fabrication holes
            if (m.hasHoles && m.holes && m.holes.d > 0) {
                mModel.models.holes = { paths: {}, models: {} };
                const hd = m.holes.d;
                
                if (m.type === 'plate') {
                    const ox = Math.max(0.25, w / 2 - 1.0);
                    const oy = Math.max(0.25, h / 2 - 1.0);
                    const holePositions = [[-ox, -oy], [ox, -oy], [ox, oy], [-ox, oy]];
                    
                    holePositions.forEach((pos, hIdx) => {
                        mModel.models.holes.paths['h' + hIdx] = new makerjs.paths.Circle(pos, hd / 2);
                        
                        if (m.hasBolts && m.bolts && m.bolts.d > 0) {
                            const hex = new makerjs.models.Polygon(6, m.bolts.d * 0.75);
                            hex.origin = pos;
                            mModel.models.holes.models['b' + hIdx] = hex;
                        }
                    });
                } else {
                    const count = m.holes.count || 1;
                    const spacing = m.holes.spacing || 0;
                    const totalW = (count - 1) * spacing;
                    const startX = -totalW / 2;
                    
                    for (let i = 0; i < count; i++) {
                        const pos = [startX + i * spacing, 0];
                        mModel.models.holes.paths['h' + i] = new makerjs.paths.Circle(pos, hd / 2);
                        
                        if (m.hasBolts && m.bolts && m.bolts.d > 0) {
                            const hex = new makerjs.models.Polygon(6, m.bolts.d * 0.75);
                            hex.origin = pos;
                            mModel.models.holes.models['b' + i] = hex;
                        }
                    }
                }
            }

            // Apply rotation around the center
            if (m.rotation) {
                makerjs.model.rotate(mModel, m.rotation);
            }

            // Apply translation origin
            mModel.origin = [m.origin[0], m.origin[1]];

            composite.models[m.id] = mModel;
        });

        return composite;
    },

    _fallback_composite_draft: function(members) {
        let sw = 1200;
        let sh = 800;
        let scale = 10;
        
        let html = `<svg viewBox="-600 -400 ${sw} ${sh}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">`;
        
        // Grid lines for AutoCAD-like feeling
        html += `<g stroke="#222" stroke-width="0.5">`;
        for (let x = -600; x <= 600; x += 50) {
            html += `<line x1="${x}" y1="-400" x2="${x}" y2="400" />`;
        }
        for (let y = -400; y <= 400; y += 50) {
            html += `<line x1="-600" y1="${y}" x2="600" y2="${y}" />`;
        }
        html += `</g>`;

        members.forEach((m) => {
            const ox = m.origin[0] * scale;
            const oy = -m.origin[1] * scale;
            const rot = -m.rotation;
            
            // Resolve standard dimensions if size !== 'CUSTOM'
            let w = m.params.w;
            let h = m.params.h;
            let t = m.params.t;
            let d = m.params.d;
            let bf = m.params.bf;
            let tf = m.params.tf;
            let tw = m.params.tw;
            let leg1 = m.params.leg1;
            let leg2 = m.params.leg2;

            if (m.size && m.size !== 'CUSTOM') {
                const shapes = SHAPES_DB[m.type] || [];
                const selected = shapes.find(s => s.id === m.size);
                if (selected) {
                    if (m.type === 'hss_rect') { w = selected.w; h = selected.h; t = selected.t; }
                    else if (m.type === 'hss_circ') { d = selected.d; t = selected.t; }
                    else if (m.type === 'w_beam') { d = selected.d; bf = selected.bf; tf = selected.tf; tw = selected.tw; }
                    else if (m.type === 'angles') { leg1 = selected.leg1; leg2 = selected.leg2; t = selected.t; }
                    else if (m.type === 'plate') { t = selected.t; }
                }
            }

            const length = m.length || 60.0;
            const view = m.viewType || 'profile';
            
            let shapeHtml = "";
            
            if (m.type === 'hss_rect') {
                if (view === 'profile') {
                    const lVal = length * scale;
                    const hVal = h * scale;
                    const tVal = t * scale;
                    shapeHtml += `<rect x="${-lVal/2}" y="${-hVal/2}" width="${lVal}" height="${hVal}" fill="none" stroke="#00d4ff" stroke-width="2"/>`;
                    shapeHtml += `<line x1="${-lVal/2}" y1="${-hVal/2+tVal}" x2="${lVal/2}" y2="${-hVal/2+tVal}" stroke="#00d4ff" stroke-width="0.5" stroke-dasharray="2"/>`;
                    shapeHtml += `<line x1="${-lVal/2}" y1="${hVal/2-tVal}" x2="${lVal/2}" y2="${hVal/2-tVal}" stroke="#00d4ff" stroke-width="0.5" stroke-dasharray="2"/>`;
                } else {
                    const wVal = w * scale;
                    const hVal = h * scale;
                    const tVal = t * scale;
                    shapeHtml += `<rect x="${-wVal/2}" y="${-hVal/2}" width="${wVal}" height="${hVal}" fill="none" stroke="#00d4ff" stroke-width="2"/>`;
                    if (wVal > 2*tVal && hVal > 2*tVal) {
                        shapeHtml += `<rect x="${-wVal/2+tVal}" y="${-hVal/2+tVal}" width="${wVal-2*tVal}" height="${hVal-2*tVal}" fill="none" stroke="#00d4ff" stroke-width="0.5" stroke-dasharray="2"/>`;
                    }
                }
            } else if (m.type === 'hss_circ') {
                if (view === 'profile') {
                    const lVal = length * scale;
                    const dVal = d * scale;
                    const tVal = t * scale;
                    shapeHtml += `<rect x="${-lVal/2}" y="${-dVal/2}" width="${lVal}" height="${dVal}" fill="none" stroke="#00d4ff" stroke-width="2"/>`;
                    shapeHtml += `<line x1="${-lVal/2}" y1="${-dVal/2+tVal}" x2="${lVal/2}" y2="${-dVal/2+tVal}" stroke="#00d4ff" stroke-width="0.5" stroke-dasharray="2"/>`;
                    shapeHtml += `<line x1="${-lVal/2}" y1="${dVal/2-tVal}" x2="${lVal/2}" y2="${dVal/2-tVal}" stroke="#00d4ff" stroke-width="0.5" stroke-dasharray="2"/>`;
                } else {
                    const dVal = d * scale;
                    const tVal = t * scale;
                    shapeHtml += `<circle cx="0" cy="0" r="${dVal/2}" fill="none" stroke="#00d4ff" stroke-width="2"/>`;
                    if (dVal/2 > tVal) {
                        shapeHtml += `<circle cx="0" cy="0" r="${dVal/2 - tVal}" fill="none" stroke="#00d4ff" stroke-width="0.5" stroke-dasharray="2"/>`;
                    }
                }
            } else if (m.type === 'w_beam') {
                if (view === 'profile') {
                    const lVal = length * scale;
                    const dVal = d * scale;
                    const tfVal = tf * scale;
                    shapeHtml += `<rect x="${-lVal/2}" y="${-dVal/2}" width="${lVal}" height="${dVal}" fill="none" stroke="#00d4ff" stroke-width="2"/>`;
                    shapeHtml += `<line x1="${-lVal/2}" y1="${-dVal/2+tfVal}" x2="${lVal/2}" y2="${-dVal/2+tfVal}" stroke="#00d4ff" stroke-width="0.5"/>`;
                    shapeHtml += `<line x1="${-lVal/2}" y1="${dVal/2-tfVal}" x2="${lVal/2}" y2="${dVal/2-tfVal}" stroke="#00d4ff" stroke-width="0.5"/>`;
                } else {
                    const dVal = d * scale;
                    const bfVal = bf * scale;
                    const tfVal = tf * scale;
                    const twVal = tw * scale;
                    const hb = bfVal/2, ht = twVal/2;
                    shapeHtml += `<rect x="${-hb}" y="${-dVal/2}" width="${bfVal}" height="${tfVal}" fill="none" stroke="#00d4ff" stroke-width="2"/>`;
                    shapeHtml += `<rect x="${-ht}" y="${-dVal/2+tfVal}" width="${twVal}" height="${dVal - 2*tfVal}" fill="none" stroke="#00d4ff" stroke-width="2"/>`;
                    shapeHtml += `<rect x="${-hb}" y="${dVal/2-tfVal}" width="${bfVal}" height="${tfVal}" fill="none" stroke="#00d4ff" stroke-width="2"/>`;
                }
            } else if (m.type === 'angles') {
                if (view === 'profile') {
                    const lVal = length * scale;
                    const legVal = leg2 * scale;
                    const tVal = t * scale;
                    shapeHtml += `<rect x="${-lVal/2}" y="${-legVal/2}" width="${lVal}" height="${legVal}" fill="none" stroke="#00d4ff" stroke-width="2"/>`;
                    shapeHtml += `<line x1="${-lVal/2}" y1="${-legVal/2+tVal}" x2="${lVal/2}" y2="${-legVal/2+tVal}" stroke="#00d4ff" stroke-width="0.5"/>`;
                } else {
                    const l1Val = leg1 * scale;
                    const l2Val = leg2 * scale;
                    const tVal = t * scale;
                    const cx = -l1Val/2, cy = -l2Val/2;
                    shapeHtml += `<path d="M${cx},${cy} L${cx+l1Val},${cy} L${cx+l1Val},${cy+tVal} L${cx+tVal},${cy+tVal} L${cx+tVal},${cy+l2Val} L${cx},${cy+l2Val} Z" fill="none" stroke="#00d4ff" stroke-width="2"/>`;
                }
            } else if (m.type === 'plate') {
                const wVal = w * scale;
                const hVal = h * scale;
                shapeHtml += `<rect x="${-wVal/2}" y="${-hVal/2}" width="${wVal}" height="${hVal}" fill="none" stroke="#00d4ff" stroke-width="2"/>`;
            }

            // Holes & Bolts in fallback
            if (m.hasHoles && m.holes && m.holes.d > 0) {
                const hd = m.holes.d * scale;
                const r = hd / 2;
                
                if (m.type === 'plate') {
                    const wVal = w * scale;
                    const hVal = h * scale;
                    const hox = Math.max(2, wVal/2 - 10);
                    const hoy = Math.max(2, hVal/2 - 10);
                    const positions = [[-hox, -hoy], [hox, -hoy], [hox, hoy], [-hox, hoy]];
                    
                    positions.forEach(pos => {
                        shapeHtml += `<circle cx="${pos[0]}" cy="${pos[1]}" r="${r}" fill="none" stroke="#ffaa00" stroke-width="1"/>`;
                        if (m.hasBolts && m.bolts && m.bolts.d > 0) {
                            const br = m.bolts.d * scale * 0.75;
                            shapeHtml += `<polygon points="${pos[0]},${pos[1]-br} ${pos[0]+br*0.86},${pos[1]-br*0.5} ${pos[0]+br*0.86},${pos[1]+br*0.5} ${pos[0]},${pos[1]+br} ${pos[0]-br*0.86},${pos[1]+br*0.5} ${pos[0]-br*0.86},${pos[1]-br*0.5}" fill="none" stroke="#ffaa00" stroke-width="0.5"/>`;
                        }
                    });
                } else {
                    const count = m.holes.count || 1;
                    const spacing = (m.holes.spacing || 0) * scale;
                    const totalW = (count - 1) * spacing;
                    const startX = -totalW / 2;
                    
                    for (let i = 0; i < count; i++) {
                        const px = startX + i * spacing;
                        shapeHtml += `<circle cx="${px}" cy="0" r="${r}" fill="none" stroke="#ffaa00" stroke-width="1"/>`;
                        if (m.hasBolts && m.bolts && m.bolts.d > 0) {
                            const br = m.bolts.d * scale * 0.75;
                            shapeHtml += `<polygon points="${px},${-br} ${px+br*0.86},${-br*0.5} ${px+br*0.86},${br*0.5} ${px},${br} ${px-br*0.86},${br*0.5} ${px-br*0.86},${-br*0.5}" fill="none" stroke="#ffaa00" stroke-width="0.5"/>`;
                        }
                    }
                }
            }

            html += `<g id="${m.id}" class="draft-member-group" transform="translate(${ox}, ${oy}) rotate(${rot})" style="cursor: pointer;">
                ${shapeHtml}
            </g>`;
        });
        
        html += `</svg>`;
        return html;
    },

    renderSVG: function(model, options = {}) {
        if (typeof model === 'string') return model;
        if (!this.isLibReady()) return "<text x='10' y='30' fill='#f44'>CAD Engine Unavailable</text>";
        try {
            const defaultOpts = { useSubUnits: true, units: makerjs.unitType.Inch, stroke: '#00d4ff' };
            const mergedOpts = Object.assign({}, defaultOpts, options);
            let svg = makerjs.exporter.toSVG(model, mergedOpts);
            svg = svg.replace(/width="[^"]*"/, 'width="100%"');
            svg = svg.replace(/height="[^"]*"/, 'height="100%"');
            return svg;
        } catch (e) {
            console.error("Error rendering SVG:", e);
            return `<svg viewBox="0 0 100 100" width="100%" height="100%"><text x="10" y="50" fill="#ff4444" font-size="6">Empty or Invalid Layout</text></svg>`;
        }
    },

    renderClean2DSVG: function(model, options = {}) {
        if (typeof model === 'string') return model;
        if (!this.isLibReady()) return this.renderSVG(model, options);
        
        try {
            // Deep clone the model to avoid mutating the original
            const clonedModel = JSON.parse(JSON.stringify(model));
            
            // Recursive function to clean up internal details for 2D representation
            const cleanModelFor2D = (m, route = []) => {
                if (!m) return;
                
                const inFenceMember = route.includes('posts') || route.includes('rails') || route.includes('pickets');
                
                if (m.models && m.models.outer) {
                    if (inFenceMember) {
                        // Keep only outer and holes/bolts for fence members
                        const keysToKeep = ['outer', 'holes', 'bolts'];
                        for (const key in m.models) {
                            if (!keysToKeep.includes(key)) {
                                delete m.models[key];
                            }
                        }
                        // Remove all internal paths/centerlines
                        if (m.paths) {
                            m.paths = {};
                        }
                    } else {
                        // For other members, remove specific profile-view inner lines
                        const profileInnerPaths = ['topWall', 'botWall', 'legLine', 'topFlange', 'botFlange'];
                        if (m.paths) {
                            for (const key in m.paths) {
                                if (profileInnerPaths.includes(key)) {
                                    delete m.paths[key];
                                }
                            }
                        }
                    }
                }
                
                if (m.models) {
                    for (const key in m.models) {
                        cleanModelFor2D(m.models[key], [...route, key]);
                    }
                }
            };
            
            cleanModelFor2D(clonedModel);
            return this.renderSVG(clonedModel, options);
        } catch (e) {
            console.warn("Error cleaning model for clean SVG render, falling back:", e);
            return this.renderSVG(model, options);
        }
    },

    exportDXF: function(model) {
        if (!this.isLibReady()) { 
            alert("CAD Engine (Maker.js) is not loaded. DXF export requires an internet connection for the CDN."); 
            return null; 
        }
        
        try {
            // Deep clone the model to avoid mutating the original
            const clonedModel = JSON.parse(JSON.stringify(model));
            
            // Recursive function to clean up internal details for 2D representation
            const cleanModelFor2D = (m, route = []) => {
                if (!m) return;
                
                // If it has "outer", it represents a hollow member in 2D profile or end view.
                // We strip all inner double lines systematically for ALL members, including individual piece marks.
                if (m.models && m.models.outer) {
                    // Keep only outer and holes/bolts
                    const keysToKeep = ['outer', 'holes', 'bolts'];
                    for (const key in m.models) {
                        if (!keysToKeep.includes(key)) {
                            delete m.models[key];
                        }
                    }
                    // Remove all internal paths/centerlines/double lines
                    if (m.paths) {
                        m.paths = {};
                    }
                } else {
                    // For other members or W-beam profiles, remove specific profile-view inner lines
                    const profileInnerPaths = ['topWall', 'botWall', 'legLine', 'topFlange', 'botFlange'];
                    if (m.paths) {
                        for (const key in m.paths) {
                            if (profileInnerPaths.includes(key)) {
                                delete m.paths[key];
                            }
                        }
                    }
                }
                
                if (m.models) {
                    for (const key in m.models) {
                        cleanModelFor2D(m.models[key], [...route, key]);
                    }
                }
            };
            
            cleanModelFor2D(clonedModel);
            
            // Natively export the clean cloned model
            return makerjs.exporter.toDXF(clonedModel);
        } catch(e) {
            console.warn("Error cleaning model for DXF export, falling back:", e);
            return makerjs.exporter.toDXF(model);
        }
    },

    createFromStrokes: function(strokes, canvasWidth, canvasHeight) {
        if (!this.isLibReady()) {
            return { models: {} };
        }
        
        const model = { models: {} };
        
        // Find bounds of all strokes
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        let pointCount = 0;
        strokes.forEach(s => {
            s.forEach(p => {
                minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
                maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
                pointCount++;
            });
        });
        
        if (pointCount < 2) return model;
        
        const width = maxX - minX;
        const height = maxY - minY;
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        
        // Scale to fit within a standard 120" x 72" CAD bounding box
        const targetW = 120.0;
        const targetH = 72.0;
        let scale = 0.2; 
        if (width > 0 && height > 0) {
            const scaleX = targetW / width;
            const scaleY = targetH / height;
            scale = Math.min(scaleX, scaleY);
        }
        
        // Build Maker.js paths
        strokes.forEach((s, sIdx) => {
            if (s.length < 2) return;
            const strokeModel = { paths: {} };
            
            for (let i = 0; i < s.length - 1; i++) {
                const p1 = s[i];
                const p2 = s[i+1];
                
                // CAD Y-axis is inverted relative to canvas, and center at [0,0]
                const x1 = (p1.x - centerX) * scale;
                const y1 = -(p1.y - centerY) * scale;
                const x2 = (p2.x - centerX) * scale;
                const y2 = -(p2.y - centerY) * scale;
                
                strokeModel.paths['seg' + i] = new makerjs.paths.Line([x1, y1], [x2, y2]);
            }
            
            model.models['stroke' + sIdx] = strokeModel;
        });
        
        return model;
    },

    createRailsGates: function(length, fenceHeight, postHeight, leftPostW, rightPostW, midPostW, midPostCount, topRailH, midRailH, botRailH, picketW, picketSpacing, slope, leftPostType = 'hss_rect', rightPostType = 'hss_rect', midPostType = 'hss_rect', topRailType = 'hss_rect', midRailType = 'none', botRailType = 'hss_rect', picketType = 'hss_rect', includeBasePlates = 'no', bpW = 6.0, bpH = 0.5, bpHoleD = 0.5, bpHoleOffsetX = 0.5, bpHoleOffsetY = 0.25, midRailGap = 12.0, railsGatesType = 'gates', kickPlate = 'none', kickPlateH = 12.0, kickPlateWeld = 'inner', kickPlateSize = 'PL11GA', style = 'custom', meshType = 'none', meshFbSize = 'FB1x1/8', meshSize = 'WWM2x2x0.135', panicBarPlate = 'none', panicBarPlateGap = 36.0, panicBarPlateW = 8.0, panicBarPlateSize = 'PL3/16') {
        if (!this.isLibReady()) return this._fallback_rails_gates(length, fenceHeight, postHeight, leftPostW, rightPostW, midPostW, midPostCount, topRailH, midRailH, botRailH, picketW, picketSpacing, slope, leftPostType, rightPostType, midPostType, topRailType, midRailType, botRailType, picketType, includeBasePlates, bpW, bpH, bpHoleD, bpHoleOffsetX, bpHoleOffsetY, midRailGap, railsGatesType, kickPlate, kickPlateH, kickPlateWeld, kickPlateSize, style);

        const model = { 
            models: { 
                posts: { models: {} }, 
                rails: { models: {} },
                pickets: { models: {} }
            } 
        };
        if (includeBasePlates === 'yes') {
            model.models.basePlates = { models: {} };
        }

        const rad = slope * Math.PI / 180;
        const tan = Math.tan(rad);
        const isGates = (railsGatesType === 'gates');

        if (isGates) {
            // Mitred full frame gate
            const leftT = 0.12; 
            const rightT = 0.12;
            const topT = 0.12;
            const botT = 0.12;

            const createPolygonModel = (points) => {
                const m = { paths: {} };
                for (let i = 0; i < points.length; i++) {
                    const p1 = points[i];
                    const p2 = points[(i + 1) % points.length];
                    m.paths['edge' + i] = new makerjs.paths.Line(p1, p2);
                }
                return m;
            };

            const isPlateFrame = (leftPostType === 'plate' || rightPostType === 'plate' || topRailType === 'plate' || botRailType === 'plate');

            if (isPlateFrame) {
                // Butt-welded Plate Frame (Normal Weld)
                if (leftPostType !== 'none') {
                    const leftPost = { models: {} };
                    leftPost.models.outer = new makerjs.models.Rectangle(leftPostW, fenceHeight);
                    leftPost.origin = [0, 0];
                    model.models.posts.models['leftPost'] = leftPost;
                }

                if (rightPostType !== 'none') {
                    const rightPost = { models: {} };
                    rightPost.models.outer = new makerjs.models.Rectangle(rightPostW, fenceHeight);
                    rightPost.origin = [length - rightPostW, 0];
                    model.models.posts.models['rightPost'] = rightPost;
                }

                if (topRailType !== 'none') {
                    const topRail = { models: {} };
                    const topLen = length - leftPostW - rightPostW;
                    topRail.models.outer = new makerjs.models.Rectangle(topLen, topRailH);
                    topRail.origin = [leftPostW, fenceHeight - topRailH];
                    model.models.rails.models['topRail'] = topRail;
                }

                if (botRailType !== 'none') {
                    const botRail = { models: {} };
                    const botLen = length - leftPostW - rightPostW;
                    botRail.models.outer = new makerjs.models.Rectangle(botLen, botRailH);
                    botRail.origin = [leftPostW, botY];
                    model.models.rails.models['botRail'] = botRail;
                }
            } else {
                // 1. Left Side Runner (polygon with sloped miter ends)
                const leftOuter = [
                    [0, 0],
                    [leftPostW, botRailH],
                    [leftPostW, fenceHeight - topRailH],
                    [0, fenceHeight]
                ];
                const leftInner = [
                    [leftT, leftT],
                    [leftPostW - leftT, botRailH - leftT],
                    [leftPostW - leftT, fenceHeight - topRailH + leftT],
                    [leftT, fenceHeight - leftT]
                ];

                const leftPost = { models: {} };
                leftPost.models.outer = createPolygonModel(leftOuter);
                if (leftPostType === 'hss_rect' && leftPostW > 2 * leftT) {
                    leftPost.models.inner = createPolygonModel(leftInner);
                }
                model.models.posts.models['leftPost'] = leftPost;

                // 2. Right Side Runner
                const rightOuter = [
                    [length, 0],
                    [length - rightPostW, botRailH],
                    [length - rightPostW, fenceHeight - topRailH],
                    [length, fenceHeight]
                ];
                const rightInner = [
                    [length - rightT, rightT],
                    [length - rightPostW + rightT, botRailH - rightT],
                    [length - rightPostW + rightT, fenceHeight - topRailH + rightT],
                    [length - rightT, fenceHeight - rightT]
                ];

                const rightPost = { models: {} };
                rightPost.models.outer = createPolygonModel(rightOuter);
                if (rightPostType === 'hss_rect' && rightPostW > 2 * rightT) {
                    rightPost.models.inner = createPolygonModel(rightInner);
                }
                model.models.posts.models['rightPost'] = rightPost;

                // 3. Top Runner
                const topOuter = [
                    [0, fenceHeight],
                    [leftPostW, fenceHeight - topRailH],
                    [length - rightPostW, fenceHeight - topRailH],
                    [length, fenceHeight]
                ];
                const topInner = [
                    [topT, fenceHeight - topT],
                    [leftPostW - topT, fenceHeight - topRailH + topT],
                    [length - rightPostW + topT, fenceHeight - topRailH + topT],
                    [length - topT, fenceHeight - topT]
                ];

                const topRail = { models: {} };
                topRail.models.outer = createPolygonModel(topOuter);
                if (topRailType === 'hss_rect' && topRailH > 2 * topT) {
                    topRail.models.inner = createPolygonModel(topInner);
                }
                model.models.rails.models['topRail'] = topRail;

                // 4. Bottom Runner
                const botOuter = [
                    [0, 0],
                    [leftPostW, botRailH],
                    [length - rightPostW, botRailH],
                    [length, 0]
                ];
                const botInner = [
                    [botT, botT],
                    [leftPostW - botT, botRailH - botT],
                    [length - rightPostW + botT, botRailH - botT],
                    [length - botT, botT]
                ];

                const botRail = { models: {} };
                botRail.models.outer = createPolygonModel(botOuter);
                if (botRailType === 'hss_rect' && botRailH > 2 * botT) {
                    botRail.models.inner = createPolygonModel(botInner);
                }
                model.models.rails.models['botRail'] = botRail;
            }

            // 5. Mid Runner (butt joint between vertical side runners)
            if (midRailType !== 'none') {
                const midRail = { models: {} };
                const midY = midRailGap - midRailH;
                const midLen = length - leftPostW - rightPostW;
                
                midRail.models.outer = new makerjs.models.Rectangle(midLen, midRailH);
                midRail.models.outer.origin = [leftPostW, midY];
                
                const midT = 0.12;
                if (midRailType === 'hss_rect' && midRailH > 2 * midT) {
                    midRail.models.inner = new makerjs.models.Rectangle(midLen, midRailH - 2 * midT);
                    midRail.models.inner.origin = [leftPostW, midY + midT];
                }
                model.models.rails.models['midRail'] = midRail;
            }

            // 6. Kick Plate (Sheet metal plate)
            if (kickPlate && kickPlate !== 'none') {
                model.models.kickPlate = { models: {} };
                const isOuter = (kickPlateWeld === 'outer');
                const kpW = isOuter ? length : (length - leftPostW - rightPostW);
                const kpX = isOuter ? 0 : leftPostW;
                const kpY = isOuter ? 0 : botRailH;
                model.models.kickPlate.models.plate = new makerjs.models.Rectangle(kpW, kickPlateH);
                model.models.kickPlate.models.plate.origin = [kpX, kpY];
            }

            // 7. Vertical Pickets or Wire Mesh
            const picketBottomY = (isGates && midRailType !== 'none') 
                ? midRailGap 
                : ((kickPlate !== 'none') ? (kickPlateWeld === 'outer' ? kickPlateH : botRailH + kickPlateH) : botRailH);
            
            const picketTopY = (midRailType !== 'none') 
                ? (isGates ? (fenceHeight - topRailH) : (midRailGap - midRailH)) 
                : (fenceHeight - topRailH);
            const picketH = Math.max(2, picketTopY - picketBottomY);
            
            const clearWidth = length - leftPostW - rightPostW;

            if (isGates && meshType && meshType !== 'none') {
                // Render Mesh frame flat bars
                const mOpeningW = clearWidth;
                const mOpeningH = picketTopY - picketBottomY;
                
                let fbW = 1.0;
                if (meshFbSize && typeof meshFbSize === 'string') {
                    const match = meshFbSize.match(/FB([\d.]+)/i);
                    if (match) {
                        fbW = parseFloat(match[1]) || 1.0;
                    }
                }
                
                model.models.meshFrame = {
                    models: {
                        leftFB: {
                            paths: {
                                line1: new makerjs.paths.Line([0, fbW], [fbW, fbW]),
                                line2: new makerjs.paths.Line([fbW, fbW], [fbW, mOpeningH - fbW]),
                                line3: new makerjs.paths.Line([fbW, mOpeningH - fbW], [0, mOpeningH - fbW]),
                                line4: new makerjs.paths.Line([0, mOpeningH - fbW], [0, fbW])
                            }
                        },
                        rightFB: {
                            paths: {
                                line1: new makerjs.paths.Line([mOpeningW - fbW, fbW], [mOpeningW, fbW]),
                                line2: new makerjs.paths.Line([mOpeningW, fbW], [mOpeningW, mOpeningH - fbW]),
                                line3: new makerjs.paths.Line([mOpeningW, mOpeningH - fbW], [mOpeningW - fbW, mOpeningH - fbW]),
                                line4: new makerjs.paths.Line([mOpeningW - fbW, mOpeningH - fbW], [mOpeningW - fbW, fbW])
                            }
                        },
                        topFB: {
                            paths: {
                                line1: new makerjs.paths.Line([0, mOpeningH - fbW], [mOpeningW, mOpeningH - fbW]),
                                line2: new makerjs.paths.Line([mOpeningW, mOpeningH - fbW], [mOpeningW, mOpeningH]),
                                line3: new makerjs.paths.Line([mOpeningW, mOpeningH], [0, mOpeningH]),
                                line4: new makerjs.paths.Line([0, mOpeningH], [0, mOpeningH - fbW])
                            }
                        },
                        botFB: {
                            paths: {
                                line1: new makerjs.paths.Line([0, 0], [mOpeningW, 0]),
                                line2: new makerjs.paths.Line([mOpeningW, 0], [mOpeningW, fbW]),
                                line3: new makerjs.paths.Line([mOpeningW, fbW], [0, fbW]),
                                line4: new makerjs.paths.Line([0, fbW], [0, 0])
                            }
                        }
                    }
                };
                model.models.meshFrame.origin = [leftPostW, picketBottomY];
                
                // Render Mesh panel pattern (grid or diamond)
                const gridSpace = 2.0;
                const innerW = mOpeningW - 2 * fbW;
                const innerH = mOpeningH - 2 * fbW;
                const innerX = leftPostW + fbW;
                const innerY = picketBottomY + fbW;
                
                const meshPanel = { paths: {} };
                let gridIdx = 0;
                
                if (meshType === 'mesh') {
                    // Welded Wire Mesh: Square/rectangular grid
                    // Vertical lines
                    for (let gx = innerX + gridSpace; gx < innerX + innerW; gx += gridSpace) {
                        meshPanel.paths['v' + gridIdx++] = new makerjs.paths.Line([gx, innerY], [gx, innerY + innerH]);
                    }
                    // Horizontal lines
                    for (let gy = innerY + gridSpace; gy < innerY + innerH; gy += gridSpace) {
                        meshPanel.paths['h' + gridIdx++] = new makerjs.paths.Line([innerX, gy], [innerX + innerW, gy]);
                    }
                } else if (meshType === 'xf') {
                    // Expanded Metal: Diamond shape grid
                    const x_min = innerX;
                    const x_max = innerX + innerW;
                    const y_min = innerY;
                    const y_max = innerY + innerH;

                    // Slope 1 lines: y - x = c
                    const cMin1 = y_min - x_max;
                    const cMax1 = y_max - x_min;
                    for (let c = Math.ceil(cMin1 / gridSpace) * gridSpace; c <= cMax1; c += gridSpace) {
                        const t_min = Math.max(x_min, y_min - c);
                        const t_max = Math.min(x_max, y_max - c);
                        if (t_min < t_max - 0.01) {
                            meshPanel.paths['d1_' + gridIdx++] = new makerjs.paths.Line([t_min, t_min + c], [t_max, t_max + c]);
                        }
                    }

                    // Slope -1 lines: y + x = c
                    const cMin2 = y_min + x_min;
                    const cMax2 = y_max + x_max;
                    for (let c = Math.ceil(cMin2 / gridSpace) * gridSpace; c <= cMax2; c += gridSpace) {
                        const t_min = Math.max(x_min, c - y_max);
                        const t_max = Math.min(x_max, c - y_min);
                        if (t_min < t_max - 0.01) {
                            meshPanel.paths['d2_' + gridIdx++] = new makerjs.paths.Line([t_min, -t_min + c], [t_max, -t_max + c]);
                        }
                    }
                }
                model.models.meshPanel = meshPanel;
            }

            // Render standard pickets (if enabled)
            if (picketType !== 'none') {
                const numPickets = picketSpacing > 0 ? Math.floor((clearWidth - picketW) / picketSpacing) : 0;
                if (numPickets > 0) {
                    const usedWidth = (numPickets - 1) * picketSpacing + picketW;
                    const startX = leftPostW + (clearWidth - usedWidth) / 2;
                    const pickT = 0.08;
                    
                    for (let i = 0; i < numPickets; i++) {
                        const px = startX + i * picketSpacing;
                        const picket = { models: {} };
                        picket.models.outer = new makerjs.models.Rectangle(picketW, picketH);
                        picket.models.outer.origin = [px, picketBottomY];
                        
                        if (picketType === 'hss_rect' && picketW > 2 * pickT) {
                            picket.models.inner = new makerjs.models.Rectangle(picketW - 2 * pickT, picketH);
                            picket.models.inner.origin = [px + pickT, picketBottomY];
                        }
                        model.models.pickets.models['p' + i] = picket;
                    }
                }
            }

            // 8. Panic Bar Plate
            if (isGates && panicBarPlate === 'yes') {
                const pbpW = parseFloat(panicBarPlateW) || 8.0;
                const pbpGap = parseFloat(panicBarPlateGap) || 36.0;
                const pbpX = leftPostW;
                const pbpY = pbpGap - pbpW / 2;
                const pbpLen = length - leftPostW - rightPostW;
                
                model.models.panicBarPlate = {
                    models: {
                        plate: new makerjs.models.Rectangle(pbpLen, pbpW)
                    }
                };
                model.models.panicBarPlate.models.plate.origin = [pbpX, pbpY];
            }

        } else {
            // Original rails/fences center posts logic
            const pt = 0.2; 
            
            const leftPostHeight = postHeight;
            const leftPost = { models: {}, paths: {} };
            leftPost.models.outer = new makerjs.models.Rectangle(leftPostW, leftPostHeight);
            if (leftPostType === 'hss_rect' && leftPostW > 2 * pt) {
                leftPost.models.inner = new makerjs.models.Rectangle(leftPostW - 2 * pt, leftPostHeight - 2 * pt);
                leftPost.models.inner.origin = [pt, pt];
            }
            const effectiveEmbed = (includeBasePlates === 'yes') ? 0 : Math.max(0, postHeight - fenceHeight - 6.0);
            leftPost.origin = [0, -effectiveEmbed];
            model.models.posts.models['leftPost'] = leftPost;

            if (includeBasePlates === 'yes') {
                const bp = {
                    models: { outer: new makerjs.models.Rectangle(bpW, bpH) },
                    paths: {
                        h1: new makerjs.paths.Circle([bpHoleOffsetX, bpHoleOffsetY], bpHoleD / 2),
                        h2: new makerjs.paths.Circle([bpW - bpHoleOffsetX, bpHoleOffsetY], bpHoleD / 2)
                    }
                };
                bp.origin = [leftPostW/2 - bpW/2, -effectiveEmbed - bpH];
                model.models.basePlates.models['bpLeft'] = bp;
            }

            const rightPostHeight = postHeight;
            const rightPost = { models: {}, paths: {} };
            rightPost.models.outer = new makerjs.models.Rectangle(rightPostW, rightPostHeight);
            if (rightPostType === 'hss_rect' && rightPostW > 2 * pt) {
                rightPost.models.inner = new makerjs.models.Rectangle(rightPostW - 2 * pt, rightPostHeight - 2 * pt);
                rightPost.models.inner.origin = [pt, pt];
            }
            const rightPx = length - rightPostW;
            const rightPyBase = length * tan;
            rightPost.origin = [rightPx, rightPyBase - effectiveEmbed];
            model.models.posts.models['rightPost'] = rightPost;

            if (includeBasePlates === 'yes') {
                const bp = {
                    models: { outer: new makerjs.models.Rectangle(bpW, bpH) },
                    paths: {
                        h1: new makerjs.paths.Circle([bpHoleOffsetX, bpHoleOffsetY], bpHoleD / 2),
                        h2: new makerjs.paths.Circle([bpW - bpHoleOffsetX, bpHoleOffsetY], bpHoleD / 2)
                    }
                };
                bp.origin = [rightPx + rightPostW/2 - bpW/2, rightPyBase - effectiveEmbed - bpH];
                makerjs.model.rotate(bp, slope, [rightPx + rightPostW/2, rightPyBase - effectiveEmbed]);
                model.models.basePlates.models['bpRight'] = bp;
            }

            const isBentOrExtended = postHeight > fenceHeight;
            const midPostHeight = isBentOrExtended ? ((postHeight - fenceHeight) + effectiveEmbed) : 0;
            
            if (midPostCount > 0 && midPostHeight > 0) {
                const centerDist = (length - leftPostW/2 - rightPostW/2);
                const spanSpacing = centerDist / (midPostCount + 1);
                
                for (let i = 1; i <= midPostCount; i++) {
                    const midCx = leftPostW/2 + i * spanSpacing;
                    const midPx = midCx - midPostW/2;
                    const midPyBase = midCx * tan;
                    
                    const midPost = { models: {}, paths: {} };
                    midPost.models.outer = new makerjs.models.Rectangle(midPostW, midPostHeight);
                    if (midPostType === 'hss_rect' && midPostW > 2 * pt && midPostHeight > 2 * pt) {
                        midPost.models.inner = new makerjs.models.Rectangle(midPostW - 2 * pt, midPostHeight - 2 * pt);
                        midPost.models.inner.origin = [pt, pt];
                    }
                    midPost.origin = [midPx, midPyBase - effectiveEmbed];
                    model.models.posts.models['midPost_' + i] = midPost;
                    
                    if (includeBasePlates === 'yes') {
                        const bp = {
                            models: { outer: new makerjs.models.Rectangle(bpW, bpH) },
                            paths: {
                                h1: new makerjs.paths.Circle([bpHoleOffsetX, bpHoleOffsetY], bpHoleD / 2),
                                h2: new makerjs.paths.Circle([bpW - bpHoleOffsetX, bpHoleOffsetY], bpHoleD / 2)
                            }
                        };
                        bp.origin = [midPx + midPostW/2 - bpW/2, midPyBase - effectiveEmbed - bpH];
                        makerjs.model.rotate(bp, slope, [midPx + midPostW/2, midPyBase - effectiveEmbed]);
                        model.models.basePlates.models['bpMid_' + i] = bp;
                    }
                }
            }

            const topY = postHeight - topRailH;
            const topRail = { models: {}, paths: {} };
            topRail.models.outer = new makerjs.models.Rectangle(length, topRailH);
            if (topRailType === 'hss_rect' && topRailH > 2 * pt) {
                topRail.models.inner = new makerjs.models.Rectangle(length, topRailH - 2 * pt);
                topRail.models.inner.origin = [0, pt];
            }
            
            topRail.paths.miterL = new makerjs.paths.Line([0, topRailH], [leftPostW, 0]);
            topRail.paths.miterR = new makerjs.paths.Line([length, topRailH], [length - rightPostW, 0]);
            
            topRail.origin = [0, topY];
            model.models.rails.models['topRail'] = topRail;

            const botY = isBentOrExtended ? (postHeight - fenceHeight) : 0;
            const botRail = { models: {}, paths: {} };
            
            if (!isBentOrExtended) {
                botRail.models.outer = new makerjs.models.Rectangle(length, botRailH);
                if (botRailType === 'hss_rect' && botRailH > 2 * pt) {
                    botRail.models.inner = new makerjs.models.Rectangle(length, botRailH - 2 * pt);
                    botRail.models.inner.origin = [0, pt];
                }
                botRail.paths.miterL = new makerjs.paths.Line([0, 0], [leftPostW, botRailH]);
                botRail.paths.miterR = new makerjs.paths.Line([length, 0], [length - rightPostW, botRailH]);
                botRail.origin = [0, 0];
            } else {
                const botLen = length - leftPostW - rightPostW;
                botRail.models.outer = new makerjs.models.Rectangle(botLen, botRailH);
                if (botRailType === 'hss_rect' && botRailH > 2 * pt) {
                    botRail.models.inner = new makerjs.models.Rectangle(botLen, botRailH - 2 * pt);
                    botRail.models.inner.origin = [0, pt];
                }
                botRail.origin = [leftPostW, botY];
            }
            model.models.rails.models['botRail'] = botRail;

            if (midRailType !== 'none') {
                const midRailY = topY - midRailGap - midRailH;
                const midLen = length - leftPostW - rightPostW;
                const midRail = { models: {}, paths: {} };
                midRail.models.outer = new makerjs.models.Rectangle(midLen, midRailH);
                if (midRailType === 'hss_rect' && midRailH > 2 * pt) {
                    midRail.models.inner = new makerjs.models.Rectangle(midLen, midRailH - 2 * pt);
                    midRail.models.inner.origin = [0, pt];
                }
                midRail.origin = [leftPostW, midRailY];
                model.models.rails.models['midRail'] = midRail;
            }

            const picketBottomY = botY + botRailH;
            const picketTopY = (midRailType !== 'none') ? (topY - midRailGap - midRailH) : topY;
            const picketH = Math.max(2, picketTopY - picketBottomY);
            
            const picketPositions = getPicketPositions(style, length, leftPostW, rightPostW, picketW, picketSpacing, midPostCount, midPostW);
            
            picketPositions.forEach((px, i) => {
                const picket = { models: {}, paths: {} };
                picket.models.outer = new makerjs.models.Rectangle(picketW, picketH);
                if (picketType === 'hss_rect' && picketW > 2 * pt) {
                    picket.models.inner = new makerjs.models.Rectangle(picketW - 2 * pt, picketH - 2 * pt);
                    picket.models.inner.origin = [pt, pt];
                }
                picket.origin = [px, picketBottomY];
                model.models.pickets.models['p' + i] = picket;
            });
        }

        if (slope) {
            makerjs.model.rotate(model, slope);
        }

        return model;
    },

    _fallback_rails_gates: function(length, fenceHeight, postHeight, leftPostW, rightPostW, midPostW, midPostCount, topRailH, midRailH, botRailH, picketW, picketSpacing, slope, leftPostType = 'hss_rect', rightPostType = 'hss_rect', midPostType = 'hss_rect', topRailType = 'hss_rect', midRailType = 'none', botRailType = 'hss_rect', picketType = 'hss_rect', includeBasePlates = 'no', bpW = 6.0, bpH = 0.5, bpHoleD = 0.5, bpHoleOffsetX = 0.5, bpHoleOffsetY = 0.25, midRailGap = 12.0, railsGatesType = 'gates', kickPlate = 'none', kickPlateH = 12.0, kickPlateWeld = 'inner', kickPlateSize = 'PL11GA', style = 'custom', meshType = 'none', meshFbSize = 'FB1x1/8', meshSize = 'WWM2x2x0.135', panicBarPlate = 'none', panicBarPlateGap = 36.0, panicBarPlateW = 8.0, panicBarPlateSize = 'PL3/16') {
        const s = 4; 
        const L = length * s;
        const FH = fenceHeight * s;
        const PH = postHeight * s;
        const rad = slope * Math.PI / 180;
        const tan = Math.tan(rad);
        
        let postsHtml = "";
        let basePlatesHtml = "";
        let railsHtml = "";
        let picketsHtml = "";
        let kickPlateHtml = "";
        
        const isExtended = postHeight > fenceHeight;
        const midPH = isExtended ? (postHeight - fenceHeight) * s : 0;
        const effectiveEmbed_scaled = (includeBasePlates === 'yes') ? 0 : Math.max(0, postHeight - fenceHeight - 6.0) * s;
        
        const rise = L * tan;
        const maxRise = Math.max(0, rise);
        const groundY = PH - effectiveEmbed_scaled + maxRise + 50;

        const leftPostW_scaled = leftPostW * s;
        const rightPostW_scaled = rightPostW * s;
        const midPostW_scaled = midPostW * s;
        const topRailH_scaled = topRailH * s;
        const botRailH_scaled = botRailH * s;
        const midRailH_scaled = midRailH * s;
        const picketW_scaled = picketW * s;
        const picketSpacing_scaled = picketSpacing * s;
        const bpW_scaled = bpW * s;
        const bpH_scaled = bpH * s;

        const isGates = (railsGatesType === 'gates');

        if (isGates) {
            const isPlateFrame = (leftPostType === 'plate' || rightPostType === 'plate' || topRailType === 'plate' || botRailType === 'plate');

            if (isPlateFrame) {
                if (leftPostType !== 'none') {
                    postsHtml += `<rect x="0" y="${frameTopY}" width="${leftPostW_scaled}" height="${FH}" fill="none" stroke="#00d4ff" stroke-width="2"/>`;
                }
                if (rightPostType !== 'none') {
                    postsHtml += `<rect x="${L - rightPostW_scaled}" y="${frameTopY}" width="${rightPostW_scaled}" height="${FH}" fill="none" stroke="#00d4ff" stroke-width="2"/>`;
                }
                if (topRailType !== 'none') {
                    const topLen_scaled = L - leftPostW_scaled - rightPostW_scaled;
                    railsHtml += `<rect x="${leftPostW_scaled}" y="${frameTopY}" width="${topLen_scaled}" height="${topRailH_scaled}" fill="none" stroke="#00d4ff" stroke-width="2"/>`;
                }
                if (botRailType !== 'none') {
                    const botLen_scaled = L - leftPostW_scaled - rightPostW_scaled;
                    railsHtml += `<rect x="${leftPostW_scaled}" y="${frameBotY - botRailH_scaled}" width="${botLen_scaled}" height="${botRailH_scaled}" fill="none" stroke="#00d4ff" stroke-width="2"/>`;
                }
            } else {
                const pt = 0.12 * s;

                const makePoly = (pts, stroke, strokeWidth, dashed = false) => {
                    const ptsStr = pts.map(p => `${p[0]},${p[1]}`).join(' ');
                    const dashAttr = dashed ? 'stroke-dasharray="2" opacity="0.6"' : '';
                    return `<polygon points="${ptsStr}" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}" ${dashAttr}/>`;
                };

                // 1. Left Side Runner (polygon with sloped miter ends)
                const leftOuter = [
                    [0, frameBotY],
                    [leftPostW_scaled, frameBotY - botRailH_scaled],
                    [leftPostW_scaled, frameTopY + topRailH_scaled],
                    [0, frameTopY]
                ];
                const leftInner = [
                    [pt, frameBotY - pt],
                    [leftPostW_scaled - pt, frameBotY - botRailH_scaled + pt],
                    [leftPostW_scaled - pt, frameTopY + topRailH_scaled - pt],
                    [pt, frameTopY + pt]
                ];
                postsHtml += makePoly(leftOuter, "#00d4ff", 2);
                if (leftPostType === 'hss_rect' && leftPostW_scaled > 2 * pt) {
                    postsHtml += makePoly(leftInner, "#00d4ff", 0.5, true);
                }

                // 2. Right Side Runner
                const rightOuter = [
                    [L, frameBotY],
                    [L - rightPostW_scaled, frameBotY - botRailH_scaled],
                    [L - rightPostW_scaled, frameTopY + topRailH_scaled],
                    [L, frameTopY]
                ];
                const rightInner = [
                    [L - pt, frameBotY - pt],
                    [L - rightPostW_scaled + pt, frameBotY - botRailH_scaled + pt],
                    [L - rightPostW_scaled + pt, frameTopY + topRailH_scaled - pt],
                    [L - pt, frameTopY + pt]
                ];
                postsHtml += makePoly(rightOuter, "#00d4ff", 2);
                if (rightPostType === 'hss_rect' && rightPostW_scaled > 2 * pt) {
                    postsHtml += makePoly(rightInner, "#00d4ff", 0.5, true);
                }

                // 3. Top Runner
                const topOuter = [
                    [0, frameTopY],
                    [leftPostW_scaled, frameTopY + topRailH_scaled],
                    [L - rightPostW_scaled, frameTopY + topRailH_scaled],
                    [L, frameTopY]
                ];
                const topInner = [
                    [pt, frameTopY + pt],
                    [leftPostW_scaled - pt, frameTopY + topRailH_scaled - pt],
                    [L - rightPostW_scaled + pt, frameTopY + topRailH_scaled - pt],
                    [L - pt, frameTopY + pt]
                ];
                railsHtml += makePoly(topOuter, "#00d4ff", 2);
                if (topRailType === 'hss_rect' && topRailH_scaled > 2 * pt) {
                    railsHtml += makePoly(topInner, "#00d4ff", 0.5, true);
                }

                // 4. Bottom Runner
                const botOuter = [
                    [0, frameBotY],
                    [leftPostW_scaled, frameBotY - botRailH_scaled],
                    [L - rightPostW_scaled, frameBotY - botRailH_scaled],
                    [L, frameBotY]
                ];
                const botInner = [
                    [pt, frameBotY - pt],
                    [leftPostW_scaled - pt, frameBotY - botRailH_scaled + pt],
                    [L - rightPostW_scaled + pt, frameBotY - botRailH_scaled + pt],
                    [L - pt, frameBotY - pt]
                ];
                railsHtml += makePoly(botOuter, "#00d4ff", 2);
                if (botRailType === 'hss_rect' && botRailH_scaled > 2 * pt) {
                    railsHtml += makePoly(botInner, "#00d4ff", 0.5, true);
                }
            }

            // 5. Mid Runner (butt joint)
            if (midRailType !== 'none') {
                const midY_scaled = frameBotY - (midRailGap * s);
                const midLen_scaled = L - leftPostW_scaled - rightPostW_scaled;
                railsHtml += `<rect x="${leftPostW_scaled}" y="${midY_scaled}" width="${midLen_scaled}" height="${midRailH_scaled}" fill="none" stroke="#00d4ff" stroke-width="2"/>`;
                if (midRailType === 'hss_rect' && midRailH_scaled > 2 * pt) {
                    railsHtml += `<rect class="hss-inner-line" x="${leftPostW_scaled}" y="${midY_scaled + pt}" width="${midLen_scaled}" height="${midRailH_scaled - 2 * pt}" fill="none" stroke="#00d4ff" stroke-width="0.5" stroke-dasharray="2" opacity="0.6"/>`;
                }
            }

            // 6. Kick Plate (Sheet metal plate visual fill)
            if (kickPlate && kickPlate !== 'none') {
                const isOuter = (kickPlateWeld === 'outer');
                const kpW_scaled = isOuter ? L : (L - leftPostW_scaled - rightPostW_scaled);
                const kpX_scaled = isOuter ? 0 : leftPostW_scaled;
                const kpH_scaled = kickPlateH * s;
                const kpY_scaled = frameBotY - kpH_scaled;
                
                // Represent it as a semi-transparent filled sheet with green weld dots/dashed boundaries
                kickPlateHtml += `
                    <g>
                        <rect x="${kpX_scaled}" y="${kpY_scaled}" width="${kpW_scaled}" height="${kpH_scaled}" fill="rgba(0, 212, 255, 0.15)" stroke="#00ffff" stroke-width="1.5"/>
                        <line x1="${kpX_scaled}" y1="${frameBotY}" x2="${kpX_scaled + kpW_scaled}" y2="${frameBotY}" stroke="#00ff00" stroke-width="1" stroke-dasharray="2" opacity="0.8"/>
                        <line x1="${kpX_scaled}" y1="${kpY_scaled}" x2="${kpX_scaled}" y2="${frameBotY}" stroke="#00ff00" stroke-width="1" stroke-dasharray="2" opacity="0.8"/>
                        <line x1="${kpX_scaled + kpW_scaled}" y1="${kpY_scaled}" x2="${kpX_scaled + kpW_scaled}" y2="${frameBotY}" stroke="#00ff00" stroke-width="1" stroke-dasharray="2" opacity="0.8"/>
                    </g>
                `;
            }

            // 7. Vertical Pickets (clipped above kick plate or welded to top of mid runner)
            const picketBottomY_scaled = frameBotY - ((isGates && midRailType !== 'none') ? (midRailGap * s) : ((kickPlate !== 'none') ? (kickPlateH * s) : botRailH_scaled));
            const picketTopY_scaled = (midRailType !== 'none') ? (isGates ? (frameTopY + topRailH_scaled) : (frameBotY - midRailGap * s + midRailH_scaled)) : (frameTopY + topRailH_scaled);
            const picketH_scaled = Math.max(8, picketBottomY_scaled - picketTopY_scaled);

            const clearWidth_scaled = L - leftPostW_scaled - rightPostW_scaled;
            const numPickets = picketSpacing_scaled > 0 ? Math.floor((clearWidth_scaled - picketW_scaled) / picketSpacing_scaled) : 0;
            
            if (numPickets > 0) {
                const usedWidth_scaled = (numPickets - 1) * picketSpacing_scaled + picketW_scaled;
                const startX_scaled = leftPostW_scaled + (clearWidth_scaled - usedWidth_scaled) / 2;
                for (let i = 0; i < numPickets; i++) {
                    const px_scaled = startX_scaled + i * picketSpacing_scaled;
                    picketsHtml += `<rect x="${px_scaled}" y="${picketTopY_scaled}" width="${picketW_scaled}" height="${picketH_scaled}" fill="none" stroke="#00d4ff" stroke-width="1.5"/>`;
                    if (picketType === 'hss_rect' && picketW_scaled > 1.6) {
                        const ptPick = 0.4;
                        picketsHtml += `<rect class="hss-inner-line" x="${px_scaled + ptPick}" y="${picketTopY_scaled}" width="${picketW_scaled - 2 * ptPick}" height="${picketH_scaled}" fill="none" stroke="#00d4ff" stroke-width="0.5" stroke-dasharray="2" opacity="0.6"/>`;
                    }
                }
            }

        } else {
            // Original rails/posts SVG fallback logic
            const leftPostY = groundY - (PH - effectiveEmbed_scaled);
            postsHtml += `<rect x="0" y="${leftPostY}" width="${leftPostW_scaled}" height="${PH}" fill="none" stroke="#00d4ff" stroke-width="2"/>`;
            if (leftPostType === 'hss_rect' && leftPostW_scaled > 1.6) {
                const pt = 0.8;
                postsHtml += `<rect class="hss-inner-line" x="${pt}" y="${leftPostY + pt}" width="${leftPostW_scaled - 2 * pt}" height="${PH - 2 * pt}" fill="none" stroke="#00d4ff" stroke-width="0.5" opacity="0.6"/>`;
            }
            if (includeBasePlates === 'yes') {
                basePlatesHtml += `<rect x="${leftPostW_scaled/2 - bpW_scaled/2}" y="${leftPostY + PH}" width="${bpW_scaled}" height="${bpH_scaled}" fill="none" stroke="#00d4ff" stroke-width="1.5"/>`;
            }

            const rightPx = L - rightPostW_scaled;
            const rightPyBase = L * tan;
            const rightPostY = groundY - rightPyBase - (PH - effectiveEmbed_scaled);
            postsHtml += `<rect x="${rightPx}" y="${rightPostY}" width="${rightPostW_scaled}" height="${PH}" fill="none" stroke="#00d4ff" stroke-width="2"/>`;
            if (rightPostType === 'hss_rect' && rightPostW_scaled > 1.6) {
                const pt = 0.8;
                postsHtml += `<rect class="hss-inner-line" x="${rightPx + pt}" y="${rightPostY + pt}" width="${rightPostW_scaled - 2 * pt}" height="${PH - 2 * pt}" fill="none" stroke="#00d4ff" stroke-width="0.5" opacity="0.6"/>`;
            }
            if (includeBasePlates === 'yes') {
                basePlatesHtml += `<rect x="${rightPx + rightPostW_scaled/2 - bpW_scaled/2}" y="${rightPostY + PH}" width="${bpW_scaled}" height="${bpH_scaled}" fill="none" stroke="#00d4ff" stroke-width="1.5"/>`;
            }

            const midPH_scaled = midPH + effectiveEmbed_scaled;
            if (midPostCount > 0 && midPH_scaled > 0) {
                const centerDist = L - leftPostW_scaled/2 - rightPostW_scaled/2;
                const spanSpacing = centerDist / (midPostCount + 1);
                for (let i = 1; i <= midPostCount; i++) {
                    const midCx = leftPostW_scaled/2 + i * spanSpacing;
                    const midPx = midCx - midPostW_scaled/2;
                    const midPyBase = midCx * tan;
                    const midPostY = groundY - midPyBase - midPH_scaled;
                    postsHtml += `<rect x="${midPx}" y="${midPostY}" width="${midPostW_scaled}" height="${midPH_scaled}" fill="none" stroke="#00d4ff" stroke-width="2"/>`;
                    if (midPostType === 'hss_rect' && midPostW_scaled > 1.6 && midPH_scaled > 1.6) {
                        const pt = 0.8;
                        postsHtml += `<rect class="hss-inner-line" x="${midPx + pt}" y="${midPostY + pt}" width="${midPostW_scaled - 2 * pt}" height="${midPH_scaled - 2 * pt}" fill="none" stroke="#00d4ff" stroke-width="0.5" opacity="0.6"/>`;
                    }
                    if (includeBasePlates === 'yes') {
                        basePlatesHtml += `<rect x="${midPx + midPostW_scaled/2 - bpW_scaled/2}" y="${midPostY + midPH_scaled}" width="${bpW_scaled}" height="${bpH_scaled}" fill="none" stroke="#00d4ff" stroke-width="1.5"/>`;
                    }
                }
            }

            const topY_scaled = leftPostY;
            railsHtml += `<rect x="0" y="${topY_scaled}" width="${L}" height="${topRailH_scaled}" fill="none" stroke="#00d4ff" stroke-width="2"/>`;
            if (topRailType === 'hss_rect' && topRailH_scaled > 1.6) {
                const pt = 0.8;
                railsHtml += `<rect class="hss-inner-line" x="0" y="${topY_scaled + pt}" width="${L}" height="${topRailH_scaled - 2 * pt}" fill="none" stroke="#00d4ff" stroke-width="0.5" opacity="0.6"/>`;
            }
            railsHtml += `<line class="hss-inner-line" x1="0" y1="${topY_scaled}" x2="${leftPostW_scaled}" y2="${topY_scaled + topRailH_scaled}" stroke="#00d4ff" stroke-width="1"/>`;
            railsHtml += `<line class="hss-inner-line" x1="${L}" y1="${topY_scaled}" x2="${L - rightPostW_scaled}" y2="${topY_scaled + topRailH_scaled}" stroke="#00d4ff" stroke-width="1"/>`;

            const botY_scaled = leftPostY + (PH - FH);
            if (!isExtended) {
                railsHtml += `<rect x="0" y="${botY_scaled}" width="${L}" height="${botRailH_scaled}" fill="none" stroke="#00d4ff" stroke-width="2"/>`;
                if (botRailType === 'hss_rect' && botRailH_scaled > 1.6) {
                    const pt = 0.8;
                    railsHtml += `<rect class="hss-inner-line" x="0" y="${botY_scaled + pt}" width="${L}" height="${botRailH_scaled - 2 * pt}" fill="none" stroke="#00d4ff" stroke-width="0.5" opacity="0.6"/>`;
                }
                railsHtml += `<line class="hss-inner-line" x1="0" y1="${botY_scaled + botRailH_scaled}" x2="${leftPostW_scaled}" y2="${botY_scaled}" stroke="#00d4ff" stroke-width="1"/>`;
                railsHtml += `<line class="hss-inner-line" x1="${L}" y1="${botY_scaled + botRailH_scaled}" x2="${L - rightPostW_scaled}" y2="${botY_scaled}" stroke="#00d4ff" stroke-width="1"/>`;
            } else {
                const botLen_scaled = L - leftPostW_scaled - rightPostW_scaled;
                railsHtml += `<rect x="${leftPostW_scaled}" y="${botY_scaled}" width="${botLen_scaled}" height="${botRailH_scaled}" fill="none" stroke="#00d4ff" stroke-width="2"/>`;
                if (botRailType === 'hss_rect' && botRailH_scaled > 1.6) {
                    const pt = 0.8;
                    railsHtml += `<rect class="hss-inner-line" x="${leftPostW_scaled}" y="${botY_scaled + pt}" width="${botLen_scaled}" height="${botRailH_scaled - 2 * pt}" fill="none" stroke="#00d4ff" stroke-width="0.5" opacity="0.6"/>`;
                }
            }

            if (midRailType !== 'none') {
                const midRailY_scaled = topY_scaled + (midRailGap * s);
                const midLen_scaled = L - leftPostW_scaled - rightPostW_scaled;
                railsHtml += `<rect x="${leftPostW_scaled}" y="${midRailY_scaled}" width="${midLen_scaled}" height="${midRailH_scaled}" fill="none" stroke="#00d4ff" stroke-width="2"/>`;
                if (midRailType === 'hss_rect' && midRailH_scaled > 2 * pt) {
                    const pt = 0.8;
                    railsHtml += `<rect class="hss-inner-line" x="${leftPostW_scaled}" y="${midRailY_scaled + pt}" width="${midLen_scaled}" height="${midRailH_scaled - 2 * pt}" fill="none" stroke="#00d4ff" stroke-width="0.5" opacity="0.6"/>`;
                }
            }

            const picketBottomY_scaled = botY_scaled + botRailH_scaled;
            const picketTopY_scaled = (midRailType !== 'none') ? (topY_scaled + midRailGap * s) : topY_scaled;
            const picketH_scaled = Math.max(8, picketTopY_scaled - picketBottomY_scaled);

            const picketPositions = getPicketPositions(style, length, leftPostW, rightPostW, picketW, picketSpacing, midPostCount, midPostW);
            
            picketPositions.forEach(px => {
                const px_scaled = px * s;
                picketsHtml += `<rect x="${px_scaled}" y="${picketBottomY_scaled}" width="${picketW_scaled}" height="${picketH_scaled}" fill="none" stroke="#00d4ff" stroke-width="1.5"/>`;
                if (picketType === 'hss_rect' && picketW_scaled > 1.6) {
                    const pt = 0.8;
                    picketsHtml += `<rect class="hss-inner-line" x="${px_scaled + pt}" y="${picketBottomY_scaled + pt}" width="${picketW_scaled - 2 * pt}" height="${picketH_scaled - 2 * pt}" fill="none" stroke="#00d4ff" stroke-width="0.5" opacity="0.6"/>`;
                }
            });
        }

        const totalW = L + 100;
        const totalH = groundY + 150;
        
        let html = `<svg viewBox="-50 -50 ${totalW} ${totalH}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">`;
        html += `<g transform="rotate(${slope})">`;
        html += basePlatesHtml;
        html += postsHtml;
        html += railsHtml;
        html += picketsHtml;
        html += `</g></svg>`;
        return html;
    },

    createRailCatalog: function(
        length,
        style,
        leftPostOpt,
        rightPostOpt,
        midPostsOpt,
        midPostCount,
        fenceHeight,
        postHeight,
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
        includeBasePlates = 'no',
        bpW = 6.0,
        bpL = 6.0,
        bpH = 0.5,
        bpHoleD = 0.5,
        bpHoleOffsetX = 0.5,
        bpHoleOffsetY = 0.25,
        customSpacings = null,
        meshGridW = 2.0,
        meshGridH = 2.0,
        meshWireD = 0.135,
        extraFlatBar = 'no',
        extra6 = false,
        panelType = 'main',
        freeEnd4 = false,
        deltaLeft = 0,
        deltaRight = 0
    ) {
        length = parseFloat(length) || 120.0;
        fenceHeight = parseFloat(fenceHeight) || 41.0;
        postHeight = parseFloat(postHeight) || 45.75;
        postW = parseFloat(postW) || 1.5;
        postH = parseFloat(postH) || 1.5;
        postT = parseFloat(postT) || 0.1196;
        topRailW = parseFloat(topRailW) || 1.5;
        topRailH = parseFloat(topRailH) || 1.5;
        topRailT = parseFloat(topRailT) || 0.0598;
        botRailW = parseFloat(botRailW) || 1.5;
        botRailH = parseFloat(botRailH) || 1.5;
        botRailT = parseFloat(botRailT) || 0.0598;
        midRailW = parseFloat(midRailW) || 1.5;
        midRailH = parseFloat(midRailH) || 1.5;
        midRailT = parseFloat(midRailT) || 0.0598;
        midRailGap = parseFloat(midRailGap) || 12.0;
        picketW = parseFloat(picketW) || 0.5;
        picketH = parseFloat(picketH) || 0.5;
        picketT = parseFloat(picketT) || 0.0598;
        picketSpacing = parseFloat(picketSpacing) || 4.0;
        meshGridW = parseFloat(meshGridW) || 2.0;
        meshGridH = parseFloat(meshGridH) || 2.0;
        meshWireD = parseFloat(meshWireD) || 0.135;
        deltaLeft = parseFloat(deltaLeft) || 0;
        deltaRight = parseFloat(deltaRight) || 0;

        if (style === 'executive') {
            fenceHeight = 41.0;
            postHeight = 45.75;
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
        } else if (style === 'urban_balcony') {
            fenceHeight = 41.0;
            postHeight = 45.75;
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
            picketSpacing = 0;
        } else if (style === 'villa_balcony') {
            fenceHeight = 41.0;
            postHeight = 45.75;
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
            picketSpacing = 0;
        } else if (style === 'urban_custom' || style === 'villa_custom') {
            picketType = 'none';
            picketSpacing = 0;
        }

        if (!this.isLibReady()) {
            return this._fallback_rail_catalog(
                length, style, leftPostOpt, rightPostOpt, midPostsOpt, midPostCount,
                fenceHeight, postHeight, postType, postW, postH, postT,
                topRailType, topRailW, topRailH, topRailT,
                botRailType, botRailW, botRailH, botRailT,
                midRailType, midRailW, midRailH, midRailT, midRailGap,
                picketType, picketW, picketH, picketT, picketSpacing,
                includeBasePlates, bpW, bpL, bpH, bpHoleD, bpHoleOffsetX, bpHoleOffsetY,
                customSpacings
            );
        }

        const model = {
            models: {
                posts: { models: {} },
                rails: { models: {} },
                pickets: { models: {} }
            }
        };

        if (includeBasePlates === 'yes') {
            model.models.basePlates = { models: {} };
        }

        const pt = 0.2; // default HSS inner offset if type is hss_rect
        const botRailY = postHeight - fenceHeight;

        // Helper to create polygon models
        const createPolygonModel = (points) => {
            const m = { paths: {} };
            for (let i = 0; i < points.length; i++) {
                const p1 = points[i];
                const p2 = points[(i + 1) % points.length];
                m.paths['edge' + i] = new makerjs.paths.Line(p1, p2);
            }
            return m;
        };

        const hasLeftPost = (leftPostOpt === 'yes' || leftPostOpt === 'corner');
        const isLeftCorner = (leftPostOpt === 'corner');
        const hasRightPost = (rightPostOpt === 'yes' || rightPostOpt === 'corner');
        const isRightCorner = (rightPostOpt === 'corner');

        // Determine post positions
        const posts = [];
        if (hasLeftPost) {
            posts.push({ type: 'left', startX: isLeftCorner ? -postW : 0, endX: isLeftCorner ? 0 : postW, center: isLeftCorner ? -postW / 2 : postW / 2 });
        }

        const isExecutive = (style === 'executive' || style === 'executive_custom');

        // Mid posts coordinates
        const midPosts = [];
        const resolvedCenters = resolveMidPostCenters(length, leftPostOpt, rightPostOpt, midPostsOpt, midPostCount, postW, customSpacings, style, extra6, panelType, deltaLeft, deltaRight);

        resolvedCenters.forEach((midCx, idx) => {
            const midPx = midCx - postW / 2;
            midPosts.push({ type: 'mid', startX: midPx, endX: midPx + postW, center: midCx });
            posts.push({ type: 'mid', startX: midPx, endX: midPx + postW, center: midCx });
        });

        if (hasRightPost) {
            posts.push({ type: 'right', startX: isRightCorner ? length : length - postW, endX: isRightCorner ? length + postW : length, center: isRightCorner ? length + postW / 2 : length - postW / 2 });
        }

        // --- DRAW POSTS ---
        
        // 1. Left Post
        if (hasLeftPost) {
            const leftPost = { models: {}, paths: {} };
            // Mitered top corner: outer face runs to postHeight, inner face runs to postHeight - topRailH
            const outerPts = isLeftCorner
                ? [[0, 0], [-postW, 0], [-postW, postHeight], [0, postHeight - topRailH]]
                : [[0, 0], [postW, 0], [postW, postHeight - topRailH], [0, postHeight]];
            leftPost.models.outer = createPolygonModel(outerPts);

            if (postType === 'hss_rect' && postW > 2 * postT && postHeight > topRailH + 2 * postT) {
                const innerPts = isLeftCorner
                    ? [[-postT, postT], [-postW + postT, postT], [-postW + postT, postHeight - postT], [-postT, postHeight - topRailH + postT]]
                    : [[postT, postT], [postW - postT, postT], [postW - postT, postHeight - topRailH + postT], [postT, postHeight - postT]];
                leftPost.models.inner = createPolygonModel(innerPts);
            }
            if (extraFlatBar === 'yes') {
                const yStart = botRailY + botRailH;
                const yEnd = (midRailType !== 'none') ? (postHeight - topRailH - midRailGap - midRailH) : (postHeight - topRailH);
                const mOpeningH = yEnd - yStart;
                const fbW = 1.0;
                leftPost.models.extraFlatBar = {
                    paths: {
                        line1: new makerjs.paths.Line([-fbW, 0], [0, 0]),
                        line2: new makerjs.paths.Line([0, 0], [0, mOpeningH]),
                        line3: new makerjs.paths.Line([0, mOpeningH], [-fbW, mOpeningH]),
                        line4: new makerjs.paths.Line([-fbW, mOpeningH], [-fbW, 0])
                    },
                    origin: [isLeftCorner ? -postW : 0, yStart]
                };
            }
            leftPost.origin = [0, 0];
            model.models.posts.models['leftPost'] = leftPost;

            if (includeBasePlates === 'yes') {
                const bp = {
                    models: { outer: new makerjs.models.Rectangle(bpW, bpH) },
                    paths: {
                        h1: new makerjs.paths.Circle([bpHoleOffsetX, bpHoleOffsetY], bpHoleD / 2),
                        h2: new makerjs.paths.Circle([bpW - bpHoleOffsetX, bpHoleOffsetY], bpHoleD / 2)
                    }
                };
                bp.origin = [isLeftCorner ? -postW / 2 - bpW / 2 : postW / 2 - bpW / 2, -bpH];
                model.models.basePlates.models['bpLeft'] = bp;
            }
        }

        // 2. Right Post
        if (hasRightPost) {
            const rightPost = { models: {}, paths: {} };
            // Mitered top corner: outer face runs to miter point, inner face miter cut
            rightPost.models.outer = createPolygonModel([[0, 0], [postW, 0], [postW, postHeight], [0, postHeight - topRailH]]);

            if (postType === 'hss_rect' && postW > 2 * postT && postHeight > topRailH + 2 * postT) {
                rightPost.models.inner = createPolygonModel([[postT, postT], [postW - postT, postT], [postW - postT, postHeight - postT], [postT, postHeight - topRailH + postT]]);
            }
            if (extraFlatBar === 'yes') {
                const yStart = botRailY + botRailH;
                const yEnd = (midRailType !== 'none') ? (postHeight - topRailH - midRailGap - midRailH) : (postHeight - topRailH);
                const mOpeningH = yEnd - yStart;
                const fbW = 1.0;
                rightPost.models.extraFlatBar = {
                    paths: {
                        line1: new makerjs.paths.Line([postW, 0], [postW + fbW, 0]),
                        line2: new makerjs.paths.Line([postW + fbW, 0], [postW + fbW, mOpeningH]),
                        line3: new makerjs.paths.Line([postW + fbW, mOpeningH], [postW, mOpeningH]),
                        line4: new makerjs.paths.Line([postW, mOpeningH], [postW, 0])
                    },
                    origin: [0, yStart]
                };
            }
            rightPost.origin = [isRightCorner ? length : length - postW, 0];
            model.models.posts.models['rightPost'] = rightPost;

            if (includeBasePlates === 'yes') {
                const bp = {
                    models: { outer: new makerjs.models.Rectangle(bpW, bpH) },
                    paths: {
                        h1: new makerjs.paths.Circle([bpHoleOffsetX, bpHoleOffsetY], bpHoleD / 2),
                        h2: new makerjs.paths.Circle([bpW - bpHoleOffsetX, bpHoleOffsetY], bpHoleD / 2)
                    }
                };
                bp.origin = [isRightCorner ? length + postW / 2 - bpW / 2 : length - postW / 2 - bpW / 2, -bpH];
                model.models.basePlates.models['bpRight'] = bp;
            }
        }

        // 3. Mid Posts
        midPosts.forEach((mp, idx) => {
            const midPost = { models: {}, paths: {} };
            const mpHeight = style === 'executive' ? 44.25 : (postHeight - topRailH);

            midPost.models.outer = new makerjs.models.Rectangle(postW, mpHeight);
            if (postType === 'hss_rect' && postW > 2 * postT && mpHeight > 2 * postT) {
                midPost.models.inner = new makerjs.models.Rectangle(postW - 2 * postT, mpHeight - 2 * postT);
                midPost.models.inner.origin = [postT, postT];
            }
            midPost.origin = [mp.startX, 0];
            model.models.posts.models['midPost_' + idx] = midPost;

            if (includeBasePlates === 'yes') {
                const bp = {
                    models: { outer: new makerjs.models.Rectangle(bpW, bpH) },
                    paths: {
                        h1: new makerjs.paths.Circle([bpHoleOffsetX, bpHoleOffsetY], bpHoleD / 2),
                        h2: new makerjs.paths.Circle([bpW - bpHoleOffsetX, bpHoleOffsetY], bpHoleD / 2)
                    }
                };
                bp.origin = [mp.center - bpW / 2, -bpH];
                model.models.basePlates.models['bpMid_' + idx] = bp;
            }
        });

        // --- DRAW RAILS ---

        // Helper to draw split rail segment
        const drawSplitRailSegment = (xStart, xEnd, railH, railY, railType, railT, name) => {
            const segment = { models: {}, paths: {} };
            const w = xEnd - xStart;
            if (w <= 0.01) return;

            segment.models.outer = new makerjs.models.Rectangle(w, railH);
            if (railType === 'hss_rect' && railH > 2 * railT) {
                segment.models.inner = new makerjs.models.Rectangle(w, railH - 2 * railT);
                segment.models.inner.origin = [0, railT];
            }
            segment.origin = [xStart, railY];
            model.models.rails.models[name] = segment;
        };

        // Top Rail drawing
        if (topRailType !== 'none') {
            const topRail = { models: {}, paths: {} };
            // Mitered corners: outer edge extends to full length at top, cut at 45 degrees where posts are present
            const trOuterPts = [
                [isLeftCorner ? -postW : 0, topRailH],
                [hasLeftPost && !isLeftCorner ? postW : 0, 0],
                [hasRightPost && !isRightCorner ? length - postW : length, 0],
                [isRightCorner ? length + postW : length, topRailH]
            ];
            topRail.models.outer = createPolygonModel(trOuterPts);

            if (topRailType === 'hss_rect' && topRailH > 2 * topRailT) {
                const trInnerPts = [
                    [isLeftCorner ? -postW + topRailT : topRailT, topRailH - topRailT],
                    [hasLeftPost && !isLeftCorner ? postW - topRailT : topRailT, topRailT],
                    [hasRightPost && !isRightCorner ? length - postW + topRailT : length - topRailT, topRailT],
                    [isRightCorner ? length + postW - topRailT : length - topRailT, topRailH - topRailT]
                ];
                topRail.models.inner = createPolygonModel(trInnerPts);
            }

            // Add clear miter joint lines (welds) at left/right end posts
            if (hasLeftPost) {
                topRail.paths.leftMiter = new makerjs.paths.Line(
                    [isLeftCorner ? -postW : 0, topRailH],
                    [isLeftCorner ? 0 : postW, 0]
                );
            }
            if (hasRightPost) {
                topRail.paths.rightMiter = new makerjs.paths.Line(
                    [isRightCorner ? length + postW : length, topRailH],
                    [isRightCorner ? length : length - postW, 0]
                );
            }



            topRail.origin = [0, postHeight - topRailH];
            model.models.rails.models['topRail'] = topRail;
        }

        // Bottom Rail (always split by posts)
        if (botRailType !== 'none') {
            const spanRanges = [];
            let currentL = (leftPostOpt === 'yes') ? postW : 0;

            midPosts.forEach(mp => {
                spanRanges.push({ start: currentL, end: mp.startX });
                currentL = mp.endX;
            });
            spanRanges.push({ start: currentL, end: (rightPostOpt === 'yes') ? (length - postW) : length });

            spanRanges.forEach((range, idx) => {
                drawSplitRailSegment(range.start, range.end, botRailH, botRailY, botRailType, botRailT, 'botRail_' + idx);
            });
        }

        // Mid Rail (split by posts, if active)
        if (midRailType !== 'none') {
            const spanRanges = [];
            let currentL = (leftPostOpt === 'yes') ? postW : 0;

            midPosts.forEach(mp => {
                spanRanges.push({ start: currentL, end: mp.startX });
                currentL = mp.endX;
            });
            spanRanges.push({ start: currentL, end: (rightPostOpt === 'yes') ? (length - postW) : length });

            const midRailY = postHeight - topRailH - midRailGap - midRailH;

            spanRanges.forEach((range, idx) => {
                drawSplitRailSegment(range.start, range.end, midRailH, midRailY, midRailType, midRailT, 'midRail_' + idx);
            });
        }

        const isMeshStyle = (style === 'urban_balcony' || style === 'villa_balcony' || style === 'urban_custom' || style === 'villa_custom');
        if (isMeshStyle) {
            model.models.meshes = { models: {} };
            const spanRanges = [];
            let currentL = (leftPostOpt === 'yes') ? postW : 0;

            midPosts.forEach(mp => {
                spanRanges.push({ start: currentL, end: mp.startX });
                currentL = mp.endX;
            });
            spanRanges.push({ start: currentL, end: (rightPostOpt === 'yes') ? (length - postW) : length });

            spanRanges.forEach((range, idx) => {
                const mOpeningW = range.end - range.start;
                const yStart = botRailY + botRailH;
                const yEnd = (midRailType !== 'none') ? (postHeight - topRailH - midRailGap - midRailH) : (postHeight - topRailH);
                const mOpeningH = yEnd - yStart;

                if (mOpeningW > 0 && mOpeningH > 0) {
                    const fbW = 1.0;
                    const frameModels = {};
                    const needLeftFB = (idx > 0) || hasLeftPost;
                    if (needLeftFB) {
                        frameModels.leftFB = {
                            paths: {
                                line1: new makerjs.paths.Line([0, fbW], [fbW, fbW]),
                                line2: new makerjs.paths.Line([fbW, fbW], [fbW, mOpeningH - fbW]),
                                line3: new makerjs.paths.Line([fbW, mOpeningH - fbW], [0, mOpeningH - fbW]),
                                line4: new makerjs.paths.Line([0, mOpeningH - fbW], [0, fbW])
                            }
                        };
                    }
                    const needRightFB = (idx < spanRanges.length - 1) || hasRightPost;
                    if (needRightFB) {
                        frameModels.rightFB = {
                            paths: {
                                line1: new makerjs.paths.Line([mOpeningW - fbW, fbW], [mOpeningW, fbW]),
                                line2: new makerjs.paths.Line([mOpeningW, fbW], [mOpeningW, mOpeningH - fbW]),
                                line3: new makerjs.paths.Line([mOpeningW, mOpeningH - fbW], [mOpeningW - fbW, mOpeningH - fbW]),
                                line4: new makerjs.paths.Line([mOpeningW - fbW, mOpeningH - fbW], [mOpeningW - fbW, fbW])
                            }
                        };
                    }
                    frameModels.topFB = {
                        paths: {
                            line1: new makerjs.paths.Line([0, mOpeningH - fbW], [mOpeningW, mOpeningH - fbW]),
                            line2: new makerjs.paths.Line([mOpeningW, mOpeningH - fbW], [mOpeningW, mOpeningH]),
                            line3: new makerjs.paths.Line([mOpeningW, mOpeningH], [0, mOpeningH]),
                            line4: new makerjs.paths.Line([0, mOpeningH], [0, mOpeningH - fbW])
                        }
                    };
                    frameModels.botFB = {
                        paths: {
                            line1: new makerjs.paths.Line([0, 0], [mOpeningW, 0]),
                            line2: new makerjs.paths.Line([mOpeningW, 0], [mOpeningW, fbW]),
                            line3: new makerjs.paths.Line([mOpeningW, fbW], [0, fbW]),
                            line4: new makerjs.paths.Line([0, fbW], [0, 0])
                        }
                    };

                    const meshSpanModel = {
                        models: {
                            meshFrame: {
                                models: frameModels
                            },
                            meshPanel: { paths: {} }
                        }
                    };

                    const gridSpaceX = parseFloat(meshGridW) || 2.0;
                    const gridSpaceY = parseFloat(meshGridH) || 2.0;
                    const innerW = mOpeningW - 2 * fbW;
                    const innerH = mOpeningH - 2 * fbW;
                    const innerX = fbW;
                    const innerY = fbW;

                    // Centered mesh patch representation (neat AutoCAD style)
                    const patchW = innerW * 0.45;
                    const patchH = innerH * 0.45;
                    const patchX = innerX + (innerW - patchW) / 2;
                    const patchY = innerY + (innerH - patchH) / 2;

                    // Draw grid lines inside the patch
                    let gridIdx = 0;
                    for (let gx = patchX + gridSpaceX; gx < patchX + patchW; gx += gridSpaceX) {
                        meshSpanModel.models.meshPanel.paths['v' + gridIdx++] = new makerjs.paths.Line([gx, patchY], [gx, patchY + patchH]);
                    }
                    for (let gy = patchY + gridSpaceY; gy < patchY + patchH; gy += gridSpaceY) {
                        meshSpanModel.models.meshPanel.paths['h' + gridIdx++] = new makerjs.paths.Line([patchX, gy], [patchX + patchW, gy]);
                    }

                    // Draw wavy/scalloped border paths around the patch
                    const waveLen = 1.5;
                    const numWavesX = Math.max(3, Math.round(patchW / waveLen));
                    const numWavesY = Math.max(3, Math.round(patchH / waveLen));

                    const addWavyBorder = (model, prefix, p1, p2, N) => {
                        const [x1, y1] = p1;
                        const [x2, y2] = p2;
                        const dx = x2 - x1;
                        const dy = y2 - y1;
                        const len = Math.hypot(dx, dy);
                        if (len <= 0.01) return;
                        const r = (len / N) / 2;
                        const segAngle = Math.atan2(dy, dx) * 180 / Math.PI;
                        for (let i = 0; i < N; i++) {
                            const sx = x1 + (i / N) * dx;
                            const sy = y1 + (i / N) * dy;
                            const ex = x1 + ((i + 1) / N) * dx;
                            const ey = y1 + ((i + 1) / N) * dy;
                            const cx = (sx + ex) / 2;
                            const cy = (sy + ey) / 2;
                            model.paths[prefix + '_' + i] = new makerjs.paths.Arc([cx, cy], r, segAngle, segAngle + 180);
                        }
                    };

                    const drawCornerMeshPatch = (model, corner, mOpeningW, mOpeningH, gridSpaceX, gridSpaceY) => {
                        const fbW = 1.0;
                        const size = 5.0; // 5 inches corner patch
                        const cornerModel = { paths: {} };
                        
                        const minX = fbW;
                        const maxX = mOpeningW - fbW;
                        const minY = fbW;
                        const maxY = mOpeningH - fbW;
                        
                        let borderStart, borderEnd;
                        if (corner === 'BL') {
                            borderStart = [minX, minY + size];
                            borderEnd = [minX + size, minY];
                        } else if (corner === 'TL') {
                            borderStart = [minX + size, maxY];
                            borderEnd = [minX, maxY - size];
                        } else if (corner === 'BR') {
                            borderStart = [maxX - size, minY];
                            borderEnd = [maxX, minY + size];
                        } else if (corner === 'TR') {
                            borderStart = [maxX, maxY - size];
                            borderEnd = [maxX - size, maxY];
                        }
                        
                        addWavyBorder(cornerModel, 'border', borderStart, borderEnd, 3);
                        
                        let idx = 0;
                        if (corner === 'BL') {
                            for (let gx = minX + gridSpaceX; gx < minX + size; gx += gridSpaceX) {
                                cornerModel.paths['v' + idx++] = new makerjs.paths.Line([gx, minY], [gx, minY + (size - (gx - minX))]);
                            }
                            for (let gy = minY + gridSpaceY; gy < minY + size; gy += gridSpaceY) {
                                cornerModel.paths['h' + idx++] = new makerjs.paths.Line([minX, gy], [minX + (size - (gy - minY)), gy]);
                            }
                        } else if (corner === 'TL') {
                            for (let gx = minX + gridSpaceX; gx < minX + size; gx += gridSpaceX) {
                                cornerModel.paths['v' + idx++] = new makerjs.paths.Line([gx, maxY], [gx, maxY - (size - (gx - minX))]);
                            }
                            for (let gy = gridSpaceY; gy < size; gy += gridSpaceY) {
                                cornerModel.paths['h' + idx++] = new makerjs.paths.Line([minX, maxY - gy], [minX + (size - gy), maxY - gy]);
                            }
                        } else if (corner === 'BR') {
                            for (let gx = maxX - size + gridSpaceX; gx < maxX; gx += gridSpaceX) {
                                const dx = gx - (maxX - size);
                                cornerModel.paths['v' + idx++] = new makerjs.paths.Line([gx, minY], [gx, minY + dx]);
                            }
                            for (let gy = minY + gridSpaceY; gy < minY + size; gy += gridSpaceY) {
                                cornerModel.paths['h' + idx++] = new makerjs.paths.Line([maxX - (size - (gy - minY)), gy], [maxX, gy]);
                            }
                        } else if (corner === 'TR') {
                            for (let gx = maxX - size + gridSpaceX; gx < maxX; gx += gridSpaceX) {
                                const dx = gx - (maxX - size);
                                cornerModel.paths['v' + idx++] = new makerjs.paths.Line([gx, maxY], [gx, maxY - dx]);
                            }
                            for (let gy = gridSpaceY; gy < size; gy += gridSpaceY) {
                                cornerModel.paths['h' + idx++] = new makerjs.paths.Line([maxX - (size - gy), maxY - gy], [maxX, maxY - gy]);
                            }
                        }
                        
                        if (!model.models) {
                            model.models = {};
                        }
                        model.models['corner_' + corner] = cornerModel;
                    };

                    // Top: left to right
                    addWavyBorder(meshSpanModel.models.meshPanel, 'wave_top', [patchX, patchY + patchH], [patchX + patchW, patchY + patchH], numWavesX);
                    // Right: top to bottom
                    addWavyBorder(meshSpanModel.models.meshPanel, 'wave_right', [patchX + patchW, patchY + patchH], [patchX + patchW, patchY], numWavesY);
                    // Bottom: right to left
                    addWavyBorder(meshSpanModel.models.meshPanel, 'wave_bot', [patchX + patchW, patchY], [patchX, patchY], numWavesX);
                    // Left: bottom to top
                    addWavyBorder(meshSpanModel.models.meshPanel, 'wave_left', [patchX, patchY], [patchX, patchY + patchH], numWavesY);

                    const isLeftLoose = (idx === 0 && leftPostOpt !== 'yes' && leftPostOpt !== 'corner');
                    const isRightLoose = (idx === spanRanges.length - 1 && rightPostOpt !== 'yes' && rightPostOpt !== 'corner');

                    if (isLeftLoose) {
                        drawCornerMeshPatch(meshSpanModel.models.meshPanel, 'BL', mOpeningW, mOpeningH, gridSpaceX, gridSpaceY);
                        drawCornerMeshPatch(meshSpanModel.models.meshPanel, 'TL', mOpeningW, mOpeningH, gridSpaceX, gridSpaceY);
                    }

                    if (isRightLoose) {
                        drawCornerMeshPatch(meshSpanModel.models.meshPanel, 'BR', mOpeningW, mOpeningH, gridSpaceX, gridSpaceY);
                        drawCornerMeshPatch(meshSpanModel.models.meshPanel, 'TR', mOpeningW, mOpeningH, gridSpaceX, gridSpaceY);
                    }

                    meshSpanModel.origin = [range.start, yStart];
                    model.models.meshes.models['span_' + idx] = meshSpanModel;
                }
            });
        }

        // --- DRAW PICKETS ---
        if (picketType !== 'none' && picketSpacing > 0) {
            const leftPostW = (leftPostOpt === 'yes') ? postW : 0;
            const rightPostW = (rightPostOpt === 'yes') ? postW : 0;
            
            const pPositions = getPicketPositions(
                style,
                length,
                leftPostW,
                rightPostW,
                picketW,
                picketSpacing,
                midPostCount,
                postW,
                midPostsOpt,
                customSpacings,
                extra6,
                panelType,
                deltaLeft,
                deltaRight
            );

            if (pPositions && pPositions.length > 0) {
                const yStart = botRailY + botRailH;
                const yEnd = (midRailType !== 'none') ? (postHeight - topRailH - midRailGap - midRailH) : (postHeight - topRailH);
                const picketHeight = yEnd - yStart;

                pPositions.forEach((px, picketIndex) => {
                    const picket = { models: {} };
                    picket.models.outer = new makerjs.models.Rectangle(picketW, picketHeight);
                    if (picketType === 'hss_rect' && picketW > 2 * picketT && picketHeight > 2 * picketT) {
                        picket.models.inner = new makerjs.models.Rectangle(picketW - 2 * picketT, picketHeight - 2 * picketT);
                        picket.models.inner.origin = [picketT, picketT];
                    }
                    picket.origin = [px, yStart];
                    model.models.pickets.models['p_' + picketIndex] = picket;
                });
            }
        }

        if (isMeshStyle) {
            const isLeftLoose = (leftPostOpt !== 'yes' && leftPostOpt !== 'corner');
            if (isLeftLoose) {
                if (!model.paths) {
                    model.paths = {};
                }
                model.paths.leftLooseEndLine_wwm = new makerjs.paths.Line([0, botRailY], [0, postHeight]);
            }
            const isRightLoose = (rightPostOpt !== 'yes' && rightPostOpt !== 'corner');
            if (isRightLoose) {
                if (!model.paths) {
                    model.paths = {};
                }
                model.paths.rightLooseEndLine_wwm = new makerjs.paths.Line([length, botRailY], [length, postHeight]);
            }
        }

        return model;
    },

    _fallback_rail_catalog: function(
        length,
        style,
        leftPostOpt,
        rightPostOpt,
        midPostsOpt,
        midPostCount,
        fenceHeight,
        postHeight,
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
        includeBasePlates = 'no',
        bpW = 6.0,
        bpL = 6.0,
        bpH = 0.5,
        bpHoleD = 0.5,
        bpHoleOffsetX = 0.5,
        bpHoleOffsetY = 0.25,
        customSpacings = null
    ) {
        if (style === 'executive') {
            fenceHeight = 41.0;
            postHeight = 45.75;
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
        } else if (style === 'urban_balcony') {
            fenceHeight = 41.0;
            postHeight = 45.75;
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
            picketSpacing = 0;
        } else if (style === 'villa_balcony') {
            fenceHeight = 41.0;
            postHeight = 45.75;
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
            picketSpacing = 0;
        } else if (style === 'urban_custom' || style === 'villa_custom') {
            picketType = 'none';
            picketSpacing = 0;
        }

        const s = 4; // Scale factor for fallback drawing
        const L = length * s;
        const PH = postHeight * s;
        const FH = fenceHeight * s;
        const botRailY_scaled = PH - FH;
        const postW_scaled = postW * s;
        const topRailH_scaled = topRailH * s;
        const botRailH_scaled = botRailH * s;
        const midRailH_scaled = midRailH * s;
        const midRailGap_scaled = midRailGap * s;
        const picketW_scaled = picketW * s;
        const picketSpacing_scaled = picketSpacing * s;
        
        let postsHtml = "";
        let basePlatesHtml = "";
        let railsHtml = "";
        let picketsHtml = "";
        
        // Define SVG height
        const groundY = PH + 50; 
        const strokeColor = "#00d4ff";

        // Helpers
        const makePoly = (pts, color, width, isDash = false) => {
            const pointsStr = pts.map(p => `${p[0]},${groundY - p[1]}`).join(" ");
            return `<polygon points="${pointsStr}" fill="none" stroke="${color}" stroke-width="${width}" ${isDash ? 'stroke-dasharray="2" opacity="0.6"' : ''}/>`;
        };

        const makeRect = (x, y, w, h, color, width, isDash = false) => {
            return `<rect x="${x}" y="${groundY - y - h}" width="${w}" height="${h}" fill="none" stroke="${color}" stroke-width="${width}" ${isDash ? 'class="hss-inner-line" stroke-dasharray="2" opacity="0.6"' : ''}/>`;
        };

        const makeLine = (x1, y1, x2, y2, color, width, isDash = false) => {
            return `<line x1="${x1}" y1="${groundY - y1}" x2="${x2}" y2="${groundY - y2}" stroke="${color}" stroke-width="${width}" ${isDash ? 'stroke-dasharray="2" opacity="0.6"' : ''}/>`;
        };

        const makeCircle = (cx, cy, r, color, width) => {
            return `<circle cx="${cx}" cy="${groundY - cy}" r="${r}" fill="none" stroke="${color}" stroke-width="${width}"/>`;
        };

        const isExecutive = (style === 'executive' || style === 'executive_custom');

        // Mid posts list
        const midPosts = [];
        if (midPostsOpt !== 'none' && midPostCount > 0) {
            const resolvedCenters = resolveMidPostCenters(
                length,
                leftPostOpt,
                rightPostOpt,
                midPostsOpt,
                midPostCount,
                postW,
                customSpacings,
                style,
                extra6,
                panelType,
                deltaLeft,
                deltaRight
            );
            resolvedCenters.forEach(cx => {
                const cx_scaled = cx * s;
                midPosts.push({
                    startX: cx_scaled - postW_scaled / 2,
                    endX: cx_scaled + postW_scaled / 2,
                    center: cx_scaled
                });
            });
        }

        // --- DRAW POSTS ---
        if (leftPostOpt === 'yes' || leftPostOpt === 'corner') {
            const isLeftCorner = (leftPostOpt === 'corner');
            const outer = isLeftCorner
                ? [[0, 0], [-postW_scaled, 0], [-postW_scaled, PH], [0, PH - topRailH_scaled]]
                : [[0, 0], [postW_scaled, 0], [postW_scaled, PH - topRailH_scaled], [0, PH]];
            postsHtml += makePoly(outer, strokeColor, 2);
            if (postType === 'hss_rect' && postW > 2 * postT) {
                const pt = postT * s;
                const inner = isLeftCorner
                    ? [[-pt, pt], [-postW_scaled + pt, pt], [-postW_scaled + pt, PH - pt], [-pt, PH - topRailH_scaled + pt]]
                    : [[pt, pt], [postW_scaled - pt, pt], [postW_scaled - pt, PH - topRailH_scaled + pt], [pt, PH - pt]];
                postsHtml += makePoly(inner, strokeColor, 0.5, true);
            }

            if (includeBasePlates === 'yes') {
                const bpW_scaled = bpW * s;
                const bpH_scaled = bpH * s;
                const bx = isLeftCorner
                    ? -postW_scaled / 2 - bpW_scaled / 2
                    : postW_scaled / 2 - bpW_scaled / 2;
                basePlatesHtml += makeRect(bx, -bpH_scaled, bpW_scaled, bpH_scaled, strokeColor, 2);
                basePlatesHtml += makeCircle(bx + bpHoleOffsetX * s, -bpHoleOffsetY * s, (bpHoleD / 2) * s, strokeColor, 1);
                basePlatesHtml += makeCircle(bx + bpW_scaled - bpHoleOffsetX * s, -bpHoleOffsetY * s, (bpHoleD / 2) * s, strokeColor, 1);
            }
        }

        if (rightPostOpt === 'yes' || rightPostOpt === 'corner') {
            const isRightCorner = (rightPostOpt === 'corner');
            const outer = isRightCorner
                ? [[L, 0], [L + postW_scaled, 0], [L + postW_scaled, PH], [L, PH - topRailH_scaled]]
                : [[L - postW_scaled, 0], [L, 0], [L, PH], [L - postW_scaled, PH - topRailH_scaled]];
            postsHtml += makePoly(outer, strokeColor, 2);
            if (postType === 'hss_rect' && postW > 2 * postT) {
                const pt = postT * s;
                const inner = isRightCorner
                    ? [[L + pt, pt], [L + postW_scaled - pt, pt], [L + postW_scaled - pt, PH - pt], [L + pt, PH - topRailH_scaled + pt]]
                    : [[L - postW_scaled + pt, pt], [L - pt, pt], [L - pt, PH - pt], [L - postW_scaled + pt, PH - topRailH_scaled + pt]];
                postsHtml += makePoly(inner, strokeColor, 0.5, true);
            }

            if (includeBasePlates === 'yes') {
                const bpW_scaled = bpW * s;
                const bpH_scaled = bpH * s;
                const bx = isRightCorner
                    ? L + postW_scaled / 2 - bpW_scaled / 2
                    : L - postW_scaled / 2 - bpW_scaled / 2;
                basePlatesHtml += makeRect(bx, -bpH_scaled, bpW_scaled, bpH_scaled, strokeColor, 2);
                basePlatesHtml += makeCircle(bx + bpHoleOffsetX * s, -bpHoleOffsetY * s, (bpHoleD / 2) * s, strokeColor, 1);
                basePlatesHtml += makeCircle(bx + bpW_scaled - bpHoleOffsetX * s, -bpHoleOffsetY * s, (bpHoleD / 2) * s, strokeColor, 1);
            }
        }

        midPosts.forEach(mp => {
            const mpH = style === 'executive' ? 44.25 * s : (PH - topRailH_scaled);
            postsHtml += makeRect(mp.startX, 0, postW_scaled, mpH, strokeColor, 2);
            if (postType === 'hss_rect' && postW > 2 * postT) {
                const pt = postT * s;
                postsHtml += makeRect(mp.startX + pt, pt, postW_scaled - 2 * pt, mpH - 2 * pt, strokeColor, 0.5, true);
            }

            if (includeBasePlates === 'yes') {
                const bpW_scaled = bpW * s;
                const bpH_scaled = bpH * s;
                const bx = mp.center - bpW_scaled / 2;
                basePlatesHtml += makeRect(bx, -bpH_scaled, bpW_scaled, bpH_scaled, strokeColor, 2);
                basePlatesHtml += makeCircle(bx + bpHoleOffsetX * s, -bpHoleOffsetY * s, (bpHoleD / 2) * s, strokeColor, 1);
                basePlatesHtml += makeCircle(bx + bpW_scaled - bpHoleOffsetX * s, -bpHoleOffsetY * s, (bpHoleD / 2) * s, strokeColor, 1);
            }
        });

        // --- DRAW RAILS ---

        // Top Rail
        if (topRailType !== 'none') {
            const isLeftCorner = (leftPostOpt === 'corner');
            const isRightCorner = (rightPostOpt === 'corner');
            const trOuter = [
                [isLeftCorner ? -postW_scaled : 0, PH],
                [leftPostOpt === 'yes' ? postW_scaled : 0, PH - topRailH_scaled],
                [rightPostOpt === 'yes' ? (L - postW_scaled) : L, PH - topRailH_scaled],
                [isRightCorner ? L + postW_scaled : L, PH]
            ];
            railsHtml += makePoly(trOuter, strokeColor, 2);

            if (topRailType === 'hss_rect' && topRailH > 2 * topRailT) {
                const pt = topRailT * s;
                const trInner = [
                    [isLeftCorner ? -postW_scaled + pt : pt, PH - pt],
                    [leftPostOpt === 'yes' ? postW_scaled - pt : pt, PH - topRailH_scaled + pt],
                    [rightPostOpt === 'yes' ? (L - postW_scaled + pt) : (L - pt), PH - topRailH_scaled + pt],
                    [isRightCorner ? L + postW_scaled - pt : L - pt, PH - pt]
                ];
                railsHtml += makePoly(trInner, strokeColor, 0.5, true);
            }

            // Miters
            if (leftPostOpt === 'yes' || leftPostOpt === 'corner') {
                const isLeftCornerMiter = (leftPostOpt === 'corner');
                if (isLeftCornerMiter) {
                    railsHtml += makeLine(0, PH - topRailH_scaled, -postW_scaled, PH, strokeColor, 1);
                } else {
                    railsHtml += makeLine(0, PH, postW_scaled, PH - topRailH_scaled, strokeColor, 1);
                }
            }
            if (rightPostOpt === 'yes' || rightPostOpt === 'corner') {
                const isRightCornerMiter = (rightPostOpt === 'corner');
                if (isRightCornerMiter) {
                    railsHtml += makeLine(L, PH - topRailH_scaled, L + postW_scaled, PH, strokeColor, 1);
                } else {
                    railsHtml += makeLine(L, PH, L - postW_scaled, PH - topRailH_scaled, strokeColor, 1);
                }
            }
        }

        // Bottom Rail segments
        if (botRailType !== 'none') {
            const spanRanges = [];
            let currentL = (leftPostOpt === 'yes') ? postW_scaled : (leftPostOpt === 'corner_none' ? -postW_scaled : 0);

            midPosts.forEach(mp => {
                spanRanges.push({ start: currentL, end: mp.startX });
                currentL = mp.endX;
            });
            spanRanges.push({ start: currentL, end: (rightPostOpt === 'yes') ? (L - postW_scaled) : (rightPostOpt === 'corner_none' ? L + postW_scaled : L) });

            spanRanges.forEach(range => {
                const w = range.end - range.start;
                if (w > 0.1) {
                    railsHtml += makeRect(range.start, botRailY_scaled, w, botRailH_scaled, strokeColor, 2);
                    if (botRailType === 'hss_rect' && botRailH > 2 * botRailT) {
                        const pt = botRailT * s;
                        railsHtml += makeRect(range.start, botRailY_scaled + pt, w, botRailH_scaled - 2 * pt, strokeColor, 0.5, true);
                    }
                }
            });
        }

        // Mid Rail segments
        if (midRailType !== 'none') {
            const spanRanges = [];
            let currentL = (leftPostOpt === 'yes') ? postW_scaled : (leftPostOpt === 'corner_none' ? -postW_scaled : 0);

            midPosts.forEach(mp => {
                spanRanges.push({ start: currentL, end: mp.startX });
                currentL = mp.endX;
            });
            spanRanges.push({ start: currentL, end: (rightPostOpt === 'yes') ? (L - postW_scaled) : (rightPostOpt === 'corner_none' ? L + postW_scaled : L) });

            const midRailY_scaled = PH - topRailH_scaled - midRailGap_scaled - midRailH_scaled;

            spanRanges.forEach(range => {
                const w = range.end - range.start;
                if (w > 0.1) {
                    railsHtml += makeRect(range.start, midRailY_scaled, w, midRailH_scaled, strokeColor, 2);
                    if (midRailType === 'hss_rect' && midRailH > 2 * midRailT) {
                        const pt = midRailT * s;
                        railsHtml += makeRect(range.start, midRailY_scaled + pt, w, midRailH_scaled - 2 * pt, strokeColor, 0.5, true);
                    }
                }
            });
        }

        const isMeshStyle = (style === 'urban_balcony' || style === 'villa_balcony' || style === 'urban_custom' || style === 'villa_custom');
        if (isMeshStyle) {
            const spanRanges = [];
            let currentL = (leftPostOpt === 'yes') ? postW_scaled : 0;

            midPosts.forEach(mp => {
                spanRanges.push({ start: currentL, end: mp.startX });
                currentL = mp.endX;
            });
            spanRanges.push({ start: currentL, end: (rightPostOpt === 'yes') ? (L - postW_scaled) : L });

            spanRanges.forEach(range => {
                const mOpeningW = range.end - range.start;
                const yStart = botRailY_scaled + botRailH_scaled;
                const yEnd = (midRailType !== 'none') ? (PH - topRailH_scaled - midRailGap_scaled - midRailH_scaled) : (PH - topRailH_scaled);
                const mOpeningH = yEnd - yStart;

                if (mOpeningW > 0.1 && mOpeningH > 0.1) {
                    const fbW = 1.0 * s;
                    // Draw outer border flat bar frame: miter lines
                    railsHtml += makeRect(range.start, yStart, mOpeningW, mOpeningH, strokeColor, 1.5);
                    railsHtml += makeRect(range.start + fbW, yStart + fbW, mOpeningW - 2 * fbW, mOpeningH - 2 * fbW, strokeColor, 0.5);
                    
                    // Draw miter lines at corners in fallback
                    railsHtml += makeLine(range.start, yStart, range.start + fbW, yStart + fbW, strokeColor, 0.5);
                    railsHtml += makeLine(range.end, yStart, range.end - fbW, yStart + fbW, strokeColor, 0.5);
                    railsHtml += makeLine(range.start, yStart + mOpeningH, range.start + fbW, yStart + mOpeningH - fbW, strokeColor, 0.5);
                    railsHtml += makeLine(range.end, yStart + mOpeningH, range.end - fbW, yStart + mOpeningH - fbW, strokeColor, 0.5);

                    // Draw grid mesh lines inside the inner opening
                    const gridSpace = 2.0 * s;
                    const innerW = mOpeningW - 2 * fbW;
                    const innerH = mOpeningH - 2 * fbW;
                    const innerX = range.start + fbW;
                    const innerY = yStart + fbW;

                    // Vertical mesh lines
                    for (let gx = innerX + gridSpace; gx < innerX + innerW; gx += gridSpace) {
                        picketsHtml += makeLine(gx, innerY, gx, innerY + innerH, strokeColor, 0.5);
                    }
                    // Horizontal mesh lines
                    for (let gy = innerY + gridSpace; gy < innerY + innerH; gy += gridSpace) {
                        picketsHtml += makeLine(innerX, gy, innerX + innerW, gy, strokeColor, 0.5);
                    }
                }
            });
        }

        // --- DRAW PICKETS ---
        if (picketType !== 'none' && picketSpacing > 0) {
            const spanRanges = [];
            let currentL = (leftPostOpt === 'yes') ? postW_scaled : 0;

            midPosts.forEach(mp => {
                spanRanges.push({ start: currentL, end: mp.startX });
                currentL = mp.endX;
            });
            spanRanges.push({ start: currentL, end: (rightPostOpt === 'yes') ? (L - postW_scaled) : L });

            spanRanges.forEach(range => {
                let leftPostCenter = range.start;
                if (range.start > 0) {
                    leftPostCenter = range.start - postW_scaled / 2;
                } else if (leftPostOpt === 'yes') {
                    leftPostCenter = postW_scaled / 2;
                } else if (leftPostOpt === 'corner' || leftPostOpt === 'corner_none') {
                    leftPostCenter = -postW_scaled / 2;
                }

                let rightPostCenter = range.end;
                if (range.end < L) {
                    rightPostCenter = range.end + postW_scaled / 2;
                } else if (rightPostOpt === 'yes') {
                    rightPostCenter = L - postW_scaled / 2;
                } else if (rightPostOpt === 'corner' || rightPostOpt === 'corner_none') {
                    rightPostCenter = L + postW_scaled / 2;
                }

                const isLeftPost = (range.start > 0) || (leftPostOpt === 'yes' || leftPostOpt === 'corner' || leftPostOpt === 'corner_none');
                const isRightPost = (range.end < L) || (rightPostOpt === 'yes' || rightPostOpt === 'corner' || rightPostOpt === 'corner_none');
                const alignToRight = (!isLeftPost && isRightPost);

                const spanCenterDist = rightPostCenter - leftPostCenter;
                const numPickets = Math.max(0, Math.floor(spanCenterDist / picketSpacing_scaled - 0.001));
                const actualSpacing = picketSpacing_scaled;

                if (numPickets > 0) {
                    const yStart = botRailY_scaled + botRailH_scaled;
                    const yEnd = (midRailType !== 'none') ? (PH - topRailH_scaled - midRailGap_scaled - midRailH_scaled) : (PH - topRailH_scaled);
                    const picketH_scaled = yEnd - yStart;

                    const firstPicketCenter = leftPostCenter + (spanCenterDist - (numPickets - 1) * actualSpacing) / 2;
                    for (let i = 1; i <= numPickets; i++) {
                        const px_center = firstPicketCenter + (i - 1) * actualSpacing;
                        const px = px_center - picketW_scaled / 2;
                        picketsHtml += makeRect(px, yStart, picketW_scaled, picketH_scaled, strokeColor, 1.5);
                        if (picketType === 'hss_rect' && picketW > 2 * picketT) {
                            const pt = picketT * s;
                            picketsHtml += makeRect(px + pt, yStart + pt, picketW_scaled - 2 * pt, picketH_scaled - 2 * pt, strokeColor, 0.5, true);
                        }
                    }
                }
            });
        }

        const totalW = L + 100;
        const totalH = groundY + 150;
        
        let html = `<svg viewBox="-50 -50 ${totalW} ${totalH}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">`;
        html += `<g>`;
        html += basePlatesHtml;
        html += postsHtml;
        html += railsHtml;
        html += picketsHtml;
        html += `</g></svg>`;
        return html;
    },
    getPanelModel: function(panel, style, forceCornerLeft, forceCornerRight, panelType = 'main') {
        if (!panel) return null;
        
        let leftPostVal = panel.leftPost || 'yes';
        let rightPostVal = panel.rightPost || 'yes';
        
        if (panelType === 'main') {
            if (forceCornerLeft) {
                leftPostVal = panel.leftPost === 'yes' ? 'yes' : 'corner_none';
            } else {
                leftPostVal = panel.leftPost === 'yes' ? 'yes' : 'none';
            }
            
            if (forceCornerRight) {
                rightPostVal = panel.rightPost === 'yes' ? 'yes' : 'corner_none';
            } else {
                rightPostVal = panel.rightPost === 'yes' ? 'yes' : 'none';
            }
        } else {
            if (forceCornerLeft) leftPostVal = 'corner';
            if (forceCornerRight) rightPostVal = 'corner';
        }
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
            includeBasePlates = panel.includeBasePlates || 'no';
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
            includeBasePlates = panel.includeBasePlates || 'no';
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
            picketSpacing = 0;
            includeBasePlates = panel.includeBasePlates || 'no';
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
            picketSpacing = 0;
            includeBasePlates = panel.includeBasePlates || 'no';
        } else if (style === 'urban_custom' || style === 'villa_custom') {
            picketType = 'none';
            picketSpacing = 0;
            includeBasePlates = panel.includeBasePlates || 'no';
            midRailType = (style === 'villa_custom') ? (panel.midRailType || 'hss_rect') : 'none';
        }
        if (style === 'classic_custom') {
            midRailType = 'none';
        }
        let currentLength = parseFloat(panel.length) || 120.0;
        if (panel.extra6) {
            currentLength += (panelType === 'main' ? 12.0 : 6.0);
        }

        const midPostCount = (panel.midPosts === 'default' || panel.midPosts === 'yes') 
            ? Math.max(0, Math.ceil(parseFloat(panel.length) / 48) - 1) 
            : ((panel.midPosts === 'custom' || panel.midPosts === 'custom_standard') ? (parseInt(panel.midPostCount) || 0) : 0);

        const vals = {
            length: currentLength,
            originalLength: parseFloat(panel.length) || 120.0,
            leftPost: leftPostVal,
            rightPost: rightPostVal,
            midPosts: panel.midPosts || 'none',
            midPostCount: midPostCount,
            postW: postW,
            midPostSpacings: panel.midPostSpacings || null,
            picketSpacing: picketSpacing,
            extra6: panel.extra6 || false,
            freeEnd4: panel.freeEnd4 || false
        };
        const ext = this.resolveFreeEndExtensions(vals, style, panelType);
        const deltaLeft = ext.deltaLeft;
        const deltaRight = ext.deltaRight;
        currentLength += (deltaLeft + deltaRight);

        return this.createRailCatalog(
            currentLength,
            style,
            leftPostVal,
            rightPostVal,
            panel.midPosts || 'none',
            midPostCount,
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
            bpHoleOffsetY,
            panel.midPostSpacings || null,
            panel.meshGridW !== undefined ? panel.meshGridW : 2.0,
            panel.meshGridH !== undefined ? panel.meshGridH : 2.0,
            panel.meshWireD !== undefined ? panel.meshWireD : 0.135,
            panel.extraFlatBar || 'no',
            panel.extra6 || false,
            panelType,
            panel.freeEnd4 || false,
            deltaLeft,
            deltaRight
        );
    },



    createBalconyTopView: function(set, LM, LL, LR, deltaLeftMain = 0, deltaRightMain = 0) {
        const topView = { models: {}, paths: {} };
        
        const main = set.main;
        const left = set.leftReturn;
        const right = set.rightReturn;
        
        const postW = (main && main.postW !== undefined) ? main.postW : 1.5;
        const postH = (main && main.postH !== undefined) ? main.postH : 1.5;
        const topRailW = (main && main.topRailW !== undefined) ? main.topRailW : 1.5;
        
        if (main) {
            topView.models.mainRail = new makerjs.models.Rectangle(LM, topRailW);
            topView.models.mainRail.origin = [0, -topRailW];
        }
        
        const mainLeftPost = main && main.leftPost === 'yes';
        const leftStyle = left ? (left.railStyle || 'classical') : 'classical';
        const isLeftReturnMeshStyle = (leftStyle === 'urban_balcony' || leftStyle === 'villa_balcony' || leftStyle === 'urban_custom' || leftStyle === 'villa_custom');
        const leftCornerPost = left && LL > 0 && (isLeftReturnMeshStyle ? (left.rightPost !== 'none' && left.rightPost !== 'no') : (left.leftPost !== 'none' && left.leftPost !== 'no'));
        const hasLeftCornerPost = (leftCornerPost || mainLeftPost);
        
        if (left && LL > 0) {
            topView.models.leftRail = new makerjs.models.Rectangle(topRailW, LL);
            topView.models.leftRail.origin = hasLeftCornerPost ? [-topRailW, 0] : [0, 0];
        }
        
        const mainRightPost = main && main.rightPost === 'yes';
        const rightCornerPost = right && LR > 0 && (right.leftPost !== 'none' && right.leftPost !== 'no');
        const hasRightCornerPost = (rightCornerPost || mainRightPost);
        
        if (right && LR > 0) {
            topView.models.rightRail = new makerjs.models.Rectangle(topRailW, LR);
            topView.models.rightRail.origin = hasRightCornerPost ? [LM, 0] : [LM - topRailW, 0];
        }
        
        topView.models.posts = { models: {} };
        let postIdx = 0;
        
        if (left && LL > 0) {
            // Draw shared/corner post belonging to return
            if (leftCornerPost || mainLeftPost) {
                const p = new makerjs.models.Rectangle(postW, postH);
                p.origin = [-postW, -postH];
                topView.models.posts.models['post_' + (postIdx++)] = p;
            }
            // Draw additional post belonging to main panel (same line)
            if (mainLeftPost) {
                const p = new makerjs.models.Rectangle(postW, postH);
                p.origin = [0, -postH];
                topView.models.posts.models['post_' + (postIdx++)] = p;
            }
        } else {
            if (mainLeftPost) {
                const p = new makerjs.models.Rectangle(postW, postH);
                p.origin = [0, -postH];
                topView.models.posts.models['post_' + (postIdx++)] = p;
            }
        }

        // Corner 3 (right of main, corner of right return):
        
        if (right && LR > 0) {
            // Draw shared/corner post belonging to return
            if (rightCornerPost || mainRightPost) {
                const p = new makerjs.models.Rectangle(postW, postH);
                p.origin = [LM, -postH];
                topView.models.posts.models['post_' + (postIdx++)] = p;
            }
            // Draw additional post belonging to main panel (same line)
            if (mainRightPost) {
                const p = new makerjs.models.Rectangle(postW, postH);
                p.origin = [LM - postW, -postH];
                topView.models.posts.models['post_' + (postIdx++)] = p;
            }
        } else {
            if (mainRightPost) {
                const p = new makerjs.models.Rectangle(postW, postH);
                p.origin = [LM - postW, -postH];
                topView.models.posts.models['post_' + (postIdx++)] = p;
            }
        }

        if (main) {
            const leftPostOpt = main.leftPost || 'yes';
            const rightPostOpt = main.rightPost || 'yes';
            const midPostsOpt = main.midPosts || 'none';
            const style = main.railStyle || 'classical';
            const origLength = main.length || 120.0;
            const midPostCount = (midPostsOpt === 'default' || midPostsOpt === 'yes') 
                ? Math.max(0, Math.ceil(origLength / 48) - 1) 
                : ((midPostsOpt === 'custom' || midPostsOpt === 'custom_standard') ? (parseInt(main.midPostCount) || 0) : 0);
            const customSpacings = main.midPostSpacings || null;
            
            if (midPostsOpt !== 'none' && midPostCount > 0) {
                const resolvedCenters = resolveMidPostCenters(LM, leftPostOpt, rightPostOpt, midPostsOpt, midPostCount, postW, customSpacings, style, main.extra6, 'main', deltaLeftMain, deltaRightMain);
                resolvedCenters.forEach(cx => {
                    const p = new makerjs.models.Rectangle(postW, postH);
                    p.origin = [cx - postW / 2, -postH];
                    topView.models.posts.models['post_' + (postIdx++)] = p;
                });
            }
        }
        
        if (left && LL > 0) {
            const leftStyle = left.railStyle || 'classical';
            const isLeftReturnMeshStyle = (leftStyle === 'urban_balcony' || leftStyle === 'villa_balcony' || leftStyle === 'urban_custom' || leftStyle === 'villa_custom');
            const leftOuterPostOpt = isLeftReturnMeshStyle ? (left.leftPost || 'none') : (left.rightPost || 'none');
            if (leftOuterPostOpt !== 'none' && leftOuterPostOpt !== 'no') {
                const p = new makerjs.models.Rectangle(postW, postH);
                p.origin = [-postW, LL - postH];
                topView.models.posts.models['post_' + (postIdx++)] = p;
            }
        }
        
        if (right && LR > 0) {
            const rightOuterPostOpt = right.rightPost || 'none';
            if (rightOuterPostOpt !== 'none' && rightOuterPostOpt !== 'no') {
                const p = new makerjs.models.Rectangle(postW, postH);
                p.origin = [LM, LR - postH];
                topView.models.posts.models['post_' + (postIdx++)] = p;
            }
        }
        
        return topView;
    },

    createCombinedBalconyModel: function(set, activePanel, isPreview) {
        const style = (set.main && set.main.railStyle) ? set.main.railStyle : ((set.leftReturn && set.leftReturn.railStyle) ? set.leftReturn.railStyle : ((set.rightReturn && set.rightReturn.railStyle) ? set.rightReturn.railStyle : 'classical'));
        
        let LM = set.main ? ((parseFloat(set.main.length) || 120.0) + (set.main.extra6 ? 12.0 : 0.0)) : 0.0;
        let LL = set.leftReturn ? ((parseFloat(set.leftReturn.length) || 36.0) + (set.leftReturn.extra6 ? 6.0 : 0.0)) : 0.0;
        let LR = set.rightReturn ? ((parseFloat(set.rightReturn.length) || 36.0) + (set.rightReturn.extra6 ? 6.0 : 0.0)) : 0.0;

        let deltaLeftMain = 0;
        let deltaRightMain = 0;
        let deltaLeftLeft = 0;
        let deltaRightLeft = 0;
        let deltaLeftRight = 0;
        let deltaRightRight = 0;

        if (set.main) {
            const extMain = this.resolveFreeEndExtensions({
                length: LM,
                originalLength: set.main.length || 120.0,
                leftPost: set.main.leftPost === 'yes' ? 'yes' : 'none',
                rightPost: set.main.rightPost === 'yes' ? 'yes' : 'none',
                midPosts: set.main.midPosts || 'none',
                midPostCount: (set.main.midPosts === 'default' || set.main.midPosts === 'yes') 
                    ? Math.max(0, Math.ceil(set.main.length / 48) - 1) 
                    : ((set.main.midPosts === 'custom' || set.main.midPosts === 'custom_standard') ? (parseInt(set.main.midPostCount) || 0) : 0),
                postW: (set.main.postW !== undefined) ? set.main.postW : 1.5,
                midPostSpacings: set.main.midPostSpacings || null,
                picketSpacing: (set.main.picketSpacing !== undefined) ? set.main.picketSpacing : 4.0,
                extra6: set.main.extra6 || false,
                freeEnd4: set.main.freeEnd4 || false
            }, style, 'main');
            deltaLeftMain = extMain.deltaLeft;
            deltaRightMain = extMain.deltaRight;
            LM += (deltaLeftMain + deltaRightMain);
        }
        
        if (set.leftReturn) {
            const extLeft = this.resolveFreeEndExtensions({
                length: LL,
                originalLength: set.leftReturn.length || 36.0,
                leftPost: 'corner',
                rightPost: 'none',
                midPosts: set.leftReturn.midPosts || 'none',
                midPostCount: (set.leftReturn.midPosts === 'default' || set.leftReturn.midPosts === 'yes') 
                    ? Math.max(0, Math.ceil(set.leftReturn.length / 48) - 1) 
                    : ((set.leftReturn.midPosts === 'custom' || set.leftReturn.midPosts === 'custom_standard') ? (parseInt(set.leftReturn.midPostCount) || 0) : 0),
                postW: (set.main && set.main.postW !== undefined) ? set.main.postW : 1.5,
                midPostSpacings: set.leftReturn.midPostSpacings || null,
                picketSpacing: (set.leftReturn.picketSpacing !== undefined) ? set.leftReturn.picketSpacing : 4.0,
                extra6: set.leftReturn.extra6 || false,
                freeEnd4: set.leftReturn.freeEnd4 || false
            }, style, 'leftReturn');
            deltaLeftLeft = extLeft.deltaLeft;
            deltaRightLeft = extLeft.deltaRight;
            LL += (deltaLeftLeft + deltaRightLeft);
        }
        
        if (set.rightReturn) {
            const extRight = this.resolveFreeEndExtensions({
                length: LR,
                originalLength: set.rightReturn.length || 36.0,
                leftPost: 'corner',
                rightPost: 'none',
                midPosts: set.rightReturn.midPosts || 'none',
                midPostCount: (set.rightReturn.midPosts === 'default' || set.rightReturn.midPosts === 'yes') 
                    ? Math.max(0, Math.ceil(set.rightReturn.length / 48) - 1) 
                    : ((set.rightReturn.midPosts === 'custom' || set.rightReturn.midPosts === 'custom_standard') ? (parseInt(set.rightReturn.midPostCount) || 0) : 0),
                postW: (set.main && set.main.postW !== undefined) ? set.main.postW : 1.5,
                midPostSpacings: set.rightReturn.midPostSpacings || null,
                picketSpacing: (set.rightReturn.picketSpacing !== undefined) ? set.rightReturn.picketSpacing : 4.0,
                extra6: set.rightReturn.extra6 || false,
                freeEnd4: set.rightReturn.freeEnd4 || false
            }, style, 'rightReturn');
            deltaLeftRight = extRight.deltaLeft;
            deltaRightRight = extRight.deltaRight;
            LR += (deltaLeftRight + deltaRightRight);
        }

        const leftStyle = set.leftReturn ? (set.leftReturn.railStyle || 'classical') : 'classical';
        const isLeftReturnMeshStyle = (leftStyle === 'urban_balcony' || leftStyle === 'villa_balcony' || leftStyle === 'urban_custom' || leftStyle === 'villa_custom');
        const mainModel = set.main ? this.getPanelModel(set.main, style, isPreview && (set.leftReturn && LL > 0), isPreview && (set.rightReturn && LR > 0), 'main') : null;
        const leftModel = set.leftReturn 
            ? this.getPanelModel(set.leftReturn, style, isLeftReturnMeshStyle ? false : isPreview, isLeftReturnMeshStyle ? isPreview : false, 'leftReturn') 
            : null;
        const rightModel = set.rightReturn ? this.getPanelModel(set.rightReturn, style, isPreview, false, 'rightReturn') : null;

        if (!isPreview) {
            if (activePanel === 'leftReturn') return leftModel;
            if (activePanel === 'rightReturn') return rightModel;
            return mainModel;
        }

        const H = set.main ? (parseFloat(set.main.postHeight) || 45.75) : 45.75;
        const S = 25.0; // Spacing between views

        const projectPoint = (x, y, panelType) => {
            const numX = Number(x) || 0;
            const numY = Number(y) || 0;
            if (panelType === 'main') {
                return [numX, -Number(S) - Number(H) + numY];
            } else if (panelType === 'leftReturn') {
                const leftStyle = set.leftReturn ? (set.leftReturn.railStyle || 'classical') : 'classical';
                const isLeftReturnMeshStyle = (leftStyle === 'urban_balcony' || leftStyle === 'villa_balcony' || leftStyle === 'urban_custom' || leftStyle === 'villa_custom');
                return [-Number(S) - Number(H) + numY, isLeftReturnMeshStyle ? (Number(LL) - numX) : numX];
            } else if (panelType === 'rightReturn') {
                return [Number(LM) + Number(S) + Number(H) - numY, numX];
            }
            return [numX, numY];
        };

        const projectModel = (model, panelType) => {
            if (!model) return null;
            const projected = { paths: {}, models: {} };

            if (model.paths) {
                for (const key in model.paths) {
                    const path = model.paths[key];
                    if (path.type === 'line') {
                        const p1 = projectPoint(path.origin[0], path.origin[1], panelType);
                        const p2 = projectPoint(path.end[0], path.end[1], panelType);
                        projected.paths[key] = new makerjs.paths.Line(p1, p2);
                    } else if (path.type === 'circle') {
                        const center = projectPoint(path.origin[0], path.origin[1], panelType);
                        projected.paths[key] = new makerjs.paths.Circle(center, path.radius);
                    }
                }
            }

            if (model.models) {
                for (const key in model.models) {
                    const child = model.models[key];
                    const origin = child.origin || [0, 0];
                    const shiftedChild = JSON.parse(JSON.stringify(child));
                    
                    const applyOrigin = (m, org) => {
                        if (m.paths) {
                            for (const pk in m.paths) {
                                m.paths[pk].origin[0] += org[0];
                                m.paths[pk].origin[1] += org[1];
                                if (m.paths[pk].end) {
                                    m.paths[pk].end[0] += org[0];
                                    m.paths[pk].end[1] += org[1];
                                }
                            }
                        }
                        if (m.models) {
                            for (const mk in m.models) {
                                const childOrg = m.models[mk].origin || [0, 0];
                                applyOrigin(m.models[mk], [org[0] + childOrg[0], org[1] + childOrg[1]]);
                                m.models[mk].origin = [0, 0];
                            }
                        }
                    };
                    
                    applyOrigin(shiftedChild, origin);
                    projected.models[key] = projectModel(shiftedChild, panelType);
                }
            }

            return projected;
        };

        const combined = {
            models: {
                topView: this.createBalconyTopView(set, LM, LL, LR, deltaLeftMain, deltaRightMain)
            }
        };

        if ((activePanel === 'main' || !activePanel) && mainModel) {
            combined.models.main = projectModel(mainModel, 'main');
        } else if (activePanel === 'leftReturn' && leftModel) {
            combined.models.left = projectModel(leftModel, 'leftReturn');
        } else if (activePanel === 'rightReturn' && rightModel) {
            combined.models.right = projectModel(rightModel, 'rightReturn');
        }

        // Generate projection lines
        const projections = { paths: {} };
        let projIdx = 0;
        
        if ((activePanel === 'main' || !activePanel) && set.main) {
            const leftPostOpt = set.main.leftPost || 'yes';
            const rightPostOpt = set.main.rightPost || 'yes';
            const midPostsOpt = set.main.midPosts || 'none';
            const midPostCount = (midPostsOpt === 'default' || midPostsOpt === 'yes') 
                ? Math.max(0, Math.ceil(LM / 48) - 1) 
                : ((midPostsOpt === 'custom' || midPostsOpt === 'custom_standard') ? (parseInt(set.main.midPostCount) || 0) : 0);
            
            const postW = parseFloat(set.main.postW) || 1.5;
            const postH = parseFloat(set.main.postH) || 1.5;
            const startY = -postH;
            const endY = -S;
            const style = set.main.railStyle || 'classical';
            const customSpacings = set.main.midPostSpacings || null;
            
            // Left post centerline projection
            if (leftPostOpt === 'yes') {
                const cxMain = postW / 2;
                projections.paths['proj_' + (projIdx++)] = new makerjs.paths.Line([cxMain, startY], [cxMain, endY]);
            } else {
                projections.paths['proj_' + (projIdx++)] = new makerjs.paths.Line([0.0625, startY], [0.0625, endY]);
            }
            
            // Right post centerline projection
            if (rightPostOpt === 'yes') {
                const cxMain = LM - postW / 2;
                projections.paths['proj_' + (projIdx++)] = new makerjs.paths.Line([cxMain, startY], [cxMain, endY]);
            } else {
                projections.paths['proj_' + (projIdx++)] = new makerjs.paths.Line([LM - 0.0625, startY], [LM - 0.0625, endY]);
            }
            
            if (midPostsOpt !== 'none' && midPostCount > 0) {
                const resolvedCenters = resolveMidPostCenters(LM, leftPostOpt, rightPostOpt, midPostsOpt, midPostCount, postW, customSpacings, style, set.main.extra6, 'main', deltaLeftMain, deltaRightMain);
                resolvedCenters.forEach(cx => {
                    projections.paths['proj_' + (projIdx++)] = new makerjs.paths.Line([cx, startY], [cx, endY]);
                });
            }
        }
        
        if (activePanel === 'leftReturn' && leftModel && LL > 0) {
            const postW = set.main ? (parseFloat(set.main.postW) || 1.5) : 1.5;
            const postH = set.main ? (parseFloat(set.main.postH) || 1.5) : 1.5;
            const startX = -postW;
            const endX = -S;
            
            // Corner post (always centered since corner post is present)
            const cornerY = -postH / 2;
            projections.paths['proj_' + (projIdx++)] = new makerjs.paths.Line([startX, cornerY], [endX, cornerY]);
            
            // Outer post (at y = LL - postH / 2)
            const leftStyle = set.leftReturn ? (set.leftReturn.railStyle || 'classical') : 'classical';
            const isLeftReturnMeshStyle = (leftStyle === 'urban_balcony' || leftStyle === 'villa_balcony' || leftStyle === 'urban_custom' || leftStyle === 'villa_custom');
            const leftOuterPostOpt = set.leftReturn 
                ? (isLeftReturnMeshStyle ? (set.leftReturn.leftPost || 'none') : (set.leftReturn.rightPost || 'none')) 
                : 'none';
            if (leftOuterPostOpt !== 'none' && leftOuterPostOpt !== 'no') {
                const outerY = LL - postH / 2;
                projections.paths['proj_' + (projIdx++)] = new makerjs.paths.Line([startX, outerY], [endX, outerY]);
            } else {
                projections.paths['proj_' + (projIdx++)] = new makerjs.paths.Line([startX, LL], [endX, LL]);
            }

            // Mid posts (if any)
            const leftMidPostsOpt = set.leftReturn ? (set.leftReturn.midPosts || 'none') : 'none';
                const leftOrigLength = set.leftReturn.length || 36.0;
                const leftMidPostCount = (leftMidPostsOpt === 'default' || leftMidPostsOpt === 'yes')
                    ? Math.max(0, Math.ceil(leftOrigLength / 48) - 1)
                    : ((leftMidPostsOpt === 'custom' || leftMidPostsOpt === 'custom_standard') ? (parseInt(set.leftReturn.midPostCount) || 0) : 0);
                if (leftMidPostsOpt !== 'none' && leftMidPostCount > 0) {
                    const leftStyle = set.leftReturn.railStyle || 'classical';
                    const leftCustomSpacings = set.leftReturn.midPostSpacings || null;
                    const resolvedCenters = resolveMidPostCenters(LL, 'yes', leftOuterPostOpt, leftMidPostsOpt, leftMidPostCount, postW, leftCustomSpacings, leftStyle, set.leftReturn.extra6, 'leftReturn', deltaLeftLeft, deltaRightLeft);
                resolvedCenters.forEach(cy => {
                    projections.paths['proj_' + (projIdx++)] = new makerjs.paths.Line([startX, cy], [endX, cy]);
                });
            }
        }
        
        if (activePanel === 'rightReturn' && rightModel && LR > 0) {
            const postW = set.main ? (parseFloat(set.main.postW) || 1.5) : 1.5;
            const postH = set.main ? (parseFloat(set.main.postH) || 1.5) : 1.5;
            const startX = LM + postW;
            const endX = LM + S;
            
            // Corner post (always centered since corner post is present)
            const cornerY = -postH / 2;
            projections.paths['proj_' + (projIdx++)] = new makerjs.paths.Line([startX, cornerY], [endX, cornerY]);
            
            // Outer post (at y = LR - postH / 2)
            const rightOuterPostOpt = set.rightReturn ? (set.rightReturn.rightPost || 'none') : 'none';
            if (rightOuterPostOpt !== 'none' && rightOuterPostOpt !== 'no') {
                const outerY = LR - postH / 2;
                projections.paths['proj_' + (projIdx++)] = new makerjs.paths.Line([startX, outerY], [endX, outerY]);
            } else {
                projections.paths['proj_' + (projIdx++)] = new makerjs.paths.Line([startX, LR], [endX, LR]);
            }

            // Mid posts (if any)
            const rightMidPostsOpt = set.rightReturn ? (set.rightReturn.midPosts || 'none') : 'none';
                const rightOrigLength = set.rightReturn.length || 36.0;
                const rightMidPostCount = (rightMidPostsOpt === 'default' || rightMidPostsOpt === 'yes')
                    ? Math.max(0, Math.ceil(rightOrigLength / 48) - 1)
                    : ((rightMidPostsOpt === 'custom' || rightMidPostsOpt === 'custom_standard') ? (parseInt(set.rightReturn.midPostCount) || 0) : 0);
                if (rightMidPostsOpt !== 'none' && rightMidPostCount > 0) {
                    const rightStyle = set.rightReturn.railStyle || 'classical';
                    const rightCustomSpacings = set.rightReturn.midPostSpacings || null;
                    const resolvedCenters = resolveMidPostCenters(LR, 'yes', rightOuterPostOpt, rightMidPostsOpt, rightMidPostCount, postW, rightCustomSpacings, rightStyle, set.rightReturn.extra6, 'rightReturn', deltaLeftRight, deltaRightRight);
                resolvedCenters.forEach(cy => {
                    projections.paths['proj_' + (projIdx++)] = new makerjs.paths.Line([startX, cy], [endX, cy]);
                });
            }
        }
        
        combined.models.projections = projections;

        // Apply rotation if needed to face active panel horizontally at bottom
        if (activePanel === 'leftReturn') {
            makerjs.model.rotate(combined, 90, [0, 0]);
        } else if (activePanel === 'rightReturn') {
            makerjs.model.rotate(combined, -90, [LM, 0]);
        }

        // Clean any accidental diagonal lines in the combined model
        const cleanDiagonals = (m) => {
            if (!m) return;
            if (m.paths) {
                for (const pk in m.paths) {
                    const path = m.paths[pk];
                    if (path.type === 'line') {
                        const p1 = path.origin;
                        const p2 = path.end;
                        if (p1 && p2) {
                            const dx = Math.abs(p1[0] - p2[0]);
                            const dy = Math.abs(p1[1] - p2[1]);
                            if (dx > 3.0 && dy > 3.0) {
                                delete m.paths[pk];
                            }
                        }
                    }
                }
            }
            if (m.models) {
                for (const mk in m.models) {
                    cleanDiagonals(m.models[mk]);
                }
            }
        };
        cleanDiagonals(combined);

        return combined;
    },

    createLoosePostModel: function(postW, postHeight, topRailH, postType, postT, includeBasePlates, bpW, bpL, bpH, bpHoleD, bpHoleOffsetX, bpHoleOffsetY, style, fenceHeight, botRailH, midRailType, midRailGap, midRailH) {
        const model = {
            models: {
                posts: { models: {} }
            }
        };
        if (includeBasePlates === 'yes') {
            model.models.basePlates = { models: {} };
        }
        
        const singlePost = { models: {}, paths: {} };
        singlePost.models.outer = new makerjs.models.Rectangle(postW, postHeight);
        singlePost.origin = [0, 0];
        model.models.posts.models['loosePost'] = singlePost;

        const isMeshStyle = (style === 'urban_balcony' || style === 'villa_balcony' || style === 'urban_custom' || style === 'villa_custom');
        if (isMeshStyle) {
            const fH = fenceHeight !== undefined ? fenceHeight : 41.0;
            const bY = postHeight - fH;
            const bH = botRailH !== undefined ? botRailH : 1.5;
            const tH = topRailH !== undefined ? topRailH : 1.5;
            const mGap = midRailGap !== undefined ? midRailGap : 3.0;
            const mH = midRailH !== undefined ? midRailH : 1.5;

            const yStart = bY + bH;
            const hasMid = (style === 'villa_balcony' || (style === 'villa_custom' && midRailType !== 'none'));
            const yEnd = hasMid ? (postHeight - tH - mGap - mH) : (postHeight - tH);
            const fbHeight = yEnd - yStart;
            const fbW = 1.0; // flat bar width
            const actualFbHeight = fbHeight - 2.0;

            if (actualFbHeight > 0) {
                const fb = {
                    models: {
                        outer: new makerjs.models.Rectangle(fbW, actualFbHeight)
                    }
                };
                fb.origin = [postW, yStart + 1.0];
                model.models.posts.models['flatBarAttachment'] = fb;
            }
        }

        if (includeBasePlates === 'yes') {
            const bp = {
                models: { outer: new makerjs.models.Rectangle(bpW, bpH) },
                paths: {
                    h1: new makerjs.paths.Circle([bpHoleOffsetX, bpHoleOffsetY], bpHoleD / 2),
                    h2: new makerjs.paths.Circle([bpW - bpHoleOffsetX, bpHoleOffsetY], bpHoleD / 2)
                }
            };
            bp.origin = [postW / 2 - bpW / 2, -bpH];
            model.models.basePlates.models['bpLoose'] = bp;
        }
        return model;
    }
};
