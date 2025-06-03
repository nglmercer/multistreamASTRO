// @ts-check
import { defineConfig } from 'astro/config';

import lit from '@astrojs/lit';
import solidJs from '@astrojs/solid-js';

import mdx from '@astrojs/mdx';

// https://astro.build/config
export default defineConfig({
  integrations: [lit(), solidJs(), mdx()],
  site: 'https://nglmercer.github.io',
  base: '',
});