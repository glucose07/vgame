/**
 * UI system: NPC question bubble + player response bubble.
 */

const BUBBLE_PROXIMITY = 160; // fallback when no interactionState is provided
const FONT = "Nunito";
const QUESTION_MESSAGE = "Will you be my valentine?";
const KISS_MESSAGE = "Stop trying to kiss me :*";
const SUCCESS_MESSAGE = "Ah, I knew you liked me ^^";
const KISS_PROXIMITY = 60;
const KISS_SPACE_MARGIN = 24;
const TOP_CHOICE_TEXT = "Yes!!";
const BOTTOM_CHOICE_TEXT = "I already said yes TT";
const TYPEWRITER_SPEED = 0.04; // seconds per character

function setUniformScale(k, entity, value) {
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
}

function setPos(entity, x, y) {
    entity.pos.x = x;
    entity.pos.y = y;
}

function lerp(current, target, speed, dt) {
    return current + (target - current) * Math.min(1, dt * speed);
}

function startTypewriter(k, textEntity, fullText, onDone) {
    textEntity.text = "";
    let charIndex = 0;
    let timer = 0;
    const tw = k.onUpdate(() => {
        timer += k.dt();
        while (timer >= TYPEWRITER_SPEED && charIndex < fullText.length) {
            timer -= TYPEWRITER_SPEED;
            charIndex++;
            textEntity.text = fullText.slice(0, charIndex);
        }
        if (charIndex >= fullText.length) {
            tw.cancel();
            if (onDone) onDone();
        }
    });
    return tw;
}

/**
 * Set up UI elements for the game scene.
 * @param {object} k - Kaplay context
 * @param {object} opts
 */
