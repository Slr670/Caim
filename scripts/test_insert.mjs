import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const client = new MongoClient(process.env.MONGODB_URI);
await client.connect();
const db = client.db('caim');
const col = db.collection('equipments');

const serial = 'TEST-REGEX-001';
const equipmentDoc = {
  serial,
  vendor: 'TestVendor',
  model: 'TestModel',
  category: 'อื่นๆ',
  status: 'active',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

try {
  const result = await col.updateOne(
    { serial: { $regex: new RegExp('^' + serial + '$', 'i') } },
    { $set: equipmentDoc },
    { upsert: true }
  );
  console.log('Result:', result);
  const found = await col.findOne({ serial });
  console.log('Found:', found);
  await col.deleteOne({ serial });
  console.log('Cleaned up');
} catch (err) {
  console.error('ERROR during upsert with regex:', err);
}

await client.close();
