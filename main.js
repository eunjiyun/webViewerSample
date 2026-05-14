// const canvas = document.getElementById('c');
// const gl = canvas.getContext('webgl');

// if (!gl) {
//   alert('WebGL 안됨!');
// } else {
//   console.log('WebGL OK!');
//   gl.clearColor(0.1, 0.5, 0.3, 1.0); // 초록색
//   gl.clear(gl.COLOR_BUFFER_BIT);
// }



async function loadShader(path) {
  const res = await fetch(path);
  return await res.text();
}

function createShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(shader));
  }

  return shader;
}

async function init() {
  const canvas = document.getElementById('c');
  const gl = canvas.getContext('webgl');

  const vsSrc = await loadShader('shaders/vert.glsl');
  const fsSrc = await loadShader('shaders/frag.glsl');

  const vs = createShader(gl, gl.VERTEX_SHADER, vsSrc);
  const fs = createShader(gl, gl.FRAGMENT_SHADER, fsSrc);

  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);

  gl.useProgram(program);

  const vertices = new Float32Array([
     0.0,  0.5, 0.0,
    -0.5, -0.5, 0.0,
     0.5, -0.5, 0.0,
  ]);

  const vbo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

  const aPos = gl.getAttribLocation(program, 'aPos');

  gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(aPos);

  const uMVP = gl.getUniformLocation(program, 'uMVP');

  gl.uniformMatrix4fv(
    uMVP,
    false,
    new Float32Array([
      1,0,0,0,
      0,1,0,0,
      0,0,1,0,
      0,0,0,1
    ])
  );

  gl.viewport(0, 0, canvas.width, canvas.height);

  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);

  gl.drawArrays(gl.TRIANGLES, 0, 3);
}

init();