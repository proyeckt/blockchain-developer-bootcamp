const { ethers } = require('hardhat');
const config = require('../src/config.json');

const tokens = (n) => {
  return ethers.utils.parseUnits(n.toString(),'ether');
}

const wait = (seconds) => {
  const milliseconds = seconds * 1000;
  return new Promise(resolve => setTimeout(resolve,milliseconds));
}

async function main(){
  //Fetch accounts from wallet - these are unlocked
  const accounts = await ethers.getSigners();

  //Fetch network
  const {chainId} = await ethers.provider.getNetwork();
  console.log("Using chainId:", chainId);

  //Get deployed contract passing the name and the address
  //const tokenInstance = await ethers.getContractFactory('Token');

  const zlh = await ethers.getContractAt('Token',config[chainId].ZLH.address);
  //const zlh = tokenInstance.attach('0x5FbDB2315678afecb367f032d93F642f64180aa3');
  console.log(`ZLH token fetched: ${zlh.address}`);
  
  const mETH = await ethers.getContractAt('Token',config[chainId].mETH.address);
  //const mETH = tokenInstance.attach('0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512');
  console.log(`mETH token fetched: ${mETH.address}`);
  
  const mDAI = await ethers.getContractAt('Token',config[chainId].mDAI.address);
  //const mDAI = tokenInstance.attach('0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0');
  console.log(`mDAI token fetched: ${mDAI.address}`);

  //const exchangeInstance = await ethers.getContractFactory('Exchange');
  
  const exchange = await ethers.getContractAt('Exchange',config[chainId].exchange.address);
  //const exchange = exchangeInstance.attach('0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9');
  console.log(`Exchange fetched: ${exchange.address}`);

  const sender = accounts[0];
  const receiver = accounts[1];
  let amount = tokens(10000);

  //User1 transfers 10000 mETH to User2
  let transaction, result;
  transaction = await mETH.connect(sender).transfer(receiver.address,amount);
  console.log(`Transferred ${amount} tokens from ${sender.address} to ${receiver.address}`);

  //Set up exchange users
  const user1 = accounts[0];
  const user2 = accounts[1];
  amount = tokens(10000);

  transaction = await zlh.connect(user1).approve(exchange.address,amount);
  await transaction.wait();
  console.log(`Approved ${amount} tokens from ${user1.address}`);

  transaction = await exchange.connect(user1).depositToken(zlh.address,amount);
  await transaction.wait();
  console.log(`Deposited ${amount} tokens from ${user1.address}`);

  transaction = await mETH.connect(user2).approve(exchange.address,amount);
  await transaction.wait();
  console.log(`Approved ${amount} tokens from ${user2.address}`);

  transaction = await exchange.connect(user2).depositToken(mETH.address,amount);
  await transaction.wait();
  console.log(`Deposited ${amount} tokens from ${user2.address}`);

  //Make orders
  let orderId;
  transaction = await exchange.connect(user1).makeOrder(mETH.address,tokens(100),zlh.address, tokens(5));
  
  result = await transaction.wait();
  console.log(`Made order from ${user1.address}`);

  //Cancel orders
  orderId = result.events[0].args.id;
  transaction = await exchange.connect(user1).cancelOrder(orderId);
  result = await transaction.wait();
  console.log(`Cancelled order from ${user1.address}`);

  await wait(1); // Wait 1 second

  //Fill orders
  transaction = await exchange.connect(user1).makeOrder(mETH.address,tokens(100),zlh.address, tokens(10));
  result = await transaction.wait();
  console.log(`Made order from ${user1.address}`);

  //User2 fills the order
  orderId = result.events[0].args.id;
  transaction = await exchange.connect(user2).fillOrder(orderId);
  result = await transaction.wait();
  console.log(`Filled order from ${user2.address}`);

  await wait(1); // Wait 1 second

  //User 1 makes another order
  transaction = await exchange.connect(user1).makeOrder(mETH.address,tokens(50),zlh.address, tokens(15));
  result = await transaction.wait();
  console.log(`Made order from ${user1.address}`);

  orderId = result.events[0].args.id;
  transaction = await exchange.connect(user2).fillOrder(orderId);
  result = await transaction.wait();
  console.log(`Filled order from ${user2.address}`);

  await wait(1); // Wait 1 second

  //User 1 makes final order
  transaction = await exchange.connect(user1).makeOrder(mETH.address,tokens(200),zlh.address, tokens(20));
  result = await transaction.wait();
  console.log(`Made order from ${user1.address}`);

  // User 2 fills final order
  orderId = result.events[0].args.id;
  transaction = await exchange.connect(user2).fillOrder(orderId);
  result = await transaction.wait();
  console.log(`Filled order from ${user2.address}`);

  await wait(1); // Wait 1 second

  //User1 makes 10 orders
  for(let i =1; i<=10;i++){
    transaction = await exchange.connect(user1).makeOrder(mETH.address,tokens(i*10),zlh.address, tokens(10));
    result = await transaction.wait();

    console.log(`Made order from ${user1.address}`);
    await wait(1); // Wait 1 second
  }

  //User2 makes 10 orders
  for(let i =1; i<=10;i++){
    transaction = await exchange.connect(user2).makeOrder(zlh.address,tokens(10),mETH.address, tokens(i*10));
    result = await transaction.wait();

    console.log(`Made order from ${user2.address}`);
    await wait(1); // Wait 1 second
  }

}

main()
  .then(()=> process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });