import React, { useState, useEffect, useRef } from 'react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { AudioRecorder } from 'react-audio-voice-recorder';
import axios from 'axios';
import {
  Upload,
  Volume2,
  Play,
  Square,
  Trash2,
  FileAudio,
  X,
  UploadCloud,
  Loader2,
  ScanText,
  FileText,
  MessageSquare,
  Settings,
  Info,
  Monitor,
  Video,
  StopCircle,
  MonitorPlay,
  MessageCircle, // Speech/speaker icon for live speech
  MicOff, // Mic off icon for when not listening
} from 'lucide-react';

const SpeechToText = ({ onProcessSpeech, meetings = [] }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [audioFile, setAudioFile] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [transcriptionMode, setTranscriptionMode] = useState('live'); // 'live', 'upload', or 'screen'
  const [transcript, setTranscript] = useState('');
  const [transcriptionStatus, setTranscriptionStatus] = useState('');
  const [isScreenRecording, setIsScreenRecording] = useState(false);
  const [screenStream, setScreenStream] = useState(null);
  const [screenMediaRecorder, setScreenMediaRecorder] = useState(null);
  const [screenRecordingChunks, setScreenRecordingChunks] = useState([]);
  const [screenRecordingUrl, setScreenRecordingUrl] = useState(null);
  const [screenRecordingFile, setScreenRecordingFile] = useState(null);
  
  const audioRef = useRef(null);

  const {
    transcript: liveTranscript,
    listening,
    resetTranscript: resetLiveTranscript,
    browserSupportsSpeechRecognition,
    isMicrophoneAvailable,
  } = useSpeechRecognition();

  useEffect(() => {
    if (transcriptionMode === 'live') {
      setTranscript(liveTranscript);
    }
  }, [liveTranscript, transcriptionMode]);

  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      if (screenRecordingUrl) {
        URL.revokeObjectURL(screenRecordingUrl);
      }
      if (screenStream) {
        screenStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [audioUrl, screenRecordingUrl, screenStream]);

  const startListening = () => {
    SpeechRecognition.startListening({
      continuous: true,
      language: 'en-US',
      interimResults: true,
    });
  };

  const stopListening = () => {
    SpeechRecognition.stopListening();
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('audio/')) {
      alert('Please upload an audio file (MP3, WAV, M4A, etc.)');
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      alert('File size too large. Please upload audio less than 50MB');
      return;
    }
    
    setAudioFile(file);
    setTranscript('');
    setTranscriptionStatus('');

    if (audioUrl) URL.revokeObjectURL(audioUrl);
    const url = URL.createObjectURL(file);
    setAudioUrl(url);
  };

  const handleAudioRecordingComplete = (blob) => {
    const file = new File([blob], `recording-${Date.now()}.webm`, { type: blob.type });
    setAudioFile(file);
    setTranscript('');
    setTranscriptionStatus('');

    if (audioUrl) URL.revokeObjectURL(audioUrl);
    const url = URL.createObjectURL(blob);
    setAudioUrl(url);
  };

  const removeAudio = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioFile(null);
    setAudioUrl(null);
    setUploadProgress(0);
    setTranscript('');
    setTranscriptionStatus('');
  };

  const removeScreenRecording = () => {
    if (screenRecordingUrl) URL.revokeObjectURL(screenRecordingUrl);
    setScreenRecordingFile(null);
    setScreenRecordingUrl(null);
    setUploadProgress(0);
    setTranscript('');
    setTranscriptionStatus('');
  };

  const startScreenRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'monitor',
          frameRate: 30,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        },
        surfaceSwitching: 'include',
        systemAudio: 'include'
      });

      setScreenStream(stream);
      setIsScreenRecording(true);
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9,opus',
        videoBitsPerSecond: 2500000
      });
      
      const chunks = [];
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        setScreenRecordingUrl(url);
        
        const file = new File([blob], `screen-recording-${Date.now()}.webm`, { type: blob.type });
        setScreenRecordingFile(file);
        setAudioFile(null);
        
        stream.getTracks().forEach(track => track.stop());
        setScreenStream(null);
        setScreenRecordingChunks([]);
      };

      setScreenMediaRecorder(mediaRecorder);
      setScreenRecordingChunks(chunks);
      mediaRecorder.start();

      stream.getVideoTracks()[0].onended = () => {
        if (mediaRecorder.state !== 'inactive') {
          mediaRecorder.stop();
          setIsScreenRecording(false);
        }
      };

    } catch (error) {
      console.error('Error starting screen recording:', error);
      if (error.name !== 'NotAllowedError') {
        alert('Screen recording failed or was cancelled.');
      }
    }
  };

  const stopScreenRecording = () => {
    if (screenMediaRecorder && screenMediaRecorder.state !== 'inactive') {
      screenMediaRecorder.stop();
      setIsScreenRecording(false);
      setScreenMediaRecorder(null);
    }
  };

  const getCurrentFile = () => {
    if (transcriptionMode === 'upload') return audioFile;
    if (transcriptionMode === 'screen') return screenRecordingFile;
    return null;
  };

  const transcribeMedia = async () => {
    const file = getCurrentFile();
    if (!file) {
      alert(`Please ${transcriptionMode === 'screen' ? 'record' : 'upload'} a ${transcriptionMode === 'screen' ? 'screen' : 'audio'} file first`);
      return;
    }

    setIsTranscribing(true);
    setUploadProgress(0);
    setTranscriptionStatus(`Processing ${transcriptionMode}...`);

    try {
      const formData = new FormData();
      formData.append('media', file);
      formData.append('media_type', transcriptionMode);
      formData.append('language', 'en-US');

      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 300);

      const response = await axios.post('/api/transcribe/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 90) / progressEvent.total);
          setUploadProgress(percentCompleted);
        },
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (response.data.success) {
        setTranscript(response.data.transcript);
        setTranscriptionStatus(`${transcriptionMode === 'screen' ? 'Screen' : 'Audio'} transcription completed successfully!`);

        setTimeout(() => {
          processTranscript(response.data.transcript);
        }, 1000);
      } else {
        setTranscriptionStatus('Transcription failed. Please try again.');
      }
    } catch (error) {
      console.error('Transcription error:', error);

      if (error.response?.status === 404 || error.code === 'ERR_NETWORK') {
        setTranscriptionStatus('Using demo transcription (API not configured)');

        const sampleTranscript = `
          We need to update the marketing campaign by next week. John will handle the social media posts.
          The budget needs approval from finance department. The deadline is 15/12/2024.
          Technical team should complete the API integration within 3 days.
          We must prioritize the customer feedback system as it's urgent.
          Design team will present mockups on Friday.
          Marketing needs to prepare the quarterly report by end of month.
          Sales team should follow up with potential clients next week.
          The new product launch is scheduled for next month.
        `;

        setTranscript(sampleTranscript);
        setUploadProgress(100);

        setTimeout(() => {
          processTranscript(sampleTranscript);
        }, 1000);
      } else {
        setTranscriptionStatus('Error transcribing media. Please try again.');
      }
    } finally {
      setIsTranscribing(false);
      setTimeout(() => setUploadProgress(0), 2000);
    }
  };

  const determineCriticality = (text) => {
    const textLower = text.toLowerCase();
    const highPriorityWords = ['urgent', 'critical', 'important', 'asap', 'immediately', 'must', 'essential'];
    const lowPriorityWords = ['optional', 'when possible', 'nice to have', 'low priority', 'not urgent'];

    if (highPriorityWords.some((word) => textLower.includes(word))) return 'high';
    if (lowPriorityWords.some((word) => textLower.includes(word))) return 'low';
    return 'medium';
  };

  const extractResponsibilities = (text) => {
    const teamPatterns = [
      /(?:assign|delegate|responsible)\s+(?:to|for)?\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/g,
      /(?:team|department|group)\s+([A-Z][a-z]+)/g,
    ];

    const responsibilities = new Set();

    teamPatterns.forEach((pattern) => {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach((match) => {
          const name = match.replace(/(assign|delegate|responsible|to|for|team|department|group)\s+/gi, '').trim();
          if (name && name.length > 1) {
            responsibilities.add(name);
          }
        });
      }
    });

    const commonTeams = ['marketing', 'sales', 'finance', 'engineering', 'development', 'design', 'support', 'operations'];
    commonTeams.forEach((team) => {
      if (text.toLowerCase().includes(team)) {
        responsibilities.add(team.charAt(0).toUpperCase() + team.slice(1) + ' Team');
      }
    });

    return responsibilities.size > 0 ? Array.from(responsibilities).join(', ') : 'Team';
  };

  const calculateTargetDate = (text) => {
    const today = new Date();

    const datePatterns = [
      /(?:by|before|until)\s+(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
      /(?:by|before|until)\s+(next\s+\w+)/i,
      /(?:in|within)\s+(\d+)\s+(?:day|week|month)/i,
      /(?:deadline|due)\s+(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
    ];

    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match) {
        try {
          if (match[1].toLowerCase().includes('next week')) {
            today.setDate(today.getDate() + 7);
            return today.toISOString().split('T')[0];
          } else if (match[1].toLowerCase().includes('next month')) {
            today.setMonth(today.getMonth() + 1);
            return today.toISOString().split('T')[0];
          }
          const dateMatch = match[1].match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
          if (dateMatch) {
            let [, month, day, year] = dateMatch;
            year = year.length === 2 ? `20${year}` : year;
            return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          }
        } catch (error) {
          console.error('Date parsing error:', error);
        }
      }
    }

    today.setDate(today.getDate() + 7);
    return today.toISOString().split('T')[0];
  };

  const determineFunction = (text) => {
    const textLower = text.toLowerCase();

    if (textLower.includes('marketing') || textLower.includes('campaign') || textLower.includes('advertisement')) {
      return 'Marketing';
    } else if (textLower.includes('sales') || textLower.includes('customer') || textLower.includes('revenue')) {
      return 'Sales';
    } else if (textLower.includes('engineering') || textLower.includes('technical') || textLower.includes('develop')) {
      return 'Engineering';
    } else if (textLower.includes('finance') || textLower.includes('budget') || textLower.includes('cost')) {
      return 'Finance';
    } else if (textLower.includes('hr') || textLower.includes('human resources') || textLower.includes('employee')) {
      return 'HR';
    } else if (textLower.includes('operations') || textLower.includes('operational') || textLower.includes('process')) {
      return 'Operations';
    } else if (textLower.includes('it') || textLower.includes('technical support') || textLower.includes('system')) {
      return 'IT';
    } else if (textLower.includes('design') || textLower.includes('mockup') || textLower.includes('ui')) {
      return 'Design';
    }

    return 'General';
  };

  const extractProjectName = (text) => {
    const projectPatterns = [
      /project\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
      /initiative\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
      /"([^"]+)"\s+(?:project|initiative)/i,
      /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:project|initiative)/i,
    ];

    for (const pattern of projectPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    const words = text.split(' ').filter((word) => word.length > 3);
    if (words.length > 2) {
      return `${words[0]} ${words[1]}`;
    }

    return 'Project';
  };

  const processTranscript = async (textToProcess) => {
    if (!textToProcess.trim()) return;

    setIsProcessing(true);
    try {
      const sentences = textToProcess
        .split(/[.!?]+/)
        .filter((s) => s.trim().length > 10)
        .map((s) => s.trim());

      const meetingPoints = sentences.map((sentence, index) => {
        const criticality = determineCriticality(sentence);
        const responsibility = extractResponsibilities(sentence);
        const targetDate = calculateTargetDate(sentence);
        const functionDept = determineFunction(sentence);
        const projectName = extractProjectName(sentence);

        return {
          id: Date.now() + index,
          sno: meetings.length + index + 1,
          function: functionDept,
          project_name: projectName,
          criticality: criticality,
          discussion_point: sentence + (sentence.match(/[.!?]$/) ? '' : '.'),
          responsibility: responsibility,
          target: targetDate,
          remainder: 'weekly',
          status: 'pending',
          action_taken_approval: 'pending-approval',
          created_at: new Date().toISOString(),
          attendees: 'Team',
          media_source: transcriptionMode,
        };
      });

      await onProcessSpeech(meetingPoints);

      if (transcriptionMode === 'live') {
        resetLiveTranscript();
      } else {
        setTranscript('');
      }
      if (transcriptionMode === 'upload') {
        setAudioFile(null);
        if (audioUrl) {
          URL.revokeObjectURL(audioUrl);
          setAudioUrl(null);
        }
      } else if (transcriptionMode === 'screen') {
        setScreenRecordingFile(null);
        if (screenRecordingUrl) {
          URL.revokeObjectURL(screenRecordingUrl);
          setScreenRecordingUrl(null);
        }
      }
    } catch (error) {
      console.error('Error processing transcript:', error);
      alert('Error converting to meeting points');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleProcess = async () => {
    if (!transcript.trim()) {
      alert('No transcript to process. Please transcribe media first.');
      return;
    }
    await processTranscript(transcript);
  };

  if (transcriptionMode === 'live' && !browserSupportsSpeechRecognition) {
    return (
      <div className="bg-red-50 border border-red-200 rounded p-4">
        <p className="text-sm text-red-700">
          Your browser doesn't support speech recognition. Please use Chrome, Edge, or Safari for live transcription.
        </p>
        <button
          onClick={() => setTranscriptionMode('upload')}
          className="mt-3 px-4 py-2 bg-black text-white rounded hover:bg-gray-800 transition-colors text-sm"
        >
          Switch to Audio Upload Mode
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Mode Toggle */}
      <div className="bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          <h3 className="text-base font-medium text-gray-900 dark:text-gray-100 Mode</h3>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => setTranscriptionMode('live')}
            className={`flex items-center justify-center gap-2 p-4 rounded-lg border transition-all ${
              transcriptionMode === 'live'
                ? 'bg-black text-white border-black dark:border-gray-700'
                : 'bg-white dark:bg-gray-950 border-gray-300 text-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            <MessageCircle className="h-5 w-5" />
            <span className="text-sm font-medium">Live Speech</span>
          </button>

          <button
            onClick={() => setTranscriptionMode('upload')}
            className={`flex items-center justify-center gap-2 p-4 rounded-lg border transition-all ${
              transcriptionMode === 'upload'
                ? 'bg-black text-white border-black dark:border-gray-700'
                : 'bg-white dark:bg-gray-950 border-gray-300 text-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            <Upload className="h-5 w-5" />
            <span className="text-sm font-medium">Upload Audio</span>
          </button>

          <button
            onClick={() => setTranscriptionMode('screen')}
            className={`flex items-center justify-center gap-2 p-4 rounded-lg border transition-all ${
              transcriptionMode === 'screen'
                ? 'bg-black text-white border-black dark:border-gray-700'
                : 'bg-white dark:bg-gray-950 border-gray-300 text-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            <Monitor className="h-5 w-5" />
            <span className="text-sm font-medium">Share Screen</span>
          </button>
        </div>
      </div>

      {/* Live Speech Section */}
      {transcriptionMode === 'live' && (
        <div className="bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-4">
            <Volume2 className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            <h3 className="text-base font-medium text-gray-900 dark:text-gray-100 Speech Controls</h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <button
              onClick={startListening}
              disabled={listening}
              className={`flex flex-col items-center justify-center p-4 rounded-lg transition-all ${
                listening
                  ? 'bg-green-600 text-white'
                  : 'bg-white dark:bg-gray-950 border border-gray-300 text-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              {listening ? (
                <MessageCircle className="h-6 w-6 mb-2 animate-pulse" />
              ) : (
                <MicOff className="h-6 w-6 mb-2" />
              )}
              <span className="text-sm font-medium">{listening ? 'Listening...' : 'Start Speech'}</span>
            </button>

            <button
              onClick={stopListening}
              disabled={!listening}
              className={`flex flex-col items-center justify-center p-4 rounded-lg transition-all ${
                !listening
                  ? 'opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-800'
                  : 'bg-red-100 border border-red-300 text-red-700 hover:bg-red-200'
              }`}
            >
              <Square className="h-6 w-6 mb-2" />
              <span className="text-sm font-medium">Stop</span>
            </button>

            <button
              onClick={resetLiveTranscript}
              className="flex flex-col items-center justify-center p-4 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
            >
              <Trash2 className="h-6 w-6 mb-2" />
              <span className="text-sm font-medium">Clear</span>
            </button>

            <button
              onClick={() => processTranscript(transcript)}
              disabled={!transcript || isProcessing}
              className={`flex flex-col items-center justify-center p-4 rounded-lg transition-all ${
                !transcript || isProcessing
                  ? 'opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-800'
                  : 'bg-black text-white hover:bg-gray-800'
              }`}
            >
              <Play className="h-6 w-6 mb-2" />
              <span className="text-sm font-medium">{isProcessing ? 'Processing...' : 'Convert'}</span>
            </button>
          </div>

          {listening && (
            <div className="mt-4 p-3 bg-green-100 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="flex space-x-1">
                  <div className="h-2 w-2 bg-green-500 rounded-full animate-bounce"></div>
                  <div className="h-2 w-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="h-2 w-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span className="text-sm text-green-700 font-medium">Live transcription active</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Audio Upload Section */}
      {transcriptionMode === 'upload' && (
        <div className="bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-4">
            <MessageCircle className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            <h3 className="text-base font-medium text-gray-900 dark:text-gray-100 Audio Recording</h3>
          </div>

          <div className="space-y-6">
            {/* File Upload */}
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-6 text-center hover:border-gray-400 transition-colors">
              <div className="flex flex-col items-center">
                <UploadCloud className="h-10 w-10 text-gray-400 mb-3" />
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Upload recorded meeting audio
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mb-4">
                  Supports MP3, WAV, M4A, WEBM (max 50MB)
                </p>

                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <div className="px-5 py-2.5 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium">
                    Choose Audio File
                  </div>
                </label>
              </div>
            </div>

            {/* Audio Recorder */}
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Or record audio directly:</p>
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <AudioRecorder
                  onRecordingComplete={handleAudioRecordingComplete}
                  audioTrackConstraints={{
                    noiseSuppression: true,
                    echoCancellation: true,
                  }}
                  showVisualizer={true}
                  downloadOnSavePress={false}
                  downloadFileExtension="webm"
                />
              </div>
            </div>

            {/* Audio Preview */}
            {audioFile && (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileAudio className="h-6 w-6 text-blue-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100"
                        {audioFile.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500">
                        {`${(audioFile.size / (1024 * 1024)).toFixed(2)} MB • ${audioFile.type}`}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={removeAudio}
                    className="p-1.5 text-gray-400 hover:text-red-600 transition-colors rounded-lg hover:bg-red-50"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Audio Player */}
                {audioUrl && (
                  <div className="space-y-2">
                    <audio
                      ref={audioRef}
                      src={audioUrl}
                      controls
                      className="w-full rounded-lg"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-500 text-center">
                      Click play to preview the audio
                    </p>
                  </div>
                )}

                {/* Upload Progress */}
                {uploadProgress > 0 && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400"
                      <span>{transcriptionStatus}</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {/* Transcribe Button */}
                <button
                  onClick={transcribeMedia}
                  disabled={isTranscribing}
                  className={`w-full flex items-center justify-center gap-3 py-3.5 rounded-lg transition-all ${
                    isTranscribing
                      ? 'opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-800'
                      : 'bg-black text-white hover:bg-gray-800'
                  }`}
                >
                  {isTranscribing ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span className="text-sm font-medium">Transcribing audio...</span>
                    </>
                  ) : (
                    <>
                      <ScanText className="h-5 w-5" />
                      <span className="text-sm font-medium">
                        Transcribe Audio to Text
                      </span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Screen Recording Section */}
      {transcriptionMode === 'screen' && (
        <div className="bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-4">
            <Monitor className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            <h3 className="text-base font-medium text-gray-900 dark:text-gray-100 Recording</h3>
          </div>

          <div className="space-y-6">
            {/* Screen Recording Controls */}
            <div className="text-center p-6 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl">
              <MonitorPlay className="h-12 w-12 mx-auto text-gray-400 mb-3" />
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Record your screen with audio</p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mb-4">
                Share your entire screen, application window, or browser tab with audio
              </p>
              
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                {!isScreenRecording ? (
                  <button
                    onClick={startScreenRecording}
                    className="px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                  >
                    <Monitor className="h-5 w-5" />
                    Start Screen Recording
                  </button>
                ) : (
                  <button
                    onClick={stopScreenRecording}
                    className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                  >
                    <StopCircle className="h-5 w-5" />
                    Stop Recording
                  </button>
                )}
              </div>
            </div>

            {isScreenRecording && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="flex space-x-1">
                    <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse"></div>
                    <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: '0.1s' }}></div>
                    <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                  <span className="text-sm text-red-700 font-medium">Screen recording in progress</span>
                </div>
                <p className="text-xs text-red-600 mt-1">
                  Click "Stop Recording" when finished, or stop sharing from your browser
                </p>
              </div>
            )}

            {/* Screen Recording Preview */}
            {screenRecordingFile && (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Video className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100"
                        {screenRecordingFile.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500">
                        Screen recording with audio
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={removeScreenRecording}
                    className="p-1.5 text-gray-400 hover:text-red-600 transition-colors rounded-lg hover:bg-red-50"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Video Player */}
                {screenRecordingUrl && (
                  <div className="space-y-2">
                    <video
                      src={screenRecordingUrl}
                      controls
                      className="w-full rounded-lg border border-gray-200 dark:border-gray-700" />
                    <p className="text-xs text-gray-500 dark:text-gray-500 text-center">
                      Click play to preview your screen recording
                    </p>
                  </div>
                )}

                {/* Upload Progress */}
                {uploadProgress > 0 && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400"
                      <span>{transcriptionStatus}</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-black transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {/* Transcribe Button */}
                <button
                  onClick={transcribeMedia}
                  disabled={isTranscribing}
                  className={`w-full flex items-center justify-center gap-3 py-3.5 rounded-lg transition-all ${
                    isTranscribing
                      ? 'opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-800'
                      : 'bg-black text-white hover:bg-gray-800'
                  }`}
                >
                  {isTranscribing ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span className="text-sm font-medium">Transcribing screen recording...</span>
                    </>
                  ) : (
                    <>
                      <ScanText className="h-5 w-5" />
                      <span className="text-sm font-medium">
                        Transcribe Screen Recording
                      </span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Transcript Display */}
      <div className="bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
        <div className="bg-gray-50 dark:bg-gray-800 px-4 py-3 border-b border-gray-200 dark:border-gray-700"
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-base font-medium text-gray-900 dark:text-gray-100"
                {transcriptionMode === 'live' ? 'Live Transcript' : 
                 transcriptionMode === 'upload' ? 'Audio Transcript' : 
                 'Screen Recording Transcript'}
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-400"
                {transcriptionMode === 'live'
                  ? 'Speech appears here in real-time'
                  : transcriptionMode === 'upload'
                  ? 'Transcribed text from audio appears here'
                  : 'Transcribed text from screen recording appears here'}
              </p>
            </div>
            {transcript && (
              <button
                onClick={handleProcess}
                disabled={isProcessing}
                className={`px-4 py-2 text-sm rounded-lg transition-all flex items-center gap-2 ${
                  isProcessing ? 'opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-800' : 'bg-black text-white hover:bg-gray-800'
                }`}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4" />
                    Convert to Meeting Points
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        <div className="p-4">
          <div className="h-64 overflow-y-auto bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700"
            {transcript ? (
              <div className="space-y-3">
                {transcript.split('. ').map(
                  (sentence, index) =>
                    sentence.trim() && (
                      <div key={index} className="flex gap-3 p-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800">
                        <div className="flex-shrink-0">
                          <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-xs font-medium text-blue-600">{index + 1}</span>
                          </div>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                          {sentence.trim()}
                          {!sentence.endsWith('.') && '.'}
                        </p>
                      </div>
                    )
                )}
              </div>
            ) : transcriptionMode === 'live' ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400">
                <MessageCircle className="h-10 w-10 mb-3 opacity-50" />
                <p className="text-sm">Start speaking to see transcript here</p>
                <p className="text-xs mt-1">Click "Start Speech" button above</p>
              </div>
            ) : transcriptionMode === 'upload' ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400">
                <MessageCircle className="h-10 w-10 mb-3 opacity-50" />
                <p className="text-sm">Upload and transcribe audio to see transcript here</p>
                <p className="text-xs mt-1">Click "Transcribe Audio to Text" button above</p>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-400">
                <Monitor className="h-10 w-10 mb-3 opacity-50" />
                <p className="text-sm">Record and transcribe screen recording to see transcript here</p>
                <p className="text-xs mt-1">Click "Transcribe Screen Recording" button above</p>
              </div>
            )}
          </div>

          {transcript && (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-600 dark:text-gray-400"
              <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <FileText className="h-4 w-4" />
                <span>
                  <span className="font-medium">{transcript.split(' ').length}</span> words
                </span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <MessageSquare className="h-4 w-4" />
                <span>
                  <span className="font-medium">{transcript.split('. ').filter((s) => s.trim()).length}</span> discussion points
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SpeechToText;