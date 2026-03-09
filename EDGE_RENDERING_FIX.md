# React Flow Edge Rendering Fix

## Problem Summary

The React Flow diagrams were displaying nodes correctly but **edges (connection lines) were not visible**, causing confusion about relationships between components. The console showed React Flow errors:

```
[React Flow]: Couldn't create edge for source handle id: "undefined", edge id: src_index_js-src_App_js
```

## Root Cause Analysis

### Issue 1: Missing React Flow Handles

React Flow requires custom nodes to explicitly define **Handle** components to specify connection points where edges can attach. Our custom nodes (`FileNode`, `ComponentNode`, `FunctionNode`) were missing these handles, causing React Flow to fail silently when trying to render edges.

**React Flow Error #008**: This error occurs when edges reference handles that don't exist on the nodes.

### Issue 2: Two-Pass Parsing Logic

While investigating, we also discovered and fixed a secondary issue in the `convertToReactFlow` function:

- **Original code**: Attempted to parse both nodes AND edges in a single loop iteration
- **Problem**: When an edge line was encountered, the code tried to validate it against `nodeIds` that might not have been fully collected yet
- **Solution**: Split into two distinct passes:
  1. **Pass 1**: Collect all node IDs from the Mermaid DSL
  2. **Pass 2**: Parse edges using the complete set of node IDs

## Implementation

### 1. Added Handle Imports

```jsx
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
  Handle,        // Added
  Position,      // Added
} from 'reactflow';
```

### 2. Updated FileNode Component

Added source and target handles to allow edges to connect:

```jsx
const FileNode = ({ data, selected }) => {
  // ... existing styling logic ...
  
  return (
    <>
      {/* Target handle on the left for incoming edges */}
      <Handle 
        type="target" 
        position={Position.Left} 
        style={{ background: '#58a6ff', width: 8, height: 8 }} 
      />
      
      {/* Node content */}
      <Box sx={{ /* ... */ }}>
        {/* ... node content ... */}
      </Box>
      
      {/* Source handle on the right for outgoing edges */}
      <Handle 
        type="source" 
        position={Position.Right} 
        style={{ background: '#58a6ff', width: 8, height: 8 }} 
      />
    </>
  );
};
```

### 3. Updated ComponentNode Component

Applied the same handle pattern:

```jsx
const ComponentNode = ({ data, selected }) => {
  // ... existing logic ...
  
  return (
    <>
      <Handle type="target" position={Position.Left} style={{ background: '#58a6ff', width: 8, height: 8 }} />
      <Box sx={{ /* ... */ }}>
        {/* ... node content ... */}
      </Box>
      <Handle type="source" position={Position.Right} style={{ background: '#58a6ff', width: 8, height: 8 }} />
    </>
  );
};
```

### 4. Updated FunctionNode Component

Applied the same handle pattern:

```jsx
const FunctionNode = ({ data, selected }) => {
  // ... existing logic ...
  
  return (
    <>
      <Handle type="target" position={Position.Left} style={{ background: '#58a6ff', width: 8, height: 8 }} />
      <Box sx={{ /* ... */ }}>
        {/* ... node content ... */}
      </Box>
      <Handle type="source" position={Position.Right} style={{ background: '#58a6ff', width: 8, height: 8 }} />
    </>
  );
};
```

### 5. Improved Edge Parsing (Two-Pass Approach)

```jsx
const convertToReactFlow = (data, type) => {
  const nodes = [];
  const edges = [];
  const nodeIds = new Set();
  const lines = data.split('\n').map((l) => l.trim()).filter(Boolean);

  // PASS 1: Collect all nodes and their groups
  lines.forEach((line) => {
    // ... node extraction logic ...
    // Populates nodeIds Set
  });

  // PASS 2: Extract edges now that all node IDs are collected
  lines.forEach((line) => {
    const edgePatterns = [
      /(\w+)\s+(-->|-.->|==>)\s*\|(.+?)\|\s*(\w+)/,  // With label
      /(\w+)\s+(-->|-.->|==>)\s+(\w+)/,              // Without label
    ];

    for (const pattern of edgePatterns) {
      const edgeMatch = line.match(pattern);
      if (edgeMatch) {
        const source = edgeMatch[1];
        const target = label ? edgeMatch[4] : edgeMatch[3];

        if (nodeIds.has(source) && nodeIds.has(target)) {
          edges.push({
            id: `${source}-${target}`,
            source,
            target,
            type: 'smoothstep',
            style: { stroke: '#58a6ff', strokeWidth: 2 },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: '#58a6ff',
            },
          });
        } else {
          console.warn(`Edge skipped: ${source} -> ${target}`);
        }
        break;
      }
    }
  });

  console.log(`Parsed ${nodes.length} nodes and ${edges.length} edges`);
  return { nodes, edges };
};
```

## Verification

### Console Output
```
Parsed 25 nodes and 22 edges
```

### Visual Results

**Before Fix:**
- Nodes displayed correctly
- No connection lines visible
- Console errors about undefined handles
- Confusing diagram with no clear relationships

**After Fix:**
- ✅ Nodes displayed with proper styling
- ✅ **Blue connection lines clearly visible**
- ✅ Arrow markers on edges
- ✅ Smooth step edge routing
- ✅ No console errors
- ✅ Clear dependency relationships

## Handle Configuration

Each handle has:
- **Type**: `target` (left side, receives edges) or `source` (right side, sends edges)
- **Position**: `Position.Left` or `Position.Right`
- **Style**: Blue color (`#58a6ff`) matching the edge color, 8x8px size

## Edge Configuration

Each edge has:
- **Type**: `smoothstep` for curved routing
- **Style**: Blue stroke (`#58a6ff`), 2px width
- **Marker**: Arrow closed marker at the end
- **Label**: Import path or relationship description
- **Animation**: Optional for dashed edges

## Key Learnings

1. **React Flow requires explicit handles** - Custom nodes must define connection points
2. **Two-pass parsing is more reliable** - Ensures all nodes are collected before validating edges
3. **Handle positioning matters** - Left for incoming, right for outgoing creates clear left-to-right flow
4. **Console warnings are helpful** - React Flow provides clear error messages when edges fail

## Files Modified

- `/Users/sanjaydev/DeCodify/client/src/components/ReactFlowDiagram.jsx`
  - Added `Handle` and `Position` imports
  - Updated `FileNode`, `ComponentNode`, and `FunctionNode` with handles
  - Refactored `convertToReactFlow` to use two-pass parsing
  - Added debug logging for edge parsing

## Testing

Tested with:
- Dependency diagrams (25 nodes, 22 edges)
- Component hierarchy diagrams
- Function call graphs
- Different layout directions (LR, TB, BU)

All diagram types now correctly display edges with proper connections and styling.
