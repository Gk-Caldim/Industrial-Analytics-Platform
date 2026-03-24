const fs = require('fs');
const path = require('path');

const files = [
  'src/pages/Dashboard.jsx',
  'src/pages/Masters/Masters.jsx',
  'src/pages/ProjectDashboard.jsx'
];

files.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (!fs.existsSync(filePath)) {
    console.log('File not found: ' + filePath);
    return;
  }
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Tailwind Arbitrary values
  content = content.replace(/\[#1e3a5f\]/g, 'theme-primary');
  content = content.replace(/\[#2c4c7c\]/g, 'theme-secondary');
  
  // Inline styles single quotes (ensure no double replace)
  content = content.replace(/'#1e3a5f'/g, "'var(--theme-primary, #1e3a5f)'");
  content = content.replace(/'#2c4c7c'/g, "'var(--theme-secondary, #2c4c7c)'");
  
  // Clean up any double replaces that might have happened on ProjectDashboard previously
  content = content.replace(/'var\(--theme-primary, var\(--theme-primary, #1e3a5f\)\)'/g, "'var(--theme-primary, #1e3a5f)'");
  
  // Inline styles double quotes
  content = content.replace(/"#1e3a5f"/g, '"var(--theme-primary, #1e3a5f)"');
  content = content.replace(/"#2c4c7c"/g, '"var(--theme-secondary, #2c4c7c)"');
  
  fs.writeFileSync(filePath, content);
  console.log('Updated ' + filePath);
});
