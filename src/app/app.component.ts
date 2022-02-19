import { AfterViewInit, Component } from '@angular/core';
import { Universe } from './universe';

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
export class AppComponent implements AfterViewInit {

  universe: Universe = new Universe('#canvas', '#gen', 500, 500);

  ngAfterViewInit(): void {
    this.universe.initialize();
  }

}
