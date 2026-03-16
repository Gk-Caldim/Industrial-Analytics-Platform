import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import ReactDOM from 'react-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LogOut,
  Users,
  Shield,
  FolderKanban,
  Package,
  Building,
  Upload,
  Settings,
  Database,
  MessageSquare,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
  Home,
  FileText,
  ChevronDown,
  ChevronRight,
  Bell,
  Search,
  Calendar,
  Clock,
  User,
  Briefcase,
  Layout,
  Layers,
  Grid,
  FolderTree,
  FileUp,
  FileCog,
  BarChart3
} from 'lucide-react';

import EmployeeMaster from "../pages/Masters/EmployeeMaster";
import EmployeeAccess from "../pages/Masters/EmployeeAccess";
import ProjectMaster from "../pages/Masters/ProjectMaster";
import PartMaster from "../pages/Masters/PartMaster";
import DepartmentMaster from "../pages/Masters/DepartmentMaster";
import Masters from "../pages/Masters/Masters";
import ProjectDashboard from "./ProjectDashboard";
import UploadTrackers from "../pages/Trackers/UploadTrackers";
import SystemSettings from "../pages/Settings/SystemSettings";
import MOMModule from "../pages/mom/MOMModule";
import API from "../utils/api";

// ============================================================================
// SIDEBAR MANAGER
// ============================================================================
const sidebarManager = {
  loadUploadTrackerModules: () => {
    try {
      const saved = localStorage.getItem('upload_tracker_modules');
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.error('Error loading upload tracker modules:', error);
      return [];
    }
  },

  loadProjectDashboardModules: () => {
    try {
      const saved = localStorage.getItem('project_dashboard_modules');
      const allModules = saved ? JSON.parse(saved) : [];
      return Array.isArray(allModules) ? allModules.filter(m => m && m.type === 'project' && m.context === 'project-dashboard') : [];
    } catch (error) {
      console.error('Error loading project dashboard modules:', error);
      return [];
    }
  }
};

