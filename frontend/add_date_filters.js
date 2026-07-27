const fs = require('fs');
const path = require('path');

const dir = 'd:/Care Fusions/CareFusions/frontend/src/pages/executive';
const files = fs.readdirSync(dir).filter(f => f.endsWith('Page.tsx') || f === 'ExecutiveOverview.tsx' || f === 'AuditLogsPage.tsx' || f === 'AIIntelligencePage.tsx');

const exclude = ['ReportBuilderPage.tsx'];

files.forEach(file => {
  if (exclude.includes(file)) return;
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  if (content.includes('DateFilter')) {
    console.log(`Skipping ${file}, already has DateFilter.`);
    return;
  }

  const lastImportIndex = content.lastIndexOf('import ');
  const nextLineAfterImports = content.indexOf('\n', lastImportIndex) + 1;
  
  let importToAdd = `import { useState } from 'react';\nimport { DateFilter } from '../../components/ui/DateFilter';\n`;
  if (content.includes(`import React, { useState }`)) {
      importToAdd = `import { DateFilter } from '../../components/ui/DateFilter';\n`;
  } else if (content.includes(`import { useState }`)) {
      importToAdd = `import { DateFilter } from '../../components/ui/DateFilter';\n`;
  } else if (content.includes(`import React`)) {
      content = content.replace(/import React(.*?);/, `import React, { useState }$1;`);
      importToAdd = `import { DateFilter } from '../../components/ui/DateFilter';\n`;
  }

  content = content.slice(0, nextLineAfterImports) + importToAdd + content.slice(nextLineAfterImports);

  const componentName = file.replace('.tsx', '');
  const componentStartRegex = new RegExp(`export const ${componentName} = \\(\\) => \\{`);
  const match = content.match(componentStartRegex);
  
  if (match) {
    const insertStatePos = match.index + match[0].length;
    const stateStr = `\n  const [fromDate, setFromDate] = useState('');\n  const [toDate, setToDate] = useState('');\n`;
    content = content.slice(0, insertStatePos) + stateStr + content.slice(insertStatePos);
  }

  const returnMatch = content.match(/return\s*\(\s*<div[^>]*>/);
  if (returnMatch) {
    const insertUiPos = returnMatch.index + returnMatch[0].length;
    const uiStr = `\n      <div className="mb-6 flex justify-end">\n        <DateFilter\n          dateFrom={fromDate}\n          dateTo={toDate}\n          onDateFromChange={setFromDate}\n          onDateToChange={setToDate}\n        />\n      </div>`;
    content = content.slice(0, insertUiPos) + uiStr + content.slice(insertUiPos);
  }

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Updated ${file}`);
});
