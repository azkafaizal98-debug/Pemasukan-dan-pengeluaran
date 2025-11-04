const api = {
  getEntries: () => fetch('/api/entries').then(r => r.json()),
  postEntry: (data) => fetch('/api/entries', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(data)
  }).then(r => r.json()),
  deleteEntry: (id) => fetch('/api/entries/'+id, {
    method: 'DELETE'
  }).then(r => r.json()),
  putEntry: (id, data) => fetch('/api/entries/'+id, {
    method: 'PUT',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(data)
  }).then(r => r.json()),
  getSummary: () => fetch('/api/summary').then(r => r.json()),
  // New APIs
  getBudgets: () => fetch('/api/budgets').then(r => r.json()),
  postBudget: (data) => fetch('/api/budgets', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(data)
  }).then(r => r.json()),
  deleteBudget: (id) => fetch('/api/budgets/'+id, { method: 'DELETE' }).then(r => r.json()),
  getRecurring: () => fetch('/api/recurring').then(r => r.json()),
  postRecurring: (data) => fetch('/api/recurring', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(data)
  }).then(r => r.json()),
  deleteRecurring: (id) => fetch('/api/recurring/'+id, { method: 'DELETE' }).then(r => r.json()),
  getGoals: () => fetch('/api/goals').then(r => r.json()),
  postGoal: (data) => fetch('/api/goals', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(data)
  }).then(r => r.json()),
  putGoal: (id, data) => fetch('/api/goals/'+id, {
    method: 'PUT',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(data)
  }).then(r => r.json()),
  deleteGoal: (id) => fetch('/api/goals/'+id, { method: 'DELETE' }).then(r => r.json()),
  getTags: () => fetch('/api/tags').then(r => r.json()),
  postTag: (data) => fetch('/api/tags', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(data)
  }).then(r => r.json()),
  deleteTag: (id) => fetch('/api/tags/'+id, { method: 'DELETE' }).then(r => r.json()),
  getReports: (month) => fetch(`/api/reports/categories${month ? '?month='+month : ''}`).then(r => r.json())
};

const $ = (sel) => document.querySelector(sel);
let currentType = 'income';
let editingId = null;

// page navigation
function showPage(name){
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.toggle('active', b.dataset.page===name));
  document.querySelectorAll('.page').forEach(p=>p.style.display = (p.id===`page-${name}`? 'block':'none'));
}

function formatRp(v){ return Number(v).toLocaleString('id-ID'); }

async function load(){
  try {
    const entries = await api.getEntries();
    console.log('Entries loaded:', entries);
    renderEntries(entries);
    updateSummary();
  } catch (error) {
    console.error('Error loading entries:', error);
  }
}

async function loadMonth(month){
  // month is YYYY-MM
  const entries = await api.getEntries();
  const filtered = entries.filter(e => e.date && e.date.slice(0,7) === month);
  renderMonthEntries(filtered);
  const income = filtered.filter(e=>e.type==='income').reduce((s,e)=>s+e.amount,0);
  const expense = filtered.filter(e=>e.type==='expense').reduce((s,e)=>s+e.amount,0);
  $('#month-income').textContent = formatRp(income);
  $('#month-expense').textContent = formatRp(expense);
  $('#month-balance').textContent = formatRp(income-expense);
}

function renderEntries(entries){
  const list = $('#entries');
  list.innerHTML = '';
  entries.forEach(e => {
    const li = document.createElement('li');
    li.className = 'entry';
    li.innerHTML = `
      <div class="meta">
        <div class="amount">${e.type==='income'?'+':'-'} Rp ${formatRp(e.amount)}</div>
        <div class="small">${e.category} • ${new Date(e.date).toLocaleDateString()}</div>
      </div>
      <div class="actions">
        <button class="btn-edit">Edit</button>
        <button class="btn-delete">Hapus</button>
      </div>
    `;
    li.querySelector('.btn-delete').addEventListener('click', async ()=>{
      if(confirm('Hapus entri ini?')){
        await api.deleteEntry(e.id);
        load();
      }
    });
    li.querySelector('.btn-edit').addEventListener('click', ()=>{
      editingId = e.id;
      $('#amount').value = e.amount;
      currentType = e.type;
      document.querySelectorAll('.type-btn').forEach(b=>b.classList.toggle('active', b.dataset.type===currentType));
      $('#category').value = e.category || '';
      $('#date').value = e.date ? new Date(e.date).toISOString().slice(0,10) : '';
      $('#note').value = e.note || '';
      window.scrollTo({top:0,behavior:'smooth'});
    });
    list.appendChild(li);
  });
}

