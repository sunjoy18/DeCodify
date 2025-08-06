import express from 'express';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

/**
 * Get detailed file analysis for a project
 */
router.get('/files/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { 
      extension = null, 
      hasErrors = null, 
      minSize = null,
      sortBy = 'size' 
    } = req.query;

    // Load project data
    const projectData = await loadProjectData(projectId);
    if (!projectData) {
      return res.status(404).json({ error: 'Project not found' });
    }

    let files = [...projectData.parseResults];

    // Apply filters
    if (extension) {
      files = files.filter(file => file.extension === extension);
    }

    if (hasErrors !== null) {
      const hasErrorsBoolean = hasErrors === 'true';
      files = files.filter(file => 
        hasErrorsBoolean ? (file.errors && file.errors.length > 0) : (!file.errors || file.errors.length === 0)
      );
    }

    if (minSize) {
      files = files.filter(file => file.size >= parseInt(minSize));
    }

    // Sort files
    files.sort((a, b) => {
      switch (sortBy) {
        case 'size':
          return b.size - a.size;
        case 'lines':
          return b.lines - a.lines;
        case 'functions':
          return (b.functions?.length || 0) - (a.functions?.length || 0);
        case 'name':
          return a.filePath.localeCompare(b.filePath);
        default:
          return 0;
      }
    });

    res.json({
      success: true,
      files,
      count: files.length,
      filters: { extension, hasErrors, minSize, sortBy }
    });

  } catch (error) {
    console.error('File analysis error:', error);
    res.status(500).json({ 
      error: 'Failed to analyze files',
      details: error.message 
    });
  }
});

/**
 * Get dependency analysis
 */
router.get('/dependencies/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;

    // Load project data
    const projectData = await loadProjectData(projectId);
    if (!projectData) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const analysis = analyzeDependencies(projectData.parseResults);

    res.json({
      success: true,
      ...analysis
    });

  } catch (error) {
    console.error('Dependency analysis error:', error);
    res.status(500).json({ 
      error: 'Failed to analyze dependencies',
      details: error.message 
    });
  }
});

/**
 * Get code metrics
 */
router.get('/metrics/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;

    // Load project data
    const projectData = await loadProjectData(projectId);
    if (!projectData) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const metrics = calculateCodeMetrics(projectData.parseResults);

    res.json({
      success: true,
      metrics
    });

  } catch (error) {
    console.error('Code metrics error:', error);
    res.status(500).json({ 
      error: 'Failed to calculate code metrics',
      details: error.message 
    });
  }
});

/**
 * Get function analysis
 */
router.get('/functions/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { 
      sortBy = 'complexity',
      filterType = null,
      minParams = null 
    } = req.query;

    // Load project data
    const projectData = await loadProjectData(projectId);
    if (!projectData) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const analysis = analyzeFunctions(projectData.parseResults, {
      sortBy,
      filterType,
      minParams: minParams ? parseInt(minParams) : null
    });

    res.json({
      success: true,
      ...analysis
    });

  } catch (error) {
    console.error('Function analysis error:', error);
    res.status(500).json({ 
      error: 'Failed to analyze functions',
      details: error.message 
    });
  }
});

/**
 * Get component analysis
 */
router.get('/components/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;

    // Load project data
    const projectData = await loadProjectData(projectId);
    if (!projectData) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const analysis = analyzeComponents(projectData.parseResults);

    res.json({
      success: true,
      ...analysis
    });

  } catch (error) {
    console.error('Component analysis error:', error);
    res.status(500).json({ 
      error: 'Failed to analyze components',
      details: error.message 
    });
  }
});

/**
 * Get issues and warnings
 */
router.get('/issues/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;

    // Load project data
    const projectData = await loadProjectData(projectId);
    if (!projectData) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const issues = findCodeIssues(projectData.parseResults);

    res.json({
      success: true,
      issues,
      totalIssues: issues.reduce((sum, category) => sum + category.count, 0)
    });

  } catch (error) {
    console.error('Issues analysis error:', error);
    res.status(500).json({ 
      error: 'Failed to analyze issues',
      details: error.message 
    });
  }
});

// Helper functions

