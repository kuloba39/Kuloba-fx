// ai/strategies/over6.js
// DIGITOVER 6 strategy


function checkOver6(scanner, tickHistory) {

    if (!scanner || !tickHistory) {
        return null;
    }


    const green = scanner.green;
    const blue  = scanner.blue;
    const red   = scanner.red;



    // RULE 1
    // Green >6 and >=11.5%

    if (green.digit <= 6) {
        return null;
    }

    if (green.percent < 11.5) {
        return null;
    }



    // RULE 2
    // Blue >6 and >=11.5%

    if (blue.digit <= 6) {
        return null;
    }

    if (blue.percent < 11.5) {
        return null;
    }



    // RULE 3
    // Red <6

    if (red.digit >= 6) {
        return null;
    }



    // ENTRY
    // 4 digits >5 then 1 digit >6

    const last5 = tickHistory.slice(-5);

    if (last5.length < 5) {
        return null;
    }



    const entry =

        last5[0] > 5 &&
        last5[1] > 5 &&
        last5[2] > 5 &&
        last5[3] > 5 &&
        last5[4] > 6;



    if (!entry) {
        return null;
    }



    return {

        strategy: "OVER_6",

        valid: true,

        direction: "over",

        barrier: 6,

        entrySequence: last5,

        confidence: 88,

        reason: {
            green,
            blue,
            red
        }

    };

}



module.exports = {
    checkOver6
};