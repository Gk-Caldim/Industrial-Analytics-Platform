// MOMDashboard.jsx (Analytics Dashboard Only)
import React, { useState, useMemo } from 'react';
import * as Icons from 'lucide-react';

const MOMDashboard = ({ meetings }) => {
  const [timeRange, setTimeRange] = useState('all');
  const [viewMode, setViewMode] = useState('overview'); // overview, detailed

  // Calculate comprehensive analytics
  const analytics = useMemo(() => {
    const filteredMeetings = meetings.filter(meeting => {
      if (timeRange === 'all') return true;
      const meetingDate = new Date(meeting.created_at || new Date());
      const now = new Date();
      const daysAgo = timeRange === 'week' ? 7 : timeRange === 'month' ? 30 : 365;
      const cutoffDate = new Date(now.setDate(now.getDate() - daysAgo));
      return meetingDate >= cutoffDate;
    });

    // Basic statistics
    const stats = {
      total: filteredMeetings.length,
      completed: filteredMeetings.filter(m => m.status === 'completed').length,
      inProgress: filteredMeetings.filter(m => m.status === 'in_progress').length,
      pending: filteredMeetings.filter(m => m.status === 'pending').length,
      critical: filteredMeetings.filter(m => m.criticality === 'critical' || m.criticality === '1').length,
      high: filteredMeetings.filter(m => m.criticality === 'high' || m.criticality === '2').length,
      medium: filteredMeetings.filter(m => m.criticality === 'medium' || m.criticality === '3').length,
      low: filteredMeetings.filter(m => m.criticality === 'low' || m.criticality === '4').length,
    };

    // Calculate rates
    stats.completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
    stats.highPriorityRate = stats.total > 0 ? Math.round(((stats.critical + stats.high) / stats.total) * 100) : 0;
    stats.pendingRate = stats.total > 0 ? Math.round((stats.pending / stats.total) * 100) : 0;

    // Top attendees (instead of speakers)
    const attendeeCount = {};
    filteredMeetings.forEach(meeting => {
      // Split attendees string by comma, semicolon, or "and"
      const attendees = meeting.attendees || meeting.speaker || 'Unknown';
      const attendeeList = attendees.split(/[,;]| and /).map(a => a.trim()).filter(a => a);
      
      if (attendeeList.length > 0) {
        attendeeList.forEach(attendee => {
          attendeeCount[attendee] = (attendeeCount[attendee] || 0) + 1;
        });
      } else {
        // Fallback to single attendee/speaker
        attendeeCount[attendees] = (attendeeCount[attendees] || 0) + 1;
      }
    });
    
    const topAttendees = Object.entries(attendeeCount)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Top projects
    const projectCount = {};
    filteredMeetings.forEach(meeting => {
      const project = meeting.project_name || meeting.project || 'Unnamed';
      projectCount[project] = (projectCount[project] || 0) + 1;
    });
    const topProjects = Object.entries(projectCount)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Overdue tasks
    const overdueTasks = filteredMeetings
      .filter(meeting => {
        if (!meeting.target || meeting.status === 'completed') return false;
        const targetDate = new Date(meeting.target);
        const today = new Date();
        return targetDate < today;
      })
      .slice(0, 5);

    // Recent meetings
    const recentMeetings = [...filteredMeetings]
      .sort((a, b) => new Date(b.created_at || new Date()) - new Date(a.created_at || new Date()))
      .slice(0, 5);

    // Status distribution
    const statusDistribution = [
      { name: 'Completed', value: stats.completed, color: 'bg-green-500' },
      { name: 'In Progress', value: stats.inProgress, color: 'bg-blue-500' },
      { name: 'Pending', value: stats.pending, color: 'bg-yellow-500' }
    ];

    // Criticality distribution
    const criticalityDistribution = [
      { name: 'Critical', value: stats.critical, color: 'bg-red-500' },
      { name: 'High', value: stats.high, color: 'bg-orange-500' },
      { name: 'Medium', value: stats.medium, color: 'bg-yellow-500' },
      { name: 'Low', value: stats.low, color: 'bg-green-500' }
    ];

    return {
      stats,
      topAttendees,
      topProjects,
      overdueTasks,
      recentMeetings,
      statusDistribution,
      criticalityDistribution
    };
  }, [meetings, timeRange]);

  // Export data
  const exportData = () => {
    const data = {
      analytics,
      timestamp: new Date().toISOString(),
      totalMeetings: meetings.length
    };
    
    const dataStr = JSON.stringify(data, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = `mom-analytics-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Meeting Analytics Dashboard</h2>
          <p className="text-sm text-gray-600">Insights from your meeting minutes</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded"
          >
            <option value="all">All Time</option>
            <option value="month">Last 30 Days</option>
            <option value="week">Last 7 Days</option>
          </select>
          
          <button
            onClick={exportData}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700"
          >
            <Icons.Download className="h-4 w-4" />
            <span>Export Data</span>
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-blue-700">Total Meeting Points</p>
              <p className="text-2xl font-bold text-blue-900 mt-1">{analytics.stats.total}</p>
            </div>
            <div className="p-2 bg-blue-200 rounded-full">
              <Icons.FileText className="h-5 w-5 text-blue-700" />
            </div>
          </div>
          <div className="mt-3 text-xs text-blue-600">
            All recorded meeting points
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-green-700">Completion Rate</p>
              <p className="text-2xl font-bold text-green-900 mt-1">{analytics.stats.completionRate}%</p>
            </div>
            <div className="p-2 bg-green-200 rounded-full">
              <Icons.CheckCircle className="h-5 w-5 text-green-700" />
            </div>
          </div>
          <div className="mt-3 text-xs text-green-600">
            {analytics.stats.completed} of {analytics.stats.total} completed
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-red-50 to-red-100 border border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-red-700">High Priority Items</p>
              <p className="text-2xl font-bold text-red-900 mt-1">{analytics.stats.critical + analytics.stats.high}</p>
            </div>
            <div className="p-2 bg-red-200 rounded-full">
              <Icons.AlertTriangle className="h-5 w-5 text-red-700" />
            </div>
          </div>
          <div className="mt-3 text-xs text-red-600">
            {analytics.stats.highPriorityRate}% of total
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-purple-700">Pending Actions</p>
              <p className="text-2xl font-bold text-purple-900 mt-1">{analytics.stats.pending}</p>
            </div>
            <div className="p-2 bg-purple-200 rounded-full">
              <Icons.Clock className="h-5 w-5 text-purple-700" />
            </div>
          </div>
          <div className="mt-3 text-xs text-purple-600">
            {analytics.stats.pendingRate}% of total
          </div>
        </div>
      </div>

      {/* Main Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Status Distribution */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900">Status Distribution</h3>
            <span className="text-sm text-gray-600">{analytics.stats.total} total</span>
          </div>
          
          <div className="space-y-4">
            {analytics.statusDistribution.map((status, index) => (
              <div key={index}>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">{status.name}</span>
                  <span className="text-sm font-medium">{status.value} ({analytics.stats.total > 0 ? Math.round((status.value / analytics.stats.total) * 100) : 0}%)</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${status.color}`}
                    style={{ width: `${analytics.stats.total > 0 ? (status.value / analytics.stats.total) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Criticality Distribution */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900">Priority Analysis</h3>
            <span className="text-sm text-gray-600">Criticality levels</span>
          </div>
          
          <div className="space-y-4">
            {analytics.criticalityDistribution.map((item, index) => (
              <div key={index}>
                <div className="flex justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${item.color}`}></div>
                    <span className="text-sm font-medium text-gray-700">{item.name}</span>
                  </div>
                  <span className="text-sm font-medium">{item.value}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${item.color}`}
                    style={{ width: `${analytics.stats.total > 0 ? (item.value / analytics.stats.total) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Attendees & Projects */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Attendees */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900">Top Attendees</h3>
            <Icons.Users className="h-5 w-5 text-gray-400" />
          </div>
          
          <div className="space-y-3">
            {analytics.topAttendees.map((attendee, index) => (
              <div key={attendee.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-bold text-blue-600">
                      {attendee.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{attendee.name}</div>
                    <div className="text-xs text-gray-600">{attendee.count} meetings attended</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-blue-600">{attendee.count}</div>
                  <div className="text-xs text-gray-500">attendances</div>
                </div>
              </div>
            ))}
            
            {analytics.topAttendees.length === 0 && (
              <div className="text-center py-6 text-gray-500">
                <Icons.Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No attendee data available</p>
              </div>
            )}
          </div>
        </div>

        {/* Top Projects */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900">Active Projects</h3>
            <Icons.Folder className="h-5 w-5 text-gray-400" />
          </div>
          
          <div className="space-y-3">
            {analytics.topProjects.map((project, index) => (
              <div key={project.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-bold text-green-600">
                      {index + 1}
                    </span>
                  </div>
                  <div className="max-w-[180px]">
                    <div className="font-medium text-gray-900 truncate">{project.name}</div>
                    <div className="text-xs text-gray-600">{project.count} meeting points</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-green-600">{project.count}</div>
                  <div className="text-xs text-gray-500">mentions</div>
                </div>
              </div>
            ))}
            
            {analytics.topProjects.length === 0 && (
              <div className="text-center py-6 text-gray-500">
                <Icons.Folder className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No project data available</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Overdue Tasks */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-gray-900">Overdue Action Items</h3>
            <p className="text-sm text-gray-600">Tasks past their due date</p>
          </div>
          {analytics.overdueTasks.length > 0 && (
            <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
              {analytics.overdueTasks.length} overdue
            </span>
          )}
        </div>
        
        <div className="space-y-3">
          {analytics.overdueTasks.map(meeting => {
            const targetDate = new Date(meeting.target);
            const today = new Date();
            const daysOverdue = Math.floor((today - targetDate) / (1000 * 60 * 60 * 24));
            
            return (
              <div key={meeting.id} className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-bold text-red-900">{meeting.project_name || meeting.project}</h4>
                      <span className="px-2 py-1 text-xs bg-red-200 text-red-800 rounded">
                        {daysOverdue} days overdue
                      </span>
                    </div>
                    <p className="text-sm text-red-700 mb-3">{meeting.discussion_point || meeting.point}</p>
                    
                    <div className="grid grid-cols-2 gap-3 text-xs text-gray-600">
                      <div className="flex items-center gap-1">
                        <Icons.User className="h-3 w-3" />
                        <span>Attendees: {meeting.attendees || meeting.speaker || 'Unknown'}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Icons.Users className="h-3 w-3" />
                        <span>Responsible: {meeting.responsibility}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Icons.Calendar className="h-3 w-3" />
                        <span>Due: {targetDate.toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Icons.AlertTriangle className="h-3 w-3" />
                        <span>Priority: {meeting.criticality}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          
          {analytics.overdueTasks.length === 0 && (
            <div className="text-center py-8 bg-green-50 rounded-lg">
              <Icons.CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-400" />
              <h4 className="text-lg font-bold text-green-800 mb-2">All tasks on schedule!</h4>
              <p className="text-sm text-green-600">No overdue action items</p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Meetings */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-900">Recent Meetings</h3>
          <Icons.Calendar className="h-5 w-5 text-gray-400" />
        </div>
        
        <div className="space-y-3">
          {analytics.recentMeetings.map(meeting => (
            <div key={meeting.id} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium text-gray-900">{meeting.project_name || meeting.project}</h4>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    meeting.criticality === 'critical' || meeting.criticality === '1' ? 'bg-red-100 text-red-800' :
                    meeting.criticality === 'high' || meeting.criticality === '2' ? 'bg-orange-100 text-orange-800' :
                    meeting.criticality === 'medium' || meeting.criticality === '3' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {meeting.criticality}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-2">{meeting.discussion_point || meeting.point}</p>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>Attendees: {meeting.attendees || meeting.speaker || 'Unknown'}</span>
                  <span>Date: {new Date(meeting.created_at || new Date()).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="text-right">
                <span className={`px-2 py-1 text-xs rounded-full ${
                  meeting.status === 'completed' ? 'bg-green-100 text-green-800' :
                  meeting.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {meeting.status || 'pending'}
                </span>
              </div>
            </div>
          ))}
          
          {analytics.recentMeetings.length === 0 && (
            <div className="text-center py-6 text-gray-500">
              <Icons.Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No recent meetings</p>
            </div>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold text-gray-900">Analytics Summary</h3>
            <p className="text-sm text-gray-600 mt-1">
              Based on {meetings.length} meeting minutes • Generated on {new Date().toLocaleDateString()}
            </p>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{analytics.stats.completionRate}%</div>
              <div className="text-sm text-gray-600">Completion Rate</div>
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{analytics.stats.completed}</div>
              <div className="text-sm text-gray-600">Completed</div>
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-red-600">{analytics.stats.critical + analytics.stats.high}</div>
              <div className="text-sm text-gray-600">High Priority</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MOMDashboard;