function renderMonthEntries(entries){
  const list = $('#month-entries');
  list.innerHTML = '';
  if (!entries.length) { list.innerHTML = '<li class="small">Tidak ada entri untuk bulan ini</li>'; return }
  entries.forEach(e => {
    const li = document.createElement('li');
    li.className = 'entry';
    li.innerHTML = `
      <div class="meta">
        <div class="amount">${e.type==='income'?'+':'-'} Rp ${formatRp(e.amount)}</div>
        <div class="small">${e.category} • ${new Date(e.date).toLocaleDateString()}</div>
      </div>
      <div class="actions">
        <button class="btn-edit">Edit</button>
        <button class="btn-delete">Hapus</button>
      </div>
    `;
    li.querySelector('.btn-delete').addEventListener('click', async ()=>{
      if(confirm('Hapus entri ini?')){
        await api.deleteEntry(e.id);
        loadMonth($('#month-picker').value);
      }
    });
    li.querySelector('.btn-edit').addEventListener('click', ()=>{
      editingId = e.id;
      $('#amount').value = e.amount;
      currentType = e.type;
      document.querySelectorAll('.type-btn').forEach(b=>b.classList.toggle('active', b.dataset.type===currentType));
      $('#category').value = e.category || '';
      $('#date').value = e.date ? new Date(e.date).toISOString().slice(0,10) : '';
      $('#note').value = e.note || '';
      showPage('home');
      window.scrollTo({top:0,behavior:'smooth'});
    });
    list.appendChild(li);
  });
}

async function updateSummary(){
  const s = await api.getSummary();
  $('#total-income').textContent = formatRp(s.income);
  $('#total-expense').textContent = formatRp(s.expense);
  $('#balance').textContent = formatRp(s.balance);
}

// UI
document.addEventListener('click', (e)=>{
  if(e.target.matches('.type-btn')){
    document.querySelectorAll('.type-btn').forEach(b=>b.classList.remove('active'));
    e.target.classList.add('active');
    currentType = e.target.dataset.type;
  }
  if (e.target.matches('.nav-btn')){
    showPage(e.target.dataset.page);
  }
});

$('#entry-form').addEventListener('submit', async (ev)=>{
  ev.preventDefault();
  const amount = parseFloat($('#amount').value);
  if (isNaN(amount) || amount<=0){ alert('Masukkan jumlah yang valid'); return; }
  const data = {
    amount,
    type: currentType,
    category: $('#category').value || 'Umum',
    date: $('#date').value ? new Date($('#date').value).toISOString() : new Date().toISOString(),
    note: $('#note').value || ''
  };
  if(editingId){
    await api.putEntry(editingId, data);
    editingId = null;
  } else {
    await api.postEntry(data);
  }
  $('#entry-form').reset();
  document.querySelectorAll('.type-btn').forEach(b=>b.classList.toggle('active', b.dataset.type==='income'));
  currentType = 'income';
  load();
});

$('#reset-btn').addEventListener('click', ()=>{ $('#entry-form').reset(); editingId = null; document.querySelectorAll('.type-btn').forEach(b=>b.classList.toggle('active', b.dataset.type==='income')); currentType='income'; });

$('#search').addEventListener('input', async (e)=>{
  const q = e.target.value.toLowerCase();
  const entries = await api.getEntries();
  const filtered = entries.filter(en => (en.category||'').toLowerCase().includes(q) || (en.note||'').toLowerCase().includes(q));
  renderEntries(filtered);
});

$('#filter-type').addEventListener('change', async (e)=>{
  const v = e.target.value;
  const entries = await api.getEntries();
  const filtered = v === 'all' ? entries : entries.filter(en=>en.type===v);
  renderEntries(filtered);
});

load();

// monthly page handlers
document.getElementById('month-picker').addEventListener('change', (e)=>{
  const m = e.target.value; if (!m) return; loadMonth(m);
});

document.getElementById('export-month').addEventListener('click', ()=>{
  const m = $('#month-picker').value;
  if (!m) { alert('Pilih bulan terlebih dahulu'); return }
  fetch(`/api/export?format=xlsx&month=${m}`)
    .then(res => res.blob())
    .then(blob => {
      if (!blob) return;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `entries-${m}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    });
});

document.getElementById('export-month-csv').addEventListener('click', ()=>{
  const m = $('#month-picker').value;
  if (!m) { alert('Pilih bulan terlebih dahulu'); return }
  fetch(`/api/export?format=csv&month=${m}`)
    .then(res => res.blob())
    .then(blob => {
      if (!blob) return;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `entries-${m}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    });
});