function analyzeDependencies(parseResults) {
  const externalDeps = new Set();
  const internalDeps = [];
  const dependencyTypes = {};
  const fileGraph = new Map();

  parseResults.forEach(file => {
    if (!file.dependencies) return;

    file.dependencies.forEach(dep => {
      if (dep.external) {
        externalDeps.add(dep.source);
      } else {
        internalDeps.push({
          from: file.filePath,
          to: dep.source,
          type: dep.type
        });
      }

      dependencyTypes[dep.type] = (dependencyTypes[dep.type] || 0) + 1;
    });

    // Build dependency graph
    if (!fileGraph.has(file.filePath)) {
      fileGraph.set(file.filePath, { incoming: 0, outgoing: 0 });
    }
    fileGraph.get(file.filePath).outgoing += file.dependencies.length;
  });

  // Calculate incoming dependencies
  internalDeps.forEach(dep => {
    const resolved = resolveInternalDependency(dep.to, parseResults);
    if (resolved) {
      if (!fileGraph.has(resolved)) {
        fileGraph.set(resolved, { incoming: 0, outgoing: 0 });
      }
      fileGraph.get(resolved).incoming += 1;
    }
  });

  return {
    externalDependencies: Array.from(externalDeps).sort(),
    internalDependencies: internalDeps,
    dependencyTypes,
    dependencyGraph: Array.from(fileGraph.entries()).map(([file, counts]) => ({
      file,
      ...counts
    }))
  };
}

function calculateCodeMetrics(parseResults) {
  const metrics = {
    totalFiles: parseResults.length,
    totalLines: 0,
    totalSize: 0,
    fileTypes: {},
    complexity: {
      totalFunctions: 0,
      totalClasses: 0,
      totalComponents: 0,
      avgFunctionsPerFile: 0,
      avgLinesPerFile: 0
    },
    quality: {
      filesWithErrors: 0,
      errorRate: 0,
      duplicateNames: {
        functions: [],
        classes: [],
        components: []
      }
    }
  };

  const functionNames = new Map();
  const classNames = new Map();
  const componentNames = new Map();

  parseResults.forEach(file => {
    metrics.totalLines += file.lines || 0;
    metrics.totalSize += file.size || 0;
    metrics.fileTypes[file.extension] = (metrics.fileTypes[file.extension] || 0) + 1;

    if (file.errors && file.errors.length > 0) {
      metrics.quality.filesWithErrors++;
    }

    // Count functions, classes, components
    if (file.functions) {
      metrics.complexity.totalFunctions += file.functions.length;
      file.functions.forEach(func => {
        const existing = functionNames.get(func.name) || [];
        existing.push(file.filePath);
        functionNames.set(func.name, existing);
      });
    }

    if (file.classes) {
      metrics.complexity.totalClasses += file.classes.length;
      file.classes.forEach(cls => {
        const existing = classNames.get(cls.name) || [];
        existing.push(file.filePath);
        classNames.set(cls.name, existing);
      });
    }

    if (file.components) {
      metrics.complexity.totalComponents += file.components.length;
      file.components.forEach(comp => {
        const existing = componentNames.get(comp.name) || [];
        existing.push(file.filePath);
        componentNames.set(comp.name, existing);
      });
    }
  });

  // Calculate averages
  metrics.complexity.avgFunctionsPerFile = metrics.totalFiles > 0 ? 
    Math.round((metrics.complexity.totalFunctions / metrics.totalFiles) * 100) / 100 : 0;
  metrics.complexity.avgLinesPerFile = metrics.totalFiles > 0 ? 
    Math.round((metrics.totalLines / metrics.totalFiles) * 100) / 100 : 0;

  // Calculate error rate
  metrics.quality.errorRate = metrics.totalFiles > 0 ? 
    Math.round((metrics.quality.filesWithErrors / metrics.totalFiles) * 10000) / 100 : 0;

  // Find duplicates
  functionNames.forEach((files, name) => {
    if (files.length > 1) {
      metrics.quality.duplicateNames.functions.push({ name, files });
    }
  });

  classNames.forEach((files, name) => {
    if (files.length > 1) {
      metrics.quality.duplicateNames.classes.push({ name, files });
    }
  });

  componentNames.forEach((files, name) => {
    if (files.length > 1) {
      metrics.quality.duplicateNames.components.push({ name, files });
    }
  });

  return metrics;
}

