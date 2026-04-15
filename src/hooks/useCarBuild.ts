import { useState, useEffect, useCallback } from "react";
import {
  supabase,
  isSupabaseConfigured,
  supabaseConfigError,
} from "../lib/supabase";
import type {
  Car,
  CarWithCategories,
  CategoryWithMods,
  Mod,
  ModStatus,
} from "../types/database";

interface ParsedImportMod {
  name: string;
  price_min: number | null;
  price_max: number | null;
  url: string | null;
  status: ModStatus;
  notes: string | null;
}

interface ParsedImportCategory {
  name: string;
  mods: ParsedImportMod[];
}

interface ParsedImportBuild {
  carName: string;
  categories: ParsedImportCategory[];
}

function parseStatusFromNotes(notes: string | null): ModStatus | null {
  if (!notes) return null;
  const match = notes.match(
    /(?:^|\n)\s*status:\s*(planned|bought|installed)\b/im,
  );
  if (!match) return null;

  const normalized = match[1].toLowerCase();
  if (normalized === "installed") return "installed";
  if (normalized === "bought") return "bought";
  if (normalized === "planned") return "planned";
  return null;
}

function normalizeStatusValue(
  status: string | null | undefined,
): ModStatus | null {
  const normalized = status?.trim().toLowerCase();
  if (
    normalized === "planned" ||
    normalized === "bought" ||
    normalized === "installed"
  ) {
    return normalized;
  }

  return null;
}

function normalizeModStatus(
  status: string | null | undefined,
  notes: string | null,
): ModStatus {
  const normalized = normalizeStatusValue(status);
  if (normalized) {
    return normalized;
  }

  return parseStatusFromNotes(notes) ?? "planned";
}

function extractDollarValues(text: string): number[] {
  return Array.from(text.matchAll(/\$\s*([\d,]+(?:\.\d{1,2})?)/g))
    .map((match) => Number.parseFloat(match[1].replaceAll(",", "")))
    .filter((value) => Number.isFinite(value));
}

function extractFirstUrl(text: string): string | null {
  const match = text.match(/https?:\/\/\S+/i);
  return match ? match[0].replace(/[),.;]+$/, "") : null;
}

