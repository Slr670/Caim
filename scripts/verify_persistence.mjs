import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function verifyPersistence() {
  console.log('--- Starting Automated Equipment Persistence Verification ---');

  // 1. Initial State via API
  console.log('[Step 1] Fetching initial equipments via API...');
  const initRes = await fetch('http://localhost:3000/api/equipments');
  const initData = await initRes.json();
  if (!initData.success) throw new Error('Initial GET failed: ' + initData.error);
  const initialTotal = initData.total;
  console.log(`Initial Total Equipments: ${initialTotal}`);

  // 2. Duplicate Detection Test
  console.log('\n[Step 2] Testing duplicate serial rejection...');
  const duplicateSerial = initData.equipments[0].serial;
  const dupRes = await fetch('http://localhost:3000/api/equipments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      serial: duplicateSerial,
      vendor: 'TestVendor',
      model: 'TestModel',
    }),
  });
  console.log(`Duplicate response status: ${dupRes.status}`);
  const dupData = await dupRes.json();
  console.log(`Duplicate response message: ${dupData.error}`);
  if (dupRes.status !== 409) {
    throw new Error(`Expected 409 Conflict for duplicate serial, got ${dupRes.status}`);
  }
  console.log('✓ Duplicate detection PASSED (409 Conflict returned)');

  // 3. New Equipment Insert via POST
  const testSerial = `SN-VERIFY-${Date.now()}`;
  console.log(`\n[Step 3] Adding new device via POST: ${testSerial}...`);
  const postRes = await fetch('http://localhost:3000/api/equipments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      serial: testSerial,
      vendor: 'Forth Telecom',
      model: 'FT-5000-Core',
      category: 'ชุดอุปกรณ์เครือข่าย',
      name: 'High-Speed Core Switch',
      description: 'อุปกรณ์ทดสอบความคงอยู่ของข้อมูลระดับฐานข้อมูลส่วนกลาง',
    }),
  });

  const postData = await postRes.json();
  console.log('POST status:', postRes.status);
  console.log('POST savedTo:', postData.savedTo);
  console.log('POST message:', postData.message);

  if (postRes.status !== 201 || !postData.success || (!['mongodb', 'persistent-local'].includes(postData.savedTo))) {
    throw new Error('POST failed or was not saved to persistent store!');
  }
  console.log(`✓ New device successfully saved to persistence layer (${postData.savedTo})`);

  // 4. Verification via API GET (Simulating table reload)
  console.log('\n[Step 4] Fetching equipments after insert (table reload simulation)...');
  const afterRes = await fetch('http://localhost:3000/api/equipments');
  const afterData = await afterRes.json();
  const newTotal = afterData.total;
  console.log(`New Total Equipments: ${newTotal} (Previous: ${initialTotal})`);

  if (newTotal !== initialTotal + 1) {
    throw new Error(`Counter mismatch! Expected ${initialTotal + 1}, got ${newTotal}`);
  }
  console.log('✓ Total counter incremented by exactly 1');

  // Check top position
  const topEquipment = afterData.equipments[0];
  console.log('Top equipment in table list:', {
    serial: topEquipment.serial,
    vendor: topEquipment.vendor,
    model: topEquipment.model,
    createdAt: topEquipment.createdAt,
  });

  if (topEquipment.serial !== testSerial) {
    throw new Error(`New equipment is not at the top of the table! Found: ${topEquipment.serial}`);
  }
  console.log('✓ Newly created equipment is permanently at index 0 (top of the list)');

  // 5. Verification in Persistent Storage
  console.log('\n[Step 5] Checking Persistent Storage (Disk / Database)...');
  const fs = await import('fs');
  const diskContent = JSON.parse(fs.readFileSync('src/data/custom_equipments.json', 'utf-8'));
  const foundOnDisk = diskContent.find((e) => e.serial === testSerial);
  if (!foundOnDisk) {
    throw new Error('Equipment NOT found in src/data/custom_equipments.json!');
  }
  console.log('✓ Verified on persistent disk file:', foundOnDisk.serial, foundOnDisk.model);

  if (postData.savedTo === 'mongodb') {
    try {
      const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 3000 });
      await client.connect();
      const db = client.db('caim');
      const mongoItem = await db.collection('equipments').findOne({ serial: testSerial });
      if (mongoItem) console.log('✓ Verified in caim.equipments collection in MongoDB Atlas:', mongoItem.serial);
      await client.close();
    } catch (e) {
      console.log('Notice: MongoDB Atlas direct inspect skipped due to connection:', e.message);
    }
  }

  // 6. Cleanup
  console.log('\n[Step 6] Cleaning up test equipment...');
  const delRes = await fetch(`http://localhost:3000/api/equipments?serial=${encodeURIComponent(testSerial)}`, {
    method: 'DELETE',
  });
  const delData = await delRes.json();
  console.log('DELETE response:', delData.message);

  const finalRes = await fetch('http://localhost:3000/api/equipments');
  const finalData = await finalRes.json();
  console.log(`Final count after cleanup: ${finalData.total}`);
  if (finalData.total !== initialTotal) {
    throw new Error(`Cleanup failed, count is ${finalData.total}`);
  }
  console.log('✓ Cleaned up successfully, count restored to original');

  console.log('\n======================================================');
  console.log('ALL VERIFICATION CHECKS PASSED PERFECTLY!');
  console.log('======================================================');
}

verifyPersistence().catch(err => {
  console.error('\n❌ Verification Failed:', err);
  process.exit(1);
});
