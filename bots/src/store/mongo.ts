// Mongo connection helper. Returns false when no URI is configured so callers
// can run without persistence (channel broadcast still works; DMs/dedup skipped).
import mongoose from "mongoose";

export async function connectMongo(uri?: string): Promise<boolean> {
  if (!uri) return false;
  if (mongoose.connection.readyState === 1) return true;
  await mongoose.connect(uri);
  return true;
}

export async function disconnectMongo(): Promise<void> {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
}

export function isMongoReady(): boolean {
  return mongoose.connection.readyState === 1;
}
