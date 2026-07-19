// ai/strategies/over1.js
// DIGITOVER 1 strategy


function checkOver1(scanner, tickHistory) {

    if (!scanner || !tickHistory) return null;


    const green = scanner.green;
    const blue  = scanner.blue;
    const red   = scanner.red;



    // Green digit 3-7

    if (
        green.digit < 3 ||
        green.digit > 7
    ) {
        return null;
    }



    // Blue digit >2 and <8

    if (
        blue.digit <= 2 ||
        blue.digit >= 8
    ) {
        return null;
    }



    // Red digit >2 and <9

    if (
        red.digit <= 2 ||
        red.digit >= 9
    ) {
        return null;
    }



    // Digit 0 and 1 protection

    if (
        scanner.distribution[0] >= 10 ||
        scanner.distribution[1] >= 10
    ) {
        return null;
    }



    // ENTRY:
    // 3 digits between 0 and 1

    const last3 = tickHistory.slice(-3);


    if (last3.length < 3) {
        return null;
    }



    const entry =
        last3.every(
            d => d === 0 || d === 1
        );



    if (!entry) {
        return null;
    }



    return {

        strategy:"OVER_1",

        valid:true,

        direction:"over",

        barrier:1,

        entrySequence:last3,

        confidence:80,


        reason:{
            green,
            blue,
            red,
            lowDigits:{
                zero:scanner.distribution[0],
                one:scanner.distribution[1]
            }
        }

    };

}



window.AIStrategies = window.AIStrategies || {};

window.AIStrategies.checkOver1 = checkOver1;