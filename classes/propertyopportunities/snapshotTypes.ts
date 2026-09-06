import type { OpportunityAnalysisResult, OpportunityItem, OpportunityOperation, OpportunityOperationStats, OpportunitySource } from "./types";

export interface OpportunityCoverage {
  source: OpportunitySource;
  observed: number;
  lastRead: string;
  complete: boolean;
  note: string;
}

/** Public only. Private source descriptions and identity evidence live in a separate collection. */
export interface PropertyOpportunitySnapshot {
  version: OpportunityAnalysisResult["version"];
  algorithm: OpportunityAnalysisResult["algorithm"];
  operation: OpportunityOperation;
  generatedAt: string;
  sourceReadAt: string;
  usdUyu: number;
  items: OpportunityItem[];
  stats: OpportunityOperationStats;
  coverage: OpportunityCoverage[];
}
