import { google } from 'googleapis';
import { Transaction, GoogleConnection } from '../types';
import { getGoogleConnection, logSyncStatus } from '../db';

const clientId = process.env.GOOGLE_CLIENT_ID || '';
const clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const redirectUri = `${appUrl}/api/google/callback`;

export function getGoogleOAuthClient() {
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export function generateGoogleAuthUrl(businessId: string): string {
  const isRealClientId =
    Boolean(clientId) &&
    clientId.endsWith('.apps.googleusercontent.com') &&
    !clientId.startsWith('demo');

  if (!isRealClientId) {
    return `/api/google/callback?state=${businessId}&code=demo_code`;
  }

  const oauth2Client = getGoogleOAuthClient();
  const scopes = [
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive.file',
  ];

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: scopes,
    state: businessId,
  });
}

export async function createBusinessSpreadsheet(
  authClient: any,
  businessName: string
): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  const sheets = google.sheets({ version: 'v4', auth: authClient });

  const response = await sheets.spreadsheets.create({
    requestBody: {
      properties: {
        title: `Bookkeeping Ledger - ${businessName}`,
      },
      sheets: [
        {
          properties: {
            title: 'Transactions',
            gridProperties: {
              frozenRowCount: 1,
            },
          },
          data: [
            {
              startRow: 0,
              startColumn: 0,
              rowData: [
                {
                  values: [
                    { userEnteredValue: { stringValue: 'Date' } },
                    { userEnteredValue: { stringValue: 'Transaction Type' } },
                    { userEnteredValue: { stringValue: 'Item' } },
                    { userEnteredValue: { stringValue: 'Amount' } },
                    { userEnteredValue: { stringValue: 'Currency' } },
                    { userEnteredValue: { stringValue: 'Quantity' } },
                    { userEnteredValue: { stringValue: 'Category' } },
                    { userEnteredValue: { stringValue: 'Customer' } },
                    { userEnteredValue: { stringValue: 'Supplier' } },
                    { userEnteredValue: { stringValue: 'Payment Status' } },
                    { userEnteredValue: { stringValue: 'Description' } },
                    { userEnteredValue: { stringValue: 'Transaction ID' } },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  });

  const spreadsheetId = response.data.spreadsheetId || '';
  const spreadsheetUrl = response.data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  return { spreadsheetId, spreadsheetUrl };
}

export async function syncTransactionToGoogleSheet(
  transaction: Transaction
): Promise<{ success: boolean; error?: string }> {
  const conn = await getGoogleConnection(transaction.business_id);
  if (!conn || conn.status !== 'active' || !conn.spreadsheet_id) {
    await logSyncStatus(
      transaction.id,
      transaction.business_id,
      'failed',
      'Google Sheets integration not connected'
    );
    return { success: false, error: 'Google Sheets not connected for this business.' };
  }

  // If in demo/mock mode or no real tokens, log successful simulation
  if (!conn.refresh_token || conn.refresh_token.includes('mock') || !clientId) {
    console.log(`[Google Sheets Mock Sync] Transaction ${transaction.id} appended to sheet ${conn.spreadsheet_id}`);
    await logSyncStatus(transaction.id, transaction.business_id, 'success');
    return { success: true };
  }

  try {
    const oauth2Client = getGoogleOAuthClient();
    oauth2Client.setCredentials({
      access_token: conn.access_token,
      refresh_token: conn.refresh_token,
    });

    const sheets = google.sheets({ version: 'v4', auth: oauth2Client });

    const rowValues = [
      transaction.transaction_date,
      transaction.transaction_type.toUpperCase(),
      transaction.item,
      transaction.amount,
      transaction.currency,
      transaction.quantity,
      transaction.category,
      transaction.customer_name || '-',
      transaction.supplier_name || '-',
      transaction.payment_status.toUpperCase(),
      transaction.description || '-',
      transaction.id,
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: conn.spreadsheet_id,
      range: 'Transactions!A:L',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [rowValues],
      },
    });

    await logSyncStatus(transaction.id, transaction.business_id, 'success');
    return { success: true };
  } catch (err: any) {
    console.error(`Google Sheets Sync Error for Business ${transaction.business_id}:`, err);
    await logSyncStatus(transaction.id, transaction.business_id, 'failed', err.message);
    return { success: false, error: err.message };
  }
}
