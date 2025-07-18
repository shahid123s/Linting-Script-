"use strict";

module.exports = {
    meta: {
        type: "problem",
        docs: {
            description: "enforce Open/Closed Principle - open for extension, closed for modification",
            category: "Best Practices",
            recommended: true,
            //   url: "https://your-docs-url.com/rules/open-closed-principle"
        },
        fixable: null,
        schema: [
            {
                type: "object",
                properties: {
                    maxSwitchCases: {
                        type: "integer",
                        minimum: 2,
                        default: 5
                    },
                    maxIfElseChain: {
                        type: "integer",
                        minimum: 2,
                        default: 4
                    },
                    maxTypeChecks: {
                        type: "integer",
                        minimum: 1,
                        default: 3
                    },
                    allowedTypeCheckPatterns: {
                        type: "array",
                        items: {
                            type: "string"
                        },
                        default: ["typeof", "instanceof", "Array.isArray"]
                    },
                    forbiddenModificationPatterns: {
                        type: "array",
                        items: {
                            type: "string"
                        },
                        default: [
                            "switch.*type",
                            "if.*type.*===",
                            "if.*instanceof",
                            "typeof.*===.*string|number|boolean"
                        ]
                    },
                    extensionPatterns: {
                        type: "array",
                        items: {
                            type: "string"
                        },
                        default: [
                            "extends",
                            "implements",
                            "mixin",
                            "plugin",
                            "decorator",
                            "factory",
                            "strategy",
                            "visitor"
                        ]
                    },
                    excludeFilePatterns: {
                        type: "array",
                        items: {
                            type: "string"
                        },
                        default: [
                            ".*\\.test\\.(js|ts|jsx|tsx)$",
                            ".*\\.spec\\.(js|ts|jsx|tsx)$",
                            "__tests__/.*\\.(js|ts|jsx|tsx)$",
                            ".*\\.config\\.(js|ts)$",
                            "config/.*\\.(js|ts)$"
                        ]
                    },
                    allowFactoryPatterns: {
                        type: "boolean",
                        default: true
                    },
                    allowEnumPatterns: {
                        type: "boolean",
                        default: true
                    },
                    strictMode: {
                        type: "boolean",
                        default: false
                    }
                },
                additionalProperties: false
            }
        ],
        messages: {
            tooManySwitchCases: "Switch statement with {{count}} cases violates OCP. Consider using polymorphism, strategy pattern, or factory pattern instead. Max allowed: {{max}}",
            longIfElseChain: "If-else chain with {{count}} conditions violates OCP. Consider using polymorphism or strategy pattern instead. Max allowed: {{max}}",
            typeCheckViolation: "Type checking pattern '{{pattern}}' violates OCP. Consider using polymorphism or interface-based approach instead.",
            modificationRisk: "Code pattern '{{pattern}}' suggests modification instead of extension. Consider using strategy pattern or dependency injection.",
            missingAbstraction: "Function '{{name}}' handles multiple types directly. Consider creating an abstraction layer.",
            hardcodedTypeHandling: "Hardcoded type handling in '{{name}}' violates OCP. Consider using factory pattern or polymorphism.",
            extensionViolation: "Adding new types to this {{construct}} requires modification. Consider using extensible patterns like visitor or strategy.",
            conditionalComplexity: "Complex conditional logic in '{{name}}' makes extension difficult. Consider extracting to separate handlers.",
            magicTypeValues: "Magic type values detected. Consider using enums or constants to make extension easier.",
            directTypeManipulation: "Direct type manipulation violates OCP. Consider using abstract factories or builders.",
            lackOfPolymorphism: "Multiple type-specific branches suggest missing polymorphism. Consider using inheritance or composition."
        }
    },

    create(context) {
        const options = context.options[0] || {};
        const maxSwitchCases = options.maxSwitchCases || 5;
        const maxIfElseChain = options.maxIfElseChain || 4;
        const maxTypeChecks = options.maxTypeChecks || 3;
        const allowedTypeCheckPatterns = options.allowedTypeCheckPatterns || ["typeof", "instanceof", "Array.isArray"];
        const forbiddenModificationPatterns = options.forbiddenModificationPatterns || [
            "switch.*type",
            "if.*type.*===",
            "if.*instanceof",
            "typeof.*===.*string|number|boolean"
        ];
        const extensionPatterns = options.extensionPatterns || [
            "extends", "implements", "mixin", "plugin", "decorator", "factory", "strategy", "visitor"
        ];
        const excludeFilePatterns = options.excludeFilePatterns || [
            ".*\\.test\\.(js|ts|jsx|tsx)$",
            ".*\\.spec\\.(js|ts|jsx|tsx)$",
            "__tests__/.*\\.(js|ts|jsx|tsx)$",
            ".*\\.config\\.(js|ts)$",
            "config/.*\\.(js|ts)$"
        ];
        const allowFactoryPatterns = options.allowFactoryPatterns !== false;
        const allowEnumPatterns = options.allowEnumPatterns !== false;
        const strictMode = options.strictMode === true;

        const sourceCode = context.getSourceCode();
        const filename = context.getFilename();

        // Check if file should be excluded
        const shouldExcludeFile = excludeFilePatterns.some(pattern =>
            new RegExp(pattern).test(filename)
        );

        if (shouldExcludeFile) {
            return {};
        }

        // Track patterns across the file
        const typeCheckCount = new Map();
        const functionTypeHandling = new Map();
        const magicTypeValues = new Set();

        // Helper functions
        function isFactoryFunction(node) {
            if (!node.id) return false;
            const name = node.id.name.toLowerCase();
            return name.includes('factory') || name.includes('create') || name.includes('builder');
        }

        function isEnumPattern(node) {
            if (node.type !== 'SwitchStatement') return false;
            const discriminant = sourceCode.getText(node.discriminant);
            return /\b(type|kind|status|state|mode)\b/i.test(discriminant);
        }

        function hasExtensionPattern(node) {
            const text = sourceCode.getText(node).toLowerCase();
            return extensionPatterns.some(pattern =>
                new RegExp(`\\b${pattern}\\b`).test(text)
            );
        }

        function detectTypeCheckPattern(node) {
            const text = sourceCode.getText(node);

            // Check for typeof checks
            if (/typeof\s+\w+\s*===\s*['"`](string|number|boolean|object|function|undefined)['"`]/.test(text)) {
                return 'typeof';
            }

            // Check for instanceof checks
            if (/\w+\s+instanceof\s+\w+/.test(text)) {
                return 'instanceof';
            }

            // Check for constructor checks
            if (/\w+\.constructor\s*===\s*\w+/.test(text)) {
                return 'constructor';
            }

            // Check for Array.isArray
            if (/Array\.isArray\s*\(/.test(text)) {
                return 'Array.isArray';
            }

            // Check for type property checks
            if (/\w+\.type\s*===\s*['"`]\w+['"`]/.test(text)) {
                return 'type-property';
            }

            return null;
        }

        function countIfElseChain(node) {
            let count = 1; // Start with the initial if
            let current = node;

            while (current.alternate) {
                count++;
                if (current.alternate.type === 'IfStatement') {
                    current = current.alternate;
                } else {
                    break;
                }
            }

            return count;
        }

        function detectHardcodedTypes(node) {
            const text = sourceCode.getText(node);
            const typePatterns = [
                /'(string|number|boolean|object|array|function)'/g,
                /"(string|number|boolean|object|array|function)"/g,
                /`(string|number|boolean|object|array|function)`/g
            ];

            const found = new Set();
            typePatterns.forEach(pattern => {
                let match;
                while ((match = pattern.exec(text)) !== null) {
                    found.add(match[1]);
                }
            });

            return Array.from(found);
        }

        function analyzeTypeHandling(node, functionName) {
            const current = functionTypeHandling.get(functionName) || {
                typeChecks: 0,
                typePatterns: new Set(),
                hasSwitch: false,
                hasLongIfElse: false
            };

            // Count type checks in function
            if (node.type === 'BinaryExpression' && detectTypeCheckPattern(node)) {
                current.typeChecks++;
                current.typePatterns.add(detectTypeCheckPattern(node));
            }

            functionTypeHandling.set(functionName, current);
        }

        function getFunctionName(node) {
            if (node.id) return node.id.name;
            if (node.parent && node.parent.type === 'VariableDeclarator') {
                return node.parent.id.name;
            }
            if (node.parent && node.parent.type === 'Property') {
                return node.parent.key.name;
            }
            return 'anonymous';
        }

        function isPolymorphicPattern(node) {
            // Check if the code uses polymorphic patterns
            const text = sourceCode.getText(node);
            const polymorphicPatterns = [
                /\.call\s*\(/,
                /\.apply\s*\(/,
                /\.bind\s*\(/,
                /\w+\.\w+\s*\(/,  // Method calls
                /\w+\[\w+\]\s*\(/ // Dynamic method calls
            ];

            return polymorphicPatterns.some(pattern => pattern.test(text));
        }

        return {
            // Switch statements
            SwitchStatement(node) {
                const caseCount = node.cases.length;

                // Allow enum patterns and factory patterns in non-strict mode
                if (!strictMode) {
                    if (allowEnumPatterns && isEnumPattern(node)) return;
                    if (allowFactoryPatterns && node.parent &&
                        node.parent.type === 'FunctionDeclaration' &&
                        isFactoryFunction(node.parent)) return;
                }

                if (caseCount > maxSwitchCases) {
                    context.report({
                        node,
                        messageId: "tooManySwitchCases",
                        data: {
                            count: caseCount,
                            max: maxSwitchCases
                        }
                    });
                }

                // Check for type-based switching
                const discriminant = sourceCode.getText(node.discriminant);
                if (/\.(type|kind|constructor|__proto__)/.test(discriminant)) {
                    context.report({
                        node,
                        messageId: "extensionViolation",
                        data: {
                            construct: "switch statement"
                        }
                    });
                }

                // Check for hardcoded type values
                const hardcodedTypes = detectHardcodedTypes(node);
                if (hardcodedTypes.length > 0) {
                    context.report({
                        node,
                        messageId: "magicTypeValues"
                    });
                }

                // Track function-level type handling
                let current = node.parent;
                while (current && current.type !== 'FunctionDeclaration' && current.type !== 'FunctionExpression') {
                    current = current.parent;
                }
                if (current) {
                    const functionName = getFunctionName(current);
                    const handling = functionTypeHandling.get(functionName) || { typeChecks: 0, typePatterns: new Set(), hasSwitch: false, hasLongIfElse: false };
                    handling.hasSwitch = true;
                    functionTypeHandling.set(functionName, handling);
                }
            },

            // If statements
            IfStatement(node) {
                const chainLength = countIfElseChain(node);

                // Only check the root if statement (not nested else-if)
                if (node.parent.type !== 'IfStatement') {
                    if (chainLength > maxIfElseChain) {
                        context.report({
                            node,
                            messageId: "longIfElseChain",
                            data: {
                                count: chainLength,
                                max: maxIfElseChain
                            }
                        });
                    }

                    // Track function-level type handling
                    let current = node.parent;
                    while (current && current.type !== 'FunctionDeclaration' && current.type !== 'FunctionExpression') {
                        current = current.parent;
                    }
                    if (current && chainLength > 2) {
                        const functionName = getFunctionName(current);
                        const handling = functionTypeHandling.get(functionName) || { typeChecks: 0, typePatterns: new Set(), hasSwitch: false, hasLongIfElse: false };
                        handling.hasLongIfElse = true;
                        functionTypeHandling.set(functionName, handling);
                    }
                }

                // Check test condition for type checking
                const typePattern = detectTypeCheckPattern(node.test);
                if (typePattern) {
                    const functionName = 'global';
                    const count = typeCheckCount.get(functionName) || 0;
                    typeCheckCount.set(functionName, count + 1);

                    if (!allowedTypeCheckPatterns.includes(typePattern)) {
                        context.report({
                            node: node.test,
                            messageId: "typeCheckViolation",
                            data: {
                                pattern: typePattern
                            }
                        });
                    }
                }
            },

            // Binary expressions (for type checking)
            BinaryExpression(node) {
                const typePattern = detectTypeCheckPattern(node);
                if (typePattern) {
                    // Find containing function
                    let current = node.parent;
                    while (current && current.type !== 'FunctionDeclaration' && current.type !== 'FunctionExpression') {
                        current = current.parent;
                    }

                    if (current) {
                        const functionName = getFunctionName(current);
                        analyzeTypeHandling(node, functionName);
                    }
                }

                // Check for modification patterns
                const text = sourceCode.getText(node);
                forbiddenModificationPatterns.forEach(pattern => {
                    if (new RegExp(pattern).test(text)) {
                        context.report({
                            node,
                            messageId: "modificationRisk",
                            data: {
                                pattern: pattern
                            }
                        });
                    }
                });
            },

            // Function declarations
            FunctionDeclaration(node) {
                const functionName = node.id.name;

                // Skip if function has extension patterns
                if (hasExtensionPattern(node)) return;

                // Check the function body for type handling
                const handling = functionTypeHandling.get(functionName);
                if (handling) {
                    if (handling.typeChecks > maxTypeChecks) {
                        context.report({
                            node,
                            messageId: "missingAbstraction",
                            data: {
                                name: functionName
                            }
                        });
                    }

                    if (handling.typePatterns.size > 2 && !isPolymorphicPattern(node)) {
                        context.report({
                            node,
                            messageId: "lackOfPolymorphism"
                        });
                    }

                    if ((handling.hasSwitch || handling.hasLongIfElse) && handling.typeChecks > 1) {
                        context.report({
                            node,
                            messageId: "conditionalComplexity",
                            data: {
                                name: functionName
                            }
                        });
                    }
                }
            },

            // Function expressions
            FunctionExpression(node) {
                const functionName = getFunctionName(node);

                // Skip if function has extension patterns
                if (hasExtensionPattern(node)) return;

                // Check the function body for type handling
                const handling = functionTypeHandling.get(functionName);
                if (handling) {
                    if (handling.typeChecks > maxTypeChecks) {
                        context.report({
                            node,
                            messageId: "missingAbstraction",
                            data: {
                                name: functionName
                            }
                        });
                    }

                    if (handling.typePatterns.size > 2 && !isPolymorphicPattern(node)) {
                        context.report({
                            node,
                            messageId: "lackOfPolymorphism"
                        });
                    }
                }
            },

            // Arrow functions
            ArrowFunctionExpression(node) {
                const functionName = getFunctionName(node);

                // Skip if function has extension patterns
                if (hasExtensionPattern(node)) return;

                // Check the function body for type handling
                const handling = functionTypeHandling.get(functionName);
                if (handling && handling.typeChecks > maxTypeChecks) {
                    context.report({
                        node,
                        messageId: "missingAbstraction",
                        data: {
                            name: functionName
                        }
                    });
                }
            },

            // Class declarations
            ClassDeclaration(node) {
                const className = node.id.name;

                // Check if class has hardcoded type handling
                const classText = sourceCode.getText(node);
                let typeHandlingMethods = 0;

                node.body.body.forEach(member => {
                    if (member.type === 'MethodDefinition') {
                        const methodText = sourceCode.getText(member.value);
                        if (detectTypeCheckPattern({ type: 'Literal', value: methodText })) {
                            typeHandlingMethods++;
                        }
                    }
                });

                if (typeHandlingMethods > 2) {
                    context.report({
                        node,
                        messageId: "hardcodedTypeHandling",
                        data: {
                            name: className
                        }
                    });
                }
            },

            // Member expressions (for direct type manipulation)
            MemberExpression(node) {
                const text = sourceCode.getText(node);

                // Check for direct type manipulation
                if (/\.(type|kind|constructor)\s*=/.test(text)) {
                    context.report({
                        node,
                        messageId: "directTypeManipulation"
                    });
                }
            },

            // Program exit - final analysis
            'Program:exit'() {
                // Check overall type check count
                typeCheckCount.forEach((count, functionName) => {
                    if (count > maxTypeChecks) {
                        // This is already handled in function-specific checks
                    }
                });

                // Check for patterns that suggest missing abstractions
                functionTypeHandling.forEach((handling, functionName) => {
                    if (handling.hasSwitch && handling.hasLongIfElse && handling.typeChecks > 0) {
                        // This combination suggests a need for better abstraction
                        // Already reported in function-specific checks
                    }
                });
            }
        };
    }
};