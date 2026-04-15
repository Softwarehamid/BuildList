import { useState } from "react";
import { Pencil, Check, X, Car } from "lucide-react";
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
  const boughtCount = allMods.filter((mod) => mod.status === "bought").length;
  const installedCount = allMods.filter(
    (mod) => mod.status === "installed",
  ).length;
  const spentValue = allMods
    .filter((mod) => mod.status === "bought" || mod.status === "installed")
    .reduce((sum, mod) => sum + calcTotal(mod.price_min, mod.price_max).low, 0);
  const plannedValue = allMods.reduce(
    (sum, mod) => sum + calcTotal(mod.price_min, mod.price_max).low,
    0,
  );
  const installedProgress =
    totalParts > 0 ? Math.round((installedCount / totalParts) * 100) : 0;

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

        <div className="mt-6 pt-5 border-t border-[#1a1a1a] space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-lg border border-[#262626] bg-[#121212] px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-widest text-gray-500">
                Total Parts
              </p>
              <p className="text-lg font-black text-white">{totalParts}</p>
            </div>
            <div className="rounded-lg border border-amber-900/40 bg-amber-900/10 px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-widest text-amber-300/70">
                Bought
              </p>
              <p className="text-lg font-black text-amber-300">{boughtCount}</p>
            </div>
            <div className="rounded-lg border border-emerald-900/40 bg-emerald-900/10 px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-widest text-emerald-300/70">
                Installed
              </p>
              <p className="text-lg font-black text-emerald-300">
                {installedCount}
              </p>
            </div>
            <div className="rounded-lg border border-[#262626] bg-[#121212] px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-widest text-gray-500">
                Spent / Planned
              </p>
              <p className="text-sm md:text-base font-black text-white">
                {fmt(spentValue)} / {fmt(plannedValue)}
              </p>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <p className="text-gray-400">Installed Progress</p>
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
        </div>
      </div>
    </div>
  );
}
