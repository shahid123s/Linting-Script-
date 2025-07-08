const inqueier = require('inquirer');

/**
 * Prompts the user to select a programming language for their project.
 *
 * @async
 * @function getProgrammingLanguage
 * @returns {Promise<{projectType: string}>} A promise that resolves with the selected language (JavaScript or TypeScript).
 *
 * @description
 * This function uses `inquirer` to prompt the user with a list of programming languages.
 * The result is used to determine which ESLint config to apply based on language type.
 *
 * @example
 * const { getProgrammingLanguage } = require('./prompts');
 * const { projectType } = await getProgrammingLanguage();
 * console.log(projectType); // 'JavaScript' or 'TypeScript'
 */
async function getProgrammingLanguage () {
    return await inqueier.prompt([
        {
            type: 'list',
            name: 'projectType',
            message: 'What type of project are you working on?',
            choices: [
                {
                    name: '📝 JavaScript',
                    value: 'JavaScript'
                },
                {
                    name: '🔷 TypeScript',
                    value: 'TypeScript'
                }
            ],
            default: 'JavaScript'
        }
    ])
}

/**
 * Prompts the user to select the type of project they are working on (Frontend or Backend).
 *
 * @async
 * @function getProjectType
 * @returns {Promise<{projectType: string}>} A promise that resolves with the selected project type.
 *
 * @description
 * This function asks the user whether the project is a React (Frontend) or Server-side (Backend) application.
 * This choice determines what type of ESLint rules and templates will be applied.
 *
 * @example
 * const { getProjectType } = require('./prompts');
 * const { projectType } = await getProjectType();
 * console.log(projectType); // 'React' or 'Server-side'
 */
async function getProjectType () {
    return await inqueier.prompt([
        {
            type: 'list',
            name: 'projectType',
            message: 'What type of project are you working on?',
            choices: [
                {
                    name: '📝 React (Frontend)',
                    value: 'React'
                },
                {
                    name: '🔷 Server-side (Backend) ',
                    value: 'Server-side'
                }
            ],
            default: 'Server-side'
        }
    ])
}


/**
 * Prompts the user to select the architecture pattern they want to enforce for their server-side project.
 *
 * @async
 * @function getProjectArchitecture
 * @returns {Promise<{architecture: string}>} A promise that resolves with the selected architecture pattern.
 *
 * @description
 * This question is only relevant when the user selects a backend/server-side project.
 * The supported patterns include:
 * - Repository Pattern
 * - Clean Architecture (DDD)
 * - MVC (Model-View-Controller)
 *
 * This answer helps customize which custom ESLint rules and templates are applied.
 *
 * @example
 * const { getProjectArchitecture } = require('./prompts');
 * const { architecture } = await getProjectArchitecture();
 * console.log(architecture); // 'Repository', 'Clean Architecture', or 'None'
 */
async function getProjectArchitecture () {
    return await inqueier.prompt([
        {
            type: 'list',
            name: 'architecture',
            message: 'Which architecture pattern would you like to enforce?',
            choices: [
                {
                    name: 'Repository Pattern (Data Access Layer)',
                    value: 'Repository'
                },
                {
                    name: 'Clean Architecture (Domain-Driven Design)',
                    value: 'Clean Architecture'
                },
                {
                    name: '  MVC (Model-View-Controller)',
                    value: 'None'
                }
            ],
            default: 'Repository'
        }
    ])
}


module.exports = {
    getProgrammingLanguage,
    getProjectType,
    getProjectArchitecture,
}