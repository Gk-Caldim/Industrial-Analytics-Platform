import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import ReactECharts from 'echarts-for-react';
import { Activity, Shield, Zap, Cpu, Layers, Users, Package, FileSpreadsheet } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

const OperationalCore = () => {
   const containerRef = useRef(null);
   const coreRef = useRef(null);
   const leftPanelRef = useRef(null);

   useEffect(() => {
      const ctx = gsap.context(() => {
         // Entry Animation
         gsap.from(coreRef.current, {
            scrollTrigger: {
               trigger: containerRef.current,
               start: "top center",
               end: "bottom center",
               scrub: 1,
            },
            scale: 0.9,
            opacity: 0,
            y: 50,
            transformPerspective: 1000,
         });

         gsap.from(leftPanelRef.current, {
            scrollTrigger: {
               trigger: containerRef.current,
               start: "top 80%",
               end: "top 40%",
               scrub: 0.5,
            },
            x: -40,
            opacity: 0,
            filter: 'blur(8px)',
         });
      }, containerRef);

      return () => ctx.revert();
   }, []);

   const chartOption = {
      backgroundColor: 'transparent',
      tooltip: { 
         trigger: 'axis',
         backgroundColor: 'rgba(255, 255, 255, 0.9)',
         borderColor: '#e2e8f0',
         textStyle: { color: '#0f172a' }
      },
      grid: { left: '3%', right: '4%', bottom: '3%', top: '10%', containLabel: true },
      xAxis: {
         type: 'category',
         boundaryGap: false,
         data: ['Phase 1', 'Phase 2', 'Phase 3', 'Phase 4', 'Phase 5', 'Final'],
         axisLine: { lineStyle: { color: '#e2e8f0' } },
         axisTick: { show: false },
         axisLabel: { color: '#64748b', fontSize: 10, fontWeight: 700 }
      },
      yAxis: {
         type: 'value',
         splitLine: { lineStyle: { color: '#f1f5f9' } },
         axisLine: { show: false },
         axisLabel: { color: '#64748b', fontSize: 10, fontWeight: 700 }
      },
      series: [
         {
            name: 'Orchestration Accuracy',
            type: 'line',
            smooth: true,
            symbol: 'circle',
            symbolSize: 8,
            data: [82, 88, 94, 91, 98, 99.9],
            lineStyle: { color: '#4f46e5', width: 4 },
            itemStyle: { color: '#4f46e5', borderColor: '#fff', borderWidth: 2 },
            areaStyle: {
               color: {
                  type: 'linear',
                  x: 0, y: 0, x2: 0, y2: 1,
                  colorStops: [{ offset: 0, color: 'rgba(79, 70, 229, 0.1)' }, { offset: 1, color: 'rgba(79, 70, 229, 0)' }]
               }
            }
         }
      ]
   };

   return (
      <div ref={containerRef} className="min-h-screen w-full flex items-center justify-center bg-white py-40 overflow-hidden relative">
         {/* VOLUMETRIC WHITE CANVAS - SUBTLE MESH */}
         <div className="absolute inset-0 z-0 pointer-events-none">
            <div className="absolute top-[10%] right-[10%] w-[50%] h-[50%] bg-[radial-gradient(circle_at_center,rgba(79,70,229,0.04)_0%,transparent_70%)] blur-[100px]" />
            <div className="absolute bottom-[10%] left-[10%] w-[50%] h-[50%] bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.04)_0%,transparent_70%)] blur-[100px]" />
         </div>

         <div className="max-w-7xl w-full px-12 grid grid-cols-1 lg:grid-cols-12 gap-24 relative z-10">
            {/* Left Panel: High-Authority Copy */}
            <div ref={leftPanelRef} className="lg:col-span-4 space-y-16 flex flex-col justify-center">
               <div className="space-y-8 text-slate-950">
                  <div className="inline-flex items-center gap-3 px-5 py-2 bg-slate-50 border border-slate-100 rounded-full text-indigo-600 text-[10px] font-black uppercase tracking-[0.3em]">
                     <Activity className="w-3 h-3" />
                     SYSTEM_ACTIVE // V4.2
                  </div>
                  <h2 className="font-outfit text-6xl md:text-8xl font-black tracking-tighter leading-[0.82] uppercase">
                     THE CLARITY <br /> <span className="text-slate-200">ENGINE.</span>
                  </h2>
                  <p className="text-slate-500 text-lg md:text-xl font-medium leading-relaxed max-w-sm">
                     Absolute synchronization across every industrial touchpoint. No dummy data—just raw technical precision.
                  </p>
               </div>

               <div className="grid grid-cols-1 gap-10">
                  <ModuleFocus icon={<Layers />} title="Project Master" desc="Orchestrate multi-facility project lifecycles with real-time milestone tracking." />
                  <ModuleFocus icon={<Users />} title="Department Hub" desc="Manage organizational hierarchy and granular employee access control." />
                  <ModuleFocus icon={<Package />} title="Part Inventory" desc="Synchronized specification tracking for high-load manufacturing." />
               </div>
            </div>

            {/* Right Panel: The High-Key Visual Core */}
            <div ref={coreRef} className="lg:col-span-8">
               <div className="bg-white/40 backdrop-blur-3xl border border-slate-100 rounded-[4rem] p-6 md:p-16 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.04)] relative overflow-hidden group">
                  <div className="relative z-10 space-y-16">
                     <div className="flex items-center justify-between border-b border-slate-50 pb-12">
                        <div className="flex items-center gap-8">
                           <div className="w-16 h-16 bg-slate-950 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-500/10">
                              <Cpu className="w-8 h-8" />
                           </div>
                           <div>
                              <h3 className="font-outfit text-3xl font-black text-slate-950 uppercase tracking-tighter">Operational Overview</h3>
                              <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.4em] mt-2">Core_Integrity // SECURE_SYNC</p>
                           </div>
                        </div>
                        <div className="hidden md:block px-8 py-4 bg-slate-50 rounded-full border border-slate-100 text-slate-400 text-[10px] font-black uppercase tracking-[0.5em]">
                           PROD_READY
                        </div>
                     </div>

                     <div className="h-[450px] w-full">
                        <ReactECharts option={chartOption} style={{ height: '100%' }} />
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                        <ProjectMetric label="EXCEL_SYNC" value="Native Handsontable Integration" icon={<FileSpreadsheet className="w-5 h-5" />} />
                        <ProjectMetric label="SECURITY_PROTOCOL" value="Argon2 Hardened Credentialing" icon={<Shield className="w-5 h-5" />} />
                     </div>
                  </div>
               </div>
            </div>
         </div>
      </div>
   );
};

const ModuleFocus = ({ icon, title, desc }) => (
   <div className="flex items-start gap-6 group">
      <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-slate-950 group-hover:text-white transition-all duration-700 shadow-sm">
         {React.cloneElement(icon, { size: 24 })}
      </div>
      <div>
         <h4 className="font-outfit text-xl font-black text-slate-950 uppercase tracking-tight mb-2">{title}</h4>
         <p className="text-slate-400 text-sm font-medium leading-relaxed max-w-xs">{desc}</p>
      </div>
   </div>
);

const ProjectMetric = ({ label, value, icon }) => (
   <div className="p-8 bg-slate-50/50 border border-slate-100 rounded-[2.5rem] group hover:bg-white hover:shadow-xl transition-all duration-700">
      <div className="text-indigo-600 mb-6">{icon}</div>
      <div className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em] mb-2">{label}</div>
      <div className="text-lg font-black text-slate-950 font-outfit tracking-tight">{value}</div>
   </div>
);

export default OperationalCore;
