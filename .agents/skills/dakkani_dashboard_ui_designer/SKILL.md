---
name: Commerco Dashboard UI Designer
description: Permanent skill to design premium, consistent dashboard UI and components for Commerco, inspired by Vercel, Stripe, and Linear.
---

# Commerco Dashboard UI Designer Skill

This skill defines the permanent design system, visual guidelines, UI/UX philosophy, component architectures, and responsive layout rules for the Commerco Merchant and Admin Dashboard. 

Any new page or component in the Commerco Dashboard must be designed according to this specification before implementation.

---

## 🎯 UI/UX Philosophy

The Commerco Dashboard UI is:
- **Minimal & Premium**: Clean space, thin borders, soft shadows, and subtle color accents. Never crowded or cluttered.
- **Calm & Professional**: Uses neutral backgrounds and borders, with brand color highlights. Avoids flashy animations or over-saturated colors.
- **Fast & Responsive**: Optimized for instant feedback and works perfectly across desktop, tablet, and mobile (mobile-first layout support).

---

## 🎨 Design Tokens & Fundamentals

### 1. Spacing & Grids
- **Padding & Margin**: Use standard spacing steps (`p-3` for small actions, `p-4` or `p-6` for cards/drawers, `space-y-4` or `space-y-6` for vertical flow).
- **Grid Layouts**: Use CSS Grid for cards and stat items:
  - Small elements: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4`
  - Mid elements: `grid grid-cols-1 md:grid-cols-2 gap-6`

### 2. Borders & Borders Radius
- **Radius**: Use `rounded-2xl` (16px) for cards, drawers, and main panels. Use `rounded-xl` (12px) for input fields, buttons, and inner controls. Use `rounded-lg` (8px) for badges and small tags.
- **Borders**: Thin, subtle gray borders (`border border-gray-100` or `border-gray-200`). Avoid dark or colored borders unless destructive.

### 3. Shadows
- **Base Cards**: Use very soft shadows (`shadow-sm` or `shadow-[0_1px_3px_rgba(0,0,0,0.05)]`).
- **Hover/Active States**: Elevate on hover (`hover:shadow-md` or `hover:shadow-[0_4px_12px_rgba(0,0,0,0.05)]`).
- **Drawers/Modals**: Use deep, floating shadows (`shadow-2xl`).

### 4. Color Palette
- **Backgrounds**: Main layout uses pure white (`bg-white`) on top of a soft neutral background (`bg-gray-50/50`).
- **Accent/Brand**: Deep turquoise (`var(--cf-teal)`) or soft brand turquoise (`var(--cf-turq)` / `#3CC6B9`).
- **Text**: `var(--color-text-primary)` (almost black) for primary headings; `var(--color-text-secondary)` (medium gray) for subheadings; `var(--color-text-muted)` (soft gray) for helper labels.
- **Destructive**: Soft red (`bg-red-50`, `text-red-600`, `border-red-100`).

---

## 🧱 Component Guidelines

### 1. Cards
- Must have a clean white background, `border border-gray-100` or `border-gray-200`, `rounded-2xl`, and `shadow-sm`.
- Inner content must be padded with `p-4` or `p-6`.
- Hover interactions must be smooth: `transition-all duration-200 hover:shadow-md hover:border-gray-300`.

### 2. Forms & Inputs
- **Text Inputs**: Height of `h-10` or `h-11`, `rounded-xl`, `border-gray-200`, with a monospace/sans font. Under focus, outline with brand color: `focus:border-teal-500 focus:ring-1 focus:ring-teal-500`.
- **Select fields**: Clear select arrows, matching the input height and border radius.
- **Password/Credential Fields**: Must support:
  - Toggle visibility eye icon (Show/Hide).
  - One-click copy-to-clipboard button with visual feedback.
  - Monospace font family.
  - Inline error/success indicator.
- **Switches**: Smooth iOS-style rounded toggles with color transitions (`bg-gray-200` to `#0D6EFD` or `var(--cf-turq)`).

### 3. Tables
- Always spacious with light row separators.
- Columns must align logically: text aligned right (RTL Arabic) or left (LTR), numbers always aligned left/LTR.
- Include a top utility bar with a Search input (`h-9` or `h-10`, left/right magnifying glass icon) and Filter controls.
- Row hover highlights must be subtle (`hover:bg-gray-50/50`).

### 4. Drawers (Slide-over panels)
- **Rule**: All detailed configuration settings (like provider credentials, order details, etc.) must open in a sliding Drawer rather than a modal popup.
- Height: full screen height (`h-screen` or `max-h-[90vh]` / `h-full`).
- Background: pure white with a dark translucent backdrop (`bg-black/60`).
- Content must slide smoothly from the side (left/right depending on RTL/LTR) with a transition duration of `150ms` to `250ms`.

### 5. Statistics Cards
- Large, bold primary indicator number.
- Small sub-label placed above or below the figure.
- Subtle icon or trend indicator badge in the top corner.

### 6. Empty & Loading States
- **Empty States**: Never show a blank screen. Display a soft colored card containing an elegant outline Lucide icon, a descriptive title, helper text, and a primary CTA button.
- **Loading States**: Use skeleton grids matching the layout shapes, or custom loading spinners (`Loader2` animated) with brand color.

### 7. Badges (Status Labels)
- **Connected / Success**: Green badge (`bg-green-50 text-green-700 border-green-100`).
- **Disconnected / Failed**: Red badge (`bg-red-50 text-red-700 border-red-100`).
- **Syncing / In Progress**: Blue or Amber badge (`bg-blue-50 text-blue-700 border-blue-100`).

---

## 🚫 Prohibited Practices

- **NO JSON Textareas**: Never ask the merchant to paste or edit raw JSON. Everything must be mapped to fields.
- **NO Default Borders**: Never use standard browser borders or high-contrast dark outline lines.
- **NO Harsh Primary Colors**: Never use saturated base colors (plain red, plain blue, plain green). Use curated palettes.
- **NO Popups**: Avoid intrusive modal popups for complex setting details; use sliding Drawers.
