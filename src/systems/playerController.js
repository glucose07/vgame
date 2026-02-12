/**
 * Player controller (M2): movement constants and direction-indicator draw helper.
 * Placeholder Mode A: direction triangle. Input and movement loop live in game scene.
 */

export const SPEED = 140;
const DIR_OFFSET = 14;
const TRI_SIZE = 6;

/**
 * Draws the placeholder direction indicator (triangle) for the player.
 * Uses player.pos, player.facing, player.isMoving (set by game scene).
 * @param {object} k - Kaplay context
 * @param {object} player - Player entity with pos, facing, isMoving
 */
export function drawPlayerDirectionIndicator(k, player) {
    if (!player?.pos) return;
    const pos = player.pos;
    let cx = pos.x;
    let cy = pos.y;
    if (player.facing === "up") cy -= DIR_OFFSET;
    else if (player.facing === "down") cy += DIR_OFFSET;
    else if (player.facing === "left") cx -= DIR_OFFSET;
    else cx += DIR_OFFSET;

    let p1, p2, p3;
    if (player.facing === "up") {
        p1 = k.vec2(cx, cy - TRI_SIZE);
        p2 = k.vec2(cx - TRI_SIZE, cy + TRI_SIZE);
        p3 = k.vec2(cx + TRI_SIZE, cy + TRI_SIZE);
    } else if (player.facing === "down") {
        p1 = k.vec2(cx, cy + TRI_SIZE);
        p2 = k.vec2(cx - TRI_SIZE, cy - TRI_SIZE);
        p3 = k.vec2(cx + TRI_SIZE, cy - TRI_SIZE);
    } else if (player.facing === "left") {
        p1 = k.vec2(cx - TRI_SIZE, cy);
        p2 = k.vec2(cx + TRI_SIZE, cy - TRI_SIZE);
        p3 = k.vec2(cx + TRI_SIZE, cy + TRI_SIZE);
    } else {
        p1 = k.vec2(cx + TRI_SIZE, cy);
        p2 = k.vec2(cx - TRI_SIZE, cy - TRI_SIZE);
        p3 = k.vec2(cx - TRI_SIZE, cy + TRI_SIZE);
    }
    k.drawTriangle({
        p1,
        p2,
        p3,
        color: player.isMoving ? k.rgb(255, 255, 200) : k.rgb(220, 220, 180),
    });
}
