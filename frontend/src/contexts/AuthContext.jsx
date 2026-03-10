import React, { createContext, useContext, useState, useEffect } from 'react';
import API from '../utils/api';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = sessionStorage.getItem('token');
    const storedUser = sessionStorage.getItem('user');

    if (token && storedUser) {
      try {
        setUser(JSON.parse(storedUser));
        //authenticate using tokens
        // Don't validate token if /api/auth/me endpoint doesn't exist
        // validateToken(token);
      } catch {
        logout();
      }
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    console.log('AuthContext: Attempting login for', email);
    try {
      console.log('AuthContext: Sending request to /auth/login');
      const response = await API.post('/auth/login', { email, password });
      console.log('AuthContext: Response received', response.status, response.data);

      if (!response.data || !response.data.access_token) {
        throw new Error('Invalid response from server: No access token received');
      }

      const { access_token, user } = response.data;

      sessionStorage.setItem('token', access_token);
      sessionStorage.setItem('user', JSON.stringify(user));
      setUser(user);

      return { success: true };
    } catch (error) {
      if (error.code === 'ECONNABORTED') {
        console.log('AuthContext: Login message -', error.message);
      } else {
        console.error('AuthContext: Login error', error);
      }

      let errorMessage = 'Login failed';
      if (error.code === 'ECONNABORTED') {
        errorMessage = 'Request timed out. The server might be waking up, please try again.';
      } else if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      } else if (error.message) {
        errorMessage = error.message;
      }
      return {
        success: false,
        error: errorMessage
      };
    }
  };

  const logout = () => {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    setUser(null);
    window.location.href = '/login';
  };

  const value = {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};