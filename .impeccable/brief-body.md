# Surface: Flow mini-player (compact + expanded)

Scope: the app's one window in its two states — compact mini-player (328×188) and expanded panel (360×664). Visitor mode: **Operate** — the user came to run a work session, not to browse.

Audience & job: a knowledge worker starting a focus block; they set the plan once, press play, and the window stays out of the way. Constraints: pinned native macOS-minimal world, warm clay accent, light + dark, frameless transparent window, main-process timer truth.

## Direction contract

THESIS: Flow owns the idea that a Pomodoro window should read like a precision instrument face, not an app screen — a quiet bar of typography and one thin line of progress. It refuses the category-default arrangement of a big circular progress ring inside a floating card.

OWN-WORLD: Warm off-white ground (#F7F5F1) in light, warm charcoal (#201E1B) in dark; ink #23211E / #ECE8E1; secondary #8A857D / #9B958C; hairline separators rgba(ink, 0.08–0.10); single accent warm clay (#B25B3C light, #D2795A dark) with a desaturated soft tint for break mode. SF Pro / system sans throughout, timer set in tabular numerals at 44px/600 compact and 34px/600 expanded; section labels 10.5px/600 uppercase, +0.08em tracking, secondary color. Radii: window 12px, controls 8–9px, play button a 34px circle. Elevation declared once: a single soft window shadow, no card shadows inside. Component language: label-left/stepper-right settings rows, 1px hairline section separators instead of cards, 22px icon buttons with hover tint. 1.2.0 additions stay inside that language: presets are hairline chips, the seven-day strip is seven 9px bars scaled to the week's maximum, estimates are quiet 10px selects with a hairline chevron, and the reorder grip appears only on hover or focus.

STORY: The user glances and knows the state in under a second — phase, time left, which flow, what task. They press one button and return to work; the window is a face, not a destination. If they walk away, the face says `paused away` and the clock has given the time back rather than counting it.

FIRST VIEWPORT (compact): 30px drag titlebar — "FLOW" tracked 10.5px wordmark left, flow-beads progress row center, pin / settings / expand / hide icon buttons right. Then the 44px countdown, phase line ("Focus · Flow 2 of 4", "Long break · Flow 3 next", or "… · paused away"), a 2px full-width linear progress hairline, a centered transport row (reset · clay play/pause circle · skip), and the current-task row (circle checkbox + task text) anchored to the bottom edge as the compact footer. Expanded keeps the same header at 34px timer, then either the working sections — SESSION (flows/focus/break steppers, a long-break row with cadence select, three duration presets, and a quiet short-plan note), TASKS (add row with per-flow assignment, rows with checkbox / inline-edit / estimate select / flow tag / hover grip / delete) — or, behind the gear, FOCUS (auto-start breaks, auto-start focus, pause when away), APP (launch at login, global shortcut with keycaps and registration state, pause when locked), DATA (local export/import), and KEYS. Both views share the footer: seven-day focus bars and either today's tally or, when a session just ended, `Day close · 1h 40m of 2h planned`.

FORM: the chosen form is the compact instrument bar growing into the panel — position 1 of the shaped list; seed key: none (brief-pinned direction, concept-seed skipped by request precision; code-led Operate surface, no image generation available).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.
