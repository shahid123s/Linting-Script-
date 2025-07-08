const inqueier = require('inquirer');

/**
 * Prompts the user to choose a programming language for their project.
 * @returns {Promise<{projectType: string}>} Resolves with the selected language as `projectType` ("JavaScript" or "TypeScript").
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
 * Prompts the user to choose between a React (Frontend) or Server-side (Backend) project type.
 * @returns {Promise<{projectType: string}>} Resolves with the selected project type.
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
 * Prompts the user to choose an architecture pattern for a server-side project.
 * @returns {Promise<{architecture: string}>} Resolves with the selected architecture pattern.
 *
 * The available options are "Repository Pattern", "Clean Architecture", and "MVC". The selection is used to tailor ESLint rules and templates for backend projects.
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