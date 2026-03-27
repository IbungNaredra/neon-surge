# NEON SURGE — Master Design & Infrastructure Document
**Version:** 1.0 (compiled)  
**Status:** Draft  
**Last Updated:** March 2026  
**Sources:** PRD v1.2 + Infrastructure Guide v1.0

---

## Document Map

| Part | Contents | Audience |
|---|---|---|
| **Part 1 — Product** | What the game is, how it plays, all game rules | Designer, Developer |
| **Part 2 — Technical Architecture** | Multiplayer system, game loop, code structure | Developer |
| **Part 3 — Infrastructure** | Hosting, deployment, server code, cost | Developer, DevOps |

---

# PART 1 — PRODUCT

---

## 1. Product Overview

### 1.1 Summary
NEON SURGE is a mobile-first roguelike survival arcade game playable entirely in the browser. Players control a character with a right-hand virtual joystick. Weapons attack automatically based on player stats. Each wave of enemies grows harder via a scaling multiplier, and every wave culminates in a boss encounter. Between waves, players choose upgrades that define their run's build. Up to 4 players can join the same session online via a room code — and the more players join, the harder the game gets.

### 1.2 Design Pillars
- **Effortless to pick up.** Right thumb on joystick. Everything else is automatic.
- **Deep through repetition.** Weapon choice, upgrade paths, and enemy types create emergent strategy.
- **Visually punchy.** Neon 8-bit aesthetics with satisfying feedback on every hit.
- **Better together — but harder together.** Co-op is rewarding and the scaling difficulty keeps it tense at any player count.
- **Short sessions, high replayability.** A full run targets ~10 minutes. Death resets everything. Fast enough to fit in a break; punishing enough to earn a win.

### 1.3 Target Platform
- **Primary:** Mobile browser (iOS Safari, Android Chrome)
- **Secondary:** Desktop browser (mouse + keyboard as fallback)
- **Minimum screen width:** 360px
- **Orientation:** Portrait only

---

## 2. Visual Design & Aesthetic

### 2.1 Theme
Neon arcade, 8-bit pixel art. Think CRT screen in a dark arcade room. Every element glows.

### 2.2 Color Palette

| Role | Color | Hex |
|---|---|---|
| Background | Deep navy black | #080C14 |
| Grid lines | Dark blue | #0D1F3C |
| Player 1 | Cyan | #00F0FF |
| Player 2 | Lime green | #39FF14 |
| Player 3 | Hot pink | #FF69B4 |
| Player 4 | Orange | #FF9500 |
| Gun enemies | Magenta | #FF00CC |
| Melee enemies | Orange-red | #FF6600 |
| Tank enemies | Green | #00FF88 |
| Projectiles | Yellow | #FFE500 |
| UI accent | Hot pink | #FF0080 |
| Boss health bar | Red to orange gradient | #FF2222 → #FF8800 |
| Damage numbers | White / yellow / red (crit) | #FFFFFF / #FFE500 / #FF4444 |
| Revive indicator | Pulsing white ring | #FFFFFF |

### 2.3 Typography
- **Display / HUD:** Press Start 2P (Google Fonts) — all caps, pixel look
- **Fallback:** monospace system font

### 2.4 Visual Effects
- `shadowBlur` + `shadowColor` on Canvas for glow on all drawn elements
- Screen flash (white overlay, 100ms) on player taking damage
- Screenshake (±6px random offset for 250ms) on boss hits — intensity scales with damage
- Floating damage numbers: spawn at hit location, drift upward, fade out over 600ms
- Boss entrance: full-screen flash + boss name banner for 1.5s when boss spawns
- Downed player: grey desaturated sprite with pulsing white revival ring
- Pixel-art sprite style: entities drawn as colored rectangles with pixel detail (sprite sheets in v2)

---

## 3. Screen Layout (Mobile Portrait)

### 3.1 Solo Layout
```
┌────────────────────────────┐
│  WAVE 7  │ ♥♥♥♥░ │ XP 340 │  ← HUD bar (fixed top, 48px)
├────────────────────────────┤
│  [BOSS: VOLT TYRANT ████░] │  ← Boss HP bar (only when boss is alive)
│                            │
│       [game arena]         │
│                            │
│    enemies chase player    │
│                            │
├────────────────────────────┤
│ [stat panel]  [joystick●]  │  ← Control strip (fixed bottom, 160px)
└────────────────────────────┘
```

### 3.2 Co-op Layout
```
┌─────────────────────────────────────┐
│ WAVE 7  [P1 ████] [P2 ██░] [P3 ░░] │  ← All player HP visible in HUD
├─────────────────────────────────────┤
│   [BOSS: DOOM CARRIER ██████░░░░]   │
│                                     │
│       [shared game arena]           │
│       all players visible           │
│                                     │
├─────────────────────────────────────┤
│  [stat panel]          [joystick●]  │
└─────────────────────────────────────┘
```

