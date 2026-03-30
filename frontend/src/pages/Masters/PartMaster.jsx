import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Search, Edit, Trash2, X, Check, ChevronUp, ChevronDown, Filter, Download, Eye, EyeOff, CheckSquare, Square, Snowflake, ChevronLeft, ChevronRight, RefreshCw, ArrowUp, ArrowDown, Copy, Package } from 'lucide-react';
import API from '../../utils/api';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const PartMaster = () => {
  // Fixed columns for Part Master
  const initialColumns = [
    { id: 'part_id', label: 'Part ID', visible: true, sortable: true, type: 'text', required: true, deletable: false },
    { id: 'name', label: 'Part Name', visible: true, sortable: true, type: 'text', required: true, deletable: false },
    { id: 'category', label: 'Category', visible: true, sortable: true, type: 'select', required: true, deletable: false },
    { id: 'specification', label: 'Specification', visible: true, sortable: true, type: 'text', required: false, deletable: false },
    { id: 'unit_price', label: 'Unit Price', visible: true, sortable: true, type: 'number', required: true, deletable: false },
    { id: 'stock_quantity', label: 'Stock Quantity', visible: true, sortable: true, type: 'number', required: true, deletable: false },
    { id: 'status', label: 'Status', visible: true, sortable: true, type: 'select', required: true, deletable: false },
  ];

  const statusColors = {
    'In Stock': 'bg-green-100 text-green-800',
    'Low Stock': 'bg-yellow-100 text-yellow-800',
    'Out of Stock': 'bg-red-100 text-red-800',
    'Discontinued': 'bg-gray-100 text-gray-800'
  };

  const [parts, setParts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newPart, setNewPart] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [showDeletePrompt, setShowDeletePrompt] = useState(null);
  const [showColumnModal, setShowColumnModal] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');
  
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const pageSizeOptions = [5, 10, 25, 50, 100];

  const [columns, setColumns] = useState(() => {
    const savedColumns = localStorage.getItem('part_columns_v1');
    return savedColumns ? JSON.parse(savedColumns) : initialColumns;
  });

  const [sortConfig, setSortConfig] = useState({ key: 'part_id', direction: 'ascending' });
  const [showAddPartModal, setShowAddPartModal] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: '' }), 3000);
  };

  useEffect(() => {
    // Simulate fetching data for now as backend might not have this endpoint yet
    // In a real scenario, this would be API.get('/parts/')
    setLoading(false);
    setParts([
      { id: 1, part_id: 'P001', name: 'Aluminium Plate', category: 'Raw Material', specification: '10x10x2m', unit_price: 1500, stock_quantity: 50, status: 'In Stock' },
      { id: 2, part_id: 'P002', name: 'Steel Bolt M8', category: 'Fasteners', specification: 'M8 x 50mm', unit_price: 15, stock_quantity: 1000, status: 'In Stock' },
      { id: 3, part_id: 'P003', name: 'Copper Wire', category: 'Raw Material', specification: '2.5mm', unit_price: 45, stock_quantity: 5, status: 'Low Stock' },
    ]);
  }, []);

  useEffect(() => {
    localStorage.setItem('part_columns_v1', JSON.stringify(columns));
  }, [columns]);

  const filteredParts = parts.filter(part =>
    Object.values(part).some(value => String(value).toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const sortedParts = useMemo(() => {
    if (!sortConfig.key) return filteredParts;
    return [...filteredParts].sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'ascending' ? -1 : 1;
      if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'ascending' ? 1 : -1;
      return 0;
    });
  }, [filteredParts, sortConfig]);

  const paginatedParts = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return sortedParts.slice(startIndex, startIndex + pageSize);
  }, [sortedParts, currentPage, pageSize]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="flex-1 p-4 sm:p-6 lg:p-8">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Part Master</h1>
            <p className="text-sm text-gray-500">Manage part inventory and specifications</p>
          </div>
          <button
            onClick={() => setShowAddPartModal(true)}
            className="flex items-center justify-center px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add New Part
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search parts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/5"
              />
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setColumns(initialColumns)}
                className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
                title="Reset Columns"
              >
                <RefreshCw className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {columns.filter(c => c.visible).map(col => (
                    <th
                      key={col.id}
                      className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => {
                        setSortConfig({
                          key: col.id,
                          direction: sortConfig.key === col.id && sortConfig.direction === 'ascending' ? 'descending' : 'ascending'
                        });
                      }}
                    >
                      <div className="flex items-center gap-2">
                        {col.label}
                        {sortConfig.key === col.id && (
                          sortConfig.direction === 'ascending' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                        )}
                      </div>
                    </th>
                  ))}
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paginatedParts.map((part) => (
                  <tr key={part.id} className="hover:bg-gray-50 transition-colors">
                    {columns.filter(c => c.visible).map(col => (
                      <td key={col.id} className="px-6 py-4 text-sm text-gray-700">
                        {col.id === 'status' ? (
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[part[col.id]] || 'bg-gray-100 text-gray-800'}`}>
                            {part[col.id]}
                          </span>
                        ) : col.id === 'unit_price' ? (
                          `₹${part[col.id]}`
                        ) : (
                          part[col.id]
                        )}
                      </td>
                    ))}
                    <td className="px-6 py-4 text-right space-x-2">
                      <button className="p-1.5 text-gray-400 hover:text-black hover:bg-gray-100 rounded-lg transition-colors">
                        <Edit className="h-4 w-4" />
                      </button>
                      <button className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="p-4 border-t border-gray-200 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing {Math.min(filteredParts.length, (currentPage - 1) * pageSize + 1)} to {Math.min(filteredParts.length, currentPage * pageSize)} of {filteredParts.length} parts
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-2 border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm font-medium px-4">{currentPage}</span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(Math.ceil(filteredParts.length / pageSize), prev + 1))}
                disabled={currentPage >= Math.ceil(filteredParts.length / pageSize)}
                className="p-2 border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {notification.show && (
        <div className={`fixed bottom-6 right-6 px-6 py-3 rounded-xl shadow-lg text-white font-medium animate-slideUp ${notification.type === 'error' ? 'bg-red-600' : 'bg-black'}`}>
          {notification.message}
        </div>
      )}
    </div>
  );
};

export default PartMaster;
