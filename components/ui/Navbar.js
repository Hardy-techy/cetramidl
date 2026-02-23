import React from "react";
import UniversalWalletButton from "./UniversalWalletButton";
import { useWeb3 } from "../providers/web3";

export default function Navbar({accountAddress}) {
  const { isUniversal, chainId } = useWeb3();

  return (
    <>
      {/* Navbar */}
      <nav className="md:flex-row md:flex-nowrap md:justify-start flex items-center px-4 py-2 border bg-gray-700 border-gray-500">
        <div className="w-full mx-auto items-center flex justify-between md:flex-nowrap flex-wrap md:px-10 px-4">
          {/* Brand */}
          <div className="w-full flex items-center justify-between">
            <div className="flex gap-3 items-center">
              {" "}
              <a
                className="text-white text-sm hidden lg:inline-block font-semibold"
                href="#pablo"
                onClick={(e) => e.preventDefault()}
              >
                Dashboard
              </a>
              {isUniversal && (
                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded flex items-center gap-1">
                  <span>🌐</span>
                  <span>Universal Mode</span>
                  <span className="text-green-600">• Active</span>
                </span>
              )}
            </div>
            <div className="flex gap-3 items-center">
              <UniversalWalletButton />
            </div>
          </div>
          {/* Form */}

          {/* User */}
        </div>
      </nav>
      {/* End Navbar */}
    </>
  );
}