### 3.3 HUD Bar (top)
- Wave number — left
- Solo: HP bar with segment icons (center) + XP/score (right)
- Co-op: Each player's HP as a colored mini-bar labeled P1/P2/P3/P4. Downed players shown as grey with skull icon.

### 3.4 Boss Health Bar
- Visible only while boss is alive
- Below HUD bar, centered, 85% screen width
- Red-to-orange gradient fill on dark background bar
- Boss name + wave label above (e.g. "WAVE 5 — VOLT TYRANT")
- Pulsing neon-red glow; glow intensifies below 25% HP

### 3.5 Control Strip (bottom)
- **Left side:** Current weapon display + live stat readout (ATK / SPD / RNG)
- **Right side:** Virtual joystick (130px diameter) — right thumb zone

---

## 4. Joystick

### 4.1 Position
- Fixed to the **bottom-right** of the screen
- Center point: 75px from right edge, 75px from bottom of control strip
- Optimized for right-thumb operation on portrait mobile

### 4.2 Behavior
- Rendered as two concentric circles (outer ring + inner knob)
- Touch/drag: knob follows finger, clamped to outer ring radius (55px)
- Outputs normalized direction vector: `{ x: [-1, 1], y: [-1, 1] }`
- Dead zone: ignore input if knob displacement < 8px
- On touch release: knob snaps to center; player stops
- Desktop fallback: WASD keys map to direction vector

### 4.3 Visual
- Outer ring: dark fill + cyan border glow
- Inner knob: cyan solid with white center dot
- Opacity 0.75 at rest, 1.0 when active

---

## 5. Player

### 5.1 Base Stats

| Stat | Description | Base Value |
|---|---|---|
| `maxHP` | Total health points | 100 |
| `speed` | Movement pixels/sec | 180 |
| `damage` | Base damage per attack (modified by weapon) | 10 |
| `attackRate` | Attacks per second | 1.0 |
| `range` | Max attack range in pixels | 200 (gun) / 80 (melee) |
| `armor` | Flat damage reduction | 0 |
| `critChance` | % chance to deal 2× damage | 5% |
| `xpMultiplier` | Multiplier on XP gained | 1.0 |

### 5.2 Movement
- Player moves in joystick direction × `speed` × `dt`
- Clamped to arena boundaries
- No collision with other players or enemies (pass-through; damage on overlap)

### 5.3 Weapon Slot
- Player holds **one weapon at a time**: gun OR melee — cannot dual-wield
- Weapon swappable via upgrade screen between waves
- Active weapon shown in control strip (bottom-left)

### 5.4 Player Colors (Co-op)
Assigned in join order: Cyan (P1), Lime (P2), Hot Pink (P3), Orange (P4). Applied to sprite, HUD bar, and damage numbers.

---

## 6. Weapon System

### 6.1 Weapon Types
**Gun weapons** — attack at range, fire a projectile, lower base damage.  
**Melee weapons** — instant area damage around player, no projectile, higher base damage (1.8× coefficient built in) to compensate for short range. Player can hold only one weapon type at a time.

### 6.2 Damage Formula
```
Final Damage = WeaponBaseDamage × PlayerDamageStat × (2 if crit, else 1) − EnemyArmor
```

### 6.3 Gun Catalog (10 weapons)

| # | Name | Base Dmg | Attack Rate | Projectile Speed | Special Trait |
|---|---|---|---|---|---|
| G1 | PIXEL PISTOL | 12 | 1.5/s | 400px/s | Standard single shot |
| G2 | NEON BURST | 8 | 3.0/s | 500px/s | Fires 3 rapid shots per burst |
| G3 | PLASMA RIFLE | 22 | 0.8/s | 350px/s | Pierces through 2 enemies |
| G4 | LASER BEAM | 6/tick | Continuous | — | Hitscan beam to nearest enemy |
| G5 | SCATTER SHOT | 10 | 1.0/s | 450px/s | Fires 5 projectiles in a cone |
| G6 | VOLT CANNON | 35 | 0.4/s | 300px/s | Slow fire, massive single-target burst |
| G7 | CHAIN ZAP | 15 | 1.2/s | 380px/s | Chains to 2 additional nearby enemies |
| G8 | NOVA SHELL | 20 | 0.6/s | 280px/s | Explodes on impact, 60px AoE |
| G9 | PHANTOM DART | 18 | 1.0/s | 600px/s | Applies 2s slow (−40% speed) on hit |
| G10 | TWIN BLASTER | 9 | 2.0/s | 420px/s | Fires simultaneously at 2 nearest enemies |

