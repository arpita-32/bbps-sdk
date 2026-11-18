import React from 'react';

/**
 * Official NPCI Bharat Connect Brand Asset Kit (Immutable, Protected)
 * Host themes, CSS overrides, or custom image props cannot alter, recolor,
 * stretch, crop, rotate, or re-typeset these assets.
 */

export const BMnemonicLogo: React.FC<{ size?: number; className?: string }> = ({
  size = 32,
  className = '',
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 40 40"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    role="img"
    aria-label="Bharat Connect B Mnemonic"
    className={`shrink-0 select-none ${className}`}
    style={{ width: size, height: size }}
  >
    <rect width="40" height="40" rx="8" fill="#FFFFFF" />
    <path
      d="M11 8.5H22.2C26.4 8.5 29.2 10.8 29.2 14.3C29.2 16.9 27.6 18.7 25.1 19.5C28.1 20.3 30 22.4 30 25.4C30 29.3 26.8 31.5 22.3 31.5H11V8.5Z"
      fill="#0F4C81"
    />
    <path d="M15.8 12.8V17.7H21.1C23.1 17.7 24.3 16.7 24.3 15.2C24.3 13.7 23.1 12.8 21.1 12.8H15.8Z" fill="#FFFFFF" />
    <path d="M15.8 21.6V27.2H21.7C23.9 27.2 25.2 26.1 25.2 24.4C25.2 22.6 23.9 21.6 21.7 21.6H15.8Z" fill="#FFFFFF" />
    <path d="M27.5 11.2L32.8 19.8L27.5 28.4L24.8 26.7L29.1 19.8L24.8 12.9L27.5 11.2Z" fill="#F97316" />
  </svg>
);

export const BharatConnectHorizontalLogo: React.FC<{
  variant?: 'light' | 'dark';
  heightPx?: number;
  className?: string;
}> = ({ variant = 'light', heightPx = 24, className = '' }) => {
  // Enforce minimum 20px height per NPCI Stage 2 guideline
  const safeHeight = Math.max(20, heightPx);
  const aspectWidth = Math.round((safeHeight * 156) / 32);
  const textColor = variant === 'dark' ? '#FFFFFF' : '#0F2942';
  const subColor = variant === 'dark' ? '#CBD5E1' : '#475569';

  return (
    <svg
      width={aspectWidth}
      height={safeHeight}
      viewBox="0 0 156 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Bharat Connect"
      className={`shrink-0 select-none ${className}`}
      style={{
        height: `${safeHeight}px`,
        width: `${aspectWidth}px`,
        minHeight: '20px',
      }}
    >
      {/* Protected Bharat Connect Mark */}
      <rect
        x="1"
        y="3"
        width="26"
        height="26"
        rx="6"
        fill={variant === 'dark' ? '#1E293B' : '#FFFFFF'}
        stroke={variant === 'dark' ? '#334155' : '#E2E8F0'}
      />
      <path
        d="M7.5 8.5H14.8C17.5 8.5 19.3 10 19.3 12.3C19.3 14 18.2 15.1 16.6 15.6C18.5 16.1 19.8 17.5 19.8 19.5C19.8 22 17.7 23.5 14.8 23.5H7.5V8.5Z"
        fill={variant === 'dark' ? '#60A5FA' : '#0F4C81'}
      />
      <path d="M10.6 11.2V14.4H14C15.3 14.4 16.1 13.7 16.1 12.8C16.1 11.8 15.3 11.2 14 11.2H10.6Z" fill={variant === 'dark' ? '#0F172A' : '#FFFFFF'} />
      <path d="M10.6 17V20.7H14.4C15.8 20.7 16.7 20 16.7 18.9C16.7 17.7 15.8 17 14.4 17H10.6Z" fill={variant === 'dark' ? '#0F172A' : '#FFFFFF'} />
      <path d="M19.8 10.2L23.5 16L19.8 21.8L18 20.6L20.9 16L18 11.4L19.8 10.2Z" fill="#F97316" />

      {/* Protected Wordmark */}
      <text
        x="34"
        y="16.5"
        fill={textColor}
        fontFamily="Plus Jakarta Sans, system-ui, sans-serif"
        fontWeight="700"
        fontSize="13.5"
        letterSpacing="-0.02em"
      >
        Bharat
      </text>
      <text
        x="80"
        y="16.5"
        fill="#F97316"
        fontFamily="Plus Jakarta Sans, system-ui, sans-serif"
        fontWeight="700"
        fontSize="13.5"
        letterSpacing="-0.02em"
      >
        Connect
      </text>
      <text
        x="34"
        y="26.5"
        fill={subColor}
        fontFamily="DM Sans, system-ui, sans-serif"
        fontWeight="500"
        fontSize="7.5"
        letterSpacing="0.06em"
      >
        POWERED BY NPCI
      </text>
    </svg>
  );
};

export const BAssuredLogo: React.FC<{
  heightPx?: number;
  className?: string;
}> = ({ heightPx = 36, className = '' }) => {
  // Enforce minimum 30px height and mandatory white background per NPCI Stage 3 guideline
  const safeHeight = Math.max(30, heightPx);

  return (
    <div
      className={`inline-flex items-center gap-2.5 bg-white px-3 py-1.5 rounded-md border border-slate-200 shrink-0 select-none ${className}`}
      style={{ minHeight: `${safeHeight}px` }}
      role="img"
      aria-label="B Assured — Bharat Connect Verified Payment"
    >
      <svg
        width={Math.round(safeHeight * 0.85)}
        height={Math.round(safeHeight * 0.85)}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M16 2L4 7V15C4 22.7 9.1 29.7 16 31C22.9 29.7 28 22.7 28 15V7L16 2Z"
          fill="#0F4C81"
        />
        <path
          d="M10.5 16.5L14.2 20.2L21.8 12.2"
          stroke="#F97316"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <div className="flex flex-col leading-none">
        <span
          style={{
            fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif',
            fontWeight: 700,
            fontSize: `${Math.max(14, Math.round(safeHeight * 0.42))}px`,
            color: '#0F4C81',
            letterSpacing: '-0.02em',
          }}
        >
          B <span style={{ color: '#F97316' }}>Assured</span>
        </span>
        <span
          style={{
            fontFamily: 'DM Sans, system-ui, sans-serif',
            fontWeight: 600,
            fontSize: '8.5px',
            color: '#475569',
            letterSpacing: '0.04em',
            marginTop: '2px',
          }}
        >
          BHARAT CONNECT
        </span>
      </div>
    </div>
  );
};
