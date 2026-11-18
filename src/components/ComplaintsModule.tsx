import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Clock, FileCheck2, Search } from 'lucide-react';
import {
  BillerDefinition,
  ComplaintRecord,
  ComplaintStatus,
  ComplaintType,
  HostTheme,
  SdkLanguage,
  SimulationControls,
  TransactionRecord,
  ViewportMode,
} from '../types/sdk';
import {
  SERVICE_COMPLAINT_REASONS,
  TRANSACTION_COMPLAINT_REASONS,
} from '../data/mockBillerMaster';
import { TRANSLATIONS } from '../i18n/translations';

interface ComplaintsModuleProps {
  theme: HostTheme;
  language: SdkLanguage;
  viewport: ViewportMode;
  transactions: TransactionRecord[];
  allBillers: BillerDefinition[];
  complaints: ComplaintRecord[];
  simulation: SimulationControls;
  prefilledTxn?: TransactionRecord | null;
  onConsumePrefill?: () => void;
  onComplaintRaised: (complaint: ComplaintRecord) => void;
  onRequireOnlineCheck: () => boolean;
}

export const ComplaintsModule: React.FC<ComplaintsModuleProps> = ({
  theme,
  language,
  viewport,
  transactions,
  allBillers,
  complaints,
  simulation,
  prefilledTxn,
  onConsumePrefill,
  onComplaintRaised,
  onRequireOnlineCheck,
}) => {
  const t = TRANSLATIONS[language];
  const isMobile = viewport === 'mobile';

  const [subTab, setSubTab] = useState<'raise' | 'status' | 'history'>('raise');

  // Raise Complaint Form State
  const [mobileNo, setMobileNo] = useState('');
  const [complaintType, setComplaintType] = useState<ComplaintType | ''>('');
  const [txnRefId, setTxnRefId] = useState('');
  const [participationType, setParticipationType] = useState<'Biller' | 'Agent'>('Biller');
  const [entityName, setEntityName] = useState(allBillers[0]?.name ?? 'Tata Power DDL');
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [isPrefilledLock, setIsPrefilledLock] = useState(false);

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitBanner, setSubmitBanner] = useState<{
    type: 'success' | 'duplicate' | 'error';
    message: string;
    complaint?: ComplaintRecord;
  } | null>(null);

  // Check Status State
  const [checkComplaintId, setCheckComplaintId] = useState('');
  const [checkType, setCheckType] = useState<ComplaintType>('Transaction');
  const [checkedResult, setCheckedResult] = useState<ComplaintRecord | 'not-found' | null>(null);

  // History Filters
  const [historyStatusFilter, setHistoryStatusFilter] = useState<'All' | ComplaintStatus>('All');
  const [historyFromDate, setHistoryFromDate] = useState('');
  const [historyToDate, setHistoryToDate] = useState('');
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<ComplaintRecord | null>(null);

  useEffect(() => {
    if (prefilledTxn) {
      setSubTab('raise');
      setComplaintType('Transaction');
      setTxnRefId(prefilledTxn.txnRefId);
      setMobileNo(prefilledTxn.mobileNumber);
      setIsPrefilledLock(true);
      setFormErrors({});
      setSubmitBanner(null);
      onConsumePrefill?.();
    }
  }, [prefilledTxn, onConsumePrefill]);

  const reasonOptions =
    complaintType === 'Service' ? SERVICE_COMPLAINT_REASONS : TRANSACTION_COMPLAINT_REASONS;

  const formatComplaintStatusDisplay = (status: ComplaintStatus): string => {
    switch (status) {
      case 'Registered':
        return 'Registered - awaiting assignment';
      case 'In Progress':
        return 'In Progress';
      case 'Resolved':
        return 'Resolved with remarks';
      case 'Closed':
        return 'Closed';
    }
  };

  const handleRaiseSubmit = () => {
    setSubmitBanner(null);
    const errs: Record<string, string> = {};

    if (!mobileNo.trim()) {
      errs.mobileNo = 'Mobile number is required';
    } else if (!/^\d{10}$/.test(mobileNo.trim())) {
      errs.mobileNo = 'Enter a valid 10 digit number';
    }

    if (!complaintType) {
      errs.complaintType = 'Select the type of complaint';
    }

    if (complaintType === 'Transaction') {
      if (!txnRefId.trim()) {
        errs.txnRefId = 'Transaction reference ID is required';
      } else {
        const exists = transactions.some(
          (tx) =>
            tx.txnRefId.toLowerCase() === txnRefId.trim().toLowerCase() ||
            tx.bConnectTxnId.toLowerCase() === txnRefId.trim().toLowerCase()
        );
        if (!exists) {
          errs.txnRefId = 'No transaction found for this ID';
        }
      }
    }

    if (!reason) {
      errs.reason = 'Select a reason';
    }

    if (!description.trim()) {
      errs.description = 'Description is required';
    } else if (description.trim().length > 250) {
      errs.description = 'Description exceeds the allowed limit';
    }

    setFormErrors(errs);
    if (Object.keys(errs).length > 0) return;

    if (!onRequireOnlineCheck()) return;

    // Duplicate open complaint guard for the same transaction
    if (complaintType === 'Transaction') {
      const existing = complaints.find(
        (c) =>
          c.type === 'Transaction' &&
          c.txnRefId?.toLowerCase() === txnRefId.trim().toLowerCase() &&
          (c.status === 'Registered' || c.status === 'In Progress')
      );
      if (existing) {
        setSubmitBanner({
          type: 'duplicate',
          message: `An open complaint already exists for this transaction: ${existing.complaintId}`,
          complaint: existing,
        });
        return;
      }
    }

    if (simulation.complaintOutcome === 'server-error') {
      setSubmitBanner({
        type: 'error',
        message: 'We could not register your complaint. Please try again.',
      });
      return;
    }

    const created: ComplaintRecord = {
      id: `CMP-${Date.now()}`,
      complaintId: `CC250619${Math.floor(100000 + Math.random() * 899999)}`,
      type: complaintType as ComplaintType,
      mobileNumber: mobileNo.trim(),
      txnRefId: complaintType === 'Transaction' ? txnRefId.trim() : undefined,
      participationType: complaintType === 'Service' ? participationType : undefined,
      entityName: complaintType === 'Service' ? entityName : undefined,
      reason,
      description: description.trim(),
      dateRaised: '19/06/2025',
      dateIso: '2025-06-19',
      lastUpdated: '19/06/2025, 11:45',
      status: 'Registered',
      expectedResolution: '5 working days (by 26/06/2025)',
    };

    onComplaintRaised(created);
    setSubmitBanner({
      type: 'success',
      message: 'Complaint registered with Bharat Connect.',
      complaint: created,
    });
    setIsPrefilledLock(false);
    setReason('');
    setDescription('');
  };

  const handleCheckStatusSubmit = () => {
    const id = checkComplaintId.trim();
    if (!id) {
      setCheckedResult('not-found');
      return;
    }
    const found = complaints.find(
      (c) =>
        c.complaintId.toLowerCase() === id.toLowerCase() &&
        c.type === checkType
    );
    setCheckedResult(found ?? 'not-found');
  };

  const filteredHistory = useMemo(() => {
    return complaints.filter((c) => {
      if (historyStatusFilter !== 'All' && c.status !== historyStatusFilter) return false;
      if (historyFromDate && c.dateIso < historyFromDate) return false;
      if (historyToDate && c.dateIso > historyToDate) return false;
      return true;
    });
  }, [complaints, historyStatusFilter, historyFromDate, historyToDate]);

  return (
    <div className="space-y-5">
      {/* Sub-navigation Tabs */}
      <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg w-fit max-w-full overflow-x-auto">
        <button
          type="button"
          onClick={() => setSubTab('raise')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            subTab === 'raise' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          {t.raiseComplaint}
        </button>
        <button
          type="button"
          onClick={() => setSubTab('status')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            subTab === 'status' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          {t.checkComplaintStatus}
        </button>
        <button
          type="button"
          onClick={() => setSubTab('history')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            subTab === 'history' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          {t.complaintHistory}
        </button>
      </div>

      {/* 1. RAISE COMPLAINT FORM */}
      {subTab === 'raise' && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
            <div>
              <h2 className="font-display font-semibold text-base text-slate-900">
                {t.raiseComplaint}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Report a transaction or service issue to Bharat Connect Central Unit
              </p>
            </div>
            {isPrefilledLock && (
              <button
                type="button"
                onClick={() => {
                  setIsPrefilledLock(false);
                  setTxnRefId('');
                  setMobileNo('');
                }}
                className="text-xs font-medium text-slate-600 underline cursor-pointer"
              >
                Reset Form
              </button>
            )}
          </div>

          <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Mobile Number <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                readOnly={isPrefilledLock}
                value={mobileNo}
                onChange={(e) => {
                  setMobileNo(e.target.value);
                  setFormErrors((p) => ({ ...p, mobileNo: '' }));
                }}
                placeholder="10 digit mobile number"
                className={`w-full px-3.5 py-2 text-sm border rounded-lg font-mono-tabular ${
                  isPrefilledLock ? 'bg-slate-100 text-slate-600 border-slate-200' : 'border-slate-300'
                }`}
              />
              {formErrors.mobileNo && (
                <p className="mt-1 text-xs font-medium text-red-600">{formErrors.mobileNo}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Type of Complaint <span className="text-red-600">*</span>
              </label>
              <select
                disabled={isPrefilledLock}
                value={complaintType}
                onChange={(e) => {
                  setComplaintType(e.target.value as ComplaintType | '');
                  setReason('');
                  setFormErrors((p) => ({ ...p, complaintType: '' }));
                }}
                className={`w-full px-3 py-2 text-sm border rounded-lg ${
                  isPrefilledLock ? 'bg-slate-100 text-slate-600 border-slate-200' : 'bg-white border-slate-300'
                }`}
              >
                <option value="">Select type...</option>
                <option value="Transaction">Transaction</option>
                <option value="Service">Service</option>
              </select>
              {formErrors.complaintType && (
                <p className="mt-1 text-xs font-medium text-red-600">{formErrors.complaintType}</p>
              )}
            </div>
          </div>

          {/* Dynamic Fields based on Complaint Type */}
          {complaintType === 'Transaction' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Transaction Reference ID <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                readOnly={isPrefilledLock}
                value={txnRefId}
                onChange={(e) => {
                  setTxnRefId(e.target.value);
                  setFormErrors((p) => ({ ...p, txnRefId: '' }));
                }}
                placeholder="e.g. TXNREF202506126541"
                className={`w-full px-3.5 py-2 text-sm border rounded-lg font-mono-tabular ${
                  isPrefilledLock ? 'bg-slate-100 text-slate-600 border-slate-200' : 'border-slate-300'
                }`}
              />
              {formErrors.txnRefId && (
                <p className="mt-1 text-xs font-medium text-red-600">{formErrors.txnRefId}</p>
              )}
            </div>
          )}

          {complaintType === 'Service' && (
            <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Participation Type
                </label>
                <select
                  value={participationType}
                  onChange={(e) => setParticipationType(e.target.value as 'Biller' | 'Agent')}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                >
                  <option value="Biller">Biller</option>
                  <option value="Agent">Agent</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  {participationType} Name
                </label>
                {participationType === 'Biller' ? (
                  <select
                    value={entityName}
                    onChange={(e) => setEntityName(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                  >
                    {allBillers.map((b) => (
                      <option key={b.id} value={b.name}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={entityName}
                    onChange={(e) => setEntityName(e.target.value)}
                    placeholder="Agent Institution Name"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                )}
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Reason <span className="text-red-600">*</span>
            </label>
            <select
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setFormErrors((p) => ({ ...p, reason: '' }));
              }}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
            >
              <option value="">Select reason...</option>
              {reasonOptions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            {formErrors.reason && (
              <p className="mt-1 text-xs font-medium text-red-600">{formErrors.reason}</p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Description <span className="text-red-600">*</span>
              </label>
              <span className="text-[11px] text-slate-500 tabular-nums">
                {description.length}/250
              </span>
            </div>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                setFormErrors((p) => ({ ...p, description: '' }));
              }}
              placeholder="Describe the issue clearly (max 250 characters)..."
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
            />
            {formErrors.description && (
              <p className="mt-1 text-xs font-medium text-red-600">{formErrors.description}</p>
            )}
          </div>

          {submitBanner && (
            <div
              className={`p-4 rounded-xl border text-xs space-y-1.5 ${
                submitBanner.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : submitBanner.type === 'duplicate'
                    ? 'bg-amber-50 border-amber-200 text-amber-900'
                    : 'bg-red-50 border-red-200 text-red-900'
              }`}
            >
              <div className="font-semibold flex items-center gap-2">
                {submitBanner.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                <span>{submitBanner.message}</span>
              </div>
              {submitBanner.complaint && (
                <div className="pl-6 space-y-0.5 text-slate-700">
                  <div>
                    Complaint ID:{' '}
                    <span className="font-mono-tabular font-bold">
                      {submitBanner.complaint.complaintId}
                    </span>
                  </div>
                  <div>Date: {submitBanner.complaint.dateRaised}</div>
                  <div>Expected Resolution: {submitBanner.complaint.expectedResolution}</div>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleRaiseSubmit}
              className="px-5 py-2 text-xs sm:text-sm font-semibold text-white rounded-lg cursor-pointer"
              style={{ backgroundColor: theme.primaryColor }}
            >
              {t.submit}
            </button>
          </div>
        </div>
      )}

      {/* 2. CHECK COMPLAINT STATUS */}
      {subTab === 'status' && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-6 space-y-5">
          <div>
            <h2 className="font-display font-semibold text-base text-slate-900">
              {t.checkComplaintStatus}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Enter your Bharat Connect Complaint ID (e.g. CC250612004918 or CC250604001822).
            </p>
          </div>

          <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Complaint ID
              </label>
              <input
                type="text"
                value={checkComplaintId}
                onChange={(e) => setCheckComplaintId(e.target.value)}
                placeholder="e.g. CC250612004918"
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg font-mono-tabular"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Type of Complaint
              </label>
              <select
                value={checkType}
                onChange={(e) => setCheckType(e.target.value as ComplaintType)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              >
                <option value="Transaction">Transaction</option>
                <option value="Service">Service</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleCheckStatusSubmit}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white rounded-lg cursor-pointer"
              style={{ backgroundColor: theme.primaryColor }}
            >
              <Search className="w-3.5 h-3.5" />
              <span>{t.submit}</span>
            </button>
          </div>

          {checkedResult === 'not-found' && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs font-medium text-red-800">
              No complaint found for this ID
            </div>
          )}

          {checkedResult && checkedResult !== 'not-found' && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5 text-xs sm:text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
                <span className="font-mono-tabular font-bold text-slate-900">
                  {checkedResult.complaintId}
                </span>
                <ComplaintStatusBadge status={checkedResult.status} />
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Status Display</span>
                <span className="font-semibold text-slate-900">
                  {formatComplaintStatusDisplay(checkedResult.status)}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Last Updated</span>
                <span className="font-medium text-slate-900">{checkedResult.lastUpdated}</span>
              </div>
              {checkedResult.remarks && (
                <div className="pt-2 border-t border-slate-200">
                  <div className="text-slate-500 mb-0.5">Resolution Remarks</div>
                  <div className="text-slate-800">{checkedResult.remarks}</div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 3. COMPLAINT HISTORY */}
      {subTab === 'history' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-display font-semibold text-base text-slate-900">
                {t.complaintHistory}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Tap any complaint row to inspect status details
              </p>
            </div>

            <div className="flex flex-wrap items-end gap-2 text-xs">
              <div>
                <label className="block text-slate-500 mb-1">Status</label>
                <select
                  value={historyStatusFilter}
                  onChange={(e) => setHistoryStatusFilter(e.target.value as 'All' | ComplaintStatus)}
                  className="px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="All">All</option>
                  <option value="Registered">Registered</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-500 mb-1">From</label>
                <input
                  type="date"
                  value={historyFromDate}
                  onChange={(e) => setHistoryFromDate(e.target.value)}
                  className="px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                />
              </div>
              <div>
                <label className="block text-slate-500 mb-1">To</label>
                <input
                  type="date"
                  value={historyToDate}
                  onChange={(e) => setHistoryToDate(e.target.value)}
                  className="px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                />
              </div>
            </div>
          </div>

          {filteredHistory.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-500">{t.noComplaintsFound}</div>
          ) : (
            <div className="divide-y divide-slate-200">
              {filteredHistory.map((cmp, idx) => (
                <button
                  key={cmp.id}
                  type="button"
                  onClick={() => setSelectedHistoryItem(cmp)}
                  className="w-full p-4 text-left hover:bg-slate-50 transition-colors flex flex-wrap items-center justify-between gap-3 cursor-pointer"
                >
                  <div className="min-w-0">
                    <div className="text-xs text-slate-500 tabular-nums">
                      #{idx + 1} · {cmp.type} · Raised {cmp.dateRaised}
                    </div>
                    <div className="font-mono-tabular font-semibold text-sm text-slate-900 mt-0.5">
                      {cmp.complaintId}
                    </div>
                    <div className="text-xs text-slate-600 truncate max-w-md mt-0.5">
                      {cmp.reason}
                    </div>
                  </div>
                  <ComplaintStatusBadge status={cmp.status} />
                </button>
              ))}
            </div>
          )}

          {selectedHistoryItem && (
            <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-display font-bold text-sm text-slate-900">
                  {selectedHistoryItem.complaintId} — {formatComplaintStatusDisplay(selectedHistoryItem.status)}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedHistoryItem(null)}
                  className="text-slate-500 hover:text-slate-900 underline cursor-pointer"
                >
                  Close
                </button>
              </div>
              <p className="text-slate-700">{selectedHistoryItem.description}</p>
              <div className="text-slate-500">
                Last Updated: {selectedHistoryItem.lastUpdated} · Timeline: {selectedHistoryItem.expectedResolution}
              </div>
              {selectedHistoryItem.remarks && (
                <div className="text-slate-800 font-medium">
                  Remarks: {selectedHistoryItem.remarks}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const ComplaintStatusBadge: React.FC<{ status: ComplaintStatus }> = ({ status }) => {
  if (status === 'Resolved' || status === 'Closed') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
        <FileCheck2 className="w-3.5 h-3.5 shrink-0" />
        <span>{status}</span>
      </span>
    );
  }
  if (status === 'In Progress') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700">
        <Clock className="w-3.5 h-3.5 shrink-0" />
        <span>In Progress</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700">
      <Clock className="w-3.5 h-3.5 shrink-0" />
      <span>Registered</span>
    </span>
  );
};
