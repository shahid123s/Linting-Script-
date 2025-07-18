'use strict';
module.exports = {
  meta: {
    type: "problem",
    docs: {
      description: "Enforce repository architecture pattern",
      category: "Best Practices",
      recommended: true
    },
    fixable: null,
    schema: [
      {
        type: "object",
        properties: {
          repositoryPattern: {
            type: "string",
            enum: ["interface", "class"],
            default: "interface"
          },
          namingConvention: {
            type: "object",
            properties: {
              interface: {
                type: "string",
                default: "I{name}Repository"
              },
              implementation: {
                type: "string", 
                default: "{type}{name}Repository"
              }
            }
          },
          allowedMethods: {
            type: "array",
            items: {
              type: "string"
            },
            default: ["find", "findById", "save", "delete", "update"]
          }
        },
        additionalProperties: false
      }
    ]
  },

  create(context) {
    const options = context.options[0] || {};
    const repositoryPattern = options.repositoryPattern || "interface";
    const namingConvention = options.namingConvention || {};
    const allowedMethods = options.allowedMethods || ["find", "findById", "save", "delete", "update"];

    function isRepositoryInterface(node) {
      return node.type === "TSInterfaceDeclaration" && 
             node.id.name.includes("Repository");
    }

    function isRepositoryClass(node) {
      return node.type === "ClassDeclaration" && 
             node.id.name.includes("Repository");
    }

    function checkNamingConvention(node) {
      const fileName = context.getFilename();
      const className = node.id.name;
      
      // Check if it's in correct directory
      if (isRepositoryInterface(node)) {
        if (!fileName.includes("/domain/") && !fileName.includes("/core/")) {
          context.report({
            node,
            message: "Repository interfaces should be in domain/core layer"
          });
        }
        
        // Check interface naming
        if (!className.startsWith("I") || !className.endsWith("Repository")) {
          context.report({
            node,
            message: `Repository interface should follow naming pattern: I{Name}Repository`
          });
        }
      }
      
      if (isRepositoryClass(node)) {
        if (!fileName.includes("/infrastructure/") && !fileName.includes("/data/")) {
          context.report({
            node,
            message: "Repository implementations should be in infrastructure/data layer"
          });
        }
      }
    }

    function checkMethodSignatures(node) {
      if (node.type === "MethodDefinition" || node.type === "TSMethodSignature") {
        const methodName = node.key.name;
        
        // Check for business logic in repository methods
        const businessLogicKeywords = ["validate", "calculate", "process", "transform"];
        if (businessLogicKeywords.some(keyword => methodName.toLowerCase().includes(keyword))) {
          context.report({
            node,
            message: `Repository method '${methodName}' appears to contain business logic. Move to domain service.`
          });
        }
        
        // Check for database-specific naming
        const dbSpecificKeywords = ["sql", "mongo", "redis", "query", "execute"];
        if (dbSpecificKeywords.some(keyword => methodName.toLowerCase().includes(keyword))) {
          context.report({
            node,
            message: `Repository method '${methodName}' exposes database implementation details`
          });
        }
      }
    }

    function checkDependencyDirection(node) {
      if (node.type === "ImportDeclaration") {
        const importPath = node.source.value;
        const fileName = context.getFilename();
        
        // Domain layer shouldn't import infrastructure
        if (fileName.includes("/domain/") || fileName.includes("/core/")) {
          if (importPath.includes("/infrastructure/") || 
              importPath.includes("/data/") ||
              importPath.includes("mongoose") ||
              importPath.includes("sequelize") ||
              importPath.includes("typeorm")) {
            context.report({
              node,
              message: "Domain layer should not import infrastructure dependencies"
            });
          }
        }
      }
    }

    function checkRepositoryInterface(node) {
      if (!isRepositoryInterface(node)) return;
      
      const methods = node.body.body.filter(member => 
        member.type === "TSMethodSignature"
      );
      
      // Check for too many methods (SRP violation)
      if (methods.length > 10) {
        context.report({
          node,
          message: "Repository interface has too many methods. Consider splitting into smaller interfaces."
        });
      }
      
      // Check method naming and signatures
      methods.forEach(method => {
        checkMethodSignatures(method);
        
        // Check return types
        if (method.returnType) {
          const returnType = method.returnType.typeAnnotation;
          
          // Repository methods should return domain entities or primitives
          if (returnType.type === "TSTypeReference") {
            const typeName = returnType.typeName.name;
            if (typeName.includes("DTO") || typeName.includes("Model")) {
              context.report({
                node: method,
                message: `Repository method should return domain entities, not DTOs or Models`
              });
            }
          }
        }
      });
    }

    function checkRepositoryImplementation(node) {
      if (!isRepositoryClass(node)) return;
      
      // Check if implements interface
      if (!node.implements || node.implements.length === 0) {
        context.report({
          node,
          message: "Repository implementation should implement a repository interface"
        });
      }
      
      // Check for business logic in implementation
      const methods = node.body.body.filter(member => 
        member.type === "MethodDefinition"
      );
      
      methods.forEach(method => {
        checkMethodSignatures(method);
        
        // Check for complex business logic
        if (method.value && method.value.body) {
          const bodySource = context.getSourceCode().getText(method.value.body);
          
          // Look for complex conditionals that might indicate business logic
          const complexLogicPattern = /if\s*\([^)]*&&[^)]*\|[^)]*\)/g;
          if (complexLogicPattern.test(bodySource)) {
            context.report({
              node: method,
              message: "Repository implementation contains complex business logic. Move to domain service."
            });
          }
        }
      });
    }

    return {
      TSInterfaceDeclaration(node) {
        if (isRepositoryInterface(node)) {
          checkNamingConvention(node);
          checkRepositoryInterface(node);
        }
      },
      
      ClassDeclaration(node) {
        if (isRepositoryClass(node)) {
          checkNamingConvention(node);
          checkRepositoryImplementation(node);
        }
      },
      
      ImportDeclaration(node) {
        checkDependencyDirection(node);
      },
      
      MethodDefinition(node) {
        const className = node.parent.parent.id?.name;
        if (className && className.includes("Repository")) {
          checkMethodSignatures(node);
        }
      }
    };
  }
};