/**
 * @fileOverview Définitions de types pour le pipeline ML AGENTIC.
 */

export interface TrainingExample {
  type: string;
  input: string;
  output: string;
  context?: any;
  weight?: number;
  source?: string;
  docId?: string;
  rating?: number;
  correction?: string;
}

export interface TrainedModel {
  name: string;
  version: string;
  path: string;
  metrics: any;
}

export interface Prediction {
  result: string;
  confidence: number;
  modelVersion: string;
  latency: number;
}

export interface UserInteraction {
  input: string;
  prediction: string;
  actual?: string;
  feedback?: {
    rating: number;
    correction?: string;
  };
  context?: any;
  modelVersion: string;
}

export interface PredictionRecord extends UserInteraction {
  id: string;
  timestamp: number;
}

export interface UserProfile {
  userId: string;
  interests: string[];
  expertise: 'beginner' | 'intermediate' | 'expert';
  preferences: any;
  recentTopics: string[];
  documentTypes: string[];
  lastUpdated: number;
}

export interface Recommendation {
  id: string;
  title: string;
  description: string;
  category: string;
  confidence: number;
  reasons: string[];
  actionUrl?: string;
}

export interface RecommendationContext {
  limit?: number;
  currentTask?: string;
  domain?: string;
}

export interface Candidate extends Omit<Recommendation, 'score' | 'reasons'> {}

export interface ScoredCandidate extends Candidate {
  score: number;
  reasons: string[];
}
