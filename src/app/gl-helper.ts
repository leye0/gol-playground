export class GlHelper {

    canvas: HTMLCanvasElement;
    gl: WebGL2RenderingContext;
    program: WebGLProgram;

    setup(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.gl = canvas.getContext("webgl2");

        /*=========================Shaders========================*/

        const vs = `
        attribute vec2 aPosition;
        attribute vec3 aColor;
        varying vec3 vColor;
        
        void main() {
        gl_Position = vec4( aPosition, 1.0, 1.0 );
        vColor = aColor;
        gl_PointSize = 1.0;
        }
        `;

        const fs = `
        precision mediump float;
        
        varying vec3 vColor;
        
        void main() {
        gl_FragColor = vec4( vColor, 1.0 );
        }
        `;
        this.program = this.gl.createProgram();
        let vShader = this.gl.createShader(this.gl.VERTEX_SHADER);
        let fShader = this.gl.createShader(this.gl.FRAGMENT_SHADER);
        this.gl.attachShader(this.program, vShader);
        this.gl.attachShader(this.program, fShader);
        this.gl.shaderSource(vShader, vs);
        this.gl.compileShader(vShader);
        this.gl.shaderSource(fShader, fs);
        this.gl.compileShader(fShader);
        this.gl.linkProgram(this.program);
        this.gl.useProgram(this.program);


        this.buffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffer);
    }

    buffer: WebGLBuffer;

    drawPoints(points: boolean[][], width: number, height: number) {

        this.gl.clearColor(1, 1, 1, 1);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);

        // Create points datas
        // ===================

        var size = width * height;

        let data = new Float32Array(size * 5);

        let i = 0;
        for (let x = 0; x < width; x++) {
            for (let y = 0; y < height; y++) {
                const live = points[x][y];
                if (live) {
                    let j = i * 5;
                    data[j + 0] = -1 + (x / width * 2);
                    data[j + 1] = 1 - (y / height * 2);
                    data[j + 2] = live ? 0 : 1; // r
                    data[j + 3] = live ? 0 : 1; // g
                    data[j + 4] = live ? 0 : 1; // b
                }
                i++;
            }
        }

        // Setup ArrayBuffer
        // ===================

        this.gl.bufferData(this.gl.ARRAY_BUFFER, data, this.gl.STATIC_DRAW);

        let aPos = this.gl.getAttribLocation(this.program, 'aPosition');
        this.gl.enableVertexAttribArray(aPos);
        this.gl.vertexAttribPointer(aPos, 2, this.gl.FLOAT, false, 5 * 4, 0);

        let aCol = this.gl.getAttribLocation(this.program, 'aColor');
        this.gl.enableVertexAttribArray(aCol);
        this.gl.vertexAttribPointer(aCol, 3, this.gl.FLOAT, false, 5 * 4, 2 * 4);

        // Draw
        // ===================
        this.gl.drawArrays(this.gl.POINTS, 0, size);
    }

    ss = 0;
    drawHash(data: Float32Array, width: number, height: number) {

        const size = width * height;

        this.gl.clearColor(1, 1, 1, 1);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);

        // Setup ArrayBuffer
        // ===================

        if (this.ss % 100 == 50) {
            console.log(JSON.stringify(data.slice(0, 200)));
        }

        this.gl.bufferData(this.gl.ARRAY_BUFFER, data, this.gl.STATIC_DRAW);

        const aPos = this.gl.getAttribLocation(this.program, 'aPosition');
        this.gl.enableVertexAttribArray(aPos);
        this.gl.vertexAttribPointer(aPos, 2, this.gl.FLOAT, false, 5 * 4, 0);

        const aCol = this.gl.getAttribLocation(this.program, 'aColor');
        this.gl.enableVertexAttribArray(aCol);
        this.gl.vertexAttribPointer(aCol, 3, this.gl.FLOAT, false, 5 * 4, 2 * 4);

        // Draw
        // ===================
        this.gl.drawArrays(this.gl.POINTS, 0, size);
    }
}