export function setupUI(k, opts) {
    const {
        clearingCenter,
        npcCenter,
        npcBodyCenter,
        npcBubbleAnchor,
        npcProximityRect,
        player,
        worldW,
        interactionState,
        successBus,
    } = opts;
    const bodyOff = opts.playerBodyOffset || { x: 32, y: 40 };
    const npcForBubble = npcBubbleAnchor || npcCenter;
    const npcForProximity = npcBodyCenter || npcCenter || npcForBubble;
    const hasRoseIconSprite = !!k.getSprite("flowers_sheet") || !!k.getSprite("flowers_anim_sheet");
    const roseIconSprite = k.getSprite("flowers_sheet") ? "flowers_sheet" : "flowers_anim_sheet";

    const fontSize = Math.round(Math.max(11, Math.min(worldW * 0.024, 16)));
    const nameSize = Math.round(Math.max(9, Math.min(worldW * 0.018, 13)));
    const popDuration = 0.24;

    // NPC bubble (single message)
    const npcBubbleW = Math.max(170, Math.min(worldW * 0.3, 220));
    const npcBubbleH = fontSize * 2.6 + 8;
    const npcTailH = 10;
    const npcBubbleX = Math.max(npcBubbleW / 2 + 8, Math.min(npcForBubble.x, worldW - npcBubbleW / 2 - 8));
    const npcIdealBubbleY = npcForBubble.y - npcTailH - npcBubbleH / 2 - 4;
    const npcBubbleY = Math.max(npcBubbleH / 2 + 8, npcIdealBubbleY);
    const npcNameText = "Duch";
    const npcNameTagW = nameSize * npcNameText.length * 0.7 + 16;
    const npcNameTagH = nameSize + 10;
    const npcNameTagX = npcBubbleX - npcBubbleW / 2 + npcNameTagW / 2 + 8;
    const npcNameTagY = npcBubbleY - npcBubbleH / 2 - npcNameTagH / 2 + 2;

    const npcBubbleBorder = k.add([
        k.rect(npcBubbleW + 4, npcBubbleH + 4, { radius: 12 }),
        k.pos(npcBubbleX, npcBubbleY),
        k.anchor("center"),
        k.color(80, 60, 80),
        k.scale(1),
        k.opacity(0),
        k.z(190),
    ]);
    const npcBubbleBody = k.add([
        k.rect(npcBubbleW, npcBubbleH, { radius: 10 }),
        k.pos(npcBubbleX, npcBubbleY),
        k.anchor("center"),
        k.color(255, 255, 255),
        k.scale(1),
        k.opacity(0),
        k.z(191),
    ]);
    const npcTailX = Math.max(
        npcBubbleX - npcBubbleW / 2 + 20,
        Math.min(npcForBubble.x, npcBubbleX + npcBubbleW / 2 - 20),
    );
    const npcTailY = npcBubbleY + npcBubbleH / 2;
    const npcBubbleTailBorder = k.add([
        k.polygon([k.vec2(-9, 0), k.vec2(9, 0), k.vec2(0, npcTailH + 3)]),
        k.pos(npcTailX, npcTailY - 1),
        k.anchor("top"),
        k.color(80, 60, 80),
        k.scale(1),
        k.opacity(0),
        k.z(189),
    ]);
    const npcBubbleTail = k.add([
        k.polygon([k.vec2(-7, 0), k.vec2(7, 0), k.vec2(0, npcTailH)]),
        k.pos(npcTailX, npcTailY),
        k.anchor("top"),
        k.color(255, 255, 255),
        k.scale(1),
        k.opacity(0),
        k.z(192),
    ]);
    const npcNameTagBg = k.add([
        k.rect(npcNameTagW, npcNameTagH, { radius: 6 }),
        k.pos(npcNameTagX, npcNameTagY),
        k.anchor("center"),
        k.color(75, 120, 210),
        k.scale(1),
        k.opacity(0),
        k.z(193),
    ]);
    const npcNameTagLabel = k.add([
        k.text(npcNameText, { size: nameSize, font: FONT }),
        k.pos(npcNameTagX, npcNameTagY),
        k.anchor("center"),
        k.color(255, 255, 255),
        k.scale(1),
        k.opacity(0),
        k.z(194),
    ]);
    const npcMessageText = k.add([
        k.text(QUESTION_MESSAGE, {
            size: fontSize,
            width: npcBubbleW - 16,
            align: "center",
            font: FONT,
        }),
        k.pos(npcBubbleX, npcBubbleY + 3),
        k.anchor("center"),
        k.color(60, 40, 60),
        k.scale(1),
        k.opacity(0),
        k.z(195),
    ]);
    const npcBubbleParts = [
        { entity: npcBubbleBorder, baseScale: 1 },
        { entity: npcBubbleBody, baseScale: 1 },
        { entity: npcBubbleTail, baseScale: 1 },
        { entity: npcBubbleTailBorder, baseScale: 1 },
        { entity: npcNameTagBg, baseScale: 1 },
        { entity: npcNameTagLabel, baseScale: 1 },
        { entity: npcMessageText, baseScale: 1 },
    ];

    // Player response bubble (follows player)
    const basePlayerBubbleW = Math.max(170, Math.min(worldW * 0.33, 220));
    const playerBubbleW = Math.max(110, Math.round(basePlayerBubbleW * 0.6));
    const playerBubbleH = fontSize * 2.8 + 8;
    const playerTailH = 9;
    const playerBubbleOffsetY = 74;
    const playerNameText = "Tati";
    const playerNameTagW = nameSize * playerNameText.length * 0.72 + 16;
    const playerNameTagH = nameSize + 10;

    const playerBubbleBorder = k.add([
        k.rect(playerBubbleW + 4, playerBubbleH + 4, { radius: 12 }),
        k.pos(0, 0),
        k.anchor("center"),
        k.color(80, 60, 80),
        k.scale(1),
        k.opacity(0),
        k.z(210),
    ]);
    const playerBubbleBody = k.add([
        k.rect(playerBubbleW, playerBubbleH, { radius: 10 }),
        k.pos(0, 0),
        k.anchor("center"),
        k.color(255, 255, 255),
        k.scale(1),
        k.opacity(0),
        k.z(211),
    ]);
    const playerBubbleTailBorder = k.add([
        k.polygon([k.vec2(-8, 0), k.vec2(8, 0), k.vec2(0, playerTailH + 3)]),
        k.pos(0, 0),
        k.anchor("top"),
        k.color(80, 60, 80),
        k.scale(1),
        k.opacity(0),
        k.z(209),
    ]);
    const playerBubbleTail = k.add([
        k.polygon([k.vec2(-6, 0), k.vec2(6, 0), k.vec2(0, playerTailH)]),
        k.pos(0, 0),
        k.anchor("top"),
        k.color(255, 255, 255),
        k.scale(1),
        k.opacity(0),
        k.z(212),
    ]);
    const playerNameTagBg = k.add([
        k.rect(playerNameTagW, playerNameTagH, { radius: 6 }),
        k.pos(0, 0),
        k.anchor("center"),
        k.color(200, 70, 100),
        k.scale(1),
        k.opacity(0),
        k.z(213),
    ]);
    const playerNameTagLabel = k.add([
        k.text(playerNameText, { size: nameSize, font: FONT }),
        k.pos(0, 0),
        k.anchor("center"),
        k.color(255, 255, 255),
        k.scale(1),
        k.opacity(0),
        k.z(214),
    ]);
    const playerResponseIcon = k.add([
        hasRoseIconSprite
            ? k.sprite(roseIconSprite, { frame: 0 })
            : k.circle(4),
        k.pos(0, 0),
        k.anchor("center"),
        ...(hasRoseIconSprite ? [k.scale(0.95)] : [k.color(230, 70, 90), k.scale(1)]),
        k.opacity(0),
        k.z(215),
    ]);
    const playerResponseText = k.add([
        k.text("", {
            size: fontSize,
            width: playerBubbleW - 38,
            align: "left",
            font: FONT,
        }),
        k.pos(0, 0),
        k.anchor("left"),
        k.color(60, 40, 60),
        k.scale(1),
        k.opacity(0),
        k.z(215),
    ]);
    const playerBubbleParts = [
        { entity: playerBubbleBorder, baseScale: 1 },
        { entity: playerBubbleBody, baseScale: 1 },
        { entity: playerBubbleTail, baseScale: 1 },
        { entity: playerBubbleTailBorder, baseScale: 1 },
        { entity: playerNameTagBg, baseScale: 1 },
        { entity: playerNameTagLabel, baseScale: 1 },
        { entity: playerResponseIcon, baseScale: hasRoseIconSprite ? 0.95 : 1 },
        { entity: playerResponseText, baseScale: 1 },
    ];

    let npcFade = 0;
    let npcScale = 0.86;
    let npcPopTimer = 0;
    let npcVisibleLast = false;
    let npcCurrentMessage = QUESTION_MESSAGE;
    let activeNpcTw = null;
    let npcSuccessTriggered = false;

    let playerFade = 0;
    let playerScale = 0.86;
    let playerPopTimer = 0;
    let playerVisibleLast = false;
    let lastClosestIdx = -1;
    let playerCurrentMessage = "";
    let activePlayerTw = null;

    if (successBus && typeof successBus.on === "function") {
        successBus.on("choiceSuccess", () => {
            npcSuccessTriggered = true;
            if (activeNpcTw) activeNpcTw.cancel();
            npcCurrentMessage = SUCCESS_MESSAGE;
            activeNpcTw = startTypewriter(k, npcMessageText, npcCurrentMessage, () => {
                activeNpcTw = null;
            });
        });
    }

    function updatePlayerBubblePosition() {
        const px = player.pos.x + bodyOff.x;
        const py = player.pos.y + bodyOff.y;
        const bubbleX = k.clamp(px + 26, playerBubbleW / 2 + 8, worldW - playerBubbleW / 2 - 8);
        const bubbleY = Math.max(playerBubbleH / 2 + 8, py - playerBubbleOffsetY);
        const tailX = k.clamp(px + 2, bubbleX - playerBubbleW / 2 + 16, bubbleX + playerBubbleW / 2 - 16);
        const tailY = bubbleY + playerBubbleH / 2;
        const nameTagX = bubbleX - playerBubbleW / 2 + playerNameTagW / 2 + 8;
        const nameTagY = bubbleY - playerBubbleH / 2 - playerNameTagH / 2 + 2;
        const iconX = bubbleX - playerBubbleW / 2 + 18;
        const lineY = bubbleY + 4;

        setPos(playerBubbleBorder, bubbleX, bubbleY);
        setPos(playerBubbleBody, bubbleX, bubbleY);
        setPos(playerBubbleTailBorder, tailX, tailY - 1);
        setPos(playerBubbleTail, tailX, tailY);
        setPos(playerNameTagBg, nameTagX, nameTagY);
        setPos(playerNameTagLabel, nameTagX, nameTagY);
        setPos(playerResponseIcon, iconX, lineY);
        setPos(playerResponseText, iconX + 13, lineY);
    }

    k.onUpdate(() => {
        let inRange = false;
        let closestIdx = -1;

        if (interactionState && typeof interactionState.inRange === "boolean") {
            inRange = interactionState.inRange;
            closestIdx = typeof interactionState.closestChoiceIndex === "number"
                ? interactionState.closestChoiceIndex
                : -1;
        } else {
            const dx = (player.pos.x + bodyOff.x) - clearingCenter.x;
            const dy = (player.pos.y + bodyOff.y) - clearingCenter.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            inRange = dist <= BUBBLE_PROXIMITY;
        }

        // NPC bubble: visible around clearing and always when player is close to NPC.
        const px = player.pos.x + bodyOff.x;
        const py = player.pos.y + bodyOff.y;
        const clearingDx = px - clearingCenter.x;
        const clearingDy = py - clearingCenter.y;
        const inClearingRange = Math.sqrt(clearingDx * clearingDx + clearingDy * clearingDy) <= BUBBLE_PROXIMITY;
        let inNpcSpace = false;
        if (npcProximityRect) {
            inNpcSpace =
                px >= npcProximityRect.left - KISS_SPACE_MARGIN &&
                px <= npcProximityRect.right + KISS_SPACE_MARGIN &&
                py >= npcProximityRect.top - KISS_SPACE_MARGIN &&
                py <= npcProximityRect.bottom + KISS_SPACE_MARGIN;
        }
        const npcDx = px - npcForProximity.x;
        const npcDy = py - npcForProximity.y;
        const npcDist = Math.sqrt(npcDx * npcDx + npcDy * npcDy);
        const isTooClose = inNpcSpace || npcDist <= KISS_PROXIMITY;
        const npcVisible = inClearingRange || isTooClose;
        const targetNpcMessage = npcSuccessTriggered
            ? SUCCESS_MESSAGE
            : (isTooClose ? KISS_MESSAGE : QUESTION_MESSAGE);
        if (targetNpcMessage !== npcCurrentMessage) {
            npcCurrentMessage = targetNpcMessage;
            if (activeNpcTw) activeNpcTw.cancel();
            activeNpcTw = startTypewriter(k, npcMessageText, npcCurrentMessage, () => {
                activeNpcTw = null;
            });
        }
        if (!npcVisible) {
            if (activeNpcTw) {
                activeNpcTw.cancel();
                activeNpcTw = null;
            }
            npcCurrentMessage = QUESTION_MESSAGE;
            npcMessageText.text = QUESTION_MESSAGE;
        }

        if (npcVisible && !npcVisibleLast) npcPopTimer = popDuration;
        npcVisibleLast = npcVisible;
        if (npcPopTimer > 0) npcPopTimer = Math.max(0, npcPopTimer - k.dt());

        npcFade = lerp(npcFade, npcVisible ? 1 : 0, 10, k.dt());
        npcScale = lerp(npcScale, npcVisible ? 1 : 0.86, 12, k.dt());
        const npcPopPhase = 1 - (npcPopTimer / popDuration);
        const npcPopBoost = npcPopTimer > 0 ? Math.sin(npcPopPhase * Math.PI) * 0.11 : 0;
        const npcFinalScale = npcScale + npcPopBoost;
        for (const part of npcBubbleParts) {
            part.entity.opacity = npcFade;
            setUniformScale(k, part.entity, part.baseScale * npcFinalScale);
        }

        // Player bubble: follow player and switch by nearest flower.
        const playerVisible = inRange && closestIdx >= 0;
        const playerJustBecameVisible = playerVisible && !playerVisibleLast;
        const playerChoiceChanged = closestIdx !== lastClosestIdx;
        if (playerVisible && (playerJustBecameVisible || playerChoiceChanged)) {
            playerPopTimer = popDuration;
        }
        let targetPlayerMessage = "";
        if (closestIdx === 0) {
            targetPlayerMessage = TOP_CHOICE_TEXT;
            if (hasRoseIconSprite) playerResponseIcon.frame = 0;
        } else if (closestIdx === 1) {
            targetPlayerMessage = BOTTOM_CHOICE_TEXT;
            if (hasRoseIconSprite) playerResponseIcon.frame = 24;
        }
        if (playerVisible) {
            if (playerJustBecameVisible || targetPlayerMessage !== playerCurrentMessage) {
                playerCurrentMessage = targetPlayerMessage;
                if (activePlayerTw) activePlayerTw.cancel();
                activePlayerTw = startTypewriter(k, playerResponseText, playerCurrentMessage, () => {
                    activePlayerTw = null;
                });
            }
        } else {
            if (activePlayerTw) {
                activePlayerTw.cancel();
                activePlayerTw = null;
            }
            playerCurrentMessage = "";
            playerResponseText.text = "";
        }
        playerVisibleLast = playerVisible;
        lastClosestIdx = closestIdx;

        updatePlayerBubblePosition();
        if (playerPopTimer > 0) playerPopTimer = Math.max(0, playerPopTimer - k.dt());
        playerFade = lerp(playerFade, playerVisible ? 1 : 0, 10, k.dt());
        playerScale = lerp(playerScale, playerVisible ? 1 : 0.86, 12, k.dt());
        const playerPopPhase = 1 - (playerPopTimer / popDuration);
        const playerPopBoost = playerPopTimer > 0 ? Math.sin(playerPopPhase * Math.PI) * 0.11 : 0;
        const playerFinalScale = playerScale + playerPopBoost;
        for (const part of playerBubbleParts) {
            part.entity.opacity = playerFade;
            setUniformScale(k, part.entity, part.baseScale * playerFinalScale);
        }
    });
}
