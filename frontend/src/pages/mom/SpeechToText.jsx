import React, { useState, useEffect } from 'react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import {
  Upload,
  Volume2,
  Play,
  Square,
  Trash2,
  FileText,
  X,
  UploadCloud,
  Loader2,
  MessageSquare,
  Settings,
  MessageCircle,
  MicOff,
  FileUp,
} from 'lucide-react';

const SpeechToText = ({ onProcessSpeech, meetings = [] }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcriptFile, setTranscriptFile] = useState(null);
  const [transcriptionMode, setTranscriptionMode] = useState('live'); // 'live' or 'upload'
  const [transcript, setTranscript] = useState('');
  const [transcriptionStatus, setTranscriptionStatus] = useState('');
  const [uploadError, setUploadError] = useState('');

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

  const handleTranscriptFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const allowedTypes = [
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/pdf',
    ];
    const allowedExtensions = ['.txt', '.doc', '.docx', '.pdf'];
    const fileExt = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();

    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExt)) {
      setUploadError('Please upload a text file (.txt, .doc, .docx, or .pdf)');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('File size too large. Please upload a file less than 10MB');
      return;
    }

    setUploadError('');
    setTranscriptFile(file);
    setTranscriptionStatus('');

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      // Store into transcript (same state used by Live Transcript display)
      setTranscript(text);
      setTranscriptionStatus('Transcript loaded successfully!');
      // Switch back to live mode so the Live Transcript section is visible
      setTranscriptionMode('live');
    };
    reader.onerror = () => {
      setUploadError('Failed to read the file. Please try again.');
    };
    reader.readAsText(file);
  };

  const removeTranscriptFile = () => {
    setTranscriptFile(null);
    setTranscript('');
    setTranscriptionStatus('');
    setUploadError('');
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

      resetLiveTranscript();
      setTranscript('');
      setTranscriptFile(null);
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
      <div className="bg-white border border-gray-300 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="h-5 w-5 text-gray-600" />
          <h3 className="text-base font-medium text-gray-900">Transcription Mode</h3>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setTranscriptionMode('live')}
            className={`flex items-center justify-center gap-2 p-4 rounded-lg border transition-all ${
              transcriptionMode === 'live'
                ? 'bg-black text-white border-black'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <MessageCircle className="h-5 w-5" />
            <span className="text-sm font-medium">Live Speech</span>
          </button>

          <button
            onClick={() => setTranscriptionMode('upload')}
            className={`flex items-center justify-center gap-2 p-4 rounded-lg border transition-all ${
              transcriptionMode === 'upload'
                ? 'bg-black text-white border-black'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <FileUp className="h-5 w-5" />
            <span className="text-sm font-medium">Upload Transcript</span>
          </button>
        </div>
      </div>

      {/* Live Speech Section */}
      {transcriptionMode === 'live' && (
        <div className="bg-white border border-gray-300 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-4">
            <Volume2 className="h-5 w-5 text-gray-600" />
            <h3 className="text-base font-medium text-gray-900">Live Speech Controls</h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <button
              onClick={startListening}
              disabled={listening}
              className={`flex flex-col items-center justify-center p-4 rounded-lg transition-all ${
                listening
                  ? 'bg-green-600 text-white'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
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
                  ? 'opacity-50 cursor-not-allowed bg-gray-100'
                  : 'bg-red-100 border border-red-300 text-red-700 hover:bg-red-200'
              }`}
            >
              <Square className="h-6 w-6 mb-2" />
              <span className="text-sm font-medium">Stop</span>
            </button>

            <button
              onClick={resetLiveTranscript}
              className="flex flex-col items-center justify-center p-4 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all"
            >
              <Trash2 className="h-6 w-6 mb-2" />
              <span className="text-sm font-medium">Clear</span>
            </button>

            <button
              onClick={() => processTranscript(transcript)}
              disabled={!transcript || isProcessing}
              className={`flex flex-col items-center justify-center p-4 rounded-lg transition-all ${
                !transcript || isProcessing
                  ? 'opacity-50 cursor-not-allowed bg-gray-100'
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

      {/* Upload Transcript Section */}
      {transcriptionMode === 'upload' && (
        <div className="bg-white border border-gray-300 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-4">
            <FileUp className="h-5 w-5 text-gray-600" />
            <h3 className="text-base font-medium text-gray-900">Upload Transcript File</h3>
          </div>

          <div className="space-y-4">
            {/* File Upload Drop Zone */}
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-gray-400 transition-colors">
              <div className="flex flex-col items-center">
                <UploadCloud className="h-12 w-12 text-gray-400 mb-3" />
                <p className="text-sm font-medium text-gray-700 mb-1">
                  Upload your meeting transcript
                </p>
                <p className="text-xs text-gray-500 mb-4">
                  Supports .txt, .doc, .docx files (max 10MB)
                </p>
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept=".txt,.doc,.docx,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    onChange={handleTranscriptFileUpload}
                    className="hidden"
                    id="transcript-file-input"
                  />
                  <div className="px-6 py-2.5 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium flex items-center gap-2">
                    <FileUp className="h-4 w-4" />
                    Choose Transcript File
                  </div>
                </label>
              </div>
            </div>

            {/* Error message */}
            {uploadError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{uploadError}</p>
              </div>
            )}

            {/* Success / File Info */}
            {transcriptFile && (
              <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <FileText className="h-6 w-6 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{transcriptFile.name}</p>
                    <p className="text-xs text-gray-500">
                      {`${(transcriptFile.size / 1024).toFixed(1)} KB — loaded into Live Transcript`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={removeTranscriptFile}
                  className="p-1.5 text-gray-400 hover:text-red-600 transition-colors rounded-lg hover:bg-red-50"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            )}

            {transcriptionStatus && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-700 font-medium">{transcriptionStatus}</p>
                <p className="text-xs text-blue-600 mt-1">Switched to Live Transcript view — review and convert to meeting points.</p>
              </div>
            )}
          </div>
        </div>
      )}



      {/* Transcript Display */}
      <div className="bg-white border border-gray-300 rounded-lg overflow-hidden">
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-base font-medium text-gray-900">Live Transcript</h3>
              <p className="text-xs text-gray-600">
                {transcript
                  ? 'Transcript content — review and convert to meeting points'
                  : 'Speech appears here in real-time, or upload a transcript file'}
              </p>
            </div>
            {transcript && (
              <button
                onClick={handleProcess}
                disabled={isProcessing}
                className={`px-4 py-2 text-sm rounded-lg transition-all flex items-center gap-2 ${
                  isProcessing ? 'opacity-50 cursor-not-allowed bg-gray-100' : 'bg-black text-white hover:bg-gray-800'
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
          <div className="h-64 overflow-y-auto bg-gray-50 rounded-lg p-4 border border-gray-200">
            {transcript ? (
              <div className="space-y-3">
                {transcript.split('. ').map(
                  (sentence, index) =>
                    sentence.trim() && (
                      <div key={index} className="flex gap-3 p-3 bg-white rounded-lg border border-gray-100">
                        <div className="flex-shrink-0">
                          <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-xs font-medium text-blue-600">{index + 1}</span>
                          </div>
                        </div>
                        <p className="text-sm text-gray-700 leading-relaxed">
                          {sentence.trim()}
                          {!sentence.endsWith('.') && '.'}
                        </p>
                      </div>
                    )
                )}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-400">
                <MessageCircle className="h-10 w-10 mb-3 opacity-50" />
                <p className="text-sm">Start speaking, or upload a transcript file</p>
                <p className="text-xs mt-1">Use "Live Speech" or "Upload Transcript" above</p>
              </div>
            )}
          </div>

          {transcript && (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-600">
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                <FileText className="h-4 w-4" />
                <span>
                  <span className="font-medium">{transcript.split(' ').length}</span> words
                </span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
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