// [5/5] 앱 시작 — 저장된 목록을 불러오고 버튼을 연결한다.

// 앱 전체가 함께 쓰는 상태
let data = readData(STORAGE_KEY);   // 할 일 + 프로젝트
let ui = readUi(UI_KEY);            // 고른 프로젝트·정렬·보기
let editingId = null;               // 수정 중인 할 일의 id (없으면 null)
let searchText = '';                // 검색칸 글자

fixSelectedProject();

/* ---------- 버튼·입력칸 연결 ---------- */

$('taskForm').addEventListener('submit', submitTask);
$('taskForm').addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && editingId) {
    resetForm();
    renderTasks();
  }
});
$('cancelEditBtn').addEventListener('click', () => {
  resetForm();
  renderTasks();
});
$('projectForm').addEventListener('submit', addProject);
$('clearDoneBtn').addEventListener('click', clearDone);
$('searchInput').addEventListener('input', (e) => {
  searchText = e.target.value;
  renderTasks();
});
$('filterSelect').addEventListener('change', (e) => {
  ui.filter = e.target.value;
  saveUi();
  renderTasks();
});
$('sortSelect').addEventListener('change', (e) => {
  ui.sort = e.target.value;
  saveUi();
  renderTasks();
});

// 다른 탭에서 목록을 바꾸면 이 탭에도 바로 반영한다.
window.addEventListener('storage', (e) => {
  if (e.key !== STORAGE_KEY) return;
  data = readData(STORAGE_KEY);
  fixSelectedProject();
  if (editingId && !findTask(editingId)) resetForm();
  render();
});

// 창을 켜 둔 채 날짜가 바뀌면 D-day를 다시 계산한다.
let lastDay = todayStart().getTime();
setInterval(() => {
  const now = todayStart().getTime();
  if (now !== lastDay) {
    lastDay = now;
    render();
  }
}, 60 * 1000);

/* ---------- 시작 ---------- */

saveData();   // 처음 열었을 때 기본 프로젝트("일반")를 저장해 둔다.
resetForm();
render();
