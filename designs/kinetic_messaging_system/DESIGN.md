---
name: Kinetic Messaging System
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#464554'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#777586'
  outline-variant: '#c7c4d7'
  surface-tint: '#5148d7'
  primary: '#2a14b4'
  on-primary: '#ffffff'
  primary-container: '#4338ca'
  on-primary-container: '#c1beff'
  inverse-primary: '#c3c0ff'
  secondary: '#0051d5'
  on-secondary: '#ffffff'
  secondary-container: '#316bf3'
  on-secondary-container: '#fefcff'
  tertiary: '#00414d'
  on-tertiary: '#ffffff'
  tertiary-container: '#005a6a'
  on-tertiary-container: '#4ad5f4'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e3dfff'
  primary-fixed-dim: '#c3c0ff'
  on-primary-fixed: '#100069'
  on-primary-fixed-variant: '#372abf'
  secondary-fixed: '#dbe1ff'
  secondary-fixed-dim: '#b4c5ff'
  on-secondary-fixed: '#00174b'
  on-secondary-fixed-variant: '#003ea8'
  tertiary-fixed: '#acedff'
  tertiary-fixed-dim: '#4cd7f6'
  on-tertiary-fixed: '#001f26'
  on-tertiary-fixed-variant: '#004e5c'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  headline-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.03em
  headline-xl-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.015em
  title-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 22px
    letterSpacing: -0.01em
  title-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: -0.005em
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: -0.005em
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 22px
    letterSpacing: 0em
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: 0em
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.02em
  caption:
    fontFamily: Plus Jakarta Sans
    fontSize: 10px
    fontWeight: '500'
    lineHeight: 13px
    letterSpacing: 0.03em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-desktop: 2rem
  space-2xs: 0.125rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-base: 1rem
  space-lg: 1.25rem
  space-xl: 1.5rem
  space-2xl: 2rem
  space-3xl: 3rem
---

## Brand & Style

This design system establishes a high-craft, contemporary messaging environment tailored for modern professionals, teams, and design-conscious consumers. It balances the utility and directness of modern productivity tools (such as Linear) with the approachable fluidity of cutting-edge consumer messengers (such as Telegram and Signal).

### Personality & Core Tenets
- **Crisp & Purposeful:** Zero visual clutter, superfluous chrome, or decorative novelty. Interfaces prioritize readability, micro-rhythm, and effortless focus on conversations.
- **Dynamic & Tactile:** Subtle depth cues, micro-transitions, and precise surface separations create an interface that feels responsive and alive.
- **Sophisticated Neutrality:** The UI recedes into calm, cool slate-tinted canvas tiers, letting media, voice notes, code blocks, and conversation content take center stage.

### Aesthetic Direction
A modern synthesis of **Refined Modernism** and **Subtle Translucency**. The visual architecture relies on cool slate foundations (`#0F172A` to `#F8FAFC`), crisp single-pixel hairline borders (`rgba(15, 23, 42, 0.08)`), high-contrast electric indigo/cobalt accents (`#4338CA` to `#3B82F6`), and soft tinted chat bubbles. Surfaces use faint optical backdrops rather than muddy drop shadows.

## Colors

The palette is engineered around an architectural foundation of cool slate grays paired with a high-energy primary spectrum spanning deep indigo (`#4338CA`) and electric royal azure (`#2563EB`).

