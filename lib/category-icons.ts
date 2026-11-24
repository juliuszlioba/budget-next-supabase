import {
  Baby, Banknote, Bike, BookOpen, Bus, Car, Coffee, CreditCard, Dumbbell, Film, Fuel, Gamepad2, Gift,
  GraduationCap, HeartPulse, House, Landmark, Music, Package, PawPrint, PiggyBank, Pill, Plane, Receipt,
  Shield, Shirt, ShoppingBag, ShoppingCart, Smartphone, Sparkles, TrainFront, Tv, Utensils, Wifi, Wrench, Zap,
  type LucideIcon,
} from "lucide-react";

/** Icons a category can use, stored in categories.icon by key. Order = order in the Settings picker. */
export const CATEGORY_ICONS = {
  house: House,
  zap: Zap,
  wifi: Wifi,
  "shopping-cart": ShoppingCart,
  utensils: Utensils,
  coffee: Coffee,
  "train-front": TrainFront,
  bus: Bus,
  car: Car,
  fuel: Fuel,
  bike: Bike,
  plane: Plane,
  tv: Tv,
  music: Music,
  smartphone: Smartphone,
  film: Film,
  shield: Shield,
  "shopping-bag": ShoppingBag,
  shirt: Shirt,
  gift: Gift,
  pill: Pill,
  "heart-pulse": HeartPulse,
  dumbbell: Dumbbell,
  "gamepad-2": Gamepad2,
  "book-open": BookOpen,
  "graduation-cap": GraduationCap,
  "paw-print": PawPrint,
  baby: Baby,
  wrench: Wrench,
  sparkles: Sparkles,
  "credit-card": CreditCard,
  "piggy-bank": PiggyBank,
  banknote: Banknote,
  landmark: Landmark,
  receipt: Receipt,
  package: Package,
} satisfies Record<string, LucideIcon>;

export type CategoryIconKey = keyof typeof CATEGORY_ICONS;

export const CATEGORY_ICON_KEYS = Object.keys(CATEGORY_ICONS) as CategoryIconKey[];

export function categoryIcon(key: string | undefined | null): LucideIcon {
  return (key && CATEGORY_ICONS[key as CategoryIconKey]) || Package;
}
