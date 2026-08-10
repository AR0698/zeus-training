import type { SVGProps } from "react";

/**
 * A single stroked icon family (24 px grid, 1.75 stroke, round caps).
 *
 * Emoji and typographic glyphs are deliberately absent: they render
 * differently on every platform, cannot inherit a design token, and read as
 * unfinished. Everything here inherits `currentColor` and the font size.
 */

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Icon({ size = 20, children, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

export const IconHome = (props: IconProps) => (
  <Icon {...props}>
    <path d="M3 10.5 12 3l9 7.5" />
    <path d="M5.5 9.5V20h13V9.5" />
    <path d="M9.75 20v-5.5h4.5V20" />
  </Icon>
);

export const IconDumbbell = (props: IconProps) => (
  <Icon {...props}>
    <path d="M3.5 9v6M6.5 7v10M17.5 7v10M20.5 9v6" />
    <path d="M6.5 12h11" />
  </Icon>
);

export const IconTrend = (props: IconProps) => (
  <Icon {...props}>
    <path d="M3 17l5.5-5.5 3.5 3.5L21 6" />
    <path d="M15.5 6H21v5.5" />
  </Icon>
);

export const IconSettings = (props: IconProps) => (
  <Icon {...props}>
    <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
    <circle cx="16" cy="7" r="2.25" />
    <circle cx="8" cy="17" r="2.25" />
  </Icon>
);

export const IconCheck = (props: IconProps) => (
  <Icon {...props}>
    <path d="M4.5 12.5 9.5 17.5 19.5 6.5" strokeWidth={2.25} />
  </Icon>
);

export const IconChevronRight = (props: IconProps) => (
  <Icon {...props}>
    <path d="M9 5l7 7-7 7" />
  </Icon>
);

export const IconChevronDown = (props: IconProps) => (
  <Icon {...props}>
    <path d="M5 9l7 7 7-7" />
  </Icon>
);

export const IconArrowRight = (props: IconProps) => (
  <Icon {...props}>
    <path d="M4 12h15" />
    <path d="M13 6l6 6-6 6" />
  </Icon>
);

export const IconClose = (props: IconProps) => (
  <Icon {...props}>
    <path d="M6 6l12 12M18 6L6 18" strokeWidth={2} />
  </Icon>
);

export const IconPlus = (props: IconProps) => (
  <Icon {...props}>
    <path d="M12 5v14M5 12h14" strokeWidth={2} />
  </Icon>
);

export const IconMinus = (props: IconProps) => (
  <Icon {...props}>
    <path d="M5 12h14" strokeWidth={2} />
  </Icon>
);

export const IconTimer = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="12" cy="13" r="8" />
    <path d="M12 9v4.5l3 1.5" />
    <path d="M9.5 2.5h5" />
  </Icon>
);

export const IconSwap = (props: IconProps) => (
  <Icon {...props}>
    <path d="M4 8h13l-3-3M20 16H7l3 3" />
  </Icon>
);

export const IconSkip = (props: IconProps) => (
  <Icon {...props}>
    <path d="M5 5l9 7-9 7z" />
    <path d="M18.5 5v14" />
  </Icon>
);

export const IconPlay = (props: IconProps) => (
  <Icon {...props}>
    <path d="M7 4.5l12 7.5-12 7.5z" />
  </Icon>
);

export const IconInfo = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5.5" />
    <path d="M12 7.75h.01" strokeWidth={2.25} />
  </Icon>
);

export const IconFlame = (props: IconProps) => (
  <Icon {...props}>
    <path d="M12 3s5 4.2 5 8.5a5 5 0 0 1-10 0C7 9.5 8.5 8 8.5 8s.5 1.8 2 2.4C10.2 8 12 6 12 3Z" />
    <path d="M7 11.5a5 5 0 0 0 10 0" opacity="0" />
  </Icon>
);

export const IconTrophy = (props: IconProps) => (
  <Icon {...props}>
    <path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" />
    <path d="M7 6H4.5v1.5A3.5 3.5 0 0 0 8 11M17 6h2.5v1.5A3.5 3.5 0 0 1 16 11" />
    <path d="M12 14v3.5M8.5 20.5h7" />
  </Icon>
);

export const IconDownload = (props: IconProps) => (
  <Icon {...props}>
    <path d="M12 3.5v11" />
    <path d="M7.5 10.5 12 15l4.5-4.5" />
    <path d="M4.5 18.5h15" />
  </Icon>
);

export const IconUpload = (props: IconProps) => (
  <Icon {...props}>
    <path d="M12 15V4" />
    <path d="M7.5 8.5 12 4l4.5 4.5" />
    <path d="M4.5 18.5h15" />
  </Icon>
);

