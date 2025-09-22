import React, { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Typography,
  Breadcrumbs,
  Link,
  CircularProgress,
  Alert,
  Chip,
  IconButton,
  Tooltip,
} from "@mui/material";
import { TreeView, TreeItem } from "@mui/x-tree-view";
import {
  ExpandMore as ExpandMoreIcon,
  ChevronRight as ChevronRightIcon,
  Folder as FolderIcon,
  FolderOpen as FolderOpenIcon,
  InsertDriveFile as FileIcon,
  Code as CodeIcon,
  Image as ImageIcon,
  Description as DocumentIcon,
  Settings as ConfigIcon,
  ContentCopy as CopyIcon,
  Download as DownloadIcon,
} from "@mui/icons-material";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import axios from "axios";

const CodebaseTab = ({ projectId, project }) => {
  const [fileTree, setFileTree] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileContent, setFileContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [contentLoading, setContentLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedNodes, setExpandedNodes] = useState([]);

  useEffect(() => {
    if (projectId) {
      loadProjectFiles();
    }
  }, [projectId]);

  const loadProjectFiles = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${
          import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api"
        }/chat/files/${projectId}`
      );

      const files = response.data.files || [];
      const tree = buildFileTree(files);
      setFileTree(tree);
      setError(null);
    } catch (err) {
      console.error("Failed to load project files:", err);
      setError("Failed to load project files");
    } finally {
      setLoading(false);
    }
  };

  // Helper function to clean file paths for display
  const cleanFilePath = (filePath) => {
    // Normalize path separators first
    const normalizedPath = filePath.replace(/\\/g, "/");
    // Remove uploads/projectId/ prefix from file paths
    const uploadsPattern = /^uploads\/[^\/]+\//;
    return normalizedPath.replace(uploadsPattern, "");
  };

  const buildFileTree = (files) => {
    const tree = {};

    files.forEach((file) => {
      // Clean the file path for display
      const cleanPath = cleanFilePath(file.path);
      const parts = cleanPath.split(/[\/\\]/);
      let currentLevel = tree;

      parts.forEach((part, index) => {
        if (!currentLevel[part]) {
          currentLevel[part] = {
            name: part,
            path: parts.slice(0, index + 1).join("/"),
            originalPath: file.path, // Keep original path for API calls
            isFile: index === parts.length - 1,
            children: {},
            file: index === parts.length - 1 ? file : null,
          };
        }

        if (index < parts.length - 1) {
          currentLevel = currentLevel[part].children;
        }
      });
    });

    return tree;
  };

  const loadFileContent = async (file) => {
    try {
      setContentLoading(true);
      // Use original path for API calls
      const filePath = file.originalPath || file.path;
      const response = await axios.get(
        `${
          import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api"
        }/files/${projectId}/${encodeURIComponent(filePath)}`
      );
      setFileContent(response.data.content || "");
    } catch (err) {
      console.error("Failed to load file content:", err);
      setFileContent("Error loading file content");
    } finally {
      setContentLoading(false);
    }
  };

  const handleFileSelect = (file) => {
    setSelectedFile(file);
    if (file.isFile) {
      loadFileContent(file);
    }
  };

  const handleToggle = (event, nodeIds) => {
    setExpandedNodes(nodeIds);
  };

  const getFileIcon = (file) => {
    if (!file.isFile) {
      return expandedNodes.includes(file.path) ? (
        <FolderOpenIcon />
      ) : (
        <FolderIcon />
      );
    }

    const extension = file.name.split(".").pop()?.toLowerCase();

    if (
      [
        "js",
        "jsx",
        "ts",
        "tsx",
        "py",
        "java",
        "cpp",
        "c",
        "cs",
        "php",
        "rb",
        "go",
      ].includes(extension)
    ) {
      return <CodeIcon />;
    }
    if (["png", "jpg", "jpeg", "gif", "svg", "ico"].includes(extension)) {
      return <ImageIcon />;
    }
    if (
      ["json", "xml", "yml", "yaml", "toml", "ini", "conf"].includes(extension)
    ) {
      return <ConfigIcon />;
    }
    if (["md", "txt", "doc", "docx", "pdf"].includes(extension)) {
      return <DocumentIcon />;
    }

    return <FileIcon />;
  };

  const getLanguageFromExtension = (filename) => {
    const extension = filename.split(".").pop()?.toLowerCase();
    const languageMap = {
      js: "javascript",
      jsx: "jsx",
      ts: "typescript",
      tsx: "tsx",
      py: "python",
      java: "java",
      cpp: "cpp",
      c: "c",
      cs: "csharp",
      php: "php",
      rb: "ruby",
      go: "go",
      css: "css",
      scss: "scss",
      html: "html",
      xml: "xml",
      json: "json",
      yml: "yaml",
      yaml: "yaml",
      md: "markdown",
      sql: "sql",
      sh: "bash",
      ps1: "powershell",
    };

    return languageMap[extension] || "text";
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(fileContent);
  };

  const downloadFile = () => {
    const blob = new Blob([fileContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = selectedFile?.name || "file.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const renderTreeItems = (nodes, level = 0) => {
    return Object.values(nodes).map((node) => (
      <TreeItem
        key={node.path}
        nodeId={node.path}
        label={
          <Box sx={{ display: "flex", alignItems: "center", py: 0.5 }}>
            {getFileIcon(node)}
            <Typography
              variant="body2"
              sx={{
                ml: 1,
                fontWeight: selectedFile?.path === node.path ? 500 : 400,
                color:
                  selectedFile?.path === node.path
                    ? "primary.main"
                    : "text.primary",
              }}
            >
              {node.name}
            </Typography>
            {node.isFile && node.file && (
              <Chip
                label={`${node.file.lines} lines`}
                size="small"
                variant="outlined"
                sx={{ ml: "auto", height: 20, fontSize: "0.75rem" }}
              />
            )}
          </Box>
        }
        onClick={() => handleFileSelect(node)}
        sx={{
          "& .MuiTreeItem-content": {
            borderRadius: 1,
            "&:hover": {
              backgroundColor: "rgba(255, 255, 255, 0.05)",
            },
            "&.Mui-selected": {
              backgroundColor: "rgba(25, 118, 210, 0.12)",
            },
          },
        }}
      >
        {!node.isFile &&
          Object.keys(node.children).length > 0 &&
          renderTreeItems(node.children, level + 1)}
      </TreeItem>
    ));
  };

  const getBreadcrumbs = () => {
    if (!selectedFile) return [];
    return selectedFile.path.split("/").map((part, index, arr) => ({
      name: part,
      path: arr.slice(0, index + 1).join("/"),
    }));
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "50vh",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ height: "90vh", display: "flex", gap: 1 }}>
      {/* File Tree */}
      <Paper
        sx={{
          width: 300,
          minWidth: 300,
          p: 1,
          borderRight: "1px solid rgba(255,255,255,0.08)",
          bgcolor: "background.paper",
          overflow: "auto",
        }}
      >
        <Typography variant="h6" sx={{ p: 1 }}>
          Project Files
        </Typography>

        {fileTree && (
          <TreeView
            defaultCollapseIcon={<ExpandMoreIcon />}
            defaultExpandIcon={<ChevronRightIcon />}
            expanded={expandedNodes}
            onNodeToggle={handleToggle}
            sx={{
              flexGrow: 1,
              overflowY: "auto",
            }}
          >
            {renderTreeItems(fileTree)}
          </TreeView>
        )}
      </Paper>

      {/* File Content */}
      <Box
        sx={{
          flexGrow: 1,
          display: "flex",
          flexDirection: "column",
          gap: 1,
          width: "800px",
        }}
      >
        {selectedFile ? (
          <>
            {/* Header */}
            <Paper
              sx={{
                p: 1,
                borderBottom: "1px solid rgba(255,255,255,0.08)",
                bgcolor: "background.paper",
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 0.5, // tighter spacing
                  minHeight: 36, // cap height
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "row",
                    gap: 0.5,
                    alignItems: "center",
                  }}
                >
                  <Typography
                    variant="subtitle2"
                    noWrap
                    sx={{ fontWeight: 600, lineHeight: 1.2, mb: 0 }}
                  >
                    {selectedFile.name}
                  </Typography>

                  {selectedFile.file && (
                    <Box sx={{ display: "flex", gap: 1 }}>
                      <Chip
                        label={`${selectedFile.file.size} bytes`}
                        size="small"
                      />
                      <Chip
                        label={`${selectedFile.file.lines} lines`}
                        size="small"
                      />
                      <Chip label={selectedFile.file.extension} size="small" />
                    </Box>
                  )}
                </Box>

                {selectedFile.isFile && (
                  <Box sx={{ display: "flex", gap: 0.5 }}>
                    <Tooltip title="Copy content">
                      <IconButton
                        size="small"
                        sx={{ p: 0.5 }}
                        onClick={copyToClipboard}
                      >
                        <CopyIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Download file">
                      <IconButton
                        size="small"
                        sx={{ p: 0.5 }}
                        onClick={downloadFile}
                      >
                        <DownloadIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                )}
              </Box>

              {/* Display clean file path */}
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mt: 0.5, display: "block" }}
              >
                📁 {selectedFile.path}
              </Typography>
            </Paper>

            {/* Content */}
            <Box sx={{ flexGrow: 1, overflow: "auto" }}>
              {contentLoading ? (
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    height: 200,
                  }}
                >
                  <CircularProgress size={24} />
                </Box>
              ) : selectedFile.isFile ? (
                <SyntaxHighlighter
                  language={getLanguageFromExtension(selectedFile.name)}
                  style={oneDark}
                  showLineNumbers
                  lineNumberStyle={{
                    minWidth: "3em",
                    paddingRight: "1em",
                    textAlign: "right",
                    userSelect: "none",
                  }}
                  customStyle={{
                    margin: 0,
                    padding: "1rem",
                    fontSize: "0.875rem",
                    lineHeight: 1.5,
                  }}
                >
                  {fileContent}
                </SyntaxHighlighter>
              ) : (
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    height: "100%",
                    flexDirection: "column",
                    gap: 2,
                  }}
                >
                  <FolderIcon sx={{ fontSize: 64, opacity: 0.3 }} />
                  <Typography variant="h6" color="text.secondary">
                    Select a file to view its content
                  </Typography>
                </Box>
              )}
            </Box>
          </>
        ) : (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              height: "100%",
              flexDirection: "column",
              gap: 2,
            }}
          >
            <FolderIcon sx={{ fontSize: 64, opacity: 0.3 }} />
            <Typography variant="h6" color="text.secondary">
              Select a file to view its content
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default CodebaseTab;
