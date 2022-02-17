// Two competitive approach:
//
// a)
// https://github.com/lemire/FastBitSet.js/
// Manipulate quickly set of data when using small integers. Here, bit


// Perf improvements ideas:
// When walking through cells, have condition that says "This cell is necessarily alive because x,y,z so we skip check"
// Ex: some random number like #45 would mean "I'm a cell surrounded on NW, N, NE by alive cells".
// Information that would allow knowing that there are no neighbour in a radius of 10.
// Maybe a Hash would do better than an array iteration
// Techniquement, on pourrait simplement remonter le hash des alive cells, et éliminer du hash les mortes.
// Même avec un univers à moitié plein, on aurait beaucoup moins de données à traiter inutilement.

// SetCells de départ (seed)
// SetCell. 
// live => hash.add(x,y) imageData.draw(black)
// dead => hash.remove(x,y) imageData.draw(transparent)
// Si on peut remonter les cells comme un tree - ou conserver dans une partie du data la position relative du parent précédent ou même sa position cardinale -,
// on pourrait arriver à un algo où on sait sans 8 ifs si on a des neighbours.

// Autres idées: multiplexing dans un HASH.

import { AfterViewInit, Component, OnInit } from '@angular/core';
import { GlHelper } from './gl-helper';
import { RLETools } from './rle-tools';
interface Seed {
  rle: string,
  x: number,
  y: number,
  data: boolean[][]
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, AfterViewInit {

  canvas: HTMLCanvasElement;

  gl: GlHelper = new GlHelper();

  gridWidth = 500;
  gridHeight = 500;
  grid: boolean[][] = [];
  nextGrid: boolean[][] = [];

  gridHash: Float32Array;
  nextGridHash: Float32Array;

  seeds?: Seed[];

  genEl: HTMLSpanElement;
  gen: number = 0;

  modes: string[] = [ 'Add', 'Invert', 'Remove', 'Capture Seed', 'Insert Seed' ];
  mode = 'Add';
  
  ngOnInit(): void {
    this.seeds = JSON.parse(localStorage.getItem('seeds')) || [];
  }

  ngAfterViewInit(): void {
    this.canvas = document.querySelector('#canvas');
    this.updateSeedCanvas();
    this.genEl = document.querySelector('#gen');
    this.gl.setup(this.canvas);

    this.gridHash = new Float32Array(this.gridWidth * this.gridHeight * 5);
    this.nextGridHash = new Float32Array(this.gridWidth * this.gridHeight * 5);

    // Place the initial cells
    for (let i = 0; i < this.gridWidth; i++) {
      for (let j = 0; j < this.gridHeight; j++) {
        const live = Math.floor(Math.random() * 10) > 8;
        this.setCell(i, j, live, true, true);
      }
    }
    
    setTimeout(() => this.evolveAllCells(), 50);
  }

  updateSeedCanvas(): void {
    for (let i = 0; i < this.seeds.length; i++) {
      const seedCanvas = document.getElementById('seed' + i) as HTMLCanvasElement;
      const ctx = seedCanvas.getContext('2d');

      const data = this.seeds[i].data;
      let x = 0;
      let y = 0;

      for (let line of data) {
        x = 0;
        for (let pixel of line) {
          ctx.fillStyle = pixel ? "#000000ff" : '#ffffffff';
          ctx.fillRect(x, y, 5, 5);
          x += 5;
        }
        y += 5;
      }
    }
  }

  nextGridStuff: any[] = [];

  setCell(x: number, y: number, live: boolean, updateCurrentGrid: boolean = true, updateNextGrid: boolean = false): void {
    
    if (updateCurrentGrid) {
      this.grid[x] = this.grid[x] || new Array();
      this.grid[x][y] = live;
      this.setHashPointValue(this.gridHash, x, y, live);  
    }
    
    // When evolving cell
    // When pre-visualizing changes (add cell, insert seed, etc)
    if (updateNextGrid) {
      this.nextGrid[x] = this.nextGrid[x] || new Array();
      this.nextGrid[x][y] = live;
      this.setHashPointValue(this.nextGridHash, x, y, live);
    }
  }

  getHashPos = (x: number, y: number) => ((x * this.gridWidth) + y) * 5;

  setHashPointValue(hash: Float32Array, x: number, y: number, live: boolean): void {
    const pos = this.getHashPos(x, y);
    hash[pos + 0] = -1 + (x / this.gridWidth * 2);
    hash[pos + 1] = 1 - (y / this.gridHeight * 2);
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
      const live = this.mode === 'Add' ? true : this.mode === 'Invert' ? !this.grid[x][y] : false;
      this.setCell(x, y, live, true, true);
      this.draw();
    }
  }

  captureSeed(): void {
    if (!this.captureSeedStart || !this.captureSeedEnd) {
      return;
    }

    const rle = RLETools.convertGridCaptureToRle(this.grid, this.captureSeedStart.x, this.captureSeedStart.y, this.captureSeedEnd.x, this.captureSeedEnd.y)
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

  _lastTime: number = performance.now();
  _lastGen: number = 0;
  evolveAllCells(): void {

    // TODO: Here is the pattern that could be improved to be a tree-walking based pattern
    // Idea -> Maybe only analyze from top-left to bottom-right so we always know a cell has already been checked 
    for (let x = 0; x < this.gridWidth; x++) {
      for (let y = 0; y < this.gridHeight; y++) {
        this.evolveCell(x, y);
      }
    }

    if (this.isRunning) {
      const now = performance.now();
      const elapsed = (now - this._lastTime);
      const fps = Math.round(1000 / elapsed); 

      this.grid = JSON.parse(JSON.stringify(this.nextGrid)); // faster for now
      this.gridHash = this.nextGridHash.slice(0); // JSON.parse(JSON.stringify(this.nextGridHash));
      this.draw();
      this.genEl.innerText = (this.gen++).toString() + ' GENS - ' + fps + ' FPS';
      this._lastTime = now;
      this._lastGen = this.gen;
    }

    setTimeout(() => this.evolveAllCells());
  }

  draw(): void {
    // this.gl.drawPoints(this.grid, this.gridWidth, this.gridHeight);
    this.gl.drawHash(this.gridHash, this.gridWidth, this.gridHeight);
  }

  evolveCell(x: number, y: number): boolean {
    const liveNeighbours = this.getLiveNeighbours(x, y);
    const isAlive = this.getHashPointAlive(this.gridHash, x, y); // this.grid[x][y];
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
        if (!this.grid[nX]) { this.grid[nX] = new Array(); }
        alives += (this.grid[nX][nY] ? 1 : 0);
        if (alives > 3) { return alives; }
      }
    }
    return alives;
  }
}
