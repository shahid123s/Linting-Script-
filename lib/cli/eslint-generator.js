const merge = require('../../utils/config-merge.js')
const baseConfig = require('../templates/base-template.js');
const reactConfig = require('../templates/react-template.js');  



function generateEslintConfig(userChoice) {
    const {
        projectType,
        languageType
    } = userChoice;

    let config = { ...baseConfig };

    if(projectType === 'React') {
        config = merge(config, reactConfig);
    }

    return config;
}




module.exports = generateEslintConfig;
