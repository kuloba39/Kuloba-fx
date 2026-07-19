// ai/martingale.js

const MARTINGALE_MULTIPLIER = 2.1;

let baseStake = 1;
let currentStake = 1;


function setBaseStake(stake) {

    baseStake = Number(stake);
    currentStake = Number(stake);

}


function getStake() {

    return Number(currentStake);

}


function onWin() {

    currentStake = baseStake;

    return currentStake;

}


function onLoss() {

    currentStake =
        Number(
            (
                currentStake *
                MARTINGALE_MULTIPLIER
            ).toFixed(2)
        );

    return currentStake;

}


function resetMartingale() {

    currentStake = baseStake;

}


module.exports = {

    setBaseStake,

    getStake,

    onWin,

    onLoss,

    resetMartingale

};