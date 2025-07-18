module.exports = {
    meta: {
        type: 'suggestion',
        docs: {
            description: 'Enforce Single Responsibility Principle (SRP) in functions',
            category: 'Best Practices',
            recommended: false,
        },
        schema: [
            {
                type: 'object',
                properties: {
                    maxLines: { type: 'number', default: 50 },
                    maxStatements: { type: 'number', default: 10 },
                    maxComplexity: { type: 'number', default: 10 },
                    maxMethods: { type: 'number', default: 5 }
                }
            }
        ],
    },
    create(context) {
        const options = context.options[0] || {};
        const maxLines = options.maxLines || 50;
        const maxStatements = options.maxStatements || 10;
        const maxComplexity = options.maxComplexity || 10;
        const maxMethods = options.maxMethods || 5;
        const sourceCode = context.getSourceCode();

        // Recursively count all statements in the function body
        function countStatements(body) {
            if (!body || !body.body) return 0;
            let count = 0;
            body.body.forEach(stmt => {
                count++;
                if (stmt.body) {
                    count += countStatements(stmt.body);
                }
            });
            return count;
        }

        function analyzeFunction(node, name) {
            const functionName = name || node.id?.name || '(anonymous)';
            const lines = sourceCode.getText(node).split('\n');
            const codeLines = lines.filter(line => {
                const trimmed = line.trim();
                return trimmed && !trimmed.startsWith('//') && !trimmed.startsWith('/*');
            });

            const statementCount = countStatements(node.body);

            let complexity = 1;
            sourceCode.getTokens(node).forEach(token => {
                if (['if', 'else', 'for', 'while', 'case', 'catch', '&&', '||', '?'].includes(token.value)) {
                    complexity++;
                }
            });

            if (codeLines.length > maxLines) {
                context.report({
                    node,
                    message: `Function '${functionName}' exceeds max line count ${codeLines.length}. Limit: ${maxLines}`,
                });
            }

            if (statementCount > maxStatements) {
                context.report({
                    node,
                    message: `Function '${functionName}' has too many statements ${statementCount}. Limit: ${maxStatements}`,
                });
            }

            if (complexity > maxComplexity) {
                context.report({
                    node,
                    message: `Function '${functionName}' is too complex ${complexity}. Max complexity: ${maxComplexity}`,
                });
            }
        }

        return {
            ClassBody(node) {
                const methodCount = node.body.filter(
                    item => item.type === 'MethodDefinition'
                ).length;
                if (methodCount > maxMethods) {
                    context.report({
                        node,
                        message: `Class has too many methods ${methodCount}. Maximum allowed is ${maxMethods}.`,
                    });
                }
            },

            FunctionDeclaration(node) {
                analyzeFunction(node, node.id?.name);
            },
            FunctionExpression(node) {
                analyzeFunction(node, node.id?.name);
            },
            ArrowFunctionExpression(node) {
                analyzeFunction(node, '(arrow function)');
            },
            MethodDefinition(node) {
                if (node.value && (node.value.type === 'FunctionExpression' || node.value.type === 'ArrowFunctionExpression')) {
                    analyzeFunction(node.value, node.key.name || '(method)');
                }
            }
        };
    }
};