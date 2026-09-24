import fs from "fs";
import { MongoClient } from "mongodb";

let uri = process.env.MONGODB_URI;
if (!uri && fs.existsSync(".env.local")) {
  const envContent = fs.readFileSync(".env.local", "utf-8");
  const match = envContent.match(/MONGODB_URI=(.*)/);
  if (match) uri = match[1].trim();
}

if (!uri) {
  console.error("MONGODB_URI not found in process.env or .env.local");
  process.exit(1);
}

const INITIAL_TICKETS = [
  {
    id: "1",
    title: "หัวข้อเลขที่เคลม",
    problemDesc: "หัวข้ออาการเสีย ปัญหาที่พบ",
    vendor: "Huawei",
    model: "OMXD30000",
    serialNo: "1000167600349",
    status: "รับแจ้ง",
    statusCode: 1,
    date: "13 ก.ย. 2569",
    ageDays: "10 วัน",
    isOverdue: false,
    station: "ที่ว่าการอำเภอเลาขวัญ",
    province: "กาญจนบุรี",
    district: "เลาขวัญ",
    subdistrict: "เลาขวัญ",
    createdAt: new Date().toISOString(),
  },
  {
    id: "2",
    title: "ทดสอบระบบ",
    problemDesc: "ทดสอบระบบทดสอบระบบ",
    vendor: "Huawei",
    model: "OMXD30000",
    serialNo: "1000167600349",
    status: "ปิดเคส",
    statusCode: 5,
    date: "10 ก.ย. 2569",
    ageDays: "19 วัน",
    isOverdue: false,
    station: "ที่ว่าการอำเภอคลองลาน",
    province: "กำแพงเพชร",
    district: "คลองลาน",
    subdistrict: "คลองน้ำไหล",
    createdAt: new Date().toISOString(),
  },
  {
    id: "3",
    title: "test2",
    problemDesc: "testtest",
    vendor: "Huawei",
    model: "OMXD30000",
    serialNo: "1000167600349",
    status: "ส่งศูนย์",
    statusCode: 2,
    date: "9 ก.ย. 2569",
    ageDays: "13 วัน",
    isOverdue: false,
    station: "อบต.เขาสวนกวาง",
    province: "ขอนแก่น",
    district: "เขาสวนกวาง",
    subdistrict: "เขาสวนกวาง",
    createdAt: new Date().toISOString(),
  },
  {
    id: "4",
    title: "FORTH-2026-002",
    problemDesc: "บอร์ดเสีย",
    vendor: "Huawei",
    model: "PAC80S12-CN",
    serialNo: "2102131835USR8305867",
    status: "ส่งศูนย์",
    statusCode: 2,
    date: "9 ก.ย. 2569",
    ageDays: "13 วัน",
    isOverdue: true,
    overdueText: "เกินกำหนด 8 วัน",
    station: "อบต.หมูสี",
    province: "นครราชสีมา",
    district: "ปากช่อง",
    subdistrict: "หมูสี",
    createdAt: new Date().toISOString(),
  },
  {
    id: "5",
    title: "test",
    problemDesc: "testtest",
    vendor: "Huawei",
    model: "PAC80S12-CN",
    serialNo: "2102131835USR8305867",
    status: "ปฏิเสธเคลม",
    statusCode: 6,
    date: "8 ก.ย. 2569",
    ageDays: "15 วัน",
    isOverdue: false,
    station: "อบต.ปากช่อง",
    province: "นครราชสีมา",
    district: "ปากช่อง",
    subdistrict: "ปากช่อง",
    createdAt: new Date().toISOString(),
  },
];

async function seed() {
  console.log("Connecting to MongoDB Atlas at slr.b6ih1xk.mongodb.net...");
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log("Connected successfully to MongoDB Atlas!");

    const db = client.db("caim");
    const ticketsCol = db.collection("tickets");

    const existingCount = await ticketsCol.countDocuments();
    console.log(`Current tickets count in 'caim.tickets': ${existingCount}`);

    if (existingCount === 0) {
      console.log("Seeding initial tickets into 'caim.tickets'...");
      const result = await ticketsCol.insertMany(INITIAL_TICKETS);
      console.log(`Inserted ${result.insertedCount} tickets.`);
    } else {
      console.log("Database already contains tickets. Adding only missing ones...");
      for (const t of INITIAL_TICKETS) {
        await ticketsCol.updateOne({ id: t.id }, { $setOnInsert: t }, { upsert: true });
      }
      console.log("Upserted initial tickets.");
    }

    const totalTickets = await ticketsCol.countDocuments();
    console.log(`Total tickets now in 'caim.tickets': ${totalTickets}`);

    // Create indexes for fast lookup and uniqueness
    await ticketsCol.createIndex({ id: 1 }, { unique: true });
    await ticketsCol.createIndex({ serialNo: 1 });
    await ticketsCol.createIndex({ status: 1 });
    await ticketsCol.createIndex({ province: 1 });

    const rmaCol = db.collection("rma");
    await rmaCol.createIndex({ id: 1 }, { unique: true });
    await rmaCol.createIndex({ rmaNo: 1 });
    console.log("Indexes created successfully!");

    // Seed Stations from src/data/stations.json
    const stationsCol = db.collection("stations");
    const existingStations = await stationsCol.countDocuments();
    console.log(`Current stations count in 'caim.stations': ${existingStations}`);

    if (existingStations === 0) {
      console.log("Reading src/data/stations.json...");
      const fs = await import("fs");
      const stations = JSON.parse(fs.readFileSync("d:/Caim/src/data/stations.json", "utf-8"));
      console.log(`Found ${stations.length} stations. Seeding into 'caim.stations'...`);
      await stationsCol.insertMany(stations);
      await stationsCol.createIndex({ id: 1 }, { unique: true });
      await stationsCol.createIndex({ province: 1 });
      await stationsCol.createIndex({ district: 1 });
      await stationsCol.createIndex({ subdistrict: 1 });
      console.log(`Successfully seeded ${stations.length} stations into MongoDB Atlas!`);
    }

    console.log("\nALL SEEDING COMPLETED SUCCESSFULLY!");
  } catch (err) {
    console.error("MongoDB Atlas Seeding Error:", err);
    process.exit(1);
  } finally {
    await client.close();
  }
}

seed();
