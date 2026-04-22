import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import type { CategoryWithMods, Mod } from "../types/database";
import { ModItem } from "./ModItem";
import { formatPrice, calcTotal } from "../lib/utils";

interface Props {
  category: CategoryWithMods;
  displayName?: string;
  statusFilter?: string[];
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  onMoveMod: (
    categoryId: string,
    modId: string,
    direction: "up" | "down",
  ) => void;
  onReorderMods: (
    categoryId: string,
    draggedId: string,
    targetId: string,
  ) => void;
  onUpdateCategory: (id: string, name: string) => void;
  onDeleteCategory: (id: string) => void;
  onAddMod: (mod: Omit<Mod, "id" | "created_at" | "display_order">) => void;
  onUpdateMod: (id: string, updates: Partial<Mod>) => void;
  onDeleteMod: (id: string) => void;
}

interface AddModForm {
  name: string;
  priceMin: string;
  priceMax: string;
  url: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  Labor: "#ef4444",
  Upgrades: "#f59e0b",
  Power: "#3b82f6",
  Interior: "#10b981",
};

function getCategoryColor(name: string): string {
  for (const key of Object.keys(CATEGORY_COLORS)) {
    if (name.toLowerCase().includes(key.toLowerCase()))
      return CATEGORY_COLORS[key];
  }
  return "#6366f1";
}

