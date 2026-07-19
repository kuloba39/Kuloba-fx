// ai/strategies/even.js
// DIGITEVEN strategy


function isEven(digit) {
    return digit % 2 === 0;
}


function isOdd(digit) {
    return digit % 2 !== 0;
}



function checkEven(scanner, tickHistory) {

    if (!scanner || !tickHistory) return null;



    const greenDigit = scanner.green.digit;
    const blueDigit  = scanner.blue.digit;

    const redDigit   = scanner.red.digit;
    const yellowDigit = scanner.yellow.digit;



    // RULE 1:
    // Green must be EVEN

    if (!isEven(greenDigit)) {
        return null;
    }



    // RULE 2:
    // Blue must be EVEN

    if (!isEven(blueDigit)) {
        return null;
    }



    // RULE 3:
    // Red and Yellow must be ODD

    if (!isOdd(redDigit)) {
        return null;
    }


    if (!isOdd(yellowDigit)) {
        return null;
    }



    // ENTRY CHECK

    const last5 = tickHistory.slice(-5);



    if (last5.length < 5) {
        return null;
    }



    const entry =
        isOdd(last5[0]) &&
        isOdd(last5[1]) &&
        isOdd(last5[2]) &&
        isOdd(last5[3]) &&
        isEven(last5[4]);



    if (!entry) {
        return null;
    }



    return {

        strategy:"EVEN",

        valid:true,

        direction:"even",

        entrySequence:last5,

        confidence:85,


        reason:{

            green:{
                digit:greenDigit
            },

            blue:{
                digit:blueDigit
            },

            red:{
                digit:redDigit
            },

            yellow:{
                digit:yellowDigit
            }

        }

    };

}



module.exports = {
    checkEven
};