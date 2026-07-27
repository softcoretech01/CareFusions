import { useState } from 'react';
import { Search, Edit2, Activity, User, Phone, ShieldAlert } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { usePatients } from '../../contexts/PatientContext';
import type { GlobalPatientRecord } from '../../contexts/PatientContext';

const initialFormState: Partial<GlobalPatientRecord> = {
  uhid: '',
  registrationDate: new Date().toISOString().split('T')[0],
  registrationTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  patientName: '',
  gender: 'Unknown',
  approximateAge: 0,
  emergencyContactName: '',
  emergencyContactPhone: '',
  status: 'Active',
  registrationType: 'Emergency'
};

export const EmergencyRegistration = () => {
  const { patients, addPatient, updatePatient } = usePatients();
  
  // Only show emergency registrations
  const records = patients.filter(p => p.registrationType === 'Emergency');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<GlobalPatientRecord | null>(null);
  const [formData, setFormData] = useState<Partial<GlobalPatientRecord>>(initialFormState);
  
  const [searchTerm, setSearchTerm] = useState('');

  const generateUHID = () => {
    const year = new Date().getFullYear();
    const random = Math.floor(1000 + Math.random() * 9000);
    return `UHID-EM-${year}-${random}`;
  };

  const handleCreateNew = () => {
    setFormData({ 
      ...initialFormState, 
      uhid: generateUHID(),
      registrationDate: new Date().toISOString().split('T')[0],
      registrationTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      patientName: 'Unknown Patient' // default
    });
    setSelectedRecord(null);
    setIsFormOpen(true);
  };

  const handleEdit = (record: GlobalPatientRecord) => {
    setFormData(record);
    setSelectedRecord(record);
    setIsFormOpen(true);
  };


  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedRecord) {
      updatePatient(selectedRecord.id, formData);
    } else {
      const newId = Math.max(...patients.map(r => r.id), 0) + 1;
      addPatient({ id: newId, ...formData } as GlobalPatientRecord);
    }
    setIsFormOpen(false);
  };

  const handleInputChange = (field: keyof typeof formData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const filteredRecords = records.filter(record => 
    record.uhid.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.patientName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-[calc(100vh-2rem)] flex flex-col relative">
      {!isFormOpen ? (
        <>
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-slate-800">Emergency Registration</h1>
            </div>
            <Button variant="filled" color="danger" icon={Activity} onClick={handleCreateNew}>
              Emergency Reg
            </Button>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex-1 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex gap-4 items-center justify-between">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by UHID, Name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-danger/20 focus:border-danger text-sm"
                />
              </div>
            </div>

            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-medium">UHID</th>
                    <th className="px-4 py-3 font-medium">Patient Name</th>
                    <th className="px-4 py-3 font-medium">Gender/Age</th>
                    <th className="px-4 py-3 font-medium">Arrival Time</th>
                    <th className="px-4 py-3 font-medium">Emergency Contact</th>
                    <th className="px-4 py-3 font-medium text-center">Status</th>
                    <th className="px-4 py-3 font-medium text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRecords.length > 0 ? (
                    filteredRecords.map((record) => (
                      <tr key={record.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3 font-semibold text-danger">{record.uhid}</td>
                        <td className="px-4 py-3 font-medium text-slate-800">{record.patientName}</td>
                        <td className="px-4 py-3 text-slate-600">{record.gender} / ~{record.approximateAge} Yrs</td>
                        <td className="px-4 py-3 text-slate-600">{record.registrationDate} {record.registrationTime}</td>
                        <td className="px-4 py-3 text-slate-600">
                          {record.emergencyContactName ? (
                            <span>{record.emergencyContactName} ({record.emergencyContactPhone})</span>
                          ) : <span className="text-slate-400 italic">None Provided</span>}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                            record.status === 'Active' 
                              ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' 
                              : 'bg-red-50 text-red-600 border border-red-200'
                          }`}>
                            {record.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2">

                            <button 
                              onClick={() => handleEdit(record)}
                              className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <ShieldAlert className="w-8 h-8 text-slate-400" />
                          <p>No emergency records found</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="absolute inset-0 flex flex-col bg-slate-50 rounded-3xl z-10 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 bg-white border-b border-slate-200 shrink-0 shadow-sm z-20">
            <div>
              <h2 className="text-2xl font-bold text-slate-800">
                {selectedRecord ? 'Edit Emergency Registration' : 'New Emergency Registration'}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="bg-danger/10 text-danger px-3 py-1 rounded-full text-sm font-semibold border border-danger/20">
                  {formData.uhid || 'Generating UHID...'}
                </span>
                <span className="text-sm text-slate-500">{formData.registrationDate} {formData.registrationTime}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={() => setIsFormOpen(false)}>Cancel</Button>
              <Button variant="filled" color="danger" onClick={handleSave}>
                {selectedRecord ? 'Update Record' : 'Save Emergency Record'}
              </Button>
            </div>
          </div>

          {/* Form Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-sm">Emergency Protocol Active</h4>
                <p className="text-sm text-red-700/80 mt-1">Capture minimal details to generate UHID immediately. You can complete the full registration later.</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-3">
                <User className="w-5 h-5 text-danger" />
                <h3 className="text-lg font-bold text-slate-800">Basic Info (Minimal)</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Patient Name (or Unknown)</label>
                  <input
                    type="text"
                    value={formData.patientName}
                    onChange={(e) => handleInputChange('patientName', e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-danger/20 focus:border-danger text-lg font-medium"
                    placeholder="E.g., Unknown Patient, John Doe"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Gender</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => handleInputChange('gender', e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-danger/20 focus:border-danger"
                  >
                    <option value="Unknown">Unknown</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Approximate Age</label>
                  <input
                    type="number"
                    value={formData.approximateAge}
                    onChange={(e) => handleInputChange('approximateAge', parseInt(e.target.value) || 0)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-danger/20 focus:border-danger"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-3">
                <Phone className="w-5 h-5 text-danger" />
                <h3 className="text-lg font-bold text-slate-800">Emergency Contact (If Available)</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Contact Name</label>
                  <input
                    type="text"
                    value={formData.emergencyContactName}
                    onChange={(e) => handleInputChange('emergencyContactName', e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-danger/20 focus:border-danger"
                    placeholder="Name of relative/bystander"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={formData.emergencyContactPhone}
                    onChange={(e) => handleInputChange('emergencyContactPhone', e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-danger/20 focus:border-danger"
                  />
                </div>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