export function CategorySection({
  category,
  displayName,
  statusFilter = ["planned", "onHand", "installed"],
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  onMoveMod,
  onReorderMods,
  onUpdateCategory,
  onDeleteCategory,
  onAddMod,
  onUpdateMod,
  onDeleteMod,
}: Props) {
  const [open, setOpen] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(category.name);
  const [addingMod, setAddingMod] = useState(false);
  const [draggingModId, setDraggingModId] = useState<string | null>(null);
  const [form, setForm] = useState<AddModForm>({
    name: "",
    priceMin: "",
    priceMax: "",
    url: "",
  });

  const color = getCategoryColor(category.name);

  const totalLow = category.mods.reduce(
    (sum, m) => sum + calcTotal(m.price_min, m.price_max).low,
    0,
  );
  const totalHigh = category.mods.reduce(
    (sum, m) => sum + calcTotal(m.price_min, m.price_max).high,
    0,
  );
  const categoryTotal = formatPrice(
    totalLow,
    totalHigh === totalLow ? totalLow : totalHigh,
  );

  const statusOrder = ["planned", "onHand", "installed"];
  const sortedMods = [...category.mods]
    .filter((mod) => statusFilter.includes(mod.status ?? "planned"))
    .sort((a, b) => {
      const orderA = a.display_order ?? Number.MAX_SAFE_INTEGER;
      const orderB = b.display_order ?? Number.MAX_SAFE_INTEGER;
      if (orderA !== orderB) return orderA - orderB;

      const aIndex = statusOrder.indexOf(a.status ?? "planned");
      const bIndex = statusOrder.indexOf(b.status ?? "planned");
      return aIndex - bIndex;
    });

  const saveName = () => {
    onUpdateCategory(category.id, nameInput);
    setEditingName(false);
  };

  const submitMod = () => {
    if (!form.name.trim()) return;
    onAddMod({
      category_id: category.id,
      name: form.name.trim(),
      price_min: form.priceMin ? parseFloat(form.priceMin) : null,
      price_max: form.priceMax ? parseFloat(form.priceMax) : null,
      url: form.url || null,
      status: "planned",
      notes: null,
    });
    setForm({ name: "", priceMin: "", priceMax: "", url: "" });
    setAddingMod(false);
  };

  return (
    <div className="bg-[#111111] border border-[#1e1e1e] rounded-xl overflow-hidden">
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-white/[0.02] transition-colors select-none"
        onClick={() => setOpen((o) => !o)}
      >
        <div
          className="w-[3px] h-5 rounded-full flex-shrink-0"
          style={{ backgroundColor: color }}
        />
        {editingName ? (
          <input
            className="flex-1 bg-transparent border-b border-[#444] text-white text-sm font-semibold focus:outline-none focus:border-red-600"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Enter") saveName();
              if (e.key === "Escape") setEditingName(false);
            }}
            autoFocus
          />
        ) : (
          <span className="flex-1 text-white font-semibold text-sm tracking-wide">
            {displayName ?? category.name}
          </span>
        )}

        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs font-mono text-gray-400">
            {categoryTotal}
          </span>
          {editingName ? (
            <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setEditingName(false)}
                className="text-gray-500 hover:text-gray-300 p-0.5"
              >
                <X size={13} />
              </button>
              <button
                onClick={saveName}
                className="text-green-500 hover:text-green-400 p-0.5"
              >
                <Check size={13} />
              </button>
            </div>
          ) : (
            <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveUp(category.id);
                }}
                className="text-gray-600 hover:text-gray-300 transition-colors p-0.5 disabled:opacity-30 disabled:cursor-not-allowed"
                disabled={!canMoveUp}
                aria-label="Move category up"
              >
                <ArrowUp size={12} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveDown(category.id);
                }}
                className="text-gray-600 hover:text-gray-300 transition-colors p-0.5 disabled:opacity-30 disabled:cursor-not-allowed"
                disabled={!canMoveDown}
                aria-label="Move category down"
              >
                <ArrowDown size={12} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingName(true);
                }}
                className="text-gray-600 hover:text-gray-400 transition-colors p-0.5"
              >
                <Pencil size={12} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteCategory(category.id);
                }}
                className="text-gray-600 hover:text-red-400 transition-colors p-0.5"
              >
                <Trash2 size={12} />
              </button>
            </div>
          )}
          {open ? (
            <ChevronDown size={15} className="text-gray-500" />
          ) : (
            <ChevronRight size={15} className="text-gray-500" />
          )}
        </div>
      </div>

      {open && (
        <div className="border-t border-[#1a1a1a] px-2 py-1">
          {category.mods.length === 0 && !addingMod && (
            <p className="text-gray-600 text-xs text-center py-3 italic">
              No parts yet
            </p>
          )}
          {sortedMods.map((mod, index) => (
            <div
              key={mod.id}
              draggable
              onDragStart={() => setDraggingModId(mod.id)}
              onDragEnd={() => setDraggingModId(null)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (draggingModId && draggingModId !== mod.id) {
                  onReorderMods(category.id, draggingModId, mod.id);
                }
              }}
              className={`flex items-center gap-1 cursor-grab active:cursor-grabbing ${draggingModId === mod.id ? "opacity-60" : "opacity-100"}`}
            >
              <div className="flex flex-col gap-0.5">
                <button
                  onClick={() => onMoveMod(category.id, mod.id, "up")}
                  className="text-gray-600 hover:text-gray-300 transition-colors p-0.5 disabled:opacity-30 disabled:cursor-not-allowed"
                  disabled={index === 0}
                  aria-label="Move part up"
                >
                  <ArrowUp size={11} />
                </button>
                <button
                  onClick={() => onMoveMod(category.id, mod.id, "down")}
                  className="text-gray-600 hover:text-gray-300 transition-colors p-0.5 disabled:opacity-30 disabled:cursor-not-allowed"
                  disabled={index === sortedMods.length - 1}
                  aria-label="Move part down"
                >
                  <ArrowDown size={11} />
                </button>
              </div>
              <div className="flex-1">
                <ModItem
                  mod={mod}
                  onUpdate={onUpdateMod}
                  onDelete={onDeleteMod}
                />
              </div>
            </div>
          ))}

          {addingMod && (
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-3 mt-2 space-y-2">
              <input
                className="w-full bg-[#0f0f0f] border border-[#333] text-white text-sm rounded-md px-3 py-2 focus:outline-none focus:border-red-600"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="Part name *"
                autoFocus
              />
              <div className="flex gap-2">
                <input
                  className="w-full bg-[#0f0f0f] border border-[#333] text-white text-sm rounded-md px-3 py-2 focus:outline-none focus:border-red-600"
                  value={form.priceMin}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, priceMin: e.target.value }))
                  }
                  placeholder="Price (or min)"
                  type="number"
                />
                <input
                  className="w-full bg-[#0f0f0f] border border-[#333] text-white text-sm rounded-md px-3 py-2 focus:outline-none focus:border-red-600"
                  value={form.priceMax}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, priceMax: e.target.value }))
                  }
                  placeholder="Max price (optional)"
                  type="number"
                />
              </div>
              <input
                className="w-full bg-[#0f0f0f] border border-[#333] text-white text-sm rounded-md px-3 py-2 focus:outline-none focus:border-red-600"
                value={form.url}
                onChange={(e) =>
                  setForm((f) => ({ ...f, url: e.target.value }))
                }
                placeholder="Purchase URL (optional)"
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setAddingMod(false)}
                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-white px-3 py-1.5 rounded-md border border-[#333] transition-colors"
                >
                  <X size={12} /> Cancel
                </button>
                <button
                  onClick={submitMod}
                  className="flex items-center gap-1 text-xs text-white bg-red-700 hover:bg-red-600 px-3 py-1.5 rounded-md transition-colors"
                >
                  <Check size={12} /> Add Part
                </button>
              </div>
            </div>
          )}

          <button
            onClick={() => setAddingMod(true)}
            className="w-full flex items-center justify-center gap-1.5 text-xs text-gray-600 hover:text-gray-400 py-2 mt-1 rounded-lg hover:bg-white/[0.03] transition-colors border border-transparent hover:border-[#2a2a2a]"
          >
            <Plus size={12} /> Add Part
          </button>
        </div>
      )}
    </div>
  );
}