// import
document.getElementById('import-file').addEventListener('change', async (e)=>{
  const f = e.target.files[0]; if (!f) return;
  const fd = new FormData(); fd.append('file', f);
  const res = await fetch('/api/import', { method: 'POST', body: fd });
  const j = await res.json();
  alert(`Selesai import, entri ditambahkan: ${j.added || 0}`);
  // reload current view
  if (document.querySelector('#month-picker').value) loadMonth(document.querySelector('#month-picker').value);
  load();
});

// init nav
document.querySelectorAll('.nav-btn').forEach(b=>b.addEventListener('click', ()=>{
  showPage(b.dataset.page);
  // Close mobile nav if open
  $('#nav-list').classList.remove('open');
}));
$('#nav-toggle').addEventListener('click', (e)=>{
  e.preventDefault();
  $('#nav-list').classList.toggle('open');
});

// Select navigation for mobile
$('#nav-select').addEventListener('change', (e)=>{
  showPage(e.target.value);
  // Close mobile nav if open
  $('#nav-list').classList.remove('open');
});

// Close mobile nav when clicking outside
document.addEventListener('click', (e)=>{
  if (!e.target.closest('.nav')) {
    $('#nav-list').classList.remove('open');
  }
});
showPage('home');

// New feature handlers

// Budgets
async function loadBudgets(){
  try {
    const budgets = await api.getBudgets();
    console.log('Budgets loaded:', budgets);
    const list = $('#budgets-list');
    list.innerHTML = '';
    if (!budgets.length) {
      list.innerHTML = '<li class="small">Tidak ada budget</li>';
      return;
    }
    budgets.forEach(b => {
      const li = document.createElement('li');
      li.className = 'entry';
      li.innerHTML = `
        <div class="meta">
          <div class="amount">${b.category}: Rp ${formatRp(b.amount)}</div>
          <div class="small">Bulan: ${b.month}</div>
        </div>
        <div class="actions">
          <button class="btn-delete">Hapus</button>
        </div>
      `;
      li.querySelector('.btn-delete').addEventListener('click', async ()=>{
        if(confirm('Hapus budget ini?')){
          await api.deleteBudget(b.id);
          loadBudgets();
        }
      });
      list.appendChild(li);
    });
  } catch (error) {
    console.error('Error loading budgets:', error);
  }
}

$('#budget-form').addEventListener('submit', async (e)=>{
  e.preventDefault();
  const amount = parseFloat($('#budget-amount').value);
  if (isNaN(amount) || amount<=0){ alert('Masukkan jumlah yang valid'); return; }
  const data = {
    category: $('#budget-category').value,
    amount,
    month: $('#budget-month').value
  };
  await api.postBudget(data);
  $('#budget-form').reset();
  loadBudgets();
});

// Recurring
let recurringType = 'income';

async function loadRecurring(){
  try {
    const recurring = await api.getRecurring();
    console.log('Recurring loaded:', recurring);
    const list = $('#recurring-list');
    list.innerHTML = '';
    if (!recurring.length) {
      list.innerHTML = '<li class="small">Tidak ada entri berulang</li>';
      return;
    }
    recurring.forEach(r => {
      const li = document.createElement('li');
      li.className = 'entry';
      li.innerHTML = `
        <div class="meta">
          <div class="amount">${r.type==='income'?'+':'-'} Rp ${formatRp(r.amount)}</div>
          <div class="small">${r.category} • ${r.frequency} • ${r.note || ''}</div>
        </div>
        <div class="actions">
          <button class="btn-delete">Hapus</button>
        </div>
      `;
      li.querySelector('.btn-delete').addEventListener('click', async ()=>{
        if(confirm('Hapus entri berulang ini?')){
          await api.deleteRecurring(r.id);
          loadRecurring();
        }
      });
      list.appendChild(li);
    });
  } catch (error) {
    console.error('Error loading recurring:', error);
  }
}

document.addEventListener('click', (e)=>{
  if(e.target.matches('.recurring-type-btn')){
    document.querySelectorAll('.recurring-type-btn').forEach(b=>b.classList.remove('active'));
    e.target.classList.add('active');
    recurringType = e.target.dataset.type;
  }
});

$('#recurring-form').addEventListener('submit', async (e)=>{
  e.preventDefault();
  const amount = parseFloat($('#recurring-amount').value);
  if (isNaN(amount) || amount<=0){ alert('Masukkan jumlah yang valid'); return; }
  const data = {
    amount,
    type: recurringType,
    category: $('#recurring-category').value,
    frequency: $('#recurring-frequency').value,
    note: $('#recurring-note').value
  };
  await api.postRecurring(data);
  $('#recurring-form').reset();
  document.querySelectorAll('.recurring-type-btn').forEach(b=>b.classList.toggle('active', b.dataset.type==='income'));
  recurringType = 'income';
  loadRecurring();
});

