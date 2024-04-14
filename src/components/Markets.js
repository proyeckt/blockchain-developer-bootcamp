
import config from '../config.json';

import { useSelector, useDispatch } from 'react-redux';

import { loadTokens } from '../store/interactions';

const Markets = () => {

    const provider = useSelector(state => state.provider.connection);
    const chainId = useSelector(state => state.provider.chainId);

    const dispatch = useDispatch();

    const handleMarket = async (e) => {
        await loadTokens(provider,e.target.value.split(','), dispatch);
    }

    return (
        <div className="component exchange__markets">
            <div className="component__header">
                <h2>Select Market</h2>
            </div>

            { chainId && config[chainId] ? 
            (
                <select name="markets" id="markets" onChange={handleMarket}>
                    <option value={`${config["31337"].ZLH.address},${config["31337"].mETH.address}`}>ZLH / mETH</option>
                    <option value={`${config["31337"].ZLH.address},${config["31337"].mDAI.address}`}>ZLH / mDAI</option>
                </select>
            )
            : (
                <div>
                    <p>Not Deployed to Network</p>
                </div>
            )}


            <hr />
        </div>
    );
}

export default Markets;