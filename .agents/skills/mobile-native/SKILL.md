---
name: mobile-native
description: Fixes mobile web quirks to make the Next.js web app feel like an installed native app on iOS and Android. Covers sticky hovers, tap highlights, dvh/svh viewport units, iOS zoom-on-input, safe areas, and touch feedback.
license: MIT
metadata:
  author: emilkowalski
  version: "1.0.0"
---

# Feeling Native On Mobile (Emil Kowalski)

Make web interfaces feel native on touch devices by eliminating the telltale glitches of mobile browsers.

---

## 1. Quick Problem/Solution Matrix

| Problem on Mobile | Solution in Stack |
| :--- | :--- |
| Hover state stays stuck after tap | Gate hover styles with `@media (hover: hover) and (pointer: fine)` |
| Gray/blue flash on tap in Safari/Chrome | `-webkit-tap-highlight-color: transparent` on `html` |
| 100vh pushes bottom CTA under browser toolbar | Use `min-h-[100svh]` for heroes, `h-[100dvh]` for app shell / drawers |
| iOS Safari zooms in when tapping text inputs | Set input `font-size: 16px` minimum (`text-base`) |
| Sticky bottom bar covered by iPhone home bar | Use `viewport-fit=cover` + `padding-bottom: env(safe-area-inset-bottom)` |
| Long-press selects button label | `select-none` on buttons, interactive controls, and icons |
| Tap feels unresponsive | Ensure immediate `:active` scale state (`active:scale-[0.97]`) |
| Pull-to-refresh interferes with custom scroll | `overscroll-behavior-y: none` where relevant |

---

## 2. Implementation in Tailwind & Next.js 16

### A. Global Reset (`app/globals.css`)
```css
@layer base {
  html {
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
  }
}
```

### B. Mobile Viewport & Notch Safe Areas (`app/layout.tsx`)
```tsx
export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafaf9" },
    { media: "(prefers-color-scheme: dark)", color: "#141413" },
  ],
};
```

### C. Floating Mobile WhatsApp Bar / Bottom Sticky CTA
Ensure bottom-docked bars respect home indicator insets:
```tsx
<div className="fixed bottom-0 inset-x-0 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] bg-background/80 backdrop-blur-md border-t">
  <Button className="w-full h-12 text-base active:scale-[0.98]">
    Book via WhatsApp
  </Button>
</div>
```

### D. Input Zoom Prevention
In Tailwind, ensure inputs never use `text-sm` (14px) on mobile:
```tsx
<Input className="text-base md:text-sm" />
```
*(iOS automatically zooms the entire viewport if an input has a computed font-size under 16px).*
