import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Calendar, Clock, Users, Video, Edit, X, Copy, 
  ExternalLink, CheckCircle2, AlertCircle, FileText, 
  Play, StopCircle, RefreshCw, Key, ArrowLeft
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
  const [showSaved, setShowSaved] = useState(false);
  
  // --- UI State ---
  const [meetingStatus, setMeetingStatus] = useState('scheduled'); // scheduled, live, completed, cancelled
  const [timeUntilStart, setTimeUntilStart] = useState('');
  const [showAutoJoinBanner, setShowAutoJoinBanner] = useState(false);
  const [showFallbackModal, setShowFallbackModal] = useState(false);
  const [copiedField, setCopiedField] = useState(null);
  const [hasAutoJoined, setHasAutoJoined] = useState(false);

  const platforms = {
    teams: { name: 'Microsoft Teams', icon: 'M', color: '#5558AF' },
    meet: { name: 'Google Meet', icon: 'G', color: '#00832D' },
    zoho: { name: 'Zoho Mail', icon: 'Z', color: '#005CE3' }
  };

  // --- Fetch Meeting ---
  useEffect(() => {
    const fetchMeeting = async () => {
      try {
        const resp = await API.get(`/meetings/${id}`);
        if (resp.data.success) {
          setMeeting(resp.data.meeting);
          setEditForm(resp.data.meeting);
        } else {
          setError('Meeting not found.');
        }
      } catch (err) {
        setError('Failed to load meeting details.');
      } finally {
        setLoading(false);
      }
    };
    fetchMeeting();
  }, [id]);

  // --- Status Engine & Auto-Join ---
  useEffect(() => {
    if (!meeting || meeting.status === 'cancelled') {
      if (meeting?.status === 'cancelled') setMeetingStatus('cancelled');
      return;
    }

    const interval = setInterval(() => {
      const now = new Date();
      // Parse meeting date and time
      // Assuming date is "YYYY-MM-DD" and time is "HH:MM AM/PM"
      const dateStr = meeting.date;
      const timeStr = meeting.time;
      
      const [time, modifier] = timeStr.split(' ');
      let [hours, minutes] = time.split(':');
      if (hours === '12') hours = '00';
      if (modifier === 'PM') hours = parseInt(hours, 10) + 12;
      
      const startTime = new Date(`${dateStr}T${hours}:${minutes}:00`);
      const endTime = new Date(startTime.getTime() + (parseInt(meeting.duration) * 60000));
      
      let newStatus = 'scheduled';
      if (now >= startTime && now <= endTime) {
        newStatus = 'live';
      } else if (now > endTime) {
        newStatus = 'completed';
      }

      setMeetingStatus(newStatus);

      // Time until start text
      if (newStatus === 'scheduled') {
        const diffMs = startTime - now;
        const diffMins = Math.floor(diffMs / 60000);
        
        if (diffMins > 0 && diffMins <= 60) {
            setTimeUntilStart(`Starts in ${diffMins} min`);
            if (diffMins <= 5 && !showAutoJoinBanner) {
                setShowAutoJoinBanner(true);
            }
        } else if (diffMins > 60) {
            setTimeUntilStart(`Starts in ${Math.floor(diffMins/60)} hrs`);
        }
      } else if (newStatus === 'live') {
          setTimeUntilStart('In progress');
          
          // Auto-trigger logic requested by spec
          if (!hasAutoJoined && meeting.joinUrl) {
              setHasAutoJoined(true);
              setTimeout(() => {
                  window.open(meeting.joinUrl, '_blank');
              }, 2000);
          }
      } else {
          setTimeUntilStart('Finished');
      }

    }, 1000);

    return () => clearInterval(interval);
  }, [meeting, showAutoJoinBanner, hasAutoJoined]);


  // --- Handlers: Join Flow ---
  const handleJoinMeeting = () => {
    if (meeting.joinUrl) {
      window.open(meeting.joinUrl, '_blank');
    } else {
        setShowFallbackModal(true);
    }
  };

  const handleCopy = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // --- Handlers: Cancel ---
  const handleCancel = async () => {
    if (window.confirm('Are you sure you want to cancel this meeting?')) {
        try {
            await API.post(`/meetings/${id}/cancel`);
            setMeeting(prev => ({ ...prev, status: 'cancelled' }));
            setMeetingStatus('cancelled');
        } catch (err) {
            alert('Failed to cancel meeting.');
        }
    }
  };

  // --- Handlers: Edit Sync ---
  const handleSaveEdit = async () => {
    setSaving(true);
    try {
        const payload = { ...editForm };
        // Clean array inputs if they were changed to strings
        if (typeof payload.attendees === 'string') {
            payload.attendees = payload.attendees.split(',').map(s => s.trim()).filter(Boolean);
        }
        if (typeof payload.agenda === 'string') {
            payload.agenda = payload.agenda.split(',').map(s => s.trim()).filter(Boolean);
        }

        const resp = await API.patch(`/meetings/${id}`, payload);
        if (resp.data.success) {
            setMeeting(resp.data.meeting);
            // reset edit form Arrays back nicely
            setEditForm(resp.data.meeting);
            setIsEditing(false);
            
            // Show inline saved confirmation
            setShowSaved(true);
            setTimeout(() => setShowSaved(false), 2500);
        }
    } catch (err) {
        alert('Failed to update meeting.');
    } finally {
        setSaving(false);
    }
  };

  const handleEditChange = (field, value) => {
      setEditForm(prev => ({ ...prev, [field]: value }));
  };

  // --- Handlers: MOM ---
  const handleGenerateMOM = () => {
      // Logic to push meeting payload to MOM generation processor
      alert(`Triggering MOM creation for ID: ${meeting.momIntegrationId}`);
      // In real implementation: navigate to MOM specific page with context
      navigate('/dashboard/mom');
  };

  // --- Renderers ---
  if (loading) return <div className="p-8 flex items-center justify-center"><RefreshCw className="animate-spin w-6 h-6 text-indigo-500" /></div>;
  if (error || !meeting) return <div className="p-8 text-red-500">{error}</div>;

  const platformInfo = platforms[meeting.platform] || platforms['teams'];

  return (
    <div className="meeting-details-page h-full overflow-y-auto">
      
      {/* Auto Join Banner */}
      {showAutoJoinBanner && meetingStatus === 'scheduled' && (
          <div className="bg-indigo-600 text-white px-6 py-3 flex justify-between items-center shadow-md animate-slideDown">
              <div className="flex items-center gap-2 font-medium">
                  <Play className="w-4 h-4" /> Your meeting is starting soon!
              </div>
              <button 
                onClick={handleJoinMeeting}
                className="bg-white text-indigo-600 px-4 py-1.5 rounded-md font-bold text-sm hover:bg-gray-100 transition-colors"
                autoFocus
              >
                  Join Now
              </button>
          </div>
      )}

      <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6 flex flex-col items-center">
          
        {/* Back Button with Expand/Magnetic Effect */}
        <div className="w-full flex justify-start mb-2">
            <button 
                onClick={() => navigate('/dashboard/meetings')} 
                className="group flex items-center gap-2 text-gray-500 hover:text-indigo-600 transition-all duration-300 overflow-hidden hover:bg-indigo-50 px-2 hover:px-4 py-1.5 rounded-full"
            >
                <div className="bg-white group-hover:bg-indigo-100 p-1.5 rounded-full shadow-sm group-hover:shadow transition-all duration-300 transform group-hover:-translate-x-1">
                    <ArrowLeft className="w-4 h-4" />
                </div>
                <span className="text-sm font-semibold max-w-0 opacity-0 group-hover:max-w-xs group-hover:opacity-100 transition-all duration-500 whitespace-nowrap overflow-hidden">
                    Back to Meetings
                </span>
            </button>
        </div>

        {/* Header Section */}
        <div className="w-full bg-white border border-gray-200 rounded-2xl p-6 shadow-sm relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className={`absolute top-0 left-0 w-1.5 h-full ${meetingStatus === 'live' ? 'bg-red-500' : meetingStatus === 'completed' ? 'bg-emerald-500' : meetingStatus === 'cancelled' ? 'bg-gray-400' : 'bg-indigo-500'}`}></div>
            
            <div className="pl-2">
                <div className="flex items-center gap-3 mb-1">
                    <h1 className="text-2xl font-bold text-gray-900">{meeting.title}</h1>
                    {meetingStatus === 'live' && <span className="px-2.5 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse"></div> Live</span>}
                    {meetingStatus === 'completed' && <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold uppercase tracking-wider">Completed</span>}
                    {meetingStatus === 'cancelled' && <span className="px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-700 text-xs font-bold uppercase tracking-wider">Cancelled</span>}
                    {meetingStatus === 'scheduled' && <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold uppercase tracking-wider">Scheduled {timeUntilStart && `• ${timeUntilStart}`}</span>}
                </div>
                <p className="text-sm text-gray-500 font-medium font-mono">ID: {meeting.id}</p>
            </div>

            <div className="flex items-center gap-2">
                {meetingStatus !== 'cancelled' && (
                    <>
                        <button onClick={() => setShowFallbackModal(true)} className="md-btn border border-gray-200 text-gray-700 hover:bg-gray-50"><ExternalLink className="w-4 h-4" /> Info</button>
                        {meetingStatus !== 'completed' && (
                           <button onClick={handleJoinMeeting} className="md-btn bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm"><Play className="w-4 h-4" fill="currentColor" /> Join Meeting</button>
                        )}
                    </>
                )}
            </div>
        </div>

        {/* Content Section */}
        <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Left Col: Info */}
            <div className="md:col-span-2 space-y-6">
                
                {/* Details Card */}
                <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-3">
                            <h2 className="text-lg font-bold text-gray-900">Meeting Details</h2>
                            {showSaved && (
                                <span className="bg-emerald-100 text-emerald-700 text-xs px-2 py-1 rounded-md font-bold flex items-center gap-1 animate-fadeIn"><CheckCircle2 className="w-3 h-3" /> Saved!</span>
                            )}
                        </div>
                        {(meetingStatus === 'scheduled' || meetingStatus === 'live') && !isEditing && (
                            <button onClick={() => setIsEditing(true)} className="text-indigo-600 hover:text-indigo-700 text-sm font-medium flex items-center gap-1"><Edit className="w-4 h-4" /> Edit</button>
                        )}
                    </div>

                    {!isEditing ? (
                        <div className="space-y-5">
                             <div className="flex items-start gap-4">
                                 <div className="p-2.5 bg-gray-50 rounded-xl text-gray-500"><Calendar className="w-5 h-5" /></div>
                                 <div>
                                     <p className="font-semibold text-gray-900">{meeting.date}</p>
                                     <p className="text-sm text-gray-500">{meeting.time} ({meeting.duration} minutes)</p>
                                 </div>
                             </div>
                             <div className="flex items-start gap-4">
                                 <div className="p-2.5 bg-gray-50 rounded-xl text-gray-500" style={{color: platformInfo.color}}><Video className="w-5 h-5" /></div>
                                 <div>
                                     <p className="font-semibold text-gray-900">{platformInfo.name}</p>
                                     <p className="text-sm text-blue-600 hover:underline cursor-pointer" onClick={handleJoinMeeting}>{meeting.joinUrl ? "Direct Link Attached" : "Requires Manual Join"}</p>
                                 </div>
                             </div>
                             {meeting.description && (
                                 <div className="flex items-start gap-4">
                                     <div className="p-2.5 bg-gray-50 rounded-xl text-gray-500"><FileText className="w-5 h-5" /></div>
                                     <div>
                                         <p className="font-semibold text-gray-900">Description</p>
                                         <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{meeting.description}</p>
                                     </div>
                                 </div>
                             )}
                        </div>
                    ) : (
                        <div className="space-y-4 animate-fadeIn">
                             {meetingStatus === 'live' && (
                                 <div className="bg-indigo-50 text-indigo-700 text-xs px-3 py-2 rounded-lg font-medium flex items-center gap-2 mb-2">
                                     <Play className="w-3 h-3" /> Core scheduling fields are locked while meeting is live.
                                 </div>
                             )}
                             <div className="grid grid-cols-2 gap-4">
                                 <div>
                                    <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Date</label>
                                    <input type="date" disabled={meetingStatus === 'live'} className={`md-input border border-gray-300 w-full p-2 rounded-lg ${meetingStatus === 'live' ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : ''}`} value={editForm.date} onChange={e => handleEditChange('date', e.target.value)} />
                                 </div>
                                 <div>
                                    <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Time</label>
                                    <input type="time" disabled={meetingStatus === 'live'} className={`md-input border border-gray-300 w-full p-2 rounded-lg ${meetingStatus === 'live' ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : ''}`} value={editForm.time} onChange={e => handleEditChange('time', e.target.value)} />
                                 </div>
                                 <div>
                                    <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Platform</label>
                                    <select disabled={meetingStatus === 'live'} className={`md-input border border-gray-300 w-full p-2 rounded-lg ${meetingStatus === 'live' ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : ''}`} value={editForm.platform} onChange={e => handleEditChange('platform', e.target.value)}>
                                        <option value="teams">Microsoft Teams</option>
                                        <option value="meet">Google Meet</option>
                                        <option value="zoho">Zoho Mail</option>
                                    </select>
                                 </div>
                                 <div>
                                    <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Duration (min)</label>
                                    <select disabled={meetingStatus === 'live'} className={`md-input border border-gray-300 w-full p-2 rounded-lg ${meetingStatus === 'live' ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : ''}`} value={editForm.duration} onChange={e => handleEditChange('duration', e.target.value)}>
                                        <option value="15">15</option>
                                        <option value="30">30</option>
                                        <option value="45">45</option>
                                        <option value="60">60</option>
                                    </select>
                                 </div>
                             </div>
                             <div>
                                <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Attendees (Comma Separated)</label>
                                <textarea className="md-input border border-gray-300 w-full p-2 rounded-lg resize-y" rows={2} value={Array.isArray(editForm.attendees) ? editForm.attendees.join(', ') : editForm.attendees} onChange={e => handleEditChange('attendees', e.target.value)} />
                             </div>
                             <div>
                                <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Agenda (Comma Separated)</label>
                                <textarea className="md-input border border-gray-300 w-full p-2 rounded-lg resize-y" rows={2} value={Array.isArray(editForm.agenda) ? editForm.agenda.join(', ') : editForm.agenda} onChange={e => handleEditChange('agenda', e.target.value)} />
                             </div>
                             <div>
                                <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Description</label>
                                <textarea className="md-input border border-gray-300 w-full p-2 rounded-lg resize-y" rows={3} value={editForm.description || ''} onChange={e => handleEditChange('description', e.target.value)} />
                             </div>
                             <div className="flex gap-2 justify-end pt-2">
                                 <button onClick={() => setIsEditing(false)} className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100">Cancel</button>
                                 <button onClick={handleSaveEdit} disabled={saving} className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-900 text-white hover:bg-black">{saving ? 'Saving...' : 'Save Changes'}</button>
                             </div>
                        </div>
                    )}
                </div>

                {/* Agenda Card */}
                <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                     <h2 className="text-lg font-bold text-gray-900 mb-4">Meeting Agenda</h2>
                     {meeting.agenda && meeting.agenda.length > 0 ? (
                         <div className="space-y-3">
                             {meeting.agenda.map((item, idx) => (
                                 <div key={idx} className="flex gap-3">
                                     <span className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs flex-shrink-0">{idx + 1}</span>
                                     <p className="text-sm text-gray-700 mt-0.5">{item}</p>
                                 </div>
                             ))}
                         </div>
                     ) : (
                         <p className="text-sm text-gray-500 italic">No agenda provided for this meeting.</p>
                     )}
                </div>

            </div>

            {/* Right Col: Sidebar */}
            <div className="space-y-6">
                
                {/* Attendees */}
                <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                    <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center justify-between">
                        Attendees <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">{meeting.attendees?.length || 0}</span>
                    </h2>
                    <div className="flex flex-col gap-2">
                         {meeting.attendees && meeting.attendees.map((email, idx) => (
                             <div key={idx} className="flex items-center gap-3 p-2 rounded-lg border border-gray-100 hover:bg-gray-50">
                                 <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-100 to-blue-100 border border-indigo-200 flex items-center justify-center text-xs font-bold text-indigo-700 uppercase">
                                     {email[0]}
                                 </div>
                                 <span className="text-sm font-medium text-gray-700 truncate">{email}</span>
                             </div>
                         ))}
                    </div>
                </div>

                {/* Actions */}
                {meetingStatus === 'scheduled' && (
                    <div className="bg-red-50 border border-red-100 rounded-2xl p-5">
                       <h3 className="text-sm font-bold text-red-800 mb-2 flex items-center gap-1.5"><AlertCircle className="w-4 h-4" /> Danger Zone</h3>
                       <p className="text-xs text-red-600 mb-3">Canceling this meeting is permanent and will notify attendees.</p>
                       <button onClick={handleCancel} className="w-full py-2 bg-white border border-red-200 text-red-600 rounded-lg text-sm font-bold hover:bg-red-50 hover:border-red-300 transition-colors">
                           Cancel Meeting
                       </button>
                    </div>
                )}

            </div>
        </div>
      </div>

      {/* Fallback Join Modal */}
      {showFallbackModal && (
          <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-scaleIn">
                  <div className="bg-gray-50 border-b border-gray-200 p-4 flex justify-between items-center">
                      <h3 className="font-bold text-gray-900">Join Methods</h3>
                      <button onClick={() => setShowFallbackModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                  </div>
                  <div className="p-5 space-y-4">
                      
                      {meeting.joinUrl && (
                        <div>
                            <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Direct Join Link</label>
                            <div className="flex">
                                <input readOnly value={meeting.joinUrl} className="font-mono text-xs w-full bg-gray-50 border border-r-0 border-gray-200 p-2.5 rounded-l-lg outline-none" />
                                <button onClick={() => handleCopy(meeting.joinUrl, 'link')} className="relative px-3 bg-gray-100 border border-l-0 border-gray-200 rounded-r-lg hover:bg-gray-200 transition-colors flex items-center justify-center min-w-[40px]">
                                    {copiedField === 'link' ? (
                                        <>
                                          <CheckCircle2 className="w-4 h-4 text-emerald-600 animate-[bounce_0.5s_ease-out]" />
                                          <span className="absolute -top-8 left-1/2 -translate-x-1/2 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded shadow-sm whitespace-nowrap pointer-events-none animate-[bounce_1s_infinite]">Copied!</span>
                                        </>
                                    ) : <Copy className="w-4 h-4 text-gray-600" />}
                                </button>
                            </div>
                        </div>
                      )}

                      {meeting.id && (
                          <div>
                              <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Meeting ID / Key</label>
                              <div className="flex">
                                  <input readOnly value={meeting.id} className="font-mono text-xs w-full bg-gray-50 border border-r-0 border-gray-200 p-2.5 rounded-l-lg outline-none" />
                                  <button onClick={() => handleCopy(meeting.id, 'id')} className="relative px-3 bg-gray-100 border border-l-0 border-gray-200 rounded-r-lg hover:bg-gray-200 transition-colors flex items-center justify-center min-w-[40px]">
                                      {copiedField === 'id' ? (
                                        <>
                                          <CheckCircle2 className="w-4 h-4 text-emerald-600 animate-[bounce_0.5s_ease-out]" />
                                          <span className="absolute -top-8 left-1/2 -translate-x-1/2 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded shadow-sm whitespace-nowrap pointer-events-none animate-[bounce_1s_infinite]">Copied!</span>
                                        </>
                                      ) : <Copy className="w-4 h-4 text-gray-600" />}
                                  </button>
                              </div>
                          </div>
                      )}

                      {meeting.passcode && (
                          <div>
                              <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block flex items-center gap-1"><Key className="w-3 h-3" /> Passcode</label>
                              <div className="flex">
                                  <input readOnly value={meeting.passcode} className="font-mono text-sm tracking-widest font-bold w-full bg-indigo-50/50 border border-r-0 border-indigo-100 text-indigo-700 p-2.5 rounded-l-lg outline-none" />
                                  <button onClick={() => handleCopy(meeting.passcode, 'passcode')} className="relative px-3 bg-indigo-50 border border-l-0 border-indigo-100 rounded-r-lg hover:bg-indigo-100 transition-colors flex items-center justify-center min-w-[40px]">
                                      {copiedField === 'passcode' ? (
                                        <>
                                          <CheckCircle2 className="w-4 h-4 text-emerald-600 animate-[bounce_0.5s_ease-out]" />
                                          <span className="absolute -top-8 left-1/2 -translate-x-1/2 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded shadow-sm whitespace-nowrap pointer-events-none animate-[bounce_1s_infinite]">Copied!</span>
                                        </>
                                      ) : <Copy className="w-4 h-4 text-indigo-600" />}
                                  </button>
                              </div>
                          </div>
                      )}

                      <div className="pt-2">
                          <button onClick={() => { if(meeting.joinUrl) window.open(meeting.joinUrl, '_blank'); }} className="w-full py-2.5 bg-gray-900 text-white rounded-lg font-medium text-sm hover:bg-black transition-colors flex justify-center items-center gap-2">
                             Launch {platformInfo.name} <ExternalLink className="w-4 h-4" />
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};

export default MeetingDetailsPage;
