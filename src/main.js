import kaplay from "kaplay";
// import "kaplay/global"; // uncomment if you want to use without the k. prefix

// Start with options
const k = kaplay({
    background: "#71BB47",
    scale: 2,
    canvas: document.getElementById("canvas"),
});

k.loadRoot("./"); // A good idea for Itch.io publishing later

const player = k.add([
    k.rect(32, 32), // Draw this object as a rectangle
    k.pos(10, 20), // Position this object in X: 10 and Y: 20
    "shape", // Classify this object as "shape"
]);

k.onKeyDown("right", () => {
    player.move(100, 0); // Move the object while "right" key is held down [!code highlight]
});

const isShape = player.is("shape"); // Check for tags [!code highlight]
debug.log(isShape); // Log it on the screen