import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generatePassword(length: number = 16): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

export function calculatePercentile(score: number, allScores: number[]): number {
  const sorted = [...allScores].sort((a, b) => a - b);
  const rank = sorted.filter(s => s < score).length;
  return Math.round((rank / sorted.length) * 100);
}

export function getPercentileColor(percentile: number): string {
  if (percentile >= 90) return 'bg-green-100 dark:bg-green-900/30';
  if (percentile >= 75) return 'bg-blue-100 dark:bg-blue-900/30';
  if (percentile >= 50) return 'bg-yellow-100 dark:bg-yellow-900/30';
  if (percentile >= 25) return 'bg-orange-100 dark:bg-orange-900/30';
  return 'bg-red-100 dark:bg-red-900/30';
}

export function formatDate(date: Date | null): string {
  if (!date) return 'N/A';
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export function calculateStandardDeviation(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(variance);
}

export function isOutlierScore(score: number, mean: number, stdDev: number): boolean {
  return Math.abs(score - mean) > 2 * stdDev;
}
