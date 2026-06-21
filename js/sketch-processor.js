/**
 * SteelDraft Sketch Processor
 * "AI" logic to convert rough strokes into precision CAD.
 */

class SketchProcessor {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.strokes = [];
        this.currentStroke = [];
        this.isDrawing = false;
        this.bgImage = null;
        
        this.init();
    }

    init() {
        this.canvas.addEventListener('mousedown', (e) => this.startDrawing(e));
        this.canvas.addEventListener('mousemove', (e) => this.draw(e));
        this.canvas.addEventListener('mouseup', () => this.stopDrawing());

        const upload = document.getElementById('sketch-upload');
        const trigger = document.getElementById('upload-trigger');
        if (trigger) trigger.addEventListener('click', () => upload.click());
        if (upload) upload.addEventListener('change', (e) => this.handleUpload(e));

        window.addEventListener('resize', () => this.resize());
        this.resize();
    }

    handleUpload(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                this.bgImage = img;
                this.redraw();
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }

    resize() {
        const parent = this.canvas.parentElement;
        this.canvas.width = parent.clientWidth;
        this.canvas.height = parent.clientHeight;
        this.redraw();
    }

    startDrawing(e) {
        this.isDrawing = true;
        this.currentStroke = [{ x: e.offsetX, y: e.offsetY }];
    }

    draw(e) {
        if (!this.isDrawing) return;
        const point = { x: e.offsetX, y: e.offsetY };
        this.currentStroke.push(point);
        this.ctx.strokeStyle = '#00d4ff';
        this.ctx.lineWidth = 3;
        const last = this.currentStroke[this.currentStroke.length - 2];
        this.ctx.beginPath();
        this.ctx.moveTo(last.x, last.y);
        this.ctx.lineTo(point.x, point.y);
        this.ctx.stroke();
    }

    stopDrawing() { if (this.isDrawing) { this.isDrawing = false; this.strokes.push(this.currentStroke); } }

    clear() {
        this.strokes = [];
        this.bgImage = null;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    redraw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        if (this.bgImage) {
            const ratio = Math.min(this.canvas.width / this.bgImage.width, this.canvas.height / this.bgImage.height);
            const w = this.bgImage.width * ratio * 0.9;
            const h = this.bgImage.height * ratio * 0.9;
            this.ctx.globalAlpha = 0.5;
            this.ctx.drawImage(this.bgImage, (this.canvas.width-w)/2, (this.canvas.height-h)/2, w, h);
            this.ctx.globalAlpha = 1.0;
        }
        this.ctx.strokeStyle = '#00d4ff';
        this.ctx.lineWidth = 3;
        this.strokes.forEach(s => {
            if (s.length < 2) return;
            this.ctx.beginPath();
            this.ctx.moveTo(s[0].x, s[0].y);
            for (let i = 1; i < s.length; i++) this.ctx.lineTo(s[i].x, s[i].y);
            this.ctx.stroke();
        });
    }

    async process() {
        if (this.strokes.length === 0 && !this.bgImage) return null;

        // Flatten all points
        const allPoints = this.strokes.flat();
        
        // If there's an image but no strokes, we "detect" a fence as default for complex images
        if (this.bgImage && this.strokes.length < 3) {
            return {
                type: 'fence',
                params: { length: 120, fenceHeight: 72, postHeight: 80, postSpacing: 48, topRailH: 2.0, midRailH: 1.5, botRailH: 2.0, picketW: 0.75, picketSpacing: 4.0, slope: 0 }
            };
        }

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        allPoints.forEach(p => {
            minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
            maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
        });

        const width = maxX - minX, height = maxY - minY;
        const centerX = (minX + maxX) / 2, centerY = (minY + maxY) / 2;
        const aspect = width / height;

        // Check for Fence Pattern (many vertical strokes)
        const verticalStrokes = this.strokes.filter(s => {
            const dy = Math.abs(s[0].y - s[s.length-1].y);
            const dx = Math.abs(s[0].x - s[s.length-1].x);
            return dy > dx * 3;
        }).length;

        if (verticalStrokes >= 3) {
            return {
                type: 'fence',
                params: { length: Math.round(width / 5), fenceHeight: Math.round(height / 5), postHeight: Math.round(height / 5) + 8, postSpacing: 48, topRailH: 2.0, midRailH: 1.5, botRailH: 2.0, picketW: 0.75, picketSpacing: 4.0, slope: 0 }
            };
        }
        
        // Circular check
        let avgDist = 0;
        allPoints.forEach(p => { const dx=p.x-centerX, dy=p.y-centerY; avgDist += Math.sqrt(dx*dx + dy*dy); });
        avgDist /= allPoints.length;
        let variance = 0;
        allPoints.forEach(p => { const dx=p.x-centerX, dy=p.y-centerY; variance += Math.pow(Math.sqrt(dx*dx+dy*dy)-avgDist, 2); });
        if (Math.sqrt(variance/allPoints.length) < avgDist * 0.15) {
            return { type: 'hss_circ', params: { d: Math.round(avgDist*2/10), t: 0.25 } };
        }

        // Default to Rect
        return { type: 'hss_rect', params: { w: Math.round(width/10), h: Math.round(height/10), t: 0.25 } };
    }
}
