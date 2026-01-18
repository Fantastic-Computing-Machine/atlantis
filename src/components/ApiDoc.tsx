'use client';

'use client';

import { useEffect, useRef } from 'react';
import 'swagger-ui-dist/swagger-ui.css';

// Lazy-load swagger-ui-dist bundles only on the client to avoid SSR/Turbopack issues
export default function ApiDoc() {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    const load = async () => {
      if (!containerRef.current) return;
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore - path exists in swagger-ui-dist
      const SwaggerUIBundle = (await import('swagger-ui-dist/swagger-ui-bundle.js')).default as unknown as {
        (opts: { url: string; dom_id: string; presets: unknown[] }): { unmount?: () => void };
        presets: { apis: unknown };
      };
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore - path exists in swagger-ui-dist
      const SwaggerUIStandalonePreset = (await import('swagger-ui-dist/swagger-ui-standalone-preset.js')).default;

      const apisPreset = SwaggerUIBundle.presets.apis;

      const ui = SwaggerUIBundle({
        url: '/openapi.json',
        dom_id: '#swagger-container',
        presets: [apisPreset, SwaggerUIStandalonePreset],
      });

      cleanup = () => {
        if (typeof ui.unmount === 'function') {
          ui.unmount();
        }
        if (containerRef.current) {
          containerRef.current.innerHTML = '';
        }
      };
    };

    void load();

    return () => {
      cleanup?.();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      id="swagger-container"
      className="container mx-auto p-4 bg-white dark:bg-gray-100 rounded-lg"
    />
  );
}
