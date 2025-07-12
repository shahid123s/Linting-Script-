function mergeConfigs(baseConfig, newConfig) {
  const merged = { ...baseConfig };


  if (newConfig.env) {
    merged.env = { ...merged.env, ...newConfig.env };
  }

  if (newConfig.plugins) {
    merged.plugins = Array.from(new Set([...(merged.plugins || []), ...newConfig.plugins])); // Why it does is because plugins can be an array or a string
  }

  if (newConfig.extends) {
    const baseExtends = Array.isArray(merged.extends) ? merged.extends : (merged.extends ? [merged.extends] : []); // Ensure baseExtends is always an array
    const newExtends = Array.isArray(newConfig.extends) ? newConfig.extends : [newConfig.extends];
    merged.extends = Array.from(new Set([...baseExtends, ...newExtends]));
  }

  if (newConfig.parserOptions) {
    merged.parserOptions = { ...merged.parserOptions, ...newConfig.parserOptions };
  }

  if (newConfig.settings) {
    merged.settings = { ...merged.settings, ...newConfig.settings };
  }

  if (newConfig.rules) {
    merged.rules = { ...merged.rules, ...newConfig.rules };
  }

  return merged;
}

module.exports = mergeConfigs;