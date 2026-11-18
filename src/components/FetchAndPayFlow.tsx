import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Clock,
  Download,
  Lock,
  RefreshCw,
  Search,
  Volume2,
  VolumeX,
  XCircle,
} from 'lucide-react';
import {
  BillerCategory,
  BillerDefinition,
  HostTheme,
  PaymentMethodAccount,
  SavedBiller,
  SdkLanguage,
  SimulationControls,
  TransactionRecord,
  ViewportMode,
} from '../types/sdk';
import { TRANSLATIONS } from '../i18n/translations';
import { BAssuredLogo } from './BrandAssets';
import { ReceiptModal } from './ReceiptModal';
import { downloadDigitalReceipt, formatCurrency, maskSensitiveValue } from '../utils/receipt';
import { playBharatConnectSonic } from '../utils/sonic';

export type FlowStep =
  | 'select-biller'
  | 'bill-details'
  | 'payment-config'
  | 'result';

interface FetchAndPayFlowProps {
  theme: HostTheme;
  language: SdkLanguage;
  viewport: ViewportMode;
  category: BillerCategory | null;
  allBillers: BillerDefinition[];
  initialBiller: BillerDefinition | null;
  initialParams?: Record<string, string>;
  skipToDetails?: boolean;
  paymentMethods: PaymentMethodAccount[];
  simulation: SimulationControls;
  onBackToHome: () => void;
  onPaymentCompleted: (txn: TransactionRecord, saveBillerPayload?: { biller: BillerDefinition; params: Record<string, string> }) => void;
  onReconcilePending: (txnId: string, finalStatus: 'Success' | 'Failed') => void;
  onRequireOnlineCheck: () => boolean;
}

