//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.9;

import 'hardhat/console.sol';
import './Token.sol';

contract Exchange {
  address public feeAccount;
  uint256 public feePercent;
  uint256 public ordersCount; //starts in zero

  //Token adddress mapping User address and the amount
  mapping(address => mapping(address => uint256)) public  tokens;
  
  //Orders mapping
  struct _Order {
    uint256 id; //Unique identifier for order
    address user; //Address of user who made order
    address tokenGet; //Adress of the token they receive
    uint256 amountGet; //Amount they receive
    address tokenGive; //Adress of the token they give
    uint256 amountGive; //Amount they give
    uint256 timestamp; //When order was created
  }

  mapping(uint256 => _Order) public orders;

  event Deposit(address token, address user, uint256 amount, uint256 balance);
  event Withdraw(address token, address user, uint256 amount, uint256 balance);
  event Order(uint256 id, address user, address tokenGet, uint256 amountGet,address tokenGive, uint256 amountGive, uint256 timestamp);

  constructor(address _feeAccount, uint256 _feePercent){
    feeAccount=_feeAccount;
    feePercent= _feePercent;
  }

  //Deposit Tokens
  function depositToken(address _token, uint256 _amount) public {
    //Transfer token to exchange
    require(Token(_token).transferFrom(msg.sender, address(this), _amount));

    //Update balance
    tokens[_token][msg.sender] += _amount;
    
    //Emit event
    emit Deposit(_token,msg.sender,_amount,tokens[_token][msg.sender]);
  }

  function withdrawToken(address _token, uint256 _amount) public {
    //Ensure user has enough token to withdraw
    require(tokens[_token][msg.sender] >=_amount);

    //Transfer tokens to user
    Token(_token).transfer(msg.sender,_amount);
    
    //Update user balance
    tokens[_token][msg.sender] -= _amount;

    //Emit event
    emit Withdraw(_token, msg.sender, _amount, tokens[_token][msg.sender]);
  }

  //Check Balances
  function balanceOf(address _token, address _user) public view returns (uint256){
    return tokens[_token][_user];
  }

  //Make Order
  function makeOrder(address _tokenGet, uint256 _amountGet, address _tokenGive, uint _amountGive) public {
    //Prevent orders if token aren't on exchange
    require(balanceOf(_tokenGive,msg.sender) >= _amountGive);

    //Instantiate a new order
    //Token Give (the token they want to spend) - which token, and how much?
    //Token Get (the token they want to receive) - which token, and how much?
    //Timestamp is expressed in epochs. eg: 18930513012
    ordersCount+=1;
    orders[ordersCount]= _Order(ordersCount,msg.sender,_tokenGet, _amountGet,_tokenGive, _amountGive,block.timestamp);

    emit Order(ordersCount,msg.sender,_tokenGet, _amountGet,_tokenGive, _amountGive,block.timestamp);
    
  }
}