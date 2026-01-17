import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    // Logging for debugging
    logging: {
        fetches: {
            fullUrl: true,
        },
    },
};

export default nextConfig;
