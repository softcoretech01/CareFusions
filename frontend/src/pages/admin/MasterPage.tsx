import { useParams } from 'react-router-dom';
import { Plus, Search, Filter, Download, Edit2, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '../../components/ui/Button';
import { exportToExcel } from '../../utils/exportToExcel';

export const MasterPage = () => {
  const { masterId } = useParams();

  // Convert slug to readable title
  const title = masterId 
    ? masterId.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
    : 'Master Data';

  // Helper to generate realistic mock data based on master type
  const getMockData = (type: string | undefined, index: number) => {
    const mockNames: Record<string, string[]> = {
      'department': ['Cardiology', 'Neurology', 'Orthopedics', 'Pediatrics', 'Oncology', 'Emergency', 'Radiology'],
      'hospital': ['City General Hospital', 'CareFusions North', 'CareFusions South', 'Metro Health Center', 'Valley Medical', 'Lakeside Clinic', 'Downtown Care'],
      'branch': ['Main Campus', 'North Wing', 'South Branch', 'East Side Clinic', 'West End Hospital', 'Suburban Center', 'City Annex'],
      'employee': ['John Smith', 'Sarah Jenkins', 'Michael Chen', 'Emily Davis', 'Robert Wilson', 'Maria Garcia', 'David Taylor'],
      'nurse': ['Nurse Mary', 'Nurse Jessica', 'Nurse Peter', 'Nurse Claire', 'Nurse Joy', 'Nurse Emma', 'Nurse Jack'],
      'pharmacist': ['Pharm. Adam', 'Pharm. Eve', 'Pharm. Bill', 'Pharm. Melinda', 'Pharm. Steve', 'Pharm. Woz', 'Pharm. Tim'],
      'lab-technician': ['Tech Brian', 'Tech Lisa', 'Tech Monica', 'Tech Chandler', 'Tech Joey', 'Tech Rachel', 'Tech Ross'],
      'receptionist': ['Ann', 'Pam', 'Jim', 'Dwight', 'Michael', 'Stanley', 'Phyllis'],
      'housekeeping': ['Jose', 'Maria', 'Luis', 'Carmen', 'Jorge', 'Ana', 'Carlos'],
      'doctor': ['Dr. James Wilson', 'Dr. Sarah Patel', 'Dr. Michael Chang', 'Dr. Emily Brown', 'Dr. Robert Lee', 'Dr. Maria Rodriguez', 'Dr. David Kim'],
      'doctor-specialization': ['Cardiologist', 'Neurologist', 'Orthopedic Surgeon', 'Pediatrician', 'Oncologist', 'General Physician', 'Dermatologist'],
      'patient-category': ['General', 'VIP', 'Corporate', 'Staff', 'Government Scheme', 'Insurance', 'International'],
      'blood-group': ['A Positive (A+)', 'A Negative (A-)', 'B Positive (B+)', 'B Negative (B-)', 'O Positive (O+)', 'O Negative (O-)', 'AB Positive (AB+)'],
      'consultation-type': ['First Visit', 'Follow Up', 'Emergency', 'Teleconsultation', 'Routine Checkup', 'Specialist Referral', 'Free Camp'],
      'appointment-status': ['Scheduled', 'Arrived', 'Consulting', 'Completed', 'Cancelled', 'No Show', 'Rescheduled'],
      'medicine': ['Paracetamol 500mg', 'Amoxicillin 250mg', 'Omeprazole 20mg', 'Ibuprofen 400mg', 'Azithromycin 500mg', 'Cetirizine 10mg', 'Metformin 500mg'],
      'medicine-category': ['Antibiotics', 'Analgesics', 'Antacids', 'Antipyretics', 'Antihistamines', 'Vitamins', 'Cardiovascular'],
      'test': ['Complete Blood Count (CBC)', 'Lipid Profile', 'Liver Function Test (LFT)', 'Kidney Function Test (KFT)', 'Thyroid Profile', 'Blood Sugar Fasting', 'HbA1c'],
      'sample-type': ['Blood', 'Urine', 'Stool', 'Sputum', 'Saliva', 'Swab', 'Tissue'],
      'radiology-service': ['X-Ray Chest PA View', 'MRI Brain', 'CT Scan Abdomen', 'Ultrasound Whole Abdomen', 'ECG', 'Mammography', 'Dexa Scan'],
      'equipment': ['Siemens MRI Scanner', 'GE CT Scanner', 'Philips X-Ray Machine', 'Ultrasound Machine 1', 'ECG Machine 1', 'Ventilator A', 'Defibrillator'],
      'service': ['Consultation Fee', 'Registration Fee', 'Bed Charge (General)', 'Bed Charge (Private)', 'ICU Charge', 'Nursing Charge', 'Diet Charge'],
      'tax': ['GST 5%', 'GST 12%', 'GST 18%', 'VAT 5%', 'Service Tax', 'CESS 1%', 'Zero Tax'],
      'payment-mode': ['Cash', 'Credit Card', 'Debit Card', 'UPI', 'Bank Transfer', 'Cheque', 'Insurance Claim'],
      'insurance-provider': ['Star Health', 'HDFC Ergo', 'ICICI Lombard', 'Max Bupa', 'Religare', 'Apollo Munich', 'New India Assurance'],
      'tpa': ['MediAssist', 'Vidal Health', 'Raksha TPA', 'Paramount Health', 'Family Health Plan', 'MDIndia', 'Heritage Health'],
      'vendor': ['MedTech Suppliers', 'PharmaCare Inc.', 'Global Equipments', 'Surgical Solutions', 'BioLife Diagnostics', 'Prime IT Solutions', 'Care Uniforms'],
      'item-category': ['Surgical Items', 'Consumables', 'Stationery', 'Housekeeping', 'IT Equipment', 'Implants', 'Linen'],
      'warehouse': ['Main Central Store', 'Pharmacy Store', 'OT Store', 'Lab Store', 'Ward Store A', 'Emergency Store', 'Dietary Store'],
      'coa': ['Cash in Hand', 'Bank Accounts', 'Accounts Receivable', 'Inventory', 'Accounts Payable', 'Salary Expense', 'Utility Expense'],
      'cost-center': ['OPD Clinic', 'Inpatient Wards', 'Operation Theatre', 'Laboratory', 'Radiology', 'Pharmacy', 'Emergency Dept'],
      'users': ['admin_john', 'dr_sarah', 'nurse_mary', 'pharmacy_bill', 'lab_tech1', 'frontdesk_ann', 'billing_tom'],
      'roles': ['System Administrator', 'Senior Doctor', 'Head Nurse', 'Pharmacist', 'Lab Technician', 'Receptionist', 'Billing Executive'],
      'permissions': ['Create Patient', 'Edit Patient', 'View Reports', 'Approve Billing', 'Manage Inventory', 'Access Settings', 'Delete Records'],
      'sms': ['Appointment Confirmation', 'Welcome Message', 'Report Ready', 'Payment Receipt', 'Discharge Summary', 'Follow-up Reminder', 'Birthday Greeting'],
      'email': ['Welcome Email', 'Invoice Copy', 'Lab Report', 'Prescription', 'Appointment Reminder', 'Feedback Request', 'Newsletter'],
      'prompts': ['Summarize Patient History', 'Extract Symptoms', 'Suggest Investigations', 'Draft Discharge Summary', 'Analyze Lab Report', 'Check Drug Interactions', 'Generate Diet Plan'],
      'clinical-rules': ['High BP Alert', 'Allergy Warning', 'Diabetic Protocol', 'Pregnancy Contraindication', 'Pediatric Dosage Check', 'Renal Failure Adjustments', 'Critical Value Alert'],
    };

    const typeKey = type || 'department';
    const fallbackNames = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta'];
    
    // Ensure we don't go out of bounds
    const safeIndex = (index - 1) % 7; 
    
    if (mockNames[typeKey]) {
      return mockNames[typeKey][safeIndex];
    }
    
    return `${title} ${fallbackNames[safeIndex]}`;
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="h-full flex flex-col"
    >
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">{title}</h1>
          <p className="text-slate-500 mt-1"></p>
        </div>
        
        <Button variant="filled" color="primary" icon={Plus}>
          Create New
        </Button>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex-1 flex flex-col overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="relative w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder={`Search ${title.toLowerCase()}...`}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <button className="p-2 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 transition-colors">
              <Filter className="w-4 h-4" />
            </button>
            <button className="p-2 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 transition-colors" onClick={() => exportToExcel([], 'MasterPage')}>
                  <Download className="w-5 h-5" />
                  Export
                </button>
          </div>
        </div>

        {/* Table Area */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-100 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">ID</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Code</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {[1, 2, 3, 4, 5, 6, 7].map((row) => (
                <tr key={row} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4 text-sm font-semibold text-slate-600">
                    #{masterId?.substring(0, 3).toUpperCase()}{row}00{row}
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-slate-900">
                    {getMockData(masterId, row)}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-slate-500">
                    CODE-{row}0{row}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${row % 3 === 0 ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success'}`}>
                      {row % 3 === 0 ? 'Inactive' : 'Active'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="text" color="primary" icon={Edit2} className="!p-2" aria-label="Edit" />
                      <Button variant="text" color="danger" icon={Trash2} className="!p-2" aria-label="Delete" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-sm">
          <span className="text-slate-500 font-medium">Showing 1 to 7 of 24 entries</span>
          <div className="flex gap-1">
            <button className="px-3 py-1 border border-slate-200 rounded-md text-slate-500 hover:bg-white hover:text-primary transition-colors disabled:opacity-50">Prev</button>
            <button className="px-3 py-1 bg-primary border-primary rounded-md text-white font-medium shadow-sm">1</button>
            <button className="px-3 py-1 border border-slate-200 rounded-md text-slate-500 hover:bg-white hover:text-primary transition-colors">2</button>
            <button className="px-3 py-1 border border-slate-200 rounded-md text-slate-500 hover:bg-white hover:text-primary transition-colors">3</button>
            <button className="px-3 py-1 border border-slate-200 rounded-md text-slate-500 hover:bg-white hover:text-primary transition-colors">Next</button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
