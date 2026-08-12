# Aliasarr UI Design Specification

> Status: UI v1.1, finalized  
> Visual direction: **Midnight Operations** (midnight ops console)

This document is the visual and interaction baseline for Aliasarr. New pages and components should reuse existing tokens and components first; do not redefine colors, radii, or shadows per page.

## 1. Design Goals

- **Professional but not cold**: Dark foundation reflects infrastructure product; warm orange brand color provides recognition.
- **Clear split between public site and Admin**: Public site handles product expression; Admin handles status judgment and efficient operations.
- **Information first**: Status, errors, and primary actions must stand out more than decoration.
- **Real data**: Dashboard shows only data from real APIs—no fictional activity, charts, or metrics.
- **Restrained motion**: Motion serves entry, feedback, and state change—not continuous operation disruption.

## 2. Two Page Modes

### Public Site

Routes: `/`, `/docs`, `/login`. Code lives in the `app/(site)` Route Group; `(site)/layout.tsx` provides shared header and content container. Route Group does not change public URLs.

- Use centered content container and brand navigation.
- Public site shares one header; navigation offers login only—no direct Console or API status links; admin capabilities enter through login flow.
- Allow larger headings, gradient glow, grid background, and semi-transparent panels.
- Home hero carries product positioning; docs and login keep the same brand language.
- Content max width ~ `1180px`, suited for reading and product showcase.

### Admin Workspace

Routes: `/admin`, `/admin/probe`, `/admin/aliases`, `/admin/services`, `/admin/indexers`, `/admin/applications`.

- Full-height sidebar, fixed top bar, full-width workspace.
- `/admin` is the system Dashboard; concrete actions belong on dedicated tool pages.
- Workspace has no global max width; padding fixed at `16px` on all sides, not scaling with breakpoints.
- Public site and Admin root share `--app-page-background` gradient; gradient must cover sidebar, top bar, and workspace directly. Admin top bar and sidebar stay transparent by default; hierarchy via dividers only—no separate background that breaks the gradient.
- Panel radius, shadow, and motion more restrained than public site; tables and status rows first.
- Navigation split into Operations and Resources; current page must have clear selected state.

## 3. Design Tokens

Tokens in `app/globals.css`; Tailwind mapping in `tailwind.config.ts`.

| Semantic        | Variable            | RGB           | Use                                      |
| --------------- | ------------------- | ------------- | ---------------------------------------- |
| Page background | `--app-bg`          | `7 11 20`     | Public site base background              |
| Panel           | `--app-surface`     | `15 22 36`    | Cards, nav, form containers              |
| Subtle surface  | `--app-subtle`      | `24 34 52`    | Hover, selected, grouped backgrounds     |
| Border          | `--app-border`      | `51 65 86`    | Dividers and control boundaries          |
| Body text       | `--app-text`        | `235 241 248` | Regular body copy                        |
| Muted text      | `--app-muted`       | `145 158 178` | Descriptions, labels, helper text        |
| Brand accent    | `--app-accent`      | `255 112 67`  | Primary buttons, selection, key hints    |
| Success         | `--app-success`     | `95 224 181`  | Online, available, connected             |
| Danger          | `--app-danger`      | `255 112 128` | Errors, unavailable, destructive actions |
| Warning         | `--app-warning`     | `250 196 92`  | Loading, pending, partially available    |
| Admin shell     | `--admin-shell`     | `8 13 23`     | Admin top bar and root background        |
| Admin sidebar   | `--admin-sidebar`   | `12 19 32`    | Fixed navigation area                    |
| Admin workspace | `--admin-workspace` | `10 16 27`    | Admin content background                 |

Status colors must keep semantic meaning; do not use brand orange for error or success states.

## 4. Typography and Hierarchy

- Display and body: `Sora` via `--font-sora`.
- Labels, APIs, paths, small tags: `IBM Plex Mono` via `--font-ibm-plex-mono`.
- Public H1 may use responsive large sizes; Admin page titles fixed at `24–30px`.
- Labels use uppercase, monospace, wide tracking—not for long body text.
- Body default `14–16px`; helper text not below `10px`.

## 5. Layout, Spacing, and Radius

