import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ConsoleWelcome } from '@/components/ConsoleWelcome';
import { GlobalShortcutsWrapper } from '@/components/GlobalShortcutsWrapper';
import { SnowEffectWrapper } from '@/components/SnowEffectWrapper';
import type { Metadata } from 'next';
import './globals.css';

// Use Tailwind's sans stack to avoid network font downloads during offline builds
const inter = { className: 'font-sans' };

export const metadata: Metadata = {
  title: 'atlantis',
  description: 'Self-hosted Mermaid Diagram Editor',
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🔱</text></svg>",
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
          <ConsoleWelcome />
          <GlobalShortcutsWrapper>
            <TooltipProvider>{children}</TooltipProvider>
          </GlobalShortcutsWrapper>
          <SnowEffectWrapper />
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}


