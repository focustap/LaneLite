# LaneLite

A small Windows League companion. Open it when you want draft help; closing the window exits the app. No overlay, ads, tray service, startup task, telemetry or account login.

## Download

Get the **setup `.exe`** or **LaneLite-Portable.exe** from [Releases](https://github.com/focustap/LaneLite/releases/latest). The installer supplies WebView2 if needed; the portable app needs Microsoft Edge WebView2 Runtime already installed. Releases are unsigned, so Windows may show a publisher warning. Do not run source ZIPs expecting an installer.

## What's in 0.4.3

- Automatic locked-champion detection, lobby/phase monitoring and visible enemy draft picks, preserving the tested automatic LP journal.
- Locked ally picks appear in a compact strip. Your actual lane opponent remains your choice.
- Live **OP.GG MCP trial**: champion performance, three difficult/favorable matchups, recommended ally synergies, a popular core/boots set, later-item alternatives, runes and skill order. Works for champion/role combinations supported by the provider; no API key needed for its current public endpoint.
- Three compact, selectable item paths use the three most-played fourth-item alternatives returned by OP.GG, plus separately sampled later-item choices. These are **not** three full-build win-rate rankings. Fewer paths appear if the provider supplies fewer alternatives.
- Sample counts, source, fetch time and provider patch are shown. Unreturned patch information stays unknown. These are role baselines, not automatic opponent-specific rune optimization or a predicted lobby win chance.
- Dated LoLalytics counter references for Briar, Amumu, Lillia, Warwick jungle and Sylas mid, plus contextual links for other champions. **No use of LoLalytics' restricted private API.** Fixed references carry their actual patch; some are 16.20 and should not be treated as current.
- Optional personal ally results from recent local ranked history, kept behind a details section and loaded on request. Small descriptive samples, not population synergy claims.
- 30-minute stats cache, capped at 12 champion/role combinations. League polling: 2.5s in draft, 4s around results, 20s in game, 10s idle, 15s disconnected. Everything stops when the window closes.

## Data sources

| Source | Used for | Scope |
| --- | --- | --- |
| Local League Client API | Locked champion/allies, visible enemy picks, phases, rank/LP snapshots, optional recent history | Read-only, `127.0.0.1` only; no account data sent externally |
| OP.GG official MCP endpoint | Counter examples, synergies, core/items/runes/skills | Public trial; only champion/role arguments; default ranked tier/region scope |
| LoLalytics public counter pages | Small dated references and links | Selected pairs only; fixed patch labels; no restricted API access |
| Riot Data Dragon | Champion names, portraits, item and rune icons | Public CDN |
| Riot public API | Future provider option for account history/rank | Not configured in this release; no Riot API key is embedded |

OP.GG's official MCP implementation is documented at https://github.com/opgginc/opgg-mcp and currently publishes `https://mcp-api.op.gg/mcp`. Endpoint availability and permission to redistribute provider data can change; this personal trial is not a claim of a commercial data license. LaneLite does not bulk harvest the dataset. Disable live requests in **Connection & data**. Expired cache entries refresh while the app remains open; failed requests wait at least ten minutes before an automatic retry. User-clicked source links open in your default browser, limited to OP.GG, LoLalytics and Mobalytics. The app continues to show references and local LP history if the provider fails.

OP.GG sometimes returns rounded rates, so the UI does not imply extra precision. The matchup rates always use the selected champion's `my_win_rate`, including difficult matchups. Synergy rates describe joint results in the provider's sample, not a causal improvement. Later completed-item rates have survival/selection bias; they are not proof that an item causes wins. LoLalytics Δ2 is a normalized matchup metric and is not mixed with OP.GG raw win rates.

## Updating an existing copy

Close LaneLite, then run the new **`LaneLite_*_x64-setup.exe`** under the same Windows account. The setup recognizes the existing LaneLite installation, reuses its folder and updates its executable. Do not uninstall first or select an option to delete app data. The installation remains per-user, matching prior releases. No automatic background updater is added.

If you run **LaneLite-Portable.exe**, close it and replace that file at its existing location; a portable copy has no installer registration for setup to upgrade. The same data identity is used in both cases.

Windows CI installs the checksum-verified v0.4.1 setup into a custom directory, runs the new setup without overriding its destination, and verifies one LaneLite registration, the same folder, the exact new executable and unchanged preservation markers in both app-data directories. This verifies installer data preservation; journal compatibility is separately protected by the unchanged identifier and storage key.

## Keep your history

The app identifier remains **`com.lanelite.prototype`** and the journal key remains **`lanelite.auto.v2`**. Close the old version before opening this one. Local history stays on the PC and is not pushed to GitHub. LP differences are recorded only after observing a ranked game and its updated rank. Promotions, missed games and ambiguous updates are handled conservatively.

The core connection, rank/LP, Briar lock-in and an automatic +20 LP result were verified by the user on Windows in v0.2; v0.3 was also reported working. New 0.4 integrations are covered by tests and Windows CI, but still need a live League draft on the user's machine. Local recent-history availability depends on the unsupported client endpoint.

## Develop

Install Node.js, Rust stable and Visual Studio C++ Build Tools (Desktop development with C++), then:

```powershell
npm ci
npm test
npm run desktop
```

For an installer: `npm run desktop:build -- --bundles nsis`. GitHub Actions runs JavaScript and native Rust tests, compiles Windows executables, uploads artifacts, and publishes a versioned release. SHA256SUMS.txt accompanies the downloads. Every push to `main` runs the pipeline.

`LaneLite_v04_Demo.html` is a self-contained browser preview; it uses dated references and cannot connect to League or call native OP.GG commands. The simulated LP example is labeled. Run `python tools_make_demo.py` to regenerate it. Earlier demos are retained as historical files.

## Security and policy

LCU credentials never enter JavaScript, logs or exports. The local adapter uses fixed read-only routes and accepts Riot's self-signed certificate only for hardcoded localhost requests. OP.GG uses a separate client with normal certificate validation and a fixed public endpoint. No game-memory access, injection, hidden enemy scouting, automatic actions or rune imports. Draft detection is limited to visible draft queues 400, 420, 440 and 700.

Riot's client API is unsupported and may change. This project does not claim Riot approval; review https://developer.riotgames.com/docs/lol and Riot developer policies before broader distribution.

LaneLite isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games, and all associated properties are trademarks or registered trademarks of Riot Games, Inc.
