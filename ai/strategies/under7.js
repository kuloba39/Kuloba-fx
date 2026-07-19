// ai/strategies/under7.js
// DIGITUNDER 7 strategy

function checkUnder7(scanner, tickHistory) {

    if (!scanner || !tickHistory) {
        return null;
    }

    const green = scanner.green;
    const blue  = scanner.blue;
    const red   = scanner.red;

    // RULE 1
    // 7,8,9 below 10%

    if (
        scanner.distribution[7] >= 10 ||
        scanner.distribution[8] >= 10 ||
        scanner.distribution[9] >= 10
    ) {
        return null;
    }

    // RULE 2
    // Green < 6

    if (green.digit >= 6) {
        return null;
    }

    // RULE 3
    // Blue < 6

    if (blue.digit >= 6) {
        return null;
    }

    // RULE 4
    // Red < 7

    if (red.digit >= 7) {
        return null;
    }

    // ENTRY
    // >6 >6 >6 <4

    const last4 = tickHistory.slice(-4);

    if (last4.length < 4) {
        return null;
    }

    const entry =

        last4[0] > 6 &&
        last4[1] > 6 &&
        last4[2] > 6 &&
        last4[3] < 4;

    if (!entry) {
        return null;
    }

    if (!entry) {
        return null;
    }

    return {

        strategy: "UNDER_7",

        valid: true,

        direction: "under",

        barrier: 7,

        entrySequence: last4,

        confidence: 85,

        reason: {
            green,
            blue,
            red
        }
    };
}

window.AIStrategies = window.AIStrategies || {};

window.AIStrategies.checkUnder7 = checkUnder7;