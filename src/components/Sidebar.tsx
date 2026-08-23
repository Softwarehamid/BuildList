import { Fragment, useState } from "react";
import {
  Plus,
  Car,
  Trash2,
  ChevronRight,
  GripVertical,
  X,
  Check,
  Gauge,
  ArrowUp,
  ArrowDown,
  ChevronDown,
  Settings,
} from "lucide-react";
import type {
  Car as CarType,
  CarGroup,
  CarWithCategories,
} from "../types/database";

interface Props {
  cars: CarType[];
  deletedCars: CarType[];
  groups: CarGroup[];
  carGroupIds: Record<string, string[]>;
  allowMultipleGroups: boolean;
  selectedCar: CarWithCategories | null;
  selectedCarId: string | undefined;
  onSelect: (id: string) => void;
  onAddCar: (car: {
    name: string;
    car_nickname: string | null;
    base_price: number | null;
  }) => void;
  onMoveCar: (id: string, direction: "up" | "down") => void;
  onReorderCars: (draggedId: string, targetId: string) => void;
  onDeleteCar: (id: string) => void;
  onRestoreCar: (id: string) => void;
  onPermanentlyDeleteCar: (id: string) => void;
  onAddGroup: (name: string) => void;
  onAssignCarToGroups: (carId: string, groupIds: string[]) => void;
  onSetAllowMultipleGroups: (enabled: boolean) => void;
}

