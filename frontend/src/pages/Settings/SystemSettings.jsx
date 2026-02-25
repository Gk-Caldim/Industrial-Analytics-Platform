import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Edit, Trash2, X, Check, 
  ChevronUp, ChevronDown, Filter, Download,
  Eye, EyeOff, Settings, Bell, Shield, 
  Database, RefreshCw, Globe, Clock,
  Lock, Upload, Columns, GitBranch, GitCommit,
  QrCode, FileText, HardDrive, DatabaseBackup,
  UserPlus, Mail, Calendar, ShieldCheck,
  CheckSquare, Square
} from 'lucide-react';

const SystemSettings = () => {
  // Simplified system settings configuration
  const initialSettings = [
    // General Settings
    { 
      id: 'app_name', 
      category: 'General',
      label: 'Application Name', 
      value: 'Employee Portal',
      type: 'text',
      description: 'Display name of the application',
      editable: true,
      required: true,
      deletable: false,
      icon: 'Settings'
    },
    { 
      id: 'timezone', 
      category: 'General',
      label: 'Time Zone', 
      value: 'UTC',
      type: 'select',
      options: ['UTC', 'EST', 'PST', 'IST', 'GMT'],
      description: 'Default time zone for the system',
      editable: true,
      required: true,
      deletable: false,
      icon: 'Globe'
    },
    { 
      id: 'date_format', 
      category: 'General',
      label: 'Date Format', 
      value: 'MM/DD/YYYY',
      type: 'select',
      options: ['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'],
      description: 'Default date display format',
      editable: true,
      required: true,
      deletable: false,
      icon: 'Calendar'
    },

    // Security Settings
    { 
      id: 'session_timeout', 
      category: 'Security',
      label: 'Session Timeout', 
      value: '30',
      type: 'number',
      unit: 'minutes',
      description: 'User session timeout duration',
      editable: true,
      required: true,
      deletable: false,
      icon: 'Clock'
    },
    { 
      id: 'password_expiry', 
      category: 'Security',
      label: 'Password Expiry', 
      value: '90',
      type: 'number',
      unit: 'days',
      description: 'Password expiry duration',
      editable: true,
      required: true,
      deletable: false,
      icon: 'Shield'
    },
    { 
      id: 'two_factor_auth', 
      category: 'Security',
      label: 'Two-Factor Authentication', 
      value: false,
      type: 'toggle',
      description: 'Enable 2FA for all users',
      editable: true,
      required: false,
      deletable: false,
      icon: 'ShieldCheck'
    },

    // Notification Settings
    { 
      id: 'email_notifications', 
      category: 'Notifications',
      label: 'Email Notifications', 
      value: true,
      type: 'toggle',
      description: 'Enable email notifications',
      editable: true,
      required: false,
      deletable: false,
      icon: 'Mail'
    },
    { 
      id: 'push_notifications', 
      category: 'Notifications',
      label: 'Push Notifications', 
      value: false,
      type: 'toggle',
      description: 'Enable push notifications',
      editable: true,
      required: false,
      deletable: false,
      icon: 'Bell'
    },

    // Employee Master Related Settings
    { 
      id: 'employee_auto_id', 
      category: 'Employee Management',
      label: 'Auto-generate Employee ID', 
      value: true,
      type: 'toggle',
      description: 'Automatically generate unique employee IDs',
      editable: true,
      required: false,
      deletable: false,
      icon: 'UserPlus'
    },
    { 
      id: 'employee_columns', 
      category: 'Employee Management',
      label: 'Customizable Columns', 
      value: true,
      type: 'toggle',
      description: 'Allow adding custom columns to employee table',
      editable: true,
      required: false,
      deletable: false,
      icon: 'Columns'
    },

    // Department Master Settings
    { 
      id: 'department_hierarchy', 
      category: 'Department Management',
      label: 'Department Hierarchy', 
      value: true,
      type: 'toggle',
      description: 'Enable hierarchical department structure',
      editable: true,
      required: false,
      deletable: false,
      icon: 'GitBranch'
    },

    // Project Master Settings
    { 
      id: 'project_auto_number', 
      category: 'Project Management',
      label: 'Auto Project Numbering', 
      value: true,
      type: 'toggle',
      description: 'Automatically generate project numbers',
      editable: true,
      required: false,
      deletable: false,
      icon: 'GitCommit'
    },

    // Part Master Settings
    { 
      id: 'part_barcode', 
      category: 'Part Management',
      label: 'Barcode Generation', 
      value: true,
      type: 'toggle',
      description: 'Generate barcodes for parts automatically',
      editable: true,
      required: false,
      deletable: false,
      icon: 'QrCode'
    },

    // Upload Trackers Settings
    { 
      id: 'auto_file_naming', 
      category: 'File Management',
      label: 'Auto File Naming', 
      value: true,
      type: 'toggle',
      description: 'Automatically rename uploaded files',
      editable: true,
      required: false,
      deletable: false,
      icon: 'FileText'
    },
    { 
      id: 'max_file_size', 
      category: 'File Management',
      label: 'Max File Size', 
      value: '10',
      type: 'number',
      unit: 'MB',
      description: 'Maximum file upload size',
      editable: true,
      required: true,
      deletable: false,
      icon: 'HardDrive'
    },

    // Backup Settings
    { 
      id: 'auto_backup', 
      category: 'Backup',
      label: 'Auto Backup', 
      value: true,
      type: 'toggle',
      description: 'Enable automatic daily backups',
      editable: true,
      required: false,
      deletable: false,
      icon: 'DatabaseBackup'
    },
  ];

  // Load settings from localStorage
  const [settings, setSettings] = useState(() => {
    const savedSettings = localStorage.getItem('system_settings');
    return savedSettings ? JSON.parse(savedSettings) : initialSettings;
  });

  // Columns configuration for table
  const columns = [
    { id: 'category', label: 'Category', sortable: true, type: 'text', required: false, visible: true },
    { id: 'label', label: 'Setting', sortable: true, type: 'text', required: false, visible: true },
    { id: 'value', label: 'Current Value', sortable: true, type: 'text', required: false, visible: true },
    { id: 'description', label: 'Description', sortable: true, type: 'text', required: false, visible: true },
  ];

  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [showResetModal, setShowResetModal] = useState(false);
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [showAddSettingModal, setShowAddSettingModal] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [backupData, setBackupData] = useState('');
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  const [sortConfig, setSortConfig] = useState({ key: 'category', direction: 'ascending' });
  const [columnFilter, setColumnFilter] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [selectedSettings, setSelectedSettings] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [showBulkDeletePrompt, setShowBulkDeletePrompt] = useState(false);
  const [showDeleteSettingPrompt, setShowDeleteSettingPrompt] = useState(null);

  // New setting state
  const [newSetting, setNewSetting] = useState({
    category: 'General',
    label: '',
    type: 'text',
    value: '',
    description: '',
    icon: 'Settings'
  });

  // Icon mapping
  const iconComponents = {
    Settings, Bell, Shield, Database, RefreshCw, Globe, Clock,
    Lock, Mail, Calendar, ShieldCheck, UserPlus, Columns,
    GitBranch, GitCommit, QrCode, FileText, HardDrive, DatabaseBackup
  };

  // Get icon component
  const getIconComponent = (iconName) => {
    const Icon = iconComponents[iconName] || Settings;
    return <Icon className="h-4 w-4" />;
  };

  // Show notification
  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: '', type: '' });
    }, 3000);
  };

  // Save settings to localStorage
  useEffect(() => {
    localStorage.setItem('system_settings', JSON.stringify(settings));
  }, [settings]);

  // Get unique categories
  const categories = ['All Categories', ...new Set(settings.map(setting => setting.category))];

  // Filter settings based on search and category
  const filteredSettings = settings.filter(setting => {
    const matchesSearch = Object.values(setting).some(value => 
      String(value).toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    const matchesColumnFilter = !columnFilter || Object.values(setting).some(v => 
      String(v).toLowerCase().includes(columnFilter.toLowerCase())
    );
    
    const matchesCategory = selectedCategory === 'All Categories' || 
                           setting.category === selectedCategory;
    
    return matchesSearch && matchesColumnFilter && matchesCategory;
  });

  // Sorting
  const handleSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') direction = 'descending';
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return <ChevronUp className="h-3 w-3 sm:h-4 sm:w-4 opacity-30" />;
    return sortConfig.direction === 'ascending' ? <ChevronUp className="h-3 w-3 sm:h-4 sm:w-4" /> : <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4" />;
  };

  // Sort settings
  const sortedSettings = React.useMemo(() => {
    if (!sortConfig.key) return filteredSettings;
    return [...filteredSettings].sort((a, b) => {
      const aVal = a[sortConfig.key] || '';
      const bVal = b[sortConfig.key] || '';
      if (aVal < bVal) return sortConfig.direction === 'ascending' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'ascending' ? 1 : -1;
      return 0;
    });
  }, [filteredSettings, sortConfig]);

  // Checkbox Functions
  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedSettings([]);
      setSelectAll(false);
    } else {
      const allVisibleIds = sortedSettings.map(setting => setting.id);
      setSelectedSettings(allVisibleIds);
      setSelectAll(true);
    }
  };

  const toggleSettingSelection = (settingId) => {
    setSelectedSettings(prev => {
      if (prev.includes(settingId)) {
        const newSelection = prev.filter(id => id !== settingId);
        setSelectAll(false);
        return newSelection;
      } else {
        const newSelection = [...prev, settingId];
        const allVisibleIds = sortedSettings.map(setting => setting.id);
        if (newSelection.length === allVisibleIds.length) {
          setSelectAll(true);
        }
        return newSelection;
      }
    });
  };

  // Bulk delete function
  const handleBulkDelete = () => {
    const deletableSettings = selectedSettings.filter(id => {
      const setting = settings.find(s => s.id === id);
      return setting && setting.deletable;
    });

    if (deletableSettings.length === 0) {
      showNotification('No deletable settings selected', 'error');
      return;
    }
    
    setShowBulkDeletePrompt({
      show: true,
      count: deletableSettings.length
    });
  };

  const confirmBulkDelete = () => {
    const deletableSettings = selectedSettings.filter(id => {
      const setting = settings.find(s => s.id === id);
      return setting && setting.deletable;
    });

    setSettings(settings.filter(setting => !deletableSettings.includes(setting.id)));
    setSelectedSettings([]);
    setSelectAll(false);
    setShowBulkDeletePrompt({ show: false, count: 0 });
    showNotification(`${deletableSettings.length} custom settings deleted successfully`);
  };

  // Start editing a setting
  const startEditing = (setting) => {
    setEditingId(setting.id);
    setEditValue(setting.value);
  };

  // Save edit
  const saveEdit = () => {
    if (editingId) {
      setSettings(settings.map(setting => 
        setting.id === editingId ? { ...setting, value: editValue } : setting
      ));
      setEditingId(null);
      setEditValue('');
      showNotification('Setting updated successfully');
    }
  };

  // Cancel edit
  const cancelEdit = () => {
    setEditingId(null);
    setEditValue('');
  };

  // Delete a setting
  const showDeleteConfirmation = (id, label) => {
    const setting = settings.find(s => s.id === id);
    if (!setting || !setting.deletable) {
      showNotification('Cannot delete system default settings', 'error');
      return;
    }
    setShowDeleteSettingPrompt({ id, label });
  };

  const confirmDeleteSetting = () => {
    if (showDeleteSettingPrompt) {
      setSettings(settings.filter(setting => setting.id !== showDeleteSettingPrompt.id));
      setShowDeleteSettingPrompt(null);
      showNotification('Setting deleted successfully');
    }
  };

  // Reset all settings to defaults
  const resetToDefaults = () => {
    setSettings(initialSettings);
    setShowResetModal(false);
    showNotification('All settings reset to defaults');
  };

  // Export settings as JSON
  const exportSettings = (format = 'json') => {
    if (settings.length === 0) {
      showNotification('No settings to export', 'error');
      return;
    }
    
    const dataToExport = sortedSettings.map(setting => {
      const { deletable, ...rest } = setting;
      return rest;
    });
    
    let content, mimeType, filename;
   
    switch(format) {
      case 'json':
        content = JSON.stringify(dataToExport, null, 2);
        mimeType = 'application/json';
        filename = `system_settings_${new Date().toISOString().split('T')[0]}.json`;
        break;
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
   
    setShowExportDropdown(false);
    showNotification(`Export to ${format.toUpperCase()} completed successfully`);
  };

  // Handle backup file upload
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const importedSettings = JSON.parse(e.target.result);
          if (Array.isArray(importedSettings)) {
            // Only add new settings, don't replace system defaults
            const newSettings = importedSettings.filter(imported => 
              !settings.some(existing => existing.id === imported.id)
            );
            
            if (newSettings.length > 0) {
              setSettings([...settings, ...newSettings.map(s => ({ ...s, deletable: true }))]);
              showNotification(`${newSettings.length} new settings imported successfully`);
            } else {
              showNotification('No new settings to import', 'info');
            }
          } else {
            showNotification('Invalid backup file format', 'error');
          }
        } catch (error) {
          showNotification('Error parsing backup file', 'error');
        }
      };
      reader.readAsText(file);
    }
    setShowBackupModal(false);
  };

  // Add new setting
  const handleAddSetting = () => {
    if (newSetting.label.trim() && newSetting.category.trim()) {
      const newId = 'custom_' + newSetting.label.toLowerCase().replace(/[^a-z0-9]/g, '_');
      
      if (settings.find(s => s.id === newId)) {
        showNotification('Setting with this label already exists', 'error');
        return;
      }
      
      const settingToAdd = {
        id: newId,
        category: newSetting.category,
        label: newSetting.label,
        type: newSetting.type,
        value: newSetting.type === 'toggle' ? false : newSetting.value,
        description: newSetting.description,
        editable: true,
        required: false,
        deletable: true,
        icon: newSetting.icon || 'Settings'
      };
      
      setSettings([...settings, settingToAdd]);
      setShowAddSettingModal(false);
      setNewSetting({
        category: 'General',
        label: '',
        type: 'text',
        value: '',
        description: '',
        icon: 'Settings'
      });
      showNotification('Custom setting added successfully');
    } else {
      showNotification('Please fill all required fields', 'error');
    }
  };

  // Quick toggle function
  const quickToggle = (settingId) => {
    const setting = settings.find(s => s.id === settingId);
    if (setting && setting.type === 'toggle') {
      const newValue = !(setting.value === true || setting.value === 'true');
      setSettings(settings.map(s => 
        s.id === settingId ? { ...s, value: newValue } : s
      ));
    }
  };

  // Render input based on setting type
  const renderInput = (setting) => {
    if (setting.type === 'toggle') {
      return (
        <div className="flex items-center">
          <div className="relative inline-block w-10 mr-2 align-middle select-none">
            <input
              type="checkbox"
              checked={editValue === true || editValue === 'true'}
              onChange={(e) => setEditValue(e.target.checked)}
              className="sr-only"
              id={`toggle-${setting.id}`}
            />
            <label
              htmlFor={`toggle-${setting.id}`}
              className={`block overflow-hidden h-5 rounded-full cursor-pointer transition-colors ${
                editValue === true || editValue === 'true' ? 'bg-green-500' : 'bg-gray-300'
              }`}
            >
              <span
                className={`block h-5 w-5 rounded-full bg-white transform transition-transform ${
                  editValue === true || editValue === 'true' ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </label>
          </div>
          <span className="text-xs text-gray-600">
            {editValue === true || editValue === 'true' ? 'ON' : 'OFF'}
          </span>
        </div>
      );
    } else if (setting.type === 'select') {
      return (
        <select
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          className="w-full px-3 py-1.5 text-xs sm:text-sm border border-gray-300 rounded"
        >
          {setting.options?.map(option => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      );
    } else if (setting.type === 'number') {
      return (
        <div className="flex items-center">
          <input
            type="number"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="w-full px-3 py-1.5 text-xs sm:text-sm border border-gray-300 rounded"
            min="0"
          />
          {setting.unit && (
            <span className="ml-2 text-xs text-gray-600">{setting.unit}</span>
          )}
        </div>
      );
    } else {
      return (
        <input
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          className="w-full px-3 py-1.5 text-xs sm:text-sm border border-gray-300 rounded"
        />
      );
    }
  };

  // Render display value based on setting type
  const renderDisplayValue = (setting) => {
    if (setting.type === 'toggle') {
      const isEnabled = setting.value === true || setting.value === 'true';
      return (
        <div className="flex items-center">
          <div className="relative inline-block w-10 mr-2 align-middle select-none">
            <div className={`block overflow-hidden h-5 rounded-full ${
              isEnabled ? 'bg-green-500' : 'bg-gray-300'
            }`}>
              <span
                className={`block h-5 w-5 rounded-full bg-white transform ${
                  isEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </div>
          </div>
          <span className={`text-xs ${isEnabled ? 'text-green-600 font-medium' : 'text-gray-600'}`}>
            {isEnabled ? 'ON' : 'OFF'}
          </span>
        </div>
      );
    } else if (setting.type === 'select') {
      return (
        <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">
          {setting.value}
        </span>
      );
    } else if (setting.type === 'number') {
      return (
        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
          {setting.value} {setting.unit && setting.unit}
        </span>
      );
    } else {
      return (
        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs break-all">
          {setting.value}
        </span>
      );
    }
  };

  return (
    <div className="space-y-3 sm:space-y-4 px-0 relative">
      {/* Notification Banner */}
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

      {/* Reset Confirmation Modal */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 sm:p-6 max-w-sm w-full mx-4">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h3 className="font-medium text-gray-900 text-sm sm:text-base">Reset Settings</h3>
              <button onClick={() => setShowResetModal(false)} className="p-1 text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4 sm:h-5 sm:w-5"/>
              </button>
            </div>
            <div className="mb-4">
              <p className="text-xs sm:text-sm text-gray-600">
                Are you sure you want to reset all settings to default values?
              </p>
              <p className="text-xs text-red-600 mt-1">This action cannot be undone.</p>
            </div>
            <div className="flex justify-end space-x-2">
              <button onClick={() => setShowResetModal(false)} className="px-3 py-1.5 text-xs sm:text-sm border border-gray-300 rounded hover:bg-gray-50">Cancel</button>
              <button onClick={resetToDefaults} className="px-3 py-1.5 text-xs sm:text-sm bg-red-600 text-white rounded hover:bg-red-700">Reset All</button>
            </div>
          </div>
        </div>
      )}

      {/* Backup/Restore Modal */}
      {showBackupModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 sm:p-6 max-w-sm w-full mx-4">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h3 className="font-medium text-gray-900 text-sm sm:text-base">Backup & Restore</h3>
              <button onClick={() => setShowBackupModal(false)} className="p-1 text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            </div>
            
            <div className="space-y-3 mb-4">
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center">
                  <Download className="h-4 w-4 mr-2" />
                  Export Settings
                </h4>
                <p className="text-xs text-gray-600 mb-2">
                  Download all current settings as a JSON file
                </p>
                <button
                  onClick={() => exportSettings('json')}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-black text-white rounded hover:bg-gray-800 flex items-center justify-center"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export to JSON
                </button>
              </div>

              <div className="pt-3 border-t border-gray-300">
                <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center">
                  <Upload className="h-4 w-4 mr-2" />
                  Import Settings
                </h4>
                <p className="text-xs text-gray-600 mb-2">
                  Upload a JSON file to import new settings
                </p>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  className="w-full mb-2 text-xs border border-gray-300 rounded p-2"
                />
                <p className="text-xs text-gray-500 italic">
                  Note: Only new settings will be added. System defaults cannot be overwritten.
                </p>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setShowBackupModal(false)}
                className="px-3 py-1.5 text-xs sm:text-sm border border-gray-300 rounded hover:bg-gray-50"
              >
                Close
              </button>
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
                <X className="h-4 w-4 sm:h-5 sm:w-5"/>
              </button>
            </div>
            <div className="mb-4">
              <p className="text-xs sm:text-sm text-gray-600">
                Are you sure you want to delete {showBulkDeletePrompt.count} selected custom setting{showBulkDeletePrompt.count > 1 ? 's' : ''}?
              </p>
              <p className="text-xs text-red-600 mt-1">This action cannot be undone.</p>
              <p className="text-xs text-gray-500 mt-1">
                Note: System default settings cannot be deleted.
              </p>
            </div>
            <div className="flex justify-end space-x-2">
              <button onClick={() => setShowBulkDeletePrompt({ show: false, count: 0 })} className="px-3 py-1.5 text-xs sm:text-sm border border-gray-300 rounded hover:bg-gray-50">Cancel</button>
              <button onClick={confirmBulkDelete} className="px-3 py-1.5 text-xs sm:text-sm bg-red-600 text-white rounded hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Setting Prompt */}
      {showDeleteSettingPrompt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 sm:p-6 max-w-sm w-full mx-4">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h3 className="font-medium text-gray-900 text-sm sm:text-base">Confirm Delete</h3>
              <button onClick={() => setShowDeleteSettingPrompt(null)} className="p-1 text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4 sm:h-5 sm:w-5"/>
              </button>
            </div>
            <div className="mb-4">
              <p className="text-xs sm:text-sm text-gray-600">
                Are you sure you want to delete setting <span className="font-medium">{showDeleteSettingPrompt.label}</span>?
              </p>
              <p className="text-xs text-red-600 mt-1">This action cannot be undone.</p>
            </div>
            <div className="flex justify-end space-x-2">
              <button onClick={() => setShowDeleteSettingPrompt(null)} className="px-3 py-1.5 text-xs sm:text-sm border border-gray-300 rounded hover:bg-gray-50">Cancel</button>
              <button onClick={confirmDeleteSetting} className="px-3 py-1.5 text-xs sm:text-sm bg-red-600 text-white rounded hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Add New Setting Modal */}
      {showAddSettingModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 sm:p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-gray-900 text-sm sm:text-base">
                <span className="bg-gray-200 px-2 py-0.5 rounded">
                  Add New Setting
                </span>
              </h3>
              <button onClick={() => setShowAddSettingModal(false)} className="p-1 text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Category *</label>
                <select
                  value={newSetting.category}
                  onChange={(e) => setNewSetting({...newSetting, category: e.target.value})}
                  className="w-full px-3 py-1.5 text-xs sm:text-sm border border-gray-300 rounded"
                >
                  <option value="General">General</option>
                  <option value="Security">Security</option>
                  <option value="Notifications">Notifications</option>
                  <option value="Employee Management">Employee Management</option>
                  <option value="Department Management">Department Management</option>
                  <option value="Project Management">Project Management</option>
                  <option value="Part Management">Part Management</option>
                  <option value="File Management">File Management</option>
                  <option value="Backup">Backup</option>
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Setting Label *</label>
                <input
                  type="text"
                  placeholder="e.g., Two-Factor Authentication"
                  value={newSetting.label}
                  onChange={(e) => setNewSetting({...newSetting, label: e.target.value})}
                  className="w-full px-3 py-1.5 text-xs sm:text-sm border border-gray-300 rounded"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Setting Type</label>
                <select
                  value={newSetting.type}
                  onChange={(e) => setNewSetting({...newSetting, type: e.target.value})}
                  className="w-full px-3 py-1.5 text-xs sm:text-sm border border-gray-300 rounded"
                >
                  <option value="text">Text</option>
                  <option value="number">Number</option>
                  <option value="toggle">Toggle (On/Off)</option>
                  <option value="select">Dropdown</option>
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  placeholder="Brief description of this setting..."
                  value={newSetting.description}
                  onChange={(e) => setNewSetting({...newSetting, description: e.target.value})}
                  className="w-full h-20 px-3 py-1.5 text-xs sm:text-sm border border-gray-300 rounded"
                  rows="3"
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 mt-4">
              <button
                onClick={() => setShowAddSettingModal(false)}
                className="px-3 py-1.5 text-xs sm:text-sm border border-gray-300 rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddSetting}
                className="px-3 py-1.5 text-xs sm:text-sm bg-black text-white rounded hover:bg-gray-800"
              >
                Add Setting
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MAIN BORDER CONTAINER */}
      <div className="bg-white border border-gray-300 rounded mx-0">
       
        {/* TOOLBAR SECTION */}
        <div className="p-4 border-b border-gray-300">
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
              {/* Column Filter */}
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

              {/* Category Filter */}
              <div className="relative">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="h-10 px-3 pr-8 text-xs sm:text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black w-full sm:w-48 appearance-none bg-white"
                >
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              {/* Export Button with Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowExportDropdown(!showExportDropdown)}
                  className="flex items-center gap-1 h-10 px-3 text-xs sm:text-sm border border-gray-300 rounded hover:bg-gray-50"
                >
                  <Download className="h-4 w-4" />
                  {/* <span>Export</span> */}
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
                        onClick={() => exportSettings('json')}
                        className="block w-full text-left px-4 py-2 text-xs sm:text-sm text-gray-700 hover:bg-gray-100"
                      >
                        Export as JSON
                      </button>
                      <button
                        onClick={() => setShowBackupModal(true)}
                        className="block w-full text-left px-4 py-2 text-xs sm:text-sm text-gray-700 hover:bg-gray-100"
                      >
                        Backup & Restore
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* TABLE SECTION */}
        <div className="relative">
          <div className="overflow-auto max-h-[calc(100vh-300px)]">
            <table className="min-w-full text-xs sm:text-sm border-collapse">
              <thead className="bg-gray-100 sticky top-0 z-10">
                <tr className="border-b border-gray-300">
                  {/* Checkbox column */}
                  <th className="text-left py-2 px-3 font-medium text-gray-700 cursor-pointer hover:bg-gray-200 whitespace-nowrap border-r border-gray-300 w-10">
                    <div className="flex items-center justify-center">
                      <button
                        onClick={toggleSelectAll}
                        className="p-1 text-gray-600 hover:text-gray-800"
                      >
                        {selectAll ? (
                          <CheckSquare className="h-4 w-4" />
                        ) : (
                          <Square className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </th>
                  {columns.map(col => (
                    <th
                      key={col.id}
                      className="text-left py-2 px-3 font-medium text-gray-700 cursor-pointer hover:bg-gray-200 whitespace-nowrap border-r border-gray-300 last:border-r-0"
                      onClick={() => col.sortable && handleSort(col.id)}
                    >
                      <div className="flex items-center space-x-1">
                        <span>{col.label}</span>
                        {col.sortable && getSortIcon(col.id)}
                      </div>
                    </th>
                  ))}
                  <th className="text-left py-2 px-3 font-medium text-gray-700 whitespace-nowrap border-r border-gray-300">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {sortedSettings.map(setting => (
                  <tr
                    key={setting.id}
                    className="border-b border-gray-300 hover:bg-gray-50 transition-colors"
                  >
                    {/* Checkbox cell */}
                    <td className="py-2 px-3 whitespace-nowrap border-r border-gray-300 w-10">
                      <div className="flex items-center justify-center">
                        <input
                          type="checkbox"
                          checked={selectedSettings.includes(setting.id)}
                          onChange={() => toggleSettingSelection(setting.id)}
                          disabled={!setting.deletable}
                          className={`h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 ${
                            !setting.deletable ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                        />
                      </div>
                    </td>
                    
                    {/* Category */}
                    <td className="py-2 px-3 whitespace-nowrap border-r border-gray-300">
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                        {setting.category}
                      </span>
                    </td>
                    
                    {/* Setting Name */}
                    <td className="py-2 px-3 whitespace-nowrap border-r border-gray-300">
                      <div className="flex items-center space-x-2">
                        <div className="p-1 bg-gray-100 rounded">
                          {getIconComponent(setting.icon)}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 text-xs sm:text-sm">{setting.label}</div>
                          <div className="flex items-center space-x-1 mt-0.5">
                            <span className="text-[10px] text-gray-500 px-1 py-0.5 bg-gray-100 rounded">
                              {setting.type}
                            </span>
                            {setting.deletable && (
                              <span className="text-[10px] px-1 py-0.5 bg-blue-100 text-blue-800 rounded">
                                Custom
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    
                    {/* Current Value */}
                    <td className="py-2 px-3 whitespace-nowrap border-r border-gray-300">
                      {editingId === setting.id ? (
                        renderInput(setting)
                      ) : (
                        <div 
                          onClick={() => setting.type === 'toggle' && setting.editable ? quickToggle(setting.id) : null}
                          className={setting.type === 'toggle' && setting.editable ? 'cursor-pointer' : ''}
                        >
                          {renderDisplayValue(setting)}
                        </div>
                      )}
                    </td>
                    
                    {/* Description */}
                    <td className="py-2 px-3 border-r border-gray-300">
                      <div className="text-gray-600 max-w-xs text-xs">
                        {setting.description}
                      </div>
                    </td>
                    
                    {/* Actions */}
                    <td className="py-2 px-3 whitespace-nowrap border-r border-gray-300">
                      <div className="flex items-center space-x-2">
                        {editingId === setting.id ? (
                          <>
                            <button 
                              onClick={saveEdit}
                              className="p-1 text-green-600 hover:text-green-800"
                              title="Save"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                            <button 
                              onClick={cancelEdit}
                              className="p-1 text-red-600 hover:text-red-800"
                              title="Cancel"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            {setting.editable && (
                              <button 
                                onClick={() => startEditing(setting)}
                                className="p-1 text-blue-600 hover:text-blue-800"
                                title="Edit"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                            )}
                            {setting.deletable && (
                              <button 
                                onClick={() => showDeleteConfirmation(setting.id, setting.label)}
                                className="p-1 text-red-600 hover:text-red-800"
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* FOOTER SECTION with Add Setting and Action buttons on LEFT */}
        <div className="px-4 py-3 border-t border-gray-300 text-xs text-gray-900 flex flex-col sm:flex-row items-center justify-between gap-2 bg-white relative">
          {/* LEFT SIDE - Add Setting and Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddSettingModal(true)}
              className="flex items-center gap-1 h-10 px-3 text-xs border border-gray-300 rounded hover:bg-gray-50"
            >
              <Plus className="h-4 w-4" />
              {/* <span>Add Setting</span> */}
            </button>
            
            {/* Bulk Delete button - only show when deletable settings are selected */}
            {selectedSettings.filter(id => {
              const setting = settings.find(s => s.id === id);
              return setting && setting.deletable;
            }).length > 0 && (
              <button
                onClick={handleBulkDelete}
                className="flex items-center gap-1 h-10 px-3 text-xs sm:text-sm border border-gray-300 rounded hover:bg-red-50 hover:text-red-700 hover:border-red-300"
                title="Delete selected custom settings"
              >
                <Trash2 className="h-4 w-4" />
                <span>Delete ({selectedSettings.filter(id => settings.find(s => s.id === id)?.deletable).length})</span>
              </button>
            )}
            
            {/* Reset button */}
            <button
              onClick={() => setShowResetModal(true)}
              className="flex items-center gap-1 h-10 px-3 text-xs sm:text-sm border border-gray-300 rounded hover:bg-red-50 hover:text-red-700 hover:border-red-300"
              title="Reset all settings to defaults"
            >
              <RefreshCw className="h-4 w-4" />
              {/* <span>Reset All</span> */}
            </button>
          </div>
          
          {/* RIGHT SIDE - Info */}
          <div className="flex items-center gap-4">
            <span>
              Showing {sortedSettings.length} of {settings.length} settings
              {(columnFilter || selectedCategory !== "All Categories") &&
                ` (Filtered${columnFilter ? ` by: ${columnFilter}` : ''}${selectedCategory !== "All Categories" ? ` by Category: ${selectedCategory}` : ''})`
              }
            </span>
            {selectedSettings.length > 0 && (
              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                {selectedSettings.length} selected
              </span>
            )}
            <span className="text-blue-600">
              ({settings.filter(s => s.deletable).length} custom settings)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemSettings;