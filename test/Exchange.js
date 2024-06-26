const {ethers} = require('hardhat');
const {expect} = require('chai');

const tokens = (n) => {
  return ethers.utils.parseUnits(n.toString(),'ether');
}

describe('Exchange', () => {

  let deployer, feeAccount, exchange, token1, token2;

  const feePercent = 10;

  beforeEach( async () => {
    const Exchange = await ethers.getContractFactory('Exchange');
    const Token = await ethers.getContractFactory('Token');
    
    accounts = await ethers.getSigners();
    deployer = accounts[0];
    feeAccount = accounts[1];
    user1 = accounts[2];
    user2 = accounts[3];

    exchange = await Exchange.deploy(feeAccount.address,feePercent);
    token1 = await Token.deploy('ZENITH','ZTH',1000000);
    token2 = await Token.deploy('MOCK DAI','mDAI',1000000);

    let transaction = await token1.connect(deployer).transfer(user1.address,tokens(100));
    await transaction.wait();
  });

  describe('Deployment',() => {
    it('Tracks the fee account', async () => {
      expect(await exchange.feeAccount()).to.equal(feeAccount.address);
    });
    
    it('Tracks the fee percent', async () => {
      expect(await exchange.feePercent()).to.equal(feePercent);
    });
  });

  describe('Depositing Tokens', ()=>{
    let transaction, result;
    let amount=tokens(1);

    describe('Success',()=>{
      beforeEach(async ()=>{
        //Approve Token
        transaction = await token1.connect(user1).approve(exchange.address,amount);
        result= await transaction.wait();
        //Deposit Token
        transaction = await exchange.connect(user1).depositToken(token1.address,amount);
        result= await transaction.wait();
      });

      it('Tracks the deposit token', async ()=>{
        expect(await token1.balanceOf(exchange.address)).to.equal(amount);
        //expect(await exchange.tokens(token1.address,user1.address)).to.equal(amount);
        expect(await exchange.balanceOf(token1.address,user1.address)).to.equal(amount);
      });

      it('Emits a Deposit event', async ()=>{
        const event = result.events[1]; //2 events are emmited: Transfer, Deposit
        expect(event.event).to.equal('Deposit');

        const args = event.args;
        expect(args.token).to.equal(token1.address);
        expect(args.user).to.equal(user1.address);
        expect(args.amount).to.equal(amount);
        expect(args.balance).to.equal(amount);
      });

    });
    
    describe('Failure',()=>{
      it('Fails when no tokens are approved', async()=>{
        //Don't approve any tokens before depositing
        await expect(exchange.connect(user1).depositToken(token1.address,amount)).to.be.reverted;
      });
    });
  });

  describe('Withdrawing Tokens', ()=>{
    let transaction, result;
    let amount=tokens(1);

    describe('Success',()=>{
      beforeEach(async ()=>{
        //Deposit tokens before withdrawing, just for test
        //Approve Token
        transaction = await token1.connect(user1).approve(exchange.address,amount);
        result= await transaction.wait();
        //Deposit Token
        transaction = await exchange.connect(user1).depositToken(token1.address,amount);
        result= await transaction.wait();

        //Now  withdraw tokens
        transaction = await exchange.connect(user1).withdrawToken(token1.address,amount);
        result= await transaction.wait();
      });

      it('Withdraws token funds', async ()=>{
        expect(await token1.balanceOf(exchange.address)).to.equal(0);
        //expect(await exchange.tokens(token1.address,user1.address)).to.equal(0);
        expect(await exchange.balanceOf(token1.address,user1.address)).to.equal(0);
      });

      it('Emits a Withdraw event', async ()=>{
        const event = result.events[1]; //2 events are emmited: Transfer, Deposit
        expect(event.event).to.equal('Withdraw');

        const args = event.args;
        expect(args.token).to.equal(token1.address);
        expect(args.user).to.equal(user1.address);
        expect(args.amount).to.equal(amount);
        expect(args.balance).to.equal(0);
      });

    });
    
    describe('Failure',()=>{
      it('Fails for insufficient balances', async()=>{
        //Attemp to witdhraw tokens without depositing
        await expect(exchange.connect(user1).depositToken(token1.address,amount)).to.be.reverted;
      });
    });
  });

  describe('Checking Balances', ()=>{
    let transaction, result;
    let amount=tokens(1);

    describe('Success',()=>{
      beforeEach(async ()=>{
        //Deposit tokens before, just for test
        //Approve Token
        transaction = await token1.connect(user1).approve(exchange.address,amount);
        result= await transaction.wait();
        //Deposit Token
        transaction = await exchange.connect(user1).depositToken(token1.address,amount);
        result= await transaction.wait();
      });

      it('Returns user balance', async ()=>{
        expect(await token1.balanceOf(exchange.address)).to.equal(amount);
      });
    });
  });

  describe('Making Orders', ()=>{
    let transaction, result;
    let amount=tokens(1);

    describe('Success',()=>{
      beforeEach(async ()=>{
        //Deposit tokens before making order, just for test
        //Approve Token
        transaction = await token1.connect(user1).approve(exchange.address,amount);
        result= await transaction.wait();
        //Deposit Token
        transaction = await exchange.connect(user1).depositToken(token1.address,amount);
        result= await transaction.wait();
        //Make Order
        transaction = await exchange.connect(user1).makeOrder(token2.address,amount,token1.address,amount);
        result= await transaction.wait();
      });
      
      it('Tracks the newly created order', async()=>{
        expect(await exchange.ordersCount()).to.equal(1);
      });

      it('Emits an Order event', async ()=>{
        const event = result.events[0];
        expect(event.event).to.equal('Order');

        const args = event.args;
        expect(args.id).to.equal(1);
        expect(args.user).to.equal(user1.address);
        expect(args.tokenGet).to.equal(token2.address);
        expect(args.amountGet).to.equal(amount);
        expect(args.tokenGive).to.equal(token1.address);
        expect(args.amountGive).to.equal(amount);
        expect(args.timestamp).to.at.least(1);
      });
    });

    describe('Failure', ()=>{
      it('Rejects with no balance', async ()=> {
        await expect(exchange.connect(user1).makeOrder(token2.address,amount,token1.address,amount)).to.be.reverted;
      });
    });
  });

  describe('Order actions', ()=>{
    let transaction, result;
    let amount=tokens(1);

    beforeEach(async ()=>{
      //Approve Token
      transaction = await token1.connect(user1).approve(exchange.address,amount);
      result= await transaction.wait();
      //Deposit Token to User1
      transaction = await exchange.connect(user1).depositToken(token1.address,amount);
      result= await transaction.wait();
      //Give Tokens to User2
      transaction = await token2.connect(deployer).transfer(user2.address,tokens(100));
      result= await transaction.wait();
      //Approve Token to User2
      transaction = await token2.connect(user2).approve(exchange.address,tokens(2));
      result= await transaction.wait();
      //Deposit Token to User2
      transaction = await exchange.connect(user2).depositToken(token2.address,tokens(2));
      result= await transaction.wait();
      //Make Order
      transaction = await exchange.connect(user1).makeOrder(token2.address,amount,token1.address,amount);
      result= await transaction.wait();
    });
    describe('Cancelling orders', () => {
      describe('Success',()=>{
        beforeEach(async ()=> {
          transaction = await exchange.connect(user1).cancelOrder(1);
          result = await transaction.wait();
        });

        it('Updates canceled order', async()=>{
          expect(await exchange.ordersCancelled(1)).to.equal(true);
        });

        it('Emits a Cancel event', async ()=>{
          const event = result.events[0];
          expect(event.event).to.equal('Cancel');

          const args = event.args;
          expect(args.id).to.equal(1);
          expect(args.user).to.equal(user1.address);
          expect(args.tokenGet).to.equal(token2.address);
          expect(args.amountGet).to.equal(amount);
          expect(args.tokenGive).to.equal(token1.address);
          expect(args.amountGive).to.equal(amount);
          expect(args.timestamp).to.at.least(1);
        });
      });

      describe('Failure', ()=>{
        beforeEach(async ()=>{
          //Approve Token
          transaction = await token1.connect(user1).approve(exchange.address,amount);
          result= await transaction.wait();
          //Deposit Token
          transaction = await exchange.connect(user1).depositToken(token1.address,amount);
          result= await transaction.wait();
          //Make Order
          transaction = await exchange.connect(user1).makeOrder(token2.address,amount,token1.address,amount);
          result= await transaction.wait();
        });

        it('Rejects invalid orders id', async ()=> {
          const invalidOrderId = 9999;
          await expect(exchange.connect(user1).cancelOrder(invalidOrderId)).to.be.reverted;
        });
        
        it('Rejects unauthorized cancelatiosn', async ()=> {
          await expect(exchange.connect(user2).cancelOrder(1)).to.be.reverted;
        });
      });
    });

    describe('Filling orders', () => {
      describe('Success',()=>{
        beforeEach(async ()=> {
          transaction = await exchange.connect(user2).fillOrder(1);
          result = await transaction.wait();
        });

        it('Executes the trade and charge fees', async()=>{
          //Toke Give
          expect(await exchange.balanceOf(token1.address,user1.address)).to.equal(tokens(0));
          expect(await exchange.balanceOf(token1.address,user2.address)).to.equal(tokens(1));
          expect(await exchange.balanceOf(token1.address,feeAccount.address)).to.equal(tokens(0));
          
          //Toke Get
          expect(await exchange.balanceOf(token2.address,user1.address)).to.equal(tokens(1));
          expect(await exchange.balanceOf(token2.address,user2.address)).to.equal(tokens(0.9));
          expect(await exchange.balanceOf(token2.address,feeAccount.address)).to.equal(tokens(0.1));  
        });

        it('Updates filled orders', async ()=>{
          expect(await exchange.ordersFilled(1)).to.equal(true);
        });

        it('Emits a Trade event', async ()=>{
          const event = result.events[0];
          expect(event.event).to.equal('Trade');

          const args = event.args;
          expect(args.id).to.equal(1);
          expect(args.user).to.equal(user2.address);
          expect(args.tokenGet).to.equal(token2.address);
          expect(args.amountGet).to.equal(tokens(1));
          expect(args.tokenGive).to.equal(token1.address);
          expect(args.amountGive).to.equal(tokens(1));
          expect(args.creator).to.equal(user1.address);
          expect(args.timestamp).to.at.least(1);
        });
      });

      describe('Failure', ()=>{
        it('Rejects invalid orders id', async ()=> {
          const invalidOrderId = 9999;
          await expect(exchange.connect(user2).fillOrder(invalidOrderId)).to.be.reverted;
        });
        
        it('Rejects already filled orders', async ()=> {
          transaction = await exchange.connect(user2).fillOrder(1);
          await transaction.wait();

          await expect(exchange.connect(user2).fillOrder(1)).to.be.reverted;
        });

        it('Rejects canceled orders', async ()=> {
          transaction = await exchange.connect(user1).cancelOrder(1);
          await transaction.wait();

          await expect(exchange.connect(user2).fillOrder(1)).to.be.reverted;
        });
      });
    });
  });
});