### 6.4 Melee Catalog (10 weapons)

| # | Name | Base Dmg | Attack Rate | Radius | Special Trait |
|---|---|---|---|---|---|
| M1 | PIXEL BLADE | 22 | 1.5/s | 75px | Standard slash |
| M2 | SHOCK FIST | 18 | 2.0/s | 65px | Very fast, shorter range |
| M3 | PLASMA WHIP | 28 | 0.8/s | 110px | Widest melee range |
| M4 | VOID AXE | 45 | 0.5/s | 80px | Slow swing, massive damage |
| M5 | NEON HAMMER | 35 | 0.6/s | 90px | Knocks enemies back 50px |
| M6 | BLADE STORM | 14 | 3.0/s | 70px | Very fast spin, hits all in radius |
| M7 | CRYO LANCE | 25 | 1.0/s | 85px | Applies 3s freeze (stops movement) |
| M8 | FLAME RING | 16/tick | Continuous | 80px | Constant burn aura |
| M9 | GRAVITY PUNCH | 30 | 0.9/s | 75px | Pulls enemies 40px inward before damage |
| M10 | PHANTOM BLADE | 20 | 1.2/s | 95px | 25% chance to dodge next hit after attacking |

---

## 7. Enemy System

### 7.1 Stat Scaling
```
Enemy Stat = BaseStat × totalDifficulty(wave, players)
```
See Section 9 for the full `totalDifficulty` formula.

### 7.2 Enemy Catalog (10 types)

| # | Name | Visual | Base HP | Base Speed | Base Dmg | Armor | Behavior |
|---|---|---|---|---|---|---|---|
| E1 | CRAWLER | Small magenta square | 30 | 80px/s | 8 | 0 | Moves directly toward nearest player |
| E2 | RUSHER | Thin orange rectangle | 20 | 160px/s | 12 | 0 | Very fast charge at nearest player |
| E3 | TANK | Large dark green square | 150 | 40px/s | 15 | 5 | Slow, high HP and armor |
| E4 | SPLITTER | Cyan diamond | 50 | 70px/s | 10 | 0 | Spawns 2 Crawlers on death |
| E5 | SHOOTER | Purple hexagon | 40 | 50px/s | 14 | 0 | Stops at range, fires projectile every 2s |
| E6 | GHOST | White translucent circle | 35 | 90px/s | 9 | 0 | Periodically phases through arena boundary |
| E7 | BOMBER | Yellow square, blinking | 25 | 60px/s | 0 | 0 | Runs to player and explodes (40 AoE dmg) |
| E8 | REGENERATOR | Teal rectangle | 80 | 55px/s | 11 | 0 | Heals 3 HP/sec when not hit for 2s |
| E9 | SWARM DRONE | Tiny red square | 10 | 120px/s | 6 | 0 | Spawns in groups of 8–12 |
| E10 | SENTINEL | Blue octagon | 60 | 30px/s | 18 | 8 | Telegraphed burst attack with 0.5s windup |

### 7.3 Co-op Targeting
Enemies target the **nearest living player**. Players can split aggro. Downed players do not draw fire.

### 7.4 Spawn Rules
- Wave 1: E1 only
- Wave 2: + E2
- Wave 3: + E3, E4
- Wave 4: + E5, E6
- Wave 5: + E7, E8 (first boss wave)
- Wave 6+: + E9, E10; all types active
- Spawn count per wave: `10 × (1 + 0.3 × waveNumber)`

---

## 8. Wave System

### 8.1 Wave Structure
```
[Wave Start] → [Enemy Spawning] → [Boss Trigger at 85% kills] → [Boss Phase] → [Wave Clear] → [Upgrade Screen] → [Next Wave]
```

### 8.2 Wave Difficulty & Time Budget
```
waveDifficulty(n) = 1.35 ^ (n − 1)

Wave 1:   1.00×   (learning wave)
Wave 3:   1.82×   (ramps up fast)
Wave 5:   3.32×   (first real pressure)
Wave 7:   6.05×   (designed kill zone — most runs end here)
Wave 9:  11.03×   (exceptional players only)
Wave 10: 14.89×   (near-impossible without a perfect build)
```
**Time budget:** ~60s combat + ~15s upgrade screen = ~75s/wave. A typical run dying at Wave 7–8 = **~10 minutes**.

### 8.3 Boss Spawn Trigger
- Boss spawns when 85% of regular enemies in the wave are dead
- Remaining regular enemies stay active alongside the boss
- Wave does not end until boss HP = 0

### 8.4 Between Waves
- 2-second "WAVE CLEAR" pause + co-op kill contribution breakdown
- Upgrade screen: each player picks independently (30s timer, auto-selects on expiry)
- Next wave begins after all players confirm

