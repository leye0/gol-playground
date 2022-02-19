import { Rle } from './rle';

export class RLETools {

    static convertCaptureToRle(gridHash: Float32Array, x1: number, y1: number, x2: number, y2: number, gridWidth: number): Rle {
        const capture: string[][] = [];
        let top = 999999, left = 999999, right = -999999, bottom = -999999;
        for (let i = x1; i < x2; i++) {
            for (let j = y1; j < y2; j++) {
                let x = i - x1;
                let y = j - y1;
                if (!capture[y]) { capture[y] = new Array(); }
                const live = RLETools.getHashPointAlive(gridHash, i, j, gridWidth);
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
                if (!croppedCapture[j - top]) { croppedCapture[j - top] = new Array(); }
                croppedCapture[j - top][i - left] = capture[j][i];
            }
        }

        return RLETools.convertBOBOBOToRLE(croppedCapture);
    }

    // Todo: Place it in a HashUniverse, something like that
    //          
    private static getHashPointAlive = (hash: Float32Array, x: number, y: number, gridWidth: number) => hash[RLETools.getHashPos(x, y, gridWidth) + 2] === 0;

    private static getHashPos = (x: number, y: number, gridWidth: number) => ((x * gridWidth) + y) * 5;

    private static convertBOBOBOToRLE(data: string[][]): Rle {
        const rebuiltArr = data.map(line => [...line].map(c => c === 'o' ? true : false));
        const rleString = data.map(line => {
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
        const rle = {
            rle: rleString,
            x: rebuiltArr[0].length,
            y: rebuiltArr.length,
            data: rebuiltArr
        } as Rle;

        if (rle.x * rle.y < 4) {
            return undefined;
        }
        return rle;
    }

    static importRLE(rleData: string): Rle {

        let rebuiltArr: boolean[][] = [];
        
        const originalRleData = JSON.parse(JSON.stringify(rleData));

        rleData = rleData.substring(0, rleData.indexOf('!') > -1 ? rleData.indexOf('!') : rleData.length);

        for (let cr of ['\\$', 'o', 'b']) {
            for (let i = 70; i > 0; i--) {
                const reg = new RegExp(i.toString() + cr, 'g');
                rleData = rleData.replace(reg, cr.repeat(i));
            }
        }

        const maxLen = Math.max(...rleData.split('$').map(l => l.length));

        let filledData = '';
        for (let line of rleData.split('$')) {
            const fillingChars = maxLen - line.length;
            if (fillingChars > 0) {
                filledData += line + 'b'.repeat(fillingChars) + '$';
            } else {
                filledData += line + '$';
            }
        }
        rleData = filledData.substring(0, filledData.length - 1);

        rebuiltArr = rleData
            .split('$')
            .map(line => [...line].map(pixel => pixel === 'o' ? true : false));

        const rle = {
            rle: originalRleData,
            x: maxLen,
            y: rebuiltArr.length,
            data: rebuiltArr
        } as Rle;

        return rle;
    }
}