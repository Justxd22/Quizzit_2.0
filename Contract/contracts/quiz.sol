// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title EscrowRefund
 * @dev Contract that holds funds until a static trusted backend authorizes a refund
 */
contract EscrowRefund {
    address public immutable trustedBackend;
    
    // Mapping of address to their deposited amount
    mapping(address => uint256) public deposits;
    
    // Events
    event Deposited(address indexed depositor, uint256 amount);
    event Refunded(address indexed receiver, uint256 amount);
    
    /**
     * @dev Set the trusted backend address as immutable
     */
    constructor(address _trustedBackend) {
        require(_trustedBackend != address(0), "Trusted backend cannot be zero address");
        trustedBackend = _trustedBackend;
    }
    
    /**
     * @dev Modifier to restrict function calls to trusted backend
     */
    modifier onlyTrustedBackend() {
        require(msg.sender == trustedBackend, "Only trusted backend can call this function");
        _;
    }
    
    /**
     * @dev Allow users to deposit ETH modify to be certain value only eg: $10
     */
    function deposit() external payable {
        require(msg.value > 0, "Must deposit some ETH");
        
        deposits[msg.sender] += msg.value;
        
        emit Deposited(msg.sender, msg.value);
    }
    
    /**
     * @dev Allow the trusted backend to refund a specific amount to a user
     * @param recipient The address to receive the refund
     * @param amount The amount to refund
     */
    function refund(address payable recipient, uint256 amount) external onlyTrustedBackend {
        require(deposits[recipient] >= amount, "Insufficient deposited funds");
        
        deposits[recipient] -= amount;
        (bool success, ) = recipient.call{value: amount}("");
        require(success, "Transfer failed");
        
        emit Refunded(recipient, amount);
    }
    
    /**
     * @dev Get the balance of the contract
     * @return The contract's balance
     */
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    /**
     * @dev Get the deposit amount of a specific address
     * @param depositor The address to check
     * @return The deposited amount
     */
    function getDeposit(address depositor) external view returns (uint256) {
        return deposits[depositor];
    }
}