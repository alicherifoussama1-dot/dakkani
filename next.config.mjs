// @ts-check
import withPWA from "next-pwa";

const pwaConfig = withPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development" || process.env.DISABLE_PWA === "true",
  // Note: 'fallbacks.document' is not supported in App Router (requires Pages Router _document)
  // Use the catch-all runtimeCaching rule below for offline support
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
      handler: "CacheFirst",
      options: {
        cacheName: "google-fonts",
        expiration: { maxEntries: 4, maxAgeSeconds: 365 * 24 * 60 * 60 },
      },
    },
    {
      urlPattern: /\.(?:eot|otf|ttc|ttf|woff|woff2|font.css)$/i,
      handler: "StaleWhileRevalidate",
      options: { cacheName: "static-font-assets" },
    },
    {
      urlPattern: /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "static-image-assets",
        expiration: { maxEntries: 128, maxAgeSeconds: 30 * 24 * 60 * 60 },
      },
    },
    {
      urlPattern: /\/_next\/static.+\.js$/i,
      handler: "CacheFirst",
      options: {
        cacheName: "next-static-js-assets",
        expiration: { maxEntries: 64, maxAgeSeconds: 7 * 24 * 60 * 60 },
      },
    },
    {
      urlPattern: /\/_next\/image\?url=.+$/i,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "next-image",
        expiration: { maxEntries: 128, maxAgeSeconds: 24 * 60 * 60 },
      },
    },
    {
      urlPattern: /\/_next\/data\/.+\/.+\.json$/i,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "next-data",
        expiration: { maxEntries: 32, maxAgeSeconds: 24 * 60 * 60 },
      },
    },
    {
      urlPattern: /\/store\/[^/]+\/product\/.+/i,
      handler: "NetworkFirst",
      options: {
        cacheName: "product-pages",
        expiration: { maxEntries: 64, maxAgeSeconds: 24 * 60 * 60 },
        networkTimeoutSeconds: 10,
      },
    },
    {
      urlPattern: /\/api\/.*$/i,
      handler: "NetworkFirst",
      method: "GET",
      options: {
        cacheName: "api-cache",
        expiration: { maxEntries: 16, maxAgeSeconds: 5 * 60 },
        networkTimeoutSeconds: 8,
      },
    },
    {
      urlPattern: /.*/i,
      handler: "NetworkFirst",
      options: {
        cacheName: "others",
        expiration: { maxEntries: 32, maxAgeSeconds: 24 * 60 * 60 },
        networkTimeoutSeconds: 10,
      },
    },
  ],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  productionBrowserSourceMaps: false,
  swcMinify: true,
  transpilePackages: ['framer-motion'],
  images: {
    // ── Vercel Image Optimization is bypassed on purpose ──
    //
    // The optimizer began returning 402 OPTIMIZED_IMAGE_REQUEST_PAYMENT_REQUIRED
    // once the account's transformation quota ran out. Every product image in
    // Supabase Storage still returns 200 with a valid content-type — verified
    // across all products — but /_next/image served nothing, so storefronts
    // rendered blank tiles. The only products that kept working were the ones
    // whose transformations were already in the edge cache, which is why the
    // failure looked arbitrary rather than quota-shaped.
    //
    // `unoptimized` makes <Image> emit the Supabase URL directly. It keeps
    // every layout prop (fill, sizes, priority, lazy loading) working, so no
    // component changes are needed and nothing about the markup shifts.
    //
    // Cost, measured rather than assumed: originals average ~1.35MB and the
    // largest is ~3.4MB, so pages now transfer more bytes than the WebP the
    // optimizer used to emit. The fix that restores compression WITHOUT
    // depending on Vercel is enabling Supabase Image Transformation — its
    // /render/image endpoint currently answers 403 FeatureNotEnabled. Once
    // that is on, replace this flag with a custom `loader` pointing at it.
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "*.supabase.in" },
    ],
  },
  experimental: {
    serverComponentsExternalPackages: ["jsbarcode", "bwip-js", "sharp"],
    optimizePackageImports: ["framer-motion", "lucide-react", "recharts"],
  },
  async rewrites() {
    return [
      { source: "/store/:slug",                        destination: "/:slug" },
      { source: "/store/:slug/products",               destination: "/:slug/products" },
      { source: "/store/:slug/product/:product",       destination: "/:slug/product/:product" },
      { source: "/store/:slug/checkout",               destination: "/:slug/checkout" },
      { source: "/store/:slug/order-confirmation",     destination: "/:slug/order-confirmation" },
    ];
  },
  // Enterprise security headers on every response (helmet-equivalent for Next.js).
  // SAMEORIGIN (not DENY): the store builder previews storefronts in a
  // same-origin iframe; cross-origin framing stays blocked.
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(), payment=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
        ],
      },
      {
        // Platform Admin gets the strictest policy: no caching of any kind.
        source: "/platform/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, must-revalidate" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
    ];
  },
};

export default pwaConfig(nextConfig);
