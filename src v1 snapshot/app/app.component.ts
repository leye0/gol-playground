// Two competitive approach:
//
// a)
// https://github.com/lemire/FastBitSet.js/
// Manipulate quickly set of data when using small integers. Here, bit

// b)
// // Manipulate a 32 bits array instead of boolean, so we can directly use it with canvasContext.putImageData(0, 0)
// let imageData = ctx.createImageData(c.width, c.height);
// let buffer = new Uint32Array(imageData.data.buffer);
// for (let i=0; i < buffer.length; i++) {
//     if (someLogicRefferingToOriginalImageData == true) {
//         buffer[i] = 0xFFFFFFFF; // AA BB GG RR
//     } else {
//         buffer[i] = 0xFF000000;
//     }
// }
// imageData.data.set(new Uint8ClampedArray(buffer));
// ctx.putImageData(imageData, 0, 0);
// Walk through buffer

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

import { AfterViewInit, Component } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements AfterViewInit {

  canvas: HTMLCanvasElement;

  gridWidth = 200;
  gridHeight = 200;
  grid: boolean[][] = [];
  nextGrid: boolean[][] = [];

  ngAfterViewInit(): void {
    this.canvas = document.querySelector('canvas');

    // Place the initial cells
    for (let i = 0; i < this.gridWidth; i++) {
      for (let j = 0; j < this.gridHeight; j++) {
        const live = Math.floor(Math.random() * 10) > 5;
        this.setCell(i, j, live);
      }
    }

    this.nextGrid = this.grid;
    
    setTimeout(() => this.evolveAllCells(), 100);
  }

  setCell(x: number, y: number, life: boolean = true): void {
    this.grid[x] = this.grid[x] || new Array();
    this.grid[x][y] = life;
  }

  draw($event: MouseEvent): void {
    const x = $event.offsetX;
    const y = $event.offsetY;
    const live = !this.grid[x][y];
    this.setCell($event.offsetX, $event.offsetY, live);
    const ctx = this.canvas.getContext("2d");
    ctx.fillStyle = live ? "#000000ff" : "#ffffffff"
    ctx.fillRect(x, y, 1, 1);
  }

  evolveAllCells(): void {

    const ctx = this.canvas.getContext("2d");

    for (let x = 0; x < this.gridWidth; x++) {
      for (let y = 0; y < this.gridHeight; y++) {
        const live = this.evolveCell(x, y);
        ctx.fillStyle = live ? "#000000ff" : "#ffffffff"
        ctx.fillRect(x, y, 1, 1);
      }
    }

    this.grid = JSON.parse(JSON.stringify(this.nextGrid));

    setTimeout(() => this.evolveAllCells(), 100);
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


// let width = 500, height = 500;
// let data32 = new Uint32Array(width * height);
// let screen = [];

// // Fill with orange color
// for(let x = 0; x < width; x++ ){
//   screen[x] = [];
//   for(let y = 0; y < height; y++ ){
//     screen[x][y] = "#ff7700";  // orange to check final byte-order
//   }
// }

// // Flatten array
// for(let x, y = 0, p = 0; y < height; y++){
//   for(x = 0; x < width; x++) {
//     data32[p++] = str2uint32(screen[x][y]);
//   }
// }

// function str2uint32(str) {
//   let n = ("0x" + str.substr(1))|0;
//   return 0xff000000 | (n << 16) | (n & 0xff00) | (n >>> 16)
// }

// let idata = new ImageData(new Uint8ClampedArray(data32.buffer), width, height);
// c.getContext("2d").putImageData(idata, 0, 0);