export function Sidebar({
  cars,
  deletedCars,
  groups,
  carGroupIds,
  allowMultipleGroups,
  selectedCar,
  selectedCarId,
  onSelect,
  onAddCar,
  onMoveCar,
  onReorderCars,
  onDeleteCar,
  onRestoreCar,
  onPermanentlyDeleteCar,
  onAddGroup,
  onAssignCarToGroups,
  onSetAllowMultipleGroups,
}: Props) {
  const [adding, setAdding] = useState(false);
  const [draggingCarId, setDraggingCarId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CarType | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [collapsedGroups, setCollapsedGroups] = useState<string[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [form, setForm] = useState({
    name: "",
    nickname: "",
    basePrice: "",
  });

  const getCarProgress = (carId: string) => {
    if (!selectedCar || selectedCar.id !== carId) return null;
    const allMods = selectedCar.categories.flatMap((c) => c.mods);
    if (allMods.length === 0) return null;
    const installed = allMods.filter((m) => m.status === "installed").length;
    return Math.round((installed / allMods.length) * 100);
  };

  const submit = () => {
    if (!form.name.trim()) return;
    onAddCar({
      name: form.name.trim(),
      car_nickname: form.nickname.trim() || null,
      base_price: form.basePrice ? parseFloat(form.basePrice) : null,
    });
    setForm({ name: "", nickname: "", basePrice: "" });
    setAdding(false);
  };

  const carEntries = cars.flatMap((car) => {
    const assignedGroupIds = carGroupIds[car.id] || [];
    const entryGroupIds =
      allowMultipleGroups && assignedGroupIds.length > 0
        ? assignedGroupIds
        : [assignedGroupIds[0] || "uncategorized"];
    return entryGroupIds.map((groupId) => ({ car, groupId }));
  });

  return (
    <aside className="w-full md:w-64 flex-shrink-0 flex flex-col gap-4">
      <div className="flex items-center gap-2 px-1">
        <Gauge size={16} className="text-red-500" />
        <span className="text-white font-black text-lg tracking-tight">
          BuildList
        </span>
      </div>

      <div className="bg-[#111111] border border-[#1e1e1e] rounded-xl overflow-hidden">
        <div className="px-3 py-2 border-b border-[#1a1a1a]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold">
              My Builds
            </span>
            <button
              type="button"
              onClick={() => setSettingsOpen((open) => !open)}
              className="text-gray-600 hover:text-white"
              aria-label="Group settings"
              title="Group settings"
            >
              <Settings size={13} />
            </button>
          </div>
        </div>
        {settingsOpen && (
          <div className="border-b border-[#1a1a1a] p-3 space-y-2">
            <label className="flex items-center gap-2 text-xs text-gray-400">
              <input
                type="checkbox"
                checked={allowMultipleGroups}
                onChange={(event) =>
                  onSetAllowMultipleGroups(event.target.checked)
                }
              />
              Allow cars in multiple groups
            </label>
            <div className="flex gap-2">
              <input
                value={newGroupName}
                onChange={(event) => setNewGroupName(event.target.value)}
                placeholder="New group name"
                className="min-w-0 flex-1 rounded-md border border-[#333] bg-[#0b0b0b] px-2 py-1.5 text-xs text-white"
              />
              <button
                type="button"
                onClick={() => {
                  if (newGroupName.trim()) {
                    onAddGroup(newGroupName);
                    setNewGroupName("");
                  }
                }}
                className="rounded-md bg-red-700 px-2 text-xs text-white"
              >
                Add
              </button>
            </div>
          </div>
        )}
        <div className="divide-y divide-[#1a1a1a]">
          {carEntries.map(({ car, groupId: entryGroupId }, index) => {
            const assignedGroupIds = carGroupIds[car.id] || [];
            const group = groups.find((item) => item.id === entryGroupId);
            const groupName = group?.name || "Uncategorized";
            const isFirstInGroup =
              carEntries.findIndex(
                (entry) => entry.groupId === entryGroupId,
              ) === index;
            if (collapsedGroups.includes(entryGroupId)) {
              return isFirstInGroup ? (
                <button
                  key={`${car.id}-${entryGroupId}-collapsed`}
                  type="button"
                  onClick={() =>
                    setCollapsedGroups((current) =>
                      current.filter((id) => id !== entryGroupId),
                    )
                  }
                  className="flex w-full items-center gap-2 bg-[#0d0d0d] px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-widest text-gray-500"
                >
                  <ChevronDown size={12} className="-rotate-90" />
                  {groupName}
                </button>
              ) : null;
            }
            const progress = getCarProgress(car.id);
            return (
              <Fragment key={`${car.id}-${entryGroupId}`}>
                {isFirstInGroup && (
                  <button
                    type="button"
                    onClick={() =>
                      setCollapsedGroups((current) =>
                        current.includes(entryGroupId)
                          ? current.filter((id) => id !== entryGroupId)
                          : [...current, entryGroupId],
                      )
                    }
                    className="flex w-full items-center gap-2 bg-[#0d0d0d] px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-widest text-gray-500"
                  >
                    <ChevronDown size={12} className={""} />
                    {groupName}
                  </button>
                )}
                <div
                  key={car.id}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (draggingCarId && draggingCarId !== car.id) {
                      onReorderCars(draggingCarId, car.id);
                    }
                  }}
                  className={`group flex flex-col gap-1.5 px-3 py-2.5 transition-colors ${selectedCarId === car.id ? "bg-red-950/30" : "hover:bg-white/[0.03]"} ${draggingCarId === car.id ? "opacity-60" : "opacity-100"}`}
                  onClick={() => onSelect(car.id)}
                >
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      draggable
                      onClick={(e) => e.stopPropagation()}
                      onDragStart={(e) => {
                        e.dataTransfer.effectAllowed = "move";
                        setDraggingCarId(car.id);
                      }}
                      onDragEnd={() => setDraggingCarId(null)}
                      className="text-gray-600 hover:text-gray-300 transition-colors p-0.5 cursor-grab active:cursor-grabbing"
                      aria-label="Drag build to reorder"
                      title="Drag to reorder"
                    >
                      <GripVertical size={12} />
                    </button>
                    <Car
                      size={13}
                      className={
                        selectedCarId === car.id
                          ? "text-red-400"
                          : "text-gray-600"
                      }
                    />
                    <span
                      className={`flex-1 text-sm truncate ${selectedCarId === car.id ? "text-white font-semibold" : "text-gray-400"}`}
                    >
                      {car.name}
                    </span>
                    {selectedCarId === car.id && (
                      <ChevronRight size={12} className="text-red-500" />
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onMoveCar(car.id, "up");
                      }}
                      className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-gray-300 transition-all p-0.5 disabled:opacity-30 disabled:cursor-not-allowed"
                      disabled={index === 0}
                      aria-label="Move build up"
                    >
                      <ArrowUp size={11} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onMoveCar(car.id, "down");
                      }}
                      className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-gray-300 transition-all p-0.5 disabled:opacity-30 disabled:cursor-not-allowed"
                      disabled={index === cars.length - 1}
                      aria-label="Move build down"
                    >
                      <ArrowDown size={11} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget(car);
                        setDeleteConfirmation("");
                      }}
                      className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all p-0.5"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                  {progress !== null && (
                    <div className="flex items-center gap-2 px-0.5">
                      <div className="flex-1 h-1 rounded-full bg-[#1a1a1a] overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-green-400"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-gray-500 font-semibold min-w-fit">
                        {progress}%
                      </span>
                    </div>
                  )}
                  <select
                    multiple={allowMultipleGroups}
                    value={assignedGroupIds}
                    onChange={(event) =>
                      onAssignCarToGroups(
                        car.id,
                        Array.from(
                          event.target.selectedOptions,
                          (option) => option.value,
                        ).filter(Boolean),
                      )
                    }
                    onClick={(event) => event.stopPropagation()}
                    className="ml-7 max-w-[calc(100%-1.75rem)] bg-transparent text-[10px] text-gray-600 outline-none"
                    aria-label={`Group for ${car.name}`}
                  >
                    <option value="">Uncategorized</option>
                    {groups.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </div>
              </Fragment>
            );
          })}
          {cars.length === 0 && (
            <p className="text-gray-600 text-xs text-center py-4 italic">
              No builds yet
            </p>
          )}
        </div>
      </div>

      {deletedCars.length > 0 && (
        <div className="bg-[#111111] border border-[#352020] rounded-xl overflow-hidden">
          <div className="px-3 py-2 border-b border-[#241818] flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-widest text-red-400 font-semibold">
              Recently Deleted
            </span>
            <Trash2 size={12} className="text-red-500/70" />
          </div>
          <div className="divide-y divide-[#1a1a1a]">
            {deletedCars.map((car) => (
              <div key={car.id} className="flex items-center gap-2 px-3 py-2.5">
                <span className="flex-1 text-sm text-gray-400 truncate">
                  {car.name}
                </span>
                <button
                  type="button"
                  onClick={() => onRestoreCar(car.id)}
                  className="text-xs text-emerald-400 hover:text-emerald-300"
                >
                  Restore
                </button>
                <button
                  type="button"
                  onClick={() => onPermanentlyDeleteCar(car.id)}
                  className="text-gray-600 hover:text-red-400 p-1"
                  aria-label={`Permanently delete ${car.name}`}
                  title="Delete permanently"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {adding ? (
        <div className="bg-[#111111] border border-[#1e1e1e] rounded-xl p-3 space-y-2">
          <input
            className="w-full bg-[#0f0f0f] border border-[#333] text-white text-sm rounded-md px-3 py-2 focus:outline-none focus:border-red-600 placeholder-gray-600"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Car name *"
            autoFocus
          />
          <input
            className="w-full bg-[#0f0f0f] border border-[#333] text-white text-sm rounded-md px-3 py-2 focus:outline-none focus:border-red-600 placeholder-gray-600"
            value={form.basePrice}
            onChange={(e) =>
              setForm((f) => ({ ...f, basePrice: e.target.value }))
            }
            placeholder="Base price"
            type="number"
          />
          <input
            className="w-full bg-[#0f0f0f] border border-[#333] text-white text-sm rounded-md px-3 py-2 focus:outline-none focus:border-red-600 placeholder-gray-600"
            value={form.nickname}
            onChange={(e) =>
              setForm((f) => ({ ...f, nickname: e.target.value }))
            }
            placeholder="Car nickname"
          />
          <div className="flex gap-2">
            <button
              onClick={() => setAdding(false)}
              className="flex-1 flex items-center justify-center gap-1 text-xs text-gray-400 hover:text-white py-2 rounded-md border border-[#333] transition-colors"
            >
              <X size={12} /> Cancel
            </button>
            <button
              onClick={submit}
              className="flex-1 flex items-center justify-center gap-1 text-xs text-white bg-red-700 hover:bg-red-600 py-2 rounded-md transition-colors"
            >
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

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4">
          <div className="w-full max-w-md rounded-xl border border-red-900/60 bg-[#111111] p-5 shadow-2xl">
            <div className="flex items-start gap-3">
              <Trash2 size={20} className="mt-0.5 text-red-400" />
              <div>
                <h2 className="font-semibold text-white">
                  Move build to Trash?
                </h2>
                <p className="mt-2 text-sm leading-5 text-gray-400">
                  This will remove{" "}
                  <span className="text-white">{deleteTarget.name}</span> and
                  all of its parts, prices, links, statuses, and notes from your
                  active builds. You can restore it for 30 days.
                </p>
              </div>
            </div>
            <input
              value={deleteConfirmation}
              onChange={(event) => setDeleteConfirmation(event.target.value)}
              placeholder={`Type ${deleteTarget.name} to confirm`}
              className="mt-4 w-full rounded-md border border-[#333] bg-[#0b0b0b] px-3 py-2 text-sm text-white focus:border-red-600 focus:outline-none"
              autoFocus
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="rounded-md border border-[#333] px-3 py-2 text-sm text-gray-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteConfirmation !== deleteTarget.name}
                onClick={() => {
                  onDeleteCar(deleteTarget.id);
                  setDeleteTarget(null);
                }}
                className="rounded-md bg-red-700 px-3 py-2 text-sm font-semibold text-white hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Move to Trash
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
