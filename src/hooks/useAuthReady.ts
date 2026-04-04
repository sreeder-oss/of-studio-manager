import { useAuth } from '@/contexts/AuthContext';

export const useAuthReady = () => {
  const { user, loading } = useAuth();

  return {
    user,
    isReady: !loading,
  };
};
