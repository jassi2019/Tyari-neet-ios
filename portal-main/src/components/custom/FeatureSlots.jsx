"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

/**
 * FeatureSlots — admin UI for the 7 per-feature content slots on a Topic.
 *
 * Each slot is a JSON object: { url, contentId, thumbnail, description }.
 * Empty slots fall back to the topic's primary content on the mobile app.
 *
 * Props:
 *   value: object keyed by slot field name (e.g. { explanationContent: {...}, ... })
 *   onChange: (nextValue) => void  — replaces the whole map
 */

export const FEATURE_SLOTS = [
  { key: "explanationContent", label: "Explanation", icon: "💡" },
  { key: "revisionRecallContent", label: "Revision Recall Station", icon: "🧠" },
  { key: "hiddenLinksContent", label: "Hidden Links", icon: "🔗" },
  { key: "exerciseRevivalContent", label: "Exercise Revival", icon: "📋" },
  { key: "masterExemplarContent", label: "Master Exemplar", icon: "🏆" },
  { key: "pyqContent", label: "Previous Year Questions", icon: "📖" },
  { key: "chapterCheckpointContent", label: "Chapter Check Point", icon: "🛡️" },
];

const EMPTY_SLOT = { url: "", contentId: "", thumbnail: "", description: "" };

export default function FeatureSlots({ value = {}, onChange }) {
  const updateSlot = (slotKey, field, fieldValue) => {
    const current = value[slotKey] || EMPTY_SLOT;
    const next = { ...current, [field]: fieldValue };
    // If everything in this slot is empty, store null so backend treats it as "use legacy fallback".
    const isEmpty = !next.url && !next.contentId && !next.thumbnail && !next.description;
    onChange({
      ...value,
      [slotKey]: isEmpty ? null : next,
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-bold">Feature Content Slots</h3>
        <p className="text-sm text-muted-foreground">
          Add separate content for each Home-screen feature box. Leave a slot
          empty to fall back to the topic&apos;s default content above.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {FEATURE_SLOTS.map((slot) => {
          const data = value[slot.key] || EMPTY_SLOT;
          const filled = !!(data.url || data.contentId);
          return (
            <Card
              key={slot.key}
              className={filled ? "border-primary/40" : ""}
            >
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{slot.icon}</span>
                  <div className="font-semibold">{slot.label}</div>
                  {filled && (
                    <span className="ml-auto text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-primary/15 text-primary">
                      Set
                    </span>
                  )}
                </div>

                <div>
                  <label className="text-xs font-medium mb-1 block">
                    Content URL (Canva / external)
                  </label>
                  <Input
                    value={data.url || ""}
                    onChange={(e) =>
                      updateSlot(slot.key, "url", e.target.value)
                    }
                    placeholder="https://www.canva.com/design/..."
                  />
                </div>

                <div>
                  <label className="text-xs font-medium mb-1 block">
                    Canva Design ID (optional)
                  </label>
                  <Input
                    value={data.contentId || ""}
                    onChange={(e) =>
                      updateSlot(slot.key, "contentId", e.target.value)
                    }
                    placeholder="DAFxxxxxxxx"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium mb-1 block">
                    Thumbnail URL (optional)
                  </label>
                  <Input
                    value={data.thumbnail || ""}
                    onChange={(e) =>
                      updateSlot(slot.key, "thumbnail", e.target.value)
                    }
                    placeholder="https://..."
                  />
                </div>

                <div>
                  <label className="text-xs font-medium mb-1 block">
                    Description (optional)
                  </label>
                  <Textarea
                    value={data.description || ""}
                    onChange={(e) =>
                      updateSlot(slot.key, "description", e.target.value)
                    }
                    placeholder="Short note shown above the content..."
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