// Goals
async function loadGoals(){
  try {
    const goals = await api.getGoals();
    console.log('Goals loaded:', goals);
    const list = $('#goals-list');
    list.innerHTML = '';
    if (!goals.length) {
      list.innerHTML = '<li class="small">Tidak ada target</li>';
      return;
    }
    goals.forEach(g => {
      const progress = g.targetAmount > 0 ? (g.currentAmount / g.targetAmount * 100) : 0;
      const li = document.createElement('li');
      li.className = 'entry';
      li.innerHTML = `
        <div class="meta">
          <div class="amount">${g.name}: Rp ${formatRp(g.currentAmount)} / Rp ${formatRp(g.targetAmount)}</div>
          <div class="small">Progress: ${progress.toFixed(1)}% ${g.targetDate ? '• Target: ' + new Date(g.targetDate).toLocaleDateString() : ''}</div>
          <div style="width:100%;background:#eee;border-radius:4px;margin-top:4px"><div style="width:${progress}%;background:#007bff;height:8px;border-radius:4px"></div></div>
        </div>
        <div class="actions">
          <button class="btn-edit">Update</button>
          <button class="btn-delete">Hapus</button>
        </div>
      `;
      li.querySelector('.btn-edit').addEventListener('click', ()=>{
        const newAmount = prompt('Jumlah saat ini:', g.currentAmount);
        if (newAmount !== null) {
          api.putGoal(g.id, { currentAmount: parseFloat(newAmount) || 0 }).then(loadGoals);
        }
      });
      li.querySelector('.btn-delete').addEventListener('click', async ()=>{
        if(confirm('Hapus target ini?')){
          await api.deleteGoal(g.id);
          loadGoals();
        }
      });
      list.appendChild(li);
    });
  } catch (error) {
    console.error('Error loading goals:', error);
  }
}

$('#goal-form').addEventListener('submit', async (e)=>{
  e.preventDefault();
  const targetAmount = parseFloat($('#goal-target').value);
  if (isNaN(targetAmount) || targetAmount<=0){ alert('Masukkan jumlah target yang valid'); return; }
  const data = {
    name: $('#goal-name').value,
    targetAmount,
    currentAmount: parseFloat($('#goal-current').value) || 0,
    targetDate: $('#goal-date').value || null
  };
  await api.postGoal(data);
  $('#goal-form').reset();
  loadGoals();
});

// Tags
async function loadTags(){
  try {
    const tags = await api.getTags();
    console.log('Tags loaded:', tags);
    const list = $('#tags-list');
    list.innerHTML = '';
    if (!tags.length) {
      list.innerHTML = '<li class="small">Tidak ada tag</li>';
      return;
    }
    tags.forEach(t => {
      const li = document.createElement('li');
      li.className = 'entry';
      li.innerHTML = `
        <div class="meta">
          <div style="display:flex;align-items:center;gap:8px">
            <div style="width:16px;height:16px;border-radius:50%;background:${t.color}"></div>
            <div class="amount">${t.name}</div>
          </div>
        </div>
        <div class="actions">
          <button class="btn-delete">Hapus</button>
        </div>
      `;
      li.querySelector('.btn-delete').addEventListener('click', async ()=>{
        if(confirm('Hapus tag ini?')){
          await api.deleteTag(t.id);
          loadTags();
        }
      });
      list.appendChild(li);
    });
  } catch (error) {
    console.error('Error loading tags:', error);
  }
}

$('#tag-form').addEventListener('submit', async (e)=>{
  e.preventDefault();
  const data = {
    name: $('#tag-name').value,
    color: $('#tag-color').value
  };
  await api.postTag(data);
  $('#tag-form').reset();
  loadTags();
});

// Reports
$('#generate-report').addEventListener('click', async ()=>{
  const month = $('#report-month').value;
  const data = await api.getReports(month);
  const list = $('#report-list');
  list.innerHTML = '';
  const chart = $('#report-chart');
  chart.innerHTML = '';

  Object.keys(data).forEach(cat => {
    const d = data[cat];
    const li = document.createElement('li');
    li.className = 'entry';
    li.innerHTML = `
      <div class="meta">
        <div class="amount">${cat}</div>
        <div class="small">Pemasukan: Rp ${formatRp(d.income)} • Pengeluaran: Rp ${formatRp(d.expense)} • Jumlah: ${d.count}</div>
      </div>
    `;
    list.appendChild(li);

    // Simple bar chart
    const bar = document.createElement('div');
    bar.style.cssText = `display:flex;margin:4px 0;`;
    bar.innerHTML = `
      <div style="width:120px;font-size:12px;">${cat}</div>
      <div style="flex:1;background:#eee;border-radius:4px;overflow:hidden;">
        <div style="width:${Math.min(d.expense / 1000000 * 100, 100)}%;background:#dc3545;height:20px;"></div>
      </div>
      <div style="margin-left:8px;font-size:12px;">Rp ${formatRp(d.expense)}</div>
    `;
    chart.appendChild(bar);
  });
});

