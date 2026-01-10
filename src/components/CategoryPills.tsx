import { useState } from "react";
import { categories } from "@/data/products";

const CategoryPills = () => {
  const [activeCategory, setActiveCategory] = useState("all");

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
            onClick={() => setActiveCategory(category.id)}
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
