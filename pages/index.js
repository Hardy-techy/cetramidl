import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.push('/dashboard');
  }, [router]);

  return null;
}

// Prevent static generation - use server-side rendering
export async function getServerSideProps() {
  return {
    redirect: {
      destination: '/dashboard',
      permanent: false,
    },
  };
}
