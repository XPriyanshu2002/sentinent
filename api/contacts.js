// api/contacts.js
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import path from 'path';
import { fileURLToPath } from 'url';
import { nanoid } from 'nanoid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbFile = path.join(__dirname, '..', 'data', 'db.json');
const adapter = new JSONFile(dbFile);
const db = new Low(adapter);

export default async function handler(req, res) {
  await db.read();
  db.data ||= { participants: [], contacts: [] };

  if (req.method === 'GET') {
    // return contacts (no change)
    return res.status(200).json(db.data.contacts);
  }

  if (req.method === 'POST') {
    const { name, phone, company, type = 'Customer', status = 'Active' } = req.body || {};
    if (!name) return res.status(400).json({ message: 'name required' });

    const newItem = {
      id: nanoid(),
      name,
      phone: phone || '',
      company: company || '',
      type,
      status,
      createdAt: new Date().toISOString()
    };

    db.data.contacts.unshift(newItem);
    await db.write();

    return res.status(201).json(newItem);
  }

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
