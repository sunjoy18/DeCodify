import express from 'express';
import { ChatOpenAI } from '@langchain/openai';
import { OpenAIEmbeddings } from '@langchain/openai';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { Document } from '@langchain/core/documents';
import { RetrievalQAChain } from 'langchain/chains';
import { PromptTemplate } from '@langchain/core/prompts';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

// Initialize OpenAI components lazily
let embeddings, llm;

function initializeOpenAI() {
  if (!embeddings || !llm) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    
    embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: 'text-embedding-3-small'
    });

    llm = new ChatOpenAI({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: 'gpt-4',
      temperature: 0.7
    });
  }
  return { embeddings, llm };
}

// Store vector stores for each project
const projectVectorStores = new Map();

/**
 * Chat with a project's codebase
 */
router.post('/project/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { message, conversationHistory = [] } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Initialize OpenAI components
    const { embeddings: openaiEmbeddings, llm: openaiLLM } = initializeOpenAI();

    // Load or create vector store for the project
    let vectorStore = projectVectorStores.get(projectId);
    if (!vectorStore) {
      vectorStore = await createProjectVectorStore(projectId);
      if (!vectorStore) {
        return res.status(404).json({ error: 'Project not found or no content to analyze' });
      }
      projectVectorStores.set(projectId, vectorStore);
    }

    // Create retrieval chain
    const chain = RetrievalQAChain.fromLLM(openaiLLM, vectorStore.asRetriever({
      k: 5 // Retrieve top 5 relevant documents
    }), {
      prompt: createCodebasePrompt()
    });

    // Generate response
    const response = await chain.call({
      query: message,
      chat_history: formatConversationHistory(conversationHistory)
    });

    res.json({
      success: true,
      response: response.text,
      projectId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ 
      error: 'Failed to process chat message',
      details: error.message 
    });
  }
});

/**
 * Get project context information
 */
router.get('/context/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    
    // Load project data
    const projectData = await loadProjectData(projectId);
    if (!projectData) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Generate context summary
    const context = generateProjectContext(projectData);

    res.json({
      success: true,
      context,
      projectId
    });

  } catch (error) {
    console.error('Context error:', error);
    res.status(500).json({ 
      error: 'Failed to load project context',
      details: error.message 
    });
  }
});

/**
 * Search project files with semantic search
 */
router.post('/search/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { query, limit = 10 } = req.body;

    if (!query || query.trim().length === 0) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    // Load or create vector store for the project
    let vectorStore = projectVectorStores.get(projectId);
    if (!vectorStore) {
      vectorStore = await createProjectVectorStore(projectId);
      if (!vectorStore) {
        return res.status(404).json({ error: 'Project not found' });
      }
      projectVectorStores.set(projectId, vectorStore);
    }

    // Perform semantic search
    const searchResults = await vectorStore.similaritySearchWithScore(query, limit);

    // Format results
    const formattedResults = searchResults.map(([doc, score]) => ({
      content: doc.pageContent,
      metadata: doc.metadata,
      score: score,
      relevance: 1 - score // Convert distance to relevance
    }));

    res.json({
      success: true,
      query,
      results: formattedResults,
      count: formattedResults.length
    });

  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ 
      error: 'Failed to search project',
      details: error.message 
    });
  }
});

/**
 * Clear chat history and vector store for a project
 */
router.delete('/project/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    
    // Remove vector store from memory
    projectVectorStores.delete(projectId);
    
    res.json({
      success: true,
      message: 'Chat history cleared',
      projectId
    });

  } catch (error) {
    console.error('Clear chat error:', error);
    res.status(500).json({ 
      error: 'Failed to clear chat history',
      details: error.message 
    });
  }
});

// Helper functions

