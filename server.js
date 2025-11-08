const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';

// Setup Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Fallback ke JSON lokal jika Supabase tidak dikonfigurasi
const DB_PATH = path.join(__dirname, 'data', 'db.json');
const useSupabase = supabaseUrl && supabaseKey;

app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// multer digunakan untuk upload file (in-memory)
const upload = multer({ storage: multer.memoryStorage() });

async function readDB(){
  // Fungsi untuk membaca data dari database
  if (useSupabase) {
    // Jika menggunakan Supabase, baca dari tabel-tabel di Supabase
    const tables = ['entries', 'budgets', 'recurring', 'goals', 'tags'];
    const db = {};
    for (const table of tables) {
      const { data, error } = await supabase.from(table).select('*').order('createdAt', { ascending: false });
      if (error) {
        console.error(`Error membaca ${table}:`, error);
        db[table] = [];
      } else {
        db[table] = data || [];
      }
    }
    return db;
  } else {
    // Jika tidak menggunakan Supabase, baca dari file JSON lokal
    try{
      const txt = await fs.readFile(DB_PATH, 'utf8');
      return JSON.parse(txt);
    }catch(e){
      return { entries: [], budgets: [], recurring: [], goals: [], tags: [] };
    }
  }
}

async function writeDB(db){
  // Fungsi untuk menulis data ke database
  if (useSupabase) {
    // Jika menggunakan Supabase, tidak perlu menulis ke file karena data langsung disimpan ke tabel
    return;
  } else {
    // Jika tidak menggunakan Supabase, simpan ke file JSON lokal
    await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
    await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2));
  }
}



// API
app.get('/api/entries', async (req, res) => {
  const db = await readDB();
  res.json(db.entries);
});

app.post('/api/entries', async (req, res) => {
  const { amount, type, category, date, note } = req.body;
  if (typeof amount !== 'number' || isNaN(amount) || amount <= 0 || !['income', 'expense'].includes(type)) {
    return res.status(400).json({ error: 'Payload tidak valid' });
  }
  const entry = {
    amount,
    type,
    category: category || 'Umum',
    date: date || new Date().toISOString(),
    note: note || '',
    createdAt: new Date().toISOString()
  };
  if (!useSupabase) {
    entry.id = uuidv4();
  }
  if (useSupabase) {
    const { data, error } = await supabase.from('entries').insert([entry]).select();
    if (error) {
      console.error('Error inserting entry:', error);
      return res.status(500).json({ error: 'Gagal menyimpan data' });
    }
    res.json(data[0]);
  } else {
    const db = await readDB();
    db.entries.unshift(entry);
    await writeDB(db);
    res.json(entry);
  }
});

app.put('/api/entries/:id', async (req, res) => {
  const id = req.params.id;
  if (useSupabase) {
    const { data, error } = await supabase.from('entries').update(req.body).eq('id', id).select();
    if (error) {
      console.error('Error updating entry:', error);
      return res.status(500).json({ error: 'Gagal update data' });
    }
    if (data.length === 0) return res.status(404).json({ error: 'Entri tidak ditemukan' });
    res.json(data[0]);
  } else {
    const db = await readDB();
    const idx = db.entries.findIndex(e => e.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Entri tidak ditemukan' });
    const updated = { ...db.entries[idx], ...req.body };
    db.entries[idx] = updated;
    await writeDB(db);
    res.json(updated);
  }
});

app.delete('/api/entries/:id', async (req, res) => {
  const id = req.params.id;
  if (useSupabase) {
    const { error } = await supabase.from('entries').delete().eq('id', id);
    if (error) {
      console.error('Error deleting entry:', error);
      return res.status(500).json({ error: 'Gagal hapus data' });
    }
    res.json({ success: true });
  } else {
    const db = await readDB();
    const before = db.entries.length;
    db.entries = db.entries.filter(e => e.id !== id);
    if (db.entries.length === before) return res.status(404).json({ error: 'Entri tidak ditemukan' });
    await writeDB(db);
    res.json({ success: true });
  }
});

app.get('/api/summary', async (req, res) => {
  const db = await readDB();
  const income = db.entries.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0);
  const expense = db.entries.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0);
  res.json({ income, expense, balance: income - expense, count: db.entries.length });
});

