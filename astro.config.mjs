// @ts-check
import { defineConfig } from 'astro/config';

// Static build → upload the contents of /dist to Hostinger's public_html.
export default defineConfig({
  site: 'https://brown-caribou-814350.hostingersite.com',
  output: 'static',
  build: { inlineStylesheets: 'auto', assets: 'assets' },
  compressHTML: true,
});
