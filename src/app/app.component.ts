// Two competitive approach:
//
// a)
// https://github.com/lemire/FastBitSet.js/
// Manipulate quickly set of data when using small integers. Here, bit


// Perf improvements ideas:
// When walking through cells, have condition that says "This cell is necessarily alive because x,y,z so we skip check"
// Ex: some random number like #45 would mean "I'm a cell surrounded on NW, N, NE by alive cells".
// Information that would allow knowing that there are no neighbour in a radius of 10.
// Maybe a Hash would do better than an array iteration
// Techniquement, on pourrait simplement remonter le hash des alive cells, et éliminer du hash les mortes.
// Même avec un univers à moitié plein, on aurait beaucoup moins de données à traiter inutilement.

// SetCells de départ (seed)
// SetCell. 
// live => hash.add(x,y) imageData.draw(black)
// dead => hash.remove(x,y) imageData.draw(transparent)
// Si on peut remonter les cells comme un tree - ou conserver dans une partie du data la position relative du parent précédent ou même sa position cardinale -,
// on pourrait arriver à un algo où on sait sans 8 ifs si on a des neighbours.

// Autres idées: multiplexing dans un HASH.

import { AfterViewInit, Component, OnInit } from '@angular/core';
import { GlHelper } from './gl';

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

    // Place the initial cells
    for (let i = 0; i < this.gridWidth; i++) {
      for (let j = 0; j < this.gridHeight; j++) {
        const live = Math.floor(Math.random() * 10) > 8;
        this.setCell(i, j, live);
      }
    }

    this.nextGrid = this.grid;
    
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

  setCell(x: number, y: number, life: boolean = true): void {
    this.grid[x] = this.grid[x] || new Array();
    this.grid[x][y] = life;
  }

  isRunning = true;
  toggleStopStart(): void {
    this.isRunning = !this.isRunning;
  }

  toggleMode(): void {
    const nextMode = this.modes.indexOf(this.mode) + 1;
    this.mode = nextMode >= this.modes.length ? this.modes[0] : this.modes[nextMode];
  }

  importRLE(): void {
    const rleData = document.querySelector('#rleData') as HTMLInputElement;
    const rle = rleData.value.replace(/6o/g, 'oooooo')
    .replace(/5o/g, 'ooooo')
    .replace(/4o/g, 'oooo')
    .replace(/3o/g, 'ooo')
    .replace(/2o/g, 'oo')
    .replace(/6b/g, 'bbbbbb')
    .replace(/5b/g, 'bbbbb')
    .replace(/4b/g, 'bbbb')
    .replace(/3b/g, 'bbb')
    .replace(/2b/g, 'bb');
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
              this.setCell(sx + x, sy + y, data[sy][sx]);
              this.nextGrid[sx + x][sy + y] = data[sy][sx];
            }
          }
          console.log(data);
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

    if (this.mode === 'Add' || this.mode === 'Invert' || this.mode === 'Remove') {
      const live = this.mode === 'Add' ? true : this.mode === 'Invert' ? !this.grid[x][y] : false;
      this.setCell(x, y, live);
      this.nextGrid[x][y] = live;
      this.draw();
    }
  }

  captureSeed(): void {
    const capture: string[][] = [];
    let top = 999999, left = 999999, right = -999999, bottom = -999999;
    for (let i = this.captureSeedStart.x; i < this.captureSeedEnd.x; i++) {
      for (let j = this.captureSeedStart.y; j < this.captureSeedEnd.y; j++) {
          let x = i - this.captureSeedStart.x;
          let y = j - this.captureSeedStart.y;
          if (!capture[y]) { capture[y] = new Array(); }
          const live = this.grid[i][j];
          capture[y][x] = live ? "o" : "b";
          if (live) {
            left = Math.min(left, x);
            right = Math.max(right, x);
            top = Math.min(top, y);
            bottom = Math.max(bottom, y);
          }
      }
    }

    const croppedCapture: string[][] = [];
    for (let i = left; i <= right; i++) {
      for (let j = top; j <= bottom; j++) {
        if (!croppedCapture[j-top]) { croppedCapture[j-top] = new Array(); }
          croppedCapture[j-top][i - left] = capture[j][i];
      }
    }

    const rebuiltArr = croppedCapture.map(line => [...line].map(c => c === 'o' ? true : false));
    const rle = croppedCapture.map(line => {
      return line.join('')
        .replace(/oooooo/g, '6o')
        .replace(/ooooo/g, '5o')
        .replace(/oooo/g, '4o')
        .replace(/ooo/g, '3o')
        .replace(/oo/g, '2o')
        .replace(/bbbbbb/g, '6b')
        .replace(/bbbbb/g, '5b')
        .replace(/bbbb/g, '4b')
        .replace(/bbb/g, '3b')
        .replace(/bb/g, '2b')
    }).join('$');
    const obj = {
      rle: rle,
      x: rebuiltArr[0].length,
      y: rebuiltArr.length,
      data: rebuiltArr
    };
    if (obj.x * obj.y < 6) {
      return;
    }

    this.seeds = JSON.parse(localStorage.getItem('seeds'));
    this.seeds = this.seeds || [];
    this.seeds.push(obj);
    localStorage.setItem('seeds', JSON.stringify(this.seeds));
    setTimeout(() => {
      this.updateSeedCanvas();      
    }, 100);
  }

  selectSeed(seed: Seed): void {
    this.selectedSeed = seed;
  }

  evolveAllCells(): void {

    // TODO: Here is the pattern that could be improved to be a tree-walking based pattern
    // Idea -> Maybe only analyze from top-left to bottom-right so we always know a cell has already been checked 
    for (let x = 0; x < this.gridWidth; x++) {
      for (let y = 0; y < this.gridHeight; y++) {
        this.evolveCell(x, y);
      }
    }

    if (this.isRunning) {
      this.grid = JSON.parse(JSON.stringify(this.nextGrid));
      this.draw();
      this.genEl.innerText = (this.gen++).toString();
    }

    setTimeout(() => this.evolveAllCells(), 10);
  }

  draw(): void {
    this.gl.drawPoints(this.grid, this.gridWidth, this.gridHeight);
  }

  evolveCell(x: number, y: number): boolean {
    const liveNeighbours = this.getLiveNeighbours(x, y);
    const isAlive = this.grid[x][y];
    let nextLife = false;
    if (isAlive && (liveNeighbours === 2 || liveNeighbours === 3)) {
      nextLife = true;
    }
    if (!isAlive && liveNeighbours === 3) {
      nextLife = true;
    }
    this.nextGrid[x][y] = nextLife;
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
