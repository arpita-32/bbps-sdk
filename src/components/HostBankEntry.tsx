import React, { useState } from 'react';
import { ArrowRight, ArrowUpRight, ChevronDown, CreditCard, Landmark, Send, ShieldCheck } from 'lucide-react';
import { HostTheme, SdkConfig, ViewportMode } from '../types/sdk';
import { BMnemonicLogo } from './BrandAssets';

interface HostBankEntryProps {
  theme: HostTheme;
  config: SdkConfig;
  viewport: ViewportMode;
  onLaunchSdk: () => void;
}

export const HostBankEntry: React.FC<HostBankEntryProps> = ({
  theme,
  viewport,
  onLaunchSdk,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [surfaceView, setSurfaceView] = useState<'netbanking' | 'mobile-grid' | 'dark-surface'>('netbanking');

  const isMobile = viewport === 'mobile';

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
      {/* Host Bank Top Header */}
      <div
        className="px-4 sm:px-6 py-3.5 border-b border-slate-200 flex items-center justify-between gap-4"
        style={{ backgroundColor: theme.headerBg, color: theme.headerText }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center font-display font-bold text-xs text-white shrink-0"
            style={{ backgroundColor: theme.primaryColor }}
          >
            {theme.shortCode}
          </div>
          <span className="font-display font-bold text-sm sm:text-base truncate">
            {theme.bankName}
          </span>
        </div>

        {!isMobile && (
          <div className="flex items-center gap-5 text-xs font-medium">
            <span className="opacity-75">Accounts</span>
            <span className="opacity-75">Transfers</span>
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((prev) => !prev)}
                className="inline-flex items-center gap-1.5 font-semibold hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>Payments &amp; Bills</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white text-slate-900 border border-slate-200 rounded-lg shadow-lg py-1.5 z-30">
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onLaunchSdk();
                    }}
                    className="w-full px-3.5 py-2.5 text-left text-xs font-semibold flex items-center gap-2.5 hover:bg-slate-50 cursor-pointer"
                  >
                    <BMnemonicLogo size={24} />
                    <span>Bill Pay</span>
                  </button>
                  <div className="px-3.5 py-2 text-xs text-slate-500 border-t border-slate-100">
                    NEFT / RTGS / IMPS
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={onLaunchSdk}
          className="px-3.5 py-2 rounded-lg text-xs font-semibold text-white transition-opacity hover:opacity-90 whitespace-nowrap shrink-0 cursor-pointer"
          style={{ backgroundColor: theme.primaryColor }}
        >
          Open Bill Pay
        </button>
      </div>

      {/* Host Surface Switcher (Net-Banking / Mobile Home Grid / Dark Surface) */}
      <div className="px-4 sm:px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-slate-600">
          Stage 1 Entry Preview · Host Application Surface
        </div>
        <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg">
          <button
            type="button"
            onClick={() => setSurfaceView('netbanking')}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              surfaceView === 'netbanking' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Net-Banking
          </button>
          <button
            type="button"
            onClick={() => setSurfaceView('mobile-grid')}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              surfaceView === 'mobile-grid' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Mobile Home Grid
          </button>
          <button
            type="button"
            onClick={() => setSurfaceView('dark-surface')}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              surfaceView === 'dark-surface' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Dark Background
          </button>
        </div>
      </div>

      {/* Host Body */}
      <div className={`p-4 sm:p-6 ${surfaceView === 'dark-surface' ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}`}>
        {/* Account Overview Strip */}
        <div
          className={`p-4 rounded-xl border mb-5 flex flex-wrap items-center justify-between gap-4 ${
            surfaceView === 'dark-surface'
              ? 'bg-slate-800/80 border-slate-700'
              : 'bg-slate-50 border-slate-200'
          }`}
        >
          <div>
            <div className={`text-xs ${surfaceView === 'dark-surface' ? 'text-slate-300' : 'text-slate-500'}`}>
              Primary Savings Account · XXXX XXXX 4821
            </div>
            <div className="font-mono-tabular text-2xl font-semibold mt-1">
              ₹64,250.75
            </div>
          </div>
          <div className={`text-xs ${surfaceView === 'dark-surface' ? 'text-slate-300' : 'text-slate-600'}`}>
            Welcome, Aarav Sharma · Customer ID: CUST-88412
          </div>
        </div>

        {/* Surface specific entry */}
        {surfaceView === 'netbanking' && (
          <div className="space-y-4">
            <h2 className="font-display text-base font-semibold">Quick Banking Services</h2>
            <div className={`grid gap-3 ${isMobile ? 'grid-cols-1' : 'grid-cols-2 sm:grid-cols-4'}`}>
              <button
                type="button"
                onClick={onLaunchSdk}
                className="group text-left p-4 rounded-xl border-2 transition-all hover:shadow-sm cursor-pointer focus-visible:outline-2"
                style={{ borderColor: theme.primaryColor, backgroundColor: theme.accentSoftBg }}
              >
                <div className="flex items-center justify-between mb-3">
                  <BMnemonicLogo size={36} />
                  <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </div>
                <div className="font-display font-semibold text-sm text-slate-900">
                  Bill Payments
                </div>
                <div className="text-xs text-slate-600 mt-1">
                  Electricity, Card, Gas &amp; more
                </div>
              </button>

              <div className="p-4 rounded-xl border border-slate-200 bg-white">
                <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 mb-3">
                  <Send className="w-4 h-4" />
                </div>
                <div className="font-display font-semibold text-sm text-slate-900">Fund Transfer</div>
                <div className="text-xs text-slate-500 mt-1">IMPS, NEFT &amp; RTGS</div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-white">
                <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 mb-3">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div className="font-display font-semibold text-sm text-slate-900">Cards</div>
                <div className="text-xs text-slate-500 mt-1">Manage limits &amp; PIN</div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-white">
                <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 mb-3">
                  <Landmark className="w-4 h-4" />
                </div>
                <div className="font-display font-semibold text-sm text-slate-900">Deposits</div>
                <div className="text-xs text-slate-500 mt-1">Fixed &amp; Recurring</div>
              </div>
            </div>
          </div>
        )}

        {surfaceView === 'mobile-grid' && (
          <div className="max-w-xs mx-auto border border-slate-200 rounded-2xl p-4 bg-white text-slate-900">
            <div className="text-xs font-semibold text-slate-500 mb-3">Home Actions</div>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={onLaunchSdk}
                className="flex flex-col items-center gap-2 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer"
              >
                <BMnemonicLogo size={36} />
                <span className="text-xs font-semibold text-center leading-tight">Pay Bills</span>
              </button>
              <div className="flex flex-col items-center gap-2 p-3 rounded-xl border border-slate-100 bg-slate-50/70">
                <div className="w-9 h-9 rounded-lg bg-slate-200/70 flex items-center justify-center text-slate-600">
                  <Send className="w-4 h-4" />
                </div>
                <span className="text-xs font-medium text-slate-600 text-center leading-tight">Send</span>
              </div>
              <div className="flex flex-col items-center gap-2 p-3 rounded-xl border border-slate-100 bg-slate-50/70">
                <div className="w-9 h-9 rounded-lg bg-slate-200/70 flex items-center justify-center text-slate-600">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <span className="text-xs font-medium text-slate-600 text-center leading-tight">Insure</span>
              </div>
            </div>
          </div>
        )}

        {surfaceView === 'dark-surface' && (
          <div className="space-y-4">
            <h2 className="font-display text-base font-semibold text-white">Dark-Mode Entry Grid</h2>
            <div className={`grid gap-3 ${isMobile ? 'grid-cols-1' : 'grid-cols-3'}`}>
              <button
                type="button"
                onClick={onLaunchSdk}
                className="flex items-center gap-3 p-4 rounded-xl bg-slate-800 border border-slate-700 hover:border-slate-500 text-left cursor-pointer"
              >
                <BMnemonicLogo size={40} />
                <div className="min-w-0 flex-1">
                  <div className="font-display font-semibold text-sm text-white">Bill Pay</div>
                  <div className="text-xs text-slate-300 mt-0.5">Stage 1 B Mnemonic on Dark</div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
