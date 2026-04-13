import { useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import { useCarBuild } from "./hooks/useCarBuild";
import { Sidebar } from "./components/Sidebar";
import { CarHeader } from "./components/CarHeader";
import { CategorySection } from "./components/CategorySection";
import type { Mod } from "./types/database";

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
    updateCategory,
    deleteCategory,
    addMod,
    updateMod,
    deleteMod,
  } = useCarBuild();

  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

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

  if (loading && cars.length === 0) {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-500">
          <Loader2 size={18} className="animate-spin" />
          <span className="text-sm">Loading builds...</span>
        </div>
      </div>
    );
  }

  if (error && cars.length === 0 && !selectedCar) {
    return (
      <div className="min-h-screen bg-[#080808] text-white flex items-center justify-center px-4">
        <div className="w-full max-w-xl rounded-xl border border-red-900/50 bg-[#111111] p-5">
          <p className="text-red-400 font-semibold mb-2">Configuration error</p>
          <p className="text-sm text-gray-300">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080808] text-white">
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
                  {selectedCar.categories.map((cat) => (
                    <CategorySection
                      key={cat.id}
                      category={cat}
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
                  ))}

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
