import { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('unisolve_token');
    if (!token) {
      setLoading(false);
      return;
    }

    api.get('/auth/me')
      .then((response) => setUser(response.data))
      .catch(() => logout())
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    localStorage.setItem('unisolve_token', response.data.token);
    setUser(response.data.user);
    navigate('/dashboard');
  };

  const register = async (name, email, password) => {
    const response = await api.post('/auth/register', { name, email, password });
    localStorage.setItem('unisolve_token', response.data.token);
    setUser(response.data.user);
    navigate('/dashboard');
  };

  const logout = () => {
    localStorage.removeItem('unisolve_token');
    setUser(null);
    navigate('/login');
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
