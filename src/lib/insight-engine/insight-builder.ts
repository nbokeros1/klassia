// ── Insight Engine — Builder (ME-16) ──────────────────────────────────────────

import type { Insight, InsightType, InsightPeriod, InsightEvidence } from './insight-types'
import { INSIGHT_ENGINE_VERSION } from './insight-types'

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, Math.round(v)))
}

export class InsightBuilder {
  private _type?:        InsightType
  private _teacherId?:   string
  private _confidence?:  number
  private _score?:       number
  private _title?:       string
  private _description?: string
  private _period?:      InsightPeriod
  private _evidence?:    InsightEvidence

  ofType(type: InsightType): this {
    this._type = type
    return this
  }

  forTeacher(teacherId: string): this {
    this._teacherId = teacherId
    return this
  }

  withConfidence(c: number): this {
    this._confidence = clamp(c, 0, 100)
    return this
  }

  withScore(s: number): this {
    this._score = clamp(s, 0, 100)
    return this
  }

  withTitle(title: string): this {
    this._title = title
    return this
  }

  withDescription(desc: string): this {
    this._description = desc
    return this
  }

  forPeriod(since: Date, until: Date): this {
    this._period = { since: since.toISOString(), until: until.toISOString() }
    return this
  }

  withEvidence(e: InsightEvidence): this {
    this._evidence = e
    return this
  }

  build(): Insight {
    if (!this._type)        throw new Error('InsightBuilder: type requis')
    if (!this._teacherId)   throw new Error('InsightBuilder: teacherId requis')
    if (this._confidence === undefined) throw new Error('InsightBuilder: confidence requis')
    if (!this._evidence)    throw new Error('InsightBuilder: evidence requis')
    if (!this._period)      throw new Error('InsightBuilder: period requis')

    return {
      id:          crypto.randomUUID(),
      teacherId:   this._teacherId,
      type:        this._type,
      confidence:  this._confidence,
      score:       this._score ?? 0,
      title:       this._title ?? '',
      description: this._description ?? '',
      generatedAt: new Date().toISOString(),
      period:      this._period,
      evidence:    this._evidence,
      version:     INSIGHT_ENGINE_VERSION,
    }
  }
}
