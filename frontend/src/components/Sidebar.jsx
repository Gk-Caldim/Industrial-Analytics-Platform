import React, { useState, useRef } from 'react';
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
import { motion, AnimatePresence } from 'framer-motion';
import { slideInLeft } from '../utils/animations';

// ─── Motion Variants ────────────────────────────────────────────────────────
const EASE = [0.23, 1, 0.32, 1];

const navListVariants = {
    hidden: {},
    visible: {
        transition: { staggerChildren: 0.04, delayChildren: 0.1 }
    }
};

const sidebarItemVariants = {
    hidden: { opacity: 0, x: -12 },
    visible: (i) => ({
        opacity: 1,
        x: 0,
        transition: {
            delay: i * 0.04,
            duration: 0.35,
            ease: EASE
        }
    })
};

// ─── Magnetic Nav Item ───────────────────────────────────────────────────────
const MagneticNavItem = ({ children, className, onClick, isActive, index, style, as: Tag = 'div' }) => {
    const ref = useRef(null);
    const [mouseY, setMouseY] = useState(0);
    const [isHovering, setIsHovering] = useState(false);

    const handleMouseMove = (e) => {
        if (!ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        const relY = e.clientY - rect.top - rect.height / 2;
        setMouseY(relY);
    };

    return (
        <motion.div
            ref={ref}
            custom={index}
            variants={sidebarItemVariants}
            onMouseMove={handleMouseMove}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => { setIsHovering(false); setMouseY(0); }}
            whileHover={{
                x: 4,
                y: mouseY * 0.04,
                scale: 1.02,
                transition: { type: 'spring', stiffness: 260, damping: 18 }
            }}
            style={{ position: 'relative' }}
        >
            {/* Glass hover background */}
            <AnimatePresence>
                {isHovering && !isActive && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        style={{
                            position: 'absolute',
                            inset: 0,
                            borderRadius: '8px',
                            background: 'rgba(255,255,255,0.08)',
                            backdropFilter: 'blur(8px)',
                            WebkitBackdropFilter: 'blur(8px)',
                            pointerEvents: 'none',
                            zIndex: 0
                        }}
                    />
                )}
            </AnimatePresence>

            {/* Active sliding pill */}
            {isActive && (
                <motion.div
                    layoutId="active-pill"
                    style={{
                        position: 'absolute',
                        left: '6px',
                        top: '50%',
                        translateY: '-50%',
                        width: '4px',
                        height: '28px',
                        borderRadius: '999px',
                        background: '#6366f1',
                        zIndex: 2
                    }}
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
            )}

            <div
                onClick={onClick}
                className={className}
                style={{ position: 'relative', zIndex: 1, ...style }}
            >
                {children}
            </div>
        </motion.div>
    );
};

// ─── Animated Icon ───────────────────────────────────────────────────────────
const AnimatedIcon = ({ children, isActive }) => (
    <motion.div
        className={`flex-shrink-0 transition-colors ${isActive ? 'text-indigo-500' : 'text-slate-400'}`}
        whileHover={{ scale: 1.1, color: '#818cf8' }}
        transition={{ duration: 0.16 }}
    >
        {children}
    </motion.div>
);

