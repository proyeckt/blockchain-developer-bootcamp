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
    
    exchange.on('Withdraw', (token, user, amount, balance, event) => { //Event arguments from  Withdraw Event in Smart Contract
        // Notify app that transfer was sucessful
        dispatch( {type: 'TRANSFER_SUCCESS', event} );
    });

    exchange.on('Order', (id, user, tokenGet, amountGet, tokenGive, amountGive, timestamp, event) => { //Event arguments from  Order Event in Smart Contract
        const order = event.args;
        // Notify app that order creation was sucessful
        dispatch( {type: 'NEW_ORDER_SUCCESS', event, order} );
    });

    exchange.on('Cancel', (id, user, tokenGet, amountGet, tokenGive, amountGive, timestamp, event) => { //Event arguments from  Cancel Event in Smart Contract
        const order = event.args;
        // Notify app that order cancelation was sucessful
        dispatch( {type: 'ORDER_CANCEL_SUCCESS', event, order} );
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

export const loadAllOrders = async (provider, exchange, dispatch) => {
    const block = await provider.getBlockNumber();

    //Fetch cancelled orders
    const cancelStream = await exchange.queryFilter('Cancel', 0, block);
    const cancelledOrders = cancelStream.map(event => event.args);
    
    dispatch({ type: 'CANCELLED_ORDERS_LOADED', cancelledOrders });
    
    //Fetch cancelled orders
    const tradeStream = await exchange.queryFilter('Trade', 0, block);
    const filledOrders = tradeStream.map(event => event.args);
    
    dispatch({ type: 'FILLED_ORDERS_LOADED', filledOrders });

    //Fetch all orders
    const orderStream = await exchange.queryFilter('Order', 0, block);
    const allOrders = orderStream.map(event => event.args);
    
    dispatch({ 'type': 'ALL_ORDERS_LOADED', allOrders });
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

// ----------------------------------------------------------------------------------------
// ORDERS (BUY & SELL)

export const makeBuyOrder = async (provider, exchange, tokens, order, dispatch) => {
    const tokenGet = tokens[0].address;
    const amountGet = ethers.utils.parseUnits(order.amount,18);
    const tokenGive = tokens[1].address;
    const amountGive = ethers.utils.parseUnits((order.amount * order.price).toString(), 18);

    dispatch({ type: 'NEW_ORDER_REQUEST' });

    try { 
        const signer = await provider.getSigner();
        const transaction = await exchange.connect(signer).makeOrder(tokenGet, amountGet, tokenGive, amountGive);
        await transaction.wait();
    }
    catch (error) {
        dispatch({ type: 'NEW_ORDER_FAIL' });
    }
}

export const makeSellOrder = async (provider, exchange, tokens, order, dispatch) => {
    const tokenGet = tokens[1].address;
    const amountGet = ethers.utils.parseUnits((order.amount * order.price).toString(), 18);
    const tokenGive = tokens[0].address;
    const amountGive = ethers.utils.parseUnits(order.amount,18);

    dispatch({ type: 'NEW_ORDER_REQUEST' });

    try { 
        const signer = await provider.getSigner();
        const transaction = await exchange.connect(signer).makeOrder(tokenGet, amountGet, tokenGive, amountGive);
        await transaction.wait();
    }
    catch (error) {
        dispatch({ type: 'NEW_ORDER_FAIL' });
    }
}

// ----------------------------------------------------------------------------------------
// CANCEL ORDER
export const cancelOrder = async (provider, exchange, order, dispatch) => {
    dispatch({ type: 'ORDER_CANCEL_REQUEST' });

    try { 
        const signer = await provider.getSigner();
        const transaction = await exchange.connect(signer).cancelOrder(order.id);
        await transaction.wait();
    }
    catch (error) {
        dispatch({ type: 'ORDER_CANCEL_FAIL' });
    }
}