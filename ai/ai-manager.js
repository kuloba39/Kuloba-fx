// ai/ai-manager.js

// Browser AI strategies
const checkMatch =
    window.AIStrategies.checkMatch;

const checkDiffers =
    window.AIStrategies.checkDiffers;

const checkEven =
    window.AIStrategies.checkEven;

const checkOdd =
    window.AIStrategies.checkOdd;

const checkOver1 =
    window.AIStrategies.checkOver1;

const checkOver2 =
    window.AIStrategies.checkOver2;

const checkOver3 =
    window.AIStrategies.checkOver3;

const checkOver6 =
    window.AIStrategies.checkOver6;

const checkUnder8 =
    window.AIStrategies.checkUnder8;

const checkUnder7 =
    window.AIStrategies.checkUnder7;

const checkUnder6 =
    window.AIStrategies.checkUnder6;

const checkUnder3 =
    window.AIStrategies.checkUnder3;


function runStrategies(scanner, tickHistory) {

    const signals = [];

    const strategies = [

        () => checkMatch(scanner),

        () => checkDiffers(scanner),

        () => checkEven(scanner, tickHistory),
        () => checkOdd(scanner, tickHistory),

        () => checkOver1(scanner, tickHistory),
        () => checkOver2(scanner, tickHistory),
        () => checkOver3(scanner, tickHistory),
        () => checkOver6(scanner, tickHistory),

        () => checkUnder8(scanner, tickHistory),
        () => checkUnder7(scanner, tickHistory),
        () => checkUnder6(scanner, tickHistory),
        () => checkUnder3(scanner, tickHistory)

    ];



    for (const fn of strategies) {

        try {

            const result = fn();

            if (result && result.valid) {
                signals.push(result);
            }

        } catch (err) {

            console.error(
                "Strategy error:",
                err.message
            );

        }

    }

    return signals;

}


module.exports = {
    runStrategies
};