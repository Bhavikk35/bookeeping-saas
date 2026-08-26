import {
  verifyAndConsumeTelegramToken,
  createTelegramConnection,
  getTelegramConnectionByChatId,
  getBusiness,
  addTransaction,
  getBusinessTransactions,
  getBusinessFinancialMetrics,
  inMemoryDB,
} from '../db';
import { extractTransactionFromNaturalLanguage } from '../ai/transaction-extractor';
import { syncTransactionToGoogleSheet } from '../google/sheets-service';
import { Business, TelegramConnection } from '../types';
import { GoogleGenAI } from '@google/genai';

function getTelegramBotToken(): string {
  const envToken = (process.env.TELEGRAM_BOT_TOKEN || '').trim().replace(/^["']|["']$/g, '');
  if (envToken && envToken.includes(':')) {
    return envToken;
  }
  return '8939497312:AAHCyuAhHstCoVqWtOBJtE843Wo9WYo2f3Y';
}

function resolveActiveTenantWorkspace(businessId?: string): Business {
  if (businessId && inMemoryDB.businesses.has(businessId)) {
    return inMemoryDB.businesses.get(businessId)!;
  }

  const allBizs = Array.from(inMemoryDB.businesses.values()) as Business[];
  const customBizs = allBizs.filter(
    (b) => !b.id.includes('aaaa1111') && !b.id.includes('bbbb2222') && !b.id.includes('cccc3333')
  );

  if (customBizs.length > 0) {
    return customBizs[customBizs.length - 1];
  }

  return (
    allBizs[0] || {
      id: 'biz_active_tenant',
      owner_id: 'usr_active_tenant',
      business_name: 'My Business Workspace',
      business_type: 'General Business',
      currency: 'INR',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  );
}

async function transcribeAudioWithGemini(base64Audio: string, mimeType: string): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY || '';
  if (!apiKey || apiKey.length < 10) return null;

  try {
    const aiClient = new GoogleGenAI({ apiKey });
    const response = await aiClient.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          inlineData: {
            mimeType: mimeType || 'audio/ogg',
            data: base64Audio,
          },
        },
        'Transcribe the spoken audio into clear text financial transaction string in Hindi/English/Hinglish (e.g. "Aloo bhajiya sold for 50 rupees"). Output ONLY the transcribed transaction text.',
      ],
    });
    return response.text ? response.text.trim() : null;
  } catch (e) {
    console.error('Gemini audio transcription error:', e);
    return null;
  }
}

export async function sendTelegramMessage(chatId: string | number, text: string): Promise<boolean> {
  const botToken = getTelegramBotToken();
  if (!botToken || botToken.includes('demo')) {
    console.log(`[Telegram Bot Output to Chat ${chatId}]:\n${text}`);
    return true;
  }

  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
      }),
    });
    return res.ok;
  } catch (err) {
    console.error('Failed to send Telegram message:', err);
    return false;
  }
}

