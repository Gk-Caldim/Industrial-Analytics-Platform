import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus, Search, Edit, Trash2, X, Check,
  ChevronUp, ChevronDown, Download,
  Eye, EyeOff, Building, Users, Target, Mail,
  Phone, Globe, BarChart3, MapPin, CheckCircle,
  AlertCircle, CheckSquare, Square, Snowflake, ChevronLeft, ChevronRight, RefreshCw
} from 'lucide-react';
import API from '../../utils/api';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const DepartmentMaster = () => {
  // Fixed columns matching backend Department model
  const initialColumns = [
    { id: 'id', label: 'ID', visible: true, sortable: true, type: 'text', required: true, deletable: false },
    { id: 'name', label: 'Department Name', visible: true, sortable: true, type: 'text', required: true, deletable: false },
    { id: 'head', label: 'Department Head', visible: true, sortable: true, type: 'text', required: true, deletable: false },
    { id: 'employees', label: 'Employees', visible: true, sortable: true, type: 'number', required: true, deletable: false },
    { id: 'budget', label: 'Budget', visible: true, sortable: true, type: 'number', required: true, deletable: false },
    { id: 'location', label: 'Location', visible: true, sortable: true, type: 'text', required: false, deletable: false },
    { id: 'status', label: 'Status', visible: true, sortable: true, type: 'select', required: true, deletable: false },
    { id: 'email', label: 'Email', visible: true, sortable: false, type: 'email', required: false, deletable: false },
  ];

  // Status colors mapping
  const statusColors = {
    'Active': 'bg-green-100 text-green-800',
    'Inactive': 'bg-red-100 text-red-800',
    'Merged': 'bg-blue-100 text-blue-800',
    'Restructuring': 'bg-yellow-100 text-yellow-800'
  };

  // Department data state
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newDept, setNewDept] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [showDeletePrompt, setShowDeletePrompt] = useState(null);
  const [showColumnModal, setShowColumnModal] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');
  const [newColumnType, setNewColumnType] = useState('text');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const pageSizeOptions = [5, 10, 25, 50, 100];

  // Load columns from localStorage
  const [columns, setColumns] = useState(() => {
    const savedColumns = localStorage.getItem('department_columns_v2');
    return savedColumns ? JSON.parse(savedColumns) : initialColumns;
  });

  const [editingColumn, setEditingColumn] = useState(null);
  const [tempColumnName, setTempColumnName] = useState('');

  // Sorting state
  const [sortConfig, setSortConfig] = useState({ key: 'id', direction: 'ascending' });

  // State for Add Department modal
  const [showAddDeptModal, setShowAddDeptModal] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  // New state for checkboxes
  const [selectedDepartments, setSelectedDepartments] = useState([]);
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
      await fetchDepartments();
    } catch (err) {
      console.error("Error loading data:", err);
      setError("Failed to load data. Please try again.");
      showNotification('Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await API.get('/departments');
      if (Array.isArray(res.data)) {
        const transformedDepts = res.data.map(dept => {
          const { custom_fields, ...rest } = dept;
          return { ...rest, ...(custom_fields || {}) };
        });
        setDepartments(transformedDepts);
      } else {
        setDepartments([]);
      }
    } catch (err) {
      console.error("Error fetching departments", err);
      throw err;
    }
  };

  // Refresh function - resets selections and freezes
  const handleRefresh = async () => {
    setSelectedDepartments([]);
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
    localStorage.setItem('department_columns_v2', JSON.stringify(columns));
  }, [columns]);

  // Checkbox Functions
  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedDepartments([]);
      setSelectAll(false);
    } else {
      const allVisibleIds = paginatedDepartments.map(dept => dept.id);
      setSelectedDepartments(allVisibleIds);
      setSelectAll(true);
    }
  };

  const toggleDepartmentSelection = (departmentId) => {
    setSelectedDepartments(prev => {
      if (prev.includes(departmentId)) {
        const newSelection = prev.filter(id => id !== departmentId);
        setSelectAll(false);
        return newSelection;
      } else {
        const newSelection = [...prev, departmentId];
        const allVisibleIds = paginatedDepartments.map(dept => dept.id);
        if (newSelection.length === allVisibleIds.length && allVisibleIds.length > 0) {
          setSelectAll(true);
        }
        return newSelection;
      }
    });
  };

  // Bulk edit function - Modified to handle single row only
  const handleBulkEdit = () => {
    if (selectedDepartments.length === 0) {
      showNotification('Please select at least one department to edit', 'error');
      return;
    }

    if (selectedDepartments.length > 1) {
      showNotification('Only one row can be edited at a time', 'error');
      return;
    }

    setShowBulkEditPrompt({
      show: true,
      count: selectedDepartments.length
    });
  };

  const confirmBulkEdit = () => {
    if (selectedDepartments.length === 1) {
      const department = departments.find(dept => dept.id === selectedDepartments[0]);
      if (department) {
        startEditing(department);
      }
    }
    setShowBulkEditPrompt({ show: false, count: 0 });
  };

  // Bulk delete function
  const handleBulkDelete = () => {
    if (selectedDepartments.length === 0) {
      showNotification('Please select at least one department to delete', 'error');
      return;
    }

    setShowBulkDeletePrompt({
      show: true,
      count: selectedDepartments.length
    });
  };

  const confirmBulkDelete = async () => {
    try {
      const deletePromises = selectedDepartments.map(id =>
        API.delete(`/departments/${id}`)
      );

      await Promise.all(deletePromises);

      const count = selectedDepartments.length;
      setSelectedDepartments([]);
      setSelectAll(false);
      setCurrentPage(1);
      setShowBulkDeletePrompt({ show: false, count: 0 });
      showNotification(`${count} department${count > 1 ? 's' : ''} deleted successfully`);
      fetchDepartments();
    } catch (err) {
      console.error('Error deleting departments:', err);
      const msg = err.response?.data?.detail || err.message;
      showNotification('Error deleting departments: ' + msg, 'error');
      setShowBulkDeletePrompt({ show: false, count: 0 });
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
    const isFixedColumn = ['id', 'name', 'head', 'employees', 'budget', 'location', 'status', 'email'].includes(columnId);

    if (isFixedColumn) {
      setShowDeleteColumnPrompt({
        id: columnId,
        title: 'Cannot Delete Column',
        message: `Cannot delete fixed column: ${column.label}. Fixed columns are required for the Department Master.`,
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

  // Filter departments
  const filteredDepartments = departments.filter(dept => {
    const matchesSearch = Object.values(dept).some(value =>
      String(value).toLowerCase().includes(searchTerm.toLowerCase())
    );

    return matchesSearch;
  });

  // Sort departments
  const sortedDepartments = useMemo(() => {
    if (!sortConfig.key) return filteredDepartments;

    return [...filteredDepartments].sort((a, b) => {
      const aVal = a[sortConfig.key] || '';
      const bVal = b[sortConfig.key] || '';

      if (aVal < bVal) return sortConfig.direction === 'ascending' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'ascending' ? 1 : -1;
      return 0;
    });
  }, [filteredDepartments, sortConfig]);

  // Pagination logic
  const totalItems = sortedDepartments.length;
  const totalPages = Math.ceil(totalItems / pageSize);

  const paginatedDepartments = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return sortedDepartments.slice(startIndex, endIndex);
  }, [sortedDepartments, currentPage, pageSize]);

  // Handle page change
  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    setSelectedDepartments([]);
    setSelectAll(false);
  };

  // Handle page size change
  const handlePageSizeChange = (newSize) => {
    setPageSize(newSize);
    setCurrentPage(1);
    setSelectedDepartments([]);
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

  // Handle Add Department button click
  const handleAddDeptClick = () => {
    setShowAddDeptModal(true);
    setValidationErrors({});
    const initialDept = {};
    columns.forEach(col => {
      if (col.id === 'status') {
        initialDept[col.id] = 'Active';
      } else if (col.type === 'number') {
        initialDept[col.id] = '0';
      } else {
        initialDept[col.id] = '';
      }
    });
    setNewDept(initialDept);
  };

  // Validation
  const validateDeptForm = (dept) => {
    const errors = {};
    for (const col of columns) {
      if (col.required && !dept[col.id]?.toString().trim()) {
        errors[col.id] = `${col.label} is required`;
      }
      if (col.type === 'number') {
        const numValue = parseFloat(dept[col.id]);
        if (col.required && (isNaN(numValue) || numValue < 0)) {
          errors[col.id] = `${col.label} must be a valid positive number`;
        }
      }
      if (col.type === 'email' && dept[col.id] && !dept[col.id].includes('@')) {
        errors[col.id] = 'Please enter a valid email address';
      }
    }
    return errors;
  };

  // Transform department for API save
  const transformDeptForSave = (deptData) => {
    const fixedColumnIds = ['id', 'name', 'head', 'employees', 'budget', 'location', 'status', 'email'];

    const payload = {
      name: deptData.name || '',
      head: deptData.head || '',
      employees: parseInt(deptData.employees) || 0,
      budget: parseFloat(deptData.budget) || 0,
      location: deptData.location || '',
      status: deptData.status || 'Active',
      email: deptData.email || '',
      custom_fields: {}
    };

    Object.keys(deptData).forEach(key => {
      if (!fixedColumnIds.includes(key) && key !== 'custom_fields' && key !== 'id') {
        payload.custom_fields[key] = deptData[key];
      }
    });

    return payload;
  };

  // Save new department
  const saveNewDept = async () => {
    const errors = validateDeptForm(newDept);
    setValidationErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    try {
      const payload = transformDeptForSave(newDept);
      await API.post('/departments', payload);
      await fetchDepartments();
      setShowAddDeptModal(false);
      setValidationErrors({});
      setCurrentPage(1);
      // Reset form
      const initialDept = {};
      columns.forEach(col => {
        if (col.id === 'status') {
          initialDept[col.id] = 'Active';
        } else if (col.type === 'number') {
          initialDept[col.id] = '0';
        } else {
          initialDept[col.id] = '';
        }
      });
      setNewDept(initialDept);
      showNotification('Department added successfully');
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.detail || err.message;
      showNotification('Error saving department: ' + msg, 'error');
    }
  };

  // Cancel adding new department
  const cancelNewDept = () => {
    setShowAddDeptModal(false);
    setValidationErrors({});
    const initialDept = {};
    columns.forEach(col => {
      if (col.id === 'status') {
        initialDept[col.id] = 'Active';
      } else if (col.type === 'number') {
        initialDept[col.id] = '0';
      } else {
        initialDept[col.id] = '';
      }
    });
    setNewDept(initialDept);
  };

  // Show delete prompt
  const showDeleteConfirmation = (id, name) => {
    setShowDeletePrompt({ id, name });
  };

  // Confirm delete department
  const confirmDeleteDept = async () => {
    if (showDeletePrompt) {
      try {
        await API.delete(`/departments/${showDeletePrompt.id}`);
        await fetchDepartments();
        setShowDeletePrompt(null);
        if (paginatedDepartments.length === 1 && currentPage > 1) {
          setCurrentPage(currentPage - 1);
        }
        showNotification('Department deleted successfully');
      } catch (err) {
        console.error(err);
        const msg = err.response?.data?.detail || err.message;
        showNotification('Error deleting department: ' + msg, 'error');
      }
    }
  };

  // Cancel delete
  const cancelDelete = () => {
    setShowDeletePrompt(null);
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
        type: newColumnType,
        deletable: true,
        required: false
      };

      setColumns([...columns, newColumn]);
      setNewColumnName('');
      setNewColumnType('text');
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

  // Start editing department
  const startEditing = (dept) => {
    setEditForm({
      ...dept
    });
    setEditingId(dept.id);
    setValidationErrors({});
  };

  // Save department edit
  const saveEdit = async () => {
    const errors = validateDeptForm(editForm);
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    try {
      const payload = transformDeptForSave(editForm);
      await API.put(`/departments/${editingId}`, payload);
      await fetchDepartments();
      setEditingId(null);
      setEditForm({});
      setValidationErrors({});
      setSelectedDepartments([]);
      setSelectAll(false);
      showNotification('Department updated successfully');
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.detail || err.message;
      showNotification('Error updating department: ' + msg, 'error');
    }
  };

  // Cancel department edit
  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
    setValidationErrors({});
    setSelectedDepartments([]);
    setSelectAll(false);
  };

  // Freeze functions - Updated to pre-select based on selected departments/columns
  const toggleFreezeRow = () => {
    // Get the actual row indices of selected departments on current page
    const selectedRowIndices = paginatedDepartments
      .map((dept, index) => {
        const actualRowIndex = (currentPage - 1) * pageSize + index;
        return selectedDepartments.includes(dept.id) ? actualRowIndex : null;
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

  // Handle new department input change
  const handleInputChange = (field, value, isEdit = false) => {
    if (isEdit) {
      setEditForm({ ...editForm, [field]: value });
    } else {
      setNewDept({ ...newDept, [field]: value });
    }
    // Clear validation error for this field when user starts typing
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Render Input Fields
  const renderInput = (col, value, onChange, error, isModal = false) => {
    const inputClass = `w-full px-3 py-2 text-sm border ${error ? 'border-red-500' : 'border-gray-300'} rounded focus:outline-none focus:ring-1 focus:ring-black`;

    const statusOptions = ['Active', 'Inactive', 'Merged', 'Restructuring'];

    if (col.id === 'status' || col.type === 'select') return (
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">{col.label} {col.required && <span className="text-red-500">*</span>}</label>
        <select
          value={value || 'Active'}
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
    if (col.type === 'email') return (
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">{col.label} {col.required && <span className="text-red-500">*</span>}</label>
        <input
          type="email"
          value={value || ''}
          onChange={e => onChange(col.id, e.target.value)}
          className={inputClass}
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

  // Export functions
  const handleExportClick = (format) => {
    if (sortedDepartments.length === 0) {
      showNotification('No data to export', 'error');
      return;
    }

    setShowExportConfirmPrompt({
      show: true,
      format: format,
      count: sortedDepartments.length
    });
  };

  const handleExport = (format) => {
    const dataToExport = sortedDepartments.map(dept => {
      const row = {};
      columns.filter(col => col.visible).forEach(col => {
        row[col.label] = dept[col.id] || '';
      });
      return row;
    });

    switch (format) {
      case 'excel':
        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Departments");
        XLSX.writeFile(wb, "departments.xlsx");
        break;
      case 'csv':
        const csvContent = convertToCSV(dataToExport);
        const csvBlob = new Blob([csvContent], { type: 'text/csv' });
        const csvUrl = window.URL.createObjectURL(csvBlob);
        const csvLink = document.createElement('a');
        csvLink.href = csvUrl;
        csvLink.download = 'departments.csv';
        csvLink.click();
        break;
      case 'json':
        const jsonContent = JSON.stringify(dataToExport, null, 2);
        const jsonBlob = new Blob([jsonContent], { type: 'application/json' });
        const jsonUrl = window.URL.createObjectURL(jsonBlob);
        const jsonLink = document.createElement('a');
        jsonLink.href = jsonUrl;
        jsonLink.download = 'departments.json';
        jsonLink.click();
        break;
      case 'pdf':
        exportToPDF(dataToExport);
        break;
    }

    showNotification(`Export to ${format.toUpperCase()} completed successfully`);
    setShowExportConfirmPrompt(null);
    setShowExportDropdown(false);
  };

  const exportToPDF = (data) => {
    const doc = new jsPDF();
    const tableColumn = columns.filter(col => col.visible).map(col => col.label);
    const tableRows = data.map(dept =>
      columns.filter(col => col.visible).map(col => dept[col.label] || '')
    );

    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [41, 128, 185] }
    });

    doc.save("departments.pdf");
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

  // Render cell content
  const renderCellContent = (column, value, dept) => {
    if (column.id === 'status') {
      return (
        <span className={`px-2 py-1 rounded-full text-sm whitespace-nowrap ${statusColors[value] || 'bg-gray-100 text-gray-800'
          }`}>
          {value || '-'}
        </span>
      );
    }
    if (column.id === 'budget') {
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

        {/* Delete Department Prompt */}
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
                <p className="text-xs sm:text-sm text-gray-600">Delete department <span className="font-medium">{showDeletePrompt.name}</span>?</p>
                <p className="text-xs text-red-600 mt-1">This action cannot be undone.</p>
              </div>
              <div className="flex justify-end space-x-2">
                <button onClick={cancelDelete} className="px-3 py-1.5 text-xs sm:text-sm border border-gray-300 rounded hover:bg-gray-50">Cancel</button>
                <button onClick={confirmDeleteDept} className="px-3 py-1.5 text-xs sm:text-sm bg-red-600 text-white rounded hover:bg-red-700">Delete</button>
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
                  Are you sure you want to delete {showBulkDeletePrompt.count} selected department{showBulkDeletePrompt.count > 1 ? 's' : ''}?
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
                  Are you sure you want to edit {showBulkEditPrompt.count} selected department{showBulkEditPrompt.count > 1 ? 's' : ''}?
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
                  Export {showExportConfirmPrompt.count} department{showExportConfirmPrompt.count > 1 ? 's' : ''} as {showExportConfirmPrompt.format.toUpperCase()}?
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
                  {paginatedDepartments.map((dept, index) => {
                    const actualRowIndex = (currentPage - 1) * pageSize + index;
                    return (
                      <div key={dept.id} className="flex items-center p-2 border border-gray-200 rounded">
                        <input
                          type="checkbox"
                          id={`freeze-row-${dept.id}`}
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
                        <label htmlFor={`freeze-row-${dept.id}`} className="text-sm text-gray-700 cursor-pointer flex-1">
                          Row {actualRowIndex + 1}: {dept.name} ({dept.id})
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
                    placeholder="Column name (e.g., Phone Number)"
                    value={newColumnName}
                    onChange={(e) => setNewColumnName(e.target.value)}
                    className="flex-grow px-3 py-2 text-xs sm:text-sm border border-gray-300 rounded"
                  />
                  <select
                    value={newColumnType}
                    onChange={(e) => setNewColumnType(e.target.value)}
                    className="px-3 py-2 text-xs sm:text-sm border border-gray-300 rounded"
                  >
                    <option value="text">Text</option>
                    <option value="number">Number</option>
                    <option value="select">Select</option>
                    <option value="email">Email</option>
                  </select>
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
                    const isFixedColumn = ['id', 'name', 'head', 'employees', 'budget', 'location', 'status', 'email'].includes(column.id);
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

        {/* Add Department Modal */}
        {showAddDeptModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-4 sm:p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-gray-900 text-sm sm:text-base">
                  <span className="bg-gray-200 px-2 py-0.5 rounded">
                    Add New Department
                  </span>
                </h3>
                <button
                  onClick={cancelNewDept}
                  className="p-1 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4 sm:h-5 sm:w-5" />
                </button>
              </div>

              {/* Basic Information Section */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Department Information</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {columns.map((col) => (
                    <div key={col.id}>
                      {renderInput(col, newDept[col.id], (f, v) => handleInputChange(f, v), validationErrors[col.id], true)}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <button
                  onClick={cancelNewDept}
                  className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={saveNewDept}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Save Department
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Department Modal */}
        {editingId && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-4 sm:p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-gray-900 text-sm sm:text-base">
                  <span className="bg-gray-200 px-2 py-0.5 rounded">
                    Edit Department
                  </span>
                </h3>
                <button
                  onClick={cancelEdit}
                  className="p-1 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4 sm:h-5 sm:w-5" />
                </button>
              </div>

              {/* Basic Information Section */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Department Information</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">ID</label>
                    <input
                      type="text"
                      value={editForm.id || ''}
                      disabled
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded bg-gray-50"
                    />
                  </div>
                  {columns.filter(col => col.id !== 'id').map((col) => (
                    <div key={col.id}>
                      {renderInput(col, editForm[col.id], (f, v) => handleInputChange(f, v, true), validationErrors[col.id], true)}
                    </div>
                  ))}
                </div>
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

                    {/* LEFT SIDE - Search only */}
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
                        {/* Actions column - not frozen */}
                        <th className="text-left py-3 px-8 font-medium whitespace-nowrap">
                          Actions
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {paginatedDepartments.map((dept, rowIndex) => {
                        const actualRowIndex = (currentPage - 1) * pageSize + rowIndex;
                        const isRowCurrentlyFrozen = isRowFrozen(actualRowIndex);

                        return (
                          <tr
                            key={dept.id}
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
                                  checked={selectedDepartments.includes(dept.id)}
                                  onChange={() => toggleDepartmentSelection(dept.id)}
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
                                  {renderCellContent(col, dept[col.id], dept)}
                                </td>
                              );
                            })}
                            <td className="py-3 px-8 whitespace-nowrap">
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => startEditing(dept)}
                                  className="p-1 text-blue-600 hover:text-blue-800"
                                  title="Edit department"
                                >
                                  <Edit className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => showDeleteConfirmation(dept.id, dept.name)}
                                  className="p-1 text-red-600 hover:text-red-800"
                                  title="Delete department"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}

                      {/* Empty state */}
                      {paginatedDepartments.length === 0 && (
                        <tr>
                          <td colSpan={visibleColumns.length + 2} className="text-center py-8 text-gray-500">
                            No departments found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* FOOTER SECTION */}
                <div className="px-4 py-3 border-t border-gray-200 text-xs text-gray-900 flex flex-col sm:flex-row items-center justify-between gap-2 bg-white flex-shrink-0">
                  {/* LEFT SIDE - Add Department and Action Buttons */}
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <button
                        onClick={handleAddDeptClick}
                        className="flex items-center gap-1 h-10 px-3 text-xs border border-gray-300 rounded hover:bg-gray-50 tooltip"
                        data-tooltip="Add department"
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

                    {/* Edit and Delete buttons - only show when departments are selected */}
                    {selectedDepartments.length > 0 ? (
                      <div className="flex items-center gap-1 ml-1">
                        <button
                          onClick={handleBulkEdit}
                          className="flex items-center gap-1 h-10 px-3 text-xs sm:text-sm border border-gray-300 rounded hover:bg-gray-50"
                          title="Edit selected department"
                        >
                          <Edit className="h-4 w-4" />
                          {selectedDepartments.length > 1 && <span>Edit ({selectedDepartments.length})</span>}
                        </button>

                        <button
                          onClick={handleBulkDelete}
                          className="flex items-center gap-1 h-10 px-3 text-xs sm:text-sm border border-gray-300 rounded hover:bg-red-50 hover:text-red-700 hover:border-red-300"
                          title={selectedDepartments.length === 1 ? "Delete selected department" : "Delete selected departments"}
                        >
                          <Trash2 className="h-4 w-4" />
                          {selectedDepartments.length > 1 && <span>Delete ({selectedDepartments.length})</span>}
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
                      Showing {paginatedDepartments.length} of {sortedDepartments.length} departments
                    </span>

                    {selectedDepartments.length > 0 && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                        {selectedDepartments.length} selected
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

export default DepartmentMaster;