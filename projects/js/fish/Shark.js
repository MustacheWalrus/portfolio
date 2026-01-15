class Shark extends Fish {
    constructor(p, data) {
        super(p, data);
        this.pixelScale = this.size;

        // Movement
        this.move = this.data.movement;
        this.speedFactor = this.p.random(this.move.speedFactor.min, this.move.speedFactor.max);
        this.heading = this.p.random(this.p.TWO_PI);
        this.turnRate = this.p.random(-this.move.maxTurn, this.move.maxTurn);

        // Animation
        this.anim = this.data.animation;

        // --- Variety and Color ---
        this.variety = this.chooseVariety();
        this.palette = {};
        for (const colorName in this.data.palette) {
            this.palette[colorName] = this.p.color(this.data.palette[colorName]);
        }

        // --- Pattern ---
        this.basePattern = this.data.basePattern;
        this.patternCenterX = 5;
        this.patternCenterY = 8;
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
        return this.palette[name] || this.palette['darkGrey'];
    }

    getPixelColor(u, v) {
        const type = this.variety.type;
        const cols = this.variety.colors.map(n => this.getColorByName(n));

        if (type === 'whitefin') {
            if (v >= 5 && v <= 8 && (u <= 3 || u >= 7)) return cols[1];
            if (v >= 35) return cols[1];
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
        this.heading += this.turnRate;
        
        let currentSpeed = this.move.baseSpeed * this.speedFactor;
        this.velocity.set(
            this.p.cos(this.heading) * currentSpeed,
            this.p.sin(this.heading) * currentSpeed
        );
        this.position.add(this.velocity);

        if (this.p.random() < 0.01) {
            this.turnRate = this.p.random(-this.move.maxTurn, this.move.maxTurn);
        }
        
        // Use a larger padding for the large shark
        const pad = 250;
        if (this.position.x < -pad) this.position.x = this.p.width + pad;
        if (this.position.x > this.p.width + pad) this.position.x = -pad;
        if (this.position.y < -pad) this.position.y = this.p.height + pad;
        if (this.position.y > this.p.height + pad) this.position.y = -pad;
    }

    display(waterColor1, waterColor2, time, fishOpacity) {
        this.p.noStroke();
        const gridX = this.p.round(this.position.x / this.pixelScale) * this.pixelScale;
        const gridY = this.p.round(this.position.y / this.pixelScale) * this.pixelScale;

        let drawAngle = this.heading + this.p.PI / 2;
        const pixels = this.rotatePattern(drawAngle);
        
        let turnFactor = this.p.map(this.p.abs(this.turnRate), 0, this.move.maxTurn, 0, this.anim.turnAmpBoost);
        let currentAmp = this.anim.slitherAmp + turnFactor;

        const ux = this.velocity.x / (this.move.baseSpeed * this.speedFactor || 1);
        const uy = this.velocity.y / (this.move.baseSpeed * this.speedFactor || 1);
        
        const perpX = -uy;
        const perpY = ux;

        for (const pix of pixels) {
            let px = gridX + pix.x * this.pixelScale;
            let py = gridY + pix.y * this.pixelScale;
            
            let baseColor = this.getPixelColor(pix.u, pix.v);

            let dp = (pix.x * this.pixelScale) * ux + (pix.y * this.pixelScale) * uy;
            let diff = this.p.map(dp, -30, 30, -1, 1, true);
            
            let finalC;
            if (diff > 0.1) {
                finalC = this.p.lerpColor(baseColor, this.p.color(0, 0, 0), diff * 0.4);
            } else if (diff < -0.1) {
                finalC = this.p.lerpColor(baseColor, this.p.color(255, 255, 255), -diff * 0.1);
            } else {
                finalC = baseColor;
            }
            
            let damper = this.p.map(pix.v, 0, 40, 0.05, 1.6);
            let wave = this.p.sin(time * this.anim.slitherSpeed + pix.v * this.anim.slitherFreq) * currentAmp * damper;
            
            px += perpX * wave;
            py += perpY * wave;

            let displayColor = this.p.color(this.p.red(finalC), this.p.green(finalC), this.p.blue(finalC), fishOpacity);

            this.p.fill(displayColor);
            this.p.rect(px, py, this.pixelScale, this.pixelScale);
        }
    }
}
