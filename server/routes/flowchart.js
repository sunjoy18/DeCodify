import express from 'express';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import mermaidService from '../services/mermaidService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

/**
 * Generate dependency flowchart for a project
 */
router.get('/dependency/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { 
      direction = 'LR', 
      includeExternal = false, 
      maxNodes = 50,
      groupByDirectory = true 
    } = req.query;

    // Load project data
    const projectData = await loadProjectData(projectId);
    if (!projectData) {
      return res.status(404).json({ error: 'Project not found' });
    }

    console.log('Project data keys:', Object.keys(projectData));
    console.log('Dependency graph:', projectData.dependencyGraph ? 'exists' : 'missing');
    
    if (projectData.dependencyGraph) {
      console.log('Graph nodes:', projectData.dependencyGraph.nodes?.length || 0);
      console.log('Graph edges:', projectData.dependencyGraph.edges?.length || 0);
    }

    // Generate Mermaid DSL
    const options = {
      direction: direction.toUpperCase(),
      includeExternal: includeExternal === 'true',
      maxNodes: parseInt(maxNodes),
      groupByDirectory: groupByDirectory === 'true'
    };

    // Use fallback when: no graph, no nodes, or no edges (improved fallback has real deps from parseResults)
    const hasValidGraph = projectData.dependencyGraph?.nodes?.length > 0;
    const hasEdges = (projectData.dependencyGraph?.edges?.length || 0) > 0;
    if (!hasValidGraph || !hasEdges) {
      const fallbackGraph = generateFallbackGraph(projectData);
      const mermaidDSL = mermaidService.generateFlowchart(fallbackGraph, options);
      
      const validation = mermaidService.validateMermaidDSL(mermaidDSL);
      
      return res.json({
        success: true,
        mermaidDSL,
        validation,
        options,
        nodeCount: fallbackGraph.nodes.length,
        edgeCount: fallbackGraph.edges.length,
        note: 'Generated from file structure (dependency analysis incomplete)'
      });
    }

    // Add shortLabel for cleaner display (strip uploads/uuid prefix)
    const graphWithShortLabels = {
      ...projectData.dependencyGraph,
      nodes: (projectData.dependencyGraph.nodes || []).map(n => ({
        ...n,
        shortLabel: n.shortLabel || getShortLabel(n.id)
      }))
    };

    const mermaidDSL = mermaidService.generateFlowchart(
      graphWithShortLabels, 
      options
    );

    // Validate the generated DSL
    const validation = mermaidService.validateMermaidDSL(mermaidDSL);

    // If invalid, provide a safe fallback diagram with error info
    if (!validation.isValid) {
      const safe = `graph TD\n  A[\"Diagram Generation Error\"] --> B[\"Invalid Mermaid detected\"]\n  B --> C[\"Fallback diagram shown\"]\n  classDef error fill:#ff6b6b,stroke:#c92a2a,color:#fff\n  class A,B,C error`;
      return res.json({
        success: true,
        mermaidDSL: safe,
        validation,
        options,
        nodeCount: projectData.dependencyGraph.nodes.length,
        edgeCount: projectData.dependencyGraph.edges.length,
        note: 'Returned safe fallback due to invalid DSL'
      });
    }

    res.json({
      success: true,
      mermaidDSL,
      validation,
      options,
      nodeCount: projectData.dependencyGraph.nodes.length,
      edgeCount: projectData.dependencyGraph.edges.length
    });

  } catch (error) {
    console.error('Dependency flowchart error:', error);
    res.status(500).json({ 
      error: 'Failed to generate dependency flowchart',
      details: error.message 
    });
  }
});

/**
 * Generate component hierarchy diagram
 */
