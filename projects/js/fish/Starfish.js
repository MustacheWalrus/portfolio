class Starfish extends Fish {
    constructor(p, data) {
        super(p, data);
        this.pixelScale = this.size;

        // Movement
        this.rotation = this.p.random(this.p.TWO_PI);
        this.rotationSpeed = this.p.random(this.data.movement.rotationSpeed.min, this.data.movement.rotationSpeed.max);
        this.velocity.set(
            this.p.random(this.data.movement.driftSpeed.min, this.data.movement.driftSpeed.max),
            this.p.random(this.data.movement.driftSpeed.min, this.data.movement.driftSpeed.max)
        );

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
        return this.palette[name] || this.palette['purple'];
    }

    getPixelColor(u, v) {
        const type = this.variety.type;
        const cols = this.variety.colors.map(n => this.getColorByName(n));

        if (type === 'solid') return cols[0];

        if (type === 'dotted') {
            if ((u === 2 && v === 2) || (u === 2 && v === 0) || (u === 0 && v === 1) || (u === 4 && v === 1) || (u === 1 && v === 4) || (u === 3 && v === 4) ) {
                 return cols[1]; // Chip color
            }
            return cols[0]; // Cream body
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
        this.rotation += this.rotationSpeed;
        this.position.add(this.velocity);
        super.edges();
    }

    display(waterColor1, waterColor2, time, fishOpacity) {
        this.p.noStroke();
        const gridX = this.p.round(this.position.x / this.pixelScale) * this.pixelScale;
        const gridY = this.p.round(this.position.y / this.pixelScale) * this.pixelScale;

        const pixels = this.rotatePattern(this.rotation);
        
        const ux = 0.707;
        const uy = 0.707;

        for (const pix of pixels) {
            let px = gridX + pix.x * this.pixelScale;
            let py = gridY + pix.y * this.pixelScale;
            
            let baseColor = this.getPixelColor(pix.u, pix.v);

            let dp = (pix.x * this.pixelScale) * ux + (pix.y * this.pixelScale) * uy;
            let diff = this.p.map(dp, -20, 20, -1, 1, true);
            
            let finalC = (diff > 0.1) ? this.p.lerpColor(baseColor, this.p.color(0, 0, 0), diff * 0.4) : baseColor;
            
            let displayColor = this.p.color(this.p.red(finalC), this.p.green(finalC), this.p.blue(finalC), fishOpacity);

            this.p.fill(displayColor);
            this.p.rect(px, py, this.pixelScale, this.pixelScale);
        }
    }
}
