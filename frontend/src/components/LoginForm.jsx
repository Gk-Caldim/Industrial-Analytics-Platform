import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { loginStart, loginSuccess, loginFailure } from '../store/slices/authSlice';
import API from '../utils/api';

const LoginForm = ({ onLoginSuccess, onLoginStart }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error: reduxError } = useSelector((state) => state.auth);
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState('');
  const [longLoading, setLongLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (onLoginStart) onLoginStart();
    setLocalError('');
    dispatch(loginStart());
    setLongLoading(false);

    const timer = setTimeout(() => {
      setLongLoading(true);
    }, 3000);

    const email = formData.email;
    const password = formData.password;

    try {
      const response = await API.post('/auth/login', { email, password });
      clearTimeout(timer);
      setLongLoading(false);

      if (response.data && response.data.access_token) {
        const { access_token, user } = response.data;
        dispatch(loginSuccess({ token: access_token, user }));
        
        if (onLoginSuccess) {
          onLoginSuccess();
        } else {
          navigate('/dashboard');
        }
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (err) {
      clearTimeout(timer);
      setLongLoading(false);
      const errorMessage = err.response?.data?.detail || err.message || 'Login failed';
      dispatch(loginFailure(errorMessage));
      setLocalError(errorMessage);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="w-full">
      {/* Header Area */}
      <div className="text-center mb-12 relative">
        <h2 className="text-4xl font-black text-slate-950 mb-2 tracking-tight uppercase">Sign In</h2>
        <p className="text-slate-500 font-bold text-[11px] tracking-widest uppercase italic">Secured User Authorization</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Email Field */}
        <div className="space-y-2">
          <label className="block text-[11px] font-black text-slate-900 uppercase tracking-widest ml-1">Email Address</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            className="w-full px-6 py-4 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-slate-100 focus:border-slate-400 transition-all duration-300 text-slate-950 font-medium placeholder-slate-300 shadow-sm"
            placeholder="Enter your email"
          />
        </div>

        {/* Password Field */}
        <div className="space-y-2">
          <div className="flex items-center justify-between ml-1">
            <label className="block text-[11px] font-black text-slate-900 uppercase tracking-widest">Password</label>
            <button type="button" className="text-[10px] font-bold text-slate-400 hover:text-slate-950 tracking-widest uppercase transition-colors">Forgot Password?</button>
          </div>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              className="w-full px-6 py-4 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-slate-100 focus:border-slate-400 transition-all duration-300 text-slate-950 font-medium placeholder-slate-300 shadow-sm"
              placeholder="••••••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600 transition-all duration-300"
            >
              {showPassword ? (
                 <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/></svg>
              ) : (
                 <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
              )}
            </button>
          </div>
        </div>

        {/* Options */}
        <div className="flex items-center px-1">
          <label className="flex items-center space-x-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="peer sr-only"
            />
            <div className="h-5 w-5 bg-white border border-slate-200 rounded-lg transition-all peer-checked:bg-slate-950 peer-checked:border-slate-950 shadow-sm" />
            <span className="text-[11px] font-bold uppercase text-slate-500 group-hover:text-slate-950 transition-colors tracking-widest">Keep me logged in</span>
          </label>
        </div>

        {localError && (
          <motion.div 
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
            <p className="text-[10px] font-bold tracking-widest uppercase text-red-600 leading-relaxed">{localError}</p>
          </motion.div>
        )}

        {/* ACCESS BUTTON */}
        <motion.button
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.98 }}
          type="submit"
          disabled={loading}
          className="w-full bg-slate-950 text-white py-5 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50"
        >
          <span className="text-[11px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3">
            {loading ? (
               <>
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  SIGNING IN...
               </>
            ) : 'SIGN IN'}
          </span>
        </motion.button>
      </form>
    </div>
  );
};

export default LoginForm;