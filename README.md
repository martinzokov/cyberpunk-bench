# Cyberpunk Bench

Cyberpunk Bench is a benchmark for AI-generated interactive 3D scenes. Each model gets the same brief, builds one cyberpunk scene rendered in real time in the browser, and ships it as a complete, self-contained WebGL app. The playground is a thin shell that lets you switch between those apps and compare them.

Live at [cyber-bench.martinzokov.com](https://cyber-bench.martinzokov.com).

## The brief

The exact prompt every model receives will live in [`PROMPT.md`](PROMPT.md), word for word, so any scene can be traced back to what the model was asked for.

## Models

No models have run yet.

| Model | Reasoning | Time to build | App |
| --- | --- | --- | --- |

Every model runs at the highest reasoning setting it offers, so the times are comparable as "best effort", not as like-for-like compute. Time to build is wall-clock from the brief to a working app.

## How it works

Model apps are kept exactly as the model wrote them — their own Three.js version, their own build, their own in-scene UI. They are not ported to a shared renderer, because the point of the benchmark is what the model actually produced.

Each app builds to `apps/playground/public/models/<model-id>/`, and the playground loads the selected one in an iframe. That isolation is what lets two apps on different Three.js versions coexist, and it keeps each model's post-processing and animation loop intact.

That output is generated, not committed, so the playground's own `dev` and `build` scripts build every model app in `apps/` first. Deploying works whether the host builds from the repo root or from `apps/playground`.

## Requirements

- Node.js compatible with Vite 6 and React 19.
- pnpm 10.33.0, as declared in `packageManager`.

## Getting started

```sh
pnpm install
```

```sh
pnpm dev
```

`pnpm dev` builds every model app first, then starts the playground. Open the Vite URL it prints, by default:

```txt
http://localhost:5173/
```

The first model in the list is the default. Deep-link to a model with the `model` search param:

```txt
http://localhost:5173/?model=<model-id>
```

To work on a single model app with hot reload, run it on its own:

```sh
pnpm --filter @cyberpunk-bench/<model-id> dev
```

## Scripts

```sh
pnpm dev          # Build the model apps, then start the playground
pnpm build        # Build the model apps, then build the playground
pnpm build:models # Build only the model apps into the playground's public dir
pnpm preview      # Preview the production build
pnpm check        # Run Biome/Ultracite checks
pnpm fix          # Apply Biome/Ultracite fixes
pnpm typecheck    # Run TypeScript checks for the playground
pnpm test:visual  # Run Playwright smoke tests
```

`pnpm test:visual` expects a server to be running, and defaults to the preview port. Set `CYBERPUNK_BENCH_URL` to point somewhere else:

```sh
CYBERPUNK_BENCH_URL=http://localhost:5173/ pnpm test:visual
```

The smoke test loads each model on desktop and mobile viewports, confirms the URL state, checks that the model's canvas has a live WebGL context, watches for page errors, and writes screenshots to `tests/visual`.

## Workspace

```txt
apps/playground       Vite React shell: model selector and viewport
apps/<model-id>       One model's cyberpunk scene, as the model wrote it
tests/visual          Playwright smoke test and generated screenshots
```

Only the playground follows this repo's lint and formatting standards. The model apps are excluded in `biome.jsonc` so their code stays byte-for-byte as generated.

## Deployment

The site is hosted on Vercel. `vercel.json` builds from the repo root with `pnpm build` and serves `apps/playground/dist`.

## UI notes

The playground uses shadcn components and semantic Tailwind tokens — `bg-background`, `text-muted-foreground`, `border-border` and component variants. It deliberately draws nothing over the viewport except a load state, since each model app renders its own title and HUD.

The selected model is stored in the URL with the simplest `nuqs` `useQueryState` flow.

## Credits

Forked from [4 Elements](https://github.com/TheOrcDev/4elements) by TheOrcDev, whose playground architecture this reuses.

## Resources

- [Base UI](https://base-ui.com/) — unstyled, accessible React component primitives.
