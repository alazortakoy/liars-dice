import type { Metadata } from 'next';
import './globals.css';
import { ToastProvider } from '@/components/ui/Toast';

export const metadata: Metadata = {
  title: "Liar's Dice — Online Multiplayer",
  description: 'Bluff your way to victory in this classic pirate dice game. Play online with friends!',
  openGraph: {
    title: "Liar's Dice",
    description: 'Online multiplayer bluffing dice game',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
