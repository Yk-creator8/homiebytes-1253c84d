import food1 from "@/assets/food-1.jpg";
import food2 from "@/assets/food-2.jpg";
import food3 from "@/assets/food-3.jpg";
import food4 from "@/assets/food-4.jpg";
import food5 from "@/assets/food-5.jpg";
import food6 from "@/assets/food-6.jpg";

export type Food = {
  id: string;
  name: string;
  image: string;
  price: number;
  description: string;
  veg: boolean;
  rating: number;
  cookName: string;
  cookLocation: string;
  distanceKm: number;
  prepMinutes: number;
  availability: "lunch" | "dinner" | "both";
};

export const foods: Food[] = [
  {
    id: "1",
    name: "Paneer Butter Masala",
    image: food1,
    price: 180,
    description: "Creamy tomato gravy with soft homemade paneer cubes, simmered with whole spices. Served with 2 butter rotis.",
    veg: true,
    rating: 4.8,
    cookName: "Anita Sharma",
    cookLocation: "Koramangala",
    distanceKm: 1.2,
    prepMinutes: 35,
    availability: "both",
  },
  {
    id: "2",
    name: "Veg Biryani",
    image: food2,
    price: 160,
    description: "Long-grain basmati rice layered with seasonal veggies, fresh herbs and biryani masala. Comes with raita.",
    veg: true,
    rating: 4.6,
    cookName: "Priya Iyer",
    cookLocation: "Indiranagar",
    distanceKm: 2.4,
    prepMinutes: 40,
    availability: "both",
  },
  {
    id: "3",
    name: "Masala Dosa",
    image: food3,
    price: 90,
    description: "Crispy rice & lentil crepe stuffed with spiced potato masala. Served with sambar and coconut chutney.",
    veg: true,
    rating: 4.9,
    cookName: "Lakshmi Nair",
    cookLocation: "HSR Layout",
    distanceKm: 3.1,
    prepMinutes: 25,
    availability: "lunch",
  },
  {
    id: "4",
    name: "Chicken Curry & Rice",
    image: food4,
    price: 220,
    description: "Slow-cooked country-style chicken curry with steamed basmati rice. Home-ground masalas, no shortcuts.",
    veg: false,
    rating: 4.7,
    cookName: "Reema D'Souza",
    cookLocation: "BTM Layout",
    distanceKm: 1.8,
    prepMinutes: 45,
    availability: "both",
  },
  {
    id: "5",
    name: "Rajma Chawal",
    image: food5,
    price: 140,
    description: "Punjabi-style kidney bean curry slow cooked overnight, paired with fluffy jeera rice and onion salad.",
    veg: true,
    rating: 4.5,
    cookName: "Manjeet Kaur",
    cookLocation: "Jayanagar",
    distanceKm: 4.2,
    prepMinutes: 30,
    availability: "both",
  },
  {
    id: "6",
    name: "Idli Sambar (4 pcs)",
    image: food6,
    price: 70,
    description: "Soft, fluffy steamed idlis with piping hot sambar and two chutneys. A perfect light meal.",
    veg: true,
    rating: 4.8,
    cookName: "Lakshmi Nair",
    cookLocation: "HSR Layout",
    distanceKm: 3.1,
    prepMinutes: 20,
    availability: "lunch",
  },
];

export const getFood = (id: string) => foods.find((f) => f.id === id);
