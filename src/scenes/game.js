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
            k.color(80, 120, 60),
        ]);

        for (let x = 0; x < w + tileSize; x += tileSize) {
            for (let y = 0; y < h + tileSize; y += tileSize) {
                k.add([
                    k.circle(4),
                    k.pos(x + tileSize / 2, y + tileSize / 2),
                    k.color(100, 140, 80),
                ]);
            }
        }
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
    k.add([
        k.rect(pathStripLength, pathStripHeight),
        k.pos(0, pathStripY),
        k.anchor("topleft"),
        k.color(110, 155, 85),
    ]);

    // ---- M3: Clearing circle at end of path ----
    k.add([
        k.circle(clearingRadius),
        k.pos(clearingCenterX, clearingCenterY),
        k.color(110, 155, 85),
    ]);

    // ---- M4: Two choice objects (red circles + labels), vertically stacked ----
    // Roses sit to the LEFT of the NPC so the speech bubble above NPC has clear space
    const choiceRadius = 26;
    const rosesCenterX = clearingCenterX - 30;
    const rose1Y = clearingCenterY - 60;
    const rose2Y = clearingCenterY + 60;
    const choice1 = k.add([
        k.circle(choiceRadius),
        k.pos(rosesCenterX, rose1Y),
        k.color(200, 50, 50),
        "choice",
    ]);
    const choiceLabel1 = k.add([
        k.text("Yes", { size: 14, font: "Nunito" }),
        k.pos(rosesCenterX, rose1Y),
        k.anchor("center"),
        k.color(255, 255, 255),
        k.opacity(0),
    ]);
    const choice2 = k.add([
        k.circle(choiceRadius),
        k.pos(rosesCenterX, rose2Y),
        k.color(200, 50, 50),
        "choice",
    ]);
    const choiceLabel2 = k.add([
        k.text("You already said yes", { size: 12, font: "Nunito" }),
        k.pos(rosesCenterX, rose2Y),
        k.anchor("center"),
        k.color(255, 255, 255),
        k.opacity(0),
    ]);

    // ---- M4: NPC placeholder — to the right of clearing center, speech bubble above ----
    const npcSize = 192;
    const npcX = clearingCenterX + 60;
    const npcY = clearingCenterY - npcSize / 2;
    const hasNpcSprite = !!k.getSprite("npc_sheet");
    const npc = k.add([
        hasNpcSprite ? k.sprite("npc_sheet", { frame: 8 }) : k.rect(npcSize, npcSize),
        k.pos(npcX, npcY),
        ...(hasNpcSprite
            ? [k.scale(-3, 3), k.anchor("topright")]
            : [k.anchor("topleft"), k.color(100, 90, 140)]),
    ]);
    if (hasNpcSprite) {
        npc.play("idle-left");
    }

    // ---- M2: Player — sprite if loaded, else rect; onKeyDown move; spawn at path start ----
    const hasPlayerSprite = !!k.getSprite("player_sheet");
    const player = k.add([
        hasPlayerSprite ? k.sprite("player_sheet", { frame: 0 }) : k.rect(64, 64),
        k.pos(40, h / 2 - 32),
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
    const playerW = 64;
    const playerH = 64;
    // Approximate center of the visible character body within the 64×64 sprite frame
    const playerBodyOffsetX = 32;  // horizontally centered in frame
    const playerBodyOffsetY = 40;  // character's feet are near the bottom, center is lower
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
        // Clamp to world bounds
        player.pos.x = k.clamp(player.pos.x, 0, w - playerW);
        player.pos.y = k.clamp(player.pos.y, 0, h - playerH);

        // Push player out of rose circles (solid borders)
        // Use a smaller collision radius for the player body (not the full sprite frame)
        const roses = [choice1, choice2];
        const pcx = player.pos.x + playerBodyOffsetX;
        const pcy = player.pos.y + playerBodyOffsetY;
        const playerR = 16;
        const collisionR = choiceRadius + playerR;
        for (const rose of roses) {
            const dx = pcx - rose.pos.x;
            const dy = pcy - rose.pos.y;
            const dist = Math.hypot(dx, dy);
            if (dist < collisionR && dist > 0) {
                const push = collisionR - dist;
                player.pos.x += (dx / dist) * push;
                player.pos.y += (dy / dist) * push;
            }
        }

        // Push player out of NPC rect (solid border)
        // Use a smaller collision box centered within the visual sprite frame
        const npcCollisionW = 45;
        const npcCollisionH = 45;
        const npcLeft = npc.pos.x + (npcSize - npcCollisionW) / 2;
        const npcTop = npc.pos.y + (npcSize - npcCollisionH) / 2;
        const npcRight = npcLeft + npcCollisionW;
        const npcBottom = npcTop + npcCollisionH;
        const playerBodyW = 24;
        const playerBodyH = 32;
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
    const choiceSuccessBus = k.add([]);
    const choiceController = setupChoiceInteraction(k, {
        player,
        playerBodyOffset: { x: playerBodyOffsetX, y: playerBodyOffsetY },
        choices: [choice1, choice2],
        labels: ["Yes", "You already said yes"],
        choiceLabels: [choiceLabel1, choiceLabel2],
        onSuccess: () => choiceSuccessBus.trigger("choiceSuccess"),
    });

    // ---- M5: Petal effects (ambient + burst on success) ----
    setupPetalEffects(k, {
        clearingCenter: { x: clearingCenterX, y: clearingCenterY },
        worldW: w,
        worldH: h,
        successBus: choiceSuccessBus,
    });

    // ---- M6: UI text — speech bubble from NPC + success message ----
    setupUI(k, {
        clearingCenter: { x: clearingCenterX, y: clearingCenterY },
        clearingRadius,
        npcCenter: { x: npcX + npcSize / 2, y: npcY },
        player,
        playerBodyOffset: { x: playerBodyOffsetX, y: playerBodyOffsetY },
        choiceLabels: [choiceLabel1, choiceLabel2],
        worldW: w,
        worldH: h,
        successBus: choiceSuccessBus,
    });
}