---

## 9. Difficulty — Player Count Scaling

### 9.1 Player Count Multiplier
```
playerMult(p) = 1 + 0.25 × (p − 1)

1 player:  1.00×
2 players: 1.25×
3 players: 1.50×
4 players: 1.75×
```

### 9.2 Combined Difficulty Formula
```
totalDifficulty(wave, players) = waveDifficulty(wave) × playerMult(players)

              1P      2P      3P      4P
Wave 1:      1.00    1.25    1.50    1.75
Wave 3:      1.82    2.28    2.73    3.19
Wave 5:      3.32    4.15    4.98    5.81
Wave 7:      6.05    7.57    9.08   10.59   ← designed kill zone
Wave 9:     11.03   13.79   16.55   19.31
Wave 10:    14.89   18.62   22.34   26.06   ← near-impossible
```

### 9.3 What Scales
- Enemy max HP, contact damage, movement speed (hard cap: base × 2.0), armor
- Boss HP, damage, armor, ability cooldowns

### 9.4 What Does NOT Scale
- Enemy count per wave · Boss physical size · Player base stats

### 9.5 Lobby Difficulty Preview
```
PLAYERS: 3 / 4
WAVE 1 DIFFICULTY:   1.50×
WAVE 7 DIFFICULTY:   9.08×
⚠ THIS IS GOING TO HURT
```

---

## 10. Boss System

### 10.1 Overview
Every wave has exactly one boss. Bosses are dramatically harder than regular enemies through both stat multipliers and unique per-boss mechanics that require active positioning.

### 10.2 Boss Visual Rules
- Size: 3×–4× a regular enemy
- Pulsing neon glow animation (oscillating `shadowBlur`)
- Dedicated health bar below HUD (85% screen width, red-to-orange gradient)
- Full-screen name banner on spawn (1.5s)
- Visual changes at 30% HP: darker tint, faster glow pulse

### 10.3 Boss Stat Formula
```
Boss HP              = BaseBossHP × totalDifficulty × 3.5
Boss Damage          = BaseEnemyDamage × totalDifficulty × 4.0
Boss Speed           = BaseEnemySpeed × 0.75
Boss Armor           = totalDifficulty × 5
Boss AbilityCooldown = BaseCooldown × (0.85 ^ (wave − firstAppearance))
```

**Stat comparison at Wave 5, Solo (totalDifficulty = 3.32):**

| Stat | Regular Tank (E3) | Boss |
|---|---|---|
| HP | 150 × 3.32 = **498** | BaseBossHP × 3.32 × 3.5 ≈ **1,162+** |
| Damage | 15 × 3.32 = **50** | 15 × 3.32 × 4.0 = **199** |
| Armor | 5 × 3.32 = **17** | 3.32 × 5 = **17 + type bonus** |

### 10.4 Boss Catalog

| # | Name | Visual | Base HP | Unique Mechanic |
|---|---|---|---|---|
| B1 | ALPHA DRONE | Large magenta square, rotating outer ring | 200 | Every 8s: summons 4 Crawlers. Below 50% HP: +30% speed. |
| B2 | BLITZ KING | Elongated orange rect, trailing afterimage | 180 | Every 5s: charges across arena at 600px/s. Contact damage ×3 during charge. |
| B3 | IRON COLOSSUS | Huge dark green square, steel overlay | 320 | Every 15s: 3s full damage immunity. Armor doubled permanently. |
| B4 | SPLIT PRIME | Large cyan diamond | 240 | At 50% HP: splits into 2 copies (each 40% HP). Both must die. |
| B5 | VOLT TYRANT | Large purple hexagon, arc effects | 220 | Every 3s: fires 8-directional projectile spread at full boss damage. |
| B6 | PHASE WRAITH | Large white pulsing circle | 200 | Every 8s: 2s full invulnerability + teleports to random position. |
| B7 | DOOM CARRIER | Giant yellow square, blinking red border | 260 | Spawns 1 Bomber every 6s. Below 30% HP: spawn rate doubles. |
| B8 | REGEN LEVIATHAN | Huge teal rectangle, ripple FX | 350 | Regens 2% max HP/sec always; increases to 5%/sec below 30% HP. Must be burst down. |
| B9 | SWARM QUEEN | Large red square, orbiting micro-squares | 230 | Spawns 2 Swarm Drones every 4s. 100px aura deflects projectiles. |
| B10 | APEX SENTINEL | Large blue octagon, armored look | 280 | Every 10s: 5s berserker — speed ×2.5, damage ×2. Immune to slow/freeze during berserker. |

---

## 11. Upgrade System

