import fs from "fs"
import path from "path"
import { getDb, isMongoConfigured } from "@/lib/mongodb"

const SUBSCRIPTIONS_FILE = path.join(process.cwd(), "src/data/push_subscriptions.json")

export interface StoredPushSubscription {
  endpoint: string
  expirationTime?: number | null
  keys: {
    p256dh: string
    auth: string
  }
  userAgent?: string
  createdAt: string
  updatedAt: string
}

function readDiskSubscriptions(): StoredPushSubscription[] {
  try {
    if (fs.existsSync(SUBSCRIPTIONS_FILE)) {
      const content = fs.readFileSync(SUBSCRIPTIONS_FILE, "utf-8")
      const parsed = JSON.parse(content || "[]")
      return Array.isArray(parsed) ? parsed : []
    }
  } catch (err) {
    console.warn("[PushSubscriptionStore] Failed to read disk subscriptions:", err)
  }
  return []
}

function writeDiskSubscriptions(list: StoredPushSubscription[]): void {
  try {
    const dir = path.dirname(SUBSCRIPTIONS_FILE)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(SUBSCRIPTIONS_FILE, JSON.stringify(list, null, 2), "utf-8")
  } catch (err) {
    console.warn("[PushSubscriptionStore] Failed to write disk subscriptions:", err)
  }
}

/**
 * Retrieve all active Web Push subscriptions from MongoDB and local disk store
 */
export async function getPushSubscriptions(): Promise<StoredPushSubscription[]> {
  const diskList = readDiskSubscriptions()
  const subMap = new Map<string, StoredPushSubscription>()

  for (const sub of diskList) {
    if (sub && sub.endpoint && sub.keys?.p256dh && sub.keys?.auth) {
      subMap.set(sub.endpoint, sub)
    }
  }

  if (isMongoConfigured()) {
    try {
      const db = await getDb()
      if (db) {
        const mongoList = await db
          .collection<StoredPushSubscription>("push_subscriptions")
          .find({})
          .toArray()
        for (const sub of mongoList) {
          if (sub && sub.endpoint && sub.keys?.p256dh && sub.keys?.auth) {
            const copy = { ...(sub as StoredPushSubscription & { _id?: unknown }) }
            delete copy._id
            subMap.set(sub.endpoint, copy)
          }
        }
      }
    } catch (err) {
      console.warn("[PushSubscriptionStore] MongoDB query fallback to disk:", err)
    }
  }

  return Array.from(subMap.values())
}

/**
 * Save or update an active Web Push subscription
 */
export async function savePushSubscription(input: {
  endpoint: string
  expirationTime?: number | null
  keys: {
    p256dh: string
    auth: string
  }
  userAgent?: string
}): Promise<StoredPushSubscription> {
  const nowIso = new Date().toISOString()
  const diskList = readDiskSubscriptions()
  const existing = diskList.find((s) => s.endpoint === input.endpoint)

  const record: StoredPushSubscription = {
    endpoint: input.endpoint,
    expirationTime: input.expirationTime ?? null,
    keys: {
      p256dh: input.keys.p256dh,
      auth: input.keys.auth,
    },
    userAgent: input.userAgent,
    createdAt: existing?.createdAt || nowIso,
    updatedAt: nowIso,
  }

  const filtered = diskList.filter((s) => s.endpoint !== input.endpoint)
  writeDiskSubscriptions([record, ...filtered])

  if (isMongoConfigured()) {
    try {
      const db = await getDb()
      if (db) {
        await db.collection<StoredPushSubscription>("push_subscriptions").updateOne(
          { endpoint: record.endpoint },
          { $set: record },
          { upsert: true }
        )
      }
    } catch (err) {
      console.warn("[PushSubscriptionStore] MongoDB upsert notice:", err)
    }
  }

  return record
}

/**
 * Remove an expired, revoked (410 Gone / 404), or unsubscribed push endpoint
 */
export async function removePushSubscription(endpoint: string): Promise<boolean> {
  if (!endpoint) return false

  const diskList = readDiskSubscriptions()
  const remaining = diskList.filter((s) => s.endpoint !== endpoint)
  if (remaining.length !== diskList.length) {
    writeDiskSubscriptions(remaining)
  }

  if (isMongoConfigured()) {
    try {
      const db = await getDb()
      if (db) {
        await db.collection("push_subscriptions").deleteOne({ endpoint })
      }
    } catch (err) {
      console.warn("[PushSubscriptionStore] MongoDB delete notice:", err)
    }
  }

  return true
}
