import Navbar from '@/components/Navbar';
import '@/app/globals.css';
import { AuthProvider } from '@/components/AuthProvider';
import AuthChecker from '@/components/AuthChecker';

export const metadata = {
  title: 'Healthify - Your Healthcare Management Platform',
  description: 'Manage your health from one place. Schedule appointments, track medications, and monitor your well-being.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 antialiased flex flex-col">
        <AuthProvider>
          <AuthChecker />
          {/* Navbar has internal logic to determine when to show */}
          <Navbar />
          <main className="flex-grow">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
