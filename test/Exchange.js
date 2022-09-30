const {ethers} = require('hardhat');
const {expect} = require('chai');

const tokens = (n) => {
  return ethers.utils.parseUnits(n.toString(),'ether');
}

describe('Exchange', () => {

  let deployer, feeAccount, exchange, token;

  const feePercent = 10;

  beforeEach( async () => {
    const Exchange = await ethers.getContractFactory('Exchange');
    const Token = await ethers.getContractFactory('Token');
    
    accounts = await ethers.getSigners();
    deployer = accounts[0];
    feeAccount = accounts[1];
    user1 = accounts[2];

    exchange = await Exchange.deploy(feeAccount.address,feePercent);
    token = await Token.deploy('ZENITH','ZTH',1000000);

    let transaction = await token.connect(deployer).transfer(user1.address,tokens(100));
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
    let transaction, result, amount;
    amount=tokens(10);

    describe('Success',()=>{
      beforeEach(async ()=>{
        //Approve Token
        transaction = await token.connect(user1).approve(exchange.address,amount)
        result= await transaction.wait();
        //Deposit Token
        transaction = await exchange.connect(user1).depositToken(token.address,amount)
        result= await transaction.wait();
      });

      it('Tracks the deposit token', async ()=>{
        expect(await token.balanceOf(exchange.address)).to.equal(amount);
        //expect(await exchange.tokens(token.address,user1.address)).to.equal(amount);
        expect(await exchange.balanceOf(token.address,user1.address)).to.equal(amount);
      });

      it('Emits a Deposit event', async ()=>{
        const event = result.events[1]; //2 events are emmited: Transfer, Deposit
        expect(event.event).to.equal('Deposit');

        const args = event.args;
        expect(args.token).to.equal(token.address);
        expect(args.user).to.equal(user1.address);
        expect(args.amount).to.equal(amount);
        expect(args.balance).to.equal(amount);
      });

    });
    
    describe('Failure',()=>{
      it('Fails when no tokens are approved', async()=>{
        //Don't approve any tokens before depositing
        await expect(exchange.connect(user1).depositToken(token.address,amount)).to.be.reverted;
      });
    });
  });
});