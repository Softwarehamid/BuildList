export interface Database {
  public: {
    Tables: {
      cars: {
        Row: Car;
        Insert: Omit<Car, "id" | "created_at">;
        Update: Partial<Omit<Car, "id" | "created_at">>;
      };
      mod_categories: {
        Row: ModCategory;
        Insert: Omit<ModCategory, "id" | "created_at">;
        Update: Partial<Omit<ModCategory, "id" | "created_at">>;
      };
      mods: {
        Row: Mod;
        Insert: Omit<Mod, "id" | "created_at">;
        Update: Partial<Omit<Mod, "id" | "created_at">>;
      };
    };
  };
}

export interface Car {
  id: string;
  name: string;
  base_price: number | null;
  out_the_door_price: number | null;
  down_payment: number | null;
  image_url: string | null;
  created_at: string;
}

export interface ModCategory {
  id: string;
  car_id: string;
  name: string;
  display_order: number;
  created_at: string;
}

export interface Mod {
  id: string;
  category_id: string;
  name: string;
  price_min: number | null;
  price_max: number | null;
  url: string | null;
  status: ModStatus;
  notes: string | null;
  created_at: string;
}

export type ModStatus = "planned" | "bought" | "installed";

export interface CategoryWithMods extends ModCategory {
  mods: Mod[];
}

export interface CarWithCategories extends Car {
  categories: CategoryWithMods[];
}
