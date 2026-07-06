import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Department, UseCase } from "@/lib/types";
import { seedDepartments, seedUseCases } from "@/lib/seed";

interface LedgerState {
  useCases: UseCase[];
  departments: Department[];
  addUseCase: (uc: Omit<UseCase, "id">) => void;
  updateUseCase: (id: string, uc: Omit<UseCase, "id">) => void;
  deleteUseCase: (id: string) => void;
  resetDemoData: () => void;
}

export const useLedgerStore = create<LedgerState>()(
  persist(
    (set) => ({
      useCases: seedUseCases,
      departments: seedDepartments,
      addUseCase: (uc) =>
        set((state) => ({
          useCases: [
            ...state.useCases,
            { ...uc, id: crypto.randomUUID() },
          ],
        })),
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
      resetDemoData: () =>
        set({ useCases: seedUseCases, departments: seedDepartments }),
    }),
    {
      name: "baseline-ai-ledger",
      version: 1,
    }
  )
);
