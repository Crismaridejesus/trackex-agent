import { MetadataRoute } from "next"
import { SEO } from "@/lib/constants"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/app/", "/_next/", "/admin/"],
      },
      {
        userAgent: "GPTBot",
        allow: ["/", "/llms.txt"],
      },
      {
        userAgent: "ChatGPT-User",
        allow: ["/", "/llms.txt"],
      },
      {
        userAgent: "Claude-Web",
        allow: ["/", "/llms.txt"],
      },
      {
        userAgent: "Anthropic-AI",
        allow: ["/", "/llms.txt"],
      },
    ],
    sitemap: `${SEO.url}/sitemap.xml`,
    host: SEO.url,
  }
}
