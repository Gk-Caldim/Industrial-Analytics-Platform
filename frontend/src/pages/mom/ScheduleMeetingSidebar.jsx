// ScheduleMeetingSidebar.jsx
import React, { useState, useEffect, useCallback } from 'react';
import './ScheduleMeetingSidebar.css';

export function ScheduleMeetingSidebar({ isOpen, onClose, momData }) {
  // State
  const [formData, setFormData] = useState({
    date: '',
    time: '',
    platform: null,
    description: '',
    duration: '60',
    attendees: [],
    recurrence: 'once',
  });

  const [uiState, setUiState] = useState({
    isLoading: false,
    errors: {},
    successMessage: '',
    timezone: 'UTC+5:30',
  });

  // Get current timezone
  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const offset = new Date().getTimezoneOffset();
    setUiState(prev => ({ ...prev, timezone: `UTC${offset > 0 ? '-' : '+'}${Math.abs(offset / 60)}` }));
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

  const selectPlatform = useCallback((platform, event) => {
    setFormData(prev => ({ ...prev, platform }));
    validateField('platform', platform);
    triggerRipple(event.currentTarget); // Ripple effect
  }, []);

  const validateField = useCallback((field, value) => {
    const rules = {
      date: (v) => /^\d{4}-\d{2}-\d{2}$/.test(v),
      time: (v) => /^\d{2}:\d{2}$/.test(v),
      platform: (v) => ['teams', 'meet', 'zoho'].includes(v),
    };

    const isValid = rules[field]?.(value) ?? true;
    setUiState(prev => ({
      ...prev,
      errors: { ...prev.errors, [field]: !isValid ? `Invalid ${field}` : null }
    }));
  }, []);

  // Submit handler
  const handleSchedule = useCallback(async () => {
    // Validate
    if (!formData.date || !formData.time || !formData.platform) {
      setUiState(prev => ({
        ...prev,
        errors: {
          date: !formData.date ? 'Date required' : null,
          time: !formData.time ? 'Time required' : null,
          platform: !formData.platform ? 'Platform required' : null,
        }
      }));
      return;
    }

    setUiState(prev => ({ ...prev, isLoading: true }));

    try {
      const response = await fetch('/api/meetings/schedule', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionStorage.getItem('token')}`
        },
        body: JSON.stringify({
          ...formData,
          timezone: uiState.timezone,
        })
      });

      const result = await response.json();

      if (result.success) {
        if (result.oauthUrl) {
          window.location.href = result.oauthUrl;
        } else {
          setUiState(prev => ({
            ...prev,
            successMessage: `Meeting scheduled for ${formData.date} at ${formData.time}`
          }));
          setTimeout(() => {
            resetForm();
            onClose();
          }, 2000);
        }
      } else {
        setUiState(prev => ({
          ...prev,
          errors: { submit: result.error }
        }));
      }
    } catch (error) {
      setUiState(prev => ({
        ...prev,
        errors: { submit: 'Failed to schedule meeting' }
      }));
    } finally {
      setUiState(prev => ({ ...prev, isLoading: false }));
    }
  }, [formData, uiState.timezone, onClose]);

  const resetForm = () => {
    setFormData({
      date: '',
      time: '',
      platform: null,
      description: '',
      duration: '60',
      attendees: [],
      recurrence: 'once',
    });
    setUiState(prev => ({
      ...prev,
      errors: {},
      successMessage: '',
    }));
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

  const isFormValid = formData.date && formData.time && formData.platform;

  return (
    <div className={`schedule-meeting-sidebar ${isOpen ? 'open' : 'closed'}`}>
      {/* Header */}
      <div className="sidebar-header">
        <h3>Schedule meeting</h3>
        <button className="close-button" onClick={onClose}>×</button>
      </div>

      {/* Content */}
      <div className="sidebar-content">
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

        {/* Platform Selection */}
        <div className="form-group">
          <label className="form-label">
            Connect with <span className="badge">1 required</span>
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

        {/* Optional: Duration */}
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

        {/* Optional: Recurrence */}
        <div className="form-group">
          <label className="form-label">Recurrence</label>
          <select
            value={formData.recurrence}
            onChange={(e) => setFormData(prev => ({ ...prev, recurrence: e.target.value }))}
            className="form-select"
          >
            <option value="once">One-time</option>
            <option value="weekly">Weekly</option>
            <option value="biweekly">Bi-weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>

        {/* Optional: Description */}
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
          <div className="error-banner">{uiState.errors.submit}</div>
        )}
      </div>

      {/* Footer */}
      <div className="sidebar-footer">
        <button
          className={`primary-button ${uiState.isLoading ? 'loading' : ''} ${isFormValid ? '' : 'disabled'}`}
          onClick={handleSchedule}
          disabled={!isFormValid || uiState.isLoading}
        >
          {uiState.isLoading ? 'Scheduling...' : 'Schedule meeting'}
        </button>
        {uiState.successMessage && (
          <div className="success-message">{uiState.successMessage}</div>
        )}
        <div className="status-indicator">
          <span className={`status-dot ${isFormValid ? 'connected' : ''}`}></span>
          <span className="status-text">
            {uiState.successMessage || (isFormValid ? 'Ready to schedule' : 'Fill required fields')}
          </span>
        </div>
      </div>
    </div>
  );
}
