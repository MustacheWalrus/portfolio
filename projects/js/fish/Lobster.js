class Lobster extends Fish {
    constructor(p, data) {
        super(p, data);
        this.noiseOffsetX = this.p.random(1000);
        this.noiseOffsetY = this.p.random(1000);
        
        this.speed = this.data.movement.speed;
        this.pixelScale = this.size || 10;

        // --- Variety and Color ---
        this.variety = this.chooseVariety();
        this.patternSeed = this.p.random(1000);
        this.palette = {};
        for (const colorName in this.data.palette) {
            this.palette[colorName] = this.p.color(this.data.palette[colorName]);
        }

        // --- Pattern ---
        this.basePattern = this.data.basePattern;
        this.patternCenterX = 2;
        this.patternCenterY = 3;
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
        return this.palette[name] || this.palette['olive'];
    }

    getPixelColor(u, v) {
        const type = this.variety.type;
        const cols = this.variety.colors.map(n => this.getColorByName(n));

        if (type === 'solid') return cols[0];

        if (type === 'split') {
            if (u < 2) return cols[0];
            if (u > 2) return cols[1];
            return cols[0]; // Spine color
        }

        let n = this.p.noise(u * 0.8 + this.patternSeed, v * 0.8 + this.patternSeed);

        if (type === 'mottled') {
            if (n < 0.4) return cols[0];
            if (n < 0.7) return cols[1];
            return cols[2];
        }

        if (type === 'spotted') {
            return n > 0.6 ? cols[1] : cols[0];
        }

        if (type === 'pastel') {
            return n > 0.5 ? cols[1] : cols[0];
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
        let angle = this.p.noise(this.noiseOffsetX + time * 0.05, this.noiseOffsetY + time * 0.05) * this.p.TWO_PI * 4;
        this.velocity.set(this.p.cos(angle) * this.speed, this.p.sin(angle) * this.speed);
        this.position.add(this.velocity);
        super.edges();
    }

    display(waterColor1, waterColor2, time, fishOpacity) {
        this.p.noStroke();
        const gridX = this.p.round(this.position.x / this.pixelScale) * this.pixelScale;
        const gridY = this.p.round(this.position.y / this.pixelScale) * this.pixelScale;

        const ang = this.velocity.heading() + this.p.PI / 2;
        const pixels = this.rotatePattern(ang);
        const ux = this.velocity.x / this.speed;
        const uy = this.velocity.y / this.speed;

        for (const pix of pixels) {
            let px = gridX + pix.x * this.pixelScale;
            let py = gridY + pix.y * this.pixelScale;
            
            let baseColor = this.getPixelColor(pix.u, pix.v);

            let dp = (pix.x * this.pixelScale) * ux + (pix.y * this.pixelScale) * uy;
            let diff = this.p.map(dp, -30, 30, -1, 1, true);
            
            let finalC = (diff > 0.1) ? this.p.lerpColor(baseColor, this.p.color(0, 0, 0), diff * 0.4) : baseColor;
            
            let displayColor = this.p.color(this.p.red(finalC), this.p.green(finalC), this.p.blue(finalC), fishOpacity);

            this.p.fill(displayColor);
            this.p.rect(px, py, this.pixelScale, this.pixelScale);
        }
    }
}
