import { GoogleGenAI, Type } from '@google/genai';
import { AIExtractionResult, TransactionType } from '../types';

const apiKey = process.env.GEMINI_API_KEY || '';
const isRealGemini = apiKey.length > 10 && !apiKey.includes('demo');

const aiClient = isRealGemini ? new GoogleGenAI({ apiKey }) : null;

// Heuristic Fallback Parser for immediate local/offline execution & fallback
function heuristicExtractTransaction(text: string): AIExtractionResult {
  const clean = text.trim();
  const lower = clean.toLowerCase();
  const todayStr = new Date().toISOString().split('T')[0];

  // Check Ambiguity Test Case 1: "Paid 500 to Rahul" or "Given 500 to Rahul" without clear category/type
  if (
    /^(paid|given|gave)\s+₹?\d+\s+(to|for)\s+[a-z\s]+$/i.test(clean) &&
    !lower.includes('bill') &&
    !lower.includes('salary') &&
    !lower.includes('rent') &&
    !lower.includes('supplier') &&
    !lower.includes('purchase')
  ) {
    const match = clean.match(/(?:paid|given|gave)\s+₹?(\d+)\s+(?:to|for)\s+([a-z\s]+)/i);
    const name = match ? match[2].trim() : 'the recipient';
    const amt = match ? match[1] : 'the amount';
    return {
      isAmbiguous: true,
      clarificationMessage: `Was ₹${amt} paid to ${name} as a supplier payment, employee wage, or another type of expense?`,
    };
  }

  // 1. Sales Pattern: "Aloo bhajiya sold for ₹50", "Sold 2 items for ₹500", "Sale of X for ₹100"
  const saleMatch = clean.match(/(.+?)\s+sold\s+for\s+[₹$]?(\d+(?:\.\d+)?)/i) ||
                    clean.match(/sold\s+(.+?)\s+for\s+[₹$]?(\d+(?:\.\d+)?)/i) ||
                    clean.match(/sale\s+of\s+(.+?)\s+for\s+[₹$]?(\d+(?:\.\d+)?)/i);
  if (saleMatch) {
    const item = saleMatch[1].replace(/^(a|an|the|bought|sold)\s+/i, '').trim();
    const amount = parseFloat(saleMatch[2]);
    return {
      isAmbiguous: false,
      transaction: {
        transaction_type: 'sale',
        amount,
        currency: 'INR',
        item: item || 'General Sale',
        quantity: 1,
        category: 'Food & Beverage',
        payment_status: 'paid',
        description: clean,
        transaction_date: todayStr,
      },
    };
  }

  // 2. Purchase Pattern: "Bought 10 kg potatoes for ₹400", "Purchased X for 500"
  const purchaseMatch = clean.match(/bought\s+(?:(\d+)\s*(?:kg|pcs|items)?\s+)?(.+?)\s+for\s+[₹$]?(\d+(?:\.\d+)?)/i) ||
                        clean.match(/purchased\s+(.+?)\s+for\s+[₹$]?(\d+(?:\.\d+)?)/i);
  if (purchaseMatch) {
    const qty = purchaseMatch[1] ? parseFloat(purchaseMatch[1]) : 1;
    const item = purchaseMatch[2].trim();
    const amount = parseFloat(purchaseMatch[3] || purchaseMatch[2]);
    return {
      isAmbiguous: false,
      transaction: {
        transaction_type: 'purchase',
        amount: isNaN(amount) ? 100 : amount,
        currency: 'INR',
        item,
        quantity: qty,
        category: 'Inventory & Supplies',
        supplier_name: 'Vendor',
        payment_status: 'paid',
        description: clean,
        transaction_date: todayStr,
      },
    };
  }

  // 3. Bill / Utility Expense Pattern: "Paid electricity bill ₹2300", "Paid rent ₹5000"
  const billMatch = clean.match(/paid\s+(.+?)\s+bill\s+[₹$]?(\d+(?:\.\d+)?)/i) ||
                    clean.match(/paid\s+(.+?)\s+[₹$]?(\d+(?:\.\d+)?)/i);
  if (billMatch) {
    const item = billMatch[1].trim();
    const amount = parseFloat(billMatch[2]);
    return {
      isAmbiguous: false,
      transaction: {
        transaction_type: 'expense',
        amount,
        currency: 'INR',
        item: item.includes('bill') ? item : `${item} Bill`,
        quantity: 1,
        category: 'Utilities & Overhead',
        payment_status: 'paid',
        description: clean,
        transaction_date: todayStr,
      },
    };
  }

  // 4. Money Received / Receivable: "Rahul paid me ₹1000", "Rahul owes me ₹1500"
  const recMatch = clean.match(/([a-z\s]+)\s+paid\s+me\s+[₹$]?(\d+(?:\.\d+)?)/i);
  if (recMatch) {
    return {
      isAmbiguous: false,
      transaction: {
        transaction_type: 'money_received',
        amount: parseFloat(recMatch[2]),
        currency: 'INR',
        item: `Payment from ${recMatch[1].trim()}`,
        quantity: 1,
        category: 'Debt Collection',
        customer_name: recMatch[1].trim(),
        payment_status: 'paid',
        description: clean,
        transaction_date: todayStr,
      },
    };
  }

  const owesMatch = clean.match(/([a-z\s]+)\s+owes\s+me\s+[₹$]?(\d+(?:\.\d+)?)/i);
  if (owesMatch) {
    return {
      isAmbiguous: false,
      transaction: {
        transaction_type: 'receivable',
        amount: parseFloat(owesMatch[2]),
        currency: 'INR',
        item: `Credit Sale to ${owesMatch[1].trim()}`,
        quantity: 1,
        category: 'Accounts Receivable',
        customer_name: owesMatch[1].trim(),
        payment_status: 'pending',
        description: clean,
        transaction_date: todayStr,
      },
    };
  }

  // 5. Money Paid / Payable: "I paid Sharma ₹3000"
  const paidNameMatch = clean.match(/i\s+paid\s+([a-z\s]+)\s+[₹$]?(\d+(?:\.\d+)?)/i);
  if (paidNameMatch) {
    return {
      isAmbiguous: false,
      transaction: {
        transaction_type: 'money_paid',
        amount: parseFloat(paidNameMatch[2]),
        currency: 'INR',
        item: `Payment to ${paidNameMatch[1].trim()}`,
        quantity: 1,
        category: 'Supplier Settlement',
        supplier_name: paidNameMatch[1].trim(),
        payment_status: 'paid',
        description: clean,
        transaction_date: todayStr,
      },
    };
  }

  // General Amount Fallback if numeric value present
  const generalAmtMatch = clean.match(/[₹$]?(\d+(?:\.\d+)?)/);
  if (generalAmtMatch) {
    const amount = parseFloat(generalAmtMatch[1]);
    const isSale = lower.includes('sold') || lower.includes('receive') || lower.includes('got');
    return {
      isAmbiguous: false,
      transaction: {
        transaction_type: isSale ? 'sale' : 'expense',
        amount,
        currency: 'INR',
        item: clean.replace(/[₹$]?\d+(?:\.\d+)?/g, '').trim() || 'General Transaction',
        quantity: 1,
        category: isSale ? 'Sales' : 'General Expense',
        payment_status: 'paid',
        description: clean,
        transaction_date: todayStr,
      },
    };
  }

  return {
    isAmbiguous: true,
    clarificationMessage: 'Could not detect the transaction amount or item details. Please specify like: "Aloo bhajiya sold for ₹50" or "Paid electricity bill ₹2300".',
  };
}

