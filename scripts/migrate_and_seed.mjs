import fs from "fs";
import path from "path";
import { MongoClient } from "mongodb";

let uri = process.env.MONGODB_URI;
if (!uri && fs.existsSync(".env.local")) {
  const envContent = fs.readFileSync(".env.local", "utf-8");
  const match = envContent.match(/MONGODB_URI=(.*)/);
  if (match) uri = match[1].trim();
}

if (!uri) {
  console.error("ERROR: MONGODB_URI not found in environment or .env.local");
  process.exit(1);
}

async function runMigrationAndSeed() {
  console.log("==========================================================");
  console.log("Centralized Database Migration & Seeding for CAIM System");
  console.log("==========================================================");

  const client = new MongoClient(uri, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
  });

  try {
    await client.connect();
    console.log(" Connected successfully to MongoDB Atlas database!");

    const db = client.db("caim");

    const stationsCol = db.collection("stations");
    const equipmentsCol = db.collection("equipments");
    const assetsCol = db.collection("assets");
    const ticketsCol = db.collection("tickets");
    const rmaCol = db.collection("rma");
    const logsCol = db.collection("transaction_logs");

    // 1. Setup Indexes
    console.log("\n[1/5] Setting up database indexes and constraints...");
    await Promise.all([
      stationsCol.createIndex({ id: 1 }, { unique: true }),
      stationsCol.createIndex({ code: 1 }),
      stationsCol.createIndex({ province: 1, district: 1 }),
      stationsCol.createIndex({ height: 1 }),

      equipmentsCol.createIndex({ serial: 1 }, { unique: true }),
      equipmentsCol.createIndex({ vendor: 1 }),
      equipmentsCol.createIndex({ category: 1 }),
      equipmentsCol.createIndex({ stationId: 1 }),
      equipmentsCol.createIndex({ status: 1 }),

      assetsCol.createIndex({ serial: 1 }, { unique: true }),

      ticketsCol.createIndex({ id: 1 }, { unique: true }),
      ticketsCol.createIndex({ serialNo: 1 }),
      ticketsCol.createIndex({ stationId: 1 }),
      ticketsCol.createIndex({ status: 1 }),

      rmaCol.createIndex({ id: 1 }, { unique: true }),
      rmaCol.createIndex({ rmaNo: 1 }),
      rmaCol.createIndex({ ticketId: 1 }),
      rmaCol.createIndex({ serialNo: 1 }),

      logsCol.createIndex({ timestamp: -1 }),
      logsCol.createIndex({ targetType: 1, targetId: 1 }),
    ]);
    console.log(" Indexes verified successfully.");

    // 2. Migrate and Seed Stations
    console.log("\n[2/5] Migrating Station records with bulkWrite...");
    let stationsData = [];
    const stationsJsonPath = path.join(process.cwd(), "src/data/stations.json");
    if (fs.existsSync(stationsJsonPath)) {
      stationsData = JSON.parse(fs.readFileSync(stationsJsonPath, "utf-8"));
    } else {
      const content = fs.readFileSync(
        path.join(process.cwd(), "src/components/sites/equipment-claims-3ec6aa15/root-8a5edab2/stationsData.ts"),
        "utf-8"
      );
      const start = content.indexOf("= [") + 2;
      const end = content.lastIndexOf("]");
      stationsData = JSON.parse(content.slice(start, end + 1));
    }

    const stationMapByName = new Map();
    const nowIso = new Date().toISOString();

    const stationOps = stationsData.map((st) => {
      stationMapByName.set(st.name.trim(), st.id);
      return {
        updateOne: {
          filter: { id: st.id },
          update: {
            $set: { ...st, updatedAt: nowIso },
            $setOnInsert: { createdAt: st.createdAt || nowIso },
          },
          upsert: true,
        },
      };
    });

    if (stationOps.length > 0) {
      await stationsCol.bulkWrite(stationOps, { ordered: false });
    }
    const totalStations = await stationsCol.countDocuments();
    console.log(` Stations migration complete. Total: ${totalStations}`);

    // 3. Migrate and Seed Equipments using bulkWrite
    console.log("\n[3/5] Migrating Equipment records with bulkWrite...");
    const assetsDataPath = path.join(
      process.cwd(),
      "src/components/sites/equipment-claims-3ec6aa15/root-8a5edab2/assetsData.ts"
    );
    const assetContent = fs.readFileSync(assetsDataPath, "utf-8");
    const assetStart = assetContent.indexOf("= [") + 2;
    const assetEnd = assetContent.lastIndexOf("]");
    const rawAssets = JSON.parse(assetContent.slice(assetStart, assetEnd + 1));

    const equipmentOps = [];
    const assetSyncOps = [];

    for (const a of rawAssets) {
      const serialTrimmed = a.serial.trim();
      const doc = {
        serial: serialTrimmed,
        vendor: a.vendor || "N/A",
        model: a.model || "-",
        category: a.category || "อื่นๆ",
        name: a.name || undefined,
        description: a.description || undefined,
      };

      equipmentOps.push({
        updateOne: {
          filter: { serial: serialTrimmed },
          update: {
            $set: {
              vendor: doc.vendor,
              model: doc.model,
              category: doc.category,
              name: doc.name,
              description: doc.description,
              updatedAt: nowIso,
            },
            $setOnInsert: {
              serial: serialTrimmed,
              status: "active",
              createdAt: nowIso,
            },
          },
          upsert: true,
        },
      });

      assetSyncOps.push({
        updateOne: {
          filter: { serial: serialTrimmed },
          update: {
            $set: { ...doc, updatedAt: nowIso },
            $setOnInsert: { createdAt: nowIso },
          },
          upsert: true,
        },
      });
    }

    if (equipmentOps.length > 0) {
      await equipmentsCol.bulkWrite(equipmentOps, { ordered: false });
      await assetsCol.bulkWrite(assetSyncOps, { ordered: false });
    }
    const totalEquipments = await equipmentsCol.countDocuments();
    console.log(` Equipments migration complete. Total: ${totalEquipments}`);

    // 4. Update Foreign Key Relationships with Tickets and RMA
    console.log("\n[4/5] Establishing Relational Foreign Keys across Tickets, Equipments & Stations...");
    const existingTickets = await ticketsCol.find({}).toArray();
    const ticketOps = [];
    const equipClaimOps = [];

    for (const ticket of existingTickets) {
      const updates = {};
      if (ticket.station && !ticket.stationId) {
        const foundStationId = stationMapByName.get(ticket.station.trim());
        if (foundStationId) {
          updates.stationId = foundStationId;
        }
      }
      if (Object.keys(updates).length > 0) {
        ticketOps.push({
          updateOne: {
            filter: { id: ticket.id },
            update: { $set: updates },
          },
        });
      }

      if (ticket.serialNo && ticket.status !== "ปิดเคส") {
        equipClaimOps.push({
          updateOne: {
            filter: { serial: ticket.serialNo.trim() },
            update: {
              $set: {
                status: "in_claim",
                currentClaimId: ticket.id,
                stationName: ticket.station || undefined,
                updatedAt: nowIso,
              },
            },
          },
        });
      }
    }

    if (ticketOps.length > 0) await ticketsCol.bulkWrite(ticketOps);
    if (equipClaimOps.length > 0) await equipmentsCol.bulkWrite(equipClaimOps);
    console.log(` Relational FKs linked for ${existingTickets.length} tickets.`);

    // 5. Write Transaction Log for Migration
    console.log("\n[5/5] Recording migration event in Transaction Logs...");
    await logsCol.insertOne({
      id: `TX-MIGRATE-${Date.now()}`,
      action: "EQUIPMENT_CREATED",
      targetType: "equipment",
      targetId: "SYSTEM_MIGRATION",
      details: {
        totalStations,
        totalEquipments,
        totalTickets: existingTickets.length,
        migrationTimestamp: nowIso,
      },
      timestamp: nowIso,
    });
    console.log(" Migration transaction log written successfully.");

    console.log("\n==========================================================");
    console.log(" MIGRATION AND SEEDING COMPLETED SUCCESSFULLY!");
    console.log("==========================================================");
  } catch (err) {
    console.error("Migration error:", err);
    process.exit(1);
  } finally {
    await client.close();
  }
}

runMigrationAndSeed();
