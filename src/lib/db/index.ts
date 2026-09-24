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
  InventoryItem,
  InventorySummary,
  Customer,
  CustomerLedgerEntry,
} from '../types';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import os from 'os';

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

const TMP_STORE_PATH = path.join(os.tmpdir(), 'autoledger_serverless_store.json');

// In-Memory Multi-Tenant Store with /tmp disk persistence for serverless cold start resilience
class InMemoryStore {
  profiles: Map<string, Profile> = new Map();
  businesses: Map<string, Business> = new Map();
  members: Map<string, BusinessMember> = new Map();
  telegramTokens: Map<string, TelegramConnectionToken> = new Map();
  telegramConnections: Map<string, TelegramConnection> = new Map();
  googleConnections: Map<string, GoogleConnection> = new Map();
  transactions: Map<string, Transaction> = new Map();
  syncLogs: Map<string, SyncLog> = new Map();
  inventoryItems: Map<string, InventoryItem> = new Map();
  customers: Map<string, Customer> = new Map();
  customerLedger: Map<string, CustomerLedgerEntry> = new Map();

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
        inventoryItems: Array.from(this.inventoryItems.entries()),
        customers: Array.from(this.customers.entries()),
        customerLedger: Array.from(this.customerLedger.entries()),
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
        if (data.inventoryItems) this.inventoryItems = new Map(data.inventoryItems);
        if (data.customers) this.customers = new Map(data.customers);
        if (data.customerLedger) this.customerLedger = new Map(data.customerLedger);
      }
    } catch (e) {}
  }

  private seedDemoData() {
    // Default Demo Workspace for Guest View
    const userDemo: Profile = {
      id: 'usr_tenant_demo',
      email: 'owner.demo@autoledger.com',
      name: 'Business Owner',
      created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
    };
    const bizDemo: Business = {
      id: 'biz_tenant_demo',
      owner_id: userDemo.id,
      business_name: 'My Business Workspace',
      business_type: 'General Business',
      currency: 'INR',
      created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
      updated_at: new Date().toISOString(),
    };
    const memberDemo: BusinessMember = {
      id: 'mem_demo',
      business_id: bizDemo.id,
      user_id: userDemo.id,
      role: 'owner',
      created_at: bizDemo.created_at,
    };

    this.profiles.set(userDemo.id, userDemo);
    this.businesses.set(bizDemo.id, bizDemo);
    this.members.set(memberDemo.id, memberDemo);

    const tgConnA: TelegramConnection = {
      id: 'tg_conn_a',
      business_id: bizDemo.id,
      telegram_user_id: '100001',
      telegram_chat_id: '900001',
      telegram_username: 'demo_user',
      connected_at: new Date().toISOString(),
      status: 'active',
      last_message_at: new Date().toISOString(),
    };
    this.telegramConnections.set(tgConnA.telegram_chat_id, tgConnA);

    const googA: GoogleConnection = {
      id: 'goog_conn_a',
      business_id: bizDemo.id,
      google_user_id: 'google_user_demo',
      spreadsheet_id: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      spreadsheet_url: 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit',
      access_token: 'mock_access_token_a',
      refresh_token: 'mock_refresh_token_a',
      token_expires_at: new Date(Date.now() + 3600000).toISOString(),
      connected_at: new Date().toISOString(),
      status: 'active',
    };

    // Demo Inventory Items for bizDemo
    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 86400000).toISOString().split('T')[0];
    const in5Days = new Date(now.getTime() + 5 * 86400000).toISOString().split('T')[0];

    const demoInv1: InventoryItem = {
      id: 'inv_maggie_demo',
      business_id: bizDemo.id,
      item_name: 'Maggie 2-Min Noodles',
      sku: 'SKU-MAG-01',
      unit_price: 20,
      quantity_in_stock: 50,
      min_stock_alert: 10,
      category: 'Food & Retail',
      expiry_date: in30Days,
      batch_number: 'BATCH-2026-08',
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    };

    const demoInv2: InventoryItem = {
      id: 'inv_milk_demo',
      business_id: bizDemo.id,
      item_name: 'Fresh Dairy Milk 1L',
      sku: 'SKU-MLK-02',
      unit_price: 65,
      quantity_in_stock: 4,
      min_stock_alert: 5,
      category: 'Dairy',
      expiry_date: in5Days,
      batch_number: 'BATCH-MLK-99',
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    };

    this.inventoryItems.set(demoInv1.id, demoInv1);
    this.inventoryItems.set(demoInv2.id, demoInv2);
  }
}

