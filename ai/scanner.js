// ai/scanner.js
// Digit distribution engine
// Reads last 1000 ticks and creates Green / Blue / Yellow / Red ranking


function analyzeDigits(ticks) {

    if (!ticks || ticks.length === 0) {
        return null;
    }


    const counts = {};

    for (let i = 0; i <= 9; i++) {
        counts[i] = 0;
    }


    // Count last digit frequency
    ticks.forEach(price => {

        const digit = Number(
            String(price).slice(-1)
        );

        if (digit >= 0 && digit <= 9) {
            counts[digit]++;
        }

    });


    const total = ticks.length;


    // Convert to percentages
    const distribution = {};

    Object.keys(counts).forEach(digit => {

        distribution[digit] = Number(
            ((counts[digit] / total) * 100).toFixed(2)
        );

    });



    // Sort highest to lowest
    const ranked = Object.entries(distribution)
        .sort((a,b)=>b[1]-a[1])
        .map(item => ({
            digit:Number(item[0]),
            percent:item[1]
        }));



    return {

        totalTicks: total,

        distribution,

        green: ranked[0],     // Most appearing

        blue: ranked[1],      // Second most appearing

        yellow: ranked[8],    // Second least appearing

        red: ranked[9],       // Least appearing


        ranked

    };

}



module.exports = {
    analyzeDigits
};