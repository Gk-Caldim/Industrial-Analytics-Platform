import React, { useState, useMemo } from 'react';
import { Search, ChevronUp, ChevronDown, Download, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import * as XLSX from 'xlsx';

const ExcelTableViewer = ({ columns: initialColumns, data, fileName, onRefresh, loading }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
    const [showExportDropdown, setShowExportDropdown] = useState(false);

    const pageSizeOptions = [10, 25, 50, 100];

    // Convert string array of columns to object array for consistent handling
    const columns = useMemo(() => {
        return initialColumns.map(col => ({
            id: col,
            label: col.charAt(0).toUpperCase() + col.slice(1).replace(/_/g, ' '),
            sortable: true
        }));
    }, [initialColumns]);

    // Filter data
    const filteredData = useMemo(() => {
        return data.filter(row => {
            return Object.values(row).some(value =>
                String(value || '').toLowerCase().includes(searchTerm.toLowerCase())
            );
        });
    }, [data, searchTerm]);

    // Sort data
    const sortedData = useMemo(() => {
        if (!sortConfig.key) return filteredData;

        return [...filteredData].sort((a, b) => {
            const aVal = a[sortConfig.key] !== undefined && a[sortConfig.key] !== null ? String(a[sortConfig.key]) : '';
            const bVal = b[sortConfig.key] !== undefined && b[sortConfig.key] !== null ? String(b[sortConfig.key]) : '';

            // Try numeric sort first if applicable
            const numA = Number(aVal);
            const numB = Number(bVal);
            if (!isNaN(numA) && !isNaN(numB)) {
                return sortConfig.direction === 'ascending' ? numA - numB : numB - numA;
            }

            if (aVal < bVal) return sortConfig.direction === 'ascending' ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === 'ascending' ? 1 : -1;
            return 0;
        });
    }, [filteredData, sortConfig]);

    // Pagination logic
    const totalItems = sortedData.length;
    const totalPages = Math.ceil(totalItems / pageSize) || 1;

    const paginatedData = useMemo(() => {
        const startIndex = (currentPage - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        return sortedData.slice(startIndex, endIndex);
    }, [sortedData, currentPage, pageSize]);

    // Handlers
    const handleSort = (key) => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') direction = 'descending';
        setSortConfig({ key, direction });
        setCurrentPage(1);
    };

    const getSortIcon = (key) => {
        if (sortConfig.key !== key) return <ChevronUp className="h-3 w-3 sm:h-4 sm:w-4 opacity-30" />;
        return sortConfig.direction === 'ascending' ? <ChevronUp className="h-3 w-3 sm:h-4 sm:w-4" /> : <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4" />;
    };

    const handleExport = (format) => {
        if (sortedData.length === 0) return;

        if (format === 'excel') {
            const ws = XLSX.utils.json_to_sheet(sortedData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Data");
            XLSX.writeFile(wb, `${fileName || 'export'}.xlsx`);
        } else if (format === 'csv') {
            const ws = XLSX.utils.json_to_sheet(sortedData);
            const csv = XLSX.utils.sheet_to_csv(ws);
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${fileName || 'export'}.csv`;
            a.click();
        }

        setShowExportDropdown(false);
    };

    const getPageNumbers = () => {
        const pageNumbers = [];
        const maxVisiblePages = 5;

        if (totalPages <= maxVisiblePages) {
            for (let i = 1; i <= totalPages; i++) pageNumbers.push(i);
        } else {
            let startPage = Math.max(1, currentPage - 2);
            let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

            if (endPage - startPage < maxVisiblePages - 1) {
                startPage = Math.max(1, endPage - maxVisiblePages + 1);
            }

            for (let i = startPage; i <= endPage; i++) {
                pageNumbers.push(i);
            }
        }
        return pageNumbers;
    };

    return (
        <div className="flex flex-col bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm w-full h-[600px] overflow-hidden">
            {/* TOOLBAR */}
            <div className="p-3 border-b border-slate-200 dark:border-slate-700 flex-shrink-0 bg-slate-50 dark:bg-slate-800">
                <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search..."
                                value={searchTerm}
                                onChange={e => {
                                    setSearchTerm(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="w-full sm:w-64 h-9 pl-9 pr-3 text-sm border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-slate-700"
                            />
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <div className="relative">
                            <button
                                onClick={() => setShowExportDropdown(!showExportDropdown)}
                                className="flex items-center gap-1.5 h-9 px-3 text-sm font-medium border border-slate-300 dark:border-slate-600 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                            >
                                <Download className="h-4 w-4" />
                                Export
                            </button>
                            {showExportDropdown && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setShowExportDropdown(false)} />
                                    <div className="absolute right-0 mt-1 w-32 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg shadow-lg z-50 overflow-hidden">
                                        <button onClick={() => handleExport('excel')} className="block w-full text-left px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700">Excel</button>
                                        <button onClick={() => handleExport('csv')} className="block w-full text-left px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700">CSV</button>
                                    </div>
                                </>
                            )}
                        </div>
                        {onRefresh && (
                            <button
                                onClick={onRefresh}
                                disabled={loading}
                                className="flex items-center gap-1.5 h-9 px-3 text-sm font-medium border border-slate-300 dark:border-slate-600 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 transition disabled:opacity-50"
                            >
                                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* TABLE DATA */}
            <div className="flex-1 overflow-auto relative">
                <table className="w-full text-left border-collapse min-w-max">
                    <thead className="sticky top-0 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 shadow-sm z-10">
                        <tr>
                            {columns.map((col, idx) => (
                                <th
                                    key={col.id}
                                    className="py-3 px-4 text-xs font-semibold uppercase tracking-wider border-b border-slate-200 dark:border-slate-600 cursor-pointer group"
                                    onClick={() => col.sortable && handleSort(col.id)}
                                >
                                    <div className="flex items-center gap-1.5">
                                        {col.label}
                                        <span className="text-slate-400">
                                            {getSortIcon(col.id)}
                                        </span>
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {paginatedData.length > 0 ? (
                            paginatedData.map((row, rowIdx) => (
                                <tr key={rowIdx} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                    {columns.map((col) => (
                                        <td key={col.id} className="py-2.5 px-4 text-sm text-slate-600 dark:text-slate-300 whitespace-nowrap overflow-hidden text-ellipsis max-w-[200px]">
                                            {row[col.id] !== undefined && row[col.id] !== null ? String(row[col.id]) : '-'}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={columns.length} className="py-8 text-center text-sm text-slate-500">
                                    {loading ? 'Loading...' : 'No data available'}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* PAGINATION FOOTER */}
            <div className="p-3 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-center bg-slate-50 dark:bg-slate-800 gap-3">
                <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                    <div className="flex items-center gap-2">
                        <span>Rows:</span>
                        <select
                            value={pageSize}
                            onChange={e => {
                                setPageSize(Number(e.target.value));
                                setCurrentPage(1);
                            }}
                            className="px-2 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700"
                        >
                            {pageSizeOptions.map(size => (
                                <option key={size} value={size}>{size}</option>
                            ))}
                        </select>
                    </div>
                    <span>
                        {totalItems > 0 ? (currentPage - 1) * pageSize + 1 : 0} - {Math.min(currentPage * pageSize, totalItems)} of {totalItems}
                    </span>
                </div>

                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="p-1.5 rounded text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </button>

                    <div className="flex items-center">
                        {getPageNumbers().map((num, i, arr) => (
                            <React.Fragment key={num}>
                                {i > 0 && num - arr[i - 1] > 1 && <span className="px-2 text-slate-400">...</span>}
                                <button
                                    onClick={() => setCurrentPage(num)}
                                    className={`min-w-[28px] h-[28px] mx-0.5 rounded flex items-center justify-center text-sm font-medium ${currentPage === num
                                            ? 'bg-blue-600 text-white'
                                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                                        }`}
                                >
                                    {num}
                                </button>
                            </React.Fragment>
                        ))}
                    </div>

                    <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages || totalPages === 0}
                        className="p-1.5 rounded text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ExcelTableViewer;
