// @ts-check
import { defineConfig } from 'astro/config';
import { vite as vidstack } from 'vidstack/plugins';
import lit from '@astrojs/lit';
import solidJs from '@astrojs/solid-js';

import mdx from '@astrojs/mdx';

import expressiveCode from 'astro-expressive-code';

// https://astro.build/config
export default defineConfig({
  integrations: [expressiveCode(), lit(), solidJs(), mdx()],
  site: 'https://nglmercer.github.io/multistreamASTRO',
  base: '/',
  vite: {
    plugins: [vidstack()],
  },
});