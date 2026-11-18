import React, { useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  MoreVertical,
  Plus,
  XCircle,
} from 'lucide-react';
import {
  BillerCategory,
  BillerDefinition,
  HostTheme,
  SavedBiller,
  SdkLanguage,
  SimulationControls,
  ViewportMode,
} from '../types/sdk';
import { TRANSLATIONS } from '../i18n/translations';
import { maskSensitiveValue } from '../utils/receipt';

interface MyBillersModuleProps {
  theme: HostTheme;
  language: SdkLanguage;
  viewport: ViewportMode;
  categories: BillerCategory[];
  allBillers: BillerDefinition[];
  savedBillers: SavedBiller[];
  simulation: SimulationControls;
  initialOpenAdd?: boolean;
  onConsumeInitialAdd?: () => void;
  onAddBiller: (biller: SavedBiller) => void;
  onUpdateBiller: (biller: SavedBiller) => void;
  onDeleteBiller: (billerId: string) => void;
  onFetchSavedBiller: (biller: SavedBiller) => void;
  onReturnHome: () => void;
  onRequireOnlineCheck: () => boolean;
}

type SubView =
  | 'list'
  | 'add-form'
  | 'add-review'
  | 'add-success'
  | 'add-failed'
  | 'view-details'
  | 'modify-form'
  | 'modify-review'
  | 'delete-confirm'
  | 'delete-success';

