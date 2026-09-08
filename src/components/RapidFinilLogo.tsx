import React from 'react';

interface RapidFinilLogoProps {
  className?: string;
  height?: number | string;
  width?: number | string;
}

export const RapidFinilLogo: React.FC<RapidFinilLogoProps> = ({
  className = '',
  height = 50,
  width = 'auto',
}) => {
  return (
    <div className={`inline-flex items-center select-none ${className}`}>
      <svg
        viewBox="0 0 460 115"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ height, width }}
        className="overflow-visible"
        aria-label="Rapid Finil Logo"
      >
        <defs>
          {/* Flame & Speedometer Orange-Yellow Gradient */}
          <linearGradient id="rfFlameGrad" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#d97706" />
            <stop offset="25%" stopColor="#ea580c" />
            <stop offset="60%" stopColor="#f59e0b" />
            <stop offset="85%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#fef08a" />
          </linearGradient>

          {/* Inner Flame Highlight Gradient */}
          <linearGradient id="rfInnerFlame" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ea580c" />
            <stop offset="50%" stopColor="#f59e0b" />
            <stop offset="90%" stopColor="#fef08a" />
          </linearGradient>

          {/* Needle Red Gradient */}
          <linearGradient id="rfNeedleGrad" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#7f1d1d" />
            <stop offset="40%" stopColor="#dc2626" />
            <stop offset="100%" stopColor="#ef4444" />
          </linearGradient>

          {/* Text Glossy Enamel Gradient:
              0-35%: Bright Warm Yellow / Golden Orange
              36%: Specular reflection cut (creamy white line)
              38-100%: Vibrant Fiery Red transitioning to deep crimson
          */}
          <linearGradient id="rfTextGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="15%" stopColor="#fde047" />
            <stop offset="34%" stopColor="#f59e0b" />
            {/* Crisp specular gloss highlight line */}
            <stop offset="35%" stopColor="#ffffff" />
            <stop offset="37%" stopColor="#fed7aa" />
            <stop offset="38%" stopColor="#ef4444" />
            <stop offset="65%" stopColor="#dc2626" />
            <stop offset="90%" stopColor="#b91c1c" />
            <stop offset="100%" stopColor="#881337" />
          </linearGradient>

          {/* Upper Glass Specular Shine */}
          <linearGradient id="rfGlossSheen" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
            <stop offset="33%" stopColor="#ffffff" stopOpacity="0.4" />
            <stop offset="35%" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>

          {/* Dimensional Shadow Filter for bold racing depth */}
          <filter id="rfHeavyShadow" x="-15%" y="-15%" width="135%" height="135%">
            <feDropShadow dx="2.5" dy="3.5" stdDeviation="0.5" floodColor="#09090b" floodOpacity="0.95" />
          </filter>
        </defs>

        {/* ================= 1. SPEEDOMETER WITH FLAMES ================= */}
        <g id="speedometer-flames" transform="translate(6, 4)">
          {/* Flame Shadow / Outline Base */}
          <path
            d="M 92,20
               C 76,8 58,11 44,20
               C 34,26 38,34 50,33
               C 36,35 22,39 12,47
               C 6,52 14,56 28,54
               C 16,61 24,70 38,69
               C 50,68 66,63 80,50
               C 70,53 60,57 56,63
               C 68,61 78,55 90,46 Z"
            fill="#18181b"
            transform="translate(1.5, 2)"
          />

          {/* Main Flame Tongue */}
          <path
            d="M 92,20
               C 76,8 58,11 44,20
               C 34,26 38,34 50,33
               C 36,35 22,39 12,47
               C 6,52 14,56 28,54
               C 16,61 24,70 38,69
               C 50,68 66,63 80,50
               C 70,53 60,57 56,63
               C 68,61 78,55 90,46 Z"
            fill="url(#rfFlameGrad)"
            stroke="#18181b"
            strokeWidth="3.2"
            strokeLinejoin="round"
          />

          {/* Inner Flame Accents */}
          <path
            d="M 85,26
               C 72,16 57,19 46,26
               C 40,30 45,34 53,34
               C 40,37 28,42 22,47
               C 30,48 40,47 48,45
               C 36,52 42,57 52,55
               C 64,54 74,48 84,40 Z"
            fill="url(#rfInnerFlame)"
          />

          {/* Speedometer Gauge Arc (Dark Shadow Base) */}
          <path
            d="M 72,56
               A 32 32 0 1 1 129,46
               L 119,49
               A 20 20 0 1 0 82,56 Z"
            fill="#18181b"
            transform="translate(1.5, 2)"
          />

          {/* Speedometer Gauge Arc Body */}
          <path
            d="M 72,56
               A 32 32 0 1 1 129,46
               L 119,49
               A 20 20 0 1 0 82,56 Z"
            fill="url(#rfFlameGrad)"
            stroke="#18181b"
            strokeWidth="3.5"
            strokeLinejoin="round"
          />

          {/* Speedometer Ticks (Gauge Marks) */}
          {/* Tick 1: ~140 deg */}
          <line x1="79" y1="34" x2="73" y2="29" stroke="#18181b" strokeWidth="4.5" strokeLinecap="round" />
          <line x1="79" y1="34" x2="73" y2="29" stroke="#fef08a" strokeWidth="2.5" strokeLinecap="round" />

          {/* Tick 2: ~110 deg */}
          <line x1="95" y1="24" x2="93" y2="16" stroke="#18181b" strokeWidth="4.5" strokeLinecap="round" />
          <line x1="95" y1="24" x2="93" y2="16" stroke="#fef08a" strokeWidth="2.5" strokeLinecap="round" />

          {/* Tick 3: ~80 deg */}
          <line x1="113" y1="24" x2="117" y2="17" stroke="#18181b" strokeWidth="4.5" strokeLinecap="round" />
          <line x1="113" y1="24" x2="117" y2="17" stroke="#fef08a" strokeWidth="2.5" strokeLinecap="round" />

          {/* Tick 4: ~50 deg (in redline zone) */}
          <line x1="128" y1="33" x2="135" y2="28" stroke="#18181b" strokeWidth="4.5" strokeLinecap="round" />
          <line x1="128" y1="33" x2="135" y2="28" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" />

          {/* Upper Horizontal Speed Streak Line trailing to the right above RAPID */}
          <line x1="135" y1="41" x2="238" y2="41" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="145" y1="38" x2="200" y2="38" stroke="#fde047" strokeWidth="1.5" strokeLinecap="round" />

          {/* Speedometer Needle (Angled at ~60° towards top right) */}
          {/* Needle Shadow */}
          <polygon
            points="102,54 104,57 124,34 120,31"
            fill="#18181b"
            transform="translate(1.5, 1.5)"
          />
          {/* Needle Pointer */}
          <polygon
            points="102,54 104,57 125,33 121,30"
            fill="url(#rfNeedleGrad)"
            stroke="#18181b"
            strokeWidth="2"
            strokeLinejoin="round"
          />

          {/* Needle Pivot Hub */}
          <circle cx="102.5" cy="55.5" r="8" fill="#18181b" transform="translate(1.5, 1.5)" />
          <circle cx="102.5" cy="55.5" r="7.5" fill="url(#rfNeedleGrad)" stroke="#18181b" strokeWidth="2.5" />
          <circle cx="101" cy="54" r="2.5" fill="#fca5a5" opacity="0.8" />
        </g>

        {/* ================= 2. "RAPID FINIL" TYPOGRAPHY ================= */}
        <g id="rapid-finil-text" transform="translate(4, 2)">
          {/* Lower Speed Streaks Underneath */}
          <line x1="175" y1="92" x2="340" y2="92" stroke="#78716c" strokeWidth="2.2" strokeLinecap="round" opacity="0.4" />
          <line x1="215" y1="96" x2="310" y2="96" stroke="#a8a29e" strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />

          {/* Layer 1: Thick Outer Black Shadow & Extrusion */}
          <text
            x="126"
            y="79"
            fontFamily="'Barlow Condensed', 'Anton', Impact, 'Arial Black', sans-serif"
            fontWeight="900"
            fontStyle="italic"
            fontSize="54"
            letterSpacing="0.015em"
            fill="#09090b"
            stroke="#09090b"
            strokeWidth="11"
            strokeLinejoin="round"
            strokeLinecap="round"
            filter="url(#rfHeavyShadow)"
          >
            RAPID FINIL
          </text>

          {/* Layer 2: Tight Black Outline */}
          <text
            x="126"
            y="79"
            fontFamily="'Barlow Condensed', 'Anton', Impact, 'Arial Black', sans-serif"
            fontWeight="900"
            fontStyle="italic"
            fontSize="54"
            letterSpacing="0.015em"
            fill="#18181b"
            stroke="#18181b"
            strokeWidth="6.5"
            strokeLinejoin="round"
          >
            RAPID FINIL
          </text>

          {/* Layer 3: Main Fiery Gloss Gradient Fill */}
          <text
            x="126"
            y="79"
            fontFamily="'Barlow Condensed', 'Anton', Impact, 'Arial Black', sans-serif"
            fontWeight="900"
            fontStyle="italic"
            fontSize="54"
            letterSpacing="0.015em"
            fill="url(#rfTextGrad)"
          >
            RAPID FINIL
          </text>

          {/* Layer 4: Upper Gloss Specular Sheen (Curved highlight cut across top half of letters) */}
          <text
            x="126"
            y="79"
            fontFamily="'Barlow Condensed', 'Anton', Impact, 'Arial Black', sans-serif"
            fontWeight="900"
            fontStyle="italic"
            fontSize="54"
            letterSpacing="0.015em"
            fill="url(#rfGlossSheen)"
          >
            RAPID FINIL
          </text>
        </g>
      </svg>
    </div>
  );
};
export default RapidFinilLogo;
