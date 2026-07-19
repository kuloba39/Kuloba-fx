// ai/recovery.js

let recoveryMode = false;

let originalSignal = null;

let originalMarket = null;



function startRecovery(
    signal,
    market
) {

    recoveryMode = true;

    originalSignal = signal;

    originalMarket = market;

}



function stopRecovery() {

    recoveryMode = false;

    originalSignal = null;

    originalMarket = null;

}



function isRecoveryMode() {

    return recoveryMode;

}



function getOriginalSignal() {

    return originalSignal;

}



function getOriginalMarket() {

    return originalMarket;

}



module.exports = {

    startRecovery,

    stopRecovery,

    isRecoveryMode,

    getOriginalSignal,

    getOriginalMarket

};