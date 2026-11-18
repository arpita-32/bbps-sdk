import React, { useState } from 'react';
import { Download, Printer, X } from 'lucide-react';
import { HostTheme, TransactionRecord } from '../types/sdk';
import { BAssuredLogo } from './BrandAssets';
import { downloadDigitalReceipt, formatCurrency } from '../utils/receipt';

interface ReceiptModalProps {
  transaction: TransactionRecord;
  theme: HostTheme;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  transaction,
  theme,
  onClose,
}) => {
  const [formatView, setFormatView] = useState<'digital' | 'paper'>('digital');
  const isSuccess = transaction.status === 'Success';

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Payment Receipt Preview"
    >
      <div className="bg-white rounded-xl border border-slate-200 max-w-2xl w-full shadow-xl overflow-hidden my-auto">
        {/* Top Modal Controls */}
        <div className="px-4 sm:px-6 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg">
            <button
              type="button"
              onClick={() => setFormatView('digital')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                formatView === 'digital' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Online (Digital) Receipt
            </button>
            <button
              type="button"
              onClick={() => setFormatView('paper')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                formatView === 'paper' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Paper (A4 Physical) Receipt
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => downloadDigitalReceipt(transaction, theme)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-white cursor-pointer"
              style={{ backgroundColor: theme.primaryColor }}
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </button>
            {formatView === 'paper' && (
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print A4</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close receipt preview"
              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200/70 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Receipt Body */}
        <div className="p-4 sm:p-6 max-h-[75vh] overflow-y-auto bg-slate-100/70">
          {formatView === 'digital' ? (
            /* Digital Receipt: B Assured in TOP LEFT-HAND corner (if Success) */
            <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4">
                <div>
                  {isSuccess ? (
                    <BAssuredLogo heightPx={36} />
                  ) : (
                    <div className="text-xs font-semibold text-slate-500">
                      Bharat Connect Transaction Receipt
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="font-display font-bold text-sm" style={{ color: theme.primaryColor }}>
                    {theme.bankName}
                  </div>
                  <div className="text-xs text-slate-500">Digital Receipt</div>
                </div>
              </div>

              <div>
                <h3 className="font-display font-bold text-base text-slate-900">
                  Bharat Connect - Payment Confirmation
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Status:{' '}
                  <span
                    className={`font-semibold ${
                      isSuccess
                        ? 'text-emerald-700'
                        : transaction.status === 'Failed'
                          ? 'text-red-700'
                          : 'text-amber-700'
                    }`}
                  >
                    {transaction.status.toUpperCase()}
                  </span>
                </p>
              </div>

              <div className="divide-y divide-slate-100 text-xs sm:text-sm">
                <ReceiptRow label="B-Connect Txn ID" value={transaction.bConnectTxnId} mono />
                <ReceiptRow label="Transaction Reference No" value={transaction.txnRefId} mono />
                <ReceiptRow label="Biller Name" value={transaction.billerName} />
                <ReceiptRow label="Subscriber / Consumer No" value={transaction.subscriberNumber} mono />
                <ReceiptRow label="Bill Number" value={transaction.billNumber} mono />
                <ReceiptRow label="Bill Date" value={transaction.billDate} />
                <ReceiptRow label="Due Date" value={transaction.dueDate} />
                <ReceiptRow label="Bill Amount" value={formatCurrency(transaction.billAmount)} mono />
                <ReceiptRow
                  label="Consumer Convenience Fee (CCF)"
                  value={formatCurrency(transaction.ccf)}
                  mono
                />
                <ReceiptRow
                  label="Total Amount"
                  value={formatCurrency(transaction.totalAmount)}
                  mono
                  bold
                />
                <ReceiptRow label="Payment Mode" value={transaction.paymentMethod} />
                <ReceiptRow label="Payment Channel" value={transaction.paymentChannel} />
                <ReceiptRow label="Transaction Date & Time" value={transaction.txnDateTime} />
              </div>

              <div className="pt-4 border-t border-slate-200 text-center text-xs text-slate-500 space-y-1">
                <div className="font-medium text-slate-700">
                  {theme.bankName} · Toll Free: {theme.supportTollFree} · {theme.supportWebsite}
                </div>
                <div>Computer-generated receipt. No signature required.</div>
              </div>
            </div>
          ) : (
            /* Paper A4 Physical Receipt: B Assured in TOP RIGHT-HAND corner (30 mm height on 210 mm A4) */
            <div
              id="printable-paper-receipt"
              className="bg-white border border-slate-300 p-6 sm:p-8 mx-auto shadow-xs"
              style={{ maxWidth: '640px' }}
            >
              <div className="flex items-start justify-between gap-4 border-b-2 border-slate-800 pb-4 mb-5">
                <div>
                  <div className="font-display font-bold text-base text-slate-900">
                    {theme.bankName}
                  </div>
                  <div className="text-xs text-slate-600 mt-0.5">
                    Assisted / Retail Channel Receipt · A4 Format (210 mm)
                  </div>
                  <div className="font-display font-bold text-sm text-slate-900 mt-3">
                    Bharat Connect - Payment Confirmation
                  </div>
                </div>
                <div className="text-right shrink-0">
                  {isSuccess ? (
                    <div className="flex flex-col items-end">
                      {/* Scaled proportionally to represent 30mm height on 210mm A4 (~14.3% of sheet height / ~72px on 640px preview) */}
                      <BAssuredLogo heightPx={56} />
                      <span className="text-[11px] text-slate-500 mt-1">
                        Print spec: Top-Right · 30 mm height
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs font-semibold text-slate-500">
                      Status: {transaction.status.toUpperCase()}
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 text-xs border-b border-slate-200 pb-4 mb-4">
                <ReceiptRow label="B-Connect Txn ID" value={transaction.bConnectTxnId} mono compact />
                <ReceiptRow label="Transaction Ref No" value={transaction.txnRefId} mono compact />
                <ReceiptRow label="Biller Name" value={transaction.billerName} compact />
                <ReceiptRow label="Subscriber No" value={transaction.subscriberNumber} mono compact />
                <ReceiptRow label="Bill Number" value={transaction.billNumber} mono compact />
                <ReceiptRow label="Bill Date / Due Date" value={`${transaction.billDate} · ${transaction.dueDate}`} compact />
                <ReceiptRow label="Bill Amount" value={formatCurrency(transaction.billAmount)} mono compact />
                <ReceiptRow label="Consumer Convenience Fee (CCF)" value={formatCurrency(transaction.ccf)} mono compact />
                <ReceiptRow label="Total Amount" value={formatCurrency(transaction.totalAmount)} mono bold compact />
                <ReceiptRow label="Payment Mode & Channel" value={`${transaction.paymentMethod} · ${transaction.paymentChannel}`} compact />
                <ReceiptRow label="Date & Time" value={transaction.txnDateTime} compact />
                <ReceiptRow label="Status" value={transaction.status.toUpperCase()} bold compact />
              </div>

              <div className="text-center text-xs text-slate-600 space-y-1">
                <div className="font-semibold text-slate-800">
                  Customer Support: {theme.bankName} · Toll Free {theme.supportTollFree} · {theme.supportWebsite}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ReceiptRow: React.FC<{
  label: string;
  value: string;
  mono?: boolean;
  bold?: boolean;
  compact?: boolean;
}> = ({ label, value, mono, bold, compact }) => (
  <div className={`flex items-center justify-between gap-4 ${compact ? 'py-1' : 'py-2.5'}`}>
    <span className="text-slate-500">{label}</span>
    <span
      className={`text-right text-slate-900 ${mono ? 'font-mono-tabular' : ''} ${
        bold ? 'font-bold' : 'font-medium'
      }`}
    >
      {value}
    </span>
  </div>
);
