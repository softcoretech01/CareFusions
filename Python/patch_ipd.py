import re

path = r'd:\HMS\CareFusions\frontend\src\pages\ipd\PatientIPDProfile.tsx'
with open(path, 'r', encoding='utf-8') as f:
    text = f.read()

# Add History to lucide-react import
if 'History' not in text and 'lucide-react' in text:
    text = re.sub(r'(import \{[^}]*)(User,)', r'\1History, \2', text)

# Import PatientHistoryTab
if 'PatientHistoryTab' not in text:
    text = text.replace("import { DischargeItem } from '../../components/discharge/DischargePrescription';", 
                        "import { DischargeItem } from '../../components/discharge/DischargePrescription';\nimport { PatientHistoryTab } from '../../components/ipd/PatientHistoryTab';")

# Add history tab to TABS array
if "{ id: 'history', label: 'History', icon: History }" not in text:
    text = text.replace("const TABS = [\n      { id: 'nursing', label: 'Nursing Flowsheet', icon: Activity },",
                        "const TABS = [\n      { id: 'history', label: 'History', icon: History },\n      { id: 'nursing', label: 'Nursing Flowsheet', icon: Activity },")

# Render history tab content
if "activeTab === 'history'" not in text:
    text = text.replace("{/* Tab Content */}\n          <div className=\"flex-1 overflow-y-auto custom-scrollbar pr-2 pb-8\">\n            ",
                        "{/* Tab Content */}\n          <div className=\"flex-1 overflow-y-auto custom-scrollbar pr-2 pb-8\">\n            {activeTab === 'history' && <PatientHistoryTab patient={patient} />}\n            ")

with open(path, 'w', encoding='utf-8') as f:
    f.write(text)
