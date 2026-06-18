import { useEffect, useState, type FormEvent } from "react";
import type { User } from "@supabase/supabase-js";
import {
  Plus,
  Loader2,
  ChevronDown,
  ChevronRight,
  Menu,
  Zap,
  ArrowUp,
  ArrowDown,
  FileText,
  LogOut,
  X,
} from "lucide-react";
import { useCarBuild } from "./hooks/useCarBuild";
import { Sidebar } from "./components/Sidebar";
import { CarHeader } from "./components/CarHeader";
import { CategorySection } from "./components/CategorySection";
import {
  isSupabaseConfigured,
  supabase,
  supabaseConfigError,
} from "./lib/supabase";
import type { Mod } from "./types/database";
import { formatPrice } from "./lib/utils";

const AUTH_APP_SOURCE = "buildlist-web";
const AUTH_APP_NAME = "BuildList";

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
    moveCarInList,
    reorderCarsInList,
    addCategory,
    addPowerStage,
    importBuildFromText,
    movePowerGroup,
    reorderCategoriesInList,
    updateCategory,
    deleteCategory,
    moveCategoryInList,
    reorderModsInCategory,
    addMod,
    updateMod,
    deleteMod,
  } = useCarBuild(true);

  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authMode, setAuthMode] = useState<"signIn" | "signUp">("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [powerOpen, setPowerOpen] = useState(true);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importing, setImporting] = useState(false);
  const [mobileBuildsOpen, setMobileBuildsOpen] = useState(false);
  const [draggingRegularCategoryId, setDraggingRegularCategoryId] = useState<
    string | null
  >(null);
  const [draggingPowerCategoryId, setDraggingPowerCategoryId] = useState<
    string | null
  >(null);
  const [copiedBuildText, setCopiedBuildText] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string[]>([
    "planned",
    "onHand",
    "installed",
  ]);

  useEffect(() => {
    const client = supabase;

    if (!isSupabaseConfigured || !client) {
      setAuthError(supabaseConfigError ?? "Supabase is not configured.");
      setAuthReady(true);
      return;
    }

    let isActive = true;

    const bootAuth = async () => {
      const { data, error } = await client.auth.getUser();
      if (!isActive) return;

      if (error) {
        setAuthError(error.message);
      } else {
        setAuthUser(data.user ?? null);
      }

      setAuthReady(true);
    };

    void bootAuth();

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, session) => {
      setAuthUser(session?.user ?? null);
      setAuthError(null);
      setAuthReady(true);
    });

    return () => {
      isActive = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const client = supabase;
    if (!client || !authUser) return;

    const meta = (authUser.user_metadata ?? {}) as Record<string, unknown>;
    const hasAppSource =
      typeof meta.app_source === "string" && meta.app_source.length > 0;

    if (hasAppSource) return;

    void client.auth.updateUser({
      data: {
        ...meta,
        app_source: AUTH_APP_SOURCE,
        app_name: AUTH_APP_NAME,
      },
    });
  }, [authUser]);

  const handleAuthSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const client = supabase;
    if (!client) return;

    setAuthSubmitting(true);
    setAuthError(null);

    if (authMode === "signIn") {
      const { error } = await client.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setAuthError(error.message);
      }
    } else {
      const { error } = await client.auth.signUp({
        email,
        password,
        options: {
          data: {
            app_source: AUTH_APP_SOURCE,
            app_name: AUTH_APP_NAME,
          },
        },
      });

      if (error) {
        setAuthError(error.message);
      } else {
        setAuthError(
          "Account created. If email confirmation is enabled, verify your email then sign in.",
        );
        setAuthMode("signIn");
      }
    }

    setAuthSubmitting(false);
  };

  const handleSignOut = async () => {
    const client = supabase;
    if (!client) return;

    const { error: signOutError } = await client.auth.signOut();
    if (signOutError) {
      setAuthError(signOutError.message);
    }
  };

  const handleAddCar = async (car: {
    name: string;
    base_price: number | null;
    out_the_door_price: number | null;
    down_payment: number | null;
  }) => {
    const newCar = await addCar(car);
    if (newCar) selectCar(newCar.id);
  };

  const handleSelectCar = (carId: string) => {
    selectCar(carId);
    setMobileBuildsOpen(false);
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

  const copySelectedBuildText = async () => {
    if (!selectedCar) return;

    const orderedMods = (mods: Mod[]) =>
      [...mods].sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));

    const statusLabel: Record<Mod["status"], string> = {
      planned: "Planned",
      onHand: "On Hand",
      installed: "Installed",
    };

    const buildValue = (value: number | null) =>
      value === null
        ? "TBD"
        : value.toLocaleString("en-US", {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          });

    const lines: string[] = [selectedCar.name, ""];

    const priceRows = [
      ["Base Price", selectedCar.base_price],
      ["Out-the-Door", selectedCar.out_the_door_price],
      ["Down Payment", selectedCar.down_payment],
    ].filter(([, value]) => value !== null) as Array<[string, number | null]>;

    if (priceRows.length > 0) {
      lines.push("Prices:");
      for (const [label, value] of priceRows) {
        lines.push(`- ${label}: ${buildValue(value)}`);
      }
      lines.push("");
    }

    const appendCategory = (
      category: (typeof orderedCategories)[number],
      indent = "",
    ) => {
      lines.push(`${indent}${category.name}:`);

      const mods = orderedMods(category.mods);
      if (mods.length === 0) {
        lines.push(`${indent}  - No parts yet`);
        lines.push("");
        return;
      }

      for (const mod of mods) {
        const priceText = formatPrice(mod.price_min, mod.price_max);
        const status = statusLabel[mod.status ?? "planned"];
        lines.push(
          priceText === "TBD"
            ? `${indent}  - ${mod.name} [${status}]`
            : `${indent}  - ${mod.name} [${status}] - ${priceText}`,
        );
      }

      lines.push("");
    };

    for (const block of orderedBlocks) {
      if (block.type === "regular") {
        const category = regularById.get(block.categoryId);
        if (category) appendCategory(category);
        continue;
      }

      lines.push("Power:");
      if (powerStages.length === 0) {
        lines.push("  - No stages yet");
        lines.push("");
        continue;
      }

      for (const stage of powerStages) {
        appendCategory(stage, "  ");
      }
    }

    await navigator.clipboard.writeText(lines.join("\n").trim());
    setCopiedBuildText(true);
    window.setTimeout(() => setCopiedBuildText(false), 1500);
  };

  const moveCar = (id: string, direction: "up" | "down") => {
    const orderedCarIds = cars.map((car) => car.id);
    moveCarInList(orderedCarIds, id, direction);
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

  const moveInOrderedSet = (
    orderedIds: string[],
    categoryId: string,
    direction: "up" | "down",
  ) => {
    if (!selectedCar) return;
    moveCategoryInList(selectedCar.id, orderedIds, categoryId, direction);
  };

  const moveModInCategory = (
    categoryId: string,
    modId: string,
    direction: "up" | "down",
  ) => {
    if (!selectedCar) return;
    const category = selectedCar.categories.find((c) => c.id === categoryId);
    if (!category) return;

    const orderedModIds = [...category.mods]
      .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
      .map((m) => m.id);

    const currentIndex = orderedModIds.indexOf(modId);
    if (currentIndex === -1) return;

    const targetIndex =
      direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= orderedModIds.length) return;

    const reordered = [...orderedModIds];
    const [moved] = reordered.splice(currentIndex, 1);
    reordered.splice(targetIndex, 0, moved);
    reorderModsInCategory(selectedCar.id, reordered);
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
      .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
      .map((m) => m.id);

    const reordered = reorderByDrop(orderedModIds, draggedId, targetId);
    reorderModsInCategory(selectedCar.id, reordered);
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

  const handleReorderRegularCategories = (
    draggedId: string,
    targetId: string,
  ) => {
    if (!selectedCar) return;

    const reorderedRegular = reorderByDrop(regularIds, draggedId, targetId);
    const fullOrder = orderedCategories.map((c) => c.id);
    const reorderedFull = reorderSubsetInFullOrder(
      fullOrder,
      regularIds,
      reorderedRegular,
    );

    reorderCategoriesInList(selectedCar.id, reorderedFull);
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

  if (!authReady) {
    return (
      <div className="min-h-screen bg-[#080808] pt-[env(safe-area-inset-top)] flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-500">
          <Loader2 size={18} className="animate-spin" />
          <span className="text-sm">Checking session...</span>
        </div>
      </div>
    );
  }

  if (!authUser) {
    return (
      <div className="min-h-screen bg-[#080808] pt-[env(safe-area-inset-top)] text-white flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl border border-[#1e1e1e] bg-[#111111] p-6 space-y-5">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-red-500 font-semibold">
              BuildList Account
            </p>
            <h1 className="text-xl font-bold mt-1">
              Sign in to load your builds
            </h1>
          </div>

          <div className="grid grid-cols-2 gap-2 rounded-lg border border-[#1f1f1f] bg-[#0d0d0d] p-1">
            <button
              onClick={() => setAuthMode("signIn")}
              className={`rounded-md py-2 text-sm font-semibold transition-colors ${
                authMode === "signIn"
                  ? "bg-[#1a1a1a] text-white"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setAuthMode("signUp")}
              className={`rounded-md py-2 text-sm font-semibold transition-colors ${
                authMode === "signUp"
                  ? "bg-[#1a1a1a] text-white"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              Create Account
            </button>
          </div>

          <form className="space-y-3" onSubmit={handleAuthSubmit}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="w-full bg-[#0b0b0b] border border-[#292929] rounded-md px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-red-700"
              autoComplete="email"
              required
            />

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full bg-[#0b0b0b] border border-[#292929] rounded-md px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-red-700"
              autoComplete={
                authMode === "signIn" ? "current-password" : "new-password"
              }
              required
              minLength={6}
            />

            <button
              type="submit"
              disabled={authSubmitting}
              className="w-full flex items-center justify-center gap-2 rounded-md bg-red-700 hover:bg-red-600 disabled:opacity-60 disabled:cursor-not-allowed transition-colors py-2.5 text-sm font-semibold"
            >
              {authSubmitting && <Loader2 size={14} className="animate-spin" />}
              {authMode === "signIn" ? "Sign In" : "Create Account"}
            </button>
          </form>

          {authError && (
            <div className="rounded-md border border-amber-900/50 bg-amber-950/20 px-3 py-2">
              <p className="text-xs text-amber-300">{authError}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

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
    <div className="min-h-screen bg-[#080808] pt-[env(safe-area-inset-top)] text-white overflow-x-hidden">
      {mobileBuildsOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            className="absolute inset-0 bg-black/60"
            aria-label="Close builds menu"
            onClick={() => setMobileBuildsOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full w-[88vw] max-w-sm border-r border-[#1e1e1e] bg-[#080808] p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs uppercase tracking-[0.2em] text-gray-500 font-semibold">
                My Builds
              </span>
              <button
                onClick={() => setMobileBuildsOpen(false)}
                className="text-gray-500 hover:text-white transition-colors p-1"
                aria-label="Close menu"
              >
                <X size={16} />
              </button>
            </div>
            <Sidebar
              cars={cars}
              selectedCar={selectedCar}
              selectedCarId={selectedCar?.id}
              onSelect={handleSelectCar}
              onAddCar={handleAddCar}
              onMoveCar={moveCar}
              onReorderCars={handleReorderCars}
              onDeleteCar={deleteCar}
            />
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 py-6 md:py-10">
        <div className="mb-4 flex items-center justify-end gap-3">
          <span className="text-xs text-gray-500 truncate max-w-[60vw]">
            {authUser.email}
          </span>
          <button
            onClick={handleSignOut}
            className="inline-flex items-center gap-1.5 rounded-md border border-[#2a2a2a] bg-[#111111] px-3 py-1.5 text-xs font-semibold text-gray-300 hover:text-white hover:border-[#444] transition-colors"
          >
            <LogOut size={12} /> Sign Out
          </button>
        </div>

        <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-stretch md:items-start">
          <div className="md:hidden w-full">
            <button
              onClick={() => setMobileBuildsOpen(true)}
              className="w-full flex items-center justify-between rounded-xl border border-[#1e1e1e] bg-[#111111] px-3 py-2.5"
            >
              <span className="flex items-center gap-2 text-sm text-gray-200">
                <Menu size={15} className="text-red-400" /> My Builds
              </span>
              <span className="text-xs text-gray-500 truncate max-w-[55vw]">
                {selectedCar?.name ?? "No build selected"}
              </span>
            </button>
          </div>

          <div className="hidden md:block md:w-64 md:flex-shrink-0">
            <Sidebar
              cars={cars}
              selectedCar={selectedCar}
              selectedCarId={selectedCar?.id}
              onSelect={handleSelectCar}
              onAddCar={handleAddCar}
              onMoveCar={moveCar}
              onReorderCars={handleReorderCars}
              onDeleteCar={deleteCar}
            />
          </div>

          <main className="w-full max-w-full flex-1 min-w-0 space-y-4">
            {error && (
              <div className="rounded-lg border border-amber-900/60 bg-amber-950/20 px-3 py-2">
                <p className="text-xs text-amber-300">{error}</p>
              </div>
            )}

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
                <div className="flex flex-wrap items-center justify-between gap-3 px-0.5">
                  <div className="flex flex-wrap items-center gap-2">
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

                  <button
                    onClick={copySelectedBuildText}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md border border-[#2a2a2a] bg-[#111111] text-gray-300 hover:text-white hover:border-[#444] transition-colors"
                  >
                    {copiedBuildText ? "Copied" : "Copy Build"}
                  </button>
                </div>

                <div className="space-y-3 pt-2">
                  {orderedBlocks.map((block, blockIndex) => {
                    if (block.type === "regular") {
                      const cat = regularById.get(block.categoryId);
                      const currentRegularIndex = regularIds.indexOf(
                        block.categoryId,
                      );
                      if (!cat) return null;

                      return (
                        <div
                          key={cat.id}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.preventDefault();
                            if (
                              draggingRegularCategoryId &&
                              draggingRegularCategoryId !== cat.id
                            ) {
                              handleReorderRegularCategories(
                                draggingRegularCategoryId,
                                cat.id,
                              );
                            }
                          }}
                          className={`${draggingRegularCategoryId === cat.id ? "opacity-60" : "opacity-100"}`}
                        >
                          <CategorySection
                            category={cat}
                            statusFilter={statusFilter}
                            canMoveUp={currentRegularIndex > 0}
                            canMoveDown={
                              currentRegularIndex < regularIds.length - 1
                            }
                            dragging={draggingRegularCategoryId === cat.id}
                            onDragStart={() =>
                              setDraggingRegularCategoryId(cat.id)
                            }
                            onDragEnd={() => setDraggingRegularCategoryId(null)}
                            onMoveUp={(id) =>
                              moveInOrderedSet(regularIds, id, "up")
                            }
                            onMoveDown={(id) =>
                              moveInOrderedSet(regularIds, id, "down")
                            }
                            onMoveMod={moveModInCategory}
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
                              const displayName = isNumericStageTitle(cat.name)
                                ? `Stage ${stageNumber}`
                                : cat.name;
                              return (
                                <div
                                  key={cat.id}
                                  onDragOver={(e) => e.preventDefault()}
                                  onDrop={(e) => {
                                    e.preventDefault();
                                    if (
                                      draggingPowerCategoryId &&
                                      draggingPowerCategoryId !== cat.id
                                    ) {
                                      handleReorderPowerStages(
                                        draggingPowerCategoryId,
                                        cat.id,
                                      );
                                    }
                                  }}
                                  className={`${draggingPowerCategoryId === cat.id ? "opacity-60" : "opacity-100"}`}
                                >
                                  <CategorySection
                                    category={cat}
                                    displayName={displayName}
                                    statusFilter={statusFilter}
                                    canMoveUp={index > 0}
                                    canMoveDown={index < powerStages.length - 1}
                                    dragging={
                                      draggingPowerCategoryId === cat.id
                                    }
                                    onDragStart={() =>
                                      setDraggingPowerCategoryId(cat.id)
                                    }
                                    onDragEnd={() =>
                                      setDraggingPowerCategoryId(null)
                                    }
                                    onMoveUp={(id) =>
                                      moveInOrderedSet(powerStageIds, id, "up")
                                    }
                                    onMoveDown={(id) =>
                                      moveInOrderedSet(
                                        powerStageIds,
                                        id,
                                        "down",
                                      )
                                    }
                                    onMoveMod={moveModInCategory}
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
