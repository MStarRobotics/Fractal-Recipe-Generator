// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title FractalRecipeRegistry
/// @notice Minimal registry that anchors AI-generated recipes on Base Sepolia for the Base Batches Builder Track submission.
contract FractalRecipeRegistry {
    address public immutable owner;
    uint256 public constant LIFETIME_MEMBERSHIP_PRICE = 0.01 ether;

    struct Recipe {
        address creator;
        string dishName;
        string metadataURI;
        uint256 createdAt;
    }

    Recipe[] private recipes;
    mapping(address => bool) private lifetimeMembers;

    event RecipeSynthesized(
        uint256 indexed recipeId,
        address indexed creator,
        string dishName,
        string metadataURI,
        uint256 timestamp
    );

    event LifetimeMembershipPurchased(address indexed member, uint256 amountPaid);

    modifier onlyLifetimeMember() {
        require(lifetimeMembers[msg.sender], "Membership required");
        _;
    }

    constructor() {
        owner = msg.sender;
        lifetimeMembers[msg.sender] = true;
    }

    /// @notice Store a new recipe reference onchain.
    /// @param dishName The display name of the dish to store.
    /// @param metadataURI A data or IPFS URI pointing to the recipe payload.
    /// @return recipeId The index of the stored recipe.
    function storeRecipe(
        string calldata dishName,
        string calldata metadataURI
    ) external onlyLifetimeMember returns (uint256 recipeId) {
        require(bytes(dishName).length > 0, "Dish required");
        require(bytes(metadataURI).length > 0, "Metadata required");

        recipes.push(
            Recipe({
                creator: msg.sender,
                dishName: dishName,
                metadataURI: metadataURI,
                createdAt: block.timestamp
            })
        );

        recipeId = recipes.length - 1;
        emit RecipeSynthesized(recipeId, msg.sender, dishName, metadataURI, block.timestamp);
    }

    /// @notice Purchase lifetime membership to anchor recipes.
    function purchaseLifetimeMembership() external payable {
        require(!lifetimeMembers[msg.sender], "Already a lifetime member");
        require(msg.value >= LIFETIME_MEMBERSHIP_PRICE, "Insufficient payment");

        lifetimeMembers[msg.sender] = true;
        emit LifetimeMembershipPurchased(msg.sender, msg.value);
    }

    /// @notice Check the membership status of an address.
    function isLifetimeMember(address account) external view returns (bool) {
        return lifetimeMembers[account];
    }

    /// @notice Total number of stored recipes.
    function totalRecipes() external view returns (uint256) {
        return recipes.length;
    }

    /// @notice Retrieve a single recipe by id.
    function getRecipe(uint256 recipeId) external view returns (Recipe memory) {
        require(recipeId < recipes.length, "Invalid id");
        return recipes[recipeId];
    }

    /// @notice Retrieve a window of recipes. Useful for pagination.
    function getRecipes(uint256 offset, uint256 limit) external view returns (Recipe[] memory items) {
        if (recipes.length == 0 || limit == 0) {
            return new Recipe[](0);
        }

        if (offset >= recipes.length) {
            return new Recipe[](0);
        }

        uint256 end = offset + limit;
        if (end > recipes.length) {
            end = recipes.length;
        }

        uint256 size = end - offset;
        items = new Recipe[](size);
        for (uint256 i = 0; i < size; i++) {
            items[i] = recipes[offset + i];
        }
    }

    /// @notice Withdraw collected membership fees to a recipient address.
    function withdraw(address payable recipient) external {
        require(msg.sender == owner, "Only owner");
        require(recipient != address(0), "Invalid recipient");

        uint256 balance = address(this).balance;
        require(balance > 0, "Nothing to withdraw");
        recipient.transfer(balance);
    }
}
