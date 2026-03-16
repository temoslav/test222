// Sprint 4: pgvector-based recommendation algorithm
// Three-layer signal system as per CLAUDE.md section 5

// TODO: implement recommendation logic in Sprint 4
export async function getRecommendations(
  _userId: string,
  _limit: number = 20
): Promise<string[]> {
  throw new Error('getRecommendations not implemented — Sprint 4')
}

export const INTERACTION_WEIGHTS = {
  swipe_right: 1.0,
  save: 2.0,
  share: 3.0,
  view_detail: 0.5,
  external_click: 1.5,
  swipe_left: -1.0,
} as const

export const DWELL_TIME_BONUS = {
  long: 0.3,   // > 5s
  short: -0.3, // < 1s
} as const

export const EXPLORATION_RATIO = 0.2 // 20% new categories
