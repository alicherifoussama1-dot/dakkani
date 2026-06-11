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
};

export default pwaConfig(nextConfig);