router.get('/components/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;

    // Load project data
    const projectData = await loadProjectData(projectId);
    if (!projectData) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Generate component diagram
    const mermaidDSL = mermaidService.generateComponentDiagram(
      projectData.parseResults
    );

    // Validate the generated DSL
    const validation = mermaidService.validateMermaidDSL(mermaidDSL);

    if (!validation.isValid) {
      const safe = `graph TD\n  A[\"Diagram Generation Error\"] --> B[\"Invalid Mermaid detected\"]\n  B --> C[\"Fallback diagram shown\"]`;
      return res.json({ success: true, mermaidDSL: safe, validation, componentCount: 0, note: 'Fallback due to invalid DSL' });
    }

    // Count components
    const componentCount = projectData.parseResults.reduce((total, file) => {
      return total + (file.components?.length || 0);
    }, 0);

    res.json({
      success: true,
      mermaidDSL,
      validation,
      componentCount
    });

  } catch (error) {
    console.error('Component diagram error:', error);
    res.status(500).json({ 
      error: 'Failed to generate component diagram',
      details: error.message 
    });
  }
});

/**
 * Generate function call graph
 */
router.get('/functions/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;

    // Load project data
    const projectData = await loadProjectData(projectId);
    if (!projectData) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Generate function diagram
    const mermaidDSL = mermaidService.generateFunctionCallGraph(
      projectData.parseResults
    );

    // Validate the generated DSL
    const validation = mermaidService.validateMermaidDSL(mermaidDSL);
    if (!validation.isValid) {
      const safe = `graph TD\n  A[\"Diagram Generation Error\"] --> B[\"Invalid Mermaid detected\"]`;
      return res.json({ success: true, mermaidDSL: safe, validation, functionCount: 0, note: 'Fallback due to invalid DSL' });
    }

    // Count functions
    const functionCount = projectData.parseResults.reduce((total, file) => {
      return total + (file.functions?.length || 0);
    }, 0);

    res.json({
      success: true,
      mermaidDSL,
      validation,
      functionCount
    });

  } catch (error) {
    console.error('Function diagram error:', error);
    res.status(500).json({ 
      error: 'Failed to generate function diagram',
      details: error.message 
    });
  }
});

/**
 * Generate class diagram
 */
router.get('/classes/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;

    // Load project data
    const projectData = await loadProjectData(projectId);
    if (!projectData) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Generate class diagram
    const mermaidDSL = mermaidService.generateClassDiagram(
      projectData.parseResults
    );

    // Validate the generated DSL
    const validation = mermaidService.validateMermaidDSL(mermaidDSL);
    if (!validation.isValid) {
      const safe = `classDiagram\n  class Error {\n    +message \"Invalid Mermaid detected\"\n  }`;
      return res.json({ success: true, mermaidDSL: safe, validation, classCount: 0, note: 'Fallback due to invalid DSL' });
    }

    // Count classes
    const classCount = projectData.parseResults.reduce((total, file) => {
      return total + (file.classes?.length || 0);
    }, 0);

    res.json({
      success: true,
      mermaidDSL,
      validation,
      classCount
    });

  } catch (error) {
    console.error('Class diagram error:', error);
    res.status(500).json({ 
      error: 'Failed to generate class diagram',
      details: error.message 
    });
  }
});

/**
 * Generate sequence diagram
 */
router.get('/sequence/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { component = null } = req.query;

    // Load project data
    const projectData = await loadProjectData(projectId);
    if (!projectData) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Generate sequence diagram
    const mermaidDSL = mermaidService.generateSequenceDiagram(
      projectData.parseResults,
      component
    );

    // Validate the generated DSL
    const validation = mermaidService.validateMermaidDSL(mermaidDSL);
    if (!validation.isValid) {
      const safe = `sequenceDiagram\n  participant A as Error\n  A->>A: Invalid Mermaid detected`;
      return res.json({ success: true, mermaidDSL: safe, validation, targetComponent: component, note: 'Fallback due to invalid DSL' });
    }

    res.json({
      success: true,
      mermaidDSL,
      validation,
      targetComponent: component
    });

  } catch (error) {
    console.error('Sequence diagram error:', error);
    res.status(500).json({ 
      error: 'Failed to generate sequence diagram',
      details: error.message 
    });
  }
});

/**
 * Get available diagram types for a project
 */