// Ekspor entri sebagai CSV atau XLSX. Query opsional: month=YYYY-MM untuk filter bulan
app.get('/api/export', async (req, res) => {
  const { format = 'xlsx', month } = req.query;
  const db = await readDB();
  let entries = db.entries;
  if (month) {
    // format bulan: YYYY-MM
    entries = entries.filter(e => e.date && e.date.slice(0,7) === month);
  }
  const rows = entries.map(e => ({ id: e.id, amount: e.amount, type: e.type, category: e.category, date: e.date, note: e.note }));

  if (format === 'csv') {
    const header = 'id,amount,type,category,date,note';
    const csv = [header].concat(rows.map(r => `${r.id},${r.amount},${r.type},"${(r.category||'').replace(/"/g,'""')}",${r.date},"${(r.note||'').replace(/"/g,'""')}"`)).join('\n');
    res.setHeader('Content-Disposition', `attachment; filename="entries${month?'-'+month:''}.csv"`);
    res.setHeader('Content-Type', 'text/csv');
    return res.send(csv);
  }

  // xlsx
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Entries');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Disposition', `attachment; filename="entries${month?'-'+month:''}.xlsx"`);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buf);
});

// Impor entri dari file Excel/CSV yang diupload (multipart/form-data, nama field 'file')
app.post('/api/import', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'File tidak ditemukan' });
  let workbook;
  try {
    workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
  } catch (err) {
    return res.status(400).json({ error: 'Gagal membaca file' });
  }
  const firstSheet = workbook.SheetNames[0];
  const data = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet], { defval: '' });
  // Kolom yang diharapkan: amount, type, category, date, note (id diabaikan)
  let added = 0;
  const entriesToAdd = [];
  for (const row of data) {
    const amount = Number(row.amount || row.Amount || row.AMOUNT);
    const type = (row.type || row.Type || '').toString().toLowerCase();
    if (isNaN(amount) || !['income', 'expense'].includes(type)) continue;
    const entry = { amount, type, category: row.category || row.Category || 'Umum', date: row.date ? new Date(row.date).toISOString() : new Date().toISOString(), note: row.note || row.Note || '', createdAt: new Date().toISOString() };
    if (!useSupabase) {
      entry.id = uuidv4();
    }
    entriesToAdd.push(entry);
    added++;
  }
  if (useSupabase) {
    const { data: inserted, error } = await supabase.from('entries').insert(entriesToAdd).select();
    if (error) {
      console.error('Error inserting entries:', error);
      return res.status(500).json({ error: 'Gagal menyimpan data' });
    }
    res.json({ added: inserted.length });
  } else {
    const db = await readDB();
    db.entries.unshift(...entriesToAdd);
    await writeDB(db);
    res.json({ added });
  }
});

// API baru untuk fitur tambahan

// Budgets
app.get('/api/budgets', async (req, res) => {
  const db = await readDB();
  res.json(db.budgets);
});

app.post('/api/budgets', async (req, res) => {
  const { category, amount, month } = req.body;
  if (typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({ error: 'Jumlah budget tidak valid' });
  }
  const budget = {
    category: category || 'Umum',
    amount,
    month: month || new Date().toISOString().slice(0,7),
    createdAt: new Date().toISOString()
  };
  if (!useSupabase) {
    budget.id = uuidv4();
  }
  if (useSupabase) {
    const { data, error } = await supabase.from('budgets').insert([budget]).select();
    if (error) {
      console.error('Error inserting budget:', error);
      return res.status(500).json({ error: 'Gagal menyimpan budget' });
    }
    res.json(data[0]);
  } else {
    const db = await readDB();
    db.budgets.unshift(budget);
    await writeDB(db);
    res.json(budget);
  }
});

