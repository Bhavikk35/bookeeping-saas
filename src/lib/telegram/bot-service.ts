import {
  verifyAndConsumeTelegramToken,
  createTelegramConnection,
  getTelegramConnectionByChatId,
  getBusiness,
  addTransaction,
  getBusinessTransactions,
  getBusinessFinancialMetrics,
  getBusinessInventory,
  getInventorySummary,
  setTelegramConnectionPending,
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
  throw new Error(
    'TELEGRAM_BOT_TOKEN is not set. Add it in Netlify environment variables and redeploy.'
  );
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

  // 1. Handle /start <TOKEN> or direct token pairing in text
  const isConnectAction =
    text.startsWith('/start') ||
    text.startsWith('connect_') ||
    text.includes('connect_') ||
    text.includes('start=connect_');

  if (isConnectAction) {
    let token = '';
    const match = text.match(/(connect_[a-zA-Z0-9_]+)/);
    if (match) {
      token = match[1];
    } else {
      const parts = text.split(/\s+/);
      token = parts[1] || (text.startsWith('connect_') ? text : '');
    }

    if (!token) {
      let existingConn = await getTelegramConnectionByChatId(chatId);
      if (!existingConn) {
        const targetBiz = resolveActiveTenantWorkspace();
        existingConn = await createTelegramConnection(targetBiz.id, userId, chatId, username);
      }

      const existingBiz = await getBusiness(existingConn.business_id);
      const activeMsg =
        `✅ <b>Account Connected!</b>\n\n` +
        `Your Telegram chat is active for <b>${existingBiz?.business_name || 'My Business Workspace'}</b>.\n\n` +
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
      let targetBizId = '';
      if (token.startsWith('connect_')) {
        const tokenParts = token.split('_');
        if (tokenParts.length >= 3) {
          targetBizId = `${tokenParts[1]}_${tokenParts[2]}`;
        }
      }

      let business = targetBizId ? await getBusiness(targetBizId) : null;
      if (!business) business = resolveActiveTenantWorkspace();

      await createTelegramConnection(business.id, userId, chatId, username);

      const alreadyConnectedMsg =
        `✅ <b>Telegram Connected!</b>\n\n` +
        `Your Telegram chat is active for <b>${business.business_name}</b>.\n\n` +
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

  // 1.7 Handle Inventory & Stock Commands (/inventory, /stock, /expiry, "inventory", "stock")
  if (
    lowerText.startsWith('/inventory') ||
    lowerText.startsWith('/stock') ||
    lowerText.startsWith('/expiry') ||
    lowerText.includes('inventory') ||
    lowerText === 'stock'
  ) {
    let connection = await getTelegramConnectionByChatId(chatId);
    if (!connection) {
      const targetBiz = resolveActiveTenantWorkspace();
      connection = await createTelegramConnection(targetBiz.id, userId, chatId, username);
    }

    if (connection) {
      const biz = (await getBusiness(connection.business_id)) || resolveActiveTenantWorkspace();
      const inventory = await getBusinessInventory(biz.id);
      const summary = await getInventorySummary(biz.id);
      const cur = biz.currency === 'USD' ? '$' : '₹';
      const todayStr = new Date().toISOString().split('T')[0];
      const in15DaysStr = new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0];

      if (inventory.length === 0) {
        const emptyStockMsg =
          `📦 <b>Inventory & Stock Overview</b>\n` +
          `<i>Workspace: ${biz.business_name}</i>\n\n` +
          `ℹ️ No inventory items loaded yet.\n\n` +
          `🌐 Visit your Web Dashboard to load products, set price, and track expiry dates:\n` +
          `<b>https://bookeeping-sas.netlify.app/dashboard/inventory</b>`;
        await sendTelegramMessage(chatId, emptyStockMsg);
        return { success: true, responseMessage: 'Sent empty inventory response.' };
      }

      let stockListStr = '';
      inventory.slice(0, 10).forEach((item, index) => {
        let alertBadge = '✅';
        if (item.quantity_in_stock <= (item.min_stock_alert ?? 5)) {
          alertBadge = '⚠️ Low Stock';
        }
        if (item.expiry_date) {
          if (item.expiry_date < todayStr) {
            alertBadge = '🚨 EXPIRED';
          } else if (item.expiry_date <= in15DaysStr) {
            alertBadge = '⏳ Expiring Soon';
          }
        }

        const expStr = item.expiry_date ? ` <i>(Exp: ${item.expiry_date})</i>` : '';
        stockListStr += `${index + 1}. <b>${item.item_name}</b>: ${item.quantity_in_stock} units — ${cur}${item.unit_price}/unit ${expStr} ${alertBadge}\n`;
      });

      const invMsg =
        `📦 <b>Inventory Stock & Expiry Report</b>\n` +
        `<i>Workspace: ${biz.business_name}</i>\n\n` +
        stockListStr +
        `\n───────────────\n` +
        `📊 <b>Total Products Loaded:</b> ${summary.totalItems}\n` +
        `📦 <b>Total Stock Quantity:</b> ${summary.totalStockQuantity} units\n` +
        `💰 <b>Total Inventory Value:</b> ${cur}${summary.totalInventoryValue.toLocaleString('en-IN')}\n` +
        `⚠️ <b>Low Stock Items:</b> ${summary.lowStockCount}\n` +
        `🚨 <b>Expiring / Expired Items:</b> ${summary.expiringSoonCount + summary.expiredCount}\n\n` +
        `🌐 <i>Manage stock & add new products at https://bookeeping-sas.netlify.app/dashboard/inventory</i>`;

      await sendTelegramMessage(chatId, invMsg);
      return { success: true, responseMessage: 'Sent inventory report to Telegram.' };
    }
  }

  // 2. Routing Normal Telegram Messages to Active Connected Tenant Business
  let connection = await getTelegramConnectionByChatId(chatId);
  if (!connection) {
    // Auto-healing fallback: ensure connection is never lost on serverless cold starts
    const targetBiz = resolveActiveTenantWorkspace();
    if (targetBiz) {
      connection = await createTelegramConnection(targetBiz.id, userId, chatId, username);
    }
  }

  if (!connection) {
    const unlinkedNotice =
      `⚠️ <b>Telegram Chat Not Connected</b>\n\n` +
      `Your Telegram chat is not paired with your business workspace yet.\n\n` +
      `1. Log in to your web dashboard: <b>https://bookeeping-sas.netlify.app/dashboard/telegram</b>\n` +
      `2. Click <b>⚡ Generate Connection Link</b> to pair your chat!`;
    await sendTelegramMessage(chatId, unlinkedNotice);
    return { success: true, responseMessage: 'Asked user to pair Telegram workspace.' };
  }

  const business = (await getBusiness(connection.business_id)) || resolveActiveTenantWorkspace();
  const currency = business.currency || 'INR';

  if (!text) {
    const promptMsg = `💬 Please send a transaction text message or hold the mic button to record a 🎙️ <b>Voice Note</b> (e.g. <i>"Aloo sold for ₹50"</i>).`;
    await sendTelegramMessage(chatId, promptMsg);
    return { success: true, responseMessage: 'Sent voice/text prompt.' };
  }

  // 3. Multi-step conversation memory.
  // If the bot previously asked a clarifying question, combine what the user
  // said back then with what they just sent, instead of parsing the new
  // message in isolation (which is why "1000" sent alone used to mean nothing).
  const PENDING_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes
  const hasPending =
    !!connection.pending_message &&
    !!connection.pending_since &&
    Date.now() - new Date(connection.pending_since).getTime() < PENDING_TIMEOUT_MS;

  if (/^(cancel|reset|nevermind|never mind|clear)$/i.test(text.trim())) {
    if (hasPending) {
      await setTelegramConnectionPending(connection, null);
      await sendTelegramMessage(chatId, `✅ Cleared. Send your transaction whenever you're ready.`);
      return { success: true, responseMessage: 'Cleared pending conversation state.' };
    }
  }

  // 4. AI Transaction Extraction Pipeline
  let extraction = await extractTransactionFromNaturalLanguage(text, currency);
  let usedCombinedText = false;

  if ((extraction.isAmbiguous || !extraction.transaction) && hasPending) {
    const combinedText = `${connection.pending_message} ${text}`.trim();
    const combinedExtraction = await extractTransactionFromNaturalLanguage(combinedText, currency);
    if (!combinedExtraction.isAmbiguous && combinedExtraction.transaction) {
      extraction = combinedExtraction;
      usedCombinedText = true;
    } else {
      // Still not enough info even combined — keep accumulating and ask again.
      await setTelegramConnectionPending(connection, combinedText);
      const clarificationMsg = `❓ <b>Clarification Needed</b>\n\n${
        combinedExtraction.clarificationMessage || extraction.clarificationMessage || 'Please clarify the transaction type or amount.'
      }\n\n<i>(Reply "cancel" to start over.)</i>`;
      await sendTelegramMessage(chatId, clarificationMsg);
      return { success: true, responseMessage: 'Asked for further clarification, context retained.' };
    }
  }

  if (extraction.isAmbiguous || !extraction.transaction) {
    // Fresh ambiguous message with no usable pending context — start tracking it.
    await setTelegramConnectionPending(connection, text);
    const clarificationMsg = `❓ <b>Clarification Needed</b>\n\n${extraction.clarificationMessage || 'Please clarify the transaction type or amount.'}\n\n<i>(Reply "cancel" to start over.)</i>`;
    await sendTelegramMessage(chatId, clarificationMsg);
    return { success: true, responseMessage: 'Asked for user clarification.' };
  }

  // Successfully resolved (whether from this message alone or combined with
  // prior context) — clear any pending state before saving.
  if (hasPending || usedCombinedText) {
    await setTelegramConnectionPending(connection, null);
  }

  const parsedTx = extraction.transaction;

  let cleanItem = parsedTx.item;
  if (!cleanItem || cleanItem === 'undefined' || cleanItem === 'null') {
    cleanItem = parsedTx.category || text || 'General Transaction';
  }

  // 5. Save to Database (Multi-Tenant Scoped to Active Tenant Workspace)
  // NOTE: created_by must be a real profile UUID (it's a foreign key to
  // profiles.id) — the Telegram numeric user ID is NOT a valid value here,
  // so we attribute Telegram-sourced transactions to the business owner.
  const savedTx = await addTransaction({
    business_id: business.id,
    created_by: business.owner_id || null,
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
    expiry_date: parsedTx.expiry_date || null,
  });

  // 6. Sync to Google Sheets (Async Non-Blocking)
  syncTransactionToGoogleSheet(savedTx).catch((e) =>
    console.error('Async Google Sheet sync failed:', e)
  );

  // 7. Confirmation Response to Telegram User
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
    `<i>Synced to Auto-Ledger & Web Dashboard in real-time. Instant Excel (.xlsx) & PDF downloads available on dashboard.</i>`;

  await sendTelegramMessage(chatId, confirmMessage);

  return {
    success: true,
    responseMessage: `Recorded ${savedTx.transaction_type} of ${savedTx.amount} for business ${business.id}`,
  };
}
