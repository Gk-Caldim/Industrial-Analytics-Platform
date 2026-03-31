import React, { useState } from 'react';
import { 
  Shield, UserCheck, Lock, ChevronRight, CheckCircle2, Circle, Search, Plus, Boxes, LayoutDashboard, 
  FileText, Settings, Users, ClipboardList, Briefcase, FileSearch, HelpCircle, Key, Activity, 
  Info, AlertCircle, Save, X, ToggleLeft, ToggleRight
} from 'lucide-react';

const AccessControl = () => {
  const [selectedRole, setSelectedRole] = useState('Admin');
  
  const roles = [
    { 
      name: 'Admin', 
      count: 12, 
      icon: Shield, 
      description: 'Full system configuration and master data oversight.',
      active: true 
    },
    { 
      name: 'Manager', 
      count: 45, 
      icon: UserCheck, 
      description: 'Operations planning, approvals, and report generation.' 
    },
    { 
      name: 'Field Engineer', 
      count: 128, 
      icon: Circle, 
      description: 'On-site telemetry access and maintenance logging.' 
    },
    { 
      name: 'Analyst', 
      count: 32, 
      icon: Circle, 
      description: 'Read-only access to datasets and visualization tools.' 
    },
  ];

  const permissionsGroups = [
    {
      id: 'dashboard',
      label: 'DASHBOARD & ANALYTICS',
      permissions: [
        { name: 'Project Dashboard', description: 'View real-time project metrics and KPIs', tags: ['VIEW', 'EXPORT'], enabled: true },
        { name: 'Industrial Telemetry', description: 'Detailed sensor data and equipment diagnostics', tags: ['VIEW', 'CONTROL'], enabled: true },
      ]
    },
    {
      id: 'masters',
      label: 'MASTERS DATA',
      permissions: [
        { name: 'Employee Master', description: 'Manage global staff records and assignments', tags: ['CREATE', 'EDIT', 'DELETE'], enabled: true },
      ]
    },
    {
      id: 'operations',
      label: 'OPERATIONS & BUDGET',
      permissions: [
        { name: 'Procurement Control', description: 'Manage POs and vendor selections', tags: ['PO Approvals', 'Vendor Select', 'Budget Override'], enabled: true, inline: true },
        { name: 'Fiscal Auditing', description: 'Internal financial audit trails', enabled: false, disabledLabel: 'MODULE DISABLED FOR THIS TIER' },
      ]
    },
    {
      id: 'security',
      label: 'SYSTEM & SECURITY',
      permissions: [
        { name: 'Global Permission Override', description: 'Allows the Admin to override any local site restrictions. Use with caution as this affects all connected nodes.', enabled: true, special: true },
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
          <h2 className="text-4xl font-bold text-[#1E293B]">Access Control</h2>
          <p className="text-slate-500 font-medium text-sm mt-1">Industrial Platform RBAC with module-level granularity</p>
        </div>
        <button className="flex items-center gap-2 h-12 px-6 bg-[#1E3A8A] text-white rounded-xl font-bold text-sm hover:bg-[#1e2e6b] transition-all shadow-lg active:scale-95">
          <Shield className="h-4 w-4" />
          Create Custom Role
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Available Roles */}
        <div className="lg:col-span-4 space-y-6">
           <div className="flex items-center justify-between px-2">
              <h3 className="text-sm font-bold text-slate-800">Available Roles</h3>
              <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md text-[10px] font-black">{roles.length} Total</span>
           </div>
           
           <div className="space-y-4">
              {roles.map((role) => (
                <button
                  key={role.name}
                  onClick={() => setSelectedRole(role.name)}
                  className={`w-full text-left p-6 rounded-2xl border transition-all relative overflow-hidden group ${
                    selectedRole === role.name 
                    ? 'bg-white border-[#1E3A8A] shadow-xl shadow-indigo-100/50' 
                    : 'bg-white/50 border-slate-100 hover:border-slate-200 hover:bg-white'
                  }`}
                >
                  {selectedRole === role.name && (
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#1E3A8A]" />
                  )}
                  
                  <div className="flex items-start gap-4">
                     <div className={`p-3 rounded-xl shadow-sm border ${
                        selectedRole === role.name ? 'bg-indigo-50 border-indigo-100 text-indigo-600' : 'bg-slate-100 border-slate-200 text-slate-400'
                     }`}>
                        <role.icon className="h-5 w-5" />
                     </div>
                     <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                           <h4 className="text-base font-bold text-[#1E293B]">{role.name}</h4>
                           {selectedRole === role.name && (
                              <span className="text-[9px] font-black text-indigo-600 tracking-widest uppercase">Active Selection</span>
                           )}
                        </div>
                        <p className="text-xs text-slate-500 font-medium leading-relaxed mb-3 pr-4">
                           {role.description}
                        </p>
                        <div className="flex items-center gap-2">
                           <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full" />
                           <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{role.count} Active Users</span>
                        </div>
                     </div>
                  </div>
                </button>
              ))}
           </div>
        </div>

        {/* Right Column: Permissions Dashboard */}
        <div className="lg:col-span-8 bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-[800px]">
           <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
              <div className="flex items-center gap-6">
                 <div className="w-14 h-14 bg-[#1E3A8A] rounded-2xl flex items-center justify-center text-white shadow-lg">
                    <Shield className="h-6 w-6" />
                 </div>
                 <div>
                    <h3 className="text-xl font-bold text-[#1E293B]">{selectedRole} Permissions</h3>
                    <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Configure granular module-level access for the selected role.</p>
                 </div>
              </div>
              <div className="flex items-center gap-3">
                 <button className="h-12 px-6 bg-slate-100 text-slate-600 rounded-xl font-bold text-xs hover:bg-slate-200 transition-all">Discard</button>
                 <button className="h-12 px-6 bg-[#1E3A8A] text-white rounded-xl font-bold text-xs shadow-lg shadow-indigo-100 hover:bg-[#1e2e6b] transition-all">Save Changes</button>
              </div>
           </div>

           <div className="p-8 space-y-12">
              {permissionsGroups.map((group) => (
                <div key={group.id} className="space-y-6">
                   <div className="flex items-center gap-4">
                      <div className="p-2 bg-slate-100 rounded-lg text-slate-500">
                         {group.id === 'dashboard' ? <LayoutDashboard className="h-4 w-4" /> : 
                          group.id === 'masters' ? <Boxes className="h-4 w-4" /> : 
                          group.id === 'operations' ? <Briefcase className="h-4 w-4" /> : 
                          <Settings className="h-4 w-4" />}
                      </div>
                      <h4 className="text-[11px] font-black text-slate-400 tracking-[0.2em]">{group.label}</h4>
                      <div className="flex-1 h-px bg-slate-100" />
                   </div>

                   <div className="space-y-4">
                      {group.permissions.map((perm) => (
                        <div 
                          key={perm.name} 
                          className={`p-6 rounded-2xl border transition-all ${
                             perm.special ? 'bg-indigo-50/30 border-indigo-100/50' : 'bg-[#F8FAFC]/50 border-slate-100 hover:bg-white hover:border-slate-200'
                          } ${!perm.enabled && !perm.special ? 'opacity-60' : ''}`}
                        >
                           <div className="flex items-start justify-between gap-6">
                              <div className="flex-1 space-y-3">
                                 <div className="flex items-center gap-4 flex-wrap">
                                    {perm.special && <Lock className="h-4 w-4 text-indigo-600" />}
                                    <h5 className="text-[15px] font-bold text-[#1E293B]">{perm.name}</h5>
                                    {perm.tags?.map(tag => (
                                       <span key={tag} className="px-2 py-0.5 bg-indigo-600/5 text-indigo-600 text-[9px] font-black tracking-widest uppercase rounded border border-indigo-100/50">
                                          {tag}
                                       </span>
                                    ))}
                                 </div>
                                 <p className="text-xs text-slate-500 font-medium leading-relaxed">
                                    {perm.description}
                                 </p>
                                 {perm.disabledLabel && (
                                    <p className="text-[10px] font-black text-slate-400 italic mt-2 uppercase tracking-tight">{perm.disabledLabel}</p>
                                 )}
                              </div>
                              <Toggle enabled={perm.enabled} disabled={!perm.enabled && !perm.special} />
                           </div>
                        </div>
                      ))}
                   </div>
                </div>
              ))}
           </div>

           <div className="mt-auto p-8 bg-slate-50/50 border-t border-slate-100">
              <p className="text-[10px] text-slate-400 font-bold text-center uppercase tracking-widest">
                 Last updated: 31st Mar 2026 by Systems Admin
              </p>
           </div>
        </div>
      </div>
    </div>
  );
};

export default AccessControl;
