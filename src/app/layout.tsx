import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import Navigation from '@/components/navigation/Navigation';
import { FavoritesProvider } from '@/contexts/FavoritesContext';
import { RatingsProvider } from '@/contexts/RatingsContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { LanguageProvider } from '@/lib/i18n';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: 'where2watch - Finn din neste favorittbar',
  description: 'where2watch hjelper deg med å finne din neste favorittbar',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'where2watch',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
		  return (
		    <html lang="no">
		      <body
		        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
		      >
		        <LanguageProvider>
		          <FavoritesProvider>
		            <RatingsProvider>
		              <ToastProvider>
		                <Navigation />
		                {children}
		              </ToastProvider>
		            </RatingsProvider>
		          </FavoritesProvider>
		        </LanguageProvider>
		      </body>
		    </html>
		  );
	}
