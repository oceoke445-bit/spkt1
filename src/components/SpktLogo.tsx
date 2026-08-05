'use client';

import Image from 'next/image';
import { cn } from '@/components/ui/utils';

// Logo lengkap dengan teks SPKT DIGITAL (background transparan)
const EMBLEM_FULL_SRC = '/spkt-emblem-nobg.png';
const EMBLEM_FULL_WIDTH = 1561;
const EMBLEM_FULL_HEIGHT = 1006;

interface SpktLogoProps {
  className?: string;
  priority?: boolean;
  /** Sembunyikan teks (untuk sidebar dan mobile header - gunakan emblem tanpa teks) */
  showText?: boolean;
}

export function SpktLogo({ className, priority = false, showText = true }: SpktLogoProps) {
  // Selalu pakai logo full yang sudah transparan
  return (
    <div className={cn('@container flex w-full flex-col items-center', className)}>
      <Image
        src={EMBLEM_FULL_SRC}
        alt="SPKT Digital"
        width={EMBLEM_FULL_WIDTH}
        height={EMBLEM_FULL_HEIGHT}
        priority={priority}
        className="h-auto w-full object-contain"
      />
      
      {showText && (
        <div className="w-full text-center -mt-4">
          <h1 className="text-[clamp(1.25rem,6vw,2rem)] font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-gray-200 via-white to-gray-300 drop-shadow-[0_2px_10px_rgba(255,255,255,0.3)]">
            SPKT
          </h1>
          <div className="flex items-center justify-center gap-3 px-4 -mt-1">
            <div className="h-[2px] flex-1 max-w-[50px] bg-gradient-to-r from-transparent via-amber-400 to-amber-500 rounded-full" />
            <h2 className="text-[clamp(0.75rem,2.5vw,1rem)] font-bold tracking-[0.3em] text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500 drop-shadow-[0_1px_8px_rgba(251,191,36,0.4)]">
              DIGITAL
            </h2>
            <div className="h-[2px] flex-1 max-w-[50px] bg-gradient-to-l from-transparent via-amber-400 to-amber-500 rounded-full" />
          </div>
        </div>
      )}
    </div>
  );
}
