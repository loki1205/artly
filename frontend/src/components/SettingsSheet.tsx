import { useRef } from "react";
import { Download, Moon, Sun, Upload, Volume2 } from "lucide-react";
import { useMutations, useSettings } from "../hooks/data";
import { useTheme } from "../hooks/useTheme";
import { useUI } from "../stores/ui";
import { api } from "../lib/api";
import { Modal } from "./ui/overlay";
import { Button, Switch } from "./ui/primitives";
import { toast } from "../stores/toast";

function Row({ icon, title, subtitle, control }: { icon: React.ReactNode; title: string; subtitle?: string; control: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-line/10 p-3.5">
      <span className="grid h-9 w-9 place-items-center rounded-md border border-line/10 text-muted">{icon}</span>
      <div className="flex-1">
        <p className="text-sm font-medium">{title}</p>
        {subtitle && <p className="text-xs text-muted">{subtitle}</p>}
      </div>
      {control}
    </div>
  );
}

export function SettingsSheet() {
  const { settingsOpen, setSettings } = useUI();
  const { data: settings } = useSettings();
  const { theme, toggle } = useTheme();
  const { updateSettings, importBoard } = useMutations();
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <Modal open={settingsOpen} onClose={() => setSettings(false)} title="Settings" className="max-w-md">
      <div className="space-y-2.5">
        <Row
          icon={theme === "dark" ? <Moon size={17} /> : <Sun size={17} />}
          title="Appearance"
          subtitle={theme === "dark" ? "Dark mode" : "Light mode"}
          control={<Switch checked={theme === "dark"} onChange={toggle} label="Dark mode" />}
        />
        <Row
          icon={<Volume2 size={17} />}
          title="Sound effects"
          subtitle="Subtle audio feedback"
          control={
            <Switch
              checked={!!settings?.sound}
              onChange={(v) => updateSettings.mutate({ sound: v })}
              label="Sound effects"
            />
          }
        />

        <div className="grid grid-cols-2 gap-2 pt-2">
          <Button variant="glass" onClick={() => window.open(api.exportUrl, "_blank")}>
            <Download size={15} /> Export
          </Button>
          <Button variant="glass" onClick={() => fileRef.current?.click()}>
            <Upload size={15} /> Import
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".zip"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f)
                importBoard.mutate(f, {
                  onSuccess: () => {
                    toast.success("Board imported");
                    setSettings(false);
                  },
                });
              e.target.value = "";
            }}
          />
        </div>
        <p className="px-1 pt-1 text-center text-xs text-muted">
          Export downloads a zip of ideas, categories & images. Import replaces the whole board.
        </p>
      </div>
    </Modal>
  );
}
