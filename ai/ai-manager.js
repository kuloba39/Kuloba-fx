// ai/ai-manager.js


window.AIManager = window.AIManager || {};



function runStrategies(scanner, tickHistory) {

    const signals = [];



    const strategies = [

        () => window.AIStrategies.checkMatch(scanner),
              


        () => window.AIStrategies.checkEven(
            scanner,
            tickHistory
        ),


        () => window.AIStrategies.checkOdd(
            scanner,
            tickHistory
        ),



        () => window.AIStrategies.checkOver1(
            scanner,
            tickHistory
        ),


        () => window.AIStrategies.checkOver2(
            scanner,
            tickHistory
        ),


        () => window.AIStrategies.checkOver3(
            scanner,
            tickHistory
        ),


        () => window.AIStrategies.checkOver6(
            scanner,
            tickHistory
        ),



        () => window.AIStrategies.checkUnder8(
            scanner,
            tickHistory
        ),


        () => window.AIStrategies.checkUnder7(
            scanner,
            tickHistory
        ),


        () => window.AIStrategies.checkUnder6(
            scanner,
            tickHistory
        ),


        () => window.AIStrategies.checkUnder3(
            scanner,
            tickHistory
        )

    ];




    for (const strategy of strategies) {


        try {


            const result = strategy();



            if (
                result &&
                result.valid
            ) {

                signals.push(result);

            }



        } catch(error) {


            console.error(
                "AI STRATEGY ERROR",
                error
            );


        }


    }



    return signals;

}





window.AIManager.runStrategies =
    runStrategies;