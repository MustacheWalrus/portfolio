class SeaTurtle extends Fish {
    constructor(p, data) {
        super(p, data);
        this.pixelScale = this.size;

        // Movement
        this.speed = this.p.random(this.data.movement.speed.min, this.data.movement.speed.max);
        this.heading = this.p.random(this.p.TWO_PI);
        this.turnTarget = this.heading;
        this.paddleTimer = 0;
        this.isPaddling = false;

        // --- Variety and Color ---
        this.variety = this.chooseVariety();
        this.patternSeed = this.p.random(1000);
        this.palette = {};
        for (const colorName in this.data.palette) {
            this.palette[colorName] = this.p.color(this.data.palette[colorName]);
        }

        // --- Pattern ---
        this.basePattern = this.data.basePattern;
        this.patternCenterX = 5;
        this.patternCenterY = 7;
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

    getPixelColor(u, v, typeVal) {
        const cols = this.variety.colors.map(n => this.getColorByName(n));
        const shellColor = cols[0];
        const skinColor = this.variety.colors.length > 1 ? cols[1] : cols[0];

        if (typeVal === 1) { // Skin
            let n = this.p.noise(u * 0.5 + this.patternSeed, v * 0.5 + this.patternSeed);
            return this.p.lerpColor(skinColor, this.p.color(255), n * 0.1);
        }

        if (typeVal === 2) { // Shell
            if (this.variety.type === 'solid') return shellColor;
            if (this.variety.type === 'shell_pattern') {
                let dist = this.p.dist(u, v, 5, 7);
                if (dist < 1.5 || (u + v) % 3 === 0) return this.p.lerpColor(shellColor, this.p.color(0), 0.2);
                return shellColor;
            }
            if (this.variety.type === 'mottled') {
                let n = this.p.noise(u * 0.8 + this.patternSeed, v * 0.8 + this.patternSeed);
                return n > 0.5 ? cols[1] : cols[0];
            }
            if (this.variety.type === 'ridged') {
                if (u === 3 || u === 5 || u === 7) return cols[1];
                return cols[0];
            }
        }
        return shellColor;
    }

    rotatePattern(angle) {
        const rotatedMap = new Map();
        const cosA = this.p.cos(angle), sinA = this.p.sin(angle);
        for (let v = 0; v < this.basePattern.length; v++) {
            for (let u = 0; u < this.basePattern[v].length; u++) {
                if (this.basePattern[v][u] !== 0) {
                    const relX = u - this.patternCenterX;
                    const relY = v - this.patternCenterY;
                    const rotX = this.p.round(relX * cosA - relY * sinA);
                    const rotY = this.p.round(relX * sinA + relY * cosA);
                    const key = `${rotX},${rotY}`;
                    rotatedMap.set(key, { x: rotX, y: rotY, u: u, v: v, val: this.basePattern[v][u] });
                }
            }
        }
        return Array.from(rotatedMap.values());
    }

    update(time) {
        this.paddleTimer++;
        if (this.paddleTimer > 200) {
            this.isPaddling = true;
            this.turnTarget = this.heading + this.p.random(-0.5, 0.5);
            if (this.paddleTimer > 260) {
                this.paddleTimer = 0;
                this.isPaddling = false;
            }
        }

        this.heading = this.p.lerp(this.heading, this.turnTarget, 0.02);

        let currentSpeed = this.speed;
        if (this.isPaddling) currentSpeed *= 2.0;
        else currentSpeed *= 0.8;
        if (currentSpeed < 0.2) currentSpeed = 0.2;

        this.velocity.set(
            this.p.cos(this.heading) * currentSpeed,
            this.p.sin(this.heading) * currentSpeed
        );
        this.position.add(this.velocity);
        
        const pad = 150;
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
        
        const ux = this.p.cos(this.heading);
        const uy = this.p.sin(this.heading);

        for (const pix of pixels) {
            let px = gridX + pix.x * this.pixelScale;
            let py = gridY + pix.y * this.pixelScale;
            
            let baseColor = this.getPixelColor(pix.u, pix.v, pix.val);

            let dp = (pix.x * this.pixelScale) * ux + (pix.y * this.pixelScale) * uy;
            let diff = this.p.map(dp, -30, 30, -1, 1, true);
            
            let finalC;
            if (diff > 0.1) {
                finalC = this.p.lerpColor(baseColor, this.p.color(0), diff * 0.4);
            } else if (diff < -0.1) {
                finalC = this.p.lerpColor(baseColor, this.p.color(255), -diff * 0.1);
            } else {
                finalC = baseColor;
            }
            
            if (this.isPaddling && pix.val === 1 && pix.v < 6) {
                let flap = this.p.sin(time * 10);
                px += -uy * flap * 2;
                py += ux * flap * 2;
            }

            let displayColor = this.p.color(this.p.red(finalC), this.p.green(finalC), this.p.blue(finalC), fishOpacity);

            this.p.fill(displayColor);
            this.p.rect(px, py, this.pixelScale, this.pixelScale);
        }
    }
}
