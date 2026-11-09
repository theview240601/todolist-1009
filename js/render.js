// [3/5] 화면에 그리기

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

/* ---------- 목록 고르기·줄 세우기 (화면과 상관없는 계산) ---------- */

function priorityOf(task) {
  return PRIORITY[task.priority] || PRIORITY.mid;
}

// 할 일 목록에서 보여 줄 것만 골라 순서대로 세운다.
// options: { project: 'all' 또는 프로젝트 id, filter: 'all'|'open'|'done', sort: 'due'|'priority'|'created', search: 글자 }
function filterAndSort(tasks, options) {
  const { project = 'all', filter = 'all', sort = 'due', search = '' } = options || {};
  const q = search.trim().toLowerCase();
  const list = tasks.filter((t) => {
    if (project !== 'all' && t.projectId !== project) return false;
    if (filter === 'open' && t.done) return false;
    if (filter === 'done' && !t.done) return false;
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
  }[sort] || [byDue, byPriority, byNewest];

  return list.sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;   // 완료한 일은 항상 아래로
    for (const rule of rules) {
      const r = rule(a, b);
      if (r) return r;
    }
    return 0;
  });
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
  const overdue = data.tasks.filter((t) => isOverdue(t)).length;
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
  return filterAndSort(data.tasks, { project: ui.project, filter: ui.filter, sort: ui.sort, search: searchText });
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
