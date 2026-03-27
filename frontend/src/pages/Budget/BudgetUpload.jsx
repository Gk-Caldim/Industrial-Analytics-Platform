import React, { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import API from '../../utils/api';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle } from 'lucide-react';

const BudgetUpload = () => {
  const [projects, setProjects] = useState([]);
  const [projectName, setProjectName] = useState('');
  const [currency, setCurrency] = useState('$');
  const [file, setFile] = useState(null);
  const [tablePreview, setTablePreview] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const resp = await API.get('/projects/');
        setProjects(resp.data || []);
      } catch (e) {
        // noop
      }
    };
    fetchProjects();
  }, []);

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    setFile(f || null);
    setMessage(null);
    if (f) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const data = new Uint8Array(evt.target.result);
        const wb = XLSX.read(data, { type: 'array' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const aoa = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        setTablePreview(aoa || []);
      };
      reader.readAsArrayBuffer(f);
    } else {
      setTablePreview([]);
    }
  };

  const handleUpload = async () => {
    if (!projectName) {
      setMessage({ type: 'error', text: 'Select project' });
      return;
    }
    if (tablePreview.length === 0) {
      setMessage({ type: 'error', text: 'Choose a valid Excel/CSV file' });
      return;
    }
    try {
      setUploading(true);
      setMessage(null);
      const payload = {
        project_name: projectName,
        currency,
        budget_data: tablePreview
      };
      const resp = await API.post(`/budget/${encodeURIComponent(projectName)}`, payload);
      if (resp?.data) {
        setMessage({ type: 'success', text: 'Budget Summary saved' });
        window.dispatchEvent(new CustomEvent('projectDashboardUpdate'));
      } else {
        setMessage({ type: 'error', text: 'Unexpected response from server' });
      }
    } catch (e) {
      setMessage({ type: 'error', text: e.response?.data?.detail || e.message || 'Upload failed' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto bg-white border border-gray-200 rounded-xl shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-md text-white">
              <Upload className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Budget Upload</h2>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {message && (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
              {message.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              <span>{message.text}</span>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-700 mb-1">Project</label>
              <input list="budget-projects" value={projectName} onChange={(e) => setProjectName(e.target.value)} className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Select or type project" />
              <datalist id="budget-projects">
                {projects.map((p, i) => (
                  <option value={p.name} key={i}>{p.name}</option>
                ))}
              </datalist>
            </div>
            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-700 mb-1">Currency</label>
              <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="$">$</option>
                <option value="₹">₹</option>
                <option value="€">€</option>
              </select>
            </div>
            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-700 mb-1">File</label>
              <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileChange} className="block w-full text-sm text-gray-700" />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              disabled={uploading}
              onClick={handleUpload}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-60"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Save Budget Summary
            </button>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Preview</h3>
            {tablePreview.length > 0 ? (
              <div className="overflow-auto border border-gray-200 rounded-md">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      {tablePreview[0].map((h, idx) => (
                        <th key={idx} className="px-3 py-2 text-left font-semibold text-gray-700 border-b">{String(h)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tablePreview.slice(1, 50).map((row, r) => (
                      <tr key={r} className="bg-white border-b last:border-b-0">
                        {row.map((cell, c) => (
                          <td key={c} className="px-3 py-2 text-gray-800">{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-gray-500 text-sm">No preview available</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BudgetUpload;

