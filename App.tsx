
import React, { useState, useEffect } from 'react';
import { ResearchStep, ResearchState, Artifact, ResearchHistoryItem } from './types';
import { getDocumentSources, getEquityReport, getInvestmentMemo } from './services/geminiService';
import { Button } from './components/Button';
import { ResearchProgress } from './components/ResearchProgress';
import { ArtifactCard } from './components/ArtifactCard';

const HISTORY_KEY = 'equity_research_history';

// Declare window extension for TypeScript
// Fixed the conflict by defining the expected AIStudio interface name
interface AIStudio {
  hasSelectedApiKey: () => Promise<boolean>;
  openSelectKey: () => Promise<void>;
}

declare global {
  interface Window {
    aistudio: AIStudio;
  }
}

export default function App() {
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);
  const [state, setState] = useState<ResearchState>({
    companyName: '',
    currentStep: ResearchStep.IDLE,
    artifacts: [],
    history: [],
    isProcessing: false
  });

  // Check for API key on mount
  useEffect(() => {
    const checkKey = async () => {
      // If process.env.API_KEY is already set (e.g. from Vercel), we're good
      if (process.env.API_KEY) {
        setHasApiKey(true);
        return;
      }
      
      // Otherwise, check for aistudio selected key
      try {
        const selected = await window.aistudio.hasSelectedApiKey();
        setHasApiKey(selected);
      } catch (e) {
        setHasApiKey(false);
      }
    };
    checkKey();

    const savedHistory = localStorage.getItem(HISTORY_KEY);
    if (savedHistory) {
      try {
        const parsed = JSON.parse(savedHistory);
        setState(prev => ({ ...prev, history: parsed }));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
  }, []);

  const handleConnectKey = async () => {
    try {
      await window.aistudio.openSelectKey();
      // Assume success after opening dialog per instructions
      setHasApiKey(true);
    } catch (e) {
      console.error("Failed to open key selection", e);
    }
  };

  const saveToHistory = (companyName: string, artifacts: Artifact[]) => {
    const newItem: ResearchHistoryItem = {
      companyName,
      timestamp: Date.now(),
      artifacts
    };

    setState(prev => {
      const filteredHistory = prev.history.filter(item => 
        item.companyName.toLowerCase() !== companyName.toLowerCase()
      );
      const updatedHistory = [newItem, ...filteredHistory].slice(0, 5);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(updatedHistory));
      return { ...prev, history: updatedHistory };
    });
  };

  const loadFromHistory = (item: ResearchHistoryItem) => {
    setState(prev => ({
      ...prev,
      companyName: item.companyName,
      artifacts: item.artifacts,
      currentStep: ResearchStep.COMPLETED,
      isProcessing: false,
      error: undefined
    }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const downloadArtifact = (artifact: Artifact) => {
    const blob = new Blob([artifact.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = artifact.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const startResearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!state.companyName || state.isProcessing) return;

    const targetCompany = state.companyName;

    setState(prev => ({ 
      ...prev, 
      isProcessing: true, 
      currentStep: ResearchStep.DOCUMENTS,
      artifacts: [],
      error: undefined
    }));

    try {
      // Step 1: Document Sources
      const docSourcesContent = await getDocumentSources(targetCompany);
      const docArtifact: Artifact = {
        id: 'step1',
        title: 'Official Document Sources',
        filename: `${targetCompany.replace(/\s+/g, '_')}_1_Document_Sources.md`,
        content: docSourcesContent
      };
      
      setState(prev => ({ 
        ...prev, 
        artifacts: [docArtifact],
        currentStep: ResearchStep.REPORT 
      }));

      // Step 2: Equity Analyst Report
      const equityReportContent = await getEquityReport(targetCompany, docSourcesContent);
      const reportArtifact: Artifact = {
        id: 'step2',
        title: 'Equity Analyst Report',
        filename: `${targetCompany.replace(/\s+/g, '_')}_2_Equity_Report.md`,
        content: equityReportContent
      };

      setState(prev => ({ 
        ...prev, 
        artifacts: [docArtifact, reportArtifact],
        currentStep: ResearchStep.MEMO 
      }));

      // Step 3: Investment Memo
      const memoContent = await getInvestmentMemo(targetCompany, `${docSourcesContent}\n\n${equityReportContent}`);
      const memoArtifact: Artifact = {
        id: 'step3',
        title: 'Investment Memo',
        filename: `${targetCompany.replace(/\s+/g, '_')}_3_Investment_Memo.md`,
        content: memoContent
      };

      const finalArtifacts = [docArtifact, reportArtifact, memoArtifact];

      setState(prev => ({ 
        ...prev, 
        artifacts: finalArtifacts,
        currentStep: ResearchStep.COMPLETED,
        isProcessing: false
      }));

      saveToHistory(targetCompany, finalArtifacts);

    } catch (err: any) {
      console.error(err);
      const errorMessage = err.message || '';
      
      // Handle the revoked key error case per requirements
      if (errorMessage.includes("Requested entity was not found.")) {
        setHasApiKey(false);
        setState(prev => ({ ...prev, isProcessing: false, currentStep: ResearchStep.IDLE }));
        return;
      }

      setState(prev => ({ 
        ...prev, 
        isProcessing: false, 
        error: errorMessage || 'An unexpected error occurred during research.',
        currentStep: ResearchStep.ERROR
      }));
    }
  };

  const reset = () => {
    setState(prev => ({
      ...prev,
      companyName: '',
      currentStep: ResearchStep.IDLE,
      artifacts: [],
      isProcessing: false,
      error: undefined
    }));
  };

  // Initial loading state while checking key
  if (hasApiKey === null) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 text-blue-600 border-4 border-slate-200 border-t-current rounded-full"></div>
      </div>
    );
  }

  // Key Selection Screen
  if (!hasApiKey) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-200 p-8 text-center">
          <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-6 text-blue-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-4 tracking-tight">Connect to Gemini API</h2>
          <p className="text-slate-600 mb-8">
            To generate institutional-grade research, this application requires access to a Gemini API key. Please connect your paid API key from Google AI Studio.
          </p>
          <div className="space-y-4">
            <Button onClick={handleConnectKey} className="w-full py-4 text-lg">
              Connect API Key
            </Button>
            <a 
              href="https://ai.google.dev/gemini-api/docs/billing" 
              target="_blank" 
              rel="noopener noreferrer"
              className="block text-sm text-slate-400 hover:text-blue-600 transition-colors"
            >
              Learn about billing and requirements &rarr;
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={reset}>
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">EquityResearch<span className="text-blue-600">Pro</span></h1>
          </div>
          <div className="flex items-center gap-4">
             <span className="text-xs font-medium text-slate-400 uppercase tracking-widest hidden sm:block">AI Research Agent v1.0</span>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto px-4 py-12 w-full">
        <div className="max-w-3xl mx-auto text-center mb-12">
          <h2 className="text-4xl font-extrabold text-slate-900 mb-4 tracking-tight">
            Automated Institutional-Grade Research
          </h2>
          <p className="text-lg text-slate-600">
            Enter a public company name to automatically source official filings, generate an equity analyst report, and build a 5-page investment memo.
          </p>
        </div>

        <div className="max-w-xl mx-auto mb-16">
          <form onSubmit={startResearch} className="relative group">
            <input
              type="text"
              placeholder="e.g. NVIDIA, Apple, LVMH, ASML..."
              className="w-full px-6 py-5 rounded-2xl border-2 border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all text-lg font-medium shadow-sm group-hover:border-slate-300 disabled:opacity-50"
              value={state.companyName}
              onChange={(e) => setState(prev => ({ ...prev, companyName: e.target.value }))}
              disabled={state.isProcessing}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Button 
                type="submit" 
                isLoading={state.isProcessing}
                disabled={!state.companyName || state.isProcessing}
                className="px-6 py-3 rounded-xl"
              >
                Research
              </Button>
            </div>
          </form>
          {state.error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm font-medium">{state.error}</p>
            </div>
          )}
        </div>

        {!state.isProcessing && state.currentStep === ResearchStep.IDLE && state.history.length > 0 && (
          <div className="max-w-4xl mx-auto mb-16">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6 px-4">Recent Analyses</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {state.history.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => loadFromHistory(item)}
                  className="bg-white border border-slate-200 rounded-xl p-4 text-left hover:border-blue-500 hover:shadow-sm transition-all group"
                >
                  <div className="text-xs text-slate-400 mb-1">{new Date(item.timestamp).toLocaleDateString()}</div>
                  <div className="font-bold text-slate-900 group-hover:text-blue-600 truncate">{item.companyName}</div>
                  <div className="mt-2 flex gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {state.currentStep !== ResearchStep.IDLE && state.currentStep !== ResearchStep.ERROR && state.currentStep !== ResearchStep.COMPLETED && (
          <ResearchProgress currentStep={state.currentStep} isProcessing={state.isProcessing} />
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
          {state.artifacts.map((artifact) => (
            <ArtifactCard 
              key={artifact.id} 
              artifact={artifact} 
              onDownload={downloadArtifact} 
            />
          ))}
          
          {state.isProcessing && state.artifacts.length < 3 && (
            <div className="bg-white rounded-xl border-2 border-dashed border-slate-200 p-8 flex flex-col items-center justify-center min-h-[300px] animate-pulse">
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <svg className="animate-spin h-6 w-6 text-slate-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
              <p className="text-sm font-medium text-slate-400">Generating next artifact...</p>
            </div>
          )}
        </div>

        {state.currentStep === ResearchStep.COMPLETED && (
          <div className="mt-16 text-center">
             <Button 
                variant="outline" 
                onClick={reset}
                className="mx-auto"
             >
               Start New Analysis
             </Button>
          </div>
        )}
      </main>

      <footer className="py-12 border-t border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 flex flex-col items-center gap-6">
          <div className="flex gap-8 text-slate-400 text-sm font-medium">
            <span className="hover:text-blue-600 cursor-pointer">Methodology</span>
            <span className="hover:text-blue-600 cursor-pointer">API Integration</span>
            <span className="hover:text-blue-600 cursor-pointer">Disclaimer</span>
          </div>
          <p className="text-slate-400 text-xs text-center max-w-2xl">
            EquityResearchPro is an AI-powered research assistant. Information provided is for educational purposes only and does not constitute financial advice. Always verify with official SEC or regulator filings.
          </p>
        </div>
      </footer>
    </div>
  );
}
