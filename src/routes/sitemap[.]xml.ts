import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";

const BASE_URL = "https://homiebytes.lovable.app";

interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const entries: SitemapEntry[] = [
          { path: "/", changefreq: "daily", priority: "1.0" },
          { path: "/browse", changefreq: "daily", priority: "0.9" },
        ];

        try {
          const { data: foods } = await supabase
            .from("food_items")
            .select("id,created_at")
            .eq("is_available", true)
            .limit(1000);
          for (const f of foods ?? []) {
            entries.push({
              path: `/food/${f.id}`,
              lastmod: f.created_at ? new Date(f.created_at).toISOString().slice(0, 10) : undefined,
              changefreq: "weekly",
              priority: "0.7",
            });
          }

          const { data: cooks } = await supabase
            .from("public_profiles")
            .select("id")
            .limit(1000);
          for (const c of cooks ?? []) {
            entries.push({ path: `/cooks/${c.id}`, changefreq: "weekly", priority: "0.6" });
          }
        } catch {
          // best-effort; ship base entries even if DB read fails
        }

        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${BASE_URL}${e.path}</loc>`,
            e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ].filter(Boolean).join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
