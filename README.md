# Bro Linting Script

A comprehensive ESLint configuration generator for JavaScript and TypeScript projects with built-in support for React, Clean Architecture patterns, and SOLID principles.

## Features

- 🚀 Interactive CLI setup
- 📝 Support for JavaScript and TypeScript projects
- ⚛️ React project configuration
- 🏗️ Clean Architecture pattern enforcement
- 🎯 SOLID principles validation
- 📦 Repository pattern support
- 🔧 Automated ESLint configuration generation

## Installation

### Global Installation
```bash
npm install -g bro-linting-script
```

### Local Installation
```bash
npm install bro-linting-script
```

## Usage

Navigate to your project directory and run:

```bash
bro-lint
```

The tool will guide you through an interactive setup process where you can:

1. Choose your programming language (JavaScript/TypeScript)
2. Select your project type (React/Server-side)
3. Choose architecture patterns to enforce
4. Generate appropriate ESLint configuration

## Project Structure

```
├── bin/
│   └── bro-lint.js          # Main executable
├── lib/
│   ├── cli/
│   │   ├── index.js         # CLI logic
│   │   ├── prompts.js       # User interaction prompts
│   │   └── eslint-generator.js # ESLint config generation
│   ├── templates/           # ESLint configuration templates
│   └── rules/              # Custom ESLint rules
├── utils/
│   └── config-merge.js     # Configuration merging utility
└── package.json
```

## Supported Configurations

### Languages
- JavaScript (ES6+)
- TypeScript

### Project Types
- React applications
- Server-side applications

### Architecture Patterns
- Clean Architecture
- Repository Pattern
- SOLID Principles enforcement

## Development

### Setup
```bash
git clone https://github.com/shahid123s/Linting-Script-.git
cd Linting-Script-
npm install
```

### Testing
```bash
npm test
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

## Author

**Shahid Noushad**
- Email: shahidnoushad.official@gmail.com
- GitHub: [@shahid123s](https://github.com/shahid123s)

## Support

If you encounter any issues or have questions, please [open an issue](https://github.com/shahid123s/Linting-Script-/issues) on GitHub.
