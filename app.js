/**
 * WebCAD - Professional Web-Based CAD Application
 * A full-featured 2D CAD system with drawing, editing, and export capabilities
 */

// ============================================
// CONFIGURATION
// ============================================

const CONFIG = {
    units: 'mm',
    gridSize: 10,          // World units (in mm)
    snapGridSize: 5,       // Snap grid size (in mm)
    minZoom: 0.01,
    maxZoom: 100,
    zoomFactor: 1.15,
    hitTolerance: 8,       // Pixels
    dimensionOffset: 15,   // World units
    arrowSize: 3,          // World units
    mmPerInch: 25.4,       // Conversion factor
    colors: {
        background: '#0a0e14',
        gridMinor: '#111820',
        gridMajor: '#1a2332',
        axis: '#2a3a4a',
        entity: '#58a6ff',
        entityHover: '#79b8ff',
        selected: '#00d4aa',
        dimension: '#f0883e',
        preview: '#ffffff80',
        crosshair: '#00d4aa',
        trimCut: '#f85149',
        extendLine: '#3fb950'
    }
};

// Unit conversion utilities
const Units = {
    // Convert from internal (mm) to display units
    toDisplay(value) {
        if (CONFIG.units === 'in') {
            return value / CONFIG.mmPerInch;
        }
        return value;
    },
    
    // Convert from display units to internal (mm)
    toInternal(value) {
        if (CONFIG.units === 'in') {
            return value * CONFIG.mmPerInch;
        }
        return value;
    },
    
    // Format value for display
    format(value, decimals = 2) {
        const displayValue = this.toDisplay(value);
        return displayValue.toFixed(decimals) + ' ' + CONFIG.units;
    },
    
    // Get current unit label
    getLabel() {
        return CONFIG.units;
    }
};

// ============================================
// DATA MODEL
// ============================================

class Entity {
    constructor(type) {
        this.id = Entity.nextId++;
        this.type = type;
        this.selected = false;
        this.layer = 0;
    }
    
    static nextId = 1;
    
    getBounds() {
        return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
    }
    
    translate(dx, dy) {}
    
    clone() {
        return Object.assign(Object.create(Object.getPrototypeOf(this)), this);
    }
}

class Line extends Entity {
    constructor(x1, y1, x2, y2) {
        super('line');
        this.x1 = x1;
        this.y1 = y1;
        this.x2 = x2;
        this.y2 = y2;
    }
    
    getBounds() {
        return {
            minX: Math.min(this.x1, this.x2),
            minY: Math.min(this.y1, this.y2),
            maxX: Math.max(this.x1, this.x2),
            maxY: Math.max(this.y1, this.y2)
        };
    }
    
    translate(dx, dy) {
        this.x1 += dx;
        this.y1 += dy;
        this.x2 += dx;
        this.y2 += dy;
    }
    
    getLength() {
        return Math.sqrt((this.x2 - this.x1) ** 2 + (this.y2 - this.y1) ** 2);
    }
    
    // Get point at parameter t (0 to 1)
    pointAt(t) {
        return {
            x: this.x1 + t * (this.x2 - this.x1),
            y: this.y1 + t * (this.y2 - this.y1)
        };
    }
    
    // Get direction vector (normalized)
    getDirection() {
        const len = this.getLength();
        if (len === 0) return { x: 1, y: 0 };
        return {
            x: (this.x2 - this.x1) / len,
            y: (this.y2 - this.y1) / len
        };
    }
}

class Rectangle extends Entity {
    constructor(x1, y1, x2, y2) {
        super('rect');
        this.x1 = Math.min(x1, x2);
        this.y1 = Math.min(y1, y2);
        this.x2 = Math.max(x1, x2);
        this.y2 = Math.max(y1, y2);
    }
    
    getBounds() {
        return {
            minX: this.x1,
            minY: this.y1,
            maxX: this.x2,
            maxY: this.y2
        };
    }
    
    translate(dx, dy) {
        this.x1 += dx;
        this.y1 += dy;
        this.x2 += dx;
        this.y2 += dy;
    }
    
    getWidth() {
        return Math.abs(this.x2 - this.x1);
    }
    
    getHeight() {
        return Math.abs(this.y2 - this.y1);
    }
    
    // Convert rectangle to 4 lines
    toLines() {
        return [
            new Line(this.x1, this.y1, this.x2, this.y1), // Bottom
            new Line(this.x2, this.y1, this.x2, this.y2), // Right
            new Line(this.x2, this.y2, this.x1, this.y2), // Top
            new Line(this.x1, this.y2, this.x1, this.y1)  // Left
        ];
    }
}

class Circle extends Entity {
    constructor(cx, cy, radius) {
        super('circle');
        this.cx = cx;
        this.cy = cy;
        this.radius = radius;
    }
    
    getBounds() {
        return {
            minX: this.cx - this.radius,
            minY: this.cy - this.radius,
            maxX: this.cx + this.radius,
            maxY: this.cy + this.radius
        };
    }
    
    translate(dx, dy) {
        this.cx += dx;
        this.cy += dy;
    }
    
    getCenter() {
        return { x: this.cx, y: this.cy };
    }
    
    getRadius() {
        return this.radius;
    }
    
    getDiameter() {
        return this.radius * 2;
    }
    
    getCircumference() {
        return 2 * Math.PI * this.radius;
    }
    
    getArea() {
        return Math.PI * this.radius * this.radius;
    }
}

class Arc extends Entity {
    constructor(cx, cy, radius, startAngle, endAngle) {
        super('arc');
        this.cx = cx;
        this.cy = cy;
        this.radius = radius;
        this.startAngle = startAngle;  // in radians
        this.endAngle = endAngle;      // in radians
    }
    
    getBounds() {
        // Simplified bounds - could be more precise by checking arc endpoints
        return {
            minX: this.cx - this.radius,
            minY: this.cy - this.radius,
            maxX: this.cx + this.radius,
            maxY: this.cy + this.radius
        };
    }
    
    translate(dx, dy) {
        this.cx += dx;
        this.cy += dy;
    }
    
    getCenter() {
        return { x: this.cx, y: this.cy };
    }
    
    getRadius() {
        return this.radius;
    }
    
    getStartPoint() {
        return {
            x: this.cx + this.radius * Math.cos(this.startAngle),
            y: this.cy + this.radius * Math.sin(this.startAngle)
        };
    }
    
    getEndPoint() {
        return {
            x: this.cx + this.radius * Math.cos(this.endAngle),
            y: this.cy + this.radius * Math.sin(this.endAngle)
        };
    }
    
    getArcLength() {
        let angle = this.endAngle - this.startAngle;
        if (angle < 0) angle += 2 * Math.PI;
        return this.radius * angle;
    }
    
    // Normalize angle to [0, 2*PI)
    static normalizeAngle(angle) {
        while (angle < 0) angle += 2 * Math.PI;
        while (angle >= 2 * Math.PI) angle -= 2 * Math.PI;
        return angle;
    }
    
    // Check if an angle is within the arc span
    containsAngle(angle) {
        angle = Arc.normalizeAngle(angle);
        let start = Arc.normalizeAngle(this.startAngle);
        let end = Arc.normalizeAngle(this.endAngle);
        
        // Calculate the arc sweep
        let sweep = end - start;
        if (sweep < 0) sweep += 2 * Math.PI;
        
        // Calculate angle relative to start
        let relAngle = angle - start;
        if (relAngle < 0) relAngle += 2 * Math.PI;
        
        // Angle is contained if it's within the sweep
        // Add small tolerance for edge cases
        return relAngle <= sweep + 0.001;
    }
    
    // Get the sweep angle of the arc
    getSweepAngle() {
        let sweep = this.endAngle - this.startAngle;
        if (sweep < 0) sweep += 2 * Math.PI;
        return sweep;
    }
}

class Dimension extends Entity {
    constructor(x1, y1, x2, y2) {
        super('dim');
        this.x1 = x1;
        this.y1 = y1;
        this.x2 = x2;
        this.y2 = y2;
        this.offset = CONFIG.dimensionOffset;
    }
    
    getBounds() {
        const offset = this.offset;
        return {
            minX: Math.min(this.x1, this.x2) - offset,
            minY: Math.min(this.y1, this.y2) - offset,
            maxX: Math.max(this.x1, this.x2) + offset,
            maxY: Math.max(this.y1, this.y2) + offset
        };
    }
    
    translate(dx, dy) {
        this.x1 += dx;
        this.y1 += dy;
        this.x2 += dx;
        this.y2 += dy;
    }
    
    getLength() {
        return Math.sqrt((this.x2 - this.x1) ** 2 + (this.y2 - this.y1) ** 2);
    }
    
    getText() {
        return Units.format(this.getLength());
    }
}

class Text extends Entity {
    constructor(x, y, text, height = 5, rotation = 0) {
        super('text');
        this.x = x;           // Insertion point X
        this.y = y;           // Insertion point Y
        this.text = text;     // Text content
        this.height = height; // Text height in world units
        this.rotation = rotation; // Rotation in radians
    }
    
    getBounds() {
        // Approximate bounds based on text height and estimated width
        const estimatedWidth = this.text.length * this.height * 0.6;
        const cos = Math.cos(this.rotation);
        const sin = Math.sin(this.rotation);
        
        // Calculate rotated corners
        const corners = [
            { x: 0, y: 0 },
            { x: estimatedWidth, y: 0 },
            { x: estimatedWidth, y: this.height },
            { x: 0, y: this.height }
        ];
        
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        
        for (const corner of corners) {
            const rx = this.x + corner.x * cos - corner.y * sin;
            const ry = this.y + corner.x * sin + corner.y * cos;
            minX = Math.min(minX, rx);
            minY = Math.min(minY, ry);
            maxX = Math.max(maxX, rx);
            maxY = Math.max(maxY, ry);
        }
        
        return { minX, minY, maxX, maxY };
    }
    
    translate(dx, dy) {
        this.x += dx;
        this.y += dy;
    }
    
    getCenter() {
        const estimatedWidth = this.text.length * this.height * 0.6;
        return {
            x: this.x + estimatedWidth / 2,
            y: this.y + this.height / 2
        };
    }
}

// ============================================
// VIEW TRANSFORM
// ============================================

class ViewTransform {
    constructor() {
        this.offsetX = 0;
        this.offsetY = 0;
        this.scale = 1;  // pixels per world unit
    }
    
    // World to screen coordinates
    worldToScreen(wx, wy) {
        return {
            x: wx * this.scale + this.offsetX,
            y: -wy * this.scale + this.offsetY  // Flip Y for CAD coordinate system
        };
    }
    
    // Screen to world coordinates
    screenToWorld(sx, sy) {
        return {
            x: (sx - this.offsetX) / this.scale,
            y: -(sy - this.offsetY) / this.scale  // Flip Y
        };
    }
    
    // Pan by screen delta
    pan(dx, dy) {
        this.offsetX += dx;
        this.offsetY += dy;
    }
    
    // Zoom about a screen point
    zoomAt(screenX, screenY, factor) {
        // Get world position before zoom
        const worldPos = this.screenToWorld(screenX, screenY);
        
        // Apply zoom
        this.scale *= factor;
        this.scale = Math.max(CONFIG.minZoom, Math.min(CONFIG.maxZoom, this.scale));
        
        // Get new screen position of the same world point
        const newScreen = this.worldToScreen(worldPos.x, worldPos.y);
        
        // Adjust offset to keep world point under cursor
        this.offsetX += screenX - newScreen.x;
        this.offsetY += screenY - newScreen.y;
    }
    
    // Fit view to bounds
    fitToBounds(bounds, canvasWidth, canvasHeight, padding = 50) {
        if (!bounds) return;
        
        const width = bounds.maxX - bounds.minX;
        const height = bounds.maxY - bounds.minY;
        
        if (width === 0 && height === 0) {
            this.scale = 1;
            this.offsetX = canvasWidth / 2;
            this.offsetY = canvasHeight / 2;
            return;
        }
        
        // Calculate scale to fit
        const scaleX = (canvasWidth - padding * 2) / (width || 1);
        const scaleY = (canvasHeight - padding * 2) / (height || 1);
        this.scale = Math.min(scaleX, scaleY);
        
        // Center the view
        const centerX = (bounds.minX + bounds.maxX) / 2;
        const centerY = (bounds.minY + bounds.maxY) / 2;
        
        const screenCenter = this.worldToScreen(centerX, centerY);
        this.offsetX += canvasWidth / 2 - screenCenter.x;
        this.offsetY += canvasHeight / 2 - screenCenter.y;
    }
}

// ============================================
// GEOMETRY UTILITIES
// ============================================

const Geometry = {
    // Distance from point to line segment
    pointToLineDistance(px, py, x1, y1, x2, y2) {
        const A = px - x1;
        const B = py - y1;
        const C = x2 - x1;
        const D = y2 - y1;
        
        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        let param = lenSq !== 0 ? dot / lenSq : -1;
        
        let xx, yy;
        
        if (param < 0) {
            xx = x1;
            yy = y1;
        } else if (param > 1) {
            xx = x2;
            yy = y2;
        } else {
            xx = x1 + param * C;
            yy = y1 + param * D;
        }
        
        const dx = px - xx;
        const dy = py - yy;
        return Math.sqrt(dx * dx + dy * dy);
    },
    
    // Distance from point to rectangle edges
    pointToRectDistance(px, py, rect) {
        const edges = [
            [rect.x1, rect.y1, rect.x2, rect.y1],
            [rect.x2, rect.y1, rect.x2, rect.y2],
            [rect.x2, rect.y2, rect.x1, rect.y2],
            [rect.x1, rect.y2, rect.x1, rect.y1]
        ];
        
        return Math.min(...edges.map(e => 
            this.pointToLineDistance(px, py, e[0], e[1], e[2], e[3])
        ));
    },
    
    // Line-line intersection
    lineIntersection(x1, y1, x2, y2, x3, y3, x4, y4) {
        const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
        if (Math.abs(denom) < 1e-10) return null;  // Parallel
        
        const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
        const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;
        
        return {
            x: x1 + t * (x2 - x1),
            y: y1 + t * (y2 - y1),
            t: t,
            u: u
        };
    },
    
    // Check if point is on segment
    isPointOnSegment(px, py, x1, y1, x2, y2, tolerance = 0.001) {
        const d = this.pointToLineDistance(px, py, x1, y1, x2, y2);
        if (d > tolerance) return false;
        
        const minX = Math.min(x1, x2) - tolerance;
        const maxX = Math.max(x1, x2) + tolerance;
        const minY = Math.min(y1, y2) - tolerance;
        const maxY = Math.max(y1, y2) + tolerance;
        
        return px >= minX && px <= maxX && py >= minY && py <= maxY;
    },
    
    // Snap point to grid
    snapToGrid(x, y, gridSize) {
        return {
            x: Math.round(x / gridSize) * gridSize,
            y: Math.round(y / gridSize) * gridSize
        };
    },
    
    // Check if two line segments intersect
    lineLineIntersect(ax1, ay1, ax2, ay2, bx1, by1, bx2, by2) {
        const int = this.lineIntersection(ax1, ay1, ax2, ay2, bx1, by1, bx2, by2);
        if (!int) return false;
        // Both t and u must be in [0, 1] for segments to intersect
        return int.t >= 0 && int.t <= 1 && int.u >= 0 && int.u <= 1;
    }
};

// ============================================
// CAD APPLICATION
// ============================================

