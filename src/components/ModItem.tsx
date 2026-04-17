import { useEffect, useState } from "react";
import { ExternalLink, Pencil, Trash2, X, Check } from "lucide-react";
import type { Mod, ModStatus } from "../types/database";
import { formatPrice } from "../lib/utils";

interface Props {
  mod: Mod;
  onUpdate: (id: string, updates: Partial<Mod>) => void;
  onDelete: (id: string) => void;
}

function stripStatusMarker(notes: string | null): string {
  if (!notes) return "";

  return notes
    .replace(
      /(^|\n)\s*status:\s*(planned|bought|onHand|installed)\b\s*\n?/gi,
      "$1",
    )
    .replace(/\b#(WAIT|BATCH|HOLD)\b\s*/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractTag(notes: string | null): string | null {
  if (!notes) return null;
  const match = notes.match(/\b#(WAIT|BATCH|HOLD)\b/i);
  return match ? match[1].toUpperCase() : null;
}

function appendTag(notes: string | null, tag: string | null): string | null {
  let cleaned = stripStatusMarker(notes);
  if (!tag) return cleaned || null;
  return cleaned ? `#${tag}\n${cleaned}` : `#${tag}`;
}

export function ModItem({ mod, onUpdate, onDelete }: Props) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(mod.name);
  const [priceMin, setPriceMin] = useState(mod.price_min?.toString() ?? "");
  const [priceMax, setPriceMax] = useState(mod.price_max?.toString() ?? "");
  const [url, setUrl] = useState(mod.url ?? "");
  const [status, setStatus] = useState<ModStatus>(mod.status ?? "planned");
  const [notes, setNotes] = useState(stripStatusMarker(mod.notes));
  const [tag, setTag] = useState<string | null>(extractTag(mod.notes));

  const statusOrder: ModStatus[] = ["planned", "onHand", "installed"];

  const getNextStatus = (value: ModStatus): ModStatus => {
    const index = statusOrder.indexOf(value);
    return statusOrder[(index + 1) % statusOrder.length];
  };

  const getStatusClasses = (value: ModStatus): string => {
    if (value === "installed") {
      return "text-emerald-300 bg-emerald-900/30 border-emerald-700/60";
    }
    if (value === "onHand") {
      return "text-amber-300 bg-amber-900/30 border-amber-700/60";
    }
    return "text-sky-300 bg-sky-900/30 border-sky-700/60";
  };

  const getStatusIndicator = (value: ModStatus): string => {
    if (value === "installed") return "INS";
    if (value === "onHand") return "BUY";
    return "PLN";
  };

  const save = () => {
    const cleanedNotes = stripStatusMarker(notes);
    const finalNotes = appendTag(cleanedNotes, tag);

    onUpdate(mod.id, {
      name,
      price_min: priceMin ? parseFloat(priceMin) : null,
      price_max: priceMax ? parseFloat(priceMax) : null,
      url: url || null,
      status,
      notes: finalNotes,
    });
    setEditing(false);
  };

  const cancel = () => {
    setName(mod.name);
    setPriceMin(mod.price_min?.toString() ?? "");
    setPriceMax(mod.price_max?.toString() ?? "");
    setUrl(mod.url ?? "");
    setStatus(mod.status ?? "planned");
    setNotes(stripStatusMarker(mod.notes));
    setTag(extractTag(mod.notes));
    setEditing(false);
  };

  useEffect(() => {
    if (editing) return;
    setName(mod.name);
    setPriceMin(mod.price_min?.toString() ?? "");
    setPriceMax(mod.price_max?.toString() ?? "");
    setUrl(mod.url ?? "");
    setStatus(mod.status ?? "planned");
    setNotes(stripStatusMarker(mod.notes));
    setTag(extractTag(mod.notes));
  }, [mod, editing]);

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
          <option value="onHand">On Hand</option>
          <option value="installed">Installed</option>
        </select>
        <div>
          <label className="text-[10px] uppercase tracking-widest text-gray-500 font-medium mb-1.5 block">
            Tag (optional)
          </label>
          <div className="flex gap-2">
            {["WAIT", "BATCH", "HOLD"].map((t) => (
              <button
                key={t}
                onClick={() => setTag(tag === t ? null : t)}
                className={`flex-1 text-xs font-semibold px-2 py-1.5 rounded-md border transition-colors ${
                  tag === t
                    ? t === "WAIT"
                      ? "border-orange-500 bg-orange-900/30 text-orange-300"
                      : t === "BATCH"
                        ? "border-purple-500 bg-purple-900/30 text-purple-300"
                        : "border-red-500 bg-red-900/30 text-red-300"
                    : "border-[#333] bg-[#0f0f0f] text-gray-400 hover:border-gray-600"
                }`}
              >
                #{t}
              </button>
            ))}
          </div>
        </div>
        <textarea
          className="w-full min-h-20 bg-[#0f0f0f] border border-[#333] text-white text-sm rounded-md px-3 py-2 focus:outline-none focus:border-red-600"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes (optional): waiting for sale, shop installed, supporting mod needed..."
        />
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

  const modTag = extractTag(mod.notes);

  const getTagBadge = (t: string | null) => {
    const baseBadge = "text-[10px] font-semibold px-2 py-1 rounded border";
    if (t === "WAIT")
      return `${baseBadge} border-orange-500/60 bg-orange-900/20 text-orange-300`;
    if (t === "BATCH")
      return `${baseBadge} border-purple-500/60 bg-purple-900/20 text-purple-300`;
    if (t === "HOLD")
      return `${baseBadge} border-red-500/60 bg-red-900/20 text-red-300`;
    return "";
  };

  return (
    <div className="group flex items-center justify-between gap-3 py-2.5 px-3 rounded-lg border border-transparent hover:border-[#2a2a2a] hover:bg-[#181818] hover:shadow-[0_6px_24px_rgba(0,0,0,0.22)] hover:-translate-y-[1px] transition-all">
      <div className="flex items-start gap-3 min-w-0">
        <div className="w-1 h-1 rounded-full bg-gray-600 flex-shrink-0" />
        <span className="text-gray-200 text-sm truncate block">{mod.name}</span>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={cycleStatus}
          className={`w-12 text-[10px] uppercase tracking-wide font-semibold text-center px-1.5 py-1 rounded-full border transition-all active:scale-95 ${getStatusClasses(mod.status ?? "planned")}`}
          title="Cycle status: Planned -> On Hand -> Installed"
        >
          {getStatusIndicator(mod.status ?? "planned")}
        </button>
        {modTag && (
          <span className={getTagBadge(modTag)} title={`Tagged: ${modTag}`}>
            #{modTag}
          </span>
        )}
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
