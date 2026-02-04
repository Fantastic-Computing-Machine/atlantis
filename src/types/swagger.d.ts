declare module 'swagger-ui-dist/swagger-ui-bundle.js' {
  type SwaggerBundleFn = (opts: { url: string; dom_id: string; presets: unknown[] }) => {
    unmount?: () => void;
  };

  const swagger: SwaggerBundleFn & { presets: { apis: unknown } };
  export default swagger;
}

declare module 'swagger-ui-dist/swagger-ui-standalone-preset.js' {
  const preset: unknown;
  export default preset;
}
