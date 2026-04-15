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
} from "../types/database";

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
          mods: (modsData || []).filter((m) => m.category_id === cat.id),
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
        .map((category) => {
          const match = category.name.match(/^power\s*-\s*stage\s*(\d+)$/i);
          return match ? Number.parseInt(match[1], 10) : 0;
        })
        .filter((num) => num > 0);

      const nextStage =
        stageNumbers.length > 0 ? Math.max(...stageNumbers) + 1 : 1;
      const maxOrder =
        selectedCar.categories.reduce(
          (m, c) => Math.max(m, c.display_order),
          0,
        ) ?? 0;

      const { error } = await client.from("mod_categories").insert({
        car_id: carId,
        name: `Power - Stage ${nextStage}`,
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

      const { error } = await client.from("mods").update(updates).eq("id", id);
      if (error) {
        setError(error.message);
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