app.put('/api/budgets/:id', async (req, res) => {
  const id = req.params.id;
  if (useSupabase) {
    const { data, error } = await supabase.from('budgets').update(req.body).eq('id', id).select();
    if (error) {
      console.error('Error updating budget:', error);
      return res.status(500).json({ error: 'Gagal update budget' });
    }
    if (data.length === 0) return res.status(404).json({ error: 'Budget tidak ditemukan' });
    res.json(data[0]);
  } else {
    const db = await readDB();
    const idx = db.budgets.findIndex(b => b.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Budget tidak ditemukan' });
    const updated = { ...db.budgets[idx], ...req.body };
    db.budgets[idx] = updated;
    await writeDB(db);
    res.json(updated);
  }
});

app.delete('/api/budgets/:id', async (req, res) => {
  const id = req.params.id;
  if (useSupabase) {
    const { error } = await supabase.from('budgets').delete().eq('id', id);
    if (error) {
      console.error('Error deleting budget:', error);
      return res.status(500).json({ error: 'Gagal hapus budget' });
    }
    res.json({ success: true });
  } else {
    const db = await readDB();
    const before = db.budgets.length;
    db.budgets = db.budgets.filter(b => b.id !== id);
    if (db.budgets.length === before) return res.status(404).json({ error: 'Budget tidak ditemukan' });
    await writeDB(db);
    res.json({ success: true });
  }
});

// Entri Berulang
app.get('/api/recurring', async (req, res) => {
  const db = await readDB();
  res.json(db.recurring);
});

app.post('/api/recurring', async (req, res) => {
  const { amount, type, category, frequency, note } = req.body;
  if (typeof amount !== 'number' || isNaN(amount) || amount <= 0 || !['income', 'expense'].includes(type) || !['daily', 'weekly', 'monthly', 'yearly'].includes(frequency)) {
    return res.status(400).json({ error: 'Data tidak valid' });
  }
  const recurring = {
    amount,
    type,
    category: category || 'Umum',
    frequency,
    note: note || '',
    createdAt: new Date().toISOString()
  };
  if (!useSupabase) {
    recurring.id = uuidv4();
  }
  if (useSupabase) {
    const { data, error } = await supabase.from('recurring').insert([recurring]).select();
    if (error) {
      console.error('Error inserting recurring:', error);
      return res.status(500).json({ error: 'Gagal menyimpan entri berulang' });
    }
    res.json(data[0]);
  } else {
    const db = await readDB();
    db.recurring.unshift(recurring);
    await writeDB(db);
    res.json(recurring);
  }
});

app.put('/api/recurring/:id', async (req, res) => {
  const id = req.params.id;
  if (useSupabase) {
    const { data, error } = await supabase.from('recurring').update(req.body).eq('id', id).select();
    if (error) {
      console.error('Error updating recurring:', error);
      return res.status(500).json({ error: 'Gagal update entri berulang' });
    }
    if (data.length === 0) return res.status(404).json({ error: 'Entri berulang tidak ditemukan' });
    res.json(data[0]);
  } else {
    const db = await readDB();
    const idx = db.recurring.findIndex(r => r.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Entri berulang tidak ditemukan' });
    const updated = { ...db.recurring[idx], ...req.body };
    db.recurring[idx] = updated;
    await writeDB(db);
    res.json(updated);
  }
});

app.delete('/api/recurring/:id', async (req, res) => {
  const id = req.params.id;
  if (useSupabase) {
    const { error } = await supabase.from('recurring').delete().eq('id', id);
    if (error) {
      console.error('Error deleting recurring:', error);
      return res.status(500).json({ error: 'Gagal hapus entri berulang' });
    }
    res.json({ success: true });
  } else {
    const db = await readDB();
    const before = db.recurring.length;
    db.recurring = db.recurring.filter(r => r.id !== id);
    if (db.recurring.length === before) return res.status(404).json({ error: 'Entri berulang tidak ditemukan' });
    await writeDB(db);
    res.json({ success: true });
  }
});

// Tujuan Tabungan
app.get('/api/goals', async (req, res) => {
  const db = await readDB();
  res.json(db.goals);
});

app.post('/api/goals', async (req, res) => {
  const { name, targetAmount, currentAmount, targetDate } = req.body;
  if (typeof targetAmount !== 'number' || targetAmount <= 0) {
    return res.status(400).json({ error: 'Jumlah target tidak valid' });
  }
  const goal = {
    name,
    targetAmount,
    currentAmount: currentAmount || 0,
    targetDate: targetDate || null,
    no: 1,
    createdAt: new Date().toISOString()
  };
  if (!useSupabase) {
    goal.id = uuidv4();
  }
  if (useSupabase) {
    const { data, error } = await supabase.from('goals').insert([goal]).select();
    if (error) {
      console.error('Error inserting goal:', error);
      return res.status(500).json({ error: 'Gagal menyimpan goal' });
    }
    res.json(data[0]);
  } else {
    const db = await readDB();
    db.goals.unshift(goal);
    await writeDB(db);
    res.json(goal);
  }
});

app.put('/api/goals/:id', async (req, res) => {
  const id = req.params.id;
  if (useSupabase) {
    const { data, error } = await supabase.from('goals').update(req.body).eq('id', id).select();
    if (error) {
      console.error('Error updating goal:', error);
      return res.status(500).json({ error: 'Gagal update goal' });
    }
    if (data.length === 0) return res.status(404).json({ error: 'Goal tidak ditemukan' });
    res.json(data[0]);
  } else {
    const db = await readDB();
    const idx = db.goals.findIndex(g => g.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Goal tidak ditemukan' });
    const updated = { ...db.goals[idx], ...req.body };
    db.goals[idx] = updated;
    await writeDB(db);
    res.json(updated);
  }
});

app.delete('/api/goals/:id', async (req, res) => {
  const id = req.params.id;
  if (useSupabase) {
    const { error } = await supabase.from('goals').delete().eq('id', id);
    if (error) {
      console.error('Error deleting goal:', error);
      return res.status(500).json({ error: 'Gagal hapus goal' });
    }
    res.json({ success: true });
  } else {
    const db = await readDB();
    const before = db.goals.length;
    db.goals = db.goals.filter(g => g.id !== id);
    if (db.goals.length === before) return res.status(404).json({ error: 'Goal tidak ditemukan' });
    await writeDB(db);
    res.json({ success: true });
  }
});

// Tags
app.get('/api/tags', async (req, res) => {
  const db = await readDB();
  res.json(db.tags);
});

app.post('/api/tags', async (req, res) => {
  const { name, color } = req.body;
  if (!name) return res.status(400).json({ error: 'Nama tag diperlukan' });
  const tag = {
    name,
    color: color || '#007bff',
    createdAt: new Date().toISOString()
  };
  if (!useSupabase) {
    tag.id = uuidv4();
  }
  if (useSupabase) {
    const { data, error } = await supabase.from('tags').insert([tag]).select();
    if (error) {
      console.error('Error inserting tag:', error);
      return res.status(500).json({ error: 'Gagal menyimpan tag' });
    }
    res.json(data[0]);
  } else {
    const db = await readDB();
    db.tags.unshift(tag);
    await writeDB(db);
    res.json(tag);
  }
});

app.put('/api/tags/:id', async (req, res) => {
  const id = req.params.id;
  if (useSupabase) {
    const { data, error } = await supabase.from('tags').update(req.body).eq('id', id).select();
    if (error) {
      console.error('Error updating tag:', error);
      return res.status(500).json({ error: 'Gagal update tag' });
    }
    if (data.length === 0) return res.status(404).json({ error: 'Tag tidak ditemukan' });
    res.json(data[0]);
  } else {
    const db = await readDB();
    const idx = db.tags.findIndex(t => t.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Tag tidak ditemukan' });
    const updated = { ...db.tags[idx], ...req.body };
    db.tags[idx] = updated;
    await writeDB(db);
    res.json(updated);
  }
});

app.delete('/api/tags/:id', async (req, res) => {
  const id = req.params.id;
  if (useSupabase) {
    const { error } = await supabase.from('tags').delete().eq('id', id);
    if (error) {
      console.error('Error deleting tag:', error);
      return res.status(500).json({ error: 'Gagal hapus tag' });
    }
    res.json({ success: true });
  } else {
    const db = await readDB();
    const before = db.tags.length;
    db.tags = db.tags.filter(t => t.id !== id);
    if (db.tags.length === before) return res.status(404).json({ error: 'Tag tidak ditemukan' });
    await writeDB(db);
    res.json({ success: true });
  }
});

// Laporan
app.get('/api/reports/categories', async (req, res) => {
  const { month } = req.query;
  const db = await readDB();
  let entries = db.entries;
  if (month) {
    entries = entries.filter(e => e.date && e.date.slice(0,7) === month);
  }
  const categories = {};
  entries.forEach(e => {
    const cat = e.category || 'Umum';
    if (!categories[cat]) categories[cat] = { income: 0, expense: 0, count: 0 };
    categories[cat][e.type] += e.amount;
    categories[cat].count++;
  });
  res.json(categories);
});

app.listen(PORT, HOST, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
  console.log(`Akses dari perangkat lain: http://[IP-komputer-ini]:${PORT}`);
  // tampilkan IP lokal untuk memudahkan akses
  const { networkInterfaces } = require('os');
  const nets = networkInterfaces();
  console.log('\nIP address untuk akses lokal:');
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      // lewati internal & non-IPv4
      if (net.family === 'IPv4' && !net.internal) {
        console.log(`- http://${net.address}:${PORT}`);
      }
    }
  }
});
