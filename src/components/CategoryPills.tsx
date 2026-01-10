import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Category {
  id: string;
  name: string;
  icon: string;
}

interface CategoryPillsProps {
  activeCategory: string;
  onCategoryChange: (categoryId: string) => void;
}

const CategoryPills = ({ activeCategory, onCategoryChange }: CategoryPillsProps) => {
  const [categories, setCategories] = useState<Category[]>([
    { id: "all", name: "All", icon: "🎮" }
  ]);

  useEffect(() => {
    const fetchCategories = async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("sort_order");
      
      if (data && !error && data.length > 0) {
        // Filter out the "All" category from DB if it exists, we add our own
        const filteredCats = data.filter(cat => cat.name.toLowerCase() !== "all");
        setCategories([
          { id: "all", name: "All", icon: "🎮" },
          ...filteredCats.map(cat => ({
            id: cat.id,
            name: cat.name,
            icon: cat.icon || "🎮"
          }))
        ]);
      }
    };

    fetchCategories();
  }, []);

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-foreground">Categories</h3>
        <button className="text-xs text-muted-foreground hover:text-foreground transition-colors">
          See All
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => onCategoryChange(category.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-full whitespace-nowrap transition-all duration-300 ${
              activeCategory === category.id
                ? "bg-primary text-primary-foreground shadow-soft"
                : "glass-card text-foreground hover:bg-white/80"
            }`}
          >
            <span className="text-sm">{category.icon}</span>
            <span className="text-sm font-medium">{category.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default CategoryPills;
