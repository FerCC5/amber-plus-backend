// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title AmberPlus
 * @notice Registro on-chain de alertas y donaciones para Amber+ Fénix
 */
contract AmberPlus {
    address public owner;
    uint256 public alertFee;

    struct OnChainAlert {
        address reporter;
        uint256 registeredAt;
        uint256 feePaid;
        bool exists;
    }

    mapping(bytes32 => OnChainAlert) public alerts;

    event AlertRegistered(
        bytes32 indexed backendAlertId,
        address indexed reporter,
        uint256 feePaid
    );

    event DonationReceived(
        address indexed donor,
        bytes32 indexed alertId,
        uint256 amount
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor(uint256 _alertFee) {
        owner = msg.sender;
        alertFee = _alertFee;
    }

    function registerAlert(bytes32 backendAlertId) external payable {
        require(!alerts[backendAlertId].exists, "Alert already registered");
        require(msg.value >= alertFee, "Insufficient alert fee");

        alerts[backendAlertId] = OnChainAlert({
            reporter: msg.sender,
            registeredAt: block.timestamp,
            feePaid: msg.value,
            exists: true
        });

        emit AlertRegistered(backendAlertId, msg.sender, msg.value);
    }

    function donate(bytes32 backendAlertId) external payable {
        require(msg.value > 0, "No value");
        emit DonationReceived(msg.sender, backendAlertId, msg.value);
    }

    function donateGeneral() external payable {
        require(msg.value > 0, "No value");
        emit DonationReceived(msg.sender, bytes32(0), msg.value);
    }

    function setAlertFee(uint256 newFee) external onlyOwner {
        alertFee = newFee;
    }

    function withdraw(uint256 amount, address payable to) external onlyOwner {
        require(to != address(0), "Invalid recipient");
        require(address(this).balance >= amount, "Insufficient balance");
        to.transfer(amount);
    }

    receive() external payable {
        emit DonationReceived(msg.sender, bytes32(0), msg.value);
    }
}