### 11.1 Structure
After each wave, each player independently receives 3 upgrade cards. One is selected; the rest are discarded. Players choose simultaneously.

### 11.2 Stat Boosts (always available)
- +20% Max HP + heal 20 HP · +15% Movement Speed · +25% Damage · +20% Attack Rate
- +10 Armor (flat) · +10% Crit Chance · +30% Range (gun only) · +20% XP Multiplier

### 11.3 Weapon Swap (always available)
Replace current weapon with any of the 20 weapons. Gun ↔ melee swaps allowed.

### 11.4 Passive Effects (unlocked from Wave 3)
- **Lifesteal:** +3 HP per kill
- **Explosive Rounds:** Projectiles explode on impact, 40px AoE — gun only
- **Iron Skin:** −10 flat on all incoming damage
- **Berserker:** Below 30% HP → +40% attack rate
- **Magnet:** Auto-collect XP orbs within 200px
- **Death Nova:** At 1 HP, explode for 80 AoE — once per run
- **Revive Boost (co-op only):** Revival time 3s → 1.5s; revived player restored to 60% HP

### 11.5 Upgrade Card UI
- 3 cards horizontal, scrollable on small screens
- Each card: name, description, icon, category tag
- Tap → pulse → confirm button appears · 30s auto-select countdown
- Co-op: indicator shows how many teammates have confirmed

---

## 12. Multiplayer — Co-op Rules

### 12.1 Shared Arena
- All players exist in the same arena, moving independently
- Each player has their own HP, weapon, upgrades, and auto-attack
- Enemies take damage from any player; damage is additive

### 12.2 Downed & Revival System

**Going down:** HP = 0 → DOWNED. Grey sprite + pulsing ring. 20-second bleed-out timer. Cannot move or attack.

**Revival:** Living player stands within 60px for 3 continuous seconds. Radial progress ring fills. Revived to 40% HP. Cancelled if reviver moves away or takes damage.

**Full party wipe:** All players downed simultaneously → run ends immediately.

### 12.3 Disconnect Handling
- Non-host disconnects: character removed, difficulty multiplier recalculates
- Host disconnects: server attempts host migration; if it fails, session ends

---

## 13. Auto-Attack & Combat Logic

### 13.1 Target Selection
1. Find all living enemies within `player.range`
2. Sort by distance ascending
3. Attack the closest enemy

### 13.2 Gun Attack Flow
1. Cooldown check: `timeSinceLastAttack >= 1 / attackRate`
2. Spawn projectile aimed at target → travels to enemy → apply damage + special effects
3. Reset cooldown

### 13.3 Melee Attack Flow
1. Same cooldown check
2. Instant circle overlap — all enemies within radius take damage + special effects
3. Visual: brief flash ring at player position

### 13.4 Critical Hits
Roll `Math.random() < critChance`. If true: damage ×2. Shown in red.

### 13.5 Collision Rules

| Collision Pair | Outcome |
|---|---|
| Player ↔ Enemy | Player takes contact damage; 0.5s invincibility frames |
| Player ↔ Downed teammate (within 60px) | Revival begins (3s hold) |
| Projectile ↔ Enemy | Enemy takes damage; projectile destroyed (unless pierce) |
| Projectile ↔ Arena boundary | Projectile destroyed |
| Projectile ↔ Swarm Queen aura (100px) | Deflected at random angle |
| Bomber ↔ Any player (within 20px) | Explodes: 40 AoE to all players within 80px |
| Player ↔ Player | No collision; overlap freely |

---

## 14. Game States & Flow

### 14.1 State Machine

| State | Description |
|---|---|
| `MENU` | Title screen — Solo Run / Co-op |
| `LOBBY` | Waiting room — room code, player list, difficulty preview |
| `PLAYING` | Active gameplay loop |
| `UPGRADE` | Between-wave selection screen |
| `GAME_OVER` | All dead — stats summary + restart |
| `DISCONNECTED` | Lost server connection — reconnect prompt |

### 14.2 Lobby Flow
```
MENU
 ├── SOLO RUN → Wave 1 immediately
 └── CO-OP
       ├── CREATE ROOM → server returns 6-char code → host waits in lobby
       └── JOIN ROOM → enter code → join lobby
             ↓
         LOBBY (1–4 players, live difficulty preview)
             ↓
         3-second countdown → Wave 1
```

### 14.3 Death & Game Over
- **Solo:** HP = 0 → immediate GAME_OVER
- **Co-op:** all players simultaneously downed → GAME_OVER
- Game Over screen shows: waves survived, enemies killed, total damage, run time, per-player breakdown (co-op)
- "PLAY AGAIN" restarts same room · "MAIN MENU" returns to menu

---

## 15. Audio (Placeholder — Out of Scope v1)

