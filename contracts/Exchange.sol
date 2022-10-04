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
  mapping(uint256 => bool) public ordersCancelled;
  mapping(uint256 => bool) public ordersFilled;

  event Deposit(address token, address user, uint256 amount, uint256 balance);
  event Withdraw(address token, address user, uint256 amount, uint256 balance);
  event Order(uint256 id, address user, address tokenGet, uint256 amountGet,address tokenGive, uint256 amountGive, uint256 timestamp);
  event Cancel(uint256 id, address user, address tokenGet, uint256 amountGet,address tokenGive, uint256 amountGive, uint256 timestamp);
  event Trade(uint256 id, address user, address tokenGet, uint256 amountGet, address tokenGive, uint256 amountGive, address creator, uint256 timestamp);

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
  //User1 creates the order, which is the msg.sender, and later the user2 needs to fill the order
  function makeOrder(address _tokenGet, uint256 _amountGet, address _tokenGive, uint _amountGive) public {
    //Prevent orders if token aren't on exchange
    require(balanceOf(_tokenGive,msg.sender) >= _amountGive);

    //Instantiate a new order
    //Token Give (the token they want to spend) - which token, and how much?
    //Token Get (the token they want to receive) - which token, and how much?
    //Timestamp is expressed in epochs. eg: 18930513012
    ordersCount++;
    orders[ordersCount]= _Order(ordersCount,msg.sender,_tokenGet, _amountGet,_tokenGive, _amountGive,block.timestamp);

    emit Order(ordersCount,msg.sender,_tokenGet, _amountGet,_tokenGive, _amountGive,block.timestamp);
    
  }

  function cancelOrder(uint256 _id ) public {
    //Fetch order
    _Order storage _order = orders[_id];

    //Ensure the caller of the function is the owner of the order
    require(address(_order.user) == msg.sender);

    //Order must exist
    require(_order.id == _id);

    //Cancel order
    ordersCancelled[_id] = true;
    //Emit event
    emit Cancel(_order.id,msg.sender,_order.tokenGet, _order.amountGet,_order.tokenGive, _order.amountGive, block.timestamp);
  }

  //Execute orders
  function fillOrder(uint256 _id) public {
    //1. Must be valid OrderId
    require(_id >0 && _id<= ordersCount, 'Order does not exist');
    //2. Order can't be filled
    require(!ordersFilled[_id]);
    //3. Order can't be cancelled
    require(!ordersCancelled[_id]);

    //Fetch order
    _Order storage _order = orders[_id];

    //Swapping tokens (Trading)
    _trade(_id, _order.user,_order.tokenGet,_order.amountGet,_order.tokenGive, _order.amountGive);

    //Mark order as filled
    ordersFilled[_order.id] = true;
  }

  //User2 completes (accepts) the order, which is the msg.sender after the order was created by user1
  function _trade(uint256 _orderId, address _user, address _tokenGet, uint256 _amountGet, address _tokenGive, uint256 _amountGive) internal {

    //Fee is paid by the user who filled the order [User2 (msg.sender)]
    //Fee is deducted from _amountGet
    uint256 _feeAmount = (_amountGet * feePercent) / 100;
    //In Solidity isn't allowed to operate with floats nor doubles
    //uint256 feeAmount = _amountGet * 0.1;

    tokens[_tokenGet][msg.sender] -= (_amountGet + _feeAmount);
    tokens[_tokenGet][_user] += _amountGet;
    
    tokens[_tokenGive][msg.sender] += _amountGive;
    tokens[_tokenGive][_user] -= _amountGive;

    //Charge fees
    tokens[_tokenGet][feeAccount] += _feeAmount;

    emit Trade(_orderId, msg.sender, _tokenGet,_amountGet,_tokenGive, _amountGive, _user, block.timestamp);

  }
}