// @ts-check
import { defineConfig } from 'astro/config';

// Static build → upload the contents of /dist to Hostinger's public_html.
export default defineConfig({
  site: 'https://ybrainphotography.com',
  output: 'static',
  build: { inlineStylesheets: 'auto', assets: 'assets' },
  compressHTML: true,
});
