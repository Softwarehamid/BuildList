import { useState } from "react";
import {
  Plus,
  Loader2,
  ChevronDown,
  ChevronRight,
  Zap,
  FileText,
} from "lucide-react";
import { useCarBuild } from "./hooks/useCarBuild";
import { Sidebar } from "./components/Sidebar";
import { CarHeader } from "./components/CarHeader";
import { CategorySection } from "./components/CategorySection";
import type { Mod } from "./types/database";

function isPowerStageCategory(name: string): boolean {
  return /^stage\b/i.test(name) || /^power\s*-\s*stage\b/i.test(name);
}

function getPowerStageNumber(name: string): number | null {
  const stageMatch = name.match(/^stage\b\D*(\d+)/i);
  if (stageMatch) return Number.parseInt(stageMatch[1], 10);

  const legacyMatch = name.match(/^power\s*-\s*stage\b\D*(\d+)/i);
  if (legacyMatch) return Number.parseInt(legacyMatch[1], 10);

  return null;
}

function isNumericStageTitle(name: string): boolean {
  return (
    /^stage\s*\d+\s*$/i.test(name) || /^power\s*-\s*stage\s*\d+\s*$/i.test(name)
  );
}

export default function App() {
  const {
    cars,
    selectedCar,
    loading,
    error,
    selectCar,
    addCar,
    updateCar,
    deleteCar,
    reorderCarsInList,
    addCategory,
    addPowerStage,
    importBuildFromText,
    reorderCategoriesInList,
    updateCategory,
    deleteCategory,
    reorderModsInCategory,
    addMod,
    updateMod,
    deleteMod,
  } = useCarBuild();

  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [powerOpen, setPowerOpen] = useState(true);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importing, setImporting] = useState(false);
  const [draggingCategoryId, setDraggingCategoryId] = useState<string | null>(
    null,
  );
  const [draggingBlockId, setDraggingBlockId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string[]>([
    "planned",
    "onHand",
    "installed",
  ]);

  const handleAddCar = async (car: {
    name: string;
    base_price: number | null;
    out_the_door_price: number | null;
    down_payment: number | null;
  }) => {
    const newCar = await addCar(car);
    if (newCar) selectCar(newCar.id);
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim() || !selectedCar) return;
    await addCategory(selectedCar.id, newCategoryName.trim());
    setNewCategoryName("");
    setAddingCategory(false);
  };

  const handleImportBuild = async () => {
    if (!importText.trim()) return;

    setImporting(true);
    await importBuildFromText(importText);
    setImporting(false);
  };

  const reorderByDrop = (
    orderedIds: string[],
    draggedId: string,
    targetId: string,
  ) => {
    const fromIndex = orderedIds.indexOf(draggedId);
    const toIndex = orderedIds.indexOf(targetId);
    if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
      return orderedIds;
    }

    const next = [...orderedIds];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    return next;
  };

  const handleReorderCars = (draggedId: string, targetId: string) => {
    const orderedCarIds = cars.map((car) => car.id);
    const reordered = reorderByDrop(orderedCarIds, draggedId, targetId);
    reorderCarsInList(reordered);
  };

  const reorderSubsetInFullOrder = (
    fullOrder: string[],
    subsetCurrentOrder: string[],
    subsetReordered: string[],
  ) => {
    const subsetSet = new Set(subsetCurrentOrder);
    let idx = 0;
    return fullOrder.map((id) => {
      if (!subsetSet.has(id)) return id;
      const next = subsetReordered[idx];
      idx += 1;
      return next;
    });
  };

  const handleReorderPowerStages = (draggedId: string, targetId: string) => {
    if (!selectedCar) return;
    const reorderedPower = reorderByDrop(powerStageIds, draggedId, targetId);
    const fullOrder = orderedCategories.map((c) => c.id);
    const reorderedFull = reorderSubsetInFullOrder(
      fullOrder,
      powerStageIds,
      reorderedPower,
    );
    reorderCategoriesInList(selectedCar.id, reorderedFull);
  };

  const handleReorderMods = (
    categoryId: string,
    draggedId: string,
    targetId: string,
  ) => {
    if (!selectedCar) return;
    const category = selectedCar.categories.find((c) => c.id === categoryId);
    if (!category) return;

    const orderedModIds = [...category.mods]
      .sort((a, b) => {
        const aOrder = a.display_order ?? Number.MAX_SAFE_INTEGER;
        const bOrder = b.display_order ?? Number.MAX_SAFE_INTEGER;
        return aOrder - bOrder;
      })
      .map((m) => m.id);

    const reordered = reorderByDrop(orderedModIds, draggedId, targetId);
    reorderModsInCategory(selectedCar.id, reordered);
  };

  const POWER_BLOCK_ID = "__power_block__";

  const handleReorderCategoryBlocks = (draggedId: string, targetId: string) => {
    if (!selectedCar) return;

    const blockIds = orderedBlocks.map((block) =>
      block.type === "power" ? POWER_BLOCK_ID : block.categoryId,
    );
    const reorderedBlocks = reorderByDrop(blockIds, draggedId, targetId);

    const reorderedCategoryIds: string[] = [];
    for (const blockId of reorderedBlocks) {
      if (blockId === POWER_BLOCK_ID) {
        reorderedCategoryIds.push(...powerStageIds);
      } else {
        reorderedCategoryIds.push(blockId);
      }
    }

    reorderCategoriesInList(selectedCar.id, reorderedCategoryIds);
  };

  const orderedCategories = selectedCar
    ? [...selectedCar.categories].sort(
        (a, b) => a.display_order - b.display_order,
      )
    : [];

  const powerStages = orderedCategories.filter((category) =>
    isPowerStageCategory(category.name),
  );

  const regularCategories = orderedCategories.filter(
    (category) => !isPowerStageCategory(category.name),
  );

  const orderedBlocks: Array<
    { type: "regular"; categoryId: string } | { type: "power" }
  > = [];
  let insertedPowerBlock = false;

  for (const category of orderedCategories) {
    if (isPowerStageCategory(category.name)) {
      if (!insertedPowerBlock) {
        orderedBlocks.push({ type: "power" });
        insertedPowerBlock = true;
      }
      continue;
    }

    orderedBlocks.push({ type: "regular", categoryId: category.id });
  }

  if (!insertedPowerBlock) {
    orderedBlocks.push({ type: "power" });
  }

  const regularById = new Map(
    regularCategories.map((category) => [category.id, category]),
  );
  const powerStageIds = powerStages.map((category) => category.id);

  if (loading && cars.length === 0) {
    return (
      <div className="min-h-screen bg-[#080808] pt-[env(safe-area-inset-top)] flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-500">
          <Loader2 size={18} className="animate-spin" />
          <span className="text-sm">Loading builds...</span>
        </div>
      </div>
    );
  }

  if (error && cars.length === 0 && !selectedCar) {
    return (
      <div className="min-h-screen bg-[#080808] pt-[env(safe-area-inset-top)] text-white flex items-center justify-center px-4">
        <div className="w-full max-w-xl rounded-xl border border-red-900/50 bg-[#111111] p-5">
          <p className="text-red-400 font-semibold mb-2">Configuration error</p>
          <p className="text-sm text-gray-300">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080808] pt-[env(safe-area-inset-top)] text-white">
      <div className="max-w-6xl mx-auto px-4 py-6 md:py-10">
        <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-start">
          <Sidebar
            cars={cars}
            selectedCar={selectedCar}
            selectedCarId={selectedCar?.id}
            onSelect={selectCar}
            onAddCar={handleAddCar}
            onReorderCars={handleReorderCars}
            onDeleteCar={deleteCar}
          />

          <main className="flex-1 min-w-0 space-y-4">
            {loading && !selectedCar ? (
              <div className="flex items-center gap-3 text-gray-500 py-10 justify-center">
                <Loader2 size={18} className="animate-spin" />
                <span className="text-sm">Loading build...</span>
              </div>
            ) : selectedCar ? (
              <>
                <CarHeader
                  car={selectedCar}
                  onUpdate={(updates) => updateCar(selectedCar.id, updates)}
                />

                {/* Quick Filters */}
                <div className="flex items-center gap-2 px-0.5">
                  <span className="text-[10px] uppercase tracking-widest text-gray-600 font-semibold">
                    Filter:
                  </span>
                  {["planned", "onHand", "installed"].map((status) => {
                    const labels: Record<string, string> = {
                      planned: "Planned",
                      onHand: "On Hand",
                      installed: "Installed",
                    };
                    const colors: Record<string, string> = {
                      planned: statusFilter.includes(status)
                        ? "border-sky-500 bg-sky-900/30 text-sky-300"
                        : "border-sky-900/50 bg-sky-900/10 text-sky-500/50",
                      onHand: statusFilter.includes(status)
                        ? "border-amber-500 bg-amber-900/30 text-amber-300"
                        : "border-amber-900/50 bg-amber-900/10 text-amber-500/50",
                      installed: statusFilter.includes(status)
                        ? "border-emerald-500 bg-emerald-900/30 text-emerald-300"
                        : "border-emerald-900/50 bg-emerald-900/10 text-emerald-500/50",
                    };
                    return (
                      <button
                        key={status}
                        onClick={() =>
                          setStatusFilter((f) =>
                            f.includes(status)
                              ? f.filter((s) => s !== status)
                              : [...f, status],
                          )
                        }
                        className={`text-xs font-semibold px-2.5 py-1.5 rounded-md border transition-all ${colors[status]}`}
                      >
                        {labels[status as keyof typeof labels]}
                      </button>
                    );
                  })}
                </div>

                <div className="space-y-3 pt-2">
                  {orderedBlocks.map((block, blockIndex) => {
                    if (block.type === "regular") {
                      const cat = regularById.get(block.categoryId);
                      if (!cat) return null;

                      return (
                        <div
                          key={cat.id}
                          draggable
                          onDragStart={() => setDraggingBlockId(cat.id)}
                          onDragEnd={() => setDraggingBlockId(null)}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.preventDefault();
                            if (draggingBlockId && draggingBlockId !== cat.id) {
                              handleReorderCategoryBlocks(
                                draggingBlockId,
                                cat.id,
                              );
                            }
                          }}
                          className={`${draggingBlockId === cat.id ? "opacity-60" : "opacity-100"} cursor-grab active:cursor-grabbing`}
                        >
                          <CategorySection
                            category={cat}
                            statusFilter={statusFilter}
                            onReorderMods={handleReorderMods}
                            onUpdateCategory={(id, name) =>
                              updateCategory(id, name, selectedCar.id)
                            }
                            onDeleteCategory={(id) =>
                              deleteCategory(id, selectedCar.id)
                            }
                            onAddMod={(
                              mod: Omit<
                                Mod,
                                "id" | "created_at" | "display_order"
                              >,
                            ) => addMod(mod, selectedCar.id)}
                            onUpdateMod={(id, updates) =>
                              updateMod(id, updates, selectedCar.id)
                            }
                            onDeleteMod={(id) => deleteMod(id, selectedCar.id)}
                          />
                        </div>
                      );
                    }

                    return (
                      <section
                        key={`power-block-${blockIndex}`}
                        draggable
                        onDragStart={() => setDraggingBlockId(POWER_BLOCK_ID)}
                        onDragEnd={() => setDraggingBlockId(null)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (
                            draggingBlockId &&
                            draggingBlockId !== POWER_BLOCK_ID
                          ) {
                            handleReorderCategoryBlocks(
                              draggingBlockId,
                              POWER_BLOCK_ID,
                            );
                          }
                        }}
                        className={`bg-[#111111] border border-[#1e1e1e] rounded-xl overflow-hidden ${draggingBlockId === POWER_BLOCK_ID ? "opacity-60" : "opacity-100"} cursor-grab active:cursor-grabbing`}
                      >
                        <div
                          className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-white/[0.02] transition-colors"
                          onClick={() => setPowerOpen((open) => !open)}
                        >
                          <div className="w-[3px] h-5 rounded-full flex-shrink-0 bg-[#3b82f6]" />
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-semibold text-sm tracking-wide">
                              Power
                            </p>
                            <p className="text-xs text-gray-500">
                              {powerStages.length}{" "}
                              {powerStages.length === 1 ? "stage" : "stages"}
                            </p>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              addPowerStage(selectedCar.id);
                              setPowerOpen(true);
                            }}
                            className="flex items-center gap-1.5 text-xs text-white bg-blue-700 hover:bg-blue-600 px-3 py-1.5 rounded-md transition-colors"
                          >
                            <Plus size={12} /> Add Stage
                          </button>
                          <Zap size={14} className="text-blue-400" />
                          {powerOpen ? (
                            <ChevronDown size={15} className="text-gray-500" />
                          ) : (
                            <ChevronRight size={15} className="text-gray-500" />
                          )}
                        </div>

                        {powerOpen && (
                          <div className="border-t border-[#1a1a1a] p-2 space-y-2">
                            {powerStages.length === 0 && (
                              <p className="text-gray-600 text-xs text-center py-3 italic">
                                No stages yet. Click Add Stage to create Stage
                                1.
                              </p>
                            )}

                            {powerStages.map((cat, index) => {
                              const stageNumber =
                                getPowerStageNumber(cat.name) ?? index + 1;
                              const displayName = isNumericStageTitle(cat.name)
                                ? `Stage ${stageNumber}`
                                : cat.name;
                              return (
                                <div
                                  key={cat.id}
                                  draggable
                                  onDragStart={() =>
                                    setDraggingCategoryId(cat.id)
                                  }
                                  onDragEnd={() => setDraggingCategoryId(null)}
                                  onDragOver={(e) => e.preventDefault()}
                                  onDrop={(e) => {
                                    e.preventDefault();
                                    if (
                                      draggingCategoryId &&
                                      draggingCategoryId !== cat.id
                                    ) {
                                      handleReorderPowerStages(
                                        draggingCategoryId,
                                        cat.id,
                                      );
                                    }
                                  }}
                                  className={`${draggingCategoryId === cat.id ? "opacity-60" : "opacity-100"} cursor-grab active:cursor-grabbing`}
                                >
                                  <CategorySection
                                    category={cat}
                                    displayName={displayName}
                                    statusFilter={statusFilter}
                                    onReorderMods={handleReorderMods}
                                    onUpdateCategory={(id, name) =>
                                      updateCategory(id, name, selectedCar.id)
                                    }
                                    onDeleteCategory={(id) =>
                                      deleteCategory(id, selectedCar.id)
                                    }
                                    onAddMod={(
                                      mod: Omit<
                                        Mod,
                                        "id" | "created_at" | "display_order"
                                      >,
                                    ) => addMod(mod, selectedCar.id)}
                                    onUpdateMod={(id, updates) =>
                                      updateMod(id, updates, selectedCar.id)
                                    }
                                    onDeleteMod={(id) =>
                                      deleteMod(id, selectedCar.id)
                                    }
                                  />
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </section>
                    );
                  })}

                  {addingCategory ? (
                    <div className="bg-[#111111] border border-[#1e1e1e] rounded-xl p-4 flex gap-2">
                      <input
                        className="flex-1 bg-[#0f0f0f] border border-[#333] text-white text-sm rounded-md px-3 py-2 focus:outline-none focus:border-red-600 placeholder-gray-600"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        placeholder="Category name (e.g. Suspension, Exhaust...)"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleAddCategory();
                          if (e.key === "Escape") setAddingCategory(false);
                        }}
                        autoFocus
                      />
                      <button
                        onClick={() => setAddingCategory(false)}
                        className="px-3 py-2 text-sm text-gray-500 hover:text-white border border-[#333] rounded-md transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleAddCategory}
                        className="px-4 py-2 text-sm text-white bg-red-700 hover:bg-red-600 rounded-md transition-colors"
                      >
                        Add
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setAddingCategory(true)}
                      className="w-full flex items-center justify-center gap-2 text-sm text-gray-600 hover:text-gray-400 py-3 rounded-xl border border-dashed border-[#2a2a2a] hover:border-[#444] transition-all"
                    >
                      <Plus size={14} /> Add Category
                    </button>
                  )}

                  <section className="bg-[#111111] border border-[#1e1e1e] rounded-xl overflow-hidden">
                    <button
                      onClick={() => setImportOpen((open) => !open)}
                      className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-white/[0.02] transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <FileText size={14} className="text-gray-400" />
                        <span className="text-sm font-semibold text-gray-200">
                          Import From Notes
                        </span>
                      </div>
                      {importOpen ? (
                        <ChevronDown size={15} className="text-gray-500" />
                      ) : (
                        <ChevronRight size={15} className="text-gray-500" />
                      )}
                    </button>

                    {importOpen && (
                      <div className="border-t border-[#1a1a1a] p-4 space-y-3">
                        <p className="text-xs text-gray-500">
                          Paste checklist text (with headings and - [ ] / - [x]
                          lines). A new car build will be created.
                        </p>
                        <textarea
                          className="w-full min-h-48 bg-[#0f0f0f] border border-[#333] text-white text-sm rounded-md px-3 py-2 focus:outline-none focus:border-red-600 placeholder-gray-600"
                          value={importText}
                          onChange={(e) => setImportText(e.target.value)}
                          placeholder="Paste your Apple Notes build list here..."
                        />
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => setImportOpen(false)}
                            className="px-3 py-2 text-sm text-gray-500 hover:text-white border border-[#333] rounded-md transition-colors"
                          >
                            Close
                          </button>
                          <button
                            onClick={handleImportBuild}
                            disabled={importing || !importText.trim()}
                            className="px-4 py-2 text-sm text-white bg-blue-700 hover:bg-blue-600 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {importing ? "Importing..." : "Import Build"}
                          </button>
                        </div>
                      </div>
                    )}
                  </section>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="w-16 h-16 rounded-full bg-[#111] border border-[#222] flex items-center justify-center mb-4">
                  <Plus size={24} className="text-gray-600" />
                </div>
                <p className="text-white font-semibold mb-1">
                  No build selected
                </p>
                <p className="text-gray-600 text-sm">
                  Create a new build from the sidebar to get started
                </p>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
