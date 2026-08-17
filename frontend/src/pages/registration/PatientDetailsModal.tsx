import { X, User, Phone, MapPin, FileText, Heart, Activity } from 'lucide-react';

interface PatientDetailsModalProps {
  patient: any;
  onClose: () => void;
}

export const PatientDetailsModal = ({ patient, onClose }: PatientDetailsModalProps) => {
  if (!patient) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Patient Details</h2>
              <p className="text-sm text-slate-500 font-medium">{patient.uhid}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-lg transition-colors text-slate-500 hover:text-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-slate-50/30">
          
          {/* Main Info Card */}
          <div className="bg-white rounded-xl border border-slate-100 p-6 mb-6 shadow-sm">
            <div className="flex flex-col md:flex-row gap-6 items-start">
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-slate-800 mb-1">
                  {patient.title} {patient.patientName}
                </h3>
                <div className="flex flex-wrap gap-y-2 gap-x-4 text-sm font-medium text-slate-600 mb-4">
                  <span className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-md">
                    <User className="w-3.5 h-3.5" />
                    {patient.gender} • {patient.age} Yrs
                  </span>
                  <span className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-md">
                    <Phone className="w-3.5 h-3.5" />
                    {patient.mobileNumber || 'N/A'}
                  </span>
                  <span className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-md border border-emerald-100">
                    <Activity className="w-3.5 h-3.5" />
                    {patient.status}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Basic Info */}
            <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm">
              <h4 className="flex items-center gap-2 text-sm font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100">
                <FileText className="w-4 h-4 text-primary" /> Basic Information
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">Date of Birth</span>
                  <span className="text-sm font-semibold text-slate-800">{patient.dateOfBirth || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">Marital Status</span>
                  <span className="text-sm font-semibold text-slate-800">{patient.maritalStatus || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">Blood Group</span>
                  <span className="text-sm font-semibold text-slate-800">{patient.bloodGroup || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">Registration Date</span>
                  <span className="text-sm font-semibold text-slate-800">{patient.registrationDate || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">Aadhaar No.</span>
                  <span className="text-sm font-semibold text-slate-800">{patient.aadhaarNumber || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Contact & Emergency Info */}
            <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm">
              <h4 className="flex items-center gap-2 text-sm font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100">
                <MapPin className="w-4 h-4 text-primary" /> Contact Details
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">City / State</span>
                  <span className="text-sm font-semibold text-slate-800">
                    {patient.city || 'N/A'} {patient.state ? `, ${patient.state}` : ''}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">Address</span>
                  <span className="text-sm font-semibold text-slate-800 text-right max-w-[60%]">
                    {patient.address1 || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between pt-2 mt-2 border-t border-slate-50">
                  <span className="text-sm text-slate-500">Emergency Contact</span>
                  <span className="text-sm font-semibold text-slate-800">
                    {patient.emergencyContactName || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">Relation</span>
                  <span className="text-sm font-semibold text-slate-800">
                    {patient.emergencyRelationship || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">Emerg. Phone</span>
                  <span className="text-sm font-semibold text-slate-800">
                    {patient.emergencyMobile || 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            {/* Medical History */}
            <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm md:col-span-2">
              <h4 className="flex items-center gap-2 text-sm font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100">
                <Heart className="w-4 h-4 text-primary" /> Medical Background
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1 uppercase tracking-wider font-bold">Allergies</p>
                  <p className="text-sm font-semibold text-slate-800">{patient.allergies || 'None reported'}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1 uppercase tracking-wider font-bold">Chronic Diseases</p>
                  <p className="text-sm font-semibold text-slate-800">{patient.chronicDiseases || 'None'}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1 uppercase tracking-wider font-bold">Medication</p>
                  <p className="text-sm font-semibold text-slate-800">{patient.currentMedication || 'None'}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1 uppercase tracking-wider font-bold">Patient Type</p>
                  <p className="text-sm font-semibold text-slate-800">{patient.patientType || 'OP'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-800 text-white text-sm font-bold rounded-xl hover:bg-slate-700 transition-colors shadow-sm"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
};
