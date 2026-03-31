import React from 'react';
import { Shield, Clock, User, ArrowRight, Download, Search, Filter, Calendar as CalIcon, ChevronRight, FileText, CheckCircle2 } from 'lucide-react';

const AuditHistory = () => {
  const auditLogs = [
    {
      id: 1,
      timestamp: '30 Mar 2026, 02:44 pm',
      admin: 'Gokul M',
      action: 'UPDATE PERMISSION',
      targetRole: 'Admin',
      summary: '52 change(s) recorded',
      details: 'Full access granted to Budget Summary module'
    },
    {
      id: 2,
      timestamp: '30 Mar 2026, 01:20 pm',
      admin: 'Gokul M',
      action: 'UPDATE PERMISSION',
      targetRole: 'Manager',
      summary: '15 change(s) recorded',
      details: 'Added view-only access to Employee PII'
    },
    {
      id: 3,
      timestamp: '30 Mar 2026, 11:15 am',
      admin: 'Gokul M',
      action: 'CREATE CUSTOM ROLE',
      targetRole: 'Field Engineer',
      summary: 'Role initialized',
      details: 'Restricted role for on-site machinery data entry'
    },
    {
      id: 4,
      timestamp: '29 Mar 2026, 04:30 pm',
      admin: 'Gokul M',
      action: 'UPDATE PERMISSION',
      targetRole: 'Analyst',
      summary: '8 change(s) recorded',
      details: 'Enabled export permissions for sub-category datasets'
    },
    {
      id: 5,
      timestamp: '29 Mar 2026, 12:45 pm',
      admin: 'Gokul M',
      action: 'SYNC IDENTITY',
      targetRole: 'System',
      summary: 'Global Sync',
      details: 'Updated primary branding colors across all modules'
    }
  ];

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-8 duration-700 pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-5">
          <div className="p-4 bg-indigo-600 text-white rounded-[24px] shadow-2xl shadow-indigo-200">
            <Shield className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Permission Audit History</h2>
            <p className="text-slate-500 font-medium text-sm mt-1 uppercase tracking-tighter">Traceable, immutable record of every RBAC and system change</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 h-12 px-6 bg-slate-900 text-white rounded-2xl font-black text-[10px] tracking-widest hover:bg-slate-800 transition-all shadow-xl active:scale-95 uppercase">
            <Download className="h-4 w-4 text-indigo-400" /> Export CSV
          </button>
        </div>
      </div>

      {/* Advanced Filters Bar */}
      <div className="bg-white p-3 rounded-[32px] border border-slate-200/60 shadow-sm flex flex-wrap items-center gap-4">
        <div className="flex-1 relative min-w-[300px]">
           <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
           <input 
            type="text" 
            placeholder="Search by role, administrator, or module..."
            className="w-full h-12 pl-14 pr-6 bg-slate-50 border border-slate-200/80 rounded-[24px] text-sm font-bold focus:ring-8 focus:ring-indigo-500/5 transition-all text-slate-600"
           />
        </div>
        <div className="h-10 w-px bg-slate-100 hidden sm:block" />
        <div className="flex items-center gap-4 px-4 h-12 bg-slate-50 rounded-2xl border border-slate-200/40">
           <Filter className="h-4 w-4 text-slate-400" />
           <select className="bg-transparent text-[11px] font-black text-slate-600 tracking-widest border-none focus:ring-0 cursor-pointer uppercase">
              <option>All Actions</option>
              <option>Update Permission</option>
              <option>Create Role</option>
              <option>Sync Identity</option>
           </select>
        </div>
        <div className="flex items-center gap-3 px-4 h-12 bg-white rounded-2xl border border-dashed border-slate-200 group hover:border-indigo-300 transition-all cursor-pointer">
          <CalIcon className="h-4 w-4 text-slate-400 group-hover:text-indigo-500 transition-colors" />
          <span className="text-[11px] font-black text-slate-500 uppercase tracking-tighter">dd/mm/yyyy</span>
          <ArrowRight className="h-3 w-3 text-slate-300" />
          <span className="text-[11px] font-black text-slate-500 uppercase tracking-tighter">dd/mm/yyyy</span>
        </div>
      </div>

      {/* Premium Audit Table */}
      <div className="bg-white rounded-[40px] border border-slate-200/60 shadow-sm overflow-hidden relative group">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-100">
              <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] w-48">Date & Time</th>
              <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Administrator</th>
              <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Action</th>
              <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Target Role</th>
              <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Changes Summary</th>
              <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] w-20"></th>
            </tr>
          </thead>
          <tbody>
            {auditLogs.map((log) => (
              <tr key={log.id} className="border-b last:border-0 border-slate-50 hover:bg-slate-50/80 transition-colors group/row">
                <td className="px-8 py-7">
                  <div className="text-[13px] font-black text-slate-800 tracking-tight">{log.timestamp.split(', ')[0]}</div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter mt-1">{log.timestamp.split(', ')[1]}</div>
                </td>
                <td className="px-8 py-7">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-white shadow-sm border border-slate-100 flex items-center justify-center text-xs font-black text-indigo-600 group-hover/row:bg-indigo-600 group-hover/row:text-white transition-all">
                      {log.admin.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <span className="text-[13px] font-black text-slate-800 tracking-tight block">{log.admin}</span>
                      <span className="text-[9px] text-slate-400 font-bold uppercase">System Admin</span>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-7">
                  <span className="px-4 py-1.5 bg-indigo-50/50 text-indigo-700 rounded-xl text-[9px] font-black tracking-widest uppercase border border-indigo-100/50 shadow-sm">
                    {log.action}
                  </span>
                </td>
                <td className="px-8 py-7">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${log.targetRole === 'System' ? 'bg-amber-500' : 'bg-indigo-500'} shadow-[0_0_8px_rgba(99,102,241,0.4)]`} />
                    <span className="text-[13px] font-black text-slate-700 tracking-tight">{log.targetRole}</span>
                  </div>
                </td>
                <td className="px-8 py-7">
                  <div className="flex items-center gap-3 group/info relative">
                    <ArrowRight className="h-4 w-4 text-slate-300 group-hover/row:text-indigo-400 transition-colors" />
                    <div>
                      <span className="text-[13px] text-slate-600 font-bold tracking-tight block">{log.summary}</span>
                      <span className="text-[10px] text-slate-400 transition-opacity italic mt-0.5 block">{log.details}</span>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-7 text-right">
                   <button className="w-10 h-10 flex items-center justify-center text-slate-300 hover:text-indigo-600 hover:bg-white rounded-xl transition-all shadow-sm group-hover/row:opacity-100 opacity-0 bg-slate-50 border border-slate-100">
                      <Search className="h-4 w-4" />
                   </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {/* Empty state overlay for no results (hidden by default) */}
        {auditLogs.length === 0 && (
          <div className="p-20 flex flex-col items-center justify-center text-center space-y-4">
             <div className="p-6 bg-slate-50 rounded-full border border-slate-100">
                <FileText className="h-12 w-12 text-slate-300" />
             </div>
             <div>
                <p className="text-lg font-black text-slate-800 tracking-tight">No Logs Found</p>
                <p className="text-sm text-slate-400 font-medium mt-1">Try adjusting your search or filters.</p>
             </div>
          </div>
        )}
      </div>

      {/* Premium Pagination */}
      <div className="flex items-center justify-center pt-10">
         <div className="flex gap-2 bg-white p-2 rounded-[24px] border border-slate-200/60 shadow-sm">
            <button className="w-10 h-10 flex items-center justify-center rounded-2xl bg-indigo-600 text-white font-black text-sm shadow-xl shadow-indigo-100 transition-all">1</button>
            <button className="w-10 h-10 flex items-center justify-center rounded-2xl bg-transparent border border-transparent text-slate-400 font-black text-sm hover:bg-slate-50 transition-all">2</button>
            <button className="w-10 h-10 flex items-center justify-center rounded-2xl bg-transparent border border-transparent text-slate-400 font-black text-sm hover:bg-slate-50 transition-all">3</button>
            <div className="w-10 h-10 flex items-center justify-center text-slate-300 tracking-tighter">•••</div>
            <button className="w-10 h-10 flex items-center justify-center rounded-2xl bg-transparent border border-slate-200 text-slate-400 font-black text-sm hover:bg-slate-50 transition-all">
               <ChevronRight className="h-4 w-4" />
            </button>
         </div>
      </div>
    </div>
  );
};

export default AuditHistory;
