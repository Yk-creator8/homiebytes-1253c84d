export const CUISINES = [
  "South Indian",
  "North Indian",
  "Biryani",
  "Bengali",
  "Gujarati",
  "Punjabi",
  "Maharashtrian",
  "Chinese",
  "Continental",
  "Snacks",
  "Desserts",
  "Healthy",
  "Other",
] as const;

export type Cuisine = typeof CUISINES[number];

export const CUISINE_EMOJI: Record<string, string> = {
  "South Indian": "🥥",
  "North Indian": "🫓",
  "Biryani": "🍚",
  "Bengali": "🐟",
  "Gujarati": "🥗",
  "Punjabi": "🧈",
  "Maharashtrian": "🌶️",
  "Chinese": "🥡",
  "Continental": "🍝",
  "Snacks": "🥟",
  "Desserts": "🍮",
  "Healthy": "🥑",
  "Other": "🍽️",
};
