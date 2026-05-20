
//진입점, init() 호출












// <시뮬레이션 뷰어>
//힘들 가함(boundaryConditions)
//재질이 얼마나 버티는지(material condition)
//변형량/응력 계산(results)
//색으로 시각화(colormap)

//재질이 필요한 이유 : 똑같은 크레인에 100kN 힘을 가하면 얼마나 휘고, 
//어디서 부서질까? 

// geometry        → 모양이 어떻게 생겼는지
// material        → 무슨 재료인지
// boundaryConditions → 어디 고정이고 어디에 힘을 가할지
// results         → 계산 결과 어떤지 확인
// colormap        → 결과 가시화할 색깔 매핑


// ① 데이터 구조 설명
// geometry — 모양 데이터
// javascriptconst geometry = {
//   vertices: Float32Array,  // 점들의 xyz 좌표 묶음
//   normals:  Float32Array,  // 각 점이 어느 방향 향하는지 (빛 계산용)
//   vertexCount: number      // 점 개수
// }


// material — 재질 데이터
// javascriptconst material = {
//   density: 7850,          // 밀도 → 무게 계산
//   youngsModulus: 2.1e11,  // 영률 → 얼마나 딱딱한지
//   poissonsRatio: 0.3,     // 포아송비 → 늘어날 때 옆으로 얼마나 줄어드는지
// }


// boundaryConditions — 경계조건
// javascriptconst boundaryConditions = [
//   { type: 'fixedSupport', faces: [] }, // 여기는 고정 (움직임 = 0)
//   { type: 'force', value: { y: -1e5 } } // 여기에 힘을 가함
// ]


// results — 시뮬레이션 결과
// javascriptconst results = {
//   vonMisesStress: Float32Array, // 꼭짓점마다 응력값 (Pa)
//   displacement: Float32Array,   // 꼭짓점마다 변위값 (m)
//   min: 0,
//   max: 4500000
// }


// colormap — 결과 시각화
// javascript// t = 0 → 파랑 (응력 낮음)
// // t = 0.5 → 초록 (응력 중간)
// // t = 1 → 빨강 (응력 높음)
// vec3 rainbow(float t) {
//   return vec3(t, 1.0 - abs(t-0.5)*2.0, 1.0-t);
// }





//심스케일 튜토리얼
// 1단계: CAD 모델 업로드
//        → 크레인 3D 모델 가져오기

// 2단계: 시뮬레이션 세팅
//        → 중력 방향 설정 (y축 아래)
//        → 재질 설정 (Steel)
//        → 경계조건 설정
//           - 바닥 3면 고정 (fixedSupport)
//           - 끝단에 -100kN 힘 (force)

// 3단계: 메쉬 생성
//        → 모델을 잘게 쪼개서 계산 가능하게

// 4단계: 시뮬레이션 실행
//        → 서버에서 FEM 계산

// 5단계: 결과 확인
//        → von Mises 응력 컬러맵으로 확인
//        → 변형량 확인 (50배 스케일업해서 시각화)


// //코드
// 튜토리얼 단계         코드
// ────────────────────────────────
// CAD 업로드         → parseOBJ()
// 재질 설정          → material 객체
// 경계조건 설정      → boundaryConditions 객체
// 결과 시각화        → results + colormap + 셰이더


const material = {
  name: 'Steel', //이름
  density: 7850, //밀도 -> 무게 계산
  youngsModulus: 2.1e11,//영률 -> 얼마나 딱딱한지
  poissonsRatio: 0.3,//포아송비 -> 늘어날 때 옆으로 얼마나 줄어드는지
}
// 지금은 그냥 선언만 해두고 안 씀

const boundaryConditions = [
  { type: 'fixedSupport', faces: [] }, // 나중에 클릭으로 채움 //=>여기는 고정 (움직임 = 0)
  { type: 'force', faces: [], value: { x: 0, y: -1e5, z: 0 } }//여기에 힘을 가함
]


//html에 있는 canvas id = c를 가져오고, 거기서 WebGL 그리기 도구를 꺼내는 작업
//gl이 모든 웹지엘 명령의 주체
const canvas = document.getElementById('c');
const gl = canvas.getContext('webgl');

if (!gl) {
  alert('WebGL 안됨!');
} else {
  console.log('WebGL 설정');
}

//셰이더 파일 로드
//파일을 서버에서 텍스트로 읽어오는 함수

async function loadShader(path) {


  //fetch는 파일 요청, 

  //.text()는 내용을 문자열로 변환.
  const res = await fetch(path);
  return await res.text();
}

//셰이더 컴파일
function createShader(gl, type, source) {

  //셰이더 객체 생성
  const shader = gl.createShader(type);

  //소스코드 넣기
  gl.shaderSource(shader, source);

  //GPU에서 컴파일
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    //console.error(gl.getShaderInfoLog(shader));
    console.error('셰이더 에러:', gl.getShaderInfoLog(shader)); //에러 출력
  }

  return shader;
}




