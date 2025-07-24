'use client';

import { usePathname } from 'next/navigation';
import Navbar from './Navbar';

export default function NavbarWrapper() {
  const pathname = usePathname();
  const isDashboardRoute = pathname?.startsWith('/dashboard');

  // Only show the Navbar when not in the dashboard section
  if (!isDashboardRoute) {
    return <Navbar />;
  }

  // Return null (no navbar) for dashboard routes
  return null;
} 