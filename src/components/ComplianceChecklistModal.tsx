import React from 'react';
import { CheckCircle2, ShieldCheck, X } from 'lucide-react';
import { BRAND_ASSET_KIT_VERSION, SDK_VERSION } from '../data/mockBillerMaster';

interface ComplianceChecklistModalProps {
  onClose: () => void;
}

const CHECKS = [
  {
    title: 'Stage 1: B mnemonic at host entry point',
    detail: 'Rendered on Host Net-Banking, Mobile Grid, Dropdown Menu, and Dark Background entry tiles.',
  },
  {
    title: 'Stage 2: Bharat Connect horizontal logo on mandated screens',
    detail: 'Displayed on Selection of Biller, Bill Fetch, Bill Payment, Transaction History, and Complaint Management.',
  },
  {
    title: 'Stage 2: Top right-hand corner placement & minimum 20 px height',
    detail: 'Locked at 22–24 px height with preserved aspect ratio, dark-header variant auto-selected, and immune to host override.',
  },
  {
    title: 'Stage 3: B Assured logo on payment confirmation & receipts only for success',
    detail: 'Withheld on Failed, Pending, and Network-Lost screens; rendered exclusively on Success outcomes.',
  },
  {
    title: 'Stage 3: B Assured minimum 30 px on white background',
    detail: 'Confirmation screen enforces ≥ 36 px white badge; digital receipt places top-left; A4 paper receipt places top-right (30 mm).',
  },
  {
    title: 'Sonic branding played simultaneously with B Assured on success',
    detail: 'Deterministic Web Audio confirmation chime triggers once per successful payment and respects device muted state.',
  },
  {
    title: 'B-Connect Txn ID and Consumer Convenience Fee (CCF) on every receipt',
    detail: 'Both fields are mandatory and rendered on digital & printable A4 receipts even when CCF is ₹0.00.',
  },
];

export const ComplianceChecklistModal: React.FC<ComplianceChecklistModalProps> = ({
  onClose,
}) => {
  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="NPCI Certification Compliance Checklist"
    >
      <div className="bg-white rounded-xl border border-slate-200 max-w-xl w-full shadow-xl overflow-hidden">
        <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-700" />
            <div>
              <h2 className="font-display font-bold text-base text-slate-900">
                NPCI Brand Compliance Checklist
              </h2>
              <p className="text-xs text-slate-500">
                SDK v{SDK_VERSION} · Brand Asset Kit {BRAND_ASSET_KIT_VERSION}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close checklist"
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200/70 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 divide-y divide-slate-100 max-h-[70vh] overflow-y-auto">
          {CHECKS.map((item) => (
            <div key={item.title} className="py-3 first:pt-0 last:pb-0 flex items-start gap-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-semibold text-slate-900">{item.title}</div>
                <div className="text-xs text-slate-600 mt-0.5 leading-relaxed">{item.detail}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold bg-slate-900 text-white rounded-lg hover:bg-slate-800 cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
