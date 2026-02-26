import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  File, User, ChevronRight,
  AlertCircle, X, Eye, ChevronDown, ChevronUp,
  BarChart2, PieChart, TrendingUp, Mail, Send,
  CheckSquare, Filter, Download, RefreshCw, Folder,
  Layout, Database, Share2, Settings, Maximize2,
  Grid, List, Activity, Radar, ScatterChart as ScatterIcon,
  AreaChart as AreaIcon, Merge, Columns, Plus, Minus,
  Table, Layers, CheckCircle, Clock, AlertTriangle,
  Circle, DollarSign, Percent, TrendingDown, Flag,
  Calendar, Target, Shield, GitBranch, Users, Award,
  Settings2, Minimize2, Sliders
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart as RePieChart, Pie, Cell,
  LineChart, Line,
  AreaChart, Area,
  ResponsiveContainer
} from 'recharts';

import FileContentViewer from './Trackers/FileContentViewer';

// Milestone stages (columns in the timeline)
const MILESTONE_STAGES = [
  { id: 'l0drg', label: 'L0 Drg' },
  { id: 'l1drg', label: 'L1 Drg' },
  { id: 'qsvob', label: 'QS/VOB' },
  { id: 'tko', label: 'Exclusive TKO' },
  { id: 'gen2build', label: 'Gen2 Build' },
  { id: 'gen2val', label: 'Gen2 Validation' },
  { id: 'gen2cbuild', label: 'Gen2C Build' },
  { id: 'reval', label: 'Revalidation & Seeding Build' },
  { id: 'pp1', label: 'PP1' },
  { id: 'pp2', label: 'PP2' },
  { id: 'sop', label: 'SOP' },
  { id: 'sovp', label: 'SOVP' },
];

// Plan row & Actual/Outlook row – keyed by stage id
const MILESTONE_PLAN = {
  l0drg: "Apr'22", l1drg: "Sep'22", qsvob: "Sep'22–Nov'22", tko: "Jun'22–Mar'23",
  gen2build: "Apr'23–Jun'23", gen2val: "May'23–Feb'24", gen2cbuild: "Sep'23",
  reval: "Oct'24–Nov'24", pp1: "Mar'25", pp2: "Apr'25", sop: "Jul'25", sovp: "Aug'25"
};
const MILESTONE_ACTUAL = {
  l0drg: { value: "✔", status: 'done' },
  l1drg: { value: "✔", status: 'done' },
  qsvob: { value: "✔", status: 'done' },
  tko: { value: "✔", status: 'done' },
  gen2build: { value: "Jun'23", status: 'delayed' },
  gen2val: { value: "Jun'23–Feb'24", status: 'done' },
  gen2cbuild: { value: "Sep'23", status: 'done' },
  reval: { value: "Oct'24–Nov'24", status: 'pending' },
  pp1: { value: "Mar'25", status: 'pending' },
  pp2: { value: "May'25", status: 'at-risk' },
  sop: { value: '', status: 'pending' },
  sovp: { value: '', status: 'pending' },
};

// Dummy data for critical issues
const DUMMY_ISSUES = [
  {
    id: 1,
    issue: 'Automatic Sealant dispenser installation pending at Nagpur main line. Machine received at plant, but installation delayed due to current production priorities at main line. However machine is established in 1 bar line.',
    resp: 'CME',
    supportRequired: 'Installation as per plan',
    fromWhom: 'Mangesh',
    status: 'Open',
  },
  {
    id: 2,
    issue: 'ORC Parts Development Progress\n1. Conrod Bolt – Assembled conrod required for fatigue testing. 8 samples each from bolt suppliers to be sent to both conrod suppliers (Shashank)\n2. Crank case (3DI & 4DI) – No progress in semi finish investment approval. Impact on Implementation. (Shashank)\n3. Thrust Bearing (KSPG) – KSPG has shared updated proposal. Feedback awaited from Design (Deepak)\n4. PIX Belt – Validation failed on 3 cyl at 453 hrs. Supplier feedback to be verified at tractor & to be further discussed with supplier for closure. 4 cyl validation completed (2×800 hrs). Supplier final DVP to be signed off\n5. CONTI Belt – Development with EPDM material to be started. Communication to CDMM to be initiated (Twisha)\n6. VHC Cover – Feasibility closure & SOR sign off delayed. Impact on validation & Implementation (Deepak)',
    resp: 'Mentioned in each line',
    supportRequired: 'Expediting Development',
    fromWhom: 'Dr. Ramesh Tarun & Milind',
    status: 'In Progress',
  },
];

// Project stages configuration with embedded charts
const PROJECT_STAGES = [
  { id: 'design', name: 'Design', color: 'blue', description: 'UI/UX Design Phase' },
  { id: 'vop', name: 'VOP', color: 'purple', description: 'Value Optimization Process' },
  { id: 'development', name: 'Development', color: 'green', description: 'Development Phase' },
  { id: 'testing', name: 'Testing', color: 'orange', description: 'Quality Assurance' },
  { id: 'deployment', name: 'Deployment', color: 'red', description: 'Release Management' },
  { id: 'monitoring', name: 'Monitoring', color: 'teal', description: 'Performance Monitoring' },
];

// Enhanced Custom Tooltip with better formatting
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white px-4 py-3 border border-gray-200 rounded-lg shadow-lg max-w-xs">
        <p className="font-medium text-gray-900 mb-2 border-b pb-1">{label}</p>
        {payload.map((entry, index) => {
          const valueColor = entry.color || entry.fill || '#2563eb';
          const value = entry.value;

          // Format value based on type
          let formattedValue = value;
          if (typeof value === 'number') {
            if (Number.isInteger(value)) {
              formattedValue = value.toLocaleString();
            } else {
              formattedValue = value.toFixed(2);
            }
          }

          return (
            <div key={index} className="flex items-center justify-between text-sm mb-1">
              <span style={{ color: valueColor }} className="font-medium">
                {entry.name}:
              </span>
              <span className="ml-4 font-mono font-semibold" style={{ color: valueColor }}>
                {formattedValue}
              </span>
            </div>
          );
        })}
      </div>
    );
  }
  return null;
};

