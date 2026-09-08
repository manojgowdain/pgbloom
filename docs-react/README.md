# PGBloom Documentation

This folder contains the React documentation site for PGBloom. It uses React, TypeScript, and Vite.

## Development

From this directory, install dependencies and start the Vite development server:

```bash
npm install
npm run dev
```

Open the URL printed by Vite. The production site uses the custom domain `pgbloom.iotkit.in`, so assets are served from the domain root.

## Production Build

Build the site and preview the generated files locally:

```bash
npm run build
npm run preview
```

The production output is written to `dist/`. Vite generates root-relative asset URLs for the custom domain, such as `/assets/index-<hash>.js` and `/favicon.ico`. GitHub Pages may still redirect the repository URL to `https://pgbloom.iotkit.in/`.

## Scripts

- `npm run dev` starts the development server.
- `npm run build` type-checks and creates the production bundle.
- `npm run lint` runs Oxlint.
- `npm run preview` serves the production bundle locally.
