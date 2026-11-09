// 업무·프로젝트 투두리스트
// 모든 데이터는 이 브라우저의 localStorage에만 저장된다. (서버·데이터베이스 없음)

const STORAGE_KEY = 'work-todo-v1';   // 할 일 + 프로젝트
const UI_KEY = 'work-todo-ui-v1';     // 마지막으로 고른 프로젝트·정렬·보기

const PRIORITY = {
  high: { label: '높음', rank: 0 },
  mid: { label: '보통', rank: 1 },
  low: { label: '낮음', rank: 2 },
};

const ICONS = {
  edit: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
  trash: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/></svg>',
};

const $ = (id) => document.getElementById(id);

/* ---------- 저장 / 불러오기 ---------- */

function makeId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function defaultData() {
  return { projects: [{ id: makeId(), name: '일반' }], tasks: [] };
}

function loadData() {
  let raw = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      if (saved && Array.isArray(saved.projects) && Array.isArray(saved.tasks) && saved.projects.length) {
        return saved;
      }
    }
  } catch (e) {
    console.warn('저장된 목록을 읽지 못했어요.', e);
    // 읽지 못한 원래 내용은 덮어쓰기 전에 따로 보관해 둔다.
    try { if (raw) localStorage.setItem(STORAGE_KEY + '-backup', raw); } catch (_) {}
  }
  return defaultData();
}

function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    alert('저장하지 못했어요. 브라우저 저장 공간이 꽉 찼거나 막혀 있을 수 있어요.');
  }
}

function loadUi() {
  const fallback = { project: 'all', sort: 'due', filter: 'all' };
  try {
    const saved = JSON.parse(localStorage.getItem(UI_KEY) || '{}');
    return { ...fallback, ...saved };
  } catch (_) {
    return fallback;
  }
}

function saveUi() {
  try { localStorage.setItem(UI_KEY, JSON.stringify(ui)); } catch (_) {}
}

let data = loadData();
let ui = loadUi();
let editingId = null;   // 수정 중인 할 일의 id (없으면 null)
let searchText = '';

function fixSelectedProject() {
  if (ui.project !== 'all' && !data.projects.some((p) => p.id === ui.project)) ui.project = 'all';
}
fixSelectedProject();

/* ---------- 날짜 계산 ---------- */

function todayStart() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function parseDate(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function daysLeft(due) {
  return Math.round((parseDate(due) - todayStart()) / 86400000);
}

function formatDate(due) {
  const d = parseDate(due);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return (sameYear ? '' : d.getFullYear() + '년 ') + (d.getMonth() + 1) + '월 ' + d.getDate() + '일';
}

function dueInfo(task) {
  if (!task.due) return null;
  const n = daysLeft(task.due);
  if (n === 0) return { text: '오늘 마감', cls: 'today' };
  if (n > 0) return { text: 'D-' + n, cls: n <= 3 ? 'soon' : '' };
  return { text: -n + '일 지남', cls: 'overdue' };
}

function isOverdue(task) {
  return !task.done && task.due && daysLeft(task.due) < 0;
}

/* ---------- 화면 조각 만들기 ---------- */

// 글자는 textContent로만 넣어서, 할 일에 어떤 글자를 써도 화면이 깨지지 않게 한다.
function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
    else if (value != null && value !== false) node.setAttribute(key, value === true ? '' : value);
  }
  for (const child of children.flat()) {
    if (child != null) node.append(child);
  }
  return node;
}

function iconButton(icon, label, onClick, extraClass = '') {
  const btn = el('button', { type: 'button', class: 'icon-btn ' + extraClass, title: label, 'aria-label': label, onclick: onClick });
  btn.innerHTML = ICONS[icon];
  return btn;
}

function projectName(id) {
  const p = data.projects.find((proj) => proj.id === id);
  return p ? p.name : '(프로젝트 없음)';
}

function priorityOf(task) {
  return PRIORITY[task.priority] || PRIORITY.mid;
}

/* ---------- 그리기 ---------- */

function render() {
  renderHeader();
  renderProjects();
  renderTasks();
}

function renderHeader() {
  $('today').textContent = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
  });
  const open = data.tasks.filter((t) => !t.done).length;
  const done = data.tasks.length - open;
  const overdue = data.tasks.filter(isOverdue).length;
  const stat = (label, n, warn) => el('span', { class: 'stat' + (warn ? ' warn' : '') }, label + ' ', el('b', { text: String(n) }));
  const chips = [stat('남은 일', open), stat('완료', done)];
  if (overdue) chips.push(stat('마감 지남', overdue, true));
  $('stats').replaceChildren(...chips);
}

