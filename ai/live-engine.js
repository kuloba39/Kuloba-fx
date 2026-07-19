// ai/live-engine.js

const {
    scanAllMarkets
} = require('./signal-scanner');


const {
    selectBestSignal
} = require('./trade-controller');



// Store tick history

const marketTicks = {};



// Maximum history

const MAX_TICKS = 1000;



// Add new tick

function addTick(symbol, digit) {


    if (!marketTicks[symbol]) {

        marketTicks[symbol] = [];

    }



    marketTicks[symbol].push(
        digit
    );



    if (
        marketTicks[symbol].length >
        MAX_TICKS
    ) {

        marketTicks[symbol]
            .shift();

    }

}



// Get all history

function getMarketData() {

    return marketTicks;

}



// Run AI scan

function runAI() {


    const opportunities =
        scanAllMarkets(
            marketTicks
        );



    if (
        !opportunities.length
    ) {

        return null;

    }



    const best =
        selectBestSignal(
            opportunities
        );



    if (best) {

        console.log(
            "AI SIGNAL FOUND",
            best
        );

    }



    return best;

}



// Receive Deriv tick

function processTick(
    tick
) {


    const symbol =
        tick.symbol;



    const quote =
        String(
            tick.quote
        );



    const digit =
        Number(
            quote.slice(-1)
        );



    addTick(
        symbol,
        digit
    );



}



window.AIEngine = {

    processTick,

    runAI,

    getMarketData

};