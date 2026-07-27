const fs = require('fs');
const path = require('path');

function walkSync(currentDirPath, callback) {
  fs.readdirSync(currentDirPath).forEach((name) => {
    const filePath = path.join(currentDirPath, name);
    const stat = fs.statSync(filePath);
    if (stat.isFile()) {
      callback(filePath, stat);
    } else if (stat.isDirectory()) {
      walkSync(filePath, callback);
    }
  });
}

console.log('Starting automated TS cleanup...');

let filesModified = 0;

walkSync(path.join(__dirname, 'src'), (filePath) => {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
    let content = fs.readFileSync(filePath, 'utf-8');
    let originalContent = content;

    // 1. Remove unnecessary React imports
    // Matches: import React from 'react'; or import React from "react"
    content = content.replace(/^import React from ['"]react['"];?\s*$/gm, '');
    
    // Matches: import React, { something } from 'react'; -> import { something } from 'react';
    content = content.replace(/^import React,\s*\{/gm, 'import {');

    // 2. Clean up unused Lucide imports
    // Extract lucide imports
    const lucideImportRegex = /^import\s+\{([^}]+)\}\s+from\s+['"]lucide-react['"];?/gm;
    let match;
    while ((match = lucideImportRegex.exec(content)) !== null) {
      const fullMatch = match[0];
      const iconsStr = match[1];
      const icons = iconsStr.split(',').map(i => i.trim()).filter(i => i);
      
      const usedIcons = icons.filter(icon => {
        // Check if icon is used in the file outside of the import statement
        const iconUsageRegex = new RegExp(`\\b${icon}\\b`, 'g');
        const matches = content.match(iconUsageRegex);
        // It should appear more than once (once in import, and at least once elsewhere)
        return matches && matches.length > 1;
      });

      if (usedIcons.length === 0) {
        // Remove the whole import
        content = content.replace(fullMatch + '\n', '');
        content = content.replace(fullMatch, '');
      } else if (usedIcons.length !== icons.length) {
        // Replace with only used icons
        content = content.replace(fullMatch, `import { ${usedIcons.join(', ')} } from 'lucide-react';`);
      }
    }

    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf-8');
      console.log(`Cleaned up: ${filePath}`);
      filesModified++;
    }
  }
});

console.log(`\nCleanup complete! Modified ${filesModified} files.`);
console.log('Please run `npm run build` now and provide the output!');