// Dashboard
async function loadDashboard(){
  try {
    const [entries, budgets, recurring, goals, tags] = await Promise.all([
      api.getEntries(),
      api.getBudgets(),
      api.getRecurring(),
      api.getGoals(),
      api.getTags()
    ]);
    console.log('Dashboard data loaded:', {entries, budgets, recurring, goals, tags});

    // Update counts
    $('#dashboard-entries-count').textContent = entries.length;
    $('#dashboard-budgets-count').textContent = budgets.length;
    $('#dashboard-recurring-count').textContent = recurring.length;
    $('#dashboard-goals-count').textContent = goals.length;
    $('#dashboard-tags-count').textContent = tags.length;

    // Recent entries
    const recentEntries = entries.slice(-5).reverse();
    const entriesList = $('#dashboard-recent-entries');
    entriesList.innerHTML = '';
    recentEntries.forEach(e => {
      const li = document.createElement('li');
      li.className = 'entry';
      li.innerHTML = `
        <div class="meta">
          <div class="amount">${e.type==='income'?'+':'-'} Rp ${formatRp(e.amount)}</div>
          <div class="small">${e.category} • ${new Date(e.date).toLocaleDateString()}</div>
        </div>
      `;
      entriesList.appendChild(li);
    });

    // Recent budgets
    const recentBudgets = budgets.slice(-5).reverse();
    const budgetsList = $('#dashboard-recent-budgets');
    budgetsList.innerHTML = '';
    recentBudgets.forEach(b => {
      const li = document.createElement('li');
      li.className = 'entry';
      li.innerHTML = `
        <div class="meta">
          <div class="amount">${b.category}: Rp ${formatRp(b.amount)}</div>
          <div class="small">Bulan: ${b.month}</div>
        </div>
      `;
      budgetsList.appendChild(li);
    });

    // Recent recurring
    const recentRecurring = recurring.slice(-5).reverse();
    const recurringList = $('#dashboard-recent-recurring');
    recurringList.innerHTML = '';
    recentRecurring.forEach(r => {
      const li = document.createElement('li');
      li.className = 'entry';
      li.innerHTML = `
        <div class="meta">
          <div class="amount">${r.type==='income'?'+':'-'} Rp ${formatRp(r.amount)}</div>
          <div class="small">${r.category} • ${r.frequency}</div>
        </div>
      `;
      recurringList.appendChild(li);
    });

    // Recent goals
    const recentGoals = goals.slice(-5).reverse();
    const goalsList = $('#dashboard-recent-goals');
    goalsList.innerHTML = '';
    recentGoals.forEach(g => {
      const li = document.createElement('li');
      li.className = 'entry';
      li.innerHTML = `
        <div class="meta">
          <div class="amount">${g.name}: Rp ${formatRp(g.currentAmount)} / Rp ${formatRp(g.targetAmount)}</div>
          <div class="small">Progress: ${g.targetAmount > 0 ? (g.currentAmount / g.targetAmount * 100).toFixed(1) : 0}%</div>
        </div>
      `;
      goalsList.appendChild(li);
    });

    // Recent tags
    const recentTags = tags.slice(-5).reverse();
    const tagsList = $('#dashboard-recent-tags');
    tagsList.innerHTML = '';
    recentTags.forEach(t => {
      const li = document.createElement('li');
      li.className = 'entry';
      li.innerHTML = `
        <div class="meta">
          <div style="display:flex;align-items:center;gap:8px">
            <div style="width:16px;height:16px;border-radius:50%;background:${t.color}"></div>
            <div class="amount">${t.name}</div>
          </div>
        </div>
      `;
      tagsList.appendChild(li);
    });
  } catch (error) {
    console.error('Error loading dashboard:', error);
  }
}

// Load data for new pages when navigated to
document.addEventListener('click', (e)=>{
  if (e.target.matches('.nav-btn')) {
    const page = e.target.dataset.page;
    if (page === 'dashboard') loadDashboard();
    if (page === 'budgets') loadBudgets();
    if (page === 'recurring') loadRecurring();
    if (page === 'goals') loadGoals();
    if (page === 'tags') loadTags();
  }
});
