// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title FractalRecipeRegistry
/// @notice Minimal registry that anchors AI-generated recipes on Base Sepolia for the Base Batches Builder Track submission.
contract FractalRecipeRegistry {
    struct Recipe {
        address creator;
        string dishName;
        string metadataURI;
        uint256 createdAt;
    }

    Recipe[] private recipes;

    event RecipeSynthesized(
        uint256 indexed recipeId,
        address indexed creator,
        string dishName,
        string metadataURI,
        uint256 timestamp
    );

    /// @notice Store a new recipe reference onchain.
    /// @param dishName The display name of the dish to store.
    /// @param metadataURI A data or IPFS URI pointing to the recipe payload.
    /// @return recipeId The index of the stored recipe.
    function storeRecipe(
        string calldata dishName,
        string calldata metadataURI
    ) external returns (uint256 recipeId) {
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
}
