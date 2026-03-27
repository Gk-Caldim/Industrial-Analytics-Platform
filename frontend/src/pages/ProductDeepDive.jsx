import React, { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useTransform, AnimatePresence, useSpring } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { 
   Layout, 
   Users, 
   Package, 
   FileSpreadsheet, 
   Shield, 
   Zap, 
   Activity,
   Layers,
   Cpu,
   ChevronRight,
   CheckCircle2,
   AlertCircle
} from 'lucide-react';

const ProductDeepDive = () => {
   const navigate = useNavigate();
   const { isAuthenticated } = useSelector((state) => state.auth);
   const containerRef = useRef(null);
   const [activeSection, setActiveSection] = useState('hub');

   useEffect(() => {
      if (isAuthenticated) {
         navigate('/dashboard/projects');
      }
   }, [isAuthenticated, navigate]);

   const navItems = [
      { id: 'hub', label: 'INTELLIGENT HUB', icon: <Layout /> },
      { id: 'masters', label: 'MASTER DATA', icon: <Users /> },
      { id: 'trackers', label: 'TRACKER ENGINE', icon: <FileSpreadsheet /> }
   ];

   const scrollToSection = (id) => {
      setActiveSection(id);
      const element = document.getElementById(id);
      if (element) {
         element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
   };

   return (
      <div ref={containerRef} className="min-h-screen bg-white text-slate-950 font-outfit selection:bg-indigo-600 selection:text-white relative">
         {/* GOOGLE-STYLE VOLUMETRIC CANVAS */}
         <div className="fixed inset-0 z-0 pointer-events-none">
            <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.02),transparent_60%)]" />
         </div>

         {/* MINIMAL STICKY NAV */}
         <nav className="fixed top-0 left-0 right-0 z-[100] px-12 py-12 flex items-center justify-between pointer-events-none">
            <div 
               className="flex items-center gap-4 pointer-events-auto bg-white/60 backdrop-blur-3xl px-6 py-3 rounded-[2rem] border border-slate-100 shadow-sm cursor-pointer hover:bg-white transition-all"
               onClick={() => navigate('/')}
            >
               <div className="w-8 h-8 bg-slate-950 rounded-lg flex items-center justify-center shadow-lg">
                  <div className="w-2 h-2 bg-white rounded-full" />
               </div>
               <span className="text-xl font-black text-slate-950 tracking-tighter uppercase">INDUSSYNC</span>
            </div>

            <div className="hidden md:flex items-center gap-2 pointer-events-auto bg-white/60 backdrop-blur-3xl p-1.5 rounded-[2.2rem] border border-slate-100 shadow-sm">
               {navItems.map(item => (
                  <button
                     key={item.id}
                     onClick={() => scrollToSection(item.id)}
                     className={`px-8 py-3.5 rounded-[1.8rem] text-[10px] font-black uppercase tracking-[0.4em] transition-all duration-500 ${
                        activeSection === item.id ? 'bg-slate-950 text-white shadow-xl px-10' : 'text-slate-400 hover:text-slate-950 hover:bg-slate-50'
                     }`}
                  >
                     {item.label}
                  </button>
               ))}
            </div>

            <button
               onClick={() => navigate('/login')}
               className="pointer-events-auto px-12 py-4 bg-slate-950 text-white rounded-full text-[10px] font-black uppercase tracking-[0.4em] hover:bg-indigo-600 transition-all shadow-xl hover:scale-105"
            >
               Access
            </button>
         </nav>

         <main className="relative z-10 pt-40">
            {/* SECTION 1: THE INTEGRATED BENTO HUB */}
            <section id="hub" className="min-h-screen flex flex-col items-center justify-center px-12 py-32">
               <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 1.5, cubicBezier: [0.16, 1, 0.3, 1] }}
                  className="max-w-5xl mx-auto text-center mb-32"
               >
                  <span className="text-[10px] font-black text-indigo-600 tracking-[0.6em] uppercase block mb-8">Integrated Landscape</span>
                  <h1 className="text-7xl md:text-[11rem] font-black tracking-tighter leading-[0.85] text-slate-950 uppercase mb-12">
                     COMMAND <br /> <span className="text-slate-200">PLATFORM.</span>
                  </h1>
                  <p className="text-2xl text-slate-400 font-medium tracking-tight max-w-2xl mx-auto">
                     A unified Material 3 workspace for industrial masters and high-load trackers.
                  </p>
               </motion.div>

               {/* BENTO GRID OF MODULES */}
               <div className="w-full max-w-[1500px] grid grid-cols-1 md:grid-cols-12 gap-8 px-6">
                  <BentoCard 
                     className="md:col-span-8 aspect-video" 
                     title="Project Orchestrator" 
                     desc="Visual life-cycle tracking for multi-facility operations."
                     icon={<Activity className="text-indigo-600" />}
                     placeholder="PLATFORM_PREVIEW_VISUAL"
                     // src="/path/to/platform-preview.png"
                  />
                  <BentoCard 
                     className="md:col-span-4 aspect-square" 
                     title="Security Core" 
                     desc="Argon2 hardened identity sync."
                     icon={<Shield className="text-indigo-600" />}
                     dark
                  />
                  <BentoCard 
                     className="md:col-span-4 aspect-square" 
                     title="Component Sync" 
                     desc="Inventory data integrity."
                     icon={<Package className="text-indigo-600" />}
                  />
                  <BentoCard 
                     className="md:col-span-8 aspect-[21/9]" 
                     title="Excel Transformation" 
                     desc="Native Handsontable ingestion engine."
                     icon={<FileSpreadsheet className="text-indigo-600" />}
                     placeholder="DATA_STREAM_VISUAL"
                     // src="/path/to/data-stream.png"
                  />
               </div>
            </section>

            {/* SECTION 2: DATA INTELLIGENCE STREAM */}
            <section id="masters" className="py-80 px-12 bg-slate-50/50">
               <div className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-40 items-center">
                  <div className="space-y-16">
                     <div>
                        <span className="text-[11px] font-black text-indigo-600 tracking-[0.5em] uppercase mb-6 block">Transformation Engine</span>
                        <h2 className="text-6xl md:text-9xl font-black tracking-tighter uppercase leading-[0.85]">DATA <br /> <span className="text-slate-200 drop-shadow-sm">INTELLIGENCE.</span></h2>
                        <p className="text-2xl text-slate-500 font-medium leading-relaxed mt-12">
                           Precision mapping of organizational hierarchy. Track thousands of employees and industrial parts with zero metadata loss.
                        </p>
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <FeatureBlock title="Personnel Hub" desc="Role-based access mapping." />
                        <FeatureBlock title="Sync Metrics" desc="Millisecond-level telemetry." />
                     </div>
                  </div>
                  <div className="relative aspect-square bg-white rounded-[5rem] shadow-3xl border border-slate-100 flex items-center justify-center overflow-hidden">
                     <NeuralStreamVisual />
                  </div>
               </div>
            </section>

            {/* SECTION 3: WORKFLOW PROTOCOL (LINEAR SHIFT) */}
            <section id="trackers" className="py-60 px-12">
               <div className="max-w-6xl mx-auto text-center mb-32">
                  <h2 className="text-5xl md:text-8xl font-black tracking-tighter uppercase mb-8">System_Protocol</h2>
                  <p className="text-lg text-slate-400 font-black uppercase tracking-[0.4em]">From Ingestion to Action</p>
               </div>
               
               <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row justify-between items-center gap-1">
                  <WorkflowNode step="01" label="UPLOAD" desc="MASSIVE DATA INJECTION" />
                  <div className="hidden md:block w-px h-24 bg-slate-100 mx-10" />
                  <WorkflowNode step="02" label="MANAGE" desc="MASTER DATA SYNC" />
                  <div className="hidden md:block w-px h-24 bg-slate-100 mx-10" />
                  <WorkflowNode step="03" label="ANALYZE" desc="REAL-TIME INSIGHTS" />
                  <div className="hidden md:block w-px h-24 bg-slate-100 mx-10" />
                  <WorkflowNode step="04" label="EXECUTE" desc="INFORMED OPERATIONS" accent />
               </div>
            </section>

            {/* FINAL CTA: GOOGLE STYLE */}
            <section className="py-80 text-center relative overflow-hidden">
               <div className="max-w-5xl mx-auto relative z-10 space-y-24">
                  <h2 className="text-7xl md:text-[13rem] font-black tracking-tighter uppercase leading-[0.7]">READY TO <br /> <span className="text-slate-200">STRUCTURE?</span></h2>
                  <button 
                     onClick={() => navigate('/login')}
                     className="px-24 py-11 bg-slate-950 text-white rounded-full font-black text-xs uppercase tracking-[0.8em] shadow-3xl hover:scale-105 transition-all duration-700 active:scale-95"
                  >
                     Log In to Platform
                  </button>
               </div>
            </section>
         </main>

         <footer className="py-24 bg-white border-t border-slate-50 px-12 text-center text-[10px] font-black uppercase tracking-[0.8em] text-slate-200">
            © 2026 INDUSTRIAL CONTEXT HUB // ALL RIGHTS SECURED
         </footer>
      </div>
   );
};