export const MyBillersModule: React.FC<MyBillersModuleProps> = ({
  theme,
  language,
  viewport,
  categories,
  allBillers,
  savedBillers,
  simulation,
  initialOpenAdd,
  onConsumeInitialAdd,
  onAddBiller,
  onUpdateBiller,
  onDeleteBiller,
  onFetchSavedBiller,
  onReturnHome,
  onRequireOnlineCheck,
}) => {
  const t = TRANSLATIONS[language];
  const isMobile = viewport === 'mobile';

  const [subView, setSubView] = useState<SubView>(initialOpenAdd ? 'add-form' : 'list');
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Add Biller state
  const [selectedCatId, setSelectedCatId] = useState<string>(categories[0]?.id ?? 'electricity');
  const categoryBillers = allBillers.filter((b) => b.categoryId === selectedCatId);
  const [selectedBillerId, setSelectedBillerId] = useState<string>(
    categoryBillers[0]?.id ?? allBillers[0]?.id ?? ''
  );
  const [formParams, setFormParams] = useState<Record<string, string>>({});
  const [nickname, setNickname] = useState('');
  const [autopayToggle, setAutopayToggle] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [duplicateError, setDuplicateError] = useState<string | null>(null);
  const [addFailureMessage, setAddFailureMessage] = useState<string>('');
  const [lastAddedBiller, setLastAddedBiller] = useState<SavedBiller | null>(null);

  // Selected biller for View / Modify / Delete / Autopay Mandate
  const [activeBiller, setActiveBiller] = useState<SavedBiller | null>(null);
  const [modifyNickname, setModifyNickname] = useState('');
  const [modifyError, setModifyError] = useState<string | null>(null);
  const [deletedBillerSummary, setDeletedBillerSummary] = useState<SavedBiller | null>(null);
  const [mandateModalBiller, setMandateModalBiller] = useState<{
    biller: SavedBiller;
    targetState: boolean;
  } | null>(null);

  React.useEffect(() => {
    if (initialOpenAdd) {
      setSubView('add-form');
      onConsumeInitialAdd?.();
    }
  }, [initialOpenAdd, onConsumeInitialAdd]);

  const activeDef = allBillers.find((b) => b.id === selectedBillerId) ?? allBillers[0];

  const totalPages = Math.max(1, Math.ceil(savedBillers.length / rowsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = savedBillers.slice((safePage - 1) * rowsPerPage, safePage * rowsPerPage);

  const resetAddForm = () => {
    const firstCat = categories[0]?.id ?? 'electricity';
    const firstBiller = allBillers.find((b) => b.categoryId === firstCat) ?? allBillers[0];
    setSelectedCatId(firstCat);
    setSelectedBillerId(firstBiller?.id ?? '');
    setFormParams({});
    setNickname('');
    setAutopayToggle(false);
    setFormErrors({});
    setDuplicateError(null);
  };

  const validateNickname = (name: string): string | null => {
    const trimmed = name.trim();
    if (!trimmed) return 'Nickname is required';
    if (trimmed.length > 25) return 'Nickname must be 25 characters or less';
    if (!/^[a-zA-Z0-9\s-]+$/.test(trimmed)) {
      return 'Only letters, numbers, spaces and hyphens are allowed';
    }
    return null;
  };

  const handleValidateAndReviewAdd = () => {
    if (!activeDef) return;
    const errors: Record<string, string> = {};
    setDuplicateError(null);

    activeDef.mdmFields.forEach((f) => {
      const val = (formParams[f.id] ?? '').trim();
      if (f.required && !val) {
        errors[f.id] = 'This field is required';
      } else if (f.dataType === 'numeric' && !/^\d+$/.test(val)) {
        errors[f.id] = f.id === 'last4Digits' ? 'Only digits are allowed' : f.validationMessage;
      } else if (f.exactLength && val.length !== f.exactLength) {
        errors[f.id] = f.validationMessage;
      } else if (f.minLength && val.length < f.minLength) {
        errors[f.id] = f.validationMessage;
      } else if (f.maxLength && val.length > f.maxLength) {
        errors[f.id] = f.validationMessage;
      }
    });

    const nickErr = validateNickname(nickname);
    if (nickErr) errors.nickname = nickErr;

    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    // Duplicate check
    const authVal = Object.values(formParams).filter(Boolean).slice(-1)[0] ?? '';
    const isDuplicate = savedBillers.some(
      (sb) => sb.billerId === activeDef.id && sb.authenticatorValue === authVal
    );
    if (isDuplicate) {
      setDuplicateError('This biller is already marked as a favourite');
      return;
    }

    setSubView('add-review');
  };

  const handleConfirmRegisterBiller = () => {
    if (!activeDef) return;
    if (!onRequireOnlineCheck()) return;

    if (simulation.addBillerOutcome !== 'success') {
      const messages: Record<string, string> = {
        'invalid-params': 'The details provided could not be verified',
        unavailable: 'Biller is currently unavailable',
        rejected: 'The biller rejected this registration',
        timeout: 'Request timed out. Please try again',
      };
      setAddFailureMessage(messages[simulation.addBillerOutcome] ?? 'Registration failed');
      setSubView('add-failed');
      return;
    }

    const firstField = activeDef.mdmFields[0];
    const authVal =
      (firstField ? formParams[firstField.id] : Object.values(formParams)[0]) ?? '0000';
    const catName = categories.find((c) => c.id === activeDef.categoryId)?.name ?? 'Utility';

    const created: SavedBiller = {
      id: `SB-${Date.now()}`,
      billerId: activeDef.id,
      billerName: activeDef.name,
      categoryId: activeDef.categoryId,
      categoryName: catName,
      nickname: nickname.trim(),
      authenticatorLabel: firstField?.label ?? 'Consumer ID',
      authenticatorValue: authVal,
      params: { ...formParams },
      pendingAmount: activeDef.supportsFetch ? activeDef.sampleBillAmount : null,
      dueDate: activeDef.supportsFetch ? '28/06/2025' : null,
      status: 'Active',
      autopayEnabled: activeDef.supportsAutopay && autopayToggle,
      supportsAutopay: activeDef.supportsAutopay,
      registrationDate: '19/06/2025',
      billerAccountId: `BA-${activeDef.shortCode}-${Math.floor(10000 + Math.random() * 89999)}`,
      uniqueRegNumber: `BBPSREG20250619${Math.floor(1000 + Math.random() * 8999)}`,
      paymentChannel: 'Internet Banking',
    };

    onAddBiller(created);
    setLastAddedBiller(created);
    setSubView('add-success');
  };

  const downloadDeleteAck = (sb: SavedBiller) => {
    const content = `Bharat Connect - Biller Deletion Confirmation\nNickname: ${sb.nickname}\nBiller: ${sb.billerName}\nBiller Account ID: ${sb.billerAccountId}\nAccount Number: ${maskSensitiveValue(sb.authenticatorValue, 4)}\nStatus: Deleted & Autopay Mandate Cancelled\n`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Biller-Deleted-${sb.billerAccountId}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      {/* LIST VIEW */}
      {subView === 'list' && (
        <div className="space-y-5">
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display font-semibold text-base text-slate-900">
                  {t.myBillers}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Manage saved billers, registration status, and autopay mandates
                </p>
              </div>
              <div className="flex items-center gap-3">
                {savedBillers.length > 0 && (
                  <select
                    aria-label="Rows per page"
                    value={rowsPerPage}
                    onChange={(e) => {
                      setRowsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="border border-slate-300 rounded-md px-2 py-1.5 text-xs bg-white text-slate-900"
                  >
                    <option value={3}>3 / page</option>
                    <option value={5}>5 / page</option>
                    <option value={10}>10 / page</option>
                  </select>
                )}
                <button
                  type="button"
                  onClick={() => {
                    resetAddForm();
                    setSubView('add-form');
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white rounded-lg cursor-pointer"
                  style={{ backgroundColor: theme.primaryColor }}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{t.addBiller}</span>
                </button>
              </div>
            </div>

            {savedBillers.length === 0 ? (
              <div className="p-10 text-center space-y-3">
                <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                  <Plus className="w-6 h-6" />
                </div>
                <div className="font-display font-semibold text-sm text-slate-900">
                  No saved billers yet
                </div>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  Add your utility, credit card, or recharge billers for quick fetch and optional autopay.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    resetAddForm();
                    setSubView('add-form');
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white rounded-lg cursor-pointer"
                  style={{ backgroundColor: theme.primaryColor }}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{t.addBiller}</span>
                </button>
              </div>
            ) : isMobile ? (
              <div className="divide-y divide-slate-200">
                {paginated.map((sb, idx) => (
                  <div key={sb.id} className="p-3.5 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-[11px] text-slate-500 tabular-nums">
                          #{(safePage - 1) * rowsPerPage + idx + 1} · {sb.nickname}
                        </div>
                        <div className="font-semibold text-sm text-slate-900">{sb.billerName}</div>
                        <div className="text-xs text-slate-600 font-mono-tabular">
                          {sb.authenticatorLabel}: {maskSensitiveValue(sb.authenticatorValue, 4)}
                        </div>
                      </div>
                      <StatusText status={sb.status} />
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <AutopaySwitch
                        biller={sb}
                        onToggle={(target) => setMandateModalBiller({ biller: sb, targetState: target })}
                      />
                      <div className="flex items-center gap-2">
                        {sb.status === 'Active' && (
                          <button
                            type="button"
                            onClick={() => onFetchSavedBiller(sb)}
                            className="px-2.5 py-1 text-xs font-semibold text-white rounded cursor-pointer"
                            style={{ backgroundColor: theme.primaryColor }}
                          >
                            {t.fetch}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setActiveBiller(sb);
                            setSubView('view-details');
                          }}
                          className="text-xs font-medium text-slate-700 underline cursor-pointer"
                        >
                          View
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveBiller(sb);
                            setModifyNickname(sb.nickname);
                            setModifyError(null);
                            setSubView('modify-form');
                          }}
                          className="text-xs font-medium text-slate-700 underline cursor-pointer"
                        >
                          Modify
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveBiller(sb);
                            setSubView('delete-confirm');
                          }}
                          className="text-xs font-medium text-red-700 underline cursor-pointer"
                        >
                          Delete
                        </button>
                      </div>
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
                      <th className="py-2.5 px-4">Biller Name</th>
                      <th className="py-2.5 px-4">Authenticator</th>
                      <th className="py-2.5 px-4">Status</th>
                      <th className="py-2.5 px-4">Autopay</th>
                      <th className="py-2.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {paginated.map((sb, idx) => (
                      <tr key={sb.id} className="hover:bg-slate-50/70">
                        <td className="py-3 px-4 text-xs text-slate-500 tabular-nums">
                          {(safePage - 1) * rowsPerPage + idx + 1}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-900">{sb.billerName}</div>
                          <div className="text-xs text-slate-500">{sb.nickname}</div>
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-600">
                          {sb.authenticatorLabel}:{' '}
                          <span className="font-mono-tabular font-medium text-slate-800">
                            {maskSensitiveValue(sb.authenticatorValue, 4)}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <StatusText status={sb.status} />
                        </td>
                        <td className="py-3 px-4">
                          <AutopaySwitch
                            biller={sb}
                            onToggle={(target) =>
                              setMandateModalBiller({ biller: sb, targetState: target })
                            }
                          />
                        </td>
                        <td className="py-3 px-4 text-right relative">
                          <div className="inline-flex items-center gap-2">
                            {sb.status === 'Active' && (
                              <button
                                type="button"
                                onClick={() => onFetchSavedBiller(sb)}
                                className="px-2.5 py-1 text-xs font-semibold text-white rounded-md cursor-pointer"
                                style={{ backgroundColor: theme.primaryColor }}
                              >
                                {t.fetch}
                              </button>
                            )}
                            <button
                              type="button"
                              aria-label={`Actions for ${sb.nickname}`}
                              onClick={() =>
                                setOpenMenuId((prev) => (prev === sb.id ? null : sb.id))
                              }
                              className="p-1.5 rounded-md border border-slate-200 hover:bg-slate-100 text-slate-600 cursor-pointer"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                          </div>

                          {openMenuId === sb.id && (
                            <div className="absolute right-4 mt-1 w-44 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-30 text-left">
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuId(null);
                                  setActiveBiller(sb);
                                  setSubView('view-details');
                                }}
                                className="w-full px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 text-left cursor-pointer"
                              >
                                View Details
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuId(null);
                                  setActiveBiller(sb);
                                  setModifyNickname(sb.nickname);
                                  setModifyError(null);
                                  setSubView('modify-form');
                                }}
                                className="w-full px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 text-left cursor-pointer"
                              >
                                Modify Details
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuId(null);
                                  setActiveBiller(sb);
                                  setSubView('delete-confirm');
                                }}
                                className="w-full px-3.5 py-2 text-xs font-medium text-red-700 hover:bg-red-50 text-left cursor-pointer"
                              >
                                Delete
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

            {savedBillers.length > 0 && (
              <div className="px-4 py-2.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-600">
                <span className="tabular-nums">
                  {(safePage - 1) * rowsPerPage + 1}–
                  {Math.min(safePage * rowsPerPage, savedBillers.length)} of {savedBillers.length}
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

          {/* Explanatory Notes on Biller Statuses */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 text-xs text-slate-600 space-y-1.5">
            <div className="font-semibold text-slate-800">Biller Status Notes</div>
            <div>
              <strong className="text-emerald-700">Active:</strong> Verified by biller; fetch, pay, and autopay (if supported) are enabled.
            </div>
            <div>
              <strong className="text-amber-700">Pending for authorization:</strong> Awaiting biller confirmation; fetch and pay are temporarily blocked.
            </div>
            <div>
              <strong className="text-red-700">Rejected:</strong> Registration declined by biller; you may only modify details or delete this entry.
            </div>
          </div>
        </div>
      )}

      {/* ADD BILLER FORM */}
      {subView === 'add-form' && activeDef && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-6 space-y-5">
          <div className="flex items-center gap-3 border-b border-slate-200 pb-3.5">
            <button
              type="button"
              onClick={() => setSubView('list')}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="text-xs text-slate-500">My Billers</div>
              <h2 className="font-display font-semibold text-base text-slate-900">{t.addBiller}</h2>
            </div>
          </div>

          <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Category</label>
              <select
                value={selectedCatId}
                onChange={(e) => {
                  const newCat = e.target.value;
                  setSelectedCatId(newCat);
                  const first = allBillers.find((b) => b.categoryId === newCat);
                  if (first) setSelectedBillerId(first.id);
                  setFormParams({});
                  setFormErrors({});
                }}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              >
                {categories
                  .filter((c) => allBillers.some((b) => b.categoryId === c.id))
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Biller</label>
              <select
                value={selectedBillerId}
                onChange={(e) => {
                  setSelectedBillerId(e.target.value);
                  setFormParams({});
                  setFormErrors({});
                }}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              >
                {categoryBillers.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-4">
            {activeDef.mdmFields.map((f) => (
              <div key={f.id}>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  {f.label} {f.required && <span className="text-red-600">*</span>}
                </label>
                <input
                  type="text"
                  value={formParams[f.id] ?? ''}
                  onChange={(e) => {
                    setFormParams((prev) => ({ ...prev, [f.id]: e.target.value }));
                    setFormErrors((prev) => ({ ...prev, [f.id]: '' }));
                  }}
                  placeholder={f.placeholder}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg font-mono-tabular"
                />
                {formErrors[f.id] && (
                  <p className="mt-1 text-xs font-medium text-red-600">{formErrors[f.id]}</p>
                )}
              </div>
            ))}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Nickname <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => {
                  setNickname(e.target.value);
                  setFormErrors((prev) => ({ ...prev, nickname: '' }));
                }}
                placeholder="e.g. Home Electricity (max 25 chars)"
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
              />
              {formErrors.nickname && (
                <p className="mt-1 text-xs font-medium text-red-600">{formErrors.nickname}</p>
              )}
            </div>

            {activeDef.supportsAutopay && (
              <label className="flex items-center gap-2.5 text-xs font-medium text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autopayToggle}
                  onChange={(e) => setAutopayToggle(e.target.checked)}
                  className="rounded border-slate-300"
                />
                <span>Autopay bills for this biller</span>
              </label>
            )}
          </div>

          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600">
            <strong>Consent:</strong> Proceeding registers this biller with Bharat Connect and authorises fetching current and future bills. You can withdraw consent by deleting the biller from My Billers.
          </div>

          {duplicateError && (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs font-medium text-amber-900">
              {duplicateError}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setSubView('list')}
              className="px-4 py-2 text-xs font-semibold border border-slate-300 rounded-lg text-slate-700 cursor-pointer"
            >
              {t.cancel}
            </button>
            <button
              type="button"
              onClick={handleValidateAndReviewAdd}
              className="px-5 py-2 text-xs font-semibold text-white rounded-lg cursor-pointer"
              style={{ backgroundColor: theme.primaryColor }}
            >
              {t.addBiller}
            </button>
          </div>
        </div>
      )}

      {/* ADD REVIEW */}
      {subView === 'add-review' && activeDef && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-6 space-y-5">
          <h2 className="font-display font-semibold text-base text-slate-900 border-b border-slate-200 pb-3">
            Review Biller Details
          </h2>
          <div className="divide-y divide-slate-100 text-sm">
            <Row label="Category" value={categories.find((c) => c.id === selectedCatId)?.name ?? ''} />
            <Row label="Biller" value={activeDef.name} />
            <Row label="Nickname" value={nickname} />
            {activeDef.mdmFields.map((f) => (
              <Row key={f.id} label={f.label} value={formParams[f.id] ?? ''} mono />
            ))}
            {activeDef.supportsAutopay && (
              <Row label="Autopay" value={autopayToggle ? 'Enabled' : 'Off'} />
            )}
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setSubView('add-form')}
              className="px-4 py-2 text-xs font-semibold border border-slate-300 rounded-lg text-slate-700 cursor-pointer"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={handleConfirmRegisterBiller}
              className="px-5 py-2 text-xs font-semibold text-white rounded-lg cursor-pointer"
              style={{ backgroundColor: theme.primaryColor }}
            >
              Confirm &amp; Register
            </button>
          </div>
        </div>
      )}

      {/* ADD SUCCESS */}
      {subView === 'add-success' && lastAddedBiller && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-6 space-y-5">
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-700 shrink-0" />
            <div>
              <h2 className="font-display font-bold text-base text-slate-900">
                Biller Added Successfully
              </h2>
              <p className="text-xs text-emerald-800">
                Your biller is registered with Bharat Connect.
              </p>
            </div>
          </div>
          <div className="divide-y divide-slate-100 text-sm">
            <Row label="Nickname" value={lastAddedBiller.nickname} />
            <Row label="Biller ID" value={lastAddedBiller.billerId} mono />
            <Row label="Registration Date" value={lastAddedBiller.registrationDate} />
            <Row label="Status" value={lastAddedBiller.status} />
            <Row label="Biller Account ID" value={lastAddedBiller.billerAccountId} mono />
            <Row label="Unique Registration Number" value={lastAddedBiller.uniqueRegNumber} mono />
            <Row label="Autopay Status" value={lastAddedBiller.autopayEnabled ? 'ON' : 'OFF'} />
            <Row label="Payment Channel" value={lastAddedBiller.paymentChannel} />
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setSubView('list')}
              className="px-4 py-2 text-xs font-semibold border border-slate-300 rounded-lg text-slate-700 cursor-pointer"
            >
              View My Billers
            </button>
            <button
              type="button"
              onClick={onReturnHome}
              className="px-5 py-2 text-xs font-semibold text-white rounded-lg cursor-pointer"
              style={{ backgroundColor: theme.primaryColor }}
            >
              Return to Home
            </button>
          </div>
        </div>
      )}

      {/* ADD FAILED */}
      {subView === 'add-failed' && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-6 space-y-4">
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-center gap-3">
            <XCircle className="w-6 h-6 text-red-700 shrink-0" />
            <div>
              <h2 className="font-display font-bold text-base text-slate-900">
                Add Biller Failed
              </h2>
              <p className="text-xs text-red-800 mt-0.5">{addFailureMessage}</p>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setSubView('list')}
              className="px-4 py-2 text-xs font-semibold border border-slate-300 rounded-lg text-slate-700 cursor-pointer"
            >
              {t.back}
            </button>
            <button
              type="button"
              onClick={() => setSubView('add-form')}
              className="px-5 py-2 text-xs font-semibold text-white rounded-lg cursor-pointer"
              style={{ backgroundColor: theme.primaryColor }}
            >
              {t.retry}
            </button>
          </div>
        </div>
      )}

      {/* VIEW DETAILS */}
      {subView === 'view-details' && activeBiller && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-6 space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-200 pb-3">
            <button
              type="button"
              onClick={() => setSubView('list')}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h2 className="font-display font-semibold text-base text-slate-900">
              Biller Details (Read-only)
            </h2>
          </div>
          <div className="divide-y divide-slate-100 text-sm">
            <Row label="Category" value={activeBiller.categoryName} />
            <Row label="Biller Name" value={activeBiller.billerName} />
            <Row label="Nickname" value={activeBiller.nickname} />
            <Row
              label={activeBiller.authenticatorLabel}
              value={maskSensitiveValue(activeBiller.authenticatorValue, 4)}
              mono
            />
            <Row label="Registration Status" value={activeBiller.status} />
            <Row label="Autopay Status" value={activeBiller.autopayEnabled ? 'ON' : 'OFF'} />
            <Row label="Biller Account ID" value={activeBiller.billerAccountId} mono />
            <Row label="Unique Reg No" value={activeBiller.uniqueRegNumber} mono />
          </div>
        </div>
      )}

      {/* MODIFY FORM & REVIEW */}
      {subView === 'modify-form' && activeBiller && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-6 space-y-4">
          <h2 className="font-display font-semibold text-base text-slate-900 border-b border-slate-200 pb-3">
            Modify Biller Details
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">
                Category (Locked)
              </label>
              <input
                type="text"
                readOnly
                disabled
                value={activeBiller.categoryName}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-100 text-slate-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">
                Biller (Locked)
              </label>
              <input
                type="text"
                readOnly
                disabled
                value={activeBiller.billerName}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-100 text-slate-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nickname <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              value={modifyNickname}
              onChange={(e) => {
                setModifyNickname(e.target.value);
                setModifyError(null);
              }}
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
            />
            {modifyError && <p className="mt-1 text-xs text-red-600">{modifyError}</p>}
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setSubView('list')}
              className="px-4 py-2 text-xs font-semibold border border-slate-300 rounded-lg text-slate-700 cursor-pointer"
            >
              {t.cancel}
            </button>
            <button
              type="button"
              onClick={() => {
                const err = validateNickname(modifyNickname);
                if (err) {
                  setModifyError(err);
                  return;
                }
                setSubView('modify-review');
              }}
              className="px-5 py-2 text-xs font-semibold text-white rounded-lg cursor-pointer"
              style={{ backgroundColor: theme.primaryColor }}
            >
              Modify
            </button>
          </div>
        </div>
      )}

      {subView === 'modify-review' && activeBiller && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-6 space-y-4">
          <h2 className="font-display font-semibold text-base text-slate-900">
            Confirm Updated Biller Details
          </h2>
          <div className="divide-y divide-slate-100 text-sm">
            <Row label="Biller" value={activeBiller.billerName} />
            <Row label="Previous Nickname" value={activeBiller.nickname} />
            <Row label="Updated Nickname" value={modifyNickname.trim()} />
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setSubView('modify-form')}
              className="px-4 py-2 text-xs font-semibold border border-slate-300 rounded-lg text-slate-700 cursor-pointer"
            >
              {t.back}
            </button>
            <button
              type="button"
              onClick={() => {
                onUpdateBiller({ ...activeBiller, nickname: modifyNickname.trim() });
                setSubView('list');
              }}
              className="px-5 py-2 text-xs font-semibold text-white rounded-lg cursor-pointer"
              style={{ backgroundColor: theme.primaryColor }}
            >
              Confirm Update
            </button>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM & SUCCESS */}
      {subView === 'delete-confirm' && activeBiller && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-6 space-y-4">
          <h2 className="font-display font-semibold text-base text-slate-900">
            Confirm Delete Biller
          </h2>
          <p className="text-xs text-slate-600">
            Deleting this biller withdraws your consent and cancels any linked autopay mandate.
          </p>
          <div className="divide-y divide-slate-100 text-sm">
            <Row label="Nickname" value={activeBiller.nickname} />
            <Row label="Biller Account ID" value={activeBiller.billerAccountId} mono />
            <Row
              label="Account Number"
              value={maskSensitiveValue(activeBiller.authenticatorValue, 4)}
              mono
            />
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setSubView('list')}
              className="px-4 py-2 text-xs font-semibold border border-slate-300 rounded-lg text-slate-700 cursor-pointer"
            >
              {t.cancel}
            </button>
            <button
              type="button"
              onClick={() => {
                setDeletedBillerSummary(activeBiller);
                onDeleteBiller(activeBiller.id);
                setSubView('delete-success');
              }}
              className="px-5 py-2 text-xs font-semibold text-white bg-red-700 rounded-lg hover:bg-red-800 cursor-pointer"
            >
              Confirm &amp; Delete
            </button>
          </div>
        </div>
      )}

      {subView === 'delete-success' && deletedBillerSummary && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-6 space-y-4">
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-700 shrink-0" />
            <div>
              <h2 className="font-display font-bold text-base text-slate-900">
                Biller Deleted Successfully
              </h2>
              <p className="text-xs text-emerald-800">
                {deletedBillerSummary.nickname} ({deletedBillerSummary.billerAccountId}) and its autopay mandate have been removed.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => downloadDeleteAck(deletedBillerSummary)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold border border-slate-300 rounded-lg text-slate-700 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t.download}</span>
            </button>
            <button
              type="button"
              onClick={() => setSubView('list')}
              className="px-5 py-2 text-xs font-semibold text-white rounded-lg cursor-pointer"
              style={{ backgroundColor: theme.primaryColor }}
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* AUTOPAY MANDATE AUTHORISATION MODAL */}
      {mandateModalBiller && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Autopay Mandate Confirmation"
        >
          <div className="bg-white rounded-xl border border-slate-200 max-w-sm w-full p-5 space-y-4 shadow-xl">
            <h3 className="font-display font-bold text-base text-slate-900">
              {mandateModalBiller.targetState
                ? 'Authorise Autopay Mandate'
                : 'Cancel Autopay Mandate'}
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              {mandateModalBiller.targetState
                ? `Enable automatic bill payments for ${mandateModalBiller.biller.billerName} (${mandateModalBiller.biller.nickname}) from your primary account?`
                : `Are you sure you want to disable Autopay for ${mandateModalBiller.biller.nickname}?`}
            </p>
            <div className="flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setMandateModalBiller(null)}
                className="px-4 py-2 text-xs font-semibold border border-slate-300 rounded-lg text-slate-700 cursor-pointer"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={() => {
                  onUpdateBiller({
                    ...mandateModalBiller.biller,
                    autopayEnabled: mandateModalBiller.targetState,
                  });
                  setMandateModalBiller(null);
                }}
                className="px-4 py-2 text-xs font-semibold text-white rounded-lg cursor-pointer"
                style={{ backgroundColor: theme.primaryColor }}
              >
                {mandateModalBiller.targetState ? 'Authorise' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const StatusText: React.FC<{ status: SavedBiller['status'] }> = ({ status }) => {
  if (status === 'Active') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
        <span>Active</span>
      </span>
    );
  }
  if (status === 'Pending for authorization') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700">
        <Clock className="w-3.5 h-3.5 shrink-0" />
        <span>Pending for authorization</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700">
      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
      <span>Rejected</span>
    </span>
  );
};

