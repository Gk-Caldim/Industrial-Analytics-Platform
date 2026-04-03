import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Mic, Upload, X, Play, Pause, Square, FileText, FileUp, CornerDownLeft, Plus
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

// ── Speaker colour palette ──────────────────────────────────────────
const SPEAKER_COLORS = [
  { bg: '#EDE9FE', text: '#6D28D9', dot: '#7C3AED' },
  { bg: '#DBEAFE', text: '#1D4ED8', dot: '#2563EB' },
  { bg: '#D1FAE5', text: '#065F46', dot: '#059669' },
  { bg: '#FEE2E2', text: '#991B1B', dot: '#DC2626' },
  { bg: '#FEF3C7', text: '#92400E', dot: '#D97706' },
];

const EVENT_STYLES = {
  Discussion:    { dot: '#D97706', label: 'text-amber-600' },
  Decisions:     { dot: '#2563EB', label: 'text-blue-600'  },
  'Action Items':{ dot: '#059669', label: 'text-green-600' },
};

function getInitials(name) {
  if (!name) return '??';
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

function nowTime() {
  return new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

// ── Check browser support ───────────────────────────────────────────
const SpeechRecognition = typeof window !== 'undefined'
  ? window.SpeechRecognition || window.webkitSpeechRecognition
  : null;

// ── CSRF token helper ───────────────────────────────────────────────
function getCookie(name) {
  const match = document.cookie.match(new RegExp('(^|;)\\s*' + name + '\\s*=\\s*([^;]+)'));
  return match ? match[2] : '';
}

// ── Structured transcript file parser ──────────────────────────────
function parseTranscriptFile(rawText) {
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
  const entries = [];
  let currentEntry = null;

  for (const line of lines) {
    // [10:00 AM] John Smith: text...
    const full = line.match(/\[?(\d{1,2}:\d{2}\s?[AP]M)\]?\s+([^:]+):\s+(.+)/);
    if (full) {
      if (currentEntry) entries.push(currentEntry);
      currentEntry = { type: 'speech', time: full[1], speaker: full[2].trim(), text: full[3].trim() };
      continue;
    }

    // Gokul (00:07): text...
    const timeInParen = line.match(/^([A-Za-z0-9\s]+?)\s*\(([\d:]+)\):\s+(.+)/);
    if (timeInParen) {
      if (currentEntry) entries.push(currentEntry);
      currentEntry = { type: 'speech', time: timeInParen[2], speaker: timeInParen[1].trim(), text: timeInParen[3].trim() };
      continue;
    }

    // Gokul: text... (no timestamp, allows single names)
    const speakerOnly = line.match(/^([A-Za-z0-9][A-Za-z0-9\s]*):\s+(.+)/);
    if (speakerOnly && speakerOnly[1].length < 40) { // prevent matching long sentences ending in colon
      if (currentEntry) entries.push(currentEntry);
      currentEntry = { type: 'speech', time: null, speaker: speakerOnly[1].trim(), text: speakerOnly[2].trim() };
      continue;
    }

    const lower = line.toLowerCase();

    if (lower.startsWith('decision')) {
      if (currentEntry) entries.push(currentEntry);
      currentEntry = { type: 'decision', text: line.replace(/^decisions?:?\s*/i, '').trim() };
      continue;
    }
    if (lower.startsWith('action item')) {
      if (currentEntry) entries.push(currentEntry);
      currentEntry = { type: 'action', text: line.replace(/^action items?:?\s*/i, '').trim() };
      continue;
    }
    if (lower.startsWith('discussion')) {
      if (currentEntry) entries.push(currentEntry);
      currentEntry = { type: 'discussion', text: line.replace(/^discussion:?\s*/i, '').trim() };
      continue;
    }
    if (lower.includes('adjourned')) {
      if (currentEntry) entries.push(currentEntry);
      entries.push({ type: 'adjourned', text: 'Meeting adjourned' });
      currentEntry = null;
      continue;
    }

    // Continuation / bullet
    if (currentEntry) {
      currentEntry.text += ' ' + line.replace(/^[-•]\s*/, '');
    }
  }

  if (currentEntry) entries.push(currentEntry);
  return entries;
}

// ════════════════════════════════════════════════════════════════════
const SpeechToText = ({ onProcessSpeech, switchToTable }) => {
  const { user } = useAuth();

  // Derive current user info — pulled from auth context, never hardcoded
  const currentUser = useMemo(() => {
    const name = user?.full_name || user?.name || user?.username || user?.email || '';
    // If we still have nothing, try sessionStorage directly
    const storedUser = (() => { try { return JSON.parse(sessionStorage.getItem('user') || 'null'); } catch { return null; } })();
    const resolvedName = name || storedUser?.full_name || storedUser?.name || storedUser?.username || 'Unknown';
    return {
      name: resolvedName,
      initials: getInitials(resolvedName),
      avatarColor: SPEAKER_COLORS[0],
    };
  }, [user]);

  // ── Config state ────────────────────────────────────────────────
  const [meetingTitle, setMeetingTitle] = useState('');
  const [attendees, setAttendees] = useState([]);
  const [attendeeInput, setAttendeeInput] = useState('');
  const [mode, setMode] = useState('live'); // 'live' | 'upload'

  // ── Recording state ─────────────────────────────────────────────
  const [recordingState, setRecordingState] = useState('IDLE');
  const [micError, setMicError] = useState(''); // user-visible mic error
  const [timerVal, setTimerVal] = useState(0);
  const timerRef = useRef(null);

  // ── Transcript state ───────────────────────────────────────────────
  const [entries, setEntries] = useState([]);
  const [interimText, setInterimText] = useState('');
  const [hasUploadedTranscript, setHasUploadedTranscript] = useState(false);
  const [isAddingPoints, setIsAddingPoints] = useState(false);
  const [failedEntryIds, setFailedEntryIds] = useState(new Set()); // IDs of entries that failed to save
  const transcriptRef = useRef(null);

  // ── Speaker colour map ──────────────────────────────────────────
  const speakerColorMapRef = useRef({});
  const getSpeakerColor = (name) => {
    if (speakerColorMapRef.current[name] === undefined) {
      const idx = Object.keys(speakerColorMapRef.current).length % SPEAKER_COLORS.length;
      speakerColorMapRef.current[name] = idx;
    }
    return SPEAKER_COLORS[speakerColorMapRef.current[name]];
  };

  // ── Speech recognition ref ──────────────────────────────────────
  const recognitionRef = useRef(null);
  const manualStopRef = useRef(false);      // true when user explicitly stops
  const retryTimeoutRef = useRef(null);     // for auto-retry on network errors

  // ── Debounce buffer for sentence accuracy ───────────────────────
  const bufferRef = useRef('');             // accumulates final text
  const debounceTimerRef = useRef(null);
  const isAddingPointsRef = useRef(false);  // track inside callbacks

  // Keep isAddingPointsRef in sync
  useEffect(() => { isAddingPointsRef.current = isAddingPoints; }, [isAddingPoints]);

  // ── Meeting ID for backend saves ──────────────────────────────────
  const meetingIdRef = useRef(null);

  const ensureMeeting = async () => {
    if (meetingIdRef.current) return meetingIdRef.current;
    try {
      const res = await fetch('/api/meetings/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: meetingTitle || 'Untitled meeting',
          attendees: attendees.join(', '),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        meetingIdRef.current = data.id;
        return data.id;
      }
    } catch (err) {
      console.warn('Could not create meeting on backend:', err);
    }
    return null;
  };

  // ── Backend save: fire-and-forget, marks failed entries ──────────
  const saveToBackend = (entry) => {
    ensureMeeting().then(meetingId => {
      if (!meetingId) return;
      fetch(`/api/meetings/${meetingId}/entries/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCookie('csrftoken'),
        },
        body: JSON.stringify(entry),
      }).catch(() => {
        // Mark this entry with a retry dot
        setFailedEntryIds(prev => new Set([...prev, entry.id]));
      });
    });
  };

  const retryEntry = (entry) => {
    setFailedEntryIds(prev => { const next = new Set(prev); next.delete(entry.id); return next; });
    saveToBackend(entry);
  };

  const flushBuffer = () => {
    clearTimeout(debounceTimerRef.current);
    const text = bufferRef.current.trim();
    bufferRef.current = '';
    // Require at least 2 words before committing, unless force-flushed
    if (!text) return;
    const wordCount = text.split(/\s+/).length;
    if (wordCount < 2 && !forceFlushRef.current) {
      bufferRef.current = text; // put back
      return;
    }
    forceFlushRef.current = false;

    const color = getSpeakerColor(currentUser.name);
    const entry = {
      id: Date.now() + Math.random(),
      type: 'speech',
      speaker: currentUser.name,
      initials: currentUser.initials,
      color: color.dot,
      bg: color.bg,
      textColor: color.text,
      time: nowTime(),
      text,
      isAdditional: isAddingPointsRef.current,
    };
    // ① Optimistic UI — add to state IMMEDIATELY, no waiting
    setEntries(prev => [...prev, entry]);
    setInterimText('');
    // ② Fire-and-forget backend save (non-blocking)
    saveToBackend(entry);
  };

  // Force-flush flag (set true before manual stop so 2-word minimum is skipped)
  const forceFlushRef = useRef(false);

  const scheduleDebouncedFlush = (text) => {
    clearTimeout(debounceTimerRef.current);
    // Immediate commit if sentence ends with . ? !
    if (/[.?!]\s*$/.test(text)) {
      debounceTimerRef.current = setTimeout(() => flushBuffer(), 50);
    } else {
      // 400ms — fast enough to feel instant, enough to catch next word
      debounceTimerRef.current = setTimeout(() => flushBuffer(), 400);
    }
  };

  // ── Waveform ────────────────────────────────────────────────────
  const [waveHeights, setWaveHeights] = useState(Array(7).fill(4));
  useEffect(() => {
    let interval;
    if (recordingState === 'RECORDING') {
      interval = setInterval(() => {
        setWaveHeights(Array.from({ length: 7 }, () => Math.round(4 + Math.random() * 18)));
      }, 120);
    } else {
      setWaveHeights(Array(7).fill(4));
    }
    return () => clearInterval(interval);
  }, [recordingState]);

  // ── Timer ───────────────────────────────────────────────────────
  useEffect(() => {
    if (recordingState === 'RECORDING') {
      timerRef.current = setInterval(() => setTimerVal(p => p + 1), 100);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [recordingState]);

  // ── Auto-scroll ─────────────────────────────────────────────────
  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [entries, interimText]);

  // ── Keyboard shortcuts ──────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

      if (e.code === 'Space') {
        e.preventDefault();
        toggleRecord();
      }
      if (e.code === 'KeyP' && recordingState !== 'IDLE') {
        e.preventDefault();
        togglePause();
      }
      if (e.ctrlKey && e.code === 'Enter') {
        e.preventDefault();
        handleConvert();
      }
      if (e.ctrlKey && e.code === 'Backspace') {
        e.preventDefault();
        handleClear();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [recordingState, entries]);

  // ── Format timer ────────────────────────────────────────────────
  const formatTime = (d) => {
    const s = Math.floor(d / 10);
    return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
  };

  const getStatusColor = () => {
    if (recordingState === 'RECORDING') return 'bg-[#E24B4A]';
    if (recordingState === 'PAUSED') return 'bg-[#BA7517]';
    return 'bg-gray-400';
  };

  const getStatusText = () => {
    if (micError) return micError;
    if (recordingState === 'RECORDING') return 'Listening...';
    if (recordingState === 'PAUSED') return 'Paused';
    return 'Ready';
  };

  // ── Cleanup on unmount ──────────────────────────────────────────
  useEffect(() => {
    return () => {
      clearTimeout(retryTimeoutRef.current);
      clearTimeout(debounceTimerRef.current);
      if (recognitionRef.current) {
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onresult = null;
        try { recognitionRef.current.stop(); } catch (_) {}
      }
    };
  }, []);

  // ── Init recognition ────────────────────────────────────────────
  const initRecognition = () => {
    if (!SpeechRecognition) return null;

    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';

    rec.maxAlternatives = 1;

    // ── onresult: only commit on isFinal, punctuation-aware debounce ──
    rec.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          const trimmed = transcript.trim();
          if (trimmed) {
            bufferRef.current += (bufferRef.current ? ' ' : '') + trimmed;
            scheduleDebouncedFlush(bufferRef.current);
          }
          setInterimText('');
        } else {
          interim += transcript;
        }
      }
      if (interim) setInterimText(interim);
    };

    // ── onerror: per-error handling ──
    rec.onerror = (e) => {
      if (e.error !== 'no-speech') {
        console.warn('SpeechRecognition error:', e.error);
      }

      switch (e.error) {
        case 'no-speech':
          // Silent — browser heard nothing, auto-restart will handle it
          break;

        case 'network':
          // Auto retry after 1.5s
          setMicError('Network error, retrying...');
          clearTimeout(retryTimeoutRef.current);
          retryTimeoutRef.current = setTimeout(() => {
            setMicError('');
            if (!manualStopRef.current && recognitionRef.current) {
              try { recognitionRef.current.start(); } catch (_) {}
            }
          }, 1500);
          break;

        case 'not-allowed':
        case 'service-not-allowed':
          setMicError('Allow mic permission and retry');
          manualStopRef.current = true;
          setRecordingState('IDLE');
          break;

        case 'aborted':
          // Usually caused by us calling .stop(), ignore
          break;

        default:
          console.error('Unhandled speech error:', e.error);
          break;
      }
    };

    // ── onend: auto-restart unless user stopped manually ──
    rec.onend = () => {
      if (manualStopRef.current) return;
      // 300ms delay before restarting (avoids rapid-fire restarts)
      setTimeout(() => {
        if (!manualStopRef.current && recognitionRef.current) {
          try { recognitionRef.current.start(); } catch (_) {}
        }
      }, 300);
    };

    return rec;
  };

  // ── Helper: stop recognition + flush buffer ─────────────────────
  const stopAndFlush = () => {
    manualStopRef.current = true;
    forceFlushRef.current = true;   // bypass 3-word minimum on manual stop
    clearTimeout(retryTimeoutRef.current);
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      try { recognitionRef.current.stop(); } catch (_) {}
      recognitionRef.current = null;
    }
    // Flush any buffered text immediately (don't wait for debounce)
    flushBuffer();
    setInterimText('');
  };

  // ── Actions ─────────────────────────────────────────────────────
  const toggleRecord = () => {
    if (!SpeechRecognition) return;

    if (recordingState === 'IDLE') {
      manualStopRef.current = false;
      setMicError('');
      const rec = initRecognition();
      recognitionRef.current = rec;
      try { rec.start(); } catch (_) {}
      setRecordingState('RECORDING');
    } else {
      // Stop — flush buffer immediately
      stopAndFlush();
      setRecordingState('IDLE');
    }
  };

  const togglePause = () => {
    if (recordingState === 'RECORDING') {
      stopAndFlush();
      setRecordingState('PAUSED');
    } else if (recordingState === 'PAUSED') {
      manualStopRef.current = false;
      setMicError('');
      const rec = initRecognition();
      recognitionRef.current = rec;
      try { rec.start(); } catch (_) {}
      setRecordingState('RECORDING');
    }
  };

  const handleClear = () => {
    stopAndFlush();
    setRecordingState('IDLE');
    setTimerVal(0);
    setEntries([]);
    setInterimText('');
    setMicError('');
    setHasUploadedTranscript(false);
    setIsAddingPoints(false);
    speakerColorMapRef.current = {};
  };

  const handleConvert = () => {
    if (entries.length === 0 && !bufferRef.current.trim()) return;
    stopAndFlush(); // flush remaining buffer
    setRecordingState('IDLE');

    // Use latest entries (including just-flushed)
    setTimeout(() => {
      setEntries(currentEntries => {
        const speechEntries = currentEntries.filter(e => e.type === 'speech');
        const fullText = speechEntries.map(e => e.text).join(' ');
        const additionalText = speechEntries.filter(e => e.isAdditional).map(e => e.text).join(' ');

        onProcessSpeech([{
          id: Date.now(),
          s_no: '1',
          function: 'General',
          project_name: meetingTitle || 'Untitled meeting',
          criticality: 'High',
          discussion_point: fullText || 'No context recorded.',
          responsibility: attendees.join(', ') || currentUser.name,
          target: new Date().toLocaleDateString(),
          status: 'Pending',
          action_taken: additionalText ? `Additional: ${additionalText}` : 'None',
        }]);
        switchToTable();
        return currentEntries; // don't mutate
      });
    }, 50); // tiny delay to let flush setState complete
  };

  // ── File upload (txt / doc / json) — uses structured parser ──────
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const ext = file.name.split('.').pop().toLowerCase();
    const reader = new FileReader();
    reader.onload = (ev) => {
      let rawText = '';
      if (ext === 'json') {
        try {
          const json = JSON.parse(ev.target.result);
          rawText = typeof json === 'string' ? json : JSON.stringify(json, null, 2);
        } catch (_) {
          rawText = 'Error parsing JSON file';
        }
      } else {
        rawText = ev.target.result;
      }

      const parsed = parseTranscriptFile(rawText);
      const uploadTime = nowTime();

      const uploadedEntries = parsed.map((p, i) => {
        if (p.type === 'adjourned') {
          return { id: Date.now() + i, type: 'adjourned', time: p.time || uploadTime, text: 'Meeting adjourned', isAdditional: false };
        }
        // Map decision/action/discussion → event-style entries
        if (p.type === 'decision' || p.type === 'action' || p.type === 'discussion') {
          const labelMap = { decision: 'Decisions', action: 'Action Items', discussion: 'Discussion' };
          const es = EVENT_STYLES[labelMap[p.type]] || { dot: '#6B7280', label: 'text-gray-500' };
          return { id: Date.now() + i, type: 'event', label: labelMap[p.type], time: p.time || uploadTime, text: p.text, dot: es.dot, labelClass: es.label, isAdditional: false };
        }
        // Speaker speech entries
        const speakerName = p.speaker || 'Transcript';
        const color = getSpeakerColor(speakerName);
        return {
          id: Date.now() + i,
          type: 'speech',
          speaker: speakerName,
          initials: getInitials(speakerName),
          color: color.dot,
          bg: color.bg,
          textColor: color.text,
          time: p.time || uploadTime,
          text: p.text,
          isAdditional: false,
        };
      });

      setEntries(uploadedEntries);
      setHasUploadedTranscript(true);
      setIsAddingPoints(false);
    };
    reader.readAsText(file);
  };

  // ── Start adding points after upload ────────────────────────────
  const handleAddPoints = () => {
    if (!SpeechRecognition) return;

    // Insert a divider entry
    setEntries(prev => [...prev, {
      id: Date.now(),
      type: 'divider',
      speaker: currentUser.name,
      initials: '',
      color: '',
      bg: '',
      textColor: '',
      time: nowTime(),
      text: `Additional points — ${currentUser.name} · ${new Date().toLocaleString('en-IN')}`,
      isAdditional: true,
    }]);

    setIsAddingPoints(true);

    // Start recording
    const rec = initRecognition();
    recognitionRef.current = rec;
    try { rec.start(); } catch (_) {}
    setRecordingState('RECORDING');
  };

  // ── Unique speakers for legend ──────────────────────────────────
  const uniqueSpeakers = useMemo(() => {
    const set = new Set();
    entries.forEach(e => { if (e.type === 'speech') set.add(e.speaker); });
    return [...set];
  }, [entries]);

  // ══════════════════════════════════════════════════════════════════
  return (
    <div className="max-w-6xl mx-auto space-y-4">
      {/* CSS keyframes */}
      <style>{`
        @keyframes ripple {
          0% { transform: scale(0.85); opacity: 0.4; }
          100% { transform: scale(1.25); opacity: 0; }
        }
        .animate-ripple { animation: ripple 1.6s infinite ease-out; }
        @keyframes pulse-dot { 0%,100%{opacity:1} 50%{opacity:.4} }
        .animate-pulse-dot { animation: pulse-dot 1.2s infinite; }
      `}</style>

      {/* ── METADATA BAR ── */}
      <div className="bg-white rounded-xl border border-black/10 overflow-hidden flex flex-col sm:flex-row items-center divide-y sm:divide-y-0 sm:divide-x divide-gray-200">
        <input
          type="text"
          placeholder="Untitled meeting"
          value={meetingTitle}
          onChange={(e) => setMeetingTitle(e.target.value)}
          className="w-full sm:w-1/3 px-4 py-3 text-xs focus:outline-none placeholder-gray-400"
        />
        <div className="w-full sm:w-1/4 px-4 py-3 text-xs text-gray-500 whitespace-nowrap bg-gray-50/50">
          {new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
        </div>
        <div className="w-full flex-1 px-4 py-2 flex items-center flex-wrap gap-2">
          {attendees.map((att, i) => (
            <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-[10px] uppercase tracking-wider font-medium text-gray-700 border border-gray-200">
              {att}
              <button className="ml-1 text-gray-500 hover:text-red-500" onClick={() => setAttendees(attendees.filter((_, idx) => idx !== i))}>
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          <input
            type="text"
            placeholder="+ Add attendee"
            value={attendeeInput}
            onChange={(e) => setAttendeeInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && attendeeInput.trim()) {
                setAttendees([...attendees, attendeeInput.trim()]);
                setAttendeeInput('');
              }
            }}
            className="text-xs w-24 py-1 focus:outline-none placeholder-gray-400"
          />
        </div>
      </div>

      {/* ── MODE SELECTOR ── */}
      <div className="flex gap-2">
        <button
          onClick={() => setMode('live')}
          className={`flex-1 py-2 text-xs font-medium rounded-xl transition-colors flex items-center justify-center gap-2 ${
            mode === 'live' ? 'bg-[#1e2a3a] text-white border border-[#1e2a3a]' : 'bg-transparent text-gray-600 border border-black/10 hover:bg-gray-50/50'
          }`}
        >
          <Mic className="w-3.5 h-3.5" />
          Live mic
        </button>
        <button
          onClick={() => setMode('upload')}
          className={`flex-1 py-2 text-xs font-medium rounded-xl transition-colors flex items-center justify-center gap-2 ${
            mode === 'upload' ? 'bg-[#1e2a3a] text-white border border-[#1e2a3a]' : 'bg-transparent text-gray-600 border border-black/10 hover:bg-gray-50/50'
          }`}
        >
          <Upload className="w-3.5 h-3.5" />
          Upload file
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 items-start">
        {/* ── LEFT COLUMN ── */}
        <div className="flex-1 space-y-4 w-full">

          {/* DYNAMIC CARD */}
          {mode === 'live' ? (
            !SpeechRecognition ? (
              /* Fallback for unsupported browsers */
              <div className="bg-white border border-black/10 rounded-xl p-8 flex flex-col items-center justify-center min-h-[260px]">
                <Mic className="w-8 h-8 text-gray-300 mb-3" />
                <p className="text-sm font-medium text-slate-700 mb-1">Browser not supported</p>
                <p className="text-xs text-gray-500 text-center max-w-xs">
                  Live mic requires Chrome or Edge. Upload a transcript file instead.
                </p>
              </div>
            ) : (
              <div className="bg-white border border-black/10 rounded-xl p-6 flex flex-col items-center relative overflow-hidden">
                <div className="absolute top-4 right-4 flex items-center gap-1.5">
                  <span className="text-[10px] uppercase font-medium tracking-wider text-gray-500">{getStatusText()}</span>
                  <div className={`w-2 h-2 rounded-full ${getStatusColor()} ${recordingState === 'RECORDING' ? 'animate-pulse-dot' : ''}`} />
                </div>

                <div className="mt-6 mb-8 flex flex-col items-center">
                  <div className="relative">
                    {recordingState === 'RECORDING' && (
                      <div className="absolute inset-0 rounded-full border border-[#E24B4A] animate-ripple" />
                    )}
                    <button
                      onClick={toggleRecord}
                      className={`w-[72px] h-[72px] rounded-full border border-black/10 flex items-center justify-center bg-white z-10 relative transition-colors ${
                        recordingState === 'RECORDING' ? 'border-[#E24B4A]' : recordingState === 'PAUSED' ? 'border-[#BA7517]' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className={`h-4 flex items-center gap-[2px] transition-opacity duration-300 ${recordingState === 'IDLE' ? 'opacity-30' : 'opacity-100'}`}>
                        {waveHeights.map((h, i) => (
                          <div key={i} className={`w-[2px] rounded-full transition-all duration-100 ease-in-out ${
                            recordingState === 'RECORDING' ? 'bg-[#E24B4A]' : recordingState === 'PAUSED' ? 'bg-[#BA7517]' : 'bg-gray-400'
                          }`} style={{ height: recordingState === 'IDLE' ? '4px' : `${h}px` }} />
                        ))}
                      </div>
                    </button>
                  </div>

                  <div className="text-[28px] tabular-nums text-slate-800 font-normal mt-5 tracking-wide">
                    {formatTime(timerVal)}
                  </div>

                  <div className={`h-5 mt-1 flex items-center gap-1.5 transition-opacity duration-300 ${recordingState === 'RECORDING' ? 'opacity-100' : 'opacity-0'}`}>
                    <div className="w-2 h-2 rounded-full bg-[#E24B4A] animate-pulse-dot" />
                    <span className="text-[10px] text-gray-500 font-medium">Recording</span>
                  </div>
                </div>

                <div className="flex w-full divide-x divide-gray-200 border-t border-black/10">
                  <button onClick={togglePause} className="flex-1 py-3 text-xs text-center text-gray-500 hover:bg-gray-50 flex items-center justify-center gap-1.5 transition-colors">
                    {recordingState === 'PAUSED' ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                    {recordingState === 'PAUSED' ? 'Resume' : 'Pause'}
                  </button>
                  <button onClick={handleClear} className="flex-1 py-3 text-xs text-center text-red-600 hover:bg-gray-50 flex items-center justify-center gap-1.5 transition-colors">
                    <Square className="w-3.5 h-3.5" />
                    Clear
                  </button>
                  <button onClick={handleConvert} className="flex-1 py-3 text-xs font-medium text-center text-blue-600 hover:bg-gray-50 flex items-center justify-center gap-1.5 transition-colors">
                    <CornerDownLeft className="w-3.5 h-3.5" />
                    Convert
                  </button>
                </div>
              </div>
            )
          ) : (
            <div className="bg-white border border-black/10 rounded-xl p-8 flex flex-col items-center justify-center relative overflow-hidden min-h-[280px]">
              <div className="w-16 h-16 bg-gray-50 border border-gray-200 rounded-full flex items-center justify-center mb-4">
                <Upload className="w-6 h-6 text-gray-400" />
              </div>
              <h3 className="text-sm font-medium text-slate-800 mb-2">Upload Transcript</h3>
              <p className="text-xs text-gray-500 mb-6 text-center max-w-xs">Upload your meeting transcript to generate minutes. Supports .txt, .doc, and .json files.</p>

              <label className="px-6 py-2 bg-slate-800 text-white text-xs font-medium rounded-lg hover:bg-slate-700 transition-colors cursor-pointer flex items-center gap-2">
                <FileUp className="w-3.5 h-3.5" />
                Select file
                <input type="file" className="hidden" accept=".txt,.doc,.json" onChange={handleFileUpload} />
              </label>

              {entries.length > 0 && (
                <div className="flex items-center gap-2 mt-4">
                  <button onClick={handleConvert} className="px-6 py-2 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2">
                    <CornerDownLeft className="w-3.5 h-3.5" />
                    Process uploaded text
                  </button>
                  {hasUploadedTranscript && SpeechRecognition && !isAddingPoints && (
                    <button onClick={handleAddPoints} className="px-4 py-2 bg-white text-slate-700 text-xs font-medium rounded-lg border border-black/10 hover:bg-gray-50 transition-colors flex items-center gap-2">
                      <Plus className="w-3.5 h-3.5" />
                      Add points via mic
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── RIGHT COLUMN ── */}
        <div className="w-full lg:w-72 space-y-4 flex-shrink-0">
          {/* Stats */}
          <div className="bg-white border border-black/10 rounded-xl p-4 grid grid-cols-3 gap-2">
            <div className="text-center">
              <div className="text-xs text-gray-400 mb-1">Duration</div>
              <div className="text-sm font-medium text-slate-800">{formatTime(timerVal)}</div>
            </div>
            <div className="text-center border-l border-gray-200">
              <div className="text-xs text-gray-400 mb-1">Entries</div>
              <div className="text-sm font-medium text-slate-800">{entries.filter(e => e.type === 'speech').length}</div>
            </div>
            <div className="text-center border-l border-gray-200">
              <div className="text-xs text-gray-400 mb-1">Speakers</div>
              <div className="text-sm font-medium text-slate-800">{uniqueSpeakers.length}</div>
            </div>
          </div>

          {/* Shortcuts */}
          <div className="bg-white border border-black/10 rounded-xl p-4">
            <div className="text-[10px] uppercase font-medium tracking-wider text-gray-500 mb-3">Shortcuts</div>
            <div className="space-y-2 text-xs font-normal text-slate-600">
              <div className="flex justify-between">
                <span>Start / Stop</span>
                <kbd className="px-1.5 text-[10px] bg-gray-100 border border-gray-200 rounded text-gray-500 font-medium">Space</kbd>
              </div>
              <div className="flex justify-between">
                <span>Pause</span>
                <kbd className="px-1.5 text-[10px] bg-gray-100 border border-gray-200 rounded text-gray-500 font-medium">P</kbd>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span>Convert</span>
                <kbd className="px-1.5 text-xs bg-gray-100 border border-gray-200 rounded text-gray-500 font-medium">{"\u2303\u21B5"}</kbd>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span>Clear</span>
                <kbd className="px-1.5 text-xs bg-gray-100 border border-gray-200 rounded text-gray-500 font-medium">{"\u2303\u232B"}</kbd>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          TRANSCRIPT PANEL — FULL WIDTH
         ══════════════════════════════════════════════════════════════ */}
      <div className="bg-white border border-black/10 rounded-xl flex flex-col mt-4" style={{ minHeight: '340px', maxHeight: '520px' }}>

        {/* Header */}
        <div className="flex justify-between items-center py-2 px-4 border-b border-black/10 flex-shrink-0">
          <span className="text-xs font-medium text-slate-800">Live transcript</span>
          <span className="text-[10px] font-medium text-gray-500">{entries.filter(e => e.type === 'speech').length} entries</span>
        </div>

        {/* Speaker legend */}
        {uniqueSpeakers.length > 0 && (
          <div className="flex flex-wrap gap-3 px-4 py-2 border-b border-black/[0.04] bg-gray-50/60 flex-shrink-0">
            {uniqueSpeakers.map((name) => {
              const c = getSpeakerColor(name);
              return (
                <div key={name} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: c.dot }} />
                  <span className="text-[10px] font-medium" style={{ color: c.text }}>{name}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Timeline scroll area */}
        <div ref={transcriptRef} className="flex-1 overflow-y-auto">
          {entries.length === 0 && !interimText ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 py-12">
              <FileText className="w-6 h-6 mb-2 opacity-40" />
              <span className="text-[10px] uppercase font-medium tracking-wider">Ready to transcribe</span>
            </div>
          ) : (
            <div>
              {entries.map((entry, i) => {
                const isLast = i === entries.length - 1 && !interimText;

                if (entry.type === 'divider') {
                  return (
                    <div key={entry.id} className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: '0.5px solid rgba(0,0,0,0.06)' }}>
                      <div className="flex-1 h-px bg-gray-200" />
                      <span className="text-[10px] font-medium text-gray-400 whitespace-nowrap">{entry.text}</span>
                      <div className="flex-1 h-px bg-gray-200" />
                    </div>
                  );
                }

                if (entry.type === 'speech') {
                  const c = getSpeakerColor(entry.speaker);
                  return (
                    <div key={entry.id} className="flex" style={{ borderBottom: '0.5px solid rgba(0,0,0,0.06)' }}>
                      <div className="flex-shrink-0 flex items-start pt-3 pb-3" style={{ width: 72, paddingLeft: 16 }}>
                        <span className="font-mono text-[10px] text-gray-400">{entry.time}</span>
                      </div>
                      <div className="flex-shrink-0 flex flex-col items-center" style={{ width: 24 }}>
                        <div className="flex-1 w-px bg-gray-100" style={{ minHeight: 12 }} />
                        <div className="flex-shrink-0 rounded-full flex items-center justify-center font-medium"
                          style={{ width: 22, height: 22, background: c.bg, color: c.text, fontSize: 9 }}>
                          {entry.initials}
                        </div>
                        {!isLast && <div className="flex-1 w-px bg-gray-100" />}
                      </div>
                      <div className="flex-1 py-3 pl-3 pr-4 relative group">
                        <div className="flex justify-between items-start mb-0.5">
                          <div className="font-medium" style={{ fontSize: 11, color: c.text }}>{entry.speaker}</div>
                          {failedEntryIds.has(entry.id) && (
                            <button
                              onClick={() => retryEntry(entry)}
                              title="Failed to save to backend. Click to retry."
                              className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#FEF2F2] text-[#DC2626] border border-[#FEE2E2] hover:bg-[#FEE2E2] transition-colors"
                            >
                              <div className="w-1.5 h-1.5 rounded-full bg-[#DC2626]" />
                              <span className="text-[10px] font-medium">Retry save</span>
                            </button>
                          )}
                        </div>
                        <div className="text-slate-700 leading-relaxed" style={{ fontSize: 13 }}>{entry.text}</div>
                      </div>
                    </div>
                  );
                }

                return null;
              })}

              {/* Interim / typing indicator */}
              {interimText && (
                <div className="flex" style={{ borderBottom: '0.5px solid rgba(0,0,0,0.06)' }}>
                  <div className="flex-shrink-0 flex items-start pt-3 pb-3" style={{ width: 72, paddingLeft: 16 }}>
                    <span className="font-mono text-[10px] text-gray-300">{nowTime()}</span>
                  </div>
                  <div className="flex-shrink-0 flex flex-col items-center" style={{ width: 24 }}>
                    <div className="flex-1 w-px bg-gray-100" style={{ minHeight: 12 }} />
                    <div className="flex-shrink-0 rounded-full flex items-center justify-center font-medium"
                      style={{ width: 22, height: 22, background: currentUser.avatarColor.bg, color: currentUser.avatarColor.text, fontSize: 9 }}>
                      {currentUser.initials}
                    </div>
                  </div>
                  <div className="flex-1 py-3 pl-3 pr-4">
                    <div className="mb-0.5 font-medium" style={{ fontSize: 11, color: currentUser.avatarColor.text }}>{currentUser.name}</div>
                    <div className="text-gray-400 italic leading-relaxed" style={{ fontSize: 13 }}>{interimText}...</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SpeechToText;