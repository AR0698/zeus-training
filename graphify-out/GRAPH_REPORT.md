# Graph Report - .  (2026-08-10)

## Corpus Check
- Corpus is ~23,377 words - fits in a single context window. You may not need a graph.

## Summary
- 343 nodes · 803 edges · 13 communities (12 shown, 1 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 7 edges (avg confidence: 0.76)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Community 0
- Community 1
- Community 2
- Community 3
- Community 4
- Community 5
- Community 6
- Community 7
- Community 8
- Community 9
- Community 10

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 21 edges
2. `reducer()` - 15 edges
3. `parseAppState()` - 15 edges
4. `App()` - 14 edges
5. `formatLoad()` - 14 edges
6. `AppState` - 14 edges
7. `formatRepRange()` - 11 edges
8. `isObject()` - 11 edges
9. `num()` - 11 edges
10. `TodayScreen()` - 11 edges

## Surprising Connections (you probably didn't know these)
- `freshSession()` --calls--> `createSession()`  [EXTRACTED]
  tests/session.test.ts → src/domain/session.ts
- `started()` --calls--> `createInitialState()`  [EXTRACTED]
  tests/state.test.ts → src/domain/seed.ts
- `StoreProvider()` --indirect_call--> `reducer()`  [INFERRED]
  src/state/store.tsx → src/state/reducer.ts
- `started()` --calls--> `reducer()`  [EXTRACTED]
  tests/state.test.ts → src/state/reducer.ts
- `App()` --calls--> `formatLoad()`  [EXTRACTED]
  src/App.tsx → src/domain/format.ts

## Import Cycles
- None detected.

## Communities (13 total, 1 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (62): Tab, TABS, dayMonth, formatClock(), formatDuration(), formatLoad(), formatNumber(), formatRepRange() (+54 more)

### Community 1 - "Community 1"
Cohesion: 0.09
Nodes (47): applySessionToPrograms(), clampLoad(), daysBetween(), decideProgression(), DELOAD_FACTOR, LAYOFF_DAYS, LAYOFF_FACTOR, layoffAdjustment() (+39 more)

### Community 2 - "Community 2"
Cohesion: 0.10
Nodes (24): container, StoreProvider(), BackupFile, backupFilename(), buildBackup(), downloadBackup(), ImportResult, pickBackupFile() (+16 more)

### Community 3 - "Community 3"
Cohesion: 0.06
Nodes (31): DOM, DOM.Iterable, ES2023, node, scripts, src, tests, vite/client (+23 more)

### Community 4 - "Community 4"
Cohesion: 0.16
Nodes (26): PersonalRecord, SessionExerciseStatus, SetEntry, ACCENTS, CURRENT_VERSION, EFFORTS, GROUPS, isObject() (+18 more)

### Community 5 - "Community 5"
Cohesion: 0.09
Nodes (23): eslint, @eslint/js, eslint-plugin-react-hooks, globals, devDependencies, eslint, @eslint/js, eslint-plugin-react-hooks (+15 more)

### Community 6 - "Community 6"
Cohesion: 0.09
Nodes (17): App(), isSessionStale(), ThemePreference, Haptics, useHaptics(), useNow(), RestTimer, useRestTimer() (+9 more)

### Community 7 - "Community 7"
Cohesion: 0.10
Nodes (20): dependencies, react, react-dom, displayName, engines, node, name, private (+12 more)

### Community 8 - "Community 8"
Cohesion: 0.20
Nodes (16): formatDayMonth(), formatRelativeDay(), formatVolume(), overview, PendingIncrease, pendingIncreases(), sessionsThisWeek(), startOfWeek() (+8 more)

### Community 9 - "Community 9"
Cohesion: 0.23
Nodes (11): BACKGROUND, chunk(), crc32(), encodePng(), insidePolygon(), insideRoundedRect(), MARK, OUT_DIR (+3 more)

## Knowledge Gaps
- **96 isolated node(s):** `name`, `displayName`, `version`, `private`, `type` (+91 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `AppState` connect `Community 1` to `Community 0`, `Community 8`, `Community 2`, `Community 4`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `Community 5` to `Community 7`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **What connects `name`, `displayName`, `version` to the rest of the system?**
  _96 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.06376726417866588 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.08587570621468926 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.10037878787878787 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.0625 - nodes in this community are weakly interconnected._