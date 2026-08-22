import {
  verifyAndConsumeTelegramToken,
  createTelegramConnection,
  getTelegramConnectionByChatId,
  getBusiness,
  addTransaction,
} from '../db';
import { extractTransactionFromNaturalLanguage } from '../ai/transaction-extractor';
import { syncTransactionToGoogleSheet } from '../google/sheets-service';

const botToken = process.env.TELEGRAM_BOT_TOKEN || '';

export async function sendTelegramMessage(chatId: string | number, text: string): Promise<boolean> {
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
  const text = message.text?.trim() || '';

  // 1. Handle /start <TOKEN> deep linking
  if (text.startsWith('/start')) {
    const parts = text.split(/\s+/);
    const token = parts[1];

    if (!token) {
      const welcomeMsg = `👋 <b>Welcome to Universal Bookkeeper Bot!</b>\n\nTo connect your business workspace, please log in to your dashboard and click <b>Connect Telegram</b> to generate your secure connection link.`;
      await sendTelegramMessage(chatId, welcomeMsg);
      return { success: true, responseMessage: 'Sent generic welcome message.' };
    }

    try {
      const tokenObj = await verifyAndConsumeTelegramToken(token);
      const business = await getBusiness(tokenObj.business_id);
      if (!business) throw new Error('Target business workspace not found.');

      await createTelegramConnection(tokenObj.business_id, userId, chatId, username);

      const confirmMsg = `✅ <b>Telegram connected successfully!</b>\n\nYou are now connected to <b>${business.business_name}</b>.\n\nYou can start recording transactions immediately by sending messages such as:\n\n• <i>"Aloo bhajiya sold for ₹50"</i>\n• <i>"Bought 10 kg potatoes for ₹400"</i>\n• <i>"Paid electricity bill ₹2300"</i>\n• <i>"Rahul paid me ₹1000"</i>`;
      await sendTelegramMessage(chatId, confirmMsg);
      return { success: true, responseMessage: `Connected Telegram chat ${chatId} to business ${business.business_name}` };
    } catch (err: any) {
      const errorMsg = `⚠️ <b>Connection Error</b>\n\n${err.message || 'Could not verify token.'}`;
      await sendTelegramMessage(chatId, errorMsg);
      return { success: false, responseMessage: err.message };
    }
  }

  const targetBusinessId = update.business_id || message.business_id;

  // 2. Routing Normal Telegram Messages to Connected Business
  let connection = await getTelegramConnectionByChatId(chatId);
  if (!connection && targetBusinessId) {
    connection = await createTelegramConnection(targetBusinessId, userId, chatId, username);
  }

  if (!connection) {
    const unauthMsg = `⚠️ <b>Account Not Connected</b>\n\nYour Telegram chat is not connected to any active business workspace.\n\nPlease visit your SaaS web dashboard and click <b>Connect Telegram</b> to generate your secure connection link.`;
    await sendTelegramMessage(chatId, unauthMsg);
    return { success: false, responseMessage: 'Chat not connected to any business.' };
  }

  const business = await getBusiness(connection.business_id);
  const currency = business?.currency || 'INR';

  // 3. AI Transaction Extraction Pipeline
  const extraction = await extractTransactionFromNaturalLanguage(text, currency);

  if (extraction.isAmbiguous || !extraction.transaction) {
    const clarificationMsg = `❓ <b>Clarification Needed</b>\n\n${extraction.clarificationMessage || 'Please clarify the transaction type or amount.'}`;
    await sendTelegramMessage(chatId, clarificationMsg);
    return { success: true, responseMessage: 'Asked for user clarification.' };
  }

  const txData = extraction.transaction;

  // 4. Save Structured Transaction to Primary Database (Authoritative)
  const savedTx = await addTransaction({
    business_id: connection.business_id,
    created_by: null,
    telegram_connection_id: connection.id,
    transaction_type: txData.transaction_type,
    amount: txData.amount,
    currency: txData.currency,
    item: txData.item,
    quantity: txData.quantity,
    category: txData.category,
    customer_name: txData.customer_name || null,
    supplier_name: txData.supplier_name || null,
    payment_status: txData.payment_status,
    description: txData.description || text,
    transaction_date: txData.transaction_date || new Date().toISOString().split('T')[0],
    source: 'telegram',
  });

  // 5. Synchronize to Business Google Sheet
  const sheetResult = await syncTransactionToGoogleSheet(savedTx);

  // 6. Format Clean Telegram Confirmation
  const symbol = currency === 'INR' ? '₹' : '$';
  const typeIcons: Record<string, string> = {
    sale: '📈 Sale Recorded',
    expense: '📉 Expense Recorded',
    purchase: '🛒 Purchase Recorded',
    money_received: '💵 Money Received',
    money_paid: '💸 Money Paid',
    receivable: '⏳ Receivable Logged',
    payable: '🧾 Payable Logged',
  };

  const header = typeIcons[savedTx.transaction_type] || '📝 Transaction Saved';
  const sheetStatusText = sheetResult.success
    ? '📊 <i>Synced to Google Sheet</i>'
    : `⚠️ <i>Saved to Database (Sheet Sync pending)</i>`;

  const successMsg = `<b>${header}</b>\n\n<b>Item:</b> ${savedTx.item}\n<b>Amount:</b> ${symbol}${savedTx.amount}\n<b>Category:</b> ${savedTx.category}\n<b>Date:</b> ${savedTx.transaction_date}\n\n${sheetStatusText}`;

  await sendTelegramMessage(chatId, successMsg);
  return { success: true, responseMessage: `Recorded transaction ${savedTx.id} for business ${connection.business_id}` };
}
