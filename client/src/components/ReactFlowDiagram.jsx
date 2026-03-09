import React, { useCallback, useEffect, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
  Handle,
  Position,
} from 'reactflow';
import dagre from 'dagre';
import 'reactflow/dist/style.css';
import { Box, Paper, Typography, Alert, CircularProgress } from '@mui/material';

// Custom node component for files
const FileNode = ({ data, selected }) => {
  const getIcon = (fileType) => {
    const icons = {
      '.js': '📄',
      '.jsx': '⚛️',
      '.ts': '🔷',
      '.tsx': '⚛️',
      '.css': '🎨',
      '.html': '🌐',
      '.vue': '💚',
    };
    return icons[fileType] || '📄';
  };

  const getColor = (fileType) => {
    const colors = {
      '.js': '#f7df1e',
      '.jsx': '#61dafb',
      '.ts': '#3178c6',
      '.tsx': '#61dafb',
      '.css': '#264de4',
      '.html': '#e34c26',
      '.vue': '#42b883',
    };
    return colors[fileType] || '#6b7280';
  };

  const getBgColor = (fileType) => {
    const colors = {
      '.js': 'rgba(247, 223, 30, 0.1)',
      '.jsx': 'rgba(97, 218, 251, 0.1)',
      '.ts': 'rgba(49, 120, 198, 0.1)',
      '.tsx': 'rgba(97, 218, 251, 0.1)',
      '.css': 'rgba(38, 77, 228, 0.1)',
      '.html': 'rgba(227, 76, 38, 0.1)',
      '.vue': 'rgba(66, 184, 131, 0.1)',
    };
    return colors[fileType] || 'rgba(107, 114, 128, 0.1)';
  };

  return (
    <>
      <Handle type="target" position={Position.Left} style={{ background: '#58a6ff', width: 8, height: 8 }} />
      <Box
        sx={{
          padding: '14px 18px',
          border: `3px solid ${selected ? '#58a6ff' : getColor(data.fileType)}`,
          borderRadius: '10px',
          background: `linear-gradient(135deg, ${getBgColor(data.fileType)}, #1e1e1e)`,
          minWidth: '200px',
          maxWidth: '280px',
          boxShadow: selected 
            ? '0 8px 16px rgba(88, 166, 255, 0.4)' 
            : '0 4px 8px rgba(0,0,0,0.4)',
          transition: 'all 0.2s ease',
          '&:hover': {
            boxShadow: '0 8px 16px rgba(88, 166, 255, 0.3)',
            transform: 'translateY(-2px)',
            borderColor: '#58a6ff',
          },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
          <span style={{ fontSize: '28px', lineHeight: 1 }}>{getIcon(data.fileType)}</span>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="body2"
              sx={{
                fontWeight: 700,
                color: '#e6edf3',
                fontSize: '14px',
                lineHeight: 1.4,
                wordBreak: 'break-word',
              }}
            >
              {data.label}
            </Typography>
            {data.metrics && (data.metrics.functions > 0 || data.metrics.components > 0) && (
              <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                {data.metrics.functions > 0 && (
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      color: '#8b949e', 
                      fontSize: '11px',
                      background: 'rgba(139, 148, 158, 0.1)',
                      padding: '2px 6px',
                      borderRadius: '4px',
                    }}
                  >
                    {data.metrics.functions}f
                  </Typography>
                )}
                {data.metrics.components > 0 && (
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      color: '#8b949e', 
                      fontSize: '11px',
                      background: 'rgba(139, 148, 158, 0.1)',
                      padding: '2px 6px',
                      borderRadius: '4px',
                    }}
                  >
                    {data.metrics.components}c
                  </Typography>
                )}
              </Box>
            )}
            {data.group && (
              <Typography variant="caption" sx={{ color: '#6b7280', fontSize: '10px', mt: 0.5, display: 'block' }}>
                📁 {data.group}
              </Typography>
            )}
          </Box>
        </Box>
      </Box>
      <Handle type="source" position={Position.Right} style={{ background: '#58a6ff', width: 8, height: 8 }} />
    </>
  );
};

