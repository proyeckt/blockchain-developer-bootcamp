const {ethers} = require('hardhat');
const {expect} = require('chai');

const tokens = (n) => {
  return ethers.utils.parseUnits(n.toString(),'ether');
}
describe('Token', () => {

  let token, accounts, deployer, receiver, exchange;

  beforeEach( async () => {
    //Fetch token from Blockchain
    const Token = await ethers.getContractFactory('Token');
    //Deploy token
    token = await Token.deploy('ZENITH','ZTH',1000000);

    accounts = await ethers.getSigners();

    deployer = accounts[0];
    receiver = accounts[1];
    exchange = accounts[2];
  });

  describe('Deployment',() => {

    const name = 'ZENITH';
    const symbol = 'ZTH';
    const decimals = 18;
    const totalSupply = '1000000';

    it('Has correct name', async () => {
      expect(await token.name()).to.equal(name);
    });

    it('Has correct symbol', async () => {
      expect(await token.symbol()).to.equal(symbol);
    });

    it('Has correct decimals', async () => {
      expect(await token.decimals()).to.equal(decimals);
    });

    it('Has correct totalSupply', async () => {
      expect(await token.totalSupply()).to.equal(tokens(totalSupply));
    });
    
    it('Assigns total supply to deployer', async () => {
      expect(await token.balanceOf(deployer.address)).to.equal(tokens(totalSupply));
    });
  });

  describe('Sending Tokens',() =>{
    let amount, transaction, result;

    describe('Success', ()=>{
      
      beforeEach(async ()=>{
        amount = tokens(100);
        transaction=await token.connect(deployer).transfer(receiver.address,amount);
        result = await transaction.wait();
      });

      it('Transfer token balances', async ()=>{
        expect(await token.balanceOf(deployer.address)).to.equal(tokens(999900));
        expect(await token.balanceOf(receiver.address)).to.equal(amount);
      });

      it('Emits a Transfer event', async ()=>{
        const event = result.events[0];
        expect(event.event).to.equal('Transfer');

        const args = event.args;
        expect(args.from).to.equal(deployer.address);
        expect(args.to).to.equal(receiver.address);
        expect(args.value).to.equal(amount);
      });
    });

    describe('Failure', ()=>{

      it('Reject insufficient balances', async ()=>{
        //Transfer more tokens than deployer has - 10M
        const invalidAmount = tokens(100000000);
        await expect(token.connect(deployer).transfer(receiver.address,invalidAmount)).to.be.reverted;
      });

      it('Reject invalid recipent', async ()=>{
        amount = tokens(100);
        await expect(token.connect(deployer).transfer('0x0000000000000000000000000000000000000000',amount)).to.be.reverted;
      });
    });
  });

  describe('Approving Tokens', () =>{
    let amount, transaction, result;
    beforeEach(async ()=>{
      amount=tokens(100);
      transaction=await token.connect(deployer).approve(exchange.address,amount);
      result = await transaction.wait();
    })

    describe('Success',()=>{
      it('allocates an allowance for delegated token spending', async () =>{
        expect(await token.allowance(deployer.address, exchange.address)).to.equal(amount);
      });

      it('Emits an Approval event', async ()=>{
        const event = result.events[0];
        expect(event.event).to.equal('Approval');

        const args = event.args;
        expect(args.owner).to.equal(deployer.address);
        expect(args.spender).to.equal(exchange.address);
        expect(args.value).to.equal(amount);
      });
    });

    describe('Failure',()=>{
      it('Reject invalid spenders', async ()=>{
        await expect(token.connect(deployer).approve('0x0000000000000000000000000000000000000000',amount)).to.be.reverted;
      });
    });
  });

  describe('Delegated Token Transfer',()=> {
    let amount, transaction, result;
    beforeEach(async ()=>{
      amount=tokens(100);
      transaction=await token.connect(deployer).approve(exchange.address,amount);
      result = await transaction.wait();
    });

    describe('Success',()=>{
      beforeEach(async ()=>{
        amount=tokens(100);
        transaction=await token.connect(exchange).transferFrom(deployer.address,receiver.address,amount);
        result = await transaction.wait();
      });
      
      it('Transfer token balances', async ()=>{
        expect(await token.balanceOf(deployer.address)).to.be.equal(tokens(999900));
        expect(await token.balanceOf(receiver.address)).to.be.equal(amount);
      });

      it('Reset the allowance', async()=>{
        expect(await token.allowance(deployer.address,exchange.address)).to.be.equal(0);
      });

      it('Emits a Transfer event', async ()=>{
        const event = result.events[0];
        expect(event.event).to.equal('Transfer');

        const args = event.args;
        expect(args.from).to.equal(deployer.address);
        expect(args.to).to.equal(receiver.address);
        expect(args.value).to.equal(amount);
      });
    });

    describe('Failure', ()=>{
      it('Reject insufficient allowance amount', async ()=>{
        const invalidAmount = tokens(10000000000);
        await expect(token.connect(exchange).transferFrom(deployer.address, receiver.address, invalidAmount)).to.be.reverted;
      })
    });
  });
  
});