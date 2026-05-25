import { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { connectSocket, disconnectSocket } from '../services/socket';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const cached = localStorage.getItem('unisolve_user');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (err) {
        return null;
      }
    }
    return null;
  });

  const [loading, setLoading] = useState(() => {
    const token = localStorage.getItem('unisolve_token');
    const cached = localStorage.getItem('unisolve_user');
    return !!(token && !cached);
  });

  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('unisolve_token');
    if (!token) {
      setLoading(false);
      return;
    }

    // Connect socket on startup since we have a valid token
    connectSocket(token);

    api.get('/auth/me')
      .then((response) => {
        setUser(response.data);
        localStorage.setItem('unisolve_user', JSON.stringify(response.data));
      })
      .catch(() => {
        // Clear cached user/token on invalid auth
        localStorage.removeItem('unisolve_token');
        localStorage.removeItem('unisolve_user');
        setUser(null);
        disconnectSocket();
        navigate('/login');
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    localStorage.setItem('unisolve_token', response.data.token);
    localStorage.setItem('unisolve_user', JSON.stringify(response.data.user));
    setUser(response.data.user);
    // Connect socket immediately with new token
    connectSocket(response.data.token);
    navigate('/dashboard');
  };

  const register = async (name, email, password) => {
    const response = await api.post('/auth/register', { name, email, password });
    localStorage.setItem('unisolve_token', response.data.token);
    localStorage.setItem('unisolve_user', JSON.stringify(response.data.user));
    setUser(response.data.user);
    // Connect socket immediately with new token
    connectSocket(response.data.token);
    navigate('/dashboard');
  };

  const logout = () => {
    localStorage.removeItem('unisolve_token');
    localStorage.removeItem('unisolve_user');
    setUser(null);
    // Terminate socket connection
    disconnectSocket();
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
