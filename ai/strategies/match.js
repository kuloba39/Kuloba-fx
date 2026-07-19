// ai/strategies/match.js
// DIGITMATCH strategy


function checkMatch(scanner) {

    if (!scanner) return null;


    const greenDigit = scanner.green.digit;
    const greenPct   = scanner.green.percent;

    const blueDigit  = scanner.blue.digit;
    const bluePct    = scanner.blue.percent;



    // Strategy rules:
    // 1. Predicted digit must be BLUE bar
    // 2. Green and Blue percentage difference <= 0.3%


    const difference = Math.abs(
        greenPct - bluePct
    );


    if (difference > 0.3) {
        return null;
    }



    return {

        strategy: "DIGITMATCH",

        valid: true,

        digit: blueDigit,

        entry: "WAIT_GREEN_TOUCH",

        confidence: Number(
            (100 - difference * 100).toFixed(1)
        ),

        reason: {
            green: {
                digit: greenDigit,
                percent: greenPct
            },

            blue: {
                digit: blueDigit,
                percent: bluePct
            },

            difference
        }

    };

}



module.exports = {
    checkMatch
};