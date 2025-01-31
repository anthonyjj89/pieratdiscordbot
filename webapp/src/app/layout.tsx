import './globals.css';
import { Inter } from 'next/font/google';
import { NextAuthProvider } from '@/components/providers/NextAuthProvider';
import { Metadata } from 'next';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'PieRat - Star Citizen Piracy Management',
  description: 'Track and manage your Star Citizen piracy operations',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full bg-gray-900">
      <body className={`${inter.className} h-full`}>
        <NextAuthProvider>{children}</NextAuthProvider>
      </body>
    </html>
  );
}
