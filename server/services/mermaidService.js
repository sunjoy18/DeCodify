/**
 * Mermaid Service for generating flowcharts from dependency graphs
 */
class MermaidService {
  constructor() {
    // Logical shape types; actual Mermaid syntax is constructed centrally to avoid nesting
    this.nodeShapes = {
      ".js": "square",
      ".jsx": "round",
      ".ts": "diamond",
      ".tsx": "round",
      ".html": "subroutine",
      ".css": "circle",
      ".vue": "square",
      default: "square",
    };

    this.edgeTypes = {
      import: "-->",
      require: "-.->",
      dynamic: "==>",
      script: "-->",
      stylesheet: "-.->",
      css_import: "-.->",
      default: "-->",
    };

    // Track used IDs to prevent duplicates
    this.usedIds = new Set();
  }

  /**
   * Generate Mermaid DSL from dependency graph
   */
  generateFlowchart(graph, options = {}) {
    const {
      direction = "LR",
      includeExternal = false,
      maxNodes = 50,
      groupByDirectory = true,
    } = options;

    // Reset used IDs for this diagram generation
    this.usedIds.clear();

    console.log("Generating flowchart with graph:", {
      nodeCount: graph?.nodes?.length || 0,
      edgeCount: graph?.edges?.length || 0,
      options,
    });

    let mermaidDSL = `graph ${direction}\n`;

    // Check if graph has nodes
    if (!graph || !graph.nodes || graph.nodes.length === 0) {
      console.log("No nodes found in graph");
      mermaidDSL += "  %% No files found to display\n";
      mermaidDSL += "  A[No files found]\n";
      mermaidDSL += this.generateStyling();
      return mermaidDSL;
    }

    // Filter nodes if needed
    let nodes = graph.nodes;
    if (!includeExternal) {
      nodes = nodes.filter((node) => !this.isExternalNode(node));
    }

    console.log("Filtered nodes count:", nodes.length);

    // Limit nodes for performance
    if (nodes.length > maxNodes) {
      nodes = nodes.slice(0, maxNodes);
    }

    // Generate node definitions
    const nodeDefinitions = this.generateNodeDefinitions(
      nodes,
      groupByDirectory
    );
    mermaidDSL += nodeDefinitions;

    // Generate edges
    const edges = this.filterEdges(graph.edges || [], nodes);
    const edgeDefinitions = this.generateEdgeDefinitions(edges);
    mermaidDSL += edgeDefinitions;

    // If no edges but we have nodes, add a note
    if (nodes.length > 0 && (!edges || edges.length === 0)) {
      mermaidDSL += "\n  %% No dependencies found between files\n";
      // Create a simple visual connection for standalone files
      if (nodes.length > 1) {
        for (let i = 0; i < Math.min(3, nodes.length - 1); i++) {
          const from = this.sanitizeId(nodes[i].id);
          const to = this.sanitizeId(nodes[i + 1].id);
          mermaidDSL += `  ${from} -.-> ${to}\n`;
        }
      }
    }

    // Add styling with file type classes
    mermaidDSL += this.generateStyling();
    
    // Apply file type styling to nodes
    nodes.forEach(node => {
      const nodeId = this.sanitizeId(node.id);
      const ext = node.type?.toLowerCase();
      if (ext === '.jsx' || ext === '.tsx') {
        mermaidDSL += `  class ${nodeId} jsxFile\n`;
      } else if (ext === '.ts') {
        mermaidDSL += `  class ${nodeId} tsFile\n`;
      } else if (ext === '.js') {
        mermaidDSL += `  class ${nodeId} jsFile\n`;
      } else if (ext === '.html') {
        mermaidDSL += `  class ${nodeId} htmlFile\n`;
      } else if (ext === '.css') {
        mermaidDSL += `  class ${nodeId} cssFile\n`;
      } else if (ext === '.vue') {
        mermaidDSL += `  class ${nodeId} vueFile\n`;
      }
    });

    return this.normalizeShapes(mermaidDSL);
  }

