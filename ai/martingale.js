// ai/martingale.js

const MARTINGALE_MULTIPLIER = 2.1;


window.MartingaleState =
    window.MartingaleState || {

        baseStake: 1,
        currentStake: 1

    };



function setBaseStake(stake) {

    window.MartingaleState.baseStake =
        Number(stake);


    window.MartingaleState.currentStake =
        Number(stake);

}



function getStake() {

    return Number(
        window.MartingaleState.currentStake
    );

}



function onWin() {

    window.MartingaleState.currentStake =
        window.MartingaleState.baseStake;


    window.currentStake =
        window.MartingaleState.baseStake;


    return window.MartingaleState.currentStake;

}



function onLoss() {

    window.MartingaleState.currentStake =
        Number(
            (
                window.MartingaleState.currentStake *
                MARTINGALE_MULTIPLIER
            ).toFixed(2)
        );


    return window.MartingaleState.currentStake;

}



function resetMartingale() {

    window.MartingaleState.currentStake =
        window.MartingaleState.baseStake;

}



window.Martingale = {

    setBaseStake,

    getStake,

    onWin,

    onLoss,

    resetMartingale

};