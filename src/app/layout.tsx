import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: "Nick's Gift List",
  description: 'Gift ideas for Nick.',
  manifest: '/site.webmanifest',
  icons: {
    icon: '/favicon.ico',
    apple: '/icon.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#f7f4ee',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <div className="aurora-backdrop" aria-hidden="true" />
        <div className="aurora-grain" aria-hidden="true" />
        <div className="app-shell">{children}</div>
      </body>
    </html>
  );
}
