# React Flow Implementation Guide

## ✅ **Implementation Complete**

React Flow has been successfully integrated as an alternative to Mermaid diagrams!

---

## 🎯 **How to Toggle Between Mermaid and React Flow**

### Environment Variable Control

Edit `/Users/sanjaydev/DeCodify/client/.env`:

```env
# Use Mermaid (static diagrams)
VITE_USE_MERMAID=true

# Use React Flow (interactive diagrams) - DEFAULT
VITE_USE_MERMAID=false
```

**Current Setting**: `VITE_USE_MERMAID=false` (React Flow enabled)

---

## 🎨 **React Flow Features**

### Interactive Controls
- ✅ **Drag nodes**: Click and drag any node to reposition
- ✅ **Zoom**: Mouse wheel or pinch to zoom in/out
- ✅ **Pan**: Click and drag background to move around
- ✅ **Minimap**: Overview of large diagrams (bottom-right)
- ✅ **Controls**: Zoom buttons and fit view (bottom-left)

### Visual Enhancements
- ✅ **Custom nodes**: File, Component, and Function nodes with icons
- ✅ **Color coding**: 
  - 🟡 JavaScript (.js)
  - 🔷 React (.jsx, .tsx)
  - 🔵 TypeScript (.ts)
  - 🎨 CSS (.css)
  - 🌐 HTML (.html)
  - 💚 Vue (.vue)
- ✅ **Auto-layout**: Dagre algorithm for optimal node placement
- ✅ **Smooth edges**: Curved connections between nodes
- ✅ **Hover effects**: Nodes lift on hover
- ✅ **Dark theme**: Matches your app's design

---

## 📁 **Files Created**

### 1. `client/src/components/ReactFlowDiagram.jsx`
Main React Flow component with:
- Custom node types (File, Component, Function)
- Mermaid DSL parser
- Auto-layout with Dagre
- Interactive controls

### 2. Updated `client/src/components/DiagramTab.jsx`
- Added environment variable check
- Toggle between Mermaid and React Flow
- Display current renderer badge

### 3. Updated `client/.env`
- Added `VITE_USE_MERMAID=false`

---

## 🔄 **How It Works**

### Flow Diagram
```
User clicks diagram type
        ↓
DiagramTab fetches Mermaid DSL from API
        ↓
Check VITE_USE_MERMAID env variable
        ↓
    ┌───────────────┐
    │ true  │ false │
    ↓       ↓
Mermaid   React Flow
 (static)  (interactive)
```

### Data Flow
1. **API Call**: Fetch Mermaid DSL from `/api/flowchart/{type}/{projectId}`
2. **Parse**: Convert Mermaid DSL to React Flow nodes/edges
3. **Layout**: Apply Dagre auto-layout algorithm
4. **Render**: Display interactive diagram

---

## 🎨 **Custom Node Types**

### 1. File Node
```jsx
📄 src/App.js
   2f, 1c
```
- Shows file icon based on extension
- Displays function/component count
- Color-coded border

### 2. Component Node
```jsx
⚛️ App
   {props, state}
```
- React icon
- Shows component props
- Green border for exported components
- Orange border for class components

### 3. Function Node
```jsx
⚡ fetchData
   (url, options)
```
- Lightning bolt for async functions
- Shows parameters
- Purple border for async, blue for regular

---

## 🚀 **Testing**

### 1. Start Development Server
```bash
cd client
npm run dev
```

### 2. Navigate to Diagrams Tab
- Upload a project
- Go to "Diagrams" tab
- Should see "React Flow" badge (top-right)

### 3. Test Interactions
- ✅ Drag nodes around
- ✅ Zoom in/out with mouse wheel
- ✅ Pan by dragging background
- ✅ Click minimap to navigate
- ✅ Use controls to fit view

### 4. Toggle to Mermaid
```bash
# Edit client/.env
VITE_USE_MERMAID=true

# Restart dev server
npm run dev
```

---

## 📊 **Comparison**

