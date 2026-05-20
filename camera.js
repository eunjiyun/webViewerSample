//MVP 행렬, 마우스 인터랙션


//행렬 함수들
////이 세 함수가 없으면 모델이 화면에 아예 안 보이거나 이상하게 보임

function perspective(fov, aspect, near, far) {
  const f = 1 / Math.tan(fov / 2);
  const m = new Float32Array(16);
  m[0] = f / aspect;
  m[5] = f;
  m[10] = (far + near) / (near - far);
  m[11] = -1;
  m[14] = (2 * far * near) / (near - far);
  return m;
}


//카메라를 eye 위치에 놓고 center를 바라보게 설정. 지금 eye 0 0 4 니까 Z축 4 위치에서 원점을 보고 있음
function lookAt(eye, center) {
  const up = [0, 1, 0];
  let fx = center[0] - eye[0], fy = center[1] - eye[1], fz = center[2] - eye[2];
  let fl = Math.hypot(fx, fy, fz);
  fx /= fl; fy /= fl; fz /= fl;
  let rx = fy * up[2] - fz * up[1], ry = fz * up[0] - fx * up[2], rz = fx * up[1] - fy * up[0];
  let rl = Math.hypot(rx, ry, rz);
  rx /= rl; ry /= rl; rz /= rl;
  let ux = ry * fz - rz * fy, uy = rz * fx - rx * fz, uz = rx * fy - ry * fx;
  const m = new Float32Array(16);
  m[0] = rx; m[1] = ux; m[2] = -fx;
  m[4] = ry; m[5] = uy; m[6] = -fy;
  m[8] = rz; m[9] = uz; m[10] = -fz;
  m[12] = -(rx * eye[0] + ry * eye[1] + rz * eye[2]);
  m[13] = -(ux * eye[0] + uy * eye[1] + uz * eye[2]);
  m[14] = (fx * eye[0] + fy * eye[1] + fz * eye[2]);
  m[15] = 1;
  return m;
}

//4x4 행렬 두 개 곱하기. 
//proj x view = MVP. 이걸 셰이더에 넘기면 GPU가 모든 꼭짓점을 자동으로 올바른 화면 위치로 변환해줌.

function mulMat4(a, b) {
  const out = new Float32Array(16);
  for (let i = 0; i < 4; i++)
    for (let j = 0; j < 4; j++) {
      out[j * 4 + i] = 0;
      for (let k = 0; k < 4; k++) out[j * 4 + i] += a[k * 4 + i] * b[j * 4 + k];
    }
  return out;
}
