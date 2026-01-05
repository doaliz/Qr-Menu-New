import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);
  const [subscriptionInfo, setSubscriptionInfo] = useState(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  const fetchSubscriptionInfo = async (authToken) => {
    setSubscriptionLoading(true);
    try {
      const response = await axios.get(`${API}/subscription/info`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      setSubscriptionInfo(response.data);
      setIsSuperAdmin(response.data.is_super_admin || false);
    } catch (error) {
      console.error('Failed to fetch subscription info:', error);
      setIsSuperAdmin(false);
    } finally {
      setSubscriptionLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      axios.get(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(async (response) => {
        setUser(response.data);
        await fetchSubscriptionInfo(token);
        setLoading(false);
      })
      .catch(() => {
        localStorage.removeItem('token');
        setToken(null);
        setSubscriptionLoading(false);
        setLoading(false);
      });
    } else {
      setSubscriptionLoading(false);
      setLoading(false);
    }
  }, [token]);

  const login = async (email, password) => {
    const response = await axios.post(`${API}/auth/login`, { email, password });
    const { token: newToken, restaurant, is_super_admin } = response.data;
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(restaurant);
    setIsSuperAdmin(is_super_admin || false);
    return { restaurant, is_super_admin };
  };

  const register = async (name, email, password) => {
    const response = await axios.post(`${API}/auth/register`, { name, email, password });
    const { token: newToken, restaurant } = response.data;
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(restaurant);
    return restaurant;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setSubscriptionInfo(null);
    setIsSuperAdmin(false);
  };

  const refreshSubscriptionInfo = () => {
    if (token) {
      fetchSubscriptionInfo(token);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      token, 
      login, 
      register, 
      logout, 
      loading: loading || subscriptionLoading, 
      subscriptionInfo, 
      isSuperAdmin,
      refreshSubscriptionInfo 
    }}>
      {children}
    </AuthContext.Provider>
  );
};