# Theming — how Shivers is themed (and how to theme it again)

Shivers' entire visual identity is **data, not code**. Components reference
semantic tokens (`bg-surface`, `text-primary`, `border-line`) and every theme
is CSS-variable values. To rebrand, add a dark variant, or ship a new palette,
you write one CSS block and change zero component files.

## Architecture (4 pieces)

```
:root                    ← default (light / indigo) theme — the values
[data-theme="dark"]      ← dark theme — overrides only what differs
@theme inline            ← publishes tokens as Tailwind utilities (DO NOT EDIT)
next-themes              ← runtime: sets data-theme on <html>, persists, no flash
Settings → Appearance    ← the picker UI (theme-picker.tsx)
```

1. **`app/globals.css`** holds everything. `:root` defines every token with its
   light value. Each alternative theme is a `[data-theme="<name>"]` block that
   overrides *only the tokens that differ*. `@theme inline` maps each token to
   a Tailwind color name — that mapping is stable infrastructure; you never
   touch it to add a theme.
2. **`next-themes`** is configured in `app/layout.tsx`
   (`attribute="data-theme"`, `defaultTheme="system"`) with
   `suppressHydrationWarning` on `<html>`. It injects a pre-paint script so the
   theme applies before first render — no dark→light flash — and persists the
   choice to `localStorage`.
3. **`components/settings/theme-picker.tsx`** is the only UI that calls
   `setTheme()`. Options there must match the `data-theme` names defined in CSS
   (plus the built-ins `light` / `system`).
4. `color-scheme` is set per theme block so native controls (scrollbars,
   form elements) follow along.

## Token reference

### Brand

| Token | Light | Dark | Role |
|---|---|---|---|
| `--background` | slate-50 | `#0b1220` ink | page field |
| `--foreground` | slate-900 | slate-100 | default text |
| `--primary` / `--primary-hover` | indigo-700 / indigo-800 | indigo-500 / indigo-400 | brand fills; hover darkens in light |
| `--on-primary` | white | white | text on brand fills (follows brand, not theme) |
| `--secondary` | blue-600 | blue-500 | badge accent on brand gradient |
| `--primary-tint` | indigo-50 | indigo @ 16% | badge washes, soft brand fills |
| `--decor-mist` / `--decor-haze` | indigo-tinted blues | dark navy stops | page-header gradient |
| `--decor-glow` | pale blue | indigo @ 28% | elevated-card shadow tint (hue required on dark) |
| `--selection-tint` / `--selection-contrast` | lavender / deep indigo | indigo @ 45% / indigo-100 | `::selection` |

### Surfaces & lines (the Phase A semantic layer)

| Token | Light | Dark | Role |
|---|---|---|---|
| `--surface` | white | slate-900 | cards, bubbles, dropdowns |
| `--surface-muted` | slate-100 | blend | quiet wells, inputs, previews |
| `--surface-shade` | slate-200 | slate-800 | hover washes, pressed |
| `--line` / `--line-soft` / `--line-strong` | slate-200 / 100 / 300 | 800 / blend / 700 | hairlines |
| `--text-strong` / `--text-muted-strong` / `--muted` / `--muted-subtle` | slate-700 / 600 / 500 / 400 | slate-300 / 400 / blend / 500 | emphasis ladder |

> Naming trap: Tailwind composes utilities from the **@theme color name**, not
> the variable name. The gray scale maps as `--color-strong` → `text-strong`
> and `--color-muted-strong` → `text-muted-strong`. A token literally named
> `--color-text-strong` would only ever produce `text-text-strong` — the
> original reason `text-secondary` was abandoned (it also collided with
> shadcn's blue-600 `--color-secondary`).

### Utilitarian

| Token | Light | Dark | Role |
|---|---|---|---|
| `--destructive` (+ `-foreground`) | red-600 | red-500 | destructive actions |
| `--accent` (+ `-foreground`) | slate-100 | slate-800 | generic hover wash (shadcn) |
| `--input` | slate-200 | slate-700 | input outlines |
| `--border` | slate-400 @ 20% | slate-400 @ 12% | ghost borders |
| `--ring` | = `--primary` | = `--primary` | focus rings |

## Adding a theme (the no-teardown promise)

**1. Write the block** in `app/globals.css`. Start from the dark block, keep
what's identical out:

```css
[data-theme="emerald"] {
  color-scheme: light;
  --primary: #059669;
  --primary-hover: #047857;
  --primary-tint: #d1fae5;
  /* ...only what differs... */
}
```

Utilities like `bg-primary` resolve through `var(--primary)`, so every screen
re-themes itself. Nothing is re-swept, no component branches on theme.

**2. Register it in the picker** (`theme-picker.tsx`): add an option whose
`value` equals the block's name.

**3. Update this table** if you introduce a new token.

That's the whole process. If a screen looks wrong in the new theme, the fix
always belongs in tokens, never in the component — that rule is what keeps the
promise.

## Keep-set: stock values that are constant by design

These intentionally do **not** participate in themes:

- **Scrims over media** — `image-lightbox.tsx`, `profile-header-card.tsx` avatar
  overlay, `chat-bubble.tsx` media internals: white-on-dark-video math, constant
- **Dialog scrim** — `dialog.tsx` `bg-slate-900/40`: already correct in both themes
- **`emerald-*` presence/status** (27 usages): "online" semantics, subtle on both
- **`text-white` on brand gradients**: brand fills keep `--on-primary`-equivalent whites
- **Stock framework colors** (`slate-*` outside the swept tiers, `rose-*`
  danger hovers): palette furniture, not brand

## Maintenance rules

- **0 raw hex in components** — `components/` and `app/` carry no color
  literals outside the keep-set above; new UI must use token utilities.
- New *semantic decoration* (a new wash, a new shadow tint) = one new token in
  `:root` + the dark block, published in `@theme inline`.
- Don't add `dark:`-prefixed utilities — theme differences belong in the
  `data-theme` blocks. (`@custom-variant dark` is deliberately unused.)
