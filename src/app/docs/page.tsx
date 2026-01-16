import ApiDoc from '@/components/ApiDoc';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'API Documentation - Atlantis',
  description: 'Interactive API documentation for the Atlantis application.',
};

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">API Documentation</h1>
          <p className="text-muted-foreground mt-2">
            Explore and test the Atlantis API endpoints. 
            Ensure <code>ENABLE_API_ACCESS=true</code> is set in your environment.
          </p>
        </div>
        <ApiDoc />
      </div>
    </div>
  );
}
