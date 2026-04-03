import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, FolderTree, Activity, DollarSign, Calendar, Clock, Edit } from 'lucide-react';
import API from '../utils/api';
import ManageTeamModal from '../components/project/ManageTeamModal';

const ProjectDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [team, setTeam] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showTeamModal, setShowTeamModal] = useState(false);

  useEffect(() => {
    fetchProjectData();
  }, [id]);

  const fetchProjectData = async () => {
    try {
      setLoading(true);
      // Fetch core project
      const projRes = await API.get(`/projects/${id}`);
      setProject(projRes.data);
      
      // Fetch team
      fetchTeam(projRes.data.project_id);
      
      // Fetch Audit Logs
      const logRes = await API.get(`/audit-logs?entity_id=${projRes.data.project_id}&module=Project`);
      setLogs(logRes.data);
      
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchTeam = async (projId) => {
      try {
          const tRes = await API.get(`/projects/${projId}/team`);
          setTeam(tRes.data);
      } catch (e) {
          console.error(e);
      }
  }

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
      <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  if (!project) return <div>Project not found</div>;

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'team', label: 'Team Members', icon: Users },
    { id: 'subcategories', label: 'Sub Categories', icon: FolderTree },
    { id: 'budget', label: 'Budget Analysis', icon: DollarSign },
    { id: 'history', label: 'Activity Logs', icon: Clock }
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-10">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4 mb-4">
            <button 
              onClick={() => navigate('/dashboard/masters/project-master')}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-500"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-slate-800 dark:text-white">{project.name}</h1>
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
                  {project.status || 'Active'}
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-1 flex items-center gap-2">
                <span className="font-mono bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-xs">{project.project_id}</span>
              </p>
            </div>
            
            <div className="ml-auto flex gap-3">
              <button 
                 onClick={() => setShowTeamModal(true)}
                 className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-300 rounded-lg font-medium transition-colors"
              >
                <Users size={18} /> Manage Team
              </button>
            </div>
          </div>
          
          {/* Tabs */}
          <div className="flex gap-6 overflow-x-auto scrollbar-hide border-b border-transparent">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-1 py-3 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                    isActive 
                      ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' 
                      : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
                  }`}
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Content wrapper */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="col-span-1 lg:col-span-2 space-y-6">
              {/* Main Info Card */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6">
                <h2 className="text-lg font-semibold mb-6 text-slate-800 dark:text-white">Project Details</h2>
                <div className="grid grid-cols-2 gap-y-6 gap-x-8">
                  <div>
                    <span className="text-sm text-slate-500 dark:text-slate-400">Timeline</span>
                    <p className="font-medium text-slate-800 dark:text-white mt-1 flex items-center gap-2">
                        <Calendar size={16} className="text-slate-400"/> {project.timeline || 'Not Set'}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-slate-500 dark:text-slate-400">Total Budget</span>
                    <p className="font-medium text-slate-800 dark:text-white mt-1">${project.budget?.toLocaleString() || '0.00'}</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="space-y-6">
              {/* Quick Team Card */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold text-slate-800 dark:text-white">Allocated Team</h2>
                  <span className="text-xs bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-full font-medium">{team.length} Members</span>
                </div>
                <div className="space-y-3">
                  {team.slice(0, 5).map(m => (
                    <div key={m.id} className="flex flex-col border-b border-slate-100 dark:border-slate-700 pb-2 last:border-0 last:pb-0">
                      <span className="font-medium text-sm text-slate-800 dark:text-white">{m.employee_name}</span>
                      <span className="text-xs text-slate-500">{m.role}</span>
                    </div>
                  ))}
                  {team.length > 5 && <div className="text-xs text-indigo-600 pt-2 text-center clickable" onClick={()=>setActiveTab('team')}>View all members...</div>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TEAM TAB */}
        {activeTab === 'team' && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-white">Team Roster</h2>
              <button onClick={()=>setShowTeamModal(true)} className="btn-primary flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                <Users size={16}/> Modify Team
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/50">
                  <tr>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Employee</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Allocation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {team.map(m => (
                    <tr key={m.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/50">
                        <td className="px-6 py-4">
                            <div className="font-medium text-slate-800 dark:text-white">{m.employee_name}</div>
                            <div className="text-xs text-slate-500">{m.employee_id}</div>
                        </td>
                        <td className="px-6 py-4">
                            <span className="px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-full text-xs">{m.role}</span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                            {m.allocation_percentage}%
                        </td>
                    </tr>
                  ))}
                  {team.length === 0 && <tr><td colSpan="3" className="px-6 py-8 text-center text-slate-500">No team members assigned yet.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* LOGS TAB */}
        {activeTab === 'history' && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden p-6">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-6">Activity Logs</h2>
            <div className="relative border-l-2 border-slate-100 dark:border-slate-700 ml-3 space-y-8">
               {logs.map((log, index) => (
                  <div key={log.id} className="relative pl-6">
                    <div className="absolute w-4 h-4 bg-indigo-500 rounded-full border-4 border-white dark:border-slate-800 -left-[9px] top-1"></div>
                    <div className="mb-1 text-sm font-semibold text-slate-800 dark:text-white">
                        {log.action} <span className="font-normal text-slate-500">by</span> {log.user_id || 'System'}
                    </div>
                    <div className="text-xs text-slate-400 mb-2">{new Date(log.timestamp).toLocaleString()}</div>
                    {log.details && Object.keys(log.details).length > 0 && (
                        <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded text-xs font-mono text-slate-600 dark:text-slate-400 inline-block">
                           {JSON.stringify(log.details)}
                        </div>
                    )}
                  </div>
               ))}
               {logs.length === 0 && <div className="pl-6 text-slate-500 italic">No activity recorded for this entity yet.</div>}
            </div>
          </div>
        )}
        
        {/* OTHER TABS OMITTED FOR BREVITY IN POC */}
        {(activeTab === 'subcategories' || activeTab === 'budget') && (
            <div className="p-12 text-center text-slate-500 bg-slate-100/50 dark:bg-slate-800/50 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl">
                Module construction in progress for enhanced view.
            </div>
        )}

      </div>
      
      {/* Modals */}
      <ManageTeamModal 
        isOpen={showTeamModal} 
        onClose={()=>setShowTeamModal(false)}
        project={project}
        onTeamUpdated={()=>fetchTeam(project.project_id)}
      />
    </div>
  );
};

export default ProjectDetail;
