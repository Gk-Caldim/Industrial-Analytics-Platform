import React, { useState, useEffect, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import ExcelTableViewer from '../components/ExcelTableViewer';

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

  // Predefined email contacts (dummy data)
  const emailContacts = [
    { id: 1, name: 'John Doe', email: 'john.doe@company.com', department: 'Management' },
    { id: 2, name: 'Jane Smith', email: 'jane.smith@company.com', department: 'Engineering' },
    { id: 3, name: 'Mike Johnson', email: 'mike.j@company.com', department: 'QA' },
    { id: 4, name: 'Sarah Wilson', email: 'sarah.w@company.com', department: 'Product' },
    { id: 5, name: 'Alex Chen', email: 'alex.chen@company.com', department: 'DevOps' },
    { id: 6, name: 'Emily Brown', email: 'emily.b@company.com', department: 'Design' },
    { id: 7, name: 'David Lee', email: 'david.lee@company.com', department: 'Management' },
    { id: 8, name: 'Lisa Anderson', email: 'lisa.a@company.com', department: 'Engineering' },
  ];

  // Available columns for X and Y axis (dummy data)
  const availableColumns = [
    'Category', 'Value', 'Week', 'Progress', 'Component', 'Percentage',
    'Month', 'Performance', 'Test Case', 'Pass Rate', 'Metric', 'Score',
    'Region', 'Sales', 'Product', 'Revenue', 'Department', 'Count'
  ];

  // Milestones data with plan/actual
  const milestones = [
    {
      plan: { a: 'April 26', b: 'May 26', c: 'Jan 26', d: 'April 26', e: 'May 26', f: 'Jan 26', implementation: 'On Track' },
      actual: { a: 'Jan 26', b: 'April 26', c: 'July 26', d: 'July 26', e: 'Jan 26', f: 'May 26', implementation: 'In Progress' }
    },
  ];

  // SOP Data - Health and status information
  const sopData = [
    {
      name: 'SOP Timeline',
      daysToGo: 20,
      status: 'Likely Delay',
      health: 'At Risk'
    }
  ];

  // Critical issues data
  const criticalIssues = [
    { id: 1, issue: 'Database connection timeout in production', responsibility: 'John Doe', function: 'Backend', targetDate: '2024-03-20', status: 'Open' },
    { id: 2, issue: 'API rate limiting causing service disruption', responsibility: 'Jane Smith', function: 'API Team', targetDate: '2024-03-18', status: 'Open' },
    { id: 3, issue: 'Memory leak in payment processing service', responsibility: 'Mike Johnson', function: 'Infra', targetDate: '2024-03-19', status: 'In Progress' },
    { id: 4, issue: 'UI rendering issue on mobile devices', responsibility: 'Sarah Wilson', function: 'Frontend', targetDate: '2024-03-25', status: 'Closed' },
    { id: 5, issue: 'Security vulnerability in authentication', responsibility: 'Security Team', function: 'Security', targetDate: '2024-03-17', status: 'Open' },
    { id: 6, issue: 'Data sync failure between services', responsibility: 'Alex Chen', function: 'DevOps', targetDate: '2024-03-22', status: 'In Progress' },
  ];

  // Budget summary data
  const budgetData = {
    approved: '$2,500,000',
    utilized: '$1,850,000',
    balance: '$650,000',
    outlook: '72%'
  };

  // Resource summary data
  const resourceData = {
    deployed: '24',
    utilized: '18',
    shortage: '6',
    underUtilized: '3'
  };

  // Quality summary data
  const qualityData = {
    totalIssues: '42',
    actionCompleted: '28',
    openIssues: '14',
    criticalIssues: '7'
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
  const handleSubmoduleProcess = async (trackerId) => {
    try {
      setLoading(true);
      const { default: API } = await import('../utils/api');
      const response = await API.post(`/datasets/${trackerId}/process`);

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
            design: { xAxis: 'Category', yAxis: 'Value' },
            partDevelopment: { xAxis: 'Week', yAxis: 'Progress' },
            build: { xAxis: 'Component', yAxis: 'Percentage' },
            gateway: { xAxis: 'Month', yAxis: 'Performance' },
            validation: { xAxis: 'Test Case', yAxis: 'Pass Rate' },
            qualityIssues: { xAxis: 'Metric', yAxis: 'Score' }
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
        onProcessData={() => handleSubmoduleProcess(selectedSubmodule.trackerId)}
        onRefresh={() => loadSubmoduleData(selectedSubmodule.trackerId)}
        loading={loading}
      />
    );
  };

  // Enhanced PDF preview function with dashboard UI styling
  const openPrintPreview = () => {
    const selected = Object.entries(emailData.selectedSections)
      .filter(([_, selected]) => selected)
      .map(([section]) => section);

    if (selected.length === 0) {
      alert('No sections selected to preview.');
      return;
    }

    // Helper to render chart as SVG/HTML with enhanced styling
    const renderChartForPDF = (chartId, chartType) => {
      const axisConfig = activeProject ? axisConfigs[activeProject.id]?.[chartId] : { xAxis: 'Category', yAxis: 'Value' };
      const chartColors = {
        design: '#3b82f6',
        partDevelopment: '#f59e0b',
        build: '#10b981',
        gateway: '#8b5cf6',
        validation: '#ec4899',
        qualityIssues: '#ef4444'
      };

      const chartNames = {
        design: 'Design Progress',
        partDevelopment: 'Part Development',
        build: 'Build Status',
        gateway: 'Gateway Performance',
        validation: 'Validation Results',
        qualityIssues: 'Quality Metrics'
      };

      switch (chartType) {
        case 'bar':
          return `
            <div class="chart-card">
              <div class="chart-header">
                <span class="chart-title">${chartNames[chartId] || chartId}</span>
                <span class="chart-axis-label">X: ${axisConfig?.xAxis || 'Category'} | Y: ${axisConfig?.yAxis || 'Value'}</span>
              </div>
              <div class="chart-body">
                <div class="bar-chart">
                  <div class="bars-container">
                    <div class="bar-wrapper">
                      <div class="bar" style="height: 180px; background-color: ${chartColors[chartId]};">
                        <span class="bar-value">85%</span>
                      </div>
                      <span class="bar-label">UI</span>
                    </div>
                    <div class="bar-wrapper">
                      <div class="bar" style="height: 130px; background-color: ${chartColors[chartId]}cc;">
                        <span class="bar-value">62%</span>
                      </div>
                      <span class="bar-label">UX</span>
                    </div>
                    <div class="bar-wrapper">
                      <div class="bar" style="height: 95px; background-color: ${chartColors[chartId]}99;">
                        <span class="bar-value">45%</span>
                      </div>
                      <span class="bar-label">Research</span>
                    </div>
                    <div class="bar-wrapper">
                      <div class="bar" style="height: 150px; background-color: ${chartColors[chartId]}b3;">
                        <span class="bar-value">72%</span>
                      </div>
                      <span class="bar-label">Testing</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          `;

        case 'line':
          return `
            <div class="chart-card">
              <div class="chart-header">
                <span class="chart-title">${chartNames[chartId] || chartId}</span>
                <span class="chart-axis-label">X: ${axisConfig?.xAxis || 'Week'} | Y: ${axisConfig?.yAxis || 'Progress'}</span>
              </div>
              <div class="chart-body">
                <svg width="100%" height="200" viewBox="0 0 400 200" preserveAspectRatio="none">
                  <polyline points="50,150 120,80 190,120 260,40 330,90" 
                    stroke="${chartColors[chartId]}" stroke-width="3" fill="none" />
                  <circle cx="50" cy="150" r="4" fill="${chartColors[chartId]}" />
                  <circle cx="120" cy="80" r="4" fill="${chartColors[chartId]}" />
                  <circle cx="190" cy="120" r="4" fill="${chartColors[chartId]}" />
                  <circle cx="260" cy="40" r="4" fill="${chartColors[chartId]}" />
                  <circle cx="330" cy="90" r="4" fill="${chartColors[chartId]}" />
                </svg>
                <div class="line-labels">
                  <span>W1</span><span>W2</span><span>W3</span><span>W4</span><span>W5</span>
                </div>
              </div>
            </div>
          `;

        case 'pie':
          return `
            <div class="chart-card">
              <div class="chart-header">
                <span class="chart-title">${chartNames[chartId] || chartId}</span>
                <span class="chart-axis-label">Distribution</span>
              </div>
              <div class="chart-body pie-chart">
                <svg width="180" height="180" viewBox="0 0 32 32">
                  <circle r="16" cx="16" cy="16" fill="${chartColors[chartId]}" />
                  <path d="M16,16 L16,0 A16,16 0 0,1 32,16 Z" fill="${chartColors[chartId]}cc" />
                  <path d="M16,16 L32,16 A16,16 0 0,1 16,32 Z" fill="${chartColors[chartId]}99" />
                  <circle r="8" cx="16" cy="16" fill="white" />
                </svg>
                <div class="pie-legend">
                  <div><span class="legend-dot" style="background: ${chartColors[chartId]}"></span> Complete 45%</div>
                  <div><span class="legend-dot" style="background: ${chartColors[chartId]}cc"></span> In Progress 35%</div>
                  <div><span class="legend-dot" style="background: ${chartColors[chartId]}99"></span> Pending 20%</div>
                </div>
              </div>
            </div>
          `;

        default:
          return `
            <div class="chart-card">
              <div class="chart-header">
                <span class="chart-title">${chartNames[chartId] || chartId}</span>
                <span class="chart-axis-label">X: ${axisConfig?.xAxis || 'Category'} | Y: ${axisConfig?.yAxis || 'Value'}</span>
              </div>
              <div class="chart-body">
                <div style="text-align:center; padding:30px; color:#6b7280;">
                  Chart: ${chartType} - Sample visualization
                </div>
              </div>
            </div>
          `;
      }
    };

    // Helper to build section HTML with enhanced dashboard styling
    const buildSectionHTML = (section) => {
      const colors = {
        milestones: { bg: '#e6f0fa', border: '#1e3a5f' },
        criticalIssues: { bg: '#fee2e2', border: '#991b1b' },
        budget: { bg: '#d1fae5', border: '#065f46' },
        resource: { bg: '#fef3c7', border: '#92400e' },
        quality: { bg: '#dbeafe', border: '#1e40af' }
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
        qualityIssues: 'Quality Issues'
      };

      // Chart sections
      if (['design', 'partDevelopment', 'build', 'gateway', 'validation', 'qualityIssues'].includes(section)) {
        const chartType = {
          design: 'bar',
          partDevelopment: 'line',
          build: 'pie',
          gateway: 'area',
          validation: 'bar',
          qualityIssues: 'gauge'
        }[section];

        return renderChartForPDF(section, chartType);
      }

      // Regular sections
      switch (section) {
        case 'milestones':
          return `
            <div class="section-card" style="border-top-color: ${colors.milestones.border}">
              <h2 class="section-title">
                <span class="title-text">${sectionTitles[section]}</span>
                <span class="section-badge">Timeline</span>
              </h2>
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Plan/Actual</th>
                    <th>Q1</th>
                    <th>Q2</th>
                    <th>Q3</th>
                    <th>Q4</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr class="plan-row">
                    <td><span class="plan-badge">Plan</span></td>
                    <td>${milestones[0].plan.a}</td>
                    <td>${milestones[0].plan.b}</td>
                    <td>${milestones[0].plan.c}</td>
                    <td>${milestones[0].plan.d}</td>
                    <td><span class="status-badge on-track">${milestones[0].plan.implementation}</span></td>
                  </tr>
                  <tr class="actual-row">
                    <td><span class="actual-badge">Actual</span></td>
                    <td>${milestones[0].actual.a}</td>
                    <td>${milestones[0].actual.b}</td>
                    <td>${milestones[0].actual.c}</td>
                    <td>${milestones[0].actual.d}</td>
                    <td><span class="status-badge in-progress">${milestones[0].actual.implementation}</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          `;

        case 'criticalIssues':
          let issuesHTML = `
            <div class="section-card" style="border-top-color: ${colors.criticalIssues.border}">
              <h2 class="section-title">
                <span class="title-text">${sectionTitles[section]}</span>
                <span class="section-badge warning">High Priority</span>
              </h2>
              <table class="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Issue</th>
                    <th>Assignee</th>
                    <th>Function</th>
                    <th>Target Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
          `;

          criticalIssues.slice(0, 4).forEach(issue => {
            const statusClass = issue.status.toLowerCase().replace(' ', '-');
            issuesHTML += `
              <tr>
                <td><span class="issue-id">#${issue.id}</span></td>
                <td class="issue-title">${issue.issue}</td>
                <td>${issue.responsibility}</td>
                <td><span class="function-tag">${issue.function}</span></td>
                <td>${issue.targetDate}</td>
                <td><span class="status-badge ${statusClass}">${issue.status}</span></td>
              </tr>
            `;
          });

          issuesHTML += `
                </tbody>
              </table>
              <div class="section-footer">
                <span>Showing 4 of ${criticalIssues.length} issues</span>
              </div>
            </div>
          `;
          return issuesHTML;

        case 'budget':
          return `
            <div class="section-card" style="border-top-color: ${colors.budget.border}">
              <h2 class="section-title">
                <span class="title-text">${sectionTitles[section]}</span>
              </h2>
              <div class="summary-grid">
                <div class="summary-item">
                  <span class="summary-label">Approved Budget</span>
                  <span class="summary-value approved">${budgetData.approved}</span>
                </div>
                <div class="summary-item">
                  <span class="summary-label">Utilized</span>
                  <span class="summary-value utilized">${budgetData.utilized}</span>
                </div>
                <div class="summary-item">
                  <span class="summary-label">Remaining</span>
                  <span class="summary-value remaining">${budgetData.balance}</span>
                </div>
                <div class="summary-item">
                  <span class="summary-label">Utilization</span>
                  <span class="summary-value percentage">${budgetData.outlook}</span>
                </div>
              </div>
              <div class="progress-bar">
                <div class="progress-fill" style="width: 72%"></div>
              </div>
            </div>
          `;

        case 'resource':
          return `
            <div class="section-card" style="border-top-color: ${colors.resource.border}">
              <h2 class="section-title">
                <span class="title-text">${sectionTitles[section]}</span>
              </h2>
              <div class="resource-grid">
                <div class="resource-stat">
                  <span class="stat-value">${resourceData.deployed}</span>
                  <span class="stat-label">Deployed</span>
                </div>
                <div class="resource-stat">
                  <span class="stat-value">${resourceData.utilized}</span>
                  <span class="stat-label">Utilized</span>
                </div>
                <div class="resource-stat warning">
                  <span class="stat-value">${resourceData.shortage}</span>
                  <span class="stat-label">Shortage</span>
                </div>
                <div class="resource-stat caution">
                  <span class="stat-value">${resourceData.underUtilized}</span>
                  <span class="stat-label">Under Utilized</span>
                </div>
              </div>
            </div>
          `;

        case 'quality':
          return `
            <div class="section-card" style="border-top-color: ${colors.quality.border}">
              <h2 class="section-title">
                <span class="title-text">${sectionTitles[section]}</span>
              </h2>
              <div class="quality-metrics">
                <div class="metric-item">
                  <span class="metric-label">Total Issues</span>
                  <span class="metric-value">${qualityData.totalIssues}</span>
                </div>
                <div class="metric-item success">
                  <span class="metric-label">Completed</span>
                  <span class="metric-value">${qualityData.actionCompleted}</span>
                </div>
                <div class="metric-item warning">
                  <span class="metric-label">Open Issues</span>
                  <span class="metric-value">${qualityData.openIssues}</span>
                </div>
                <div class="metric-item critical">
                  <span class="metric-label">Critical</span>
                  <span class="metric-value">${qualityData.criticalIssues}</span>
                </div>
              </div>
            </div>
          `;

        default:
          return '';
      }
    };

    // Build complete HTML with enhanced dashboard styling
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${activeProject?.name} - Project Dashboard Report</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body {
              font-family: 'Segoe UI', Arial, sans-serif;
              background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
              padding: 30px;
              color: #1e293b;
            }
            
            .report-container {
              max-width: 1200px;
              margin: 0 auto;
              background: white;
              border-radius: 20px;
              box-shadow: 0 20px 40px rgba(0,0,0,0.1);
              overflow: hidden;
            }
            
            .report-header {
              background: linear-gradient(135deg, #1e3a5f 0%, #2c5282 100%);
              color: white;
              padding: 30px;
              position: relative;
              overflow: hidden;
            }
            
            .report-header::before {
              content: '';
              position: absolute;
              top: -50%;
              right: -50%;
              width: 200%;
              height: 200%;
              background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
              transform: rotate(45deg);
            }
            
            .header-content {
              position: relative;
              z-index: 1;
            }
            
            .report-title {
              font-size: 32px;
              font-weight: bold;
              margin-bottom: 10px;
              display: flex;
              align-items: center;
              gap: 15px;
            }
            
            .project-badge {
              background: rgba(255,255,255,0.2);
              padding: 8px 16px;
              border-radius: 30px;
              font-size: 14px;
              font-weight: normal;
              border: 1px solid rgba(255,255,255,0.3);
            }
            
            .report-meta {
              display: flex;
              gap: 30px;
              margin-top: 15px;
              font-size: 14px;
              color: #e2e8f0;
            }
            
            .meta-item {
              display: flex;
              align-items: center;
              gap: 8px;
            }
            
            .meta-label {
              font-weight: 300;
            }
            
            .meta-value {
              font-weight: 600;
              background: rgba(255,255,255,0.1);
              padding: 4px 10px;
              border-radius: 20px;
            }
            
            .sop-indicator {
              display: inline-flex;
              align-items: center;
              gap: 10px;
              background: rgba(255,255,255,0.1);
              padding: 8px 16px;
              border-radius: 30px;
              margin-top: 15px;
            }
            
            .sop-days {
              background: #fbbf24;
              color: #1e3a5f;
              padding: 4px 12px;
              border-radius: 20px;
              font-weight: bold;
            }
            
            .sop-status {
              color: #fbbf24;
              font-weight: 600;
            }
            
            .content-section {
              padding: 30px;
            }
            
            .section-card {
              background: white;
              border-radius: 16px;
              padding: 25px;
              margin-bottom: 30px;
              box-shadow: 0 4px 6px rgba(0,0,0,0.05);
              border-top: 4px solid #1e3a5f;
              transition: transform 0.2s;
            }
            
            .section-card:hover {
              transform: translateY(-2px);
              box-shadow: 0 10px 20px rgba(0,0,0,0.1);
            }
            
            .section-title {
              font-size: 20px;
              font-weight: bold;
              color: #1e3a5f;
              margin-bottom: 20px;
              display: flex;
              align-items: center;
              justify-content: space-between;
              border-bottom: 2px solid #e2e8f0;
              padding-bottom: 10px;
            }
            
            .title-text {
              display: flex;
              align-items: center;
              gap: 10px;
            }
            
            .section-badge {
              background: #1e3a5f;
              color: white;
              padding: 4px 12px;
              border-radius: 20px;
              font-size: 12px;
              font-weight: 600;
            }
            
            .section-badge.warning {
              background: #dc2626;
            }
            
            .data-table {
              width: 100%;
              border-collapse: collapse;
              font-size: 14px;
            }
            
            .data-table th {
              background: #f8fafc;
              color: #1e3a5f;
              font-weight: 600;
              padding: 12px;
              text-align: left;
              border-bottom: 2px solid #e2e8f0;
            }
            
            .data-table td {
              padding: 12px;
              border-bottom: 1px solid #e2e8f0;
            }
            
            .data-table tr:hover {
              background: #f8fafc;
            }
            
            .plan-row {
              background: #e6f0fa;
            }
            
            .actual-row {
              background: #d1fae5;
            }
            
            .plan-badge, .actual-badge {
              display: inline-block;
              padding: 4px 8px;
              border-radius: 4px;
              font-size: 12px;
              font-weight: 600;
            }
            
            .plan-badge {
              background: #1e3a5f;
              color: white;
            }
            
            .actual-badge {
              background: #059669;
              color: white;
            }
            
            .status-badge {
              display: inline-block;
              padding: 6px 12px;
              border-radius: 30px;
              font-size: 12px;
              font-weight: 600;
            }
            
            .status-badge.on-track {
              background: #d1fae5;
              color: #065f46;
            }
            
            .status-badge.in-progress {
              background: #dbeafe;
              color: #1e40af;
            }
            
            .status-badge.open {
              background: #fee2e2;
              color: #991b1b;
            }
            
            .status-badge.closed {
              background: #d1fae5;
              color: #065f46;
            }
            
            .issue-id {
              font-weight: 600;
              color: #1e3a5f;
            }
            
            .issue-title {
              font-weight: 500;
              max-width: 300px;
            }
            
            .function-tag {
              background: #e2e8f0;
              padding: 4px 8px;
              border-radius: 4px;
              font-size: 11px;
              font-weight: 600;
            }
            
            .summary-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 20px;
              margin-bottom: 20px;
            }
            
            .summary-item {
              text-align: center;
              padding: 15px;
              background: #f8fafc;
              border-radius: 12px;
            }
            
            .summary-label {
              display: block;
              font-size: 12px;
              color: #64748b;
              margin-bottom: 8px;
            }
            
            .summary-value {
              font-size: 20px;
              font-weight: bold;
            }
            
            .summary-value.approved {
              color: #1e3a5f;
            }
            
            .summary-value.utilized {
              color: #059669;
            }
            
            .summary-value.remaining {
              color: #dc2626;
            }
            
            .summary-value.percentage {
              color: #f59e0b;
            }
            
            .progress-bar {
              width: 100%;
              height: 8px;
              background: #e2e8f0;
              border-radius: 4px;
              overflow: hidden;
            }
            
            .progress-fill {
              height: 100%;
              background: linear-gradient(90deg, #1e3a5f, #2c5282);
              border-radius: 4px;
            }
            
            .resource-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 20px;
            }
            
            .resource-stat {
              text-align: center;
              padding: 20px;
              background: #f8fafc;
              border-radius: 12px;
            }
            
            .resource-stat.warning .stat-value {
              color: #dc2626;
            }
            
            .resource-stat.caution .stat-value {
              color: #f59e0b;
            }
            
            .stat-value {
              display: block;
              font-size: 28px;
              font-weight: bold;
              color: #1e3a5f;
              margin-bottom: 5px;
            }
            
            .stat-label {
              font-size: 12px;
              color: #64748b;
            }
            
            .quality-metrics {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 20px;
            }
            
            .metric-item {
              padding: 15px;
              background: #f8fafc;
              border-radius: 12px;
              text-align: center;
            }
            
            .metric-item.success .metric-value {
              color: #059669;
            }
            
            .metric-item.warning .metric-value {
              color: #f59e0b;
            }
            
            .metric-item.critical .metric-value {
              color: #dc2626;
            }
            
            .metric-label {
              display: block;
              font-size: 12px;
              color: #64748b;
              margin-bottom: 5px;
            }
            
            .metric-value {
              font-size: 24px;
              font-weight: bold;
              color: #1e3a5f;
            }
            
            .chart-card {
              background: white;
              border-radius: 12px;
              padding: 20px;
              margin-bottom: 20px;
              border: 1px solid #e2e8f0;
            }
            
            .chart-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 15px;
              padding-bottom: 10px;
              border-bottom: 2px solid #e2e8f0;
            }
            
            .chart-title {
              font-size: 16px;
              font-weight: 600;
              color: #1e3a5f;
            }
            
            .chart-axis-label {
              font-size: 12px;
              color: #64748b;
              background: #f1f5f9;
              padding: 4px 10px;
              border-radius: 20px;
            }
            
            .chart-body {
              min-height: 200px;
            }
            
            .bars-container {
              display: flex;
              align-items: flex-end;
              justify-content: center;
              gap: 30px;
              height: 200px;
            }
            
            .bar-wrapper {
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 10px;
            }
            
            .bar {
              width: 50px;
              border-radius: 8px 8px 0 0;
              position: relative;
              transition: height 0.3s;
            }
            
            .bar-value {
              position: absolute;
              top: -25px;
              left: 50%;
              transform: translateX(-50%);
              font-size: 12px;
              font-weight: 600;
              color: #1e293b;
            }
            
            .bar-label {
              font-size: 12px;
              font-weight: 600;
              color: #64748b;
            }
            
            .line-labels {
              display: flex;
              justify-content: space-around;
              margin-top: 10px;
              font-size: 12px;
              color: #64748b;
            }
            
            .pie-chart {
              display: flex;
              align-items: center;
              gap: 30px;
            }
            
            .pie-legend {
              flex: 1;
            }
            
            .pie-legend div {
              margin-bottom: 10px;
              display: flex;
              align-items: center;
              gap: 10px;
              font-size: 13px;
            }
            
            .legend-dot {
              width: 12px;
              height: 12px;
              border-radius: 50%;
              display: inline-block;
            }
            
            .section-footer {
              margin-top: 15px;
              padding-top: 15px;
              border-top: 1px solid #e2e8f0;
              font-size: 12px;
              color: #64748b;
              text-align: right;
            }
            
            .report-footer {
              background: #1e293b;
              color: #94a3b8;
              padding: 20px 30px;
              text-align: center;
              font-size: 12px;
            }
            
            .footer-links {
              display: flex;
              justify-content: center;
              gap: 20px;
              margin-top: 10px;
            }
            
            @media print {
              body {
                background: white;
                padding: 0;
              }
              
              .report-container {
                box-shadow: none;
                border-radius: 0;
              }
              
              .section-card {
                break-inside: avoid;
              }
            }
          </style>
        </head>
        <body>
          <div class="report-container">
            <div class="report-header">
              <div class="header-content">
                <div class="report-title">
                  ${activeProject?.name} Dashboard Report
                  <span class="project-badge">Project Overview</span>
                </div>
                
                <div class="report-meta">
                  <div class="meta-item">
                    <span class="meta-label">Generated:</span>
                    <span class="meta-value">${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</span>
                  </div>
                  <div class="meta-item">
                    <span class="meta-label">Report ID:</span>
                    <span class="meta-value">DR-${Math.floor(Math.random() * 10000)}</span>
                  </div>
                </div>
                
                <div class="sop-indicator">
                  <span>SOP Timeline:</span>
                  <span class="sop-days">${sopData[0].daysToGo} days to go</span>
                  <span class="sop-status">${sopData[0].status}</span>
                </div>
              </div>
            </div>
            
            <div class="content-section">
              ${selected.map(section => buildSectionHTML(section)).join('<div style="page-break-after: avoid; margin-bottom: 20px;"></div>')}
            </div>
            
            <div class="report-footer">
              <p>© ${new Date().getFullYear()} Project Dashboard. All rights reserved.</p>
              <p class="footer-links">
                <span>Confidential</span> • 
                <span>Generated for internal use</span> • 
                <span>Version 1.0</span>
              </p>
            </div>
          </div>
          
          <script>
            window.onload = function() { 
              setTimeout(() => { 
                window.print(); 
              }, 500); 
            };
          </script>
        </body>
      </html>
    `;

    const previewWindow = window.open('', '_blank');
    previewWindow.document.write(printContent);
    previewWindow.document.close();
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

            {/* Quick contacts */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#1e3a5f' }}>Quick Contacts:</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {emailContacts.map(contact => (
                  <button
                    key={contact.id}
                    onClick={() => addContactFromList(contact.email, 'email')}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#f0f2f5',
                      border: '1px solid #c0c0c0',
                      borderRadius: '20px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      color: '#1e3a5f',
                      fontWeight: '500'
                    }}
                  >
                    {contact.name}
                  </button>
                ))}
              </div>
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
            zIndex: 1
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
            <div style={{ marginBottom: '20px' }}>
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

            {/* Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
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
      </div>
    );
  };

  // Render chart based on type
  const renderChart = (chartId, chartType, isMaximized = false, trackerId = null) => {
    if (!activeProject) return null;

    const size = isMaximized ? { width: '100%', height: '400px' } : { width: '100%', height: '320px' };

    // Get the configured axes for this chart
    const axisConfig = axisConfigs[activeProject.id]?.[chartId];

    // If no chart data or configuration, show placeholder
    let chartData = [];
    const effectiveTrackerId = trackerId || (activeProject?.submodules && activeProject.submodules.length > 0 ? activeProject.submodules[0].trackerId : null);

    if (effectiveTrackerId && submoduleData[effectiveTrackerId] && submoduleData[effectiveTrackerId].rows) {
      chartData = submoduleData[effectiveTrackerId].rows;
    }

    if (!axisConfig || !axisConfig.xAxis || !axisConfig.yAxis || chartData.length === 0) {
      return (
        <div style={{ ...size, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb', border: '1px dashed #cbd5e1', borderRadius: '8px' }}>
          <span style={{ color: '#64748b', fontSize: '14px', marginBottom: '8px' }}>No Data or Configuration</span>
          <button
            onClick={() => toggleAxisSelector(chartId)}
            style={{ padding: '6px 12px', fontSize: '12px', backgroundColor: '#1e3a5f', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            Configure Axes
          </button>
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
          color: ['#3b82f6', '#f59e0b', '#10b981', '#6366f1'],
          series: [
            {
              name: axisConfig.yAxis,
              type: 'bar',
              barWidth: '60%',
              data: yValues,
              itemStyle: { borderRadius: [4, 4, 0, 0] }
            }
          ]
        };
        break;

      case 'line':
      case 'area':
        option = {
          ...baseOption,
          color: ['#f59e0b'],
          series: [
            {
              name: axisConfig.yAxis,
              type: 'line',
              smooth: true,
              data: yValues,
              areaStyle: chartType === 'area' ? { opacity: 0.3 } : undefined
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
          color: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b'],
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
              label: { show: false, position: 'center' },
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
          color: ['#8b5cf6'],
          series: [
            {
              name: axisConfig.yAxis,
              type: 'bar',
              barWidth: '99%',
              data: yValues,
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
        <ReactECharts option={option} style={{ height: isMaximized ? '350px' : '280px', width: '100%' }} />
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
      {/* Email Modal */}
      <EmailModal />

      {/* Simulate Modal */}
      <SimulateModal />

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
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
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
              backgroundColor: '#f8f9fa'
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
            <div style={{ padding: '0 25px 25px 25px' }}>
              {/* Milestones Section */}
              {visibleSections.milestones && (
                <div style={{ marginBottom: '35px' }}>
                  <h2 style={{
                    fontSize: '20px',
                    fontWeight: 'bold',
                    color: '#1e3a5f',
                    marginBottom: '15px',
                    marginTop: 0
                  }}>
                    Milestones
                  </h2>

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
                  <h2 style={{
                    fontSize: '20px',
                    fontWeight: 'bold',
                    color: '#1e3a5f',
                    marginBottom: '15px',
                    marginTop: 0
                  }}>
                    Critical Issues Summary
                  </h2>

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
                          borderBottom: '1px solid #2c4c7c'
                        }}>
                          Budget Summary
                        </div>
                        <div style={{ padding: '15px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', borderBottom: '1px dashed #e0e0e0', paddingBottom: '8px' }}>
                            <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#4b5563' }}>Approved:</span>
                            <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#1e3a5f' }}>{budgetData.approved}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', borderBottom: '1px dashed #e0e0e0', paddingBottom: '8px' }}>
                            <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#4b5563' }}>Utilized:</span>
                            <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#1e3a5f' }}>{budgetData.utilized}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', borderBottom: '1px dashed #e0e0e0', paddingBottom: '8px' }}>
                            <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#4b5563' }}>Balance:</span>
                            <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#1e3a5f' }}>{budgetData.balance}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#4b5563' }}>Utilization Outlook:</span>
                            <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#10b981' }}>{budgetData.outlook}</span>
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
                          borderBottom: '1px solid #2c4c7c'
                        }}>
                          Resource Summary
                        </div>
                        <div style={{ padding: '15px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', borderBottom: '1px dashed #e0e0e0', paddingBottom: '8px' }}>
                            <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#4b5563' }}>Deployed:</span>
                            <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#1e3a5f' }}>{resourceData.deployed}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', borderBottom: '1px dashed #e0e0e0', paddingBottom: '8px' }}>
                            <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#4b5563' }}>Utilized:</span>
                            <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#1e3a5f' }}>{resourceData.utilized}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', borderBottom: '1px dashed #e0e0e0', paddingBottom: '8px' }}>
                            <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#4b5563' }}>Shortage:</span>
                            <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#ef4444' }}>{resourceData.shortage}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#4b5563' }}>Under Utilized:</span>
                            <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#f59e0b' }}>{resourceData.underUtilized}</span>
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
                          borderBottom: '1px solid #2c4c7c'
                        }}>
                          Quality Summary
                        </div>
                        <div style={{ padding: '15px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', borderBottom: '1px dashed #e0e0e0', paddingBottom: '8px' }}>
                            <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#4b5563' }}>Total Issues:</span>
                            <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#1e3a5f' }}>{qualityData.totalIssues}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', borderBottom: '1px dashed #e0e0e0', paddingBottom: '8px' }}>
                            <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#4b5563' }}>Action Completed:</span>
                            <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#10b981' }}>{qualityData.actionCompleted}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', borderBottom: '1px dashed #e0e0e0', paddingBottom: '8px' }}>
                            <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#4b5563' }}>Open Issues:</span>
                            <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#ef4444' }}>{qualityData.openIssues}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#4b5563' }}>No of Critical Issues:</span>
                            <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#ef4444' }}>{qualityData.criticalIssues}</span>
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