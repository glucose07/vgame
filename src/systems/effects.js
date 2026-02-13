/**
 * Petal effects (M5): ambient falling petals near clearing + burst on success.
 * Placeholder Mode A — uses small colored circles/rects as petal stand-ins.
 */

/** Petal palette — soft pinks / reds / whites */
const PETAL_COLORS = [
    [255, 180, 200],
    [255, 140, 160],
    [255, 200, 210],
    [240, 100, 120],
    [255, 220, 230],
];

function randomColor() {
    return PETAL_COLORS[Math.floor(Math.random() * PETAL_COLORS.length)];
}

// ---------------------------------------------------------------------------
// Ambient petals — subtle, continuous, across the rose field (excluding path & clearing)
// ---------------------------------------------------------------------------

const AMBIENT_MAX = 45;          // max concurrent ambient petals (whole field)
const AMBIENT_SPAWN_INTERVAL = 0.18; // seconds between spawns
const AMBIENT_FALL_SPEED_MIN = 18;
const AMBIENT_FALL_SPEED_MAX = 45;
const AMBIENT_INITIAL_FILL_RATIO = 0.7; // pre-seed petals so scene feels populated on load
const AMBIENT_SWAY_AMP = 18;     // horizontal sway amplitude (px)
const AMBIENT_SWAY_FREQ = 1.3;   // sway frequency (Hz)
const AMBIENT_SIZE_MIN = 3;
const AMBIENT_SIZE_MAX = 6;

/**
 * Start ambient falling petals across the entire rose field (top to bottom).
 * @param {object} k - Kaplay context
 * @param {object} opts
 * @param {number} opts.worldW - World width
 * @param {number} opts.worldH - World height
 */
export function startAmbientPetals(k, opts) {
    const {
        worldW,
        worldH,
        maxPetals = AMBIENT_MAX,
        spawnInterval = AMBIENT_SPAWN_INTERVAL,
        initialFillRatio = AMBIENT_INITIAL_FILL_RATIO,
    } = opts;
    const petals = [];
    let timer = 0;

    function spawnOne(startY = -10 - Math.random() * 30, startAge = 0) {
        const size = AMBIENT_SIZE_MIN + Math.random() * (AMBIENT_SIZE_MAX - AMBIENT_SIZE_MIN);
        const startX = Math.random() * worldW;
        const fallSpeed = AMBIENT_FALL_SPEED_MIN + Math.random() * (AMBIENT_FALL_SPEED_MAX - AMBIENT_FALL_SPEED_MIN);
        const swayOffset = Math.random() * Math.PI * 2;
        const col = randomColor();

        const petal = k.add([
            k.circle(size),
            k.pos(startX, startY),
            k.color(...col),
            k.opacity(0.45 + Math.random() * 0.3),
            k.anchor("center"),
            k.z(50),
            "ambientPetal",
        ]);

        petals.push({ obj: petal, fallSpeed, swayOffset, originX: startX, age: startAge });
    }

    // Seed a partial screen worth of petals on start so density ramps in immediately.
    const initialCount = Math.floor(maxPetals * initialFillRatio);
    for (let i = 0; i < initialCount; i++) {
        const seededY = -10 + Math.random() * (worldH + 20);
        const seededAge = Math.random() * 6;
        spawnOne(seededY, seededAge);
    }

    k.onUpdate(() => {
        const dt = k.dt();
        timer += dt;

        // Spawn new petals at interval (capped)
        while (timer >= spawnInterval && petals.length < maxPetals) {
            timer -= spawnInterval;
            spawnOne();
        }
        // Prevent timer from accumulating if at cap
        if (petals.length >= maxPetals) timer = 0;

        // Update existing petals
        for (let i = petals.length - 1; i >= 0; i--) {
            const p = petals[i];
            p.age += dt;
            p.obj.pos.y += p.fallSpeed * dt;
            p.obj.pos.x = p.originX + Math.sin(p.age * AMBIENT_SWAY_FREQ + p.swayOffset) * AMBIENT_SWAY_AMP;

            // Remove when below world bottom
            if (p.obj.pos.y > worldH + 20) {
                k.destroy(p.obj);
                petals.splice(i, 1);
            }
        }
    });
}

// ---------------------------------------------------------------------------
// Burst petals — one-shot explosion on success
// ---------------------------------------------------------------------------

const BURST_COUNT = 40;
const BURST_SPEED_MIN = 80;
const BURST_SPEED_MAX = 220;
const BURST_LIFETIME = 2.0;      // seconds before fade-out finishes
const BURST_SIZE_MIN = 4;
const BURST_SIZE_MAX = 9;
const BURST_GRAVITY = 40;        // gentle downward pull

/**
 * Fire a one-time burst of petals from a position.
 * @param {object} k - Kaplay context
 * @param {{ x: number, y: number }} origin - Burst center
 */
export function burstPetals(k, origin) {
    const particles = [];

    for (let i = 0; i < BURST_COUNT; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = BURST_SPEED_MIN + Math.random() * (BURST_SPEED_MAX - BURST_SPEED_MIN);
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;
        const size = BURST_SIZE_MIN + Math.random() * (BURST_SIZE_MAX - BURST_SIZE_MIN);
        const col = randomColor();

        const petal = k.add([
            k.circle(size),
            k.pos(origin.x, origin.y),
            k.color(...col),
            k.opacity(1),
            k.anchor("center"),
            k.z(100),
            "burstPetal",
        ]);

        particles.push({ obj: petal, vx, vy, age: 0 });
    }

    const cancelBurst = k.onUpdate(() => {
        const dt = k.dt();
        let alive = 0;

        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.age += dt;

            if (p.age >= BURST_LIFETIME) {
                k.destroy(p.obj);
                particles.splice(i, 1);
                continue;
            }

            alive++;
            // Move
            p.obj.pos.x += p.vx * dt;
            p.obj.pos.y += p.vy * dt;
            p.vy += BURST_GRAVITY * dt;

            // Slow down
            p.vx *= 0.995;

            // Fade out in second half of lifetime
            const t = p.age / BURST_LIFETIME;
            p.obj.opacity = t < 0.5 ? 1 : 1 - (t - 0.5) * 2;
        }

        // Cancel update loop once all particles are gone
        if (alive === 0 && particles.length === 0) {
            cancelBurst.cancel();
        }
    });
}

// ---------------------------------------------------------------------------
// Convenience: wire both effects to the game
// ---------------------------------------------------------------------------

/**
 * Set up all petal effects for the game scene.
 * @param {object} k - Kaplay context
 * @param {object} opts
 * @param {{ x: number, y: number }} opts.clearingCenter
 * @param {number} opts.worldW
 * @param {number} opts.worldH
 * @param {object} opts.successBus - Game object that fires "choiceSuccess"
 */
export function setupPetalEffects(k, opts) {
    const { clearingCenter, worldW, worldH, successBus, ambientConfig = {} } = opts;

    // Ambient petals — fall across the whole field
    startAmbientPetals(k, { worldW, worldH, ...ambientConfig });

    // Burst petals — fire once on success
    successBus.on("choiceSuccess", () => {
        burstPetals(k, clearingCenter);
    });
}
