// ai/trade-controller.js


const isRecoveryMode =
    window.Recovery?.isRecoveryMode ||
    function(){ return false; };


const startRecovery =
    window.Recovery?.startRecovery ||
    function(){};


const stopRecovery =
    window.Recovery?.stopRecovery ||
    function(){};


const getStake =
    window.Martingale?.getStake ||
    function(){ return 1; };


const onWin =
    window.Martingale?.onWin ||
    function(){};


const onLoss =
    window.Martingale?.onLoss ||
    function(){};




// SELECT BEST AI SIGNAL

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
            b.confidence - a.confidence
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





function handleWin(){

    onWin();



    if(
        isRecoveryMode()
    ){

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