// Full AI Pipeline function using Gemini API with Schema Validation
export async function extractTransactionFromNaturalLanguage(
  text: string,
  businessCurrency: string = 'INR'
): Promise<AIExtractionResult> {
  if (!text || text.trim().length === 0) {
    return {
      isAmbiguous: true,
      clarificationMessage: 'Please provide a valid transaction message.',
    };
  }

  if (!aiClient) {
    return heuristicExtractTransaction(text);
  }

  try {
    const prompt = `You are an expert financial bookkeeping AI assistant. Extract structured financial transaction data from the following natural language text.
Input Text: "${text}"
Default Currency: "${businessCurrency}"

Rules:
1. Determine transaction_type: one of ["sale", "expense", "purchase", "money_received", "money_paid", "receivable", "payable"].
2. Extract numeric amount and quantity (default quantity to 1).
3. Determine category (e.g. "Food", "Supplies", "Utilities", "Accounts Receivable", "General").
4. If the message is missing an amount or is ambiguous (e.g. "Paid 500 to Rahul" where it is unclear if Rahul is a supplier, employee, or customer), set isAmbiguous = true and write a polite, concise clarificationMessage.
5. If clear, set isAmbiguous = false and fill the transaction object.`;

    const response = await aiClient.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isAmbiguous: { type: Type.BOOLEAN },
            clarificationMessage: { type: Type.STRING },
            transaction: {
              type: Type.OBJECT,
              properties: {
                transaction_type: { type: Type.STRING },
                amount: { type: Type.NUMBER },
                currency: { type: Type.STRING },
                item: { type: Type.STRING },
                quantity: { type: Type.NUMBER },
                category: { type: Type.STRING },
                customer_name: { type: Type.STRING },
                supplier_name: { type: Type.STRING },
                payment_status: { type: Type.STRING },
                description: { type: Type.STRING },
                transaction_date: { type: Type.STRING },
              },
            },
          },
          required: ['isAmbiguous'],
        },
      },
    });

    const outputText = response.text;
    if (outputText) {
      const parsed = JSON.parse(outputText) as AIExtractionResult;
      if (parsed.transaction) {
        parsed.transaction.currency = parsed.transaction.currency || businessCurrency;
        parsed.transaction.payment_status = (parsed.transaction.payment_status as any) || 'paid';
        parsed.transaction.transaction_date =
          parsed.transaction.transaction_date || new Date().toISOString().split('T')[0];
      }
      return parsed;
    }
  } catch (err: any) {
    console.warn('Gemini AI call failed, falling back to heuristic extractor:', err.message);
  }

  return heuristicExtractTransaction(text);
}
