/**
 * Choice controller (M4): proximity prompt and one-time interact.
 * Shows "Press E" / "Tap" when player is near any choice; on E or tap triggers success once and locks.
 * Supports both keyboard (E) and touch/click on choices for mobile play.
 */

const DEFAULT_PROXIMITY_RADIUS = 80;
const DEFAULT_TAP_RADIUS = 60; // how close a tap must be to a choice center to count

/**
 * @param {object} k - Kaplay context
 * @param {object} opts
 * @param {object} opts.player - Player entity with pos (vec2)
 * @param {object[]} opts.choices - Array of choice entities with pos (vec2)
 * @param {string[]} [opts.labels] - Optional labels for each choice (for logging)
 * @param {number} [opts.proximityRadius] - Distance at which prompt appears
 * @param {() => void} opts.onSuccess - Called once when player interacts; then interactions disabled
 */
export function setupChoiceInteraction(k, opts) {
    const player = opts.player;
    const choices = opts.choices;
    const labels = opts.labels;
    const proximityRadius = opts.proximityRadius ?? DEFAULT_PROXIMITY_RADIUS;
    const tapRadius = opts.tapRadius ?? DEFAULT_TAP_RADIUS;
    const onSuccess = opts.onSuccess;

    let successFired = false;

    // Detect touch-capable device for prompt text
    const isTouchDevice = ("ontouchstart" in globalThis) || (navigator.maxTouchPoints > 0);
    const promptText = isTouchDevice ? "Tap" : "(E) Interact";

    const prompt = k.add([
        k.text(promptText, { size: 16, font: "Nunito" }),
        k.pos(0, 0),
        k.anchor("center"),
        k.color(255, 255, 255),
        k.opacity(0),
        "choicePrompt",
    ]);

    function dist(a, b) {
        return Math.hypot(a.pos.x - b.pos.x, a.pos.y - b.pos.y);
    }

    function getMinDistanceToChoices() {
        if (!choices.length) return Infinity;
        let min = Infinity;
        for (const choice of choices) {
            const d = dist(player, choice);
            if (d < min) min = d;
        }
        return min;
    }

    /** Returns index of the choice closest to the player, or -1 if none in range. */
    function getClosestChoiceIndex() {
        if (!choices.length) return -1;
        let minD = Infinity;
        let idx = -1;
        for (let i = 0; i < choices.length; i++) {
            const d = dist(player, choices[i]);
            if (d < minD && d <= proximityRadius) {
                minD = d;
                idx = i;
            }
        }
        return idx;
    }

    /** Fire success for the given choice index (shared by keyboard and tap). */
    function fireSuccess(closestIdx) {
        successFired = true;
        const label = labels && labels[closestIdx] != null ? labels[closestIdx] : `choice ${closestIdx}`;
        console.log("[Choice] Selected:", label, "(index", closestIdx + "); success fired, interactions locked.");
        onSuccess();
    }

    k.onUpdate(() => {
        if (successFired) {
            prompt.opacity = 0;
            return;
        }
        const d = getMinDistanceToChoices();
        if (d <= proximityRadius) {
            prompt.opacity = 1;
            prompt.pos.x = player.pos.x + 16;   // center of 32px-wide player
            prompt.pos.y = player.pos.y + 32 + 12; // below the player with a small gap
        } else {
            prompt.opacity = 0;
        }
    });

    // Keyboard interaction (E key)
    k.onKeyPress("e", () => {
        if (successFired) return;
        const closestIdx = getClosestChoiceIndex();
        if (closestIdx < 0) return;
        fireSuccess(closestIdx);
    });

    // Touch / click interaction — tap on a choice while player is in proximity
    k.onClick(() => {
        if (successFired) return;
        const closestIdx = getClosestChoiceIndex();
        if (closestIdx < 0) return;          // player not near any choice
        const mp = k.mousePos();
        if (!mp) return;
        const choice = choices[closestIdx];
        const tapDist = Math.hypot(mp.x - choice.pos.x, mp.y - choice.pos.y);
        if (tapDist <= tapRadius) {
            fireSuccess(closestIdx);
        }
    });
}
