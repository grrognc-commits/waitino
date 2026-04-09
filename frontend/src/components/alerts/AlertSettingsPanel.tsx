import type { AlertSettings } from "@/types/alerts";

interface Props {
  settings: AlertSettings;
  onChange: (settings: AlertSettings) => void;
}

export function AlertSettingsPanel({ settings, onChange }: Props) {
  function update(partial: Partial<AlertSettings>) {
    onChange({ ...settings, ...partial });
  }

  return (
    <div className="space-y-6">
      {/* Long wait threshold */}
      <div>
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">
            Prag za "dugo čekanje"
          </label>
          <span className="text-sm font-semibold text-gray-900">
            {settings.longWaitThreshold} min
          </span>
        </div>
        <input
          type="range"
          min={30}
          max={300}
          step={15}
          value={settings.longWaitThreshold}
          onChange={(e) =>
            update({ longWaitThreshold: parseInt(e.target.value, 10) })
          }
          className="mt-2 w-full accent-[#1e3a5f]"
        />
        <div className="mt-1 flex justify-between text-xs text-gray-400">
          <span>30 min</span>
          <span>300 min</span>
        </div>
      </div>

      {/* Driver stuck threshold */}
      <div>
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">
            Prag za "vozač zaglavljen"
          </label>
          <span className="text-sm font-semibold text-gray-900">
            {settings.driverStuckThreshold} min
          </span>
        </div>
        <input
          type="range"
          min={60}
          max={480}
          step={15}
          value={settings.driverStuckThreshold}
          onChange={(e) =>
            update({ driverStuckThreshold: parseInt(e.target.value, 10) })
          }
          className="mt-2 w-full accent-[#1e3a5f]"
        />
        <div className="mt-1 flex justify-between text-xs text-gray-400">
          <span>60 min</span>
          <span>480 min</span>
        </div>
      </div>

      {/* Push notifications toggle */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-700">
            Push obavijesti
          </p>
          <p className="text-xs text-gray-400">
            Primajte obavijesti u pregledniku
          </p>
        </div>
        <button
          onClick={() =>
            update({ pushNotifications: !settings.pushNotifications })
          }
          className={`relative h-6 w-11 rounded-full transition-colors ${
            settings.pushNotifications ? "bg-[#1e3a5f]" : "bg-gray-300"
          }`}
        >
          <span
            className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
              settings.pushNotifications ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      {/* Email digest */}
      <div>
        <p className="text-sm font-medium text-gray-700">Email sažetak</p>
        <p className="mb-2 text-xs text-gray-400">
          Primajte sažetak upozorenja emailom
        </p>
        <div className="flex rounded-lg border border-gray-300 overflow-hidden">
          {(
            [
              { value: "daily", label: "Dnevno" },
              { value: "weekly", label: "Tjedno" },
              { value: "off", label: "Isključeno" },
            ] as const
          ).map((opt) => (
            <button
              key={opt.value}
              onClick={() => update({ emailDigest: opt.value })}
              className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                settings.emailDigest === opt.value
                  ? "bg-[#1e3a5f] text-white"
                  : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
