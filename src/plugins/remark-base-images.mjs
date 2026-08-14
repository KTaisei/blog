/**
 * GitHub Pages project sites live below a repository path (for example /blog/).
 * Decap CMS writes markdown image URLs as /images/uploads/..., which otherwise
 * points at the domain root. Prefix those image URLs during the Astro build.
 */
export function remarkBaseImages(base) {
  const normalizedBase = base === '/' ? '/' : `${base.replace(/^\/+|\/+$/g, '')}/`;

  return () => (tree) => {
    const visit = (node) => {
      if (node.type === 'image' && typeof node.url === 'string' && node.url.startsWith('/images/')) {
        node.url = `${normalizedBase}${node.url.slice(1)}`;
      }
      if (Array.isArray(node.children)) node.children.forEach(visit);
    };
    visit(tree);
  };
}
