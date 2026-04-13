import { useState } from 'react';
import { Plus, Car, Trash2, ChevronRight, X, Check, Gauge } from 'lucide-react';
import type { Car as CarType } from '../types/database';

interface Props {
  cars: CarType[];
  selectedCarId: string | undefined;
  onSelect: (id: string) => void;
  onAddCar: (car: { name: string; base_price: number | null; out_the_door_price: number | null; down_payment: number | null }) => void;
  onDeleteCar: (id: string) => void;
}

export function Sidebar({ cars, selectedCarId, onSelect, onAddCar, onDeleteCar }: Props) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: '', basePrice: '', otd: '', down: '' });

  const submit = () => {
    if (!form.name.trim()) return;
    onAddCar({
      name: form.name.trim(),
      base_price: form.basePrice ? parseFloat(form.basePrice) : null,
      out_the_door_price: form.otd ? parseFloat(form.otd) : null,
      down_payment: form.down ? parseFloat(form.down) : null,
    });
    setForm({ name: '', basePrice: '', otd: '', down: '' });
    setAdding(false);
  };

  return (
    <aside className="w-full md:w-64 flex-shrink-0 flex flex-col gap-4">
      <div className="flex items-center gap-2 px-1">
        <Gauge size={16} className="text-red-500" />
        <span className="text-white font-black text-lg tracking-tight">BuildList</span>
      </div>

      <div className="bg-[#111111] border border-[#1e1e1e] rounded-xl overflow-hidden">
        <div className="px-3 py-2 border-b border-[#1a1a1a]">
          <span className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold">My Builds</span>
        </div>
        <div className="divide-y divide-[#1a1a1a]">
          {cars.map(car => (
            <div
              key={car.id}
              className={`group flex items-center gap-2 px-3 py-2.5 cursor-pointer transition-colors ${selectedCarId === car.id ? 'bg-red-950/30' : 'hover:bg-white/[0.03]'}`}
              onClick={() => onSelect(car.id)}
            >
              <Car size={13} className={selectedCarId === car.id ? 'text-red-400' : 'text-gray-600'} />
              <span className={`flex-1 text-sm truncate ${selectedCarId === car.id ? 'text-white font-semibold' : 'text-gray-400'}`}>{car.name}</span>
              {selectedCarId === car.id && <ChevronRight size={12} className="text-red-500" />}
              <button
                onClick={e => { e.stopPropagation(); onDeleteCar(car.id); }}
                className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all p-0.5 ml-auto"
              >
                <Trash2 size={11} />
              </button>
            </div>
          ))}
          {cars.length === 0 && (
            <p className="text-gray-600 text-xs text-center py-4 italic">No builds yet</p>
          )}
        </div>
      </div>

      {adding ? (
        <div className="bg-[#111111] border border-[#1e1e1e] rounded-xl p-3 space-y-2">
          <input
            className="w-full bg-[#0f0f0f] border border-[#333] text-white text-sm rounded-md px-3 py-2 focus:outline-none focus:border-red-600 placeholder-gray-600"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="Car name *"
            autoFocus
          />
          <input
            className="w-full bg-[#0f0f0f] border border-[#333] text-white text-sm rounded-md px-3 py-2 focus:outline-none focus:border-red-600 placeholder-gray-600"
            value={form.basePrice}
            onChange={e => setForm(f => ({ ...f, basePrice: e.target.value }))}
            placeholder="Base price"
            type="number"
          />
          <input
            className="w-full bg-[#0f0f0f] border border-[#333] text-white text-sm rounded-md px-3 py-2 focus:outline-none focus:border-red-600 placeholder-gray-600"
            value={form.otd}
            onChange={e => setForm(f => ({ ...f, otd: e.target.value }))}
            placeholder="Out-the-door price"
            type="number"
          />
          <input
            className="w-full bg-[#0f0f0f] border border-[#333] text-white text-sm rounded-md px-3 py-2 focus:outline-none focus:border-red-600 placeholder-gray-600"
            value={form.down}
            onChange={e => setForm(f => ({ ...f, down: e.target.value }))}
            placeholder="Down payment"
            type="number"
          />
          <div className="flex gap-2">
            <button onClick={() => setAdding(false)} className="flex-1 flex items-center justify-center gap-1 text-xs text-gray-400 hover:text-white py-2 rounded-md border border-[#333] transition-colors">
              <X size={12} /> Cancel
            </button>
            <button onClick={submit} className="flex-1 flex items-center justify-center gap-1 text-xs text-white bg-red-700 hover:bg-red-600 py-2 rounded-md transition-colors">
              <Check size={12} /> Add
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-white bg-[#111111] hover:bg-[#1a1a1a] border border-[#1e1e1e] hover:border-red-900 rounded-xl py-3 transition-all"
        >
          <Plus size={14} /> New Build
        </button>
      )}
    </aside>
  );
}
