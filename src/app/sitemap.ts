import type { MetadataRoute } from "next";
import { siteOrigin } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = siteOrigin();
  return [
    { url: origin, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${origin}/registreren`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${origin}/inloggen`, changeFrequency: "monthly", priority: 0.6 },
  ];
}
