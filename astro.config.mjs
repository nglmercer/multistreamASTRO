// @ts-check
import { defineConfig } from 'astro/config';

import lit from '@astrojs/lit';
import solidJs from '@astrojs/solid-js';

import mdx from '@astrojs/mdx';

import expressiveCode from 'astro-expressive-code';

import vue from '@astrojs/vue';

// https://astro.build/config
export default defineConfig({
  integrations: [expressiveCode(), lit(), solidJs(), mdx(), vue()],
  site: 'https://nglmercer.github.io/multistreamASTRO',
  base: '/',
});