// ocean-sketch.js

// 1. Ensure the global registry object exists.
window.p5Sketches = window.p5Sketches || {};

// 2. Add this sketch's function to the registry using its theme name as the key.
window.p5Sketches['ocean'] = (p) => {
    let time = 0;
    let fish = [];
    let bobber;
    let rodX, rodY;
    let messageEl, tensionBar, progressBar;

    // Define the tropical colors once in setup for efficiency
    let waterColor1, waterColor2, sandColor;

    // --- Fish class (manta rays) ---
    class Fish {
        constructor() {
            this.x = p.random(p.width);
            this.y = p.random(p.height);
            this.noiseOffsetX = p.random(1000);
            this.noiseOffsetY = p.random(1000);
            this.size = p.random(40, 60);
            this.vx = 0;
            this.vy = 0;
            this.flapOffset = p.random(p.TWO_PI);

            // pixel pattern for manta ray
            this.basePattern = [
                [0,0,1,0,0,0,1,0,0],
                [0,1,1,1,1,1,1,1,0],
                [1,1,1,1,1,1,1,1,1],
                [0,1,1,1,1,1,1,1,0],
                [0,0,1,1,1,1,1,0,0],
                [0,0,0,0,1,0,0,0,0],
                [0,0,0,0,1,0,0,0,0],
                [0,0,0,0,1,0,0,0,0],
            ];
            this.patternCenterX = p.floor(this.basePattern[0].length / 2);
            this.patternCenterY = p.floor(this.basePattern.length / 2);
        }
        rotatePattern(angle) {
            const rotated = new Set();
            const cosA = p.cos(angle), sinA = p.sin(angle);
            for (let y=0; y<this.basePattern.length; y++) {
                for (let x=0; x<this.basePattern[y].length; x++) {
                    if (this.basePattern[y][x]===1) {
                        const relX = x - this.patternCenterX;
                        const relY = y - this.patternCenterY;
                        const rotX = p.round(relX*cosA - relY*sinA);
                        const rotY = p.round(relX*sinA + relY*cosA);
                        rotated.add(`${rotX},${rotY}`);
                    }
                }
            }
            return Array.from(rotated).map(s => s.split(",").map(Number));
        }
        update() {
            let angle = p.noise(this.noiseOffsetX + time*0.1, this.noiseOffsetY + time*0.1) * p.TWO_PI * 2;
            const speed = p.map(this.size, 40, 60, 2.5, 1.5);
            this.vx = p.cos(angle) * speed;
            this.vy = p.sin(angle) * speed;
            this.x += this.vx;
            this.y += this.vy;
            const pad = this.size*2;
            if (this.x < -pad) this.x = p.width + pad;
            if (this.x > p.width + pad) this.x = -pad;
            if (this.y < -pad) this.y = p.height + pad;
            if (this.y > p.height + pad) this.y = -pad;
        }
        display() {
            p.noStroke();
            const gridX = p.round(this.x/20)*20;
            const gridY = p.round(this.y/20)*20;
            const mag = p.sqrt(this.vx*this.vx + this.vy*this.vy);
            if (mag===0) return;
            const ux = this.vx/mag, uy = this.vy/mag;
            const ang = p.atan2(this.vy,this.vx)+p.PI/2;
            const coords = this.rotatePattern(ang);
            const flap = p.sin(time*5 + this.flapOffset);
            for (const c of coords) {
                let px = gridX + c[0]*20;
                let py = gridY + c[1]*20;
                let dp = (c[0]*20)*ux + (c[1]*20)*uy;
                let diff = p.map(dp, -100,100,-1,1,true);
                let noiseCol = p.noise(px*0.005,py*0.005,time*0.1);
                let baseC = p.lerpColor(waterColor1, waterColor2, noiseCol);
                let finalC;
                if (diff>0) {
                    let dark = p.color(0,40,60,200);
                    finalC = p.lerpColor(baseC, dark, diff * p.map(flap,-1,1,0.4,1));
                } else {
                    let light = p.color(255,255,200,150);
                    finalC = p.lerpColor(baseC, light, -diff*0.5);
                    let turb = -diff * p.map(flap,-1,1,0,1)*6;
                    px += p.random(-turb,turb);
                    py += p.random(-turb,turb);
                }
                let d2 = p.sqrt((c[0]*20)**2 + (c[1]*20)**2);
                let darkF = p.map(d2,0,80,0.4,0,true);
                let cenC = p.lerpColor(finalC, p.color(0,40,60,200), darkF);
                p.fill(cenC);
                p.rect(p.round(px/20)*20,p.round(py/20)*20,20,20);
            }
        }
    }

    // --- Bobber class (fishing mini-game) ---
    class Bobber {
        constructor(p) {
            this.p = p;
            this.reset();
            this.prevMouse = p.createVector(0, 0);
        }
        reset() {
            this.x = null; this.y = null;
            this.state = 'idle';
            this.tension = 0;
            this.catchProgress = 0;
            this.fish = null;
            this.fishPullAngle = 0;
            this.fishPullStrength = 0;
            this.pullTimer = 0;
        }
        drop(x,y) {
            this.x=x; this.y=y;
            this.state='floating';
            this.tension=0; this.catchProgress=0;
        }
        startFight(f) {
            this.fish = f;
            this.state='hooked';
            this.tension=30;
            this.catchProgress=0;
            this.pullTimer=0;
        }
        update(arr) {
            const p=this.p;
            if (this.state==='floating') {
                this.y += p.sin(p.frameCount*0.1)*0.5;
                for (let f of arr) {
                    if (p.dist(this.x,this.y,f.x,f.y) < f.size && p.random()<0.01) {
                        this.startFight(f);
                        if (window.messageEl) messageEl.textContent='Fight the fish!';
                        break;
                    }
                }
            } else if (this.state==='hooked') {
                this.pullTimer--;
                if (this.pullTimer<=0) {
                    this.fishPullAngle = p.random(p.TWO_PI);
                    this.fishPullStrength = p.random(0.5,2);
                    this.pullTimer = p.int(p.random(30,90));
                }

                this.fish.x += p.cos(this.fishPullAngle)*this.fishPullStrength*2;
                this.fish.y += p.sin(this.fishPullAngle)*this.fishPullStrength*2;
                this.fish.x = p.constrain(this.fish.x,0,p.width);
                this.fish.y = p.constrain(this.fish.y,0,p.height);
                this.x = this.fish.x; this.y = this.fish.y;

                let playerPull = 0;
                if (p.mouseIsPressed) {
                    const mp = p.createVector(p.mouseX,p.mouseY);
                    const dir = mp.copy().sub(this.x,this.y);
                    const mag = dir.mag();
                    if (mag>0) {
                        dir.normalize();
                        const opp = p.createVector(-p.cos(this.fishPullAngle),-p.sin(this.fishPullAngle));
                        playerPull = p.max(0, dir.dot(opp))*2;
                    }
                }
                this.tension += this.fishPullStrength*0.6 - playerPull;
                this.tension *= 0.97;
                this.tension = p.constrain(this.tension,0,100);

                if (this.tension>25 && this.tension<75) {
                    this.catchProgress += 0.5;
                } else if (this.tension<25) {
                    this.catchProgress -= 0.2;
                }
                this.catchProgress = p.constrain(this.catchProgress,0,100);

                if (window.tensionBar) tensionBar.style.width=`${this.tension}%`;
                if (window.progressBar) progressBar.style.width=`${this.catchProgress}%`;

                if (this.catchProgress>=100) {
                    this.state='caught';
                    if (window.messageEl) messageEl.textContent='You caught one! Click to cast.';
                }
                if (this.tension>=99.9) {
                    this.state='broken';
                    if (window.messageEl) messageEl.textContent='The line snapped! Click to cast.';
                }
            } else if (this.state==='caught' || this.state==='broken') {
                this.pullTimer++;
                if (this.pullTimer>120) this.reset();
            }
        }
        display(rodX,rodY) {
            const p=this.p;
            if (this.state==='idle') return;
            p.stroke(100);
            p.line(rodX,rodY,this.x,this.y);
            p.noStroke();
            p.fill(this.state==='broken'? 'red':'white');
            p.ellipse(this.x,this.y,20);
        }
    }

    p.setup = () => {
        const container = document.getElementById('canvas-container');
        p.createCanvas(container.offsetWidth, container.offsetHeight).parent(container);
        p.noStroke();
        waterColor1 = p.color(32,178,170,150);
        waterColor2 = p.color(0,255,255,150);
        sandColor   = p.color(194,178,128);
        for (let i=0;i<15;i++) fish.push(new Fish());
        bobber = new Bobber(p);
        rodX = p.width/2; rodY=0;
        p.textSize(16);
        messageEl = document.getElementById('message');
        tensionBar = document.getElementById('tensionBar');
        progressBar = document.getElementById('progressBar');
        if (tensionBar) tensionBar.style.width='0%';
        if (progressBar) progressBar.style.width='0%';
    };

    p.draw = () => {
        p.background(sandColor);
        // water base
        for (let x=0;x<p.width; x+=20) {
            for (let y=0;y<p.height; y+=20) {
                let wn = p.noise(x*0.005,y*0.005,time*0.1);
                p.fill(p.lerpColor(waterColor1, waterColor2, wn));
                p.rect(x,y,20,20);
            }
        }
        // fish
        fish.forEach(f => { f.update(); f.display(); });
        // caustics & clouds
        for (let x=0;x<p.width; x+=20) {
            for (let y=0;y<p.height; y+=20) {
                let cn = p.noise(x*0.02+time*0.3, y*0.02+time*0.3);
                if (cn>0.65) { p.fill(255,255,200,cn*80); p.rect(x,y,20,20); }
                if (x%40===0 && y%40===0) {
                    let cl = p.noise(x*0.001+time*0.02,y*0.002+time*0.02);
                    if (cl>0.5) { p.fill(255,255,255,(cl-0.5)*60); p.rect(x,y,40,40); }
                }
            }
        }
        // bobber
        bobber.update(fish);
        bobber.display(rodX,rodY);
        time += 0.02;
    };

    p.mousePressed = () => {
        if (bobber.state === 'idle') {
            rodX = p.mouseX;
            rodY = 0;
            bobber.drop(p.mouseX, p.mouseY);
            if (messageEl) messageEl.textContent='Waiting for a bite...';
        } else if (bobber.state === 'floating') {
            bobber.reset();
            if (tensionBar) tensionBar.style.width='0%';
            if (progressBar) progressBar.style.width='0%';
            if (messageEl) messageEl.textContent='Click to cast';
        } else if (bobber.state === 'caught' || bobber.state === 'broken') {
            bobber.reset();
            if (tensionBar) tensionBar.style.width='0%';
            if (progressBar) progressBar.style.width='0%';
            if (messageEl) messageEl.textContent='Click to cast';
        }
    };

    p.windowResized = () => {
        const container = document.getElementById('canvas-container');
        p.resizeCanvas(container.offsetWidth, container.offsetHeight);
    };
};