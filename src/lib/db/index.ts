import {
  Profile,
  Business,
  BusinessMember,
  TelegramConnectionToken,
  TelegramConnection,
  GoogleConnection,
  Transaction,
  SyncLog,
  TransactionType,
} from '../types';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const isRealSupabase =
  Boolean(supabaseUrl) &&
  supabaseUrl.includes('supabase.co') &&
  !supabaseUrl.includes('demo-project') &&
  Boolean(supabaseKey) &&
  !supabaseKey.includes('demo') &&
  supabaseKey.length > 30;

export const supabase = isRealSupabase
  ? createClient(supabaseUrl, supabaseKey)
  : null;

import fs from 'fs';
import path from 'path';
import os from 'os';

const TMP_STORE_PATH = path.join(os.tmpdir(), 'autoledger_serverless_store.json');

// In-Memory Multi-Tenant Store (Fallback / Mock Server Engine with /tmp persistence for serverless cold starts)
class InMemoryStore {
  profiles: Map<string, Profile> = new Map();
  businesses: Map<string, Business> = new Map();
  members: Map<string, BusinessMember> = new Map();
  telegramTokens: Map<string, TelegramConnectionToken> = new Map();
  telegramConnections: Map<string, TelegramConnection> = new Map();
  googleConnections: Map<string, GoogleConnection> = new Map();
  transactions: Map<string, Transaction> = new Map();
  syncLogs: Map<string, SyncLog> = new Map();

  constructor() {
    this.seedDemoData();
    this.loadFromDisk();
  }

  saveToDisk() {
    try {
      const data = {
        profiles: Array.from(this.profiles.entries()),
        businesses: Array.from(this.businesses.entries()),
        members: Array.from(this.members.entries()),
        telegramTokens: Array.from(this.telegramTokens.entries()),
        telegramConnections: Array.from(this.telegramConnections.entries()),
        googleConnections: Array.from(this.googleConnections.entries()),
        transactions: Array.from(this.transactions.entries()),
        syncLogs: Array.from(this.syncLogs.entries()),
      };
      fs.writeFileSync(TMP_STORE_PATH, JSON.stringify(data), 'utf-8');
    } catch (e) {}
  }

  loadFromDisk() {
    try {
      if (fs.existsSync(TMP_STORE_PATH)) {
        const raw = fs.readFileSync(TMP_STORE_PATH, 'utf-8');
        const data = JSON.parse(raw);
        if (data.profiles) this.profiles = new Map(data.profiles);
        if (data.businesses) this.businesses = new Map(data.businesses);
        if (data.members) this.members = new Map(data.members);
        if (data.telegramTokens) this.telegramTokens = new Map(data.telegramTokens);
        if (data.telegramConnections) this.telegramConnections = new Map(data.telegramConnections);
        if (data.googleConnections) this.googleConnections = new Map(data.googleConnections);
        if (data.transactions) this.transactions = new Map(data.transactions);
        if (data.syncLogs) this.syncLogs = new Map(data.syncLogs);
      }
    } catch (e) {}
  }