// ─── Main Sidebar ────────────────────────────────────────────────────────────
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
    handleProjectFileClick,
    hasAccess
}) => {
    const [sidebarHovered, setSidebarHovered] = useState(false);

    const renderProjectDashboardModule = (index) => {
        const isActive = activeModule === 'project-dashboard';
        const isExpanded = expandedModules['project-dashboard'];
        const hasDynamicModules = projectDashboardModules.length > 0;

        return (
            <MagneticNavItem
                key="project-dashboard"
                index={index}
                isActive={isActive}
                onClick={() => handleModuleClick('project-dashboard')}
                className={`sidebar-nav-item ${isActive ? 'sidebar-nav-item-active' : 'sidebar-nav-item-inactive'} ${sidebarCollapsed ? 'justify-center px-2 py-3.5' : 'px-4 py-3.5'}`}
            >
                <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'space-x-3.5'}`}>
                    <AnimatedIcon isActive={isActive}>
                        <BarChart3 className="h-5 w-5" />
                    </AnimatedIcon>
                    {!sidebarCollapsed && (
                        <span className={`font-semibold text-base ${isActive ? 'text-slate-900' : 'text-slate-600'}`}>
                            Dashboard
                        </span>
                    )}
                </div>
                {!sidebarCollapsed && hasDynamicModules && (
                    <button
                        onClick={(e) => { e.stopPropagation(); toggleModuleExpansion('project-dashboard', e); }}
                        className={`p-1.5 rounded-lg transition-colors ${isActive ? 'hover:bg-indigo-500/20 text-indigo-300' : 'hover:bg-transparent/50 text-slate-500'}`}
                    >
                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </button>
                )}
            </MagneticNavItem>
        );
    };

    const renderUploadTrackersModule = (index) => {
        const isActive = activeModule === 'upload-trackers';
        const isExpanded = expandedModules['upload-trackers'];
        const hasDynamicModules = uploadTrackerModules.length > 0;

        return (
            <MagneticNavItem
                key="upload-trackers"
                index={index}
                isActive={isActive}
                onClick={() => handleModuleClick('upload-trackers')}
                className={`sidebar-nav-item ${isActive ? 'sidebar-nav-item-active' : 'sidebar-nav-item-inactive'} ${sidebarCollapsed ? 'justify-center px-2 py-3.5' : 'px-4 py-3.5'}`}
            >
                <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'space-x-3.5'}`}>
                    <AnimatedIcon isActive={isActive}>
                        <FileUp className="h-5 w-5" />
                    </AnimatedIcon>
                    {!sidebarCollapsed && (
                        <span className={`font-semibold text-base ${isActive ? 'text-slate-900' : 'text-slate-600'}`}>
                            Trackers
                        </span>
                    )}
                </div>
                {!sidebarCollapsed && hasDynamicModules && (
                    <button
                        onClick={(e) => { e.stopPropagation(); toggleModuleExpansion('upload-trackers', e); }}
                        className={`p-1.5 rounded-lg transition-colors ${isActive ? 'hover:bg-indigo-500/20 text-indigo-300' : 'hover:bg-transparent/50 text-slate-500'}`}
                    >
                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </button>
                )}
            </MagneticNavItem>
        );
    };

    const renderMOMModule = (index) => {
        const isActive = activeModule === 'mom-module';

        return (
            <MagneticNavItem
                key="mom-module"
                index={index}
                isActive={isActive}
                onClick={() => handleModuleClick('mom-module')}
                className={`sidebar-nav-item ${isActive ? 'sidebar-nav-item-active' : 'sidebar-nav-item-inactive'} ${sidebarCollapsed ? 'justify-center px-2 py-3.5' : 'px-4 py-3.5'}`}
            >
                <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'space-x-3.5'}`}>
                    <AnimatedIcon isActive={isActive}>
                        <MessageSquare className="h-5 w-5" />
                    </AnimatedIcon>
                    {!sidebarCollapsed && (
                        <span className={`font-semibold text-base ${isActive ? 'text-slate-900' : 'text-slate-600'}`}>
                            MOM
                        </span>
                    )}
                </div>
            </MagneticNavItem>
        );
    };

    const renderMastersModule = (index) => {
        const isExpanded = expandedModules['masters'];
        const allowedSubmodules = hasAccess ? mastersSubmodules.filter(s => hasAccess(s.name)) : mastersSubmodules;
        if (allowedSubmodules.length === 0) return null;
        const isActive = activeModule === 'masters-main' || allowedSubmodules.some(s => s.id === activeModule);

        return (
            <div key="masters">
                <MagneticNavItem
                    index={index}
                    isActive={isActive}
                    onClick={() => handleModuleClick('masters-main')}
                    className={`sidebar-nav-item ${isActive ? 'sidebar-nav-item-active' : 'sidebar-nav-item-inactive'} ${sidebarCollapsed ? 'justify-center px-2 py-3.5' : 'px-4 py-3.5'}`}
                >
                    <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'space-x-3.5'}`}>
                        <AnimatedIcon isActive={isActive}>
                            <FolderTree className="h-5 w-5" />
                        </AnimatedIcon>
                        {!sidebarCollapsed && (
                            <span className={`font-semibold text-base ${isActive ? 'text-slate-900' : 'text-slate-600'}`}>
                                Masters
                            </span>
                        )}
                    </div>
                    {!sidebarCollapsed && (
                        <button
                            onClick={(e) => { e.stopPropagation(); toggleModuleExpansion('masters', e); }}
                            className={`p-1.5 rounded-lg transition-colors ${isActive ? 'hover:bg-indigo-500/20 text-indigo-300' : 'hover:bg-white/50 text-slate-500'}`}
                        >
                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </button>
                    )}
                </MagneticNavItem>

                <AnimatePresence>
                    {!sidebarCollapsed && isExpanded && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.25, ease: EASE }}
                            className="ml-7 mt-1.5 space-y-1.5 overflow-hidden"
                        >
                            {allowedSubmodules.map((submodule, i) => {
                                const isSubActive = activeModule === submodule.id;
                                return (
                                    <motion.button
                                        key={submodule.id}
                                        initial={{ opacity: 0, x: -8 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.04, duration: 0.25, ease: EASE }}
                                        onClick={() => handleModuleClick(submodule.id)}
                                        whileHover={{ x: 3, transition: { type: 'spring', stiffness: 260, damping: 18 } }}
                                        className={`sidebar-subnav-item w-full ${isSubActive ? 'sidebar-subnav-item-active' : 'sidebar-subnav-item-inactive'}`}
                                    >
                                        <motion.div
                                            className={`flex-shrink-0 ${isSubActive ? 'text-indigo-500' : 'text-slate-400'}`}
                                            whileHover={{ scale: 1.1 }}
                                            transition={{ duration: 0.16 }}
                                        >
                                            {submodule.icon}
                                        </motion.div>
                                        <span className={`truncate ${isSubActive ? 'text-indigo-900 font-medium' : 'text-inherit'}`}>
                                            {submodule.name}
                                        </span>
                                    </motion.button>
                                );
                            })}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        );
    };

    const renderProjectModule = (projectModule, context) => {
        const projectKey = projectModule.id || projectModule.projectId || projectModule.name;
        const uniqueId = `${context}-${projectKey}`;
        const isExpanded = expandedModules[uniqueId] || false;
        const hasFiles = projectModule.submodules?.length > 0;

        return (
            <div key={uniqueId} className="group">
                <div className="flex items-center justify-between">
                    <motion.div
                        onClick={(e) => toggleModuleExpansion(uniqueId, e)}
                        whileHover={{ x: 3, scale: 1.01, transition: { type: 'spring', stiffness: 260, damping: 18 } }}
                        className="flex-1 flex items-center space-x-2.5 rounded-lg px-3 py-2 cursor-pointer text-sm text-slate-600 hover:bg-white/40"
                    >
                        <motion.div whileHover={{ scale: 1.1 }} transition={{ duration: 0.16 }}>
                            <Layers className="h-4 w-4 flex-shrink-0 text-slate-400" />
                        </motion.div>
                        <span className="font-medium truncate">{projectModule.name}</span>
                    </motion.div>
                    {hasFiles && (
                        <button
                            onClick={(e) => { e.stopPropagation(); toggleModuleExpansion(uniqueId, e); }}
                            className="p-1.5 rounded-lg hover:bg-slate-200/50 text-slate-500 ml-1 transition-colors"
                        >
                            {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                        </button>
                    )}
                </div>

                <AnimatePresence>
                    {isExpanded && hasFiles && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.22, ease: EASE }}
                            className="ml-6 mt-1 space-y-1 border-l border-slate-300/50 pl-2 overflow-hidden"
                        >
                            {projectModule.submodules.map(fileModule => renderFileModule(fileModule, context, projectKey))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        );
    };

    const renderFileModule = (fileModule, context, projectKey) => {
        const isSelected = isFileSelected(fileModule, context);
        const fileId = `${context}-${fileModule.id}-${projectKey}`;

        return (
            <motion.button
                key={fileId}
                whileHover={{ x: 3, transition: { type: 'spring', stiffness: 260, damping: 18 } }}
                onClick={() => {
                    if (context === 'upload-trackers') handleFileModuleClick(fileModule);
                    else if (context === 'project-dashboard') handleProjectFileClick({ ...fileModule, projectName: fileModule.projectName || projectKey });
                }}
                className={`w-full flex items-center space-x-2.5 rounded-md px-2.5 py-1.5 transition-all duration-200 text-sm text-left ${isSelected ? 'bg-indigo-500/10 text-indigo-700 font-semibold' : 'text-slate-500 hover:bg-white/50 hover:text-slate-800'}`}
            >
                <motion.div whileHover={{ scale: 1.1 }} transition={{ duration: 0.16 }}>
                    <FileText className={`h-3.5 w-3.5 flex-shrink-0 ${isSelected ? 'text-indigo-500' : 'text-slate-400'}`} />
                </motion.div>
                <span className="truncate">
                    {fileModule.displayName || (fileModule.name || '').replace(/\.(xlsx|xls|csv|json|txt)$/i, '')}
                </span>
            </motion.button>
        );
    };

    const renderOtherModules = (startIndex) => {
        const allowedOtherModules = hasAccess ? otherModules.filter(m => hasAccess(m.name)) : otherModules;
        return allowedOtherModules.filter(m => m.id !== 'upload-trackers').map((module, i) => {
            const isActive = activeModule === module.id;
            return (
                <MagneticNavItem
                    key={module.id}
                    index={startIndex + i}
                    isActive={isActive}
                    onClick={() => handleModuleClick(module.id)}
                    className={`sidebar-nav-item ${isActive ? 'sidebar-nav-item-active' : 'sidebar-nav-item-inactive'} ${sidebarCollapsed ? 'justify-center px-2 py-3.5' : 'px-4 py-3.5'}`}
                >
                    <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'space-x-3.5'}`}>
                        <AnimatedIcon isActive={isActive}>
                            {module.icon}
                        </AnimatedIcon>
                        {!sidebarCollapsed && (
                            <span className={`font-semibold text-base ${isActive ? 'text-slate-900' : 'text-slate-600'}`}>
                                {module.name}
                            </span>
                        )}
                    </div>
                </MagneticNavItem>
            );
        });
    };

    return (
        <motion.div
            ref={sidebarRef}
            className={`app-sidebar ${sidebarCollapsed ? 'w-16' : 'w-64'} fixed lg:relative inset-y-0 left-0 transform lg:transform-none`}
            onMouseEnter={() => setSidebarHovered(true)}
            onMouseLeave={() => setSidebarHovered(false)}
            variants={slideInLeft}
            initial="hidden"
            animate="visible"
        >
            {/* Collapse Toggle Button */}
            <AnimatePresence>
                {sidebarHovered && (
                    <motion.button
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.15 }}
                        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                        className="sidebar-fixed-btn flex items-center justify-center text-slate-600 hover:text-slate-900"
                        style={{
                            left: sidebarCollapsed ? '52px' : '236px',
                            transform: 'translateX(-50%)',
                            zIndex: 9999
                        }}
                    >
                        {sidebarCollapsed ? <ChevronRightIcon className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                    </motion.button>
                )}
            </AnimatePresence>

            {/* Navigation */}
            <motion.div
                className="sidebar-scroll px-3 py-4 space-y-1.5 text-sm"
                variants={navListVariants}
                initial="hidden"
                animate="visible"
            >
                {(!hasAccess || hasAccess('Dashboard')) && renderProjectDashboardModule(0)}
                {(!hasAccess || hasAccess('MOM')) && renderMOMModule(1)}
                {renderMastersModule(2)}
                <div className="space-y-1.5">
                    {(!hasAccess || hasAccess('Upload Trackers')) && renderUploadTrackersModule(3)}
                    {renderOtherModules(4)}
                </div>
            </motion.div>
        </motion.div>
    );
};

export default Sidebar;
