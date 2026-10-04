# Chameleon Design System

**Chameleon** is a notes tool in the same space as Notion and Anytype: pages, blocks, to-dos and a command palette, on desktop and the web. This system covers two surfaces: the **app** and the **marketing site**.

Logo: a dot-grid chameleon mark in `assets/` (logo.svg black, logo-white.svg, plus PNGs at 2100×1300). No font files or product code were supplied.

## Sources
Visual references supplied by the user (inspiration only; nothing is copied, and none of their logos or imagery are used):
- https://www.supaste.com/ — soft macOS-native UI, glassy controls, plain product copy.
- https://www.espaciolanube.com/ — airy stone-grey pages, centred glass pill nav, full-bleed sky photography, huge-radius media, feathered floating images with caption pills, glass cookie toast, black dark pages.
- https://anaudienceofone.co/ — large, tight-tracked grotesk statements, editorial whitespace.
- 8 screenshots in `uploads/` (La Nube and Audience of One pages), used to set the direction.

## Content fundamentals
- **Voice:** plain and product-focused. Describe what the app does in concrete terms. "We" for the team, "you" for the reader. No hype words (revolutionary, supercharge, seamless).
- **Casing:** sentence case for headlines, buttons, menu items and nav. Product nouns stay lowercase (page, block, tint, space).
- **Length:** headlines 3–7 words ("Notes that take your shape"). One statement paragraph per page can run long, set big and muted. Body copy is 1–2 sentences.
- **Buttons:** short verbs: "Learn more", "Get the app", "New page", "Move to Trash". Destructive actions name the outcome.
- **System messages:** past tense, no exclamation marks: "Moved to Trash", "Link copied", "Synced". Each one offers a single text action ("Undo").
- **Timestamps:** relative and lowercase ("2 min ago", "Yesterday", "Sep 27").
- **Emoji:** never, including page icons. Pages get a Lucide icon on a tinted tile.
- **Unicode:** ⌘ ⌫ · × only, mostly in shortcuts and specs.

## Signature motifs ("Object" direction)
- Stone page + fine dot grain (`.ch-grain`, `--grain`).
- Glossy tint orbs (`Orb`, `--orb-*`): 1–3 per view, large, bleeding off edges.
- Frosted windows (`Card variant="window"`, `--window-bg`, `--blur-window`, `--shadow-window`), often tilted ±1.5–2°.
- Solid ink caption pills (`Pill`) floating over orbs and windows.
- Mono uppercase labels (`.ch-label`, `--type-label`) for nav, meta and dates.
- Display type 600, line-height .9, tracking −0.06em, 128–168px.

