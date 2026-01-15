class Koi extends Fish {
    constructor(p, data) {
        super(p, data);
        this.noiseOffsetX = this.p.random(1000);
        this.noiseOffsetY = this.p.random(1000);
        this.flapOffset = this.p.random(this.p.TWO_PI);
        
        this.pixelScale = this.size;
        this.speed = this.data.speed;

        // --- Weighted Variety Selection ---
        this.variety = this.chooseVariety();
        
        this.patternSeed = this.p.random(1000);
        this.basePattern = this.data.basePattern;
        this.patternCenterX = this.p.floor(this.basePattern[0].length / 2);
        this.patternCenterY = this.p.floor(this.basePattern.length / 2);

        // Pre-cache p5 colors from the JSON palette
        this.palette = {};
        for (const colorName in this.data.palette) {
            this.palette[colorName] = this.p.color(this.data.palette[colorName]);
        }
    }

    // Selects a variety based on the rarity weights in the data
    chooseVariety() {
        const totalWeight = this.data.varieties.reduce((sum, variety) => sum + (1 / variety.rarity), 0);
        let random = this.p.random(totalWeight);

        for (const variety of this.data.varieties) {
            random -= (1 / variety.rarity);
            if (random <= 0) {
                return variety;
            }
        }
        // Fallback to the last variety in case of floating point inaccuracies
        return this.data.varieties[this.data.varieties.length - 1];
    }

    getColorByName(name) {
        return this.palette[name] || this.palette['white'];
    }

    getPixelColor(u, v) {
        const type = this.variety.type;
        const cols = this.variety.colors.map(n => this.getColorByName(n));
        
        if (type === 'solid') return cols[0];
        
        if (type === 'tancho') {
            let dist = this.p.dist(u, v, 5, 1.5);
            if (dist < 1.8) return cols[1]; 
            return cols[0]; 
        }
        
        if (type === 'asagi') {
           let distFromCenter = Math.abs(u - 5);
           if (distFromCenter <= 2 && v < 11) return cols[0]; 
           return cols[1]; 
        }

        let n = this.p.noise(u * 0.3 + this.patternSeed, v * 0.3 + this.patternSeed);
        
        if (type === 'pattern') return n > 0.55 ? cols[1] : cols[0];
        
        if (type === 'tricolor') {
            if (n < 0.4) return cols[0];      
            else if (n < 0.7) return cols[1]; 
            else return cols[2];              
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
        let angle = this.p.noise(this.noiseOffsetX + time * 0.1, this.noiseOffsetY + time * 0.1) * this.p.TWO_PI * 2;
        this.velocity.set(this.p.cos(angle) * this.speed, this.p.sin(angle) * this.speed);
        this.position.add(this.velocity);
        super.edges();
    }

    display(waterColor1, waterColor2, time, fishOpacity) {
        this.p.noStroke();
        const gridX = this.p.round(this.position.x / this.pixelScale) * this.pixelScale;
        const gridY = this.p.round(this.position.y / this.pixelScale) * this.pixelScale;
        const mag = this.velocity.mag();
        if (mag === 0) return;

        const ang = this.velocity.heading() + this.p.PI / 2;
        const pixels = this.rotatePattern(ang);
        const flap = this.p.sin(time * 8 + this.flapOffset);
        const ux = this.velocity.x / mag, uy = this.velocity.y / mag;

        for (const pix of pixels) {
            let px = gridX + pix.x * this.pixelScale;
            let py = gridY + pix.y * this.pixelScale;
            let baseColor = this.getPixelColor(pix.u, pix.v);

            let dp = (pix.x * this.pixelScale) * ux + (pix.y * this.pixelScale) * uy;
            let diff = this.p.map(dp, -50, 50, -1, 1, true);

            let finalC;
            if (diff > 0.1) {
                finalC = this.p.lerpColor(baseColor, this.p.color(0, 0, 0), diff * 0.3);
            } else if (diff < -0.1) {
                finalC = this.p.lerpColor(baseColor, this.p.color(255, 255, 255), -diff * 0.2);
            } else {
                finalC = baseColor;
            }

            let wobble = this.p.map(flap, -1, 1, -2, 2);
            if (pix.v > 8) px += wobble;

            let displayColor = this.p.color(this.p.red(finalC), this.p.green(finalC), this.p.blue(finalC), fishOpacity);
            
            this.p.fill(displayColor);
            this.p.rect(px, py, this.pixelScale, this.pixelScale);
        }
    }
}
