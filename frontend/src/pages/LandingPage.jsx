import React, { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useTransform, AnimatePresence, useSpring } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
   ArrowRight,
   Cpu,
   Layers,
   Package,
   Users,
   FileSpreadsheet,
   Activity,
   Table as TableIcon,
   BarChart3,
   PieChart,
   LineChart,
   Database
} from 'lucide-react';

const LandingPage = () => {
   const navigate = useNavigate();
   const { isAuthenticated } = useSelector((state) => state.auth);
   const containerRef = useRef(null);

   useEffect(() => {
      if (isAuthenticated) {
         navigate('/dashboard/projects');
      }
   }, [isAuthenticated, navigate]);

   return (
      <div ref={containerRef} className="min-h-screen bg-white text-slate-950 font-outfit selection:bg-indigo-600 selection:text-white relative overflow-x-hidden">
         {/* GOOGLE-STYLE INTELLIGENT CANVAS */}
         <div className="fixed inset-0 z-0 pointer-events-none">
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_40%,rgba(99,102,241,0.05)_0%,transparent_60%)]" />
            <div className="absolute top-[10%] left-[20%] w-[30%] h-[30%] bg-blue-500/5 blur-[120px] rounded-full" />
            <div className="absolute bottom-[20%] right-[10%] w-[40%] h-[40%] bg-indigo-500/5 blur-[150px] rounded-full" />
         </div>

         <Navbar onSignIn={() => navigate('/login')} />

         <main className="relative z-10">
            {/* 1. THE INTELLECTUAL HERO */}
            <section className="min-h-screen flex flex-col items-center justify-center px-12 pt-32 relative">
               <div className="max-w-6xl mx-auto text-center relative z-20">
                  <motion.div
                     initial={{ opacity: 0, scale: 0.9 }}
                     animate={{ opacity: 1, scale: 1 }}
                     transition={{ duration: 1.5, cubicBezier: [0.16, 1, 0.3, 1] }}
                     className="inline-flex items-center gap-2 px-5 py-2 rounded-full border border-slate-100 bg-white/80 backdrop-blur-xl text-indigo-600 text-[10px] font-black uppercase tracking-[0.5em] mb-16 shadow-xl shadow-indigo-500/5"
                  >
                     Intelligence_Core_v4.2
                  </motion.div>

                  <motion.h1
                     initial={{ opacity: 0, y: 40 }}
                     animate={{ opacity: 1, y: 0 }}
                     transition={{ duration: 1.8, delay: 0.2, cubicBezier: [0.16, 1, 0.3, 1] }}
                     className="text-7xl md:text-[13rem] font-black tracking-tighter leading-[0.8] mb-16 text-slate-950 uppercase"
                  >
                     INDUSTRIAL <br /> <span className="text-slate-200 mix-blend-multiply">ANALYTICS.</span>
                  </motion.h1>

                  <motion.p
                     initial={{ opacity: 0, y: 20 }}
                     animate={{ opacity: 1, y: 0 }}
                     transition={{ duration: 1.8, delay: 0.4 }}
                     className="text-xl md:text-3xl text-slate-400 max-w-3xl mx-auto mb-20 font-medium tracking-tight leading-normal"
                  >
                     Orchestrate high-fidelity industrial landscapes with predictive clarity and absolute synchronization.
                  </motion.p>

                  <motion.div
                     initial={{ opacity: 0, y: 20 }}
                     animate={{ opacity: 1, y: 0 }}
                     transition={{ duration: 1.5, delay: 0.6 }}
                     className="flex justify-center gap-8"
                  >
                     <button
                        onClick={() => navigate('/product')}
                        className="group px-14 py-8 bg-slate-950 text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.5em] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] hover:bg-indigo-600 transition-all duration-1000 flex items-center gap-6"
                     >
                        Explore Platform
                        <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center transition-transform group-hover:translate-x-1">
                           <ArrowRight size={14} />
                        </div>
                     </button>
                  </motion.div>
               </div>

               <div className="absolute inset-0 z-0 flex items-center justify-center overflow-hidden">
                  <FluidIntelligenceBackground />
               </div>
            </section>

            {/* 2. THE ORGANIC SHIFT: EXCEL CHAOS TO ECHARTS INTELLIGENCE */}
            <section className="py-80 px-12 bg-slate-50 relative overflow-hidden">
               <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-white to-transparent" />
               <div className="max-w-[1700px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-40 items-center">
                  <div className="space-y-16 lg:col-span-1 z-10">
                     <span className="text-[11px] font-black text-indigo-600 tracking-[0.5em] uppercase block">THE TRANSFORMATION</span>
                     <h2 className="text-6xl md:text-9xl font-black tracking-tighter uppercase leading-[0.85]">ORGANIZING <br /> THE <span className="text-slate-200 drop-shadow-sm">CHAOS.</span></h2>
                     <p className="text-2xl text-slate-400 font-medium max-w-xl leading-relaxed">
                        We resolve complex industrial data streams into an organic, structural grid of actionable Apache ECharts intelligence.
                     </p>
                  </div>
                  <div className="relative aspect-square lg:col-span-1 h-[800px] w-full">
                     <UltimateEChartsAnimation />
                  </div>
               </div>
            </section>

            {/* 3. UNFOLDING FEATURE SPACES */}
            <section className="py-60 px-12">
               <div className="max-w-7xl mx-auto space-y-60">
                  <UnfoldingSection
                     icon={<Layers className="text-indigo-600" />}
                     title="Project Trackers"
                     desc="Uploaded Trackers are transformed into reusable tables"
                     imagePlaceholder="PROJECT_TRACKER_PREVIEW"
                     src="/trackers.png"
                  />
                  <UnfoldingSection
                     reversed
                     icon={<Users className="text-indigo-600" />}
                     title="Employee Accesss"
                     desc="Hardened access enabling selected modules for users as per management criteria"
                     imagePlaceholder="STAFF_ACCESS_PREVIEW"
                     src="/employee-access.png"
                  />
                  <UnfoldingSection
                     icon={<Package className="text-indigo-600" />}
                     title="Analytics with real time Sync"
                     desc="Precise data mapping and visual analytics"
                     imagePlaceholder="INVENTORY_PROTOCOL_PREVIEW"
                     src="/analytics.png"
                  />
               </div>
            </section>

            {/* 4. FINAL EVOLUTION */}
            <section className="py-80 text-center relative overflow-hidden bg-slate-950 text-white rounded-[6rem] mx-8 mb-8">
               <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.1),transparent_70%)] opacity-30" />
               <div className="max-w-7xl mx-auto relative z-10 space-y-24">
                  <h2 className="text-6xl md:text-[14rem] font-black tracking-tighter uppercase leading-[0.7]">INITIALIZE <br /> <span className="text-white/20 italic">PLATFORM.</span></h2>
                  <button
                     onClick={() => navigate('/product')}
                     className="px-24 py-11 bg-white text-slate-950 rounded-full font-black text-xs uppercase tracking-[0.8em] shadow-2xl hover:scale-105 active:scale-95 transition-all duration-700"
                  >
                     Explore Platform
                  </button>
               </div>
            </section>
         </main>

         <footer className="py-24 bg-white px-12 text-center relative z-20">
            <div className="max-w-[1600px] mx-auto flex flex-col items-center gap-10">
               <div className="flex flex-col items-center gap-4">
                  <div className="w-12 h-12 bg-slate-950 rounded-[1.2rem] flex items-center justify-center shadow-indigo-500/10 shadow-xl">
                     <div className="w-2.5 h-2.5 bg-white rounded-full transition-transform" />
                  </div>
                  <span className="text-3xl font-black text-slate-950 tracking-tighter uppercase">INDUSSYNC</span>
               </div>
               <div className="text-slate-200 text-[10px] font-black uppercase tracking-[0.8em] mt-8">
                  © 2026 INDUSTRIAL CONTEXT HUB // ALL RIGHTS SECURED
               </div>
            </div>
         </footer>
      </div>
   );
};

