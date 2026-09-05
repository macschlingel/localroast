"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type Step = {
  step_order: number;
  name: string;
  volume_ml: number;
  time_seconds: number;
  flow_rate_ml_per_sec: number;
};

export type RecipeFormValue = {
  id?: string;
  title: string;
  grinder: string;
  grind_size: string;
  coffee_filter: string;
  filter_paper: string;
  is_public: boolean;
  steps: Step[];
};

const blankStep = (step_order: number): Step => ({
  step_order,
  name: "",
  volume_ml: 0,
  time_seconds: 0,
  flow_rate_ml_per_sec: 0,
});

const emptyRecipe: RecipeFormValue = {
  title: "",
  grinder: "",
  grind_size: "",
  coffee_filter: "",
  filter_paper: "",
  is_public: false,
  steps: [blankStep(1)],
};

export function RecipeForm({ initialRecipe }: { initialRecipe?: RecipeFormValue }) {
  const router = useRouter();
  const [value, setValue] = useState<RecipeFormValue>(initialRecipe ?? emptyRecipe);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function updateField<K extends keyof RecipeFormValue>(field: K, nextValue: RecipeFormValue[K]) {
    setValue((current) => ({ ...current, [field]: nextValue }));
  }

  function updateStep(index: number, field: keyof Step, nextValue: string) {
    setValue((current) => ({
      ...current,
      steps: current.steps.map((step, stepIndex) =>
        stepIndex === index
          ? {
              ...step,
              [field]: field === "name" ? nextValue : Number(nextValue),
            }
          : step,
      ),
    }));
  }

  function addStep() {
    setValue((current) => ({
      ...current,
      steps: [...current.steps, blankStep(current.steps.length + 1)],
    }));
  }

  function removeStep(index: number) {
    setValue((current) => ({
      ...current,
      steps: current.steps
        .filter((_, stepIndex) => stepIndex !== index)
        .map((step, stepIndex) => ({ ...step, step_order: stepIndex + 1 })),
    }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const response = await fetch(value.id ? `/api/recipes/${value.id}` : "/api/recipes", {
        method: value.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(value),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        const messages = payload?.details?.map((issue: { path: unknown[]; message: string }) =>
          `${issue.path.join(".")}: ${issue.message}`,
        );
        throw new Error(messages?.join("; ") || payload?.error || "Speichern fehlgeschlagen");
      }

      router.push(`/dashboard/recipe/${payload.id}`);
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Speichern fehlgeschlagen");
    } finally {
      setSaving(false);
    }
  }

  async function removeRecipe() {
    if (!value.id || !window.confirm("Dieses Rezept wirklich löschen?")) return;
    setError(null);
    setSaving(true);
    try {
      const response = await fetch(`/api/recipes/${value.id}`, { method: "DELETE" });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || "Löschen fehlgeschlagen");
      }
      router.push("/dashboard");
      router.refresh();
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "Löschen fehlgeschlagen");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-8">
      <section className="rounded-lg border bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold">Rezept</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-1 md:col-span-2">
            <span className="text-sm font-medium">Titel</span>
            <input required maxLength={120} value={value.title} onChange={(event) => updateField("title", event.target.value)} className="input" />
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium">Mühle</span>
            <input required maxLength={120} value={value.grinder} onChange={(event) => updateField("grinder", event.target.value)} className="input" />
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium">Mahlgrad</span>
            <input required maxLength={80} value={value.grind_size} onChange={(event) => updateField("grind_size", event.target.value)} className="input" />
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium">Kaffeefilter / Dripper</span>
            <input required maxLength={120} value={value.coffee_filter} onChange={(event) => updateField("coffee_filter", event.target.value)} className="input" placeholder="z. B. Hario V60 02" />
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium">Filterpapier</span>
            <input required maxLength={120} value={value.filter_paper} onChange={(event) => updateField("filter_paper", event.target.value)} className="input" placeholder="z. B. Cafec Abaca 2–4 Cups" />
          </label>
          <label className="flex items-center gap-2 text-sm md:col-span-2">
            <input type="checkbox" checked={value.is_public} onChange={(event) => updateField("is_public", event.target.checked)} />
            Rezept öffentlich zugänglich machen
          </label>
        </div>
      </section>

      <section className="rounded-lg border bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Brühschritte</h2>
            <p className="text-sm text-gray-500">Wasser, Zeit und Flussrate pro Schritt.</p>
          </div>
          <button type="button" onClick={addStep} className="button-secondary">Schritt hinzufügen</button>
        </div>
        <div className="space-y-4">
          {value.steps.map((step, index) => (
            <div key={index} className="rounded-md border p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-medium">Schritt {index + 1}</h3>
                {value.steps.length > 1 && (
                  <button type="button" onClick={() => removeStep(index)} className="text-sm text-red-600 hover:underline">Entfernen</button>
                )}
              </div>
              <div className="grid gap-3 md:grid-cols-4">
                <label className="space-y-1 md:col-span-2">
                  <span className="text-sm font-medium">Name</span>
                  <input required maxLength={80} value={step.name} onChange={(event) => updateStep(index, "name", event.target.value)} className="input" placeholder="Bloom" />
                </label>
                <label className="space-y-1">
                  <span className="text-sm font-medium">Wasser (ml)</span>
                  <input required min="0.01" max="5000" step="0.1" type="number" value={step.volume_ml || ""} onChange={(event) => updateStep(index, "volume_ml", event.target.value)} className="input" />
                </label>
                <label className="space-y-1">
                  <span className="text-sm font-medium">Zeit (Sek.)</span>
                  <input required min="0" max="3600" step="1" type="number" value={step.time_seconds || ""} onChange={(event) => updateStep(index, "time_seconds", event.target.value)} className="input" />
                </label>
                <label className="space-y-1 md:col-span-2">
                  <span className="text-sm font-medium">Flussrate (ml/s)</span>
                  <input required min="0.01" max="100" step="0.01" type="number" value={step.flow_rate_ml_per_sec || ""} onChange={(event) => updateStep(index, "flow_rate_ml_per_sec", event.target.value)} className="input" />
                </label>
              </div>
            </div>
          ))}
        </div>
      </section>

      {error && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div className="flex justify-end gap-3">
        {value.id && <button type="button" onClick={removeRecipe} disabled={saving} className="button-danger mr-auto">Rezept löschen</button>}
        <button type="button" onClick={() => router.push("/dashboard")} className="button-secondary">Abbrechen</button>
        <button type="submit" disabled={saving} className="button-primary">{saving ? "Speichert …" : "Rezept speichern"}</button>
      </div>
    </form>
  );
}