const globalStore = (globalThis as any).__AUTOLEDGER_GLOBAL_STORE__ || new InMemoryStore();
(globalThis as any).__AUTOLEDGER_GLOBAL_STORE__ = globalStore;
export const inMemoryDB: InMemoryStore = globalStore;

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
    const existingByEmail = Array.from(inMemoryDB.profiles.values()).find((p) => p.email === email);
    if (existingByEmail) return existingByEmail;

    profile = {
      id: userId,
      email,
      name: name || email.split('@')[0],
      created_at: new Date().toISOString(),
    };
    inMemoryDB.profiles.set(userId, profile);
    inMemoryDB.saveToDisk();
  }
  return profile;
}

export async function createBusinessWorkspace(
  userId: string,
  businessName: string,
  businessType: string,
  currency: string = 'INR'
): Promise<{ business: Business; member: BusinessMember }> {
  // Check if user already owns any business in inMemoryDB
  const existingBiz = Array.from(inMemoryDB.businesses.values()).find(
    (b) => b.owner_id === userId
  );
  if (existingBiz) {
    if (businessName && existingBiz.business_name !== businessName) {
      existingBiz.business_name = businessName;
      inMemoryDB.businesses.set(existingBiz.id, existingBiz);
      inMemoryDB.saveToDisk();
    }
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

  const cleanSlug = businessName.toLowerCase().replace(/[^a-z0-9]/g, '_');
  const businessId = `biz_tenant_${cleanSlug}_${Date.now()}`;
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
  inMemoryDB.saveToDisk();

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
  if (!businessId) return null;

  if (supabase) {
    try {
      const { data } = await supabase.from('businesses').select('*').eq('id', businessId).single();
      if (data) return data;
    } catch (e) {}
  }

  const existing = inMemoryDB.businesses.get(businessId);
  if (existing) return existing;

  // Auto-register custom business workspace dynamically if created via sign-up or token
  const nameFromId = businessId.replace(/^biz_(tenant_)?/, '').replace(/_/g, ' ');
  const cleanName = nameFromId ? nameFromId.charAt(0).toUpperCase() + nameFromId.slice(1) : 'Business Workspace';

  const autoBiz: Business = {
    id: businessId,
    owner_id: `usr_${businessId}`,
    business_name: cleanName.includes('Workspace') || cleanName.includes('Store') ? cleanName : `${cleanName}'s Workspace`,
    business_type: 'General Business',
    currency: 'INR',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  inMemoryDB.businesses.set(businessId, autoBiz);
  inMemoryDB.saveToDisk();
  return autoBiz;
}

// TELEGRAM CONNECTION LOGIC
export async function createTelegramToken(businessId: string, businessName?: string): Promise<TelegramConnectionToken> {
  const cleanBizId = businessId.replace(/[^a-zA-Z0-9]/g, '');
  const token = `connect_${cleanBizId}_${crypto.randomUUID().replace(/-/g, '')}`;
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  const now = new Date().toISOString();

  const existing = inMemoryDB.businesses.get(businessId);
  const newBiz: Business = {
    id: businessId,
    owner_id: existing?.owner_id || `usr_${businessId}`,
    business_name: businessName || existing?.business_name || 'My Business Workspace',
    business_type: 'General Business',
    currency: 'INR',
    created_at: existing?.created_at || now,
    updated_at: now,
  };
  inMemoryDB.businesses.set(businessId, newBiz);
  inMemoryDB.saveToDisk();

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
  inMemoryDB.saveToDisk();
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
        if (!record.used_at) {
          await supabase
            .from('telegram_connection_tokens')
            .update({ used_at: now.toISOString() })
            .eq('id', record.id);
        }
        return record;
      }
    } catch (e: any) {}
  }

  let tokenObj = inMemoryDB.telegramTokens.get(token);
  if (!tokenObj) {
    // Extract target business_id directly from self-describing token string: connect_<clean_biz_id>_<uuid>
    let targetBiz: Business | undefined;
    if (token.startsWith('connect_')) {
      const parts = token.split('_');
      if (parts.length >= 3) {
        const cleanIdFromToken = parts.slice(1, parts.length - 1).join('_');
        targetBiz = Array.from(inMemoryDB.businesses.values()).find(
          (b) => b.id === cleanIdFromToken || b.id.replace(/[^a-zA-Z0-9]/g, '') === cleanIdFromToken
        );
      }
    }

    if (!targetBiz) {
      const customBizs = Array.from(inMemoryDB.businesses.values()).filter(
        (b) => !b.id.includes('aaaa1111') && !b.id.includes('bbbb2222') && !b.id.includes('cccc3333')
      );
      targetBiz = customBizs[customBizs.length - 1] || Array.from(inMemoryDB.businesses.values())[0];
    }

    const resolvedBizId = targetBiz ? targetBiz.id : 'biz_active_tenant';

    tokenObj = {
      id: `tok_${token}`,
      business_id: resolvedBizId,
      token,
      expires_at: new Date(Date.now() + 86400000).toISOString(),
      used_at: now.toISOString(),
      created_at: now.toISOString(),
    };
    inMemoryDB.telegramTokens.set(token, tokenObj);
    inMemoryDB.saveToDisk();
    return tokenObj;
  }

  if (!tokenObj.used_at) {
    tokenObj.used_at = now.toISOString();
    inMemoryDB.telegramTokens.set(token, tokenObj);
    inMemoryDB.saveToDisk();
  }

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
      const { data: conn, error } = await supabase
        .from('telegram_connections')
        .upsert(
          {
            business_id: businessId,
            telegram_user_id: telegramUserId,
            telegram_chat_id: telegramChatId,
            telegram_username: username || null,
            connected_at: now,
            status: 'active',
            last_message_at: now,
          },
          { onConflict: 'telegram_chat_id' }
        )
        .select()
        .single();

      if (!error && conn) return conn;
      if (error) console.error('[createTelegramConnection] Supabase upsert failed:', error.message, error.details);
    } catch (e: any) {
      console.error('[createTelegramConnection] Supabase upsert threw:', e.message);
    }
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

  // Re-bind / update chat connection to the active workspace
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