## Visual foundations
- **Contrast:** high by rule. Body and secondary text ≥ 7:1, muted text ≥ 4.5:1, glass pills are dark smoked glass (62% near-black) so white labels stay legible on any ground. Accents use deep 700 steps on light, bright 300 steps on dark.
- **Colour:** warm stone greys. The light page is stone-100 #EDECE9 and cards are white. The dark page is pure #000 with #191918 cards. Big type is often stone-600 #57534E (still ≥ 6:1 on the page).
- **Chameleon tints:** five saturated accents (sky (default), sage, sand, lilac, blush), each with 100/300/500/700 steps. Setting `data-tint` on any element remaps `--accent`, `--accent-soft` and `--accent-wash`, so each page or space can carry its own colour. Accents appear only on small things: checkboxes, switches, focus rings, icon tiles, selection. Cobalt is a rare deep accent for imagery.
- **Type:** one family, Hanken Grotesk, standing in for the references' neo-grotesk. Display is 600 weight, line-height .9, −0.06em tracking at 64–168px. UI and headings use 600, body 400 at 16px with 1.55 leading (19px on marketing pages). IBM Plex Mono only for code, shortcuts and placeholder captions.
- **Spacing:** 4px base. The app is dense (32px rows, 8–16px gaps). The site is very open: 96–160px section padding, and sections that fill the full viewport height.
- **Radii:** soft everywhere. 10–12 for inputs, 16 for menus and the app canvas, 28 for cards and dialogs, 48 for pricing cards and feature images, 96 for the bottom corners of hero media. Buttons, tags, tabs, toasts and nav are always pills.
- **Glass:** the signature. Grey glass is `rgba(38,37,35,.62)` with saturate(1.4) blur(24px) and an inset white hairline, and always carries white text. Used for nav pills, marketing buttons, caption pills, carousel bubbles, the thumbnail switcher and toasts. Frost (white at 86%) is for the app's sticky topbar. Dark mode uses darker glass.
- **Backgrounds:** flat stone or black with a fine 3px dot grain (`.ch-grain`), plus orbs and full-bleed imagery. No other patterns. Gradients appear only as image placeholders and as a soft dark protection gradient under text on photos.
- **Imagery:** vivid and luminous: saturated electric skies (cyan into deep cobalt, `--gradient-sky`), warm dusk (`--gradient-dusk`), pale stone for contrast. Colour should feel alive: high chroma, real light. Avoid dusty, desaturated blues. Floating images on stone pages dissolve through a radial feather mask.
- **Cards:** no drop shadows at rest. Separation comes from tone (white on stone, sunken on white). Only menus, dialogs and the command palette float, on shadow-pop.
- **Borders:** rare. Hairlines are 7–24% ink (or white in dark mode), used for footer rules and list dividers.
- **Motion:** slow and soft. ease-out (.22,1,.36,1) at 160/320/700ms. Sections reveal with a fade, a 12px blur and a 12px rise. Theme and tint changes cross-fade. No bounce.
- **Hover:** glass gets denser, solid buttons drop to 85–88% opacity, ghost items gain a 5% wash, links fade to 70%, interactive cards lift 2px.
- **Press:** scale(0.96) on buttons.
- **Focus:** 2px ring in the current tint.
- **Layout:** on the site, the nav is a centred pair of glass pills fixed at the top (or bottom on detail pages) and toasts sit bottom-right. The app has a 260px sidebar on the page colour, an inset white canvas (8px margin, 16px radius), a frosted sticky topbar and a 720px editor measure.
- **Transparency & blur:** reserved for floating chrome and dialog scrims (10px blur).

## Logo
- Files: `assets/logo.svg` / `logo.png` (black), `assets/logo-white.svg` / `logo-white.png`. Aspect 950:550.
- Use the `Logo` component; it renders the SVG as a mask so it follows `color` (ink on stone, white on black or on orbs, or one 700 tint).
- Lockup: mark + "Chameleon" in Hanken Grotesk 600, gap 0.4 × mark height. Minimum mark height 16px.
- Don't recolour single dots, outline, add shadows or glass behind it.

## Iconography
- **Lucide** from CDN (`lucide@0.469.0` UMD) at 16px, stroke 1.75, round caps. 22–24px for carousel bubbles and page tiles. This is a substitution; no brand icon set exists yet.
- The kits use an `Icon` wrapper (`ui_kits/*/Icon.jsx`) that renders `lucide.icons[Name]` as inline SVG.
- Icons are functional only: navigation, block types, actions. They are muted grey in menus and tinted on page tiles.
- There is no icon font, no PNG icons and no emoji. Component cards inline a few equivalent paths so they render without the CDN.

## Index
- `styles.css` — entry point (imports only).
- `tokens/` — fonts, colors (light, `[data-theme="dark"]`, `[data-tint=*]`), typography, spacing, effects, base.
- `components/components.css` — `ch-*` classes, including `.ch-glass`, `.ch-frost` and `.ch-kbd`.
- `components/{core,forms,navigation,feedback}/` — React components plus one card per folder.
- `guidelines/` — foundation cards (Colors, Type, Spacing, Effects, Brand).
- `ui_kits/app/` — notes app click-through.
- `ui_kits/website/` — marketing site click-through.
- `thumbnail.html`, `SKILL.md`. `assets/` holds the logo files.

## Components
- brand: Orb
- core: Logo, Button, IconButton, Pill, Badge, Tag, Card
- forms: Input, Select, Checkbox, Radio, Switch
- navigation: NavBar, Tabs, Menu
- feedback: Dialog, Toast, Tooltip

No source defined a component inventory. This is a standard set, plus **Pill** (glass caption capsule, the core reference motif) and **Menu** (slash/insert, context menus and command results, which a notes tool needs).

Theming: put `data-theme="dark"` and/or `data-tint="sage|sand|lilac|blush|sky"` on `<html>` or on any subtree.
