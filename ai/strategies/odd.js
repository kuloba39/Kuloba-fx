// ai/strategies/odd.js
// DIGITODD strategy


function isEven(digit) {
    return digit % 2 === 0;
}


function isOdd(digit) {
    return digit % 2 !== 0;
}



function checkOdd(scanner, tickHistory) {

    if (!scanner || !tickHistory) return null;



    const greenDigit = scanner.green.digit;
    const greenPct   = scanner.green.percent;

    const blueDigit = scanner.blue.digit;

    const yellowDigit = scanner.yellow.digit;

    const redDigit = scanner.red.digit;



    // RULE 1:
    // Green must be ODD and >= 12.6%

    if (!isOdd(greenDigit)) {
        return null;
    }


    if (greenPct < 12.6) {
        return null;
    }



    // RULE 2:
    // Blue must be ODD

    if (!isOdd(blueDigit)) {
        return null;
    }



    // RULE 3:
    // Yellow must be EVEN

    if (!isEven(yellowDigit)) {
        return null;
    }



    // RULE 4:
    // Red must be EVEN

    if (!isEven(redDigit)) {
        return null;
    }



    // ENTRY:
    // Yellow, Even, Even, Odd

    const last4 = tickHistory.slice(-4);


    if (last4.length < 4) {
        return null;
    }



    const entry =
        last4[0] === yellowDigit &&
        isEven(last4[1]) &&
        isEven(last4[2]) &&
        isOdd(last4[3]);



    if (!entry) {
        return null;
    }



    return {

        strategy:"ODD",

        valid:true,

        direction:"odd",

        entrySequence:last4,

        confidence:85,


        reason:{

            green:{
                digit:greenDigit,
                percent:greenPct
            },

            blue:{
                digit:blueDigit
            },

            yellow:{
                digit:yellowDigit
            },

            red:{
                digit:redDigit
            }

        }

    };

}



window.AIStrategies = window.AIStrategies || {};

window.AIStrategies.checkOdd = checkOdd;