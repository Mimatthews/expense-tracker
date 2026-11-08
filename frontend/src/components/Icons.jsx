/* Minimal inline icon set (no icon dependency, ships in the bundle). */
const base = {
  width: 16,
  height: 16,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

const make = (children, size) => ({ size = 16, ...props }) => (
  <svg {...base} width={size} height={size} {...props}>
    {children}
  </svg>
)

export const IconPlus = make(
  <>
    <path d="M12 5v14M5 12h14" />
  </>,
)
export const IconArrowLeft = make(<path d="M15 18l-6-6 6-6" />)
export const IconArrowRight = make(<path d="M9 6l6 6-6 6" />)
export const IconSearch = make(
  <>
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-3.2-3.2" />
  </>,
)
export const IconEdit = make(
  <>
    <path d="M4 20h4L20 8a2.8 2.8 0 0 0-4-4L4 16v4z" />
  </>,
)
export const IconTrash = make(
  <>
    <path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13" />
  </>,
)
export const IconClose = make(<path d="M6 6l12 12M18 6L6 18" />)
export const IconCheck = make(<path d="M4 12.5l5 5L20 6.5" />)
export const IconDashboard = make(
  <>
    <rect x="3" y="3" width="7.5" height="7.5" rx="1.6" />
    <rect x="13.5" y="3" width="7.5" height="4.5" rx="1.6" />
    <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.6" />
    <rect x="13.5" y="10.5" width="7.5" height="10.5" rx="1.6" />
  </>,
)
export const IconList = make(
  <>
    <path d="M8 6h13M8 12h13M8 18h13" />
    <circle cx="3.6" cy="6" r="1" />
    <circle cx="3.6" cy="12" r="1" />
    <circle cx="3.6" cy="18" r="1" />
  </>,
)
export const IconTag = make(
  <>
    <path d="M20.5 13.2l-7.3 7.3a2 2 0 0 1-2.8 0L3 13.1V3h10.1l7.4 7.4a2 2 0 0 1 0 2.8z" />
    <circle cx="8.2" cy="8.2" r="1.3" />
  </>,
)
export const IconWallet = make(
  <>
    <rect x="3" y="6" width="18" height="13" rx="3" />
    <path d="M3 10h18M16.5 14.5h1.5" />
  </>,
)
export const IconTrendUp = make(
  <>
    <path d="M3 17l6-6 4 4 7-7" />
    <path d="M14 8h6v6" />
  </>,
)
export const IconTrendDown = make(
  <>
    <path d="M3 7l6 6 4-4 7 7" />
    <path d="M14 16h6v-6" />
  </>,
)
export const IconDownload = make(
  <>
    <path d="M12 3v12M7 11l5 5 5-5" />
    <path d="M4 21h16" />
  </>,
)
export const IconSpinner = make(
  <>
    <path d="M12 3a9 9 0 1 0 9 9" />
  </>,
)
export const IconInbox = make(
  <>
    <path d="M3 13h5l1.5 3h5L16 13h5" />
    <path d="M5 5h14l2 8v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5l2-8z" />
  </>,
)
export const IconLayers = make(
  <>
    <path d="M12 3l9 5-9 5-9-5 9-5z" />
    <path d="M3 13l9 5 9-5" />
  </>,
)
export const IconGitHub = make(
  <>
    <path d="M9 19c-4 1.2-4-2.5-6-3m12 5v-3.6a3.1 3.1 0 0 0-.9-2.4c3-.3 6-1.5 6-6.6a5.2 5.2 0 0 0-1.4-3.6 4.8 4.8 0 0 0-.1-3.6s-1.2-.3-3.8 1.4a13 13 0 0 0-6.8 0C6.4 1.2 5.2 1.5 5.2 1.5a4.8 4.8 0 0 0-.1 3.6A5.2 5.2 0 0 0 3.7 8.7c0 5 3 6.3 6 6.6a3.1 3.1 0 0 0-.9 2.3V22" />
  </>,
)
