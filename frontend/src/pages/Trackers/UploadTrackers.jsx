import React, { useState, useEffect } from 'react';
import {
  Upload, File, CheckCircle, Clock, AlertCircle, Download, Trash2, Eye, Edit,
  Plus, Search, X, ChevronUp, ChevronDown, Filter, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  AlertTriangle, FileText, FileSpreadsheet, Database,
  HardDrive, Archive, Check, Calendar, Save, EyeOff, User,
  Edit2, Save as SaveIcon, Columns, Rows, CheckSquare, Square, FolderTree, Layout
} from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import API from '../../utils/api';

// ============================================================================
// DUAL SIDEBAR MANAGER - Two Independent Hierarchies
// ============================================================================

const sidebarManager = {
  // ============== HIERARCHY 1: UPLOAD TRACKERS MODULE ==============
  // Purpose: For file management, tracking, and administrative view
  // Parent: UploadTrackers module in sidebar
  // Context: "management" - shows all uploaded files regardless of project

  loadUploadTrackerModules: () => {
    try {
      const saved = localStorage.getItem('upload_tracker_modules');
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.error('Error loading upload tracker modules:', error);
      return [];
    }
  },

  saveUploadTrackerModules: (modules) => {
    try {
      localStorage.setItem('upload_tracker_modules', JSON.stringify(modules));
    } catch (error) {
      console.error('Error saving upload tracker modules:', error);
    }
  },

  createUploadTrackerProject: (projectName) => {
    const projectId = projectName
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');

    return {
      id: `upload-project-${projectId}-${Date.now()}`,
      moduleId: `upload-project-${projectId}`,
      name: projectName,
      type: 'project',
      parentId: 'upload-trackers', // Child of UploadTrackers module
      context: 'upload-management',
      viewType: 'management',
      path: `/upload-trackers/${projectId}`,
      isExpanded: false,
      submodules: [],
      stats: {
        fileCount: 0,
        lastUpload: null
      },
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    };
  },

  createUploadTrackerFile: (fileName, trackerId, projectName) => {
    const projectId = projectName
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');

    return {
      id: `upload-file-${trackerId}`,
      moduleId: `upload-file-${trackerId}`,
      name: fileName,
      displayName: fileName.replace(/\.[^/.]+$/, ""),
      type: 'file',
      parentId: `upload-project-${projectId}`,
      trackerId: trackerId,
      context: 'upload-management',
      viewType: 'management',
      path: `/upload-trackers/${projectId}/${trackerId}`,
      createdAt: new Date().toISOString(),
      metadata: {
        source: 'upload',
        department: null, // Will be populated
        employeeName: null, // Will be populated
        fileType: fileName.split('.').pop().toUpperCase(),
        uploadDate: new Date().toISOString()
      }
    };
  },

  addToUploadTrackers: (projectName, fileName, trackerId, metadata = {}) => {
    const modules = sidebarManager.loadUploadTrackerModules();
    const projectId = projectName
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');

    // Find or create project in upload trackers
    let projectModule = modules.find(m =>
      m.moduleId === `upload-project-${projectId}` &&
      m.context === 'upload-management'
    );

    if (!projectModule) {
      projectModule = sidebarManager.createUploadTrackerProject(projectName);
      modules.push(projectModule);
    }

    // Check if file already exists in this context
    const existingFile = projectModule.submodules.find(file =>
      file.trackerId === trackerId && file.context === 'upload-management'
    );

    if (!existingFile) {
      const fileModule = sidebarManager.createUploadTrackerFile(fileName, trackerId, projectName);

      // Add metadata
      fileModule.metadata = {
        ...fileModule.metadata,
        ...metadata,
        department: metadata.department || null,
        employeeName: metadata.employeeName || null
      };

      projectModule.submodules.push(fileModule);

      // Update project stats
      projectModule.stats.fileCount = projectModule.submodules.length;
      projectModule.stats.lastUpload = new Date().toISOString();
      projectModule.lastUpdated = new Date().toISOString();

      // Sort files by date (newest first)
      projectModule.submodules.sort((a, b) =>
        new Date(b.createdAt) - new Date(a.createdAt)
      );

      sidebarManager.saveUploadTrackerModules(modules);

      // Dispatch context-specific event
      window.dispatchEvent(new CustomEvent('uploadTrackerUpdate', {
        detail: { type: 'add', trackerId, projectName, context: 'upload-management' }
      }));
    }

    return modules;
  },

  removeFromUploadTrackers: (trackerId) => {
    const modules = sidebarManager.loadUploadTrackerModules();
    let removed = false;

    for (const projectModule of modules) {
      const fileIndex = projectModule.submodules.findIndex(file =>
        file.trackerId === trackerId && file.context === 'upload-management'
      );

      if (fileIndex !== -1) {
        projectModule.submodules.splice(fileIndex, 1);
        projectModule.stats.fileCount = projectModule.submodules.length;
        projectModule.lastUpdated = new Date().toISOString();
        removed = true;

        // Remove empty projects
        if (projectModule.submodules.length === 0) {
          const projectIndex = modules.findIndex(p => p.moduleId === projectModule.moduleId);
          if (projectIndex !== -1) {
            modules.splice(projectIndex, 1);
          }
        }

        sidebarManager.saveUploadTrackerModules(modules);

        window.dispatchEvent(new CustomEvent('uploadTrackerUpdate', {
          detail: { type: 'delete', trackerId, context: 'upload-management' }
        }));

        break;
      }
    }

    return removed;
  },

  // ============== HIERARCHY 2: PROJECT DASHBOARD MODULE ==============
  // Purpose: For project-based organization and team collaboration
  // Parent: Direct child of Project Dashboard (root level)
  // Context: "project-dashboard" - shows files organized by project only

  loadProjectDashboardModules: () => {
    try {
      const saved = localStorage.getItem('project_dashboard_modules');
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.error('Error loading project dashboard modules:', error);
      return [];
    }
  },

  saveProjectDashboardModules: (modules) => {
    try {
      localStorage.setItem('project_dashboard_modules', JSON.stringify(modules));
    } catch (error) {
      console.error('Error saving project dashboard modules:', error);
    }
  },

  createProjectDashboardProject: (projectName) => {
    const projectId = projectName
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');

    return {
      id: `project-dashboard-${projectId}-${Date.now()}`,
      moduleId: `project-dashboard-${projectId}`,
      name: projectName,
      type: 'project',
      parentId: 'projects-root', // Direct child of Project Dashboard
      context: 'project-dashboard',
      viewType: 'collaboration',
      path: `/projects/${projectId}`,
      isExpanded: false,
      submodules: [],
      projectStats: {
        totalFiles: 0,
        contributors: [],
        lastActivity: null
      },
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    };
  },

  createProjectDashboardFile: (fileName, trackerId, projectName, employeeName) => {
    const projectId = projectName
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');

    return {
      id: `project-file-${trackerId}`,
      moduleId: `project-file-${trackerId}`,
      name: fileName,
      displayName: fileName.replace(/\.[^/.]+$/, ""),
      type: 'file',
      parentId: `project-dashboard-${projectId}`,
      trackerId: trackerId,
      context: 'project-dashboard',
      viewType: 'collaboration',
      path: `/projects/${projectId}/${trackerId}`,
      createdAt: new Date().toISOString(),
      owner: employeeName,
      contributors: [employeeName],
      metadata: {
        source: 'project',
        uploadedBy: employeeName,
        fileType: fileName.split('.').pop().toUpperCase(),
        uploadDate: new Date().toISOString(),
        version: 1,
        lastModifiedBy: employeeName
      }
    };
  },

  addToProjectDashboard: (projectName, fileName, trackerId, employeeName, metadata = {}) => {
    const modules = sidebarManager.loadProjectDashboardModules();
    const projectId = projectName
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');

    // Find or create project in project dashboard
    let projectModule = modules.find(m =>
      m.moduleId === `project-dashboard-${projectId}` &&
      m.context === 'project-dashboard'
    );

    if (!projectModule) {
      projectModule = sidebarManager.createProjectDashboardProject(projectName);
      modules.push(projectModule);
    }

    // Check if file already exists in this context
    const existingFile = projectModule.submodules.find(file =>
      file.trackerId === trackerId && file.context === 'project-dashboard'
    );

    if (!existingFile) {
      const fileModule = sidebarManager.createProjectDashboardFile(
        fileName,
        trackerId,
        projectName,
        employeeName
      );

      // Add additional metadata
      fileModule.metadata = {
        ...fileModule.metadata,
        ...metadata,
        department: metadata.department || null
      };

      // Add to contributors if new
      if (!projectModule.projectStats.contributors.includes(employeeName)) {
        projectModule.projectStats.contributors.push(employeeName);
      }

      projectModule.submodules.push(fileModule);

      // Update project stats
      projectModule.projectStats.totalFiles = projectModule.submodules.length;
      projectModule.projectStats.lastActivity = new Date().toISOString();
      projectModule.lastUpdated = new Date().toISOString();

      // Sort files by date
      projectModule.submodules.sort((a, b) =>
        new Date(b.createdAt) - new Date(a.createdAt)
      );

      sidebarManager.saveProjectDashboardModules(modules);

      // Dispatch context-specific event
      window.dispatchEvent(new CustomEvent('projectDashboardUpdate', {
        detail: { type: 'add', trackerId, projectName, context: 'project-dashboard' }
      }));
    }

    return modules;
  },

  removeFromProjectDashboard: (trackerId) => {
    const modules = sidebarManager.loadProjectDashboardModules();
    let removed = false;

    for (const projectModule of modules) {
      const fileIndex = projectModule.submodules.findIndex(file =>
        file.trackerId === trackerId && file.context === 'project-dashboard'
      );

      if (fileIndex !== -1) {
        const removedFile = projectModule.submodules[fileIndex];
        projectModule.submodules.splice(fileIndex, 1);
        projectModule.projectStats.totalFiles = projectModule.submodules.length;
        projectModule.projectStats.lastActivity = new Date().toISOString();
        projectModule.lastUpdated = new Date().toISOString();
        removed = true;

        // Remove empty projects
        if (projectModule.submodules.length === 0) {
          const projectIndex = modules.findIndex(p => p.moduleId === projectModule.moduleId);
          if (projectIndex !== -1) {
            modules.splice(projectIndex, 1);
          }
        }

        sidebarManager.saveProjectDashboardModules(modules);

        window.dispatchEvent(new CustomEvent('projectDashboardUpdate', {
          detail: { type: 'delete', trackerId, context: 'project-dashboard' }
        }));

        break;
      }
    }

    return removed;
  },

  // ============== UPDATE OPERATIONS FOR BOTH CONTEXTS ==============

  updateProjectNameInUploadTrackers: (oldProjectName, newProjectName, trackerId) => {
    const modules = sidebarManager.loadUploadTrackerModules();
    const oldProjectId = oldProjectName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const newProjectId = newProjectName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    const projectIndex = modules.findIndex(m =>
      m.moduleId === `upload-project-${oldProjectId}` &&
      m.context === 'upload-management'
    );

    if (projectIndex !== -1) {
      const projectModule = modules[projectIndex];
      projectModule.name = newProjectName;
      projectModule.moduleId = `upload-project-${newProjectId}`;
      projectModule.path = `/upload-trackers/${newProjectId}`;
      projectModule.lastUpdated = new Date().toISOString();

      projectModule.submodules.forEach(file => {
        if (file.trackerId === trackerId || !trackerId) {
          file.parentId = `upload-project-${newProjectId}`;
          file.path = `/upload-trackers/${newProjectId}/${file.trackerId}`;
        }
      });

      sidebarManager.saveUploadTrackerModules(modules);
      window.dispatchEvent(new CustomEvent('uploadTrackerUpdate'));
    }
  },

  updateProjectNameInProjectDashboard: (oldProjectName, newProjectName, trackerId) => {
    const modules = sidebarManager.loadProjectDashboardModules();
    const oldProjectId = oldProjectName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const newProjectId = newProjectName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    const projectIndex = modules.findIndex(m =>
      m.moduleId === `project-dashboard-${oldProjectId}` &&
      m.context === 'project-dashboard'
    );

    if (projectIndex !== -1) {
      const projectModule = modules[projectIndex];
      projectModule.name = newProjectName;
      projectModule.moduleId = `project-dashboard-${newProjectId}`;
      projectModule.path = `/projects/${newProjectId}`;
      projectModule.lastUpdated = new Date().toISOString();

      projectModule.submodules.forEach(file => {
        if (file.trackerId === trackerId || !trackerId) {
          file.parentId = `project-dashboard-${newProjectId}`;
          file.path = `/projects/${newProjectId}/${file.trackerId}`;
        }
      });

      sidebarManager.saveProjectDashboardModules(modules);
      window.dispatchEvent(new CustomEvent('projectDashboardUpdate'));
    }
  },

  // ============== DELETE FROM BOTH CONTEXTS ==============

  deleteFileFromAllContexts: (trackerId) => {
    const removedFromUpload = sidebarManager.removeFromUploadTrackers(trackerId);
    const removedFromProject = sidebarManager.removeFromProjectDashboard(trackerId);

    return { removedFromUpload, removedFromProject };
  },

  // ============== REPAIR FUNCTIONS ==============

  repairAllModules: () => {
    try {
      // Repair Upload Tracker modules
      const uploadModules = sidebarManager.loadUploadTrackerModules();
      const savedTrackers = localStorage.getItem('upload_trackers');
      const trackers = savedTrackers ? JSON.parse(savedTrackers) : [];
      let uploadModified = false;

      uploadModules.forEach(project => {
        if (project.submodules) {
          project.submodules.forEach(file => {
            if (!file.displayName && file.name) {
              file.displayName = file.name.replace(/\.[^/.]+$/, "");
              uploadModified = true;
            }
            const tracker = trackers.find(t => t.id === file.trackerId);
            if (tracker && (!file.metadata?.department || !file.metadata?.employeeName)) {
              if (!file.metadata) file.metadata = {};
              file.metadata.department = tracker.department;
              file.metadata.employeeName = tracker.employeeName;
              uploadModified = true;
            }
          });
        }
      });

      if (uploadModified) {
        sidebarManager.saveUploadTrackerModules(uploadModules);
      }

      // Repair Project Dashboard modules
      const projectModules = sidebarManager.loadProjectDashboardModules();
      let projectModified = false;

      projectModules.forEach(project => {
        if (project.submodules) {
          project.submodules.forEach(file => {
            if (!file.displayName && file.name) {
              file.displayName = file.name.replace(/\.[^/.]+$/, "");
              projectModified = true;
            }
            const tracker = trackers.find(t => t.id === file.trackerId);
            if (tracker && (!file.metadata?.department)) {
              if (!file.metadata) file.metadata = {};
              file.metadata.department = tracker.department;
              projectModified = true;
            }
          });
        }
      });

      if (projectModified) {
        sidebarManager.saveProjectDashboardModules(projectModules);
      }

      // Dispatch both events
      window.dispatchEvent(new CustomEvent('uploadTrackerUpdate'));
      window.dispatchEvent(new CustomEvent('projectDashboardUpdate'));

    } catch (error) {
      console.error('Error repairing modules:', error);
    }
  },

  // ============== GETTERS FOR DIFFERENT CONTEXTS ==============

  getUploadTrackerFiles: () => {
    const modules = sidebarManager.loadUploadTrackerModules();
    const files = [];
    modules.forEach(project => {
      project.submodules.forEach(file => {
        files.push({
          ...file,
          projectName: project.name,
          projectId: project.moduleId
        });
      });
    });
    return files;
  },

  getProjectDashboardFiles: () => {
    const modules = sidebarManager.loadProjectDashboardModules();
    const files = [];
    modules.forEach(project => {
      project.submodules.forEach(file => {
        files.push({
          ...file,
          projectName: project.name,
          projectId: project.moduleId
        });
      });
    });
    return files;
  },

  // ============== CLEAR ALL DATA ==============

  clearAllData: () => {
    localStorage.removeItem('upload_tracker_modules');
    localStorage.removeItem('project_dashboard_modules');
    window.dispatchEvent(new CustomEvent('uploadTrackerUpdate'));
    window.dispatchEvent(new CustomEvent('projectDashboardUpdate'));
  }
};