const Navbar = ({ onSignIn }) => (
   <nav className="fixed top-0 left-0 right-0 z-[100] px-12 py-12 flex items-center justify-between pointer-events-none">
      <div
         className="flex items-center gap-5 pointer-events-auto bg-white/60 backdrop-blur-3xl px-7 py-3.5 rounded-[1.8rem] border border-slate-100 shadow-sm transition-all hover:bg-white cursor-pointer"
         onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      >
         <div className="w-10 h-10 bg-slate-950 rounded-xl flex items-center justify-center shadow-lg">
            <div className="w-2 h-2 bg-white rounded-full translate-x-[-0.2rem] translate-y-[-0.2rem]" />
         </div>
         <span className="text-2xl font-black text-slate-950 tracking-tighter uppercase">INDUSSYNC</span>
      </div>
      <button
         onClick={onSignIn}
         className="pointer-events-auto px-14 py-4 bg-slate-950 text-white rounded-full text-[10px] font-black uppercase tracking-[0.5em] hover:bg-indigo-600 transition-all shadow-xl hover:scale-105 active:scale-95"
      >
         Access
      </button>
   </nav>
);

const FluidIntelligenceBackground = () => (
   <motion.div
      animate={{
         scale: [1, 1.1, 1],
         rotate: [0, 5, -5, 0],
         opacity: [0.3, 0.4, 0.3]
      }}
      transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
      className="w-[1000px] h-[1000px] rounded-full bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.08),transparent_70%)] blur-[100px]"
   />
);

