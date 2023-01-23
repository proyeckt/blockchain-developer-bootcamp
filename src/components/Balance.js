import { useEffect, useState } from 'react';

import { useSelector, useDispatch } from 'react-redux';

import dapp from '../assets/dapp.svg';

import { loadBalances, transferTokens } from '../store/interactions';


const Balance = () => {

  const [token1TransferAmount, setToken1TransferAmount] = useState(0);
  
  const dispatch = useDispatch();
  
  const provider = useSelector(state => state.provider.connection);
  const account = useSelector(state => state.provider.account);
  const exchange = useSelector(state => state.exchange.contract);
  const tokens = useSelector(state => state.tokens.contracts);
  const symbols = useSelector(state => state.tokens.symbols);

  const exchangeBalances = useSelector(state => state.exchange.balances);
  const tokenBalances = useSelector(state => state.tokens.balances);
  const transferInProgress = useSelector(state => state.exchange.transferInProgress);
   

  const amountHandler = (e, token) => {
    if(token.address === tokens[0].address){
      setToken1TransferAmount(e.target.value);
    }
  }

  // Step 1: Do transfer
  // Step 2: Notify app that transfer is pending
  // Step 3: Get confirmation from blockchain that transfer was successful
  // Step 4: Notify app that transfer was sucessful
  // Step 5: Handle transfer fails - notify app

  const depositHandler = async (e, token) => {
    e.preventDefault(); //Prevent page refresh

    let transferType = 'Deposit';
    
    if(token.address === tokens[0].address){
      await transferTokens(provider, exchange, transferType, token, token1TransferAmount, dispatch);
      setToken1TransferAmount(0);
    }
  }

  useEffect( () => {
    if(exchange && tokens[0] && tokens[1] && account)
      loadBalances(exchange, tokens, account, dispatch);
  },[exchange,tokens,account,transferInProgress]);

  return (
    <div className='component exchange__transfers'>
      <div className='component__header flex-between'>
        <h2>Balance</h2>
        <div className='tabs'>
          <button className='tab tab--active'>Deposit</button>
          <button className='tab'>Withdraw</button>
        </div>
      </div>
       {/* Deposit/Withdraw Component 1 (DApp) */}
       <div className='exchange__transfers--form'>
        <div className='flex-between'>
          <p><small>Token </small> <br /> <img src={dapp} alt="Token Logo"/>{ symbols && symbols[0]} </p>
          <p><small>Wallet </small> <br /> { tokenBalances && tokenBalances[0]} </p>
          <p><small>Exchange </small> <br /> { exchangeBalances && exchangeBalances[0]} </p>
        </div>
         <form onSubmit={(e) => depositHandler(e,tokens[0])}>
          <label htmlFor="token0">{symbols && symbols[0]} Amount</label>
          <input 
            type="text" 
            id='token0' 
            placeholder='0.0000' 
            value={ token1TransferAmount === 0 ? '' : token1TransferAmount }
            onChange={(e) => amountHandler(e, tokens[0])} 
            />
           <button className='button' type='submit'>
            <span>Deposit</span>
          </button>
        </form>
      </div>
       <hr />
       {/* Deposit/Withdraw Component 2 (mETH) */}
       <div className='exchange__transfers--form'>
        <div className='flex-between'>
         </div>
         <form>
         <label htmlFor="token1">{symbols && symbols[1]} Amount</label>
          <input type="text" id='token1' placeholder='0.0000' />
           <button className='button' type='submit'>
            <span></span>
          </button>
        </form>
      </div>
       <hr />
    </div>
  );
}
  
export default Balance;