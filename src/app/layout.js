import Navbar from '@/components/Navbar';
import '@/app/globals.css';
import { AuthProvider } from '@/components/AuthProvider';
import AuthChecker from '@/components/AuthChecker';
import { SessionProvider } from 'next-auth/react';
import SessionWrapper from '@/components/SessionWrapper';
import { ThemeProvider } from '@/context/ThemeContext';

// Initialize datasets at application startup (epoch loading)
if (typeof window === 'undefined') {
  // Server-side only - load datasets at startup
  import('@/lib/dataset-loader').then(({ datasetLoader }) => {
    // Start loading datasets immediately at application startup
    datasetLoader.loadAllDatasetsAtStartup().then((success) => {
      if (success) {
        console.log('🚀 Application ready with medical datasets loaded');
      } else {
        console.warn('⚠️ Application started but datasets loading failed');
      }
    }).catch((error) => {
      console.error('❌ Dataset loading error at startup:', error);
    });
  }).catch((error) => {
    console.error('❌ Failed to import dataset loader:', error);
  });
}

export const metadata = {
  title: 'Healthify - Your Healthcare Management Platform',
  description: 'Manage your health from one place. Schedule appointments, track medications, and monitor your well-being.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 antialiased flex flex-col">
        <ThemeProvider>
          <SessionWrapper>
            <AuthProvider>
              <AuthChecker />
              {/* Navbar has internal logic to determine when to show */}
              <Navbar />
              <main className="flex-grow">{children}</main>
            </AuthProvider>
          </SessionWrapper>
        </ThemeProvider>
      </body>
    </html>
  );
}
