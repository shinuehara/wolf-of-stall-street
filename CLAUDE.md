# CLAUDE.md: The Wolf of Stall Street

Notes for any Claude session working on this repo. Read this first, then `docs/HANDOFF.md`
(current state, open decisions, next steps) and `docs/design.md` (game rules and numbers).

## The project

A turn-based medieval investing game in the browser (PT-BR: _O Lobo do Condado Faria Lima_).
You manage an investment fund in the city of Valdouro and climb the social ladder from
**Servo** to **Conde**. Pixel-art UI, vivid night palette, one fixed screen with location
navigation (Praça, Mercado, Carteira, Taverna, Castelo).

- Owner: shinuehara (GitHub). Talks to Claude in **Brazilian Portuguese**; reply in PT-BR.
- All in-game text is **PT-BR**; code, comments, commit messages are **English**.
- Work goes straight to `main` (the owner asked for this). Commit and push after each feature.

## Commands

```bash
npm install
npm run dev            # local dev server
npm test               # vitest (sim, balance bots, ceremony)
npm run typecheck
npm run build          # tsc + vite build into dist/
npm run format         # prettier (run before committing)
npm run bundle:artifact -- <out.html>   # build + one-file page for the test artifact
```

## Architecture

```
src/sim/          pure simulation, no DOM, deterministic by seed (mulberry32 in GameState)
  types.ts        all state and definition types; GameState.version gates old saves
  data.ts         every tunable number and all content text (classes, guilds, companies,
                  regions, news, experts, perks, items, ranks)
  forecast.ts     banded forecast model (4 bands, hidden weights), hedge, balance levers
  assets.ts       assets (baskets, companies, Crown bonds) and the factor model
  game.ts         newGame, player actions, endWeek (the whole turn), seasons, visitors
  bots.ts         scripted players for balance (only see what a player sees)
  *.test.ts       game rules, forecast math, balance targets
src/ui/
  render.ts       renders every screen and modal as HTML strings (big file)
  scenes.ts       procedural pixel-art backdrops + the quarter-close party (galaUrl)
  sprites.ts      12x12 pixel sprites as strings, rank variants (expertSprite)
  ceremony.ts     who speaks at the quarter close and what they say
  story.ts        story cut scenes (opening decree, influencer); art in scenes.ts storyUrl
  storage.ts      localStorage save; rejects saves whose version differs
src/main.ts       event delegation (data-action attributes), UiState, finishWeek flow
src/style.css     tokens on :root, pixel frames (.px), all component styles
docs/design.md    the game design, kept up to date with numbers
docs/HANDOFF.md   status, decision log, open questions, next steps
```

Key model facts (details in `docs/design.md`):

- **Fund vs purse.** `wealth()` is the investors' fund; `state.purse` is the manager's own
  money. Fees (management + performance) move fund → purse every week. Experts, perks,
  titles, visitor items and living cost are paid from the purse. Class is measured by fund.
- **Factor model.** Company weekly move = city GDP × region.cityBeta + sector × beta +
  district demand × LOCAL_DEMAND[sector] + own move. Baskets average their companies.
- **Forecasts** are public ranges `[low, high]` split into 4 bands with hidden weights (lean).
  News shifts only partly show in the public range (`NEWS_VISIBILITY`); the rest hides in
  the lean. Experts reveal the lean with noise; perks reduce the noise.
- **Time.** Quarter (`SEASON_LENGTH`) = 12 weeks = 3 months (`MONTH_LENGTH` = 4). Class
  review + party at week 12; visitors (merchant/smuggler) at weeks 4 and 8.
- **Story / gradual unlock.** `state.story.chapter`: 0 = bonds only (quarter 1, no experts,
  no visitors), 1 = bakers, 2 = mines + apothecaries; then guilds open by `minClass`.
  `GuildDef.minChapter` (default 1). `state.story.pending` holds a cut scene to show.
  Tests use a `newGame` wrapper in `game.test.ts` that skips the opening (chapter 2).
- **Shocks** happen outside the announced range; insurance (hedge) clamps them too.

## Workflow the owner expects

1. Implement, then run `npx prettier --write src docs`, `npx tsc --noEmit`, `npx vitest run`.
2. Check the UI in headless Chromium (Playwright is preinstalled: `require('playwright')`,
   `chromium.launch()`), desktop 1280x800 and phone 390x844, no page scroll, no console
   errors. Serve with `npx vite preview --port 4174` after `npm run build`. Use
   `.nav-btn[data-screen="..."]` selectors (some screens have hidden duplicate links).
3. Commit to `main` with a descriptive English message, push (`timeout 90 git push`; a push
   once hung and had to be retried).
4. Rebuild the test page and republish the private Artifact so the owner can play:
   `npm run bundle:artifact -- <scratchpad>/wolf-of-stall-street.html`, then publish that
   file to **https://claude.ai/artifact/4d9DY4NaMyWvHfBuC5rhDq** (pass it as `url` from a new
   session; read it first, as the Artifact tool requires).
5. Reply in PT-BR: what changed, how to see it, numbers from the bots, open points.

## Balance

`src/sim/bots.ts` + `src/sim/balance.test.ts`. Strategies: bonds, naive, astrologer, spy,
perks. To explore, write a temporary `src/sim/zz-explore.test.ts` that prints
`summarize(...)` for 60 seeds with `--silent=false`, then delete it. Main levers:
`DRIFT_SCALE`, `CENTER_NOISE`, `NEWS_VISIBILITY`, `NEWS_LEAN`, `LEAN_SHARPNESS`
(forecast.ts); class fees/costs, spy noise, shocks, perk and item prices (data.ts).
Targets: bonds alone never win; information beats guessing; perks beat raw information;
perks still have bad weeks (worst week < -10%).

## Gotchas

- Prettier reflows long object literals in `data.ts`/`game.ts`; exact-string replacements
  written against the pre-format text silently miss. Check with grep after editing.
- Any change to `GameState` shape: bump `version` in types.ts and game.ts and update the
  check in `ui/storage.ts`, or old saves crash the UI.
- Small money amounts (expert fees, premiums) use 2 decimals (`fmtCost`); `fmt` is 1 decimal.
- `confirm()`/`alert()` do not work inside the Artifact host; confirmations are in-page.
- `render.ts` uses a module-level `CHART_WEEKS` set per render from the Scribe perk.
- Fonts: Pixelify Sans (display) + VT323 (body), with `font-variant-ligatures: none`
  (otherwise "fl" renders as a ligature).

## /consolide

The owner uses **/consolide** to ask Claude to write everything learned in the session into
the repo (this file, `docs/HANDOFF.md`, `docs/design.md`), commit and push, so the session
can be compacted. See `.claude/commands/consolide.md`.
