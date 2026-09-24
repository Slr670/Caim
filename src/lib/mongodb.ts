import { MongoClient, Db } from "mongodb"

const uri = process.env.MONGODB_URI || ""
const options = {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
}

let clientPromise: Promise<MongoClient> | null = null

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined
}

/**
 * Check if MONGODB_URI is provided and does not contain unresolved placeholders
 */
export function isMongoConfigured(): boolean {
  return Boolean(
    uri &&
      !uri.includes("<db_username>") &&
      !uri.includes("<USERNAME>") &&
      !uri.includes("<password>")
  )
}

/**
 * Get cached MongoClient instance for connection pooling in Next.js
 */
export async function getMongoClient(): Promise<MongoClient | null> {
  if (!isMongoConfigured()) {
    return null
  }

  try {
    if (process.env.NODE_ENV === "development") {
      if (!global._mongoClientPromise) {
        const client = new MongoClient(uri, options)
        global._mongoClientPromise = client.connect()
      }
      return await global._mongoClientPromise
    } else {
      if (!clientPromise) {
        const client = new MongoClient(uri, options)
        clientPromise = client.connect()
      }
      return await clientPromise
    }
  } catch (error) {
    console.error("Failed to connect to MongoDB Atlas:", error)
    return null
  }
}

/**
 * Get MongoDB Database instance (default: 'caim')
 */
export async function getDb(dbName = "caim"): Promise<Db | null> {
  const client = await getMongoClient()
  if (!client) return null
  return client.db(dbName)
}