function parseBuildImport(rawText: string): ParsedImportBuild {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  let carName = "Imported Build";
  let currentCategory = "General";

  const categories: ParsedImportCategory[] = [];
  const categoryMap = new Map<string, ParsedImportCategory>();

  const ensureCategory = (name: string): ParsedImportCategory => {
    const normalizedName = name.trim() || "General";
    const existing = categoryMap.get(normalizedName);
    if (existing) return existing;

    const created = { name: normalizedName, mods: [] };
    categoryMap.set(normalizedName, created);
    categories.push(created);
    return created;
  };

  for (const line of lines) {
    const checklist = line.match(/^-\s*\[(x| )\]\s*(.+)$/i);

    if (!checklist) {
      const isPotentialCarName =
        carName === "Imported Build" &&
        !line.includes("$") &&
        !line.includes("=") &&
        !line.endsWith(":") &&
        !line.startsWith("-") &&
        line.length <= 60;

      if (isPotentialCarName) {
        carName = line;
        continue;
      }

      const isHeading =
        line.endsWith(":") ||
        (/^[A-Za-z][A-Za-z0-9 &+\/'()_-]{1,35}$/i.test(line) &&
          !line.includes("$") &&
          !line.includes("=") &&
          !/^vin\b/i.test(line));

      if (isHeading) {
        currentCategory = line.replace(/:\s*$/, "").trim();
        ensureCategory(currentCategory);
      }

      continue;
    }

    const checked = checklist[1].toLowerCase() === "x";
    const rawItem = checklist[2].trim();
    const category = ensureCategory(currentCategory);

    const url = extractFirstUrl(rawItem);
    const withoutUrl = rawItem.replace(/https?:\/\/\S+/gi, "").trim();
    const dollarValues = extractDollarValues(withoutUrl);
    const totalPrice =
      dollarValues.length > 0
        ? dollarValues.reduce((sum, value) => sum + value, 0)
        : null;

    let name = withoutUrl
      .replace(/\$\s*[\d,]+(?:\.\d{1,2})?/g, "")
      .replace(/[–-]\s*$/g, "")
      .replace(/\s{2,}/g, " ")
      .trim();

    if (!name) {
      name = withoutUrl;
    }

    category.mods.push({
      name,
      price_min: totalPrice,
      price_max: totalPrice,
      url,
      status: checked ? "installed" : "planned",
      notes: null,
    });
  }

  return {
    carName,
    categories: categories.filter((category) => category.mods.length > 0),
  };
}

export function useCarBuild() {
  const [cars, setCars] = useState<Car[]>([]);
  const [selectedCar, setSelectedCar] = useState<CarWithCategories | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getClient = useCallback(() => {
    if (!isSupabaseConfigured || !supabase) {
      setError(supabaseConfigError ?? "Supabase is not configured.");
      return null;
    }
    return supabase;
  }, []);

  const fetchCars = useCallback(async () => {
    const client = getClient();
    if (!client) return;

    const { data, error } = await client
      .from("cars")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) {
      setError(error.message);
      return;
    }
    setCars(data || []);
    return data;
  }, [getClient]);

  function getPowerStageNumber(name: string): number | null {
    const stageMatch = name.match(/^stage\b\D*(\d+)/i);
    if (stageMatch) return Number.parseInt(stageMatch[1], 10);

    const legacyMatch = name.match(/^power\s*-\s*stage\b\D*(\d+)/i);
    if (legacyMatch) return Number.parseInt(legacyMatch[1], 10);

    return null;
  }

  function isPowerStageCategory(name: string): boolean {
    return /^stage\b/i.test(name) || /^power\s*-\s*stage\b/i.test(name);
  }

  const fetchCarDetails = useCallback(
    async (carId: string) => {
      const client = getClient();
      if (!client) return;

      const { data: categories, error: catError } = await client
        .from("mod_categories")
        .select("*")
        .eq("car_id", carId)
        .order("display_order", { ascending: true });
      if (catError) {
        setError(catError.message);
        return;
      }

      const { data: modsData, error: modsError } = await client
        .from("mods")
        .select("*")
        .in(
          "category_id",
          (categories || []).map((c) => c.id),
        )
        .order("created_at", { ascending: true });
      if (modsError) {
        setError(modsError.message);
        return;
      }

      const { data: car, error: carError } = await client
        .from("cars")
        .select("*")
        .eq("id", carId)
        .maybeSingle();
      if (carError) {
        setError(carError.message);
        return;
      }
      if (!car) return;

      const categoriesWithMods: CategoryWithMods[] = (categories || []).map(
        (cat) => ({
          ...cat,
          mods: (modsData || [])
            .filter((m) => m.category_id === cat.id)
            .map((m) => ({
              ...m,
              status: normalizeModStatus(
                (m as { status?: string | null }).status,
                m.notes,
              ),
            })),
        }),
      );

      setSelectedCar({ ...car, categories: categoriesWithMods });
    },
    [getClient],
  );

  const loadAll = useCallback(async () => {
    setLoading(true);

    if (!isSupabaseConfigured) {
      setError(supabaseConfigError ?? "Supabase is not configured.");
      setLoading(false);
      return;
    }

    const data = await fetchCars();
    if (data && data.length > 0) {
      await fetchCarDetails(data[0].id);
    }
    setLoading(false);
  }, [fetchCars, fetchCarDetails]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const selectCar = useCallback(
    async (carId: string) => {
      setLoading(true);
      await fetchCarDetails(carId);
      setLoading(false);
    },
    [fetchCarDetails],
  );

  const addCar = useCallback(
    async (car: {
      name: string;
      base_price: number | null;
      out_the_door_price: number | null;
      down_payment: number | null;
    }) => {
      const client = getClient();
      if (!client) return null;

      const { data, error } = await client
        .from("cars")
        .insert(car)
        .select()
        .maybeSingle();
      if (error) {
        setError(error.message);
        return null;
      }
      await fetchCars();
      return data;
    },
    [fetchCars, getClient],
  );

  const updateCar = useCallback(
    async (id: string, updates: Partial<Car>) => {
      const client = getClient();
      if (!client) return;

      const { error } = await client.from("cars").update(updates).eq("id", id);
      if (error) {
        setError(error.message);
        return;
      }
      if (selectedCar?.id === id) {
        setSelectedCar((prev) => (prev ? { ...prev, ...updates } : prev));
      }
      await fetchCars();
    },
    [fetchCars, selectedCar, getClient],
  );

  const deleteCar = useCallback(
    async (id: string) => {
      const client = getClient();
      if (!client) return;

      const { error } = await client.from("cars").delete().eq("id", id);
      if (error) {
        setError(error.message);
        return;
      }
      const data = await fetchCars();
      if (data && data.length > 0) {
        await fetchCarDetails(data[0].id);
      } else {
        setSelectedCar(null);
      }
    },
    [fetchCars, fetchCarDetails, getClient],
  );

  const addCategory = useCallback(
    async (carId: string, name: string) => {
      const client = getClient();
      if (!client) return;

      const maxOrder =
        selectedCar?.categories.reduce(
          (m, c) => Math.max(m, c.display_order),
          0,
        ) ?? 0;
      const { error } = await client
        .from("mod_categories")
        .insert({ car_id: carId, name, display_order: maxOrder + 1 });
      if (error) {
        setError(error.message);
        return;
      }
      await fetchCarDetails(carId);
    },
    [selectedCar, fetchCarDetails, getClient],
  );

  const addPowerStage = useCallback(
    async (carId: string) => {
      const client = getClient();
      if (!client || !selectedCar || selectedCar.id !== carId) return;

      const stageNumbers = selectedCar.categories
        .filter((category) => isPowerStageCategory(category.name))
        .map((category) => getPowerStageNumber(category.name) ?? 0)
        .filter((num) => num > 0);

      const existingStageCount = selectedCar.categories.filter((category) =>
        isPowerStageCategory(category.name),
      ).length;

      const maxExistingStageNumber =
        stageNumbers.length > 0 ? Math.max(...stageNumbers) : 0;
      const nextStage =
        Math.max(maxExistingStageNumber, existingStageCount) + 1;
      const maxOrder =
        selectedCar.categories.reduce(
          (m, c) => Math.max(m, c.display_order),
          0,
        ) ?? 0;

      const { error } = await client.from("mod_categories").insert({
        car_id: carId,
        name: `Stage ${nextStage}`,
        display_order: maxOrder + 1,
      });

      if (error) {
        setError(error.message);
        return;
      }

      await fetchCarDetails(carId);
    },
    [fetchCarDetails, getClient, selectedCar],
  );

  const importBuildFromText = useCallback(
    async (rawText: string) => {
      const client = getClient();
      if (!client) return null;

      const parsed = parseBuildImport(rawText);
      if (!parsed.carName.trim()) {
        setError("Could not detect a build name from imported text.");
        return null;
      }

      if (parsed.categories.length === 0) {
        setError("Could not detect any checklist parts to import.");
        return null;
      }

      const { data: newCar, error: carError } = await client
        .from("cars")
        .insert({
          name: parsed.carName,
          base_price: null,
          out_the_door_price: null,
          down_payment: null,
          image_url: null,
        })
        .select()
        .maybeSingle();

      if (carError || !newCar) {
        setError(carError?.message ?? "Failed to create imported car build.");
        return null;
      }

      for (let index = 0; index < parsed.categories.length; index += 1) {
        const category = parsed.categories[index];

        const { data: insertedCategory, error: categoryError } = await client
          .from("mod_categories")
          .insert({
            car_id: newCar.id,
            name: category.name,
            display_order: index + 1,
          })
          .select()
          .maybeSingle();

        if (categoryError || !insertedCategory) {
          setError(
            categoryError?.message ??
              `Failed to import category: ${category.name}`,
          );
          return null;
        }

        if (category.mods.length > 0) {
          const { error: modsError } = await client.from("mods").insert(
            category.mods.map((mod) => ({
              category_id: insertedCategory.id,
              name: mod.name,
              price_min: mod.price_min,
              price_max: mod.price_max,
              url: mod.url,
              status: mod.status,
              notes: mod.notes,
            })),
          );

          if (modsError) {
            setError(modsError.message);
            return null;
          }
        }
      }

      await fetchCars();
      await fetchCarDetails(newCar.id);
      return newCar.id;
    },
    [fetchCarDetails, fetchCars, getClient],
  );

  const movePowerGroup = useCallback(
    async (carId: string, direction: "up" | "down") => {
      const client = getClient();
      if (!client || !selectedCar || selectedCar.id !== carId) return;

      const ordered = [...selectedCar.categories].sort(
        (a, b) => a.display_order - b.display_order,
      );
      const powerStageIds = new Set(
        ordered
          .filter((category) => isPowerStageCategory(category.name))
          .map((category) => category.id),
      );

      if (powerStageIds.size === 0) return;

      const powerStageCategories = ordered.filter((category) =>
        powerStageIds.has(category.id),
      );

      const units: Array<{ type: "regular"; id: string } | { type: "power" }> =
        [];
      let insertedPowerUnit = false;

      for (const category of ordered) {
        if (powerStageIds.has(category.id)) {
          if (!insertedPowerUnit) {
            units.push({ type: "power" });
            insertedPowerUnit = true;
          }
          continue;
        }

        units.push({ type: "regular", id: category.id });
      }

      const powerIndex = units.findIndex((unit) => unit.type === "power");
      if (powerIndex === -1) return;

      const targetIndex = direction === "up" ? powerIndex - 1 : powerIndex + 1;
      if (targetIndex < 0 || targetIndex >= units.length) return;

      const nextUnits = [...units];
      [nextUnits[powerIndex], nextUnits[targetIndex]] = [
        nextUnits[targetIndex],
        nextUnits[powerIndex],
      ];

      const orderedPowerStages = [...powerStageCategories].sort((a, b) => {
        const aNum = getPowerStageNumber(a.name) ?? Number.MAX_SAFE_INTEGER;
        const bNum = getPowerStageNumber(b.name) ?? Number.MAX_SAFE_INTEGER;
        if (aNum !== bNum) return aNum - bNum;
        return a.display_order - b.display_order;
      });

      const reorderedCategoryIds: string[] = [];
      for (const unit of nextUnits) {
        if (unit.type === "regular") {
          reorderedCategoryIds.push(unit.id);
        } else {
          reorderedCategoryIds.push(
            ...orderedPowerStages.map((category) => category.id),
          );
        }
      }

      for (let index = 0; index < reorderedCategoryIds.length; index += 1) {
        const { error } = await client
          .from("mod_categories")
          .update({ display_order: index + 1 })
          .eq("id", reorderedCategoryIds[index]);

        if (error) {
          setError(error.message);
          return;
        }
      }

      await fetchCarDetails(carId);
    },
    [fetchCarDetails, getClient, selectedCar],
  );

  const updateCategory = useCallback(
    async (id: string, name: string, carId: string) => {
      const client = getClient();
      if (!client) return;

      const { error } = await client
        .from("mod_categories")
        .update({ name })
        .eq("id", id);
      if (error) {
        setError(error.message);
        return;
      }
      await fetchCarDetails(carId);
    },
    [fetchCarDetails, getClient],
  );

  const deleteCategory = useCallback(
    async (id: string, carId: string) => {
      const client = getClient();
      if (!client) return;

      const { error } = await client
        .from("mod_categories")
        .delete()
        .eq("id", id);
      if (error) {
        setError(error.message);
        return;
      }
      await fetchCarDetails(carId);
    },
    [fetchCarDetails, getClient],
  );

  const moveCategory = useCallback(
    async (carId: string, categoryId: string, direction: "up" | "down") => {
      const client = getClient();
      if (!client || !selectedCar || selectedCar.id !== carId) return;

      const orderedCategories = [...selectedCar.categories].sort(
        (a, b) => a.display_order - b.display_order,
      );

      const currentIndex = orderedCategories.findIndex(
        (category) => category.id === categoryId,
      );
      if (currentIndex === -1) return;

      const targetIndex =
        direction === "up" ? currentIndex - 1 : currentIndex + 1;
      if (targetIndex < 0 || targetIndex >= orderedCategories.length) return;

      const currentCategory = orderedCategories[currentIndex];
      const targetCategory = orderedCategories[targetIndex];

      const updates = [
        { id: currentCategory.id, display_order: targetCategory.display_order },
        { id: targetCategory.id, display_order: currentCategory.display_order },
      ];

      for (const update of updates) {
        const { error } = await client
          .from("mod_categories")
          .update({ display_order: update.display_order })
          .eq("id", update.id);

        if (error) {
          setError(error.message);
          return;
        }
      }

      await fetchCarDetails(carId);
    },
    [fetchCarDetails, getClient, selectedCar],
  );

  const moveCategoryInList = useCallback(
    async (
      carId: string,
      orderedCategoryIds: string[],
      categoryId: string,
      direction: "up" | "down",
    ) => {
      const client = getClient();
      if (!client || !selectedCar || selectedCar.id !== carId) return;

      const currentIndex = orderedCategoryIds.findIndex(
        (id) => id === categoryId,
      );
      if (currentIndex === -1) return;

      const targetIndex =
        direction === "up" ? currentIndex - 1 : currentIndex + 1;
      if (targetIndex < 0 || targetIndex >= orderedCategoryIds.length) return;

      const currentCategory = selectedCar.categories.find(
        (c) => c.id === categoryId,
      );
      const targetCategory = selectedCar.categories.find(
        (c) => c.id === orderedCategoryIds[targetIndex],
      );

      if (!currentCategory || !targetCategory) return;

      const updates = [
        { id: currentCategory.id, display_order: targetCategory.display_order },
        { id: targetCategory.id, display_order: currentCategory.display_order },
      ];

      for (const update of updates) {
        const { error } = await client
          .from("mod_categories")
          .update({ display_order: update.display_order })
          .eq("id", update.id);

        if (error) {
          setError(error.message);
          return;
        }
      }

      await fetchCarDetails(carId);
    },
    [fetchCarDetails, getClient, selectedCar],
  );

  const addMod = useCallback(
    async (mod: Omit<Mod, "id" | "created_at">, carId: string) => {
      const client = getClient();
      if (!client) return;

      const { error } = await client.from("mods").insert(mod);
      if (error) {
        setError(error.message);
        return;
      }
      await fetchCarDetails(carId);
    },
    [fetchCarDetails, getClient],
  );

  const updateMod = useCallback(
    async (id: string, updates: Partial<Mod>, carId: string) => {
      const client = getClient();
      if (!client) return;

      const normalizedUpdates = {
        ...updates,
        status:
          updates.status !== undefined
            ? (normalizeStatusValue(updates.status) ?? updates.status)
            : updates.status,
      };

      setSelectedCar((prev) => {
        if (!prev || prev.id !== carId) return prev;

        return {
          ...prev,
          categories: prev.categories.map((category) => ({
            ...category,
            mods: category.mods.map((mod) =>
              mod.id === id
                ? {
                    ...mod,
                    ...normalizedUpdates,
                    status: normalizeModStatus(
                      (normalizedUpdates.status as string | undefined) ??
                        mod.status,
                      normalizedUpdates.notes === undefined
                        ? mod.notes
                        : normalizedUpdates.notes,
                    ),
                  }
                : mod,
            ),
          })),
        };
      });

      const { error } = await client
        .from("mods")
        .update(normalizedUpdates)
        .eq("id", id);
      if (error) {
        setError(error.message);
        await fetchCarDetails(carId);
        return;
      }
      await fetchCarDetails(carId);
    },
    [fetchCarDetails, getClient],
  );

  const deleteMod = useCallback(
    async (id: string, carId: string) => {
      const client = getClient();
      if (!client) return;

      const { error } = await client.from("mods").delete().eq("id", id);
      if (error) {
        setError(error.message);
        return;
      }
      await fetchCarDetails(carId);
    },
    [fetchCarDetails, getClient],
  );

  return {
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
    importBuildFromText,
    movePowerGroup,
    updateCategory,
    deleteCategory,
    moveCategory,
    moveCategoryInList,
    addMod,
    updateMod,
    deleteMod,
    refresh: loadAll,
  };
}