export async function setTelegramConnectionPending(
  connection: TelegramConnection,
  pendingMessage: string | null
): Promise<void> {
  const pending_since = pendingMessage ? new Date().toISOString() : null;

  if (supabase) {
    try {
      const { error } = await supabase
        .from('telegram_connections')
        .update({ pending_message: pendingMessage, pending_since })
        .eq('id', connection.id);
      if (error) console.error('[setTelegramConnectionPending] Supabase update failed:', error.message);
    } catch (e: any) {
      console.error('[setTelegramConnectionPending] Supabase update threw:', e.message);
    }
  }

  const existing = inMemoryDB.telegramConnections.get(connection.telegram_chat_id);
  if (existing) {
    existing.pending_message = pendingMessage;
    existing.pending_since = pending_since;
    inMemoryDB.telegramConnections.set(connection.telegram_chat_id, existing);
    inMemoryDB.saveToDisk();
  }
}

export async function getAllActiveTelegramConnections(): Promise<TelegramConnection[]> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('telegram_connections')
        .select('*')
        .eq('status', 'active');
      if (!error && data) return data;
      if (error) console.error('[getAllActiveTelegramConnections] Supabase select failed:', error.message);
    } catch (e: any) {
      console.error('[getAllActiveTelegramConnections] Supabase select threw:', e.message);
    }
  }

  return Array.from(inMemoryDB.telegramConnections.values()).filter((c) => c.status === 'active');
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
  inMemoryDB.saveToDisk();
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
  inMemoryDB.saveToDisk();
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
    inMemoryDB.saveToDisk();
  }
}

