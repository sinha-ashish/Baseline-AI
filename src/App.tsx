import { useEffect, useState } from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Header } from "@/components/Header";
import { Landing } from "@/components/Landing";
import { Dashboard } from "@/components/Dashboard";
import { Ledger } from "@/components/Ledger";
import { Estimator } from "@/components/Estimator";
import { useLedgerStore } from "@/store";

function currentRoute(): string {
  return window.location.hash.replace(/^#\/?/, "").split("?")[0];
}

function useHashRoute(): string {
  const [route, setRoute] = useState(currentRoute);
  useEffect(() => {
    const onHashChange = () => {
      setRoute(currentRoute());
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);
  return route;
}

export default function App() {
  const route = useHashRoute();
  const resetDemoData = useLedgerStore((s) => s.resetDemoData);
  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <div className="flex min-h-screen flex-col">
      <Header route={route} />

      <main className="flex-1">
        {route === "" && <Landing />}
        {route === "estimate" && (
          <div className="mx-auto w-full max-w-6xl px-6 py-10">
            <Estimator />
          </div>
        )}
        {route === "ledger" && (
          <div className="mx-auto w-full max-w-6xl px-6 py-10">
            <Ledger />
          </div>
        )}
        {route === "dashboard" && (
          <div className="mx-auto w-full max-w-6xl px-6 py-10">
            <Dashboard />
          </div>
        )}
        {!["", "estimate", "ledger", "dashboard"].includes(route) && <Landing />}
      </main>

      <footer className="border-t border-border/60">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-5">
          <p className="text-xs text-muted-foreground">
            Prototype — your data lives in this browser. No account, nothing leaves your machine.
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => setConfirmReset(true)}
          >
            <RotateCcw /> Reset demo data
          </Button>
        </div>
      </footer>

      <Dialog open={confirmReset} onOpenChange={setConfirmReset}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reset demo data?</DialogTitle>
            <DialogDescription>
              All your changes will be discarded and the original demo initiatives restored.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmReset(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                resetDemoData();
                setConfirmReset(false);
              }}
            >
              Reset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
