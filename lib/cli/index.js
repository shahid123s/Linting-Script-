const fs = require('fs-extra');
const path = require('path');

const { getProgrammingLanguage, getProjectType } = require('./prompts');
const generateEslintConfig = require('./eslint-generator');

async function runCli() {
    try {

        const answers = {};

        const languageAnswer = (await getProgrammingLanguage());
        answers.languageType = languageAnswer;
        
        const projectTypeAnswer = (await getProjectType());
        answers.projectType = projectTypeAnswer;

        const eslintConfig = generateEslintConfig(answers);

        const configFilePath = path.join(process.cwd(), '.eslintrc.json');

        await fs.writeJson(configFilePath, eslintConfig, { spaces: 2 });

        console.log('ESLint configuration generated successfully at:', configFilePath);
    } catch (error) {
        console.error('Error generating ESLint configuration:', error);
    }
}

module.exports = runCli;