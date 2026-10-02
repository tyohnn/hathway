# graphite

A dark, dense dashboard design system. It was built from one reference screenshot of a Sales CRM
"Companies" screen and keeps that screen's character: quiet near-black planes, hairline dividers,
compact rows, and a few saturated accents that carry meaning.

A complete, frozen snapshot forked from foundation (shadcn components on Base UI primitives plus the
three CSS layers). Every file under `styles/` is this system's own; nothing is composed at runtime.

## Character

- **Dark first.** The look is designed for `.dark`; the light values only give new slots a
  matching personality. Put `dark` on `<html>`, never on a subtree (see Clay).
- **Planes, not shadows.** Depth comes from background steps about 4% apart, not from elevation:
  background `#151515`, sidebar `#1a1a1a`, field `#1a1a1a`, raised surface (card, popover) `#1f1f1f`,
  secondary/accent `#262626`.
- **Hairlines.** Borders are opaque greys one step above their plane: `--border #262626`,
  row dividers `--border-subtle #232323`, emphasised edges `--border-strong #2f2f2f`,
  control borders `--input #2c2c2c`.
- **Dense.** Label buttons 28px, icon buttons 29px, table rows 41px with a 37px head, sidebar items
  29px (active 31px), tags 20px. Body table text 13/19, table head 11/15, sidebar items 13/19.
- **Two accents with separate jobs.** Blue `--primary #3d4ef5` is for the primary action only.
  Yellow `--checked #facc15` is for selection (checked and indeterminate checkboxes). Do not swap
  them and do not add a third accent for state.

## Key values

| Slot | Dark value | Meaning |
|---|---|---|
| `--foreground` / `--muted-foreground` / `--foreground-subtle` | `#f2f2f2` / `#8c8c8c` / `#5e5e5e` | text, secondary text, section labels |
| `--primary` · `--primary-border` | `#3d4ef5` · `#5460e0` | primary button fill and its one-step-lighter edge |
| `--checked` · `--checked-foreground` | `#facc15` · `#0a0a0a` | checkbox fill and check mark |
| `--link` | `#8fb2ff` | links (same hue as the blue tag text) |
| `--muted` | `#1e1e1e` | selected table row |
| `--control-font-weight-regular` · `--ui-font-weight-regular` | 400 | only the primary button and labels stay at 500 |
| `--table-row-height` · `--table-head-height-default` | 41px · 37px | row boxes include the divider |

## Clay (restrained, level C)

Controls look very slightly moulded. Layer 2 composes `--shadow-control`, `--shadow-control-primary`,
`--shadow-raised`, `--shadow-control-pressed`, `--shadow-recessed`, `--surface-control` and
`--surface-primary` from layer-1 `--clay-*` materials.

The reference canvas was stronger (6% highlight, 45% shade, 35% ambient, top-to-bottom gradients).
On 2026-09-15 the owner chose the restrained step **C**: in dark mode only a 3% top highlight and a
contact shadow (20% / 12%) remain, shade and ambient are transparent, the control surface is a single
colour (`#191919`), and only the primary button keeps a gentle gradient (`#4a5af7` → `#3443ea`).

Where clay applies: outline, secondary and primary buttons (pressed state sinks in), the select
trigger, the active sidebar item and its count badge. Ghost, destructive and link buttons stay flat.
Unchecked checkboxes are recessed.

⚠ The compositions are resolved on `:root`. If `.dark` is placed below `<html>`, they freeze with the
light materials.

## Tags (`data-tone`)

`<Badge variant="outline" data-tone="blue">` gives a tinted tag: a dark tinted background, a
one-step-lighter border of the same hue, and light text. Tones: `blue`, `purple`, `green`, `orange`,
`red`, `yellow`, `gray`. Shape: 20px high, radius 9, 9px side padding, 12/17 at weight 400, flat
(`--tag-shadow: none`; set it to `var(--shadow-raised)` for raised tags).

Avatar initials use the same idea with `<AvatarFallback data-tone="navy">`: `slate`, `teal`, `plum`,
`olive`, `rust`, `navy`, `moss`, `mauve`, with `--avatar-tone-foreground #e6e6e6` initials at 9px / 600
on 20px small avatars.

Tones are categorical (segment, owner), not status. Use `--success`, `--warning`, `--destructive`
for state.

## Do not

- Do not use the blue primary for selection, active navigation or tags.
- Do not put elevation shadows (`--shadow-float`) on in-page surfaces; separate planes by colour.
- Do not raise the clay strength back toward the reference canvas without an owner decision.
- Do not add hover backgrounds to sidebar items; hover only brightens the text.
- Prefer tuning an existing slot over editing a layer-3 rule; a new slot belongs in foundation first.
- Do not use weights other than 400 and 500 in UI text; 600 is reserved for small initials.

## Files

- `system.json` — name, description, `forkedFrom`, fonts, tags, source.
- `styles/globals.css` — layer 1, complete (`:root` and `.dark`).
- `styles/tokens.css` — layer 2, complete.
- `styles/typeset.css`, `styles/typeset-preset.css` — long-form typesetting.
- `styles/style.css` + `styles/components/*.css` — layer 3, complete. Its button, checkbox, tag, table,
  line-tab and sidebar looks are values of the foundation slots, so the rule files equal foundation's.
- `reference/` — the written specification and canvas stylesheet the values came from.
