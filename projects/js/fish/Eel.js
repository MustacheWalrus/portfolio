class Eel extends Fish {
    constructor(p, data) {
        super(p, data);
        this.velocity.setMag(this.data.movement.speed);
        this.pixelScale = this.size;

        // Animation properties from JSON
        this.anim = this.data.animation;
        this.slitherOffset = this.p.random(100);

        // Movement
        this.move = this.data.movement;

        // --- Variety and Color ---
        this.variety = this.chooseVariety();
        this.patternSeed = this.p.random(1000);
        this.palette = {};
        for (const colorName in this.data.palette) {
            this.palette[colorName] = this.p.color(this.data.palette[colorName]);
        }
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

    update(time) {
        this.position.add(this.velocity);
        
        const pad = this.anim.length * this.anim.spacing;
        if (this.position.x < -pad) this.position.x = this.p.width + pad;
        if (this.position.x > this.p.width + pad) this.position.x = -pad;
        if (this.position.y < -pad) this.position.y = this.p.height + pad;
        if (this.position.y > this.p.height + pad) this.position.y = -pad;

        if (this.p.random() < this.move.turnChance) {
            this.velocity.rotate(this.p.random(-this.move.turnAngle, this.move.turnAngle));
        }
    }

    display(waterColor1, waterColor2, time, fishOpacity) {
        this.p.noStroke();
        
        const type = this.variety.type;
        const colors = this.variety.colors.map(name => this.palette[name]);

        // This is the core eel drawing logic, which we will call from the specific display methods
        const drawEelBody = (colorFunc) => {
            let angle = this.velocity.heading() + this.p.PI;
            let cosA = this.p.cos(angle);
            let sinA = this.p.sin(angle);
            let perpX = -sinA;
            let perpY = cosA;

            for (let i = 0; i < this.anim.length; i++) {
                let backDist = i * this.anim.spacing;
                let baseX = this.position.x - cosA * backDist;
                let baseY = this.position.y - sinA * backDist;

                let wave = this.p.sin(time * this.anim.slitherSpeed + i * 0.4 + this.slitherOffset) * this.anim.slitherAmplitude;
                
                let damper = (i < 3) ? this.p.map(i, 0, 3, 0.2, 1) : 1.0;
                wave *= damper;

                let px = baseX + perpX * wave;
                let py = baseY + perpY * wave;

                let gridX = this.p.round(px / this.pixelScale) * this.pixelScale;
                let gridY = this.p.round(py / this.pixelScale) * this.pixelScale;

                // Get the color for this specific segment
                const segmentColor = colorFunc(i, px, py);
                let displayColor = this.p.color(this.p.red(segmentColor), this.p.green(segmentColor), this.p.blue(segmentColor), fishOpacity);
                this.p.fill(displayColor);

                this.p.rect(gridX, gridY, this.pixelScale, this.pixelScale);

                // --- Dorsal Fin Logic ---
                if (type === 'dorsalFin') {
                    let finColor = this.p.color(this.p.red(colors[1]), this.p.green(colors[1]), this.p.blue(colors[1]), fishOpacity);
                    this.p.fill(finColor);
                    // Offset the fin "up" relative to the eel's body
                    let finX = gridX - perpX * this.pixelScale * 0.8;
                    let finY = gridY - perpY * this.pixelScale * 0.8;
                    this.p.rect(finX, finY, this.pixelScale * 0.8, this.pixelScale * 0.8);
                }
            }
        };

        switch (type) {
            case 'solid':
                drawEelBody(() => colors[0]);
                break;
            case 'overlay':
                drawEelBody(() => colors[0]); // Draw base
                drawEelBody(() => colors[1]); // Draw transparent overlay
                break;
            case 'stripes':
                drawEelBody((i) => (this.p.floor(i / 3) % 2 === 0) ? colors[0] : colors[1]);
                break;
            case 'splotches':
                drawEelBody((i, px, py) => {
                    let n = this.p.noise(px * 0.1 + this.patternSeed, py * 0.1);
                    return n > 0.6 ? colors[1] : colors[0];
                });
                break;
            case 'dorsalFin':
                drawEelBody(() => colors[0]);
                break;
            default:
                drawEelBody(() => colors[0]);
        }
    }
}
