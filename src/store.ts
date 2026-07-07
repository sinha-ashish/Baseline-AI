import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Department, UseCase } from "@/lib/types";
import { seedDepartments, seedUseCases } from "@/lib/seed";

interface LedgerState {
  useCases: UseCase[];
  departments: Department[];
  /** Transient: id of the entry just added from the estimator, for the ledger to highlight. Not persisted. */
  highlightId: string | null;
  addUseCase: (uc: Omit<UseCase, "id">) => string;
  updateUseCase: (id: string, uc: Omit<UseCase, "id">) => void;
  deleteUseCase: (id: string) => void;
  setHighlight: (id: string | null) => void;
  resetDemoData: () => void;
}

export const useLedgerStore = create<LedgerState>()(
  persist(
    (set) => ({
      useCases: seedUseCases,
      departments: seedDepartments,
      highlightId: null,
      addUseCase: (uc) => {
        const id = crypto.randomUUID();
        set((state) => ({ useCases: [...state.useCases, { ...uc, id }] }));
        return id;
      },
      updateUseCase: (id, uc) =>
        set((state) => ({
          useCases: state.useCases.map((existing) =>
            existing.id === id ? { ...uc, id } : existing
          ),
        })),
      deleteUseCase: (id) =>
        set((state) => ({
          useCases: state.useCases.filter((uc) => uc.id !== id),
        })),
      setHighlight: (id) => set({ highlightId: id }),
      resetDemoData: () =>
        set({ useCases: seedUseCases, departments: seedDepartments }),
    }),
    {
      name: "baseline-ai-ledger",
      version: 2,
      partialize: (state) => ({
        useCases: state.useCases,
        departments: state.departments,
      }),
      // v1 → v2 added optional fields on UseCase (estimate); existing data
      // passes through untouched so demo edits survive the restructure.
      migrate: (persisted) => persisted as { useCases: UseCase[]; departments: Department[] },
    }
  )
);