// --- ULTIMATE ECHARTS ANIMATION COMPONENTS ---

const UltimateEChartsAnimation = () => {
   // 0 = Chaos, 1 = Core Materialization, 2 = ECharts Dashboard
   const [phase, setPhase] = useState(0);

   useEffect(() => {
      let isMounted = true;
      const runSequence = async () => {
         while (isMounted) {
            setPhase(0);
            await new Promise(r => setTimeout(r, 4500)); // Show Chaos
            if (!isMounted) break;
            setPhase(1);
            await new Promise(r => setTimeout(r, 1500)); // The Implosion
            if (!isMounted) break;
            setPhase(2);
            await new Promise(r => setTimeout(r, 7000)); // The ECharts Dashboard Reveal
         }
      };
      runSequence();
      return () => { isMounted = false; };
   }, []);

   return (
      <div className="w-full h-full p-2 bg-white rounded-[5rem] shadow-2xl border border-slate-100 flex items-center justify-center overflow-hidden relative">
         <AnimatePresence mode="wait">
            {phase === 0 && <ChaosPhase key="chaos" />}
            {phase === 1 && <CorePhase key="core" />}
            {phase === 2 && <EChartsDashboardPhase key="dashboard" />}
         </AnimatePresence>
      </div>
   );
};

const ChaosPhase = () => (
   <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.2, filter: 'blur(10px)' }}
      transition={{ duration: 0.8 }}
      className="absolute inset-0 flex items-center justify-center"
   >
      {[...Array(30)].map((_, i) => (
         <motion.div
            key={i}
            initial={{
               x: Math.random() * 600 - 300,
               y: Math.random() * 600 - 300,
               rotate: Math.random() * 360,
               opacity: 0,
               scale: Math.random() * 0.5 + 0.3
            }}
            animate={{
               x: Math.random() * 600 - 300,
               y: Math.random() * 600 - 300,
               rotate: Math.random() * 360,
               opacity: 0.5 + Math.random() * 0.3
            }}
            transition={{ duration: 4, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
            className="absolute p-3 flex flex-col gap-2 bg-emerald-50 rounded-md border border-emerald-100 shadow-sm"
         >
            <div className="flex items-center gap-2 border-b border-emerald-100 pb-2">
               <FileSpreadsheet className="text-emerald-500" size={14} />
               <div className="w-12 h-1 bg-emerald-200 rounded-full" />
            </div>
            <div className="flex gap-1">
               {[...Array(3)].map((_, j) => (
                  <div key={j} className="w-4 h-4 bg-emerald-100 rounded-sm" />
               ))}
            </div>
            <div className="flex gap-1">
               {[...Array(3)].map((_, j) => (
                  <div key={j} className="w-4 h-4 bg-emerald-100/50 rounded-sm" />
               ))}
            </div>
         </motion.div>
      ))}
      <motion.div
         animate={{ opacity: [0.1, 0.2, 0.1] }}
         transition={{ duration: 2, repeat: Infinity }}
         className="text-emerald-600 font-black text-[12rem] uppercase tracking-tighter absolute select-none pointer-events-none opacity-10"
      >
         CHAOS
      </motion.div>
   </motion.div>
);

const CorePhase = () => (
   <motion.div
      initial={{ scale: 0.5, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 5, opacity: 0, filter: 'blur(20px)' }}
      transition={{ duration: 0.8, ease: "anticipate" }}
      className="absolute inset-0 flex items-center justify-center"
   >
      <div className="w-32 h-32 bg-indigo-600 rounded-full flex items-center justify-center shadow-[0_0_100px_rgba(79,70,229,0.5)]">
         <Cpu className="text-white animate-pulse" size={40} />
      </div>
   </motion.div>
);

const EChartsDashboardPhase = () => (
   <motion.div
      initial={{ scale: 0.8, opacity: 0, filter: 'blur(10px)' }}
      animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
      exit={{ opacity: 0, filter: 'blur(10px)' }}
      transition={{ duration: 1.2, cubicBezier: [0.16, 1, 0.3, 1] }}
      className="absolute inset-0 p-8 flex flex-col gap-6 bg-slate-50"
   >
      <div className="w-full flex justify-between items-center bg-white px-6 py-4 rounded-2xl shadow-sm border border-slate-100">
         <div className="flex items-center gap-3">
            <Activity className="text-indigo-600" size={20} />
            <span className="text-xs font-black uppercase tracking-[0.3em] text-slate-950">Analytics Core</span>
         </div>
         <div className="flex gap-2">
            {[...Array(3)].map((_, i) => (
               <div key={i} className="w-2 h-2 bg-slate-200 rounded-full" />
            ))}
         </div>
      </div>

      {/* DASHBOARD GRID */}
      <div className="flex-1 grid grid-cols-3 gap-6">
         {/* LEFT: DONUT & BAR (ECHARTS REPLICAS) */}
         <div className="col-span-1 flex flex-col gap-6">
            {/* ECHARTS DONUT */}
            <div className="flex-1 bg-white rounded-3xl shadow-sm border border-slate-100 p-6 flex flex-col">
               <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 inline-block">Resource Allocation</span>
               <div className="flex-1 relative flex items-center justify-center">
                  <EChartsDonut />
               </div>
            </div>
            {/* ECHARTS BAR */}
            <div className="flex-1 bg-white rounded-3xl shadow-sm border border-slate-100 p-6 flex flex-col">
               <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 inline-block">Sync Volume</span>
               <div className="flex-1 relative">
                  <EChartsBar />
               </div>
            </div>
         </div>

         {/* RIGHT: SMOOTH LINE & DATA GRID */}
         <div className="col-span-2 flex flex-col gap-6">
            {/* ECHARTS SMOOTH AREA LINE */}
            <div className="flex-[2] bg-white rounded-3xl shadow-sm border border-slate-100 p-6 flex flex-col">
               <div className="flex justify-between items-center mb-6">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Yield Prediction (Smooth)</span>
                  <div className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[8px] font-black uppercase tracking-widest">+24.5%</div>
               </div>
               <div className="flex-1 relative">
                  <EChartsSmoothLine />
               </div>
            </div>
            {/* ECHARTS/HANDSONTABLE DATA GRID */}
            <div className="flex-1 bg-white rounded-3xl shadow-sm border border-slate-100 p-6 overflow-hidden flex flex-col">
               <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 inline-block">Active Nodes</span>
               <div className="flex-1 flex flex-col gap-2">
                  <div className="grid grid-cols-4 gap-4 px-2 py-1 border-b border-slate-100">
                     {['ID', 'Status', 'Load', 'Ping'].map(h => (
                        <span key={h} className="text-[8px] font-black uppercase tracking-widest text-slate-300">{h}</span>
                     ))}
                  </div>
                  {[...Array(3)].map((_, i) => (
                     <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 1 + i * 0.1 }}
                        className="grid grid-cols-4 gap-4 px-2 py-2 bg-slate-50/50 rounded-lg"
                     >
                        <span className="text-[10px] font-bold text-slate-500">#{3401 + i}</span>
                        <div className="flex items-center gap-2">
                           <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                           <span className="text-[10px] font-bold text-slate-600">Sync</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-1.5 mt-1">
                           <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${60 + Math.random() * 30}%` }}
                              transition={{ duration: 1, delay: 1.2 + i * 0.1 }}
                              className="bg-indigo-500 h-full rounded-full"
                           />
                        </div>
                        <span className="text-[10px] font-bold text-slate-500">{12 + i * 4}ms</span>
                     </motion.div>
                  ))}
               </div>
            </div>
         </div>
      </div>

      <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden z-0">
         <div className="text-indigo-600/5 font-black text-[10rem] uppercase tracking-[0.2em] select-none">CENTRALIZED</div>
      </div>
   </motion.div>
);

const EChartsDonut = () => {
   // Typical ECharts default palette
   const colors = ['#5470c6', '#91cc75', '#fac858', '#ee6666'];
   return (
      <svg viewBox="0 0 100 100" className="w-[80%] h-[80%] -rotate-90 origin-center drop-shadow-md">
         {colors.map((color, i) => (
            <motion.circle
               key={color}
               cx="50"
               cy="50"
               r="35"
               fill="transparent"
               stroke={color}
               strokeWidth="15"
               strokeLinecap="round"
               strokeDasharray={`${30 + i * 15} 250`}
               strokeDashoffset={`-${i * 50}`}
               initial={{ pathLength: 0, opacity: 0 }}
               animate={{ pathLength: 1, opacity: 1 }}
               transition={{ duration: 1.5, delay: 0.5 + i * 0.2, type: "spring" }}
            />
         ))}
         <motion.circle
            cx="50" cy="50" r="20" fill="#fff"
            initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1.5 }}
            className="shadow-inner"
         />
      </svg>
   );
};

const EChartsBar = () => {
   return (
      <div className="w-full h-full flex items-end gap-2 px-2 pb-6 border-b border-l border-slate-100 relative">
         {/* Fake Y-Axis labels */}
         <div className="absolute -left-4 inset-y-0 flex flex-col justify-between py-2 text-[6px] text-slate-300 font-bold">
            <span>100</span><span>50</span><span>0</span>
         </div>
         {/* Bars */}
         {[40, 70, 45, 90, 60, 80].map((val, i) => (
            <div key={i} className="flex-1 flex flex-col justify-end items-center h-full group">
               <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${val}%` }}
                  transition={{ duration: 1, delay: 0.8 + i * 0.1, type: "spring" }}
                  className="w-full bg-[#5470c6] rounded-t-sm relative"
               >
                  <motion.div
                     initial={{ opacity: 0 }}
                     animate={{ opacity: 1 }}
                     transition={{ delay: 2 + i * 0.1 }}
                     className="absolute -top-4 w-full text-center text-[6px] font-bold text-slate-400"
                  >
                     {val}
                  </motion.div>
               </motion.div>
               <span className="absolute -bottom-4 text-[6px] font-bold text-slate-300">T{i + 1}</span>
            </div>
         ))}
         {/* Fake X Grid lines */}
         <div className="absolute inset-0 pointer-events-none border-b border-t border-slate-50 border-dashed" style={{ height: '50%', top: '25%' }} />
      </div>
   );
};

