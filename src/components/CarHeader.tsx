import { useState } from "react";
import { Pencil, Check, X, Car, ChevronRight } from "lucide-react";
import type { CarWithCategories } from "../types/database";
import { calcTotal } from "../lib/utils";

interface Props {
  car: CarWithCategories;
  onUpdate: (updates: Partial<CarWithCategories>) => void;
}

function PriceField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState(value?.toString() ?? "");

  const fmt = (n: number | null) =>
    n != null
      ? n.toLocaleString("en-US", {
          style: "currency",
          currency: "USD",
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        })
      : "—";

  const save = () => {
    onChange(input ? parseFloat(input) : null);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex flex-col gap-1">
        <span className="text-[10px] uppercase tracking-widest text-gray-500 font-medium">
          {label}
        </span>
        <div className="flex items-center gap-1">
          <span className="text-gray-400 text-sm">$</span>
          <input
            className="bg-transparent border-b border-red-600 text-white text-lg font-bold w-28 focus:outline-none"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            type="number"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
              if (e.key === "Escape") setEditing(false);
            }}
          />
          <button onClick={save} className="text-green-500 ml-1">
            <Check size={13} />
          </button>
          <button onClick={() => setEditing(false)} className="text-gray-500">
            <X size={13} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col gap-1 cursor-pointer group"
      onClick={() => {
        setInput(value?.toString() ?? "");
        setEditing(true);
      }}
    >
      <span className="text-[10px] uppercase tracking-widest text-gray-500 font-medium">
        {label}
      </span>
      <div className="flex items-center gap-1.5">
        <span className="text-white text-lg font-bold">{fmt(value)}</span>
        <Pencil
          size={11}
          className="text-gray-700 group-hover:text-gray-400 transition-colors"
        />
      </div>
    </div>
  );
}