| Sound | Trigger |
|---|---|
| Shoot SFX | Projectile spawned |
| Hit SFX | Enemy takes damage |
| Player hurt SFX | Player takes damage |
| Kill SFX | Enemy killed |
| Boss music | Boss spawns |
| Wave clear jingle | Wave ends |
| Upgrade jingle | Upgrade screen opens |
| Revival SFX | Teammate revived |
| Downed SFX | Player goes down |
| Player join chime | New player joins lobby |

All sounds: chiptune / 8-bit style via Web Audio API.

---

## 16. Out of Scope (v1)

- Persistent progression / meta upgrades
- Character classes / starting loadout selection
- Audio implementation (specced above but not built)
- Sprite art (v1 uses canvas shapes; sprite sheets in v2)
- Online leaderboard
- Achievements / unlocks
- Story / narrative
- Voice chat
- Mobile app packaging (browser-only)

---

## 17. Success Metrics

| Metric | Target |
|---|---|
| Session length | ~10 minutes per run (target death at Wave 7–8) |
| Co-op session rate | ≥ 30% of all sessions |
| Retention trigger | Player attempts 2+ runs in first session |
| Wave 7 reach rate | ≥ 60% of runs (the designed endpoint) |
| Wave 10 reach rate | < 10% solo; < 5% 4-player |
| Revival engagement | ≥ 50% of downed players revived in co-op |
| Core loop clarity | New player understands controls within 30 seconds |

---

---

# PART 2 — TECHNICAL ARCHITECTURE

---

## 18. Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Game client | Single `index.html` (HTML + CSS + vanilla JS) | No framework, no build step |
| Rendering | HTML5 Canvas 2D API | `requestAnimationFrame` at ~60fps |
| Networking | Browser native `WebSocket` API | No library needed on client |
| Font | Press Start 2P via Google Fonts CDN | Loaded at runtime |
| Server | Node.js + `ws` library | Relay only — no game logic |
| Hosting (client) | GitHub Pages | Static file serving |
| Hosting (server) | Render Free Tier | WebSocket-capable Node.js |
| Keep-alive | UptimeRobot | Prevents Render sleep |

---

## 19. Multiplayer Architecture

### 19.1 Model: Host-Authoritative Relay

```
[Host Client]  ←── WSS ──→  [Render Server]  ←── WSS ──→  [Guest Clients ×3]

Host:    Runs full game simulation (enemy AI, wave logic, collision, boss state)
Server:  Relays messages between clients in the same room. No game logic.
Guests:  Send joystick input → receive game state from host → render locally
```

### 19.2 WebSocket Message Protocol

| Message | Direction | Payload |
|---|---|---|
| `CREATE_ROOM` | Client → Server | `playerId`, `playerName` |
| `ROOM_CREATED` | Server → Client | `roomCode` (6-char) |
| `JOIN_ROOM` | Client → Server | `roomCode`, `playerId`, `playerName` |
| `PLAYER_JOINED` | Server → All in room | `playerList` |
| `GAME_START` | Host → Server → All | `playerCount`, `seed` |
| `INPUT` | Client → Server → Host | `playerId`, `joystickVector`, `timestamp` |
| `GAME_STATE` | Host → Server → All | player positions/HP, enemy positions, wave state |
| `PLAYER_DOWN` | Host → All | `playerId`, `position` |
| `PLAYER_REVIVED` | Host → All | `playerId` |
| `WAVE_CLEAR` | Host → All | `waveNumber`, upgrade options per player |
| `UPGRADE_CHOSEN` | Client → Host | `playerId`, `upgradeId` |
| `GAME_OVER` | Host → All | run stats |

**State sync rate:** Host broadcasts `GAME_STATE` at 20 ticks/second (every 50ms). Clients interpolate positions at 60fps between ticks.

### 19.3 Per-Client Game Loop
```
Each frame (~60fps via requestAnimationFrame):
  1.  Calculate delta time (dt)
  2.  Read joystick → send INPUT to server
  3.  Interpolate all positions from latest GAME_STATE
  4.  [Host only] Run full simulation:
        a. Move enemies (AI targeting, pathfinding)
        b. Tick auto-attack cooldowns → fire if ready
        c. Move projectiles
        d. Resolve all collisions
        e. Check wave completion / boss spawn
        f. Broadcast GAME_STATE
  5.  Update projectiles (local visual prediction on guests)
  6.  Update UI particles (damage numbers, effects)
  7.  Clear canvas → draw background grid
  8.  Draw: enemies → projectiles → all players → HUD
  9.  Draw boss health bar (if boss alive)
  10. Draw downed player revival indicators
```

---

## 20. Repository Structure

One GitHub repository holds both the client and server.

