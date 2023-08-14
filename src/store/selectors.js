import { createSelector } from 'reselect';
import { get, groupBy, reject } from 'lodash';
import { ethers } from 'ethers';
import moment from 'moment';

const GREEN = '#25CE8F';
const RED = '#F45353';

const tokens = state => get(state, 'tokens.contracts');
const allOrders = state => get(state, 'exchange.allOrders.data', []);
const filledOrders = state => get(state, 'exchange.filledOrders.data', []);
const cancelledOrders = state => get(state, 'exchange.cancelledOrders.data', []);

const openOrders = state => {
  const all = allOrders(state);
  const filled = filledOrders(state);
  const cancelled = cancelledOrders(state);

  const openOrders = reject(all, (order) => {
    const filledOrder = filled.some((o) => o.id.toString() === order.id.toString());
    const cancelledOrder = cancelled.some((o) => o.id.toString() === order.id.toString());
    return filledOrder || cancelledOrder;
  });
  return openOrders;
}

const decorateOrder = (order, tokens) => {
  let token0Amount, token1Amount;
  // Note: ZLH should be considered token0, mETH is considered token1
  // Example: Giving mETH in exchange for ZLH
  if (token0Amount === tokens[1].address) {
    token0Amount = order.amountGive; // The amount of ZLH we are giving
    token1Amount = order.amountGet; // The amount of mETH we want
  } else {
    token0Amount = order.amountGet; // The amount of ZLH we want
    token1Amount = order.amountGive; // The amount of mETH we are giving
  }

  // Calculate token price to 5 decimal places
  let precision = 100000;
  let tokenPrice = token1Amount / token0Amount;
  tokenPrice = Math.round(tokenPrice * precision) / precision;

  //Check if is a buy order or a sell order
  let orderType, orderTypeClass, orderFillAction;
  if (order.tokenGive === tokens[1].address) {
    orderType = 'buy';
    orderTypeClass = GREEN;
    orderFillAction = 'sell';
  } else {
    orderType = 'sell';
    orderTypeClass = RED;
    orderFillAction = 'buy';
  }

  return {
    ...order,
    token0Amount:ethers.utils.formatUnits(token0Amount, "ether"),
    token1Amount:ethers.utils.formatUnits(token1Amount, "ether"),
    tokenPrice,
    formattedTimestamp: moment.unix(order.timestamp).format('h:mm:ssa d MMM D'),
    orderType,
    orderTypeClass,
    orderFillAction
  }
}


const decorateOrderBookOrders = (orders, tokens) => orders.map((order) => decorateOrder(order, tokens));

// --------------------------------------------------------------------------
// ORDER BOOk
export const orderBookSelector = createSelector(openOrders, tokens, (orders, tokens) => {

  if (!tokens[0] || !tokens[1]) return;
  
  // Filter orders by selected tokens
  const selectedTokenAddresses = [tokens[0].address, tokens[1].address];
  orders = orders.filter((o) => selectedTokenAddresses.includes(o.tokenGet) || selectedTokenAddresses.includes(o.tokenGive));
  
  // Decorate orders
  orders = decorateOrderBookOrders(orders, tokens);
  //Group orders by orderType
  orders = groupBy(orders, 'orderType');

  // Fetch buy orders and sort them by token price in descending order
  const buyOrders = get(orders, 'buy', []).sort((a, b) => b.tokenPrice - a.tokenPrice);
  const sellOrders = get(orders, 'sell', []).sort((a, b) => b.tokenPrice - a.tokenPrice);
  
  orders = {
    ...orders,
    buyOrders,
    sellOrders
  }
  console.log(orders);
  return orders;
});