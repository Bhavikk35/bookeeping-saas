import { GoogleGenAI, Type } from '@google/genai';
import { AIExtractionResult, TransactionType } from '../types';

const apiKey = process.env.GEMINI_API_KEY || '';
const isRealGemini = apiKey.length > 10 && !apiKey.includes('demo');

const aiClient = isRealGemini ? new GoogleGenAI({ apiKey }) : null;

/**
 * Multilingual Heuristic Parser supporting English, Hindi (हिंदी / Hinglish),
 * Marathi (मराठी / Marathish/Romaji), and Indian Shopkeeper Slang ("maggie 20 la", "maggie 20", "chai 10").
 */
function heuristicExtractTransaction(text: string): AIExtractionResult {
  const clean = text.trim();
  const lower = clean.toLowerCase();
  const todayStr = new Date().toISOString().split('T')[0];

  // Helper to extract numbers (supports Devanagari numerals ०१२३४५६७८९ as well as standard digits 0-9)
  const devanagariMap: Record<string, string> = {
    '०': '0', '१': '1', '२': '2', '३': '3', '४': '4',
    '५': '5', '६': '6', '७': '7', '८': '8', '९': '9',
  };
  const normalizedText = clean.replace(/[०-९]/g, (m) => devanagariMap[m] || m);

  // 1. Ambiguity check: "Paid 500 to Rahul" / "Rahul la 500 dile" without context
  if (
    /^(paid|given|gave|dile|diye|दिले|दिये)\s+₹?\d+\s+(to|for|la|ko)\s+[a-z\u0900-\u097F\s]+$/i.test(normalizedText) &&
    !lower.includes('bill') &&
    !lower.includes('salary') &&
    !lower.includes('rent') &&
    !lower.includes('supplier') &&
    !lower.includes('khareedi') &&
    !lower.includes('purchase')
  ) {
    const match = normalizedText.match(/(?:paid|given|gave|dile|diye|दिले|दिये)\s+₹?(\d+)\s+(?:to|for|la|ko)\s+([a-z\u0900-\u097F\s]+)/i);
    const name = match ? match[2].trim() : 'the party';
    const amt = match ? match[1] : 'the amount';
    return {
      isAmbiguous: true,
      clarificationMessage: `Was ₹${amt} paid to ${name} as a supplier payment, employee wage, or another expense type?`,
    };
  }

  // 2. Short Indian Shopkeeper Slang Sales ("maggie 20 la", "maggie 20", "chai 10", "samosa 30 rs", "वडापाव २०")
  const shortSaleMatch = normalizedText.match(/^([a-z\u0900-\u097F\s]+?)\s+[₹$]?(\d+(?:\.\d+)?)\s*(?:la|me|mein|ko|rs|rupaye|rupee|रुपये|रु|ला|में)?$/i);
  if (
    shortSaleMatch &&
    !lower.includes('ghetla') &&
    !lower.includes('ghetle') &&
    !lower.includes('dile') &&
    !lower.includes('diye') &&
    !lower.includes('bill') &&
    !lower.includes('khareedi') &&
    !lower.includes('bought') &&
    !lower.includes('paid') &&
    !lower.includes('expense') &&
    !lower.includes('भरले') &&
    !lower.includes('खरेदी')
  ) {
    const rawItem = shortSaleMatch[1].trim();
    const amount = parseFloat(shortSaleMatch[2]);
    if (rawItem && !isNaN(amount) && amount > 0) {
      const cleanItem = rawItem.charAt(0).toUpperCase() + rawItem.slice(1);
      return {
        isAmbiguous: false,
        transaction: {
          transaction_type: 'sale',
          amount,
          currency: 'INR',
          item: cleanItem,
          quantity: 1,
          category: 'Food & Retail Sales',
          payment_status: 'paid',
          description: clean,
          transaction_date: todayStr,
        },
      };
    }
  }

  // 3. Explicit Sales Pattern (English, Hindi, Marathi):
  // "Aloo bhajiya sold for ₹50", "Vadapav 50 rupayala vikla", "50 rupaye ki chai bechi", "वडापाव ५० रुपयात विकला"
  const saleMatch =
    normalizedText.match(/(.+?)\s+(?:sold|vikla|vikli|vikle|becha|bechi|beche|विकला|विकले|विकली|बेचा|बेची|बेचे)\s+(?:for|la|mhadhe|mein|ko)?\s+[₹$]?(\d+(?:\.\d+)?)/i) ||
    normalizedText.match(/(?:sold|vikla|vikli|vikle|becha|bechi|beche|विकला|विकले|विकली|बेचा|बेची|बेचे)\s+(.+?)\s+(?:for|la|mein)?\s+[₹$]?(\d+(?:\.\d+)?)/i) ||
    normalizedText.match(/(?:sale|bikri|vikri|विक्री)\s+(?:of\s+)?(.+?)\s+[₹$]?(\d+(?:\.\d+)?)/i) ||
    normalizedText.match(/(.+?)\s+[₹$]?(\d+(?:\.\d+)?)\s+(?:rs|rupaye|rupee|रुपये|रु)?\s*(?:ki|che|cha|chaa)?\s*(?:sold|vikla|vikli|vikle|becha|bechi|beche|विकला|विकले|विकली|बेचा|बेची)/i);

  if (saleMatch) {
    let item = (saleMatch[1] || '').replace(/^(a|an|the|bought|sold|vikla|becha)\s+/i, '').trim();
    const amount = parseFloat(saleMatch[2] || saleMatch[1]);

    return {
      isAmbiguous: false,
      transaction: {
        transaction_type: 'sale',
        amount: isNaN(amount) ? 50 : amount,
        currency: 'INR',
        item: item.charAt(0).toUpperCase() + item.slice(1) || 'General Sale',
        quantity: 1,
        category: 'Food & Retail Sales',
        payment_status: 'paid',
        description: clean,
        transaction_date: todayStr,
      },
    };
  }

  // 4. Purchase Pattern (English, Hindi, Marathi):
  // "Bought 10 kg potatoes for ₹400", "Batate 400 rs la ghetle", "१० किलो बटाटे ४०० रुपयांना खरेदी केले"
  const purchaseMatch =
    normalizedText.match(/(?:bought|purchased|ghetla|ghetle|khareedi|khareedla|खरेदी|घेतले|घेतला)\s+(?:(\d+)\s*(?:kg|pcs|items)?\s+)?(.+?)\s+(?:for|la|mein)?\s+[₹$]?(\d+(?:\.\d+)?)/i) ||
    normalizedText.match(/(.+?)\s+[₹$]?(\d+(?:\.\d+)?)\s+(?:rs|rupaye|rupee|रुपये)?\s*(?:la|mein)?\s*(?:ghetla|ghetle|khareedi|खरेदी|घेतले)/i);

  if (purchaseMatch) {
    const qty = purchaseMatch[1] ? parseFloat(purchaseMatch[1]) : 1;
    const item = (purchaseMatch[2] || purchaseMatch[1] || 'Raw Materials').trim();
    const amount = parseFloat(purchaseMatch[3] || purchaseMatch[2] || '0');

    return {
      isAmbiguous: false,
      transaction: {
        transaction_type: 'purchase',
        amount: isNaN(amount) ? 100 : amount,
        currency: 'INR',
        item: item.charAt(0).toUpperCase() + item.slice(1),
        quantity: qty,
        category: 'Inventory & Supplies',
        supplier_name: 'Vendor',
        payment_status: 'paid',
        description: clean,
        transaction_date: todayStr,
      },
    };
  }

  // 5. Utility / Bill Expenses (English, Hindi, Marathi):
  // "Paid electricity bill ₹2300", "Bijli bill 500 rs dile", "लाइट बिल २४०० रुपये भरले"
  const billMatch =
    normalizedText.match(/(?:paid|bhara|bharle|dile|diye|भरले|दिले)\s+(.+?)\s+(?:bill)?\s+[₹$]?(\d+(?:\.\d+)?)/i) ||
    normalizedText.match(/(.+?)\s+(?:bill)?\s+[₹$]?(\d+(?:\.\d+)?)\s+(?:rs|rupaye|rupee|रुपये)?\s*(?:dile|diye|bharle|bhara|भरले|दिले)/i);

  if (billMatch) {
    const item = (billMatch[1] || 'Utility').trim();
    const amount = parseFloat(billMatch[2]);

    return {
      isAmbiguous: false,
      transaction: {
        transaction_type: 'expense',
        amount: isNaN(amount) ? 100 : amount,
        currency: 'INR',
        item: item.toLowerCase().includes('bill') ? item : `${item} Bill`,
        quantity: 1,
        category: 'Utilities & Operational Expense',
        payment_status: 'paid',
        description: clean,
        transaction_date: todayStr,
      },
    };
  }

  // 6. Money Received / Receivable (English, Hindi, Marathi):
  // "Rahul paid me ₹1000", "Rahul ne 1000 rs diye", "Rahul kadun 1000 rs aale", "राहुल कडून १००० रुपये आले"
  const recMatch =
    normalizedText.match(/([a-z\u0900-\u097F\s]+)\s+(?:ne|kadun|se)?\s+[₹$]?(\d+(?:\.\d+)?)\s+(?:rs|rupaye|rupee|रुपये)?\s*(?:diye|aale|aala|dile|paid me|आले|दिये)/i);

  if (recMatch) {
    const partyName = recMatch[1].replace(/(?:ne|kadun|se)$/i, '').trim();
    const amount = parseFloat(recMatch[2]);

    return {
      isAmbiguous: false,
      transaction: {
        transaction_type: 'money_received',
        amount: isNaN(amount) ? 100 : amount,
        currency: 'INR',
        item: `Payment received from ${partyName}`,
        quantity: 1,
        category: 'Customer Settlement',
        customer_name: partyName,
        payment_status: 'paid',
        description: clean,
        transaction_date: todayStr,
      },
    };
  }

  // 7. Money Paid / Payable (English, Hindi, Marathi):
  // "I paid Sharma ₹3000", "Sharma la 3000 dile", "शर्मा ला ३००० रुपये दिले"
  const paidPartyMatch =
    normalizedText.match(/([a-z\u0900-\u097F\s]+)\s+(?:la|ko)\s+[₹$]?(\d+(?:\.\d+)?)\s+(?:rs|rupaye|rupee|रुपये)?\s*(?:dile|diye|paid|दिले|दिये)/i) ||
    normalizedText.match(/(?:i paid|paid|dile|diye)\s+([a-z\u0900-\u097F\s]+)\s+[₹$]?(\d+(?:\.\d+)?)/i);

  if (paidPartyMatch) {
    const partyName = paidPartyMatch[1].trim();
    const amount = parseFloat(paidPartyMatch[2]);

    return {
      isAmbiguous: false,
      transaction: {
        transaction_type: 'money_paid',
        amount: isNaN(amount) ? 100 : amount,
        currency: 'INR',
        item: `Payment paid to ${partyName}`,
        quantity: 1,
        category: 'Supplier Settlement',
        supplier_name: partyName,
        payment_status: 'paid',
        description: clean,
        transaction_date: todayStr,
      },
    };
  }

  // 8. General Fallback for any natural text containing an item and digits -> Default to SALE unless expense keywords are present
  const generalAmtMatch = normalizedText.match(/[₹$]?(\d+(?:\.\d+)?)/);
  if (generalAmtMatch) {
    const amount = parseFloat(generalAmtMatch[1]);
    const isExpense =
      lower.includes('bill') ||
      lower.includes('ghetla') ||
      lower.includes('ghetle') ||
      lower.includes('dile') ||
      lower.includes('khareedi') ||
      lower.includes('bought') ||
      lower.includes('expense') ||
      lower.includes('paid');

    const cleanItem =
      normalizedText
        .replace(/[₹$]?\d+(?:\.\d+)?/g, '')
        .replace(/(rs|rupaye|rupee|रुपये|sold|vikla|becha|ghetla|dile|la|me|mein)/gi, '')
        .trim() || 'Counter Sale';

    return {
      isAmbiguous: false,
      transaction: {
        transaction_type: isExpense ? 'expense' : 'sale',
        amount: isNaN(amount) ? 100 : amount,
        currency: 'INR',
        item: cleanItem.charAt(0).toUpperCase() + cleanItem.slice(1),
        quantity: 1,
        category: isExpense ? 'General Expense' : 'Food & Retail Sales',
        payment_status: 'paid',
        description: clean,
        transaction_date: todayStr,
      },
    };
  }

  return {
    isAmbiguous: true,
    clarificationMessage:
      'Could not detect transaction details. Please send like: "maggie 20 la" / "chai 10" / "Vadapav 50 rs vikla" / "Batate 400 rs la ghetle".',
  };
}

