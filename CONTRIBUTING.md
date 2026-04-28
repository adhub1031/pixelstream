# Contributing to PixelStream

Thanks for considering a contribution! PixelStream is intentionally small — the goal is a tight, high-quality library, not a sprawling framework.

## Development setup

```bash
git clone https://github.com/adhub1031/pixelstream.git
cd pixelstream
pnpm install
pnpm -r build
pnpm -r test
```

You'll need:

- Node.js 18+
- pnpm 9+
- macOS / Linux / WSL (for `sharp` native bindings in `@pixelstream/cli`)

## Repository layout

```
packages/
  core/         — framework-agnostic loader
  react/        — React component
  element/      — Web Component
  cli/          — build-time resizer (sharp)
```

Each package is independently published to npm. Versions stay in lock-step.

## Workflow

1. **Fork & branch.** Create a topic branch from `main`.
2. **Make changes.** Keep them focused — one feature or fix per PR.
3. **Add tests.** Every feature or bugfix needs a regression test. We aim for >80% coverage in `core`.
4. **Run the suite locally.**
   ```bash
   pnpm -r build && pnpm -r test
   ```
5. **Lint / format.** TypeScript `strict` is enforced — no `any` slip-through.
6. **Open a PR.** Describe what changed and why. CI will run on push.

## Adding a CDN preset

If your provider supports URL-based resize, add it to `packages/core/src/presets.ts`:

```ts
yourcdn: (src, w) => `${src}?width=${w}`,
```

Update `PresetName` and write tests in `presets.test.ts` covering: with/without query, basic resize, edge cases (no extension, special characters).

## Adding a framework adapter

We currently ship React + Web Component adapters. Adapters for other frameworks (Vue, Svelte, Solid, Angular) are welcome. Pattern:

- New `packages/<framework>/` directory
- Wraps `loadProgressive` from `@pixelstream/core`
- Cleans up via `AbortController` on unmount
- Forwards standard `<img>` attributes
- Independent tests

## Code style

- TypeScript with `strict: true`
- ESM-first; CJS via `tsup` dual-format
- No emoji in code (comments OK if Korean clarifies intent — this is a Korean-led project)
- Comments explain *why*, not *what* — let well-named identifiers do the rest

## Bug reports

Open an issue with:

1. PixelStream version (e.g., `@pixelstream/core@0.1.0`)
2. Browser / Node.js version
3. Minimal reproduction (CodeSandbox link or paste-able snippet)
4. Expected vs. actual behavior

## License

By contributing, you agree your contributions are licensed under the [MIT License](./LICENSE).
