import { createSystem, defaultConfig, defineConfig } from "@chakra-ui/react";

export const liquidGlassStyles = {
  backdropFilter: "blur(12px)",
  bg: "rgba(255, 255, 255, 0.05)",
  border: "1px solid rgba(255, 255, 255, 0.1)",
  boxShadow: "0 4px 30px rgba(0, 0, 0, 0.1)",
};

const config = defineConfig({
  theme: {
    tokens: {
      colors: {
        brand: {
          50: { value: "#e6fffa" },
          100: { value: "#b2f5ea" },
          200: { value: "#81e6d9" },
          300: { value: "#4fd1c5" },
          400: { value: "#38b2ac" },
          500: { value: "#319795" },
          600: { value: "#2c7a7b" },
          700: { value: "#285e61" },
          800: { value: "#234e52" },
          900: { value: "#1d4044" },
        },
      },
    },
    semanticTokens: {
      colors: {
        brand: {
          solid: { value: "{colors.brand.500}" },
          contrast: { value: "{colors.brand.100}" },
          fg: { value: "{colors.brand.700}" },
          muted: { value: "{colors.brand.200}" },
          subtle: { value: "{colors.brand.100}" },
          emphasized: { value: "{colors.brand.300}" },
          focusRing: { value: "{colors.brand.500}" },
        },
        background: {
          default: { value: "#09090b" },
          canvas: { value: "#18181b" },
          panel: { value: "#18181b" },
          subtle: { value: "#27272a" },
        },
        text: {
          default: { value: "#f4f4f5" },
          muted: { value: "#a1a1aa" },
          inverted: { value: "#09090b" },
        },
        border: {
          default: { value: "#27272a" },
          muted: { value: "#27272a" },
        },
      },
    },
    textStyles: {
      "liquid-glass": {
        value: liquidGlassStyles,
      },
    },
  },
});

export const system = createSystem(defaultConfig, config);
