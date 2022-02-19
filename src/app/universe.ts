import { GlHelper } from './gl-helper';

import { RLETools } from './rle-tools';
interface Seed {
    rle: string,
    x: number,
    y: number,
    data: boolean[][]
}

export class Universe {

    

    canvas: HTMLCanvasElement;

    gl: GlHelper = new GlHelper();

    hash: Float32Array;
    hashNext: Float32Array;

    seeds: Seed[] = [];

    genEl: HTMLSpanElement;
    gen: number = 0;

    modes: string[] = ['Add', 'Invert', 'Remove', 'Capture Seed', 'Insert Seed'];
    mode = 'Add';

    _lastTime: number = performance.now();
    _lastGen: number = 0;

    constructor(
        public canvasQuerySelector: string,
        public generationQuerySelector: string,
        public width: number = 500,
        public height: number = 500) {
    }

    initialize(): void {
        this.canvas = document.querySelector(this.canvasQuerySelector);
        this.genEl = document.querySelector(this.generationQuerySelector);
        this.gl.setup(this.canvas);

        this.hash = new Float32Array(this.width * this.height * this.gl.totalComponents);
        this.hashNext = new Float32Array(this.width * this.height * this.gl.totalComponents);

        // Place the initial cells
        for (let i = 0; i < this.width; i++) {
            for (let j = 0; j < this.height; j++) {
                const live = Math.floor(Math.random() * 10) > 8;
                this.setCell(i, j, live, true, true);
            }
        }

        this.seeds = JSON.parse(localStorage.getItem('seeds')) || [];
        
        setTimeout(() => {
            this.updateSeedCanvas();
            this.evolveAllCells();
        }, 50);
    }

    updateSeedCanvas(): void {
        for (let i = 0; i < this.seeds.length; i++) {
            const seedCanvas = document.getElementById('seed' + i) as HTMLCanvasElement;
            const ctx = seedCanvas.getContext('2d');

            const data = this.seeds[i].data;
            let x = 0;
            let y = 0;

            for (const line of data) {
                x = 0;
                for (const pixel of line) {
                    ctx.fillStyle = pixel ? "#000000ff" : '#ffffffff';
                    ctx.fillRect(x, y, 5, 5);
                    x += 5;
                }
                y += 5;
            }
        }
    }

    setCell(x: number, y: number, live: boolean, updateCurrentGeneration: boolean = true, updateNextGeneration: boolean = false): void {

        if (updateCurrentGeneration) {
            this.setHashPointValue(this.hash, x, y, live);
        }

        // When evolving cell
        // When pre-visualizing changes (add cell, insert seed, etc)
        if (updateNextGeneration) {
            this.setHashPointValue(this.hashNext, x, y, live);
        }
    }

    getHashPos = (x: number, y: number) => ((x * this.width) + y) * this.gl.totalComponents;

    translateX: number = 0;
    translateY: number = 0;

    setHashPointValue(hash: Float32Array, x: number, y: number, live: boolean): void {
        const pos = this.getHashPos(x, y);
        hash[pos + 0] = -1 + ((x + this.translateX) / this.width * 2);
        hash[pos + 1] = 1 - ((y + this.translateY) / this.height * 2);
        hash[pos + 2] = live ? 0 : 1; // r
        hash[pos + 3] = live ? 0 : 1; // g
        hash[pos + 4] = live ? 0 : 1; // b
    }

    getHashPointAlive = (hash: Float32Array, x: number, y: number) => hash[this.getHashPos(x, y) + 2] === 0;

    isRunning = true;
    toggleStopStart(): void {
        this.isRunning = !this.isRunning;
    }

    toggleMode(): void {
        const nextMode = this.modes.indexOf(this.mode) + 1;
        this.mode = nextMode >= this.modes.length ? this.modes[0] : this.modes[nextMode];
    }

