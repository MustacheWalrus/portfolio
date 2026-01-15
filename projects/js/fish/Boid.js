class Boid extends Fish {
    constructor(p, data) {
        super(p, data);
        this.velocity.setMag(p.random(2, 4));
        this.acceleration = this.p.createVector();

        // Movement params from JSON
        this.maxSpeed = this.data.movement.maxSpeed;
        this.maxForce = this.data.movement.maxForce;

        // Flocking params
        this.flocking = this.data.flocking;

        // Pattern and rendering
        this.basePattern = this.data.basePattern;
        this.patternCenterX = 0;
        this.patternCenterY = 0;
        this.pixelScale = this.size;

        // Colors
        this.primaryColor = this.p.color(...this.data.colors.primary);
        this.shadowColor = this.p.color(...this.data.colors.shadow);
    }

    // --- FLOCKING BEHAVIORS ---
    align(boids) {
        let perceptionRadius = this.flocking.alignPerception;
        let steering = this.p.createVector();
        let total = 0;
        for (let other of boids) {
            if (other instanceof Boid) {
                let d = this.p.dist(this.position.x, this.position.y, other.position.x, other.position.y);
                if (other != this && d < perceptionRadius) {
                    steering.add(other.velocity);
                    total++;
                }
            }
        }
        if (total > 0) {
            steering.div(total);
            steering.setMag(this.maxSpeed);
            steering.sub(this.velocity);
            steering.limit(this.maxForce);
        }
        return steering;
    }

    cohesion(boids) {
        let perceptionRadius = this.flocking.cohesionPerception;
        let steering = this.p.createVector();
        let total = 0;
        for (let other of boids) {
            if (other instanceof Boid) {
                let d = this.p.dist(this.position.x, this.position.y, other.position.x, other.position.y);
                if (other != this && d < perceptionRadius) {
                    steering.add(other.position);
                    total++;
                }
            }
        }
        if (total > 0) {
            steering.div(total);
            steering.sub(this.position);
            steering.setMag(this.maxSpeed);
            steering.sub(this.velocity);
            steering.limit(this.maxForce);
        }
        return steering;
    }

    separation(boids) {
        let perceptionRadius = this.flocking.separationPerception;
        let steering = this.p.createVector();
        let total = 0;
        for (let other of boids) {
            if (other instanceof Boid) {
                let d = this.p.dist(this.position.x, this.position.y, other.position.x, other.position.y);
                if (other != this && d < perceptionRadius) {
                    let diff = p5.Vector.sub(this.position, other.position);
                    diff.div(d * d);
                    steering.add(diff);
                    total++;
                }
            }
        }
        if (total > 0) {
            steering.div(total);
            steering.setMag(this.maxSpeed);
            steering.sub(this.velocity);
            steering.limit(this.maxForce);
        }
        return steering;
    }

    flock(boids) {
        let alignment = this.align(boids);
        let cohesion = this.cohesion(boids);
        let separation = this.separation(boids);

        alignment.mult(this.flocking.alignMultiplier);
        cohesion.mult(this.flocking.cohesionMultiplier);
        separation.mult(this.flocking.separationMultiplier);

        this.acceleration.add(alignment);
        this.acceleration.add(cohesion);
        this.acceleration.add(separation);
    }

    update(time, flock) {
        this.flock(flock);
        this.position.add(this.velocity);
        this.velocity.add(this.acceleration);
        this.velocity.limit(this.maxSpeed);
        this.acceleration.mult(0);
        super.edges();
    }

    display(waterColor1, waterColor2, time, fishOpacity) {
        this.p.noStroke();
        const gridX = this.p.round(this.position.x / this.pixelScale) * this.pixelScale;
        const gridY = this.p.round(this.position.y / this.pixelScale) * this.pixelScale;

        let angle = this.velocity.heading() + this.p.PI / 2;
        const coords = this.rotatePattern(angle);
        
        const ux = this.velocity.x / this.maxSpeed;
        const uy = this.velocity.y / this.maxSpeed;

        for (const c of coords) {
            let px = gridX + c[0] * this.pixelScale;
            let py = gridY + c[1] * this.pixelScale;

            let dp = (c[0] * this.pixelScale) * ux + (c[1] * this.pixelScale) * uy;
            let diff = this.p.map(dp, -10, 10, -1, 1, true);

            let finalColor;
            if (diff > 0.1 || (c[1] > 0)) {
                finalColor = this.shadowColor;
            } else {
                finalColor = this.primaryColor;
            }

            // Apply fishOpacity
            let displayColor = this.p.color(this.p.red(finalColor), this.p.green(finalColor), this.p.blue(finalColor), fishOpacity);
            this.p.fill(displayColor);
            this.p.rect(px, py, this.pixelScale, this.pixelScale);
        }
    }

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
