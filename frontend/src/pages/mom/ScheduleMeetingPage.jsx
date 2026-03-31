import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, MapPin, Users, Video, RefreshCw, Menu, ChevronLeft, ChevronRight, Check, X, Bell, Target, AlignLeft, CheckCircle2, ArrowRight } from 'lucide-react';
import './ScheduleMeetingPage.css';
import API from '../../utils/api'; // Assuming axios instance is set up

const ScheduleMeetingPage = () => {
  const navigate = useNavigate();
  // --- Calendar State ---
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  
  // --- Form State ---
  const [platform, setPlatform] = useState('');
  const [duration, setDuration] = useState('60');
  const [meetingType, setMeetingType] = useState('quickSync');
  const [reminder, setReminder] = useState(30);
  const [description, setDescription] = useState('');
  
  // --- Attendees System ---
  const [attendees, setAttendees] = useState([]);
  const [attendeeInput, setAttendeeInput] = useState('');
  
  // --- Agenda System ---
  const [agenda, setAgenda] = useState([]);
  const [agendaInput, setAgendaInput] = useState('');
  
  // --- Availability System ---
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [availableTimeslots, setAvailableTimeslots] = useState([]);
  
  // --- Transaction State ---
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Constants
  const platforms = [
    { id: 'teams', name: 'Microsoft Teams', icon: 'M', color: '#5558AF' },
    { id: 'meet', name: 'Google Meet', icon: 'G', color: '#00832D' },
    { id: 'zoho', name: 'Zoho Mail', icon: 'Z', color: '#005CE3' }
  ];

  // --- Auth Intercept Effects ---
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('auth') === 'success') {
      // Could show a toast here, using error state as a generic message state for now
      window.history.replaceState({}, document.title, "/dashboard/schedule-meeting");
    } else if (params.get('error')) {
      setError("Authentication integration failed. Please try reconnecting your account.");
      window.history.replaceState({}, document.title, "/dashboard/schedule-meeting");
    }
  }, []);

  const meetingTypes = [
    { id: 'quickSync', label: 'Quick Sync', icon: <Clock className="w-4 h-4" /> },
    { id: 'client', label: 'Client Meeting', icon: <Target className="w-4 h-4" /> },
    { id: 'interview', label: 'Interview', icon: <Users className="w-4 h-4" /> },
    { id: 'deepWork', label: 'Deep Work', icon: <AlignLeft className="w-4 h-4" /> },
    { id: 'webinar', label: 'Webinar', icon: <Video className="w-4 h-4" /> },
  ];

  // --- Helpers ---
  const isEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  // --- Handlers: Attendees ---
  const handleAddAttendee = (e) => {
    if (e.key === 'Enter' || e.type === 'blur' || e.key === ',') {
      e.preventDefault();
      const val = attendeeInput.trim().replace(/,/g, '');
      if (val && isEmail(val) && !attendees.includes(val)) {
        setAttendees([...attendees, val]);
        setAttendeeInput('');
        setSelectedTime(null); // Reset time when attendees change (availability shifts)
      }
    }
  };

  const removeAttendee = (emailToRemove) => {
    setAttendees(attendees.filter(a => a !== emailToRemove));
    setSelectedTime(null);
  };

  // --- Handlers: Agenda ---
  const handleAddAgendaItem = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = agendaInput.trim();
      if (val && !agenda.includes(val)) {
        setAgenda([...agenda, val]);
        setAgendaInput('');
      }
    }
  };
  
  const removeAgendaItem = (indexToRemove) => {
    setAgenda(agenda.filter((_, idx) => idx !== indexToRemove));
  };

  // --- Fetch Availability ---
  useEffect(() => {
    if (!selectedDate) {
      setAvailableTimeslots([]);
      return;
    }

    const fetchAvailability = async () => {
      setLoadingAvailability(true);
      try {
        const dateStr = selectedDate.toISOString().split('T')[0];
        const attendeesQuery = attendees.join(',');
        const endpoint = `/meetings/availability?date=${dateStr}&attendees=${encodeURIComponent(attendeesQuery)}`;
        
        // Use your API utility
        const response = await API.get(endpoint);
        
        if (response.data && response.data.availableSlots) {
            setAvailableTimeslots(response.data.availableSlots);
        } else {
            setAvailableTimeslots([]);
        }
      } catch (err) {
        console.error('Failed to fetch availability', err);
        // Fallback or error state
        setAvailableTimeslots([]);
      } finally {
        setLoadingAvailability(false);
      }
    };

    fetchAvailability();
  }, [selectedDate, attendees]);

  // --- Handlers: Calendar Nav ---
  const handlePrevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(currentYear - 1); } 
    else { setCurrentMonth(currentMonth - 1); }
  };
  const handleNextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(currentYear + 1); } 
    else { setCurrentMonth(currentMonth + 1); }
  };
  const handleToday = () => {
    const today = new Date();
    setCurrentMonth(today.getMonth()); setCurrentYear(today.getFullYear());
    setSelectedDate(new Date(today.getFullYear(), today.getMonth(), today.getDate()));
  };

  const isToday = (date) => {
    const today = new Date();
    return date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
  };

  const isSelected = (date) => {
    return selectedDate && date.getDate() === selectedDate.getDate() && date.getMonth() === selectedDate.getMonth() && date.getFullYear() === selectedDate.getFullYear();
  };

  const isPast = (date) => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return date < today;
  };

  const renderCalendarGrid = () => {
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const startDay = new Date(currentYear, currentMonth, 1).getDay();
    const prevMonthDays = new Date(currentYear, currentMonth, 0).getDate();
    
    const days = [];
    
    // Fill previous month
    for (let i = startDay - 1; i >= 0; i--) {
      days.push(
        <button key={`prev-${i}`} className="calendar-day other-month" disabled>
          {prevMonthDays - i}
        </button>
      );
    }
    
    // Fill current month
    for (let i = 1; i <= daysInMonth; i++) {
        const date = new Date(currentYear, currentMonth, i);
        const isPastDate = isPast(date);
        
        days.push(
            <button 
                key={`current-${i}`} 
                className={`calendar-day ${isToday(date) ? 'today' : ''} ${isSelected(date) ? 'selected' : ''}`}
                onClick={() => { setSelectedDate(date); setSelectedTime(null); }}
                disabled={isPastDate}
            >
                {i}
                {/* Visual indicator for highly available vs low available could go here */}
            </button>
        );
    }
    
    // Fill next month
    const totalCells = days.length;
    const remainingCells = 42 - totalCells;
    for (let i = 1; i <= remainingCells; i++) {
      days.push(<button key={`next-${i}`} className="calendar-day other-month" disabled>{i}</button>);
    }
    return days;
  };

  // --- Handlers: Submission ---
  const validateForm = () => {
    return selectedDate && selectedTime && platform && attendees.length > 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true); setError('');

    const payload = {
      date: selectedDate.toISOString().split('T')[0],
      time: selectedTime,
      platform,
      duration,
      attendees,
      meetingType,
      agenda,
      reminder,
      description
    };

    try {
      const resp = await API.post('/meetings/schedule', payload);
      if (resp.data.success) {
         navigate(`/dashboard/meeting/${resp.data.meeting.id}`);
      } else if (resp.data.oauthUrl) {
         // Handoff to Provider Login Portal
         window.location.href = resp.data.oauthUrl;
      } else {
         setError(resp.data.error || 'Failed to schedule meeting.');
      }
    } catch (err) {
      setError('An error occurred. Make sure backend is running properly.');
    } finally {
      if (!error) setLoading(false);
    }
  };

  const handleReset = () => {
     setSelectedDate(null);
     setSelectedTime(null);
     setAgenda([]);
     setAttendees([]);
     setDescription('');
  };

  // --- Render ---

  return (
    <div className="schedule-meeting-page h-full overflow-y-auto w-full">
      {/* ───── LEFT COLUMN ───── */}
      <div className="calendar-column">
        <div className="page-header mb-8">
          <div>
            <h1 className="text-gray-900 font-bold tracking-tight">Schedule Workspace</h1>
            <p className="text-sm text-gray-500 mt-1 font-medium">Coordinate, book, and auto-sync with MOM.</p>
          </div>
        </div>

        {/* Dynamic Type Selector */}
        <div className="meeting-type-selector mb-6">
            {meetingTypes.map(type => (
                <button
                    key={type.id}
                    className={`mt-chip ${meetingType === type.id ? 'active' : ''}`}
                    onClick={() => setMeetingType(type.id)}
                >
                    {type.icon}
                    <span>{type.label}</span>
                </button>
            ))}
        </div>

        {/* Calendar Card */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm mb-6 transition-all">
          <div className="calendar-header mb-6">
            <h2 className="text-xl font-bold text-gray-800 tracking-tight">
              {new Date(currentYear, currentMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h2>
            <div className="flex space-x-2">
              <button className="nav-btn bg-gray-50 hover:bg-gray-100 border border-gray-200" onClick={handleToday}>
                Today
              </button>
              <div className="flex border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <button className="nav-btn-icon bg-gray-50 hover:bg-gray-100" onClick={handlePrevMonth}>
                  <ChevronLeft className="h-5 w-5 text-gray-600" />
                </button>
                <div className="w-px bg-gray-200"></div>
                <button className="nav-btn-icon bg-gray-50 hover:bg-gray-100" onClick={handleNextMonth}>
                  <ChevronRight className="h-5 w-5 text-gray-600" />
                </button>
              </div>
            </div>
          </div>

          <div className="calendar-grid">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="weekday-header text-gray-500">{day}</div>
            ))}
            {renderCalendarGrid()}
          </div>
        </div>

        {/* Timeslots Panel */}
        <div className={`transition-all duration-300 ${selectedDate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none hidden'}`}>
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                <div className="flex justify-between items-center mb-5">
                    <h3 className="font-bold text-gray-900 tracking-tight">
                        Available Times <span className="text-gray-400 font-normal ml-2">for {selectedDate?.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                    </h3>
                    {loadingAvailability && <RefreshCw className="w-4 h-4 text-gray-400 animate-spin" />}
                </div>
                
                {availableTimeslots.length === 0 && !loadingAvailability ? (
                    <div className="text-center py-6 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                        <p className="text-gray-500 text-sm font-medium">No slots available on this date for the selected attendees.</p>
                        <p className="text-gray-400 text-xs mt-1 block">Try selecting another date or removing external attendees.</p>
                    </div>
                ) : (
                    <div className="timeslot-grid">
                        {availableTimeslots.map(time => (
                            <button
                                key={time}
                                className={`timeslot-btn ${selectedTime === time ? 'selected' : ''} ${loadingAvailability ? 'opacity-50 cursor-not-allowed' : ''}`}
                                onClick={() => !loadingAvailability && setSelectedTime(time)}
                                disabled={loadingAvailability}
                            >
                                {time}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
      </div>

      {/* ───── RIGHT COLUMN (FORM) ───── */}
      <div className="form-column">
        <div className="sticky-panel bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          
          {/* Live Summary Box */}
          <div className="summary-box mb-8 bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 p-5 rounded-xl text-sm">
              <h4 className="font-bold text-indigo-900 mb-3 uppercase tracking-wider text-xs">Meeting Breakdown</h4>
              <div className="space-y-2 text-indigo-950 font-medium">
                  <div className="flex justify-between items-center">
                    <span className="text-indigo-700 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Date & Time</span>
                    <span>{selectedDate ? selectedDate.toLocaleDateString() : '--'} {selectedTime ? `@ ${selectedTime}` : ''}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-indigo-700 flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Attendees</span>
                    <span>{attendees.length} people</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-indigo-700 flex items-center gap-1.5"><Video className="w-3.5 h-3.5" /> Platform</span>
                    <span>{platform ? platforms.find(p => p.id === platform).name : '--'}</span>
                  </div>
              </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Attendees Field */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">
                  Attendees <span className="text-red-500">*</span>
              </label>
              <div className="attendees-container border border-gray-300 rounded-xl p-2 bg-white flex flex-wrap gap-2 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
                  {attendees.map((a, i) => (
                      <div key={i} className="attendee-chip bg-gray-100 text-gray-800 text-xs font-semibold px-2.5 py-1.5 rounded-md flex items-center gap-1 shadow-sm">
                          {a}
                          <button type="button" onClick={() => removeAttendee(a)} className="hover:text-red-500 focus:outline-none"><X className="w-3 h-3" /></button>
                      </div>
                  ))}
                  <input
                      type="email"
                      className="flex-1 min-w-[120px] outline-none text-sm bg-transparent px-2 py-1 placeholder-gray-400"
                      placeholder={attendees.length === 0 ? "Add email and press Enter..." : "Add another..."}
                      value={attendeeInput}
                      onChange={(e) => setAttendeeInput(e.target.value)}
                      onKeyDown={handleAddAttendee}
                      onBlur={handleAddAttendee}
                  />
              </div>
            </div>

            {/* Agenda Builder */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">Agenda Points</label>
              <div className="agenda-builder space-y-2">
                  {agenda.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2 group p-2 rounded-lg hover:bg-gray-50 border border-transparent hover:border-gray-200 transition-colors">
                          <span className="text-indigo-500 font-bold text-xs bg-indigo-50 w-5 h-5 flex items-center justify-center rounded-full">{idx + 1}</span>
                          <span className="text-sm font-medium text-gray-700 flex-1">{item}</span>
                          <button type="button" onClick={() => removeAgendaItem(idx)} className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-4 h-4" /></button>
                      </div>
                  ))}
                  <input
                      type="text"
                      className="w-full text-sm border-b border-gray-300 px-2 py-2 focus:border-indigo-500 focus:outline-none transition-colors bg-transparent placeholder-gray-400"
                      placeholder="Type a point & press Enter..."
                      value={agendaInput}
                      onChange={(e) => setAgendaInput(e.target.value)}
                      onKeyDown={handleAddAgendaItem}
                  />
              </div>
            </div>

            {/* Platform Selector */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">Platform <span className="text-red-500">*</span></label>
              <div className="grid grid-cols-3 gap-3">
                {platforms.map(p => (
                  <button
                    key={p.id} type="button"
                    className={`platform-btn flex flex-col items-center justify-center gap-2 p-3 rounded-xl border ${platform === p.id ? 'border-indigo-600 bg-indigo-50/50 shadow-sm ring-1 ring-indigo-600' : 'border-gray-200 bg-white hover:border-gray-300'}`}
                    onClick={() => setPlatform(p.id)}
                  >
                    <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white shadow-sm" style={{ backgroundColor: p.color }}>
                        {p.icon}
                    </div>
                    <span className="text-xs font-semibold text-gray-700">{p.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Duration & Reminder Grid */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="block text-sm font-semibold text-gray-800 mb-2">Duration</label>
                   <select className="ui-select" value={duration} onChange={e => setDuration(e.target.value)}>
                       <option value="15">15 mins</option>
                       <option value="30">30 mins</option>
                       <option value="45">45 mins</option>
                       <option value="60">1 hour</option>
                       <option value="90">1.5 hours</option>
                   </select>
                </div>
                <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-2 flex items-center gap-1">
                        <Bell className="w-3.5 h-3.5 text-gray-400" /> Reminder
                    </label>
                    <select className="ui-select" value={reminder} onChange={e => setReminder(Number(e.target.value))}>
                        <option value={5}>5 min before</option>
                        <option value={10}>10 min before</option>
                        <option value={30}>30 min before</option>
                        <option value={60}>1 hour before</option>
                    </select>
                </div>
            </div>
            
            {/* Description fallback */}
            <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">Additional Description</label>
                <textarea 
                    className="ui-textarea" 
                    placeholder="Provide extra context to attendees..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                />
            </div>

            {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm font-medium">{error}</div>}

            <button 
              type="submit" 
              className={`w-full py-4 rounded-xl flex items-center justify-center gap-2 font-bold text-white transition-all shadow-md ${!validateForm() || loading ? 'bg-gray-300 cursor-not-allowed shadow-none' : 'bg-gray-900 hover:bg-black hover:shadow-lg active:scale-[0.98]'}`}
              disabled={!validateForm() || loading}
            >
              {loading ? (
                <><RefreshCw className="w-5 h-5 animate-spin" /> Finalizing...</>
              ) : (
                'Publish & Send Invites'
              )}
            </button>
            {!validateForm() && (
                <p className="text-center text-xs text-gray-400 mt-2">Please complete required fields (*)</p>
            )}

          </form>
        </div>
      </div>
    </div>
  );
};

export default ScheduleMeetingPage;
