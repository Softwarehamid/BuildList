import { useState } from 'react';
import { Pencil, Check, X, Car } from 'lucide-react';
import type { CarWithCategories } from '../types/database';
import { calcTotal } from '../lib/utils';

interface Props {
  car: CarWithCategories;
  onUpdate: (updates: Partial<CarWithCategories>) => void;
}

function PriceField({ label, value, onChange }: { label: string; value: number | null; onChange: (v: number | null) => void }) {
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState(value?.toString() ?? '');

  const fmt = (n: number | null) => n != null ? n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }) : '—';

  const save = () => {
    onChange(input ? parseFloat(input) : null);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex flex-col gap-1">
        <span className="text-[10px] uppercase tracking-widest text-gray-500 font-medium">{label}</span>
        <div className="flex items-center gap-1">
          <span className="text-gray-400 text-sm">$</span>
          <input
            className="bg-transparent border-b border-red-600 text-white text-lg font-bold w-28 focus:outline-none"
            value={input}
            onChange={e => setInput(e.target.value)}
            type="number"
            autoFocus
            onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false); }}
          />
          <button onClick={save} className="text-green-500 ml-1"><Check size={13} /></button>
          <button onClick={() => setEditing(false)} className="text-gray-500"><X size={13} /></button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col gap-1 cursor-pointer group"
      onClick={() => { setInput(value?.toString() ?? ''); setEditing(true); }}
    >
      <span className="text-[10px] uppercase tracking-widest text-gray-500 font-medium">{label}</span>
      <div className="flex items-center gap-1.5">
        <span className="text-white text-lg font-bold">{fmt(value)}</span>
        <Pencil size={11} className="text-gray-700 group-hover:text-gray-400 transition-colors" />
      </div>
    </div>
  );
}

export function CarHeader({ car, onUpdate }: Props) {
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(car.name);

  const totalLow = car.categories.reduce((sum, cat) =>
    sum + cat.mods.reduce((s, m) => s + calcTotal(m.price_min, m.price_max).low, 0), 0);
  const totalHigh = car.categories.reduce((sum, cat) =>
    sum + cat.mods.reduce((s, m) => s + calcTotal(m.price_min, m.price_max).high, 0), 0);

  const fmtRange = (lo: number, hi: number) => {
    const fmt = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 });
    return lo === hi ? fmt(lo) : `${fmt(lo)} – ${fmt(hi)}`;
  };

  const saveName = () => {
    onUpdate({ name: nameInput });
    setEditingName(false);
  };

  const totalParts = car.categories.reduce((s, c) => s + c.mods.length, 0);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[#1e1e1e] bg-[#0d0d0d]">
      <div className="absolute inset-0 bg-gradient-to-br from-red-950/20 via-transparent to-transparent pointer-events-none" />
      <div className="relative p-6 md:p-8">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Car size={14} className="text-red-500" />
              <span className="text-[10px] uppercase tracking-widest text-red-500 font-semibold">Dream Build</span>
            </div>
            {editingName ? (
              <div className="flex items-center gap-2 mt-1">
                <input
                  className="bg-transparent border-b-2 border-red-600 text-white text-2xl md:text-3xl font-black focus:outline-none w-72"
                  value={nameInput}
                  onChange={e => setNameInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditingName(false); }}
                  autoFocus
                />
                <button onClick={saveName} className="text-green-500"><Check size={16} /></button>
                <button onClick={() => setEditingName(false)} className="text-gray-500"><X size={16} /></button>
              </div>
            ) : (
              <h1
                className="text-2xl md:text-3xl font-black text-white cursor-pointer group flex items-center gap-2 mt-1"
                onClick={() => { setNameInput(car.name); setEditingName(true); }}
              >
                {car.name}
                <Pencil size={14} className="text-gray-700 group-hover:text-gray-400 transition-colors" />
              </h1>
            )}
            <p className="text-gray-600 text-xs mt-1.5">{totalParts} parts across {car.categories.length} categories</p>
          </div>

          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-5 py-3 text-right">
            <p className="text-[10px] uppercase tracking-widest text-gray-500 font-medium mb-0.5">Est. Mods Total</p>
            <p className="text-xl font-black text-white">{fmtRange(totalLow, totalHigh)}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mt-6 pt-6 border-t border-[#1a1a1a]">
          <PriceField label="Base Price" value={car.base_price} onChange={v => onUpdate({ base_price: v })} />
          <PriceField label="Out-the-Door" value={car.out_the_door_price} onChange={v => onUpdate({ out_the_door_price: v })} />
          <PriceField label="Down Payment" value={car.down_payment} onChange={v => onUpdate({ down_payment: v })} />
        </div>
      </div>
    </div>
  );
}
