"use client";

import { FormEvent, useEffect, useState } from "react";

type Device = {
  id: string;
  name: string;
  keyPrefix: string;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
};

export function DeviceManager() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [name, setName] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadDevices() {
    const response = await fetch("/api/devices");
    if (response.ok) setDevices(await response.json());
  }

  useEffect(() => {
    let cancelled = false;
    fetch("/api/devices")
      .then(async (response) => (response.ok ? response.json() : []))
      .then((nextDevices: Device[]) => {
        if (!cancelled) setDevices(nextDevices);
      })
      .catch(() => {
        if (!cancelled) setError("Geräte konnten nicht geladen werden");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function createDevice(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const response = await fetch("/api/devices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Gerät konnte nicht angelegt werden");
      return;
    }
    setName("");
    setNewKey(payload.apiKey);
    await loadDevices();
  }

  async function rotateDevice(id: string) {
    if (!window.confirm("Den bisherigen API-Schlüssel sofort ungültig machen?")) return;
    const response = await fetch(`/api/devices/${id}/rotate`, { method: "POST" });
    const payload = await response.json();
    if (response.ok) setNewKey(payload.apiKey);
    else setError(payload.error || "Schlüssel konnte nicht rotiert werden");
    await loadDevices();
  }

  async function revokeDevice(id: string) {
    if (!window.confirm("Dieses Gerät wirklich widerrufen?")) return;
    const response = await fetch(`/api/devices/${id}`, { method: "DELETE" });
    if (!response.ok) setError("Gerät konnte nicht widerrufen werden");
    await loadDevices();
  }

  return (
    <div className="space-y-6">
      <form onSubmit={createDevice} className="rounded-lg border bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold">Neues Gerät</h2>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input required maxLength={80} value={name} onChange={(event) => setName(event.target.value)} className="input flex-1" placeholder="Küchenstation" />
          <button className="button-primary" type="submit">API-Schlüssel erzeugen</button>
        </div>
      </form>

      {newKey && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <strong>API-Schlüssel jetzt kopieren:</strong>
          <code className="mt-2 block break-all rounded bg-white p-2">{newKey}</code>
          <p className="mt-2">Der vollständige Schlüssel wird später nicht erneut angezeigt.</p>
        </div>
      )}
      {error && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="space-y-3">
        {devices.map((device) => (
          <div key={device.id} className="flex flex-col gap-3 rounded-lg border bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-semibold">{device.name}</h3>
              <p className="text-sm text-gray-500">{device.keyPrefix}… · zuletzt verwendet: {device.lastUsedAt ? new Date(device.lastUsedAt).toLocaleString() : "noch nicht"}</p>
              {device.revokedAt && <p className="text-sm font-medium text-red-600">Widerrufen</p>}
            </div>
            {!device.revokedAt && (
              <div className="flex gap-2">
                <button type="button" className="button-secondary" onClick={() => rotateDevice(device.id)}>Schlüssel rotieren</button>
                <button type="button" className="button-danger" onClick={() => revokeDevice(device.id)}>Widerrufen</button>
              </div>
            )}
          </div>
        ))}
        {devices.length === 0 && <p className="rounded-lg border border-dashed p-6 text-center text-gray-500">Noch kein Gerät registriert.</p>}
      </div>
    </div>
  );
}
