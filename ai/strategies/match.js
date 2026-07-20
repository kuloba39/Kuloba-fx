// ai/strategies/match.js
// DIGITMATCH strategy

function checkMatch(scanner) {

    if (!scanner) return null;


    const greenDigit = scanner.green.digit;
    const greenPct   = scanner.green.percent;

    const blueDigit  = scanner.blue.digit;
    const bluePct    = scanner.blue.percent;


    // Green and Blue percentage difference
    const difference = Math.abs(
        greenPct - bluePct
    );


    // Difference must be <= 0.3%
    if (difference > 0.10) {
        return null;
    }
    if (
    greenPct < 8 ||
    bluePct < 8
    ) {    
    return null;
   }
   console.log(
    "MATCH CHECK",
    {
        greenDigit,
        greenPct,
        blueDigit,
        bluePct,
        difference
    }
    );


    return {

        strategy: "DIGITMATCH",

        type: "matches_differs",

        direction: "matches",

        valid: true,

        digit: blueDigit,

        prediction: blueDigit,

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


window.AIStrategies = window.AIStrategies || {};

window.AIStrategies.checkMatch = checkMatch;