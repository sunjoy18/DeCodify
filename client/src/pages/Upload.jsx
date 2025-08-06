import React, { useState, useCallback } from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Card,
  CardContent,
  Grid,
  Container,
  LinearProgress,
  Select,
  MenuItem,
} from "@mui/material";
import {
  CloudUpload as UploadIcon,
  GitHub as GitHubIcon,
  FolderZip as ZipIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  InsertDriveFile as FileIcon,
} from "@mui/icons-material";
import { useDropzone } from "react-dropzone";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const Upload = () => {
  const navigate = useNavigate();
  const [githubUrl, setGithubUrl] = useState("");
  const [branch, setBranch] = useState("main");
  const [customBranch, setCustomBranch] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState([]);

  const onDrop = useCallback(
    async (acceptedFiles) => {
      if (acceptedFiles.length === 0) return;

      const file = acceptedFiles[0];

      // Validate file type
      if (!file.name.endsWith(".zip")) {
        setError("Please upload a ZIP file containing your project");
        return;
      }

      // Validate file size (50MB limit)
      if (file.size > 50 * 1024 * 1024) {
        setError("File size must be less than 50MB");
        return;
      }

      setError("");
      setIsUploading(true);
      setUploadProgress(0);

      try {
        const formData = new FormData();
        formData.append("projectZip", file);

        const response = await axios.post(
          `${import.meta.env.VITE_API_BASE_URL}/upload/folder`,
          formData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
            onUploadProgress: (progressEvent) => {
              const progress = Math.round(
                (progressEvent.loaded * 100) / progressEvent.total
              );
              setUploadProgress(progress);
            },
          }
        );

        setSuccess("Project uploaded and analyzed successfully!");
        setUploadedFiles(response.data.files || []);

        // Navigate to project view after short delay
        setTimeout(() => {
          navigate(`/project/${response.data.projectId}`);
        }, 1500);
      } catch (err) {
        console.error("Upload error:", err);
        setError(err.response?.data?.error || "Failed to upload project");
      } finally {
        setIsUploading(false);
        setUploadProgress(0);
      }
    },
    [navigate]
  );

  const handleGithubUpload = async () => {
    if (!githubUrl.trim()) {
      setError("Please enter a valid GitHub URL");
      return;
    }

    // Basic GitHub URL validation
    const githubPattern = /^https:\/\/github\.com\/[\w\-\.]+\/[\w\-\.]+\/?$/;
    if (!githubPattern.test(githubUrl.trim())) {
      setError(
        "Please enter a valid GitHub repository URL (e.g., https://github.com/user/repo)"
      );
      return;
    }

    setError("");
    setIsUploading(true);
    setUploadProgress(0);

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/upload/github`,
        { githubUrl: githubUrl.trim(), branch, customBranch },
        {
          onUploadProgress: (progressEvent) => {
            const progress = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            setUploadProgress(progress);
          },
        }
      );

      setSuccess("GitHub repository cloned and analyzed successfully!");
      setUploadedFiles(response.data.files || []);

      // Navigate to project view after short delay
      setTimeout(() => {
        navigate(`/project/${response.data.projectId}`);
      }, 1500);
    } catch (err) {
      console.error("GitHub clone error:", err);
      setError(
        err.response?.data?.error || "Failed to clone GitHub repository"
      );
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/zip": [".zip"],
    },
    multiple: false,
    disabled: isUploading,
  });

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography
        variant="h3"
        textAlign="center"
        gutterBottom
        fontWeight="bold"
      >
        Upload Your Project
      </Typography>
      <Typography
        variant="body1"
        textAlign="center"
        color="text.secondary"
        mb={4}
      >
        Choose how you'd like to upload your frontend project for analysis
      </Typography>

      <Grid container spacing={4}>
        {/* File Upload Section */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: "100%" }}>
            <CardContent sx={{ p: 3 }}>
              <Box textAlign="center" mb={3}>
                <ZipIcon sx={{ fontSize: 48, color: "primary.main", mb: 1 }} />
                <Typography variant="h5" gutterBottom fontWeight="bold">
                  Upload ZIP File
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Upload a ZIP file containing your project
                </Typography>
              </Box>

              <Paper
                {...getRootProps()}
                sx={{
                  p: 4,
                  border: "2px dashed",
                  borderColor: isDragActive ? "primary.main" : "grey.300",
                  bgcolor: isDragActive ? "primary.50" : "transparent",
                  cursor: isUploading ? "not-allowed" : "pointer",
                  transition: "all 0.2s ease",
                  textAlign: "center",
                  "&:hover": {
                    borderColor: isUploading ? "grey.300" : "primary.main",
                    bgcolor: isUploading ? "transparent" : "primary.50",
                  },
                }}
              >
                <input {...getInputProps()} />
                <UploadIcon
                  sx={{ fontSize: 48, color: "primary.main", mb: 2 }}
                />

                {isUploading ? (
                  <Box>
                    <Typography variant="body1" gutterBottom>
                      Uploading and analyzing...
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={uploadProgress}
                      sx={{ mt: 2, mb: 1 }}
                    />
                    <Typography variant="body2" color="text.secondary">
                      {uploadProgress}% complete
                    </Typography>
                  </Box>
                ) : (
                  <Box>
                    <Typography variant="body1" gutterBottom>
                      {isDragActive
                        ? "Drop the ZIP file here..."
                        : "Drag & drop a ZIP file here, or click to select"}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Maximum file size: 50MB
                    </Typography>
                  </Box>
                )}
              </Paper>

              <Typography
                variant="caption"
                display="block"
                mt={2}
                color="text.secondary"
              >
                Supported file types: .js, .jsx, .ts, .tsx, .html, .css, .vue,
                .json
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* GitHub Upload Section */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: "100%" }}>
            <CardContent sx={{ p: 3 }}>
              <Box textAlign="center" mb={3}>
                <GitHubIcon
                  sx={{ fontSize: 48, color: "primary.main", mb: 1 }}
                />
                <Typography variant="h5" gutterBottom fontWeight="bold">
                  Clone from GitHub
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Enter a GitHub repository URL to clone and analyze
                </Typography>
              </Box>

              <TextField
                fullWidth
                label="GitHub Repository URL"
                placeholder="https://github.com/username/repository"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                disabled={isUploading}
                sx={{ mb: 3 }}
                helperText="Public repositories only (private repos require GitHub token)"
              />

              {/* Branch */}
              {/* a dropdown with the branches of the repo also custom input allowed */}
              <Select
                fullWidth
                label="Branch"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                disabled={isUploading}
                size="small"
                sx={{ mb: 3 }}
              >
                <MenuItem value="main">main</MenuItem>
                <MenuItem value="master">master</MenuItem>
                <MenuItem value="dev">dev</MenuItem>
                <MenuItem value="test">test</MenuItem>
                <MenuItem value="staging">staging</MenuItem>
                <MenuItem value="production">production</MenuItem>
                <MenuItem value="custom">custom</MenuItem>
              </Select>

              {branch === "custom" && (
                <TextField
                  id="custom-branch"
                  fullWidth
                  label="Branch"
                  placeholder="main"
                  value={customBranch}
                  onChange={(e) => setCustomBranch(e.target.value)}
                  disabled={isUploading}
                  size="small"
                  sx={{ mb: 3 }}
                />
              )}

              <Button
                fullWidth
                variant="contained"
                onClick={handleGithubUpload}
                disabled={isUploading || !githubUrl.trim()}
                startIcon={
                  isUploading ? <CircularProgress size={20} /> : <GitHubIcon />
                }
                sx={{ py: 1.5 }}
              >
                {isUploading ? "Cloning Repository..." : "Clone Repository"}
              </Button>

              {isUploading && (
                <Box mt={2}>
                  <LinearProgress
                    variant="determinate"
                    value={uploadProgress}
                    sx={{ mb: 1 }}
                  />
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    textAlign="center"
                  >
                    {uploadProgress}% complete
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Status Messages */}
      {error && (
        <Alert
          severity="error"
          sx={{ mt: 3 }}
          icon={<ErrorIcon />}
          onClose={() => setError("")}
        >
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mt: 3 }} icon={<CheckIcon />}>
          {success}
        </Alert>
      )}

      {/* Uploaded Files List */}
      {uploadedFiles.length > 0 && (
        <Paper sx={{ mt: 3, p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Analyzed Files ({uploadedFiles.length})
          </Typography>
          <List dense>
            {uploadedFiles.slice(0, 10).map((file, index) => (
              <ListItem key={index}>
                <ListItemIcon>
                  <FileIcon />
                </ListItemIcon>
                <ListItemText primary={file.path || file.name} />
              </ListItem>
            ))}
            {uploadedFiles.length > 10 && (
              <ListItem>
                <ListItemText
                  primary={`... and ${uploadedFiles.length - 10} more files`}
                  sx={{ fontStyle: "italic", color: "text.secondary" }}
                />
              </ListItem>
            )}
          </List>
        </Paper>
      )}

      {/* Information Section */}
      <Paper sx={{ mt: 4, p: 3, bgcolor: "grey.50" }}>
        <Typography variant="h6" gutterBottom>
          What happens after upload?
        </Typography>
        <List dense>
          <ListItem>
            <ListItemIcon>
              <CheckIcon color="primary" />
            </ListItemIcon>
            <ListItemText primary="Files are parsed using AST (Abstract Syntax Tree) analysis" />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <CheckIcon color="primary" />
            </ListItemIcon>
            <ListItemText primary="Dependencies and relationships are mapped" />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <CheckIcon color="primary" />
            </ListItemIcon>
            <ListItemText primary="Code is chunked and embedded for AI-powered search" />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <CheckIcon color="primary" />
            </ListItemIcon>
            <ListItemText primary="Interactive diagrams and analytics are generated" />
          </ListItem>
        </List>
      </Paper>
    </Container>
  );
};

export default Upload;
