import { defineConfig } from 'vite';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  base: '/audio-player/', // 👈 important!
  plugins: [
    visualizer({ template: 'treemap' }),
  ],
});