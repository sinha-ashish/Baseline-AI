import { useState } from "react";
import { LayoutDashboard, RotateCcw, Table2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Landing } from "@/components/Landing";
import { Dashboard } from "@/components/Dashboard";
import { Ledger } from "@/components/Ledger";
import { useLedgerStore } from "@/store";

export default function App() {
  const resetDemoData = useLedgerStore((s) => s.resetDemoData);
  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <div className="flex min-h-screen flex-col">
      <Landing />

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
        <Tabs defaultValue="dashboard">
          <TabsList>
            <TabsTrigger value="dashboard">
              <LayoutDashboard className="h-4 w-4" /> Dashboard
            </TabsTrigger>
            <TabsTrigger value="ledger">
              <Table2 className="h-4 w-4" /> Ledger
            </TabsTrigger>
          </TabsList>
          <TabsContent value="dashboard" className="mt-6">
            <Dashboard />
          </TabsContent>
          <TabsContent value="ledger" className="mt-6">
            <Ledger />
          </TabsContent>
        </Tabs>
      </main>

      <footer className="border-t border-border/60">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-5">
          <p className="text-xs text-muted-foreground">
            Prototype — data stays in your browser.
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
              All your changes will be discarded and the original 10 demo use cases restored.
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
