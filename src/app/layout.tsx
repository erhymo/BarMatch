import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import Navigation from '@/components/navigation/Navigation';
import { AuthProvider } from '@/contexts/AuthContext';
import { FavoritesProvider } from '@/contexts/FavoritesContext';
import { RatingsProvider } from '@/contexts/RatingsContext';
import { ToastProvider } from '@/contexts/ToastContext';

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
	        <AuthProvider>
	          <FavoritesProvider>
	            <RatingsProvider>
	              <ToastProvider>
	                <Navigation />
	                {children}
	              </ToastProvider>
	            </RatingsProvider>
	          </FavoritesProvider>
	        </AuthProvider>
	      </body>
	    </html>
	  );
}
