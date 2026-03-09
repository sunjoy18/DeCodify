# Diagram Renderer Toggle - Quick Guide

## 🎯 **How to Switch Between Mermaid and React Flow**

### Option 1: Use React Flow (Interactive) - **DEFAULT**
```env
# client/.env
VITE_USE_MERMAID=false
```

**Features:**
- ✅ Drag nodes to reposition
- ✅ Zoom with mouse wheel
- ✅ Pan by dragging background
- ✅ Minimap for navigation
- ✅ Better performance with large graphs
- ✅ Professional auto-layout

---

### Option 2: Use Mermaid (Static)
```env
# client/.env
VITE_USE_MERMAID=true
```

**Features:**
- ✅ Simpler rendering
- ✅ No additional dependencies
- ✅ Good for small projects
- ⚠️ Static (no interaction)

---

## 🚀 **Quick Start**

### 1. Set Environment Variable
Edit `client/.env`:
```env
VITE_USE_MERMAID=false  # For React Flow
```

### 2. Restart Dev Server
```bash
cd client
npm run dev
```

### 3. Test
- Upload a project
- Go to "Diagrams" tab
- Should see "React Flow" badge
- Try dragging nodes!

---

## 📦 **What Was Installed**

```bash
npm install reactflow dagre
```

- **reactflow**: Interactive diagram library
- **dagre**: Auto-layout algorithm

---

## 🎨 **Visual Comparison**

### Mermaid (Static)
```
[Static diagram]
- No interaction
- Basic layout
- Simple styling
```

### React Flow (Interactive)
```
[Interactive diagram]
- Drag nodes ✅
- Zoom/pan ✅
- Minimap ✅
- Custom nodes ✅
- Better layout ✅
```

---

## 🔧 **Troubleshooting**

### Issue: Still seeing Mermaid after changing env
**Solution**: Restart dev server (Vite needs restart for env changes)

### Issue: Diagram looks cluttered
**Solution**: 
- Zoom out with mouse wheel
- Use minimap to navigate
- Drag nodes to organize

### Issue: Nodes overlap
**Solution**: Auto-layout will improve in future updates. For now, manually drag nodes.

---

## 📝 **Files Modified**

1. ✅ `client/.env` - Added `VITE_USE_MERMAID=false`
2. ✅ `client/src/components/DiagramTab.jsx` - Added toggle logic
3. ✅ `client/src/components/ReactFlowDiagram.jsx` - New React Flow component
4. ✅ `client/package.json` - Added reactflow & dagre dependencies

---

**Current Setting**: React Flow (interactive) ✅  
**To Switch**: Change `VITE_USE_MERMAID` in `client/.env` and restart server
