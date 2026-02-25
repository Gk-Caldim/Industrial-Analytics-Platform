const fs = require('fs');
const path = require('path');

const mastersDir = path.join(__dirname, 'src', 'pages', 'Masters');
const files = fs.readdirSync(mastersDir).filter(f => f.endsWith('Master.jsx') && f !== 'Masters.jsx');

files.forEach(file => {
    const filePath = path.join(mastersDir, file);
    let content = fs.readFileSync(filePath, 'utf8');

    // Upgrade outer wrapper
    content = content.replace(
        /className="h-full flex flex-col bg-gray-50 overflow-visible"/g,
        'className="h-full flex flex-col bg-[#fafbfc] overflow-visible"'
    );

    // Upgrade table container wrapper
    content = content.replace(
        /className="[A-Za-z0-9\-]+-container p-2" style={{ overflow: 'visible' }}>/g,
        'className="table-wrapper-container p-6 lg:p-8" style={{ overflow: "visible" }}>\n        <div className="mb-6 flex items-center justify-between">\n          <div>\n            <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-700">Data Management</h2>\n            <p className="text-sm text-gray-500 mt-1">Manage and update your records with ease</p>\n          </div>\n        </div>'
    );

    // Update main content container inside the page
    content = content.replace(
        /className="bg-white border border-gray-200 rounded shadow-sm flex flex-col h-full overflow-visible"/g,
        'className="bg-white/80 backdrop-blur-xl border border-gray-100 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col h-full overflow-hidden"'
    );

    // Update Toolbar
    content = content.replace(
        /className="p-4 border-b border-gray-200 flex-shrink-0"/g,
        'className="p-5 border-b border-gray-100 bg-white/50 backdrop-blur-md flex-shrink-0"'
    );

    // Update Search Input
    content = content.replace(
        /className="w-full sm:w-48 h-10 pl-9 pr-3 text-xs sm:text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black"/g,
        'className="w-full sm:w-64 h-10 pl-10 pr-4 text-sm bg-gray-50/50 border border-gray-200/80 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"'
    );
    content = content.replace(
        /<Search className="absolute left-3 top-1\/2 transform -translate-y-1\/2 h-4 w-4 text-gray-400" \/>/g,
        '<Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />'
    );

    // Buttons in Toolbar
    content = content.replace(
        /className="flex items-center gap-1 h-10 px-3 text-xs sm:text-sm border border-gray-300 rounded hover:bg-gray-50 whitespace-nowrap tooltip"/g,
        'className="flex items-center gap-2 h-10 px-4 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-gray-200 whitespace-nowrap tooltip"'
    );

    // Special Buttons (Add, Action) - general button classes
    content = content.replace(
        /className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"/g,
        'className="px-5 py-2.5 text-sm font-semibold bg-gray-900 text-white rounded-xl hover:bg-gray-800 shadow-md shadow-gray-900/10 transition-all active:scale-[0.98]"'
    );

    content = content.replace(
        /className="px-3 py-1.5 text-xs sm:text-sm bg-blue-600 text-white rounded hover:bg-blue-700"/g,
        'className="px-4 py-2 text-sm font-semibold bg-gray-900 text-white rounded-xl hover:bg-gray-800 shadow-sm transition-all"'
    );

    content = content.replace(
        /className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50"/g,
        'className="px-5 py-2.5 text-sm font-medium border border-gray-200 bg-white text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-300 shadow-sm transition-all"'
    );

    // Update table layout
    content = content.replace(
        /<table className="min-w-full text-base border-collapse">/g,
        '<table className="min-w-full text-sm border-collapse">'
    );
    content = content.replace(
        /<th\s+className={`text-left py-3 px-8 font-medium cursor-pointer hover:opacity-80 whitespace-nowrap w-8 \${/g,
        '<th className={`text-left py-4 px-6 font-semibold text-gray-600 bg-gray-50/80 backdrop-blur cursor-pointer hover:text-gray-900 whitespace-nowrap w-8 ${'
    );
    content = content.replace(
        /<th\s+key={col\.id}\s+className={`text-left py-3 px-8 font-medium cursor-pointer hover:opacity-80 whitespace-nowrap \${/g,
        '<th key={col.id} className={`text-left py-4 px-6 font-semibold text-gray-600 bg-gray-50/80 backdrop-blur cursor-pointer hover:text-gray-900 whitespace-nowrap ${'
    );

    content = content.replace(
        /<span className="text-base">{col\.label}<\/span>/g,
        '<span className="text-sm tracking-wide">{col.label}</span>'
    );

    // Table rows
    content = content.replace(
        /className={`border-b border-gray-200 hover:bg-gray-50 transition-colors \${/g,
        'className={`border-b border-gray-100 hover:bg-gray-50/80 transition-all duration-200 group \${'
    );

    content = content.replace(
        /className={`py-3 px-8 whitespace-nowrap w-4 \${/g,
        'className={`py-3.5 px-6 whitespace-nowrap w-4 text-gray-600 group-hover:text-gray-900 \${'
    );

    content = content.replace(
        /className={`py-3 px-8 text-gray-900 whitespace-nowrap \${/g,
        'className={`py-3.5 px-6 text-gray-600 group-hover:text-gray-900 whitespace-nowrap transition-colors \${'
    );

    // Custom CSS fixes for the table container padding (we removed table border colors)
    // Instead of completely parsing CSS, let's append a style tag inside the file
    if (content.includes('/* Table container styles for proper scrolling */')) {
        content = content.replace(
            /\.table-container {\s+flex: 1;\s+overflow: auto;\s+position: relative;\s+border: 1px solid #e5e7eb;\s+border-radius: 0\.375rem;\s+background: white;\s+min-height: 0;\s+}/g,
            '.table-container { flex: 1; overflow: auto; position: relative; background: transparent; min-height: 0; }'
        );
        // Remove the bad gradient from headers
        content = content.replace(
            /background: linear-gradient\(135deg, #f0f5ff, #f0f8ff, #e6f0fa, #e0eaff\);/g,
            'background: #f9fafb;'
        );
        // Change freeze border indicator to a nice shadow maybe? Let's just update border colors
        content = content.replace(/#0284c7/g, '#e5e7eb');
        content = content.replace(/#f0f9ff/g, '#f8fafc');
        content = content.replace(/#e0f2fe/g, '#f1f5f9');
    }

    // Find and replace Snowflake button class which had specific bg colors based on frozen state
    content = content.replace(
        /className={`flex items-center gap-1 h-10 px-3 text-xs sm:text-sm border rounded whitespace-nowrap tooltip \${/g,
        'className={`flex items-center gap-2 h-10 px-4 text-sm font-medium rounded-xl whitespace-nowrap transition-all tooltip ${'
    );
    content = content.replace(
        /frozenColumns\.length > 0\s+\?\s+'bg-blue-50 text-blue-700 border-blue-300'\s+:\s+'border-gray-300 hover:bg-gray-50 text-gray-700'/g,
        "frozenColumns.length > 0 ? 'bg-indigo-50 text-indigo-700-border-indigo-200 shadow-sm border' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 shadow-sm'"
    );

    fs.writeFileSync(filePath, content, 'utf8');
});

console.log("Updated Master files");
