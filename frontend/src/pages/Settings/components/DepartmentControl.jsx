import React, { useState } from 'react';
import { 
  Building2, Users, Shield, ChevronRight, CheckCircle2, Circle, Search, Plus, 
  LayoutDashboard, FileText, Settings, Briefcase, Info, AlertCircle, Save, X
} from 'lucide-react';

const DepartmentControl = () => {
  const [selectedDept, setSelectedDept] = useState('Production');
  
  const departments = [
    { 
      name: 'Production', 
      head: 'Rajesh Kumar', 
      staff: 156, 
      icon: Building2, 
      description: 'Main manufacturing and assembly floor operations.',
      active: true 
    },
    { 
      name: 'Quality Assurance', 
      head: 'Anjali Sharma', 
      staff: 34, 
      icon: Shield, 
      description: 'Standard compliance and product testing protocols.' 
    },
    { 
      name: 'Logistics', 
      head: 'Suresh Raina', 
      staff: 82, 
      icon: Briefcase, 
      description: 'Supply chain management and warehouse operations.' 
    },
    { 
      name: 'Maintenance', 
      head: 'Vikram Singh', 
      staff: 28, 
      icon: Settings, 
      description: 'Equipment upkeep and facility technical support.' 
    },
  ];

  const deptSettings = [
    {
      id: 'operational',
      label: 'OPERATIONAL PARAMETERS',
      configs: [
        { name: 'Shift Rotation Policy', description: 'Define how employee shifts are cycled weekly', value: '3-Shift System', type: 'select' },
        { name: 'Overtime Allowance', description: 'Maximum overtime hours permitted per worker/month', value: '40 Hours', type: 'text' },
      ]
    },
    {
      id: 'access',
      label: 'DEPARTMENT ACCESS',
      configs: [
        { name: 'Restricted Zone Access', description: 'Digital key access for high-security floor areas', enabled: true, type: 'toggle' },
        { name: 'External Vendor Entry', description: 'Allow third-party contractors to log in via terminal', enabled: false, type: 'toggle' },
      ]
    }
  ];

  const Toggle = ({ enabled, onChange, disabled }) => (
    <button 
      onClick={() => !disabled && onChange && onChange(!enabled)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
        enabled ? 'bg-[#1E3A8A]' : 'bg-slate-200'
      } ${disabled ? 'opacity-30 cursor-not-allowed' : ''}`}
    >
      <span
        aria-hidden="true"
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          enabled ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-bold text-[#1E293B]">Department Control</h2>
        </div>
        <button className="flex items-center gap-2 h-12 px-6 bg-[#1E3A8A] text-white rounded-xl font-bold text-sm hover:bg-[#1e2e6b] transition-all shadow-lg active:scale-95">
          <Plus className="h-4 w-4" />
          Add New Department
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Department List */}
        <div className="lg:col-span-4 space-y-6">
           <div className="flex items-center justify-between px-2">
              <h3 className="text-sm font-bold text-slate-800">Active Departments</h3>
              <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md text-[10px] font-black">{departments.length} Units</span>
           </div>
           
           <div className="space-y-4">
              {departments.map((dept) => (
                <button
                  key={dept.name}
                  onClick={() => setSelectedDept(dept.name)}
                  className={`w-full text-left p-6 rounded-2xl border transition-all relative overflow-hidden group ${
                    selectedDept === dept.name 
                    ? 'bg-white border-[#1E3A8A] shadow-xl shadow-indigo-100/50' 
                    : 'bg-white/50 border-slate-100 hover:border-slate-200 hover:bg-white'
                  }`}
                >
                  {selectedDept === dept.name && (
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#1E3A8A]" />
                  )}
                  
                  <div className="flex items-start gap-4">
                     <div className={`p-3 rounded-xl shadow-sm border ${
                        selectedDept === dept.name ? 'bg-indigo-50 border-indigo-100 text-indigo-600' : 'bg-slate-100 border-slate-200 text-slate-400'
                     }`}>
                        <dept.icon className="h-5 w-5" />
                     </div>
                     <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                           <h4 className="text-base font-bold text-[#1E293B]">{dept.name}</h4>
                           {selectedDept === dept.name && (
                              <span className="text-[9px] font-black text-indigo-600 tracking-widest uppercase">Manage</span>
                           )}
                        </div>
                        <p className="text-xs text-slate-500 font-medium leading-relaxed mb-3">
                           Head: {dept.head}
                        </p>
                        <div className="flex items-center gap-2">
                           <Users className="h-3 w-3 text-slate-400" />
                           <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{dept.staff} Active Personnel</span>
                        </div>
                     </div>
                  </div>
                </button>
              ))}
           </div>
        </div>

        {/* Right Column: Configuration Dashboard */}
        <div className="lg:col-span-8 bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-[800px]">
           <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
              <div className="flex items-center gap-6">
                 <div className="w-14 h-14 bg-[#1E3A8A] rounded-2xl flex items-center justify-center text-white shadow-lg">
                    <Building2 className="h-6 w-6" />
                 </div>
                 <div>
                    <h3 className="text-xl font-bold text-[#1E293B]">{selectedDept} Configuration</h3>
                 </div>
              </div>
              <div className="flex items-center gap-3">
                 <button className="h-12 px-6 bg-[#1E3A8A] text-white rounded-xl font-bold text-xs shadow-lg shadow-indigo-100 hover:bg-[#1e2e6b] transition-all">Save Config</button>
              </div>
           </div>

           <div className="p-8 space-y-12">
              {deptSettings.map((group) => (
                <div key={group.id} className="space-y-6">
                   <div className="flex items-center gap-4">
                      <h4 className="text-[11px] font-black text-slate-400 tracking-[0.2em]">{group.label}</h4>
                      <div className="flex-1 h-px bg-slate-100" />
                   </div>

                   <div className="space-y-4">
                      {group.configs.map((config) => (
                        <div 
                          key={config.name} 
                          className="p-6 rounded-2xl border border-slate-100 bg-[#F8FAFC]/50 hover:bg-white hover:border-slate-200 transition-all"
                        >
                           <div className="flex items-start justify-between gap-6">
                              <div className="flex-1 space-y-2">
                                 <h5 className="text-[15px] font-bold text-[#1E293B]">{config.name}</h5>
                                 <p className="text-xs text-slate-500 font-medium leading-relaxed">
                                    {config.description}
                                 </p>
                              </div>
                              
                              {config.type === 'toggle' ? (
                                <Toggle enabled={config.enabled} />
                              ) : (
                                <div className="w-48">
                                   <input 
                                     type="text" 
                                     defaultValue={config.value}
                                     className="w-full h-10 px-4 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all"
                                   />
                                </div>
                              )}
                           </div>
                        </div>
                      ))}
                   </div>
                </div>
              ))}
           </div>

           <div className="mt-auto p-8 bg-slate-50/50 border-t border-slate-100">
              <div className="flex items-center justify-center gap-2">
                 <Info className="h-3 w-3 text-indigo-400" />
                 <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                    Changes here affect all personnel assigned to the {selectedDept} department.
                 </p>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default DepartmentControl;
