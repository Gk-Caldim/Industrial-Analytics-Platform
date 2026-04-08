import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Calendar, Clock, Users, Video, Copy, Check, X,
    MoreHorizontal, ArrowUpRight, Trash2, Mic, VideoOff,
    FileText, Download, Share2, AlertCircle, Plus, ChevronRight
} from 'lucide-react';
import './MeetingDetailsPage.css';
import API from '../../utils/api';

const MeetingDetailsPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    // --- State ---
    const [meeting, setMeeting] = useState(null);
    const [loading, setStatusLoading] = useState(true);
    const [agenda, setAgenda] = useState([]);
    const [attendees, setAttendees] = useState([]);
    const [readiness, setReadiness] = useState({ score: 1, total: 3 });
    const [countdown, setCountdown] = useState('00m 00s');
    const [toast, setToast] = useState({ show: false, message: '' });
    const [copiedField, setCopiedField] = useState(null);
    const [showAttendeeModal, setShowAttendeeModal] = useState(false);
    const [newAttendeeEmail, setNewAttendeeEmail] = useState('');
    const [agendaInput, setAgendaInput] = useState({ show: false, text: '' });
    const [dangerTap, setDangerTap] = useState({ count: 0, timer: null });

    // --- Refs ---
    const toastTimeout = useRef(null);
    const dangerTimeout = useRef(null);

    // --- Utils ---
    const showToast = (message) => {
        if (toastTimeout.current) clearTimeout(toastTimeout.current);
        setToast({ show: true, message });
        toastTimeout.current = setTimeout(() => setToast({ show: false, message: '' }), 2200);
    };

    const updateReadiness = (currentAgenda = agenda, currentAttendees = attendees) => {
        let score = 1; // Meet link always green
        if (currentAgenda.length > 0) score += 1;
        if (currentAttendees.length > 0) score += 1;
        setReadiness({ score, total: 3 });
    };

    const fetchMeeting = async () => {
        try {
            setStatusLoading(true);
            const resp = await API.get(`/meetings/${id}`);
            if (resp.data.success) {
                const m = resp.data.meeting;
                setMeeting(m);
                // Parse agenda from agenda_text if it's a list or newline separated
                const parsedAgenda = m.agenda_text ? m.agenda_text.split('\n').filter(t => t.trim() !== '') : [];
                setAgenda(parsedAgenda);
                setAttendees(m.attendees || []);
                updateReadiness(parsedAgenda, m.attendees || []);
            }
        } catch (err) {
            showToast('Failed to load meeting');
        } finally {
            setStatusLoading(false);
        }
    };

    useEffect(() => {
        fetchMeeting();
    }, [id]);

    // --- Countdown Logic ---
    useEffect(() => {
        if (!meeting) return;
        const timer = setInterval(() => {
            const now = new Date();
            const [time, modifier] = (meeting.time || '12:00 AM').split(' ');
            let [hours, minutes] = time.split(':');
            if (hours === '12') hours = '00';
            if (modifier === 'PM') hours = parseInt(hours, 10) + 12;
            const startTime = new Date(`${meeting.date}T${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`);

            const diffMs = startTime - now;
            if (diffMs > 0) {
                const h = Math.floor(diffMs / 3600000);
                const m = Math.floor((diffMs % 3600000) / 60000);
                const s = Math.floor((diffMs % 60000) / 1000);
                setCountdown(`${h > 0 ? h + 'h ' : ''}${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`);
            } else {
                setCountdown('Live now');
            }
        }, 1000);
        return () => clearInterval(timer);
    }, [meeting]);

    // --- Handlers ---
    const handleCopy = (text, field) => {
        navigator.clipboard.writeText(text);
        setCopiedField(field);
        showToast('Link copied to clipboard');
        setTimeout(() => setCopiedField(null), field === 'hero-link' ? 300 : 1900);
    };

    // --- Modal Escape Listener ---
    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                setShowAttendeeModal(false);
                setAgendaInput({ show: false, text: '' });
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, []);

    const addAgendaPoint = async () => {
        if (!agendaInput.text.trim()) {
            setAgendaInput({ show: false, text: '' });
            return;
        }
        const newAgenda = [...agenda, agendaInput.text.trim()];
        setAgenda(newAgenda);
        setAgendaInput({ show: false, text: '' });
        updateReadiness(newAgenda, attendees);
        showToast('Agenda point added');
        // Persist to backend
        try { await API.patch(`/meetings/${id}`, { agenda_text: newAgenda.join('\n') }); } catch (e) { }
    };

    const deleteAgendaPoint = async (index) => {
        const newAgenda = agenda.filter((_, i) => i !== index);
        setAgenda(newAgenda);
        updateReadiness(newAgenda, attendees);
        // Persist to backend
        try { await API.patch(`/meetings/${id}`, { agenda_text: newAgenda.join('\n') }); } catch (e) { }
    };

    const addAttendee = async () => {
        if (!newAttendeeEmail.trim()) return;
        const newAttendees = [...attendees, { name: newAttendeeEmail.split('@')[0], email: newAttendeeEmail, rsvpStatus: 'PENDING' }];
        setAttendees(newAttendees);
        setNewAttendeeEmail('');
        setShowAttendeeModal(false);
        updateReadiness(agenda, newAttendees);
        showToast('Invitation sent');
        // Persist to backend (mocking deep update for now)
        try { await API.patch(`/meetings/${id}`, { attendees: newAttendees }); } catch (e) { }
    };

    const handleDangerTap = () => {
        if (dangerTap.count === 0) {
            setDangerTap({ count: 1, timer: 3 });
            if (dangerTimeout.current) clearInterval(dangerTimeout.current);
            dangerTimeout.current = setInterval(() => {
                setDangerTap(prev => {
                    if (prev.timer <= 1) {
                        clearInterval(dangerTimeout.current);
                        return { count: 0, timer: 0 };
                    }
                    return { ...prev, timer: prev.timer - 1 };
                });
            }, 1000);
        } else {
            clearInterval(dangerTimeout.current);
            setDangerTap({ count: 0, timer: 0 });
            handleDeleteMeeting();
        }
    };

    const handleDeleteMeeting = async () => {
        showToast('Meeting cancelled');
        try {
            await API.post(`/meetings/${id}/cancel`, { reason: 'User requested cancellation' });
            setTimeout(() => navigate('/dashboard/meetings'), 1000);
        } catch (e) {
            showToast('Failed to cancel meeting');
        }
    };

    if (loading) return <div className="meeting-details-wrapper flex items-center justify-center"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div></div>;
    if (!meeting) return <div className="meeting-details-wrapper p-10 font-bold text-red-500">Meeting not found</div>;

    const platformIcon = meeting.platform === 'meet' ? (
        <svg viewBox="0 0 24 24" className="w-3 h-3"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z" fill="#EA4335" /></svg>
    ) : (
        <Video className="w-3 h-3 text-indigo-500" />
    );

    const progressRingOffset = 56.5 - (56.5 * (readiness.score / readiness.total));
    const ringColor = readiness.score === 1 ? '#92400e' : readiness.score === 2 ? '#fcd34d' : '#16a34a';

    return (
        <div className="meeting-details-wrapper">
            <div className="dashboard-container">

                {/* Hero Card */}
                <div className="hero-section stagger-item" style={{ animationDelay: '0ms' }}>
                    <div className="status-row">
                        <div className="radar-dot"></div>
                        <span className="section-label">Scheduled</span>
                        <div className="separator"></div>
                        <span className="section-label">{meeting.date}</span>
                        <div className="separator"></div>
                        <div className="platform-badge">
                            {platformIcon}
                            <span>{meeting.platform === 'meet' ? 'Google Meet' : 'MS Teams'}</span>
                        </div>
                    </div>

                    <h1 className="hero-title">{meeting.title}</h1>

                    <div className="hero-actions">
                        <button
                            className="btn-join"
                            onClick={() => window.open(meeting.join_url, '_blank')}
                        >
                            <ArrowUpRight className="w-4 h-4" />
                            Join meeting
                        </button>
                        <span className="timer-text font-mono">Starts in / {countdown}</span>
                        <button
                            className="btn-copy-link"
                            onClick={() => handleCopy(meeting.join_url, 'hero-link')}
                        >
                            {copiedField === 'hero-link' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                            {copiedField === 'hero-link' ? <span className="text-green-600">Copied</span> : <span>Copy link</span>}
                        </button>
                    </div>
                </div>

                <div className="dashboard-grid">
                    {/* Left Column */}
                    <div className="flex flex-col gap-6">

                        {/* Agenda Card */}
                        <div className="card-glass stagger-item" style={{ animationDelay: '30ms' }}>
                            <div className="card-label-header">
                                <span className="card-title-sm">Agenda</span>
                                <button
                                    className="text-blue-600 flex items-center gap-1 text-[10.5px] font-bold uppercase tracking-wider"
                                    onClick={() => setAgendaInput({ show: true, text: '' })}
                                >
                                    <Plus className="w-3 h-3" /> Add point
                                </button>
                            </div>
                            <div className="card-content">
                                {agendaInput.show && (
                                    <div className="flex gap-2 mb-4 animate-slideDown">
                                        <input
                                            autoFocus
                                            type="text"
                                            placeholder="What needs to be discussed?"
                                            className="flex-1 bg-gray-50 border-none px-3 py-2 rounded text-sm focus:ring-1 focus:ring-blue-200 outline-none"
                                            value={agendaInput.text}
                                            onChange={e => setAgendaInput({ ...agendaInput, text: e.target.value })}
                                            onKeyDown={e => {
                                                if (e.key === 'Enter') addAgendaPoint();
                                                if (e.key === 'Escape') setAgendaInput({ show: false, text: '' });
                                            }}
                                        />
                                        <button onClick={addAgendaPoint} className="bg-blue-600 text-white px-3 py-2 rounded text-xs font-bold">Add</button>
                                    </div>
                                )}
                                {agenda.length === 0 ? (
                                    <div className="agenda-placeholder" onClick={() => setAgendaInput({ show: true, text: '' })}>
                                        <p className="text-sm font-medium">No agenda items yet</p>
                                        <p className="text-xs opacity-60 mt-1">Structure your meeting for better results</p>
                                    </div>
                                ) : (
                                    <div className="space-y-1">
                                        {agenda.map((item, i) => (
                                            <div key={i} className="agenda-item group">
                                                <div className="agenda-dot"></div>
                                                <span className="agenda-text">{item}</span>
                                                <button onClick={() => deleteAgendaPoint(i)} className="btn-delete-item opacity-0 group-hover:opacity-100">
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Attendees Card */}
                        <div className="card-glass stagger-item" style={{ animationDelay: '60ms' }}>
                            <div className="card-label-header">
                                <span className="card-title-sm">Attendees</span>
                                <span className="text-[10px] font-bold text-gray-400">{attendees.length} members</span>
                            </div>
                            <div className="card-content">
                                <div className="space-y-1">
                                    {attendees.map((att, i) => {
                                        const email = typeof att === 'string' ? att : att.email;
                                        const name = typeof att === 'string' ? email.split('@')[0] : (att.name || email.split('@')[0]);
                                        const isHost = i === 0;
                                        const initials = name.substring(0, 2);
                                        return (
                                            <div key={i} className="attendee-row animate-slideDown" style={{ animationDelay: `${i * 30}ms` }}>
                                                <div className="avatar-circle">{initials}</div>
                                                <div className="attendee-info">
                                                    <span className="attendee-name">{name}</span>
                                                    <span className="attendee-email">{email}</span>
                                                </div>
                                                <span className={`status-tag ${isHost ? 'tag-blue' : 'tag-amber'}`}>
                                                    {isHost ? 'Host' : 'Pending'}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                                <button
                                    className="w-full mt-4 py-2 border-t border-gray-50 text-[11px] font-bold text-gray-400 hover:text-blue-600 transition-colors flex items-center justify-center gap-1 uppercase tracking-wider"
                                    onClick={() => setShowAttendeeModal(true)}
                                >
                                    <Plus className="w-3 h-3" /> Add attendee
                                </button>
                            </div>
                        </div>

                        {/* Post-meeting Card */}
                        <div className="card-glass stagger-item" style={{ animationDelay: '90ms' }}>
                            <div className="card-label-header">
                                <span className="card-title-sm">After this meeting</span>
                            </div>
                            <div className="card-content flex flex-col gap-3">
                                <div className="flex gap-2">
                                    <button
                                        disabled
                                        className="btn-minimal secondary disabled-post relative"
                                        data-tooltip="Upload a transcript first"
                                    >
                                        <FileText className="w-3.5 h-3.5" />
                                        Generate notes
                                    </button>
                                    <button className="btn-minimal secondary">
                                        <Plus className="w-3.5 h-3.5" />
                                        Upload transcript
                                    </button>
                                </div>
                                <button className="btn-minimal secondary w-fit">
                                    <Share2 className="w-3.5 h-3.5" />
                                    Export actions
                                </button>
                                <p className="text-[11px] text-gray-400 font-medium">Available once the meeting ends.</p>
                            </div>
                        </div>

                    </div>

                    {/* Right Column */}
                    <div className="flex flex-col gap-6">

                        {/* Readiness Card */}
                        <div className="card-glass stagger-item" style={{ animationDelay: '120ms' }}>
                            <div className="card-label-header readiness-header">
                                <span className="card-title-sm">Meeting Health</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-[11px] font-bold" style={{ color: ringColor }}>{readiness.score}/{readiness.total}</span>
                                    <svg width="20" height="20" className="progress-ring">
                                        <circle cx="10" cy="10" r="9" fill="transparent" stroke="#f4f3ef" strokeWidth="2" />
                                        <circle
                                            cx="10" cy="10" r="9"
                                            fill="transparent"
                                            stroke={ringColor}
                                            strokeWidth="2"
                                            strokeDasharray="56.5"
                                            strokeDashoffset={progressRingOffset}
                                            className="progress-ring-circle"
                                            strokeLinecap="round"
                                        />
                                    </svg>
                                </div>
                            </div>
                            <div className="card-content">
                                <div className="progress-bar-container">
                                    <div
                                        className="progress-bar-fill"
                                        style={{ width: `${(readiness.score / readiness.total) * 100}%`, backgroundColor: ringColor }}
                                    ></div>
                                </div>

                                <div className="readiness-check-row">
                                    <Check className="check-icon text-green-500" />
                                    <span>Meet link configured</span>
                                </div>

                                <div className="readiness-check-row" onClick={() => setAgendaInput({ show: true, text: '' })}>
                                    {agenda.length > 0 ? (
                                        <Check className="check-icon text-green-500" />
                                    ) : (
                                        <AlertCircle className="check-icon text-amber-500" />
                                    )}
                                    <span className={agenda.length > 0 ? '' : 'text-amber-700'}>
                                        {agenda.length > 0 ? 'Agenda items added' : 'Agenda missing'}
                                    </span>
                                </div>

                                <div className="readiness-check-row">
                                    {attendees.length > 0 ? (
                                        <AlertCircle className="check-icon text-amber-500" />
                                    ) : (
                                        <X className="check-icon text-red-400" />
                                    )}
                                    <span className={attendees.length > 0 ? 'text-amber-700' : 'text-red-400'}>
                                        {attendees.length > 0 ? 'Invite pending' : 'No invite accepted'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Connection Card */}
                        <div className="card-glass stagger-item" style={{ animationDelay: '150ms' }}>
                            <div className="card-label-header">
                                <span className="card-title-sm">Connection</span>
                            </div>
                            <div className="card-content">
                                <div className="kv-row">
                                    <span className="kv-label">Payload</span>
                                    <div className="kv-value">
                                        <span className="value-text">{meeting.join_url}</span>
                                        <button
                                            className={`btn-copy-pill ${copiedField === 'payload' ? 'copied' : ''}`}
                                            onClick={() => handleCopy(meeting.join_url, 'payload')}
                                        >
                                            {copiedField === 'payload' ? <span>✓ Copied</span> : 'COPY'}
                                        </button>
                                    </div>
                                </div>
                                <div className="kv-row">
                                    <span className="kv-label">Access Key</span>
                                    <div className="kv-value">
                                        <span className="value-text font-mono">
                                            {meeting.meeting_code ? `${meeting.meeting_code.substring(0, 4)}···${meeting.meeting_code.slice(-3)}` : 'lm8l···qvg'}
                                        </span>
                                        <button
                                            className={`btn-copy-pill ${copiedField === 'access' ? 'copied' : ''}`}
                                            onClick={() => handleCopy(meeting.meeting_code || 'lm8l-abc-qvg', 'access')}
                                        >
                                            {copiedField === 'access' ? <span>✓ Copied</span> : 'COPY'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Danger zone */}
                        <div className="stagger-item" style={{ animationDelay: '180ms' }}>
                            <button
                                className="btn-danger"
                                onClick={handleDangerTap}
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                                {dangerTap.count === 0 ? 'Cancel meeting' : 'Tap again to confirm'}
                                {dangerTap.count === 1 && (
                                    <span className="countdown-span">{dangerTap.timer}</span>
                                )}
                            </button>
                        </div>

                    </div>
                </div>
            </div>

            {/* Toast System */}
            <div className={`toast-pill ${toast.show ? 'show' : ''}`}>
                {toast.message}
            </div>

            {/* Attendees Modal */}
            {showAttendeeModal && (
                <div className="modal-overlay" onClick={() => setShowAttendeeModal(false)}>
                    <div className="modal-card" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <span className="text-sm font-bold uppercase tracking-wider text-gray-400">Add Attendee</span>
                            <button onClick={() => setShowAttendeeModal(false)}><X className="w-5 h-5 text-gray-300" /></button>
                        </div>
                        <div className="modal-body">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">Email Address</p>
                            <input
                                autoFocus
                                type="email"
                                className="input-minimal"
                                placeholder="colleague@company.com"
                                value={newAttendeeEmail}
                                onChange={e => setNewAttendeeEmail(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && addAttendee()}
                            />
                        </div>
                        <div className="modal-footer">
                            <button className="btn-minimal secondary" onClick={() => setShowAttendeeModal(false)}>Cancel</button>
                            <button className="btn-minimal primary" onClick={addAttendee}>Send invite</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MeetingDetailsPage;
