import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb', // Podés ajustarlo a '5mb', '10mb', etc. según el tamaño de tus imágenes
    },
  },
};

export default nextConfig;