// backend/server.js - local dev server to mirror api/handlers (fixed for lowdb v6)
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import { nanoid } from 'nanoid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbFile = path.join(__dirname, '..', 'data', 'db.json');

// Pass default data as second argument to Low to avoid "missing default data" error
const adapter = new JSONFile(dbFile);
const db = new Low(adapter, { participants: [], contacts: [] });

await db.read();
// Ensure data structure exists (safe for existing DB too)
db.data = db.data || { participants: [], contacts: [] };

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/participants', async (req, res) => {
  await db.read();
  res.json(db.data.participants);
});

app.post('/api/participants', async (req, res) => {
  const { name, email, role } = req.body || {};
  if (!name) return res.status(400).json({ message: 'name required' });

  const newItem = {
    id: nanoid(),
    name,
    email: email || '',
    role: role || '',
    createdAt: new Date().toISOString()
  };

  db.data.participants.unshift(newItem);
  await db.write();
  res.status(201).json(newItem);
});

app.get('/api/contacts', async (req, res) => {
  await db.read();
  res.json(db.data.contacts);
});

// app.post('/api/contacts', async (req, res) => {
//   const { name, phone, company } = req.body || {};
//   if (!name) return res.status(400).json({ message: 'name required' });

//   const newItem = {
//     id: nanoid(),
//     name,
//     phone: phone || '',
//     company: company || '',
//     createdAt: new Date().toISOString()
//   };

//   db.data.contacts.unshift(newItem);
//   await db.write();
//   res.status(201).json(newItem);
// });

app.post('/api/contacts', async (req, res) => {
  const { name, phone, company, type = 'Customer', status = 'Active' } = req.body || {};
  if (!name) return res.status(400).json({ message: 'name required' });
  const newItem = { id: nanoid(), name, phone: phone || '', company: company || '', type, status, createdAt: new Date().toISOString() };
  db.data.contacts.unshift(newItem);
  await db.write();
  res.status(201).json(newItem);
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log('Dev API listening on', PORT));
