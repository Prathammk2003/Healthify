import Navbar from '@/components/Navbar';
import '@/app/globals.css';
import { AuthProvider } from '@/components/AuthProvider';

export const metadata = {
  title: 'Healthify - Your Healthcare Management Platform',
  description: 'Manage your health from one place. Schedule appointments, track medications, and monitor your well-being.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 antialiased">
        <AuthProvider>
          <Navbar />
          <main>{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