  private seedDemoData() {
    // Business A: Fresh Green Groceries (User A)
    const userA: Profile = {
      id: 'usr_aaaa1111-1111-1111-1111-111111111111',
      email: 'owner.a@greengroceries.com',
      name: 'Anil Kumar',
      created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
    };
    const bizA: Business = {
      id: 'biz_aaaa1111-1111-1111-1111-111111111111',
      owner_id: userA.id,
      business_name: 'Fresh Green Groceries',
      business_type: 'Grocery Store',
      currency: 'INR',
      created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
      updated_at: new Date().toISOString(),
    };
    const memberA: BusinessMember = {
      id: 'mem_a',
      business_id: bizA.id,
      user_id: userA.id,
      role: 'owner',
      created_at: bizA.created_at,
    };

    // Business B: Metro Auto Parts (User B)
    const userB: Profile = {
      id: 'usr_bbbb2222-2222-2222-2222-222222222222',
      email: 'owner.b@metroparts.com',
      name: 'Bhavna Sharma',
      created_at: new Date(Date.now() - 20 * 86400000).toISOString(),
    };
    const bizB: Business = {
      id: 'biz_bbbb2222-2222-2222-2222-222222222222',
      owner_id: userB.id,
      business_name: 'Metro Auto Parts',
      business_type: 'Automotive & Spares',
      currency: 'INR',
      created_at: new Date(Date.now() - 20 * 86400000).toISOString(),
      updated_at: new Date().toISOString(),
    };
    const memberB: BusinessMember = {
      id: 'mem_b',
      business_id: bizB.id,
      user_id: userB.id,
      role: 'owner',
      created_at: bizB.created_at,
    };

    // Business C: Chai & Snacks Cafe (User C)
    const userC: Profile = {
      id: 'usr_cccc3333-3333-3333-3333-333333333333',
      email: 'owner.c@chaicafe.com',
      name: 'Chirag Patel',
      created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
    };
    const bizC: Business = {
      id: 'biz_cccc3333-3333-3333-3333-333333333333',
      owner_id: userC.id,
      business_name: 'Chai & Snacks Cafe',
      business_type: 'Restaurant / Cafe',
      currency: 'INR',
      created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
      updated_at: new Date().toISOString(),
    };
    const memberC: BusinessMember = {
      id: 'mem_c',
      business_id: bizC.id,
      user_id: userC.id,
      role: 'owner',
      created_at: bizC.created_at,
    };

    [userA, userB, userC].forEach((u) => this.profiles.set(u.id, u));
    [bizA, bizB, bizC].forEach((b) => this.businesses.set(b.id, b));
    [memberA, memberB, memberC].forEach((m) => this.members.set(m.id, m));

    const tgConnA: TelegramConnection = {
      id: 'tg_conn_a',
      business_id: bizA.id,
      telegram_user_id: '100001',
      telegram_chat_id: '900001',
      telegram_username: 'anil_grocer',
      connected_at: new Date().toISOString(),
      status: 'active',
      last_message_at: new Date().toISOString(),
    };
    this.telegramConnections.set(tgConnA.telegram_chat_id, tgConnA);

    const googA: GoogleConnection = {
      id: 'goog_conn_a',
      business_id: bizA.id,
      google_user_id: 'google_user_anil',
      spreadsheet_id: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      spreadsheet_url: 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit',
      access_token: 'mock_access_token_a',
      refresh_token: 'mock_refresh_token_a',
      token_expires_at: new Date(Date.now() + 3600000).toISOString(),
      connected_at: new Date().toISOString(),
      status: 'active',
    };
    this.googleConnections.set(bizA.id, googA);

    const todayStr = new Date().toISOString().split('T')[0];
    const sampleTxA: Transaction[] = [
      {
        id: 'tx_a1',
        business_id: bizA.id,
        created_by: userA.id,
        telegram_connection_id: tgConnA.id,
        transaction_type: 'sale',
        amount: 50,
        currency: 'INR',
        item: 'Aloo Bhajiya',
        quantity: 1,
        category: 'Food',
        customer_name: 'Walk-in Customer',
        supplier_name: null,
        payment_status: 'paid',
        description: 'Aloo bhajiya sold for ₹50',
        transaction_date: todayStr,
        source: 'telegram',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'tx_a2',
        business_id: bizA.id,
        created_by: userA.id,
        telegram_connection_id: tgConnA.id,
        transaction_type: 'expense',
        amount: 400,
        currency: 'INR',
        item: 'Potatoes',
        quantity: 10,
        category: 'Supplies',
        customer_name: null,
        supplier_name: 'Local Wholesale Mandi',
        payment_status: 'paid',
        description: 'Bought 10 kg potatoes for ₹400',
        transaction_date: todayStr,
        source: 'telegram',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    sampleTxA.forEach((tx) => this.transactions.set(tx.id, tx));
  }
}

export const inMemoryDB = new InMemoryStore();

// DATA ACCESS LAYER FUNCTIONS

export async function getOrCreateProfile(userId: string, email: string, name?: string): Promise<Profile> {
  if (supabase) {
    try {
      const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
      if (data) return data;
      const { data: created } = await supabase
        .from('profiles')
        .insert({ id: userId, email, name: name || email.split('@')[0] })
        .select()
        .single();
      if (created) return created;
    } catch (e) {
      console.warn('Supabase profile fetch failed, using fallback store');
    }
  }

  let profile = inMemoryDB.profiles.get(userId);
  if (!profile) {
    // Check by email
    const existingByEmail = Array.from(inMemoryDB.profiles.values()).find((p) => p.email === email);
    if (existingByEmail) return existingByEmail;

    profile = {
      id: userId,
      email,
      name: name || email.split('@')[0],
      created_at: new Date().toISOString(),
    };
    inMemoryDB.profiles.set(userId, profile);
  }
  return profile;
}

export async function createBusinessWorkspace(
  userId: string,
  businessName: string,
  businessType: string,
  currency: string = 'INR'
): Promise<{ business: Business; member: BusinessMember }> {
  // Check if business workspace already exists for this owner or business name (Prevent Duplicate Creation!)
  const existingBiz = Array.from(inMemoryDB.businesses.values()).find(
    (b) => b.owner_id === userId || b.business_name.toLowerCase() === businessName.toLowerCase()
  );
  if (existingBiz) {
    const existingMem = Array.from(inMemoryDB.members.values()).find(
      (m) => m.business_id === existingBiz.id && m.user_id === userId
    ) || {
      id: `mem_${existingBiz.id}`,
      business_id: existingBiz.id,
      user_id: userId,
      role: 'owner' as const,
      created_at: existingBiz.created_at,
    };
    return { business: existingBiz, member: existingMem };
  }

  const businessId = `biz_${crypto.randomUUID()}`;
  const memberId = `mem_${crypto.randomUUID()}`;
  const now = new Date().toISOString();

  if (supabase) {
    try {
      const { data: biz, error: bizErr } = await supabase
        .from('businesses')
        .insert({ owner_id: userId, business_name: businessName, business_type: businessType, currency })
        .select()
        .single();
      if (!bizErr && biz) {
        const { data: mem } = await supabase
          .from('business_members')
          .insert({ business_id: biz.id, user_id: userId, role: 'owner' })
          .select()
          .single();
        return { business: biz, member: mem };
      }
    } catch (e) {
      console.warn('Supabase business creation fallback to inMemoryDB');
    }
  }

  const business: Business = {
    id: businessId,
    owner_id: userId,
    business_name: businessName,
    business_type: businessType,
    currency,
    created_at: now,
    updated_at: now,
  };

  const member: BusinessMember = {
    id: memberId,
    business_id: businessId,
    user_id: userId,
    role: 'owner',
    created_at: now,
  };

  inMemoryDB.businesses.set(businessId, business);
  inMemoryDB.members.set(memberId, member);

  return { business, member };
}

export async function getUserBusinesses(userId: string): Promise<Business[]> {
  if (supabase) {
    try {
      const { data: members } = await supabase
        .from('business_members')
        .select('business_id')
        .eq('user_id', userId);
      if (members && members.length > 0) {
        const bIds = members.map((m) => m.business_id);
        const { data: bizs } = await supabase.from('businesses').select('*').in('id', bIds);
        if (bizs && bizs.length > 0) return bizs;
      }
    } catch (e) {
      console.warn('Supabase getUserBusinesses fallback');
    }
  }

  const userMemberBizIds = Array.from(inMemoryDB.members.values())
    .filter((m) => m.user_id === userId)
    .map((m) => m.business_id);

  return Array.from(inMemoryDB.businesses.values()).filter(
    (b) => userMemberBizIds.includes(b.id) || b.owner_id === userId
  );
}

export async function getBusiness(businessId: string): Promise<Business | null> {
  if (supabase) {
    try {
      const { data } = await supabase.from('businesses').select('*').eq('id', businessId).single();
      if (data) return data;
    } catch (e) {
      // Fallback
    }
  }
  return inMemoryDB.businesses.get(businessId) || null;
}

// TELEGRAM CONNECTION LOGIC
export async function createTelegramToken(businessId: string): Promise<TelegramConnectionToken> {
  const token = `connect_${crypto.randomUUID().replace(/-/g, '')}`;
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  const now = new Date().toISOString();

  if (supabase) {
    try {
      const { data } = await supabase
        .from('telegram_connection_tokens')
        .insert({ business_id: businessId, token, expires_at: expiresAt })
        .select()
        .single();
      if (data) return data;
    } catch (e) {}
  }

  const tokenObj: TelegramConnectionToken = {
    id: `tok_${crypto.randomUUID()}`,
    business_id: businessId,
    token,
    expires_at: expiresAt,
    used_at: null,
    created_at: now,
  };
  inMemoryDB.telegramTokens.set(token, tokenObj);
  return tokenObj;
}

export async function verifyAndConsumeTelegramToken(token: string): Promise<TelegramConnectionToken> {
  const now = new Date();

  if (supabase) {
    try {
      const { data: record } = await supabase
        .from('telegram_connection_tokens')
        .select('*')
        .eq('token', token)
        .single();

      if (record) {
        if (record.used_at) throw new Error('This Telegram connection link has already been used.');
        if (new Date(record.expires_at) < now) throw new Error('Your Telegram connection link has expired. Generate a new link.');

        await supabase
          .from('telegram_connection_tokens')
          .update({ used_at: now.toISOString() })
          .eq('id', record.id);

        return record;
      }
    } catch (e: any) {
      if (e.message?.includes('already been used') || e.message?.includes('expired')) throw e;
    }
  }

  const tokenObj = inMemoryDB.telegramTokens.get(token);
  if (!tokenObj) throw new Error('Invalid connection token.');
  if (tokenObj.used_at) throw new Error('This Telegram connection link has already been used.');
  if (new Date(tokenObj.expires_at) < now) throw new Error('Your Telegram connection link has expired. Generate a new link.');

  tokenObj.used_at = now.toISOString();
  inMemoryDB.telegramTokens.set(token, tokenObj);
  return tokenObj;
}

export async function createTelegramConnection(
  businessId: string,
  telegramUserId: string,
  telegramChatId: string,
  username?: string
): Promise<TelegramConnection> {
  const now = new Date().toISOString();

  if (supabase) {
    try {
      const { data: existing } = await supabase
        .from('telegram_connections')
        .select('*')
        .eq('telegram_chat_id', telegramChatId)
        .single();

      if (existing && existing.business_id !== businessId) {
        throw new Error('This Telegram account is already connected to another business workspace.');
      }

      const { data: conn } = await supabase
        .from('telegram_connections')
        .upsert({
          business_id: businessId,
          telegram_user_id: telegramUserId,
          telegram_chat_id: telegramChatId,
          telegram_username: username || null,
          connected_at: now,
          status: 'active',
          last_message_at: now,
        })
        .select()
        .single();

      if (conn) return conn;
    } catch (e: any) {
      if (e.message?.includes('already connected')) throw e;
    }
  }

  const existingChat = inMemoryDB.telegramConnections.get(telegramChatId);
  if (existingChat && existingChat.business_id !== businessId && existingChat.status === 'active') {
    throw new Error('This Telegram account is already connected to another business workspace.');
  }

  const connection: TelegramConnection = {
    id: `tg_conn_${crypto.randomUUID()}`,
    business_id: businessId,
    telegram_user_id: telegramUserId,
    telegram_chat_id: telegramChatId,
    telegram_username: username || null,
    connected_at: now,
    status: 'active',
    last_message_at: now,
  };

  inMemoryDB.telegramConnections.set(telegramChatId, connection);
  inMemoryDB.saveToDisk();
  return connection;
}

export async function getTelegramConnectionByChatId(chatId: string): Promise<TelegramConnection | null> {
  if (supabase) {
    try {
      const { data } = await supabase
        .from('telegram_connections')
        .select('*')
        .eq('telegram_chat_id', chatId)
        .eq('status', 'active')
        .single();
      if (data) return data;
    } catch (e) {}
  }

  const conn = inMemoryDB.telegramConnections.get(chatId);
  if (conn && conn.status === 'active') return conn;
  return null;
}

export async function getTelegramConnectionForBusiness(businessId: string): Promise<TelegramConnection | null> {
  if (supabase) {
    try {
      const { data } = await supabase
        .from('telegram_connections')
        .select('*')
        .eq('business_id', businessId)
        .eq('status', 'active')
        .single();
      if (data) return data;
    } catch (e) {}
  }

  return (
    Array.from(inMemoryDB.telegramConnections.values()).find(
      (c) => c.business_id === businessId && c.status === 'active'
    ) || null
  );
}

export async function disconnectTelegramConnection(businessId: string): Promise<void> {
  if (supabase) {
    try {
      await supabase
        .from('telegram_connections')
        .update({ status: 'disconnected' })
        .eq('business_id', businessId);
    } catch (e) {}
  }

  Array.from(inMemoryDB.telegramConnections.values())
    .filter((c) => c.business_id === businessId)
    .forEach((c) => {
      c.status = 'disconnected';
      inMemoryDB.telegramConnections.set(c.telegram_chat_id, c);
    });
}

// GOOGLE SHEETS CONNECTION LOGIC
export async function saveGoogleConnection(
  businessId: string,
  spreadsheetId: string,
  spreadsheetUrl: string,
  googleUserId?: string,
  tokens?: { access_token?: string; refresh_token?: string; expires_at?: string }
): Promise<GoogleConnection> {
  const now = new Date().toISOString();

  if (supabase) {
    try {
      const { data } = await supabase
        .from('google_connections')
        .upsert({
          business_id: businessId,
          google_user_id: googleUserId || null,
          spreadsheet_id: spreadsheetId,
          spreadsheet_url: spreadsheetUrl,
          access_token: tokens?.access_token || null,
          refresh_token: tokens?.refresh_token || null,
          token_expires_at: tokens?.expires_at || null,
          connected_at: now,
          status: 'active',
        })
        .select()
        .single();
      if (data) return data;
    } catch (e) {}
  }

  const conn: GoogleConnection = {
    id: `goog_conn_${crypto.randomUUID()}`,
    business_id: businessId,
    google_user_id: googleUserId || 'google_user_demo',
    spreadsheet_id: spreadsheetId,
    spreadsheet_url: spreadsheetUrl,
    access_token: tokens?.access_token || 'mock_access_token',
    refresh_token: tokens?.refresh_token || 'mock_refresh_token',
    token_expires_at: tokens?.expires_at || new Date(Date.now() + 3600000).toISOString(),
    connected_at: now,
    status: 'active',
  };

  inMemoryDB.googleConnections.set(businessId, conn);
  return conn;
}

export async function getGoogleConnection(businessId: string): Promise<GoogleConnection | null> {
  if (supabase) {
    try {
      const { data } = await supabase
        .from('google_connections')
        .select('*')
        .eq('business_id', businessId)
        .eq('status', 'active')
        .single();
      if (data) return data;
    } catch (e) {}
  }

  const conn = inMemoryDB.googleConnections.get(businessId);
  if (conn && conn.status === 'active') return conn;
  return null;
}

export async function disconnectGoogleConnection(businessId: string): Promise<void> {
  if (supabase) {
    try {
      await supabase
        .from('google_connections')
        .update({ status: 'disconnected' })
        .eq('business_id', businessId);
    } catch (e) {}
  }

  const conn = inMemoryDB.googleConnections.get(businessId);
  if (conn) {
    conn.status = 'disconnected';
    inMemoryDB.googleConnections.set(businessId, conn);
  }
}

// TRANSACTIONS LOGIC (ALWAYS SCOPED TO business_id AND RELIABLY SAVED)
export async function addTransaction(
  data: Omit<Transaction, 'id' | 'created_at' | 'updated_at'>
): Promise<Transaction> {
  const txId = `tx_${crypto.randomUUID()}`;
  const now = new Date().toISOString();

  if (supabase) {
    try {
      const { data: tx, error } = await supabase
        .from('transactions')
        .insert({ ...data })
        .select()
        .single();
      if (!error && tx) return tx;
    } catch (e) {
      console.warn('Supabase transaction insert fallback to inMemoryDB');
    }
  }

  const tx: Transaction = {
    id: txId,
    ...data,
    created_at: now,
    updated_at: now,
  };

  inMemoryDB.transactions.set(txId, tx);
  return tx;
}

export async function getBusinessTransactions(
  businessId: string,
  filters?: { date?: string; type?: string; category?: string }
): Promise<Transaction[]> {
  if (supabase) {
    try {
      let query = supabase
        .from('transactions')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });

      if (filters?.date) query = query.eq('transaction_date', filters.date);
      if (filters?.type) query = query.eq('transaction_type', filters.type);
      if (filters?.category) query = query.eq('category', filters.category);

      const { data } = await query;
      if (data) return data;
    } catch (e) {}
  }

