import express from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

// Simple Google Gemini wrapper
class GeminiChat {
  constructor() {
    if (!process.env.GOOGLE_API_KEY) {
      throw new Error("GOOGLE_API_KEY environment variable is not set");
    }
    this.genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    this.model = this.genAI.getGenerativeModel({
      model: "gemini-1.5-pro",
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 4096,
      },
    });
  }

  async generateResponse(prompt, context = "") {
    try {
      const fullPrompt = this.buildPrompt(prompt, context);
      const result = await this.model.generateContent(fullPrompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error("Google Gemini API error:", error);
      throw new Error(`Google Gemini API call failed: ${error.message}`);
    }
  }

  async generateStreamResponse(prompt, context = "", onToken) {
    try {
      const fullPrompt = this.buildPrompt(prompt, context);
      const result = await this.model.generateContentStream(fullPrompt);
      let fullResponse = "";

      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        if (chunkText) {
          fullResponse += chunkText;
          if (onToken) onToken(chunkText);
        }
      }
      return fullResponse;
    } catch (error) {
      console.error("Google Gemini API error:", error);
      throw new Error(`Google Gemini API call failed: ${error.message}`);
    }
  }

  buildPrompt(userMessage, context) {
    return `You are an expert code analysis assistant with access to a codebase.

${
  context ? `Codebase Context:\n${context}\n\n` : ""
}User Question: ${userMessage}\n\nPlease provide a helpful and accurate answer based on the codebase context. Be specific and reference relevant files, functions, or components when possible.\n\nAnswer:`;
  }
}

// Initialize Gemini chat instance
let geminiChat;

function initializeGemini() {
  if (!geminiChat) {
    geminiChat = new GeminiChat();
  }
  return geminiChat;
}

// Store project contexts for each project
const projectContexts = new Map();

/**
 * Chat with a project's codebase
 */
router.post("/project/:projectId", async (req, res) => {
  try {
    const { projectId } = req.params;
    const { message, conversationHistory = [] } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: "Message is required" });
    }

    // Initialize Gemini
    const chat = initializeGemini();

    // Load or create context for the project
    let context = projectContexts.get(projectId);
    if (!context) {
      context = await createProjectContext(projectId);
      if (!context) {
        return res
          .status(404)
          .json({ error: "Project not found or no content to analyze" });
      }
      projectContexts.set(projectId, context);
    }

    // Extract @ file references and get their content
    const { cleanMessage, referencedFiles } = await extractFileReferences(
      message,
      projectId
    );

    // Build context with conversation history and referenced files
    const fullContext = buildFullContext(
      context,
      conversationHistory,
      cleanMessage,
      referencedFiles
    );

    // Generate response
    const response = await chat.generateResponse(cleanMessage, fullContext);

    res.json({
      success: true,
      response: response,
      projectId,
      referencedFiles: referencedFiles.map((f) => f.path),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Chat error:", error);
    res.status(500).json({
      error: "Failed to process chat message",
      details: error.message,
    });
  }
});

/**
 * Stream chat response tokens for a project's codebase (SSE)
 */
router.post("/project/:projectId/stream", async (req, res) => {
  try {
    const { projectId } = req.params;
    const { message, conversationHistory = [] } = req.body || {};

    if (!message || message.trim().length === 0) {
      res.status(400).json({ error: "Message is required" });
      return;
    }

    // Initialize Gemini
    const chat = initializeGemini();

    // Load or create context for the project
    let context = projectContexts.get(projectId);
    if (!context) {
      context = await createProjectContext(projectId);
      if (!context) {
        res
          .status(404)
          .json({ error: "Project not found or no content to analyze" });
        return;
      }
      projectContexts.set(projectId, context);
    }

    // Configure headers for Server-Sent Events
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    // Extract @ file references and get their content
    const { cleanMessage, referencedFiles } = await extractFileReferences(
      message,
      projectId
    );

    // Build context with conversation history and referenced files
    const fullContext = buildFullContext(
      context,
      conversationHistory,
      cleanMessage,
      referencedFiles
    );

    // Stream response
    await chat.generateStreamResponse(cleanMessage, fullContext, (token) => {
      res.write(`data: ${token}\n\n`);
    });

    // Signal completion
    res.write("event: done\n");
    res.write("data: [DONE]\n\n");
    res.end();
  } catch (error) {
    console.error("Chat stream error:", error);
    try {
      // Try to emit error over SSE channel if headers already sent
      if (!res.headersSent) {
        res.setHeader("Content-Type", "application/json");
        res.status(500).json({
          error: "Failed to process chat message",
          details: error.message,
        });
      } else {
        res.write("event: error\n");
        res.write(`data: ${JSON.stringify({ message: error.message })}\n\n`);
        res.end();
      }
    } catch {
      // Ignore secondary errors
    }
  }
});

