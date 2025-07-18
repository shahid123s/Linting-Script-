'use strict';
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce Liskov Substitution Principle - derived classes should be substitutable for their base classes',
      category: 'SOLID Principles',
      recommended: true
    },
    fixable: null,
    schema: []
  },

  create(context) {
    const sourceCode = context.getSourceCode();
    const classRegistry = new Map(); // Store class info for inheritance analysis
    
    return {
      // First pass: collect all class information
      ClassDeclaration(node) {
        registerClass(node);
      },

      // Second pass: analyze method overrides
      'ClassDeclaration:exit'(node) {
        if (node.superClass) {
          analyzeClassSubstitution(node, context);
        }
      },

      // Analyze individual method overrides
      MethodDefinition(node) {
        if (node.kind === 'method') {
          const classNode = findParentClass(node);
          if (classNode && classNode.superClass && isOverridingMethod(node, classNode)) {
            checkLSPViolation(node, classNode, context);
          }
        }
      }
    };

    function registerClass(node) {
      const className = node.id ? node.id.name : 'AnonymousClass';
      const methods = new Map();
      
      // Extract all methods from the class
      node.body.body.forEach(member => {
        if (member.type === 'MethodDefinition' && member.key.name) {
          methods.set(member.key.name, {
            node: member,
            parameters: member.value.params,
            hasThrowStatements: hasThrowStatements(member.value),
            returnStatements: getReturnStatements(member.value),
            parameterValidations: getParameterValidations(member.value)
          });
        }
      });

      classRegistry.set(className, {
        node,
        methods,
        superClass: node.superClass ? node.superClass.name : null
      });
    }

    function isOverridingMethod(methodNode, classNode) {
      const methodName = methodNode.key.name;
      if (!methodName || !classNode.superClass) return false;

      // Check if method exists in parent class (simplified check)
      const superClassName = classNode.superClass.name;
      const superClassInfo = classRegistry.get(superClassName);
      
      if (superClassInfo && superClassInfo.methods.has(methodName)) {
        return true;
      }

      // Check common overridable methods
      const commonOverridableMethods = [
        'toString', 'valueOf', 'equals', 'hashCode', 'clone',
        'validate', 'execute', 'process', 'handle', 'render'
      ];
      
      return commonOverridableMethods.includes(methodName);
    }

    function hasStrongerPreconditions(methodNode, baseMethodInfo) {
      const currentValidations = getParameterValidations(methodNode.value);
      const baseValidations = baseMethodInfo ? baseMethodInfo.parameterValidations : [];
      
      // Check if current method has more parameter validations than base
      if (currentValidations.length > baseValidations.length) {
        return true;
      }

      // Check for stricter type checking
      const currentParams = methodNode.value.params;
      const baseParams = baseMethodInfo ? baseMethodInfo.parameters : [];
      
      // If current method has fewer parameters, it might be strengthening preconditions
      if (currentParams.length < baseParams.length) {
        return true;
      }

      // Check for additional null checks or type assertions
      return hasAdditionalNullChecks(methodNode.value) || 
             hasStricterTypeChecks(methodNode.value);
    }

    function hasWeakerPostconditions(methodNode, baseMethodInfo) {
      const currentReturns = getReturnStatements(methodNode.value);
      const baseReturns = baseMethodInfo ? baseMethodInfo.returnStatements : [];
      
      // Check if method can return null when base doesn't
      if (canReturnNull(currentReturns) && !canReturnNull(baseReturns)) {
        return true;
      }

      // Check if method throws fewer exceptions than expected
      const currentThrows = hasThrowStatements(methodNode.value);
      const baseThrows = baseMethodInfo ? baseMethodInfo.hasThrowStatements : false;
      
      // If base throws but current doesn't, might be weakening postconditions
      if (baseThrows && !currentThrows) {
        return false; // This is actually good - not throwing is fine
      }

      return false;
    }

    function breaksSubstitutability(classNode) {
      const className = classNode.id ? classNode.id.name : 'AnonymousClass';
      const classInfo = classRegistry.get(className);
      
      if (!classInfo || !classInfo.superClass) return false;

      const superClassInfo = classRegistry.get(classInfo.superClass);
      if (!superClassInfo) return false;

      // Check if subclass throws new types of exceptions
      for (const [methodName, methodInfo] of classInfo.methods) {
        const superMethodInfo = superClassInfo.methods.get(methodName);
        if (superMethodInfo) {
          // Check for new exception types
          if (throwsNewExceptionTypes(methodInfo.node, superMethodInfo.node)) {
            return true;
          }
        }
      }

      return false;
    }

    function checkLSPViolation(methodNode, classNode, context) {
      const methodName = methodNode.key.name;
      const superClassName = classNode.superClass.name;
      const superClassInfo = classRegistry.get(superClassName);
      const baseMethodInfo = superClassInfo ? superClassInfo.methods.get(methodName) : null;

      // Check stronger preconditions
      if (hasStrongerPreconditions(methodNode, baseMethodInfo)) {
        context.report({
          node: methodNode,
          message: `LSP Violation: Method '${methodName}' has stronger preconditions than base method`
        });
      }

      // Check weaker postconditions
      if (hasWeakerPostconditions(methodNode, baseMethodInfo)) {
        context.report({
          node: methodNode,
          message: `LSP Violation: Method '${methodName}' has weaker postconditions than base method`
        });
      }

      // Check for new exception types
      if (baseMethodInfo && throwsNewExceptionTypes(methodNode, baseMethodInfo.node)) {
        context.report({
          node: methodNode,
          message: `LSP Violation: Method '${methodName}' throws exceptions not declared in base method`
        });
      }
    }

    function analyzeClassSubstitution(classNode, context) {
      if (breaksSubstitutability(classNode)) {
        context.report({
          node: classNode,
          message: 'LSP Violation: Derived class cannot substitute base class due to contract violations'
        });
      }
    }

    // Helper functions
    function findParentClass(node) {
      let current = node.parent;
      while (current) {
        if (current.type === 'ClassDeclaration') {
          return current;
        }
        current = current.parent;
      }
      return null;
    }

    function hasThrowStatements(functionNode) {
      let hasThrow = false;
      
      function checkNode(node) {
        if (!node) return;
        
        if (node.type === 'ThrowStatement') {
          hasThrow = true;
          return;
        }
        
        // Recursively check child nodes
        for (const key in node) {
          if (node[key] && typeof node[key] === 'object') {
            if (Array.isArray(node[key])) {
              node[key].forEach(checkNode);
            } else {
              checkNode(node[key]);
            }
          }
        }
      }
      
      checkNode(functionNode.body);
      return hasThrow;
    }

    function getReturnStatements(functionNode) {
      const returns = [];
      
      function collectReturns(node) {
        if (!node) return;
        
        if (node.type === 'ReturnStatement') {
          returns.push(node);
          return;
        }
        
        for (const key in node) {
          if (node[key] && typeof node[key] === 'object') {
            if (Array.isArray(node[key])) {
              node[key].forEach(collectReturns);
            } else {
              collectReturns(node[key]);
            }
          }
        }
      }
      
      collectReturns(functionNode.body);
      return returns;
    }

    function getParameterValidations(functionNode) {
      const validations = [];
      
      function checkForValidations(node) {
        if (!node) return;
        
        // Look for common validation patterns
        if (node.type === 'IfStatement' && 
            node.test && 
            isParameterValidation(node.test)) {
          validations.push(node);
        }
        
        for (const key in node) {
          if (node[key] && typeof node[key] === 'object') {
            if (Array.isArray(node[key])) {
              node[key].forEach(checkForValidations);
            } else {
              checkForValidations(node[key]);
            }
          }
        }
      }
      
      checkForValidations(functionNode.body);
      return validations;
    }

    function isParameterValidation(testNode) {
      // Simple heuristic: check if it's testing parameter properties
      if (testNode.type === 'BinaryExpression') {
        const left = testNode.left;
        const right = testNode.right;
        
        // Check for null/undefined checks
        if ((left.type === 'Identifier' && 
             (right.type === 'Literal' && (right.value === null || right.value === undefined))) ||
            (testNode.operator === '==' || testNode.operator === '===' || 
             testNode.operator === '!=' || testNode.operator === '!==')) {
          return true;
        }
      }
      
      return false;
    }

    function hasAdditionalNullChecks(functionNode) {
      const validations = getParameterValidations(functionNode);
      return validations.some(validation => 
        validation.test && 
        validation.test.type === 'BinaryExpression' &&
        (validation.test.right.value === null || validation.test.right.value === undefined)
      );
    }

    function hasStricterTypeChecks(functionNode) {
      // Look for typeof checks or instanceof checks
      let hasStrictChecks = false;
      
      function checkNode(node) {
        if (!node) return;
        
        if (node.type === 'BinaryExpression' && 
            node.left && node.left.type === 'UnaryExpression' &&
            node.left.operator === 'typeof') {
          hasStrictChecks = true;
          return;
        }
        
        if (node.type === 'BinaryExpression' && 
            node.operator === 'instanceof') {
          hasStrictChecks = true;
          return;
        }
        
        for (const key in node) {
          if (node[key] && typeof node[key] === 'object') {
            if (Array.isArray(node[key])) {
              node[key].forEach(checkNode);
            } else {
              checkNode(node[key]);
            }
          }
        }
      }
      
      checkNode(functionNode.body);
      return hasStrictChecks;
    }

    function canReturnNull(returnStatements) {
      return returnStatements.some(stmt => 
        stmt.argument && 
        stmt.argument.type === 'Literal' && 
        stmt.argument.value === null
      );
    }

    function throwsNewExceptionTypes(currentMethod, baseMethod) {
      const currentThrows = getThrowStatements(currentMethod.value);
      const baseThrows = getThrowStatements(baseMethod.value);
      
      // Simple check: if current method throws and base doesn't
      if (currentThrows.length > 0 && baseThrows.length === 0) {
        return true;
      }
      
      // Check for different exception types (simplified)
      for (const currentThrow of currentThrows) {
        const isNewException = !baseThrows.some(baseThrow => 
          isSameExceptionType(currentThrow, baseThrow)
        );
        if (isNewException) {
          return true;
        }
      }
      
      return false;
    }

    function getThrowStatements(functionNode) {
      const throws = [];
      
      function collectThrows(node) {
        if (!node) return;
        
        if (node.type === 'ThrowStatement') {
          throws.push(node);
          return;
        }
        
        for (const key in node) {
          if (node[key] && typeof node[key] === 'object') {
            if (Array.isArray(node[key])) {
              node[key].forEach(collectThrows);
            } else {
              collectThrows(node[key]);
            }
          }
        }
      }
      
      collectThrows(functionNode.body);
      return throws;
    }

    function isSameExceptionType(throw1, throw2) {
      // Simplified comparison - in real implementation, would need more sophisticated analysis
      if (throw1.argument && throw2.argument) {
        if (throw1.argument.type === 'NewExpression' && throw2.argument.type === 'NewExpression') {
          return throw1.argument.callee.name === throw2.argument.callee.name;
        }
        if (throw1.argument.type === 'Identifier' && throw2.argument.type === 'Identifier') {
          return throw1.argument.name === throw2.argument.name;
        }
      }
      return false;
    }
  }
};