'use strict';

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'enforce clean architecture principles including dependency rule, layer isolation, and boundary contracts',
      category: 'Architecture',
      recommended: true,
    },
    fixable: null,
    schema: [
      {
        type: 'object',
        properties: {
          layers: {
            type: 'object',
            properties: {
              entities: {
                type: 'object',
                properties: {
                  patterns: { type: 'array', items: { type: 'string' } },
                  level: { type: 'number' }
                },
                default: { patterns: ['**/entities/**', '**/domain/**'], level: 1 }
              },
              useCases: {
                type: 'object',
                properties: {
                  patterns: { type: 'array', items: { type: 'string' } },
                  level: { type: 'number' }
                },
                default: { patterns: ['**/use-cases/**', '**/application/**', '**/services/**'], level: 2 }
              },
              adapters: {
                type: 'object',
                properties: {
                  patterns: { type: 'array', items: { type: 'string' } },
                  level: { type: 'number' }
                },
                default: { patterns: ['**/adapters/**', '**/controllers/**', '**/presenters/**', '**/gateways/**'], level: 3 }
              },
              frameworks: {
                type: 'object',
                properties: {
                  patterns: { type: 'array', items: { type: 'string' } },
                  level: { type: 'number' }
                },
                default: { patterns: ['**/frameworks/**', '**/infrastructure/**', '**/external/**'], level: 4 }
              }
            }
          },
          frameworkPatterns: {
            type: 'array',
            items: { type: 'string' },
            default: ['express', 'mongoose', 'sequelize', 'typeorm', 'axios', 'fetch', 'fs', 'path']
          },
          interfacePatterns: {
            type: 'array',
            items: { type: 'string' },
            default: ['**/interfaces/**', '**/ports/**', '**/contracts/**']
          },
          allowedCrossCuts: {
            type: 'array',
            items: { type: 'string' },
            default: ['**/shared/**', '**/utils/**', '**/constants/**', '**/types/**']
          },
          businessLogicPatterns: {
            type: 'array',
            items: { type: 'string' },
            default: ['**/entities/**', '**/use-cases/**', '**/domain/**', '**/application/**']
          },
          testPatterns: {
            type: 'array',
            items: { type: 'string' },
            default: ['**/*.test.js', '**/*.spec.js', '**/test/**', '**/tests/**']
          }
        },
        additionalProperties: false
      }
    ],
    messages: {
      dependencyRuleViolation: 'Clean Architecture violation: {{innerLayer}} (level {{innerLevel}}) cannot import from {{outerLayer}} (level {{outerLevel}}). Dependencies must point inward.',
      frameworkInBusinessLogic: 'Clean Architecture violation: Business logic "{{filePath}}" should not directly import framework "{{framework}}". Use dependency injection or adapters.',
      layerMixing: 'Clean Architecture violation: File "{{filePath}}" appears to mix responsibilities from multiple layers: {{layers}}.',
      missingInterface: 'Clean Architecture violation: Cross-boundary import "{{importPath}}" should go through an interface or port.',
      entityDependsOnUseCase: 'Clean Architecture violation: Entity "{{entity}}" should not depend on use case "{{useCase}}". Entities should be independent.',
      directDatabaseInUseCase: 'Clean Architecture violation: Use case should not directly import database implementation "{{importPath}}". Use repository interface.',
      uiInBusinessLogic: 'Clean Architecture violation: Business logic should not import UI components "{{importPath}}".',
      businessLogicInFramework: 'Clean Architecture violation: Framework layer should not contain business logic. Move "{{businessLogic}}" to appropriate inner layer.',
      skipLayerViolation: 'Clean Architecture violation: "{{currentLayer}}" should not directly import "{{targetLayer}}". Go through intermediate layer "{{intermediateLayer}}".',
      circularDependency: 'Clean Architecture violation: Circular dependency detected between layers "{{layer1}}" and "{{layer2}}".'
    }
  },

  create(context) {
    const options = context.options[0] || {};
    const layers = options.layers || {
      entities: { patterns: ['**/entities/**', '**/domain/**'], level: 1 },
      useCases: { patterns: ['**/use-cases/**', '**/application/**', '**/services/**'], level: 2 },
      adapters: { patterns: ['**/adapters/**', '**/controllers/**', '**/presenters/**', '**/gateways/**'], level: 3 },
      frameworks: { patterns: ['**/frameworks/**', '**/infrastructure/**', '**/external/**'], level: 4 }
    };
    
    const frameworkPatterns = options.frameworkPatterns || ['express', 'mongoose', 'sequelize', 'typeorm', 'axios', 'fetch', 'fs', 'path'];
    const interfacePatterns = options.interfacePatterns || ['**/interfaces/**', '**/ports/**', '**/contracts/**'];
    const allowedCrossCuts = options.allowedCrossCuts || ['**/shared/**', '**/utils/**', '**/constants/**', '**/types/**'];
    const businessLogicPatterns = options.businessLogicPatterns || ['**/entities/**', '**/use-cases/**', '**/domain/**', '**/application/**'];
    const testPatterns = options.testPatterns || ['**/*.test.js', '**/*.spec.js', '**/test/**', '**/tests/**'];

    const minimatch = require('minimatch');
    const path = require('path');

    function isTestFile(filePath) {
      return testPatterns.some(pattern => minimatch(filePath, pattern));
    }

    function isCrossCutting(filePath) {
      return allowedCrossCuts.some(pattern => minimatch(filePath, pattern));
    }

    function isInterface(filePath) {
      return interfacePatterns.some(pattern => minimatch(filePath, pattern));
    }

    function isFramework(importPath) {
      return frameworkPatterns.some(pattern => 
        importPath.includes(pattern) || importPath.startsWith(pattern)
      );
    }

    function isBusinessLogic(filePath) {
      return businessLogicPatterns.some(pattern => minimatch(filePath, pattern));
    }

    function getLayer(filePath) {
      for (const [layerName, layerConfig] of Object.entries(layers)) {
        if (layerConfig.patterns.some(pattern => minimatch(filePath, pattern))) {
          return { name: layerName, level: layerConfig.level };
        }
      }
      return null;
    }

    function isExternalModule(importPath) {
      return !importPath.startsWith('./') && 
             !importPath.startsWith('../') && 
             !path.isAbsolute(importPath);
    }

    function resolveImportPath(importPath, currentFile) {
      if (isExternalModule(importPath)) {
        return importPath;
      }
      
      const currentDir = path.dirname(currentFile);
      const resolvedPath = path.resolve(currentDir, importPath);
      return path.relative(process.cwd(), resolvedPath);
    }

    function checkDependencyRule(currentFile, importPath) {
      const currentLayer = getLayer(currentFile);
      const importLayer = getLayer(importPath);

      if (!currentLayer || !importLayer) {
        return null;
      }

      // Dependency rule: inner layers cannot import outer layers
      if (currentLayer.level < importLayer.level) {
        return {
          type: 'dependencyRuleViolation',
          data: {
            innerLayer: currentLayer.name,
            innerLevel: currentLayer.level,
            outerLayer: importLayer.name,
            outerLevel: importLayer.level
          }
        };
      }

      return null;
    }

    function checkFrameworkDependency(currentFile, importPath) {
      if (isBusinessLogic(currentFile) && isFramework(importPath)) {
        return {
          type: 'frameworkInBusinessLogic',
          data: {
            filePath: currentFile,
            framework: importPath
          }
        };
      }
      return null;
    }

    function checkEntityDependencies(currentFile, importPath) {
      const currentLayer = getLayer(currentFile);
      const importLayer = getLayer(importPath);

      if (currentLayer && currentLayer.name === 'entities' && 
          importLayer && importLayer.name === 'useCases') {
        return {
          type: 'entityDependsOnUseCase',
          data: {
            entity: currentFile,
            useCase: importPath
          }
        };
      }
      return null;
    }

    function checkSkipLayerViolation(currentFile, importPath) {
      const currentLayer = getLayer(currentFile);
      const importLayer = getLayer(importPath);

      if (!currentLayer || !importLayer) return null;

      const levelDiff = importLayer.level - currentLayer.level;
      
      // If skipping more than one layer (e.g., entities directly importing frameworks)
      if (levelDiff > 1) {
        const layerNames = Object.keys(layers);
        const currentIndex = layerNames.indexOf(currentLayer.name);
        const intermediateLayer = layerNames[currentIndex + 1];
        
        return {
          type: 'skipLayerViolation',
          data: {
            currentLayer: currentLayer.name,
            targetLayer: importLayer.name,
            intermediateLayer: intermediateLayer
          }
        };
      }
      return null;
    }

    function checkCrossBoundaryInterface(currentFile, importPath) {
      const currentLayer = getLayer(currentFile);
      const importLayer = getLayer(importPath);

      if (!currentLayer || !importLayer) return null;

      // Check if crossing boundaries without going through interface
      if (Math.abs(currentLayer.level - importLayer.level) > 1 && 
          !isInterface(importPath) && 
          !isCrossCutting(importPath)) {
        return {
          type: 'missingInterface',
          data: {
            importPath: importPath
          }
        };
      }
      return null;
    }

    function checkUIInBusinessLogic(currentFile, importPath) {
      const uiPatterns = ['**/components/**', '**/views/**', '**/pages/**', 'react', 'vue', '@angular'];
      
      if (isBusinessLogic(currentFile) && 
          uiPatterns.some(pattern => minimatch(importPath, pattern) || importPath.includes(pattern))) {
        return {
          type: 'uiInBusinessLogic',
          data: {
            importPath: importPath
          }
        };
      }
      return null;
    }

    function checkDatabaseInUseCase(currentFile, importPath) {
      const databasePatterns = ['mongoose', 'sequelize', 'typeorm', 'mysql', 'postgresql', 'mongodb'];
      const currentLayer = getLayer(currentFile);
      
      if (currentLayer && currentLayer.name === 'useCases' && 
          databasePatterns.some(pattern => importPath.includes(pattern))) {
        return {
          type: 'directDatabaseInUseCase',
          data: {
            importPath: importPath
          }
        };
      }
      return null;
    }

    function checkImportDeclaration(node) {
      const importPath = node.source.value;
      const currentFile = context.getFilename();

      // Skip test files
      if (isTestFile(currentFile)) {
        return;
      }

      // Skip cross-cutting concerns
      if (isCrossCutting(currentFile) || isCrossCutting(importPath)) {
        return;
      }

      const resolvedImportPath = resolveImportPath(importPath, currentFile);

      // Run all checks
      const checks = [
        checkDependencyRule(currentFile, resolvedImportPath),
        checkFrameworkDependency(currentFile, importPath),
        checkEntityDependencies(currentFile, resolvedImportPath),
        checkSkipLayerViolation(currentFile, resolvedImportPath),
        checkCrossBoundaryInterface(currentFile, resolvedImportPath),
        checkUIInBusinessLogic(currentFile, importPath),
        checkDatabaseInUseCase(currentFile, importPath)
      ];

      checks.forEach(violation => {
        if (violation) {
          context.report({
            node: node.source,
            messageId: violation.type,
            data: violation.data
          });
        }
      });
    }

    function checkRequireCall(node) {
      if (
        node.callee.name === 'require' &&
        node.arguments.length === 1 &&
        node.arguments[0].type === 'Literal'
      ) {
        const importPath = node.arguments[0].value;
        const currentFile = context.getFilename();

        // Skip test files
        if (isTestFile(currentFile)) {
          return;
        }

        // Skip cross-cutting concerns
        if (isCrossCutting(currentFile) || isCrossCutting(importPath)) {
          return;
        }

        const resolvedImportPath = resolveImportPath(importPath, currentFile);

        // Run all checks
        const checks = [
          checkDependencyRule(currentFile, resolvedImportPath),
          checkFrameworkDependency(currentFile, importPath),
          checkEntityDependencies(currentFile, resolvedImportPath),
          checkSkipLayerViolation(currentFile, resolvedImportPath),
          checkCrossBoundaryInterface(currentFile, resolvedImportPath),
          checkUIInBusinessLogic(currentFile, importPath),
          checkDatabaseInUseCase(currentFile, importPath)
        ];

        checks.forEach(violation => {
          if (violation) {
            context.report({
              node: node.arguments[0],
              messageId: violation.type,
              data: violation.data
            });
          }
        });
      }
    }

    return {
      ImportDeclaration: checkImportDeclaration,
      CallExpression: checkRequireCall
    };
  }
};