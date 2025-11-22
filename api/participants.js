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
    return res.status(200).json(db.data.participants);
  }

  if (req.method === 'POST') {
    const {
      name,
      email = '',
      role = 'Participant',
      ndis = '',
      status = 'Active'
    } = req.body || {};

    if (!name) return res.status(400).json({ message: 'name required' });

    const newItem = {
      id: nanoid(),
      name,
      email,
      role,
      ndis,
      status,
      createdAt: new Date().toISOString()
    };

    db.data.participants.unshift(newItem);
    await db.write();

    return res.status(201).json(newItem);
  }

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
