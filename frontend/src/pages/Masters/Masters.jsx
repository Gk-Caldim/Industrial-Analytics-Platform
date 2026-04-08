import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  File, Clock, User, ChevronRight, Database, FileSpreadsheet,
  Archive, FileText, X, Eye, Edit, Check,
  Users, Package, Building, Briefcase,
  UserCog, FolderOpen, Square, Layers, BarChart3, FileUp,
  Shield, FolderKanban, Download, Share2, Star, MoreVertical,
  Filter, Grid, List, Sparkles, Bookmark, Activity, Zap, Wallet
} from 'lucide-react';

// File Content Viewer Component (enhanced)
const FileContentViewer = ({ fileData, trackerInfo, onClose, onSaveData }) => {
  const [editedData, setEditedData] = useState(fileData?.data || []);
  const [editedHeaders, setEditedHeaders] = useState(fileData?.headers || []);
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingCell, setEditingCell] = useState(null);
  const [cellValue, setCellValue] = useState('');

  const handleSave = () => {
    onSaveData({
      ...fileData,
      data: editedData,
      headers: editedHeaders
    });
    setIsEditing(false);
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(editedData.map((_, index) => index)));
    }
    setSelectAll(!selectAll);
  };

  const handleRowSelect = (index) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedRows(newSelected);
    setSelectAll(newSelected.size === editedData.length);
  };

  const handleDeleteSelected = () => {
    const newData = editedData.filter((_, index) => !selectedRows.has(index));
    setEditedData(newData);
    setSelectedRows(new Set());
    setSelectAll(false);
  };

  const handleCellClick = (rowIndex, colIndex, value) => {
    if (!isEditing) return;
    setEditingCell({ rowIndex, colIndex });
    setCellValue(value || '');
  };

  const handleCellChange = (e) => {
    setCellValue(e.target.value);
  };

  const handleCellBlur = () => {
    if (editingCell) {
      const { rowIndex, colIndex } = editingCell;
      const newData = [...editedData];
      newData[rowIndex][colIndex] = cellValue;
      setEditedData(newData);
      setEditingCell(null);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleCellBlur();
    }
  };

  if (!fileData || !trackerInfo) return null;

  const renderTableView = () => {
    if (!editedData || editedData.length === 0) {
      return (
        <div className="text-center py-12">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-[#1e3a5f]/5 to-transparent rounded-full blur-3xl"></div>
            <Database className="h-16 w-16 text-[#1e3a5f]/20 mx-auto mb-4 relative" />
          </div>
          <p className="text-gray-500 font-medium">No data available in this file</p>
          <p className="text-sm text-gray-400 mt-1">Upload data to get started</p>
        </div>
      );
    }

    return (
      <div className="overflow-auto border border-gray-200 rounded-xl bg-white shadow-lg shadow-[#1e3a5f]/5">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gradient-to-r from-[#f0f5fa] to-[#e6eef8] sticky top-0">
            <tr>
              <th className="px-3 py-3 w-10">
                {isEditing && (
                  <button onClick={handleSelectAll} className="focus:outline-none hover:scale-110 transition-transform">
                    {selectAll ? (
                      <div className="bg-[#1e3a5f] rounded p-0.5">
                        <Check className="h-4 w-4 text-white" />
                      </div>
                    ) : (
                      <Square className="h-4 w-4 text-[#1e3a5f]/40 hover:text-[#1e3a5f]/60" />
                    )}
                  </button>
                )}
              </th>
              {editedHeaders.map((header, idx) => (
                <th key={idx} className="px-4 py-3 text-left text-xs font-semibold text-[#1e3a5f] uppercase tracking-wider">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {editedData.map((row, rowIndex) => (
              <tr 
                key={rowIndex} 
                className={`hover:bg-gradient-to-r hover:from-[#f0f5fa] hover:to-transparent transition-all duration-200 ${
                  selectedRows.has(rowIndex) ? 'bg-[#1e3a5f]/5' : ''
                }`}
              >
                <td className="px-3 py-2">
                  {isEditing && (
                    <button onClick={() => handleRowSelect(rowIndex)} className="focus:outline-none hover:scale-110 transition-transform">
                      {selectedRows.has(rowIndex) ? (
                        <div className="bg-[#1e3a5f] rounded p-0.5">
                          <Check className="h-4 w-4 text-white" />
                        </div>
                      ) : (
                        <Square className="h-4 w-4 text-gray-400 hover:text-[#1e3a5f]/40" />
                      )}
                    </button>
                  )}
                </td>
                {row.map((cell, colIndex) => (
                  <td
                    key={colIndex}
                    className="px-4 py-2 text-sm text-gray-700"
                    onClick={() => handleCellClick(rowIndex, colIndex, cell)}
                  >
                    {editingCell?.rowIndex === rowIndex && editingCell?.colIndex === colIndex ? (
                      <input
                        type="text"
                        value={cellValue}
                        onChange={handleCellChange}
                        onBlur={handleCellBlur}
                        onKeyPress={handleKeyPress}
                        className="w-full px-2 py-1 border border-[#1e3a5f] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f] shadow-sm"
                        autoFocus
                      />
                    ) : (
                      <span className="block min-h-[20px] hover:text-[#1e3a5f] transition-colors">{cell}</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between bg-gradient-to-r from-white to-[#f8faff] p-4 rounded-xl shadow-lg border border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-gradient-to-br from-[#1e3a5f] to-[#2c4c7c] rounded-xl shadow-lg shadow-[#1e3a5f]/20">
            <FileText className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{trackerInfo.fileName}</h2>
            <div className="flex items-center space-x-2 text-xs text-gray-500">
              <User className="h-3 w-3" />
              <span>{trackerInfo.uploadedBy}</span>
              <span>•</span>
              <Clock className="h-3 w-3" />
              <span>{new Date(trackerInfo.uploadDate).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {selectedRows.size > 0 && (
            <button
              onClick={handleDeleteSelected}
              className="px-3 py-1.5 bg-gradient-to-r from-red-50 to-red-100 text-red-600 rounded-lg text-sm font-medium hover:from-red-100 hover:to-red-200 transition-all duration-200 flex items-center shadow-sm border border-red-200"
            >
              <Archive className="h-4 w-4 mr-1" />
              Delete ({selectedRows.size})
            </button>
          )}
          <button
            onClick={() => setIsEditing(!isEditing)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center shadow-sm ${
              isEditing
                ? 'bg-gradient-to-r from-green-50 to-green-100 text-green-600 border border-green-200 hover:from-green-100 hover:to-green-200'
                : 'bg-gradient-to-r from-gray-50 to-gray-100 text-gray-600 border border-gray-200 hover:from-gray-100 hover:to-gray-200'
            }`}
          >
            <Edit className="h-4 w-4 mr-1" />
            {isEditing ? 'Editing Mode' : 'Edit Mode'}
          </button>
          {isEditing && (
            <button
              onClick={handleSave}
              className="px-3 py-1.5 bg-gradient-to-r from-[#1e3a5f] to-[#2c4c7c] text-white rounded-lg text-sm font-medium hover:from-[#2c4c7c] hover:to-[#1e3a5f] transition-all duration-200 flex items-center shadow-lg shadow-[#1e3a5f]/20"
            >
              <Check className="h-4 w-4 mr-1" />
              Save Changes
            </button>
          )}
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-all duration-200 hover:scale-110"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Table View */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        {renderTableView()}
      </div>

      {/* Footer Stats */}
      <div className="flex items-center justify-between text-xs text-gray-500 bg-gradient-to-r from-white to-[#f8faff] p-3 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1">
            <span className="font-medium text-[#1e3a5f]">{editedData.length}</span>
            <span>Rows</span>
          </div>
          <div className="w-px h-4 bg-gray-300"></div>
          <div className="flex items-center space-x-1">
            <span className="font-medium text-[#1e3a5f]">{editedHeaders.length}</span>
            <span>Columns</span>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Clock className="h-3 w-3" />
          <span>Last modified: Just now</span>
        </div>
      </div>
    </div>
  );
};

// Helper function to get icon for each master module
const getMasterIcon = (masterName) => {
  const icons = {
    'Employee Master': <Users className="h-5 w-5" />,
    'Project Master': <FolderKanban className="h-5 w-5" />
  };
  return icons[masterName] || <Database className="h-5 w-5" />;
};

// Main Masters Component
const Masters = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const [dynamicModules, setDynamicModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [trackers, setTrackers] = useState([]);
  const [uploadedFilesData, setUploadedFilesData] = useState({});
  const [hoveredModule, setHoveredModule] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [selectedCategory, setSelectedCategory] = useState('all');

  // File viewer modal state
  const [fileViewerModal, setFileViewerModal] = useState({
    isOpen: false,
    fileData: null,
    trackerInfo: null
  });

  // Master modules data
  const staticMasterModules = [
    {
      id: 1,
      name: 'Employee Master',
      masterModuleId: 'employee-master',
      path: 'masters/employees',
      type: 'master',
      description: 'Manage employee records and basic profiles.',
      icon: <Users className="h-5 w-5" />,
      imageUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      gist: [
        { label: 'Basic Info', val: 'Names, Contacts, Emails', icon: <UserCog className="h-4 w-4" /> },
        { label: 'Organization', val: 'Departments & Designations', icon: <Building className="h-4 w-4" /> },
        { label: 'Access', val: 'System Roles', icon: <Shield className="h-4 w-4" /> }
      ]
    },
    {
      id: 3,
      name: 'Project Master',
      masterModuleId: 'project-master',
      path: 'masters/project-master',
      type: 'master',
      description: 'Manage project client details and timelines.',
      icon: <FolderKanban className="h-5 w-5" />,
      imageUrl: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      gist: [
        { label: 'Basic Info', val: 'Project Name & Client', icon: <Briefcase className="h-4 w-4" /> },
        { label: 'Timelines', val: 'Start & End Dates', icon: <Clock className="h-4 w-4" /> },
        { label: 'Management', val: 'Assigned PMs & Status', icon: <Layers className="h-4 w-4" /> }
      ]
    },
    {
      id: 4,
      name: 'Budget Master',
      masterModuleId: 'budget-master',
      path: 'masters/budget-master',
      type: 'master',
      description: 'Manage itemized project budgets.',
      icon: <Wallet className="h-5 w-5" />,
      imageUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      gist: [
        { label: 'Estimates', val: 'Unit Costs & Totals', icon: <Database className="h-4 w-4" /> },
        { label: 'Tracking', val: 'Utilized & Committed', icon: <BarChart3 className="h-4 w-4" /> },
        { label: 'Revisions', val: 'Status & Comments', icon: <Check className="h-4 w-4" /> }
      ]
    }
  ];

  // Load dynamic modules
  useEffect(() => {
    const loadDynamicModules = () => {
      try {
        const savedMasterFiles = localStorage.getItem('master_files');
        const masterFiles = savedMasterFiles ? JSON.parse(savedMasterFiles) : [];

        // Filter static modules based on user permissions
        const hasPermission = (moduleName) => {
          if (user?.role === 'Admin') return true;
          if (!user?.permissions) return false;
          return user.permissions.includes(moduleName);
        };

        const filteredStaticModules = staticMasterModules.filter(m => hasPermission(m.name));

        const masterModulesWithFiles = filteredStaticModules.map(master => {
          const masterFileModules = masterFiles
            .filter(file => file.masterId === master.id)
            .map(file => ({
              id: file.id,
              name: file.fileName,
              trackerId: file.trackerId,
              uploadedBy: file.uploadedBy,
              uploadDate: file.uploadDate,
              size: file.size || '1.2 MB',
              type: file.type || 'csv'
            }));

          return {
            ...master,
            submodules: masterFileModules,
            fileCount: masterFileModules.length
          };
        });

        setDynamicModules(masterModulesWithFiles);

        const savedTrackers = localStorage.getItem('upload_trackers');
        setTrackers(savedTrackers ? JSON.parse(savedTrackers) : []);

        const savedFilesData = localStorage.getItem('uploaded_files_data');
        setUploadedFilesData(savedFilesData ? JSON.parse(savedFilesData) : {});
      } catch (error) {
        console.error('Error loading master modules:', error);
        setDynamicModules(staticMasterModules.map(m => ({ ...m, submodules: [], fileCount: 0 })));
      } finally {
        setLoading(false);
      }
    };

    loadDynamicModules();

    const handleMastersUpdate = () => {
      loadDynamicModules();
    };

    window.addEventListener('mastersUpdate', handleMastersUpdate);

    return () => {
      window.removeEventListener('mastersUpdate', handleMastersUpdate);
    };
  }, []);

  // Handle module click - Navigate to the correct submodule path
  const handleModuleClick = (module) => {
    console.log(`Opening master: ${module.name}`);
    navigate(`/dashboard/${module.path}`);
  };

  // Handle "Open Module" button click
  const handleOpenModule = (masterModuleId) => {
    localStorage.setItem('active_master_submodule', masterModuleId);

    // Find the module to get its path
    const module = staticMasterModules.find(m => m.masterModuleId === masterModuleId);
    const path = module ? module.path : 'masters';

    const event = new CustomEvent('openMasterSubmodule', {
      detail: { masterModuleId }
    });
    window.dispatchEvent(event);

    navigate(`/dashboard/${path}`);
  };

  // Handle file click
  const handleFileClick = async (fileModule, e) => {
    e.stopPropagation();

    const trackerInfo = trackers.find(t => t.id === fileModule.trackerId);
    if (!trackerInfo) return;

    const fileData = uploadedFilesData[fileModule.trackerId];
    if (!fileData) return;

    setFileViewerModal({
      isOpen: true,
      fileData: fileData,
      trackerInfo: trackerInfo
    });
  };

  // Close file viewer
  const handleCloseFileViewer = () => {
    setFileViewerModal({
      isOpen: false,
      fileData: null,
      trackerInfo: null
    });
  };

  // Save file data
  const handleSaveFileData = (trackerId, updatedFileData) => {
    const newFilesData = { ...uploadedFilesData, [trackerId]: updatedFileData };
    setUploadedFilesData(newFilesData);
    localStorage.setItem('uploaded_files_data', JSON.stringify(newFilesData));

    if (fileViewerModal.trackerInfo?.id === trackerId) {
      setFileViewerModal(prev => ({
        ...prev,
        fileData: updatedFileData
      }));
    }
  };

  // Get file icon with colors
  const getFileIcon = (fileName, type) => {
    if (!fileName) return <FileText className="h-4 w-4" />;

    const ext = type || fileName.split('.').pop().toLowerCase();
    switch (ext) {
      case 'csv':
        return <FileSpreadsheet className="h-4 w-4 text-green-600" />;
      case 'xlsx':
      case 'xls':
        return <FileSpreadsheet className="h-4 w-4 text-emerald-600" />;
      case 'json':
        return <Database className="h-4 w-4 text-amber-600" />;
      default:
        return <FileText className="h-4 w-4 text-blue-600" />;
    }
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Format relative time
  const getRelativeTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return formatDate(dateString);
  };

  // Filter modules by category
  const filteredModules = selectedCategory === 'all' 
    ? dynamicModules 
    : dynamicModules.filter(m => m.fileCount > 0);

  // Loading state with enhanced animation
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-[#f0f5fa] p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-[#1e3a5f]/20 to-transparent rounded-full blur-3xl animate-pulse"></div>
            <div className="relative animate-spin rounded-full h-16 w-16 border-4 border-[#1e3a5f]/10 border-t-[#1e3a5f] mx-auto mb-4"></div>
          </div>
          <h3 className="text-lg font-semibold text-gray-700 mb-1">Loading Masters</h3>
          <p className="text-sm text-gray-500">Preparing your workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-[#f0f5fa] p-4 sm:p-6 lg:p-8">
      {/* File Viewer Modal */}
      {fileViewerModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-auto shadow-2xl transform transition-all animate-slideUp">
            <FileContentViewer
              fileData={fileViewerModal.fileData}
              trackerInfo={fileViewerModal.trackerInfo}
              onClose={handleCloseFileViewer}
              onSaveData={(updatedData) =>
                handleSaveFileData(fileViewerModal.trackerInfo.id, updatedData)
              }
            />
          </div>
        </div>
      )}

      {/* Masters Grid/List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
        {filteredModules.map((master) => (
          <div
            key={master.id}
            className="group relative bg-white dark:bg-slate-800 border hover:border-[#1e3a5f]/20 border-transparent dark:hover:border-blue-500/30 transition-all duration-500 cursor-pointer flex flex-col h-full rounded-[2rem] shadow-md hover:shadow-2xl overflow-hidden"
            onClick={() => handleModuleClick(master)}
          >
            {/* Top Image Header */}
            <div className="relative h-52 w-full overflow-hidden flex-shrink-0">
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/20 to-transparent z-10 pointer-events-none"></div>
              {master.imageUrl && (
                <img 
                  src={master.imageUrl} 
                  alt={master.name} 
                  className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700 ease-in-out"
                />
              )}
              <div className="absolute bottom-5 left-6 right-6 z-20 flex items-center gap-4 text-white">
                <div className="flex items-center justify-center h-12 w-12 rounded-2xl bg-white/20 backdrop-blur-md shadow-lg border border-white/10 group-hover:bg-[#1e3a5f] group-hover:border-[#1e3a5f] transition-all duration-300">
                  {React.cloneElement(master.icon, { className: "h-6 w-6 text-white" })}
                </div>
                <div>
                  <h3 className="text-2xl font-bold tracking-tight text-white mb-0.5">
                    {master.name}
                  </h3>
                  <p className="text-xs font-medium text-white/80 line-clamp-1">
                    {master.description}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col flex-1 p-6 sm:p-8 bg-white dark:bg-slate-800 relative z-20">
              {/* Information Gist Details */}
              {master.gist && (
                <div className="flex flex-col gap-3 flex-1 mb-8">
                  {master.gist.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 hover:bg-white dark:bg-slate-700/30 border border-transparent dark:hover:bg-slate-700 hover:border-slate-200 dark:hover:border-slate-600 transition-all shadow-sm hover:shadow-md">
                      <div className="flex items-center justify-center h-10 w-10 rounded-full bg-slate-200/50 dark:bg-slate-600 text-[#1e3a5f] dark:text-blue-400 group-hover:scale-110 transition-transform">
                        {item.icon}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{item.label}</span>
                        <span className="text-xs font-medium text-slate-500 mt-0.5">{item.val}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-auto">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenModule(master.masterModuleId);
                  }}
                  className="relative group/btn w-full inline-flex items-center justify-between px-6 py-4 overflow-hidden text-white font-bold rounded-2xl bg-[#1e3a5f] dark:bg-slate-700 shadow-[0_4px_15px_rgba(30,58,95,0.2)] hover:shadow-[0_8px_25px_rgba(30,58,95,0.4)] transition-all duration-300"
                >
                  <span className="absolute inset-0 w-0 bg-gradient-to-r from-[#2c538a] to-[#467abf] transition-all duration-500 ease-out group-hover/btn:w-full"></span>
                  
                  <span className="relative flex items-center gap-3 tracking-widest text-[11px] sm:text-xs uppercase z-10 font-black">
                    <Zap className="h-4 w-4" />
                    Open Master Data
                  </span>
                  
                  <span className="relative flex items-center justify-center w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm group-hover/btn:bg-white group-hover/btn:text-[#1e3a5f] transition-all duration-500 z-10">
                    <ChevronRight className="h-5 w-5 group-hover/btn:translate-x-0.5 transition-transform" />
                  </span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Masters;