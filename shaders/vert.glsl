attribute vec3 aPos;
attribute vec3 aNorm;

attribute float aStress;  //추가

uniform mat4 uMVP;

varying vec3 vNorm;

varying float vStress;  //추가


void main() {
  vNorm = aNorm;

   vStress = aStress;    // ← fragment로 전달

  //모든 꼭짓점에 적용
  gl_Position = uMVP * vec4(aPos, 1.0);
}