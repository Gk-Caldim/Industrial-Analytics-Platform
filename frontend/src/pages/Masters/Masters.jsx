import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  File, Clock, User, ChevronRight, Database, FileSpreadsheet, 
  Archive, FileText, X, Eye, Edit, Check, 
  Users, Package, Building, Briefcase, 
  UserCog, FolderOpen
} from 'lucide-react';

// File Content Viewer Component
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
        <div className="text-center py-8">
          <Database className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500">No data available in this file</p>
        </div>
      );
    }

    return (
      <div className="overflow-auto border border-gray-200 rounded-xl bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gradient-to-r from-blue-600 to-indigo-700 sticky top-0">
            <tr>
              <th className="px-3 py-3 w-10">
                {isEditing && (
                  <button onClick={handleSelectAll} className="focus:outline-none text-white">
                    {selectAll ? (
                      <Check className="h-4 w-4 text-white" />
                    ) : (
                      <Square className="h-4 w-4 text-white" />
                    )}
                  </button>
                )}
              </th>
              {editedHeaders.map((header, idx) => (
                <th key={idx} className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {editedData.map((row, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-gray-50 transition-colors">
                <td className="px-3 py-2">
                  {isEditing && (
                    <button onClick={() => handleRowSelect(rowIndex)} className="focus:outline-none">
                      {selectedRows.has(rowIndex) ? (
                        <Check className="h-4 w-4 text-blue-600" />
                      ) : (
                        <Square className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                  )}
                </td>
                {row.map((cell, colIndex) => (
                  <td 
                    key={colIndex} 
                    className="px-4 py-2 text-sm text-gray-900"
                    onClick={() => handleCellClick(rowIndex, colIndex, cell)}
                  >
                    {editingCell?.rowIndex === rowIndex && editingCell?.colIndex === colIndex ? (
                      <input
                        type="text"
                        value={cellValue}
                        onChange={handleCellChange}
                        onBlur={handleCellBlur}
                        onKeyPress={handleKeyPress}
                        className="w-full px-2 py-1 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        autoFocus
                      />
                    ) : (
                      <span className="block min-h-[20px]">{cell}</span>
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
      <div className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-50 rounded-lg">
            <FileText className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{trackerInfo.fileName}</h2>
            <p className="text-xs text-gray-500">Uploaded by {trackerInfo.uploadedBy} • {new Date(trackerInfo.uploadDate).toLocaleDateString()}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {selectedRows.size > 0 && (
            <button
              onClick={handleDeleteSelected}
              className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors flex items-center"
            >
              <Archive className="h-4 w-4 mr-1" />
              Delete ({selectedRows.size})
            </button>
          )}
          <button
            onClick={() => setIsEditing(!isEditing)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center ${
              isEditing 
                ? 'bg-green-50 text-green-600 hover:bg-green-100' 
                : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Edit className="h-4 w-4 mr-1" />
            {isEditing ? 'Editing Mode' : 'Edit Mode'}
          </button>
          {isEditing && (
            <button
              onClick={handleSave}
              className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center"
            >
              <Check className="h-4 w-4 mr-1" />
              Save Changes
            </button>
          )}
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Table View */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {renderTableView()}
      </div>

      {/* Footer Stats */}
      <div className="flex items-center justify-between text-xs text-gray-500 bg-white p-3 rounded-xl border border-gray-200">
        <div className="flex items-center space-x-4">
          <span>Rows: {editedData.length}</span>
          <span>Columns: {editedHeaders.length}</span>
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
  return <Database className="h-5 w-5" />;
};

// Helper function to get gradient colors - all light blue
const getMasterGradient = () => {
  return 'from-blue-400 to-blue-600';
};

// Helper function to get accent color for each master module - all light blue
const getMasterAccentColor = () => {
  return 'blue';
};

// Main Masters Component
const Masters = () => {
  const navigate = useNavigate();
  const [dynamicModules, setDynamicModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [trackers, setTrackers] = useState([]);
  const [uploadedFilesData, setUploadedFilesData] = useState({});
  const [hoveredModule, setHoveredModule] = useState(null);
  
  // File viewer modal state
  const [fileViewerModal, setFileViewerModal] = useState({
    isOpen: false,
    fileData: null,
    trackerInfo: null
  });

  // Master modules data - all with blue color
  const staticMasterModules = [
    {
      id: 1,
      name: 'Employee Master',
      masterModuleId: 'employee-master',
      color: 'bg-blue-600',
      gradient: 'from-blue-400 to-blue-600',
      accentColor: 'blue',
      type: 'master',
      description: 'Manage employee information and records'
    },
    {
      id: 2,
      name: 'Employee Access',
      masterModuleId: 'employee-access',
      color: 'bg-blue-600',
      gradient: 'from-blue-400 to-blue-600',
      accentColor: 'blue',
      type: 'master',
      description: 'Configure employee access permissions'
    },
    {
      id: 3,
      name: 'Project Master',
      masterModuleId: 'project-master',
      color: 'bg-blue-600',
      gradient: 'from-blue-400 to-blue-600',
      accentColor: 'blue',
      type: 'master',
      description: 'Manage project portfolios and timelines'
    },
    {
      id: 4,
      name: 'Part Master',
      masterModuleId: 'part-master',
      color: 'bg-blue-600',
      gradient: 'from-blue-400 to-blue-600',
      accentColor: 'blue',
      type: 'master',
      description: 'Catalog parts and inventory items'
    },
    {
      id: 5,
      name: 'Department Master',
      masterModuleId: 'department-master',
      color: 'bg-blue-600',
      gradient: 'from-blue-400 to-blue-600',
      accentColor: 'blue',
      type: 'master',
      description: 'Organize departmental structures'
    }
  ];

  // Load dynamic modules
  useEffect(() => {
    const loadDynamicModules = () => {
      try {
        const savedMasterFiles = localStorage.getItem('master_files');
        const masterFiles = savedMasterFiles ? JSON.parse(savedMasterFiles) : [];
        
        const masterModulesWithFiles = staticMasterModules.map(master => {
          const masterFileModules = masterFiles
            .filter(file => file.masterId === master.id)
            .map(file => ({
              id: file.id,
              name: file.fileName,
              trackerId: file.trackerId,
              uploadedBy: file.uploadedBy,
              uploadDate: file.uploadDate
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

  // Handle module click - Navigate to dashboard with module parameter
  const handleModuleClick = (module) => {
    console.log(`Opening master: ${module.name}`);
    navigate(`/dashboard?module=${module.id}`);
  };

  // Handle "Open Module" button click
  const handleOpenModule = (masterModuleId) => {
    localStorage.setItem('active_master_submodule', masterModuleId);
    
    const event = new CustomEvent('openMasterSubmodule', { 
      detail: { masterModuleId } 
    });
    window.dispatchEvent(event);
    
    navigate('/dashboard');
  };

  // Handle file click
  const handleFileClick = async (fileModule, e) => {
    e.stopPropagation(); // Prevent module click when clicking on file
    
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

  // Get file icon
  const getFileIcon = (fileName) => {
    if (!fileName) return <FileText className="h-4 w-4" />;
    
    const ext = fileName.split('.').pop().toLowerCase();
    switch(ext) {
      case 'csv':
        return <FileSpreadsheet className="h-4 w-4 text-blue-600" />;
      case 'xlsx':
      case 'xls':
        return <FileSpreadsheet className="h-4 w-4 text-blue-600" />;
      case 'json':
        return <Database className="h-4 w-4 text-blue-600" />;
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

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-12 w-12 border-3 border-gray-200 border-t-blue-600 mx-auto mb-4"></div>
          </div>
          <p className="text-gray-600">Loading masters...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6">
      {/* File Viewer Modal */}
      {fileViewerModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-6xl max-h-[90vh] overflow-auto">
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
      
      {/* Masters Grid - Simple Cards without drag and drop */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {dynamicModules.map((master) => {
          const fileCount = master.submodules?.length || 0;
          
          return (
            <div
              key={master.id}
              className={`
                group relative bg-white rounded-xl shadow-sm border border-gray-200 
                overflow-hidden transition-all duration-300
                ${hoveredModule === master.id ? 'shadow-lg ring-2 ring-blue-200' : ''}
              `}
              onMouseEnter={() => setHoveredModule(master.id)}
              onMouseLeave={() => setHoveredModule(null)}
            >
              {/* Master Header - Clickable */}
              <div 
                className={`relative bg-gradient-to-r from-blue-400 to-blue-600 p-4 cursor-pointer hover:opacity-90 transition-opacity overflow-hidden`}
                onClick={() => handleModuleClick(master)}
              >
                {/* Animated background pattern */}
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute -right-8 -top-8 w-32 h-32 bg-white rounded-full"></div>
                  <div className="absolute -right-4 -bottom-8 w-40 h-40 bg-white rounded-full"></div>
                  <div className="absolute left-4 top-4 w-16 h-16 bg-white rounded-full"></div>
                </div>
                
                <div className="relative flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-sm">
                        <Database className="h-5 w-5 text-white" />
                      </div>
                      <h3 className="text-lg font-bold text-white tracking-tight">
                        {master.name}
                      </h3>
                    </div>
                    {master.description && (
                      <p className="text-white/80 text-xs mt-1 line-clamp-1">
                        {master.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Content - Files List */}
              <div className="p-4 bg-white">
                {fileCount > 0 ? (
                  <div className="space-y-2">
                    {master.submodules.slice(0, 3).map((file) => (
                      <div
                        key={file.id}
                        onClick={(e) => handleFileClick(file, e)}
                        className="flex items-center justify-between p-2 bg-gray-50 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer group/file"
                      >
                        <div className="flex items-center space-x-2 min-w-0">
                          <div className="p-1.5 bg-white rounded group-hover/file:bg-blue-100 transition-colors">
                            {getFileIcon(file.name)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {file.name.replace(/\.[^/.]+$/, '')}
                            </p>
                          </div>
                        </div>
                        <Eye className="h-4 w-4 text-gray-400 group-hover/file:text-blue-600 flex-shrink-0" />
                      </div>
                    ))}
                    
                    {fileCount > 3 && (
                      <div 
                        className="relative"
                        onClick={() => handleModuleClick(master)}
                      >
                        <button 
                          className="w-full mt-1 px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-xs font-medium text-gray-700 transition-colors flex items-center justify-center"
                        >
                          View all {fileCount} files
                          <ChevronRight className="h-3 w-3 ml-1" />
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-between pt-3 mt-2 border-t border-gray-100">
                  <div className="flex items-center space-x-2">
                    
                    
                  </div>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenModule(master.masterModuleId);
                    }}
                    className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium 
                      transition-all duration-200 hover:scale-105
                      bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200"
                  >
                    <FolderOpen className="h-3 w-3 mr-1" />
                    Open Module
                    <ChevronRight className="h-3 w-3 ml-0.5 opacity-70" />
                  </button>
                </div>
                )}
                
                
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Masters;