/**
 * Extracts an expiry date mentioned anywhere in the message, independent of
 * which sale/purchase pattern matched. Supports "expiry date is 20-07-2026",
 * "expiry 20/07/2026", "exp: 2026-07-20", etc. Indian dates are DD-MM-YYYY.
 */
function extractExpiryDateFromText(text: string): string | null {
  const isoMatch = text.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;

  const dmyMatch = text.match(
    /(?:expiry|expires?|exp)\D{0,10}(\d{1,2})[-/](\d{1,2})[-/](\d{4})/i
  );
  if (dmyMatch) {
    const [, d, m, y] = dmyMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  return null;
}

/**
 * Full Multilingual AI Pipeline using Gemini 2.5 Flash with fallback to heuristic extractor.
 */
export async function extractTransactionFromNaturalLanguage(
  text: string,
  businessCurrency: string = 'INR'
): Promise<AIExtractionResult> {
  if (!text || text.trim().length === 0) {
    return {
      isAmbiguous: true,
      clarificationMessage: 'Please send a valid transaction text or voice note message.',
    };
  }

  if (!aiClient) {
    return heuristicExtractTransaction(text);
  }

  try {
    const prompt = `You are an expert multilingual financial bookkeeping AI assistant.
Your task is to extract structured financial transaction data from natural language text written in Marathi (मराठी), Hindi (हिंदी), Hinglish/Marathish (Romanized script e.g. "maggie 20 la", "Vadapav 50 rs vikla"), or English.

Input Text: "${text}"
Default Currency: "${businessCurrency}"

Rules:
1. Support short Indian shopkeeper slang & regional dialects:
   - "maggie 20 la" or "maggie 20" or "chai 10" -> item: "Maggie", amount: 20, transaction_type: "sale", category: "Food & Retail Sales"
   - Marathi examples: "वडापाव ५० रुपयात विकला", "Batate 400 rs la ghetle", "लाइट बिल २००० रु भरले", "Sharma la 3000 rs dile"
   - Hindi examples: "50 rupaye ki chai bechi", "चाय बेची ₹50", "Rahul ne 1000 rs diye", "Bijli bill 500 bhara"
   - English examples: "Aloo bhajiya sold for ₹50", "Bought 10 kg potatoes for ₹400", "Paid electricity bill ₹2300"
2. Determine transaction_type: one of ["sale", "expense", "purchase", "money_received", "money_paid", "receivable", "payable"].
   IMPORTANT: Any item + number phrase (e.g. "maggie 20 la", "maggie 20", "samosa 30") without explicit expense/purchase keywords MUST be classified as "sale"!
3. Extract exact numeric amount and item name (capitalize and translate item name cleanly).
4. Assign appropriate category (e.g., "Food & Retail Sales", "Inventory & Raw Materials", "Utilities & Overhead", "Customer Settlement", "Supplier Settlement").
5. If the message mentions a product expiry date (e.g. "expiry date is 20-07-2026", "exp 20/07/2026"), convert it to ISO format YYYY-MM-DD and set it as expiry_date. Indian-format dates are DD-MM-YYYY, not MM-DD-YYYY. If no expiry is mentioned, omit the field.
6. If clear, set isAmbiguous = false and populate the transaction object.`;

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
                expiry_date: { type: Type.STRING },
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
        let cleanItem = parsed.transaction.item;
        if (!cleanItem || cleanItem === 'undefined' || cleanItem === 'null') {
          cleanItem = parsed.transaction.category || text || 'General Transaction';
        }
        parsed.transaction.item = cleanItem;
        parsed.transaction.currency = parsed.transaction.currency || businessCurrency;
        parsed.transaction.payment_status = (parsed.transaction.payment_status as any) || 'paid';
        parsed.transaction.transaction_date =
          parsed.transaction.transaction_date || new Date().toISOString().split('T')[0];
        if (!parsed.transaction.expiry_date) {
          parsed.transaction.expiry_date = extractExpiryDateFromText(text);
        }
      }
      return parsed;
    }
  } catch (err: any) {
    console.warn('Gemini AI call failed, falling back to heuristic extractor:', err.message);
  }

  const heuristicResult = heuristicExtractTransaction(text);
  if (heuristicResult.transaction && !heuristicResult.transaction.expiry_date) {
    heuristicResult.transaction.expiry_date = extractExpiryDateFromText(text);
  }
  return heuristicResult;
}
