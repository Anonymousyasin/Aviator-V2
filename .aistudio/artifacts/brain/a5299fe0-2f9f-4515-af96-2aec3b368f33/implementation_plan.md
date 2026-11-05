# Ace67 Bangladesh Casino Platform Clone (BDT)

A 1:1 Bangladesh online casino and original games platform inspired by Ace67, built with authentic dark gold styling, 8 fully playable interactive games (Aviator Crash, Mines, Plinko, Video Slots, Dice, Limbo, Hi-Lo), simulated bKash/Nagad/Rocket cashier with TrxID processing, VIP tiers, and real game artwork.

## User Review & Critical Decisions

> [!IMPORTANT]
> All primary requirements and design choices have been confirmed through our initial interview and are ready for implementation.

- **Confirmed Brand Identity**: Ace67 Bangladesh styling with dark charcoal canvas (`#0b0e14`), royal gold accents (`#f5c242` to `#eab308`), gold spade insignia, and bilingual English / বাংলা interface support.
- **Confirmed Game Scope**: 8 fully interactive, playable originals built from scratch (Aviator Crash with real-time canvas flight, Mines 5x5 grid with cashout escalator, Plinko physics drop, 3-Reel Classic Slot, 5-Reel Dragon Video Slot, Limbo rocket, Dice roll under/over, and Hi-Lo card game) combined with a rich curated catalog of top Bangladesh providers (JILI, PG Soft, Pragmatic Play, Spribe, JDB).
- **Confirmed Payment & Cashier**: Complete Bangladesh cashier supporting **bKash (বিকাশ)**, **Nagad (নগদ)**, and **Rocket (রকেট)** with simulated phone number input, instant merchant pay instructions, TrxID validation, withdrawal request queues, transaction ledger, and daily bonus claims.

---

## 1. Overview & Core Concept

Ace67 is Bangladesh's top-tier entertainment and casino platform format. This application clones that experience 1:1 in a zero-risk demo environment with persistent virtual BDT (৳) balances, realistic bet mechanics, provably fair odds, authentic game sound effects synthesized via the Web Audio API, and seamless desktop and mobile navigation.

### Target Audience & Persona
- Players in Bangladesh familiar with popular platforms like Ace67, Baji, and BetVisa looking for authentic Aviator, Mines, Slots, and crash games in Bangladeshi Taka (৳).
- Users who expect instant local mobile financial services (MFS: bKash, Nagad, Rocket) and fast intuitive betting controls (½, 2×, Max, Auto cashout).

### Key Value
- **Zero-barrier Instant Play**: Starts with ৳5,000 demo balance, daily reload bonuses of ৳100, and 100% welcome match bonus on first deposit.
- **Deep Gameplay Authenticity**: Real canvas flight curves, interactive Plinko physics, reel spinning animations, sound effects, and win celebrations without external dependencies or broken iframes.

---

## 2. User Experience & Visual Design

### Visual Identity & Theme
- **Aesthetic Direction**: High-roller dark gold casino aesthetic. Deep slate/black carbon surfaces, hairline amber borders, and polished gold metallic buttons.
- **Color Palette**:
  - Dominant Canvas: Deep Midnight Slate (`#0b0f17` and `#111827`)
  - Structural Panels: Obsidian Carbon Card Surfaces (`#161f2e` with hairline border `rgba(245, 194, 66, 0.15)`)
  - Primary Accent & CTAs: Rich Metallic Gold gradient (`#ffd75e` to `#d97706` with dark contrast text `#261800`)
  - Payment Brand Accents: bKash Pink (`#e2136e`), Nagad Flame Orange (`#f6921e`), Rocket Royal Purple (`#8c3494`)
  - Semantic Status: Emerald Win (`#22c55e`), Ruby Loss/Crash (`#ef4444`)
- **Typography & Font Strategy**:
  - Display & Headings: `Plus Jakarta Sans` / `Outfit` with bold athletic weights for multipliers and jackpot counts.
  - Numbers & Metrics: Tabular numerals (`tabular-nums font-mono`) for precision betting and multiplier timers.
  - English & Bengali dual labeling for key navigation (e.g. Deposit / ডিপোজিট, Games / গেমস).

### Desktop & Mobile Layout Architecture
- **Desktop (1440px baseline)**:
  - Sticky Top Bar: Ace67 logo with gold spade, live balance badge in ৳ BDT, Deposit button, Withdraw button, and User Profile menu.
  - Secondary Category Strip: All, Crash / Aviator, Slots, Mines, Plinko, Table Games, Fishing, Promotions.
  - Ticker Feed: Dynamic marquee of recent Bangladesh player wins (e.g., "Rahim***82 won ৳14,250 on Aviator").
  - Hero Spotlight: Ace67 100% Welcome Bonus banner with instant deposit CTA.
  - Grid Catalog: High-resolution game cards with provider badges (JILI, PG Soft, Spribe, Ace Originals), Hot/New markers, and one-click play.
- **Mobile First Adaptation**:
  - Fixed compact bottom navigation bar (Home, Games, Deposit, History, Profile) conforming to the <15% sticky viewport rule.
  - Optimized touch targets (minimum 44px) for bet adjustment controls and cashout buttons.

