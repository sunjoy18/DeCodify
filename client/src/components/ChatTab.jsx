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
} from "@mui/material";
import {
  Send as SendIcon,
  SmartToy as AIIcon,
  Person as PersonIcon,
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

Feel free to ask anything about your project!`,
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const eventSourceRef = useRef(null);

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

  const handleKeyPress = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <Box sx={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Project Info */}
      <Paper
        sx={{
          p: 2,
          mb: 2,
          bgcolor: "background.paper",
          border: "1px solid rgba(255,255,255,0.08)",
          backdropFilter: "blur(8px) saturate(120%)",
        }}
      >
        <Typography variant="h6" gutterBottom>
          Chat with your codebase
        </Typography>
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          <Chip
            size="small"
            label={`Project: ${project?.name || "Unknown"}`}
            color="primary"
          />
          <Chip
            size="small"
            label={`${project?.fileCount || 0} files analyzed`}
          />
        </Box>
      </Paper>

      {/* Messages */}
      <Paper
        sx={{
          flex: 1,
          p: 2,
          mb: 2,
          overflow: "auto",
          bgcolor: "background.paper",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.45)",
          backdropFilter: "blur(8px) saturate(120%)",
          minHeight: "50vh",
        }}
      >
        <List>
          {messages.map((message) => (
            <ListItem
              key={message.id}
              sx={{
                flexDirection: "column",
                alignItems: message.type === "user" ? "flex-end" : "flex-start",
                mb: 2,
              }}
            >
              <Box
                sx={{
                  maxWidth: "80%",
                  p: 2,
                  borderRadius: 2,
                  bgcolor: message.isError
                    ? "rgba(244,67,54,0.15)"
                    : "rgba(255,255,255,0.06)",
                  color: message.type === "user" ? "white" : "text.primary",
                  border:
                    message.type === "user"
                      ? "none"
                      : "1px solid rgba(255,255,255,0.08)",
                }}
              >
                {message.type !== "user" && (
                  <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                    {message.type === "user" ? <PersonIcon /> : <AIIcon />}
                    <Typography variant="caption" sx={{ ml: 1, opacity: 0.8 }}>
                      {message.type === "user" ? "You" : "AI Assistant"}
                    </Typography>
                  </Box>
                )}
                <Box
                  sx={{
                    "& pre": { m: 0, mb: 1 },
                    "& code": { fontFamily: "Share Tech Mono, monospace" },
                  }}
                >
                  <MessageContent content={message.content} />
                </Box>
              </Box>
            </ListItem>
          ))}
          {isLoading && (
            <ListItem sx={{ justifyContent: "flex-start" }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <CircularProgress size={20} />
                <Typography variant="body2" color="text.secondary">
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
          p: 2,
          bgcolor: "background.paper",
          border: "1px solid rgba(255,255,255,0.08)",
          backdropFilter: "blur(8px) saturate(120%)",
        }}
      >
        <Box sx={{ display: "flex", gap: 1 }}>
          <TextField
            fullWidth
            multiline
            maxRows={3}
            placeholder="Ask about your codebase..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isLoading}
          />
          <Button
            variant="contained"
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isLoading}
            sx={{ minWidth: "auto", px: 2 }}
          >
            <SendIcon />
          </Button>
        </Box>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ mt: 1, display: "block" }}
        >
          Press Enter to send, Shift+Enter for new line
        </Typography>
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