const EChartsSmoothLine = () => {
   return (
      <div className="w-full h-full border-b border-l border-slate-100 relative overflow-hidden">
         {/* Grid Lines */}
         {[...Array(4)].map((_, i) => (
            <div key={i} className="absolute w-full border-t border-slate-100 border-dashed" style={{ top: `${(i + 1) * 20}%` }} />
         ))}

         {/* Data Path */}
         <svg viewBox="0 0 100 50" className="w-full h-full absolute inset-0 preserve-3d" preserveAspectRatio="none">
            <defs>
               <linearGradient id="areaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#91cc75" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#91cc75" stopOpacity="0" />
               </linearGradient>
            </defs>
            {/* Area Fill */}
            <motion.path
               d="M 0 40 C 20 40, 20 10, 40 10 C 60 10, 60 30, 80 20 C 90 15, 95 5, 100 5 L 100 50 L 0 50 Z"
               fill="url(#areaGrad)"
               initial={{ opacity: 0, y: 50 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ duration: 1.5, delay: 1.2 }}
            />
            {/* Line Stroke */}
            <motion.path
               d="M 0 40 C 20 40, 20 10, 40 10 C 60 10, 60 30, 80 20 C 90 15, 95 5, 100 5"
               fill="none"
               stroke="#91cc75"
               strokeWidth="2"
               strokeLinecap="round"
               initial={{ pathLength: 0 }}
               animate={{ pathLength: 1 }}
               transition={{ duration: 2, delay: 0.8, ease: "easeInOut" }}
            />
            {/* Data Points */}
            {[
               { cx: "40", cy: "10" },
               { cx: "80", cy: "20" },
               { cx: "100", cy: "5" },
            ].map((p, i) => (
               <motion.circle
                  key={i}
                  cx={p.cx} cy={p.cy} r="2" fill="#fff" stroke="#91cc75" strokeWidth="1"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 2.5 + i * 0.2 }}
               />
            ))}
         </svg>

         {/* Tooltip Simulation */}
         <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 4, repeat: Infinity, delay: 3 }}
            className="absolute top-2 left-[38%] bg-slate-950 text-white rounded px-2 py-1 text-[8px] font-bold shadow-lg z-20"
         >
            Peak: 95%
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-950 rotate-45" />
         </motion.div>
         {/* Tooltip Axis Line */}
         <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 4, repeat: Infinity, delay: 3 }}
            className="absolute top-0 bottom-0 left-[40%] w-px bg-slate-300 border-dashed z-10"
         />
      </div>
   );
};

