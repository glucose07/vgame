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

    // ---- M1: Background — rose tile if loaded, else placeholder ----
    const tileSize = 120;
    if (k.getSprite("rose_field_tile") && false) {
        for (let x = 0; x < w + tileSize; x += tileSize) {
            for (let y = 0; y < h + tileSize; y += tileSize) {
                k.add([
                    k.sprite("rose_field_tile"),
                    k.pos(x, y),
                    k.anchor("topleft"),
                ]);
            }
        }
    } else {
        k.add([
            k.rect(w, h),
            k.pos(0, 0),
            k.anchor("topleft"),
            k.color(...surroundingGrassColor),
        ]);
    }

    // ---- Ambient butterflies (rows 1, 4, 5 from Butterfly.png: blue/pink/red) ----
    const hasButterflySprite = !!k.getSprite("butterfly_sheet");
    if (hasButterflySprite) {
        const butterflyAnims = ["fly-blue", "fly-pink", "fly-red"];
        const butterflyCount = 4 + Math.floor(Math.random() * 3); // 4-6
        const butterflies = [];

        for (let i = 0; i < butterflyCount; i++) {
            const anim = butterflyAnims[Math.floor(Math.random() * butterflyAnims.length)];
            const startSpeed = 34 + Math.random() * 44;
            const startAngle = Math.random() * Math.PI * 2;
            const vx = Math.cos(startAngle) * startSpeed;
            const vy = Math.sin(startAngle) * startSpeed;

            const butterfly = k.add([
                k.sprite("butterfly_sheet", { frame: 0 }),
                k.pos(
                    20 + Math.random() * Math.max(20, w - 40),
                    20 + Math.random() * Math.max(20, h - 40),
                ),
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
            });
        }

        k.onUpdate(() => {
            const butterflyHalfSize = (8 * 2.6) / 2;
            const edgePad = butterflyHalfSize + 2;
            for (const b of butterflies) {
                b.turnTimer -= k.dt();
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

                b.obj.pos.x += b.vx * k.dt();
                b.obj.pos.y += b.vy * k.dt();
                b.obj.flipX = b.vx < 0;

                // Bounce off screen edges with a bit of randomness.
                if (b.obj.pos.x < edgePad) {
                    b.obj.pos.x = edgePad;
                    b.vx = Math.abs(b.vx) * (0.9 + Math.random() * 0.2);
                } else if (b.obj.pos.x > w - edgePad) {
                    b.obj.pos.x = w - edgePad;
                    b.vx = -Math.abs(b.vx) * (0.9 + Math.random() * 0.2);
                }
                if (b.obj.pos.y < edgePad) {
                    b.obj.pos.y = edgePad;
                    b.vy = Math.abs(b.vy) * (0.9 + Math.random() * 0.2);
                } else if (b.obj.pos.y > h - edgePad) {
                    b.obj.pos.y = h - edgePad;
                    b.vy = -Math.abs(b.vy) * (0.9 + Math.random() * 0.2);
                }

                // Hard clamp as a final guard so butterflies always remain on-screen.
                b.obj.pos.x = k.clamp(b.obj.pos.x, edgePad, w - edgePad);
                b.obj.pos.y = k.clamp(b.obj.pos.y, edgePad, h - edgePad);
            }
        });
    }

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

    // ---- Flower field around path/clearing (dense, intermittent animation for performance) ----
    const flowerFieldSheets = [
        "flowers_anim_sheet",
        "flowers_anim_sheet_2",
        "flowers_anim_sheet_3",
        "flowers_anim_sheet_4",
        "flowers_anim_sheet_5",
    ].filter((name) => !!k.getSprite(name));
    if (flowerFieldSheets.length > 0) {
        const flowerEntries = [];
        const targetFlowers = Math.max(90, Math.round((w * h) / 6000));
        const maxAttempts = targetFlowers * 36;
        const pathPad = 10;
        const clearingPad = 6;
        const edgePad = 12;

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

        for (let attempt = 0; attempt < maxAttempts && flowerEntries.length < targetFlowers; attempt++) {
            const x = edgePad + Math.random() * Math.max(8, w - edgePad * 2);
            const y = edgePad + Math.random() * Math.max(8, h - edgePad * 2);
            if (isOnPath(x, y)) continue;
            if (isInClearing(x, y)) continue;

            const sheet = flowerFieldSheets[Math.floor(Math.random() * flowerFieldSheets.length)];
            const row = Math.floor(Math.random() * 10);
            const rowStart = row * 6;
            const frame = rowStart + Math.floor(Math.random() * 6);
            const anim = `sway-row-${row + 1}`;

            const flower = k.add([
                k.sprite(sheet, { frame }),
                k.pos(x, y),
                k.anchor("center"),
                k.scale(2.0 + Math.random() * 1.4),
                k.opacity(0.9),
                k.z(10),
            ]);

            flowerEntries.push({
                obj: flower,
                anim,
                rowStart,
                burst: 0,
                cooldown: 4 + Math.random() * 8,
            });
        }

        k.onUpdate(() => {
            const dt = k.dt();
            for (const f of flowerEntries) {
                if (f.burst > 0) {
                    f.burst -= dt;
                    if (f.burst <= 0) {
                        if (typeof f.obj.stop === "function") f.obj.stop();
                        f.obj.frame = f.rowStart + Math.floor(Math.random() * 6);
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
        });
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
            let visibleClouds = 0;
            for (const c of clouds) {
                c.age += k.dt();
                c.obj.pos.x += c.vx * k.dt();
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
            cloudRegenTimer -= k.dt();
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
            if (!activeGust) {
                nextGustIn -= k.dt();
                if (nextGustIn <= 0) {
                    spawnGust();
                }
                return;
            }

            activeGust.ttl -= k.dt();
            activeGust.obj.pos.x += activeGust.vx * k.dt();
            activeGust.obj.pos.y += activeGust.vy * k.dt();
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
    // ---- Sparse animated grass across grassy zones, excluding path + clearing ----
    const grassAnimSprites = ["grass_anim_1", "grass_anim_2", "grass_anim_3"]
        .filter((name) => !!k.getSprite(name));
    if (grassAnimSprites.length > 0) {
        const pathPad = 8;
        const clearingNoGrassPad = 8;
        const minDistFromChoices = 38;
        const totalGrass = Math.max(8, Math.min(20, Math.round((w * h) / 70000)));
        const maxAttempts = 900;

        const isOnPath = (x, y) =>
            x >= -pathPad &&
            x <= renderedPathLength + pathPad &&
            y >= pathStripY - pathPad &&
            y <= pathStripY + renderedPathHeight + pathPad;
        const isInClearing = (x, y) => {
            const dx = x - clearingCenterX;
            const dy = y - clearingCenterY;
            const r = clearingRadius + clearingNoGrassPad;
            return (dx * dx + dy * dy) <= (r * r);
        };

        const isNearChoice = (x, y) =>
            Math.hypot(x - choice1.pos.x, y - choice1.pos.y) < minDistFromChoices ||
            Math.hypot(x - choice2.pos.x, y - choice2.pos.y) < minDistFromChoices;

        const spawnGrassAt = (x, y) => {
            const sprite = grassAnimSprites[Math.floor(Math.random() * grassAnimSprites.length)];
            const startFrame = Math.floor(Math.random() * 8);
            const g = k.add([
                k.sprite(sprite, { frame: startFrame }),
                k.pos(x, y),
                k.anchor("center"),
                k.scale(2.25 + Math.random() * 0.7),
                k.opacity(0.76 + Math.random() * 0.18),
                k.z(35),
            ]);
            g.play("sway");
        };

        const trySpawn = () => {
            for (let attempt = 0; attempt < maxAttempts; attempt++) {
                const x = 14 + Math.random() * Math.max(4, w - 28);
                const y = 14 + Math.random() * Math.max(4, h - 28);
                if (isOnPath(x, y)) continue;
                if (isInClearing(x, y)) continue;
                if (isNearChoice(x, y)) continue;
                spawnGrassAt(x, y);
                return;
            }
        };

        for (let i = 0; i < totalGrass; i++) {
            trySpawn();
        }
    }

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
        ...(hasPlayerSprite ? [] : [k.color(200, 80, 80)]),
        "player",
    ]);

    k.onClick(() => {
        if (k.canvas && typeof k.canvas.focus === "function") k.canvas.focus();
    });

    // ---- Input: keyboard + touch-to-move (touch only, not mouse) ----
    const moveAmount = 200;
    let moveTarget = null;   // {x, y} or null — set by touch, cleared on arrival or keyboard
    const isTouchDevice = ("ontouchstart" in globalThis) || (navigator.maxTouchPoints > 0);

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
    const arrivalThreshold = 8;  // stop moving when this close to target
    k.onUpdate(() => {
        // ---- Animation switching ----
        if (hasPlayerSprite) {
            const isMoving = playerMoving || !!moveTarget;
            const animName = isMoving ? `walk-${playerDir}` : `idle-${playerDir}`;
            player.flipX = (playerDir === "left");
            if (player.curAnim() !== animName) {
                player.play(animName);
            }
            playerMoving = false;
        }

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
        const roses = [choice1, choice2];
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
            // Push along the axis with the smallest overlap
            if (overlapX < overlapY) {
                player.pos.x += (pLeft < npcLeft) ? -overlapX : overlapX;
            } else {
                player.pos.y += (pTop < npcTop) ? -overlapY : overlapY;
            }
        }
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
