// ai/scanner-engine.js

const { runStrategies } = require('./ai-manager');



function buildScanner(ticks) {

    const counts = Array(10).fill(0);

    for (const digit of ticks) {

        if (
            digit >= 0 &&
            digit <= 9
        ) {
            counts[digit]++;
        }

    }

    const total = ticks.length || 1;

    const distribution = counts.map(c =>

        Number(
            ((c / total) * 100).toFixed(2)
        )

    );

    const ranked = distribution
        .map((percent, digit) => ({
            digit,
            percent
        }))
        .sort((a, b) => b.percent - a.percent);

    return {

        distribution,

        ranked,

        green: ranked[0],

        blue: ranked[1],

        yellow: ranked[8],

        red: ranked[9],

        greenBlueDiff:
            Number(
                Math.abs(
                    ranked[0].percent -
                    ranked[1].percent
                ).toFixed(2)
            ),

        yellowRedDiff:
            Number(
                Math.abs(
                    ranked[8].percent -
                    ranked[9].percent
                ).toFixed(2)
            )

    };

}



function scanMarket(symbol, tickHistory) {

    if (!tickHistory) {
        return [];
    }



    if (tickHistory.length < 1000) {
        return [];
    }



    const scanner =
        buildScanner(tickHistory);



    const signals =
        runStrategies(
            scanner,
            tickHistory
        );



    return signals.map(sig => ({

        ...sig,

        symbol

    }));

}



module.exports = {

    buildScanner,

    scanMarket

}