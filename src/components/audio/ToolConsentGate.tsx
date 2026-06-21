// One-time consent gate shown before the user runs any audio tool.
// Records acceptance to profiles.tool_consent_at (or localStorage if anon).

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  acceptToolConsent,
  hasLocalConsent,
  hasToolConsent,
} from "@/lib/tool-audit";

type Props = {
  children: React.ReactNode;
};

export function ToolConsentGate({ children }: Props) {
  const [checked, setChecked] = useState<boolean | null>(null);
  const [agree, setAgree] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const v = await hasToolConsent();
      if (v === true) return setChecked(true);
      if (v === "anon" && hasLocalConsent()) return setChecked(true);
      setChecked(false);
    })();
  }, []);

  if (checked === null) {
    return <div className="text-xs text-muted-foreground">Loading…</div>;
  }

  if (checked) return <>{children}</>;

  return (
    <Dialog open>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Before you use this tool</DialogTitle>
          <DialogDescription>
            These audio tools run entirely on your device — nothing is uploaded to
            any server.
          </DialogDescription>
        </DialogHeader>
        <ul className="text-sm space-y-2 list-disc pl-5 text-muted-foreground">
          <li>
            Only process audio you own or have explicit permission to modify.
          </li>
          <li>
            Vocal removal and notification cleanup are best-effort, not perfect —
            preview before sharing.
          </li>
          <li>
            We log the file name, size, and tool settings to your account so you
            can review your job history. No audio is stored.
          </li>
        </ul>
        <label className="flex items-start gap-2 text-sm pt-2">
          <Checkbox
            checked={agree}
            onCheckedChange={(v) => setAgree(v === true)}
            className="mt-0.5"
          />
          <span>
            I agree and I confirm I have the right to process this audio.
          </span>
        </label>
        <DialogFooter>
          <Button
            disabled={!agree || saving}
            onClick={async () => {
              setSaving(true);
              await acceptToolConsent();
              setChecked(true);
            }}
          >
            Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
