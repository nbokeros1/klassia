// ── Predictive Engine — Builder (ME-18) ───────────────────────────────────────

import type { Prediction, PredictionType } from './prediction-types'
import { PREDICTIVE_ENGINE_VERSION }       from './prediction-types'

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, Math.round(v)))
}

export class PredictionBuilder {
  private _type?:            PredictionType
  private _teacherId?:       string
  private _confidence?:      number
  private _predictedDate?:   string
  private _suggestedAction?: string
  private _reason?:          string
  private _sourceInsights:   string[] = []
  private _sourceCalendar:   string[] = []

  ofType(type: PredictionType): this {
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

  onDate(date: Date | string): this {
    this._predictedDate = typeof date === 'string' ? date : date.toISOString()
    return this
  }

  withSuggestedAction(action: string): this {
    this._suggestedAction = action
    return this
  }

  withReason(reason: string): this {
    this._reason = reason
    return this
  }

  fromInsights(ids: string[]): this {
    this._sourceInsights = ids
    return this
  }

  fromCalendar(ids: string[]): this {
    this._sourceCalendar = ids
    return this
  }

  build(): Prediction {
    if (!this._type)                    throw new Error('PredictionBuilder: type requis')
    if (!this._teacherId)               throw new Error('PredictionBuilder: teacherId requis')
    if (this._confidence === undefined) throw new Error('PredictionBuilder: confidence requis')
    if (!this._predictedDate)           throw new Error('PredictionBuilder: predictedDate requis')
    if (!this._suggestedAction?.trim()) throw new Error('PredictionBuilder: suggestedAction requis')
    if (!this._reason?.trim())          throw new Error('PredictionBuilder: reason requise')

    return {
      id:              crypto.randomUUID(),
      teacherId:       this._teacherId,
      type:            this._type,
      confidence:      this._confidence,
      predictedDate:   this._predictedDate,
      suggestedAction: this._suggestedAction,
      reason:          this._reason,
      sourceInsights:  this._sourceInsights,
      sourceCalendar:  this._sourceCalendar,
      version:         PREDICTIVE_ENGINE_VERSION,
    }
  }
}
