# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A 2D top-down pixel art shooter game ("Drone Hunt" / 像素第三人称射击) built with vanilla JavaScript, HTML5 Canvas, and Web Audio API. Zero external dependencies.

## Running the Game

No build step. Serve statically:
```bash
python -m http.server 8000
# or: npx http-server
```
Then open `http://localhost:8000`. No tests, linting, or build tools are configured.

## File Structure

- **index.html** — Entry point with canvas element, HUD overlays, legend
- **game.js** (~1950 lines) — Entire game engine and logic
- **style.css** — UI styling with CSS custom properties

## Architecture (game.js)

The game uses a **functional, global-state architecture** with array-based entity management (not OOP/ECS). Key systems are organized as sections with ASCII-art comment separators.

### Core Systems

| System | Description |
|--------|-------------|
| **Game Loop** (bottom of file) | `requestAnimationFrame`-based with delta-time clamping. Update-then-render. |
| **Player** | Global object with position, velocity, HP, dodge state, animation. WASD + mouse aiming + shift dodge. |
| **Weapons** | Data-driven configs (`WEAPONS` array). 5 types: Pistol, Shotgun, SMG, Sniper, Rocket Launcher. Switched via 1-5 keys or mouse wheel. |
| **Enemy AI** | Three tiers: regular (patrol/chase), boss (every 3rd level, multi-shot), super boss (levels 5 & 10, phase-based with special attacks at 50% HP). |
| **Level/Map System** | `MAP_CONFIGS` defines 10 themed maps with unique colors, decorations, and wall parameters. Procedural wall/medkit placement. |
| **Level Transitions** | State machine: `null → celebrating → fadeOut → loading → fadeIn`. Victory on level 10 completion. |
| **Collision** | Circle-rect for walls (`circleRectCollision`), circle-circle for entities. No spatial partitioning. |
| **Audio** | Procedural music via Web Audio API with MIDI-based melody/bass sequences and dynamic tone scheduling. |
| **Visual Effects** | Screen shake, screen flash, particle system, death effect rings, dodge trail afterimages. |
| **HUD/Minimap** | Auto-hides after 3s inactivity. Minimap shows viewport frame, enemies, medkits, walls. |

### Key Constants

- World size: 2600×2600 pixels
- `TOTAL_LEVELS`: 10
- 10 regular enemies + boss per level; 2 medkits per level (heal 15 HP)
- Super bosses: Level 5 "守卫者" (Guardian), Level 10 "毁灭者" (Destroyer)

### Rendering

All graphics are procedural — no sprite assets. Uses `fillRect` for pixel art and a custom `drawPixelCircle`. Camera transforms world-to-screen coordinates. Tile decorations are generated via hash function and culled to visible area.

## Conventions

- **Constants**: `SCREAMING_SNAKE_CASE` (e.g., `WEAPONS`, `MAP_CONFIGS`)
- **Variables/functions**: `camelCase` with descriptive names (e.g., `updatePlayer`, `drawEnemy`, `spawnBurst`)
- **UI text**: Chinese; **code**: English
- **Utilities**: `rand(min, max)`, `clamp(v, min, max)` defined near top of game.js