function analyzeFunctions(parseResults, options = {}) {
  const functions = [];
  
  parseResults.forEach(file => {
    if (!file.functions) return;
    
    file.functions.forEach(func => {
      functions.push({
        ...func,
        file: file.filePath,
        fileExtension: file.extension,
        complexity: estimateComplexity(func)
      });
    });
  });

  // Apply filters
  let filtered = functions;
  if (options.filterType) {
    filtered = filtered.filter(func => func.type === options.filterType);
  }
  if (options.minParams) {
    filtered = filtered.filter(func => (func.params?.length || 0) >= options.minParams);
  }

  // Sort functions
  filtered.sort((a, b) => {
    switch (options.sortBy) {
      case 'complexity':
        return b.complexity - a.complexity;
      case 'params':
        return (b.params?.length || 0) - (a.params?.length || 0);
      case 'name':
        return a.name.localeCompare(b.name);
      default:
        return 0;
    }
  });

  return {
    functions: filtered,
    total: functions.length,
    filtered: filtered.length,
    typeDistribution: getTypeDistribution(functions, 'type'),
    complexityStats: getComplexityStats(functions)
  };
}

function analyzeComponents(parseResults) {
  const components = [];
  
  parseResults.forEach(file => {
    if (!file.components) return;
    
    file.components.forEach(comp => {
      components.push({
        ...comp,
        file: file.filePath,
        fileExtension: file.extension
      });
    });
  });

  return {
    components,
    total: components.length,
    typeDistribution: getTypeDistribution(components, 'type'),
    fileDistribution: getTypeDistribution(components, 'fileExtension')
  };
}

function findCodeIssues(parseResults) {
  const issues = [
    { type: 'Parse Errors', items: [], count: 0 },
    { type: 'Large Files', items: [], count: 0 },
    { type: 'Long Functions', items: [], count: 0 },
    { type: 'Unused Exports', items: [], count: 0 },
    { type: 'Missing Dependencies', items: [], count: 0 }
  ];

  parseResults.forEach(file => {
    // Parse errors
    if (file.errors && file.errors.length > 0) {
      file.errors.forEach(error => {
        issues[0].items.push({
          file: file.filePath,
          message: error.message,
          line: error.line,
          severity: 'error'
        });
        issues[0].count++;
      });
    }

    // Large files (>500 lines)
    if (file.lines > 500) {
      issues[1].items.push({
        file: file.filePath,
        lines: file.lines,
        message: `File is ${file.lines} lines long`,
        severity: 'warning'
      });
      issues[1].count++;
    }

    // Functions with many parameters (>5)
    if (file.functions) {
      file.functions.forEach(func => {
        if (func.params && func.params.length > 5) {
          issues[2].items.push({
            file: file.filePath,
            function: func.name,
            params: func.params.length,
            line: func.line,
            message: `Function has ${func.params.length} parameters`,
            severity: 'warning'
          });
          issues[2].count++;
        }
      });
    }
  });

  return issues;
}

function estimateComplexity(func) {
  let complexity = 1; // Base complexity
  
  // Add complexity for parameters
  complexity += (func.params?.length || 0) * 0.5;
  
  // Add complexity for async functions
  if (func.async) complexity += 1;
  
  // Add complexity for generators
  if (func.generator) complexity += 1;
  
  return Math.round(complexity * 10) / 10;
}

function getTypeDistribution(items, field) {
  const distribution = {};
  items.forEach(item => {
    const value = item[field] || 'unknown';
    distribution[value] = (distribution[value] || 0) + 1;
  });
  return distribution;
}

function getComplexityStats(functions) {
  if (functions.length === 0) return { min: 0, max: 0, avg: 0 };
  
  const complexities = functions.map(f => f.complexity || 0);
  return {
    min: Math.min(...complexities),
    max: Math.max(...complexities),
    avg: Math.round((complexities.reduce((sum, c) => sum + c, 0) / complexities.length) * 100) / 100
  };
}

function resolveInternalDependency(depSource, parseResults) {
  // Simple resolution - in a real implementation, this would be more sophisticated
  const possiblePaths = [
    depSource,
    depSource + '.js',
    depSource + '.jsx',
    depSource + '.ts',
    depSource + '.tsx',
    depSource + '/index.js',
    depSource + '/index.jsx',
    depSource + '/index.ts',
    depSource + '/index.tsx'
  ];
  
  for (const file of parseResults) {
    for (const possiblePath of possiblePaths) {
      if (file.filePath.endsWith(possiblePath)) {
        return file.filePath;
      }
    }
  }
  
  return null;
}

async function loadProjectData(projectId) {
  const filePath = path.join(__dirname, '../data/projects', `${projectId}.json`);
  
  if (await fs.pathExists(filePath)) {
    return await fs.readJson(filePath);
  }
  
  return null;
}

export default router; 