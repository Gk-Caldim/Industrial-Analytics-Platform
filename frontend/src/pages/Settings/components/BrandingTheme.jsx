import React from 'react';
import { Sun, Moon } from 'lucide-react';

const BrandingTheme = ({ settings, onUpdate, themeSettings, onLocalUpdate }) => {
  const displayMode = settings.find((s) => s.key === 'display_mode')?.value
    || themeSettings?.displayMode
    || 'light';

  const isDark = displayMode === 'dark';

  const handleToggle = () => {
    const next = isDark ? 'light' : 'dark';
    // 1. Update the settings array (will be sent to API on "Sync")
    onUpdate('display_mode', next);
    // 2. Apply instantly to the DOM via ThemeContext
    onLocalUpdate({ displayMode: next });
  };

  return (
    <div style={{ maxWidth: 560 }}>
      {/* Page header */}
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
          Appearance
        </h2>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 6 }}>
          Switch between Light and Dark interface themes. The change applies immediately across all modules.
        </p>
      </div>

      {/* Theme toggle card */}
      <div style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--card-border)',
        borderRadius: 16,
        padding: '28px 28px',
      }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '0.01em' }}>
            Interface Theme
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
            Your preference is saved and persists across sessions.
          </div>
        </div>

        {/* Two option cards */}
        <div style={{ display: 'flex', gap: 16 }}>
          {/* Light option */}
          <button
            onClick={() => {
              if (isDark) handleToggle();
            }}
            style={{
              flex: 1,
              border: `2px solid ${!isDark ? '#1e3a5f' : 'var(--card-border)'}`,
              borderRadius: 12,
              padding: '20px 16px',
              background: !isDark ? 'rgba(30, 58, 95, 0.06)' : 'var(--input-bg)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              textAlign: 'left',
            }}
          >
            {/* Mini preview — light */}
            <div style={{
              width: '100%', height: 72, borderRadius: 8,
              background: '#F1F5F9',
              border: '1px solid #E2E8F0',
              marginBottom: 14,
              overflow: 'hidden',
              display: 'flex',
            }}>
              {/* fake sidebar */}
              <div style={{ width: 28, background: '#1e3a5f', height: '100%' }} />
              {/* fake content */}
              <div style={{ flex: 1, padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ height: 6, width: '60%', background: '#CBD5E1', borderRadius: 4 }} />
                <div style={{ height: 6, width: '40%', background: '#E2E8F0', borderRadius: 4 }} />
                <div style={{ height: 6, width: '80%', background: '#E2E8F0', borderRadius: 4 }} />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: !isDark ? '#1e3a5f' : '#E2E8F0',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Sun size={16} color={!isDark ? '#fff' : '#94A3B8'} strokeWidth={2} />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Light</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Clean white interface</div>
              </div>
              {!isDark && (
                <div style={{
                  marginLeft: 'auto', width: 20, height: 20, borderRadius: '50%',
                  background: '#1e3a5f', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4l2.5 2.5L9 1" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              )}
            </div>
          </button>

          {/* Dark option */}
          <button
            onClick={() => {
              if (!isDark) handleToggle();
            }}
            style={{
              flex: 1,
              border: `2px solid ${isDark ? '#5b9cf6' : 'var(--card-border)'}`,
              borderRadius: 12,
              padding: '20px 16px',
              background: isDark ? 'rgba(91, 156, 246, 0.08)' : 'var(--input-bg)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              textAlign: 'left',
            }}
          >
            {/* Mini preview — dark */}
            <div style={{
              width: '100%', height: 72, borderRadius: 8,
              background: '#0F1117',
              border: '1px solid #2D3148',
              marginBottom: 14,
              overflow: 'hidden',
              display: 'flex',
            }}>
              {/* fake sidebar */}
              <div style={{ width: 28, background: '#1e3a5f', height: '100%' }} />
              {/* fake content */}
              <div style={{ flex: 1, padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ height: 6, width: '60%', background: '#2D3148', borderRadius: 4 }} />
                <div style={{ height: 6, width: '40%', background: '#252836', borderRadius: 4 }} />
                <div style={{ height: 6, width: '80%', background: '#252836', borderRadius: 4 }} />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: isDark ? '#5b9cf6' : '#F1F5F9',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Moon size={15} color={isDark ? '#fff' : '#94A3B8'} strokeWidth={2} />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Dark</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Easy on the eyes</div>
              </div>
              {isDark && (
                <div style={{
                  marginLeft: 'auto', width: 20, height: 20, borderRadius: '50%',
                  background: '#5b9cf6', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4l2.5 2.5L9 1" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              )}
            </div>
          </button>
        </div>

        {/* Toggle row below cards */}
        <div style={{
          marginTop: 24,
          paddingTop: 20,
          borderTop: '1px solid var(--card-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)' }}>
              {isDark ? 'Dark mode is ON' : 'Light mode is ON'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
              Click "SYNC UPDATES" in the sidebar to save your preference permanently.
            </div>
          </div>

          {/* Toggle switch */}
          <button
            onClick={handleToggle}
            style={{
              position: 'relative',
              width: 52,
              height: 28,
              borderRadius: 99,
              border: 'none',
              cursor: 'pointer',
              background: isDark ? '#5b9cf6' : '#CBD5E1',
              transition: 'background 0.25s ease',
              flexShrink: 0,
              padding: 0,
            }}
            title={isDark ? 'Switch to Light' : 'Switch to Dark'}
          >
            <span style={{
              position: 'absolute',
              top: 3,
              left: isDark ? 27 : 3,
              width: 22,
              height: 22,
              borderRadius: '50%',
              background: '#fff',
              transition: 'left 0.22s cubic-bezier(0.4,0,0.2,1)',
              boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              {isDark
                ? <Moon size={11} color="#5b9cf6" strokeWidth={2.2} />
                : <Sun size={11} color="#94A3B8" strokeWidth={2.2} />
              }
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default BrandingTheme;
