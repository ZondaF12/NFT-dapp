import "./App.css";
import { Contract, providers, Signer, utils } from "ethers";
import React, { useEffect, useRef, useState } from "react";
import Web3Modal, { checkInjectedProviders } from "web3modal";
import { abi, NFT_CONTRACT_ADDRESS } from "./constants";

function App() {
  // walletConnected keeps track of whether the users wallet is connected or not
  const [walletConnected, setWalletConnected] = useState(false);
  // presaleStarted keeps track of whether the presale has started or not
  const [presaleStarted, setPresaleStarted] = useState(false);
  // presaleEnded keeps track of whether the presale has ended
  const [presaleEnded, setPresaleEnded] = useState(false);
  // Loading is set to true when we are waiting for a transaction to get mined
  const [loading, setLoading] = useState(false);
  // checks if the currently connected MM wallet is the owner of the contract
  const [isOwner, setIsOwner] = useState(false);
  // tokenIdsMinted keeps track of the number of tokenIds that have been minted
  const [tokenIdsMinted, setTokenIdsMinted] = useState("0");
  // create a reference to the Web3Modal (that is used for connecting to MM) which persists as long as the page is open
  const web3ModalRef = useRef();

  // presaleMint: Mint an NFT during the presale
  const presaleMint = async () => {
    try {
      // A signer is required here as it is a "write" transaction
      const signer = await getProviderOrSigner(true);
      // create a new instance of the Contract with a signer, which allows update methods
      const whitelistContract = new Contract(NFT_CONTRACT_ADDRESS, abi, signer);
      // Call the presaleMint from the contract, only whitelisted addresses would be able to mint
      const tx = await whitelistContract.presaleMint({
        // value signifies the cost of one of the NFTs which is 0.01 eth each
        // 0.01 is parsed via the ethers.js library
        value: utils.parseEther("0.01"),
      });
      setLoading(true);
      // wait for the transaction to get mined
      await tx.wait();
      setLoading(false);
      window.alert("Sucessfully Minted!");
    } catch (err) {
      console.error(err);
    }
  };

  //publicMint is called to mint an NFT after the presale
  const publicMint = async () => {
    try {
      // Once again a signer is required here as it is a "write" transaction
      const signer = await getProviderOrSigner(true);
      // create a new instance of the Contract with a signer, which allows update methods
      const whitelistContract = new Contract(NFT_CONTRACT_ADDRESS, abi, signer);
      // Call tge mint from the contract to mint the NFT
      const tx = await whitelistContract.mint({
        // value signifies the cost of one of the NFTs which is 0.01 eth each
        // 0.01 is parsed via the ethers.js library
        value: utils.parseEther("0.01"),
      });
      setLoading(true);
      // Wait for the transaction to get mined
      await tx.wait();
      setLoading(false);
      window.alert("Successfully Minted");
    } catch (err) {
      console.error(err);
    }
  };

  // connectWallet is  used to connect to the MM wallet
  const connectWallet = async () => {
    try {
      // Get the provider from web3Modal which is MM in this case
      // When used for the first time it prompts the user to connect their wallet
      await getProviderOrSigner();
      setWalletConnected(true);
    } catch (err) {
      console.error(err);
    }
  };

  // startPresale starts the presale of the collection
  const startPresale = async () => {
    try {
      const signer = await getProviderOrSigner(true);
      const whitelistContract = new Contract(NFT_CONTRACT_ADDRESS, abi, signer);
      // Call startPresale from the contract
      const tx = await whitelistContract.startPresale();

      setLoading(true);
      await tx.wait();
      setLoading(false);
      await checkIfPresaleStarted();
    } catch (err) {
      console.error(err);
    }
  };

  // checkIfPresaleStarted checks if the presale has started by querying the presaleStarted variable in the contract
  const checkIfPresaleStarted = async () => {
    try {
      // get the provider info from MM, no need for a signer as only the state is being read from the blockchain
      const provider = await getProviderOrSigner();
      // connect to the contract using a provider so we will only have read-only access to the contract
      const nftContract = new Contract(NFT_CONTRACT_ADDRESS, abi, provider);
      // call presaleStarted from the contract
      const _presaleStarted = await nftContract.presaleStarted();
      if (!_presaleStarted) {
        await getOwner();
      }
      setPresaleStarted(_presaleStarted);
      return _presaleStarted;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  // checkIfPresaleEnded checks if the presale has ended by querying the "presaleEnded" variable in the contract
  const checkIfPresaleEnded = async () => {
    try {
      const provider = await getProviderOrSigner();
      const nftContract = new Contract(NFT_CONTRACT_ADDRESS, abi, provider);

      const _presaleEnded = await nftContract.presaleEnded();
      // _presaleEnded is a Big Number, so we are using the lt(less than function) insteal of `<`
      // Date.now()/1000 returns the current time in seconds
      // We compare if the _presaleEnded timestamp is less than the current time
      // which means presale has ended
      const hasEnded = _presaleEnded.lt(Math.floor(Date.now() / 1000));
      if (hasEnded) {
        setPresaleEnded(true);
      } else {
        setPresaleEnded(false);
      }
      return hasEnded;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const getOwner = async () => {
    try {
      const provider = await getProviderOrSigner();
      const nftContract = new Contract(NFT_CONTRACT_ADDRESS, abi, provider);
      // call the owner function from the contract
      const _owner = await nftContract.owner();
      // We will get the signer now to extract the address of the currently connected MetaMask account
      const signer = await getProviderOrSigner(true);
      // Get the address associated to the signer which is connected to  MetaMask
      const address = await signer.getAddress();
      if (address.toLowerCase() === _owner.toLowerCase()) {
        setIsOwner(true);
      }
    } catch (err) {
      console.error(err.message);
    }
  };

  const getTokenIdsMinted = async () => {
    try {
      const provider = await getProviderOrSigner();
      const nftContract = new Contract(NFT_CONTRACT_ADDRESS, abi, provider);
      // call the tokenIds from the contract
      const _tokenIds = await nftContract.tokenIds();
      //_tokenIds is a `Big Number`. We need to convert the Big Number to a string
      setTokenIdsMinted(_tokenIds.toString());
    } catch (err) {
      console.error(err);
    }
  };

  const getProviderOrSigner = async (needSigner = false) => {
    const provider = await web3ModalRef.current.connect();
    const web3Provider = new providers.Web3Provider(provider);

    const { chainId } = await web3Provider.getNetwork();
    if (chainId !== 4) {
      window.alert("Please change to the Rinkeby network");
      throw new Error("Please change to the Rinkeby network");
    }

    if (needSigner) {
      const signer = web3Provider.getSigner();
      return signer;
    }
    return web3Provider;
  };

  // useEffects are used to react to changes in state of the website
  // The array at the end of function call represents what state changes will trigger this effect
  // In this case, whenever the value of `walletConnected` changes - this effect will be called
  useEffect(() => {
    // if wallet is not connected, create a new instance of Web3Modal and connect the MetaMask wallet
    if (!walletConnected) {
      // Assign the Web3Modal class to the reference object by setting it's `current` value
      // The `current` value is persisted throughout as long as this page is open
      web3ModalRef.current = new Web3Modal({
        network: "rinkeby",
        providerOptions: {},
        disableInjectedProvider: false,
      });
      connectWallet();

      // Check if presale has started and ended
      const _presaleStarted = checkIfPresaleStarted();
      if (_presaleStarted) {
        checkIfPresaleEnded();
      }

      getTokenIdsMinted();

      // Set an interval which gets called every 5 seconds to check presale has ended
      const presaleEndedInterval = setInterval(async function () {
        const _presaleStarted = await checkIfPresaleStarted();
        if (_presaleStarted) {
          const _presaleEnded = await checkIfPresaleEnded();
          if (_presaleEnded) {
            clearInterval(presaleEndedInterval);
          }
        }
      }, 5 * 1000);

      // set an interval to get the number of token Ids minted every 5 seconds
      setInterval(async function () {
        await getTokenIdsMinted();
      }, 5 * 1000);
    }
  }, [walletConnected]);

  /*
      renderButton: Returns a button based on the state of the dapp
    */
  const renderButton = () => {
    // If wallet is not connected, return a button which allows them to connect their wllet
    if (!walletConnected) {
      return (
        <button onClick={connectWallet} className="button">
          Connect your wallet
        </button>
      );
    }

    // If we are currently waiting for something, return a loading button
    if (loading) {
      return <button className="button">Loading...</button>;
    }

    // If connected user is the owner, and presale hasnt started yet, allow them to start the presale
    if (isOwner && !presaleStarted) {
      return (
        <button className="button" onClick={startPresale}>
          Start Presale!
        </button>
      );
    }

    // If connected user is not the owner but presale hasn't started yet, tell them that
    if (!presaleStarted) {
      return (
        <div>
          <div className="description">Presale hasnt started!</div>
        </div>
      );
    }

    // If presale started, but hasn't ended yet, allow for minting during the presale period
    if (presaleStarted && !presaleEnded) {
      return (
        <div>
          <div className="description">
            Presale has started!!! If your address is whitelisted, Mint Mudded
            NFT 🥳
          </div>
          <button className="button" onClick={presaleMint}>
            Presale Mint 🚀
          </button>
        </div>
      );
    }

    // If presale started and has ended, its time for public minting
    if (presaleStarted && presaleEnded) {
      return (
        <button className="button" onClick={publicMint}>
          Public Mint 🚀
        </button>
      );
    }
  };

  return (
    <div>
      <div>
        <title>Mudded NFT</title>
        <meta name="description" content="Whitelist-Dapp" />
      </div>
      <div className="main">
        <div>
          <h1 className="title">Welcome to Mudded NFT</h1>
          <div className="description">
            An NFT Collection for NFT enthusiasts
          </div>
          <div className="description">
            {tokenIdsMinted}/20 have been minted
          </div>
          {renderButton()}
        </div>
      </div>
      <footer className="footer">Made by Ruaridh</footer>
    </div>
  );
}

export default App;
