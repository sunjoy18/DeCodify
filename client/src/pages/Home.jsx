import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Container,
  Divider,
  Chip,
  CircularProgress,
} from "@mui/material";
import {
  Upload as UploadIcon,
  Chat as ChatIcon,
  AccountTree as DiagramIcon,
  Code as CodeIcon,
  GitHub as GitHubIcon,
  Speed as SpeedIcon,
  Security as SecurityIcon,
  Analytics as AnalyticsIcon,
  Folder as FolderIcon,
  Schedule as ScheduleIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const Home = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(false);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    setLoadingProjects(true);
    try {
      const response = await axios.get(
        `${
          import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api"
        }/upload/projects`
      );
      setProjects(response.data.projects || []);
    } catch (error) {
      console.error("Failed to load projects:", error);
      setProjects([]);
    } finally {
      setLoadingProjects(false);
    }
  };

  const features = [
    {
      icon: <UploadIcon sx={{ fontSize: 40 }} />,
      title: "Project Ingestion",
      description:
        "Upload ZIP files or clone GitHub repositories to analyze your codebase",
      color: "#2196f3",
    },
    {
      icon: <CodeIcon sx={{ fontSize: 40 }} />,
      title: "AST Parsing",
      description:
        "Parse JavaScript, TypeScript, HTML, CSS, and Vue files with detailed analysis",
      color: "#4caf50",
    },
    {
      icon: <DiagramIcon sx={{ fontSize: 40 }} />,
      title: "Dependency Graphs",
      description:
        "Generate beautiful Mermaid diagrams showing file relationships and component hierarchy",
      color: "#ff9800",
    },
    {
      icon: <ChatIcon sx={{ fontSize: 40 }} />,
      title: "AI Chat",
      description:
        "Ask questions about your codebase with GPT-4 powered semantic search",
      color: "#9c27b0",
    },
    {
      icon: <AnalyticsIcon sx={{ fontSize: 40 }} />,
      title: "Code Analysis",
      description:
        "Get insights on complexity, functions, components, and potential issues",
      color: "#f44336",
    },
    {
      icon: <SecurityIcon sx={{ fontSize: 40 }} />,
      title: "Secure & Fast",
      description:
        "Rate-limited APIs, secure uploads, and optimized performance",
      color: "#607d8b",
    },
  ];

  const steps = [
    "Upload your project files or provide a GitHub URL",
    "Wait for AST parsing and analysis to complete",
    "Explore dependency graphs and code structure",
    "Chat with AI about your codebase",
    "Get detailed analytics and insights",
  ];

  return (
    <Container maxWidth="xl" sx={{  }}>
      {/* Hero Section */}
      <Box textAlign="center" mb={6}>
        <Typography variant="h2" component="h1" gutterBottom fontWeight="bold">
          DeCodify Agent
        </Typography>
        <Typography variant="h5" color="text.secondary" gutterBottom>
          AI-Powered Frontend Codebase Explainer
        </Typography>
        <Typography variant="body1" sx={{ maxWidth: 600, mx: "auto", mb: 2 }}>
          Upload your project and get instant insights with AST parsing,
          dependency graphs, and AI-powered code analysis. Perfect for
          understanding complex codebases.
        </Typography>
        <Box
          sx={{
            display: "flex",
            gap: 2,
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <Button
            variant="contained"
            size="large"
            startIcon={<UploadIcon />}
            onClick={() => navigate("/upload")}
            sx={{ px: 4, py: 1.5 }}
          >
            Get Started
          </Button>
          <Button
            variant="outlined"
            size="large"
            startIcon={<GitHubIcon />}
            href="https://github.com"
            target="_blank"
            sx={{ px: 4, py: 1.5 }}
          >
            View on GitHub
          </Button>
        </Box>
      </Box>

      {/* Recent Projects */}
      {projects.length > 0 && (
        <>
          <Typography variant="h4" gutterBottom mb={3}>
            Recent Projects
          </Typography>
          <Paper sx={{ p: 3, mb: 6 }}>
            {loadingProjects ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
                <CircularProgress />
              </Box>
            ) : (
              <Grid container spacing={2}>
                {projects.slice(0, 6).map((project) => (
                  <Grid item xs={12} sm={6} md={4} key={project.id}>
                    <Card
                      sx={{
                        cursor: "pointer",
                        transition: "transform 0.2s, box-shadow 0.2s",
                        "&:hover": {
                          transform: "translateY(-2px)",
                          boxShadow: 3,
                        },
                      }}
                      onClick={() => navigate(`/project/${project.id}`)}
                    >
                      <CardContent>
                        <Box
                          sx={{ display: "flex", alignItems: "center", mb: 2 }}
                        >
                          <FolderIcon sx={{ mr: 1, color: "primary.main" }} />
                          <Typography variant="h6" noWrap>
                            {project.name || "Unnamed Project"}
                          </Typography>
                        </Box>
                        <Box
                          sx={{
                            display: "flex",
                            gap: 1,
                            mb: 2,
                            flexWrap: "wrap",
                          }}
                        >
                          <Chip
                            size="small"
                            label={`${project.fileCount || 0} files`}
                          />
                        </Box>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            color: "text.secondary",
                          }}
                        >
                          <ScheduleIcon sx={{ fontSize: 16, mr: 0.5 }} />
                          <Typography variant="caption">
                            {project.uploadedAt
                              ? new Date(
                                  project.uploadedAt
                                ).toLocaleDateString()
                              : "Unknown date"}
                          </Typography>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
                {projects.length > 6 && (
                  <Grid item xs={12}>
                    <Button
                      variant="outlined"
                      onClick={() => navigate("/projects")}
                      sx={{ mt: 2 }}
                    >
                      View All Projects ({projects.length})
                    </Button>
                  </Grid>
                )}
              </Grid>
            )}
          </Paper>
          <Divider sx={{ mb: 6 }} />
        </>
      )}

      {/* Features Grid */}
      <Typography variant="h3" textAlign="center" gutterBottom mb={4}>
        Features
      </Typography>
      <Grid container spacing={3} mb={6}>
        {features.map((feature, index) => (
          <Grid item xs={12} md={6} lg={4} key={index}>
            <Card
              sx={{
                height: "100%",
                transition: "transform 0.2s, box-shadow 0.2s",
                "&:hover": {
                  transform: "translateY(-4px)",
                  boxShadow: 4,
                },
              }}
            >
              <CardContent sx={{ textAlign: "center", p: 3 }}>
                <Box sx={{ color: feature.color, mb: 2 }}>{feature.icon}</Box>
                <Typography variant="h6" gutterBottom fontWeight="bold">
                  {feature.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {feature.description}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* How It Works */}
      <Grid container spacing={4} alignItems="center">
        <Grid item xs={12} md={6}>
          <Typography variant="h4" gutterBottom fontWeight="bold">
            How It Works
          </Typography>
          <Typography variant="body1" color="text.secondary" mb={3}>
            Get comprehensive insights into your frontend codebase in just a few
            simple steps.
          </Typography>
          <Paper elevation={1} sx={{ p: 2 }}>
            <List>
              {steps.map((step, index) => (
                <ListItem key={index} sx={{ py: 1 }}>
                  <ListItemIcon>
                    <Box
                      sx={{
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        bgcolor: "primary.main",
                        color: "white",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: "bold",
                      }}
                    >
                      {index + 1}
                    </Box>
                  </ListItemIcon>
                  <ListItemText primary={step} />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper
            elevation={3}
            sx={{
              p: 4,
              bgcolor: "grey.200",
              textAlign: "center",
            }}
          >
            <SpeedIcon sx={{ fontSize: 60, color: "primary.main", mb: 2 }} />
            <Typography variant="h5" gutterBottom fontWeight="bold" color="grey.800">
              Fast & Accurate
            </Typography>
            <Typography variant="body1" color="text.secondary" mb={3}>
              Powered by advanced AST parsing and GPT-4 for deep code
              understanding
            </Typography>
            <Box
              sx={{ display: "flex", justifyContent: "space-around", mt: 3 }}
            >
              <Box>
                <Typography variant="h4" color="primary.main" fontWeight="bold">
                  5+
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  File Types
                </Typography>
              </Box>
              <Box>
                <Typography variant="h4" color="primary.main" fontWeight="bold">
                  50MB
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Max Upload
                </Typography>
              </Box>
              <Box>
                <Typography variant="h4" color="primary.main" fontWeight="bold">
                  1000+
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Files Supported
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* CTA Section */}
      <Box textAlign="center" mt={8} mb={4}>
        <Paper
          elevation={2}
          sx={{
            p: 6,
            color: "white",
            borderRadius: 2,
          }}
        >
          <Typography variant="h4" gutterBottom fontWeight="bold">
            Ready to Explore Your Code?
          </Typography>
          <Typography variant="body1" mb={4} sx={{ opacity: 0.9 }}>
            Upload your project and start getting insights in seconds
          </Typography>
          <Button
            variant="contained"
            size="large"
            onClick={() => navigate("/upload")}
            sx={{
              bgcolor: "white",
              px: 4,
              py: 1.5,
              "&:hover": {
                bgcolor: "grey.100",
              },
            }}
          >
            Upload Project Now
          </Button>
        </Paper>
      </Box>
    </Container>
  );
};

export default Home;
