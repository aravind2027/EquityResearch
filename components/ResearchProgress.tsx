
import React from 'react';
import { ResearchStep } from '../types';

interface ResearchProgressProps {
  currentStep: ResearchStep;
  isProcessing: boolean;
}

export const ResearchProgress: React.FC<ResearchProgressProps> = ({ currentStep, isProcessing }) => {
  const steps = [
    { id: ResearchStep.DOCUMENTS, label: 'Document Sourcing' },
    { id: ResearchStep.REPORT, label: 'Equity Report' },
    { id: ResearchStep.MEMO, label: 'Investment Memo' },
  ];

  const getStepIndex = (step: ResearchStep) => {
    switch(step) {
      case ResearchStep.DOCUMENTS: return 0;
      case ResearchStep.REPORT: return 1;
      case ResearchStep.MEMO: return 2;
      case ResearchStep.COMPLETED: return 3;
      default: return -1;
    }
  };

  const currentIndex = getStepIndex(currentStep);

  return (
    <div className="w-full max-w-2xl mx-auto mt-12 mb-8">
      <div className="relative">
        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-200 -translate-y-1/2"></div>
        <div 
          className="absolute top-1/2 left-0 h-0.5 bg-blue-600 -translate-y-1/2 transition-all duration-700"
          style={{ width: `${Math.max(0, (currentIndex / (steps.length - 1)) * 100)}%` }}
        ></div>
        
        <div className="relative flex justify-between">
          {steps.map((step, idx) => {
            const isActive = idx === currentIndex && isProcessing;
            const isCompleted = idx < currentIndex || (currentStep === ResearchStep.COMPLETED);
            
            return (
              <div key={step.id} className="flex flex-col items-center">
                <div 
                  className={`w-10 h-10 rounded-full flex items-center justify-center z-10 border-2 transition-all duration-300 ${
                    isCompleted 
                      ? 'bg-blue-600 border-blue-600 text-white' 
                      : isActive 
                        ? 'bg-white border-blue-600 text-blue-600 ring-4 ring-blue-50'
                        : 'bg-white border-slate-300 text-slate-400'
                  }`}
                >
                  {isCompleted ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : isActive ? (
                    <div className="w-3 h-3 bg-blue-600 rounded-full animate-pulse"></div>
                  ) : (
                    <span className="text-sm font-bold">{idx + 1}</span>
                  )}
                </div>
                <span className={`mt-3 text-xs font-semibold uppercase tracking-wider ${
                  isActive || isCompleted ? 'text-slate-900' : 'text-slate-400'
                }`}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      
      {isProcessing && (
        <div className="mt-8 text-center animate-pulse">
          <p className="text-slate-500 text-sm font-medium">
            Generating {steps[currentIndex]?.label}...
          </p>
        </div>
      )}
    </div>
  );
};
