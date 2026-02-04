/** @type {import('next').NextConfig} */
const nextConfig = {
  // Reduce noise in development
  onDemandEntries: {
    // Period (in ms) where the server will keep pages in the buffer
    maxInactiveAge: 25 * 1000,
    // Number of pages that should be kept simultaneously without being disposed
    pagesBufferLength: 2,
  },
  // Improve Fast Refresh
  reactStrictMode: true,
  // Reduce console noise
  logging: {
    fetches: {
      fullUrl: false,
    },
  },
};

export default nextConfig;