const AutopaySwitch: React.FC<{
  biller: SavedBiller;
  onToggle: (target: boolean) => void;
}> = ({ biller, onToggle }) => {
  const canToggle = biller.supportsAutopay && biller.status === 'Active';
  const titleText = !biller.supportsAutopay
    ? 'Autopay is not supported by this biller'
    : biller.status !== 'Active'
      ? 'Available only for Active billers'
      : biller.autopayEnabled
        ? 'Disable Autopay'
        : 'Enable Autopay';

  return (
    <button
      type="button"
      role="switch"
      aria-checked={biller.autopayEnabled}
      aria-label={`Autopay for ${biller.nickname}`}
      title={titleText}
      disabled={!canToggle}
      onClick={() => onToggle(!biller.autopayEnabled)}
      className={`inline-flex items-center gap-1.5 text-xs font-semibold transition-opacity ${
        !canToggle ? 'opacity-45 cursor-not-allowed' : 'cursor-pointer'
      }`}
    >
      <span
        className={`w-8 h-4.5 rounded-full relative transition-colors inline-block ${
          biller.autopayEnabled ? 'bg-emerald-600' : 'bg-slate-300'
        }`}
      >
        <span
          className={`w-3.5 h-3.5 rounded-full bg-white absolute top-0.5 transition-transform ${
            biller.autopayEnabled ? 'translate-x-4' : 'translate-x-0.5'
          }`}
        />
      </span>
      <span className="text-slate-700">{biller.autopayEnabled ? 'ON' : 'OFF'}</span>
    </button>
  );
};

const Row: React.FC<{ label: string; value: string; mono?: boolean }> = ({
  label,
  value,
  mono,
}) => (
  <div className="flex items-center justify-between gap-4 py-2.5">
    <span className="text-slate-500">{label}</span>
    <span className={`text-right font-medium text-slate-900 ${mono ? 'font-mono-tabular' : ''}`}>
      {value}
    </span>
  </div>
);