// TRANSACTIONS LOGIC (ALWAYS SCOPED TO business_id AND RELIABLY SAVED)
export async function addTransaction(
  data: Omit<Transaction, 'id' | 'created_at' | 'updated_at'> & { expiry_date?: string | null }
): Promise<Transaction> {
  const { expiry_date, ...txData } = data;
  const txId = `tx_${crypto.randomUUID()}`;
  const now = new Date().toISOString();

  // For sale transactions: snapshot the inventory cost_price → unit_cost_at_sale
  // This must happen BEFORE we deduct stock so we read the correct price.
  let unitCostAtSale: number | null = null;
  if (txData.transaction_type === 'sale' || txData.transaction_type === 'money_received') {
    if (txData.item) {
      const items = Array.from(inMemoryDB.inventoryItems.values()).filter(
        (i) => i.business_id === txData.business_id
      );
      const cleanQuery = txData.item.trim().toLowerCase();
      const matched =
        items.find((i) => i.item_name.trim().toLowerCase() === cleanQuery) ||
        items.find(
          (i) =>
            i.item_name.toLowerCase().includes(cleanQuery) ||
            cleanQuery.includes(i.item_name.toLowerCase())
        );
      if (matched && matched.cost_price != null && matched.cost_price > 0) {
        unitCostAtSale = matched.cost_price;
      }
    }
  }

  const finalTxData = { ...txData, unit_cost_at_sale: unitCostAtSale };

  // Runs no matter which storage path saved the transaction, so inventory
  // never gets skipped when Supabase is configured and succeeds. Awaited
  // (not fire-and-forget) because serverless functions can freeze right
  // after the response is sent, killing any unfinished background promise.
  const syncInventory = async () => {
    try {
      if (txData.transaction_type === 'sale' || txData.transaction_type === 'money_received') {
        await deductInventoryStock(txData.business_id, txData.item, txData.quantity || 1);
      } else if (txData.transaction_type === 'purchase' || txData.transaction_type === 'expense') {
        await restockOrUpdateInventoryStock(
          txData.business_id,
          txData.item,
          txData.quantity || 1,
          txData.amount,
          txData.category,
          expiry_date
        );
      }
    } catch (e) {
      console.error('[addTransaction] Auto inventory sync error:', e);
    }
  };

  if (supabase) {
    try {
      const { data: tx, error } = await supabase
        .from('transactions')
        .insert({ ...finalTxData })
        .select()
        .single();
      if (!error && tx) {
        await syncInventory();
        return tx;
      }
      if (error) console.error('[addTransaction] Supabase insert failed:', error.message, error.details);
    } catch (e: any) {
      console.error('[addTransaction] Supabase insert threw, falling back to inMemoryDB:', e.message);
    }
  }

  const tx: Transaction = {
    id: txId,
    ...finalTxData,
    created_at: now,
    updated_at: now,
  };

  inMemoryDB.transactions.set(txId, tx);
  inMemoryDB.saveToDisk();

  await syncInventory();

  return tx;
}

// INVENTORY MANAGEMENT LOGIC
export async function addOrUpdateInventoryItem(
  data: Omit<InventoryItem, 'id' | 'created_at' | 'updated_at'> & { id?: string }
): Promise<InventoryItem> {
  const now = new Date().toISOString();
  // Must be a plain UUID (no prefix) — inventory_items.id is a Postgres
  // `uuid` column, which rejects anything not in pure UUID format.
  const itemId = data.id || crypto.randomUUID();

  if (supabase) {
    try {
      const { data: record, error } = await supabase
        .from('inventory_items')
        .upsert({
          id: itemId,
          business_id: data.business_id,
          item_name: data.item_name,
          sku: data.sku || null,
          unit_price: data.unit_price || 0,
          cost_price: data.cost_price ?? null,
          quantity_in_stock: data.quantity_in_stock || 0,
          min_stock_alert: data.min_stock_alert || 5,
          category: data.category || 'General',
          expiry_date: data.expiry_date || null,
          batch_number: data.batch_number || null,
          updated_at: now,
        })
        .select()
        .single();
      if (!error && record) {
        inMemoryDB.inventoryItems.set(record.id, record);
        inMemoryDB.saveToDisk();
        return record;
      }
      if (error) console.error('[addOrUpdateInventoryItem] Supabase upsert failed:', error.message, error.details);
    } catch (e: any) {
      console.error('[addOrUpdateInventoryItem] Supabase upsert threw, falling back to inMemoryDB:', e.message);
    }
  }

  const existing = inMemoryDB.inventoryItems.get(itemId);
  const item: InventoryItem = {
    id: itemId,
    business_id: data.business_id,
    item_name: data.item_name,
    sku: data.sku || existing?.sku || null,
    unit_price: data.unit_price,
    cost_price: data.cost_price ?? existing?.cost_price ?? 0,
    quantity_in_stock: data.quantity_in_stock,
    min_stock_alert: data.min_stock_alert ?? existing?.min_stock_alert ?? 5,
    category: data.category || existing?.category || 'General',
    expiry_date: data.expiry_date || existing?.expiry_date || null,
    batch_number: data.batch_number || existing?.batch_number || null,
    created_at: existing?.created_at || now,
    updated_at: now,
  };

  inMemoryDB.inventoryItems.set(itemId, item);
  inMemoryDB.saveToDisk();
  return item;
}