const UnfoldingSection = ({ icon, title, desc, imagePlaceholder, reversed, src }) => (
   <motion.div
      initial={{ opacity: 0, y: 100 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 1.5, cubicBezier: [0.16, 1, 0.3, 1] }}
      className={`grid grid-cols-1 lg:grid-cols-2 gap-32 items-center ${reversed ? 'lg:flex-row-reverse' : ''}`}
   >
      <div className={`space-y-12 ${reversed ? 'lg:order-last' : ''}`}>
         <div className="w-16 h-16 bg-indigo-50 rounded-[1.5rem] flex items-center justify-center shadow-inner">
            {React.cloneElement(icon, { size: 28 })}
         </div>
         <h3 className="text-5xl md:text-7xl font-black tracking-tighter uppercase leading-none">{title}</h3>
         <p className="text-2xl text-slate-400 font-medium leading-relaxed uppercase tracking-tight">{desc}</p>
      </div>
      <div className="relative aspect-video group w-full perspective-[2000px]">
         {/* Animated Background Blobs for Glass Effect */}
         <motion.div
            animate={{
               scale: [1, 1.2, 1],
               x: [0, 50, 0],
               y: [0, -30, 0]
            }}
            transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-[-20%] left-[-10%] w-72 h-72 bg-indigo-500/20 rounded-full blur-[80px]"
         />
         <motion.div
            animate={{
               scale: [1, 1.3, 1],
               x: [0, -40, 0],
               y: [0, 40, 0]
            }}
            transition={{ duration: 20, repeat: Infinity, ease: "easeInOut", delay: 2 }}
            className="absolute bottom-[-10%] right-[-10%] w-80 h-80 bg-blue-400/10 rounded-full blur-[80px]"
         />

         {/* Glass Card Container */}
         <motion.div
            whileHover={{ scale: 1.02, rotateY: reversed ? -4 : 4, rotateX: 2 }}
            transition={{ duration: 0.8, type: "spring", bounce: 0.4 }}
            className="w-full h-full rounded-[4rem] border border-white/60 bg-white/40 backdrop-blur-3xl shadow-[0_30px_60px_-15px_rgba(0,0,0,0.05)] relative flex items-center justify-center p-3 z-10"
         >
            {/* Inner Content Area */}
            <div className="w-full h-full rounded-[3.2rem] overflow-hidden bg-slate-50/50 border border-white/80 relative flex items-center justify-center">
               {src ? (
                  <img src={src} alt={title} className="w-full h-full object-cover object-top shadow-inner hover:scale-105 transition-transform duration-1000" />
               ) : (
                  <>
                     <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000 z-10" />
                     <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.8em] relative z-20 text-center px-4">{imagePlaceholder}</span>
                  </>
               )}
            </div>
         </motion.div>
      </div>
   </motion.div>
);

export default LandingPage;
