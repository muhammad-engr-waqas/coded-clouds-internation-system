import React, { useState } from 'react';
import { cn } from '@/src/lib/utils';
import { useAppStore } from '@/src/store';

type LogoSize = 'sm' | 'md' | 'lg';

interface BrandLogoProps {
  size?: LogoSize;
  className?: string;
}

const sizeMap: Record<LogoSize, number> = {
  sm: 120,
  md: 160,
  lg: 200,
};

/**
 * BrandLogo — single source of truth for the Coded Clouds logo.
 *
 * Sizes:
 *   lg  → Login page hero (~200px)
 *   md  → Splash / loading screens (~160px)
 *   sm  → Sidebar top-left branding (~120px)
 *
 * Dark-mode: wraps the logo in a soft frosted-glass white chip so the
 * white-background PNG doesn't disappear on dark surfaces.
 *
 * Fallback: If /logo.png is missing, renders a built-in SVG wordmark so
 * the UI never breaks during development.
 */
export function BrandLogo({ size = 'md', className }: BrandLogoProps) {
  const { theme } = useAppStore();
  const [imgError, setImgError] = useState(false);
  const width = sizeMap[size];
  const isDark = theme === 'dark';

  return (
    <div
      className={cn(
        'flex items-center justify-center shrink-0',
        isDark && 'bg-white/10 rounded-2xl px-3 py-2 backdrop-blur-sm ring-1 ring-white/20',
        className,
      )}
    >
      {imgError ? (
        /* ── Inline SVG fallback when logo.png is not yet placed ── */
        <svg
          width={width}
          height={Math.round(width * 0.45)}
          viewBox="0 0 320 144"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-label="Coded Clouds"
          role="img"
        >
          {/* Cloud shape */}
          <ellipse cx="220" cy="76" rx="72" ry="52" fill={isDark ? '#38bdf8' : '#0284c7'} opacity="0.15" />
          <ellipse cx="260" cy="64" rx="52" ry="40" fill={isDark ? '#38bdf8' : '#0284c7'} opacity="0.15" />
          <ellipse cx="240" cy="88" rx="60" ry="38" fill={isDark ? '#38bdf8' : '#0284c7'} opacity="0.2" />
          {/* Wordmark */}
          <text
            x="16"
            y="80"
            fontFamily="system-ui, sans-serif"
            fontWeight="900"
            fontSize="36"
            letterSpacing="2"
            fill={isDark ? '#38bdf8' : '#0284c7'}
          >
            C&lt;&gt;DED
          </text>
          <text
            x="190"
            y="80"
            fontFamily="system-ui, sans-serif"
            fontWeight="900"
            fontSize="36"
            letterSpacing="2"
            fill={isDark ? '#f1f5f9' : '#0c4a6e'}
          >
            CLOUDS
          </text>
        </svg>
      ) : (
        <img
          src="/logo.png"
          alt="Coded Clouds"
          width={width}
          style={{
            width,
            height: 'auto',
            objectFit: 'contain',
            display: 'block',
          }}
          draggable={false}
          onError={() => setImgError(true)}
        />
      )}
    </div>
  );
}
