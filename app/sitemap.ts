import type { MetadataRoute } from 'next';
export default function sitemap():MetadataRoute.Sitemap {const base=process.env.NEXT_PUBLIC_SITE_URL||'http://localhost:3000';return [{url:base,lastModified:new Date(),changeFrequency:'weekly',priority:1},{url:`${base}/privacy`,lastModified:new Date(),priority:0.2},{url:`${base}/terms`,lastModified:new Date(),priority:0.2}]}
