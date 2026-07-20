// ai/trade-controller.js

window.TradeController = window.TradeController || {};


const recovery =
    window.Recovery || {};


const martingale =
    window.Martingale || {};



function selectBestSignal(
    opportunities
) {

    if (
        !opportunities ||
        !opportunities.length
    ) {
        return null;
    }


    opportunities.sort(
        (a,b)=>
            b.confidence -
            a.confidence
    );


    return opportunities[0];

}



function handleLoss(
    signal,
    market
) {

    if (martingale.onLoss) {
        martingale.onLoss();
    }


    if (
        signal &&
        (
        signal.direction === "over" ||
        signal.direction === "under"
        )
    ) {

        if (recovery.startRecovery) {

            recovery.startRecovery(
                signal,
                market
            );

        }


        console.log(
            "RECOVERY STARTED"
        );

    }

}



function handleWin() {

    if (isRecoveryMode()) {

        stopRecovery();

        console.log(
            "RECOVERY COMPLETED"
        );

    }


    onWin();


    // sync AI stake back to bot stake

    if (window.Martingale) {

        const resetStake =
            window.Martingale.getStake();


        window.currentStake =
            resetStake;


        console.log(
            "STAKE RESET:",
            resetStake
        );

    }

}



window.TradeController.selectBestSignal =
    selectBestSignal;


window.TradeController.handleLoss =
    handleLoss;


window.TradeController.handleWin =
    handleWin;


window.TradeController.getStake =
    martingale.getStake ||
    function(){
        return 1;
    };