// Stage Configuration Modal Component - Made bigger and more comfortable
const StageConfigModal = ({ stage, isOpen, onClose, departmentColumns, onSave, currentConfig }) => {
  const [xAxis, setXAxis] = useState(currentConfig?.xAxis || '');
  const [yAxis, setYAxis] = useState(currentConfig?.yAxis || '');

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(stage.id, xAxis, yAxis);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full">
        <div className="p-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-gray-900">
              Configure {stage.name} Chart
            </h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          <div className="space-y-6">
            <div>
              <label className="text-base font-medium text-gray-700 mb-2 block">
                X-Axis (Categories)
              </label>
              <select
                value={xAxis}
                onChange={(e) => setXAxis(e.target.value)}
                className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              >
                <option value="">Select column</option>
                {departmentColumns.map(col => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-base font-medium text-gray-700 mb-2 block">
                Y-Axis (Values)
              </label>
              <select
                value={yAxis}
                onChange={(e) => setYAxis(e.target.value)}
                className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              >
                <option value="">Select column</option>
                {departmentColumns.map(col => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-8">
            <button
              onClick={onClose}
              className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors text-base"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!xAxis || !yAxis}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-base"
            >
              Apply to Stage
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Full Screen Chart Modal - Made bigger
// Full Screen Chart Modal - Made bigger
const FullScreenChartModal = ({ stage, isOpen, onClose, chartData, distribution, chartType, onChartTypeChange }) => {
  const [localChartType, setLocalChartType] = useState(chartType);

  if (!isOpen) return null;

  const handleChartTypeChange = (type) => {
    setLocalChartType(type);
    onChartTypeChange(stage.id, type);
  };

  const handleClose = () => {
    console.log('Closing modal for stage:', stage?.name);
    if (onClose) {
      onClose(); // This should call setFullScreenStage(null)
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-[1000px] max-w-6xl">
        <div className="p-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-gray-900">
              {stage?.name || 'Chart'} - Full Screen View
            </h3>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Minimize2 className="h-5 w-5 text-gray-500" />
            </button>
          </div>
          {/* Rest of the component remains the same */}
          <div className="mb-6 flex items-center space-x-3">
            <span className="text-base text-gray-600">Chart Type:</span>
            <button
              onClick={() => handleChartTypeChange('bar')}
              className={`px-4 py-2 rounded-lg text-base flex items-center ${localChartType === 'bar' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              <BarChart2 className="h-4 w-4 mr-2" />
              Bar
            </button>
            <button
              onClick={() => handleChartTypeChange('pie')}
              className={`px-4 py-2 rounded-lg text-base flex items-center ${localChartType === 'pie' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              <PieChart className="h-4 w-4 mr-2" />
              Pie
            </button>
            <button
              onClick={() => handleChartTypeChange('line')}
              className={`px-4 py-2 rounded-lg text-base flex items-center ${localChartType === 'line' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              Line
            </button>
            <button
              onClick={() => handleChartTypeChange('area')}
              className={`px-4 py-2 rounded-lg text-base flex items-center ${localChartType === 'area' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              <AreaIcon className="h-4 w-4 mr-2" />
              Area
            </button>
          </div>

          {/* Full Size Chart */}
          <div className="h-[500px] w-full">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                {localChartType === 'bar' && (
                  <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 70 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      dataKey="name"
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      interval={0}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                      wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                      layout="horizontal"
                      verticalAlign="bottom"
                      align="center"
                    />
                    {distribution.map((item, index) => (
                      <Bar
                        key={item.name}
                        dataKey={item.name}
                        stackId={item.name !== 'value' && item.name !== 'sum' && item.name !== 'average' ? "a" : undefined}
                        fill={item.color}
                        name={item.name}
                        radius={[4, 4, 0, 0]}
                      />
                    ))}
                  </BarChart>
                )}
                {localChartType === 'pie' && (
                  <RePieChart>
                    <Pie
                      data={distribution}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={200}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {distribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </RePieChart>
                )}
                {localChartType === 'line' && (
                  <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 70 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      dataKey="name"
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      interval={0}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                    {distribution.map((item) => (
                      <Line
                        key={item.name}
                        type="monotone"
                        dataKey={item.name}
                        stroke={item.color}
                        strokeWidth={2}
                        dot={{ r: 3, fill: item.color }}
                        name={item.name}
                      />
                    ))}
                  </LineChart>
                )}
                {localChartType === 'area' && (
                  <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 70 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      dataKey="name"
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      interval={0}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                    {distribution.map((item) => (
                      <Area
                        key={item.name}
                        type="monotone"
                        dataKey={item.name}
                        stackId="1"
                        stroke={item.color}
                        fill={item.color}
                        fillOpacity={0.6}
                        name={item.name}
                      />
                    ))}
                  </AreaChart>
                )}
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-50 rounded-lg border border-dashed border-gray-300">
                <p className="text-gray-500">No data available</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
// Mini Chart Component for Stage Boxes
const MiniChart = ({ chartData, statusDistribution, chartType = 'bar' }) => {
  if (!chartData || chartData.length === 0) {
    return (
      <div className="h-24 flex items-center justify-center bg-gray-50 rounded border border-gray-200">
        <BarChart2 className="h-8 w-8 text-gray-300" />
      </div>
    );
  }

  // Limit data for mini chart
  const miniData = chartData.slice(0, 5);

  return (
    <div className="h-24 w-full">
      <ResponsiveContainer width="100%" height="100%">
        {chartType === 'pie' ? (
          <RePieChart>
            <Pie
              data={statusDistribution.slice(0, 4)}
              cx="50%"
              cy="50%"
              innerRadius={20}
              outerRadius={35}
              dataKey="value"
              paddingAngle={2}
            >
              {statusDistribution.slice(0, 4).map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
          </RePieChart>
        ) : chartType === 'line' ? (
          <LineChart data={miniData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
            <Line
              type="monotone"
              dataKey={statusDistribution[0]?.name || 'value'}
              stroke={statusDistribution[0]?.color || '#2563eb'}
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        ) : chartType === 'area' ? (
          <AreaChart data={miniData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
            <Area
              type="monotone"
              dataKey={statusDistribution[0]?.name || 'value'}
              stroke={statusDistribution[0]?.color || '#2563eb'}
              fill={statusDistribution[0]?.color || '#2563eb'}
              fillOpacity={0.3}
            />
          </AreaChart>
        ) : (
          <BarChart data={miniData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
            {statusDistribution.map((item) => (
              <Bar
                key={item.name}
                dataKey={item.name}
                stackId="a"
                fill={item.color}
                radius={[2, 2, 0, 0]}
              />
            ))}
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
};

// Dashboard Configuration Modal - Made bigger, all checkboxes unchecked by default
const DashboardConfigModal = ({ isOpen, onClose, onApply, selectedProject }) => {
  const [showMilestones, setShowMilestones] = useState(false);
  const [showCriticalIssues, setShowCriticalIssues] = useState(false);
  const [showMetrics, setShowMetrics] = useState(false);
  const [selectedMetrics, setSelectedMetrics] = useState([]);

  // Reset to all unchecked when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setShowMilestones(false);
      setShowCriticalIssues(false);
      setShowMetrics(false);
      setSelectedMetrics([]);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleMetricToggle = (stageId) => {
    setSelectedMetrics(prev =>
      prev.includes(stageId)
        ? prev.filter(id => id !== stageId)
        : [...prev, stageId]
    );
  };

  const handleApply = () => {
    onApply({
      milestones: showMilestones,
      criticalIssues: showCriticalIssues,
      metrics: showMetrics,
      selectedMetrics: selectedMetrics
    });
    onClose();
  };

  const selectAllMetrics = () => {
    if (selectedMetrics.length === PROJECT_STAGES.length) {
      setSelectedMetrics([]);
    } else {
      setSelectedMetrics(PROJECT_STAGES.map(s => s.id));
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full">
        <div className="p-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-gray-900">
              Stimulate Dashboard
            </h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          <p className="text-base text-gray-600 mb-6">
            Configure what to display for {selectedProject?.name}
          </p>

          <div className="space-y-6">
            {/* Main checkboxes */}
            <div className="space-y-3">
              <label className="flex items-center p-3 hover:bg-gray-50 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={showMilestones}
                  onChange={(e) => setShowMilestones(e.target.checked)}
                  className="h-5 w-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <span className="ml-3 text-base font-medium text-gray-700">Milestones</span>
              </label>

              <label className="flex items-center p-3 hover:bg-gray-50 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={showCriticalIssues}
                  onChange={(e) => setShowCriticalIssues(e.target.checked)}
                  className="h-5 w-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <span className="ml-3 text-base font-medium text-gray-700">Critical Issues</span>
              </label>

              <label className="flex items-center p-3 hover:bg-gray-50 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={showMetrics}
                  onChange={(e) => {
                    setShowMetrics(e.target.checked);
                    if (!e.target.checked) {
                      setSelectedMetrics([]);
                    }
                  }}
                  className="h-5 w-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <span className="ml-3 text-base font-medium text-gray-700">Metrics (Visuals)</span>
              </label>
            </div>

            {/* Metrics sub-checkboxes */}
            {showMetrics && (
              <div className="ml-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-500 uppercase tracking-wider">
                    Select Metrics
                  </span>
                  <button
                    onClick={selectAllMetrics}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    {selectedMetrics.length === PROJECT_STAGES.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                  {PROJECT_STAGES.map((stage) => {
                    return (
                      <label key={stage.id} className="flex items-center p-2 hover:bg-white rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedMetrics.includes(stage.id)}
                          onChange={() => handleMetricToggle(stage.id)}
                          className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">{stage.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-3 mt-8">
            <button
              onClick={onClose}
              className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors text-base"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-base"
            >
              Apply to Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// FileHeaderConfigItem component (simplified - removed column selection)
const FileHeaderConfigItem = ({ fileModule, fileHeaderConfig, onConfigure }) => {
  const [localRowCount, setLocalRowCount] = useState(fileHeaderConfig.rowCount);

  // Preview first few rows
  const previewRows = fileModule.fileData?.data?.slice(0, 5) ||
    fileModule.fileData?.sheets?.[0]?.data?.slice(0, 5) || [];

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <h4 className="font-medium text-gray-900 mb-3">
        {fileModule.displayName || fileModule.name}
      </h4>

      {/* Header row count selector */}
      <div className="mb-4">
        <label className="text-sm font-medium text-gray-700 mb-2 block">
          Number of header rows:
        </label>
        <select
          value={localRowCount}
          onChange={(e) => setLocalRowCount(parseInt(e.target.value))}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
        >
          <option value={1}>1 row</option>
          <option value={2}>2 rows</option>
          <option value={3}>3 rows</option>
        </select>
      </div>

      {/* Header preview */}
      {localRowCount > 1 && (
        <div className="mb-4">
          <p className="text-sm font-medium text-gray-700 mb-2">
            Header rows preview:
          </p>
          <div className="border border-gray-200 rounded-lg overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <tbody className="divide-y divide-gray-200">
                {previewRows.slice(0, localRowCount).map((row, rowIndex) => (
                  <tr key={rowIndex} className="bg-gray-50">
                    {row.map((cell, colIndex) => (
                      <td key={colIndex} className="px-3 py-2 text-xs text-gray-600 border-r border-gray-200 whitespace-nowrap">
                        {cell || '(empty)'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Apply button */}
      <div className="mt-4 flex justify-end">
        <button
          onClick={() => onConfigure(fileModule.id, localRowCount, {})}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
        >
          Apply to this file
        </button>
      </div>
    </div>
  );
};

const ProjectDashboard = ({ selectedFileId, onClearSelection }) => {
  const navigate = useNavigate();
  const [projectModules, setProjectModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [trackers, setTrackers] = useState([]);
  const [uploadedFilesData, setUploadedFilesData] = useState({});

  // Project selection
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedProject, setSelectedProject] = useState(null);

  // Selected file state
  const [selectedFile, setSelectedFile] = useState({
    isSelected: false,
    fileData: null,
    trackerInfo: null,
    projectModuleId: null,
    source: null
  });

  // File data
  const [departmentFiles, setDepartmentFiles] = useState([]);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [departmentColumns, setDepartmentColumns] = useState([]);
  const [departmentEmployees, setDepartmentEmployees] = useState([]);

  // Stage-specific chart configurations
  const [stageConfigs, setStageConfigs] = useState({});
  const [stageChartData, setStageChartData] = useState({});
  const [stageDistribution, setStageDistribution] = useState({});
  const [stageChartTypes, setStageChartTypes] = useState({});

  // Dashboard configuration - Updated to start with all sections hidden
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [dashboardConfig, setDashboardConfig] = useState({
    milestones: false,
    criticalIssues: false,
    metrics: false,
    selectedMetrics: []
  });

  // Modal state
  const [configuringStage, setConfiguringStage] = useState(null);
  const [fullScreenStage, setFullScreenStage] = useState(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showHeaderConfig, setShowHeaderConfig] = useState(false);

  // Email state
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [emailSending, setEmailSending] = useState(false);
  const [emailStatus, setEmailStatus] = useState('');

  // Chart colors
  const PIE_COLORS = [
    '#2563eb', '#10b981', '#f59e0b', '#ef4444',
    '#8b5cf6', '#ec4899', '#06b6d4', '#14b8a6',
    '#f97316', '#6366f1', '#d946ef', '#0ea5e9',
    '#84cc16', '#a855f7', '#ec4899', '#64748b'
  ];

  // Function to generate a color based on string value
  const getColorForValue = (value, index) => {
    if (!value) return PIE_COLORS[index % PIE_COLORS.length];

    let hash = 0;
    for (let i = 0; i < value.length; i++) {
      hash = ((hash << 5) - hash) + value.charCodeAt(i);
      hash = hash & hash;
    }

    const colorIndex = Math.abs(hash) % PIE_COLORS.length;
    return PIE_COLORS[colorIndex];
  };

  // Function to check if a column contains numeric values
  const isNumericColumn = (values) => {
    if (!values || values.length === 0) return false;

    let numericCount = 0;
    for (const val of values) {
      if (val === null || val === undefined || val === '') continue;

      if (typeof val === 'number') {
        numericCount++;
      } else if (typeof val === 'string') {
        const cleaned = val.replace(/[$€£¥,\s]/g, '');
        if (!isNaN(parseFloat(cleaned)) && isFinite(cleaned)) {
          numericCount++;
        }
      }
    }

    return numericCount > values.length * 0.3;
  };

  // Enhanced function to extract data rows considering multi-row headers
  const extractDataRowsFromFile = (fileData, headerRowCount = 1) => {
    const rows = [];

    if (fileData.data && Array.isArray(fileData.data)) {
      const dataRows = fileData.data.slice(headerRowCount);
      const headers = extractHeadersFromFileData(fileData);

      dataRows.forEach(row => {
        if (Array.isArray(row)) {
          const rowObj = {};
          headers.forEach((header, index) => {
            if (index < row.length) {
              rowObj[header] = row[index];
            }
          });
          if (Object.values(rowObj).some(v => v !== null && v !== undefined && v !== '')) {
            rows.push(rowObj);
          }
        } else if (typeof row === 'object' && row !== null) {
          rows.push(row);
        }
      });
    } else if (fileData.sheets && fileData.sheets.length > 0) {
      const sheet = fileData.sheets[0];
      if (sheet.data && Array.isArray(sheet.data)) {
        const dataRows = sheet.data.slice(headerRowCount);
        const headers = extractHeadersFromFileData(fileData);

        dataRows.forEach(row => {
          if (Array.isArray(row)) {
            const rowObj = {};
            headers.forEach((header, index) => {
              if (index < row.length) {
                rowObj[header] = row[index];
              }
            });
            if (Object.values(rowObj).some(v => v !== null && v !== undefined && v !== '')) {
              rows.push(rowObj);
            }
          } else if (typeof row === 'object' && row !== null) {
            rows.push(row);
          }
        });
      }
    }

    return rows;
  };

  // Enhanced function to extract headers considering multi-row structure
  const extractHeadersFromFileData = (fileData) => {
    const headers = [];

    if (fileData.data && Array.isArray(fileData.data)) {
      if (fileData.headerConfig) {
        const { rowCount } = fileData.headerConfig;

        if (rowCount > 1) {
          const headerRows = fileData.data.slice(0, rowCount);

          for (let colIndex = 0; colIndex < (headerRows[0]?.length || 0); colIndex++) {
            let combinedHeader = '';

            for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
              const cellValue = headerRows[rowIndex]?.[colIndex] || '';
              if (cellValue) {
                combinedHeader += (combinedHeader ? ' - ' : '') + cellValue;
              }
            }

            headers.push(combinedHeader || `Column ${colIndex + 1}`);
          }
        } else {
          const headerRow = fileData.data[0];
          if (Array.isArray(headerRow)) {
            headerRow.forEach((cell, index) => {
              headers.push(cell || `Column ${index + 1}`);
            });
          } else if (typeof headerRow === 'object') {
            Object.keys(headerRow).forEach(key => {
              headers.push(key);
            });
          }
        }
      } else {
        if (fileData.headers && Array.isArray(fileData.headers)) {
          return fileData.headers;
        } else if (fileData.data.length > 0 && typeof fileData.data[0] === 'object') {
          return Object.keys(fileData.data[0]);
        } else {
          const firstRow = fileData.data[0];
          if (Array.isArray(firstRow)) {
            firstRow.forEach((cell, index) => {
              headers.push(cell || `Column ${index + 1}`);
            });
          }
        }
      }
    } else if (fileData.sheets && fileData.sheets.length > 0) {
      const sheet = fileData.sheets[0];
      if (sheet.headers && Array.isArray(sheet.headers)) {
        return sheet.headers;
      }

      if (sheet.data && sheet.data.length > 0) {
        if (sheet.headerConfig) {
          const { rowCount } = sheet.headerConfig;

          if (rowCount > 1) {
            const headerRows = sheet.data.slice(0, rowCount);

            for (let colIndex = 0; colIndex < (headerRows[0]?.length || 0); colIndex++) {
              let combinedHeader = '';

              for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
                const cellValue = headerRows[rowIndex]?.[colIndex] || '';
                if (cellValue) {
                  combinedHeader += (combinedHeader ? ' - ' : '') + cellValue;
                }
              }

              headers.push(combinedHeader || `Column ${colIndex + 1}`);
            }
          } else {
            const headerRow = sheet.data[0];
            if (Array.isArray(headerRow)) {
              headerRow.forEach((cell, index) => {
                headers.push(cell || `Column ${index + 1}`);
              });
            }
          }
        } else {
          const firstRow = sheet.data[0];
          if (Array.isArray(firstRow)) {
            firstRow.forEach((cell, index) => {
              headers.push(cell || `Column ${index + 1}`);
            });
          }
        }
      }
    }

    return headers;
  };

  // Function to extract all rows from department files
  const extractAllRows = () => {
    let allRows = [];

    departmentFiles.forEach((file) => {
      const fileHeaderCount = file.fileData?.headerConfig?.rowCount || 1;
      const dataRows = extractDataRowsFromFile(file.fileData, fileHeaderCount);
      allRows = [...allRows, ...dataRows];
    });

    return allRows;
  };

  // Enhanced function to generate chart data
  const generateEnhancedChartData = (departmentFiles, xAxis, yAxis) => {
    try {
      if (departmentFiles.length === 0 || !xAxis || !yAxis) {
        return [];
      }

      let allRows = [];
      departmentFiles.forEach((file) => {
        const fileHeaderCount = file.fileData?.headerConfig?.rowCount || 1;
        const dataRows = extractDataRowsFromFile(file.fileData, fileHeaderCount);
        allRows = [...allRows, ...dataRows];
      });

      const yValues = allRows.map(row => row[yAxis]).filter(v => v !== undefined && v !== null);
      const isYAxisNumeric = isNumericColumn(yValues);

      const xValues = allRows.map(row => row[xAxis]).filter(v => v !== undefined && v !== null);
      const uniqueXValues = [...new Set(xValues.map(v => String(v)))];

      if (isYAxisNumeric) {
        const aggregatedData = {};

        allRows.forEach(row => {
          const xValue = row[xAxis];
          let yValue = row[yAxis];

          if (xValue === undefined || xValue === null) return;

          let numericValue = 0;
          if (yValue !== undefined && yValue !== null && yValue !== '') {
            if (typeof yValue === 'number') {
              numericValue = yValue;
            } else if (typeof yValue === 'string') {
              const cleaned = yValue.replace(/[$€£¥,\s]/g, '');
              const match = cleaned.match(/^(\d+(\.\d+)?)/);
              if (match) {
                numericValue = parseFloat(match[1]);
              }
            }
          }

          const key = String(xValue);

          if (!aggregatedData[key]) {
            aggregatedData[key] = {
              name: String(xValue).substring(0, 30) + (String(xValue).length > 30 ? '...' : ''),
              fullName: xValue,
              value: 0,
              count: 0,
              sum: 0
            };
          }

          aggregatedData[key].sum += numericValue;
          aggregatedData[key].count += 1;
          aggregatedData[key].value = aggregatedData[key].sum;
        });

        Object.values(aggregatedData).forEach(item => {
          item.average = item.count > 0 ? item.sum / item.count : 0;
        });

        return Object.values(aggregatedData);
      } else {
        const uniqueYValues = [...new Set(allRows.map(row => {
          const val = row[yAxis];
          return val !== undefined && val !== null && val !== '' ? String(val) : null;
        }).filter(v => v !== null))];

        const chartDataArray = uniqueXValues.map(xValue => {
          const item = {
            name: String(xValue).substring(0, 30) + (String(xValue).length > 30 ? '...' : ''),
            fullName: xValue,
            total: 0
          };

          uniqueYValues.forEach(yValue => {
            item[yValue] = 0;
          });

          return item;
        });

        allRows.forEach(row => {
          const xValue = row[xAxis];
          const yValue = row[yAxis];

          if (xValue === undefined || xValue === null) return;

          if (yValue === undefined || yValue === null || yValue === '') {
            const xIndex = uniqueXValues.findIndex(x => String(x) === String(xValue));
            if (xIndex !== -1) {
              chartDataArray[xIndex].total += 1;
            }
            return;
          }

          const xIndex = uniqueXValues.findIndex(x => String(x) === String(xValue));
          if (xIndex !== -1) {
            const yKey = String(yValue);
            if (chartDataArray[xIndex][yKey] !== undefined) {
              chartDataArray[xIndex][yKey] += 1;
              chartDataArray[xIndex].total += 1;
            }
          }
        });

        return chartDataArray;
      }
    } catch (error) {
      console.error('Error generating enhanced chart data:', error);
      return [];
    }
  };

  // Generate distribution data
  const generateDistribution = (chartData, xAxis, yAxis, allRows) => {
    if (!chartData || chartData.length === 0) return [];

    const yValues = allRows.map(row => row[yAxis]).filter(v => v !== undefined && v !== null && v !== '');
    const isYAxisNumeric = isNumericColumn(yValues);

    if (isYAxisNumeric) {
      return chartData.map((item, index) => ({
        name: item.fullName || item.name,
        value: item.sum || item.value,
        color: getColorForValue(item.fullName || item.name, index),
        count: item.count || 1
      }));
    } else {
      const distribution = {};

      chartData.forEach(item => {
        Object.keys(item).forEach(key => {
          if (key !== 'name' && key !== 'fullName' && key !== 'total' && typeof item[key] === 'number') {
            if (!distribution[key]) {
              distribution[key] = 0;
            }
            distribution[key] += item[key];
          }
        });
      });

      return Object.entries(distribution)
        .map(([name, value], index) => ({
          name,
          value,
          color: getColorForValue(name, index),
          count: value
        }))
        .sort((a, b) => b.value - a.value);
    }
  };

  // Handle project selection - Updated to reset dashboard config to all hidden
  const handleProjectSelect = (projectId) => {
    const project = projectModules.find(p => p.id === projectId);
    setSelectedProjectId(projectId);
    setSelectedProject(project);

    setSelectedFile({
      isSelected: false,
      fileData: null,
      trackerInfo: null,
      projectModuleId: null,
      source: null
    });

    // Get all files from the project
    if (project && project.submodules && Array.isArray(project.submodules)) {
      const files = [];
      project.submodules.forEach((fileModule) => {
        const trackerInfo = getTrackerInfo(fileModule.trackerId);
        const fileData = uploadedFilesData[fileModule.trackerId];
        if (trackerInfo && fileData) {
          files.push({
            ...fileModule,
            trackerInfo,
            fileData: fileData,
            projectName: project.name
          });
        }
      });

      setDepartmentFiles(files);

      // Extract columns from all files
      const columns = extractColumnsFromFiles(files);
      setDepartmentColumns(columns);

      // Extract employees from all files
      const employees = extractEmployeesFromFiles(files);
      setDepartmentEmployees(employees);

      // Reset stage configs when changing project
      setStageConfigs({});
      setStageChartData({});
      setStageDistribution({});
      setStageChartTypes({});

      // Reset dashboard config to all hidden
      setDashboardConfig({
        milestones: false,
        criticalIssues: false,
        metrics: false,
        selectedMetrics: []
      });
    } else {
      setDepartmentFiles([]);
      setDepartmentColumns([]);
      setDepartmentEmployees([]);
    }

    setSelectedEmployees([]);

    // Show config modal after project selection
    setShowConfigModal(true);
  };

  // Handle dashboard configuration apply - Updated to only show what was selected
  const handleDashboardConfigApply = (config) => {
    // Only set the sections that were checked to true, others remain false
    setDashboardConfig({
      milestones: config.milestones || false,
      criticalIssues: config.criticalIssues || false,
      metrics: config.metrics || false,
      selectedMetrics: config.selectedMetrics || []
    });
  };

  // Handle stage configuration
  const handleStageConfig = (stageId, xAxis, yAxis) => {
    const newConfigs = {
      ...stageConfigs,
      [stageId]: { xAxis, yAxis }
    };
    setStageConfigs(newConfigs);

    // Generate chart data for this stage
    if (departmentFiles.length > 0 && xAxis && yAxis) {
      const allRows = extractAllRows();
      const data = generateEnhancedChartData(departmentFiles, xAxis, yAxis);
      const distribution = generateDistribution(data, xAxis, yAxis, allRows);

      setStageChartData({
        ...stageChartData,
        [stageId]: data
      });

      setStageDistribution({
        ...stageDistribution,
        [stageId]: distribution
      });
    }
  };

  // Handle chart type change for a stage
  const handleChartTypeChange = (stageId, chartType) => {
    setStageChartTypes({
      ...stageChartTypes,
      [stageId]: chartType
    });
  };

  // Handle full screen view
  const handleFullScreen = (stage) => {
    setFullScreenStage(stage);
  };

  // Handle dashboard click - Updated to reset dashboard config to all hidden
  const handleDashboardClick = () => {
    setSelectedFile({
      isSelected: false,
      fileData: null,
      trackerInfo: null,
      projectModuleId: null,
      source: null
    });

    setSelectedProjectId('');
    setSelectedProject(null);
    setDepartmentFiles([]);
    setDepartmentColumns([]);
    setDepartmentEmployees([]);
    setStageConfigs({});
    setStageChartData({});
    setStageDistribution({});
    setStageChartTypes({});
    setSelectedEmployees([]);

    // Reset dashboard config to all hidden
    setDashboardConfig({
      milestones: false,
      criticalIssues: false,
      metrics: false,
      selectedMetrics: []
    });

  };

  // Extract columns from files
  const extractColumnsFromFiles = (files) => {
    const columnsSet = new Set();

    files.forEach((file) => {
      if (!file.fileData) return;

      const headers = extractHeadersFromFileData(file.fileData);
      headers.forEach(col => {
        if (col && col.trim() !== '') {
          columnsSet.add(col);
        }
      });
    });

    return Array.from(columnsSet);
  };

  const extractEmployeesFromFiles = (files) => {
    const employeesSet = new Set();
    files.forEach(file => {
      if (file.trackerInfo) {
        employeesSet.add(JSON.stringify({
          id: file.trackerInfo.id,
          name: file.trackerInfo.employeeName || 'Unknown',
          email: file.trackerInfo.employeeEmail || `${file.trackerInfo.employeeName?.toLowerCase().replace(/\s+/g, '.')}@company.com`,
          department: file.trackerInfo.department,
          project: selectedProject?.name,
          uploadDate: file.trackerInfo.uploadDate
        }));
      }
    });
    return Array.from(employeesSet).map(e => JSON.parse(e));
  };

  // Configure file headers
  const configureFileHeaders = (fileModule, rowCount, selectedHeaders) => {
    const updatedFileData = {
      ...fileModule.fileData,
      headerConfig: {
        rowCount
      }
    };

    const newFilesData = {
      ...uploadedFilesData,
      [fileModule.trackerId]: updatedFileData
    };

    setUploadedFilesData(newFilesData);
    localStorage.setItem('uploaded_files_data', JSON.stringify(newFilesData));

    const updatedFiles = departmentFiles.map(f =>
      f.trackerId === fileModule.trackerId ? { ...f, fileData: updatedFileData } : f
    );
    setDepartmentFiles(updatedFiles);

    const columns = extractColumnsFromFiles(updatedFiles);
    setDepartmentColumns(columns);

    setShowHeaderConfig(false);

    // Regenerate all stage charts with new data
    const allRows = extractAllRows();
    const newStageChartData = {};
    const newStageDistribution = {};

    Object.entries(stageConfigs).forEach(([stageId, config]) => {
      if (config.xAxis && config.yAxis) {
        const data = generateEnhancedChartData(updatedFiles, config.xAxis, config.yAxis);
        const distribution = generateDistribution(data, config.xAxis, config.yAxis, allRows);
        newStageChartData[stageId] = data;
        newStageDistribution[stageId] = distribution;
      }
    });

    setStageChartData(newStageChartData);
    setStageDistribution(newStageDistribution);

    alert('Header configuration saved successfully!');
  };

  // Handle email sending
  const handleSendEmail = async () => {
    if (selectedEmployees.length === 0) {
      setEmailStatus('Please select at least one recipient');
      return;
    }

    setEmailSending(true);
    setEmailStatus('Sending...');

    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      setEmailStatus('Email sent successfully!');
      setTimeout(() => {
        setShowEmailModal(false);
        setEmailStatus('');
        setEmailSubject('');
        setEmailBody('');
        setSelectedEmployees([]);
      }, 2000);
    } catch (error) {
      setEmailStatus('Failed to send email');
    } finally {
      setEmailSending(false);
    }
  };

  const toggleEmployeeSelection = (employeeId) => {
    setSelectedEmployees(prev =>
      prev.includes(employeeId)
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  const selectAllEmployees = () => {
    if (selectedEmployees.length === departmentEmployees.length) {
      setSelectedEmployees([]);
    } else {
      setSelectedEmployees(departmentEmployees.map(e => e.id));
    }
  };

  // Load data
  const loadProjectModules = () => {
    try {
      const savedModules = localStorage.getItem('project_dashboard_modules');
      const allModules = savedModules ? JSON.parse(savedModules) : [];

      const projectModules = allModules.filter(m =>
        m.type === 'project' && m.context === 'project-dashboard'
      );

      setProjectModules(projectModules);

      const savedTrackers = localStorage.getItem('upload_trackers');
      setTrackers(savedTrackers ? JSON.parse(savedTrackers) : []);

      const savedFilesData = localStorage.getItem('uploaded_files_data');
      setUploadedFilesData(savedFilesData ? JSON.parse(savedFilesData) : {});
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjectModules();

    const handleUpdate = () => loadProjectModules();
    window.addEventListener('projectDashboardUpdate', handleUpdate);

    return () => window.removeEventListener('projectDashboardUpdate', handleUpdate);
  }, []);

  // File event handling
  useEffect(() => {
    const handleOpenFile = (event) => {
      const { trackerId, source } = event.detail;
      if (source && source !== 'project-dashboard') return;

      const tracker = trackers.find(t => t.id === trackerId);
      const fileData = uploadedFilesData[trackerId];

      if (!tracker || !fileData) return;

      let projectModule = null;
      for (const proj of projectModules) {
        if (proj.submodules?.some(f => f.trackerId === trackerId)) {
          projectModule = proj;
          break;
        }
      }

      setSelectedFile({
        isSelected: true,
        fileData: fileData,
        trackerInfo: tracker,
        projectModuleId: projectModule?.moduleId || null,
        source: 'project-dashboard'
      });
      if (projectModule) {
        setSelectedProjectId(projectModule.id);
        setSelectedProject(projectModule);
      }

      // ==========================================================================
      // When opening a file, we're coming FROM project dashboard
      // ==========================================================================
      setCameFromEmptyState(false);
    };

    window.addEventListener('openProjectDashboardFile', handleOpenFile);
    return () => window.removeEventListener('openProjectDashboardFile', handleOpenFile);
  }, [trackers, uploadedFilesData, projectModules]);

  useEffect(() => {
    if (!selectedFileId || loading) return;
    const tracker = trackers.find(t => t.id === selectedFileId);
    const fileData = uploadedFilesData[selectedFileId];
    if (!tracker || !fileData) return;
    let projectModule = null;
    for (const proj of projectModules) {
      if (proj.submodules?.some(f => f.trackerId === selectedFileId)) {
        projectModule = proj;
        break;
      }
    }
    setSelectedFile({
      isSelected: true,
      fileData: fileData,
      trackerInfo: tracker,
      projectModuleId: projectModule?.moduleId || null,
      source: 'project-dashboard'
    });
    if (projectModule) {
      setSelectedProjectId(projectModule.id);
      setSelectedProject(projectModule);
    }
  }, [selectedFileId, loading, trackers, uploadedFilesData, projectModules]);

  // Handle file click
  const handleFileClick = (fileModule, projectModule) => {
    const trackerInfo = getTrackerInfo(fileModule.trackerId);
    const fileData = uploadedFilesData[fileModule.trackerId];

    if (!trackerInfo || !fileData) return;

    setSelectedFile({
      isSelected: true,
      fileData: fileData,
      trackerInfo: trackerInfo,
      projectModuleId: projectModule.moduleId,
      source: 'project-dashboard'
    });
  };

  // ==========================================================================
  // HANDLER 1: When coming FROM empty state TO file and back TO empty state
  // ==========================================================================
  const handleCloseFileViewerToEmpty = () => {
    setSelectedFile({
      isSelected: false,
      fileData: null,
      trackerInfo: null,
      projectModuleId: null,
      source: null
    });

    // Reset everything to go to empty state
    setSelectedProjectId('');
    setSelectedProject(null);
    setDepartmentFiles([]);
    setDepartmentColumns([]);
    setDepartmentEmployees([]);
    setStageConfigs({});
    setStageChartData({});
    setStageDistribution({});
    setStageChartTypes({});
    setSelectedEmployees([]);

    setDashboardConfig({
      milestones: false,
      criticalIssues: false,
      metrics: false,
      selectedMetrics: []
    });

    // Notify Dashboard to clear selection and stay in project dashboard
    window.dispatchEvent(new CustomEvent('closeProjectDashboardFile', { detail: { from: 'projectDashboard' } }));
  };

  // ==========================================================================
  // HANDLER 2: When coming FROM project dashboard TO file and back TO project dashboard
  // ==========================================================================
  const handleCloseFileViewerToProject = () => {
    setSelectedFile({
      isSelected: false,
      fileData: null,
      trackerInfo: null,
      projectModuleId: null,
      source: null
    });
    // DO NOT reset anything else - keep the project and all its data
    // Notify Dashboard to clear selection highlight and header
    window.dispatchEvent(new CustomEvent('closeProjectDashboardFile', { detail: { from: 'projectDashboard' } }));
  };

  const handleSaveFileData = (trackerId, updatedFileData) => {
    const newFilesData = { ...uploadedFilesData, [trackerId]: updatedFileData };
    setUploadedFilesData(newFilesData);
    localStorage.setItem('uploaded_files_data', JSON.stringify(newFilesData));

    if (selectedFile.trackerInfo?.id === trackerId) {
      setSelectedFile(prev => ({ ...prev, fileData: updatedFileData }));
    }

    if (selectedProject) {
      // Refresh files
      const files = [];
      if (selectedProject.submodules && Array.isArray(selectedProject.submodules)) {
        selectedProject.submodules.forEach((fileModule) => {
          const trackerInfo = getTrackerInfo(fileModule.trackerId);
          const fileData = newFilesData[fileModule.trackerId];
          if (trackerInfo && fileData) {
            files.push({
              ...fileModule,
              trackerInfo,
              fileData: fileData,
              projectName: selectedProject.name
            });
          }
        });
      }
      setDepartmentFiles(files);

      const columns = extractColumnsFromFiles(files);
      setDepartmentColumns(columns);
    }
  };

  const getTrackerInfo = (trackerId) => {
    return trackers.find(t => t.id === trackerId);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 60%, #1e40af 100%)' }}>
        <div className="text-center">
          <div className="relative mx-auto mb-6" style={{ width: 64, height: 64 }}>
            <div className="absolute inset-0 rounded-full border-4 border-blue-900"></div>
            <div className="absolute inset-0 rounded-full border-4 border-t-blue-400 border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
            <div className="absolute inset-2 rounded-full" style={{ background: 'rgba(59,130,246,0.15)' }}></div>
          </div>
          <h3 className="text-lg font-semibold text-white tracking-wide">Loading Projects</h3>
          <p className="text-blue-300 text-sm mt-1">Fetching your workspace data…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: '#f0f4f8' }}>
      {/* Top Bar */}
      {!selectedFile.isSelected && (
        <div className="bg-white px-6 py-3" style={{ borderBottom: '1px solid #e2e8f0' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg" style={{ background: '#eef2ff' }}>
                <BarChart2 className="h-4 w-4 text-indigo-500" />
              </div>
              <span className="text-slate-700 font-semibold text-sm">Industrial Analytics Platform</span>
              <span className="text-slate-400 text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: '#f1f5f9', border: '1px solid #e2e8f0' }}>Project Dashboard</span>
            </div>

            {/* Project Selector */}
            <div className="flex items-center gap-3">
              {projectModules.length === 0 ? (
                <button
                  onClick={() => navigate('/dashboard', { state: { module: 'upload-trackers' } })}
                  className="px-4 py-2 bg-indigo-500 text-white rounded-lg text-sm flex items-center font-medium hover:bg-indigo-600 transition-colors"
                >
                  <File className="h-4 w-4 mr-2" />
                  Upload Trackers
                </button>
              ) : (
                <div className="relative">
                  <select
                    value={selectedProjectId}
                    onChange={(e) => handleProjectSelect(e.target.value)}
                    className="appearance-none pl-4 pr-10 py-2 text-sm font-medium text-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 cursor-pointer bg-white"
                    style={{ border: '1px solid #d1d5db', minWidth: '280px' }}
                  >
                    <option value="">— Select a project —</option>
                    {projectModules.map(project => (
                      <option key={project.id} value={project.id}>
                        {project.name} ({project.submodules?.length || 0} files)
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="p-6" style={{ minHeight: 'calc(100vh - 56px)' }}>
        {selectedProject ? (
          <div>
            {/* File Viewer (if file selected) */}
            {selectedFile.isSelected && selectedFile.source === 'project-dashboard' && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                <div className="p-4 h-[calc(100vh-240px)] overflow-auto">
                  <FileContentViewer
                    fileData={selectedFile.fileData}
                    trackerInfo={selectedFile.trackerInfo}
                    onBack={handleCloseFileViewerToEmpty}
                    onSaveData={(updatedData) => {
                      if (selectedFile.trackerInfo) {
                        handleSaveFileData(selectedFile.trackerInfo.id, updatedData);
                      }
                    }}
                    viewOnly={false}
                    context="project"
                  />
                </div>
              </div>
            )}

            {/* Main Project Container - Only show when no file is selected */}
            {!selectedFile.isSelected && (
              <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0' }}>
                {/* Project Header */}
                <div className="px-7 py-5" style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-11 h-11 rounded-xl" style={{ background: '#eef2ff', border: '1px solid #e0e7ff' }}>
                        <Folder className="h-5 w-5 text-indigo-500" />
                      </div>
                      <div>
                        <p className="text-slate-400 text-xs font-medium uppercase tracking-widest mb-0.5">Active Project</p>
                        <h2 className="text-xl font-bold text-slate-800 leading-tight">{selectedProject.name}</h2>
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className="flex items-center gap-1 text-xs text-slate-400">
                            <Database className="h-3 w-3" />
                            {departmentFiles.length} Trackers
                          </span>
                          <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                          <span className="flex items-center gap-1 text-xs text-slate-400">
                            <Users className="h-3 w-3" />
                            {departmentColumns.length} Data Fields
                          </span>
                          <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                          <span className="flex items-center gap-1 text-xs text-emerald-500">
                            <Activity className="h-3 w-3" />
                            Active
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowConfigModal(true)}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-slate-600 bg-white hover:bg-slate-50 transition-colors"
                        style={{ border: '1px solid #d1d5db' }}
                      >
                        <Sliders className="h-4 w-4 text-slate-400" />
                        Stimulate Dashboard
                      </button>
                      <button
                        onClick={() => setShowEmailModal(true)}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-indigo-500 hover:bg-indigo-600 transition-colors"
                      >
                        <Send className="h-4 w-4" />
                        Send Report
                      </button>
                    </div>
                  </div>
                </div>

                {/* Content Area */}
                <div className="p-7 space-y-8" style={{ background: '#f8fafc' }}>

                  {/* ── MILESTONES SECTION ── */}
                  {dashboardConfig.milestones && (
                    <div className="rounded-2xl overflow-hidden" style={{ boxShadow: '0 2px 16px rgba(15,23,42,0.08)', border: '1px solid #e2e8f0' }}>
                      {/* Card Header */}
                      <div className="flex items-center justify-between px-6 py-4" style={{ background: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-8 h-8 rounded-lg" style={{ background: '#e0e7ff' }}>
                            <Calendar className="h-4 w-4 text-indigo-500" />
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-slate-700 tracking-wide">Major Milestones</h3>
                            <p className="text-slate-400 text-xs">Project Timeline Overview</p>
                          </div>
                        </div>
                        {/* Legend inline */}
                        <div className="flex items-center gap-4">
                          {[
                            { color: '#86efac', label: 'Completed' },
                            { color: '#fde68a', label: 'Delayed' },
                            { color: '#fca5a5', label: 'At Risk' },
                          ].map(l => (
                            <span key={l.label} className="flex items-center gap-1.5 text-xs text-slate-500">
                              <span className="inline-block w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: l.color }}></span>
                              {l.label}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Table */}
                      <div className="overflow-x-auto">
                        <table className="min-w-full border-collapse" style={{ tableLayout: 'fixed', minWidth: '960px' }}>
                          <colgroup>
                            <col style={{ width: '148px' }} />
                            {MILESTONE_STAGES.map(s => <col key={s.id} style={{ width: '88px' }} />)}
                          </colgroup>
                          <thead>
                            <tr style={{ background: '#e8edf3' }}>
                              <th
                                className="py-2.5 px-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider"
                                style={{ borderRight: '1px solid #d5dce6' }}
                              >
                                Phase
                              </th>
                              {MILESTONE_STAGES.map(stage => (
                                <th
                                  key={stage.id}
                                  className="py-2.5 px-2 text-center text-xs font-semibold text-slate-600 leading-tight"
                                  style={{ borderRight: '1px solid #d5dce6' }}
                                >
                                  {stage.label}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {/* Plan row */}
                            <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}>
                              <td
                                className="py-3 px-4 text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap"
                                style={{ borderRight: '1px solid #e2e8f0' }}
                              >
                                Plan
                              </td>
                              {MILESTONE_STAGES.map(stage => (
                                <td
                                  key={stage.id}
                                  className="py-3 px-2 text-center text-xs text-slate-600 font-medium"
                                  style={{ borderRight: '1px solid #e2e8f0' }}
                                >
                                  {MILESTONE_PLAN[stage.id] || <span className="text-slate-300">—</span>}
                                </td>
                              ))}
                            </tr>
                            {/* Actual / Outlook row */}
                            <tr style={{ background: '#fff' }}>
                              <td
                                className="py-3 px-4 text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap"
                                style={{ borderRight: '1px solid #e2e8f0' }}
                              >
                                Actual / Outlook
                              </td>
                              {MILESTONE_STAGES.map(stage => {
                                const cell = MILESTONE_ACTUAL[stage.id];
                                const cfg = {
                                  done: { bg: '#dcfce7', border: '#86efac', text: '#166534' },
                                  delayed: { bg: '#fef9c3', border: '#fde047', text: '#854d0e' },
                                  'at-risk': { bg: '#fee2e2', border: '#fca5a5', text: '#991b1b' },
                                }[cell?.status] || { bg: 'transparent', border: '#e2e8f0', text: '#64748b' };
                                return (
                                  <td
                                    key={stage.id}
                                    className="py-3 px-1.5 text-center text-xs font-semibold"
                                    style={{ borderRight: '1px solid #e2e8f0' }}
                                  >
                                    {cell?.value ? (
                                      <span
                                        className="inline-flex items-center justify-center w-full px-1.5 py-1 rounded-md text-xs font-semibold leading-tight"
                                        style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.text }}
                                      >
                                        {cell.value === '✔' ? (
                                          <CheckCircle className="h-3.5 w-3.5" />
                                        ) : cell.value}
                                      </span>
                                    ) : (
                                      <span className="text-slate-300">—</span>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* ── CRITICAL ISSUES SECTION ── */}
                  {dashboardConfig.criticalIssues && (
                    <div className="rounded-2xl overflow-hidden" style={{ boxShadow: '0 2px 16px rgba(15,23,42,0.08)', border: '1px solid #e2e8f0' }}>
                      {/* Card Header */}
                      <div className="flex items-center justify-between px-6 py-4" style={{ background: '#fef2f2', borderBottom: '1px solid #fecdd3' }}>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-8 h-8 rounded-lg" style={{ background: '#fee2e2' }}>
                            <AlertTriangle className="h-4 w-4 text-red-400" />
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-slate-700 tracking-wide">Top Critical Issues</h3>
                            <p className="text-slate-400 text-xs">{DUMMY_ISSUES.length} active issues requiring attention</p>
                          </div>
                        </div>
                        <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca' }}>
                          {DUMMY_ISSUES.filter(i => i.status === 'Open').length} Open
                        </span>
                      </div>

                      {/* Table */}
                      <div className="overflow-x-auto">
                        <table className="min-w-full border-collapse">
                          <thead>
                            <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                              <th className="py-3 px-4 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider w-14" style={{ borderRight: '1px solid #e5e7eb' }}>S.No</th>
                              <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider" style={{ borderRight: '1px solid #e5e7eb' }}>Issue Description</th>
                              <th className="py-3 px-4 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider w-28" style={{ borderRight: '1px solid #e5e7eb' }}>Responsible</th>
                              <th className="py-3 px-4 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider w-40" style={{ borderRight: '1px solid #e5e7eb' }}>Support Required</th>
                              <th className="py-3 px-4 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider w-36" style={{ borderRight: '1px solid #e5e7eb' }}>From Whom</th>
                              <th className="py-3 px-4 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider w-28">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {DUMMY_ISSUES.map((issue, idx) => (
                              <tr
                                key={issue.id}
                                style={{
                                  verticalAlign: 'top',
                                  background: idx % 2 === 0 ? '#ffffff' : '#fffbfb',
                                  borderBottom: '1px solid #fee2e2',
                                  transition: 'background 0.15s'
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = '#fff5f5'}
                                onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? '#ffffff' : '#fffbfb'}
                              >
                                {/* S.No badge */}
                                <td className="py-4 px-4 text-center" style={{ borderRight: '1px solid #fee2e2' }}>
                                  <span
                                    className="inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold text-white"
                                    style={{ background: 'linear-gradient(135deg,#dc2626,#b91c1c)', boxShadow: '0 2px 6px rgba(220,38,38,0.35)' }}
                                  >
                                    {issue.id}
                                  </span>
                                </td>

                                {/* Issue text */}
                                <td
                                  className="py-4 px-4 text-sm text-slate-700 leading-relaxed whitespace-pre-line"
                                  style={{ borderRight: '1px solid #fee2e2', maxWidth: '440px' }}
                                >
                                  {issue.issue}
                                </td>

                                {/* Resp */}
                                <td className="py-4 px-4 text-center" style={{ borderRight: '1px solid #fee2e2' }}>
                                  <span className="inline-flex items-center justify-center gap-1 text-xs font-semibold text-slate-600 px-2.5 py-1 rounded-full" style={{ background: '#f1f5f9', border: '1px solid #e2e8f0' }}>
                                    <User className="h-3 w-3 text-slate-400" />
                                    {issue.resp}
                                  </span>
                                </td>

                                {/* Support Required */}
                                <td className="py-4 px-4 text-center text-xs text-slate-600 font-medium" style={{ borderRight: '1px solid #fee2e2' }}>
                                  {issue.supportRequired}
                                </td>

                                {/* From Whom */}
                                <td className="py-4 px-4 text-center" style={{ borderRight: '1px solid #fee2e2' }}>
                                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 px-2.5 py-1 rounded-full" style={{ background: '#eef2ff', border: '1px solid #c7d2fe' }}>
                                    <Users className="h-3 w-3" />
                                    {issue.fromWhom}
                                  </span>
                                </td>

                                {/* Status */}
                                <td className="py-4 px-4 text-center">
                                  {(() => {
                                    const s = issue.status;
                                    const cfg = s === 'In Progress'
                                      ? { bg: '#dbeafe', border: '#93c5fd', text: '#1e40af', dot: '#3b82f6' }
                                      : s === 'Open'
                                        ? { bg: '#fef9c3', border: '#fde047', text: '#854d0e', dot: '#eab308' }
                                        : s === 'Resolved'
                                          ? { bg: '#dcfce7', border: '#86efac', text: '#166534', dot: '#22c55e' }
                                          : { bg: '#f1f5f9', border: '#e2e8f0', text: '#64748b', dot: '#94a3b8' };
                                    return (
                                      <span
                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold"
                                        style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.text }}
                                      >
                                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: cfg.dot }}></span>
                                        {s}
                                      </span>
                                    );
                                  })()}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Project Stages with Embedded Charts - Only show selected metrics */}
                  {dashboardConfig.metrics && dashboardConfig.selectedMetrics.length > 0 && departmentColumns.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Project Metrics
                      </h3>
                      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                        {PROJECT_STAGES.filter(stage => dashboardConfig.selectedMetrics.includes(stage.id)).map((stage) => {
                          const stageConfig = stageConfigs[stage.id] || {};
                          const chartData = stageChartData[stage.id] || [];
                          const distribution = stageDistribution[stage.id] || [];
                          const chartType = stageChartTypes[stage.id] || 'bar';
                          const hasConfig = stageConfig.xAxis && stageConfig.yAxis;

                          const colorClasses = {
                            blue: 'border-blue-200 bg-blue-50',
                            purple: 'border-purple-200 bg-purple-50',
                            green: 'border-green-200 bg-green-50',
                            orange: 'border-orange-200 bg-orange-50',
                            red: 'border-red-200 bg-red-50',
                            teal: 'border-teal-200 bg-teal-50',
                          };

                          return (
                            <div
                              key={stage.id}
                              className={`border rounded-xl overflow-hidden ${colorClasses[stage.color]}`}
                            >
                              {/* Stage Header */}
                              <div className="p-3 border-b border-gray-200 bg-white bg-opacity-50">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center">
                                    <h4 className="font-medium text-gray-900">{stage.name}</h4>
                                  </div>
                                  <div className="flex items-center space-x-1">
                                    <button
                                      onClick={() => handleFullScreen(stage)}
                                      className="p-1.5 bg-white rounded-lg hover:bg-gray-100 transition-colors border border-gray-200"
                                      title="Full screen view"
                                    >
                                      <Maximize2 className="h-4 w-4 text-gray-600" />
                                    </button>
                                    <button
                                      onClick={() => setConfiguringStage(stage)}
                                      className="p-1.5 bg-white rounded-lg hover:bg-gray-100 transition-colors border border-gray-200"
                                      title="Configure chart"
                                    >
                                      <Settings2 className="h-4 w-4 text-gray-600" />
                                    </button>
                                  </div>
                                </div>
                                {hasConfig && (
                                  <p className="text-xs text-gray-500 mt-1 truncate">
                                    {stageConfig.xAxis} vs {stageConfig.yAxis}
                                  </p>
                                )}
                              </div>

                              {/* Chart Area */}
                              <div className="p-3">
                                {hasConfig ? (
                                  chartData.length > 0 ? (
                                    <MiniChart
                                      chartData={chartData}
                                      statusDistribution={distribution}
                                      chartType={chartType}
                                    />
                                  ) : (
                                    <div className="h-24 flex items-center justify-center bg-white bg-opacity-50 rounded border border-gray-200">
                                      <p className="text-xs text-gray-400">No data available</p>
                                    </div>
                                  )
                                ) : (
                                  <div className="h-24 flex items-center justify-center bg-white bg-opacity-50 rounded border border-gray-200">
                                    <button
                                      onClick={() => setConfiguringStage(stage)}
                                      className="text-xs text-blue-600 hover:text-blue-800 flex items-center"
                                    >
                                      <Settings2 className="h-3 w-3 mr-1" />
                                      Configure axes
                                    </button>
                                  </div>
                                )}
                              </div>

                              {/* Stats Footer */}
                              {hasConfig && chartData.length > 0 && (
                                <div className="px-3 pb-3">
                                  <div className="flex justify-between text-xs">
                                    <span className="text-gray-500">Categories:</span>
                                    <span className="font-medium text-gray-900">{chartData.length}</span>
                                  </div>
                                  <div className="flex justify-between text-xs">
                                    <span className="text-gray-500">Groups:</span>
                                    <span className="font-medium text-gray-900">{distribution.length}</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          // Empty State
          !selectedFile.isSelected && (
            <div
              className="rounded-2xl p-16 text-center"
              style={{ background: 'linear-gradient(135deg,#ffffff 0%,#f0f4ff 100%)', border: '1px solid #e0e7ff', boxShadow: '0 4px 24px rgba(15,23,42,0.06)' }}
            >
              <div
                className="mx-auto mb-6 flex items-center justify-center w-20 h-20 rounded-2xl"
                style={{ background: 'linear-gradient(135deg,#e0e7ff,#c7d2fe)', boxShadow: '0 4px 16px rgba(99,102,241,0.2)' }}
              >
                <Layout className="h-9 w-9 text-indigo-500" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">No Project Selected</h3>
              <p className="text-slate-500 mb-8 max-w-sm mx-auto">Select a project from the dropdown above to view your analytics dashboard and project timelines.</p>
              <div className="flex items-center justify-center gap-3">
                {projectModules.length === 0 ? (
                  <button
                    onClick={() => navigate('/dashboard', { state: { module: 'upload-trackers' } })}
                    className="inline-flex items-center px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
                    style={{ background: 'linear-gradient(135deg,#4f46e5,#6366f1)', boxShadow: '0 4px 12px rgba(99,102,241,0.4)' }}
                  >
                    <File className="h-4 w-4 mr-2" />
                    Upload Trackers
                  </button>
                ) : (
                  <p className="text-xs text-slate-400 flex items-center gap-1.5">
                    <ChevronRight className="h-4 w-4" />
                    Use the project selector above to get started
                  </p>
                )}
              </div>
            </div>
          )
        )}
      </div>

      {/* Dashboard Configuration Modal */}
      {
        showConfigModal && createPortal(
          <DashboardConfigModal
            isOpen={showConfigModal}
            onClose={() => setShowConfigModal(false)}
            onApply={handleDashboardConfigApply}
            selectedProject={selectedProject}
          />,
          document.body
        )
      }

      {/* Stage Configuration Modal */}
      {
        configuringStage && createPortal(
          <StageConfigModal
            stage={configuringStage}
            isOpen={true}
            onClose={() => setConfiguringStage(null)}
            departmentColumns={departmentColumns}
            onSave={handleStageConfig}
            currentConfig={stageConfigs[configuringStage.id]}
          />,
          document.body
        )
      }

      {/* Full Screen Chart Modal */}
      {
        fullScreenStage && createPortal(
          <FullScreenChartModal
            stage={fullScreenStage}
            isOpen={true}
            onClose={() => setFullScreenStage(null)}
            chartData={stageChartData[fullScreenStage.id] || []}
            distribution={stageDistribution[fullScreenStage.id] || []}
            chartType={stageChartTypes[fullScreenStage.id] || 'bar'}
            onChartTypeChange={handleChartTypeChange}
          />,
          document.body
        )
      }

      {/* Header Configuration Modal */}
      {
        showHeaderConfig && departmentFiles.length > 0 && createPortal(
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-8">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-semibold text-gray-900">
                    Configure File Headers
                  </h3>
                  <button
                    onClick={() => setShowHeaderConfig(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="h-5 w-5 text-gray-500" />
                  </button>
                </div>

                <div className="space-y-6">
                  {departmentFiles.map((fileModule) => {
                    const fileHeaderConfig = fileModule.fileData?.headerConfig || {
                      rowCount: 1
                    };

                    return (
                      <FileHeaderConfigItem
                        key={fileModule.id}
                        fileModule={fileModule}
                        fileHeaderConfig={fileHeaderConfig}
                        onConfigure={(fileId, rowCount, selectedHeaders) =>
                          configureFileHeaders(fileModule, rowCount, selectedHeaders)
                        }
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          </div>,
          document.body
        )
      }

      {/* Email Modal - Made bigger */}
      {
        showEmailModal && createPortal(
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-8">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-semibold text-gray-900">
                    Send Report
                  </h3>
                  <button
                    onClick={() => setShowEmailModal(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="h-5 w-5 text-gray-500" />
                  </button>
                </div>

                {/* Recipients */}
                <div className="mb-6">
                  <label className="text-base font-medium text-gray-700 mb-3 block">
                    Recipients ({departmentEmployees.length} available)
                  </label>
                  <div className="border border-gray-300 rounded-lg max-h-60 overflow-y-auto">
                    <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                      <button
                        onClick={selectAllEmployees}
                        className="text-base text-blue-600 hover:text-blue-800"
                      >
                        {selectedEmployees.length === departmentEmployees.length ? 'Deselect All' : 'Select All'}
                      </button>
                      <span className="text-base text-gray-600">
                        {selectedEmployees.length} selected
                      </span>
                    </div>
                    {departmentEmployees.map((employee) => (
                      <label
                        key={employee.id}
                        className="flex items-center px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0"
                      >
                        <input
                          type="checkbox"
                          checked={selectedEmployees.includes(employee.id)}
                          onChange={() => toggleEmployeeSelection(employee.id)}
                          className="h-5 w-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500 mr-4"
                        />
                        <div className="flex-1">
                          <p className="text-base font-medium text-gray-700">{employee.name}</p>
                          <p className="text-sm text-gray-500">{employee.email}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Subject */}
                <div className="mb-6">
                  <label className="text-base font-medium text-gray-700 mb-3 block">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    placeholder={`${selectedProject?.name} Report`}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                  />
                </div>

                {/* Message */}
                <div className="mb-6">
                  <label className="text-base font-medium text-gray-700 mb-3 block">
                    Message
                  </label>
                  <textarea
                    value={emailBody}
                    onChange={(e) => setEmailBody(e.target.value)}
                    placeholder="Add a message..."
                    rows="5"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base resize-none"
                  />
                </div>

                {/* Status */}
                {emailStatus && (
                  <div className={`mb-6 p-4 rounded-lg text-base ${emailStatus.includes('success')
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : emailStatus.includes('Failed')
                      ? 'bg-red-50 text-red-700 border border-red-200'
                      : 'bg-blue-50 text-blue-700 border border-blue-200'
                    }`}>
                    {emailStatus}
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-end space-x-4">
                  <button
                    onClick={() => setShowEmailModal(false)}
                    className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors text-base"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSendEmail}
                    disabled={emailSending || selectedEmployees.length === 0}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-base flex items-center"
                  >
                    {emailSending ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3"></div>
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="h-5 w-5 mr-2" />
                        Send to {selectedEmployees.length} recipient(s)
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )
      }
    </div >
  );
};

export default ProjectDashboard;
