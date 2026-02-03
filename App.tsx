
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
      if (process.env.API_KEY) {
        setHasApiKey(true);
        return;
      }
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

  if (hasApiKey === null) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin h-8 w-8 text-blue-600 border-4 border-slate-200 border-t-current rounded-full"></div></div>;

  if (!hasApiKey) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Gemini API Connection Required</h2>
        <p className="text-slate-600 mb-8 text-sm">To perform high-quality research, please connect your API key from Google AI Studio.</p>
        <Button onClick={handleConnectKey} className="w-full py-4">Connect API Key</Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 h-16 flex items-center px-4 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto w-full flex justify-between items-center">
          <div className="flex items-center gap-2 cursor-pointer" onClick={reset}>
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white">E</div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">EquityResearch<span className="text-blue-600">Pro</span></h1>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto px-4 py-12 w-full">
        <div className="max-w-3xl mx-auto text-center mb-12">
          <h2 className="text-4xl font-extrabold text-slate-900 mb-4 tracking-tight">Automated Research Hub</h2>
          <p className="text-lg text-slate-600">Enter a company name to automatically retrieve filings and generate institutional-grade analysis.</p>
        </div>

        <div className="max-w-xl mx-auto mb-16">
          <form onSubmit={startResearch} className="relative group flex flex-col gap-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Enter Company (e.g. Tesla, Ferrari, ASML)..."
                className="w-full px-6 py-5 rounded-2xl border-2 border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all text-lg font-medium shadow-sm"
                value={state.companyName}
                onChange={(e) => setState(prev => ({ ...prev, companyName: e.target.value }))}
                disabled={state.isProcessing}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Button type="submit" isLoading={state.isProcessing} disabled={!state.companyName || state.isProcessing} className="px-6 py-3">
                  Start Analysis
                </Button>
              </div>
            </div>
            {state.error && <p className="text-red-500 text-sm font-medium text-center">{state.error}</p>}
          </form>
        </div>

        {state.currentStep !== ResearchStep.IDLE && state.currentStep !== ResearchStep.COMPLETED && (
          <ResearchProgress currentStep={state.currentStep} isProcessing={state.isProcessing} />
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
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
              }} 
            />
          ))}
        </div>
      </main>
    </div>
  );
}
