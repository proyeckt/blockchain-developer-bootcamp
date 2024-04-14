//import { createStore combineReducers, applyMiddleware } from 'redux';
//import { composeWithDevTools } from 'redux-devtools-extension';
import { combineReducers } from 'redux';
import { configureStore } from '@reduxjs/toolkit'
import thunk from 'redux-thunk';

/* Import Reducers */
import { provider, tokens, exchange } from './reducers';

const reducer = combineReducers({
    provider,
    tokens,
    exchange
});

const preloadedState = {};

const middleware = [thunk];

//const store = createStore (reducer, preloadedState,composeWithDevTools(applyMiddleware(...middleware)));


const store = configureStore ({
    reducer, 
    preloadedState,
    middleware
});

export default store;

