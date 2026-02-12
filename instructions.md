# Valentine Kaplay Game — Instructions (Agents Read This First)

## TL;DR
Build a small top-down RPG-style Valentine scene in **Kaplay.js**:

- Roses everywhere (tileable rose texture)
- A visible path leading to a clearing
- Player moves smoothly with sprite-sheet animations
- Two red rose choices: **"Yes"** and **"You already said yes"**
- Choosing either triggers a **petal celebration** + final message

This doc is the single source of truth for scope, structure, and milestones.

---

## Tech Stack
- **Kaplay.js**
- Asset pipeline: static PNGs (spritesheets + tiles), BUT see **Placeholder Mode**
- No backend

---

## Design Constraints (Don’t Overbuild)
- **Bounded world** with invisible borders (no procedural / infinite world)
- **Responsive viewport**: world bounds derived from viewport size (phone vs desktop)
- **Roses are a repeating tile texture**, not thousands of flower objects
- Keep code modular but minimal; avoid refactors unrelated to assigned milestone

---

## Placeholder Mode (IMPORTANT: assets may not exist yet)
Assume the final assets might be missing. Milestones must be implementable using placeholders.

### Placeholder Mode A (Preferred early)
Use primitives (rect/circle/text) to represent:
- Rose background (solid / repeated simple pattern)
- Path strip (colored rectangle)
- Clearing (circle overlay)
- Player (rectangle) + direction indicator
- Roses (red circles)

### Placeholder Mode B (Optional later)
If placeholder PNGs exist, use them. If not, fall back to Mode A.

**Rule:** Do NOT block milestone completion waiting for art.

---

## Working Rules (Very Important)
1) Work only on your assigned milestone unless explicitly asked otherwise.  
2) Do NOT rename files, folders, or functions outside your milestone.  
3) Do NOT introduce new libraries.  
4) If you add a new asset, put it in `assets/` and list it in the **Asset Manifest** below.  
5) After finishing a milestone, update:
   - `## Milestone Status` (mark ✅ done)
   - `## Notes / Decisions` (brief)
6) Keep changes small and reviewable. Avoid “drive-by refactors.”

### Parallel / Branch Policy
- Do NOT work on the same branch as other agents.
- Create your own branch: `milestone/<number>-<short-name>`
- If you touch a shared file (e.g., `src/scenes/game.js`), keep edits minimal and localized.

---

## Repository Structure (Target)

~~~text
src/
  main.js
  scenes/
    boot.js
    game.js
  systems/
    playerController.js
    choiceController.js
    effects.js
    ui.js
assets/
  tiles/
  props/
  characters/
  vfx/
  ui/
  audio/   (optional)
~~~

---

## Asset Manifest (Single Source of Truth)

### Tiles / Environment
- [ ] `assets/tiles/rose_field_tile.png` (seamless tile)
- [ ] `assets/tiles/path_tile.png` (seamless path texture)
- [ ] `assets/tiles/clearing_overlay.png` (optional)

### Props
- [ ] `assets/props/red_rose_yes.png`
- [ ] `assets/props/red_rose_yes_already.png`
- [ ] `assets/props/red_rose_picked.png` (optional)

### Characters
- [ ] `assets/characters/player_sheet.png`
  - Top-down RPG sheet: **3 columns × 4 rows**
  - Consistent frame size (e.g., 16×24 or 32×48; pick one and keep it consistent)
- [ ] `assets/characters/npc_idle.png` (or a sheet)

### VFX
- [ ] `assets/vfx/petal_1.png`
- [ ] `assets/vfx/petal_2.png` (optional)

### UI / Audio (Optional)
- [ ] `assets/ui/prompt.png` (optional)
- [ ] `assets/audio/confirm.wav` (optional)
- [ ] `assets/audio/ambience.mp3` (optional)

---

## Game Loop / Mechanics (Reference)
- Player spawns at start of path
- Player walks to clearing
- Two roses in clearing act as “choices”
- Interaction prompt when close
- Selecting either rose triggers:
  - Petal burst
  - Success UI message
  - Disable further input (or lock to idle)

---

## Global Acceptance Criteria (Final Build)
- Runs on desktop and phone viewport sizes
- Player movement is smooth and animations switch correctly
- Roses tile covers background with no visible seams (once real tile exists)
- Path is visible and leads to clearing
- Two interactable red roses trigger success
- Petal VFX plays on choice
- No console errors

---

## Smoke Test Steps (Use for every milestone)
1) Launch the game
2) Confirm no errors in console
3) Confirm player moves (and animates if applicable)
4) Confirm world bounds work (cannot escape)
5) Basic resize test (phone-ish and desktop widths)

---

# Milestones

## Milestone Status
- M0: ✅ Done
- M1: ✅ Done
- M2: ✅ Done
- M3: ✅ Done
- M4: ✅ Done
- M5: ✅ Done
- M6: ✅ Done

---

## M0 — Project Scaffold + Boot Scene
**Owner:** Agent M0  
**Scope:**
- Create target folder structure
- Implement boot/loading scene and game scene switch
- Add placeholder asset loading hooks (but do not require assets)

**Acceptance Criteria:**
- App runs and transitions from Boot → Game without errors
- Scene wiring exists even if visuals are placeholders

