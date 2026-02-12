/**
 * Game scene (placeholder). Scene wiring for M0.
 * M1: World bounds from viewport, placeholder background fill. Bounds enforced by clamp (no physics walls).
 * M2: Player — minimal: rect + arrow/WASD movement only (animations/sprites later).
 */

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
    console.log(w, h);

    // ---- M1: Background — rose tile if loaded, else placeholder ----
    const tileSize = 120;
    if (k.getSprite("rose_field_tile")) {
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
        // k.add([
        //     k.rect(w, h),
        //     k.pos(0, 0),
        //     k.anchor("topleft"),
        //     k.color(80, 120, 60),
        // ]);

        // k.add([
        //     k.sprite("unnamed_tile", {
        //         width:  w,   // rectangle width in pixels
        //         height: h,   // rectangle height in pixels
        //     }),
        //     k.pos(0, 0),
        //     // k.anchor("topleft"),
        // ]);

        // for (let x = 0; x < w + tileSize; x += tileSize) {
        //     for (let y = 0; y < h + tileSize; y += tileSize) {
        //         k.add([
        //             k.circle(4),
        //             k.pos(x + tileSize / 2, y + tileSize / 2),
        //             k.color(100, 140, 80),
        //         ]);
        //     }
        // }
    }

    // ---- Path strip (if path_tile loaded) ----
    // if (k.getSprite("path_tile")) {
    //     const pathW = w;
    //     const pathH = tileSize * 2;
    //     for (let x = 0; x < pathW + tileSize; x += tileSize) {
    //         for (let py = 0; py < pathH; py += tileSize) {
    //             k.add([
    //                 k.sprite("path_tile"),
    //                 k.pos(x, h / 2 - pathH / 2 + py),
    //                 k.anchor("topleft"),
    //             ]);
    //         }
    //     }
    // }

    // ---- M2: Player — sprite if loaded, else rect; onKeyDown move ----
    // const hasPlayerSprite = k.getSprite("player_sheet");
    const hasPlayerSprite = false;
    const player = k.add([
        hasPlayerSprite ? k.sprite("player_sheet") : k.rect(32, 32),
        k.pos(k.center().x, k.center().y),
        k.area(),
        ...(hasPlayerSprite ? [] : [k.color(200, 80, 80)]),
        "player",
    ]);

    k.onClick(() => {
        if (k.canvas && typeof k.canvas.focus === "function") k.canvas.focus();
    });

    // move(dx, dy) is per frame; onKeyDown runs every frame while key held
    const moveAmount = 200;
    k.onKeyDown("left", () => { player.move(-moveAmount, 0); });
    k.onKeyDown("right", () => { player.move(moveAmount, 0); });
    k.onKeyDown("up", () => { player.move(0, -moveAmount); });
    k.onKeyDown("down", () => { player.move(0, moveAmount); });
    k.onKeyDown("a", () => { player.move(-moveAmount, 0); });
    k.onKeyDown("d", () => { player.move(moveAmount, 0); });
    k.onKeyDown("w", () => { player.move(0, -moveAmount); });
    k.onKeyDown("s", () => { player.move(0, moveAmount); });

    // Clamp to world bounds (no physics walls needed while player uses pos().move())
    const playerW = 32;
    const playerH = 32;
    k.onUpdate(() => {
        player.pos.x = k.clamp(player.pos.x, 0, w - playerW);
        player.pos.y = k.clamp(player.pos.y, 0, h - playerH);
    });
}
