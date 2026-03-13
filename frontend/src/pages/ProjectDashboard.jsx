import React, { useState, useEffect, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import '../utils/echarts-theme-v5'; // Register the v5 theme
import ExcelTableViewer from '../components/ExcelTableViewer';
import { Layout, Maximize2, Minimize2, Send, Mail, Search, Edit, Plus, Trash2, X, Filter, ChevronUp, ChevronDown, Check, Save, Settings } from 'lucide-react';

const ProjectTitleDashboard = ({ selectedFileId, onClearSelection }) => {
  // Projects data
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    const loadProjects = async () => {
      try {
        const { default: API } = await import('../utils/api');
        const response = await API.get('/datasets/');
        const datasets = response.data;

        setProjects(prevProjects => {
          const uniqueProjectsMap = new Map();

          datasets.forEach((dataset, index) => {
            let projectName = dataset.project || 'Uncategorized';
            projectName = projectName.replace(/tata\s+motors/ig, 'TATA');
            const capitalizedName = projectName.charAt(0).toUpperCase() + projectName.slice(1);

            if (!uniqueProjectsMap.has(capitalizedName)) {
              const existing = prevProjects.find(p => p.name === capitalizedName || p.name === projectName);
              uniqueProjectsMap.set(capitalizedName, {
                id: existing ? existing.id : `project-dashboard-${capitalizedName.toLowerCase().replace(/\\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`,
                name: capitalizedName,
                code: capitalizedName.substring(0, 4).toUpperCase(),
                active: existing ? existing.active : false,
                dashboardConfig: existing ? existing.dashboardConfig : null,
                submodules: []
              });
            }

            const existingProject = uniqueProjectsMap.get(capitalizedName);
            if (!existingProject.submodules.some(sub => sub.trackerId === dataset.id)) {
              existingProject.submodules.push({
                id: `project-file-${dataset.id}`,
                trackerId: dataset.id,
                name: dataset.fileName,
                displayName: (dataset.fileName || '').replace(/\.[^/.]+$/, ""),
                department: dataset.department, // Add department field
                type: 'file',
                projectName: capitalizedName
              });
            }
          });

          return Array.from(uniqueProjectsMap.values());
        });
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
        setActiveProject(selectedProject);
        if (selectedProject.dashboardConfig) {
          setVisibleSections(selectedProject.dashboardConfig.visibleSections || {});
          setShowSimulateModal(false);
        } else {
          setShowSimulateModal(true);
        }
      }
    };

    const handleResetDashboardProject = () => {
      setActiveProject(null);
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

  // Current active project
  const [activeProject, setActiveProject] = useState(null);

  // Selected submodule for detailed view
  const [selectedSubmodule, setSelectedSubmodule] = useState(null);

  // Submodule data (from uploaded Excel)
  const [submoduleData, setSubmoduleData] = useState({});

  // Chart types state for each project
  const [chartTypes, setChartTypes] = useState({});

  // Axis configs state for each project
  const [axisConfigs, setAxisConfigs] = useState({});

  const [maximizedChart, setMaximizedChart] = useState(null);
  const [showAxisSelector, setShowAxisSelector] = useState(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showSimulateModal, setShowSimulateModal] = useState(false);
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
      partDevelopment: true,
      build: true,
      gateway: true,
      validation: true,
      qualityCheck: true
    },
    emailInputs: [''],
    ccInputs: [''],
    bccInputs: ['']
  });

  // New state for dashboard visibility
  const [visibleSections, setVisibleSections] = useState({
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

  // Helper to determine which phases are available based on uploaded files
  const availablePhases = useMemo(() => {
    if (!activeProject || !activeProject.submodules) return {
      design: false,
      partDevelopment: false,
      build: false,
      gateway: false,
      validation: false,
      qualityIssues: false
    };

    const isAvailable = (deptName, aliases) => activeProject.submodules.some(sub => {
      const name = (sub.displayName || sub.name || '').toLowerCase();
      const dept = (sub.department || '').toLowerCase();
      const targetDept = deptName.toLowerCase();

      return dept === targetDept || aliases.some(alias => name.includes(alias.toLowerCase()));
    });

    return {
      design: isAvailable('Design Release', ['design']),
      partDevelopment: isAvailable('Part Development', ['part development', 'partdevelopment', 'part_development', 'part']),
      build: isAvailable('Build', ['build']),
      gateway: isAvailable('Gateway', ['gateway']),
      validation: isAvailable('Validation', ['validation']),
      qualityIssues: isAvailable('Quality Issues', ['quality check', 'qualitycheck', 'quality_check', 'quality', 'issues'])
    };
  }, [activeProject]);

  // Helper to get specific tracker for a phase
  const getTrackerForPhase = (phase) => {
    if (!activeProject || !activeProject.submodules) return null;

    const mapping = {
      design: { dept: 'Design Release', aliases: ['design'] },
      partDevelopment: { dept: 'Part Development', aliases: ['part development', 'partdevelopment', 'part_development', 'part'] },
      build: { dept: 'Build', aliases: ['build'] },
      gateway: { dept: 'Gateway', aliases: ['gateway'] },
      validation: { dept: 'Validation', aliases: ['validation'] },
      qualityIssues: { dept: 'Quality Issues', aliases: ['quality check', 'qualitycheck', 'quality_check', 'quality', 'issues'] }
    };

    const config = mapping[phase];
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

  // Modal States
  const [showEditMilestones, setShowEditMilestones] = useState(false);
  const [showEditIssues, setShowEditIssues] = useState(false);
  const [showEditSummary, setShowEditSummary] = useState(false);
  const [editType, setEditType] = useState(null); // 'budget', 'resource', 'quality'

  // Form States
  const [milestoneForm, setMilestoneForm] = useState(null);
  const [issuesForm, setIssuesForm] = useState([]);
  const [summaryForm, setSummaryForm] = useState({});

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
  // Handle selected file ID prop from Dashboard
  useEffect(() => {
    if (selectedFileId && projects.length > 0) {
      // Find the project containing this file
      for (const project of projects) {
        const fileMatch = project.submodules?.find(s =>
          s.trackerId === selectedFileId ||
          `project-file-${s.trackerId}` === selectedFileId ||
          s.id === selectedFileId
        );

        if (fileMatch) {
          // Set active project if not already set or different
          if (!activeProject || activeProject.id !== project.id) {
            setActiveProject(project);
            if (project.dashboardConfig) {
              setVisibleSections(project.dashboardConfig.visibleSections || {});
              setShowSimulateModal(false);
            }
          }

          // Set active file
          setSelectedSubmodule(fileMatch);
          loadSubmoduleData(fileMatch.trackerId);
          break;
        }
      }
    }
  }, [selectedFileId, projects, activeProject]);

  // Handle submodule click
  const handleSubmoduleClick = (submodule) => {
    setSelectedSubmodule(submodule);
    loadSubmoduleData(submodule.trackerId);
  };

  // Handle back to project dashboard
  const handleBackToProjectDashboard = () => {
    setSelectedSubmodule(null);
  };

  // Handle project selection
  // Handle project selection
  const handleProjectSelect = (projectId) => {
    const selectedProject = projects.find(p => p.id === projectId);
    setActiveProject(selectedProject);
    setSelectedSubmodule(null); // Reset submodule selection

    if (selectedProject?.dashboardConfig) {
      setVisibleSections(selectedProject.dashboardConfig.visibleSections || {});
      setShowSimulateModal(false);
    } else {
      setShowSimulateModal(true);
    }
  };

  // Prefetch data for all phases whenever activeProject changes
  useEffect(() => {
    if (activeProject?.submodules) {
      const phasesToLoad = ['design', 'partDevelopment', 'build', 'gateway', 'validation', 'qualityIssues'];
      phasesToLoad.forEach(phase => {
        const tracker = getTrackerForPhase(phase);
        if (tracker && (!submoduleData[tracker.trackerId] || submoduleData[tracker.trackerId].rows.length === 0)) {
          loadSubmoduleData(tracker.trackerId);
        }
      });
    }
  }, [activeProject]);

  // Handle apply dashboard configuration
  const handleApplyDashboardConfig = () => {
    if (activeProject) {
      // Update project with dashboard config
      setProjects(prev => prev.map(p =>
        p.id === activeProject.id
          ? {
            ...p,
            active: true,
            dashboardConfig: { visibleSections }
          }
          : p
      ));

      setActiveProject(prev => ({
        ...prev,
        dashboardConfig: { visibleSections }
      }));

      // Initialize chart types and axis configs for this project if not exists
      if (!chartTypes[activeProject.id]) {
        setChartTypes(prev => ({
          ...prev,
          [activeProject.id]: {
            design: 'bar',
            partDevelopment: 'line',
            build: 'pie',
            gateway: 'area',
            validation: 'bar',
            qualityIssues: 'bar'
          }
        }));

        setAxisConfigs(prev => ({
          ...prev,
          [activeProject.id]: {
            design: { xAxis: '', yAxis: '' },
            partDevelopment: { xAxis: '', yAxis: '' },
            build: { xAxis: '', yAxis: '' },
            gateway: { xAxis: '', yAxis: '' },
            validation: { xAxis: '', yAxis: '' },
            qualityIssues: { xAxis: '', yAxis: '' }
          }
        }));
      }

      setShowSimulateModal(false);
    }
  };

  // Handle back to projects list
  const handleBackToProjects = () => {
    setActiveProject(null);
    setSelectedSubmodule(null); // Reset submodule selection
    // Reset visible sections to empty state
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
      setChartTypes(prev => ({
        ...prev,
        [activeProject.id]: {
          ...prev[activeProject.id],
          [chartId]: type
        }
      }));
    }
  };

  // Handle axis configuration change
  const handleAxisChange = (chartId, axis, value) => {
    if (activeProject) {
      setAxisConfigs(prev => ({
        ...prev,
        [activeProject.id]: {
          ...prev[activeProject.id],
          [chartId]: {
            ...prev[activeProject.id]?.[chartId],
            [axis]: value
          }
        }
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

  // Handle section visibility toggle
  const handleSectionVisibilityToggle = (section) => {
    setVisibleSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Handle select all sections for visibility
  const handleSelectAllVisibility = () => {
    const availableSectionKeys = [
      'milestones', 'criticalIssues', 'sopTables',
      'budget', 'resource', 'quality',
      ...['design', 'partDevelopment', 'build', 'gateway', 'validation', 'qualityIssues'].filter(key => availablePhases[key])
    ];

    const allSelected = availableSectionKeys.every(key => visibleSections[key]);
    const setTarget = !allSelected;

    // Create new object, taking care to not turn on unavailable ones
    const newVisibleSections = { ...visibleSections };
    Object.keys(visibleSections).forEach(key => {
      if (availableSectionKeys.includes(key)) {
        newVisibleSections[key] = setTarget;
      } else {
        newVisibleSections[key] = false;
      }
    });

    setVisibleSections(newVisibleSections);
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
      const metricKeys = ['design', 'partDevelopment', 'build', 'gateway', 'validation', 'qualityIssues'];
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

  // Handle send email
  const handleSendEmail = () => {
    // Get all non-empty email addresses
    const toEmails = emailData.emailInputs.filter(email => email.trim() !== '');
    const ccEmails = emailData.ccInputs.filter(email => email.trim() !== '');
    const bccEmails = emailData.bccInputs.filter(email => email.trim() !== '');

    // Get selected sections
    const selectedSectionsList = Object.entries(emailData.selectedSections)
      .filter(([_, selected]) => selected)
      .map(([section]) => section);

    // In a real application, this would connect to an email service
    alert(`Email sent successfully!\n\nTo: ${toEmails.join(', ') || 'None'}\nCC: ${ccEmails.join(', ') || 'None'}\nBCC: ${bccEmails.join(', ') || 'None'}\nSelected Sections: ${selectedSectionsList.join(', ')}`);

    setShowEmailModal(false);
    setEmailData({
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
        partDevelopment: true,
        build: true,
        gateway: true,
        validation: true,
        qualityIssues: true
      },
      emailInputs: [''],
      ccInputs: [''],
      bccInputs: ['']
    });
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

  // Handle Print Preview via React Modal
  const [showPdfPreviewModal, setShowPdfPreviewModal] = useState(false);
  const [pdfLayoutOrder, setPdfLayoutOrder] = useState([]);

  const openPrintPreview = () => {
    const selected = Object.entries(emailData.selectedSections)
      .filter(([_, selected]) => selected)
      .map(([section]) => section);

    if (selected.length === 0) {
      alert('No sections selected to preview.');
      return;
    }

    setPdfLayoutOrder(selected);
    setShowPdfPreviewModal(true);
    setShowEmailModal(false);
  };

  // PDF Preview Modal for drag-and-drop customization and live charting before printing
  const PdfPreviewModal = () => {
    const [draggedItemIndex, setDraggedItemIndex] = useState(null);

    if (!showPdfPreviewModal) return null;

    const handleDragStart = (e, index) => {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', index);
      setDraggedItemIndex(index);
    };

    const handleDragOver = (e, index) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e, index) => {
      e.preventDefault();
      if (draggedItemIndex === null) return;
      if (draggedItemIndex === index) return;

      const newOrder = [...pdfLayoutOrder];
      const draggedItem = newOrder[draggedItemIndex];
      newOrder.splice(draggedItemIndex, 1);
      newOrder.splice(index, 0, draggedItem);
      setPdfLayoutOrder(newOrder);
      setDraggedItemIndex(null);
    };

    const handleDragEnd = () => {
      setDraggedItemIndex(null);
    };

    const sectionTitles = {
      milestones: 'Project Milestones',
      criticalIssues: 'Critical Issues Summary',
      budget: 'Budget Overview',
      resource: 'Resource Allocation',
      quality: 'Quality Metrics',
      design: 'Design Progress',
      partDevelopment: 'Part Development',
      build: 'Build Status',
      gateway: 'Gateway Performance',
      validation: 'Validation Results',
      qualityIssues: 'Quality Issues',
      sopTables: 'SOP Tables'
    };

    const handleDownloadPdf = () => {
      window.print();
    };

    return (
      <div id="pdf-preview-modal-root" style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', zIndex: 3000
      }}>
        <style>{`
          @media print {
            @page {
              margin: 15mm;
              size: A4;
            }
            html, body {
              height: auto !important;
              overflow: visible !important;
            }
            body * {
              visibility: hidden;
            }
            #pdf-preview-modal-root, #pdf-preview-modal-root * {
              visibility: visible !important;
            }
            #pdf-preview-modal-root {
              position: static !important;
              display: block !important;
              background: white !important;
              width: 100% !important;
            }
            /* Hide the sidebar and any no-print items */
            .no-print, #pdf-preview-sidebar {
              display: none !important;
              visibility: hidden !important;
            }
            /* Ensure the preview container allows multi-page flow */
            .pdf-preview-container {
              position: static !important;
              overflow: visible !important;
              height: auto !important;
              padding: 0 !important;
              background: white !important;
              width: 100% !important;
            }
            .pdf-printable-area {
              position: static !important;
              width: 100% !important;
              max-width: none !important;
              padding: 0 !important;
              box-shadow: none !important;
              margin: 0 !important;
              background: white !important;
              height: auto !important;
              overflow: visible !important;
            }
            .pdf-sections-grid {
              display: block !important;
              width: 100% !important;
            }
            .pdf-section {
              break-inside: avoid;
              page-break-inside: avoid;
              margin-bottom: 30px;
              width: 100% !important;
            }
          }
        `}</style>

        {/* Sidebar for customization */}
        <div id="pdf-preview-sidebar" className="no-print" style={{ width: '320px', backgroundColor: 'white', display: 'flex', flexDirection: 'column', height: '100%', boxShadow: '2px 0 10px rgba(0,0,0,0.2)', zIndex: 10 }}>
          <div style={{ padding: '20px', backgroundColor: '#1e3a5f', color: 'white', fontWeight: 'bold', fontSize: '18px' }}>
            Customize PDF Layout
          </div>
          <div style={{ flex: 1, padding: '20px', overflowY: 'auto', backgroundColor: '#f8f9fa' }}>
            <p style={{ fontSize: '14px', color: '#666', marginBottom: '20px' }}>Rearrange the sections to customize your PDF report.</p>
            {pdfLayoutOrder.map((section, idx) => (
              <div
                key={section}
                draggable
                onDragStart={(e) => handleDragStart(e, idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDrop={(e) => handleDrop(e, idx)}
                onDragEnd={handleDragEnd}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px',
                  backgroundColor: draggedItemIndex === idx ? '#f3f4f6' : 'white',
                  border: '1px solid #e0e0e0',
                  marginBottom: '10px',
                  borderRadius: '6px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  cursor: 'grab',
                  opacity: draggedItemIndex === idx ? 0.5 : 1
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ color: '#9ca3af', cursor: 'grab', display: 'flex' }}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M4 4h2v2H4V4zm4 0h2v2H8V4zm4 0h2v2h-2V4zM4 8h2v2H4V8zm4 0h2v2H8V8zm4 0h2v2h-2V8zM4 12h2v2H4v-2zm4 0h2v2H8v-2zm4 0h2v2h-2v-2z" />
                    </svg>
                  </div>
                  <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#1e3a5f' }}>{idx + 1}. {sectionTitles[section] || section}</span>
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <span style={{ fontSize: '12px', color: '#9ca3af', cursor: 'grab' }}>:::</span>
                </div>
              </div>
            ))}
          </div>
          <div style={{ padding: '20px', borderTop: '1px solid #e0e0e0', display: 'flex', gap: '10px', backgroundColor: 'white' }}>
            <button onClick={() => setShowPdfPreviewModal(false)} style={{ flex: 1, padding: '10px', backgroundColor: '#f3f4f6', border: '1px solid #d1d5db', color: '#4b5563', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Cancel</button>
            <button onClick={handleDownloadPdf} style={{ flex: 1, padding: '10px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Print PDF</button>
          </div>
        </div>

        {/* Preview Area (this will actually be printed!) */}
        <div className="pdf-preview-container" style={{ flex: 1, overflowY: 'auto', padding: '40px', backgroundColor: '#64748b' }}>
          <div className="pdf-printable-area" style={{ maxWidth: '900px', margin: '0 auto', backgroundColor: 'white', minHeight: '100%', padding: '40px 60px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>

            <div style={{ textAlign: 'center', marginBottom: '40px', borderBottom: '2px solid #1e3a5f', paddingBottom: '20px' }}>
              <h1 style={{ color: '#1e3a5f', fontSize: '32px', margin: '0 0 10px 0' }}>{activeProject?.name || 'Project'} Dashboard Report</h1>
              <p style={{ color: '#6b7280', margin: 0, fontSize: '14px' }}>Generated: {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}</p>
            </div>

            <div className="pdf-sections-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px', alignItems: 'start' }}>
              {pdfLayoutOrder.map(section => {
                // For charts: render original charts!
                const isChart = ['design', 'partDevelopment', 'build', 'gateway', 'validation', 'qualityIssues'].includes(section);
                const fullWidth = ['milestones', 'criticalIssues', 'budget', 'resource', 'quality'].includes(section);

                if (isChart) {
                  const cType = chartTypes[activeProject?.id]?.[section] || 'bar';
                  return (
                    <div key={section} className="pdf-section" style={{
                      gridColumn: fullWidth ? '1 / -1' : 'auto',
                      marginBottom: '15px',
                      breakInside: 'avoid',
                      minWidth: 0,
                      overflow: 'hidden'
                    }}>
                      <h2 style={{ fontSize: '18px', color: '#1e3a5f', marginBottom: '10px', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>{sectionTitles[section]}</h2>
                      <div style={{ border: '1px solid #e0e0e0', padding: '15px', borderRadius: '8px' }}>
                        {renderChart(section, cType, false, getTrackerForPhase(section)?.trackerId)}
                      </div>
                    </div>
                  );
                }

                if (section === 'milestones') {
                  return (
                    <div key={section} className="pdf-section" style={{
                      gridColumn: fullWidth ? '1 / -1' : 'auto',
                      marginBottom: '15px',
                      breakInside: 'avoid',
                      minWidth: 0
                    }}>
                      <h2 style={{ fontSize: '18px', color: '#1e3a5f', marginBottom: '10px', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>{sectionTitles[section]}</h2>
                      <div style={{ overflowX: 'auto', border: '1px solid #e0e0e0', borderRadius: '4px' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '600px' }}>
                          <thead>
                            <tr style={{ backgroundColor: '#1e3a5f', color: 'white' }}>
                              <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #e0e0e0' }}>Categories</th>
                              <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #e0e0e0' }}>A</th>
                              <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #e0e0e0' }}>B</th>
                              <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #e0e0e0' }}>C</th>
                              <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #e0e0e0' }}>D</th>
                              <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #e0e0e0' }}>E</th>
                              <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #e0e0e0' }}>F</th>
                              <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #e0e0e0' }}>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td style={{ padding: '10px', border: '1px solid #e0e0e0', fontWeight: 'bold' }}>Plan</td>
                              <td style={{ padding: '10px', border: '1px solid #e0e0e0' }}>{milestones[0].plan.a}</td>
                              <td style={{ padding: '10px', border: '1px solid #e0e0e0' }}>{milestones[0].plan.b}</td>
                              <td style={{ padding: '10px', border: '1px solid #e0e0e0' }}>{milestones[0].plan.c}</td>
                              <td style={{ padding: '10px', border: '1px solid #e0e0e0' }}>{milestones[0].plan.d}</td>
                              <td style={{ padding: '10px', border: '1px solid #e0e0e0' }}>{milestones[0].plan.e}</td>
                              <td style={{ padding: '10px', border: '1px solid #e0e0e0' }}>{milestones[0].plan.f}</td>
                              <td style={{ padding: '10px', border: '1px solid #e0e0e0' }}>{milestones[0].plan.implementation}</td>
                            </tr>
                            <tr>
                              <td style={{ padding: '10px', border: '1px solid #e0e0e0', fontWeight: 'bold' }}>Actual</td>
                              <td style={{ padding: '10px', border: '1px solid #e0e0e0' }}>{milestones[0].actual.a}</td>
                              <td style={{ padding: '10px', border: '1px solid #e0e0e0' }}>{milestones[0].actual.b}</td>
                              <td style={{ padding: '10px', border: '1px solid #e0e0e0' }}>{milestones[0].actual.c}</td>
                              <td style={{ padding: '10px', border: '1px solid #e0e0e0' }}>{milestones[0].actual.d}</td>
                              <td style={{ padding: '10px', border: '1px solid #e0e0e0' }}>{milestones[0].actual.e}</td>
                              <td style={{ padding: '10px', border: '1px solid #e0e0e0' }}>{milestones[0].actual.f}</td>
                              <td style={{ padding: '10px', border: '1px solid #e0e0e0', color: milestones[0].actual.implementation === 'In Progress' ? '#1e40af' : '#065f46', fontWeight: 'bold' }}>{milestones[0].actual.implementation}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                }

                if (section === 'criticalIssues') {
                  return (
                    <div key={section} className="pdf-section" style={{
                      gridColumn: fullWidth ? '1 / -1' : 'auto',
                      marginBottom: '15px',
                      breakInside: 'avoid',
                      minWidth: 0
                    }}>
                      <h2 style={{ fontSize: '18px', color: '#1e3a5f', marginBottom: '10px', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>{sectionTitles[section]}</h2>
                      <div style={{ overflowX: 'auto', border: '1px solid #e0e0e0', borderRadius: '4px' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '700px' }}>
                          <thead>
                            <tr style={{ backgroundColor: '#1e3a5f', color: 'white' }}>
                              <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #e0e0e0' }}>Issue</th>
                              <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #e0e0e0' }}>Function</th>
                              <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #e0e0e0' }}>Responsibility</th>
                              <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #e0e0e0' }}>Target Date</th>
                              <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #e0e0e0' }}>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {criticalIssues.slice(0, 5).map(issue => (
                              <tr key={issue.id} style={{ borderBottom: '1px solid #e0e0e0' }}>
                                <td style={{ padding: '10px', border: '1px solid #e0e0e0', fontWeight: '500' }}>{issue.issue}</td>
                                <td style={{ padding: '10px', border: '1px solid #e0e0e0' }}>{issue.function}</td>
                                <td style={{ padding: '10px', border: '1px solid #e0e0e0' }}>{issue.responsibility}</td>
                                <td style={{ padding: '10px', border: '1px solid #e0e0e0' }}>{issue.targetDate}</td>
                                <td style={{ padding: '10px', border: '1px solid #e0e0e0', fontWeight: 'bold', color: issue.status === 'Open' ? '#dc2626' : (issue.status === 'In Progress' ? '#1e40af' : '#059669') }}>{issue.status}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                }

                if (section === 'budget') {
                  return (
                    <div key={section} className="pdf-section" style={{
                      gridColumn: fullWidth ? '1 / -1' : 'auto',
                      marginBottom: '15px',
                      breakInside: 'avoid',
                      minWidth: 0
                    }}>
                      <h2 style={{ fontSize: '18px', color: '#1e3a5f', marginBottom: '10px', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>{sectionTitles[section]}</h2>
                      <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                        <div style={{ flex: '1 1 180px', padding: '15px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', textAlign: 'center' }}>
                          <div style={{ fontSize: '10px', color: '#6b7280', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '2px' }}>Approved</div>
                          <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#1e3a5f' }}>{summaryData.budgetApproved}</div>
                        </div>
                        <div style={{ flex: '1 1 180px', padding: '15px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', textAlign: 'center' }}>
                          <div style={{ fontSize: '10px', color: '#6b7280', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '2px' }}>Utilized</div>
                          <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#1e3a5f' }}>{summaryData.budgetUtilized}</div>
                        </div>
                        <div style={{ flex: '1 1 180px', padding: '15px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', textAlign: 'center' }}>
                          <div style={{ fontSize: '10px', color: '#6b7280', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '2px' }}>Balance</div>
                          <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#10b981' }}>{summaryData.budgetBalance}</div>
                        </div>
                        <div style={{ flex: '1 1 180px', padding: '15px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', textAlign: 'center' }}>
                          <div style={{ fontSize: '10px', color: '#6b7280', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '2px' }}>Outlook</div>
                          <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#1e3a5f' }}>{summaryData.budgetOutlook}</div>
                        </div>
                      </div>
                    </div>
                  );
                }

                if (section === 'resource') {
                  return (
                    <div key={section} className="pdf-section" style={{
                      gridColumn: fullWidth ? '1 / -1' : 'auto',
                      marginBottom: '15px',
                      breakInside: 'avoid',
                      minWidth: 0
                    }}>
                      <h2 style={{ fontSize: '18px', color: '#1e3a5f', marginBottom: '10px', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>{sectionTitles[section]}</h2>
                      <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                        <div style={{ flex: '1 1 180px', padding: '15px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', textAlign: 'center' }}>
                          <span style={{ fontSize: '22px', fontWeight: 'bold', color: '#1e3a5f' }}>{summaryData.resourceDeployed}</span>
                          <span style={{ display: 'block', fontSize: '11px', color: '#64748b', marginTop: '5px' }}>Deployed</span>
                        </div>
                        <div style={{ flex: '1 1 180px', padding: '15px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', textAlign: 'center' }}>
                          <span style={{ fontSize: '22px', fontWeight: 'bold', color: '#1e3a5f' }}>{summaryData.resourceUtilized}</span>
                          <span style={{ display: 'block', fontSize: '11px', color: '#64748b', marginTop: '5px' }}>Utilized</span>
                        </div>
                        <div style={{ flex: '1 1 180px', padding: '15px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', textAlign: 'center' }}>
                          <span style={{ fontSize: '22px', fontWeight: 'bold', color: '#dc2626' }}>{summaryData.resourceShortage}</span>
                          <span style={{ display: 'block', fontSize: '11px', color: '#64748b', marginTop: '5px' }}>Shortage</span>
                        </div>
                      </div>
                    </div>
                  );
                }

                if (section === 'quality') {
                  return (
                    <div key={section} className="pdf-section" style={{
                      gridColumn: fullWidth ? '1 / -1' : 'auto',
                      marginBottom: '15px',
                      breakInside: 'avoid',
                      minWidth: 0
                    }}>
                      <h2 style={{ fontSize: '18px', color: '#1e3a5f', marginBottom: '10px', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>{sectionTitles[section]}</h2>
                      <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                        <div style={{ flex: '1 1 180px', padding: '15px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', textAlign: 'center' }}>
                          <div style={{ fontSize: '10px', color: '#6b7280', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '2px' }}>Total Issues</div>
                          <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#1e3a5f' }}>{summaryData.qualityTotal}</div>
                        </div>
                        <div style={{ flex: '1 1 180px', padding: '15px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', textAlign: 'center' }}>
                          <div style={{ fontSize: '10px', color: '#6b7280', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '2px' }}>Completed</div>
                          <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#1e3a5f' }}>{summaryData.qualityCompleted}</div>
                        </div>
                        <div style={{ flex: '1 1 180px', padding: '15px', backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', textAlign: 'center' }}>
                          <div style={{ fontSize: '10px', color: '#6b7280', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '2px' }}>Open</div>
                          <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#f59e0b' }}>{summaryData.qualityOpen}</div>
                        </div>
                        <div style={{ flex: '1 1 180px', padding: '15px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', textAlign: 'center' }}>
                          <div style={{ fontSize: '10px', color: '#6b7280', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '2px' }}>Critical</div>
                          <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#ef4444' }}>{summaryData.qualityCritical}</div>
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={section} className="pdf-section" style={{ gridColumn: fullWidth ? '1 / -1' : 'auto', marginBottom: '10px', breakInside: 'avoid' }}>
                    <h2 style={{ fontSize: '18px', color: '#1e3a5f', marginBottom: '10px', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>{sectionTitles[section]}</h2>
                    <div style={{ padding: '15px', backgroundColor: '#f8f9fa', border: '1px solid #e0e0e0', borderRadius: '4px' }}>
                      Section data for {sectionTitles[section]} will show here.
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ textAlign: 'center', marginTop: '60px', paddingTop: '20px', borderTop: '1px solid #e2e8f0', color: '#94a3b8', fontSize: '12px' }}>
              <p>Confidential • Generated for internal use • Project Dashboard</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Email Modal Component
  const EmailModal = () => {
    if (!showEmailModal) return null;

    const allSelected = Object.values(emailData.selectedSections).every(value => value);

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
          width: '800px',
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
            zIndex: 1
          }}>
            <span>Send Dashboard Report - {activeProject?.name}</span>
            <button
              onClick={() => setShowEmailModal(false)}
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
            {/* To, CC, BCC fields */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#1e3a5f' }}>To:</label>
              {emailData.emailInputs.map((email, index) => (
                <div key={`to-${index}`} style={{ display: 'flex', marginBottom: '8px', gap: '8px' }}>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => handleEmailInputChange(index, e.target.value, 'email')}
                    onFocus={() => setActiveEmailField('email')}
                    placeholder="Enter email address"
                    style={{
                      flex: 1,
                      padding: '8px',
                      border: '1px solid #c0c0c0',
                      borderRadius: '4px',
                      fontSize: '13px'
                    }}
                  />
                  {index < emailData.emailInputs.length - 1 && (
                    <button
                      onClick={() => removeEmailInput(index, 'email')}
                      style={{
                        padding: '8px 12px',
                        backgroundColor: '#fee2e2',
                        border: 'none',
                        borderRadius: '4px',
                        color: '#991b1b',
                        cursor: 'pointer',
                        fontWeight: 'bold'
                      }}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#1e3a5f' }}>CC:</label>
              {emailData.ccInputs.map((email, index) => (
                <div key={`cc-${index}`} style={{ display: 'flex', marginBottom: '8px', gap: '8px' }}>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => handleEmailInputChange(index, e.target.value, 'cc')}
                    onFocus={() => setActiveEmailField('cc')}
                    placeholder="Enter email address"
                    style={{
                      flex: 1,
                      padding: '8px',
                      border: '1px solid #c0c0c0',
                      borderRadius: '4px',
                      fontSize: '13px'
                    }}
                  />
                  {index < emailData.ccInputs.length - 1 && (
                    <button
                      onClick={() => removeEmailInput(index, 'cc')}
                      style={{
                        padding: '8px 12px',
                        backgroundColor: '#fee2e2',
                        border: 'none',
                        borderRadius: '4px',
                        color: '#991b1b',
                        cursor: 'pointer',
                        fontWeight: 'bold'
                      }}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#1e3a5f' }}>BCC:</label>
              {emailData.bccInputs.map((email, index) => (
                <div key={`bcc-${index}`} style={{ display: 'flex', marginBottom: '8px', gap: '8px' }}>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => handleEmailInputChange(index, e.target.value, 'bcc')}
                    onFocus={() => setActiveEmailField('bcc')}
                    placeholder="Enter email address"
                    style={{
                      flex: 1,
                      padding: '8px',
                      border: '1px solid #c0c0c0',
                      borderRadius: '4px',
                      fontSize: '13px'
                    }}
                  />
                  {index < emailData.bccInputs.length - 1 && (
                    <button
                      onClick={() => removeEmailInput(index, 'bcc')}
                      style={{
                        padding: '8px 12px',
                        backgroundColor: '#fee2e2',
                        border: 'none',
                        borderRadius: '4px',
                        color: '#991b1b',
                        cursor: 'pointer',
                        fontWeight: 'bold'
                      }}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Employee Search and Selection Dropdown */}
            <div style={{ marginBottom: '25px', position: 'relative' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#1e3a5f' }}>Choose Employees:</label>
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
                    padding: '10px 12px',
                    border: '1px solid #c0c0c0',
                    borderRadius: '4px',
                    fontSize: '14px',
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
                  pointerEvents: 'none'
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
                      maxHeight: '200px',
                      overflowY: 'auto',
                      zIndex: 20
                    }}>
                      {allEmployees
                        .filter(emp =>
                          String(emp.name || '').toLowerCase().includes(employeeSearchTerm.toLowerCase()) ||
                          String(emp.email || '').toLowerCase().includes(employeeSearchTerm.toLowerCase())
                        )
                        .slice(0, 50)
                        .map(contact => (
                          <div
                            key={contact.id}
                            onClick={() => addContactFromList(contact.email, activeEmailField)}
                            style={{
                              padding: '10px 15px',
                              cursor: 'pointer',
                              borderBottom: '1px solid #f3f4f6',
                              transition: 'background-color 0.2s',
                              display: 'flex',
                              flexDirection: 'column'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0f7ff'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                          >
                            <span style={{ fontWeight: 'bold', fontSize: '13px', color: '#1e3a5f' }}>{contact.name || 'Unknown Name'}</span>
                            <span style={{ fontSize: '12px', color: '#6b7280' }}>{contact.email} • {contact.department || 'No Dept'}</span>
                          </div>
                        ))}
                      {allEmployees.length === 0 && (
                        <div style={{ padding: '15px', textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>
                          No employees loaded.
                        </div>
                      )}
                      {allEmployees.length > 0 && allEmployees.filter(emp =>
                        String(emp.name || '').toLowerCase().includes(employeeSearchTerm.toLowerCase()) ||
                        String(emp.email || '').toLowerCase().includes(employeeSearchTerm.toLowerCase())
                      ).length === 0 && (
                          <div style={{ padding: '15px', textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>
                            No matches found for "{employeeSearchTerm}"
                          </div>
                        )}
                    </div>
                  </>
                )}
              </div>
              <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '8px' }}>
                * Click to add to the <span style={{ fontWeight: 'bold', color: '#1e3a5f' }}>{activeEmailField.toUpperCase()}</span> field.
              </p>
            </div>

            {/* Subject */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#1e3a5f' }}>Subject:</label>
              <input
                type="text"
                value={emailData.subject}
                onChange={(e) => setEmailData(prev => ({ ...prev, subject: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #c0c0c0',
                  borderRadius: '4px',
                  fontSize: '13px'
                }}
              />
            </div>

            {/* Message */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#1e3a5f' }}>Message (Optional):</label>
              <textarea
                value={emailData.message}
                onChange={(e) => setEmailData(prev => ({ ...prev, message: e.target.value }))}
                rows="3"
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #c0c0c0',
                  borderRadius: '4px',
                  fontSize: '13px',
                  resize: 'vertical'
                }}
                placeholder="Add a message..."
              />
            </div>

            {/* Section selection */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <label style={{ fontWeight: 'bold', color: '#1e3a5f' }}>Select Sections to Include:</label>
                <button
                  onClick={handleSelectAll}
                  style={{
                    padding: '4px 10px',
                    fontSize: '12px',
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

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                {Object.keys(emailData.selectedSections).filter(section => {
                  const metricKeys = ['design', 'partDevelopment', 'build', 'gateway', 'validation', 'qualityCheck'];
                  if (metricKeys.includes(section)) return availablePhases[section];
                  return true;
                }).map(section => (
                  <label key={section} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={emailData.selectedSections[section]}
                      onChange={() => handleSectionToggle(section)}
                    />
                    {section === 'sopTables' ? 'SOP Tables' :
                      section.charAt(0).toUpperCase() + section.slice(1).replace(/([A-Z])/g, ' $1')}
                  </label>
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #e0e0e0', paddingTop: '20px' }}>
              <button
                onClick={() => setShowEmailModal(false)}
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

  // Simulate Dashboard Modal Component
  const SimulateModal = () => {
    if (!showSimulateModal) return null;

    const allSelected = Object.values(visibleSections).every(value => value);

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
                      checked={visibleSections.milestones}
                      onChange={() => handleSectionVisibilityToggle('milestones')}
                    />
                    Milestones
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={visibleSections.criticalIssues}
                      onChange={() => handleSectionVisibilityToggle('criticalIssues')}
                    />
                    Critical Issues
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={visibleSections.sopTables}
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
                      checked={visibleSections.budget}
                      onChange={() => handleSectionVisibilityToggle('budget')}
                    />
                    Budget Summary
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={visibleSections.resource}
                      onChange={() => handleSectionVisibilityToggle('resource')}
                    />
                    Resource Summary
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={visibleSections.quality}
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
                  {availablePhases.design && (
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={visibleSections.design}
                        onChange={() => handleSectionVisibilityToggle('design')}
                      />
                      Design
                    </label>
                  )}
                  {availablePhases.partDevelopment && (
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={visibleSections.partDevelopment}
                        onChange={() => handleSectionVisibilityToggle('partDevelopment')}
                      />
                      Part Development
                    </label>
                  )}
                  {availablePhases.build && (
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={visibleSections.build}
                        onChange={() => handleSectionVisibilityToggle('build')}
                      />
                      Build
                    </label>
                  )}
                  {availablePhases.gateway && (
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={visibleSections.gateway}
                        onChange={() => handleSectionVisibilityToggle('gateway')}
                      />
                      Gateway
                    </label>
                  )}
                  {availablePhases.validation && (
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={visibleSections.validation}
                        onChange={() => handleSectionVisibilityToggle('validation')}
                      />
                      Validation
                    </label>
                  )}
                  {availablePhases.qualityCheck && (
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={visibleSections.qualityCheck}
                        onChange={() => handleSectionVisibilityToggle('qualityCheck')}
                      />
                      Quality Check
                    </label>
                  )}
                  {(!availablePhases.design && !availablePhases.partDevelopment && !availablePhases.build && !availablePhases.gateway && !availablePhases.validation && !availablePhases.qualityCheck) && (
                    <div style={{ color: '#9ca3af', fontSize: '13px', gridColumn: 'span 3' }}>No project metrics available based on uploaded files.</div>
                  )}
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
                  {Object.entries(visibleSections)
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
                          section.charAt(0).toUpperCase() + section.slice(1).replace(/([A-Z])/g, ' $1')}
                      </span>
                    ))}
                </div>
                {Object.values(visibleSections).filter(v => v).length === 0 && (
                  <div style={{ color: '#9ca3af', textAlign: 'center', padding: '10px' }}>
                    No sections selected - dashboard will be empty
                  </div>
                )}
              </div>
              <div style={{ marginTop: '10px', fontSize: '12px', color: '#1e3a5f', fontWeight: 'bold' }}>
                Total visible sections: {Object.values(visibleSections).filter(v => v).length}
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

  // Edit Milestones Modal
  const EditMilestonesModal = () => {
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

  // Edit Issues Modal
  const EditIssuesModal = () => {
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

  // Edit Summary Modal
  const EditSummaryModal = () => {
    if (!showEditSummary) return null;

    const handleSave = () => {
      setSummaryData(summaryForm);
      setShowEditSummary(false);
    };

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

    chartData.forEach(row => {
      let xVal = row[axisConfig.xAxis];
      if (xVal === null || xVal === undefined || String(xVal).trim() === '') {
        xVal = 'Uncategorized';
      } else {
        xVal = String(xVal).trim();
      }

      const yVal = row[axisConfig.yAxis];

      if (!groupedData[xVal]) {
        groupedData[xVal] = 0;
      }

      if (yAxisIsNumeric) {
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

    const baseOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' }
      },
      toolbox: isMaximized ? {
        right: '20px',
        feature: {
          dataView: { show: true, readOnly: false, title: 'Data View' },
          saveAsImage: { show: true, title: 'Save Image' }
        }
      } : undefined,
      dataZoom: xLabels.length > 10 ? [
        { type: 'slider', show: true, start: 0, end: Math.max(20, Math.floor(1000 / xLabels.length)), bottom: '2%' },
        { type: 'inside', start: 0, end: 100 }
      ] : [],
      grid: {
        left: '5%',
        right: '5%',
        bottom: xLabels.length > 10 ? '25%' : '15%',
        top: '15%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: xLabels,
        axisLabel: {
          interval: 0,
          rotate: xLabels.length > 5 ? 30 : 0
        }
      },
      yAxis: {
        type: 'value'
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
              barWidth: '60%',
              data: yValues,
              itemStyle: { borderRadius: [4, 4, 0, 0] },
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

      case 'line':
      case 'area':
        option = {
          ...baseOption,
          series: [
            {
              name: axisConfig.yAxis,
              type: 'line',
              smooth: true,
              data: yValues,
              areaStyle: chartType === 'area' ? { opacity: 0.3 } : undefined,
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
        const pieData = xLabels.map((label, index) => ({
          name: label,
          value: yValues[index]
        }));
        option = {
          tooltip: {
            trigger: 'item'
          },
          legend: {
            orient: isMaximized ? 'vertical' : 'horizontal',
            left: isMaximized ? 'left' : 'center',
            bottom: isMaximized ? 'auto' : 0
          },
          series: [
            {
              name: axisConfig.yAxis,
              type: 'pie',
              radius: ['40%', '70%'],
              center: ['50%', isMaximized ? '50%' : '45%'],
              avoidLabelOverlap: false,
              itemStyle: {
                borderRadius: 10,
                borderColor: '#fff',
                borderWidth: 2
              },
              label: {
                show: true,
                position: 'outside',
                formatter: '{b}: {c}',
                fontSize: 12,
                fontWeight: 'bold',
                color: '#1e3a5f'
              },
              emphasis: {
                label: { show: true, fontSize: 16, fontWeight: 'bold' }
              },
              labelLine: { show: false },
              data: pieData
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
              barWidth: '99%',
              data: yValues,
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

      default:
        return null;
    }

    return (
      <div style={size}>
        <div style={{ marginBottom: '10px', fontSize: '12px', color: '#4b5563', textAlign: 'center', backgroundColor: '#f3f4f6', padding: '4px 8px', borderRadius: '4px' }}>
          <span style={{ fontWeight: 'bold' }}>X:</span> {axisConfig.xAxis} | <span style={{ fontWeight: 'bold' }}>Y:</span> {axisConfig.yAxis}
        </div>
        <ReactECharts theme="v5" option={option} style={{ height: isMaximized ? '350px' : '280px', width: '100%' }} notMerge={true} />
      </div>
    );
  };

  // Axis Selector Modal

  // Axis Selector Modal
  const AxisSelectorModal = ({ chartId, onClose }) => {
    if (!activeProject) return null;

    const config = axisConfigs[activeProject.id]?.[chartId] || { xAxis: '', yAxis: '' };
    const [localConfig, setLocalConfig] = useState(config);

    // Compute dynamic dynamicAvailableColumns based on prefetched data
    const dynamicAvailableColumns = useMemo(() => {
      const tracker = getTrackerForPhase(chartId);
      if (tracker) {
        const data = submoduleData[tracker.trackerId];
        if (data && data.headers) {
          return data.headers;
        }
      }
      return availableColumns; // Fallback to dummy data
    }, [activeProject, submoduleData, chartId]);

    const handleApply = () => {
      handleAxisChange(chartId, 'xAxis', localConfig.xAxis);
      handleAxisChange(chartId, 'yAxis', localConfig.yAxis);
      onClose();
    };

    return (
      <div style={{
        position: 'absolute',
        top: '100%',
        right: '0',
        backgroundColor: 'white',
        border: '1px solid #e0e0e0',
        borderRadius: '6px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        padding: '12px',
        zIndex: 100,
        width: '240px',
        marginTop: '8px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', borderBottom: '1px solid #e0e0e0', paddingBottom: '8px' }}>
          <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 'bold', color: '#1e3a5f' }}>Configure Axes</h3>
          <button
            onClick={onClose}
            style={{
              border: 'none',
              background: '#f3f4f6',
              cursor: 'pointer',
              fontSize: '12px',
              width: '22px',
              height: '22px',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#4b5563',
              fontWeight: 'bold'
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ marginBottom: '10px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#1e3a5f', marginBottom: '4px' }}>
            Attribute 1
          </label>
          <select
            value={localConfig.xAxis}
            onChange={(e) => setLocalConfig(prev => ({ ...prev, xAxis: e.target.value }))}
            style={{
              width: '100%',
              padding: '6px',
              fontSize: '12px',
              borderRadius: '4px',
              border: '1px solid #c0c0c0',
              backgroundColor: 'white',
              cursor: 'pointer',
              outline: 'none',
              color: '#1e3a5f'
            }}
          >
            {dynamicAvailableColumns.map(col => (
              <option key={col} value={col} style={{ color: '#1e3a5f', padding: '6px' }}>{col}</option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: '10px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#1e3a5f', marginBottom: '4px' }}>
            Attribute 2
          </label>
          <select
            value={localConfig.yAxis}
            onChange={(e) => setLocalConfig(prev => ({ ...prev, yAxis: e.target.value }))}
            style={{
              width: '100%',
              padding: '6px',
              fontSize: '12px',
              borderRadius: '4px',
              border: '1px solid #c0c0c0',
              backgroundColor: 'white',
              cursor: 'pointer',
              outline: 'none',
              color: '#1e3a5f'
            }}
          >
            {dynamicAvailableColumns.map(col => (
              <option key={col} value={col} style={{ color: '#1e3a5f', padding: '6px' }}>{col}</option>
            ))}
          </select>
        </div>

        <button
          onClick={handleApply}
          style={{
            width: '100%',
            padding: '8px',
            backgroundColor: '#1e3a5f',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '13px',
            marginTop: '4px'
          }}
        >
          Apply
        </button>
      </div>
    );
  };

  // Chart options component
  const ChartOptions = ({ chartId, currentType }) => (
    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', position: 'relative' }}>
      <select
        value={currentType}
        onChange={(e) => handleChartTypeChange(chartId, e.target.value)}
        style={{
          padding: '6px 10px',
          fontSize: '12px',
          borderRadius: '4px',
          border: '1px solid white',
          backgroundColor: 'rgba(255, 255, 255, 0.3)',
          color: 'white',
          cursor: 'pointer',
          fontWeight: 'bold',
          outline: 'none'
        }}
      >
        <option value="bar" style={{ color: '#1e3a5f', backgroundColor: 'white' }}>Bar</option>
        <option value="line" style={{ color: '#1e3a5f', backgroundColor: 'white' }}>Line</option>
        <option value="pie" style={{ color: '#1e3a5f', backgroundColor: 'white' }}>Pie</option>
        <option value="area" style={{ color: '#1e3a5f', backgroundColor: 'white' }}>Area</option>
        <option value="histogram" style={{ color: '#1e3a5f', backgroundColor: 'white' }}>Histogram</option>
      </select>

      <button
        onClick={() => toggleAxisSelector(chartId)}
        style={{
          padding: '6px 10px',
          fontSize: '12px',
          borderRadius: '4px',
          border: '1px solid white',
          backgroundColor: showAxisSelector === chartId ? 'white' : 'rgba(255, 255, 255, 0.3)',
          color: showAxisSelector === chartId ? '#1e3a5f' : 'white',
          cursor: 'pointer',
          fontWeight: 'bold',
          outline: 'none',
          transition: 'all 0.2s'
        }}
      >
        Configure
      </button>

      <button
        onClick={() => handleMaximize(chartId)}
        style={{
          padding: '6px 10px',
          fontSize: '12px',
          borderRadius: '4px',
          border: '1px solid white',
          backgroundColor: 'rgba(255, 255, 255, 0.3)',
          color: 'white',
          cursor: 'pointer',
          fontWeight: 'bold',
          outline: 'none'
        }}
      >
        Max
      </button>

      {showAxisSelector === chartId && (
        <AxisSelectorModal chartId={chartId} onClose={() => setShowAxisSelector(null)} />
      )}
    </div>
  );

  // Maximized Chart Modal
  const MaximizedChartModal = () => {
    if (!maximizedChart || !activeProject) return null;

    const chartNames = {
      design: 'Design',
      partDevelopment: 'Part Development',
      build: 'Build',
      gateway: 'Gateway',
      validation: 'Validation',
      qualityIssues: 'Quality Issues'
    };

    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '30px'
      }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          width: '90%',
          maxWidth: '1000px',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
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
            alignItems: 'center'
          }}>
            <span>
              {activeProject.name} - {chartNames[maximizedChart]} (Maximized View)
            </span>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <select
                value={chartTypes[activeProject.id]?.[maximizedChart]}
                onChange={(e) => handleChartTypeChange(maximizedChart, e.target.value)}
                style={{
                  padding: '8px 12px',
                  fontSize: '14px',
                  borderRadius: '4px',
                  border: '1px solid white',
                  backgroundColor: 'rgba(255, 255, 255, 0.3)',
                  color: 'white',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  outline: 'none'
                }}
              >
                <option value="bar" style={{ color: '#1e3a5f', backgroundColor: 'white' }}>Bar</option>
                <option value="line" style={{ color: '#1e3a5f', backgroundColor: 'white' }}>Line</option>
                <option value="pie" style={{ color: '#1e3a5f', backgroundColor: 'white' }}>Pie</option>
                <option value="area" style={{ color: '#1e3a5f', backgroundColor: 'white' }}>Area</option>
                <option value="histogram" style={{ color: '#1e3a5f', backgroundColor: 'white' }}>Histogram</option>
              </select>
              <button
                onClick={handleCloseMaximize}
                style={{
                  padding: '8px 16px',
                  fontSize: '14px',
                  borderRadius: '4px',
                  border: 'none',
                  backgroundColor: '#ef4444',
                  color: 'white',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                Close
              </button>
            </div>
          </div>
          <div style={{ padding: '30px' }}>
            {renderChart(maximizedChart, chartTypes[activeProject.id]?.[maximizedChart], true, getTrackerForPhase(maximizedChart)?.trackerId)}
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
      <PdfPreviewModal />

      {/* Email Modal */}
      <EmailModal />

      {/* Simulate Modal */}
      <SimulateModal />

      {/* Edit Modals */}
      <EditMilestonesModal />
      <EditIssuesModal />
      <EditSummaryModal />

      {/* Maximized Chart Modal */}
      <MaximizedChartModal />

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
              <span>{String(selectedSubmodule.displayName || selectedSubmodule.name).replace(/\.(xlsx|xls|csv|pdf|docx|txt|json)$/i, "")}</span>
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
                  onClick={() => setShowEmailModal(true)}
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
            {renderSubmoduleTable(submoduleData[selectedSubmodule.trackerId], String(selectedSubmodule.displayName || selectedSubmodule.name).replace(/\.(xlsx|xls|csv|pdf|docx|txt|json)$/i, ""))}
          </div>
        ) : (
          /* Active Project Dashboard */
          <>
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
                    <span style={{
                      fontSize: '14px',
                      padding: '4px 12px',
                      borderRadius: '20px',
                      backgroundColor: '#fed7aa',
                      color: '#9a3412',
                      fontWeight: 'bold'
                    }}>
                      {sopData[0].status}
                    </span>
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
                <div style={{ marginBottom: '35px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1e3a5f', color: 'white', padding: '12px 20px', fontSize: '16px', fontWeight: 'bold', borderBottom: '2px solid #234574' }}>
                    <span>Milestones</span>
                    <button
                      onClick={() => { setMilestoneForm({ ...milestones[0] }); setShowEditMilestones(true); }}
                      className="no-print"
                      style={{ background: 'none', border: 'none', color: '#60a5fa', cursor: 'pointer', padding: '0', display: 'flex', alignItems: 'center' }}
                      title="Edit Milestones"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                  </div>

                  <div style={{
                    border: '1px solid #e0e0e0',
                    borderRadius: '4px',
                    overflow: 'hidden'
                  }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '15px' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#1e3a5f' }}>
                          <th style={{ width: '100px', padding: '12px 15px', textAlign: 'left', color: 'white', fontWeight: 'bold', borderRight: '1px solid #2c4c7c' }}>Categories</th>
                          <th style={{ width: '90px', padding: '12px 15px', textAlign: 'left', color: 'white', fontWeight: 'bold', borderRight: '1px solid #2c4c7c' }}>A</th>
                          <th style={{ width: '90px', padding: '12px 15px', textAlign: 'left', color: 'white', fontWeight: 'bold', borderRight: '1px solid #2c4c7c' }}>B</th>
                          <th style={{ width: '90px', padding: '12px 15px', textAlign: 'left', color: 'white', fontWeight: 'bold', borderRight: '1px solid #2c4c7c' }}>C</th>
                          <th style={{ width: '90px', padding: '12px 15px', textAlign: 'left', color: 'white', fontWeight: 'bold', borderRight: '1px solid #2c4c7c' }}>D</th>
                          <th style={{ width: '90px', padding: '12px 15px', textAlign: 'left', color: 'white', fontWeight: 'bold', borderRight: '1px solid #2c4c7c' }}>E</th>
                          <th style={{ width: '90px', padding: '12px 15px', textAlign: 'left', color: 'white', fontWeight: 'bold', borderRight: '1px solid #2c4c7c' }}>F</th>
                          <th style={{ width: '120px', padding: '12px 15px', textAlign: 'left', color: 'white', fontWeight: 'bold' }}>Implementation</th>
                        </tr>
                      </thead>
                      <tbody>
                        {milestones.map((item, idx) => (
                          <React.Fragment key={idx}>
                            <tr style={{ backgroundColor: idx % 2 === 0 ? 'white' : '#f8f9fa', borderBottom: '1px solid #e0e0e0' }}>
                              <td style={{ padding: '10px 15px', borderRight: '1px solid #e0e0e0', fontWeight: 'bold', color: '#1e3a5f', whiteSpace: 'nowrap' }}>Plan</td>
                              <td style={{ padding: '10px 15px', borderRight: '1px solid #e0e0e0', whiteSpace: 'nowrap' }}>{item.plan.a}</td>
                              <td style={{ padding: '10px 15px', borderRight: '1px solid #e0e0e0', whiteSpace: 'nowrap' }}>{item.plan.b}</td>
                              <td style={{ padding: '10px 15px', borderRight: '1px solid #e0e0e0', whiteSpace: 'nowrap' }}>{item.plan.c}</td>
                              <td style={{ padding: '10px 15px', borderRight: '1px solid #e0e0e0', whiteSpace: 'nowrap' }}>{item.plan.d}</td>
                              <td style={{ padding: '10px 15px', borderRight: '1px solid #e0e0e0', whiteSpace: 'nowrap' }}>{item.plan.e}</td>
                              <td style={{ padding: '10px 15px', borderRight: '1px solid #e0e0e0', whiteSpace: 'nowrap' }}>{item.plan.f}</td>
                              <td style={{ padding: '10px 15px' }}>
                                <span style={{
                                  display: 'inline-block',
                                  padding: '4px 10px',
                                  borderRadius: '20px',
                                  fontSize: '12px',
                                  fontWeight: 'bold',
                                  backgroundColor:
                                    item.plan.implementation === 'On Track' ? '#d1fae5' :
                                      item.plan.implementation === 'In Progress' ? '#dbeafe' :
                                        item.plan.implementation === 'At Risk' ? '#fee2e2' : '#f3f4f6',
                                  color:
                                    item.plan.implementation === 'On Track' ? '#065f46' :
                                      item.plan.implementation === 'In Progress' ? '#1e40af' :
                                        item.plan.implementation === 'At Risk' ? '#991b1b' : '#1f2937'
                                }}>
                                  {item.plan.implementation}
                                </span>
                              </td>
                            </tr>
                            <tr style={{ backgroundColor: idx % 2 === 0 ? '#f0f7ff' : '#e6f0fa', borderBottom: '1px solid #e0e0e0' }}>
                              <td style={{ padding: '10px 15px', borderRight: '1px solid #e0e0e0', fontWeight: 'bold', color: '#047857', whiteSpace: 'nowrap' }}>Actual/Outlook</td>
                              <td style={{ padding: '10px 15px', borderRight: '1px solid #e0e0e0', whiteSpace: 'nowrap' }}>{item.actual.a}</td>
                              <td style={{ padding: '10px 15px', borderRight: '1px solid #e0e0e0', whiteSpace: 'nowrap' }}>{item.actual.b}</td>
                              <td style={{ padding: '10px 15px', borderRight: '1px solid #e0e0e0', whiteSpace: 'nowrap' }}>{item.actual.c}</td>
                              <td style={{ padding: '10px 15px', borderRight: '1px solid #e0e0e0', whiteSpace: 'nowrap' }}>{item.actual.d}</td>
                              <td style={{ padding: '10px 15px', borderRight: '1px solid #e0e0e0', whiteSpace: 'nowrap' }}>{item.actual.e}</td>
                              <td style={{ padding: '10px 15px', borderRight: '1px solid #e0e0e0', whiteSpace: 'nowrap' }}>{item.actual.f}</td>
                              <td style={{ padding: '10px 15px' }}>
                                <span style={{
                                  display: 'inline-block',
                                  padding: '4px 10px',
                                  borderRadius: '20px',
                                  fontSize: '12px',
                                  fontWeight: 'bold',
                                  backgroundColor:
                                    item.actual.implementation === 'On Track' ? '#d1fae5' :
                                      item.actual.implementation === 'In Progress' ? '#dbeafe' :
                                        item.actual.implementation === 'At Risk' ? '#fee2e2' : '#f3f4f6',
                                  color:
                                    item.actual.implementation === 'On Track' ? '#065f46' :
                                      item.actual.implementation === 'In Progress' ? '#1e40af' :
                                        item.actual.implementation === 'At Risk' ? '#991b1b' : '#1f2937'
                                }}>
                                  {item.actual.implementation}
                                </span>
                              </td>
                            </tr>
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Critical Issues Section */}
              {visibleSections.criticalIssues && (
                <div style={{ marginBottom: '35px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1e3a5f', color: 'white', padding: '12px 20px', fontSize: '16px', fontWeight: 'bold', borderBottom: '2px solid #234574' }}>
                    <span>Critical Issues Summary</span>
                    <button
                      onClick={() => { setIssuesForm([...criticalIssues]); setShowEditIssues(true); }}
                      className="no-print"
                      style={{ background: 'none', border: 'none', color: '#60a5fa', cursor: 'pointer', padding: '0', display: 'flex', alignItems: 'center' }}
                      title="Edit Critical Issues"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                  </div>

                  <div style={{
                    border: '1px solid #e0e0e0',
                    borderRadius: '4px',
                    overflow: 'hidden'
                  }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '15px' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#1e3a5f' }}>
                          <th style={{ padding: '12px 15px', textAlign: 'left', color: 'white', fontWeight: 'bold', borderRight: '1px solid #2c4c7c' }}>S.No</th>
                          <th style={{ padding: '12px 15px', textAlign: 'left', color: 'white', fontWeight: 'bold', borderRight: '1px solid #2c4c7c' }}>List of Top Critical Issues</th>
                          <th style={{ padding: '12px 15px', textAlign: 'left', color: 'white', fontWeight: 'bold', borderRight: '1px solid #2c4c7c' }}>Responsibility</th>
                          <th style={{ padding: '12px 15px', textAlign: 'left', color: 'white', fontWeight: 'bold', borderRight: '1px solid #2c4c7c' }}>Function</th>
                          <th style={{ padding: '12px 15px', textAlign: 'left', color: 'white', fontWeight: 'bold', borderRight: '1px solid #2c4c7c' }}>Target date for Closure</th>
                          <th style={{ padding: '12px 15px', textAlign: 'left', color: 'white', fontWeight: 'bold' }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {criticalIssues.map((item, index) => {
                          const colors = getStatusColor(item.status);

                          return (
                            <tr key={item.id} style={{ backgroundColor: index % 2 === 0 ? 'white' : '#f8f9fa', borderBottom: '1px solid #e0e0e0' }}>
                              <td style={{ padding: '10px 15px', borderRight: '1px solid #e0e0e0', fontWeight: 'bold' }}>{item.id}</td>
                              <td style={{ padding: '10px 15px', borderRight: '1px solid #e0e0e0' }}>{item.issue}</td>
                              <td style={{ padding: '10px 15px', borderRight: '1px solid #e0e0e0' }}>{item.responsibility}</td>
                              <td style={{ padding: '10px 15px', borderRight: '1px solid #e0e0e0' }}>{item.function}</td>
                              <td style={{ padding: '10px 15px', borderRight: '1px solid #e0e0e0' }}>{item.targetDate}</td>
                              <td style={{ padding: '10px 15px' }}>
                                <span style={{
                                  display: 'inline-block',
                                  padding: '4px 10px',
                                  borderRadius: '20px',
                                  fontSize: '12px',
                                  fontWeight: 'bold',
                                  backgroundColor: colors.bg,
                                  color: colors.text
                                }}>
                                  {item.status}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Project Metrics Charts */}
              {((visibleSections.design && availablePhases.design) || (visibleSections.partDevelopment && availablePhases.partDevelopment) || (visibleSections.build && availablePhases.build) ||
                (visibleSections.gateway && availablePhases.gateway) || (visibleSections.validation && availablePhases.validation) || (visibleSections.qualityIssues && availablePhases.qualityIssues)) && (
                  <div style={{ marginBottom: '35px' }}>
                    <h2 style={{
                      fontSize: '20px',
                      fontWeight: 'bold',
                      color: '#1e3a5f',
                      marginBottom: '15px',
                      marginTop: 0
                    }}>
                      Project Metrics Summary
                    </h2>

                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: '15px'
                    }}>
                      {/* Design */}
                      {(visibleSections.design && availablePhases.design) && (
                        <div
                          style={{
                            border: '1px solid #e0e0e0',
                            borderRadius: '6px',
                            overflow: 'hidden',
                            backgroundColor: 'white',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                            position: 'relative'
                          }}
                        >
                          <div style={{
                            backgroundColor: '#1e3a5f',
                            color: 'white',
                            padding: '12px 15px',
                            fontSize: '15px',
                            fontWeight: 'bold',
                            borderBottom: '1px solid #2c4c7c',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}>
                            <span>Design</span>
                            <ChartOptions chartId="design" currentType={chartTypes[activeProject.id]?.design || 'bar'} />
                          </div>
                          <div style={{ padding: '15px' }}>
                            {renderChart('design', chartTypes[activeProject.id]?.design || 'bar', false, getTrackerForPhase('design')?.trackerId)}
                          </div>
                        </div>
                      )}

                      {/* Part Development */}
                      {(visibleSections.partDevelopment && availablePhases.partDevelopment) && (
                        <div
                          style={{
                            border: '1px solid #e0e0e0',
                            borderRadius: '6px',
                            overflow: 'hidden',
                            backgroundColor: 'white',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                            position: 'relative'
                          }}
                        >
                          <div style={{
                            backgroundColor: '#1e3a5f',
                            color: 'white',
                            padding: '12px 15px',
                            fontSize: '15px',
                            fontWeight: 'bold',
                            borderBottom: '1px solid #2c4c7c',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}>
                            <span>Part Development</span>
                            <ChartOptions chartId="partDevelopment" currentType={chartTypes[activeProject.id]?.partDevelopment || 'line'} />
                          </div>
                          <div style={{ padding: '15px' }}>
                            {renderChart('partDevelopment', chartTypes[activeProject.id]?.partDevelopment || 'line', false, getTrackerForPhase('partDevelopment')?.trackerId)}
                          </div>
                        </div>
                      )}

                      {/* Build */}
                      {(visibleSections.build && availablePhases.build) && (
                        <div
                          style={{
                            border: '1px solid #e0e0e0',
                            borderRadius: '6px',
                            overflow: 'hidden',
                            backgroundColor: 'white',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                            position: 'relative'
                          }}
                        >
                          <div style={{
                            backgroundColor: '#1e3a5f',
                            color: 'white',
                            padding: '12px 15px',
                            fontSize: '15px',
                            fontWeight: 'bold',
                            borderBottom: '1px solid #2c4c7c',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}>
                            <span>Build</span>
                            <ChartOptions chartId="build" currentType={chartTypes[activeProject.id]?.build || 'pie'} />
                          </div>
                          <div style={{ padding: '15px' }}>
                            {renderChart('build', chartTypes[activeProject.id]?.build || 'pie', false, getTrackerForPhase('build')?.trackerId)}
                          </div>
                        </div>
                      )}

                      {/* Gateway */}
                      {(visibleSections.gateway && availablePhases.gateway) && (
                        <div
                          style={{
                            border: '1px solid #e0e0e0',
                            borderRadius: '6px',
                            overflow: 'hidden',
                            backgroundColor: 'white',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                            position: 'relative'
                          }}
                        >
                          <div style={{
                            backgroundColor: '#1e3a5f',
                            color: 'white',
                            padding: '12px 15px',
                            fontSize: '15px',
                            fontWeight: 'bold',
                            borderBottom: '1px solid #2c4c7c',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}>
                            <span>Gateway</span>
                            <ChartOptions chartId="gateway" currentType={chartTypes[activeProject.id]?.gateway || 'area'} />
                          </div>
                          <div style={{ padding: '15px' }}>
                            {renderChart('gateway', chartTypes[activeProject.id]?.gateway || 'area', false, getTrackerForPhase('gateway')?.trackerId)}
                          </div>
                        </div>
                      )}

                      {/* Validation */}
                      {(visibleSections.validation && availablePhases.validation) && (
                        <div
                          style={{
                            border: '1px solid #e0e0e0',
                            borderRadius: '6px',
                            overflow: 'hidden',
                            backgroundColor: 'white',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                            position: 'relative'
                          }}
                        >
                          <div style={{
                            backgroundColor: '#1e3a5f',
                            color: 'white',
                            padding: '12px 15px',
                            fontSize: '15px',
                            fontWeight: 'bold',
                            borderBottom: '1px solid #2c4c7c',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}>
                            <span>Validation</span>
                            <ChartOptions chartId="validation" currentType={chartTypes[activeProject.id]?.validation || 'bar'} />
                          </div>
                          <div style={{ padding: '15px' }}>
                            {renderChart('validation', chartTypes[activeProject.id]?.validation || 'bar', false, getTrackerForPhase('validation')?.trackerId)}
                          </div>
                        </div>
                      )}

                      {/* Quality Issues */}
                      {(visibleSections.qualityIssues && availablePhases.qualityIssues) && (
                        <div
                          style={{
                            border: '1px solid #e0e0e0',
                            borderRadius: '6px',
                            overflow: 'hidden',
                            backgroundColor: 'white',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                            position: 'relative'
                          }}
                        >
                          <div style={{
                            backgroundColor: '#1e3a5f',
                            color: 'white',
                            padding: '12px 15px',
                            fontSize: '15px',
                            fontWeight: 'bold',
                            borderBottom: '1px solid #2c4c7c',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}>
                            <span>Quality Issues</span>
                            <ChartOptions chartId="qualityIssues" currentType={chartTypes[activeProject.id]?.qualityIssues || 'bar'} />
                          </div>
                          <div style={{ padding: '15px' }}>
                            {renderChart('qualityIssues', chartTypes[activeProject.id]?.qualityIssues || 'bar', false, getTrackerForPhase('qualityIssues')?.trackerId)}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

              {/* Summary Cards */}
              {(visibleSections.budget || visibleSections.resource || visibleSections.quality) && (
                <div style={{ marginBottom: '35px' }}>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: (visibleSections.budget && visibleSections.resource && visibleSections.quality) ? '1fr 1fr 1fr' :
                      (visibleSections.budget && visibleSections.resource) || (visibleSections.budget && visibleSections.quality) || (visibleSections.resource && visibleSections.quality) ? '1fr 1fr' : '1fr',
                    gap: '20px'
                  }}>
                    {/* Budget Summary */}
                    {visibleSections.budget && (
                      <div style={{
                        border: '1px solid #e0e0e0',
                        borderRadius: '6px',
                        overflow: 'hidden',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                      }}>
                        <div style={{
                          backgroundColor: '#1e3a5f',
                          color: 'white',
                          padding: '12px 15px',
                          fontSize: '16px',
                          fontWeight: 'bold',
                          borderBottom: '1px solid #2c4c7c',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <span>Budget Summary</span>
                          <button
                            onClick={() => { setEditType('budget'); setSummaryForm({ ...summaryData }); setShowEditSummary(true); }}
                            className="no-print"
                            style={{ background: 'none', border: 'none', color: '#60a5fa', cursor: 'pointer', padding: '0', display: 'flex', alignItems: 'center' }}
                            title="Edit Budget Summary"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                        </div>
                        <div style={{ padding: '15px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', borderBottom: '1px dashed #e0e0e0', paddingBottom: '8px' }}>
                            <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#4b5563' }}>Approved:</span>
                            <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#1e3a5f' }}>{summaryData.budgetApproved}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', borderBottom: '1px dashed #e0e0e0', paddingBottom: '8px' }}>
                            <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#4b5563' }}>Utilized:</span>
                            <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#1e3a5f' }}>{summaryData.budgetUtilized}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', borderBottom: '1px dashed #e0e0e0', paddingBottom: '8px' }}>
                            <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#4b5563' }}>Balance:</span>
                            <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#1e3a5f' }}>{summaryData.budgetBalance}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#4b5563' }}>Utilization Outlook:</span>
                            <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#10b981' }}>{summaryData.budgetOutlook}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Resource Summary */}
                    {visibleSections.resource && (
                      <div style={{
                        border: '1px solid #e0e0e0',
                        borderRadius: '6px',
                        overflow: 'hidden',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                      }}>
                        <div style={{
                          backgroundColor: '#1e3a5f',
                          color: 'white',
                          padding: '12px 15px',
                          fontSize: '16px',
                          fontWeight: 'bold',
                          borderBottom: '1px solid #2c4c7c',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <span>Resource Summary</span>
                          <button
                            onClick={() => { setEditType('resource'); setSummaryForm({ ...summaryData }); setShowEditSummary(true); }}
                            className="no-print"
                            style={{ background: 'none', border: 'none', color: '#60a5fa', cursor: 'pointer', padding: '0', display: 'flex', alignItems: 'center' }}
                            title="Edit Resource Summary"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                        </div>
                        <div style={{ padding: '15px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', borderBottom: '1px dashed #e0e0e0', paddingBottom: '8px' }}>
                            <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#4b5563' }}>Deployed:</span>
                            <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#1e3a5f' }}>{summaryData.resourceDeployed}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', borderBottom: '1px dashed #e0e0e0', paddingBottom: '8px' }}>
                            <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#4b5563' }}>Utilized:</span>
                            <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#1e3a5f' }}>{summaryData.resourceUtilized}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', borderBottom: '1px dashed #e0e0e0', paddingBottom: '8px' }}>
                            <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#4b5563' }}>Shortage:</span>
                            <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#ef4444' }}>{summaryData.resourceShortage}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#4b5563' }}>Under Utilized:</span>
                            <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#f59e0b' }}>{summaryData.resourceUnderUtilized}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Quality Summary */}
                    {visibleSections.quality && (
                      <div style={{
                        border: '1px solid #e0e0e0',
                        borderRadius: '6px',
                        overflow: 'hidden',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                      }}>
                        <div style={{
                          backgroundColor: '#1e3a5f',
                          color: 'white',
                          padding: '12px 15px',
                          fontSize: '16px',
                          fontWeight: 'bold',
                          borderBottom: '1px solid #2c4c7c',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <span>Quality Summary</span>
                          <button
                            onClick={() => { setEditType('quality'); setSummaryForm({ ...summaryData }); setShowEditSummary(true); }}
                            className="no-print"
                            style={{ background: 'none', border: 'none', color: '#60a5fa', cursor: 'pointer', padding: '0', display: 'flex', alignItems: 'center' }}
                            title="Edit Quality Summary"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                        </div>
                        <div style={{ padding: '15px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', borderBottom: '1px dashed #e0e0e0', paddingBottom: '8px' }}>
                            <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#4b5563' }}>Total Issues:</span>
                            <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#1e3a5f' }}>{summaryData.qualityTotal}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', borderBottom: '1px dashed #e0e0e0', paddingBottom: '8px' }}>
                            <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#4b5563' }}>Action Completed:</span>
                            <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#10b981' }}>{summaryData.qualityCompleted}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', borderBottom: '1px dashed #e0e0e0', paddingBottom: '8px' }}>
                            <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#4b5563' }}>Open Issues:</span>
                            <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#ef4444' }}>{summaryData.qualityOpen}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#4b5563' }}>No of Critical Issues:</span>
                            <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#ef4444' }}>{summaryData.qualityCritical}</span>
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
          </>
        )}
      </div>
    </div>
  );
};

export default ProjectTitleDashboard;