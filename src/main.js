import kaplay from "kaplay";
import bootScene from "./scenes/boot.js";
import gameScene from "./scenes/game.js";

const k = kaplay({
    background: "#71BB47",
    scale: 1.25,
});

k.loadRoot("./");

k.scene("boot", (...args) => bootScene(k, ...args));
k.scene("game", (...args) => gameScene(k, ...args));

k.go("boot");
