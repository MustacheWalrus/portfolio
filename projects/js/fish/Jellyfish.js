class Jellyfish extends Fish {
    constructor(p, data) {
        super(p, data);
        this.pixelScale = this.size;
        this.heading = this.p.random(this.p.TWO_PI);

        // Movement
        this.pulseTimer = this.p.random(100);
        this.pulseInterval = this.p.random(this.data.movement.pulseInterval.min, this.data.movement.pulseInterval.max);

        // --- Variety and Color ---
        this.variety = this.chooseVariety();
        this.palette = {};
        for (const colorName in this.data.palette) {
            this.palette[colorName] = this.p.color(this.data.palette[colorName]);
        }

        // --- Pattern ---
        this.basePattern = this.data.basePattern;
        this.patternCenterX = 2;
        this.patternCenterY = 2;
    }

    chooseVariety() {
        const totalWeight = this.data.varieties.reduce((sum, variety) => sum + (1 / variety.rarity), 0);
        let random = this.p.random(totalWeight);
        for (const variety of this.data.varieties) {
            random -= (1 / variety.rarity);
            if (random <= 0) return variety;
        }
        return this.data.varieties[this.data.varieties.length - 1];
    }

    getColorByName(name) {
        return this.palette[name] || this.palette['white'];
    }

    getPixelColor(u, v) {
        const type = this.variety.type;
        const cols = this.variety.colors.map(n => this.getColorByName(n));

        if (type === 'glowing') {
            if (u === 2 && v <= 2) return cols[1];
            return cols[0];
        }
        if (type === 'center_spot') {
            if (u === 2 && v === 1) return cols[1];
            return cols[0];
        }
        if (type === 'striped') {
            if (v < 3 && u % 2 === 0) return cols[1];
            return cols[0];
        }
        if (type === 'rim') {
            if ((v === 0) || (v === 1 && (u === 0 || u === 4))) return cols[1];
            return cols[0];
        }
        if (type === 'translucent') {
            if (u === 0 || u === 4) return cols[1];
            return cols[0];
        }
        return cols[0];
    }

    rotatePattern(angle) {
        const rotatedMap = new Map();
        const cosA = this.p.cos(angle), sinA = this.p.sin(angle);
        for (let v = 0; v < this.basePattern.length; v++) {
            for (let u = 0; u < this.basePattern[v].length; u++) {
                if (this.basePattern[v][u] === 1) {
                    const relX = u - this.patternCenterX;
                    const relY = v - this.patternCenterY;
                    const rotX = this.p.round(relX * cosA - relY * sinA);
                    const rotY = this.p.round(relX * sinA + relY * cosA);
                    const key = `${rotX},${rotY}`;
                    rotatedMap.set(key, { x: rotX, y: rotY, u: u, v: v });
                }
            }
        }
        return Array.from(rotatedMap.values());
    }

    update(time) {
        this.pulseTimer++;
        if (this.pulseTimer > this.pulseInterval) {
            this.heading += this.p.random(-0.8, 0.8);
            let force = p5.Vector.fromAngle(this.heading).mult(1.5);
            this.velocity.add(force);
            this.pulseTimer = 0;
        }
        this.velocity.mult(0.94);
        this.position.add(this.velocity);
        super.edges();
    }

    display(waterColor1, waterColor2, time, fishOpacity) {
        this.p.noStroke();
        const gridX = this.p.round(this.position.x / this.pixelScale) * this.pixelScale;
        const gridY = this.p.round(this.position.y / this.pixelScale) * this.pixelScale;

        let drawAngle = this.heading + this.p.PI / 2;
        const pixels = this.rotatePattern(drawAngle);
        
        const ux = this.p.cos(this.heading);
        const uy = this.p.sin(this.heading);

        for (const pix of pixels) {
            let px = gridX + pix.x * this.pixelScale;
            let py = gridY + pix.y * this.pixelScale;
            
            let baseColor = this.getPixelColor(pix.u, pix.v);

            let dp = (pix.x * this.pixelScale) * ux + (pix.y * this.pixelScale) * uy;
            let diff = this.p.map(dp, -20, 20, -1, 1, true);
            
            let finalC = (diff > 0.1) ? this.p.lerpColor(baseColor, this.p.color(0, 0, 0), diff * 0.3) : baseColor;
            
            // Use the base opacity from JSON, modulated by the global slider
            const baseOpacity = this.data.opacity || 60;
            const finalOpacity = (baseOpacity / 255) * fishOpacity;
            let displayColor = this.p.color(this.p.red(finalC), this.p.green(finalC), this.p.blue(finalC), finalOpacity);

            this.p.fill(displayColor);
            this.p.rect(px, py, this.pixelScale, this.pixelScale);
        }
    }
}
