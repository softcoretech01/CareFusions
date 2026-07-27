import os
import re

dir_path = r"d:\Care Fusions\CareFusions\frontend\src\layouts"

def fix_top_nav(file_path):
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
    
    original = content
    
    # 1. Add LiveClock import if not present
    if "LiveClock" not in content and "Date(" in content:
        content = re.sub(
            r"import \{ useState \} from 'react';",
            r"import { useState } from 'react';\nimport { LiveClock } from '../components/ui/LiveClock';",
            content
        )
        # fallback if useState is grouped
        if "LiveClock" not in content:
            content = content.replace(
                "import { Search",
                "import { LiveClock } from '../components/ui/LiveClock';\nimport { Search"
            )
            
    # 2. Find the left section up to the relative flex-1 max-w-xl (the search bar div)
    # The search bar div usually starts with: <div className="flex-1 max-w-xl
    # Or in TopNavigation: <div className="flex-1 max-w-2xl
    
    left_block_pattern = r'(<header[^>]*>)\s*(<div[^>]*>[\s\S]*?)(\s*<div className="flex-1 max-w-(xl|2xl))'
    
    replacement_left = r'''\1
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
      </div>\3'''

    new_content = re.sub(left_block_pattern, replacement_left, content)
    
    # If the file didn't have selectedDate (like EMRLayout), we might need to add it.
    if "selectedDate" in new_content and "const [selectedDate" not in new_content:
        # insert state
        new_content = re.sub(
            r'const cycleTheme = \(\) => \{',
            r"const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);\n  const cycleTheme = () => {",
            new_content
        )
        if "const [selectedDate" not in new_content:
             new_content = re.sub(
                 r'return \(',
                 r"const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);\n  return (",
                 new_content
             )
             
    if original != new_content:
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(new_content)
        print(f"Updated {os.path.basename(file_path)}")

files_to_update = [
    "TopNavigation.tsx",
    "RegistrationTopNavigation.tsx",
    "AppointmentTopNavigation.tsx",
    "PharmacyTopNavigation.tsx",
    "IPDTopBar.tsx",
    "OPDTopBar.tsx",
    "InsuranceTopBar.tsx",
    "EMRLayout.tsx"
]

for filename in files_to_update:
    fp = os.path.join(dir_path, filename)
    if os.path.exists(fp):
        fix_top_nav(fp)
