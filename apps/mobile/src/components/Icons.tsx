// ============================================================
// ICONS
//
// The website draws its icons with lucide-react. This file maps the app's
// historic `Icon*` names onto the SAME icons from lucide-react-native,
// pinned to 0.344.0 to match `lucide-react@^0.344.0` in the site's
// package.json — so the geometry is identical, not merely similar.
//
// It is an alias layer rather than a rename across every screen: one file
// to audit, and every call site keeps working. New code should import
// from 'lucide-react-native' directly.
// ============================================================
export type { LucideIcon } from 'lucide-react-native'

export {
  // ── navigation (NAV_MOBILE / Sidebar) ──
  Home as IconHome,
  ShoppingCart as IconOrders,
  Package as IconProducts,
  Package as IconBox,
  BarChart2 as IconAnalytics,
  Settings as IconSettings,
  Store as IconStore,
  Users as IconUsers,
  Warehouse as IconWarehouse,

  // ── chrome ──
  // RTL: "back" points inline-start, which is right in Arabic.
  ChevronRight as IconBack,
  ChevronLeft as IconChevron,
  Bell as IconBell,
  User as IconUser,
  Search as IconSearch,
  X as IconClose,
  Plus as IconPlus,
  Check as IconCheck,
  MoreHorizontal as IconMore,
  Filter as IconFilter,
  RefreshCw as IconRefresh,
  LogOut as IconLogout,

  // ── domain ──
  Truck as IconTruck,
  MapPin as IconLocation,
  Wallet as IconRevenue,
  Phone as IconPhone,
  PhoneCall as IconPhoneCall,
  MessageCircle as IconWhatsApp,
  Copy as IconCopy,
  Pencil as IconEdit,
  Trash2 as IconTrash,
  Image as IconImage,
  ShieldAlert as IconShield,
  Ban as IconBlock,
  Star as IconStar,
  Ticket as IconTicket,
  Coins as IconCoins,
  CreditCard as IconCard,
  Calendar as IconCalendar,
  Globe as IconGlobe,
  FileSpreadsheet as IconSheet,
  Rocket as IconRocket,
  Type as IconName,
} from 'lucide-react-native'
