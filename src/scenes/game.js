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
    const npcSize = 32;
    const npcX = clearingCenterX + 60;
    const npcY = clearingCenterY - npcSize / 2;
    const npc = k.add([
        k.rect(npcSize, npcSize),
        k.pos(npcX, npcY),
        k.anchor("topleft"),
        k.color(100, 90, 140),
    ]);

    // ---- M2: Player — sprite if loaded, else rect; onKeyDown move; spawn at path start ----
    // const hasPlayerSprite = k.getSprite("player_sheet");
    const hasPlayerSprite = false;
    const player = k.add([
        hasPlayerSprite ? k.sprite("player_sheet") : k.rect(32, 32),
        k.pos(40, h / 2 - 16),
        k.area(),
        ...(hasPlayerSprite ? [] : [k.color(200, 80, 80)]),
        "player",
    ]);

    k.onClick(() => {
        if (k.canvas && typeof k.canvas.focus === "function") k.canvas.focus();
    });

    // ---- Input: keyboard + touch/click-to-move ----
    const moveAmount = 200;
    let moveTarget = null;   // {x, y} or null — set by click/touch, cleared on arrival or keyboard

    // Click/touch sets a movement target (works on both desktop and mobile)
    k.onClick(() => {
        const mp = k.mousePos();
        if (mp) moveTarget = { x: mp.x, y: mp.y };
    });

    // Keyboard movement — also cancels any active touch target
    const clearMoveTarget = () => { moveTarget = null; };
    k.onKeyDown("left",  () => { clearMoveTarget(); player.move(-moveAmount, 0); });
    k.onKeyDown("right", () => { clearMoveTarget(); player.move(moveAmount, 0); });
    k.onKeyDown("up",    () => { clearMoveTarget(); player.move(0, -moveAmount); });
    k.onKeyDown("down",  () => { clearMoveTarget(); player.move(0, moveAmount); });
    k.onKeyDown("a",     () => { clearMoveTarget(); player.move(-moveAmount, 0); });
    k.onKeyDown("d",     () => { clearMoveTarget(); player.move(moveAmount, 0); });
    k.onKeyDown("w",     () => { clearMoveTarget(); player.move(0, -moveAmount); });
    k.onKeyDown("s",     () => { clearMoveTarget(); player.move(0, moveAmount); });

    // Clamp to world bounds + click-to-move towards target
    const playerW = 32;
    const playerH = 32;
    const arrivalThreshold = 8;  // stop moving when this close to target
    k.onUpdate(() => {
        // Move toward click/touch target
        if (moveTarget) {
            const cx = player.pos.x + playerW / 2;
            const cy = player.pos.y + playerH / 2;
            const dx = moveTarget.x - cx;
            const dy = moveTarget.y - cy;
            const dist = Math.hypot(dx, dy);
            if (dist < arrivalThreshold) {
                moveTarget = null;
            } else {
                player.move((dx / dist) * moveAmount, (dy / dist) * moveAmount);
            }
        }
        // Clamp
        player.pos.x = k.clamp(player.pos.x, 0, w - playerW);
        player.pos.y = k.clamp(player.pos.y, 0, h - playerH);
    });

    // ---- M4: Proximity prompt + one-time interact (choiceController) ----
    const choiceSuccessBus = k.add([]);
    setupChoiceInteraction(k, {
        player,
        choices: [choice1, choice2],
        labels: ["Yes", "You already said yes"],
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
        choiceLabels: [choiceLabel1, choiceLabel2],
        worldW: w,
        worldH: h,
        successBus: choiceSuccessBus,
    });
}
