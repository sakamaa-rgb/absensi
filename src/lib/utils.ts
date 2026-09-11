import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { AttendanceStatus } from '../types/database';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatJakartaDate(dateInput: string | Date = new Date()): string {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d);
}

export function formatJakartaTime(dateInput: string | Date = new Date()): string {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(d);
}

export function formatISODateOnly(dateInput: string | Date = new Date()): string {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getStatusBadgeConfig(status: AttendanceStatus) {
  switch (status) {
    case 'HADIR':
      return {
        label: 'Hadir',
        bg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
        dot: 'bg-emerald-400',
        cardBorder: 'border-emerald-500/20',
      };
    case 'TERLAMBAT':
      return {
        label: 'Terlambat',
        bg: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
        dot: 'bg-amber-400',
        cardBorder: 'border-amber-500/20',
      };
    case 'IZIN':
      return {
        label: 'Izin',
        bg: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
        dot: 'bg-blue-400',
        cardBorder: 'border-blue-500/20',
      };
    case 'SAKIT':
      return {
        label: 'Sakit',
        bg: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
        dot: 'bg-purple-400',
        cardBorder: 'border-purple-500/20',
      };
    case 'ALPHA':
      return {
        label: 'Alpha',
        bg: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
        dot: 'bg-rose-400',
        cardBorder: 'border-rose-500/20',
      };
    case 'BELUM ABSEN':
    default:
      return {
        label: 'Belum Absen',
        bg: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
        dot: 'bg-slate-400',
        cardBorder: 'border-slate-500/20',
      };
  }
}
