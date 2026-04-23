import { describe, expect, it } from 'vitest'

import {
  aggregateBatchScores,
  applyImprovementScores,
  determineRewardWinners,
  type BatchSubmissionRow,
} from './rewardService.js'

describe('aggregateBatchScores', () => {
  it('calculates normalized averages by batch', () => {
    const rows: BatchSubmissionRow[] = [
      { batchId: 'b1', studentId: 's1', scoreTotal: 18, maxScore: 20 },
      { batchId: 'b1', studentId: 's1', scoreTotal: 16, maxScore: 20 },
      { batchId: 'b1', studentId: 's2', scoreTotal: 10, maxScore: 20 },
      { batchId: 'b2', studentId: 's3', scoreTotal: 15, maxScore: 20 },
      { batchId: 'b2', studentId: 's4', scoreTotal: 16, maxScore: 20 },
    ]

    const result = aggregateBatchScores(rows, 1, 1)
    expect(result[0]?.batchId).toBe('b2')
    expect(result[0]?.averageNormalizedScore).toBe(0.775)
    expect(result[1]?.batchId).toBe('b1')
    expect(result[1]?.averageNormalizedScore).toBe(0.675)
  })
})

describe('determineRewardWinners', () => {
  it('selects top performance and most improved batches', () => {
    const current = applyImprovementScores(
      aggregateBatchScores(
        [
          { batchId: 'b1', studentId: 's1', scoreTotal: 18, maxScore: 20 },
          { batchId: 'b2', studentId: 's2', scoreTotal: 16, maxScore: 20 },
        ],
        1,
        1,
      ),
      new Map([
        ['b1', 0.5],
        ['b2', 0.75],
      ]),
    )

    const winners = determineRewardWinners(current)
    expect(winners.winnerBatchId).toBe('b1')
    expect(winners.mostImprovedBatchId).toBe('b1')
  })
})
