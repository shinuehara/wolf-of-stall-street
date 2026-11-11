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
- **Quarter prophecy** (the market model). Each quarter every factor gets a public range and
  a hidden destiny (`state.prophecies[id]`: low, high, target, progress). Each week a factor
  moves `PULL × (target × weeksDone/12 − progress)` + noise (`weekCenter`, `weekNoise`, set
  in `weeklyForecast`; sampled in `sampleMoves`). The weekly herald range (`*Forecasts`) is
  the public guess only. News moves `target` (and a bit of the public range); shocks move
  everything. `assetProphecy` combines factors for a basket/company. Experts answer about
  the asset's quarter (`targetForecast`), answers last the quarter, can be re-asked, and
  carry `week` + `publicMid`. A broker's fee (`TRADE_FEE`) is charged on stock trades.
- **Experts** have 5 ranks each (`maxRank` = 4). Drunk: true rumours (`listenToDrunk`), filler
  and clues rendered by his _current_ rank (`drunkLine`/`drunkPadding`). Astrologer: votes
  (`ASTRO_VOTES`). Spy: `parts` breakdown and guild report (`answer`, `spyBreakdown`). The
  first trained expert is the `confidant` (`perkCost`).
- **Week bars and stops.** `endWeek` builds a `WeekBar` per asset (gap, low, high, lowFirst),
  stored in `AssetState.bars` aligned with `history`; `checkStops` walks it for positions with
  `stopLoss`/`stopGain` (broker perk); charts draw bars via `oscillate(..., bars)`.
- **Time.** Quarter (`SEASON_LENGTH`) = 12 weeks = 3 months (`MONTH_LENGTH` = 4). Class
  review + party at week 12; visitors (merchant/smuggler) at weeks 4 and 8.
- **Story / gradual unlock.** `state.story.chapter`: 0 = bonds only (quarter 1, no experts,
  no visitors), 1 = bakers, 2 = mines + apothecaries; then guilds open by `minClass`.
  `GuildDef.minChapter` (default 1). `state.story.queue` holds cut scenes to show; every
  guild gets one influencer "trend" scene when it opens (`announceGuilds`, `story.announced`).
- **Investors.** Monthly flows vs the Crown bond (`applyInvestorFlows`), offers
  (`state.investorOffer`, `INVESTORS` in data.ts), dirty deposits (`riskyDeposits`) that can
  be confiscated. Flows go through `moveFunds` → `state.weekFlows` → `WeekRecord.flows`;
  returns, performance fees and bot metrics exclude them. `state.monthStart` must be bumped
  whenever money enters or leaves outside the market. Deposits follow the 3-month average
  excess (`monthlyExcess`); withdrawals react to the month or the average.
- **Managers.** Hired managers hold a position `mgr.<id>` (`managerAsset`, `isManager`);
  `endWeek` sets its weekly move from `managerPicks` (noisy read of the forecasts) minus fees.
  Code that walks `state.positions` must handle manager ids (no `guildOfAsset`/`assetRange`).
- **Class review.** Promotions any week the fund is above the ceiling (`offerTitles`, one
  title per ceiling; `ascensionOffer` is a number, `acceptAscension(state, levels)`); drops
  only at the quarter close (`reviewSeason`; below the Serf floor = dungeon).
- **Parking.** `parkedShare` (free gold + Crown bonds) is summed weekly in `monthParked`; a
  month above `PARK_LIMIT` cancels deposits and withdraws up to `PARK_OUT`.
- **Locked bonds** stay locked `BOND_LOCK_WEEKS`, then keep paying until sold (`isMatured`,
  `maturedValue`, `sellMatured`; `raiseCash` and `sellAll` include matured lots).
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
perks, oracle (knows every destiny: an upper bound for diagnostics). To explore, write a temporary `src/sim/zz-explore.test.ts` that prints
`summarize(...)` for 60 seeds with `--silent=false`, then delete it. Main levers:
`DRIFT_SCALE`, `CENTER_NOISE`, `NEWS_VISIBILITY`, `NEWS_LEAN`, `LEAN_SHARPNESS`
(forecast.ts); class fees/costs, spy noise, shocks, perk and item prices (data.ts).
Targets (the owner delegated difficulty): bonds alone never win; information beats guessing;
perks beat raw information; perks still have bad weeks (worst week < -10%); guessers go to
the dungeon in ~10-20% of games, informed bots almost never.

## Gotchas

- Prettier reflows long object literals in `data.ts`/`game.ts`; exact-string replacements
  written against the pre-format text silently miss. Check with grep after editing.
- Any change to `GameState` shape: bump `version` in types.ts and game.ts and update the
  check in `ui/storage.ts`, or old saves crash the UI.
- Small money amounts (expert fees, premiums) use 2 decimals (`fmtCost`); `fmt` is 1 decimal.
- `confirm()`/`alert()` do not work inside the Artifact host; confirmations are in-page.
- `render.ts` uses a module-level `CHART_WEEKS` set per render from the Scribe perk.
- The week time-lapse (`ui.timelapse`) auto-closes via `setTimeout` in `main.ts`; Playwright
  clicks on it must use `page.evaluate(() => el.click())` (it is replaced mid-click).
- Do not `rm` with a shell variable in the path; the sandbox refuses it. Use literal paths.
- Fonts: Pixelify Sans (display) + VT323 (body), with `font-variant-ligatures: none`
  (otherwise "fl" renders as a ligature).

## /consolide

The owner uses **/consolide** to ask Claude to write everything learned in the session into
the repo (this file, `docs/HANDOFF.md`, `docs/design.md`), commit and push, so the session
can be compacted. See `.claude/commands/consolide.md`.
