'use strict';

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'enforce dependency inversion principle by preventing direct concrete dependency imports',
      category: 'Best Practices',
      recommended: true,
    },
    fixable: null,
    schema: [
      {
        type: 'object',
        properties: {
          concretePatterns: {
            type: 'array',
            items: { type: 'string' },
            default: ['**/concrete/**', '**/impl/**', '**/implementations/**']
          },
          abstractPatterns: {
            type: 'array',
            items: { type: 'string' },
            default: ['**/interfaces/**', '**/abstractions/**', '**/contracts/**']
          },
          allowedFiles: {
            type: 'array',
            items: { type: 'string' },
            default: ['**/di-container.js', '**/factory.js', '**/bootstrap.js', '**/index.js']
          },
          excludeExternalModules: {
            type: 'boolean',
            default: true
          },
          checkTypeScriptTypes: {
            type: 'boolean',
            default: true
          },
          pathAliases: {
            type: 'object',
            additionalProperties: { type: 'string' },
            default: {}
          },
          concreteClassSuffixes: {
            type: 'array',
            items: { type: 'string' },
            default: ['Impl', 'Implementation', 'Concrete', 'Service', 'Repository']
          },
          abstractClassPrefixes: {
            type: 'array',
            items: { type: 'string' },
            default: ['I', 'Abstract', 'Base']
          },
          customMappings: {
            type: 'object',
            additionalProperties: { type: 'string' },
            default: {}
          },
          strictMode: {
            type: 'boolean',
            default: false
          }
        },
        additionalProperties: false
      }
    ],
    messages: {
      directConcreteDependency: 'Direct import of concrete implementation "{{importPath}}" violates DIP. Use dependency injection or abstract interfaces instead.',
      suggestAbstraction: 'Consider importing from "{{suggestedPath}}" instead of "{{importPath}}".',
      noAbstractionFound: 'No matching abstraction found for "{{importPath}}". Consider creating an interface or using dependency injection.',
      concreteClassImport: 'Direct import of concrete class "{{className}}" violates DIP. Consider using an interface or abstract class.',
      typeScriptTypeImport: 'Import "{{importPath}}" appears to be a concrete type. Consider using an interface or abstract type.'
    }
  },

  create(context) {
    const options = context.options[0] || {};
    const concretePatterns = options.concretePatterns || ['**/concrete/**', '**/impl/**', '**/implementations/**'];
    const abstractPatterns = options.abstractPatterns || ['**/interfaces/**', '**/abstractions/**', '**/contracts/**'];
    const allowedFiles = options.allowedFiles || ['**/di-container.js', '**/factory.js', '**/bootstrap.js', '**/index.js'];
    const excludeExternalModules = options.excludeExternalModules !== false;
    const checkTypeScriptTypes = options.checkTypeScriptTypes !== false;
    const pathAliases = options.pathAliases || {};
    const concreteClassSuffixes = options.concreteClassSuffixes || ['Impl', 'Implementation', 'Concrete', 'Service', 'Repository'];
    const abstractClassPrefixes = options.abstractClassPrefixes || ['I', 'Abstract', 'Base'];
    const customMappings = options.customMappings || {};
    const strictMode = options.strictMode || false;
    
    const minimatch = require('minimatch');
    const path = require('path');
    const fs = require('fs');

    function isExternalModule(importPath) {
      // Check if it's a relative/absolute path or external module
      return !importPath.startsWith('./') && 
             !importPath.startsWith('../') && 
             !path.isAbsolute(importPath) &&
             !Object.keys(pathAliases).some(alias => importPath.startsWith(alias));
    }

    function resolvePathAlias(importPath) {
      for (const [alias, actualPath] of Object.entries(pathAliases)) {
        if (importPath.startsWith(alias)) {
          return importPath.replace(alias, actualPath);
        }
      }
      return importPath;
    }

    function isConcreteImport(importPath) {
      const resolvedPath = resolvePathAlias(importPath);
      return concretePatterns.some(pattern => minimatch(resolvedPath, pattern));
    }

    function isAbstractImport(importPath) {
      const resolvedPath = resolvePathAlias(importPath);
      return abstractPatterns.some(pattern => minimatch(resolvedPath, pattern));
    }

    function isAllowedFile(filename) {
      return allowedFiles.some(pattern => minimatch(filename, pattern));
    }

    function hasConcreteClassSuffix(className) {
      return concreteClassSuffixes.some(suffix => className.endsWith(suffix));
    }

    function hasAbstractClassPrefix(className) {
      return abstractClassPrefixes.some(prefix => className.startsWith(prefix));
    }

    function isTypeScriptFile(filename) {
      return filename.endsWith('.ts') || filename.endsWith('.tsx');
    }

    function isTypeOnlyImport(node) {
      return node.importKind === 'type' || 
             (node.specifiers && node.specifiers.some(spec => spec.importKind === 'type'));
    }

    function suggestAbstractPath(importPath) {
      // Check custom mappings first
      if (customMappings[importPath]) {
        return customMappings[importPath];
      }

      const resolvedPath = resolvePathAlias(importPath);
      
      // Try to find corresponding abstract path
      for (let i = 0; i < concretePatterns.length; i++) {
        const concretePattern = concretePatterns[i];
        if (minimatch(resolvedPath, concretePattern)) {
          // Map concrete pattern to abstract pattern
          const abstractPattern = abstractPatterns[i] || abstractPatterns[0];
          
          let suggestedPath = resolvedPath;
          
          // Replace concrete directory with abstract directory
          suggestedPath = suggestedPath
            .replace(/\/concrete\//, '/interfaces/')
            .replace(/\/impl\//, '/interfaces/')
            .replace(/\/implementations\//, '/interfaces/')
            .replace(/\/concrete$/, '/interfaces')
            .replace(/\/impl$/, '/interfaces')
            .replace(/\/implementations$/, '/interfaces');

          // Remove concrete suffixes from filename
          concreteClassSuffixes.forEach(suffix => {
            const regex = new RegExp(`${suffix}(\\.\\w+)?$`);
            suggestedPath = suggestedPath.replace(regex, '$1');
          });

          // Check if suggested path exists
          if (fileExists(suggestedPath)) {
            return suggestedPath;
          }
        }
      }
      
      return null;
    }

    function fileExists(filePath) {
      try {
        const absolutePath = path.resolve(path.dirname(context.getFilename()), filePath);
        return fs.existsSync(absolutePath) || 
               fs.existsSync(absolutePath + '.js') || 
               fs.existsSync(absolutePath + '.ts') ||
               fs.existsSync(absolutePath + '.tsx');
      } catch (e) {
        return false;
      }
    }

    function checkImportSpecifiers(node, importPath) {
      if (!node.specifiers) return;

      node.specifiers.forEach(specifier => {
        if (specifier.type === 'ImportDefaultSpecifier' || 
            specifier.type === 'ImportSpecifier') {
          
          const importedName = specifier.imported ? specifier.imported.name : specifier.local.name;
          
          // Check if imported class name suggests it's concrete
          if (hasConcreteClassSuffix(importedName) && !hasAbstractClassPrefix(importedName)) {
            context.report({
              node: specifier,
              messageId: 'concreteClassImport',
              data: {
                className: importedName
              }
            });
          }
        }
      });
    }

    function checkImportDeclaration(node) {
      const importPath = node.source.value;
      const filename = context.getFilename();

      // Skip if current file is allowed
      if (isAllowedFile(filename)) {
        return;
      }

      // Skip external modules if configured
      if (excludeExternalModules && isExternalModule(importPath)) {
        return;
      }

      // Handle TypeScript type imports
      if (isTypeScriptFile(filename) && checkTypeScriptTypes) {
        if (isTypeOnlyImport(node)) {
          // For type-only imports, check if they're from concrete paths
          if (isConcreteImport(importPath) && !isAbstractImport(importPath)) {
            const suggestedPath = suggestAbstractPath(importPath);
            
            context.report({
              node: node.source,
              messageId: 'typeScriptTypeImport',
              data: {
                importPath: importPath
              }
            });

            if (suggestedPath) {
              context.report({
                node: node.source,
                messageId: 'suggestAbstraction',
                data: {
                  importPath: importPath,
                  suggestedPath: suggestedPath
                }
              });
            }
          }
          return; // Don't process type-only imports further
        }
      }

      // Check if importing from concrete implementation
      if (isConcreteImport(importPath)) {
        // Skip if it's already from an abstract path
        if (isAbstractImport(importPath)) {
          return;
        }

        const suggestedPath = suggestAbstractPath(importPath);
        
        context.report({
          node: node.source,
          messageId: 'directConcreteDependency',
          data: {
            importPath: importPath
          }
        });

        if (suggestedPath) {
          context.report({
            node: node.source,
            messageId: 'suggestAbstraction',
            data: {
              importPath: importPath,
              suggestedPath: suggestedPath
            }
          });
        } else if (strictMode) {
          context.report({
            node: node.source,
            messageId: 'noAbstractionFound',
            data: {
              importPath: importPath
            }
          });
        }
      }

      // Check imported class names for concrete indicators
      if (!isTypeOnlyImport(node)) {
        checkImportSpecifiers(node, importPath);
      }
    }

    function checkRequireCall(node) {
      if (
        node.callee.name === 'require' &&
        node.arguments.length === 1 &&
        node.arguments[0].type === 'Literal'
      ) {
        const importPath = node.arguments[0].value;
        const filename = context.getFilename();

        // Skip if current file is allowed
        if (isAllowedFile(filename)) {
          return;
        }

        // Skip external modules if configured
        if (excludeExternalModules && isExternalModule(importPath)) {
          return;
        }

        // Check if requiring from concrete implementation
        if (isConcreteImport(importPath) && !isAbstractImport(importPath)) {
          const suggestedPath = suggestAbstractPath(importPath);
          
          context.report({
            node: node.arguments[0],
            messageId: 'directConcreteDependency',
            data: {
              importPath: importPath
            }
          });

          if (suggestedPath) {
            context.report({
              node: node.arguments[0],
              messageId: 'suggestAbstraction',
              data: {
                importPath: importPath,
                suggestedPath: suggestedPath
              }
            });
          } else if (strictMode) {
            context.report({
              node: node.arguments[0],
              messageId: 'noAbstractionFound',
              data: {
                importPath: importPath
              }
            });
          }
        }
      }
    }

    return {
      ImportDeclaration: checkImportDeclaration,
      CallExpression: checkRequireCall
    };
  }
};