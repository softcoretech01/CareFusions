import { useState } from 'react';
import { Plus, Search, Filter, Download, Edit2, Trash2, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';

// Mock data generator for initial state
const generateInitialData = () => {
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

  const names = mockNames['medicine'] || ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta'];
  
  return Array.from({ length: 7 }).map((_, idx) => ({
    id: idx + 1,
    code: `CODE-${idx + 1}0${idx + 1}`,
    name: names[idx % names.length],
    status: idx % 3 === 0 ? 'Inactive' : 'Active'
  }));
};

export const MedicineMaster = () => {
  const [records, setRecords] = useState(generateInitialData());
  const [searchTerm, setSearchTerm] = useState('');

  // Modal States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [formData, setFormData] = useState({ name: '', code: '', status: 'Active' });

  // Handlers
  const handleCreateNew = () => {
    setSelectedRecord(null);
    setFormData({ name: '', code: '', status: 'Active' });
    setIsFormOpen(true);
  };

  const handleEdit = (record: any) => {
    setSelectedRecord(record);
    setFormData({ name: record.name, code: record.code, status: record.status });
    setIsFormOpen(true);
  };

  const handleDeleteRequest = (record: any) => {
    setSelectedRecord(record);
    setIsDeleteOpen(true);
  };

  const handleSaveForm = () => {
    if (!formData.name.trim() || !formData.code.trim()) return;

    if (selectedRecord) {
      // Update
      setRecords(records.map(r => r.id === selectedRecord.id ? { ...r, ...formData } : r));
    } else {
      // Create
      const newId = Math.max(...records.map(r => r.id), 0) + 1;
      setRecords([...records, { id: newId, ...formData }]);
    }
    setIsFormOpen(false);
  };

  const confirmDelete = () => {
    if (selectedRecord) {
      setRecords(records.filter(r => r.id !== selectedRecord.id));
      setIsDeleteOpen(false);
    }
  };

  const filteredRecords = records.filter(r => 
    r.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    r.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="h-full flex flex-col relative"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Medicine Master</h1>
          <p className="text-slate-500 mt-1">Manage and configure your medicine master settings.</p>
        </div>
        
        <Button variant="filled" color="primary" icon={Plus} onClick={handleCreateNew}>
          Create New
        </Button>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input 
              type="text"
              placeholder="Search records..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2.5 text-slate-500 hover:bg-slate-50 rounded-xl transition-colors border border-slate-200">
              <Filter className="w-5 h-5" />
            </button>
            <button className="p-2.5 text-slate-500 hover:bg-slate-50 rounded-xl transition-colors border border-slate-200">
              <Download className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50/80 sticky top-0 backdrop-blur-sm z-10">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-24">ID</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Code</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredRecords.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4 text-sm font-semibold text-slate-600">
                    #MED{row.id}00{row.id}
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-slate-900">
                    {row.name}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-slate-500">
                    {row.code}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${row.status === 'Inactive' ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success'}`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 transition-opacity">
                      <Button variant="text" color="primary" icon={Edit2} className="!p-2" aria-label="Edit" onClick={() => handleEdit(row)} />
                      <Button variant="text" color="danger" icon={Trash2} className="!p-2" aria-label="Delete" onClick={() => handleDeleteRequest(row)} />
                    </div>
                  </td>
                </tr>
              ))}
              {filteredRecords.length === 0 && (
                 <tr>
                   <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                     No records found matching "{searchTerm}"
                   </td>
                 </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-sm">
          <span className="text-slate-500 font-medium">Showing {filteredRecords.length} entries</span>
          <div className="flex gap-1">
            <button className="px-3 py-1 border border-slate-200 rounded-lg text-slate-500 hover:bg-white transition-colors">Prev</button>
            <button className="px-3 py-1 bg-primary text-white rounded-lg font-medium shadow-sm shadow-primary/20">1</button>
            <button className="px-3 py-1 border border-slate-200 rounded-lg text-slate-500 hover:bg-white transition-colors">Next</button>
          </div>
        </div>
      </div>

      {/* Form Modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={selectedRecord ? `Edit Medicine Master` : `Create Medicine Master`}
        maxWidth="xl"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-2">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              placeholder="Enter name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Code</label>
            <input
              type="text"
              value={formData.code}
              onChange={(e) => setFormData({...formData, code: e.target.value})}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              placeholder="Enter code"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({...formData, status: e.target.value})}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>
        
        <div className="mt-8 flex items-center justify-end gap-3 pt-6 border-t border-slate-100">
          <Button variant="outline" color="secondary" onClick={() => setIsFormOpen(false)}>
            Cancel
          </Button>
          <Button variant="filled" color="primary" onClick={handleSaveForm}>
            {selectedRecord ? 'Save Changes' : 'Create Record'}
          </Button>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        title="Confirm Deletion"
        maxWidth="sm"
      >
        <div className="flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-full bg-danger/10 text-danger flex items-center justify-center mb-4">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">Delete Record</h3>
          <p className="text-slate-500 text-sm mb-6">
            Are you sure you want to delete <span className="font-semibold text-slate-700">{selectedRecord?.name}</span>? 
            This action cannot be undone.
          </p>
          
          <div className="flex items-center gap-3 w-full">
            <Button variant="outline" color="secondary" className="flex-1" onClick={() => setIsDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="filled" color="danger" className="flex-1" onClick={confirmDelete}>
              Delete
            </Button>
          </div>
        </div>
      </Modal>

    </motion.div>
  );
};
