/**
 * Data Structure:
 * {
 *   id: string,
 *   title: string,
 *   desc: string,
 *   urgent: boolean,
 *   category: 'work' | 'personal',
 *   dueDate: string | null,
 *   createdAt: string (ISO),
 *   completedAt: string (ISO) | null
 * }
 */

const STORAGE_KEY = "todo_app_v2";
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

// State
let tasks = [];
let currentTab = 'work'; // 'work' or 'personal'
let editingId = null;

// Icons
const ICON_EDIT = `<svg width="16" height="16" fill="none" class="w-4 h-4" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>`;
const ICON_DELETE = `<svg width="16" height="16" fill="none" class="w-4 h-4" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 2 0 00-1-1h-4a1 2 0 00-1 1v3M4 7h16"></path></svg>`;
const ICON_CHECK = `<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path></svg>`;

// DOM Elements
let elTodoList, elTodoEmpty, elDoneList, elDoneEmpty, elInpTitle, elInpDesc, elInpUrgent, elInpDueDate, elBtnAdd, elCountTodo, elCountDone;

// --- Initialization ---
function init() {
  // DOM Link
  elTodoList = document.getElementById('todoList');
  elTodoEmpty = document.getElementById('todoEmpty');
  elDoneList = document.getElementById('doneList');
  elDoneEmpty = document.getElementById('doneEmpty');
  elInpTitle = document.getElementById('inpTitle');
  elInpDesc = document.getElementById('inpDesc');
  elInpUrgent = document.getElementById('inpUrgent');
  elInpDueDate = document.getElementById('inpDueDate');
  elBtnAdd = document.getElementById('btnAdd');
  elCountTodo = document.getElementById('countTodo');
  elCountDone = document.getElementById('countDone');

  // Load Data
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      tasks = JSON.parse(raw);
      tasks.forEach(t => {
        if (!t.category) t.category = 'personal';
      });
    } catch (e) {
      console.error(e);
      tasks = [];
    }
  } else {
    // Try to load v1 if v2 empty
    const v1 = localStorage.getItem("todo_app_v1");
    if (v1) {
      try {
        const v1Tasks = JSON.parse(v1);
        tasks = v1Tasks.map(t => ({ ...t, category: 'personal' }));
        saveTasks();
      } catch (e) {}
    }
  }

  // Greetings
  document.getElementById('greetingText').textContent = getGreeting();
  document.getElementById('todayText').textContent = getTodayString();

  cleanupOldDone();
  render();

  // Event Listeners
  elBtnAdd.addEventListener('click', addTask);
  elInpTitle.addEventListener('keydown', e => {
    if (e.key === 'Enter') elBtnAdd.click();
  });
}

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function cleanupOldDone() {
  const now = Date.now();
  const initialCount = tasks.length;
  tasks = tasks.filter(t => {
    if (!t.completedAt) return true;
    return (now - new Date(t.completedAt).getTime()) < WEEK_MS;
  });
  if (tasks.length !== initialCount) saveTasks();
}

// --- Core Logic ---
window.setTab = function (tab) {
  currentTab = tab;

  // Update Tab UI
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  const buttons = document.querySelectorAll('.tab-btn');
  if (tab === 'work') buttons[0].classList.add('active');
  else buttons[1].classList.add('active');

  render();
}

function addTask() {
  const title = elInpTitle.value.trim();
  const desc = elInpDesc.value.trim();
  const urgent = elInpUrgent.checked;
  const dueDate = elInpDueDate.value;

  if (!title) {
    alert("할 일을 입력해주세요!");
    elInpTitle.focus();
    return;
  }

  const newTask = {
    id: 't-' + Date.now(),
    title,
    desc,
    urgent,
    category: currentTab,
    dueDate,
    createdAt: new Date().toISOString(),
    completedAt: null
  };

  tasks.push(newTask);
  saveTasks();

  // Reset Input
  elInpTitle.value = '';
  elInpDesc.value = '';
  elInpUrgent.checked = false;
  elInpDueDate.value = '';
  render();
}

window.toggleComplete = function (id) {
  const t = tasks.find(x => x.id === id);
  if (!t) return;

  if (t.completedAt) t.completedAt = null;
  else t.completedAt = new Date().toISOString();

  saveTasks();
  render();
}

window.deleteTask = function (id) {
  if (!confirm("정말 삭제하시겠습니까?")) return;
  tasks = tasks.filter(t => t.id !== id);
  saveTasks();
  render();
}

// --- Edit Logic ---
window.startEdit = function (id) {
  editingId = id;
  render();
  setTimeout(() => {
    const editTitleInput = document.getElementById(`edit-title-${id}`);
    if (editTitleInput) editTitleInput.focus();
  }, 50);
}

window.cancelEdit = function () {
  editingId = null;
  render();
}

