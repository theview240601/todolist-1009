// [1/5] 저장하고 불러오기
// 모든 데이터는 이 브라우저의 localStorage에만 저장된다. (서버·데이터베이스 없음)
//
// 이 폴더의 파일들은 index.html이 정해진 순서대로 불러온다:
//   storage.js → dates.js → render.js → actions.js → main.js
// (index.html을 더블클릭해서 열어도 동작하도록 "모듈" 방식 대신 이 방식을 쓴다.)

const STORAGE_KEY = 'work-todo-v1';   // 할 일 + 프로젝트
const UI_KEY = 'work-todo-ui-v1';     // 마지막으로 고른 프로젝트·정렬·보기

function makeId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function defaultData() {
  return { projects: [{ id: makeId(), name: '일반' }], tasks: [] };
}

// key 칸에 저장된 목록을 읽는다. 없거나 망가졌으면 기본 목록을 돌려준다.
function readData(key) {
  let raw = null;
  try {
    raw = localStorage.getItem(key);
    if (raw) {
      const saved = JSON.parse(raw);
      if (saved && Array.isArray(saved.projects) && Array.isArray(saved.tasks) && saved.projects.length) {
        return saved;
      }
    }
  } catch (e) {
    console.warn('저장된 목록을 읽지 못했어요.', e);
    // 읽지 못한 원래 내용은 덮어쓰기 전에 따로 보관해 둔다.
    try { if (raw) localStorage.setItem(key + '-backup', raw); } catch (_) {}
  }
  return defaultData();
}

// key 칸에 value를 저장한다. 성공하면 true.
function writeData(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (_) {
    return false;
  }
}

function readUi(key) {
  const fallback = { project: 'all', sort: 'due', filter: 'all' };
  try {
    const saved = JSON.parse(localStorage.getItem(key) || '{}');
    return { ...fallback, ...saved };
  } catch (_) {
    return fallback;
  }
}

// 앱에서 쓰는 저장 함수 (data, ui는 main.js에 있음)
function saveData() {
  if (!writeData(STORAGE_KEY, data)) {
    alert('저장하지 못했어요. 브라우저 저장 공간이 꽉 찼거나 막혀 있을 수 있어요.');
  }
}

function saveUi() {
  writeData(UI_KEY, ui);
}
