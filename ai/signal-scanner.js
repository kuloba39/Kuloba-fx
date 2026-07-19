// ai/signal-scanner.js

window.SignalScanner =
window.SignalScanner || {};



function scanAllMarkets(marketData){


    const opportunities=[];



    for(const symbol of window.Markets){


        const ticks =
            marketData[symbol];


        if(!ticks){
            continue;
        }



        const results =
            window.ScannerEngine.scanMarket(
                symbol,
                ticks
            );


        if(results.length){

            opportunities.push(
                ...results
            );

        }

    }



    opportunities.sort(
        (a,b)=>
        b.confidence-a.confidence
    );



    return opportunities;

}



window.SignalScanner.scanAllMarkets =
    scanAllMarkets;