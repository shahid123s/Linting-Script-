#!/usr/bin/env node

const chalk = require('chalk');
const inqueier = require('inquirer');
const path = require('path');
const fs = require('fs-extra');
// const { channel } = require('diagnostics_channel');


async function main() {

    console.log(chalk.blue.bold('Bro Lint - A tool for linting Bro scripts'));
    console.log(chalk.green.bold('Setting up your Bro environment...'));

    try {

        // Check if the current directory is a project directory
        const cwd = process.cwd();
        const packageJsonPath = path.join(cwd, 'package.json');

        if (! await fs.pathExists(packageJsonPath)) {
            console.log(chalk.red.bold('No package.json found in the current directory.'));
            console.log(chalk.yellow.bold('Please run this command in a Bro project directory.'));
            process.exit(1);
        }


        // Check if the ESlint configuration file exists
        const eslintConfigPath = path.join(cwd, '.eslintrc.js');
        if (await fs.pathExists(eslintConfigPath)) {
            console.log(chalk.yellow.bold('ESLint configuration file found.'));
            const answer = await inqueier.prompt({
                type: 'confirm',
                name: 'overwrite',
                message: 'Do you want to overwrite the existing ESLint configuration?',
                default: false
            });

            if (answer.overwrite) {
                console.log(chalk.blue.bold('Overwriting existing ESLint configuration...'));

            } else {
                console.log(chalk.green.bold('Keeping existing ESLint configuration.'));
                console.log(chalk.red.bold('Exiting Bro Lint setup.'));
                process.exit(1);
            }
        }

        // Run the  initialization script

        



        // Create or overwrite the ESLint configuration file
        console.log(chalk.green.bold('\n✅ Student Linter setup completed successfully!'));
        console.log(chalk.gray('\nNext steps:'));
        console.log(chalk.gray('1. Install the recommended dependencies: npm install'));
        console.log(chalk.gray('2. Run ESLint: npx eslint . --ext .js,.jsx,.ts,.tsx'));
        console.log(chalk.gray('3. Fix issues automatically: npx eslint . --ext .js,.jsx,.ts,.tsx --fix\n'));


    } catch (error) {
        console.error(chalk.red.bold('Error setting up Bro environment:'), error);
        process.exit(1);

    }


}
main()
