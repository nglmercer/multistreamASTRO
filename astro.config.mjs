// @ts-check
import { defineConfig } from 'astro/config';

import lit from '@astrojs/lit';
import mdx from '@astrojs/mdx';
import expressiveCode from 'astro-expressive-code';
import vue from '@astrojs/vue';

// https://astro.build/config
export default defineConfig({
  integrations: [expressiveCode(), lit(), mdx(), vue({
      template: {
        compilerOptions: {
          // Tratar todas las etiquetas con un guion como elementos personalizados
          isCustomElement: (tag) => tag.includes('-')
        }
      }
    })],
  site: 'https://nglmercer.github.io/multistreamASTRO',
  base: '/',
});