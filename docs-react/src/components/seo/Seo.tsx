import React from 'react'
import { Helmet } from 'react-helmet-async'

export interface BreadcrumbItem {
  name: string
  url: string
}

export interface SEOProps {
  title: string
  description: string
  keywords?: string
  canonicalUrl?: string
  ogType?: 'website' | 'article'
  ogImage?: string
  ogImageAlt?: string
  breadcrumbs?: BreadcrumbItem[]
  structuredData?: Record<string, unknown> | Array<Record<string, unknown>>
  noindex?: boolean
}

export const SITE_URL = 'https://pgbloom.iotkit.in'
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.png`

export const Seo: React.FC<SEOProps> = ({
  title,
  description,
  keywords,
  canonicalUrl,
  ogType = 'website',
  ogImage = DEFAULT_OG_IMAGE,
  ogImageAlt = 'PGBloom — PostgreSQL-first infrastructure toolkit',
  breadcrumbs,
  structuredData,
  noindex = false,
}) => {
  const fullTitle = title.includes('PGBloom') ? title : `${title} | PGBloom`
  const canonical = canonicalUrl || (typeof window !== 'undefined' ? window.location.href.split('?')[0].split('#')[0] : SITE_URL)

  const schemaGraph: Record<string, unknown>[] = []

  if (breadcrumbs && breadcrumbs.length > 0) {
    schemaGraph.push({
      '@type': 'BreadcrumbList',
      itemListElement: breadcrumbs.map((crumb, idx) => ({
        '@type': 'ListItem',
        position: idx + 1,
        name: crumb.name,
        item: crumb.url.startsWith('http') ? crumb.url : `${SITE_URL}${crumb.url}`,
      })),
    })
  }

  if (structuredData) {
    if (Array.isArray(structuredData)) {
      schemaGraph.push(...structuredData)
    } else {
      schemaGraph.push(structuredData)
    }
  }

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}
      <link rel="canonical" href={canonical} />

      {noindex ? (
        <meta name="robots" content="noindex, follow" />
      ) : (
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
      )}

      {/* Open Graph */}
      <meta property="og:type" content={ogType} />
      <meta property="og:site_name" content="PGBloom" />
      <meta property="og:locale" content="en_US" />
      <meta property="og:url" content={canonical} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:alt" content={ogImageAlt} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />

      {/* Twitter Cards */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
      <meta name="twitter:image:alt" content={ogImageAlt} />
      <meta name="twitter:url" content={canonical} />

      {/* JSON-LD Schema */}
      {schemaGraph.length > 0 && (
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@graph': schemaGraph,
          })}
        </script>
      )}
    </Helmet>
  )
}
export default Seo