// ============================================================================
// MODAL COMPONENTS
// ============================================================================

// Add Column Modal Component
const AddColumnModal = ({ isOpen, onClose, onSubmit }) => {
  const [columnName, setColumnName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (!columnName.trim()) {
      setError('Column name is required');
      return;
    }
    onSubmit(columnName.trim());
    setColumnName('');
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-gray-900">Add New Column</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Column Name
          </label>
          <input
            type="text"
            value={columnName}
            onChange={(e) => {
              setColumnName(e.target.value);
              if (error) setError('');
            }}
            placeholder="Enter column name"
            className={`w-full px-3 py-2 border rounded ${error ? 'border-red-500' : 'border-gray-300'
              }`}
            autoFocus
          />
          {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
        </div>

        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Add Column
          </button>
        </div>
      </div>
    </div>
  );
};

// Delete Confirmation Modal
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

// ============================================================================
// HELPER FUNCTION TO CAPITALIZE FIRST LETTER OF COLUMN NAMES
// ============================================================================
const capitalizeFirstLetter = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
};

// ============================================================================
// FILE CONTENT VIEWER COMPONENT - FIXED WITH CONTEXT AND VIEWONLY SUPPORT
// ============================================================================

const FileContentViewer = ({ fileData, trackerInfo, onBack, onSaveData, viewOnly = false, context = 'upload' }) => {
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

  // Checkbox state - ONLY used when viewOnly is false
  const [selectedRows, setSelectedRows] = useState([]);
  const [selectAll, setSelectAll] = useState(false);

  // Action prompts state
  const [showBulkDeletePrompt, setShowBulkDeletePrompt] = useState(false);
  const [showExportConfirmPrompt, setShowExportConfirmPrompt] = useState(null);

  // Filter state - ONLY for project context
  const [columnFilter, setColumnFilter] = useState('');

  // ==========================================================================
  // Function to capitalize headers
  // ==========================================================================
  const capitalizeHeaders = (headers) => {
    if (!headers || !Array.isArray(headers)) return headers;
    return headers.map(header => capitalizeFirstLetter(header));
  };

  // Initialize data when fileData changes
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
  // FIXED: Force rows and headers to be REAL arrays with map function
  // ==========================================================================
  const currentSheet = fileData?.sheets?.[0] || {};

  const headers = React.useMemo(() => {
    // Get raw headers
    let rawHeaders = isEditing ? editedHeaders : (currentSheet.headers || editedHeaders || fileData?.headers || []);

    // If null/undefined, return empty array
    if (!rawHeaders) return [];

    // If already a real array with map, return it
    if (Array.isArray(rawHeaders) && typeof rawHeaders.map === 'function') {
      return rawHeaders;
    }

    // If it has length, convert to real array
    if (rawHeaders.length !== undefined) {
      try {
        console.log('🔄 Converting headers to real array, length:', rawHeaders.length);
        return Array.from(rawHeaders);
      } catch (e) {
        console.error('❌ Failed to convert headers:', e);
        return [];
      }
    }

    return [];
  }, [isEditing, editedHeaders, currentSheet.headers, fileData?.headers]);

  const rows = React.useMemo(() => {
    // Get raw rows
    let rawRows = isEditing ? editedRows : (currentSheet.data || editedRows || fileData?.data || []);

    // If null/undefined, return empty array
    if (!rawRows) return [];

    // If already a real array with map, return it
    if (Array.isArray(rawRows) && typeof rawRows.map === 'function') {
      return rawRows;
    }

    // If it has length, convert to real array
    if (rawRows.length !== undefined) {
      try {
        console.log('🔄 Converting rows to real array, length:', rawRows.length);
        return Array.from(rawRows);
      } catch (e) {
        console.error('❌ Failed to convert rows:', e);
        return [];
      }
    }

    return [];
  }, [isEditing, editedRows, currentSheet.data, fileData?.data]);

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: '', type: '' });
    }, 3000);
  };

  // Column edit handlers - ONLY when not viewOnly
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

  // Sorting
  const handleSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) {
      return <ChevronUp className="h-3 w-3 sm:h-4 sm:w-4 opacity-30" />;
    }
    return sortConfig.direction === 'ascending'
      ? <ChevronUp className="h-3 w-3 sm:h-4 sm:w-4" />
      : <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4" />;
  };

  // Checkbox Functions - ONLY available when viewOnly is false
  const toggleSelectAll = () => {
    if (viewOnly) return;
    if (selectAll) {
      setSelectedRows([]);
      setSelectAll(false);
    } else {
      const allVisibleIndices = sortedRows.map(item => item.originalIndex);
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
        const allVisibleIndices = sortedRows.map(item => item.originalIndex);
        const allSelected = allVisibleIndices.every(idx => newSelection.includes(idx));

        if (allSelected && allVisibleIndices.length > 0) {
          setSelectAll(true);
        }
        return newSelection;
      }
    });
  };

  // Bulk delete function - ONLY available when viewOnly is false
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
    const newRows = rows.filter((_, index) => !selectedRows.includes(index));
    setEditedRows(newRows);
    setSelectedRows([]);
    setSelectAll(false);
    setShowBulkDeletePrompt({ show: false, count: 0 });
    showNotification(`${selectedRows.length} row${selectedRows.length > 1 ? 's' : ''} deleted successfully`);
  };

  // ==========================================================================
  // FIXED: rowsWithIndices with safety check
  // ==========================================================================
  const rowsWithIndices = React.useMemo(() => {
    if (!rows || !Array.isArray(rows) || typeof rows.map !== 'function') {
      console.warn('⚠️ rowsWithIndices: rows is not a valid array', rows);
      return [];
    }

    try {
      return rows.map((row, index) => ({
        data: row,
        originalIndex: index
      }));
    } catch (e) {
      console.error('❌ rows.map failed in rowsWithIndices:', e);
      return [];
    }
  }, [rows]);

  // ==========================================================================
  // FIXED: Filter logic with empty string protection
  // ==========================================================================
  const filteredRows = React.useMemo(() => {
    if (!rowsWithIndices || rowsWithIndices.length === 0) return [];

    return rowsWithIndices.filter(item => {
      // Only apply search if searchTerm has a value
      const matchesSearch = !searchTerm || searchTerm.trim() === '' ||
        item.data.some(cell =>
          String(cell).toLowerCase().includes(searchTerm.toLowerCase())
        );

      // Only apply column filter for project context and when columnFilter has value AND NOT VIEWONLY
      const matchesColumnFilter = !(!viewOnly && context === 'project') ||
        !columnFilter || columnFilter.trim() === '' ||
        item.data.some(cell =>
          String(cell).toLowerCase().includes(columnFilter.toLowerCase())
        );

      return matchesSearch && matchesColumnFilter;
    });
  }, [rowsWithIndices, searchTerm, columnFilter, context, viewOnly]);

  // Sort rows
  const sortedRows = React.useMemo(() => {
    if (!filteredRows || filteredRows.length === 0) return [];
    if (!sortConfig.key) return filteredRows;

    const colIndex = headers.findIndex(h => h === sortConfig.key);
    if (colIndex === -1) return filteredRows;

    return [...filteredRows].sort((a, b) => {
      const aVal = a.data[colIndex] || '';
      const bVal = b.data[colIndex] || '';

      if (aVal < bVal) {
        return sortConfig.direction === 'ascending' ? -1 : 1;
      }
      if (aVal > bVal) {
        return sortConfig.direction === 'ascending' ? 1 : -1;
      }
      return 0;
    });
  }, [filteredRows, sortConfig, headers]);

  // Show loading or error state
  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Loading File Data...</h3>
        <p className="text-gray-600">Please wait while we load your file content.</p>
      </div>
    );
  }

  if (!fileData) {
    return (
      <div className="text-center py-12">
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
    );
  }

  // Only shows "No Data" if we have no headers AND no rows
  if (headers.length === 0 && rows.length === 0 && !isLoading) {
    return (
      <div className="text-center py-12">
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
    );
  }

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

  const handleSaveChanges = () => {
    if (viewOnly) return;
    if (onSaveData) {
      // Create updated file data WITHOUT assuming sheets property
      const updatedFileData = Array.isArray(fileData)
        ? rows.map(row => {
          const obj = {};
          headers.forEach((header, index) => {
            obj[header] = row[index] || '';
          });
          return obj;
        })
        : {
          ...fileData,
          headers: headers,
          data: rows
        };

      onSaveData(updatedFileData);
      showNotification('Changes saved successfully!');
    }
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
    } else if (fileData.data && Array.isArray(fileData.data)) {
      if (typeof fileData.data[0] === 'object') {
        const headers = Object.keys(fileData.data[0]);
        const data = fileData.data.map(row => headers.map(h => row[h] || ''));
        setEditedHeaders(headers);
        setEditedRows(data);
      }
    }
    setIsEditing(false);
    setEditingRowIndex(null);
    showNotification('Edit cancelled', 'info');
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
    const rowData = headers.map(header => newRowData[header] || '');
    const newRows = [...editedRows, rowData];
    setEditedRows(newRows);

    const resetRowData = {};
    headers.forEach(header => {
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

  // Export functions - ONLY for project context and not viewOnly
  const handleExportClick = (format) => {
    if (viewOnly) return;
    if (rows.length === 0) {
      showNotification('No data to export', 'error');
      return;
    }

    setShowExportConfirmPrompt({
      show: true,
      format: format,
      count: rows.length
    });
  };

  const handleExport = (format) => {
    if (viewOnly) return;
    const dataToExport = rows.map(row => {
      const obj = {};
      headers.forEach((header, index) => {
        obj[header] = row[index] || '';
      });
      return obj;
    });

    let content, mimeType, filename;

    switch (format) {
      case 'excel':
        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
        XLSX.writeFile(wb, `${trackerInfo?.fileName?.split('.')[0] || 'data'}.xlsx`);
        showNotification('Export to Excel completed successfully');
        return;
      case 'csv':
        content = convertToCSV(dataToExport);
        mimeType = 'text/csv';
        filename = `${trackerInfo?.fileName?.split('.')[0] || 'data'}.csv`;
        break;
      case 'json':
        content = JSON.stringify(dataToExport, null, 2);
        mimeType = 'application/json';
        filename = `${trackerInfo?.fileName?.split('.')[0] || 'data'}.json`;
        break;
      case 'pdf':
        exportToPDF(dataToExport);
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

    showNotification(`Export to ${format.toUpperCase()} completed successfully`);
  };

  const exportToPDF = (data) => {
    if (viewOnly) return;
    const doc = new jsPDF();
    const tableColumn = headers;
    const tableRows = data.map(row =>
      headers.map(header => row[header] || '')
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

  const convertToCSV = (data) => {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(','),
      ...data.map(row =>
        headers.map(header => {
          const cell = row[header];
          return typeof cell === 'string' && (cell.includes(',') || cell.includes('"') || cell.includes('\n'))
            ? `"${cell.replace(/"/g, '""')}"`
            : cell;
        }).join(',')
      )
    ];

    return csvRows.join('\n');
  };

  return (
    <div className="space-y-3 sm:space-y-4 px-0">
      {/* Notification */}
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

      {/* Bulk Delete Prompt - ONLY show when not viewOnly */}
      {!viewOnly && showBulkDeletePrompt.show && (
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

      {/* Export Confirmation Prompt - ONLY show for project context and not viewOnly */}
      {!viewOnly && context === 'project' && showExportConfirmPrompt?.show && (
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

      {/* Column Management Modal - ONLY show when not viewOnly */}
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
                  className="px-3 py-2 text-xs sm:text-sm border border-gray-300 rounded hover:bg-gray-50 flex items-center gap-1 whitespace-nowrap"
                >
                  <Plus className="h-4 w-4" />
                  Add Column
                </button>
              </div>
            </div>

            {/* Existing columns management section */}
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

      {/* Add Row Modal - ONLY show when not viewOnly */}
      {!viewOnly && showAddRowModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 sm:p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-sm sm:text-base">
                <span className="bg-gray-200 px-2 py-0.5 rounded">
                  Add New Row
                </span>
              </h3>
              <button onClick={() => setShowAddRowModal(false)} className="p-1 text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              {headers.map((header, index) => (
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

      {/* MAIN BORDER CONTAINER */}
      <div className={`bg-white border ${context === 'project' && !viewOnly ? 'border-gray-200 shadow-sm' : 'border-gray-300'} rounded mx-0`}>

        {/* TOOLBAR SECTION */}
        <div className="p-4 border-b border-gray-300">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">

            {/* LEFT SIDE - Search Box ONLY */}
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

            {/* RIGHT SIDE - Action Buttons */}
            <div className="flex gap-2 mt-2 sm:mt-0">

              {/* FILTER BUTTON - ONLY SHOW FOR PROJECT CONTEXT AND NOT VIEWONLY */}
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

              {/* Add Column Button - HIDE when viewOnly */}
              {!viewOnly && (
                <button
                  onClick={() => setShowAddColumnModal(true)}
                  className="flex items-center gap-1 h-10 px-3 text-xs sm:text-sm border border-gray-300 rounded hover:bg-gray-50"
                >
                  <Plus className="h-4 w-4" />
                </button>
              )}

              {/* EXPORT BUTTON - ONLY SHOW FOR PROJECT CONTEXT AND NOT VIEWONLY */}
              {!viewOnly && context === 'project' && (
                <div className="relative">
                  <button
                    onClick={() => setShowExportDropdown(!showExportDropdown)}
                    className="flex items-center gap-1 h-10 px-3 text-xs sm:text-sm border border-gray-300 rounded hover:bg-gray-50"
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

              {/* Back Button - SHOW FOR BOTH CONTEXTS when onBack is provided */}
              {onBack && (
                <button
                  onClick={onBack}
                  className="flex items-center gap-1 h-10 px-3 text-xs sm:text-sm border border-gray-300 rounded hover:bg-gray-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* TABLE SECTION */}
        <div className="relative">
          <div className="overflow-auto max-h-[calc(100vh-300px)]">
            <table className="min-w-full text-xs sm:text-sm border-collapse">
              <thead className="bg-gray-100 sticky top-0 z-10">
                <tr className="border-b border-gray-300">
                  {/* Checkbox column - ONLY show when not viewOnly */}
                  {!viewOnly && (
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
                  )}
                  {headers.map((header, index) => (
                    <th
                      key={index}
                      scope="col"
                      className={`text-left py-2 px-3 font-medium text-gray-700 cursor-pointer hover:bg-gray-200 whitespace-nowrap border-r border-gray-300 ${viewOnly && index === headers.length - 1 ? 'border-r-0' : ''}`}
                      onClick={() => handleSort(header)}
                    >
                      <div className="flex items-center space-x-1">
                        <span>{header}</span>
                        {getSortIcon(header)}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {sortedRows && sortedRows.length > 0 ? (
                  sortedRows.map((item) => {
                    const row = item.data;
                    const rowIndex = item.originalIndex;
                    const isSelected = !viewOnly && selectedRows.includes(rowIndex);
                    const isEditingThisRow = !viewOnly && isEditing && editingRowIndex === rowIndex;

                    return (
                      <tr
                        key={rowIndex}
                        className={`border-b border-gray-300 transition-colors ${!viewOnly && isSelected ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-gray-50'} ${!viewOnly && isEditingThisRow ? 'bg-yellow-50 hover:bg-yellow-100' : ''}`}
                      >
                        {/* Checkbox cell - ONLY show when not viewOnly */}
                        {!viewOnly && (
                          <td className="py-2 px-3 whitespace-nowrap border-r border-gray-300 w-10">
                            <div className="flex items-center justify-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleRowSelection(rowIndex)}
                                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                              />
                            </div>
                          </td>
                        )}
                        {row && row.map((cell, colIndex) => (
                          <td key={colIndex} className={`py-2 px-3 whitespace-nowrap border-r border-gray-300 ${viewOnly && colIndex === row.length - 1 ? 'border-r-0' : ''}`}>
                            {!viewOnly && isEditingThisRow ? (
                              <input
                                type="text"
                                value={cell || ''}
                                onChange={(e) => handleCellChange(rowIndex, colIndex, e.target.value)}
                                className="w-full px-2 py-1.5 text-xs sm:text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                              />
                            ) : (
                              <span className="block truncate max-w-xs" title={cell}>{cell || ''}</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={viewOnly ? headers.length : headers.length + 1} className="px-4 py-12 text-center text-gray-500">
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
        </div>

        {/* FOOTER SECTION */}
        <div className="px-4 py-3 border-t border-gray-300 text-xs text-gray-900 flex flex-col sm:flex-row items-center justify-between gap-2 bg-white">
          {/* LEFT SIDE - Add Row and Action Buttons */}
          <div className="flex items-center gap-2">
            {/* Add Row Button - HIDE when viewOnly */}
            {!viewOnly && (
              <button
                onClick={() => setShowAddRowModal(true)}
                className="flex items-center gap-1 h-10 px-3 text-xs border border-gray-300 rounded hover:bg-gray-50"
              >
                <Plus className="h-4 w-4" />
              </button>
            )}

            {/* Edit, Done, Cancel and Delete buttons - HIDE when viewOnly */}
            {!viewOnly && (selectedRows.length > 0 || isEditing) && (
              <div className="flex items-center gap-1 ml-1">
                {!isEditing ? (
                  <button
                    onClick={handleEditRow}
                    className="flex items-center gap-1 h-10 px-3 text-xs sm:text-sm border border-gray-300 rounded hover:bg-gray-50"
                    title={selectedRows.length === 1 ? "Edit selected row" : "Edit selected rows"}
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                ) : (
                  <>
                    <button
                      onClick={handleSaveChanges}
                      className="flex items-center gap-1 h-10 px-3 text-xs sm:text-sm border border-gray-300 rounded hover:bg-gray-50"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="flex items-center gap-1 h-10 px-3 text-xs sm:text-sm border border-gray-300 rounded hover:bg-gray-50"
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
                  </button>
                )}
              </div>
            )}
          </div>

          {/* RIGHT SIDE - Info and Column Count */}
          <div className="flex items-center gap-4">
            <span>
              {viewOnly ? 'Viewing' : 'Showing'} {sortedRows.length} of {rows.length} rows
              {!viewOnly && context === 'project' && columnFilter && ` (Filtered by: ${columnFilter})`}
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
            <span className="text-blue-600">
              ({headers.length} columns)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};


// ============================================================================
// MAIN UPLOAD TRACKERS COMPONENT
// ============================================================================

const UploadTrackers = ({ selectedFileId, onClearSelection }) => {
  // Get current user from localStorage
  const getCurrentUser = () => {
    const userData = localStorage.getItem('currentUser');
    if (userData) {
      const user = JSON.parse(userData);
      return user.name || user.username || 'Unknown User';
    }
    return sessionStorage.getItem('username') || 'Demo User';
  };

  // Initial columns configuration
  const initialColumns = [
    { id: 'project', label: 'Project Name', sortable: true, type: 'text', required: true, visible: true },
    { id: 'department', label: 'Department', sortable: true, type: 'select', required: true, visible: true },
    { id: 'employeeName', label: 'Employee Name', sortable: true, type: 'text', required: true, visible: true },
    { id: 'fileName', label: 'File Name', sortable: true, type: 'text', required: true, visible: true },
  ];

  // Department options - Updated to match ProjectDashboard
  const departmentOptions = [
    'Design Release',
    'Part Development',
    'Build',
    'Gateway',
    'Validation',
    'Quality Issues',
  ];

  // Load columns
  const [availableColumns, setAvailableColumns] = useState(initialColumns);

  // Load trackers from API
  const [trackers, setTrackers] = useState([]);

  useEffect(() => {
    const fetchTrackers = async () => {
      try {
        const response = await API.get('/datasets/');
        setTrackers(response.data);
      } catch (error) {
        console.error('Error fetching trackers from API:', error);
        showNotification('Failed to load upload history', 'error');
      }
    };
    fetchTrackers();
  }, []);

  const [searchTerm, setSearchTerm] = useState('');
  const [showDeletePrompt, setShowDeletePrompt] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState(null);

  // Editing state
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  // Excel Viewer Modal State
  const [excelViewerData, setExcelViewerData] = useState(null);
  const [excelEditMode, setExcelEditMode] = useState(false);
  const [excelEditData, setExcelEditData] = useState([]);
  const [currentSheet, setCurrentSheet] = useState(0);
  const [excelHeaders, setExcelHeaders] = useState([]);

  // Upload Form Modal State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    project: '',
    department: 'Design Release',
    employeeName: '',
    file: null
  });
  const [uploadFormErrors, setUploadFormErrors] = useState({});

  // Sorting state
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });

  // Filter state
  const [departmentFilter, setDepartmentFilter] = useState('');

  // Store uploaded file data
  const [uploadedFilesData, setUploadedFilesData] = useState(() => {
    const savedData = localStorage.getItem('uploaded_files_data');
    return savedData ? JSON.parse(savedData) : {};
  });

  // Selected file content state
  const [selectedFileContent, setSelectedFileContent] = useState(null);
  const [selectedFileTrackerInfo, setSelectedFileTrackerInfo] = useState(null);

  // New state for checkboxes and selection
  const [selectedTrackers, setSelectedTrackers] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [showBulkDeletePrompt, setShowBulkDeletePrompt] = useState(false);
  const [showBulkEditPrompt, setShowBulkEditPrompt] = useState(false);
  const [showExportConfirmPrompt, setShowExportConfirmPrompt] = useState(null);

  // ==========================================================================
  // FIXED: Initial file loaded flag - CRITICAL FOR NAVIGATION
  // ==========================================================================
  const [initialFileLoaded, setInitialFileLoaded] = useState(false);

  // Show notification
  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: '', type: '' });
    }, 3000);
  };

  // Handle URL parameters when component mounts or URL changes
  useEffect(() => {
    const handleUrlNavigation = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const fileId = urlParams.get('file');
      const projectName = urlParams.get('project');

      console.log('URL Params:', { fileId, projectName });

      if (fileId && !selectedFileId && !initialFileLoaded) {
        const trackerId = parseInt(fileId, 10);
        console.log('Opening file from URL:', trackerId);

        const tracker = trackers.find(t => t.id === trackerId);
        if (tracker) {
          console.log('Found tracker:', tracker);
          setSelectedFileTrackerInfo(tracker);

          const fileData = uploadedFilesData[trackerId];
          if (fileData) {
            setSelectedFileContent(fileData);
            setInitialFileLoaded(true); // ← ADDED
          } else {
            const allFilesData = JSON.parse(localStorage.getItem('uploaded_files_data') || '{}');
            if (allFilesData[trackerId]) {
              setSelectedFileContent(allFilesData[trackerId]);
              setInitialFileLoaded(true); // ← ADDED
            } else {
              showNotification('File data not found. Please re-upload the file.', 'error');
            }
          }
        }
      }

      if (projectName) {
        console.log('Project filter from URL:', projectName);
      }
    };

    const timer = setTimeout(() => {
      handleUrlNavigation();
    }, 100);

    return () => clearTimeout(timer);
  }, [window.location.search, trackers, uploadedFilesData, selectedFileId, initialFileLoaded]);

  // Save trackers and file data to localStorage
  useEffect(() => {
    localStorage.setItem('upload_trackers', JSON.stringify(trackers));
    localStorage.setItem('uploaded_files_data', JSON.stringify(uploadedFilesData));
  }, [trackers, uploadedFilesData]);

  // Scroll position restoration
  useEffect(() => {
    const savedScrollY = sessionStorage.getItem('uploadTrackersScrollY');
    if (savedScrollY) {
      window.scrollTo(0, parseInt(savedScrollY, 10));
    }

    const handleBeforeUnload = () => {
      sessionStorage.setItem('uploadTrackersScrollY', window.scrollY.toString());
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      sessionStorage.setItem('uploadTrackersScrollY', window.scrollY.toString());
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // Repair sidebar modules on mount
  useEffect(() => {
    sidebarManager.repairAllModules();
  }, []);

  // Load file content when selectedFileId changes
  useEffect(() => {
    if (selectedFileId) {
      const tracker = trackers.find(t => t.id === selectedFileId);
      if (tracker) {
        setSelectedFileTrackerInfo(tracker);
      }

      const fileData = uploadedFilesData[selectedFileId];
      if (fileData) {
        setSelectedFileContent(fileData);
        setInitialFileLoaded(true); // ← ADDED
      } else {
        const allFilesData = JSON.parse(localStorage.getItem('uploaded_files_data') || '{}');
        if (allFilesData[selectedFileId]) {
          setSelectedFileContent(allFilesData[selectedFileId]);
          setInitialFileLoaded(true); // ← ADDED
        } else {
          setSelectedFileContent(null);
          showNotification('File data not found. Please re-upload the file.', 'error');
        }
      }
    } else {
      setSelectedFileContent(null);
      setSelectedFileTrackerInfo(null);
      setInitialFileLoaded(false); // ← ADDED - Reset when no file is selected
    }
  }, [selectedFileId, trackers, uploadedFilesData]);

  // Handle saving edited file data
  const handleSaveFileData = (trackerId, updatedFileData) => {
    setUploadedFilesData(prev => ({
      ...prev,
      [trackerId]: updatedFileData
    }));

    const allFilesData = JSON.parse(localStorage.getItem('uploaded_files_data') || '{}');
    allFilesData[trackerId] = updatedFileData;
    localStorage.setItem('uploaded_files_data', JSON.stringify(allFilesData));

    showNotification('File changes saved successfully!');
  };

  // Get current date functions
  const getCurrentDate = () => {
    const now = new Date();
    return now.toISOString().split('T')[0];
  };

  const getFormattedDate = () => {
    const now = new Date();
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return now.toLocaleDateString('en-US', options);
  };

  // Get visible columns for table
  const visibleColumns = availableColumns.filter(col => col.visible);

  // Get unique departments from trackers data
  const uniqueDepartments = [...new Set(trackers.map(tracker => tracker.department).filter(Boolean))];

  // Filter trackers based on search and filters
  const filteredTrackers = trackers.filter(tracker => {
    const matchesSearch = Object.values(tracker).some(value =>
      String(value).toLowerCase().includes(searchTerm.toLowerCase())
    );

    const matchesDept = !departmentFilter || tracker.department?.toLowerCase().includes(departmentFilter.toLowerCase());

    return matchesSearch && matchesDept;
  });

  // Sort trackers
  const sortedTrackers = React.useMemo(() => {
    if (!sortConfig.key) return filteredTrackers;

    return [...filteredTrackers].sort((a, b) => {
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
  }, [filteredTrackers, sortConfig]);

  // Checkbox Functions
  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedTrackers([]);
      setSelectAll(false);
    } else {
      const allVisibleIds = sortedTrackers.map(tracker => tracker.id);
      setSelectedTrackers(allVisibleIds);
      setSelectAll(true);
    }
  };

  const toggleTrackerSelection = (trackerId) => {
    setSelectedTrackers(prev => {
      if (prev.includes(trackerId)) {
        const newSelection = prev.filter(id => id !== trackerId);
        setSelectAll(false);
        return newSelection;
      } else {
        const newSelection = [...prev, trackerId];
        const allVisibleIds = sortedTrackers.map(tracker => tracker.id);
        if (newSelection.length === allVisibleIds.length) {
          setSelectAll(true);
        }
        return newSelection;
      }
    });
  };

  // Bulk edit function
  const handleBulkEdit = () => {
    if (selectedTrackers.length === 0) {
      showNotification('Please select at least one upload to edit', 'error');
      return;
    }

    if (selectedTrackers.length === 1) {
      const tracker = trackers.find(t => t.id === selectedTrackers[0]);
      if (tracker) {
        startEditing(tracker);
      }
    } else {
      showNotification(`${selectedTrackers.length} uploads marked for bulk edit`, 'info');
    }
    setShowBulkEditPrompt(false);
  };

  // Bulk delete function
  const handleBulkDelete = () => {
    if (selectedTrackers.length === 0) {
      showNotification('Please select at least one upload to delete', 'error');
      return;
    }

    setShowBulkDeletePrompt({
      show: true,
      count: selectedTrackers.length
    });
  };

  const confirmBulkDelete = () => {
    // Delete all selected trackers
    const newTrackers = trackers.filter(tracker => !selectedTrackers.includes(tracker.id));
    setTrackers(newTrackers);

    // Remove from uploaded files data
    const newFileData = { ...uploadedFilesData };
    selectedTrackers.forEach(id => {
      delete newFileData[id];
      // Remove from BOTH sidebar contexts
      sidebarManager.deleteFileFromAllContexts(id);
    });
    setUploadedFilesData(newFileData);

    // Clear selection
    setSelectedTrackers([]);
    setSelectAll(false);
    setShowBulkDeletePrompt({ show: false, count: 0 });
    showNotification(`${selectedTrackers.length} upload${selectedTrackers.length > 1 ? 's' : ''} deleted successfully`);
  };

  // Handle sorting
  const handleSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  // Get sort icon for a column
  const getSortIcon = (key) => {
    if (sortConfig.key !== key) {
      return <ChevronUp className="h-3 w-3 sm:h-4 sm:w-4 opacity-30" />;
    }
    return sortConfig.direction === 'ascending'
      ? <ChevronUp className="h-3 w-3 sm:h-4 sm:w-4" />
      : <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4" />;
  };

  // Validation
  const validateEditForm = (tracker) => {
    const errors = {};
    for (const col of availableColumns) {
      if (col.required && !tracker[col.id]?.toString().trim()) {
        errors[col.id] = `${col.label} is required`;
      }
    }
    return errors;
  };

  // Start editing tracker
  const startEditing = (tracker) => {
    setEditingId(tracker.id);
    const editData = { ...tracker };
    availableColumns.forEach(col => {
      if (!editData.hasOwnProperty(col.id)) {
        editData[col.id] = col.type === 'select' ? 'Design' : '';
      }
    });
    setEditForm(editData);
    setValidationErrors({});
  };

  const saveEdit = async () => {
    const errors = validateEditForm(editForm);
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    try {
      // Send update to API
      await API.put(`/datasets/${editingId}`, {
        project: editForm.project,
        department: editForm.department,
        employeeName: editForm.employeeName
      });

      // Get old project name for sidebar update
      const oldTracker = trackers.find(t => t.id === editingId);
      const oldProjectName = oldTracker?.project;
      const newProjectName = editForm.project;

      // Update tracker in state
      setTrackers(trackers.map(tracker =>
        tracker.id === editingId ? { ...tracker, ...editForm } : tracker
      ));

      // Update BOTH sidebar contexts if project name changed
      if (oldProjectName && newProjectName && oldProjectName !== newProjectName) {
        sidebarManager.updateProjectNameInUploadTrackers(oldProjectName, newProjectName, editingId);
        sidebarManager.updateProjectNameInProjectDashboard(oldProjectName, newProjectName, editingId);
      }

      setEditingId(null);
      setEditForm({});
      setValidationErrors({});
      showNotification('Upload record updated successfully');
    } catch (error) {
      console.error('Error updating record:', error);
      showNotification('Failed to update record', 'error');
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
    setValidationErrors({});
  };

  // Delete tracker
  const showDeleteConfirmation = (id, name) => setShowDeletePrompt({ id, name });

  const confirmDeleteTracker = async () => {
    if (showDeletePrompt) {
      const { id } = showDeletePrompt;

      try {
        await API.delete(`/datasets/${id}`);

        // Remove from trackers
        setTrackers(trackers.filter(tracker => tracker.id !== id));

        // Remove from uploaded files data if exists locally
        const newFileData = { ...uploadedFilesData };
        if (newFileData[id]) {
          delete newFileData[id];
          setUploadedFilesData(newFileData);
        }

        // Remove from BOTH sidebar contexts
        sidebarManager.deleteFileFromAllContexts(id);

        setShowDeletePrompt(null);
        showNotification('Upload record deleted successfully');
      } catch (error) {
        console.error('Error deleting record:', error);
        showNotification('Failed to delete record', 'error');
      }
    }
  };

  const cancelDelete = () => setShowDeletePrompt(null);

  // Upload functions
  const openUploadModal = () => {
    setShowUploadModal(true);
    setUploadForm({
      project: '',
      department: 'Design Release',
      employeeName: '',
      file: null
    });
    setUploadFormErrors({});
  };

  const readFileData = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = e.target.result;
          const fileExtension = file.name.split('.').pop().toLowerCase();

          if (fileExtension === 'csv') {
            const workbook = XLSX.read(data, { type: 'binary' });
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

            if (jsonData.length > 0) {
              const headers = jsonData[0];
              const rows = jsonData.slice(1);

              resolve({
                headers,
                data: rows,
                sheets: [{
                  name: 'Sheet1',
                  headers: headers,
                  data: rows
                }]
              });
            } else {
              resolve({
                headers: ['No Data'],
                data: [],
                sheets: [{
                  name: 'Sheet1',
                  headers: ['No Data'],
                  data: []
                }]
              });
            }
          } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
            const workbook = XLSX.read(data, { type: 'binary' });
            const sheets = workbook.SheetNames.map(sheetName => {
              const worksheet = workbook.Sheets[sheetName];
              const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

              if (jsonData.length > 0) {
                return {
                  name: sheetName,
                  headers: jsonData[0],
                  data: jsonData.slice(1)
                };
              } else {
                return {
                  name: sheetName,
                  headers: ['No Data'],
                  data: []
                };
              }
            });

            resolve({
              headers: sheets[0].headers,
              data: sheets[0].data,
              sheets: sheets
            });
          } else if (fileExtension === 'json') {
            const jsonData = JSON.parse(data);
            let headers = [];
            let rows = [];

            if (Array.isArray(jsonData) && jsonData.length > 0) {
              headers = Object.keys(jsonData[0]);
              rows = jsonData.map(item => Object.values(item));
            } else if (typeof jsonData === 'object') {
              headers = ['Key', 'Value'];
              rows = Object.entries(jsonData);
            }

            resolve({
              headers,
              data: rows,
              sheets: [{
                name: 'Data',
                headers: headers,
                data: rows
              }]
            });
          } else {
            const lines = data.split('\n').filter(line => line.trim() !== '');
            const headers = ['Line', 'Content'];
            const rows = lines.map((line, index) => [index + 1, line.trim()]);

            resolve({
              headers,
              data: rows,
              sheets: [{
                name: 'Content',
                headers: headers,
                data: rows
              }]
            });
          }
        } catch (error) {
          console.error('Error parsing file:', error);
          reject(new Error(`Error parsing file: ${error.message}`));
        }
      };

      reader.onerror = (error) => {
        reject(new Error(`File reading error: ${error.target.error}`));
      };

      if (file.name.endsWith('.json') || file.name.endsWith('.txt')) {
        reader.readAsText(file);
      } else {
        reader.readAsBinaryString(file);
      }
    });
  };

  const handleModalFileSelect = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const fileType = file.name.split('.').pop().toUpperCase();
      const allowedTypes = ['CSV', 'XLSX', 'XLS', 'JSON', 'TXT'];

      if (!allowedTypes.includes(fileType)) {
        setUploadFormErrors({ ...uploadFormErrors, file: 'Please upload CSV, Excel, or JSON files only' });
        return;
      }

      if (file.size > 50 * 1024 * 1024) {
        setUploadFormErrors({ ...uploadFormErrors, file: 'File size must be less than 50MB' });
        return;
      }

      setUploadForm({ ...uploadForm, file });
      setUploadFormErrors({ ...uploadFormErrors, file: '' });
    }
  };

  const handleUploadSubmit = async () => {
    const errors = {};
    if (!uploadForm.project.trim()) errors.project = 'Project is required';
    if (!uploadForm.department.trim()) errors.department = 'Department is required';
    if (!uploadForm.employeeName.trim()) errors.employeeName = 'Employee name is required';
    if (!uploadForm.file) errors.file = 'File is required';

    if (Object.keys(errors).length > 0) {
      setUploadFormErrors(errors);
      return;
    }

    setShowUploadModal(false);
    await handleFileUpload(uploadForm.file);
  };

  const handleFileUpload = async (file) => {
    if (!file) return;

    setUploading(true);
    setProgress(0);
    setSelectedFile(file);

    try {
      const formData = new FormData();
      formData.append('file', file);
      if (uploadForm.project) formData.append('project', uploadForm.project);
      if (uploadForm.department) formData.append('department', uploadForm.department);
      if (uploadForm.employeeName) formData.append('employeeName', uploadForm.employeeName);

      const response = await API.post('/datasets/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setProgress(percentCompleted);
        }
      });

      const newTracker = response.data;

      // Get current user for metadata
      const currentUser = getCurrentUser();

      // Ensure progress finishes visually
      setProgress(100);

      // Add to trackers state
      setTrackers(prev => [newTracker, ...prev]);

      // ============ ADD TO BOTH SIDEBAR CONTEXTS ============

      // 1. Add to Upload Trackers hierarchy (for management view)
      sidebarManager.addToUploadTrackers(
        uploadForm.project,
        file.name,
        newTracker.id,
        {
          department: uploadForm.department,
          employeeName: uploadForm.employeeName,
          fileType: file.name.split('.').pop().toUpperCase()
        }
      );

      // 2. Add to Project Dashboard hierarchy (for project view)
      sidebarManager.addToProjectDashboard(
        uploadForm.project,
        file.name,
        newTracker.id,
        currentUser,
        {
          department: uploadForm.department,
          uploadedBy: currentUser,
          fileType: file.name.split('.').pop().toUpperCase()
        }
      );

      // Notify both contexts about the update
      window.dispatchEvent(new CustomEvent('uploadTrackerUpdate', {
        detail: { type: 'create', tracker: newTracker, context: 'upload-management' }
      }));

      window.dispatchEvent(new CustomEvent('projectDashboardUpdate', {
        detail: { type: 'create', tracker: newTracker, context: 'project-dashboard' }
      }));

      setUploading(false);
      setProgress(0);
      setSelectedFile(null);
      setUploadForm({
        project: '',
        department: 'Design Release',
        employeeName: '',
        file: null
      });

      showNotification('File uploaded successfully and added to both sidebar views');

    } catch (error) {
      console.error('Error uploading file:', error);
      setUploading(false);
      setProgress(0);
      showNotification(`Error uploading file: ${error.response?.data?.detail || error.message}. Please try again.`, 'error');
    }
  };

  // Excel viewer functions - FIXED to match FileContentViewer expected format
  const showExcelViewer = async (tracker) => {
    try {
      const response = await API.get(`/datasets/${tracker.id}/excel-view`);
      const { headers, data } = response.data;

      // Create a properly formatted fileData object that FileContentViewer expects
      const formattedFileData = {
        fileName: tracker.fileName,
        headers: headers,
        data: data,
        sheets: [{
          name: "Sheet1",
          headers: headers,
          data: data
        }]
      };

      setExcelViewerData({
        ...tracker,
        fileData: formattedFileData,
        sheets: formattedFileData.sheets
      });

      setExcelEditData(data.map(row => [...(row || [])]));
      setExcelHeaders(headers || []);
      setExcelEditMode(false);
      setCurrentSheet(0);
      setInitialFileLoaded(true);
    } catch (error) {
      console.error('Error fetching excel view data:', error);
      showNotification('Failed to load file data.', 'error');
    }
  };

  const closeExcelViewer = () => {
    setExcelViewerData(null);
    setExcelEditMode(false);
    setExcelEditData([]);
    setExcelHeaders([]);
    setInitialFileLoaded(false);
  };

  // Export functions
  const handleExportClick = (format) => {
    if (sortedTrackers.length === 0) {
      showNotification('No data to export', 'error');
      return;
    }

    setShowExportConfirmPrompt({
      show: true,
      format: format,
      count: sortedTrackers.length
    });
  };

  const handleExport = (format) => {
    const dataToExport = sortedTrackers.map(tracker => {
      const row = {};
      availableColumns.forEach(col => {
        row[col.label] = tracker[col.id] || '';
      });
      return row;
    });

    let content, mimeType, filename;

    switch (format) {
      case 'excel':
        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "UploadTrackers");
        XLSX.writeFile(wb, "upload_trackers.xlsx");
        setShowExportDropdown(false);
        showNotification('Export to Excel completed successfully');
        return;
      case 'csv':
        content = convertToCSV(dataToExport);
        mimeType = 'text/csv';
        filename = 'upload_trackers.csv';
        break;
      case 'json':
        content = JSON.stringify(dataToExport, null, 2);
        mimeType = 'application/json';
        filename = 'upload_trackers.json';
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
  };

  const exportToPDF = (data) => {
    const doc = new jsPDF();
    const tableColumn = availableColumns.map(col => col.label);
    const tableRows = data.map(tracker =>
      availableColumns.map(col => tracker[col.label] || '')
    );

    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [41, 128, 185] }
    });

    doc.save("upload_trackers.pdf");
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

  // Render Input Fields
  const handleInputChange = (field, value, isEdit = false) => {
    if (isEdit) {
      setEditForm({ ...editForm, [field]: value });
    }
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const renderInput = (col, value, onChange, error) => {
    const inputClass = `w-full px-2 py-1 text-xs sm:text-sm border ${error ? 'border-red-500' : 'border-gray-300'} rounded`;

    if (col.id === 'department' && col.type === 'select') return (
      <div>
        <select
          value={value || 'Design Release'}
          onChange={e => onChange(col.id, e.target.value)}
          className={inputClass}
        >
          <option value="">Select Department</option>
          {departmentOptions.map(dept => (
            <option key={dept} value={dept}>{dept}</option>
          ))}
        </select>
        {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
      </div>
    );

    return (
      <div>
        <input type="text" value={value || ''} onChange={e => onChange(col.id, e.target.value)} className={inputClass} />
        {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
      </div>
    );
  };

  // Helper to remove file extension
  const removeExtension = (fileName) => {
    if (!fileName) return '';
    return fileName.replace(/\.[^/.]+$/, "");
  };

  const renderCellContent = (col, value, tracker) => {
    if (col.id === 'fileName') {
      const getFileColor = (type) => {
        switch (type) {
          case 'CSV': return 'text-blue-600';
          case 'XLS':
          case 'XLSX': return 'text-green-600';
          case 'JSON': return 'text-purple-600';
          default: return 'text-gray-600';
        }
      };

      return (
        <div className="flex items-center">
          <File className="h-4 w-4 text-gray-500 mr-2" />
          <span className={`font-medium ${getFileColor(tracker.fileType)}`}>{removeExtension(value) || '-'}</span>
        </div>
      );
    } else if (col.id === 'employeeName') {
      return (
        <div className="flex items-center">
          <User className="h-4 w-4 text-gray-500 mr-1" />
          <span className="font-medium">{value || '-'}</span>
        </div>
      );
    } else if (col.id === 'department') {
      return (
        <div className="flex items-center">
          <span className="font-medium">{value || '-'}</span>
        </div>
      );
    } else if (col.id === 'project') {
      return (
        <div className="flex items-center">
          <span className="font-medium">{value || '-'}</span>
        </div>
      );
    }
    return value || '-';
  };

  // ==========================================================================
  // FIXED: Open file directly - Added setInitialFileLoaded(true)
  // ==========================================================================
  const openFileDirectly = (trackerId) => {
    console.log('Opening file directly:', trackerId);

    const tracker = trackers.find(t => t.id === trackerId);
    if (!tracker) {
      showNotification('File not found', 'error');
      return;
    }

    const fileData = uploadedFilesData[trackerId];
    if (!fileData) {
      const allFilesData = JSON.parse(localStorage.getItem('uploaded_files_data') || '{}');
      if (allFilesData[trackerId]) {
        setSelectedFileContent(allFilesData[trackerId]);
        setSelectedFileTrackerInfo(tracker);
        setInitialFileLoaded(true); // ← ADDED
        showNotification(`Opened file: ${tracker.fileName}`);
      } else {
        showNotification('File data not found. Please re-upload the file.', 'error');
      }
    } else {
      setSelectedFileContent(fileData);
      setSelectedFileTrackerInfo(tracker);
      setInitialFileLoaded(true); // ← ADDED
      showNotification(`Opened file: ${tracker.fileName}`);
    }
  };

  // ==========================================================================
  // FIXED: Check if we should show file content - Improved logic
  // ==========================================================================
  const shouldShowFileContent = selectedFileContent !== null && initialFileLoaded;

  return (
    <div className="space-y-3 sm:space-y-4 px-0">
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

      {/* Delete Tracker Modal */}
      {showDeletePrompt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 sm:p-6 max-w-sm w-full mx-4">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h3 className="font-medium text-gray-900 text-sm sm:text-base">Confirm Delete</h3>
              <button onClick={cancelDelete} className="text-gray-400 hover:text-gray-600"><X className="h-4 w-4 sm:h-5 sm:w-5" /></button>
            </div>
            <div className="mb-4">
              <p className="text-xs sm:text-sm text-gray-600">Delete upload record <span className="font-medium">{showDeletePrompt.name}</span>?</p>
              <p className="text-xs text-red-600 mt-1">This action cannot be undone.</p>
            </div>
            <div className="flex justify-end space-x-2">
              <button onClick={cancelDelete} className="px-3 py-1.5 text-xs sm:text-sm border border-gray-300 rounded hover:bg-gray-50">Cancel</button>
              <button onClick={confirmDeleteTracker} className="px-3 py-1.5 text-xs sm:text-sm bg-red-600 text-white rounded hover:bg-red-700">Delete</button>
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
                Are you sure you want to delete {showBulkDeletePrompt.count} selected upload{showBulkDeletePrompt.count > 1 ? 's' : ''}?
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
                Export {showExportConfirmPrompt.count} upload{showExportConfirmPrompt.count > 1 ? 's' : ''} as {showExportConfirmPrompt.format.toUpperCase()}?
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

      {/* Upload Form Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 sm:p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-sm sm:text-base">
                <span className="bg-gray-100 text-gray-900 px-2 py-1 rounded">
                  Upload Details
                </span>
              </h3>

              <button
                onClick={() => setShowUploadModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Project */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Project *</label>
                <input
                  type="text"
                  placeholder="Enter project name"
                  value={uploadForm.project}
                  onChange={(e) => {
                    setUploadForm({ ...uploadForm, project: e.target.value });
                    if (uploadFormErrors.project) setUploadFormErrors({ ...uploadFormErrors, project: '' });
                  }}
                  className={`w-full px-3 py-2 text-xs sm:text-sm border rounded ${uploadFormErrors.project ? 'border-red-500' : 'border-gray-300'
                    }`}
                />
                {uploadFormErrors.project && <p className="mt-1 text-xs text-red-600">{uploadFormErrors.project}</p>}
              </div>

              {/* Department */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Department *</label>
                <select
                  value={uploadForm.department}
                  onChange={(e) => {
                    setUploadForm({ ...uploadForm, department: e.target.value });
                    if (uploadFormErrors.department) setUploadFormErrors({ ...uploadFormErrors, department: '' });
                  }}
                  className={`w-full px-3 py-2 text-xs sm:text-sm border rounded ${uploadFormErrors.department ? 'border-red-500' : 'border-gray-300'
                    }`}
                >
                  <option value="">Select department</option>
                  {departmentOptions.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
                {uploadFormErrors.department && <p className="mt-1 text-xs text-red-600">{uploadFormErrors.department}</p>}
              </div>

              {/* Employee Name */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Employee Name *</label>
                <input
                  type="text"
                  placeholder="Enter employee name"
                  value={uploadForm.employeeName}
                  onChange={(e) => {
                    setUploadForm({ ...uploadForm, employeeName: e.target.value });
                    if (uploadFormErrors.employeeName) setUploadFormErrors({ ...uploadFormErrors, employeeName: '' });
                  }}
                  className={`w-full px-3 py-2 text-xs sm:text-sm border rounded ${uploadFormErrors.employeeName ? 'border-red-500' : 'border-gray-300'
                    }`}
                />
                {uploadFormErrors.employeeName && <p className="mt-1 text-xs text-red-600">{uploadFormErrors.employeeName}</p>}
              </div>

              {/* File Upload */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">File *</label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-gray-400 transition-colors">
                  <label className="cursor-pointer block">
                    <input
                      type="file"
                      className="hidden"
                      onChange={handleModalFileSelect}
                      accept=".csv,.xlsx,.xls,.json,.txt"
                    />
                    <div className="text-center">
                      <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-xs sm:text-sm text-gray-600 mb-1">
                        {uploadForm.file ? removeExtension(uploadForm.file.name) : 'Click to select file'}
                      </p>
                      <p className="text-xs text-gray-500">Supports: CSV, Excel, JSON, TXT (Max 50MB)</p>
                    </div>
                  </label>
                </div>
                {uploadFormErrors.file && <p className="mt-1 text-xs text-red-600">{uploadFormErrors.file}</p>}
              </div>
            </div>

            <div className="flex justify-end space-x-2 mt-6">
              <button onClick={() => setShowUploadModal(false)} className="px-3 py-1.5 text-xs sm:text-sm border border-gray-300 rounded hover:bg-gray-50">Cancel</button>
              <button onClick={handleUploadSubmit} className="px-3 py-1.5 text-xs sm:text-sm bg-black text-white rounded hover:bg-gray-800">Upload File</button>
            </div>
          </div>
        </div>
      )}

      {/* Excel Viewer Modal - FIXED to pass headers and data at root level */}
      {excelViewerData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-lg w-full max-w-7xl h-[95vh] flex flex-col">
            <div className="flex-1 overflow-auto p-2 sm:p-4">
              <FileContentViewer
                fileData={excelViewerData.fileData || {
                  headers: excelHeaders,
                  data: excelEditData,
                  sheets: [{
                    headers: excelHeaders,
                    data: excelEditData
                  }]
                }}
                trackerInfo={excelViewerData}
                onBack={() => {
                  closeExcelViewer();
                  // Also clear the file selection
                  setSelectedFileContent(null);
                  setSelectedFileTrackerInfo(null);
                  if (onClearSelection) {
                    onClearSelection();
                  }
                }}
                viewOnly={true}
                context="upload"
              />
            </div>
          </div>
        </div>
      )}

      {/* MAIN CONTENT */}
      {shouldShowFileContent ? (
        <FileContentViewer
          fileData={selectedFileContent}
          trackerInfo={selectedFileTrackerInfo}
          onBack={() => {
            // ==========================================================================
            // FIXED: Proper back navigation - Reset all states
            // ==========================================================================
            console.log('Back button clicked - navigating to parent module');

            // Clear local state
            setSelectedFileContent(null);
            setSelectedFileTrackerInfo(null);
            setInitialFileLoaded(false); // ← CRITICAL: Reset the flag

            // Update URL without file parameter
            const url = new URL(window.location);
            url.searchParams.delete('file');
            window.history.pushState({}, '', url);

            // Call onClearSelection to notify parent Dashboard
            if (onClearSelection) {
              onClearSelection(); // This sets selectedUploadFileId to null in Dashboard
            }

            // Dispatch event as backup
            window.dispatchEvent(new CustomEvent('returnToDashboard', {
              detail: { from: 'uploadTrackers' }
            }));

            console.log('Back navigation complete - should show table view');
          }}
          onSaveData={null}
          viewOnly={true}
          context="upload"
        />
      ) : (
        /* Original Upload Trackers content */
        <>
          {/* UPLOAD AREA */}
          <div className="bg-white border border-gray-300 rounded p-4 sm:p-6">
            <div className="text-center">
              <div
                className="border-2 border-dashed border-gray-300 rounded-xl p-4 sm:p-8 hover:border-gray-400 hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={openUploadModal}
              >
                <div className="space-y-2 sm:space-y-3">
                  <Upload className="h-8 w-8 sm:h-12 sm:w-12 text-gray-400 mx-auto" />
                  <div>
                    <p className="font-medium text-sm sm:text-base">Drag & drop files or click to browse</p>
                    <p className="text-xs text-gray-500">Supports: CSV, Excel, JSON, TXT (Max 50MB)</p>
                  </div>
                </div>
              </div>

              {selectedFile && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <File className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium">{removeExtension(selectedFile.name)}</span>
                    </div>
                    <span className="text-xs text-gray-600">
                      {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB
                    </span>
                  </div>
                </div>
              )}

              {uploading && (
                <div className="mt-4 sm:mt-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs sm:text-sm font-medium">Uploading...</span>
                    <span className="text-xs sm:text-sm text-gray-600">{progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5 sm:h-2">
                    <div
                      className="bg-blue-600 h-1.5 sm:h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* MAIN BORDER CONTAINER */}
          <div className="bg-white border border-gray-300 rounded mx-0">

            {/* TOOLBAR SECTION */}
            <div className="p-4 border-b border-gray-300">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">

                {/* LEFT SIDE - Search */}
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

                {/* RIGHT SIDE - Filter and Export */}
                <div className="flex gap-2 mt-2 sm:mt-0">
                  {/* Department Filter */}
                  <div className="relative">
                    <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Filter by department..."
                      value={departmentFilter}
                      onChange={(e) => setDepartmentFilter(e.target.value)}
                      className="h-10 pl-9 pr-3 text-xs sm:text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black w-full sm:w-48"
                    />
                    {departmentFilter && (
                      <button
                        onClick={() => setDepartmentFilter('')}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <X className="h-3 w-3 sm:h-4 sm:w-4" />
                      </button>
                    )}
                  </div>

                  {/* Export Button with Dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setShowExportDropdown(!showExportDropdown)}
                      className="flex items-center gap-1 h-10 px-3 text-xs sm:text-sm border border-gray-300 rounded hover:bg-gray-50"
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
                </div>
              </div>
            </div>

            {/* TABLE SECTION */}
            <div className="overflow-auto max-h-[calc(100vh-300px)] bg-white rounded-lg shadow-sm border border-gray-200">
              <table className="min-w-full text-xs sm:text-sm">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr className="border-b border-gray-200">
                    {/* Checkbox column */}
                    <th className="text-left py-3 px-4 font-semibold text-gray-600 cursor-pointer whitespace-nowrap w-10">
                      <div className="flex items-center justify-center">
                        <button
                          onClick={toggleSelectAll}
                          className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
                        >
                          {selectAll ? (
                            <CheckSquare className="h-4 w-4 text-blue-600" />
                          ) : (
                            <Square className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </th>
                    {visibleColumns.map(col => (
                      <th
                        key={col.id}
                        className="text-left py-3 px-4 font-semibold text-gray-600 cursor-pointer hover:bg-gray-100 transition-colors whitespace-nowrap"
                        onClick={() => col.sortable && handleSort(col.id)}
                      >
                        <div className="flex items-center space-x-1">
                          <span className="uppercase tracking-wider text-xs">{col.label}</span>
                          {col.required && <span className="text-red-500">*</span>}
                          {col.sortable && getSortIcon(col.id)}
                        </div>
                      </th>
                    ))}
                    <th className="text-left py-3 px-4 font-semibold text-gray-600 whitespace-nowrap uppercase tracking-wider text-xs">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {sortedTrackers.map((tracker) => (
                    <tr
                      key={tracker.id}
                      className={`hover:bg-gray-50 transition-colors ${selectedTrackers.includes(tracker.id) ? 'bg-blue-50' : ''}`}
                    >
                      {/* Checkbox cell */}
                      <td className="py-3 px-4 whitespace-nowrap w-10">
                        <div className="flex items-center justify-center">
                          <input
                            type="checkbox"
                            checked={selectedTrackers.includes(tracker.id)}
                            onChange={() => toggleTrackerSelection(tracker.id)}
                            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                        </div>
                      </td>
                      {editingId === tracker.id ?
                        visibleColumns.map(col => (
                          <td key={col.id} className="py-3 px-4 whitespace-nowrap">
                            {renderInput(col, editForm[col.id], (f, v) => handleInputChange(f, v, true), validationErrors[col.id])}
                          </td>
                        )) :
                        visibleColumns.map(col => (
                          <td key={col.id} className="py-3 px-4 whitespace-nowrap">
                            {renderCellContent(col, tracker[col.id], tracker)}
                          </td>
                        ))
                      }
                      <td className="py-3 px-4 whitespace-nowrap">
                        {editingId === tracker.id ? (
                          <div className="flex items-center space-x-2">
                            <button onClick={saveEdit} className="p-1 text-green-600 hover:text-green-800">
                              <Check className="h-4 w-4" />
                            </button>
                            <button onClick={cancelEdit} className="p-1 text-red-600 hover:text-red-800">
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => {
                                showExcelViewer(tracker);
                                // Also set the file as selected for proper navigation
                                setSelectedFileContent(uploadedFilesData[tracker.id]);
                                setSelectedFileTrackerInfo(tracker);
                                setInitialFileLoaded(true);
                              }}
                              className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-full transition-colors"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button onClick={() => startEditing(tracker)} className="p-1.5 text-yellow-600 hover:text-yellow-800 hover:bg-yellow-50 rounded-full transition-colors">
                              <Edit className="h-4 w-4" />
                            </button>
                            <button onClick={() => showDeleteConfirmation(tracker.id, tracker.fileName)} className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-full transition-colors">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* FOOTER SECTION */}
            <div className="px-4 py-3 border-t border-gray-300 text-xs text-gray-900 flex flex-col sm:flex-row items-center justify-between gap-2 bg-white">
              {/* LEFT SIDE - Upload and Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={openUploadModal}
                  className="flex items-center gap-1 h-10 px-3 text-xs border border-gray-300 rounded hover:bg-gray-50"
                >
                  <Plus className="h-4 w-4" />
                </button>

                {/* Edit and Delete buttons */}
                {selectedTrackers.length > 0 && (
                  <div className="flex items-center gap-1 ml-1">
                    <button
                      onClick={handleBulkEdit}
                      className="flex items-center gap-1 h-10 px-3 text-xs sm:text-sm border border-gray-300 rounded hover:bg-gray-50"
                      title={selectedTrackers.length === 1 ? "Edit selected upload" : "Edit selected uploads"}
                    >
                      <Edit className="h-4 w-4" />
                      {selectedTrackers.length > 1 && <span>Edit ({selectedTrackers.length})</span>}
                    </button>

                    <button
                      onClick={handleBulkDelete}
                      className="flex items-center gap-1 h-10 px-3 text-xs sm:text-sm border border-gray-300 rounded hover:bg-red-50 hover:text-red-700 hover:border-red-300"
                      title={selectedTrackers.length === 1 ? "Delete selected upload" : "Delete selected uploads"}
                    >
                      <Trash2 className="h-4 w-4" />
                      {selectedTrackers.length > 1 && <span>Delete ({selectedTrackers.length})</span>}
                    </button>
                  </div>
                )}
              </div>

              {/* RIGHT SIDE - Info and Column Count */}
              <div className="flex items-center gap-4">
                <span>
                  Showing {sortedTrackers.length} of {trackers.length} uploads
                  {departmentFilter && ` (Filtered by: ${departmentFilter})`}
                </span>
                {selectedTrackers.length > 0 && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                    {selectedTrackers.length} selected
                  </span>
                )}
                <span className="text-blue-600">
                  ({visibleColumns.length} columns)
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default UploadTrackers;