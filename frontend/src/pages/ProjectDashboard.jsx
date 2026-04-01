import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { setProjects, updateProjectConfig } from '../store/slices/projectSlice';
import { setSelectedProjectFileId } from '../store/slices/navSlice';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import '../utils/echarts-theme-v5'; // Register the v5 theme
import ExcelTableViewer from '../components/ExcelTableViewer';
import { Layout, Maximize2, Minimize2, Send, Mail, Search, Edit, Plus, Trash2, X, Filter, ChevronUp, ChevronDown, Check, Save, Settings, Download, GripVertical } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

import { HotTable } from '@handsontable/react';
import { registerAllModules } from 'handsontable/registry';
import 'handsontable/dist/handsontable.full.min.css';
registerAllModules();

// Helper to get display name without project prefix
const getDisplayFileName = (fileName, projectName) => {
  if (!fileName) return '';
  let name = fileName;

  // Try to remove project prefix (both with underscores and spaces)
  if (projectName) {
    const projectPrefixUnderscore = projectName.replace(/\s+/g, '_') + '_';
    if (name.toLowerCase().startsWith(projectPrefixUnderscore.toLowerCase())) {
      name = name.substring(projectPrefixUnderscore.length);
    } else {
      const projectPrefixSpace = projectName + '_';
      if (name.toLowerCase().startsWith(projectPrefixSpace.toLowerCase())) {
        name = name.substring(projectPrefixSpace.length);
      }
    }
  }

  // Remove extension
  return name.replace(/\.[^/.]+$/, "");
};

// Get status color
const getStatusColor = (status) => {
  switch (status) {
    case 'Open': return { bg: '#fee2e2', text: '#991b1b' };
    case 'Closed': return { bg: '#d1fae5', text: '#065f46' };
    case 'In Progress': return { bg: '#dbeafe', text: '#1e40af' };
    case 'On Track':
    case 'Active':
    case 'Complete':
    case 'Good': return { bg: '#d1fae5', text: '#065f46' };
    case 'Ahead of timeline': return { bg: '#d1fae5', text: '#065f46' };
    case 'At Risk':
    case 'Under Review': return { bg: '#fed7aa', text: '#9a3412' };
    case 'Pending':
    case 'Not Started': return { bg: '#f3f4f6', text: '#4b5563' };
    default: return { bg: '#f3f4f6', text: '#1f2937' };
  }
};

// Humanize raw field names and format them for display
const humanizeLabel = (label) => {
  if (!label) return '';
  return label
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
};

// Format X-axis values (dates, numbers)
const formatXAxisValue = (val) => {
  if (val === null || val === undefined) return '';
  const strVal = String(val);

  // Try to detect common date formats
  if (strVal.match(/^\d{4}-\d{2}-\d{2}/) || strVal.match(/^\d{1,2}\/\d{1,2}\/\d{2,4}/)) {
    const date = new Date(val);
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
    }
  }

  // Large numbers
  if (!isNaN(parseFloat(val)) && parseFloat(val) > 1000) {
    return new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 }).format(val);
  }

  return strVal;
};

// Helper to detect if a column is a date
const isDateColumn = (data, colName) => {
  if (!data || !Array.isArray(data) || data.length === 0) return false;
  // Check first 5 non-empty rows
  let count = 0;
  let matches = 0;
  for (let i = 0; i < data.length && count < 5; i++) {
    const val = data[i][colName];
    if (val !== null && val !== undefined && String(val).trim() !== '') {
      count++;
      const strVal = String(val);
      if (strVal.match(/^\d{4}-\d{2}-\d{2}/) || strVal.match(/^\d{1,2}\/\d{1,2}\/\d{2,4}/)) {
        matches++;
      }
    }
  }
  return count > 0 && matches / count > 0.6;
};

// Infer relationship between two date columns
const inferDateRelationship = (col1, col2) => {
  const c1 = col1.toLowerCase();
  const c2 = col2.toLowerCase();

  // Delay: Planned/Target vs Actual/Completed
  const plannedKeys = ['planned', 'target', 'expected', 'schedule'];
  const actualKeys = ['actual', 'completed', 'delivered', 'finish'];

  if (plannedKeys.some(k => c1.includes(k)) && actualKeys.some(k => c2.includes(k))) {
    return { type: 'delay', label: 'Delay', date1: col1, date2: col2 }; // Actual - Planned
  }
  if (plannedKeys.some(k => c2.includes(k)) && actualKeys.some(k => c1.includes(k))) {
    return { type: 'delay', label: 'Delay', date1: col2, date2: col1 };
  }

  // Duration: Start vs End
  if (c1.includes('start') && (c2.includes('end') || c2.includes('finish'))) {
    return { type: 'duration', label: 'Duration', date1: col1, date2: col2 }; // End - Start
  }
  if (c2.includes('start') && (c1.includes('end') || c1.includes('finish'))) {
    return { type: 'duration', label: 'Duration', date1: col2, date2: col1 };
  }

  // Cycle Time: Created vs Completed/Closed
  if (c1.includes('created') && (c2.includes('completed') || c2.includes('closed') || c2.includes('finish'))) {
    return { type: 'cycleTime', label: 'Cycle Time', date1: col1, date2: col2 }; // Completed - Created
  }
  if (c2.includes('created') && (c1.includes('completed') || c1.includes('closed') || c1.includes('finish'))) {
    return { type: 'cycleTime', label: 'Cycle Time', date1: col2, date2: col1 };
  }

  return null;
};

// Diverse color palette for differentiation
const getDiversePalette = () => [
  "#5470c6", "#91cc75", "#fac858", "#ee6666", "#73c0de",
  "#3ba272", "#fc8452", "#9a60b4", "#ea7ccc", "#5ae3f1",
  "#ff9f7f", "#fb7293", "#e79068", "#e690d1", "#e062ae",
  "#67e0e3", "#ffdb5c", "#37a2da", "#32c5e9", "#9fe6b8"
];

