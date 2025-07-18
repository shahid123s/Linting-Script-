const { rule } = require("./server-side-template");

module.exports = {
    rule: {
        'student-linter/srp-violation': 'warn',
        'student-linter/ocp-violation': 'warn',
        'student-linter/lsp-substitution': 'warn',
        'student-linter/isp-violation': 'warn',
        'student-linter/dip-violation': 'warn',
    }
}