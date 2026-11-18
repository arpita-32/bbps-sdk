import React, { useCallback, useMemo, useState } from 'react';
import {
  CheckCircle2,
  ClipboardCheck,
  LogOut,
  Menu,
  Monitor,
  RefreshCw,
  ShieldAlert,
  SlidersHorizontal,
  Smartphone,
  Tablet,
  WifiOff,
  X,
} from 'lucide-react';
import {
  BillerCategory,
  BillerDefinition,
  ComplaintRecord,
  HostCallbackEvent,
  HostThemeId,
  SavedBiller,
  SdkConfig,
  SdkErrorCode,
  SdkLanguage,
  SdkTab,
  SimulationControls,
  TransactionRecord,
  ViewportMode,
} from './types/sdk';
import {
  BASE_CATEGORIES,
  BILLER_MASTER,
  BRAND_ASSET_KIT_VERSION,
  DYNAMIC_MASTER_CATEGORY,
  HOST_THEMES,
  INITIAL_COMPLAINTS,
  INITIAL_SAVED_BILLERS,
  INITIAL_TRANSACTIONS,
  PAYMENT_METHODS,
  SDK_VERSION,
} from './data/mockBillerMaster';
import { TRANSLATIONS } from './i18n/translations';
import { BharatConnectHorizontalLogo } from './components/BrandAssets';
import { HostBankEntry } from './components/HostBankEntry';
import { SdkHome } from './components/SdkHome';
import { FetchAndPayFlow } from './components/FetchAndPayFlow';
import { MyBillersModule } from './components/MyBillersModule';
import { PaymentsModule } from './components/PaymentsModule';
import { ComplaintsModule } from './components/ComplaintsModule';
import { ComplianceChecklistModal } from './components/ComplianceChecklistModal';

