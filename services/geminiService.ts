
import { GoogleGenAI } from "@google/genai";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

const THINKING_CONFIG = {
  thinkingConfig: { thinkingBudget: 32768 }
};

/**
 * Utility to fetch with a timeout to prevent hanging on slow IR servers.
 */
async function fetchWithTimeout(url: string, timeout = 5000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { 
      method: 'HEAD', 
      mode: 'cors',
      signal: controller.signal 
    });
    clearTimeout(id);
    return response;
  } catch (e) {
    clearTimeout(id);
    throw e;
  }
}

/**
 * Best-effort verification of PDF links.
 * Performs HEAD requests to check for 200 OK and PDF content-type.
 * Note: Many investor relations sites block CORS (Cross-Origin Resource Sharing), 
 * which will cause the verification to return 'unverifiable' despite the link being valid.
 */
async function verifyPdfLinks(markdown: string): Promise<string> {
  // Regex to find potential PDF URLs in the markdown text
  const urlRegex = /https?:\/\/[^\s|)]+?\.pdf/gi;
  const urls = Array.from(new Set(markdown.match(urlRegex) || []));

  if (urls.length === 0) return markdown;

  const results = await Promise.all(
    urls.map(async (url) => {
      try {
        const response = await fetchWithTimeout(url);
        if (response.ok) {
          const contentType = response.headers.get('content-type');
          const isPdf = contentType?.toLowerCase().includes('pdf');
          return { url, status: isPdf ? 'verified' : 'invalid' };
        }
        return { url, status: 'dead' };
      } catch (e) {
        // If we hit a CORS error or timeout, we cannot definitively say the link is bad.
        // We mark it as unverifiable rather than dead.
        return { url, status: 'unverifiable' };
      }
    })
  );

  let enrichedMarkdown = markdown;
  let summary = "\n\n---\n### 🔍 Link Verification Report\n";
  let hasIssues = false;
  let unverifiableCount = 0;

  results.forEach(({ url, status }) => {
    if (status === 'verified') {
      enrichedMarkdown = enrichedMarkdown.replace(new RegExp(url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), `${url} ✅`);
    } else if (status === 'invalid') {
      enrichedMarkdown = enrichedMarkdown.replace(new RegExp(url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), `${url} ⚠️ (Verified as Non-PDF)`);
      hasIssues = true;
    } else if (status === 'dead') {
      enrichedMarkdown = enrichedMarkdown.replace(new RegExp(url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), `${url} ❌ (Dead Link)`);
      hasIssues = true;
    } else if (status === 'unverifiable') {
      unverifiableCount++;
    }
  });

  if (hasIssues) {
    summary += "- **Alert**: One or more links returned an error or incorrect content type. Please verify manually.\n";
  }
  
  if (unverifiableCount > 0) {
    summary += `- **Note**: ${unverifiableCount} link(s) could not be automatically verified due to domain-level security (CORS) or connection timeouts. These are likely official documents that require manual opening.\n`;
  } else if (!hasIssues) {
    summary += "- **Success**: All reachable links were successfully verified as valid PDF documents.\n";
  }

  return enrichedMarkdown + summary;
}

export const getDocumentSources = async (companyName: string) => {
  const ai = getAI();
  const prompt = `You are a professional financial research analyst. Your absolute priority is to find OFFICIAL PDF documents for ${companyName}.
  
CRITICAL RULE: Every single link provided MUST end with '.pdf'. If a link ends in .html, .aspx, or is a generic IR page, it is REJECTED.

TASK A: Annual Reports (2019-2024)
- Find exactly one official PDF per year: 2019, 2020, 2021, 2022, 2023, 2024.
- Acceptable titles: "Annual Report", "Form 10-K", "Universal Registration Document", "Integrated Report".
- Sources: SEC.gov, company's own /investor-relations/ domain, or national regulators.
- Output a markdown table: | Year | Document Title | Direct PDF URL (.pdf only) | Source |

TASK B: Capital Markets Day / Investor Day (2019-2024)
- Find PDFs of presentations or transcripts for Investor Days.
- Output a markdown table: | Event Year | Event Name | Direct PDF URL (.pdf only) | Source |

Format: Section A followed by Section B. Do not include introductory or concluding text. Only the tables. If a PDF is not found for a specific year, leave that year out of the table entirely.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      ...THINKING_CONFIG
    },
  });

  const rawMarkdown = response.text || '';
  const verifiedMarkdown = await verifyPdfLinks(rawMarkdown);
  return verifiedMarkdown;
};

export const getEquityReport = async (companyName: string, context: string) => {
  const ai = getAI();
  const prompt = `Based exclusively on the official PDF documents retrieved for ${companyName}, draft a professional Equity Analyst Report.

Context of identified documents:
${context}

Structure:
1. Executive Summary (150-200 words): Describe the business model, economic quality, and core advantage. End with a one-sentence summary.
2. What They Sell and Who Buys: Summarize products/services and target customers.
3. How They Make Money: Revenue model, recurring vs one-time, key segments.
4. Revenue Quality: Diversification, predictability, and concentration risks.
5. Cost Structure: Key COGS, margins, and scalability.
6. Capital Intensity: Capex needs and cash conversion.
7. Growth Drivers: Levers for expansion (price, volume, M&A).
8. Moat Analysis: Durable competitive advantages (brand, network, cost).

Tone: institutional, factual, objective. Do not use fluff. Provide a high-density, analytical overview.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: prompt,
    config: {
      ...THINKING_CONFIG
    }
  });

  return response.text;
};

export const getInvestmentMemo = async (companyName: string, context: string) => {
  const ai = getAI();
  const prompt = `Produce a high-conviction 5-page Investment Memo for ${companyName}.
  
Context and previous report:
${context}

Sections to include:
- Executive Summary: Clear investment thesis (1 paragraph).
- Business Model & Unit Economics: How $1 of revenue turns into profit.
- Competitive Position: Moat depth and durability.
- Growth & Sensitivities: Top 3 drivers and what could break them.
- Risk Framework: Detailed failure modes (Macro, Execution, Regulatory).
- 12-Month KPI Watch List: Specific metrics for investors to track.

Format as a formal document for an Investment Committee.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: prompt,
    config: {
      ...THINKING_CONFIG
    }
  });

  return response.text;
};
