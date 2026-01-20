import { Metadata } from "next"
import { SEO, APP_NAME } from "./constants"

export interface SEOProps {
  title?: string
  description?: string
  keywords?: string
  image?: string
  url?: string
  type?: "website" | "article"
  publishedTime?: string
  modifiedTime?: string
  author?: string
  noindex?: boolean
}

export function generateMetadata({
  title,
  description,
  keywords,
  image,
  url,
  type = "website",
  publishedTime,
  modifiedTime,
  author,
  noindex = false,
}: SEOProps = {}): Metadata {
  const metaTitle = title || SEO.title
  const metaDescription = description || SEO.description
  const metaImage = image || SEO.url + "/og-image.png"
  const metaUrl = url ? SEO.url + url : SEO.url
  const metaKeywords = keywords || SEO.keywords

  const openGraphData = {
    title: metaTitle,
    description: metaDescription,
    url: metaUrl,
    siteName: APP_NAME,
    images: [
      {
        url: metaImage,
        width: 1200,
        height: 630,
        alt: metaTitle,
      },
    ],
    locale: "en_US",
    type,
    ...(publishedTime && { publishedTime }),
    ...(modifiedTime && { modifiedTime }),
  }

  return {
    title: metaTitle,
    description: metaDescription,
    keywords: metaKeywords,
    authors: author ? [{ name: author }] : [{ name: APP_NAME }],
    openGraph: openGraphData,
    twitter: {
      card: "summary_large_image",
      title: metaTitle,
      description: metaDescription,
      images: [metaImage],
      creator: "@trackexapp",
      site: "@trackexapp",
    },
    robots: noindex
      ? { index: false, follow: false }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-video-preview": -1,
            "max-image-preview": "large",
            "max-snippet": -1,
          },
        },
    alternates: {
      canonical: metaUrl,
    },
  }
}

export function generateArticleSchema({
  title,
  description,
  url,
  publishedTime,
  modifiedTime,
  author,
  image,
}: {
  title: string
  description: string
  url: string
  publishedTime: string
  modifiedTime?: string
  author: string
  image?: string
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description: description,
    image: image || SEO.url + "/og-image.png",
    datePublished: publishedTime,
    dateModified: modifiedTime || publishedTime,
    author: {
      "@type": "Person",
      name: author,
    },
    publisher: {
      "@type": "Organization",
      name: APP_NAME,
      logo: {
        "@type": "ImageObject",
        url: SEO.url + "/logo.png",
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": SEO.url + url,
    },
  }
}

export function generateOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: APP_NAME,
    url: SEO.url,
    logo: SEO.url + "/logo.png",
    description: SEO.description,
    foundingDate: "2024",
    sameAs: [
      "https://twitter.com/trackexapp",
      "https://linkedin.com/company/trackex",
    ],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer service",
      email: "support@trackex.app",
      availableLanguage: "English",
    },
  }
}

export function generateProductSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: APP_NAME,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Windows, macOS",
    description: SEO.description,
    url: SEO.url,
    offers: [
      {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
        name: "Starter Plan",
        description: "Free for 1 employee - No credit card required",
      },
      {
        "@type": "Offer",
        price: "5",
        priceCurrency: "USD",
        name: "Team Plan",
        description: "Per employee per month - Unlimited employees",
      },
      {
        "@type": "Offer",
        name: "Enterprise Plan",
        description: "Custom pricing for large organizations with API access",
      },
    ],
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.9",
      ratingCount: "89",
      bestRating: "5",
      worstRating: "1",
    },
    featureList: [
      "Real-time app monitoring",
      "Productivity scoring",
      "Automatic idle detection",
      "Screenshot capture",
      "Cross-platform Mac and Windows",
      "Team analytics and reports",
    ],
  }
}

export function generateFAQSchema(faqs: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  }
}

export function generateBreadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: SEO.url + item.url,
    })),
  }
}

export function generateWebPageSchema({
  title,
  description,
  url,
}: {
  title: string
  description: string
  url: string
}) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: title,
    description: description,
    url: SEO.url + url,
    isPartOf: {
      "@type": "WebSite",
      name: APP_NAME,
      url: SEO.url,
    },
    publisher: {
      "@type": "Organization",
      name: APP_NAME,
    },
  }
}
