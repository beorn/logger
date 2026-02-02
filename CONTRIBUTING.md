# Contributing to @beorn/logger

Thank you for your interest in contributing to @beorn/logger!

## Development Setup

```bash
# Clone the repository
git clone https://github.com/beorn/logger.git
cd logger

# Install dependencies
bun install

# Run tests
bun test

# Run tests in watch mode
bun test --watch
```

## Code Style

- TypeScript strict mode
- ESM imports only (`import`/`export`, never `require`)
- Factory functions over classes
- Minimal dependencies (only `picocolors` for terminal colors)

## Testing

All changes should include tests. Run the test suite before submitting:

```bash
bun test
```

### Test Output Rules

Tests must be silent on success. Use `vi.spyOn(console, 'log').mockImplementation(() => {})` if your test needs to suppress output.

## Pull Request Process

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Update documentation if needed
7. Commit with conventional commit messages (`feat:`, `fix:`, `docs:`, etc.)
8. Push and open a pull request

## Commit Messages

Follow [Conventional Commits](https://conventionalcommits.org/):

- `feat: add new feature` - New features
- `fix: resolve bug` - Bug fixes
- `docs: update readme` - Documentation only
- `test: add tests` - Test additions
- `refactor: simplify code` - Code changes that neither fix bugs nor add features
- `chore: update deps` - Maintenance tasks

## Design Principles

1. **Logger-first architecture** - Spans are loggers with timing, not separate concepts
2. **Minimal API surface** - Prefer fewer, well-designed functions
3. **Type safety** - Leverage TypeScript for correctness
4. **Performance** - Optional chaining pattern for zero-cost disabled logs
5. **Structured output** - JSON by default, human-readable for development

## Questions?

Open an issue for discussion before starting large changes.
