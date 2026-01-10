// Static fallback data - will be replaced by database
export interface Product {
  id: string;
  name: string;
  category: string;
  category_id?: string;
  price: number;
  rating: number;
  image: string;
  image_url?: string;
  description: string;
  specifications?: { name: string; value: string }[];
}

export const staticProducts: Product[] = [
  {
    id: "1",
    name: "Speed Racer Pro",
    category: "RC Cars",
    price: 89.99,
    rating: 4.5,
    image: "rc-car-red",
    description: "High-performance RC racing car with advanced suspension system. Reaches speeds up to 45 km/h with precision steering control. Perfect for racing enthusiasts.",
    specifications: [
      { name: "Speed", value: "45 km/h" },
      { name: "Battery", value: "2200mAh" },
      { name: "Range", value: "150m" },
      { name: "Scale", value: "1:16" }
    ]
  },
  {
    id: "2",
    name: "Wave Runner X",
    category: "Boats",
    price: 129.99,
    rating: 4.8,
    image: "rc-speedboat",
    description: "High-speed RC speedboat with waterproof design. Self-righting hull technology ensures it always stays afloat. Perfect for pool and lake adventures.",
    specifications: [
      { name: "Speed", value: "35 km/h" },
      { name: "Battery", value: "1800mAh" },
      { name: "Range", value: "120m" },
      { name: "Size", value: "45cm" }
    ]
  },
  {
    id: "3",
    name: "Sky Explorer Drone",
    category: "Drones",
    price: 199.99,
    rating: 4.6,
    image: "rc-drone",
    description: "Professional-grade drone with 4K camera and GPS. Features auto-return home, altitude hold, and 25-minute flight time. Capture stunning aerial footage.",
    specifications: [
      { name: "Flight Time", value: "25 min" },
      { name: "Camera", value: "4K HD" },
      { name: "Range", value: "500m" },
      { name: "GPS", value: "Yes" }
    ]
  },
  {
    id: "4",
    name: "Monster Crusher",
    category: "Trucks",
    price: 149.99,
    rating: 4.7,
    image: "rc-monster-truck",
    description: "Powerful off-road monster truck with oversized tires and 4WD. Handles any terrain with ease. Built for extreme durability and performance.",
    specifications: [
      { name: "Speed", value: "40 km/h" },
      { name: "Battery", value: "2400mAh" },
      { name: "Scale", value: "1:12" },
      { name: "4WD", value: "Yes" }
    ]
  },
  {
    id: "5",
    name: "Falcon Heli Pro",
    category: "Helicopters",
    price: 79.99,
    rating: 4.3,
    image: "rc-helicopter",
    description: "Stable and easy-to-fly RC helicopter with 6-axis gyro stabilization. Great for beginners and indoor flying. LED lights for night flights.",
    specifications: [
      { name: "Flight Time", value: "12 min" },
      { name: "Channels", value: "6-axis" },
      { name: "Range", value: "80m" },
      { name: "LED", value: "Yes" }
    ]
  }
];

export const staticCategories = [
  { id: "all", name: "All", icon: "🎮" },
  { id: "rc-cars", name: "RC Cars", icon: "🏎️" },
  { id: "boats", name: "Boats", icon: "🚤" },
  { id: "drones", name: "Drones", icon: "🚁" },
  { id: "trucks", name: "Trucks", icon: "🚚" },
  { id: "helicopters", name: "Helicopters", icon: "🚁" }
];
