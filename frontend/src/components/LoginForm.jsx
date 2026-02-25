import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const LoginForm = () => {
  const { login } = useAuth();
  const [formData, setFormData] = useState({ 
    email: '', 
    password: '' 
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [longLoading, setLongLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setLongLoading(false);

    // Timer to show message if it takes too long
    const timer = setTimeout(() => {
      setLongLoading(true);
    }, 3000);

    // Use the actual values from formData, not the placeholder
    const email = formData.email;
    const password = formData.password === '**********' ? '' : formData.password;

    console.log('Logging in with:', email);
    
    const result = await login(email, password);
    
    clearTimeout(timer);
    setLongLoading(false);
    
    console.log('Login result:', result);
    
    if (result.success) {
      console.log('Redirecting to dashboard...');
      // Force redirect after a small delay to ensure state updates
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 100);
    } else {
      setError(result.error || 'Login failed. Please check your credentials.');
    }
    
    setLoading(false);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="w-full">
      {/* Header */}
      <div className="text-left mb-2">
        <h1 className="text-3xl font-bold text-red-600 mb-1 tracking-tight">CALDIM</h1>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Welcome Back :)</h2>
       
      </div>

      {/* Divider Line */}
      <div className="my-4">
        <div className="border-t border-gray-300"></div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1 uppercase tracking-wider">
            Email Address
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-200 text-gray-800"
            placeholder="sujitha@caldim.in"
          />
        </div>

        {/* Password */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1 uppercase tracking-wider">
            Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-200 tracking-wider pr-10"
              placeholder="**********"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-red-600 transition text-xs"
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>

        {/* Remember Me & Forgot Password */}
        <div className="flex items-center justify-between">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 text-red-600 rounded border-gray-300 focus:ring-red-500"
            />
            <span className="text-sm text-gray-700">Remember Me</span>
          </label>
          <button
            type="button"
            className="text-sm text-red-600 hover:text-red-800 font-medium"
          >
            Forgot Password?
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-2 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-xs text-red-700 text-center">{error}</p>
          </div>
        )}

        {/* Long Loading Message
        {longLoading && (
          <div className="p-2 bg-yellow-50 border border-yellow-200 rounded-lg mt-2">
            <p className="text-xs text-yellow-800 text-center">
              Connecting to server... This might take up to a minute if the server is waking up.
            </p>
          </div>
        )} */}

        {/* Login Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-red-600 text-white py-2.5 px-4 rounded-lg hover:bg-red-700 focus:ring-4 focus:ring-red-100 disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-300 font-medium mt-4"
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Logging in...
            </span>
          ) : (
            'Login Now'
          )}
        </button>
      </form>

      {/* Footer with Company Information */}
      <div className="mt-8 pt-6 border-t border-gray-200">
        <div className="text-center">
          <p className="text-gray-600 text-xs mb-1">
            © {new Date().getFullYear()} Caldim Engineering pvt Limited
          </p>
          <p className="text-gray-500 text-xs">
            All rights reserved
          </p>
          <p className="text-gray-400 text-xs mt-2">
            Secure login system v2.0
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;