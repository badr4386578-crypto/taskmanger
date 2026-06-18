document.addEventListener('DOMContentLoaded', () => {
  const STORAGE_KEY = 'novatask_v2';
  const THEME_KEY = 'novatask_theme';

  const $ = (id) => document.getElementById(id);

  const els = {
    sidebar: $('sidebar'),
    overlay: $('overlay'),
    openSidebarBtn: $('openSidebarBtn'),
    closeSidebarBtn: $('closeSidebarBtn'),
    themeToggle: $('themeToggle'),
    themeLabel: $('themeLabel'),
    todayText: $('todayText'),
    taskForm: $('taskForm'),
    taskList: $('taskList'),
    emptyState: $('emptyState'),
    taskCardTemplate: $('taskCardTemplate'),
    activityTemplate: $('activityTemplate'),
    activityList: $('activityList'),
    miniActivity: $('miniActivity'),
    clearActivityBtn: $('clearActivityBtn'),
    taskViews: {
      overview: $('overviewView'),
      tasks: $('tasksView'),
      board: $('boardView'),
      calendar: $('calendarView'),
      activity: $('activityView'),
    },
    navButtons: [...document.querySelectorAll('.nav-btn')],
    statTotal: $('statTotal'),
    statDoing: $('statDoing'),
    statDone: $('statDone'),
    statDueSoon: $('statDueSoon'),
    statHigh: $('statHigh'),
    statOverdue: $('statOverdue'),
    completionRate: $('completionRate'),
    completionBar: $('completionBar'),
    focusBar: $('focusBar'),
    focusScore: $('focusScore'),
    countTodo: $('countTodo'),
    countDoing: $('countDoing'),
    countDone: $('countDone'),
    boardTodo: $('boardTodo'),
    boardDoing: $('boardDoing'),
    boardDone: $('boardDone'),
    calendarList: $('calendarList'),
    title: $('title'),
    description: $('description'),
    category: $('category'),
    priority: $('priority'),
    status: $('status'),
    dueDate: $('dueDate'),
    assignee: $('assignee'),
    tags: $('tags'),
    editingId: $('editingId'),
    clearFormBtn: $('clearFormBtn'),
    cancelEditBtn: $('cancelEditBtn'),
    searchInput: $('searchInput'),
    filterStatus: $('filterStatus'),
    filterPriority: $('filterPriority'),
    sortBy: $('sortBy'),
    hideCompletedBtn: $('hideCompletedBtn'),
    showAllBtn: $('showAllBtn'),
    resetAllBtn: $('resetAllBtn'),
    addSampleBtn: $('addSampleBtn'),
    exportBtn: $('exportBtn'),
    importInput: $('importInput'),
  };

  if (!els.taskForm || !els.taskList) return;

  let tasks = loadJSON(STORAGE_KEY, []);
  let activity = loadJSON('novatask_activity', []);
  let hideCompleted = false;
  let theme = localStorage.getItem(THEME_KEY) || 'aurora';

  function loadJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    localStorage.setItem('novatask_activity', JSON.stringify(activity));
  }

  function uid() {
    return crypto?.randomUUID?.() ?? String(Date.now() + Math.random());
  }

  function nowLabel() {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short', month: 'short', day: 'numeric',
    }).format(new Date());
  }

  function fullTime(ts) {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    }).format(new Date(ts));
  }

  function dueLabel(value) {
    if (!value) return 'No due date';
    return new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(value + 'T00:00:00'));
  }

  function priorityMeta(priority) {
    if (priority === 'high') return { label: 'High', cls: 'bg-rose-400/15 text-rose-200 border border-rose-400/20' };
    if (priority === 'medium') return { label: 'Medium', cls: 'bg-amber-400/15 text-amber-200 border border-amber-400/20' };
    return { label: 'Low', cls: 'bg-emerald-400/15 text-emerald-200 border border-emerald-400/20' };
  }

  function statusMeta(status) {
    if (status === 'done') return { label: 'Done', cls: 'bg-emerald-400/15 text-emerald-200 border border-emerald-400/20' };
    if (status === 'doing') return { label: 'In Progress', cls: 'bg-cyan-400/15 text-cyan-200 border border-cyan-400/20' };
    return { label: 'To Do', cls: 'bg-slate-400/15 text-slate-200 border border-slate-400/20' };
  }

  function addActivity(message) {
    activity.unshift({ id: uid(), message, createdAt: Date.now() });
    activity = activity.slice(0, 30);
    saveState();
    renderActivity();
  }

  function setTheme(next) {
    theme = next;
    localStorage.setItem(THEME_KEY, theme);
    document.body.dataset.theme = theme;
    if (els.themeLabel) {
      els.themeLabel.textContent = theme === 'aurora' ? 'Aurora Dark' : theme === 'midnight' ? 'Midnight Blue' : 'Emerald Night';
    }
  }

  function cycleTheme() {
    const order = ['aurora', 'midnight', 'emerald'];
    const next = order[(order.indexOf(theme) + 1) % order.length];
    setTheme(next);
  }

  function filteredTasks() {
    const q = els.searchInput.value.trim().toLowerCase();
    const status = els.filterStatus.value;
    const priority = els.filterPriority.value;

    let list = tasks.filter(task => {
      const hay = [task.title, task.description, task.category, task.assignee, task.tags.join(',')].join(' ').toLowerCase();
      const matchesQuery = !q || hay.includes(q);
      const matchesStatus = status === 'all' || task.status === status;
      const matchesPriority = priority === 'all' || task.priority === priority;
      const matchesHide = !hideCompleted || task.status !== 'done';
      return matchesQuery && matchesStatus && matchesPriority && matchesHide;
    });

    list.sort((a, b) => {
      if (els.sortBy.value === 'oldest') return a.createdAt - b.createdAt;
      if (els.sortBy.value === 'priority') {
        const order = { high: 0, medium: 1, low: 2 };
        return (order[a.priority] - order[b.priority]) || (b.createdAt - a.createdAt);
      }
      if (els.sortBy.value === 'dueDate') {
        const aa = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
        const bb = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
        return aa - bb || b.createdAt - a.createdAt;
      }
      return b.createdAt - a.createdAt;
    });
    return list;
  }

  function renderStats() {
    const total = tasks.length;
    const doing = tasks.filter(t => t.status === 'doing').length;
    const done = tasks.filter(t => t.status === 'done').length;
    const high = tasks.filter(t => t.priority === 'high').length;
    const overdue = tasks.filter(t => t.dueDate && t.status !== 'done' && new Date(t.dueDate + 'T23:59:59') < new Date()).length;
    const dueSoon = tasks.filter(t => {
      if (!t.dueDate || t.status === 'done') return false;
      const diff = (new Date(t.dueDate + 'T23:59:59') - new Date()) / 86400000;
      return diff >= 0 && diff <= 3;
    }).length;
    const rate = total ? Math.round((done / total) * 100) : 0;
    const focus = Math.max(10, Math.min(98, rate + (doing * 6) - (overdue * 8) + 35));

    els.statTotal.textContent = total;
    els.statDoing.textContent = doing;
    els.statDone.textContent = done;
    els.statHigh.textContent = high;
    els.statOverdue.textContent = overdue;
    els.statDueSoon.textContent = dueSoon;
    els.completionRate.textContent = `${rate}%`;
    els.completionBar.style.width = `${rate}%`;
    els.focusBar.style.width = `${focus}%`;
    els.focusScore.textContent = `${focus}%`;
  }

  function renderActivity() {
    els.activityList.innerHTML = '';
    els.miniActivity.innerHTML = '';
    if (!activity.length) {
      const empty = `<div class="rounded-2xl border border-dashed border-white/10 bg-slate-900/40 p-4 text-sm text-slate-400">No activity yet.</div>`;
      els.activityList.innerHTML = empty;
      els.miniActivity.innerHTML = empty;
      return;
    }

    activity.slice(0, 10).forEach(item => {
      const desktopNode = els.activityTemplate.content.cloneNode(true);
      desktopNode.querySelector('[data-text]').textContent = item.message;
      desktopNode.querySelector('[data-time]').textContent = fullTime(item.createdAt);

      const mobileNode = els.activityTemplate.content.cloneNode(true);
      mobileNode.querySelector('[data-text]').textContent = item.message;
      mobileNode.querySelector('[data-time]').textContent = fullTime(item.createdAt);

      els.activityList.appendChild(desktopNode);
      els.miniActivity.appendChild(mobileNode);
    });
  }

  function renderBoard() {
    const groups = {
      todo: els.boardTodo,
      doing: els.boardDoing,
      done: els.boardDone,
    };

    ['todo', 'doing', 'done'].forEach(status => {
      groups[status].innerHTML = '';
    });

    const list = filteredTasks();
    els.countTodo.textContent = tasks.filter(t => t.status === 'todo').length;
    els.countDoing.textContent = tasks.filter(t => t.status === 'doing').length;
    els.countDone.textContent = tasks.filter(t => t.status === 'done').length;

    list.forEach(task => groups[task.status].appendChild(taskCard(task, true)));
  }

  function renderCalendar() {
    const list = [...tasks].filter(t => t.dueDate).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    const grouped = new Map();
    list.forEach(task => {
      if (!grouped.has(task.dueDate)) grouped.set(task.dueDate, []);
      grouped.get(task.dueDate).push(task);
    });

    els.calendarList.innerHTML = '';
    if (!list.length) {
      els.calendarList.innerHTML = `<div class="rounded-3xl border border-dashed border-white/10 bg-slate-900/40 p-8 text-center text-slate-400">No dated tasks yet.</div>`;
      return;
    }

    [...grouped.entries()].forEach(([date, items]) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'rounded-3xl border border-white/10 bg-slate-900/60 p-4';
      wrapper.innerHTML = `
        <div class="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
          <h4 class="font-semibold">${dueLabel(date)}</h4>
          <span class="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold">${items.length} task(s)</span>
        </div>
        <div class="mt-4 space-y-3" data-list></div>
      `;
      const listEl = wrapper.querySelector('[data-list]');
      items.forEach(task => listEl.appendChild(taskCard(task, false)));
      els.calendarList.appendChild(wrapper);
    });
  }

  function renderTasks() {
    const list = filteredTasks();
    els.taskList.innerHTML = '';
    if (!list.length) {
      els.emptyState.classList.remove('hidden');
    } else {
      els.emptyState.classList.add('hidden');
      list.forEach(task => els.taskList.appendChild(taskCard(task, false)));
    }
    renderStats();
    renderBoard();
    renderCalendar();
    renderActivity();
    updateToday();
  }

  function updateToday() {
    if (els.todayText) els.todayText.textContent = nowLabel();
  }

  function taskCard(task, compact) {
    const node = els.taskCardTemplate.content.cloneNode(true);
    const card = node.querySelector('article');
    const priority = priorityMeta(task.priority);
    const status = statusMeta(task.status);

    node.querySelector('[data-priority]').textContent = `Priority: ${priority.label}`;
    node.querySelector('[data-priority]').className = `pill ${priority.cls}`;
    node.querySelector('[data-status]').textContent = status.label;
    node.querySelector('[data-status]').className = `pill ${status.cls}`;
    node.querySelector('[data-category]').textContent = task.category ? `#${task.category}` : '#General';
    node.querySelector('[data-title]').textContent = task.title;
    node.querySelector('[data-description]').textContent = task.description || 'No description provided.';
    node.querySelector('[data-due]').textContent = `Due: ${dueLabel(task.dueDate)}`;
    node.querySelector('[data-assignee]').textContent = `Assignee: ${task.assignee || 'Unassigned'}`;
    node.querySelector('[data-tags]').textContent = task.tags.length ? `Tags: ${task.tags.join(', ')}` : 'Tags: none';

    if (compact) card.classList.add('p-4');

    card.querySelector('[data-action="toggle"]').addEventListener('click', () => toggleTask(task.id));
    card.querySelector('[data-action="edit"]').addEventListener('click', () => startEdit(task.id));
    card.querySelector('[data-action="duplicate"]').addEventListener('click', () => duplicateTask(task.id));
    card.querySelector('[data-action="delete"]').addEventListener('click', () => deleteTask(task.id));

    return node;
  }

  function parseTags(value) {
    return value.split(',').map(t => t.trim()).filter(Boolean);
  }

  function startEdit(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    els.editingId.value = task.id;
    els.title.value = task.title;
    els.description.value = task.description;
    els.category.value = task.category;
    els.priority.value = task.priority;
    els.status.value = task.status;
    els.dueDate.value = task.dueDate;
    els.assignee.value = task.assignee;
    els.tags.value = task.tags.join(', ');
    showView('overview');
    addActivity(`Editing task: ${task.title}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function resetForm() {
    els.taskForm.reset();
    els.priority.value = 'medium';
    els.status.value = 'todo';
    els.editingId.value = '';
    els.title.focus();
  }

  function deleteTask(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    if (!confirm(`Delete task: ${task.title}?`)) return;
    tasks = tasks.filter(t => t.id !== id);
    saveState();
    addActivity(`Deleted task: ${task.title}`);
    renderTasks();
    resetForm();
  }

  function duplicateTask(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    const copy = { ...task, id: uid(), title: `${task.title} (copy)`, createdAt: Date.now() };
    tasks.unshift(copy);
    saveState();
    addActivity(`Duplicated task: ${task.title}`);
    renderTasks();
  }

  function toggleTask(id) {
    tasks = tasks.map(task => task.id === id ? { ...task, status: task.status === 'done' ? 'todo' : 'done' } : task);
    saveState();
    const task = tasks.find(t => t.id === id);
    if (task) addActivity(`Toggled status: ${task.title} → ${task.status}`);
    renderTasks();
  }

  function futureDate(offsetDays) {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return d.toISOString().slice(0, 10);
  }

  function addSampleData() {
    const sample = [
      {
        id: uid(),
        title: 'Redesign homepage hero',
        description: 'Update the hero section with stronger CTA and new visual hierarchy.',
        category: 'UI', priority: 'high', status: 'doing', dueDate: futureDate(2), assignee: 'Mina', tags: ['ui', 'landing', 'urgent'], createdAt: Date.now() - 1000000,
      },
      {
        id: uid(),
        title: 'Prepare sprint backlog',
        description: 'Gather tasks, estimate points, and prioritize the next sprint.',
        category: 'Product', priority: 'medium', status: 'todo', dueDate: futureDate(4), assignee: 'Sara', tags: ['planning', 'team'], createdAt: Date.now() - 2000000,
      },
      {
        id: uid(),
        title: 'Fix mobile spacing issues',
        description: 'Audit responsive breakpoints and patch layout gaps on small screens.',
        category: 'Frontend', priority: 'high', status: 'done', dueDate: futureDate(-1), assignee: 'You', tags: ['bug', 'mobile'], createdAt: Date.now() - 3000000,
      },
      {
        id: uid(),
        title: 'Draft release notes',
        description: 'Summarize changes for the new release and share with stakeholders.',
        category: 'Docs', priority: 'low', status: 'todo', dueDate: '', assignee: 'Omar', tags: ['docs'], createdAt: Date.now() - 4000000,
      },
    ];
    tasks = [...sample, ...tasks];
    saveState();
    addActivity('Imported demo tasks');
    renderTasks();
  }

  function exportTasks() {
    const blob = new Blob([JSON.stringify({ tasks, activity, exportedAt: Date.now() }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'novatask-export.json';
    a.click();
    URL.revokeObjectURL(url);
    addActivity('Exported data as JSON');
  }

  async function importTasks(file) {
    const text = await file.text();
    const data = JSON.parse(text);
    if (Array.isArray(data.tasks)) {
      tasks = data.tasks;
    } else if (Array.isArray(data)) {
      tasks = data;
    } else {
      alert('Invalid JSON format.');
      return;
    }
    if (Array.isArray(data.activity)) activity = data.activity;
    saveState();
    addActivity('Imported tasks from JSON');
    renderTasks();
  }

  function showView(view) {
    Object.entries(els.taskViews).forEach(([name, el]) => {
      if (el) el.classList.toggle('hidden', name !== view);
    });
    els.navButtons.forEach(btn => btn.classList.toggle('active-nav', btn.dataset.view === view));
    if (window.innerWidth < 1024) closeSidebar();
  }

  function openSidebar() {
    els.sidebar?.classList.remove('-translate-x-full');
    els.overlay?.classList.remove('hidden');
  }

  function closeSidebar() {
    els.sidebar?.classList.add('-translate-x-full');
    els.overlay?.classList.add('hidden');
  }

  function clearEverything() {
    if (!confirm('Reset all tasks and activity?')) return;
    tasks = [];
    activity = [];
    saveState();
    addActivity('Workspace reset');
    renderTasks();
    resetForm();
  }

  function attachEvents() {
    els.taskForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const payload = {
        title: els.title.value.trim(),
        description: els.description.value.trim(),
        category: els.category.value.trim(),
        priority: els.priority.value,
        status: els.status.value,
        dueDate: els.dueDate.value,
        assignee: els.assignee.value.trim(),
        tags: parseTags(els.tags.value),
      };
      if (!payload.title) return;

      const editingId = els.editingId.value;
      if (editingId) {
        tasks = tasks.map(task => task.id === editingId ? { ...task, ...payload } : task);
        addActivity(`Updated task: ${payload.title}`);
      } else {
        tasks.unshift({ id: uid(), ...payload, createdAt: Date.now() });
        addActivity(`Created task: ${payload.title}`);
      }
      saveState();
      renderTasks();
      resetForm();
    });

    els.clearFormBtn?.addEventListener('click', resetForm);
    els.cancelEditBtn?.addEventListener('click', resetForm);
    els.themeToggle?.addEventListener('click', cycleTheme);
    els.openSidebarBtn?.addEventListener('click', openSidebar);
    els.closeSidebarBtn?.addEventListener('click', closeSidebar);
    els.overlay?.addEventListener('click', closeSidebar);
    els.resetAllBtn?.addEventListener('click', clearEverything);
    els.addSampleBtn?.addEventListener('click', addSampleData);
    els.exportBtn?.addEventListener('click', exportTasks);
    els.clearActivityBtn?.addEventListener('click', () => {
      activity = [];
      saveState();
      renderActivity();
    });

    els.importInput?.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (file) {
        try {
          await importTasks(file);
        } catch {
          alert('Could not import this file.');
        }
      }
      e.target.value = '';
    });

    [els.searchInput, els.filterStatus, els.filterPriority, els.sortBy].forEach(el => el.addEventListener('input', renderTasks));

    els.hideCompletedBtn?.addEventListener('click', () => {
      hideCompleted = true;
      renderTasks();
    });

    els.showAllBtn?.addEventListener('click', () => {
      hideCompleted = false;
      renderTasks();
    });

    els.navButtons.forEach(btn => btn.addEventListener('click', () => showView(btn.dataset.view)));

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeSidebar();
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        els.searchInput?.focus();
      }
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth >= 1024) {
        els.sidebar?.classList.remove('-translate-x-full');
        els.overlay?.classList.add('hidden');
      } else if (!els.sidebar?.classList.contains('-translate-x-full')) {
        els.overlay?.classList.remove('hidden');
      }
    });
  }

  setTheme(theme);
  updateToday();
  attachEvents();
  renderTasks();
  showView('overview');

  if (window.innerWidth < 1024) closeSidebar();
});