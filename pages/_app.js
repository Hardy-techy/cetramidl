import { Web3Provider } from "../components/providers";
import { MidlProvider } from "@midl/react";
import { SatoshiKitProvider } from "@midl/satoshi-kit";
import { WagmiMidlProvider } from "@midl/executor-react";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { useState, useEffect } from 'react';
import { midlConfig } from "../utils/midlConfig";
import { AddressPurpose } from "@midl/core";
import '@midl/satoshi-kit/styles.css';

import '../styles/globals.css'

function MyApp({ Component, pageProps }) {
  const [queryClient] = useState(() => new QueryClient());

  useEffect(() => {
    // Suppress annoying 3rd party wallet errors that don't affect functionality
    const originalError = console.error;
    console.error = (...args) => {
      if (
        /Access to fetch/.test(args[0]) ||
        /net::ERR_FAILED/.test(args[0]) ||
        /429 \(Too Many Requests\)/.test(args[0]) ||
        /JsonRpcProvider failed/.test(args[0])
      ) {
        // Ignore these known noise errors
        return;
      }
      originalError.apply(console, args);
    };

    // Cleanup function to restore original console.error when component unmounts
    return () => {
      console.error = originalError;
    };
  }, []); // Empty dependency array means this runs once on mount and cleans up on unmount

  return (
    <MidlProvider config={midlConfig}>
      <QueryClientProvider client={queryClient}>
        <WagmiMidlProvider>
          <SatoshiKitProvider config={midlConfig} purposes={[AddressPurpose.Payment]}>
            <Web3Provider>
              <Component {...pageProps} />
            </Web3Provider>
          </SatoshiKitProvider>
        </WagmiMidlProvider>
      </QueryClientProvider>
    </MidlProvider>
  )
}

export default MyApp

