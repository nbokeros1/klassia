// SPIE-02 — Curriculum Cache Service
// In-memory LRU cache for parsed documents and graphs.
// Prevents re-parsing and re-extracting the same curriculum document repeatedly.

import type { ParsedCurriculumDocument } from '../parsers/types'
import type { CurriculumGraph } from '../graph/types'

interface CacheEntry<T> {
  value: T
  createdAt: number
  ttlMs: number
}

class LRUCache<K, V> {
  private cache: Map<K, CacheEntry<V>> = new Map()
  private readonly maxSize: number
  private readonly defaultTtlMs: number

  constructor(maxSize = 100, defaultTtlMs = 30 * 60 * 1000) {
    this.maxSize = maxSize
    this.defaultTtlMs = defaultTtlMs
  }

  get(key: K): V | undefined {
    const entry = this.cache.get(key)
    if (!entry) return undefined
    if (Date.now() - entry.createdAt > entry.ttlMs) {
      this.cache.delete(key)
      return undefined
    }
    // Move to end (most recently used)
    this.cache.delete(key)
    this.cache.set(key, entry)
    return entry.value
  }

  set(key: K, value: V, ttlMs?: number): void {
    if (this.cache.size >= this.maxSize) {
      // Evict oldest
      const oldest = this.cache.keys().next().value
      if (oldest !== undefined) this.cache.delete(oldest)
    }
    this.cache.set(key, { value, createdAt: Date.now(), ttlMs: ttlMs ?? this.defaultTtlMs })
  }

  has(key: K): boolean {
    return this.get(key) !== undefined
  }

  delete(key: K): void {
    this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  size(): number {
    return this.cache.size
  }
}

export class CurriculumCacheService {
  // Cache for parsed documents (keyed by document ID or hash)
  private parsedDocumentCache = new LRUCache<string, ParsedCurriculumDocument>(50)
  // Cache for curriculum graphs (keyed by curriculum ID)
  private graphCache = new LRUCache<string, CurriculumGraph>(20)

  // ─── Parsed document cache ────────────────────────────────────────────────

  getCachedDocument(key: string): ParsedCurriculumDocument | undefined {
    return this.parsedDocumentCache.get(key)
  }

  cacheDocument(key: string, document: ParsedCurriculumDocument, ttlMs?: number): void {
    this.parsedDocumentCache.set(key, document, ttlMs)
  }

  invalidateDocument(key: string): void {
    this.parsedDocumentCache.delete(key)
  }

  // ─── Graph cache ──────────────────────────────────────────────────────────

  getCachedGraph(curriculumId: string): CurriculumGraph | undefined {
    return this.graphCache.get(curriculumId)
  }

  cacheGraph(curriculumId: string, graph: CurriculumGraph, ttlMs?: number): void {
    this.graphCache.set(curriculumId, graph, ttlMs)
  }

  invalidateGraph(curriculumId: string): void {
    this.graphCache.delete(curriculumId)
  }

  // ─── Utilities ────────────────────────────────────────────────────────────

  clearAll(): void {
    this.parsedDocumentCache.clear()
    this.graphCache.clear()
  }

  stats(): { documents: number; graphs: number } {
    return {
      documents: this.parsedDocumentCache.size(),
      graphs: this.graphCache.size(),
    }
  }
}

// Singleton shared across the app
export const curriculumCacheService = new CurriculumCacheService()
