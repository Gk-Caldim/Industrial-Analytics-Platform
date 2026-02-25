import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Search, Edit, Trash2, X, Check, ChevronUp, ChevronDown, Download, Eye, EyeOff, CheckSquare, Square, Snowflake, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import axios from 'axios';

const EmployeeMaster = () => {
  // Fixed columns - Simplified to match EmployeeAccess
  const initialColumns = [
    { id: 'id', label: 'ID', visible: true, sortable: true, type: 'text', required: true, deletable: false },
    { id: 'name', label: 'Name', visible: true, sortable: true, type: 'text', required: true, deletable: false },
    { id: 'email', label: 'Email', visible: true, sortable: true, type: 'email', required: true, deletable: false },
    { id: 'department', label: 'Department', visible: true, sortable: true, type: 'text', required: true, deletable: false },
    { id: 'role', label: 'Role', visible: true, sortable: true, type: 'text', required: true, deletable: false },
    { id: 'status', label: 'Status', visible: true, sortable: true, type: 'text', required: true, deletable: false },
  ];

  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newEmployee, setNewEmployee] = useState({});
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
    const savedColumns = localStorage.getItem('employee_columns_v2');
    return savedColumns ? JSON.parse(savedColumns) : initialColumns;
  });

  const [editingColumn, setEditingColumn] = useState(null);
  const [tempColumnName, setTempColumnName] = useState('');

  // Sorting state
  const [sortConfig, setSortConfig] = useState({ key: 'id', direction: 'ascending' });

  // State for Add Employee modal
  const [showAddEmployeeModal, setShowAddEmployeeModal] = useState(false);

  // New state for checkboxes
  const [selectedEmployees, setSelectedEmployees] = useState([]);
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

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

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
      await fetchEmployees();
    } catch (err) {
      console.error("Error loading data:", err);
      setError("Failed to load data. Please try again.");
      showNotification('Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/employees`);
      if (Array.isArray(res.data)) {
        setEmployees(res.data);
      } else {
        setEmployees([]);
      }
    } catch (err) {
      console.error("Error fetching employees", err);
      throw err;
    }
  };

  // Refresh function - resets selections and freezes
  const handleRefresh = async () => {
    setSelectedEmployees([]);
    setSelectAll(false);
    setFrozenRows([]);
    setFrozenColumns([]);
    setTempFrozenRows([]);
    setTempFrozenColumns([]);
    setCurrentPage(1);
    await fetchData();
    showNotification('Data refreshed successfully');
  };

  // Checkbox Functions
  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedEmployees([]);
      setSelectAll(false);
    } else {
      const allVisibleIds = paginatedEmployees.map(emp => emp.id);
      setSelectedEmployees(allVisibleIds);
      setSelectAll(true);
    }
  };

  const toggleEmployeeSelection = (employeeId) => {
    setSelectedEmployees(prev => {
      if (prev.includes(employeeId)) {
        const newSelection = prev.filter(id => id !== employeeId);
        setSelectAll(false);
        return newSelection;
      } else {
        const newSelection = [...prev, employeeId];
        const allVisibleIds = paginatedEmployees.map(emp => emp.id);
        if (newSelection.length === allVisibleIds.length && allVisibleIds.length > 0) {
          setSelectAll(true);
        }
        return newSelection;
      }
    });
  };

  // Bulk edit function - Modified to handle single row only
  const handleBulkEdit = () => {
    if (selectedEmployees.length === 0) {
      showNotification('Please select at least one employee to edit', 'error');
      return;
    }

    if (selectedEmployees.length > 1) {
      showNotification('Only one row can be edited at a time', 'error');
      return;
    }

    setShowBulkEditPrompt({
      show: true,
      count: selectedEmployees.length
    });
  };

  const confirmBulkEdit = () => {
    if (selectedEmployees.length === 1) {
      const employee = employees.find(emp => emp.id === selectedEmployees[0]);
      if (employee) {
        startEditing(employee);
      }
    }
    setShowBulkEditPrompt({ show: false, count: 0 });
  };

  // Bulk delete function
  const handleBulkDelete = () => {
    if (selectedEmployees.length === 0) {
      showNotification('Please select at least one employee to delete', 'error');
      return;
    }

    setShowBulkDeletePrompt({
      show: true,
      count: selectedEmployees.length
    });
  };

  const confirmBulkDelete = async () => {
    const count = selectedEmployees.length;
    try {
      // Delete each selected employee
      for (const id of selectedEmployees) {
        await axios.delete(`${API_BASE_URL}/employees/${id}`);
      }
      await fetchEmployees();
      setSelectedEmployees([]);
      setSelectAll(false);
      setCurrentPage(1);
      setShowBulkDeletePrompt({ show: false, count: 0 });
      showNotification(`${count} employees deleted successfully`);
    } catch (err) {
      console.error(err);
      showNotification('Error deleting employees', 'error');
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
    const isFixedColumn = ['id', 'name', 'email', 'department', 'role', 'status'].includes(columnId);

    if (isFixedColumn) {
      setShowDeleteColumnPrompt({
        id: columnId,
        title: 'Cannot Delete Column',
        message: `Cannot delete fixed column: ${column.label}. Fixed columns are required for the Employee Master.`,
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

  // Save columns to localStorage
  useEffect(() => {
    localStorage.setItem('employee_columns_v2', JSON.stringify(columns));
  }, [columns]);

  // Filter employees
  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = Object.values(emp).some(value =>
      String(value).toLowerCase().includes(searchTerm.toLowerCase())
    );

    return matchesSearch;
  });

  // Sort employees
  const sortedEmployees = useMemo(() => {
    if (!sortConfig.key) return filteredEmployees;

    return [...filteredEmployees].sort((a, b) => {
      const aVal = a[sortConfig.key] || '';
      const bVal = b[sortConfig.key] || '';

      if (aVal < bVal) return sortConfig.direction === 'ascending' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'ascending' ? 1 : -1;
      return 0;
    });
  }, [filteredEmployees, sortConfig]);

  // Pagination logic
  const totalItems = sortedEmployees.length;
  const totalPages = Math.ceil(totalItems / pageSize);

  const paginatedEmployees = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return sortedEmployees.slice(startIndex, endIndex);
  }, [sortedEmployees, currentPage, pageSize]);

  // Handle page change
  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    setSelectedEmployees([]);
    setSelectAll(false);
  };

  // Handle page size change
  const handlePageSizeChange = (newSize) => {
    setPageSize(newSize);
    setCurrentPage(1);
    setSelectedEmployees([]);
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

  // Handle Add Employee button click
  const handleAddEmployeeClick = () => {
    setShowAddEmployeeModal(true);
    setNewEmployee({
      id: '',
      name: '',
      email: '',
      department: '',
      role: '',
      status: 'Active'
    });
  };

  // Handle new employee input change
  const handleNewEmployeeChange = (field, value) => {
    setNewEmployee({ ...newEmployee, [field]: value });
  };

  // Save new employee
  const saveNewEmployee = async () => {
    try {
      await axios.post(`${API_BASE_URL}/employees`, newEmployee);
      await fetchEmployees();
      setShowAddEmployeeModal(false);
      setNewEmployee({});
      setCurrentPage(1);
      showNotification('Employee added successfully');
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.detail || err.message;
      showNotification('Error saving employee: ' + msg, 'error');
    }
  };

  // Cancel adding new employee
  const cancelNewEmployee = () => {
    setShowAddEmployeeModal(false);
    setNewEmployee({});
  };

  // Confirm delete employee
  const confirmDeleteEmployee = async () => {
    if (showDeletePrompt) {
      try {
        await axios.delete(`${API_BASE_URL}/employees/${showDeletePrompt.id}`);
        await fetchEmployees();
        setShowDeletePrompt(null);
        if (paginatedEmployees.length === 1 && currentPage > 1) {
          setCurrentPage(currentPage - 1);
        }
        showNotification('Employee deleted successfully');
      } catch (err) {
        console.error(err);
        const msg = err.response?.data?.detail || err.message;
        showNotification('Error deleting employee: ' + msg, 'error');
      }
    }
  };

  // Cancel delete
  const cancelDelete = () => {
    setShowDeletePrompt(null);
  };

  // Start editing employee
  const startEditing = (employee) => {
    setEditForm({
      ...employee,
      id: employee.id
    });
    setEditingId(employee.id);
  };

  // Save employee edit
  const saveEdit = async () => {
    try {
      await axios.put(`${API_BASE_URL}/employees/${editingId}`, editForm);
      await fetchEmployees();
      setEditingId(null);
      setEditForm({});
      setSelectedEmployees([]);
      setSelectAll(false);
      showNotification('Employee updated successfully');
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.detail || err.message;
      showNotification('Error updating employee: ' + msg, 'error');
    }
  };

  // Cancel employee edit
  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  // Handle edit form change
  const handleEditFormChange = (field, value) => {
    setEditForm({ ...editForm, [field]: value });
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
        deletable: true,
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
    if (sortedEmployees.length === 0) {
      showNotification('No data to export', 'error');
      return;
    }

    setShowExportConfirmPrompt({
      show: true,
      format: format,
      count: sortedEmployees.length
    });
  };

  const handleExport = (format) => {
    showNotification(`Export to ${format.toUpperCase()} completed successfully`);
    setShowExportConfirmPrompt(null);
    setShowExportDropdown(false);
  };

  // Freeze functions - Updated to pre-select based on selected employees/columns
  const toggleFreezeRow = () => {
    // Get the actual row indices of selected employees on current page
    const selectedRowIndices = paginatedEmployees
      .map((emp, index) => {
        const actualRowIndex = (currentPage - 1) * pageSize + index;
        return selectedEmployees.includes(emp.id) ? actualRowIndex : null;
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

  // Render cell content
  const renderCellContent = (column, value) => {
    if (column.id === 'status') {
      const isActive = value === 'Active';
      return (
        <span className={`px-2 py-1 rounded-full text-sm whitespace-nowrap ${isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200'
          }`}>
          {value || 'Inactive'}
        </span>
      );
    }
    return value || '-';
  };

  const visibleColumns = columns.filter(col => col.visible);

  return (
    <div className="h-full flex flex-col bg-[#fafbfc] dark:bg-gray-950 overflow-hidden p-4 sm:p-6 font-sans">
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
          background: var(--frozen-row-bg)!important;
          border-bottom: 2px solid #0284c7;
        }

        .frozen-column {
          position: sticky !important;
          z-index: 15;
          background: var(--frozen-row-bg)!important;
          border-right: 2px solid #0284c7;
        }

        .frozen-row .frozen-column {
          z-index: 25;
          background: var(--frozen-both-bg)!important;
        }

        th.frozen-column {
          z-index: 35;
          background: var(--frozen-th-bg)!important;
        }

        .freeze-indicator {
          background: var(--frozen-both-bg);
          color: #0369a1;
          border: 1px solid #0284c7;
        }

        /* Table container styles for proper scrolling */
        .employee-master-container {
          height: 100%;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .table-container {
          flex: 1;
          overflow: auto;
          position: relative;
          border: 1px solid #e5e7eb;
          border-radius: 0.375rem;
          background: var(--bg-surface);
          min-height: 0;
          box-shadow: none;
          border: none;
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
          background: var(--bg-surface);
        }

        th {
          position: sticky;
          top: 0;
          background: var(--bg-table-head);
          color: #4b5563;
          font-weight: 600;
          font-size: 0.875rem;
          letter-spacing: 0.01em;
          z-index: 30;
          border-bottom: 1px solid #e5e7eb;
          padding-top: 1rem;
          padding-bottom: 1rem;
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
          background: var(--frozen-row-bg)!important;
        }

        tr.frozen-row td.frozen-column {
          z-index: 25;
          background: var(--frozen-both-bg)!important;
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

      <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-gray-900 backdrop-blur-xl border border-white/60 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
        {/* Header Section */}
        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-white dark:bg-gray-900">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">Employee Directory</h1>
            <p className="text-sm text-gray-500 dark:text-gray-500 font-medium mt-1">Manage your team members and roles</p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-semibold border border-indigo-100">
              {totalItems} Active Members
            </div>
          </div>
        </div>

        <div className="employee-master-container flex-1 flex flex-col min-h-0 relative">
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
                  className="ml-4 text-gray-500 dark:text-gray-500 hover:text-gray-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* Delete Employee Prompt */}
          {showDeletePrompt && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white dark:bg-gray-900 rounded-lg p-4 sm:p-6 max-w-sm w-full mx-4">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <h3 className="font-medium text-gray-900 dark:text-gray-100 text-sm sm:text-base">Confirm Delete</h3>
                  <button onClick={cancelDelete} className="p-1 text-gray-400 hover:text-gray-600 dark:text-gray-400">
                    <X className="h-4 w-4 sm:h-5 sm:w-5" />
                  </button>
                </div>
                <div className="mb-4">
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 employee <span className="font-medium">{showDeletePrompt.name}</span>?</p>
                  <p className="text-xs text-red-600 mt-1">This action cannot be undone.</p>
                </div>
                <div className="flex justify-end space-x-2">
                  <button onClick={cancelDelete} className="px-3 py-1.5 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-800"
                  <button onClick={confirmDeleteEmployee} className="px-3 py-1.5 text-xs sm:text-sm bg-red-600 text-white rounded hover:bg-red-700">Delete</button>
                </div>
              </div>
            </div>
          )}

          {/* Delete Column Prompt */}
          {showDeleteColumnPrompt && (
            <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-[60]">
              <div className="bg-white dark:bg-gray-900 rounded-lg p-4 sm:p-6 max-w-sm w-full mx-4">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <h3 className="font-medium text-gray-900 dark:text-gray-100 text-sm sm:text-base">
                    {showDeleteColumnPrompt.title}
                  </h3>
                  <button
                    onClick={() => setShowDeleteColumnPrompt(null)}
                    className="p-1 text-gray-400 hover:text-gray-600 dark:text-gray-400"
                  >
                    <X className="h-4 w-4 sm:h-5 sm:w-5" />
                  </button>
                </div>

                <div className="mb-4">
                  {showDeleteColumnPrompt.type === 'warning' ? (
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400"
                      {showDeleteColumnPrompt.message}
                    </p>
                  ) : (
                    <>
                      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400"
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
                    className="px-3 py-1.5 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-800"
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
              <div className="bg-white dark:bg-gray-900 rounded-lg p-4 sm:p-6 max-w-sm w-full mx-4">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <h3 className="font-medium text-gray-900 dark:text-gray-100 text-sm sm:text-base">Confirm Bulk Delete</h3>
                  <button onClick={() => setShowBulkDeletePrompt({ show: false, count: 0 })} className="p-1 text-gray-400 hover:text-gray-600 dark:text-gray-400">
                    <X className="h-4 w-4 sm:h-5 sm:w-5" />
                  </button>
                </div>
                <div className="mb-4">
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400"
                    Are you sure you want to delete {showBulkDeletePrompt.count} selected employee{showBulkDeletePrompt.count > 1 ? 's' : ''}?
                  </p>
                  <p className="text-xs text-red-600 mt-1">This action cannot be undone.</p>
                </div>
                <div className="flex justify-end space-x-2">
                  <button onClick={() => setShowBulkDeletePrompt({ show: false, count: 0 })} className="px-3 py-1.5 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-800"
                  <button onClick={confirmBulkDelete} className="px-3 py-1.5 text-xs sm:text-sm bg-red-600 text-white rounded hover:bg-red-700">Delete</button>
                </div>
              </div>
            </div>
          )}

          {/* Add Column Prompt */}
          {showColumnAddPrompt.show && (
            <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-[60]">
              <div className="bg-white dark:bg-gray-900 rounded-lg p-4 sm:p-6 max-w-sm w-full mx-4">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <h3 className="font-medium text-gray-900 dark:text-gray-100 text-sm sm:text-base">Add New Column</h3>
                  <button onClick={() => setShowColumnAddPrompt({ show: false, columnName: '' })} className="p-1 text-gray-400 hover:text-gray-600 dark:text-gray-400">
                    <X className="h-4 w-4 sm:h-5 sm:w-5" />
                  </button>
                </div>
                <div className="mb-4">
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400"
                    Are you sure you want to add column "<span className="font-medium">{showColumnAddPrompt.columnName}</span>"?
                  </p>
                </div>
                <div className="flex justify-end space-x-2">
                  <button onClick={() => setShowColumnAddPrompt({ show: false, columnName: '' })} className="px-3 py-1.5 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-800"
                  <button onClick={confirmAddColumn} className="px-3 py-1.5 text-xs sm:text-sm bg-blue-600 text-white rounded hover:bg-blue-700">Add Column</button>
                </div>
              </div>
            </div>
          )}

          {/* Export Confirmation Prompt */}
          {showExportConfirmPrompt?.show && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white dark:bg-gray-900 rounded-lg p-4 sm:p-6 max-w-sm w-full mx-4">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <h3 className="font-medium text-gray-900 dark:text-gray-100 text-sm sm:text-base">Confirm Export</h3>
                  <button onClick={() => setShowExportConfirmPrompt(null)} className="p-1 text-gray-400 hover:text-gray-600 dark:text-gray-400">
                    <X className="h-4 w-4 sm:h-5 sm:w-5" />
                  </button>
                </div>
                <div className="mb-4">
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400"
                    Export {showExportConfirmPrompt.count} employee{showExportConfirmPrompt.count > 1 ? 's' : ''} as {showExportConfirmPrompt.format.toUpperCase()}?
                  </p>
                </div>
                <div className="flex justify-end space-x-2">
                  <button onClick={() => setShowExportConfirmPrompt(null)} className="px-3 py-1.5 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-800"
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
              <div className="bg-white dark:bg-gray-900 rounded-lg p-4 sm:p-6 max-w-md w-full mx-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium text-gray-900 dark:text-gray-100 text-sm sm:text-base">
                    <span className="bg-gray-200 px-2 py-0.5 rounded">
                      Freeze Columns
                    </span>
                  </h3>
                  <button
                    onClick={() => setShowFreezeColumnModal(false)}
                    className="p-1 text-gray-400 hover:text-gray-600 dark:text-gray-400"
                  >
                    <X className="h-4 w-4 sm:h-5 sm:w-5" />
                  </button>
                </div>

                <div className="mb-4">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">Select columns to freeze (they will remain visible while scrolling horizontally)</p>
                  <div className="space-y-2 max-h-60 overflow-y-auto">

                    {visibleColumns.map((column) => {
                      const actualColumnIndex = columns.findIndex(col => col.id === column.id);
                      return (
                        <div key={column.id} className="flex items-center p-2 border border-gray-200 dark:border-gray-700 rounded">
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
                            className="h-4 w-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 mr-3"
                          />
                          <label htmlFor={`freeze-${column.id}`} className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer flex-1">
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
                    className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-800"
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
              <div className="bg-white dark:bg-gray-900 rounded-lg p-4 sm:p-6 max-w-md w-full mx-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium text-gray-900 dark:text-gray-100 text-sm sm:text-base">
                    <span className="bg-gray-200 px-2 py-0.5 rounded">
                      Freeze Rows
                    </span>
                  </h3>
                  <button
                    onClick={() => setShowFreezeRowModal(false)}
                    className="p-1 text-gray-400 hover:text-gray-600 dark:text-gray-400"
                  >
                    <X className="h-4 w-4 sm:h-5 sm:w-5" />
                  </button>
                </div>

                <div className="mb-4">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">Select rows to freeze (they will remain visible while scrolling vertically)</p>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {paginatedEmployees.map((emp, index) => {
                      const actualRowIndex = (currentPage - 1) * pageSize + index;
                      return (
                        <div key={emp.id} className="flex items-center p-2 border border-gray-200 dark:border-gray-700 rounded">
                          <input
                            type="checkbox"
                            id={`freeze-row-${emp.id}`}
                            checked={tempFrozenRows.includes(actualRowIndex)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setTempFrozenRows([...tempFrozenRows, actualRowIndex].sort((a, b) => a - b));
                              } else {
                                setTempFrozenRows(tempFrozenRows.filter(idx => idx !== actualRowIndex));
                              }
                            }}
                            className="h-4 w-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 mr-3"
                          />
                          <label htmlFor={`freeze-row-${emp.id}`} className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer flex-1">
                            Row {actualRowIndex + 1}: {emp.name} ({emp.id})
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
                    className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-800"
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
              <div className="bg-white dark:bg-gray-900 rounded-lg p-4 sm:p-6 max-w-md w-full mx-4">
                <div className="flex items-center justify-between mb-4">
                  <div></div>
                  <button onClick={() => setShowColumnModal(false)} className="p-1 text-gray-400 hover:text-gray-600 dark:text-gray-400">
                    <X className="h-4 w-4 sm:h-5 sm:w-5" />
                  </button>
                </div>

                <div className="mb-4 p-3 rounded">
                  <h3 className="font-medium text-gray-900 dark:text-gray-100 text-sm sm:text-base -mt-5 mb-2">
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
                      className="flex-grow px-3 py-2 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 rounded"
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
                  <h4 className="text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">Available Columns</h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {columns.map((column) => {
                      const isEditing = editingColumn === column.id;

                      return (
                        <div key={column.id} className="flex items-center justify-between p-2 border border-gray-200 dark:border-gray-700 rounded">
                          <div className="flex items-center space-x-2">
                            {isEditing ? (
                              <div className="flex items-center space-x-2">
                                <input
                                  type="text"
                                  value={tempColumnName}
                                  onChange={(e) => setTempColumnName(e.target.value)}
                                  className="px-2 py-1 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 rounded"
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
                              className={`p-1 ${column.visible ? 'text-blue-600 hover:text-blue-800' : 'text-gray-400 hover:text-gray-600 dark:text-gray-400'}`}
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

          {/* Add Employee Modal */}
          {showAddEmployeeModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white dark:bg-gray-900 rounded-lg p-4 sm:p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium text-gray-900 dark:text-gray-100 text-sm sm:text-base">
                    <span className="bg-gray-200 px-2 py-0.5 rounded">
                      Add New Employee
                    </span>
                  </h3>
                  <button
                    onClick={cancelNewEmployee}
                    className="p-1 text-gray-400 hover:text-gray-600 dark:text-gray-400"
                  >
                    <X className="h-4 w-4 sm:h-5 sm:w-5" />
                  </button>
                </div>

                {/* Basic Information Section */}
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">Basic Information</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">ID <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        value={newEmployee.id || ''}
                        onChange={(e) => handleNewEmployeeChange('id', e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-black"
                        placeholder="Enter employee ID"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Name <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        value={newEmployee.name || ''}
                        onChange={(e) => handleNewEmployeeChange('name', e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-black"
                        placeholder="Enter employee name"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Email <span className="text-red-500">*</span></label>
                      <input
                        type="email"
                        value={newEmployee.email || ''}
                        onChange={(e) => handleNewEmployeeChange('email', e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-black"
                        placeholder="Enter employee email"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Department <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        value={newEmployee.department || ''}
                        onChange={(e) => handleNewEmployeeChange('department', e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-black"
                        placeholder="Enter department"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Role <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        value={newEmployee.role || ''}
                        onChange={(e) => handleNewEmployeeChange('role', e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-black"
                        placeholder="Enter role"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Status <span className="text-red-500">*</span></label>
                      <select
                        value={newEmployee.status || 'Active'}
                        onChange={(e) => handleNewEmployeeChange('status', e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-black"
                      >
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <button
                    onClick={cancelNewEmployee}
                    className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveNewEmployee}
                    className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Save Employee
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Edit Employee Modal */}
          {editingId && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white dark:bg-gray-900 rounded-lg p-4 sm:p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium text-gray-900 dark:text-gray-100 text-sm sm:text-base">
                    <span className="bg-gray-200 px-2 py-0.5 rounded">
                      Edit Employee
                    </span>
                  </h3>
                  <button
                    onClick={cancelEdit}
                    className="p-1 text-gray-400 hover:text-gray-600 dark:text-gray-400"
                  >
                    <X className="h-4 w-4 sm:h-5 sm:w-5" />
                  </button>
                </div>

                {/* Basic Information Section */}
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">Basic Information</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">ID</label>
                      <input
                        type="text"
                        value={editForm.id || ''}
                        disabled
                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-800"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Name <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        value={editForm.name || ''}
                        onChange={(e) => handleEditFormChange('name', e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-black"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Email <span className="text-red-500">*</span></label>
                      <input
                        type="email"
                        value={editForm.email || ''}
                        onChange={(e) => handleEditFormChange('email', e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-black"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Department <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        value={editForm.department || ''}
                        onChange={(e) => handleEditFormChange('department', e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-black"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Role <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        value={editForm.role || ''}
                        onChange={(e) => handleEditFormChange('role', e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-black"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Status <span className="text-red-500">*</span></label>
                      <select
                        value={editForm.status || 'Active'}
                        onChange={(e) => handleEditFormChange('status', e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-black"
                      >
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <button
                    onClick={cancelEdit}
                    className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-800"
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
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded shadow-sm flex flex-col h-full overflow-visible">

            {/* Loading / Error State */}
            {loading && (
              <div className="p-8 text-center text-gray-500 dark:text-gray-500">
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
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
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
                          className="w-full sm:w-48 h-10 pl-9 pr-3 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-black"
                        />
                      </div>
                    </div>

                    {/* RIGHT SIDE */}
                    <div className="flex gap-2 mt-2 sm:mt-0">

                      {/* Add Column Button */}
                      <button
                        onClick={() => setShowColumnModal(true)}
                        className="flex items-center gap-1 h-10 px-3 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-800 whitespace-nowrap tooltip"
                        data-tooltip="Add column"
                      >
                        <Plus className="h-4 w-4" />
                      </button>

                      {/* Freeze Column Button */}
                      <button
                        onClick={toggleFreezeColumn}
                        className={`flex items-center gap-1 h-10 px-3 text-xs sm:text-sm border rounded whitespace-nowrap tooltip ${frozenColumns.length > 0
                          ? 'bg-blue-50 text-blue-700 border-blue-300'
                          : 'border-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700'
                          }`}
                        data-tooltip={frozenColumns.length > 0 ? "Unfreeze columns" : "Freeze columns"}
                      >
                        <Snowflake className={`h-4 w-4 ${frozenColumns.length > 0 ? 'text-blue-600' : 'text-gray-600 dark:text-gray-400'}`} />
                        {frozenColumns.length > 0 && <span className="ml-1 text-xs">{frozenColumns.length}</span>}
                      </button>

                      {/* Export Button with Dropdown */}
                      <div className="relative">
                        <button
                          onClick={() => setShowExportDropdown(!showExportDropdown)}
                          className="flex items-center gap-1 h-10 px-3 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-800 tooltip"
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
                            <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded shadow-lg z-50">
                              <button
                                onClick={() => handleExportClick('excel')}
                                className="block w-full text-left px-4 py-2 text-xs sm:text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                              >
                                Export as Excel
                              </button>
                              <button
                                onClick={() => handleExportClick('csv')}
                                className="block w-full text-left px-4 py-2 text-xs sm:text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                              >
                                Export as CSV
                              </button>
                              <button
                                onClick={() => handleExportClick('json')}
                                className="block w-full text-left px-4 py-2 text-xs sm:text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                              >
                                Export as JSON
                              </button>
                              <button
                                onClick={() => handleExportClick('pdf')}
                                className="block w-full text-left px-4 py-2 text-xs sm:text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
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
                        className="flex items-center gap-1 h-10 px-3 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-800 whitespace-nowrap tooltip"
                        data-tooltip="Refresh data"
                        disabled={loading}
                      >
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* TABLE SECTION - SCROLLABLE */}
                <div className="table-container">
                  <table className="min-w-full text-base border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700"
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
                              className="p-1 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:text-white"
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
                                <span className="text-base">{col.label}</span>
                                {col.required && <span className="text-red-300">*</span>}
                                {col.sortable && getSortIcon(col.id)}
                              </div>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>

                    <tbody>
                      {paginatedEmployees.map((emp, rowIndex) => {
                        const actualRowIndex = (currentPage - 1) * pageSize + rowIndex;
                        const isRowCurrentlyFrozen = isRowFrozen(actualRowIndex);

                        return (
                          <tr
                            key={emp.id}
                            className={`border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${isRowCurrentlyFrozen ? 'frozen-row' : ''
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
                                  checked={selectedEmployees.includes(emp.id)}
                                  onChange={() => toggleEmployeeSelection(emp.id)}
                                  className="h-4 w-4 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-600 rounded focus:ring-gray-500"
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
                                  {renderCellContent(col, emp[col.id])}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}

                      {/* Empty state */}
                      {paginatedEmployees.length === 0 && (
                        <tr>
                          <td colSpan={visibleColumns.length + 1} className="text-center py-8 text-gray-500 dark:text-gray-500">
                            No employees found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* FOOTER SECTION */}
                <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-900 dark:text-gray-100 flex flex-col sm:flex-row items-center justify-between gap-2 bg-white dark:bg-gray-900 flex-shrink-0">
                  {/* LEFT SIDE - Add Employee and Action Buttons */}
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <button
                        onClick={handleAddEmployeeClick}
                        className="flex items-center gap-1 h-10 px-3 text-xs border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-800 tooltip"
                        data-tooltip="Add employee"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                      <button
                        onClick={toggleFreezeRow}
                        className={`flex items-center gap-1 h-10 px-3 text-xs border rounded tooltip ${frozenRows.length > 0
                          ? 'bg-blue-50 text-blue-700 border-blue-300'
                          : 'border-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700'
                          }`}
                        data-tooltip={frozenRows.length > 0 ? "Unfreeze rows" : "Select rows to freeze"}
                      >
                        <Snowflake className={`h-4 w-4 ${frozenRows.length > 0 ? 'text-blue-600' : 'text-gray-600 dark:text-gray-400'}`} />
                        {frozenRows.length > 0 && <span className="ml-1 text-xs">{frozenRows.length}</span>}
                      </button>
                    </div>

                    {/* Edit and Delete buttons - only show when employees are selected */}
                    {selectedEmployees.length > 0 ? (
                      <div className="flex items-center gap-1 ml-1">
                        <button
                          onClick={handleBulkEdit}
                          className="flex items-center gap-1 h-10 px-3 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-800"
                          title="Edit selected employee"
                        >
                          <Edit className="h-4 w-4" />
                          {selectedEmployees.length > 1 && <span>Edit ({selectedEmployees.length})</span>}
                        </button>

                        <button
                          onClick={handleBulkDelete}
                          className="flex items-center gap-1 h-10 px-3 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-red-50 hover:text-red-700 hover:border-red-300"
                          title={selectedEmployees.length === 1 ? "Delete selected employee" : "Delete selected employees"}
                        >
                          <Trash2 className="h-4 w-4" />
                          {selectedEmployees.length > 1 && <span>Delete ({selectedEmployees.length})</span>}
                        </button>
                      </div>
                    ) : null}
                  </div>

                  {/* RIGHT SIDE - Info, Pagination, and Column Count */}
                  <div className="flex items-center gap-4">
                    {/* Page Size Selector */}
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600 dark:text-gray-400"
                      <select
                        value={pageSize}
                        onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                        className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-gray-500"
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
                            : 'text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800'
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
                              : 'text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800'
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
                            : 'text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800'
                            }`}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    )}

                    <span className="text-gray-600 dark:text-gray-400"
                      Showing {paginatedEmployees.length} of {sortedEmployees.length} employees
                    </span>

                    {selectedEmployees.length > 0 && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                        {selectedEmployees.length} selected
                      </span>
                    )}
                    <span className="text-gray-600 dark:text-gray-400"
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
      </div>
    </div>
  );
};

export default EmployeeMaster;