### Web Audio Sound Effects System
- Built-in sound engine using Web Audio API (no external audio files to break):
  - Bet placement click
  - Aviator flight engine hum & plane fly-away explosion
  - Gem reveal chime vs mine explosion thud
  - Plinko peg bounce pops & multiplier bell
  - Slot reel spin ticks and winning fanfare
  - Global mute/unmute toggle in header

---

## 3. Key Product Decisions & Trade-Offs

| Decision | Chosen Approach | Rationale & User Benefit |
| :--- | :--- | :--- |
| **8 Fully Interactive Originals** | Client-side reactive canvas and DOM state machines for all 8 games | Immediate playability with zero lag, smooth 60fps animations, provably realistic RTP (97%), and full bet sizing. |
| **Bangladesh MFS Cashier Simulation** | Multi-step interactive cashier for bKash, Nagad, and Rocket | Authentically replicates the real BD betting workflow (Send Money -> copy TrxID -> submit -> balance updated) without real money risk. |
| **High Quality Visual Assets** | Generated clean SVG & high-fidelity WebP imagery with fallback gradients | Zero broken external URLs, lightning-fast load times, and crystal-clear presentation on retina displays. |
| **Local Storage Persistence** | Centralized reactive wallet store synced to `localStorage` | Preserves user credits, active deposits, VIP tier points, and full transaction history across reloads. |

---

## 4. Technical Architecture & Data Strategy

### System Architecture & Component Flow

```
┌────────────────────────────────────────────────────────────────────────┐
│                          Ace67 App Root (App.tsx)                      │
├───────────────────────────────────┬────────────────────────────────────┤
│           Header & HUD            │          Marquee Ticker            │
│  [Logo] [Wallet ৳] [Dep] [Wd] [🔊] │   "Tanvir***41 won ৳8,400 on Mines"│
├───────────────────────────────────┴────────────────────────────────────┤
│                         Active View Switcher                           │
│  ┌───────────────────────────────┐  ┌────────────────────────────────┐ │
│  │      Casino Lobby View        │  │     Interactive Game Stage     │ │
│  │  - Category Filter Tabs       │  │  - Left: Bet Controls Sidebar  │ │
│  │  - Promotional Hero Banner    │  │  - Right: Game Canvas / Engine │ │
│  │  - Search & Provider Filter   │  │  - Real-time Multiplier / HUD  │ │
│  │  - Games Grid (Originals & BD)│  │  - Auto Cashout & History Bar │ │
│  └───────────────────────────────┘  └────────────────────────────────┘ │
├────────────────────────────────────────────────────────────────────────┤
│                     Cashier & Wallet Modal System                      │
│   [bKash / Nagad / Rocket] ──> [TrxID Verification] ──> [History Log]  │
├────────────────────────────────────────────────────────────────────────┤
│           Persistent LocalStorage State & Web Audio Sound Engine       │
└────────────────────────────────────────────────────────────────────────┘
```

### Game Engines Specification

1. **Aviator / Crash**:
   - Canvas-based exponential trajectory curve with animated ✈️ aircraft.
   - Live multiplier readout, auto cashout at designated X, recent round multiplier history pill strip (blue <2x, purple <10x, magenta >10x).
2. **Mines (Diamond & Bombs)**:
   - 5x5 dynamic tile grid with configurable 1, 3, 5, 10, or 20 mines.
   - Real-time calculated next-tile multiplier, sound effects, and safe Cash Out trigger.
3. **Plinko**:
   - Canvas peg-board drop simulation with realistic bounce paths and high-roller edge multipliers (15x down to 0.4x).
4. **Golden Fortune (3-Reel Classic)**:
   - Synchronized mechanical reels with classic fruit, bell, clover, 777 symbols, and dual-match multipliers.
5. **Dragon Gold (5-Reel Video Slot)**:
   - 5-reel cascading slot layout with oriental dragon, lantern, gold ingots, scatter free-spin triggers.
6. **Dice**:
   - Interactive Roll Under / Roll Over probability slider with live calculation of win chance and payout multiplier.
7. **Limbo**:
   - High-speed target multiplier rocket launch with quick round resolution.
8. **Hi-Lo Cards**:
   - Card deck dealing engine with dynamic probability-adjusted odds for guessing higher or lower.

### Cashier & Wallet Data Model
- **Balance Store**: Float precision tracking with quick-chip increments (৳200, ৳500, ৳1,000, ৳5,000).
- **Transaction Ledger**:
  - `id`: Unique TrxID (e.g. `9H8K2LMN4P`)
  - `type`: `Deposit` | `Withdraw` | `Bonus` | `Game Win` | `Game Bet`
  - `method`: `bKash` | `Nagad` | `Rocket` | `Promo`
  - `amount`: Numeric BDT
  - `status`: `Success` | `Pending`
  - `timestamp`: Formatted date string

---

## 5. Execution Plan & Next Steps

1. **Foundations**: Configure Tailwind tokens for dark gold Ace67 theme, typography, and Web Audio synthesizer helper.
2. **State & Cashier**: Implement robust `useWallet` hook with bKash, Nagad, and Rocket multi-step modals, transaction logs, and daily promotions.
3. **8 Interactive Game Engines**: Build modular game components with smooth animations and complete audio-visual feedback.
4. **Lobby & Provider Showcase**: Assemble the authentic Ace67 lobby with provider filters, category tabs, and real-time BD winners marquee.
5. **Verification**: Verify clean TypeScript compilation, responsive mobile layout, and seamless navigation.
