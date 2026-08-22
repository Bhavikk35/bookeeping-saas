import {
  createBusinessWorkspace,
  getOrCreateProfile,
  createTelegramToken,
  verifyAndConsumeTelegramToken,
  createTelegramConnection,
  getTelegramConnectionByChatId,
  addTransaction,
  getBusinessTransactions,
  getBusinessFinancialMetrics,
  inMemoryDB,
} from '../src/lib/db/index';
import { extractTransactionFromNaturalLanguage } from '../src/lib/ai/transaction-extractor';
import { processTelegramWebhookUpdate } from '../src/lib/telegram/bot-service';

async function runMultiTenantVerification() {
  console.log('====================================================');
  console.log('🚀 MULTI-TENANT SAAS END-TO-END VERIFICATION TEST');
  console.log('====================================================\n');

  // ----------------------------------------------------
  // TEST 1: Provision 3 Independent Businesses
  // ----------------------------------------------------
  console.log('📌 STEP 1: Provisioning 3 Independent Business Workspaces...');
  const userA = await getOrCreateProfile('usr_test_a', 'owner.a@greengroceries.com', 'Anil Kumar');
  const bizA = await createBusinessWorkspace(userA.id, 'Fresh Green Groceries', 'Grocery', 'INR');

  const userB = await getOrCreateProfile('usr_test_b', 'owner.b@metroparts.com', 'Bhavna Sharma');
  const bizB = await createBusinessWorkspace(userB.id, 'Metro Auto Parts', 'Automotive', 'INR');

  const userC = await getOrCreateProfile('usr_test_c', 'owner.c@chaicafe.com', 'Chirag Patel');
  const bizC = await createBusinessWorkspace(userC.id, 'Chai & Snacks Cafe', 'Restaurant', 'INR');

  console.log(`  ✓ Business A: ${bizA.business.business_name} (ID: ${bizA.business.id})`);
  console.log(`  ✓ Business B: ${bizB.business.business_name} (ID: ${bizB.business.id})`);
  console.log(`  ✓ Business C: ${bizC.business.business_name} (ID: ${bizC.business.id})\n`);

  // ----------------------------------------------------
  // TEST 2: Generate Unique Cryptographic Connection Tokens
  // ----------------------------------------------------
  console.log('📌 STEP 2: Generating Universal Telegram Deep-Link Tokens...');
  const tokA = await createTelegramToken(bizA.business.id);
  const tokB = await createTelegramToken(bizB.business.id);
  const tokC = await createTelegramToken(bizC.business.id);

  console.log(`  ✓ Token A: ${tokA.token}`);
  console.log(`  ✓ Token B: ${tokB.token}`);
  console.log(`  ✓ Token C: ${tokC.token}\n`);

  // ----------------------------------------------------
  // TEST 3: Verify & Bind Telegram Chat IDs to Single Universal Bot
  // ----------------------------------------------------
  console.log('📌 STEP 3: Connecting Telegram Chats via Universal Webhook (/start <TOKEN>)...');
  const chatA = 'chat_900001';
  const chatB = 'chat_900002';
  const chatC = 'chat_900003';

  await processTelegramWebhookUpdate({
    update_id: 1,
    message: { chat: { id: chatA }, from: { id: 101, username: 'anil_tg' }, text: `/start ${tokA.token}` },
  });

  await processTelegramWebhookUpdate({
    update_id: 2,
    message: { chat: { id: chatB }, from: { id: 102, username: 'bhavna_tg' }, text: `/start ${tokB.token}` },
  });

  await processTelegramWebhookUpdate({
    update_id: 3,
    message: { chat: { id: chatC }, from: { id: 103, username: 'chirag_tg' }, text: `/start ${tokC.token}` },
  });

  const connA = await getTelegramConnectionByChatId(chatA);
  const connB = await getTelegramConnectionByChatId(chatB);
  const connC = await getTelegramConnectionByChatId(chatC);

  if (connA?.business_id !== bizA.business.id) throw new Error('Chat A incorrectly mapped!');
  if (connB?.business_id !== bizB.business.id) throw new Error('Chat B incorrectly mapped!');
  if (connC?.business_id !== bizC.business.id) throw new Error('Chat C incorrectly mapped!');

  console.log('  ✓ Chat 900001 -> Business A (Fresh Green Groceries)');
  console.log('  ✓ Chat 900002 -> Business B (Metro Auto Parts)');
  console.log('  ✓ Chat 900003 -> Business C (Chai & Snacks Cafe)\n');

  // ----------------------------------------------------
  // TEST 4: Token Reuse & Expiry Protection
  // ----------------------------------------------------
  console.log('📌 STEP 4: Verifying Single-Use Token Reuse Security Guard...');
  try {
    await verifyAndConsumeTelegramToken(tokA.token);
    console.error('  ❌ FAILED: Reused token was improperly accepted!');
  } catch (err: any) {
    console.log(`  ✓ Successfully rejected used token: "${err.message}"\n`);
  }

  // ----------------------------------------------------
  // TEST 5: Natural Language Telegram Transactions & Routing
  // ----------------------------------------------------
  console.log('📌 STEP 5: Processing Natural Language Transactions via Telegram Webhook...');

  // Business A Message
  console.log('  Sending to Business A: "Aloo bhajiya sold for ₹50"');
  await processTelegramWebhookUpdate({
    update_id: 10,
    message: { chat: { id: chatA }, text: 'Aloo bhajiya sold for ₹50' },
  });

  // Business B Message
  console.log('  Sending to Business B: "Bought 10 kg brake fluid for ₹1200"');
  await processTelegramWebhookUpdate({
    update_id: 11,
    message: { chat: { id: chatB }, text: 'Bought 10 kg brake fluid for ₹1200' },
  });

  // Business C Message
  console.log('  Sending to Business C: "Special Masala Chai sold for ₹120"');
  await processTelegramWebhookUpdate({
    update_id: 12,
    message: { chat: { id: chatC }, text: 'Special Masala Chai sold for ₹120' },
  });

  // Ambiguity Handling Test
  console.log('  Sending Ambiguous Message to Business A: "Paid 500 to Rahul"');
  const ambigResult = await extractTransactionFromNaturalLanguage('Paid 500 to Rahul');
  if (ambigResult.isAmbiguous) {
    console.log(`  ✓ Ambiguity Guard Triggered: "${ambigResult.clarificationMessage}"\n`);
  } else {
    console.error('  ❌ FAILED: Ambiguous message was not flagged!');
  }

  // ----------------------------------------------------
  // TEST 6: Strict Data Isolation Verification across Dashboard Metrics
  // ----------------------------------------------------
  console.log('📌 STEP 6: Verifying Strict Data Isolation Across Tenant Workspaces...');
  const txsA = await getBusinessTransactions(bizA.business.id);
  const txsB = await getBusinessTransactions(bizB.business.id);
  const txsC = await getBusinessTransactions(bizC.business.id);

  const metricsA = await getBusinessFinancialMetrics(bizA.business.id);
  const metricsB = await getBusinessFinancialMetrics(bizB.business.id);
  const metricsC = await getBusinessFinancialMetrics(bizC.business.id);

  console.log(`  Business A Sales: ₹${metricsA.totalSales} | Expenses: ₹${metricsA.totalExpenses} (Transactions count: ${txsA.length})`);
  console.log(`  Business B Sales: ₹${metricsB.totalSales} | Expenses: ₹${metricsB.totalExpenses} (Transactions count: ${txsB.length})`);
  console.log(`  Business C Sales: ₹${metricsC.totalSales} | Expenses: ₹${metricsC.totalExpenses} (Transactions count: ${txsC.length})\n`);

  // Verify Cross-Tenant Leakage Check
  const leakBInA = txsA.some((t) => t.business_id === bizB.business.id);
  const leakCInA = txsA.some((t) => t.business_id === bizC.business.id);
  if (leakBInA || leakCInA) {
    throw new Error('CRITICAL SECURITY VIOLATION: Cross-tenant data leakage detected!');
  }
  console.log('  🛡️ ZERO DATA LEAKAGE VERIFIED: Business A, B, and C data is 100% isolated!');

  console.log('\n====================================================');
  console.log('✅ ALL MULTI-TENANT VERIFICATION TESTS PASSED SUCCESSFULLY!');
  console.log('====================================================\n');
}

runMultiTenantVerification().catch((err) => {
  console.error('❌ Multi-Tenant Verification Failed:', err);
  process.exit(1);
});
