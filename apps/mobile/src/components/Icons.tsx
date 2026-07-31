// ============================================================
// COMMERCO ICON SYSTEM — one coherent hand-drawn family.
// Stroke-based, 24×24 grid, currentColor. NO emoji anywhere.
// Consistent 1.9 stroke (2.2 when active) · round caps/joins.
// ============================================================
import React from 'react'
import Svg, { Path, Circle, Rect, G } from 'react-native-svg'

export interface IconProps {
  size?: number
  color?: string
  strokeWidth?: number
}

const Base: React.FC<IconProps & { children: React.ReactNode }> = ({
  size = 22, color = 'currentColor', strokeWidth = 1.9, children,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <G>{children}</G>
  </Svg>
)

// ── Navigation ──
export const IconHome = (p: IconProps) => (
  <Base {...p}><Path d="M3 10.5 12 3l9 7.5" /><Path d="M5 9.5V20a1 1 0 0 0 1 1h3.5v-6h5v6H18a1 1 0 0 0 1-1V9.5" /></Base>
)
export const IconOrders = (p: IconProps) => (
  <Base {...p}><Path d="M6 2.5h12a1 1 0 0 1 1 1v18l-3-2-2 2-2-2-2 2-2-2-3 2v-18a1 1 0 0 1 1-1Z" /><Path d="M9 8h6M9 12h6" /></Base>
)
export const IconProducts = (p: IconProps) => (
  <Base {...p}><Path d="m12 2.8 8.5 4.6v9.2L12 21.2 3.5 16.6V7.4Z" /><Path d="M3.7 7.3 12 12l8.3-4.7M12 12v9" /></Base>
)
export const IconAnalytics = (p: IconProps) => (
  <Base {...p}><Path d="M3 21h18" /><Path d="M6 21V11M11 21V5M16 21v-7M21 21v-4" /></Base>
)
export const IconMore = (p: IconProps) => (
  <Base {...p}><Circle cx="5" cy="12" r="1.6" /><Circle cx="12" cy="12" r="1.6" /><Circle cx="19" cy="12" r="1.6" /></Base>
)

// ── Actions ──
export const IconBell = (p: IconProps) => (
  <Base {...p}><Path d="M18 8a6 6 0 1 0-12 0c0 6-2.5 7-2.5 7h17S18 14 18 8Z" /><Path d="M13.7 20a2 2 0 0 1-3.4 0" /></Base>
)
export const IconSearch = (p: IconProps) => (
  <Base {...p}><Circle cx="11" cy="11" r="7" /><Path d="m20 20-3.5-3.5" /></Base>
)
export const IconFilter = (p: IconProps) => (
  <Base {...p}><Path d="M3 5h18M6.5 12h11M10 19h4" /></Base>
)
export const IconCalendar = (p: IconProps) => (
  <Base {...p}><Rect x="3" y="5" width="18" height="16" rx="2.5" /><Path d="M3 10h18M8 3v4M16 3v4" /></Base>
)
export const IconChevron = (p: IconProps) => (
  <Base {...p}><Path d="m9 5 7 7-7 7" /></Base>
)
export const IconBack = (p: IconProps) => (
  <Base {...p}><Path d="m15 5-7 7 7 7" /></Base>
)
export const IconPlus = (p: IconProps) => (
  <Base {...p}><Path d="M12 5v14M5 12h14" /></Base>
)
export const IconEdit = (p: IconProps) => (
  <Base {...p}><Path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17v3Z" /><Path d="m14.5 7.5 2.5 2.5" /></Base>
)
export const IconTrash = (p: IconProps) => (
  <Base {...p}><Path d="M4 7h16M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7" /><Path d="M6.5 7 7.5 20a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1L17.5 7" /></Base>
)
export const IconCheck = (p: IconProps) => (
  <Base {...p}><Path d="m5 12.5 5 5L19 7" /></Base>
)
export const IconClose = (p: IconProps) => (
  <Base {...p}><Path d="M6 6l12 12M18 6 6 18" /></Base>
)
export const IconRefresh = (p: IconProps) => (
  <Base {...p}><Path d="M20 12a8 8 0 1 1-2.6-5.9" /><Path d="M20 4v5h-5" /></Base>
)

// ── Domain ──
export const IconPhone = (p: IconProps) => (
  <Base {...p}><Path d="M6.5 3.5h3l1.5 4-2 1.5a12 12 0 0 0 6 6l1.5-2 4 1.5v3a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4.5 5.7 2 2 0 0 1 6.5 3.5Z" /></Base>
)
export const IconWhatsApp = (p: IconProps) => (
  <Base {...p}><Path d="M3.5 20.5 5 16.6A8.2 8.2 0 1 1 8 19.4l-4.5 1.1Z" /><Path d="M9 9.5c0 3 2.5 5.5 5.5 5.5.6 0 1-.5 1-1l-1.6-.8-1 1a6 6 0 0 1-2.6-2.6l1-1L10.5 9c-.5 0-1.5.1-1.5.5Z" /></Base>
)
export const IconCopy = (p: IconProps) => (
  <Base {...p}><Rect x="9" y="9" width="11" height="11" rx="2" /><Path d="M15 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h3" /></Base>
)
export const IconLocation = (p: IconProps) => (
  <Base {...p}><Path d="M12 21s7-6 7-11a7 7 0 1 0-14 0c0 5 7 11 7 11Z" /><Circle cx="12" cy="10" r="2.6" /></Base>
)
export const IconTruck = (p: IconProps) => (
  <Base {...p}><Path d="M2.5 6.5h10v9h-10z" /><Path d="M12.5 10h4l3 3v2.5h-7z" /><Circle cx="6.5" cy="18" r="1.8" /><Circle cx="16.5" cy="18" r="1.8" /></Base>
)
export const IconStore = (p: IconProps) => (
  <Base {...p}><Path d="M4 9.5V20a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9.5" /><Path d="M3 6.5 4.5 3h15L21 6.5a3 3 0 0 1-5.4 1.8A3 3 0 0 1 12 8.3a3 3 0 0 1-3.6 0A3 3 0 0 1 3 6.5Z" /></Base>
)
export const IconUsers = (p: IconProps) => (
  <Base {...p}><Circle cx="9" cy="8" r="3.2" /><Path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" /><Path d="M16 5.2a3.2 3.2 0 0 1 0 6M18 20c0-2.2-.7-3.9-2-5" /></Base>
)
export const IconRevenue = (p: IconProps) => (
  <Base {...p}><Circle cx="12" cy="12" r="9" /><Path d="M12 7v10M14.5 9.5c0-1-1.1-1.6-2.5-1.6s-2.5.6-2.5 1.7 1 1.5 2.5 1.9 2.7.8 2.7 2-1.2 1.8-2.7 1.8-2.6-.6-2.6-1.6" /></Base>
)
export const IconStar = (p: IconProps) => (
  <Base {...p}><Path d="m12 3.5 2.7 5.5 6 .9-4.4 4.2 1.1 6-5.4-2.9-5.4 2.9 1.1-6L3.3 9.9l6-.9Z" /></Base>
)
export const IconSettings = (p: IconProps) => (
  <Base {...p}><Circle cx="12" cy="12" r="3" /><Path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1v.2a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-2.8-1.1l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 3.5 15H3.3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.1-2.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 2.7-1.1V4a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.8 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0 1.1 2.7h.2a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.4 1.3Z" /></Base>
)
export const IconShield = (p: IconProps) => (
  <Base {...p}><Path d="M12 3 5 6v5.5c0 4.4 3 8.2 7 9.5 4-1.3 7-5.1 7-9.5V6l-7-3Z" /><Path d="m9 12 2 2 4-4" /></Base>
)
export const IconGlobe = (p: IconProps) => (
  <Base {...p}><Circle cx="12" cy="12" r="9" /><Path d="M3 12h18M12 3c2.5 2.7 2.5 15.3 0 18M12 3c-2.5 2.7-2.5 15.3 0 18" /></Base>
)
export const IconCard = (p: IconProps) => (
  <Base {...p}><Rect x="2.5" y="5" width="19" height="14" rx="2.5" /><Path d="M2.5 10h19" /></Base>
)
export const IconCoins = (p: IconProps) => (
  <Base {...p}><Circle cx="9" cy="9" r="5.5" /><Path d="M14.2 5.2a5.5 5.5 0 0 1 0 11" /></Base>
)
export const IconSheet = (p: IconProps) => (
  <Base {...p}><Rect x="4" y="3" width="16" height="18" rx="2" /><Path d="M4 9h16M4 15h16M10 3v18" /></Base>
)
export const IconRocket = (p: IconProps) => (
  <Base {...p}><Path d="M12 3c3 2 5 5.5 5 9.5L12 17l-5-4.5C7 8.5 9 5 12 3Z" /><Circle cx="12" cy="10" r="1.8" /><Path d="M9 17c-1.5.6-2 2-2 4 2 0 3.4-.5 4-2M15 17c1.5.6 2 2 2 4-2 0-3.4-.5-4-2" /></Base>
)
export const IconImage = (p: IconProps) => (
  <Base {...p}><Rect x="3" y="4.5" width="18" height="15" rx="2.5" /><Circle cx="8.5" cy="9.5" r="1.6" /><Path d="m4 17 5-4.5 4 3.5 3-2.5 4 3.5" /></Base>
)
export const IconBox = (p: IconProps) => (
  <Base {...p}><Path d="m12 2.8 8.5 4.6v9.2L12 21.2 3.5 16.6V7.4Z" /><Path d="M3.7 7.3 12 12l8.3-4.7M12 12v9" /></Base>
)
export const IconLogout = (p: IconProps) => (
  <Base {...p}><Path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" /><Path d="M10 16 6 12l4-4M6 12h9" /></Base>
)
export const IconUser = (p: IconProps) => (
  <Base {...p}><Circle cx="12" cy="8" r="3.6" /><Path d="M4.5 20c0-3.6 3.4-6 7.5-6s7.5 2.4 7.5 6" /></Base>
)
export const IconBlock = (p: IconProps) => (
  <Base {...p}><Circle cx="12" cy="12" r="9" /><Path d="m5.6 5.6 12.8 12.8" /></Base>
)
export const IconPhoneCall = IconPhone
export const IconWarehouse = (p: IconProps) => (
  <Base {...p}><Path d="M3 20V9l9-4 9 4v11" /><Path d="M7 20v-6h10v6" /></Base>
)
export const IconTicket = (p: IconProps) => (
  <Base {...p}><Path d="M4 8V6a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v2a2.5 2.5 0 0 0 0 5v2a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-2a2.5 2.5 0 0 0 0-5Z" /><Path d="M14 5v14" /></Base>
)

/** name → component, for data-driven menus (the More grid). */
export const ICONS = {
  home: IconHome, orders: IconOrders, products: IconProducts, analytics: IconAnalytics, more: IconMore,
  bell: IconBell, search: IconSearch, filter: IconFilter, calendar: IconCalendar,
  chevron: IconChevron, back: IconBack, plus: IconPlus, edit: IconEdit, trash: IconTrash,
  check: IconCheck, close: IconClose, refresh: IconRefresh,
  phone: IconPhone, whatsapp: IconWhatsApp, copy: IconCopy, location: IconLocation,
  truck: IconTruck, store: IconStore, users: IconUsers, revenue: IconRevenue, star: IconStar,
  settings: IconSettings, shield: IconShield, globe: IconGlobe, card: IconCard, coins: IconCoins,
  sheet: IconSheet, rocket: IconRocket, image: IconImage, box: IconBox, logout: IconLogout,
  user: IconUser, block: IconBlock, warehouse: IconWarehouse, ticket: IconTicket,
} as const

export type IconName = keyof typeof ICONS
