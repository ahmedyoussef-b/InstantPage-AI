// src/ai/cache/cache-manager.ts
'use server';

import { logger } from '@/lib/logger';
import crypto from 'crypto';

/**
 * Configuration du cache
 */
interface CacheConfig {
  memoryTTL: number;      // TTL en secondes pour le cache mémoire
  maxMemoryItems: number; // Nombre maximum d'items en mémoire
}

/**
 * Niveaux de cache
 */
enum CacheLevel {
  MEMORY = 'memory',
  NONE = 'none'
}

/**
 * Résultat de cache
 */
interface CacheResult<T> {
  data: T | null;
  level: CacheLevel;
  hit: boolean;
  latency: number;
}

/**
 * Système de cache multi-niveaux (version mémoire uniquement)
 * L1: Mémoire (rapide, volatile)
 */
export class MultiLevelCache {
  private memoryCache: Map<string, { data: any; expiresAt: number }>;
  private config: CacheConfig;
  private stats: {
    hits: { memory: number; total: number };
    misses: number;
    writes: number;
    evictions: number;
  };

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      memoryTTL: config.memoryTTL || 300, // 5 minutes par défaut
      maxMemoryItems: config.maxMemoryItems || 1000
    };

    this.memoryCache = new Map();
    this.stats = {
      hits: { memory: 0, total: 0 },
      misses: 0,
      writes: 0,
      evictions: 0
    };

    // Nettoyage périodique du cache mémoire
    setInterval(() => this.cleanupMemoryCache(), 60000); // Toutes les minutes

    logger.info('[CACHE] MultiLevelCache initialized (memory only)');
  }

  /**
   * Génère une clé de cache unique
   */
  private generateKey(prefix: string, data: any): string {
    const hash = crypto
      .createHash('md5')
      .update(JSON.stringify(data))
      .digest('hex');
    return `${prefix}:${hash}`;
  }

  /**
   * Nettoie le cache mémoire (supprime les entrées expirées)
   */
  private cleanupMemoryCache(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, value] of this.memoryCache.entries()) {
      if (value.expiresAt <= now) {
        this.memoryCache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.debug(`[CACHE] Cleaned ${cleaned} expired memory entries`);
    }
  }

  /**
   * Éviction LRU si le cache mémoire dépasse la taille maximale
   */
  private evictIfNeeded(): void {
    if (this.memoryCache.size <= this.config.maxMemoryItems) return;

    // Trier par date d'expiration (les plus proches d'expirer d'abord)
    const sorted = Array.from(this.memoryCache.entries())
      .sort((a, b) => a[1].expiresAt - b[1].expiresAt);

    const toRemove = this.memoryCache.size - this.config.maxMemoryItems;
    for (let i = 0; i < toRemove; i++) {
      this.memoryCache.delete(sorted[i][0]);
      this.stats.evictions++;
    }

    logger.debug(`[CACHE] Evicted ${toRemove} items from memory`);
  }

  /**
   * Récupère une valeur du cache
   */
  async get<T>(
    prefix: string,
    key: string | any
  ): Promise<CacheResult<T>> {
    const startTime = Date.now();
    const cacheKey = typeof key === 'string' ? key : this.generateKey(prefix, key);

    // Vérifier le cache mémoire
    const memoryEntry = this.memoryCache.get(cacheKey);
    if (memoryEntry && memoryEntry.expiresAt > Date.now()) {
      this.stats.hits.memory++;
      this.stats.hits.total++;
      return {
        data: memoryEntry.data as T,
        level: CacheLevel.MEMORY,
        hit: true,
        latency: Date.now() - startTime
      };
    }

    // Cache miss
    this.stats.misses++;
    return {
      data: null,
      level: CacheLevel.NONE,
      hit: false,
      latency: Date.now() - startTime
    };
  }

  /**
   * Stocke une valeur dans le cache mémoire
   */
  async setMemory(key: string, data: any, ttl?: number): Promise<void> {
    const expiresAt = Date.now() + (ttl || this.config.memoryTTL) * 1000;
    this.memoryCache.set(key, { data, expiresAt });
    this.evictIfNeeded();
    this.stats.writes++;
  }

  /**
   * Stocke une valeur dans le cache
   */
  async set(
    prefix: string,
    key: string | any,
    data: any,
    options?: { memoryTTL?: number }
  ): Promise<void> {
    const cacheKey = typeof key === 'string' ? key : this.generateKey(prefix, key);
    
    // Stocker en mémoire
    await this.setMemory(cacheKey, data, options?.memoryTTL);
  }

  /**
   * Invalide une entrée spécifique
   */
  async invalidate(prefix: string, key: string | any): Promise<void> {
    const cacheKey = typeof key === 'string' ? key : this.generateKey(prefix, key);
    
    // Supprimer de la mémoire
    this.memoryCache.delete(cacheKey);
    
    logger.debug(`[CACHE] Invalidated: ${cacheKey}`);
  }

  /**
   * Invalide toutes les entrées avec un préfixe
   */
  async invalidatePrefix(prefix: string): Promise<void> {
    // Supprimer de la mémoire
    const pattern = new RegExp(`^${prefix}:`);
    let deleted = 0;
    
    for (const key of this.memoryCache.keys()) {
      if (pattern.test(key)) {
        this.memoryCache.delete(key);
        deleted++;
      }
    }
    
    logger.debug(`[CACHE] Invalidated prefix ${prefix}: ${deleted} items`);
  }

  /**
   * Vide complètement le cache
   */
  async clear(): Promise<void> {
    this.memoryCache.clear();
    logger.info('[CACHE] Cache cleared');
  }

  /**
   * Récupère les statistiques du cache
   */
  getStats(): {
    hits: { memory: number; total: number };
    misses: number;
    writes: number;
    evictions: number;
    hitRate: number;
    memorySize: number;
  } {
    const total = this.stats.hits.total + this.stats.misses;
    return {
      ...this.stats,
      hitRate: total > 0 ? this.stats.hits.total / total : 0,
      memorySize: this.memoryCache.size
    };
  }

  /**
   * Affiche les statistiques
   */
  logStats(): void {
    const stats = this.getStats();
    console.log('\n📊 CACHE STATISTICS');
    console.log('='.repeat(50));
    console.log(`  Hits (Memory): ${stats.hits.memory}`);
    console.log(`  Misses:        ${stats.misses}`);
    console.log(`  Hit Rate:      ${(stats.hitRate * 100).toFixed(1)}%`);
    console.log(`  Writes:        ${stats.writes}`);
    console.log(`  Evictions:     ${stats.evictions}`);
    console.log(`  Memory Size:   ${stats.memorySize} items`);
    console.log('='.repeat(50));
  }
}

// Export singleton
let cacheInstance: MultiLevelCache | null = null;

export function getCache(): MultiLevelCache {
  if (!cacheInstance) {
    cacheInstance = new MultiLevelCache({
      memoryTTL: parseInt(process.env.CACHE_MEMORY_TTL || '300'),
      maxMemoryItems: parseInt(process.env.CACHE_MAX_MEMORY_ITEMS || '1000')
    });
  }
  return cacheInstance;
}