import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Car, CarWithCategories, CategoryWithMods, Mod } from '../types/database';

export function useCarBuild() {
  const [cars, setCars] = useState<Car[]>([]);
  const [selectedCar, setSelectedCar] = useState<CarWithCategories | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCars = useCallback(async () => {
    const { data, error } = await supabase
      .from('cars')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) { setError(error.message); return; }
    setCars(data || []);
    return data;
  }, []);

  const fetchCarDetails = useCallback(async (carId: string) => {
    const { data: categories, error: catError } = await supabase
      .from('mod_categories')
      .select('*')
      .eq('car_id', carId)
      .order('display_order', { ascending: true });
    if (catError) { setError(catError.message); return; }

    const { data: modsData, error: modsError } = await supabase
      .from('mods')
      .select('*')
      .in('category_id', (categories || []).map(c => c.id))
      .order('created_at', { ascending: true });
    if (modsError) { setError(modsError.message); return; }

    const { data: car, error: carError } = await supabase
      .from('cars')
      .select('*')
      .eq('id', carId)
      .maybeSingle();
    if (carError) { setError(carError.message); return; }
    if (!car) return;

    const categoriesWithMods: CategoryWithMods[] = (categories || []).map(cat => ({
      ...cat,
      mods: (modsData || []).filter(m => m.category_id === cat.id),
    }));

    setSelectedCar({ ...car, categories: categoriesWithMods });
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    const data = await fetchCars();
    if (data && data.length > 0) {
      await fetchCarDetails(data[0].id);
    }
    setLoading(false);
  }, [fetchCars, fetchCarDetails]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const selectCar = useCallback(async (carId: string) => {
    setLoading(true);
    await fetchCarDetails(carId);
    setLoading(false);
  }, [fetchCarDetails]);

  const addCar = useCallback(async (car: { name: string; base_price: number | null; out_the_door_price: number | null; down_payment: number | null }) => {
    const { data, error } = await supabase.from('cars').insert(car).select().maybeSingle();
    if (error) { setError(error.message); return null; }
    await fetchCars();
    return data;
  }, [fetchCars]);

  const updateCar = useCallback(async (id: string, updates: Partial<Car>) => {
    const { error } = await supabase.from('cars').update(updates).eq('id', id);
    if (error) { setError(error.message); return; }
    if (selectedCar?.id === id) {
      setSelectedCar(prev => prev ? { ...prev, ...updates } : prev);
    }
    await fetchCars();
  }, [fetchCars, selectedCar]);

  const deleteCar = useCallback(async (id: string) => {
    const { error } = await supabase.from('cars').delete().eq('id', id);
    if (error) { setError(error.message); return; }
    const data = await fetchCars();
    if (data && data.length > 0) {
      await fetchCarDetails(data[0].id);
    } else {
      setSelectedCar(null);
    }
  }, [fetchCars, fetchCarDetails]);

  const addCategory = useCallback(async (carId: string, name: string) => {
    const maxOrder = selectedCar?.categories.reduce((m, c) => Math.max(m, c.display_order), 0) ?? 0;
    const { error } = await supabase.from('mod_categories').insert({ car_id: carId, name, display_order: maxOrder + 1 });
    if (error) { setError(error.message); return; }
    await fetchCarDetails(carId);
  }, [selectedCar, fetchCarDetails]);

  const updateCategory = useCallback(async (id: string, name: string, carId: string) => {
    const { error } = await supabase.from('mod_categories').update({ name }).eq('id', id);
    if (error) { setError(error.message); return; }
    await fetchCarDetails(carId);
  }, [fetchCarDetails]);

  const deleteCategory = useCallback(async (id: string, carId: string) => {
    const { error } = await supabase.from('mod_categories').delete().eq('id', id);
    if (error) { setError(error.message); return; }
    await fetchCarDetails(carId);
  }, [fetchCarDetails]);

  const addMod = useCallback(async (mod: Omit<Mod, 'id' | 'created_at'>, carId: string) => {
    const { error } = await supabase.from('mods').insert(mod);
    if (error) { setError(error.message); return; }
    await fetchCarDetails(carId);
  }, [fetchCarDetails]);

  const updateMod = useCallback(async (id: string, updates: Partial<Mod>, carId: string) => {
    const { error } = await supabase.from('mods').update(updates).eq('id', id);
    if (error) { setError(error.message); return; }
    await fetchCarDetails(carId);
  }, [fetchCarDetails]);

  const deleteMod = useCallback(async (id: string, carId: string) => {
    const { error } = await supabase.from('mods').delete().eq('id', id);
    if (error) { setError(error.message); return; }
    await fetchCarDetails(carId);
  }, [fetchCarDetails]);

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
    updateCategory,
    deleteCategory,
    addMod,
    updateMod,
    deleteMod,
    refresh: loadAll,
  };
}
