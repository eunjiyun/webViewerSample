precision mediump float;

varying vec3 vNorm;
varying float vStress;

uniform float uMinStress;
uniform float uMaxStress;

vec3 rainbow(float t) {
  t = clamp(t, 0.0, 1.0);
  return vec3(t, 1.0 - abs(t - 0.5) * 2.0, 1.0 - t);
}

void main() {
  vec3 lightDir = normalize(vec3(1.0, 2.0, 1.5));
  float diff = max(dot(normalize(vNorm), lightDir), 0.0);
  float light = 0.2 + diff * 0.8;


  float t = (vStress - uMinStress) / (uMaxStress - uMinStress);
  vec3 color = rainbow(t) * light;

  gl_FragColor = vec4(color, 1.0);
}