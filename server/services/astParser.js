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
   * Extract function declarations from AST
   */
  extractFunctions(ast) {
    const functions = [];

    function traverse(node) {
      if (!node || typeof node !== 'object') return;

      if (node.type === 'FunctionDeclaration') {
        functions.push({
          name: node.id?.name || 'anonymous',
          type: 'function',
          params: node.params?.map(p => p.name || p.type) || [],
          line: node.loc?.start?.line,
          async: node.async,
          generator: node.generator
        });
      } else if (node.type === 'VariableDeclarator' && 
                 node.init?.type === 'FunctionExpression') {
        functions.push({
          name: node.id?.name || 'anonymous',
          type: 'function_expression',
          params: node.init.params?.map(p => p.name || p.type) || [],
          line: node.loc?.start?.line,
          async: node.init.async,
          generator: node.init.generator
        });
      } else if (node.type === 'VariableDeclarator' && 
                 node.init?.type === 'ArrowFunctionExpression') {
        functions.push({
          name: node.id?.name || 'anonymous',
          type: 'arrow_function',
          params: node.init.params?.map(p => p.name || p.type) || [],
          line: node.loc?.start?.line,
          async: node.init.async
        });
      }

      // Traverse all object properties
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
   * Extract React components from AST
   */
  extractReactComponents(ast) {
    const components = [];

    function traverse(node) {
      if (!node || typeof node !== 'object') return;

      // Function components (function declarations)
      if (node.type === 'FunctionDeclaration' && 
          node.id?.name && 
          /^[A-Z]/.test(node.id.name)) {
        components.push({
          name: node.id.name,
          type: 'functional_component',
          line: node.loc?.start?.line,
          props: node.params?.length > 0 ? ['props'] : []
        });
      }

      // Arrow function components (const Component = () => {})
      if (node.type === 'VariableDeclarator' &&
          node.id?.name &&
          /^[A-Z]/.test(node.id.name) &&
          (node.init?.type === 'ArrowFunctionExpression' || node.init?.type === 'FunctionExpression')) {
        components.push({
          name: node.id.name,
          type: 'functional_component',
          line: node.loc?.start?.line,
          props: node.init.params?.length > 0 ? ['props'] : []
        });
      }

      // Class components (extends Component or React.Component)
      if (node.type === 'ClassDeclaration' && node.superClass) {
        const superClassName = node.superClass.name || 
                             (node.superClass.property?.name === 'Component' ? 'React.Component' : null);
        
        if (superClassName === 'Component' || superClassName === 'React.Component' ||
            (node.superClass.property?.name === 'Component')) {
          components.push({
            name: node.id?.name || 'anonymous',
            type: 'class_component',
            line: node.loc?.start?.line,
            superClass: superClassName || 'Component'
          });
        }
      }

      // Export default function components
      if (node.type === 'ExportDefaultDeclaration' && 
          node.declaration?.type === 'FunctionDeclaration' &&
          node.declaration.id?.name &&
          /^[A-Z]/.test(node.declaration.id.name)) {
        components.push({
          name: node.declaration.id.name,
          type: 'functional_component',
          line: node.loc?.start?.line,
          props: node.declaration.params?.length > 0 ? ['props'] : [],
          exported: true
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
   * Parse an entire directory
   */
  async parseDirectory(dirPath) {
    const pattern = `${dirPath}/**/*.{${this.supportedExtensions.map(ext => ext.slice(1)).join(',')}}`;
    const files = await glob(pattern, { ignore: ['**/node_modules/**', '**/dist/**', '**/build/**'] });
    
    const results = [];
    
    for (const file of files) {
      try {
        const result = await this.parseFile(file);
        results.push(result);
      } catch (error) {
        console.error(`Error parsing ${file}:`, error);
        results.push({
          filePath: file,
          error: error.message,
          ast: null,
          dependencies: []
        });
      }
    }

    return results;
  }

  /**
   * Generate dependency graph from parsed results
   */
  generateDependencyGraph(parsedFiles) {
    const graph = {
      nodes: [],
      edges: []
    };

    // Create nodes for each file
    parsedFiles.forEach(file => {
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

    // Create edges for dependencies
    parsedFiles.forEach(file => {
      file.dependencies?.forEach(dep => {
        if (!dep.external) {
          // Try to resolve relative path
          const resolvedPath = path.resolve(path.dirname(file.filePath), dep.source);
          const targetFile = parsedFiles.find(f => 
            f.filePath === resolvedPath || 
            f.filePath === resolvedPath + '.js' ||
            f.filePath === resolvedPath + '.jsx' ||
            f.filePath === resolvedPath + '.ts' ||
            f.filePath === resolvedPath + '.tsx'
          );

          if (targetFile) {
            graph.edges.push({
              from: file.filePath,
              to: targetFile.filePath,
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