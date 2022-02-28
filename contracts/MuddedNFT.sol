// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./IWhitelist.sol";

contract MuddedNFT is ERC721Enumerable, Ownable {

    string _baseTokenURI;

    // Price of the Mudded NFT
    uint256 public _price = 0.01 ether;

    // _paused is to be used to pause the contract incase of an emergency
    bool public _paused;

    // max number of Mudded NFTs
    uint256 public maxTokenIds = 20;

    // total number of tokens minted
    uint256 public tokenIds;

    // whitelist contract instance
    IWhitelist whitelist;

    // boolen to keep track of when the presale started
    bool public presaleStarted;

    // timestamp for when presale will end
    uint256 public presaleEnded;

    modifier onlyWhenNotPaused {
        require(!_paused, "Contract is currently paused");
        _;
    }

    /**
    * @dev ERC721 constructor takes in a `name` and a `symbol` to the token collection.
    * name in our case is `Mudded NFT` and symbol is `MUD`.
    * Constructor for MuddedNFT takes in the baseURI to set _baseTokenURI for the collection.
    * It also initialises an instance of whitelist interface.
    */
    constructor(string memory baseURI, address whitelistContract) ERC721("Mudded NFT", "MUD") {
        _baseTokenURI = baseURI;
        whitelist = IWhitelist(whitelistContract);
    }

    // @dev startPresale starts a presale for the whitelisted addresses
    function startPresale() public onlyOwner {
        presaleStarted = true;
        // Set presaleEnded time as the current time + 5 mins
        presaleEnded = block.timestamp + 5 minutes;
    }

    // @dev presaleMint allows a user to mint one NFT per transaction during the presale
    function presaleMint() public payable onlyWhenNotPaused {
        require(presaleStarted && block.timestamp < presaleEnded, "Presale is not active");
        require(whitelist.whitelistedAddresses(msg.sender), "You are not whitelisted");
        require(tokenIds < maxTokenIds, "SOLD OUT!");
        require(msg.value >= _price, "Insufficient ether amount sent");
        tokenIds += 1;
        // _safe<int is a safer version of the _mint function as it ensures that if the address being minted to is a contract
        // This way it knows how to deal with ERC721 tokens, if the address is not a contract it will function the same way as _mint
        _safeMint(msg.sender, tokenIds);
    }

    // @dev mint allows a user to mint 1 NFT per transaction after the presale has ended
    function mint() public payable onlyWhenNotPaused {
        require(presaleStarted && block.timestamp >= presaleEnded, "Presale has not finished");
        require(tokenIds < maxTokenIds, "SOLD OUT");
        require(msg.value >= _price, "Insufficient ether amount sent");
        tokenIds += 1;
        _safeMint(msg.sender, tokenIds);
    }

    // @dev _baseURI overrides the Openzeppelins ERC721 implementation which by default returned an empty string for the baseURI
    function _baseURI() internal view virtual override returns (string memory) {
        return _baseTokenURI;
    }

    // @dev setPaused makes the contract paused or unpaused
    function setPaused(bool val) public onlyOwner {
        _paused = val;
    }

    // @dev withdraw sends all the ether in the contract to the owner of the contract
    function withdraw() public onlyOwner {
        address _owner = owner();
        uint256 amount = address(this).balance;
        (bool sent, ) = _owner.call{value: amount}("");
        require(sent, "Failed to send ether");
    }

    // Function to recieve ether, msg.data must be empty
    receive() external payable {}

    // Fallback function is called when msg.data is not empty
    fallback() external payable {}
}