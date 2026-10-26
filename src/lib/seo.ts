import { useEffect } from 'react';

const SITE = 'Zetalogic Systems';

/** Sets the page title, description and Open Graph tags for client-rendered routes. */
export function usePageMeta(title: string, description: string) {
  useEffect(() => {
    document.title = title === SITE ? `${SITE} | Laptops, Software & IT Services in Lagos` : `${title} | ${SITE}`;
    const set = (attr: 'name' | 'property', key: string, content: string) => {
      let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.content = content;
    };
    set('name', 'description', description);
    set('property', 'og:title', document.title);
    set('property', 'og:description', description);
  }, [title, description]);
}
