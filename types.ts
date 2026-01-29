
export enum ResearchStep {
  IDLE = 'IDLE',
  DOCUMENTS = 'DOCUMENTS',
  REPORT = 'REPORT',
  MEMO = 'MEMO',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}

export interface Artifact {
  id: string;
  filename: string;
  content: string;
  title: string;
}

export interface ResearchHistoryItem {
  companyName: string;
  timestamp: number;
  artifacts: Artifact[];
}

export interface ResearchState {
  companyName: string;
  currentStep: ResearchStep;
  artifacts: Artifact[];
  history: ResearchHistoryItem[];
  error?: string;
  isProcessing: boolean;
}
