//parseOBJ()



// ── OBJ 파서 ─────────────────────────────
function parseOBJ(text) {
  const rawPos = [];
  const positions = [];

  for (const line of text.split('\n')) {
    const p = line.trim().split(/\s+/);

    //obj를 한 줄씩 읽어서 v면 좌표 저장, f면 삼각형으로 쪼개서 최종 배열에 넣기
    if ('v' === p[0]) {
      rawPos.push(+p[1], +p[2], +p[3]);// v 1.0 2.0 3.0 배열에 저장
    }

    if ('f' === p[0]) {
      const verts = p.slice(1).map(t => parseInt(t.split('/')[0]) - 1);

      // f 1/1 2/2 3/3 => 슬래시 앞 숫자만 뽑고 -1 (OBJ는 1부터 시작이라)
      for (let i = 1; i < verts.length - 1; i++) {

        //쿼드면 삼각형 2개로 쪼갬
        const tri = [verts[0], verts[i], verts[i + 1]];
        for (const idx of tri) {
          positions.push(rawPos[idx * 3], rawPos[idx * 3 + 1], rawPos[idx * 3 + 2]);
        }
      }
    }
  }

  console.log('vertex 개수:', positions.length / 3);
  console.log('삼각형 개수:', positions.length / 9);

  //정렬 및 스케일 설정
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  for (let i = 0; i < positions.length; i += 3) {
    minX = Math.min(minX, positions[i]);
    maxX = Math.max(maxX, positions[i]);
    minY = Math.min(minY, positions[i + 1]);
    maxY = Math.max(maxY, positions[i + 1]);
    minZ = Math.min(minZ, positions[i + 2]);
    maxZ = Math.max(maxZ, positions[i + 2]);
  }

  //모델 중심점 계산 
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const cz = (minZ + maxZ) / 2;
  const maxDim = Math.max(maxX - minX, maxY - minY, maxZ - minZ);

  //최대 크기를 -1~1 범위로 정규화
  const scale = 2.0 / maxDim;


  for (let i = 0; i < positions.length; i += 3) {

    //중심으로 이동 후 스케일
    positions[i] = (positions[i] - cx) * scale;
    positions[i + 1] = (positions[i + 1] - cy) * scale;
    positions[i + 2] = (positions[i + 2] - cz) * scale;
  }
  console.log('중앙 정렬 완료 및 크기 확인:', maxDim);

  // ── face normal 자동 계산 ──
  const normals = new Float32Array(positions.length);
  for (let i = 0; i < positions.length; i += 9) {
    const ax = positions[i], ay = positions[i + 1], az = positions[i + 2];
    const bx = positions[i + 3], by = positions[i + 4], bz = positions[i + 5];
    const cx2 = positions[i + 6], cy2 = positions[i + 7], cz2 = positions[i + 8];

    //벡터 AB
    const ux = bx - ax, uy = by - ay, uz = bz - az;

    //벡터 AC
    const vx = cx2 - ax, vy = cy2 - ay, vz = cz2 - az;

    //외적 -> 면의 수직 방향
    //삼각형의 두 변의 외적을 구하면 그 면이 어느 방향을 향하는지 알 수 있음. 
    //이걸 노말벡터라 하고 빛 계산할 때 꼭 필요함.
    const nx = uy * vz - uz * vy;
    const ny = uz * vx - ux * vz;
    const nz = ux * vy - uy * vx;
    const len = Math.hypot(nx, ny, nz) || 1;

    for (let j = 0; j < 3; j++) {
      normals[i + j * 3] = nx / len;
      normals[i + j * 3 + 1] = ny / len;
      normals[i + j * 3 + 2] = nz / len;
    }
  }

  return {
    positions: new Float32Array(positions),
    normals: normals,
    vertexCount: positions.length / 3
  };
}


//triangle 



// // ── Abaqus .inp 파서 ─────────────────────────────
// function parseINP(text) {
//   const nodeMap = new Map(); // id -> [x, y, z]
//   const positions = [];

//   const lines = text.split('\n');
//   let mode = null; // 'node' | 'element' | null

//   // 요소 타입별 삼각형 분해 테이블
//   // C3D4  : 사면체 4노드  -> 삼각형 4개
//   // C3D6  : 쐐기  6노드  -> 삼각형 8개(근사)
//   // C3D8  : 육면체 8노드  -> 삼각형 12개
//   // S3/S4 : 쉘 3,4노드
//   const TRIS = {
//     C3D4:  [[0,1,2],[0,1,3],[0,2,3],[1,2,3]],
//     C3D10: [[0,1,2],[0,1,3],[0,2,3],[1,2,3]], // 2차 사면체, 코너만 사용
//     C3D6:  [[0,1,2],[3,4,5],[0,1,4],[0,3,4],[1,2,5],[1,4,5],[0,2,5],[0,3,5]],
//     C3D8:  [[0,1,2],[0,2,3],[4,5,6],[4,6,7],
//              [0,1,5],[0,4,5],[1,2,6],[1,5,6],
//              [2,3,7],[2,6,7],[0,3,7],[0,4,7]],
//     C3D20: [[0,1,2],[0,2,3],[4,5,6],[4,6,7],
//              [0,1,5],[0,4,5],[1,2,6],[1,5,6],
//              [2,3,7],[2,6,7],[0,3,7],[0,4,7]], // 코너 8개만 사용
//     S3:    [[0,1,2]],
//     S4:    [[0,1,2],[0,2,3]],
//     S4R:   [[0,1,2],[0,2,3]],
//     S8:    [[0,1,2],[0,2,3]], // 코너만
//   };

