import { useSelector } from "react-redux";
import Banner from './Banner';
import Chart from 'react-apexcharts';
import { options, defaultSeries } from './PriceChart.config';
import { priceChartSelector } from '../store/selectors';

import arrowUp from '../assets/up-arrow.svg';
import arrowDown from '../assets/down-arrow.svg';
import arrowNeutral from '../assets/neutral-arrow.svg';

const PriceChart = () => {

  const account = useSelector(state => state.provider.account);
  const symbols = useSelector(state => state.tokens.symbols);

  const priceChart = useSelector(priceChartSelector);

  return (
    <div className="component exchange__chart">
      <div className='component__header flex-between'>
        <div className='flex'>

          <h2>{symbols && `${symbols[0]}/${symbols[1]}`}</h2>

          {priceChart && (
            <div className='flex'>
              { priceChart.lastPriceChange === '+' ? 
                <img src={arrowUp} alt="Arrow Up" /> :
                priceChart.lastPriceChange === '-' ? 
                <img src={arrowDown} alt="Arrow Down" /> :
                <img src={arrowNeutral} alt="Arrow Neutral" /> 
              }
              <span className='up'>{priceChart.lastPrice}</span>
            </div>
          )}

        </div>
      </div>

      {!account ? <Banner text="Please connect Metamask" />
        : <Chart
          type="candlestick"
          options={options}
          series={priceChart ? priceChart.series : defaultSeries}
          width='100%'
          height='100%'
        />}

    </div>
  );
}

export default PriceChart;