function renderProjects() {
  const openCount = (pid) => data.tasks.filter((t) => !t.done && (pid === 'all' || t.projectId === pid)).length;

  const item = (id, name, editable) => {
    const active = ui.project === id;
    const li = el('li', { class: 'project-item' + (active ? ' active' : '') });
    li.append(el('button', {
      type: 'button', class: 'project-name', 'aria-current': active ? 'true' : null,
      onclick: () => selectProject(id),
    }, el('span', { class: 'name', text: name }), el('span', { class: 'count', text: String(openCount(id)) })));
    if (editable) {
      li.append(el('div', { class: 'project-actions' },
        iconButton('edit', '이름 바꾸기', () => renameProject(id)),
        iconButton('trash', '프로젝트 삭제', () => deleteProject(id), 'danger'),
      ));
    }
    return li;
  };

  $('projectList').replaceChildren(
    item('all', '전체', false),
    ...data.projects.map((p) => item(p.id, p.name, true)),
  );

  // 입력칸의 프로젝트 고르기 목록도 같이 맞춘다.
  const select = $('projectSelect');
  const prev = select.value;
  select.replaceChildren(...data.projects.map((p) => el('option', { value: p.id, text: p.name })));
  if (data.projects.some((p) => p.id === prev)) select.value = prev;
  else setDefaultProjectInForm();
}

function visibleTasks() {
  const q = searchText.trim().toLowerCase();
  const list = data.tasks.filter((t) => {
    if (ui.project !== 'all' && t.projectId !== ui.project) return false;
    if (ui.filter === 'open' && t.done) return false;
    if (ui.filter === 'done' && !t.done) return false;
    if (q && !t.title.toLowerCase().includes(q) && !(t.memo || '').toLowerCase().includes(q)) return false;
    return true;
  });

  const byDue = (a, b) => {
    if (!a.due && !b.due) return 0;
    if (!a.due) return 1;           // 마감일 없는 일은 뒤로
    if (!b.due) return -1;
    return a.due < b.due ? -1 : a.due > b.due ? 1 : 0;
  };
  const byPriority = (a, b) => priorityOf(a).rank - priorityOf(b).rank;
  const byNewest = (a, b) => b.createdAt - a.createdAt;
  const rules = {
    due: [byDue, byPriority, byNewest],
    priority: [byPriority, byDue, byNewest],
    created: [byNewest],
  }[ui.sort] || [byDue, byPriority, byNewest];

  return list.sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;   // 완료한 일은 항상 아래로
    for (const rule of rules) {
      const r = rule(a, b);
      if (r) return r;
    }
    return 0;
  });
}

function taskItem(t) {
  const check = el('input', { type: 'checkbox', class: 'check', 'aria-label': '완료 표시', onchange: () => toggleTask(t.id) });
  check.checked = !!t.done;

  const pri = priorityOf(t);
  const due = dueInfo(t);
  const meta = el('div', { class: 'meta' },
    el('span', { class: 'chip pri-' + (PRIORITY[t.priority] ? t.priority : 'mid') }, el('span', { class: 'dot' }), '중요도 ' + pri.label),
    due ? el('span', { class: 'chip due ' + (t.done ? '' : due.cls), text: formatDate(t.due) + ' · ' + due.text }) : null,
    ui.project === 'all' ? el('span', { class: 'chip', text: projectName(t.projectId) }) : null,
  );

  return el('li', { class: 'task' + (t.done ? ' done' : '') + (editingId === t.id ? ' editing' : '') },
    check,
    el('div', { class: 'body' },
      el('div', { class: 'title', text: t.title }),
      t.memo ? el('p', { class: 'memo', text: t.memo }) : null,
      meta,
    ),
    el('div', { class: 'actions' },
      iconButton('edit', '수정', () => startEdit(t.id)),
      iconButton('trash', '삭제', () => deleteTask(t.id), 'danger'),
    ),
  );
}

function renderTasks() {
  const inScope = data.tasks.filter((t) => ui.project === 'all' || t.projectId === ui.project);
  const list = visibleTasks();

  $('listTitle').replaceChildren(
    ui.project === 'all' ? '전체' : projectName(ui.project),
    el('span', { class: 'sub', text: list.length + '개' }),
  );
  $('taskList').replaceChildren(...list.map(taskItem));

  const empty = $('emptyMsg');
  empty.hidden = list.length > 0;
  if (!list.length) {
    empty.textContent = inScope.length
      ? '조건에 맞는 할 일이 없어요.'
      : '아직 할 일이 없어요. 위 칸에 첫 할 일을 적어 보세요.';
  }

  $('clearDoneBtn').disabled = !inScope.some((t) => t.done);
  $('filterSelect').value = ui.filter;
  $('sortSelect').value = ui.sort;
}

/* ---------- 할 일 다루기 ---------- */

function findTask(id) {
  return data.tasks.find((t) => t.id === id);
}

function toggleTask(id) {
  const t = findTask(id);
  if (!t) return;
  t.done = !t.done;
  t.doneAt = t.done ? Date.now() : null;
  saveData();
  render();
}

function deleteTask(id) {
  const t = findTask(id);
  if (!t) return;
  if (!confirm('"' + t.title + '" 할 일을 지울까요?\n지운 뒤에는 되돌릴 수 없어요.')) return;
  data.tasks = data.tasks.filter((x) => x.id !== id);
  if (editingId === id) resetForm();
  saveData();
  render();
}