/**
 * Get project context information
 */
router.get("/context/:projectId", async (req, res) => {
  try {
    const { projectId } = req.params;

    // Load project data
    const projectData = await loadProjectData(projectId);
    if (!projectData) {
      return res.status(404).json({ error: "Project not found" });
    }

    // Generate context summary
    const context = generateProjectSummary(projectData);

    res.json({
      success: true,
      context,
      projectId,
    });
  } catch (error) {
    console.error("Context error:", error);
    res.status(500).json({
      error: "Failed to load project context",
      details: error.message,
    });
  }
});

/**
 * Search project files with text-based search
 */
router.post("/search/:projectId", async (req, res) => {
  try {
    const { projectId } = req.params;
    const { query, limit = 10 } = req.body;

    if (!query || query.trim().length === 0) {
      return res.status(400).json({ error: "Search query is required" });
    }

    // Load or create context for the project
    let context = projectContexts.get(projectId);
    if (!context) {
      context = await createProjectContext(projectId);
      if (!context) {
        return res.status(404).json({ error: "Project not found" });
      }
      projectContexts.set(projectId, context);
    }

    // Perform text-based search
    const searchResults = performTextSearch(context, query, limit);

    res.json({
      success: true,
      query,
      results: searchResults,
      count: searchResults.length,
    });
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({
      error: "Failed to search project",
      details: error.message,
    });
  }
});

/**
 * Get project files for @ autocomplete
 */
router.get("/files/:projectId", async (req, res) => {
  try {
    const { projectId } = req.params;
    const { search } = req.query;

    // Load or create context for the project
    let context = projectContexts.get(projectId);
    if (!context) {
      context = await createProjectContext(projectId);
      if (!context) {
        return res.status(404).json({ error: "Project not found" });
      }
      projectContexts.set(projectId, context);
    }

    let files = context.files.map((file) => ({
      path: file.path,
      name: path.basename(file.path),
      extension: file.extension,
      size: file.size,
      lines: file.lines,
    }));

    // Filter files if search query provided
    if (search && search.trim()) {
      const searchLower = search.toLowerCase();
      files = files.filter(
        (file) =>
          file.path.toLowerCase().includes(searchLower) ||
          file.name.toLowerCase().includes(searchLower)
      );
    }

    res.json({
      success: true,
      files: files.slice(0, 50), // Limit to 50 files for performance
      total: files.length,
    });
  } catch (error) {
    console.error("Get files error:", error);
    res.status(500).json({
      error: "Failed to get project files",
      details: error.message,
    });
  }
});

/**
 * Get individual file content
 */
router.get("/:projectId/:filePath(*)", async (req, res) => {
  try {
    const { projectId, filePath } = req.params;

    if (!filePath) {
      return res.status(400).json({ error: "File path is required" });
    }

    // Decode the file path
    const decodedFilePath = decodeURIComponent(filePath);

    // Get file content using the existing function
    const content = await getFileContent(projectId, decodedFilePath, true);

    if (content === null) {
      return res.status(404).json({ error: "File not found" });
    }

    res.json({
      success: true,
      content: content,
      filePath: decodedFilePath,
    });
  } catch (error) {
    console.error("Get file content error:", error);
    res.status(500).json({
      error: "Failed to get file content",
      details: error.message,
    });
  }
});

/**
 * Clear chat history and context for a project
 */
router.delete("/project/:projectId", async (req, res) => {
  try {
    const { projectId } = req.params;

    // Remove context from memory
    projectContexts.delete(projectId);

    res.json({
      success: true,
      message: "Chat history cleared",
      projectId,
    });
  } catch (error) {
    console.error("Clear chat error:", error);
    res.status(500).json({
      error: "Failed to clear chat history",
      details: error.message,
    });
  }
});

// Helper functions

