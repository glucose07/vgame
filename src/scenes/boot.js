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

    // Optional: try to load manifest assets if present; never block on missing files.
    // With Vite, put assets in public/ so they're served (e.g. public/assets/tiles/...).
    const optionalAssets = [
        ["rose_field_tile", "assets/tiles/rose_field_tile.png"],
        ["unnamed_tile", "assets/tiles/unnamed_tile.png"],
        ["path_tile", "assets/tiles/path_tile.png"],
        ["player_sheet", "assets/characters/player_sheet.png", {
            sliceX: 8,
            sliceY: 14,
            anims: {
                "idle-down":   { from: 0, to: 0 },
                "idle-right":  { from: 8, to: 8 },
                "idle-left":   { from: 8, to: 8 },
                "idle-up":     { from: 16, to: 16 },
                "walk-down":   { from: 0, to: 5, speed: 8, loop: true },
                "walk-right":  { from: 8, to: 13, speed: 8, loop: true },
                "walk-left":   { from: 8, to: 13, speed: 8, loop: true },
                "walk-up":     { from: 16, to: 21, speed: 8, loop: true },
            },
        }],
        ["npc_sheet", "assets/characters/npc_sheet.png", {
            sliceX: 8,
            sliceY: 14,
            anims: {
                "idle-left": { from: 8, to: 9, speed: 2, loop: true },
            },
        }],
    ];
    const loadPromises = optionalAssets.map(([name, path, opt]) =>
        Promise.resolve(k.loadSprite(name, path, opt || {})).catch(() => {})
    );

    Promise.all(loadPromises).then(() => {
        k.go("game");
    });
}
