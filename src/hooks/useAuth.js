import { useContext } from 'react';
import { AuthContext } from '@/components/AuthProvider';

// Named export for destructured import: import { useAuth } from '@/hooks/useAuth'
export const useAuth = () => {
  return useContext(AuthContext);
};

// Default export for direct import: import useAuth from '@/hooks/useAuth'
export default function useAuth() {
  return useContext(AuthContext);
}
