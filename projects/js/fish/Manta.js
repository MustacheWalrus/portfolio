class Manta extends Fish {
    constructor(p, data) {
        super(p, data);
        this.noiseOffsetX = this.p.random(1000);
        this.noiseOffsetY = this.p.random(1000);
        this.flapOffset = this.p.random(this.p.TWO_PI);

        this.basePattern = this.data.basePattern;
        this.patternCenterX = this.p.floor(this.basePattern[0].length / 2);
        this.patternCenterY = this.p.floor(this.basePattern.length / 2);
        
        // The old class used vx/vy, the new base uses a p5.Vector `velocity`
        // We'll stick to the vector-based approach for consistency.
        this.velocity = this.p.createVector(0, 0);
    }

    update(time) {
        // Movement based on Perlin noise, adapted from the original script
        let angle = this.p.noise(this.noiseOffsetX + time * 0.1, this.noiseOffsetY + time * 0.1) * this.p.TWO_PI * 2;
        const speed = this.p.map(this.size, this.data.size.min, this.data.size.max, this.data.speed.max, this.data.speed.min);
        
        this.velocity.set(this.p.cos(angle) * speed, this.p.sin(angle) * speed);
        this.position.add(this.velocity);
        
        // Use the edge wrapping from the base class
        super.edges();
    }

    display(waterColor1, waterColor2, time, fishOpacity) {
        this.p.noStroke();
        const gridX = this.p.round(this.position.x / 20) * 20;
        const gridY = this.p.round(this.position.y / 20) * 20;
        const mag = this.velocity.mag();
        if (mag === 0) return;

        const ux = this.velocity.x / mag, uy = this.velocity.y / mag;
        const ang = this.velocity.heading() + this.p.PI / 2;
        const coords = this.rotatePattern(ang);
        const flap = this.p.sin(time * 5 + this.flapOffset);

        for (const c of coords) {
            let px = gridX + c[0] * 20;
            let py = gridY + c[1] * 20;
            let dp = (c[0] * 20) * ux + (c[1] * 20) * uy;
            let diff = this.p.map(dp, -100, 100, -1, 1, true);
            let noiseCol = this.p.noise(px * 0.005, py * 0.005, time * 0.1);
            let baseC = this.p.lerpColor(waterColor1, waterColor2, noiseCol);
            let finalC;

            // Shading logic for the fish body
            if (diff > 0) {
                let dark = this.p.color(0, 40, 60, 200);
                finalC = this.p.lerpColor(baseC, dark, diff * this.p.map(flap, -1, 1, 0.4, 1));
            } else {
                let light = this.p.color(255, 255, 200, 150);
                finalC = this.p.lerpColor(baseC, light, -diff * 0.5);
                let turb = -diff * this.p.map(flap, -1, 1, 0, 1) * 6;
                px += this.p.random(-turb, turb);
                py += this.p.random(-turb, turb);
            }
            let d2 = this.p.sqrt((c[0] * 20) ** 2 + (c[1] * 20) ** 2);
            let darkF = this.p.map(d2, 0, 80, 0.4, 0, true);
            let cenC = this.p.lerpColor(finalC, this.p.color(0, 40, 60, 200), darkF);
            
            // Apply fishOpacity
            let displayColor = this.p.color(this.p.red(cenC), this.p.green(cenC), this.p.blue(cenC), fishOpacity);
            this.p.fill(displayColor);
            this.p.rect(this.p.round(px / 20) * 20, this.p.round(py / 20) * 20, 20, 20);
        }
    }

    // Rotates the pixel matrix based on movement direction
    rotatePattern(angle) {
        const rotated = new Set();
        const cosA = this.p.cos(angle), sinA = this.p.sin(angle);
        for (let y = 0; y < this.basePattern.length; y++) {
            for (let x = 0; x < this.basePattern[y].length; x++) {
                if (this.basePattern[y][x] === 1) {
                    const relX = x - this.patternCenterX;
                    const relY = y - this.patternCenterY;
                    const rotX = this.p.round(relX * cosA - relY * sinA);
                    const rotY = this.p.round(relX * sinA + relY * cosA);
                    rotated.add(`${rotX},${rotY}`);
                }
            }
        }
        return Array.from(rotated).map(s => s.split(",").map(Number));
    }
}
