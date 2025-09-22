import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  ButtonGroup,
  Alert,
  CircularProgress,
  Card,
  CardContent
} from '@mui/material';
import {
  AccountTree as TreeIcon,
  Widgets as ComponentIcon,
  Functions as FunctionIcon,
  Class as ClassIcon
} from '@mui/icons-material';
import axios from 'axios';
import MermaidDiagram from './MermaidDiagram';

const DiagramTab = ({ projectId, project }) => {
  const [selectedDiagram, setSelectedDiagram] = useState('dependency');
  const [loading, setLoading] = useState(false);
  const [diagramData, setDiagramData] = useState('');

  const diagramTypes = [
    {
      key: 'dependency',
      label: 'Dependencies',
      icon: <TreeIcon />,
      description: 'File-level dependency relationships'
    },
    {
      key: 'components',
      label: 'Components',
      icon: <ComponentIcon />,
      description: 'React component hierarchy'
    },
    {
      key: 'functions',
      label: 'Functions',
      icon: <FunctionIcon />,
      description: 'Function call graph'
    },
    {
      key: 'classes',
      label: 'Classes',
      icon: <ClassIcon />,
      description: 'Class relationships'
    }
  ];

  const handleDiagramChange = async (diagramType) => {
    setSelectedDiagram(diagramType);
    setLoading(true);
    
    try {
      // Map frontend diagram types to backend endpoints
      const endpointMap = {
        dependency: 'dependency',
        components: 'components', 
        functions: 'functions',
        classes: 'classes'
      };
      
      const endpoint = endpointMap[diagramType] || 'dependency';
      
      // Make real API call to backend
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}/flowchart/${endpoint}/${projectId}`,
        {
          timeout: 15000 // 15 second timeout
        }
      );
      
      if (response.data.success && response.data.mermaidDSL) {
        setDiagramData(response.data.mermaidDSL);
      } else {
        throw new Error('Invalid response format');
      }
      
    } catch (error) {
      console.error('Failed to load diagram:', error);
      
      // Fallback to sample diagram with error indication
      let errorMessage = '%%{init: {"theme": "base", "themeVariables": {"primaryColor": "#ff6b6b"}}}%%\n';
      
      if (error.response?.status === 404) {
        errorMessage += `graph TD
    A[Project Not Found] --> B[Please upload a project first]
    B --> C[Then try generating diagrams]
    
    classDef error fill:#ff6b6b,stroke:#c92a2a,color:#fff
    class A,B,C error`;
      } else if (error.code === 'ECONNABORTED') {
        errorMessage += `graph TD
    A[Request Timeout] --> B[Diagram generation took too long]
    B --> C[Try with a smaller project]
    
    classDef warning fill:#ffa726,stroke:#f57400,color:#fff
    class A,B,C warning`;
      } else {
        // Provide diagram-specific error messages
        const diagramMessages = {
          components: {
            title: 'No Components Found',
            message: 'This project does not contain React/Vue components',
            suggestion: 'Upload a project with .jsx, .vue, or component files'
          },
          functions: {
            title: 'Function Analysis Failed',
            message: 'Unable to analyze JavaScript/TypeScript functions',
            suggestion: 'Ensure project contains valid JS/TS files'
          },
          classes: {
            title: 'No Classes Found',
            message: 'This project does not contain class definitions',
            suggestion: 'Upload a project with ES6 classes or OOP code'
          },
          dependency: {
            title: 'Dependency Analysis Failed',
            message: 'Unable to analyze file dependencies',
            suggestion: 'Check if project contains valid import/require statements'
          }
        };
        
        const diagInfo = diagramMessages[diagramType] || diagramMessages.dependency;
        
        errorMessage += `graph TD
    A["⚠️ ${diagInfo.title}"] --> B["${diagInfo.message}"]
    B --> C["${diagInfo.suggestion}"]
    
    classDef error fill:#ff6b6b,stroke:#c92a2a,color:#fff
    class A,B,C error`;
      }
      
      setDiagramData(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Load default diagram on mount
  React.useEffect(() => {
    handleDiagramChange('dependency');
  }, []);

  return (
    <Box>
      {/* Diagram Type Selector */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          Visualize Your Codebase
        </Typography>
        <ButtonGroup variant="outlined" sx={{ flexWrap: 'wrap' }}>
          {diagramTypes.map((type) => (
            <Button
              key={type.key}
              variant={selectedDiagram === type.key ? 'contained' : 'outlined'}
              startIcon={type.icon}
              onClick={() => handleDiagramChange(type.key)}
              disabled={loading}
              sx={{ mb: { xs: 1, sm: 0 } }}
            >
              {type.label}
            </Button>
          ))}
        </ButtonGroup>
        
        {/* Description */}
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          {diagramTypes.find(type => type.key === selectedDiagram)?.description}
        </Typography>
      </Paper>

      {/* Diagram Display */}
      <Paper sx={{ p: 2, minHeight: '500px', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 12px 40px rgba(0,0,0,0.5)', backdropFilter: 'blur(10px) saturate(120%)' }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
            <Box sx={{ textAlign: 'center' }}>
              <CircularProgress size={60} />
              <Typography variant="h6" sx={{ mt: 2 }}>
                Generating {diagramTypes.find(type => type.key === selectedDiagram)?.label} Diagram...
              </Typography>
            </Box>
          </Box>
        ) : diagramData ? (
          <MermaidDiagram definition={diagramData} />
        ) : (
          <Alert severity="info">
            No diagram data available. Upload a project first to generate visualizations.
          </Alert>
        )}
      </Paper>

      {/* Information Cards */}
      <Box sx={{ mt: 3, display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Interactive Features
            </Typography>
            <Typography variant="body2" color="text.secondary">
              • Click and drag to pan around large diagrams<br/>
              • Zoom in/out with mouse wheel<br/>
              • Hover over nodes for additional information<br/>
              • Export diagrams as SVG or PNG
            </Typography>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Diagram Types
            </Typography>
            <Typography variant="body2" color="text.secondary">
              • <strong>Dependencies:</strong> Shows how files import each other<br/>
              • <strong>Components:</strong> React component relationships<br/>
              • <strong>Functions:</strong> Function call hierarchy<br/>
              • <strong>Classes:</strong> OOP class structure and inheritance
            </Typography>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};

export default DiagramTab; 