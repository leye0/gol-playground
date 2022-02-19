export class GlVar {
    constructor(public name: string, public components: number, public type: number) {
    }
    typeSize: number = 4; // For now, assume we only use 32 bits types
    stride: number;
    offset: number;

    // Return total amount of components so anything building buffer can use it
    static compile(vars: GlVar[]): number {
        let offset = 0;
        let totalComponents = 0;
        for (let v of vars) {
            v.offset = offset;
            totalComponents += v.components;
            offset += v.components * v.typeSize;
        }
        // Recompute stride
        for (let v of vars) {
            v.stride = offset;
        }
        return totalComponents;
    }
}

export class GlHelper {

    canvas: HTMLCanvasElement;
    gl: WebGL2RenderingContext;
    program: WebGLProgram;
    vars: GlVar[] = [];

    totalComponents: number;

    setup(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.gl = canvas.getContext("webgl2");


        // Build vars:
        this.vars.push(new GlVar('aPosition', 2, this.gl.FLOAT));
        this.vars.push(new GlVar('aColor', 3, this.gl.FLOAT));
        this.totalComponents = GlVar.compile(this.vars);
        console.log(this.vars);


        /*=========================Shaders========================*/

        const vs = `
        attribute vec2 aPosition;
        attribute vec3 aColor;
        varying vec3 vColor;
        
        void main() {
        gl_Position = vec4( aPosition.x, aPosition.y, 1.0, 1.0 );
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

    ss = 0;
    drawHash(data: Float32Array, width: number, height: number) {

        const size = width * height;

        this.gl.clearColor(1, 1, 1, 1);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);

        // Setup ArrayBuffer
        // ===================

        if (this.ss % 100 == 50) { // Add ++ for debug
            console.log(JSON.stringify(data.slice(0, 200)));
        }

        this.gl.bufferData(this.gl.ARRAY_BUFFER, data, this.gl.STATIC_DRAW);

        // TEST:
        // const dragPos = this.gl.getAttribLocation(this.program, 'dragPosition');
        // this.gl.enableVertexAttribArray(dragPos);
        // this.gl.vertexAttribPointer(dragPos, 2, this.gl.FLOAT, false, 5 * 4, 0);

        // const aPos = this.gl.getAttribLocation(this.program, 'aPosition');
        // this.gl.enableVertexAttribArray(aPos);
        // this.gl.vertexAttribPointer(aPos, 2, this.gl.FLOAT, false, 5 * 4, 0);

        // const aCol = this.gl.getAttribLocation(this.program, 'aColor');
        // this.gl.enableVertexAttribArray(aCol);
        // this.gl.vertexAttribPointer(aCol, 3, this.gl.FLOAT, false, 5 * 4, 2 * 4);

        for (let v of this.vars) {
            // console.log(v);
            const loc = this.gl.getAttribLocation(this.program, v.name);
            this.gl.enableVertexAttribArray(loc);
            this.gl.vertexAttribPointer(loc, v.components, v.type, false, v.stride, v.offset);
        }

        // Draw
        // ===================
        this.gl.drawArrays(this.gl.POINTS, 0, size);
    }
}