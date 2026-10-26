# LaneLite v0.3 — lightweight, local League companion

## Confirmed in v0.2 on the user's Windows machine
- Successfully connected to their running League client.
- Automatically read their rank and LP.
- Automatically selected Briar when locked in.
- After a real ranked win, automatically logged +20 LP and a 1-0 journal.

These are user-verified outcomes for **v0.2**; the new features introduced in **v0.3** below have **not yet been confirmed in their own live League client**.

## New in v0.3

1. **Auto enemy picks in champion select.** Native Rust adapter reads `/lol-champ-select/v1/session` in supported visible draft queues (Normal Draft 400, Ranked Solo 420, Ranked Flex 440, Clash Draft 700) and returns only `championId` values for the 5 enemy slots. Never reads `pickIntent`. For enemy cell actions marked pending, holds the pick until the action is `completed`. **Does not expose hidden enemy champions** from ARAM, blind modes or unknown queues. Polls every 6.5 seconds while LaneLite is open. Existing editable sidebar enemy slots remain, and manually edited slots are not overwritten during that draft. Click **Reset slots to auto-detect** to resume syncing.
2. **Full six-item build paths + full rune pages** for a curated first batch: Briar, Amumu, Lillia, Warwick jungle; Sylas mid. Uses manually curated patch **16.20** references, researched **October 13, 2026**. For every pick, shows the actual six named items, keystone, primary four runes, secondary two, shards, and skill max. Briar also has a separate bruiser-vs-frontline route. The curated reference links are in the app. **These are fixed baselines, not a licensed live statistics feed**. We don't calculate or claim champion-vs-champion win rates.
3. **Team-dependent choices**: Enemy-team damage/CC/tank/healing profile can change boots, a defense slot, Briar's Lord Dominik's Regards to Mortal Reminder against enough healing, etc. Every swap is labeled and explained, and comes from a transparent, rule-based decision, not statistical optimization. Actual item purchases in the game can matter more than draft picks.
4. **Riot Data Dragon** supplies current champion names, latest known version, item icon IDs, rune artwork, and a warning if the curated build patch differs from the current live patch. The app does not scrape Mobalytics; source links are for checking the references, with no bulk ingestion.
5. **LP history is preserved from v0.2.** Both versions use `lanelite.auto.v2` for the journal localStorage. No extra service, overlays, startup tasks or injections.

## Windows update instructions

Close LaneLite. Extract this new source ZIP, open PowerShell in its `LaneLite` folder (the one containing `package.json`), then run:

```powershell
npm install
npm run desktop
```

Rust and Visual Studio C++ Build Tools were already installed for v0.2 and do **not** need reinstalling. First run compiles the updated native adapter. If the version still reads 0.2, close the previous LaneLite window and launch the app from this v0.3 folder.

Build a standalone installer with `npm run desktop:build` (Windows machine required). ZIP contains editable **source code**, not a precompiled `.exe`.

## Browser demo

`LaneLite_v03_Demo.html` is an offline-usable self-contained HTML preview. Click *Try an example composition* to see the new six-item Briar build, situational changes, and full runes. The LP tracker button runs a **simulation**, not a real Riot account. The browser preview **cannot** auto-detect the League client or enemy champions, which need the native app.

## Privacy, client and data limitations

- Local `lockfile` password is read **only by native Rust** and never forwarded to the JavaScript UI, logs or CSV. All League calls stay on `https://127.0.0.1`. No reads from game memory, no injection, no writes to game state, no action clicks or automatic rune imports.
- The read-only League Client API is **unsupported and can change**, and v0.3 enemy-pick behavior still needs testing on a real ranked draft. Polling stops when the window closes.
- Changing Riot accounts triggers the existing tracker isolation. Keep the app open to capture pre-/post-match LP snapshots. Rank changes where precise LP can't be computed remain marked unknown, not guessed.
- The auto-enemy feature is intentionally limited to **enemy champions visible in champion select**. It does not attempt hidden pick scouting.
- Curated baseline items and matchup heuristics are not up-to-date live performance rankings. No claim of being statistically optimal. Test in practice and confirm Riot policy before distribution.
- Third-party player-facing tools using the League Client API must be registered/reviewed under Riot's developer policies before distribution. This prototype does **not** claim approval. Details: https://developer.riotgames.com/docs/lol and https://support-developer.riotgames.com/hc/en-us/articles/22698591841939-General-Policies

## Run tests

```powershell
npm test
```

Included JavaScript tests verify that v0.2 LP tracker behavior is unchanged and test composition-dependent build paths, 6 distinct items, no invented profiles for unsupported roles, and Data Dragon item/rune mapping. Rust has additional enemy-team visibility/unit tests, but we could not compile or run them in this environment. Use `cargo test` inside `src-tauri` from a Windows Rust shell to run those tests if desired.

## Main files

- `src-tauri/src/lib.rs` — local League snapshots, ranked stats, *visible enemy pick IDs*.
- `web/app.mjs` — UI, local auto-sync, build panels, Data Dragon lookups.
- `web/builds.mjs` — curated item/rune baselines and team-dependent adjustments.
- `web/logic.mjs` — champion traits, matchup tips, composition/counterpick ideas.
- `web/tracker.mjs` — unchanged LP reducer and journal logic.
- `tests/*.test.mjs` — pure regression tests.

Required legal notice also appears in the app UI:

> LaneLite isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games, and all associated properties are trademarks or registered trademarks of Riot Games, Inc.
