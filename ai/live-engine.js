// ai/live-engine.js

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


    let opportunities =
    window.SignalScanner.scanAllMarkets(
        window.marketTicks
    );



    if (
        !opportunities.length
    ) {

        return null;

    }
    // Remove all old MATCH strategies
opportunities = opportunities.filter(signal => {

    if (signal.type === "matches_differs") {

        return signal.strategy === "DIGITMATCH";

    }

    return true;

});



console.log(
    "AI OPPORTUNITIES",
    opportunities
);
console.table(
    opportunities.filter(
        s => s.type === "matches_differs"
    )
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

return opportunities;

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