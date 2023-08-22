import { createSelector } from 'reselect';
import { get, groupBy, reject, maxBy, minBy } from 'lodash';
import { ethers } from 'ethers';
import moment from 'moment';

const GREEN = '#25CE8F';
const RED = '#F45353';
const BLUE = '#2187D0';

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

  return {
    ...order,
    token0Amount:ethers.utils.formatUnits(token0Amount, "ether"),
    token1Amount:ethers.utils.formatUnits(token1Amount, "ether"),
    tokenPrice,
    formattedTimestamp: moment.unix(order.timestamp).format('h:mm:ssa d MMM D'),
  }
}

const decorateOrderBookOrders = (orders, tokens) =>
  orders.map((order) => {
    order = decorateOrder(order, tokens);
    return decorateOrderBookOrder(order, tokens);
  });

const decorateOrderBookOrder = (order, tokens) => {
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
    orderType,
    orderTypeClass,
    orderFillAction
  }
}

// --------------------------------------------------------------------------
// ALL FILLED ORDERS
export const filledOrdersSelector = createSelector(
  filledOrders,
  tokens,
  (orders, tokens) => {
    if (!tokens[0] || !tokens[1]) return;

    // Filter orders by selected tokens
    const selectedTokenAddresses = [tokens[0].address, tokens[1].address];
    orders = orders.filter((o) => selectedTokenAddresses.includes(o.tokenGet) && selectedTokenAddresses.includes(o.tokenGive));
    
    // Step 1: sort orders by time ascending for price comparison
    orders = orders.sort((a, b) => a.timestamp - b.timestamp);

    // Step 2: apply order color (decorate order)
    orders = decorateFilledOrders(orders, tokens);

    // Step 3: sort orders by time descending for UI
    orders = orders.sort((a, b) => b.timestamp - a.timestamp);

    return orders;
  });

const decorateFilledOrders = (orders, tokens) => {
  // Track previous order to compare history
  let previousOrder = orders[0];

  return orders.map((order) => {
    // decorate each individual order
    order = decorateOrder(order, tokens);
    order = decorateFilledOrder(order, previousOrder);
    previousOrder = order; // Update the previous order once it's decorated
    return order;
  });
}

const decorateFilledOrder = (order, previousOrder) => {
  return {
    ...order,
    tokenPriceClass: tokenPriceClass(order, previousOrder)
  };
}

const tokenPriceClass = (order, previousOrder) => {
  if (order.id === previousOrder.id) return BLUE;
  return order.tokenPrice > previousOrder.tokenPrice ? GREEN : order.tokenPrice < previousOrder.tokenPrice ? RED : BLUE
}

// --------------------------------------------------------------------------
// ORDER BOOk
export const orderBookSelector = createSelector(openOrders, tokens, (orders, tokens) => {

  if (!tokens[0] || !tokens[1]) return;
  
  // Filter orders by selected tokens
  const selectedTokenAddresses = [tokens[0].address, tokens[1].address];
  orders = orders.filter((o) => selectedTokenAddresses.includes(o.tokenGet) && selectedTokenAddresses.includes(o.tokenGive));
  
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
  return orders;
});

// --------------------------------------------------------------------------
// PRICE CHART
export const priceChartSelector = createSelector(filledOrders, tokens, (orders, tokens) => {
  if (!tokens[0] || !tokens[1]) return;

  // Filter orders by selected tokens
  const selectedTokenAddresses = [tokens[0].address, tokens[1].address];
  orders = orders.filter((o) => selectedTokenAddresses.includes(o.tokenGet) && selectedTokenAddresses.includes(o.tokenGive));

  // Sort orders by date ascending to compare history
  orders = orders.sort((a, b) => a.timestamp - b.timestamp);

  // Decorate orders - add display attributes
  orders = orders.map((order) => decorateOrder(order, tokens));
  
  // Get last 2 orders from final price and price change
  let lastOrder, secondLastOrder;
  [secondLastOrder, lastOrder] = orders.slice(orders.length - 2, orders.length);

  // Get last price order price
  const lastPrice = get(lastOrder, 'tokenPrice', 0);
  
  // Get second last order price
  const secondlastPrice = get(secondLastOrder, 'tokenPrice', 0);

  return {
    series: [{
      data: buildGraphData(orders)
    }],
    lastPrice,
    lastPriceChange: (lastPrice > secondlastPrice ? '+' : lastPrice < secondlastPrice ? '-' : '=')
  };
});


const buildGraphData = (orders) => {
  // Group orders by orderType
  orders = groupBy(orders, (o) => moment.unix(o.timestamp).startOf('day').format());

  //Build the graph series
  const graphData = Object.entries(orders).map(([day, group]) => {
    // Calculate price values: open, high, low, close
    const open = group[0]; // first order
    const high = maxBy(group, 'tokenPrice'); // high price
    const low = minBy(group, 'tokenPrice'); // low price
    const close = group[group.length - 1]; // last order
    return {
      x: new Date(day),
      y: [open.tokenPrice, high.tokenPrice, low.tokenPrice, close.tokenPrice]
    }
  });

  return graphData;
}