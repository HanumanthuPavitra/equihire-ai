/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Gender = 'Male' | 'Female';
export type Status = 'Selected' | 'Rejected';

export interface Candidate {
  id: string;
  name: string;
  gender: Gender;
  experience: number;
  skills: {
    predefined: string[];
    custom: string[];
  };
  skillScore?: number; // Calculated by engine
  reason?: string; // Decision justification
}

export interface AuditedCandidate extends Candidate {
  status: Status;
  strengths: string[];
  weaknesses: string[];
}

export interface BiasSummary {
  maleSelectionRate: number;
  femaleSelectionRate: number;
  biasDetected: boolean;
}

export interface AuditReport {
  candidates: AuditedCandidate[];
  totals: {
    male: number;
    female: number;
    selectedMale: number;
    selectedFemale: number;
  };
  bias: BiasSummary;
  severity: {
    score: number;
    level: 'Low' | 'Moderate' | 'High' | 'Critical';
  };
  confidence: number;
  insights: string[];
  explanation: string;
  recommendation: string[];
  summary: string;
}

export interface SimulationResult {
  report: AuditReport;
  distribution: {
    original: { male: number; female: number };
    simulated: { male: number; female: number };
  };
  improvement: string;
}
