const SHAPES_DB = {
    hss_rect: [
        // Heavy Square HSS
        { id: 'HSS10x10x1/2', name: 'HSS 10x10x1/2', w: 10.0, h: 10.0, t: 0.5 },
        { id: 'HSS10x10x3/8', name: 'HSS 10x10x3/8', w: 10.0, h: 10.0, t: 0.375 },
        { id: 'HSS8x8x1/2', name: 'HSS 8x8x1/2', w: 8.0, h: 8.0, t: 0.5 },
        { id: 'HSS8x8x3/8', name: 'HSS 8x8x3/8', w: 8.0, h: 8.0, t: 0.375 },
        { id: 'HSS8x8x1/4', name: 'HSS 8x8x1/4', w: 8.0, h: 8.0, t: 0.25 },
        { id: 'HSS6x6x1/2', name: 'HSS 6x6x1/2', w: 6.0, h: 6.0, t: 0.5 },
        { id: 'HSS6x6x3/8', name: 'HSS 6x6x3/8', w: 6.0, h: 6.0, t: 0.375 },
        { id: 'HSS6x6x1/4', name: 'HSS 6x6x1/4', w: 6.0, h: 6.0, t: 0.25 },
        { id: 'HSS4x4x1/2', name: 'HSS 4x4x1/2', w: 4.0, h: 4.0, t: 0.5 },
        { id: 'HSS4x4x3/8', name: 'HSS 4x4x3/8', w: 4.0, h: 4.0, t: 0.375 },
        { id: 'HSS4x4x1/4', name: 'HSS 4x4x1/4', w: 4.0, h: 4.0, t: 0.25 },
        { id: 'HSS3x3x3/8', name: 'HSS 3x3x3/8', w: 3.0, h: 3.0, t: 0.375 },
        { id: 'HSS3x3x1/4', name: 'HSS 3x3x1/4', w: 3.0, h: 3.0, t: 0.25 },
        
        // Heavy Rectangular HSS
        { id: 'HSS12x8x1/2', name: 'HSS 12x8x1/2', w: 12.0, h: 8.0, t: 0.5 },
        { id: 'HSS12x8x3/8', name: 'HSS 12x8x3/8', w: 12.0, h: 8.0, t: 0.375 },
        { id: 'HSS10x6x1/2', name: 'HSS 10x6x1/2', w: 10.0, h: 6.0, t: 0.5 },
        { id: 'HSS10x6x3/8', name: 'HSS 10x6x3/8', w: 10.0, h: 6.0, t: 0.375 },
        { id: 'HSS10x6x1/4', name: 'HSS 10x6x1/4', w: 10.0, h: 6.0, t: 0.25 },
        { id: 'HSS8x6x3/8', name: 'HSS 8x6x3/8', w: 8.0, h: 6.0, t: 0.375 },
        { id: 'HSS8x6x1/4', name: 'HSS 8x6x1/4', w: 8.0, h: 6.0, t: 0.25 },
        { id: 'HSS6x4x3/8', name: 'HSS 6x4x3/8', w: 6.0, h: 4.0, t: 0.375 },
        { id: 'HSS6x4x1/4', name: 'HSS 6x4x1/4', w: 6.0, h: 4.0, t: 0.25 },
        
        // Light Gauge HSS Steel Tubing
        { id: 'HSS4x4x10GA', name: 'HSS 4x4x10GA (0.1345")', w: 4.0, h: 4.0, t: 0.1345 },
        { id: 'HSS4x4x11GA', name: 'HSS 4x4x11GA (0.1196")', w: 4.0, h: 4.0, t: 0.1196 },
        { id: 'HSS4x4x14GA', name: 'HSS 4x4x14GA (0.0747")', w: 4.0, h: 4.0, t: 0.0747 },
        { id: 'HSS3x3x11GA', name: 'HSS 3x3x11GA (0.1196")', w: 3.0, h: 3.0, t: 0.1196 },
        { id: 'HSS3x3x14GA', name: 'HSS 3x3x14GA (0.0747")', w: 3.0, h: 3.0, t: 0.0747 },
        { id: 'HSS2x2x11GA', name: 'HSS 2x2x11GA (0.1196")', w: 2.0, h: 2.0, t: 0.1196 },
        { id: 'HSS2x2x14GA', name: 'HSS 2x2x14GA (0.0747")', w: 2.0, h: 2.0, t: 0.0747 },
        { id: 'HSS2x2x16GA', name: 'HSS 2x2x16GA (0.0598")', w: 2.0, h: 2.0, t: 0.0598 },
        { id: 'HSS1.5x1.5x14GA', name: 'HSS 1.5x1.5x14GA (0.0747")', w: 1.5, h: 1.5, t: 0.0747 },
        { id: 'HSS1.5x1.5x16GA', name: 'HSS 1.5x1.5x16GA (0.0598")', w: 1.5, h: 1.5, t: 0.0598 },
        { id: 'HSS1x1x14GA', name: 'HSS 1x1x14GA (0.0747")', w: 1.0, h: 1.0, t: 0.0747 },
        { id: 'HSS1x1x16GA', name: 'HSS 1x1x16GA (0.0598")', w: 1.0, h: 1.0, t: 0.0598 },
        { id: 'HSS3/4x3/4x16GA', name: 'HSS 3/4 X 3/4 X 16GA (0.0598")', w: 0.75, h: 0.75, t: 0.0598 },
        { id: 'HSS1/2x1/2x16GA', name: 'HSS 1/2 X 1/2 X 16ga (0.0598")', w: 0.5, h: 0.5, t: 0.0598 },
        
        { id: 'CUSTOM', name: 'Custom Dimensions...', custom: true }
    ],
    hss_circ: [
        // Standard Schedule 40 & 80 Pipes
        { id: 'PIPE1SCH40', name: '1" Sch 40 Pipe (1.315" OD)', d: 1.315, t: 0.133 },
        { id: 'PIPE1SCH80', name: '1" Sch 80 Pipe (1.315" OD)', d: 1.315, t: 0.179 },
        { id: 'PIPE1.5SCH40', name: '1-1/2" Sch 40 Pipe (1.90" OD)', d: 1.90, t: 0.145 },
        { id: 'PIPE1.5SCH80', name: '1-1/2" Sch 80 Pipe (1.90" OD)', d: 1.90, t: 0.200 },
        { id: 'PIPE2SCH40', name: '2" Sch 40 Pipe (2.375" OD)', d: 2.375, t: 0.154 },
        { id: 'PIPE2SCH80', name: '2" Sch 80 Pipe (2.375" OD)', d: 2.375, t: 0.218 },
        { id: 'PIPE3SCH40', name: '3" Sch 40 Pipe (3.50" OD)', d: 3.50, t: 0.216 },
        { id: 'PIPE3SCH80', name: '3" Sch 80 Pipe (3.50" OD)', d: 3.50, t: 0.300 },
        { id: 'PIPE4SCH40', name: '4" Sch 40 Pipe (4.50" OD)', d: 4.50, t: 0.237 },
        { id: 'PIPE4SCH80', name: '4" Sch 80 Pipe (4.50" OD)', d: 4.50, t: 0.337 },
        
        // Gauge Round HSS Steel Tubing
        { id: 'TUBING4x11GA', name: '4" OD x 11GA (0.1196")', d: 4.0, t: 0.1196 },
        { id: 'TUBING3x11GA', name: '3" OD x 11GA (0.1196")', d: 3.0, t: 0.1196 },
        { id: 'TUBING2.375x11GA', name: '2.375" OD x 11GA (0.1196")', d: 2.375, t: 0.1196 },
        { id: 'TUBING2x14GA', name: '2" OD x 14GA (0.0747")', d: 2.0, t: 0.0747 },
        { id: 'TUBING1.75x14GA', name: '1.75" OD x 14GA (0.0747")', d: 1.75, t: 0.0747 },
        { id: 'TUBING1.5x16GA', name: '1.5" OD x 16GA (0.0598")', d: 1.5, t: 0.0598 },
        { id: 'TUBING1.25x16GA', name: '1.25" OD x 16GA (0.0598")', d: 1.25, t: 0.0598 },
        { id: 'TUBING1x16GA', name: '1" OD x 16GA (0.0598")', d: 1.0, t: 0.0598 },
        
        { id: 'CUSTOM', name: 'Custom Diameter...', custom: true }
    ],
    plate: [
        // Sheet Metal Gauge thickness
        { id: 'PL16GA', name: '16 GA Plate (0.0598")', t: 0.0598 },
        { id: 'PL14GA', name: '14 GA Plate (0.0747")', t: 0.0747 },
        { id: 'PL12GA', name: '12 GA Plate (0.1046")', t: 0.1046 },
        { id: 'PL11GA', name: '11 GA Plate (0.1196")', t: 0.1196 },
        { id: 'PL10GA', name: '10 GA Plate (0.1345")', t: 0.1345 },
        
        // Fraction thicknesses
        { id: 'PL3/16', name: '3/16" Plate', t: 0.1875 },
        { id: 'PL1/4', name: '1/4" Plate', t: 0.25 },
        { id: 'PL3/8', name: '3/8" Plate', t: 0.375 },
        { id: 'PL1/2', name: '1/2" Plate', t: 0.5 },
        { id: 'PL5/8', name: '5/8" Plate', t: 0.625 },
        { id: 'PL3/4', name: '3/4" Plate', t: 0.75 },
        { id: 'PL1', name: '1" Plate', t: 1.0 },
        { id: 'CUSTOM', name: 'Custom Plate...', custom: true }
    ],
    w_beam: [
        { id: 'W6x9', name: 'W6x9', d: 5.9, bf: 3.94, tf: 0.215, tw: 0.17 },
        { id: 'W6x15', name: 'W6x15', d: 5.99, bf: 5.99, tf: 0.26, tw: 0.23 },
        { id: 'W8x10', name: 'W8x10', d: 7.89, bf: 3.94, tf: 0.205, tw: 0.17 },
        { id: 'W8x18', name: 'W8x18', d: 8.14, bf: 5.25, tf: 0.33, tw: 0.23 },
        { id: 'W8x31', name: 'W8x31', d: 8.0, bf: 8.0, tf: 0.435, tw: 0.285 },
        { id: 'W10x12', name: 'W10x12', d: 9.87, bf: 3.96, tf: 0.21, tw: 0.19 },
        { id: 'W10x30', name: 'W10x30', d: 10.5, bf: 5.81, tf: 0.51, tw: 0.3 },
        { id: 'W12x16', name: 'W12x16', d: 11.99, bf: 3.99, tf: 0.265, tw: 0.22 },
        { id: 'W12x26', name: 'W12x26', d: 12.2, bf: 6.49, tf: 0.38, tw: 0.23 },
        { id: 'W14x22', name: 'W14x22', d: 13.74, bf: 5.0, tf: 0.335, tw: 0.23 },
        { id: 'W14x90', name: 'W14x90', d: 14.0, bf: 14.5, tf: 0.71, tw: 0.44 },
        { id: 'CUSTOM', name: 'Custom W-Beam...', custom: true }
    ],
    angles: [
        { id: 'L2x2x1/8', name: 'L 2x2x1/8', leg1: 2.0, leg2: 2.0, t: 0.125 },
        { id: 'L2x2x3/16', name: 'L 2x2x3/16', leg1: 2.0, leg2: 2.0, t: 0.1875 },
        { id: 'L2x2x1/4', name: 'L 2x2x1/4', leg1: 2.0, leg2: 2.0, t: 0.25 },
        { id: 'L3x3x1/4', name: 'L 3x3x1/4', leg1: 3.0, leg2: 3.0, t: 0.25 },
        { id: 'L3x3x3/8', name: 'L 3x3x3/8', leg1: 3.0, leg2: 3.0, t: 0.375 },
        { id: 'L4x4x1/4', name: 'L 4x4x1/4', leg1: 4.0, leg2: 4.0, t: 0.25 },
        { id: 'L6x4x3/8', name: 'L 6x4x3/8', leg1: 6.0, leg2: 4.0, t: 0.375 },
        { id: 'L8x8x1/2', name: 'L 8x8x1/2', leg1: 8.0, leg2: 8.0, t: 0.5 },
        { id: 'CUSTOM', name: 'Custom Angle...', custom: true }
    ],
    fence: [
        { id: 'F6x10', name: '6ft x 10ft Industrial', length: 120, fenceHeight: 72, postHeight: 80, postSpacing: 48, topRailType: 'hss_rect', topRailSize: 'HSS2x2x14GA', topRailH: 2.0, midRailType: 'hss_rect', midRailSize: 'HSS2x2x14GA', midRailH: 2.0, botRailType: 'hss_rect', botRailSize: 'HSS2x2x14GA', botRailH: 2.0, picketType: 'hss_rect', picketSize: 'HSS1x1x16GA', picketW: 1.0, picketSpacing: 4.0, slope: 0 },
        { id: 'F8x20', name: '8ft x 20ft Security', length: 240, fenceHeight: 96, postHeight: 104, postSpacing: 60, topRailType: 'pipe', topRailSize: 'PIPE2SCH40', topRailH: 2.375, midRailType: 'pipe', midRailSize: 'PIPE2SCH40', midRailH: 2.375, botRailType: 'pipe', botRailSize: 'PIPE2SCH40', botRailH: 2.375, picketType: 'pipe', picketSize: 'PIPE1SCH40', picketW: 1.315, picketSpacing: 5.0, slope: 0 },
        { id: 'CUSTOM', name: 'Custom Fence...', custom: true }
    ],
    rails_gates: [
        { id: 'RG6x10', name: '6ft x 10ft Rails & Gates Panel', length: 120, fenceHeight: 72, postHeight: 80, midPostCount: 1, leftPostType: 'hss_rect', leftPostSize: 'HSS3x3x16GA', leftPostW: 3.0, rightPostType: 'hss_rect', rightPostSize: 'HSS3x3x16GA', rightPostW: 3.0, midPostType: 'hss_rect', midPostSize: 'HSS3x3x16GA', midPostW: 3.0, topRailType: 'hss_rect', topRailSize: 'HSS2x2x14GA', topRailH: 2.0, midRailType: 'none', botRailType: 'hss_rect', botRailSize: 'HSS2x2x14GA', botRailH: 2.0, picketType: 'hss_rect', picketSize: 'HSS1x1x16GA', picketW: 1.0, picketSpacing: 4.0, slope: 0 },
        { id: 'CUSTOM', name: 'Custom Rails & Gates...', custom: true }
    ],
    qiw_standards: [
        { id: 'QIW-FENCE-S6x10', name: 'QIW-FENCE-S6x10 (6ft x 10ft Industrial Fence with Base Plates)', category: 'fence', length: 120, fenceHeight: 72, postHeight: 80, topGap: 2.0, postSpacing: 48, postType: 'hss_rect', postSize: 'HSS3x3x16GA', topRailType: 'hss_rect', topRailSize: 'HSS2x2x14GA', midRailType: 'none', botRailType: 'hss_rect', botRailSize: 'HSS2x2x14GA', picketType: 'hss_rect', picketSize: 'HSS1x1x16GA', picketSpacing: 4.0, slope: 0, includeBasePlates: 'yes', basePlateSize: 'PL1/2', basePlateW: 6.0, basePlateL: 6.0, basePlateT: 0.5, basePlateHoleD: 0.5, basePlateHoleOffsetX: 0.5, basePlateHoleOffsetY: 0.25 },
        { id: 'QIW-FENCE-S8x20', name: 'QIW-FENCE-S8x20 (8ft x 20ft Security Fence with Base Plates)', category: 'fence', length: 240, fenceHeight: 96, postHeight: 104, topGap: 2.0, postSpacing: 60, postType: 'hss_rect', postSize: 'HSS4x4x1/4', topRailType: 'pipe', topRailSize: 'PIPE2SCH40', midRailType: 'pipe', midRailSize: 'PIPE2SCH40', botRailType: 'pipe', botRailSize: 'PIPE2SCH40', picketType: 'pipe', picketSize: 'PIPE1SCH40', picketSpacing: 5.0, slope: 0, includeBasePlates: 'yes', basePlateSize: 'PL1/2', basePlateW: 8.0, basePlateL: 8.0, basePlateT: 0.5, basePlateHoleD: 0.75, basePlateHoleOffsetX: 0.75, basePlateHoleOffsetY: 0.375 },
        { id: 'QIW-POST-1', name: 'QIW-POST-1 (HSS 4x4x1/4 Column with fabrication holes)', category: 'hss_rect', w: 4.0, h: 4.0, t: 0.25, h_d: 0.75, h_count: 2, h_spacing: 3.0 },
        { id: 'QIW-POST-2', name: 'QIW-POST-2 (HSS 6x6x3/8 Column with fabrication holes)', category: 'hss_rect', w: 6.0, h: 6.0, t: 0.375, h_d: 0.875, h_count: 2, h_spacing: 4.0 },
        { id: 'QIW-RAIL-1', name: 'QIW-RAIL-1 (HSS 2x2x14GA Rail)', category: 'hss_rect', w: 2.0, h: 2.0, t: 0.0747, h_d: 0, h_count: 1, h_spacing: 0 },
        { id: 'QIW-BASEPLATE-1', name: 'QIW-BASEPLATE-1 (12x12x1/2 Anchor Plate)', category: 'plate', w: 12.0, h: 12.0, holeD: 0.875, holeOffsetX: 1.5, holeOffsetY: 1.5 },
        { id: 'QIW-BASEPLATE-2', name: 'QIW-BASEPLATE-2 (6x6x1/2 Anchor Plate)', category: 'plate', w: 6.0, h: 6.0, holeD: 0.5, holeOffsetX: 0.75, holeOffsetY: 0.75 },
        { id: 'QIW-PIPE-POST', name: 'QIW-PIPE-POST (2\" Sch 40 Support Pipe)', category: 'hss_circ', d: 2.375, t: 0.154, h_d: 0, h_count: 1, h_spacing: 0 },
        { id: 'QIW-ANGLE-BRACKET', name: 'QIW-ANGLE-BRACKET (L 4x4x1/4 Bracket)', category: 'angles', leg1: 4.0, leg2: 4.0, t: 0.25, h_d: 0, h_count: 1, h_spacing: 0 },
        { id: 'QIW-WBEAM-GIRDER', name: 'QIW-WBEAM-GIRDER (W8x31 Girder Beam)', category: 'w_beam', d: 8.0, bf: 8.0, tf: 0.435, tw: 0.285, h_d: 0, h_count: 1, h_spacing: 0 }
    ]
};
