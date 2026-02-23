import * as LendingAndBorrowingModule from '../abis/LendingAndBorrowing.json'


export const loadContract = async (contractName, web3) => {
  let contract = null;

  try {
    const contractAddress = process.env.NEXT_PUBLIC_LENDING_CONTRACT_ADDRESS;
    if (!contractAddress) return null;

    // Fix: Access default export for JSON
    const artifact = LendingAndBorrowingModule.default || LendingAndBorrowingModule;
    const abi = artifact.abi;

    if (!Array.isArray(abi)) return null;

    contract = new web3.eth.Contract(abi, contractAddress);
  }
  catch (err) {
    console.error("Contract load error:", err);
  }
  return contract;
};