### Palette Application
- **Primary Accent (`#4338CA` / `#3B82F6`):** Dedicated to primary action triggers, active tabs, self-authored outbound message bubbles, unread count badges, and verified badges. Outbound chat bubbles utilize a vertical linear gradient from `#4338CA` to `#3B82F6` for modern optical richness.
- **Secondary Accent (`#2563EB`):** Applied to active states, links, interactive audio waveforms, and focused thread indicators.
- **Tertiary Accent (`#06B6D4`):** Used sparingly for live presence indicators, typing indicators, active call states, and delivery status glows.
- **Neutral Stack (`#0F172A` down to `#F8FAFC`):**
  - **App Canvas Base:** `#F8FAFC` (Cool Crisp White-Slate)
  - **Sidebar / Thread List:** `#FFFFFF`
  - **Active Thread Surface:** `#F1F5F9`
  - **Inbound Chat Bubble:** `#FFFFFF` with a subtle 1px border (`rgba(148, 163, 184, 0.2)`) and 0.5px micro-shadow.
  - **Text Primary:** `#0F172A` (Deep Slate Slate-900)
  - **Text Muted / Meta:** `#64748B` (Neutral Slate-500)
  - **Dividers & Structural Borders:** `rgba(148, 163, 184, 0.2)`

## Typography

The design system implements **Plus Jakarta Sans** across all roles. It provides geometric precision with warm, contemporary humanist curves that maintain high legibility even at compact chat bubble scales.

- **Headlines & Headers:** Tight negative tracking (`-0.03em` to `-0.015em`) with medium-to-bold weights delivers a modern editorial presence for conversation titles, settings, and navigation headers.
- **Message Content:** `body-md` (15px/22px) is the baseline standard for chat message text. It balances data density with comfortable scanning.
- **Timestamps & Micro-copy:** Rendered with `label-sm` or `caption` using neutral slate tones (`#94A3B8`) for inbound messages and semi-transparent white (`rgba(255, 255, 255, 0.75)`) for outbound messages.

## Layout & Spacing

Layouts follow a structured adaptive multi-pane model based on an 8-point spatial system (with 4-point micro-adjustments).

### Spatial Architecture
- **Desktop (1024px+):** 3-column structural layout:
  1. *Global Navigation Rail:* Fixed 68px width.
  2. *Thread / Conversation List:* 320px–380px fluid-responsive pane.
  3. *Active Conversation Stage:* Flexible column (`flex: 1`) bound to a max reading width of 840px for chat streams, with an optional 320px contextual inspector drawer.
- **Tablet (768px–1023px):** 2-column split-view (collapsible list pane + active conversation pane).
- **Mobile (<768px):** Single-pane full-bleed view with fluid push-pop view transitions. Conversation headers pin sticky to the top notch with blurred safe area backing.

### Message Stream Rhythm
- Intra-group messages from the same sender: `space-xs` (4px) gap.
- Inter-group sender transitions: `space-md` (12px) gap.
- System dividers and date stamps: `space-xl` (24px) vertical spacing with auto-centering.

## Elevation & Depth

This system replaces heavy drop shadows with a refined layering model based on **Tonal Stratification**, **Frosted Backdrops**, and **Ambient Luminous Occlusion**.

### Depth Hierarchy
1. **Layer 0 (Canvas Base):** Flat `#F8FAFC`.
2. **Layer 1 (Card & Inbound Bubble Base):** `#FFFFFF` paired with an ultra-fine border: `1px solid rgba(148, 163, 184, 0.18)` and an ambient shadow: `0 1px 3px rgba(15, 23, 42, 0.04), 0 1px 2px rgba(15, 23, 42, 0.02)`.
3. **Layer 2 (Floating Controls & Input Bar):** Backdrop-filter `blur(16px)` with `background: rgba(255, 255, 255, 0.85)` and structural border `1px solid rgba(226, 232, 240, 0.8)`. Shadow: `0 4px 16px -2px rgba(15, 23, 42, 0.06)`.
4. **Layer 3 (Modals, Reaction Pickers, Popovers):** Solid `#FFFFFF` or elevated acrylic blur with shadow: `0 12px 32px -4px rgba(15, 23, 42, 0.12), 0 4px 8px -2px rgba(15, 23, 42, 0.04)`.
5. **Outbound Bubbles:** Self-luminous visual elevation using linear gradient `linear-gradient(135deg, #4338CA 0%, #2563EB 100%)` with a localized colored shadow: `0 3px 10px -2px rgba(37, 99, 235, 0.3)`.