window.saveEdit = function (id) {
  const t = tasks.find(x => x.id === id);
  if (!t) return;

  const newTitle = document.getElementById(`edit-title-${id}`).value.trim();
  const newDesc = document.getElementById(`edit-desc-${id}`).value.trim();
  const newDueDate = document.getElementById(`edit-date-${id}`).value;

  if (!newTitle) {
    alert("제목은 비워둘 수 없습니다.");
    return;
  }

  t.title = newTitle;
  t.desc = newDesc;
  t.dueDate = newDueDate;
  editingId = null;
  saveTasks();
  render();
}

function render() {
  const filtered = tasks.filter(t => (t.category || 'personal') === currentTab);
  const todos = filtered.filter(t => !t.completedAt);
  const dones = filtered.filter(t => t.completedAt);

  elCountTodo.textContent = todos.length;
  elCountDone.textContent = dones.length;

  todos.sort((a, b) => {
    if (a.dueDate && b.dueDate) {
      if (a.dueDate !== b.dueDate) return a.dueDate.localeCompare(b.dueDate);
    } else if (a.dueDate) {
      return -1;
    } else if (b.dueDate) {
      return 1;
    }
    return new Date(a.createdAt) - new Date(b.createdAt);
  });

  dones.sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));

  if (todos.length === 0) {
    elTodoEmpty.style.display = 'block';
    elTodoList.innerHTML = '';
  } else {
    elTodoEmpty.style.display = 'none';
    elTodoList.innerHTML = todos.map(t => {
      if (t.id === editingId) return renderEditMode(t);
      return renderTaskCard(t, false);
    }).join('');
  }

  if (dones.length === 0) {
    elDoneEmpty.style.display = 'block';
    elDoneList.innerHTML = '';
  } else {
    elDoneEmpty.style.display = 'none';
    elDoneList.innerHTML = dones.map(t => renderTaskCard(t, true)).join('');
  }
}

function renderTaskCard(t, isDone) {
  const dueStatusClass = getDueStatusClass(t.dueDate, isDone);
  return `
    <div class="task-card ${isDone ? 'done' : ''} ${dueStatusClass}">
      <button class="check-btn ${isDone ? 'checked' : ''}" onclick="toggleComplete('${t.id}')">
         ${isDone ? ICON_CHECK : ''}
      </button>
      
      <div class="task-content">
        <div class="task-title">
          ${escapeHtml(t.title)}
          ${t.urgent ? '<span class="badge-urgent">긴급</span>' : ''}
        </div>
        ${t.desc ? `<div class="task-desc">${escapeHtml(t.desc)}</div>` : ''}
      </div>

      ${!isDone && t.dueDate ? `<div class="badge-date">📅 ${formatDate(t.dueDate)}</div>` : ''}
      ${isDone && t.completedAt ? `<div class="completed-date">${formatDate(t.completedAt)}</div>` : ''}

      <div class="task-actions">
        ${!isDone ? `
          <button class="icon-btn" onclick="startEdit('${t.id}')" title="수정">
            ${ICON_EDIT}
          </button>
        ` : ''}
        <button class="icon-btn delete" onclick="deleteTask('${t.id}')" title="삭제">
          ${ICON_DELETE}
        </button>
      </div>
    </div>
  `;
}

function renderEditMode(t) {
  return `
    <div class="task-card">
      <div class="edit-container">
        <input id="edit-title-${t.id}" class="edit-input" type="text" value="${escapeHtml(t.title)}" placeholder="할 일 제목" />
        <input id="edit-desc-${t.id}" class="edit-input" type="text" value="${escapeHtml(t.desc || '')}" placeholder="설명" style="font-size:13px;" />
        <input id="edit-date-${t.id}" class="edit-input" type="date" value="${t.dueDate || ''}" style="font-size:13px;" />
        
        <div class="edit-actions">
          <button class="btn-xs btn-cancel" onclick="cancelEdit()">취소</button>
          <button class="btn-xs btn-save" onclick="saveEdit('${t.id}')">저장</button>
        </div>
      </div>
    </div>
  `;
}

// Utilities
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getGreeting() {
  const GREETINGS = [
    "Good Day 🍀", "오늘도 차분하게 🌿", "기분 좋은 하루 ☕",
    "나를 위한 시간 ✨", "천천히 가도 괜찮아요 🍃"
  ];
  const idx = new Date().getDate() % GREETINGS.length;
  return GREETINGS[idx];
}

function getTodayString() {
  const now = new Date();
  const m = now.getMonth() + 1;
  const d = now.getDate();
  const w = ["일", "월", "화", "수", "목", "금", "토"][now.getDay()];
  return `${m}월 ${d}일 (${w})`;
}

function formatDate(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  const m = date.getMonth() + 1;
  const d = date.getDate();
  return `${m}월 ${d}일`;
}

function getDueStatusClass(dueDate, isDone) {
  if (!dueDate || isDone) return '';
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const diffTime = due.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'due-today';
  if (diffDays === 1) return 'due-tomorrow';
  return '';
}

// Start
document.addEventListener('DOMContentLoaded', init);
