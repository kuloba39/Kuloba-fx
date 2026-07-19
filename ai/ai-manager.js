// ai/ai-manager.js

const { checkMatch }   = require('./strategies/match');
const { checkDiffers } = require('./strategies/differs');

const { checkEven } = require('./strategies/even');
const { checkOdd }  = require('./strategies/odd');

const { checkOver1 } = require('./strategies/over1');
const { checkOver2 } = require('./strategies/over2');
const { checkOver3 } = require('./strategies/over3');
const { checkOver6 } = require('./strategies/over6');

const { checkUnder8 } = require('./strategies/under8');
const { checkUnder7 } = require('./strategies/under7');
const { checkUnder6 } = require('./strategies/under6');
const { checkUnder3 } = require('./strategies/under3');


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