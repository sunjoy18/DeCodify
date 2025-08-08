/**
 * Mermaid Service for generating flowcharts from dependency graphs
 */
class MermaidService {
  constructor() {
    // Logical shape types; actual Mermaid syntax is constructed centrally to avoid nesting
    this.nodeShapes = {
      '.js': 'square',
      '.jsx': 'round',
      '.ts': 'diamond',
      '.tsx': 'round',
      '.html': 'subroutine',
      '.css': 'circle',
      '.vue': 'square',
      'default': 'square'
    };

    this.edgeTypes = {
      'import': '-->',
      'require': '-.->',
      'dynamic': '==>',
      'script': '-->',
      'stylesheet': '-.->',
      'css_import': '-.->',
      'default': '-->'
    };
  }

  /**
   * Generate Mermaid DSL from dependency graph
   */
  generateFlowchart(graph, options = {}) {
    const {
      direction = 'LR',
      includeExternal = false,
      maxNodes = 50,
      groupByDirectory = true
    } = options;

    console.log('Generating flowchart with graph:', {
      nodeCount: graph?.nodes?.length || 0,
      edgeCount: graph?.edges?.length || 0,
      options
    });

    let mermaidDSL = `graph ${direction}\n`;
    
    // Check if graph has nodes
    if (!graph || !graph.nodes || graph.nodes.length === 0) {
      console.log('No nodes found in graph');
      mermaidDSL += '  %% No files found to display\n';
      mermaidDSL += '  A[No files found]\n';
      mermaidDSL += this.generateStyling();
      return mermaidDSL;
    }
    
    // Filter nodes if needed
    let nodes = graph.nodes;
    if (!includeExternal) {
      nodes = nodes.filter(node => !this.isExternalNode(node));
    }
    
    console.log('Filtered nodes count:', nodes.length);
    
    // Limit nodes for performance
    if (nodes.length > maxNodes) {
      nodes = nodes.slice(0, maxNodes);
    }

    // Generate node definitions
    const nodeDefinitions = this.generateNodeDefinitions(nodes, groupByDirectory);
    mermaidDSL += nodeDefinitions;

    // Generate edges
    const edges = this.filterEdges(graph.edges || [], nodes);
    const edgeDefinitions = this.generateEdgeDefinitions(edges);
    mermaidDSL += edgeDefinitions;
    
    // If no edges but we have nodes, add a note
    if (nodes.length > 0 && (!edges || edges.length === 0)) {
      mermaidDSL += '\n  %% No dependencies found between files\n';
      // Create a simple visual connection for standalone files
      if (nodes.length > 1) {
        for (let i = 0; i < Math.min(3, nodes.length - 1); i++) {
          const from = this.sanitizeId(nodes[i].id);
          const to = this.sanitizeId(nodes[i + 1].id);
          mermaidDSL += `  ${from} -.-> ${to}\n`;
        }
      }
    }

    // Add styling
    mermaidDSL += this.generateStyling();

    // Normalize any legacy nested shape artifacts
    return this.normalizeShapes(mermaidDSL);
  }

  /**
   * Generate node definitions with proper shapes and labels
   */
  generateNodeDefinitions(nodes, groupByDirectory = true) {
    let definitions = '';
    const nodeGroups = groupByDirectory ? this.groupNodesByDirectory(nodes) : { '': nodes };

    Object.entries(nodeGroups).forEach(([directory, groupNodes]) => {
      if (directory && groupByDirectory) {
        definitions += `\n  subgraph "${this.sanitizeId(directory)}"\n`;
      }

      groupNodes.forEach(node => {
        const nodeId = this.sanitizeId(node.id);
        const label = this.generateNodeLabel(node);
        const shapeType = this.getNodeShape(node);
        const nodeSyntax = this.formatNodeByShape(label, shapeType);
        definitions += `    ${nodeId}${nodeSyntax}\n`;
      });

      if (directory && groupByDirectory) {
        definitions += '  end\n';
      }
    });

    return definitions;
  }

  /**
   * Generate edge definitions
   */
  generateEdgeDefinitions(edges) {
    let definitions = '\n';
    
    edges.forEach(edge => {
      const fromId = this.sanitizeId(edge.from);
      const toId = this.sanitizeId(edge.to);
      const edgeType = this.edgeTypes[edge.type] || this.edgeTypes.default;
      const label = edge.label ? `|${this.sanitizeEdgeLabel(edge.label)}|` : '';
      
      definitions += `  ${fromId} ${edgeType}${label} ${toId}\n`;
    });

    return definitions;
  }

