import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '點餐平台',
  description: '簡易班級點餐系統',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-TW">
      <body>{children}</body>
    </html>
  );
}
