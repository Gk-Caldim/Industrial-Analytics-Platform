import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Calendar, Clock, Users, Video, Edit, X, Copy,
    CheckCircle2, AlertCircle, FileText, Play, Mail,
    RefreshCw, ArrowLeft, CalendarPlus, Trash2, Info, FilePlus
} from 'lucide-react';
import './MeetingDetailsPage.css';
import API from '../../utils/api';

const MeetingDetailsPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    // --- Core State ---
    const [meeting, setMeeting] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // --- Edit Mode State ---
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState(null);
    const [saving, setSaving] = useState(false);

    // --- UI State ---
    const [meetingStatus, setMeetingStatus] = useState('scheduled'); // scheduled, live, completed, cancelled
    const [joinState, setJoinState] = useState(0); // 0: Too Early, 1: Lobby, 2: Ended
    const [countdownText, setCountdownText] = useState('');
    const [copiedField, setCopiedField] = useState(null);
    const [toastMessage, setToastMessage] = useState('');

    // --- Cancel Modal State ---
    const [cancelStage, setCancelStage] = useState(0); // 0=closed, 1=Intent, 2=Notify, 3=Confirm
    const [cancelReason, setCancelReason] = useState('');
    const [cancelOtherReason, setCancelOtherReason] = useState('');
    const [cancelNotify, setCancelNotify] = useState(true);
    const [cancelNote, setCancelNote] = useState('');
    const [cancelMatch, setCancelMatch] = useState('');
    const [showUndoSnackbar, setShowUndoSnackbar] = useState(false);
    const undoTimeoutRef = useRef(null);

    // --- Pre Join Gate State ---
    const [preJoinOpen, setPreJoinOpen] = useState(false);
    const [preJoinChecks, setPreJoinChecks] = useState({ camera: false, mic: false, agenda: false });
    const [dontShowPreJoin, setDontShowPreJoin] = useState(false);

    // --- Agenda State ---
    const [agendaText, setAgendaText] = useState('');
    const [agendaMode, setAgendaMode] = useState('view'); // view, edit

    const platforms = {
        teams: { name: 'Microsoft Teams', icon: '🟦', color: '#5558AF', shortColor: '#5558AF' },
        meet:  { name: 'Google Meet',     icon: '🟢', color: '#00832D', shortColor: '#00832D' },
        zoho:  { name: 'Zoho Meeting',    icon: '🔵', color: '#005CE3', shortColor: '#005CE3' },
    };

    const showToast = (msg) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(''), 3000);
    };

    // --- Fetch Meeting ---
    const fetchMeeting = async (isRefresh = false) => {
        try {
            if (!isRefresh) setLoading(true);
            const resp = await API.get(`/meetings/${id}`);
            if (resp.data.success) {
                setMeeting(resp.data.meeting);
                setEditForm(resp.data.meeting);
                setAgendaText(resp.data.meeting.agenda_text || '');
                if (resp.data.meeting.status === 'cancelled') {
                    setMeetingStatus('cancelled');
                }
            } else {
                setError('Meeting not found.');
            }
        } catch (err) {
            setError('Failed to load meeting details.');
        } finally {
            if (!isRefresh) setLoading(false);
        }
    };

    useEffect(() => {
        fetchMeeting();
    }, [id]);

    // --- Status Engine & Join Gate ---
    useEffect(() => {
        if (!meeting || meetingStatus === 'cancelled') {
            return;
        }

        const interval = setInterval(() => {
            if (meetingStatus === 'cancelled') return;

            const now = new Date();
            const dateStr = meeting.date;
            const timeStr = meeting.time;

            const [time, modifier] = (timeStr || '12:00 AM').split(' ');
            let [hours, minutes] = time.split(':');
            if (hours === '12') hours = '00';
            if (modifier === 'PM') hours = parseInt(hours, 10) + 12;

            const startTime = new Date(`${dateStr}T${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`);
            const endTime = new Date(startTime.getTime() + (parseInt(meeting.duration || 60) * 60000));
            const lobbyWinStart = new Date(startTime.getTime() - (10 * 60000));

            let newStatus = 'scheduled';
            let jState = 0;

            if (now > endTime && meetingStatus !== 'cancelled') {
                newStatus = 'completed';
                jState = 2; // Ended
            } else if (now >= startTime && now <= endTime) {
                newStatus = 'live';
                jState = 1; // Lobby / Live
            } else if (now >= lobbyWinStart && now < startTime) {
                newStatus = 'scheduled';
                jState = 1; // Lobby / Live (10 mins early)
            } else {
                jState = 0; // Too early
            }

            if (meetingStatus !== 'cancelled') {
                setMeetingStatus(newStatus);
                setJoinState(jState);
            }

            // Time countdown
            if (jState === 0) {
                const diffMs = startTime - now;
                const h = Math.floor(diffMs / 3600000);
                const m = Math.floor((diffMs % 3600000) / 60000);
                const s = Math.floor((diffMs % 60000) / 1000);
                if (h > 24) setCountdownText(`T-${Math.floor(h / 24)}d`);
                else setCountdownText(`T-${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
            }

        }, 1000);

        return () => clearInterval(interval);
    }, [meeting, meetingStatus]);

    // --- Handlers: ICS Generation ---
    const generateICS = () => {
        if (!meeting) return;
        const dateStr = meeting.date.replace(/-/g, '');
        const timeStr = meeting.time || '12:00 AM';
        const [time, modifier] = timeStr.split(' ');
        let [hours, minutes] = time.split(':');
        if (hours === '12') hours = '00';
        if (modifier === 'PM') hours = parseInt(hours, 10) + 12;
        hours = hours.toString().padStart(2, '0');
        minutes = minutes.toString().padStart(2, '0');

        const dtStart = `${dateStr}T${hours}${minutes}00Z`;
        // Add duration
        const startDate = new Date(`${meeting.date}T${hours}:${minutes}:00Z`);
        const endDate = new Date(startDate.getTime() + ((meeting.duration || 60) * 60000));
        const dtEnd = endDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

        const attendeesData = Array.isArray(meeting.attendees) ? meeting.attendees : [];
        const attendeesBlock = attendeesData.map(a => `ATTENDEE;ROLE=REQ-PARTICIPANT;RSVP=TRUE:mailto:${typeof a === 'string' ? a : a.email || a.name || ''}`).join('\r\n');

        const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Antigravity MOM//EN
BEGIN:VEVENT
UID:${meeting.id}@antigravity.com
DTSTAMP:${dtStart}
DTSTART:${dtStart}
DTEND:${dtEnd}
SUMMARY:${meeting.title}
DESCRIPTION:${(meeting.description || agendaText || '').replace(/\n/g, '\\n')}
LOCATION:${meeting.join_url || ''}
STATUS:CONFIRMED
ORGANIZER;CN=Host:mailto:noreply@antigravity.com
${attendeesBlock}
END:VEVENT
END:VCALENDAR`;

        const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', `${meeting.title.replace(/\s+/g, '_')}.ics`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const getGoogleCalendarDeepLink = () => {
        if (!meeting) return '#';
        return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(meeting.title)}&dates=20260410T090000Z/20260410T100000Z&details=${encodeURIComponent(meeting.description || '')}&location=${encodeURIComponent(meeting.join_url || '')}`;
    };

    // --- Handlers: Cancel Flow ---
    const initiateCancel = () => setCancelStage(1);

    const confirmCancel = async () => {
        setCancelStage(0);
        // Optimistic
        setMeetingStatus('cancelled');
        setMeeting(prev => ({ ...prev, status: 'cancelled' }));
        setShowUndoSnackbar(true);

        const actualReason = cancelReason === 'Other' ? cancelOtherReason : cancelReason;

        undoTimeoutRef.current = setTimeout(async () => {
            setShowUndoSnackbar(false);
            try {
                await API.post(`/meetings/${id}/cancel`, {
                    reason: actualReason,
                    note: cancelNote,
                    notify_attendees: cancelNotify,
                    cancelled_by: 'Host'
                });
            } catch (err) {
                showToast('Error finalizing cancellation on backend. Check logs.');
            }
        }, 8000);
    };

    const handleUndoCancel = () => {
        if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
        setShowUndoSnackbar(false);
        setMeetingStatus('scheduled');
        setMeeting(prev => ({ ...prev, status: 'scheduled' }));
        showToast('Cancellation undone successfully.');
    };

    // --- Handlers: Pre Join Gate ---
    const handleJoinGate = () => {
        if (joinState === 0) return;
        if (localStorage.getItem('skipMeetingGate') === 'true' || dontShowPreJoin) {
            window.open(meeting.join_url, '_blank', 'noopener,noreferrer');
        } else {
            setPreJoinOpen(true);
        }
    };

    const proceedToJoin = () => {
        if (dontShowPreJoin) localStorage.setItem('skipMeetingGate', 'true');
        setPreJoinOpen(false);
        window.open(meeting.join_url, '_blank', 'noopener,noreferrer');
    };

    // --- Handlers: Agenda Inline Editor ---
    const saveAgenda = async () => {
        setAgendaMode('view');
        try {
            await API.patch(`/meetings/${id}`, { agenda_text: agendaText });
            showToast('Agenda updated successfully.');
        } catch (e) {
            showToast('Failed to save agenda.');
        }
    };

    const applyAgendaTemplate = (type) => {
        const templates = {
            sync: "### Weekly Sync\n\n- [ ] Review Key metrics\n- [ ] Blockers from last week\n- [ ] Planning for this week\n"
        };
        setAgendaText(templates[type] || '');
        setAgendaMode('edit');
    };

    // --- Edit Mode Methods ---
    const handleEditChange = (k, v) => setEditForm(p => ({ ...p, [k]: v }));
    const handleSaveEdit = async () => {
        setSaving(true);
        try {
            const p = { ...editForm };
            await API.patch(`/meetings/${id}`, p);
            showToast('Meeting updated successfully.');
            setIsEditing(false);
            fetchMeeting(true);
        } catch (e) {
            showToast("Error updating meeting.");
        } finally {
            setSaving(false);
        }
    };

    const handleCopy = (text, field) => {
        navigator.clipboard.writeText(text);
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 2000);
    };

    // --- Renderers ---
    if (loading) return <div className="p-8 flex justify-center"><RefreshCw className="animate-spin w-8 h-8 text-indigo-500" /></div>;
    if (error || !meeting) return <div className="p-8 text-red-500 font-bold">{error}</div>;

    const platformInfo = platforms[meeting.platform] || platforms['teams'];

    return (
        <div className="meeting-details-page h-full overflow-y-auto bg-gray-50/20 p-8 space-y-16">

            {/* Toast */}
            {toastMessage && (
                <div className="fixed top-8 right-8 bg-black text-white px-8 py-4 rounded-xl shadow-xl z-50 animate-slideDown flex items-center gap-4 text-sm font-bold tracking-wide">
                    <Info className="w-4 h-4 text-white" /> {toastMessage}
                </div>
            )}

            {/* Undo Snackbar */}
            {showUndoSnackbar && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-8 py-4 rounded-xl shadow-2xl z-50 animate-slideUp flex items-center gap-8 text-sm font-bold border border-gray-700">
                    <span className="flex items-center gap-4"><Trash2 className="w-4 h-4 text-red-400" /> Action: Meeting cancelled.</span>
                    <button onClick={handleUndoCancel} className="text-gray-900 bg-yellow-400 hover:bg-yellow-300 px-4 py-2 rounded-lg font-black uppercase text-xs transition-colors">
                        Undo 8s
                    </button>
                </div>
            )}

            <div className="max-w-5xl mx-auto space-y-16">

                {/* Navigation Action */}
                <div className="w-full">
                    <button onClick={() => navigate('/dashboard/meetings')} className="text-xs font-black uppercase tracking-widest text-gray-400 hover:text-indigo-600 flex items-center gap-2 transition-colors">
                        <ArrowLeft className="w-4 h-4" /> Back to Manage Meetings
                    </button>
                </div>

                {/* DOMINANT HIERARCHY: Title & Primary Action Ribbon */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-16 relative">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 flex-wrap">
                            {meetingStatus === 'live' && <span className="px-4 py-2 rounded-lg bg-red-50 text-red-700 text-[10px] font-black uppercase tracking-widest flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></div> Live</span>}
                            {meetingStatus === 'cancelled' && (
                                <div className="flex flex-col gap-1">
                                    <span className="px-4 py-2 rounded-lg bg-gray-200 text-gray-700 text-[10px] font-black uppercase tracking-widest">Cancelled</span>
                                    <button
                                        onClick={() => navigate('/dashboard/schedule-meeting')}
                                        className="text-[10px] text-gray-400 hover:text-indigo-600 font-semibold text-left transition-colors"
                                    >
                                        Click to reschedule →
                                    </button>
                                </div>
                            )}
                            {meetingStatus === 'scheduled' && <span className="px-4 py-2 rounded-lg bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase tracking-widest">Scheduled</span>}
                            {meetingStatus === 'completed' && <span className="px-4 py-2 rounded-lg bg-gray-100 text-gray-400 text-[10px] font-black uppercase tracking-widest">Completed</span>}
                            <span className="text-gray-500 text-xs font-bold uppercase tracking-widest">{meeting.date}</span>
                            {/* Platform badge */}
                            <span
                                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border"
                                style={{
                                    background: platformInfo.color + '18',
                                    color: platformInfo.color,
                                    borderColor: platformInfo.color + '40',
                                }}
                            >
                                <span className="font-black">{platformInfo.icon}</span>
                                {platformInfo.name}
                            </span>
                        </div>
                        {/* ONE dominant text element on screen */}
                        <h1 className="text-5xl font-black text-gray-900 tracking-tighter leading-none">{meeting.title}</h1>
                        <div className="flex items-center gap-4 text-sm font-semibold text-gray-500">
                            <span className="flex items-center gap-2"><Clock className="w-4 h-4" /> {meeting.time}
                                <span className="text-gray-300 mx-1">/</span>
                                {meeting.duration ? `${meeting.duration}m` : <span className="text-gray-400 italic">Not recorded</span>}
                            </span>
                            <span className="flex items-center gap-2"><Video className="w-4 h-4" /> {platformInfo.name}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* 
                   Button Hierarchies:
                   1. Join Meeting = Primary (Filled Indigo)
                   2. Add to Calendar = Secondary (Outline/Ghost)
                */}

                        {meetingStatus !== 'cancelled' && (
                            <div className="relative group">
                                {/* Secondary Outline */}
                                <button className="flex items-center gap-2 px-8 py-4 bg-transparent border-2 border-gray-200 text-gray-700 hover:border-gray-300 rounded-xl text-sm font-extrabold uppercase tracking-widest transition-colors">
                                    <CalendarPlus className="w-4 h-4" /> Add ▾
                                </button>
                                <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20 overflow-hidden">
                                    <a href={getGoogleCalendarDeepLink()} target="_blank" rel="noreferrer" className="block px-4 py-4 text-xs font-bold uppercase tracking-widest text-gray-700 hover:bg-gray-50">Google Calendar</a>
                                    <button onClick={generateICS} className="w-full text-left px-4 py-4 text-xs font-bold uppercase tracking-widest text-gray-700 hover:bg-gray-50">Download .ics</button>
                                </div>
                            </div>
                        )}

                        {meetingStatus !== 'cancelled' && meetingStatus !== 'completed' && (
                            <button
                                onClick={handleJoinGate}
                                disabled={joinState === 0}
                                className={`flex items-center justify-center gap-4 px-16 py-4 rounded-xl text-sm font-extrabold shadow-sm transition-transform uppercase tracking-widest 
                            ${joinState === 0 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' :
                                        joinState === 1 ? 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95 animate-pulse-gentle' :
                                            'bg-gray-100 text-gray-400'}
                        `}
                            >
                                {joinState === 0 && <Clock className="w-4 h-4" />}
                                {joinState === 1 && <Play className="w-4 h-4 fill-currentColor" />}
                                {joinState === 0 ? countdownText : joinState === 1 ? 'Enter Lobby' : 'Ended'}
                            </button>
                        )}
                    </div>
                </div>

                {/* ── MOM Action strip: context-aware buttons ── */}
                {meetingStatus !== 'cancelled' && (
                    <div className="flex flex-wrap gap-3 pb-2 border-b border-gray-100">
                        {meeting.mom_generated ? (
                            <>
                                <button
                                    onClick={() => navigate('/dashboard/mom?tab=notes')}
                                    className="flex items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold uppercase tracking-widest shadow-sm transition-all active:scale-95"
                                >
                                    <FileText className="w-4 h-4" />
                                    View Meeting Notes
                                </button>
                                <button
                                    onClick={() => navigate('/dashboard/mom')}
                                    className="flex items-center gap-2 px-5 py-3 bg-white border-2 border-gray-200 hover:border-indigo-300 text-gray-700 hover:text-indigo-700 rounded-xl text-xs font-extrabold uppercase tracking-widest transition-all active:scale-95"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                    Regenerate
                                </button>
                            </>
                        ) : meeting.has_transcript ? (
                            <>
                                <button
                                    onClick={() => navigate('/dashboard/mom')}
                                    className="flex items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold uppercase tracking-widest shadow-sm transition-all active:scale-95"
                                >
                                    <CheckCircle2 className="w-4 h-4" />
                                    Generate Meeting Notes
                                </button>
                                <button
                                    onClick={() => navigate('/dashboard/mom')}
                                    className="flex items-center gap-2 px-5 py-3 bg-white border-2 border-gray-200 hover:border-indigo-300 text-gray-700 hover:text-indigo-700 rounded-xl text-xs font-extrabold uppercase tracking-widest transition-all active:scale-95"
                                >
                                    <FileText className="w-4 h-4" />
                                    View Transcript
                                </button>
                            </>
                        ) : (
                            <>
                                <button
                                    disabled
                                    title="Upload a transcript first"
                                    className="flex items-center gap-2 px-5 py-3 bg-indigo-100 text-indigo-400 cursor-not-allowed rounded-xl text-xs font-extrabold uppercase tracking-widest transition-all"
                                >
                                    <CheckCircle2 className="w-4 h-4" />
                                    Generate Meeting Notes
                                </button>
                                <button
                                    onClick={() => navigate('/dashboard/mom')}
                                    className="flex items-center gap-2 px-5 py-3 bg-white border-2 border-gray-200 hover:border-indigo-300 text-gray-700 hover:text-indigo-700 rounded-xl text-xs font-extrabold uppercase tracking-widest transition-all active:scale-95"
                                >
                                    <FilePlus className="w-4 h-4" />
                                    Add Transcript
                                </button>
                            </>
                        )}
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">

                    {/* Main Content Column */}
                    <div className="lg:col-span-2 space-y-16">

                        {/* Agenda / Description Editor */}
                        <div className="space-y-8">
                            <div className="flex justify-between items-end border-b border-gray-200 pb-4">
                                <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest">Context & Agenda</h2>
                                {agendaMode === 'view' && meetingStatus !== 'cancelled' && (
                                    // Tertiary Ghost Button
                                    <button onClick={() => setAgendaMode('edit')} className="text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-800 transition-colors">
                                        Edit Context
                                    </button>
                                )}
                            </div>
                            <div className="pt-2">
                                {agendaMode === 'edit' ? (
                                    <div className="space-y-8 animate-fadeIn">
                                        <div className="flex gap-4">
                                            <button onClick={() => applyAgendaTemplate('sync')} className="text-[10px] font-bold uppercase tracking-widest px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700">Weekly Sync</button>
                                        </div>
                                        <textarea
                                            className="w-full min-h-[300px] bg-transparent border-2 border-indigo-100 rounded-2xl p-8 text-sm font-medium text-gray-800 focus:outline-none focus:border-indigo-400"
                                            value={agendaText}
                                            onChange={e => setAgendaText(e.target.value)}
                                            placeholder="Write agenda topics..."
                                        />
                                        <div className="flex justify-end gap-4">
                                            <button onClick={() => { setAgendaText(meeting.agenda_text || ''); setAgendaMode('view'); }} className="px-8 py-4 text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-gray-900">Cancel</button>
                                            <button onClick={saveAgenda} className="px-8 py-4 text-xs font-bold uppercase tracking-widest bg-gray-900 text-white hover:bg-black rounded-xl">Save Agenda</button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="prose prose-sm max-w-none text-gray-700 font-medium">
                                        {agendaText ? (
                                            <div className="whitespace-pre-wrap leading-loose">{agendaText.replace(/- \[ \]/g, '⬜').replace(/- \[x\]/gi, '✅')}</div>
                                        ) : (
                                            <div className="text-gray-400 italic">No context added yet — add agenda points to improve your meeting notes quality</div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Info Card / Editing Mode */}
                        <div className="space-y-8">
                            <div className="flex justify-between items-end border-b border-gray-200 pb-4">
                                <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest">Metadata</h2>
                                {meetingStatus === 'scheduled' && !isEditing && (
                                    <button onClick={() => setIsEditing(true)} className="text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-800 transition-colors">Reconfigure</button>
                                )}
                            </div>

                            {!isEditing ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Connection Payload</label>
                                        {meeting.join_url ? (
                                            <div className="flex items-center gap-4">
                                                <div className="flex-1 text-sm font-mono text-gray-900 truncate bg-gray-100 px-4 py-2 rounded-lg">{meeting.join_url}</div>
                                                <button onClick={() => handleCopy(meeting.join_url, 'link')} className="p-2 text-gray-400 hover:text-gray-900 transition-colors">
                                                    {copiedField === 'link' ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <Copy className="w-5 h-5" />}
                                                </button>
                                            </div>
                                        ) : <span className="text-sm text-gray-400 italic font-medium">Not recorded</span>}
                                    </div>
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Access Key</label>
                                        {meeting.meeting_code ? (
                                            <div className="flex items-center gap-4">
                                                <div className="flex-1 text-sm font-mono text-gray-900 tracking-widest bg-gray-100 px-4 py-2 rounded-lg">{meeting.meeting_code}</div>
                                                <button onClick={() => handleCopy(meeting.meeting_code, 'code')} className="p-2 text-gray-400 hover:text-gray-900 transition-colors">
                                                    {copiedField === 'code' ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <Copy className="w-5 h-5" />}
                                                </button>
                                            </div>
                                        ) : <span className="text-sm text-gray-400 italic font-medium">Not recorded</span>}
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-8 animate-fadeIn">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Date Constraint</label>
                                        <input type="date" className="w-full border-2 border-gray-200 rounded-xl p-4 text-sm font-mono focus:border-indigo-500 outline-none" value={editForm.date} onChange={e => handleEditChange('date', e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Time Constraint</label>
                                        <input type="time" className="w-full border-2 border-gray-200 rounded-xl p-4 text-sm font-mono focus:border-indigo-500 outline-none" value={editForm.time} onChange={e => handleEditChange('time', e.target.value)} />
                                    </div>
                                    <div className="col-span-2 flex justify-end gap-4 mt-8">
                                        <button onClick={() => setIsEditing(false)} className="px-8 py-4 text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-gray-900 transition-colors">Abort</button>
                                        <button onClick={handleSaveEdit} disabled={saving} className="px-8 py-4 text-xs font-bold uppercase tracking-widest bg-gray-900 text-white hover:bg-black rounded-xl transition-colors">{saving ? 'Syncing...' : 'Commit Changes'}</button>
                                    </div>
                                </div>
                            )}
                        </div>

                    </div>

                    {/* Right Sidebar Column */}
                    <div className="space-y-16">

                        {/* Advanced Attendees List */}
                        <div className="space-y-8">
                            <div className="border-b border-gray-200 pb-4 flex justify-between items-end">
                                <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest">Registrations</h2>
                                <span className="text-[10px] font-extrabold text-indigo-700 bg-indigo-50 px-2 py-1 rounded bg-indigo-100">{meeting.attendees?.length || 0}</span>
                            </div>
                            <div className="space-y-4">
                                {meeting.attendees && meeting.attendees.map((att, idx) => {
                                    const email = typeof att === 'string' ? att : att.email || att.name;
                                    let rsvp = typeof att === 'string' ? 'PENDING' : att.rsvpStatus || 'PENDING';

                                    // STATE MACHINE ENFORCEMENT: 
                                    // If meeting is completed, PENDING is invalid. Replace with 'No-show' (mock logic) 
                                    // or 'Attended' based on real data logic.
                                    if (meetingStatus === 'completed' && rsvp === 'PENDING') {
                                        rsvp = 'NOT RECORDED'; // Safe fallback.
                                    }

                                    return (
                                        <div key={idx} className="flex justify-between items-center group">
                                            <div className="flex flex-col truncate">
                                                <span className="text-sm font-bold text-gray-900 truncate">{email}</span>
                                                <span className={`text-[10px] uppercase font-black tracking-widest mt-1
                                            ${rsvp === 'ACCEPTED' ? 'text-emerald-500' :
                                                        rsvp === 'DECLINED' ? 'text-red-500' :
                                                            rsvp === 'NOT RECORDED' ? 'text-gray-300' :
                                                                'text-amber-500'}
                                         `}>{rsvp}</span>
                                            </div>
                                            {meetingStatus !== 'completed' && meetingStatus !== 'cancelled' && (
                                                <button onClick={() => showToast(`Invite resent to ${email}`)} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-indigo-600 transition-opacity" title="Resend">
                                                    <Mail className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                                {(!meeting.attendees || meeting.attendees.length === 0) && (
                                    <span className="text-sm text-gray-400 italic">No registrations found.</span>
                                )}
                            </div>
                        </div>

                        {/* Cancel Trigger Box (Destructive Primary) */}
                        {meetingStatus === 'scheduled' && (
                            <div className="space-y-4 pt-16">
                                <button onClick={initiateCancel} className="w-full bg-transparent border-[3px] border-red-100 text-red-600 hover:bg-red-50 hover:border-red-200 py-4 rounded-xl text-xs uppercase tracking-widest font-black transition-colors">
                                    Scrap Meeting
                                </button>
                                <p className="text-[10px] text-gray-400 uppercase tracking-widest text-center">Permenant Destructive Action</p>
                            </div>
                        )}

                    </div>
                </div>
            </div>

            {/* --- Enterprise Destructive Cancel Modal --- */}
            {cancelStage > 0 && (
                <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-8 animate-fadeIn">
                    <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-lg overflow-hidden animate-scaleIn">

                        {/* Modal Header */}
                        <div className="p-8 pb-4 flex justify-between items-start">
                            <h3 className="text-2xl font-black text-red-600 tracking-tight">
                                {cancelStage === 1 ? 'Evaluate Destruction' : cancelStage === 2 ? 'Route Notifications' : 'Commit Deletion'}
                            </h3>
                            <button onClick={() => setCancelStage(0)} className="text-gray-300 hover:text-gray-900 bg-transparent transition-colors"><X className="w-6 h-6" /></button>
                        </div>

                        <div className="px-8 pb-16 space-y-16">
                            {/* Stage 1: Intent Capture */}
                            {cancelStage === 1 && (
                                <div className="space-y-8 animate-slideLeft mt-8">
                                    <div className="space-y-4">
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Mandatory Designation</label>
                                        <select className="w-full border-b-2 border-gray-200 py-4 text-base font-bold text-gray-900 focus:outline-none focus:border-red-500 bg-transparent cursor-pointer" value={cancelReason} onChange={e => setCancelReason(e.target.value)}>
                                            <option value="">Select cancellation vector...</option>
                                            <option value="Rescheduled">Rescheduled</option>
                                            <option value="Host unavailable">Host unavailable</option>
                                            <option value="Attendee conflict">Attendee conflict</option>
                                            <option value="No longer needed">No longer needed</option>
                                            <option value="Other">Custom Reason</option>
                                        </select>
                                    </div>
                                    {cancelReason === 'Other' && (
                                        <div className="animate-slideDown space-y-4 mt-8">
                                            <input type="text" maxLength={280} className="w-full border-b-2 border-gray-200 py-4 text-base font-bold text-gray-900 focus:outline-none focus:border-red-500 bg-transparent" placeholder="Specify explicit reason..." value={cancelOtherReason} onChange={e => setCancelOtherReason(e.target.value)} />
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Stage 2: Notifications */}
                            {cancelStage === 2 && (
                                <div className="space-y-8 animate-slideLeft mt-8">
                                    <label className="flex items-center gap-4 cursor-pointer">
                                        <input type="checkbox" className="w-6 h-6 text-red-600 border-2 border-gray-300 rounded focus:ring-red-500" checked={cancelNotify} onChange={e => setCancelNotify(e.target.checked)} />
                                        <span className="text-sm font-bold text-gray-900">Broadcast cancellation emails immediately</span>
                                    </label>

                                    {cancelNotify && (
                                        <div className="animate-slideDown space-y-4">
                                            <textarea
                                                rows={3}
                                                className="w-full border-2 border-gray-200 rounded-2xl p-4 text-sm font-medium focus:border-red-500 outline-none"
                                                placeholder="Attach external note for attendees (Optional)..."
                                                value={cancelNote}
                                                onChange={e => setCancelNote(e.target.value)}
                                            />
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Stage 3: Destructive Verify */}
                            {cancelStage === 3 && (
                                <div className="space-y-8 animate-slideLeft mt-8">
                                    <div className="bg-red-50 p-6 rounded-2xl border border-red-100 flex items-center justify-center text-center">
                                        <p className="text-xs font-black text-red-900 uppercase tracking-widest">Hard execution bypasses fail-safes</p>
                                    </div>
                                    <div className="space-y-4">
                                        <label className="block text-sm font-medium text-gray-500">
                                            Input <strong className="text-gray-900 font-mono tracking-widest">{meeting.title}</strong> to finalize.
                                        </label>
                                        <input type="text" className="w-full border-b-2 border-gray-200 py-4 text-base font-bold font-mono focus:border-red-500 outline-none bg-transparent" value={cancelMatch} onChange={e => setCancelMatch(e.target.value)} autoFocus />
                                    </div>
                                </div>
                            )}

                        </div>

                        {/* Modal Footer Controls */}
                        <div className="p-8 bg-gray-50 flex justify-end gap-8">
                            {cancelStage > 1 && (
                                <button onClick={() => setCancelStage(s => s - 1)} className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-900 transition-colors">Retreat</button>
                            )}

                            {cancelStage < 3 ? (
                                <button onClick={() => setCancelStage(s => s + 1)} disabled={cancelStage === 1 && (!cancelReason || (cancelReason === 'Other' && !cancelOtherReason))} className="px-8 py-4 bg-gray-900 text-white rounded-xl text-xs font-black uppercase tracking-widest disabled:bg-gray-200 disabled:text-gray-400 transition-colors">Advance</button>
                            ) : (
                                <button onClick={confirmCancel} disabled={cancelMatch !== meeting.title} className="px-8 py-4 bg-red-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-700 disabled:bg-gray-200 disabled:text-gray-400 transition-colors">Execute Cancel</button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* --- Pre-Join Gate Modal --- */}
            {preJoinOpen && (
                <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-8 animate-fadeIn">
                    <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-sm overflow-hidden animate-scaleIn">
                        <div className="p-8 space-y-8">
                            <div className="space-y-4 text-center">
                                <h3 className="text-2xl font-black text-gray-900 tracking-tight">System Checks</h3>
                                <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Verify hardware outputs</p>
                            </div>

                            <div className="space-y-4">
                                {['camera', 'mic', 'agenda'].map((key) => (
                                    <label key={key} className="flex items-center gap-4 cursor-pointer">
                                        <input type="checkbox" className="w-5 h-5 rounded border-2 border-gray-300 text-indigo-600 focus:ring-indigo-500" checked={preJoinChecks[key]} onChange={e => setPreJoinChecks({ ...preJoinChecks, [key]: e.target.checked })} />
                                        <span className="text-sm font-extrabold text-gray-800 capitalize">
                                            {key === 'agenda' ? 'Agenda synced?' : `${key} mapped?`}
                                        </span>
                                    </label>
                                ))}
                            </div>

                            <div className="pt-8 flex flex-col gap-4">
                                <button onClick={proceedToJoin} className="w-full py-4 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-colors">Initiate Bridge</button>
                                <button onClick={() => setPreJoinOpen(false)} className="w-full py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-900 transition-colors">Abort</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default MeetingDetailsPage;
