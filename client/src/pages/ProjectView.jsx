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
  FolderOpen as CodebaseIcon,
} from "@mui/icons-material";
import axios from "axios";

// Import tab components
import ChatTab from "../components/ChatTab";
import DiagramTab from "../components/DiagramTab";
import AnalysisTab from "../components/AnalysisTab";
import CodebaseTab from "../components/CodebaseTab";

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
      <Container maxWidth="xl" sx={{ textAlign: "center" }}>
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Loading project...
        </Typography>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="xl">
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
      <Container maxWidth="xl" sx={{ px: 0 }}>
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
    <Container maxWidth="xl" sx={{ py: 1, px: 0 }}>
      {/* Header */}
      <Box sx={{ mb: 2 }}>
        <Button startIcon={<BackIcon />} onClick={() => navigate("/upload")}>
          Back to Upload
        </Button>

        <Typography variant="h6" gutterBottom fontWeight="bold">
          {project.name || "Project Analysis"}
        </Typography>
      </Box>

      {/* Tabs */}
      <Paper sx={{ mb: 1 }}>
        <Tabs
          value={currentTab}
          onChange={handleTabChange}
          variant="fullWidth"
          sx={{
            borderBottom: 1,
            borderColor: "divider",
            minHeight: 40, // reduce Tabs container height
          }}
        >
          <Tab
            icon={<CodebaseIcon />}
            label="Codebase"
            iconPosition="start"
            sx={{
              minHeight: 40, // reduce height
              p: 0.5, // reduce padding
              fontSize: "0.8rem", // smaller text
              textTransform: "none",
            }}
          />
          <Tab
            icon={<ChatIcon />}
            label="AI Chat"
            iconPosition="start"
            sx={{
              minHeight: 40,
              p: 0.5,
              fontSize: "0.8rem",
              textTransform: "none",
            }}
          />
          <Tab
            icon={<DiagramIcon />}
            label="Diagrams"
            iconPosition="start"
            sx={{
              minHeight: 40,
              p: 0.5,
              fontSize: "0.8rem",
              textTransform: "none",
            }}
          />
          <Tab
            icon={<AnalyticsIcon />}
            label="Analysis"
            iconPosition="start"
            sx={{
              minHeight: 40,
              p: 0.5,
              fontSize: "0.8rem",
              textTransform: "none",
            }}
          />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      <Box sx={{ minHeight: "60vh" }}>
        {currentTab === 0 && (
          <CodebaseTab projectId={projectId} project={project} />
        )}
        {currentTab === 1 && (
          <ChatTab projectId={projectId} project={project} />
        )}
        {currentTab === 2 && (
          <DiagramTab projectId={projectId} project={project} />
        )}
        {currentTab === 3 && (
          <AnalysisTab projectId={projectId} project={project} />
        )}
      </Box>
    </Container>
  );
};

export default ProjectView;
