// ai/signal-scanner.js

const markets =
    window.AIMarkets;


const scanMarket =
    window.ScannerEngine.scanMarket;



function scanAllMarkets(
    marketData
) {

    const opportunities = [];



    for (const symbol of markets) {

        const ticks =
            marketData[symbol];



        if (!ticks) {
            continue;
        }



        const results =
            scanMarket(
                symbol,
                ticks
            );



        if (results.length) {

            opportunities.push(
                ...results
            );
        }

    }



    opportunities.sort(
        (a, b) =>
            b.confidence -
            a.confidence
    );



    return opportunities;

}



window.SignalScanner = {

    scanAllMarkets

};