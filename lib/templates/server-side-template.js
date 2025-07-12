module.exports = {
    rule : {
        'no-unused-vars': 'error',
        'no-console': 'warn',
        'no-process-exit': 'error',
        "student-linter/naming-convention": "error",

    },
    overrides : [
        {
            files: ['*.js', '*.jsx', '*.ts', '*.tsx'],
            rules: {
                'no-unused-vars': 'warn',
                'no-console': 'off',
                'no-process-exit': 'off',
            }
        }
    ]

}