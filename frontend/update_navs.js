const fs = require('fs');
const path = require('path');

const dirPath = path.join('d:', 'Care Fusions', 'CareFusions', 'frontend', 'src', 'layouts');

const filesToUpdate = [
    "TopNavigation.tsx",
    "RegistrationTopNavigation.tsx",
    "AppointmentTopNavigation.tsx",
    "PharmacyTopNavigation.tsx",
    "IPDTopBar.tsx",
    "OPDTopBar.tsx",
    "InsuranceTopBar.tsx",
    "EMRLayout.tsx"
];

const leftBlockPattern = /(<header[^>]*>)\s*(<div[^>]*>[\s\S]*?)(\s*<div className="flex-1 max-w-(?:xl|2xl))/;

const replacementLeft = `$1
      {/* Date & Time */}
      <div className="flex items-center gap-3 mr-6">
        <div className="relative flex items-center gap-2 text-sm font-semibold text-slate-700 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors">
          <CalendarDays className="w-4 h-4 text-primary" />
          <input 
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-transparent border-none p-0 focus:ring-0 focus:outline-none text-sm font-semibold text-slate-700 cursor-pointer"
          />
        </div>
        <LiveClock />
      </div>$3`;

filesToUpdate.forEach(filename => {
    const filePath = path.join(dirPath, filename);
    if (!fs.existsSync(filePath)) return;

    let content = fs.readFileSync(filePath, 'utf-8');
    const original = content;

    if (!content.includes('LiveClock') && content.includes('Date(')) {
        content = content.replace(
            "import { useState } from 'react';",
            "import { useState } from 'react';\nimport { LiveClock } from '../components/ui/LiveClock';"
        );
        if (!content.includes('LiveClock')) {
            content = content.replace(
                "import { Search",
                "import { LiveClock } from '../components/ui/LiveClock';\nimport { Search"
            );
        }
    }

    if (content.includes('CalendarDays') === false) {
        content = content.replace(
            "import { Search",
            "import { CalendarDays, Search"
        );
    }

    let newContent = content.replace(leftBlockPattern, replacementLeft);

    if (newContent.includes('selectedDate') && !newContent.includes('const [selectedDate')) {
        newContent = newContent.replace(
            /return \(/,
            "const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);\n  return ("
        );
    }

    if (original !== newContent) {
        fs.writeFileSync(filePath, newContent, 'utf-8');
        console.log(`Updated ${filename}`);
    }
});
