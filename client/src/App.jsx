import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Box, AppBar, Toolbar, Typography, Container } from '@mui/material';
import Home from './pages/Home';
import ProjectView from './pages/ProjectView';
import Upload from './pages/Upload';
import Projects from './pages/Projects';
import Navbar from './components/Navbar';
import ErrorBoundary from './components/ErrorBoundary';

function App() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* <AppBar position="static" elevation={1}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            DeCodify Agent
          </Typography>
          <Typography variant="subtitle2" sx={{ opacity: 0.8 }}>
            AI-Powered Code Analysis
          </Typography>
        </Toolbar>
      </AppBar> */}

      <Navbar />

      <Container 
        maxWidth={false} 
        sx={{ 
          flexGrow: 1, 
          display: 'flex', 
          flexDirection: 'column',
          py: 2,
          px: { xs: 1, sm: 3 }
        }}
      >
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/upload" element={<Upload />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/project/:projectId" element={<ProjectView />} />
            <Route path="/project/:projectId/chat" element={<ProjectView tab="chat" />} />
            <Route path="/project/:projectId/diagrams" element={<ProjectView tab="diagrams" />} />
            <Route path="/project/:projectId/analysis" element={<ProjectView tab="analysis" />} />
          </Routes>
        </ErrorBoundary>
      </Container>

      <Box
        component="footer"
        sx={{
          py: 2,
          px: 3,
          mt: 'auto',
          borderTop: 1,
          borderColor: 'divider',
          backgroundColor: 'background.paper',
          backdropFilter: 'blur(8px) saturate(120%)'
        }}
      >
        <Typography variant="body2" color="text.secondary" align="center">
          DeCodify Agent - Frontend Codebase Explainer with AST Parsing & AI
        </Typography>
      </Box>
    </Box>
  );
}

export default App; 