
import { GoogleGenAI } from "@google/genai";

const THINKING_CONFIG = {
  thinkingConfig: { thinkingBudget: 16384 }
};

export const getDocumentSources = async (companyName: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `You are a research assistant specialized in retrieving and verifying official company filings and investor relations documents for ${companyName}.
  
Your task is to identify the most critical official PDF links from the last 5 years:
1. Annual Reports / 10-K Filings (2020-2024).
2. Most recent Investor Day or Capital Markets Day presentation.
3. Most recent Quarterly Earnings result presentation.

CRITICAL: Every link MUST be a direct link to a PDF.
Format your output as a clean Markdown report with a table of sources and a brief summary of what each document contains.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      ...THINKING_CONFIG
    },
  });

  return response.text || "No documents found.";
};

export const getEquityReport = async (companyName: string, docContext: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `You are a Senior Equity Research Analyst. Based on the following document context for ${companyName}:

${docContext}

Draft a comprehensive 1,500-word Equity Research Report.
Include:
1. Investment Thesis
2. Business Model Analysis
3. Competitive Positioning (Moat Analysis)
4. Financial Performance Review
5. Risks & Sensitivities

Use professional, institutional-grade language. Focus on the 'economic quality' of the business.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: prompt,
    config: {
      ...THINKING_CONFIG
    }
  });

  return response.text || "Failed to generate report.";
};

export const getInvestmentMemo = async (companyName: string, reportContext: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `You are a Portfolio Manager at a top-tier hedge fund. Based on the Analyst Report provided below for ${companyName}:

${reportContext}

Create a high-conviction 5-page Investment Memo for the Investment Committee.
The memo should be punchy, data-driven, and focus on:
- The "Variant Perception": Why is the market wrong?
- Asymmetric Risk/Reward: Quantify the upside vs the downside.
- Key Performance Indicators (KPIs) to track over the next 12 months.
- Final Recommendation (Buy/Hold/Sell) with a target price justification.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: prompt,
    config: {
      ...THINKING_CONFIG
    }
  });

  return response.text || "Failed to generate memo.";
};
