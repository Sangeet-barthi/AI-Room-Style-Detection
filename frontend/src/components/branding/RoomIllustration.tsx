import { cn } from '@/lib/utils'

/**
 * A hand-built vector interior scene used for hero and brand panels.
 * Rendering it as SVG keeps the bundle small, makes it theme-aware and
 * avoids shipping stock photography with the project.
 */
export function RoomIllustration({
  className,
  variant = 'light',
}: {
  className?: string
  variant?: 'light' | 'dark'
}) {
  const palette =
    variant === 'dark'
      ? {
          wall: '#221F1C',
          floor: '#2E2924',
          window: '#3A4550',
          frame: '#4A433B',
          sofa: '#5C5348',
          sofaBack: '#6B6053',
          table: '#4A4036',
          plant: '#55614E',
          accent: '#C4A06A',
          art: '#3A342D',
        }
      : {
          wall: '#EFEAE1',
          floor: '#D8C8B0',
          window: '#DCE8EE',
          frame: '#BCB1A0',
          sofa: '#9B8F7E',
          sofaBack: '#AA9D8A',
          table: '#7A6B59',
          plant: '#7E8B6C',
          accent: '#8A6A46',
          art: '#E3DACB',
        }

  return (
    <svg
      viewBox="0 0 600 400"
      className={cn('block', className)}
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label="Illustration of a living room with a large window, sofa, low table and a floor plant"
    >
      <rect width="600" height="400" fill={palette.wall} />
      <rect y="268" width="600" height="132" fill={palette.floor} />

      {/* Window */}
      <rect x="48" y="52" width="176" height="176" fill={palette.window} />
      <rect
        x="48"
        y="52"
        width="176"
        height="176"
        fill="none"
        stroke={palette.frame}
        strokeWidth="7"
      />
      <line x1="136" y1="52" x2="136" y2="228" stroke={palette.frame} strokeWidth="7" />
      <line x1="48" y1="140" x2="224" y2="140" stroke={palette.frame} strokeWidth="7" />

      {/* Wall art */}
      <rect x="330" y="64" width="150" height="96" fill={palette.art} />
      <rect x="330" y="64" width="150" height="96" fill="none" stroke={palette.frame} strokeWidth="4" />
      <path d="M345 146 L385 104 L415 132 L445 96 L465 146 Z" fill={palette.accent} opacity="0.45" />

      {/* Sofa */}
      <rect x="300" y="196" width="244" height="46" rx="8" fill={palette.sofaBack} />
      <rect x="292" y="232" width="260" height="60" rx="10" fill={palette.sofa} />
      <rect x="292" y="232" width="26" height="60" rx="10" fill={palette.sofaBack} />
      <rect x="526" y="232" width="26" height="60" rx="10" fill={palette.sofaBack} />
      <rect x="338" y="216" width="48" height="30" rx="6" fill={palette.accent} opacity="0.55" />

      {/* Low table */}
      <rect x="336" y="312" width="164" height="14" rx="5" fill={palette.table} />
      <rect x="352" y="326" width="9" height="26" fill={palette.table} />
      <rect x="475" y="326" width="9" height="26" fill={palette.table} />

      {/* Rug */}
      <ellipse cx="418" cy="352" rx="150" ry="26" fill={palette.accent} opacity="0.16" />

      {/* Plant */}
      <path
        d="M150 320 C120 290 126 254 152 240 C178 254 184 290 154 320 Z"
        fill={palette.plant}
      />
      <rect x="140" y="318" width="26" height="36" rx="5" fill={palette.table} />

      {/* Floor lamp */}
      <line x1="248" y1="196" x2="248" y2="330" stroke={palette.frame} strokeWidth="5" />
      <path d="M226 196 L270 196 L262 166 L234 166 Z" fill={palette.accent} opacity="0.7" />
      <ellipse cx="248" cy="332" rx="22" ry="6" fill={palette.frame} />
    </svg>
  )
}
