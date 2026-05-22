import Redis from 'ioredis';
import { config } from '../config';
import { logger } from './logger';

let redis: Redis | null = null;

export function getRedis(): Redis {
  if (!redis) {
    redis = new Redis(config.redis.url, {
      password: config.redis.password,
      maxRetriesPerRequest: 3,
      enableReadyCheck: false,
    });
    redis.on('error', (err) => logger.error('Redis error:', err));
    redis.on('connect', () => logger.info('Redis connected'));
  }
  return redis;
}

export async function setCacheValue(key: string, value: unknown, ttlSeconds = 300): Promise<void> {
  await getRedis().setex(key, ttlSeconds, JSON.stringify(value));
}

export async function getCacheValue<T>(key: string): Promise<T | null> {
  const val = await getRedis().get(key);
  if (!val) return null;
  return JSON.parse(val) as T;
}

export async function deleteCacheValue(key: string): Promise<void> {
  await getRedis().del(key);
}

export async function setUserState(telegramId: bigint, state: string, data?: unknown): Promise<void> {
  const key = `user:state:${telegramId}`;
  await getRedis().setex(key, 600, JSON.stringify({ state, data }));
}

export async function getUserState(telegramId: bigint): Promise<{ state: string; data?: unknown } | null> {
  const key = `user:state:${telegramId}`;
  const val = await getRedis().get(key);
  if (!val) return null;
  return JSON.parse(val);
}

export async function clearUserState(telegramId: bigint): Promise<void> {
  await getRedis().del(`user:state:${telegramId}`);
}
