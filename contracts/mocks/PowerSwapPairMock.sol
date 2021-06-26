// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "@powerswap/core/contracts/UniswapV2Pair.sol";

contract PowerSwapPairMock is UniswapV2Pair {
    constructor() public UniswapV2Pair() {}
}
