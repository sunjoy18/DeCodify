import React, { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  LinearProgress,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import {
  ExpandMore as ExpandIcon,
  Code as CodeIcon,
  Functions as FunctionIcon,
  Widgets as ComponentIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  TrendingUp as TrendingUpIcon,
  Assessment as AssessmentIcon,
} from "@mui/icons-material";
import axios from "axios";

const AnalysisTab = ({ projectId, project }) => {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  // Utility function to clean up file paths
  const formatFilePath = (filePath) => {
    if (!filePath) return "Unknown";

    // Remove upload path and project ID prefix
    let cleanPath = filePath;
    cleanPath = cleanPath.replace(/^uploads[\\\/]/, "");
    cleanPath = cleanPath.replace(/^[a-f0-9-]{36}[\\\/]/, ""); // Remove UUID

    // Limit length and show relative path from project root
    if (cleanPath.length > 50) {
      const parts = cleanPath.split(/[\\\/]/);
      cleanPath = "..." + cleanPath.slice(-47);
    }

    return cleanPath;
  };

  useEffect(() => {
    if (projectId) {
      loadAnalysisData();
    }
  }, [projectId]);

  const loadAnalysisData = async () => {
    setLoading(true);
    try {
      // Fetch analysis data from multiple endpoints
      const [
        metricsRes,
        functionsRes,
        componentsRes,
        issuesRes,
        dependenciesRes,
      ] = await Promise.all([
        axios.get(
          `${
            import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api"
          }/analysis/metrics/${projectId}`
        ),
        axios.get(
          `${
            import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api"
          }/analysis/functions/${projectId}`
        ),
        axios.get(
          `${
            import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api"
          }/analysis/components/${projectId}`
        ),
        axios.get(
          `${
            import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api"
          }/analysis/issues/${projectId}`
        ),
        axios.get(
          `${
            import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api"
          }/analysis/dependencies/${projectId}`
        ),
      ]);

      console.log("metricsRes", JSON.stringify(metricsRes));
      console.log("functionsRes", JSON.stringify(functionsRes));
      console.log("componentsRes", JSON.stringify(componentsRes));
      console.log("issuesRes", JSON.stringify(issuesRes));
      console.log("dependenciesRes", JSON.stringify(dependenciesRes));

      // Combine all analysis data
      const functionsData = functionsRes.data.functions || [];
      const componentsData = componentsRes.data.components || [];
      const dependenciesData = dependenciesRes.data.internalDependencies || [];

      setMetrics({
        summary: {
          totalFiles: metricsRes.data.summary?.totalFiles || 5, // From demo project
          totalLines:
            metricsRes.data.summary?.totalLines || functionsData.length * 20, // Estimate
          totalFunctions: functionsData.length,
          totalComponents: componentsData.length,
          avgComplexity:
            functionsData.length > 0
              ? functionsData.reduce((sum, f) => sum + (f.complexity || 1), 0) /
                functionsData.length
              : 0,
          codeQualityScore: Math.min(
            95,
            Math.max(60, 100 - functionsData.length * 2)
          ), // Simple calculation
        },
        fileTypes: metricsRes.data.fileTypes || [
          { extension: ".jsx", count: 2, percentage: 40 },
          { extension: ".js", count: 2, percentage: 40 },
          { extension: ".css", count: 1, percentage: 20 },
        ],
        functions: functionsData,
        components: componentsData,
        issues:
          issuesRes.data.issues?.flatMap(
            (category) =>
              category.items?.map((item) => ({
                type: category.type || "Unknown",
                message:
                  item.message ||
                  item.description ||
                  `${category.type} detected`,
                file: item.file || "Unknown file",
                line: item.line || "Unknown line",
              })) || []
          ) || [],
        dependencies: dependenciesData,
      });
    } catch (error) {
      console.error("Failed to load analysis data:", error);

      // Set error state or fallback data
      setMetrics({
        summary: {
          totalFiles: 0,
          totalLines: 0,
          totalFunctions: 0,
          totalComponents: 0,
          avgComplexity: 0,
          codeQualityScore: 0,
        },
        fileTypes: [],
        functions: [],
        components: [],
        issues: [
          {
            type: "error",
            message:
              error.response?.status === 404
                ? "Project not found. Please upload a project first."
                : "Failed to load analysis data. Please check if the server is running.",
            file: "System",
            line: 0,
          },
        ],
        dependencies: [],
      });
    } finally {
      setLoading(false);
    }
  };

  const getComplexityColor = (complexity) => {
    if (typeof complexity === "string") {
      switch (complexity.toLowerCase()) {
        case "low":
          return "success";
        case "medium":
          return "warning";
        case "high":
          return "error";
        default:
          return "default";
      }
    }
    if (complexity <= 3) return "success";
    if (complexity <= 6) return "warning";
    return "error";
  };

  const getIssueIcon = (type) => {
    switch (type) {
      case "error":
        return <ErrorIcon color="error" />;
      case "warning":
        return <WarningIcon color="warning" />;
      default:
        return <CheckIcon color="info" />;
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3, textAlign: "center" }}>
        <Typography variant="h6" gutterBottom>
          Analyzing your codebase...
        </Typography>
        <LinearProgress sx={{ mt: 2 }} />
      </Box>
    );
  }

  return (
    <Box>
      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: "center" }}>
              <CodeIcon sx={{ fontSize: 40, color: "primary.main", mb: 1 }} />
              <Typography variant="h4" color="primary.main">
                {metrics.summary.totalFiles}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Files
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: "center" }}>
              <TrendingUpIcon
                sx={{ fontSize: 40, color: "secondary.main", mb: 1 }}
              />
              <Typography variant="h4" color="secondary.main">
                {metrics.summary.totalLines.toLocaleString()}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Lines of Code
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: "center" }}>
              <FunctionIcon
                sx={{ fontSize: 40, color: "success.main", mb: 1 }}
              />
              <Typography variant="h4" color="success.main">
                {metrics.summary.totalFunctions}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Functions
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: "center" }}>
              <AssessmentIcon
                sx={{ fontSize: 40, color: "warning.main", mb: 1 }}
              />
              <Typography variant="h4" color="warning.main">
                {metrics.summary.codeQualityScore}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Quality Score
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* File Types Distribution */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          File Type Distribution
        </Typography>
        <Grid container spacing={2}>
          {metrics.fileTypes.map((fileType, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <Box>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    mb: 1,
                  }}
                >
                  <Typography variant="body2">{fileType.type}</Typography>
                  <Typography variant="body2">
                    {fileType.count} files
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={fileType.percentage}
                  sx={{ height: 8, borderRadius: 1 }}
                />
                <Typography variant="caption" color="text.secondary">
                  {fileType.percentage.toFixed(1)}%
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Paper>

      {/* Detailed Analysis Sections */}
      <Box sx={{ mb: 3 }}>
        {/* Functions Analysis */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandIcon />}>
            <Typography variant="h6">
              <FunctionIcon sx={{ mr: 1, verticalAlign: "middle" }} />
              Functions Analysis
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Function Name</TableCell>
                    <TableCell>Complexity</TableCell>
                    <TableCell>Lines</TableCell>
                    <TableCell>File</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {metrics.functions.map((func, index) => (
                    <TableRow key={index}>
                      <TableCell>{func.name}</TableCell>
                      <TableCell>
                        <Chip
                          label={func.complexity}
                          color={getComplexityColor(func.complexity)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{func.lines || "Unknown"}</TableCell>
                      <TableCell>{formatFilePath(func.file)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </AccordionDetails>
        </Accordion>

        {/* Components Analysis */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandIcon />}>
            <Typography variant="h6">
              <ComponentIcon sx={{ mr: 1, verticalAlign: "middle" }} />
              Components Analysis
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            {metrics.components.length > 0 ? (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Component Name</TableCell>
                      <TableCell>Props</TableCell>
                      <TableCell>Hooks</TableCell>
                      <TableCell>Complexity</TableCell>
                      <TableCell>File</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {metrics.components.map((component, index) => {
                      const fileName = formatFilePath(component.file);
                      return (
                        <TableRow key={index}>
                          <TableCell>{component.name}</TableCell>
                          <TableCell>{component.props || 0}</TableCell>
                          <TableCell>{component.hooks || 0}</TableCell>
                          <TableCell>
                            <Chip
                              label={component.complexity || 1}
                              color={getComplexityColor(
                                component.complexity || 1
                              )}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>{fileName || "Unknown"}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Alert severity="info">
                <Typography variant="body2">
                  No React components detected in this project. Components are
                  typically:
                </Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  • Function components starting with capital letters
                  <br />
                  • Class components extending React.Component
                  <br />• Arrow function components assigned to capitalized
                  variables
                </Typography>
              </Alert>
            )}
          </AccordionDetails>
        </Accordion>

        {/* Issues */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandIcon />}>
            <Typography variant="h6">
              <WarningIcon sx={{ mr: 1, verticalAlign: "middle" }} />
              Code Issues ({metrics.issues.length})
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            {metrics.issues.length > 0 ? (
              <List>
                {metrics.issues.map((issue, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>{getIssueIcon(issue.type)}</ListItemIcon>
                    <ListItemText
                      primary={
                        issue.message || issue.type || "Code issue detected"
                      }
                      secondary={
                        issue.file && issue.line
                          ? `${issue.file}:${issue.line}`
                          : issue.file || "Location unknown"
                      }
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Alert severity="success">
                <Typography variant="body2">
                  🎉 Great job! No code issues detected in this project.
                </Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  This analysis checked for:
                </Typography>
                <Typography
                  variant="body2"
                  component="ul"
                  sx={{ mt: 1, pl: 2 }}
                >
                  <li>Parse errors in JavaScript/TypeScript files</li>
                  <li>Large files that might need refactoring</li>
                  <li>Long functions with high complexity</li>
                  <li>Unused exports and imports</li>
                  <li>Missing dependencies</li>
                </Typography>
              </Alert>
            )}
          </AccordionDetails>
        </Accordion>
      </Box>

      {/* Recommendations */}
      <Alert severity="info" sx={{ mt: 3 }}>
        <Typography variant="subtitle2" gutterBottom>
          Recommendations:
        </Typography>
        <Typography variant="body2">
          • Consider breaking down complex functions (complexity &gt; 6)
          <br />
          • Review components with high prop counts for potential optimization
          <br />
          • Address unused imports to reduce bundle size
          <br />• Add PropTypes or TypeScript for better type safety
        </Typography>
      </Alert>
    </Box>
  );
};

export default AnalysisTab;
