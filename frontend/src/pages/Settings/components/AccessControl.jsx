import React, { useState, useEffect } from 'react';
import {
  Shield, UserCheck, Lock, ChevronRight, CheckCircle2, Circle, Search, Plus, Boxes, LayoutDashboard,
  FileText, Settings, Users, ClipboardList, Briefcase, FileSearch, HelpCircle, Key, Activity,
  Info, AlertCircle, Save, X, ToggleLeft, ToggleRight, Trash2, Loader2
} from 'lucide-react';
import API from '../../../utils/api';

const AccessControl = () => {
  const [roles, setRoles] = useState([]);
  const [selectedRole, setSelectedRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDescription, setNewRoleDescription] = useState('');
  const [newRolePermissions, setNewRolePermissions] = useState([]);
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState(null);

  // Show notification component
  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: '', type: '' });
    }, 3000);
  };

  const permissionsGroups = [
    {
      id: 'core',
      label: 'CORE MODULES',
      permissions: [
        { name: 'Dashboard', description: 'Access to real-time analytics and KPIs', tags: ['VIEW'] },
        { name: 'MOM', description: 'Minutes of Meeting management', tags: ['CREATE', 'VIEW'] },
      ]
    },
    {
      id: 'masters',
      label: 'MASTER DATA',
      permissions: [
        {
          name: 'Employee Master',
          description: 'Global staff records and role assignments',
          tags: ['MANAGE'],
          subPermissions: [
            { id: 'ADD', label: 'Add Employee' },
            { id: 'EDIT', label: 'Edit Employee' },
            { id: 'DELETE', label: 'Delete Employee' },
            { id: 'CUSTOM_COLUMNS', label: 'Add Custom Columns' }
          ]
        },
        { name: 'Project Master', description: 'Project lifecycle and resource tracking', tags: ['MANAGE'] },
        { name: 'Department Master', description: 'Organizational hierarchy and departments', tags: ['MANAGE'] },
      ]
    },
    {
      id: 'utilities',
      label: 'UTILITIES & TOOLS',
      permissions: [
        {
          name: 'Upload Trackers',
          description: 'Bulk data upload and tracking systems',
          tags: ['UPLOAD', 'VIEW', 'DELETE'],
          subPermissions: [
            { id: 'upload_tracker', label: 'Upload' },
            { id: 'view_tracker', label: 'View' },
            { id: 'delete_tracker', label: 'Delete' }
          ]
        },
        {
          name: 'Budget Upload',
          description: 'Financial forecasting and budget management',
          tags: ['UPLOAD', 'VIEW', 'DELETE'],
          subPermissions: [
            { id: 'upload_budget', label: 'Upload' },
            { id: 'view_budget', label: 'View' },
            { id: 'delete_budget', label: 'Delete' }
          ]
        },
        { name: 'Settings', description: 'System-wide configuration and security', tags: ['ADMIN'], special: true },
      ]
    }
  ];

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const response = await API.get('/roles/');
      setRoles(response.data);
      if (response.data.length > 0 && !selectedRole) {
        setSelectedRole(response.data[0]);
      } else if (selectedRole) {
        const updated = response.data.find(r => r.id === selectedRole.id);
        if (updated) setSelectedRole(updated);
      }
    } catch (error) {
      console.error('Error fetching roles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePermission = (moduleName, subPermId = null) => {
    if (!selectedRole) return;

    let currentPermissions = selectedRole.permissions || [];
    let updatedPermissions;

    if (subPermId) {
      // Toggle a specific sub-permission
      // If subPermId contains underscore, it's a granular permission (e.g. upload_tracker), use it as is
      const fullSubPerm = subPermId.includes('_') ? subPermId : `${moduleName}:${subPermId}`;
      updatedPermissions = currentPermissions.includes(fullSubPerm)
        ? currentPermissions.filter(p => p !== fullSubPerm)
        : [...currentPermissions, fullSubPerm];
    } else {
      // Toggle the main module
      const isEnabled = currentPermissions.includes(moduleName);
      if (isEnabled) {
        // Disable main module AND all its sub-permissions
        updatedPermissions = currentPermissions.filter(p =>
          p !== moduleName &&
          !p.startsWith(`${moduleName}:`) &&
          !p.endsWith('_tracker') &&
          !p.endsWith('_budget')
        );
      } else {
        // Enable main module AND all its sub-permissions by default
        const moduleObj = permissionsGroups.flatMap(g => g.permissions).find(p => p.name === moduleName);
        const subPerms = moduleObj?.subPermissions?.map(sp => sp.id.includes('_') ? sp.id : `${moduleName}:${sp.id}`) || [];
        updatedPermissions = [...currentPermissions, moduleName, ...subPerms];
      }
    }

    setSelectedRole({ ...selectedRole, permissions: updatedPermissions });
    setRoles(roles.map(r => r.id === selectedRole.id ? { ...r, permissions: updatedPermissions } : r));
  };

  const handleSaveChanges = async () => {
    if (!selectedRole) return;
    try {
      setSaving(true);
      await API.patch(`/roles/${selectedRole.id}`, {
        permissions: selectedRole.permissions
      });
      showNotification('Permissions updated successfully!');
    } catch (error) {
      console.error('Error saving role changes:', error);
      showNotification('Failed to update permissions.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateRole = async () => {
    if (!newRoleName.trim()) return;
    try {
      setSaving(true);
      const response = await API.post('/roles/', {
        name: newRoleName,
        description: newRoleDescription,
        permissions: newRolePermissions
      });
      const updatedRoles = [...roles, response.data];
      setRoles(updatedRoles);
      setSelectedRole(response.data);
      setShowCreateModal(false);
      setNewRoleName('');
      setNewRoleDescription('');
      setNewRolePermissions([]);
      showNotification(`Role "${response.data.name}" created successfully!`);
    } catch (error) {
      console.error('Error creating role:', error);
      showNotification('Failed to create custom role.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const confirmDeleteRole = async () => {
    if (!roleToDelete) return;
    try {
      setSaving(true);
      await API.delete(`/roles/${roleToDelete.id}`);
      const updatedRoles = roles.filter(r => r.id !== roleToDelete.id);
      setRoles(updatedRoles);
      if (selectedRole?.id === roleToDelete.id) {
        setSelectedRole(updatedRoles.length > 0 ? updatedRoles[0] : null);
      }
      setShowDeleteModal(false);
      setRoleToDelete(null);
      showNotification(`Role deleted successfully!`);
    } catch (error) {
      console.error('Error deleting role:', error);
      showNotification('Failed to delete role.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRole = (role) => {
    setRoleToDelete(role);
    setShowDeleteModal(true);
  };

  const Toggle = ({ enabled, onChange, disabled }) => (
    <button
      onClick={() => !disabled && onChange && onChange(!enabled)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${enabled ? 'bg-[#1E3A8A]' : 'bg-slate-200'
        } ${disabled ? 'opacity-30 cursor-not-allowed' : ''}`}
    >
      <span
        aria-hidden="true"
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${enabled ? 'translate-x-5' : 'translate-x-0'
          }`}
      />
    </button>
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-[#1E3A8A]" />
        <p className="text-slate-500 font-medium">Loading synchronization layer...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
      {/* Notification Banner */}
      {notification.show && (
        <div className={`fixed bottom-8 right-8 px-6 py-4 rounded-2xl shadow-2xl z-[200] flex items-center gap-3 animate-in fade-in slide-in-from-right-8 duration-300 border ${notification.type === 'success'
          ? 'bg-emerald-50 border-emerald-100 text-emerald-800'
          : 'bg-red-50 border-red-100 text-red-800'
          }`}>
          {notification.type === 'success' ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <AlertCircle className="h-5 w-5 text-red-500" />}
          <p className="text-sm font-bold">{notification.message}</p>
          <button
            onClick={() => setNotification({ ...notification, show: false })}
            className="ml-2 p-1 hover:bg-black/5 rounded-lg transition-colors"
          >
            <X className="h-4 w-4 opacity-50" />
          </button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-bold text-[#1E293B]">Access Control</h2>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 h-12 px-6 bg-[#1E3A8A] text-white rounded-xl font-bold text-sm hover:bg-[#1e2e6b] transition-all shadow-lg active:scale-95"
        >
          <Shield className="h-4 w-4" />
          Create Custom Role
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Available Roles */}
        <div className="lg:col-span-4 space-y-6">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-sm font-bold text-slate-800">Available Roles</h3>
            <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md text-[10px] font-black">{roles.length} Total</span>
          </div>

          <div className="space-y-4">
            {roles.map((role) => (
              <div key={role.id} className="relative group">
                <button
                  onClick={() => setSelectedRole(role)}
                  className={`w-full text-left p-6 rounded-2xl border transition-all relative overflow-hidden ${selectedRole?.id === role.id
                    ? 'bg-white border-[#1E3A8A] shadow-xl shadow-indigo-100/50'
                    : 'bg-white/50 border-slate-100 hover:border-slate-200 hover:bg-white'
                    }`}
                >
                  {selectedRole?.id === role.id && (
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#1E3A8A]" />
                  )}

                  <div className="flex items-start gap-4 pr-8">
                    <div className={`p-3 rounded-xl shadow-sm border ${selectedRole?.id === role.id ? 'bg-indigo-50 border-indigo-100 text-indigo-600' : 'bg-slate-100 border-slate-200 text-slate-400'
                      }`}>
                      <Shield className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-base font-bold text-[#1E293B]">{role.name}</h4>
                      </div>
                      <p className="text-xs text-slate-500 font-medium leading-relaxed mb-3">
                        {role.description || 'Custom security role.'}
                      </p>
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{role.permissions?.length || 0} Modules Active</span>
                      </div>
                    </div>
                  </div>
                </button>
                {/* Delete button only for non-primary roles if you want, or just all */}
                {!role.is_default && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteRole(role); }}
                    className="absolute top-4 right-4 p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Permissions Dashboard */}
        <div className="lg:col-span-8 bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-[800px]">
          {selectedRole ? (
            <>
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
                <div className="flex items-center gap-6">
                  <div className="w-14 h-14 bg-[#1E3A8A] rounded-2xl flex items-center justify-center text-white shadow-lg">
                    <Shield className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-[#1E293B]">{selectedRole.name} Permissions</h3>

                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSelectedRole(roles.find(r => r.id === selectedRole.id))}
                    className="h-12 px-6 bg-slate-100 text-slate-600 rounded-xl font-bold text-xs hover:bg-slate-200 transition-all"
                  >
                    Discard
                  </button>
                  <button
                    onClick={handleSaveChanges}
                    disabled={saving}
                    className="h-12 px-6 bg-[#1E3A8A] text-white rounded-xl font-bold text-xs shadow-lg shadow-indigo-100 hover:bg-[#1e2e6b] transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save Changes
                  </button>
                </div>
              </div>

              <div className="p-8 space-y-12">
                {permissionsGroups.map((group) => (
                  <div key={group.id} className="space-y-6">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-slate-100 rounded-lg text-slate-500">
                        {group.id === 'core' ? <LayoutDashboard className="h-4 w-4" /> :
                          group.id === 'masters' ? <Boxes className="h-4 w-4" /> :
                            <Settings className="h-4 w-4" />}
                      </div>
                      <h4 className="text-[11px] font-black text-slate-400 tracking-[0.2em]">{group.label}</h4>
                      <div className="flex-1 h-px bg-slate-100" />
                    </div>

                    <div className="space-y-4">
                      {group.permissions.map((perm) => {
                        const isEnabled = selectedRole.permissions?.includes(perm.name);
                        return (
                          <div
                            key={perm.name}
                            className={`p-6 rounded-2xl border transition-all ${perm.special ? 'bg-indigo-50/30 border-indigo-100/50' : 'bg-[#F8FAFC]/50 border-slate-100 hover:bg-white hover:border-slate-200'
                              } ${!isEnabled && !perm.special ? 'opacity-60' : ''}`}
                          >
                            <div className="flex items-start justify-between gap-6">
                              <div className="flex-1 space-y-3">
                                <div className="flex items-center gap-4 flex-wrap">
                                  {perm.special && <Lock className="h-4 w-4 text-indigo-600" />}
                                  <h5 className="text-[15px] font-bold text-[#1E293B]">{perm.name}</h5>
                                  {perm.tags?.map(tag => (
                                    <span key={tag} className="px-2 py-0.5 bg-indigo-600/5 text-indigo-600 text-[9px] font-black tracking-widest uppercase rounded border border-indigo-100/50">
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                                  {perm.description}
                                </p>
                              </div>
                              <Toggle
                                enabled={isEnabled}
                                onChange={() => handleTogglePermission(perm.name)}
                              />
                            </div>

                            {/* Granular Sub-Permissions */}
                            {isEnabled && perm.subPermissions && (
                              <div className="mt-6 pt-6 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-300">
                                {perm.subPermissions.map(sub => {
                                  const isSubEnabled = selectedRole.permissions?.includes(`${perm.name}:${sub.id}`);
                                  return (
                                    <div key={sub.id} className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-100">
                                      <span className="text-xs font-bold text-slate-600 uppercase tracking-tight">{sub.label}</span>
                                      <Toggle
                                        enabled={isSubEnabled}
                                        onChange={() => handleTogglePermission(perm.name, sub.id)}
                                      />
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-12">
              <Shield className="h-16 w-16 mb-4 opacity-20" />
              <p className="font-bold text-sm tracking-widest">SELECT A ROLE TO MANAGE PERMISSIONS</p>
            </div>
          )}

          <div className="mt-auto p-8 bg-slate-50/50 border-t border-slate-100">
            <p className="text-[10px] text-slate-400 font-bold text-center uppercase tracking-widest">
              Role Synchronization Active • Security Level: High
            </p>
          </div>
        </div>
      </div>

      {/* Create Role Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white rounded-[32px] w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-[#1E293B]">Create Custom Role</h3>
              <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>
            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-1">Role Name</label>
                <input
                  type="text"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  placeholder="e.g. Quality Inspector"
                  className="w-full h-14 px-6 rounded-2xl border border-slate-100 bg-slate-50 focus:bg-white focus:border-indigo-600 outline-none transition-all font-medium text-slate-700"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-1">Description</label>
                <textarea
                  value={newRoleDescription}
                  onChange={(e) => setNewRoleDescription(e.target.value)}
                  placeholder="Define the scope of this role..."
                  className="w-full min-h-[100px] p-6 rounded-2xl border border-slate-100 bg-slate-50 focus:bg-white focus:border-indigo-600 outline-none transition-all font-medium text-slate-700 resize-none text-sm"
                />
              </div>

              {/* Permission Checklist */}
              <div className="space-y-4">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-1">Initial Permissions</label>
                <div className="max-h-[300px] overflow-y-auto pr-2 space-y-4 custom-scrollbar">
                  {permissionsGroups.map(group => (
                    <div key={group.id} className="space-y-2">
                      <h5 className="text-[10px] font-black text-slate-300 uppercase tracking-widest px-1">{group.label}</h5>
                      <div className="grid grid-cols-1 gap-2">
                        {group.permissions.map(perm => {
                          const isChecked = newRolePermissions.includes(perm.name);
                          return (
                            <div key={perm.name} className="space-y-2">
                              <div
                                onClick={() => {
                                  if (isChecked) {
                                    setNewRolePermissions(newRolePermissions.filter(p => p !== perm.name && !p.startsWith(`${perm.name}:`)));
                                  } else {
                                    const subPerms = perm.subPermissions?.map(sp => `${perm.name}:${sp.id}`) || [];
                                    setNewRolePermissions([...newRolePermissions, perm.name, ...subPerms]);
                                  }
                                }}
                                className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${isChecked ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-100'
                                  }`}
                              >
                                <span className={isChecked ? 'text-indigo-900 font-bold text-xs' : 'text-slate-600 text-xs font-medium'}>
                                  {perm.name}
                                </span>
                                {isChecked ? <CheckCircle2 className="h-4 w-4 text-indigo-600" /> : <div className="h-4 w-4 rounded-full border-2 border-slate-200" />}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-8 bg-slate-50 flex gap-4">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 h-14 rounded-2xl font-bold text-slate-500 hover:bg-slate-200 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateRole}
                disabled={saving || !newRoleName.trim()}
                className="flex-1 h-14 rounded-2xl bg-[#1E3A8A] text-white font-bold shadow-lg shadow-indigo-100 hover:bg-[#1e2e6b] transition-all disabled:opacity-50"
              >
                {saving ? 'Creating...' : 'Create Role'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white rounded-[32px] w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="p-8 text-center flex flex-col items-center">
              <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center text-red-600 mb-6">
                <Trash2 className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-bold text-[#1E293B] mb-2">Delete Role?</h3>
              <p className="text-sm text-slate-500 font-medium leading-relaxed">
                Are you sure you want to delete <span className="font-bold text-slate-700">"{roleToDelete?.name}"</span>? This action cannot be undone and may affect assigned employees.
              </p>
            </div>
            <div className="p-8 bg-slate-50 flex gap-4">
              <button
                onClick={() => { setShowDeleteModal(false); setRoleToDelete(null); }}
                className="flex-1 h-14 rounded-2xl font-bold text-slate-500 hover:bg-slate-200 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteRole}
                disabled={saving}
                className="flex-1 h-14 rounded-2xl bg-red-600 text-white font-bold shadow-lg shadow-red-100 hover:bg-red-700 transition-all disabled:opacity-50"
              >
                {saving ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccessControl;
