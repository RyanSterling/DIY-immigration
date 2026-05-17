// @ts-check

/** @type {import("syncpack").RcFile} */
const config = {
  // Sort package.json keys consistently
  sortFirst: [
    "name",
    "version",
    "private",
    "description",
    "type",
    "main",
    "types",
    "exports",
    "scripts",
    "workspaces",
    "dependencies",
    "devDependencies",
    "peerDependencies",
  ],

  // Dependency types to manage
  dependencyTypes: ["prod", "dev", "peer", "resolutions", "overrides"],

  // Version groups for logical dependency groupings
  versionGroups: [
    // React ecosystem - must be identical across frontend apps
    {
      label: "React Ecosystem",
      packages: ["frontend", "admin"],
      dependencies: ["react", "react-dom", "@types/react", "@types/react-dom"],
      policy: "sameRange",
    },

    // React libraries - should match across frontend apps
    {
      label: "React Libraries",
      packages: ["frontend", "admin"],
      dependencies: [
        "@tanstack/react-query",
        "react-hook-form",
        "@hookform/resolvers",
        "react-router-dom",
        "react-toastify",
      ],
      policy: "sameRange",
    },

    // Tailwind ecosystem - identical across frontend apps
    {
      label: "Tailwind Ecosystem",
      packages: ["frontend", "admin"],
      dependencies: [
        "tailwindcss",
        "@tailwindcss/vite",
        "@tailwindcss/forms",
        "@tailwindcss/typography",
        "tailwind-merge",
      ],
      policy: "sameRange",
    },

    // Build tooling - consistent versions
    {
      label: "Build Tooling",
      packages: ["frontend", "admin"],
      dependencies: ["vite", "@vitejs/plugin-react", "typescript"],
      policy: "sameRange",
    },

    // ESLint ecosystem - consistent across frontend apps
    {
      label: "ESLint Ecosystem",
      packages: ["frontend", "admin"],
      dependencies: [
        "eslint",
        "@eslint/js",
        "typescript-eslint",
        "eslint-plugin-react-hooks",
        "eslint-plugin-react-refresh",
        "globals",
      ],
      policy: "sameRange",
    },

    // Shared across all packages - should use highest version
    {
      label: "Cross-Package Dependencies",
      packages: ["**"],
      dependencies: ["zod", "@supabase/supabase-js", "hono", "@types/node"],
      preferVersion: "highestSemver",
    },

    // TypeScript - standardize version range format
    {
      label: "TypeScript Version",
      packages: ["**"],
      dependencies: ["typescript"],
      policy: "sameRange",
    },

    // Internal workspace dependencies - use wildcard
    {
      label: "Workspace Dependencies",
      packages: ["**"],
      dependencies: ["@visaflow/shared"],
      pinVersion: "*",
    },
  ],

  // Semver groups for consistent version range formats
  semverGroups: [
    // Use caret (^) for most dependencies
    {
      label: "Use caret ranges by default",
      packages: ["**"],
      dependencies: ["**"],
      dependencyTypes: ["prod", "dev"],
      range: "^",
    },
    // Exception: TypeScript uses tilde (~) for patch-level updates only
    {
      label: "TypeScript uses tilde range",
      packages: ["**"],
      dependencies: ["typescript"],
      range: "~",
    },
    // Workspace dependencies use exact "*"
    {
      label: "Workspace dependencies use wildcard",
      packages: ["**"],
      dependencies: ["@visaflow/*"],
      range: "",
    },
  ],

  // Source files to analyze
  source: [
    "package.json",
    "backend/package.json",
    "frontend/package.json",
    "admin/package.json",
    "shared/package.json",
  ],
};

module.exports = config;
