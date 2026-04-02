# Contributing

Contributions are welcome! Here's how to get involved.

## Reporting bugs

Open an issue on [GitHub](https://github.com/Eduwilll/RPG-Maker-MV-MZ-Cheat-UI-Plugin/issues). Please include:

- Game name and engine version (MV or MZ)
- Plugin version
- Steps to reproduce
- What you expected vs what happened
- Error messages from the developer console (if any)

## Contributing to the docs

The docs live in the `docs/` folder of the repository. Each page is a plain Markdown file.

To run the docs locally:


```bash
# Clone the repo
git clone https://github.com/Eduwilll/RPG-Maker-MV-MZ-Cheat-UI-Plugin.git
cd RPG-Maker-MV-MZ-Cheat-UI-Plugin
```
::: code-group

```sh [npm]
# Install dependencies
npm install

# Start the local dev server
npm run docs:dev
```

```sh [pnpm]
# Install dependencies
pnpm install

# Start the local dev server
pnpm run docs:dev
```
:::
Then open `http://localhost:5173` in your browser. Changes to `.md` files hot-reload instantly.

## Contributing code

1. Fork the repository
2. Create a branch: `git checkout -b feature/your-feature`
3. Make your changes
4. Open a pull request with a clear description

## Code style

The plugin is written in plain JavaScript (ES6+). Follow the existing code style — no build step, no bundler, keep it simple.
