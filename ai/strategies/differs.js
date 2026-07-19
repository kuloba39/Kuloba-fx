// ai/strategies/differs.js
// DIGITDIFF strategy


function checkDiffers(scanner) {

    if (!scanner) return null;


    const greenDigit = scanner.green.digit;
    const greenPct   = scanner.green.percent;


    const redDigit = scanner.red.digit;
    const redPct   = scanner.red.percent;


    const yellowDigit = scanner.yellow.digit;
    const yellowPct   = scanner.yellow.percent;



    // RULE 1:
    // Green bar percentage >= 12.8%

    if (greenPct < 12.8) {
        return null;
    }



    // RULE 2:
    // Red bar percentage >= 8%

    if (redPct < 8.0) {
        return null;
    }



    // RULE 3:
    // Yellow - Red difference >= 0.5%

    const difference = Math.abs(
        yellowPct - redPct
    );


    if (difference < 0.5) {
        return null;
    }



    return {

        strategy: "DIFFERS",

        valid: true,


        // Digit that should be avoided
        barrierDigit: yellowDigit,


        entry: "YELLOW_DIGIT",


        confidence: Number(
            (
                greenPct +
                redPct +
                difference
            ).toFixed(2)
        ),


        reason: {

            green:{
                digit: greenDigit,
                percent: greenPct
            },

            red:{
                digit: redDigit,
                percent: redPct
            },

            yellow:{
                digit: yellowDigit,
                percent: yellowPct
            },

            difference

        }

    };

}



window.AIStrategies = window.AIStrategies || {};

window.AIStrategies.checkDiffers = checkDiffers;