  /**
   * Generate styling for different node types
   */
  generateStyling() {
    return `
  %% Styling
  classDef jsFile fill:#f9f,stroke:#333,stroke-width:2px
  classDef tsFile fill:#bbf,stroke:#333,stroke-width:2px
  classDef htmlFile fill:#bfb,stroke:#333,stroke-width:2px
  classDef cssFile fill:#fbb,stroke:#333,stroke-width:2px
  classDef vueFile fill:#bff,stroke:#333,stroke-width:2px
  
  %% Apply classes (this would be dynamically generated)
`;
  }

  /**
   * Group nodes by their directory path
   */
  groupNodesByDirectory(nodes) {
    const groups = {};
    
    nodes.forEach(node => {
      const parts = node.id.split('/');
      const directory = parts.slice(0, -1).join('/') || 'root';
      
      if (!groups[directory]) {
        groups[directory] = [];
      }
      groups[directory].push(node);
    });

    return groups;
  }

  /**
   * Get appropriate shape for node based on file type
   */
  getNodeShape(node) {
    return this.nodeShapes[node.type] || this.nodeShapes.default;
  }

  /**
   * Generate a descriptive label for the node
   */
  generateNodeLabel(node) {
    let label = node.label || 'Unknown';
    
    // Sanitize label for Mermaid
    label = label.replace(/["\\\n\r\t]/g, ' ').trim();
    
    // Add metadata if available (without newlines or parentheses)
    const metadata = [];
    if (node.functions > 0) metadata.push(`${node.functions}f`);
    if (node.classes > 0) metadata.push(`${node.classes}c`);
    if (node.components > 0) metadata.push(`${node.components}comp`);
    
    if (metadata.length > 0) {
      label += ` [${metadata.join(',')}]`;
    }

    // Ensure label is not too long and contains only safe characters
    return label.substring(0, 60).replace(/[^a-zA-Z0-9\s\-_\[\],\.]/g, '');
  }

  /**
   * Sanitize ID for Mermaid compatibility
   */
  sanitizeId(id) {
    if (!id) return 'undefined_id';
    
    return String(id)
      .replace(/\\/g, '_') // Replace backslashes
      .replace(/\//g, '_') // Replace forward slashes
      .replace(/[^a-zA-Z0-9_]/g, '_') // Replace all other non-alphanumeric chars
      .replace(/_+/g, '_') // Replace multiple underscores with single
      .replace(/^(\d)/, '_$1') // Ensure it doesn't start with a number
      .replace(/^_+/, '') // Remove leading underscores
      .replace(/_+$/, '') // Remove trailing underscores
      .substring(0, 50) || 'id'; // Limit length and ensure non-empty
  }

  /**
   * Sanitize edge label text for Mermaid
   */
  sanitizeEdgeLabel(label) {
    return String(label)
      .replace(/[\n\r\t]/g, ' ')
      .replace(/[|]/g, '/')
      .replace(/[{}\[\]()]/g, '')
      .trim()
      .substring(0, 50);
  }

  /**
   * Build Mermaid node syntax by shape type without nested shapes.
   */
  formatNodeByShape(label, shapeType) {
    const quotedLabel = `"${label}"`;
    switch (shapeType) {
      case 'round':
        return `(${quotedLabel})`;
      case 'circle':
        return `(((${quotedLabel})))`;
      case 'subroutine':
        return `[[${quotedLabel}]]`;
      case 'diamond':
        // Mermaid decision shape uses curly braces
        return `{${quotedLabel}}`;
      case 'square':
      default:
        return `[${quotedLabel}]`;
    }
  }

  /**
   * Check if a node represents an external dependency
   */
  isExternalNode(node) {
    // Check for external markers
    if (node.external === true) {
      return true;
    }
    
    // Check for node_modules
    if (node.id.includes('node_modules')) {
      return true;
    }
    
    // Check for common external package patterns
    const id = node.id.toLowerCase();
    const externalPatterns = [
      'react',
      'vue',
      'angular',
      'lodash',
      'axios',
      'express',
      'node:',
      '@',
      'npm:',
      'http://',
      'https://'
    ];
    
    // If the id is just a package name (no path separators), it's likely external
    if (!id.includes('/') && !id.includes('\\') && !id.includes('.')) {
      return true;
    }
    
    // Check against known external patterns
    return externalPatterns.some(pattern => id.includes(pattern));
  }

  /**
   * Filter edges to only include those between valid nodes
   */
  filterEdges(edges, validNodes) {
    const validNodeIds = new Set(validNodes.map(n => n.id));
    return edges.filter(edge => 
      validNodeIds.has(edge.from) && validNodeIds.has(edge.to)
    );
  }

  /**
   * Generate a component hierarchy diagram
   */
  generateComponentDiagram(parsedFiles) {
    const components = [];
    
    parsedFiles.forEach(file => {
      if (file.components) {
        file.components.forEach(comp => {
          components.push({
            id: `${file.filePath}:${comp.name}`,
            name: comp.name,
            type: comp.type,
            file: file.filePath,
            props: comp.props || []
          });
        });
      }
    });

    let mermaidDSL = 'graph TD\n';
    
    // If no components found, create placeholder
    if (components.length === 0) {
      mermaidDSL += '  A[No React Components Found]\n';
      mermaidDSL += '  B[Upload a React/Vue project]\n';
      mermaidDSL += '  C[to see component hierarchy]\n';
      mermaidDSL += '  A --> B\n';
      mermaidDSL += '  B --> C\n';
      mermaidDSL += '  classDef placeholder fill:#f9f,stroke:#333,stroke-width:2px\n';
      mermaidDSL += '  class A,B,C placeholder\n';
      return mermaidDSL;
    }
    
    components.forEach(comp => {
      const nodeId = this.sanitizeId(comp.id);
      const label = `"${comp.name} [${comp.type}]"`;
      mermaidDSL += `  ${nodeId}[${label}]\n`;
    });

    // Add component relationships based on file dependencies
    parsedFiles.forEach(file => {
      if (file.dependencies) {
        file.dependencies.forEach(dep => {
          const sourceComps = components.filter(c => c.file === file.filePath);
          const targetFile = parsedFiles.find(f => f.filePath.includes(dep.source));
          
          if (targetFile) {
            const targetComps = components.filter(c => c.file === targetFile.filePath);
            
            sourceComps.forEach(sourceComp => {
              targetComps.forEach(targetComp => {
                const fromId = this.sanitizeId(sourceComp.id);
                const toId = this.sanitizeId(targetComp.id);
                mermaidDSL += `  ${fromId} --> ${toId}\n`;
              });
            });
          }
        });
      }
    });

    // Add styling
    mermaidDSL += '  classDef component fill:#61dafb,stroke:#21759b,color:#000\n';
    components.forEach(comp => {
      const nodeId = this.sanitizeId(comp.id);
      mermaidDSL += `  class ${nodeId} component\n`;
    });

    return this.normalizeShapes(mermaidDSL);
  }

  /**
   * Generate a function call graph
   */
  generateFunctionCallGraph(parsedFiles) {
    const functions = [];
    
    parsedFiles.forEach(file => {
      if (file.functions) {
        file.functions.forEach(func => {
          functions.push({
            id: `${file.filePath}:${func.name}`,
            name: func.name,
            type: func.type,
            file: file.filePath,
            params: func.params || [],
            complexity: func.complexity || 1
          });
        });
      }
    });

    let mermaidDSL = 'graph LR\n';
    
    // If no functions found, create placeholder
    if (functions.length === 0) {
      mermaidDSL += '  A[No Functions Found]\n';
      mermaidDSL += '  B[Upload a project with]\n';
      mermaidDSL += '  C[JavaScript/TypeScript functions]\n';
      mermaidDSL += '  A --> B --> C\n';
      mermaidDSL += '  classDef placeholder fill:#ffa726,stroke:#f57400,color:#fff\n';
      mermaidDSL += '  class A,B,C placeholder\n';
      return mermaidDSL;
    }
    
    // Limit to first 20 functions for readability
    const limitedFunctions = functions.slice(0, 20);
    
    limitedFunctions.forEach(func => {
      const nodeId = this.sanitizeId(func.id);
      const label = `"${func.name}()"`;
      const shape = func.type === 'arrow_function' ? '(())' : '[]';
      
      mermaidDSL += `  ${nodeId}${shape.replace('[]', `[${label}]`).replace('(())', `((${label}))`)}\n`;
    });

    // Add some basic connections between functions (simplified heuristic)
    const mainFunctions = limitedFunctions.filter(f => 
      f.name.toLowerCase().includes('main') || 
      f.name.toLowerCase().includes('init') ||
      f.name.toLowerCase().includes('start')
    );
    
    if (mainFunctions.length > 0) {
      const mainFunc = mainFunctions[0];
      const otherFunctions = limitedFunctions.filter(f => f.id !== mainFunc.id).slice(0, 5);
      
      otherFunctions.forEach(func => {
        const fromId = this.sanitizeId(mainFunc.id);
        const toId = this.sanitizeId(func.id);
        mermaidDSL += `  ${fromId} --> ${toId}\n`;
      });
    }

    // Add styling based on complexity
    mermaidDSL += '  classDef simple fill:#4caf50,stroke:#2e7d32,color:#fff\n';
    mermaidDSL += '  classDef complex fill:#f44336,stroke:#c62828,color:#fff\n';
    
    limitedFunctions.forEach(func => {
      const nodeId = this.sanitizeId(func.id);
      const complexity = func.complexity || 1;
      const className = complexity > 5 ? 'complex' : 'simple';
      mermaidDSL += `  class ${nodeId} ${className}\n`;
    });

    return this.normalizeShapes(mermaidDSL);
  }

  /**
   * Generate class diagram
   */
  generateClassDiagram(parsedFiles) {
    let mermaidDSL = 'classDiagram\n';
    let hasClasses = false;
    
    parsedFiles.forEach(file => {
      if (file.classes && file.classes.length > 0) {
        file.classes.forEach(cls => {
          hasClasses = true;
          const className = this.sanitizeId(cls.name);
          mermaidDSL += `  class ${className} {\n`;
          
          // Add properties
          if (cls.properties) {
            cls.properties.forEach(prop => {
              mermaidDSL += `    +${prop.name} : ${prop.type || 'any'}\n`;
            });
          }
          
          // Add methods (simplified)
          if (file.functions) {
            const classMethods = file.functions.filter(f => 
              f.line >= cls.line && f.line <= (cls.endLine || cls.line + 100)
            );
            
            classMethods.forEach(method => {
              const params = method.params ? method.params.join(', ') : '';
              mermaidDSL += `    +${method.name}(${params})\n`;
            });
          }
          
          mermaidDSL += '  }\n';
          
          // Add inheritance
          if (cls.superClass) {
            const superClassName = this.sanitizeId(cls.superClass);
            mermaidDSL += `  ${superClassName} <|-- ${className}\n`;
          }
        });
      }
    });

    // If no classes found, create a placeholder
    if (!hasClasses) {
      mermaidDSL += '  class NoClassesFound {\n';
      mermaidDSL += '    +message : "No classes detected in this project"\n';
      mermaidDSL += '    +suggestion : "Try uploading a project with class definitions"\n';
      mermaidDSL += '  }\n';
    }

    return this.normalizeShapes(mermaidDSL);
  }

  /**
   * Generate sequence diagram for component interactions
   */
  generateSequenceDiagram(parsedFiles, targetComponent = null) {
    let mermaidDSL = 'sequenceDiagram\n';
    
    // This is a simplified version - in a real implementation,
    // you'd need to analyze the actual function calls and data flow
    const components = [];
    
    parsedFiles.forEach(file => {
      if (file.components) {
        file.components.forEach(comp => {
          components.push({
            name: comp.name,
            file: file.filePath
          });
        });
      }
    });

    if (components.length > 0) {
      mermaidDSL += `  participant User\n`;
      components.slice(0, 5).forEach(comp => {
        mermaidDSL += `  participant ${comp.name}\n`;
      });
      
      mermaidDSL += `  User->>+${components[0].name}: interaction\n`;
      for (let i = 0; i < components.length - 1; i++) {
        mermaidDSL += `  ${components[i].name}->>+${components[i + 1].name}: data/props\n`;
      }
    }

    return this.normalizeShapes(mermaidDSL);
  }

  /**
   * Validate generated Mermaid DSL
   */
  validateMermaidDSL(dsl) {
    const errors = [];
    
    // Basic syntax validation
    if (!dsl.trim().startsWith('graph') && 
        !dsl.trim().startsWith('classDiagram') && 
        !dsl.trim().startsWith('sequenceDiagram')) {
      errors.push('Invalid diagram type declaration');
    }

    // Check for unmatched brackets
    const brackets = { '[': ']', '(': ')', '{': '}' };
    const stack = [];
    
    for (const char of dsl) {
      if (Object.keys(brackets).includes(char)) {
        stack.push(char);
      } else if (Object.values(brackets).includes(char)) {
        const last = stack.pop();
        if (brackets[last] !== char) {
          errors.push('Unmatched brackets detected');
          break;
        }
      }
    }

    // Detect nested shape artifacts like {("label")} or [("label")]
    const nestedShapePatterns = [
      /\{\((\".*?\")\)\}/,
      /\[\((\".*?\")\)\]/,
      /\(\[(\".*?\")\]\)/,
      /\{\[(\".*?\")\]\}/,
      /\(\{(\".*?\")\}\)/
    ];
    if (nestedShapePatterns.some((re) => re.test(dsl))) {
      errors.push('Nested shape tokens detected');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Normalize legacy nested shape patterns by collapsing to a single shape
   */
  normalizeShapes(dsl) {
    let out = dsl;
    out = out.replace(/\{\((\".*?\")\)\}/g, '($1)');
    out = out.replace(/\[\((\".*?\")\)\]/g, '($1)');
    out = out.replace(/\(\[(\".*?\")\]\)/g, '($1)');
    out = out.replace(/\{\[(\".*?\")\]\}/g, '[$1]');
    out = out.replace(/\(\{(\".*?\")\}\)/g, '($1)');
    return out;
  }
}

export default new MermaidService(); 