    captureSeedStart?: { x: number, y: number };
    captureSeedEnd?: { x: number, y: number };
    selectedSeed?: Seed;
    isInAction = false;
    action($event: PointerEvent, action: string = ''): void {

        const x = Math.floor($event.offsetX) + 2; // TODO: Fix this offset problem
        const y = Math.floor($event.offsetY) + 2;

        if (action == 'd') {

            if (this.mode === 'Insert Seed') {
                if (this.selectedSeed) {
                    const data = this.selectedSeed.data;
                    for (let sx = 0; sx < this.selectedSeed.x; sx++) {
                        for (let sy = 0; sy < this.selectedSeed.y; sy++) {
                            this.setCell(sx + x, sy + y, data[sy][sx], true, true);
                        }
                    }
                    this.draw();
                }

                this.isInAction = false;
                return;
            }

            if (this.mode === 'Capture Seed') {
                this.captureSeedStart = { x, y };
            }
            this.isInAction = true;
        }
        if (action == 'u') {
            if (this.mode === 'Capture Seed') {
                this.captureSeedEnd = { x, y };
                this.captureSeed();
            }
            this.isInAction = false;
            return;
        }
        if (!action && !this.isInAction) { return; }

        if (this.mode === 'Add' || this.mode === 'Invert' || this.mode === 'Remove') {
            const live = this.mode === 'Add' ? true : this.mode === 'Invert' ? !this.getHashPointAlive(this.hash, x, y) : false;
            this.setCell(x, y, live, true, true);
            this.draw();
        }
    }

    captureSeed(): void {
        if (!this.captureSeedStart || !this.captureSeedEnd) {
            return;
        }

        const rle = RLETools.convertCaptureToRle(this.hash, this.captureSeedStart.x, this.captureSeedStart.y, this.captureSeedEnd.x, this.captureSeedEnd.y, this.width)
        this.seeds = JSON.parse(localStorage.getItem('seeds')) || [];
        this.seeds.push(rle);
        localStorage.setItem('seeds', JSON.stringify(this.seeds));
        setTimeout(() => this.updateSeedCanvas(), 100);
    }

    importRLE(): void {
        const rleData = document.querySelector('#rleData') as HTMLInputElement;
        const rle = RLETools.importRLE(rleData.value);
        this.seeds = JSON.parse(localStorage.getItem('seeds')) || [];
        this.seeds.push(rle);
        localStorage.setItem('seeds', JSON.stringify(this.seeds));
        setTimeout(() => this.updateSeedCanvas(), 100);
    }

    selectSeed(seed: Seed): void {
        this.selectedSeed = seed;
    }

    evolveAllCells(): void {
        for (let x = 0; x < this.width; x++) {
            for (let y = 0; y < this.height; y++) {
                this.evolveCell(x, y);
            }
        }

        if (this.isRunning) {
            const now = performance.now();
            const elapsed = (now - this._lastTime);
            const fps = Math.round(1000 / elapsed);

            this.hash = this.hashNext.slice(0);
            this.draw();
            this.genEl.innerText = (this.gen++).toString() + ' GENS - ' + fps + ' FPS';
            this._lastTime = now;
            this._lastGen = this.gen;
        }

        setTimeout(() => this.evolveAllCells());
    }

    draw(): void {
        this.gl.drawHash(this.hash, this.width, this.height);
    }

    evolveCell(x: number, y: number): boolean {
        const liveNeighbours = this.getLiveNeighbours(x, y);
        const isAlive = this.getHashPointAlive(this.hash, x, y);
        let nextLife = false;
        if (isAlive && (liveNeighbours === 2 || liveNeighbours === 3)) {
            nextLife = true;
        }
        if (!isAlive && liveNeighbours === 3) {
            nextLife = true;
        }
        this.setCell(x, y, nextLife, false, true);
        return nextLife;
    }

    getLiveNeighbours(x: number, y: number): number {
        let alives = 0;
        for (let i = -1; i < 2; i++) {
            for (let j = -1; j < 2; j++) {
                const nX = x + i;
                const nY = y + j;
                if (nX == x && nY == y) {
                    continue;
                }
                alives += (this.getHashPointAlive(this.hash, nX, nY) ? 1 : 0);
                if (alives > 3) { return alives; }
            }
        }
        return alives;
    }

    left(): void {
        this.translateX++;
    }

    right(): void {
        this.translateX--;
    }
}