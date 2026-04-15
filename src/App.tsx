import { useState } from "react";
import {
  Plus,
  Loader2,
  ChevronDown,
  ChevronRight,
  Zap,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { useCarBuild } from "./hooks/useCarBuild";
import { Sidebar } from "./components/Sidebar";
import { CarHeader } from "./components/CarHeader";
import { CategorySection } from "./components/CategorySection";
import type { Mod } from "./types/database";

function isPowerStageCategory(name: string): boolean {
  return /^stage\s*\d+$/i.test(name) || /^power\s*-\s*stage\s*\d+$/i.test(name);
}

function getPowerStageNumber(name: string): number | null {
  const stageMatch = name.match(/^stage\s*(\d+)$/i);
  if (stageMatch) return Number.parseInt(stageMatch[1], 10);

  const legacyMatch = name.match(/^power\s*-\s*stage\s*(\d+)$/i);
  if (legacyMatch) return Number.parseInt(legacyMatch[1], 10);

  return null;
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
    addCategory,
    addPowerStage,
    movePowerGroup,
    updateCategory,
    deleteCategory,
    moveCategoryInList,
    addMod,
    updateMod,
    deleteMod,
  } = useCarBuild();

  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [powerOpen, setPowerOpen] = useState(true);

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
  const regularIds = regularCategories.map((category) => category.id);
  const powerStageIds = powerStages.map((category) => category.id);

  const powerBlockIndex = orderedBlocks.findIndex(
    (block) => block.type === "power",
  );
  const hasPowerStages = powerStages.length > 0;
  const canMovePowerUp = hasPowerStages && powerBlockIndex > 0;
  const canMovePowerDown =
    hasPowerStages &&
    powerBlockIndex !== -1 &&
    powerBlockIndex < orderedBlocks.length - 1;

  const moveInOrderedSet = (
    orderedIds: string[],
    categoryId: string,
    direction: "up" | "down",
  ) => {
    if (!selectedCar) return;
    moveCategoryInList(selectedCar.id, orderedIds, categoryId, direction);
  };

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
            selectedCarId={selectedCar?.id}
            onSelect={selectCar}
            onAddCar={handleAddCar}
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

                <div className="space-y-3 pt-2">
                  {orderedBlocks.map((block, blockIndex) => {
                    if (block.type === "regular") {
                      const cat = regularById.get(block.categoryId);
                      const currentRegularIndex = regularIds.indexOf(
                        block.categoryId,
                      );
                      if (!cat) return null;

                      return (
                        <CategorySection
                          key={cat.id}
                          category={cat}
                          canMoveUp={currentRegularIndex > 0}
                          canMoveDown={
                            currentRegularIndex < regularIds.length - 1
                          }
                          onMoveUp={(id) =>
                            moveInOrderedSet(regularIds, id, "up")
                          }
                          onMoveDown={(id) =>
                            moveInOrderedSet(regularIds, id, "down")
                          }
                          onUpdateCategory={(id, name) =>
                            updateCategory(id, name, selectedCar.id)
                          }
                          onDeleteCategory={(id) =>
                            deleteCategory(id, selectedCar.id)
                          }
                          onAddMod={(mod: Omit<Mod, "id" | "created_at">) =>
                            addMod(mod, selectedCar.id)
                          }
                          onUpdateMod={(id, updates) =>
                            updateMod(id, updates, selectedCar.id)
                          }
                          onDeleteMod={(id) => deleteMod(id, selectedCar.id)}
                        />
                      );
                    }

                    return (
                      <section
                        key={`power-block-${blockIndex}`}
                        className="bg-[#111111] border border-[#1e1e1e] rounded-xl overflow-hidden"
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
                          <div
                            className="flex items-center gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={() =>
                                movePowerGroup(selectedCar.id, "up")
                              }
                              className="text-gray-600 hover:text-gray-300 transition-colors p-0.5 disabled:opacity-30 disabled:cursor-not-allowed"
                              disabled={!canMovePowerUp}
                              aria-label="Move power section up"
                            >
                              <ArrowUp size={12} />
                            </button>
                            <button
                              onClick={() =>
                                movePowerGroup(selectedCar.id, "down")
                              }
                              className="text-gray-600 hover:text-gray-300 transition-colors p-0.5 disabled:opacity-30 disabled:cursor-not-allowed"
                              disabled={!canMovePowerDown}
                              aria-label="Move power section down"
                            >
                              <ArrowDown size={12} />
                            </button>
                            <button
                              onClick={() => {
                                addPowerStage(selectedCar.id);
                                setPowerOpen(true);
                              }}
                              className="flex items-center gap-1.5 text-xs text-white bg-blue-700 hover:bg-blue-600 px-3 py-1.5 rounded-md transition-colors"
                            >
                              <Plus size={12} /> Add Stage
                            </button>
                          </div>
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
                              return (
                                <CategorySection
                                  key={cat.id}
                                  category={cat}
                                  displayName={`Stage ${stageNumber}`}
                                  canMoveUp={index > 0}
                                  canMoveDown={index < powerStages.length - 1}
                                  onMoveUp={(id) =>
                                    moveInOrderedSet(powerStageIds, id, "up")
                                  }
                                  onMoveDown={(id) =>
                                    moveInOrderedSet(powerStageIds, id, "down")
                                  }
                                  onUpdateCategory={(id, name) =>
                                    updateCategory(id, name, selectedCar.id)
                                  }
                                  onDeleteCategory={(id) =>
                                    deleteCategory(id, selectedCar.id)
                                  }
                                  onAddMod={(
                                    mod: Omit<Mod, "id" | "created_at">,
                                  ) => addMod(mod, selectedCar.id)}
                                  onUpdateMod={(id, updates) =>
                                    updateMod(id, updates, selectedCar.id)
                                  }
                                  onDeleteMod={(id) =>
                                    deleteMod(id, selectedCar.id)
                                  }
                                />
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
