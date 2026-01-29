
import React from 'react';
import { Artifact } from '../types';
import { Button } from './Button';

interface ArtifactCardProps {
  artifact: Artifact;
  onDownload: (artifact: Artifact) => void;
}

export const ArtifactCard: React.FC<ArtifactCardProps> = ({ artifact, onDownload }) => {
  const exportToPdf = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>${artifact.title} - ${artifact.filename}</title>
          <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
          <style>
            @media print {
              body { padding: 2cm; }
              .no-print { display: none; }
            }
            body { font-family: 'Inter', sans-serif; line-height: 1.6; color: #1a202c; padding: 40px; }
            h1 { font-size: 24pt; font-weight: bold; margin-bottom: 20px; border-bottom: 2px solid #2563eb; padding-bottom: 10px; }
            h2 { font-size: 18pt; font-weight: bold; margin-top: 30px; margin-bottom: 15px; color: #1e293b; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 10pt; }
            th, td { border: 1px solid #e2e8f0; padding: 12px; text-align: left; }
            th { background-color: #f8fafc; font-weight: 600; }
            .meta { color: #64748b; font-size: 9pt; margin-bottom: 40px; }
          </style>
        </head>
        <body>
          <h1>${artifact.title}</h1>
          <div class="meta">Generated for: ${artifact.filename.split('_')[0]} | Document Type: Equity Research Artifact</div>
          <div class="prose max-w-none">
            ${artifact.content.replace(/\n/g, '<br/>')}
          </div>
          <script>
            window.onload = () => {
              window.print();
              // window.close(); // Optional: close tab after printing
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col hover:shadow-md transition-all">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-slate-900 leading-tight">{artifact.title}</h3>
              <span className="text-[10px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded border border-red-100 font-bold">PDF READY</span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">{artifact.filename}</p>
          </div>
        </div>
      </div>
      
      <div className="mt-4 flex-1 prose prose-sm max-h-48 overflow-y-auto text-slate-600 border-t border-slate-50 pt-4 scrollbar-thin scrollbar-thumb-slate-200">
        <div className="whitespace-pre-wrap font-mono text-[10px] leading-relaxed opacity-70">
          {artifact.content.slice(0, 400)}...
        </div>
      </div>

      <div className="mt-6 space-y-2">
        <Button 
          variant="primary" 
          className="w-full text-sm py-2.5"
          onClick={exportToPdf}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Export as PDF
        </Button>
        <Button 
          variant="outline" 
          className="w-full text-sm py-2"
          onClick={() => onDownload(artifact)}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download .md
        </Button>
      </div>
    </div>
  );
};
