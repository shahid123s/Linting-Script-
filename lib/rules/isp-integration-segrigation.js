// rules/isp-interface-segregation.js
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce Interface Segregation Principle - classes should not be forced to depend on interfaces they do not use',
      category: 'SOLID Principles',
      recommended: true
    },
    fixable: null,
    schema: [
      {
        type: 'object',
        properties: {
          maxMethods: {
            type: 'integer',
            minimum: 1,
            default: 10
          },
          maxUnusedMethods: {
            type: 'integer',
            minimum: 0,
            default: 3
          },
          complexityVarianceThreshold: {
            type: 'integer',
            minimum: 1,
            default: 5
          },
          excludePatterns: {
            type: 'array',
            items: {
              type: 'string'
            },
            default: ['constructor', 'toString', 'valueOf']
          },
          includeUsageCount: {
            type: 'boolean',
            default: true
          },
          debugMode: {
            type: 'boolean',
            default: false
          },
          ignoreInheritedMethods: {
            type: 'boolean',
            default: true
          }
        },
        additionalProperties: false
      }
    ]
  },

  create(context) {
    const options = context.options[0] || {};
    const maxMethods = options.maxMethods || 10;
    const maxUnusedMethods = options.maxUnusedMethods || 3;
    const complexityVarianceThreshold = options.complexityVarianceThreshold || 5;
    const excludePatterns = options.excludePatterns || ['constructor', 'toString', 'valueOf'];
    const includeUsageCount = options.includeUsageCount !== false;
    const debugMode = options.debugMode || false;
    const ignoreInheritedMethods = options.ignoreInheritedMethods !== false;
    
    const sourceCode = context.getSourceCode();
    const classAnalysis = new Map();
    const interfaceUsage = new Map();
    const inheritanceChain = new Map();
    let objectIdCounter = 0;
    
    // Debug logging helper
    function debugLog(message, data = null) {
      if (debugMode) {
        console.log(`[ISP Debug] ${message}`, data ? JSON.stringify(data, null, 2) : '');
      }
    }

    return {
      // Collect class information including inheritance
      ClassDeclaration(node) {
        analyzeClass(node);
        if (node.superClass) {
          trackInheritance(node);
        }
      },

      // Handle TypeScript interfaces
      TSInterfaceDeclaration(node) {
        analyzeTypeScriptInterface(node);
      },

      // Analyze interface-like objects
      ObjectExpression(node) {
        if (isInterfaceLikeObject(node)) {
          analyzeInterfaceObject(node);
        }
      },

      // Track method calls with proper scoping
      CallExpression(node) {
        trackMethodUsage(node);
      },

      // Track member access patterns
      MemberExpression(node) {
        trackMemberAccess(node);
      },

      // Final analysis after traversing the entire file
      'Program:exit'() {
        performISPAnalysis();
      }
    };

    function analyzeClass(node) {
      const className = node.id ? node.id.name : 'AnonymousClass';
      const methods = [];
      const methodCategories = new Map();
      const isInterfaceLike = isInterfaceLikeNaming(className);
      
      debugLog(`Analyzing class: ${className}`, { isInterfaceLike });
      
      // Extract all methods from the class including arrow functions
      node.body.body.forEach(member => {
        let methodInfo = null;
        
        if (member.type === 'MethodDefinition' && member.key.name) {
          methodInfo = extractMethodInfo(member, member.key.name, 'method');
        } else if (member.type === 'PropertyDefinition' && member.key.name && 
                   member.value && member.value.type === 'ArrowFunctionExpression') {
          // Handle arrow function properties
          methodInfo = extractMethodInfo(member, member.key.name, 'arrow');
        }
        
        if (methodInfo) {
          // Skip excluded patterns
          if (excludePatterns.some(pattern => methodInfo.name.includes(pattern))) {
            debugLog(`Skipping excluded method: ${methodInfo.name}`);
            return;
          }
          
          // Check if method is inherited
          if (ignoreInheritedMethods && isInheritedMethod(className, methodInfo.name)) {
            debugLog(`Skipping inherited method: ${methodInfo.name}`);
            return;
          }
          
          methods.push(methodInfo);
          
          // Group methods by category
          if (!methodCategories.has(methodInfo.category)) {
            methodCategories.set(methodInfo.category, []);
          }
          methodCategories.get(methodInfo.category).push(methodInfo);
        }
      });

      classAnalysis.set(className, {
        node,
        methods,
        methodCategories,
        totalMethods: methods.length,
        unusedMethods: 0,
        isInterface: isInterfaceLike,
        isTypeScriptInterface: false,
        superClass: node.superClass ? node.superClass.name : null
      });
      
      debugLog(`Class analysis complete for ${className}`, {
        totalMethods: methods.length,
        categories: Array.from(methodCategories.keys())
      });
    }

    function analyzeTypeScriptInterface(node) {
      const interfaceName = node.id.name;
      const methods = [];
      const methodCategories = new Map();
      
      debugLog(`Analyzing TypeScript interface: ${interfaceName}`);
      
      if (node.body && node.body.body) {
        node.body.body.forEach(member => {
          if (member.type === 'TSMethodSignature' && member.key.name) {
            const methodInfo = {
              name: member.key.name,
              node: member,
              category: categorizeMethod(member.key.name),
              isUsed: false,
              usageCount: 0,
              parameters: member.params ? member.params.length : 0,
              complexity: 1, // Interface methods have base complexity
              methodType: 'interface'
            };
            
            if (!excludePatterns.some(pattern => methodInfo.name.includes(pattern))) {
              methods.push(methodInfo);
              
              if (!methodCategories.has(methodInfo.category)) {
                methodCategories.set(methodInfo.category, []);
              }
              methodCategories.get(methodInfo.category).push(methodInfo);
            }
          }
        });
      }

      classAnalysis.set(interfaceName, {
        node,
        methods,
        methodCategories,
        totalMethods: methods.length,
        unusedMethods: 0,
        isInterface: true,
        isTypeScriptInterface: true,
        superClass: null
      });
    }

    function trackInheritance(node) {
      const className = node.id ? node.id.name : 'AnonymousClass';
      const superClassName = node.superClass ? node.superClass.name : null;
      
      if (superClassName) {
        inheritanceChain.set(className, superClassName);
        debugLog(`Tracked inheritance: ${className} extends ${superClassName}`);
      }
    }

    function isInheritedMethod(className, methodName) {
      let currentClass = className;
      
      while (inheritanceChain.has(currentClass)) {
        const superClass = inheritanceChain.get(currentClass);
        const superClassInfo = classAnalysis.get(superClass);
        
        if (superClassInfo && superClassInfo.methods.some(m => m.name === methodName)) {
          return true;
        }
        
        currentClass = superClass;
      }
      
      return false;
    }

    function extractMethodInfo(member, methodName, methodType) {
      const functionNode = methodType === 'arrow' ? member.value : member.value;
      
      return {
        name: methodName,
        node: member,
        category: categorizeMethod(methodName),
        isUsed: false,
        usageCount: 0,
        parameters: functionNode.params ? functionNode.params.length : 0,
        complexity: calculateMethodComplexity(functionNode),
        methodType: methodType
      };
    }

    function isInterfaceLikeNaming(name) {
      // Check for interface-like naming conventions
      return /^I[A-Z]/.test(name) || // IUser, IService
             name.endsWith('Interface') || // UserInterface
             name.endsWith('Contract') || // UserContract
             name.endsWith('Protocol') || // UserProtocol
             name.endsWith('Spec'); // UserSpec
    }

    function isInterfaceLikeObject(node) {
      // Enhanced detection for interface-like objects
      if (node.properties.length < 3) return false;
      
      const functionProps = node.properties.filter(prop => 
        prop.type === 'Property' && 
        prop.value && 
        (prop.value.type === 'FunctionExpression' || prop.value.type === 'ArrowFunctionExpression')
      );
      
      // Check if parent context suggests interface usage
      const parent = node.parent;
      const isInterfaceContext = parent && (
        parent.type === 'VariableDeclarator' || 
        parent.type === 'AssignmentExpression' ||
        parent.type === 'Property'
      );
      
      return functionProps.length >= 3 && isInterfaceContext;
    }

    function analyzeInterfaceObject(node) {
      const methods = [];
      const methodCategories = new Map();
      const objectId = generateStableObjectId(node);
      
      debugLog(`Analyzing interface object: ${objectId}`);
      
      node.properties.forEach(prop => {
        if (prop.type === 'Property' && prop.key.name &&
            prop.value && 
            (prop.value.type === 'FunctionExpression' || prop.value.type === 'ArrowFunctionExpression')) {
          
          const methodName = prop.key.name;
          
          if (excludePatterns.some(pattern => methodName.includes(pattern))) {
            return;
          }

          const methodInfo = {
            name: methodName,
            node: prop,
            category: categorizeMethod(methodName),
            isUsed: false,
            usageCount: 0,
            parameters: prop.value.params.length,
            complexity: calculateMethodComplexity(prop.value),
            methodType: 'object'
          };

          methods.push(methodInfo);
          
          if (!methodCategories.has(methodInfo.category)) {
            methodCategories.set(methodInfo.category, []);
          }
          methodCategories.get(methodInfo.category).push(methodInfo);
        }
      });

      if (methods.length > 0) {
        classAnalysis.set(objectId, {
          node,
          methods,
          methodCategories,
          totalMethods: methods.length,
          unusedMethods: 0,
          isInterface: true,
          isTypeScriptInterface: false,
          superClass: null
        });
      }
    }

    function generateStableObjectId(node) {
      // Generate more stable ID based on parent context
      objectIdCounter++;
      let contextName = 'Object';
      
      if (node.parent && node.parent.type === 'VariableDeclarator' && node.parent.id.name) {
        contextName = node.parent.id.name;
      } else if (node.parent && node.parent.type === 'Property' && node.parent.key.name) {
        contextName = node.parent.key.name;
      }
      
      return `${contextName}_${objectIdCounter}`;
    }

    function categorizeMethod(methodName) {
      // Enhanced method categorization
      const categories = {
        'data': ['get', 'set', 'read', 'write', 'load', 'save', 'fetch', 'store', 'find', 'select', 'insert', 'update', 'delete'],
        'validation': ['validate', 'verify', 'check', 'confirm', 'ensure', 'assert', 'test', 'is', 'has', 'can'],
        'transformation': ['transform', 'convert', 'parse', 'format', 'serialize', 'deserialize', 'map', 'filter', 'reduce'],
        'communication': ['send', 'receive', 'notify', 'emit', 'broadcast', 'publish', 'subscribe', 'connect', 'disconnect'],
        'calculation': ['calculate', 'compute', 'process', 'analyze', 'sum', 'count', 'average', 'min', 'max'],
        'ui': ['render', 'display', 'show', 'hide', 'update', 'refresh', 'draw', 'paint', 'animate'],
        'lifecycle': ['init', 'start', 'stop', 'destroy', 'create', 'delete', 'dispose', 'cleanup', 'setup', 'teardown'],
        'utility': ['log', 'debug', 'trace', 'measure', 'monitor', 'profile', 'benchmark', 'clone', 'copy'],
        'security': ['authenticate', 'authorize', 'encrypt', 'decrypt', 'hash', 'sign', 'verify', 'sanitize'],
        'navigation': ['navigate', 'redirect', 'route', 'go', 'back', 'forward', 'next', 'previous']
      };

      const lowerName = methodName.toLowerCase();
      
      for (const [category, keywords] of Object.entries(categories)) {
        if (keywords.some(keyword => lowerName.includes(keyword))) {
          return category;
        }
      }
      
      return 'general';
    }

    function calculateMethodComplexity(functionNode) {
      let complexity = 1; // Base complexity
      
      function countComplexity(node) {
        if (!node) return;
        
        // Add complexity for control structures
        if (node.type === 'IfStatement' || 
            node.type === 'ConditionalExpression' ||
            node.type === 'SwitchStatement' ||
            node.type === 'WhileStatement' ||
            node.type === 'ForStatement' ||
            node.type === 'ForInStatement' ||
            node.type === 'ForOfStatement' ||
            node.type === 'DoWhileStatement') {
          complexity++;
        }
        
        // Add complexity for logical operators
        if (node.type === 'LogicalExpression' && 
            (node.operator === '&&' || node.operator === '||')) {
          complexity++;
        }
        
        // Add complexity for try-catch
        if (node.type === 'TryStatement') {
          complexity++;
        }
        
        // Add complexity for nested functions
        if (node.type === 'FunctionExpression' || 
            node.type === 'ArrowFunctionExpression' ||
            node.type === 'FunctionDeclaration') {
          complexity++;
        }
        
        // Recursively check child nodes
        for (const key in node) {
          if (node[key] && typeof node[key] === 'object') {
            if (Array.isArray(node[key])) {
              node[key].forEach(countComplexity);
            } else {
              countComplexity(node[key]);
            }
          }
        }
      }
      
      if (functionNode && functionNode.body) {
        countComplexity(functionNode.body);
      }
      return complexity;
    }

    function trackMethodUsage(node) {
      if (node.callee && node.callee.type === 'MemberExpression') {
        const methodName = node.callee.property.name;
        const objectName = node.callee.object.name;
        
        if (methodName && objectName) {
          debugLog(`Tracking method usage: ${objectName}.${methodName}`);
          
          // More precise tracking based on object context
          classAnalysis.forEach((classInfo, className) => {
            // Check if the method call is on an instance of this class
            if (className === objectName || 
                (classInfo.isInterface && objectName.toLowerCase().includes(className.toLowerCase()))) {
              const method = classInfo.methods.find(m => m.name === methodName);
              if (method) {
                method.isUsed = true;
                method.usageCount++;
                debugLog(`Method usage tracked: ${className}.${methodName} (count: ${method.usageCount})`);
              }
            }
          });
        }
      }
    }

    function trackMemberAccess(node) {
      if (node.property && node.property.name && node.object && node.object.name) {
        const propertyName = node.property.name;
        const objectName = node.object.name;
        
        // Track member access for better usage detection
        classAnalysis.forEach((classInfo, className) => {
          if (className === objectName) {
            const method = classInfo.methods.find(m => m.name === propertyName);
            if (method) {
              method.isUsed = true;
              method.usageCount++;
            }
          }
        });
      }
    }

    function performISPAnalysis() {
      debugLog('Starting ISP analysis', { totalClasses: classAnalysis.size });
      
      classAnalysis.forEach((classInfo, className) => {
        debugLog(`Analyzing ${className}`, {
          totalMethods: classInfo.totalMethods,
          categories: Array.from(classInfo.methodCategories.keys())
        });
        
        // Check for fat interfaces (too many methods)
        if (classInfo.totalMethods > maxMethods) {
          reportFatInterface(classInfo, className);
        }
        
        // Check for unused methods
        const unusedMethods = classInfo.methods.filter(m => !m.isUsed);
        classInfo.unusedMethods = unusedMethods.length;
        
        if (unusedMethods.length > maxUnusedMethods) {
          reportUnusedMethods(classInfo, className, unusedMethods);
        }
        
        // Check for interface segregation violations
        if (hasSegregationViolations(classInfo)) {
          reportSegregationViolation(classInfo, className);
        }
        
        // Check for mixed responsibilities
        if (hasMixedResponsibilities(classInfo)) {
          reportMixedResponsibilities(classInfo, className);
        }
      });
      
      debugLog('ISP analysis complete');
    }

    function reportFatInterface(classInfo, className) {
      const interfaceType = classInfo.isTypeScriptInterface ? 'TypeScript interface' : 
                           classInfo.isInterface ? 'Interface object' : 'Class';
      
      const message = `ISP Violation: ${interfaceType} '${className}' has too many methods (${classInfo.totalMethods}). Consider splitting into smaller interfaces.`;
      
      context.report({
        node: classInfo.node,
        message
      });
    }

    function reportUnusedMethods(classInfo, className, unusedMethods) {
      const methodDetails = unusedMethods.map(m => 
        includeUsageCount ? `${m.name} (${m.usageCount} uses)` : m.name
      ).join(', ');
      
      const interfaceType = classInfo.isTypeScriptInterface ? 'TypeScript interface' : 
                           classInfo.isInterface ? 'Interface' : 'Class';
      
      const message = `ISP Violation: ${interfaceType} '${className}' has ${unusedMethods.length} unused methods: ${methodDetails}`;
      
      context.report({
        node: classInfo.node,
        message
      });
    }

    function hasSegregationViolations(classInfo) {
      // Check if methods are grouped by unrelated categories
      const categories = Array.from(classInfo.methodCategories.keys());
      
      // If we have more than 3 different categories, it might be a violation
      if (categories.length > 3) {
        return true;
      }
      
      // Check for methods with very different complexity levels (configurable threshold)
      const complexities = classInfo.methods.map(m => m.complexity);
      if (complexities.length > 1) {
        const avgComplexity = complexities.reduce((a, b) => a + b, 0) / complexities.length;
        const hasHighVariance = complexities.some(c => Math.abs(c - avgComplexity) > complexityVarianceThreshold);
        
        if (hasHighVariance) {
          debugLog(`High complexity variance detected in ${classInfo.node.id?.name}`, {
            complexities,
            avgComplexity,
            threshold: complexityVarianceThreshold
          });
          return true;
        }
      }
      
      return false;
    }

    function reportSegregationViolation(classInfo, className) {
      const categories = Array.from(classInfo.methodCategories.keys());
      const interfaceType = classInfo.isTypeScriptInterface ? 'TypeScript interface' : 
                           classInfo.isInterface ? 'Interface' : 'Class';
      
      const message = `ISP Violation: ${interfaceType} '${className}' mixes multiple responsibilities: ${categories.join(', ')}. Consider segregating into focused interfaces.`;
      
      context.report({
        node: classInfo.node,
        message
      });
    }

    function hasMixedResponsibilities(classInfo) {
      // Check if we have methods from very different categories
      const categories = classInfo.methodCategories;
      const categoryNames = Array.from(categories.keys());
      
      // Enhanced incompatible category combinations
      const incompatiblePairs = [
        ['data', 'ui'],
        ['validation', 'communication'],
        ['calculation', 'ui'],
        ['lifecycle', 'data'],
        ['security', 'ui'],
        ['navigation', 'calculation'],
        ['utility', 'data'],
        ['transformation', 'ui']
      ];
      
      for (const [cat1, cat2] of incompatiblePairs) {
        if (categoryNames.includes(cat1) && categoryNames.includes(cat2)) {
          debugLog(`Mixed responsibilities detected: ${cat1} + ${cat2}`);
          return true;
        }
      }
      
      return false;
    }

    function reportMixedResponsibilities(classInfo, className) {
      const categories = Array.from(classInfo.methodCategories.keys());
      const interfaceType = classInfo.isTypeScriptInterface ? 'TypeScript interface' : 
                           classInfo.isInterface ? 'Interface' : 'Class';
      
      const message = `ISP Violation: ${interfaceType} '${className}' has mixed responsibilities (${categories.join(', ')}). Consider creating separate interfaces for each responsibility.`;
      
      context.report({
        node: classInfo.node,
        message
      });
    }
  }
};