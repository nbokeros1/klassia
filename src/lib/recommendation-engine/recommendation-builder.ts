// ── Recommendation Engine — Builder (ME-17) ───────────────────────────────────

import type { Recommendation, RecommendationType } from './recommendation-types'
import { RecommendationPriority, RECOMMENDATION_ENGINE_VERSION } from './recommendation-types'

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, Math.round(v)))
}

export class RecommendationBuilder {
  private _type?:            RecommendationType
  private _teacherId?:       string
  private _priority?:        RecommendationPriority
  private _title?:           string
  private _description?:     string
  private _reason?:          string
  private _basedOnInsights?: string[]
  private _confidence?:      number
  private _expiresInDays     = 7

  ofType(type: RecommendationType): this {
    this._type = type
    return this
  }

  forTeacher(teacherId: string): this {
    this._teacherId = teacherId
    return this
  }

  withPriority(priority: RecommendationPriority): this {
    this._priority = priority
    return this
  }

  withTitle(title: string): this {
    this._title = title
    return this
  }

  withDescription(description: string): this {
    this._description = description
    return this
  }

  withReason(reason: string): this {
    this._reason = reason
    return this
  }

  basedOn(insightIds: string[]): this {
    this._basedOnInsights = insightIds
    return this
  }

  withConfidence(c: number): this {
    this._confidence = clamp(c, 0, 100)
    return this
  }

  expiresIn(days: number): this {
    this._expiresInDays = Math.max(1, days)
    return this
  }

  build(): Recommendation {
    if (!this._type)           throw new Error('RecommendationBuilder: type requis')
    if (!this._teacherId)      throw new Error('RecommendationBuilder: teacherId requis')
    if (!this._priority)       throw new Error('RecommendationBuilder: priority requis')
    if (!this._title?.trim())  throw new Error('RecommendationBuilder: title requis')
    if (!this._description?.trim()) throw new Error('RecommendationBuilder: description requise')
    if (!this._reason?.trim()) throw new Error('RecommendationBuilder: reason requise')
    if (!this._basedOnInsights || this._basedOnInsights.length === 0) {
      throw new Error('RecommendationBuilder: au moins un insight requis dans basedOnInsights')
    }
    if (this._confidence === undefined) throw new Error('RecommendationBuilder: confidence requis')

    const now       = new Date()
    const expiresAt = new Date(now.getTime() + this._expiresInDays * 86_400_000)

    return {
      id:              crypto.randomUUID(),
      teacherId:       this._teacherId,
      type:            this._type,
      priority:        this._priority,
      title:           this._title,
      description:     this._description,
      reason:          this._reason,
      basedOnInsights: this._basedOnInsights,
      confidence:      this._confidence,
      createdAt:       now.toISOString(),
      expiresAt:       expiresAt.toISOString(),
      version:         RECOMMENDATION_ENGINE_VERSION,
    }
  }
}
