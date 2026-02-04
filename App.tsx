
import React, { useState, useEffect } from 'react';
import { ResearchStep, ResearchState, Artifact, ResearchHistoryItem } from './types';
import { getDocumentSources, getEquityReport, getInvestmentMemo } from './services/geminiService';
import { Button } from './components/Button';
import { ResearchProgress } from './components/ResearchProgress';
import { ArtifactCard } from './components/ArtifactCard';

const HISTORY_KEY = 'equity_research_history';

declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }
  interface Window {
    aistudio?: AIStudio;
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

  useEffect(() => {
    const checkKey = async () => {
      // Priority 1: Environment variable
      if (process.env.API_KEY) {
        setHasApiKey(true);
        return;
      }
      // Priority 2: AI Studio Key Selection
      try {
        const selected = await window.aistudio?.hasSelectedApiKey();
        setHasApiKey(!!selected);
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
      await window.aistudio?.openSelectKey();
      // Proceed immediately to satisfy standard secure flow
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
      const updatedHistory = [newItem, ...prev.history.filter(h => h.companyName !== companyName)].slice(0, 5);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(updatedHistory));
      return { ...prev, history: updatedHistory };
    });
  };

  const startResearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!state.companyName || state.isProcessing) return;

    const company = state.companyName;
    setState(prev => ({ ...prev, isProcessing: true, currentStep: ResearchStep.DOCUMENTS, artifacts: [], error: undefined }));

    try {
      // Step 1: Document Sources
      const docs = await getDocumentSources(company);
      const docArtifact: Artifact = { id: 'docs', title: 'Document Sources', filename: `${company}_sources.md`, content: docs };
      setState(prev => ({ ...prev, artifacts: [docArtifact], currentStep: ResearchStep.REPORT }));

      // Step 2: Equity Report
      const report = await getEquityReport(company, docs);
      const reportArtifact: Artifact = { id: 'report', title: 'Equity Analyst Report', filename: `${company}_report.md`, content: report };
      setState(prev => ({ ...prev, artifacts: [docArtifact, reportArtifact], currentStep: ResearchStep.MEMO }));

      // Step 3: Investment Memo
      const memo = await getInvestmentMemo(company, report);
      const memoArtifact: Artifact = { id: 'memo', title: 'Investment Memo', filename: `${company}_memo.md`, content: memo };
      const finalArtifacts = [docArtifact, reportArtifact, memoArtifact];

      setState(prev => ({ ...prev, artifacts: finalArtifacts, currentStep: ResearchStep.COMPLETED, isProcessing: false }));
      saveToHistory(company, finalArtifacts);

    } catch (err: any) {
      setState(prev => ({ ...prev, isProcessing: false, currentStep: ResearchStep.ERROR, error: err.message || 'An error occurred during research.' }));
    }
  };

  const reset = () => {
    setState(prev => ({ ...prev, companyName: '', currentStep: ResearchStep.IDLE, artifacts: [], isProcessing: false, error: undefined }));
  };

  if (hasApiKey === null) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="animate-spin h-10 w-10 text-blue-600 border-4 border-slate-200 border-t-current rounded-full"></div>
    </div>
  );

  if (!hasApiKey) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="max-w-lg w-full bg-white rounded-[2.5rem] shadow-2xl shadow-blue-500/10 p-12 text-center border border-slate-100">
        <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-lg shadow-blue-600/20 ring-4 ring-blue-50">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 00-2 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h2 className="text-3xl font-extrabold text-slate-900 mb-4 tracking-tight">Institutional Access Required</h2>
        <p className="text-slate-600 mb-10 text-lg leading-relaxed">
          EquityResearchPro requires a secure connection to the Gemini 3 API to perform deep-dive analysis. 
          Please connect your key from the Google AI Studio to begin.
        </p>
        <div className="space-y-4">
          <Button onClick={handleConnectKey} className="w-full py-5 text-lg font-bold uppercase tracking-widest shadow-xl shadow-blue-500/20">
            Connect Secure API Key
          </Button>
          <p className="text-xs text-slate-400 font-medium italic">
            Your key is handled securely via the platform's authorized credential environment.
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 h-20 flex items-center px-6 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto w-full flex justify-between items-center">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={reset}>
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center font-bold text-white text-xl shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform">E</div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tighter">EquityResearch<span className="text-blue-600">Pro</span></h1>
          </div>
          {state.history.length > 0 && (
            <div className="hidden sm:flex items-center gap-4">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Recent:</span>
              <div className="flex gap-2">
                {state.history.map(h => (
                  <button 
                    key={h.companyName}
                    onClick={() => setState(prev => ({ ...prev, companyName: h.companyName, artifacts: h.artifacts, currentStep: ResearchStep.COMPLETED }))}
                    className="px-3 py-1 bg-slate-100 hover:bg-slate-200 rounded-full text-[10px] font-bold text-slate-600 transition-colors"
                  >
                    {h.companyName}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto px-6 py-16 w-full">
        <div className="max-w-4xl mx-auto text-center mb-16">
          <div className="inline-block px-4 py-1.5 bg-blue-50 border border-blue-100 rounded-full text-blue-600 text-xs font-bold uppercase tracking-widest mb-6">
            Institutional Research Engine
          </div>
          <h2 className="text-5xl lg:text-6xl font-black text-slate-900 mb-6 tracking-tighter leading-[1.1]">
            Automated Investment <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Deep Dives.</span>
          </h2>
          <p className="text-xl text-slate-600 font-medium max-w-2xl mx-auto leading-relaxed">
            Harnessing Gemini 3 reasoning to retrieve primary sources and generate high-conviction equity analyst reports in minutes.
          </p>
        </div>

        <div className="max-w-2xl mx-auto mb-20">
          <form onSubmit={startResearch} className="relative group">
            <div className="relative">
              <input
                type="text"
                placeholder="Search Company (e.g. Nvidia, Berkshire Hathaway)..."
                className="w-full pl-8 pr-48 py-6 rounded-[2rem] border-2 border-slate-200 bg-white focus:border-blue-500 focus:ring-8 focus:ring-blue-50 outline-none transition-all text-xl font-semibold shadow-xl shadow-slate-200/50"
                value={state.companyName}
                onChange={(e) => setState(prev => ({ ...prev, companyName: e.target.value }))}
                disabled={state.isProcessing}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Button 
                  type="submit" 
                  isLoading={state.isProcessing} 
                  disabled={!state.companyName || state.isProcessing} 
                  className="px-8 py-4 rounded-2xl text-base font-bold uppercase tracking-wider"
                >
                  Analyze
                </Button>
              </div>
            </div>
            {state.error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm font-bold flex items-center justify-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {state.error}
              </div>
            )}
          </form>
        </div>

        {state.currentStep !== ResearchStep.IDLE && state.currentStep !== ResearchStep.COMPLETED && (
          <ResearchProgress currentStep={state.currentStep} isProcessing={state.isProcessing} />
        )}

        {state.artifacts.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-16 animate-in fade-in slide-in-from-bottom-8 duration-700">
            {state.artifacts.map((artifact) => (
              <ArtifactCard 
                key={artifact.id} 
                artifact={artifact} 
                onDownload={(a) => {
                  const blob = new Blob([a.content], { type: 'text/markdown' });
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = a.filename;
                  link.click();
                  URL.revokeObjectURL(url);
                }} 
              />
            ))}
          </div>
        )}
      </main>
      
      <footer className="py-12 border-t border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 text-center text-slate-400 text-xs font-bold uppercase tracking-[0.2em]">
          Powered by Gemini 3 Pro &bull; Official SEC Filings &bull; EquityResearchPro v2.0
        </div>
      </footer>
    </div>
  );
}
