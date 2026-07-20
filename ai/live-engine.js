// ai/live-engine.js

// browser AI dependencies
const opportunities =
    window.SignalScanner.scanAllMarkets(
        window.marketTicks
    );


const best =
    window.TradeController.selectBestSignal(
        opportunities
    );;



// Store tick history

window.marketTicks =
    window.marketTicks || {};



// Maximum history

const MAX_TICKS = 1000;



// Add new tick

function addTick(symbol, digit) {


    if (!window.marketTicks[symbol]) {

        window.marketTicks[symbol] = [];

    }



    window.marketTicks[symbol].push(
        digit
    );



    if (
        window.marketTicks[symbol].length >
        MAX_TICKS
    ) {

        window.marketTicks[symbol]
            .shift();

    }

}



// Get all history

function getMarketData() {

    return window.marketTicks;

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



console.log(
    "AI OPPORTUNITIES",
    opportunities
);

const best =
    selectBestSignal(
        opportunities
    );

if (best) {

    console.log(
        "AI BEST SIGNAL",
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
function processHistory(symbol, prices) {

    if (!prices || !prices.length) {
        return;
    }


    window.marketTicks[symbol] = [];


    for (const price of prices) {

        const digit =
            Number(
                String(price).slice(-1)
            );


        window.marketTicks[symbol].push(digit);

    }


    // keep only latest 1000

    if (window.marketTicks[symbol].length > MAX_TICKS) {

        window.marketTicks[symbol] =
            window.marketTicks[symbol].slice(-MAX_TICKS);

    }


    console.log(
        "AI HISTORY LOADED",
        symbol,
        window.marketTicks[symbol].length
    );

}



window.AIEngine = {

    processTick,

    processHistory,

    runAI,

    getMarketData

};