const ProjectTitleDashboard = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const dispatch = useDispatch();
  const selectedFileId = useSelector(state => state.nav.selectedProjectFileId);
  const onClearSelection = () => dispatch(setSelectedProjectFileId(null));

  // Projects data
  const projects = useSelector(state => state.project.projects);

  useEffect(() => {
    const loadProjects = async () => {
      try {
        const { default: API } = await import('../utils/api');
        const response = await API.get('/datasets/');
        const datasets = response.data;

        const newProjects = (() => {
          const uniqueProjectsMap = new Map();

          datasets.forEach((dataset, index) => {
            let projectName = dataset.project || 'Uncategorized';
            projectName = projectName.replace(/tata\s+motors/ig, 'TATA');
            const capitalizedName = projectName.charAt(0).toUpperCase() + projectName.slice(1);

            if (!uniqueProjectsMap.has(capitalizedName)) {
              uniqueProjectsMap.set(capitalizedName, {
                id: `project-dashboard-${capitalizedName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`,
                name: capitalizedName,
                code: capitalizedName.substring(0, 4).toUpperCase(), // Default code, can be updated later
                status: 'In Progress', // Default status
                submodules: [],
                active: false,
                dashboardConfig: null // Let Redux slice handle merging from sessionStorage
              });
            }

            const existingProject = uniqueProjectsMap.get(capitalizedName);
            if (!existingProject.submodules.some(sub => sub.trackerId === dataset.id)) {
              existingProject.submodules.push({
                id: `project-file-${dataset.id}`,
                trackerId: dataset.id,
                name: dataset.fileName,
                displayName: getDisplayFileName(dataset.fileName, capitalizedName),
                department: dataset.department, // Add department field
                type: 'file',
                projectName: capitalizedName
              });
            }
          });

          return Array.from(uniqueProjectsMap.values());
        })();

        dispatch(setProjects(newProjects));
      } catch (error) {
        console.error('Error loading project dashboard modules:', error);
      }
    };

    loadProjects();

    window.addEventListener('projectDashboardUpdate', loadProjects);
    window.addEventListener('uploadTrackerUpdate', loadProjects);

    return () => {
      window.removeEventListener('projectDashboardUpdate', loadProjects);
      window.removeEventListener('uploadTrackerUpdate', loadProjects);
    };
  }, []);

  // Handle open project dashboard main event
  useEffect(() => {
    const handleOpenDashboardProject = (event) => {
      const { projectId } = event.detail;

      if (onClearSelection) onClearSelection();

      const selectedProject = projects.find(p => p.id === projectId || p.name === projectId);
      if (selectedProject) {
        setSearchParams({ projectId: selectedProject.id });
        if (selectedProject.dashboardConfig) {
          setVisibleSections(selectedProject.dashboardConfig.visibleSections || {});
          setShowSimulateModal(false);
        } else {
          setShowSimulateModal(true);
        }
      }
    };

    const handleResetDashboardProject = () => {
      setSearchParams({});
      setVisibleSections({
        milestones: false,
        criticalIssues: false,
        budget: false,
        resource: false,
        quality: false,
        design: false,
        partDevelopment: false,
        build: false,
        gateway: false,
        validation: false,
        qualityIssues: false,
        sopTables: false
      });
      if (onClearSelection) onClearSelection();
    };

    window.addEventListener('openProjectDashboardMain', handleOpenDashboardProject);
    window.addEventListener('resetProjectDashboardMain', handleResetDashboardProject);
    return () => {
      window.removeEventListener('openProjectDashboardMain', handleOpenDashboardProject);
      window.removeEventListener('resetProjectDashboardMain', handleResetDashboardProject);
    };
  }, [projects, onClearSelection]);

  // Derived state from searchParams
  const projectId = searchParams.get('projectId');
  const submoduleId = searchParams.get('submoduleId');

  const activeProject = useMemo(() => {
    if (!projectId) return null;
    return projects.find(p => p.id === projectId || p.name === projectId);
  }, [projectId, projects]);

  const selectedSubmodule = useMemo(() => {
    if (!activeProject || !submoduleId) return null;
    return activeProject.submodules?.find(s => s.id === submoduleId || s.trackerId === submoduleId || `project-file-${s.trackerId}` === submoduleId);
  }, [activeProject, submoduleId]);

  // Submodule data (from uploaded Excel)
  const [submoduleData, setSubmoduleData] = useState({});

  // Chart types state for each project
  const [chartTypes, setChartTypes] = useState({});

  // Axis configs state for each project
  const [axisConfigs, setAxisConfigs] = useState({});

  const [maximizedChart, setMaximizedChart] = useState(null);
  const [showAxisSelector, setShowAxisSelector] = useState(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const showSimulateModal = searchParams.get('configure') === 'true';
  const setShowSimulateModal = (show) => {
    if (show) {
      setSearchParams(prev => {
        prev.set('configure', 'true');
        return prev;
      });
    } else {
      setSearchParams(prev => {
        prev.delete('configure');
        return prev;
      }, { replace: true }); // Use replace when closing modal to avoid history loops
    }
  };
  const [loading, setLoading] = useState(false);
  const [allEmployees, setAllEmployees] = useState([]);
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState('');
  const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false);
  const [activeEmailField, setActiveEmailField] = useState('email'); // 'email', 'cc', 'bcc'

  const [emailData, setEmailData] = useState({
    to: '',
    subject: 'Project Dashboard Report',
    message: '',
    selectedSections: {
      milestones: true,
      criticalIssues: true,
      budget: true,
      resource: true,
      quality: true,
      design: true,
      build: true,
      gateway: true,
      validation: true,
      qualityCheck: true
    },
    emailInputs: [''],
    ccInputs: [''],
    bccInputs: ['']
  });

  const [isCapturingPdf, setIsCapturingPdf] = useState(false);
  const chartRefs = useRef({});
  const [pdfChartImages, setPdfChartImages] = useState({});

  // PDF Customization & Pagination States
  const [pdfPages, setPdfPages] = useState([[]]); // Array of pages [ [sectionKey1, sectionKey2], [sectionKey3] ]
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [activeTab, setActiveTab] = useState('structure'); // 'structure', 'style', 'page'
  const [capacityWarning, setCapacityWarning] = useState('');
  const [pdfGlobalStyles, setPdfGlobalStyles] = useState({
    fontFamily: 'Inter, sans-serif',
    lineHeight: '1.6',
    spacing: 'Normal', // Compact, Normal, Comfortable
    headerText: 'Industrial Analytics Platform',
    footerText: `Generated by Industrial Analytics Platform • ${new Date().toLocaleDateString()}`,
    showPageNumbers: true,
    includeCoverPage: false,
    pageSize: 'a4',
    preparedBy: '',
    coverLogoUrl: ''
  });

  const [pdfBackground, setPdfBackground] = useState({
    type: 'solid', // 'solid', 'gradient', 'image'
    value: '#ffffff',
    gradient: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
    imageUrl: '',
    imageOpacity: 0.1
  });

  const [pdfCustomContent, setPdfCustomContent] = useState({}); // { sectionKey: { title: '', notes: '', alignment: 'left', size: 'Medium' } }

  // New state for dashboard visibility
  const [visibleSections, setVisibleSections] = useState({
    milestones: false,
    criticalIssues: false,
    budget: false,
    resource: false,
    quality: false,
    design: false,
    build: false,
    gateway: false,
    validation: false,
    qualityIssues: false,
    sopTables: false
  });

  // BUFFER STATE for Dashboard Configuration Modal
  const [tempVisibleSections, setTempVisibleSections] = useState({ ...visibleSections });

  // Sync buffer when modal opens
  useEffect(() => {
    if (showSimulateModal) {
      setTempVisibleSections({ ...visibleSections });
    }
  }, [showSimulateModal, visibleSections]);

  // Sync live state with persisted config on mount or project switch
  useEffect(() => {
    if (activeProject?.dashboardConfig) {
      if (activeProject.dashboardConfig.visibleSections) {
        setVisibleSections(activeProject.dashboardConfig.visibleSections);
      }
      if (activeProject.dashboardConfig.chartTypes) {
        setChartTypes(prev => ({
          ...prev,
          [activeProject.id]: activeProject.dashboardConfig.chartTypes
        }));
      }
      if (activeProject.dashboardConfig.axisConfigs) {
        setAxisConfigs(prev => ({
          ...prev,
          [activeProject.id]: activeProject.dashboardConfig.axisConfigs
        }));
      }
    } else {
      // Reset to default (all false) if no config found or no active project
      setVisibleSections({
        milestones: false,
        criticalIssues: false,
        budget: false,
        resource: false,
        quality: false,
        design: false,
        build: false,
        gateway: false,
        validation: false,
        qualityIssues: false,
        sopTables: false
      });
    }
  }, [activeProject]);

  // Helper to determine which phases are available based on uploaded files
  const availablePhases = useMemo(() => {
    const phases = {
      design: false,
      build: false,
      gateway: false,
      validation: false,
      qualityIssues: false
    };

    if (!activeProject || !activeProject.submodules) return phases;

    // Track which submodules are present
    activeProject.submodules.forEach(sub => {
      phases[sub.id] = true;
    });

    // Keep legacy aliases for backward compatibility if needed, 
    // but primarily we want to use submodule.id for dynamic trackers
    const isAvailable = (deptName, aliases) => activeProject.submodules.some(sub => {
      const name = (sub.displayName || sub.name || '').toLowerCase();
      const dept = (sub.department || '').toLowerCase();
      const targetDept = deptName.toLowerCase();
      return dept === targetDept || aliases.some(alias => name.includes(alias.toLowerCase()));
    });

    phases.design = isAvailable('Design Release', ['design']);
    phases.build = isAvailable('Build', ['build']);
    phases.gateway = isAvailable('Gateway', ['gateway']);
    phases.validation = isAvailable('Validation', ['validation']);
    phases.qualityIssues = isAvailable('Quality Issues', ['quality check', 'qualitycheck', 'quality_check', 'quality', 'issues']);

    return phases;
  }, [activeProject]);

  // Helper to get specific tracker for a phase
  const getTrackerForPhase = (phaseOrId) => {
    if (!activeProject || !activeProject.submodules) return null;

    // If phaseOrId is a submodule ID already, return that submodule
    const DirectMatch = activeProject.submodules.find(sub => sub.id === phaseOrId);
    if (DirectMatch) return DirectMatch;

    const mapping = {
      design: { dept: 'Design Release', aliases: ['design'] },
      build: { dept: 'Build', aliases: ['build'] },
      gateway: { dept: 'Gateway', aliases: ['gateway'] },
      validation: { dept: 'Validation', aliases: ['validation'] },
      qualityIssues: { dept: 'Quality Issues', aliases: ['quality check', 'qualitycheck', 'quality_check', 'quality', 'issues'] }
    };

    const config = mapping[phaseOrId];
    if (!config) return null;

    return activeProject.submodules.find(sub => {
      const name = (sub.displayName || sub.name || '').toLowerCase();
      const dept = (sub.department || '').toLowerCase();
      return dept === config.dept.toLowerCase() || config.aliases.some(alias => name.includes(alias.toLowerCase()));
    });
  };

  // Load employees from API
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const { default: API } = await import('../utils/api');
        const response = await API.get('/employees');
        setAllEmployees(response.data || []);
      } catch (error) {
        console.error('Error fetching employees:', error);
      }
    };
    fetchEmployees();
  }, []);

  // Available columns for X and Y axis (dummy data)
  const availableColumns = [
    'Category', 'Value', 'Week', 'Progress', 'Component', 'Percentage',
    'Month', 'Performance', 'Test Case', 'Pass Rate', 'Metric', 'Score',
    'Region', 'Sales', 'Product', 'Revenue', 'Department', 'Count'
  ];

  // --- EDITABLE DASHBOARD DATA ---

  // Milestones data with plan/actual
  const [milestones, setMilestones] = useState([
    {
      plan: { a: 'April 26', b: 'May 26', c: 'Jan 26', d: 'April 26', e: 'May 26', f: 'Jan 26', implementation: 'On Track' },
      actual: { a: 'Jan 26', b: 'April 26', c: 'July 26', d: 'July 26', e: 'Jan 26', f: 'May 26', implementation: 'In Progress' }
    },
  ]);

  // SOP Data - Health and status information
  const [sopData, setSopData] = useState([
    {
      name: 'SOP Timeline',
      daysToGo: 20,
      status: 'Likely Delay',
      health: 'At Risk'
    }
  ]);

  // Critical issues data
  const [criticalIssues, setCriticalIssues] = useState([
    { id: 1, issue: 'Database connection timeout in production', responsibility: 'John Doe', function: 'Backend', targetDate: '2024-03-20', status: 'Open' },
    { id: 2, issue: 'API rate limiting causing service disruption', responsibility: 'Jane Smith', function: 'API Team', targetDate: '2024-03-18', status: 'Open' },
    { id: 3, issue: 'Memory leak in payment processing service', responsibility: 'Mike Johnson', function: 'Infra', targetDate: '2024-03-19', status: 'In Progress' },
    { id: 4, issue: 'UI rendering issue on mobile devices', responsibility: 'Sarah Wilson', function: 'Frontend', targetDate: '2024-03-25', status: 'Closed' },
  ]);

  // Summary data
  const [summaryData, setSummaryData] = useState({
    budgetApproved: '$2,500,000',
    budgetUtilized: '$1,850,000',
    budgetBalance: '$650,000',
    budgetOutlook: '72%',
    resourceDeployed: '24',
    resourceUtilized: '18',
    resourceShortage: '6',
    resourceUnderUtilized: '3',
    qualityTotal: '42',
    qualityCompleted: '28',
    qualityOpen: '14',
    qualityCritical: '7'
  });

  // Budget Table Data (Array of Arrays to support Handsontable Excel-like editing natively)
  const [budgetTableData, setBudgetTableData] = useState([
    ['Category', 'Department', 'Estimation', 'Approved', 'Utilized', 'Balance', 'Outlook Spend', 'Likely Cummulative Spend'],
    ['CAPEX', '', '', '', '', '', '', ''],
    ['Total CAPEX', '', '', '', '', '', '', ''],
    ['Revenue', '', '', '', '', '', '', ''],
    ['Total Revenue', '', '', '', '', '', '', '']
  ]);

  // Modal States
  const [showEditMilestones, setShowEditMilestones] = useState(false);
  const [showEditIssues, setShowEditIssues] = useState(false);
  const [showEditSummary, setShowEditSummary] = useState(false);
  const [editType, setEditType] = useState(null); // 'budget', 'resource', 'quality', 'budgetTable'

  // Form States
  const [milestoneForm, setMilestoneForm] = useState(null);
  const [issuesForm, setIssuesForm] = useState([]);
  const [summaryForm, setSummaryForm] = useState({});
  const [budgetTableForm, setBudgetTableForm] = useState([]);


  // Project Master Data
  const [masterProjects, setMasterProjects] = useState([]);
  const [selectedBudgetProject, setSelectedBudgetProject] = useState('');

  // Budget Modal Specific Edit States for Name & Status
  const [modalProjectName, setModalProjectName] = useState('');
  const [modalProjectStatus, setModalProjectStatus] = useState('');
  const [showSaveNotification, setShowSaveNotification] = useState(false);
  const [budgetCurrency, setBudgetCurrency] = useState('$');

  // Fetch Master Projects for dropdown
  useEffect(() => {
    const fetchMasterProjects = async () => {
      try {
        const { default: API } = await import('../utils/api');
        const response = await API.get('/projects/');
        if (response.data) {
          setMasterProjects(response.data);
        }
      } catch (error) {
        console.error('Error fetching master projects:', error);
      }
    };
    fetchMasterProjects();
  }, []);

  // Sync selected budget project with activeProject initially
  useEffect(() => {
    if (activeProject && activeProject.name) {
      setSelectedBudgetProject(activeProject.name);
    }
  }, [activeProject]);

  // Fetch budget table data when selectedBudgetProject changes
  useEffect(() => {
    const fetchBudget = async () => {
      const targetProject = selectedBudgetProject || (activeProject ? activeProject.name : null);
      if (!targetProject) return;
      try {
        const { default: API } = await import('../utils/api');
        const response = await API.get(`/budget/${encodeURIComponent(targetProject)}`);
        if (response.data && response.data.budget_data && response.data.budget_data.length > 0) {
          setBudgetTableData(response.data.budget_data);
          setBudgetCurrency(response.data.currency || '$');
        } else {
          // Reset to default
          setBudgetCurrency('$');
          setBudgetTableData([
            ['Category', 'Department', 'Estimation', 'Approved', 'Utilized', 'Balance', 'Outlook Spend', 'Likely Cummulative Spend'],
            ['CAPEX', '', '', '', '', '', '', ''],
            ['Total CAPEX', '', '', '', '', '', '', ''],
            ['Revenue', '', '', '', '', '', '', ''],
            ['Total Revenue', '', '', '', '', '', '', '']
          ]);
        }
      } catch (error) {
        console.error('Error fetching budget data:', error);
      }
    };
    fetchBudget();
  }, [selectedBudgetProject, activeProject]);

  // Load submodule data from API
  const loadSubmoduleData = async (trackerId) => {
    try {
      const { default: API } = await import('../utils/api');
      const response = await API.get(`/datasets/${trackerId}/excel-view`);

      const sheet = response.data.fileData?.sheets?.[0] || {};
      const headers = sheet.headers || [];
      const data = sheet.data || [];

      setSubmoduleData(prev => ({
        ...prev,
        [trackerId]: {
          headers: headers,
          rows: data.map(rowArray => {
            const rowObj = {};
            headers.forEach((h, i) => {
              rowObj[h] = rowArray[i];
            });
            return rowObj;
          })
        }
      }));
    } catch (error) {
      console.error('Error loading submodule data:', error);
    }
  };

  // Handle data optimization logic (re-processing)
  const handleSubmoduleProcess = async (trackerId, indices) => {
    try {
      setLoading(true);
      const { default: API } = await import('../utils/api');
      const payload = indices && indices.length > 0 ? { row_indices: indices } : {};
      const response = await API.post(`/datasets/${trackerId}/process`, payload);

      console.log('Successfully processed submodule data for tracker:', trackerId);

      // Refresh the data to reflect updated types/headers
      await loadSubmoduleData(trackerId);

      // We also need to refresh the projects list because column metadata might have changed
      // which affects chart axis selection
      const datasetsResponse = await API.get('/datasets/');
      // (Optional: Implement a more targeted refresh if projects state is huge)

    } catch (error) {
      console.error('Error processing submodule data:', error);
      alert('Failed to optimize data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle local data updates from ExcelTableViewer to keep charts in sync
  const handleSubmoduleDataUpdate = async (trackerId, updatedRows, updatedHeaders) => {
    try {
      // Update local state first for immediate feedback
      setSubmoduleData(prev => ({
        ...prev,
        [trackerId]: {
          headers: updatedHeaders,
          rows: updatedRows
        }
      }));

      // Call API to persist changes
      const { default: API } = await import('../utils/api');
      await API.put(`/datasets/${trackerId}/data`, {
        headers: updatedHeaders,
        data: updatedRows
      });

      console.log('Successfully saved submodule data for tracker:', trackerId);
    } catch (error) {
      console.error('Error saving submodule data:', error);
      alert('Failed to save changes to the database. Please try again.');
    }
  };
  // Handle submodule data loading from URL
  useEffect(() => {
    if (submoduleId && activeProject) {
      const sub = activeProject.submodules?.find(s => s.id === submoduleId || s.trackerId === submoduleId || `project-file-${s.trackerId}` === submoduleId);
      if (sub && !submoduleData[sub.trackerId]) {
        loadSubmoduleData(sub.trackerId);
      }
    }
  }, [submoduleId, activeProject, submoduleData]);

  // Handle selected file ID prop from Dashboard (Sidebar)
  useEffect(() => {
    if (selectedFileId && projects.length > 0) {
      // Find the project and submodule
      for (const project of projects) {
        const fileMatch = project.submodules?.find(s =>
          s.trackerId === selectedFileId ||
          `project-file-${s.trackerId}` === selectedFileId ||
          s.id === selectedFileId
        );

        if (fileMatch) {
          setSearchParams(prev => {
            prev.set('projectId', project.id);
            prev.set('submoduleId', fileMatch.id || fileMatch.trackerId);
            prev.delete('configure');
            prev.delete('preview');
            return prev;
          });
          break;
        }
      }
    }
  }, [selectedFileId, projects, setSearchParams]);

  // Handle submodule click
  const handleSubmoduleClick = (submodule) => {
    setSearchParams(prev => {
      prev.set('submoduleId', submodule.id || submodule.trackerId);
      return prev;
    });
    loadSubmoduleData(submodule.trackerId);
  };

  // Handle back to project dashboard
  const handleBackToProjectDashboard = () => {
    setSearchParams(prev => {
      prev.delete('submoduleId');
      return prev;
    });
  };

  // Handle project selection
  const handleProjectSelect = (projectId) => {
    // Look up by ID or Name for robustness
    const selectedProject = projects.find(p => p.id === projectId || p.name === projectId);

    if (selectedProject?.dashboardConfig) {
      setSearchParams({ projectId: selectedProject.id });
      setVisibleSections(selectedProject.dashboardConfig.visibleSections || {});
    } else if (selectedProject) {
      // If no config, go straight to configure modal
      // We use push here because it's a new "page" transition from the list
      setSearchParams({ projectId: selectedProject.id, configure: 'true' });
    }
  };

  // Prefetch data for all submodules whenever activeProject changes
  useEffect(() => {
    if (activeProject?.submodules) {
      activeProject.submodules.forEach(sub => {
        if (!submoduleData[sub.trackerId] || submoduleData[sub.trackerId].rows.length === 0) {
          loadSubmoduleData(sub.trackerId);
        }
      });
    }
  }, [activeProject]);

  // Handle apply dashboard configuration
  const handleApplyDashboardConfig = () => {
    if (activeProject) {
      // Update project with dashboard config in global store
      dispatch(updateProjectConfig({
        projectId: activeProject.id,
        config: { visibleSections: tempVisibleSections }
      }));


      // Commit buffer to live state
      setVisibleSections(tempVisibleSections);

      // Initialize chart types and axis configs for this project if not exists
      const currentChartTypes = { ...chartTypes[activeProject.id] };
      const currentAxisConfigs = { ...axisConfigs[activeProject.id] };
      let updated = false;

      // Default phases
      const defaultPhases = ['design', 'build', 'gateway', 'validation', 'qualityIssues'];
      defaultPhases.forEach(phase => {
        if (!currentChartTypes[phase]) {
          currentChartTypes[phase] = phase === 'build' ? 'pie' : (phase === 'gateway' ? 'area' : 'bar');
          updated = true;
        }
        if (!currentAxisConfigs[phase]) {
          currentAxisConfigs[phase] = { xAxis: '', yAxis: '' };
          updated = true;
        }
      });

      // Dynamic trackers
      (activeProject.submodules || []).forEach(sub => {
        if (!currentChartTypes[sub.id]) {
          currentChartTypes[sub.id] = 'bar';
          updated = true;
        }
        if (!currentAxisConfigs[sub.id]) {
          currentAxisConfigs[sub.id] = { xAxis: '', yAxis: '' };
          updated = true;
        }
      });

      if (updated) {
        setChartTypes(prev => ({
          ...prev,
          [activeProject.id]: currentChartTypes
        }));

        setAxisConfigs(prev => ({
          ...prev,
          [activeProject.id]: currentAxisConfigs
        }));

        // Persist defaults to Redux
        dispatch(updateProjectConfig({
          projectId: activeProject.id,
          config: {
            chartTypes: currentChartTypes,
            axisConfigs: currentAxisConfigs
          }
        }));
      }

      setShowSimulateModal(false);
    }
  };

  // Handle back to projects list
  const handleBackToProjects = () => {
    setSearchParams({}); // Clear all params to go back to list
    // Reset visible sections to empty state
    setVisibleSections({
      milestones: false,
      criticalIssues: false,
      budget: false,
      resource: false,
      quality: false,
      design: false,
      build: false,
      gateway: false,
      validation: false,
      qualityIssues: false,
      sopTables: false
    });
    window.dispatchEvent(new CustomEvent('resetProjectDashboardMain'));
  };

  // Handle cancel configuration
  const handleCancelConfig = () => {
    if (activeProject && !activeProject.dashboardConfig) {
      handleBackToProjects();
    } else if (activeProject && activeProject.dashboardConfig) {
      setVisibleSections(activeProject.dashboardConfig.visibleSections || {});
    }
    setShowSimulateModal(false);
  };

  // Handle chart type change
  const handleChartTypeChange = (chartId, type) => {
    if (activeProject) {
      const updatedTypes = {
        ...chartTypes[activeProject.id],
        [chartId]: type
      };

      setChartTypes(prev => ({
        ...prev,
        [activeProject.id]: updatedTypes
      }));

      // Persist to Redux
      dispatch(updateProjectConfig({
        projectId: activeProject.id,
        config: { chartTypes: updatedTypes }
      }));
    }
  };

  // Handle axis configuration change
  const handleAxesUpdate = (chartId, xAxis, yAxis, derivedConfig = null) => {
    if (activeProject) {
      const projectAxes = axisConfigs[activeProject.id] || {};
      const updatedAxes = {
        ...projectAxes,
        [chartId]: {
          xAxis,
          yAxis,
          derivedConfig
        }
      };

      setAxisConfigs(prev => ({
        ...prev,
        [activeProject.id]: updatedAxes
      }));

      // If we have a derived metric, default the chart type to 'bar'
      if (derivedConfig) {
        handleChartTypeChange(chartId, 'bar');
      }

      // Persist to Redux
      dispatch(updateProjectConfig({
        projectId: activeProject.id,
        config: { axisConfigs: updatedAxes }
      }));
    }
  };

  // Handle maximize chart
  const handleMaximize = (chartId) => {
    setMaximizedChart(chartId);
  };

  // Handle close maximize
  const handleCloseMaximize = () => {
    setMaximizedChart(null);
  };

  // Toggle axis selector
  const toggleAxisSelector = (chartId) => {
    setShowAxisSelector(showAxisSelector === chartId ? null : chartId);
  };

  // Handle section visibility toggle - MODIFIED to use buffer
  const handleSectionVisibilityToggle = (section) => {
    setTempVisibleSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Handle select all sections for visibility
  const handleSelectAllVisibility = () => {
    const dynamicTrackerKeys = (activeProject?.submodules || []).map(sub => sub.id);
    const availableSectionKeys = [
      'milestones', 'criticalIssues', 'sopTables',
      'budget', 'resource', 'quality',
      ...['design', 'build', 'gateway', 'validation', 'qualityIssues'],
      ...dynamicTrackerKeys
    ].filter(key => {
      if (['design', 'build', 'gateway', 'validation', 'qualityIssues'].includes(key)) {
        return availablePhases[key];
      }
      return true;
    });

    const allSelected = availableSectionKeys.every(key => tempVisibleSections[key]);
    const setTarget = !allSelected;

    // Create new object, taking care to not turn on unavailable ones
    const newVisibleSections = { ...tempVisibleSections };
    Object.keys(tempVisibleSections).forEach(key => {
      if (availableSectionKeys.includes(key)) {
        newVisibleSections[key] = setTarget;
      } else {
        // If it's a dynamic tracker that's available, it should be in availableSectionKeys
        // If it's not in availableSectionKeys, it might be an old tracker from another project
        // We should probably preserve it or only clear if it's explicitly not available for THIS project
        if (dynamicTrackerKeys.includes(key)) {
          newVisibleSections[key] = setTarget;
        } else {
          // Fixed keys that are not available should be false
          const fixedKeys = ['milestones', 'criticalIssues', 'sopTables', 'budget', 'resource', 'quality', 'design', 'build', 'gateway', 'validation', 'qualityIssues'];
          if (fixedKeys.includes(key) && !availableSectionKeys.includes(key)) {
            newVisibleSections[key] = false;
          }
        }
      }
    });

    setTempVisibleSections(newVisibleSections);
  };

  // Handle section selection for email
  const handleSectionToggle = (section) => {
    setEmailData(prev => ({
      ...prev,
      selectedSections: {
        ...prev.selectedSections,
        [section]: !prev.selectedSections[section]
      }
    }));
  };

  // Handle select all sections for email
  const handleSelectAll = () => {
    const availableSectionKeys = Object.keys(emailData.selectedSections).filter(key => {
      const metricKeys = ['design', 'build', 'gateway', 'validation', 'qualityIssues'];
      if (metricKeys.includes(key)) return availablePhases[key];
      return true;
    });

    const allSelected = availableSectionKeys.every(key => emailData.selectedSections[key]);
    const setTarget = !allSelected;

    const newSelectedSections = { ...emailData.selectedSections };
    Object.keys(emailData.selectedSections).forEach(key => {
      if (availableSectionKeys.includes(key)) {
        newSelectedSections[key] = setTarget;
      } else {
        newSelectedSections[key] = false;
      }
    });

    setEmailData(prev => ({
      ...prev,
      selectedSections: newSelectedSections
    }));
  };

  // Handle email input change
  const handleEmailInputChange = (index, value, type) => {
    const newInputs = [...emailData[`${type}Inputs`]];
    newInputs[index] = value;

    // Add new empty input if this is the last one and not empty
    if (index === newInputs.length - 1 && value.trim() !== '') {
      newInputs.push('');
    }

    setEmailData(prev => ({
      ...prev,
      [`${type}Inputs`]: newInputs
    }));
  };

  // Add contact from list
  const addContactFromList = (email, type) => {
    const inputs = emailData[`${type}Inputs`];
    // Check if email already exists
    if (!inputs.includes(email) && email.trim() !== '') {
      const newInputs = [...inputs];
      // Replace empty last input or add new
      if (newInputs[newInputs.length - 1] === '') {
        newInputs[newInputs.length - 1] = email;
        newInputs.push('');
      } else {
        newInputs.push(email);
        newInputs.push('');
      }

      setEmailData(prev => ({
        ...prev,
        [`${type}Inputs`]: newInputs
      }));
    }

    // Clear search and close dropdown
    setEmployeeSearchTerm('');
    setShowEmployeeDropdown(false);
  };

  // Remove email input
  const removeEmailInput = (index, type) => {
    const newInputs = emailData[`${type}Inputs`].filter((_, i) => i !== index);
    setEmailData(prev => ({
      ...prev,
      [`${type}Inputs`]: newInputs.length ? newInputs : ['']
    }));
  };

  // Handle direct download of PDF
  const handleDownloadPdf = async () => {
    try {
      setLoading(true);

      // Tier 3: Pre-capture all live echarts into base64 images BEFORE switching to PDF mode
      const capturedImages = {};
      Object.keys(chartRefs.current).forEach(id => {
        const instance = chartRefs.current[id]?.getEchartsInstance();
        if (instance) {
          // getDataURL safely grabs current canvas as pixel-perfect snapshot
          capturedImages[id] = instance.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: '#fff' });
        }
      });
      setPdfChartImages(capturedImages);

      setIsCapturingPdf(true);

      // Give React time to remove editor scaffolding and swap echarts to <img> tags
      await new Promise(resolve => setTimeout(resolve, 800));

      const pageContainers = document.querySelectorAll('.pdf-page-container');
      const pdf = new jsPDF('p', 'mm', pdfGlobalStyles.pageSize || 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      for (let i = 0; i < pageContainers.length; i++) {
        const printableArea = pageContainers[i].querySelector('.pdf-printable-area');
        if (!printableArea) continue;

        const canvas = await html2canvas(printableArea, {
          scale: 2,
          useCORS: true,
          logging: false,
          allowTaint: true,
          backgroundColor: null
        });

        const imgData = canvas.toDataURL('image/png');

        const finalPdfWidth = pdfWidth;
        const finalPdfHeight = (canvas.height * pdfWidth) / canvas.width;

        if (i > 0) pdf.addPage();

        // Smart vertical centering if content is shorter than A4
        let yPos = 0;
        if (finalPdfHeight < pdfHeight) {
          yPos = (pdfHeight - finalPdfHeight) / 2;
        }

        pdf.addImage(imgData, 'PNG', 0, yPos, finalPdfWidth, finalPdfHeight);
      }

      pdf.save(`Project_Report_${activeProject?.name?.replace(/\s+/g, '_') || 'Dashboard'}.pdf`);
    } catch (error) {
      console.error('PDF Download Failure:', error);
      alert('Failed to download report. Technical logs available in console.');
    } finally {
      setLoading(false);
      setIsCapturingPdf(false);
    }
  };

  // Handle send email with multi-page capture
  const handleSendEmail = async () => {
    const toEmails = emailData.emailInputs.filter(email => email.trim() !== '');
    const ccEmails = emailData.ccInputs.filter(email => email.trim() !== '');
    const bccEmails = emailData.bccInputs.filter(email => email.trim() !== '');

    if (toEmails.length === 0) {
      alert("At least one recipient (To) is required.");
      return;
    }

    if (!window.confirm("Ready to dispatch? This will capture a high-fidelity scan of the report and email it directly to the designated stakeholders.")) {
      return;
    }

    try {
      setLoading(true);

      // Tier 3: Pre-capture all live echarts into base64 images BEFORE switching to PDF mode
      const capturedImages = {};
      Object.keys(chartRefs.current).forEach(id => {
        const instance = chartRefs.current[id]?.getEchartsInstance();
        if (instance) {
          capturedImages[id] = instance.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: '#fff' });
        }
      });
      setPdfChartImages(capturedImages);

      setIsCapturingPdf(true);

      // Give React time to remove editor scaffolding and swap echarts to <img> tags
      await new Promise(resolve => setTimeout(resolve, 800));

      const pageContainers = document.querySelectorAll('.pdf-page-container');
      const pdf = new jsPDF('p', 'mm', pdfGlobalStyles.pageSize || 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      for (let i = 0; i < pageContainers.length; i++) {
        const printableArea = pageContainers[i].querySelector('.pdf-printable-area');
        if (!printableArea) continue;

        const canvas = await html2canvas(printableArea, {
          scale: 2,
          useCORS: true,
          logging: false,
          allowTaint: true,
          backgroundColor: null
        });

        const imgData = canvas.toDataURL('image/png');

        const finalPdfWidth = pdfWidth;
        const finalPdfHeight = (canvas.height * pdfWidth) / canvas.width;

        if (i > 0) pdf.addPage();

        // Smart vertical centering if content is shorter than A4
        let yPos = 0;
        if (finalPdfHeight < pdfHeight) {
          yPos = (pdfHeight - finalPdfHeight) / 2;
        }

        pdf.addImage(imgData, 'PNG', 0, yPos, finalPdfWidth, finalPdfHeight);
      }

      const base64Pdf = pdf.output('datauristring');
      const { default: API } = await import('../utils/api');

      const payload = {
        to: toEmails,
        cc: ccEmails.length > 0 ? ccEmails : [],
        bcc: bccEmails.length > 0 ? bccEmails : [],
        subject: emailData.subject || 'Project Status Report',
        message: emailData.message || 'Please find the attached professional project report.',
        attachment: base64Pdf
      };

      await API.post('/email/send', payload);
      alert('Strategic Report successfully dispatched!');

      setShowEmailModal(false);
      setShowPdfPreviewModal(false);
    } catch (error) {
      console.error('Email Dispatch Failure:', error);
      alert('Failed to send report. Technical logs available in console.');
    } finally {
      setLoading(false);
      setIsCapturingPdf(false);
    }
  };

  // Render table for submodule data
  const renderSubmoduleTable = (data, fileName) => {
    if (!data) {
      return (
        <div style={{ textAlign: 'center', padding: '50px', color: '#6b7280' }}>
          No data available for this submodule
        </div>
      );
    }

    // Handle different data formats
    let rows = [];
    let columns = [];

    if (Array.isArray(data)) {
      rows = data;
      if (data.length > 0) {
        columns = Object.keys(data[0]);
      }
    } else if (data.data && Array.isArray(data.data)) {
      rows = data.data;
      if (data.columns) {
        columns = data.columns;
      } else if (data.data.length > 0) {
        columns = Object.keys(data.data[0]);
      }
    } else if (data.rows && Array.isArray(data.rows)) {
      rows = data.rows;
      if (data.headers) {
        columns = data.headers;
      } else if (data.rows.length > 0) {
        columns = Object.keys(data.rows[0]);
      }
    }

    if (rows.length === 0) {
      return (
        <div style={{ textAlign: 'center', padding: '50px', color: '#6b7280' }}>
          No data rows available
        </div>
      );
    }

    return (
      <ExcelTableViewer
        key={`excel-viewer-${selectedSubmodule.trackerId}`}
        columns={columns}
        data={rows}
        fileName={fileName || 'Dataset'}
        onDataUpdate={(updatedRows, updatedHeaders) => handleSubmoduleDataUpdate(selectedSubmodule.trackerId, updatedRows, updatedHeaders)}
        onProcessData={(indices) => handleSubmoduleProcess(selectedSubmodule.trackerId, indices)}
        onRefresh={() => loadSubmoduleData(selectedSubmodule.trackerId)}
        loading={loading}
      />
    );
  };

  // Handle Print Preview via Search Params
  const showPdfPreviewModal = searchParams.get('preview') === 'pdf';
  const setShowPdfPreviewModal = (show) => {
    if (show) {
      setSearchParams(prev => {
        prev.set('preview', 'pdf');
        return prev;
      });
    } else {
      setSearchParams(prev => {
        prev.delete('preview');
        return prev;
      });
    }
  };
  const [pdfLayoutOrder, setPdfLayoutOrder] = useState([]);

  const openPrintPreview = () => {
    const selected = Object.entries(emailData.selectedSections)
      .filter(([_, selected]) => selected)
      .map(([section]) => section);

    if (selected.length === 0) {
      alert('No sections selected to preview.');
      return;
    }

    // Auto-Pagination Logic: Smartly distribute sections across pages to prevent clutter
    // Enterprise Standard: Max 4 modules per page to maintain A4 aspect ratio readability
    const SECTIONS_PER_PAGE = 4;
    const paginatedSections = [];
    for (let i = 0; i < selected.length; i += SECTIONS_PER_PAGE) {
      paginatedSections.push(selected.slice(i, i + SECTIONS_PER_PAGE));
    }

    setPdfPages(paginatedSections.length > 0 ? paginatedSections : [[]]);
    setActivePageIndex(0);

    // Initialize custom content for each section if not present
    setPdfCustomContent(prev => {
      const newContent = { ...prev };
      selected.forEach(key => {
        if (!newContent[key]) {
          const defaultTitle = key === 'sopTables' ? 'SOP Tables' :
            key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1');
          newContent[key] = {
            title: defaultTitle,
            notes: '',
            alignment: 'left',
            size: 'Medium'
          };
        }
      });
      return newContent;
    });

    setShowPdfPreviewModal(true);
    setShowEmailModal(false);
  };

  // Space Analyzer Engine
  const getMaxRows = () => {
    if (pdfGlobalStyles.pageSize === 'a3') return 5;
    if (pdfGlobalStyles.pageSize === 'letter') return 2;
    return 3; // a4 is standard 3 full rows safely
  };

  const calculatePageRows = (pageItems) => {
    let slots = 0;
    let rows = 0;
    (pageItems || []).forEach(key => {
      const layout = pdfCustomContent[key]?.layout || '1-col';
      const need = layout === '1-col' ? 2 : 1;
      if (slots + need > 2) {
        rows++;
        slots = need;
      } else {
        slots += need;
      }
    });
    if (slots > 0) rows++;
    return rows;
  };

  const moveSectionUp = (pageIdx, secIdx) => {
    if (pageIdx === 0 && secIdx === 0) return;

    setPdfPages(prev => {
      const newPages = [...prev.map(p => [...p])];
      if (secIdx > 0) {
        // Move within same page
        const temp = newPages[pageIdx][secIdx];
        newPages[pageIdx][secIdx] = newPages[pageIdx][secIdx - 1];
        newPages[pageIdx][secIdx - 1] = temp;
      } else {
        // Move to previous page
        const section = newPages[pageIdx].splice(secIdx, 1)[0];
        newPages[pageIdx - 1].push(section);

        if (calculatePageRows(newPages[pageIdx - 1]) > getMaxRows()) {
          setCapacityWarning(`⚠️ Page ${pageIdx} exceeds optimal capacity. Items may overlap or compress when printed.`);
          setTimeout(() => setCapacityWarning(''), 5000);
        }
      }
      return newPages;
    });
  };

  const moveSectionDown = (pageIdx, secIdx) => {
    const isLastPage = pageIdx === pdfPages.length - 1;
    const isLastSecOnPage = secIdx === pdfPages[pageIdx].length - 1;

    if (isLastPage && isLastSecOnPage) return;

    setPdfPages(prev => {
      const newPages = [...prev.map(p => [...p])];
      if (!isLastSecOnPage) {
        // Move within same page
        const temp = newPages[pageIdx][secIdx];
        newPages[pageIdx][secIdx] = newPages[pageIdx][secIdx + 1];
        newPages[pageIdx][secIdx + 1] = temp;
      } else {
        // Move to next page
        const section = newPages[pageIdx].splice(secIdx, 1)[0];
        if (!newPages[pageIdx + 1]) newPages[pageIdx + 1] = [];
        newPages[pageIdx + 1].unshift(section);

        if (calculatePageRows(newPages[pageIdx + 1]) > getMaxRows()) {
          setCapacityWarning(`⚠️ Page ${pageIdx + 2} exceeds optimal capacity. Items may overlap or compress when printed.`);
          setTimeout(() => setCapacityWarning(''), 5000);
        }
      }
      return newPages;
    });
  };

  const onDragEnd = (result) => {
    const { source, destination } = result;
    if (!destination) return; // Dropped outside valid droppable

    const extractIdx = (id) => parseInt(id.replace(/[^0-9]/g, ''), 10);
    const sourcePageIdx = extractIdx(source.droppableId);
    const destPageIdx = extractIdx(destination.droppableId);

    // If dropped in the same place
    if (sourcePageIdx === destPageIdx && source.index === destination.index) return;

    setPdfPages(prev => {
      const newPages = prev.map(p => [...p]);
      const [movedSection] = newPages[sourcePageIdx].splice(source.index, 1);

      if (!newPages[destPageIdx]) newPages[destPageIdx] = [];
      newPages[destPageIdx].splice(destination.index, 0, movedSection);

      // Trigger capacity warning dynamically if moved to a different page and it exceeds limits
      if (sourcePageIdx !== destPageIdx && calculatePageRows(newPages[destPageIdx]) > getMaxRows()) {
        setCapacityWarning(`⚠️ Page ${destPageIdx + 1} exceeds optimal capacity. Items may overlap or compress when printed.`);
        setTimeout(() => setCapacityWarning(''), 5000);
      }

      // Automatically jump the view to the destination page if they dropped cross-page
      if (sourcePageIdx !== destPageIdx) {
        setActivePageIndex(destPageIdx);
      }

      return newPages;
    });
  };

  const addPage = () => {
    setPdfPages(prev => [...prev, []]);
    setActivePageIndex(pdfPages.length);
  };

  const removePage = (idx) => {
    if (pdfPages.length <= 1) return;
    setPdfPages(prev => prev.filter((_, i) => i !== idx));
    setActivePageIndex(Math.max(0, idx - 1));
  };

  const handleUpdateCustomContent = (key, field, value) => {
    setPdfCustomContent(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: value
      }
    }));
  };

  // PDF Preview Modal Component
  const renderPdfPreviewModal = () => {
    if (!showPdfPreviewModal && !isCapturingPdf) return null;

    const pageDim = pdfGlobalStyles.pageSize === 'a3' ? { w: '297mm', h: '420mm' } :
      pdfGlobalStyles.pageSize === 'letter' ? { w: '215.9mm', h: '279.4mm' } :
        { w: '210mm', h: '297mm' };

    return (
      <DragDropContext onDragEnd={onDragEnd}>
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: '#0f172a',
          backdropFilter: 'blur(20px)',
          zIndex: 5000,
          display: 'flex',
          overflow: 'hidden',
          fontFamily: pdfGlobalStyles.fontFamily
        }}>
          {/* Workspace Sidebar - Advanced Controls */}
          {!isCapturingPdf && (
            <div style={{
              width: '400px',
              backgroundColor: '#0f172a',
              borderRight: '1px solid #334155',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '20px 0 50px rgba(0,0,0,0.5)',
              zIndex: 5001,
              color: '#f8fafc'
            }}>
              <div style={{ padding: '32px 24px', backgroundColor: '#1e3a5f', borderBottom: '1px solid #334155', position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '900', letterSpacing: '-0.025em' }}>REPORT STUDIO</h2>
                  <div style={{ backgroundColor: '#3b82f6', color: 'white', padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '800' }}>PRO</div>
                </div>
                <p style={{ margin: '8px 0 0', fontSize: '12px', color: '#94a3b8' }}>Advanced Multi-Page Insights Engine</p>

                {capacityWarning && (
                  <div style={{ position: 'absolute', bottom: '-40px', left: '10px', right: '10px', backgroundColor: '#ef4444', color: 'white', padding: '10px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: '700', zIndex: 10, boxShadow: '0 4px 6px rgba(0,0,0,0.3)', transition: 'all 0.3s' }}>
                    {capacityWarning}
                  </div>
                )}
              </div>

              {/* Tab Navigation */}
              <div style={{ display: 'flex', backgroundColor: '#111827', padding: '4px' }}>
                {['structure', 'style', 'page'].map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    style={{
                      flex: 1,
                      padding: '12px',
                      fontSize: '11px',
                      fontWeight: '800',
                      textTransform: 'uppercase',
                      backgroundColor: activeTab === tab ? '#1f2937' : 'transparent',
                      color: activeTab === tab ? '#3b82f6' : '#64748b',
                      border: 'none',
                      cursor: 'pointer',
                      borderRadius: '6px',
                      transition: 'all 0.2s'
                    }}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
                {activeTab === 'structure' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                    {/* Page Management */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <label style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pages & Layout</label>
                        <button
                          onClick={addPage}
                          style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '700' }}
                        >
                          <Plus size={14} /> Add Page
                        </button>
                      </div>

                      {/* NEW COVER PAGE TOGGLE */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', padding: '12px', backgroundColor: '#1e293b', borderRadius: '8px', border: '1px solid #334155' }}>
                        <input
                          type="checkbox"
                          checked={pdfGlobalStyles.includeCoverPage}
                          onChange={e => setPdfGlobalStyles(prev => ({ ...prev, includeCoverPage: e.target.checked }))}
                          style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: '#3b82f6' }}
                        />
                        <span style={{ fontSize: '13px', color: '#f8fafc', fontWeight: '700' }}>Include Cover Page</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {pdfPages.map((page, idx) => {
                          const mxR = getMaxRows();
                          const rows = calculatePageRows(page);
                          const usagePct = Math.min((rows / mxR) * 100, 100);
                          const isOverloaded = rows > mxR;

                          return (
                            <div
                              key={idx}
                              onClick={() => setActivePageIndex(idx)}
                              style={{
                                padding: '12px 16px',
                                backgroundColor: activePageIndex === idx ? '#1e293b' : '#111827',
                                borderRadius: '10px',
                                border: activePageIndex === idx ? '1px solid #3b82f6' : '1px solid #1f2937',
                                cursor: 'pointer',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '6px',
                                transition: 'all 0.2s'
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '13px', fontWeight: activePageIndex === idx ? '700' : '500', color: activePageIndex === idx ? 'white' : '#94a3b8' }}>
                                  Page {idx + 1} {page.length > 0 ? `(${page.length} modules)` : '(Empty)'}
                                </span>
                                {pdfPages.length > 1 && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); removePage(idx); }}
                                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                )}
                              </div>

                              {/* Adaptive Engine Space Graph */}
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                opacity: activePageIndex === idx ? 1 : 0.6
                              }}>
                                <div style={{ flex: 1, height: '4px', backgroundColor: '#334155', borderRadius: '4px', overflow: 'hidden' }}>
                                  <div style={{
                                    height: '100%',
                                    width: `${Math.max(usagePct, 2)}%`,
                                    backgroundColor: isOverloaded ? '#ef4444' : (usagePct > 80 ? '#f59e0b' : '#10b981'),
                                    transition: 'all 0.3s ease'
                                  }} />
                                </div>
                                <span style={{ fontSize: '9px', fontWeight: '800', color: isOverloaded ? '#ef4444' : '#94a3b8' }}>
                                  {rows}/{mxR} U
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Cross-Page Drag & Drop Logic */}
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#64748b', marginBottom: '16px', textTransform: 'uppercase' }}>Cross-Page Organization</label>
                      <p style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '12px' }}>Drag sections between pages to visually reorder your PDF layout.</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {pdfPages.map((pageSections, pIdx) => (
                          <Droppable key={pIdx} droppableId={String(pIdx)}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.droppableProps}
                                style={{
                                  backgroundColor: snapshot.isDraggingOver ? '#1e293b' : 'transparent',
                                  padding: '12px',
                                  borderRadius: '8px',
                                  border: '2px dashed',
                                  borderColor: snapshot.isDraggingOver ? '#3b82f6' : (pIdx === activePageIndex ? '#475569' : '#1e293b'),
                                  minHeight: pageSections.length === 0 ? '60px' : 'auto',
                                  transition: 'all 0.2s',
                                  opacity: (pIdx === activePageIndex || snapshot.isDraggingOver) ? 1 : 0.6
                                }}
                              >
                                <h4 style={{ margin: '0 0 10px', fontSize: '11px', fontWeight: '800', color: pIdx === activePageIndex ? '#f8fafc' : '#64748b', display: 'flex', justifyContent: 'space-between' }}>
                                  PAGE {pIdx + 1}
                                  {snapshot.isDraggingOver && <span style={{ color: '#3b82f6' }}>Drop Here</span>}
                                </h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                  {pageSections.map((sectionKey, secIdx) => (
                                    <Draggable key={`sidebar-${sectionKey}`} draggableId={`sidebar-${sectionKey}`} index={secIdx}>
                                      {(prov, snap) => (
                                        <div
                                          ref={prov.innerRef}
                                          {...prov.draggableProps}
                                          style={{
                                            ...prov.draggableProps.style,
                                            padding: '10px 12px',
                                            backgroundColor: snap.isDragging ? '#2563eb' : '#0f172a',
                                            borderRadius: '6px',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            border: '1px solid',
                                            borderColor: snap.isDragging ? '#60a5fa' : '#334155',
                                            boxShadow: snap.isDragging ? '0 10px 25px rgba(0,0,0,0.5)' : 'none',
                                            opacity: snap.isDragging ? 0.9 : 1
                                          }}
                                        >
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, overflow: 'hidden' }}>
                                            <div {...prov.dragHandleProps} style={{ cursor: 'grab', display: 'flex', alignItems: 'center', color: snap.isDragging ? 'white' : '#64748b' }}>
                                              <GripVertical size={16} />
                                            </div>
                                            <span style={{ fontSize: '12px', color: snap.isDragging ? 'white' : '#f8fafc', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                              {pdfCustomContent[sectionKey]?.title || sectionKey.charAt(0).toUpperCase() + sectionKey.slice(1)}
                                            </span>
                                          </div>
                                          <span style={{ fontSize: '9px', fontWeight: '800', backgroundColor: snap.isDragging ? '#1d4ed8' : '#1e293b', color: snap.isDragging ? '#bfdbfe' : '#64748b', padding: '2px 6px', borderRadius: '4px' }}>
                                            {(pdfCustomContent[sectionKey]?.layout || '1-col').toUpperCase()}
                                          </span>
                                        </div>
                                      )}
                                    </Draggable>
                                  ))}
                                  {pageSections.length === 0 && !snapshot.isDraggingOver && (
                                    <div style={{ fontSize: '11px', color: '#64748b', fontStyle: 'italic', textAlign: 'center', padding: '10px 0' }}>Empty Page</div>
                                  )}
                                </div>
                              </div>
                            )}
                          </Droppable>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'style' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                    {/* Typography Control */}
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#64748b', marginBottom: '16px', textTransform: 'uppercase' }}>Typography</label>
                      <select
                        value={pdfGlobalStyles.fontFamily}
                        onChange={(e) => setPdfGlobalStyles(prev => ({ ...prev, fontFamily: e.target.value }))}
                        style={{ width: '100%', padding: '12px', backgroundColor: '#111827', border: '1px solid #334155', borderRadius: '8px', color: 'white', outline: 'none' }}
                      >
                        <option value="Inter, sans-serif">Inter (Modern)</option>
                        <option value="'Roboto', sans-serif">Roboto (Clean)</option>
                        <option value="'Playfair Display', serif">Playfair (Premium)</option>
                        <option value="system-ui, sans-serif">System UI</option>
                      </select>
                    </div>

                    {/* Spacing Control */}
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#64748b', marginBottom: '16px', textTransform: 'uppercase' }}>Global Content Density</label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {['Compact', 'Normal', 'Comfortable'].map(s => (
                          <button
                            key={s}
                            onClick={() => setPdfGlobalStyles(prev => ({ ...prev, spacing: s }))}
                            style={{
                              flex: 1,
                              padding: '10px 4px',
                              fontSize: '11px',
                              borderRadius: '8px',
                              backgroundColor: pdfGlobalStyles.spacing === s ? '#3b82f6' : '#111827',
                              color: pdfGlobalStyles.spacing === s ? 'white' : '#64748b',
                              border: 'none',
                              cursor: 'pointer',
                              fontWeight: '700'
                            }}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Background Presets */}
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#64748b', marginBottom: '16px', textTransform: 'uppercase' }}>Background Design</label>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px', marginBottom: '16px' }}>
                        {[
                          { name: 'Classic', color: '#ffffff', type: 'solid' },
                          { name: 'Soft', color: '#f8fafc', type: 'solid' },
                          { name: 'Enterprise', gradient: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', type: 'gradient' },
                          { name: 'Premium', gradient: 'linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)', type: 'gradient' },
                          { name: 'Corporate', gradient: 'linear-gradient(to right, #243b55, #141e30)', type: 'gradient' }
                        ].map((bg, idx) => (
                          <button
                            key={idx}
                            onClick={() => setPdfBackground({ ...pdfBackground, ...bg })}
                            style={{
                              width: '100%',
                              aspectRatio: '1/1',
                              borderRadius: '10px',
                              background: bg.type === 'solid' ? bg.color : bg.gradient,
                              border: pdfBackground.name === bg.name ? '2px solid #3b82f6' : '1px solid #334155',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              transform: pdfBackground.name === bg.name ? 'scale(1.1)' : 'scale(1)'
                            }}
                          />
                        ))}
                      </div>

                      <div style={{ marginTop: '24px', padding: '16px', backgroundColor: '#111827', borderRadius: '12px', border: '1px solid #334155' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                          <Layout size={16} color="#3b82f6" />
                          <span style={{ fontSize: '12px', fontWeight: '800', color: '#f8fafc' }}>PAGINATION ENGINE</span>
                        </div>
                        <button
                          onClick={() => {
                            const allSections = pdfPages.flat();
                            const newPages = [[]];
                            let currentPageIdx = 0;
                            allSections.forEach((sec, idx) => {
                              if (idx > 0 && idx % 4 === 0) {
                                newPages.push([]);
                                currentPageIdx++;
                              }
                              newPages[currentPageIdx].push(sec);
                            });
                            setPdfPages(newPages);
                            setActivePageIndex(0);
                          }}
                          style={{
                            width: '100%',
                            padding: '10px',
                            backgroundColor: '#1e293b',
                            color: '#3b82f6',
                            border: '1px solid #334155',
                            borderRadius: '8px',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            cursor: 'pointer'
                          }}
                        >
                          Auto-Distribute Sections
                        </button>
                      </div>

                      {/* Custom Background Image */}
                      <div>
                        <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>BRAND IMAGE URL</span>
                        <input
                          type="text"
                          placeholder="https://example.com/logo.png"
                          value={pdfBackground.imageUrl}
                          onChange={(e) => setPdfBackground(prev => ({ ...prev, imageUrl: e.target.value, type: e.target.value ? 'image' : prev.type }))}
                          style={{ width: '100%', padding: '10px', backgroundColor: '#111827', border: '1px solid #334155', borderRadius: '8px', color: 'white', marginTop: '6px', fontSize: '13px' }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'page' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                    {/* Cover Page Options */}
                    {pdfGlobalStyles.includeCoverPage && (
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#64748b', marginBottom: '16px', textTransform: 'uppercase' }}>Cover Page Details</label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                          <div>
                            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>PREPARED BY</span>
                            <input
                              type="text"
                              placeholder="e.g. John Doe, Lead Analyst"
                              value={pdfGlobalStyles.preparedBy || ''}
                              onChange={(e) => setPdfGlobalStyles(prev => ({ ...prev, preparedBy: e.target.value }))}
                              style={{ width: '100%', padding: '10px', backgroundColor: '#111827', border: '1px solid #334155', borderRadius: '8px', color: 'white', marginTop: '6px', fontSize: '13px' }}
                            />
                          </div>
                          <div>
                            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>COVER LOGO URL (Optional)</span>
                            <input
                              type="text"
                              placeholder="https://example.com/logo.png"
                              value={pdfGlobalStyles.coverLogoUrl || ''}
                              onChange={(e) => setPdfGlobalStyles(prev => ({ ...prev, coverLogoUrl: e.target.value }))}
                              style={{ width: '100%', padding: '10px', backgroundColor: '#111827', border: '1px solid #334155', borderRadius: '8px', color: 'white', marginTop: '6px', fontSize: '13px' }}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Page Size Selector */}
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#64748b', marginBottom: '16px', textTransform: 'uppercase' }}>Page Size</label>
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '32px' }}>
                        {['a4', 'a3', 'letter'].map(size => (
                          <button
                            key={size}
                            onClick={() => setPdfGlobalStyles(prev => ({ ...prev, pageSize: size }))}
                            style={{
                              flex: 1,
                              padding: '10px 4px',
                              fontSize: '11px',
                              borderRadius: '8px',
                              backgroundColor: pdfGlobalStyles.pageSize === size ? '#3b82f6' : '#111827',
                              color: pdfGlobalStyles.pageSize === size ? 'white' : '#64748b',
                              border: 'none',
                              cursor: 'pointer',
                              fontWeight: '700',
                              textTransform: 'uppercase'
                            }}
                          >
                            {size}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Header Footer Controls */}
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#64748b', marginBottom: '16px', textTransform: 'uppercase' }}>Header & Footer</label>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div>
                          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>HEADER LABEL</span>
                          <input
                            type="text"
                            value={pdfGlobalStyles.headerText}
                            onChange={(e) => setPdfGlobalStyles(prev => ({ ...prev, headerText: e.target.value }))}
                            style={{ width: '100%', padding: '10px', backgroundColor: '#111827', border: '1px solid #334155', borderRadius: '8px', color: 'white', marginTop: '6px', fontSize: '13px' }}
                          />
                        </div>
                        <div>
                          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>FOOTER NOTE</span>
                          <input
                            type="text"
                            value={pdfGlobalStyles.footerText}
                            onChange={(e) => setPdfGlobalStyles(prev => ({ ...prev, footerText: e.target.value }))}
                            style={{ width: '100%', padding: '10px', backgroundColor: '#111827', border: '1px solid #334155', borderRadius: '8px', color: 'white', marginTop: '6px', fontSize: '13px' }}
                          />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <input
                            type="checkbox"
                            checked={pdfGlobalStyles.showPageNumbers}
                            onChange={(e) => setPdfGlobalStyles(prev => ({ ...prev, showPageNumbers: e.target.checked }))}
                            style={{ cursor: 'pointer' }}
                          />
                          <span style={{ fontSize: '13px', color: '#94a3b8' }}>Include Page Numbers</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Primary Actions */}
              <div style={{ padding: '24px', backgroundColor: '#111827', borderTop: '1px solid #334155' }}>
                <button
                  onClick={() => setShowEmailModal(true)}
                  style={{
                    width: '100%',
                    padding: '16px',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    borderRadius: '12px',
                    border: 'none',
                    fontWeight: '900',
                    fontSize: '15px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                    boxShadow: '0 4px 14px 0 rgba(59, 130, 246, 0.4)',
                    textTransform: 'uppercase'
                  }}
                >
                  <Send size={18} /> Send via Email
                </button>
                <button
                  onClick={handleDownloadPdf}
                  style={{
                    width: '100%',
                    marginTop: '12px',
                    padding: '16px',
                    backgroundColor: 'transparent',
                    color: '#3b82f6',
                    borderRadius: '12px',
                    border: '2px solid #3b82f6',
                    fontWeight: '900',
                    fontSize: '15px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                    textTransform: 'uppercase'
                  }}
                >
                  <Download size={18} /> Download PDF
                </button>
                <button
                  onClick={() => setShowPdfPreviewModal(false)}
                  style={{
                    width: '100%',
                    marginTop: '12px',
                    padding: '14px',
                    background: 'none',
                    border: '1px solid #334155',
                    color: '#f87171',
                    borderRadius: '12px',
                    fontSize: '14px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Discard Draft
                </button>
              </div>
            </div>
          )}

          {/* Workspace Hub - Paginated PDF Rendering */}
          <div style={{
            flex: 1,
            padding: isCapturingPdf ? '0' : '80px 40px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            backgroundColor: isCapturingPdf ? 'transparent' : '#0f172a',
            scrollBehavior: 'smooth'
          }}>
            {/* Cover Page Rendering */}
            {pdfGlobalStyles.includeCoverPage && (
              <div
                className="pdf-page-container"
                style={{
                  position: 'relative',
                  marginBottom: isCapturingPdf ? '0' : '60px',
                  opacity: 1,
                  transform: 'scale(1)',
                  transition: 'all 0.4s',
                  fontFamily: pdfGlobalStyles.fontFamily
                }}
              >
                {!isCapturingPdf && (
                  <div style={{
                    position: 'absolute',
                    left: '-100px',
                    top: '0',
                    color: '#64748b',
                    fontWeight: '900',
                    fontSize: '14px',
                    writerMode: 'vertical-rl',
                    borderLeft: '2px solid #3b82f6',
                    paddingLeft: '12px'
                  }}>
                    COVER PAGE
                  </div>
                )}
                <div
                  className="pdf-printable-area"
                  style={{
                    backgroundColor: pdfBackground.type === 'solid' ? (pdfBackground.color || '#ffffff') : 'transparent',
                    backgroundImage: pdfBackground.type === 'image' && pdfBackground.imageUrl
                      ? `linear-gradient(rgba(255,255,255,${1 - pdfBackground.imageOpacity}), rgba(255,255,255,${1 - pdfBackground.imageOpacity})), url(${pdfBackground.imageUrl})`
                      : (pdfBackground.type === 'gradient' ? pdfBackground.gradient : 'none'),
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    width: pageDim.w,
                    minHeight: pageDim.h,
                    padding: '40mm',
                    boxShadow: isCapturingPdf ? 'none' : '0 40px 100px rgba(0,0,0,0.6)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    color: '#1e3a5f',
                    borderRadius: isCapturingPdf ? '0' : '4px',
                    overflow: 'hidden',
                    textAlign: 'center'
                  }}
                >
                  {pdfGlobalStyles.coverLogoUrl && (
                    <img
                      src={pdfGlobalStyles.coverLogoUrl}
                      alt="Cover Logo"
                      style={{ maxHeight: '120px', maxWidth: '300px', marginBottom: '60px', objectFit: 'contain' }}
                      crossOrigin="anonymous"
                    />
                  )}
                  <div style={{ width: '100%', height: '6px', backgroundColor: '#3b82f6', marginBottom: '40px', maxWidth: '120px', borderRadius: '3px' }} />
                  <h1 style={{ fontSize: '48px', fontWeight: '900', letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: '20px', color: '#0f172a' }}>
                    {pdfGlobalStyles.headerText}
                  </h1>
                  <h2 style={{ fontSize: '28px', fontWeight: '700', color: '#1e3a5f', marginBottom: 'auto', opacity: 0.8 }}>
                    Project: {activeProject?.name}
                  </h2>

                  <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', borderTop: '2px solid #e2e8f0', paddingTop: '40px' }}>
                    {pdfGlobalStyles.preparedBy && (
                      <div style={{ fontSize: '18px', color: '#334155', fontWeight: '700' }}>
                        Prepared By: <span style={{ color: '#0f172a' }}>{pdfGlobalStyles.preparedBy}</span>
                      </div>
                    )}
                    <div style={{ fontSize: '15px', color: '#64748b', fontWeight: '600' }}>
                      Date Generated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {pdfPages.map((pageSections, pageIdx) => {
              const isPageEmpty = pageSections.length === 0;
              return (
                <div
                  key={pageIdx}
                  className="pdf-page-container"
                  style={{
                    position: 'relative',
                    marginBottom: isCapturingPdf ? '0' : '60px',
                    opacity: !isCapturingPdf && activePageIndex !== pageIdx ? 0.6 : 1,
                    transform: !isCapturingPdf && activePageIndex !== pageIdx ? 'scale(0.98)' : 'none',
                    transition: 'all 0.4s',
                    zIndex: activePageIndex === pageIdx ? 10 : 1
                  }}
                >
                  {/* Page Overlay Label */}
                  {!isCapturingPdf && (
                    <div style={{
                      position: 'absolute',
                      left: '-100px',
                      top: '0',
                      color: '#64748b',
                      fontWeight: '900',
                      fontSize: '14px',
                      writerMode: 'vertical-rl',
                      borderLeft: '2px solid #3b82f6',
                      paddingLeft: '12px'
                    }}>
                      PAGE {pageIdx + 1}
                    </div>
                  )}

                  <Droppable droppableId={`canvas-page-${pageIdx}`} direction="vertical">
                    {(provided, snapshot) => (
                      <div
                        className="pdf-printable-area"
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        style={{
                          backgroundColor: pdfBackground.type === 'solid' ? (pdfBackground.color || '#ffffff') : 'transparent',
                          backgroundImage: pdfBackground.type === 'image' && pdfBackground.imageUrl
                            ? `linear-gradient(rgba(255,255,255,${1 - pdfBackground.imageOpacity}), rgba(255,255,255,${1 - pdfBackground.imageOpacity})), url(${pdfBackground.imageUrl})`
                            : (pdfBackground.type === 'gradient' ? pdfBackground.gradient : 'none'),
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          width: pageDim.w,
                          minHeight: pageDim.h,
                          padding: '20mm',
                          boxShadow: isCapturingPdf ? 'none' : '0 40px 100px rgba(0,0,0,0.6)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '30px',
                          color: '#1e3a5f',
                          borderRadius: isCapturingPdf ? '0' : '4px',
                          overflow: 'hidden'
                        }}
                      >
                        {/* Page Header */}
                        <div style={{ borderBottom: '2px solid #1e3a5f', paddingBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                          <div>
                            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '900', letterSpacing: '-0.02em' }}>{pdfGlobalStyles.headerText}</h1>
                            <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px', fontWeight: '600' }}>Project: {activeProject?.name} • Confidential</div>
                          </div>
                          <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '800' }}>REPORT ID: {activeProject?.code}-{Math.floor(Date.now() / 100000)}</div>
                        </div>

                        {/* Dynamic Content Rendering */}
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(2, 1fr)',
                          alignItems: 'start',
                          gap: pdfGlobalStyles.spacing === 'Compact' ? '20px' : (pdfGlobalStyles.spacing === 'Normal' ? '40px' : '60px')
                        }}>
                          {isPageEmpty && !snapshot.isDraggingOver ? (
                            <div style={{ gridColumn: 'span 2', padding: '80px', border: '2px dashed #cbd5e1', borderRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', opacity: 0.6 }}>
                              <Layout size={40} color="#94a3b8" />
                              <span style={{ fontSize: '14px', color: '#94a3b8', fontWeight: '600' }}>Empty Page - Move sections here from other pages</span>
                            </div>
                          ) : (
                            pageSections.map((sectionKey, secIdx) => {
                              const customContent = pdfCustomContent[sectionKey] || { title: sectionKey, notes: '', alignment: 'left', size: 'Medium', layout: '1-col' };
                              const isMetric = ['design', 'partDevelopment', 'build', 'gateway', 'validation', 'qualityIssues'].includes(sectionKey) || (activeProject?.submodules || []).some(sub => sub.id === sectionKey);

                              return (
                                <Draggable key={`canvas-${sectionKey}`} draggableId={`canvas-${sectionKey}`} index={secIdx} isDragDisabled={isCapturingPdf}>
                                  {(prov, snap) => (
                                    <div
                                      ref={prov.innerRef}
                                      {...prov.draggableProps}
                                      style={{
                                        ...prov.draggableProps.style,
                                        boxSizing: 'border-box',
                                        gridColumn: customContent.layout === '2-col' ? 'span 1' : 'span 2',
                                        breakInside: 'avoid',
                                        textAlign: customContent.alignment,
                                        position: snap.isDragging ? 'fixed' : 'relative',
                                        padding: isCapturingPdf ? '0' : '20px',
                                        backgroundColor: isCapturingPdf ? 'transparent' : (snap.isDragging ? 'rgba(255, 255, 255, 0.95)' : 'rgba(255, 255, 255, 0.3)'),
                                        borderRadius: '16px',
                                        border: isCapturingPdf ? 'none' : (snap.isDragging ? '2px solid #3b82f6' : '1px solid rgba(255,255,255,0.4)'),
                                        boxShadow: snap.isDragging ? '0 30px 60px rgba(0,0,0,0.2)' : 'none',
                                        zIndex: snap.isDragging ? 999999 : 'auto',
                                      }}
                                    >
                                      {/* Section Header */}
                                      <div style={{
                                        backgroundColor: '#1e293b',
                                        color: 'white',
                                        padding: '10px 18px',
                                        fontSize: '13px',
                                        fontWeight: '900',
                                        marginBottom: '16px',
                                        borderRadius: '10px',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em'
                                      }}>
                                        {!isCapturingPdf ? (
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '60%' }}>
                                            <div {...prov.dragHandleProps} style={{ cursor: 'grab', display: 'flex', color: snap.isDragging ? '#93c5fd' : '#94a3b8' }}>
                                              <GripVertical size={16} />
                                            </div>
                                            <input
                                              value={customContent.title}
                                              onChange={(e) => handleUpdateCustomContent(sectionKey, 'title', e.target.value)}
                                              style={{ background: 'transparent', border: 'none', color: 'white', fontWeight: '900', width: '100%', fontSize: '12px', outline: 'none' }}
                                            />
                                          </div>
                                        ) : (
                                          <span>{customContent.title}</span>
                                        )}

                                        {!isCapturingPdf && (
                                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                            <div style={{ display: 'flex', gap: '3px', marginRight: '10px', borderRight: '1px solid #334155', paddingRight: '10px' }}>
                                              <button title="1-Col" onClick={() => handleUpdateCustomContent(sectionKey, 'layout', '1-col')} style={{ padding: '4px 8px', backgroundColor: customContent.layout !== '2-col' ? '#3b82f6' : '#334155', border: 'none', borderRadius: '4px', cursor: 'pointer', color: 'white', fontSize: '10px', fontWeight: 'bold' }}>1C</button>
                                              <button title="2-Col" onClick={() => handleUpdateCustomContent(sectionKey, 'layout', '2-col')} style={{ padding: '4px 8px', backgroundColor: customContent.layout === '2-col' ? '#3b82f6' : '#334155', border: 'none', borderRadius: '4px', cursor: 'pointer', color: 'white', fontSize: '10px', fontWeight: 'bold' }}>2C</button>
                                              <button title="Left" onClick={() => handleUpdateCustomContent(sectionKey, 'alignment', 'left')} style={{ marginLeft: '6px', padding: '4px 8px', backgroundColor: customContent.alignment === 'left' ? '#3b82f6' : '#334155', border: 'none', borderRadius: '4px', cursor: 'pointer', color: 'white', fontSize: '10px', fontWeight: 'bold' }}>L</button>
                                              <button title="Center" onClick={() => handleUpdateCustomContent(sectionKey, 'alignment', 'center')} style={{ padding: '4px 8px', backgroundColor: customContent.alignment === 'center' ? '#3b82f6' : '#334155', border: 'none', borderRadius: '4px', cursor: 'pointer', color: 'white', fontSize: '10px', fontWeight: 'bold' }}>C</button>
                                            </div>
                                            <button
                                              onClick={() => {
                                                setPdfPages(prev => prev.map((p, i) => i === pageIdx ? p.filter(k => k !== sectionKey) : p));
                                                handleSectionToggle(sectionKey);
                                              }}
                                              style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: '4px' }}
                                            >
                                              <Trash2 size={16} />
                                            </button>
                                          </div>
                                        )}
                                      </div>


                                      {/* Notes and Metrics remain the same but use customContent for titles */}
                                      {/* (Rest of internal rendering logic for tables and charts) */}
                                      {sectionKey === 'milestones' && (
                                        <div style={{ overflow: 'hidden', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                                            <tr style={{ backgroundColor: '#1e293b', color: 'white' }}>
                                              <th style={{ padding: '8px', border: '1px solid #334155' }}>Status</th>
                                              {['A', 'B', 'C', 'D', 'E', 'F'].map(x => <th key={x} style={{ padding: '8px', border: '1px solid #334155' }}>{x}</th>)}
                                            </tr>
                                            <tr style={{ backgroundColor: '#ffffff' }}><td style={{ padding: '8px', border: '1px solid #e2e8f0', fontWeight: '800' }}>PLAN</td>{['a', 'b', 'c', 'd', 'e', 'f'].map(x => <td key={x} style={{ padding: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>{milestones[0].plan[x]}</td>)}</tr>
                                            <tr style={{ backgroundColor: '#f1f5f9' }}><td style={{ padding: '8px', border: '1px solid #e2e8f0', fontWeight: '800' }}>ACTUAL</td>{['a', 'b', 'c', 'd', 'e', 'f'].map(x => <td key={x} style={{ padding: '8px', border: '1px solid #e2e8f0', textAlign: 'center', fontWeight: '700' }}>{milestones[0].actual[x]}</td>)}</tr>
                                          </table>
                                        </div>
                                      )}

                                      {sectionKey === 'criticalIssues' && (
                                        <div style={{ overflow: 'hidden', borderRadius: '12px', border: '1px solid #fee2e2' }}>
                                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                                            <thead>
                                              <tr style={{ backgroundColor: '#991b1b', color: 'white' }}>
                                                <th style={{ padding: '10px', textAlign: 'left', width: '60%' }}>Issue Description</th>
                                                <th style={{ padding: '10px', textAlign: 'center' }}>Severity</th>
                                                <th style={{ padding: '10px', textAlign: 'center' }}>Target Date</th>
                                              </tr>
                                            </thead>
                                            <tbody>
                                              {(criticalIssues || []).map((issue, idx) => (
                                                <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? '#fff' : '#fef2f2', borderBottom: '1px solid #fee2e2' }}>
                                                  <td style={{ padding: '8px 10px', fontWeight: '700', color: '#991b1b' }}>{issue.issue}</td>
                                                  <td style={{ padding: '8px 10px', textAlign: 'center' }}><span style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '2px 6px', borderRadius: '4px', fontWeight: '800', fontSize: '9px' }}>{issue.status.toUpperCase()}</span></td>
                                                  <td style={{ padding: '8px 10px', textAlign: 'center', color: '#ef4444', fontWeight: '800' }}>{issue.targetDate}</td>
                                                </tr>
                                              ))}
                                            </tbody>
                                          </table>
                                        </div>
                                      )}

                                      {sectionKey === 'sopTables' && (
                                        <div style={{ overflow: 'hidden', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                                            <thead>
                                              <tr style={{ backgroundColor: '#f8fafc', color: '#475569' }}>
                                                <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Document Name</th>
                                                <th style={{ padding: '10px', textAlign: 'center', borderBottom: '2px solid #e2e8f0' }}>Rev</th>
                                                <th style={{ padding: '10px', textAlign: 'right', borderBottom: '2px solid #e2e8f0' }}>Status</th>
                                              </tr>
                                            </thead>
                                            <tbody>
                                              {sopData.map((sop, idx) => (
                                                <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                  <td style={{ padding: '8px 10px', fontWeight: '600' }}>{sop.name}</td>
                                                  <td style={{ padding: '8px 10px', textAlign: 'center', color: '#64748b' }}>{sop.daysToGo} Days</td>
                                                  <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                                                    <span style={{ fontSize: '10px', fontWeight: '800', color: sop.health === 'At Risk' ? '#dc2626' : '#059669', backgroundColor: sop.health === 'At Risk' ? '#fee2e2' : '#d1fae5', padding: '2px 8px', borderRadius: '99px' }}>{sop.status.toUpperCase()}</span>
                                                  </td>
                                                </tr>
                                              ))}
                                            </tbody>
                                          </table>
                                        </div>
                                      )}

                                      {sectionKey === 'budget' && (
                                        <div style={{ overflow: 'hidden', borderRadius: '12px', border: '1px solid #bfdbfe', backgroundColor: '#ffffff', boxShadow: isCapturingPdf ? 'none' : '0 10px 15px -3px rgba(0,0,0,0.05)' }}>
                                          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '11px' }}>
                                            <thead>
                                              <tr>
                                                {budgetTableData.length > 0 && budgetTableData[0].map((h, i) => (
                                                  <th key={i} style={{ padding: '12px 10px', borderBottom: '2px solid #bfdbfe', backgroundColor: '#eff6ff', fontWeight: '800', color: '#1e40af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                                                ))}
                                              </tr>
                                            </thead>
                                            <tbody>
                                              {budgetTableData.slice(1).map((row, idx) => {
                                                const categoryVal = String(row[0] || '');
                                                const isHighlight = categoryVal && (categoryVal.includes('Total') || categoryVal === 'CAPEX' || categoryVal === 'Revenue');
                                                return (
                                                  <tr key={idx} style={{ backgroundColor: isHighlight ? '#f8fafc' : '#ffffff' }}>
                                                    {row.map((cell, colIdx) => (
                                                      <td key={colIdx} style={{ padding: '10px', borderBottom: '1px solid #e2e8f0', color: colIdx === 0 && isHighlight ? '#0f172a' : '#475569', fontWeight: colIdx === 0 && isHighlight ? '800' : '500' }}>
                                                        {cell}
                                                      </td>
                                                    ))}
                                                  </tr>
                                                )
                                              })}
                                            </tbody>
                                          </table>
                                        </div>
                                      )}

                                      {sectionKey === 'resource' && (
                                        <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #dcfce7', overflow: 'hidden', boxShadow: isCapturingPdf ? 'none' : '0 10px 15px -3px rgba(0,0,0,0.05)' }}>
                                          <div style={{ padding: '12px 16px', backgroundColor: '#f0fdf4', borderBottom: '1px solid #dcfce7', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{ backgroundColor: '#22c55e', color: 'white', padding: '4px', borderRadius: '6px' }}><Check size={12} /></div>
                                            <span style={{ fontSize: '13px', fontWeight: '800', color: '#14532d', letterSpacing: '0.05em' }}>RESOURCE STATE</span>
                                          </div>
                                          <div style={{ padding: '16px', display: 'grid', gap: '10px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>Deployed</span>
                                              <span style={{ fontSize: '16px', fontWeight: '900', color: '#1e3a5f' }}>{summaryData.resourceDeployed}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>Shortage</span>
                                              <span style={{ fontSize: '16px', fontWeight: '900', color: '#ef4444' }}>{summaryData.resourceShortage}</span>
                                            </div>
                                            <div style={{ height: '1px', backgroundColor: '#f1f5f9', margin: '4px 0' }} />
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>Utilization</span>
                                              <span style={{ fontSize: '16px', fontWeight: '900', color: '#f59e0b' }}>{summaryData.resourceUtilized}/{summaryData.resourceDeployed}</span>
                                            </div>
                                          </div>
                                        </div>
                                      )}

                                      {sectionKey === 'quality' && (
                                        <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #ffedd5', overflow: 'hidden', boxShadow: isCapturingPdf ? 'none' : '0 10px 15px -3px rgba(0,0,0,0.05)' }}>
                                          <div style={{ padding: '12px 16px', backgroundColor: '#fff7ed', borderBottom: '1px solid #ffedd5', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{ backgroundColor: '#f59e0b', color: 'white', padding: '4px', borderRadius: '6px' }}><Filter size={12} /></div>
                                            <span style={{ fontSize: '13px', fontWeight: '800', color: '#78350f', letterSpacing: '0.05em' }}>QUALITY METRICS</span>
                                          </div>
                                          <div style={{ padding: '16px', display: 'grid', gap: '10px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>Total Issues</span>
                                              <span style={{ fontSize: '16px', fontWeight: '900', color: '#1e3a5f' }}>{summaryData.qualityTotal}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>Open</span>
                                              <span style={{ fontSize: '16px', fontWeight: '900', color: '#ef4444' }}>{summaryData.qualityOpen}</span>
                                            </div>
                                            <div style={{ height: '1px', backgroundColor: '#f1f5f9', margin: '4px 0' }} />
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>Resolution</span>
                                              <span style={{ fontSize: '16px', fontWeight: '900', color: '#10b981' }}>{summaryData.qualityCompleted} Closed</span>
                                            </div>
                                          </div>
                                        </div>
                                      )}

                                      {isMetric && (
                                        <div style={{ height: '340px', width: '100%', border: '1px solid #e2e8f0', borderRadius: '12px', backgroundColor: '#ffffff', padding: '16px' }}>
                                          {renderChart(sectionKey, chartTypes[activeProject.id]?.[sectionKey] || 'bar', false, getTrackerForPhase(sectionKey)?.trackerId)}
                                        </div>
                                      )}

                                      {!isCapturingPdf ? (
                                        <div style={{ marginTop: '16px' }}>
                                          <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
                                            <button onClick={() => handleUpdateCustomContent(sectionKey, 'notes', (customContent.notes || '') + ' **BOLD** ')} style={{ padding: '4px 8px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', color: '#1e3a5f', cursor: 'pointer' }}>B</button>
                                            <button onClick={() => handleUpdateCustomContent(sectionKey, 'notes', (customContent.notes || '') + ' *italic* ')} style={{ padding: '4px 8px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '10px', fontStyle: 'italic', color: '#1e3a5f', cursor: 'pointer' }}>I</button>
                                            <button onClick={() => handleUpdateCustomContent(sectionKey, 'notes', (customContent.notes || '') + '\n• ')} style={{ padding: '4px 8px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '10px', color: '#1e3a5f', cursor: 'pointer' }}>List</button>
                                          </div>
                                          <textarea
                                            value={customContent.notes}
                                            onChange={(e) => handleUpdateCustomContent(sectionKey, 'notes', e.target.value)}
                                            placeholder="Add strategic context..."
                                            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', fontStyle: 'italic', outline: 'none' }}
                                          />
                                        </div>
                                      ) : customContent.notes && (
                                        <div style={{ marginTop: '16px', padding: '12px 20px', backgroundColor: 'rgba(30,58,95,0.05)', borderLeft: '4px solid #1e3a5f', fontSize: '14px', fontStyle: 'italic', color: '#334155', whiteSpace: 'pre-wrap' }}>
                                          {customContent.notes}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </Draggable>
                              );
                            })
                          )}
                          {provided.placeholder}
                        </div>

                        {/* Page Footer */}
                        <div style={{ marginTop: 'auto', borderTop: '1px solid #e2e8f0', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10px', color: '#94a3b8', fontWeight: '700' }}>
                          <div>{pdfGlobalStyles.footerText}</div>
                          {pdfGlobalStyles.showPageNumbers && <div>PAGE {pageIdx + 1} OF {pdfPages.length}</div>}
                        </div>
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
          </div>
        </div>
      </DragDropContext>
    );
  };
  const renderSimulateModal = () => {
    if (!showSimulateModal) return null;

    const allSelected = Object.values(tempVisibleSections).every(value => value);

    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
        padding: '20px'
      }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          width: '600px',
          maxWidth: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
        }}>
          <div style={{
            backgroundColor: '#1e3a5f',
            color: 'white',
            padding: '15px 20px',
            fontSize: '18px',
            fontWeight: 'bold',
            borderBottom: '1px solid #2c4c7c',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            position: 'sticky',
            top: 0,
            zIndex: 1,
            borderRadius: '8px 8px 0 0'
          }}>
            <span>Configure Dashboard - {activeProject?.name}</span>
            <button
              onClick={handleCancelConfig}
              style={{
                background: 'none',
                border: 'none',
                color: 'white',
                fontSize: '20px',
                cursor: 'pointer',
                padding: '0 5px'
              }}
            >
              ×
            </button>
          </div>

          <div style={{ padding: '20px' }}>
            <p style={{ fontSize: '14px', color: '#4b5563', marginBottom: '15px' }}>
              Select which sections to display in the {activeProject?.name} dashboard. Unchecked sections will be hidden.
            </p>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: '#1e3a5f' }}>Dashboard Sections:</h3>
              <button
                onClick={handleSelectAllVisibility}
                style={{
                  padding: '6px 12px',
                  fontSize: '13px',
                  borderRadius: '4px',
                  border: '1px solid #1e3a5f',
                  backgroundColor: allSelected ? '#1e3a5f' : 'white',
                  color: allSelected ? 'white' : '#1e3a5f',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                {allSelected ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px' }}>
              {/* Project Overview */}
              <div>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: 'bold', color: '#4b5563' }}>Project Overview</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={tempVisibleSections.milestones}
                      onChange={() => handleSectionVisibilityToggle('milestones')}
                    />
                    Milestones
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={tempVisibleSections.criticalIssues}
                      onChange={() => handleSectionVisibilityToggle('criticalIssues')}
                    />
                    Critical Issues
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={tempVisibleSections.sopTables}
                      onChange={() => handleSectionVisibilityToggle('sopTables')}
                    />
                    SOP Tables
                  </label>
                </div>
              </div>

              {/* Summary Cards */}
              <div>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: 'bold', color: '#4b5563' }}>Summary Cards</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={tempVisibleSections.budget}
                      onChange={() => handleSectionVisibilityToggle('budget')}
                    />
                    Budget Summary
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={tempVisibleSections.resource}
                      onChange={() => handleSectionVisibilityToggle('resource')}
                    />
                    Resource Summary
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={tempVisibleSections.quality}
                      onChange={() => handleSectionVisibilityToggle('quality')}
                    />
                    Quality Summary
                  </label>
                </div>
              </div>

              {/* Project Metrics */}
              <div style={{ gridColumn: 'span 2' }}>
                <h4 style={{ margin: '10px 0 10px 0', fontSize: '14px', fontWeight: 'bold', color: '#4b5563' }}>Project Metrics Charts</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                  {/* Default Phases */}
                  {[
                    { id: 'design', label: 'Design' },
                    { id: 'partDevelopment', label: 'Part Development' },
                    { id: 'build', label: 'Build' },
                    { id: 'gateway', label: 'Gateway' },
                    { id: 'validation', label: 'Validation' },
                    { id: 'qualityIssues', label: 'Quality Issues' }
                  ].map(phase => availablePhases[phase.id] && (
                    <label key={phase.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={tempVisibleSections[phase.id]}
                        onChange={() => handleSectionVisibilityToggle(phase.id)}
                      />
                      {phase.label}
                    </label>
                  ))}

                  {/* Dynamic Trackers */}
                  {(activeProject?.submodules || []).filter(sub => {
                    // Avoid duplicating default phases if they are also in submodules
                    const defaultIds = ['design', 'partDevelopment', 'build', 'gateway', 'validation', 'qualityIssues'];
                    // We check if this submodule is already covered by a default phase mapping
                    const coveredByDefault = defaultIds.some(id => {
                      const tracker = getTrackerForPhase(id);
                      return tracker && tracker.id === sub.id;
                    });
                    return !coveredByDefault;
                  }).map(sub => (
                    <label key={sub.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={tempVisibleSections[sub.id]}
                        onChange={() => handleSectionVisibilityToggle(sub.id)}
                      />
                      {sub.displayName || sub.name}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            {/* Preview of visible sections */}
            <div style={{
              marginTop: '20px',
              backgroundColor: '#f8f9fa',
              padding: '15px',
              borderRadius: '6px',
              border: '1px solid #e0e0e0'
            }}>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: 'bold', color: '#1e3a5f' }}>Dashboard Preview:</h4>
              <div style={{ fontSize: '13px', color: '#4b5563' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {Object.entries(tempVisibleSections)
                    .filter(([_, selected]) => selected)
                    .map(([section]) => (
                      <span key={section} style={{
                        padding: '4px 10px',
                        backgroundColor: '#dbeafe',
                        color: '#1e40af',
                        borderRadius: '16px',
                        fontSize: '12px',
                        fontWeight: 'bold'
                      }}>
                        {section === 'sopTables' ? 'SOP Tables' :
                          (activeProject?.submodules || []).find(s => s.id === section)?.displayName ||
                          (activeProject?.submodules || []).find(s => s.id === section)?.name ||
                          section.charAt(0).toUpperCase() + section.slice(1).replace(/([A-Z])/g, ' $1')}
                      </span>
                    ))}
                </div>
                {Object.values(tempVisibleSections).filter(v => v).length === 0 && (
                  <div style={{ color: '#9ca3af', textAlign: 'center', padding: '10px' }}>
                    No sections selected - dashboard will be empty
                  </div>
                )}
              </div>
              <div style={{ marginTop: '10px', fontSize: '12px', color: '#1e3a5f', fontWeight: 'bold' }}>
                Total visible sections: {Object.values(tempVisibleSections).filter(v => v).length}
              </div>
            </div>
          </div>

          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px',
            padding: '15px 20px',
            borderTop: '1px solid #e0e0e0',
            backgroundColor: '#f9fafb',
            borderRadius: '0 0 8px 8px',
            position: 'sticky',
            bottom: 0,
            zIndex: 1
          }}>
            <button
              onClick={handleCancelConfig}
              style={{
                padding: '10px 20px',
                fontSize: '14px',
                borderRadius: '4px',
                border: '1px solid #c0c0c0',
                backgroundColor: 'white',
                color: '#4b5563',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleApplyDashboardConfig}
              style={{
                padding: '10px 20px',
                fontSize: '14px',
                borderRadius: '4px',
                border: 'none',
                backgroundColor: '#1e3a5f',
                color: 'white',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              Apply to {activeProject?.name}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Edit Milestones Modal Component
  const renderEditMilestonesModal = () => {
    if (!showEditMilestones) return null;

    const handleSave = () => {
      setMilestones([milestoneForm]);
      setShowEditMilestones(false);
    };

    return (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, padding: '20px' }}>
        <div style={{ backgroundColor: 'white', borderRadius: '8px', width: '900px', maxWidth: '100%', maxHeight: '90vh', overflow: 'auto', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
          <div style={{ backgroundColor: '#1e3a5f', color: 'white', padding: '15px 20px', fontSize: '18px', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10 }}>
            <span>Edit Project Milestones</span>
            <button onClick={() => setShowEditMilestones(false)} style={{ background: 'none', border: 'none', color: 'white', fontSize: '20px', cursor: 'pointer' }}>×</button>
          </div>
          <div style={{ padding: '20px' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px', fontSize: '12px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f1f5f9' }}>
                    <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #e2e8f0', width: '80px' }}>Type</th>
                    <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #e2e8f0' }}>Gate 1</th>
                    <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #e2e8f0' }}>Gate 2</th>
                    <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #e2e8f0' }}>Gate 3</th>
                    <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #e2e8f0' }}>Gate 4</th>
                    <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #e2e8f0' }}>Gate 5</th>
                    <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #e2e8f0' }}>Gate 6</th>
                    <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #e2e8f0' }}>Implementation</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ padding: '10px', border: '1px solid #e2e8f0', fontWeight: 'bold', backgroundColor: '#f8fafc' }}>PLAN</td>
                    {['a', 'b', 'c', 'd', 'e', 'f'].map(char => (
                      <td key={char} style={{ padding: '5px', border: '1px solid #e2e8f0' }}>
                        <input
                          type="text"
                          value={milestoneForm.plan[char]}
                          onChange={(e) => {
                            const newForm = { ...milestoneForm };
                            newForm.plan[char] = e.target.value;
                            setMilestoneForm(newForm);
                          }}
                          style={{ width: '100%', padding: '6px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                        />
                      </td>
                    ))}
                    <td style={{ padding: '5px', border: '1px solid #e2e8f0' }}>
                      <input
                        type="text"
                        value={milestoneForm.plan.implementation}
                        onChange={(e) => {
                          const newForm = { ...milestoneForm };
                          newForm.plan.implementation = e.target.value;
                          setMilestoneForm(newForm);
                        }}
                        style={{ width: '100%', padding: '6px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                      />
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: '10px', border: '1px solid #e2e8f0', fontWeight: 'bold', backgroundColor: '#f8fafc' }}>ACTUAL</td>
                    {['a', 'b', 'c', 'd', 'e', 'f'].map(char => (
                      <td key={char} style={{ padding: '5px', border: '1px solid #e2e8f0' }}>
                        <input
                          type="text"
                          value={milestoneForm.actual[char]}
                          onChange={(e) => {
                            const newForm = { ...milestoneForm };
                            newForm.actual[char] = e.target.value;
                            setMilestoneForm(newForm);
                          }}
                          style={{ width: '100%', padding: '6px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                        />
                      </td>
                    ))}
                    <td style={{ padding: '5px', border: '1px solid #e2e8f0' }}>
                      <input
                        type="text"
                        value={milestoneForm.actual.implementation}
                        onChange={(e) => {
                          const newForm = { ...milestoneForm };
                          newForm.actual.implementation = e.target.value;
                          setMilestoneForm(newForm);
                        }}
                        style={{ width: '100%', padding: '6px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px', borderTop: '1px solid #e2e8f0', paddingTop: '15px' }}>
              <button onClick={() => setShowEditMilestones(false)} style={{ padding: '8px 16px', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: 'white', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleSave} style={{ padding: '8px 16px', borderRadius: '4px', backgroundColor: '#1e3a5f', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>Save Changes</button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Edit Issues Modal Component
  const renderEditIssuesModal = () => {
    if (!showEditIssues) return null;

    const handleSave = () => {
      setCriticalIssues(issuesForm);
      setShowEditIssues(false);
    };

    const addIssue = () => {
      const newIssue = {
        id: Date.now(),
        issue: 'New Issue',
        responsibility: '',
        function: '',
        targetDate: new Date().toISOString().split('T')[0],
        status: 'Open'
      };
      setIssuesForm([...issuesForm, newIssue]);
    };

    const removeIssue = (id) => {
      setIssuesForm(issuesForm.filter(issue => issue.id !== id));
    };

    const updateIssue = (id, field, value) => {
      setIssuesForm(issuesForm.map(issue =>
        issue.id === id ? { ...issue, [field]: value } : issue
      ));
    };

    return (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, padding: '20px' }}>
        <div style={{ backgroundColor: 'white', borderRadius: '8px', width: '900px', maxWidth: '100%', maxHeight: '90vh', overflow: 'auto', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
          <div style={{ backgroundColor: '#1e3a5f', color: 'white', padding: '15px 20px', fontSize: '18px', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10 }}>
            <span>Edit Critical Issues</span>
            <button onClick={() => setShowEditIssues(false)} style={{ background: 'none', border: 'none', color: 'white', fontSize: '20px', cursor: 'pointer' }}>×</button>
          </div>
          <div style={{ padding: '20px' }}>
            <div style={{ marginBottom: '15px' }}>
              <button onClick={addIssue} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', fontSize: '13px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                <Plus className="h-4 w-4" /> Add Issue
              </button>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px', fontSize: '12px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f1f5f9' }}>
                    <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #e2e8f0' }}>Issue Description</th>
                    <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #e2e8f0', width: '120px' }}>Responsibility</th>
                    <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #e2e8f0', width: '120px' }}>Function</th>
                    <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #e2e8f0', width: '100px' }}>Target Date</th>
                    <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #e2e8f0', width: '100px' }}>Status</th>
                    <th style={{ padding: '10px', textAlign: 'center', border: '1px solid #e2e8f0', width: '50px' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {issuesForm.map((issue) => (
                    <tr key={issue.id}>
                      <td style={{ padding: '5px', border: '1px solid #e2e8f0' }}>
                        <textarea
                          value={issue.issue}
                          onChange={(e) => updateIssue(issue.id, 'issue', e.target.value)}
                          style={{ width: '100%', padding: '6px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '12px', resize: 'vertical', minHeight: '40px' }}
                        />
                      </td>
                      <td style={{ padding: '5px', border: '1px solid #e2e8f0' }}>
                        <input
                          type="text"
                          value={issue.responsibility}
                          onChange={(e) => updateIssue(issue.id, 'responsibility', e.target.value)}
                          style={{ width: '100%', padding: '6px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '12px' }}
                        />
                      </td>
                      <td style={{ padding: '5px', border: '1px solid #e2e8f0' }}>
                        <input
                          type="text"
                          value={issue.function}
                          onChange={(e) => updateIssue(issue.id, 'function', e.target.value)}
                          style={{ width: '100%', padding: '6px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '12px' }}
                        />
                      </td>
                      <td style={{ padding: '5px', border: '1px solid #e2e8f0' }}>
                        <input
                          type="date"
                          value={issue.targetDate}
                          onChange={(e) => updateIssue(issue.id, 'targetDate', e.target.value)}
                          style={{ width: '100%', padding: '6px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '11px' }}
                        />
                      </td>
                      <td style={{ padding: '5px', border: '1px solid #e2e8f0' }}>
                        <select
                          value={issue.status}
                          onChange={(e) => updateIssue(issue.id, 'status', e.target.value)}
                          style={{ width: '100%', padding: '6px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '12px' }}
                        >
                          <option value="Open">Open</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Closed">Closed</option>
                        </select>
                      </td>
                      <td style={{ padding: '5px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                        <button onClick={() => removeIssue(issue.id)} style={{ color: '#ef4444', border: 'none', background: 'none', cursor: 'pointer' }}>
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px', borderTop: '1px solid #e2e8f0', paddingTop: '15px' }}>
              <button onClick={() => setShowEditIssues(false)} style={{ padding: '8px 16px', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: 'white', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleSave} style={{ padding: '8px 16px', borderRadius: '4px', backgroundColor: '#1e3a5f', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>Save Changes</button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Calculate Budget Table totals and derived columns
  const calculateBudgetTable = (table) => {
    if (!table || table.length === 0) return table;
    const newTable = table.map(row => [...row]);

    let totals = {
      CAPEX: { estimation: 0, approved: 0, utilized: 0, balance: 0, outlook: 0, likely: 0 },
      Revenue: { estimation: 0, approved: 0, utilized: 0, balance: 0, outlook: 0, likely: 0 },
      "Total CAPEX": null, // markers
      "Total Revenue": null
    };

    const parseNum = (val) => {
      if (val === null || val === undefined || val === '') return 0;
      const strVal = String(val).replace(/[^0-9.-]+/g, '');
      const num = parseFloat(strVal);
      return isNaN(num) ? 0 : num;
    };

    const formatNum = (num, forceFormat = false) => {
      if (num === 0 && !forceFormat) return '';
      return `${budgetCurrency} ` + num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    };

    let currentCategory = null;

    for (let i = 1; i < newTable.length; i++) {
      const category = String(newTable[i][0] || '').trim();

      if (category === 'CAPEX' || category === 'Revenue') {
        currentCategory = category;
        // Do NOT continue here, allow data extraction simultaneously
      }

      if (category.startsWith('Total')) {
        const cat = category.replace('Total', '').trim();
        if (totals[cat]) {
          newTable[i][2] = formatNum(totals[cat].estimation);
          newTable[i][3] = formatNum(totals[cat].approved);
          newTable[i][4] = formatNum(totals[cat].utilized);
          newTable[i][5] = formatNum(totals[cat].balance);
          newTable[i][6] = formatNum(totals[cat].outlook);
          newTable[i][7] = formatNum(totals[cat].likely);
        }
        currentCategory = null;
        continue;
      }

      // It's a data row
      const estimation = parseNum(newTable[i][2]);
      const approved = parseNum(newTable[i][3]);
      const utilized = parseNum(newTable[i][4]);
      const balance = approved - utilized;
      const outlook = parseNum(newTable[i][6]);
      const likely = utilized + outlook;

      // Auto-update derived values if there's any active value
      if (approved !== 0 || utilized !== 0 || outlook !== 0 || newTable[i][3] || newTable[i][4] || newTable[i][6]) {
        newTable[i][5] = formatNum(balance);
        newTable[i][7] = formatNum(likely);
      }

      if (currentCategory && totals[currentCategory]) {
        totals[currentCategory].estimation += estimation;
        totals[currentCategory].approved += approved;
        totals[currentCategory].utilized += utilized;
        totals[currentCategory].balance += balance;
        totals[currentCategory].outlook += outlook;
        totals[currentCategory].likely += likely;
      }
    }

    return newTable;
  };

  // Edit Summary Modal Component
  const renderEditSummaryModal = () => {
    if (!showEditSummary) return null;

    const handleSave = async () => {
      if (editType === 'budgetTable') {
        const calculatedForm = calculateBudgetTable(budgetTableForm);
        const targetProject = modalProjectName.trim() || selectedBudgetProject || (activeProject ? activeProject.name : null);

        if (targetProject) {
          try {
            const { default: API } = await import('../utils/api');

            // 1. Save Budget Data
            await API.post(`/budget/${encodeURIComponent(targetProject)}`, {
              project_name: targetProject,
              currency: budgetCurrency,
              budget_data: calculatedForm
            });

            // 2. Sync to Project Master Database
            const existingMaster = masterProjects.find(p => p.name === targetProject);
            if (existingMaster) {
              await API.put(`/projects/${existingMaster.id}`, {
                name: targetProject,
                status: modalProjectStatus || existingMaster.status || 'Active',
                manager: existingMaster.manager || 'Unassigned',
                budget: existingMaster.budget || 0.0,
                teamSize: existingMaster.teamSize || 0
              });
            } else {
              await API.post(`/projects/`, {
                name: targetProject,
                status: modalProjectStatus || 'Active',
                manager: 'Unassigned',
                budget: 0.0,
                teamSize: 0
              });
            }

            // Refresh Master Project list
            const pRes = await API.get('/projects/');
            setMasterProjects(pRes.data);

            // Update Dashboard UI context to the explicitly saved project
            setSelectedBudgetProject(targetProject);
            setBudgetTableData(calculatedForm);
            setShowSaveNotification(true);
            setTimeout(() => setShowSaveNotification(false), 3000);
          } catch (error) {
            console.error('Error saving budget/project data to backend:', error);
          }
        }
      } else {
        setSummaryData(summaryForm);
      }
      setShowEditSummary(false);
    };

    if (editType === 'budgetTable') {
      const updateValue = (rIdx, cIdx, val) => {
        const newForm = [...budgetTableForm];
        newForm[rIdx] = [...newForm[rIdx]];
        newForm[rIdx][cIdx] = val;
        setBudgetTableForm(calculateBudgetTable(newForm));
      };

      const addDepartmentRow = (categoryIndex) => {
        const newForm = [...budgetTableForm];
        newForm.splice(categoryIndex, 0, ['', 'New Dept', '', '', '', '', '', '']);
        setBudgetTableForm(calculateBudgetTable(newForm));
      };

      const handleCurrencyChange = (newCurr) => {
        setBudgetCurrency(newCurr);
        // Sweep entire table and reformat raw numbers with new currency
        const updatedTable = budgetTableForm.map((row, rIdx) => {
          if (rIdx === 0) return row;
          return row.map((cell, cIdx) => {
            if (cIdx >= 2) {
              const num = parseNum(cell);
              if (num === 0 && (!cell || cell.toString().trim() === '')) return '';
              return `${newCurr} ` + num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
            }
            return cell;
          });
        });
        setBudgetTableForm(calculateBudgetTable(updatedTable));
      };

      const delRow = (i) => {
        const row = budgetTableForm[i];
        if (row && (row[0] === 'CAPEX' || row[0] === 'Revenue' || row[0].startsWith('Total') || row[0] === 'Category')) {
          return; // Don't delete fixed headers/totals
        }
        setBudgetTableForm(calculateBudgetTable(budgetTableForm.filter((_, idx) => idx !== i)));
      };

      const headers = budgetTableForm[0] || [];
      const rows = budgetTableForm.slice(1);

      return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, padding: '20px' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '12px', width: '95vw', maxWidth: '1200px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ backgroundColor: '#1e3a5f', color: 'white', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
                <span style={{ fontSize: '18px', fontWeight: 'bold' }}>Edit Budget Summary</span>
              </div>
              <button onClick={() => setShowEditSummary(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', padding: '4px', borderRadius: '4px' }} className="hover:bg-slate-700">
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '24px', overflowY: 'auto', flex: 1, backgroundColor: '#f8fafc' }}>
              <div style={{ marginBottom: '16px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'white', border: '1px solid #cbd5e1', padding: '6px 12px', borderRadius: '6px' }}>
                  <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 'bold' }}>Project Name:</span>
                  <input
                    type="text"
                    value={modalProjectName}
                    onChange={e => setModalProjectName(e.target.value)}
                    style={{ border: 'none', color: '#1e3a5f', fontWeight: '800', fontSize: '14px', outline: 'none', width: '180px' }}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'white', border: '1px solid #cbd5e1', padding: '6px 12px', borderRadius: '6px' }}>
                  <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 'bold' }}>Status:</span>
                  <select
                    value={modalProjectStatus}
                    onChange={e => setModalProjectStatus(e.target.value)}
                    style={{ border: 'none', color: '#10b981', fontWeight: '800', fontSize: '14px', outline: 'none', cursor: 'pointer', backgroundColor: 'transparent' }}
                  >
                    <option style={{ color: 'black' }} value="Planning">Planning</option>
                    <option style={{ color: 'black' }} value="Active">Active</option>
                    <option style={{ color: 'black' }} value="In Progress">In Progress</option>
                    <option style={{ color: 'black' }} value="Completed">Completed</option>
                    <option style={{ color: 'black' }} value="On Hold">On Hold</option>
                  </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'white', border: '1px solid #cbd5e1', padding: '6px 12px', borderRadius: '6px' }}>
                  <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 'bold' }}>Currency:</span>
                  <select
                    value={budgetCurrency}
                    onChange={e => handleCurrencyChange(e.target.value)}
                    style={{ border: 'none', color: '#1e3a5f', fontWeight: '800', fontSize: '14px', outline: 'none', cursor: 'pointer', backgroundColor: 'transparent' }}
                  >
                    <option style={{ color: 'black' }} value="$">USD ($)</option>
                    <option style={{ color: 'black' }} value="€">EUR (€)</option>
                    <option style={{ color: 'black' }} value="£">GBP (£)</option>
                    <option style={{ color: 'black' }} value="₹">INR (₹)</option>
                    <option style={{ color: 'black' }} value="A$">AUD (A$)</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}></div>

                <button
                  onClick={() => addDepartmentRow(budgetTableForm.findIndex(r => r[0] === 'Total CAPEX'))}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', backgroundColor: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}
                >
                  <Plus size={16} /> ADD CAPEX
                </button>
                <button
                  onClick={() => addDepartmentRow(budgetTableForm.findIndex(r => r[0] === 'Total Revenue'))}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', backgroundColor: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}
                >
                  <Plus size={16} /> ADD REVENUE
                </button>
              </div>

              <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: 'white', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                      {headers.map((h, i) => (
                        <th key={i} style={{
                          padding: '12px 14px',
                          borderRight: i === headers.length - 1 ? 'none' : '1px solid #e2e8f0',
                          color: '#475569',
                          fontWeight: 'bold'
                        }}>
                          {h}
                        </th>
                      ))}
                      <th style={{ padding: '12px', width: '40px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, idx) => {
                      const absoluteIdx = idx + 1;
                      const isHeader = row[0] === 'CAPEX' || row[0] === 'Revenue';
                      const isTotal = row[0] && String(row[0]).startsWith('Total');
                      const canDelete = !isHeader && !isTotal;

                      return (
                        <tr key={idx} style={{ backgroundColor: isTotal ? '#f8fafc' : 'white', borderBottom: '1px solid #e2e8f0' }}>
                          {row.map((cell, colIdx) => {
                            const isCalculatedCell = colIdx === 5 || colIdx === 7 || isTotal;
                            const isLabelCell = colIdx === 0 && (isHeader || isTotal);
                            const isReadOnly = isCalculatedCell || isLabelCell;

                            return (
                              <td key={colIdx} style={{
                                padding: '0',
                                borderRight: colIdx === row.length - 1 ? 'none' : '1px solid #e2e8f0'
                              }}>
                                {isReadOnly ? (
                                  <div style={{ padding: '12px 14px', color: isHeader || isTotal ? '#1e3a5f' : '#334155', fontWeight: isHeader || isTotal ? 'bold' : 'normal', minHeight: '44px', display: 'flex', alignItems: 'center' }}>
                                    {cell}
                                  </div>
                                ) : (
                                  <input
                                    type="text"
                                    value={cell}
                                    onChange={(e) => updateValue(absoluteIdx, colIdx, e.target.value)}
                                    placeholder={colIdx === 1 ? "Dept Name" : ""}
                                    style={{ width: '100%', padding: '12px 14px', border: '1px solid transparent', outline: 'none', color: '#334155', height: '100%', backgroundColor: 'transparent' }}
                                    onFocus={(e) => { e.target.style.backgroundColor = '#eff6ff'; }}
                                    onBlur={(e) => { e.target.style.backgroundColor = 'transparent'; }}
                                  />
                                )}
                              </td>
                            );
                          })}
                          <td style={{ padding: '8px', textAlign: 'center' }}>
                            {canDelete && (
                              <button onClick={() => delRow(absoluteIdx)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', margin: '0 auto' }} title="Delete Row">
                                <Trash2 size={16} />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '12px', backgroundColor: 'white' }}>
              <button onClick={() => setShowEditSummary(false)} style={{ padding: '10px 20px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: 'white', color: '#475569', fontWeight: '600', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleSave} style={{ padding: '10px 20px', borderRadius: '6px', backgroundColor: '#1e3a5f', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>Save Changes</button>
            </div>
          </div>
        </div>
      );
    }

    const config = {
      budget: {
        title: 'Budget Summary',
        fields: [
          { key: 'budgetApproved', label: 'Approved amount' },
          { key: 'budgetUtilized', label: 'Utilized amount' },
          { key: 'budgetBalance', label: 'Balance amount' },
          { key: 'budgetOutlook', label: 'Outlook (%)' }
        ]
      },
      resource: {
        title: 'Resource Summary',
        fields: [
          { key: 'resourceDeployed', label: 'Deployed' },
          { key: 'resourceUtilized', label: 'Utilized' },
          { key: 'resourceShortage', label: 'Shortage' },
          { key: 'resourceUnderUtilized', label: 'Under-utilized' }
        ]
      },
      quality: {
        title: 'Quality Summary',
        fields: [
          { key: 'qualityTotal', label: 'Total issues' },
          { key: 'qualityCompleted', label: 'Completed' },
          { key: 'qualityOpen', label: 'Open' },
          { key: 'qualityCritical', label: 'Critical' }
        ]
      }
    };

    const currentConfig = config[editType] || config.budget;

    return (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, padding: '20px' }}>
        <div style={{ backgroundColor: 'white', borderRadius: '8px', width: '400px', maxWidth: '100%', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
          <div style={{ backgroundColor: '#1e3a5f', color: 'white', padding: '15px 20px', fontSize: '18px', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Edit {currentConfig.title}</span>
            <button onClick={() => setShowEditSummary(false)} style={{ background: 'none', border: 'none', color: 'white', fontSize: '20px', cursor: 'pointer' }}>×</button>
          </div>
          <div style={{ padding: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '20px' }}>
              {currentConfig.fields.map(field => (
                <div key={field.key}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#4b5563', marginBottom: '5px' }}>{field.label}</label>
                  <input
                    type="text"
                    value={summaryForm[field.key]}
                    onChange={(e) => setSummaryForm({ ...summaryForm, [field.key]: e.target.value })}
                    style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '14px' }}
                  />
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setShowEditSummary(false)} style={{ padding: '8px 16px', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: 'white', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleSave} style={{ padding: '8px 16px', borderRadius: '4px', backgroundColor: '#1e3a5f', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>Save Changes</button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render chart based on type
  const renderChart = (chartId, chartType, isMaximized = false, trackerId = null) => {
    if (!activeProject) return null;

    const size = isMaximized ? { width: '100%', height: '400px' } : { width: '100%', height: '320px' };

    // Get the configured axes for this chart
    let axisConfig = axisConfigs[activeProject.id]?.[chartId] || { xAxis: '', yAxis: '' };

    // If no chart data or configuration, show placeholder
    let chartData = [];
    const effectiveTrackerId = trackerId || (activeProject?.submodules && activeProject.submodules.length > 0 ? activeProject.submodules[0].trackerId : null);

    if (effectiveTrackerId && submoduleData[effectiveTrackerId] && submoduleData[effectiveTrackerId].rows) {
      chartData = submoduleData[effectiveTrackerId].rows;
    }

    // Check if attributes are configured
    if (!axisConfig || !axisConfig.xAxis || !axisConfig.yAxis) {
      return (
        <div style={{
          ...size,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f9fafb',
          border: '1px dashed #d1d5db',
          borderRadius: '8px',
          color: '#6b7280'
        }}>
          <Settings className="h-10 w-10 mb-3 opacity-30" />
          <p style={{ fontSize: '15px', fontWeight: 'bold', color: '#1e3a5f' }}>Configure Attributes</p>
          <p style={{ fontSize: '13px', marginTop: '6px', textAlign: 'center', padding: '0 20px' }}>
            Please select the X and Y axes in the settings to visualize this chart.
          </p>
        </div>
      );
    }

    // If configured but no data
    if (chartData.length === 0) {
      return (
        <div style={{
          ...size,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f9fafb',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          color: '#6b7280'
        }}>
          <p style={{ fontSize: '14px', fontWeight: '500' }}>No data available for this phase</p>
        </div>
      );
    }

    // Process data based on selected axes
    // We group by xAxis, and aggregate yAxis (sum if numeric, count otherwise)
    const groupedData = {};
    const yAxisIsNumeric = chartData.some(row => {
      const val = row[axisConfig.yAxis];
      return val !== null && val !== undefined && val !== '' && !isNaN(parseFloat(val));
    });

    const derivedConfig = axisConfig.derivedConfig;

    chartData.forEach(row => {
      let xVal = row[axisConfig.xAxis];
      if (xVal === null || xVal === undefined || String(xVal).trim() === '') {
        xVal = 'Uncategorized';
      } else {
        xVal = String(xVal).trim();
      }

      let yVal = row[axisConfig.yAxis];

      // Handle derived date metrics
      if (derivedConfig && ['delay', 'duration', 'cycleTime'].includes(derivedConfig.type)) {
        const d1 = new Date(row[derivedConfig.date1]);
        const d2 = new Date(row[derivedConfig.date2]);

        if (!isNaN(d1.getTime()) && !isNaN(d2.getTime())) {
          // value = (later_date - earlier_date) in days
          yVal = (d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24);
        } else {
          yVal = null;
        }
      }

      if (!groupedData[xVal]) {
        groupedData[xVal] = 0;
      }

      if (derivedConfig || yAxisIsNumeric) {
        if (yVal !== null && yVal !== undefined && yVal !== '') {
          groupedData[xVal] += parseFloat(yVal) || 0;
        }
      } else {
        if (yVal !== null && yVal !== undefined && String(yVal).trim() !== '') {
          groupedData[xVal] += 1; // Count valid non-empty values
        }
      }
    });

    // Sort labels to make charts readable (e.g. chronological or alphabetical)
    const sortedEntries = Object.entries(groupedData).sort((a, b) => {
      // Always put Uncategorized at the very end
      if (a[0] === 'Uncategorized') return 1;
      if (b[0] === 'Uncategorized') return -1;

      // Try numeric sort first
      const numA = parseFloat(a[0]);
      const numB = parseFloat(b[0]);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;

      // Fallback to string local compare
      return a[0].localeCompare(b[0]);
    });

    const xLabels = sortedEntries.map(e => e[0]);
    const yValues = sortedEntries.map(e => {
      // Round to 2 decimals if numeric to avoid floating point issues
      return yAxisIsNumeric ? Math.round(e[1] * 100) / 100 : e[1];
    });

    // Label for Y-axis
    let yAxisLabel = humanizeLabel(axisConfig.yAxis);
    if (derivedConfig && derivedConfig.label) {
      yAxisLabel = `${derivedConfig.label} (Days)`;
    }

    const baseOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: 'rgba(255, 255, 255, 0.96)',
        borderColor: '#e2e8f0',
        borderWidth: 1,
        textStyle: { color: '#1e3a5f', fontSize: 12 },
        extraCssText: 'box-shadow: 0 4px 12px rgba(0,0,0,0.1); border-radius: 8px;',
        formatter: (params) => {
          if (!params || params.length === 0) return '';
          let html = `<div style="font-weight: 800; margin-bottom: 8px; border-bottom: 1px solid #f1f5f9; padding-bottom: 4px; color: #1e3a5f;">${formatXAxisValue(params[0].axisValue)}</div>`;
          params.forEach(p => {
            const val = typeof p.value === 'number' ? Math.round(p.value * 100) / 100 : p.value;
            html += `<div style="display: flex; justify-content: space-between; gap: 24px; align-items: center; margin-bottom: 3px;">
              <span style="display: flex; align-items: center;">
                <span style="display:inline-block;margin-right:8px;border-radius:2px;width:10px;height:10px;background-color:${p.color};"></span>
                <span style="color: #64748b; font-weight: 600;">${humanizeLabel(p.seriesName)}</span>
              </span>
              <span style="font-weight: 800; color: #1e3a5f;">${val} ${derivedConfig ? 'Days' : ''}</span>
            </div>`;
          });
          return html;
        }
      },
      toolbox: {
        show: true,
        right: '2%',
        top: '2%',
        feature: {
          magicType: { show: true, type: ['line', 'bar', 'stack'], title: { line: 'Line', bar: 'Bar', stack: 'Stack' } },
          dataView: {
            show: true,
            readOnly: false,
            title: 'Data',
            lang: ['Data View', 'Close', 'Refresh'],
            backgroundColor: '#fff',
            textareaColor: '#fff',
            textareaBorderColor: '#e2e8f0',
            textColor: '#1e3a5f',
            buttonColor: '#1e3a5f',
            buttonTextColor: '#fff'
          },
          restore: { show: true, title: 'Reset' },
          saveAsImage: { show: true, title: 'Export', pixelRatio: 2 }
        },
        iconStyle: { borderColor: '#94a3b8' },
        emphasis: { iconStyle: { borderColor: '#3b82f6' } }
      },
      dataZoom: xLabels.length > 10 ? [
        { type: 'slider', show: true, start: 0, end: Math.max(20, Math.floor(1000 / xLabels.length)), bottom: '2%' },
        { type: 'inside', start: 0, end: 100 }
      ] : [],
      grid: {
        left: '5%',
        right: '5%',
        bottom: xLabels.length > 10 ? '30%' : (chartType === 'bar-rotated' ? '25%' : '15%'),
        top: '15%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: xLabels,
        axisLabel: {
          interval: 0,
          rotate: xLabels.length > 5 ? (chartType === 'bar-rotated' ? 45 : 35) : 0,
          formatter: formatXAxisValue,
          fontSize: 10,
          color: '#64748b'
        },
        axisLine: { lineStyle: { color: '#e2e8f0' } }
      },
      yAxis: {
        type: 'value',
        name: yAxisLabel,
        boundaryGap: ['15%', '15%'],
        nameTextStyle: { color: '#64748b', fontSize: 11, fontWeight: 'bold' },
        axisLabel: { color: '#64748b', fontSize: 10 },
        splitLine: { lineStyle: { type: 'dashed', color: '#f1f5f9' } }
      }
    };

    let option = {};

    switch (chartType) {
      case 'bar':
        option = {
          ...baseOption,
          series: [
            {
              name: axisConfig.yAxis,
              type: 'bar',
              barWidth: '50%',
              data: yValues.map(v => ({
                value: v,
                label: {
                  position: v >= 0 ? 'top' : 'bottom',
                  distance: v >= 0 ? 8 : 10,
                  align: 'center',
                  verticalAlign: v >= 0 ? 'bottom' : 'top'
                }
              })),
              itemStyle: {
                borderRadius: (params) => params.value >= 0 ? [6, 6, 0, 0] : [0, 0, 6, 6],
                color: (params) => {
                  const palette = getDiversePalette();
                  return palette[params.dataIndex % palette.length];
                }
              },
              label: {
                show: true,
                color: '#1e3a5f',
                fontSize: 10,
                fontWeight: 'bold',
                formatter: (p) => p.value !== 0 ? p.value : ''
              }
            }
          ]
        };
        break;

      case 'line':
      case 'area':
        option = {
          ...baseOption,
          series: [
            {
              name: axisConfig.yAxis,
              type: 'line',
              smooth: true,
              showSymbol: true,
              symbolSize: 8,
              data: yValues,
              lineStyle: { width: 3, color: '#3b82f6' },
              itemStyle: { color: '#3b82f6', borderWidth: 2, borderColor: '#fff' },
              areaStyle: chartType === 'area' ? {
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                  { offset: 0, color: 'rgba(59, 130, 246, 0.5)' },
                  { offset: 1, color: 'rgba(59, 130, 246, 0.01)' }
                ])
              } : undefined,
              label: {
                show: true,
                position: 'top',
                color: '#1e3a5f',
                fontSize: 10,
                fontWeight: 'bold'
              }
            }
          ]
        };
        break;

      case 'pie':
        let pieData = xLabels.map((label, index) => ({
          name: label,
          value: yValues[index]
        })).filter(item => item.value > 0);

        // Smart Default: If too many segments in a Pie, it's better as a Bar
        if (pieData.length > 20 && !isMaximized) {
          return renderChart(chartId, 'bar', isMaximized, trackerId);
        }

        // Clutter management for Pie Chart: Group small slices into "Others"
        if (pieData.length > 12) {
          const sortedData = [...pieData].sort((a, b) => b.value - a.value);
          const topN = sortedData.slice(0, 10);
          const others = sortedData.slice(10).reduce((acc, curr) => acc + curr.value, 0);
          if (others > 0) {
            pieData = [...topN, { name: 'Others', value: Math.round(others * 100) / 100 }];
          }
        }

        option = {
          color: getDiversePalette(),
          tooltip: {
            trigger: 'item',
            backgroundColor: 'rgba(255, 255, 255, 0.96)',
            borderColor: '#e2e8f0',
            borderWidth: 1,
            textStyle: { color: '#1e3a5f' },
            formatter: (p) => `<div style="padding: 4px;"><b>${formatXAxisValue(p.name)}</b><br/><span style="color:#64748b">Value:</span> <b>${p.value}</b><br/><span style="color:#64748b">Share:</span> <b>${p.percent}%</b></div>`
          },
          toolbox: baseOption.toolbox, // retain toolbox from base option
          legend: {
            type: 'scroll',
            orient: 'horizontal',
            bottom: 0,
            itemWidth: 10,
            itemHeight: 10,
            textStyle: { fontSize: 10, color: '#64748b' },
            padding: [0, 20]
          },
          series: [
            {
              name: humanizeLabel(axisConfig.yAxis),
              type: 'pie',
              radius: isMaximized ? ['45%', '75%'] : ['35%', '65%'],
              center: ['50%', '45%'],
              avoidLabelOverlap: true,
              itemStyle: {
                borderRadius: 4,
                borderColor: '#fff',
                borderWidth: 2
              },
              label: {
                show: true,
                position: 'outside',
                alignTo: 'edge',
                margin: 10,
                backgroundColor: 'rgba(255, 255, 255, 0.85)',
                padding: [4, 8],
                borderRadius: 4,
                shadowColor: 'rgba(0, 0, 0, 0.05)',
                shadowBlur: 10,
                formatter: (p) => `{name|${formatXAxisValue(p.name)}}\n{value|${p.value}} {percent|(${p.percent}%)}`,
                rich: {
                  name: { fontSize: 10, fontWeight: '700', color: '#1e3a5f', padding: [0, 0, 4, 0] },
                  value: { fontSize: 10, fontWeight: '800', color: '#3b82f6' },
                  percent: { fontSize: 10, color: '#64748b' }
                }
              },
              labelLine: {
                show: true,
                length: 15,
                length2: 25,
                smooth: true,
                lineStyle: { width: 1.5, color: '#cbd5e1' }
              },
              labelLayout: function (params) {
                const instance = typeof chartRefs !== 'undefined' && chartRefs.current && chartRefs.current[chartId] ? chartRefs.current[chartId].getEchartsInstance() : null;
                const liveWidth = instance ? instance.getWidth() : (isMaximized ? 800 : 450);
                
                const isLeft = params.labelRect.x < (liveWidth / 2);
                const points = params.labelLinePoints;
                if (!points) return;

                // Calculate default target X based on 'edge' alignment constraint
                let targetX = isLeft ? params.labelRect.x : params.labelRect.x + params.labelRect.width;

                // Update the end point
                points[2][0] = targetX;

                return {
                  labelLinePoints: points
                };
              },
              minAngle: 5,
              emphasis: {
                label: { show: true, fontSize: 11, fontWeight: 'bold' },
                itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0, 0, 0, 0.2)' }
              },
              data: pieData
            }
          ]
        };
        break;

      case 'bar-horizontal':
        option = {
          ...baseOption,
          xAxis: {
            type: 'value',
            boundaryGap: ['15%', '15%'],
            axisLabel: { color: '#64748b', fontSize: 10 },
            splitLine: { lineStyle: { type: 'dashed', color: '#f1f5f9' } }
          },
          yAxis: {
            type: 'category',
            data: xLabels,
            axisLabel: {
              interval: 0,
              fontSize: 10,
              color: '#1e3a5f',
              fontWeight: '600'
            }
          },
          series: [
            {
              name: axisConfig.yAxis,
              type: 'bar',
              data: yValues.map(v => ({
                value: v,
                label: {
                  position: v >= 0 ? 'right' : 'left',
                  distance: 8,
                  align: v >= 0 ? 'left' : 'right',
                  verticalAlign: 'middle'
                }
              })),
              itemStyle: {
                borderRadius: (params) => params.value >= 0 ? [0, 6, 6, 0] : [6, 0, 0, 6],
                color: (params) => {
                  const palette = getDiversePalette();
                  return palette[params.dataIndex % palette.length];
                }
              },
              label: {
                show: true,
                color: '#1e3a5f',
                fontSize: 10,
                fontWeight: 'bold',
                formatter: (p) => p.value !== 0 ? p.value : ''
              }
            }
          ]
        };
        break;

      case 'bar-rotated':
        option = {
          ...baseOption,
          grid: { ...baseOption.grid, bottom: '25%' },
          xAxis: {
            ...baseOption.xAxis,
            axisLabel: {
              ...baseOption.xAxis.axisLabel,
              rotate: 45,
              interval: 0,
              hideOverlap: true
            }
          },
          series: [
            {
              name: axisConfig.yAxis,
              type: 'bar',
              barWidth: '60%',
              data: yValues.map(v => ({
                value: v,
                label: {
                  position: v >= 0 ? 'top' : 'bottom',
                  distance: 8,
                  align: 'center',
                  verticalAlign: v >= 0 ? 'bottom' : 'top'
                }
              })),
              itemStyle: {
                borderRadius: (params) => params.value >= 0 ? [4, 4, 0, 0] : [0, 0, 4, 4],
                color: (params) => {
                  const palette = getDiversePalette();
                  return palette[params.dataIndex % palette.length];
                }
              },
              label: {
                show: true,
                color: '#1e3a5f',
                fontSize: 9,
                fontWeight: 'bold',
                formatter: (p) => p.value !== 0 ? p.value : ''
              }
            }
          ]
        };
        break;

      case 'histogram':
        option = {
          ...baseOption,
          series: [
            {
              name: axisConfig.yAxis,
              type: 'bar',
              barWidth: '95%', // Histogram style: narrow gaps
              data: yValues,
              itemStyle: {
                color: '#6366f1',
                opacity: 0.8,
                borderColor: '#4338ca',
                borderWidth: 1
              },
              label: {
                show: true,
                position: 'top',
                fontSize: 10
              }
            }
          ]
        };
        break;

      case 'timeline':
        // Timeline optimized for date sequence
        option = {
          ...baseOption,
          tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'shadow' }
          },
          xAxis: {
            ...baseOption.xAxis,
            type: 'category',
            boundaryGap: true
          },
          yAxis: {
            ...baseOption.yAxis,
            splitLine: { show: true, lineStyle: { type: 'solid', color: '#f1f5f9' } }
          },
          series: [
            {
              name: axisConfig.yAxis,
              type: 'line',
              step: 'middle', // Better for timeline changes
              symbol: 'circle',
              symbolSize: 10,
              data: yValues,
              lineStyle: { width: 4, color: '#10b981' },
              itemStyle: { color: '#059669', borderWidth: 2, borderColor: '#fff' },
              areaStyle: {
                color: {
                  type: 'linear',
                  x: 0, y: 0, x2: 0, y2: 1,
                  colorStops: [
                    { offset: 0, color: 'rgba(16, 185, 129, 0.3)' },
                    { offset: 1, color: 'rgba(16, 185, 129, 0)' }
                  ]
                }
              },
              label: {
                show: true,
                position: 'top',
                formatter: (p) => p.value,
                fontWeight: 'bold',
                color: '#047857'
              }
            }
          ]
        };
        break;

      default:
        return null;
    }

    return (
      <div style={size}>
        <div style={{ marginBottom: '10px', fontSize: '11px', color: '#64748b', textAlign: 'center', backgroundColor: '#f8fafc', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
          <span style={{ fontWeight: 'bold', color: '#1e3a5f' }}>X:</span> {humanizeLabel(axisConfig.xAxis)} <span style={{ mx: 2, opacity: 0.3 }}>|</span> <span style={{ fontWeight: 'bold', color: '#1e3a5f' }}>Y:</span> {humanizeLabel(axisConfig.yAxis)}
        </div>
        {isCapturingPdf && pdfChartImages[chartId] ? (
          <img
            src={pdfChartImages[chartId]}
            alt="Static Chart Image"
            style={{ height: isMaximized ? '350px' : '280px', width: '100%', objectFit: 'contain' }}
            crossOrigin="anonymous"
          />
        ) : (
          <ReactECharts
            ref={(e) => {
              if (e) chartRefs.current[chartId] = e;
            }}
            theme="v5"
            option={{ ...option, animation: !isCapturingPdf }}
            style={{ height: isMaximized ? '350px' : '280px', width: '100%' }}
            notMerge={true}
          />
        )}
      </div>
    );
  };



  const handleDownloadChart = (chartId) => {
    const instance = chartRefs.current[chartId]?.getEchartsInstance();
    if (instance) {
      const url = instance.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: '#fff' });
      const a = document.createElement('a');
      a.href = url;
      a.download = `${chartId || 'export'}-chart.png`;
      a.click();
    }
  };

  // Chart options render function
  const renderChartOptions = (chartId, currentType) => (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', position: 'relative', flexWrap: 'wrap', justifyContent: 'flex-end', zIndex: 10 }}>
      <select
        value={currentType}
        onChange={(e) => handleChartTypeChange(chartId, e.target.value)}
        style={{
          padding: '4px 8px',
          fontSize: '11px',
          borderRadius: '6px',
          border: '1px solid #cbd5e1',
          backgroundColor: '#f8fafc',
          color: '#1e3a5f',
          cursor: 'pointer',
          fontWeight: 'bold',
          outline: 'none',
          minWidth: '100px'
        }}
      >
        <option value="bar">Bar Chart</option>
        <option value="line">Line Chart</option>
        <option value="pie">Pie Chart</option>
        <option value="area">Area Chart</option>
        <option value="histogram">Histogram</option>
        <option value="bar-horizontal">Horizontal Bar</option>
        <option value="bar-rotated">Rotated Bar</option>
        <option value="timeline">Timeline</option>
      </select>

      <button
        onClick={() => handleDownloadChart(chartId)}
        title="Download Chart"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '28px',
          height: '28px',
          borderRadius: '6px',
          border: '1px solid #cbd5e1',
          backgroundColor: '#f8fafc',
          color: '#1e3a5f',
          cursor: 'pointer',
          transition: 'all 0.2s',
          padding: 0
        }}
      >
        <Download size={14} />
      </button>

      <button
        onClick={() => toggleAxisSelector(chartId)}
        title="Configure Axes"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '4px 8px',
          height: '28px',
          borderRadius: '6px',
          border: '1px solid #cbd5e1',
          backgroundColor: showAxisSelector === chartId ? '#1e3a5f' : '#f8fafc',
          color: showAxisSelector === chartId ? 'white' : '#1e3a5f',
          cursor: 'pointer',
          transition: 'all 0.2s'
        }}
      >
        <span style={{ fontSize: '11px', fontWeight: 'bold' }}>Axes</span>
      </button>

      <button
        onClick={() => handleMaximize(chartId)}
        title="Maximize Chart"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '4px 8px',
          height: '28px',
          borderRadius: '6px',
          border: '1px solid #cbd5e1',
          backgroundColor: '#f8fafc',
          color: '#1e3a5f',
          cursor: 'pointer',
          transition: 'all 0.2s'
        }}
      >
        <span style={{ fontSize: '11px', fontWeight: 'bold' }}>Analyze</span>
      </button>

      {showAxisSelector === chartId && (
        <AxisSelectorModal
          chartId={chartId}
          onClose={() => setShowAxisSelector(null)}
          activeProject={activeProject}
          axisConfigs={axisConfigs}
          submoduleData={submoduleData}
          tracker={getTrackerForPhase(chartId)}
          availableColumns={availableColumns}
          handleAxesUpdate={handleAxesUpdate}
        />
      )}
    </div>
  );

  // Maximized Chart Modal Component
  const renderMaximizedChartModal = () => {
    if (!maximizedChart || !activeProject) return null;

    const chartNames = {
      design: 'Design',
      partDevelopment: 'Part Development',
      build: 'Build',
      gateway: 'Gateway',
      validation: 'Validation',
      qualityIssues: 'Quality Issues'
    };

    const phaseLabel = chartNames[maximizedChart] ||
      (activeProject?.submodules || []).find(sub => sub.id === maximizedChart)?.displayName ||
      (activeProject?.submodules || []).find(sub => sub.id === maximizedChart)?.name ||
      maximizedChart;

    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        padding: '30px'
      }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          width: '95%',
          maxWidth: '1200px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden'
        }}>
          <div style={{
            backgroundColor: '#1e3a5f',
            color: 'white',
            padding: '20px 25px',
            fontSize: '18px',
            fontWeight: 'bold',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid #2c4c7c'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ backgroundColor: '#3b82f6', width: '4px', height: '24px', borderRadius: '2px' }} />
              <span>{humanizeLabel(phaseLabel)} - Analysis</span>
            </div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <select
                value={chartTypes[activeProject.id]?.[maximizedChart] || 'bar'}
                onChange={(e) => handleChartTypeChange(maximizedChart, e.target.value)}
                style={{
                  padding: '8px 15px',
                  fontSize: '14px',
                  borderRadius: '6px',
                  border: '1px solid rgba(255,255,255,0.4)',
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  color: 'white',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  outline: 'none'
                }}
              >
                <option value="bar" style={{ color: '#1e3a5f' }}>Bar</option>
                <option value="line" style={{ color: '#1e3a5f' }}>Line</option>
                <option value="pie" style={{ color: '#1e3a5f' }}>Pie</option>
                <option value="area" style={{ color: '#1e3a5f' }}>Area</option>
                <option value="histogram" style={{ color: '#1e3a5f' }}>Histogram</option>
                <option value="bar-horizontal" style={{ color: '#1e3a5f' }}>Horizontal Bar</option>
                <option value="bar-rotated" style={{ color: '#1e3a5f' }}>Rotated Bar</option>
                <option value="timeline" style={{ color: '#1e3a5f' }}>Timeline</option>
              </select>
              <button
                onClick={handleCloseMaximize}
                style={{
                  padding: '8px 20px',
                  fontSize: '14px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#ef4444',
                  color: 'white',
                  cursor: 'pointer',
                  fontWeight: 'bolder',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              >
                Close
              </button>
            </div>
          </div>
          <div style={{ padding: '30px', flex: 1, overflowY: 'auto', backgroundColor: '#f8fafc' }}>
            <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', border: '1px solid #e2e8f0', marginBottom: '30px' }}>
              <div style={{ height: '550px' }}>
                {renderChart(maximizedChart, chartTypes[activeProject.id]?.[maximizedChart] || 'bar', true, getTrackerForPhase(maximizedChart)?.trackerId)}
              </div>
            </div>

            {/* Detailed Data View Table */}
            <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#1e3a5f' }}>Detailed Data View</h4>
                <button
                  onClick={() => {
                    const tid = getTrackerForPhase(maximizedChart)?.trackerId;
                    const rows = tid && submoduleData[tid] ? submoduleData[tid].rows : [];
                    const config = axisConfigs[activeProject.id]?.[maximizedChart];
                    if (!rows.length || !config) return;

                    const headers = [config.xAxis, config.yAxis];
                    const csvContent = [
                      headers.join(','),
                      ...rows.map(row => headers.map(h => `"${row[h] || ''}"`).join(','))
                    ].join('\n');

                    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                    const link = document.createElement("a");
                    link.href = URL.createObjectURL(blob);
                    link.setAttribute("download", `${phaseLabel}_data.csv`);
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  style={{
                    padding: '6px 14px',
                    fontSize: '12px',
                    backgroundColor: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Download size={14} /> Export CSV
                </button>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f1f5f9', textAlign: 'left' }}>
                      <th style={{ padding: '12px 20px', color: '#475569', fontWeight: '800', borderBottom: '2px solid #e2e8f0' }}>#</th>
                      <th style={{ padding: '12px 20px', color: '#1e3a5f', fontWeight: '800', borderBottom: '2px solid #e2e8f0' }}>{humanizeLabel(axisConfigs[activeProject.id]?.[maximizedChart]?.xAxis || 'X Axis')}</th>
                      <th style={{ padding: '12px 20px', color: '#1e3a5f', fontWeight: '800', borderBottom: '2px solid #e2e8f0' }}>{humanizeLabel(axisConfigs[activeProject.id]?.[maximizedChart]?.yAxis || 'Y Axis')}</th>
                      {/* Show other relevant columns if available */}
                      {Object.keys(submoduleData[getTrackerForPhase(maximizedChart)?.trackerId]?.rows[0] || {})
                        .filter(k => k !== axisConfigs[activeProject.id]?.[maximizedChart]?.xAxis && k !== axisConfigs[activeProject.id]?.[maximizedChart]?.yAxis && !k.startsWith('_'))
                        .slice(0, 3)
                        .map(key => (
                          <th key={key} style={{ padding: '12px 20px', color: '#64748b', fontWeight: '600', borderBottom: '2px solid #e2e8f0' }}>{humanizeLabel(key)}</th>
                        ))
                      }
                    </tr>
                  </thead>
                  <tbody>
                    {(submoduleData[getTrackerForPhase(maximizedChart)?.trackerId]?.rows || []).slice(0, 50).map((row, idx) => {
                      const config = axisConfigs[activeProject.id]?.[maximizedChart];
                      return (
                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: idx % 2 === 0 ? 'white' : '#f9fafb' }}>
                          <td style={{ padding: '10px 20px', color: '#94a3b8', fontWeight: '600' }}>{idx + 1}</td>
                          <td style={{ padding: '10px 20px', color: '#1e293b', fontWeight: '700' }}>{formatXAxisValue(row[config?.xAxis])}</td>
                          <td style={{ padding: '10px 20px', color: '#3b82f6', fontWeight: '800' }}>{row[config?.yAxis]}</td>
                          {Object.keys(row)
                            .filter(k => k !== config?.xAxis && k !== config?.yAxis && !k.startsWith('_'))
                            .slice(0, 3)
                            .map(key => (
                              <td key={key} style={{ padding: '10px 20px', color: '#64748b' }}>{row[key]}</td>
                            ))
                          }
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {(submoduleData[getTrackerForPhase(maximizedChart)?.trackerId]?.rows || []).length > 50 && (
                  <div style={{ padding: '15px', textAlign: 'center', color: '#64748b', fontSize: '12px', fontStyle: 'italic' }}>
                    Showing top 50 rows. Use "Export CSV" for full results.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f0f2f5',
      padding: '20px',
      fontFamily: 'Arial, sans-serif'
    }}>
      {/* PDF Preview Modal */}
      {renderPdfPreviewModal()}

      {/* Save Notification Toast */}
      {showSaveNotification && (
        <div style={{ position: 'fixed', bottom: '30px', right: '30px', backgroundColor: '#10b981', color: 'white', padding: '16px 24px', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '10px', zIndex: 9999, transition: 'opacity 0.3s ease' }}>
          <span style={{ fontSize: '18px', fontWeight: 'bold' }}>✓</span>
          <span style={{ fontWeight: '600', fontSize: '15px' }}>Changes saved to Budget Summary</span>
        </div>
      )}

      {/* Email Modal */}
      <EmailModal
        show={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        activeProject={activeProject}
        emailData={emailData}
        setEmailData={setEmailData}
        allEmployees={allEmployees}
        employeeSearchTerm={employeeSearchTerm}
        setEmployeeSearchTerm={setEmployeeSearchTerm}
        showEmployeeDropdown={showEmployeeDropdown}
        setShowEmployeeDropdown={setShowEmployeeDropdown}
        activeEmailField={activeEmailField}
        setActiveEmailField={setActiveEmailField}
        addContactFromList={addContactFromList}
        handleEmailInputChange={handleEmailInputChange}
        removeEmailInput={removeEmailInput}
        availablePhases={availablePhases}
        getTrackerForPhase={getTrackerForPhase}
        openPrintPreview={openPrintPreview}
        handleSendEmail={handleSendEmail}
      />

      {/* Simulate Modal */}
      {renderSimulateModal()}

      {/* Edit Modals */}
      {renderEditMilestonesModal()}
      {renderEditIssuesModal()}
      {renderEditSummaryModal()}

      {/* Maximized Chart Modal */}
      {renderMaximizedChartModal()}

      {/* Main Dashboard Container */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '4px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        overflow: 'hidden',
        maxWidth: '1600px',
        margin: '0 auto'
      }}>
        {/* Header with navigation */}
        <div style={{
          backgroundColor: '#1e3a5f',
          color: 'white',
          padding: '15px 20px',
          fontSize: '20px',
          fontWeight: 'bold',
          borderBottom: '3px solid #0f2b40',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flex: 1 }}>
            {activeProject && (
              <button
                onClick={selectedSubmodule ? handleBackToProjectDashboard : handleBackToProjects}
                style={{
                  padding: '6px 12px',
                  fontSize: '14px',
                  borderRadius: '4px',
                  border: '1px solid white',
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  color: 'white',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                ← Back
              </button>
            )}
          </div>

          <div style={{ textAlign: 'center', flex: 2 }}>
            {selectedSubmodule ? (
              <span>{getDisplayFileName(selectedSubmodule.name, selectedSubmodule.projectName)}</span>
            ) : activeProject ? (
              <span>{activeProject.name} Dashboard</span>
            ) : (
              <span>Project Dashboard</span>
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', flex: 1 }}>
            {activeProject && !selectedSubmodule && (
              <>
                <button
                  onClick={() => {
                    setVisibleSections(activeProject.dashboardConfig?.visibleSections || {});
                    setShowSimulateModal(true);
                  }}
                  style={{
                    padding: '8px 16px',
                    fontSize: '14px',
                    borderRadius: '4px',
                    border: '1px solid white',
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    color: 'white',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    outline: 'none'
                  }}
                >
                  Configure Dashboard
                </button>
                <button
                  onClick={() => {
                    const sections = {
                      milestones: true,
                      criticalIssues: true,
                      budget: true,
                      resource: true,
                      quality: true,
                      design: true,
                      partDevelopment: true,
                      build: true,
                      gateway: true,
                      validation: true,
                      qualityIssues: true,
                      sopTables: true
                    };
                    (activeProject?.submodules || []).forEach(sub => {
                      sections[sub.id] = true;
                    });
                    setEmailData(prev => ({ ...prev, selectedSections: sections }));
                    setShowEmailModal(true);
                  }}
                  style={{
                    padding: '8px 16px',
                    fontSize: '14px',
                    borderRadius: '4px',
                    border: '1px solid white',
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    color: 'white',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    outline: 'none'
                  }}
                >
                  <Mail className="h-4 w-4" />
                  Send Mail
                </button>
              </>
            )}
          </div>
        </div>

        {/* Projects List or Dashboard Content */}
        {!activeProject ? (
          /* Projects List View */
          <div style={{ padding: '30px' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '20px'
            }}>
              {projects.length === 0 ? (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: '#6b7280', fontSize: '18px' }}>
                  No projects found. Please add a project module to get started.
                </div>
              ) : projects.map(project => (
                <div
                  key={project.id}
                  onClick={() => handleProjectSelect(project.id)}
                  style={{
                    border: '1px solid #e0e0e0',
                    borderRadius: '8px',
                    padding: '25px',
                    backgroundColor: 'white',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                    textAlign: 'center',
                    ':hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      borderColor: '#1e3a5f'
                    }
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 44px 12px rgba(0,0,0,0.1)';
                    e.currentTarget.style.borderColor = '#1e3a5f';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)';
                    e.currentTarget.style.borderColor = '#e0e0e0';
                  }}
                >
                  <div style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    backgroundColor: '#1e3a5f',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '24px',
                    fontWeight: 'bold',
                    margin: '0 auto 15px'
                  }}>
                    {project.code.charAt(0)}
                  </div>
                  <h3 style={{
                    fontSize: '18px',
                    fontWeight: 'bold',
                    color: '#1e3a5f',
                    margin: '0 0 8px 0'
                  }}>
                    {project.name}
                  </h3>
                  <p style={{
                    fontSize: '14px',
                    color: '#4b5563',
                    margin: '0 0 15px 0'
                  }}>
                    Code: {project.code}
                  </p>
                  {project.submodules && project.submodules.length > 0 && (
                    <p style={{
                      fontSize: '13px',
                      color: '#1e3a5f',
                      margin: '0 0 15px 0',
                      fontWeight: '500'
                    }}>
                      Submodules: {project.submodules.length}
                    </p>
                  )}
                  {project.dashboardConfig && (
                    <span style={{
                      display: 'inline-block',
                      padding: '4px 12px',
                      backgroundColor: '#d1fae5',
                      color: '#065f46',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: 'bold'
                    }}>
                      Dashboard Configured
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : selectedSubmodule ? (
          /* Submodule Detail View */
          <div style={{ padding: '0 25px 25px 25px' }}>
            {renderSubmoduleTable(submoduleData[selectedSubmodule.trackerId], getDisplayFileName(selectedSubmodule.name, selectedSubmodule.projectName))}
          </div>
        ) : (
          /* Active Project Dashboard */
          <>
            <div id="project-dashboard-main-content">
              {/* Updated Date Row with SOP Info */}
              <div style={{
                padding: '15px 20px',
                borderBottom: '1px solid #e0e0e0',
                backgroundColor: '#f8f9fa',
                marginBottom: '20px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '15px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#1e3a5f' }}>Report date:</span>
                    <span style={{ fontSize: '14px', color: '#4b5563' }}>March 15, 2024</span>
                  </div>

                  {/* SOP Info */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#1e3a5f' }}>SOP Date:</span>
                      <span style={{ fontSize: '14px', color: '#4b5563', backgroundColor: '#e6f0fa', padding: '4px 10px', borderRadius: '20px', fontWeight: 'bold' }}>
                        {sopData[0].daysToGo} days to go
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#1e3a5f' }}>Status:</span>
                      <select
                        value={sopData[0].status}
                        onChange={(e) => {
                          const newSop = [...sopData];
                          newSop[0].status = e.target.value;
                          setSopData(newSop);
                        }}
                        style={{
                          fontSize: '14px',
                          padding: '4px 28px 4px 12px',
                          borderRadius: '20px',
                          backgroundColor: sopData[0].status === 'On Track' ? '#dcfce7' : sopData[0].status === 'Likely Delay' ? '#fef08a' : '#fecaca',
                          color: sopData[0].status === 'On Track' ? '#166534' : sopData[0].status === 'Likely Delay' ? '#9a3412' : '#991b1b',
                          fontWeight: 'bold',
                          border: 'none',
                          outline: 'none',
                          cursor: 'pointer',
                          appearance: 'menulist',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                        }}
                      >
                        <option value="On Track">On Track</option>
                        <option value="Likely Delay">Likely Delay</option>
                        <option value="Critical">Critical</option>
                      </select>
                    </div>
                  </div>

                  {/* Overall Project Health */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#1e3a5f' }}>Overall Project Health:</span>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                        <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#10b981' }}></div>
                        <span style={{ fontSize: '12px', color: '#4b5563' }}>On Track</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                        <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#f59e0b' }}></div>
                        <span style={{ fontSize: '12px', color: '#4b5563' }}>At Risk</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                        <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#ef4444' }}></div>
                        <span style={{ fontSize: '12px', color: '#4b5563' }}>Critical</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>



              {/* Dashboard Content */}
              <div style={{ padding: '20px 25px 25px 25px' }}>
                {/* Milestones Section */}
                {visibleSections.milestones && (
                  <div style={{
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    overflow: 'hidden',
                    marginBottom: '28px'
                  }}>
                    <div style={{
                      textAlign: 'center',
                      padding: '14px 20px 10px',
                      backgroundColor: '#f8fafc',
                      borderBottom: '2px solid #e2e8f0'
                    }}>
                      <span style={{ fontSize: '18px', fontWeight: '900', color: '#1e3a5f', letterSpacing: '-0.01em' }}>Milestones</span>
                    </div>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      backgroundColor: '#f8fafc',
                      padding: '10px 20px',
                      borderBottom: '1px solid #e2e8f0'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ backgroundColor: '#1e3a5f', width: '4px', height: '18px', borderRadius: '2px' }} />
                        <span style={{ fontSize: '15px', fontWeight: '800', color: '#1e3a5f' }}>Project Timeline</span>
                      </div>
                      <button
                        onClick={() => { setMilestoneForm({ ...milestones[0] }); setShowEditMilestones(true); }}
                        className="no-print"
                        style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', padding: '4px' }}
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                          <th style={{ width: '120px', padding: '15px', textAlign: 'left', color: '#64748b', fontWeight: 'bold' }}>Category</th>
                          <th style={{ width: '100px', padding: '15px', textAlign: 'left', color: '#64748b', fontWeight: 'bold' }}>A</th>
                          <th style={{ width: '100px', padding: '15px', textAlign: 'left', color: '#64748b', fontWeight: 'bold' }}>B</th>
                          <th style={{ width: '100px', padding: '15px', textAlign: 'left', color: '#64748b', fontWeight: 'bold' }}>C</th>
                          <th style={{ width: '100px', padding: '15px', textAlign: 'left', color: '#64748b', fontWeight: 'bold' }}>D</th>
                          <th style={{ width: '100px', padding: '15px', textAlign: 'left', color: '#64748b', fontWeight: 'bold' }}>E</th>
                          <th style={{ width: '100px', padding: '15px', textAlign: 'left', color: '#64748b', fontWeight: 'bold' }}>F</th>
                          <th style={{ width: '140px', padding: '15px', textAlign: 'left', color: '#64748b', fontWeight: 'bold' }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {milestones.map((item, idx) => (
                          <React.Fragment key={idx}>
                            <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '12px 15px', fontWeight: 'bold', color: '#1e3a5f', whiteSpace: 'nowrap' }}>Plan</td>
                              <td style={{ padding: '12px 15px', whiteSpace: 'nowrap', color: '#445164' }}>{formatXAxisValue(item.plan.a)}</td>
                              <td style={{ padding: '12px 15px', whiteSpace: 'nowrap', color: '#445164' }}>{formatXAxisValue(item.plan.b)}</td>
                              <td style={{ padding: '12px 15px', whiteSpace: 'nowrap', color: '#445164' }}>{formatXAxisValue(item.plan.c)}</td>
                              <td style={{ padding: '12px 15px', whiteSpace: 'nowrap', color: '#445164' }}>{formatXAxisValue(item.plan.d)}</td>
                              <td style={{ padding: '12px 15px', whiteSpace: 'nowrap', color: '#445164' }}>{formatXAxisValue(item.plan.e)}</td>
                              <td style={{ padding: '12px 15px', whiteSpace: 'nowrap', color: '#445164' }}>{formatXAxisValue(item.plan.f)}</td>
                              <td style={{ padding: '12px 15px' }}>
                                <select
                                  value={item.plan.implementation}
                                  onChange={(e) => {
                                    const newMilestones = [...milestones];
                                    newMilestones[idx].plan.implementation = e.target.value;
                                    setMilestones(newMilestones);
                                  }}
                                  style={{
                                    display: 'inline-block',
                                    padding: '4px 24px 4px 12px',
                                    borderRadius: '6px',
                                    fontSize: '11px',
                                    fontWeight: 'bold',
                                    backgroundColor: item.plan.implementation === 'On Track' ? '#ecfdf5' : item.plan.implementation === 'In Progress' ? '#eff6ff' : '#fff1f2',
                                    color: item.plan.implementation === 'On Track' ? '#059669' : item.plan.implementation === 'In Progress' ? '#2563eb' : '#dc2626',
                                    border: `1px solid ${item.plan.implementation === 'On Track' ? '#10b981' : item.plan.implementation === 'In Progress' ? '#3b82f6' : '#f43f5e'}33`,
                                    cursor: 'pointer',
                                    outline: 'none',
                                    appearance: 'menulist'
                                  }}
                                >
                                  <option value="On Track">On Track</option>
                                  <option value="In Progress">In Progress</option>
                                  <option value="At Risk">At Risk</option>
                                </select>
                              </td>
                            </tr>
                            <tr style={{ backgroundColor: '#fcfdff', borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '12px 15px', fontWeight: 'bold', color: '#047857', whiteSpace: 'nowrap' }}>Actual</td>
                              <td style={{ padding: '12px 15px', whiteSpace: 'nowrap', color: '#445164' }}>{formatXAxisValue(item.actual.a)}</td>
                              <td style={{ padding: '12px 15px', whiteSpace: 'nowrap', color: '#445164' }}>{formatXAxisValue(item.actual.b)}</td>
                              <td style={{ padding: '12px 15px', whiteSpace: 'nowrap', color: '#445164' }}>{formatXAxisValue(item.actual.c)}</td>
                              <td style={{ padding: '12px 15px', whiteSpace: 'nowrap', color: '#445164' }}>{formatXAxisValue(item.actual.d)}</td>
                              <td style={{ padding: '12px 15px', whiteSpace: 'nowrap', color: '#445164' }}>{formatXAxisValue(item.actual.e)}</td>
                              <td style={{ padding: '12px 15px', whiteSpace: 'nowrap', color: '#445164' }}>{formatXAxisValue(item.actual.f)}</td>
                              <td style={{ padding: '12px 15px' }}>
                                <select
                                  value={item.actual.implementation}
                                  onChange={(e) => {
                                    const newMilestones = [...milestones];
                                    newMilestones[idx].actual.implementation = e.target.value;
                                    setMilestones(newMilestones);
                                  }}
                                  style={{
                                    display: 'inline-block',
                                    padding: '4px 24px 4px 12px',
                                    borderRadius: '6px',
                                    fontSize: '11px',
                                    fontWeight: 'bold',
                                    backgroundColor: item.actual.implementation === 'On Track' ? '#ecfdf5' : item.actual.implementation === 'In Progress' ? '#eff6ff' : '#fff1f2',
                                    color: item.actual.implementation === 'On Track' ? '#059669' : item.actual.implementation === 'In Progress' ? '#2563eb' : '#dc2626',
                                    border: `1px solid ${item.actual.implementation === 'On Track' ? '#10b981' : item.actual.implementation === 'In Progress' ? '#3b82f6' : '#f43f5e'}33`,
                                    cursor: 'pointer',
                                    outline: 'none',
                                    appearance: 'menulist'
                                  }}
                                >
                                  <option value="On Track">On Track</option>
                                  <option value="In Progress">In Progress</option>
                                  <option value="At Risk">At Risk</option>
                                </select>
                              </td>
                            </tr>
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Critical Issues Section */}
                {visibleSections.criticalIssues && (
                  <div style={{
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    overflow: 'hidden',
                    marginBottom: '28px'
                  }}>
                    <div style={{
                      textAlign: 'center',
                      padding: '14px 20px 10px',
                      backgroundColor: '#fff5f5',
                      borderBottom: '2px solid #fecaca'
                    }}>
                      <span style={{ fontSize: '18px', fontWeight: '900', color: '#b91c1c', letterSpacing: '-0.01em' }}>Critical Issues</span>
                    </div>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      backgroundColor: '#f8fafc',
                      padding: '10px 20px',
                      borderBottom: '1px solid #e2e8f0'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ backgroundColor: '#ef4444', width: '4px', height: '18px', borderRadius: '2px' }} />
                        <span style={{ fontSize: '15px', fontWeight: '800', color: '#1e3a5f' }}>Top Critical Issues</span>
                      </div>
                      <button
                        onClick={() => { setIssuesForm([...criticalIssues]); setShowEditIssues(true); }}
                        className="no-print"
                        style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', padding: '4px' }}
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                          <th style={{ padding: '12px 15px', textAlign: 'left', color: '#64748b', fontWeight: 'bold' }}>#</th>
                          <th style={{ padding: '12px 15px', textAlign: 'left', color: '#64748b', fontWeight: 'bold' }}>Issue Description</th>
                          <th style={{ padding: '12px 15px', textAlign: 'left', color: '#64748b', fontWeight: 'bold' }}>Owner</th>
                          <th style={{ padding: '12px 15px', textAlign: 'left', color: '#64748b', fontWeight: 'bold' }}>Function</th>
                          <th style={{ padding: '12px 15px', textAlign: 'left', color: '#64748b', fontWeight: 'bold' }}>Target Date</th>
                          <th style={{ padding: '12px 15px', textAlign: 'left', color: '#64748b', fontWeight: 'bold' }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {criticalIssues.map((item, index) => {
                          const colors = getStatusColor(item.status);

                          return (
                            <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '12px 15px', fontWeight: 'bold', color: '#64748b' }}>{item.id}</td>
                              <td style={{ padding: '12px 15px', color: '#1e3a5f', fontWeight: '500' }}>{item.issue}</td>
                              <td style={{ padding: '12px 15px', color: '#445164' }}>{item.responsibility}</td>
                              <td style={{ padding: '12px 15px', color: '#445164' }}>{item.function}</td>
                              <td style={{ padding: '12px 15px', color: '#445164' }}>{formatXAxisValue(item.targetDate)}</td>
                              <td style={{ padding: '12px 15px' }}>
                                <select
                                  value={item.status}
                                  onChange={(e) => {
                                    const newIssues = [...criticalIssues];
                                    const index = newIssues.findIndex(x => x.id === item.id);
                                    if (index !== -1) {
                                      newIssues[index].status = e.target.value;
                                      setCriticalIssues(newIssues);
                                    }
                                  }}
                                  style={{
                                    display: 'inline-block',
                                    padding: '4px 24px 4px 12px',
                                    borderRadius: '6px',
                                    fontSize: '11px',
                                    fontWeight: 'bold',
                                    backgroundColor: colors.bg,
                                    color: colors.text,
                                    border: `1px solid ${colors.text}33`,
                                    cursor: 'pointer',
                                    outline: 'none',
                                    appearance: 'menulist'
                                  }}
                                >
                                  <option value="Open">Open</option>
                                  <option value="In Progress">In Progress</option>
                                  <option value="Closed">Closed</option>
                                </select>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Project Metrics Charts */}
                {(Object.keys(visibleSections).some(key =>
                  visibleSections[key] && (
                    ['design', 'partDevelopment', 'build', 'gateway', 'validation', 'qualityIssues'].includes(key) ? availablePhases[key] :
                      (activeProject?.submodules || []).some(sub => sub.id === key)
                  )
                )) && (
                    <div style={{ marginBottom: '40px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '24px', gap: '6px' }}>
                        <h2 style={{ fontSize: '22px', fontWeight: '900', color: '#1e3a5f', margin: 0, letterSpacing: '-0.02em', textAlign: 'center' }}>
                          Project Metrics Summary
                        </h2>
                        <div style={{ backgroundColor: '#3b82f6', width: '48px', height: '4px', borderRadius: '2px' }} />
                      </div>

                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: '24px',
                        width: '100%'
                      }}>
                        {/* Iterate through all possible phases and submodules */}
                        {[
                          { id: 'design', label: 'Design', defaultType: 'bar' },
                          { id: 'partDevelopment', label: 'Part Development', defaultType: 'line' },
                          { id: 'build', label: 'Build', defaultType: 'pie' },
                          { id: 'gateway', label: 'Gateway', defaultType: 'area' },
                          { id: 'validation', label: 'Validation', defaultType: 'bar' },
                          { id: 'qualityIssues', label: 'Quality Issues', defaultType: 'bar' },
                          // Also include all submodules as potential chart sources
                          ...(activeProject?.submodules || []).map(sub => ({ id: sub.id, label: sub.displayName || sub.name, isDynamic: true }))
                        ].filter((phase, index, self) => {
                          // Filter out duplicates and check visibility/availability
                          const isDuplicate = self.findIndex(p => p.id === phase.id) !== index;
                          if (isDuplicate) return false;

                          const isVisible = visibleSections[phase.id];
                          const isAvailable = availablePhases[phase.id];
                          return isVisible && isAvailable;
                        }).map(phase => (
                          <div
                            key={phase.id}
                            style={{
                              border: '1px solid #e2e8f0',
                              borderRadius: '12px',
                              overflow: 'hidden',
                              backgroundColor: 'white',
                              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                              position: 'relative',
                              transition: 'transform 0.2s, box-shadow 0.2s'
                            }}
                            className="hover:shadow-lg"
                          >
                            <div style={{
                              backgroundColor: '#f8fafc',
                              padding: '12px 15px',
                              borderBottom: '1px solid #e2e8f0',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}>
                              <span style={{ fontSize: '15px', fontWeight: '800', color: '#1e3a5f', letterSpacing: '-0.01em' }}>{humanizeLabel(phase.label)}</span>
                              {renderChartOptions(phase.id, chartTypes[activeProject.id]?.[phase.id] || phase.defaultType || 'bar')}
                            </div>
                            <div style={{ padding: '20px' }}>
                              {renderChart(phase.id, chartTypes[activeProject.id]?.[phase.id] || phase.defaultType || 'bar', false, getTrackerForPhase(phase.id)?.trackerId)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}



                {/* Summary Cards */}
                {(visibleSections.budget || visibleSections.resource || visibleSections.quality) && (
                  <div style={{ marginBottom: '35px' }}>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: [visibleSections.budget, visibleSections.resource, visibleSections.quality].filter(Boolean).length === 3 ? 'repeat(3, 1fr)' : [visibleSections.budget, visibleSections.resource, visibleSections.quality].filter(Boolean).length === 2 ? 'repeat(2, 1fr)' : '1fr',
                      gap: '20px'
                    }}>
                      {/* Budget Summary */}
                      {/* Budget Summary Tracker Table */}
                      {visibleSections.budget && (
                        <div style={{
                          gridColumn: '1 / -1',
                          backgroundColor: 'white',
                          borderRadius: '12px',
                          border: '1px solid #e2e8f0',
                          overflow: 'hidden',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                          display: 'flex',
                          flexDirection: 'column'
                        }}>
                          <div style={{
                            padding: '16px 24px',
                            backgroundColor: '#f8fafc',
                            borderBottom: '1px solid #e2e8f0',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div style={{ backgroundColor: '#3b82f6', color: 'white', padding: '8px', borderRadius: '8px', display: 'flex' }}>
                                <Settings size={18} />
                              </div>
                              <span style={{ fontSize: '18px', fontWeight: '800', color: '#1e3a5f' }}>Budget Summary</span>
                            </div>
                            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', backgroundColor: '#f8fafc' }}>
                              <div style={{ display: 'flex', alignItems: 'center' }}>
                                <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#64748b', marginRight: '8px' }}>Project Name:</span>
                                <input
                                  list="projectMasterList"
                                  value={selectedBudgetProject}
                                  onChange={(e) => setSelectedBudgetProject(e.target.value)}
                                  placeholder="Select or Type project..."
                                  style={{ padding: '8px 14px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', fontWeight: '700', color: '#1e3a5f', width: '220px', outline: 'none', backgroundColor: 'white' }}
                                />
                                <datalist id="projectMasterList">
                                  {masterProjects.map((p, idx) => (
                                    <option key={idx} value={p.name}>{p.name}</option>
                                  ))}
                                </datalist>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', marginLeft: '8px', marginRight: '8px' }}>
                                <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#64748b', marginRight: '8px' }}>Status:</span>
                                <span style={{ fontSize: '15px', fontWeight: '800', color: '#10b981' }}>
                                  {masterProjects.find(p => p.name === selectedBudgetProject)?.status || activeProject?.status || 'Active'}
                                </span>
                              </div>
                              <button
                                onClick={() => {
                                  const currentName = selectedBudgetProject || activeProject?.name || '';
                                  const currentStatus = masterProjects.find(p => p.name === currentName)?.status || activeProject?.status || 'Active';
                                  setModalProjectName(currentName);
                                  setModalProjectStatus(currentStatus);
                                  setEditType('budgetTable');
                                  setBudgetTableForm([...budgetTableData]);
                                  setShowEditSummary(true);
                                }}
                                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '6px', border: '1px solid #3b82f6', backgroundColor: '#ffffff', color: '#3b82f6', fontWeight: '700', fontSize: '14px', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
                                onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#eff6ff'; }}
                                onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#ffffff'; }}
                              >
                                <Edit size={16} /> Edit
                              </button>
                            </div>
                          </div>
                          <div style={{ padding: '24px 20px', backgroundColor: '#ffffff' }}>
                            {budgetTableData && budgetTableData.length > 0 ? (
                              <div style={{ borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                                <table style={{ minWidth: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                                  <thead style={{ backgroundColor: '#f8fafc' }}>
                                    <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                                      {budgetTableData[0].map((h, i) => (
                                        <th key={i} style={{ padding: '12px 14px', color: '#475569', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                                          {h}
                                        </th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {budgetTableData.slice(1).map((row, idx) => {
                                      const isTotal = row[0] && row[0].toString().startsWith('Total');
                                      const isCategory = row[0] && (row[0] === 'CAPEX' || row[0] === 'Revenue');
                                      const fw = isTotal || isCategory ? 'bold' : 'normal';
                                      const color = isTotal ? '#1e3a5f' : '#475569';

                                      return (
                                        <tr key={idx} style={{ backgroundColor: 'white', borderBottom: '1px solid #f1f5f9' }}>
                                          {row.map((cell, colIdx) => (
                                            <td key={colIdx} style={{ padding: '14px', fontWeight: fw, color: color }}>
                                              {cell}
                                            </td>
                                          ))}
                                        </tr>
                                      )
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <div style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>No budget data available</div>
                            )}
                          </div>
                        </div>
                      )}
                      {/* Resource Summary */}
                      {visibleSections.resource && (
                        <div style={{
                          backgroundColor: 'white',
                          borderRadius: '12px',
                          border: '1px solid #e2e8f0',
                          overflow: 'hidden',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                          display: 'flex',
                          flexDirection: 'column'
                        }}>
                          <div style={{
                            padding: '16px 20px',
                            backgroundColor: '#f0fdf4',
                            borderBottom: '1px solid #dcfce7',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{ backgroundColor: '#22c55e', color: 'white', padding: '6px', borderRadius: '8px' }}>
                                <Check size={16} />
                              </div>
                              <span style={{ fontSize: '15px', fontWeight: '800', color: '#1e3a5f' }}>Resource</span>
                            </div>
                            <button
                              onClick={() => { setEditType('resource'); setSummaryForm({ ...summaryData }); setShowEditSummary(true); }}
                              className="no-print"
                              style={{ background: 'none', border: 'none', color: '#22c55e', cursor: 'pointer', padding: '4px' }}
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                          </div>
                          <div style={{ padding: '20px', display: 'grid', gap: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                              <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '600' }}>Deployed</span>
                              <span style={{ fontSize: '18px', fontWeight: '900', color: '#1e3a5f' }}>{summaryData.resourceDeployed}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                              <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '600' }}>Shortage</span>
                              <span style={{ fontSize: '18px', fontWeight: '900', color: '#ef4444' }}>{summaryData.resourceShortage}</span>
                            </div>
                            <div style={{ height: '1px', backgroundColor: '#f1f5f9', margin: '4px 0' }} />
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                              <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '600' }}>Status</span>
                              <div style={{ textAlign: 'right' }}>
                                <span style={{ fontSize: '18px', fontWeight: '900', color: '#f59e0b' }}>{summaryData.resourceUtilized}/{summaryData.resourceDeployed}</span>
                                <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 'bold' }}>UTILIZATION</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Quality Summary */}
                      {visibleSections.quality && (
                        <div style={{
                          backgroundColor: 'white',
                          borderRadius: '12px',
                          border: '1px solid #e2e8f0',
                          overflow: 'hidden',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                          display: 'flex',
                          flexDirection: 'column'
                        }}>
                          <div style={{
                            padding: '16px 20px',
                            backgroundColor: '#fff7ed',
                            borderBottom: '1px solid #ffedd5',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{ backgroundColor: '#f59e0b', color: 'white', padding: '6px', borderRadius: '8px' }}>
                                <Filter size={16} />
                              </div>
                              <span style={{ fontSize: '15px', fontWeight: '800', color: '#1e3a5f' }}>Quality</span>
                            </div>
                            <button
                              onClick={() => { setEditType('quality'); setSummaryForm({ ...summaryData }); setShowEditSummary(true); }}
                              className="no-print"
                              style={{ background: 'none', border: 'none', color: '#f59e0b', cursor: 'pointer', padding: '4px' }}
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                          </div>
                          <div style={{ padding: '20px', display: 'grid', gap: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                              <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '600' }}>Total Issues</span>
                              <span style={{ fontSize: '18px', fontWeight: '900', color: '#1e3a5f' }}>{summaryData.qualityTotal}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                              <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '600' }}>Open</span>
                              <span style={{ fontSize: '18px', fontWeight: '900', color: '#ef4444' }}>{summaryData.qualityOpen}</span>
                            </div>
                            <div style={{ height: '1px', backgroundColor: '#f1f5f9', margin: '4px 0' }} />
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                              <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '600' }}>Closed</span>
                              <div style={{ textAlign: 'right' }}>
                                <span style={{ fontSize: '18px', fontWeight: '900', color: '#10b981' }}>{summaryData.qualityCompleted}</span>
                                <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 'bold' }}>RESOLUTION</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Empty state when no sections are selected */}
                {Object.values(visibleSections).filter(v => v).length === 0 && (
                  <div style={{
                    textAlign: 'center',
                    padding: '50px',
                    backgroundColor: '#f9fafb',
                    borderRadius: '8px',
                    border: '2px dashed #e0e0e0'
                  }}>
                    <div style={{ fontSize: '48px', marginBottom: '20px' }}>📊</div>
                    <h3 style={{ fontSize: '18px', color: '#1e3a5f', marginBottom: '10px' }}>No Sections Selected</h3>
                    <p style={{ fontSize: '14px', color: '#4b5563', marginBottom: '20px' }}>
                      Click the "Configure Dashboard" button to select which sections to display for {activeProject.name}.
                    </p>
                    <button
                      onClick={() => setShowSimulateModal(true)}
                      style={{
                        padding: '10px 20px',
                        fontSize: '14px',
                        borderRadius: '4px',
                        border: 'none',
                        backgroundColor: '#1e3a5f',
                        color: 'white',
                        cursor: 'pointer',
                        fontWeight: 'bold'
                      }}
                    >
                      Configure Dashboard
                    </button>
                  </div>
                )}
              </div>
            </div>
            {/* End project-dashboard-main-content */}
          </>
        )}
      </div>
    </div>
  );
};

// Email Modal Component
const EmailModal = ({
  show,
  onClose,
  activeProject,
  emailData,
  setEmailData,
  allEmployees,
  employeeSearchTerm,
  setEmployeeSearchTerm,
  showEmployeeDropdown,
  setShowEmployeeDropdown,
  activeEmailField,
  setActiveEmailField,
  addContactFromList,
  handleEmailInputChange,
  removeEmailInput,
  availablePhases,
  getTrackerForPhase,
  openPrintPreview,
  handleSendEmail
}) => {
  if (!show) return null;

  const allSelected = Object.values(emailData.selectedSections).every(value => value);

  const handleSelectAll = () => {
    const newState = !allSelected;
    const updatedSections = {};
    Object.keys(emailData.selectedSections).forEach(key => {
      updatedSections[key] = newState;
    });
    setEmailData(prev => ({ ...prev, selectedSections: updatedSections }));
  };

  const handleSectionToggle = (section) => {
    setEmailData(prev => ({
      ...prev,
      selectedSections: {
        ...prev.selectedSections,
        [section]: !prev.selectedSections[section]
      }
    }));
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        width: '700px',
        maxWidth: '100%',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          backgroundColor: '#1e3a5f',
          color: 'white',
          padding: '15px 20px',
          fontSize: '18px',
          fontWeight: 'bold',
          borderBottom: '1px solid #2c4c7c',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0
        }}>
          <span>Send Project Dashboard Summary</span>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'white',
              fontSize: '20px',
              cursor: 'pointer',
              padding: '0 5px'
            }}
          >
            ×
          </button>
        </div>

        {/* Scrollable Content */}
        <div style={{
          padding: '20px',
          overflowY: 'auto',
          flex: 1
        }}>
          <p style={{ fontSize: '14px', color: '#4b5563', marginBottom: '15px' }}>
            Email the dashboard summary for <span style={{ fontWeight: 'bold', color: '#1e3a5f' }}>{activeProject?.name}</span>.
          </p>

          {/* Employee Search/Selection - PLACED AT TOP AS REQUESTED */}
          <div style={{
            marginBottom: '20px',
            padding: '15px',
            backgroundColor: '#f8fafc',
            borderRadius: '6px',
            border: '1px solid #e2e8f0'
          }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold', color: '#1e3a5f', fontSize: '13px' }}>Choose Employees:</label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                value={employeeSearchTerm}
                onChange={(e) => {
                  setEmployeeSearchTerm(e.target.value);
                  setShowEmployeeDropdown(true);
                }}
                onFocus={() => setShowEmployeeDropdown(true)}
                placeholder="Type name or email to search employees..."
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #c0c0c0',
                  borderRadius: '4px',
                  fontSize: '13px',
                  outline: 'none',
                  boxShadow: showEmployeeDropdown ? '0 0 0 2px rgba(30, 58, 95, 0.1)' : 'none',
                  transition: 'all 0.2s',
                  position: 'relative',
                  zIndex: showEmployeeDropdown ? 15 : 1
                }}
              />
              <div style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#9ca3af',
                pointerEvents: 'none',
                fontSize: '12px'
              }}>
                ▼
              </div>

              {showEmployeeDropdown && (
                <>
                  <div
                    onClick={() => setShowEmployeeDropdown(false)}
                    style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10 }}
                  />
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    backgroundColor: 'white',
                    border: '1px solid #e0e0e0',
                    borderRadius: '4px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    marginTop: '4px',
                    maxHeight: '180px',
                    overflowY: 'auto',
                    zIndex: 20
                  }}>
                    {allEmployees
                      ?.filter(emp =>
                        String(emp.name || '').toLowerCase().includes(employeeSearchTerm.toLowerCase()) ||
                        String(emp.email || '').toLowerCase().includes(employeeSearchTerm.toLowerCase())
                      )
                      .slice(0, 50)
                      .map(contact => (
                        <div
                          key={contact.id}
                          onClick={() => addContactFromList(contact.email, activeEmailField)}
                          style={{
                            padding: '8px 15px',
                            cursor: 'pointer',
                            borderBottom: '1px solid #f3f4f6',
                            transition: 'background-color 0.2s',
                            display: 'flex',
                            flexDirection: 'column'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0f7ff'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                        >
                          <span style={{ fontWeight: 'bold', fontSize: '12px', color: '#1e3a5f' }}>{contact.name || 'Unknown Name'}</span>
                          <span style={{ fontSize: '11px', color: '#6b7280' }}>{contact.email} • {contact.department || 'No Dept'}</span>
                        </div>
                      ))}
                    {allEmployees?.length === 0 && (
                      <div style={{ padding: '15px', textAlign: 'center', color: '#9ca3af', fontSize: '12px' }}>
                        No employees loaded.
                      </div>
                    )}
                    {allEmployees?.length > 0 && allEmployees.filter(emp =>
                      String(emp.name || '').toLowerCase().includes(employeeSearchTerm.toLowerCase()) ||
                      String(emp.email || '').toLowerCase().includes(employeeSearchTerm.toLowerCase())
                    ).length === 0 && (
                        <div style={{ padding: '15px', textAlign: 'center', color: '#9ca3af', fontSize: '12px' }}>
                          No matches found for "{employeeSearchTerm}"
                        </div>
                      )}
                  </div>
                </>
              )}
            </div>
            <p style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px', marginBottom: 0 }}>
              * Click to add to the <span style={{ fontWeight: 'bold', color: '#1e3a5f' }}>{activeEmailField.toUpperCase()}</span> field.
            </p>
          </div>

          {/* To, CC, BCC fields */}
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold', color: '#1e3a5f', fontSize: '13px' }}>To:</label>
            {emailData.emailInputs.map((email, index) => (
              <div key={`to-${index}`} style={{ display: 'flex', marginBottom: '4px', gap: '8px' }}>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => handleEmailInputChange(index, e.target.value, 'email')}
                  onFocus={() => setActiveEmailField('email')}
                  placeholder="Enter email address"
                  style={{
                    flex: 1,
                    padding: '6px 8px',
                    border: '1px solid #c0c0c0',
                    borderRadius: '4px',
                    fontSize: '13px'
                  }}
                />
                {index < emailData.emailInputs.length - 1 && (
                  <button
                    onClick={() => removeEmailInput(index, 'email')}
                    style={{
                      padding: '4px 8px',
                      backgroundColor: '#fee2e2',
                      border: 'none',
                      borderRadius: '4px',
                      color: '#991b1b',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      fontSize: '14px'
                    }}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold', color: '#1e3a5f', fontSize: '13px' }}>CC:</label>
            {emailData.ccInputs.map((email, index) => (
              <div key={`cc-${index}`} style={{ display: 'flex', marginBottom: '4px', gap: '8px' }}>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => handleEmailInputChange(index, e.target.value, 'cc')}
                  onFocus={() => setActiveEmailField('cc')}
                  placeholder="Enter email address"
                  style={{
                    flex: 1,
                    padding: '6px 8px',
                    border: '1px solid #c0c0c0',
                    borderRadius: '4px',
                    fontSize: '13px'
                  }}
                />
                {index < emailData.ccInputs.length - 1 && (
                  <button
                    onClick={() => removeEmailInput(index, 'cc')}
                    style={{
                      padding: '4px 8px',
                      backgroundColor: '#fee2e2',
                      border: 'none',
                      borderRadius: '4px',
                      color: '#991b1b',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      fontSize: '14px'
                    }}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold', color: '#1e3a5f', fontSize: '13px' }}>BCC:</label>
            {emailData.bccInputs.map((email, index) => (
              <div key={`bcc-${index}`} style={{ display: 'flex', marginBottom: '4px', gap: '8px' }}>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => handleEmailInputChange(index, e.target.value, 'bcc')}
                  onFocus={() => setActiveEmailField('bcc')}
                  placeholder="Enter email address"
                  style={{
                    flex: 1,
                    padding: '6px 8px',
                    border: '1px solid #c0c0c0',
                    borderRadius: '4px',
                    fontSize: '13px'
                  }}
                />
                {index < emailData.bccInputs.length - 1 && (
                  <button
                    onClick={() => removeEmailInput(index, 'bcc')}
                    style={{
                      padding: '4px 8px',
                      backgroundColor: '#fee2e2',
                      border: 'none',
                      borderRadius: '4px',
                      color: '#991b1b',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      fontSize: '14px'
                    }}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>


          {/* Subject */}
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold', color: '#1e3a5f', fontSize: '13px' }}>Subject:</label>
            <input
              type="text"
              value={emailData.subject}
              onChange={(e) => setEmailData(prev => ({ ...prev, subject: e.target.value }))}
              style={{
                width: '100%',
                padding: '6px 8px',
                border: '1px solid #c0c0c0',
                borderRadius: '4px',
                fontSize: '13px'
              }}
            />
          </div>

          {/* Message */}
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold', color: '#1e3a5f', fontSize: '13px' }}>Message (Optional):</label>
            <textarea
              value={emailData.message}
              onChange={(e) => setEmailData(prev => ({ ...prev, message: e.target.value }))}
              rows="2"
              style={{
                width: '100%',
                padding: '6px 8px',
                border: '1px solid #c0c0c0',
                borderRadius: '4px',
                fontSize: '13px',
                resize: 'vertical'
              }}
              placeholder="Add a message..."
            />
          </div>

          {/* Section selection */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontWeight: 'bold', color: '#1e3a5f', fontSize: '13px' }}>Select Sections to Include:</label>
              <button
                onClick={handleSelectAll}
                style={{
                  padding: '2px 8px',
                  fontSize: '11px',
                  borderRadius: '4px',
                  border: '1px solid #1e3a5f',
                  backgroundColor: allSelected ? '#1e3a5f' : 'white',
                  color: allSelected ? 'white' : '#1e3a5f',
                  cursor: 'pointer'
                }}
              >
                {allSelected ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
              {/* Default Sections */}
              {[
                { id: 'milestones', label: 'Milestones' },
                { id: 'criticalIssues', label: 'Critical Issues' },
                { id: 'budget', label: 'Budget Summary' },
                { id: 'resource', label: 'Resource Summary' },
                { id: 'quality', label: 'Quality Summary' },
                { id: 'design', label: 'Design' },
                { id: 'partDevelopment', label: 'Part Development' },
                { id: 'build', label: 'Build' },
                { id: 'gateway', label: 'Gateway' },
                { id: 'validation', label: 'Validation' },
                { id: 'qualityIssues', label: 'Quality Issues' },
                { id: 'sopTables', label: 'SOP Tables' }
              ].filter(section => {
                const metricKeys = ['design', 'partDevelopment', 'build', 'gateway', 'validation', 'qualityIssues'];
                if (metricKeys.includes(section.id)) return availablePhases[section.id];
                return true;
              }).map(section => (
                <label key={section.id} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={emailData.selectedSections[section.id] || false}
                    onChange={() => handleSectionToggle(section.id)}
                  />
                  {section.label}
                </label>
              ))}

              {/* Dynamic Trackers */}
              {(activeProject?.submodules || []).filter(sub => {
                const defaultIds = ['design', 'partDevelopment', 'build', 'gateway', 'validation', 'qualityIssues'];
                const coveredByDefault = defaultIds.some(id => {
                  const tracker = getTrackerForPhase(id);
                  return tracker && tracker.id === sub.id;
                });
                return !coveredByDefault;
              }).map(sub => (
                <label key={sub.id} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={emailData.selectedSections[sub.id] || false}
                    onChange={() => handleSectionToggle(sub.id)}
                  />
                  {sub.displayName || sub.name}
                </label>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #e0e0e0', paddingTop: '15px' }}>
            <button
              onClick={onClose}
              style={{
                padding: '10px 20px',
                fontSize: '14px',
                borderRadius: '4px',
                border: '1px solid #c0c0c0',
                backgroundColor: 'white',
                color: '#4b5563',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              Cancel
            </button>
            <button
              onClick={openPrintPreview}
              style={{
                padding: '10px 20px',
                fontSize: '14px',
                borderRadius: '4px',
                border: '1px solid #f59e0b',
                backgroundColor: '#f59e0b',
                color: 'white',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              Preview PDF
            </button>
            <button
              onClick={handleSendEmail}
              style={{
                padding: '10px 20px',
                fontSize: '14px',
                borderRadius: '4px',
                border: 'none',
                backgroundColor: '#1e3a5f',
                color: 'white',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              Send Email
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Axis Selector Modal Component
const AxisSelectorModal = ({
  chartId,
  onClose,
  activeProject,
  axisConfigs,
  submoduleData,
  tracker,
  availableColumns,
  handleAxesUpdate
}) => {
  const config = axisConfigs[activeProject.id]?.[chartId] || { xAxis: '', yAxis: '' };
  const [localConfig, setLocalConfig] = useState(config);

  // Compute dynamic availableColumns based on prefetched data
  const dynamicAvailableColumns = useMemo(() => {
    if (tracker) {
      const data = submoduleData[tracker.trackerId];
      if (data && data.headers && data.headers.length > 0) {
        return data.headers;
      }
    }
    return availableColumns; // Fallback to dummy data
  }, [tracker, submoduleData, availableColumns]);

  // Set defaults if localConfig is empty but columns are available
  useEffect(() => {
    if (dynamicAvailableColumns.length > 0) {
      if (!localConfig.xAxis || !dynamicAvailableColumns.includes(localConfig.xAxis)) {
        setLocalConfig(prev => ({ ...prev, xAxis: dynamicAvailableColumns[0] }));
      }
      if (!localConfig.yAxis || !dynamicAvailableColumns.includes(localConfig.yAxis)) {
        setLocalConfig(prev => ({ ...prev, yAxis: dynamicAvailableColumns.length > 1 ? dynamicAvailableColumns[1] : dynamicAvailableColumns[0] }));
      }
    }
  }, [dynamicAvailableColumns]);

  const [showPrompt, setShowPrompt] = useState(false);

  const handleApply = () => {
    // Check if both axes are dates
    const data = (tracker && submoduleData[tracker.trackerId] && submoduleData[tracker.trackerId].rows) || [];
    const isXDate = isDateColumn(data, localConfig.xAxis);
    const isYDate = isDateColumn(data, localConfig.yAxis);

    if (isXDate && isYDate) {
      const relationship = inferDateRelationship(localConfig.xAxis, localConfig.yAxis);
      if (relationship) {
        handleAxesUpdate(chartId, localConfig.xAxis, localConfig.yAxis, relationship);
        onClose();
      } else {
        setShowPrompt(true);
      }
    } else {
      handleAxesUpdate(chartId, localConfig.xAxis, localConfig.yAxis, null);
      onClose();
    }
  };

  const handleSelectedMetric = (type, label, date1, date2) => {
    handleAxesUpdate(chartId, localConfig.xAxis, localConfig.yAxis, { type, label, date1, date2 });
    onClose();
  };

  return (
    <div style={{
      position: 'absolute',
      top: '100%',
      right: '0',
      backgroundColor: 'white',
      border: '1px solid #e2e8f0',
      borderRadius: '12px',
      boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
      padding: '16px',
      zIndex: 200,
      width: '280px',
      marginTop: '12px'
    }}>
      {!showPrompt ? (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#1e3a5f' }}>Configure Axes</h3>
            <button
              onClick={onClose}
              style={{
                border: 'none',
                background: '#f1f5f9',
                cursor: 'pointer',
                fontSize: '12px',
                width: '24px',
                height: '24px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#64748b',
                fontWeight: 'bold'
              }}
            >
              ✕
            </button>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#64748b', marginBottom: '6px', textTransform: 'uppercase' }}>
              X-Axis Attribute
            </label>
            <select
              value={localConfig.xAxis}
              onChange={(e) => setLocalConfig(prev => ({ ...prev, xAxis: e.target.value }))}
              style={{
                width: '100%',
                padding: '8px 12px',
                fontSize: '13px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                backgroundColor: 'white',
                cursor: 'pointer',
                outline: 'none',
                color: '#1e3a5f',
                fontWeight: '500'
              }}
            >
              {dynamicAvailableColumns.map(col => (
                <option key={col} value={col}>{col}</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#64748b', marginBottom: '6px', textTransform: 'uppercase' }}>
              Y-Axis Attribute
            </label>
            <select
              value={localConfig.yAxis}
              onChange={(e) => setLocalConfig(prev => ({ ...prev, yAxis: e.target.value }))}
              style={{
                width: '100%',
                padding: '8px 12px',
                fontSize: '13px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                backgroundColor: 'white',
                cursor: 'pointer',
                outline: 'none',
                color: '#1e3a5f',
                fontWeight: '500'
              }}
            >
              {dynamicAvailableColumns.map(col => (
                <option key={col} value={col}>{col}</option>
              ))}
            </select>
          </div>

          <button
            onClick={handleApply}
            style={{
              width: '100%',
              padding: '10px',
              backgroundColor: '#1e3a5f',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '800',
              fontSize: '13px',
              boxShadow: '0 4px 6px -1px rgba(30, 58, 95, 0.2)'
            }}
          >
            Apply Configuration
          </button>
        </>
      ) : (
        <div>
          <div style={{ backgroundColor: '#f1f5f9', borderRadius: '8px', padding: '10px 12px', marginBottom: '12px', fontSize: '12px', color: '#475569', lineHeight: '1.5' }}>
            <strong style={{ color: '#1e3a5f' }}>Attr 1:</strong> {localConfig.xAxis}<br />
            <strong style={{ color: '#1e3a5f' }}>Attr 2:</strong> {localConfig.yAxis}
          </div>
          <h3 style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: '800', color: '#1e3a5f', lineHeight: '1.4' }}>
            Both are dates {"\u2014"} what should we calculate?
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button
              onClick={() => handleSelectedMetric('delay', 'Delay', localConfig.xAxis, localConfig.yAxis)}
              style={{ padding: '10px 12px', textAlign: 'left', borderRadius: '8px', border: '1px solid #bfdbfe', backgroundColor: '#eff6ff', cursor: 'pointer', fontSize: '12px', fontWeight: '600', color: '#1e40af' }}
            >
              Delay = {localConfig.yAxis} - {localConfig.xAxis}
            </button>
            <button
              onClick={() => handleSelectedMetric('duration', 'Duration', localConfig.xAxis, localConfig.yAxis)}
              style={{ padding: '10px 12px', textAlign: 'left', borderRadius: '8px', border: '1px solid #bbf7d0', backgroundColor: '#f0fdf4', cursor: 'pointer', fontSize: '12px', fontWeight: '600', color: '#166534' }}
            >
              Duration = {localConfig.yAxis} - {localConfig.xAxis}
            </button>
            <button
              onClick={() => { handleAxesUpdate(chartId, localConfig.xAxis, localConfig.yAxis, null); onClose(); }}
              style={{ padding: '10px 12px', textAlign: 'left', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', cursor: 'pointer', fontSize: '12px', fontWeight: '600', color: '#64748b' }}
            >
              Plot as-is (no calculation)
            </button>
            <button
              onClick={() => setShowPrompt(false)}
              style={{ padding: '8px', textAlign: 'center', backgroundColor: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '11px', fontWeight: '700' }}
            >
              {"\u2190"} Back to selection
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectTitleDashboard;