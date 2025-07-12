module.exports = {
    meta: {
        type: "suggestion",
        docs: {
            description: "Enforce naming conventions: UPPER_CASE for constants, camelCase for variables and functions, PascalCase for classes",
            category: "Stylistic Issues",
            recommended: false,
        },
        schema: [],
    },
    create(context) {
        return {
            VariableDeclarator(node) {
                if (node.id.type !== "Identifier") return;
                const scope = context.getScope();
                const isTopLevel = scope.type === "global" || scope.type === "module";

                const isUpperCase = variableName === variableName.toUpperCase();
                const isCamelCase = /^[a-z][a-zA-Z]+$/.test(variableName);

                if (
                    node.parent.kind === 'const' &&
                    isTopLevel &&
                    !isUpperCase
                ) {
                    context.report({
                        node: node.id,
                        message: 'Top-level constants should be in UPPER_CASE.'
                    });
                }

                if (
                    (node.parent.kind === 'const' && !isTopLevel) ||
                    node.parent.kind === 'let' ||
                    node.parent.kind === 'var'
                ) {
                    if (!isCamelCase) {
                        context.report({
                            node: node.id,
                            message: 'Variable names should be in camelCase.'
                        });
                    }
                }
            },
            ClassDeclaration(node) {
                if (node.id && node.id.type === "Identifier") {
                    const className = node.id.name;
                    if (! /^[A-Z][a-zA-Z]+$/.test(className)) {
                        context.report({
                            node: node.id,
                            message: "Classes should be in PascalCase.",
                        });
                    }
                }
            },
            functionDeclaration(node) {
                if (node.id && node.id.type === "Identifier") {
                    const functionName = node.id.name;
                    if (! /^[a-z][a-zA-Z]+$/.test(functionName)) {
                        context.report({
                            node: node.id,
                            message: "Function names should be in camelCase.",
                        });
                    }
                }
            }
        };
    },
}