import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Zap, ChevronRight } from 'lucide-react';

const PublicNavbar = () => {
  const navigate = useNavigate();

  return (
    <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-200/60">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-10">
          <Link to="/" className="flex items-center space-x-2.5">
            <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-white fill-current" />
            </div>
            <span className="text-lg font-bold tracking-tight text-slate-900">CALDIM</span>
          </Link>
          
          <div className="hidden md:flex items-center space-x-8 text-sm font-semibold text-slate-500">
            <Link to="/platform" className="hover:text-slate-900 transition-colors">Platform</Link>
            <Link to="/impact" className="hover:text-slate-900 transition-colors">Impact</Link>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <button 
            onClick={() => navigate('/login')}
            className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
          >
            Sign in
          </button>
          <button 
            onClick={() => navigate('/login')}
            className="px-4 py-2 bg-slate-900 text-white rounded-lg font-bold text-sm hover:bg-slate-800 transition-all flex items-center gap-2"
          >
            <span>Launch Platform</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </nav>
  );
};

export default PublicNavbar;
