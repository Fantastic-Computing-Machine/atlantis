import { KittyMode } from '@/components/KittyMode';
import { LiveRefresh } from '@/components/LiveRefresh';
import { SnowEffectWrapper } from '@/components/SnowEffectWrapper';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { GlobalShortcutsWrapper } from '@/components/GlobalShortcutsWrapper';
import type { Metadata } from 'next';
import './globals.css';

// Use Tailwind's sans stack to avoid network font downloads during offline builds
const inter = { className: 'font-sans' };

export const metadata: Metadata = {
  title: 'atlantis',
  description: 'Self-hosted diagrams and notes platform',
  metadataBase: new URL(process.env.APP_URL || 'http://localhost:3000'),
  manifest: '/manifest.json',
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🔱</text></svg>",
  },
  openGraph: {
    title: '🔱 atlantis',
    description: 'Self-hosted platform for diagrams, notes, and knowledge management.',
    siteName: 'atlantis',
    type: 'website',
    images: [
      {
        url: '/preview.png',
        width: 1200,
        height: 630,
        alt: '🔱 atlantis - Self-hosted diagrams and notes platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '🔱 atlantis',
    description: 'Self-hosted platform for diagrams, notes, and knowledge management.',
    images: ['/preview.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <LiveRefresh />
          <GlobalShortcutsWrapper>
            <TooltipProvider>{children}</TooltipProvider>
          </GlobalShortcutsWrapper>
          <SnowEffectWrapper />
          <KittyMode />
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
