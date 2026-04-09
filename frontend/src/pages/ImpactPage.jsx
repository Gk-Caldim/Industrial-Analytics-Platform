import React from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  ShieldCheck, 
  BarChart, 
  ArrowRight,
  Clock,
  Target,
  FileSpreadsheet
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PublicNavbar from '../components/PublicNavbar';

const ImpactPage = () => {
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
            <h1 className="text-5xl md:text-6xl font-sans font-black tracking-[-0.03em] mb-8 text-slate-900 leading-[1.1]">
              Quantifiable Impact. <br />
              <span className="text-slate-400 font-light">Real Results.</span>
            </h1>
            <p className="text-xl text-slate-500 max-w-2xl mx-auto mb-12 leading-relaxed font-light">
              How the CALDIM Industrial Intelligence OS transforms operational efficiency and governance for leading industrial teams.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Outcomes Grid */}
      <section className="py-20 px-6 border-t border-slate-100 bg-white">
        <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-12">
          
          <div className="ui-card p-10 space-y-6 ui-card-hover group">
             <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center transition-colors group-hover:bg-blue-600">
                <TrendingUp className="w-6 h-6 text-blue-600 group-hover:text-white" />
             </div>
             <h3 className="text-2xl font-bold text-slate-900 tracking-tight">Oversight Efficiency</h3>
             <p className="text-slate-500 font-light leading-relaxed">
                Platform-wide automated governance reduces manual MOM drafting and meeting follow-up overhead by up to **40%**.
             </p>
             <div className="pt-4 border-t border-slate-50 flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-widest">
                <span>Metric</span>
                <span className="text-blue-600">Time-to-Value</span>
             </div>
          </div>

          <div className="ui-card p-10 space-y-6 ui-card-hover group">
             <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center transition-colors group-hover:bg-emerald-600">
                <ShieldCheck className="w-6 h-6 text-emerald-600 group-hover:text-white" />
             </div>
             <h3 className="text-2xl font-bold text-slate-900 tracking-tight">Financial Zero-Leakage</h3>
             <p className="text-slate-500 font-light leading-relaxed">
                By synchronizing master data with Excel financial trackers, we've eliminated variance gaps and reduced budget leakage to **0%**.
             </p>
             <div className="pt-4 border-t border-slate-50 flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-widest">
                <span>Metric</span>
                <span className="text-emerald-600">Budget Accuracy</span>
             </div>
          </div>

          <div className="ui-card p-10 space-y-6 ui-card-hover group">
             <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center transition-colors group-hover:bg-slate-900">
                <BarChart className="w-6 h-6 text-slate-900 group-hover:text-white" />
             </div>
             <h3 className="text-2xl font-bold text-slate-900 tracking-tight">Executive Visibility</h3>
             <p className="text-slate-500 font-light leading-relaxed">
                Real-time dashboard telemetry provides **100% transparency** into project health, issue blockers, and critical lifecycles.
             </p>
             <div className="pt-4 border-t border-slate-50 flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-widest">
                <span>Metric</span>
                <span className="text-slate-900">Transparency</span>
             </div>
          </div>

        </div>
      </section>

      {/* Case Study Section */}
      <section className="py-32 px-6">
        <div className="max-w-7xl mx-auto rounded-[3rem] bg-slate-950 p-16 md:p-24 relative overflow-hidden">
           <div className="relative z-10 grid lg:grid-cols-2 gap-20">
              <div className="space-y-8">
                 <div className="inline-block px-4 py-1 rounded-full bg-indigo-500 text-white text-[10px] font-bold uppercase tracking-widest">
                    Real Use Case
                 </div>
                 <h2 className="text-4xl md:text-5xl font-bold text-white leading-tight antialiased">
                    Transforming PMO Operational Velocity.
                 </h2>
                 <p className="text-slate-400 text-lg font-light leading-relaxed">
                    Prior to CALDIM, a leading industrial client spent 15+ hours weekly on MOM manual drafting and data-entry. By deploying our AI Intelligence layer, they automated 85% of this workflow.
                 </p>
                 <div className="grid grid-cols-2 gap-8 text-white pt-8">
                    <div>
                       <div className="text-3xl font-black mb-1">15h</div>
                       <div className="text-xs uppercase tracking-widest text-slate-500 font-bold">Weekly Savings</div>
                    </div>
                    <div>
                       <div className="text-3xl font-black mb-1">85%</div>
                       <div className="text-xs uppercase tracking-widest text-slate-500 font-bold">Automation Rate</div>
                    </div>
                 </div>
              </div>
              <div className="space-y-6">
                 {[
                   { icon: <Clock className="w-4 h-4" />, label: "Immediate ROI on deployment" },
                   { icon: <Target className="w-4 h-4" />, label: "Automated Responsibility Mapping" },
                   { icon: <FileSpreadsheet className="w-4 h-4" />, label: "Direct Excel Master Synchronization" }
                 ].map((item, idx) => (
                   <div key={idx} className="p-6 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-6">
                      <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                         {item.icon}
                      </div>
                      <span className="text-white font-semibold text-sm tracking-wide">{item.label}</span>
                   </div>
                 ))}
              </div>
           </div>
           
           {/* Abstract pattern */}
           <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none">
              <svg width="400" height="400" viewBox="0 0 400 400">
                <circle cx="400" cy="400" r="300" stroke="white" strokeWidth="1" fill="none" />
                <circle cx="400" cy="400" r="250" stroke="white" strokeWidth="1" fill="none" />
                <circle cx="400" cy="400" r="200" stroke="white" strokeWidth="1" fill="none" />
              </svg>
           </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-40 px-6 text-center">
         <div className="max-w-2xl mx-auto">
            <h2 className="text-4xl font-black text-slate-900 mb-8 tracking-tighter">Ready to maximize your project velocity?</h2>
            <button 
              onClick={() => navigate('/login')}
              className="btn-primary mx-auto py-5 px-12 text-xl shadow-2xl shadow-slate-200"
            >
               Enter Workspace
            </button>
         </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-slate-200 text-center">
         <p className="text-xs text-slate-400 font-medium">© 2026 CALDIM | Precision Industrial Intelligence</p>
      </footer>
    </div>
  );
};

export default ImpactPage;
