import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { FileText, Download, Printer, Image as ImageIcon, X } from 'lucide-react';
import toast from 'react-hot-toast';

export const MockDocumentViewer: React.FC = () => {
  const [searchParams] = useSearchParams();
  const file = searchParams.get('file') || 'Document';
  
  const isImage = file.toLowerCase().endsWith('.jpg') || file.toLowerCase().endsWith('.png') || file.toLowerCase().endsWith('.jpeg');

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    toast.success(`Downloading ${file}...`);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button onClick={() => window.close()} className="p-2 hover:bg-slate-100 rounded-full transition-colors" title="Close Tab">
            <X className="w-5 h-5 text-slate-600" />
          </button>
          <div className="flex items-center gap-2">
            {isImage ? <ImageIcon className="w-5 h-5 text-blue-500" /> : <FileText className="w-5 h-5 text-purple-500" />}
            <div>
              <h1 className="font-bold text-slate-800 text-lg leading-tight">{file}</h1>
              <p className="text-xs text-slate-500">Secure Document Viewer</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
            <Printer className="w-4 h-4" /> Print
          </button>
          <button onClick={handleDownload} className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">
            <Download className="w-4 h-4" /> Download
          </button>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8 overflow-y-auto">
        <div className="w-full max-w-4xl bg-white shadow-xl border border-slate-200 rounded-xl overflow-hidden min-h-[80vh] flex flex-col">
          <div className="bg-slate-50 p-4 border-b border-slate-100 flex justify-between items-center">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Preview Generated</span>
            <span className="text-xs font-mono text-slate-400">PAGE 1 OF 1</span>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
             {isImage ? (
                <>
                  <ImageIcon className="w-24 h-24 text-slate-200 mb-6" />
                  <h2 className="text-2xl font-bold text-slate-700 mb-2">Image Preview</h2>
                  <p className="text-slate-500 max-w-md mx-auto">This is a mockup of the document viewer. In a production environment, the actual image "{file}" would be rendered here.</p>
                </>
             ) : (
                <>
                  <FileText className="w-24 h-24 text-slate-200 mb-6" />
                  <h2 className="text-2xl font-bold text-slate-700 mb-2">Document Preview</h2>
                  <p className="text-slate-500 max-w-md mx-auto">This is a mockup of the document viewer. In a production environment, the actual PDF or DOCX file "{file}" would be rendered here.</p>
                  
                  <div className="w-full max-w-lg mt-12 space-y-4 opacity-40">
                    <div className="h-4 bg-slate-200 rounded w-full"></div>
                    <div className="h-4 bg-slate-200 rounded w-5/6"></div>
                    <div className="h-4 bg-slate-200 rounded w-4/6"></div>
                    <div className="h-4 bg-slate-200 rounded w-full"></div>
                    <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                    <div className="h-4 bg-slate-200 rounded w-1/2"></div>
                  </div>
                </>
             )}
          </div>
        </div>
      </div>
    </div>
  );
};
