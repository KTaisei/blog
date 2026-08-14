import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  // GitHub Pages project sites need the repository name here (e.g. /my-blog).
  base: process.env.BASE_PATH || '/',
  site: process.env.SITE_URL || 'https://YOUR_GITHUB_USERNAME.github.io',
  integrations: [mdx(), sitemap()],
  markdown: {
    shikiConfig: { theme: 'github-dark' }
  }
});