export const FetchAndPayFlow: React.FC<FetchAndPayFlowProps> = ({
  theme,
  language,
  viewport,
  category,
  allBillers,
  initialBiller,
  initialParams,
  skipToDetails,
  paymentMethods,
  simulation,
  onBackToHome,
  onPaymentCompleted,
  onReconcilePending,
  onRequireOnlineCheck,
}) => {
  const t = TRANSLATIONS[language];
  const isMobile = viewport === 'mobile';

  const categoryBillers = useMemo(() => {
    if (!category) return allBillers;
    return allBillers.filter((b) => b.categoryId === category.id);
  }, [category, allBillers]);

  const [step, setStep] = useState<FlowStep>(
    skipToDetails && initialBiller ? 'bill-details' : 'select-biller'
  );
  const [selectedBiller, setSelectedBiller] = useState<BillerDefinition | null>(
    initialBiller ?? (categoryBillers.length > 0 ? categoryBillers[0] : null)
  );
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [billerSearch, setBillerSearch] = useState('');

  const [paramValues, setParamValues] = useState<Record<string, string>>(initialParams ?? {});
  const [paramErrors, setParamErrors] = useState<Record<string, string>>({});

  // Fetch states
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [noPendingBill, setNoPendingBill] = useState(false);
  const [fetchedBill, setFetchedBill] = useState<{
    billAmount: number;
    dueDate: string;
    customerName: string;
    billNumber: string;
    billDate: string;
  } | null>(
    skipToDetails && initialBiller
      ? {
          billAmount: initialBiller.sampleBillAmount,
          dueDate: '28/06/2025',
          customerName: 'Aarav Sharma',
          billNumber: `INV-${initialBiller.shortCode}-89210`,
          billDate: '05/06/2025',
        }
      : null
  );

  // Payment config state
  const [whenToPay, setWhenToPay] = useState<'Pay Now' | 'Pay Later'>('Pay Now');
  const [scheduledDate, setScheduledDate] = useState('2025-06-25');
  const [enteredAmount, setEnteredAmount] = useState<string>(
    initialBiller ? String(initialBiller.sampleBillAmount) : '1000'
  );
  const [amountError, setAmountError] = useState<string | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string>(paymentMethods[0]?.id ?? '');
  const [saveToMyBillers, setSaveToMyBillers] = useState(false);
  const [paymentConfigError, setPaymentConfigError] = useState<string | null>(null);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  // OTP Modal state
  const [otpModalOpen, setOtpModalOpen] = useState(false);
  const [otpValue, setOtpValue] = useState('');
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpAttempts, setOtpAttempts] = useState(0);
  const [otpCountdown, setOtpCountdown] = useState(30);
  const [otpBlocked, setOtpBlocked] = useState(false);

  // Result state
  const [resultTxn, setResultTxn] = useState<TransactionRecord | null>(null);
  const [networkLostPending, setNetworkLostPending] = useState(false);
  const [sonicStatusNote, setSonicStatusNote] = useState<string | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const sonicPlayedForTxnRef = useRef<string | null>(null);

  // Countdown timer for OTP
  useEffect(() => {
    if (!otpModalOpen || otpCountdown <= 0) return;
    const timer = window.setInterval(() => {
      setOtpCountdown((prev) => {
        if (prev <= 1) {
          setOtpValue('');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [otpModalOpen, otpCountdown]);

  // Trigger Sonic Branding ONCE when Payment Successful screen displays B Assured
  useEffect(() => {
    if (
      step === 'result' &&
      resultTxn &&
      resultTxn.status === 'Success' &&
      !networkLostPending &&
      sonicPlayedForTxnRef.current !== resultTxn.id
    ) {
      sonicPlayedForTxnRef.current = resultTxn.id;
      const res = playBharatConnectSonic(simulation.audioState);
      setSonicStatusNote(res.reason);
    }
  }, [step, resultTxn, networkLostPending, simulation.audioState]);

  const filteredDropdownBillers = useMemo(() => {
    const q = billerSearch.trim().toLowerCase();
    return categoryBillers.filter((b) => b.name.toLowerCase().includes(q));
  }, [categoryBillers, billerSearch]);

  const validateMdmFields = (): boolean => {
    if (!selectedBiller) return false;
    const errors: Record<string, string> = {};

    selectedBiller.mdmFields.forEach((field) => {
      const val = (paramValues[field.id] ?? '').trim();
      if (field.required && !val) {
        errors[field.id] = 'This field is required';
        return;
      }
      if (field.dataType === 'numeric' && !/^\d+$/.test(val)) {
        if (field.id === 'last4Digits') {
          errors[field.id] = 'Only digits are allowed';
        } else {
          errors[field.id] = field.validationMessage;
        }
        return;
      }
      if (field.exactLength && val.length !== field.exactLength) {
        errors[field.id] = field.validationMessage;
        return;
      }
      if (field.minLength && val.length < field.minLength) {
        errors[field.id] = field.validationMessage;
        return;
      }
      if (field.maxLength && val.length > field.maxLength) {
        errors[field.id] = field.validationMessage;
        return;
      }
      if (field.regexPattern && !new RegExp(field.regexPattern).test(val)) {
        errors[field.id] = field.validationMessage;
      }
    });

    setParamErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFetchBill = () => {
    if (!selectedBiller) return;
    if (!validateMdmFields()) return;
    if (!onRequireOnlineCheck()) return;

    setFetchError(null);
    setNoPendingBill(false);

    if (!selectedBiller.supportsFetch) {
      // Quick Pay / InstaPay skips Bill Details
      const amtNum = Number(enteredAmount) || selectedBiller.sampleBillAmount;
      setFetchedBill({
        billAmount: amtNum,
        dueDate: 'Immediate',
        customerName: 'Aarav Sharma',
        billNumber: `INSTA-${selectedBiller.shortCode}-${Math.floor(1000 + Math.random() * 8999)}`,
        billDate: '18/06/2025',
      });
      setEnteredAmount(String(amtNum));
      setStep('payment-config');
      return;
    }

    if (simulation.fetchOutcome === 'no-dues') {
      setNoPendingBill(true);
      return;
    }
    if (simulation.fetchOutcome === 'unavailable') {
      setFetchError('Biller is currently unavailable. Try again later.');
      return;
    }
    if (simulation.fetchOutcome === 'invalid-data') {
      setFetchError('Details entered are incorrect. Please re-check.');
      return;
    }
    if (simulation.fetchOutcome === 'timeout') {
      setFetchError('Request timed out. Please try again.');
      return;
    }

    const billAmt = selectedBiller.sampleBillAmount;
    setFetchedBill({
      billAmount: billAmt,
      dueDate: '28/06/2025',
      customerName: 'Aarav Sharma',
      billNumber: `INV-${selectedBiller.shortCode}-${Math.floor(10000 + Math.random() * 89999)}`,
      billDate: '05/06/2025',
    });
    setEnteredAmount(String(billAmt));
    setStep('bill-details');
  };

  const validatePaymentAmount = (raw: string): string | null => {
    if (!selectedBiller || !fetchedBill) return null;
    const val = Number(raw);
    if (!raw || Number.isNaN(val) || val <= 0) {
      return 'Enter a valid payment amount';
    }
    const rule = selectedBiller.amountRule;
    if (rule.type === 'exact' && val !== fetchedBill.billAmount) {
      return 'Exact amount required';
    }
    if (rule.type === 'partial') {
      if (val < rule.minAmount) return 'Below minimum amount';
      if (val > fetchedBill.billAmount) return 'Above bill amount';
    }
    return null;
  };

  const numericPayAmount = Number(enteredAmount) || 0;
  const ccfAmount = selectedBiller?.ccfFee ?? 0;
  const taxAmount = ccfAmount > 0 ? Number((ccfAmount * 0.18).toFixed(2)) : 0;
  const totalPayable = Number((numericPayAmount + ccfAmount + taxAmount).toFixed(2));
  const selectedAccount = paymentMethods.find((pm) => pm.id === selectedAccountId);

  const handleConfirmAndPayClick = () => {
    if (isSubmittingPayment) {
      setPaymentConfigError('A payment request for this bill is already in progress.');
      return;
    }
    if (!onRequireOnlineCheck()) return;

    const amtErr = validatePaymentAmount(enteredAmount);
    setAmountError(amtErr);
    if (amtErr) return;

    if (selectedAccount && selectedAccount.balance !== null && selectedAccount.balance < totalPayable) {
      setPaymentConfigError('Insufficient balance');
      return;
    }

    setPaymentConfigError(null);
    setOtpValue('');
    setOtpError(null);
    setOtpAttempts(0);
    setOtpCountdown(30);
    setOtpBlocked(false);
    setOtpModalOpen(true);
  };

  const handleSubmitOtp = () => {
    if (otpBlocked) return;
    if (otpValue.trim() !== '123456') {
      const nextAttempts = otpAttempts + 1;
      setOtpAttempts(nextAttempts);
      if (nextAttempts >= 3) {
        setOtpBlocked(true);
        setOtpModalOpen(false);
        setPaymentConfigError('Maximum OTP attempts exceeded. Authentication blocked.');
      } else {
        setOtpError(`Invalid OTP. ${3 - nextAttempts} attempt(s) remaining.`);
      }
      return;
    }

    // OTP Verified -> Execute Payment
    setOtpModalOpen(false);
    setIsSubmittingPayment(true);

    const biller = selectedBiller!;
    const subscriberNo =
      Object.values(paramValues).filter(Boolean).slice(-1)[0] ?? '9876543210';
    const isNetworkLost = simulation.paymentOutcome === 'network-lost';
    const finalStatus: 'Success' | 'Failed' | 'Pending' =
      simulation.paymentOutcome === 'success'
        ? 'Success'
        : simulation.paymentOutcome === 'failed'
          ? 'Failed'
          : 'Pending';

    const newTxn: TransactionRecord = {
      id: `TXN-${Date.now()}`,
      bConnectTxnId: `BC01250619${Math.floor(10000000 + Math.random() * 89999999)}`,
      txnRefId: `TXNREF${Math.floor(1000000000 + Math.random() * 8999999999)}`,
      sourceRefNo: `SRC-${theme.shortCode}-${Math.floor(1000000 + Math.random() * 8999999)}`,
      approvalRefNo: finalStatus === 'Success' ? `APR-${Math.floor(100000 + Math.random() * 899999)}` : finalStatus === 'Pending' ? 'PENDING' : 'N/A',
      billerId: biller.id,
      billerName: biller.name,
      categoryName: category?.name ?? 'Utility',
      subscriberNumber: subscriberNo,
      maskedAccount: selectedAccount?.maskedNumber ?? 'XXXX XXXX 4821',
      mobileNumber: paramValues.mobileNo ?? '9876543210',
      billNumber: fetchedBill?.billNumber ?? 'INV-INSTA-001',
      billDate: fetchedBill?.billDate ?? '19/06/2025',
      dueDate: fetchedBill?.dueDate ?? '28/06/2025',
      billAmount: numericPayAmount,
      ccf: ccfAmount,
      taxAmount,
      totalAmount: totalPayable,
      txnDateTime: '19/06/2025, 11:30:14',
      txnDateIso: '2025-06-19',
      status: finalStatus,
      billerStatus:
        finalStatus === 'Success'
          ? 'ACCEPTED'
          : finalStatus === 'Failed'
            ? 'DECLINED'
            : 'AWAITING_CONFIRMATION',
      paymentType: !biller.supportsFetch ? 'Quick Pay' : whenToPay,
      paymentChannel: 'Internet Banking',
      paymentMethod: `${selectedAccount?.label ?? 'Savings Account'} (${selectedAccount?.maskedNumber ?? 'XXXX 4821'})`,
      params: { ...paramValues },
    };

    setNetworkLostPending(isNetworkLost);
    setResultTxn(newTxn);
    setIsSubmittingPayment(false);
    setStep('result');
    onPaymentCompleted(
      newTxn,
      saveToMyBillers ? { biller, params: { ...paramValues } } : undefined
    );
  };

  // Category with 0 active billers (Feature 3)
  if (category && categoryBillers.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToHome}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t.back}</span>
          </button>
          <h2 className="font-display font-semibold text-base text-slate-900">
            {category.name}
          </h2>
        </div>
        <div className="py-10 text-center border-t border-slate-100">
          <p className="text-sm font-medium text-slate-700">
            No billers available for this category
          </p>
          <button
            type="button"
            onClick={onBackToHome}
            className="mt-4 px-4 py-2 text-xs font-semibold text-white rounded-lg cursor-pointer"
            style={{ backgroundColor: theme.primaryColor }}
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Step 1: Selection of Biller & MDM Customer Parameters */}
      {step === 'select-biller' && selectedBiller && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-6 space-y-5">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-3.5">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onBackToHome}
                aria-label="Back to Home"
                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <div className="text-xs text-slate-500">Selection of Biller</div>
                <h2 className="font-display font-semibold text-base text-slate-900">
                  {category?.name ?? 'Bill Payment'}
                </h2>
              </div>
            </div>
          </div>

          {/* Searchable Biller Dropdown */}
          <div className="relative">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Select Biller <span className="text-red-600">*</span>
            </label>
            <button
              type="button"
              onClick={() => setDropdownOpen((o) => !o)}
              className="w-full flex items-center justify-between gap-3 px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-left hover:border-slate-400 cursor-pointer"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className="w-7 h-7 rounded-md flex items-center justify-center text-white text-xs font-bold shrink-0"
                  style={{ backgroundColor: selectedBiller.brandColor }}
                >
                  {selectedBiller.shortCode}
                </span>
                <span className="font-medium text-sm text-slate-900 truncate">
                  {selectedBiller.name}
                </span>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
            </button>

            {dropdownOpen && (
              <div className="absolute left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg z-20 overflow-hidden">
                <div className="p-2 border-b border-slate-100">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={billerSearch}
                      onChange={(e) => setBillerSearch(e.target.value)}
                      placeholder="Filter billers..."
                      className="w-full pl-8 pr-2.5 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none"
                    />
                  </div>
                </div>
                <div className="max-h-52 overflow-y-auto divide-y divide-slate-100">
                  {filteredDropdownBillers.length === 0 ? (
                    <div className="p-3 text-xs text-slate-500 text-center">No matching billers</div>
                  ) : (
                    filteredDropdownBillers.map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => {
                          setSelectedBiller(b);
                          setParamValues({});
                          setParamErrors({});
                          setFetchError(null);
                          setNoPendingBill(false);
                          setDropdownOpen(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left hover:bg-slate-50 cursor-pointer"
                      >
                        <span
                          className="w-7 h-7 rounded-md flex items-center justify-center text-white text-xs font-bold shrink-0"
                          style={{ backgroundColor: b.brandColor }}
                        >
                          {b.shortCode}
                        </span>
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-slate-900 truncate">{b.name}</div>
                          <div className="text-[11px] text-slate-500">
                            {b.supportsFetch ? 'Fetch & Pay' : 'Quick Pay (No Fetch)'} ·{' '}
                            {b.supportsAutopay ? 'Autopay Supported' : 'Manual Pay'}
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Dynamic MDM Customer Parameters */}
          <div className="space-y-4">
            {selectedBiller.mdmFields.map((field) => (
              <div key={field.id}>
                <label
                  htmlFor={`mdm-${field.id}`}
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  {field.label} {field.required && <span className="text-red-600">*</span>}
                </label>
                <input
                  id={`mdm-${field.id}`}
                  type="text"
                  value={paramValues[field.id] ?? ''}
                  onChange={(e) => {
                    setParamValues((prev) => ({ ...prev, [field.id]: e.target.value }));
                    if (paramErrors[field.id]) {
                      setParamErrors((prev) => {
                        const copy = { ...prev };
                        delete copy[field.id];
                        return copy;
                      });
                    }
                  }}
                  placeholder={field.placeholder}
                  className={`w-full px-3.5 py-2.5 text-sm border rounded-lg font-mono-tabular focus:outline-none focus:ring-2 ${
                    paramErrors[field.id]
                      ? 'border-red-500 focus:ring-red-200'
                      : 'border-slate-300 focus:ring-slate-900/15'
                  }`}
                />
                {paramErrors[field.id] && (
                  <p className="mt-1 text-xs font-medium text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{paramErrors[field.id]}</span>
                  </p>
                )}
              </div>
            ))}

            {!selectedBiller.supportsFetch && (
              <div>
                <label
                  htmlFor="quick-pay-amt"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Recharge / Payment Amount (₹) <span className="text-red-600">*</span>
                </label>
                <input
                  id="quick-pay-amt"
                  type="number"
                  value={enteredAmount}
                  onChange={(e) => setEnteredAmount(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg font-mono-tabular"
                />
              </div>
            )}
          </div>

          {/* Mandatory Consent Note */}
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 leading-relaxed">
            <strong className="text-slate-800">Customer Consent:</strong> By proceeding, you authorise{' '}
            {theme.bankName} and Bharat Connect to register this biller and fetch your current and future bills. You can withdraw consent at any time by deleting the biller from My Billers.
          </div>

          {/* Fetch Error or No Pending Bill Feedback */}
          {fetchError && (
            <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <XCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{fetchError}</span>
              </div>
              <button
                type="button"
                onClick={handleFetchBill}
                className="px-2.5 py-1 bg-white border border-red-300 rounded font-semibold text-red-700 hover:bg-red-100 cursor-pointer shrink-0"
              >
                {t.retry}
              </button>
            </div>
          )}

          {noPendingBill && (
            <div className="p-3.5 rounded-lg bg-slate-100 border border-slate-300 text-xs text-slate-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>No pending bill found</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onBackToHome}
              className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
            >
              {t.cancel}
            </button>
            <button
              type="button"
              onClick={handleFetchBill}
              className="px-5 py-2 text-xs sm:text-sm font-semibold text-white rounded-lg hover:opacity-90 cursor-pointer"
              style={{ backgroundColor: theme.primaryColor }}
            >
              {selectedBiller.supportsFetch ? t.fetch : 'Proceed to Pay'}
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Bill Fetch Details View */}
      {step === 'bill-details' && selectedBiller && fetchedBill && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-6 space-y-5">
          <div className="flex items-center gap-3 border-b border-slate-200 pb-3.5">
            <button
              type="button"
              onClick={() => setStep('select-biller')}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="text-xs text-slate-500">Bill Fetch Details</div>
              <h2 className="font-display font-semibold text-base text-slate-900">
                {selectedBiller.name}
              </h2>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-xs text-slate-500">Fetched Bill Amount</div>
              <div className="font-mono-tabular text-2xl font-bold text-slate-900 mt-0.5">
                {formatCurrency(fetchedBill.billAmount)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-500">Due Date</div>
              <div className="font-semibold text-sm text-slate-900 mt-0.5">
                {fetchedBill.dueDate}
              </div>
            </div>
          </div>

          <div className="divide-y divide-slate-100 text-sm">
            <DetailPair label="Customer Name" value={fetchedBill.customerName} />
            <DetailPair label="Bill Number" value={fetchedBill.billNumber} mono />
            <DetailPair label="Bill Date" value={fetchedBill.billDate} />
            <DetailPair label="Due Date" value={fetchedBill.dueDate} />
            <DetailPair label="Bill Amount" value={formatCurrency(fetchedBill.billAmount)} mono />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onBackToHome}
              className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
            >
              {t.cancel}
            </button>
            <button
              type="button"
              onClick={() => setStep('payment-config')}
              className="px-5 py-2 text-xs sm:text-sm font-semibold text-white rounded-lg hover:opacity-90 cursor-pointer"
              style={{ backgroundColor: theme.primaryColor }}
            >
              {t.confirmAndPay}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Payment Configuration View */}
      {step === 'payment-config' && selectedBiller && fetchedBill && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-6 space-y-5">
          <div className="flex items-center gap-3 border-b border-slate-200 pb-3.5">
            <button
              type="button"
              onClick={() =>
                setStep(selectedBiller.supportsFetch ? 'bill-details' : 'select-biller')
              }
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="text-xs text-slate-500">Bill Payment Configuration</div>
              <h2 className="font-display font-semibold text-base text-slate-900">
                {selectedBiller.name}
              </h2>
            </div>
          </div>

          <div className={`grid gap-5 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
            <div className="space-y-4">
              {/* When to pay */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  When to pay
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-lg">
                  {(['Pay Now', 'Pay Later'] as const).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setWhenToPay(opt)}
                      className={`py-2 px-3 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                        whenToPay === opt
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {opt === 'Pay Now' ? t.payNow : t.payLater}
                    </button>
                  ))}
                </div>
                {whenToPay === 'Pay Later' && (
                  <div className="mt-2.5 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-500 shrink-0" />
                    <input
                      type="date"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                    />
                  </div>
                )}
              </div>

              {/* Payment Amount with MDM Rule */}
              <div>
                <label htmlFor="pay-amount" className="block text-xs font-semibold text-slate-700 mb-1">
                  Payment Amount (₹)
                </label>
                <input
                  id="pay-amount"
                  type="number"
                  value={enteredAmount}
                  onChange={(e) => {
                    setEnteredAmount(e.target.value);
                    setAmountError(validatePaymentAmount(e.target.value));
                  }}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg font-mono-tabular"
                />
                <div className="text-[11px] text-slate-500 mt-1">
                  {selectedBiller.amountRule.type === 'exact' && 'Biller rule: Exact bill amount required.'}
                  {selectedBiller.amountRule.type === 'partial' &&
                    `Biller rule: Partial payment allowed (Min ₹${selectedBiller.amountRule.minAmount}, Max ${formatCurrency(fetchedBill.billAmount)}).`}
                  {selectedBiller.amountRule.type === 'any' && 'Biller rule: Any amount allowed.'}
                </div>
                {amountError && (
                  <p className="mt-1 text-xs font-medium text-red-600">{amountError}</p>
                )}
              </div>

              {/* Source Account / Payment Method */}
              <div>
                <label htmlFor="pay-account" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Source Account / Payment Method
                </label>
                <select
                  id="pay-account"
                  value={selectedAccountId}
                  onChange={(e) => {
                    setSelectedAccountId(e.target.value);
                    setPaymentConfigError(null);
                  }}
                  className="w-full px-3 py-2.5 text-xs sm:text-sm border border-slate-300 rounded-lg bg-white text-slate-900"
                >
                  {paymentMethods.map((pm) => (
                    <option key={pm.id} value={pm.id}>
                      {pm.label} · {pm.maskedNumber}
                      {pm.balance !== null ? ` (Bal: ${formatCurrency(pm.balance)})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Save to My Billers */}
              <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={saveToMyBillers}
                  onChange={(e) => setSaveToMyBillers(e.target.checked)}
                  className="rounded border-slate-300"
                />
                <span>Save to My Billers</span>
              </label>
            </div>

            {/* Fee & Total Summary */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col justify-between space-y-4">
              <div className="space-y-2.5 text-xs sm:text-sm">
                <div className="font-display font-semibold text-sm text-slate-900 border-b border-slate-200 pb-2">
                  Payable Summary
                </div>
                <DetailPair label="Bill / Payment Amount" value={formatCurrency(numericPayAmount)} mono />
                <DetailPair label="Consumer Convenience Fee (CCF)" value={formatCurrency(ccfAmount)} mono />
                <DetailPair label="Applicable Taxes (GST)" value={formatCurrency(taxAmount)} mono />
                <div className="pt-2 border-t border-slate-200 flex items-center justify-between font-bold text-slate-900">
                  <span>Total Payable</span>
                  <span className="font-mono-tabular text-base">{formatCurrency(totalPayable)}</span>
                </div>
              </div>

              {paymentConfigError && (
                <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs font-medium text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{paymentConfigError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={onBackToHome}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 border border-slate-300 rounded-lg bg-white hover:bg-slate-100 cursor-pointer"
                >
                  {t.cancel}
                </button>
                <button
                  type="button"
                  disabled={isSubmittingPayment}
                  onClick={handleConfirmAndPayClick}
                  className="px-4 py-2 text-xs font-semibold text-white rounded-lg hover:opacity-90 disabled:opacity-50 cursor-pointer"
                  style={{ backgroundColor: theme.primaryColor }}
                >
                  {isSubmittingPayment ? 'Processing...' : t.confirmAndPay}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Payment Result Screen (Stage 3 B Assured + Sonic Branding) */}
      {step === 'result' && resultTxn && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-6 space-y-5">
          {/* Status Banner */}
          {networkLostPending ? (
            <div className="p-5 rounded-xl bg-amber-50 border border-amber-200 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <Clock className="w-6 h-6 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <h2 className="font-display font-bold text-base text-slate-900">
                    Payment status being confirmed
                  </h2>
                  <p className="text-xs text-slate-700 mt-1">
                    Connectivity dropped after submission. Checking status using reference{' '}
                    <span className="font-mono-tabular font-semibold">{resultTxn.txnRefId}</span>.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setNetworkLostPending(false);
                  const updated: TransactionRecord = {
                    ...resultTxn,
                    status: 'Success',
                    billerStatus: 'ACCEPTED',
                    approvalRefNo: `APR-${Math.floor(100000 + Math.random() * 899999)}`,
                  };
                  setResultTxn(updated);
                  onReconcilePending(updated.id, 'Success');
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-white border border-amber-300 text-amber-900 rounded-lg hover:bg-amber-100 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Simulate Connectivity Restored</span>
              </button>
            </div>
          ) : resultTxn.status === 'Success' ? (
            <div className="p-5 rounded-xl bg-emerald-50 border border-emerald-200 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-700 shrink-0 mt-0.5" />
                <div>
                  <h2 className="font-display font-bold text-lg text-slate-900">
                    {t.paymentSuccessful}
                  </h2>
                  <p className="text-xs text-emerald-800 mt-0.5 flex items-center gap-1.5">
                    {simulation.audioState === 'muted' ? (
                      <VolumeX className="w-3.5 h-3.5" />
                    ) : (
                      <Volume2 className="w-3.5 h-3.5" />
                    )}
                    <span>{sonicStatusNote ?? 'Sonic branding verified'}</span>
                  </p>
                </div>
              </div>
              {/* Mandatory Stage 3 B Assured logo on white background >= 30px height */}
              <BAssuredLogo heightPx={38} />
            </div>
          ) : resultTxn.status === 'Failed' ? (
            <div className="p-5 rounded-xl bg-red-50 border border-red-200 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <XCircle className="w-6 h-6 text-red-700 shrink-0 mt-0.5" />
                <div>
                  <h2 className="font-display font-bold text-lg text-slate-900">
                    {t.billPaymentFailed}
                  </h2>
                  <p className="text-xs text-red-800 mt-0.5">
                    The payment could not be completed. B Assured and sonic branding are withheld.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setStep('payment-config')}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-700 rounded-lg hover:bg-red-800 cursor-pointer"
              >
                Retry Payment
              </button>
            </div>
          ) : (
            <div className="p-5 rounded-xl bg-amber-50 border border-amber-200 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <Clock className="w-6 h-6 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <h2 className="font-display font-bold text-lg text-slate-900">
                    {t.billPaymentPending}
                  </h2>
                  <p className="text-xs text-amber-900 mt-0.5">
                    Awaiting final confirmation from biller. Status will be updated shortly.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const updated: TransactionRecord = {
                      ...resultTxn,
                      status: 'Success',
                      billerStatus: 'ACCEPTED',
                      approvalRefNo: `APR-${Math.floor(100000 + Math.random() * 899999)}`,
                    };
                    setResultTxn(updated);
                    onReconcilePending(updated.id, 'Success');
                  }}
                  className="px-3 py-1.5 text-xs font-semibold bg-emerald-700 text-white rounded-lg cursor-pointer"
                >
                  Reconcile: Success
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const updated: TransactionRecord = {
                      ...resultTxn,
                      status: 'Failed',
                      billerStatus: 'DECLINED',
                    };
                    setResultTxn(updated);
                    onReconcilePending(updated.id, 'Failed');
                  }}
                  className="px-3 py-1.5 text-xs font-semibold bg-red-700 text-white rounded-lg cursor-pointer"
                >
                  Reconcile: Failed
                </button>
              </div>
            </div>
          )}

          {/* Complete 14-field Transaction Result Summary */}
          <div className={`grid gap-x-8 gap-y-2 text-xs sm:text-sm ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
            <DetailPair label="Payment Amount" value={formatCurrency(resultTxn.billAmount)} mono />
            <DetailPair label="Consumer Convenience Fee (CCF)" value={formatCurrency(resultTxn.ccf)} mono />
            <DetailPair label="Total Amount" value={formatCurrency(resultTxn.totalAmount)} mono bold />
            <DetailPair label="B-Connect Txn ID" value={resultTxn.bConnectTxnId} mono />
            <DetailPair label="Source Reference Number" value={resultTxn.sourceRefNo} mono />
            <DetailPair label="Transaction Reference Number" value={resultTxn.txnRefId} mono />
            <DetailPair label="Transaction Date & Time" value={resultTxn.txnDateTime} />
            <DetailPair label="Payment Status" value={resultTxn.status.toUpperCase()} bold />
            <DetailPair label="Payment Channel" value={resultTxn.paymentChannel} />
            <DetailPair label="Payment Method" value={resultTxn.paymentMethod} />
            <DetailPair label="Biller Status" value={resultTxn.billerStatus} mono />
            <DetailPair label="Biller ID" value={resultTxn.billerId} mono />
            <DetailPair label="Approval Reference Number" value={resultTxn.approvalRefNo} mono />
            <DetailPair label="Subscriber Number" value={maskSensitiveValue(resultTxn.subscriberNumber, 4)} mono />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onBackToHome}
              className="px-4 py-2 text-xs font-semibold text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
            >
              {resultTxn.status === 'Failed' ? t.cancel : 'Back to Home'}
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setReceiptOpen(true)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                Preview Receipt (Digital / A4)
              </button>
              <button
                type="button"
                onClick={() => downloadDigitalReceipt(resultTxn, theme)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white rounded-lg cursor-pointer"
                style={{ backgroundColor: theme.primaryColor }}
              >
                <Download className="w-3.5 h-3.5" />
                <span>{t.download}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OTP Verification Modal (Feature 4 + Security Screenshot-Block Indicator) */}
      {otpModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="OTP Verification"
        >
          <div className="bg-white rounded-xl border border-slate-200 max-w-sm w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-base text-slate-900">
                Authorise Payment
              </h3>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500">
                <Lock className="w-3 h-3" /> Protected Screen
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Enter the 6-digit OTP sent to your registered mobile number{' '}
              <span className="font-mono-tabular font-semibold text-slate-900">
                XXXXXX3210
              </span>
              . (Test OTP: <span className="font-mono-tabular font-semibold">123456</span>)
            </p>

            <div>
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={otpValue}
                onChange={(e) => {
                  setOtpValue(e.target.value.replace(/\D/g, ''));
                  setOtpError(null);
                }}
                placeholder="Enter 6-digit OTP"
                aria-label="6-digit OTP"
                className="w-full px-3.5 py-2.5 text-center tracking-[0.35em] text-base font-mono-tabular border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/20"
              />
              {otpError && (
                <p className="mt-1.5 text-xs font-medium text-red-600">{otpError}</p>
              )}
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 tabular-nums">
                {otpCountdown > 0 ? `Resend available in ${otpCountdown}s` : 'OTP expired'}
              </span>
              <button
                type="button"
                disabled={otpCountdown > 0}
                onClick={() => {
                  setOtpCountdown(30);
                  setOtpValue('');
                  setOtpError(null);
                }}
                className="font-semibold disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                style={{ color: theme.primaryColor }}
              >
                Resend OTP
              </button>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setOtpModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={handleSubmitOtp}
                disabled={otpValue.length !== 6}
                className="px-5 py-2 text-xs font-semibold text-white rounded-lg disabled:opacity-40 cursor-pointer"
                style={{ backgroundColor: theme.primaryColor }}
              >
                {t.submit}
              </button>
            </div>
          </div>
        </div>
      )}

      {receiptOpen && resultTxn && (
        <ReceiptModal
          transaction={resultTxn}
          theme={theme}
          onClose={() => setReceiptOpen(false)}
        />
      )}
    </div>
  );
};

const DetailPair: React.FC<{
  label: string;
  value: string;
  mono?: boolean;
  bold?: boolean;
}> = ({ label, value, mono, bold }) => (
  <div className="flex items-center justify-between gap-4 py-2 border-b border-slate-100">
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
