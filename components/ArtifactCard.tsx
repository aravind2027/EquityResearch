
import React from 'react';
import { Artifact } from '../types';
import { Button } from './Button';

interface ArtifactCardProps {
  artifact: Artifact;
  onDownload: (artifact: Artifact) => void;
}

export const ArtifactCard: React.FC<ArtifactCardProps> = ({ artifact, onDownload }) => {
  const formatMarkdownForPrint = (content: string) => {
    // Basic but effective regex-based markdown to HTML converter for professional printing
    return content
      .replace(/^# (.*$)/gm, '<h1 class="pdf-h1">$1</h1>')
      .replace(/^## (.*$)/gm, '<h2 class="pdf-h2">$1</h2>')
      .replace(/^### (.*$)/gm, '<h3 class="pdf-h3">$1</h3>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/^\- (.*$)/gm, '<li>$1</li>')
      .split('\n\n').map(p => {
        if (p.startsWith('<h') || p.startsWith('<li')) return p;
        return `<p class="pdf-p">${p.replace(/\n/g, '<br>')}</p>`;
      }).join('\n');
  };

  const exportToPdf = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const companyName = artifact.filename.split('_')[0] || 'Institutional';
    const reportHtml = formatMarkdownForPrint(artifact.content);
    const dateStr = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', month: 'long', day: 'numeric' 
    });

    printWindow.document.write(`
      <html>
        <head>
          <title>${artifact.title} | EquityResearchPro</title>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
          <style>
            @media print {
              @page { margin: 2.5cm; }
              body { padding: 0; }
              .no-print { display: none; }
            }
            body { 
              font-family: 'Inter', sans-serif; 
              line-height: 1.6; 
              color: #1e293b; 
              padding: 60px;
              max-width: 850px;
              margin: 0 auto;
            }
            .header {
              border-bottom: 2px solid #0f172a;
              padding-bottom: 20px;
              margin-bottom: 40px;
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
            }
            .logo {
              font-weight: 800;
              font-size: 14pt;
              color: #2563eb;
              text-transform: uppercase;
              letter-spacing: 0.1em;
            }
            .meta-info {
              text-align: right;
              font-size: 9pt;
              color: #64748b;
              font-weight: 500;
            }
            .pdf-h1 { 
              font-size: 28pt; 
              font-weight: 800; 
              margin-bottom: 12px; 
              color: #0f172a; 
              letter-spacing: -0.02em;
              line-height: 1.1;
            }
            .pdf-h2 { 
              font-size: 18pt; 
              font-weight: 700; 
              margin-top: 32px; 
              margin-bottom: 16px; 
              color: #0f172a;
              border-bottom: 1px solid #e2e8f0;
              padding-bottom: 8px;
            }
            .pdf-h3 { 
              font-size: 14pt; 
              font-weight: 600; 
              margin-top: 24px; 
              margin-bottom: 8px; 
              color: #2563eb; 
            }
            .pdf-p { margin-bottom: 16px; font-size: 11pt; color: #334155; }
            li { margin-bottom: 8px; font-size: 11pt; color: #334155; }
            .footer {
              margin-top: 60px;
              padding-top: 20px;
              border-top: 1px solid #f1f5f9;
              font-size: 8pt;
              color: #94a3b8;
              text-align: center;
              font-style: italic;
            }
            .watermark {
              position: fixed;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%) rotate(-45deg);
              font-size: 80pt;
              color: rgba(0, 0, 0, 0.03);
              font-weight: 800;
              z-index: -1;
              pointer-events: none;
              text-transform: uppercase;
            }
          </style>
        </head>
        <body>
          <div class="watermark">INSTITUTIONAL</div>
          <div class="header">
            <div>
              <div class="logo">EquityResearchPro</div>
              <div style="font-size: 8pt; font-weight: 600; color: #94a3b8;">CONFIDENTIAL ANALYSIS</div>
            </div>
            <div class="meta-info">
              <div>REPORT FOR: <strong>${companyName.toUpperCase()}</strong></div>
              <div>DATE: ${dateStr}</div>
            </div>
          </div>

          <div class="content">
            ${reportHtml}
          </div>

          <div class="footer">
            <p>Proprietary Research &copy; ${new Date().getFullYear()} EquityResearchPro. This report is for institutional use only and does not constitute investment advice. Accuracy of point-in-time data is based on retrieved regulatory filings.</p>
          </div>
          
          <script>
            window.onload = () => {
              setTimeout(() => {
                window.print();
              }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col hover:shadow-md transition-all h-full">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-600/5 rounded-xl text-blue-600 ring-1 ring-blue-600/10">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h3 className="font-bold text-slate-900 leading-tight tracking-tight">{artifact.title}</h3>
            <p className="text-[10px] font-mono text-slate-400 mt-0.5 uppercase">{artifact.filename}</p>
          </div>
        </div>
      </div>
      
      <div className="mt-4 flex-1 prose prose-sm max-h-48 overflow-y-auto text-slate-600 border-t border-slate-50 pt-4 scrollbar-thin scrollbar-thumb-slate-200">
        <div className="whitespace-pre-wrap font-mono text-[10px] leading-relaxed opacity-60">
          {artifact.content.slice(0, 500)}...
        </div>
      </div>

      <div className="mt-6 space-y-2">
        <Button 
          variant="primary" 
          className="w-full text-xs py-3 font-bold uppercase tracking-wider"
          onClick={exportToPdf}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Export as PDF
        </Button>
        <Button 
          variant="outline" 
          className="w-full text-[11px] py-2 text-slate-500 uppercase font-medium tracking-tight"
          onClick={() => onDownload(artifact)}
        >
          Download .MD
        </Button>
      </div>
    </div>
  );
};
