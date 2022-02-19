## Algo Check by tree

1. Initial refactoring: keep it as is, but pass only live cells to renderer.

2. 

I think it's always good to keep two hashes, one with the grid, one with the live cells.


for (let livingCell of cells) {
    check cells around
}


x: 498  y: 498  i:  249498    j: 1247490





## Other ideas:

Two competitive approach:

a)
https://github.com/lemire/FastBitSet.js/
Manipulate quickly set of data when using small integers. Here, bit


Perf improvements ideas:
When walking through cells, have condition that says "This cell is necessarily alive because x,y,z so we skip check"
Ex: some random number like #45 would mean "I'm a cell surrounded on NW, N, NE by alive cells".
Information that would allow knowing that there are no neighbour in a radius of 10.
Maybe a Hash would do better than an array iteration
Techniquement, on pourrait simplement remonter le hash des alive cells, et éliminer du hash les mortes.
Même avec un univers à moitié plein, on aurait beaucoup moins de données à traiter inutilement.

SetCells de départ (seed)
SetCell. 
live => hash.add(x,y) imageData.draw(black)
dead => hash.remove(x,y) imageData.draw(transparent)
Si on peut remonter les cells comme un tree - ou conserver dans une partie du data la position relative du parent précédent ou même sa position cardinale -,
on pourrait arriver à un algo où on sait sans 8 ifs si on a des neighbours.

Other idea: storing neighbor info in each buffer value.
There is a concept similar to what I think here: https://codereview.stackexchange.com/a/42790/110939
Once 2d loop algo will be replaced by walking only living cells, it will be easier to integrate multiplexing/centralized-state optimizations like that.

TODO:
1. Work on universe class, GL class, RLE class and Debug(or other name) class so that there is no more stuff in the app.component.ts.
2. Universe class should hold info about density, fps, generation#, etc.
3. Seed class should work independantly from the rest
4. GL class should eventually be improved to contain zoom/drag, and horizontal/vertical grid lines.
5. Rework UI

