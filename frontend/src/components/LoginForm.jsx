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
    <div className="w-full font-inter">
      {/* Header */}
      <div className="text-left mb-8">
        <h1 className="text-3xl font-black font-outfit text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300 mb-2 tracking-tight">CALDIM</h1>
        <h2 className="text-2xl font-semibold font-outfit text-white mb-2">Welcome Back</h2>
        <p className="text-sm text-gray-400 font-light">Please enter your details to sign in.</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Email */}
        <div>
          <label className="block text-[11px] font-semibold text-gray-400 mb-1.5 uppercase tracking-widest font-outfit">
            Email Address
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-300 text-white placeholder-gray-500 backdrop-blur-sm text-sm"
            placeholder="name@caldim.in"
          />
        </div>

        {/* Password */}
        <div>
          <label className="block text-[11px] font-semibold text-gray-400 mb-1.5 uppercase tracking-widest font-outfit">
            Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-300 tracking-wider pr-12 text-white placeholder-gray-500 backdrop-blur-sm text-sm"
              placeholder="••••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition text-xs font-semibold tracking-wider font-outfit"
            >
              {showPassword ? 'HIDE' : 'SHOW'}
            </button>
          </div>
        </div>

        {/* Remember Me & Forgot Password */}
        <div className="flex items-center justify-between pt-2">
          <label className="flex items-center space-x-3 cursor-pointer group">
            <div className="relative flex items-center">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="peer sr-only"
              />
              <div className="h-4 w-4 rounded border border-white/20 bg-white/5 peer-checked:bg-blue-500 peer-checked:border-blue-500 transition-all flex items-center justify-center">
                <svg className={`w-2.5 h-2.5 text-white transition-opacity ${rememberMe ? 'opacity-100' : 'opacity-0'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <span className="text-[13px] text-gray-400 group-hover:text-gray-300 transition-colors">Remember Me</span>
          </label>
          <button
            type="button"
            className="text-[13px] text-blue-400 hover:text-blue-300 font-medium transition-colors"
          >
            Forgot Password?
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl backdrop-blur-sm animate-pulse">
            <p className="text-sm text-red-400 text-center font-medium">{error}</p>
          </div>
        )}

        {/* Login Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3.5 px-4 rounded-xl hover:from-blue-500 hover:to-indigo-500 focus:ring-4 focus:ring-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-bold text-sm tracking-wide mt-6 shadow-[0_0_20px_rgba(37,99,235,0.2)] hover:shadow-[0_0_30px_rgba(37,99,235,0.4)] font-outfit"
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Authenticating...
            </span>
          ) : (
            'SIGN IN'
          )}
        </button>
      </form>

      {/* Footer with Company Information */}
      <div className="mt-10 pt-8 border-t border-white/5">
        <div className="text-center flex flex-col items-center">
          <p className="text-gray-500 text-[11px] mb-2 font-inter">
            © {new Date().getFullYear()} Caldim Engineering Pvt. Ltd. All rights reserved.
          </p>
          <div className="flex items-center space-x-2 text-[11px] font-medium text-gray-600 font-inter">
            <span>Secure System v2.0</span>
            <span className="w-1 h-1 bg-gray-600 rounded-full"></span>
            <a href="#" className="hover:text-gray-400 transition-colors">Privacy Policy</a>
            <span className="w-1 h-1 bg-gray-600 rounded-full"></span>
            <a href="#" className="hover:text-gray-400 transition-colors">Terms</a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;