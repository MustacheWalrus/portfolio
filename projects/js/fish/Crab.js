class Crab extends Fish {
    constructor(p, data) {
        super(p, data);
        this.pixelScale = this.size;

        // Movement
        this.move = this.data.movement;
        this.moveAngle = this.p.random(this.p.TWO_PI);
        this.turnRate = this.p.random() < 0.5 ? 0 : this.p.random(this.move.turnRate.min, this.move.turnRate.max);
        this.wiggleOffset = this.p.random(100);
        this.currentHeading = 0;

        // --- Variety and Color ---
        this.variety = this.chooseVariety();
        this.patternSeed = this.p.random(1000);
        this.palette = {};
        for (const colorName in this.data.palette) {
            this.palette[colorName] = this.p.color(this.data.palette[colorName]);
        }

        // --- Pattern ---
        this.basePattern = this.data.basePattern;
        this.patternCenterX = 3;
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
        return this.palette[name] || this.palette['red'];
    }

    getPixelColor(u, v) {
        const type = this.variety.type;
        const cols = this.variety.colors.map(n => this.getColorByName(n));

        if (type === 'solid') return cols[0];
        if (type === 'bi-color') {
            if (v === 0 || u === 0 || u === 6) return cols[1];
            return cols[0];
        }
        if (type === 'halloween') {
            if (v === 0) return cols[2];
            if (v === 2 || v === 4) return cols[1];
            return cols[0];
        }
        if (type === 'vampire') {
            if (v === 0) return cols[1];
            return cols[0];
        }
        if (type === 'rainbow') {
            if (v === 3) return cols[0];
            if (v === 2 || v === 4) return cols[1];
            return cols[2];
        }
        if (type === 'spotted') {
            let n = this.p.noise(u * 0.9 + this.patternSeed, v * 0.9 + this.patternSeed);
            return n > 0.6 ? cols[1] : cols[0];
        }
        if (type === 'mottled') {
            let n = this.p.noise(u * 0.9 + this.patternSeed, v * 0.9 + this.patternSeed);
            if (n < 0.4) return cols[0];
            if (n < 0.7) return cols[1];
            return cols[2];
        }
        if (type === 'pom-pom') {
            if (v === 0) return cols[1];
            return ((u + v) % 2 === 0) ? cols[0] : cols[1];
        }
        if (type === 'striped') {
            return (u % 2 === 0) ? cols[1] : cols[0];
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
        this.moveAngle += this.turnRate;
        let wiggle = this.p.sin(time * this.move.wiggleSpeed + this.wiggleOffset) * this.move.wiggleMag;
        this.currentHeading = this.moveAngle + wiggle;
        
        this.velocity.set(
            this.p.cos(this.currentHeading) * this.move.speed,
            this.p.sin(this.currentHeading) * this.move.speed
        );
        this.position.add(this.velocity);

        if (this.p.random() < 0.003) {
            this.turnRate = this.p.random() < 0.5 ? 0 : this.p.random(this.move.turnRate.min, this.move.turnRate.max);
        }
        super.edges();
    }

    display(waterColor1, waterColor2, time, fishOpacity) {
        this.p.noStroke();
        const gridX = this.p.round(this.position.x / this.pixelScale) * this.pixelScale;
        const gridY = this.p.round(this.position.y / this.pixelScale) * this.pixelScale;

        let drawAngle = this.currentHeading;
        const pixels = this.rotatePattern(drawAngle);
        
        const ux = this.velocity.x / (this.move.speed || 1);
        const uy = this.velocity.y / (this.move.speed || 1);

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