- Base spacing in 4px multiples; common values `8 / 12 / 16 / 24 / 32px`.
- Admin workspace padding fixed at `16px` on all sides.
- `16px` between page header and first content group.
- Same-level cards, panels, and summary cards use `16px` gutter; do not use `20 / 24 / 28px` as ordinary card spacing within a page.
- Default card inner padding `20px`; compact stat cards may use `16px`; sibling gutter remains `16px`.
- `24px` only for clear major section breaks or large inner groupings—not ordinary card stacks.
- Public panels use `16px` radius; Admin panels `12px`.
- Form controls and primary buttons `12px` radius; Admin small actions may use `8px`.
- Admin sidebar fixed width `252px`; mobile collapses to horizontal top nav.
- Admin shell fixed viewport height; only workspace below top bar scrolls vertically. Scrollbar must start below top bar—not through top bar or sidebar.
- Admin workspace uses custom scroll indicator: normally proportional to content; when pulling past top or bottom, thumb compresses from that edge. Safari/iOS must follow system rubber-band distance frame-by-frame; other browsers follow trackpad inertia decay—no extra wait after input ends. Leaving edge or quick reverse must immediately release old edge anchor so thumb follows real scroll position; residual deformation may recover while moving. Feedback must not change layout or trigger reflow.
- Full-height list or editor pages keep public header outside scroll; list and editor panels manage `overflow` separately—browser page scrollbar must not scroll the edit area.
- No borderless large overlays; hierarchy via background luminance and thin borders.

## 6. Component Rules

### Admin Layout Components

- Page titles use `AdminPageHeader` only—do not duplicate title, description, divider per page.
- Sibling card containers use `AdminStack` for `16px` gutter.
- Ordinary cards use `AdminCard` (Admin panel shell, `20px` padding).
- Titled cards use `AdminCardHeader`; config pages compose via `ConfigCard`.
- Config sub-pages use `ConfigPage` for `SectionHeader`, `max-w-3xl` column, card stack, bottom save bar.
- Components in `components/admin-chrome.tsx`, `components/admin-layout.tsx`, `app/admin/(config)/_components/ui.tsx`. Change global spacing or card structure there—not per-page overrides.

### Buttons

- One primary action per view.
- Primary: brand orange; secondary: transparent or dark surface.
- Destructive: danger color, spaced from ordinary actions.
- Disabled: reduced opacity and no pointer events.

### Forms

- Default Input, Select, Switch, and medium Button height unified at `48px`; same row must not mix heights except compact `sm` actions.
- Segmented Switch keeps `4px` inner gutter between frame and selected block; selected block must not touch edge.
- Label above control; help text immediately below.
- Focus: brand border and low-opacity ring.
- Errors inline with `role="alert"` and danger container.
- Secrets must not persist in browser storage or echo on page.
- Admin internal tools prefer logged-in session—do not require Torznab API Key re-entry; APIs may still accept API Key for external callers.

### Status and Data

- Status = color dot + text; color alone is insufficient.
- Dashboard metric cards show current state—not trends without data basis.
- Homogeneous multi-row data: table; action sets: list; few key metrics: cards.
- Loading: warning pulse dot or explicit `Loading / Checking` text.
- Admin route and first data fetch use `Skeleton`—no blank areas or bare `Loading…`; skeleton size should match final layout to avoid reflow. Login and public pages without first-paint async data render directly; home health etc. use local skeleton only. Short button actions use Spinner or button state.

## 7. Motion and Accessibility

- Page entry animation `550–800ms`; obvious hero animation public site only.
- Admin continuous operation areas avoid repeated entry animation.
- All motion respects `prefers-reduced-motion`.
- Keyboard focus visible; interactive elements use correct `button`, `a`, `input` semantics.
- Body, status, controls meet WCAG AA contrast; color not sole information carrier.

## 8. Implementation Boundaries

- Global visual tokens: `app/globals.css`
- Tailwind semantic colors: `tailwind.config.ts`
- Public framework: `components/site-chrome.tsx`
- Public shared layout: `app/(site)/layout.tsx`
- Admin framework: `components/admin-chrome.tsx`
- Base controls: `components/ui/`

When changing overall visual direction, update this file and global tokens first; page needs must not introduce new global styles. Before commit, run at least TypeScript, ESLint, and production build checks.
