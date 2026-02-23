import { ConnectButton } from '@midl/satoshi-kit';
import Link from 'next/link';
import { useRouter } from 'next/router';
import CetraLogo from './CetraLogo';

export default function ModernNavbar() {
    const router = useRouter();
    const isActive = (path) => router.pathname === path;

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0B0E14]/60 backdrop-blur-xl">
            <div className="max-w-7xl mx-auto px-6 lg:px-8">
                <div className="flex items-center justify-between h-[72px]">

                    {/* Logo Section */}
                    <div className="flex items-center">
                        <Link href="/">
                            <div className="flex items-center cursor-pointer transition-opacity duration-200 hover:opacity-80">
                                <CetraLogo size={28} color="#2563EB" />
                            </div>
                        </Link>
                    </div>

                    {/* Navigation Links */}
                    <div className="hidden md:flex items-center gap-1">
                        <Link href="/dashboard">
                            <div className={`px-5 py-2 rounded-lg text-[15px] font-medium transition-all duration-200 cursor-pointer ${isActive('/dashboard')
                                ? 'bg-[#1C1C1E] text-white border border-[#2C2C2E]'
                                : 'text-gray-400 hover:text-white hover:bg-[#1C1C1E]/50'
                                }`}>
                                Dashboard
                            </div>
                        </Link>
                        <Link href="/market">
                            <div className={`px-5 py-2 rounded-lg text-[15px] font-medium transition-all duration-200 cursor-pointer ${isActive('/market')
                                ? 'bg-[#1C1C1E] text-white border border-[#2C2C2E]'
                                : 'text-gray-400 hover:text-white hover:bg-[#1C1C1E]/50'
                                }`}>
                                Markets
                            </div>
                        </Link>
                    </div>

                    {/* Wallet Connection */}
                    <div className="flex items-center">
                        <div className="push-wallet-button">
                            <style jsx>{`
                                .push-wallet-button :global(button) {
                                    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%) !important;
                                    border: 1px solid rgba(59, 130, 246, 0.3) !important;
                                    border-radius: 10px !important;
                                    transition: all 0.2s ease !important;
                                    padding: 0 20px !important;
                                    font-size: 14px !important;
                                    font-weight: 600 !important;
                                    height: 40px !important;
                                    color: white !important;
                                    box-shadow: 0 2px 8px rgba(37, 99, 235, 0.25) !important;
                                    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", sans-serif !important;
                                    letter-spacing: -0.01em !important;
                                }
                                .push-wallet-button :global(button:hover) {
                                    transform: translateY(-1px) !important;
                                    box-shadow: 0 4px 12px rgba(37, 99, 235, 0.35) !important;
                                    border-color: rgba(59, 130, 246, 0.5) !important;
                                }
                                .push-wallet-button :global(button:active) {
                                    transform: translateY(0) !important;
                                }
                            `}</style>
                            <ConnectButton />
                        </div>
                    </div>

                </div>
            </div>
        </nav>
    );
}
