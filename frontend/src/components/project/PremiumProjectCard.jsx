import React from 'react';
import { ArrowRight, Layout, Database } from 'lucide-react';

const PremiumProjectCard = ({ project, onClick, isFeatured }) => {
  const subModulesCount = project.submodules ? project.submodules.length : 0;
  const isConfigured = !!project.dashboardConfig;
  const status = project.status || 'Active';

  const code = project.code ?? project.name.substring(0, 4).toUpperCase();
  
  // Randomize a few high-quality Unsplash industrial images deterministically based on the project code
  const imgOptions = [
    "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?q=80&w=600&auto=format&fit=crop", // laboratory/industrial
    "https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?q=80&w=600&auto=format&fit=crop", // factory robot
    "https://images.unsplash.com/photo-1565439390164-98abe1882d33?q=80&w=600&auto=format&fit=crop"  // industrial pipes
  ];
  const hash = code.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const bgImage = imgOptions[hash % imgOptions.length];

  return (
    <div 
      onClick={() => onClick(project.id)}
      className="group flex flex-col bg-white rounded-xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer relative"
    >
      {/* Feature highlight strip */}
      {isFeatured && <div className="absolute top-0 left-0 w-full h-1 bg-blue-600 z-20"></div>}

      {/* Top Banner Image with gradient mask */}
      <div className="h-40 w-full relative overflow-hidden bg-slate-900">
        <img 
          src={bgImage} 
          alt="Facility background" 
          className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:scale-105 group-hover:opacity-80 transition-all duration-500" 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent"></div>
        
        {/* Status Label on image */}
        <div className="absolute top-4 right-4 bg-white/10 backdrop-blur-md border border-white/20 text-white text-[10px] font-bold px-2 py-1 uppercase tracking-widest rounded">
          {status}
        </div>

        {/* Project Initial Icon Overlay */}
        <div className="absolute bottom-4 left-4 bg-white p-2 rounded-lg shadow-lg flex items-center justify-center font-mono font-black text-xl text-slate-800 border-2 border-white/50 w-12 h-12">
          {code.substring(0, 2)}
        </div>
      </div>

      {/* Main Content Body */}
      <div className="p-5 flex-1 flex flex-col">
        <h3 className="text-lg font-bold text-slate-800 m-0 truncate mb-1 pr-2">{project.name}</h3>
        <p className="text-xs font-mono font-medium text-slate-400 mb-5">{code}</p>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-4 mt-auto mb-5">
           <div className="flex flex-col gap-1 p-3 bg-slate-50 rounded-lg border border-slate-100">
             <div className="flex items-center gap-1.5 text-slate-400">
               <Database size={14} />
               <span className="text-[10px] font-bold uppercase tracking-wider">Datasets</span>
             </div>
             <span className="text-lg font-bold text-slate-700 font-mono">{subModulesCount}</span>
           </div>
           
           <div className="flex flex-col gap-1 p-3 bg-slate-50 rounded-lg border border-slate-100">
             <div className="flex items-center gap-1.5 text-slate-400">
               <Layout size={14} />
               <span className="text-[10px] font-bold uppercase tracking-wider">Layout</span>
             </div>
             {isConfigured ? (
               <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 mt-1">
                 <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Ready
               </span>
             ) : (
               <span className="text-xs font-bold text-slate-400 flex items-center gap-1 mt-1">
                 <span className="w-1.5 h-1.5 rounded-full border border-slate-400"></span> Pending
               </span>
             )}
           </div>
        </div>

        {/* Action Button */}
        <button className="w-full py-2.5 px-4 bg-slate-800 text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2 group-hover:bg-blue-600 transition-colors">
          Access Workspace
          <ArrowRight size={16} className="transform group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
};

export default PremiumProjectCard;

