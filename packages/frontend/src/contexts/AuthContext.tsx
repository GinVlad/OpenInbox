import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { checkSession, login as apiLogin } from '../lib/api';

interface AuthState {
  authenticated: boolean;
  loading: boolean;
  login: (password: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthState>({
  authenticated: false,
  loading: true,
  login: async () => false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkSession()
      .then(setAuthenticated)
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (password: string): Promise<boolean> => {
    try {
      await apiLogin(password);
      setAuthenticated(true);
      return true;
    } catch {
      return false;
    }
  }, []);

  return (
    <AuthContext.Provider value={{ authenticated, loading, login }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
