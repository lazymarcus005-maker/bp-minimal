import './globals.css';
import Link from 'next/link';

export const metadata = {
  title: process.env.NEXT_PUBLIC_APP_NAME || 'BP Reader',
  description: 'Minimal blood pressure reader with OpenRouter and Supabase',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="shell">
          <header className="topbar">
            <div>
              <h1>{process.env.NEXT_PUBLIC_APP_NAME || 'BP Reader'}</h1>
              <p>Upload image → review → save numeric reading only</p>
            </div>
            <nav>
              <Link href="/">Upload</Link>
              <Link href="/dashboard">Dashboard</Link>
            </nav>
          </header>
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}
