const fs = require('fs').promises;
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;

async function analyzeRepository(rootDir) {
  const analysis = {
    files: [],
    dependencies: new Set(),
    structure: {},
    imports: {},
    exports: {}
  };

  async function analyzeFile(filePath) {
    const relativePath = path.relative(rootDir, filePath);
    const content = await fs.readFile(filePath, 'utf-8');
    
    const fileInfo = {
      path: relativePath,
      content: content,
      imports: [],
      exports: [],
      dependencies: new Set()
    };

    try {
      const ast = parser.parse(content, {
        sourceType: 'module',
        plugins: ['jsx', 'typescript']
      });

      traverse(ast, {
        ImportDeclaration(path) {
          const importSource = path.node.source.value;
          fileInfo.imports.push(importSource);
          fileInfo.dependencies.add(importSource);
        },
        ExportNamedDeclaration(path) {
          if (path.node.declaration) {
            if (path.node.declaration.declarations) {
              path.node.declaration.declarations.forEach(declaration => {
                fileInfo.exports.push(declaration.id.name);
              });
            } else if (path.node.declaration.id) {
              fileInfo.exports.push(path.node.declaration.id.name);
            }
          }
        },
        ExportDefaultDeclaration(path) {
          fileInfo.exports.push('default');
        }
      });
    } catch (error) {
      console.warn(`Warning: Failed to parse ${relativePath}:`, error.message);
    }

    return fileInfo;
  }

  async function walkDirectory(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
          analysis.structure[entry.name] = await walkDirectory(fullPath);
        }
      } else if (entry.isFile() && /\.(js|ts|tsx)$/.test(entry.name)) {
        const fileInfo = await analyzeFile(fullPath);
        analysis.files.push(fileInfo);
        
        fileInfo.imports.forEach(imp => analysis.dependencies.add(imp));
        const dirName = path.dirname(fileInfo.path);
        if (!analysis.imports[dirName]) {
          analysis.imports[dirName] = [];
        }
        analysis.imports[dirName].push({
          file: entry.name,
          imports: fileInfo.imports
        });
      }
    }

    return analysis.files.length;
  }

  await walkDirectory(rootDir);

  // Convert Sets to Arrays for JSON serialization
  analysis.dependencies = Array.from(analysis.dependencies);
  analysis.files = analysis.files.map(file => ({
    ...file,
    dependencies: Array.from(file.dependencies)
  }));

  return analysis;
}

async function generateAnalysis() {
  try {
    const rootDir = process.cwd();
    const analysis = await analyzeRepository(path.join(rootDir, 'src'));
    
    // Create analysis output
    const output = {
      timestamp: new Date().toISOString(),
      analysis: analysis,
      summary: {
        totalFiles: analysis.files.length,
        totalDependencies: analysis.dependencies.length,
        directories: Object.keys(analysis.structure)
      }
    };

    // Save analysis
    await fs.writeFile(
      'repository-analysis.json',
      JSON.stringify(output, null, 2)
    );

    console.log('Repository analysis complete. See repository-analysis.json');
    
  } catch (error) {
    console.error('Analysis failed:', error);
    process.exit(1);
  }
}

generateAnalysis();