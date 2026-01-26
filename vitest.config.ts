import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
    test: {
        environment: "node",
        globals: true,
        include: ["**/*.test.ts"],
        exclude: [
            "node_modules",
            ".next",
            // Custom runners (not Vitest) - run manually with `npx tsx`
            "**/activation-patches.test.ts",
            "**/plans-visibility.test.ts",
            "**/referrals.test.ts",
            "**/stripe-product-events-obs.test.ts",
        ],
    },
    resolve: {
        alias: {
            "@": resolve(__dirname, "./src"),
        },
    },
});
