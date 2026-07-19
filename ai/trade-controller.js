// ai/trade-controller.js

const {

    isRecoveryMode,
    startRecovery,
    stopRecovery

} = require('./recovery');


const {

    getStake,
    onWin,
    onLoss

} = require('./martingale');



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



module.exports = {

    selectBestSignal,

    handleLoss,

    handleWin,

    getStake

};