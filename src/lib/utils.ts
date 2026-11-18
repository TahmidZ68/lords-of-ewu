import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type {
  MatchStage,
  PaymentMethod,
  PaymentStatus,
  PlayerRegistrationStatus,
  TournamentFormat,
} from '@/types/database';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateStr: string | null | undefined, includeTime = false): string {
  if (!dateStr) return 'TBA';
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return 'TBA';
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...(includeTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  });
}

export function formatCurrency(amount: number | null | undefined, currency = 'BDT'): string {
  if (amount === null || amount === undefined) return '—';
  if (amount === 0) return 'Free';
  return `${currency} ${Number(amount).toLocaleString('en-US')}`;
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export const FORMAT_LABELS: Record<TournamentFormat, string> = {
  group_stage: 'Group Stage',
  round_robin: 'Round Robin',
  knockout: 'Knockout',
  group_knockout: 'Group Stage + Knockout',
};

export const STAGE_LABELS: Record<MatchStage, string> = {
  group: 'Group Stage',
  round_robin: 'League / Round Robin',
  round_of_16: 'Round of 16',
  quarter_final: 'Quarter-Final',
  semi_final: 'Semi-Final',
  third_place: 'Third Place Play-Off',
  final: 'Final',
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  bkash: 'bKash',
  nagad: 'Nagad',
  bank_transfer: 'Bank Transfer',
  other: 'Other Method',
};

export const REGISTRATION_STATUS_META: Record<
  PlayerRegistrationStatus,
  { label: string; className: string }
> = {
  submitted: { label: 'Submitted', className: 'bg-charcoal-100 text-charcoal-700 border-charcoal-300' },
  pending_payment: { label: 'Pending Payment', className: 'bg-gold-100 text-gold-600 border-gold-300' },
  pending_review: { label: 'Pending Review', className: 'bg-amber-100 text-amber-800 border-amber-300' },
  approved: { label: 'Approved', className: 'bg-forest-100 text-forest-700 border-forest-300' },
  rejected: { label: 'Rejected', className: 'bg-red-100 text-red-800 border-red-300' },
  cancelled: { label: 'Cancelled', className: 'bg-neutral-200 text-neutral-700 border-neutral-300' },
};

export const PAYMENT_STATUS_META: Record<
  PaymentStatus,
  { label: string; className: string }
> = {
  unsubmitted: { label: 'Unsubmitted', className: 'bg-neutral-100 text-neutral-700 border-neutral-300' },
  pending_verification: { label: 'Pending Verification', className: 'bg-amber-100 text-amber-800 border-amber-300' },
  verified: { label: 'Verified', className: 'bg-forest-100 text-forest-700 border-forest-300' },
  rejected: { label: 'Rejected', className: 'bg-red-100 text-red-800 border-red-300' },
  refunded: { label: 'Refunded', className: 'bg-slate-200 text-slate-800 border-slate-300' },
};

export function exportToCsv(
  filename: string,
  headers: string[],
  rows: Array<Array<string | number | boolean | null | undefined>>
): void {
  const escapeCell = (val: string | number | boolean | null | undefined): string => {
    const str = val === null || val === undefined ? '' : String(val);
    if (/[",\n\r]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const lines = [
    headers.map(escapeCell).join(','),
    ...rows.map((row) => row.map(escapeCell).join(',')),
  ];

  const blob = new Blob([lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
