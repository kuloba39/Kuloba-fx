// ai/strategies/over3.js
// DIGITOVER 3 strategy


function checkOver3(scanner, tickHistory) {

    if (!scanner || !tickHistory) {
        return null;
    }


    const green  = scanner.green;
    const blue   = scanner.blue;
    const yellow = scanner.yellow;
    const red    = scanner.red;



    // RULE 1
    // 0,1,2,3 < 10.5%

    if (
        scanner.distribution[0] >= 10.5 ||
        scanner.distribution[1] >= 10.5 ||
        scanner.distribution[2] >= 10.5 ||
        scanner.distribution[3] >= 10.5
    ) {
        return null;
    }



    // Yellow must be one of 0,1,2,3

    if (yellow.digit > 3) {
        return null;
    }



    // RULE 2
    // Green >= 6

    if (green.digit < 6) {
        return null;
    }



    // Blue >= 6

    if (blue.digit < 6) {
        return null;
    }



    // RULE 3
    // Red > 3

    if (red.digit <= 3) {
        return null;
    }



    // ENTRY:
    // <4 <4 <4 >=6

    const last4 = tickHistory.slice(-4);

    if (last4.length < 4) {
        return null;
    }



    const entry =

        last4[0] < 4 &&
        last4[1] < 4 &&
        last4[2] < 4 &&
        last4[3] >= 6;



    if (!entry) {
        return null;
    }



    return {

        strategy: "OVER_3",

        valid: true,

        direction: "over",

        barrier: 3,

        entrySequence: last4,

        confidence: 84,

        reason: {
            green,
            blue,
            yellow,
            red
        }

    };

}



module.exports = {
    checkOver3
};