export default function App() {
  // Host & SDK Lifecycle State
  const [surface, setSurface] = useState<'host-entry' | 'sdk'>('sdk');
  const [activeTab, setActiveTab] = useState<SdkTab>('home');
  const [themeId, setThemeId] = useState<HostThemeId>('apex-navy');
  const [viewport, setViewport] = useState<ViewportMode>('desktop');
  const [mobileControlsOpen, setMobileControlsOpen] = useState(false);

  const [config, setConfig] = useState<SdkConfig>({
    partnerId: 'PARTNER-ANB-001',
    environment: 'PROD',
    customerId: 'CUST-88412',
    sessionToken: 'eyJ-valid-session-token',
    language: 'en',
    customLogoOverrideAttempt: false,
  });

  const [initError, setInitError] = useState<SdkErrorCode | null>(null);
  const [sessionExpiredInSdk, setSessionExpiredInSdk] = useState(false);
  const [offlineAlertOpen, setOfflineAlertOpen] = useState(false);
  const [checklistOpen, setChecklistOpen] = useState(false);

  // Domain Data State
  const [masterSynced, setMasterSynced] = useState(false);
  const [savedBillers, setSavedBillers] = useState<SavedBiller[]>(INITIAL_SAVED_BILLERS);
  const [transactions, setTransactions] = useState<TransactionRecord[]>(INITIAL_TRANSACTIONS);
  const [complaints, setComplaints] = useState<ComplaintRecord[]>(INITIAL_COMPLAINTS);
  const [callbackLogs, setCallbackLogs] = useState<HostCallbackEvent[]>([]);

  // Simulation Controls
  const [simulation, setSimulation] = useState<SimulationControls>({
    fetchOutcome: 'normal',
    paymentOutcome: 'success',
    networkOnline: true,
    audioState: 'normal',
    addBillerOutcome: 'success',
    complaintOutcome: 'success',
  });

  // Active Fetch & Pay Sub-flow
  const [flowState, setFlowState] = useState<{
    active: boolean;
    category: BillerCategory | null;
    initialBiller: BillerDefinition | null;
    initialParams?: Record<string, string>;
    skipToDetails?: boolean;
  }>({
    active: false,
    category: null,
    initialBiller: null,
  });

  // Cross-module navigation helpers
  const [openAddBillerTrigger, setOpenAddBillerTrigger] = useState(false);
  const [prefilledComplaintTxn, setPrefilledComplaintTxn] = useState<TransactionRecord | null>(null);

  const theme = HOST_THEMES[themeId];
  const t = TRANSLATIONS[config.language];

  const categories = useMemo(
    () => (masterSynced ? [...BASE_CATEGORIES, DYNAMIC_MASTER_CATEGORY] : BASE_CATEGORIES),
    [masterSynced]
  );

  const logCallback = useCallback(
    (
      callback: HostCallbackEvent['callback'],
      payload: Record<string, string | number | boolean>
    ) => {
      const now = new Date();
      const time = now.toTimeString().slice(0, 8);
      setCallbackLogs((prev) => [
        { id: `CB-${Date.now()}-${Math.random()}`, timestamp: time, callback, payload },
        ...prev.slice(0, 19),
      ]);
    },
    []
  );

  const validateAndLaunchSdk = (overrideConfig?: SdkConfig) => {
    const cfg = overrideConfig ?? config;
    let err: SdkErrorCode | null = null;
    if (!cfg.partnerId.trim()) err = 'ERR_INVALID_PARTNER';
    else if (cfg.sessionToken === 'EXPIRED') err = 'ERR_SESSION_EXPIRED';
    else if (cfg.environment === 'INVALID') err = 'ERR_INVALID_ENV';
    else if (!cfg.customerId.trim()) err = 'ERR_INVALID_CUSTOMER';

    if (err) {
      setInitError(err);
      setSurface('host-entry');
      logCallback('onInitError', { errorCode: err });
      return;
    }

    setInitError(null);
    setSessionExpiredInSdk(false);
    setSurface('sdk');
    setActiveTab('home');
    setFlowState({ active: false, category: null, initialBiller: null });
  };

  const handleExitSdk = () => {
    setSurface('host-entry');
    logCallback('onSDKClosed', { reason: 'USER_EXITED' });
  };

  const handleRequireOnlineCheck = useCallback((): boolean => {
    if (!simulation.networkOnline) {
      setOfflineAlertOpen(true);
      return false;
    }
    setOfflineAlertOpen(false);
    return true;
  }, [simulation.networkOnline]);

  const handleSelectCategory = (cat: BillerCategory) => {
    setFlowState({
      active: true,
      category: cat,
      initialBiller: null,
      skipToDetails: false,
    });
  };

  const handleSelectBillerDirect = (biller: BillerDefinition) => {
    const cat = categories.find((c) => c.id === biller.categoryId) ?? null;
    setFlowState({
      active: true,
      category: cat,
      initialBiller: biller,
      skipToDetails: false,
    });
  };

  const handleFetchSavedBiller = (sb: SavedBiller) => {
    const billerDef = BILLER_MASTER.find((b) => b.id === sb.billerId) ?? null;
    const cat = categories.find((c) => c.id === sb.categoryId) ?? null;
    if (!billerDef) return;
    setActiveTab('home');
    setFlowState({
      active: true,
      category: cat,
      initialBiller: billerDef,
      initialParams: sb.params,
      skipToDetails: billerDef.supportsFetch,
    });
  };

  const handlePaymentCompleted = (
    txn: TransactionRecord,
    saveBillerPayload?: { biller: BillerDefinition; params: Record<string, string> }
  ) => {
    setTransactions((prev) => [txn, ...prev]);
    logCallback('onPaymentResult', {
      status: txn.status,
      bConnectTxnId: txn.bConnectTxnId,
      amount: txn.totalAmount,
    });

    if (saveBillerPayload) {
      const { biller, params } = saveBillerPayload;
      const firstField = biller.mdmFields[0];
      const authVal = (firstField ? params[firstField.id] : Object.values(params)[0]) ?? '0000';
      const alreadyExists = savedBillers.some(
        (sb) => sb.billerId === biller.id && sb.authenticatorValue === authVal
      );
      if (!alreadyExists) {
        const catName = categories.find((c) => c.id === biller.categoryId)?.name ?? 'Utility';
        const added: SavedBiller = {
          id: `SB-${Date.now()}`,
          billerId: biller.id,
          billerName: biller.name,
          categoryId: biller.categoryId,
          categoryName: catName,
          nickname: `${biller.name} Saved`,
          authenticatorLabel: firstField?.label ?? 'Consumer ID',
          authenticatorValue: authVal,
          params,
          pendingAmount: null,
          dueDate: null,
          status: 'Active',
          autopayEnabled: false,
          supportsAutopay: biller.supportsAutopay,
          registrationDate: '19/06/2025',
          billerAccountId: `BA-${biller.shortCode}-${Math.floor(10000 + Math.random() * 89999)}`,
          uniqueRegNumber: `BBPSREG20250619${Math.floor(1000 + Math.random() * 8999)}`,
          paymentChannel: 'Internet Banking',
        };
        setSavedBillers((prev) => [added, ...prev]);
        logCallback('onBillerAdded', {
          billerId: added.billerId,
          billerAccountId: added.billerAccountId,
        });
      }
    }
  };

  const handleReconcilePending = (txnId: string, finalStatus: 'Success' | 'Failed') => {
    setTransactions((prev) =>
      prev.map((tx) =>
        tx.id === txnId
          ? {
              ...tx,
              status: finalStatus,
              billerStatus: finalStatus === 'Success' ? 'ACCEPTED' : 'DECLINED',
            }
          : tx
      )
    );
    logCallback('onPaymentResult', { status: finalStatus, reconciledTxnId: txnId });
  };

  const containerWidthStyle =
    viewport === 'mobile'
      ? { width: '320px', maxWidth: '100%' }
      : viewport === 'tablet'
        ? { width: '768px', maxWidth: '100%' }
        : { width: '1024px', maxWidth: '100%' };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col lg:flex-row">
      {/* Left Host / QA Controls Sidebar */}
      <aside
        className={`bg-white border-r border-slate-200 w-full lg:w-80 shrink-0 flex flex-col ${
          mobileControlsOpen ? 'block' : 'hidden lg:flex'
        }`}
      >
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h1 className="font-display font-bold text-sm text-slate-900">
              Bharat Connect SDK
            </h1>
            <p className="text-xs text-slate-500">
              v{SDK_VERSION} · Kit {BRAND_ASSET_KIT_VERSION}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setMobileControlsOpen(false)}
            className="lg:hidden p-1.5 rounded-md hover:bg-slate-100 text-slate-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-5 overflow-y-auto flex-1 text-xs">
          {/* Mode Switch: Host Entry vs Embedded SDK */}
          <div>
            <div className="font-semibold text-slate-700 mb-2">Experience Surface</div>
            <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => setSurface('host-entry')}
                className={`py-1.5 px-2 font-semibold rounded-md transition-colors cursor-pointer ${
                  surface === 'host-entry'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Host Entry (S1)
              </button>
              <button
                type="button"
                onClick={() => validateAndLaunchSdk()}
                className={`py-1.5 px-2 font-semibold rounded-md transition-colors cursor-pointer ${
                  surface === 'sdk'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                SDK Active (S2/S3)
              </button>
            </div>
          </div>

          {/* Viewport Form Factor */}
          <div>
            <div className="font-semibold text-slate-700 mb-2">Viewport Width</div>
            <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => setViewport('desktop')}
                className={`flex items-center justify-center gap-1 py-1.5 px-2 font-medium rounded-md cursor-pointer ${
                  viewport === 'desktop' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>1024</span>
              </button>
              <button
                type="button"
                onClick={() => setViewport('tablet')}
                className={`flex items-center justify-center gap-1 py-1.5 px-2 font-medium rounded-md cursor-pointer ${
                  viewport === 'tablet' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                <Tablet className="w-3.5 h-3.5" />
                <span>768</span>
              </button>
              <button
                type="button"
                onClick={() => setViewport('mobile')}
                className={`flex items-center justify-center gap-1 py-1.5 px-2 font-medium rounded-md cursor-pointer ${
                  viewport === 'mobile' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>320</span>
              </button>
            </div>
          </div>

          {/* Host Theme & Language */}
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Host Bank Theme
              </label>
              <select
                value={themeId}
                onChange={(e) => setThemeId(e.target.value as HostThemeId)}
                className="w-full px-2.5 py-2 border border-slate-300 rounded-lg bg-white text-slate-900"
              >
                <option value="apex-navy">Apex National Bank (Navy)</option>
                <option value="emerald-coop">Emerald Commercial (Green)</option>
                <option value="saffron-bank">Bharati Retail (Saffron)</option>
                <option value="midnight-dark">Meridian Bank (Dark Header)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                SDK Language
              </label>
              <select
                value={config.language}
                onChange={(e) =>
                  setConfig((c) => ({ ...c, language: e.target.value as SdkLanguage }))
                }
                className="w-full px-2.5 py-2 border border-slate-300 rounded-lg bg-white text-slate-900"
              >
                <option value="en">English</option>
                <option value="hi">Hindi (हिन्दी)</option>
                <option value="bn">Bengali (বাংলা)</option>
              </select>
            </div>
          </div>

          {/* Gherkin Scenario Simulators */}
          <div className="border-t border-slate-200 pt-4 space-y-3">
            <div className="font-semibold text-slate-800">Scenario Simulator</div>

            <div>
              <label className="block text-slate-600 mb-1">Bill Fetch Outcome</label>
              <select
                value={simulation.fetchOutcome}
                onChange={(e) =>
                  setSimulation((s) => ({
                    ...s,
                    fetchOutcome: e.target.value as SimulationControls['fetchOutcome'],
                  }))
                }
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
              >
                <option value="normal">Normal Pending Bill</option>
                <option value="no-dues">No Pending Bill (No Dues)</option>
                <option value="unavailable">Biller Unavailable</option>
                <option value="invalid-data">Invalid Customer Data</option>
                <option value="timeout">Network Timeout</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-600 mb-1">Payment Outcome</label>
              <select
                value={simulation.paymentOutcome}
                onChange={(e) =>
                  setSimulation((s) => ({
                    ...s,
                    paymentOutcome: e.target.value as SimulationControls['paymentOutcome'],
                  }))
                }
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
              >
                <option value="success">Success (B Assured + Sonic)</option>
                <option value="failed">Failed (No B Assured)</option>
                <option value="pending">Pending (Reconcilable)</option>
                <option value="network-lost">Network Lost After Submit</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-600 mb-1">Device Audio</label>
                <select
                  value={simulation.audioState}
                  onChange={(e) =>
                    setSimulation((s) => ({
                      ...s,
                      audioState: e.target.value as SimulationControls['audioState'],
                    }))
                  }
                  className="w-full px-2 py-1.5 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="normal">Normal</option>
                  <option value="muted">Muted</option>
                  <option value="fail-load">Fail Load</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-600 mb-1">Connectivity</label>
                <button
                  type="button"
                  onClick={() =>
                    setSimulation((s) => ({ ...s, networkOnline: !s.networkOnline }))
                  }
                  className={`w-full px-2 py-1.5 rounded-lg border font-semibold cursor-pointer ${
                    simulation.networkOnline
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-red-50 border-red-200 text-red-800'
                  }`}
                >
                  {simulation.networkOnline ? 'Online' : 'Offline'}
                </button>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={masterSynced}
                  onChange={(e) => setMasterSynced(e.target.checked)}
                  className="rounded border-slate-300"
                />
                <span>Master Sync: Add EV Charging Category</span>
              </label>

              <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.customLogoOverrideAttempt}
                  onChange={(e) =>
                    setConfig((c) => ({ ...c, customLogoOverrideAttempt: e.target.checked }))
                  }
                  className="rounded border-slate-300"
                />
                <span>Test Host Brand Override (Ignored)</span>
              </label>
            </div>

            {/* SDK Init & Session Edge-Case Triggers */}
            <div className="pt-1 flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setSessionExpiredInSdk(true);
                  logCallback('onSessionExpired', { reason: 'IDLE_OR_TOKEN_EXPIRED' });
                }}
                className="px-2.5 py-1 border border-slate-300 rounded-md hover:bg-slate-50 font-medium text-slate-700 cursor-pointer"
              >
                Expire Session
              </button>
              <button
                type="button"
                onClick={() =>
                  validateAndLaunchSdk({ ...config, partnerId: '' })
                }
                className="px-2.5 py-1 border border-slate-300 rounded-md hover:bg-slate-50 font-medium text-slate-700 cursor-pointer"
              >
                Test Invalid Init
              </button>
              <button
                type="button"
                onClick={() => setChecklistOpen(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1 border border-slate-300 rounded-md hover:bg-slate-50 font-semibold text-slate-800 cursor-pointer"
              >
                <ClipboardCheck className="w-3.5 h-3.5 text-emerald-700" />
                <span>NPCI Checklist</span>
              </button>
            </div>
          </div>

          {/* Host Callback Event Log */}
          <div className="border-t border-slate-200 pt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-slate-800">Host Callback Log</span>
              {callbackLogs.length > 0 && (
                <button
                  type="button"
                  onClick={() => setCallbackLogs([])}
                  className="text-[11px] text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
            {callbackLogs.length === 0 ? (
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-500">
                SDK events (onPaymentResult, onBillerAdded, etc.) appear here. Sensitive tokens are never logged.
              </div>
            ) : (
              <div className="space-y-1.5 max-h-44 overflow-y-auto">
                {callbackLogs.map((ev) => (
                  <div
                    key={ev.id}
                    className="p-2 rounded-lg bg-slate-50 border border-slate-200 font-mono-tabular text-[11px]"
                  >
                    <div className="flex items-center justify-between text-slate-700 font-semibold">
                      <span>{ev.callback}</span>
                      <span className="text-slate-400 font-normal">{ev.timestamp}</span>
                    </div>
                    <div className="text-slate-600 truncate mt-0.5">
                      {JSON.stringify(ev.payload)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Preview Canvas */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Mobile Controls Toggle Bar */}
        <div className="lg:hidden px-4 py-2.5 bg-white border-b border-slate-200 flex items-center justify-between">
          <span className="font-display font-bold text-sm">Bharat Connect SDK</span>
          <button
            type="button"
            onClick={() => setMobileControlsOpen((o) => !o)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Host Controls</span>
          </button>
        </div>

        {/* Centered Responsive Container */}
        <div className="flex-1 p-3 sm:p-6 lg:p-8 flex flex-col items-center overflow-x-hidden">
          <div style={containerWidthStyle} className="transition-all duration-150 space-y-4">
            {/* Init Error Feedback (when Host sends invalid config) */}
            {initError && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 text-xs sm:text-sm text-red-900">
                  <ShieldAlert className="w-5 h-5 text-red-700 shrink-0" />
                  <div>
                    <strong>SDK Launch Refused:</strong> Error code{' '}
                    <span className="font-mono-tabular font-bold">{initError}</span> returned to host callback.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setInitError(null)}
                  className="text-xs font-semibold text-red-800 underline cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Host Brand Override Protection Notice */}
            {config.customLogoOverrideAttempt && (
              <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-700 shrink-0" />
                <span>
                  Host supplied a custom Bharat Connect image override — ignored by SDK. Official NPCI assets remain protected.
                </span>
              </div>
            )}

            {surface === 'host-entry' ? (
              <HostBankEntry
                theme={theme}
                config={config}
                viewport={viewport}
                onLaunchSdk={() => validateAndLaunchSdk()}
              />
            ) : (
              /* EMBEDDED BHARAT CONNECT SDK CONTAINER */
              <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden shadow-sm relative">
                {/* SDK Top Header: Host Bank Left + Mandatory Stage 2 Bharat Connect Logo TOP RIGHT (>=20px) */}
                <header
                  className="px-4 py-3 border-b border-slate-200 flex items-center justify-between gap-3"
                  style={{ backgroundColor: theme.headerBg, color: theme.headerText }}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-7 h-7 rounded-md flex items-center justify-center font-display font-bold text-[11px] text-white shrink-0"
                      style={{ backgroundColor: theme.primaryColor }}
                    >
                      {theme.shortCode}
                    </div>
                    {viewport !== 'mobile' && (
                      <span className="font-display font-semibold text-sm truncate">
                        {theme.bankName}
                      </span>
                    )}
                  </div>

                  {/* Protected Stage 2 Bharat Connect Horizontal Logo (Top Right-Hand Corner, >=20px height) */}
                  <div className="flex items-center gap-2.5 shrink-0">
                    <BharatConnectHorizontalLogo
                      variant={theme.isDarkHeader ? 'dark' : 'light'}
                      heightPx={viewport === 'mobile' ? 22 : 24}
                    />
                    <button
                      type="button"
                      onClick={handleExitSdk}
                      aria-label={t.exitSdk}
                      title={t.exitSdk}
                      className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                        theme.isDarkHeader
                          ? 'text-slate-300 hover:bg-slate-800'
                          : 'text-slate-500 hover:bg-slate-100'
                      }`}
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>
                </header>

                {/* SDK Primary Navigation Tabs */}
                <nav
                  aria-label="Bharat Connect SDK Navigation"
                  className="px-4 bg-white border-b border-slate-200 flex items-center gap-5 overflow-x-auto"
                >
                  {(
                    [
                      { id: 'home', label: t.home },
                      { id: 'my-billers', label: t.myBillers },
                      { id: 'payments', label: t.payments },
                      { id: 'complaints', label: t.complaints },
                    ] as const
                  ).map((navItem) => {
                    const isActive = activeTab === navItem.id && !flowState.active;
                    return (
                      <button
                        key={navItem.id}
                        type="button"
                        onClick={() => {
                          setActiveTab(navItem.id);
                          setFlowState({ active: false, category: null, initialBiller: null });
                        }}
                        className={`py-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                          isActive
                            ? 'text-slate-900'
                            : 'border-transparent text-slate-500 hover:text-slate-900'
                        }`}
                        style={isActive ? { borderBottomColor: theme.primaryColor } : undefined}
                      >
                        {navItem.label}
                      </button>
                    );
                  })}
                </nav>

                {/* Offline Warning Banner */}
                {offlineAlertOpen && !simulation.networkOnline && (
                  <div className="mx-4 mt-4 p-3.5 rounded-xl bg-red-50 border border-red-200 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs font-semibold text-red-800">
                      <WifiOff className="w-4 h-4 shrink-0" />
                      <span>{t.noInternet}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSimulation((s) => ({ ...s, networkOnline: true }));
                        setOfflineAlertOpen(false);
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold bg-white border border-red-300 text-red-800 rounded-md cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>{t.retry}</span>
                    </button>
                  </div>
                )}

                {/* SDK Content Area */}
                <div className="p-4 sm:p-6">
                  {flowState.active ? (
                    <FetchAndPayFlow
                      theme={theme}
                      language={config.language}
                      viewport={viewport}
                      category={flowState.category}
                      allBillers={BILLER_MASTER}
                      initialBiller={flowState.initialBiller}
                      initialParams={flowState.initialParams}
                      skipToDetails={flowState.skipToDetails}
                      paymentMethods={PAYMENT_METHODS}
                      simulation={simulation}
                      onBackToHome={() => {
                        setFlowState({ active: false, category: null, initialBiller: null });
                        setActiveTab('home');
                      }}
                      onPaymentCompleted={handlePaymentCompleted}
                      onReconcilePending={handleReconcilePending}
                      onRequireOnlineCheck={handleRequireOnlineCheck}
                    />
                  ) : activeTab === 'home' ? (
                    <SdkHome
                      theme={theme}
                      language={config.language}
                      viewport={viewport}
                      categories={categories}
                      allBillers={BILLER_MASTER}
                      savedBillers={savedBillers}
                      onSelectCategory={handleSelectCategory}
                      onSelectBillerDirect={handleSelectBillerDirect}
                      onFetchSavedBiller={handleFetchSavedBiller}
                      onOpenAddBiller={() => {
                        setOpenAddBillerTrigger(true);
                        setActiveTab('my-billers');
                      }}
                    />
                  ) : activeTab === 'my-billers' ? (
                    <MyBillersModule
                      theme={theme}
                      language={config.language}
                      viewport={viewport}
                      categories={categories}
                      allBillers={BILLER_MASTER}
                      savedBillers={savedBillers}
                      simulation={simulation}
                      initialOpenAdd={openAddBillerTrigger}
                      onConsumeInitialAdd={() => setOpenAddBillerTrigger(false)}
                      onAddBiller={(b) => {
                        setSavedBillers((prev) => [b, ...prev]);
                        logCallback('onBillerAdded', {
                          billerId: b.billerId,
                          billerAccountId: b.billerAccountId,
                        });
                      }}
                      onUpdateBiller={(updated) => {
                        setSavedBillers((prev) =>
                          prev.map((sb) => (sb.id === updated.id ? updated : sb))
                        );
                      }}
                      onDeleteBiller={(id) => {
                        setSavedBillers((prev) => prev.filter((sb) => sb.id !== id));
                        logCallback('onBillerDeleted', { savedBillerId: id });
                      }}
                      onFetchSavedBiller={handleFetchSavedBiller}
                      onReturnHome={() => setActiveTab('home')}
                      onRequireOnlineCheck={handleRequireOnlineCheck}
                    />
                  ) : activeTab === 'payments' ? (
                    <PaymentsModule
                      theme={theme}
                      language={config.language}
                      viewport={viewport}
                      transactions={transactions}
                      onRepeatPayment={(txn) => {
                        const billerDef = BILLER_MASTER.find((b) => b.id === txn.billerId) ?? null;
                        const cat =
                          categories.find((c) => c.id === billerDef?.categoryId) ?? null;
                        if (!billerDef) return;
                        setFlowState({
                          active: true,
                          category: cat,
                          initialBiller: billerDef,
                          initialParams: txn.params,
                          skipToDetails: false,
                        });
                      }}
                      onRaiseComplaintFromTxn={(txn) => {
                        setPrefilledComplaintTxn(txn);
                        setActiveTab('complaints');
                      }}
                    />
                  ) : (
                    <ComplaintsModule
                      theme={theme}
                      language={config.language}
                      viewport={viewport}
                      transactions={transactions}
                      allBillers={BILLER_MASTER}
                      complaints={complaints}
                      simulation={simulation}
                      prefilledTxn={prefilledComplaintTxn}
                      onConsumePrefill={() => setPrefilledComplaintTxn(null)}
                      onComplaintRaised={(cmp) => {
                        setComplaints((prev) => [cmp, ...prev]);
                        logCallback('onComplaintRaised', {
                          complaintId: cmp.complaintId,
                          type: cmp.type,
                        });
                      }}
                      onRequireOnlineCheck={handleRequireOnlineCheck}
                    />
                  )}
                </div>

                {/* Session Expired Blocking Overlay (Feature 1) */}
                {sessionExpiredInSdk && (
                  <div
                    className="absolute inset-0 z-40 bg-slate-900/70 flex items-center justify-center p-4"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Session Expired"
                  >
                    <div className="bg-white rounded-xl border border-slate-200 max-w-sm w-full p-5 text-center space-y-3 shadow-xl">
                      <ShieldAlert className="w-8 h-8 text-amber-600 mx-auto" />
                      <h3 className="font-display font-bold text-base text-slate-900">
                        {t.sessionExpired}
                      </h3>
                      <p className="text-xs text-slate-600">
                        Your authenticated session has timed out. Please re-authenticate via {theme.bankName} to continue.
                      </p>
                      <button
                        type="button"
                        onClick={() => setSessionExpiredInSdk(false)}
                        className="w-full py-2 text-xs font-semibold text-white rounded-lg cursor-pointer"
                        style={{ backgroundColor: theme.primaryColor }}
                      >
                        Host: Provide Fresh Session Token
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {checklistOpen && (
        <ComplianceChecklistModal onClose={() => setChecklistOpen(false)} />
      )}
    </div>
  );
}
