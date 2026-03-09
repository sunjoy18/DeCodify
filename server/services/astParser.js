import * as acorn from 'acorn';
import jsx from 'acorn-jsx';
import { parse as parseCSS } from 'css-tree';
import * as cheerio from 'cheerio';
import fs from 'fs-extra';
import path from 'path';
import { glob } from 'glob';

const JSXParser = acorn.Parser.extend(jsx());

/**
 * AST Parser Service for JavaScript, HTML, and CSS files
 */
class ASTParserService {
  constructor() {
    this.supportedExtensions = ['.js', '.jsx', '.ts', '.tsx', '.html', '.css', '.vue'];
    this.dependencyPatterns = {
      import: /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)(?:\s*,\s*(?:\{[^}]*\}|\*\s+as\s+\w+|\w+))*\s+from\s+)?['"`]([^'"`]+)['"`]/g,
      require: /require\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g,
      dynamic: /import\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g
    };
  }

  /**
   * Parse a single file and extract AST with metadata
   */
  async parseFile(filePath, content = null) {
    try {
      const extension = path.extname(filePath).toLowerCase();
      const fileContent = content || await fs.readFile(filePath, 'utf8');
      
      const result = {
        filePath,
        extension,
        size: fileContent.length,
        lines: fileContent.split('\n').length,
        ast: null,
        dependencies: [],
        exports: [],
        functions: [],
        classes: [],
        components: [],
        errors: []
      };

      switch (extension) {
        case '.js':
        case '.jsx':
        case '.ts':
        case '.tsx':
          return await this.parseJavaScript(fileContent, result);
        case '.html':
          return await this.parseHTML(fileContent, result);
        case '.css':
          return await this.parseCSS(fileContent, result);
        case '.vue':
          return await this.parseVue(fileContent, result);
        default:
          throw new Error(`Unsupported file type: ${extension}`);
      }
    } catch (error) {
      return {
        filePath,
        error: error.message,
        ast: null,
        dependencies: [],
        exports: [],
        functions: [],
        classes: [],
        components: []
      };
    }
  }

  /**
   * Parse JavaScript/TypeScript files
   */
  async parseJavaScript(content, result) {
    try {
      // Parse with Acorn (supports JSX)
      const ast = JSXParser.parse(content, {
        ecmaVersion: 2024,
        sourceType: 'module',
        allowImportExportEverywhere: true,
        allowReturnOutsideFunction: true,
        locations: true,
        ranges: true
      });

      result.ast = ast;
      result.dependencies = this.extractDependencies(content);
      result.exports = this.extractExports(ast);
      result.functions = this.extractFunctions(ast);
      result.classes = this.extractClasses(ast);
      result.components = this.extractReactComponents(ast);

    } catch (error) {
      result.errors.push({
        type: 'parse_error',
        message: error.message,
        line: error.loc?.line,
        column: error.loc?.column
      });
    }

    return result;
  }

  /**
   * Parse HTML files
   */
  async parseHTML(content, result) {
    try {
      const $ = cheerio.load(content);
      
      result.ast = {
        type: 'HTMLDocument',
        scripts: [],
        styles: [],
        links: [],
        elements: []
      };

      // Extract script tags
      $('script').each((i, elem) => {
        const $elem = $(elem);
        const src = $elem.attr('src');
        const type = $elem.attr('type') || 'text/javascript';
        
        if (src) {
          result.dependencies.push({
            type: 'script',
            source: src,
            external: !src.startsWith('.')
          });
        }

        result.ast.scripts.push({
          src,
          type,
          content: $elem.html(),
          attributes: $elem.get(0).attribs
        });
      });

      // Extract CSS links
      $('link[rel="stylesheet"]').each((i, elem) => {
        const $elem = $(elem);
        const href = $elem.attr('href');
        
        if (href) {
          result.dependencies.push({
            type: 'stylesheet',
            source: href,
            external: !href.startsWith('.')
          });
        }

        result.ast.links.push({
          href,
          attributes: $elem.get(0).attribs
        });
      });

      // Extract inline styles
      $('style').each((i, elem) => {
        result.ast.styles.push({
          content: $(elem).html()
        });
      });

    } catch (error) {
      result.errors.push({
        type: 'parse_error',
        message: error.message
      });
    }

    return result;
  }

  /**
   * Parse CSS files
   */
  async parseCSS(content, result) {
    try {
      const ast = parseCSS(content, {
        positions: true,
        filename: result.filePath
      });

      result.ast = ast;
      result.dependencies = this.extractCSSImports(content);

    } catch (error) {
      result.errors.push({
        type: 'parse_error',
        message: error.message
      });
    }

    return result;
  }

  /**
   * Parse Vue files (basic support)
   */
  async parseVue(content, result) {
    try {
      // Extract script, template, and style blocks
      const scriptMatch = content.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
      const templateMatch = content.match(/<template[^>]*>([\s\S]*?)<\/template>/i);
      const styleMatches = content.match(/<style[^>]*>([\s\S]*?)<\/style>/gi);

      if (scriptMatch) {
        const scriptResult = await this.parseJavaScript(scriptMatch[1], {
          ...result,
          filePath: result.filePath + ':script'
        });
        result.dependencies.push(...scriptResult.dependencies);
        result.functions.push(...scriptResult.functions);
        result.classes.push(...scriptResult.classes);
        result.components.push(...scriptResult.components);
      }

      if (templateMatch) {
        const templateResult = await this.parseHTML(templateMatch[1], {
          ...result,
          filePath: result.filePath + ':template'
        });
        result.dependencies.push(...templateResult.dependencies);
      }

      if (styleMatches) {
        for (const styleMatch of styleMatches) {
          const styleContent = styleMatch.replace(/<\/?style[^>]*>/gi, '');
          const styleResult = await this.parseCSS(styleContent, {
            ...result,
            filePath: result.filePath + ':style'
          });
          result.dependencies.push(...styleResult.dependencies);
        }
      }

    } catch (error) {
      result.errors.push({
        type: 'parse_error',
        message: error.message
      });
    }

    return result;
  }

  /**
   * Extract dependencies from JavaScript content using regex
   */
  extractDependencies(content) {
    const dependencies = [];
    
    // Extract import statements
    const importMatches = [...content.matchAll(this.dependencyPatterns.import)];
    importMatches.forEach(match => {
      dependencies.push({
        type: 'import',
        source: match[1],
        external: !match[1].startsWith('.')
      });
    });

    // Extract require statements
    const requireMatches = [...content.matchAll(this.dependencyPatterns.require)];
    requireMatches.forEach(match => {
      dependencies.push({
        type: 'require',
        source: match[1],
        external: !match[1].startsWith('.')
      });
    });

    // Extract dynamic imports
    const dynamicMatches = [...content.matchAll(this.dependencyPatterns.dynamic)];
    dynamicMatches.forEach(match => {
      dependencies.push({
        type: 'dynamic',
        source: match[1],
        external: !match[1].startsWith('.')
      });
    });

    return dependencies;
  }

  /**
   * Extract CSS imports
   */
  extractCSSImports(content) {
    const dependencies = [];
    const importRegex = /@import\s+(?:url\()?['"`]?([^'"`\)]+)['"`]?\)?/g;
    
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      dependencies.push({
        type: 'css_import',
        source: match[1],
        external: !match[1].startsWith('.')
      });
    }

    return dependencies;
  }

  /**
   * Extract function declarations from AST with call relationships
   */
  extractFunctions(ast) {
    const functions = [];
    const functionMap = new Map();

    function extractFunctionCalls(node, calls = []) {
      if (!node || typeof node !== 'object') return calls;

      if (node.type === 'CallExpression') {
        let calleeName = null;
        if (node.callee?.type === 'Identifier') {
          calleeName = node.callee.name;
        } else if (node.callee?.type === 'MemberExpression' && node.callee.property) {
          calleeName = node.callee.property.name;
        }
        if (calleeName && !calls.includes(calleeName)) {
          calls.push(calleeName);
        }
      }

      for (const key in node) {
        if (node.hasOwnProperty(key) && node[key] && typeof node[key] === 'object') {
          if (Array.isArray(node[key])) {
            node[key].forEach(n => extractFunctionCalls(n, calls));
          } else {
            extractFunctionCalls(node[key], calls);
          }
        }
      }
      return calls;
    }

    function traverse(node) {
      if (!node || typeof node !== 'object') return;

      if (node.type === 'FunctionDeclaration') {
        const startLine = node.loc?.start?.line;
        const endLine = node.loc?.end?.line;
        const func = {
          name: node.id?.name || 'anonymous',
          type: 'function',
          params: node.params?.map(p => p.name || p.type) || [],
          line: startLine,
          endLine,
          lines: startLine && endLine ? endLine - startLine + 1 : null,
          async: node.async,
          generator: node.generator,
          calls: extractFunctionCalls(node.body)
        };
        functions.push(func);
        functionMap.set(func.name, func);
      } else if (node.type === 'VariableDeclarator' && 
                 node.init?.type === 'FunctionExpression') {
        const startLine = node.init.loc?.start?.line ?? node.loc?.start?.line;
        const endLine = node.init.loc?.end?.line ?? node.loc?.end?.line;
        const func = {
          name: node.id?.name || 'anonymous',
          type: 'function_expression',
          params: node.init.params?.map(p => p.name || p.type) || [],
          line: startLine,
          endLine,
          lines: startLine && endLine ? endLine - startLine + 1 : null,
          async: node.init.async,
          generator: node.init.generator,
          calls: extractFunctionCalls(node.init.body)
        };
        functions.push(func);
        functionMap.set(func.name, func);
      } else if (node.type === 'VariableDeclarator' && 
                 node.init?.type === 'ArrowFunctionExpression') {
        const initNode = node.init;
        const startLine = initNode.loc?.start?.line ?? node.loc?.start?.line;
        const endLine = initNode.loc?.end?.line ?? node.loc?.end?.line;
        const func = {
          name: node.id?.name || 'anonymous',
          type: 'arrow_function',
          params: initNode.params?.map(p => p.name || p.type) || [],
          line: startLine,
          endLine,
          lines: startLine && endLine ? endLine - startLine + 1 : null,
          async: initNode.async,
          calls: extractFunctionCalls(initNode.body || initNode)
        };
        functions.push(func);
        functionMap.set(func.name, func);
      }

      for (const key in node) {
        if (node.hasOwnProperty(key) && node[key] && typeof node[key] === 'object') {
          if (Array.isArray(node[key])) {
            node[key].forEach(traverse);
          } else {
            traverse(node[key]);
          }
        }
      }
    }

    traverse(ast);
    return functions;
  }

  /**
   * Extract class declarations from AST
   */
  extractClasses(ast) {
    const classes = [];

    function traverse(node) {
      if (!node || typeof node !== 'object') return;

      if (node.type === 'ClassDeclaration') {
        classes.push({
          name: node.id?.name || 'anonymous',
          superClass: node.superClass?.name,
          line: node.loc?.start?.line,
          methods: []
        });
      }

      for (const key in node) {
        if (node.hasOwnProperty(key) && node[key] && typeof node[key] === 'object') {
          if (Array.isArray(node[key])) {
            node[key].forEach(traverse);
          } else {
            traverse(node[key]);
          }
        }
      }
    }

    traverse(ast);
    return classes;
  }

  /**
   * Extract React components from AST with JSX usage and props
   */
  extractReactComponents(ast) {
    const components = [];
    const jsxElements = new Set();

    function extractJSXElements(node) {
      if (!node || typeof node !== 'object') return;

      if (node.type === 'JSXElement' && node.openingElement?.name) {
        const name = node.openingElement.name.name || 
                    (node.openingElement.name.object?.name + '.' + node.openingElement.name.property?.name);
        if (name && /^[A-Z]/.test(name)) {
          jsxElements.add(name);
        }
      }

      for (const key in node) {
        if (node.hasOwnProperty(key) && node[key] && typeof node[key] === 'object') {
          if (Array.isArray(node[key])) {
            node[key].forEach(extractJSXElements);
          } else {
            extractJSXElements(node[key]);
          }
        }
      }
    }

    function extractPropsFromParams(params) {
      if (!params || params.length === 0) return [];
      const param = params[0];
      
      if (param.type === 'ObjectPattern' && param.properties) {
        return param.properties.map(p => p.key?.name).filter(Boolean);
      }
      return ['props'];
    }

    function traverse(node, parentComponent = null) {
      if (!node || typeof node !== 'object') return;

      let currentComponent = parentComponent;

      // Function components (function declarations)
      if (node.type === 'FunctionDeclaration' && 
          node.id?.name && 
          /^[A-Z]/.test(node.id.name)) {
        const comp = {
          name: node.id.name,
          type: 'functional_component',
          line: node.loc?.start?.line,
          props: extractPropsFromParams(node.params),
          usesComponents: []
        };
        components.push(comp);
        currentComponent = comp;
      }

      // Arrow function components (const Component = () => {})
      if (node.type === 'VariableDeclarator' &&
          node.id?.name &&
          /^[A-Z]/.test(node.id.name) &&
          (node.init?.type === 'ArrowFunctionExpression' || node.init?.type === 'FunctionExpression')) {
        const comp = {
          name: node.id.name,
          type: 'functional_component',
          line: node.loc?.start?.line,
          props: extractPropsFromParams(node.init.params),
          usesComponents: []
        };
        components.push(comp);
        currentComponent = comp;
      }

      // Class components (extends Component or React.Component)
      if (node.type === 'ClassDeclaration' && node.superClass) {
        const superClassName = node.superClass.name || 
                             (node.superClass.property?.name === 'Component' ? 'React.Component' : null);
        
        if (superClassName === 'Component' || superClassName === 'React.Component' ||
            (node.superClass.property?.name === 'Component')) {
          const comp = {
            name: node.id?.name || 'anonymous',
            type: 'class_component',
            line: node.loc?.start?.line,
            superClass: superClassName || 'Component',
            usesComponents: []
          };
          components.push(comp);
          currentComponent = comp;
        }
      }

      // Export default function components
      if (node.type === 'ExportDefaultDeclaration' && 
          node.declaration?.type === 'FunctionDeclaration' &&
          node.declaration.id?.name &&
          /^[A-Z]/.test(node.declaration.id.name)) {
        const comp = {
          name: node.declaration.id.name,
          type: 'functional_component',
          line: node.loc?.start?.line,
          props: extractPropsFromParams(node.declaration.params),
          exported: true,
          usesComponents: []
        };
        components.push(comp);
        currentComponent = comp;
      }

      // Track JSX elements used within this component
      if (currentComponent && node.type === 'JSXElement' && node.openingElement?.name) {
        const name = node.openingElement.name.name || 
                    (node.openingElement.name.object?.name + '.' + node.openingElement.name.property?.name);
        if (name && /^[A-Z]/.test(name) && name !== currentComponent.name) {
          if (!currentComponent.usesComponents.includes(name)) {
            currentComponent.usesComponents.push(name);
          }
        }
      }

      for (const key in node) {
        if (node.hasOwnProperty(key) && node[key] && typeof node[key] === 'object') {
          if (Array.isArray(node[key])) {
            node[key].forEach(n => traverse(n, currentComponent));
          } else {
            traverse(node[key], currentComponent);
          }
        }
      }
    }

    traverse(ast);
    return components;
  }

  /**
   * Extract export declarations from AST
   */
  extractExports(ast) {
    const exports = [];

    function traverse(node) {
      if (!node || typeof node !== 'object') return;

      if (node.type === 'ExportDefaultDeclaration') {
        exports.push({
          type: 'default',
          name: node.declaration?.name || node.declaration?.id?.name || 'default',
          line: node.loc?.start?.line
        });
      } else if (node.type === 'ExportNamedDeclaration') {
        if (node.specifiers) {
          node.specifiers.forEach(spec => {
            exports.push({
              type: 'named',
              name: spec.exported?.name,
              local: spec.local?.name,
              line: node.loc?.start?.line
            });
          });
        }
      }

      for (const key in node) {
        if (node.hasOwnProperty(key) && node[key] && typeof node[key] === 'object') {
          if (Array.isArray(node[key])) {
            node[key].forEach(traverse);
          } else {
            traverse(node[key]);
          }
        }
      }
    }

    traverse(ast);
    return exports;
  }

  /**
   * Normalize path for cross-platform comparison (always use forward slashes)
   */
  normalizePath(filePath) {
    if (!filePath) return '';
    return String(filePath).replace(/\\/g, '/');
  }

  /**
   * Parse an entire directory
   */
  async parseDirectory(dirPath) {
    const pattern = `${dirPath}/**/*.{${this.supportedExtensions.map(ext => ext.slice(1)).join(',')}}`;
    const files = await glob(pattern, { ignore: ['**/node_modules/**', '**/dist/**', '**/build/**'] });
    
    const results = [];
    
    for (const file of files) {
      try {
        const result = await this.parseFile(file);
        // Normalize path for consistent cross-platform behavior
        result.filePath = this.normalizePath(result.filePath);
        results.push(result);
      } catch (error) {
        console.error(`Error parsing ${file}:`, error);
        results.push({
          filePath: this.normalizePath(file),
          error: error.message,
          ast: null,
          dependencies: []
        });
      }
    }

    return results;
  }

  /**
   * Resolve a dependency source to a matching file path
   */
  resolveDependencyPath(fromFilePath, depSource, parsedFiles) {
    const fromDir = path.dirname(fromFilePath);
    const normalizedFromDir = this.normalizePath(fromDir);
    const baseResolved = path.resolve(fromDir, depSource);
    const normalizedBase = this.normalizePath(baseResolved);

    const extensions = ['', '.js', '.jsx', '.ts', '.tsx', '.css', '.html', '.vue'];
    for (const ext of extensions) {
      const candidate = normalizedBase + ext;
      const match = parsedFiles.find(f => this.normalizePath(f.filePath) === candidate);
      if (match) return match.filePath;
    }
    return null;
  }

  /**
   * Generate dependency graph from parsed results
   */
  generateDependencyGraph(parsedFiles) {
    const graph = {
      nodes: [],
      edges: []
    };

    const normalizedPaths = new Map();
    parsedFiles.forEach(f => {
      normalizedPaths.set(this.normalizePath(f.filePath), f.filePath);
    });

    // Create nodes for each file (deduplicate by normalized path)
    const seenNodes = new Set();
    parsedFiles.forEach(file => {
      const normPath = this.normalizePath(file.filePath);
      if (seenNodes.has(normPath)) return;
      seenNodes.add(normPath);

      graph.nodes.push({
        id: file.filePath,
        label: path.basename(file.filePath),
        type: file.extension,
        size: file.size,
        functions: file.functions?.length || 0,
        classes: file.classes?.length || 0,
        components: file.components?.length || 0
      });
    });

    // Create edges for dependencies using normalized path resolution
    parsedFiles.forEach(file => {
      file.dependencies?.forEach(dep => {
        if (!dep.external) {
          const targetPath = this.resolveDependencyPath(file.filePath, dep.source, parsedFiles);
          if (targetPath && targetPath !== file.filePath) {
            graph.edges.push({
              from: file.filePath,
              to: targetPath,
              type: dep.type,
              label: dep.source
            });
          }
        }
      });
    });

    return graph;
  }
}

export default new ASTParserService(); 