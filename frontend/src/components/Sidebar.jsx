import React, { useState } from 'react';
import {
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    ChevronRight as ChevronRightIcon,
    MessageSquare,
    FolderTree,
    FileText,
    Layers,
    BarChart3,
    FileUp
} from 'lucide-react';

const Sidebar = ({
    activeModule,
    hoveredModule,
    setHoveredModule,
    expandedModules,
    sidebarCollapsed,
    setSidebarCollapsed,
    sidebarRef,
    handleModuleClick,
    toggleModuleExpansion,
    projectDashboardModules,
    uploadTrackerModules,
    mastersSubmodules,
    otherModules,
    isFileSelected,
    handleFileModuleClick,
    handleProjectFileClick
}) => {
    const [sidebarHovered, setSidebarHovered] = useState(false);

    const renderProjectDashboardModule = () => {
        const isActive = activeModule === 'project-dashboard';
        const isExpanded = expandedModules['project-dashboard'];
        const hasDynamicModules = projectDashboardModules.length > 0;
        const isHovered = hoveredModule === 'project-dashboard';

        return (
            <div key="project-dashboard">
                <div
                    onMouseEnter={() => setHoveredModule('project-dashboard')}
                    onMouseLeave={() => setHoveredModule(null)}
                    onClick={() => handleModuleClick('project-dashboard')}
                    className={`sidebar-nav-item ${isActive
                        ? 'sidebar-nav-item-active'
                        : isHovered
                            ? 'sidebar-nav-item-hover'
                            : 'sidebar-nav-item-inactive'
                        } ${sidebarCollapsed ? 'justify-center px-2 py-3.5' : 'px-4 py-3.5'}`}
                >
                    <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'space-x-3.5'}`}>
                        <div className={`flex-shrink-0 transition-colors ${isActive ? 'text-indigo-600' : 'text-slate-500 text-inherit'
                            }`}>
                            <BarChart3 className="h-5 w-5" />
                        </div>
                        {!sidebarCollapsed && (
                            <span className={`font-semibold text-base ${isActive ? 'text-slate-900' : 'text-slate-600'
                                }`}>
                                Dashboard
                            </span>
                        )}
                    </div>
                    {!sidebarCollapsed && hasDynamicModules && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                toggleModuleExpansion('project-dashboard', e);
                            }}
                            className={`p-1.5 rounded-lg transition-colors ${isActive ? 'hover:bg-indigo-500/20 text-indigo-300' :
                                'hover:bg-transparent/50 text-slate-500'
                                }`}
                        >
                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </button>
                    )}
                </div>

                {!sidebarCollapsed && isExpanded && hasDynamicModules && (
                    <div className="ml-7 mt-1.5 space-y-1.5">
                        {projectDashboardModules.map(projectModule => renderProjectModule(projectModule, 'project-dashboard'))}
                    </div>
                )}
            </div>
        );
    };

    const renderUploadTrackersModule = () => {
        const isActive = activeModule === 'upload-trackers';
        const isExpanded = expandedModules['upload-trackers'];
        const hasDynamicModules = uploadTrackerModules.length > 0;
        const isHovered = hoveredModule === 'upload-trackers';

        return (
            <div key="upload-trackers">
                <div
                    onMouseEnter={() => setHoveredModule('upload-trackers')}
                    onMouseLeave={() => setHoveredModule(null)}
                    onClick={() => handleModuleClick('upload-trackers')}
                    className={`sidebar-nav-item ${isActive
                        ? 'sidebar-nav-item-active'
                        : isHovered
                            ? 'sidebar-nav-item-hover'
                            : 'sidebar-nav-item-inactive'
                        } ${sidebarCollapsed ? 'justify-center px-2 py-3.5' : 'px-4 py-3.5'}`}
                >
                    <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'space-x-3.5'}`}>
                        <div className={`flex-shrink-0 transition-colors ${isActive ? 'text-indigo-600' : 'text-slate-500 text-inherit'
                            }`}>
                            <FileUp className="h-5 w-5" />
                        </div>
                        {!sidebarCollapsed && (
                            <span className={`font-semibold text-base ${isActive ? 'text-slate-900' : 'text-slate-600'
                                }`}>
                                Upload Trackers
                            </span>
                        )}
                    </div>
                    {!sidebarCollapsed && hasDynamicModules && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                toggleModuleExpansion('upload-trackers', e);
                            }}
                            className={`p-1.5 rounded-lg transition-colors ${isActive ? 'hover:bg-indigo-500/20 text-indigo-300' :
                                'hover:bg-transparent/50 text-slate-500'
                                }`}
                        >
                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </button>
                    )}
                </div>

                {!sidebarCollapsed && isExpanded && hasDynamicModules && (
                    <div className="ml-7 mt-1.5 space-y-1.5">
                        {uploadTrackerModules.map(projectModule => renderProjectModule(projectModule, 'upload-trackers'))}
                    </div>
                )}
            </div>
        );
    };

    const renderMOMModule = () => {
        const isActive = activeModule === 'mom-module';
        const isHovered = hoveredModule === 'mom-module';

        return (
            <button
                key="mom-module"
                onMouseEnter={() => setHoveredModule('mom-module')}
                onMouseLeave={() => setHoveredModule(null)}
                onClick={() => handleModuleClick('mom-module')}
                className={`sidebar-nav-item ${isActive
                    ? 'sidebar-nav-item-active'
                    : isHovered
                        ? 'sidebar-nav-item-hover'
                        : 'sidebar-nav-item-inactive'
                    } ${sidebarCollapsed ? 'justify-center px-2 py-3.5' : 'px-4 py-3.5'}`}
            >
                <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'space-x-3.5'}`}>
                    <div className={`flex-shrink-0 transition-colors ${isActive ? 'text-indigo-600' : 'text-slate-500 text-inherit'
                        }`}>
                        <MessageSquare className="h-5 w-5" />
                    </div>
                    {!sidebarCollapsed && (
                        <span className={`font-semibold text-base ${isActive ? 'text-slate-900' : 'text-slate-600'
                            }`}>
                            MOM
                        </span>
                    )}
                </div>
            </button>
        );
    };

    const renderMastersModule = () => {
        const isExpanded = expandedModules['masters'];
        const isActive = activeModule === 'masters-main' || mastersSubmodules.some(s => s.id === activeModule);
        const isHovered = hoveredModule === 'masters-main';

        return (
            <div key="masters">
                <div
                    onMouseEnter={() => setHoveredModule('masters-main')}
                    onMouseLeave={() => setHoveredModule(null)}
                    onClick={() => handleModuleClick('masters-main')}
                    className={`sidebar-nav-item ${isActive
                        ? 'sidebar-nav-item-active'
                        : isHovered
                            ? 'sidebar-nav-item-hover'
                            : 'sidebar-nav-item-inactive'
                        } ${sidebarCollapsed ? 'justify-center px-2 py-3.5' : 'px-4 py-3.5'}`}
                >
                    <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'space-x-3.5'}`}>
                        <div className={`flex-shrink-0 transition-colors ${isActive ? 'text-indigo-600' : 'text-slate-500 text-inherit'
                            }`}>
                            <FolderTree className="h-5 w-5" />
                        </div>
                        {!sidebarCollapsed && (
                            <span className={`font-semibold text-base ${isActive ? 'text-slate-900' : 'text-slate-600'
                                }`}>
                                Masters
                            </span>
                        )}
                    </div>
                    {!sidebarCollapsed && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                toggleModuleExpansion('masters', e);
                            }}
                            className={`p-1.5 rounded-lg transition-colors ${isActive ? 'hover:bg-indigo-500/20 text-indigo-300' :
                                'hover:bg-white/50 text-slate-500'
                                }`}
                        >
                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </button>
                    )}
                </div>

                {!sidebarCollapsed && isExpanded && (
                    <div className="ml-7 mt-1.5 space-y-1.5">
                        {mastersSubmodules.map((submodule, index) => {
                            const isSubmoduleActive = activeModule === submodule.id;
                            const isSubmoduleHovered = hoveredModule === submodule.id;

                            return (
                                <button
                                    key={submodule.id}
                                    onMouseEnter={() => setHoveredModule(submodule.id)}
                                    onMouseLeave={() => setHoveredModule(null)}
                                    onClick={() => handleModuleClick(submodule.id)}
                                    className={`sidebar-subnav-item ${isSubmoduleActive
                                        ? 'sidebar-subnav-item-active'
                                        : isSubmoduleHovered
                                            ? 'sidebar-subnav-item-hover'
                                            : 'sidebar-subnav-item-inactive'
                                        }`}
                                >
                                    <div className={`flex-shrink-0 ${isSubmoduleActive ? 'text-indigo-600' : 'text-slate-500 text-inherit'
                                        }`}>
                                        {submodule.icon}
                                    </div>
                                    <span className={`truncate ${isSubmoduleActive ? 'text-indigo-900 font-medium' : 'text-inherit'
                                        }`}>
                                        {submodule.name}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    };

    const renderProjectModule = (projectModule, context) => {
        const projectKey = projectModule.id || projectModule.projectId || projectModule.name;
        const uniqueId = `${context}-${projectKey}`;
        const isExpanded = expandedModules[uniqueId] || false;
        const hasFiles = projectModule.submodules?.length > 0;
        const isHovered = hoveredModule === uniqueId;

        return (
            <div key={uniqueId} className="group">
                <div className="flex items-center justify-between">
                    <div
                        onMouseEnter={() => setHoveredModule(uniqueId)}
                        onMouseLeave={() => setHoveredModule(null)}
                        onClick={(e) => toggleModuleExpansion(uniqueId, e)}
                        className={`flex-1 flex items-center space-x-2.5 rounded-lg px-3 py-2 transition-all duration-200 cursor-pointer text-sm ${isHovered
                            ? 'sidebar-subnav-item'
                            : 'text-slate-600 hover:bg-white/40 hover:text-slate-200'
                            }`}
                    >
                        <Layers className={`h-4 w-4 flex-shrink-0 ${isHovered ? 'text-indigo-600' : 'text-slate-500'
                            }`} />
                        <span className="font-medium truncate">
                            {projectModule.name}
                        </span>
                    </div>
                    {hasFiles && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                toggleModuleExpansion(uniqueId, e);
                            }}
                            className={`p-1.5 rounded-lg hover:bg-slate-200/50 text-slate-500 ml-1 transition-colors`}
                        >
                            {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                        </button>
                    )}
                </div>

                {isExpanded && hasFiles && (
                    <div className="ml-6 mt-1 space-y-1 border-l border-slate-300/50 pl-2">
                        {projectModule.submodules.map(fileModule => renderFileModule(fileModule, context, projectKey))}
                    </div>
                )}
            </div>
        );
    };

    const renderFileModule = (fileModule, context, projectKey) => {
        const isSelected = isFileSelected(fileModule, context);
        const fileId = `${context}-${fileModule.id}-${projectKey}`;
        const isHovered = hoveredModule === fileId;

        return (
            <button
                key={fileId}
                onMouseEnter={() => setHoveredModule(fileId)}
                onMouseLeave={() => setHoveredModule(null)}
                onClick={() => {
                    if (context === 'upload-trackers') {
                        handleFileModuleClick(fileModule);
                    } else if (context === 'project-dashboard') {
                        handleProjectFileClick({
                            ...fileModule,
                            projectName: fileModule.projectName || projectKey
                        });
                    }
                }}
                className={`w-full flex items-center space-x-2.5 rounded-md px-2.5 py-1.5 transition-all duration-200 text-sm text-left ${isSelected
                    ? 'bg-indigo-500/10 text-indigo-700 font-semibold'
                    : isHovered
                        ? 'bg-white/50 text-slate-800'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
            >
                <FileText className={`h-3.5 w-3.5 flex-shrink-0 ${isSelected ? 'text-indigo-600' : 'text-slate-500'}`} />
                <span className="truncate">
                    {fileModule.displayName || (fileModule.name || '').replace(/\.(xlsx|xls|csv|json|txt)$/i, '')}
                </span>
            </button>
        );
    };

    const renderOtherModules = () => {
        return otherModules.filter(module => module.id !== 'upload-trackers').map((module, index) => {
            const isActive = activeModule === module.id;
            const isHovered = hoveredModule === module.id;

            return (
                <button
                    key={module.id}
                    onMouseEnter={() => setHoveredModule(module.id)}
                    onMouseLeave={() => setHoveredModule(null)}
                    onClick={() => handleModuleClick(module.id)}
                    className={`sidebar-nav-item ${isActive
                        ? 'sidebar-nav-item-active'
                        : isHovered
                            ? 'sidebar-nav-item-hover'
                            : 'sidebar-nav-item-inactive'
                        } ${sidebarCollapsed ? 'justify-center px-2 py-3.5' : 'px-4 py-3.5'}`}
                >
                    <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'space-x-3.5'}`}>
                        <div className={`flex-shrink-0 transition-colors ${isActive ? 'text-indigo-600' : 'text-slate-500 text-inherit'
                            }`}>
                            {module.icon}
                        </div>
                        {!sidebarCollapsed && (
                            <span className={`font-semibold text-base ${isActive ? 'text-slate-900' : 'text-slate-600'
                                }`}>
                                {module.name}
                            </span>
                        )}
                    </div>
                </button>
            );
        });
    };

    return (
        <div
            ref={sidebarRef}
            className={`app-sidebar ${sidebarCollapsed ? 'w-16' : 'w-64'} fixed lg:relative inset-y-0 left-0 transform lg:transform-none`}
            onMouseEnter={() => setSidebarHovered(true)}
            onMouseLeave={() => setSidebarHovered(false)}
        >
            {/* Collapse Toggle Button */}
            {sidebarHovered && (
                <button
                    onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                    className="sidebar-fixed-btn flex items-center justify-center text-slate-600 hover:text-slate-900"
                    style={{
                        left: sidebarCollapsed ? '52px' : '236px',
                        transform: 'translateX(-50%)',
                        zIndex: 9999
                    }}
                >
                    {sidebarCollapsed ? <ChevronRightIcon className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                </button>
            )}

            {/* Navigation */}
            <div className="sidebar-scroll px-3 py-4 space-y-1.5 text-sm">
                {renderProjectDashboardModule()}
                {renderMOMModule()}
                {renderMastersModule()}
                <div className="space-y-1.5">
                    {renderUploadTrackersModule()}
                    {renderOtherModules()}
                </div>
            </div>
        </div>
    );
};

export default Sidebar;
