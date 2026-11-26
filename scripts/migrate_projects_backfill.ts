/**
 * Safe idempotent migration & backfill script for Master Projects (`projects`).
 * Seeds `USO-SHF 2 (25310-9999)` (`id: "proj-uso-shf-2"`) and assigns all existing
 * Claims (`tickets`), Overseas RMA (`rma`), Equipment (`equipments` / `assets`),
 * and Stations (`stations`) across both MongoDB Atlas and persistent JSON stores.
 *
 * Run with:
 *   npx tsx --env-file=.env.local scripts/migrate_projects_backfill.ts
 */
import {
  backfillDefaultProjectAcrossAllEntities,
  listMasterProjectsWithUsage,
} from "../src/lib/projects/projectService"
import { getMongoClient, isMongoConfigured } from "../src/lib/mongodb"

async function main() {
  console.log("=== [Migration] Starting Master Projects Seed & Backfill ===")
  const result = await backfillDefaultProjectAcrossAllEntities()
  console.log("Seeded Default Project:", result.seededProject)
  console.log("MongoDB Backfilled Document Counts:", result.mongoModified)
  console.log("Local JSON Backfilled Record Counts:", result.localModified)

  const projectsWithUsage = await listMasterProjectsWithUsage()
  console.log("Projects With Active Reference Counts:", JSON.stringify(projectsWithUsage, null, 2))

  if (isMongoConfigured()) {
    const client = await getMongoClient()
    await client?.close()
  }
  console.log("=== [Migration] Completed Successfully ===")
}

main().catch((err) => {
  console.error("[Migration] Fatal error:", err)
  process.exit(1)
})