//   let currentElemType = null;

//   for (let raw of lines) {
//     const line = raw.trim();

//     // 빈 줄 or 주석 스킵
//     if (!line || line.startsWith('**')) continue;

//     // ── 섹션 키워드 감지 ──
//     if (line.startsWith('*')) {
//       const upper = line.toUpperCase();

//       if (upper.startsWith('*NODE')) {
//         mode = 'node';
//         continue;
//       }

//       if (upper.startsWith('*ELEMENT')) {
//         mode = 'element';
//         // 요소 타입 파싱: *Element, type=C3D8
//         const m = line.match(/type\s*=\s*(\w+)/i);
//         currentElemType = m ? m[1].toUpperCase() : null;
//         continue;
//       }

//       // 다른 키워드면 모드 해제
//       mode = null;
//       continue;
//     }

//     // ── 노드 파싱 ──
//     if (mode === 'node') {
//       const p = line.split(',').map(s => s.trim());
//       // p[0]=id, p[1]=x, p[2]=y, p[3]=z
//       if (p.length >= 4) {
//         const id = parseInt(p[0]);
//         nodeMap.set(id, [+p[1], +p[2], +p[3]]);
//       }
//     }

//     // ── 요소 파싱 ──
//     if (mode === 'element' && currentElemType) {
//       const p = line.split(',').map(s => s.trim());
//       // p[0]=elemId, p[1..]=nodeIds
//       const nodeIds = p.slice(1).map(Number);

//       const triTable = TRIS[currentElemType];
//       if (!triTable) continue; // 미지원 타입 스킵

//       for (const tri of triTable) {
//         for (const localIdx of tri) {
//           const globalId = nodeIds[localIdx];
//           const pos = nodeMap.get(globalId);
//           if (!pos) continue;
//           positions.push(pos[0], pos[1], pos[2]);
//         }
//       }
//     }
//   }

//   console.log('vertex 개수:', positions.length / 3);
//   console.log('삼각형 개수:', positions.length / 9);

//   // ── 중심 정렬 & 정규화 ──
//   let minX = Infinity, minY = Infinity, minZ = Infinity;
//   let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
//   for (let i = 0; i < positions.length; i += 3) {
//     minX = Math.min(minX, positions[i]);
//     maxX = Math.max(maxX, positions[i]);
//     minY = Math.min(minY, positions[i + 1]);
//     maxY = Math.max(maxY, positions[i + 1]);
//     minZ = Math.min(minZ, positions[i + 2]);
//     maxZ = Math.max(maxZ, positions[i + 2]);
//   }

//   const cx = (minX + maxX) / 2;
//   const cy = (minY + maxY) / 2;
//   const cz = (minZ + maxZ) / 2;
//   const maxDim = Math.max(maxX - minX, maxY - minY, maxZ - minZ);
//   const scale = 2.0 / maxDim;

//   for (let i = 0; i < positions.length; i += 3) {
//     positions[i]     = (positions[i]     - cx) * scale;
//     positions[i + 1] = (positions[i + 1] - cy) * scale;
//     positions[i + 2] = (positions[i + 2] - cz) * scale;
//   }
//   console.log('중앙 정렬 완료, 최대 크기:', maxDim);

//   ///

//   // ── face normal 계산 (기존과 동일) ──
//   const normals = new Float32Array(positions.length);
//   for (let i = 0; i < positions.length; i += 9) {
//     const ax = positions[i],   ay = positions[i+1], az = positions[i+2];
//     const bx = positions[i+3], by = positions[i+4], bz = positions[i+5];
//     const cx2= positions[i+6], cy2= positions[i+7], cz2= positions[i+8];

//     const ux = bx-ax, uy = by-ay, uz = bz-az;
//     const vx = cx2-ax, vy = cy2-ay, vz = cz2-az;

//     const nx = uy*vz - uz*vy;
//     const ny = uz*vx - ux*vz;
//     const nz = ux*vy - uy*vx;
//     const len = Math.hypot(nx, ny, nz) || 1;

//     for (let j = 0; j < 3; j++) {
//       normals[i + j*3]     = nx / len;
//       normals[i + j*3 + 1] = ny / len;
//       normals[i + j*3 + 2] = nz / len;
//     }
//   }

//   return {
//     positions:   new Float32Array(positions),
//     normals:     normals,
//     vertexCount: positions.length / 3
//   };
// }