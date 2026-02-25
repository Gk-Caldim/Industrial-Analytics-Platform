import React, { useState, useEffect } from 'react';
import * as Icons from 'lucide-react';

import SpeechToText from './SpeechToText';
import MeetingTable from './MeetingTable';
import MOMDashboard from './MOMDashboard';

const MOMModule = () => {
  const [meetings, setMeetings] = useState([]);
  const [activeTab, setActiveTab] = useState('speech');
  const [loading, setLoading] = useState(false);

  // Load meetings from localStorage
  useEffect(() => {
    setLoading(true);
    try {
      const savedMeetings = JSON.parse(localStorage.getItem('mom_meetings')) || [];
      setMeetings(savedMeetings);
    } catch (error) {
      console.error('Error loading meetings:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Save meetings to localStorage
  useEffect(() => {
    localStorage.setItem('mom_meetings', JSON.stringify(meetings));
  }, [meetings]);

  const handleProcessSpeech = async (points) => {
    setMeetings(prev => {
      // Calculate starting S.No
      const startingSno = prev.length + 1;
      
      // Add new points with correct serial numbers
      const newPoints = points.map((point, index) => ({
        ...point,
        sno: startingSno + index
      }));
      
      return [...prev, ...newPoints];
    });
    setActiveTab('table');
  };

  const handleUpdateMeeting = async (id, data) => {
    setMeetings(prev =>
      prev.map(meeting =>
        meeting.id === id ? { ...meeting, ...data } : meeting
      )
    );
  };

  const handleDeleteMeeting = async (id) => {
    setMeetings(prev => prev.filter(meeting => meeting.id !== id));
  };

  const handleAddMeeting = () => {
    const newMeeting = {
      id: Date.now(),
      sno: meetings.length + 1,
      attendees: '', // Changed from speaker to attendees
      point: '',
      project: '',
      criticality: '2',
      action: '',
      responsibility: '',
      target: new Date().toISOString().split('T')[0],
      status: 'pending',
      actions_taken: '',
      i_column: '',
      created_at: new Date().toISOString()
    };
    setMeetings(prev => [...prev, newMeeting]);
  };

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to clear all meeting data? This action cannot be undone.')) {
      setMeetings([]);
      localStorage.removeItem('mom_meetings');
    }
  };

  // Count unique attendees
  const countUniqueAttendees = () => {
    const allAttendees = [];
    meetings.forEach(meeting => {
      const attendees = meeting.attendees || meeting.speaker || '';
      if (attendees) {
        // Split attendees by comma, semicolon, or "and"
        const attendeeList = attendees.split(/[,;]| and /).map(a => a.trim()).filter(a => a);
        allAttendees.push(...attendeeList);
      }
    });
    
    // Remove duplicates and count
    const uniqueAttendees = [...new Set(allAttendees)];
    return uniqueAttendees.length;
  };

  const tabs = [
    { id: 'speech', label: 'Speech to Text', icon: <Icons.Mic className="h-4 w-4" /> },
    { id: 'table', label: 'Meeting Table', icon: <Icons.FileText className="h-4 w-4" /> },
    { id: 'dashboard', label: 'Analytics', icon: <Icons.BarChart3 className="h-4 w-4" /> },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-black rounded-full animate-spin mx-auto"></div>
          <p className="mt-3 text-sm text-gray-600">Loading meeting data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center">
            <Icons.Mic className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
            Minutes of Meeting
          </h2>
          <p className="text-xs sm:text-sm text-gray-600 mt-0.5 sm:mt-1">Convert speech to structured meeting minutes</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleAddMeeting}
            className="flex items-center justify-center space-x-1 px-3 py-1.5 text-xs sm:text-sm bg-black text-white rounded hover:bg-gray-800 w-full sm:w-auto"
          >
            <Icons.Plus className="h-3 w-3 sm:h-4 sm:w-4" />
            <span>Add Meeting</span>
          </button>
          {meetings.length > 0 && (
            <button
              onClick={handleClearAll}
              className="px-3 py-1.5 text-xs sm:text-sm border border-red-300 text-red-700 rounded hover:bg-red-50"
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Compact Stats - UPDATED with Attendees */}
      <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        <div className="bg-white border border-gray-300 rounded p-3 sm:p-4 flex items-center">
          <div className="bg-gray-100 p-1.5 sm:p-2 rounded mr-2 sm:mr-3">
            <Icons.FileText className="h-3 w-3 sm:h-4 sm:w-4 text-gray-600" />
          </div>
          <div>
            <p className="text-[10px] sm:text-xs text-gray-500">Total Points</p>
            <p className="text-sm sm:text-base font-bold text-gray-900">{meetings.length}</p>
          </div>
        </div>
        <div className="bg-white border border-gray-300 rounded p-3 sm:p-4 flex items-center">
          <div className="bg-green-100 p-1.5 sm:p-2 rounded mr-2 sm:mr-3">
            <Icons.Users className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
          </div>
          <div>
            <p className="text-[10px] sm:text-xs text-gray-500"> Attendees</p>
            <p className="text-sm sm:text-base font-bold text-green-600">
              {countUniqueAttendees()}
            </p>
          </div>
        </div>
        <div className="bg-white border border-gray-300 rounded p-3 sm:p-4 flex items-center">
          <div className="bg-red-100 p-1.5 sm:p-2 rounded mr-2 sm:mr-3">
            <Icons.AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 text-red-600" />
          </div>
          <div>
            <p className="text-[10px] sm:text-xs text-gray-500">High Priority</p>
            <p className="text-sm sm:text-base font-bold text-red-600">
              {meetings.filter(m => m.criticality === '1').length}
            </p>
          </div>
        </div>
        <div className="bg-white border border-gray-300 rounded p-3 sm:p-4 flex items-center">
          <div className="bg-yellow-100 p-1.5 sm:p-2 rounded mr-2 sm:mr-3">
            <Icons.Clock className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-600" />
          </div>
          <div>
            <p className="text-[10px] sm:text-xs text-gray-500">Pending Actions</p>
            <p className="text-sm sm:text-base font-bold text-yellow-600">
              {meetings.filter(m => m.status === 'pending').length}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border border-gray-300 rounded">
        <div className="flex overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-1 px-4 py-2 text-xs sm:text-sm transition-colors flex-shrink-0 border-b-2 ${
                activeTab === tab.id
                  ? 'text-black border-black bg-gray-50'
                  : 'text-gray-600 hover:text-gray-900 border-transparent hover:bg-gray-50'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
        
        {/* Tab Content */}
        <div className="p-3 sm:p-4">
          {activeTab === 'speech' && (
            <SpeechToText 
              onProcessSpeech={handleProcessSpeech} 
              meetings={meetings} 
            />
          )}

          {activeTab === 'table' && (
            <MeetingTable 
              meetings={meetings}
              onUpdateMeeting={handleUpdateMeeting}
              onDeleteMeeting={handleDeleteMeeting}
            />
          )}

          {activeTab === 'dashboard' && (
            <MOMDashboard meetings={meetings} />
          )}
        </div>
      </div>
    </div>
  );
};

export default MOMModule;