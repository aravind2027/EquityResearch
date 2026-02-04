
import { GoogleGenAI } from "@google/genai";

const THINKING_CONFIG = {
  thinkingConfig: { thinkingBudget: 16384 }
};

export const getDocumentSources = async (companyName: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `You are a world-class Equity Research Assistant specialized in sourcing and verifying primary regulatory filings and investor relations materials for ${companyName}.

Your mission is to perform a deep-dive search for the following official documents from the last 5 fiscal years:
1. **Official Annual Reports / 10-K Filings** (Focus on 2020-2024).
2. **Most Recent Capital Markets Day (CMD) or Investor Day Presentation**.
3. **Latest Quarterly Earnings (10-Q) and accompanying Slide Decks**.

CRITICAL REQUIREMENTS:
- You must provide direct, clickable links to official PDF files (SEC.gov, investor relations subdomains).
- Verify the relevance of each link to the specific entity "${companyName}".
- Format the output as a professional research briefing with a table of primary sources and a summary of the 'Alpha' or key narrative contained in each document.`;

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
  const prompt = `You are a Senior Equity Research Analyst at a major global investment bank. Based on the following source materials for ${companyName}:

${docContext}

Draft a comprehensive, institutional-grade Equity Research Report (approx. 1,500 words).
Structure:
1. **Executive Summary & Investment Thesis**: High-level conviction.
2. **Company Overview & Segment Analysis**: How do they actually make money?
3. **Moat Analysis**: Sustainable competitive advantages (Porter's Five Forces).
4. **Financial Health & KPI Deep-Dive**: Analysis of margins, ROIC, and leverage.
5. **Valuation Discussion**: Key drivers for multiple expansion/contraction.
6. **Key Investment Risks**: Regulatory, macroeconomic, and competitive threats.

Tone: Professional, objective, data-driven, and insightful. Avoid fluff. Focus on economic moats and capital allocation.`;

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
  const prompt = `You are the Chief Investment Officer (CIO) of a high-conviction hedge fund. You have just received the following Analyst Report for ${companyName}:

${reportContext}

Prepare a punchy, 5-page Investment Committee Memo. 
This memo must answer:
- **The "Variant Perception"**: What does the market currently misunderstand about this stock?
- **Asymmetric Risk/Reward**: What is the Bull/Base/Bear case skew?
- **Catalyst Path**: What specific events will unlock value in the next 12-18 months?
- **Operational Benchmarks**: Which KPIs should we track to know if our thesis is broken?
- **Final Verdict**: Buy/Sell/Hold with a clear target price and justification.

Style: Direct, action-oriented, and skeptical of consensus.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: prompt,
    config: {
      ...THINKING_CONFIG
    }
  });

  return response.text || "Failed to generate memo.";
};