// Custom node for components
const ComponentNode = ({ data, selected }) => {
  const isExported = data.exported;
  const isClass = data.componentType === 'class_component';
  const borderColor = isExported ? '#4caf50' : isClass ? '#ffa726' : '#61dafb';

  return (
    <>
      <Handle type="target" position={Position.Left} style={{ background: '#58a6ff', width: 8, height: 8 }} />
      <Box
        sx={{
          padding: '14px 18px',
          border: `3px solid ${selected ? '#58a6ff' : borderColor}`,
          borderRadius: '12px',
          background: `linear-gradient(135deg, ${isExported ? 'rgba(76, 175, 80, 0.15)' : 'rgba(97, 218, 251, 0.15)'}, #1e1e1e)`,
          minWidth: '180px',
          maxWidth: '260px',
          boxShadow: selected 
            ? '0 8px 16px rgba(88, 166, 255, 0.4)' 
            : '0 4px 8px rgba(0,0,0,0.4)',
          transition: 'all 0.2s ease',
          '&:hover': {
            boxShadow: '0 8px 16px rgba(97, 218, 251, 0.4)',
            transform: 'translateY(-2px)',
            borderColor: '#58a6ff',
          },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
          <span style={{ fontSize: '24px', lineHeight: 1 }}>⚛️</span>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="body2" sx={{ fontWeight: 700, color: '#e6edf3', fontSize: '14px' }}>
              {data.label}
            </Typography>
            {data.props && data.props.length > 0 && (
              <Typography 
                variant="caption" 
                sx={{ 
                  color: '#8b949e', 
                  fontSize: '11px',
                  display: 'block',
                  mt: 0.5,
                  background: 'rgba(139, 148, 158, 0.1)',
                  padding: '3px 8px',
                  borderRadius: '4px',
                  fontFamily: 'monospace',
                }}
              >
                {'{' + data.props.slice(0, 3).join(', ') + '}'}
              </Typography>
            )}
            {isExported && (
              <Typography variant="caption" sx={{ color: '#4caf50', fontSize: '10px', display: 'block', mt: 0.5 }}>
                ✓ Exported
              </Typography>
            )}
          </Box>
        </Box>
      </Box>
      <Handle type="source" position={Position.Right} style={{ background: '#58a6ff', width: 8, height: 8 }} />
    </>
  );
};

// Custom node for functions
const FunctionNode = ({ data, selected }) => {
  const isAsync = data.async;
  const borderColor = isAsync ? '#9c27b0' : '#2196f3';

  return (
    <>
      <Handle type="target" position={Position.Left} style={{ background: '#58a6ff', width: 8, height: 8 }} />
      <Box
        sx={{
          padding: '12px 16px',
          border: `3px solid ${selected ? '#58a6ff' : borderColor}`,
          borderRadius: '10px',
          background: `linear-gradient(135deg, ${isAsync ? 'rgba(156, 39, 176, 0.15)' : 'rgba(33, 150, 243, 0.15)'}, #1e1e1e)`,
          minWidth: '160px',
          maxWidth: '240px',
          boxShadow: selected 
            ? '0 8px 16px rgba(88, 166, 255, 0.4)' 
            : '0 4px 8px rgba(0,0,0,0.4)',
          transition: 'all 0.2s ease',
          '&:hover': {
            boxShadow: '0 8px 16px rgba(33, 150, 243, 0.4)',
            transform: 'translateY(-2px)',
            borderColor: '#58a6ff',
          },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
          <span style={{ fontSize: '20px', lineHeight: 1 }}>{isAsync ? '⚡' : '⚙️'}</span>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography 
              variant="body2" 
              sx={{ 
                fontWeight: 700, 
                color: '#e6edf3', 
                fontSize: '13px',
                wordBreak: 'break-word',
              }}
            >
              {data.label}
            </Typography>
            {data.params && data.params.length > 0 && (
              <Typography 
                variant="caption" 
                sx={{ 
                  color: '#8b949e', 
                  fontSize: '11px',
                  display: 'block',
                  mt: 0.5,
                  fontFamily: 'monospace',
                  background: 'rgba(139, 148, 158, 0.1)',
                  padding: '3px 8px',
                  borderRadius: '4px',
                }}
              >
                ({data.params.slice(0, 2).join(', ')})
              </Typography>
            )}
          </Box>
        </Box>
      </Box>
      <Handle type="source" position={Position.Right} style={{ background: '#58a6ff', width: 8, height: 8 }} />
    </>
  );
};

const nodeTypes = {
  file: FileNode,
  component: ComponentNode,
  function: FunctionNode,
};

// Auto-layout using Dagre with improved spacing
const getLayoutedElements = (nodes, edges, direction = 'LR') => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  
  // Better spacing for readability
  dagreGraph.setGraph({ 
    rankdir: direction,
    nodesep: 120,      // Horizontal spacing between nodes
    ranksep: 180,      // Vertical spacing between ranks
    marginx: 50,       // Margin around the graph
    marginy: 50,
  });

  // Set node dimensions (approximate)
  nodes.forEach((node) => {
    const width = node.type === 'file' ? 220 : node.type === 'component' ? 200 : 180;
    const height = 90;
    dagreGraph.setNode(node.id, { width, height });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    const width = node.type === 'file' ? 220 : node.type === 'component' ? 200 : 180;
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - width / 2,
        y: nodeWithPosition.y - 45,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
};

const ReactFlowDiagram = ({ definition, diagramType = 'dependency', title = 'Diagram' }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!definition) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Convert Mermaid DSL or API data to React Flow format
      const { nodes: rfNodes, edges: rfEdges } = convertToReactFlow(definition, diagramType);

      if (rfNodes.length === 0) {
        setError('No nodes found in diagram data');
        setLoading(false);
        return;
      }

      // Apply auto-layout
      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(rfNodes, rfEdges, 'LR');

      setNodes(layoutedNodes);
      setEdges(layoutedEdges);
      setLoading(false);
    } catch (err) {
      console.error('React Flow rendering error:', err);
      setError(err.message || 'Failed to render diagram');
      setLoading(false);
    }
  }, [definition, diagramType]);

  const convertToReactFlow = (data, type) => {
    const nodes = [];
    const edges = [];
    const nodeIds = new Set();
    const nodeGroups = new Map();

    const lines = data.split('\n').map((l) => l.trim()).filter(Boolean);
    let currentSubgraph = null;

    // PASS 1: Collect all nodes and their groups
    lines.forEach((line) => {
      if (line.startsWith('graph ') || line.startsWith('classDef') || line.startsWith('class ') || line.startsWith('%%')) {
        return;
      }

      if (line.startsWith('subgraph ')) {
        const match = line.match(/subgraph\s+(\w+)\["?📁?\s*(.+?)"\]?/);
        if (match) {
          currentSubgraph = match[2].replace('📁', '').trim();
        }
        return;
      }

      if (line === 'end') {
        currentSubgraph = null;
        return;
      }

      // Extract nodes with all bracket types
      const nodePatterns = [
        /(\w+)\[\"(.+?)\"\]/,           // [label]
        /(\w+)\(\"(.+?)\"\)/,           // (label)
        /(\w+)\(\(\(\"(.+?)\"\)\)\)/,   // (((label)))
        /(\w+)\{\{\"(.+?)\"\}\}/,       // {{label}}
        /(\w+)\[\[\"(.+?)\"\]\]/,       // [[label]]
      ];

      for (const pattern of nodePatterns) {
        const nodeMatch = line.match(pattern);
        if (nodeMatch && !line.includes('-->') && !line.includes('-.->')) {
          const id = nodeMatch[1];
          const labelRaw = nodeMatch[2] || nodeMatch[1];
          
          if (!nodeIds.has(id)) {
            nodeIds.add(id);
            if (currentSubgraph) {
              nodeGroups.set(id, currentSubgraph);
            }

            let nodeType = 'file';
            let nodeData = { label: labelRaw, group: currentSubgraph };

            if (type === 'components') {
              nodeType = 'component';
              const propsMatch = labelRaw.match(/\{(.+?)\}/);
              nodeData.props = propsMatch ? propsMatch[1].split(',').map((p) => p.trim()) : [];
              nodeData.label = labelRaw.replace(/\s*\{.+?\}/, '');
            } else if (type === 'functions') {
              nodeType = 'function';
              const paramsMatch = labelRaw.match(/\((.+?)\)/);
              nodeData.params = paramsMatch ? paramsMatch[1].split(',').map((p) => p.trim()) : [];
              nodeData.async = labelRaw.includes('⚡');
              nodeData.label = labelRaw.replace('⚡', '').replace(/\s*\(.+?\)/, '');
            } else {
              const metricsMatch = labelRaw.match(/\[(\d+)f,(\d+)c\]/);
              if (metricsMatch) {
                nodeData.metrics = {
                  functions: parseInt(metricsMatch[1]),
                  components: parseInt(metricsMatch[2]),
                };
                nodeData.label = labelRaw.replace(/\s*\[\d+f,\d+c\]/, '');
              }

              const extMatch = nodeData.label.match(/\.(\w+)$/);
              nodeData.fileType = extMatch ? `.${extMatch[1]}` : '.js';
            }

            nodes.push({
              id,
              type: nodeType,
              data: nodeData,
              position: { x: 0, y: 0 },
            });
          }
          break;
        }
      }
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
          const edgeType = edgeMatch[2];
          const label = edgeMatch[3] && !nodeIds.has(edgeMatch[3]) ? edgeMatch[3] : '';
          const target = label ? edgeMatch[4] : edgeMatch[3];

          if (nodeIds.has(source) && nodeIds.has(target)) {
            edges.push({
              id: `${source}-${target}`,
              source,
              target,
              label: label || '',
              type: 'smoothstep',
              animated: edgeType === '-.->',
              style: { 
                stroke: '#58a6ff', 
                strokeWidth: 2,
              },
              labelStyle: { 
                fill: '#8b949e', 
                fontSize: 11,
                fontWeight: 500,
              },
              labelBgStyle: { 
                fill: '#161b22', 
                fillOpacity: 0.8,
              },
              markerEnd: {
                type: MarkerType.ArrowClosed,
                color: '#58a6ff',
                width: 20,
                height: 20,
              },
            });
          } else {
            console.warn(`Edge skipped: ${source} -> ${target} (source exists: ${nodeIds.has(source)}, target exists: ${nodeIds.has(target)})`);
          }
          break;
        }
      }
    });

    console.log(`Parsed ${nodes.length} nodes and ${edges.length} edges`);
    return { nodes, edges };
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
      </Alert>
    );
  }

  if (nodes.length === 0) {
    return (
      <Alert severity="info" sx={{ m: 2 }}>
        No diagram data available. Upload a project first to generate visualizations.
      </Alert>
    );
  }

  return (
    <Paper sx={{ height: '650px', border: '1px solid rgba(255,255,255,0.08)', position: 'relative' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2, maxZoom: 1 }}
        minZoom={0.1}
        maxZoom={2}
        defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
        attributionPosition="bottom-left"
        style={{ background: '#0d1117' }}
      >
        <Background 
          color="#30363d" 
          gap={20} 
          size={1}
          style={{ opacity: 0.4 }}
        />
        <Controls 
          style={{ 
            button: { 
              background: '#21262d', 
              color: '#e6edf3', 
              border: '1px solid #30363d',
              borderRadius: '6px',
            } 
          }} 
          showInteractive={false}
        />
        <MiniMap
          nodeColor={(node) => {
            if (node.type === 'component') return '#61dafb';
            if (node.type === 'function') return '#2196f3';
            return '#6b7280';
          }}
          maskColor="rgba(13, 17, 23, 0.8)"
          style={{ 
            background: '#0d1117', 
            border: '1px solid #30363d',
            borderRadius: '6px',
          }}
        />
      </ReactFlow>
      
      {/* Legend */}
      <Box
        sx={{
          position: 'absolute',
          top: 16,
          right: 16,
          background: 'rgba(33, 38, 45, 0.95)',
          border: '1px solid #30363d',
          borderRadius: '8px',
          padding: '12px',
          backdropFilter: 'blur(8px)',
          zIndex: 5,
        }}
      >
        <Typography variant="caption" sx={{ color: '#8b949e', fontWeight: 600, display: 'block', mb: 1 }}>
          LEGEND
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 12, height: 12, background: '#58a6ff', borderRadius: '2px' }} />
            <Typography variant="caption" sx={{ color: '#e6edf3', fontSize: '11px' }}>
              Import/Dependency
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <span style={{ fontSize: '14px' }}>📄</span>
            <Typography variant="caption" sx={{ color: '#e6edf3', fontSize: '11px' }}>
              JavaScript
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <span style={{ fontSize: '14px' }}>⚛️</span>
            <Typography variant="caption" sx={{ color: '#e6edf3', fontSize: '11px' }}>
              React/JSX
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <span style={{ fontSize: '14px' }}>🎨</span>
            <Typography variant="caption" sx={{ color: '#e6edf3', fontSize: '11px' }}>
              CSS
            </Typography>
          </Box>
        </Box>
      </Box>
    </Paper>
  );
};

export default ReactFlowDiagram;
