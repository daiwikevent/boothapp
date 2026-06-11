/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  // Allow images from any hostname for generated outputs
  images: {
    remotePatterns: [],
  },
};

export default nextConfig;
