import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Transaction } from '@/lib/types';

/**
 * Exports transactions to a formatted Excel (.xlsx) file.
 * Scoped strictly to the active business workspace.
 */
export function exportToExcel(transactions: Transaction[], businessName: string = 'Business') {
  const sanitizeName = businessName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `${sanitizeName}_Financial_Ledger_${dateStr}.xlsx`;

  // Map transaction rows into clean column structure
  const rows = transactions.map((tx, idx) => ({
    'S.No': idx + 1,
    'Date': tx.transaction_date,
    'Type': tx.transaction_type.toUpperCase(),
    'Item Name': tx.item,
    'Quantity': tx.quantity || 1,
    'Category': tx.category || 'General',
    'Customer / Supplier': tx.customer_name || tx.supplier_name || '-',
    'Amount (INR)': Number(tx.amount || 0),
    'Payment Status': (tx.payment_status || 'paid').toUpperCase(),
    'Description': tx.description || '',
    'Source': tx.source || 'telegram',
    'Transaction ID': tx.id,
  }));

  // Create worksheet & workbook
  const worksheet = XLSX.utils.json_to_sheet(rows);

  // Set column widths for readability
  worksheet['!cols'] = [
    { wch: 6 },  // S.No
    { wch: 12 }, // Date
    { wch: 12 }, // Type
    { wch: 24 }, // Item Name
    { wch: 8 },  // Qty
    { wch: 16 }, // Category
    { wch: 20 }, // Party
    { wch: 14 }, // Amount
    { wch: 14 }, // Status
    { wch: 25 }, // Description
    { wch: 12 }, // Source
    { wch: 32 }, // ID
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Ledger Transactions');

  // Trigger browser file download
  XLSX.writeFile(workbook, filename);
}

/**
 * Exports transactions and summary financial metrics into a branded PDF report.
 * Scoped strictly to the active business workspace.
 */
export function exportToPDF(
  transactions: Transaction[],
  metrics: any,
  businessName: string = 'Business',
  currency: string = 'INR'
) {
  const sanitizeName = businessName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `${sanitizeName}_Financial_Report_${dateStr}.pdf`;
  const currSymbol = currency === 'INR' ? 'Rs. ' : '$';

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // 1. Header Banner
  doc.setFillColor(15, 23, 42); // slate-900 dark background banner
  doc.rect(0, 0, 210, 38, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(businessName.toUpperCase(), 14, 16);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text('AUTOMATED FINANCIAL LEDGER & TRANSACTION REPORT', 14, 23);
  doc.text(`Generated on: ${new Date().toLocaleDateString('en-IN', { dateStyle: 'full' })}`, 14, 29);

  // 2. Financial Metrics Summary Cards Box
  doc.setFillColor(248, 250, 252); // slate-50 background
  doc.setDrawColor(226, 232, 240); // slate-200 border
  doc.roundedRect(14, 43, 182, 28, 3, 3, 'FD');

  const totalSales = metrics?.totalSales || 0;
  const totalExpenses = metrics?.totalExpenses || 0;
  const netCashFlow = metrics?.netCashFlow || (totalSales - totalExpenses);
  const txCount = transactions.length;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');

  // Column 1: Total Sales
  doc.setTextColor(16, 185, 129); // emerald green
  doc.text('TOTAL SALES', 20, 52);
  doc.setFontSize(12);
  doc.text(`${currSymbol}${totalSales.toLocaleString('en-IN')}`, 20, 60);

  // Column 2: Total Expenses
  doc.setFontSize(9);
  doc.setTextColor(244, 63, 94); // rose red
  doc.text('TOTAL EXPENSES', 70, 52);
  doc.setFontSize(12);
  doc.text(`${currSymbol}${totalExpenses.toLocaleString('en-IN')}`, 70, 60);

  // Column 3: Net Cash Flow
  doc.setFontSize(9);
  doc.setTextColor(99, 102, 241); // indigo
  doc.text('NET CASH FLOW', 120, 52);
  doc.setFontSize(12);
  doc.text(`${currSymbol}${netCashFlow.toLocaleString('en-IN')}`, 120, 60);

  // Column 4: Total Transactions
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105); // slate-600
  doc.text('TRANSACTIONS', 165, 52);
  doc.setFontSize(12);
  doc.text(`${txCount} Rows`, 165, 60);

  // 3. Transactions Table
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Transaction Ledger Detail', 14, 79);

  const tableData = transactions.map((tx) => [
    tx.transaction_date,
    tx.transaction_type.toUpperCase(),
    tx.item,
    tx.quantity || 1,
    tx.category || 'General',
    tx.customer_name || tx.supplier_name || '-',
    `${currSymbol}${Number(tx.amount || 0).toLocaleString('en-IN')}`,
    (tx.payment_status || 'paid').toUpperCase(),
  ]);

  autoTable(doc, {
    startY: 83,
    head: [['Date', 'Type', 'Item Name', 'Qty', 'Category', 'Party', 'Amount', 'Status']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'left',
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [51, 65, 85],
    },
    columnStyles: {
      0: { cellWidth: 22 }, // Date
      1: { cellWidth: 20 }, // Type
      2: { cellWidth: 40 }, // Item
      3: { cellWidth: 12 }, // Qty
      4: { cellWidth: 26 }, // Category
      5: { cellWidth: 26 }, // Party
      6: { cellWidth: 22, halign: 'right', fontStyle: 'bold' }, // Amount
      7: { cellWidth: 16, halign: 'center' }, // Status
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    didDrawPage: (data) => {
      // Footer on every page
      const pageCount = doc.getNumberOfPages();
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(148, 163, 184);
      doc.text(
        `AutoLedger SaaS - Confidential Report for ${businessName} | Page ${data.pageNumber} of ${pageCount}`,
        14,
        287
      );
    },
  });

  // Save the PDF
  doc.save(filename);
}