---

## M1 — World Bounds + Rose Background Tiling
**Owner:** Agent M1  
**Scope:**
- Compute world bounds from viewport size (phone smaller, desktop larger)
- Add invisible borders (colliders/walls)
- Render rose background:
  - If tile asset exists: repeat it
  - Else: fallback to placeholder fill pattern

**Acceptance Criteria:**
- World bounds exist and player will be constrained once player exists
- Background fill covers the world area (tile or placeholder)

---

## M2 — Player Controller + Animation
**Owner:** Agent M2  
**Scope:**
- Implement smooth movement
- Track facing direction (up/down/left/right)
- If sprite sheet exists: play walk vs idle animations
- Else: placeholder player shape + direction indicator

**Acceptance Criteria:**
- Movement feels stable (no jitter)
- Facing direction updates correctly
- Animation state machine exists (even if placeholder)

---

## M3 — Path + Clearing
**Owner:** Agent M3  
**Scope:**
- Add a visible path strip from spawn toward clearing
  - Use path tile if available, else colored strip
- Add a clearing region (circle-ish)
  - Reduce rose visibility or overlay a grass clearing

**Acceptance Criteria:**
- Path is clearly readable against background
- Clearing is visually obvious as a destination

---

## M4 — NPC + Choice Roses + Interaction Prompt
**Owner:** Agent M4  
**Scope:**
- Place NPC in clearing (placeholder allowed)
- Place two red roses: “Yes” and “You already said yes”
- Proximity prompt + interaction action
- Trigger success hook (even if VFX not done yet)
- Disable repeat interactions after success

**Acceptance Criteria:**
- Prompt appears when close
- Interact triggers success state exactly once

---

## M5 — Petal Effects (Ambient + Burst)
**Owner:** Agent M5  
**Scope:**
- Ambient falling petals near clearing (subtle)
- Burst petals on choice
- Use petal sprites if available, else fallback to simple particles (dots)

**Acceptance Criteria:**
- Ambient + burst effects visibly work
- No major performance issues
- Effects do not continue uncontrollably after success unless intended

---

## M6 — UI Polish + Responsive Pass
**Owner:** Agent M6  
**Scope:**
- Place “Will you be my valentine?” text near clearing / centerpiece
- Add final message after choice
- Ensure UI is readable on phone and desktop
- Optional: sound cue on choice

**Acceptance Criteria:**
- Text readable across viewport sizes
- Clean end state after choice
- No overlaps / off-screen UI on phone

---

## Notes / Decisions (Keep Brief)
- **M0:** Folder structure created (`src/scenes/`, `src/systems/`, `assets/` with tiles, props, characters, vfx, ui). Boot scene shows "Loading..." text, optionally tries to load manifest assets (never blocks), then transitions to Game. Game scene is placeholder (rect + "Game" text). Main.js registers both scenes and starts with `go("boot")`. Placeholder Mode A only; no dependency on PNGs.
- **M1:** World bounds from scene `width()`/`height()` (viewport). Placeholder background: base rect + grid of small circles. Invisible borders: four static body + area walls at edges (opacity 0). Player not modified; M2 will use borders for constraint.
- **M2:** `src/systems/playerController.js` added: keyboard (arrows + WASD), normalized velocity via body.vel, facing (up/down/left/right), isMoving state. Placeholder: rect player + direction triangle (brighter when moving). Game scene spawns single player entity with body (gravityScale: 0), area, and controller; collides with M1 walls. Animation state machine in place for future sprite sheet (walk/idle); no assets used.
- **M3:** Placeholder Mode A only. Path = full-width horizontal strip (tan/sand rect, 72px tall) from left to right; clearing = single circle at path end (right side, radius 85px, lighter green). Player spawns at path start (left). No path/clearing assets; no interaction or NPC (M4).
- **M4:** NPC = purple rect in clearing. Two choice objects = red circles with white text ("Yes", "You already said yes") in clearing. Interaction in `src/systems/choiceController.js`: proximity radius 80px, "Press E" prompt above player when close; on E triggers success callback once then locks. Success fires `choiceSuccessBus.trigger("choiceSuccess")` for future M5/M6. Placeholder Mode A only; no rose PNGs.
- **M5:** Effects in `src/systems/effects.js`. Ambient petals: up to 18 small pink/red circles drift down over clearing with sinusoidal sway, recycled when past clearing bottom. Burst petals: 40 particles explode radially from clearing center on `choiceSuccess` event, fade over 2s, self-cleanup (update loop cancels when all gone). `setupPetalEffects()` called from `game.js`, subscribes to existing `choiceSuccessBus`. Placeholder Mode A only; no petal PNGs.
- **M6:** UI in `src/systems/ui.js`. "Will you be my valentine?" text centered horizontally above clearing with semi-transparent dark backdrop for readability. "Yay 💖" success message fades in (0.6s) at screen center on `choiceSuccess` event, also with dark backdrop. Font sizes responsive: question 18–32px, success 28–56px, scaled by viewport width. Question Y position clamped so text stays on-screen on small viewports. `setupUI()` wired from `game.js` via existing `choiceSuccessBus`. Placeholder Mode A only; no audio.