// ── 메인 ─────────────────────────────────

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

  // OBJ 로드
  const objRes = await fetch('models/transmission/Transmission.obj');
  const objText = await objRes.text();
  const geo = parseOBJ(objText);

  // 구조체로 정리
  const geometry = {
    vertices: geo.positions,//점들의 xyz 좌표 묶음
    normals: geo.normals,//각 점이 어느 방향을 향하는지 (빛 계산용)
    vertexCount: geo.vertexCount//점 개수
  }

  // // 랜덤 말고 위치 기반으로 바꾸면 훨씬 그럴싸해
  // const results = new Float32Array(geo.vertexCount);
  // for (let i = 0; i < geo.vertexCount; i++) {
  //   // y좌표 기반으로 응력 변화 (위로 갈수록 응력 높음)
  //   const y = geo.positions[i * 3 + 1]; // y좌표
  //   results[i] = (y + 1.0) / 2.0 * 4500000; // -1~1 → 0~4500000
  // }

  // // 가짜 테스트용 - 꼭짓점마다 랜덤 응력값
  // const results = {
  //   vonMisesStress: //꼭짓점마다 응력값
  //   new Float32Array(geo.vertexCount).map(
  //     () => Math.random() * 4500000
  //   ),
  //   min: 0,
  //   max: 4500000
  // }


  //const results = new Float32Array(geo.vertexCount);





  let minS = Infinity, maxS = -Infinity;

  // 먼저 y 범위를 파악하고
  for (let i = 0; i < geo.vertexCount; i++) {
    const y = geo.positions[i * 3 + 1];
    minS = Math.min(minS, y);
    maxS = Math.max(maxS, y);
  }

  const stressData = new Float32Array(geo.vertexCount);

  // y 범위로 정규화 => 슈도 스트레스 생성
  for (let i = 0; i < geo.vertexCount; i++) {
    const y = geo.positions[i * 3 + 1];
    stressData[i] = (y - minS) / (maxS - minS) * 4500000;
  }

  console.log('stress 범위:', minS, maxS);

  // // stress 버퍼 <- results에서 바로 꺼내 씀
  // const sbo = gl.createBuffer();
  // gl.bindBuffer(gl.ARRAY_BUFFER, sbo);
  // gl.bufferData(gl.ARRAY_BUFFER, stressData, gl.STATIC_DRAW);
  // const aStress = gl.getAttribLocation(program, 'aStress');
  // gl.vertexAttribPointer(aStress, 1, gl.FLOAT, false, 0, 0);
  // gl.enableVertexAttribArray(aStress);

  // // uniform 전달
  // gl.uniform1f(gl.getUniformLocation(program, 'uMinStress'), stressData.min);
  // gl.uniform1f(gl.getUniformLocation(program, 'uMaxStress'), stressData.max);


  // 위치 버퍼
  const vbo = gl.createBuffer(); //GPU 메모리 공간 만들기
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo); //이 버퍼를 활성화
  gl.bufferData(gl.ARRAY_BUFFER, geo.positions, gl.STATIC_DRAW); //데이터 전송

    const aPos = gl.getAttribLocation(program, 'aPos'); //셰이더의 aPos 변수 위치 찾기 
  gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0); //데이터 형식 알려주기 (3개씩 float)
  gl.enableVertexAttribArray(aPos); //활성화


  // 노말 버퍼
  const nbo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, nbo);
  gl.bufferData(gl.ARRAY_BUFFER, geo.normals, gl.STATIC_DRAW);
  const aNorm = gl.getAttribLocation(program, 'aNorm');
  gl.vertexAttribPointer(aNorm, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(aNorm);


  // 3. stress 버퍼
  const sbo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, sbo);
  gl.bufferData(gl.ARRAY_BUFFER, stressData, gl.STATIC_DRAW);
  const aStress = gl.getAttribLocation(program, 'aStress');
  gl.vertexAttribPointer(aStress, 1, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(aStress);

  // uniform
  gl.uniform1f(gl.getUniformLocation(program, 'uMinStress'), 0);
  gl.uniform1f(gl.getUniformLocation(program, 'uMaxStress'), 4500000);

  // 카메라
  const dist = 4.0;
  const eye = [0, 0, dist];
  const center = [0, 0, 0];

  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
  gl.viewport(0, 0, canvas.width, canvas.height);

  const aspect = canvas.width / canvas.height; //원근감

  //원근감 행렬
  const proj = perspective(Math.PI / 4, aspect, 0.1, 1000);
  //                        시야각        비율    near  far

  //카메라 행렬
  const view = lookAt(eye, center); //카메라 위치/방향

  //MVP = Projection x View x (Model : Identity)
  //원근감      카메라    모델 변환 없음
  //모델 행렬은
  //모델 자체를 이동/회전/스케일 : 지금은 Identity라서 원점에 그대로 있음

  //뷰 행렬은
  //eye는 카메라 위치, center는 바라보는 곳
  //z축 4 위치에서 원점을 바라보고 있음

  //프로젝션 행렬은
  //멀리 있을수록 작게 보임

  //두 개 합치기
  const mvp = mulMat4(proj, view); //두 행렬 곱하기

  const uMVP = gl.getUniformLocation(program, 'uMVP'); //셰이더에 전달
  gl.uniformMatrix4fv(uMVP, false, mvp);

  // 그리기
  gl.enable(gl.DEPTH_TEST); //앞 뒤 가림 처리 On 
  gl.clearColor(0.1, 0.1, 0.1, 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); //화면 초기화
  gl.drawArrays(gl.TRIANGLES, 0, geo.vertexCount);  // 삼각형으로 그리기
}






init();