async function createProjectVectorStore(projectId) {
  try {
    const projectData = await loadProjectData(projectId);
    if (!projectData || !projectData.parseResults) {
      return null;
    }

    // Create documents from parsed files
    const documents = [];
    
    projectData.parseResults.forEach(file => {
      if (file.error) return; // Skip files with errors

      // Create document for file overview
      const fileDoc = new Document({
        pageContent: createFileDocumentContent(file),
        metadata: {
          type: 'file_overview',
          filePath: file.filePath,
          extension: file.extension,
          size: file.size,
          lines: file.lines
        }
      });
      documents.push(fileDoc);

      // Create documents for functions
      if (file.functions && file.functions.length > 0) {
        file.functions.forEach(func => {
          const funcDoc = new Document({
            pageContent: createFunctionDocumentContent(func, file),
            metadata: {
              type: 'function',
              filePath: file.filePath,
              functionName: func.name,
              functionType: func.type,
              line: func.line
            }
          });
          documents.push(funcDoc);
        });
      }

      // Create documents for classes
      if (file.classes && file.classes.length > 0) {
        file.classes.forEach(cls => {
          const classDoc = new Document({
            pageContent: createClassDocumentContent(cls, file),
            metadata: {
              type: 'class',
              filePath: file.filePath,
              className: cls.name,
              superClass: cls.superClass,
              line: cls.line
            }
          });
          documents.push(classDoc);
        });
      }

      // Create documents for components
      if (file.components && file.components.length > 0) {
        file.components.forEach(comp => {
          const compDoc = new Document({
            pageContent: createComponentDocumentContent(comp, file),
            metadata: {
              type: 'component',
              filePath: file.filePath,
              componentName: comp.name,
              componentType: comp.type,
              line: comp.line
            }
          });
          documents.push(compDoc);
        });
      }
    });

    if (documents.length === 0) {
      return null;
    }

    // Create vector store
    const { embeddings: openaiEmbeddings } = initializeOpenAI();
  const vectorStore = await MemoryVectorStore.fromDocuments(documents, openaiEmbeddings);
    
    return vectorStore;

  } catch (error) {
    console.error('Error creating vector store:', error);
    return null;
  }
}

function createFileDocumentContent(file) {
  let content = `File: ${file.filePath}\n`;
  content += `Type: ${file.extension}\n`;
  content += `Size: ${file.size} bytes, ${file.lines} lines\n\n`;
  
  if (file.dependencies && file.dependencies.length > 0) {
    content += `Dependencies:\n`;
    file.dependencies.forEach(dep => {
      content += `- ${dep.type}: ${dep.source}\n`;
    });
    content += '\n';
  }

  if (file.exports && file.exports.length > 0) {
    content += `Exports:\n`;
    file.exports.forEach(exp => {
      content += `- ${exp.type}: ${exp.name}\n`;
    });
    content += '\n';
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
    content += `Contains: ${summary.join(', ')}\n`;
  }

  return content;
}

function createFunctionDocumentContent(func, file) {
  let content = `Function: ${func.name}\n`;
  content += `File: ${file.filePath}\n`;
  content += `Type: ${func.type}\n`;
  content += `Line: ${func.line}\n`;
  
  if (func.params && func.params.length > 0) {
    content += `Parameters: ${func.params.join(', ')}\n`;
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
    content += `Props: ${comp.props.join(', ')}\n`;
  }
  
  return content;
}

function createCodebasePrompt() {
  return new PromptTemplate({
    template: `You are an expert code analysis assistant. You have access to information about a codebase including files, functions, classes, and components.

Context from the codebase:
{context}

Previous conversation:
{chat_history}

Question: {query}

Please provide a helpful and accurate answer based on the codebase context. Be specific and reference relevant files, functions, or components when possible.

Answer:`,
    inputVariables: ['context', 'chat_history', 'query']
  });
}

function formatConversationHistory(history) {
  if (!history || history.length === 0) {
    return 'No previous conversation.';
  }
  
  return history
    .slice(-5) // Keep only last 5 exchanges
    .map(exchange => `Human: ${exchange.message}\nAssistant: ${exchange.response}`)
    .join('\n\n');
}

function generateProjectContext(projectData) {
  const context = {
    projectInfo: {
      id: projectData.id,
      name: projectData.name,
      type: projectData.type,
      fileCount: projectData.fileCount
    },
    summary: {
      totalFiles: projectData.parseResults?.length || 0,
      fileTypes: {},
      totalFunctions: 0,
      totalClasses: 0,
      totalComponents: 0
    },
    recentActivity: projectData.uploadedAt || projectData.clonedAt
  };

  // Generate summary statistics
  if (projectData.parseResults) {
    projectData.parseResults.forEach(file => {
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
  const filePath = path.join(__dirname, '../data/projects', `${projectId}.json`);
  
  if (await fs.pathExists(filePath)) {
    return await fs.readJson(filePath);
  }
  
  return null;
}

export default router; 