// ai/strategies/under6.js
// DIGITUNDER 6 strategy

function checkUnder6(scanner, tickHistory) {

    if (!scanner || !tickHistory) {
        return null;
    }

    const green = scanner.green;
    const blue  = scanner.blue;
    const red   = scanner.red;

    // RULE 1
    // 6,7,8,9 below 9.8%

    if (
        scanner.distribution[6] >= 9.8 ||
        scanner.distribution[7] >= 9.8 ||
        scanner.distribution[8] >= 9.8 ||
        scanner.distribution[9] >= 9.8
    ) {
        return null;
    }

    // RULE 2
    // Green <5

    if (green.digit >= 5) {
        return null;
    }

    // RULE 3
    // Blue <5

    if (blue.digit >= 5) {
        return null;
    }

    // RULE 4
    // Red <6

    if (red.digit >= 6) {
        return null;
    }

    // ENTRY
    // >6 >6 >6 <3

    const last4 = tickHistory.slice(-4);

    if (last4.length < 4) {
        return null;
    }

    const entry =
        last4[0] > 6 &&
        last4[1] > 6 &&
        last4[2] > 6 &&
        last4[3] < 3;

    if (!entry) {
        return null;
    }

    return {

        strategy: "UNDER_6",

        valid: true,

        direction: "under",

        barrier: 6,

        entrySequence: last4,

        confidence: 87,

        reason: {
            green,
            blue,
            red
        }

    };

}

window.AIStrategies = window.AIStrategies || {};

window.AIStrategies.checkUnder6 = checkUnder6;