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
            patternPreview: null
        };
        
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
        document.getElementById('saveBtn').addEventListener('click', () => this.saveDXF());
        
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
        
        // Start with raw world position
        let snappedPos = { ...this.mouse.world };
        
        // Priority: Snap points > Ortho > Grid
        // First, check for snap points (endpoints, midpoints, centers, etc.)
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
        
        // If no snap point found, try ortho snapping
        if (!foundSnapPoint && this.orthoEnabled && this.toolState.startPoint) {
            if (this.snapEnabled) {
                // Ortho + grid: snap to grid along ortho line
                snappedPos = this.applyOrthoSnapWithGrid(this.toolState.startPoint, this.mouse.world);
            } else {
                snappedPos = this.applyOrthoSnap(this.toolState.startPoint, this.mouse.world);
            }
            this.snapType = 'ortho';
        }
        
        // If no snap point and no ortho, try grid snapping
        if (!foundSnapPoint && !this.orthoEnabled && this.snapEnabled) {
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
        
        for (const entity of this.entities) {
            const snapPoints = this.getEntitySnapPoints(entity);
            
            for (const snap of snapPoints) {
                const dist = Math.hypot(worldPoint.x - snap.x, worldPoint.y - snap.y);
                if (dist < bestDist) {
                    bestDist = dist;
                    bestSnap = snap;
                }
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
            this.render();
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
        
        this.render();
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
        }
        
        // Handle drag end
        if (this.toolState.isDragging) {
            this.toolState.isDragging = false;
            this.toolState.dragStart = null;
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
        
        // Tool shortcuts
        const toolKeys = {
            'v': 'select',
            'l': 'line',
            'r': 'rect',
            'c': 'circle',
            'a': 'arc',
            'd': 'dimension',
            't': 'trim',
            'e': 'extend',
            'f': 'offset',
            'g': 'scale',
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
        const offsetFields = document.getElementById('offsetInputFields');
        const scaleFields = document.getElementById('scaleInputFields');
        if (offsetFields) offsetFields.style.display = 'none';
        if (scaleFields) scaleFields.style.display = 'none';
        
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
        } else if (this.dimInputType === 'rectPattern') {
            this.applyRectPattern();
            return;
        } else if (this.dimInputType === 'circPattern') {
            this.applyCircPattern();
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
            this.toolState.offsetEntity ||
            this.toolState.arcPoint1 ||
            this.toolState.arcPoint2;
        
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
            this.toolState.offsetEntity = null;
            this.toolState.arcPoint1 = null;
            this.toolState.arcPoint2 = null;
            this.hideDimensionInput();
            this.updateStatus();
            this.render();
        } else if (this.currentTool !== 'select') {
            // Nothing to cancel and not already on select - switch to select tool
            this.setTool('select');
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
        this.entities = this.entities.filter(e => !e.selected);
        this.toolState.selectedEntities = [];
        document.getElementById('propertiesPanel').classList.remove('open');
        this.render();
    }
    
    // ----------------------------------------
    // LINE TOOL (Continuous Mode)
    // ----------------------------------------
    
    handleLineClick(point) {
        if (!this.toolState.startPoint) {
            // First click - set start point
            this.toolState.startPoint = point;
        } else {
            // Create line from start to current point
            const line = new Line(
                this.toolState.startPoint.x,
                this.toolState.startPoint.y,
                point.x,
                point.y
            );
            this.entities.push(line);
            
            // Continuous mode: end point becomes new start point
            // User presses Escape to exit
            this.toolState.startPoint = { ...point };
            this.toolState.previewPoint = { ...point };
        }
    }
    
    // ----------------------------------------
    // RECTANGLE TOOL (creates 4 separate lines)
    // ----------------------------------------
    
    handleRectClick(point) {
        if (!this.toolState.startPoint) {
            this.toolState.startPoint = point;
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
            this.toolState.startPoint = null;
            this.toolState.previewPoint = null;
        }
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
            } else if (entity.type === 'rect') {
                // Scale rectangle
                entity.x = basePoint.x + (entity.x - basePoint.x) * scaleFactor;
                entity.y = basePoint.y + (entity.y - basePoint.y) * scaleFactor;
                entity.width *= scaleFactor;
                entity.height *= scaleFactor;
            }
            entity.selected = false;
        });
        
        // Reset scale tool
        this.toolState.scaleEntities = [];
        this.toolState.scaleBasePoint = null;
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
        
        // Draw entities
        for (const entity of this.entities) {
            this.drawEntity(entity);
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
        
        // Draw pattern preview
        this.drawPatternPreview();
        
        // Draw grips for selected entities
        this.drawGrips();
        
        // Draw crosshair at cursor
        this.drawCrosshair();
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
        
        // Draw major grid
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
        }
    }
    
    drawCircle(circle) {
        const ctx = this.ctx;
        const center = this.view.worldToScreen(circle.cx, circle.cy);
        const radiusScreen = circle.radius * this.view.scale;
        
        ctx.beginPath();
        ctx.arc(center.x, center.y, radiusScreen, 0, Math.PI * 2);
        ctx.stroke();
        
        // Draw center point marker
        const markerSize = 4;
        ctx.beginPath();
        ctx.moveTo(center.x - markerSize, center.y);
        ctx.lineTo(center.x + markerSize, center.y);
        ctx.moveTo(center.x, center.y - markerSize);
        ctx.lineTo(center.x, center.y + markerSize);
        ctx.stroke();
        
        // Draw center dot
        ctx.beginPath();
        ctx.arc(center.x, center.y, 2, 0, Math.PI * 2);
        ctx.fill();
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
        
        // Draw center point marker
        const markerSize = 4;
        ctx.beginPath();
        ctx.moveTo(center.x - markerSize, center.y);
        ctx.lineTo(center.x + markerSize, center.y);
        ctx.moveTo(center.x, center.y - markerSize);
        ctx.lineTo(center.x, center.y + markerSize);
        ctx.stroke();
        
        // Draw arc endpoints
        const startPt = arc.getStartPoint();
        const endPt = arc.getEndPoint();
        const screenStart = this.view.worldToScreen(startPt.x, startPt.y);
        const screenEnd = this.view.worldToScreen(endPt.x, endPt.y);
        
        ctx.beginPath();
        ctx.arc(screenStart.x, screenStart.y, 3, 0, Math.PI * 2);
        ctx.arc(screenEnd.x, screenEnd.y, 3, 0, Math.PI * 2);
        ctx.fill();
    }
    
    drawLine(line) {
        const ctx = this.ctx;
        const p1 = this.view.worldToScreen(line.x1, line.y1);
        const p2 = this.view.worldToScreen(line.x2, line.y2);
        
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
        
        // Draw endpoints
        ctx.beginPath();
        ctx.arc(p1.x, p1.y, 3, 0, Math.PI * 2);
        ctx.arc(p2.x, p2.y, 3, 0, Math.PI * 2);
        ctx.fill();
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
        
        // Draw corner points
        const corners = [
            [p1.x, p1.y],
            [p2.x, p1.y],
            [p2.x, p2.y],
            [p1.x, p2.y]
        ];
        
        for (const [cx, cy] of corners) {
            ctx.beginPath();
            ctx.arc(cx, cy, 3, 0, Math.PI * 2);
            ctx.fill();
        }
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
        this.clearSelection();
        this.centerView();
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
                }
                if (entity) this.entities.push(entity);
            }
            
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
                } else {
                    i++;
                }
            }
            
            this.zoomExtents();
        } catch (err) {
            alert('Error parsing DXF: ' + err.message);
        }
    }
    
    saveDXF() {
        let dxf = '';
        
        // Header
        dxf += '0\nSECTION\n2\nHEADER\n';
        dxf += '9\n$ACADVER\n1\nAC1014\n';
        dxf += '0\nENDSEC\n';
        
        // Entities section
        dxf += '0\nSECTION\n2\nENTITIES\n';
        
        for (const entity of this.entities) {
            if (entity.type === 'line') {
                dxf += this.lineTosDXF(entity);
            } else if (entity.type === 'rect') {
                // Convert rect to 4 lines
                const lines = entity.toLines();
                for (const line of lines) {
                    dxf += this.lineTosDXF(line);
                }
            } else if (entity.type === 'circle') {
                dxf += this.circleToDXF(entity);
            } else if (entity.type === 'arc') {
                dxf += this.arcToDXF(entity);
            } else if (entity.type === 'dim') {
                // Export dimension as lines + text
                dxf += this.dimensionToDXF(entity);
            }
        }
        
        dxf += '0\nENDSEC\n';
        dxf += '0\nEOF\n';
        
        // Download
        const blob = new Blob([dxf], { type: 'application/dxf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'drawing.dxf';
        a.click();
        URL.revokeObjectURL(url);
    }
    
    lineTosDXF(line) {
        return `0\nLINE\n8\n0\n10\n${line.x1}\n20\n${line.y1}\n30\n0\n11\n${line.x2}\n21\n${line.y2}\n31\n0\n`;
    }
    
    circleToDXF(circle) {
        return `0\nCIRCLE\n8\n0\n10\n${circle.cx}\n20\n${circle.cy}\n30\n0\n40\n${circle.radius}\n`;
    }
    
    arcToDXF(arc) {
        // DXF ARC uses angles in degrees
        const startDeg = arc.startAngle * 180 / Math.PI;
        const endDeg = arc.endAngle * 180 / Math.PI;
        return `0\nARC\n8\n0\n10\n${arc.cx}\n20\n${arc.cy}\n30\n0\n40\n${arc.radius}\n50\n${startDeg}\n51\n${endDeg}\n`;
    }
    
    dimensionToDXF(dim) {
        let dxf = '';
        
        // Calculate dimension geometry
        const dx = dim.x2 - dim.x1;
        const dy = dim.y2 - dim.y1;
        const length = Math.sqrt(dx * dx + dy * dy);
        
        if (length === 0) return '';
        
        const px = -dy / length;
        const py = dx / length;
        const offset = dim.offset;
        
        // Extension lines
        dxf += `0\nLINE\n8\nDIMENSIONS\n10\n${dim.x1}\n20\n${dim.y1}\n30\n0\n11\n${dim.x1 + px * offset}\n21\n${dim.y1 + py * offset}\n31\n0\n`;
        dxf += `0\nLINE\n8\nDIMENSIONS\n10\n${dim.x2}\n20\n${dim.y2}\n30\n0\n11\n${dim.x2 + px * offset}\n21\n${dim.y2 + py * offset}\n31\n0\n`;
        
        // Dimension line
        dxf += `0\nLINE\n8\nDIMENSIONS\n10\n${dim.x1 + px * offset}\n20\n${dim.y1 + py * offset}\n30\n0\n11\n${dim.x2 + px * offset}\n21\n${dim.y2 + py * offset}\n31\n0\n`;
        
        // Text
        const midX = (dim.x1 + dim.x2) / 2 + px * offset;
        const midY = (dim.y1 + dim.y2) / 2 + py * offset;
        dxf += `0\nTEXT\n8\nDIMENSIONS\n10\n${midX}\n20\n${midY}\n30\n0\n40\n${CONFIG.arrowSize}\n1\n${dim.getText()}\n`;
        
        return dxf;
    }
    
    saveJSON() {
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
        a.download = 'drawing.cad';
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