router.get('/types/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;

    // Load project data
    const projectData = await loadProjectData(projectId);
    if (!projectData) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Analyze what diagram types are available
    const types = analyzeAvailableDiagramTypes(projectData.parseResults);

    res.json({
      success: true,
      availableTypes: types,
      project: {
        id: projectData.id,
        name: projectData.name,
        fileCount: projectData.fileCount
      }
    });

  } catch (error) {
    console.error('Get diagram types error:', error);
    res.status(500).json({ 
      error: 'Failed to analyze available diagram types',
      details: error.message 
    });
  }
});

/**
 * Generate custom Mermaid diagram based on filters
 */
router.post('/custom/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { 
      diagramType = 'flowchart',
      filters = {},
      options = {}
    } = req.body;

    // Load project data
    const projectData = await loadProjectData(projectId);
    if (!projectData) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Apply filters to parse results
    const filteredResults = applyFilters(projectData.parseResults, filters);

    let mermaidDSL;
    switch (diagramType) {
      case 'dependency':
        const filteredGraph = filterDependencyGraph(projectData.dependencyGraph, filters);
        mermaidDSL = mermaidService.generateFlowchart(filteredGraph, options);
        break;
      case 'components':
        mermaidDSL = mermaidService.generateComponentDiagram(filteredResults);
        break;
      case 'functions':
        mermaidDSL = mermaidService.generateFunctionCallGraph(filteredResults);
        break;
      case 'classes':
        mermaidDSL = mermaidService.generateClassDiagram(filteredResults);
        break;
      case 'sequence':
        mermaidDSL = mermaidService.generateSequenceDiagram(filteredResults, options.targetComponent);
        break;
      default:
        return res.status(400).json({ error: 'Invalid diagram type' });
    }

    // Validate the generated DSL
    const validation = mermaidService.validateMermaidDSL(mermaidDSL);

    res.json({
      success: true,
      mermaidDSL,
      validation,
      diagramType,
      filters,
      options,
      filteredFileCount: filteredResults.length
    });

  } catch (error) {
    console.error('Custom diagram error:', error);
    res.status(500).json({ 
      error: 'Failed to generate custom diagram',
      details: error.message 
    });
  }
});

// Helper functions

async function loadProjectData(projectId) {
  const filePath = path.join(__dirname, '../data/projects', `${projectId}.json`);
  
  if (await fs.pathExists(filePath)) {
    return await fs.readJson(filePath);
  }
  
  return null;
}

/**
 * Normalize path for cross-platform comparison
 */
function normalizePath(filePath) {
  if (!filePath) return '';
  return String(filePath).replace(/\\/g, '/');
}

/**
 * Resolve dependency to a file in the parsed results
 */