const BentoCard = ({ title, desc, icon, className, dark, placeholder, src }) => (
   <motion.div 
      whileHover={{ y: -8 }}
      className={`p-16 rounded-[4rem] border border-slate-100 transition-all duration-700 flex flex-col justify-between group relative overflow-hidden ${dark ? 'bg-slate-950 text-white' : 'bg-white shadow-sm hover:shadow-2xl'} ${className}`}
   >
      <div className="relative z-10">
         <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-10 shadow-lg ${dark ? 'bg-white/10 text-white' : 'bg-indigo-50 text-indigo-600 shadow-indigo-500/5'}`}>
            {React.cloneElement(icon, { size: 24 })}
         </div>
         <h4 className="text-4xl font-black uppercase tracking-tighter mb-6 leading-none">{title}</h4>
         <p className={`text-lg font-medium tracking-tight uppercase ${dark ? 'text-white/40' : 'text-slate-400'}`}>{desc}</p>
      </div>
      
      {placeholder && (
         <div className={`mt-10 aspect-video rounded-[2.5rem] border ${dark ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-50'} flex items-center justify-center overflow-hidden`}>
            {src ? (
               <img src={src} alt={title} className="w-full h-full object-cover" />
            ) : (
               <span className={`text-[10px] font-black uppercase tracking-[0.6em] ${dark ? 'text-white/10' : 'text-slate-200'}`}>{placeholder}</span>
            )}
         </div>
      )}
      
      {!dark && <div className="absolute inset-0 bg-indigo-50/10 opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />}
   </motion.div>
);

