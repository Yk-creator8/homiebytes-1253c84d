import { supabase } from "@/integrations/supabase/client";

const FALLBACK = "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=800&q=80";
export const FOOD_FALLBACK_IMAGE = FALLBACK;

/** Upload a food image to storage and return a long-lived signed URL. */
export async function uploadFoodImage(file: File, userId: string): Promise<string> {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error: upErr } = await supabase.storage.from("food-images").upload(path, file, {
    cacheControl: "31536000",
    upsert: false,
    contentType: file.type,
  });
  if (upErr) throw upErr;
  // 10-year signed URL
  const { data, error } = await supabase.storage.from("food-images").createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
  if (error || !data) throw error ?? new Error("Failed to sign url");
  return data.signedUrl;
}