async function createProjectContext(projectId) {
  try {
    const projectData = await loadProjectData(projectId);
    if (!projectData || !projectData.parseResults) {
      return null;
    }

    // Create searchable context from parsed files
    const context = {
      projectInfo: {
        id: projectData.id,
        name: projectData.name,
        type: projectData.type,
        fileCount: projectData.fileCount,
      },
      files: [],
      functions: [],
      classes: [],
      components: [],
      summary: "",
    };

    projectData.parseResults.forEach((file) => {
      if (file.error) return; // Skip files with errors

      // Add file overview
      const fileInfo = {
        path: file.filePath,
        extension: file.extension,
        size: file.size,
        lines: file.lines,
        dependencies: file.dependencies || [],
        exports: file.exports || [],
        content: createFileDocumentContent(file),
      };
      context.files.push(fileInfo);

      // Add functions
      if (file.functions && file.functions.length > 0) {
        file.functions.forEach((func) => {
          context.functions.push({
            name: func.name,
            type: func.type,
            file: file.filePath,
            line: func.line,
            params: func.params || [],
            async: func.async || false,
            content: createFunctionDocumentContent(func, file),
          });
        });
      }

      // Add classes
      if (file.classes && file.classes.length > 0) {
        file.classes.forEach((cls) => {
          context.classes.push({
            name: cls.name,
            file: file.filePath,
            line: cls.line,
            superClass: cls.superClass,
            content: createClassDocumentContent(cls, file),
          });
        });
      }

      // Add components
      if (file.components && file.components.length > 0) {
        file.components.forEach((comp) => {
          context.components.push({
            name: comp.name,
            type: comp.type,
            file: file.filePath,
            line: comp.line,
            props: comp.props || [],
            content: createComponentDocumentContent(comp, file),
          });
        });
      }
    });

    // Create summary
    context.summary = createProjectSummary(context);

    return context;
  } catch (error) {
    console.error("Error creating project context:", error);
    return null;
  }
}

function performTextSearch(context, query, limit) {
  const results = [];
  const queryLower = query.toLowerCase();

  // Search in files
  context.files.forEach((file) => {
    if (
      file.content.toLowerCase().includes(queryLower) ||
      file.path.toLowerCase().includes(queryLower)
    ) {
      results.push({
        type: "file",
        content: file.content,
        metadata: {
          filePath: file.path,
          extension: file.extension,
          size: file.size,
          lines: file.lines,
        },
        relevance: calculateRelevance(file.content, query),
      });
    }
  });

  // Search in functions
  context.functions.forEach((func) => {
    if (
      func.content.toLowerCase().includes(queryLower) ||
      func.name.toLowerCase().includes(queryLower)
    ) {
      results.push({
        type: "function",
        content: func.content,
        metadata: {
          functionName: func.name,
          filePath: func.file,
          line: func.line,
          type: func.type,
        },
        relevance: calculateRelevance(func.content, query),
      });
    }
  });

  // Search in classes
  context.classes.forEach((cls) => {
    if (
      cls.content.toLowerCase().includes(queryLower) ||
      cls.name.toLowerCase().includes(queryLower)
    ) {
      results.push({
        type: "class",
        content: cls.content,
        metadata: {
          className: cls.name,
          filePath: cls.file,
          line: cls.line,
          superClass: cls.superClass,
        },
        relevance: calculateRelevance(cls.content, query),
      });
    }
  });

  // Search in components
  context.components.forEach((comp) => {
    if (
      comp.content.toLowerCase().includes(queryLower) ||
      comp.name.toLowerCase().includes(queryLower)
    ) {
      results.push({
        type: "component",
        content: comp.content,
        metadata: {
          componentName: comp.name,
          filePath: comp.file,
          line: comp.line,
          type: comp.type,
        },
        relevance: calculateRelevance(comp.content, query),
      });
    }
  });

  // Sort by relevance and limit
  return results.sort((a, b) => b.relevance - a.relevance).slice(0, limit);
}

function calculateRelevance(content, query) {
  const contentLower = content.toLowerCase();
  const queryLower = query.toLowerCase();
  const matches = (contentLower.match(new RegExp(queryLower, "g")) || [])
    .length;
  return matches / content.length;
}

