import React from 'react';

export interface StudioIconProps {
  size?: string | number;
  className?: string;
  strokeWidth?: string | number;
}

const baseProps = (size: string | number, strokeWidth: string | number, className?: string) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  className,
});

/** 1. Dashboard — Grid axis, bar chart, and rising trend line with nodes */
export const DashboardIcon: React.FC<StudioIconProps> = ({ size = 18, className, strokeWidth = 1.75 }) => (
  <svg {...baseProps(size, strokeWidth, className)}>
    <path d="M3 3v18h18" />
    <rect x="6" y="15" width="2.5" height="6" rx="0.5" />
    <rect x="10.75" y="12" width="2.5" height="9" rx="0.5" />
    <rect x="15.5" y="9" width="2.5" height="12" rx="0.5" />
    <path d="M7.25 11.5 12 7.5l4.75-2.5" />
    <circle cx="7.25" cy="11.5" r="1.25" />
    <circle cx="12" cy="7.5" r="1.25" />
    <circle cx="16.75" cy="5" r="1.25" />
  </svg>
);

/** 2. Estimates — Folded document with attached price tag */
export const EstimatesIcon: React.FC<StudioIconProps> = ({ size = 18, className, strokeWidth = 1.75 }) => (
  <svg {...baseProps(size, strokeWidth, className)}>
    <path d="M12 20H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h6l4 4v4" />
    <path d="M12 3v4h4" />
    <path d="M7.5 10h4" />
    <path d="M7.5 13.5h3" />
    <path d="m14.2 13.2 5.6 5.6a1.4 1.4 0 0 1 0 2l-1.5 1.5a1.4 1.4 0 0 1-2 0l-5.6-5.6V13.2h3.5Z" />
    <circle cx="13" cy="15.5" r="0.7" fill="currentColor" stroke="none" />
  </svg>
);

/** 3. Invoices — Folded document with $ sign and upward send arrow */
export const InvoicesIcon: React.FC<StudioIconProps> = ({ size = 18, className, strokeWidth = 1.75 }) => (
  <svg {...baseProps(size, strokeWidth, className)}>
    <path d="M13 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l4 4v2" />
    <path d="M13 3v4h4" />
    <path d="M10.5 10.5c-1.1 0-2 .6-2 1.5s.9 1.3 2 1.6c1.1.3 2 .7 2 1.6s-.9 1.5-2 1.5" />
    <path d="M10.5 9.2v1.3m0 6.2v1.3" />
    <path d="M18 20v-8.5" />
    <path d="m15 14.5 3-3 3 3" />
  </svg>
);

/** 4. Projects — Architectural building and jobsite structure */
export const ProjectsIcon: React.FC<StudioIconProps> = ({ size = 18, className, strokeWidth = 1.75 }) => (
  <svg {...baseProps(size, strokeWidth, className)}>
    <path d="M3 20h18" />
    <path d="M5 20V7.5L12.5 5v15" />
    <path d="M8 10h1.5M8 13.5h1.5M8 17h1.5" />
    <path d="M15 13h5v2.5h-5Z" />
    <path d="M17.5 15.5V20" />
  </svg>
);

/** 5. Receipts — Curled receipt slip with jagged edge and approval stamp */
export const ReceiptsIcon: React.FC<StudioIconProps> = ({ size = 18, className, strokeWidth = 1.75 }) => (
  <svg {...baseProps(size, strokeWidth, className)}>
    <path d="M5 20V5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v4" />
    <path d="M5 20l2-1.5L9 20l2-1.5L13 20" />
    <path d="M8 8h6M8 11.5h4.5M8 15h3" />
    <path d="M14.5 19.5h6" />
    <path d="M15.5 17.5h4v2h-4z" />
    <path d="M17.5 17.5v-2.2a1.6 1.6 0 1 0-1.6-1.6" />
  </svg>
);

/** 6. Tax Summary — Calculator paired with % tax form */
export const TaxSummaryIcon: React.FC<StudioIconProps> = ({ size = 18, className, strokeWidth = 1.75 }) => (
  <svg {...baseProps(size, strokeWidth, className)}>
    <rect x="3" y="9" width="8.5" height="11.5" rx="1.5" />
    <path d="M5.5 12h3.5" />
    <path d="M5.5 15h.5m3 0h.5M5.5 17.8h.5m3 0h.5" />
    <path d="M11.5 9V5a2 2 0 0 1 2-2h4.5L21 6v12.5a2 2 0 0 1-2 2h-7.5" />
    <path d="M17.5 3v3.5H21" />
    <path d="m14.2 12.5 3.2-3.2" />
    <circle cx="14.5" cy="9.6" r="0.6" fill="currentColor" stroke="none" />
    <circle cx="17.2" cy="12.2" r="0.6" fill="currentColor" stroke="none" />
    <path d="M14 16.5h4.5" />
  </svg>
);

