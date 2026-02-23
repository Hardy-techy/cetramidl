import { createMidlConfig } from "@midl/satoshi-kit";
import { regtest } from "@midl/core";
import { xverseConnector } from "@midl/connectors";

export const midlConfig = createMidlConfig({
  networks: [regtest],
  persist: true,
  connectors: [
    xverseConnector()
  ]
});