function buildFullContext(
  context,
  conversationHistory,
  currentMessage,
  referencedFiles = []
) {
  let fullContext = `Project: ${context.projectInfo.name}\n`;
  fullContext += `Type: ${context.projectInfo.type}\n`;
  fullContext += `Files: ${context.files.length}\n`;
  fullContext += `Functions: ${context.functions.length}\n`;
  fullContext += `Classes: ${context.classes.length}\n`;
  fullContext += `Components: ${context.components.length}\n\n`;

  // Add project summary
  fullContext += `Project Summary:\n${context.summary}\n\n`;

  // Add referenced files content (highest priority)
  if (referencedFiles && referencedFiles.length > 0) {
    fullContext += "Referenced Files Content:\n";
    referencedFiles.forEach((file) => {
      fullContext += `=== FILE: ${file.path} ===\n`;
      fullContext += `${file.content}\n\n`;
    });
  }

  // Find additional relevant context based on current message
  const relevantItems = findRelevantContext(context, currentMessage);
  if (relevantItems.length > 0) {
    fullContext += "Additional Relevant Code Context:\n";
    relevantItems.forEach((item) => {
      fullContext += `${item.content}\n\n`;
    });
  }

  // Add conversation history
  if (conversationHistory && conversationHistory.length > 0) {
    fullContext += "Previous Conversation:\n";
    fullContext += formatConversationHistory(conversationHistory);
  }

  return fullContext;
}

function findRelevantContext(context, message) {
  const messageLower = message.toLowerCase();
  const relevantItems = [];

  // Find relevant files, functions, classes, components
  const allItems = [
    ...context.files.map((f) => ({ ...f, type: "file" })),
    ...context.functions.map((f) => ({ ...f, type: "function" })),
    ...context.classes.map((c) => ({ ...c, type: "class" })),
    ...context.components.map((c) => ({ ...c, type: "component" })),
  ];

  allItems.forEach((item) => {
    if (item.content && item.content.toLowerCase().includes(messageLower)) {
      relevantItems.push(item);
    }
  });

  return relevantItems.slice(0, 5); // Limit to top 5 most relevant
}

async function extractFileReferences(message, projectId) {
  // Extract @ file references from message
  const fileReferenceRegex = /@([^\s@]+)/g;
  const matches = [...message.matchAll(fileReferenceRegex)];

  if (matches.length === 0) {
    return { cleanMessage: message, referencedFiles: [] };
  }

  const referencedFiles = [];
  let cleanMessage = message;

  for (const match of matches) {
    const cleanFilePath = match[1];
    const fullMatch = match[0];

    try {
      // Get file content using the clean path (getFileContent handles the prefix)
      const fileContent = await getFileContent(projectId, cleanFilePath);
      if (fileContent) {
        referencedFiles.push({
          path: cleanFilePath, // Store clean path for display
          content: fileContent,
          mention: fullMatch,
        });

        // Replace @ mention with cleaner reference in message
        cleanMessage = cleanMessage.replace(
          fullMatch,
          `file "${cleanFilePath}"`
        );
      } else {
        // Keep the @ mention if file not found
        console.warn(`File not found: ${cleanFilePath}`);
      }
    } catch (error) {
      console.error(`Error loading file ${cleanFilePath}:`, error);
    }
  }

  return { cleanMessage, referencedFiles };
}

async function getFileContent(projectId, filePath, fullContent = false) {
  try {
    // Normalize the file path - handle both forward and backward slashes
    const normalizedPath = filePath.replace(/\\/g, "/");

    // Remove uploads/projectId/ prefix if it exists (in case it's already included)
    let cleanPath = normalizedPath;
    if (normalizedPath.startsWith(`uploads/${projectId}/`)) {
      cleanPath = normalizedPath.substring(`uploads/${projectId}/`.length);
    }

    // Construct the full path to the file
    const uploadsPath = path.join(__dirname, "../uploads", projectId);
    const fullFilePath = path.join(uploadsPath, cleanPath);

    // Security check: ensure the file is within the project directory
    const resolvedPath = path.resolve(fullFilePath);
    const resolvedUploadsPath = path.resolve(uploadsPath);

    if (!resolvedPath.startsWith(resolvedUploadsPath)) {
      console.warn(
        `Security: Attempted to access file outside project directory: ${filePath}`
      );
      return null;
    }

    // Check if file exists
    if (!(await fs.pathExists(resolvedPath))) {
      console.warn(`File not found at: ${resolvedPath}`);
      return null;
    }

    // Read file content
    const content = await fs.readFile(resolvedPath, "utf8");

    // Limit file size to prevent overwhelming the context
    if (fullContent) {
      return content;
    }
    const maxSize = 10000; // 10KB limit
    if (content.length > maxSize) {
      return (
        content.substring(0, maxSize) + "\n\n... (file truncated due to size)"
      );
    }
    return content;
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
    return null;
  }
}