## Shapes

The geometric framework uses asymmetric curvature tailored to modern conversational flow. Baseline roundedness is index `2` (moderate-to-high curvature).

### Border Radius Rules
- **Standard Cards & Containers:** `rounded-xl` (16px) to maintain a modern, friendly posture.
- **Inbound Message Bubbles:** `18px 18px 18px 4px` (smoothed pill with a distinct anchored anchor point on the bottom-left).
- **Outbound Message Bubbles:** `18px 18px 4px 18px` (anchored anchor point on the bottom-right).
- **Grouped Stack Bubbles:** When consecutive messages stack from the same author, inner corners contract to `6px`, creating visually linked message pods.
- **Avatars, Floating Action Triggers, Pill Chips:** Fully rounded circular (`rounded-full` / 9999px).
- **Input Fields & Textarea Island:** `24px` continuous oval pill for streamlined single-line composition, expanding to `16px` rounded rectangle on multi-line expansion.

## Components

### Buttons
- **Primary Action:** Solid electric gradient (`linear-gradient(135deg, #4338CA, #2563EB)`), high-contrast white text, `height: 40px`, padding `0 18px`, `border-radius: 9999px`. Sub-pixel white highlight border (`1px solid rgba(255,255,255,0.15)` inset). Hover state brings 5% brightness increase and `translateY(-0.5px)`.
- **Secondary / Ghost:** Transparent background with slate-700 text (`#334155`), hover fill `#F1F5F9`, `border-radius: 12px`.
- **Icon Buttons (Voice, Media, Emoji):** 36x36px or 40x40px square/circular hit area, center-aligned, with `color: #64748B`, transitioning to `#4338CA` on hover with a `#EEF2FF` circular background pill.

### Chat Bubbles
- **Outbound:** Deep indigo-cobalt gradient, white text (`#FFFFFF`), meta timestamps rendered in `rgba(255, 255, 255, 0.72)`. Status checkmarks (single sent, double delivered, electric blue-cyan read) aligned inline with time metadata.
- **Inbound:** Pure `#FFFFFF` surface on `#F8FAFC` canvas, with text `#0F172A`, timestamp `#94A3B8`, and faint `1px` border `rgba(148, 163, 184, 0.16)`.
- **Max Width:** Clamped at 72% of chat container width for optimal line length.

### Composer & Input Bar
- Floating composer dock suspended with `16px` bottom/side padding.
- Multi-part pill housing attachment button, auto-expanding text field, emoji trigger, and micro-animated voice/send button.
- Clean white surface with `backdrop-filter: blur(20px)`, framed by `1px solid rgba(226, 232, 240, 0.8)`. Focused border shifts to `rgba(67, 56, 202, 0.4)` with an active ring of `3px rgba(67, 56, 202, 0.08)`.

### Lists & Thread Items
- Conversation list rows have `padding: 12px 14px`, `border-radius: 14px`, and `gap: 12px`.
- Unread threads feature bold preview text, a saturated cobalt dot or unread count pill badge (`background: #4338CA`, text white, `font-weight: 600`), and a subtle light-blue background tint (`#F8FAFC` to `#EEF2FF` when active).

### Chips & Badges
- Filter pills (e.g., "All", "Unread", "Channels", "Groups"): Height `32px`, `padding: 0 14px`, `border-radius: 9999px`. Inactive states use `#FFFFFF` with `1px solid rgba(203, 213, 225, 0.6)`; active states use `#0F172A` text on pure `#FFFFFF` with elevated 0.5px shadow, or filled `#4338CA` with white text.

### Voice & Audio Waves
- Interactive waveform composed of 3px wide rounded vertical bars with dynamic amplitude. Unplayed segments tinted `#CBD5E1`; played segments lit in `#2563EB`. Scrub head features an animated micro-glow.