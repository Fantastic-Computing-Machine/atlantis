'use client';

import { useEffect, useRef } from 'react';
import 'swagger-ui-dist/swagger-ui.css';

type SwaggerBundleFn = (opts: { url: string; dom_id: string; presets: unknown[] }) => {
  unmount?: () => void;
};

// Lazy-load swagger-ui-dist bundles only on the client to avoid SSR/Turbopack issues
export default function ApiDoc() {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    const load = async () => {
      if (!containerRef.current) return;
      const SwaggerBundleModule =
        (await import('swagger-ui-dist/swagger-ui-bundle.js')) as typeof import('swagger-ui-dist/swagger-ui-bundle.js');
      const SwaggerUIBundle = SwaggerBundleModule.default as SwaggerBundleFn & {
        presets: { apis: unknown };
      };
      const SwaggerUIStandalonePreset = (
        await import('swagger-ui-dist/swagger-ui-standalone-preset.js')
      ).default;

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
      className="container mx-auto rounded-lg bg-white p-4 dark:bg-gray-100"
    />
  );
}