function createFileDocumentContent(file) {
  let content = `File: ${file.filePath}\n`;
  content += `Type: ${file.extension}\n`;
  content += `Size: ${file.size} bytes, ${file.lines} lines\n\n`;

  if (file.dependencies && file.dependencies.length > 0) {
    content += `Dependencies:\n`;
    file.dependencies.forEach((dep) => {
      content += `- ${dep.type}: ${dep.source}\n`;
    });
    content += "\n";
  }

  if (file.exports && file.exports.length > 0) {
    content += `Exports:\n`;
    file.exports.forEach((exp) => {
      content += `- ${exp.type}: ${exp.name}\n`;
    });
    content += "\n";
  }

  const summary = [];
  if (file.functions && file.functions.length > 0) {
    summary.push(`${file.functions.length} functions`);
  }
  if (file.classes && file.classes.length > 0) {
    summary.push(`${file.classes.length} classes`);
  }
  if (file.components && file.components.length > 0) {
    summary.push(`${file.components.length} components`);
  }

  if (summary.length > 0) {
    content += `Contains: ${summary.join(", ")}\n`;
  }

  return content;
}

function createFunctionDocumentContent(func, file) {
  let content = `Function: ${func.name}\n`;
  content += `File: ${file.filePath}\n`;
  content += `Type: ${func.type}\n`;
  content += `Line: ${func.line}\n`;

  if (func.params && func.params.length > 0) {
    content += `Parameters: ${func.params.join(", ")}\n`;
  }

  if (func.async) content += `Async: true\n`;
  if (func.generator) content += `Generator: true\n`;

  return content;
}

function createClassDocumentContent(cls, file) {
  let content = `Class: ${cls.name}\n`;
  content += `File: ${file.filePath}\n`;
  content += `Line: ${cls.line}\n`;

  if (cls.superClass) {
    content += `Extends: ${cls.superClass}\n`;
  }

  return content;
}

function createComponentDocumentContent(comp, file) {
  let content = `Component: ${comp.name}\n`;
  content += `File: ${file.filePath}\n`;
  content += `Type: ${comp.type}\n`;
  content += `Line: ${comp.line}\n`;

  if (comp.props && comp.props.length > 0) {
    content += `Props: ${comp.props.join(", ")}\n`;
  }

  return content;
}

function createProjectSummary(context) {
  let summary = `This project contains ${context.files.length} files:\n`;

  // Group files by extension
  const filesByExt = {};
  context.files.forEach((file) => {
    const ext = file.extension || "unknown";
    filesByExt[ext] = (filesByExt[ext] || 0) + 1;
  });

  Object.entries(filesByExt).forEach(([ext, count]) => {
    summary += `- ${count} ${ext} files\n`;
  });

  summary += `\nCode Structure:\n`;
  summary += `- ${context.functions.length} functions\n`;
  summary += `- ${context.classes.length} classes\n`;
  summary += `- ${context.components.length} components\n\n`;

  // List main files
  if (context.files.length > 0) {
    summary += "Main Files:\n";
    context.files.slice(0, 10).forEach((file) => {
      summary += `- ${file.path}\n`;
    });
  }

  return summary;
}

function formatConversationHistory(history) {
  if (!history || history.length === 0) {
    return "No previous conversation.";
  }

  return history
    .slice(-5) // Keep only last 5 exchanges
    .map(
      (exchange) =>
        `Human: ${exchange.message}\nAssistant: ${exchange.response}`
    )
    .join("\n\n");
}

function generateProjectSummary(projectData) {
  const context = {
    projectInfo: {
      id: projectData.id,
      name: projectData.name,
      type: projectData.type,
      fileCount: projectData.fileCount,
    },
    summary: {
      totalFiles: projectData.parseResults?.length || 0,
      fileTypes: {},
      totalFunctions: 0,
      totalClasses: 0,
      totalComponents: 0,
    },
    recentActivity: projectData.uploadedAt || projectData.clonedAt,
  };

  // Generate summary statistics
  if (projectData.parseResults) {
    projectData.parseResults.forEach((file) => {
      context.summary.fileTypes[file.extension] =
        (context.summary.fileTypes[file.extension] || 0) + 1;
      context.summary.totalFunctions += file.functions?.length || 0;
      context.summary.totalClasses += file.classes?.length || 0;
      context.summary.totalComponents += file.components?.length || 0;
    });
  }

  return context;
}

async function loadProjectData(projectId) {
  const filePath = path.join(
    __dirname,
    "../data/projects",
    `${projectId}.json`
  );

  if (await fs.pathExists(filePath)) {
    return await fs.readJson(filePath);
  }

  return null;
}

// Also export the router under files routes
export default router;

// Create a separate files router for better organization
export const filesRouter = router;
