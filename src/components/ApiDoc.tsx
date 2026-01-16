'use client';

import dynamic from 'next/dynamic';
import 'swagger-ui-react/swagger-ui.css';

const SwaggerUI = dynamic(() => import('swagger-ui-react'), { ssr: false });

export default function ApiDoc() {
  return (
    <div className="container mx-auto p-4 bg-white dark:bg-gray-100 rounded-lg">
      <SwaggerUI url="/openapi.json" />
    </div>
  );
}