export const IconSun = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.2 5.2l1.4 1.4M17.4 17.4l1.4 1.4M18.8 5.2l-1.4 1.4M6.6 17.4l-1.4 1.4" />
  </Icon>
);

export const IconMoon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" />
  </Icon>
);

export const IconAuto = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 3.5v17" />
    <path d="M12 3.5a8.5 8.5 0 0 1 0 17Z" fill="currentColor" stroke="none" />
  </Icon>
);

export const IconAlert = (props: IconProps) => (
  <Icon {...props}>
    <path d="M12 4.5 21 19H3l9-14.5Z" />
    <path d="M12 10v4" />
    <path d="M12 16.75h.01" strokeWidth={2.25} />
  </Icon>
);

export const IconUndo = (props: IconProps) => (
  <Icon {...props}>
    <path d="M4 9h10.5a4.5 4.5 0 0 1 0 9H8" />
    <path d="M7.5 5.5 4 9l3.5 3.5" />
  </Icon>
);

export const IconExternal = (props: IconProps) => (
  <Icon {...props}>
    <path d="M14 4h6v6" />
    <path d="M20 4l-8.5 8.5" />
    <path d="M18 14.5V19a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 19V8a1.5 1.5 0 0 1 1.5-1.5H10" />
  </Icon>
);

export const IconTrash = (props: IconProps) => (
  <Icon {...props}>
    <path d="M4.5 6.5h15" />
    <path d="M9.5 6.5V4.5h5v2" />
    <path d="M6.5 6.5 7.5 20h9l1-13.5" />
    <path d="M10.5 10v6M13.5 10v6" />
  </Icon>
);

export const IconTarget = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="8.5" />
    <circle cx="12" cy="12" r="4.5" />
    <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
  </Icon>
);

export const IconClock = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7v5.5l3.5 2" />
  </Icon>
);

export const IconArrowLeft = (props: IconProps) => (
  <Icon {...props}>
    <path d="M20 12H5" />
    <path d="M11 6l-6 6 6 6" />
  </Icon>
);

export const IconArrowUp = (props: IconProps) => (
  <Icon {...props}>
    <path d="M12 19V5" />
    <path d="M6 11l6-6 6 6" />
  </Icon>
);

export const IconArrowDown = (props: IconProps) => (
  <Icon {...props}>
    <path d="M12 5v14" />
    <path d="M6 13l6 6 6-6" />
  </Icon>
);

export const IconPencil = (props: IconProps) => (
  <Icon {...props}>
    <path d="M4 20h4L19.5 8.5a2.12 2.12 0 0 0-3-3L5 17v3Z" />
    <path d="M14.5 6.5l3 3" />
  </Icon>
);

export const IconCopy = (props: IconProps) => (
  <Icon {...props}>
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M15 5.5A1.5 1.5 0 0 0 13.5 4H6a2 2 0 0 0-2 2v7.5A1.5 1.5 0 0 0 5.5 15" />
  </Icon>
);

export const IconSearch = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="M16 16l4 4" />
  </Icon>
);

export const IconWifiOff = (props: IconProps) => (
  <Icon {...props}>
    <path d="M3 4l18 18" />
    <path d="M8.2 13.2a6 6 0 0 1 3.3-1.6M2.5 9a13 13 0 0 1 5-3.2M21.5 9a13 13 0 0 0-9.9-3.4" />
    <path d="M12 19.5h.01" strokeWidth={2.5} />
  </Icon>
);

export const IconShare = (props: IconProps) => (
  <Icon {...props}>
    <path d="M12 3v12" />
    <path d="M8 6.5 12 3l4 3.5" />
    <path d="M5.5 12v7.5h13V12" />
  </Icon>
);

export const IconMail = (props: IconProps) => (
  <Icon {...props}>
    <rect x="3" y="5" width="18" height="14" rx="2.5" />
    <path d="m3.8 7 7.2 5.4a1.7 1.7 0 0 0 2 0L20.2 7" />
  </Icon>
);

export const IconShield = (props: IconProps) => (
  <Icon {...props}>
    <path d="M12 3.2 5 6v5.6c0 4 2.8 7.6 7 9.2 4.2-1.6 7-5.2 7-9.2V6z" />
    <path d="m9.2 12 2 2 3.6-3.8" />
  </Icon>
);

export const IconFilter = (props: IconProps) => (
  <Icon {...props}>
    <path d="M4 6h16" />
    <path d="M7 12h10" />
    <path d="M10 18h4" />
  </Icon>
);
