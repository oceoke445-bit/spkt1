import type { LucideIcon } from 'lucide-react';
import { ClipboardCheck, FileWarning, PartyPopper, FileX2 } from 'lucide-react';

/** Warna ikon konsisten di tema biru gelap — hindari putih polos / abu gelap */
export const iconAccent = {
  sky: { wrap: 'bg-sky-500/20', color: 'text-sky-300' },
  cyan: { wrap: 'bg-cyan-500/20', color: 'text-cyan-300' },
  amber: { wrap: 'bg-amber-500/20', color: 'text-amber-300' },
  emerald: { wrap: 'bg-emerald-500/20', color: 'text-emerald-300' },
  violet: { wrap: 'bg-violet-500/20', color: 'text-violet-300' },
  indigo: { wrap: 'bg-indigo-500/20', color: 'text-indigo-300' },
  rose: { wrap: 'bg-rose-500/20', color: 'text-rose-300' },
  blue: { wrap: 'bg-blue-500/20', color: 'text-blue-300' },
} as const;

export const letterTypeIcons: Record<
  string,
  { icon: LucideIcon; wrap: string; color: string }
> = {
  skck: { icon: ClipboardCheck, ...iconAccent.sky },
  kehilangan: { icon: FileWarning, ...iconAccent.amber },
  kerusakan: { icon: FileX2, ...iconAccent.rose },
  keramaian: { icon: PartyPopper, ...iconAccent.violet },
};

export function IconBadge({
  icon: Icon,
  wrap,
  color,
  size = 'md',
}: {
  icon: LucideIcon;
  wrap: string;
  color: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const box =
    size === 'lg' ? 'w-16 h-16 rounded-2xl' : size === 'sm' ? 'p-2 rounded-lg' : 'p-3 rounded-xl';
  const iconSize = size === 'lg' ? 'w-8 h-8' : size === 'sm' ? 'w-4 h-4' : 'w-6 h-6';

  return (
    <div className={`flex items-center justify-center ${box} ${wrap}`}>
      <Icon className={`${iconSize} ${color}`} />
    </div>
  );
}
