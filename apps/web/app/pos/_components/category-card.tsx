"use client";

import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { MedusaProductCategory } from "@/lib/pos-actions";

const getCategoryIcon = (categoryName: string): string => {
  const icons: Record<string, string> = {
    Burgers: "🍔", Pizza: "🍕", Tacos: "🌮", Sandwiches: "🥪",
    Salads: "🥗", Beverages: "🥤", Desserts: "🍰", Appetizers: "🍤",
    Main: "🍽️", Sides: "🍟",
  };
  return icons[categoryName] || "📦";
};

interface CategoryCardProps {
  category: MedusaProductCategory;
  isSelected: boolean;
  onClick: () => void;
}

export function CategoryCard({ category, isSelected, onClick }: CategoryCardProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onClick}
            className={cn(
              "flex flex-col items-center justify-center gap-2 rounded-xl p-3 transition-all duration-200",
              "hover:scale-105 active:scale-95 flex-shrink-0",
              isSelected
                ? "bg-primary text-primary-foreground shadow-md"
                : "bg-card hover:bg-accent text-muted-foreground hover:text-card-foreground"
            )}
          >
            <div className={cn(
              "flex h-12 w-12 items-center justify-center rounded-full text-xl",
              isSelected ? "bg-primary-foreground/20" : "bg-muted"
            )}>
              {getCategoryIcon(category.name)}
            </div>
            <span className="text-xs font-medium line-clamp-1">{category.name}</span>
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{category.description || category.name}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}