export function CarHeader({ car, onUpdate }: Props) {
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(car.name);

  const allMods = car.categories.flatMap((cat) => cat.mods);

  const totalLow = car.categories.reduce(
    (sum, cat) =>
      sum +
      cat.mods.reduce((s, m) => s + calcTotal(m.price_min, m.price_max).low, 0),
    0,
  );
  const totalHigh = car.categories.reduce(
    (sum, cat) =>
      sum +
      cat.mods.reduce(
        (s, m) => s + calcTotal(m.price_min, m.price_max).high,
        0,
      ),
    0,
  );

  const fmtRange = (lo: number, hi: number) => {
    const fmt = (n: number) =>
      n.toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      });
    return lo === hi ? fmt(lo) : `${fmt(lo)} – ${fmt(hi)}`;
  };

  const saveName = () => {
    onUpdate({ name: nameInput });
    setEditingName(false);
  };

  const totalParts = allMods.length;
  const onHandCount = allMods.filter((mod) => mod.status === "onHand").length;
  const installedCount = allMods.filter(
    (mod) => mod.status === "installed",
  ).length;
  const spentValue = allMods
    .filter((mod) => mod.status === "onHand" || mod.status === "installed")
    .reduce((sum, mod) => sum + calcTotal(mod.price_min, mod.price_max).low, 0);
  const plannedValue = allMods.reduce(
    (sum, mod) => sum + calcTotal(mod.price_min, mod.price_max).low,
    0,
  );
  const remainingValue = plannedValue - spentValue;
  const budgetUsedPercent =
    plannedValue > 0 ? Math.round((spentValue / plannedValue) * 100) : 0;
  const installedProgress =
    totalParts > 0 ? Math.round((installedCount / totalParts) * 100) : 0;

  const nextUpMods = allMods
    .filter((mod) => mod.status === "onHand")
    .sort((a, b) => (a.notes ?? "").localeCompare(b.notes ?? ""))
    .slice(0, 5);

  const fmt = (n: number) =>
    n.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[#1e1e1e] bg-[#0d0d0d]">
      <div className="absolute inset-0 bg-gradient-to-br from-red-950/20 via-transparent to-transparent pointer-events-none" />
      <div className="relative p-6 md:p-8">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Car size={14} className="text-red-500" />
              <span className="text-[10px] uppercase tracking-widest text-red-500 font-semibold">
                Dream Build
              </span>
            </div>
            {editingName ? (
              <div className="flex items-center gap-2 mt-1">
                <input
                  className="bg-transparent border-b-2 border-red-600 text-white text-2xl md:text-3xl font-black focus:outline-none w-72"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveName();
                    if (e.key === "Escape") setEditingName(false);
                  }}
                  autoFocus
                />
                <button onClick={saveName} className="text-green-500">
                  <Check size={16} />
                </button>
                <button
                  onClick={() => setEditingName(false)}
                  className="text-gray-500"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <h1
                className="text-2xl md:text-3xl font-black text-white cursor-pointer group flex items-center gap-2 mt-1"
                onClick={() => {
                  setNameInput(car.name);
                  setEditingName(true);
                }}
              >
                {car.name}
                <Pencil
                  size={14}
                  className="text-gray-700 group-hover:text-gray-400 transition-colors"
                />
              </h1>
            )}
            <p className="text-gray-600 text-xs mt-1.5">
              {totalParts} parts across {car.categories.length} categories
            </p>
            <div className="flex items-center gap-1.5 mt-2">
              <div className="flex items-center gap-1 text-[10px]">
                <span className="text-sky-400 font-semibold">Planned</span>
                <ChevronRight size={12} className="text-gray-600" />
                <span className="text-amber-400 font-semibold">On Hand</span>
                <ChevronRight size={12} className="text-gray-600" />
                <span className="text-emerald-400 font-semibold">
                  Installed
                </span>
              </div>
            </div>
          </div>

          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-5 py-3 text-right">
            <p className="text-[10px] uppercase tracking-widest text-gray-500 font-medium mb-0.5">
              Est. Mods Total
            </p>
            <p className="text-xl font-black text-white">
              {fmtRange(totalLow, totalHigh)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mt-6 pt-6 border-t border-[#1a1a1a]">
          <PriceField
            label="Base Price"
            value={car.base_price}
            onChange={(v) => onUpdate({ base_price: v })}
          />
          <PriceField
            label="Out-the-Door"
            value={car.out_the_door_price}
            onChange={(v) => onUpdate({ out_the_door_price: v })}
          />
          <PriceField
            label="Down Payment"
            value={car.down_payment}
            onChange={(v) => onUpdate({ down_payment: v })}
          />
        </div>

        <div className="mt-6 pt-5 border-t border-[#1a1a1a] space-y-5">
          {/* Money Stats (Primary Focus) */}
          <div className="bg-gradient-to-br from-red-900/20 to-orange-900/10 border border-red-900/40 rounded-xl p-4">
            <p className="text-[10px] uppercase tracking-widest text-red-400/70 font-semibold mb-3">
              Build Budget
            </p>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Spent</p>
                <p className="text-2xl font-black text-red-400">
                  {fmt(spentValue)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Planned</p>
                <p className="text-2xl font-black text-white">
                  {fmt(plannedValue)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Remaining</p>
                <p
                  className={`text-2xl font-black ${remainingValue > 0 ? "text-green-400" : "text-red-400"}`}
                >
                  {fmt(remainingValue)}
                </p>
              </div>
            </div>
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <p className="text-gray-400">Budget Used</p>
                <p className="text-gray-300 font-semibold">
                  {budgetUsedPercent}%
                </p>
              </div>
              <div className="h-2.5 rounded-full bg-[#1a1a1a] overflow-hidden border border-red-900/30">
                <div
                  className={`h-full transition-all duration-300 ${
                    budgetUsedPercent <= 80
                      ? "bg-gradient-to-r from-green-500 to-emerald-400"
                      : budgetUsedPercent <= 95
                        ? "bg-gradient-to-r from-yellow-500 to-amber-400"
                        : "bg-gradient-to-r from-red-500 to-orange-400"
                  }`}
                  style={{ width: `${budgetUsedPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Part Status Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="rounded-lg border border-[#262626] bg-[#121212] px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-widest text-gray-500">
                Total Parts
              </p>
              <p className="text-lg font-black text-white">{totalParts}</p>
            </div>
            <div className="rounded-lg border border-amber-900/40 bg-amber-900/10 px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-widest text-amber-300/70">
                On Hand
              </p>
              <p className="text-lg font-black text-amber-300">{onHandCount}</p>
            </div>
            <div className="rounded-lg border border-emerald-900/40 bg-emerald-900/10 px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-widest text-emerald-300/70">
                Installed
              </p>
              <p className="text-lg font-black text-emerald-300">
                {installedCount}
              </p>
            </div>
          </div>

          {/* Install Progress */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <p className="text-gray-400">Install Progress</p>
              <p className="text-gray-300 font-semibold">
                {installedCount}/{totalParts || 0} ({installedProgress}%)
              </p>
            </div>
            <div className="h-2 rounded-full bg-[#1a1a1a] overflow-hidden border border-[#242424]">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-green-400 transition-all duration-300"
                style={{ width: `${installedProgress}%` }}
              />
            </div>
          </div>

          {/* Next Up Section */}
          {nextUpMods.length > 0 && (
            <div className="bg-gradient-to-br from-blue-900/20 to-indigo-900/10 border border-blue-900/40 rounded-xl p-3">
              <p className="text-[10px] uppercase tracking-widest text-blue-400/70 font-semibold mb-2">
                🎯 Next Up (Awaiting Install)
              </p>
              <div className="space-y-1.5">
                {nextUpMods.map((mod) => (
                  <div key={mod.id} className="flex items-start gap-2 text-xs">
                    <div className="w-1 h-1 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />
                    <div className="min-w-0">
                      <p className="text-gray-200 truncate">{mod.name}</p>
                      {mod.notes && (
                        <p className="text-gray-500 text-[11px] italic line-clamp-1">
                          {mod.notes}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {onHandCount > 5 && (
                <p className="text-[10px] text-gray-500 mt-2 pt-2 border-t border-blue-900/30">
                  +{onHandCount - 5} more waiting...
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
