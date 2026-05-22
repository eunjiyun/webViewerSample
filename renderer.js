//WebGL 세팅, render 루프

export function render(geomet, gl, prog, mvp) {
  gl.clearColor(0.1, 0.1, 0.1, 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); //화면 초기화

  //매 프레임마다 MVP 갱신 (카메라 움직이면 달라짐)
  gl.uniformMatrix4fv(
    gl.getUniformLocation(prog, 'uMVP'), false, mvp
  )


  gl.drawArrays(gl.TRIANGLES, 0, geomet.vertexCount);  
}

