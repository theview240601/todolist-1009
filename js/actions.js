// [4/5] 추가·수정·삭제, 프로젝트 관리

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

function fixSelectedProject() {
  if (ui.project !== 'all' && !data.projects.some((p) => p.id === ui.project)) ui.project = 'all';
}

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
