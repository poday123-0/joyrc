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
    <div className="w-full max-w-3xl">
      <div className="flex flex-wrap justify-center gap-2 lg:gap-3">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => onCategoryChange(category.id)}
            className={`flex items-center gap-2 px-5 py-2.5 lg:px-6 lg:py-3 rounded-full whitespace-nowrap transition-all duration-300 text-sm lg:text-base font-medium ${
              activeCategory === category.id
                ? "bg-foreground text-background"
                : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
            }`}
          >
            <span>{category.icon}</span>
            <span>{category.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default CategoryPills;
