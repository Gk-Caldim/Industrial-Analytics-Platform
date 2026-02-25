import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Upload, File, CheckCircle, Clock, AlertCircle, Download, Trash2, Eye, Edit,
  Plus, Search, X, ChevronUp, ChevronDown, Filter, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  AlertTriangle, FileText, FileSpreadsheet, Database,
  HardDrive, Archive, Check, Calendar, Save, EyeOff, User,
  Edit2, Save as SaveIcon, Columns, Rows, CheckSquare, Square, FolderTree, Layout, Snowflake, RefreshCw
} from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Delete Confirmation Modal Component (same as before)
const DeleteConfirmationModal = ({ isOpen, onClose, onConfirm, message, type = 'column' }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-gray-900">Confirm Delete</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="mb-6">
          <p className="text-gray-600">{message}</p>
          <p className="text-sm text-red-600 mt-2">This action cannot be undone.</p>
        </div>
        
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

const FileContentViewer = ({ 
  fileData, 
  trackerInfo, 
  onBack, 
  onSaveData, 
  viewOnly = false, 
  context = 'upload'
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editingRowIndex, setEditingRowIndex] = useState(null);
  const [editingColumnIndex, setEditingColumnIndex] = useState(null);
  const [tempColumnName, setTempColumnName] = useState('');
  const [editedHeaders, setEditedHeaders] = useState([]);
  const [editedRows, setEditedRows] = useState([]);
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  const [showDeleteModal, setShowDeleteModal] = useState({ 
    isOpen: false, 
    type: '', 
    index: null, 
    onConfirm: null,
    message: '' 
  });
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
  const [showAddColumnModal, setShowAddColumnModal] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');
  const [showAddRowModal, setShowAddRowModal] = useState(false);
  const [newRowData, setNewRowData] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const pageSizeOptions = [5, 10, 25, 50, 100];
  
  // Checkbox state
  const [selectedRows, setSelectedRows] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  
  // Action prompts state
  const [showBulkDeletePrompt, setShowBulkDeletePrompt] = useState(false);
  const [showExportConfirmPrompt, setShowExportConfirmPrompt] = useState(null);
  
  // Filter state
  const [columnFilter, setColumnFilter] = useState('');
  
  // Freeze states
  const [frozenRows, setFrozenRows] = useState([]);
  const [frozenColumns, setFrozenColumns] = useState([]);
  const [showFreezeColumnModal, setShowFreezeColumnModal] = useState(false);
  const [showFreezeRowModal, setShowFreezeRowModal] = useState(false);

  // ==========================================================================
  // Helper function to capitalize first letter of column names
  // ==========================================================================
  const capitalizeFirstLetter = (str) => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  const capitalizeHeaders = (headers) => {
    if (!headers || !Array.isArray(headers)) return headers;
    return headers.map(header => capitalizeFirstLetter(header));
  };

  // ==========================================================================
  // Initialize data when fileData changes
  // ==========================================================================
  useEffect(() => {
    console.log('📥 FileContentViewer received fileData:', {
      type: typeof fileData,
      isArray: Array.isArray(fileData),
      keys: fileData ? Object.keys(fileData) : [],
      hasSheets: !!fileData?.sheets,
      hasData: !!fileData?.data,
      hasRows: !!fileData?.rows
    });

    if (!fileData) {
      setIsLoading(false);
      return;
    }

    // CASE 1: Already has sheets format
    if (fileData.sheets && Array.isArray(fileData.sheets) && fileData.sheets.length > 0) {
      console.log('📊 CASE 1: Using sheets format');
      const currentSheet = fileData.sheets[0];
      // Capitalize headers
      const capitalizedHeaders = capitalizeHeaders([...currentSheet.headers]);
      setEditedHeaders(capitalizedHeaders);
      setEditedRows(currentSheet.data.map(row => [...(row || [])]));
      
      const initialRowData = {};
      capitalizedHeaders.forEach(header => {
        initialRowData[header] = '';
      });
      setNewRowData(initialRowData);
      setIsLoading(false);
      return;
    }
    
    // CASE 2: Has headers and data at root level
    if (fileData.headers && fileData.data && Array.isArray(fileData.data)) {
      console.log('📊 CASE 2: Using headers/data root format');
      console.log('Headers found:', fileData.headers);
      console.log(`Data rows: ${fileData.data.length}`);
      
      // Capitalize headers
      const capitalizedHeaders = capitalizeHeaders([...fileData.headers]);
      setEditedHeaders(capitalizedHeaders);
      setEditedRows(fileData.data.map(row => [...(row || [])]));
      
      const initialRowData = {};
      capitalizedHeaders.forEach(header => {
        initialRowData[header] = '';
      });
      setNewRowData(initialRowData);
      setIsLoading(false);
      return;
    }
    
    // CASE 3: Is an array of objects
    if (Array.isArray(fileData) && fileData.length > 0) {
      console.log('📊 CASE 3: Converting array of objects to sheets format');
      console.log('Sample first row:', fileData[0]);
      
      const headers = Object.keys(fileData[0]);
      console.log('Headers found:', headers);
      
      // Capitalize headers
      const capitalizedHeaders = capitalizeHeaders(headers);
      
      const data = fileData.map(row => capitalizedHeaders.map((h, index) => {
        const originalHeader = headers[index];
        return row[originalHeader] !== undefined ? row[originalHeader] : '';
      }));
      console.log(`Converted ${data.length} rows`);
      
      setEditedHeaders(capitalizedHeaders);
      setEditedRows(data);
      
      const initialRowData = {};
      capitalizedHeaders.forEach(header => {
        initialRowData[header] = '';
      });
      setNewRowData(initialRowData);
      setIsLoading(false);
      return;
    }
    
    // CASE 4: Has data property that's an array of objects
    if (fileData.data && Array.isArray(fileData.data) && fileData.data.length > 0) {
      console.log('📊 CASE 4: Using fileData.data format');
      
      if (typeof fileData.data[0] === 'object' && !Array.isArray(fileData.data[0])) {
        const headers = Object.keys(fileData.data[0]);
        // Capitalize headers
        const capitalizedHeaders = capitalizeHeaders(headers);
        
        const data = fileData.data.map(row => capitalizedHeaders.map((h, index) => {
          const originalHeader = headers[index];
          return row[originalHeader] || '';
        }));
        
        setEditedHeaders(capitalizedHeaders);
        setEditedRows(data);
        
        const initialRowData = {};
        capitalizedHeaders.forEach(header => {
          initialRowData[header] = '';
        });
        setNewRowData(initialRowData);
        setIsLoading(false);
        return;
      }
      
      if (Array.isArray(fileData.data[0])) {
        const headers = fileData.headers || Array.from({ length: fileData.data[0].length }, (_, i) => `Column ${i + 1}`);
        // Capitalize headers
        const capitalizedHeaders = capitalizeHeaders([...headers]);
        setEditedHeaders(capitalizedHeaders);
        setEditedRows(fileData.data.map(row => [...(row || [])]));
        
        const initialRowData = {};
        capitalizedHeaders.forEach(header => {
          initialRowData[header] = '';
        });
        setNewRowData(initialRowData);
        setIsLoading(false);
        return;
      }
    }
    
    // CASE 5: Has rows property
    if (fileData.rows && Array.isArray(fileData.rows) && fileData.rows.length > 0) {
      console.log('📊 CASE 5: Using fileData.rows format');
      
      if (typeof fileData.rows[0] === 'object' && !Array.isArray(fileData.rows[0])) {
        const headers = Object.keys(fileData.rows[0]);
        // Capitalize headers
        const capitalizedHeaders = capitalizeHeaders(headers);
        
        const data = fileData.rows.map(row => capitalizedHeaders.map((h, index) => {
          const originalHeader = headers[index];
          return row[originalHeader] || '';
        }));
        
        setEditedHeaders(capitalizedHeaders);
        setEditedRows(data);
        
        const initialRowData = {};
        capitalizedHeaders.forEach(header => {
          initialRowData[header] = '';
        });
        setNewRowData(initialRowData);
        setIsLoading(false);
        return;
      }
    }
    
    // CASE 6: CSV content string
    if (fileData.content && typeof fileData.content === 'string') {
      console.log('📊 CASE 6: Parsing CSV content');
      try {
        const lines = fileData.content.split('\n').filter(line => line.trim());
        if (lines.length > 0) {
          const headers = lines[0].split(',').map(h => h.trim());
          // Capitalize headers
          const capitalizedHeaders = capitalizeHeaders(headers);
          
          const data = lines.slice(1)
            .filter(line => line.trim())
            .map(line => line.split(',').map(cell => cell.trim()));
          
          setEditedHeaders(capitalizedHeaders);
          setEditedRows(data);
          
          const initialRowData = {};
          capitalizedHeaders.forEach(header => {
            initialRowData[header] = '';
          });
          setNewRowData(initialRowData);
          setIsLoading(false);
          return;
        }
      } catch (e) {
        console.error('Error parsing CSV:', e);
      }
    }
    
    // If we get here, we couldn't parse the data
    console.warn('⚠️ Could not parse fileData format:', fileData);
    setIsLoading(false);
    
  }, [fileData]);

  // ==========================================================================
  // Show notification
  // ==========================================================================
  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: '', type: '' });
    }, 3000);
  };

  // ==========================================================================
  // Column edit handlers
  // ==========================================================================
  const handleStartColumnEdit = (colIndex, header) => {
    if (viewOnly) return;
    setEditingColumnIndex(colIndex);
    setTempColumnName(header);
  };

  const handleSaveColumnEdit = (colIndex) => {
    if (viewOnly) return;
    if (!tempColumnName.trim()) {
      showNotification('Column name cannot be empty', 'error');
      return;
    }

    if (tempColumnName !== editedHeaders[colIndex]) {
      if (editedHeaders.includes(tempColumnName)) {
        showNotification('Column name already exists', 'error');
        return;
      }

      const newHeaders = [...editedHeaders];
      newHeaders[colIndex] = tempColumnName.trim();
      setEditedHeaders(newHeaders);
      showNotification('Column name updated', 'success');
    }

    setEditingColumnIndex(null);
    setTempColumnName('');
  };

  // ==========================================================================
  // Sorting
  // ==========================================================================
  const handleSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
    setCurrentPage(1); // Reset to first page when sorting
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) {
      return <ChevronUp className="h-3 w-3 sm:h-4 sm:w-4 opacity-30" />;
    }
    return sortConfig.direction === 'ascending' 
      ? <ChevronUp className="h-3 w-3 sm:h-4 sm:w-4" /> 
      : <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4" />;
  };

  // ==========================================================================
  // Checkbox Functions
  // ==========================================================================
  const toggleSelectAll = () => {
    if (viewOnly) return;
    
    if (selectAll) {
      setSelectedRows([]);
      setSelectAll(false);
    } else {
      const allVisibleIndices = paginatedRows.map(item => item.originalIndex);
      setSelectedRows(allVisibleIndices);
      setSelectAll(true);
    }
  };

  const toggleRowSelection = (rowIndex) => {
    if (viewOnly) return;
    
    setSelectedRows(prev => {
      if (prev.includes(rowIndex)) {
        const newSelection = prev.filter(idx => idx !== rowIndex);
        setSelectAll(false);
        return newSelection;
      } else {
        const newSelection = [...prev, rowIndex];
        
        // Check if all visible rows are selected
        const allVisibleIndices = paginatedRows.map(item => item.originalIndex);
        const allSelected = allVisibleIndices.every(idx => newSelection.includes(idx));
        
        if (allSelected && allVisibleIndices.length > 0) {
          setSelectAll(true);
        }
        return newSelection;
      }
    });
  };

  // ==========================================================================
  // Bulk delete
  // ==========================================================================
  const handleBulkDelete = () => {
    if (viewOnly) return;
    if (selectedRows.length === 0) {
      showNotification('Please select at least one row to delete', 'error');
      return;
    }
    
    setShowBulkDeletePrompt({
      show: true,
      count: selectedRows.length
    });
  };

  const confirmBulkDelete = () => {
    if (viewOnly) return;
    const newRows = editedRows.filter((_, index) => !selectedRows.includes(index));
    setEditedRows(newRows);
    setSelectedRows([]);
    setSelectAll(false);
    setShowBulkDeletePrompt({ show: false, count: 0 });
    
    // Adjust current page if necessary
    if (paginatedRows.length === 0 && currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
    
    showNotification(`${selectedRows.length} row${selectedRows.length > 1 ? 's' : ''} deleted successfully`);
  };

  // ==========================================================================
  // Derived data with memoization
  // ==========================================================================
  const rowsWithIndices = useMemo(() => {
    return editedRows.map((row, index) => ({ 
      data: row, 
      originalIndex: index
    }));
  }, [editedRows]);

  const filteredRows = useMemo(() => {
    return rowsWithIndices.filter(item => {
      const matchesSearch = !searchTerm || searchTerm.trim() === '' ||
        item.data.some(cell => 
          String(cell).toLowerCase().includes(searchTerm.toLowerCase())
        );
      
      const matchesColumnFilter = !columnFilter || columnFilter.trim() === '' ||
        item.data.some(cell => 
          String(cell).toLowerCase().includes(columnFilter.toLowerCase())
        );
        
      return matchesSearch && matchesColumnFilter;
    });
  }, [rowsWithIndices, searchTerm, columnFilter]);

  const sortedRows = useMemo(() => {
    if (!filteredRows || filteredRows.length === 0) return [];
    if (!sortConfig.key) return filteredRows;
    
    const colIndex = editedHeaders.findIndex(h => h === sortConfig.key);
    if (colIndex === -1) return filteredRows;

    return [...filteredRows].sort((a, b) => {
      const aVal = a.data[colIndex] || '';
      const bVal = b.data[colIndex] || '';
      
      if (aVal < bVal) return sortConfig.direction === 'ascending' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'ascending' ? 1 : -1;
      return 0;
    });
  }, [filteredRows, sortConfig, editedHeaders]);

  // Pagination logic
  const totalItems = sortedRows.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  
  const paginatedRows = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return sortedRows.slice(startIndex, endIndex);
  }, [sortedRows, currentPage, pageSize]);

  // Handle page change
  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    // Clear selection when changing pages
    setSelectedRows([]);
    setSelectAll(false);
  };

  // Handle page size change
  const handlePageSizeChange = (newSize) => {
    setPageSize(newSize);
    setCurrentPage(1); // Reset to first page when changing page size
    setSelectedRows([]);
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

  // ==========================================================================
  // Editing functions
  // ==========================================================================
  const handleEditRow = () => {
    if (viewOnly) return;
    if (selectedRows.length === 0) {
      showNotification('Please select a row to edit', 'error');
      return;
    }
    
    if (selectedRows.length > 1) {
      showNotification('Please select only one row to edit at a time', 'error');
      return;
    }
    
    const rowIndex = selectedRows[0];
    setIsEditing(true);
    setEditingRowIndex(rowIndex);
    showNotification('Editing mode enabled for selected row', 'info');
  };

  const handleCellChange = (rowIndex, colIndex, value) => {
    if (viewOnly) return;
    if (!isEditing || rowIndex !== editingRowIndex) return;
    
    const newRows = [...editedRows];
    if (!newRows[rowIndex]) {
      newRows[rowIndex] = new Array(editedHeaders.length).fill('');
    }
    newRows[rowIndex][colIndex] = value;
    setEditedRows(newRows);
  };

  const handleSaveChanges = () => {
    if (viewOnly) return;
    
    const updatedFileData = {
      headers: editedHeaders,
      data: editedRows
    };

    if (onSaveData) {
      onSaveData(updatedFileData);
    }
    
    showNotification('Changes saved successfully!');
    setIsEditing(false);
    setEditingRowIndex(null);
  };

  const handleCancelEdit = () => {
    if (viewOnly) return;
    // Reset to original data
    if (fileData.headers && fileData.data) {
      setEditedHeaders([...fileData.headers]);
      setEditedRows(fileData.data.map(row => [...(row || [])]));
    } else if (Array.isArray(fileData)) {
      const headers = Object.keys(fileData[0]);
      const data = fileData.map(row => headers.map(h => row[h] || ''));
      setEditedHeaders(headers);
      setEditedRows(data);
    }
    setIsEditing(false);
    setEditingRowIndex(null);
    showNotification('Edit cancelled', 'info');
  };

  const handleAddColumn = () => {
    if (viewOnly) return;
    if (!newColumnName.trim()) {
      showNotification('Please enter a column name', 'error');
      return;
    }
    
    if (editedHeaders.includes(newColumnName)) {
      showNotification('Column name already exists', 'error');
      return;
    }
    
    const newHeaders = [...editedHeaders, newColumnName];
    setEditedHeaders(newHeaders);
    
    const newRows = editedRows.map(row => [...row, '']);
    setEditedRows(newRows);
    
    setNewRowData(prev => ({
      ...prev,
      [newColumnName]: ''
    }));
    
    showNotification(`Column "${newColumnName}" added`, 'success');
    setNewColumnName('');
    setShowAddColumnModal(false);
  };

  const handleRemoveColumn = (colIndex) => {
    if (viewOnly) return;
    setShowDeleteModal({
      isOpen: true,
      type: 'column',
      index: colIndex,
      message: `Are you sure you want to remove column "${editedHeaders[colIndex]}"?`,
      onConfirm: () => {
        const newHeaders = editedHeaders.filter((_, index) => index !== colIndex);
        setEditedHeaders(newHeaders);
        
        const newRows = editedRows.map(row => row.filter((_, index) => index !== colIndex));
        setEditedRows(newRows);
        
        const headerName = editedHeaders[colIndex];
        const newRowDataCopy = { ...newRowData };
        delete newRowDataCopy[headerName];
        setNewRowData(newRowDataCopy);
        
        showNotification('Column removed', 'info');
      }
    });
  };

  const handleAddRow = () => {
    if (viewOnly) return;
    const rowData = editedHeaders.map(header => newRowData[header] || '');
    const newRows = [...editedRows, rowData];
    setEditedRows(newRows);
    
    const resetRowData = {};
    editedHeaders.forEach(header => {
      resetRowData[header] = '';
    });
    setNewRowData(resetRowData);
    
    setShowAddRowModal(false);
    showNotification('New row added', 'success');
  };

  const handleRemoveRow = (rowIndex) => {
    if (viewOnly) return;
    
    setShowDeleteModal({
      isOpen: true,
      type: 'row',
      index: rowIndex,
      message: 'Are you sure you want to remove this row?',
      onConfirm: () => {
        const newRows = editedRows.filter((_, index) => index !== rowIndex);
        setEditedRows(newRows);
        setSelectedRows(prev => prev.filter(idx => idx !== rowIndex));
        showNotification('Row removed', 'info');
      }
    });
  };

  // ==========================================================================
  // Export functions
  // ==========================================================================
  const handleExportClick = (format) => {
    if (viewOnly) return;
    if (editedRows.length === 0) {
      showNotification('No data to export', 'error');
      return;
    }
    
    setShowExportConfirmPrompt({
      show: true,
      format: format,
      count: editedRows.length
    });
  };

  const convertToCSV = (data) => {
    if (data.length === 0) return '';
    
    const csvRows = [
      editedHeaders.join(','),
      ...data.map(row => 
        editedHeaders.map((header, index) => {
          const cell = row[index] || '';
          return typeof cell === 'string' && (cell.includes(',') || cell.includes('"') || cell.includes('\n')) 
            ? `"${cell.replace(/"/g, '""')}"` 
            : cell;
        }).join(',')
      )
    ];
    
    return csvRows.join('\n');
  };

  const exportToPDF = (data) => {
    if (viewOnly) return;
    const doc = new jsPDF();
    const tableColumn = editedHeaders;
    const tableRows = data.map(row => 
      editedHeaders.map((header, index) => row[index] || '')
    );

    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [41, 128, 185] }
    });

    doc.save(`${trackerInfo?.fileName?.split('.')[0] || 'data'}.pdf`);
  };

  const handleExport = (format) => {
    if (viewOnly) return;
    const dataToExport = editedRows.map(row => {
      const obj = {};
      editedHeaders.forEach((header, index) => {
        obj[header] = row[index] || '';
      });
      return obj;
    });
    
    let content, mimeType, filename;
    
    switch(format) {
      case 'excel':
        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
        XLSX.writeFile(wb, `${trackerInfo?.fileName?.split('.')[0] || 'data'}.xlsx`);
        showNotification('Export to Excel completed successfully');
        return;
      case 'csv':
        content = convertToCSV(editedRows);
        mimeType = 'text/csv';
        filename = `${trackerInfo?.fileName?.split('.')[0] || 'data'}.csv`;
        break;
      case 'json':
        content = JSON.stringify(dataToExport, null, 2);
        mimeType = 'application/json';
        filename = `${trackerInfo?.fileName?.split('.')[0] || 'data'}.json`;
        break;
      case 'pdf':
        exportToPDF(editedRows);
        showNotification('Export to PDF completed successfully');
        return;
      default:
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
    
    showNotification(`Export to ${format.toUpperCase()} completed successfully`);
  };

  // ==========================================================================
  // Freeze functions
  // ==========================================================================
  const toggleFreezeRow = () => {
    if (viewOnly) return;
    setShowFreezeRowModal(true);
  };

  const toggleFreezeColumn = () => {
    if (viewOnly) return;
    setShowFreezeColumnModal(true);
  };

  const handleFreezeRows = (selectedRowIndices) => {
    setFrozenRows(selectedRowIndices);
    setShowFreezeRowModal(false);
    
    if (selectedRowIndices.length > 0) {
      showNotification(`${selectedRowIndices.length} row(s) frozen`);
    } else {
      showNotification('All rows unfrozen');
    }
  };

  const handleFreezeColumns = (selectedColumnIndices) => {
    setFrozenColumns(selectedColumnIndices);
    setShowFreezeColumnModal(false);
    
    if (selectedColumnIndices.length > 0) {
      showNotification(`${selectedColumnIndices.length} column(s) frozen`);
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

  // ==========================================================================
  // FIXED: Refresh function - replaces window.location.reload()
  // ==========================================================================
  const handleRefresh = () => {
    // Reset to original file data
    if (fileData) {
      // Re-initialize from the original fileData prop
      if (fileData.headers && fileData.data) {
        const capitalizedHeaders = capitalizeHeaders([...fileData.headers]);
        setEditedHeaders(capitalizedHeaders);
        setEditedRows(fileData.data.map(row => [...(row || [])]));
      } else if (Array.isArray(fileData)) {
        const headers = Object.keys(fileData[0]);
        const capitalizedHeaders = capitalizeHeaders(headers);
        const data = fileData.map(row => capitalizedHeaders.map((h, index) => {
          const originalHeader = headers[index];
          return row[originalHeader] || '';
        }));
        setEditedHeaders(capitalizedHeaders);
        setEditedRows(data);
      } else if (fileData.sheets && fileData.sheets.length > 0) {
        const currentSheet = fileData.sheets[0];
        const capitalizedHeaders = capitalizeHeaders([...currentSheet.headers]);
        setEditedHeaders(capitalizedHeaders);
        setEditedRows(currentSheet.data.map(row => [...(row || [])]));
      }
      
      // Reset all UI states
      setSearchTerm('');
      setColumnFilter('');
      setCurrentPage(1);
      setSelectedRows([]);
      setSelectAll(false);
      setSortConfig({ key: null, direction: 'ascending' });
      setIsEditing(false);
      setEditingRowIndex(null);
      
      showNotification('Data refreshed', 'success');
    }
  };

  // Custom tooltip styles
  const tooltipStyles = `
    /* Simple tooltip styles */
    .tooltip {
      position: relative;
    }

    .tooltip:hover:after {
      content: attr(data-tooltip);
      position: absolute;
      bottom: 100%;
      left: 50%;
      transform: translateX(-50%);
      margin-bottom: 8px;
      padding: 4px 8px;
      background-color: #1f2937;
      color: white;
      font-size: 12px;
      white-space: nowrap;
      border-radius: 4px;
      z-index: 10000;
      pointer-events: none;
    }

    /* Freeze styles */
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

    /* Table container styles */
    .file-viewer-container {
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
      background: white;
      min-height: 0;
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
      background: white;
    }

    th {
      position: sticky;
      top: 0;
      background: linear-gradient(135deg, #f0f5ff, #f0f8ff, #e6f0fa, #e0eaff);
      color: #1f2937;
      font-weight: 500;
      z-index: 30;
      border-bottom: 1px solid #e5e7eb;
    }

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

    tbody tr.frozen-row {
      position: sticky;
    }

    tbody tr.frozen-row:first-of-type td {
      border-top: 2px solid #0284c7;
    }

    tbody tr.frozen-row:last-of-type td {
      border-bottom: 2px solid #0284c7;
    }
  `;

  // ==========================================================================
  // Loading and Error States
  // ==========================================================================
  if (isLoading) {
    return (
      <div className="h-full flex flex-col bg-gray-50 overflow-visible">
        <div className="file-viewer-container p-2">
          <div className="bg-white border border-gray-200 rounded shadow-sm p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Loading File Data...</h3>
            <p className="text-gray-600">Please wait while we load your file content.</p>
          </div>
        </div>
      </div>
    );
  }

  if (!fileData) {
    return (
      <div className="h-full flex flex-col bg-gray-50 overflow-visible">
        <div className="file-viewer-container p-2">
          <div className="bg-white border border-gray-200 rounded shadow-sm p-8 text-center">
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">File Data Not Found</h3>
            <p className="text-gray-600">The file data could not be loaded. Please try re-uploading the file.</p>
            {onBack && (
              <button
                onClick={onBack}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Back to Uploads
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (editedHeaders.length === 0 && editedRows.length === 0 && !isLoading) {
    return (
      <div className="h-full flex flex-col bg-gray-50 overflow-visible">
        <div className="file-viewer-container p-2">
          <div className="bg-white border border-gray-200 rounded shadow-sm p-8 text-center">
            <FileSpreadsheet className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Available</h3>
            <p className="text-gray-600">The uploaded file appears to be empty or could not be parsed.</p>
            {onBack && (
              <button
                onClick={onBack}
                className="mt-4 px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
              >
                Back to Uploads
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50 overflow-visible">
      <style>{tooltipStyles}</style>

      {/* Notification */}
      {notification.show && (
        <div className={`fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-lg z-50 ${
          notification.type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' : 
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

      {/* Delete Modals */}
      {showDeleteModal.isOpen && (
        <DeleteConfirmationModal
          isOpen={showDeleteModal.isOpen}
          onClose={() => setShowDeleteModal({ ...showDeleteModal, isOpen: false })}
          onConfirm={showDeleteModal.onConfirm}
          message={showDeleteModal.message}
          type={showDeleteModal.type}
        />
      )}

      {/* Bulk Delete Prompt */}
      {!viewOnly && showBulkDeletePrompt.show && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 sm:p-6 max-w-sm w-full mx-4">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h3 className="font-medium text-gray-900 text-sm sm:text-base">Confirm Bulk Delete</h3>
              <button onClick={() => setShowBulkDeletePrompt({ show: false, count: 0 })} className="p-1 text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4 sm:h-5 sm:w-5"/>
              </button>
            </div>
            <div className="mb-4">
              <p className="text-xs sm:text-sm text-gray-600">
                Are you sure you want to delete {showBulkDeletePrompt.count} selected row{showBulkDeletePrompt.count > 1 ? 's' : ''}?
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

      {/* Export Confirmation Prompt */}
      {!viewOnly && context === 'project' && showExportConfirmPrompt?.show && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 sm:p-6 max-w-sm w-full mx-4">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h3 className="font-medium text-gray-900 text-sm sm:text-base">Confirm Export</h3>
              <button onClick={() => setShowExportConfirmPrompt(null)} className="p-1 text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4 sm:h-5 sm:w-5"/>
              </button>
            </div>
            <div className="mb-4">
              <p className="text-xs sm:text-sm text-gray-600">
                Export {showExportConfirmPrompt.count} row{showExportConfirmPrompt.count > 1 ? 's' : ''} as {showExportConfirmPrompt.format.toUpperCase()}?
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

      {/* Add Column Modal */}
      {!viewOnly && showAddColumnModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 sm:p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <div></div>
              <button onClick={() => setShowAddColumnModal(false)} className="p-1 text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            </div>
          
            <div className="mb-4 p-3 rounded">
              <h3 className="font-medium text-gray-900 text-sm sm:text-base -mt-5 mb-2">
                <span className="bg-gray-200 px-2 py-0.5 rounded flex items-center gap-1">
                  Add New Column
                </span>
              </h3>

              <div className="flex flex-col sm:flex-row gap-2 mt-2">
                <input
                  type="text"
                  placeholder="Enter column name"
                  value={newColumnName}
                  onChange={(e) => setNewColumnName(e.target.value)}
                  className="flex-grow px-3 py-2 text-xs sm:text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black"
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
              <h4 className="text-xs sm:text-sm font-medium text-gray-900 mb-2">Manage Columns</h4>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {editedHeaders.map((header, index) => {
                  const isFixedColumn = ['project', 'department', 'employeeName', 'fileName'].includes(header.toLowerCase().replace(/\s+/g, ''));
                  const isEditingCol = editingColumnIndex === index;
                
                  return (
                    <div key={index} className="flex items-center justify-between p-2 border border-gray-200 rounded">
                      <div className="flex items-center space-x-2">
                        {isEditingCol ? (
                          <div className="flex items-center space-x-2">
                            <input
                              type="text"
                              value={tempColumnName}
                              onChange={(e) => setTempColumnName(e.target.value)}
                              className="px-2 py-1 text-xs sm:text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black"
                              autoFocus
                            />
                            <button
                              onClick={() => handleSaveColumnEdit(index)}
                              className="p-1 text-green-600 hover:text-green-800"
                              title="Save"
                            >
                              <Check className="h-3 w-3 sm:h-4 sm:w-4" />
                            </button>
                            <button
                              onClick={() => setEditingColumnIndex(null)}
                              className="p-1 text-red-600 hover:text-red-800"
                              title="Cancel"
                            >
                              <X className="h-3 w-3 sm:h-4 sm:w-4" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <span className="font-medium text-xs sm:text-sm">{header}</span>
                            {isFixedColumn && (
                              <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                                Fixed
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    
                      <div className="flex items-center space-x-2">
                        {!isEditingCol && (
                          <button
                            onClick={() => handleStartColumnEdit(index, header)}
                            className="p-1 text-blue-600 hover:text-blue-800"
                            title="Edit column name"
                          >
                            <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                          </button>
                        )}
                      
                        <button
                          onClick={() => handleRemoveColumn(index)}
                          className={`p-1 ${isFixedColumn ? 'text-gray-400 cursor-not-allowed' : 'text-red-600 hover:text-red-800'}`}
                          title={isFixedColumn ? "Cannot delete fixed column" : "Delete column"}
                          disabled={isFixedColumn}
                        >
                          <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          
            <div className="flex justify-end space-x-2 mt-4 pt-4 border-t border-gray-200">
              <button 
                onClick={() => setShowAddColumnModal(false)} 
                className="px-3 py-1.5 text-xs sm:text-sm border border-gray-300 rounded hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Row Modal */}
      {!viewOnly && showAddRowModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 sm:p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-gray-900 text-sm sm:text-base">
                <span className="bg-gray-200 px-2 py-0.5 rounded">
                  Add New Row
                </span>
              </h3>
              <button onClick={() => setShowAddRowModal(false)} className="p-1 text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              {editedHeaders.map((header, index) => (
                <div key={index} className="col-span-1">
                  <label className="block text-xs font-medium text-gray-700 mb-1">{header}</label>
                  <input
                    type="text"
                    value={newRowData[header] || ''}
                    onChange={(e) => setNewRowData(prev => ({
                      ...prev,
                      [header]: e.target.value
                    }))}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black"
                    placeholder={`Enter ${header.toLowerCase()}`}
                  />
                </div>
              ))}
            </div>
            
            <div className="flex justify-end space-x-2">
              <button onClick={() => setShowAddRowModal(false)} className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50">Cancel</button>
              <button onClick={handleAddRow} className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50">Add</button>
            </div>
          </div>
        </div>
      )}

      {/* Freeze Column Modal */}
      {!viewOnly && showFreezeColumnModal && (
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
                {/* Checkbox column is always first */}
                {!viewOnly && (
                  <div className="flex items-center p-2 border border-gray-200 rounded bg-gray-50">
                    <input
                      type="checkbox"
                      id="freeze-checkbox"
                      checked={frozenColumns.includes(0)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFrozenColumns([0, ...frozenColumns.filter(idx => idx !== 0)].sort((a, b) => a - b));
                        } else {
                          setFrozenColumns(frozenColumns.filter(idx => idx !== 0));
                        }
                      }}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mr-3"
                    />
                    <label htmlFor="freeze-checkbox" className="text-sm text-gray-700 cursor-pointer flex-1 font-medium">
                      Checkbox Column
                    </label>
                    {frozenColumns.includes(0) && (
                      <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">Frozen</span>
                    )}
                  </div>
                )}
                
                {editedHeaders.map((header, index) => {
                  const actualColumnIndex = viewOnly ? index : index + 1;
                  return (
                    <div key={index} className="flex items-center p-2 border border-gray-200 rounded">
                      <input
                        type="checkbox"
                        id={`freeze-${index}`}
                        checked={frozenColumns.includes(actualColumnIndex)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFrozenColumns([...frozenColumns, actualColumnIndex].sort((a, b) => a - b));
                          } else {
                            setFrozenColumns(frozenColumns.filter(idx => idx !== actualColumnIndex));
                          }
                        }}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mr-3"
                      />
                      <label htmlFor={`freeze-${index}`} className="text-sm text-gray-700 cursor-pointer flex-1">
                        {header}
                      </label>
                      {frozenColumns.includes(actualColumnIndex) && (
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
                onClick={() => {
                  handleFreezeColumns(frozenColumns);
                }}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Apply Freeze
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Freeze Row Modal */}
      {!viewOnly && showFreezeRowModal && (
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
                {paginatedRows.map((item, index) => {
                  const rowIndex = item.originalIndex;
                  const firstCellValue = item.data[0] || `Row ${rowIndex + 1}`;
                  
                  return (
                    <div key={rowIndex} className="flex items-center p-2 border border-gray-200 rounded">
                      <input
                        type="checkbox"
                        id={`freeze-row-${rowIndex}`}
                        checked={frozenRows.includes(rowIndex)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFrozenRows([...frozenRows, rowIndex].sort((a, b) => a - b));
                          } else {
                            setFrozenRows(frozenRows.filter(idx => idx !== rowIndex));
                          }
                        }}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mr-3"
                      />
                      <label htmlFor={`freeze-row-${rowIndex}`} className="text-sm text-gray-700 cursor-pointer flex-1 truncate">
                        Row {rowIndex + 1}: {String(firstCellValue).substring(0, 30)}
                        {String(firstCellValue).length > 30 ? '...' : ''}
                      </label>
                      {frozenRows.includes(rowIndex) && (
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
                onClick={() => {
                  handleFreezeRows(frozenRows);
                }}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Apply Freeze
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MAIN CONTENT CONTAINER */}
      <div className="file-viewer-container p-2" style={{ overflow: 'visible' }}>
        <div className="bg-white border border-gray-200 rounded shadow-sm flex flex-col h-full overflow-visible">
          
          {/* TOOLBAR SECTION */}
          <div className="p-4 border-b border-gray-200 flex-shrink-0">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              
              {/* LEFT SIDE */}
              <div className="flex flex-1 flex-col sm:flex-row gap-2 sm:gap-2 items-start sm:items-center">
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
                
                {/* Filter Button */}
                {!viewOnly && context === 'project' && (
                  <div className="relative">
                    <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Filter..."
                      value={columnFilter}
                      onChange={(e) => setColumnFilter(e.target.value)}
                      className="h-10 pl-9 pr-3 text-xs sm:text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black w-full sm:w-48"
                    />
                    {columnFilter && (
                      <button
                        onClick={() => setColumnFilter('')}
                        className="p-1 absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <X className="h-3 w-3 sm:h-4 sm:w-4" />
                      </button>
                    )}
                  </div>
                )}

                {/* Add Column Button */}
                {!viewOnly && (
                  <button
                    onClick={() => setShowAddColumnModal(true)}
                    className="flex items-center gap-1 h-10 px-3 text-xs sm:text-sm border border-gray-300 rounded hover:bg-gray-50 tooltip"
                    data-tooltip="Add column"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                )}
                
                {/* Freeze Column Button */}
                {!viewOnly && (
                  <button
                    onClick={toggleFreezeColumn}
                    className={`flex items-center gap-1 h-10 px-3 text-xs sm:text-sm border rounded whitespace-nowrap tooltip ${
                      frozenColumns.length > 0 
                        ? 'bg-blue-50 text-blue-700 border-blue-300' 
                        : 'border-gray-300 hover:bg-gray-50 text-gray-700'
                    }`}
                    data-tooltip={frozenColumns.length > 0 ? "Unfreeze columns" : "Freeze columns"}
                  >
                    <Snowflake className={`h-4 w-4 ${frozenColumns.length > 0 ? 'text-blue-600' : 'text-gray-600'}`} />
                    {frozenColumns.length > 0 && <span className="ml-1 text-xs">{frozenColumns.length}</span>}
                  </button>
                )}
                
                {/* EXPORT BUTTON */}
                {!viewOnly && context === 'project' && (
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
                )}

                {/* FIXED: Refresh Button - Now uses handleRefresh instead of window.location.reload() */}
                {!viewOnly && (
                  <button
                    onClick={handleRefresh}
                    className="flex items-center gap-1 h-10 px-3 text-xs sm:text-sm border border-gray-300 rounded hover:bg-gray-50 tooltip"
                    data-tooltip="Refresh data"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                )}

                {/* Back Button */}
                {onBack && (
                  <button
                    onClick={onBack}
                    className="flex items-center gap-1 h-10 px-3 text-xs sm:text-sm border border-gray-300 rounded hover:bg-gray-50 tooltip"
                    data-tooltip="Go back"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* TABLE SECTION */}
          <div className="table-container">
            <table className="min-w-full text-base border-collapse">
              <thead>
                <tr className="border-b border-gray-200">
                  {/* Checkbox column */}
                  {!viewOnly && (
                    <th 
                      className={`text-left py-3 px-8 font-medium cursor-pointer hover:opacity-80 whitespace-nowrap w-8 ${
                        isColumnFrozen(0) ? 'frozen-column' : ''
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
                  )}
                  {editedHeaders.map((header, index) => {
                    const actualColumnIndex = viewOnly ? index : index + 1;
                    return (
                      <th 
                        key={index} 
                        scope="col"
                        className={`text-left py-3 px-8 font-medium cursor-pointer hover:opacity-80 whitespace-nowrap ${
                          isColumnFrozen(actualColumnIndex) ? 'frozen-column' : ''
                        }`}
                        onClick={() => handleSort(header)}
                        style={{
                          left: isColumnFrozen(actualColumnIndex) ? getFrozenColumnLeft(actualColumnIndex) : 'auto',
                          zIndex: isColumnFrozen(actualColumnIndex) ? 35 : 30
                        }}
                      >
                        <div className="flex items-center space-x-1">
                          <span className="text-base">{header}</span>
                          {getSortIcon(header)}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              
              <tbody>
                {paginatedRows && paginatedRows.length > 0 ? (
                  paginatedRows.map((item) => {
                    const row = item.data;
                    const rowIndex = item.originalIndex;
                    const isSelected = !viewOnly && selectedRows.includes(rowIndex);
                    const isEditingThisRow = !viewOnly && isEditing && editingRowIndex === rowIndex;
                    const isRowCurrentlyFrozen = !viewOnly && isRowFrozen(rowIndex);
                    
                    return (
                      <tr 
                        key={rowIndex} 
                        className={`border-b border-gray-200 hover:bg-gray-50 transition-colors ${
                          !viewOnly && isSelected ? 'bg-blue-50' : ''
                        } ${
                          !viewOnly && isEditingThisRow ? 'bg-yellow-50' : ''
                        } ${
                          isRowCurrentlyFrozen ? 'frozen-row' : ''
                        }`}
                        style={{
                          top: isRowCurrentlyFrozen ? getFrozenRowTop(rowIndex) : 'auto'
                        }}
                      >
                        {/* Checkbox cell */}
                        {!viewOnly && (
                          <td 
                            className={`py-3 px-8 whitespace-nowrap w-4 ${
                              isColumnFrozen(0) ? 'frozen-column' : ''
                            }`}
                            style={{
                              left: isColumnFrozen(0) ? '0' : 'auto',
                              zIndex: isColumnFrozen(0) ? (isRowCurrentlyFrozen ? 25 : 15) : 'auto'
                            }}
                          >
                            <div className="flex items-center justify-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleRowSelection(rowIndex)}
                                className="h-4 w-4 text-gray-600 border-gray-300 rounded focus:ring-gray-500"
                              />
                            </div>
                          </td>
                        )}
                        {row && row.map((cell, colIndex) => {
                          const actualColumnIndex = viewOnly ? colIndex : colIndex + 1;
                          return (
                            <td 
                              key={colIndex} 
                              className={`py-3 px-8 whitespace-nowrap min-w-[160px] text-base ${
                                isColumnFrozen(actualColumnIndex) ? 'frozen-column' : ''
                              }`}
                              style={{
                                left: isColumnFrozen(actualColumnIndex) ? getFrozenColumnLeft(actualColumnIndex) : 'auto',
                                zIndex: isColumnFrozen(actualColumnIndex) ? (isRowCurrentlyFrozen ? 25 : 15) : 'auto'
                              }}
                            >
                              {!viewOnly && isEditingThisRow ? (
                                <input
                                  type="text"
                                  value={cell || ''}
                                  onChange={(e) => handleCellChange(rowIndex, colIndex, e.target.value)}
                                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black"
                                />
                              ) : (
                                <span className="block truncate max-w-xs text-base" title={cell}>
                                  {cell !== undefined && cell !== null ? cell : ''}
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={viewOnly ? editedHeaders.length : editedHeaders.length + 1} className="text-center py-8 text-gray-500">
                      <div className="flex flex-col items-center justify-center">
                        <FileSpreadsheet className="h-12 w-12 text-gray-300 mb-3" />
                        <p className="text-base font-medium text-gray-900">No data found</p>
                        <p className="text-sm text-gray-500">This file appears to be empty</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* FOOTER SECTION */}
          <div className="px-4 py-3 border-t border-gray-200 text-xs text-gray-900 flex flex-col sm:flex-row items-center justify-between gap-2 bg-white flex-shrink-0">
            {/* LEFT SIDE */}
            <div className="flex items-center gap-2">
              {/* Add Row Button */}
              {!viewOnly && (
                <div className="flex gap-1">
                  <button
                    onClick={() => setShowAddRowModal(true)}
                    className="flex items-center gap-1 h-10 px-3 text-xs border border-gray-300 rounded hover:bg-gray-50 tooltip"
                    data-tooltip="Add row"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                  <button
                    onClick={toggleFreezeRow}
                    className={`flex items-center gap-1 h-10 px-3 text-xs border rounded tooltip ${
                      frozenRows.length > 0 
                        ? 'bg-blue-50 text-blue-700 border-blue-300' 
                        : 'border-gray-300 hover:bg-gray-50 text-gray-700'
                    }`}
                    data-tooltip={frozenRows.length > 0 ? "Unfreeze rows" : "Select rows to freeze"}
                  >
                    <Snowflake className={`h-4 w-4 ${frozenRows.length > 0 ? 'text-blue-600' : 'text-gray-600'}`} />
                    {frozenRows.length > 0 && <span className="ml-1 text-xs">{frozenRows.length}</span>}
                  </button>
                </div>
              )}
              
              {/* Edit and Delete buttons */}
              {!viewOnly && (selectedRows.length > 0 || isEditing) && (
                <div className="flex items-center gap-1 ml-1">
                  {!isEditing ? (
                    <button
                      onClick={handleEditRow}
                      className="flex items-center gap-1 h-10 px-3 text-xs sm:text-sm border border-gray-300 rounded hover:bg-gray-50"
                      title={selectedRows.length === 1 ? "Edit selected row" : "Edit selected rows"}
                    >
                      <Edit className="h-4 w-4" />
                      {selectedRows.length > 1 && <span>Edit ({selectedRows.length})</span>}
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={handleSaveChanges}
                        className="flex items-center gap-1 h-10 px-3 text-xs sm:text-sm border border-gray-300 rounded hover:bg-gray-50 tooltip"
                        data-tooltip="Save changes"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="flex items-center gap-1 h-10 px-3 text-xs sm:text-sm border border-gray-300 rounded hover:bg-gray-50 tooltip"
                        data-tooltip="Cancel edit"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </>
                  )}
                  
                  {!isEditing && (
                    <button
                      onClick={handleBulkDelete}
                      className="flex items-center gap-1 h-10 px-3 text-xs sm:text-sm border border-gray-300 rounded hover:bg-red-50 hover:text-red-700 hover:border-red-300"
                      title={selectedRows.length === 1 ? "Delete selected row" : "Delete selected rows"}
                    >
                      <Trash2 className="h-4 w-4" />
                      {selectedRows.length > 1 && <span>Delete ({selectedRows.length})</span>}
                    </button>
                  )}
                </div>
              )}
            </div>
            
            {/* RIGHT SIDE */}
            <div className="flex items-center gap-4">
              {/* Page Size Selector */}
              {!viewOnly && totalPages > 1 && (
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
              )}

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`p-1 rounded ${
                      currentPage === 1 
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
                      className={`px-2 py-1 text-xs rounded ${
                        currentPage === pageNum
                          ? 'bg-gradient-to-r from-rose-400 to-amber-400 text-white'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {pageNum}
                    </button>
                  ))}
                  
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={`p-1 rounded ${
                      currentPage === totalPages 
                        ? 'text-gray-400 cursor-not-allowed' 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}

              <span className="text-gray-600 text-sm">
                {viewOnly ? 'Viewing' : 'Showing'} {paginatedRows.length} of {sortedRows.length} rows
                {!viewOnly && context === 'project' && columnFilter && ` (Filtered)`}
              </span>
              
              {!viewOnly && selectedRows.length > 0 && (
                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                  {selectedRows.length} selected
                </span>
              )}
              {!viewOnly && isEditing && editingRowIndex !== null && (
                <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs">
                  Editing row {editingRowIndex + 1}
                </span>
              )}
              <span className="text-gray-600 text-sm">
                ({editedHeaders.length} columns)
              </span>
              {!viewOnly && (frozenRows.length > 0 || frozenColumns.length > 0) && (
                <span className="px-2 py-1 freeze-indicator rounded text-xs flex items-center gap-1">
                  <Snowflake className="h-3 w-3" />
                  {frozenRows.length > 0 && frozenColumns.length > 0 ? `${frozenRows.length} row(s) & ${frozenColumns.length} col(s) frozen` : 
                   frozenRows.length > 0 ? `${frozenRows.length} row(s) frozen` : `${frozenColumns.length} col(s) frozen`}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileContentViewer;