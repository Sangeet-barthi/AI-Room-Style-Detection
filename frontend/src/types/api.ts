/**
 * TypeScript mirrors of the public API contracts.
 * The backend Pydantic schemas remain the source of truth.
 */

export type DesignStyle =
  | 'Modern'
  | 'Minimalist'
  | 'Luxury'
  | 'Classic'
  | 'Traditional'
  | 'Rustic'
  | 'Coastal'

export type Priority = 'high' | 'medium' | 'low'
export type EvidenceType = 'observed' | 'inferred'
export type ImprovementCategory = 'quick' | 'lighting' | 'furniture' | 'color' | 'material' | 'decor'

export interface ApiErrorBody {
  code: string
  message: string
  details?: unknown
}

export interface User {
  id: string
  email: string
  full_name: string
  is_demo: boolean
  created_at: string
}

export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
  user: User
}

export interface AlternativeStyle {
  style: DesignStyle
  confidence_estimate: number
  supporting_evidence: string[]
}

export interface FurnitureItem {
  name: string
  description: string
  condition_note: string
  evidence_type: EvidenceType
}

export interface MaterialItem {
  name: string
  where_seen: string
  evidence_type: EvidenceType
}

export interface DominantColor {
  name: string
  hex: string
  coverage: 'dominant' | 'secondary' | 'accent'
}

export interface LightingObservations {
  natural_light_visible: boolean
  window_count_visible: number
  window_openness: 'none' | 'small' | 'medium' | 'large'
  overall_brightness: 'dark' | 'dim' | 'balanced' | 'bright' | 'very_bright'
  artificial_light_sources_visible: number
  light_distribution: 'uneven' | 'mixed' | 'even'
  notes: string
}

export interface VentilationObservations {
  openable_windows_visible: number
  doors_or_openings_visible: number
  cross_ventilation_possible: boolean
  mechanical_ventilation_visible: boolean
  room_openness: 'enclosed' | 'semi_open' | 'open'
  notes: string
}

export interface SpaceObservations {
  furniture_density: 'sparse' | 'balanced' | 'busy' | 'overcrowded'
  walking_clearance: 'blocked' | 'tight' | 'adequate' | 'generous'
  clutter_level: 'none' | 'low' | 'moderate' | 'high'
  layout_balance: 'poor' | 'fair' | 'good' | 'excellent'
  vertical_storage_used: boolean
  notes: string
}

export interface RoomAnalysisPayload {
  room_type: string
  primary_style: DesignStyle
  style_confidence: number
  alternative_styles: AlternativeStyle[]
  style_evidence: string[]
  style_explanation: string
  furniture: FurnitureItem[]
  wall_color: string
  flooring: string
  materials: MaterialItem[]
  dominant_colors: DominantColor[]
  color_temperature: 'warm' | 'cool' | 'neutral' | 'mixed'
  lighting_observations: LightingObservations
  ventilation_observations: VentilationObservations
  space_utilization_observations: SpaceObservations
  strengths: string[]
  weaknesses: string[]
  suggested_improvements: string[]
  detected_features: string[]
  uncertainty_notes: string
}

export interface ScoreDetail {
  score: number
  band: string
  summary: string
  factors: string[]
  breakdown: Record<string, number>
  disclaimer: string
}

export interface OverallScore {
  score: number
  band: string
  summary: string
  formula: string
  weights: Record<string, number>
  weakest_dimension: string
  strongest_dimension: string
  disclaimer: string
}

export interface RoomScores {
  lighting: ScoreDetail
  ventilation: ScoreDetail
  space_utilization: ScoreDetail
  overall: OverallScore
}

export interface Improvement {
  title: string
  category: ImprovementCategory
  reason: string
  expected_impact: string
  priority: Priority
  estimated_cost_inr: number | null
}

export interface ImprovementPlan {
  summary: string
  improvements: Improvement[]
}

export interface BudgetItem {
  name: string
  estimated_cost: number
  reason: string
  expected_impact: string
  priority: Priority
}

export interface BudgetPlan {
  budget: number
  items: BudgetItem[]
  total_estimated_cost: number
  remaining: number
  notes: string
}

export interface ImageRef {
  id: string
  image_type: 'original' | 'thumbnail' | string
  url: string
  mime_type: string
  width: number | null
  height: number | null
}

export interface MakeoverMockup {
  target_style?: string
  palette?: { name: string; hex: string }[]
  furniture_changes?: string[]
  lighting_changes?: string[]
  decor_changes?: string[]
  material_changes?: string[]
}

export interface Makeover {
  id: string
  target_style: DesignStyle
  kind: 'ai_concept' | 'design_mockup'
  provider: string
  label: string
  image_url: string | null
  mockup: MakeoverMockup
  note: string | null
  created_at: string
}

export interface ReportSummary {
  id: string
  analysis_id: string
  file_name: string
  size_bytes: number
  created_at: string
  room_type: string | null
  primary_style: string | null
  download_url: string
}

export interface AnalysisSummary {
  id: string
  title: string | null
  room_type: string
  primary_style: DesignStyle
  style_confidence: number
  overall_score: number
  thumbnail_url: string | null
  created_at: string
}

export interface AnalysisDetail {
  id: string
  title: string | null
  room_type: string
  primary_style: DesignStyle
  style_confidence: number
  overall_score: number
  created_at: string
  model_name: string | null
  analysis: RoomAnalysisPayload
  model_metadata: Record<string, unknown>
  scores: RoomScores
  improvements: ImprovementPlan
  budget_plans: BudgetPlan[]
  images: ImageRef[]
  makeovers: Makeover[]
  reports: ReportSummary[]
}

export interface PaginatedAnalyses {
  items: AnalysisSummary[]
  total: number
  page: number
  page_size: number
  has_more: boolean
}

export interface DashboardStats {
  total_analyses: number
  average_health_score: number
  reports_created: number
  style_distribution: { style: string; count: number }[]
  room_type_distribution: { room_type: string; count: number }[]
  score_trend: { id: string; label: string; score: number; style: string }[]
  latest: AnalysisSummary | null
}

export interface Capabilities {
  vision_enabled: boolean
  vision_model: string
  image_generation_enabled: boolean
  image_generation_provider: string
  demo_mode: boolean
  max_upload_mb: number
  supported_styles: DesignStyle[]
  supported_room_types: string[]
  budget_tiers: number[]
}

export interface RecommendationsResponse {
  analysis_id: string
  improvements: ImprovementPlan
  budget_plans: BudgetPlan[]
  scores: RoomScores
}
