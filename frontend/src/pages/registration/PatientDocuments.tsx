import { useState } from 'react';
import { Search, Upload, FileText, Download, Trash2, Eye, FolderOpen } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_URL as string;
import { exportToExcel } from '../../utils/exportToExcel';

interface DocumentRecord {
  id: number;
  uhid: string;
  documentType: string;
  documentName: string;
  uploadDate: string;
  uploadedBy: string;
  size: string;
}



export const PatientDocuments = () => {

  const [patients, setPatients] = useState<any[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUhid, setSelectedUhid] = useState<string>('');
  
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [newDocType, setNewDocType] = useState('');
  const [newDocFile, setNewDocFile] = useState<File | null>(null);

  // Fetch all patients for search
  const fetchPatients = async () => {
    try {
      const res = await fetch(`${API_BASE}/patients/`);
      if (res.ok) {
        const data = await res.json();
        setPatients(data.map((d: any) => ({
          uhid: d.Uhid,
          patientName: d.PatientName
        })));
      }
    } catch (e) {
      console.error('Failed to fetch patients', e);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  // Fetch documents when a patient is selected
  const fetchDocuments = async (uhid: string) => {
    try {
      const res = await fetch(`${API_BASE}/documents/${uhid}`);
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.map((d: any) => ({
          id: d.DocumentId,
          uhid: d.Uhid,
          documentType: d.DocumentType,
          documentName: d.DocumentName,
          uploadDate: d.UploadDate?.split(' ')[0] || '', // Extract date
          uploadedBy: d.UploadedBy,
          size: d.Size,
          filePath: d.FilePath
        })));
      }
    } catch (e) {
      console.error('Failed to fetch documents', e);
    }
  };

  useEffect(() => {
    if (selectedUhid) {
      fetchDocuments(selectedUhid);
    } else {
      setDocuments([]);
    }
  }, [selectedUhid]);


  const filteredPatients = patients.filter(p => 
    p.uhid.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (p.patientName || '').toLowerCase().includes(searchTerm.toLowerCase())
  ).slice(0, 5);

  const patientDocuments = documents.filter(d => d.uhid === selectedUhid);
  const selectedPatient = patients.find(p => p.uhid === selectedUhid);


  const handleDelete = async (documentId: number) => {
    if (!confirm('Are you sure you want to delete this document?')) return;
    try {
      const res = await fetch(`${API_BASE}/documents/${documentId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchDocuments(selectedUhid); // Refresh the list
      } else {
        setErrorMessage('Delete failed');
      }
    } catch (e) {
      console.error('Failed to delete document', e);
      setErrorMessage('Delete failed');
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUhid || !newDocType || !newDocFile) return;

    const formData = new FormData();
    formData.append('uhid', selectedUhid);
    formData.append('documentType', newDocType);
    formData.append('file', newDocFile);

    try {
      const res = await fetch(`${API_BASE}/documents/`, {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        setIsUploadOpen(false);
        setNewDocType('');
        setNewDocFile(null);
        fetchDocuments(selectedUhid); // Refresh the list
      } else {
        setErrorMessage('Upload failed');
      }
    } catch (e) {
      console.error('Failed to upload document', e);
      setErrorMessage('Upload failed');
    }
  };


  return (
    <div className="h-[calc(100vh-2rem)] flex flex-col relative">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Patient Documents</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        
        {/* Left Column - Patient Search */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 flex flex-col h-full">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Select Patient</h3>
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by UHID or Name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
              />
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <div className="space-y-2">
                {filteredPatients.map(patient => (
                  <div 
                    key={patient.uhid}
                    onClick={() => setSelectedUhid(patient.uhid)}
                    className={`p-4 rounded-xl cursor-pointer transition-all border ${
                      selectedUhid === patient.uhid 
                        ? 'bg-primary/5 border-primary text-primary' 
                        : 'bg-white border-slate-200 hover:border-primary/50 text-slate-700'
                    }`}
                  >
                    <div className="font-bold">{patient.uhid}</div>
                    <div className="text-sm opacity-80">{patient.patientName || 'Unknown'}</div>
                  </div>
                ))}
                {filteredPatients.length === 0 && (
                  <div className="text-center text-slate-500 py-8">
                    No patients found.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Document List & Upload */}
        <div className="lg:col-span-2 flex flex-col h-full">
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex-1 flex flex-col overflow-hidden">
            
            {selectedUhid ? (
              <>
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">
                      Documents for {selectedPatient?.patientName || selectedUhid}
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">{patientDocuments.length} files found</p>
                  </div>
                  <Button variant="filled" color="primary" icon={Upload} onClick={() => setIsUploadOpen(true)}>
                    Upload File
                  </Button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                  {patientDocuments.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {patientDocuments.map(doc => (
                        <div key={doc.id} className="p-4 rounded-xl border border-slate-200 bg-white hover:shadow-md transition-all group flex items-start gap-4">
                          <div className="w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                            <FileText className="w-6 h-6" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-slate-800 truncate" title={doc.documentName}>
                              {doc.documentName}
                            </h4>
                            <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                              <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600">{doc.documentType}</span>
                              <span>{doc.size}</span>
                            </div>
                            <div className="text-xs text-slate-400 mt-1">
                              Uploaded by {doc.uploadedBy} on {doc.uploadDate}
                            </div>
                          </div>
                          <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg" onClick={() => window.open((doc as any).filePath, '_blank')}>
                              <Eye className="w-4 h-4" />
                            </button>
                            <button className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg" onClick={() => exportToExcel(patients, 'PatientDocuments')}>
                  <Download className="w-5 h-5" />
                  Export
                </button>
                            <button className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg" onClick={() => handleDelete(doc.id)}>
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500">
                      <FolderOpen className="w-12 h-12 text-slate-300 mb-4" />
                      <p className="text-lg font-medium text-slate-600">No documents found</p>
                      <p className="text-sm mt-1">Click the Upload button to add files for this patient.</p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 p-8 text-center">
                <Search className="w-12 h-12 text-slate-300 mb-4" />
                <p className="text-lg font-medium text-slate-600">Select a patient</p>
                <p className="text-sm mt-1">Search and select a patient from the left panel to view or upload their documents.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      {isUploadOpen && (
        <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-800">Upload Document</h2>
              <button onClick={() => setIsUploadOpen(false)} className="text-slate-400 hover:text-slate-600">
                &times;
              </button>
            </div>
            <form onSubmit={handleUpload} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Document Type *</label>
                <select
                  required
                  value={newDocType}
                  onChange={(e) => setNewDocType(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">Select Type...</option>
                  <option value="Aadhaar Card">Aadhaar Card</option>
                  <option value="PAN Card">PAN Card</option>
                  <option value="Passport">Passport</option>
                  <option value="Insurance Policy">Insurance Policy</option>
                  <option value="Old Medical Reports">Old Medical Reports</option>
                  <option value="Consent Form">Consent Form</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Select File *</label>
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer relative">
                  <input 
                    type="file" 
                    required
                    onChange={(e) => setNewDocFile(e.target.files?.[0] || null)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  {newDocFile ? (
                    <div className="text-primary font-medium flex items-center justify-center gap-2">
                      <FileText className="w-5 h-5" />
                      {newDocFile.name}
                    </div>
                  ) : (
                    <div className="text-slate-500">
                      <Upload className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                      <p className="font-medium">Click or drag file to upload</p>
                      <p className="text-xs mt-1">PDF, JPG, PNG up to 10MB</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <Button variant="outline" onClick={() => setIsUploadOpen(false)} type="button">Cancel</Button>
                <Button variant="filled" color="primary" type="submit">Upload File</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Error Modal */}
      {errorMessage && (
        <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="p-6 border-b border-red-100 flex items-center gap-3 bg-red-50">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 shrink-0">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-slate-800">Error</h2>
            </div>
            <div className="p-6">
              <p className="text-slate-600">{errorMessage}</p>
            </div>
            <div className="p-6 border-t border-slate-100 flex justify-end bg-slate-50">
              <Button variant="filled" color="primary" onClick={() => setErrorMessage('')} type="button">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