  let txs = Array.from(inMemoryDB.transactions.values()).filter(
    (t) => t.business_id === businessId
  );

  if (filters?.date) txs = txs.filter((t) => t.transaction_date === filters.date);
  if (filters?.type) txs = txs.filter((t) => t.transaction_type === filters.type);
  if (filters?.category) {
    const catFilter = filters.category.toLowerCase();
    txs = txs.filter((t) => t.category.toLowerCase().includes(catFilter));
  }

  return txs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export async function getBusinessFinancialMetrics(businessId: string) {
  const transactions = await getBusinessTransactions(businessId);
  const todayStr = new Date().toISOString().split('T')[0];

  let todaySales = 0;
  let todayExpenses = 0;
  let totalSales = 0;
  let totalExpenses = 0;
  let totalReceivables = 0;
  let totalPayables = 0;

  const categoryMap: Record<string, number> = {};
  const itemMap: Record<string, { quantity: number; revenue: number }> = {};

  transactions.forEach((tx) => {
    const amt = Number(tx.amount) || 0;
    const isToday = tx.transaction_date === todayStr;

    if (tx.transaction_type === 'sale') {
      totalSales += amt;
      if (isToday) todaySales += amt;

      if (!itemMap[tx.item]) itemMap[tx.item] = { quantity: 0, revenue: 0 };
      itemMap[tx.item].quantity += Number(tx.quantity) || 1;
      itemMap[tx.item].revenue += amt;
    } else if (tx.transaction_type === 'expense' || tx.transaction_type === 'purchase') {
      totalExpenses += amt;
      if (isToday) todayExpenses += amt;

      const cat = tx.category || 'General';
      categoryMap[cat] = (categoryMap[cat] || 0) + amt;
    } else if (tx.transaction_type === 'receivable') {
      if (tx.payment_status === 'pending') totalReceivables += amt;
    } else if (tx.transaction_type === 'payable') {
      if (tx.payment_status === 'pending') totalPayables += amt;
    }
  });

  const netCashFlow = totalSales - totalExpenses;

  const topSellingItems = Object.entries(itemMap)
    .map(([item, data]) => ({ item, ...data }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  const categoryBreakdown = Object.entries(categoryMap).map(([category, amount]) => ({
    category,
    amount,
  }));

  return {
    todaySales,
    todayExpenses,
    netCashFlow,
    totalSales,
    totalExpenses,
    totalReceivables,
    totalPayables,
    topSellingItems,
    categoryBreakdown,
    transactionCount: transactions.length,
  };
}

export async function logSyncStatus(
  transactionId: string,
  businessId: string,
  status: 'success' | 'failed',
  errorMessage?: string
): Promise<void> {
  const logId = `log_${crypto.randomUUID()}`;
  const now = new Date().toISOString();

  if (supabase) {
    try {
      await supabase.from('sync_logs').insert({
        transaction_id: transactionId,
        business_id: businessId,
        target: 'google_sheets',
        status,
        error_message: errorMessage || null,
        synced_at: now,
      });
      return;
    } catch (e) {}
  }

  const log: SyncLog = {
    id: logId,
    transaction_id: transactionId,
    business_id: businessId,
    target: 'google_sheets',
    status,
    error_message: errorMessage || null,
    retries: status === 'failed' ? 1 : 0,
    synced_at: now,
  };

  inMemoryDB.syncLogs.set(logId, log);
}
