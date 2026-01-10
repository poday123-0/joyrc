export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  rating: number;
  image: string;
  description: string;
  weight: string;
  age: string;
  size: string;
  temperature: string;
}

export const products: Product[] = [
  {
    id: "1",
    name: "Oranda Goldfish",
    category: "Aquarium fish",
    price: 29.99,
    rating: 4.5,
    image: "oranda-goldfish",
    description: "Oranda Goldfish is a calm freshwater fish admired for its rounded body and distinctive head growth (wen). Its bright golden color and elegant movement bring charm to any aquarium, while its easy care suits all experience levels.",
    weight: "5.0 oz",
    age: "3 years",
    size: "4.78 Inch",
    temperature: "17-20°C"
  },
  {
    id: "2",
    name: "Betta Fish",
    category: "Tropical fish",
    price: 24.99,
    rating: 4.8,
    image: "betta-fish",
    description: "The Betta Fish, also known as Siamese Fighting Fish, is renowned for its vibrant colors and flowing fins. These beautiful fish are perfect for beginners and make stunning centerpieces in any aquarium.",
    weight: "0.8 oz",
    age: "2 years",
    size: "2.5 Inch",
    temperature: "24-27°C"
  },
  {
    id: "3",
    name: "Guppy Fish",
    category: "Tropical fish",
    price: 12.99,
    rating: 4.3,
    image: "guppy-fish",
    description: "Guppies are colorful, peaceful fish perfect for community tanks. Known for their vibrant tails and easy breeding, they're ideal for beginners wanting a lively aquarium.",
    weight: "0.2 oz",
    age: "1 year",
    size: "1.5 Inch",
    temperature: "22-28°C"
  },
  {
    id: "4",
    name: "Neon Tetra",
    category: "Tropical fish",
    price: 8.99,
    rating: 4.6,
    image: "neon-tetra",
    description: "Neon Tetras are small, schooling fish famous for their iridescent blue stripe and red tail. They create a stunning visual display when kept in groups.",
    weight: "0.1 oz",
    age: "1 year",
    size: "1.2 Inch",
    temperature: "20-26°C"
  }
];

export const categories = [
  { id: "all", name: "All Fish", icon: "🐠" },
  { id: "small-tank", name: "Small Tank", icon: "🐟" },
  { id: "substrate", name: "Substrate", icon: "🪸" },
  { id: "plants", name: "Plants", icon: "🌿" },
  { id: "filters", name: "Filters", icon: "💧" }
];
