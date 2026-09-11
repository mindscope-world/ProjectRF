import React, { createContext, useContext, useEffect, useState } from 'react';
import { DEFAULT_SITE_CONTENT, fetchSiteContent, SiteContent } from './siteContent';

const SiteContentContext = createContext<SiteContent>(DEFAULT_SITE_CONTENT);

/**
 * Provides admin-edited storefront copy (hero, footer, logo, offer zone) to
 * every component below it. Starts synchronously with the built-in
 * defaults — which match today's hardcoded copy exactly — so there's no
 * loading flicker; once the fetch resolves, an admin's edits replace those
 * defaults in place. A failed fetch (offline, backend down) just means the
 * defaults stay, which is exactly what the storefront rendered before this
 * existed.
 */
export const SiteContentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [content, setContent] = useState<SiteContent>(DEFAULT_SITE_CONTENT);

  useEffect(() => {
    let cancelled = false;
    fetchSiteContent()
      .then((fetched) => {
        if (!cancelled) setContent(fetched);
      })
      .catch(() => {
        // Keep the defaults — see docstring above.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return <SiteContentContext.Provider value={content}>{children}</SiteContentContext.Provider>;
};

export function useSiteContent(): SiteContent {
  return useContext(SiteContentContext);
}
