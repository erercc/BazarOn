import { BadgePercent, Briefcase, Car, CookingPot, Dumbbell, Footprints, Gamepad2, Music, Package, Shirt, Smartphone, Sofa, Sparkles, Sprout, ToyBrick, Wheat } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  BadgePercent, Briefcase, Car, CookingPot, Dumbbell, Footprints, Gamepad2, Music, Package, Shirt, Smartphone, Sofa, Sparkles, Sprout, ToyBrick, Wheat,
};

export function CategoryIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[name] ?? Package;
  return <Icon className={className} />;
}
