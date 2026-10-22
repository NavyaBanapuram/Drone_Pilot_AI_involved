# DRONE PILOT — RESPONSIVE DESIGN SYSTEM

## 1. Responsive Philosophy
Drone Pilot is an interactive 3D application with a primary focus on mobile landscape experiences. It does not treat mobile devices as smaller desktops. Every view must feel native and deliberately designed for:
- Desktop / Large Desktop (Spacious horizontal layout)
- Tablet (Adaptive layout)
- Mobile Landscape (Recomposed layout)
- Mobile Portrait (Orientation Gate for required landscape views)

## 2. Breakpoints Architecture
The application uses standard Tailwind responsive breakpoints:
- `< 480px`: small phone (custom handling where necessary)
- `480px - 767px` (`sm`, `md`): phone/large phone
- `768px - 1023px` (`md`): tablet
- `1024px - 1279px` (`lg`): laptop/small desktop
- `1280px - 1535px` (`xl`): desktop
- `1536px+` (`2xl`): large desktop

**Container Rule:**
Content must not touch the screen edges unless deliberately full-bleed (e.g., 3D view). Standard containers should use padding scaling:
`w-full mx-auto px-4 sm:px-6 lg:px-8`

## 3. Mobile Orientation Strategy
Drone Pilot requires landscape orientation for its primary experiences (Hangar, Simulator, Configuration).
1. **Web App Manifest**: Set `orientation: landscape` for PWA usage.
2. **Screen Orientation API**: Use `screen.orientation.lock("landscape")` where supported.
3. **Orientation Gate (Portrait Fallback)**: A full-screen `<OrientationGate />` component must be displayed when the device is in portrait on phones. It prompts the user to "ROTATE DEVICE" with a professional, minimal design.

## 4. Typography & Spacing
Typography scales deliberately. Headers on desktop must be scaled down for mobile to prevent massive text blocks.
- **Buttons**: Minimum `44px` touch targets. Must use `inline-flex items-center justify-center gap-2` to guarantee alignment.
- **Icons**: Must align on the same horizontal line as text, vertically centered, without overlapping.

## 5. Layout Rules & Positioning
- **No Page-Level Horizontal Scroll**: The page itself must always fit `100vw`. Avoid `width: 100vw` in favor of `100%`.
- **Flexible Children**: Use `min-w-0` on flex/grid children that need to shrink to prevent overflow.
- **Absolute Positioning**: Reevaluate all `absolute`, `fixed`, `left-1/2 -translate-x-1/2` rules for mobile. Redesign overlays for landscape phone (e.g., side drawers instead of floating bottom panels).

## 6. Safe Areas & Viewport Units
Support notches and gesture navigation by using CSS environment variables for fixed elements:
- `env(safe-area-inset-top)`
- `env(safe-area-inset-bottom)`
- `env(safe-area-inset-left)`
- `env(safe-area-inset-right)`

Avoid `100vh`. Use dynamic viewport units (`dvh`, `svh`, `lvh`) for app-like containers to avoid mobile browser chrome clipping.

## 7. Component Specifics
- **Hanger**: 3-zone layout on tablet/desktop. Compact 3-zone on landscape mobile.
- **Configuration**: 2-column form on desktop/tablet. 1 or compact 2-column on landscape mobile.
- **Simulator**: 3D world must dominate. Desktop panels become compact overlays, collapsible drawers, or side trays on mobile. Only one large drawer open at a time.
- **Telemetry**: Prioritize ALT, SPEED, BATTERY, THROTTLE, HEADING for mobile. Secondary data goes into a details drawer.

## 8. 3D Canvas Performance & Responsiveness
- The Three.js canvas must use `w-full h-full`.
- The renderer and camera aspect ratio must update on window resize AND orientation change.
- Quality must scale down on mobile (fewer particles, lower shadow map resolution) to maintain frame rates.

## 9. QA Checklist
Before any feature is merged, verify:
- [ ] Header has no overflow, logo visible, account controls accessible.
- [ ] No horizontal page scrolling (`overflow-x-hidden` only as a last resort on containers, not the root).
- [ ] Buttons have aligned icons/text and `44px+` touch targets.
- [ ] Forms fit, labels readable, inputs have `min-w-0 w-full`.
- [ ] 3D canvas fits, camera responds to resize, no clipping.
- [ ] Orientation gate works in portrait where required.
- [ ] Safe areas are respected.
