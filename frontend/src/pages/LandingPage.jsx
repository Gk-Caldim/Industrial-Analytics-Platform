import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { 
  ArrowRight, 
  Layers, 
  BarChart3, 
  Mic, 
  WalletCards, 
  Target, 
  Zap,
  CheckCircle2,
  Lock
} from 'lucide-react';
import PublicNavbar from '../components/PublicNavbar';

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="landing-bg">
      <PublicNavbar />

      {/* Hero Section */}
      <section className="pt-40 pb-24 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 border border-indigo-100 rounded-full mb-8">
              <Zap className="w-3.5 h-3.5 text-indigo-600 fill-current" />
              <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-widest">v2.0 Enterprise Release</span>
            </div>
            <h1 className="text-6xl md:text-7xl font-sans font-black tracking-[-0.04em] leading-[0.95] mb-8 text-slate-950">
              The Industrial <br />
              <span className="text-slate-400">Intelligence OS.</span>
            </h1>
            <p className="text-xl text-slate-500 max-w-2xl mx-auto mb-12 leading-relaxed font-medium antialiased">
              Unify meeting governance, financial control, and real-time execution in one professional ecosystem. Designed for industrial project leaders.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button 
                onClick={() => navigate('/login')}
                className="btn-primary w-full sm:w-auto justify-center py-4 px-8 text-base shadow-xl shadow-slate-200"
              >
                <span>Launch Analytics Platform</span>
                <ArrowRight className="w-5 h-5" />
              </button>
              <button 
                onClick={() => navigate('/platform')}
                className="btn-secondary w-full sm:w-auto justify-center py-4 px-8 text-base"
              >
                Explore Architecture
              </button>
            </div>
          </motion.div>

          {/* Real Product Proof (Abstract UI) */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mt-24 relative"
          >
            <div className="ui-card max-w-4xl mx-auto shadow-2xl">
               <div className="h-10 bg-slate-50 border-b border-slate-200 flex items-center px-4 space-x-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-200" />
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-200" />
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-200" />
               </div>
               <div className="p-8 grid md:grid-cols-2 gap-8 items-center bg-white text-left">
                  <div className="space-y-6">
                    <div className="space-y-2">
                       <div className="h-1.5 w-32 bg-slate-100 rounded-full" />
                       <h3 className="text-2xl font-bold text-slate-900">Real-time Project Telemetry</h3>
                    </div>
                    <div className="space-y-3">
                       {[1,2,3].map(i => (
                         <div key={i} className="flex items-center gap-3">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            <div className="h-1 w-full bg-slate-50 rounded-full relative overflow-hidden">
                               <motion.div 
                                 initial={{ width: 0 }}
                                 animate={{ width: `${30 + i * 20}%` }}
                                 className="absolute top-0 left-0 h-full bg-slate-200"
                               />
                            </div>
                         </div>
                       ))}
                    </div>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-6 border border-slate-100 space-y-4">
                     <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">AI Insight Engine</span>
                        <Mic className="w-4 h-4 text-indigo-500" />
                     </div>
                     <div className="p-4 bg-white rounded-lg border border-slate-200 text-[13px] text-slate-600 italic">
                        "The critical risk identified in the last meeting was the budget variance in Section 4. Automated action item assigned to PM..."
                     </div>
                  </div>
               </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Core Capabilities */}
      <section id="features" className="py-24 border-t border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-12">
            <div className="space-y-4">
              <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
                <Mic className="w-5 h-5 text-indigo-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 tracking-tight">AI-Powered Oversight</h3>
              <p className="text-slate-500 text-[15px] leading-relaxed">
                Real-time speech-to-text meeting governance. Automate Minutes of Meeting (MOM) and critical action item mapping directly to project owners.
              </p>
            </div>
            <div className="space-y-4">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                <WalletCards className="w-5 h-5 text-emerald-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 tracking-tight">Financial Governance</h3>
              <p className="text-slate-500 text-[15px] leading-relaxed">
                Excel-synchronized budget synchronization. Track project variance, forecasting, and real-time actuals with zero data fragmentation.
              </p>
            </div>
            <div className="space-y-4">
              <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-slate-900" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 tracking-tight">Execution Analytics</h3>
              <p className="text-slate-500 text-[15px] leading-relaxed">
                Executive-level dashboards providing granular status monitoring. De-risk your project lifecycle with absolute transparency.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Key Metrics */}
      <section className="py-24 bg-slate-950 text-white overflow-hidden relative">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-4 gap-12 relative z-10">
          <div>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-[0.2em] mb-4">Productivity</p>
            <h4 className="text-5xl font-black heading-tight">40%</h4>
            <p className="text-slate-400 text-sm mt-4">Faster delivery cycles via automated governance.</p>
          </div>
          <div>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-[0.2em] mb-4">Financials</p>
            <h4 className="text-5xl font-black heading-tight">0%</h4>
            <p className="text-slate-400 text-sm mt-4">Variance in budget synchronization audit trails.</p>
          </div>
          <div>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-[0.2em] mb-4">Oversight</p>
            <h4 className="text-5xl font-black heading-tight">100%</h4>
            <p className="text-slate-400 text-sm mt-4">Action-item traceability for all project meetings.</p>
          </div>
          <div>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-[0.2em] mb-4">Security</p>
            <h4 className="text-5xl font-black heading-tight">AES</h4>
            <p className="text-slate-400 text-sm mt-4">Enterprise-grade encryption for all industrial data.</p>
          </div>
        </div>
        {/* Subtle grid background */}
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center space-x-2 grayscale opacity-50">
            <Zap className="w-5 h-5 text-slate-900" />
            <span className="text-lg font-bold tracking-tight text-slate-900">CALDIM</span>
          </div>
          <div className="flex items-center space-x-8 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
            <Link to="/platform" className="hover:text-slate-900 transition-colors">Platform</Link>
            <Link to="/impact" className="hover:text-slate-900 transition-colors">Impact</Link>
            <a href="#" className="hover:text-slate-900 transition-colors">Privacy</a>
          </div>
          <div className="text-xs text-slate-400">
            © 2026 Caldim Industrial Platform. Built for Excellence.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
