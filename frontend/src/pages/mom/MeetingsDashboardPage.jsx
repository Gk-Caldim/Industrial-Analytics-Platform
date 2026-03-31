import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, Clock, Video, Plus, Search, 
  ChevronRight, Play, FileText, CheckCircle2,
  RefreshCw, Users
} from 'lucide-react';
import './MeetingsDashboardPage.css';
import API from '../../utils/api';

const MeetingsDashboardPage = () => {
  const navigate = useNavigate();

  // State
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeNow, setTimeNow] = useState(new Date());

  // Search/Filter (optional feature for UX)
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch Logic
  const fetchMeetings = async () => {
    try {
      const resp = await API.get('/meetings');
      if (resp.data && resp.data.success) {
        setMeetings(resp.data.meetings);
      }
    } catch (err) {
      setError('Failed to load meetings calendar.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeetings();
  }, []);

  // Time Engine for real-time awareness
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeNow(new Date());
    }, 10000); // Only need to update every 10 seconds for UX efficiency
    return () => clearInterval(timer);
  }, []);

  // Helper to parse meeting start/end times precisely
  const parseMeetingTimes = (m) => {
    const dateStr = m.date; // YYYY-MM-DD
    const [time, modifier] = m.time.split(' ');
    let [hours, minutes] = time.split(':');
    if (hours === '12') hours = '00';
    if (modifier === 'PM') hours = (parseInt(hours, 10) + 12).toString();
    
    const startTime = new Date(`${dateStr}T${hours.padStart(2, '0')}:${minutes}:00`);
    const endTime = new Date(startTime.getTime() + (parseInt(m.duration) * 60000));
    const startingSoonTime = new Date(startTime.getTime() - (5 * 60000)); // 5 mins before
    
    return { startTime, endTime, startingSoonTime };
  };

  // State calculations
  const getMeetingState = (m) => {
    if (m.status === 'cancelled') return 'cancelled';
    
    const { startTime, endTime, startingSoonTime } = parseMeetingTimes(m);
    
    if (timeNow > endTime) return 'completed';
    if (timeNow >= startTime && timeNow <= endTime) return 'live';
    if (timeNow >= startingSoonTime && timeNow < startTime) return 'starting';
    return 'scheduled';
  };

  // Compute countdown text explicitly
  const getCountdownText = (m) => {
    const { startTime } = parseMeetingTimes(m);
    const diffMs = startTime - timeNow;
    if (diffMs <= 0) return '';
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    
    if (diffHours > 24) {
      const days = Math.floor(diffHours / 24);
      return `Starts in ${days} day${days > 1 ? 's' : ''}`;
    }
    if (diffHours > 0) return `Starts in ${diffHours} hr ${diffMins % 60} min`;
    if (diffMins > 0) return `Starts in ${diffMins} min`;
    return 'Starting now';
  };

  // Filter out cancelled by default unless searched
  const activeMeetings = meetings.filter(m => {
    if (m.status === 'cancelled') return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return m.title.toLowerCase().includes(term) || m.agenda?.some(a => a.toLowerCase().includes(term));
    }
    return true;
  });

  // Categorize
  const liveMeetings = activeMeetings.filter(m => {
    const s = getMeetingState(m);
    return s === 'live' || s === 'starting';
  });

  const upcomingMeetings = activeMeetings
    .filter(m => getMeetingState(m) === 'scheduled')
    .sort((a, b) => parseMeetingTimes(a).startTime - parseMeetingTimes(b).startTime);

  const completedMeetings = activeMeetings
    .filter(m => getMeetingState(m) === 'completed')
    .sort((a, b) => parseMeetingTimes(b).startTime - parseMeetingTimes(a).startTime);

  const handleInteract = (e, targetUrl) => {
    e.stopPropagation();
    window.open(targetUrl, '_blank');
  };

  // Render Loading/Error
  if (loading) return <div className="h-full flex items-center justify-center bg-gray-50"><RefreshCw className="animate-spin text-indigo-500 w-8 h-8" /></div>;
  if (error) return <div className="h-full flex items-center justify-center text-red-500 font-medium">{error}</div>;

  return (
    <div className="meetings-dashboard-page h-full overflow-y-auto w-full p-4 md:p-8">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Meetings Console</h1>
          <p className="text-gray-500 font-medium mt-1">Real-time status and lifecycle management.</p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search meetings..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
            />
          </div>
          <button 
            onClick={() => navigate('/dashboard/schedule-meeting')}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition-transform active:scale-95 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" /> New Meeting
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* Left Column (Priority: Live & Upcoming) */}
        <div className="xl:col-span-2 space-y-8">
          
          {/* LIVE MEETINGS */}
          {liveMeetings.length > 0 && (
            <section className="animate-fadeIn">
              <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span> Action Required Now
              </h2>
              <div className="space-y-4">
                {liveMeetings.map(m => (
                  <div 
                    key={m.id} 
                    className="live-card group cursor-pointer"
                    onClick={() => navigate(`/dashboard/meeting/${m.id}`)}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-red-500/5 to-transparent pointer-events-none rounded-2xl"></div>
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-red-500 rounded-l-2xl"></div>
                    
                    <div className="relative p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <span className="px-2.5 py-1 rounded-md bg-red-100 text-red-700 text-xs font-bold uppercase flex items-center gap-1.5 shadow-sm">
                             <div className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse"></div> Live
                          </span>
                          <span className="text-gray-500 text-xs font-semibold">{m.time} • {m.duration}m</span>
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">{m.title}</h3>
                        <p className="text-sm text-gray-500 font-medium flex items-center gap-1 mt-1"><Users className="w-3.5 h-3.5" /> {m.attendees?.length || 0} participants pending</p>
                      </div>

                      <div className="flex items-center gap-3 w-full md:w-auto">
                        <button 
                          onClick={(e) => handleInteract(e, m.joinUrl)}
                          className="flex-1 md:flex-none flex justify-center items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md transition-all active:scale-95"
                        >
                          <Play className="w-4 h-4 fill-current" /> Join Now
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* UPCOMING MEETINGS */}
          <section>
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Calendar className="w-4 h-4" /> Upcoming Events
            </h2>
            
            {upcomingMeetings.length === 0 ? (
              <div className="bg-gray-50 border border-dashed border-gray-200 rounded-2xl p-8 text-center">
                <p className="text-gray-500 font-medium">No upcoming meetings scheduled.</p>
                <button onClick={() => navigate('/dashboard/schedule-meeting')} className="mt-2 text-indigo-600 font-bold hover:underline text-sm">Schedule one now</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {upcomingMeetings.map(m => (
                  <div 
                    key={m.id}
                    onClick={() => navigate(`/dashboard/meeting/${m.id}`)}
                    className="upcoming-card bg-white border border-gray-200 hover:border-indigo-300 rounded-2xl p-5 cursor-pointer transition-all hover:shadow-md group relative overflow-hidden"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="bg-indigo-50 text-indigo-700 text-xs font-bold px-2 py-1 rounded-md">{m.date}</div>
                      <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded-md">{getCountdownText(m)}</span>
                    </div>
                    <h3 className="text-base font-bold text-gray-900 mb-1 group-hover:text-indigo-600 transition-colors line-clamp-1">{m.title}</h3>
                    <div className="flex items-center gap-3 text-sm text-gray-500 font-medium mt-3">
                      <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-indigo-400" /> {m.time}</span>
                      <span className="flex items-center gap-1.5"><Video className="w-4 h-4 text-indigo-400" /> {m.platform}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

        </div>

        {/* Right Column (History / Completed) */}
        <div>
          <section className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm sticky top-6">
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-5 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> Previous & Analytics
            </h2>
            
            {completedMeetings.length === 0 ? (
              <p className="text-sm text-gray-500 italic text-center py-4">No completed meetings found.</p>
            ) : (
              <div className="space-y-4">
                {completedMeetings.slice(0, 5).map(m => (
                  <div 
                    key={m.id}
                    className="flex flex-col gap-2 p-3 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100 cursor-pointer"
                    onClick={() => navigate(`/dashboard/meeting/${m.id}`)}
                  >
                    <div className="flex justify-between items-start">
                      <h4 className="text-sm font-bold text-gray-900 line-clamp-1 flex-1">{m.title}</h4>
                      <span className="text-[10px] font-semibold text-gray-400 ml-2">{m.date}</span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-gray-500 font-medium flex items-center gap-1">
                         <Users className="w-3 h-3" /> {m.attendees?.length || 0}
                      </span>
                      <button 
                        onClick={(e) => { e.stopPropagation(); navigate('/dashboard/mom'); }}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 bg-indigo-50 px-2 py-1 rounded"
                      >
                         <FileText className="w-3 h-3" /> MOM Ready <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
                
                {completedMeetings.length > 5 && (
                  <button className="w-full text-center text-xs font-bold text-gray-500 hover:text-indigo-600 pt-3 border-t border-gray-100 transition-colors">
                    View All History
                  </button>
                )}
              </div>
            )}
          </section>
        </div>

      </div>
    </div>
  );
};

export default MeetingsDashboardPage;
