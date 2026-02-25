import axios from 'axios';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "https://automated-manufacturing.onrender.com/api",
  timeout: 60000, // 60 seconds timeout to allow for cold starts
  headers: {
    'Content-Type': 'application/json',
  },
});

console.log('API Configured with Base URL:', API.defaults.baseURL);

// Add token to requests
API.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default API;