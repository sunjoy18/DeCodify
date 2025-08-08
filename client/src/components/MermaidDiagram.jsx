import React, { useEffect, useRef } from 'react';
import { Box, Paper, Typography, Alert } from '@mui/material';
import mermaid from 'mermaid';

// Initialize Mermaid
mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  securityLevel: 'loose',
  fontFamily: 'arial',
  fontSize: 12,
  flowchart: {
    useMaxWidth: true,
    htmlLabels: true,
    curve: 'basis'
  }
});

const MermaidDiagram = ({ 
  definition, 
  title = "Diagram", 
  error = null,
  height = "400px" 
}) => {
  const diagramRef = useRef(null);
  const [diagramError, setDiagramError] = React.useState(null);

  useEffect(() => {
    if (!definition || !diagramRef.current) return;

    const renderDiagram = async () => {
      try {
        setDiagramError(null);
        
        // Clear previous diagram
        diagramRef.current.innerHTML = '';
        
        // Generate unique ID for this diagram
        const diagramId = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // Validate and render
        // Pre-validate: try parsing to catch syntax errors early
        try {
          await mermaid.parse(definition);
        } catch (parseErr) {
          throw new Error(parseErr?.str || parseErr?.message || 'Mermaid parse error');
        }

        const { svg } = await mermaid.render(diagramId, definition);
        diagramRef.current.innerHTML = svg;
        
      } catch (err) {
        console.error('Mermaid rendering error:', err);
        setDiagramError(err.message || 'Failed to render diagram');
        
        // Check if it's a syntax error and provide helpful fallback
        const isParsError = err.message && err.message.includes('Parse error');
        const fallbackMessage = isParsError 
          ? 'Invalid diagram syntax detected. Displaying placeholder instead.'
          : 'Failed to render diagram. Please try again.';
        
        // Create a simple fallback diagram
        const fallbackDiagram = isParsError 
          ? `graph TD
              A["⚠️ Syntax Error"] --> B["Diagram contains invalid characters"]
              B --> C["Please upload a different project"]
              classDef error fill:#ff6b6b,stroke:#c92a2a,color:#fff
              class A,B,C error`
          : 'graph TD\n    A[Error] --> B[Please refresh]';
        
        try {
          // Try to render fallback diagram
          const fallbackId = `fallback-${Date.now()}`;
          const { svg } = await mermaid.render(fallbackId, fallbackDiagram);
          diagramRef.current.innerHTML = svg;
        } catch (fallbackErr) {
          // If even fallback fails, show simple HTML
          diagramRef.current.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; height: 200px; color: #666; border: 2px dashed #ddd; border-radius: 8px;">
              <div style="text-align: center; padding: 20px;">
                <div style="font-size: 24px; margin-bottom: 10px;">⚠️</div>
                <div style="font-weight: bold; margin-bottom: 5px;">Diagram Render Error</div>
                <small style="color: #999;">${fallbackMessage}</small>
              </div>
            </div>
          `;
        }
      }
    };

    renderDiagram();
  }, [definition]);

  if (error) {
    return (
      <Paper sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        {title}
      </Typography>
      
      {diagramError && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Diagram Error: {diagramError}
        </Alert>
      )}

      <Box
        ref={diagramRef}
        sx={{
          minHeight: height,
          border: '1px solid #e0e0e0',
          borderRadius: 1,
          p: 2,
          backgroundColor: '#fafafa',
          overflow: 'auto',
          '& svg': {
            maxWidth: '100%',
            height: 'auto'
          }
        }}
      />
      
      {definition && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="caption" color="text.secondary">
            Nodes: {(definition.match(/\[|\(|\{/g) || []).length} | 
            Edges: {(definition.match(/-->|-.->|==>/g) || []).length}
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

export default MermaidDiagram; 