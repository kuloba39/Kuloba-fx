// ai/strategies/over2.js
// DIGITOVER 2 strategy


function checkOver2(scanner, tickHistory) {

    if (!scanner || !tickHistory) return null;



    const green = scanner.green;
    const blue  = scanner.blue;
    const red   = scanner.red;



    // RULE 1:
    // 0,1,2 below 10%

    if (
        scanner.distribution[0] >= 10 ||
        scanner.distribution[1] >= 10 ||
        scanner.distribution[2] >= 10
    ) {
        return null;
    }



    // RULE 2:
    // Green digit 3-7
    // percentage >11.5 and <12.8

    if (
        green.digit < 3 ||
        green.digit > 7
    ) {
        return null;
    }


    if (
        green.percent <= 11.5 ||
        green.percent >= 12.8
    ) {
        return null;
    }



    // RULE 3:
    // Blue digit 3-7

    if (
        blue.digit < 3 ||
        blue.digit > 7
    ) {
        return null;
    }



    // RULE 4:
    // Red >2

    if (red.digit <= 2) {
        return null;
    }



    // ENTRY:
    // 3 digits <3 then 1 digit >5

    const last4 = tickHistory.slice(-4);


    if (last4.length < 4) {
        return null;
    }



    const entry =
        last4[0] < 3 &&
        last4[1] < 3 &&
        last4[2] < 3 &&
        last4[3] > 5;



    if (!entry) {
        return null;
    }



    return {

        strategy:"OVER_2",

        valid:true,

        direction:"over",

        barrier:2,

        entrySequence:last4,

        confidence:82,


        reason:{
            green,
            blue,
            red,

            lowDigits:{
                zero:scanner.distribution[0],
                one:scanner.distribution[1],
                two:scanner.distribution[2]
            }
        }

    };

}



window.AIStrategies = window.AIStrategies || {};

window.AIStrategies.checkOver2 = checkOver2;