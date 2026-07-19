// ai/strategies/under8.js
// DIGITUNDER 8 strategy

function checkUnder8(scanner, tickHistory) {

    if (!scanner || !tickHistory) {
        return null;
    }

    const green = scanner.green;
    const blue  = scanner.blue;
    const red   = scanner.red;

    // RULE 1
    // 8 and 9 below 10%

    if (
        scanner.distribution[8] >= 10 ||
        scanner.distribution[9] >= 10
    ) {
        return null;
    }

    // RULE 2
    // Green < 7

    if (green.digit >= 7) {
        return null;
    }

    // Blue < 7

    if (blue.digit >= 7) {
        return null;
    }

    // RULE 3
    // Red < 7

    if (red.digit >= 7) {
        return null;
    }

    // ENTRY
    // 8/9, 8/9, 8/9, <4

    const last4 = tickHistory.slice(-4);

    if (last4.length < 4) {
        return null;
    }

    const entry =

        (last4[0] === 8 || last4[0] === 9) &&
        (last4[1] === 8 || last4[1] === 9) &&
        (last4[2] === 8 || last4[2] === 9) &&
        (last4[3] < 4);

    if (!entry) {
        return null;
    }

    return {

        strategy: "UNDER_8",

        valid: true,

        direction: "under",

        barrier: 8,

        entrySequence: last4,

        confidence: 84,

        reason: {
            green,
            blue,
            red
        }
    };
}

module.exports = {
    checkUnder8
};