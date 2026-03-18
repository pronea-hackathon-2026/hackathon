import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function scoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-600'
  if (score >= 60) return 'text-amber-600'
  return 'text-red-500'
}

export function scoreBg(score: number): string {
  if (score >= 80) return 'bg-emerald-50 text-emerald-700 border-emerald-200'
  if (score >= 60) return 'bg-amber-50 text-amber-700 border-amber-200'
  return 'bg-red-50 text-red-600 border-red-200'
}

export const SOURCE_COLORS: Record<string, string> = {
  email: 'bg-blue-50 text-blue-700 border-blue-200',
  manual: 'bg-slate-100 text-slate-600 border-slate-300',
  startupjobs: 'bg-violet-50 text-violet-700 border-violet-200',
  linkedin: 'bg-sky-50 text-sky-700 border-sky-200',
}

export const STATUS_COLORS: Record<string, string> = {
  inbox: 'bg-slate-100 text-slate-600 border-slate-300',
  shortlisted: 'bg-blue-50 text-blue-700 border-blue-200',
  interview_scheduled: 'bg-amber-50 text-amber-700 border-amber-200',
  interview_done: 'bg-violet-50 text-violet-700 border-violet-200',
  final_round: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  rejected: 'bg-red-50 text-red-600 border-red-200',
}

export const STATUS_LABELS: Record<string, string> = {
  inbox: 'Inbox',
  shortlisted: 'Shortlisted',
  interview_scheduled: 'Interview Scheduled',
  interview_done: 'Interview Done',
  final_round: 'Final Round',
  rejected: 'Rejected',
}