function clearDone() {
  const targets = data.tasks.filter((t) => t.done && (ui.project === 'all' || t.projectId === ui.project));
  if (!targets.length) return;
  const where = ui.project === 'all' ? '' : '"' + projectName(ui.project) + '" 프로젝트의 ';
  if (!confirm(where + '완료한 할 일 ' + targets.length + '개를 모두 지울까요?\n지운 뒤에는 되돌릴 수 없어요.')) return;
  const ids = new Set(targets.map((t) => t.id));
  data.tasks = data.tasks.filter((t) => !ids.has(t.id));
  if (editingId && ids.has(editingId)) resetForm();
  saveData();
  render();
}

/* ---------- 입력칸 (추가·수정) ---------- */

function setDefaultProjectInForm() {
  const select = $('projectSelect');
  if (ui.project !== 'all' && data.projects.some((p) => p.id === ui.project)) select.value = ui.project;
  else if (data.projects.length) select.value = data.projects[0].id;
}

function resetForm() {
  editingId = null;
  $('taskForm').reset();
  $('taskForm').classList.remove('editing');
  $('priorityInput').value = 'mid';
  setDefaultProjectInForm();
  $('editBanner').hidden = true;
  $('cancelEditBtn').hidden = true;
  $('submitBtn').textContent = '추가';
}

function startEdit(id) {
  const t = findTask(id);
  if (!t) return;
  editingId = id;
  $('titleInput').value = t.title;
  $('projectSelect').value = t.projectId;
  $('dueInput').value = t.due || '';
  $('priorityInput').value = PRIORITY[t.priority] ? t.priority : 'mid';
  $('memoInput').value = t.memo || '';
  $('taskForm').classList.add('editing');
  $('editBanner').hidden = false;
  $('cancelEditBtn').hidden = false;
  $('submitBtn').textContent = '저장';
  renderTasks();
  $('taskForm').scrollIntoView({ behavior: 'smooth', block: 'start' });
  $('titleInput').focus({ preventScroll: true });
}

function submitTask(e) {
  e.preventDefault();
  const title = $('titleInput').value.trim();
  if (!title) {
    $('titleInput').value = '';
    $('titleInput').focus();
    return;
  }
  const fields = {
    title,
    projectId: $('projectSelect').value,
    due: $('dueInput').value,
    priority: $('priorityInput').value,
    memo: $('memoInput').value.trim(),
  };

  const editing = editingId && findTask(editingId);
  if (editing) {
    Object.assign(editing, fields);
  } else {
    data.tasks.push({ id: makeId(), ...fields, done: false, createdAt: Date.now(), doneAt: null });
  }
  saveData();
  resetForm();
  render();
  $('titleInput').focus();
}

/* ---------- 프로젝트 다루기 ---------- */

function nameTaken(name, exceptId) {
  return data.projects.some((p) => p.id !== exceptId && p.name === name);
}

function selectProject(id) {
  ui.project = id;
  saveUi();
  if (!editingId) setDefaultProjectInForm();
  render();
}

function addProject(e) {
  e.preventDefault();
  const input = $('projectInput');
  const name = input.value.trim();
  if (!name) return;
  if (nameTaken(name)) {
    alert('"' + name + '" 프로젝트는 이미 있어요.');
    return;
  }
  const project = { id: makeId(), name };
  data.projects.push(project);
  input.value = '';
  saveData();
  selectProject(project.id);
}

function renameProject(id) {
  const p = data.projects.find((x) => x.id === id);
  if (!p) return;
  const answer = prompt('새 프로젝트 이름을 적어 주세요.', p.name);
  if (answer == null) return;
  const name = answer.trim().slice(0, 30);
  if (!name || name === p.name) return;
  if (nameTaken(name, id)) {
    alert('"' + name + '" 프로젝트는 이미 있어요.');
    return;
  }
  p.name = name;
  saveData();
  render();
}

function deleteProject(id) {
  const p = data.projects.find((x) => x.id === id);
  if (!p) return;
  if (data.projects.length <= 1) {
    alert('프로젝트는 최소 1개 있어야 해요.\n이름을 바꾸고 싶다면 연필 버튼을 눌러 주세요.');
    return;
  }
  const count = data.tasks.filter((t) => t.projectId === id).length;
  const msg = count
    ? '"' + p.name + '" 프로젝트와 그 안의 할 일 ' + count + '개를 모두 지울까요?\n지운 뒤에는 되돌릴 수 없어요.'
    : '"' + p.name + '" 프로젝트를 지울까요?';
  if (!confirm(msg)) return;

  const editingTask = editingId && findTask(editingId);
  data.projects = data.projects.filter((x) => x.id !== id);
  data.tasks = data.tasks.filter((t) => t.projectId !== id);
  if (editingTask && editingTask.projectId === id) resetForm();
  if (ui.project === id) {
    ui.project = 'all';
    saveUi();
  }
  saveData();
  render();
}

/* ---------- 시작 ---------- */

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
  data = loadData();
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

saveData();   // 처음 열었을 때 기본 프로젝트("일반")를 저장해 둔다.
resetForm();
render();
