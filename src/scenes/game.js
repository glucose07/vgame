/**
 * Game scene (placeholder). Scene wiring for M0.
 * M1: World bounds from viewport, placeholder background fill. Bounds enforced by clamp (no physics walls).
 * M2: Player — minimal: rect + arrow/WASD movement only (animations/sprites later).
 * M3: Path strip (placeholder colored rect) from spawn toward clearing; clearing = circle overlay at path end.
 * M4: NPC + choice roses (placeholder red circles + labels), proximity prompt, one-time success.
 */

import { setupChoiceInteraction } from "../systems/choiceController.js";
import { setupPetalEffects } from "../systems/effects.js";
import { setupUI } from "../systems/ui.js";

/**
 * Get world width and height from viewport (responsive: phone smaller, desktop larger).
 * @param {object} k - Kaplay context (k)
 * @returns {{ width: number, height: number }}
 */
function getWorldBounds(k) {
    const w = typeof k.width === "function" ? k.width() : (k.width ?? 800);
    const h = typeof k.height === "function" ? k.height() : (k.height ?? 600);
    return { width: w, height: h };
}

export default function gameScene(k) {
    const { width: w, height: h } = getWorldBounds(k);
    const surroundingGrassColor = [62, 137, 72]; // #3e8948 for non-path/non-clearing ground
    const isTouchDevice = ("ontouchstart" in globalThis) || (navigator.maxTouchPoints > 0);
    const worldArea = w * h;
    const lowPerfMode = isTouchDevice || worldArea > 1000000;
    const textureDensityScale = lowPerfMode ? 0.72 : 0.9;
    const flowerBudget = Math.max(280, Math.round(worldArea / (lowPerfMode ? 2400 : 2100)));
    const secondFlowerChance = lowPerfMode ? 0.26 : 0.42;
    const maxAnimatedFlowers = lowPerfMode ? 26 : 44;

    // ---- M1: Background — rose tile if loaded, else placeholder ----
    k.add([
        k.rect(w, h),
        k.pos(0, 0),
        k.anchor("topleft"),
        k.color(...surroundingGrassColor),
    ]);

    // ---- Ambient butterflies are added later after path/clearing geometry is defined ----

    // ---- M3: Clearing geometry (defined first so path can end at circle) ----
    const clearingPaddingFraction = 0.1;
    const clearingRadius = 225;
    const clearingCenterX = w * (1 - clearingPaddingFraction) - clearingRadius;
    const clearingCenterY = h / 2;

    // ---- M3: Path strip from spawn to clearing (extends a bit into circle to merge) ----
    const pathStripHeight = 72;
    const pathStripY = h / 2 - pathStripHeight / 2;
    const pathIntoClearing = clearingRadius * 0.3;
    const pathStripLength = clearingCenterX - clearingRadius + pathIntoClearing;
    const pathTileSize = 16;
    const hasPathTile = !!k.getSprite("path_middle_tile");
    const hasCobbleRoadTiles = !!k.getSprite("cobble_road_tiles");
    const pathCols = Math.ceil(pathStripLength / pathTileSize);
    const pathRows = Math.ceil(pathStripHeight / pathTileSize);
    const renderedPathLength = hasPathTile ? pathCols * pathTileSize : pathStripLength;
    const renderedPathHeight = hasPathTile ? pathRows * pathTileSize : pathStripHeight;
    const cobbleOverlayChance = 0.24;
    const cobbleFrames = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
    if (hasPathTile) {
        for (let col = 0; col < pathCols; col++) {
            for (let row = 0; row < pathRows; row++) {
                const tileX = col * pathTileSize;
                const tileY = pathStripY + row * pathTileSize;
                k.add([
                    k.sprite("path_middle_tile"),
                    k.pos(tileX, tileY),
                    k.anchor("topleft"),
                ]);
                if (hasCobbleRoadTiles && Math.random() < cobbleOverlayChance) {
                    const frame = cobbleFrames[Math.floor(Math.random() * cobbleFrames.length)];
                    k.add([
                        k.sprite("cobble_road_tiles", { frame }),
                        k.pos(tileX, tileY),
                        k.anchor("topleft"),
                    ]);
                }
            }
        }
    } else {
        k.add([
            k.rect(renderedPathLength, renderedPathHeight),
            k.pos(0, pathStripY),
            k.anchor("topleft"),
            k.color(110, 155, 85),
        ]);
    }
    // Layered top/bottom bands create a soft shadow exactly on path edges.
    const pathShadowColor = [72, 48, 30];
    const pathTopY = pathStripY;
    const pathBottomY = pathStripY + renderedPathHeight;
    k.add([
        k.rect(renderedPathLength, 4),
        k.pos(0, pathTopY - 4),
        k.anchor("topleft"),
        k.color(...pathShadowColor),
        k.opacity(0.1),
    ]);
    k.add([
        k.rect(renderedPathLength, 2),
        k.pos(0, pathTopY),
        k.anchor("topleft"),
        k.color(...pathShadowColor),
        k.opacity(0.2),
    ]);
    k.add([
        k.rect(renderedPathLength, 2),
        k.pos(0, pathTopY + 2),
        k.anchor("topleft"),
        k.color(...pathShadowColor),
        k.opacity(0.09),
    ]);
    k.add([
        k.rect(renderedPathLength, 4),
        k.pos(0, pathBottomY),
        k.anchor("topleft"),
        k.color(...pathShadowColor),
        k.opacity(0.1),
    ]);
    k.add([
        k.rect(renderedPathLength, 2),
        k.pos(0, pathBottomY - 2),
        k.anchor("topleft"),
        k.color(...pathShadowColor),
        k.opacity(0.2),
    ]);
    k.add([
        k.rect(renderedPathLength, 2),
        k.pos(0, pathBottomY - 4),
        k.anchor("topleft"),
        k.color(...pathShadowColor),
        k.opacity(0.09),
    ]);
    // Mottled texture pass for path (same style as clearing, with earthy tones).
    const pathTextureCount = Math.min(
        lowPerfMode ? 26 : 34,
        Math.max(14, Math.round(((renderedPathLength * renderedPathHeight) / 1900) * textureDensityScale)),
    );
    for (let i = 0; i < pathTextureCount; i++) {
        const x = Math.random() * renderedPathLength;
        const y = pathStripY + Math.random() * renderedPathHeight;
        const darkPatch = Math.random() < 0.56;
        k.add([
            k.circle(3 + Math.random() * 7),
            k.pos(x, y),
            ...(darkPatch ? [k.color(98, 76, 50)] : [k.color(138, 114, 83)]),
            k.opacity(darkPatch ? (0.045 + Math.random() * 0.055) : (0.03 + Math.random() * 0.045)),
            k.z(2),
        ]);
    }
    const pathSpeckleCount = Math.min(
        lowPerfMode ? 36 : 52,
        Math.max(20, Math.round(((renderedPathLength * renderedPathHeight) / 1100) * textureDensityScale)),
    );
    for (let i = 0; i < pathSpeckleCount; i++) {
        const x = Math.random() * renderedPathLength;
        const y = pathStripY + Math.random() * renderedPathHeight;
        k.add([
            k.circle(0.6 + Math.random() * 1.1),
            k.pos(x, y),
            k.color(84, 62, 41),
            k.opacity(0.05 + Math.random() * 0.07),
            k.z(2),
        ]);
    }

    // ---- Ambient butterflies around path + clearing (soft bounds + natural return) ----
    const hasButterflySprite = !!k.getSprite("butterfly_sheet");
    if (hasButterflySprite) {
        const butterflyAnims = ["fly-blue", "fly-pink", "fly-red"];
        const butterflyCount = 3;
        const butterflies = [];
        const pathZoneTop = pathStripY;
        const pathZoneBottom = pathStripY + renderedPathHeight;
        const softMargin = 24;

        const isInStrictZone = (x, y) => {
            const inPath = x >= 0 && x <= renderedPathLength && y >= pathZoneTop && y <= pathZoneBottom;
            const dx = x - clearingCenterX;
            const dy = y - clearingCenterY;
            const inClearing = (dx * dx + dy * dy) <= (clearingRadius * clearingRadius);
            return inPath || inClearing;
        };
        const isInSoftZone = (x, y) => {
            const inPath = x >= -softMargin
                && x <= renderedPathLength + softMargin
                && y >= pathZoneTop - softMargin
                && y <= pathZoneBottom + softMargin;
            const dx = x - clearingCenterX;
            const dy = y - clearingCenterY;
            const r = clearingRadius + softMargin;
            const inClearing = (dx * dx + dy * dy) <= (r * r);
            return inPath || inClearing;
        };

        const nearestStrictZonePoint = (x, y) => {
            const pathX = k.clamp(x, 0, renderedPathLength);
            const pathY = k.clamp(y, pathZoneTop, pathZoneBottom);
            const pathDx = pathX - x;
            const pathDy = pathY - y;
            const pathD2 = pathDx * pathDx + pathDy * pathDy;

            const clearDx = x - clearingCenterX;
            const clearDy = y - clearingCenterY;
            const clearDist = Math.hypot(clearDx, clearDy) || 1;
            const clearX = clearDist <= clearingRadius
                ? x
                : clearingCenterX + (clearDx / clearDist) * clearingRadius;
            const clearY = clearDist <= clearingRadius
                ? y
                : clearingCenterY + (clearDy / clearDist) * clearingRadius;
            const cdx = clearX - x;
            const cdy = clearY - y;
            const clearD2 = cdx * cdx + cdy * cdy;

            return pathD2 <= clearD2 ? { x: pathX, y: pathY } : { x: clearX, y: clearY };
        };

        const randomSpawnInZone = () => {
            for (let i = 0; i < 120; i++) {
                const x = 20 + Math.random() * Math.max(20, w - 40);
                const y = 20 + Math.random() * Math.max(20, h - 40);
                if (isInStrictZone(x, y)) return { x, y };
            }
            if (Math.random() < 0.55) {
                return {
                    x: Math.random() * renderedPathLength,
                    y: pathZoneTop + Math.random() * Math.max(4, renderedPathHeight),
                };
            }
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.sqrt(Math.random()) * clearingRadius * 0.95;
            return {
                x: clearingCenterX + Math.cos(angle) * dist,
                y: clearingCenterY + Math.sin(angle) * dist,
            };
        };

        for (let i = 0; i < butterflyCount; i++) {
            const anim = butterflyAnims[Math.floor(Math.random() * butterflyAnims.length)];
            const startSpeed = 34 + Math.random() * 44;
            const startAngle = Math.random() * Math.PI * 2;
            const spawn = randomSpawnInZone();
            const vx = Math.cos(startAngle) * startSpeed;
            const vy = Math.sin(startAngle) * startSpeed;

            const butterfly = k.add([
                k.sprite("butterfly_sheet", { frame: 0 }),
                k.pos(spawn.x, spawn.y),
                k.anchor("center"),
                k.scale(2.6),
                k.opacity(0.9),
                k.z(80),
                "butterfly",
            ]);
            butterfly.play(anim);
            butterfly.flipX = vx < 0;

            butterflies.push({
                obj: butterfly,
                vx,
                vy,
                turnTimer: 0.25 + Math.random() * 0.9,
                speedMin: 28,
                speedMax: 92,
                curveDir: Math.random() < 0.5 ? -1 : 1,
            });
        }

        k.onUpdate(() => {
            const dt = k.dt();
            const butterflyHalfSize = (8 * 2.6) / 2;
            const edgePad = butterflyHalfSize + 2;
            for (const b of butterflies) {
                b.turnTimer -= dt;
                if (b.turnTimer <= 0) {
                    // Periodically nudge heading and speed to keep paths organically random.
                    b.vx += (Math.random() * 2 - 1) * 56;
                    b.vy += (Math.random() * 2 - 1) * 56;
                    const speed = Math.hypot(b.vx, b.vy) || 1;
                    const targetSpeed = b.speedMin + Math.random() * (b.speedMax - b.speedMin);
                    b.vx = (b.vx / speed) * targetSpeed;
                    b.vy = (b.vy / speed) * targetSpeed;
                    b.turnTimer = 0.18 + Math.random() * 0.85;
                }

                b.obj.pos.x += b.vx * dt;
                b.obj.pos.y += b.vy * dt;

                const dxClear = b.obj.pos.x - clearingCenterX;
                const dyClear = b.obj.pos.y - clearingCenterY;
                const inClearing = (dxClear * dxClear + dyClear * dyClear) <= (clearingRadius * clearingRadius);
                const inPathSoftBand = b.obj.pos.y >= pathZoneTop - softMargin
                    && b.obj.pos.y <= pathZoneBottom + softMargin;
                // Bounce near path extremes for a natural "flutter off and return" look.
                if (!inClearing && inPathSoftBand) {
                    if (b.obj.pos.y < pathZoneTop && b.vy < 0) b.vy = Math.abs(b.vy) * (0.9 + Math.random() * 0.16);
                    if (b.obj.pos.y > pathZoneBottom && b.vy > 0) b.vy = -Math.abs(b.vy) * (0.9 + Math.random() * 0.16);
                    if (b.obj.pos.x < 0 && b.vx < 0) b.vx = Math.abs(b.vx) * (0.9 + Math.random() * 0.16);
                    // Let right side bleed slightly toward clearing, then return.
                    const farFromClearing = Math.hypot(b.obj.pos.x - clearingCenterX, b.obj.pos.y - clearingCenterY) > clearingRadius + 22;
                    if (b.obj.pos.x > renderedPathLength + softMargin * 0.4 && b.vx > 0 && farFromClearing) {
                        b.vx = -Math.abs(b.vx) * (0.88 + Math.random() * 0.18);
                    }
                }

                if (!isInStrictZone(b.obj.pos.x, b.obj.pos.y)) {
                    const target = nearestStrictZonePoint(b.obj.pos.x, b.obj.pos.y);
                    const toX = target.x - b.obj.pos.x;
                    const toY = target.y - b.obj.pos.y;
                    const toLen = Math.hypot(toX, toY) || 1;
                    const speed = Math.hypot(b.vx, b.vy) || b.speedMin;
                    const nx = toX / toLen;
                    const ny = toY / toLen;
                    // Add a tangent component so returns curve instead of snapping straight in.
                    const tx = -ny * b.curveDir;
                    const ty = nx * b.curveDir;
                    const steerStrength = isInSoftZone(b.obj.pos.x, b.obj.pos.y) ? 0.11 : 0.28;
                    const steerVx = (nx + tx * 0.42) * speed;
                    const steerVy = (ny + ty * 0.42) * speed;
                    b.vx += (steerVx - b.vx) * steerStrength;
                    b.vy += (steerVy - b.vy) * steerStrength;
                }

                // Keep butterflies on-screen.
                b.obj.pos.x = k.clamp(b.obj.pos.x, edgePad, w - edgePad);
                b.obj.pos.y = k.clamp(b.obj.pos.y, edgePad, h - edgePad);
                if (!isInSoftZone(b.obj.pos.x, b.obj.pos.y)) {
                    const target = nearestStrictZonePoint(b.obj.pos.x, b.obj.pos.y);
                    b.obj.pos.x = target.x;
                    b.obj.pos.y = target.y;
                }
                b.obj.flipX = b.vx < 0;
            }
        });
    }

    // ---- Flower field around path/clearing (48x48 cells, max 2 flowers/cell) + zoned trees ----
    const flowerStaticSheet = k.getSprite("flowers_sheet") ? "flowers_sheet" : null;
    const flowerAnimSheets = [
        "flowers_anim_sheet",
        "flowers_anim_sheet_2",
        "flowers_anim_sheet_3",
        "flowers_anim_sheet_4",
        "flowers_anim_sheet_5",
    ].filter((name) => !!k.getSprite(name));
    const hasBigOakTreeSprite = !!k.getSprite("big_oak_tree");
    const treeTrunkColliders = [];
    if (flowerStaticSheet || flowerAnimSheets.length > 0 || hasBigOakTreeSprite) {
        const animatedFlowerEntries = [];
        const treeTrunks = [];
        const pathPad = 10;
        const clearingPad = 6;
        const edgePad = 12;
        const gridSize = 48;
        const maxFlowersPerCell = 2;
        const animatedSpawnChance = flowerAnimSheets.length > 0
            ? (lowPerfMode ? 0.12 : 0.2)
            : 0;

        const isOnPath = (x, y) =>
            x >= -pathPad &&
            x <= renderedPathLength + pathPad &&
            y >= pathStripY - pathPad &&
            y <= pathStripY + renderedPathHeight + pathPad;
        const isInClearing = (x, y) => {
            const dx = x - clearingCenterX;
            const dy = y - clearingCenterY;
            const r = clearingRadius + clearingPad;
            return (dx * dx + dy * dy) <= (r * r);
        };

        // Still flowers: columns 1-4 and rows 1/3/5/7/9 (1-based), excluding row1 col1.
        const staticRows = [0, 2, 4, 6, 8];
        const staticCols = [0, 1, 2, 3];
        const staticFrames = [];
        for (const row of staticRows) {
            for (const col of staticCols) {
                if (row === 0 && col === 0) continue; // never use choice flower row1 col1
                staticFrames.push(row * 10 + col);
            }
        }

        // Animated flowers: first 4 rows (1-based), all columns, except top-row choice variants.
        const animRows = [0, 1, 2, 3];
        const pickAnimCol = (row) => {
            if (row === 0) {
                const allowedTopRowCols = [1, 2, 3, 5]; // skip col1 and col5 (1-based)
                return allowedTopRowCols[Math.floor(Math.random() * allowedTopRowCols.length)];
            }
            return Math.floor(Math.random() * 6);
        };

        if (hasBigOakTreeSprite) {
            const treeMinSpacing = 72;
            const treeClearanceFromClearing = clearingRadius + 50;
            const treeScaleBase = 2.0;
            const treePathBuffer = 80;
            const pathRectTop = pathStripY;
            const pathRectBottom = pathStripY + renderedPathHeight;
            const distToPathRect = (x, y) => {
                const nx = k.clamp(x, 0, renderedPathLength);
                const ny = k.clamp(y, pathRectTop, pathRectBottom);
                return Math.hypot(x - nx, y - ny);
            };

            const canPlaceTreeAt = (x, y) => {
                if (isOnPath(x, y)) return false;
                if (distToPathRect(x, y) < treePathBuffer) return false;
                if (isInClearing(x, y)) return false;
                if (Math.hypot(x - clearingCenterX, y - clearingCenterY) < treeClearanceFromClearing) return false;
                for (const t of treeTrunks) {
                    if (Math.hypot(x - t.x, y - t.baseY) < treeMinSpacing) return false;
                }
                return true;
            };

            const placeTreeAt = (x, y) => {
                const treeScale = treeScaleBase + (Math.random() * 0.26 - 0.13);
                k.add([
                    k.sprite("big_oak_tree", { frame: 1 }), // row 1, col 2
                    k.pos(x, y),
                    k.anchor("bot"),
                    k.scale(treeScale),
                    k.opacity(0.97),
                    k.z(90),
                ]);
                const trunkW = 32 * treeScale;
                const trunkH = 20 * treeScale;
                treeTrunkColliders.push({
                    left: x - trunkW / 2,
                    right: x + trunkW / 2,
                    top: y - trunkH,
                    bottom: y,
                });
                treeTrunks.push({
                    x,
                    baseY: y,
                    rootY: y - 4.2 * treeScale,
                    rootRadiusX: 30 * treeScale,
                    rootRadiusY: 22 * treeScale,
                    stemHalfW: 8 * treeScale,
                    stemTop: y - 20 * treeScale,
                    stemBottom: y + 2 * treeScale,
                });
            };

            const spawnTreesInZone = ({ minCount, maxCount, xMin, xMax, yMin, yMax }) => {
                if (xMax <= xMin || yMax <= yMin) return;
                const target = minCount + Math.floor(Math.random() * (maxCount - minCount + 1));
                const zoneW = Math.max(1, xMax - xMin);
                const zoneH = Math.max(1, yMax - yMin);
                const aspect = zoneW / zoneH;
                const slotCols = Math.max(1, Math.round(Math.sqrt(target * aspect)));
                const slotRows = Math.max(1, Math.ceil(target / slotCols));
                const slotW = zoneW / slotCols;
                const slotH = zoneH / slotRows;
                const slots = [];
                for (let row = 0; row < slotRows; row++) {
                    for (let col = 0; col < slotCols; col++) {
                        slots.push({
                            x0: xMin + col * slotW,
                            x1: xMin + (col + 1) * slotW,
                            y0: yMin + row * slotH,
                            y1: yMin + (row + 1) * slotH,
                        });
                    }
                }
                for (let i = slots.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [slots[i], slots[j]] = [slots[j], slots[i]];
                }

                let placed = 0;
                for (const slot of slots) {
                    if (placed >= target) break;
                    const padX = Math.min(10, (slot.x1 - slot.x0) * 0.2);
                    const padY = Math.min(10, (slot.y1 - slot.y0) * 0.2);
                    const sx0 = slot.x0 + padX;
                    const sx1 = slot.x1 - padX;
                    const sy0 = slot.y0 + padY;
                    const sy1 = slot.y1 - padY;
                    if (sx1 <= sx0 || sy1 <= sy0) continue;

                    let placedInSlot = false;
                    for (let attempt = 0; attempt < 10; attempt++) {
                        const x = sx0 + Math.random() * (sx1 - sx0);
                        const y = sy0 + Math.random() * (sy1 - sy0);
                        if (!canPlaceTreeAt(x, y)) continue;
                        placeTreeAt(x, y);
                        placed++;
                        placedInSlot = true;
                        break;
                    }
                    if (placedInSlot) continue;
                }

                // Fallback random attempts when strict slot placement can't satisfy count.
                const maxFallbackAttempts = target * 80;
                for (let attempt = 0; attempt < maxFallbackAttempts && placed < target; attempt++) {
                    const x = xMin + Math.random() * (xMax - xMin);
                    const y = yMin + Math.random() * (yMax - yMin);
                    if (!canPlaceTreeAt(x, y)) continue;
                    placeTreeAt(x, y);
                    placed++;
                }
            };

            const treeMinY = 48 * (treeScaleBase + 0.13) + 4;
            const treeZones = [
                // Top of path: 2-3 trees
                {
                    minCount: 2,
                    maxCount: 3,
                    xMin: edgePad + 20,
                    xMax: Math.max(edgePad + 70, renderedPathLength - 24),
                    yMin: treeMinY,
                    yMax: Math.max(treeMinY + 10, pathStripY - treePathBuffer),
                },
                // Behind clearing: 1-2 trees (right side, still outside clearing safety band)
                {
                    minCount: 1,
                    maxCount: 2,
                    xMin: Math.max(edgePad + 20, clearingCenterX + clearingRadius * 0.58),
                    xMax: w - edgePad - 12,
                    yMin: Math.max(treeMinY, clearingCenterY - clearingRadius * 0.9),
                    yMax: Math.min(h - edgePad - 4, clearingCenterY + clearingRadius * 0.9),
                },
                // Bottom of path: 2-3 trees
                {
                    minCount: 2,
                    maxCount: 3,
                    xMin: edgePad + 20,
                    xMax: Math.max(edgePad + 70, renderedPathLength - 24),
                    yMin: Math.min(h - edgePad - 6, pathStripY + renderedPathHeight + treePathBuffer),
                    yMax: h - edgePad - 6,
                },
            ];

            for (const zone of treeZones) {
                spawnTreesInZone(zone);
            }
        }

        // Ground texture under flower field (outside path and clearing), tuned stronger for readability.
        const fieldMacroPatchCount = Math.min(
            lowPerfMode ? 22 : 30,
            Math.max(16, Math.round((w * h) / (lowPerfMode ? 13000 : 10500))),
        );
        for (let i = 0; i < fieldMacroPatchCount; i++) {
            const x = edgePad + Math.random() * Math.max(8, w - edgePad * 2);
            const y = edgePad + Math.random() * Math.max(8, h - edgePad * 2);
            if (isOnPath(x, y)) continue;
            if (isInClearing(x, y)) continue;
            const darkPatch = Math.random() < 0.62;
            k.add([
                k.circle(10 + Math.random() * 14),
                k.pos(x, y),
                ...(darkPatch ? [k.color(72, 118, 58)] : [k.color(112, 164, 88)]),
                k.opacity(darkPatch ? (0.05 + Math.random() * 0.05) : (0.035 + Math.random() * 0.04)),
                k.z(1),
            ]);
        }
        const fieldTextureCount = Math.min(
            lowPerfMode ? 120 : 170,
            Math.max(lowPerfMode ? 72 : 90, Math.round((w * h) / (lowPerfMode ? 4200 : 3400))),
        );
        for (let i = 0; i < fieldTextureCount; i++) {
            const x = edgePad + Math.random() * Math.max(8, w - edgePad * 2);
            const y = edgePad + Math.random() * Math.max(8, h - edgePad * 2);
            if (isOnPath(x, y)) continue;
            if (isInClearing(x, y)) continue;
            const darkPatch = Math.random() < 0.6;
            k.add([
                k.circle(4.8 + Math.random() * 10.5),
                k.pos(x, y),
                ...(darkPatch ? [k.color(78, 126, 62)] : [k.color(116, 169, 92)]),
                k.opacity(darkPatch ? (0.09 + Math.random() * 0.09) : (0.065 + Math.random() * 0.075)),
                k.z(1),
            ]);
        }
        const fieldSpeckleCount = Math.min(
            lowPerfMode ? 130 : 190,
            Math.max(lowPerfMode ? 80 : 110, Math.round((w * h) / (lowPerfMode ? 3200 : 2600))),
        );
        for (let i = 0; i < fieldSpeckleCount; i++) {
            const x = edgePad + Math.random() * Math.max(8, w - edgePad * 2);
            const y = edgePad + Math.random() * Math.max(8, h - edgePad * 2);
            if (isOnPath(x, y)) continue;
            if (isInClearing(x, y)) continue;
            k.add([
                k.circle(0.9 + Math.random() * 1.6),
                k.pos(x, y),
                k.color(70, 111, 55),
                k.opacity(0.11 + Math.random() * 0.1),
                k.z(1),
            ]);
        }

        const isNearTreeTrunk = (x, y) => {
            for (const t of treeTrunks) {
                const dx = (x - t.x) / t.rootRadiusX;
                const dy = (y - t.rootY) / t.rootRadiusY;
                if ((dx * dx + dy * dy) <= 1) return true;
                if (
                    x >= t.x - t.stemHalfW &&
                    x <= t.x + t.stemHalfW &&
                    y >= t.stemTop &&
                    y <= t.stemBottom
                ) return true;
            }
            return false;
        };

        const spawnFlowerAt = (x, y) => {
            if (isNearTreeTrunk(x, y)) return false;
            const useAnimated = flowerAnimSheets.length > 0
                && animatedFlowerEntries.length < maxAnimatedFlowers
                && (!flowerStaticSheet || Math.random() < animatedSpawnChance);

            let spriteName = flowerStaticSheet;
            let frame = 0;
            let anim = null;
            let animRow = -1;
            let rowStart = 0;

            if (useAnimated) {
                const sheet = flowerAnimSheets[Math.floor(Math.random() * flowerAnimSheets.length)];
                animRow = animRows[Math.floor(Math.random() * animRows.length)];
                rowStart = animRow * 6;
                frame = rowStart + pickAnimCol(animRow);
                anim = `sway-row-${animRow + 1}`;
                spriteName = sheet;
            } else {
                if (!flowerStaticSheet || staticFrames.length === 0) return false;
                frame = staticFrames[Math.floor(Math.random() * staticFrames.length)];
            }

            const flower = k.add([
                k.sprite(spriteName, { frame }),
                k.pos(x, y),
                k.anchor("center"),
                k.scale(2.0 + Math.random() * 1.4),
                k.opacity(0.9),
                k.z(20),
            ]);

            if (anim) {
                animatedFlowerEntries.push({
                    obj: flower,
                    anim,
                    animRow,
                    rowStart,
                    burst: 0,
                    cooldown: 4 + Math.random() * 8,
                });
            }
            return true;
        };

        if (flowerStaticSheet || flowerAnimSheets.length > 0) {
            const cols = Math.ceil(w / gridSize);
            const rows = Math.ceil(h / gridSize);
            let placedFlowerCount = 0;
            flowerGridLoop: for (let gy = 0; gy < rows; gy++) {
                for (let gx = 0; gx < cols; gx++) {
                    if (placedFlowerCount >= flowerBudget) break flowerGridLoop;
                    const cellLeft = gx * gridSize;
                    const cellTop = gy * gridSize;
                    const margin = 3;
                    const xMin = Math.max(edgePad, cellLeft + margin);
                    const xMax = Math.min(w - edgePad, cellLeft + gridSize - margin);
                    const yMin = Math.max(edgePad, cellTop + margin);
                    const yMax = Math.min(h - edgePad, cellTop + gridSize - margin);
                    if (xMax <= xMin || yMax <= yMin) continue;

                    const remainingBudget = flowerBudget - placedFlowerCount;
                    if (remainingBudget <= 0) break flowerGridLoop;
                    const targetInCell = Math.min(
                        maxFlowersPerCell,
                        remainingBudget,
                        1 + (Math.random() < secondFlowerChance ? 1 : 0),
                    );
                    let placedInCell = 0;
                    for (let attempt = 0; attempt < 5 && placedInCell < targetInCell && placedInCell < maxFlowersPerCell; attempt++) {
                        const x = xMin + Math.random() * (xMax - xMin);
                        const y = yMin + Math.random() * (yMax - yMin);
                        if (isOnPath(x, y)) continue;
                        if (isInClearing(x, y)) continue;
                        if (spawnFlowerAt(x, y)) {
                            placedInCell++;
                            placedFlowerCount++;
                        }
                    }
                }
            }
        }

        if (animatedFlowerEntries.length > 0) {
            const animStride = animatedFlowerEntries.length >= 180
                ? 6
                : (animatedFlowerEntries.length >= 90 ? 4 : 3);
            let animPhase = 0;
            k.onUpdate(() => {
                const dt = k.dt() * animStride;
                for (let i = animPhase; i < animatedFlowerEntries.length; i += animStride) {
                    const f = animatedFlowerEntries[i];
                    if (f.burst > 0) {
                        f.burst -= dt;
                        if (f.burst <= 0) {
                            if (typeof f.obj.stop === "function") f.obj.stop();
                            f.obj.frame = f.rowStart + pickAnimCol(f.animRow);
                            f.cooldown = 7 + Math.random() * 11;
                        }
                        continue;
                    }
                    f.cooldown -= dt;
                    if (f.cooldown <= 0) {
                        f.obj.play(f.anim);
                        f.burst = 0.7 + Math.random() * 1.2;
                    }
                }
                animPhase = (animPhase + 1) % animStride;
            });
        }
    }

    // ---- M3: Clearing circle at end of path ----
    const clearingGrassColor = [110, 155, 85];
    const clearingRimShadowColor = [72, 48, 30];
    const clearingRimLayers = [
        { inset: 0, opacity: 0.10 },
        { inset: 7, opacity: 0.07 },
        { inset: 14, opacity: 0.05 },
    ];
    const clearingRimInset = 20; // bring transition 10-20px inward from the edge

    k.add([
        k.circle(clearingRadius),
        k.pos(clearingCenterX, clearingCenterY),
        k.color(...clearingGrassColor),
    ]);
    for (const layer of clearingRimLayers) {
        k.add([
            k.circle(clearingRadius - layer.inset),
            k.pos(clearingCenterX, clearingCenterY),
            k.color(...clearingRimShadowColor),
            k.opacity(layer.opacity),
        ]);
    }
    // Restore and slightly lift the interior so the edge reads as a soft rim.
    k.add([
        k.circle(clearingRadius - clearingRimInset),
        k.pos(clearingCenterX, clearingCenterY),
        k.color(...clearingGrassColor),
    ]);
    k.add([
        k.circle(clearingRadius - clearingRimInset - 5),
        k.pos(clearingCenterX, clearingCenterY),
        k.color(118, 164, 90),
        k.opacity(0.12),
    ]);
    // Mottled texture inside clearing so the ground reads less flat.
    const clearingTextureRadius = Math.max(20, clearingRadius - clearingRimInset - 12);
    const clearingTextureCount = Math.min(
        lowPerfMode ? 54 : 72,
        Math.max(40, Math.round((clearingTextureRadius * clearingTextureRadius) / (lowPerfMode ? 2300 : 1800))),
    );
    for (let i = 0; i < clearingTextureCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.sqrt(Math.random()) * clearingTextureRadius;
        const x = clearingCenterX + Math.cos(angle) * dist;
        const y = clearingCenterY + Math.sin(angle) * dist;
        const darkPatch = Math.random() < 0.58;
        k.add([
            k.circle(4 + Math.random() * 10),
            k.pos(x, y),
            ...(darkPatch ? [k.color(95, 140, 76)] : [k.color(130, 174, 100)]),
            k.opacity(darkPatch ? (0.08 + Math.random() * 0.08) : (0.05 + Math.random() * 0.06)),
            k.z(1),
        ]);
    }
    const clearingSpeckleCount = Math.min(
        lowPerfMode ? 68 : 92,
        Math.max(52, Math.round((clearingTextureRadius * clearingTextureRadius) / (lowPerfMode ? 1250 : 980))),
    );
    for (let i = 0; i < clearingSpeckleCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.sqrt(Math.random()) * clearingTextureRadius;
        const x = clearingCenterX + Math.cos(angle) * dist;
        const y = clearingCenterY + Math.sin(angle) * dist;
        k.add([
            k.circle(0.7 + Math.random() * 1.4),
            k.pos(x, y),
            k.color(82, 125, 66),
            k.opacity(0.09 + Math.random() * 0.09),
            k.z(1),
        ]);
    }

    // ---- Ambient weather: drifting cloud shadows + occasional wind gust ----
    const hasCloudsSprite = !!k.getSprite("clouds_sheet");
    if (hasCloudsSprite) {
        const cloudCount = 2 + Math.floor(Math.random() * 2); // 2-3
        const clouds = [];
        const cloudFrames = [0, 1, 2, 3];
        const cloudSpacingX = Math.max(260, w * 0.34);
        const cloudInitialGapX = Math.max(120, w * 0.26);
        const firstVisibleX = w * (0.18 + Math.random() * 0.12);
        let secondVisibleX = w * (0.58 + Math.random() * 0.18);
        let cloudRegenTimer = 6 + Math.random() * 6;
        if (Math.abs(secondVisibleX - firstVisibleX) < cloudInitialGapX) {
            secondVisibleX = k.clamp(firstVisibleX + cloudInitialGapX, 24, w - 24);
        }
        // Shuffle so initial clouds prefer distinct variants.
        for (let i = cloudFrames.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [cloudFrames[i], cloudFrames[j]] = [cloudFrames[j], cloudFrames[i]];
        }

        for (let i = 0; i < cloudCount; i++) {
            const speed = 9 + Math.random() * 14;
            let startX = -140 - i * cloudSpacingX - Math.random() * 80;
            if (i === 0) startX = firstVisibleX;
            if (i === 1) startX = secondVisibleX;
            const y = 10 + Math.random() * Math.max(24, h * 0.72);
            const frame = cloudFrames[i % cloudFrames.length];

            const cloud = k.add([
                k.sprite("clouds_sheet", { frame }),
                k.pos(startX, y),
                k.anchor("center"),
                k.scale(2.9 + Math.random() * 0.35),
                k.opacity(0.24 + Math.random() * 0.22),
                "cloudShadow",
            ]);

            clouds.push({
                obj: cloud,
                vx: speed,
                baseY: y,
                age: Math.random() * 8,
                bobAmp: 1.5 + Math.random() * 3,
                bobFreq: 0.3 + Math.random() * 0.6,
            });
        }

        k.onUpdate(() => {
            const dt = k.dt();
            let visibleClouds = 0;
            for (const c of clouds) {
                c.age += dt;
                c.obj.pos.x += c.vx * dt;
                c.obj.pos.y = c.baseY + Math.sin(c.age * c.bobFreq) * c.bobAmp;
                if (c.obj.pos.x > -100 && c.obj.pos.x < w + 100) {
                    visibleClouds++;
                }

                if (c.obj.pos.x > w + 140) {
                    let leftMostX = Infinity;
                    for (const other of clouds) {
                        if (other === c) continue;
                        if (other.obj.pos.x < leftMostX) leftMostX = other.obj.pos.x;
                    }
                    c.obj.pos.x = (leftMostX === Infinity)
                        ? -140
                        : leftMostX - cloudSpacingX - Math.random() * 80;
                    c.baseY = 10 + Math.random() * Math.max(24, h * 0.72);
                    c.obj.frame = Math.floor(Math.random() * 4);
                }
            }

            // Periodic regeneration keeps cloud variants cycling over time.
            cloudRegenTimer -= dt;
            if (cloudRegenTimer <= 0) {
                const c = clouds[Math.floor(Math.random() * clouds.length)];
                c.obj.pos.x = -140 - Math.random() * 120;
                c.baseY = 10 + Math.random() * Math.max(24, h * 0.72);
                c.obj.frame = Math.floor(Math.random() * 4);
                c.age = 0;
                cloudRegenTimer = 6 + Math.random() * 8;
            }

            // Safety net: if all clouds are off-screen, force one back into view.
            if (visibleClouds === 0 && clouds.length > 0) {
                const c = clouds[Math.floor(Math.random() * clouds.length)];
                c.obj.pos.x = 40 + Math.random() * Math.max(30, w - 80);
                c.baseY = 10 + Math.random() * Math.max(24, h * 0.72);
                c.obj.frame = Math.floor(Math.random() * 4);
                c.age = Math.random() * 3;
            }
        });
    }

    const hasWindSprite = !!k.getSprite("wind_sheet");
    if (hasWindSprite) {
        let activeGust = null; // only one gust at a time
        let nextGustIn = 1.8 + Math.random() * 3.2;

        const spawnGust = () => {
            const spawnPad = 22;
            const x = spawnPad + Math.random() * Math.max(10, w - spawnPad * 2);
            const y = spawnPad + Math.random() * Math.max(10, h - spawnPad * 2);
            const speed = 110 + Math.random() * 120;
            const angle = Math.random() * Math.PI * 2;
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed;
            const gust = k.add([
                k.sprite("wind_sheet", { frame: 0 }),
                k.pos(x, y),
                k.anchor("center"),
                k.scale(2.6),
                k.opacity(0.64),
                "windGust",
            ]);
            gust.play("gust");
            gust.flipX = vx < 0;
            activeGust = {
                obj: gust,
                vx,
                vy,
                ttl: 1.1 + Math.random() * 1.2,
            };
        };

        k.onUpdate(() => {
            const dt = k.dt();
            if (!activeGust) {
                nextGustIn -= dt;
                if (nextGustIn <= 0) {
                    spawnGust();
                }
                return;
            }

            activeGust.ttl -= dt;
            activeGust.obj.pos.x += activeGust.vx * dt;
            activeGust.obj.pos.y += activeGust.vy * dt;
            if (activeGust.ttl < 0.4) {
                activeGust.obj.opacity = Math.max(0, activeGust.ttl / 0.4) * 0.64;
            }

            const despawnPad = 72;
            const outOfBounds =
                activeGust.obj.pos.x < -despawnPad ||
                activeGust.obj.pos.x > w + despawnPad ||
                activeGust.obj.pos.y < -despawnPad ||
                activeGust.obj.pos.y > h + despawnPad;
            if (activeGust.ttl <= 0 || outOfBounds) {
                k.destroy(activeGust.obj);
                activeGust = null;
                nextGustIn = 2.4 + Math.random() * 4.6;
            }
        });
    }

    // ---- M4: Two choice objects (flowers), vertically stacked ----
    // Roses sit to the LEFT of the NPC so the speech bubble above NPC has clear space
    const choiceRadius = 26;
    const choiceFlowerScale = 4;
    const rosesCenterX = clearingCenterX - 30;
    const rose1Y = clearingCenterY - 60;
    const rose2Y = clearingCenterY + 60;
    const hasFlowersAnimSheet = !!k.getSprite("flowers_anim_sheet");
    const hasFlowersSheet = !!k.getSprite("flowers_sheet");
    const flowerChoiceSprite = hasFlowersAnimSheet ? "flowers_anim_sheet" : "flowers_sheet";
    const hasFlowerChoiceSprite = hasFlowersAnimSheet || hasFlowersSheet;
    const choice1 = k.add([
        hasFlowerChoiceSprite
            ? k.sprite(flowerChoiceSprite, { frame: hasFlowersAnimSheet ? 0 : 0 })
            : k.circle(choiceRadius),
        k.pos(rosesCenterX, rose1Y),
        ...(hasFlowerChoiceSprite ? [k.anchor("center"), k.scale(choiceFlowerScale)] : [k.color(200, 50, 50), k.scale(1)]),
        k.opacity(1),
        k.z(120),
        "choice",
    ]);
    if (hasFlowersAnimSheet) choice1.play("sway-row-1");
    const choice2 = k.add([
        hasFlowerChoiceSprite
            ? k.sprite(flowerChoiceSprite, { frame: hasFlowersAnimSheet ? 24 : 4 })
            : k.circle(choiceRadius),
        k.pos(rosesCenterX, rose2Y),
        ...(hasFlowerChoiceSprite ? [k.anchor("center"), k.scale(choiceFlowerScale)] : [k.color(200, 50, 50), k.scale(1)]),
        k.opacity(1),
        k.z(120),
        "choice",
    ]);
    if (hasFlowersAnimSheet) choice2.play("sway-row-5");
    const roseGlowColor = [255, 130, 170];
    const choiceGlow1 = k.add([
        k.circle(choiceRadius + 10),
        k.pos(rosesCenterX, rose1Y),
        k.anchor("center"),
        k.color(...roseGlowColor),
        k.scale(1),
        k.opacity(0),
        k.z(119),
    ]);
    const choiceGlow2 = k.add([
        k.circle(choiceRadius + 10),
        k.pos(rosesCenterX, rose2Y),
        k.anchor("center"),
        k.color(...roseGlowColor),
        k.scale(1),
        k.opacity(0),
        k.z(119),
    ]);
    // Grass patch sprites removed per latest direction.

    // ---- M4: NPC placeholder — to the right of clearing center, speech bubble above ----
    const npcSize = 192;
    const npcScale = 3;
    const npcPlacementOffsetX = -24; // move NPC a bit left in the clearing
    const npcPlacementOffsetY = -18; // move NPC a bit up toward path centerline
    // Measured from npc_sheet frame 8/9 (64x64): visible body lives inside this sub-rect.
    const npcVisibleFrameRect = { x: 26, y: 21, w: 13, h: 20 };
    // Keep the same intended NPC body center used by prior placeholder layout.
    const npcBodyCenter = {
        x: clearingCenterX + 60 + npcSize / 2 + npcPlacementOffsetX,
        y: clearingCenterY + npcPlacementOffsetY,
    };
    // Shift draw position so the visible body (not transparent frame) is centered at npcBodyCenter.
    const npcDrawX = npcBodyCenter.x
        - (npcVisibleFrameRect.x + npcVisibleFrameRect.w / 2) * npcScale;
    const npcDrawY = npcBodyCenter.y
        - (npcVisibleFrameRect.y + npcVisibleFrameRect.h / 2) * npcScale;
    const hasNpcSprite = !!k.getSprite("npc_sheet");
    const npc = k.add([
        hasNpcSprite ? k.sprite("npc_sheet", { frame: 8 }) : k.rect(npcSize, npcSize),
        k.pos(npcDrawX, npcDrawY),
        ...(hasNpcSprite
            ? [k.scale(npcScale), k.anchor("topleft")]
            : [k.anchor("topleft"), k.color(100, 90, 140)]),
    ]);
    if (hasNpcSprite) {
        npc.play("idle-left");
        npc.flipX = true;
    }

    const getNpcWorldMetrics = () => {
        if (!hasNpcSprite) {
            const left = npc.pos.x;
            const top = npc.pos.y;
            const right = left + npcSize;
            const bottom = top + npcSize;
            return {
                left,
                top,
                right,
                bottom,
                centerX: (left + right) / 2,
                centerY: (top + bottom) / 2,
            };
        }

        const left = npc.pos.x + npcVisibleFrameRect.x * npcScale;
        const top = npc.pos.y + npcVisibleFrameRect.y * npcScale;
        const right = left + npcVisibleFrameRect.w * npcScale;
        const bottom = top + npcVisibleFrameRect.h * npcScale;
        return {
            left,
            top,
            right,
            bottom,
            centerX: (left + right) / 2,
            centerY: (top + bottom) / 2,
        };
    };

    // ---- M2: Player — sprite if loaded, else rect; onKeyDown move; spawn at path start ----
    const hasPlayerSprite = !!k.getSprite("player_sheet");
    const playerFrameSize = 64;
    const playerScale = 3;
    // Measured from player_sheet 64x64 frames: visible pixels are around y=19..40.
    const playerVisibleFrameRect = { x: 24, y: 19, w: 16, h: 22 };
    const playerW = playerFrameSize * playerScale;
    const playerH = playerFrameSize * playerScale;
    const player = k.add([
        hasPlayerSprite ? k.sprite("player_sheet", { frame: 0 }) : k.rect(playerFrameSize, playerFrameSize),
        k.pos(40, h / 2 - playerH / 2),
        k.scale(playerScale),
        k.area(),
        k.z(60),
        ...(hasPlayerSprite ? [] : [k.color(200, 80, 80)]),
        "player",
    ]);

    k.onClick(() => {
        if (k.canvas && typeof k.canvas.focus === "function") k.canvas.focus();
    });

    // ---- Input: keyboard + touch-to-move (touch only, not mouse) ----
    const moveAmount = 200;
    let moveTarget = null;   // {x, y} or null — set by touch, cleared on arrival or keyboard

    // Touch-to-move: only on mobile/touch devices so desktop mouse clicks don't interfere
    if (isTouchDevice) {
        k.onClick(() => {
            const mp = k.mousePos();
            if (!mp) return;
            if (choiceController && choiceController.isTapOnVisibleChoice(mp)) return;
            moveTarget = { x: mp.x, y: mp.y };
        });
    }

    // Keyboard movement — also cancels any active touch target
    let playerDir = "right";
    let playerMoving = false;
    const clearMoveTarget = () => { moveTarget = null; };
    const setDir = (dir) => { playerDir = dir; playerMoving = true; };
    k.onKeyDown("left",  () => { clearMoveTarget(); setDir("left");  player.move(-moveAmount, 0); });
    k.onKeyDown("right", () => { clearMoveTarget(); setDir("right"); player.move(moveAmount, 0); });
    k.onKeyDown("up",    () => { clearMoveTarget(); setDir("up");    player.move(0, -moveAmount); });
    k.onKeyDown("down",  () => { clearMoveTarget(); setDir("down");  player.move(0, moveAmount); });
    k.onKeyDown("a",     () => { clearMoveTarget(); setDir("left");  player.move(-moveAmount, 0); });
    k.onKeyDown("d",     () => { clearMoveTarget(); setDir("right"); player.move(moveAmount, 0); });
    k.onKeyDown("w",     () => { clearMoveTarget(); setDir("up");    player.move(0, -moveAmount); });
    k.onKeyDown("s",     () => { clearMoveTarget(); setDir("down");  player.move(0, moveAmount); });

    // Clamp to world bounds + click-to-move towards target
    // Keep collision footprint intentionally smaller than the 3x visual sprite.
    const playerBodyOffsetX = 32 * playerScale;
    const playerBodyOffsetY = 40 * playerScale;
    const playerBodyW = 32;
    const playerBodyH = 44;
    // Rose collisions need a slightly higher body probe so top-side rose hits aren't oversized.
    const roseCollisionOffsetX = playerBodyOffsetX;
    const roseCollisionOffsetY = playerBodyOffsetY - 20;
    const roseCollisionBodyW = playerBodyW;
    const roseCollisionBodyH = playerBodyH;
    const roses = [choice1, choice2];
    const arrivalThreshold = 8;  // stop moving when this close to target
    let moveBlockTimer = 0;
    k.onUpdate(() => {
        const dt = k.dt();
        const startX = player.pos.x;
        const startY = player.pos.y;
        let collidedThisFrame = false;

        // Move toward click/touch target
        if (moveTarget) {
            const cx = player.pos.x + playerBodyOffsetX;
            const cy = player.pos.y + playerBodyOffsetY;
            const dx = moveTarget.x - cx;
            const dy = moveTarget.y - cy;
            const dist = Math.hypot(dx, dy);
            if (dist < arrivalThreshold) {
                moveTarget = null;
            } else {
                player.move((dx / dist) * moveAmount, (dy / dist) * moveAmount);
                playerMoving = true;
                // Infer direction from movement vector for touch-to-move
                if (Math.abs(dx) > Math.abs(dy)) {
                    playerDir = dx > 0 ? "right" : "left";
                } else {
                    playerDir = dy > 0 ? "down" : "up";
                }
            }
        }
        // Clamp to world bounds.
        // Keep X based on body footprint (already tuned), and Y based on visible sprite bounds.
        const minPlayerX = -playerBodyOffsetX + playerBodyW / 2;
        const maxPlayerX = w - playerBodyOffsetX - playerBodyW / 2;
        const visibleTopOffset = playerVisibleFrameRect.y * playerScale;
        const visibleBottomOffset = (playerVisibleFrameRect.y + playerVisibleFrameRect.h) * playerScale;
        const minPlayerY = -visibleTopOffset + 2;
        const maxPlayerY = h - visibleBottomOffset - 2;
        player.pos.x = k.clamp(player.pos.x, minPlayerX, maxPlayerX);
        player.pos.y = k.clamp(player.pos.y, minPlayerY, maxPlayerY);

        // Push player out of rose circles (solid borders)
        // Use rose circle radius against the player's body box for tighter borders.
        const roseCollisionRadius = choiceRadius - 1;
        for (const rose of roses) {
            const pLeft = player.pos.x + roseCollisionOffsetX - roseCollisionBodyW / 2;
            const pTop = player.pos.y + roseCollisionOffsetY - roseCollisionBodyH / 2;
            const pRight = pLeft + roseCollisionBodyW;
            const pBottom = pTop + roseCollisionBodyH;

            const closestX = k.clamp(rose.pos.x, pLeft, pRight);
            const closestY = k.clamp(rose.pos.y, pTop, pBottom);
            let dx = closestX - rose.pos.x;
            let dy = closestY - rose.pos.y;
            let dist = Math.hypot(dx, dy);
            if (dist < roseCollisionRadius) {
                collidedThisFrame = true;
                if (dist < 0.0001) {
                    // Fallback: rose center is within player body box.
                    dx = (player.pos.x + roseCollisionOffsetX) - rose.pos.x;
                    dy = (player.pos.y + roseCollisionOffsetY) - rose.pos.y;
                    dist = Math.hypot(dx, dy);
                    if (dist < 0.0001) {
                        dx = 0;
                        dy = -1;
                        dist = 1;
                    }
                }
                const push = roseCollisionRadius - dist;
                player.pos.x += (dx / dist) * push;
                player.pos.y += (dy / dist) * push;
            }
        }

        // Push player out of NPC rect (solid border)
        // Anchor collision to the visible NPC body (ignores transparent sprite padding).
        const npcMetrics = getNpcWorldMetrics();
        const npcCollisionW = 34;
        const npcCollisionH = 38;
        const npcLeft = npcMetrics.centerX - npcCollisionW / 2;
        const npcTop = npcMetrics.bottom - npcCollisionH;
        const npcRight = npcLeft + npcCollisionW;
        const npcBottom = npcTop + npcCollisionH;
        const pLeft = player.pos.x + playerBodyOffsetX - playerBodyW / 2;
        const pTop = player.pos.y + playerBodyOffsetY - playerBodyH / 2;
        const pRight = pLeft + playerBodyW;
        const pBottom = pTop + playerBodyH;
        const overlapX = Math.min(pRight, npcRight) - Math.max(pLeft, npcLeft);
        const overlapY = Math.min(pBottom, npcBottom) - Math.max(pTop, npcTop);
        if (overlapX > 0 && overlapY > 0) {
            collidedThisFrame = true;
            // Push along the axis with the smallest overlap
            if (overlapX < overlapY) {
                player.pos.x += (pLeft < npcLeft) ? -overlapX : overlapX;
            } else {
                player.pos.y += (pTop < npcTop) ? -overlapY : overlapY;
            }
        }

        // Push player out of tree trunk colliders (bottom 20px of each 32px-wide tree base, scaled).
        for (const trunk of treeTrunkColliders) {
            const tpLeft = player.pos.x + playerBodyOffsetX - playerBodyW / 2;
            const tpTop = player.pos.y + playerBodyOffsetY - playerBodyH / 2;
            const tpRight = tpLeft + playerBodyW;
            const tpBottom = tpTop + playerBodyH;
            const treeOverlapX = Math.min(tpRight, trunk.right) - Math.max(tpLeft, trunk.left);
            const treeOverlapY = Math.min(tpBottom, trunk.bottom) - Math.max(tpTop, trunk.top);
            if (treeOverlapX > 0 && treeOverlapY > 0) {
                collidedThisFrame = true;
                if (treeOverlapX < treeOverlapY) {
                    player.pos.x += (tpLeft < trunk.left) ? -treeOverlapX : treeOverlapX;
                } else {
                    player.pos.y += (tpTop < trunk.top) ? -treeOverlapY : treeOverlapY;
                }
            }
        }

        const movedDist = Math.hypot(player.pos.x - startX, player.pos.y - startY);
        const movedThisFrame = movedDist > 0.05;
        if (moveTarget) {
            if (movedThisFrame) {
                moveBlockTimer = 0;
            } else {
                moveBlockTimer += dt;
            }
            if (collidedThisFrame || moveBlockTimer > 0.12) {
                moveTarget = null;
                moveBlockTimer = 0;
            }
        } else {
            moveBlockTimer = 0;
        }

        // Drive walk/idle by input intent, but stop walking when colliding with solid borders.
        if (hasPlayerSprite) {
            const shouldWalk = playerMoving && !collidedThisFrame;
            const animName = shouldWalk ? `walk-${playerDir}` : `idle-${playerDir}`;
            player.flipX = (playerDir === "left");
            if (player.curAnim() !== animName) {
                player.play(animName);
            }
        }
        playerMoving = false;
    });

    // ---- M4: Proximity prompt + one-time interact (choiceController) ----
    const setUniformScale = (entity, value) => {
        if (!entity.scale) {
            entity.scale = k.vec2(value, value);
            return;
        }
        if (typeof entity.scale === "number") {
            entity.scale = k.vec2(value, value);
            return;
        }
        entity.scale.x = value;
        entity.scale.y = value;
    };
    const getUniformScale = (entity, fallback = 1) => {
        if (!entity.scale) return fallback;
        if (typeof entity.scale === "number") return entity.scale;
        if (typeof entity.scale.x === "number") return entity.scale.x;
        return fallback;
    };
    const roseChoices = [choice1, choice2];
    const roseGlows = [choiceGlow1, choiceGlow2];
    const baseChoiceScales = roseChoices.map((choice) => getUniformScale(choice, hasFlowerChoiceSprite ? choiceFlowerScale : 1));
    const interactionState = {
        inRange: false,
        successFired: false,
        selectedChoiceIndex: -1,
        closestChoiceIndex: -1,
    };

    const choiceSuccessBus = k.add([]);
    const choiceController = setupChoiceInteraction(k, {
        player,
        playerBodyOffset: { x: playerBodyOffsetX, y: playerBodyOffsetY },
        choices: roseChoices,
        labels: ["Yes!!", "I already said yes TT"],
        onRangeChange: (inRange) => {
            interactionState.inRange = inRange;
            if (!inRange) interactionState.closestChoiceIndex = -1;
        },
        onRangeTick: (inRange, pulseTime, successFired, closestIdx) => {
            interactionState.inRange = inRange;
            interactionState.successFired = successFired;
            interactionState.closestChoiceIndex = closestIdx;
            const pulseScale = 1 + Math.sin(pulseTime * 5.4) * 0.04;
            const glowPulse = 1 + Math.sin(pulseTime * 5.4 + 0.4) * 0.14;
            const activeIdx = successFired ? interactionState.selectedChoiceIndex : closestIdx;
            for (let i = 0; i < roseChoices.length; i++) {
                const choice = roseChoices[i];
                const glow = roseGlows[i];
                const isActive = (inRange || successFired) && i === activeIdx;
                if (!isActive) {
                    setUniformScale(choice, baseChoiceScales[i]);
                    choice.opacity = 1;
                    glow.opacity = 0;
                    setUniformScale(glow, 1);
                    continue;
                }
                setUniformScale(choice, baseChoiceScales[i] * pulseScale);
                choice.opacity = 0.94 + (Math.sin(pulseTime * 5.4 + i * 0.8) + 1) * 0.03;
                setUniformScale(glow, glowPulse);
                glow.opacity = 0.16 + (Math.sin(pulseTime * 5.4 + i * 0.6) + 1) * 0.07;
            }
        },
        onSuccess: (choiceIdx) => {
            interactionState.selectedChoiceIndex = choiceIdx;
            interactionState.successFired = true;
            choiceSuccessBus.trigger("choiceSuccess", choiceIdx);
        },
    });

    // ---- M5: Petal effects (ambient + burst on success) ----
    setupPetalEffects(k, {
        clearingCenter: { x: clearingCenterX, y: clearingCenterY },
        worldW: w,
        worldH: h,
        ambientConfig: lowPerfMode
            ? { maxPetals: 24, spawnInterval: 0.26, initialFillRatio: 0.55 }
            : { maxPetals: 34, spawnInterval: 0.2, initialFillRatio: 0.65 },
        successBus: choiceSuccessBus,
    });

    // ---- M6: UI text - speech bubble with interaction choices ----
    setupUI(k, {
        clearingCenter: { x: clearingCenterX, y: clearingCenterY },
        clearingRadius,
        npcBodyCenter: {
            x: getNpcWorldMetrics().centerX,
            y: getNpcWorldMetrics().centerY,
        },
        npcBubbleAnchor: {
            x: getNpcWorldMetrics().centerX,
            y: getNpcWorldMetrics().top,
        },
        npcProximityRect: {
            left: getNpcWorldMetrics().left,
            top: getNpcWorldMetrics().top,
            right: getNpcWorldMetrics().right,
            bottom: getNpcWorldMetrics().bottom,
        },
        player,
        playerBodyOffset: { x: playerBodyOffsetX, y: playerBodyOffsetY },
        interactionState,
        worldW: w,
        worldH: h,
        successBus: choiceSuccessBus,
    });
}
