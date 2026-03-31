import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Edit, Trash2, X, Check, 
  ChevronRight, Layout, Settings, Shield, 
  Palette, FileText, Bell, Globe, Search as SearchIcon,
  RefreshCcw, Save, AlertCircle, Inbox, Command, Activity, Cpu, Briefcase, Boxes, ClipboardList, ShieldCheck,
  CreditCard, Key, Activity as ActivityIcon, HelpCircle, BookOpen, Menu, User, LifeBuoy
} from 'lucide-react';
import API from '../../utils/api';
import { useTheme } from '../../contexts/ThemeContext';

// Import sub-components
import GeneralInfo from './components/GeneralInfo';
import BrandingTheme from './components/BrandingTheme';
import AccessControl from './components/AccessControl';
import AuditHistory from './components/AuditHistory';

const SystemSettings = () => {
  const { themeSettings, updateThemeLocally, refreshTheme } = useTheme();
  const [settings, setSettings] = useState([]);
  const [modifiedSettings, setModifiedSettings] = useState({});
  const [activeCategory, setActiveCategory] = useState('Access Control');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState(null);

  // Categories definition matching Enterprise Console reference
  const sidebarCategories = [
    { 
      group: 'GLOBAL SETTINGS', 
      items: [
        { id: 'Organization', label: 'Organization', icon: Boxes },
        { id: 'Access Control', label: 'Access Control', icon: Shield },
        { id: 'Billing', label: 'Billing', icon: CreditCard },
        { id: 'Audit Logs', label: 'Audit Logs', icon: ClipboardList },
        { id: 'API Keys', label: 'API Keys', icon: Key },
        { id: 'System Status', label: 'System Status', icon: ActivityIcon },
      ] 
    }
  ];

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await API.get('/settings/');
      setSettings(response.data);
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleUpdate = (key, value) => {
    setSettings(prev => prev.map(s => s.key === key ? { ...s, value } : s));
    setModifiedSettings(prev => ({ ...prev, [key]: value }));
  };

  const syncUpdates = async () => {
    if (Object.keys(modifiedSettings).length === 0) return;
    setIsSaving(true);
    try {
      const settingsToUpdate = Object.entries(modifiedSettings).map(([key, value]) => {
        const original = settings.find(s => s.key === key);
        return { key, value, category: original?.category || 'General', type: original?.type || 'text' };
      });
      await API.patch('/settings/bulk', { settings: settingsToUpdate });
      if (modifiedSettings.primary_color || modifiedSettings.secondary_color || modifiedSettings.display_mode) {
        refreshTheme();
      }
      setModifiedSettings({});
      showNotification('Institutional settings synced successfully');
    } catch (error) {
      console.error('Error syncing settings:', error);
      showNotification('Failed to sync updates', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const renderContent = () => {
    switch(activeCategory) {
      case 'Organization':
        return <GeneralInfo settings={settings} onUpdate={handleUpdate} />;
      case 'Access Control':
        return <AccessControl />;
      case 'Audit Logs':
        return <AuditHistory />;
      default:
        return <AccessControl />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#F8FAFC]">
      {/* Sidebar Navigation - Enterprise Console Design */}
      <aside className="w-[300px] bg-[#FFFFFF] border-r border-slate-100 flex flex-col relative z-20">
        <div className="p-8 pt-10 mb-8">
           <h1 className="text-xl font-bold text-[#1E293B] tracking-tight">Enterprise Console</h1>
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">ADMINISTRATION</p>
        </div>

        <nav className="flex-1 px-4 space-y-12">
          {sidebarCategories.map((group) => (
            <div key={group.group} className="space-y-4">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-4">{group.group}</h3>
              <div className="space-y-1">
                {group.items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveCategory(item.id)}
                    className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-300 group ${
                      activeCategory === item.id 
                      ? 'bg-indigo-50 text-indigo-600 font-bold' 
                      : 'text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    <item.icon className={`h-5 w-5 ${activeCategory === item.id ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
                    <span className="text-[13px] tracking-tight">{item.label}</span>
                    {activeCategory === item.id && (
                       <div className="ml-auto w-1 h-1 bg-indigo-600 rounded-full" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-6 border-t border-slate-50 space-y-4">
           <button 
             onClick={syncUpdates}
             disabled={!Object.keys(modifiedSettings).length || isSaving}
             className="w-full h-12 bg-[#1E3A8A] text-white rounded-xl font-bold text-xs tracking-widest flex items-center justify-center gap-3 hover:bg-indigo-900 transition-all shadow-lg shadow-indigo-100/50 disabled:opacity-30 disabled:shadow-none"
           >
              <RefreshCcw className={`h-4 w-4 ${isSaving ? 'animate-spin' : ''}`} />
              SYNC UPDATES
           </button>
           
           <div className="space-y-1">
              <button className="flex items-center gap-4 px-4 py-3 w-full text-slate-500 hover:text-indigo-600 transition-colors">
                 <HelpCircle className="h-5 w-5" />
                 <span className="text-[13px] font-medium">Support</span>
              </button>
              <button className="flex items-center gap-4 px-4 py-3 w-full text-slate-500 hover:text-indigo-600 transition-colors">
                 <BookOpen className="h-5 w-5" />
                 <span className="text-[13px] font-medium">Documentation</span>
              </button>
           </div>
        </div>
      </aside>

      {/* Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header matching image */}
        <header className="h-[90px] bg-white border-b border-slate-100 px-10 flex items-center justify-between sticky top-0 z-10">
           <div className="flex items-center gap-6 w-1/3">
              <div className="relative w-full max-w-[400px] group">
                 <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                 <input 
                   type="text" 
                   placeholder="Search resources or documentation"
                   className="w-full h-11 pl-11 pr-4 bg-[#F8FAFC] border-none rounded-xl text-sm focus:ring-0 placeholder:text-slate-400 font-medium"
                 />
              </div>
           </div>

           <div className="flex items-center gap-8">
              <div className="flex items-center gap-6 pr-6 border-r border-slate-100">
                 <button className="text-slate-400 hover:text-indigo-600 transition-colors relative">
                    <Bell className="h-5 w-5" />
                    <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
                 </button>
                 <button className="text-slate-400 hover:text-indigo-600 transition-colors">
                    <HelpCircle className="h-5 w-5" />
                 </button>
                 <button className="text-slate-400 hover:text-indigo-600 transition-colors">
                    <Settings className="h-5 w-5" />
                 </button>
              </div>

              <div className="flex items-center gap-4 group cursor-pointer">
                 <div className="text-right">
                    <p className="text-sm font-bold text-[#1E293B]">Alex Rivera</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Systems Admin</p>
                 </div>
                 <div className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden border-2 border-white shadow-sm ring-1 ring-slate-200">
                    <img src="https://ui-avatars.com/api/?name=Alex+Rivera&background=1E293B&color=fff" alt="Avatar" />
                 </div>
              </div>
           </div>
        </header>

        <main className="flex-1 overflow-y-auto p-12 scroll-smooth">
          <div className="max-w-7xl mx-auto">
             {notification && (
                <div className={`fixed top-8 left-1/2 -translate-x-1/2 px-8 py-3 rounded-2xl shadow-2xl z-50 animate-in slide-in-from-top-10 duration-500 flex items-center gap-4 ${
                  notification.type === 'success' ? 'bg-[#1E293B] text-white' : 'bg-red-600 text-white'
                }`}>
                  <Check className="h-5 w-5 text-emerald-400" />
                  <span className="text-[11px] font-black tracking-widest uppercase">{notification.message}</span>
                </div>
             )}
             {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
};

export default SystemSettings;