```
neon-surge/
├── index.html        ← full game (HTML + CSS + JS, single file, < 150 KB)
├── server.js         ← Node.js WebSocket relay server
├── package.json      ← one dependency: "ws"
├── .gitignore
└── README.md
```

GitHub Pages serves `index.html` from the repo root. Render runs `server.js` from the same repo via auto-deploy.

---

## 21. Server Code Spec (`server.js`)

### 21.1 Dependencies
```json
{
  "dependencies": { "ws": "^8.0.0" },
  "engines": { "node": ">=18" },
  "scripts": { "start": "node server.js" }
}
```

### 21.2 Responsibilities
- Accept WebSocket connections
- `CREATE_ROOM`: generate unique 6-char room code, store room
- `JOIN_ROOM`: validate code, add player (max 4)
- All other messages: relay to correct room
- Disconnections: remove player, notify room
- `/health` HTTP endpoint: responds `200 OK` for UptimeRobot

### 21.3 In-Memory Room Structure
```javascript
const rooms = {
  "NX7K2P": {
    hostSocket: <WebSocket>,
    players: [
      { id: "p1", name: "Player1", socket: <WebSocket> },
      { id: "p2", name: "Player2", socket: <WebSocket> }
    ],
    lastActivity: <timestamp>,
    createdAt: <timestamp>
  }
}
```
Rooms are in-memory only. A server restart clears all rooms — players create a new room. Acceptable given 10-minute sessions.

### 21.4 HTTP + WebSocket on One Port
```javascript
const http = require('http');
const { WebSocketServer } = require('ws');

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200);
    res.end('OK');
  }
});

const wss = new WebSocketServer({ server });
server.listen(process.env.PORT || 3000);
```

### 21.5 Room Code Generation
```javascript
function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous 0/O, 1/I
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return rooms[code] ? generateRoomCode() : code; // retry if collision
}
```

### 21.6 Stale Room Cleanup
```javascript
setInterval(() => {
  const now = Date.now();
  for (const code in rooms) {
    if (now - rooms[code].lastActivity > 30 * 60 * 1000) {
      delete rooms[code]; // purge rooms idle > 30 min
    }
  }
}, 5 * 60 * 1000);
```

### 21.7 Client-Side Connection
```javascript
// Top of index.html JS section
const SERVER_URL = 'wss://neon-surge-server.onrender.com'; // update after Render deploy

const ws = new WebSocket(SERVER_URL);
ws.onopen    = () => { /* send CREATE_ROOM or JOIN_ROOM */ };
ws.onmessage = (event) => { /* dispatch incoming messages */ };
ws.onclose   = () => { /* show DISCONNECTED state */ };
ws.onerror   = () => { /* show error screen */ };
```

### 21.8 Environment Variables (set in Render dashboard)

| Variable | Value | Purpose |
|---|---|---|
| `PORT` | Auto-set by Render | Server listen port |
| `MAX_ROOMS` | `100` | Cap on simultaneous active rooms |
| `MAX_PLAYERS_PER_ROOM` | `4` | Enforced server-side |
| `ROOM_TTL_MINUTES` | `30` | Idle room expiry |

---

## 22. Performance Targets

| Metric | Target |
|---|---|
| Client frame rate | 60fps on mid-range Android (2021+) |
| Max active enemies | 60 simultaneous |
| Max active projectiles | 120 simultaneous (4 players) |
| Network latency tolerance | Playable up to 200ms RTT |
| State sync rate | 20 ticks/second host → clients |
| Game client size | < 150 KB (single HTML file) |
| Load time | < 2 seconds on 4G |
| Server max concurrent connections | ~500 (512 MB RAM limit) = ~125 active 4-player rooms |

Object pooling required for projectiles, enemies, and damage number particles to prevent GC spikes.

---

---

# PART 3 — INFRASTRUCTURE

---

## 23. Infrastructure Overview

```
[Player's Browser]
       │  HTTPS (page load)
       ▼
[GitHub Pages]              ← serves index.html · free · no sleep · global CDN
       │
       │  WSS (WebSocket, persistent during session)
       ▼
[Render Free Tier]          ← Node.js WebSocket relay · free · 512 MB RAM
       ▲
       │  HTTP GET /health every 5 min
       │
[UptimeRobot]               ← free monitor · prevents Render from sleeping
```

**Total monthly cost: $0. No credit card required for any service.**

---

## 24. Service Details

### 24.1 GitHub Pages — Client Hosting

| Property | Detail |
|---|---|
| Hosts | `index.html` (the full game client) |
| Cost | Free forever |
| HTTPS | Automatic |
| CDN | Global GitHub CDN |
| Repo requirement | Must be **public** |
| Limits | 1 GB repo, 100 GB/month bandwidth, 10 builds/hour |
| Sufficient for | ~666,000 page loads/month of a 150 KB file — not a concern |

