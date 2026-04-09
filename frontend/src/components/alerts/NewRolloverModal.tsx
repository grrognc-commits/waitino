import { useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import api from "@/services/api";

const REASON_OPTIONS = [
  { value: "not_accepted", label: "Neprihvaćeno" },
  { value: "late_arrival", label: "Kasni dolazak" },
  { value: "dc_closed", label: "DC zatvoren" },
  { value: "other", label: "Ostalo" },
];

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

export function NewRolloverModal({ onClose, onCreated }: Props) {
  const [checkinId, setCheckinId] = useState("");
  const [reason, setReason] = useState("not_accepted");
  const [rescheduledDate, setRescheduledDate] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!checkinId || !rescheduledDate) {
      setError("Check-in ID i datum su obavezni");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await api.post("/rollovers", {
        checkin_id: parseInt(checkinId, 10),
        reason,
        rescheduled_date: rescheduledDate,
        notes: notes || undefined,
      });
      onCreated();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Greška pri kreiranju";
      // Try to extract API error message
      const axiosErr = err as { response?: { data?: { error?: string } } };
      setError(axiosErr.response?.data?.error ?? msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/30" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="w-full max-w-md rounded-xl border border-gray-200 bg-white shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Novi rollover
            </h3>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X size={18} />
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 p-6">
            {error && (
              <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="checkinId">Check-in ID</Label>
              <Input
                id="checkinId"
                type="number"
                placeholder="ID aktivnog check-ina"
                value={checkinId}
                onChange={(e) => setCheckinId(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Razlog</Label>
              <select
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-[#1e3a5f] focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/40"
              >
                {REASON_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rescheduledDate">Novi datum</Label>
              <Input
                id="rescheduledDate"
                type="date"
                value={rescheduledDate}
                onChange={(e) => setRescheduledDate(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Napomena (opcionalno)</Label>
              <Input
                id="notes"
                placeholder="Dodatne napomene..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Odustani
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Kreiranje..." : "Kreiraj rollover"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
