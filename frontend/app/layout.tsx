import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';
import { IntroWrapper } from '@/components/IntroWrapper';

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: "Divyani's AI Newsroom",
  description: 'Latest AI, Technology, Startups & Gaming news — collected and summarised autonomously.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} dark`}>
      <body className="min-h-screen antialiased">
        <IntroWrapper>{children}</IntroWrapper>
      </body>
    </html>
  );
}
