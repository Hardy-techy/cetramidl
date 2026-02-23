import { ConnectButton } from '@midl/satoshi-kit';

export default function UniversalWalletButton() {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
        🌐 Universal
      </span>
      <ConnectButton />
    </div>
  );
}