class WebCAD {
    constructor() {
        this.canvas = document.getElementById('cadCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        this.entities = [];
        this.view = new ViewTransform();
        
        this.currentTool = 'select';
        this.snapEnabled = true;
        this.centerSnapEnabled = true;
        this.orthoEnabled = false;
        this.orthoStep = 45;  // Angle step in degrees
        
        // Active snap point (for visual feedback)
        this.activeSnapPoint = null;
        this.snapType = null;  // 'grid', 'center', 'endpoint', 'midpoint', 'ortho'
        
        // Tool state
        this.toolState = {
            startPoint: null,
            previewPoint: null,
            selectedEntities: [],
            dragStart: null,
            isDragging: false,
            trimPreview: null,
            extendPreview: null,
            continuousMode: true,  // For line tool continuous drawing
            inputLength: null,
            inputAngle: null,
            // Selection box
            selectionBoxStart: null,
            selectionBoxEnd: null,
            isSelectionBox: false,
            // Scale tool
            scaleBasePoint: null,
            scaleEntities: [],
            // Rotate tool
            rotateCenter: null,
            rotateEntities: [],
            rotateStartAngle: null,
            // Offset tool
            offsetEntity: null,
            offsetDistance: 10,
            // Arc tool (3-point arc)
            arcPoint1: null,
            arcPoint2: null,
            // Grip editing (endpoint dragging)
            activeGrip: null,  // { entity, gripType, gripIndex }
            isGripDragging: false,
            // Pattern tools
            patternEntities: [],
            patternBasePoint: null,
            patternType: null,  // 'rect' or 'circ'
            patternPreview: null,
            // Alignment tracking
            trackingPoints: [],  // Points being tracked for alignment
            activeTrackingLine: null  // Current alignment line being snapped to
        };
        
        // Tracking enabled state
        this.trackingEnabled = true;
        
        // Performance optimization
        this.renderPending = false;
        this.snapPointsCache = null;
        this.snapPointsCacheValid = false;
        
        // History/Undo system
        this.history = [];
        this.historyIndex = -1;
        this.maxHistory = 50;
        this.isUndoRedo = false;  // Flag to prevent saving during undo/redo
        
        // Dimension input state
        this.dimInputVisible = false;
        
        // Mouse state
        this.mouse = {
            screen: { x: 0, y: 0 },
            world: { x: 0, y: 0 },
            snapped: { x: 0, y: 0 },
            isDown: false,
            button: 0
        };
        
        this.hoveredEntity = null;
        this.isPanning = false;
        this.panStart = { x: 0, y: 0 };
        
        this.init();
    }
    
    init() {
        this.setupCanvas();
        this.setupEventListeners();
        this.setTool('select');
        this.centerView();
        this.render();
        
        // Initialize history with empty state
        this.saveToHistory();
    }
    
    setupCanvas() {
        const resize = () => {
            const container = this.canvas.parentElement;
            const dpr = window.devicePixelRatio || 1;
            
            this.canvas.width = container.clientWidth * dpr;
            this.canvas.height = container.clientHeight * dpr;
            this.canvas.style.width = container.clientWidth + 'px';
            this.canvas.style.height = container.clientHeight + 'px';
            
            this.ctx.scale(dpr, dpr);
            this.render();
        };
        
        window.addEventListener('resize', resize);
        resize();
    }
    
    setupEventListeners() {
        // Canvas mouse events
        this.canvas.addEventListener('mousedown', (e) => {
            // Blur any focused inputs when clicking canvas
            if (document.activeElement && document.activeElement.tagName === 'INPUT') {
                document.activeElement.blur();
            }
            this.onMouseDown(e);
        });
        this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
        this.canvas.addEventListener('wheel', this.onWheel.bind(this), { passive: false });
        this.canvas.addEventListener('contextmenu', e => e.preventDefault());
        
        // Keyboard events
        document.addEventListener('keydown', this.onKeyDown.bind(this));
        
        // Tool buttons
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const tool = btn.dataset.tool;
                if (tool) this.setTool(tool);
            });
        });
        
        // Action buttons
        document.getElementById('deleteBtn').addEventListener('click', () => this.deleteSelected());
        document.getElementById('zoomExtentsBtn').addEventListener('click', () => this.zoomExtents());
        document.getElementById('zoomInBtn').addEventListener('click', () => this.zoomIn());
        document.getElementById('zoomOutBtn').addEventListener('click', () => this.zoomOut());
        
        // File buttons
        document.getElementById('newBtn').addEventListener('click', () => this.newDrawing());
        document.getElementById('loadBtn').addEventListener('click', () => this.loadFile());
        document.getElementById('saveBtn').addEventListener('click', () => this.showSaveDialog());
        
        // Save dialog
        document.getElementById('saveDialogClose').addEventListener('click', () => this.hideSaveDialog());
        document.getElementById('saveCancelBtn').addEventListener('click', () => this.hideSaveDialog());
        document.getElementById('saveConfirmBtn').addEventListener('click', () => this.performSave());
        document.getElementById('saveFileName').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.performSave();
            if (e.key === 'Escape') this.hideSaveDialog();
        });
        
        // Snap toggles
        document.getElementById('snapToggle').addEventListener('change', (e) => {
            this.snapEnabled = e.target.checked;
        });
        
        document.getElementById('centerSnapToggle').addEventListener('change', (e) => {
            this.centerSnapEnabled = e.target.checked;
        });
        
        document.getElementById('orthoToggle').addEventListener('change', (e) => {
            this.orthoEnabled = e.target.checked;
        });
        
        document.getElementById('trackingToggle').addEventListener('change', (e) => {
            this.trackingEnabled = e.target.checked;
        });
        
        const orthoStepInput = document.getElementById('orthoStep');
        orthoStepInput.addEventListener('change', (e) => {
            const value = parseInt(e.target.value);
            if (value >= 1 && value <= 90) {
                this.orthoStep = value;
            }
        });
        
        // Blur ortho input on Enter key
        orthoStepInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.target.blur();
            }
        });
        
        // File input
        document.getElementById('fileInput').addEventListener('change', (e) => {
            this.handleFileLoad(e.target.files[0]);
        });
        
        // Properties panel
        document.getElementById('closePanelBtn').addEventListener('click', () => {
            document.getElementById('propertiesPanel').classList.remove('open');
        });
        
        // Unit selector
        document.getElementById('unitSelect').addEventListener('change', (e) => {
            this.setUnits(e.target.value);
        });
        
        // Dimension input panel
        document.getElementById('dimInputClose').addEventListener('click', () => {
            this.hideDimensionInput();
        });
        
        document.getElementById('dimApplyBtn').addEventListener('click', () => {
            this.applyDimensionInput();
        });
        
        document.getElementById('dimCancelBtn').addEventListener('click', () => {
            this.hideDimensionInput();
        });
        
        // Make dimension input panel draggable
        this.setupDraggablePanel();
        
        // Handle Enter key in dimension input fields
        const dimInputHandler = (e) => {
            if (e.key === 'Enter') {
                this.applyDimensionInput();
            } else if (e.key === 'Escape') {
                this.hideDimensionInput();
            }
        };
        
        document.getElementById('inputLength').addEventListener('keydown', dimInputHandler);
        document.getElementById('inputAngle').addEventListener('keydown', dimInputHandler);
        document.getElementById('inputWidth').addEventListener('keydown', dimInputHandler);
        document.getElementById('inputHeight').addEventListener('keydown', dimInputHandler);
        document.getElementById('inputRadius').addEventListener('keydown', dimInputHandler);
        
        const offsetInput = document.getElementById('inputOffset');
        const scaleInput = document.getElementById('inputScale');
        if (offsetInput) offsetInput.addEventListener('keydown', dimInputHandler);
        if (scaleInput) scaleInput.addEventListener('keydown', dimInputHandler);
        
        // Pattern input handlers
        const patternInputs = [
            'patternCountX', 'patternCountY', 'patternSpacingX', 'patternSpacingY',
            'patternCount', 'patternRadiusInput', 'patternStartAngle', 'patternSweep'
        ];
        patternInputs.forEach(id => {
            const input = document.getElementById(id);
            if (input) input.addEventListener('keydown', dimInputHandler);
        });
    }
    
    // ----------------------------------------
    // UNIT HANDLING
    // ----------------------------------------
    
    setUnits(units) {
        CONFIG.units = units;
        
        // Update dimension input unit label
        document.getElementById('lengthUnit').textContent = units;
        
        // Update coordinate display
        this.updateMousePosition({ 
            clientX: this.mouse.screen.x + this.canvas.getBoundingClientRect().left,
            clientY: this.mouse.screen.y + this.canvas.getBoundingClientRect().top
        });
        
        // Re-render to update dimension labels
        this.render();
    }
    
    // ----------------------------------------
    // MOUSE HANDLERS
    // ----------------------------------------
    
    updateMousePosition(e) {
        const rect = this.canvas.getBoundingClientRect();
        this.mouse.screen.x = e.clientX - rect.left;
        this.mouse.screen.y = e.clientY - rect.top;
        
        this.mouse.world = this.view.screenToWorld(this.mouse.screen.x, this.mouse.screen.y);
        
        // Reset snap state
        this.activeSnapPoint = null;
        this.snapType = null;
        this.toolState.activeTrackingLine = null;
        
        // Start with raw world position
        let snappedPos = { ...this.mouse.world };
        
        // Update tracking points when drawing
        if (this.trackingEnabled && this.toolState.startPoint && this.centerSnapEnabled) {
            this.updateTrackingPoints(this.mouse.world);
        } else if (!this.toolState.startPoint) {
            // Clear tracking points when not drawing
            this.toolState.trackingPoints = [];
        }
        
        // Priority: Direct snap points > Combined snapping > Grid
        // First, check for direct snap points (endpoints, midpoints, centers, etc.)
        let foundSnapPoint = false;
        if (this.centerSnapEnabled) {
            const snapResult = this.findSnapPoint(this.mouse.world);
            if (snapResult) {
                snappedPos = { x: snapResult.x, y: snapResult.y };
                this.activeSnapPoint = snapResult;
                this.snapType = snapResult.type;
                foundSnapPoint = true;
            }
        }
        
        // If no direct snap, apply ortho and/or tracking
        if (!foundSnapPoint) {
            let orthoPos = null;
            let trackingResult = null;
            
            // Calculate ortho position if enabled and we have a start point
            if (this.orthoEnabled && this.toolState.startPoint) {
                orthoPos = this.applyOrthoSnap(this.toolState.startPoint, this.mouse.world);
            }
            
            // Check tracking alignment (use ortho position if available, else raw mouse)
            if (this.trackingEnabled && this.toolState.trackingPoints.length > 0 && this.toolState.startPoint) {
                const posToCheck = orthoPos || this.mouse.world;
                trackingResult = this.findTrackingAlignment(posToCheck);
            }
            
            // Determine final position based on what's available
            if (orthoPos && trackingResult) {
                // Both ortho and tracking - find intersection on ortho line
                const orthoTrackingPos = this.combineOrthoAndTracking(
                    this.toolState.startPoint, 
                    orthoPos, 
                    trackingResult
                );
                if (orthoTrackingPos) {
                    snappedPos = orthoTrackingPos;
                    this.toolState.activeTrackingLine = trackingResult;
                    this.snapType = 'ortho+tracking';
                } else {
                    // No valid intersection, just use ortho
                    snappedPos = this.snapEnabled 
                        ? this.applyOrthoSnapWithGrid(this.toolState.startPoint, this.mouse.world)
                        : orthoPos;
                    this.snapType = 'ortho';
                }
                foundSnapPoint = true;
            } else if (orthoPos) {
                // Only ortho
                snappedPos = this.snapEnabled 
                    ? this.applyOrthoSnapWithGrid(this.toolState.startPoint, this.mouse.world)
                    : orthoPos;
                this.snapType = 'ortho';
                foundSnapPoint = true;
            } else if (trackingResult) {
                // Only tracking
                snappedPos = trackingResult.point;
                this.toolState.activeTrackingLine = trackingResult;
                this.snapType = 'tracking';
                foundSnapPoint = true;
            }
        }
        
        // If nothing else, try grid snapping
        if (!foundSnapPoint && this.snapEnabled) {
            snappedPos = Geometry.snapToGrid(
                this.mouse.world.x, 
                this.mouse.world.y, 
                CONFIG.snapGridSize
            );
            this.snapType = 'grid';
        }
        
        this.mouse.snapped = snappedPos;
        
        // Update coordinate display (convert to display units)
        const displayX = Units.toDisplay(this.mouse.snapped.x);
        const displayY = Units.toDisplay(this.mouse.snapped.y);
        document.getElementById('coordX').textContent = displayX.toFixed(2);
        document.getElementById('coordY').textContent = displayY.toFixed(2);
    }
    
    // Update tracking points based on mouse position
    updateTrackingPoints(mousePos) {
        const trackingTolerance = 15 / this.view.scale;
        
        // Find all snap points in the drawing
        const allSnapPoints = this.getAllSnapPoints();
        
        // Check if mouse is near any snap point to add it for tracking
        for (const sp of allSnapPoints) {
            const dist = Math.hypot(mousePos.x - sp.x, mousePos.y - sp.y);
            if (dist < trackingTolerance) {
                // Check if this point is already being tracked
                const alreadyTracked = this.toolState.trackingPoints.some(
                    tp => Math.hypot(tp.x - sp.x, tp.y - sp.y) < 0.001
                );
                if (!alreadyTracked) {
                    this.toolState.trackingPoints.push({ x: sp.x, y: sp.y, type: sp.type });
                    // Limit tracking points to prevent clutter
                    if (this.toolState.trackingPoints.length > 5) {
                        this.toolState.trackingPoints.shift();
                    }
                }
            }
        }
    }
    
    // Get all snap points from all entities
    getAllSnapPoints() {
        // Use cached snap points if available
        if (this.snapPointsCacheValid && this.snapPointsCache) {
            return this.snapPointsCache;
        }
        
        const points = [];
        
        for (const entity of this.entities) {
            if (entity.type === 'line') {
                points.push({ x: entity.x1, y: entity.y1, type: 'endpoint' });
                points.push({ x: entity.x2, y: entity.y2, type: 'endpoint' });
                points.push({ 
                    x: (entity.x1 + entity.x2) / 2, 
                    y: (entity.y1 + entity.y2) / 2, 
                    type: 'midpoint' 
                });
            } else if (entity.type === 'circle') {
                points.push({ x: entity.cx, y: entity.cy, type: 'center' });
                points.push({ x: entity.cx + entity.radius, y: entity.cy, type: 'quadrant' });
                points.push({ x: entity.cx - entity.radius, y: entity.cy, type: 'quadrant' });
                points.push({ x: entity.cx, y: entity.cy + entity.radius, type: 'quadrant' });
                points.push({ x: entity.cx, y: entity.cy - entity.radius, type: 'quadrant' });
            } else if (entity.type === 'arc') {
                points.push({ x: entity.cx, y: entity.cy, type: 'center' });
                const startPt = entity.getStartPoint();
                const endPt = entity.getEndPoint();
                points.push({ x: startPt.x, y: startPt.y, type: 'endpoint' });
                points.push({ x: endPt.x, y: endPt.y, type: 'endpoint' });
            } else if (entity.type === 'rect') {
                points.push({ x: entity.x1, y: entity.y1, type: 'endpoint' });
                points.push({ x: entity.x2, y: entity.y1, type: 'endpoint' });
                points.push({ x: entity.x2, y: entity.y2, type: 'endpoint' });
                points.push({ x: entity.x1, y: entity.y2, type: 'endpoint' });
                points.push({ 
                    x: (entity.x1 + entity.x2) / 2, 
                    y: (entity.y1 + entity.y2) / 2, 
                    type: 'center' 
                });
            } else if (entity.type === 'text') {
                points.push({ x: entity.x, y: entity.y, type: 'insertion' });
            }
        }
        
        // Cache the results
        this.snapPointsCache = points;
        this.snapPointsCacheValid = true;
        
        return points;
    }
    
    // Combine ortho constraint with tracking alignment
    combineOrthoAndTracking(startPoint, orthoPos, trackingResult) {
        // Get the ortho line direction
        const orthoDx = orthoPos.x - startPoint.x;
        const orthoDy = orthoPos.y - startPoint.y;
        const orthoLen = Math.hypot(orthoDx, orthoDy);
        
        if (orthoLen < 0.001) return null;
        
        // Normalize ortho direction
        const orthoUnitX = orthoDx / orthoLen;
        const orthoUnitY = orthoDy / orthoLen;
        
        // The tracking gives us a target point - find where the ortho line 
        // passes closest to that point or intersects the tracking constraint
        const tp = trackingResult.fromPoint;
        
        if (trackingResult.direction === 'horizontal') {
            // Tracking wants Y = tp.y
            // Ortho line: P = startPoint + t * (orthoUnit)
            // Find t where startPoint.y + t * orthoUnitY = tp.y
            if (Math.abs(orthoUnitY) < 0.001) {
                // Ortho line is horizontal too - check if same Y
                if (Math.abs(startPoint.y - tp.y) < 1) {
                    return orthoPos; // Already on the line
                }
                return null; // Parallel, no intersection
            }
            const t = (tp.y - startPoint.y) / orthoUnitY;
            if (t > 0) { // Only forward along the ortho line
                return {
                    x: startPoint.x + t * orthoUnitX,
                    y: tp.y
                };
            }
        } else if (trackingResult.direction === 'vertical') {
            // Tracking wants X = tp.x
            if (Math.abs(orthoUnitX) < 0.001) {
                // Ortho line is vertical too - check if same X
                if (Math.abs(startPoint.x - tp.x) < 1) {
                    return orthoPos;
                }
                return null;
            }
            const t = (tp.x - startPoint.x) / orthoUnitX;
            if (t > 0) {
                return {
                    x: tp.x,
                    y: startPoint.y + t * orthoUnitY
                };
            }
        } else if (trackingResult.direction === 'intersection') {
            // Intersection of two tracking lines - this is a fixed point
            // Check if it lies on or near the ortho line
            const intPoint = trackingResult.point;
            
            // Project intersection point onto ortho line
            const toIntX = intPoint.x - startPoint.x;
            const toIntY = intPoint.y - startPoint.y;
            const projLen = toIntX * orthoUnitX + toIntY * orthoUnitY;
            
            if (projLen > 0) {
                const projX = startPoint.x + projLen * orthoUnitX;
                const projY = startPoint.y + projLen * orthoUnitY;
                
                // Check if intersection point is close to ortho line
                const distToLine = Math.hypot(intPoint.x - projX, intPoint.y - projY);
                const tolerance = 10 / this.view.scale;
                
                if (distToLine < tolerance) {
                    return { x: projX, y: projY };
                }
            }
        }
        
        return null;
    }
    
    // Find tracking alignment along an ortho-constrained line
    findTrackingAlignmentOnLine(workingPos, startPoint, isOrtho) {
        if (!isOrtho) return this.findTrackingAlignment(workingPos);
        
        const alignmentTolerance = 10 / this.view.scale;
        let bestAlignment = null;
        let bestDistance = alignmentTolerance;
        
        // Get the ortho direction
        const dx = workingPos.x - startPoint.x;
        const dy = workingPos.y - startPoint.y;
        const isHorizontalOrtho = Math.abs(dx) > Math.abs(dy);
        
        for (const tp of this.toolState.trackingPoints) {
            if (isHorizontalOrtho) {
                // Moving horizontally - check for vertical alignment with tracking points
                // The Y is fixed by ortho, so we can snap X to tracking point's X
                const dist = Math.abs(workingPos.x - tp.x);
                if (dist < bestDistance) {
                    // Check that the tracking point's Y is close to our ortho line's Y
                    if (Math.abs(tp.y - workingPos.y) < alignmentTolerance * 3) {
                        bestDistance = dist;
                        bestAlignment = {
                            point: { x: tp.x, y: workingPos.y },
                            fromPoint: tp,
                            direction: 'vertical'
                        };
                    }
                }
            } else {
                // Moving vertically - check for horizontal alignment with tracking points
                // The X is fixed by ortho, so we can snap Y to tracking point's Y
                const dist = Math.abs(workingPos.y - tp.y);
                if (dist < bestDistance) {
                    // Check that the tracking point's X is close to our ortho line's X
                    if (Math.abs(tp.x - workingPos.x) < alignmentTolerance * 3) {
                        bestDistance = dist;
                        bestAlignment = {
                            point: { x: workingPos.x, y: tp.y },
                            fromPoint: tp,
                            direction: 'horizontal'
                        };
                    }
                }
            }
        }
        
        return bestAlignment;
    }
    
    // Find if mouse is aligned with any tracking point
    findTrackingAlignment(mousePos) {
        const alignmentTolerance = 8 / this.view.scale;
        let bestAlignment = null;
        let bestDistance = alignmentTolerance;
        
        for (const tp of this.toolState.trackingPoints) {
            // Check horizontal alignment
            const hDist = Math.abs(mousePos.y - tp.y);
            if (hDist < bestDistance) {
                bestDistance = hDist;
                bestAlignment = {
                    point: { x: mousePos.x, y: tp.y },
                    fromPoint: tp,
                    direction: 'horizontal'
                };
            }
            
            // Check vertical alignment
            const vDist = Math.abs(mousePos.x - tp.x);
            if (vDist < bestDistance) {
                bestDistance = vDist;
                bestAlignment = {
                    point: { x: tp.x, y: mousePos.y },
                    fromPoint: tp,
                    direction: 'vertical'
                };
            }
        }
        
        // Check for intersection of two tracking lines
        if (this.toolState.trackingPoints.length >= 2) {
            for (let i = 0; i < this.toolState.trackingPoints.length; i++) {
                for (let j = i + 1; j < this.toolState.trackingPoints.length; j++) {
                    const tp1 = this.toolState.trackingPoints[i];
                    const tp2 = this.toolState.trackingPoints[j];
                    
                    // Intersection of horizontal from tp1 and vertical from tp2
                    const intPoint1 = { x: tp2.x, y: tp1.y };
                    const dist1 = Math.hypot(mousePos.x - intPoint1.x, mousePos.y - intPoint1.y);
                    if (dist1 < bestDistance) {
                        bestDistance = dist1;
                        bestAlignment = {
                            point: intPoint1,
                            fromPoint: tp1,
                            fromPoint2: tp2,
                            direction: 'intersection'
                        };
                    }
                    
                    // Intersection of vertical from tp1 and horizontal from tp2
                    const intPoint2 = { x: tp1.x, y: tp2.y };
                    const dist2 = Math.hypot(mousePos.x - intPoint2.x, mousePos.y - intPoint2.y);
                    if (dist2 < bestDistance) {
                        bestDistance = dist2;
                        bestAlignment = {
                            point: intPoint2,
                            fromPoint: tp1,
                            fromPoint2: tp2,
                            direction: 'intersection'
                        };
                    }
                }
            }
        }
        
        return bestAlignment;
    }
    
    // Apply ortho snapping - constrain to angle steps from start point
    applyOrthoSnap(startPoint, targetPoint) {
        const dx = targetPoint.x - startPoint.x;
        const dy = targetPoint.y - startPoint.y;
        const distance = Math.hypot(dx, dy);
        
        if (distance < 0.001) return { ...targetPoint };
        
        // Get current angle in degrees
        let angle = Math.atan2(dy, dx) * 180 / Math.PI;
        
        // Snap to nearest ortho step
        const snappedAngle = Math.round(angle / this.orthoStep) * this.orthoStep;
        const snappedRad = snappedAngle * Math.PI / 180;
        
        return {
            x: startPoint.x + distance * Math.cos(snappedRad),
            y: startPoint.y + distance * Math.sin(snappedRad)
        };
    }
    
    // Apply ortho snap with grid - snap distance to grid along ortho angle
    applyOrthoSnapWithGrid(startPoint, targetPoint) {
        if (!startPoint) return Geometry.snapToGrid(targetPoint.x, targetPoint.y, CONFIG.snapGridSize);
        
        const dx = targetPoint.x - startPoint.x;
        const dy = targetPoint.y - startPoint.y;
        const distance = Math.hypot(dx, dy);
        
        if (distance < 0.001) return { ...startPoint };
        
        // Get current angle and snap to ortho
        let angle = Math.atan2(dy, dx) * 180 / Math.PI;
        const snappedAngle = Math.round(angle / this.orthoStep) * this.orthoStep;
        const snappedRad = snappedAngle * Math.PI / 180;
        
        // Snap distance to grid
        const snappedDistance = Math.round(distance / CONFIG.snapGridSize) * CONFIG.snapGridSize;
        
        return {
            x: startPoint.x + snappedDistance * Math.cos(snappedRad),
            y: startPoint.y + snappedDistance * Math.sin(snappedRad)
        };
    }
    
    // Find snap points (centers, midpoints, endpoints)
    findSnapPoint(worldPoint) {
        const tolerance = CONFIG.hitTolerance / this.view.scale;
        let bestSnap = null;
        let bestDist = tolerance;
        
        // Use cached snap points for better performance
        const allSnapPoints = this.getAllSnapPoints();
        
        for (const snap of allSnapPoints) {
            const dist = Math.hypot(worldPoint.x - snap.x, worldPoint.y - snap.y);
            if (dist < bestDist) {
                bestDist = dist;
                bestSnap = snap;
            }
        }
        
        return bestSnap;
    }
    
    // Get all snap points for an entity
    getEntitySnapPoints(entity) {
        const points = [];
        
        if (entity.type === 'line') {
            // Endpoints
            points.push({ x: entity.x1, y: entity.y1, type: 'endpoint' });
            points.push({ x: entity.x2, y: entity.y2, type: 'endpoint' });
            // Midpoint
            points.push({ 
                x: (entity.x1 + entity.x2) / 2, 
                y: (entity.y1 + entity.y2) / 2, 
                type: 'midpoint' 
            });
        } else if (entity.type === 'circle') {
            // Center
            points.push({ x: entity.cx, y: entity.cy, type: 'center' });
            // Quadrant points
            points.push({ x: entity.cx + entity.radius, y: entity.cy, type: 'quadrant' });
            points.push({ x: entity.cx - entity.radius, y: entity.cy, type: 'quadrant' });
            points.push({ x: entity.cx, y: entity.cy + entity.radius, type: 'quadrant' });
            points.push({ x: entity.cx, y: entity.cy - entity.radius, type: 'quadrant' });
        } else if (entity.type === 'rect') {
            // Corners
            points.push({ x: entity.x1, y: entity.y1, type: 'endpoint' });
            points.push({ x: entity.x2, y: entity.y1, type: 'endpoint' });
            points.push({ x: entity.x2, y: entity.y2, type: 'endpoint' });
            points.push({ x: entity.x1, y: entity.y2, type: 'endpoint' });
            // Center
            points.push({ 
                x: (entity.x1 + entity.x2) / 2, 
                y: (entity.y1 + entity.y2) / 2, 
                type: 'center' 
            });
            // Edge midpoints
            points.push({ x: (entity.x1 + entity.x2) / 2, y: entity.y1, type: 'midpoint' });
            points.push({ x: (entity.x1 + entity.x2) / 2, y: entity.y2, type: 'midpoint' });
            points.push({ x: entity.x1, y: (entity.y1 + entity.y2) / 2, type: 'midpoint' });
            points.push({ x: entity.x2, y: (entity.y1 + entity.y2) / 2, type: 'midpoint' });
        } else if (entity.type === 'dim') {
            // Dimension endpoints
            points.push({ x: entity.x1, y: entity.y1, type: 'endpoint' });
            points.push({ x: entity.x2, y: entity.y2, type: 'endpoint' });
        } else if (entity.type === 'text') {
            // Text insertion point
            points.push({ x: entity.x, y: entity.y, type: 'insertion' });
        }
        
        return points;
    }
    
    onMouseDown(e) {
        this.updateMousePosition(e);
        this.mouse.isDown = true;
        this.mouse.button = e.button;
        
        // Middle or right mouse button = pan
        if (e.button === 1 || e.button === 2) {
            this.isPanning = true;
            this.panStart = { x: e.clientX, y: e.clientY };
            this.canvas.style.cursor = 'grabbing';
            return;
        }
        
        // Start selection box if clicking empty space in select mode
        if (this.currentTool === 'select' && !this.hoveredEntity) {
            this.toolState.selectionBoxStart = { ...this.mouse.world };
            this.toolState.selectionBoxEnd = { ...this.mouse.world };
            this.toolState.isSelectionBox = true;
        }
        
        // Left click - handle tool
        this.handleToolClick();
    }
    
    onMouseMove(e) {
        this.updateMousePosition(e);
        
        // Handle panning
        if (this.isPanning) {
            const dx = e.clientX - this.panStart.x;
            const dy = e.clientY - this.panStart.y;
            this.view.pan(dx, dy);
            this.panStart = { x: e.clientX, y: e.clientY };
            this.requestRender();
            return;
        }
        
        // Update selection box
        if (this.toolState.isSelectionBox && this.mouse.isDown) {
            this.toolState.selectionBoxEnd = { ...this.mouse.world };
        }
        
        // Handle tool-specific movement
        this.handleToolMove();
        
        // Update hover state for selection
        if (this.currentTool === 'select' && !this.toolState.isDragging && !this.toolState.isSelectionBox) {
            this.updateHover();
        }
        
        this.requestRender();
    }
    
    onMouseUp(e) {
        this.mouse.isDown = false;
        
        if (this.isPanning) {
            this.isPanning = false;
            this.updateCursor();
            return;
        }
        
        // Handle selection box completion
        if (this.toolState.isSelectionBox) {
            this.completeSelectionBox();
            this.toolState.selectionBoxStart = null;
            this.toolState.selectionBoxEnd = null;
            this.toolState.isSelectionBox = false;
            this.render();
        }
        
        // Handle grip drag end
        if (this.toolState.isGripDragging) {
            this.toolState.isGripDragging = false;
            this.toolState.activeGrip = null;
            this.toolState.dragStart = null;
            this.invalidateSnapCache();
            this.saveToHistory();
        }
        
        // Handle drag end
        if (this.toolState.isDragging) {
            this.toolState.isDragging = false;
            this.toolState.dragStart = null;
            this.invalidateSnapCache();
            this.saveToHistory();
        }
    }
    
    onWheel(e) {
        e.preventDefault();
        
        const factor = e.deltaY > 0 ? 1 / CONFIG.zoomFactor : CONFIG.zoomFactor;
        this.view.zoomAt(this.mouse.screen.x, this.mouse.screen.y, factor);
        
        this.updateZoomDisplay();
        this.render();
    }
    
    onKeyDown(e) {
        // Don't handle shortcuts when dimension input is visible
        if (this.dimInputVisible) {
            if (e.key === 'Escape') {
                this.hideDimensionInput();
            }
            return;
        }
        
        // Don't handle shortcuts when typing in an input field
        const activeElement = document.activeElement;
        const isInputFocused = activeElement && (
            activeElement.tagName === 'INPUT' || 
            activeElement.tagName === 'TEXTAREA' ||
            activeElement.tagName === 'SELECT'
        );
        
        if (isInputFocused && e.key !== 'Escape') {
            return;
        }
        
        // Check if user is typing a number (for dimension input)
        if ((this.currentTool === 'line' || this.currentTool === 'rect' || this.currentTool === 'circle') && 
            this.toolState.startPoint && 
            (e.key.match(/[0-9.]/) || e.key === '-')) {
            e.preventDefault();
            this.showDimensionInput(e.key);
            return;
        }
        
        // Allow typing offset distance at any time in offset mode
        if (this.currentTool === 'offset' && (e.key.match(/[0-9.]/) || e.key === '-')) {
            e.preventDefault();
            this.showDimensionInput('offset');
            const offsetInput = document.getElementById('inputOffset');
            if (offsetInput) {
                offsetInput.value = e.key;
            }
            return;
        }
        
        // Allow typing scale factor when base point is set
        if (this.currentTool === 'scale' && this.toolState.scaleBasePoint && (e.key.match(/[0-9.]/) || e.key === '-')) {
            e.preventDefault();
            this.showDimensionInput('scale');
            const scaleInput = document.getElementById('inputScale');
            if (scaleInput) {
                scaleInput.value = e.key;
            }
            return;
        }
        
        // Allow typing rotation angle when center point is set
        if (this.currentTool === 'rotate' && this.toolState.rotateCenter && (e.key.match(/[0-9.]/) || e.key === '-')) {
            e.preventDefault();
            this.showDimensionInput('rotate');
            const rotateInput = document.getElementById('inputRotation');
            if (rotateInput) {
                rotateInput.value = e.key;
            }
            return;
        }
        
        // Tool shortcuts
        const toolKeys = {
            'v': 'select',
            'l': 'line',
            'r': 'rect',
            'c': 'circle',
            'a': 'arc',
            'd': 'dimension',
            'x': 'text',
            't': 'trim',
            'e': 'extend',
            'f': 'offset',
            'g': 'scale',
            'o': 'rotate',
            'p': 'rectPattern'
        };
        
        // Shift+P for circular pattern
        if (e.key.toLowerCase() === 'p' && e.shiftKey && !e.ctrlKey && !e.metaKey) {
            this.setTool('circPattern');
            return;
        }
        
        if (toolKeys[e.key.toLowerCase()] && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
            this.setTool(toolKeys[e.key.toLowerCase()]);
            return;
        }
        
        // Undo/Redo shortcuts
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
            e.preventDefault();
            if (e.shiftKey) {
                this.redo();
            } else {
                this.undo();
            }
            return;
        }
        
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
            e.preventDefault();
            this.redo();
            return;
        }
        
        switch (e.key) {
            case 'Delete':
            case 'Backspace':
                this.deleteSelected();
                break;
            case 'Escape':
                this.cancelTool();
                break;
            case 'Enter':
                // In scale mode, Enter advances to next step
                if (this.currentTool === 'scale' && this.toolState.scaleEntities.length > 0 && !this.toolState.scaleBasePoint) {
                    this.updateStatus();
                }
                break;
            case 'z':
            case 'Z':
                this.zoomExtents();
                break;
            case '+':
            case '=':
                this.zoomIn();
                break;
            case '-':
                this.zoomOut();
                break;
            case 'o':
            case 'O':
                // Toggle ortho mode
                this.orthoEnabled = !this.orthoEnabled;
                document.getElementById('orthoToggle').checked = this.orthoEnabled;
                this.render();
                break;
        }
    }
    
    // ----------------------------------------
    // DIMENSION INPUT
    // ----------------------------------------
    
    showDimensionInput(initialKey = '') {
        const panel = document.getElementById('dimensionInput');
        const lineFields = document.getElementById('lineInputFields');
        const rectFields = document.getElementById('rectInputFields');
        const title = document.getElementById('dimInputTitle');
        
        // Hide all input field groups first
        lineFields.style.display = 'none';
        rectFields.style.display = 'none';
        document.getElementById('circleInputFields').style.display = 'none';
        document.getElementById('textInputFields').style.display = 'none';
        const offsetFields = document.getElementById('offsetInputFields');
        const scaleFields = document.getElementById('scaleInputFields');
        const rotateFields = document.getElementById('rotateInputFields');
        if (offsetFields) offsetFields.style.display = 'none';
        if (scaleFields) scaleFields.style.display = 'none';
        if (rotateFields) rotateFields.style.display = 'none';
        
        if (this.currentTool === 'line') {
            // Show line input fields
            lineFields.style.display = 'flex';
            title.textContent = 'Enter Line Dimensions';
            
            const lengthInput = document.getElementById('inputLength');
            const angleInput = document.getElementById('inputAngle');
            
            // Calculate current preview length and angle
            if (this.toolState.startPoint && this.toolState.previewPoint) {
                const dx = this.toolState.previewPoint.x - this.toolState.startPoint.x;
                const dy = this.toolState.previewPoint.y - this.toolState.startPoint.y;
                const length = Math.sqrt(dx * dx + dy * dy);
                const angle = Math.atan2(dy, dx) * 180 / Math.PI;
                
                lengthInput.value = Units.toDisplay(length).toFixed(2);
                angleInput.value = angle.toFixed(1);
            } else {
                lengthInput.value = '';
                angleInput.value = '0';
            }
            
            // If initial key provided, start with that
            if (initialKey) {
                lengthInput.value = initialKey;
            }
            
            // Update unit label
            document.getElementById('lengthUnit').textContent = CONFIG.units;
            
            panel.classList.add('visible');
            this.dimInputVisible = true;
            lengthInput.focus();
            lengthInput.select();
            
        } else if (this.currentTool === 'rect') {
            // Show rectangle input fields
            rectFields.style.display = 'flex';
            title.textContent = 'Enter Rectangle Dimensions';
            
            const widthInput = document.getElementById('inputWidth');
            const heightInput = document.getElementById('inputHeight');
            
            // Calculate current preview dimensions
            if (this.toolState.startPoint && this.toolState.previewPoint) {
                const width = Math.abs(this.toolState.previewPoint.x - this.toolState.startPoint.x);
                const height = Math.abs(this.toolState.previewPoint.y - this.toolState.startPoint.y);
                
                widthInput.value = Units.toDisplay(width).toFixed(2);
                heightInput.value = Units.toDisplay(height).toFixed(2);
            } else {
                widthInput.value = '';
                heightInput.value = '';
            }
            
            // If initial key provided, start with that
            if (initialKey) {
                widthInput.value = initialKey;
            }
            
            // Update unit labels
            document.getElementById('widthUnit').textContent = CONFIG.units;
            document.getElementById('heightUnit').textContent = CONFIG.units;
            
            panel.classList.add('visible');
            this.dimInputVisible = true;
            widthInput.focus();
            widthInput.select();
            
        } else if (this.currentTool === 'circle') {
            // Show circle input fields
            document.getElementById('circleInputFields').style.display = 'flex';
            title.textContent = 'Enter Circle Radius';
            
            const radiusInput = document.getElementById('inputRadius');
            
            // Calculate current preview radius
            if (this.toolState.startPoint && this.toolState.previewPoint) {
                const radius = Math.hypot(
                    this.toolState.previewPoint.x - this.toolState.startPoint.x,
                    this.toolState.previewPoint.y - this.toolState.startPoint.y
                );
                radiusInput.value = Units.toDisplay(radius).toFixed(2);
            } else {
                radiusInput.value = '';
            }
            
            // If initial key provided, start with that
            if (initialKey) {
                radiusInput.value = initialKey;
            }
            
            // Update unit label
            document.getElementById('radiusUnit').textContent = CONFIG.units;
            
            panel.classList.add('visible');
            this.dimInputVisible = true;
            radiusInput.focus();
            radiusInput.select();
        } else if (initialKey === 'offset') {
            // Show offset input fields
            if (offsetFields) offsetFields.style.display = 'flex';
            title.textContent = 'Enter Offset Distance';
            
            const offsetInput = document.getElementById('inputOffset');
            offsetInput.value = Units.toDisplay(this.toolState.offsetDistance).toFixed(2);
            
            // Update unit label
            document.getElementById('offsetUnit').textContent = CONFIG.units;
            
            panel.classList.add('visible');
            this.dimInputVisible = true;
            this.dimInputType = 'offset';
            offsetInput.focus();
            offsetInput.select();
        } else if (initialKey === 'scale') {
            // Show scale input fields
            if (scaleFields) scaleFields.style.display = 'flex';
            title.textContent = 'Enter Scale Factor';
            
            const scaleInput = document.getElementById('inputScale');
            scaleInput.value = '1';
            
            panel.classList.add('visible');
            this.dimInputVisible = true;
            this.dimInputType = 'scale';
            scaleInput.focus();
            scaleInput.select();
        } else if (initialKey === 'rotate') {
            // Show rotate input fields
            const rotateFields = document.getElementById('rotateInputFields');
            if (rotateFields) rotateFields.style.display = 'flex';
            title.textContent = 'Enter Rotation Angle';
            
            const rotateInput = document.getElementById('inputRotation');
            rotateInput.value = '0';
            
            panel.classList.add('visible');
            this.dimInputVisible = true;
            this.dimInputType = 'rotate';
            rotateInput.focus();
            rotateInput.select();
        }
    }
    
    hideDimensionInput() {
        const panel = document.getElementById('dimensionInput');
        panel.classList.remove('visible');
        panel.classList.remove('dragging');
        this.dimInputVisible = false;
        this.toolState.patternPreview = null;
        // Reset position to center for next time
        panel.style.left = '50%';
        panel.style.top = '50%';
        panel.style.transform = 'translate(-50%, -50%)';
        this.canvas.focus();
        this.render();
    }
    
    setupDraggablePanel() {
        const panel = document.getElementById('dimensionInput');
        const header = document.querySelector('.dim-input-header');
        
        let isDragging = false;
        let dragOffsetX = 0;
        let dragOffsetY = 0;
        
        header.addEventListener('mousedown', (e) => {
            // Don't drag if clicking on close button
            if (e.target.classList.contains('dim-input-close')) return;
            
            isDragging = true;
            panel.classList.add('dragging');
            
            const rect = panel.getBoundingClientRect();
            dragOffsetX = e.clientX - rect.left;
            dragOffsetY = e.clientY - rect.top;
            
            // Remove transform so we can use absolute positioning
            panel.style.transform = 'none';
            panel.style.left = rect.left + 'px';
            panel.style.top = rect.top + 'px';
            
            e.preventDefault();
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            const container = this.canvas.parentElement;
            const containerRect = container.getBoundingClientRect();
            
            let newX = e.clientX - dragOffsetX - containerRect.left;
            let newY = e.clientY - dragOffsetY - containerRect.top;
            
            // Keep panel within bounds
            const panelRect = panel.getBoundingClientRect();
            newX = Math.max(0, Math.min(newX, containerRect.width - panelRect.width));
            newY = Math.max(0, Math.min(newY, containerRect.height - panelRect.height));
            
            panel.style.left = newX + 'px';
            panel.style.top = newY + 'px';
        });
        
        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                panel.classList.remove('dragging');
            }
        });
        
        // Setup live preview for pattern inputs
        this.setupPatternLivePreview();
    }
    
    setupPatternLivePreview() {
        const patternInputs = [
            'patternCountX', 'patternCountY', 'patternSpacingX', 'patternSpacingY',
            'patternCount', 'patternRadiusInput', 'patternStartAngle', 'patternSweep'
        ];
        
        patternInputs.forEach(id => {
            const input = document.getElementById(id);
            if (input) {
                input.addEventListener('input', () => {
                    this.updatePatternPreview();
                });
            }
        });
    }
    
    updatePatternPreview() {
        // Store preview data for rendering
        if (this.dimInputType === 'rectPattern') {
            this.toolState.patternPreview = this.calculateRectPatternPreview();
        } else if (this.dimInputType === 'circPattern') {
            this.toolState.patternPreview = this.calculateCircPatternPreview();
        }
        this.render();
    }
    
    calculateRectPatternPreview() {
        const countX = parseInt(document.getElementById('patternCountX').value) || 1;
        const countY = parseInt(document.getElementById('patternCountY').value) || 1;
        const spacingX = Units.toInternal(parseFloat(document.getElementById('patternSpacingX').value) || 0);
        const spacingY = Units.toInternal(parseFloat(document.getElementById('patternSpacingY').value) || 0);
        
        if (!this.toolState.patternBasePoint || this.toolState.patternEntities.length === 0) {
            return null;
        }
        
        const previewEntities = [];
        const sourceEntities = this.toolState.patternEntities;
        
        // Create preview copies for each grid position (skip 0,0 as that's the original)
        for (let ix = 0; ix < countX; ix++) {
            for (let iy = 0; iy < countY; iy++) {
                if (ix === 0 && iy === 0) continue;
                
                const offsetX = ix * spacingX;
                const offsetY = iy * spacingY;
                
                for (const entity of sourceEntities) {
                    const copy = this.cloneEntity(entity);
                    if (copy) {
                        copy.translate(offsetX, offsetY);
                        previewEntities.push(copy);
                    }
                }
            }
        }
        
        return { type: 'rect', entities: previewEntities };
    }
    
    calculateCircPatternPreview() {
        const count = parseInt(document.getElementById('patternCount').value) || 2;
        const startAngle = (parseFloat(document.getElementById('patternStartAngle').value) || 0) * Math.PI / 180;
        const sweepAngle = (parseFloat(document.getElementById('patternSweep').value) || 360) * Math.PI / 180;
        
        if (!this.toolState.patternBasePoint || this.toolState.patternEntities.length === 0) {
            return null;
        }
        
        const previewEntities = [];
        const centerPoint = this.toolState.patternBasePoint;
        const sourceEntities = this.toolState.patternEntities;
        
        // Calculate angle step - for 360° sweep, divide by count (items evenly around circle)
        // For partial sweep, divide by count-1 (items at start and end of sweep)
        const isFull360 = Math.abs(sweepAngle - Math.PI * 2) < 0.01;
        const angleStep = isFull360 ? sweepAngle / count : sweepAngle / Math.max(1, count - 1);
        
        // Create preview copies for each angular position
        for (let i = 0; i < count; i++) {
            const angle = startAngle + i * angleStep;
            
            for (const entity of sourceEntities) {
                const copy = this.cloneEntity(entity);
                if (copy) {
                    if (i > 0 || Math.abs(startAngle) > 0.001) {
                        this.rotateEntityAroundPoint(copy, centerPoint, angle);
                    }
                    previewEntities.push(copy);
                }
            }
        }
        
        return { type: 'circ', entities: previewEntities, centerPoint };
    }
    
    applyDimensionInput() {
        if (this.currentTool === 'line') {
            const lengthInput = document.getElementById('inputLength');
            const angleInput = document.getElementById('inputAngle');
            
            const lengthValue = parseFloat(lengthInput.value);
            const angleValue = parseFloat(angleInput.value) || 0;
            
            if (isNaN(lengthValue) || lengthValue <= 0) {
                lengthInput.focus();
                return;
            }
            
            // Convert to internal units (mm)
            const length = Units.toInternal(lengthValue);
            const angleRad = angleValue * Math.PI / 180;
            
            if (this.toolState.startPoint) {
                // Calculate end point
                const endX = this.toolState.startPoint.x + length * Math.cos(angleRad);
                const endY = this.toolState.startPoint.y + length * Math.sin(angleRad);
                
                // Create line with exact dimensions
                const line = new Line(
                    this.toolState.startPoint.x,
                    this.toolState.startPoint.y,
                    endX,
                    endY
                );
                this.entities.push(line);
                this.invalidateSnapCache();
                this.saveToHistory();
                
                // Continue from end point (continuous mode)
                this.toolState.startPoint = { x: endX, y: endY };
                this.toolState.previewPoint = { ...this.toolState.startPoint };
            }
            
        } else if (this.currentTool === 'rect') {
            const widthInput = document.getElementById('inputWidth');
            const heightInput = document.getElementById('inputHeight');
            
            const widthValue = parseFloat(widthInput.value);
            const heightValue = parseFloat(heightInput.value);
            
            if (isNaN(widthValue) || widthValue <= 0) {
                widthInput.focus();
                return;
            }
            
            if (isNaN(heightValue) || heightValue <= 0) {
                heightInput.focus();
                return;
            }
            
            // Convert to internal units (mm)
            const width = Units.toInternal(widthValue);
            const height = Units.toInternal(heightValue);
            
            if (this.toolState.startPoint) {
                const x1 = this.toolState.startPoint.x;
                const y1 = this.toolState.startPoint.y;
                const x2 = x1 + width;
                const y2 = y1 + height;
                
                // Create 4 separate lines
                this.entities.push(new Line(x1, y1, x2, y1)); // Bottom
                this.entities.push(new Line(x2, y1, x2, y2)); // Right
                this.entities.push(new Line(x2, y2, x1, y2)); // Top
                this.entities.push(new Line(x1, y2, x1, y1)); // Left
                
                this.invalidateSnapCache();
                this.saveToHistory();
                this.toolState.startPoint = null;
                this.toolState.previewPoint = null;
            }
            
        } else if (this.currentTool === 'circle') {
            const radiusInput = document.getElementById('inputRadius');
            const radiusValue = parseFloat(radiusInput.value);
            
            if (isNaN(radiusValue) || radiusValue <= 0) {
                radiusInput.focus();
                return;
            }
            
            // Convert to internal units (mm)
            const radius = Units.toInternal(radiusValue);
            
            if (this.toolState.startPoint) {
                const circle = new Circle(
                    this.toolState.startPoint.x,
                    this.toolState.startPoint.y,
                    radius
                );
                this.entities.push(circle);
                this.invalidateSnapCache();
                this.saveToHistory();
                this.toolState.startPoint = null;
                this.toolState.previewPoint = null;
            }
        } else if (this.dimInputType === 'offset') {
            const offsetInput = document.getElementById('inputOffset');
            const offsetValue = parseFloat(offsetInput.value);
            
            if (isNaN(offsetValue) || offsetValue <= 0) {
                offsetInput.focus();
                return;
            }
            
            // Convert to internal units and store
            this.toolState.offsetDistance = Units.toInternal(offsetValue);
            // Don't hide the panel, user still needs to click the side
            this.hideDimensionInput();
            this.updateStatus();
            this.render();
            return;
        } else if (this.dimInputType === 'scale') {
            const scaleInput = document.getElementById('inputScale');
            const scaleValue = parseFloat(scaleInput.value);
            
            if (isNaN(scaleValue) || scaleValue <= 0) {
                scaleInput.focus();
                return;
            }
            
            // Apply scale factor
            this.applyScale(scaleValue);
            return;
        } else if (this.dimInputType === 'rotate') {
            const rotateInput = document.getElementById('inputRotation');
            const angleValue = parseFloat(rotateInput.value);
            
            if (isNaN(angleValue)) {
                rotateInput.focus();
                return;
            }
            
            // Apply rotation angle (convert degrees to radians)
            this.applyRotation(angleValue * Math.PI / 180);
            return;
        } else if (this.dimInputType === 'rectPattern') {
            this.applyRectPattern();
            return;
        } else if (this.dimInputType === 'circPattern') {
            this.applyCircPattern();
            return;
        } else if (this.dimInputType === 'text') {
            this.applyText();
            return;
        }
        
        this.hideDimensionInput();
        this.updateStatus();
        this.render();
    }
    
    // ----------------------------------------
    // TOOL HANDLING
    // ----------------------------------------
    
    setTool(tool) {
        this.currentTool = tool;
        
        // Clear tool state (without calling cancelTool to avoid recursion)
        this.toolState.startPoint = null;
        this.toolState.previewPoint = null;
        this.toolState.trimPreview = null;
        this.toolState.extendPreview = null;
        this.toolState.selectionBoxStart = null;
        this.toolState.selectionBoxEnd = null;
        this.toolState.isSelectionBox = false;
        this.toolState.scaleBasePoint = null;
        this.toolState.scaleEntities = [];
        this.toolState.rotateCenter = null;
        this.toolState.rotateEntities = [];
        this.toolState.rotateStartAngle = null;
        this.toolState.offsetEntity = null;
        this.toolState.arcPoint1 = null;
        this.toolState.arcPoint2 = null;
        this.toolState.patternEntities = [];
        this.toolState.patternBasePoint = null;
        this.toolState.patternType = null;
        this.toolState.patternPreview = null;
        this.dimInputType = null;
        
        this.hideDimensionInput();
        
        // Update UI
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tool === tool);
        });
        
        this.updateCursor();
        this.updateStatus();
        this.render();
    }
    
    cancelTool() {
        // Check if we have something to cancel
        const hasActiveOperation = this.toolState.startPoint || 
            this.toolState.previewPoint ||
            this.toolState.selectionBoxStart ||
            this.toolState.scaleBasePoint ||
            this.toolState.scaleEntities.length > 0 ||
            this.toolState.rotateCenter ||
            this.toolState.rotateEntities.length > 0 ||
            this.toolState.offsetEntity ||
            this.toolState.arcPoint1 ||
            this.toolState.arcPoint2 ||
            this.toolState.patternEntities.length > 0 ||
            this.toolState.patternBasePoint;
        
        // If there's something to cancel, cancel it
        if (hasActiveOperation) {
            this.toolState.startPoint = null;
            this.toolState.previewPoint = null;
            this.toolState.trimPreview = null;
            this.toolState.extendPreview = null;
            this.toolState.selectionBoxStart = null;
            this.toolState.selectionBoxEnd = null;
            this.toolState.isSelectionBox = false;
            this.toolState.scaleBasePoint = null;
            this.toolState.scaleEntities = [];
            this.toolState.rotateCenter = null;
            this.toolState.rotateEntities = [];
            this.toolState.rotateStartAngle = null;
            this.toolState.offsetEntity = null;
            this.toolState.arcPoint1 = null;
            this.toolState.arcPoint2 = null;
            this.toolState.patternEntities = [];
            this.toolState.patternBasePoint = null;
            this.toolState.patternPreview = null;
            this.toolState.trackingPoints = [];
            this.toolState.activeTrackingLine = null;
            this.hideDimensionInput();
            this.updateStatus();
            this.render();
        } else if (this.currentTool !== 'select') {
            // Nothing to cancel and not already on select - switch to select tool
            this.setTool('select');
        } else if (this.toolState.selectedEntities.length > 0) {
            // Already on select tool, nothing to cancel - clear selection
            this.clearSelection();
            this.updateStatus();
            this.render();
        }
    }
    
    updateCursor() {
        // Check for grip hover in select mode
        if (this.currentTool === 'select' && this.toolState.selectedEntities.length > 0) {
            const gripHit = this.hitTestGrip(this.mouse.world);
            if (gripHit) {
                this.canvas.style.cursor = 'move';
                return;
            }
        }
        
        const cursors = {
            select: this.hoveredEntity ? 'pointer' : 'default',
            line: 'crosshair',
            rect: 'crosshair',
            circle: 'crosshair',
            arc: 'crosshair',
            dimension: 'crosshair',
            trim: 'crosshair',
            extend: 'crosshair',
            offset: this.hoveredEntity ? 'pointer' : 'crosshair',
            scale: 'crosshair',
            rectPattern: this.hoveredEntity ? 'pointer' : 'crosshair',
            circPattern: this.hoveredEntity ? 'pointer' : 'crosshair'
        };
        this.canvas.style.cursor = cursors[this.currentTool] || 'default';
    }
    
    updateStatus() {
        const statusTool = document.getElementById('statusTool');
        const statusHint = document.getElementById('statusHint');
        
        const toolNames = {
            select: 'Select Tool',
            line: 'Line Tool',
            rect: 'Rectangle Tool',
            circle: 'Circle Tool',
            arc: 'Arc Tool',
            dimension: 'Dimension Tool',
            trim: 'Trim Tool',
            extend: 'Extend Tool',
            offset: 'Offset Tool',
            scale: 'Scale Tool',
            rectPattern: 'Rectangular Pattern',
            circPattern: 'Circular Pattern'
        };
        
        let hint = '';
        switch (this.currentTool) {
            case 'select':
                hint = 'Click to select, drag box to multi-select (→ window, ← crossing)';
                break;
            case 'line':
                hint = this.toolState.startPoint ? 'Click next point or type length, Esc to finish' : 'Click start point';
                break;
            case 'rect':
                hint = this.toolState.startPoint ? 'Click opposite corner or type dimensions' : 'Click first corner';
                break;
            case 'circle':
                hint = this.toolState.startPoint ? 'Click radius point or type radius' : 'Click center point';
                break;
            case 'arc':
                if (!this.toolState.arcPoint1) {
                    hint = 'Click start point of arc';
                } else if (!this.toolState.arcPoint2) {
                    hint = 'Click end point of arc';
                } else {
                    hint = 'Move to set curvature, click to finish arc';
                }
                break;
            case 'dimension':
                hint = this.toolState.startPoint ? 'Click second point' : 'Click first point';
                break;
            case 'text':
                hint = 'Click to place text, then type to enter content';
                break;
            case 'trim':
                hint = 'Hover over line segment to preview, click to trim (red = removed)';
                break;
            case 'extend':
                hint = 'Hover near line end to preview, click to extend (green = added)';
                break;
            case 'offset':
                if (!this.toolState.offsetEntity) {
                    hint = 'Click a line to offset, or type distance first';
                } else {
                    hint = 'Click side to offset to, or type distance';
                }
                break;
            case 'scale':
                if (this.toolState.scaleEntities.length === 0) {
                    hint = 'Select entities to scale, then press Enter';
                } else if (!this.toolState.scaleBasePoint) {
                    hint = 'Click base point for scaling';
                } else {
                    hint = 'Click second point or type scale factor';
                }
                break;
            case 'rotate':
                if (this.toolState.rotateEntities.length === 0) {
                    hint = 'Select entities to rotate, then press Enter';
                } else if (!this.toolState.rotateCenter) {
                    hint = 'Click center point for rotation';
                } else if (this.toolState.rotateStartAngle === null) {
                    hint = 'Move mouse away from center to start rotating';
                } else {
                    hint = 'Move mouse to rotate, click to apply, or type angle';
                }
                break;
            case 'rectPattern':
                if (this.toolState.patternEntities.length === 0) {
                    hint = 'Select entities to pattern, then click to set base point';
                } else if (!this.toolState.patternBasePoint) {
                    hint = 'Click base point for pattern';
                } else {
                    hint = 'Enter pattern parameters';
                }
                break;
            case 'circPattern':
                if (this.toolState.patternEntities.length === 0) {
                    hint = 'Click to select entity for pattern (or select first, then choose tool)';
                } else if (!this.toolState.patternBasePoint) {
                    hint = 'Click to set rotation center point';
                } else {
                    hint = 'Adjust pattern settings, then click Apply';
                }
                break;
            default:
                hint = '';
        }
        
        const hints = { [this.currentTool]: hint };
        
        statusTool.textContent = toolNames[this.currentTool];
        statusHint.textContent = hints[this.currentTool];
    }
    
    handleToolClick() {
        const point = { ...this.mouse.snapped };
        
        switch (this.currentTool) {
            case 'select':
                this.handleSelectClick(point);
                break;
            case 'line':
                this.handleLineClick(point);
                break;
            case 'rect':
                this.handleRectClick(point);
                break;
            case 'circle':
                this.handleCircleClick(point);
                break;
            case 'arc':
                this.handleArcClick(point);
                break;
            case 'dimension':
                this.handleDimensionClick(point);
                break;
            case 'text':
                this.handleTextClick(point);
                break;
            case 'trim':
                this.handleTrimClick(point);
                break;
            case 'extend':
                this.handleExtendClick(point);
                break;
            case 'offset':
                this.handleOffsetClick(point);
                break;
            case 'scale':
                this.handleScaleClick(point);
                break;
            case 'rotate':
                this.handleRotateClick(point);
                break;
            case 'rectPattern':
                this.handleRectPatternClick(point);
                break;
            case 'circPattern':
                this.handleCircPatternClick(point);
                break;
        }
        
        this.updateStatus();
    }
    
    handleToolMove() {
        if (this.toolState.startPoint) {
            this.toolState.previewPoint = { ...this.mouse.snapped };
        }
        
        // Set rotation start angle on first mouse move after center is set
        if (this.currentTool === 'rotate' && 
            this.toolState.rotateCenter && 
            this.toolState.rotateEntities.length > 0 &&
            this.toolState.rotateStartAngle === null) {
            // Set start angle based on current mouse position relative to center
            const dx = this.mouse.world.x - this.toolState.rotateCenter.x;
            const dy = this.mouse.world.y - this.toolState.rotateCenter.y;
            // Only set if mouse is far enough from center
            if (Math.hypot(dx, dy) > 5 / this.view.scale) {
                this.toolState.rotateStartAngle = Math.atan2(dy, dx);
            }
        }
        
        // Handle grip dragging (endpoint editing)
        if (this.currentTool === 'select' && this.toolState.isGripDragging && this.toolState.activeGrip) {
            const grip = this.toolState.activeGrip;
            const entity = grip.entity;
            const newPos = this.mouse.snapped;
            
            this.moveEntityGrip(entity, grip.gripType, grip.gripIndex, newPos);
            this.toolState.dragStart = { ...newPos };
        }
        // Handle dragging selected entities (move entire entity)
        else if (this.currentTool === 'select' && this.toolState.isDragging && this.toolState.dragStart) {
            const dx = this.mouse.snapped.x - this.toolState.dragStart.x;
            const dy = this.mouse.snapped.y - this.toolState.dragStart.y;
            
            this.toolState.selectedEntities.forEach(entity => {
                entity.translate(dx, dy);
            });
            
            this.toolState.dragStart = { ...this.mouse.snapped };
        }
        
        // Calculate trim/extend previews (Fusion 360 style - always active)
        if (this.currentTool === 'trim') {
            this.calculateTrimPreview();
        }
        
        if (this.currentTool === 'extend') {
            this.calculateExtendPreview();
        }
        
        // Update hover for offset tool
        if (this.currentTool === 'offset' && !this.toolState.offsetEntity) {
            this.updateHover();
        }
        
        // Scale tool preview point
        if (this.currentTool === 'scale' && this.toolState.scaleBasePoint) {
            this.toolState.previewPoint = { ...this.mouse.snapped };
        }
    }
    
    // ----------------------------------------
    // SELECT TOOL
    // ----------------------------------------
    
    handleSelectClick(point) {
        // First check if clicking on a grip of a selected entity
        const gripHit = this.hitTestGrip(this.mouse.world);
        if (gripHit) {
            this.toolState.activeGrip = gripHit;
            this.toolState.isGripDragging = true;
            this.toolState.dragStart = { ...point };
            return;
        }
        
        const hitEntity = this.hitTest(this.mouse.world);
        
        if (hitEntity) {
            // Start dragging
            if (hitEntity.selected) {
                this.toolState.isDragging = true;
                this.toolState.dragStart = { ...point };
            } else {
                // Select new entity
                this.clearSelection();
                hitEntity.selected = true;
                this.toolState.selectedEntities = [hitEntity];
                this.toolState.isDragging = true;
                this.toolState.dragStart = { ...point };
                this.showProperties(hitEntity);
            }
        } else {
            this.clearSelection();
        }
    }
    
    // Hit test for grips (endpoints) of selected entities
    hitTestGrip(worldPoint) {
        const tolerance = CONFIG.hitTolerance / this.view.scale;
        
        for (const entity of this.toolState.selectedEntities) {
            const grips = this.getEntityGrips(entity);
            
            for (let i = 0; i < grips.length; i++) {
                const grip = grips[i];
                const dist = Math.hypot(worldPoint.x - grip.x, worldPoint.y - grip.y);
                if (dist <= tolerance) {
                    return {
                        entity: entity,
                        gripType: grip.type,
                        gripIndex: i,
                        x: grip.x,
                        y: grip.y
                    };
                }
            }
        }
        
        return null;
    }
    
    // Get grip points for an entity
    getEntityGrips(entity) {
        const grips = [];
        
        if (entity.type === 'line') {
            grips.push({ x: entity.x1, y: entity.y1, type: 'start' });
            grips.push({ x: entity.x2, y: entity.y2, type: 'end' });
            // Midpoint grip
            grips.push({ 
                x: (entity.x1 + entity.x2) / 2, 
                y: (entity.y1 + entity.y2) / 2, 
                type: 'mid' 
            });
        } else if (entity.type === 'circle') {
            // Center and quadrant grips
            grips.push({ x: entity.cx, y: entity.cy, type: 'center' });
            grips.push({ x: entity.cx + entity.radius, y: entity.cy, type: 'quadrant', angle: 0 });
            grips.push({ x: entity.cx, y: entity.cy + entity.radius, type: 'quadrant', angle: 90 });
            grips.push({ x: entity.cx - entity.radius, y: entity.cy, type: 'quadrant', angle: 180 });
            grips.push({ x: entity.cx, y: entity.cy - entity.radius, type: 'quadrant', angle: 270 });
        } else if (entity.type === 'arc') {
            // Center, start, end, and mid grips
            grips.push({ x: entity.cx, y: entity.cy, type: 'center' });
            const startPt = entity.getStartPoint();
            const endPt = entity.getEndPoint();
            grips.push({ x: startPt.x, y: startPt.y, type: 'start' });
            grips.push({ x: endPt.x, y: endPt.y, type: 'end' });
            // Midpoint of arc
            const midAngle = entity.startAngle + entity.getSweepAngle() / 2;
            grips.push({ 
                x: entity.cx + entity.radius * Math.cos(midAngle),
                y: entity.cy + entity.radius * Math.sin(midAngle),
                type: 'mid'
            });
        } else if (entity.type === 'rect') {
            grips.push({ x: entity.x1, y: entity.y1, type: 'corner', index: 0 });
            grips.push({ x: entity.x2, y: entity.y1, type: 'corner', index: 1 });
            grips.push({ x: entity.x2, y: entity.y2, type: 'corner', index: 2 });
            grips.push({ x: entity.x1, y: entity.y2, type: 'corner', index: 3 });
        } else if (entity.type === 'dim') {
            grips.push({ x: entity.x1, y: entity.y1, type: 'start' });
            grips.push({ x: entity.x2, y: entity.y2, type: 'end' });
        } else if (entity.type === 'text') {
            grips.push({ x: entity.x, y: entity.y, type: 'insertion' });
        }
        
        return grips;
    }
    
    // Move a grip point on an entity
    moveEntityGrip(entity, gripType, gripIndex, newPos) {
        if (entity.type === 'line') {
            if (gripType === 'start') {
                entity.x1 = newPos.x;
                entity.y1 = newPos.y;
            } else if (gripType === 'end') {
                entity.x2 = newPos.x;
                entity.y2 = newPos.y;
            } else if (gripType === 'mid') {
                // Move entire line
                const dx = newPos.x - (entity.x1 + entity.x2) / 2;
                const dy = newPos.y - (entity.y1 + entity.y2) / 2;
                entity.translate(dx, dy);
            }
        } else if (entity.type === 'circle') {
            if (gripType === 'center') {
                entity.cx = newPos.x;
                entity.cy = newPos.y;
            } else if (gripType === 'quadrant') {
                // Change radius based on distance from center
                entity.radius = Math.hypot(newPos.x - entity.cx, newPos.y - entity.cy);
            }
        } else if (entity.type === 'arc') {
            if (gripType === 'center') {
                entity.cx = newPos.x;
                entity.cy = newPos.y;
            } else if (gripType === 'start') {
                // Move start point - recalculate start angle
                entity.startAngle = Math.atan2(newPos.y - entity.cy, newPos.x - entity.cx);
                // Optionally adjust radius to match new position
                entity.radius = Math.hypot(newPos.x - entity.cx, newPos.y - entity.cy);
            } else if (gripType === 'end') {
                // Move end point - recalculate end angle
                entity.endAngle = Math.atan2(newPos.y - entity.cy, newPos.x - entity.cx);
                // Optionally adjust radius to match new position
                entity.radius = Math.hypot(newPos.x - entity.cx, newPos.y - entity.cy);
            } else if (gripType === 'mid') {
                // Change radius based on midpoint position
                entity.radius = Math.hypot(newPos.x - entity.cx, newPos.y - entity.cy);
            }
        } else if (entity.type === 'rect') {
            // Rectangle corner editing
            if (gripType === 'corner') {
                if (gripIndex === 0) {
                    entity.x1 = newPos.x;
                    entity.y1 = newPos.y;
                } else if (gripIndex === 1) {
                    entity.x2 = newPos.x;
                    entity.y1 = newPos.y;
                } else if (gripIndex === 2) {
                    entity.x2 = newPos.x;
                    entity.y2 = newPos.y;
                } else if (gripIndex === 3) {
                    entity.x1 = newPos.x;
                    entity.y2 = newPos.y;
                }
            }
        } else if (entity.type === 'dim') {
            if (gripType === 'start') {
                entity.x1 = newPos.x;
                entity.y1 = newPos.y;
            } else if (gripType === 'end') {
                entity.x2 = newPos.x;
                entity.y2 = newPos.y;
            }
        } else if (entity.type === 'text') {
            if (gripType === 'insertion') {
                entity.x = newPos.x;
                entity.y = newPos.y;
            }
        }
    }
    
    clearSelection() {
        this.entities.forEach(e => e.selected = false);
        this.toolState.selectedEntities = [];
        document.getElementById('propertiesPanel').classList.remove('open');
    }
    
    updateHover() {
        this.hoveredEntity = this.hitTest(this.mouse.world);
        this.updateCursor();
    }
    
    hitTest(worldPoint) {
        const tolerance = CONFIG.hitTolerance / this.view.scale;
        
        // Test in reverse order (top entities first)
        for (let i = this.entities.length - 1; i >= 0; i--) {
            const entity = this.entities[i];
            
            // Quick bounding box check for early rejection
            const bounds = this.getEntityBounds(entity);
            if (bounds) {
                if (worldPoint.x < bounds.minX - tolerance ||
                    worldPoint.x > bounds.maxX + tolerance ||
                    worldPoint.y < bounds.minY - tolerance ||
                    worldPoint.y > bounds.maxY + tolerance) {
                    continue;
                }
            }
            
            if (entity.type === 'line') {
                const dist = Geometry.pointToLineDistance(
                    worldPoint.x, worldPoint.y,
                    entity.x1, entity.y1, entity.x2, entity.y2
                );
                if (dist <= tolerance) return entity;
            } else if (entity.type === 'rect') {
                const dist = Geometry.pointToRectDistance(worldPoint.x, worldPoint.y, entity);
                if (dist <= tolerance) return entity;
            } else if (entity.type === 'circle') {
                // Distance from point to circle edge
                const distToCenter = Math.hypot(
                    worldPoint.x - entity.cx,
                    worldPoint.y - entity.cy
                );
                const distToEdge = Math.abs(distToCenter - entity.radius);
                if (distToEdge <= tolerance) return entity;
            } else if (entity.type === 'arc') {
                // Distance from point to arc edge
                const distToCenter = Math.hypot(
                    worldPoint.x - entity.cx,
                    worldPoint.y - entity.cy
                );
                const distToEdge = Math.abs(distToCenter - entity.radius);
                if (distToEdge <= tolerance) {
                    // Check if the point's angle is within the arc
                    const angle = Math.atan2(
                        worldPoint.y - entity.cy,
                        worldPoint.x - entity.cx
                    );
                    if (entity.containsAngle(angle)) return entity;
                }
            } else if (entity.type === 'dim') {
                // Hit test dimension line
                const dist = Geometry.pointToLineDistance(
                    worldPoint.x, worldPoint.y,
                    entity.x1, entity.y1, entity.x2, entity.y2
                );
                if (dist <= tolerance + entity.offset) return entity;
            } else if (entity.type === 'text') {
                // Hit test text bounding box
                const bounds = entity.getBounds();
                if (worldPoint.x >= bounds.minX - tolerance && 
                    worldPoint.x <= bounds.maxX + tolerance &&
                    worldPoint.y >= bounds.minY - tolerance && 
                    worldPoint.y <= bounds.maxY + tolerance) {
                    return entity;
                }
            }
        }
        
        return null;
    }
    
    // ----------------------------------------
    // SELECTION BOX (Window/Crossing)
    // ----------------------------------------
    
    completeSelectionBox() {
        const start = this.toolState.selectionBoxStart;
        const end = this.toolState.selectionBoxEnd;
        if (!start || !end) return;
        
        const minX = Math.min(start.x, end.x);
        const maxX = Math.max(start.x, end.x);
        const minY = Math.min(start.y, end.y);
        const maxY = Math.max(start.y, end.y);
        
        // Determine selection mode: left-to-right = window, right-to-left = crossing
        const isWindowSelection = end.x > start.x;
        
        // Select entities based on mode
        this.entities.forEach(entity => {
            let shouldSelect = false;
            
            if (isWindowSelection) {
                // Window selection: entity must be fully inside
                shouldSelect = this.isEntityFullyInsideBox(entity, minX, minY, maxX, maxY);
            } else {
                // Crossing selection: entity just needs to touch or be inside
                shouldSelect = this.doesEntityIntersectBox(entity, minX, minY, maxX, maxY);
            }
            
            if (shouldSelect) {
                entity.selected = true;
            }
        });
        
        this.toolState.selectedEntities = this.entities.filter(e => e.selected);
        if (this.toolState.selectedEntities.length === 1) {
            this.showProperties(this.toolState.selectedEntities[0]);
        }
    }
    
    isEntityFullyInsideBox(entity, minX, minY, maxX, maxY) {
        if (entity.type === 'line') {
            return entity.x1 >= minX && entity.x1 <= maxX &&
                   entity.y1 >= minY && entity.y1 <= maxY &&
                   entity.x2 >= minX && entity.x2 <= maxX &&
                   entity.y2 >= minY && entity.y2 <= maxY;
        } else if (entity.type === 'rect') {
            return entity.x >= minX && entity.x + entity.width <= maxX &&
                   entity.y >= minY && entity.y + entity.height <= maxY;
        } else if (entity.type === 'circle') {
            return entity.cx - entity.radius >= minX &&
                   entity.cx + entity.radius <= maxX &&
                   entity.cy - entity.radius >= minY &&
                   entity.cy + entity.radius <= maxY;
        } else if (entity.type === 'dim') {
            return entity.x1 >= minX && entity.x1 <= maxX &&
                   entity.y1 >= minY && entity.y1 <= maxY &&
                   entity.x2 >= minX && entity.x2 <= maxX &&
                   entity.y2 >= minY && entity.y2 <= maxY;
        } else if (entity.type === 'text') {
            const bounds = entity.getBounds();
            return bounds.minX >= minX && bounds.maxX <= maxX &&
                   bounds.minY >= minY && bounds.maxY <= maxY;
        }
        return false;
    }
    
    doesEntityIntersectBox(entity, minX, minY, maxX, maxY) {
        // First check if fully inside
        if (this.isEntityFullyInsideBox(entity, minX, minY, maxX, maxY)) {
            return true;
        }
        
        if (entity.type === 'line') {
            // Check if line intersects box
            return this.lineIntersectsBox(entity.x1, entity.y1, entity.x2, entity.y2, minX, minY, maxX, maxY);
        } else if (entity.type === 'rect') {
            // Check if any edge intersects or if boxes overlap
            const rectMinX = entity.x;
            const rectMaxX = entity.x + entity.width;
            const rectMinY = entity.y;
            const rectMaxY = entity.y + entity.height;
            return !(rectMaxX < minX || rectMinX > maxX || rectMaxY < minY || rectMinY > maxY);
        } else if (entity.type === 'circle') {
            // Check if circle intersects box
            return this.circleIntersectsBox(entity.cx, entity.cy, entity.radius, minX, minY, maxX, maxY);
        } else if (entity.type === 'dim') {
            return this.lineIntersectsBox(entity.x1, entity.y1, entity.x2, entity.y2, minX, minY, maxX, maxY);
        } else if (entity.type === 'text') {
            const bounds = entity.getBounds();
            return !(bounds.maxX < minX || bounds.minX > maxX || bounds.maxY < minY || bounds.minY > maxY);
        }
        return false;
    }
    
    lineIntersectsBox(x1, y1, x2, y2, minX, minY, maxX, maxY) {
        // Check if either endpoint is inside
        if ((x1 >= minX && x1 <= maxX && y1 >= minY && y1 <= maxY) ||
            (x2 >= minX && x2 <= maxX && y2 >= minY && y2 <= maxY)) {
            return true;
        }
        
        // Check intersection with box edges
        const boxEdges = [
            [minX, minY, maxX, minY], // Bottom
            [maxX, minY, maxX, maxY], // Right
            [maxX, maxY, minX, maxY], // Top
            [minX, maxY, minX, minY]  // Left
        ];
        
        for (const edge of boxEdges) {
            if (Geometry.lineLineIntersect(x1, y1, x2, y2, edge[0], edge[1], edge[2], edge[3])) {
                return true;
            }
        }
        return false;
    }
    
    circleIntersectsBox(cx, cy, r, minX, minY, maxX, maxY) {
        // Find closest point on box to circle center
        const closestX = Math.max(minX, Math.min(cx, maxX));
        const closestY = Math.max(minY, Math.min(cy, maxY));
        
        const distSq = (cx - closestX) ** 2 + (cy - closestY) ** 2;
        return distSq <= r * r;
    }
    
    deleteSelected() {
        if (this.entities.some(e => e.selected)) {
            this.entities = this.entities.filter(e => !e.selected);
            this.toolState.selectedEntities = [];
            this.invalidateSnapCache();
            this.saveToHistory();
            document.getElementById('propertiesPanel').classList.remove('open');
            this.render();
        }
    }
    
    // ----------------------------------------
    // LINE TOOL (Continuous Mode)
    // ----------------------------------------
    
    handleLineClick(point) {
        if (!this.toolState.startPoint) {
            // First click - set start point
            this.toolState.startPoint = point;
            // Reset tracking for new line
            this.toolState.trackingPoints = [];
        } else {
            // Create line from start to current point
            const line = new Line(
                this.toolState.startPoint.x,
                this.toolState.startPoint.y,
                point.x,
                point.y
            );
            this.entities.push(line);
            this.invalidateSnapCache();
            this.saveToHistory();
            
            // Continuous mode: end point becomes new start point
            // User presses Escape to exit
            this.toolState.startPoint = { ...point };
            this.toolState.previewPoint = { ...point };
            // Clear tracking for next segment
            this.toolState.trackingPoints = [];
        }
    }
    
    // ----------------------------------------
    // RECTANGLE TOOL (creates 4 separate lines)
    // ----------------------------------------
    
    handleRectClick(point) {
        if (!this.toolState.startPoint) {
            this.toolState.startPoint = point;
            // Reset tracking for new rectangle
            this.toolState.trackingPoints = [];
        } else {
            // Create 4 separate lines instead of a rectangle entity
            const x1 = this.toolState.startPoint.x;
            const y1 = this.toolState.startPoint.y;
            const x2 = point.x;
            const y2 = point.y;
            
            // Bottom line
            this.entities.push(new Line(x1, y1, x2, y1));
            // Right line
            this.entities.push(new Line(x2, y1, x2, y2));
            // Top line
            this.entities.push(new Line(x2, y2, x1, y2));
            // Left line
            this.entities.push(new Line(x1, y2, x1, y1));
            
            this.invalidateSnapCache();
            this.saveToHistory();
            this.toolState.startPoint = null;
            this.toolState.previewPoint = null;
        }
    }

    // ----------------------------------------
    // CIRCLE TOOL
    // ----------------------------------------
    
    handleCircleClick(point) {
        if (!this.toolState.startPoint) {
            // First click - set center
            // Reset tracking for new circle
            this.toolState.trackingPoints = [];
            this.toolState.startPoint = point;
        } else {
            // Second click - set radius point
            const radius = Math.hypot(
                point.x - this.toolState.startPoint.x,
                point.y - this.toolState.startPoint.y
            );
            
            if (radius > 0) {
                const circle = new Circle(
                    this.toolState.startPoint.x,
                    this.toolState.startPoint.y,
                    radius
                );
                this.entities.push(circle);
                this.invalidateSnapCache();
                this.saveToHistory();
            }
            
            this.toolState.startPoint = null;
            this.toolState.previewPoint = null;
        }
    }
    
    // ----------------------------------------
    // ARC TOOL (3-point arc)
    // ----------------------------------------
    
    handleArcClick(point) {
        if (!this.toolState.arcPoint1) {
            // First click - set start point
            this.toolState.arcPoint1 = { ...point };
            // Reset tracking for new arc
            this.toolState.trackingPoints = [];
        } else if (!this.toolState.arcPoint2) {
            // Second click - set end point
            this.toolState.arcPoint2 = { ...point };
        } else {
            // Third click - create arc using the third point to define curvature
            const arc = this.createArcFrom3Points(
                this.toolState.arcPoint1,
                this.toolState.arcPoint2,
                point
            );
            
            if (arc) {
                this.entities.push(arc);
                this.invalidateSnapCache();
                this.saveToHistory();
            }
            
            // Reset for next arc
            this.toolState.arcPoint1 = null;
            this.toolState.arcPoint2 = null;
            this.toolState.previewPoint = null;
        }
    }
    
    // Create an arc from start point, end point, and a point on the arc
    createArcFrom3Points(p1, p2, p3) {
        // Find the circle passing through all 3 points
        const circle = this.circleFrom3Points(p1, p2, p3);
        if (!circle) return null;
        
        const { cx, cy, radius } = circle;
        
        // Calculate angles for start and end points
        const startAngle = Math.atan2(p1.y - cy, p1.x - cx);
        const endAngle = Math.atan2(p2.y - cy, p2.x - cx);
        const midAngle = Math.atan2(p3.y - cy, p3.x - cx);
        
        // Determine if we need to go the "long way" around
        // Check if midAngle is between startAngle and endAngle
        let goClockwise = !this.isAngleBetween(midAngle, startAngle, endAngle);
        
        // Create arc with correct direction
        if (goClockwise) {
            return new Arc(cx, cy, radius, startAngle, endAngle);
        } else {
            return new Arc(cx, cy, radius, endAngle, startAngle);
        }
    }
    
    // Check if angle is between start and end (counterclockwise direction)
    isAngleBetween(angle, start, end) {
        // Normalize all angles to [0, 2π)
        const normalize = (a) => {
            while (a < 0) a += 2 * Math.PI;
            while (a >= 2 * Math.PI) a -= 2 * Math.PI;
            return a;
        };
        
        angle = normalize(angle);
        start = normalize(start);
        end = normalize(end);
        
        if (start <= end) {
            return angle >= start && angle <= end;
        } else {
            // Arc crosses 0
            return angle >= start || angle <= end;
        }
    }
    
    // Find circle passing through 3 points
    circleFrom3Points(p1, p2, p3) {
        const ax = p1.x, ay = p1.y;
        const bx = p2.x, by = p2.y;
        const cx = p3.x, cy = p3.y;
        
        const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
        
        if (Math.abs(d) < 1e-10) {
            // Points are collinear, can't form a circle
            return null;
        }
        
        const ux = ((ax * ax + ay * ay) * (by - cy) + (bx * bx + by * by) * (cy - ay) + (cx * cx + cy * cy) * (ay - by)) / d;
        const uy = ((ax * ax + ay * ay) * (cx - bx) + (bx * bx + by * by) * (ax - cx) + (cx * cx + cy * cy) * (bx - ax)) / d;
        
        const radius = Math.hypot(ax - ux, ay - uy);
        
        return { cx: ux, cy: uy, radius };
    }
    
    // ----------------------------------------
    // DIMENSION TOOL
    // ----------------------------------------
    
    handleDimensionClick(point) {
        if (!this.toolState.startPoint) {
            this.toolState.startPoint = point;
        } else {
            const dim = new Dimension(
                this.toolState.startPoint.x,
                this.toolState.startPoint.y,
                point.x,
                point.y
            );
            this.entities.push(dim);
            this.invalidateSnapCache();
            this.saveToHistory();
            this.toolState.startPoint = null;
            this.toolState.previewPoint = null;
        }
    }
    
    // ----------------------------------------
    // TEXT TOOL
    // ----------------------------------------
    
    handleTextClick(point) {
        // Store the text insertion point
        this.toolState.textInsertPoint = { ...point };
        
        // Show text input dialog
        this.showTextInput();
    }
    
    showTextInput() {
        this.dimInputVisible = true;
        this.dimInputType = 'text';
        const panel = document.getElementById('dimensionInput');
        panel.classList.add('visible');
        
        // Hide all field sets
        document.getElementById('lineInputFields').style.display = 'none';
        document.getElementById('rectInputFields').style.display = 'none';
        document.getElementById('circleInputFields').style.display = 'none';
        document.getElementById('textInputFields').style.display = 'block';
        document.getElementById('offsetInputFields').style.display = 'none';
        document.getElementById('scaleInputFields').style.display = 'none';
        document.getElementById('rectPatternFields').style.display = 'none';
        document.getElementById('circPatternFields').style.display = 'none';
        
        // Update title
        document.getElementById('dimInputTitle').textContent = 'Enter Text';
        
        // Update units
        document.getElementById('textHeightUnit').textContent = Units.currentUnit;
        
        // Clear and focus text input, reset rotation to 0
        const textInput = document.getElementById('inputText');
        textInput.value = '';
        document.getElementById('inputTextRotation').value = '0';
        textInput.focus();
    }
    
    applyText() {
        const textContent = document.getElementById('inputText').value.trim();
        if (!textContent || !this.toolState.textInsertPoint) {
            this.hideDimensionInput();
            return;
        }
        
        const height = Units.toInternal(parseFloat(document.getElementById('inputTextHeight').value) || 5);
        const rotation = (parseFloat(document.getElementById('inputTextRotation').value) || 0) * Math.PI / 180;
        
        const text = new Text(
            this.toolState.textInsertPoint.x,
            this.toolState.textInsertPoint.y,
            textContent,
            height,
            rotation
        );
        
        this.entities.push(text);
        this.invalidateSnapCache();
        this.saveToHistory();
        this.toolState.textInsertPoint = null;
        this.hideDimensionInput();
        this.render();
    }
    
    // ----------------------------------------
    // TRIM TOOL (Fusion 360 style - auto-detect intersections)
    // ----------------------------------------
    
    handleTrimClick(point) {
        // Apply the trim if we have a valid preview
        if (this.toolState.trimPreview && this.toolState.trimPreview.valid) {
            const preview = this.toolState.trimPreview;
            
            if (preview.isCircle) {
                // Handle circle/arc trimming
                if (preview.deleteEntire) {
                    // Delete the entire circle
                    this.entities = this.entities.filter(e => e !== preview.entity);
                } else if (preview.trimCircle) {
                    // Remove original circle/arc
                    this.entities = this.entities.filter(e => e !== preview.entity);
                    
                    // Add the kept arc segments
                    if (preview.keepArcs) {
                        for (const arcDef of preview.keepArcs) {
                            // Make sure we're not creating a nearly-empty arc
                            let angleDiff = arcDef.endAngle - arcDef.startAngle;
                            if (angleDiff < 0) angleDiff += 2 * Math.PI;
                            if (angleDiff > 0.01 && angleDiff < 2 * Math.PI - 0.01) {
                                const arc = new Arc(
                                    arcDef.cx,
                                    arcDef.cy,
                                    arcDef.radius,
                                    arcDef.startAngle,
                                    arcDef.endAngle
                                );
                                this.entities.push(arc);
                            }
                        }
                    }
                }
            } else if (preview.deleteEntire) {
                // Delete the entire line (no intersections)
                this.entities = this.entities.filter(e => e !== preview.entity);
            } else if (preview.splitLine) {
                // Line passes through, need to split and remove middle segment
                const line = preview.entity;
                const seg = preview.removeSegment;
                
                // Remove original line
                this.entities = this.entities.filter(e => e !== line);
                
                // Add the two remaining segments
                if (preview.keepSegments) {
                    for (const keepSeg of preview.keepSegments) {
                        if (Math.hypot(keepSeg.x2 - keepSeg.x1, keepSeg.y2 - keepSeg.y1) > 0.01) {
                            this.entities.push(new Line(keepSeg.x1, keepSeg.y1, keepSeg.x2, keepSeg.y2));
                        }
                    }
                }
            } else {
                // Simple trim from one end
                const line = preview.entity;
                if (preview.trimStart) {
                    line.x1 = preview.newStart.x;
                    line.y1 = preview.newStart.y;
                } else {
                    line.x2 = preview.newEnd.x;
                    line.y2 = preview.newEnd.y;
                }
            }
            
            this.invalidateSnapCache();
            this.saveToHistory();
            this.toolState.trimPreview = null;
            this.render();
        }
    }
    
    // Calculate trim preview on hover - finds ALL intersections automatically
    calculateTrimPreview() {
        const hitEntity = this.hitTestWithTolerance(this.mouse.world, 15);
        
        if (!hitEntity || (hitEntity.type !== 'line' && hitEntity.type !== 'circle' && hitEntity.type !== 'arc')) {
            this.toolState.trimPreview = null;
            return;
        }
        
        // Handle circle/arc trimming separately
        if (hitEntity.type === 'circle' || hitEntity.type === 'arc') {
            this.calculateCircleTrimPreview(hitEntity);
            return;
        }
        
        const line = hitEntity;
        
        // Find ALL intersections with other entities
        let allIntersections = [];
        
        for (const entity of this.entities) {
            if (entity === line) continue;
            
            const intersections = this.findAllIntersections(line, entity);
            allIntersections.push(...intersections);
        }
        
        // Sort intersections by t parameter (position along line)
        allIntersections.sort((a, b) => a.t - b.t);
        
        // Remove duplicates (intersections at same point)
        allIntersections = allIntersections.filter((int, idx, arr) => {
            if (idx === 0) return true;
            return Math.abs(int.t - arr[idx-1].t) > 0.001;
        });
        
        // Find where the mouse is on the line (t parameter)
        const mouseT = this.projectPointOnLine(this.mouse.world, line);
        
        // Determine which segment to remove based on mouse position
        if (allIntersections.length === 0) {
            // No intersections - delete entire line
            this.toolState.trimPreview = {
                valid: true,
                entity: line,
                deleteEntire: true,
                removeSegment: { x1: line.x1, y1: line.y1, x2: line.x2, y2: line.y2 }
            };
        } else if (allIntersections.length === 1) {
            // One intersection - trim from the end closer to mouse
            const int = allIntersections[0];
            const trimStart = mouseT < int.t;
            
            this.toolState.trimPreview = {
                valid: true,
                entity: line,
                trimStart: trimStart,
                newStart: trimStart ? { x: int.x, y: int.y } : { x: line.x1, y: line.y1 },
                newEnd: trimStart ? { x: line.x2, y: line.y2 } : { x: int.x, y: int.y },
                removeSegment: trimStart
                    ? { x1: line.x1, y1: line.y1, x2: int.x, y2: int.y }
                    : { x1: int.x, y1: int.y, x2: line.x2, y2: line.y2 }
            };
        } else {
            // Multiple intersections - find the segment containing the mouse
            let segmentStart = { x: line.x1, y: line.y1, t: 0 };
            let segmentEnd = { x: line.x2, y: line.y2, t: 1 };
            
            // Find the two intersections that bound the mouse position
            for (let i = 0; i < allIntersections.length; i++) {
                if (allIntersections[i].t > mouseT) {
                    segmentEnd = allIntersections[i];
                    if (i > 0) {
                        segmentStart = allIntersections[i - 1];
                    }
                    break;
                }
                segmentStart = allIntersections[i];
            }
            
            // If mouse is past all intersections
            if (mouseT > allIntersections[allIntersections.length - 1].t) {
                segmentStart = allIntersections[allIntersections.length - 1];
                segmentEnd = { x: line.x2, y: line.y2, t: 1 };
            }
            
            // Determine if we're trimming an end segment or a middle segment
            const isStartSegment = segmentStart.t === 0 || Math.abs(segmentStart.x - line.x1) < 0.01 && Math.abs(segmentStart.y - line.y1) < 0.01;
            const isEndSegment = segmentEnd.t === 1 || Math.abs(segmentEnd.x - line.x2) < 0.01 && Math.abs(segmentEnd.y - line.y2) < 0.01;
            
            if (isStartSegment) {
                // Trimming from start
                this.toolState.trimPreview = {
                    valid: true,
                    entity: line,
                    trimStart: true,
                    newStart: { x: segmentEnd.x, y: segmentEnd.y },
                    newEnd: { x: line.x2, y: line.y2 },
                    removeSegment: { x1: line.x1, y1: line.y1, x2: segmentEnd.x, y2: segmentEnd.y }
                };
            } else if (isEndSegment) {
                // Trimming from end
                this.toolState.trimPreview = {
                    valid: true,
                    entity: line,
                    trimStart: false,
                    newStart: { x: line.x1, y: line.y1 },
                    newEnd: { x: segmentStart.x, y: segmentStart.y },
                    removeSegment: { x1: segmentStart.x, y1: segmentStart.y, x2: line.x2, y2: line.y2 }
                };
            } else {
                // Middle segment - need to split line into two
                this.toolState.trimPreview = {
                    valid: true,
                    entity: line,
                    splitLine: true,
                    removeSegment: { x1: segmentStart.x, y1: segmentStart.y, x2: segmentEnd.x, y2: segmentEnd.y },
                    keepSegments: [
                        { x1: line.x1, y1: line.y1, x2: segmentStart.x, y2: segmentStart.y },
                        { x1: segmentEnd.x, y1: segmentEnd.y, x2: line.x2, y2: line.y2 }
                    ]
                };
            }
        }
    }
    
    // Calculate trim preview for circles and arcs
    calculateCircleTrimPreview(entity) {
        const isCircle = entity.type === 'circle';
        const isArc = entity.type === 'arc';
        const cx = entity.cx;
        const cy = entity.cy;
        const radius = entity.radius;
        
        // Find all intersections with this circle/arc
        let allIntersections = [];
        
        for (const other of this.entities) {
            if (other === entity) continue;
            
            const ints = this.findCircleIntersections(entity, other);
            allIntersections.push(...ints);
        }
        
        // For arcs, also add the arc endpoints as potential trim boundaries
        if (isArc) {
            const startPt = entity.getStartPoint();
            const endPt = entity.getEndPoint();
            
            // Add arc endpoints with special flag
            allIntersections.push({ 
                x: startPt.x, 
                y: startPt.y, 
                isArcEndpoint: true,
                isStart: true
            });
            allIntersections.push({ 
                x: endPt.x, 
                y: endPt.y, 
                isArcEndpoint: true,
                isEnd: true
            });
        }
        
        if (allIntersections.length === 0) {
            // No intersections - delete entire circle/arc
            this.toolState.trimPreview = {
                valid: true,
                entity: entity,
                deleteEntire: true,
                isCircle: true
            };
            return;
        }
        
        // Calculate angle for each intersection point
        allIntersections = allIntersections.map(pt => ({
            ...pt,
            angle: Math.atan2(pt.y - cy, pt.x - cx)
        }));
        
        // For arcs, filter to only intersections within the arc span (plus endpoints)
        if (isArc) {
            allIntersections = allIntersections.filter(pt => {
                if (pt.isArcEndpoint) return true;
                return entity.containsAngle(pt.angle);
            });
        }
        
        // Sort by angle, but for arcs we need to sort relative to the arc's start
        if (isArc) {
            const arcStart = Arc.normalizeAngle(entity.startAngle);
            allIntersections.sort((a, b) => {
                let angleA = Arc.normalizeAngle(a.angle) - arcStart;
                let angleB = Arc.normalizeAngle(b.angle) - arcStart;
                if (angleA < 0) angleA += 2 * Math.PI;
                if (angleB < 0) angleB += 2 * Math.PI;
                return angleA - angleB;
            });
        } else {
            allIntersections.sort((a, b) => Arc.normalizeAngle(a.angle) - Arc.normalizeAngle(b.angle));
        }
        
        // Remove duplicate points (same angle within tolerance)
        allIntersections = allIntersections.filter((pt, idx, arr) => {
            if (idx === 0) return true;
            const prevAngle = Arc.normalizeAngle(arr[idx-1].angle);
            const currAngle = Arc.normalizeAngle(pt.angle);
            return Math.abs(currAngle - prevAngle) > 0.01;
        });
        
        // Find the mouse angle
        const mouseAngle = Math.atan2(this.mouse.world.y - cy, this.mouse.world.x - cx);
        
        // For arcs, check if mouse is even over the arc
        if (isArc && !entity.containsAngle(mouseAngle)) {
            this.toolState.trimPreview = null;
            return;
        }
        
        // Need at least 2 points to define a segment to remove
        if (allIntersections.length < 2) {
            // For arcs with only 1 intersection, we can still trim from the intersection to an endpoint
            if (isArc && allIntersections.length === 1) {
                const int = allIntersections[0];
                if (!int.isArcEndpoint) {
                    // Single intersection - trim from intersection to nearest endpoint
                    const startAngle = entity.startAngle;
                    const endAngle = entity.endAngle;
                    const intAngle = int.angle;
                    
                    // Check which side of the intersection the mouse is on
                    const mouseNorm = Arc.normalizeAngle(mouseAngle);
                    const intNorm = Arc.normalizeAngle(intAngle);
                    const startNorm = Arc.normalizeAngle(startAngle);
                    
                    // Determine if mouse is between start and intersection, or intersection and end
                    const mouseToStart = this.arcAngleDist(mouseNorm, startNorm, entity);
                    const mouseToInt = this.arcAngleDist(mouseNorm, intNorm, entity);
                    
                    let removeStartAngle, removeEndAngle, keepStartAngle, keepEndAngle;
                    
                    if (mouseToStart < mouseToInt) {
                        // Mouse is closer to start - remove start to intersection
                        removeStartAngle = startAngle;
                        removeEndAngle = intAngle;
                        keepStartAngle = intAngle;
                        keepEndAngle = endAngle;
                    } else {
                        // Mouse is closer to end - remove intersection to end
                        removeStartAngle = intAngle;
                        removeEndAngle = endAngle;
                        keepStartAngle = startAngle;
                        keepEndAngle = intAngle;
                    }
                    
                    this.toolState.trimPreview = {
                        valid: true,
                        entity: entity,
                        isCircle: true,
                        trimCircle: true,
                        removeArc: {
                            cx: cx,
                            cy: cy,
                            radius: radius,
                            startAngle: removeStartAngle,
                            endAngle: removeEndAngle
                        },
                        keepArcs: [{
                            cx: cx,
                            cy: cy,
                            radius: radius,
                            startAngle: keepStartAngle,
                            endAngle: keepEndAngle
                        }]
                    };
                    return;
                }
            }
            
            // Can't trim with less than 2 intersection points
            this.toolState.trimPreview = {
                valid: true,
                entity: entity,
                deleteEntire: true,
                isCircle: true
            };
            return;
        }
        
        // Find which segment contains the mouse angle
        let segmentStartAngle, segmentEndAngle;
        let startIdx = -1;
        const normalizedMouseAngle = Arc.normalizeAngle(mouseAngle);
        
        for (let i = 0; i < allIntersections.length; i++) {
            const currentAngle = Arc.normalizeAngle(allIntersections[i].angle);
            const nextIdx = (i + 1) % allIntersections.length;
            
            // For arcs, don't wrap around - stop at the last real segment
            if (isArc && nextIdx === 0) continue;
            
            const nextAngle = Arc.normalizeAngle(allIntersections[nextIdx].angle);
            
            // Check if mouse angle is in this segment
            let inSegment = false;
            if (isArc) {
                // For arcs, check if mouse is between these two angles along the arc
                inSegment = this.isAngleInArcSegment(mouseAngle, allIntersections[i].angle, allIntersections[nextIdx].angle, entity);
            } else {
                if (currentAngle <= nextAngle) {
                    inSegment = normalizedMouseAngle >= currentAngle && normalizedMouseAngle <= nextAngle;
                } else {
                    inSegment = normalizedMouseAngle >= currentAngle || normalizedMouseAngle <= nextAngle;
                }
            }
            
            if (inSegment) {
                segmentStartAngle = allIntersections[i].angle;
                segmentEndAngle = allIntersections[nextIdx].angle;
                startIdx = i;
                break;
            }
        }
        
        if (startIdx === -1) {
            // Couldn't find segment - use first one
            segmentStartAngle = allIntersections[0].angle;
            segmentEndAngle = allIntersections[Math.min(1, allIntersections.length - 1)].angle;
        }
        
        // The trim preview shows removing the arc segment where the mouse is
        this.toolState.trimPreview = {
            valid: true,
            entity: entity,
            isCircle: true,
            trimCircle: true,
            removeArc: {
                cx: cx,
                cy: cy,
                radius: radius,
                startAngle: segmentStartAngle,
                endAngle: segmentEndAngle
            },
            keepArcs: this.calculateKeepArcs(entity, allIntersections, segmentStartAngle, segmentEndAngle)
        };
    }
    
    // Helper to calculate angular distance along an arc
    arcAngleDist(angle1, angle2, arc) {
        let diff = Arc.normalizeAngle(angle1) - Arc.normalizeAngle(angle2);
        if (diff < 0) diff += 2 * Math.PI;
        return Math.min(diff, 2 * Math.PI - diff);
    }
    
    // Check if an angle is within a segment of an arc
    isAngleInArcSegment(testAngle, startAngle, endAngle, arc) {
        const test = Arc.normalizeAngle(testAngle);
        const start = Arc.normalizeAngle(startAngle);
        const end = Arc.normalizeAngle(endAngle);
        
        // For the segment from start to end going in the arc's direction
        if (start <= end) {
            return test >= start && test <= end;
        } else {
            return test >= start || test <= end;
        }
    }
    
    // Calculate the arc segments to keep after trimming
    calculateKeepArcs(entity, intersections, removeStart, removeEnd) {
        if (intersections.length < 2) return [];
        
        const cx = entity.cx;
        const cy = entity.cy;
        const radius = entity.radius;
        const isArc = entity.type === 'arc';
        
        // If it's a full circle with 2 intersections, create one arc
        if (entity.type === 'circle' && intersections.length === 2) {
            return [{
                cx: cx,
                cy: cy,
                radius: radius,
                startAngle: removeEnd,
                endAngle: removeStart
            }];
        }
        
        // For arcs, we need to be more careful
        if (isArc) {
            const keepArcs = [];
            const arcStart = entity.startAngle;
            const arcEnd = entity.endAngle;
            
            // Filter out arc endpoints from intersections for calculation
            const realIntersections = intersections.filter(p => !p.isArcEndpoint);
            
            if (realIntersections.length === 0) {
                // No real intersections, nothing to keep
                return [];
            }
            
            // Check if we're removing from start or from end
            const removeStartNorm = Arc.normalizeAngle(removeStart);
            const removeEndNorm = Arc.normalizeAngle(removeEnd);
            const arcStartNorm = Arc.normalizeAngle(arcStart);
            const arcEndNorm = Arc.normalizeAngle(arcEnd);
            
            // If removing from arc start
            if (Math.abs(removeStartNorm - arcStartNorm) < 0.01) {
                // Keep from removeEnd to arcEnd
                keepArcs.push({
                    cx: cx,
                    cy: cy,
                    radius: radius,
                    startAngle: removeEnd,
                    endAngle: arcEnd
                });
            }
            // If removing to arc end
            else if (Math.abs(removeEndNorm - arcEndNorm) < 0.01) {
                // Keep from arcStart to removeStart
                keepArcs.push({
                    cx: cx,
                    cy: cy,
                    radius: radius,
                    startAngle: arcStart,
                    endAngle: removeStart
                });
            }
            // Middle segment being removed - create two arcs
            else {
                keepArcs.push({
                    cx: cx,
                    cy: cy,
                    radius: radius,
                    startAngle: arcStart,
                    endAngle: removeStart
                });
                keepArcs.push({
                    cx: cx,
                    cy: cy,
                    radius: radius,
                    startAngle: removeEnd,
                    endAngle: arcEnd
                });
            }
            
            return keepArcs;
        }
        
        // For circles with more than 2 intersections
        return [{
            cx: cx,
            cy: cy,
            radius: radius,
            startAngle: removeEnd,
            endAngle: removeStart
        }];
    }
    
    // Find all intersections between a circle/arc and another entity
    findCircleIntersections(circle, entity) {
        let intersections = [];
        const cx = circle.cx;
        const cy = circle.cy;
        const radius = circle.radius;
        
        if (entity.type === 'line') {
            const ints = this.lineCircleIntersection(entity, circle);
            for (const pt of ints) {
                // For arcs, check if the intersection is within the arc
                if (circle.type === 'arc' && !circle.containsAngle(Math.atan2(pt.y - cy, pt.x - cx))) {
                    continue;
                }
                intersections.push({ x: pt.x, y: pt.y });
            }
        } else if (entity.type === 'circle' || entity.type === 'arc') {
            // Circle-circle intersection
            const ints = this.circleCircleIntersection(circle, entity);
            intersections.push(...ints);
        } else if (entity.type === 'rect') {
            // Check each edge of rectangle
            const edges = entity.toLines ? entity.toLines() : [];
            for (const edge of edges) {
                const ints = this.lineCircleIntersection(edge, circle);
                for (const pt of ints) {
                    if (circle.type === 'arc' && !circle.containsAngle(Math.atan2(pt.y - cy, pt.x - cx))) {
                        continue;
                    }
                    intersections.push({ x: pt.x, y: pt.y });
                }
            }
        }
        
        return intersections;
    }
    
    // Circle-circle intersection
    circleCircleIntersection(c1, c2) {
        const dx = c2.cx - c1.cx;
        const dy = c2.cy - c1.cy;
        const d = Math.hypot(dx, dy);
        
        // No intersection if circles are too far apart or one contains the other
        if (d > c1.radius + c2.radius || d < Math.abs(c1.radius - c2.radius) || d === 0) {
            return [];
        }
        
        const a = (c1.radius * c1.radius - c2.radius * c2.radius + d * d) / (2 * d);
        const h = Math.sqrt(c1.radius * c1.radius - a * a);
        
        const px = c1.cx + a * dx / d;
        const py = c1.cy + a * dy / d;
        
        const intersections = [];
        
        intersections.push({
            x: px + h * dy / d,
            y: py - h * dx / d
        });
        
        if (h > 0.001) {
            intersections.push({
                x: px - h * dy / d,
                y: py + h * dx / d
            });
        }
        
        // Filter for arcs - check if intersection is within arc span
        return intersections.filter(pt => {
            if (c1.type === 'arc') {
                const angle1 = Math.atan2(pt.y - c1.cy, pt.x - c1.cx);
                if (!c1.containsAngle(angle1)) return false;
            }
            if (c2.type === 'arc') {
                const angle2 = Math.atan2(pt.y - c2.cy, pt.x - c2.cx);
                if (!c2.containsAngle(angle2)) return false;
            }
            return true;
        });
    }
    
    // Find all intersections between a line and another entity
    findAllIntersections(line, entity) {
        let intersections = [];
        
        if (entity.type === 'line') {
            const int = Geometry.lineIntersection(
                line.x1, line.y1, line.x2, line.y2,
                entity.x1, entity.y1, entity.x2, entity.y2
            );
            if (int && int.t > 0.001 && int.t < 0.999 && int.u >= 0 && int.u <= 1) {
                intersections.push({ x: int.x, y: int.y, t: int.t });
            }
        } else if (entity.type === 'rect') {
            const edges = entity.toLines();
            for (const edge of edges) {
                const int = Geometry.lineIntersection(
                    line.x1, line.y1, line.x2, line.y2,
                    edge.x1, edge.y1, edge.x2, edge.y2
                );
                if (int && int.t > 0.001 && int.t < 0.999 && int.u >= 0 && int.u <= 1) {
                    intersections.push({ x: int.x, y: int.y, t: int.t });
                }
            }
        } else if (entity.type === 'circle') {
            const ints = this.lineCircleIntersection(line, entity);
            for (const pt of ints) {
                if (pt.t > 0.001 && pt.t < 0.999) {
                    intersections.push(pt);
                }
            }
        } else if (entity.type === 'arc') {
            // Find line-arc intersections
            const ints = this.lineCircleIntersection(line, entity);
            for (const pt of ints) {
                if (pt.t > 0.001 && pt.t < 0.999) {
                    // Check if the intersection point is within the arc's angular span
                    const angle = Math.atan2(pt.y - entity.cy, pt.x - entity.cx);
                    if (entity.containsAngle(angle)) {
                        intersections.push(pt);
                    }
                }
            }
        }
        
        return intersections;
    }
    
    lineCircleIntersection(line, circle) {
        const dx = line.x2 - line.x1;
        const dy = line.y2 - line.y1;
        const fx = line.x1 - circle.cx;
        const fy = line.y1 - circle.cy;
        
        const a = dx * dx + dy * dy;
        const b = 2 * (fx * dx + fy * dy);
        const c = fx * fx + fy * fy - circle.radius * circle.radius;
        
        const discriminant = b * b - 4 * a * c;
        
        if (discriminant < 0) return [];
        
        const intersections = [];
        const sqrtDisc = Math.sqrt(discriminant);
        
        const t1 = (-b - sqrtDisc) / (2 * a);
        const t2 = (-b + sqrtDisc) / (2 * a);
        
        if (t1 >= 0 && t1 <= 1) {
            intersections.push({
                x: line.x1 + t1 * dx,
                y: line.y1 + t1 * dy,
                t: t1
            });
        }
        
        if (discriminant > 0 && t2 >= 0 && t2 <= 1 && Math.abs(t2 - t1) > 0.001) {
            intersections.push({
                x: line.x1 + t2 * dx,
                y: line.y1 + t2 * dy,
                t: t2
            });
        }
        
        return intersections;
    }
    
    projectPointOnLine(point, line) {
        const dx = line.x2 - line.x1;
        const dy = line.y2 - line.y1;
        const lenSq = dx * dx + dy * dy;
        if (lenSq === 0) return 0;
        
        return ((point.x - line.x1) * dx + (point.y - line.y1) * dy) / lenSq;
    }
    
    // Hit test with larger tolerance for easier selection
    hitTestWithTolerance(worldPoint, tolerancePixels) {
        const tolerance = tolerancePixels / this.view.scale;
        
        for (let i = this.entities.length - 1; i >= 0; i--) {
            const entity = this.entities[i];
            
            if (entity.type === 'line') {
                const dist = Geometry.pointToLineDistance(
                    worldPoint.x, worldPoint.y,
                    entity.x1, entity.y1, entity.x2, entity.y2
                );
                if (dist <= tolerance) return entity;
            } else if (entity.type === 'rect') {
                const dist = Geometry.pointToRectDistance(worldPoint.x, worldPoint.y, entity);
                if (dist <= tolerance) return entity;
            } else if (entity.type === 'circle') {
                const distToCenter = Math.hypot(worldPoint.x - entity.cx, worldPoint.y - entity.cy);
                const distToEdge = Math.abs(distToCenter - entity.radius);
                if (distToEdge <= tolerance) return entity;
            } else if (entity.type === 'arc') {
                // Check distance to arc edge
                const distToCenter = Math.hypot(worldPoint.x - entity.cx, worldPoint.y - entity.cy);
                const distToEdge = Math.abs(distToCenter - entity.radius);
                if (distToEdge <= tolerance) {
                    // Also check if the point's angle is within the arc span
                    const angle = Math.atan2(worldPoint.y - entity.cy, worldPoint.x - entity.cx);
                    if (entity.containsAngle(angle)) {
                        return entity;
                    }
                }
            }
        }
        
        return null;
    }
    
    // ----------------------------------------
    // EXTEND TOOL (Fusion 360 style - auto-detect boundaries)
    // ----------------------------------------
    
    handleExtendClick(point) {
        // Apply the extend if we have a valid preview
        if (this.toolState.extendPreview && this.toolState.extendPreview.valid) {
            const preview = this.toolState.extendPreview;
            const line = preview.entity;
            
            if (preview.extendStart) {
                line.x1 = preview.newPoint.x;
                line.y1 = preview.newPoint.y;
            } else {
                line.x2 = preview.newPoint.x;
                line.y2 = preview.newPoint.y;
            }
            
            this.toolState.extendPreview = null;
            this.render();
        }
    }
    
    // Calculate extend preview on hover - finds nearest boundary automatically
    calculateExtendPreview() {
        const hitEntity = this.hitTestWithTolerance(this.mouse.world, 15);
        
        if (!hitEntity || hitEntity.type !== 'line') {
            this.toolState.extendPreview = null;
            return;
        }
        
        const line = hitEntity;
        
        // Find which end of the line is closer to the mouse
        const dist1 = Math.hypot(this.mouse.world.x - line.x1, this.mouse.world.y - line.y1);
        const dist2 = Math.hypot(this.mouse.world.x - line.x2, this.mouse.world.y - line.y2);
        const extendStart = dist1 < dist2;
        
        // Find the nearest boundary intersection in the extend direction
        let bestIntersection = null;
        let bestDistance = Infinity;
        
        for (const entity of this.entities) {
            if (entity === line) continue;
            
            const intersections = this.findExtendIntersections(line, entity);
            
            for (const int of intersections) {
                // Check if intersection is in the right direction
                if (extendStart && int.t < 0) {
                    const dist = Math.abs(int.t);
                    if (dist < bestDistance) {
                        bestDistance = dist;
                        bestIntersection = int;
                    }
                } else if (!extendStart && int.t > 1) {
                    const dist = int.t - 1;
                    if (dist < bestDistance) {
                        bestDistance = dist;
                        bestIntersection = int;
                    }
                }
            }
        }
        
        if (!bestIntersection) {
            this.toolState.extendPreview = { valid: false, entity: line, extendStart };
            return;
        }
        
        this.toolState.extendPreview = {
            valid: true,
            entity: line,
            extendStart: extendStart,
            newPoint: { x: bestIntersection.x, y: bestIntersection.y },
            addSegment: extendStart
                ? { x1: bestIntersection.x, y1: bestIntersection.y, x2: line.x1, y2: line.y1 }
                : { x1: line.x2, y1: line.y2, x2: bestIntersection.x, y2: bestIntersection.y }
        };
    }
    
    findExtendIntersections(line, entity) {
        let intersections = [];
        
        if (entity.type === 'line') {
            const int = Geometry.lineIntersection(
                line.x1, line.y1, line.x2, line.y2,
                entity.x1, entity.y1, entity.x2, entity.y2
            );
            if (int && int.u >= 0 && int.u <= 1) {
                intersections.push({ x: int.x, y: int.y, t: int.t });
            }
        } else if (entity.type === 'rect') {
            const edges = entity.toLines();
            for (const edge of edges) {
                const int = Geometry.lineIntersection(
                    line.x1, line.y1, line.x2, line.y2,
                    edge.x1, edge.y1, edge.x2, edge.y2
                );
                if (int && int.u >= 0 && int.u <= 1) {
                    intersections.push({ x: int.x, y: int.y, t: int.t });
                }
            }
        } else if (entity.type === 'circle') {
            const ints = this.lineCircleIntersectionExtended(line, entity);
            intersections.push(...ints);
        }
        
        return intersections;
    }
    
    lineCircleIntersectionExtended(line, circle) {
        const dx = line.x2 - line.x1;
        const dy = line.y2 - line.y1;
        const fx = line.x1 - circle.cx;
        const fy = line.y1 - circle.cy;
        
        const a = dx * dx + dy * dy;
        const b = 2 * (fx * dx + fy * dy);
        const c = fx * fx + fy * fy - circle.radius * circle.radius;
        
        const discriminant = b * b - 4 * a * c;
        
        if (discriminant < 0) return [];
        
        const intersections = [];
        const sqrtDisc = Math.sqrt(discriminant);
        
        const t1 = (-b - sqrtDisc) / (2 * a);
        const t2 = (-b + sqrtDisc) / (2 * a);
        
        intersections.push({
            x: line.x1 + t1 * dx,
            y: line.y1 + t1 * dy,
            t: t1
        });
        
        if (discriminant > 0 && Math.abs(t2 - t1) > 0.001) {
            intersections.push({
                x: line.x1 + t2 * dx,
                y: line.y1 + t2 * dy,
                t: t2
            });
        }
        
        return intersections;
    }
    
    // ----------------------------------------
    // OFFSET TOOL
    // ----------------------------------------
    
    handleOffsetClick(point) {
        if (!this.toolState.offsetEntity) {
            // First click - select entity to offset
            const hitEntity = this.hitTest(this.mouse.world);
            if (hitEntity && (hitEntity.type === 'line' || hitEntity.type === 'circle')) {
                this.toolState.offsetEntity = hitEntity;
                this.showDimensionInput('offset');
            }
        } else {
            // Second click - determine offset direction and create offset
            this.performOffset(point);
        }
    }
    
    performOffset(point) {
        const entity = this.toolState.offsetEntity;
        const distance = this.toolState.offsetDistance;
        
        if (entity.type === 'line') {
            // Calculate perpendicular direction
            const dx = entity.x2 - entity.x1;
            const dy = entity.y2 - entity.y1;
            const len = Math.hypot(dx, dy);
            const perpX = -dy / len;
            const perpY = dx / len;
            
            // Determine which side the click is on
            const midX = (entity.x1 + entity.x2) / 2;
            const midY = (entity.y1 + entity.y2) / 2;
            const clickVecX = point.x - midX;
            const clickVecY = point.y - midY;
            const dot = clickVecX * perpX + clickVecY * perpY;
            const sign = dot >= 0 ? 1 : -1;
            
            // Create offset line
            const offsetLine = new Line(
                entity.x1 + perpX * distance * sign,
                entity.y1 + perpY * distance * sign,
                entity.x2 + perpX * distance * sign,
                entity.y2 + perpY * distance * sign
            );
            this.entities.push(offsetLine);
        } else if (entity.type === 'circle') {
            // Determine if offset is inward or outward
            const distToCenter = Math.hypot(point.x - entity.cx, point.y - entity.cy);
            const sign = distToCenter > entity.radius ? 1 : -1;
            const newRadius = entity.radius + distance * sign;
            
            if (newRadius > 0) {
                const offsetCircle = new Circle(entity.cx, entity.cy, newRadius);
                this.entities.push(offsetCircle);
            }
        }
        
        this.invalidateSnapCache();
        this.saveToHistory();
        
        // Keep the entity selected for multiple offsets
        this.toolState.offsetEntity = entity;
        this.render();
    }
    
    // ----------------------------------------
    // SCALE TOOL
    // ----------------------------------------
    
    handleScaleClick(point) {
        if (this.toolState.scaleEntities.length === 0) {
            // Check if there are already selected entities
            const selected = this.entities.filter(e => e.selected);
            if (selected.length > 0) {
                this.toolState.scaleEntities = selected;
                this.updateStatus();
            } else {
                // First: select entity to scale
                const hitEntity = this.hitTest(this.mouse.world);
                if (hitEntity) {
                    hitEntity.selected = true;
                    this.toolState.scaleEntities = [hitEntity];
                    this.updateStatus();
                }
            }
        } else if (!this.toolState.scaleBasePoint) {
            // Check if clicking on another entity to add to selection
            const hitEntity = this.hitTest(this.mouse.world);
            if (hitEntity && !hitEntity.selected) {
                hitEntity.selected = true;
                this.toolState.scaleEntities.push(hitEntity);
                this.updateStatus();
            } else {
                // Set base point
                this.toolState.scaleBasePoint = { ...point };
                this.toolState.scaleReference = 50; // Reference distance for mouse-based scaling
                this.showDimensionInput('scale');
            }
        } else {
            // Third: set scale by second point
            const basePoint = this.toolState.scaleBasePoint;
            const dist2 = Math.hypot(point.x - basePoint.x, point.y - basePoint.y);
            
            if (dist2 > 0.001) {
                // Use the reference distance to calculate scale factor
                const scaleFactor = dist2 / this.toolState.scaleReference;
                this.applyScale(scaleFactor);
            }
        }
    }
    
    applyScale(scaleFactor) {
        if (scaleFactor <= 0 || !this.toolState.scaleBasePoint) return;
        
        const basePoint = this.toolState.scaleBasePoint;
        
        this.toolState.scaleEntities.forEach(entity => {
            if (entity.type === 'line') {
                // Scale line endpoints relative to base point
                entity.x1 = basePoint.x + (entity.x1 - basePoint.x) * scaleFactor;
                entity.y1 = basePoint.y + (entity.y1 - basePoint.y) * scaleFactor;
                entity.x2 = basePoint.x + (entity.x2 - basePoint.x) * scaleFactor;
                entity.y2 = basePoint.y + (entity.y2 - basePoint.y) * scaleFactor;
            } else if (entity.type === 'circle') {
                // Scale circle center and radius
                entity.cx = basePoint.x + (entity.cx - basePoint.x) * scaleFactor;
                entity.cy = basePoint.y + (entity.cy - basePoint.y) * scaleFactor;
                entity.radius *= scaleFactor;
            } else if (entity.type === 'arc') {
                // Scale arc center and radius (angles stay the same)
                entity.cx = basePoint.x + (entity.cx - basePoint.x) * scaleFactor;
                entity.cy = basePoint.y + (entity.cy - basePoint.y) * scaleFactor;
                entity.radius *= scaleFactor;
            } else if (entity.type === 'rect') {
                // Scale rectangle
                entity.x1 = basePoint.x + (entity.x1 - basePoint.x) * scaleFactor;
                entity.y1 = basePoint.y + (entity.y1 - basePoint.y) * scaleFactor;
                entity.x2 = basePoint.x + (entity.x2 - basePoint.x) * scaleFactor;
                entity.y2 = basePoint.y + (entity.y2 - basePoint.y) * scaleFactor;
            } else if (entity.type === 'text') {
                // Scale text position and size
                entity.x = basePoint.x + (entity.x - basePoint.x) * scaleFactor;
                entity.y = basePoint.y + (entity.y - basePoint.y) * scaleFactor;
                entity.height *= scaleFactor;
            }
            entity.selected = false;
        });
        
        this.invalidateSnapCache();
        this.saveToHistory();
        
        // Reset scale tool
        this.toolState.scaleEntities = [];
        this.toolState.scaleBasePoint = null;
        this.hideDimensionInput();
        this.render();
    }
    
    // ----------------------------------------
    // ROTATE TOOL
    // ----------------------------------------
    
    handleRotateClick(point) {
        if (this.toolState.rotateEntities.length === 0) {
            // Check if there are already selected entities
            const selected = this.entities.filter(e => e.selected);
            if (selected.length > 0) {
                this.toolState.rotateEntities = selected;
                this.updateStatus();
            } else {
                // First: select entity to rotate
                const hitEntity = this.hitTest(this.mouse.world);
                if (hitEntity) {
                    hitEntity.selected = true;
                    this.toolState.rotateEntities = [hitEntity];
                    this.updateStatus();
                }
            }
        } else if (!this.toolState.rotateCenter) {
            // Second: set center point
            this.toolState.rotateCenter = { ...point };
            // Start angle will be set on first mouse move
            this.toolState.rotateStartAngle = null;
            this.updateStatus();
        } else {
            // Third: apply rotation based on mouse position
            const angle = Math.atan2(
                point.y - this.toolState.rotateCenter.y,
                point.x - this.toolState.rotateCenter.x
            );
            
            const deltaAngle = angle - this.toolState.rotateStartAngle;
            this.applyRotation(deltaAngle);
        }
    }
    
    getRotatePreviewAngle() {
        if (!this.toolState.rotateCenter || 
            this.toolState.rotateEntities.length === 0 ||
            this.toolState.rotateStartAngle === null) {
            return 0;
        }
        
        const currentAngle = Math.atan2(
            this.mouse.world.y - this.toolState.rotateCenter.y,
            this.mouse.world.x - this.toolState.rotateCenter.x
        );
        
        return currentAngle - this.toolState.rotateStartAngle;
    }
    
    applyRotation(angle) {
        if (!this.toolState.rotateCenter) return;
        
        const center = this.toolState.rotateCenter;
        
        this.toolState.rotateEntities.forEach(entity => {
            this.rotateEntityAroundPoint(entity, center, angle);
            entity.selected = false;
        });
        
        this.invalidateSnapCache();
        this.saveToHistory();
        
        // Reset rotate tool
        this.toolState.rotateEntities = [];
        this.toolState.rotateCenter = null;
        this.toolState.rotateStartAngle = null;
        this.hideDimensionInput();
        this.render();
    }
    
    // ----------------------------------------
    // RECTANGULAR PATTERN TOOL
    // ----------------------------------------
    
    handleRectPatternClick(point) {
        if (this.toolState.patternEntities.length === 0) {
            // Check if there are already selected entities
            const selected = this.entities.filter(e => e.selected);
            if (selected.length > 0) {
                this.toolState.patternEntities = [...selected];
                this.toolState.patternType = 'rect';
                this.updateStatus();
                this.render();
            } else {
                // Select entity
                const hitEntity = this.hitTest(this.mouse.world);
                if (hitEntity) {
                    hitEntity.selected = true;
                    this.toolState.patternEntities = [hitEntity];
                    this.toolState.patternType = 'rect';
                    this.updateStatus();
                    this.render();
                }
            }
        } else if (!this.toolState.patternBasePoint) {
            // Set base point and show input dialog
            this.toolState.patternBasePoint = { ...point };
            this.showPatternInput('rect');
            this.render();
        }
    }
    
    // ----------------------------------------
    // CIRCULAR PATTERN TOOL
    // ----------------------------------------
    
    handleCircPatternClick(point) {
        if (this.toolState.patternEntities.length === 0) {
            // Check if there are already selected entities
            const selected = this.entities.filter(e => e.selected);
            if (selected.length > 0) {
                this.toolState.patternEntities = [...selected];
                this.toolState.patternType = 'circ';
                this.updateStatus();
                this.render();
            } else {
                // Select entity
                const hitEntity = this.hitTest(this.mouse.world);
                if (hitEntity) {
                    hitEntity.selected = true;
                    this.toolState.patternEntities = [hitEntity];
                    this.toolState.patternType = 'circ';
                    this.updateStatus();
                    this.render();
                }
            }
        } else if (!this.toolState.patternBasePoint) {
            // Set center point and show input dialog
            this.toolState.patternBasePoint = { ...point };
            this.showPatternInput('circ');
            this.render();
        }
    }
    
    showPatternInput(type) {
        const panel = document.getElementById('dimensionInput');
        const title = document.getElementById('dimInputTitle');
        
        // Hide all input field groups first
        document.getElementById('lineInputFields').style.display = 'none';
        document.getElementById('rectInputFields').style.display = 'none';
        document.getElementById('circleInputFields').style.display = 'none';
        const offsetFields = document.getElementById('offsetInputFields');
        const scaleFields = document.getElementById('scaleInputFields');
        const rectPatternFields = document.getElementById('rectPatternFields');
        const circPatternFields = document.getElementById('circPatternFields');
        
        if (offsetFields) offsetFields.style.display = 'none';
        if (scaleFields) scaleFields.style.display = 'none';
        if (rectPatternFields) rectPatternFields.style.display = 'none';
        if (circPatternFields) circPatternFields.style.display = 'none';
        
        if (type === 'rect') {
            title.textContent = 'Rectangular Pattern';
            if (rectPatternFields) rectPatternFields.style.display = 'flex';
            
            // Update unit labels
            document.getElementById('spacingXUnit').textContent = CONFIG.units;
            document.getElementById('spacingYUnit').textContent = CONFIG.units;
        } else if (type === 'circ') {
            title.textContent = 'Circular Pattern';
            if (circPatternFields) circPatternFields.style.display = 'flex';
            
            // Update unit labels
            document.getElementById('patternRadiusUnit').textContent = CONFIG.units;
            
            // Calculate default radius based on distance from base point to first entity
            if (this.toolState.patternEntities.length > 0 && this.toolState.patternBasePoint) {
                const entity = this.toolState.patternEntities[0];
                let entityCenter = this.getEntityCenter(entity);
                const dist = Math.hypot(
                    entityCenter.x - this.toolState.patternBasePoint.x,
                    entityCenter.y - this.toolState.patternBasePoint.y
                );
                document.getElementById('patternRadiusInput').value = Units.toDisplay(dist).toFixed(2);
            }
        }
        
        this.dimInputType = type + 'Pattern';
        panel.classList.add('visible');
        this.dimInputVisible = true;
        
        // Initialize live preview
        this.updatePatternPreview();
    }
    
    getEntityCenter(entity) {
        if (entity.type === 'line') {
            return {
                x: (entity.x1 + entity.x2) / 2,
                y: (entity.y1 + entity.y2) / 2
            };
        } else if (entity.type === 'circle' || entity.type === 'arc') {
            return { x: entity.cx, y: entity.cy };
        } else if (entity.type === 'rect') {
            return {
                x: (entity.x1 + entity.x2) / 2,
                y: (entity.y1 + entity.y2) / 2
            };
        }
        return { x: 0, y: 0 };
    }
    
    applyRectPattern() {
        const countX = parseInt(document.getElementById('patternCountX').value) || 1;
        const countY = parseInt(document.getElementById('patternCountY').value) || 1;
        const spacingX = Units.toInternal(parseFloat(document.getElementById('patternSpacingX').value) || 0);
        const spacingY = Units.toInternal(parseFloat(document.getElementById('patternSpacingY').value) || 0);
        
        if (countX < 1 || countY < 1) return;
        
        const basePoint = this.toolState.patternBasePoint;
        const sourceEntities = this.toolState.patternEntities;
        
        // Create copies for each grid position (skip 0,0 as that's the original)
        for (let ix = 0; ix < countX; ix++) {
            for (let iy = 0; iy < countY; iy++) {
                if (ix === 0 && iy === 0) continue; // Skip original position
                
                const offsetX = ix * spacingX;
                const offsetY = iy * spacingY;
                
                for (const entity of sourceEntities) {
                    const copy = this.cloneEntity(entity);
                    copy.translate(offsetX, offsetY);
                    copy.selected = false;
                    this.entities.push(copy);
                }
            }
        }
        
        // Deselect original entities
        sourceEntities.forEach(e => e.selected = false);
        
        this.invalidateSnapCache();
        this.saveToHistory();
        
        // Reset pattern tool
        this.toolState.patternEntities = [];
        this.toolState.patternBasePoint = null;
        this.toolState.patternType = null;
        this.hideDimensionInput();
        this.render();
    }
    
    applyCircPattern() {
        const count = parseInt(document.getElementById('patternCount').value) || 2;
        const startAngle = (parseFloat(document.getElementById('patternStartAngle').value) || 0) * Math.PI / 180;
        const sweepAngle = (parseFloat(document.getElementById('patternSweep').value) || 360) * Math.PI / 180;
        
        if (count < 2) return;
        if (!this.toolState.patternBasePoint || this.toolState.patternEntities.length === 0) return;
        
        const centerPoint = this.toolState.patternBasePoint;
        const sourceEntities = this.toolState.patternEntities;
        
        // Calculate angle between each copy (for count items over sweep angle)
        // If sweep is 360 and we want items evenly spaced INCLUDING the original,
        // we need count-1 gaps for count items in a full circle, or count gaps if not full circle
        const isFull360 = Math.abs(sweepAngle - Math.PI * 2) < 0.01;
        const angleStep = isFull360 ? sweepAngle / count : sweepAngle / (count - 1);
        
        // Create copies for each angular position (skip 0 as that's the original)
        for (let i = 1; i < count; i++) {
            const angle = startAngle + i * angleStep;
            
            for (const entity of sourceEntities) {
                const copy = this.cloneEntity(entity);
                if (!copy) continue;
                
                // Rotate copy around center point
                this.rotateEntityAroundPoint(copy, centerPoint, angle);
                
                copy.selected = false;
                this.entities.push(copy);
            }
        }
        
        // Rotate original entities if start angle is not 0
        if (Math.abs(startAngle) > 0.001) {
            for (const entity of sourceEntities) {
                this.rotateEntityAroundPoint(entity, centerPoint, startAngle);
            }
        }
        
        // Deselect original entities
        sourceEntities.forEach(e => e.selected = false);
        
        this.invalidateSnapCache();
        this.saveToHistory();
        
        // Reset pattern tool
        this.toolState.patternEntities = [];
        this.toolState.patternBasePoint = null;
        this.toolState.patternType = null;
        this.hideDimensionInput();
        this.render();
    }

    cloneEntity(entity) {
        if (entity.type === 'line') {
            return new Line(entity.x1, entity.y1, entity.x2, entity.y2);
        } else if (entity.type === 'circle') {
            return new Circle(entity.cx, entity.cy, entity.radius);
        } else if (entity.type === 'arc') {
            return new Arc(entity.cx, entity.cy, entity.radius, entity.startAngle, entity.endAngle);
        } else if (entity.type === 'rect') {
            return new Rectangle(entity.x1, entity.y1, entity.x2, entity.y2);
        } else if (entity.type === 'dim') {
            const dim = new Dimension(entity.x1, entity.y1, entity.x2, entity.y2);
            dim.offset = entity.offset;
            return dim;
        } else if (entity.type === 'text') {
            return new Text(entity.x, entity.y, entity.text, entity.height, entity.rotation);
        }
        return null;
    }
    
    rotateEntityAroundPoint(entity, center, angle) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        
        const rotatePoint = (x, y) => {
            const dx = x - center.x;
            const dy = y - center.y;
            return {
                x: center.x + dx * cos - dy * sin,
                y: center.y + dx * sin + dy * cos
            };
        };
        
        if (entity.type === 'line' || entity.type === 'dim') {
            const p1 = rotatePoint(entity.x1, entity.y1);
            const p2 = rotatePoint(entity.x2, entity.y2);
            entity.x1 = p1.x;
            entity.y1 = p1.y;
            entity.x2 = p2.x;
            entity.y2 = p2.y;
        } else if (entity.type === 'circle') {
            const newCenter = rotatePoint(entity.cx, entity.cy);
            entity.cx = newCenter.x;
            entity.cy = newCenter.y;
        } else if (entity.type === 'arc') {
            const newCenter = rotatePoint(entity.cx, entity.cy);
            entity.cx = newCenter.x;
            entity.cy = newCenter.y;
            entity.startAngle += angle;
            entity.endAngle += angle;
        } else if (entity.type === 'rect') {
            const p1 = rotatePoint(entity.x1, entity.y1);
            const p2 = rotatePoint(entity.x2, entity.y2);
            entity.x1 = p1.x;
            entity.y1 = p1.y;
            entity.x2 = p2.x;
            entity.y2 = p2.y;
        } else if (entity.type === 'text') {
            const newPos = rotatePoint(entity.x, entity.y);
            entity.x = newPos.x;
            entity.y = newPos.y;
            entity.rotation += angle;
        }
    }
    
    // ----------------------------------------
    // VIEW CONTROLS
    // ----------------------------------------
    
    centerView() {
        const container = this.canvas.parentElement;
        this.view.offsetX = container.clientWidth / 2;
        this.view.offsetY = container.clientHeight / 2;
        this.view.scale = 2;  // 2 pixels per unit
        this.updateZoomDisplay();
    }
    
    zoomExtents() {
        if (this.entities.length === 0) {
            this.centerView();
            this.render();
            return;
        }
        
        // Calculate bounds of all entities
        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;
        
        for (const entity of this.entities) {
            const bounds = entity.getBounds();
            minX = Math.min(minX, bounds.minX);
            minY = Math.min(minY, bounds.minY);
            maxX = Math.max(maxX, bounds.maxX);
            maxY = Math.max(maxY, bounds.maxY);
        }
        
        const container = this.canvas.parentElement;
        this.view.fitToBounds(
            { minX, minY, maxX, maxY },
            container.clientWidth,
            container.clientHeight
        );
        
        this.updateZoomDisplay();
        this.render();
    }
    
    zoomIn() {
        const container = this.canvas.parentElement;
        this.view.zoomAt(
            container.clientWidth / 2,
            container.clientHeight / 2,
            CONFIG.zoomFactor
        );
        this.updateZoomDisplay();
        this.render();
    }
    
    zoomOut() {
        const container = this.canvas.parentElement;
        this.view.zoomAt(
            container.clientWidth / 2,
            container.clientHeight / 2,
            1 / CONFIG.zoomFactor
        );
        this.updateZoomDisplay();
        this.render();
    }
    
    updateZoomDisplay() {
        const percent = Math.round(this.view.scale * 50);  // Assuming 2 = 100%
        document.getElementById('zoomLevel').textContent = percent + '%';
    }
    
    // ----------------------------------------
    // RENDERING
    // ----------------------------------------
    
    render() {
        const container = this.canvas.parentElement;
        const width = container.clientWidth;
        const height = container.clientHeight;
        
        // Clear canvas
        this.ctx.fillStyle = CONFIG.colors.background;
        this.ctx.fillRect(0, 0, width, height);
        
        // Draw grid
        this.drawGrid(width, height);
        
        // Draw axes
        this.drawAxes(width, height);
        
        // Calculate visible bounds for culling
        const visibleBounds = this.getVisibleBounds();
        
        // Draw entities (with view culling for performance)
        for (const entity of this.entities) {
            if (this.isEntityVisible(entity, visibleBounds)) {
                this.drawEntity(entity);
            }
        }
        
        // Draw preview
        this.drawPreview();
        
        // Draw trim/extend previews
        this.drawTrimExtendPreview();
        
        // Draw selection box
        this.drawSelectionBox();
        
        // Draw offset preview
        this.drawOffsetPreview();
        
        // Draw scale preview
        this.drawScalePreview();
        
        // Draw rotate preview
        this.drawRotatePreview();
        
        // Draw pattern preview
        this.drawPatternPreview();
        
        // Draw grips for selected entities
        this.drawGrips();
        
        // Draw tracking lines
        this.drawTrackingLines();
        
        // Draw crosshair at cursor
        this.drawCrosshair();
    }
    
    // Throttled render - uses requestAnimationFrame to limit render calls
    requestRender() {
        if (this.renderPending) return;
        this.renderPending = true;
        requestAnimationFrame(() => {
            this.renderPending = false;
            this.render();
        });
    }
    
    // Invalidate snap points cache when entities change
    invalidateSnapCache() {
        this.snapPointsCacheValid = false;
        this.snapPointsCache = null;
    }
    
    // Add entity with cache invalidation
    addEntity(entity) {
        this.entities.push(entity);
        this.invalidateSnapCache();
    }
    
    // ----------------------------------------
    // HISTORY / UNDO-REDO SYSTEM
    // ----------------------------------------
    
    // Save current state to history
    saveToHistory() {
        if (this.isUndoRedo) return;
        
        // If we're not at the end of history, remove future states
        if (this.historyIndex < this.history.length - 1) {
            this.history = this.history.slice(0, this.historyIndex + 1);
        }
        
        // Serialize current entities
        const snapshot = this.serializeEntities();
        
        // Add to history
        this.history.push({
            entities: snapshot,
            timestamp: Date.now()
        });
        
        // Limit history size
        if (this.history.length > this.maxHistory) {
            this.history.shift();
        } else {
            this.historyIndex++;
        }
        
        // Update history bar
        this.updateHistoryBar();
    }
    
    // Serialize all entities to a JSON-safe format
    serializeEntities() {
        return this.entities.map(e => {
            const obj = { type: e.type, selected: e.selected };
            if (e.type === 'line') {
                obj.x1 = e.x1; obj.y1 = e.y1;
                obj.x2 = e.x2; obj.y2 = e.y2;
            } else if (e.type === 'rect') {
                obj.x1 = e.x1; obj.y1 = e.y1;
                obj.x2 = e.x2; obj.y2 = e.y2;
            } else if (e.type === 'circle') {
                obj.cx = e.cx; obj.cy = e.cy;
                obj.radius = e.radius;
            } else if (e.type === 'arc') {
                obj.cx = e.cx; obj.cy = e.cy;
                obj.radius = e.radius;
                obj.startAngle = e.startAngle;
                obj.endAngle = e.endAngle;
            } else if (e.type === 'dim') {
                obj.x1 = e.x1; obj.y1 = e.y1;
                obj.x2 = e.x2; obj.y2 = e.y2;
                obj.offset = e.offset;
            } else if (e.type === 'text') {
                obj.x = e.x; obj.y = e.y;
                obj.text = e.text;
                obj.height = e.height;
                obj.rotation = e.rotation;
            }
            return obj;
        });
    }
    
    // Deserialize entities from snapshot
    deserializeEntities(snapshot) {
        return snapshot.map(item => {
            let entity;
            switch (item.type) {
                case 'line':
                    entity = new Line(item.x1, item.y1, item.x2, item.y2);
                    break;
                case 'rect':
                    entity = new Rectangle(item.x1, item.y1, item.x2, item.y2);
                    break;
                case 'circle':
                    entity = new Circle(item.cx, item.cy, item.radius);
                    break;
                case 'arc':
                    entity = new Arc(item.cx, item.cy, item.radius, item.startAngle, item.endAngle);
                    break;
                case 'dim':
                    entity = new Dimension(item.x1, item.y1, item.x2, item.y2);
                    if (item.offset) entity.offset = item.offset;
                    break;
                case 'text':
                    entity = new Text(item.x, item.y, item.text, item.height, item.rotation);
                    break;
            }
            if (entity && item.selected) entity.selected = true;
            return entity;
        }).filter(e => e !== undefined);
    }
    
    // Undo last action
    undo() {
        if (this.historyIndex <= 0) return;
        
        this.isUndoRedo = true;
        this.historyIndex--;
        
        const snapshot = this.history[this.historyIndex];
        this.entities = this.deserializeEntities(snapshot.entities);
        
        this.invalidateSnapCache();
        this.clearSelection();
        this.updateHistoryBar();
        this.render();
        this.isUndoRedo = false;
    }
    
    // Redo undone action
    redo() {
        if (this.historyIndex >= this.history.length - 1) return;
        
        this.isUndoRedo = true;
        this.historyIndex++;
        
        const snapshot = this.history[this.historyIndex];
        this.entities = this.deserializeEntities(snapshot.entities);
        
        this.invalidateSnapCache();
        this.clearSelection();
        this.updateHistoryBar();
        this.render();
        this.isUndoRedo = false;
    }
    
    // Jump to specific history state
    jumpToHistory(index) {
        if (index < 0 || index >= this.history.length || index === this.historyIndex) return;
        
        this.isUndoRedo = true;
        this.historyIndex = index;
        
        const snapshot = this.history[this.historyIndex];
        this.entities = this.deserializeEntities(snapshot.entities);
        
        this.invalidateSnapCache();
        this.clearSelection();
        this.updateHistoryBar();
        this.render();
        this.isUndoRedo = false;
    }
    
    // Update the visual history bar
    updateHistoryBar() {
        const container = document.getElementById('historyBar');
        if (!container) return;
        
        container.innerHTML = '';
        
        this.history.forEach((snapshot, index) => {
            const item = document.createElement('div');
            item.className = 'history-item' + (index === this.historyIndex ? ' active' : '');
            if (index > this.historyIndex) item.classList.add('future');
            
            // Create mini preview
            const canvas = document.createElement('canvas');
            canvas.width = 40;
            canvas.height = 30;
            this.drawHistoryThumbnail(canvas, snapshot.entities);
            
            item.appendChild(canvas);
            
            // Add step number
            const label = document.createElement('span');
            label.className = 'history-label';
            label.textContent = index + 1;
            item.appendChild(label);
            
            item.addEventListener('click', () => this.jumpToHistory(index));
            item.title = `Step ${index + 1} - Click to restore`;
            
            container.appendChild(item);
        });
        
        // Scroll to active item
        const activeItem = container.querySelector('.history-item.active');
        if (activeItem) {
            activeItem.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        }
    }
    
    // Draw a mini thumbnail for history
    drawHistoryThumbnail(canvas, entities) {
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        
        // Dark background
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, width, height);
        
        if (entities.length === 0) {
            ctx.fillStyle = '#333';
            ctx.fillRect(width/2 - 5, height/2 - 5, 10, 10);
            return;
        }
        
        // Calculate bounds
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        
        for (const e of entities) {
            if (e.type === 'line' || e.type === 'rect' || e.type === 'dim') {
                minX = Math.min(minX, e.x1, e.x2);
                maxX = Math.max(maxX, e.x1, e.x2);
                minY = Math.min(minY, e.y1, e.y2);
                maxY = Math.max(maxY, e.y1, e.y2);
            } else if (e.type === 'circle' || e.type === 'arc') {
                minX = Math.min(minX, e.cx - e.radius);
                maxX = Math.max(maxX, e.cx + e.radius);
                minY = Math.min(minY, e.cy - e.radius);
                maxY = Math.max(maxY, e.cy + e.radius);
            } else if (e.type === 'text') {
                minX = Math.min(minX, e.x);
                maxX = Math.max(maxX, e.x + e.height * 3);
                minY = Math.min(minY, e.y);
                maxY = Math.max(maxY, e.y + e.height);
            }
        }
        
        // Add padding
        const padding = 4;
        const rangeX = maxX - minX || 1;
        const rangeY = maxY - minY || 1;
        const scaleX = (width - padding * 2) / rangeX;
        const scaleY = (height - padding * 2) / rangeY;
        const scale = Math.min(scaleX, scaleY);
        
        const offsetX = padding + (width - padding * 2 - rangeX * scale) / 2;
        const offsetY = padding + (height - padding * 2 - rangeY * scale) / 2;
        
        const toScreen = (x, y) => ({
            x: offsetX + (x - minX) * scale,
            y: height - (offsetY + (y - minY) * scale)
        });
        
        // Draw entities
        ctx.strokeStyle = '#00d4ff';
        ctx.lineWidth = 1;
        
        for (const e of entities) {
            ctx.beginPath();
            if (e.type === 'line') {
                const p1 = toScreen(e.x1, e.y1);
                const p2 = toScreen(e.x2, e.y2);
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);
            } else if (e.type === 'rect') {
                const p1 = toScreen(e.x1, e.y1);
                const p2 = toScreen(e.x2, e.y2);
                ctx.rect(Math.min(p1.x, p2.x), Math.min(p1.y, p2.y), 
                         Math.abs(p2.x - p1.x), Math.abs(p2.y - p1.y));
            } else if (e.type === 'circle') {
                const center = toScreen(e.cx, e.cy);
                const radius = e.radius * scale;
                ctx.arc(center.x, center.y, Math.max(1, radius), 0, Math.PI * 2);
            } else if (e.type === 'arc') {
                const center = toScreen(e.cx, e.cy);
                const radius = e.radius * scale;
                ctx.arc(center.x, center.y, Math.max(1, radius), -e.startAngle, -e.endAngle, true);
            } else if (e.type === 'text') {
                const pos = toScreen(e.x, e.y);
                ctx.fillStyle = '#00d4ff';
                ctx.font = '6px sans-serif';
                ctx.fillText('T', pos.x, pos.y);
            }
            ctx.stroke();
        }
    }

    // Remove entity with cache invalidation  
    removeEntity(entity) {
        const index = this.entities.indexOf(entity);
        if (index > -1) {
            this.entities.splice(index, 1);
            this.invalidateSnapCache();
        }
    }
    
    // Get visible world bounds for culling
    getVisibleBounds() {
        const topLeft = this.view.screenToWorld(0, 0);
        const bottomRight = this.view.screenToWorld(this.canvas.width, this.canvas.height);
        
        // Add padding to avoid popping at edges
        const padding = 50 / this.view.scale;
        
        return {
            minX: Math.min(topLeft.x, bottomRight.x) - padding,
            maxX: Math.max(topLeft.x, bottomRight.x) + padding,
            minY: Math.min(topLeft.y, bottomRight.y) - padding,
            maxY: Math.max(topLeft.y, bottomRight.y) + padding
        };
    }
    
    // Check if entity is within visible bounds
    isEntityVisible(entity, bounds) {
        const entityBounds = this.getEntityBounds(entity);
        if (!entityBounds) return true; // Draw if can't determine bounds
        
        // Check for intersection of bounding boxes
        return !(entityBounds.maxX < bounds.minX || 
                 entityBounds.minX > bounds.maxX ||
                 entityBounds.maxY < bounds.minY || 
                 entityBounds.minY > bounds.maxY);
    }
    
    // Get bounding box of an entity
    getEntityBounds(entity) {
        switch (entity.type) {
            case 'line':
                return {
                    minX: Math.min(entity.x1, entity.x2),
                    maxX: Math.max(entity.x1, entity.x2),
                    minY: Math.min(entity.y1, entity.y2),
                    maxY: Math.max(entity.y1, entity.y2)
                };
            case 'rect':
                return {
                    minX: Math.min(entity.x1, entity.x2),
                    maxX: Math.max(entity.x1, entity.x2),
                    minY: Math.min(entity.y1, entity.y2),
                    maxY: Math.max(entity.y1, entity.y2)
                };
            case 'circle':
                return {
                    minX: entity.cx - entity.radius,
                    maxX: entity.cx + entity.radius,
                    minY: entity.cy - entity.radius,
                    maxY: entity.cy + entity.radius
                };
            case 'arc':
                // For arcs, use full circle bounds (slightly over-inclusive but fast)
                return {
                    minX: entity.cx - entity.radius,
                    maxX: entity.cx + entity.radius,
                    minY: entity.cy - entity.radius,
                    maxY: entity.cy + entity.radius
                };
            case 'dim':
                const offset = Math.abs(entity.offset || 20);
                return {
                    minX: Math.min(entity.x1, entity.x2) - offset,
                    maxX: Math.max(entity.x1, entity.x2) + offset,
                    minY: Math.min(entity.y1, entity.y2) - offset,
                    maxY: Math.max(entity.y1, entity.y2) + offset
                };
            case 'text':
                return entity.getBounds();
            default:
                return null;
        }
    }
    
    drawGrid(width, height) {
        const ctx = this.ctx;
        
        // Calculate visible world bounds
        const topLeft = this.view.screenToWorld(0, 0);
        const bottomRight = this.view.screenToWorld(width, height);
        
        const minX = Math.min(topLeft.x, bottomRight.x);
        const maxX = Math.max(topLeft.x, bottomRight.x);
        const minY = Math.min(topLeft.y, bottomRight.y);
        const maxY = Math.max(topLeft.y, bottomRight.y);
        
        // Determine grid spacing based on zoom
        let gridSize = CONFIG.gridSize;
        const screenGridSize = gridSize * this.view.scale;
        
        // Adjust grid size to keep it visible
        while (screenGridSize < 20) {
            gridSize *= 5;
            if (gridSize * this.view.scale >= 20) break;
            gridSize *= 2;
            if (gridSize * this.view.scale >= 20) break;
        }
        
        const majorGridSize = gridSize * 5;
        
        // Limit grid lines to prevent slowdown
        const maxGridLines = 200;
        const numXLines = (maxX - minX) / gridSize;
        const numYLines = (maxY - minY) / gridSize;
        
        // Skip minor grid if too many lines
        if (numXLines < maxGridLines && numYLines < maxGridLines) {
            // Draw minor grid
            ctx.strokeStyle = CONFIG.colors.gridMinor;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            
            const startX = Math.floor(minX / gridSize) * gridSize;
            const startY = Math.floor(minY / gridSize) * gridSize;
            
            for (let x = startX; x <= maxX; x += gridSize) {
                if (x % majorGridSize !== 0) {
                    const screen = this.view.worldToScreen(x, 0);
                    ctx.moveTo(screen.x, 0);
                    ctx.lineTo(screen.x, height);
                }
            }
            
            for (let y = startY; y <= maxY; y += gridSize) {
                if (y % majorGridSize !== 0) {
                    const screen = this.view.worldToScreen(0, y);
                    ctx.moveTo(0, screen.y);
                    ctx.lineTo(width, screen.y);
                }
            }
            ctx.stroke();
        }
        
        // Draw major grid
        const numMajorXLines = (maxX - minX) / majorGridSize;
        const numMajorYLines = (maxY - minY) / majorGridSize;
        
        if (numMajorXLines < maxGridLines && numMajorYLines < maxGridLines) {
            ctx.strokeStyle = CONFIG.colors.gridMajor;
            ctx.lineWidth = 1;
            ctx.beginPath();
            
            const majorStartX = Math.floor(minX / majorGridSize) * majorGridSize;
            const majorStartY = Math.floor(minY / majorGridSize) * majorGridSize;
            
            for (let x = majorStartX; x <= maxX; x += majorGridSize) {
                const screen = this.view.worldToScreen(x, 0);
                ctx.moveTo(screen.x, 0);
                ctx.lineTo(screen.x, height);
            }
            
            for (let y = majorStartY; y <= maxY; y += majorGridSize) {
                const screen = this.view.worldToScreen(0, y);
                ctx.moveTo(0, screen.y);
                ctx.lineTo(width, screen.y);
            }
            ctx.stroke();
        }
    }
    
    drawAxes(width, height) {
        const ctx = this.ctx;
        const origin = this.view.worldToScreen(0, 0);
        
        ctx.strokeStyle = CONFIG.colors.axis;
        ctx.lineWidth = 1.5;
        
        // X axis
        ctx.beginPath();
        ctx.moveTo(0, origin.y);
        ctx.lineTo(width, origin.y);
        ctx.stroke();
        
        // Y axis
        ctx.beginPath();
        ctx.moveTo(origin.x, 0);
        ctx.lineTo(origin.x, height);
        ctx.stroke();
    }
    
    drawEntity(entity) {
        const ctx = this.ctx;
        
        // Determine color
        let color = CONFIG.colors.entity;
        if (entity.selected) {
            color = CONFIG.colors.selected;
        } else if (entity === this.hoveredEntity) {
            color = CONFIG.colors.entityHover;
        }
        
        if (entity.type === 'dim') {
            color = entity.selected ? CONFIG.colors.selected : CONFIG.colors.dimension;
        }
        
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = entity.selected ? 2.5 : 1.5;
        
        switch (entity.type) {
            case 'line':
                this.drawLine(entity);
                break;
            case 'rect':
                this.drawRect(entity);
                break;
            case 'circle':
                this.drawCircle(entity);
                break;
            case 'arc':
                this.drawArc(entity);
                break;
            case 'dim':
                this.drawDimension(entity);
                break;
            case 'text':
                this.drawText(entity);
                break;
        }
    }
    
    drawCircle(circle) {
        const ctx = this.ctx;
        const center = this.view.worldToScreen(circle.cx, circle.cy);
        const radiusScreen = circle.radius * this.view.scale;
        
        ctx.beginPath();
        ctx.arc(center.x, center.y, radiusScreen, 0, Math.PI * 2);
        ctx.stroke();
    }
    
    drawArc(arc) {
        const ctx = this.ctx;
        const center = this.view.worldToScreen(arc.cx, arc.cy);
        const radiusScreen = arc.radius * this.view.scale;
        
        // Note: Canvas arc uses clockwise direction, our angles are counterclockwise
        // So we draw from startAngle to endAngle counterclockwise (false = counterclockwise)
        ctx.beginPath();
        ctx.arc(center.x, center.y, radiusScreen, -arc.startAngle, -arc.endAngle, true);
        ctx.stroke();
    }
    
    drawText(text) {
        const ctx = this.ctx;
        const pos = this.view.worldToScreen(text.x, text.y);
        const heightScreen = text.height * this.view.scale;
        
        // Don't draw if too small to read
        if (heightScreen < 3) return;
        
        ctx.save();
        
        // Move to text position
        ctx.translate(pos.x, pos.y);
        
        // Apply rotation (negative because screen Y is inverted)
        ctx.rotate(-text.rotation);
        
        // Set font - scale based on text height
        const fontSize = Math.max(8, heightScreen);
        ctx.font = `${fontSize}px "JetBrains Mono", monospace`;
        ctx.textBaseline = 'bottom';
        ctx.textAlign = 'left';
        
        // Draw text (in screen coords, Y is inverted so we draw "up")
        ctx.fillText(text.text, 0, 0);
        
        ctx.restore();
    }
    
    drawLine(line) {
        const ctx = this.ctx;
        const p1 = this.view.worldToScreen(line.x1, line.y1);
        const p2 = this.view.worldToScreen(line.x2, line.y2);
        
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
    }
    
    drawRect(rect) {
        const ctx = this.ctx;
        const p1 = this.view.worldToScreen(rect.x1, rect.y1);
        const p2 = this.view.worldToScreen(rect.x2, rect.y2);
        
        // Draw as 4 separate lines (no fill, CAD style)
        ctx.beginPath();
        // Bottom
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p1.y);
        // Right
        ctx.lineTo(p2.x, p2.y);
        // Top
        ctx.lineTo(p1.x, p2.y);
        // Left
        ctx.lineTo(p1.x, p1.y);
        ctx.stroke();
    }
    
    drawDimension(dim) {
        const ctx = this.ctx;
        
        // Calculate dimension geometry
        const dx = dim.x2 - dim.x1;
        const dy = dim.y2 - dim.y1;
        const length = Math.sqrt(dx * dx + dy * dy);
        
        if (length === 0) return;
        
        // Perpendicular direction for offset
        const px = -dy / length;
        const py = dx / length;
        
        const offset = dim.offset;
        
        // Extension line endpoints
        const ext1Start = { x: dim.x1, y: dim.y1 };
        const ext1End = { x: dim.x1 + px * offset, y: dim.y1 + py * offset };
        const ext2Start = { x: dim.x2, y: dim.y2 };
        const ext2End = { x: dim.x2 + px * offset, y: dim.y2 + py * offset };
        
        // Dimension line endpoints
        const dimStart = ext1End;
        const dimEnd = ext2End;
        
        // Convert to screen coordinates
        const sExt1Start = this.view.worldToScreen(ext1Start.x, ext1Start.y);
        const sExt1End = this.view.worldToScreen(ext1End.x, ext1End.y);
        const sExt2Start = this.view.worldToScreen(ext2Start.x, ext2Start.y);
        const sExt2End = this.view.worldToScreen(ext2End.x, ext2End.y);
        const sDimStart = this.view.worldToScreen(dimStart.x, dimStart.y);
        const sDimEnd = this.view.worldToScreen(dimEnd.x, dimEnd.y);
        
        ctx.lineWidth = 1;
        
        // Draw extension lines
        ctx.beginPath();
        ctx.moveTo(sExt1Start.x, sExt1Start.y);
        ctx.lineTo(sExt1End.x, sExt1End.y);
        ctx.moveTo(sExt2Start.x, sExt2Start.y);
        ctx.lineTo(sExt2End.x, sExt2End.y);
        ctx.stroke();
        
        // Draw dimension line with arrows
        ctx.beginPath();
        ctx.moveTo(sDimStart.x, sDimStart.y);
        ctx.lineTo(sDimEnd.x, sDimEnd.y);
        ctx.stroke();
        
        // Draw arrows
        const arrowSize = CONFIG.arrowSize * this.view.scale;
        const angle = Math.atan2(sDimEnd.y - sDimStart.y, sDimEnd.x - sDimStart.x);
        
        this.drawArrow(sDimStart.x, sDimStart.y, angle, arrowSize);
        this.drawArrow(sDimEnd.x, sDimEnd.y, angle + Math.PI, arrowSize);
        
        // Draw text
        const midX = (sDimStart.x + sDimEnd.x) / 2;
        const midY = (sDimStart.y + sDimEnd.y) / 2;
        
        ctx.font = '12px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        
        // Background for text
        const text = dim.getText();
        const metrics = ctx.measureText(text);
        const padding = 4;
        
        ctx.fillStyle = CONFIG.colors.background;
        ctx.fillRect(
            midX - metrics.width / 2 - padding,
            midY - 16 - padding,
            metrics.width + padding * 2,
            16 + padding
        );
        
        ctx.fillStyle = dim.selected ? CONFIG.colors.selected : CONFIG.colors.dimension;
        ctx.fillText(text, midX, midY - 4);
    }
    
    drawArrow(x, y, angle, size) {
        const ctx = this.ctx;
        
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(
            x - size * Math.cos(angle - Math.PI / 6),
            y - size * Math.sin(angle - Math.PI / 6)
        );
        ctx.lineTo(
            x - size * Math.cos(angle + Math.PI / 6),
            y - size * Math.sin(angle + Math.PI / 6)
        );
        ctx.closePath();
        ctx.fill();
    }
    
    drawPreview() {
        // Handle arc preview separately (uses different state)
        if (this.currentTool === 'arc') {
            this.drawArcPreview();
            return;
        }
        
        if (!this.toolState.startPoint || !this.toolState.previewPoint) return;
        
        const ctx = this.ctx;
        const start = this.toolState.startPoint;
        const end = this.toolState.previewPoint;
        
        ctx.strokeStyle = CONFIG.colors.preview;
        ctx.fillStyle = CONFIG.colors.preview;
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        
        const p1 = this.view.worldToScreen(start.x, start.y);
        const p2 = this.view.worldToScreen(end.x, end.y);
        
        if (this.currentTool === 'line' || this.currentTool === 'dimension') {
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
            
            // Draw length and angle indicator for line tool
            if (this.currentTool === 'line') {
                this.drawPreviewDimensions(start, end, p1, p2);
            }
        } else if (this.currentTool === 'rect') {
            // Draw as 4 lines (outline only, no fill)
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.lineTo(p1.x, p2.y);
            ctx.lineTo(p1.x, p1.y);
            ctx.stroke();
            
            // Show width x height
            this.drawPreviewRectDimensions(start, end, p1, p2);
        } else if (this.currentTool === 'circle') {
            const radius = Math.hypot(end.x - start.x, end.y - start.y);
            const radiusScreen = radius * this.view.scale;
            
            ctx.beginPath();
            ctx.arc(p1.x, p1.y, radiusScreen, 0, Math.PI * 2);
            ctx.stroke();
            
            // Draw radius line
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
            
            // Show radius dimension
            this.drawPreviewCircleDimensions(start, radius, p1, p2);
        }
        
        ctx.setLineDash([]);
    }
    
    drawArcPreview() {
        const ctx = this.ctx;
        
        ctx.strokeStyle = CONFIG.colors.preview;
        ctx.fillStyle = CONFIG.colors.preview;
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        
        if (this.toolState.arcPoint1 && !this.toolState.arcPoint2) {
            // First point set, draw line to mouse
            const p1 = this.view.worldToScreen(this.toolState.arcPoint1.x, this.toolState.arcPoint1.y);
            const p2 = this.view.worldToScreen(this.mouse.snapped.x, this.mouse.snapped.y);
            
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
            
            // Draw point markers
            ctx.setLineDash([]);
            ctx.beginPath();
            ctx.arc(p1.x, p1.y, 5, 0, Math.PI * 2);
            ctx.fill();
            
        } else if (this.toolState.arcPoint1 && this.toolState.arcPoint2) {
            // Both points set, draw arc preview based on mouse position
            const p1World = this.toolState.arcPoint1;
            const p2World = this.toolState.arcPoint2;
            const p3World = this.mouse.snapped;
            
            // Try to create the preview arc
            const circle = this.circleFrom3Points(p1World, p2World, p3World);
            
            if (circle) {
                const { cx, cy, radius } = circle;
                const center = this.view.worldToScreen(cx, cy);
                const radiusScreen = radius * this.view.scale;
                
                // Calculate angles
                const startAngle = Math.atan2(p1World.y - cy, p1World.x - cx);
                const endAngle = Math.atan2(p2World.y - cy, p2World.x - cx);
                const midAngle = Math.atan2(p3World.y - cy, p3World.x - cx);
                
                // Determine direction
                const goClockwise = !this.isAngleBetween(midAngle, startAngle, endAngle);
                
                // Draw the preview arc
                ctx.beginPath();
                if (goClockwise) {
                    ctx.arc(center.x, center.y, radiusScreen, -startAngle, -endAngle, true);
                } else {
                    ctx.arc(center.x, center.y, radiusScreen, -endAngle, -startAngle, true);
                }
                ctx.stroke();
                
                // Draw center marker (faint)
                ctx.setLineDash([]);
                ctx.globalAlpha = 0.5;
                ctx.beginPath();
                ctx.moveTo(center.x - 5, center.y);
                ctx.lineTo(center.x + 5, center.y);
                ctx.moveTo(center.x, center.y - 5);
                ctx.lineTo(center.x, center.y + 5);
                ctx.stroke();
                ctx.globalAlpha = 1.0;
            } else {
                // Points are collinear, just draw a straight line
                const p1 = this.view.worldToScreen(p1World.x, p1World.y);
                const p2 = this.view.worldToScreen(p2World.x, p2World.y);
                
                ctx.beginPath();
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.stroke();
            }
            
            // Draw point markers
            ctx.setLineDash([]);
            const screenP1 = this.view.worldToScreen(p1World.x, p1World.y);
            const screenP2 = this.view.worldToScreen(p2World.x, p2World.y);
            const screenP3 = this.view.worldToScreen(p3World.x, p3World.y);
            
            // Start point - filled
            ctx.fillStyle = '#4ecdc4';
            ctx.beginPath();
            ctx.arc(screenP1.x, screenP1.y, 5, 0, Math.PI * 2);
            ctx.fill();
            
            // End point - filled
            ctx.fillStyle = '#ff6b6b';
            ctx.beginPath();
            ctx.arc(screenP2.x, screenP2.y, 5, 0, Math.PI * 2);
            ctx.fill();
            
            // Third point (curvature) - hollow
            ctx.strokeStyle = '#ffd93d';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(screenP3.x, screenP3.y, 5, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        ctx.setLineDash([]);
    }
    
    drawPreviewCircleDimensions(center, radius, p1, p2) {
        const ctx = this.ctx;
        
        if (radius < 0.1) return;
        
        // Calculate midpoint of radius line for text
        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;
        
        const text = `R ${Units.toDisplay(radius).toFixed(2)} ${CONFIG.units}`;
        
        ctx.font = '12px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        
        const metrics = ctx.measureText(text);
        const padding = 6;
        const boxHeight = 20;
        
        // Background
        ctx.fillStyle = CONFIG.colors.background + 'ee';
        ctx.setLineDash([]);
        ctx.fillRect(
            midX - metrics.width / 2 - padding,
            midY - boxHeight - padding - 10,
            metrics.width + padding * 2,
            boxHeight + padding
        );
        
        // Border
        ctx.strokeStyle = CONFIG.colors.crosshair;
        ctx.lineWidth = 1;
        ctx.strokeRect(
            midX - metrics.width / 2 - padding,
            midY - boxHeight - padding - 10,
            metrics.width + padding * 2,
            boxHeight + padding
        );
        
        // Text
        ctx.fillStyle = CONFIG.colors.crosshair;
        ctx.fillText(text, midX, midY - 10);
    }
    
    drawPreviewDimensions(start, end, p1, p2) {
        const ctx = this.ctx;
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * 180 / Math.PI;
        
        if (length < 0.1) return;
        
        // Calculate midpoint for text
        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;
        
        // Draw info box
        const text = `${Units.toDisplay(length).toFixed(2)} ${CONFIG.units}  ∠${angle.toFixed(1)}°`;
        
        ctx.font = '12px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        
        const metrics = ctx.measureText(text);
        const padding = 6;
        const boxHeight = 20;
        
        // Background
        ctx.fillStyle = CONFIG.colors.background + 'ee';
        ctx.setLineDash([]);
        ctx.fillRect(
            midX - metrics.width / 2 - padding,
            midY - boxHeight - padding - 10,
            metrics.width + padding * 2,
            boxHeight + padding
        );
        
        // Border
        ctx.strokeStyle = CONFIG.colors.crosshair;
        ctx.lineWidth = 1;
        ctx.strokeRect(
            midX - metrics.width / 2 - padding,
            midY - boxHeight - padding - 10,
            metrics.width + padding * 2,
            boxHeight + padding
        );
        
        // Text
        ctx.fillStyle = CONFIG.colors.crosshair;
        ctx.fillText(text, midX, midY - 10);
    }
    
    drawPreviewRectDimensions(start, end, p1, p2) {
        const ctx = this.ctx;
        const width = Math.abs(end.x - start.x);
        const height = Math.abs(end.y - start.y);
        
        if (width < 0.1 && height < 0.1) return;
        
        // Calculate center for text
        const centerX = (p1.x + p2.x) / 2;
        const centerY = (p1.y + p2.y) / 2;
        
        const text = `${Units.toDisplay(width).toFixed(2)} × ${Units.toDisplay(height).toFixed(2)} ${CONFIG.units}`;
        
        ctx.font = '12px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        const metrics = ctx.measureText(text);
        const padding = 6;
        const boxHeight = 20;
        
        // Background
        ctx.fillStyle = CONFIG.colors.background + 'ee';
        ctx.setLineDash([]);
        ctx.fillRect(
            centerX - metrics.width / 2 - padding,
            centerY - boxHeight / 2 - padding / 2,
            metrics.width + padding * 2,
            boxHeight + padding
        );
        
        // Border
        ctx.strokeStyle = CONFIG.colors.crosshair;
        ctx.lineWidth = 1;
        ctx.strokeRect(
            centerX - metrics.width / 2 - padding,
            centerY - boxHeight / 2 - padding / 2,
            metrics.width + padding * 2,
            boxHeight + padding
        );
        
        // Text
        ctx.fillStyle = CONFIG.colors.crosshair;
        ctx.fillText(text, centerX, centerY);
    }
    
    drawGrips() {
        if (this.currentTool !== 'select') return;
        if (this.toolState.selectedEntities.length === 0) return;
        
        const ctx = this.ctx;
        const gripSize = 6;
        
        for (const entity of this.toolState.selectedEntities) {
            const grips = this.getEntityGrips(entity);
            
            for (const grip of grips) {
                const screenPos = this.view.worldToScreen(grip.x, grip.y);
                
                // Determine grip color based on type
                let fillColor = '#58a6ff';  // Default blue
                let strokeColor = '#ffffff';
                
                if (grip.type === 'center') {
                    fillColor = '#ff6b6b';  // Red for center
                } else if (grip.type === 'mid') {
                    fillColor = '#ffd93d';  // Yellow for midpoint
                } else if (grip.type === 'quadrant') {
                    fillColor = '#a55eea';  // Purple for quadrant
                }
                
                // Check if this grip is being hovered
                const mouseScreen = this.view.worldToScreen(this.mouse.world.x, this.mouse.world.y);
                const distToMouse = Math.hypot(screenPos.x - mouseScreen.x, screenPos.y - mouseScreen.y);
                const isHovered = distToMouse < gripSize + 4;
                
                // Draw grip square
                ctx.fillStyle = fillColor;
                ctx.strokeStyle = strokeColor;
                ctx.lineWidth = 1;
                
                const size = isHovered ? gripSize + 2 : gripSize;
                ctx.fillRect(screenPos.x - size/2, screenPos.y - size/2, size, size);
                ctx.strokeRect(screenPos.x - size/2, screenPos.y - size/2, size, size);
                
                // Draw crosshair inside center grip
                if (grip.type === 'center') {
                    ctx.strokeStyle = '#ffffff';
                    ctx.beginPath();
                    ctx.moveTo(screenPos.x - size/2 + 1, screenPos.y);
                    ctx.lineTo(screenPos.x + size/2 - 1, screenPos.y);
                    ctx.moveTo(screenPos.x, screenPos.y - size/2 + 1);
                    ctx.lineTo(screenPos.x, screenPos.y + size/2 - 1);
                    ctx.stroke();
                }
            }
        }
    }
    
    drawTrackingLines() {
        if (!this.trackingEnabled) return;
        if (!this.toolState.startPoint) return;
        if (this.toolState.trackingPoints.length === 0) return;
        
        const ctx = this.ctx;
        const canvasWidth = this.canvas.width;
        const canvasHeight = this.canvas.height;
        
        ctx.save();
        ctx.setLineDash([6, 4]);
        ctx.lineWidth = 1;
        
        // Draw tracking lines from each tracked point
        for (const tp of this.toolState.trackingPoints) {
            const screenPos = this.view.worldToScreen(tp.x, tp.y);
            
            // Draw subtle tracking lines (faded)
            ctx.strokeStyle = 'rgba(88, 166, 255, 0.3)';
            
            // Horizontal line
            ctx.beginPath();
            ctx.moveTo(0, screenPos.y);
            ctx.lineTo(canvasWidth, screenPos.y);
            ctx.stroke();
            
            // Vertical line
            ctx.beginPath();
            ctx.moveTo(screenPos.x, 0);
            ctx.lineTo(screenPos.x, canvasHeight);
            ctx.stroke();
            
            // Draw small marker at the tracking point
            ctx.fillStyle = 'rgba(88, 166, 255, 0.6)';
            ctx.beginPath();
            ctx.arc(screenPos.x, screenPos.y, 4, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Highlight the active tracking line more prominently
        if (this.toolState.activeTrackingLine) {
            const tracking = this.toolState.activeTrackingLine;
            const fromScreen = this.view.worldToScreen(tracking.fromPoint.x, tracking.fromPoint.y);
            const toScreen = this.view.worldToScreen(this.mouse.snapped.x, this.mouse.snapped.y);
            
            ctx.strokeStyle = '#58a6ff';
            ctx.lineWidth = 1.5;
            
            if (tracking.direction === 'horizontal') {
                ctx.beginPath();
                ctx.moveTo(fromScreen.x, fromScreen.y);
                ctx.lineTo(toScreen.x, fromScreen.y);
                ctx.stroke();
            } else if (tracking.direction === 'vertical') {
                ctx.beginPath();
                ctx.moveTo(fromScreen.x, fromScreen.y);
                ctx.lineTo(fromScreen.x, toScreen.y);
                ctx.stroke();
            } else if (tracking.direction === 'intersection' && tracking.fromPoint2) {
                const from2Screen = this.view.worldToScreen(tracking.fromPoint2.x, tracking.fromPoint2.y);
                
                // Draw both lines to intersection
                ctx.beginPath();
                ctx.moveTo(fromScreen.x, fromScreen.y);
                ctx.lineTo(toScreen.x, toScreen.y);
                ctx.stroke();
                
                ctx.beginPath();
                ctx.moveTo(from2Screen.x, from2Screen.y);
                ctx.lineTo(toScreen.x, toScreen.y);
                ctx.stroke();
            }
            
            // Draw X marker at the alignment point
            const alignScreen = toScreen;
            ctx.strokeStyle = '#58a6ff';
            ctx.lineWidth = 2;
            ctx.setLineDash([]);
            const xSize = 6;
            ctx.beginPath();
            ctx.moveTo(alignScreen.x - xSize, alignScreen.y - xSize);
            ctx.lineTo(alignScreen.x + xSize, alignScreen.y + xSize);
            ctx.moveTo(alignScreen.x + xSize, alignScreen.y - xSize);
            ctx.lineTo(alignScreen.x - xSize, alignScreen.y + xSize);
            ctx.stroke();
        }
        
        ctx.restore();
    }
    
    drawCrosshair() {
        const ctx = this.ctx;
        const pos = this.view.worldToScreen(this.mouse.snapped.x, this.mouse.snapped.y);
        const size = 10;
        
        ctx.strokeStyle = CONFIG.colors.crosshair;
        ctx.lineWidth = 1;
        
        ctx.beginPath();
        ctx.moveTo(pos.x - size, pos.y);
        ctx.lineTo(pos.x + size, pos.y);
        ctx.moveTo(pos.x, pos.y - size);
        ctx.lineTo(pos.x, pos.y + size);
        ctx.stroke();
        
        // Draw snap indicator based on type
        if (this.activeSnapPoint) {
            ctx.lineWidth = 2;
            const snapSize = 8;
            
            switch (this.activeSnapPoint.type) {
                case 'center':
                    // Draw circle for center snap
                    ctx.strokeStyle = '#ff6b6b';
                    ctx.beginPath();
                    ctx.arc(pos.x, pos.y, snapSize, 0, Math.PI * 2);
                    ctx.stroke();
                    // Cross in center
                    ctx.beginPath();
                    ctx.moveTo(pos.x - snapSize/2, pos.y);
                    ctx.lineTo(pos.x + snapSize/2, pos.y);
                    ctx.moveTo(pos.x, pos.y - snapSize/2);
                    ctx.lineTo(pos.x, pos.y + snapSize/2);
                    ctx.stroke();
                    break;
                    
                case 'midpoint':
                    // Draw triangle for midpoint snap
                    ctx.strokeStyle = '#ffd93d';
                    ctx.beginPath();
                    ctx.moveTo(pos.x, pos.y - snapSize);
                    ctx.lineTo(pos.x - snapSize, pos.y + snapSize);
                    ctx.lineTo(pos.x + snapSize, pos.y + snapSize);
                    ctx.closePath();
                    ctx.stroke();
                    break;
                    
                case 'endpoint':
                    // Draw square for endpoint snap
                    ctx.strokeStyle = '#4ecdc4';
                    ctx.beginPath();
                    ctx.rect(pos.x - snapSize, pos.y - snapSize, snapSize * 2, snapSize * 2);
                    ctx.stroke();
                    break;
                    
                case 'quadrant':
                    // Draw diamond for quadrant snap
                    ctx.strokeStyle = '#a55eea';
                    ctx.beginPath();
                    ctx.moveTo(pos.x, pos.y - snapSize);
                    ctx.lineTo(pos.x + snapSize, pos.y);
                    ctx.lineTo(pos.x, pos.y + snapSize);
                    ctx.lineTo(pos.x - snapSize, pos.y);
                    ctx.closePath();
                    ctx.stroke();
                    break;
            }
        } else if (this.snapType === 'ortho') {
            // Ortho snap indicator - show angle lines
            ctx.strokeStyle = '#ff9f43';
            ctx.lineWidth = 1;
            const lineLen = 15;
            
            if (this.toolState.startPoint) {
                const start = this.view.worldToScreen(this.toolState.startPoint.x, this.toolState.startPoint.y);
                const dx = pos.x - start.x;
                const dy = pos.y - start.y;
                const dist = Math.hypot(dx, dy);
                
                if (dist > 5) {
                    // Draw ortho constraint line indicator
                    const angle = Math.atan2(dy, dx);
                    ctx.setLineDash([3, 3]);
                    ctx.beginPath();
                    ctx.moveTo(pos.x - lineLen * Math.cos(angle), pos.y - lineLen * Math.sin(angle));
                    ctx.lineTo(pos.x + lineLen * Math.cos(angle), pos.y + lineLen * Math.sin(angle));
                    ctx.stroke();
                    ctx.setLineDash([]);
                }
            }
            
            // Draw ortho indicator (square rotated 45°)
            ctx.beginPath();
            const s = 5;
            ctx.moveTo(pos.x, pos.y - s);
            ctx.lineTo(pos.x + s, pos.y);
            ctx.lineTo(pos.x, pos.y + s);
            ctx.lineTo(pos.x - s, pos.y);
            ctx.closePath();
            ctx.stroke();
            
        } else if (this.snapEnabled && this.snapType === 'grid') {
            // Grid snap indicator
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, 4, 0, Math.PI * 2);
            ctx.stroke();
        }
    }
    
    drawTrimExtendPreview() {
        const ctx = this.ctx;
        
        // Draw trim preview
        if (this.currentTool === 'trim' && this.toolState.trimPreview) {
            const preview = this.toolState.trimPreview;
            
            // Handle circle/arc trim preview
            if (preview.valid && preview.isCircle) {
                const entity = preview.entity;
                const center = this.view.worldToScreen(entity.cx, entity.cy);
                const radiusScreen = entity.radius * this.view.scale;
                
                if (preview.deleteEntire) {
                    // Entire circle will be deleted - show all in red
                    ctx.strokeStyle = '#f85149';
                    ctx.lineWidth = 3;
                    ctx.setLineDash([6, 4]);
                    ctx.beginPath();
                    if (entity.type === 'arc') {
                        ctx.arc(center.x, center.y, radiusScreen, -entity.startAngle, -entity.endAngle, true);
                    } else {
                        ctx.arc(center.x, center.y, radiusScreen, 0, Math.PI * 2);
                    }
                    ctx.stroke();
                    ctx.setLineDash([]);
                    
                    // Draw X marker
                    ctx.lineWidth = 3;
                    const xSize = 10;
                    ctx.beginPath();
                    ctx.moveTo(center.x - xSize, center.y - xSize);
                    ctx.lineTo(center.x + xSize, center.y + xSize);
                    ctx.moveTo(center.x + xSize, center.y - xSize);
                    ctx.lineTo(center.x - xSize, center.y + xSize);
                    ctx.stroke();
                } else if (preview.trimCircle && preview.removeArc) {
                    // Draw the arc segments to keep (green)
                    if (preview.keepArcs) {
                        for (const arcDef of preview.keepArcs) {
                            ctx.strokeStyle = '#3fb950';
                            ctx.lineWidth = 3;
                            ctx.beginPath();
                            ctx.arc(center.x, center.y, radiusScreen, -arcDef.startAngle, -arcDef.endAngle, true);
                            ctx.stroke();
                        }
                    }
                    
                    // Draw the arc segment to remove (red dashed)
                    const removeArc = preview.removeArc;
                    ctx.strokeStyle = '#f85149';
                    ctx.lineWidth = 3;
                    ctx.setLineDash([6, 4]);
                    ctx.beginPath();
                    ctx.arc(center.x, center.y, radiusScreen, -removeArc.startAngle, -removeArc.endAngle, true);
                    ctx.stroke();
                    ctx.setLineDash([]);
                    
                    // Draw intersection point markers
                    const startPt = this.view.worldToScreen(
                        entity.cx + entity.radius * Math.cos(removeArc.startAngle),
                        entity.cy + entity.radius * Math.sin(removeArc.startAngle)
                    );
                    const endPt = this.view.worldToScreen(
                        entity.cx + entity.radius * Math.cos(removeArc.endAngle),
                        entity.cy + entity.radius * Math.sin(removeArc.endAngle)
                    );
                    
                    ctx.fillStyle = '#ffd93d';
                    ctx.beginPath();
                    ctx.arc(startPt.x, startPt.y, 5, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.beginPath();
                    ctx.arc(endPt.x, endPt.y, 5, 0, Math.PI * 2);
                    ctx.fill();
                }
                return;
            }
            
            if (preview.valid && preview.removeSegment) {
                const line = preview.entity;
                const p1 = this.view.worldToScreen(line.x1, line.y1);
                const p2 = this.view.worldToScreen(line.x2, line.y2);
                
                if (preview.deleteEntire) {
                    // Entire line will be deleted - show all in red
                    ctx.strokeStyle = '#f85149';
                    ctx.lineWidth = 3;
                    ctx.setLineDash([6, 4]);
                    ctx.beginPath();
                    ctx.moveTo(p1.x, p1.y);
                    ctx.lineTo(p2.x, p2.y);
                    ctx.stroke();
                    ctx.setLineDash([]);
                    
                    // Draw X marker
                    const midX = (p1.x + p2.x) / 2;
                    const midY = (p1.y + p2.y) / 2;
                    ctx.lineWidth = 3;
                    const xSize = 10;
                    ctx.beginPath();
                    ctx.moveTo(midX - xSize, midY - xSize);
                    ctx.lineTo(midX + xSize, midY + xSize);
                    ctx.moveTo(midX + xSize, midY - xSize);
                    ctx.lineTo(midX - xSize, midY + xSize);
                    ctx.stroke();
                    
                } else if (preview.splitLine && preview.keepSegments) {
                    // Middle segment removal - show keeps in green, remove in red
                    for (const keepSeg of preview.keepSegments) {
                        const ks1 = this.view.worldToScreen(keepSeg.x1, keepSeg.y1);
                        const ks2 = this.view.worldToScreen(keepSeg.x2, keepSeg.y2);
                        ctx.strokeStyle = '#3fb950';
                        ctx.lineWidth = 3;
                        ctx.beginPath();
                        ctx.moveTo(ks1.x, ks1.y);
                        ctx.lineTo(ks2.x, ks2.y);
                        ctx.stroke();
                    }
                    
                    // Draw segment to be removed
                    const seg = preview.removeSegment;
                    const s1 = this.view.worldToScreen(seg.x1, seg.y1);
                    const s2 = this.view.worldToScreen(seg.x2, seg.y2);
                    
                    ctx.strokeStyle = '#f85149';
                    ctx.lineWidth = 3;
                    ctx.setLineDash([6, 4]);
                    ctx.beginPath();
                    ctx.moveTo(s1.x, s1.y);
                    ctx.lineTo(s2.x, s2.y);
                    ctx.stroke();
                    ctx.setLineDash([]);
                    
                    // Draw intersection markers
                    ctx.fillStyle = '#ffd93d';
                    ctx.beginPath();
                    ctx.arc(s1.x, s1.y, 5, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.beginPath();
                    ctx.arc(s2.x, s2.y, 5, 0, Math.PI * 2);
                    ctx.fill();
                    
                } else {
                    // Simple trim from one end
                    // Draw the part that will remain (green)
                    const newStart = preview.newStart || { x: line.x1, y: line.y1 };
                    const newEnd = preview.newEnd || { x: line.x2, y: line.y2 };
                    const ns = this.view.worldToScreen(newStart.x, newStart.y);
                    const ne = this.view.worldToScreen(newEnd.x, newEnd.y);
                    
                    ctx.strokeStyle = '#3fb950';
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.moveTo(ns.x, ns.y);
                    ctx.lineTo(ne.x, ne.y);
                    ctx.stroke();
                    
                    // Draw the segment to be removed (red, dashed)
                    const seg = preview.removeSegment;
                    const s1 = this.view.worldToScreen(seg.x1, seg.y1);
                    const s2 = this.view.worldToScreen(seg.x2, seg.y2);
                    
                    ctx.strokeStyle = '#f85149';
                    ctx.lineWidth = 3;
                    ctx.setLineDash([6, 4]);
                    ctx.beginPath();
                    ctx.moveTo(s1.x, s1.y);
                    ctx.lineTo(s2.x, s2.y);
                    ctx.stroke();
                    ctx.setLineDash([]);
                    
                    // Draw intersection point marker
                    const intPt = preview.trimStart ? ns : ne;
                    ctx.fillStyle = '#ffd93d';
                    ctx.beginPath();
                    ctx.arc(intPt.x, intPt.y, 5, 0, Math.PI * 2);
                    ctx.fill();
                }
                
                // Draw "X" indicator on the part to remove
                const seg = preview.removeSegment;
                const s1 = this.view.worldToScreen(seg.x1, seg.y1);
                const s2 = this.view.worldToScreen(seg.x2, seg.y2);
                const midX = (s1.x + s2.x) / 2;
                const midY = (s1.y + s2.y) / 2;
                ctx.strokeStyle = '#f85149';
                ctx.lineWidth = 2;
                const xSize = 8;
                ctx.beginPath();
                ctx.moveTo(midX - xSize, midY - xSize);
                ctx.lineTo(midX + xSize, midY + xSize);
                ctx.moveTo(midX + xSize, midY - xSize);
                ctx.lineTo(midX - xSize, midY + xSize);
                ctx.stroke();
            }
        }
        
        // Draw extend preview
        if (this.currentTool === 'extend' && this.toolState.extendPreview) {
            const preview = this.toolState.extendPreview;
            const line = preview.entity;
            const p1 = this.view.worldToScreen(line.x1, line.y1);
            const p2 = this.view.worldToScreen(line.x2, line.y2);
            
            // Always highlight the line being hovered
            ctx.strokeStyle = preview.valid ? '#58a6ff' : '#6e7681';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
            
            // Show which end would be extended
            const endPt = preview.extendStart ? p1 : p2;
            ctx.strokeStyle = preview.valid ? '#3fb950' : '#6e7681';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(endPt.x, endPt.y, 8, 0, Math.PI * 2);
            ctx.stroke();
            
            if (preview.valid && preview.addSegment) {
                // Draw the extension segment (green)
                ctx.strokeStyle = '#3fb950';
                ctx.lineWidth = 3;
                ctx.setLineDash([6, 4]);
                
                const seg = preview.addSegment;
                const s1 = this.view.worldToScreen(seg.x1, seg.y1);
                const s2 = this.view.worldToScreen(seg.x2, seg.y2);
                
                ctx.beginPath();
                ctx.moveTo(s1.x, s1.y);
                ctx.lineTo(s2.x, s2.y);
                ctx.stroke();
                ctx.setLineDash([]);
                
                // Draw the new endpoint marker
                const newPt = this.view.worldToScreen(preview.newPoint.x, preview.newPoint.y);
                ctx.fillStyle = '#3fb950';
                ctx.beginPath();
                ctx.arc(newPt.x, newPt.y, 6, 0, Math.PI * 2);
                ctx.fill();
                
                // Draw arrow indicating extension direction
                const midX = (s1.x + s2.x) / 2;
                const midY = (s1.y + s2.y) / 2;
                const angle = Math.atan2(s2.y - s1.y, s2.x - s1.x);
                const arrowSize = 10;
                
                ctx.fillStyle = '#3fb950';
                ctx.beginPath();
                ctx.moveTo(midX + arrowSize * Math.cos(angle), midY + arrowSize * Math.sin(angle));
                ctx.lineTo(midX + arrowSize * Math.cos(angle + 2.5), midY + arrowSize * Math.sin(angle + 2.5));
                ctx.lineTo(midX + arrowSize * Math.cos(angle - 2.5), midY + arrowSize * Math.sin(angle - 2.5));
                ctx.closePath();
                ctx.fill();
            }
        }
    }
    
    drawSelectionBox() {
        if (!this.toolState.isSelectionBox || !this.toolState.selectionBoxStart || !this.toolState.selectionBoxEnd || !this.mouse.isDown) {
            return;
        }
        
        const ctx = this.ctx;
        const start = this.view.worldToScreen(this.toolState.selectionBoxStart.x, this.toolState.selectionBoxStart.y);
        const end = this.view.worldToScreen(this.toolState.selectionBoxEnd.x, this.toolState.selectionBoxEnd.y);
        
        // Determine selection mode
        const isWindowSelection = this.toolState.selectionBoxEnd.x > this.toolState.selectionBoxStart.x;
        
        const x = Math.min(start.x, end.x);
        const y = Math.min(start.y, end.y);
        const w = Math.abs(end.x - start.x);
        const h = Math.abs(end.y - start.y);
        
        // Draw selection box
        if (isWindowSelection) {
            // Window selection - solid blue
            ctx.strokeStyle = '#58a6ff';
            ctx.fillStyle = 'rgba(88, 166, 255, 0.1)';
            ctx.setLineDash([]);
        } else {
            // Crossing selection - dashed green
            ctx.strokeStyle = '#3fb950';
            ctx.fillStyle = 'rgba(63, 185, 80, 0.1)';
            ctx.setLineDash([6, 4]);
        }
        
        ctx.lineWidth = 1;
        ctx.fillRect(x, y, w, h);
        ctx.strokeRect(x, y, w, h);
        ctx.setLineDash([]);
    }
    
    drawOffsetPreview() {
        if (this.currentTool !== 'offset' || !this.toolState.offsetEntity) return;
        
        const ctx = this.ctx;
        const entity = this.toolState.offsetEntity;
        const distance = this.toolState.offsetDistance;
        
        // Highlight the source entity
        this.drawEntityHighlight(entity, '#58a6ff');
        
        if (entity.type === 'line') {
            // Calculate perpendicular direction
            const dx = entity.x2 - entity.x1;
            const dy = entity.y2 - entity.y1;
            const len = Math.hypot(dx, dy);
            const perpX = -dy / len;
            const perpY = dx / len;
            
            // Determine which side the mouse is on
            const midX = (entity.x1 + entity.x2) / 2;
            const midY = (entity.y1 + entity.y2) / 2;
            const clickVecX = this.mouse.world.x - midX;
            const clickVecY = this.mouse.world.y - midY;
            const dot = clickVecX * perpX + clickVecY * perpY;
            const sign = dot >= 0 ? 1 : -1;
            
            // Draw preview offset line
            const offset1 = this.view.worldToScreen(
                entity.x1 + perpX * distance * sign,
                entity.y1 + perpY * distance * sign
            );
            const offset2 = this.view.worldToScreen(
                entity.x2 + perpX * distance * sign,
                entity.y2 + perpY * distance * sign
            );
            
            ctx.strokeStyle = '#3fb950';
            ctx.lineWidth = 2;
            ctx.setLineDash([6, 4]);
            ctx.beginPath();
            ctx.moveTo(offset1.x, offset1.y);
            ctx.lineTo(offset2.x, offset2.y);
            ctx.stroke();
            ctx.setLineDash([]);
            
            // Draw offset distance indicator
            const mid = this.view.worldToScreen(midX, midY);
            const offsetMid = this.view.worldToScreen(
                midX + perpX * distance * sign,
                midY + perpY * distance * sign
            );
            ctx.strokeStyle = '#ffd93d';
            ctx.lineWidth = 1;
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.moveTo(mid.x, mid.y);
            ctx.lineTo(offsetMid.x, offsetMid.y);
            ctx.stroke();
            ctx.setLineDash([]);
        } else if (entity.type === 'circle') {
            const distToCenter = Math.hypot(this.mouse.world.x - entity.cx, this.mouse.world.y - entity.cy);
            const sign = distToCenter > entity.radius ? 1 : -1;
            const newRadius = entity.radius + distance * sign;
            
            if (newRadius > 0) {
                const center = this.view.worldToScreen(entity.cx, entity.cy);
                const radiusScreen = newRadius * this.view.scale;
                
                ctx.strokeStyle = '#3fb950';
                ctx.lineWidth = 2;
                ctx.setLineDash([6, 4]);
                ctx.beginPath();
                ctx.arc(center.x, center.y, radiusScreen, 0, Math.PI * 2);
                ctx.stroke();
                ctx.setLineDash([]);
            }
        }
    }
    
    drawScalePreview() {
        if (this.currentTool !== 'scale') return;
        
        const ctx = this.ctx;
        
        // Highlight selected entities
        this.toolState.scaleEntities.forEach(entity => {
            this.drawEntityHighlight(entity, '#58a6ff');
        });
        
        // Draw base point if set
        if (this.toolState.scaleBasePoint) {
            const base = this.view.worldToScreen(this.toolState.scaleBasePoint.x, this.toolState.scaleBasePoint.y);
            
            // Draw base point marker
            ctx.strokeStyle = '#ffd93d';
            ctx.fillStyle = '#ffd93d';
            ctx.lineWidth = 2;
            
            // Crosshair
            const s = 10;
            ctx.beginPath();
            ctx.moveTo(base.x - s, base.y);
            ctx.lineTo(base.x + s, base.y);
            ctx.moveTo(base.x, base.y - s);
            ctx.lineTo(base.x, base.y + s);
            ctx.stroke();
            
            // Small square at center
            ctx.fillRect(base.x - 3, base.y - 3, 6, 6);
            
            // Draw reference line to mouse if we have entities
            if (this.toolState.scaleEntities.length > 0) {
                const mouseScreen = this.view.worldToScreen(this.mouse.world.x, this.mouse.world.y);
                ctx.strokeStyle = '#ffd93d';
                ctx.lineWidth = 1;
                ctx.setLineDash([4, 4]);
                ctx.beginPath();
                ctx.moveTo(base.x, base.y);
                ctx.lineTo(mouseScreen.x, mouseScreen.y);
                ctx.stroke();
                ctx.setLineDash([]);
            }
        }
    }
    
    drawRotatePreview() {
        if (this.currentTool !== 'rotate') return;
        
        const ctx = this.ctx;
        
        // Highlight selected entities
        this.toolState.rotateEntities.forEach(entity => {
            this.drawEntityHighlight(entity, '#58a6ff');
        });
        
        // Draw center point if set
        if (this.toolState.rotateCenter) {
            const center = this.view.worldToScreen(this.toolState.rotateCenter.x, this.toolState.rotateCenter.y);
            
            // Draw center point marker (rotation symbol)
            ctx.strokeStyle = '#ff6b6b';
            ctx.fillStyle = '#ff6b6b';
            ctx.lineWidth = 2;
            
            // Draw circle at center
            const radius = 8;
            ctx.beginPath();
            ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
            ctx.stroke();
            
            // Draw crosshair
            ctx.beginPath();
            ctx.moveTo(center.x - 4, center.y);
            ctx.lineTo(center.x + 4, center.y);
            ctx.moveTo(center.x, center.y - 4);
            ctx.lineTo(center.x, center.y + 4);
            ctx.stroke();
            
            // Draw reference line to mouse and show angle
            if (this.toolState.rotateEntities.length > 0) {
                const mouseScreen = this.view.worldToScreen(this.mouse.world.x, this.mouse.world.y);
                const dist = Math.hypot(mouseScreen.x - center.x, mouseScreen.y - center.y);
                
                // Draw angle arc and reference line
                if (this.toolState.rotateStartAngle !== null) {
                    const currentAngle = Math.atan2(
                        this.mouse.world.y - this.toolState.rotateCenter.y,
                        this.mouse.world.x - this.toolState.rotateCenter.x
                    );
                    
                    // Draw start reference line (dashed, lighter)
                    const refDist = Math.max(40, dist * 0.6);
                    const refX = center.x + refDist * Math.cos(-this.toolState.rotateStartAngle);
                    const refY = center.y + refDist * Math.sin(-this.toolState.rotateStartAngle);
                    ctx.strokeStyle = 'rgba(255, 107, 107, 0.4)';
                    ctx.lineWidth = 1;
                    ctx.setLineDash([2, 2]);
                    ctx.beginPath();
                    ctx.moveTo(center.x, center.y);
                    ctx.lineTo(refX, refY);
                    ctx.stroke();
                    ctx.setLineDash([]);
                    
                    // Draw angle arc
                    if (dist > 20) {
                        const startAngle = -this.toolState.rotateStartAngle;
                        const endAngle = -currentAngle;
                        const arcRadius = Math.min(50, dist * 0.5);
                        
                        ctx.strokeStyle = 'rgba(255, 107, 107, 0.5)';
                        ctx.lineWidth = 3;
                        ctx.beginPath();
                        ctx.arc(center.x, center.y, arcRadius, startAngle, endAngle, startAngle > endAngle);
                        ctx.stroke();
                    }
                }
                
                // Draw line to mouse
                ctx.strokeStyle = '#ff6b6b';
                ctx.lineWidth = 1;
                ctx.setLineDash([4, 4]);
                ctx.beginPath();
                ctx.moveTo(center.x, center.y);
                ctx.lineTo(mouseScreen.x, mouseScreen.y);
                ctx.stroke();
                ctx.setLineDash([]);
                
                // Show angle text
                if (this.toolState.rotateStartAngle !== null) {
                    const currentAngle = Math.atan2(
                        this.mouse.world.y - this.toolState.rotateCenter.y,
                        this.mouse.world.x - this.toolState.rotateCenter.x
                    );
                    let angleDeg = (currentAngle - this.toolState.rotateStartAngle) * 180 / Math.PI;
                    // Normalize to -180 to 180
                    while (angleDeg > 180) angleDeg -= 360;
                    while (angleDeg < -180) angleDeg += 360;
                    
                    ctx.font = '12px "JetBrains Mono", monospace';
                    ctx.fillStyle = '#ff6b6b';
                    ctx.fillText(`${angleDeg.toFixed(1)}°`, center.x + 15, center.y - 15);
                }
                
                // Draw rotated preview of entities
                if (this.toolState.rotateStartAngle !== null) {
                    const previewAngle = this.getRotatePreviewAngle();
                    
                    ctx.globalAlpha = 0.5;
                    ctx.setLineDash([5, 5]);
                    
                    for (const entity of this.toolState.rotateEntities) {
                        // Clone and rotate for preview
                        const preview = this.cloneEntity(entity);
                        if (preview) {
                            this.rotateEntityAroundPoint(preview, this.toolState.rotateCenter, previewAngle);
                            this.drawEntityPreview(preview, '#ff6b6b');
                        }
                    }
                    
                    ctx.globalAlpha = 1.0;
                    ctx.setLineDash([]);
                }
            }
        }
    }
    
    drawPatternPreview() {
        if (this.currentTool !== 'rectPattern' && this.currentTool !== 'circPattern') return;
        
        const ctx = this.ctx;
        
        // Highlight selected entities
        this.toolState.patternEntities.forEach(entity => {
            this.drawEntityHighlight(entity, '#58a6ff');
        });
        
        // Draw live preview of pattern
        if (this.toolState.patternPreview && this.toolState.patternPreview.entities) {
            ctx.globalAlpha = 0.5;
            ctx.setLineDash([5, 5]);
            
            for (const entity of this.toolState.patternPreview.entities) {
                this.drawEntityPreview(entity, '#a55eea');
            }
            
            ctx.globalAlpha = 1.0;
            ctx.setLineDash([]);
            
            // For circular pattern, draw the pattern circle
            if (this.toolState.patternPreview.type === 'circ' && this.toolState.patternBasePoint) {
                const center = this.toolState.patternBasePoint;
                // Calculate radius from first entity
                if (this.toolState.patternEntities.length > 0) {
                    const entityCenter = this.getEntityCenter(this.toolState.patternEntities[0]);
                    const radius = Math.hypot(entityCenter.x - center.x, entityCenter.y - center.y);
                    
                    const screenCenter = this.view.worldToScreen(center.x, center.y);
                    const screenRadius = radius * this.view.scale;
                    
                    ctx.strokeStyle = 'rgba(165, 94, 234, 0.3)';
                    ctx.lineWidth = 1;
                    ctx.setLineDash([4, 4]);
                    ctx.beginPath();
                    ctx.arc(screenCenter.x, screenCenter.y, screenRadius, 0, Math.PI * 2);
                    ctx.stroke();
                    ctx.setLineDash([]);
                }
            }
        }
        
        // Draw base/center point if set
        if (this.toolState.patternBasePoint) {
            const base = this.view.worldToScreen(this.toolState.patternBasePoint.x, this.toolState.patternBasePoint.y);
            
            ctx.strokeStyle = '#a55eea';
            ctx.fillStyle = '#a55eea';
            ctx.lineWidth = 2;
            
            if (this.currentTool === 'circPattern') {
                // Circle for center point
                ctx.beginPath();
                ctx.arc(base.x, base.y, 8, 0, Math.PI * 2);
                ctx.stroke();
                ctx.beginPath();
                ctx.arc(base.x, base.y, 3, 0, Math.PI * 2);
                ctx.fill();
            } else {
                // Crosshair for base point
                const s = 10;
                ctx.beginPath();
                ctx.moveTo(base.x - s, base.y);
                ctx.lineTo(base.x + s, base.y);
                ctx.moveTo(base.x, base.y - s);
                ctx.lineTo(base.x, base.y + s);
                ctx.stroke();
                ctx.fillRect(base.x - 3, base.y - 3, 6, 6);
            }
        }
    }
    
    drawEntityPreview(entity, color) {
        const ctx = this.ctx;
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        
        if (entity.type === 'line') {
            const p1 = this.view.worldToScreen(entity.x1, entity.y1);
            const p2 = this.view.worldToScreen(entity.x2, entity.y2);
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
        } else if (entity.type === 'circle') {
            const center = this.view.worldToScreen(entity.cx, entity.cy);
            const radius = entity.radius * this.view.scale;
            ctx.beginPath();
            ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
            ctx.stroke();
        } else if (entity.type === 'arc') {
            const center = this.view.worldToScreen(entity.cx, entity.cy);
            const radius = entity.radius * this.view.scale;
            ctx.beginPath();
            ctx.arc(center.x, center.y, radius, -entity.startAngle, -entity.endAngle, true);
            ctx.stroke();
        } else if (entity.type === 'rect') {
            const p1 = this.view.worldToScreen(entity.x1, entity.y1);
            const p2 = this.view.worldToScreen(entity.x2, entity.y2);
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.lineTo(p1.x, p2.y);
            ctx.closePath();
            ctx.stroke();
        } else if (entity.type === 'text') {
            const pos = this.view.worldToScreen(entity.x, entity.y);
            const heightScreen = entity.height * this.view.scale;
            
            if (heightScreen >= 3) {
                ctx.save();
                ctx.translate(pos.x, pos.y);
                ctx.rotate(-entity.rotation);
                
                const fontSize = Math.max(8, heightScreen);
                ctx.font = `${fontSize}px "JetBrains Mono", monospace`;
                ctx.textBaseline = 'bottom';
                ctx.textAlign = 'left';
                ctx.fillStyle = color;
                ctx.fillText(entity.text, 0, 0);
                
                ctx.restore();
            }
        }
    }
    
    drawEntityHighlight(entity, color) {
        const ctx = this.ctx;
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        
        if (entity.type === 'line') {
            const p1 = this.view.worldToScreen(entity.x1, entity.y1);
            const p2 = this.view.worldToScreen(entity.x2, entity.y2);
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
        } else if (entity.type === 'rect') {
            const p1 = this.view.worldToScreen(entity.x1, entity.y1);
            const p2 = this.view.worldToScreen(entity.x2, entity.y2);
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.lineTo(p1.x, p2.y);
            ctx.lineTo(p1.x, p1.y);
            ctx.stroke();
        } else if (entity.type === 'circle') {
            const center = this.view.worldToScreen(entity.cx, entity.cy);
            const radiusScreen = entity.radius * this.view.scale;
            ctx.beginPath();
            ctx.arc(center.x, center.y, radiusScreen, 0, Math.PI * 2);
            ctx.stroke();
        } else if (entity.type === 'arc') {
            const center = this.view.worldToScreen(entity.cx, entity.cy);
            const radiusScreen = entity.radius * this.view.scale;
            ctx.beginPath();
            ctx.arc(center.x, center.y, radiusScreen, -entity.startAngle, -entity.endAngle, true);
            ctx.stroke();
        } else if (entity.type === 'text') {
            // Draw a box around the text for highlighting
            const bounds = entity.getBounds();
            const p1 = this.view.worldToScreen(bounds.minX, bounds.minY);
            const p2 = this.view.worldToScreen(bounds.maxX, bounds.maxY);
            ctx.beginPath();
            ctx.rect(p1.x, p2.y, p2.x - p1.x, p1.y - p2.y);
            ctx.stroke();
        }
    }
    
    // ----------------------------------------
    // PROPERTIES PANEL
    // ----------------------------------------
    
    showProperties(entity) {
        const panel = document.getElementById('propertiesPanel');
        const content = document.getElementById('panelContent');
        
        let html = '';
        
        if (entity.type === 'line') {
            html = `
                <div class="prop-group">
                    <div class="prop-group-title">Line</div>
                    <div class="prop-row">
                        <span class="prop-label">X1:</span>
                        <span class="prop-value">${Units.toDisplay(entity.x1).toFixed(2)} ${CONFIG.units}</span>
                    </div>
                    <div class="prop-row">
                        <span class="prop-label">Y1:</span>
                        <span class="prop-value">${Units.toDisplay(entity.y1).toFixed(2)} ${CONFIG.units}</span>
                    </div>
                    <div class="prop-row">
                        <span class="prop-label">X2:</span>
                        <span class="prop-value">${Units.toDisplay(entity.x2).toFixed(2)} ${CONFIG.units}</span>
                    </div>
                    <div class="prop-row">
                        <span class="prop-label">Y2:</span>
                        <span class="prop-value">${Units.toDisplay(entity.y2).toFixed(2)} ${CONFIG.units}</span>
                    </div>
                    <div class="prop-row">
                        <span class="prop-label">Length:</span>
                        <span class="prop-value">${Units.format(entity.getLength())}</span>
                    </div>
                </div>
            `;
        } else if (entity.type === 'rect') {
            html = `
                <div class="prop-group">
                    <div class="prop-group-title">Rectangle</div>
                    <div class="prop-row">
                        <span class="prop-label">X:</span>
                        <span class="prop-value">${Units.toDisplay(entity.x1).toFixed(2)} ${CONFIG.units}</span>
                    </div>
                    <div class="prop-row">
                        <span class="prop-label">Y:</span>
                        <span class="prop-value">${Units.toDisplay(entity.y1).toFixed(2)} ${CONFIG.units}</span>
                    </div>
                    <div class="prop-row">
                        <span class="prop-label">Width:</span>
                        <span class="prop-value">${Units.format(entity.getWidth())}</span>
                    </div>
                    <div class="prop-row">
                        <span class="prop-label">Height:</span>
                        <span class="prop-value">${Units.format(entity.getHeight())}</span>
                    </div>
                </div>
            `;
        } else if (entity.type === 'circle') {
            html = `
                <div class="prop-group">
                    <div class="prop-group-title">Circle</div>
                    <div class="prop-row">
                        <span class="prop-label">Center X:</span>
                        <span class="prop-value">${Units.toDisplay(entity.cx).toFixed(2)} ${CONFIG.units}</span>
                    </div>
                    <div class="prop-row">
                        <span class="prop-label">Center Y:</span>
                        <span class="prop-value">${Units.toDisplay(entity.cy).toFixed(2)} ${CONFIG.units}</span>
                    </div>
                    <div class="prop-row">
                        <span class="prop-label">Radius:</span>
                        <span class="prop-value">${Units.format(entity.radius)}</span>
                    </div>
                    <div class="prop-row">
                        <span class="prop-label">Diameter:</span>
                        <span class="prop-value">${Units.format(entity.getDiameter())}</span>
                    </div>
                    <div class="prop-row">
                        <span class="prop-label">Circum.:</span>
                        <span class="prop-value">${Units.format(entity.getCircumference())}</span>
                    </div>
                </div>
            `;
        } else if (entity.type === 'arc') {
            const startDeg = (entity.startAngle * 180 / Math.PI).toFixed(1);
            const endDeg = (entity.endAngle * 180 / Math.PI).toFixed(1);
            html = `
                <div class="prop-group">
                    <div class="prop-group-title">Arc</div>
                    <div class="prop-row">
                        <span class="prop-label">Center X:</span>
                        <span class="prop-value">${Units.toDisplay(entity.cx).toFixed(2)} ${CONFIG.units}</span>
                    </div>
                    <div class="prop-row">
                        <span class="prop-label">Center Y:</span>
                        <span class="prop-value">${Units.toDisplay(entity.cy).toFixed(2)} ${CONFIG.units}</span>
                    </div>
                    <div class="prop-row">
                        <span class="prop-label">Radius:</span>
                        <span class="prop-value">${Units.format(entity.radius)}</span>
                    </div>
                    <div class="prop-row">
                        <span class="prop-label">Start:</span>
                        <span class="prop-value">${startDeg}°</span>
                    </div>
                    <div class="prop-row">
                        <span class="prop-label">End:</span>
                        <span class="prop-value">${endDeg}°</span>
                    </div>
                    <div class="prop-row">
                        <span class="prop-label">Length:</span>
                        <span class="prop-value">${Units.format(entity.getArcLength())}</span>
                    </div>
                </div>
            `;
        } else if (entity.type === 'dim') {
            html = `
                <div class="prop-group">
                    <div class="prop-group-title">Dimension</div>
                    <div class="prop-row">
                        <span class="prop-label">Value:</span>
                        <span class="prop-value">${entity.getText()}</span>
                    </div>
                </div>
            `;
        } else if (entity.type === 'text') {
            html = `
                <div class="prop-group">
                    <div class="prop-group-title">Text</div>
                    <div class="prop-row">
                        <span class="prop-label">Content:</span>
                        <span class="prop-value">${entity.text}</span>
                    </div>
                    <div class="prop-row">
                        <span class="prop-label">Position:</span>
                        <span class="prop-value">${Units.format(entity.x)}, ${Units.format(entity.y)}</span>
                    </div>
                    <div class="prop-row">
                        <span class="prop-label">Height:</span>
                        <span class="prop-value">${Units.format(entity.height)}</span>
                    </div>
                    <div class="prop-row">
                        <span class="prop-label">Rotation:</span>
                        <span class="prop-value">${(entity.rotation * 180 / Math.PI).toFixed(1)}°</span>
                    </div>
                </div>
            `;
        }
        
        content.innerHTML = html;
        panel.classList.add('open');
    }
    
    // ----------------------------------------
    // FILE I/O
    // ----------------------------------------
    
    newDrawing() {
        if (this.entities.length > 0) {
            if (!confirm('Clear current drawing? Unsaved changes will be lost.')) {
                return;
            }
        }
        this.entities = [];
        this.invalidateSnapCache();
        this.clearSelection();
        this.centerView();
        
        // Reset history
        this.history = [];
        this.historyIndex = -1;
        this.saveToHistory();
        
        this.render();
    }
    
    loadFile() {
        document.getElementById('fileInput').click();
    }
    
    handleFileLoad(file) {
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target.result;
            
            if (file.name.endsWith('.json') || file.name.endsWith('.cad')) {
                this.loadJSON(content);
            } else if (file.name.endsWith('.dxf')) {
                this.loadDXF(content);
            }
        };
        reader.readAsText(file);
    }
    
    loadJSON(content) {
        try {
            const data = JSON.parse(content);
            this.entities = [];
            
            for (const item of data.entities || []) {
                let entity;
                switch (item.type) {
                    case 'line':
                        entity = new Line(item.x1, item.y1, item.x2, item.y2);
                        break;
                    case 'rect':
                        entity = new Rectangle(item.x1, item.y1, item.x2, item.y2);
                        break;
                    case 'circle':
                        entity = new Circle(item.cx, item.cy, item.radius);
                        break;
                    case 'arc':
                        entity = new Arc(item.cx, item.cy, item.radius, item.startAngle, item.endAngle);
                        break;
                    case 'dim':
                        entity = new Dimension(item.x1, item.y1, item.x2, item.y2);
                        if (item.offset) entity.offset = item.offset;
                        break;
                    case 'text':
                        entity = new Text(item.x, item.y, item.text, item.height, item.rotation);
                        break;
                }
                if (entity) this.entities.push(entity);
            }
            
            this.invalidateSnapCache();
            
            // Reset history after loading
            this.history = [];
            this.historyIndex = -1;
            this.saveToHistory();
            
            this.zoomExtents();
        } catch (err) {
            alert('Error loading file: ' + err.message);
        }
    }
    
    loadDXF(content) {
        try {
            const lines = content.split('\n').map(l => l.trim());
            this.entities = [];
            
            let i = 0;
            while (i < lines.length) {
                if (lines[i] === 'LINE') {
                    // Parse LINE entity
                    let x1 = 0, y1 = 0, x2 = 0, y2 = 0;
                    i++;
                    while (i < lines.length && lines[i] !== '0') {
                        const code = parseInt(lines[i]);
                        const value = parseFloat(lines[i + 1]);
                        switch (code) {
                            case 10: x1 = value; break;
                            case 20: y1 = value; break;
                            case 11: x2 = value; break;
                            case 21: y2 = value; break;
                        }
                        i += 2;
                    }
                    this.entities.push(new Line(x1, y1, x2, y2));
                } else if (lines[i] === 'CIRCLE') {
                    // Parse CIRCLE entity
                    let cx = 0, cy = 0, radius = 0;
                    i++;
                    while (i < lines.length && lines[i] !== '0') {
                        const code = parseInt(lines[i]);
                        const value = parseFloat(lines[i + 1]);
                        switch (code) {
                            case 10: cx = value; break;
                            case 20: cy = value; break;
                            case 40: radius = value; break;
                        }
                        i += 2;
                    }
                    this.entities.push(new Circle(cx, cy, radius));
                } else if (lines[i] === 'ARC') {
                    // Parse ARC entity
                    let cx = 0, cy = 0, radius = 0, startAngle = 0, endAngle = 0;
                    i++;
                    while (i < lines.length && lines[i] !== '0') {
                        const code = parseInt(lines[i]);
                        const value = parseFloat(lines[i + 1]);
                        switch (code) {
                            case 10: cx = value; break;
                            case 20: cy = value; break;
                            case 40: radius = value; break;
                            case 50: startAngle = value * Math.PI / 180; break; // Convert degrees to radians
                            case 51: endAngle = value * Math.PI / 180; break;
                        }
                        i += 2;
                    }
                    this.entities.push(new Arc(cx, cy, radius, startAngle, endAngle));
                } else if (lines[i] === 'TEXT' || lines[i] === 'MTEXT') {
                    // Parse TEXT entity
                    let x = 0, y = 0, height = 5, rotation = 0, textContent = '';
                    i++;
                    while (i < lines.length && lines[i] !== '0') {
                        const code = parseInt(lines[i]);
                        if (code === 1) {
                            textContent = lines[i + 1] || '';
                        } else {
                            const value = parseFloat(lines[i + 1]);
                            switch (code) {
                                case 10: x = value; break;
                                case 20: y = value; break;
                                case 40: height = value; break;
                                case 50: rotation = value * Math.PI / 180; break; // Convert degrees to radians
                            }
                        }
                        i += 2;
                    }
                    if (textContent) {
                        this.entities.push(new Text(x, y, textContent, height, rotation));
                    }
                } else {
                    i++;
                }
            }
            
            this.invalidateSnapCache();
            
            // Reset history after loading
            this.history = [];
            this.historyIndex = -1;
            this.saveToHistory();
            
            this.zoomExtents();
        } catch (err) {
            alert('Error parsing DXF: ' + err.message);
        }
    }
    
    // ----------------------------------------
    // SAVE DIALOG
    // ----------------------------------------
    
    showSaveDialog() {
        const dialog = document.getElementById('saveDialog');
        dialog.classList.add('visible');
        document.getElementById('saveFileName').select();
    }
    
    hideSaveDialog() {
        const dialog = document.getElementById('saveDialog');
        dialog.classList.remove('visible');
        this.canvas.focus();
    }
    
    performSave() {
        const fileName = document.getElementById('saveFileName').value.trim() || 'drawing';
        const format = document.getElementById('saveFileFormat').value;
        
        if (format === 'dxf') {
            this.saveDXF(fileName);
        } else {
            this.saveJSON(fileName);
        }
        
        this.hideSaveDialog();
    }
    
    saveDXF(fileName = 'drawing') {
        let dxf = '';
        
        // Generate unique handle counter
        let handleCounter = 1;
        const getHandle = () => (handleCounter++).toString(16).toUpperCase();
        
        // HEADER SECTION - AutoCAD 2000 format (AC1015) for better compatibility
        dxf += '0\nSECTION\n';
        dxf += '2\nHEADER\n';
        dxf += '9\n$ACADVER\n1\nAC1015\n';  // AutoCAD 2000 format
        dxf += '9\n$INSBASE\n10\n0.0\n20\n0.0\n30\n0.0\n';
        dxf += '9\n$EXTMIN\n10\n0.0\n20\n0.0\n30\n0.0\n';
        dxf += '9\n$EXTMAX\n10\n1000.0\n20\n1000.0\n30\n0.0\n';
        dxf += '9\n$LIMMIN\n10\n0.0\n20\n0.0\n';
        dxf += '9\n$LIMMAX\n10\n1000.0\n20\n1000.0\n';
        dxf += '9\n$ORTHOMODE\n70\n0\n';
        dxf += '9\n$LTSCALE\n40\n1.0\n';
        dxf += '9\n$TEXTSTYLE\n7\nSTANDARD\n';
        dxf += '9\n$CLAYER\n8\n0\n';
        dxf += '9\n$DIMSCALE\n40\n1.0\n';
        dxf += '9\n$LUNITS\n70\n2\n';  // Decimal units
        dxf += '9\n$LUPREC\n70\n4\n';  // 4 decimal places
        dxf += '9\n$MEASUREMENT\n70\n1\n';  // Metric
        dxf += '0\nENDSEC\n';
        
        // TABLES SECTION
        dxf += '0\nSECTION\n';
        dxf += '2\nTABLES\n';
        
        // VPORT table
        dxf += '0\nTABLE\n2\nVPORT\n5\n8\n100\nAcDbSymbolTable\n70\n1\n';
        dxf += '0\nVPORT\n5\n' + getHandle() + '\n100\nAcDbSymbolTableRecord\n100\nAcDbViewportTableRecord\n';
        dxf += '2\n*ACTIVE\n70\n0\n';
        dxf += '10\n0.0\n20\n0.0\n11\n1.0\n21\n1.0\n';
        dxf += '12\n500.0\n22\n500.0\n13\n0.0\n23\n0.0\n14\n10.0\n24\n10.0\n15\n10.0\n25\n10.0\n';
        dxf += '16\n0.0\n26\n0.0\n36\n1.0\n17\n0.0\n27\n0.0\n37\n0.0\n';
        dxf += '40\n1000.0\n41\n2.0\n42\n50.0\n43\n0.0\n44\n0.0\n50\n0.0\n51\n0.0\n';
        dxf += '71\n0\n72\n100\n73\n1\n74\n3\n75\n0\n76\n0\n77\n0\n78\n0\n';
        dxf += '0\nENDTAB\n';
        
        // LTYPE table (line types)
        dxf += '0\nTABLE\n2\nLTYPE\n5\n5\n100\nAcDbSymbolTable\n70\n3\n';
        // ByBlock
        dxf += '0\nLTYPE\n5\n' + getHandle() + '\n100\nAcDbSymbolTableRecord\n100\nAcDbLinetypeTableRecord\n';
        dxf += '2\nBYBLOCK\n70\n0\n3\n\n72\n65\n73\n0\n40\n0.0\n';
        // ByLayer
        dxf += '0\nLTYPE\n5\n' + getHandle() + '\n100\nAcDbSymbolTableRecord\n100\nAcDbLinetypeTableRecord\n';
        dxf += '2\nBYLAYER\n70\n0\n3\n\n72\n65\n73\n0\n40\n0.0\n';
        // Continuous
        dxf += '0\nLTYPE\n5\n' + getHandle() + '\n100\nAcDbSymbolTableRecord\n100\nAcDbLinetypeTableRecord\n';
        dxf += '2\nCONTINUOUS\n70\n0\n3\nSolid line\n72\n65\n73\n0\n40\n0.0\n';
        dxf += '0\nENDTAB\n';
        
        // LAYER table
        dxf += '0\nTABLE\n2\nLAYER\n5\n2\n100\nAcDbSymbolTable\n70\n2\n';
        // Layer 0
        dxf += '0\nLAYER\n5\n' + getHandle() + '\n100\nAcDbSymbolTableRecord\n100\nAcDbLayerTableRecord\n';
        dxf += '2\n0\n70\n0\n62\n7\n6\nCONTINUOUS\n370\n-3\n390\nF\n';
        // DIMENSIONS layer
        dxf += '0\nLAYER\n5\n' + getHandle() + '\n100\nAcDbSymbolTableRecord\n100\nAcDbLayerTableRecord\n';
        dxf += '2\nDIMENSIONS\n70\n0\n62\n2\n6\nCONTINUOUS\n370\n-3\n390\nF\n';
        dxf += '0\nENDTAB\n';
        
        // STYLE table (text styles)
        dxf += '0\nTABLE\n2\nSTYLE\n5\n3\n100\nAcDbSymbolTable\n70\n1\n';
        dxf += '0\nSTYLE\n5\n' + getHandle() + '\n100\nAcDbSymbolTableRecord\n100\nAcDbTextStyleTableRecord\n';
        dxf += '2\nSTANDARD\n70\n0\n40\n0.0\n41\n1.0\n50\n0.0\n71\n0\n42\n2.5\n3\ntxt\n4\n\n';
        dxf += '0\nENDTAB\n';
        
        // VIEW table
        dxf += '0\nTABLE\n2\nVIEW\n5\n6\n100\nAcDbSymbolTable\n70\n0\n0\nENDTAB\n';
        
        // UCS table
        dxf += '0\nTABLE\n2\nUCS\n5\n7\n100\nAcDbSymbolTable\n70\n0\n0\nENDTAB\n';
        
        // APPID table
        dxf += '0\nTABLE\n2\nAPPID\n5\n9\n100\nAcDbSymbolTable\n70\n1\n';
        dxf += '0\nAPPID\n5\n' + getHandle() + '\n100\nAcDbSymbolTableRecord\n100\nAcDbRegAppTableRecord\n';
        dxf += '2\nACAD\n70\n0\n';
        dxf += '0\nENDTAB\n';
        
        // DIMSTYLE table
        dxf += '0\nTABLE\n2\nDIMSTYLE\n5\nA\n100\nAcDbSymbolTable\n70\n1\n100\nAcDbDimStyleTable\n71\n1\n';
        dxf += '0\nDIMSTYLE\n105\n' + getHandle() + '\n100\nAcDbSymbolTableRecord\n100\nAcDbDimStyleTableRecord\n';
        dxf += '2\nSTANDARD\n70\n0\n';
        dxf += '0\nENDTAB\n';
        
        // BLOCK_RECORD table
        dxf += '0\nTABLE\n2\nBLOCK_RECORD\n5\n1\n100\nAcDbSymbolTable\n70\n2\n';
        dxf += '0\nBLOCK_RECORD\n5\n' + getHandle() + '\n100\nAcDbSymbolTableRecord\n100\nAcDbBlockTableRecord\n2\n*MODEL_SPACE\n70\n0\n280\n1\n281\n0\n';
        dxf += '0\nBLOCK_RECORD\n5\n' + getHandle() + '\n100\nAcDbSymbolTableRecord\n100\nAcDbBlockTableRecord\n2\n*PAPER_SPACE\n70\n0\n280\n1\n281\n0\n';
        dxf += '0\nENDTAB\n';
        
        dxf += '0\nENDSEC\n';
        
        // BLOCKS SECTION
        dxf += '0\nSECTION\n2\nBLOCKS\n';
        dxf += '0\nBLOCK\n5\n' + getHandle() + '\n100\nAcDbEntity\n8\n0\n100\nAcDbBlockBegin\n2\n*MODEL_SPACE\n70\n0\n10\n0.0\n20\n0.0\n30\n0.0\n3\n*MODEL_SPACE\n1\n\n';
        dxf += '0\nENDBLK\n5\n' + getHandle() + '\n100\nAcDbEntity\n8\n0\n100\nAcDbBlockEnd\n';
        dxf += '0\nBLOCK\n5\n' + getHandle() + '\n100\nAcDbEntity\n8\n0\n100\nAcDbBlockBegin\n2\n*PAPER_SPACE\n70\n0\n10\n0.0\n20\n0.0\n30\n0.0\n3\n*PAPER_SPACE\n1\n\n';
        dxf += '0\nENDBLK\n5\n' + getHandle() + '\n100\nAcDbEntity\n8\n0\n100\nAcDbBlockEnd\n';
        dxf += '0\nENDSEC\n';
        
        // ENTITIES SECTION
        dxf += '0\nSECTION\n2\nENTITIES\n';
        
        for (const entity of this.entities) {
            if (entity.type === 'line') {
                dxf += this.lineToDXF(entity, getHandle);
            } else if (entity.type === 'rect') {
                const lines = entity.toLines();
                for (const line of lines) {
                    dxf += this.lineToDXF(line, getHandle);
                }
            } else if (entity.type === 'circle') {
                dxf += this.circleToDXF(entity, getHandle);
            } else if (entity.type === 'arc') {
                dxf += this.arcToDXF(entity, getHandle);
            } else if (entity.type === 'dim') {
                dxf += this.dimensionToDXF(entity, getHandle);
            } else if (entity.type === 'text') {
                dxf += this.textToDXF(entity, getHandle);
            }
        }
        
        dxf += '0\nENDSEC\n';
        
        // OBJECTS SECTION
        dxf += '0\nSECTION\n2\nOBJECTS\n';
        dxf += '0\nDICTIONARY\n5\nC\n100\nAcDbDictionary\n281\n1\n';
        dxf += '0\nENDSEC\n';
        
        dxf += '0\nEOF\n';
        
        // Download
        const blob = new Blob([dxf], { type: 'application/dxf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName + '.dxf';
        a.click();
        URL.revokeObjectURL(url);
    }
    
    lineToDXF(line, getHandle) {
        let dxf = '0\nLINE\n';
        dxf += '5\n' + getHandle() + '\n';
        dxf += '100\nAcDbEntity\n';
        dxf += '8\n0\n';  // Layer
        dxf += '100\nAcDbLine\n';
        dxf += `10\n${line.x1.toFixed(6)}\n`;
        dxf += `20\n${line.y1.toFixed(6)}\n`;
        dxf += '30\n0.0\n';
        dxf += `11\n${line.x2.toFixed(6)}\n`;
        dxf += `21\n${line.y2.toFixed(6)}\n`;
        dxf += '31\n0.0\n';
        return dxf;
    }
    
    circleToDXF(circle, getHandle) {
        let dxf = '0\nCIRCLE\n';
        dxf += '5\n' + getHandle() + '\n';
        dxf += '100\nAcDbEntity\n';
        dxf += '8\n0\n';
        dxf += '100\nAcDbCircle\n';
        dxf += `10\n${circle.cx.toFixed(6)}\n`;
        dxf += `20\n${circle.cy.toFixed(6)}\n`;
        dxf += '30\n0.0\n';
        dxf += `40\n${circle.radius.toFixed(6)}\n`;
        return dxf;
    }
    
    arcToDXF(arc, getHandle) {
        // DXF ARC uses angles in degrees, counter-clockwise from positive X axis
        let startDeg = arc.startAngle * 180 / Math.PI;
        let endDeg = arc.endAngle * 180 / Math.PI;
        
        // Normalize angles to 0-360 range
        while (startDeg < 0) startDeg += 360;
        while (endDeg < 0) endDeg += 360;
        while (startDeg >= 360) startDeg -= 360;
        while (endDeg >= 360) endDeg -= 360;
        
        let dxf = '0\nARC\n';
        dxf += '5\n' + getHandle() + '\n';
        dxf += '100\nAcDbEntity\n';
        dxf += '8\n0\n';
        dxf += '100\nAcDbCircle\n';
        dxf += `10\n${arc.cx.toFixed(6)}\n`;
        dxf += `20\n${arc.cy.toFixed(6)}\n`;
        dxf += '30\n0.0\n';
        dxf += `40\n${arc.radius.toFixed(6)}\n`;
        dxf += '100\nAcDbArc\n';
        dxf += `50\n${startDeg.toFixed(6)}\n`;
        dxf += `51\n${endDeg.toFixed(6)}\n`;
        return dxf;
    }
    
    dimensionToDXF(dim, getHandle) {
        let dxf = '';
        
        const dx = dim.x2 - dim.x1;
        const dy = dim.y2 - dim.y1;
        const length = Math.sqrt(dx * dx + dy * dy);
        
        if (length === 0) return '';
        
        const px = -dy / length;
        const py = dx / length;
        const offset = dim.offset;
        
        // Extension lines on DIMENSIONS layer
        dxf += '0\nLINE\n5\n' + getHandle() + '\n100\nAcDbEntity\n8\nDIMENSIONS\n100\nAcDbLine\n';
        dxf += `10\n${dim.x1.toFixed(6)}\n20\n${dim.y1.toFixed(6)}\n30\n0.0\n`;
        dxf += `11\n${(dim.x1 + px * offset).toFixed(6)}\n21\n${(dim.y1 + py * offset).toFixed(6)}\n31\n0.0\n`;
        
        dxf += '0\nLINE\n5\n' + getHandle() + '\n100\nAcDbEntity\n8\nDIMENSIONS\n100\nAcDbLine\n';
        dxf += `10\n${dim.x2.toFixed(6)}\n20\n${dim.y2.toFixed(6)}\n30\n0.0\n`;
        dxf += `11\n${(dim.x2 + px * offset).toFixed(6)}\n21\n${(dim.y2 + py * offset).toFixed(6)}\n31\n0.0\n`;
        
        // Dimension line
        dxf += '0\nLINE\n5\n' + getHandle() + '\n100\nAcDbEntity\n8\nDIMENSIONS\n100\nAcDbLine\n';
        dxf += `10\n${(dim.x1 + px * offset).toFixed(6)}\n20\n${(dim.y1 + py * offset).toFixed(6)}\n30\n0.0\n`;
        dxf += `11\n${(dim.x2 + px * offset).toFixed(6)}\n21\n${(dim.y2 + py * offset).toFixed(6)}\n31\n0.0\n`;
        
        // Text
        const midX = (dim.x1 + dim.x2) / 2 + px * offset;
        const midY = (dim.y1 + dim.y2) / 2 + py * offset;
        const textHeight = CONFIG.arrowSize * 1.5;
        
        dxf += '0\nTEXT\n5\n' + getHandle() + '\n100\nAcDbEntity\n8\nDIMENSIONS\n100\nAcDbText\n';
        dxf += `10\n${midX.toFixed(6)}\n20\n${midY.toFixed(6)}\n30\n0.0\n`;
        dxf += `40\n${textHeight.toFixed(6)}\n`;
        dxf += `1\n${dim.getText()}\n`;
        dxf += '100\nAcDbText\n';
        
        return dxf;
    }
    
    textToDXF(text, getHandle) {
        let dxf = '0\nTEXT\n';
        dxf += '5\n' + getHandle() + '\n';
        dxf += '100\nAcDbEntity\n';
        dxf += '8\n0\n';  // Layer
        dxf += '100\nAcDbText\n';
        dxf += `10\n${text.x.toFixed(6)}\n`;  // Insertion X
        dxf += `20\n${text.y.toFixed(6)}\n`;  // Insertion Y
        dxf += `30\n0.0\n`;                   // Z
        dxf += `40\n${text.height.toFixed(6)}\n`;  // Text height
        dxf += `1\n${text.text}\n`;           // Text content
        dxf += `50\n${(text.rotation * 180 / Math.PI).toFixed(6)}\n`;  // Rotation in degrees
        dxf += '100\nAcDbText\n';
        
        return dxf;
    }
    
    saveJSON(fileName = 'drawing') {
        const data = {
            version: '1.0',
            units: CONFIG.units,
            entities: this.entities.map(e => {
                const obj = { type: e.type };
                if (e.type === 'line' || e.type === 'dim') {
                    obj.x1 = e.x1;
                    obj.y1 = e.y1;
                    obj.x2 = e.x2;
                    obj.y2 = e.y2;
                }
                if (e.type === 'rect') {
                    obj.x1 = e.x1;
                    obj.y1 = e.y1;
                    obj.x2 = e.x2;
                    obj.y2 = e.y2;
                }
                if (e.type === 'circle') {
                    obj.cx = e.cx;
                    obj.cy = e.cy;
                    obj.radius = e.radius;
                }
                if (e.type === 'arc') {
                    obj.cx = e.cx;
                    obj.cy = e.cy;
                    obj.radius = e.radius;
                    obj.startAngle = e.startAngle;
                    obj.endAngle = e.endAngle;
                }
                if (e.type === 'text') {
                    obj.x = e.x;
                    obj.y = e.y;
                    obj.text = e.text;
                    obj.height = e.height;
                    obj.rotation = e.rotation;
                }
                if (e.type === 'dim') {
                    obj.offset = e.offset;
                }
                return obj;
            })
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName + '.json';
        a.click();
        URL.revokeObjectURL(url);
    }
}

// ============================================
// INITIALIZE APPLICATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    window.cad = new WebCAD();
});

