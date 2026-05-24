"use client";

import { useState } from "react";
import { TrophyIcon, TargetIcon, CoinsIcon } from "lucide-react";

import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";

interface CreateBettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateBettingsDialog({ open, onOpenChange }: CreateBettingsDialogProps) {
  const [form, setForm] = useState({
    event: "",
    betType: "single",
    odds: "",
    stake: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Bettings data:", form);
    onOpenChange(false);
    setForm({
      event: "",
      betType: "single",
      odds: "",
      stake: "",
    });
  };

  const calculatePotentialWin = () => {
    if (form.odds && form.stake) {
      return (parseFloat(form.odds) * parseFloat(form.stake)).toFixed(2);
    }
    return null;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrophyIcon className="h-5 w-5" />
            Create Betting
          </DialogTitle>
          <DialogDescription>
            Add a new betting slip or wager to the system.
          </DialogDescription>
        </DialogHeader>

        <form id="betting-form" onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="event" className="text-sm font-semibold">
              Event / Match
            </Label>
            <div className="relative">
              <TrophyIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="event"
                value={form.event}
                onChange={(e) => setForm((f) => ({ ...f, event: e.target.value }))}
                placeholder="e.g., Team A vs Team B"
                className="pl-9"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="betType" className="text-sm font-semibold">
              Bet Type
            </Label>
            <Select
              value={form.betType}
              onValueChange={(val) => setForm((f) => ({ ...f, betType: val }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select bet type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="single">Single</SelectItem>
                <SelectItem value="parlay">Parlay / Accumulator</SelectItem>
                <SelectItem value="system">System Bet</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="odds" className="text-sm font-semibold">
                Odds
              </Label>
              <div className="relative">
                <TargetIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="odds"
                  type="number"
                  step="0.01"
                  value={form.odds}
                  onChange={(e) => setForm((f) => ({ ...f, odds: e.target.value }))}
                  placeholder="2.50"
                  className="pl-9"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="stake" className="text-sm font-semibold">
                Stake (€)
              </Label>
              <div className="relative">
                <CoinsIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="stake"
                  type="number"
                  step="0.01"
                  value={form.stake}
                  onChange={(e) => setForm((f) => ({ ...f, stake: e.target.value }))}
                  placeholder="100.00"
                  className="pl-9"
                  required
                />
              </div>
            </div>
          </div>

          {calculatePotentialWin() && (
            <div className="bg-muted/50 rounded-lg p-4 mt-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Potential Win:</span>
                <span className="text-lg font-bold text-green-600">
                  €{calculatePotentialWin()}
                </span>
              </div>
            </div>
          )}
        </form>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="submit" form="betting-form">
            Place Bet
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}