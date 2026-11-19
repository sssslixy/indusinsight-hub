import type { SkillValidationReport } from '@/api/skill'

export const SKILL_REVIEW_VERSION = 'skill-review-v2'
export const SKILL_METADATA_VERSION = 'skill-metadata-v3'
export const SKILL_MINIMUM_PUBLISH_SCORE = 80
export const skillPublishMinimum = (report?: SkillValidationReport | null) =>
  report?.minimumPublishScore ?? SKILL_MINIMUM_PUBLISH_SCORE

export function hasCurrentSkillReview(report?: SkillValidationReport | null): boolean {
  const dimensions = report?.llmAnalysis?.dimensions
  if (report?.reviewRulesVersion !== SKILL_REVIEW_VERSION || report.llmStatus !== 'succeeded'
    || !report.reviewCoverage?.complete || !dimensions || dimensions.length !== 5) return false
  const maxima = { purpose: 15, usefulness: 35, accuracy: 25, conditions: 15, usability: 10 }
  return new Set(dimensions.map(d => d.id)).size === 5
    && dimensions.every(d => Number.isInteger(d.score) && d.score >= 0 && d.maxScore === maxima[d.id] && d.score <= d.maxScore)
    && dimensions.reduce((total, d) => total + d.score, 0) === report.llmAnalysis?.score
}