export async function getBusinessInventory(businessId: string): Promise<InventoryItem[]> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('business_id', businessId)
        .order('item_name', { ascending: true });
      if (!error && data && data.length > 0) return data;
      if (error) console.error('[getBusinessInventory] Supabase select failed:', error.message, error.details);
    } catch (e: any) {
      console.error('[getBusinessInventory] Supabase select threw:', e.message);
    }
  }

  let items = Array.from(inMemoryDB.inventoryItems.values()).filter(
    (i) => i.business_id === businessId
  );

  // Auto-sync items from transactions if not yet present in inventory table
  const allTxs = Array.from(inMemoryDB.transactions.values()).filter(
    (t) => t.business_id === businessId
  );

  const txItemsMap = new Map<string, { purchases: number; sales: number; totalAmount: number; category: string }>();

  allTxs.forEach((tx) => {
    if (!tx.item) return;
    const cleanName = tx.item.trim();
    if (!txItemsMap.has(cleanName.toLowerCase())) {
      txItemsMap.set(cleanName.toLowerCase(), { purchases: 0, sales: 0, totalAmount: 0, category: tx.category || 'General' });
    }
    const entry = txItemsMap.get(cleanName.toLowerCase())!;
    const qty = Number(tx.quantity) || 1;
    const amt = Number(tx.amount) || 0;

    if (tx.transaction_type === 'purchase' || tx.transaction_type === 'expense') {
      entry.purchases += qty;
      entry.totalAmount += amt;
    } else if (tx.transaction_type === 'sale' || tx.transaction_type === 'money_received') {
      entry.sales += qty;
    }
  });

  txItemsMap.forEach((data, lowerName) => {
    const exists = items.some((i) => i.item_name.toLowerCase() === lowerName);
    if (!exists) {
      // Find original item name capitalization
      const origTx = allTxs.find((t) => t.item && t.item.trim().toLowerCase() === lowerName);
      const displayName = origTx ? origTx.item.trim() : lowerName;
      const initialStock = data.purchases > 0 ? data.purchases : 20;
      const currentStock = Math.max(0, initialStock - data.sales);
      const unitPrice = data.purchases > 0 && data.totalAmount > 0 ? Math.round(data.totalAmount / data.purchases) : 20;

      const autoItem: InventoryItem = {
        id: `inv_auto_${businessId}_${lowerName.replace(/[^a-z0-9]/g, '_')}`,
        business_id: businessId,
        item_name: displayName,
        sku: `SKU-${displayName.substring(0, 3).toUpperCase()}-01`,
        unit_price: unitPrice,
        quantity_in_stock: currentStock,
        min_stock_alert: 5,
        category: data.category,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      inMemoryDB.inventoryItems.set(autoItem.id, autoItem);
      inMemoryDB.saveToDisk();
      items.push(autoItem);
    }
  });

  return items.sort((a, b) => a.item_name.localeCompare(b.item_name));
}

export async function deleteInventoryItem(businessId: string, itemId: string): Promise<boolean> {
  if (supabase) {
    try {
      await supabase.from('inventory_items').delete().eq('id', itemId).eq('business_id', businessId);
    } catch (e) {}
  }

  const existing = inMemoryDB.inventoryItems.get(itemId);
  if (existing && existing.business_id === businessId) {
    inMemoryDB.inventoryItems.delete(itemId);
    inMemoryDB.saveToDisk();
    return true;
  }
  return false;
}

