import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Container,
  Typography,
  Tabs,
  Tab,
  Paper,
  Alert,
  CircularProgress,
  Button,
  Chip,
  Grid,
  Card,
  CardContent,
} from "@mui/material";
import {
  Chat as ChatIcon,
  AccountTree as DiagramIcon,
  Analytics as AnalyticsIcon,
  ArrowBack as BackIcon,
  Folder as FolderIcon,
  Code as CodeIcon,
} from "@mui/icons-material";
import axios from "axios";

// Import tab components (we'll create basic versions)
import ChatTab from "../components/ChatTab";
import DiagramTab from "../components/DiagramTab";
import AnalysisTab from "../components/AnalysisTab";

const ProjectView = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [currentTab, setCurrentTab] = useState(0);
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (projectId) {
      loadProject();
    }
  }, [projectId]);

  const loadProject = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/upload/project/${projectId}`
      );
      setProject(response.data);
    } catch (err) {
      console.error("Failed to load project:", err);
      setError(err.response?.data?.error || "Failed to load project");
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, textAlign: "center" }}>
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Loading project...
        </Typography>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button
          variant="contained"
          startIcon={<BackIcon />}
          onClick={() => navigate("/upload")}
        >
          Back to Upload
        </Button>
      </Container>
    );
  }

  if (!project) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="warning" sx={{ mb: 2 }}>
          Project not found
        </Alert>
        <Button
          variant="contained"
          startIcon={<BackIcon />}
          onClick={() => navigate("/upload")}
        >
          Back to Upload
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Button
          startIcon={<BackIcon />}
          onClick={() => navigate("/upload")}
          sx={{ mb: 2 }}
        >
          Back to Upload
        </Button>

        <Typography variant="h4" gutterBottom fontWeight="bold">
          {project.name || "Project Analysis"}
        </Typography>

        {/* Project Stats */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item>
            <Chip
              icon={<FolderIcon />}
              label={`${project.fileCount || 0} Files`}
              color="primary"
              variant="outlined"
            />
          </Grid>
          {project.languages && (
            <Grid item>
              <Chip
                label={`Languages: ${project.languages.join(", ")}`}
                variant="outlined"
              />
            </Grid>
          )}
          {project.uploadedAt && (
            <Grid item>
              <Chip
                label={`Uploaded: ${new Date(
                  project.uploadedAt
                ).toLocaleDateString()}`}
                variant="outlined"
              />
            </Grid>
          )}
        </Grid>

        {project.description && (
          <Typography variant="body1" color="text.secondary">
            {project.description}
          </Typography>
        )}
      </Box>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={currentTab}
          onChange={handleTabChange}
          variant="fullWidth"
          sx={{ borderBottom: 1, borderColor: "divider" }}
        >
          <Tab
            icon={<ChatIcon />}
            label="AI Chat"
            iconPosition="start"
            sx={{ minHeight: 64 }}
          />
          <Tab
            icon={<DiagramIcon />}
            label="Diagrams"
            iconPosition="start"
            sx={{ minHeight: 64 }}
          />
          <Tab
            icon={<AnalyticsIcon />}
            label="Analysis"
            iconPosition="start"
            sx={{ minHeight: 64 }}
          />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      <Box sx={{ minHeight: "60vh" }}>
        {currentTab === 0 && (
          <ChatTab projectId={projectId} project={project} />
        )}
        {currentTab === 1 && (
          <DiagramTab projectId={projectId} project={project} />
        )}
        {currentTab === 2 && (
          <AnalysisTab projectId={projectId} project={project} />
        )}
      </Box>
    </Container>
  );
};

export default ProjectView;
