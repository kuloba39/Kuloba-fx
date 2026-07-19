// ai/strategies/under3.js
// DIGITUNDER 3 strategy

function checkUnder3(scanner, tickHistory) {

    if (!scanner || !tickHistory) {
        return null;
    }

    const green = scanner.green;
    const blue  = scanner.blue;
    const red   = scanner.red;

    // RULE 1
    // Green <3 and >11.5%

    if (green.digit >= 3) {
        return null;
    }

    if (green.percent <= 11.5) {
        return null;
    }

    // RULE 2
    // Blue <3 and >11.5%

    if (blue.digit >= 3) {
        return null;
    }

    if (blue.percent <= 11.5) {
        return null;
    }

    // RULE 3
    // Red >4

    if (red.digit <= 4) {
        return null;
    }

    // ENTRY
    // 4 digits >4 then 1 digit <3

    const last5 = tickHistory.slice(-5);

    if (last5.length < 5) {
        return null;
    }

    const entry =
        last5[0] > 4 &&
        last5[1] > 4 &&
        last5[2] > 4 &&
        last5[3] > 4 &&
        last5[4] < 3;

    if (!entry) {
        return null;
    }

    return {

        strategy: "UNDER_3",

        valid: true,

        direction: "under",

        barrier: 3,

        entrySequence: last5,

        confidence: 90,

        reason: {
            green,
            blue,
            red
        }

    };

}

window.AIStrategies = window.AIStrategies || {};

window.AIStrategies.checkUnder3 = checkUnder3;