/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Project page at https://<user>.github.io/Eigen-Rush/ — the build base must
// match the repo name exactly, since GitHub Pages paths are case-sensitive.
// The dev server stays at "/".
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/Eigen-Rush/' : '/',
  plugins: [react()],
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
}));