| Feature | Mermaid | React Flow |
|---------|---------|------------|
| **Interactive** | ❌ Static | ✅ Drag, zoom, pan |
| **Performance** | ⚠️ Slow (>50 nodes) | ✅ Fast (1000+ nodes) |
| **Custom styling** | ⚠️ Limited | ✅ Full control |
| **Layout quality** | ⚠️ Basic | ✅ Professional |
| **Minimap** | ❌ No | ✅ Yes |
| **Node selection** | ❌ No | ✅ Yes |
| **Export** | ⚠️ Manual | ✅ Built-in |
| **Mobile** | ⚠️ Poor | ✅ Good |

---

## 🐛 **Known Limitations**

### 1. Mermaid DSL Parsing
- Currently parses basic Mermaid syntax
- May not handle all edge cases
- Complex subgraphs might need refinement

### 2. Node Positioning
- Auto-layout is deterministic but may need tweaking
- Large graphs (100+ nodes) might be cluttered

### 3. Edge Labels
- Currently shows import paths
- Could be improved with better formatting

---

## 🔧 **Configuration**

### Customize Node Appearance

Edit `ReactFlowDiagram.jsx`:

```jsx
// Change node colors
const getColor = (fileType) => {
  return {
    '.js': '#your-color',
    // ...
  }[fileType] || '#default';
};

// Change node size
<Box sx={{ minWidth: '200px' }}> // Increase width
```

### Customize Layout

```jsx
// Change layout direction
dagreGraph.setGraph({ 
  rankdir: 'TB',  // Top-to-Bottom instead of Left-to-Right
  nodesep: 150,   // Increase node spacing
  ranksep: 200    // Increase rank spacing
});
```

### Customize Controls

```jsx
<Controls 
  showZoom={true}
  showFitView={true}
  showInteractive={true}
  position="bottom-left"
/>
```

---

## 📈 **Future Enhancements**

### Phase 1 (Current) ✅
- ✅ Basic React Flow integration
- ✅ Custom node types
- ✅ Auto-layout
- ✅ Environment variable toggle

### Phase 2 (Next)
- ⏳ Node click → show file details
- ⏳ Search & highlight nodes
- ⏳ Filter by file type
- ⏳ Export as PNG/SVG

### Phase 3 (Future)
- ⏳ Real-time updates (watch mode)
- ⏳ Diff view (compare commits)
- ⏳ Metrics overlay (complexity, LOC)
- ⏳ Path highlighting (dependency chains)

---

## 🎓 **Usage Examples**

### Example 1: Dependency Diagram
```
1. Select "Dependencies" tab
2. See file relationships with color-coded nodes
3. Drag nodes to organize layout
4. Zoom in to see import labels
```

### Example 2: Component Hierarchy
```
1. Select "Components" tab
2. See React component tree
3. Green nodes = exported components
4. Props shown below component name
```

### Example 3: Function Call Graph
```
1. Select "Functions" tab
2. See function relationships
3. ⚡ = async functions
4. Arrows show call direction
```

---

## 🔗 **Resources**

- **React Flow Docs**: https://reactflow.dev/
- **Dagre Layout**: https://github.com/dagrejs/dagre
- **Examples**: https://reactflow.dev/examples

---

## 📝 **Quick Reference**

### Environment Variables
```env
VITE_USE_MERMAID=false  # Use React Flow (interactive)
VITE_USE_MERMAID=true   # Use Mermaid (static)
```

### Dependencies Added
```json
{
  "reactflow": "^11.x.x",
  "dagre": "^0.8.x"
}
```

### Files Modified
- ✅ `client/.env`
- ✅ `client/src/components/DiagramTab.jsx`
- ✅ `client/src/components/ReactFlowDiagram.jsx` (new)

---

**Status**: ✅ **COMPLETE**  
**Default**: React Flow (interactive)  
**Toggle**: Set `VITE_USE_MERMAID=true` for Mermaid  
**Date**: 2026-03-09
