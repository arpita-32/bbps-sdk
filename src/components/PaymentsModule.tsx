import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  MoreVertical,
  Search,
  X,
  XCircle,
} from 'lucide-react';
import {
  HostTheme,
  PaymentStatus,
  SdkLanguage,
  TransactionRecord,
  ViewportMode,
} from '../types/sdk';
import { TRANSLATIONS } from '../i18n/translations';
import { BAssuredLogo, BharatConnectHorizontalLogo } from './BrandAssets';
import { ReceiptModal } from './ReceiptModal';
import { downloadDigitalReceipt, formatCurrency, maskSensitiveValue } from '../utils/receipt';

interface PaymentsModuleProps {
  theme: HostTheme;
  language: SdkLanguage;
  viewport: ViewportMode;
  transactions: TransactionRecord[];
  onRepeatPayment: (txn: TransactionRecord) => void;
  onRaiseComplaintFromTxn: (txn: TransactionRecord) => void;
}

export const PaymentsModule: React.FC<PaymentsModuleProps> = ({
  theme,
  language,
  viewport,
  transactions,
  onRepeatPayment,
  onRaiseComplaintFromTxn,
}) => {
  const t = TRANSLATIONS[language];
  const isMobile = viewport === 'mobile';

  const [subTab, setSubTab] = useState<'history' | 'status-query'>('history');

  // History filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | PaymentStatus>('All');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [appliedRange, setAppliedRange] = useState<{ from: string; to: string } | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);

  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // View Details & Receipt
  const [detailTxn, setDetailTxn] = useState<TransactionRecord | null>(null);
  const [receiptTxn, setReceiptTxn] = useState<TransactionRecord | null>(null);

  // Status Query form
  const [queryMobile, setQueryMobile] = useState('');
  const [queryFrom, setQueryFrom] = useState('');
  const [queryTo, setQueryTo] = useState('');
  const [queryTxnRef, setQueryTxnRef] = useState('');
  const [queryError, setQueryError] = useState<string | null>(null);
  const [queryResults, setQueryResults] = useState<TransactionRecord[] | null>(null);

  const handleApplyDateFilter = () => {
    setDateError(null);
    if (!fromDate && toDate) {
      setDateError('Select From date');
      return;
    }
    if (fromDate && toDate && toDate < fromDate) {
      setDateError('To date cannot be before From date');
      return;
    }
    if (fromDate && toDate) {
      const diffDays =
        (new Date(toDate).getTime() - new Date(fromDate).getTime()) / (1000 * 60 * 60 * 24);
      if (diffDays > 180) {
        setDateError('Select a range within the allowed period');
        return;
      }
      setAppliedRange({ from: fromDate, to: toDate });
    } else {
      setAppliedRange(null);
    }
    setCurrentPage(1);
  };

  const filteredTxns = useMemo(() => {
    return transactions.filter((tx) => {
      if (statusFilter !== 'All' && tx.status !== statusFilter) return false;
      if (appliedRange) {
        if (tx.txnDateIso < appliedRange.from || tx.txnDateIso > appliedRange.to) return false;
      }
      const q = searchQuery.trim().toLowerCase();
      if (q) {
        const matchBiller = tx.billerName.toLowerCase().includes(q);
        const matchAccount = tx.subscriberNumber.toLowerCase().includes(q) || tx.maskedAccount.toLowerCase().includes(q);
        if (!matchBiller && !matchAccount) return false;
      }
      return true;
    });
  }, [transactions, statusFilter, appliedRange, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredTxns.length / rowsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedTxns = filteredTxns.slice(
    (safePage - 1) * rowsPerPage,
    safePage * rowsPerPage
  );

  const handleStatusQuerySubmit = () => {
    setQueryError(null);
    const hasMobile = queryMobile.trim().length > 0;
    const hasRef = queryTxnRef.trim().length > 0;

    if (!hasMobile && !hasRef) {
      setQueryError('Enter mobile number or transaction reference ID');
      setQueryResults(null);
      return;
    }

    if (hasRef) {
      const matches = transactions.filter(
        (tx) =>
          tx.txnRefId.toLowerCase() === queryTxnRef.trim().toLowerCase() ||
          tx.bConnectTxnId.toLowerCase() === queryTxnRef.trim().toLowerCase()
      );
      setQueryResults(matches);
      return;
    }

    if (queryFrom && queryTo && queryTo < queryFrom) {
      setQueryError('To date cannot be before From date');
      return;
    }

    const matches = transactions.filter((tx) => {
      if (tx.mobileNumber !== queryMobile.trim()) return false;
      if (queryFrom && tx.txnDateIso < queryFrom) return false;
      if (queryTo && tx.txnDateIso > queryTo) return false;
      return true;
    });
    setQueryResults(matches);
  };

  return (
    <div className="space-y-5">
      {/* Sub-navigation: Recent Transactions vs Transaction Status Query */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg">
          <button
            type="button"
            onClick={() => setSubTab('history')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              subTab === 'history' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t.recentTransactions}
          </button>
          <button
            type="button"
            onClick={() => setSubTab('status-query')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              subTab === 'status-query' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Transaction Status Query
          </button>
        </div>
      </div>

      {subTab === 'history' ? (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {/* Filter Bar */}
          <div className="p-4 border-b border-slate-200 space-y-3">
            <div className={`flex gap-3 ${isMobile ? 'flex-col' : 'items-center justify-between flex-wrap'}`}>
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Search biller or account number..."
                  className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg"
                />
              </div>

              {/* Status Filter Segmented Buttons */}
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto">
                {(['All', 'Success', 'Failed', 'Pending'] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => {
                      setStatusFilter(st);
                      setCurrentPage(1);
                    }}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md whitespace-nowrap shrink-0 cursor-pointer ${
                      statusFilter === st
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Date Range Filter */}
            <div className="flex flex-wrap items-end gap-2.5 text-xs">
              <div>
                <label className="block text-slate-500 mb-1">From Date</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                />
              </div>
              <div>
                <label className="block text-slate-500 mb-1">To Date</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                />
              </div>
              <button
                type="button"
                onClick={handleApplyDateFilter}
                className="px-3.5 py-1.5 text-xs font-semibold text-white rounded-lg cursor-pointer"
                style={{ backgroundColor: theme.primaryColor }}
              >
                {t.submit}
              </button>
              {appliedRange && (
                <button
                  type="button"
                  onClick={() => {
                    setFromDate('');
                    setToDate('');
                    setAppliedRange(null);
                    setDateError(null);
                  }}
                  className="px-2.5 py-1.5 text-xs font-medium text-slate-600 underline cursor-pointer"
                >
                  Reset Dates
                </button>
              )}
              <div className="ml-auto flex items-center gap-2">
                <label htmlFor="txn-rows-select" className="text-slate-500">Rows:</label>
                <select
                  id="txn-rows-select"
                  value={rowsPerPage}
                  onChange={(e) => {
                    setRowsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="border border-slate-300 rounded-md px-2 py-1 text-xs bg-white"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                </select>
              </div>
            </div>

            {dateError && (
              <p className="text-xs font-medium text-red-600 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{dateError}</span>
              </p>
            )}
          </div>

          {/* Transactions Table / Mobile Cards */}
          {filteredTxns.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-500">{t.noTransactionsFound}</div>
          ) : isMobile ? (
            <div className="divide-y divide-slate-200">
              {paginatedTxns.map((tx, idx) => (
                <div key={tx.id} className="p-3.5 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-[11px] text-slate-500 tabular-nums">
                        #{(safePage - 1) * rowsPerPage + idx + 1} · {tx.txnDateTime}
                      </div>
                      <div className="font-semibold text-sm text-slate-900">{tx.billerName}</div>
                      <div className="text-xs text-slate-600 font-mono-tabular">
                        {maskSensitiveValue(tx.subscriberNumber, 4)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono-tabular font-bold text-sm text-slate-900">
                        {formatCurrency(tx.totalAmount)}
                      </div>
                      <TxnStatusChip status={tx.status} />
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 pt-1 text-xs font-medium">
                    <button
                      type="button"
                      onClick={() => setDetailTxn(tx)}
                      className="text-slate-800 underline cursor-pointer"
                    >
                      View Details
                    </button>
                    {tx.status !== 'Pending' && (
                      <button
                        type="button"
                        onClick={() => onRepeatPayment(tx)}
                        className="text-slate-800 underline cursor-pointer"
                      >
                        Repeat Payment
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onRaiseComplaintFromTxn(tx)}
                      className="text-slate-800 underline cursor-pointer"
                    >
                      Raise Complaint
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="overflow-visible">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                    <th className="py-2.5 px-4 w-12">S.No</th>
                    <th className="py-2.5 px-4">Biller</th>
                    <th className="py-2.5 px-4">Account Details</th>
                    <th className="py-2.5 px-4 text-right">Amount</th>
                    <th className="py-2.5 px-4">Date</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {paginatedTxns.map((tx, idx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 text-xs text-slate-500 tabular-nums">
                        {(safePage - 1) * rowsPerPage + idx + 1}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-900">{tx.billerName}</td>
                      <td className="py-3 px-4 text-xs font-mono-tabular text-slate-600">
                        {maskSensitiveValue(tx.subscriberNumber, 4)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono-tabular font-semibold text-slate-900">
                        {formatCurrency(tx.totalAmount)}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600 tabular-nums">
                        {tx.txnDateTime}
                      </td>
                      <td className="py-3 px-4">
                        <TxnStatusChip status={tx.status} />
                      </td>
                      <td className="py-3 px-4 text-right relative">
                        <button
                          type="button"
                          aria-label={`Actions for ${tx.txnRefId}`}
                          onClick={() =>
                            setOpenMenuId((prev) => (prev === tx.id ? null : tx.id))
                          }
                          className="p-1.5 rounded-md border border-slate-200 hover:bg-slate-100 text-slate-600 cursor-pointer"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        {openMenuId === tx.id && (
                          <div className="absolute right-4 mt-1 w-44 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-30 text-left">
                            {tx.status !== 'Pending' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuId(null);
                                  onRepeatPayment(tx);
                                }}
                                className="w-full px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 text-left cursor-pointer"
                              >
                                Repeat Payment
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setOpenMenuId(null);
                                onRaiseComplaintFromTxn(tx);
                              }}
                              className="w-full px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 text-left cursor-pointer"
                            >
                              Raise Complaint
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setOpenMenuId(null);
                                setDetailTxn(tx);
                              }}
                              className="w-full px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 text-left cursor-pointer"
                            >
                              View Details
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Footer */}
          {filteredTxns.length > 0 && (
            <div className="px-4 py-2.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-600">
              <span className="tabular-nums">
                {(safePage - 1) * rowsPerPage + 1}-
                {Math.min(safePage * rowsPerPage, filteredTxns.length)} of {filteredTxns.length}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={safePage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="p-1.5 rounded border border-slate-300 bg-white disabled:opacity-40 cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  disabled={safePage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="p-1.5 rounded border border-slate-300 bg-white disabled:opacity-40 cursor-pointer"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* TRANSACTION STATUS QUERY SCREEN */
        <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-6 space-y-5">
          <div>
            <h2 className="font-display font-semibold text-base text-slate-900">
              Transaction Status Query
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Search by Transaction Reference ID (e.g. TXNREF202506189102) or Mobile Number &amp; Date Range (e.g. 9876543210).
            </p>
          </div>

          <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Transaction Reference ID
              </label>
              <input
                type="text"
                value={queryTxnRef}
                onChange={(e) => setQueryTxnRef(e.target.value)}
                placeholder="e.g. TXNREF202506189102"
                className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg font-mono-tabular"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mobile Number
              </label>
              <input
                type="text"
                value={queryMobile}
                onChange={(e) => setQueryMobile(e.target.value)}
                placeholder="10 digit mobile number"
                className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg font-mono-tabular"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">From Date</label>
              <input
                type="date"
                value={queryFrom}
                onChange={(e) => setQueryFrom(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">To Date</label>
              <input
                type="date"
                value={queryTo}
                onChange={(e) => setQueryTo(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          {queryError && (
            <p className="text-xs font-medium text-red-600 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{queryError}</span>
            </p>
          )}

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleStatusQuerySubmit}
              className="px-5 py-2 text-xs font-semibold text-white rounded-lg cursor-pointer"
              style={{ backgroundColor: theme.primaryColor }}
            >
              {t.submit}
            </button>
          </div>

          {queryResults !== null && (
            <div className="border-t border-slate-200 pt-4 space-y-3">
              <h3 className="font-display font-semibold text-sm text-slate-900">
                Query Results ({queryResults.length})
              </h3>
              {queryResults.length === 0 ? (
                <p className="text-xs text-slate-500">{t.noTransactionsFound}</p>
              ) : (
                <div className="divide-y divide-slate-200 border border-slate-200 rounded-lg">
                  {queryResults.map((tx) => (
                    <div
                      key={tx.id}
                      className="p-3.5 flex flex-wrap items-center justify-between gap-3"
                    >
                      <div>
                        <div className="font-semibold text-sm text-slate-900">{tx.billerName}</div>
                        <div className="text-xs font-mono-tabular text-slate-500">
                          Ref: {tx.txnRefId} · {tx.txnDateTime}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-mono-tabular font-bold text-sm text-slate-900">
                          {formatCurrency(tx.totalAmount)}
                        </span>
                        <TxnStatusChip status={tx.status} />
                        <button
                          type="button"
                          onClick={() => setDetailTxn(tx)}
                          className="text-xs font-semibold underline text-slate-700 cursor-pointer"
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TRANSACTION DETAILS MODAL (Stage 2 Bharat Connect in Header + Stage 3 B Assured ONLY for Success) */}
      {detailTxn && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-label="Transaction Details"
        >
          <div className="bg-white rounded-xl border border-slate-200 max-w-lg w-full shadow-xl overflow-hidden my-auto">
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3">
              <h3 className="font-display font-bold text-sm sm:text-base text-slate-900">
                Transaction Details
              </h3>
              <div className="flex items-center gap-3">
                <BharatConnectHorizontalLogo variant="light" heightPx={22} />
                <button
                  type="button"
                  onClick={() => setDetailTxn(null)}
                  aria-label="Close transaction details"
                  className="p-1 rounded hover:bg-slate-200 text-slate-500 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {detailTxn.status === 'Success' && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                  <span className="text-xs font-bold text-emerald-800">PAYMENT SUCCESSFUL</span>
                  <BAssuredLogo heightPx={32} />
                </div>
              )}

              <div className="divide-y divide-slate-100 text-xs sm:text-sm">
                <Pair label="Biller Name" value={detailTxn.billerName} />
                <Pair
                  label="Subscriber Number"
                  value={maskSensitiveValue(detailTxn.subscriberNumber, 4)}
                  mono
                />
                <Pair label="Payment Status" value={detailTxn.status.toUpperCase()} />
                <Pair label="Biller Status" value={detailTxn.billerStatus} mono />
                <Pair label="Payment Amount" value={formatCurrency(detailTxn.billAmount)} mono />
                <Pair
                  label="Consumer Convenience Fee (CCF)"
                  value={formatCurrency(detailTxn.ccf)}
                  mono
                />
                <Pair label="Total Amount" value={formatCurrency(detailTxn.totalAmount)} mono />
                <Pair label="Transaction Date & Time" value={detailTxn.txnDateTime} />
                <Pair label="B-Connect Txn ID" value={detailTxn.bConnectTxnId} mono />
                <Pair label="Transaction Reference No" value={detailTxn.txnRefId} mono />
                <Pair label="Payment Type" value={detailTxn.paymentType} />
                <Pair label="Payment Method" value={detailTxn.paymentMethod} />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    const tx = detailTxn;
                    setDetailTxn(null);
                    setReceiptTxn(tx);
                  }}
                  className="px-3.5 py-2 text-xs font-semibold border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Preview Receipt
                </button>
                <button
                  type="button"
                  onClick={() => downloadDigitalReceipt(detailTxn, theme)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white rounded-lg cursor-pointer"
                  style={{ backgroundColor: theme.primaryColor }}
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{t.download}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {receiptTxn && (
        <ReceiptModal
          transaction={receiptTxn}
          theme={theme}
          onClose={() => setReceiptTxn(null)}
        />
      )}
    </div>
  );
};

export const TxnStatusChip: React.FC<{ status: PaymentStatus }> = ({ status }) => {
  if (status === 'Success') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
        <span>SUCCESS</span>
      </span>
    );
  }
  if (status === 'Failed') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700">
        <XCircle className="w-3.5 h-3.5 shrink-0" />
        <span>FAILED</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700">
      <Clock className="w-3.5 h-3.5 shrink-0" />
      <span>PENDING</span>
    </span>
  );
};

const Pair: React.FC<{ label: string; value: string; mono?: boolean }> = ({
  label,
  value,
  mono,
}) => (
  <div className="flex items-center justify-between gap-4 py-2">
    <span className="text-slate-500">{label}</span>
    <span className={`text-right font-medium text-slate-900 ${mono ? 'font-mono-tabular' : ''}`}>
      {value}
    </span>
  </div>
);