function resolveDepToFile(fromFilePath, depSource, files) {
  const normFrom = normalizePath(fromFilePath);
  const fromDir = path.dirname(normFrom).replace(/\\/g, '/');
  const base = depSource.replace(/^\.\//, '');

  const extensions = ['', '.js', '.jsx', '.ts', '.tsx', '.css', '.html', '.vue'];
  for (const ext of extensions) {
    const candidate = (fromDir + '/' + base + ext).replace(/\/+/g, '/');
    const match = files.find(f => normalizePath(f.filePath || f.path) === candidate);
    if (match) return match.filePath || match.path;
  }
  return null;
}

/**
 * Get a short, human-readable label (strip uploads/uuid prefix)
 */
function getShortLabel(filePath) {
  const norm = normalizePath(filePath || '');
  // Remove uploads/uuid/ prefix for cleaner display
  const match = norm.match(/uploads\/[a-f0-9-]+\/(.+)$/i) || norm.match(/(?:src|lib|components)\/(.+)$/);
  return match ? match[1] : path.basename(filePath);
}

function generateFallbackGraph(projectData) {
  const graph = {
    nodes: [],
    edges: []
  };

  const files = projectData.parseResults || projectData.files || [];
  const pathToNode = new Map();
  const seenPaths = new Set();

  // Build nodes with short labels, deduplicate
  files.forEach(file => {
    const filePath = normalizePath(file.filePath || file.path || file.name || '');
    if (!filePath || seenPaths.has(filePath)) return;
    seenPaths.add(filePath);

    const shortLabel = getShortLabel(filePath);
    const node = {
      id: filePath,
      label: shortLabel,
      shortLabel,
      type: path.extname(filePath) || file.extension || '',
      size: file.size || 0,
      functions: file.functions?.length || 0,
      classes: file.classes?.length || 0,
      components: file.components?.length || 0
    };
    graph.nodes.push(node);
    pathToNode.set(filePath, node);
  });

  // Build edges from ACTUAL dependencies in parseResults (deduplicated)
  const edgeKeys = new Set();
  files.forEach(file => {
    const fromPath = normalizePath(file.filePath || file.path || '');
    if (!pathToNode.has(fromPath)) return;

    (file.dependencies || []).forEach(dep => {
      if (dep.external) return;
      const toPath = resolveDepToFile(fromPath, dep.source, files);
      const normTo = toPath ? normalizePath(toPath) : '';
      if (normTo && pathToNode.has(normTo) && normTo !== fromPath) {
        const key = `${fromPath}->${normTo}`;
        if (!edgeKeys.has(key)) {
          edgeKeys.add(key);
          graph.edges.push({
            from: fromPath,
            to: normTo,
            type: dep.type || 'import',
            label: dep.source
          });
        }
      }
    });
  });

  return graph;
}

function analyzeAvailableDiagramTypes(parseResults) {
  const types = [];
  
  let hasDependencies = false;
  let hasComponents = false;
  let hasFunctions = false;
  let hasClasses = false;

  parseResults.forEach(file => {
    if (file.dependencies && file.dependencies.length > 0) {
      hasDependencies = true;
    }
    if (file.components && file.components.length > 0) {
      hasComponents = true;
    }
    if (file.functions && file.functions.length > 0) {
      hasFunctions = true;
    }
    if (file.classes && file.classes.length > 0) {
      hasClasses = true;
    }
  });

  if (hasDependencies) {
    types.push({
      type: 'dependency',
      name: 'Dependency Graph',
      description: 'Shows file dependencies and imports',
      available: true
    });
  }

  if (hasComponents) {
    types.push({
      type: 'components',
      name: 'Component Hierarchy',
      description: 'Shows React/Vue component relationships',
      available: true
    });
    
    types.push({
      type: 'sequence',
      name: 'Sequence Diagram',
      description: 'Shows component interaction flow',
      available: true
    });
  }

  if (hasFunctions) {
    types.push({
      type: 'functions',
      name: 'Function Call Graph',
      description: 'Shows function relationships',
      available: true
    });
  }

  if (hasClasses) {
    types.push({
      type: 'classes',
      name: 'Class Diagram',
      description: 'Shows class inheritance and structure',
      available: true
    });
  }

  return types;
}

function applyFilters(parseResults, filters) {
  let filtered = [...parseResults];

  // Filter by file extension
  if (filters.extensions && filters.extensions.length > 0) {
    filtered = filtered.filter(file => 
      filters.extensions.includes(file.extension)
    );
  }

  // Filter by file path pattern
  if (filters.pathPattern) {
    const pattern = new RegExp(filters.pathPattern, 'i');
    filtered = filtered.filter(file => 
      pattern.test(file.filePath)
    );
  }

  // Filter by minimum function count
  if (filters.minFunctions) {
    filtered = filtered.filter(file => 
      (file.functions?.length || 0) >= filters.minFunctions
    );
  }

  // Filter by component presence
  if (filters.hasComponents === true) {
    filtered = filtered.filter(file => 
      file.components && file.components.length > 0
    );
  }

  return filtered;
}

function filterDependencyGraph(graph, filters) {
  let filteredNodes = [...graph.nodes];
  
  // Apply node filters
  if (filters.extensions && filters.extensions.length > 0) {
    filteredNodes = filteredNodes.filter(node => 
      filters.extensions.includes(node.type)
    );
  }

  // Filter edges to only include those between remaining nodes
  const nodeIds = new Set(filteredNodes.map(n => n.id));
  const filteredEdges = graph.edges.filter(edge => 
    nodeIds.has(edge.from) && nodeIds.has(edge.to)
  );

  return {
    nodes: filteredNodes,
    edges: filteredEdges
  };
}

export default router; 