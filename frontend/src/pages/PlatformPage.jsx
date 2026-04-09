import React from 'react';
import { motion } from 'framer-motion';
import { 
  Activity, 
  Cpu, 
  Database, 
  ArrowRight, 
  Mic, 
  WalletCards, 
  LayoutDashboard,
  Link as LinkIcon
} from 'lucide-react';
import PublicNavbar from '../components/PublicNavbar';

const PlatformPage = () => {
  return (
    <div className="landing-bg">
      <PublicNavbar />

      {/* Hero Section */}
      <section className="pt-40 pb-20 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-5xl md:text-6xl font-sans font-black tracking-[-0.03em] mb-6 text-slate-900">
              The Architecture <br />
              <span className="text-slate-400">of Oversight.</span>
            </h1>
            <p className="text-xl text-slate-500 max-w-2xl mb-12 leading-relaxed font-light">
              Explaining how CALDIM unifies multi-dimensional industrial data into a single, actionable stream of truth.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Layer breakdown */}
      <section className="py-20 px-6 border-t border-slate-100">
        <div className="max-w-7xl mx-auto space-y-32">
          
          {/* Layer 1: AI (MOM) */}
          <div className="grid md:grid-cols-2 gap-20 items-center">
             <div className="space-y-6">
                <div className="flex items-center gap-3 text-indigo-600 font-bold uppercase tracking-[0.2em] text-[10px]">
                   <Cpu className="w-4 h-4" />
                   <span>Intelligence Layer</span>
                </div>
                <h2 className="text-4xl font-bold tracking-tight text-slate-900 leading-tight">AI-Generated Governance</h2>
                <p className="text-slate-500 text-lg font-light leading-relaxed">
                   Our Speech-to-Text engine doesn't just transcribe—it analyzes. Every meeting is processed for criticality, action items, and responsibility assignments automatically. No more manual MOM drafting.
                </p>
                <div className="grid grid-cols-2 gap-4">
                   <div className="p-4 bg-white border border-slate-100 rounded-lg">
                      <div className="text-xs font-bold text-slate-400 mb-1">REAL-TIME</div>
                      <div className="text-sm font-semibold">Waveform Analysis</div>
                   </div>
                   <div className="p-4 bg-white border border-slate-100 rounded-lg">
                      <div className="text-xs font-bold text-slate-400 mb-1">AUTOMATED</div>
                      <div className="text-sm font-semibold">Assignee Mapping</div>
                   </div>
                </div>
             </div>
             <div className="bg-slate-50 rounded-3xl p-12 border border-slate-100 relative overflow-hidden group">
                {/* SVG Abstract for Waveform */}
                <svg viewBox="0 0 200 100" className="w-full h-full opacity-20 wave-svg">
                   <path 
                     d="M0,50 Q25,30 50,50 T100,50 T150,50 T200,50" 
                     fill="none" 
                     stroke="currentColor" 
                     strokeWidth="2" 
                     className="text-indigo-600"
                   />
                </svg>
                <Mic className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 text-indigo-600/20 group-hover:scale-110 transition-transform" />
             </div>
          </div>

          {/* Layer 2: Finance (Budget) */}
          <div className="grid md:grid-cols-2 gap-20 items-center">
             <div className="order-2 md:order-1 bg-slate-50 rounded-3xl p-12 border border-slate-100 flex items-center justify-center">
                <WalletCards className="w-24 h-24 text-emerald-600/20" />
             </div>
             <div className="order-1 md:order-2 space-y-6">
                <div className="flex items-center gap-3 text-emerald-600 font-bold uppercase tracking-[0.2em] text-[10px]">
                   <Database className="w-4 h-4" />
                   <span>Financial Layer</span>
                </div>
                <h2 className="text-4xl font-bold tracking-tight text-slate-900 leading-tight">Excel-to-Platform Sync</h2>
                <p className="text-slate-500 text-lg font-light leading-relaxed">
                   Maintain your existing spreadsheets while benefiting from platform-level visibility. Our Budget Master synchronizes directly with industrial financial trackers to eliminate variance gaps.
                </p>
                <div className="flex items-center gap-4 text-sm font-bold text-slate-400">
                   <LinkIcon className="w-4 h-4 text-emerald-500" />
                   <span>Bi-directional Data Integrity</span>
                </div>
             </div>
          </div>

          {/* Layer 3: Execution (Dashboard) */}
          <div className="grid md:grid-cols-2 gap-20 items-center">
             <div className="space-y-6">
                <div className="flex items-center gap-3 text-slate-900 font-bold uppercase tracking-[0.2em] text-[10px]">
                   <Activity className="w-4 h-4" />
                   <span>Execution Layer</span>
                </div>
                <h2 className="text-4xl font-bold tracking-tight text-slate-900 leading-tight">Executive Telemetry</h2>
                <p className="text-slate-500 text-lg font-light leading-relaxed">
                   A high-fidelity view of project health. Track critical paths, issue blockers, and overall project statuses in real-time. Designed for executive-level decision making.
                </p>
                <ul className="space-y-3">
                   {['Status Categorization', 'Issue Blockers Tracking', 'Critical Path Indicators'].map(item => (
                     <li key={item} className="flex items-center gap-3 text-sm font-semibold text-slate-700">
                        <ArrowRight className="w-3 h-3 text-slate-400" />
                        {item}
                     </li>
                   ))}
                </ul>
             </div>
             <div className="bg-slate-900 rounded-3xl p-12 overflow-hidden shadow-2xl relative">
                <LayoutDashboard className="w-full h-full text-white/5" />
                <div className="absolute inset-0 flex items-center justify-center">
                   <div className="w-3/4 h-2/3 border border-white/10 rounded-xl bg-white/5 backdrop-blur-sm p-4">
                      <div className="w-1/3 h-2 bg-white/20 rounded-full mb-4" />
                      <div className="grid grid-cols-2 gap-2">
                         <div className="h-12 bg-white/10 rounded-lg" />
                         <div className="h-12 bg-white/10 rounded-lg" />
                      </div>
                   </div>
                </div>
             </div>
          </div>

        </div>
      </section>

      {/* Final CTA */}
      <section className="py-40 bg-white text-center px-6">
         <div className="max-w-2xl mx-auto">
            <h2 className="text-4xl font-bold text-slate-900 mb-8">Ready to see how it works?</h2>
            <button 
              onClick={() => navigate('/login')}
              className="btn-primary mx-auto py-4 px-10 text-lg"
            >
               Sign in to Workspace
            </button>
         </div>
      </section>

      {/* Unified Footer */}
      <footer className="py-12 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-6 text-center text-xs text-slate-400">
          © 2026 Caldim Industrial Platform. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default PlatformPage;
