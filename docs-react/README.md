# PGBloom Documentation

This folder contains the React documentation site for PGBloom. It uses React, TypeScript, and Vite.

## Development

From this directory, install dependencies and start the Vite development server:

```bash
npm install
npm run dev
```

Open the URL printed by Vite. The app is configured with the `/pgbloom/` base path used by the production site.

## Production Build

Build the site and preview the generated files locally:

```bash
npm run build
npm run preview
```

The production output is written to `dist/`. Vite generates asset URLs under `/pgbloom/`, so deploy the site at that path (for example, `https://example.com/pgbloom/`). The favicon is also resolved through Vite's base URL and should be served as `/pgbloom/favicon.ico`.

## Scripts

- `npm run dev` starts the development server.
- `npm run build` type-checks and creates the production bundle.
- `npm run lint` runs Oxlint.
- `npm run preview` serves the production bundle locally.
