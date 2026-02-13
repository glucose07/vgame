/**
 * Boot scene: loading indicator, optional asset loading, then transition to Game.
 * Must work with zero assets (Placeholder Mode A).
 */
export default function bootScene(k) {
    // Simple loading indicator (placeholder)
    k.add([
        k.text("Loading...", { size: 24, font: "Nunito" }),
        k.anchor("center"),
        k.pos(k.center()),
    ]);

    const buildFlowerRowAnims = (speed = 3) => {
        const anims = {};
        for (let row = 0; row < 10; row++) {
            const from = row * 6;
            anims[`sway-row-${row + 1}`] = { from, to: from + 5, speed, loop: true };
        }
        return anims;
    };

    // Optional: try to load manifest assets if present; never block on missing files.
    // With Vite, put assets in public/ so they're served (e.g. public/assets/tiles/...).
    const optionalAssets = [
        ["player_sheet", "assets/characters/player_sheet.png", {
            sliceX: 8,
            sliceY: 14,
            anims: {
                "idle-down":   { from: 0, to: 0 },
                "idle-right":  { from: 8, to: 8 },
                "idle-left":   { from: 8, to: 8 },
                "idle-up":     { from: 16, to: 16 },
                // Use dedicated movement rows for fuller walk cycles.
                "walk-down":   { from: 24, to: 29, speed: 14, loop: true },
                "walk-right":  { from: 32, to: 37, speed: 14, loop: true },
                "walk-left":   { from: 32, to: 37, speed: 14, loop: true },
                "walk-up":     { from: 40, to: 45, speed: 14, loop: true },
            },
        }],
        ["npc_sheet", "assets/characters/npc_sheet.png", {
            sliceX: 8,
            sliceY: 14,
            anims: {
                "idle-left": { from: 8, to: 9, speed: 2, loop: true },
            },
        }],
        ["finger_icon", "assets/characters/finger.png"],
        ["butterfly_sheet", "assets/animals/Butterfly.png", {
            // 16x64 sheet: 2 columns x 8 rows (8x8 frames)
            sliceX: 2,
            sliceY: 8,
            anims: {
                // Requested rows only (1-based): 1 = blue, 4 = pink, 5 = red
                "fly-blue": { from: 0, to: 1, speed: 10, loop: true },
                "fly-pink": { from: 6, to: 7, speed: 10, loop: true },
                "fly-red": { from: 8, to: 9, speed: 10, loop: true },
            },
        }],
        ["clouds_sheet", "assets/weather/Clouds.png", {
            // 128x128: 2x2 cloud variants (64x64 each)
            sliceX: 2,
            sliceY: 2,
        }],
        ["big_oak_tree", "assets/trees/Big_Oak_Tree.png", {
            // 96x48 sheet: 3x1 frames (32x48 each)
            sliceX: 3,
            sliceY: 1,
        }],
        ["wind_sheet", "assets/weather/Wind_Anim.png", {
            // 224x16: 14 frames (16x16 each)
            sliceX: 14,
            sliceY: 1,
            anims: {
                gust: { from: 0, to: 13, speed: 16, loop: true },
            },
        }],
        ["path_middle_tile", "assets/tiles/Path_Middle.png"],
        ["cobble_road_tiles", "assets/tiles/Cobble_Road.png", {
            // 48x80 sheet: 3x5 frames (16x16 each)
            sliceX: 3,
            sliceY: 5,
        }],
        ["flowers_sheet", "assets/Outdoor decoration/Flowers.png", {
            // 160x160 sheet: 10x10 frames (16x16 each)
            sliceX: 10,
            sliceY: 10,
        }],
        ["flowers_anim_sheet", "assets/Outdoor decoration/Outdoor_Decor_Animations/Flower_Animations/Flowers_1_Anim.png", {
            // 96x160 sheet: 6x10 frames (16x16 each)
            sliceX: 6,
            sliceY: 10,
            anims: buildFlowerRowAnims(3),
        }],
        ["flowers_anim_sheet_2", "assets/Outdoor decoration/Outdoor_Decor_Animations/Flower_Animations/Flowers_2_Anim.png", {
            // 96x160 sheet: 6x10 frames (16x16 each)
            sliceX: 6,
            sliceY: 10,
            anims: buildFlowerRowAnims(3),
        }],
        ["flowers_anim_sheet_3", "assets/Outdoor decoration/Outdoor_Decor_Animations/Flower_Animations/Flowers_3_Anim.png", {
            // 96x160 sheet: 6x10 frames (16x16 each)
            sliceX: 6,
            sliceY: 10,
            anims: buildFlowerRowAnims(3),
        }],
        ["flowers_anim_sheet_4", "assets/Outdoor decoration/Outdoor_Decor_Animations/Flower_Animations/Flowers_4_Anim.png", {
            // 96x160 sheet: 6x10 frames (16x16 each)
            sliceX: 6,
            sliceY: 10,
            anims: buildFlowerRowAnims(3),
        }],
        ["flowers_anim_sheet_5", "assets/Outdoor decoration/Outdoor_Decor_Animations/Flower_Animations/Flowers_5_Anim.png", {
            // 96x160 sheet: 6x10 frames (16x16 each)
            sliceX: 6,
            sliceY: 10,
            anims: buildFlowerRowAnims(3),
        }],
    ];
    const loadPromises = optionalAssets.map(([name, path, opt]) =>
        Promise.resolve(k.loadSprite(name, path, opt || {})).catch(() => {})
    );

    Promise.all(loadPromises).then(() => {
        k.go("game");
    });
}
