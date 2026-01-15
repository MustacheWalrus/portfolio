// Base class for all fish-like objects in the simulation.
class Fish {
    constructor(p, data) {
        this.p = p;
        this.data = data;
        this.position = this.p.createVector(this.p.random(this.p.width), this.p.random(this.p.height));
        this.velocity = p5.Vector.random2D();
        this.size = this.p.random(this.data.size?.min || 1, this.data.size?.max || 1);
    }

    // A placeholder update method. Subclasses must implement their own movement logic.
    update(time, flock) {
        // Default behavior: simple movement
        this.position.add(this.velocity);
        this.edges();
    }

    // A placeholder display method. Subclasses must implement their own rendering.
    display(waterColor1, waterColor2, time, fishOpacity) {
        // Base display logic (if any)
    }

    // Wraps the fish around the screen edges.
    edges() {
        const pad = this.size * 5;
        if (this.position.x > this.p.width + pad) this.position.x = -pad;
        else if (this.position.x < -pad) this.position.x = this.p.width + pad;
        if (this.position.y > this.p.height + pad) this.position.y = -pad;
        else if (this.position.y < -pad) this.position.y = this.p.height + pad;
    }
}
