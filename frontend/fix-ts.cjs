const fs = require('fs');
const path = require('path');

const files = {
  'src/components/billing/Sidebar.tsx': [
    { target: "ChevronDown, Power } from 'lucide-react';", replace: "ChevronDown } from 'lucide-react';" },
    { target: "Power } from 'lucide-react';", replace: "} from 'lucide-react';" } // Fallback
  ],
  'src/layouts/AppointmentSidebar.tsx': [
    { target: "ChevronDown, Power } from 'lucide-react';", replace: "ChevronDown } from 'lucide-react';" }
  ],
  'src/layouts/EMRSidebar.tsx': [
    { target: "ClipboardList, Users, BedDouble, Siren, Power, LayoutDashboard", replace: "Users, BedDouble, Siren, LayoutDashboard" }
  ],
  'src/layouts/ExecutiveLayout.tsx': [
    { target: "Menu, LogOut } from 'lucide-react';", replace: "Menu } from 'lucide-react';" }
  ],
  'src/layouts/InsuranceSidebar.tsx': [
    { target: "FileText, Power, Shield } from 'lucide-react';", replace: "FileText } from 'lucide-react';" }
  ],
  'src/layouts/InventorySidebar.tsx': [
    { target: "BookOpen, Power, Boxes, CornerDownLeft", replace: "BookOpen, CornerDownLeft" }
  ],
  'src/layouts/IPDSidebar.tsx': [
    { target: "FileText, Power, Heart, ChevronDown", replace: "FileText, ChevronDown" }
  ],
  'src/layouts/LabSidebar.tsx': [
    { target: "FileText, Power } from 'lucide-react';", replace: "FileText } from 'lucide-react';" }
  ],
  'src/layouts/OPDSidebar.tsx': [
    { target: "ChevronDown, Power, Heart } from 'lucide-react';", replace: "ChevronDown } from 'lucide-react';" }
  ],
  'src/layouts/PharmacySidebar.tsx': [
    { target: "BarChart2, Power", replace: "BarChart2" }
  ],
  'src/layouts/ProcurementSidebar.tsx': [
    { target: "Truck, Store, Power, FileSignature", replace: "Truck, FileSignature" }
  ],
  'src/layouts/RadiologySidebar.tsx': [
    { target: "Settings, Power", replace: "Settings" }
  ],
  'src/layouts/RegistrationSidebar.tsx': [
    { target: "ChevronDown, Power, Activity", replace: "ChevronDown, Activity" }
  ],
  'src/layouts/Sidebar.tsx': [
    { target: "ChevronDown, Power, Stethoscope", replace: "ChevronDown, Stethoscope" }
  ],
  'src/pages/inventory/StockIssue.tsx': [
    { target: "FileText, Search, Plus, Filter, Download, PackageMinus, AlertCircle, Trash2", replace: "Package, Search, Plus, Download, Trash2" }
  ],
  'src/pages/inventory/StockLedger.tsx': [
    { target: "FileText, Search, Download, Filter, Box, ArrowUpRight, ArrowDownRight, Package, ChevronLeft", replace: "Search, Download, ChevronLeft" }
  ]
};

for (const [file, replacements] of Object.entries(files)) {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    for (const r of replacements) {
      content = content.replace(r.target, r.replace);
    }
    fs.writeFileSync(filePath, content, 'utf8');
  }
}
console.log('Fixed TypeScript imports!');