export async function restockOrUpdateInventoryStock(
  businessId: string,
  itemName: string,
  restockQuantity: number = 1,
  amount?: number,
  category?: string,
  expiryDate?: string | null
): Promise<{ item: InventoryItem; newStock: number }> {
  const cleanName = itemName.trim();
  const items = await getBusinessInventory(businessId);
  
  let matchedItem = items.find(
    (i) => i.item_name.trim().toLowerCase() === cleanName.toLowerCase()
  );

  if (!matchedItem) {
    matchedItem = items.find(
      (i) =>
        i.item_name.toLowerCase().includes(cleanName.toLowerCase()) ||
        cleanName.toLowerCase().includes(i.item_name.toLowerCase())
    );
  }

  const qty = Math.max(1, restockQuantity);
  // cost per unit derived from the restock purchase amount
  const costPerUnit = amount && amount > 0 ? Math.round((amount / qty) * 100) / 100 : 0;

  if (matchedItem) {
    const newStock = matchedItem.quantity_in_stock + qty;
    const updated = await addOrUpdateInventoryItem({
      ...matchedItem,
      quantity_in_stock: newStock,
      // cost_price: update with new restock cost (weighted average could be used in future)
      cost_price: costPerUnit > 0 ? costPerUnit : (matchedItem.cost_price ?? 0),
      // unit_price (selling price) is never overwritten by a purchase — only set if still 0
      unit_price: matchedItem.unit_price > 0 ? matchedItem.unit_price : costPerUnit,
      expiry_date: expiryDate ?? matchedItem.expiry_date,
    });
    return { item: updated, newStock };
  } else {
    const newItem = await addOrUpdateInventoryItem({
      business_id: businessId,
      item_name: cleanName,
      cost_price: costPerUnit,
      unit_price: costPerUnit, // selling price defaults to cost until manually updated
      quantity_in_stock: qty,
      min_stock_alert: 5,
      category: category || 'Food & Retail',
      expiry_date: expiryDate ?? null,
    });
    return { item: newItem, newStock: qty };
  }
}

export async function deductInventoryStock(
  businessId: string,
  itemName: string,
  soldQuantity: number = 1
): Promise<{ matched: boolean; item?: InventoryItem; remainingStock?: number }> {
  if (!itemName) return { matched: false };
  const items = await getBusinessInventory(businessId);
  const cleanQuery = itemName.trim().toLowerCase();
  
  // Find matching inventory item (exact name match or substring match, e.g. "maggie", "parle")
  let matchedItem = items.find(
    (i) => i.item_name.trim().toLowerCase() === cleanQuery
  );

  if (!matchedItem) {
    matchedItem = items.find(
      (i) =>
        i.item_name.toLowerCase().includes(cleanQuery) ||
        cleanQuery.includes(i.item_name.toLowerCase())
    );
  }

  if (!matchedItem) {
    // If item doesn't exist yet, auto-create it with stock so sales also build inventory
    const autoCreated = await addOrUpdateInventoryItem({
      business_id: businessId,
      item_name: itemName.trim(),
      unit_price: 20,
      quantity_in_stock: Math.max(0, 20 - Math.abs(soldQuantity)),
      min_stock_alert: 5,
      category: 'Food & Retail',
    });
    return { matched: true, item: autoCreated, remainingStock: autoCreated.quantity_in_stock };
  }

  const newStock = Math.max(0, matchedItem.quantity_in_stock - Math.abs(soldQuantity));
  const updated = await addOrUpdateInventoryItem({
    ...matchedItem,
    quantity_in_stock: newStock,
  });

  return { matched: true, item: updated, remainingStock: newStock };
}

export async function getInventorySummary(businessId: string): Promise<InventorySummary> {
  const items = await getBusinessInventory(businessId);
  const todayStr = new Date().toISOString().split('T')[0];
  const in15DaysStr = new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0];

  let totalStockQuantity = 0;
  let totalInventoryValue = 0;
  let lowStockCount = 0;
  let expiringSoonCount = 0;
  let expiredCount = 0;

  items.forEach((item) => {
    const qty = Number(item.quantity_in_stock) || 0;
    const price = Number(item.unit_price) || 0;
    totalStockQuantity += qty;
    totalInventoryValue += qty * price;

    if (qty <= (item.min_stock_alert ?? 5)) {
      lowStockCount++;
    }

    if (item.expiry_date) {
      if (item.expiry_date < todayStr) {
        expiredCount++;
      } else if (item.expiry_date <= in15DaysStr) {
        expiringSoonCount++;
      }
    }
  });

  return {
    totalItems: items.length,
    totalStockQuantity,
    totalInventoryValue,
    lowStockCount,
    expiringSoonCount,
    expiredCount,
  };
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
  inMemoryDB.saveToDisk();
}