const FeatureBlock = ({ title, desc }) => (
   <div className="flex flex-col gap-4 p-8 bg-white border border-slate-100 rounded-[2.5rem] shadow-sm hover:shadow-xl transition-all duration-700">
      <div className="w-2.5 h-2.5 bg-indigo-600 rounded-full mb-2" />
      <h4 className="text-xl font-black uppercase tracking-tighter">{title}</h4>
      <p className="text-sm text-slate-500 font-medium leading-relaxed">{desc}</p>
   </div>
);

const NeuralStreamVisual = () => (
   <div className="w-full h-full p-20 flex flex-col gap-10 items-center justify-center">
      {[...Array(5)].map((_, i) => (
         <motion.div
            key={i}
            initial={{ width: 0, opacity: 0 }}
            whileInView={{ width: '100%', opacity: 1 }}
            transition={{ duration: 1.5, delay: i * 0.1, ease: "circOut" }}
            className="h-2 bg-slate-50 rounded-full relative overflow-hidden"
         >
            <motion.div 
               animate={{ x: ['100%', '-100%'] }}
               transition={{ duration: 3, repeat: Infinity, delay: i * 0.5, ease: "linear" }}
               className="absolute top-0 bottom-0 w-24 bg-indigo-600/20 blur-sm rounded-full"
            />
         </motion.div>
      ))}
      <span className="text-[10px] font-black text-slate-200 uppercase tracking-[1em] mt-8">DATA_INTELLIGENCE_FLOW</span>
   </div>
);

const WorkflowNode = ({ step, label, desc, accent }) => (
   <motion.div 
      whileHover={{ scale: 1.05 }}
      className="text-center group flex-1"
   >
      <div className={`text-[10px] font-black uppercase tracking-[0.5em] mb-4 ${accent ? 'text-indigo-600' : 'text-slate-300'}`}>Step_{step}</div>
      <div className="space-y-2">
         <h4 className={`text-4xl font-black tracking-tighter uppercase ${accent ? 'text-slate-950' : 'text-slate-300'}`}>{label}</h4>
         <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{desc}</p>
      </div>
   </motion.div>
);

export default ProductDeepDive;
