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
    <div className="w-full">
      <div className="flex flex-wrap justify-center gap-2 lg:gap-3">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => onCategoryChange(category.id)}
            className={`flex items-center gap-2 px-4 py-2 lg:px-5 lg:py-2.5 rounded-full whitespace-nowrap transition-all duration-300 text-sm font-medium border ${
              activeCategory === category.id
                ? "bg-primary text-primary-foreground border-primary shadow-md"
                : "bg-background text-foreground border-border hover:border-primary/50 hover:bg-muted"
            }`}
          >
            <span className="text-base">{category.icon}</span>
            <span>{category.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default CategoryPills;
