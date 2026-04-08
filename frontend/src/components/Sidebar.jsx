import React, { useState } from 'react';
import {
  BarChart3, Upload, Database, MessageSquare,
  Settings, ChevronDown, FileText, Wallet,
  Users, FolderKanban, Calendar, LogOut,
  Table2, Layers
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────
   DESIGN SYSTEM
   Brand navy: #1e3a5f  (their original sidebar colour)
   Active highlight: rgba(255,255,255,0.13)  + 3px left bar
   Hover: rgba(255,255,255,0.06)
   Active bar: #5b9cf6  (soft sky – sits nicely on navy)
   Typography: 15px top-nav / 13.5px sub / 12px file
───────────────────────────────────────────────────────── */

const CSS = `
  .sb { box-sizing: border-box; font-family: 'Inter','DM Sans',-apple-system,sans-serif; -webkit-font-smoothing: antialiased; }
  .sb *, .sb *::before, .sb *::after { box-sizing: inherit; }

  /* scrollbar */
  .sb-nav::-webkit-scrollbar { width: 4px; }
  .sb-nav::-webkit-scrollbar-track { background: transparent; }
  .sb-nav::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 99px; }

  /* ── top-level button ── */
  .sb-btn {
    display: flex; align-items: center;
    width: 100%; border: none; background: none;
    cursor: pointer; text-align: left; font-family: inherit;
    border-radius: 9px; padding: 10px 14px;
    color: rgba(255,255,255,0.58);
    font-size: 15px; font-weight: 500; letter-spacing: -0.01em;
    gap: 12px; transition: background 0.15s, color 0.15s;
    position: relative; user-select: none;
  }
  .sb-btn:hover { background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.88); }
  .sb-btn.active {
    background: rgba(255,255,255,0.11);
    color: #fff;
  }
  .sb-btn.active::before {
    content: '';
    position: absolute; left: 0; top: 22%; height: 56%;
    width: 3px; border-radius: 0 3px 3px 0;
    background: #5b9cf6;
  }
  .sb-btn .sb-ico { flex-shrink: 0; width: 20px; display: flex; align-items: center; justify-content: center; }
  .sb-btn .sb-lbl { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .sb-btn .sb-chev { flex-shrink: 0; transition: transform 0.22s ease; color: rgba(255,255,255,0.25); }
  .sb-btn .sb-chev.open { transform: rotate(180deg); }

  /* ── sub button ── */
  .sb-sub {
    display: flex; align-items: center;
    width: 100%; border: none; background: none;
    cursor: pointer; text-align: left; font-family: inherit;
    border-radius: 7px; padding: 8px 14px 8px 46px;
    color: rgba(255,255,255,0.44);
    font-size: 13.5px; font-weight: 400;
    gap: 9px; transition: background 0.15s, color 0.15s;
    user-select: none;
  }
  .sb-sub:hover { background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.78); }
  .sb-sub.active { color: rgba(255,255,255,0.95); background: rgba(255,255,255,0.07); font-weight: 500; }

  /* ── file item ── */
  .sb-file {
    display: flex; align-items: center; gap: 8px;
    width: 100%; border: none; background: none;
    cursor: pointer; text-align: left; font-family: inherit;
    border-radius: 6px; padding: 6px 14px 6px 60px;
    color: rgba(255,255,255,0.3);
    font-size: 12px; font-weight: 400;
    transition: background 0.15s, color 0.15s;
    user-select: none;
  }
  .sb-file:hover { color: rgba(255,255,255,0.6); }
  .sb-file.active { color: #5b9cf6; font-weight: 500; }

  /* ── collapse panel ── */
  .sb-panel {
    overflow: hidden;
    max-height: 0; opacity: 0;
    transition: max-height 0.24s ease, opacity 0.2s ease;
  }
  .sb-panel.open { max-height: 800px; opacity: 1; }

  /* ── section label ── */
  .sb-sec {
    font-size: 10.5px; font-weight: 600;
    letter-spacing: 0.1em; text-transform: uppercase;
    color: rgba(255,255,255,0.2);
    padding: 16px 14px 5px;
  }

  /* ── group header (project name inside dashboard) ── */
  .sb-grp {
    display: flex; align-items: center; justify-content: space-between;
    padding: 5px 14px 5px 46px;
    border: none; background: none; cursor: pointer;
    width: 100%; font-family: inherit;
  }
  .sb-grp-lbl {
    font-size: 11px; font-weight: 600;
    letter-spacing: 0.07em; text-transform: uppercase;
    color: rgba(255,255,255,0.22);
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }

  /* ── tooltip for collapsed state ── */
  .sb-tip { position: relative; }
  .sb-tip .tip-box {
    display: none; position: absolute;
    left: calc(100% + 12px); top: 50%; transform: translateY(-50%);
    background: #1e3a5f; border: 1px solid rgba(255,255,255,0.12);
    color: #fff; font-size: 13px; font-weight: 500;
    padding: 6px 12px; border-radius: 7px;
    white-space: nowrap; pointer-events: none; z-index: 9999;
    box-shadow: 0 8px 24px rgba(0,0,0,0.4);
  }
  .sb-tip .tip-box::before {
    content: ''; position: absolute;
    right: 100%; top: 50%; transform: translateY(-50%);
    border: 5px solid transparent;
    border-right-color: rgba(255,255,255,0.12);
  }
  .sb-tip:hover .tip-box { display: block; }

  /* ── footer user row ── */
  .sb-foot {
    display: flex; align-items: center; gap: 10px;
    padding: 12px 14px;
    border-top: 1px solid rgba(255,255,255,0.07);
  }
  .sb-ava {
    width: 36px; height: 36px; border-radius: 9px; flex-shrink: 0;
    background: rgba(255,255,255,0.12);
    display: flex; align-items: center; justify-content: center;
    font-size: 13px; font-weight: 700; color: #fff; letter-spacing: 0.03em;
  }
  .sb-logout {
    margin-left: auto; flex-shrink: 0;
    width: 30px; height: 30px; border-radius: 7px;
    border: 1px solid rgba(255,255,255,0.08);
    background: none; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    color: rgba(255,255,255,0.3);
    transition: background 0.15s, color 0.15s, border-color 0.15s;
  }
  .sb-logout:hover { background: rgba(239,68,68,0.14); color: #f87171; border-color: rgba(239,68,68,0.25); }

  /* ── divider for collapsed section ── */
  .sb-div { height: 1px; background: rgba(255,255,255,0.07); margin: 8px 0; }
`;

let cssInjected = false;
function injectCSS() {
  if (cssInjected || typeof document === 'undefined') return;
  if (document.getElementById('sb-v3')) return;
  const s = document.createElement('style');
  s.id = 'sb-v3';
  s.textContent = CSS;
  document.head.appendChild(s);
  cssInjected = true;
}

/* ─── small helpers ─────────────────────────────────────── */
const Panel = ({ open, children }) => (
  <div className={`sb-panel${open ? ' open' : ''}`}>{children}</div>
);

const SecLabel = ({ label, collapsed }) =>
  collapsed
    ? <div className="sb-div" />
    : <div className="sb-sec">{label}</div>;

/* ─── top-level nav button ──────────────────────────────── */
function TopBtn({ icon: Icon, label, active, hasChev, chevOpen, onClick, onToggle, collapsed, badge }) {
  if (collapsed) {
    return (
      <div className="sb-tip">
        <button
          className={`sb-btn${active ? ' active' : ''}`}
          onClick={onClick}
          style={{ justifyContent: 'center', padding: '11px 0' }}
        >
          <span className="sb-ico">
            <Icon size={20} strokeWidth={active ? 2.2 : 1.7} />
          </span>
        </button>
        <div className="tip-box">{label}</div>
      </div>
    );
  }
  return (
    <button className={`sb-btn${active ? ' active' : ''}`} onClick={onClick}>
      <span className="sb-ico">
        <Icon size={18} strokeWidth={active ? 2.2 : 1.7} />
      </span>
      <span className="sb-lbl">{label}</span>
      {badge != null && (
        <span style={{
          background: '#5b9cf6', color: '#fff',
          fontSize: 11, fontWeight: 700,
          padding: '1px 7px', borderRadius: 99, flexShrink: 0,
        }}>
          {badge}
        </span>
      )}
      {hasChev && (
        <span 
          style={{ padding: '0 4px', display: 'flex' }}
          onClick={(e) => {
            if (onToggle) {
              e.preventDefault();
              e.stopPropagation();
              onToggle(e);
            }
          }}
        >
          <ChevronDown size={14} strokeWidth={2} className={`sb-chev${chevOpen ? ' open' : ''}`} />
        </span>
      )}
    </button>
  );
}

/* ─── sub-level button ──────────────────────────────────── */
function SubBtn({ icon: Icon, label, active, onClick }) {
  return (
    <button className={`sb-sub${active ? ' active' : ''}`} onClick={onClick}>
      {Icon && <Icon size={14} strokeWidth={1.8} style={{ flexShrink: 0 }} />}
      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
    </button>
  );
}

/* ─── file item ─────────────────────────────────────────── */
function FileBtn({ label, active, onClick }) {
  return (
    <button className={`sb-file${active ? ' active' : ''}`} onClick={onClick}>
      <FileText size={11} strokeWidth={1.8} style={{ flexShrink: 0 }} />
      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
    </button>
  );
}

/* ─── project file group (inside dashboard) ─────────────── */
function ProjectGroup({ proj, context, isFileSelected, onFileClick, expandedModules, toggleMod }) {
  // Respect the original Dashboard.jsx context prefixing logic
  const moduleId = context === 'project-dashboard' ? proj.id : `${context}-${proj.id}`;
  const isOpen = !!(expandedModules[moduleId] || expandedModules[proj.id]);
  const hasFiles = proj.submodules?.length > 0;

  return (
    <div>
      <button className="sb-grp" onClick={(e) => { e.stopPropagation(); toggleMod(moduleId, e); }}>
        <span className="sb-grp-lbl">{proj.name}</span>
        {hasFiles && (
          <ChevronDown
            size={11}
            style={{
              color: 'rgba(255,255,255,0.2)',
              flexShrink: 0,
              transition: 'transform 0.2s',
              transform: isOpen ? 'rotate(180deg)' : 'none',
            }}
          />
        )}
      </button>
      {hasFiles && (
        <Panel open={isOpen}>
          {proj.submodules.map((f) => (
            <FileBtn
              key={f.id}
              label={f.displayName || f.name?.replace(/\.[^/.]+$/, '') || ''}
              active={isFileSelected(f, context)}
              onClick={() => onFileClick({ ...f, projectName: f.projectName || proj.name })}
            />
          ))}
        </Panel>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   MAIN SIDEBAR
════════════════════════════════════════════════════════════ */
export default function Sidebar({
  sidebarCollapsed,
  activeModule,
  expandedModules,
  projectDashboardModules,
  uploadTrackerModules,
  companyLogo,
  companyName,
  user,
  handleModuleClick,
  toggleModuleExpansion,
  handleFileModuleClick,
  handleProjectFileClick,
  isFileSelected,
  hasPermission,
  onLogout,
}) {
  injectCSS();

  const collapsed = sidebarCollapsed;
  const W = collapsed ? 64 : 248;

  const isOpen = (k) => !!expandedModules[k];
  const perm   = (n) => !hasPermission || hasPermission(n);

  const initials = user?.full_name
    ? user.full_name.split(' ').filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase()
    : 'U';

  return (
    <div
      className="sb"
      style={{
        width: W, minWidth: W, height: '100%',
        background: '#1e3a5f',
        display: 'flex', flexDirection: 'column',
        flexShrink: 0,
        overflow: 'hidden',
        transition: 'width 0.2s ease, min-width 0.2s ease',
        boxShadow: '1px 0 0 rgba(255,255,255,0.06)',
      }}
    >

      {/* ══ LOGO ════════════════════════════════════════════ */}
      <div style={{
        padding: collapsed ? '14px 0' : '0 0 6px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        minHeight: collapsed ? 72 : 90,
      }}>
        {collapsed ? (
          /* Collapsed — initials square */
          <div style={{
            width: 36, height: 36, borderRadius: 9,
            background: 'rgba(255,255,255,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 800, color: '#fff',
          }}>
            {companyName ? companyName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : 'CD'}
          </div>
        ) : (
          /* Expanded — full logo image, same as original Dashboard */
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', padding: '12px 20px' }}>
            <img
              src={companyLogo || '/caldimlogo.png'}
              alt="Company Logo"
              style={{
                maxHeight: 60,
                maxWidth: '100%',
                objectFit: 'contain',
                filter: companyLogo ? 'none' : 'brightness(0) invert(1)',
              }}
            />
          </div>
        )}
      </div>

      {/* ══ NAV ═════════════════════════════════════════════ */}
      <div
        className="sb-nav"
        style={{
          flex: 1, overflowY: 'auto', overflowX: 'hidden',
          padding: collapsed ? '8px 6px' : '8px 8px 20px',
        }}
      >

        {/* — WORKSPACE — */}
        <SecLabel label="Workspace" collapsed={collapsed} />

        {/* Dashboard */}
        {perm('Dashboard') && (
          <>
            <TopBtn
              icon={BarChart3}
              label="Dashboard"
              active={activeModule === 'project-dashboard'}
              hasChev={!collapsed && (projectDashboardModules?.length > 0)}
              chevOpen={isOpen('project-dashboard')}
              collapsed={collapsed}
              onClick={() => handleModuleClick('project-dashboard')}
              onToggle={(e) => toggleModuleExpansion('project-dashboard', e)}
            />
            {!collapsed && (
              <Panel open={isOpen('project-dashboard')}>
                {projectDashboardModules?.map((proj) => (
                  <ProjectGroup
                    key={proj.id}
                    proj={proj}
                    context="project-dashboard"
                    isFileSelected={isFileSelected}
                    onFileClick={handleProjectFileClick}
                    expandedModules={expandedModules}
                    toggleMod={toggleModuleExpansion}
                  />
                ))}
              </Panel>
            )}
          </>
        )}

        {/* Meetings */}
        {perm('MOM') && (
          <>
            <TopBtn
              icon={MessageSquare}
              label="Meetings"
              active={['mom-module', 'meetings', 'schedule-meeting'].includes(activeModule)}
              hasChev={!collapsed}
              chevOpen={isOpen('mom')}
              collapsed={collapsed}
              onClick={() => handleModuleClick('mom-module')}
              onToggle={(e) => toggleModuleExpansion('mom', e)}
            />
            {!collapsed && (
              <Panel open={isOpen('mom')}>
                <SubBtn
                  icon={Layers}
                  label="All Meetings"
                  active={activeModule === 'meetings'}
                  onClick={() => handleModuleClick('meetings')}
                />
                <SubBtn
                  icon={Calendar}
                  label="Schedule Meeting"
                  active={activeModule === 'schedule-meeting'}
                  onClick={() => handleModuleClick('schedule-meeting')}
                />
              </Panel>
            )}
          </>
        )}

        {/* — CONFIGURATION — */}
        <SecLabel label="Configuration" collapsed={collapsed} />

        {/* Masters */}
        <>
          <TopBtn
            icon={Database}
            label="Masters"
            active={['masters-main', 'employee-master', 'project-master', 'budget-master'].includes(activeModule)}
            hasChev={!collapsed}
            chevOpen={isOpen('masters')}
            collapsed={collapsed}
            onClick={() => handleModuleClick('masters-main')}
            onToggle={(e) => toggleModuleExpansion('masters', e)}
          />
          {!collapsed && (
            <Panel open={isOpen('masters')}>
              <SubBtn
                icon={Users}
                label="Employee Master"
                active={activeModule === 'employee-master'}
                onClick={() => handleModuleClick('employee-master')}
              />
              <SubBtn
                icon={FolderKanban}
                label="Project Master"
                active={activeModule === 'project-master'}
                onClick={() => handleModuleClick('project-master')}
              />
              <SubBtn
                icon={Wallet}
                label="Budget Master"
                active={activeModule === 'budget-master'}
                onClick={() => handleModuleClick('budget-master')}
              />
            </Panel>
          )}
        </>

        {/* Uploads */}
        {perm('Upload Trackers') && (
          <>
            <TopBtn
              icon={Upload}
              label="Uploads"
              active={['upload-trackers', 'budget-upload', 'uploads-main'].includes(activeModule)}
              hasChev={!collapsed}
              chevOpen={isOpen('uploads')}
              collapsed={collapsed}
              onClick={() => handleModuleClick('uploads-main')}
              onToggle={(e) => toggleModuleExpansion('uploads', e)}
            />
            {!collapsed && (
              <Panel open={isOpen('uploads')}>
                {/* Trackers Button */}
                <div style={{ display: 'flex', alignItems: 'center' }}>
                   <SubBtn
                     icon={Table2}
                     label="Trackers Upload"
                     active={activeModule === 'upload-trackers'}
                     onClick={() => handleModuleClick('upload-trackers')}
                   />
                   <span 
                      style={{ padding: '0 8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                      onClick={(e) => { e.stopPropagation(); toggleModuleExpansion('upload-trackers', e); }}
                   >
                     {uploadTrackerModules?.length > 0 && (
                        <ChevronDown size={14} strokeWidth={2} style={{
                           color: 'rgba(255,255,255,0.2)',
                           transition: 'transform 0.2s',
                           transform: isOpen('upload-trackers') ? 'rotate(180deg)' : 'none'
                        }} />
                     )}
                   </span>
                </div>
                {/* Trackers Projects Expansion */}
                <Panel open={isOpen('upload-trackers')}>
                  {uploadTrackerModules?.map((proj) => (
                    <ProjectGroup
                      key={proj.id}
                      proj={proj}
                      context="upload-trackers"
                      isFileSelected={isFileSelected}
                      onFileClick={handleFileModuleClick}
                      expandedModules={expandedModules}
                      toggleMod={toggleModuleExpansion}
                    />
                  ))}
                </Panel>
                {/* Budget Upload Button */}
                <SubBtn
                  icon={Wallet}
                  label="Budget Upload"
                  active={activeModule === 'budget-upload'}
                  onClick={() => handleModuleClick('budget-upload')}
                />
              </Panel>
            )}
          </>
        )}

        {/* Settings */}
        {perm('Settings') && (
          <TopBtn
            icon={Settings}
            label="Settings"
            active={activeModule === 'system-settings'}
            collapsed={collapsed}
            onClick={() => handleModuleClick('system-settings')}
          />
        )}

      </div>

      {/* ══ FOOTER ══════════════════════════════════════════ */}
      <div className="sb-foot" style={{ justifyContent: collapsed ? 'center' : 'flex-start' }}>
        <div className="sb-ava">{initials}</div>

        {!collapsed && (
          <>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 13.5, fontWeight: 600, color: '#fff',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {user?.full_name || 'User'}
              </div>
              <div style={{
                fontSize: 12, color: 'rgba(255,255,255,0.35)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                textTransform: 'capitalize', marginTop: 1,
              }}>
                {user?.role || 'Member'}
              </div>
            </div>
            <button className="sb-logout" onClick={onLogout} title="Logout">
              <LogOut size={15} strokeWidth={1.8} />
            </button>
          </>
        )}
      </div>

    </div>
  );
}