const Dashboard = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  // ==========================================================================
  // DEFAULT STATE - PROJECT DASHBOARD SELECTED, ALL SUBMODULES CLOSED
  // ==========================================================================
  const [activeModule, setActiveModule] = useState(() => {
    const saved = localStorage.getItem('active_module');
    return saved || 'project-dashboard';
  });

  const [currentTime, setCurrentTime] = useState('');
  const [currentDate, setCurrentDate] = useState('');

  // Dynamic modules
  const [uploadTrackerModules, setUploadTrackerModules] = useState([]);
  const [projectDashboardModules, setProjectDashboardModules] = useState([]);

  // ==========================================================================
  // EXPANDED MODULES STATE - ALL CLOSED BY DEFAULT
  // ==========================================================================
  const [expandedModules, setExpandedModules] = useState(() => {
    // Try to load from sessionStorage otherwise use defaults
    const saved = sessionStorage.getItem('expanded_modules');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error parsing expanded modules:', e);
      }
    }
    return {
      'project-dashboard': false,
      'masters': false,
      'upload-trackers': false
    };
  });

  // ==========================================================================
  // FIXED: SEPARATE SELECTION STATE FOR EACH CONTEXT
  // ==========================================================================
  const [selectedUploadFileId, setSelectedUploadFileId] = useState(() => {
    const saved = localStorage.getItem('selected_upload_file_id');
    try {
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return saved;
    }
  });

  const [selectedProjectFileId, setSelectedProjectFileId] = useState(() => {
    const saved = localStorage.getItem('selected_project_file_id');
    try {
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return saved;
    }
  });

  const [activeProjectName, setActiveProjectName] = useState(null);

  // ==========================================================================
  // MODIFIED: Sidebar hover state - always collapsed by default, expands on hover
  // ==========================================================================
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true); // Always start collapsed
  const [isHoveringSidebar, setIsHoveringSidebar] = useState(false);

  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [notifications] = useState(3);
  const [hoveredModule, setHoveredModule] = useState(null);

  const profileMenuRef = useRef(null);
  const sidebarRef = useRef(null);
  const hoverTimeoutRef = useRef(null);
  const [profileMenuPosition, setProfileMenuPosition] = useState({ top: 0, right: 0 });

  // ==========================================================================
  // MODIFIED: Handle sidebar hover with delay
  // ==========================================================================
  const handleSidebarMouseEnter = () => {
    // Clear any pending close timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setIsHoveringSidebar(true);
  };

  const handleSidebarMouseLeave = () => {
    // Add a small delay before collapsing to prevent accidental closures
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHoveringSidebar(false);
      hoverTimeoutRef.current = null;
    }, 300); // 300ms delay
  };

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  // ==========================================================================
  // HELPER FUNCTION TO CAPITALIZE FIRST LETTER
  // ==========================================================================
  const capitalizeFirstLetter = (string) => {
    if (!string) return '';
    let processed = string.replace(/tata\s+motors/ig, 'TATA');
    return processed.charAt(0).toUpperCase() + processed.slice(1);
  };

  // ==========================================================================
  // LOAD MODULES FROM API
  // ==========================================================================
  const loadDynamicModules = async () => {
    try {
      const response = await API.get('/datasets/');
      const datasets = response.data;

      const uploadProjectsMap = new Map();
      const dashProjectsMap = new Map();

      datasets.forEach(dataset => {
        const projectName = capitalizeFirstLetter(dataset.project || 'Uncategorized');
        const projectId = projectName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

        // NEW: Helper to get clean display name by stripping project prefix
        const getCleanDisplayName = (fileName, project) => {
          if (!fileName) return '';
          let name = fileName;
          // Strip project prefix if it exists
          if (project && name.toLowerCase().startsWith(project.toLowerCase() + "_")) {
            name = name.substring(project.length + 1);
          }
          // Remove extension and capitalize
          return capitalizeFirstLetter(name.replace(/\.[^/.]+$/, ""));
        };

        const cleanDisplayName = getCleanDisplayName(dataset.fileName, dataset.project);

        // --- Dashboard / Project Context ---
        if (!dashProjectsMap.has(projectName)) {
          dashProjectsMap.set(projectName, {
            id: `project-dashboard-${projectId}`,
            moduleId: `project-dashboard-${projectId}`,
            name: projectName,
            projectName: projectName,
            type: 'project',
            context: 'project-dashboard',
            isExpanded: false,
            submodules: []
          });
        }

        const dashProject = dashProjectsMap.get(projectName);

        if (!dashProject.submodules.some(sub => sub.trackerId === dataset.id)) {
          dashProject.submodules.push({
            id: `project-file-${dataset.id}`,
            moduleId: `project-file-${dataset.id}`,
            trackerId: dataset.id,
            name: dataset.fileName,
            displayName: cleanDisplayName,
            type: 'file',
            projectName: projectName,
            context: 'project-dashboard'
          });
        }

        // --- Upload Management Context ---
        if (!uploadProjectsMap.has(projectName)) {
          uploadProjectsMap.set(projectName, {
            id: `upload-project-${projectId}`,
            moduleId: `upload-project-${projectId}`,
            name: projectName,
            projectName: projectName,
            type: 'project',
            context: 'upload-management',
            isExpanded: false,
            submodules: []
          });
        }

        const uploadProject = uploadProjectsMap.get(projectName);

        if (!uploadProject.submodules.some(sub => sub.trackerId === dataset.id)) {
          uploadProject.submodules.push({
            id: `upload-file-${dataset.id}`,
            moduleId: `upload-file-${dataset.id}`,
            trackerId: dataset.id,
            name: dataset.fileName,
            displayName: cleanDisplayName,
            type: 'file',
            projectName: projectName,
            context: 'upload-management'
          });
        }
      });

      setProjectDashboardModules(Array.from(dashProjectsMap.values()));
      setUploadTrackerModules(Array.from(uploadProjectsMap.values()));
    } catch (error) {
      console.error('Error loading dynamic modules from API:', error);
    }
  };

  useEffect(() => {
    loadDynamicModules();
  }, []);

  // Storage listeners
  useEffect(() => {
    const handleUploadTrackerUpdate = () => loadDynamicModules();
    const handleProjectDashboardUpdate = () => loadDynamicModules();
    const handleStorageChange = (e) => {
      if (e.key === 'upload_tracker_modules' || e.key === 'project_dashboard_modules') {
        loadDynamicModules();
      }
    };

    window.addEventListener('uploadTrackerUpdate', handleUploadTrackerUpdate);
    window.addEventListener('projectDashboardUpdate', handleProjectDashboardUpdate);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('uploadTrackerUpdate', handleUploadTrackerUpdate);
      window.removeEventListener('projectDashboardUpdate', handleProjectDashboardUpdate);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Save expanded state to sessionStorage
  useEffect(() => {
    sessionStorage.setItem('expanded_modules', JSON.stringify(expandedModules));
  }, [expandedModules]);

  // Save active module to localStorage
  useEffect(() => {
    localStorage.setItem('active_module', activeModule);
  }, [activeModule]);

  // ==========================================================================
  // FIXED: Save selected file IDs separately
  // ==========================================================================
  useEffect(() => {
    if (selectedUploadFileId !== null) {
      localStorage.setItem('selected_upload_file_id', JSON.stringify(selectedUploadFileId));
    } else {
      localStorage.removeItem('selected_upload_file_id');
    }
  }, [selectedUploadFileId]);

  useEffect(() => {
    if (selectedProjectFileId !== null) {
      localStorage.setItem('selected_project_file_id', JSON.stringify(selectedProjectFileId));
    } else {
      localStorage.removeItem('selected_project_file_id');
    }
  }, [selectedProjectFileId]);

  useEffect(() => {
    if (activeProjectName !== null) {
      localStorage.setItem('active_project_name', activeProjectName);
    } else {
      localStorage.removeItem('active_project_name');
    }
  }, [activeProjectName]);

  // Listen for back/close events from child modules
  useEffect(() => {
    const handleCloseProjectFile = () => {
      setSelectedProjectFileId(null);
      setActiveModule('project-dashboard');
    };
    const handleReturnToDashboard = (e) => {
      const from = e?.detail?.from;
      if (from === 'uploadTrackers') {
        setSelectedUploadFileId(null);
        setActiveModule('upload-trackers');
        setExpandedModules(prev => ({ ...prev, 'upload-trackers': true }));
      } else if (from === 'projectDashboard') {
        setSelectedProjectFileId(null);
        setActiveModule('project-dashboard');
        setExpandedModules(prev => ({ ...prev, 'project-dashboard': true }));
      }
    };
    window.addEventListener('closeProjectDashboardFile', handleCloseProjectFile);
    window.addEventListener('returnToDashboard', handleReturnToDashboard);
    return () => {
      window.removeEventListener('closeProjectDashboardFile', handleCloseProjectFile);
      window.removeEventListener('returnToDashboard', handleReturnToDashboard);
    };
  }, []);

  // Handle module selection via navigation state
  useEffect(() => {
    const targetModule = location.state && location.state.module;
    if (targetModule && ['project-dashboard', 'upload-trackers', 'masters-main', 'mom-module', 'system-settings'].includes(targetModule)) {
      setActiveModule(targetModule);
      if (targetModule === 'project-dashboard') {
        setExpandedModules(prev => ({ ...prev, 'project-dashboard': true }));
      }
      if (targetModule === 'upload-trackers') {
        setExpandedModules(prev => ({ ...prev, 'upload-trackers': true }));
      }
    }
  }, [location.state]);

  // DateTime
  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }));
      setCurrentDate(now.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }));
    };
    updateDateTime();
    const interval = setInterval(updateDateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Click outside for profile menu
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update profile menu position when opened
  useEffect(() => {
    if (profileMenuOpen && profileMenuRef.current) {
      const rect = profileMenuRef.current.getBoundingClientRect();
      setProfileMenuPosition({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right
      });
    }
  }, [profileMenuOpen]);

  // Handle window resize for profile menu
  useEffect(() => {
    const handleResize = () => {
      if (profileMenuOpen && profileMenuRef.current) {
        const rect = profileMenuRef.current.getBoundingClientRect();
        setProfileMenuPosition({
          top: rect.bottom + 8,
          right: window.innerWidth - rect.right
        });
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [profileMenuOpen]);

  // Open master submodule
  useEffect(() => {
    const handleOpenMasterSubmodule = (event) => {
      const { masterModuleId } = event.detail;
      handleModuleClick(masterModuleId);
      setExpandedModules(prev => ({ ...prev, 'masters': true }));
    };

    window.addEventListener('openMasterSubmodule', handleOpenMasterSubmodule);
    return () => window.removeEventListener('openMasterSubmodule', handleOpenMasterSubmodule);
  }, []);

  // ==========================================================================
  // FIXED: Handle project dashboard file open events with better state management
  // ==========================================================================
  useEffect(() => {
    const handleOpenProjectDashboardFile = (event) => {
      const { trackerId, fileModule, projectName } = event.detail;

      // Set the selected file ID
      setSelectedProjectFileId(trackerId);

      // Ensure project dashboard is active
      if (activeModule !== 'project-dashboard') {
        setActiveModule('project-dashboard');
      }

      // Ensure project dashboard is expanded
      setExpandedModules(prev => ({ ...prev, 'project-dashboard': true }));

      // Find and expand the parent project module
      if (fileModule && fileModule.projectName) {
        // Find the project in projectDashboardModules
        const project = projectDashboardModules.find(p =>
          p.name === fileModule.projectName ||
          p.projectName === fileModule.projectName
        );

        if (project) {
          const projectKey = project.id || project.projectId || project.name;
          setExpandedModules(prev => ({
            ...prev,
            [`project-dashboard-${projectKey}`]: true
          }));
        }
      }
    };

    window.addEventListener('openProjectDashboardFile', handleOpenProjectDashboardFile);
    return () => window.removeEventListener('openProjectDashboardFile', handleOpenProjectDashboardFile);
  }, [activeModule, projectDashboardModules]);

  useEffect(() => {
    const handleOpenProjectDashboardMain = (event) => {
      const { projectId } = event.detail;
      const project = projectDashboardModules.find(p => p.id === projectId || p.name === projectId || p.projectId === projectId);
      if (project && project.name) {
        setActiveProjectName(project.name);
      } else {
        setActiveProjectName(projectId);
      }
    };

    const handleResetProjectDashboardMain = () => {
      setActiveProjectName(null);
    };

    window.addEventListener('openProjectDashboardMain', handleOpenProjectDashboardMain);
    window.addEventListener('resetProjectDashboardMain', handleResetProjectDashboardMain);
    return () => {
      window.removeEventListener('openProjectDashboardMain', handleOpenProjectDashboardMain);
      window.removeEventListener('resetProjectDashboardMain', handleResetProjectDashboardMain);
    };
  }, [projectDashboardModules]);

  // ==========================================================================
  // FIXED: Effect to ensure project file selection persists
  // ==========================================================================
  useEffect(() => {
    // If we have a selected project file ID and we're on project dashboard,
    // ensure the parent module is expanded
    if (activeModule === 'project-dashboard' && selectedProjectFileId) {
      // Find which project contains this file
      for (const project of projectDashboardModules) {
        const file = project.submodules?.find(s => s.trackerId === selectedProjectFileId);
        if (file) {
          const projectKey = project.id || project.projectId || project.name;
          setExpandedModules(prev => ({
            ...prev,
            'project-dashboard': true,
            [`project-dashboard-${projectKey}`]: true
          }));
          break;
        }
      }
    }
  }, [activeModule, selectedProjectFileId, projectDashboardModules]);

  // Masters submodules
  const mastersSubmodules = [
    { id: 'employee-master', name: 'Employee Master', component: <EmployeeMaster />, icon: <Users className="h-5 w-5" />, color: '#000000' },
    { id: 'employee-access', name: 'Employee Access', component: <EmployeeAccess />, icon: <Shield className="h-5 w-5" />, color: '#1a1a1a' },
    { id: 'project-master', name: 'Project Master', component: <ProjectMaster />, icon: <FolderKanban className="h-5 w-5" />, color: '#333333' },
    { id: 'part-master', name: 'Part Master', component: <PartMaster />, icon: <Package className="h-5 w-5" />, color: '#4d4d4d' },
    { id: 'department-master', name: 'Department Master', component: <DepartmentMaster />, icon: <Building className="h-5 w-5" />, color: '#666666' },
  ];

  const mastersModules = [
    { id: 'masters-main', name: 'Masters', component: <Masters />, icon: <Database className="h-5 w-5" /> },
  ];

  // ==========================================================================
  // FIXED: Pass the correct selected file ID to each component
  // ==========================================================================
  const otherModules = [
    {
      id: 'upload-trackers',
      name: 'Upload Trackers',
      component: <UploadTrackers
        selectedFileId={selectedUploadFileId}
        onClearSelection={() => setSelectedUploadFileId(null)}
      />,
      icon: <FileUp className="h-5 w-5" />
    },
    { id: 'system-settings', name: 'Settings', component: <SystemSettings />, icon: <Settings className="h-5 w-5" /> },
  ];

  // Helper functions
  const getUserInitial = () => {
    if (user?.full_name) {
      const names = user.full_name.split(' ');
      if (names.length > 1) {
        return `${names[0][0]}${names[1][0]}`.toUpperCase();
      }
      return user.full_name.charAt(0).toUpperCase();
    }
    return 'U';
  };

  const getAvatarColor = () => {
    return 'bg-black';
  };

  const getActiveComponent = () => {
    // Check masters submodules first
    const mastersSubmodule = mastersSubmodules.find(m => m.id === activeModule);
    if (mastersSubmodule) return mastersSubmodule.component;

    // Check masters main module
    const masterModule = mastersModules.find(m => m.id === activeModule);
    if (masterModule) return masterModule.component;

    // Check other modules
    const otherModule = otherModules.find(m => m.id === activeModule);
    if (otherModule) return otherModule.component;

    // Check MOM module
    if (activeModule === 'mom-module') return <MOMModule />;

    // Default to Project Dashboard - pass the project-specific selected file ID
    return <ProjectDashboard
      selectedFileId={selectedProjectFileId}
      onClearSelection={() => setSelectedProjectFileId(null)}
    />;
  };

  const getActiveModuleName = () => {
    if (activeModule === 'project-dashboard') return 'Project Dashboard';
    if (activeModule === 'masters-main') return 'Masters';
    if (activeModule === 'mom-module') return 'Minutes of Meeting';

    const allModules = [...mastersModules, ...mastersSubmodules, ...otherModules];
    const module = allModules.find(m => m.id === activeModule);
    return module ? module.name : 'Project Dashboard';
  };

  // ==========================================================================
  // FIXED: Get header title using context-specific selected file IDs
  // ==========================================================================
  const getHeaderTitle = () => {
    if (activeModule === 'upload-trackers' && selectedUploadFileId) {
      for (const proj of uploadTrackerModules) {
        const file = proj.submodules?.find(s => s.trackerId === selectedUploadFileId);
        if (file) {
          // Use displayName which is now cleaned in loadDynamicModules
          return file.displayName || capitalizeFirstLetter((file.name || '').replace(/\.(xlsx|xls|csv|json|txt)$/i, ''));
        }
      }
      return 'Upload Trackers';
    }
    if (activeModule === 'project-dashboard' && selectedProjectFileId) {
      for (const proj of projectDashboardModules) {
        const file = proj.submodules?.find(s => s.trackerId === selectedProjectFileId);
        if (file) {
          // Use displayName which is now cleaned in loadDynamicModules
          return file.displayName || capitalizeFirstLetter((file.name || '').replace(/\.(xlsx|xls|csv|json|txt)$/i, ''));
        }
      }
    }
    if (activeModule === 'project-dashboard' && activeProjectName) {
      return `${capitalizeFirstLetter(activeProjectName)} Dashboard`;
    }
    return getActiveModuleName();
  };

  // ==========================================================================
  // HANDLE MODULE CLICK - UPDATED to match Masters behavior
  // ==========================================================================
  const handleModuleClick = (moduleId) => {
    setActiveModule(moduleId);

    // ==========================================================================
    // FIXED: Only clear the selected file for the module we're leaving
    // ==========================================================================
    if (moduleId !== 'project-dashboard') {
      // Clear project file selection when leaving project dashboard
      setSelectedProjectFileId(null);
    } else {
      // If clicking on project dashboard, reset the grid view
      setSelectedProjectFileId(null);
      window.dispatchEvent(new CustomEvent('resetProjectDashboardMain'));
    }

    if (moduleId !== 'upload-trackers') {
      // Clear upload file selection when leaving upload trackers
      setSelectedUploadFileId(null);
    }

    // For main modules with submodules, handle expansion differently
    if (moduleId === 'project-dashboard') {
      // Only expand if it has content and is currently closed
      // Don't toggle - just ensure it's expanded when clicked
      if (projectDashboardModules.length > 0 && !expandedModules['project-dashboard']) {
        setExpandedModules(prev => ({ ...prev, 'project-dashboard': true }));
      }
      // If it's already expanded, keep it expanded (don't collapse)
    } else if (moduleId === 'masters-main') {
      // Masters - toggle expansion (has submodules) - KEEP ORIGINAL BEHAVIOR
      setExpandedModules(prev => ({
        ...prev,
        'masters': !prev['masters']
      }));
    } else if (moduleId === 'upload-trackers') {
      // Upload Trackers - match Project Dashboard behavior
      if (uploadTrackerModules.length > 0 && !expandedModules['upload-trackers']) {
        setExpandedModules(prev => ({ ...prev, 'upload-trackers': true }));
      }
    }
  };

  // ==========================================================================
  // TOGGLE MODULE EXPANSION
  // ==========================================================================
  const toggleModuleExpansion = (moduleId, e) => {
    if (e) {
      e.stopPropagation();
    }
    setExpandedModules(prev => ({
      ...prev,
      [moduleId]: !prev[moduleId]
    }));
  };

  // ==========================================================================
  // FIXED: Use context-specific file click handlers
  // ==========================================================================
  const handleFileModuleClick = (fileModule) => {
    setActiveModule('upload-trackers');
    setSelectedUploadFileId(fileModule.trackerId);
  };

  // ==========================================================================
  // FIXED: Enhanced project file click handler
  // ==========================================================================
  const handleProjectFileClick = (fileModule) => {
    // Set the project-specific selected file ID
    setSelectedProjectFileId(fileModule.trackerId);

    // Ensure we're on project dashboard
    if (activeModule !== 'project-dashboard') {
      setActiveModule('project-dashboard');
    }

    // Ensure project dashboard is expanded
    setExpandedModules(prev => ({ ...prev, 'project-dashboard': true }));

    // Also expand the parent project module
    if (fileModule.projectName) {
      const project = projectDashboardModules.find(p =>
        p.name === fileModule.projectName ||
        p.projectName === fileModule.projectName
      );

      if (project) {
        const projectKey = project.id || project.projectId || project.name;
        setExpandedModules(prev => ({
          ...prev,
          [`project-dashboard-${projectKey}`]: true
        }));
      }
    }

    // Dispatch event for ProjectDashboard to handle
    window.dispatchEvent(new CustomEvent('openProjectDashboardFile', {
      detail: {
        trackerId: fileModule.trackerId,
        fileModule: fileModule,
        projectName: fileModule.projectName || 'Unknown'
      }
    }));
  };

  // ==========================================================================
  // FIXED: Check selection based on context
  // ==========================================================================
  const isFileSelected = (fileModule, context) => {
    if (context === 'upload-trackers') {
      return selectedUploadFileId === fileModule.trackerId;
    } else if (context === 'project-dashboard') {
      return selectedProjectFileId === fileModule.trackerId;
    }
    return false;
  };

  // ==========================================================================
  // RENDER FUNCTIONS - ALL WITH WHITE TEXT ON BLUE BACKGROUND
  // ==========================================================================

  const renderProjectDashboardModule = () => {
    const isActive = activeModule === 'project-dashboard';
    const isExpanded = expandedModules['project-dashboard'];
    const hasDynamicModules = projectDashboardModules.length > 0;
    const isHovered = hoveredModule === 'project-dashboard';

    return (
      <div key="project-dashboard" className="mb-1.5">
        <div
          onMouseEnter={() => setHoveredModule('project-dashboard')}
          onMouseLeave={() => setHoveredModule(null)}
          onClick={() => handleModuleClick('project-dashboard')}
          className={`w-full flex items-center cursor-pointer transition-all duration-300 ${isHoveringSidebar ? 'justify-between px-4 py-3.5' : 'justify-center px-2 py-3.5'
            } rounded-xl ${isActive
              ? 'bg-white/20 shadow-md text-white'
              : isHovered
                ? 'bg-white/15 shadow-sm text-white'
                : 'hover:bg-white/10 text-white'
            }`}
        >
          <div className={`flex items-center ${isHoveringSidebar ? 'space-x-3.5' : 'justify-center'}`}>
            <div className={`transition-colors text-white`}>
              <BarChart3 className={`${isHoveringSidebar ? 'h-5 w-5' : 'h-5 w-5'}`} />
            </div>
            {isHoveringSidebar && (
              <span className={`font-semibold text-base text-white`}>
                Dashboard
              </span>
            )}
          </div>
          {isHoveringSidebar && hasDynamicModules && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleModuleExpansion('project-dashboard', e);
              }}
              className={`p-1.5 rounded-lg text-white ${isActive ? 'hover:bg-white/20' :
                isHovered ? 'hover:bg-white/15' :
                  'hover:bg-white/10'
                }`}
            >
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          )}
        </div>

        {isHoveringSidebar && isExpanded && hasDynamicModules && (
          <div className="ml-7 mt-1.5 space-y-1.5">
            {projectDashboardModules.map(projectModule => renderProjectModule(projectModule, 'project-dashboard'))}
          </div>
        )}
      </div>
    );
  };

  const renderUploadTrackersModule = () => {
    const isActive = activeModule === 'upload-trackers';
    const isExpanded = expandedModules['upload-trackers'];
    const hasDynamicModules = uploadTrackerModules.length > 0;
    const isHovered = hoveredModule === 'upload-trackers';

    return (
      <div key="upload-trackers" className="mb-1.5">
        <div
          onMouseEnter={() => setHoveredModule('upload-trackers')}
          onMouseLeave={() => setHoveredModule(null)}
          onClick={() => handleModuleClick('upload-trackers')}
          className={`w-full flex items-center cursor-pointer transition-all duration-300 ${isHoveringSidebar ? 'justify-between px-4 py-3.5' : 'justify-center px-2 py-3.5'
            } rounded-xl ${isActive
              ? 'bg-white/20 shadow-md text-white'
              : isHovered
                ? 'bg-white/15 shadow-sm text-white'
                : 'hover:bg-white/10 text-white'
            }`}
        >
          <div className={`flex items-center ${isHoveringSidebar ? 'space-x-3.5' : 'justify-center'}`}>
            <div className={`transition-colors text-white`}>
              <FileUp className={`${isHoveringSidebar ? 'h-5 w-5' : 'h-5 w-5'}`} />
            </div>
            {isHoveringSidebar && (
              <span className={`font-semibold text-base text-white`}>
                Upload Trackers
              </span>
            )}
          </div>
          {isHoveringSidebar && hasDynamicModules && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleModuleExpansion('upload-trackers', e);
              }}
              className={`p-1.5 rounded-lg text-white ${isActive ? 'hover:bg-white/20' :
                isHovered ? 'hover:bg-white/15' :
                  'hover:bg-white/10'
                }`}
            >
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          )}
        </div>

        {isHoveringSidebar && isExpanded && hasDynamicModules && (
          <div className="ml-7 mt-1.5 space-y-1.5">
            {uploadTrackerModules.map(projectModule => renderProjectModule(projectModule, 'upload-trackers'))}
          </div>
        )}
      </div>
    );
  };

  const renderMOMModule = () => {
    const isActive = activeModule === 'mom-module';
    const isHovered = hoveredModule === 'mom-module';

    return (
      <button
        key="mom-module"
        onMouseEnter={() => setHoveredModule('mom-module')}
        onMouseLeave={() => setHoveredModule(null)}
        onClick={() => handleModuleClick('mom-module')}
        className={`w-full flex items-center transition-all duration-300 ${isHoveringSidebar ? 'px-4 py-3.5 space-x-3.5' : 'justify-center px-2 py-3.5'
          } rounded-xl ${isActive
            ? 'bg-white/20 shadow-md text-white'
            : isHovered
              ? 'bg-white/15 shadow-sm text-white'
              : 'hover:bg-white/10 text-white'
          }`}
      >
        <div className={`transition-colors text-white`}>
          <MessageSquare className={`${isHoveringSidebar ? 'h-5 w-5' : 'h-5 w-5'}`} />
        </div>
        {isHoveringSidebar && (
          <span className={`font-semibold text-base text-white`}>
            MOM
          </span>
        )}
      </button>
    );
  };

  const renderMastersModule = () => {
    const isExpanded = expandedModules['masters'];
    const isActive = activeModule === 'masters-main' || mastersSubmodules.some(s => s.id === activeModule);
    const isHovered = hoveredModule === 'masters-main';

    return (
      <div key="masters" className="mb-1.5">
        <div
          onMouseEnter={() => setHoveredModule('masters-main')}
          onMouseLeave={() => setHoveredModule(null)}
          onClick={() => handleModuleClick('masters-main')}
          className={`w-full flex items-center cursor-pointer transition-all duration-300 ${isHoveringSidebar ? 'justify-between px-4 py-3.5' : 'justify-center px-2 py-3.5'
            } rounded-xl ${isActive
              ? 'bg-white/20 shadow-md text-white'
              : isHovered
                ? 'bg-white/15 shadow-sm text-white'
                : 'hover:bg-white/10 text-white'
            }`}
        >
          <div className={`flex items-center ${isHoveringSidebar ? 'space-x-3.5' : 'justify-center'}`}>
            <div className={`transition-colors text-white`}>
              <FolderTree className={`${isHoveringSidebar ? 'h-5 w-5' : 'h-5 w-5'}`} />
            </div>
            {isHoveringSidebar && (
              <span className={`font-semibold text-base text-white`}>
                Masters
              </span>
            )}
          </div>
          {isHoveringSidebar && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleModuleExpansion('masters', e);
              }}
              className={`p-1.5 rounded-lg text-white ${isActive ? 'hover:bg-white/20' :
                isHovered ? 'hover:bg-white/15' :
                  'hover:bg-white/10'
                }`}
            >
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          )}
        </div>

        {isHoveringSidebar && isExpanded && (
          <div className="ml-7 mt-1.5 space-y-1.5">
            {mastersSubmodules.map((submodule, index) => {
              const isSubmoduleActive = activeModule === submodule.id;
              const isSubmoduleHovered = hoveredModule === submodule.id;

              return (
                <button
                  key={submodule.id}
                  onMouseEnter={() => setHoveredModule(submodule.id)}
                  onMouseLeave={() => setHoveredModule(null)}
                  onClick={() => handleModuleClick(submodule.id)}
                  className={`w-full flex items-center space-x-3.5 rounded-lg px-3 py-2.5 transition-all duration-300 ${isSubmoduleActive
                    ? 'bg-white/20 shadow-sm text-white'
                    : isSubmoduleHovered
                      ? 'bg-white/15 shadow-sm text-white'
                      : 'hover:bg-white/10 text-white'
                    }`}
                >
                  <div className="text-white">
                    {submodule.icon}
                  </div>
                  <span className={`text-sm font-medium truncate text-white`}>
                    {submodule.name}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // ==========================================================================
  // FIXED: Pass isSelected function to renderProjectModule
  // ==========================================================================
  const renderProjectModule = (projectModule, context) => {
    const projectKey = projectModule.id || projectModule.projectId || projectModule.name;
    const uniqueId = `${context}-${projectKey}`;
    const isExpanded = expandedModules[uniqueId] || false;
    const hasFiles = projectModule.submodules?.length > 0;
    const isHovered = hoveredModule === uniqueId;

    return (
      <div key={uniqueId} className="group">
        <div className="flex items-center justify-between">
          <div
            onMouseEnter={() => setHoveredModule(uniqueId)}
            onMouseLeave={() => setHoveredModule(null)}
            onClick={(e) => {
              toggleModuleExpansion(uniqueId, e);
              if (context === 'project-dashboard') {
                handleModuleClick('project-dashboard');
                const pId = projectModule.id || projectModule.projectId || projectModule.name;
                window.dispatchEvent(new CustomEvent('openProjectDashboardMain', {
                  detail: { projectId: pId }
                }));
              }
            }}
            className={`flex-1 flex items-center space-x-2.5 rounded-lg px-3 py-2.5 transition-all duration-300 cursor-pointer ${isHovered
              ? 'bg-white/15 text-white shadow-sm'
              : 'hover:bg-white/10 text-white'
              }`}
          >
            <Layers className="h-5 w-5 text-white" />
            <span className="text-sm font-medium truncate text-white">
              {projectModule.name}
            </span>
          </div>
          {hasFiles && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleModuleExpansion(uniqueId, e);
              }}
              className={`p-1.5 rounded-lg text-white ${isHovered ? 'hover:bg-white/15' : 'hover:bg-white/10'
                }`}
            >
              {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            </button>
          )}
        </div>

        {isExpanded && hasFiles && (
          <div className="ml-7 mt-1.5 space-y-1">
            {projectModule.submodules.map(fileModule => renderFileModule(fileModule, context, projectKey))}
          </div>
        )}
      </div>
    );
  };

  // ==========================================================================
  // FIXED: Use context-specific selection check with project key
  // ==========================================================================
  const renderFileModule = (fileModule, context, projectKey) => {
    const isSelected = isFileSelected(fileModule, context);
    const fileId = `${context}-${fileModule.id}-${projectKey}`;
    const isHovered = hoveredModule === fileId;

    return (
      <button
        key={fileId}
        onMouseEnter={() => setHoveredModule(fileId)}
        onMouseLeave={() => setHoveredModule(null)}
        onClick={() => {
          if (context === 'upload-trackers') {
            handleFileModuleClick(fileModule);
          } else if (context === 'project-dashboard') {
            handleProjectFileClick({
              ...fileModule,
              projectName: fileModule.projectName || projectKey
            });
          }
        }}
        className={`w-full flex items-center space-x-2.5 rounded-lg px-3 py-2 transition-all duration-300 ${isSelected
          ? 'bg-white/25 shadow-sm text-white font-medium'
          : isHovered
            ? 'bg-white/15 text-white shadow-sm'
            : 'hover:bg-white/10 text-white'
          }`}
      >
        <span className={`text-sm truncate text-white ${isSelected ? 'font-medium' : ''
          }`}>
          {fileModule.displayName || (fileModule.name || '').replace(/\.(xlsx|xls|csv|json|txt)$/i, '')}
        </span>
      </button>
    );
  };

  const renderOtherModules = () => {
    return otherModules.filter(module => module.id !== 'upload-trackers').map((module, index) => {
      const isActive = activeModule === module.id;
      const isHovered = hoveredModule === module.id;

      return (
        <button
          key={module.id}
          onMouseEnter={() => setHoveredModule(module.id)}
          onMouseLeave={() => setHoveredModule(null)}
          onClick={() => handleModuleClick(module.id)}
          className={`w-full flex items-center transition-all duration-300 ${isHoveringSidebar ? 'px-4 py-3.5 space-x-3.5' : 'justify-center px-2 py-3.5'
            } rounded-xl ${isActive
              ? 'bg-white/20 shadow-md text-white'
              : isHovered
                ? 'bg-white/15 shadow-sm text-white'
                : 'hover:bg-white/10 text-white'
            }`}
        >
          <div className="text-white">
            {module.icon}
          </div>
          {isHoveringSidebar && (
            <span className="font-semibold text-base text-white">
              {module.name}
            </span>
          )}
        </button>
      );
    });
  };

  // Determine if sidebar should be expanded
  const isSidebarExpanded = isHoveringSidebar;

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-white">
      {/* Global styles */}
      <style>{`
        * {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }
        
        ::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        
        ::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.1);
        }
        
        ::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.3);
          border-radius: 3px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.5);
        }
      `}</style>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Blue color from project dashboard header (#1e3a5f) */}
        <div
          ref={sidebarRef}
          onMouseEnter={handleSidebarMouseEnter}
          onMouseLeave={handleSidebarMouseLeave}
          className={`
            fixed lg:relative inset-y-0 left-0 z-30
            ${isSidebarExpanded ? 'w-60' : 'w-16'}
            bg-[#1e3a5f]
            transform transition-all duration-200 ease-in-out lg:transform-none
            flex flex-col
            shadow-xl
            relative overflow-hidden
          `}
        >
          {/* Subtle pattern overlay */}
          <div className="absolute inset-0 pointer-events-none opacity-5"
            style={{
              backgroundImage: `radial-gradient(circle at 20% 30%, rgba(255, 255, 255, 0.3) 0%, transparent 30%),
                                   radial-gradient(circle at 80% 70%, rgba(255, 255, 255, 0.3) 0%, transparent 30%)`
            }}>
          </div>

          {/* Logo Section */}
          <div className="relative px-4 py-6 z-10">
            {isSidebarExpanded ? (
              <div className="flex justify-center items-center">
                <div className="relative">
                  <div className="absolute inset-0 bg-white/10 blur-xl rounded-full"></div>
                  <img
                    src="/caldimlogo.png"
                    className="h-26 w-auto object-contain relative brightness-0 invert"
                    alt="Company Logo"
                  />
                </div>
              </div>
            ) : (
              <div className="flex justify-center py-2">
                <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center shadow-md backdrop-blur-sm">
                  <span className="text-white font-bold text-sm">CD</span>
                </div>
              </div>
            )}
          </div>

          {/* Navigation - All text white */}
          <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5 relative z-10">
            {renderProjectDashboardModule()}
            {renderMOMModule()}
            {renderMastersModule()}

            <div className="space-y-1.5">
              {renderUploadTrackersModule()}
              {renderOtherModules()}
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-white">
          {/* Header - White background */}
          <header className="bg-white border-b border-gray-200 flex-shrink-0 sticky top-0 z-20 shadow-sm">
            <div className="px-6 py-4 flex items-center justify-between relative z-10">
              {/* Left side - Empty for centering */}
              <div className="w-48"></div>

              {/* Center - Title */}
              <div className="flex-1 flex justify-center items-center">
                <h1 className="text-2xl font-bold text-[#1e3a5f] tracking-tight">
                  {getHeaderTitle()}
                </h1>
              </div>

              {/* Right side - Date/Time and Profile */}
              <div className="flex items-center space-x-6 min-w-[300px] justify-end">
                {/* Date and Time - Updated for white header */}
                <div className="flex items-center space-x-3 bg-gray-50 px-4 py-2 rounded-lg shadow-sm border border-gray-200">
                  <span className="text-sm font-medium text-gray-700 tabular-nums">{currentTime}</span>
                  <span className="text-gray-300">|</span>
                  <span className="text-sm font-medium text-gray-700">{currentDate}</span>
                </div>

                {/* Profile Menu with black background */}
                <div className="relative" ref={profileMenuRef}>
                  <button
                    onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                    className="bg-[#1e3a5f] w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-base shadow-md hover:shadow-lg transition-all"
                  >
                    {getUserInitial()}
                  </button>

                  {profileMenuOpen && (
                    <div
                      className="fixed z-[9999] w-72 bg-white rounded-xl shadow-lg border border-gray-200 py-2"
                      style={{
                        position: 'fixed',
                        top: `${profileMenuPosition.top}px`,
                        right: `${profileMenuPosition.right}px`
                      }}
                    >
                      <div className="px-5 py-4">
                        <div className="flex items-center space-x-4">
                          <div className="bg-[#1e3a5f] w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-md flex-shrink-0">
                            {getUserInitial()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-gray-900 text-lg truncate">{user?.full_name || 'User'}</p>
                            <p className="text-sm text-gray-500 mt-1 truncate">{user?.email || 'user@example.com'}</p>
                            <span className="inline-block mt-2 px-2.5 py-1 bg-gray-100 rounded-full text-xs font-medium text-gray-700 capitalize">
                              {user?.role || 'User'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Menu Items */}
                      <div className="py-2 border-t border-gray-100">
                        <button className="w-full px-5 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-3">
                          <User className="h-5 w-5 text-gray-500" />
                          <span className="font-medium">Profile Settings</span>
                        </button>
                        <button className="w-full px-5 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-3">
                          <Settings className="h-5 w-5 text-gray-500" />
                          <span className="font-medium">Account Settings</span>
                        </button>
                      </div>

                      <div className="border-t border-gray-100 py-2">
                        <button
                          onClick={() => {
                            logout();
                            setProfileMenuOpen(false);
                          }}
                          className="w-full px-5 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-3"
                        >
                          <LogOut className="h-5 w-5 text-gray-500" />
                          <span className="font-semibold">Logout</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 min-h-0 overflow-hidden bg-white">
            <div className={activeModule === 'project-dashboard' ? 'pl-6 pr-0.5 py-6 h-full' : 'p-6 h-full'}>
              <div className="bg-white rounded-lg h-full overflow-auto">
                {getActiveComponent()}
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;