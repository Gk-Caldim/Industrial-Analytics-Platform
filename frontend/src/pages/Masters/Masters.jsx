import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  File, Clock, User, ChevronRight, Database, FileSpreadsheet,
  Archive, FileText, X, Eye, Edit, Check,
  Users, Package, Building, Briefcase,
  UserCog, FolderOpen, LayoutGrid
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
          <p className="text-gray-500 dark:text-gray-500">No data available in this file</p>
        </div>
      );
    }

    return (
      <div className="overflow-auto border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900">
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
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200">
            {editedData.map((row, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
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
                    className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100"
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
      <div className="flex items-center justify-between bg-white dark:bg-gray-900 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700"
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-50 rounded-lg">
            <FileText className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100"
            <p className="text-xs text-gray-500 dark:text-gray-500">Uploaded by {trackerInfo.uploadedBy} • {new Date(trackerInfo.uploadDate).toLocaleDateString()}</p>
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
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center ${isEditing
                ? 'bg-green-50 text-green-600 hover:bg-green-100'
                : 'bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
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
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500 dark:text-gray-500" />
          </button>
        </div>
      </div>

      {/* Table View */}
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {renderTableView()}
      </div>

      {/* Footer Stats */}
      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-500 bg-white dark:bg-gray-900 p-3 rounded-xl border border-gray-200 dark:border-gray-700"
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

  // Master modules data - Unique premium color gradients for each
  const staticMasterModules = [
    {
      id: 1,
      name: 'Employee Master',
      masterModuleId: 'employee-master',
      color: 'bg-indigo-600',
      gradient: 'from-indigo-500 to-violet-600',
      shadow: 'shadow-indigo-500/30',
      accentColor: 'indigo',
      type: 'master',
      icon: <Users className="h-6 w-6 text-white" />,
      description: 'Manage employee information and records'
    },
    {
      id: 2,
      name: 'Employee Access',
      masterModuleId: 'employee-access',
      color: 'bg-emerald-600',
      gradient: 'from-emerald-400 to-teal-600',
      shadow: 'shadow-emerald-500/30',
      accentColor: 'emerald',
      type: 'master',
      icon: <UserCog className="h-6 w-6 text-white" />,
      description: 'Configure employee access permissions'
    },
    {
      id: 3,
      name: 'Project Master',
      masterModuleId: 'project-master',
      color: 'bg-amber-600',
      gradient: 'from-amber-400 to-orange-600',
      shadow: 'shadow-orange-500/30',
      accentColor: 'amber',
      type: 'master',
      icon: <Briefcase className="h-6 w-6 text-white" />,
      description: 'Manage project portfolios and timelines'
    },
    {
      id: 4,
      name: 'Part Master',
      masterModuleId: 'part-master',
      color: 'bg-rose-600',
      gradient: 'from-rose-400 to-pink-600',
      shadow: 'shadow-rose-500/30',
      accentColor: 'rose',
      type: 'master',
      icon: <Package className="h-6 w-6 text-white" />,
      description: 'Catalog parts and inventory items'
    },
    {
      id: 5,
      name: 'Department Master',
      masterModuleId: 'department-master',
      color: 'bg-cyan-600',
      gradient: 'from-cyan-400 to-blue-600',
      shadow: 'shadow-cyan-500/30',
      accentColor: 'cyan',
      type: 'master',
      icon: <Building className="h-6 w-6 text-white" />,
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
    switch (ext) {
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
            <div className="animate-spin rounded-full h-12 w-12 border-3 border-gray-200 dark:border-gray-700 border-t-blue-600 mx-auto mb-4"></div>
          </div>
          <p className="text-gray-600 dark:text-gray-400 masters...</p>
        </div>
      </div>
    );
  }

  // Framer Motion Variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    show: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 24
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#fafbfc] dark:bg-gray-950 p-6 lg:p-10 font-sans">
      {/* File Viewer Modal */}
      {fileViewerModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl w-full max-w-6xl max-h-[90vh] overflow-auto">
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

      {/* Premium Hero Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="mb-10 lg:mb-14 max-w-7xl mx-auto"
      >
        <div className="flex items-center space-x-4 mb-2">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <LayoutGrid className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl lg:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-600 tracking-tight">
              Master Data Hub
            </h1>
            <p className="text-sm lg:text-base text-gray-500 dark:text-gray-500 font-medium mt-1">
              Centralized management and orchestration for foundational system parameters
            </p>
          </div>
        </div>
      </motion.div>

      {/* Styled Grid for Masters */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 lg:gap-8 max-w-7xl mx-auto"
      >
        {dynamicModules.map((master) => {
          const fileCount = master.submodules?.length || 0;

          return (
            <motion.div
              variants={itemVariants}
              whileHover={{ y: -6, scale: 1.02 }}
              key={master.id}
              className={`
                group relative bg-white dark:bg-gray-900 backdrop-blur-xl rounded-3xl border border-white/60 
                overflow-hidden transition-all duration-300
                shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-2xl hover:shadow-${master.accentColor}-500/10
                flex flex-col
              `}
              onMouseEnter={() => setHoveredModule(master.id)}
              onMouseLeave={() => setHoveredModule(null)}
            >
              {/* Glassy reflection overlay on hover */}
              <div className="absolute inset-0 bg-gradient-to-b from-white/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10" />

              {/* Master Header - Clickable */}
              <div
                className={`relative bg-gradient-to-br ${master.gradient} p-6 cursor-pointer overflow-hidden rounded-t-3xl min-h-[140px] flex flex-col justify-end`}
                onClick={() => handleModuleClick(master)}
              >
                {/* Advanced Animated background patterns */}
                <div className="absolute inset-0 overflow-hidden">
                  <motion.div
                    animate={{
                      rotate: [0, 90, 180, 270, 360],
                      scale: [1, 1.2, 1]
                    }}
                    transition={{
                      duration: 25,
                      repeat: Infinity,
                      ease: "linear"
                    }}
                    className="absolute -right-12 -top-12 w-48 h-48 bg-white dark:bg-gray-900 rounded-full blur-2xl"
                  />
                  <div className="absolute -left-6 -bottom-6 w-32 h-32 bg-white dark:bg-gray-900 rounded-full blur-xl" />
                  <div className="absolute right-1/4 top-1/4 w-16 h-16 bg-white dark:bg-gray-900 rounded-full blur-md" />
                  {/* Decorative mesh/dots */}
                  <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.8)_1px,transparent_1px)] bg-[size:16px_16px]" />
                </div>

                <div className="relative z-20">
                  <div className="mb-3">
                    <div className={`p-3 bg-white dark:bg-gray-900 backdrop-blur-md rounded-2xl inline-block shadow-lg ${master.shadow}`}>
                      {master.icon}
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-white tracking-tight drop-shadow-sm group-hover:drop-shadow-md transition-all">
                    {master.name}
                  </h3>
                  {master.description && (
                    <p className="text-white/80 text-sm mt-1.5 font-medium line-clamp-1 drop-shadow-sm">
                      {master.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Content / Files Section */}
              <div className="p-5 flex-1 flex flex-col bg-white dark:bg-gray-900">
                {fileCount > 0 ? (
                  <div className="flex-1 space-y-2.5">
                    {master.submodules.slice(0, 3).map((file, idx) => (
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 * idx }}
                        key={file.id}
                        onClick={(e) => handleFileClick(file, e)}
                        className={`flex items-center justify-between p-3 rounded-xl border border-transparent hover:border-${master.accentColor}-100 hover:bg-${master.accentColor}-50 hover:shadow-sm transition-all cursor-pointer group/file`}
                      >
                        <div className="flex items-center space-x-3 min-w-0">
                          <div className={`p-2 bg-gray-50 dark:bg-gray-800 rounded-lg text-gray-400 group-hover/file:text-${master.accentColor}-600 group-hover/file:bg-white dark:bg-gray-950 transition-colors`}>
                            {getFileIcon(file.name)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 group-hover/file:text-gray-900 dark:text-white truncate">
                              {file.name.replace(/\.[^/.]+$/, '')}
                            </p>
                          </div>
                        </div>
                        <Eye className={`h-4 w-4 text-gray-300 group-hover/file:text-${master.accentColor}-500 flex-shrink-0 transition-colors`} />
                      </motion.div>
                    ))}

                    {fileCount > 3 && (
                      <div className="pt-2">
                        <button
                          onClick={() => handleModuleClick(master)}
                          className={`w-full py-2.5 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl text-sm font-semibold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:text-white transition-colors flex items-center justify-center`}
                        >
                          View all {fileCount} items
                          <ChevronRight className="h-4 w-4 ml-1 opacity-70" />
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col justify-end pt-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenModule(master.masterModuleId);
                      }}
                      className={`
                        group/btn w-full inline-flex items-center justify-center px-4 py-3 rounded-xl text-sm font-bold 
                        transition-all duration-300 ease-in-out
                        bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gradient-to-r hover:${master.gradient} 
                        hover:text-white border border-gray-100 dark:border-gray-800 hover:border-transparent
                        hover:shadow-lg ${master.shadow} relative overflow-hidden
                      `}
                    >
                      {/* Shine effect on hover */}
                      <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-[150%] group-hover/btn:translate-x-[150%] transition-transform duration-700 ease-out" />

                      <FolderOpen className="h-4 w-4 mr-2 group-hover/btn:scale-110 transition-transform" />
                      <span className="relative z-10">Access Module</span>
                      <ChevronRight className="h-4 w-4 ml-1 opacity-50 group-hover/btn:opacity-100 group-hover/btn:translate-x-1 transition-all" />
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
};

export default Masters;