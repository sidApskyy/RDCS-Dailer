import type { Metadata } from 'next';
import './globals.css';

import { Providers } from '../components/providers';
import { AuthProvider } from '../lib/auth-context';

export const metadata: Metadata = {
  title: 'RDCS Dialer',
  description: 'RDCS In-House Dialer Platform',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        <Providers>
          <AuthProvider>{children}</AuthProvider>
        </Providers>
      </body>
    </html>
  );
}
