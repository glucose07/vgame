import kaplay from "kaplay";
import bootScene from "./scenes/boot.js";
import gameScene from "./scenes/game.js";

const k = kaplay({
    background: "#71BB47",
    scale: 1.25,
});

// Load font BEFORE loadRoot so the URL isn't prefixed with "./"
// In Vite, public/ contents are served at root in dev AND copied to dist/ root in builds,
// so the path must NOT include the "public/" prefix.
k.loadFont("Nunito", "fonts/Nunito-VariableFont_wght.ttf");
k.loadRoot("./");

k.scene("boot", (...args) => bootScene(k, ...args));
k.scene("game", (...args) => gameScene(k, ...args));

k.go("boot");
