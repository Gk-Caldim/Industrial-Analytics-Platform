import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Search, Edit, Trash2, X, Check, ChevronUp, ChevronDown, Filter, Download, Eye, EyeOff, Briefcase, DollarSign, Users, TrendingUp, CheckCircle, Clock, AlertTriangle, FileText, Calendar, CheckSquare, Square, Snowflake, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { getEmployees } from "../../utils/employeeApi";

const ProjectMaster = () => {
  // Fixed columns matching backend Project model
  const initialColumns = [
    { id: 'id', label: 'ID', visible: true, sortable: true, type: 'text', required: true },
    { id: 'name', label: 'Project Name', visible: true, sortable: true, type: 'text', required: true },
    { id: 'manager', label: 'Project Manager', visible: true, sortable: true, type: 'select', options: [], required: true },
    { id: 'status', label: 'Status', visible: true, sortable: true, type: 'select', required: true },
    { id: 'budget', label: 'Budget', visible: true, sortable: true, type: 'number', required: true },
    { id: 'timeline', label: 'Timeline', visible: true, sortable: true, type: 'text', required: false },
    { id: 'teamSize', label: 'Team Size', visible: true, sortable: true, type: 'number', required: false },
  ];

  // Status colors mapping
  const statusColors = {
    'Planning': 'bg-blue-100 text-blue-800',
    'In Progress': 'bg-yellow-100 text-yellow-800',
    'Completed': 'bg-green-100 text-green-800',
    'On Hold': 'bg-gray-100 text-gray-800',
    'Delayed': 'bg-red-100 text-red-800',
    'Active': 'bg-green-100 text-green-800',
    'Inactive': 'bg-red-100 text-red-800',
    'Pending': 'bg-gray-100 text-gray-800'
  };

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newProject, setNewProject] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [showDeletePrompt, setShowDeletePrompt] = useState(null);
  const [showColumnModal, setShowColumnModal] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const pageSizeOptions = [5, 10, 25, 50, 100];

  // Load columns from localStorage
  const [columns, setColumns] = useState(() => {
    const savedColumns = localStorage.getItem('project_columns_v2');
    return savedColumns ? JSON.parse(savedColumns) : initialColumns;
  });

  const [editingColumn, setEditingColumn] = useState(null);
  const [tempColumnName, setTempColumnName] = useState('');

  // Sorting state
  const [sortConfig, setSortConfig] = useState({ key: 'id', direction: 'ascending' });

  // State for Add Project modal
  const [showAddProjectModal, setShowAddProjectModal] = useState(false);

  // New state for checkboxes
  const [selectedProjects, setSelectedProjects] = useState([]);
  const [selectAll, setSelectAll] = useState(false);

  // New state for action prompts
  const [showBulkDeletePrompt, setShowBulkDeletePrompt] = useState(false);
  const [showBulkEditPrompt, setShowBulkEditPrompt] = useState(false);
  const [showColumnAddPrompt, setShowColumnAddPrompt] = useState(false);
  const [showExportConfirmPrompt, setShowExportConfirmPrompt] = useState(null);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [showDeleteColumnPrompt, setShowDeleteColumnPrompt] = useState(null);
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });

  // Freeze states - Updated to support multiple frozen rows and columns
  const [frozenRows, setFrozenRows] = useState([]);
  const [frozenColumns, setFrozenColumns] = useState([]);
  const [showFreezeColumnModal, setShowFreezeColumnModal] = useState(false);
  const [showFreezeRowModal, setShowFreezeRowModal] = useState(false);
  // Temporary states for modal selections
  const [tempFrozenRows, setTempFrozenRows] = useState([]);
  const [tempFrozenColumns, setTempFrozenColumns] = useState([]);

  const [validationErrors, setValidationErrors] = useState({});

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
  const API_URL = `${API_BASE_URL}/projects`;

  const fixedColumnIds = ['id', 'name', 'manager', 'status', 'budget', 'timeline', 'teamSize', 'created_at', 'updated_at'];

  // Helper to flatten API response
  const transformProjectFromApi = (apiProject) => {
    const { custom_fields, ...rest } = apiProject;
    return { ...rest, ...(custom_fields || {}) };
  };

  // Helper to nest custom fields for API request
  const transformProjectForSave = (projectData) => {
    const payload = {
      name: projectData.name,
      manager: projectData.manager,
      status: projectData.status || 'Planning',
      budget: parseFloat(projectData.budget) || 0,
      timeline: projectData.timeline || '',
      teamSize: parseInt(projectData.teamSize) || 0,
      custom_fields: {}
    };

    Object.keys(projectData).forEach(key => {
      if (!fixedColumnIds.includes(key) && key !== 'custom_fields' && key !== 'id') {
        payload.custom_fields[key] = projectData[key];
      }
    });

    return payload;
  };

  // Show notification
  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: '', type: '' });
    }, 3000);
  };

  // Fetch data on mount
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      await fetchProjects();
      await fetchEmployees();
    } catch (err) {
      console.error("Error loading data:", err);
      setError("Failed to load data. Please try again.");
      showNotification('Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = () => {
    getEmployees()
      .then(res => {
        const employeeNames = res.data.map(e => e.name);
        setColumns(prev => prev.map(col => {
          if (col.id === 'manager') {
            return { ...col, options: employeeNames };
          }
          return col;
        }));
      })
      .catch(err => console.error('Error fetching employees:', err));
  };

  const fetchProjects = async () => {
    try {
      const res = await axios.get(API_URL);
      const flattenedProjects = res.data.map(transformProjectFromApi);
      setProjects(flattenedProjects);
    } catch (err) {
      console.error('Error fetching projects:', err);
      throw err;
    }
  };

  // Refresh function - resets selections and freezes
  const handleRefresh = async () => {
    setSelectedProjects([]);
    setSelectAll(false);
    setFrozenRows([]);
    setFrozenColumns([]);
    setTempFrozenRows([]);
    setTempFrozenColumns([]);
    setCurrentPage(1);
    await fetchData();
    showNotification('Data refreshed successfully');
  };

  // Save columns to localStorage
  useEffect(() => {
    localStorage.setItem('project_columns_v2', JSON.stringify(columns));
  }, [columns]);

  // Checkbox Functions
  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedProjects([]);
      setSelectAll(false);
    } else {
      const allVisibleIds = paginatedProjects.map(proj => proj.id);
      setSelectedProjects(allVisibleIds);
      setSelectAll(true);
    }
  };

  const toggleProjectSelection = (projectId) => {
    setSelectedProjects(prev => {
      if (prev.includes(projectId)) {
        const newSelection = prev.filter(id => id !== projectId);
        setSelectAll(false);
        return newSelection;
      } else {
        const newSelection = [...prev, projectId];
        const allVisibleIds = paginatedProjects.map(proj => proj.id);
        if (newSelection.length === allVisibleIds.length && allVisibleIds.length > 0) {
          setSelectAll(true);
        }
        return newSelection;
      }
    });
  };

  // Bulk edit function - Modified to handle single row only
  const handleBulkEdit = () => {
    if (selectedProjects.length === 0) {
      showNotification('Please select at least one project to edit', 'error');
      return;
    }

    if (selectedProjects.length > 1) {
      showNotification('Only one row can be edited at a time', 'error');
      return;
    }

    setShowBulkEditPrompt({
      show: true,
      count: selectedProjects.length
    });
  };

  const confirmBulkEdit = () => {
    if (selectedProjects.length === 1) {
      const project = projects.find(proj => proj.id === selectedProjects[0]);
      if (project) {
        startEditing(project);
      }
    }
    setShowBulkEditPrompt({ show: false, count: 0 });
  };

  // Bulk delete function
  const handleBulkDelete = () => {
    if (selectedProjects.length === 0) {
      showNotification('Please select at least one project to delete', 'error');
      return;
    }

    setShowBulkDeletePrompt({
      show: true,
      count: selectedProjects.length
    });
  };

  const confirmBulkDelete = async () => {
    const count = selectedProjects.length;
    try {
      for (const id of selectedProjects) {
        await axios.delete(`${API_URL}/${id}`);
      }
      await fetchProjects();
      setSelectedProjects([]);
      setSelectAll(false);
      setCurrentPage(1);
      setShowBulkDeletePrompt({ show: false, count: 0 });
      showNotification(`${count} projects deleted successfully`);
    } catch (err) {
      console.error(err);
      showNotification('Error deleting projects', 'error');
    }
  };

  // Column editing functions
  const startEditColumn = (columnId, currentLabel) => {
    setEditingColumn(columnId);
    setTempColumnName(currentLabel);
  };

  const saveEditColumn = (columnId) => {
    if (tempColumnName.trim()) {
      setColumns(columns.map(col =>
        col.id === columnId ? { ...col, label: tempColumnName } : col
      ));
      setEditingColumn(null);
      setTempColumnName('');
      showNotification('Column updated successfully');
    }
  };

  const cancelEditColumn = () => {
    setEditingColumn(null);
    setTempColumnName('');
  };

  const handleDeleteColumn = (columnId) => {
    const column = columns.find(col => col.id === columnId);
    const isFixedColumn = ['id', 'name', 'manager', 'status', 'budget', 'timeline', 'teamSize'].includes(columnId);

    if (isFixedColumn) {
      setShowDeleteColumnPrompt({
        id: columnId,
        title: 'Cannot Delete Column',
        message: `Cannot delete fixed column: ${column.label}. Fixed columns are required for the Project Master.`,
        type: 'warning',
        columnLabel: column.label
      });
      return;
    }

    setShowDeleteColumnPrompt({
      id: columnId,
      title: 'Delete Column',
      columnLabel: column.label,
      type: 'delete'
    });
  };

  const confirmDeleteColumn = () => {
    if (!showDeleteColumnPrompt) return;

    const columnId = showDeleteColumnPrompt.id;
    setColumns(columns.filter(col => col.id !== columnId));
    setShowDeleteColumnPrompt(null);
    setShowColumnModal(false);
    showNotification('Column deleted successfully');
  };

  // Sorting
  const handleSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') direction = 'descending';
    setSortConfig({ key, direction });
    setCurrentPage(1);
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return <ChevronUp className="h-3 w-3 sm:h-4 sm:w-4 opacity-30" />;
    return sortConfig.direction === 'ascending' ? <ChevronUp className="h-3 w-3 sm:h-4 sm:w-4" /> : <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4" />;
  };

  // Validation
  const validateProjectForm = (project) => {
    const errors = {};
    for (const col of columns) {
      if (col.required && !project[col.id]?.toString().trim()) {
        errors[col.id] = `${col.label} is required`;
      }
      if (col.type === 'number') {
        const numValue = parseFloat(project[col.id]);
        if (col.required && (isNaN(numValue) || numValue < 0)) {
          errors[col.id] = `${col.label} must be a valid positive number`;
        }
      }
    }
    return errors;
  };

  // Filter projects
  const filteredProjects = projects.filter(proj => {
    const matchesSearch = Object.values(proj).some(value =>
      String(value).toLowerCase().includes(searchTerm.toLowerCase())
    );

    return matchesSearch;
  });

  // Sort projects
  const sortedProjects = useMemo(() => {
    if (!sortConfig.key) return filteredProjects;

    return [...filteredProjects].sort((a, b) => {
      const aVal = a[sortConfig.key] || '';
      const bVal = b[sortConfig.key] || '';

      if (aVal < bVal) return sortConfig.direction === 'ascending' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'ascending' ? 1 : -1;
      return 0;
    });
  }, [filteredProjects, sortConfig]);

  // Pagination logic
  const totalItems = sortedProjects.length;
  const totalPages = Math.ceil(totalItems / pageSize);

  const paginatedProjects = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return sortedProjects.slice(startIndex, endIndex);
  }, [sortedProjects, currentPage, pageSize]);

  // Handle page change
  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    setSelectedProjects([]);
    setSelectAll(false);
  };

  // Handle page size change
  const handlePageSizeChange = (newSize) => {
    setPageSize(newSize);
    setCurrentPage(1);
    setSelectedProjects([]);
    setSelectAll(false);
  };

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      let startPage = Math.max(1, currentPage - 2);
      let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

      if (endPage - startPage < maxVisiblePages - 1) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
      }

      for (let i = startPage; i <= endPage; i++) {
        pageNumbers.push(i);
      }
    }

    return pageNumbers;
  };

  // Handle Add Project button click
  const handleAddProjectClick = () => {
    setShowAddProjectModal(true);
    setValidationErrors({});
    const initialProject = {};
    columns.forEach(col => {
      if (col.id === 'status') {
        initialProject[col.id] = 'Planning';
      } else if (col.type === 'number') {
        initialProject[col.id] = '0';
      } else {
        initialProject[col.id] = '';
      }
    });
    setNewProject(initialProject);
  };

  // Handle new project input change
  const handleNewProjectChange = (field, value) => {
    setNewProject({ ...newProject, [field]: value });
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Save new project
  const saveNewProject = async () => {
    const errors = validateProjectForm(newProject);
    setValidationErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    try {
      const payload = transformProjectForSave(newProject);
      await axios.post(API_URL, payload);
      await fetchProjects();
      setShowAddProjectModal(false);
      setValidationErrors({});
      setCurrentPage(1);
      showNotification('Project added successfully');
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.detail || err.message;
      showNotification('Error saving project: ' + msg, 'error');
    }
  };

  // Cancel adding new project
  const cancelNewProject = () => {
    setShowAddProjectModal(false);
    setValidationErrors({});
  };

  // Show delete prompt
  const showDeleteConfirmation = (id, name) => {
    setShowDeletePrompt({ id, name });
  };

  // Confirm delete project
  const confirmDeleteProject = async () => {
    if (showDeletePrompt) {
      try {
        await axios.delete(`${API_URL}/${showDeletePrompt.id}`);
        await fetchProjects();
        setShowDeletePrompt(null);
        if (paginatedProjects.length === 1 && currentPage > 1) {
          setCurrentPage(currentPage - 1);
        }
        showNotification('Project deleted successfully');
      } catch (err) {
        console.error(err);
        const msg = err.response?.data?.detail || err.message;
        showNotification('Error deleting project: ' + msg, 'error');
      }
    }
  };

  // Cancel delete
  const cancelDelete = () => {
    setShowDeletePrompt(null);
  };

  // Start editing project
  const startEditing = (project) => {
    setEditForm({
      ...project,
      id: project.id
    });
    setEditingId(project.id);
    setValidationErrors({});
  };

  // Save project edit
  const saveEdit = async () => {
    const errors = validateProjectForm(editForm);
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    try {
      const payload = transformProjectForSave(editForm);
      await axios.put(`${API_URL}/${editingId}`, payload);
      await fetchProjects();
      setEditingId(null);
      setEditForm({});
      setValidationErrors({});
      setSelectedProjects([]);
      setSelectAll(false);
      showNotification('Project updated successfully');
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.detail || err.message;
      showNotification('Error updating project: ' + msg, 'error');
    }
  };

  // Cancel project edit
  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
    setValidationErrors({});
  };

  // Handle edit form change
  const handleEditFormChange = (field, value) => {
    setEditForm({ ...editForm, [field]: value });
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Add new column
  const handleAddColumn = () => {
    if (!newColumnName.trim()) {
      showNotification('Please enter a column name', 'error');
      return;
    }

    setShowColumnAddPrompt({
      show: true,
      columnName: newColumnName
    });
  };

  const confirmAddColumn = () => {
    if (newColumnName.trim()) {
      const newColumnId = newColumnName.toLowerCase().replace(/\s+/g, '_');

      if (columns.find(col => col.id === newColumnId)) {
        showNotification('Column with this name already exists', 'error');
        return;
      }

      const newColumn = {
        id: newColumnId,
        label: newColumnName,
        visible: true,
        sortable: true,
        type: 'text',
        required: false
      };

      setColumns([...columns, newColumn]);
      setNewColumnName('');
      setShowColumnAddPrompt({ show: false, columnName: '' });
      setShowColumnModal(false);
      showNotification('Column added successfully');
    }
  };

  // Toggle column visibility
  const toggleColumnVisibility = (columnId) => {
    const updatedColumns = columns.map(col =>
      col.id === columnId ? { ...col, visible: !col.visible } : col
    );
    setColumns(updatedColumns);
  };

  // Export functions
  const handleExportClick = (format) => {
    if (sortedProjects.length === 0) {
      showNotification('No data to export', 'error');
      return;
    }

    setShowExportConfirmPrompt({
      show: true,
      format: format,
      count: sortedProjects.length
    });
  };

  const handleExport = (format) => {
    const dataToExport = sortedProjects.map(proj => {
      const row = {};
      columns.forEach(col => {
        row[col.label] = proj[col.id] || '';
      });
      return row;
    });

    let content, mimeType, filename;

    switch (format) {
      case 'excel':
        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Projects");
        XLSX.writeFile(wb, "projects.xlsx");
        setShowExportDropdown(false);
        showNotification('Export to Excel completed successfully');
        return;
      case 'csv':
        content = convertToCSV(dataToExport);
        mimeType = 'text/csv';
        filename = 'projects.csv';
        break;
      case 'json':
        content = JSON.stringify(dataToExport, null, 2);
        mimeType = 'application/json';
        filename = 'projects.json';
        break;
      case 'pdf':
        exportToPDF(dataToExport);
        setShowExportDropdown(false);
        showNotification('Export to PDF completed successfully');
        return;
    }

    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    setShowExportDropdown(false);
    showNotification(`Export to ${format.toUpperCase()} completed successfully`);
    setShowExportConfirmPrompt(null);
  };

  const exportToPDF = (data) => {
    const doc = new jsPDF();
    const tableColumn = columns.map(col => col.label);
    const tableRows = data.map(proj =>
      columns.map(col => proj[col.label] || '')
    );

    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [41, 128, 185] }
    });

    doc.save("projects.pdf");
  };

  const convertToCSV = (data) => {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(','),
      ...data.map(row =>
        headers.map(header => {
          const cell = row[header];
          return typeof cell === 'string' && cell.includes(',') ? `"${cell}"` : cell;
        }).join(',')
      )
    ];

    return csvRows.join('\n');
  };

  // Freeze functions - Updated to pre-select based on selected projects/columns
  const toggleFreezeRow = () => {
    // Get the actual row indices of selected projects on current page
    const selectedRowIndices = paginatedProjects
      .map((proj, index) => {
        const actualRowIndex = (currentPage - 1) * pageSize + index;
        return selectedProjects.includes(proj.id) ? actualRowIndex : null;
      })
      .filter(index => index !== null);

    // Combine with existing frozen rows for initial selection
    setTempFrozenRows([...new Set([...frozenRows, ...selectedRowIndices])].sort((a, b) => a - b));
    setShowFreezeRowModal(true);
  };

  const toggleFreezeColumn = () => {
    // Get column indices of visible columns
    const visibleColumnIndices = visibleColumns.map(col =>
      columns.findIndex(c => c.id === col.id)
    );

    // Start with existing frozen columns
    setTempFrozenColumns([...frozenColumns]);
    setShowFreezeColumnModal(true);
  };

  const handleFreezeRows = () => {
    setFrozenRows(tempFrozenRows);
    setShowFreezeRowModal(false);

    if (tempFrozenRows.length > 0) {
      showNotification(`${tempFrozenRows.length} row(s) frozen`);
    } else {
      showNotification('All rows unfrozen');
    }
  };

  const handleFreezeColumns = () => {
    setFrozenColumns(tempFrozenColumns);
    setShowFreezeColumnModal(false);

    if (tempFrozenColumns.length > 0) {
      showNotification(`${tempFrozenColumns.length} column(s) frozen`);
    } else {
      showNotification('All columns unfrozen');
    }
  };

  const isRowFrozen = (rowIndex) => {
    return frozenRows.includes(rowIndex);
  };

  const isColumnFrozen = (colIndex) => {
    return frozenColumns.includes(colIndex);
  };

  // Get the left position for frozen columns
  const getFrozenColumnLeft = (colIndex) => {
    if (!isColumnFrozen(colIndex)) return 'auto';

    const checkboxWidth = 64;

    const sortedFrozenColumns = [...frozenColumns].sort((a, b) => a - b);
    const positionIndex = sortedFrozenColumns.indexOf(colIndex);

    if (positionIndex === -1) return 'auto';

    let leftOffset = 0;
    for (let i = 0; i < positionIndex; i++) {
      const prevColIndex = sortedFrozenColumns[i];
      if (prevColIndex === 0) {
        leftOffset += checkboxWidth;
      } else {
        leftOffset += 160;
      }
    }

    return `${leftOffset}px`;
  };

  // Get the top position for frozen rows
  const getFrozenRowTop = (rowIndex) => {
    if (!isRowFrozen(rowIndex)) return 'auto';

    const headerHeight = 42;
    const rowHeight = 53;

    const sortedFrozenRows = [...frozenRows].sort((a, b) => a - b);
    const positionIndex = sortedFrozenRows.indexOf(rowIndex);

    if (positionIndex === -1) return 'auto';

    let topOffset = headerHeight;
    for (let i = 0; i < positionIndex; i++) {
      topOffset += rowHeight;
    }

    return `${topOffset}px`;
  };

  // Render input fields
  const renderInput = (col, value, onChange, error, isModal = false) => {
    const inputClass = `w-full px-3 py-2 text-sm border ${error ? 'border-red-500' : 'border-gray-300'} rounded focus:outline-none focus:ring-1 focus:ring-black`;

    const statusOptions = ['Planning', 'In Progress', 'Completed', 'On Hold', 'Delayed'];

    if (col.id === 'status' || col.type === 'select') return (
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">{col.label} {col.required && <span className="text-red-500">*</span>}</label>
        <select
          value={value || 'Planning'}
          onChange={e => onChange(col.id, e.target.value)}
          className={inputClass}
        >
          {statusOptions.map(option => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
        {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
      </div>
    );
    if (col.type === 'number') return (
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">{col.label} {col.required && <span className="text-red-500">*</span>}</label>
        <input
          type="number"
          value={value || ''}
          onChange={e => onChange(col.id, e.target.value)}
          className={inputClass}
          min="0"
          step={col.id === 'budget' ? "1000" : "1"}
          placeholder={`Enter ${col.label.toLowerCase()}`}
        />
        {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
      </div>
    );
    return (
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">{col.label} {col.required && <span className="text-red-500">*</span>}</label>
        <input
          type="text"
          value={value || ''}
          onChange={e => onChange(col.id, e.target.value)}
          className={inputClass}
          placeholder={`Enter ${col.label.toLowerCase()}`}
        />
        {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
      </div>
    );
  };

  // Render cell content
  const renderCellContent = (col, value) => {
    if (col.id === 'status') {
      return (
        <span className={`px-2 py-1 rounded-full text-sm whitespace-nowrap ${statusColors[value] || 'bg-gray-100 text-gray-800'}`}>
          {value || '-'}
        </span>
      );
    }
    if (col.id === 'budget') {
      return `$${(parseFloat(value) || 0).toLocaleString()}`;
    }
    return value || '-';
  };

  const visibleColumns = columns.filter(col => col.visible);

  return (
    <div className="flex flex-col h-full bg-white flex-1 overflow-hidden relative">
      {/* Custom tooltip styles - smaller and more compact */}
      <style>{`
        /* Tooltip styles */
        .tooltip {
          position: relative;
        }

        .tooltip:hover:after {
          content: attr(data-tooltip);
          position: absolute;
          bottom: 100%;
          left: 50%;
          transform: translateX(-50%);
          margin-bottom: 4px;
          padding: 4px 8px;
          background-color: #1f2937;
          color: white;
          font-size: 11px;
          white-space: nowrap;
          border-radius: 4px;
          z-index: 10000;
          pointer-events: none;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          line-height: 1.2;
          font-weight: normal;
        }

        /* Freeze styles - subtle blue background to indicate frozen state */
        .frozen-row {
          position: sticky !important;
          z-index: 20;
          background: #f0f9ff !important;
          border-bottom: 2px solid #0284c7;
        }

        .frozen-column {
          position: sticky !important;
          z-index: 15;
          background: #f0f9ff !important;
          border-right: 2px solid #0284c7;
        }

        .frozen-row .frozen-column {
          z-index: 25;
          background: #e0f2fe !important;
        }

        th.frozen-column {
          z-index: 35;
          background: linear-gradient(135deg, #e0f2fe, #dbeafe) !important;
        }

        .freeze-indicator {
          background: #e0f2fe;
          color: #0369a1;
          border: 1px solid #0284c7;
        }

        table {
          border-collapse: separate;
          border-spacing: 0;
          width: 100%;
        }

        thead {
          position: sticky;
          top: 0;
          z-index: 30;
        }

        th {
          position: sticky;
          top: 0;
          background: #f8fafc;
          color: #475569;
          font-weight: 600;
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          z-index: 30;
          border-bottom: 1px solid #e2e8f0;
          border-right: 1px solid #e2e8f0;
        }

        td {
          border-bottom: 1px solid #e2e8f0;
          border-right: 1px solid #e2e8f0;
        }

        th:last-child, td:last-child {
          border-right: none;
        }

        tbody tr:hover td {
          background-color: #f8fafc;
        }

        /* Ensure proper stacking of frozen elements */
        .frozen-column {
          z-index: 15;
        }

        th.frozen-column {
          z-index: 35;
        }

        tr.frozen-row td {
          position: sticky !important;
          z-index: 20;
          background: #f0f9ff !important;
        }

        tr.frozen-row td.frozen-column {
          z-index: 25;
          background: #e0f2fe !important;
        }

        /* Fix for multiple frozen rows */
        tbody tr.frozen-row {
          position: sticky;
        }

        tbody tr.frozen-row:first-of-type td {
          border-top: 2px solid #0284c7;
        }

        tbody tr.frozen-row:last-of-type td {
          border-bottom: 2px solid #0284c7;
        }
      `}</style>

      <>
        {/* Notification Banner */}
        {notification.show && (
          <div className={`fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-lg z-50 ${notification.type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' :
              notification.type === 'error' ? 'bg-red-100 text-red-800 border border-red-200' :
                'bg-blue-100 text-blue-800 border border-blue-200'
            }`}>
            <div className="flex items-center">
              <span className="text-sm font-medium">{notification.message}</span>
              <button
                onClick={() => setNotification({ show: false, message: '', type: '' })}
                className="ml-4 text-gray-500 hover:text-gray-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Delete Project Prompt */}
        {showDeletePrompt && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-4 sm:p-6 max-w-sm w-full mx-4">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h3 className="font-medium text-gray-900 text-sm sm:text-base">Confirm Delete</h3>
                <button onClick={cancelDelete} className="p-1 text-gray-400 hover:text-gray-600">
                  <X className="h-4 w-4 sm:h-5 sm:w-5" />
                </button>
              </div>
              <div className="mb-4">
                <p className="text-xs sm:text-sm text-gray-600">Delete project <span className="font-medium">{showDeletePrompt.name}</span>?</p>
                <p className="text-xs text-red-600 mt-1">This action cannot be undone.</p>
              </div>
              <div className="flex justify-end space-x-2">
                <button onClick={cancelDelete} className="px-3 py-1.5 text-xs sm:text-sm border border-gray-300 rounded hover:bg-gray-50">Cancel</button>
                <button onClick={confirmDeleteProject} className="px-3 py-1.5 text-xs sm:text-sm bg-red-600 text-white rounded hover:bg-red-700">Delete</button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Column Prompt */}
        {showDeleteColumnPrompt && (
          <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-[60]">
            <div className="bg-white rounded-lg p-4 sm:p-6 max-w-sm w-full mx-4">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h3 className="font-medium text-gray-900 text-sm sm:text-base">
                  {showDeleteColumnPrompt.title}
                </h3>
                <button
                  onClick={() => setShowDeleteColumnPrompt(null)}
                  className="p-1 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4 sm:h-5 sm:w-5" />
                </button>
              </div>

              <div className="mb-4">
                {showDeleteColumnPrompt.type === 'warning' ? (
                  <p className="text-xs sm:text-sm text-gray-600">
                    {showDeleteColumnPrompt.message}
                  </p>
                ) : (
                  <>
                    <p className="text-xs sm:text-sm text-gray-600">
                      Are you sure you want to delete column
                      <span className="font-medium">
                        {" "}{showDeleteColumnPrompt.columnLabel}
                      </span>?
                    </p>
                    <p className="text-xs text-red-600 mt-1">
                      This action cannot be undone.
                    </p>
                  </>
                )}
              </div>

              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setShowDeleteColumnPrompt(null)}
                  className="px-3 py-1.5 text-xs sm:text-sm border border-gray-300 rounded hover:bg-gray-50"
                >
                  {showDeleteColumnPrompt.type === 'warning' ? 'OK' : 'Cancel'}
                </button>

                {showDeleteColumnPrompt.type === 'delete' && (
                  <button
                    onClick={confirmDeleteColumn}
                    className="px-3 py-1.5 text-xs sm:text-sm bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Bulk Delete Prompt */}
        {showBulkDeletePrompt.show && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-4 sm:p-6 max-w-sm w-full mx-4">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h3 className="font-medium text-gray-900 text-sm sm:text-base">Confirm Bulk Delete</h3>
                <button onClick={() => setShowBulkDeletePrompt({ show: false, count: 0 })} className="p-1 text-gray-400 hover:text-gray-600">
                  <X className="h-4 w-4 sm:h-5 sm:w-5" />
                </button>
              </div>
              <div className="mb-4">
                <p className="text-xs sm:text-sm text-gray-600">
                  Are you sure you want to delete {showBulkDeletePrompt.count} selected project{showBulkDeletePrompt.count > 1 ? 's' : ''}?
                </p>
                <p className="text-xs text-red-600 mt-1">This action cannot be undone.</p>
              </div>
              <div className="flex justify-end space-x-2">
                <button onClick={() => setShowBulkDeletePrompt({ show: false, count: 0 })} className="px-3 py-1.5 text-xs sm:text-sm border border-gray-300 rounded hover:bg-gray-50">Cancel</button>
                <button onClick={confirmBulkDelete} className="px-3 py-1.5 text-xs sm:text-sm bg-red-600 text-white rounded hover:bg-red-700">Delete</button>
              </div>
            </div>
          </div>
        )}

        {/* Bulk Edit Prompt */}
        {showBulkEditPrompt.show && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-4 sm:p-6 max-w-sm w-full mx-4">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h3 className="font-medium text-gray-900 text-sm sm:text-base">Confirm Bulk Edit</h3>
                <button onClick={() => setShowBulkEditPrompt({ show: false, count: 0 })} className="p-1 text-gray-400 hover:text-gray-600">
                  <X className="h-4 w-4 sm:h-5 sm:w-5" />
                </button>
              </div>
              <div className="mb-4">
                <p className="text-xs sm:text-sm text-gray-600">
                  Are you sure you want to edit {showBulkEditPrompt.count} selected project{showBulkEditPrompt.count > 1 ? 's' : ''}?
                </p>
              </div>
              <div className="flex justify-end space-x-2">
                <button onClick={() => setShowBulkEditPrompt({ show: false, count: 0 })} className="px-3 py-1.5 text-xs sm:text-sm border border-gray-300 rounded hover:bg-gray-50">Cancel</button>
                <button onClick={confirmBulkEdit} className="px-3 py-1.5 text-xs sm:text-sm bg-blue-600 text-white rounded hover:bg-blue-700">Edit</button>
              </div>
            </div>
          </div>
        )}

        {/* Add Column Prompt */}
        {showColumnAddPrompt.show && (
          <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-[60]">
            <div className="bg-white rounded-lg p-4 sm:p-6 max-w-sm w-full mx-4">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h3 className="font-medium text-gray-900 text-sm sm:text-base">Add New Column</h3>
                <button onClick={() => setShowColumnAddPrompt({ show: false, columnName: '' })} className="p-1 text-gray-400 hover:text-gray-600">
                  <X className="h-4 w-4 sm:h-5 sm:w-5" />
                </button>
              </div>
              <div className="mb-4">
                <p className="text-xs sm:text-sm text-gray-600">
                  Are you sure you want to add column "<span className="font-medium">{showColumnAddPrompt.columnName}</span>"?
                </p>
              </div>
              <div className="flex justify-end space-x-2">
                <button onClick={() => setShowColumnAddPrompt({ show: false, columnName: '' })} className="px-3 py-1.5 text-xs sm:text-sm border border-gray-300 rounded hover:bg-gray-50">Cancel</button>
                <button onClick={confirmAddColumn} className="px-3 py-1.5 text-xs sm:text-sm bg-blue-600 text-white rounded hover:bg-blue-700">Add Column</button>
              </div>
            </div>
          </div>
        )}

        {/* Export Confirmation Prompt */}
        {showExportConfirmPrompt?.show && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-4 sm:p-6 max-w-sm w-full mx-4">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h3 className="font-medium text-gray-900 text-sm sm:text-base">Confirm Export</h3>
                <button onClick={() => setShowExportConfirmPrompt(null)} className="p-1 text-gray-400 hover:text-gray-600">
                  <X className="h-4 w-4 sm:h-5 sm:w-5" />
                </button>
              </div>
              <div className="mb-4">
                <p className="text-xs sm:text-sm text-gray-600">
                  Export {showExportConfirmPrompt.count} project{showExportConfirmPrompt.count > 1 ? 's' : ''} as {showExportConfirmPrompt.format.toUpperCase()}?
                </p>
              </div>
              <div className="flex justify-end space-x-2">
                <button onClick={() => setShowExportConfirmPrompt(null)} className="px-3 py-1.5 text-xs sm:text-sm border border-gray-300 rounded hover:bg-gray-50">Cancel</button>
                <button onClick={() => {
                  handleExport(showExportConfirmPrompt.format);
                  setShowExportConfirmPrompt(null);
                }} className="px-3 py-1.5 text-xs sm:text-sm bg-blue-600 text-white rounded hover:bg-blue-700">Export</button>
              </div>
            </div>
          </div>
        )}

        {/* Freeze Column Modal */}
        {showFreezeColumnModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-4 sm:p-6 max-w-md w-full mx-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-gray-900 text-sm sm:text-base">
                  <span className="bg-gray-200 px-2 py-0.5 rounded">
                    Freeze Columns
                  </span>
                </h3>
                <button
                  onClick={() => setShowFreezeColumnModal(false)}
                  className="p-1 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4 sm:h-5 sm:w-5" />
                </button>
              </div>

              <div className="mb-4">
                <p className="text-xs text-gray-600 mb-3">Select columns to freeze (they will remain visible while scrolling horizontally)</p>
                <div className="space-y-2 max-h-60 overflow-y-auto">

                  {visibleColumns.map((column) => {
                    const actualColumnIndex = columns.findIndex(col => col.id === column.id);
                    return (
                      <div key={column.id} className="flex items-center p-2 border border-gray-200 rounded">
                        <input
                          type="checkbox"
                          id={`freeze-${column.id}`}
                          checked={tempFrozenColumns.includes(actualColumnIndex)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setTempFrozenColumns([...tempFrozenColumns, actualColumnIndex].sort((a, b) => a - b));
                            } else {
                              setTempFrozenColumns(tempFrozenColumns.filter(idx => idx !== actualColumnIndex));
                            }
                          }}
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mr-3"
                        />
                        <label htmlFor={`freeze-${column.id}`} className="text-sm text-gray-700 cursor-pointer flex-1">
                          {column.label}
                        </label>
                        {tempFrozenColumns.includes(actualColumnIndex) && (
                          <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">Frozen</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setShowFreezeColumnModal(false)}
                  className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleFreezeColumns}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Apply Freeze
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Freeze Row Modal */}
        {showFreezeRowModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-4 sm:p-6 max-w-md w-full mx-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-gray-900 text-sm sm:text-base">
                  <span className="bg-gray-200 px-2 py-0.5 rounded">
                    Freeze Rows
                  </span>
                </h3>
                <button
                  onClick={() => setShowFreezeRowModal(false)}
                  className="p-1 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4 sm:h-5 sm:w-5" />
                </button>
              </div>

              <div className="mb-4">
                <p className="text-xs text-gray-600 mb-3">Select rows to freeze (they will remain visible while scrolling vertically)</p>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {paginatedProjects.map((proj, index) => {
                    const actualRowIndex = (currentPage - 1) * pageSize + index;
                    return (
                      <div key={proj.id} className="flex items-center p-2 border border-gray-200 rounded">
                        <input
                          type="checkbox"
                          id={`freeze-row-${proj.id}`}
                          checked={tempFrozenRows.includes(actualRowIndex)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setTempFrozenRows([...tempFrozenRows, actualRowIndex].sort((a, b) => a - b));
                            } else {
                              setTempFrozenRows(tempFrozenRows.filter(idx => idx !== actualRowIndex));
                            }
                          }}
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mr-3"
                        />
                        <label htmlFor={`freeze-row-${proj.id}`} className="text-sm text-gray-700 cursor-pointer flex-1">
                          Row {actualRowIndex + 1}: {proj.name} ({proj.id})
                        </label>
                        {tempFrozenRows.includes(actualRowIndex) && (
                          <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">Frozen</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setShowFreezeRowModal(false)}
                  className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleFreezeRows}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Apply Freeze
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Column Management Modal */}
        {showColumnModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-4 sm:p-6 max-w-md w-full mx-4">
              <div className="flex items-center justify-between mb-4">
                <div></div>
                <button onClick={() => setShowColumnModal(false)} className="p-1 text-gray-400 hover:text-gray-600">
                  <X className="h-4 w-4 sm:h-5 sm:w-5" />
                </button>
              </div>

              <div className="mb-4 p-3 rounded">
                <h3 className="font-medium text-gray-900 text-sm sm:text-base -mt-5 mb-2">
                  <span className="bg-gray-200 px-2 py-0.5 rounded">
                    Add New Custom Column
                  </span>
                </h3>

                <div className="flex flex-col sm:flex-row gap-2 mt-2">
                  <input
                    type="text"
                    placeholder="Column name (e.g., Start Date)"
                    value={newColumnName}
                    onChange={(e) => setNewColumnName(e.target.value)}
                    className="flex-grow px-3 py-2 text-xs sm:text-sm border border-gray-300 rounded"
                  />
                  <button
                    onClick={handleAddColumn}
                    className="px-3 py-2 text-xs sm:text-sm bg-blue-600 text-white rounded hover:bg-blue-700 whitespace-nowrap"
                  >
                    Add Column
                  </button>
                </div>
              </div>

              <div className="mb-4">
                <h4 className="text-xs sm:text-sm font-medium text-gray-900 mb-2">Available Columns</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {columns.map((column) => {
                    const isFixedColumn = ['id', 'name', 'manager', 'status', 'budget', 'timeline', 'teamSize'].includes(column.id);
                    const isEditing = editingColumn === column.id;

                    return (
                      <div key={column.id} className="flex items-center justify-between p-2 border border-gray-200 rounded">
                        <div className="flex items-center space-x-2">
                          {isEditing ? (
                            <div className="flex items-center space-x-2">
                              <input
                                type="text"
                                value={tempColumnName}
                                onChange={(e) => setTempColumnName(e.target.value)}
                                className="px-2 py-1 text-xs sm:text-sm border border-gray-300 rounded"
                              />
                              <button
                                onClick={() => saveEditColumn(column.id)}
                                className="p-1 text-green-600 hover:text-green-800"
                                title="Save"
                              >
                                <Check className="h-3 w-3 sm:h-4 sm:w-4" />
                              </button>
                              <button
                                onClick={cancelEditColumn}
                                className="p-1 text-red-600 hover:text-red-800"
                                title="Cancel"
                              >
                                <X className="h-3 w-3 sm:h-4 sm:w-4" />
                              </button>
                            </div>
                          ) : (
                            <>
                              <span className="">{column.label}</span>
                            </>
                          )}
                        </div>

                        <div className="flex items-center space-x-2">
                          {/* View/Hide button */}
                          <button
                            onClick={() => toggleColumnVisibility(column.id)}
                            className={`p-1 ${column.visible ? 'text-blue-600 hover:text-blue-800' : 'text-gray-400 hover:text-gray-600'}`}
                            title={column.visible ? "Hide column" : "Show column"}
                          >
                            {column.visible ? <Eye className="h-3 w-3 sm:h-4 sm:w-4" /> : <EyeOff className="h-3 w-3 sm:h-4 sm:w-4" />}
                          </button>

                          {/* Edit button for all columns */}
                          {!isEditing && (
                            <button
                              onClick={() => startEditColumn(column.id, column.label)}
                              className="p-1 text-blue-600 hover:text-blue-800"
                              title="Edit column"
                            >
                              <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                            </button>
                          )}

                          {/* Delete button */}
                          <button
                            onClick={() => handleDeleteColumn(column.id)}
                            className="p-1 text-red-600 hover:text-red-800"
                            title="Delete column"
                          >
                            <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add Project Modal */}
        {showAddProjectModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-4 sm:p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-gray-900 text-sm sm:text-base">
                  <span className="bg-gray-200 px-2 py-0.5 rounded">
                    Add New Project
                  </span>
                </h3>
                <button
                  onClick={cancelNewProject}
                  className="p-1 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4 sm:h-5 sm:w-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                {columns.map((col) => (
                  <div key={col.id} className="col-span-1">
                    {renderInput(col, newProject[col.id], (f, v) => handleNewProjectChange(f, v), validationErrors[col.id], true)}
                  </div>
                ))}
              </div>

              <div className="flex justify-end space-x-2">
                <button
                  onClick={cancelNewProject}
                  className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={saveNewProject}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Save Project
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Project Modal */}
        {editingId && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-4 sm:p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-gray-900 text-sm sm:text-base">
                  <span className="bg-gray-200 px-2 py-0.5 rounded">
                    Edit Project
                  </span>
                </h3>
                <button
                  onClick={cancelEdit}
                  className="p-1 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4 sm:h-5 sm:w-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                {columns.map((col) => (
                  <div key={col.id} className="col-span-1">
                    {renderInput(col, editForm[col.id], (f, v) => handleEditFormChange(f, v), validationErrors[col.id], true)}
                  </div>
                ))}
              </div>

              <div className="flex justify-end space-x-2">
                <button
                  onClick={cancelEdit}
                  className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={saveEdit}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MAIN CONTENT CONTAINER */}
        <div className="flex flex-col flex-1 min-h-0 bg-gray-50/50 p-4 sm:p-6">
          <div className="flex flex-col flex-1 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden min-h-0">

            {/* Loading / Error State */}
            {loading && (
              <div className="p-8 text-center text-gray-500">
                Loading data...
              </div>
            )}

            {error && (
              <div className="p-8 text-center text-red-500">
                {error}
              </div>
            )}

            {!loading && !error && (
              <>
                {/* TOOLBAR SECTION */}
                <div className="p-4 border-b border-gray-200 flex-shrink-0">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">

                    {/* LEFT SIDE */}
                    <div className="flex flex-1 flex-col sm:flex-row gap-2 sm:gap-2 items-start sm:items-center">
                      {/* Search */}
                      <div className="relative w-full sm:w-auto">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search..."
                          value={searchTerm}
                          onChange={e => setSearchTerm(e.target.value)}
                          className="w-full sm:w-48 h-10 pl-9 pr-3 text-xs sm:text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black"
                        />
                      </div>
                    </div>

                    {/* RIGHT SIDE */}
                    <div className="flex gap-2 mt-2 sm:mt-0">

                      {/* Add Column Button */}
                      <button
                        onClick={() => setShowColumnModal(true)}
                        className="flex items-center gap-1 h-10 px-3 text-xs sm:text-sm border border-gray-300 rounded hover:bg-gray-50 whitespace-nowrap tooltip"
                        data-tooltip="Add column"
                      >
                        <Plus className="h-4 w-4" />
                      </button>

                      {/* Freeze Column Button */}
                      <button
                        onClick={toggleFreezeColumn}
                        className={`flex items-center gap-1 h-10 px-3 text-xs sm:text-sm border rounded whitespace-nowrap tooltip ${frozenColumns.length > 0
                            ? 'bg-blue-50 text-blue-700 border-blue-300'
                            : 'border-gray-300 hover:bg-gray-50 text-gray-700'
                          }`}
                        data-tooltip={frozenColumns.length > 0 ? "Unfreeze columns" : "Freeze columns"}
                      >
                        <Snowflake className={`h-4 w-4 ${frozenColumns.length > 0 ? 'text-blue-600' : 'text-gray-600'}`} />
                        {frozenColumns.length > 0 && <span className="ml-1 text-xs">{frozenColumns.length}</span>}
                      </button>

                      {/* Export Button with Dropdown */}
                      <div className="relative">
                        <button
                          onClick={() => setShowExportDropdown(!showExportDropdown)}
                          className="flex items-center gap-1 h-10 px-3 text-xs sm:text-sm border border-gray-300 rounded hover:bg-gray-50 tooltip"
                          data-tooltip="Export data"
                        >
                          <Download className="h-4 w-4" />
                        </button>

                        {/* Export Dropdown */}
                        {showExportDropdown && (
                          <>
                            <div
                              className="fixed inset-0 z-40"
                              onClick={() => setShowExportDropdown(false)}
                            />
                            <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-300 rounded shadow-lg z-50">
                              <button
                                onClick={() => handleExportClick('excel')}
                                className="block w-full text-left px-4 py-2 text-xs sm:text-sm text-gray-700 hover:bg-gray-100"
                              >
                                Export as Excel
                              </button>
                              <button
                                onClick={() => handleExportClick('csv')}
                                className="block w-full text-left px-4 py-2 text-xs sm:text-sm text-gray-700 hover:bg-gray-100"
                              >
                                Export as CSV
                              </button>
                              <button
                                onClick={() => handleExportClick('json')}
                                className="block w-full text-left px-4 py-2 text-xs sm:text-sm text-gray-700 hover:bg-gray-100"
                              >
                                Export as JSON
                              </button>
                              <button
                                onClick={() => handleExportClick('pdf')}
                                className="block w-full text-left px-4 py-2 text-xs sm:text-sm text-gray-700 hover:bg-gray-100"
                              >
                                Export as PDF
                              </button>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Refresh Button */}
                      <button
                        onClick={handleRefresh}
                        className="flex items-center gap-1 h-10 px-3 text-xs sm:text-sm border border-gray-300 rounded hover:bg-gray-50 whitespace-nowrap tooltip"
                        data-tooltip="Refresh data"
                        disabled={loading}
                      >
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* TABLE SECTION - SCROLLABLE */}
                <div className="flex-1 overflow-auto relative">
                  <table className="min-w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200">
                        {/* Checkbox column */}
                        <th
                          className={`text-left py-3 px-8 font-medium cursor-pointer hover:opacity-80 whitespace-nowrap w-8 ${isColumnFrozen(0) ? 'frozen-column' : ''
                            }`}
                          style={{
                            left: isColumnFrozen(0) ? '0' : 'auto',
                            zIndex: isColumnFrozen(0) ? 35 : 30
                          }}
                        >
                          <div className="flex items-center justify-center">
                            <button
                              onClick={toggleSelectAll}
                              className="p-1 text-gray-700 hover:text-gray-900"
                            >
                              {selectAll ? (
                                <CheckSquare className="h-4 w-4" />
                              ) : (
                                <Square className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </th>
                        {visibleColumns.map((col) => {
                          const actualColumnIndex = columns.findIndex(c => c.id === col.id);
                          return (
                            <th
                              key={col.id}
                              className={`text-left py-3 px-8 font-medium cursor-pointer hover:opacity-80 whitespace-nowrap ${isColumnFrozen(actualColumnIndex) ? 'frozen-column' : ''
                                }`}
                              onClick={() => col.sortable && handleSort(col.id)}
                              style={{
                                left: isColumnFrozen(actualColumnIndex) ? getFrozenColumnLeft(actualColumnIndex) : 'auto',
                                zIndex: isColumnFrozen(actualColumnIndex) ? 35 : 30
                              }}
                            >
                              <div className="flex items-center space-x-1">
                                <span className="font-semibold">{col.label}</span>
                                {col.required && <span className="text-red-300">*</span>}
                                {col.sortable && getSortIcon(col.id)}
                              </div>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>

                    <tbody>
                      {paginatedProjects.map((proj, rowIndex) => {
                        const actualRowIndex = (currentPage - 1) * pageSize + rowIndex;
                        const isRowCurrentlyFrozen = isRowFrozen(actualRowIndex);

                        return (
                          <tr
                            key={proj.id}
                            className={`transition-colors ${isRowCurrentlyFrozen ? 'frozen-row' : ''
                              }`}
                            style={{
                              top: isRowCurrentlyFrozen ? getFrozenRowTop(actualRowIndex) : 'auto'
                            }}
                          >
                            {/* Checkbox cell */}
                            <td
                              className={`py-3 px-8 whitespace-nowrap w-4 ${isColumnFrozen(0) ? 'frozen-column' : ''
                                }`}
                              style={{
                                left: isColumnFrozen(0) ? '0' : 'auto',
                                zIndex: isColumnFrozen(0) ? (isRowCurrentlyFrozen ? 25 : 15) : 'auto'
                              }}
                            >
                              <div className="flex items-center justify-center">
                                <input
                                  type="checkbox"
                                  checked={selectedProjects.includes(proj.id)}
                                  onChange={() => toggleProjectSelection(proj.id)}
                                  className="h-4 w-4 text-gray-600 border-gray-300 rounded focus:ring-gray-500"
                                />
                              </div>
                            </td>
                            {visibleColumns.map((col) => {
                              const actualColumnIndex = columns.findIndex(c => c.id === col.id);
                              return (
                                <td
                                  key={col.id}
                                  className={`py-3 px-8 whitespace-nowrap min-w-[160px] text-base ${isColumnFrozen(actualColumnIndex) ? 'frozen-column' : ''
                                    }`}
                                  style={{
                                    left: isColumnFrozen(actualColumnIndex) ? getFrozenColumnLeft(actualColumnIndex) : 'auto',
                                    zIndex: isColumnFrozen(actualColumnIndex) ? (isRowCurrentlyFrozen ? 25 : 15) : 'auto'
                                  }}
                                >
                                  {renderCellContent(col, proj[col.id])}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}

                      {/* Empty state */}
                      {paginatedProjects.length === 0 && (
                        <tr>
                          <td colSpan={visibleColumns.length + 1} className="text-center py-8 text-gray-500">
                            No projects found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* FOOTER SECTION */}
                <div className="px-4 py-3 border-t border-gray-200 text-xs text-gray-900 flex flex-col sm:flex-row items-center justify-between gap-2 bg-white flex-shrink-0">
                  {/* LEFT SIDE - Add Project and Action Buttons */}
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <button
                        onClick={handleAddProjectClick}
                        className="flex items-center gap-1 h-10 px-3 text-xs border border-gray-300 rounded hover:bg-gray-50 tooltip"
                        data-tooltip="Add project"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                      <button
                        onClick={toggleFreezeRow}
                        className={`flex items-center gap-1 h-10 px-3 text-xs border rounded tooltip ${frozenRows.length > 0
                            ? 'bg-blue-50 text-blue-700 border-blue-300'
                            : 'border-gray-300 hover:bg-gray-50 text-gray-700'
                          }`}
                        data-tooltip={frozenRows.length > 0 ? "Unfreeze rows" : "Select rows to freeze"}
                      >
                        <Snowflake className={`h-4 w-4 ${frozenRows.length > 0 ? 'text-blue-600' : 'text-gray-600'}`} />
                        {frozenRows.length > 0 && <span className="ml-1 text-xs">{frozenRows.length}</span>}
                      </button>
                    </div>

                    {/* Edit and Delete buttons - only show when projects are selected */}
                    {selectedProjects.length > 0 ? (
                      <div className="flex items-center gap-1 ml-1">
                        <button
                          onClick={handleBulkEdit}
                          className="flex items-center gap-1 h-10 px-3 text-xs sm:text-sm border border-gray-300 rounded hover:bg-gray-50"
                          title="Edit selected project"
                        >
                          <Edit className="h-4 w-4" />
                          {selectedProjects.length > 1 && <span>Edit ({selectedProjects.length})</span>}
                        </button>

                        <button
                          onClick={handleBulkDelete}
                          className="flex items-center gap-1 h-10 px-3 text-xs sm:text-sm border border-gray-300 rounded hover:bg-red-50 hover:text-red-700 hover:border-red-300"
                          title={selectedProjects.length === 1 ? "Delete selected project" : "Delete selected projects"}
                        >
                          <Trash2 className="h-4 w-4" />
                          {selectedProjects.length > 1 && <span>Delete ({selectedProjects.length})</span>}
                        </button>
                      </div>
                    ) : null}
                  </div>

                  {/* RIGHT SIDE - Info, Pagination, and Column Count */}
                  <div className="flex items-center gap-4">
                    {/* Page Size Selector */}
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600">Show:</span>
                      <select
                        value={pageSize}
                        onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                        className="px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-500"
                      >
                        {pageSizeOptions.map(size => (
                          <option key={size} value={size}>{size}</option>
                        ))}
                      </select>
                    </div>

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handlePageChange(currentPage - 1)}
                          disabled={currentPage === 1}
                          className={`p-1 rounded ${currentPage === 1
                              ? 'text-gray-400 cursor-not-allowed'
                              : 'text-gray-700 hover:bg-gray-100'
                            }`}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>

                        {getPageNumbers().map(pageNum => (
                          <button
                            key={pageNum}
                            onClick={() => handlePageChange(pageNum)}
                            className={`px-2 py-1 text-xs rounded ${currentPage === pageNum
                                ? 'bg-blue-600 text-white'
                                : 'text-gray-700 hover:bg-gray-100'
                              }`}
                          >
                            {pageNum}
                          </button>
                        ))}

                        <button
                          onClick={() => handlePageChange(currentPage + 1)}
                          disabled={currentPage === totalPages}
                          className={`p-1 rounded ${currentPage === totalPages
                              ? 'text-gray-400 cursor-not-allowed'
                              : 'text-gray-700 hover:bg-gray-100'
                            }`}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    )}

                    <span className="text-gray-600">
                      Showing {paginatedProjects.length} of {sortedProjects.length} projects
                    </span>

                    {selectedProjects.length > 0 && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                        {selectedProjects.length} selected
                      </span>
                    )}
                    <span className="text-gray-600">
                      ({visibleColumns.length} of {columns.length} columns visible)
                    </span>
                    {(frozenRows.length > 0 || frozenColumns.length > 0) && (
                      <span className="px-2 py-1 freeze-indicator rounded text-xs flex items-center gap-1">
                        <Snowflake className="h-3 w-3" />
                        {frozenRows.length > 0 && frozenColumns.length > 0 ? `${frozenRows.length} row(s) & ${frozenColumns.length} col(s) frozen` :
                          frozenRows.length > 0 ? `${frozenRows.length} row(s) frozen` : `${frozenColumns.length} col(s) frozen`}
                      </span>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </>
    </div>
  );
};

export default ProjectMaster;