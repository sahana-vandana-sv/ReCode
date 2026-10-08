"use client";

import { useActionState, useState } from "react";
import { Plus } from "lucide-react";
import {
  addProblem,
  lookupProblem,
  type AddProblemState,
  type LookupState,
} from "@/actions/problems";
import { DifficultyBadge } from "@/components/problems/difficulty-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AddProblemDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>
          <Plus />
          Add problem
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a problem</DialogTitle>
          <DialogDescription>
            Enter the LeetCode problem number, like 1 for Two Sum.
          </DialogDescription>
        </DialogHeader>
        {/* Lives inside DialogContent, so closing the dialog resets it. */}
        <AddProblemForm />
      </DialogContent>
    </Dialog>
  );
}

const idleLookup: LookupState = { status: "idle" };
const idleAdd: AddProblemState = { status: "idle" };

function AddProblemForm() {
  // Controlled, so the number stays in the box after "Look up".
  const [number, setNumber] = useState("");
  const [lookup, lookupAction, lookingUp] = useActionState(
    lookupProblem,
    idleLookup,
  );
  const [added, addAction, adding] = useActionState(addProblem, idleAdd);

  const found = lookup.status === "found" ? lookup : null;
  // Only show "Added" for the problem currently in the preview.
  const addedMessage =
    added.status === "added" && added.number === found?.problem.number
      ? added.message
      : null;

  return (
    <div className="grid gap-4">
      <form action={lookupAction} className="flex items-end gap-2">
        <div className="grid flex-1 gap-2">
          <Label htmlFor="problem-number">Problem number</Label>
          <Input
            id="problem-number"
            name="number"
            type="number"
            inputMode="numeric"
            min={1}
            placeholder="1"
            required
            value={number}
            onChange={(event) => setNumber(event.target.value)}
          />
        </div>
        <Button type="submit" variant="outline" disabled={lookingUp}>
          {lookingUp ? "Looking up…" : "Look up"}
        </Button>
      </form>

      {lookup.status === "error" && (
        <p role="alert" className="text-sm text-destructive">
          {lookup.message}
        </p>
      )}

      {found && (
        <div className="grid gap-3 rounded-lg border p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">
              #{found.problem.number} · {found.problem.title}
            </span>
            <DifficultyBadge difficulty={found.problem.difficulty} />
            {found.problem.paidOnly && <Badge variant="secondary">Premium</Badge>}
          </div>
          {found.alreadyAdded || addedMessage ? (
            <p role="status" className="text-sm text-muted-foreground">
              {addedMessage ?? "Already in your list."}
            </p>
          ) : (
            <form action={addAction}>
              <input type="hidden" name="number" value={found.problem.number} />
              <Button type="submit" disabled={adding}>
                {adding ? "Adding…" : "Add to my list"}
              </Button>
            </form>
          )}
          {added.status === "error" && (
            <p role="alert" className="text-sm text-destructive">
              {added.message}
            </p>
          )}
        </div>
      )}
    </div>
  );
}