import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  Actuals,
  Department,
  Initiative,
  Project,
  ScenarioSnapshot,
} from "@/lib/types";
import { seedDepartments, seedInitiatives } from "@/lib/seed";

interface LedgerState {
  initiatives: Initiative[];
  departments: Department[];
  /** Named sets of estimator scenarios explored together. */
  projects: Project[];
  /** Transient: id of the entry just added from the estimator, for the ledger to highlight. Not persisted. */
  highlightId: string | null;
  addInitiative: (initiative: Omit<Initiative, "id">) => string;
  updateInitiative: (id: string, patch: Partial<Omit<Initiative, "id">>) => void;
  deleteInitiative: (id: string) => void;
  /** Records reality against the claim and flips confidence accordingly. */
  recordActuals: (id: string, actuals: Actuals) => void;
  saveScenario: (projectName: string, snapshot: ScenarioSnapshot) => void;
  deleteScenario: (projectId: string, scenarioId: string) => void;
  setHighlight: (id: string | null) => void;
  resetDemoData: () => void;
}

interface PersistedShape {
  initiatives: Initiative[];
  departments: Department[];
  projects: Project[];
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function migrateToV3(persisted: any): PersistedShape {
  // v1/v2 stored { useCases, departments }; v3 renames to initiatives, adds
  // the judgment fields with middle-of-the-road defaults, wraps the old
  // modelId/modelLabel estimate fields into the engine union, and adds projects.
  const old: any[] = persisted?.initiatives ?? persisted?.useCases ?? [];
  const initiatives: Initiative[] = old.map((uc: any) => ({
    ...uc,
    perceivedValue: uc.perceivedValue ?? 3,
    buildEffort: uc.buildEffort ?? "M",
    estimate: uc.estimate
      ? {
          ...uc.estimate,
          engine:
            uc.estimate.engine ?? { kind: "model", modelId: uc.estimate.modelId ?? "" },
          engineLabel: uc.estimate.engineLabel ?? uc.estimate.modelLabel ?? "",
        }
      : undefined,
  }));
  return {
    initiatives,
    departments: persisted?.departments ?? seedDepartments,
    projects: persisted?.projects ?? [],
  };
}

export const useLedgerStore = create<LedgerState>()(
  persist(
    (set) => ({
      initiatives: seedInitiatives,
      departments: seedDepartments,
      projects: [],
      highlightId: null,
      addInitiative: (initiative) => {
        const id = crypto.randomUUID();
        set((state) => ({ initiatives: [...state.initiatives, { ...initiative, id }] }));
        return id;
      },
      updateInitiative: (id, patch) =>
        set((state) => ({
          initiatives: state.initiatives.map((existing) =>
            existing.id === id ? { ...existing, ...patch, id } : existing
          ),
        })),
      deleteInitiative: (id) =>
        set((state) => ({
          initiatives: state.initiatives.filter((i) => i.id !== id),
        })),
      recordActuals: (id, actuals) =>
        set((state) => ({
          initiatives: state.initiatives.map((existing) =>
            existing.id === id
              ? {
                  ...existing,
                  actuals,
                  confidence: actuals.quality === "measured" ? "High" : "Medium",
                }
              : existing
          ),
        })),
      saveScenario: (projectName, snapshot) =>
        set((state) => {
          const scenario = {
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString(),
            snapshot,
          };
          const existing = state.projects.find(
            (p) => p.name.toLowerCase() === projectName.toLowerCase()
          );
          if (existing) {
            return {
              projects: state.projects.map((p) =>
                p.id === existing.id ? { ...p, scenarios: [...p.scenarios, scenario] } : p
              ),
            };
          }
          return {
            projects: [
              ...state.projects,
              {
                id: crypto.randomUUID(),
                name: projectName,
                createdAt: new Date().toISOString(),
                scenarios: [scenario],
              },
            ],
          };
        }),
      deleteScenario: (projectId, scenarioId) =>
        set((state) => ({
          projects: state.projects
            .map((p) =>
              p.id === projectId
                ? { ...p, scenarios: p.scenarios.filter((s) => s.id !== scenarioId) }
                : p
            )
            .filter((p) => p.scenarios.length > 0),
        })),
      setHighlight: (id) => set({ highlightId: id }),
      resetDemoData: () =>
        set({ initiatives: seedInitiatives, departments: seedDepartments, projects: [] }),
    }),
    {
      name: "baseline-ai-ledger",
      version: 3,
      partialize: (state) => ({
        initiatives: state.initiatives,
        departments: state.departments,
        projects: state.projects,
      }),
      migrate: (persisted, version) =>
        version >= 3 ? (persisted as PersistedShape) : migrateToV3(persisted),
    }
  )
);