// ── CUSTOMER (UDHAAR) MANAGEMENT ─────────────────────────────────────────────

export async function findOrCreateCustomer(
  businessId: string,
  name: string,
  phone?: string
): Promise<{ customer: Customer; isNew: boolean; existingBalance: number }> {
  const cleanName = name.trim();
  const now = new Date().toISOString();

  // Fuzzy match: exact first, then substring
  const existing = Array.from(inMemoryDB.customers.values()).find(
    (c) =>
      c.business_id === businessId &&
      (c.name.toLowerCase() === cleanName.toLowerCase() ||
        c.name.toLowerCase().includes(cleanName.toLowerCase()) ||
        cleanName.toLowerCase().includes(c.name.toLowerCase()))
  );

  if (existing) {
    return { customer: existing, isNew: false, existingBalance: existing.balance_due };
  }

  const customer: Customer = {
    id: crypto.randomUUID(),
    business_id: businessId,
    name: cleanName,
    phone: phone || null,
    balance_due: 0,
    total_udhaar_given: 0,
    total_paid_back: 0,
    oldest_unpaid_since: null,
    created_at: now,
    updated_at: now,
  };

  inMemoryDB.customers.set(customer.id, customer);
  inMemoryDB.saveToDisk();

  return { customer, isNew: true, existingBalance: 0 };
}

export async function getCustomersByBusiness(businessId: string): Promise<Customer[]> {
  return Array.from(inMemoryDB.customers.values())
    .filter((c) => c.business_id === businessId)
    .sort((a, b) => b.balance_due - a.balance_due);
}

export async function getCustomerById(customerId: string): Promise<Customer | null> {
  return inMemoryDB.customers.get(customerId) || null;
}

export async function recordUdhaar(
  businessId: string,
  customerId: string,
  amount: number,
  description?: string,
  transactionId?: string
): Promise<{ customer: Customer; ledgerEntry: CustomerLedgerEntry }> {
  const now = new Date().toISOString();
  const todayStr = now.split('T')[0];
  const customer = inMemoryDB.customers.get(customerId);
  if (!customer) throw new Error(`Customer ${customerId} not found`);

  const entry: CustomerLedgerEntry = {
    id: crypto.randomUUID(),
    customer_id: customerId,
    business_id: businessId,
    type: 'udhaar',
    amount,
    description: description || null,
    transaction_id: transactionId || null,
    date: todayStr,
    created_at: now,
  };

  const updatedCustomer: Customer = {
    ...customer,
    balance_due: customer.balance_due + amount,
    total_udhaar_given: customer.total_udhaar_given + amount,
    oldest_unpaid_since: customer.oldest_unpaid_since || todayStr,
    updated_at: now,
  };

  inMemoryDB.customerLedger.set(entry.id, entry);
  inMemoryDB.customers.set(customerId, updatedCustomer);
  inMemoryDB.saveToDisk();

  return { customer: updatedCustomer, ledgerEntry: entry };
}

export async function recordPayment(
  businessId: string,
  customerId: string,
  amount: number,
  description?: string
): Promise<{ customer: Customer; ledgerEntry: CustomerLedgerEntry; cleared: boolean; overpayment: number }> {
  const now = new Date().toISOString();
  const todayStr = now.split('T')[0];
  const customer = inMemoryDB.customers.get(customerId);
  if (!customer) throw new Error(`Customer ${customerId} not found`);

  // Guard against overpayment
  const payAmount = Math.min(amount, customer.balance_due);
  const overpayment = amount - payAmount;

  const entry: CustomerLedgerEntry = {
    id: crypto.randomUUID(),
    customer_id: customerId,
    business_id: businessId,
    type: 'payment',
    amount: payAmount,
    description: description || null,
    transaction_id: null,
    date: todayStr,
    created_at: now,
  };

  const newBalance = Math.max(0, customer.balance_due - payAmount);
  const cleared = newBalance === 0;

  const updatedCustomer: Customer = {
    ...customer,
    balance_due: newBalance,
    total_paid_back: customer.total_paid_back + payAmount,
    oldest_unpaid_since: cleared ? null : customer.oldest_unpaid_since,
    updated_at: now,
  };

  inMemoryDB.customerLedger.set(entry.id, entry);
  inMemoryDB.customers.set(customerId, updatedCustomer);
  inMemoryDB.saveToDisk();

  return { customer: updatedCustomer, ledgerEntry: entry, cleared, overpayment };
}

