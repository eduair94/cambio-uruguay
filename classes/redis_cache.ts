import dotenv from "dotenv";
import Redis from "ioredis";

dotenv.config();

const DEFAULT_TTL = 300; // 5 minutes default
const KEY_PREFIX = "cambio:";

interface CacheOptions {
  ttl?: number; // TTL in seconds
  prefix?: string;
}

class RedisCacheService {
  private client: Redis | null = null;
  private connected = false;
  private enabled = false;

  constructor() {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      console.warn("⚠️ Redis not configured. Set REDIS_URL in .env to enable caching.");
      return;
    }

    try {
      this.client = new Redis(redisUrl, {
        keyPrefix: KEY_PREFIX,
        maxRetriesPerRequest: 3,
        retryStrategy(times: number) {
          if (times > 10) {
            console.error("❌ Redis: max retries reached, stopping reconnection.");
            return null; // stop retrying
          }
          const delay = Math.min(times * 200, 5000);
          return delay;
        },
        lazyConnect: true,
      });

      this.client.on("connect", () => {
        this.connected = true;
        console.log("✅ Redis cache connected");
      });

      this.client.on("ready", () => {
        this.connected = true;
      });

      this.client.on("error", (err: Error) => {
        console.error("❌ Redis cache error:", err.message);
        this.connected = false;
      });

      this.client.on("close", () => {
        this.connected = false;
      });

      this.client.on("end", () => {
        this.connected = false;
      });

      this.enabled = true;
    } catch (err: any) {
      console.error("❌ Redis initialization failed:", err.message);
    }
  }

  /**
   * Connect to Redis. Call this during app startup.
   */
  async connect(): Promise<boolean> {
    if (!this.client || !this.enabled) return false;
    try {
      await this.client.connect();
      this.connected = true;
      return true;
    } catch (err: any) {
      console.error("❌ Redis connection failed:", err.message);
      this.connected = false;
      return false;
    }
  }

  /**
   * Check if Redis is connected and operational.
   */
  isConnected(): boolean {
    return this.connected && this.client !== null;
  }

  /**
   * Check if caching is enabled (REDIS_URL was provided).
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Get a cached value by key.
   * Returns null if not found or Redis is unavailable.
   */
  async get<T = any>(key: string): Promise<T | null> {
    if (!this.isConnected() || !this.client) return null;
    try {
      const data = await this.client.get(key);
      if (!data) return null;
      return JSON.parse(data) as T;
    } catch (err: any) {
      console.error(`Redis GET error [${key}]:`, err.message);
      return null;
    }
  }

  /**
   * Set a value in cache with optional TTL (in seconds).
   */
  async set(key: string, value: any, ttl: number = DEFAULT_TTL): Promise<boolean> {
    if (!this.isConnected() || !this.client) return false;
    try {
      const serialized = JSON.stringify(value);
      if (ttl > 0) {
        await this.client.setex(key, ttl, serialized);
      } else {
        await this.client.set(key, serialized);
      }
      return true;
    } catch (err: any) {
      console.error(`Redis SET error [${key}]:`, err.message);
      return false;
    }
  }

  /**
   * Delete a cached key.
   */
  async del(key: string): Promise<boolean> {
    if (!this.isConnected() || !this.client) return false;
    try {
      await this.client.del(key);
      return true;
    } catch (err: any) {
      console.error(`Redis DEL error [${key}]:`, err.message);
      return false;
    }
  }

  /**
   * Delete all keys matching a pattern.
   * Uses SCAN to avoid blocking Redis.
   */
  async delPattern(pattern: string): Promise<number> {
    if (!this.isConnected() || !this.client) return 0;
    try {
      let deleted = 0;
      const stream = this.client.scanStream({ match: pattern, count: 100 });
      return new Promise((resolve, reject) => {
        stream.on("data", async (keys: string[]) => {
          if (keys.length > 0) {
            // Strip the prefix since ioredis adds it automatically on del
            const cleanKeys = keys.map((k) => k.replace(KEY_PREFIX, ""));
            const pipeline = this.client!.pipeline();
            cleanKeys.forEach((k) => pipeline.del(k));
            await pipeline.exec();
            deleted += keys.length;
          }
        });
        stream.on("end", () => resolve(deleted));
        stream.on("error", (err: Error) => {
          console.error("Redis SCAN error:", err.message);
          reject(err);
        });
      });
    } catch (err: any) {
      console.error("Redis delPattern error:", err.message);
      return 0;
    }
  }

  /**
   * Cache-aside pattern: get from cache, or compute and store.
   */
  async getOrSet<T = any>(key: string, fetcher: () => Promise<T>, ttl: number = DEFAULT_TTL): Promise<T> {
    // Try cache first
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Compute fresh value
    const value = await fetcher();

    // Store in cache (non-blocking, don't await)
    this.set(key, value, ttl).catch(() => {});

    return value;
  }

  /**
   * Get Redis health status for the /health endpoint.
   */
  async getHealthStatus(): Promise<{
    enabled: boolean;
    connected: boolean;
    latencyMs?: number;
    info?: { usedMemory: string; connectedClients: string; uptimeSeconds: string };
    error?: string;
  }> {
    if (!this.enabled) {
      return { enabled: false, connected: false };
    }
    if (!this.isConnected() || !this.client) {
      return { enabled: true, connected: false, error: "Not connected" };
    }
    try {
      const start = Date.now();
      await this.client.ping();
      const latencyMs = Date.now() - start;

      // Get basic Redis info
      const infoStr = await this.client.info("server");
      const memoryStr = await this.client.info("memory");
      const clientsStr = await this.client.info("clients");

      const parseInfoField = (info: string, field: string): string => {
        const match = info.match(new RegExp(`${field}:(.+?)\\r?\\n`));
        return match ? match[1].trim() : "unknown";
      };

      return {
        enabled: true,
        connected: true,
        latencyMs,
        info: {
          usedMemory: parseInfoField(memoryStr, "used_memory_human"),
          connectedClients: parseInfoField(clientsStr, "connected_clients"),
          uptimeSeconds: parseInfoField(infoStr, "uptime_in_seconds"),
        },
      };
    } catch (err: any) {
      return { enabled: true, connected: false, error: err.message };
    }
  }

  /**
   * Flush all keys with our prefix.
   */
  async flushAll(): Promise<number> {
    return this.delPattern("*");
  }

  /**
   * Gracefully close the Redis connection.
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      try {
        await this.client.quit();
      } catch {
        // ignore
      }
      this.connected = false;
    }
  }
}

// Singleton instance
const redisCache = new RedisCacheService();

export { redisCache, RedisCacheService, CacheOptions };
