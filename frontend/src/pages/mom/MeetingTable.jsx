import React, { useState, useEffect, useRef } from 'react';
import * as Icons from 'lucide-react';
import { jsPDF } from "jspdf";
import * as XLSX from 'xlsx';
import { 
  CRITICALITY_OPTIONS, 
  STATUS_OPTIONS,
  FUNCTION_OPTIONS,
  REMINDER_OPTIONS,
  APPROVAL_OPTIONS,
  COLUMN_TYPES, 
  DEFAULT_COLUMNS
} from '../constants';

const MeetingTable = ({ meetings, onUpdateMeeting, onDeleteMeeting }) => {
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [showDeletePrompt, setShowDeletePrompt] = useState(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState(null);
  
  // Use DEFAULT_COLUMNS directly - they're already in your specified order
  const [columns, setColumns] = useState(DEFAULT_COLUMNS);
  
  const [editingColumnHeader, setEditingColumnHeader] = useState(null);
  const [tempColumnName, setTempColumnName] = useState('');
  const [showAddColumnForm, setShowAddColumnForm] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');
  const [newColumnType, setNewColumnType] = useState('text');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
  const [editingCell, setEditingCell] = useState({ id: null, column: null });
  
  // State for export options
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showAddSummary, setShowAddSummary] = useState(false);
  const [meetingSummary, setMeetingSummary] = useState('');
  const [summaryTitle, setSummaryTitle] = useState('');
  
  // Refs for column header editing
  const headerInputRef = useRef(null);
  const newColumnInputRef = useRef(null);
  const summaryInputRef = useRef(null);
  
  // Focus header input when editing starts
  useEffect(() => {
    if (editingColumnHeader && headerInputRef.current) {
      headerInputRef.current.focus();
      headerInputRef.current.select();
    }
    
    if (showAddColumnForm && newColumnInputRef.current) {
      newColumnInputRef.current.focus();
    }
    
    if (showAddSummary && summaryInputRef.current) {
      summaryInputRef.current.focus();
    }
  }, [editingColumnHeader, showAddColumnForm, showAddSummary]);

  // Filter meetings
  const filteredMeetings = meetings.filter(meeting =>
    Object.values(meeting).some(value => 
      String(value).toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  // Sort meetings
  const sortedMeetings = React.useMemo(() => {
    if (!sortConfig.key) return filteredMeetings;

    return [...filteredMeetings].sort((a, b) => {
      const aVal = a[sortConfig.key] || '';
      const bVal = b[sortConfig.key] || '';
      
      if (aVal < bVal) {
        return sortConfig.direction === 'ascending' ? -1 : 1;
      }
      if (aVal > bVal) {
        return sortConfig.direction === 'ascending' ? 1 : -1;
      }
      return 0;
    });
  }, [filteredMeetings, sortConfig]);

  // Calculate meeting statistics (keeping for internal use but removing display)
  const meetingStats = React.useMemo(() => {
    const stats = {
      total: meetings.length,
      pending: meetings.filter(m => m.status === 'pending').length,
      completed: meetings.filter(m => m.status === 'completed').length,
      inProgress: meetings.filter(m => m.status === 'in-progress').length,
      highPriority: meetings.filter(m => m.criticality === 'high').length,
      mediumPriority: meetings.filter(m => m.criticality === 'medium').length,
      lowPriority: meetings.filter(m => m.criticality === 'low').length,
      overdue: meetings.filter(m => {
        if (!m.target || m.status === 'completed') return false;
        const targetDate = new Date(m.target);
        return targetDate < new Date();
      }).length,
      approved: meetings.filter(m => m.action_taken_approval === 'approved').length,
      pendingApproval: meetings.filter(m => m.action_taken_approval === 'pending-approval').length,
      rejected: meetings.filter(m => m.action_taken_approval === 'rejected').length,
      weeklyReminder: meetings.filter(m => m.remainder === 'weekly').length,
      dailyReminder: meetings.filter(m => m.remainder === 'daily').length,
      monthlyReminder: meetings.filter(m => m.remainder === 'monthly').length
    };
    
    // Calculate completion rate
    stats.completionRate = meetings.length > 0 
      ? Math.round((stats.completed / meetings.length) * 100) 
      : 0;
    
    // Calculate overdue percentage
    stats.overduePercentage = meetings.length > 0 
      ? Math.round((stats.overdue / meetings.length) * 100) 
      : 0;
    
    // Calculate approval rate
    const totalWithApproval = stats.approved + stats.rejected + stats.pendingApproval;
    stats.approvalRate = totalWithApproval > 0 
      ? Math.round((stats.approved / totalWithApproval) * 100) 
      : 0;
    
    return stats;
  }, [meetings]);

  // Handle sorting
  const handleSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  // Get sort icon
  const getSortIcon = (key) => {
    if (sortConfig.key !== key) {
      return <Icons.ChevronUp className="h-3 w-3 opacity-30" />;
    }
    return sortConfig.direction === 'ascending' 
      ? <Icons.ChevronUp className="h-3 w-3" /> 
      : <Icons.ChevronDown className="h-3 w-3" />;
  };

  // Start editing meeting (full row edit)
  const startEditing = (meeting) => {
    setEditingId(meeting.id);
    const editData = { ...meeting };
    columns.forEach(col => {
      if (!editData.hasOwnProperty(col.id)) {
        editData[col.id] = col.type === 'select' ? '' : '';
      }
    });
    setEditForm(editData);
  };

  // Save edit (full row)
  const saveEdit = () => {
    onUpdateMeeting(editingId, editForm);
    setEditingId(null);
    setEditForm({});
  };

  // Cancel edit (full row)
  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  // Start cell editing (inline)
  const startCellEditing = (meetingId, columnId, currentValue) => {
    setEditingCell({ id: meetingId, column: columnId });
    setEditForm({ [columnId]: currentValue || '' });
  };

  // Save cell edit (inline)
  const saveCellEdit = () => {
    if (editingCell.id && editingCell.column) {
      onUpdateMeeting(editingCell.id, { [editingCell.column]: editForm[editingCell.column] });
      setEditingCell({ id: null, column: null });
      setEditForm({});
    }
  };

  // Cancel cell edit (inline)
  const cancelCellEdit = () => {
    setEditingCell({ id: null, column: null });
    setEditForm({});
  };

  // Start column header editing
  const startHeaderEditing = (columnId, currentLabel) => {
    setEditingColumnHeader(columnId);
    setTempColumnName(currentLabel);
  };

  // Save column header edit
  const saveHeaderEdit = () => {
    if (editingColumnHeader && tempColumnName.trim()) {
      setColumns(columns.map(col => 
        col.id === editingColumnHeader ? { ...col, label: tempColumnName.trim() } : col
      ));
      setEditingColumnHeader(null);
      setTempColumnName('');
    }
  };

  // Cancel column header edit
  const cancelHeaderEdit = () => {
    setEditingColumnHeader(null);
    setTempColumnName('');
  };

  // Add new column
  const handleAddColumn = () => {
    if (newColumnName.trim()) {
      const newColumnId = newColumnName.toLowerCase().replace(/\s+/g, '_');
      
      // Check if column already exists
      if (columns.find(col => col.id === newColumnId)) {
        alert('Column with this name already exists');
        return;
      }
      
      const newColumn = {
        id: newColumnId,
        label: newColumnName.trim(),
        visible: true,
        sortable: true,
        type: newColumnType,
        editable: true,
        deletable: true,
        required: false
      };
      
      // Add new column to columns (at the end, before action columns)
      const actionColumns = columns.filter(col => col.type === 'action');
      const regularColumns = columns.filter(col => col.type !== 'action');
      
      setColumns([...regularColumns, newColumn, ...actionColumns]);
      
      // Add empty value for this column to all existing meetings
      meetings.forEach(meeting => {
        onUpdateMeeting(meeting.id, { [newColumnId]: '' });
      });
      
      // Reset form
      setNewColumnName('');
      setNewColumnType('text');
      setShowAddColumnForm(false);
    }
  };

  // Delete column
  const handleDeleteColumn = (columnId) => {
    if (window.confirm('Are you sure you want to delete this column? This will remove this column from all meetings.')) {
      setColumns(columns.filter(col => col.id !== columnId));
    }
  };

  // Handle header input key events
  const handleHeaderKeyDown = (e) => {
    if (e.key === 'Enter') {
      saveHeaderEdit();
    } else if (e.key === 'Escape') {
      cancelHeaderEdit();
    }
  };

  // Handle new column input key events
  const handleNewColumnKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleAddColumn();
    } else if (e.key === 'Escape') {
      setShowAddColumnForm(false);
      setNewColumnName('');
    }
  };

  // Handle header input blur
  const handleHeaderBlur = () => {
    saveHeaderEdit();
  };

  // Special handler for S.No editing - renumbers all rows
  const handleSnoEdit = (meetingId, newSno) => {
    if (!newSno || isNaN(newSno) || newSno < 1) return;
    
    const newSnoNum = parseInt(newSno);
    const meetingIndex = meetings.findIndex(m => m.id === meetingId);
    
    if (meetingIndex === -1) return;
    
    // Create a copy of meetings
    const updatedMeetings = [...meetings];
    
    // If new number is same as current, just update
    if (newSnoNum === updatedMeetings[meetingIndex].sno) {
      onUpdateMeeting(meetingId, { sno: newSnoNum });
      return;
    }
    
    // Reorder meetings based on new S.No
    updatedMeetings.sort((a, b) => {
      if (a.id === meetingId) return -1;
      if (b.id === meetingId) return 1;
      return a.sno - b.sno;
    });
    
    // Find the position to insert
    let insertIndex = newSnoNum - 1;
    if (insertIndex < 0) insertIndex = 0;
    if (insertIndex >= updatedMeetings.length) insertIndex = updatedMeetings.length - 1;
    
    // Remove the meeting from current position
    const [movedMeeting] = updatedMeetings.splice(meetingIndex, 1);
    
    // Insert at new position
    updatedMeetings.splice(insertIndex, 0, movedMeeting);
    
    // Renumber all meetings
    updatedMeetings.forEach((meeting, index) => {
      if (meeting.sno !== index + 1) {
        onUpdateMeeting(meeting.id, { sno: index + 1 });
      }
    });
  };

  // Show delete confirmation
  const showDeleteConfirmation = (id, projectName) => {
    setShowDeletePrompt({ id, projectName });
  };

  // Confirm delete
  const confirmDeleteMeeting = () => {
    if (showDeletePrompt && onDeleteMeeting) {
      onDeleteMeeting(showDeletePrompt.id);
      setShowDeletePrompt(null);
    }
  };

  // Cancel delete
  const cancelDelete = () => {
    setShowDeletePrompt(null);
  };

  // Handle edit form change
  const handleEditFormChange = (field, value) => {
    setEditForm({...editForm, [field]: value});
  };

  // Handle inline cell edit change
  const handleInlineEditChange = (value) => {
    if (editingCell.column) {
      setEditForm({ [editingCell.column]: value });
    }
  };

  // Get criticality info
  const getCriticalityInfo = (value) => {
    return CRITICALITY_OPTIONS.find(c => c.value === value) || CRITICALITY_OPTIONS[1];
  };

  // Get status info
  const getStatusInfo = (value) => {
    return STATUS_OPTIONS.find(s => s.value === value) || STATUS_OPTIONS[0];
  };

  // Get function info
  const getFunctionInfo = (value) => {
    return FUNCTION_OPTIONS.find(f => f.value === value) || FUNCTION_OPTIONS[0];
  };

  // Get remainder info
  const getRemainderInfo = (value) => {
    return REMINDER_OPTIONS.find(r => r.value === value) || REMINDER_OPTIONS[0];
  };

  // Get approval info
  const getApprovalInfo = (value) => {
    return APPROVAL_OPTIONS.find(a => a.value === value) || APPROVAL_OPTIONS[2];
  };

  // Get column type icon
  const getColumnTypeIcon = (type) => {
    const typeInfo = COLUMN_TYPES.find(t => t.value === type);
    if (typeInfo?.icon) {
      const IconComponent = Icons[typeInfo.icon];
      return <IconComponent className="h-3 w-3" />;
    }
    return null;
  };

  // Get formatted data for export
  const getExportData = () => {
    const visibleColumns = columns.filter(col => col.visible && col.type !== 'action');
    const headers = visibleColumns.map(col => col.label);
    
    const rows = filteredMeetings.map(meeting => {
      return visibleColumns.map(col => {
        if (col.id === 'criticality') return getCriticalityInfo(meeting[col.id])?.label || meeting[col.id];
        if (col.id === 'status') return getStatusInfo(meeting[col.id])?.label || meeting[col.id];
        if (col.id === 'function') return getFunctionInfo(meeting[col.id])?.label || meeting[col.id];
        if (col.id === 'remainder') return getRemainderInfo(meeting[col.id])?.label || meeting[col.id];
        if (col.id === 'action_taken_approval') return getApprovalInfo(meeting[col.id])?.label || meeting[col.id];
        return meeting[col.id] || '';
      });
    });

    return { headers, rows };
  };

  // Export to CSV
  const exportToCSV = () => {
    const { headers, rows } = getExportData();
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `meeting-minutes-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Export to Excel (XLSX)
  const exportToExcel = () => {
    const { headers, rows } = getExportData();
    
    // Create worksheet data
    const worksheetData = [
      headers,
      ...rows
    ];
    
    // Create workbook
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    
    // Set column widths
    const colWidths = headers.map(() => ({ wch: 20 }));
    worksheet['!cols'] = colWidths;
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Meeting Minutes');
    
    // Generate Excel file
    XLSX.writeFile(workbook, `meeting-minutes-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Export to PDF - FIXED VERSION
  const exportToPDF = () => {
    const { headers, rows } = getExportData();
    
    // Use the imported jsPDF directly
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });
    
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 10;
    
    // Add title
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Meeting Minutes Report', pageWidth / 2, 15, { align: 'center' });
    
    // Add date
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, 22, { align: 'center' });
    
    // Calculate table dimensions
    const colCount = headers.length;
    const colWidth = (pageWidth - (margin * 2)) / colCount;
    let yPos = 30;
    
    // Add table headers
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    headers.forEach((header, i) => {
      const xPos = margin + (i * colWidth);
      const truncatedHeader = header.length > 15 ? header.substring(0, 12) + '...' : header;
      doc.text(truncatedHeader, xPos, yPos, { maxWidth: colWidth - 2 });
    });
    
    yPos += 8;
    
    // Add table data
    doc.setFont('helvetica', 'normal');
    rows.forEach((row, rowIndex) => {
      // Check if we need a new page
      if (yPos > pageHeight - 15) {
        doc.addPage();
        yPos = 20;
        // Add headers on new page
        headers.forEach((header, i) => {
          const xPos = margin + (i * colWidth);
          const truncatedHeader = header.length > 15 ? header.substring(0, 12) + '...' : header;
          doc.text(truncatedHeader, xPos, yPos, { maxWidth: colWidth - 2 });
        });
        yPos += 8;
      }
      
      row.forEach((cell, colIndex) => {
        const xPos = margin + (colIndex * colWidth);
        const cellText = String(cell);
        const truncatedText = cellText.length > 20 ? cellText.substring(0, 17) + '...' : cellText;
        doc.text(truncatedText, xPos, yPos, { maxWidth: colWidth - 2 });
      });
      
      yPos += 6;
    });
    
    // Add summary
    yPos += 5;
    doc.setFontSize(10);
    doc.text(`Total Meetings: ${rows.length}`, margin, yPos);
    doc.text(`Generated by Meeting Minutes System`, pageWidth / 2, yPos + 10, { align: 'center' });
    
    // Save PDF
    doc.save(`meeting-minutes-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // Export to Word (DOCX)
  const exportToWord = () => {
    const { headers, rows } = getExportData();
    
    // Create HTML content
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Meeting Minutes Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; }
          h1 { text-align: center; color: #333; border-bottom: 2px solid #4CAF50; padding-bottom: 10px; }
          .date { text-align: center; color: #666; margin-bottom: 30px; font-size: 14px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background-color: #4CAF50; color: white; padding: 12px; text-align: left; border: 1px solid #ddd; }
          td { padding: 10px; border: 1px solid #ddd; }
          tr:nth-child(even) { background-color: #f9f9f9; }
          .footer { margin-top: 40px; text-align: center; color: #777; font-size: 12px; padding-top: 20px; border-top: 1px solid #eee; }
          .summary { margin-top: 30px; padding: 15px; background-color: #f0f7f4; border-left: 4px solid #4CAF50; }
        </style>
      </head>
      <body>
        <h1>Meeting Minutes Report</h1>
        <div class="date">Generated: ${new Date().toLocaleDateString()}</div>
        
        <table>
          <thead>
            <tr>
              ${headers.map(header => `<th>${header}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${rows.map(row => `
              <tr>
                ${row.map(cell => `<td>${cell}</td>`).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="summary">
          <strong>Summary:</strong> Total ${rows.length} meeting points exported.
        </div>
        
        <div class="footer">
          Generated by Meeting Minutes System | ${new Date().toLocaleString()}
        </div>
      </body>
      </html>
    `;

    // Convert HTML to Word document
    const blob = new Blob([htmlContent], { 
      type: 'application/msword;charset=utf-8' 
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `meeting-minutes-${new Date().toISOString().split('T')[0]}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  // Add meeting summary
  const handleAddMeetingSummary = () => {
    if (summaryTitle.trim() && meetingSummary.trim()) {
      // Create a new meeting point for the summary
      const summaryMeeting = {
        id: Date.now(),
        sno: meetings.length + 1,
        function: 'summary',
        project_name: summaryTitle.trim(),
        criticality: 'medium',
        discussion_point: meetingSummary.trim(),
        responsibility: 'All Teams',
        target: new Date().toISOString().split('T')[0],
        remainder: 'none',
        status: 'completed',
        action_taken_approval: 'approved',
        created_at: new Date().toISOString(),
        is_summary: true
      };
      
      // Add summary to meetings
      onUpdateMeeting(summaryMeeting.id, summaryMeeting);
      
      // Reset form
      setSummaryTitle('');
      setMeetingSummary('');
      setShowAddSummary(false);
    }
  };

  // Render input based on column type (for inline editing)
  const renderInlineInput = (column, value, onChange) => {
    const commonClasses = "w-full px-2 py-1 text-xs sm:text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500";
    
    if (column.type === 'select') {
      let options = [];
      switch(column.id) {
        case 'criticality':
          options = CRITICALITY_OPTIONS;
          break;
        case 'status':
          options = STATUS_OPTIONS;
          break;
        case 'function':
          options = FUNCTION_OPTIONS;
          break;
        case 'remainder':
          options = REMINDER_OPTIONS;
          break;
        case 'action_taken_approval':
          options = APPROVAL_OPTIONS;
          break;
        default:
          options = [{ value: 'option1', label: 'Option 1' }, { value: 'option2', label: 'Option 2' }];
      }
      
      return (
        <select
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className={commonClasses}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') saveCellEdit();
            if (e.key === 'Escape') cancelCellEdit();
          }}
        >
          <option value="">Select...</option>
          {options.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
    } else if (column.type === 'date') {
      return (
        <input
          type="date"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className={commonClasses}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') saveCellEdit();
            if (e.key === 'Escape') cancelCellEdit();
          }}
        />
      );
    } else if (column.type === 'textarea') {
      return (
        <textarea
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className={`${commonClasses} resize-y min-h-[60px]`}
          rows="2"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              saveCellEdit();
            }
            if (e.key === 'Escape') cancelCellEdit();
          }}
        />
      );
    } else if (column.type === 'number') {
      return (
        <input
          type="number"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className={commonClasses}
          autoFocus
          min={column.id === 'sno' ? "1" : undefined}
          step={column.id === 'sno' ? "1" : "any"}
          onKeyDown={(e) => {
            if (e.key === 'Enter') saveCellEdit();
            if (e.key === 'Escape') cancelCellEdit();
          }}
        />
      );
    } else {
      return (
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className={commonClasses}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') saveCellEdit();
            if (e.key === 'Escape') cancelCellEdit();
          }}
        />
      );
    }
  };

  // Render input for full row edit mode
  const renderRowEditInput = (column, value, onChange) => {
    const commonClasses = "w-full px-2 py-1 text-xs sm:text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500";
    
    if (column.type === 'select') {
      let options = [];
      switch(column.id) {
        case 'criticality':
          options = CRITICALITY_OPTIONS;
          break;
        case 'status':
          options = STATUS_OPTIONS;
          break;
        case 'function':
          options = FUNCTION_OPTIONS;
          break;
        case 'remainder':
          options = REMINDER_OPTIONS;
          break;
        case 'action_taken_approval':
          options = APPROVAL_OPTIONS;
          break;
        default:
          options = [{ value: 'option1', label: 'Option 1' }, { value: 'option2', label: 'Option 2' }];
      }
      
      return (
        <select
          value={value || ''}
          onChange={(e) => onChange(column.id, e.target.value)}
          className={commonClasses}
        >
          <option value="">Select...</option>
          {options.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
    } else if (column.type === 'date') {
      return (
        <input
          type="date"
          value={value || ''}
          onChange={(e) => onChange(column.id, e.target.value)}
          className={commonClasses}
        />
      );
    } else if (column.type === 'textarea') {
      return (
        <textarea
          value={value || ''}
          onChange={(e) => onChange(column.id, e.target.value)}
          className={`${commonClasses} resize-y min-h-[60px]`}
          rows="2"
        />
      );
    } else if (column.type === 'number') {
      return (
        <input
          type="number"
          value={value || ''}
          onChange={(e) => onChange(column.id, e.target.value)}
          className={commonClasses}
          min={column.id === 'sno' ? "1" : undefined}
          step={column.id === 'sno' ? "1" : "any"}
        />
      );
    } else {
      return (
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(column.id, e.target.value)}
          className={commonClasses}
        />
      );
    }
  };

  // Render cell content
  const renderCellContent = (meeting, column) => {
    const value = meeting[column.id] || '';
    
    // Handle action columns (View, Edit, Delete)
    if (column.type === 'action') {
      if (column.id === 'view_action') {
        return (
          <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
            <button 
              onClick={() => {/* Add view functionality */}}
              className="p-1 text-blue-600 hover:text-blue-800 bg-blue-50 rounded border border-blue-200"
              title="View details"
            >
              <Icons.Eye className="h-3 w-3" />
            </button>
          </div>
        );
      }
      if (column.id === 'edit_action') {
        return (
          <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0 delay-75">
            <button 
              onClick={() => startEditing(meeting)}
              className="p-1 text-green-600 hover:text-green-800 bg-green-50 rounded border border-green-200"
              title="Edit entire row"
            >
              <Icons.Edit className="h-3 w-3" />
            </button>
          </div>
        );
      }
      if (column.id === 'delete_action') {
        const isConfirming = confirmingDeleteId === meeting.id;
        return (
          <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0 delay-150">
            {isConfirming ? (
              <button 
                onClick={() => {
                  if (onDeleteMeeting) onDeleteMeeting(meeting.id);
                  setConfirmingDeleteId(null);
                }}
                onMouseLeave={() => setConfirmingDeleteId(null)}
                className="px-2 py-0.5 text-[10px] sm:text-xs font-bold text-white bg-red-600 rounded shadow hover:bg-red-700 animate-[shake_0.5s_ease-in-out]"
                style={{ animationIterationCount: '1' }}
                title="Confirm delete"
              >
                Confirm?
              </button>
            ) : (
              <button 
                onClick={() => setConfirmingDeleteId(meeting.id)}
                className="p-1 text-red-600 hover:text-red-800 bg-red-50 rounded border border-red-200"
                title="Delete row"
              >
                <Icons.Trash2 className="h-3 w-3" />
              </button>
            )}
          </div>
        );
      }
    }
    
    // INLINE EDITING MODE - Shows input in the same cell
    if (editingCell.id === meeting.id && editingCell.column === column.id && column.editable) {
      return (
        <div className="relative">
          {renderInlineInput(column, editForm[column.id], handleInlineEditChange)}
          <div className="absolute -right-8 top-0 flex space-x-1">
            <button 
              onClick={() => {
                if (column.id === 'sno') {
                  handleSnoEdit(meeting.id, editForm[column.id]);
                } else {
                  saveCellEdit();
                }
              }}
              className="p-1 text-green-600 hover:text-green-800 bg-white rounded shadow"
              title="Save (Enter)"
            >
              <Icons.Check className="h-3 w-3" />
            </button>
            <button 
              onClick={cancelCellEdit}
              className="p-1 text-red-600 hover:text-red-800 bg-white rounded shadow"
              title="Cancel (Esc)"
            >
              <Icons.X className="h-3 w-3" />
            </button>
          </div>
        </div>
      );
    }

    // VIEW MODE - Normal display
    if (column.id === 'criticality') {
      const criticalityInfo = getCriticalityInfo(value);
      return (
        <span className={`px-2 py-1 rounded-full text-[10px] sm:text-xs font-medium ${criticalityInfo.color}`}>
          {criticalityInfo.label}
        </span>
      );
    } else if (column.id === 'status') {
      const statusInfo = getStatusInfo(value);
      const isLive = value === 'in-progress';
      return (
        <span className={`px-2 py-1 rounded-full text-[10px] sm:text-xs font-medium inline-flex items-center w-max transition-colors duration-500 ${statusInfo.color}`}>
          {isLive && (
            <span className="relative flex h-2 w-2 mr-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
          )}
          {statusInfo.label}
        </span>
      );
    } else if (column.id === 'function') {
      const functionInfo = getFunctionInfo(value);
      return (
        <span className="text-xs sm:text-sm font-medium text-gray-700">
          {functionInfo?.label || value}
        </span>
      );
    } else if (column.id === 'remainder') {
      const remainderInfo = getRemainderInfo(value);
      return (
        <div className="flex items-center space-x-1">
          <Icons.Bell className="h-3 w-3 text-gray-500" />
          <span className="text-xs sm:text-sm text-gray-700">
            {remainderInfo?.label || value}
          </span>
        </div>
      );
    } else if (column.id === 'action_taken_approval') {
      const approvalInfo = getApprovalInfo(value);
      return (
        <span className={`px-2 py-1 rounded text-[10px] sm:text-xs font-medium ${approvalInfo.color}`}>
          {approvalInfo.label}
        </span>
      );
    } else if (column.id === 'sno') {
      return (
        <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center cursor-pointer hover:bg-blue-200 transition-colors">
          <span className="text-xs font-medium text-blue-600">
            {value}
          </span>
        </div>
      );
    } else if (column.type === 'date' && value) {
      const date = new Date(value);
      const today = new Date();
      const isOverdue = date < today && meeting.status !== 'completed';
      
      return (
        <div className={`text-xs sm:text-sm ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-700'}`}>
          {date.toLocaleDateString()}
          {isOverdue && <span className="ml-1 text-[10px] text-red-500">(Overdue)</span>}
        </div>
      );
    } else if (column.id === 'project_name') {
      return (
        <div className="text-xs sm:text-sm font-semibold text-gray-800 truncate">
          {value || '-'}
        </div>
      );
    } else if (column.id === 'responsibility') {
      return (
        <div className="text-xs sm:text-sm font-medium text-purple-600">
          {value || '-'}
        </div>
      );
    } else if (column.id === 'Discussion Point') {
      return (
        <div className="text-xs sm:text-sm text-gray-700 line-clamp-2">
          {value || '-'}
        </div>
      );
    }
    
    // Default text display
    return (
      <div className="text-xs sm:text-sm text-gray-700 truncate">
        {value || '-'}
      </div>
    );
  };

  // Render column header - SIMPLIFIED VERSION
  const renderColumnHeader = (column) => {
    // HEADER EDITING MODE
    if (editingColumnHeader === column.id) {
      return (
        <div className="relative">
          <input
            ref={headerInputRef}
            type="text"
            value={tempColumnName}
            onChange={(e) => setTempColumnName(e.target.value)}
            onKeyDown={handleHeaderKeyDown}
            onBlur={handleHeaderBlur}
            className="w-full px-2 py-1 text-xs sm:text-sm font-medium border border-blue-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Column name"
          />
          <div className="absolute -right-8 top-0 flex space-x-1">
            <button 
              onClick={saveHeaderEdit}
              className="p-1 text-green-600 hover:text-green-800 bg-white rounded shadow"
              title="Save (Enter)"
            >
              <Icons.Check className="h-3 w-3" />
            </button>
            <button 
              onClick={cancelHeaderEdit}
              className="p-1 text-red-600 hover:text-red-800 bg-white rounded shadow"
              title="Cancel (Esc)"
            >
              <Icons.X className="h-3 w-3" />
            </button>
          </div>
        </div>
      );
    }

    // NORMAL HEADER VIEW - SIMPLIFIED WITHOUT SYMBOLS
    return (
      <div className="flex items-center justify-between">
        <span 
          className="cursor-pointer hover:text-blue-600 transition-colors font-medium text-gray-700" 
          onDoubleClick={() => startHeaderEditing(column.id, column.label)}
          title="Double click to edit column name"
        >
          {column.label}
        </span>
        <div className="flex items-center space-x-1">
          {column.sortable && (
            <button 
              onClick={() => handleSort(column.id)}
              className="text-gray-400 hover:text-gray-600"
              title="Sort"
            >
              {getSortIcon(column.id)}
            </button>
          )}
          {column.deletable && column.type !== 'action' && (
            <button 
              onClick={() => handleDeleteColumn(column.id)}
              className="text-gray-400 hover:text-red-600"
              title="Delete column"
            >
              <Icons.X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Delete Meeting Prompt Modal */}
      {showDeletePrompt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded p-3 sm:p-4 max-w-sm w-full mx-3">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-900">Confirm Delete</h3>
              <button onClick={cancelDelete} className="text-gray-400 hover:text-gray-600">
                <Icons.X className="h-4 w-4" />
              </button>
            </div>
            <div className="mb-3">
              <p className="text-xs text-gray-600">
                Are you sure you want to delete meeting point for <span className="font-medium">{showDeletePrompt.projectName}</span>?
              </p>
              <p className="text-xs text-red-600 mt-1">This action cannot be undone.</p>
            </div>
            <div className="flex justify-end space-x-2">
              <button
                onClick={cancelDelete}
                className="px-3 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteMeeting}
                className="px-3 py-1.5 text-xs bg-red-600 text-white rounded hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Column Form Modal */}
      {showAddColumnForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded p-3 sm:p-4 max-w-sm w-full mx-3">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-900">Add New Column</h3>
              <button 
                onClick={() => {
                  setShowAddColumnForm(false);
                  setNewColumnName('');
                }} 
                className="text-gray-400 hover:text-gray-600"
              >
                <Icons.X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-700 mb-1">
                  Column Name
                </label>
                <input
                  ref={newColumnInputRef}
                  type="text"
                  value={newColumnName}
                  onChange={(e) => setNewColumnName(e.target.value)}
                  onKeyDown={handleNewColumnKeyDown}
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter column name"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-700 mb-1">
                  Data Type
                </label>
                <select
                  value={newColumnType}
                  onChange={(e) => setNewColumnType(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                >
                  {COLUMN_TYPES.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => {
                    setShowAddColumnForm(false);
                    setNewColumnName('');
                  }}
                  className="px-3 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddColumn}
                  className="px-3 py-1.5 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Add Column
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Meeting Summary Modal */}
      {showAddSummary && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded p-3 sm:p-4 max-w-sm w-full mx-3">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-900">Add Meeting Summary</h3>
              <button 
                onClick={() => {
                  setShowAddSummary(false);
                  setSummaryTitle('');
                  setMeetingSummary('');
                }} 
                className="text-gray-400 hover:text-gray-600"
              >
                <Icons.X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-700 mb-1">
                  Summary Title
                </label>
                <input
                  ref={summaryInputRef}
                  type="text"
                  value={summaryTitle}
                  onChange={(e) => setSummaryTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter summary title"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-700 mb-1">
                  Meeting Summary
                </label>
                <textarea
                  value={meetingSummary}
                  onChange={(e) => setMeetingSummary(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-y min-h-[100px]"
                  placeholder="Enter detailed meeting summary..."
                  rows="4"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => {
                    setShowAddSummary(false);
                    setSummaryTitle('');
                    setMeetingSummary('');
                  }}
                  className="px-3 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddMeetingSummary}
                  disabled={!summaryTitle.trim() || !meetingSummary.trim()}
                  className="px-3 py-1.5 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add Summary
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Export Menu Modal */}
      {showExportMenu && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded p-3 sm:p-4 max-w-sm w-full mx-3">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-900">Export Options</h3>
              <button 
                onClick={() => setShowExportMenu(false)} 
                className="text-gray-400 hover:text-gray-600"
              >
                <Icons.X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-2">
              <button
                onClick={() => {
                  exportToCSV();
                  setShowExportMenu(false);
                }}
                className="w-full flex items-center justify-between p-3 text-left bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Icons.FileText className="h-4 w-4 text-green-600" />
                  <div>
                    <span className="text-xs font-medium">CSV Format</span>
                    <p className="text-xs text-gray-500">Comma separated values</p>
                  </div>
                </div>
                <Icons.Download className="h-4 w-4 text-gray-400" />
              </button>
              
              <button
                onClick={() => {
                  exportToExcel();
                  setShowExportMenu(false);
                }}
                className="w-full flex items-center justify-between p-3 text-left bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Icons.FileSpreadsheet className="h-4 w-4 text-green-700" />
                  <div>
                    <span className="text-xs font-medium">Excel Format</span>
                    <p className="text-xs text-gray-500">Microsoft Excel (.xlsx)</p>
                  </div>
                </div>
                <Icons.Download className="h-4 w-4 text-gray-400" />
              </button>
              
              <button
                onClick={() => {
                  exportToPDF();
                  setShowExportMenu(false);
                }}
                className="w-full flex items-center justify-between p-3 text-left bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Icons.File className="h-4 w-4 text-red-600" />
                  <div>
                    <span className="text-xs font-medium">PDF Format</span>
                    <p className="text-xs text-gray-500">Portable Document Format</p>
                  </div>
                </div>
                <Icons.Download className="h-4 w-4 text-gray-400" />
              </button>
              
              <button
                onClick={() => {
                  exportToWord();
                  setShowExportMenu(false);
                }}
                className="w-full flex items-center justify-between p-3 text-left bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Icons.FileText className="h-4 w-4 text-blue-600" />
                  <div>
                    <span className="text-xs font-medium">Word Format</span>
                    <p className="text-xs text-gray-500">Microsoft Word (.doc)</p>
                  </div>
                </div>
                <Icons.Download className="h-4 w-4 text-gray-400" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table Container with Toolbar - REMOVED Meeting Statistics Dashboard */}
      <div className="bg-white border border-gray-300 rounded p-3 sm:p-4">
        {/* Toolbar - UPDATED WITH EXPORT MENU */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0 mb-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
            {/* Search */}
            <div className="relative w-full sm:w-48">
              <Icons.Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search meetings..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm border border-gray-300 rounded"
              />
            </div>
            
            {/* Add Column Button */}
            <button
              onClick={() => setShowAddColumnForm(true)}
              className="flex items-center justify-center space-x-1 px-3 py-2 text-xs sm:text-sm bg-green-600 text-white rounded hover:bg-green-700 w-full sm:w-auto"
            >
              <Icons.Plus className="h-3 w-3" />
              <span>Add Column</span>
            </button>
          </div>
          
          <div className="flex items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0">
            {/* Export Button with Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(true)}
                className="flex items-center justify-center space-x-1 px-3 py-2 text-xs sm:text-sm bg-black text-white rounded hover:bg-gray-800 w-full sm:w-auto"
              >
                <Icons.Download className="h-3 w-3" />
                <span>Export</span>
                <Icons.ChevronDown className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto border border-gray-200 rounded">
          <table className="w-full text-xs sm:text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-300">
                {/* Render columns in original order */}
                {columns
                  .filter(col => col.visible)
                  .map((column) => (
                    <th 
                      key={column.id}
                      className="text-left py-2 px-2 sm:px-3 font-medium text-gray-700 min-w-[100px]"
                    >
                      {renderColumnHeader(column)}
                    </th>
                  ))}
              </tr>
            </thead>
            <tbody>
              {sortedMeetings.map((meeting) => (
                <tr 
                  key={meeting.id} 
                  className={`group border-b border-gray-200 hover:bg-gray-50 transition-colors duration-200 ${meeting.is_summary ? 'bg-purple-50' : ''}`}
                >
                  {/* FULL ROW EDIT MODE */}
                  {editingId === meeting.id ? (
                    <>
                      {columns
                        .filter(col => col.visible)
                        .map((column) => (
                          <td key={column.id} className="py-2 px-2 sm:px-3">
                            {column.editable ? (
                              renderRowEditInput(column, editForm[column.id], handleEditFormChange)
                            ) : (
                              <div className="text-xs sm:text-sm text-gray-700">
                                {renderCellContent(meeting, column)}
                              </div>
                            )}
                          </td>
                        ))}
                    </>
                  ) : (
                    <>
                      {/* VIEW MODE WITH INLINE EDITING */}
                      {columns
                        .filter(col => col.visible)
                        .map((column) => (
                          <td 
                            key={column.id} 
                            className="py-2 px-2 sm:px-3"
                            onDoubleClick={() => {
                              if (column.editable && column.type !== 'action') {
                                startCellEditing(meeting.id, column.id, meeting[column.id]);
                              }
                            }}
                            style={{ cursor: (column.editable && column.type !== 'action') ? 'pointer' : 'default' }}
                          >
                            {renderCellContent(meeting, column)}
                          </td>
                        ))}
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Empty State */}
        {sortedMeetings.length === 0 && (
          <div className="text-center py-8">
            <Icons.FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-sm font-medium text-gray-900 mb-1">No meeting points found</h3>
            <p className="text-xs text-gray-500">
              {searchTerm ? 'Try changing your search terms' : 'Start by adding meeting points using speech-to-text'}
            </p>
          </div>
        )}
        
        {/* Pagination/Summary */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-0 mt-3 pt-3 border-t border-gray-300">
          <div className="text-[10px] sm:text-xs text-gray-600">
            Showing {sortedMeetings.length} of {meetings.length} meeting points • 
            {columns.filter(c => c.visible).length} columns visible
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-500">Export as:</span>
            <button 
              onClick={exportToCSV}
              className="text-[10px] px-2 py-1 border border-gray-300 rounded hover:bg-gray-50"
            >
              CSV
            </button>
            <button 
              onClick={exportToExcel}
              className="text-[10px] px-2 py-1 border border-gray-300 rounded hover:bg-gray-50"
            >
              Excel
            </button>
            <button 
              onClick={exportToPDF}
              className="text-[10px] px-2 py-1 border border-gray-300 rounded hover:bg-gray-50"
            >
              PDF
            </button>
            <button 
              onClick={exportToWord}
              className="text-[10px] px-2 py-1 border border-gray-300 rounded hover:bg-gray-50"
            >
              Word
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MeetingTable;