import { ethers } from 'ethers';

import TOKEN_ABI from '../abis/Token.json';
import EXCHANGE_ABI from '../abis/Exchange.json';

const NUMBER_TOKENS = 2;

export const loadProvider = (dispatch) => {
    const connection = new ethers.providers.Web3Provider(window.ethereum);
    dispatch({ type: 'PROVIDER_LOADED', connection });

    return connection;
}

export const loadNetwork = async (provider, dispatch) => {
    const { chainId } = await provider.getNetwork();
    dispatch({ type: 'NETWORK_LOADED', chainId });

    return chainId;
}

export const loadAccount = async (provider, dispatch) => {
    const accounts = await window.ethereum.request({'method': 'eth_requestAccounts'});
    const account = ethers.utils.getAddress(accounts[0]);

    dispatch({ type: 'ACCOUNT_LOADED', account });

    let balance = await provider.getBalance(account);
    balance = ethers.utils.formatEther(balance);

    dispatch({ type: 'ETHER_BALANCE_LOADED', balance });

    return account;
}

export const loadTokens = async (provider, addresses, dispatch) => {
    let token, symbol;

    for(var i = 0; i< NUMBER_TOKENS; i++){
        token = new ethers.Contract(addresses[i], TOKEN_ABI, provider);
        symbol = await token.symbol();

        dispatch({ type: `TOKEN_${i+1}_LOADED`, token, symbol });
    }

    return token;
}

export const loadExchange = (provider, address, dispatch) => {

    const exchange = new ethers.Contract(address, EXCHANGE_ABI, provider);
    dispatch({ type: 'EXCHANGE_LOADED', exchange });

    return exchange;
}


export const subscribeToEvents = (exchange, dispatch)  => {
    exchange.on('Deposit', (token, user, amount, balance, event) => { //Event arguments from  Deposit Event in Smart Contract
        // Notify app that transfer was sucessful
        dispatch( {type: 'TRANSFER_SUCCESS', event} );
    });
    
    exchange.on('Withdraw', (token, user, amount, balance, event) => { //Event arguments from  Deposit Event in Smart Contract
        // Notify app that transfer was sucessful
        dispatch( {type: 'TRANSFER_SUCCESS', event} );
    });
}

// -----------------------------------------------------------------------------
// LOAD USER BALANCES (WALLET & EXCHANGE BALANCES)
export const loadBalances = async (exchange, tokens, account, dispatch) => {
    let balance;
    for(var i = 0; i< NUMBER_TOKENS; i++){
        balance = ethers.utils.formatUnits(await tokens[i].balanceOf(account),18);
        dispatch({ type: `TOKEN_${i+1}_BALANCE_LOADED`, balance });
        
        balance = ethers.utils.formatUnits(await exchange.balanceOf(tokens[i].address,account),18);
        dispatch({ type: `EXCHANGE_TOKEN_${i+1}_BALANCE_LOADED`, balance });
    }
}

// ----------------------------------------------------------------------------------------
// TRANSFER TOKENS (DEPOSIT & WITHDRAWS)
export const transferTokens = async (provider, exchange, transferType, token, amount, dispatch) => {

    let transaction;

    dispatch( { type: 'TRANSFER_REQUEST' });

    try {
        const signer = await provider.getSigner();
        const amountToTransfer = ethers.utils.parseUnits(amount.toString(),18);

        
        if(transferType === "Deposit"){    
            transaction =await token.connect(signer).approve(exchange.address, amountToTransfer);
            await transaction.wait();
            
            transaction = await exchange.connect(signer).depositToken(token.address, amountToTransfer);
        }
        else {
            transaction = await exchange.connect(signer).withdrawToken(token.address, amountToTransfer);
        }
        await transaction.wait();
    }
    catch (e){
        console.error(e);
        dispatch( { type: 'TRANSFER_FAIL' });
    }

}
