# 24 Meals for 24

A birthday menu for Jeeviga: twenty-four dinners, cooked by her sister,
redeemable over the year. Built from the "24 Meals for 24" design canvas
(desktop + phone artboards) and served as a static site from GitHub Pages.

No build step, no dependencies, no server. The four files below are the site.

## Deploying

1. Put these files in the repository root.
2. Settings → Pages → Source: **Deploy from a branch**, branch `main`, folder `/ (root)`.
3. It goes live at `https://<user>.github.io/<repo>/` within a minute or two.

## Files

| File | What it is |
| --- | --- |
| `index.html` | The whole page — hero, how it works, the 12-dish menu, the 24-stamp card, the sign-off. Fully readable without JavaScript. |
| `styles.css` | Design tokens and layout. Light ("paper") and dark ("candlelight") themes, plus a print stylesheet so the card can be printed as a physical voucher. |
| `app.js` | Progressive enhancement: stamping, filters, surprise-me, undo, theme toggle. |

## Design

Taken straight from the canvas: Fraunces (display) over Instrument Sans (body),
warm paper `#f6efe4`, cream cards `#fffaf2`, ink `#2a211b`, a single clay accent
`#b03a22`.

## How the stamp card works

Each dish has a **Use a stamp** button. Pressing it fills the next free stamp,
records the dish and the date in "Already eaten", and offers an undo. A used
stamp can be freed again by clicking it, or via the × in the list. Everything is
kept in `localStorage` on the device that used it — there is no server and
nothing is sent anywhere.

## Editing the menu

Dishes live directly in `index.html` as `<li class="dish">` items. To change one,
edit its number, mood badge, name and description in place. `data-course` decides
which filter chip it appears under (`main`, `sweet`, `wildcard`). The stamp count
is 24 `<li class="stamp">` items in the same file; `TOTAL` in `app.js` must match
if that ever changes.
