import { useState } from "react";
import { ExternalLink, Pencil, Trash2, X, Check } from "lucide-react";
import type { Mod, ModStatus } from "../types/database";
import { formatPrice } from "../lib/utils";

interface Props {
  mod: Mod;
  onUpdate: (id: string, updates: Partial<Mod>) => void;
  onDelete: (id: string) => void;
}

export function ModItem({ mod, onUpdate, onDelete }: Props) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(mod.name);
  const [priceMin, setPriceMin] = useState(mod.price_min?.toString() ?? "");
  const [priceMax, setPriceMax] = useState(mod.price_max?.toString() ?? "");
  const [url, setUrl] = useState(mod.url ?? "");
  const [status, setStatus] = useState<ModStatus>(mod.status ?? "planned");

  const statusOrder: ModStatus[] = ["planned", "bought", "installed"];

  const getNextStatus = (value: ModStatus): ModStatus => {
    const index = statusOrder.indexOf(value);
    return statusOrder[(index + 1) % statusOrder.length];
  };

  const getStatusClasses = (value: ModStatus): string => {
    if (value === "installed") {
      return "text-emerald-300 bg-emerald-900/30 border-emerald-700/60";
    }
    if (value === "bought") {
      return "text-amber-300 bg-amber-900/30 border-amber-700/60";
    }
    return "text-sky-300 bg-sky-900/30 border-sky-700/60";
  };

  const getStatusLabel = (value: ModStatus): string => {
    if (value === "installed") return "Installed";
    if (value === "bought") return "Bought";
    return "Planned";
  };

  const save = () => {
    onUpdate(mod.id, {
      name,
      price_min: priceMin ? parseFloat(priceMin) : null,
      price_max: priceMax ? parseFloat(priceMax) : null,
      url: url || null,
      status,
    });
    setEditing(false);
  };

  const cancel = () => {
    setName(mod.name);
    setPriceMin(mod.price_min?.toString() ?? "");
    setPriceMax(mod.price_max?.toString() ?? "");
    setUrl(mod.url ?? "");
    setStatus(mod.status ?? "planned");
    setEditing(false);
  };

  const cycleStatus = () => {
    const next = getNextStatus(mod.status ?? "planned");
    onUpdate(mod.id, { status: next });
  };

  if (editing) {
    return (
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-3 space-y-2">
        <input
          className="w-full bg-[#0f0f0f] border border-[#333] text-white text-sm rounded-md px-3 py-2 focus:outline-none focus:border-red-600"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Part name"
        />
        <div className="flex gap-2">
          <input
            className="w-full bg-[#0f0f0f] border border-[#333] text-white text-sm rounded-md px-3 py-2 focus:outline-none focus:border-red-600"
            value={priceMin}
            onChange={(e) => setPriceMin(e.target.value)}
            placeholder="Price (or min)"
            type="number"
          />
          <input
            className="w-full bg-[#0f0f0f] border border-[#333] text-white text-sm rounded-md px-3 py-2 focus:outline-none focus:border-red-600"
            value={priceMax}
            onChange={(e) => setPriceMax(e.target.value)}
            placeholder="Max price (optional)"
            type="number"
          />
        </div>
        <input
          className="w-full bg-[#0f0f0f] border border-[#333] text-white text-sm rounded-md px-3 py-2 focus:outline-none focus:border-red-600"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Purchase URL (optional)"
        />
        <select
          className="w-full bg-[#0f0f0f] border border-[#333] text-white text-sm rounded-md px-3 py-2 focus:outline-none focus:border-red-600"
          value={status}
          onChange={(e) => setStatus(e.target.value as ModStatus)}
        >
          <option value="planned">Planned</option>
          <option value="bought">Bought</option>
          <option value="installed">Installed</option>
        </select>
        <div className="flex gap-2 justify-end">
          <button
            onClick={cancel}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-white px-3 py-1.5 rounded-md border border-[#333] hover:border-[#555] transition-colors"
          >
            <X size={12} /> Cancel
          </button>
          <button
            onClick={save}
            className="flex items-center gap-1 text-xs text-white bg-red-700 hover:bg-red-600 px-3 py-1.5 rounded-md transition-colors"
          >
            <Check size={12} /> Save
          </button>
        </div>
      </div>
    );
  }

  const isRange =
    mod.price_min !== null &&
    mod.price_max !== null &&
    mod.price_min !== mod.price_max;

  return (
    <div className="group flex items-center justify-between gap-3 py-2.5 px-3 rounded-lg hover:bg-white/[0.03] transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-1 h-1 rounded-full bg-gray-600 flex-shrink-0" />
        <span className="text-gray-300 text-sm truncate">{mod.name}</span>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={cycleStatus}
          className={`text-[10px] uppercase tracking-wide font-semibold px-2 py-1 rounded-full border transition-all active:scale-95 ${getStatusClasses(mod.status ?? "planned")}`}
          title="Cycle status: Planned -> Bought -> Installed"
        >
          {getStatusLabel(mod.status ?? "planned")}
        </button>
        <span
          className={`text-sm font-medium tabular-nums ${mod.price_min === null && mod.price_max === null ? "text-gray-500 italic" : isRange ? "text-amber-400" : "text-green-400"}`}
        >
          {formatPrice(mod.price_min, mod.price_max)}
        </span>
        {mod.url && (
          <a
            href={mod.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-500 hover:text-red-400 transition-colors"
            title="View product"
          >
            <ExternalLink size={13} />
          </a>
        )}
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => setEditing(true)}
            className="text-gray-600 hover:text-gray-300 transition-colors p-0.5"
          >
            <Pencil size={12} />
          </button>
          <button
            onClick={() => onDelete(mod.id)}
            className="text-gray-600 hover:text-red-400 transition-colors p-0.5"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}
