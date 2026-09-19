import { useEffect } from 'react';

const DEFAULT_TITLE = "DesiClassifieds – Canada's South Asian Community";

/**
 * Hook for setting page-level SEO metadata (title, description, og tags, canonical).
 * Cleans up by restoring defaults on unmount.
 */
export function useSEO({ title, description, canonicalUrl, ogImage } = {}) {
  useEffect(() => {
    if (title) document.title = title;

    const setMeta = (attr, attrValue, content) => {
      if (!content) return;
      let el = document.querySelector(`meta[${attr}="${attrValue}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, attrValue);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    setMeta('name',     'description',       description);
    setMeta('property', 'og:title',          title);
    setMeta('property', 'og:description',    description);
    setMeta('property', 'og:type',           'website');
    if (canonicalUrl) setMeta('property', 'og:url', canonicalUrl);
    if (ogImage)      setMeta('property', 'og:image', ogImage);

    // Canonical link
    if (canonicalUrl) {
      let link = document.querySelector('link[rel="canonical"]');
      if (!link) {
        link = document.createElement('link');
        link.setAttribute('rel', 'canonical');
        document.head.appendChild(link);
      }
      link.setAttribute('href', canonicalUrl);
    }

    return () => {
      document.title = DEFAULT_TITLE;
    };
  }, [title, description, canonicalUrl, ogImage]);
}
