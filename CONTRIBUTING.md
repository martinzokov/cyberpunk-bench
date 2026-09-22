# Contributing

Cyberpunk Bench is early, so the best contributions are small, visible, and reproducible.

## Development

```sh
pnpm install
pnpm dev
```

Before opening a pull request, run:

```sh
pnpm check
pnpm typecheck
pnpm build
```

## Adding a model

A model's entry is a complete, self-contained web app that renders one cyberpunk scene in real time. Give the model the brief in [`PROMPT.md`](PROMPT.md), keep whatever it produces, and wire it in.

The `<model-id>` is the model's name in lowercase kebab case, with its tier if it has one: `opus-5.5`, `gpt-6-sol`, `gemini-3.8-flash`. It is the app's directory name, its URL value (`?model=<model-id>`) and its build output directory, so it must match everywhere.

1. **Exclude `apps/<model-id>/` from linting first**, before the code lands. Add it to `files.includes` in `biome.jsonc`:

   ```jsonc
   "includes": ["!apps/playground/public/models", "!apps/<model-id>"]
   ```

   Do this step first. `.claude/settings.json` runs `pnpm fix` after every file an agent writes, and anything not yet excluded gets rewritten — quotes, import order, `0xff7726` into `0xff_77_26`. That silently destroys the thing the benchmark is measuring.

2. **Put the app in `apps/<model-id>/`** — a Vite app with its own `package.json`, named `@cyberpunk-bench/<model-id>`, with a `build` script that runs `vite build`. Keep the model's code exactly as generated; do not reformat it or port it onto another model's abstractions. Its dependencies are its own, including the Three.js version.

   If the app was built outside this repo, confirm nothing changed when copying it in:

   ```sh
   diff -r <original-app>/src apps/<model-id>/src
   ```

3. **Point its build at the playground.** In `apps/<model-id>/vite.config.js`:

   ```js
   base: './',
   build: {
     outDir: '../playground/public/models/<model-id>',
     emptyOutDir: true,
   },
   ```

   The relative `base` matters — the app is served from a subdirectory, so rooted asset URLs will 404. This and the package name are the only changes to the model's app that wiring it in allows.

4. **Install its dependencies** from the repo root, which also records them in `pnpm-lock.yaml`:

   ```sh
   pnpm install
   ```

5. **Register it in the playground** — add an entry to `modelOptions` in `apps/playground/src/main.tsx`. The first entry is the default model.

   ```ts
   {
     label: "Opus 5.5",
     value: "opus-5.5",
     provider: "anthropic", // "openai" | "anthropic" | "google" | "grok" | "other"
     effort: "Max",
     effortDetail: "Thinking effort: max",
     duration: "1h 48m", // wall-clock from the brief to a working app
     summary: "One sentence on what the scene is and how it is built.",
     controls: "Drag to orbit, scroll to zoom, …",
   },
   ```

6. **Add it to the smoke test** — add the `<model-id>` to `models` in `tests/visual/smoke.mjs`. The build needs no change: `build:models` builds every app it finds in `apps/`.

7. **Document it in the README** — add a row to the Models table, and a bold-led paragraph under it describing the scene, in the same voice as the `summary`. Replace the "No models have run yet." line when adding the first one.

8. **Verify:**

   ```sh
   pnpm check
   pnpm typecheck
   pnpm build
   pnpm preview
   pnpm test:visual
   ```

   Then open `http://localhost:4173/?model=<model-id>`. `pnpm test:visual` needs Playwright's browser, installed once with `pnpm exec playwright install chromium`.

## What makes a good entry

- It runs at an interactive frame rate on a laptop GPU.
- It follows the brief.
- It is the model's own work, kept intact — that is the thing being compared.
- It cleans up after itself well enough to survive being switched away from and back to.

## The playground

The shell stays deliberately thin: pick a model, render it, get out of the way. It draws nothing over the viewport except a load state, because each model app owns its title and HUD. Changes to the shell should follow this repo's standards and use shadcn components with semantic Tailwind tokens.
