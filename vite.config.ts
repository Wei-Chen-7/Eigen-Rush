/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The site lives at https://<user>.github.io/Eigen-Rush/, so the base has to
// match the repo name exactly — GitHub Pages paths are case-sensitive.
//
// It is set unconditionally rather than only for builds. With a build-only
// base, the dev and preview servers mount at "/" while the built index.html
// points at "/Eigen-Rush/...", so `npm run preview` quietly serves index.html
// in place of every asset and can never exercise what actually gets deployed.
// One base everywhere means dev, preview and Pages all agree.
export default defineConfig({
  base: '/Eigen-Rush/',
  plugins: [react()],
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