  /**
   * Generate node definitions with proper shapes and labels
   */
  generateNodeDefinitions(nodes, groupByDirectory = true) {
    let definitions = "";
    const nodeGroups = groupByDirectory
      ? this.groupNodesByDirectory(nodes)
      : { "": nodes };

    Object.entries(nodeGroups).forEach(([directory, groupNodes]) => {
      if (directory && groupByDirectory && nodeGroups && Object.keys(nodeGroups).length > 1) {
        const dirLabel = directory.split('/').pop() || directory;
        definitions += `\n  subgraph ${this.sanitizeId(directory)}["📁 ${dirLabel}"]\n`;
      }

      groupNodes.forEach((node) => {
        const nodeId = this.sanitizeId(node.id);
        const label = this.generateNodeLabel(node);
        const shapeType = this.getNodeShape(node);
        const nodeSyntax = this.formatNodeByShape(label, shapeType);
        const indent = (directory && groupByDirectory && Object.keys(nodeGroups).length > 1) ? '    ' : '  ';
        definitions += `${indent}${nodeId}${nodeSyntax}\n`;
      });

      if (directory && groupByDirectory && Object.keys(nodeGroups).length > 1) {
        definitions += "  end\n";
      }
    });

    return definitions;
  }

  /**
   * Generate edge definitions
   */
  generateEdgeDefinitions(edges) {
    let definitions = "\n";

    edges.forEach((edge) => {
      const fromId = this.sanitizeId(edge.from);
      const toId = this.sanitizeId(edge.to);
      const edgeType = this.edgeTypes[edge.type] || this.edgeTypes.default;
      const label = edge.label ? `|${this.sanitizeEdgeLabel(edge.label)}|` : "";

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
  classDef jsFile fill:#f7df1e,stroke:#333,stroke-width:2px,color:#000
  classDef tsFile fill:#3178c6,stroke:#235a97,stroke-width:2px,color:#fff
  classDef jsxFile fill:#61dafb,stroke:#21759b,stroke-width:2px,color:#000
  classDef htmlFile fill:#e34c26,stroke:#c63b1f,stroke-width:2px,color:#fff
  classDef cssFile fill:#264de4,stroke:#1b3ba3,stroke-width:2px,color:#fff
  classDef vueFile fill:#42b883,stroke:#35495e,stroke-width:2px,color:#fff
`;
  }

  /**
   * Group nodes by their directory path
   */
  groupNodesByDirectory(nodes) {
    const groups = {};

    nodes.forEach((node) => {
      const parts = node.id.split("/");
      const directory = parts.slice(0, -1).join("/") || "root";

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
   * Prefers shortLabel (e.g. src/App.js) over full path for readability
   */
  generateNodeLabel(node) {
    // Use shortLabel if provided (from fallback graph), else label, else basename of id
    let label = node.shortLabel || node.label || "Unknown";
    if (label === "Unknown" && node.id) {
      const parts = String(node.id).replace(/\\/g, "/").split("/");
      label = parts[parts.length - 1] || "Unknown";
    }

    // Sanitize label for Mermaid - remove problematic characters but keep readable
    label = label
      .replace(/["\\\n\r\t]/g, " ") // Replace quotes, backslashes, newlines, tabs with spaces
      .replace(/[{}()]/g, "") // Remove braces and parentheses
      .replace(/\s+/g, " ") // Replace multiple spaces with single space
      .trim();

    // Add metadata if available (compact format)
    const metadata = [];
    if (node.functions > 0) metadata.push(`${node.functions}f`);
    if (node.classes > 0) metadata.push(`${node.classes}c`);
    if (node.components > 0) metadata.push(`${node.components}comp`);

    if (metadata.length > 0) {
      label += ` [${metadata.join(",")}]`;
    }

    // Ensure label is not too long and contains only safe characters
    return label.substring(0, 60).replace(/[^a-zA-Z0-9\s\-_\[\],\.\/]/g, "");
  }

  /**
   * Sanitize ID for Mermaid compatibility - DETERMINISTIC approach
   * Same input always produces same output (no random counters)
   */
  sanitizeId(id) {
    if (!id) return "undefined_id";

    // Normalize the ID first
    const normalized = String(id).replace(/\\/g, "/");

    // Create a hash for uniqueness
    const createHash = (str) => {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      return Math.abs(hash).toString(36).substring(0, 8);
    };

    // For component IDs like "file/path:ComponentName", keep the meaningful parts
    let meaningfulId = normalized;
    
    // Remove uploads/uuid prefix for readability
    meaningfulId = meaningfulId.replace(/.*?uploads\/[a-f0-9-]+\//i, '');
    
    // Create a safe ID by replacing problematic characters
    let safeId = meaningfulId
      .replace(/\//g, "_") // Replace forward slashes
      .replace(/[^a-zA-Z0-9_:]/g, "_") // Replace all other non-alphanumeric chars (keep colon for now)
      .replace(/_+/g, "_") // Replace multiple underscores with single
      .replace(/:/g, "_") // Replace colon last
      .replace(/^_+/, "") // Remove leading underscores
      .replace(/_+$/, "") // Remove trailing underscores
      || "id";

    // If too long, intelligently shorten while maintaining uniqueness
    if (safeId.length > 50) {
      const hash = createHash(normalized);
      const parts = safeId.split('_');
      // Keep first and last parts + hash
      if (parts.length > 3) {
        safeId = parts[0] + '_' + parts[parts.length - 1] + '_' + hash;
      } else {
        safeId = safeId.substring(0, 40) + '_' + hash;
      }
    }

    // If it starts with a number, prefix with 'n'
    if (/^\d/.test(safeId)) {
      safeId = "n" + safeId;
    }

    // Ensure the ID is not empty
    if (!safeId || safeId.length === 0) {
      safeId = "node_" + createHash(normalized);
    }

    // Track this ID for debugging (but don't modify it)
    this.usedIds.add(safeId);

    return safeId;
  }

  /**
   * Sanitize edge label text for Mermaid
   */
  sanitizeEdgeLabel(label) {
    return String(label)
      .replace(/[\n\r\t]/g, " ")
      .replace(/[|]/g, "/")
      .replace(/[{}\[\]()]/g, "")
      .trim()
      .substring(0, 50);
  }

  /**
   * Build Mermaid node syntax by shape type without nested shapes.
   */
  formatNodeByShape(label, shapeType) {
    const quotedLabel = `"${label}"`;
    switch (shapeType) {
      case "round":
        return `(${quotedLabel})`;
      case "circle":
        return `(((${quotedLabel})))`;
      case "subroutine":
        return `[[${quotedLabel}]]`;
      case "diamond":
        // Mermaid decision shape uses curly braces
        return `{${quotedLabel}}`;
      case "square":
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
    if (node.id.includes("node_modules")) {
      return true;
    }

    // Check for common external package patterns
    const id = node.id.toLowerCase();
    const externalPatterns = [
      "react",
      "vue",
      "angular",
      "lodash",
      "axios",
      "express",
      "node:",
      "@",
      "npm:",
      "http://",
      "https://",
    ];

    // If the id is just a package name (no path separators), it's likely external
    if (!id.includes("/") && !id.includes("\\") && !id.includes(".")) {
      return true;
    }

    // Check against known external patterns
    return externalPatterns.some((pattern) => id.includes(pattern));
  }

  /**
   * Filter edges to only include those between valid nodes
   */
  filterEdges(edges, validNodes) {
    const validNodeIds = new Set(validNodes.map((n) => n.id));
    return edges.filter(
      (edge) => validNodeIds.has(edge.from) && validNodeIds.has(edge.to)
    );
  }

  /**
   * Generate a component hierarchy diagram with actual parent-child relationships
   */
  generateComponentDiagram(parsedFiles) {
    this.usedIds.clear();

    const components = [];
    const componentsByName = new Map();
    const fileToComponents = new Map();

    parsedFiles.forEach((file) => {
      if (file.components && file.components.length > 0) {
        file.components.forEach((comp) => {
          const component = {
            id: `${file.filePath}:${comp.name}`,
            name: comp.name,
            type: comp.type,
            file: file.filePath,
            props: comp.props || [],
            usesComponents: comp.usesComponents || [],
            exported: comp.exported || false
          };
          components.push(component);
          componentsByName.set(comp.name, component);
          
          if (!fileToComponents.has(file.filePath)) {
            fileToComponents.set(file.filePath, []);
          }
          fileToComponents.get(file.filePath).push(component);
        });
      }
    });

    let mermaidDSL = "graph TD\n";

    if (components.length === 0) {
      mermaidDSL += "  A[No React Components Found]\n";
      mermaidDSL += "  B[Upload a React/Vue project]\n";
      mermaidDSL += "  C[to see component hierarchy]\n";
      mermaidDSL += "  A --> B --> C\n";
      mermaidDSL += "  classDef placeholder fill:#f9f,stroke:#333,stroke-width:2px\n";
      mermaidDSL += "  class A,B,C placeholder\n";
      return mermaidDSL;
    }

    // Group components by file/directory
    const directories = new Map();
    components.forEach(comp => {
      const normPath = String(comp.file).replace(/\\/g, '/');
      const match = normPath.match(/(?:src|components|pages)\/(.+?)\/[^/]+$/) || 
                   normPath.match(/(?:src|components|pages)\/([^/]+)$/);
      const dir = match ? match[1] : 'root';
      if (!directories.has(dir)) directories.set(dir, []);
      directories.get(dir).push(comp);
    });

    // Generate nodes with subgraphs for directories
    directories.forEach((comps, dir) => {
      if (directories.size > 1 && comps.length > 1) {
        mermaidDSL += `  subgraph ${this.sanitizeId(dir)}["📁 ${dir}"]\n`;
      }
      
      comps.forEach((comp) => {
        const nodeId = this.sanitizeId(comp.id);
        const propsLabel = comp.props.length > 0 ? ` {${comp.props.slice(0, 3).join(', ')}}` : '';
        const label = `"${comp.name}${propsLabel}"`;
        const shape = comp.type === 'class_component' ? `[${label}]` : `(${label})`;
        mermaidDSL += `    ${nodeId}${shape}\n`;
      });
      
      if (directories.size > 1 && comps.length > 1) {
        mermaidDSL += "  end\n";
      }
    });

    // Add edges based on actual JSX usage (usesComponents)
    const addedEdges = new Set();
    components.forEach((comp) => {
      const fromId = this.sanitizeId(comp.id);
      
      comp.usesComponents.forEach(childName => {
        const childComp = componentsByName.get(childName);
        if (childComp && childComp.id !== comp.id) {
          const toId = this.sanitizeId(childComp.id);
          const edgeKey = `${fromId}->${toId}`;
          if (!addedEdges.has(edgeKey)) {
            addedEdges.add(edgeKey);
            mermaidDSL += `  ${fromId} --> ${toId}\n`;
          }
        }
      });
    });

    // Add styling with different colors for functional vs class components
    mermaidDSL += "\n  classDef functional fill:#61dafb,stroke:#21759b,stroke-width:2px,color:#000\n";
    mermaidDSL += "  classDef classComp fill:#ffa726,stroke:#f57400,stroke-width:2px,color:#000\n";
    mermaidDSL += "  classDef exported fill:#4caf50,stroke:#2e7d32,stroke-width:3px,color:#fff\n";
    
    components.forEach((comp) => {
      const nodeId = this.sanitizeId(comp.id);
      if (comp.exported) {
        mermaidDSL += `  class ${nodeId} exported\n`;
      } else if (comp.type === 'class_component') {
        mermaidDSL += `  class ${nodeId} classComp\n`;
      } else {
        mermaidDSL += `  class ${nodeId} functional\n`;
      }
    });

    return this.normalizeShapes(mermaidDSL);
  }

  /**
   * Generate a function call graph with actual call relationships
   */
  generateFunctionCallGraph(parsedFiles) {
    this.usedIds.clear();

    const functions = [];
    const functionsByName = new Map();

    parsedFiles.forEach((file) => {
      if (file.functions && file.functions.length > 0) {
        file.functions.forEach((func) => {
          const fn = {
            id: `${file.filePath}:${func.name}`,
            name: func.name,
            type: func.type,
            file: file.filePath,
            params: func.params || [],
            calls: func.calls || [],
            async: func.async || false
          };
          functions.push(fn);
          functionsByName.set(func.name, fn);
        });
      }
    });

    let mermaidDSL = "graph LR\n";

    if (functions.length === 0) {
      mermaidDSL += "  A[No Functions Found]\n";
      mermaidDSL += "  B[Upload a project with]\n";
      mermaidDSL += "  C[JavaScript/TypeScript functions]\n";
      mermaidDSL += "  A --> B --> C\n";
      mermaidDSL += "  classDef placeholder fill:#ffa726,stroke:#f57400,color:#fff\n";
      mermaidDSL += "  class A,B,C placeholder\n";
      return mermaidDSL;
    }

    // Limit to 30 functions for readability
    const limitedFunctions = functions.slice(0, 30);
    const limitedFunctionNames = new Set(limitedFunctions.map(f => f.name));

    // Generate nodes
    limitedFunctions.forEach((func) => {
      const nodeId = this.sanitizeId(func.id);
      const asyncLabel = func.async ? '⚡' : '';
      const paramsLabel = func.params.length > 0 ? `(${func.params.slice(0, 2).join(', ')})` : '()';
      const label = `"${asyncLabel}${func.name}${paramsLabel}"`;
      
      const shape = func.type === "arrow_function" ? `((${label}))` : `[${label}]`;
      mermaidDSL += `  ${nodeId}${shape}\n`;
    });

    // Add edges based on actual function calls
    const addedEdges = new Set();
    limitedFunctions.forEach((func) => {
      const fromId = this.sanitizeId(func.id);
      
      func.calls.forEach(calledName => {
        const calledFunc = functionsByName.get(calledName);
        if (calledFunc && limitedFunctionNames.has(calledName) && calledFunc.id !== func.id) {
          const toId = this.sanitizeId(calledFunc.id);
          const edgeKey = `${fromId}->${toId}`;
          if (!addedEdges.has(edgeKey)) {
            addedEdges.add(edgeKey);
            mermaidDSL += `  ${fromId} --> ${toId}\n`;
          }
        }
      });
    });

    // Add styling
    mermaidDSL += "\n  classDef async fill:#9c27b0,stroke:#6a1b9a,stroke-width:2px,color:#fff\n";
    mermaidDSL += "  classDef regular fill:#2196f3,stroke:#1565c0,stroke-width:2px,color:#fff\n";
    mermaidDSL += "  classDef arrow fill:#4caf50,stroke:#2e7d32,stroke-width:2px,color:#fff\n";

    limitedFunctions.forEach((func) => {
      const nodeId = this.sanitizeId(func.id);
      if (func.async) {
        mermaidDSL += `  class ${nodeId} async\n`;
      } else if (func.type === 'arrow_function') {
        mermaidDSL += `  class ${nodeId} arrow\n`;
      } else {
        mermaidDSL += `  class ${nodeId} regular\n`;
      }
    });

    return this.normalizeShapes(mermaidDSL);
  }

  /**
   * Generate class diagram
   */
  generateClassDiagram(parsedFiles) {
    // Reset used IDs for this diagram generation
    this.usedIds.clear();

    let mermaidDSL = "classDiagram\n";
    let hasClasses = false;

    parsedFiles.forEach((file) => {
      if (file.classes && file.classes.length > 0) {
        file.classes.forEach((cls) => {
          hasClasses = true;
          const className = this.sanitizeId(cls.name);
          mermaidDSL += `  class ${className} {\n`;

          // Add properties
          if (cls.properties) {
            cls.properties.forEach((prop) => {
              mermaidDSL += `    +${prop.name} : ${prop.type || "any"}\n`;
            });
          }

          // Add methods (simplified)
          if (file.functions) {
            const classMethods = file.functions.filter(
              (f) =>
                f.line >= cls.line && f.line <= (cls.endLine || cls.line + 100)
            );

            classMethods.forEach((method) => {
              const params = method.params ? method.params.join(", ") : "";
              mermaidDSL += `    +${method.name}(${params})\n`;
            });
          }

          mermaidDSL += "  }\n";

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
      mermaidDSL += "  class NoClassesFound {\n";
      mermaidDSL += '    +message : "No classes detected in this project"\n';
      mermaidDSL +=
        '    +suggestion : "Try uploading a project with class definitions"\n';
      mermaidDSL += "  }\n";
    }

    return this.normalizeShapes(mermaidDSL);
  }

  /**
   * Generate sequence diagram for component interactions
   */
  generateSequenceDiagram(parsedFiles, targetComponent = null) {
    let mermaidDSL = "sequenceDiagram\n";

    // This is a simplified version - in a real implementation,
    // you'd need to analyze the actual function calls and data flow
    const components = [];

    parsedFiles.forEach((file) => {
      if (file.components) {
        file.components.forEach((comp) => {
          components.push({
            name: comp.name,
            file: file.filePath,
          });
        });
      }
    });

    if (components.length > 0) {
      mermaidDSL += `  participant User\n`;
      components.slice(0, 5).forEach((comp) => {
        mermaidDSL += `  participant ${comp.name}\n`;
      });

      mermaidDSL += `  User->>+${components[0].name}: interaction\n`;
      for (let i = 0; i < components.length - 1; i++) {
        mermaidDSL += `  ${components[i].name}->>+${
          components[i + 1].name
        }: data/props\n`;
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
    if (
      !dsl.trim().startsWith("graph") &&
      !dsl.trim().startsWith("classDiagram") &&
      !dsl.trim().startsWith("sequenceDiagram")
    ) {
      errors.push("Invalid diagram type declaration");
    }

    // Check for unmatched brackets
    const brackets = { "[": "]", "(": ")", "{": "}" };
    const stack = [];

    for (const char of dsl) {
      if (Object.keys(brackets).includes(char)) {
        stack.push(char);
      } else if (Object.values(brackets).includes(char)) {
        const last = stack.pop();
        if (brackets[last] !== char) {
          errors.push("Unmatched brackets detected");
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
      /\(\{(\".*?\")\}\)/,
    ];
    if (nestedShapePatterns.some((re) => re.test(dsl))) {
      errors.push("Nested shape tokens detected");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Normalize legacy nested shape patterns by collapsing to a single shape
   */
  normalizeShapes(dsl) {
    let out = dsl;
    out = out.replace(/\{\((\".*?\")\)\}/g, "($1)");
    out = out.replace(/\[\((\".*?\")\)\]/g, "($1)");
    out = out.replace(/\(\[(\".*?\")\]\)/g, "($1)");
    out = out.replace(/\{\[(\".*?\")\]\}/g, "[$1]");
    out = out.replace(/\(\{(\".*?\")\}\)/g, "($1)");
    return out;
  }
}

export default new MermaidService();
