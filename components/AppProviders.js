import { Web3Provider } from "./providers";
import { MidlProvider } from "@midl/react";
import { SatoshiKitProvider } from "@midl/satoshi-kit";
import { WagmiMidlProvider } from "@midl/executor-react";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { useState } from 'react';
import { midlConfig } from "../utils/midlConfig";
import { AddressPurpose } from "@midl/core";
import '@midl/satoshi-kit/styles.css';

export default function AppProviders({ children }) {
    const [queryClient] = useState(() => new QueryClient());

    return (
        <MidlProvider config={midlConfig}>
            <QueryClientProvider client={queryClient}>
                <WagmiMidlProvider>
                    <SatoshiKitProvider config={midlConfig} purposes={[AddressPurpose.Payment]}>
                        <Web3Provider>
                            {children}
                        </Web3Provider>
                    </SatoshiKitProvider>
                </WagmiMidlProvider>
            </QueryClientProvider>
        </MidlProvider>
    );
}
