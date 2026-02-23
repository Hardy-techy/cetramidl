import { useEffect } from 'react';
import dynamic from 'next/dynamic';
import '../styles/globals.css'

const AppProviders = dynamic(() => import('../components/AppProviders'), {
  ssr: false,
});

export default function MyApp({ Component, pageProps }) {
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
    <AppProviders>
      <Component {...pageProps} />
    </AppProviders>
  )
}
