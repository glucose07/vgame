/**
 * Choice controller (M4): proximity prompt and one-time interact.
 * Shows an E-key indicator when player is near any choice; on E or tap triggers success once and locks.
 * Supports both keyboard (E) and touch/click on choices for mobile play.
 *
 * @returns {{ isTapOnVisibleChoice: (pos: {x:number,y:number}) => boolean }}
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
 * @param {(inRange: boolean) => void} [opts.onRangeChange] - Proximity state callback
 * @param {(inRange: boolean, pulseTime: number, successFired: boolean, closestIdx: number) => void} [opts.onRangeTick]
 *        Called every frame to drive external visual feedback (e.g., rose pulse/glow).
 * @param {(choiceIndex: number) => void} opts.onSuccess - Called once when player interacts; then interactions disabled
 */
export function setupChoiceInteraction(k, opts) {
    const player = opts.player;
    const bodyOff = opts.playerBodyOffset || { x: 32, y: 40 };
    const choices = opts.choices;
    const labels = opts.labels;
    const proximityRadius = opts.proximityRadius ?? DEFAULT_PROXIMITY_RADIUS;
    const tapRadius = opts.tapRadius ?? DEFAULT_TAP_RADIUS;
    const onRangeChange = opts.onRangeChange;
    const onRangeTick = opts.onRangeTick;
    const onSuccess = opts.onSuccess;

    let successFired = false;
    let lastInRange = false;
    let pulseTime = 0;
    let promptFade = 0;

    // Detect touch-capable device for tap support.
    const isTouchDevice = ("ontouchstart" in globalThis) || (navigator.maxTouchPoints > 0);
    // E-key prompt body.
    const promptKeyShadow = k.add([
        k.rect(20, 20, { radius: 5 }),
        k.pos(0, 0),
        k.anchor("center"),
        k.color(40, 30, 30),
        k.opacity(0),
        k.z(225),
        "choicePrompt",
    ]);
    const promptKeyBody = k.add([
        k.rect(18, 18, { radius: 4 }),
        k.pos(0, 0),
        k.anchor("center"),
        k.color(255, 255, 255),
        k.opacity(0),
        k.z(226),
        "choicePrompt",
    ]);
    const promptKeyLabel = k.add([
        k.text("E", { size: 12, font: "Nunito" }),
        k.pos(0, 0),
        k.anchor("center"),
        k.color(60, 40, 50),
        k.opacity(0),
        k.z(227),
        "choicePrompt",
    ]);

    const promptParts = [promptKeyShadow, promptKeyBody, promptKeyLabel];

    /** Distance from player body center to an entity's pos. */
    function playerDistTo(entity) {
        return Math.hypot(
            (player.pos.x + bodyOff.x) - entity.pos.x,
            (player.pos.y + bodyOff.y) - entity.pos.y,
        );
    }

    function getMinDistanceToChoices() {
        if (!choices.length) return Infinity;
        let min = Infinity;
        for (const choice of choices) {
            const d = playerDistTo(choice);
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
            const d = playerDistTo(choices[i]);
            if (d < minD && d <= proximityRadius) {
                minD = d;
                idx = i;
            }
        }
        return idx;
    }

    /**
     * Check if a screen position hits a choice while player is in range.
     * Returns the index of the tapped choice, or -1 if none.
     */
    function getTappedVisibleChoiceIndex(pos) {
        if (getMinDistanceToChoices() > proximityRadius) return -1;
        for (let i = 0; i < choices.length; i++) {
            const d = Math.hypot(pos.x - choices[i].pos.x, pos.y - choices[i].pos.y);
            if (d <= tapRadius) return i;
        }
        return -1;
    }

    /** Fire success for the given choice index (shared by keyboard and tap). */
    function fireSuccess(closestIdx) {
        successFired = true;
        if (onRangeChange && lastInRange) onRangeChange(false);
        const label = labels && labels[closestIdx] != null ? labels[closestIdx] : `choice ${closestIdx}`;
        console.log("[Choice] Selected:", label, "(index", closestIdx + "); success fired, interactions locked.");
        onSuccess(closestIdx);
    }

    k.onUpdate(() => {
        pulseTime += k.dt();

        if (successFired) {
            promptFade = 0;
            for (const part of promptParts) part.opacity = 0;
            if (onRangeTick) onRangeTick(false, pulseTime, true, -1);
            return;
        }

        const closestIdx = getClosestChoiceIndex();
        const inRange = closestIdx >= 0;
        if (inRange !== lastInRange) {
            lastInRange = inRange;
            if (onRangeChange) onRangeChange(inRange);
        }

        const fadeTarget = inRange ? 1 : 0;
        promptFade += (fadeTarget - promptFade) * Math.min(1, k.dt() * 12);
        const px = player.pos.x + bodyOff.x;
        const py = player.pos.y + bodyOff.y + 30;
        promptKeyShadow.pos.x = px;
        promptKeyShadow.pos.y = py + 1;
        promptKeyBody.pos.x = px;
        promptKeyBody.pos.y = py;
        promptKeyLabel.pos.x = px;
        promptKeyLabel.pos.y = py + 0.5;

        promptKeyShadow.opacity = promptFade * 0.5;
        promptKeyBody.opacity = promptFade;
        promptKeyLabel.opacity = promptFade;

        if (onRangeTick) onRangeTick(inRange, pulseTime, false, closestIdx);
    });

    // Keyboard interaction (E key) - requires player proximity
    k.onKeyPress("e", () => {
        if (successFired) return;
        const closestIdx = getClosestChoiceIndex();
        if (closestIdx < 0) return;
        fireSuccess(closestIdx);
    });

    // Touch-only interaction - tap directly on a rose while in interaction range (mobile only)
    if (isTouchDevice) {
        k.onClick(() => {
            if (successFired) return;
            const mp = k.mousePos();
            if (!mp) return;
            const tappedIdx = getTappedVisibleChoiceIndex(mp);
            if (tappedIdx < 0) return;
            fireSuccess(tappedIdx);
        });
    }

    // Expose helper so game.js can prevent click-to-move when tapping a visible rose
    return {
        isTapOnVisibleChoice(pos) {
            if (successFired) return false;
            return getTappedVisibleChoiceIndex(pos) >= 0;
        },
    };
}