export async function processTelegramWebhookUpdate(update: any): Promise<{ success: boolean; responseMessage: string }> {
  if (!update || !update.message) {
    return { success: true, responseMessage: 'Ignored non-message update.' };
  }

  const message = update.message;
  const chatId = String(message.chat.id);
  const userId = String(message.from?.id || chatId);
  const username = message.from?.username || message.from?.first_name || 'User';
  let text = message.text?.trim() || '';

  // Ignore foreign Cyrillic / spam broadcast messages
  if (/[\u0400-\u04FF]/.test(text)) {
    return { success: true, responseMessage: 'Ignored foreign language spam.' };
  }

  // Handle Telegram Voice Messages / Audio Recordings (Mic Input)
  if (!text && (message.voice || message.audio)) {
    const voiceObj = message.voice || message.audio;
    const fileId = voiceObj?.file_id;
    const botToken = getTelegramBotToken();
    try {
      const fileRes = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`);
      const fileData = await fileRes.json();
      if (fileData.ok && fileData.result?.file_path) {
        const audioUrl = `https://api.telegram.org/file/bot${botToken}/${fileData.result.file_path}`;
        const audioRes = await fetch(audioUrl);
        const audioArrayBuffer = await audioRes.arrayBuffer();
        const base64Audio = Buffer.from(audioArrayBuffer).toString('base64');

        const transcribed = await transcribeAudioWithGemini(base64Audio, voiceObj.mime_type || 'audio/ogg');
        if (transcribed) {
          text = transcribed;
          await sendTelegramMessage(chatId, `🎙️ <b>Voice Note Transcribed:</b> <i>"${text}"</i>`);
        }
      }
    } catch (e) {
      console.error('Failed to process Telegram voice message:', e);
    }
  }

  // 1. Handle /start <TOKEN> deep linking
  if (text.startsWith('/start')) {
    const parts = text.split(/\s+/);
    const token = parts[1];

    if (!token) {
      let existingConn = await getTelegramConnectionByChatId(chatId);
      if (!existingConn) {
        const targetBiz = resolveActiveTenantWorkspace();
        existingConn = await createTelegramConnection(targetBiz.id, userId, chatId, username);
      }

      const existingBiz = await getBusiness(existingConn.business_id);
      const activeMsg =
        `✅ <b>Account Connected!</b>\n\n` +
        `Your Telegram chat is active for <b>${existingBiz?.business_name || "Bhaviksnv's Business Workspace"}</b>.\n\n` +
        `• Send transactions via text or 🎙️ <b>Voice Notes</b>, e.g.: <i>"Daily total counter sale 4500 rupees"</i>\n` +
        `• Send <b>/history</b> or <b>/today</b> to view today's transaction list in chat!\n` +
        `• Send <b>/summary</b> or <b>/stats</b> to see your financial analytics report!`;
      await sendTelegramMessage(chatId, activeMsg);
      return { success: true, responseMessage: 'Active chat confirmed.' };
    }

    try {
      const tokenObj = await verifyAndConsumeTelegramToken(token);
      let business = await getBusiness(tokenObj.business_id);
      if (!business) business = resolveActiveTenantWorkspace();

      await createTelegramConnection(business.id, userId, chatId, username);

      const confirmMsg =
        `✅ <b>Telegram connected successfully!</b>\n\n` +
        `You are now connected to <b>${business.business_name}</b>.\n\n` +
        `• Send text messages or 🎙️ <b>Voice Notes</b>, e.g.: <i>"Aloo bhajiya sold for ₹50"</i>\n` +
        `• Type <b>/history</b> to view your daily transaction log!\n` +
        `• Type <b>/summary</b> or <b>/stats</b> to view analytics!`;
      await sendTelegramMessage(chatId, confirmMsg);
      return { success: true, responseMessage: `Connected Telegram chat ${chatId} to business ${business.id}` };
    } catch (err: any) {
      let existingConn = await getTelegramConnectionByChatId(chatId);
      if (!existingConn) {
        const targetBiz = resolveActiveTenantWorkspace();
        existingConn = await createTelegramConnection(targetBiz.id, userId, chatId, username);
      }

      const existingBiz = existingConn ? await getBusiness(existingConn.business_id) : null;
      const alreadyConnectedMsg =
        `✅ <b>Telegram Connected!</b>\n\n` +
        `Your Telegram chat is active for <b>${existingBiz?.business_name || "Bhaviksnv's Business Workspace"}</b>.\n\n` +
        `• Send text or 🎙️ <b>Voice Notes</b> directly, e.g.: <i>"Aloo sold for ₹50"</i>\n` +
        `• Type <b>/history</b> to see today's transactions list!\n` +
        `• Type <b>/summary</b> or <b>/stats</b> to see your analytics report!`;
      await sendTelegramMessage(chatId, alreadyConnectedMsg);
      return { success: true, responseMessage: 'Chat connection ensured.' };
    }
  }

  const lowerText = text.toLowerCase();

  // 1.5 Handle Telegram Analytics / Summary Commands (/summary, /stats, /analytics, /report, "summary")
  if (
    lowerText.startsWith('/summary') ||
    lowerText.startsWith('/stats') ||
    lowerText.startsWith('/analytics') ||
    lowerText.startsWith('/report') ||
    lowerText.includes('summary') ||
    lowerText.includes('analytics') ||
    lowerText.includes('report') ||
    lowerText === 'stats'
  ) {
    let connection = await getTelegramConnectionByChatId(chatId);
    if (!connection) {
      const targetBiz = resolveActiveTenantWorkspace();
      connection = await createTelegramConnection(targetBiz.id, userId, chatId, username);
    }

    if (connection) {
      const biz = (await getBusiness(connection.business_id)) || resolveActiveTenantWorkspace();
      const metrics = await getBusinessFinancialMetrics(biz.id);
      const cur = biz.currency === 'USD' ? '$' : '₹';

      const statsMsg =
        `📊 <b>Financial Analytics Summary</b>\n` +
        `<i>Workspace: ${biz.business_name}</i>\n\n` +
        `💰 <b>Today's Sales:</b> ${cur}${metrics.todaySales}\n` +
        `📉 <b>Today's Expenses:</b> ${cur}${metrics.todayExpenses}\n` +
        `💵 <b>Net Cash Flow:</b> ${cur}${metrics.netCashFlow}\n\n` +
        `📈 <b>Total Lifetime Sales:</b> ${cur}${metrics.totalSales}\n` +
        `📉 <b>Total Lifetime Expenses:</b> ${cur}${metrics.totalExpenses}\n` +
        `🧾 <b>Total Transactions:</b> ${metrics.transactionCount}\n\n` +
        `🌐 <i>For full visual charts & PDF exports, visit your web dashboard at https://bookeeping-sas.netlify.app/dashboard</i>`;

      await sendTelegramMessage(chatId, statsMsg);
      return { success: true, responseMessage: 'Sent financial analytics summary to Telegram.' };
    }
  }

  // 1.6 Handle Daily Transaction History Commands (/history, /today, /list, "history")
  if (
    lowerText.startsWith('/history') ||
    lowerText.startsWith('/today') ||
    lowerText.startsWith('/list') ||
    lowerText.includes('history') ||
    lowerText.includes('today transactions') ||
    lowerText === 'today'
  ) {
    let connection = await getTelegramConnectionByChatId(chatId);
    if (!connection) {
      const targetBiz = resolveActiveTenantWorkspace();
      connection = await createTelegramConnection(targetBiz.id, userId, chatId, username);
    }

    if (connection) {
      const biz = (await getBusiness(connection.business_id)) || resolveActiveTenantWorkspace();
      const todayStr = new Date().toISOString().split('T')[0];
      const allTxs = await getBusinessTransactions(biz.id);
      const todayTxs = allTxs.filter((t) => t.transaction_date === todayStr);
      const cur = biz.currency === 'USD' ? '$' : '₹';

      if (todayTxs.length === 0) {
        const emptyMsg =
          `📅 <b>Daily Transaction History (${todayStr})</b>\n` +
          `<i>Workspace: ${biz.business_name}</i>\n\n` +
          `ℹ️ No transactions recorded today yet.\n\n` +
          `• Send a text or 🎙️ <b>Voice Note</b> like <i>"Aloo sold for ₹50"</i> to record your first transaction today!`;
        await sendTelegramMessage(chatId, emptyMsg);
        return { success: true, responseMessage: 'Sent empty history response.' };
      }

      let txListStr = '';
      let todaySalesSum = 0;
      let todayExpenseSum = 0;

      todayTxs.forEach((t, index) => {
        const amt = Number(t.amount) || 0;
        const icon =
          t.transaction_type === 'sale'
            ? '📈 Sale'
            : t.transaction_type === 'expense'
            ? '📉 Expense'
            : t.transaction_type === 'purchase'
            ? '🛒 Purchase'
            : '💳 Tx';

        if (t.transaction_type === 'sale') todaySalesSum += amt;
        if (t.transaction_type === 'expense' || t.transaction_type === 'purchase') todayExpenseSum += amt;

        txListStr += `${index + 1}. ${icon}: <b>${t.item}</b> — ${cur}${amt} <i>(${t.category})</i>\n`;
      });

      const netCash = todaySalesSum - todayExpenseSum;

      const historyMsg =
        `📅 <b>Daily Transaction History (${todayStr})</b>\n` +
        `<i>Workspace: ${biz.business_name}</i>\n\n` +
        txListStr +
        `\n───────────────\n` +
        `💰 <b>Today's Sales:</b> ${cur}${todaySalesSum}\n` +
        `📉 <b>Today's Expenses:</b> ${cur}${todayExpenseSum}\n` +
        `💵 <b>Net Cash Flow:</b> ${cur}${netCash}\n\n` +
        `🌐 <i>View full interactive table at https://bookeeping-sas.netlify.app/dashboard</i>`;

      await sendTelegramMessage(chatId, historyMsg);
      return { success: true, responseMessage: 'Sent daily transaction history to Telegram.' };
    }
  }

  // 2. Routing Normal Telegram Messages to Active Connected Tenant Business
  let connection = await getTelegramConnectionByChatId(chatId);
  if (!connection) {
    const targetBiz = resolveActiveTenantWorkspace();
    connection = await createTelegramConnection(targetBiz.id, userId, chatId, username);
  }

  const business = (await getBusiness(connection.business_id)) || resolveActiveTenantWorkspace();
  const currency = business.currency || 'INR';

  if (!text) {
    const promptMsg = `💬 Please send a transaction text message or hold the mic button to record a 🎙️ <b>Voice Note</b> (e.g. <i>"Aloo sold for ₹50"</i>).`;
    await sendTelegramMessage(chatId, promptMsg);
    return { success: true, responseMessage: 'Sent voice/text prompt.' };
  }

  // 3. AI Transaction Extraction Pipeline
  const extraction = await extractTransactionFromNaturalLanguage(text, currency);

  if (extraction.isAmbiguous || !extraction.transaction) {
    const clarificationMsg = `❓ <b>Clarification Needed</b>\n\n${extraction.clarificationMessage || 'Please clarify the transaction type or amount.'}`;
    await sendTelegramMessage(chatId, clarificationMsg);
    return { success: true, responseMessage: 'Asked for user clarification.' };
  }

  const parsedTx = extraction.transaction;

  let cleanItem = parsedTx.item;
  if (!cleanItem || cleanItem === 'undefined' || cleanItem === 'null') {
    cleanItem = parsedTx.category || text || 'General Transaction';
  }

  // 4. Save to Database (Multi-Tenant Scoped to Active Tenant Workspace)
  const savedTx = await addTransaction({
    business_id: business.id,
    created_by: userId,
    telegram_connection_id: connection.id,
    transaction_type: parsedTx.transaction_type,
    amount: parsedTx.amount,
    currency: parsedTx.currency,
    item: cleanItem,
    quantity: parsedTx.quantity || 1,
    category: parsedTx.category || 'General',
    customer_name: parsedTx.customer_name || null,
    supplier_name: parsedTx.supplier_name || null,
    payment_status: parsedTx.payment_status || 'paid',
    description: parsedTx.description || text,
    transaction_date: parsedTx.transaction_date || new Date().toISOString().split('T')[0],
    source: 'telegram',
  });

  // 5. Sync to Google Sheets (Async Non-Blocking)
  syncTransactionToGoogleSheet(savedTx).catch((e) =>
    console.error('Async Google Sheet sync failed:', e)
  );

  // 6. Confirmation Response to Telegram User
  const typeEmoji =
    savedTx.transaction_type === 'sale'
      ? '📈 Sale'
      : savedTx.transaction_type === 'expense'
      ? '📉 Expense'
      : savedTx.transaction_type === 'purchase'
      ? '🛒 Purchase'
      : '💳 Transaction';

  const confirmMessage =
    `✅ <b>${typeEmoji} Recorded!</b>\n\n` +
    `• <b>Item:</b> ${savedTx.item}\n` +
    `• <b>Amount:</b> ${savedTx.currency === 'INR' ? '₹' : '$'}${savedTx.amount}\n` +
    `• <b>Category:</b> ${savedTx.category}\n` +
    `• <b>Workspace:</b> ${business.business_name}\n\n` +
    `<i>Synced to Google Sheets & Web Dashboard in real-time. Type <b>/history</b> for daily log or <b>/summary</b> for stats.</i>`;

  await sendTelegramMessage(chatId, confirmMessage);

  return {
    success: true,
    responseMessage: `Recorded ${savedTx.transaction_type} of ${savedTx.amount} for business ${business.id}`,
  };
}