/** 7. Contacts — Dual clean user silhouettes */
export const ContactsIcon: React.FC<StudioIconProps> = ({ size = 18, className, strokeWidth = 1.75 }) => (
  <svg {...baseProps(size, strokeWidth, className)}>
    <circle cx="9.5" cy="8.5" r="3.5" />
    <path d="M3.5 19.5c0-3 2.7-5 6-5s6 2 6 5" />
    <circle cx="16.5" cy="9.5" r="2.5" />
    <path d="M16.5 14.5c2.2 0 4 1.4 4 3.8" />
  </svg>
);

/** 8. Outreach — Paper plane with outgoing signal waves */
export const OutreachIcon: React.FC<StudioIconProps> = ({ size = 18, className, strokeWidth = 1.75 }) => (
  <svg {...baseProps(size, strokeWidth, className)}>
    <path d="M3 11.5 19 5l-5.5 15-3-5.5L3 11.5Z" />
    <path d="M19 5 10.5 14.5" />
    <path d="M17.5 2.5a4.5 4.5 0 0 1 4 4" />
    <path d="M19.8 2a7 7 0 0 1 2.2 2.2" />
  </svg>
);

/** 9. Finish Visualizer — Architectural frame + magic finish sparkles */
export const VisualizerIcon: React.FC<StudioIconProps> = ({ size = 18, className, strokeWidth = 1.75 }) => (
  <svg {...baseProps(size, strokeWidth, className)}>
    <rect x="3" y="5" width="14" height="14" rx="2" />
    <path d="M10 5v14" />
    <path d="M6.5 11.5h1M6.5 14.5h1.5" />
    <path d="m19.5 3.5.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7.7-1.8Z" />
    <path d="m19.5 14.5.5 1.2 1.2.5-1.2.5-.5 1.2-.5-1.2-1.2-.5 1.2-.5.5-1.2Z" />
  </svg>
);

/** 10. Price Book — Open rate catalog book with $ indicator */
export const PriceBookIcon: React.FC<StudioIconProps> = ({ size = 18, className, strokeWidth = 1.75 }) => (
  <svg {...baseProps(size, strokeWidth, className)}>
    <path d="M3 5.5A2.5 2.5 0 0 1 5.5 3H12v16H5.5A2.5 2.5 0 0 0 3 21V5.5Z" />
    <path d="M21 5.5A2.5 2.5 0 0 0 18.5 3H12v16h6.5A2.5 2.5 0 0 1 21 21V5.5Z" />
    <path d="M7.5 8.5c-.8 0-1.4.4-1.4 1s.6.9 1.4 1.1 1.4.5 1.4 1.1-.6 1-1.4 1" />
    <path d="M7.5 7.5v1m0 4.2v1" />
    <path d="M15 8.5h3M15 12h3M15 15.5h2" />
  </svg>
);

/** 11. Systems Library — Stacked architectural finish layers */
export const SystemsLibraryIcon: React.FC<StudioIconProps> = ({ size = 18, className, strokeWidth = 1.75 }) => (
  <svg {...baseProps(size, strokeWidth, className)}>
    <path d="m12 3 9 4.5-9 4.5-9-4.5L12 3Z" />
    <path d="m3 12 9 4.5 9-4.5" />
    <path d="m3 16.5 9 4.5 9-4.5" />
  </svg>
);

/** 12. Settings — Minimal single-line precision gear */
export const SettingsIcon: React.FC<StudioIconProps> = ({ size = 18, className, strokeWidth = 1.75 }) => (
  <svg {...baseProps(size, strokeWidth, className)}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 3.5v2M12 18.5v2M4.6 7.8l1.7 1M17.7 15.2l1.7 1M4.6 16.2l1.7-1M17.7 8.8l1.7-1" />
    <circle cx="12" cy="12" r="6.5" strokeDasharray="3.2 2.2" />
  </svg>
);

/** 13. Handbook — Open studio manual with bookmark ribbon and chapter index lines */
export const HandbookIcon: React.FC<StudioIconProps> = ({ size = 18, className, strokeWidth = 1.75 }) => (
  <svg {...baseProps(size, strokeWidth, className)}>
    <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H12v17H6.5A2.5 2.5 0 0 0 4 21V5.5Z" />
    <path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H12v17h5.5a2.5 2.5 0 0 1 2.5 1V5.5Z" />
    <path d="M15 3v6l1.5-1.2L18 9V3" />
    <path d="M7 8h2.5M7 11.5h2.5M7 15h2" />
    <path d="M14.5 13h3M14.5 16h2.5" />
  </svg>
);

