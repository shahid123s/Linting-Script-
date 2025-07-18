module.exports = {
  rules: {
    'naming-conversions' : require('./naming-conversion'),
    'clean-architecture': require('./clean-architecture'),
    'repository-architecture': require('./repository-architecture'),
    'dip-violation': require('./dip-violation'),
    'lsp-substitution': require('./lsp-substitution'),
    'srp-violation': require('./srp-violation'),
    'ocp-violation': require('./ocp-violation'),
    'isp-violation': require('./isp-violation'),
  }
};