### 24.2 Render Free Tier — WebSocket Server

| Property | Detail |
|---|---|
| Runs | `server.js` (Node.js WebSocket relay) |
| Cost | Free (750 hours/month = one always-on service) |
| RAM | 512 MB |
| CPU | Shared |
| Persistent disk | Not available on free tier — not needed (in-memory state) |
| Sleep behavior | Spins down after 15 min inactivity; wakes in ~60s on new WS connection |
| WebSocket support | Yes — explicitly supported on free tier |
| Auto-deploy | Yes — linked to GitHub repo, deploys on push |

**Sleep mitigation:** UptimeRobot pings `/health` every 5 minutes, resetting the inactivity timer. The server stays awake indefinitely.

### 24.3 UptimeRobot — Keep-Alive

| Property | Detail |
|---|---|
| Action | HTTP GET to `https://neon-surge-server.onrender.com/health` every 5 min |
| Cost | Free (50 monitors on free plan) |
| Side benefit | Email alerts if server goes down |
| Setup time | ~5 minutes |

---

## 25. Deployment Steps

### Step 1 — Create GitHub Repository
1. github.com → New repository → name: `neon-surge` → **Public**
2. Add `index.html`, `server.js`, `package.json`, `.gitignore`

### Step 2 — Enable GitHub Pages
1. Repo → Settings → Pages
2. Source: Deploy from branch → `main` → `/ (root)`
3. Save → game live at `https://yourusername.github.io/neon-surge`

### Step 3 — Deploy Server to Render
1. render.com → Sign up (free, no credit card)
2. New → Web Service → Connect GitHub → select `neon-surge`
3. Configure:
   - Name: `neon-surge-server`
   - Runtime: Node
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Plan: **Free**
4. Create → Render assigns: `https://neon-surge-server.onrender.com`

### Step 4 — Set Up UptimeRobot
1. uptimerobot.com → Sign up (free, no credit card)
2. Add New Monitor:
   - Type: HTTP(s)
   - URL: `https://neon-surge-server.onrender.com/health`
   - Interval: 5 minutes
3. Save → pings start immediately

### Step 5 — Wire Client to Server
1. In `index.html`, set:
   ```javascript
   const SERVER_URL = 'wss://neon-surge-server.onrender.com';
   ```
2. Commit and push → GitHub Pages auto-deploys in ~1 minute

### Step 6 — Smoke Test
1. Open `https://yourusername.github.io/neon-surge`
2. Co-op → Create Room → confirm 6-char code appears
3. Second device/tab → Join Room → enter code
4. Confirm both players visible in lobby
5. Check UptimeRobot dashboard — monitor should show "Up"

---

## 26. Ongoing Deploy Workflow

Once set up, all updates are a single command:

```bash
git add . && git commit -m "your message" && git push
```

| Service | What triggers | Time to live |
|---|---|---|
| GitHub Pages | Push to `main` | ~1 minute |
| Render | Push to `main` | ~2–3 minutes (brief WS disconnect during restart) |

---

## 27. Free Tier Limits & Headroom

| Service | Limit | Usage | Headroom |
|---|---|---|---|
| GitHub Pages bandwidth | 100 GB/month | ~0.015 GB per 100 users | Massive |
| Render RAM | 512 MB | ~50 KB/connection → ~500 connections max | ~125 simultaneous 4-player rooms |
| Render hours | 750/month | 744 hours (one always-on service) | Essentially exact fit |
| UptimeRobot monitors | 50 | Using 1 | 49 remaining |

---

## 28. Known Limitations & Upgrade Path

| Limitation | Effect | Fix when ready |
|---|---|---|
| Render single instance | No horizontal scaling; ~125 rooms max | Upgrade to Render $7/mo paid instance |
| 512 MB RAM ceiling | Hard limit on concurrent rooms | Upgrade to 1 GB RAM instance ($7/mo) |
| In-memory room state | Server restart = all active rooms lost | Add Render free Redis (25 MB) for room persistence |
| No database | No leaderboard or run history | Add Render free PostgreSQL (30-day free tier, then $7/mo) |
| Single region (US-East) | Higher latency for non-US players | Migrate to Fly.io for multi-region deployment (paid) |
| Public GitHub repo | Source code visible | Minify/obfuscate `index.html` if needed; acceptable for a game |

---

## 29. Cost Summary

| Service | Plan | Monthly Cost |
|---|---|---|
| GitHub Pages | Free | $0 |
| Render Web Service | Free | $0 |
| UptimeRobot | Free | $0 |
| Custom domain (optional) | Not required | $0 |
| **Total** | | **$0 / month** |
