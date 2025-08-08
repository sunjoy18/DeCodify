import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Card,
  CardContent,
  CardActions,
  Button,
  Grid,
  Chip,
  IconButton,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  InputAdornment
} from '@mui/material';
import {
  FolderOpen as ProjectIcon,
  Code as CodeIcon,
  Timeline as AnalyticsIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  CalendarToday as DateIcon,
  Storage as SizeIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const Projects = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteDialog, setDeleteDialog] = useState({ open: false, projectId: null, projectName: '' });

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/upload/projects`);
      setProjects(response.data.projects || []);
      setError('');
    } catch (err) {
      console.error('Failed to load projects:', err);
      setError('Failed to load projects. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProject = async (projectId) => {
    try {
      await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/upload/project/${projectId}`);
      setProjects(projects.filter(p => p.id !== projectId));
      setDeleteDialog({ open: false, projectId: null, projectName: '' });
    } catch (err) {
      console.error('Failed to delete project:', err);
      setError('Failed to delete project. Please try again.');
    }
  };

  const formatFileName = (fileName) => {
    if (!fileName) return 'Unknown Project';
    
    // Remove upload path and project ID prefix
    let cleanName = fileName;
    
    // Remove uploads/ and project ID pattern
    cleanName = cleanName.replace(/^uploads[\\\/]/, '');
    cleanName = cleanName.replace(/^[a-f0-9-]{36}[\\\/]/, ''); // Remove UUID
    
    // If it's still a path, take the last meaningful part
    const parts = cleanName.split(/[\\\/]/);
    if (parts.length > 1) {
      // Take the second-to-last part (usually project name) if available
      cleanName = parts[parts.length - 2] || parts[parts.length - 1];
    }
    
    // Remove file extensions
    cleanName = cleanName.replace(/\.(zip|tar|gz)$/i, '');
    
    // Capitalize and clean up
    return cleanName.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'Unknown';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getFileExtension = (fileName) => {
    if (!fileName) return '';
    const ext = fileName.split('.').pop()?.toLowerCase();
    return ext || '';
  };

  const getLanguageChips = (project) => {
    const languages = [];
    
    // Extract from file types or analyze from name
    if (project.fileTypes) {
      project.fileTypes.forEach(type => {
        if (type.includes('js')) languages.push('JavaScript');
        if (type.includes('jsx')) languages.push('React');
        if (type.includes('ts')) languages.push('TypeScript');
        if (type.includes('css')) languages.push('CSS');
        if (type.includes('html')) languages.push('HTML');
        if (type.includes('vue')) languages.push('Vue');
      });
    } else {
      // Fallback based on project name or common patterns
      const name = formatFileName(project.fileName).toLowerCase();
      if (name.includes('react') || name.includes('jsx')) languages.push('React');
      else if (name.includes('vue')) languages.push('Vue');
      else if (name.includes('angular')) languages.push('Angular');
      else languages.push('JavaScript');
    }
    
    return [...new Set(languages)]; // Remove duplicates
  };

  const filteredProjects = projects.filter(project =>
    formatFileName(project.fileName).toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <ProjectIcon sx={{ mr: 2, color: 'primary.main' }} />
        My Projects
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Search and Actions */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <TextField
          placeholder="Search projects..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ maxWidth: 400 }}
        />
        
        <Button
          variant="contained"
          startIcon={<CodeIcon />}
          onClick={() => navigate('/upload')}
        >
          Upload New Project
        </Button>
      </Box>

      {/* Projects Grid */}
      {filteredProjects.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <ProjectIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {searchTerm ? 'No projects found matching your search' : 'No projects uploaded yet'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {searchTerm 
              ? 'Try a different search term or upload a new project'
              : 'Upload your first project to get started with AI-powered code analysis'
            }
          </Typography>
          <Button
            variant="contained"
            startIcon={<CodeIcon />}
            onClick={() => navigate('/upload')}
          >
            Upload Project
          </Button>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {filteredProjects.map((project) => (
            <Grid item xs={12} md={6} lg={4} key={project.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Typography variant="h6" component="h2" sx={{ flexGrow: 1, mr: 1 }}>
                      {formatFileName(project.name)}
                    </Typography>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => setDeleteDialog({
                        open: true,
                        projectId: project.id,
                        projectName: formatFileName(project.fileName)
                      })}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>

                  {/* Language Tags */}
                  <Box sx={{ mb: 2 }}>
                    {getLanguageChips(project).map((lang) => (
                      <Chip
                        key={lang}
                        label={lang}
                        size="small"
                        sx={{ mr: 1, mb: 1 }}
                        color="primary"
                        variant="outlined"
                      />
                    ))}
                  </Box>

                  {/* Project Stats */}
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <DateIcon sx={{ fontSize: 16, mr: 1 }} />
                      {formatDate(project.uploadedAt)}
                    </Typography>
                    
                    {project.size && (
                      <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
                        <SizeIcon sx={{ fontSize: 16, mr: 1 }} />
                        {formatFileSize(project.size)}
                      </Typography>
                    )}
                  </Box>

                  {/* Project Metrics */}
                  {project.metrics && (
                    <Box sx={{ bgcolor: 'grey.50', p: 1.5, borderRadius: 1 }}>
                      <Grid container spacing={2}>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">Files</Typography>
                          <Typography variant="body2" fontWeight="bold">
                            {project.metrics.totalFiles || 0}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">Functions</Typography>
                          <Typography variant="body2" fontWeight="bold">
                            {project.metrics.totalFunctions || 0}
                          </Typography>
                        </Grid>
                      </Grid>
                    </Box>
                  )}
                </CardContent>

                <CardActions>
                  <Button
                    size="small"
                    startIcon={<AnalyticsIcon />}
                    onClick={() => navigate(`/project/${project.id}`)}
                    fullWidth
                    variant="contained"
                  >
                    Analyze Project
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, projectId: null, projectName: '' })}
      >
        <DialogTitle>Delete Project</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{deleteDialog.projectName}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, projectId: null, projectName: '' })}>
            Cancel
          </Button>
          <Button 
            onClick={() => handleDeleteProject(deleteDialog.projectId)}
            color="error"
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Projects; 