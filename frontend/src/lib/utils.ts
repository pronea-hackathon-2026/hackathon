import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function scoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-400'
  if (score >= 60) return 'text-amber-400'
  return 'text-red-400'
}

export function scoreBg(score: number): string {
  if (score >= 80) return 'bg-emerald-950 text-emerald-400 border-emerald-800'
  if (score >= 60) return 'bg-amber-950 text-amber-400 border-amber-800'
  return 'bg-red-950 text-red-400 border-red-800'
}

export const SOURCE_COLORS: Record<string, string> = {
  email: 'bg-blue-950 text-blue-400 border-blue-800',
  manual: 'bg-slate-800 text-slate-300 border-slate-600',
  startupjobs: 'bg-violet-950 text-violet-400 border-violet-800',
  linkedin: 'bg-sky-950 text-sky-400 border-sky-800',
}

export const STATUS_COLORS: Record<string, string> = {
  inbox: 'bg-slate-800 text-slate-300 border-slate-600',
  shortlisted: 'bg-blue-950 text-blue-400 border-blue-800',
  interview_scheduled: 'bg-amber-950 text-amber-400 border-amber-800',
  interview_done: 'bg-violet-950 text-violet-400 border-violet-800',
  final_round: 'bg-emerald-950 text-emerald-400 border-emerald-800',
  rejected: 'bg-red-950 text-red-400 border-red-800',
}

export const STATUS_LABELS: Record<string, string> = {
  inbox: 'Inbox',
  shortlisted: 'Shortlisted',
  interview_scheduled: 'Interview Scheduled',
  interview_done: 'Interview Done',
  final_round: 'Final Round',
  rejected: 'Rejected',
}
