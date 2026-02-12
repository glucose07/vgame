/**
 * UI system (M6): Speech bubble from NPC ("Duch") + typewriter effect.
 * Placeholder Mode A — primitives only; responsive sizing for phone & desktop.
 */

const BUBBLE_PROXIMITY = 160; // player must be this close to clearing center
const KISS_PROXIMITY = 60;    // player this close to NPC triggers the kiss message
const FONT = "Nunito";        // loaded in main.js from public/fonts/
const QUESTION_MESSAGE = "Will you be my valentine?";
const SUCCESS_MESSAGE = "Ah, knew you'd say yes <3";
const KISS_MESSAGE = "Stop trying to kiss me :*";
const TYPEWRITER_SPEED = 0.045; // seconds per character

/**
 * Run a typewriter effect on a text entity.
 * @param {object} k - Kaplay context
 * @param {object} textEntity - Entity with .text property
 * @param {string} fullText - The full string to type out
 * @param {() => void} [onDone] - Called when typing finishes
 * @returns {{ cancel: () => void }} - Controller to cancel the effect
 */
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
    const { clearingCenter, clearingRadius, npcCenter, player, choiceLabels, worldW, worldH, successBus } = opts;

    // ---- Responsive sizing ----
    const fontSize = Math.round(Math.max(10, Math.min(worldW * 0.024, 16)));
    const nameSize = Math.round(Math.max(9, Math.min(worldW * 0.018, 13)));

    // ---- Speech bubble dimensions (tight fit around text) ----
    const bubblePadX = 6;
    const bubblePadY = 2;
    const bubbleW = Math.max(110, Math.min(worldW * 0.22, 140));
    const bubbleH = fontSize * 2.2 + bubblePadY * 2;
    const tailH = 10;

    // Position bubble directly above NPC (roses are now to the left, so no overlap)
    const bubbleX = Math.max(bubbleW / 2 + 8, Math.min(npcCenter.x, worldW - bubbleW / 2 - 8));
    const idealBubbleY = npcCenter.y - tailH - bubbleH / 2 - 4;
    const bubbleY = Math.max(bubbleH / 2 + 8, idealBubbleY);

    // ---- Name tag dimensions ----
    const nameText = "Duch";
    const nameTagW = nameSize * nameText.length * 0.7 + 16;
    const nameTagH = nameSize + 10;
    const nameTagX = bubbleX - bubbleW / 2 + nameTagW / 2 + 6;
    const nameTagY = bubbleY - bubbleH / 2 - nameTagH / 2 + 2;

    // ---- Build speech bubble (all parts start hidden) ----

    const bubbleBorder = k.add([
        k.rect(bubbleW + 4, bubbleH + 4, { radius: 12 }),
        k.pos(bubbleX, bubbleY),
        k.anchor("center"),
        k.color(80, 60, 80),
        k.opacity(0),
        k.z(190),
        "speechBubbleBorder",
    ]);

    const bubbleBody = k.add([
        k.rect(bubbleW, bubbleH, { radius: 10 }),
        k.pos(bubbleX, bubbleY),
        k.anchor("center"),
        k.color(255, 255, 255),
        k.opacity(0),
        k.z(191),
        "speechBubbleBody",
    ]);

    const tailX = Math.max(bubbleX - bubbleW / 2 + 20, Math.min(npcCenter.x, bubbleX + bubbleW / 2 - 20));
    const tailY = bubbleY + bubbleH / 2;
    const bubbleTailBorder = k.add([
        k.polygon([k.vec2(-9, 0), k.vec2(9, 0), k.vec2(0, tailH + 3)]),
        k.pos(tailX, tailY - 1),
        k.anchor("top"),
        k.color(80, 60, 80),
        k.opacity(0),
        k.z(189),
        "speechTailBorder",
    ]);
    const bubbleTail = k.add([
        k.polygon([k.vec2(-7, 0), k.vec2(7, 0), k.vec2(0, tailH)]),
        k.pos(tailX, tailY),
        k.anchor("top"),
        k.color(255, 255, 255),
        k.opacity(0),
        k.z(192),
        "speechTail",
    ]);

    const nameTagBg = k.add([
        k.rect(nameTagW, nameTagH, { radius: 6 }),
        k.pos(nameTagX, nameTagY),
        k.anchor("center"),
        k.color(200, 70, 100),
        k.opacity(0),
        k.z(193),
        "nameTagBg",
    ]);

    const nameTagLabel = k.add([
        k.text(nameText, { size: nameSize, font: FONT }),
        k.pos(nameTagX, nameTagY),
        k.anchor("center"),
        k.color(255, 255, 255),
        k.opacity(0),
        k.z(194),
        "nameTagLabel",
    ]);

    // Message text inside bubble (starts empty for typewriter)
    const msgText = k.add([
        k.text("", {
            size: fontSize,
            width: bubbleW - bubblePadX * 2,
            align: "center",
            font: FONT,
        }),
        k.pos(bubbleX, bubbleY + 4),
        k.anchor("center"),
        k.color(60, 40, 60),
        k.opacity(0),
        k.z(195),
        "speechMessage",
    ]);

    // All proximity-faded parts
    const bubbleParts = [bubbleBorder, bubbleBody, bubbleTail, bubbleTailBorder, nameTagBg, nameTagLabel, msgText];
    const allProximityParts = [...bubbleParts, ...(choiceLabels || [])];

    // ---- State machine ----
    // "idle" -> "typing_question" (on first proximity) -> "waiting" -> "typing_success" (on choice) -> "done"
    let state = "idle";
    let bubbleFade = 0;
    let successTriggered = false;
    let tooClose = false;       // tracks whether player is in kiss range
    let activeKissTw = null;    // active typewriter for kiss/restore transitions
    const fadeDur = 0.35;

    k.onUpdate(() => {
        // After success, lock bubble fully visible
        if (successTriggered) {
            for (const part of bubbleParts) {
                part.opacity = 1;
            }
            return;
        }

        const dx = player.pos.x - clearingCenter.x;
        const dy = player.pos.y - clearingCenter.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const inRange = dist <= BUBBLE_PROXIMITY;

        // First time entering proximity: start typing the question
        if (inRange && state === "idle") {
            state = "typing_question";
            startTypewriter(k, msgText, QUESTION_MESSAGE, () => {
                state = "waiting";
            });
        }

        // Fade in / out
        if (inRange && bubbleFade < 1) {
            bubbleFade = Math.min(1, bubbleFade + k.dt() / fadeDur);
        } else if (!inRange && bubbleFade > 0) {
            bubbleFade = Math.max(0, bubbleFade - k.dt() / fadeDur);
        }

        for (const part of allProximityParts) {
            part.opacity = bubbleFade;
        }

        // Typewriter swap when player is right next to the NPC
        if (state === "waiting" || state === "done") {
            const npcDx = (player.pos.x + 16) - npcCenter.x;
            const npcDy = (player.pos.y + 16) - npcCenter.y;
            const npcDist = Math.sqrt(npcDx * npcDx + npcDy * npcDy);
            const isClose = npcDist <= KISS_PROXIMITY;
            if (isClose && !tooClose) {
                // Just entered kiss range — typewriter the kiss message
                tooClose = true;
                if (activeKissTw) activeKissTw.cancel();
                activeKissTw = startTypewriter(k, msgText, KISS_MESSAGE);
            } else if (!isClose && tooClose) {
                // Just left kiss range — typewriter back to the normal message
                tooClose = false;
                if (activeKissTw) activeKissTw.cancel();
                const restoreMsg = state === "waiting" ? QUESTION_MESSAGE : SUCCESS_MESSAGE;
                activeKissTw = startTypewriter(k, msgText, restoreMsg);
            }
        }
    });

    // ---- On success: typewriter the smug message ----
    successBus.on("choiceSuccess", () => {
        successTriggered = true;
        tooClose = false;
        if (activeKissTw) { activeKissTw.cancel(); activeKissTw = null; }
        state = "typing_success";

        startTypewriter(k, msgText, SUCCESS_MESSAGE, () => {
            state = "done";
        });
    });
}
