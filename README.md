<p align="center">
  <img src="https://img.shields.io/badge/Built%20With-Claude%20Opus%204.5-blueviolet?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZmlsbD0id2hpdGUiIGQ9Ik0xMiAyTDIgN2wxMCA1IDEwLTUtMTAtNXpNMiAxN2wxMCA1IDEwLTVNMiAxMmwxMCA1IDEwLTUiLz48L3N2Zz4="/>
  <img src="https://img.shields.io/badge/100%25-Vibe%20Coded-ff69b4?style=for-the-badge"/>
  <img src="https://img.shields.io/badge/Zero-Dependencies-00d4aa?style=for-the-badge"/>
</p>

<h1 align="center">
  <br>
  <img src="https://raw.githubusercontent.com/gist/Gensukii/c1c5a52f3c6f4f6c03e6d02b1d8f7e8a/raw/cad-icon.svg" alt="WebCAD" width="120">
  <br>
  ✨ WebCAD ✨
  <br>
</h1>

<h3 align="center">A fully-featured 2D CAD application that runs entirely in your browser</h3>

<p align="center">
  <a href="https://nickmesser.github.io/WebCad/">
    <img src="https://img.shields.io/badge/▶%20Live%20Demo-Try%20It%20Now-00d4aa?style=for-the-badge&logoColor=white" alt="Live Demo"/>
  </a>
</p>

<p align="center">
  <a href="#-features">Features</a> •
  <a href="#-the-story">The Story</a> •
  <a href="#-quick-start">Quick Start</a> •
  <a href="#%EF%B8%8F-keyboard-shortcuts">Shortcuts</a> •
  <a href="#-file-formats">File Formats</a>
</p>

---

## 🤯 The Story

> **This entire application was 100% vibe coded as an experiment to test Claude Opus 4.5.**

I have been absolutely *blown away* by the results. What started as a simple test turned into a genuinely useful, professional-grade 2D CAD tool—all generated through conversational AI prompts.

No manual coding. No debugging sessions. Just vibes and AI. 🎯

The fact that this works—and works *well*—is a testament to how far AI-assisted development has come. Feel free to explore, use it for your projects, or just marvel at what's possible.

---

## 🎨 Features

### ✏️ Drawing Tools
| Tool | Shortcut | Description |
|------|----------|-------------|
| **Select** | `V` | Select, move, and manipulate entities |
| **Line** | `L` | Draw precise lines with length/angle input |
| **Rectangle** | `R` | Create rectangles with width/height dimensions |
| **Circle** | `C` | Draw circles by center and radius |
| **Arc** | `A` | Create arcs with start, end, and bulge control |
| **Text** | `X` | Add text annotations with custom sizing |
| **Dimension** | `D` | Add professional dimension annotations |

### 🔧 Editing Tools
| Tool | Shortcut | Description |
|------|----------|-------------|
| **Trim** | `T` | Trim entities at intersection points |
| **Extend** | `E` | Extend lines to meet boundary entities |
| **Offset** | `F` | Create parallel copies at specified distances |
| **Scale** | `G` | Scale entities from a reference point |
| **Rotate** | `O` | Rotate entities around a center point |
| **Rect Pattern** | `P` | Create rectangular arrays of entities |
| **Circ Pattern** | `Shift+P` | Create circular/polar arrays |

### 🎯 Precision Features
- **Grid Snapping** — Snap to configurable grid points
- **Center Snapping** — Snap to circle/arc centers
- **Endpoint Snapping** — Snap to line endpoints
- **Midpoint Snapping** — Snap to line midpoints
- **Ortho Mode** — Constrain to configurable angle increments
- **Polar Tracking** — Visual alignment guides
- **Precise Input** — Type exact dimensions anytime

### 🖥️ Interface
- Sleek, dark professional theme
- Real-time coordinate display
- Infinite pan & zoom canvas
- Visual undo/redo history bar
- Properties panel for selected entities
- Status hints and tool guidance

---

## 🚀 Quick Start

### Try It Online
**No installation required!** Just visit the live demo:

👉 **[https://nickmesser.github.io/WebCad/](https://nickmesser.github.io/WebCad/)**

### Run Locally

```bash
# Clone the repository
git clone https://github.com/nickmesser/WebCad.git

# Open in browser
open index.html
# or just double-click index.html
```

Or simply drag `index.html` into your favorite browser. That's it!

---

## ⌨️ Keyboard Shortcuts

### Tools
| Key | Action |
|-----|--------|
| `V` | Select tool |
| `L` | Line tool |
| `R` | Rectangle tool |
| `C` | Circle tool |
| `A` | Arc tool |
| `D` | Dimension tool |
| `X` | Text tool |
| `T` | Trim tool |
| `E` | Extend tool |
| `F` | Offset tool |
| `G` | Scale tool |
| `O` | Rotate tool |
| `P` | Rectangular pattern |
| `Shift+P` | Circular pattern |

### Actions
| Key | Action |
|-----|--------|
| `Delete` | Delete selected entities |
| `Escape` | Cancel current operation |
| `Ctrl+Z` | Undo |
| `Ctrl+Y` / `Ctrl+Shift+Z` | Redo |
| `+` / `-` | Zoom in/out |

### Precision Input
While drawing, simply start typing numbers to enter precise dimensions:
- **Lines**: Enter length and angle
- **Rectangles**: Enter width and height  
- **Circles**: Enter radius
- **Text**: Enter text content and height

---

## 💾 File Formats

### Export Options
| Format | Extension | Compatibility |
|--------|-----------|---------------|
| **DXF** | `.dxf` | AutoCAD, FreeCAD, LibreCAD, and most CAD software |
| **JSON** | `.json` | WebCAD native format (preserves all data) |

### Import Support
- DXF files (lines, circles, arcs, text)
- WebCAD JSON files

---

## 📐 Units

Switch between measurement systems anytime:
- **Millimeters (mm)** — Default
- **Inches (in)** — For imperial users

All internal calculations maintain precision regardless of display units.

---

## 🛠️ Technical Details

- **Pure vanilla JavaScript** — No frameworks, no dependencies
- **HTML5 Canvas** — Hardware-accelerated rendering
- **7,300+ lines of code** — All generated through AI conversation
- **Responsive design** — Works on various screen sizes
- **Modern ES6+** — Clean, class-based architecture

---

## 📸 What You Can Build

WebCAD is perfect for:
- 🏠 Floor plans and layouts
- ⚙️ Mechanical part sketches
- 🪑 Furniture designs
- 📐 Technical drawings
- 🎨 Geometric art
- 📝 Quick CAD mockups

---

## 🙏 Acknowledgments

Built entirely with the assistance of **Claude Opus 4.5** by Anthropic. This project demonstrates the remarkable capabilities of modern AI in software development.

---

<p align="center">
  <sub>Made with 🤖 and vibes</sub>
</p>
