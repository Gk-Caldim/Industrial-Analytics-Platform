import React from 'react';
import { Plus, Eye, Download, MoreHorizontal, ArrowUp } from 'lucide-react';

const MeetingTable = ({ meetings, onAddMeeting }) => {
  return (
    <div className="max-w-6xl mx-auto space-y-4">
      {/* Top action row */}
      <div className="flex justify-between items-center py-2">
        <div className="flex-1" />
        <div className="flex-1 flex justify-center">
          <div className="px-6 py-2 border border-black/20 text-sm font-medium text-slate-800 bg-white shadow-sm">
            Minutes of meeting
          </div>
        </div>
        <div className="flex-1 flex justify-end">
          <button 
            onClick={onAddMeeting}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 text-white text-xs font-medium rounded hover:bg-slate-700 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            New meeting
          </button>
        </div>
      </div>

      {/* Critical Issues Context Note (Optional subtle hint as per image) */}
      <div className="flex justify-end text-[10px] text-gray-500 pr-10 items-end flex-col -mb-3 relative z-10">
         <span className="mb-0.5">Input to Critical Issues – Put Top 5</span>
         <ArrowUp className="w-3 h-3 text-gray-400 mr-12" />
      </div>

      <div className="overflow-x-auto bg-white pt-2">
        <table className="w-full text-left border-collapse border border-black/20">
          <thead>
            <tr className="bg-gray-50/50 text-xs font-semibold text-gray-800 text-center">
              <th className="px-2 py-3 border border-black/20 w-12">S.No</th>
              <th className="px-3 py-3 border border-black/20">Function</th>
              <th className="px-3 py-3 border border-black/20">Project Name</th>
              <th className="px-3 py-3 border border-black/20">Criticality</th>
              <th className="px-3 py-3 border border-black/20 w-1/4">Action Points discussed</th>
              <th className="px-3 py-3 border border-black/20">Responsibility</th>
              <th className="px-3 py-3 border border-black/20">Target</th>
              <th className="px-3 py-3 border border-black/20">Status</th>
              <th className="px-3 py-3 border border-black/20">Action taken</th>
            </tr>
          </thead>
          <tbody className="text-xs text-slate-700 font-normal">
            {meetings.length === 0 ? (
              <tr>
                <td colSpan="9" className="px-4 py-12 text-center text-gray-400 border border-black/20">
                  No meetings found. Press <kbd className="px-1 py-0.5 border border-gray-200 rounded text-[10px] ml-1 bg-gray-50 text-gray-500">Space</kbd> in Live Mic to start recording.
                </td>
              </tr>
            ) : (
              meetings.map((meeting, index) => (
                <tr key={meeting.id} className="hover:bg-gray-50/50 transition-colors duration-150">
                  <td className="px-2 py-3 border border-black/20 text-center text-gray-500">
                    {meeting.s_no || index + 1}
                  </td>
                  <td className="px-3 py-3 border border-black/20 text-center">
                    {meeting.function || '-'}
                  </td>
                  <td className="px-3 py-3 border border-black/20 text-center font-medium text-slate-800">
                    {meeting.project_name || 'Untitled'}
                  </td>
                  <td className="px-3 py-3 border border-black/20 text-center">
                    {meeting.criticality || '-'}
                  </td>
                  <td className="px-3 py-3 border border-black/20 leading-relaxed text-gray-800 min-w-[250px]">
                    {meeting.discussion_point || '-'}
                  </td>
                  <td className="px-3 py-3 border border-black/20 text-center">
                    {meeting.responsibility || '-'}
                  </td>
                  <td className="px-3 py-3 border border-black/20 text-center text-gray-500 whitespace-nowrap">
                    {meeting.target || '-'}
                  </td>
                  <td className="px-3 py-3 border border-black/20 text-center">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] uppercase font-medium ${
                      (meeting.status || '').toLowerCase() === 'summarized' ? 'bg-[#ECFDF5] text-[#059669]' : 'bg-[#FFFBEB] text-[#D97706]'
                    }`}>
                      {meeting.status || 'Pending'}
                    </span>
                  </td>
                  <td className="px-3 py-3 border border-black/20 text-center">
                    {meeting.action_taken || '-'}
                  </td>
                </tr>
              ))
            )}
            
            {/* Empty filler rows to match visual style if meetings are few */}
            {meetings.length > 0 && meetings.length < 5 && Array.from({ length: 5 - meetings.length }).map((_, i) => (
              <tr key={`empty-${i}`}>
                <td className="px-2 py-5 border border-black/20"></td>
                <td className="px-3 py-5 border border-black/20"></td>
                <td className="px-3 py-5 border border-black/20"></td>
                <td className="px-3 py-5 border border-black/20"></td>
                <td className="px-3 py-5 border border-black/20"></td>
                <td className="px-3 py-5 border border-black/20"></td>
                <td className="px-3 py-5 border border-black/20"></td>
                <td className="px-3 py-5 border border-black/20"></td>
                <td className="px-3 py-5 border border-black/20"></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MeetingTable;