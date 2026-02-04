import { useContext } from 'react';
import { AuthContext } from '@/components/AuthProvider';

// Main hook function
function useAuthHook() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Named export for destructured import: import { useAuth } from '@/hooks/useAuth'
export const useAuth = useAuthHook;

// Default export for direct import: import useAuth from '@/hooks/useAuth'
export default useAuthHook;