export async function getCustomerLedger(
  customerId: string,
  businessId: string
): Promise<CustomerLedgerEntry[]> {
  return Array.from(inMemoryDB.customerLedger.values())
    .filter((e) => e.customer_id === customerId && e.business_id === businessId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

// ── PROFIT MARGIN REPORTING ──────────────────────────────────────────────────

export type ProfitPeriod = 'today' | 'week' | 'month' | 'all';

export interface ProductProfitRow {
  item: string;
  revenue: number;
  totalCost: number;
  profit: number;
  marginPct: number | null; // null = cost data unavailable
  unitsSold: number;
  hasCostData: boolean;
}

export interface ProfitReport {
  period: ProfitPeriod;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  overallMarginPct: number | null;
  hasCostData: boolean;
  topByProfit: ProductProfitRow[];
  bottomByMargin: ProductProfitRow[];
  allProducts: ProductProfitRow[];
}

export async function getProfitReport(
  businessId: string,
  period: ProfitPeriod = 'all'
): Promise<ProfitReport> {
  const txs = await getBusinessTransactions(businessId);
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  const filterTx = (tx: Transaction) => {
    if (tx.transaction_type !== 'sale') return false;
    const d = tx.transaction_date;
    if (period === 'today') return d === todayStr;
    if (period === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString().split('T')[0];
      return d >= weekAgo;
    }
    if (period === 'month') {
      const monthAgo = new Date(now.getTime() - 30 * 86400000).toISOString().split('T')[0];
      return d >= monthAgo;
    }
    return true;
  };

  const saleTxs = txs.filter(filterTx);

  const productMap: Record<
    string,
    { revenue: number; totalCost: number; unitsSold: number; hasCostData: boolean }
  > = {};

  for (const tx of saleTxs) {
    const key = tx.item?.trim() || 'Unknown';
    if (!productMap[key]) {
      productMap[key] = { revenue: 0, totalCost: 0, unitsSold: 0, hasCostData: false };
    }
    const qty = Number(tx.quantity) || 1;
    const amt = Number(tx.amount) || 0;
    productMap[key].revenue += amt;
    productMap[key].unitsSold += qty;

    if (tx.unit_cost_at_sale != null && tx.unit_cost_at_sale > 0) {
      productMap[key].totalCost += tx.unit_cost_at_sale * qty;
      productMap[key].hasCostData = true;
    }
  }

  const rows: ProductProfitRow[] = Object.entries(productMap).map(([item, d]) => {
    const profit = d.hasCostData ? d.revenue - d.totalCost : 0;
    const marginPct =
      d.hasCostData && d.revenue > 0
        ? Math.round((profit / d.revenue) * 10000) / 100
        : null;
    return {
      item,
      revenue: d.revenue,
      totalCost: d.totalCost,
      profit,
      marginPct,
      unitsSold: d.unitsSold,
      hasCostData: d.hasCostData,
    };
  });

  const totalRevenue = rows.reduce((s, r) => s + r.revenue, 0);
  const totalCost = rows.reduce((s, r) => s + r.totalCost, 0);
  const totalProfit = rows.reduce((s, r) => s + r.profit, 0);
  const hasCostData = rows.some((r) => r.hasCostData);
  const overallMarginPct =
    hasCostData && totalRevenue > 0
      ? Math.round((totalProfit / totalRevenue) * 10000) / 100
      : null;

  const sorted = [...rows].sort((a, b) => b.profit - a.profit);
  const topByProfit = sorted.slice(0, 5);
  const withMargin = rows.filter((r) => r.marginPct !== null).sort((a, b) => (a.marginPct ?? 0) - (b.marginPct ?? 0));
  const bottomByMargin = withMargin.slice(0, 5);

  return {
    period,
    totalRevenue,
    totalCost,
    totalProfit,
    overallMarginPct,
    hasCostData,
    topByProfit,
    bottomByMargin,
    allProducts: rows,
  };
}

