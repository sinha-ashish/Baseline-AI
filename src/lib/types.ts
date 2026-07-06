export const STATUSES = ["Idea", "POC", "Pilot", "Production", "Stopped"] as const;
export type Status = (typeof STATUSES)[number];

export const CATEGORIES = ["Gen", "Agent", "Automation", "Hybrid"] as const;
export type Category = (typeof CATEGORIES)[number];

export const USAGE_PATTERNS = ["user-driven", "system-driven"] as const;
export type UsagePattern = (typeof USAGE_PATTERNS)[number];

export const CONFIDENCES = ["Low", "Medium", "High"] as const;
export type Confidence = (typeof CONFIDENCES)[number];

export interface UseCase {
  id: string;
  name: string;
  department: string;
  owner: string;
  status: Status;
  category: Category;
  usagePattern: UsagePattern;
  totalUsers: number;
  timeSavedPerUserPerMonth: number; // hours
  expectedMonthlyCost: number; // EUR
  peakUsage: string;
  fallback: string;
  confidence: Confidence;
}

export interface Department {
  name: string;
  monthlyBudget: number; // EUR
}
