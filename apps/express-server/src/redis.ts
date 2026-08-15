import { createClient, type RedisClientType } from "redis";

export function createRedisClient(): RedisClientType {
  const url = process.env.REDIS_URL;
  return url ? createClient({ url }) : createClient();
}
