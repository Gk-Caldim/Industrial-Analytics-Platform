// ScheduleMeetingSidebar.jsx
import React, { useState, useEffect, useCallback } from 'react';
import API from '../../utils/api';
import './ScheduleMeetingSidebar.css';

export function ScheduleMeetingSidebar({ isOpen, onClose, momData }) {
  // State
  const [formData, setFormData] = useState({
    title: '',
    date: '',
    time: '',
    platform: null,
    description: '',
    duration: '60',
    attendees: '',
  });

  const [uiState, setUiState] = useState({
    isLoading: false,
    errors: {},
    successMessage: '',
    timezone: 'UTC+5:30',
  });

  const [meetingResult, setMeetingResult] = useState(null);

  // Get current timezone
  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const offset = new Date().getTimezoneOffset();
    setUiState(prev => ({ ...prev, timezone: tz || `UTC${offset > 0 ? '-' : '+'}${Math.abs(offset / 60)}` }));
  }, []);

  // Form change handlers
  const handleDateChange = useCallback((e) => {
    setFormData(prev => ({ ...prev, date: e.target.value }));
    validateField('date', e.target.value);
  }, []);

  const handleTimeChange = useCallback((e) => {
    setFormData(prev => ({ ...prev, time: e.target.value }));
    validateField('time', e.target.value);
  }, []);
  
  const handleTitleChange = useCallback((e) => {
    setFormData(prev => ({ ...prev, title: e.target.value }));
    validateField('title', e.target.value);
  }, []);

  const selectPlatform = useCallback((platform, event) => {
    setFormData(prev => ({ ...prev, platform }));
    validateField('platform', platform);
    triggerRipple(event.currentTarget); // Ripple effect
  }, []);

  const validateField = useCallback((field, value) => {
    const rules = {
      title: (v) => v.trim().length > 0,
      date: (v) => /^\d{4}-\d{2}-\d{2}$/.test(v),
      time: (v) => /^\d{2}:\d{2}$/.test(v),
      platform: (v) => ['teams', 'meet', 'zoho', 'gmeet'].includes(v),
    };

    const isValid = rules[field]?.(value) ?? true;
    setUiState(prev => ({
      ...prev,
      errors: { ...prev.errors, [field]: !isValid ? `Invalid ${field}` : null }
    }));
  }, []);

  // Submit handler
  const handlePublish = useCallback(async () => {
    // Validate
    if (!formData.title || !formData.date || !formData.time || !formData.platform) {
      setUiState(prev => ({
        ...prev,
        errors: {
          title: !formData.title ? 'Title required' : null,
          date: !formData.date ? 'Date required' : null,
          time: !formData.time ? 'Time required' : null,
          platform: !formData.platform ? 'Platform required' : null,
        }
      }));
      return;
    }

    setUiState(prev => ({ ...prev, isLoading: true, errors: {} }));

    try {
      let attendeesList = [];
      if (typeof formData.attendees === 'string') {
        attendeesList = formData.attendees.split(',').map(e => e.trim()).filter(e => e);
      }
        
      const response = await API.post('/meetings/publish', {
        title: formData.title,
        description: formData.description,
        date: formData.date,
        time: formData.time,
        platform: formData.platform === 'meet' ? 'gmeet' : formData.platform,
        attendees: attendeesList,
        duration_minutes: parseInt(formData.duration),
        timezone: uiState.timezone,
        organizer_email: 'noreply@antigravity.com' // Mock
      });

      const result = response.data;

      if (result.success) {
        setMeetingResult(result.meeting);
        setUiState(prev => ({
          ...prev,
          successMessage: `Meeting published successfully!`
        }));
      } else {
        setUiState(prev => ({
          ...prev,
          errors: { submit: result.error || 'Failed to publish meeting' }
        }));
      }
    } catch (error) {
      setUiState(prev => ({
        ...prev,
        errors: { submit: error.response?.data?.detail || error.response?.data?.error || 'Failed to publish meeting' }
      }));
    } finally {
      setUiState(prev => ({ ...prev, isLoading: false }));
    }
  }, [formData, uiState.timezone]);

  const resetForm = () => {
    setFormData({
      title: '',
      date: '',
      time: '',
      platform: null,
      description: '',
      duration: '60',
      attendees: '',
    });
    setUiState(prev => ({
      ...prev,
      errors: {},
      successMessage: '',
    }));
    setMeetingResult(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const triggerRipple = (element) => {
    if (!element) return;
    const ripple = document.createElement('div');
    ripple.className = 'button-ripple';
    ripple.style.left = '10px';
    ripple.style.top = '50%';
    element.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  };

  const isFormValid = formData.title && formData.date && formData.time && formData.platform;

  return (
    <div className={`schedule-meeting-sidebar ${isOpen ? 'open' : 'closed'}`}>
      {/* Header */}
      <div className="sidebar-header">
        <h3>Publish Meeting internally</h3>
        <button className="close-button" onClick={handleClose}>×</button>
      </div>

      {/* Content */}
      <div className="sidebar-content">
        
        {meetingResult ? (
          <div className="meeting-result-card" style={{ padding: '15px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', marginBottom: '20px' }}>
            <h3 style={{ color: '#166534', marginTop: 0, fontSize: '16px' }}>✓ Meeting Published!</h3>
            <p style={{ margin: '5px 0', fontSize: '13px' }}><strong>Platform:</strong> {meetingResult.platform.toUpperCase()}</p>
            <p style={{ margin: '5px 0', fontSize: '13px' }}><strong>Meeting Code:</strong> {meetingResult.meeting_code || 'N/A'}</p>
            <p style={{ margin: '5px 0', fontSize: '13px', color: meetingResult.invites_sent ? '#166534' : '#9ca3af' }}>
              <strong>Invites Sent:</strong> {meetingResult.invites_sent ? '✓ Yes' : '✗ No'}
            </p>
            
            {meetingResult.join_url && (
              <div className="join-section" style={{ marginTop: '15px' }}>
                <a 
                  href={meetingResult.join_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="primary-button"
                  style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '36px', textDecoration: 'none', marginBottom: '10px' }}
                >
                  Join Meeting
                </a>
                <p style={{ wordBreak: 'break-all', fontSize: '11px', color: '#6b7280', margin: 0 }}>{meetingResult.join_url}</p>
              </div>
            )}
            
            <button 
              onClick={() => setMeetingResult(null)} 
              style={{ marginTop: '15px', padding: '8px 16px', background: 'transparent', border: '1px solid #d1d5db', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', width: '100%' }}
            >
              Publish Another
            </button>
          </div>
        ) : (
          <>
            
            {/* Title */}
            <div className="form-group">
              <label className="form-label">Meeting Title <span className="badge">Required</span></label>
              <input
                type="text"
                value={formData.title}
                onChange={handleTitleChange}
                placeholder="Ex: Sync Status"
                className={`form-input ${uiState.errors.title ? 'error' : ''}`}
                style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
              />
              {uiState.errors.title && <p className="error-text">{uiState.errors.title}</p>}
            </div>

            {/* Platform Selection */}
            <div className="form-group">
              <label className="form-label">
                Publish via <span className="badge">1 required</span>
              </label>

              <div className="platform-grid">
                {[
                  { id: 'teams', name: 'Microsoft Teams', icon: 'MS' },
                  { id: 'meet', name: 'Google Meet', icon: 'GM' },
                  { id: 'zoho', name: 'Zoho Mail', icon: 'Z' },
                ].map(platform => (
                  <button
                    key={platform.id}
                    className={`platform-button ${formData.platform === platform.id ? 'selected' : ''}`}
                    onClick={(e) => selectPlatform(platform.id, e)}
                    onMouseDown={(e) => triggerRipple(e.currentTarget)}
                  >
                    <div className="platform-icon">{platform.icon}</div>
                    <span>{platform.name}</span>
                    <span className="tooltip">{platform.name} integration</span>
                    {formData.platform === platform.id && <span className="checkmark">&#10003;</span>}
                  </button>
                ))}
              </div>
              {uiState.errors.platform && <p className="error-text">{uiState.errors.platform}</p>}
            </div>

            {/* Date & Time */}
            <div className="form-group">
              <label className="form-label">
                Date & time <span className="badge">Required</span>
              </label>
              <div className="input-wrapper">
                <input
                  type="date"
                  value={formData.date}
                  onChange={handleDateChange}
                  className={uiState.errors.date ? 'error' : ''}
                />
                <input
                  type="time"
                  value={formData.time}
                  onChange={handleTimeChange}
                  className={uiState.errors.time ? 'error' : ''}
                />
              </div>
              <div className="timezone-info">
                {uiState.timezone} • {new Date().toLocaleDateString('en-US', { timeZoneName: 'long' })}
              </div>
              {uiState.errors.date && <p className="error-text">{uiState.errors.date}</p>}
              {uiState.errors.time && <p className="error-text">{uiState.errors.time}</p>}
            </div>

            {/* Attendees */}
            <div className="form-group">
              <label className="form-label">Attendees (comma-separated emails)</label>
              <textarea 
                value={formData.attendees}
                onChange={(e) => setFormData(prev => ({ ...prev, attendees: e.target.value }))}
                placeholder="email1@example.com, email2@example.com"
                className="form-textarea"
                rows="2"
              />
            </div>

            {/* Duration */}
            <div className="form-group">
              <label className="form-label">Duration</label>
              <select
                value={formData.duration}
                onChange={(e) => setFormData(prev => ({ ...prev, duration: e.target.value }))}
                className="form-select"
              >
                <option value="30">30 minutes</option>
                <option value="60">1 hour</option>
                <option value="90">1.5 hours</option>
                <option value="120">2 hours</option>
              </select>
            </div>

            {/* Description */}
            <div className="form-group">
              <label className="form-label">Description (optional)</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Add meeting details..."
                className="form-textarea"
                rows="3"
              />
            </div>

            {/* Error Messages */}
            {uiState.errors.submit && (
              <div className="error-banner" style={{ marginTop: '10px' }}>{uiState.errors.submit}</div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      {!meetingResult && (
        <div className="sidebar-footer">
          <button
            className={`primary-button ${uiState.isLoading ? 'loading' : ''} ${isFormValid ? '' : 'disabled'}`}
            onClick={handlePublish}
            disabled={!isFormValid || uiState.isLoading}
            style={{ width: '100%' }}
          >
            {uiState.isLoading ? 'Publishing...' : 'Publish & Send Invites'}
          </button>
        </div>
      )}
    </div>
  );
}
