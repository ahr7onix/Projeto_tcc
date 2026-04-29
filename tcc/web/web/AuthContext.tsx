import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';

interface User {
  email: string;
  role: 'patient' | 'nutritionist' | 'administrator'; // Adicionado o campo role
  name?: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  loading: boolean;
  user: User | null;
  login: (email: string, role: 'patient' | 'nutritionist' | 'administrator', name?: string) => void; // Atualizado para incluir role
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storagedUser = localStorage.getItem('@App:user');
    if (storagedUser) {
      setUser(JSON.parse(storagedUser));
    }
    setLoading(false);
  }, []);
  
  const login = useCallback((email: string, role: 'patient' | 'nutritionist' | 'administrator', name?: string) => {
    // Simulação de autenticação
    const userData: User = { email, role, name };
    setUser(userData);
    localStorage.setItem('@App:user', JSON.stringify(userData));
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('@App:user');
  }, []);

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{ isAuthenticated, loading, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};