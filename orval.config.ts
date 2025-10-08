import type { ConfigExternal } from "orval";

// Orval configuration for generating a typed Axios client from the Biatec Scan OpenAPI spec
const config: ConfigExternal = {
  api: {
    input: "https://algorand-trades.de-4.biatec.io/swagger/v1/swagger.json",
    output: {
      target: "src/api/index.ts",
      schemas: "src/api/models",
      client: "axios",
      baseUrl: "https://algorand-trades.de-4.biatec.io",
      // allow consumers to override baseURL at runtime if needed
      override: {
        mutator: {
          path: "src/api/axios-instance.ts",
          name: "axiosInstance",
        },
      },
    },
  },
};

export default config;
