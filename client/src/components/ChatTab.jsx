import React, { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  List,
  ListItem,
  ListItemText,
  Chip,
  CircularProgress,
  Popper,
  ClickAwayListener,
  MenuList,
  MenuItem,
} from "@mui/material";
import {
  Send as SendIcon,
  SmartToy as AIIcon,
  Person as PersonIcon,
  InsertDriveFile as FileIcon,
} from "@mui/icons-material";
import axios from "axios";

const ChatTab = ({ projectId, project }) => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: "ai",
      content: `Hello! I'm ready to help you understand your codebase. You can ask me questions like:
      
• "What does the main component do?"
• "How are components connected?"  
• "Explain the authentication flow"
• "What are the main dependencies?"
• "Show me the project structure"
• "What are the most complex functions?"

💡 **Pro tip**: Use @ to reference specific files (e.g., "@src/App.jsx what does this component do?")

Feel free to ask anything about your project!`,
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const eventSourceRef = useRef(null);

  // File autocomplete state
  const [showFileAutocomplete, setShowFileAutocomplete] = useState(false);
  const [fileOptions, setFileOptions] = useState([]);
  const [currentAtPosition, setCurrentAtPosition] = useState(-1);
  const [filteredFiles, setFilteredFiles] = useState([]);
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);
  const inputRef = useRef(null);

  // Helper function to clean file paths for display
  const cleanFilePath = (filePath) => {
    // Normalize path separators first
    const normalizedPath = filePath.replace(/\\/g, "/");
    // Remove uploads/projectId/ prefix from file paths
    const uploadsPattern = /^uploads\/[^\/]+\//;
    return normalizedPath.replace(uploadsPattern, "");
  };

  // Load project files for autocomplete
  const loadProjectFiles = async () => {
    try {
      const response = await axios.get(
        `${
          import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api"
        }/chat/files/${projectId}`
      );
      // Clean file paths for display but keep originals for API calls
      const files = (response.data.files || []).map((file) => ({
        ...file,
        displayPath: cleanFilePath(file.path),
        originalPath: file.path,
      }));
      setFileOptions(files);
    } catch (error) {
      console.error("Failed to load project files:", error);
    }
  };

  useEffect(() => {
    if (projectId) {
      loadProjectFiles();
    }
  }, [projectId]);

  const handleInputChange = (event) => {
    const value = event.target.value;
    const cursorPosition = event.target.selectionStart;
    setInputValue(value);

    // Check for @ symbol and show autocomplete
    const beforeCursor = value.substring(0, cursorPosition);
    const atMatch = beforeCursor.match(/@([^\s@]*)$/);

    if (atMatch) {
      const searchTerm = atMatch[1];
      setCurrentAtPosition(atMatch.index);

      // Filter files based on search term (use display path for filtering)
      const filtered = fileOptions
        .filter(
          (file) =>
            file.displayPath.toLowerCase().includes(searchTerm.toLowerCase()) ||
            file.name.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .slice(0, 10); // Limit to 10 results

      setFilteredFiles(filtered);
      setSelectedFileIndex(0);
      setShowFileAutocomplete(filtered.length > 0);
    } else {
      setShowFileAutocomplete(false);
    }
  };

  const insertFileReference = (file) => {
    const beforeAt = inputValue.substring(0, currentAtPosition);
    const afterCursor = inputValue.substring(inputRef.current.selectionStart);

    // Find the next space after @... to know where the mention ends
    const mentionEnd = inputValue.indexOf(" ", currentAtPosition);
    const afterMention =
      mentionEnd !== -1 ? inputValue.substring(mentionEnd) : "";

    const newValue = beforeAt + `@${file.displayPath} ` + afterMention;

    setInputValue(newValue);
    setShowFileAutocomplete(false);

    // Restore focus and cursor position
    setTimeout(() => {
      inputRef.current?.focus();
      const newCursorPosition = beforeAt.length + file.displayPath.length + 2; // +2 for @ and space
      inputRef.current?.setSelectionRange(newCursorPosition, newCursorPosition);
    }, 0);
  };

  const handleKeyDown = (event) => {
    if (showFileAutocomplete) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setSelectedFileIndex((prev) =>
          prev < filteredFiles.length - 1 ? prev + 1 : 0
        );
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setSelectedFileIndex((prev) =>
          prev > 0 ? prev - 1 : filteredFiles.length - 1
        );
      } else if (event.key === "Tab" || event.key === "Enter") {
        if (filteredFiles[selectedFileIndex]) {
          event.preventDefault();
          insertFileReference(filteredFiles[selectedFileIndex]);
        }
      } else if (event.key === "Escape") {
        setShowFileAutocomplete(false);
      }
    } else if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      type: "user",
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setShowFileAutocomplete(false);
    setIsLoading(true);

    try {
      // Fallback to non-streaming if EventSource is unavailable (older browsers)
      const supportsSSE =
        typeof window !== "undefined" && "EventSource" in window;
      if (!supportsSSE) {
        const response = await axios.post(
          `${
            import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api"
          }/chat/project/${projectId}`,
          {
            message: userMessage.content,
            conversationHistory: messages.slice(-10),
          },
          {
            headers: { "Content-Type": "application/json" },
            timeout: 30000,
          }
        );
        const aiResponse = {
          id: Date.now() + 1,
          type: "ai",
          content: response.data.response,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, aiResponse]);
        return;
      }

      // Streaming via SSE
      setStreaming(true);
      const baseUrl =
        import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";
      // We'll open a fetch POST to initiate stream, but browser EventSource only supports GET.
      // Use fetch with ReadableStream to handle SSE-like stream from POST endpoint.
      const controller = new AbortController();
      const signal = controller.signal;
      let aiMessageId = Date.now() + 1;
      let accumulated = "";
      // Create placeholder AI message for live updates
      setMessages((prev) => [
        ...prev,
        { id: aiMessageId, type: "ai", content: "", timestamp: new Date() },
      ]);

      const response = await fetch(
        `${baseUrl}/chat/project/${projectId}/stream`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: userMessage.content,
            conversationHistory: messages.slice(-10),
          }),
          signal,
        }
      );

      if (!response.ok || !response.body) {
        throw new Error("Streaming request failed");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let done = false;

      while (!done) {
        const result = await reader.read();
        done = result.done;
        const chunk = decoder.decode(result.value || new Uint8Array(), {
          stream: !done,
        });
        if (!chunk) continue;

        // Parse SSE-style chunks: lines that start with 'data: '
        const lines = chunk.split(/\n/);
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;
            accumulated += data;
            // Update the last AI message content incrementally
            setMessages((prev) =>
              prev.map((m) =>
                m.id === aiMessageId ? { ...m, content: accumulated } : m
              )
            );
          }
        }
      }
    } catch (error) {
      console.error("Chat API error:", error);

      let errorMessage = "Failed to get AI response. ";
      if (error.code === "ECONNABORTED") {
        errorMessage += "Request timed out. Please try again.";
      } else if (error.response?.status === 404) {
        errorMessage += "Project not found. Please upload a project first.";
      } else if (error.response?.status === 500) {
        errorMessage +=
          "Server error. Please check if OpenAI API key is configured.";
      } else if (error.response?.data?.error) {
        errorMessage += error.response.data.error;
      } else {
        errorMessage += "Please ensure the server is running.";
      }

      const errorResponse = {
        id: Date.now() + 1,
        type: "ai",
        content: errorMessage,
        timestamp: new Date(),
        isError: true,
      };

      setMessages((prev) => [...prev, errorResponse]);
    } finally {
      setStreaming(false);
      setIsLoading(false);
    }
  };

  const renderFileAutocomplete = () => {
    if (!showFileAutocomplete || filteredFiles.length === 0) return null;

    return (
      <Popper
        open={showFileAutocomplete}
        anchorEl={inputRef.current}
        placement="top-start"
        sx={{ zIndex: 1300, width: inputRef.current?.offsetWidth }}
      >
        <Paper
          sx={{
            maxHeight: 200,
            overflow: "auto",
            border: "1px solid rgba(255,255,255,0.1)",
            bgcolor: "background.paper",
          }}
        >
          <MenuList dense>
            {filteredFiles.map((file, index) => (
              <MenuItem
                key={file.path}
                selected={index === selectedFileIndex}
                onClick={() => insertFileReference(file)}
                sx={{
                  fontSize: "0.875rem",
                  py: 0.5,
                  px: 1,
                }}
              >
                <FileIcon sx={{ mr: 1, fontSize: "1rem", opacity: 0.7 }} />
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {file.name}
                  </Typography>
                  <Typography variant="caption" sx={{ opacity: 0.7 }}>
                    {file.displayPath}
                  </Typography>
                </Box>
              </MenuItem>
            ))}
          </MenuList>
        </Paper>
      </Popper>
    );
  };

  return (
    <Box sx={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Messages */}
      <Paper
        sx={{
          flex: 1,
          p: 1,
          mb: 1, // reduced spacing
          overflow: "auto",
          bgcolor: "background.paper",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 4px 16px rgba(0,0,0,0.35)", // lighter shadow
          backdropFilter: "blur(6px) saturate(110%)",
          minHeight: "40vh", // slimmer minimum
        }}
      >
        <List dense>
          {messages.map((message) => (
            <ListItem
              key={message.id}
              sx={{
                flexDirection: "column",
                alignItems: message.type === "user" ? "flex-end" : "flex-start",
                mb: 1, // tighter vertical gap
              }}
            >
              <Box
                sx={{
                  maxWidth: "75%",
                  p: 1.2, // smaller padding
                  borderRadius: 1.5, // slightly tighter corners
                  bgcolor: message.isError
                    ? "rgba(244,67,54,0.15)"
                    : "rgba(255,255,255,0.05)",
                  color: message.type === "user" ? "white" : "text.primary",
                  border:
                    message.type === "user"
                      ? "none"
                      : "1px solid rgba(255,255,255,0.08)",
                  fontSize: "0.85rem", // compact text
                  lineHeight: 1.4,
                }}
              >
                {message.type !== "user" && (
                  <Box sx={{ display: "flex", alignItems: "center", mb: 0.5 }}>
                    {message.type === "user" ? <PersonIcon /> : <AIIcon />}
                    <Typography
                      variant="caption"
                      sx={{ ml: 0.5, opacity: 0.7 }}
                    >
                      {message.type === "user" ? "You" : "AI Assistant"}
                    </Typography>
                  </Box>
                )}
                <Box
                  sx={{
                    "& pre": { m: 0, mb: 0.5 },
                    "& code": { fontFamily: "Share Tech Mono, monospace" },
                  }}
                >
                  <MessageContent content={message.content} />
                </Box>
              </Box>
            </ListItem>
          ))}
          {isLoading && (
            <ListItem sx={{ justifyContent: "flex-start", py: 0.5 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <CircularProgress size={16} />
                <Typography variant="caption" color="text.secondary">
                  AI is thinking...
                </Typography>
              </Box>
            </ListItem>
          )}
        </List>
      </Paper>

      {/* Input */}
      <Paper
        sx={{
          p: 1,
          bgcolor: "background.paper",
          border: "1px solid rgba(255,255,255,0.08)",
          backdropFilter: "blur(6px) saturate(110%)",
        }}
      >
        <Box sx={{ display: "flex", gap: 0.5 }}>
          <Box sx={{ position: "relative", flexGrow: 1 }}>
            <TextField
              ref={inputRef}
              fullWidth
              multiline
              maxRows={3}
              placeholder="Ask about your codebase..."
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              size="small" // compact field
            />
            {renderFileAutocomplete()}
          </Box>
          <Button
            variant="contained"
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isLoading}
            sx={{ minWidth: "auto", px: 1.5, py: 0.5 }}
          >
            <SendIcon fontSize="small" />
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default ChatTab;

// Markdown + syntax highlighting renderer
function MessageContent({ content }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code({ inline, className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || "");
          if (!inline && match) {
            return (
              <SyntaxHighlighter
                style={oneDark}
                language={match[1]}
                PreTag="div"
                {...props}
              >
                {String(children).replace(/\n$/, "")}
              </SyntaxHighlighter>
            );
          }
          return (
            <code className={className} {...props}>
              {children}
            </code>
          );
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
