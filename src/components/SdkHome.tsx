import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Search, Sparkles } from 'lucide-react';
import {
  BillerCategory,
  BillerDefinition,
  HostTheme,
  SavedBiller,
  SdkLanguage,
  ViewportMode,
} from '../types/sdk';
import { TRANSLATIONS } from '../i18n/translations';
import { CategoryIcon } from './CategoryIcon';
import { formatCurrency, maskSensitiveValue } from '../utils/receipt';

interface SdkHomeProps {
  theme: HostTheme;
  language: SdkLanguage;
  viewport: ViewportMode;
  categories: BillerCategory[];
  allBillers: BillerDefinition[];
  savedBillers: SavedBiller[];
  onSelectCategory: (category: BillerCategory) => void;
  onSelectBillerDirect: (biller: BillerDefinition) => void;
  onFetchSavedBiller: (saved: SavedBiller) => void;
  onOpenAddBiller: () => void;
}

export const SdkHome: React.FC<SdkHomeProps> = ({
  theme,
  language,
  viewport,
  categories,
  allBillers,
  savedBillers,
  onSelectCategory,
  onSelectBillerDirect,
  onFetchSavedBiller,
  onOpenAddBiller,
}) => {
  const t = TRANSLATIONS[language];
  const [searchQuery, setSearchQuery] = useState('');
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);

  const isMobile = viewport === 'mobile';

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return allBillers.filter((b) => b.name.toLowerCase().includes(q));
  }, [searchQuery, allBillers]);

  const activeOrPendingSaved = useMemo(
    () => savedBillers.filter((b) => b.status === 'Active'),
    [savedBillers]
  );

  const totalPages = Math.max(1, Math.ceil(activeOrPendingSaved.length / rowsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedBillers = activeOrPendingSaved.slice(
    (safePage - 1) * rowsPerPage,
    safePage * rowsPerPage
  );

  return (
    <div className="space-y-6">
      {/* Top Action Bar: Search + Add Biller */}
      <div className={`flex gap-3 ${isMobile ? 'flex-col' : 'items-center justify-between'}`}>
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.searchBillersPlaceholder}
            aria-label={t.searchBillersPlaceholder}
            className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/15"
          />
        </div>
        <button
          type="button"
          onClick={onOpenAddBiller}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold text-white rounded-lg transition-opacity hover:opacity-90 whitespace-nowrap shrink-0 cursor-pointer"
          style={{ backgroundColor: theme.primaryColor }}
        >
          <Plus className="w-4 h-4" />
          <span>{t.addBiller}</span>
        </button>
      </div>

      {/* Live Biller Search Results */}
      {searchQuery.trim() !== '' && (
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-semibold text-sm text-slate-900">
              Search Results ({searchResults.length})
            </h3>
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-xs font-medium text-slate-500 hover:text-slate-900 cursor-pointer"
            >
              Clear
            </button>
          </div>
          {searchResults.length === 0 ? (
            <div className="py-6 text-center text-sm text-slate-500">{t.noBillersFound}</div>
          ) : (
            <div className={`grid gap-2.5 ${isMobile ? 'grid-cols-1' : 'grid-cols-2 sm:grid-cols-3'}`}>
              {searchResults.map((biller) => (
                <button
                  key={biller.id}
                  type="button"
                  onClick={() => onSelectBillerDirect(biller)}
                  className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:border-slate-400 text-left transition-colors cursor-pointer"
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-display font-bold text-xs shrink-0"
                    style={{ backgroundColor: biller.brandColor }}
                  >
                    {biller.shortCode}
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-sm text-slate-900 truncate">{biller.name}</div>
                    <div className="text-xs text-slate-500 truncate">
                      {categories.find((c) => c.id === biller.categoryId)?.name}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Biller Categories Grid */}
      <section aria-labelledby="categories-heading">
        <div className="flex items-center justify-between mb-3">
          <h2 id="categories-heading" className="font-display font-semibold text-base text-slate-900">
            {t.billerCategories}
          </h2>
          <span className="text-xs text-slate-500 tabular-nums">{categories.length} categories</span>
        </div>

        <div
          className={`grid gap-2.5 ${
            isMobile
              ? 'grid-cols-2'
              : viewport === 'tablet'
                ? 'grid-cols-4'
                : 'grid-cols-5 lg:grid-cols-7'
          }`}
        >
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelectCategory(cat)}
              className="group flex flex-col items-center justify-center gap-2 p-3 rounded-xl bg-white border border-slate-200 hover:border-slate-400 transition-colors text-center min-h-[88px] cursor-pointer focus-visible:outline-2"
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center transition-transform group-hover:scale-105"
                style={{ backgroundColor: theme.accentSoftBg, color: theme.primaryColor }}
              >
                <CategoryIcon iconKey={cat.iconKey} className="w-4 h-4" />
              </div>
              <span className="text-xs font-medium text-slate-800 leading-tight">
                {cat.name}
              </span>
              {cat.isMasterSynced && (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700">
                  <Sparkles className="w-2.5 h-2.5" /> New
                </span>
              )}
            </button>
          ))}
        </div>
      </section>

      {/* Registered Billers with Pending Bills */}
      <section aria-labelledby="registered-billers-heading" className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="registered-billers-heading" className="font-display font-semibold text-base text-slate-900">
              {t.registeredBillers}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Quick fetch &amp; pay for your saved active billers
            </p>
          </div>
          {activeOrPendingSaved.length > 0 && (
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <label htmlFor="home-rows-select">Rows:</label>
              <select
                id="home-rows-select"
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="border border-slate-300 rounded-md px-2 py-1 text-xs bg-white text-slate-900"
              >
                <option value={3}>3</option>
                <option value={5}>5</option>
                <option value={10}>10</option>
              </select>
            </div>
          )}
        </div>

        {activeOrPendingSaved.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm font-medium text-slate-700">No registered billers yet</p>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              Add a biller to view pending dues and pay in one tap.
            </p>
            <button
              type="button"
              onClick={onOpenAddBiller}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white rounded-lg cursor-pointer"
              style={{ backgroundColor: theme.primaryColor }}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t.addBiller}</span>
            </button>
          </div>
        ) : isMobile ? (
          /* Mobile 320px Card List (No horizontal scroll) */
          <div className="divide-y divide-slate-200">
            {paginatedBillers.map((sb, idx) => (
              <div key={sb.id} className="p-3.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs text-slate-500 tabular-nums">
                    #{(safePage - 1) * rowsPerPage + idx + 1} · {sb.nickname}
                  </div>
                  <div className="font-semibold text-sm text-slate-900 truncate">
                    {sb.billerName}
                  </div>
                  <div className="text-xs text-slate-600 font-mono-tabular mt-0.5">
                    {sb.authenticatorLabel}: {maskSensitiveValue(sb.authenticatorValue, 4)}
                  </div>
                  <div className="text-xs font-semibold text-slate-900 font-mono-tabular mt-1">
                    {sb.pendingAmount !== null ? formatCurrency(sb.pendingAmount) : 'No dues'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onFetchSavedBiller(sb)}
                  className="px-3 py-1.5 text-xs font-semibold text-white rounded-lg shrink-0 cursor-pointer"
                  style={{ backgroundColor: theme.primaryColor }}
                >
                  {t.fetch}
                </button>
              </div>
            ))}
          </div>
        ) : (
          /* Desktop / Tablet Table */
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <th className="py-2.5 px-4 w-14">S.No</th>
                  <th className="py-2.5 px-4">Biller Name</th>
                  <th className="py-2.5 px-4">Authenticator</th>
                  <th className="py-2.5 px-4 text-right">Pending Bill</th>
                  <th className="py-2.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {paginatedBillers.map((sb, idx) => (
                  <tr key={sb.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 text-xs text-slate-500 tabular-nums">
                      {(safePage - 1) * rowsPerPage + idx + 1}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-900">{sb.billerName}</div>
                      <div className="text-xs text-slate-500">{sb.nickname}</div>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600">
                      <span>{sb.authenticatorLabel}: </span>
                      <span className="font-mono-tabular font-medium text-slate-800">
                        {maskSensitiveValue(sb.authenticatorValue, 4)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono-tabular font-semibold text-slate-900">
                      {sb.pendingAmount !== null ? (
                        <div>
                          <div>{formatCurrency(sb.pendingAmount)}</div>
                          {sb.dueDate && (
                            <div className="text-[11px] font-normal text-slate-500">
                              Due {sb.dueDate}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs font-normal text-slate-500">No dues</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => onFetchSavedBiller(sb)}
                        className="px-3.5 py-1.5 text-xs font-semibold text-white rounded-lg transition-opacity hover:opacity-90 cursor-pointer"
                        style={{ backgroundColor: theme.primaryColor }}
                      >
                        {t.fetch}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeOrPendingSaved.length > 0 && (
          <div className="px-4 py-2.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-600">
            <span className="tabular-nums">
              {(safePage - 1) * rowsPerPage + 1}–
              {Math.min(safePage * rowsPerPage, activeOrPendingSaved.length)} of{' '}
              {activeOrPendingSaved.length}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                aria-label="Previous page"
                className="p-1.5 rounded border border-slate-300 bg-white disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                aria-label="Next page"
                className="p-1.5 rounded border border-slate-300 bg-white disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
