// ai/trade-controller.js

const isRecoveryMode =
    window.Recovery.isRecoveryMode;

const startRecovery =
    window.Recovery.startRecovery;

const stopRecovery =
    window.Recovery.stopRecovery;


const getStake =
    window.Martingale.getStake;

const onWin =
    window.Martingale.onWin;

const onLoss =
    window.Martingale.onLoss;



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
        (a, b) =>
            b.confidence -
            a.confidence
    );



    return opportunities[0];

}



function handleLoss(
    signal,
    market
) {

    onLoss();



    if (
        signal.direction === "over" ||
        signal.direction === "under"
    ) {

        startRecovery(
            signal,
            market
        );

        console.log(
            "RECOVERY STARTED"
        );
    }

}



function handleWin() {

    onWin();



    if (
        isRecoveryMode()
    ) {

        stopRecovery();

        console.log(
            "RECOVERY COMPLETED"
        );
    }

}



window.TradeController = {

    selectBestSignal,

    handleLoss,

    handleWin,

    getStake

};