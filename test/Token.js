const {ethers} = require('hardhat');
const {expect} = require('chai');

const tokens = (n) => {
  return ethers.utils.parseUnits(n.toString(),'ether');
}
describe('Token', () => {

  let token;

  beforeEach( async () => {
    //Fetch token from Blockchain
    const Token = await ethers.getContractFactory('Token');
    //Deploy token
    token = await Token.deploy('ZENITH','ZTH',1000000);
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
  })
  
 
});