var logtext;
var loglevel = 3;
var loginline = false;
var sourceDir = "";
var pilots = [];
var pilotsobj = [];
var results3obj;

function imageExists(image_url){

    var http = new XMLHttpRequest();

    http.open('HEAD', image_url, false);
    http.send();

    return http.status != 404;

}

function log (level, msg) {
    if (logtext === undefined) logtext = "";
    logme = false;
    switch (level) {
    case "DEBUG":
        if (loglevel >= 5) logme = true;
        break;
    case "VERBOSE":
        if (loglevel >= 4) logme = true;
        break;
    case "INFO":
        if (loglevel >= 3) logme = true;
        break;
    case "WARNING":
        if (loglevel >= 2) logme = true;
        break;
    case "ERROR":
        if (loglevel >= 1) logme = true;
        break;
    default:
        logme = true;
    }

    if (logme) {
        console.log(level + ":" + msg);
        if (loginline)
            logtext = logtext + level + ": " + msg + "\n";
    }
}
function showPilot(p) {
    pilotID = p;
    if (pilotsobj[p] !== "" && pilotsobj[p] !== null) {
        document.getElementById('pilot').innerHTML = getPilotResults(pilotsobj[p]);
    }
    return (true);
}

function processData(resultsObject) {
    if (resultsObject.type === "results") {
        document.getElementById('overall').innerHTML = refreshOverallResults(resultsObject);
    } else {
        document.getElementById('pilot').innerHTML = getPilotResults(resultsObject);
    }
    logFlush();
}

function loadScores() {
    loadJSONScores();
}

function loadJSONScores() {

    if (pilotID === "") {
        // Load the overall scores.
        if (typeof(results3obj) === "undefined") {
            alert("I have no score data to load!");
            return;
        }
        processData(results3obj);

    } else {
        if (typeof(pilotsobj) === "undefined" || typeof(pilotsobj[pilotID]) === "undefined") {
            alert("I have no score data to load for pilot " + pilotID + ".");
            return;
        }
        processData(pilotsobj[pilotID]);
    }
}

function logFlush() {
    document.getElementById('log').innerHTML = "<pre>" + logtext + "</pre>";
}

function capitolise(str) {
    return str.substr(0,1).toUpperCase() + str.substr(1).toLowerCase();
}

function addScoreLine(pilotScore) {
    var formattedScore;
    if (pilotScore["thrown"] === "true") { 
        formattedScore = "<div class='thrownscore'>" + pilotScore["nscore"].toFixed(2) + "</div>";
    } else {
        formattedScore = "<div>" + pilotScore["nscore"].toFixed(2) + "</div>"; 
    }

    if (typeof(pilotScore["perc"]) !== 'undefined' && pilotScore["perc"] !== "") {
        if (pilotScore["percthrown"] === "true") { 
            formattedScore += "<div class='thrownscore percentage'>" + pilotScore["perc"] + "%</div>";
        } else {
            formattedScore += "<div class='percentage'>" + pilotScore["perc"] + "%</div>";
        }
    }

    return("<td class='score" + classappend + "'>" + formattedScore + "</td>");
}

function addRoundTypeHeader(type, span) {
    return ("<th class='typehdr' colspan='" + span + "'>" + type + "</th>");
}

function addRoundHeader (roundNumber, roundType, span) {
    var rowspan = 1;
    if (roundType === "Unknown" || roundType === "Freestyle")
        rowspan = 2;
    return "<th class='roundhdr' rowspan='" + rowspan + "' colspan='" + span + "'>Round " + roundNumber + "</th>";
}

function init() {
    // Nothing here yet.
}

function refreshOverallResults(res) {
    var resultData = "";
    var contestName = res.name;
    var timeStamp = res.timestamp;
    resultData += "<div class='comptitle'>" + contestName + "</div>";
    resultData += "<div class='compdate'>Results at: " + timeStamp + "</div>";
    /*
     * For each class we need to loop though all of the pilots.
     * In each pilot we need to fill a multi dimensional array for
     * KNOWN and UNKNOWN rounds.
     * In each of these arrays we create a marker for rounds.   So
     * even if one pilot flew a round, then it's counted in the scores.
     */
    for (i=0;i<res.sections.length;i++) { 
        resultData += ("<h1 class='overalltitle'>" + res.sections[i].class + "</h1>");

        // TYPE, ROUNDNUM, SEQNUM
        var rounds = {};
        var rows=res.sections[i].rows;
        for (j=0;j<rows.length;j++) {
            var scores          = rows[j].scores;
            for (k=0; k<scores.length; k++) {
                type     = scores[k].type;
                round    = scores[k].round;
                sequence = scores[k].sequence;
                rounds[type + "_" + round + "_" + sequence] = "true";
            }
        }
        var roundKeys = Object.keys(rounds);
        var totalRounds = roundKeys.length;
        roundKeys.sort();

        resultData += ("<table id='" + res.sections[i].class + "' class='classresults'><tr><th class='lefthdr' rowspan='3'>Rank</th><th class='lefthdr' rowspan='3'>Pilot</th><th class='lefthdr' rowspan='3'>Final Score</th>");

        log ("INFO", "Round data:" + totalRounds);

        var previousRoundType = "";
        var previousRoundNum;
        var previousSeqNum;
        var roundCount = 0;
        var seqCount = 0;
        var roundNumberRow = "";
        var seqNumberRow = "";
        for(idx=0;idx<totalRounds;idx++) {
            // Count the number of rounds for each round type.
            var key = roundKeys[idx];
            var roundInfo = key.split('_');
            roundInfo[0] = capitolise(roundInfo[0]);
            // In any case, print the seq data.   But not if rount type is unknown.
            if (roundInfo[0] !== "Unknown" && roundInfo[0] !== "Freestyle") 
                seqNumberRow = seqNumberRow + "<th class='seqhdr'>Seq " + roundInfo[2] + "</th>";
            if (previousRoundType === "") {
                previousRoundType = roundInfo[0];
                previousRoundNum  = roundInfo[1];
                previousSeqNum    = roundInfo[2];
            }
            if (previousRoundType === roundInfo[0]) {
                roundCount++;
                if (previousRoundNum !== roundInfo[1]) {
                    // Same round type but now new round.   Spit out Round data.
                    roundNumberRow = roundNumberRow + addRoundHeader(previousRoundNum, previousRoundType, seqCount);
                    previousRoundNum = roundInfo[1];
                    seqCount = 1;
                } else {
                    seqCount++;
                }
            } else {
                    // Round type changed.   Write the header...
                    resultData += addRoundTypeHeader(previousRoundType, roundCount);
                    roundNumberRow = roundNumberRow + addRoundHeader(previousRoundNum, previousRoundType, seqCount);
                    previousRoundType = roundInfo[0];
                    previousRoundNum = roundInfo[1];
                    roundCount = 1;
                    seqCount = 1;
            }
            var val = rounds[key];
            log ("INFO", "Key: " + key + " value:" + val);
        }
        roundNumberRow = roundNumberRow + addRoundHeader(previousRoundNum, previousRoundType, seqCount);
        resultData += addRoundTypeHeader(previousRoundType, roundCount);
        resultData +=  ("</tr>");
        resultData +=  ("<tr>" + roundNumberRow + "</tr>");
        resultData +=  ("<tr>" + seqNumberRow + "</tr>");
        roundCount = 1;
        seqCount = 1;
        previousRoundType = "";

        //That sorts out the header!    Now lets do the data.
        //Loop over rows again!
        evenrow = false;
        for (j=0;j<rows.length;j++) {
            var rank            = rows[j].rank;
            var index           = rows[j].index;
            pilots[index]       = "";
            var pilotName       = rows[j].name;
            var scores          = rows[j].scores;
            var finalscore      = rows[j].s_scaled;
            var finalscoreperc  = rows[j].s_perc;
            log ("INFO", "  Pilot:" + pilotName);
            log ("INFO", "  Rank:" + rank);
            log ("INFO", "  Final Score:" + Number(finalscore).toFixed(2));
            var pilotRounds = {};
            evenrow = !evenrow;
            if (evenrow) { 
                    classappend = "_even";
            } else {
                    classappend = "";
            }
            for (k=0; k<scores.length; k++) {
                thisPilotRound = {};
                type                         = scores[k].type;
                round                        = scores[k].round;
                sequence                     = scores[k].sequence;

                thisPilotRound["type"]       = capitolise(type);
                thisPilotRound["round"]      = round;
                thisPilotRound["sequence"]   = sequence;
                thisPilotRound["thrown"]     = scores[k].thrown;
                thisPilotRound["percthrown"] = scores[k].percthrown;
                thisPilotRound["perc"]       = scores[k].s_perc;
                thisPilotRound["nscore"]     = Number(scores[k].s_scaled);
                pilotRounds[type + "_" + round + "_" + sequence] = thisPilotRound;
                log ("INFO", "    Found:" + type + " " + round + " " + sequence + " " + thisPilotRound["nscore"].toFixed(2));
            }
            // Should have all the data for this pilot now.
            // Spit oput the row, checking that the data matches roundKeys.
            // First, the left side.
            resultData += ("<tr><td class='leftrank" + classappend + "'>" + rank + "</td>");
            resultData += ("<td class='leftpname" + classappend + "'><a class='pname' href='#pilot' onclick=\"showPilot('" + index +"')\">" + pilotName + "</a><div id='pilot_" + index + "_plane'></div></td>");
            resultData += ("<td class='finalscore" + classappend + "'><div>" + Number(finalscore).toFixed(2) + "</div>");
            if (typeof(finalscoreperc) === 'undefined' || finalscoreperc === "") {
                resultData += ("</td>");
            } else {
                resultData += ("<div class='percentage'>" + finalscoreperc + "%</div></td>");
            }
            for(idx=0;idx<totalRounds;idx++) {
                // Count the number of rounds for each round type.
                var key = roundKeys[idx];
                if (pilotRounds[key] === undefined) {
                    // No score for this pilot for this round.
                    resultData += ("<td class='score" + classappend + "'>No data</td>");
                } else {
                    resultData += addScoreLine(pilotRounds[key]);
                }
            }
            resultData += ("</tr>");
        }
        resultData += ("</table><br><br><br>");
    }
    return (resultData);
}

function getPilotResults(res) {
    var pilotResultData = "";

    log("INFO", "Pilot: " + res.pilot_name);
    pilotResultData += "<h1 class='pilottitle'>Scores for pilot: <div class='pilotname'>" + res.pilot_name + "</div></h1>";

    var sections=res.sections;
    // First off, iterate through the sections and build a hashmap.
    sectionmap = {};
    for (i=0;i<sections.length;i++) { 
        sectionType = sections[i].type;
        sectionStartRound = sections[i].start_round;
        sectionEndRound = sections[i].end_round;
        sectionmap[sectionType + "_" + sectionStartRound + "_" + sectionEndRound] = capitolise(sectionType);  // We'll use that at the end.
        log("VERBOSE", "Type: " + sectionType);
    }

    
    var sectionKeys = Object.keys(sectionmap);
    var totalLikeSections = sectionKeys.length;
    sectionKeys.sort();
    for (j=0;j<totalLikeSections;j++) {
        var thisSectionKey = sectionKeys[j];
        var flightDesc      = [];
        var flightKFactor   = [];
        var judgeScores     = []; //  Multi-dem array.  [round][seq][judge][fig]
        var flightData      = []; //  Multi-dem array.  [round][seq][judge]
        var roundSeqList    = [];
        var judgeList        = [];
        
        var sectionFigureList = {}; //  Creates a map of figures in each sequence of each round.   Needed for finding missing score data.

        log ("INFO", "Processing section " + thisSectionKey);
        for (i=0;i<sections.length;i++) {
            var sectionType = sections[i].type;
            var sectionStartRound = sections[i].start_round;
            var sectionEndRound = sections[i].end_round;
            var sectionJudgeSheet = sections[i].judge_sheet;
            judgeList.push(sectionJudgeSheet);
            if (thisSectionKey === sectionType + "_" + sectionStartRound + "_" + sectionEndRound) {
                // Add the data from all flights in this section.
                var flights = sections[i].flights;
                for (k=0;k<flights.length;k++) {
                    var flightRound = flights[k].round;
                    var flightInfo = {};
                    var flightSeq;

                    if (typeof(flights[k].sequence) === 'undefined' || flights[k].sequence === "") {
                        flightInfo["seq"] = 1;
                    } else {
                        // Can be null for rounds like unknwons where there is no seq.
                        flightInfo["seq"] = flights[k].sequence;                        
                    }

                    if (typeof(flights[k].mpp) === 'undefined' || flights[k].mpp === "") {
                        flightInfo["mpp"] = "";
                    } else{
                        flightInfo["mpp"] = flights[k].mpp;
                    }

                    if (typeof(flights[k].ksum) === 'undefined' || flights[k].ksum === "") {
                        flightInfo["ksum"] = 0;
                    } else {
                        flightInfo["ksum"] = flights[k].ksum;
                    }

                    if (typeof(flights[k].penalty) === 'undefined' || flights[k].penalty === "") {
                        flightInfo["penalty"] = 0;
                    } else {
                        flightInfo["penalty"] = flights[k].penalty;
                    }

                    if (typeof(flights[k].score) === 'undefined' || flights[k].score === "") {
                        flightInfo["score"] = 0;
                    } else {
                        flightInfo["score"] = flights[k].score;
                    }

                    flightSeq = flightInfo["seq"];

                    roundSeqList.push(flightRound + "_" + flightInfo["seq"] + "_" + sectionJudgeSheet);
                    var figures = flights[k].figures;
                    log ("INFO", "Found data from judge " + sectionJudgeSheet + " R: " + flightRound + " S: " + flightSeq + " MPP:" + flightInfo["mpp"]);
                    for (l=0;l<figures.length;l++) {
                        var figureNum = figures[l].index;
                        var figureScore = "-";
                        var figureBreak = "false";
                        var figureBox = "false";
                        var figureComment = "";

                        // Update the map so we know where the data holes are.
                        sectionFigureList[figureNum] = "true";
                        if (typeof(figures[l].desc) === 'undefined' || figures[l].desc === "") {
                            flightDesc[figureNum] = "Unknown";
                        } else {
                            flightDesc[figureNum] = figures[l].desc;
                        }

                        if (typeof(figures[l].k_factor) === 'undefined' || figures[l].k_factor === "") {
                            flightKFactor[figureNum] = "0";
                        } else {
                            flightKFactor[figureNum] = figures[l].k_factor;
                        }

                        if (typeof(figures[l].score) === 'undefined' || figures[l].score === "") {
                            figureScore = "-";
                        } else {
                            figureScore = figures[l].score;
                        }


                        if (typeof(figures[l].comment) === 'undefined' || figures[l].comment === "") {
                            figureComment = "";
                        } else {
                            figureComment = figures[l].comment;
                        }

                        if (typeof(figures[l].break_flag) === 'undefined' || figures[l].break_flag === "") {
                            figureBreak = false;
                        } else {
                            figureBreak = figures[l].break_flag;
                        }

                        if (typeof(figures[l].box_flag) === 'undefined' || figures[l].box_flag === "") {
                            figureBox = false;
                        } else {
                            figureBox = figures[l].box_flag;
                        }

                        log ("DEBUG", "   Fig = " + figureNum
                            + " Score = " + figureScore
                            + " Comment = '" + figureComment +"'"
                            + " Break = '" + figureBreak +"'"
                            + " Box = '" + figureBox +"'"
                            + " Desc = '" + flightDesc[figureNum] +"'"
                            + " KFactor = '" + flightKFactor[figureNum] +"'");

                        var figScoreData = {};
                        figScoreData["score"] = figureScore;
                        figScoreData["comment"] = figureComment;
                        figScoreData["break"] = figureBreak;
                        figScoreData["box"] = figureBox;

                        // Add judge data.
                        if (judgeScores === undefined) judgeScores = [];
                        if (judgeScores[flightRound] === undefined) judgeScores[flightRound] = [];
                        if (judgeScores[flightRound][flightSeq] === undefined) judgeScores[flightRound][flightSeq] = [];
                        if (judgeScores[flightRound][flightSeq][sectionJudgeSheet] === undefined) judgeScores[flightRound][flightSeq][sectionJudgeSheet] = [];
                        judgeScores[flightRound][flightSeq][sectionJudgeSheet][figureNum] = figScoreData;

                        // Add flight data.   This is the overall data (mpp, ksum etc)
                        if (flightData === undefined) flightData = [];
                        if (flightData[flightRound] === undefined) flightData[flightRound] = [];
                        if (flightData[flightRound][flightSeq] === undefined) flightData[flightRound][flightSeq] = [];
                        if (flightData[flightRound][flightSeq][sectionJudgeSheet] === undefined) flightData[flightRound][flightSeq][sectionJudgeSheet] = flightInfo;

                    }
                }                
            }
        }
        log ("VERBOSE", "Finished section " + thisSectionKey);
        // Now, loop through all the data.
        var roundKey;
        var seqKey;
        var judgeKey;
        var figKey;

        var tableHeadRnd   = "";
        var tableHeadSeq   = "";
        var tableHeadJudge = "";
        var tableKSumRow = "<td class='leftdatasum_k'>K Factored Sum:</td>";
        var tablePenaltyRow = "<td class='leftdatasum_p'>Penalty:</td>";
        var tableSumRow = "<td class='leftdatasum'>Flight Score:</td>";
        var tableRowData = [];         // Array of strings, for cell data.
        var tableRowScores = [];       // Array of arays of scores for the maths calculations.  [figure][column]
        var tableSumRow;
        var tableKSumRow;
        var tableComments;
        var printSeq;
        var cellBreakString;
        var cellCommentString;
        var tableCommentCount;
        var tableMPPCount;

        printSeq = false;
        tableCommentCount = 0;
        tableMPPCount = 0;
        tableComments = "";
        for (roundKey in judgeScores) {
            tableHeadRnd += "<th class='roundhdr' colspan='" + countColumns(roundKey + "_", roundSeqList) + "'>Round " + roundKey + "</th>";
            log ("INFO", "Round:" + roundKey + " needs " + countColumns(roundKey + "_", roundSeqList) + " columns");
            for (seqKey in judgeScores[roundKey]) {
                var seqColumnCount = countColumns(roundKey + "_" + seqKey + "_", roundSeqList);
                tableHeadSeq += "<th class='seqhdr' colspan='" + seqColumnCount + "'>Seq " + seqKey + "</th>";
                log("INFO", "  Seq: " + seqKey + " needs " + seqColumnCount + " columns");
                if (seqKey > 1)
                    printSeq = true;
                for (judgeKey in judgeScores[roundKey][seqKey]) {
                    log("INFO", "    Judge: " + judgeKey);
                    var mpp = false;
                    var setSumData = false;

                    var figureNumbers = Object.keys(sectionFigureList);
                    figureNumbers.sort();
                    var evenrow = false;
                    for (var figNum=0;figNum<figureNumbers.length;figNum++) {
                        evenrow = !evenrow;
                        var classappend = "";
                        if (evenrow) { 
                            classappend = "_even";
                        }
                        if (judgeScores[roundKey][seqKey][judgeKey][figNum] === undefined) {
                            figScoreData = {};
                            figScoreData["score"] = "-";
                            figScoreData["break"] = "false";
                            figScoreData["box"] = "false";
                            figScoreData["comment"] = "";
  
                            var flightInfo = {};
                            flightInfo["seq"] = "";
                            flightInfo["mpp"] = "false";
                            flightInfo["ksum"] = 0;
                            flightInfo["penalty"] = 0;
                            flightInfo["score"] = 0;
                        
                        } else {
                            figScoreData = judgeScores[roundKey][seqKey][judgeKey][figNum];
                            if (setSumData === false) {
                                flightInfo = flightData[roundKey][seqKey][judgeKey];
                                tableKSumRow    += "<td class='sumdata_k'>" + numberWithCommas(flightInfo["ksum"]) +"</td>";
                                tablePenaltyRow += "<td class='sumdata_p'>" + numberWithCommas(flightInfo["penalty"]) +"</td>";
                                tableSumRow     += "<td class='sumdata'>" + numberWithCommas(flightInfo["score"]) +"</td>";
                                setSumData = true;
                            }
                            if (flightInfo["mpp"] === "true") {
                                if (tableMPPCount === 0 && mpp !== true)
                                    tableComments += "<tr><td class='comment'>[pp] - Missing scale pilot/panel penalty was assessed (tableMPPCount)</td></tr>";
                                mpp = true;
                            }
                        }
                        log("INFO", "      Fig(" + figNum + "): score=" + figScoreData["score"] + " break=" + figScoreData["break"] + " box=" + figScoreData["box"] + " comment=" + figScoreData["comment"]);
                        if (typeof(tableRowData[figNum]) === 'undefined' || tableRowData[figNum] === null || tableRowData[figNum] === "" ) {
                            tableRowData[figNum] = "<td class='leftdata" + classappend + "'>" + (Number(figNum) + 1)+ ": " + flightDesc[figNum] + " (k=" + flightKFactor[figNum] + ")</td><td class='score" + classappend + "'>" + figScoreData["score"] + "</td>";
                        } else {
                            cellBreakString = "";
                            if(figScoreData["break"] === "true")
                                cellBreakString = "<div class='brstr'>[br]</div>";

                            if(figScoreData["box"] === "true")
                                cellBreakString += "<div class='brstr'>[bx]</div>";

                            if(typeof(tableRowData[figNum]) === 'undefined' || figScoreData["comment"] === "") {
                                cellCommentString = "";
                            } else {
                                cellCommentString = "<div class='comstr'>[*" + ++tableCommentCount + "]</div>";
                                tableComments += "<tr><td class='comment'>[*" + tableCommentCount + "] - " + figScoreData["comment"] + "</td></tr>";
                            }
                        
                            if (figScoreData["score"] === "0"  || figScoreData["score"] === "0.0")
                                tableRowData[figNum] += "<td class='scorehighlight" + classappend + "'>" + figScoreData["score"] + " " + cellBreakString + " " + cellCommentString + "</td>";
                            else
                                tableRowData[figNum] += "<td class='score" + classappend + "'>" + figScoreData["score"] + " " + cellBreakString + " " + cellCommentString + "</td>";
                        }
                        if (typeof(tableRowScores[figNum]) === 'undefined' || tableRowScores[figNum] === null || tableRowScores[figNum] === "") {
                            tableRowScores[figNum] = [];
                        }
                        tableRowScores[figNum].push(figScoreData["score"]);
                    }
                    if (mpp) {
                        tableMPPCount++;
                        tableHeadJudge += "<th class='judgehdr'>Judge " + judgeKey + " [pp]</th>";
                    } else {
                        tableHeadJudge += "<th class='judgehdr'>Judge " + judgeKey + "</th>";
                    }
                }
            }
        }
        
        var columnNumber = 0;
        var tableRawSumRow = "<td class='leftdatasum'>Simple Sum:</td>";
        for (columnNumber=0;columnNumber<tableRowScores[0].length;columnNumber++) {
            // Looping through the table horizontally.
            var sum = 0;
            //var ksum = 0;
            for (figNum=0;figNum<tableRowScores.length;figNum++) {
                if (isNumeric(tableRowScores[figNum][columnNumber])) {
                    sum += Number(tableRowScores[figNum][columnNumber]);
                    //ksum += Number(tableRowScores[figNum][columnNumber]) * Number(flightKFactor[figNum]);
                }
            }
            tableRawSumRow  += "<td class='sumdata'>" + sum + "</td>";
        }

        log ("INFO", "Writing data for section " + sectionmap[thisSectionKey]);
        var secInfo = thisSectionKey.split("_");
        pilotResultData += ("<h2 class='sectiontitle'>" + sectionmap[thisSectionKey] + " rounds " + secInfo[1] + " to " + secInfo[2] + " </h2>");
        pilotResultData += ("<div>");
        // Check image file.
        var imgurl = "/pilotphoto/pilot_" + res.pilot_imac_number + ".png";
        if (location.protocol !== "file:" && imageExists(imgurl)) {
            pilotResultData += ("<img width='120' src='" + imgurl + "'>");
        }
        pilotResultData += ("</div>");
        pilotResultData += ("<div>");

        
        if (printSeq) {
            pilotResultData += "<table class='pilotresults'><thead><tr><th class='lefthdr' rowspan='3'>&nbsp;</th>" + tableHeadRnd + "</tr>";
            pilotResultData += "<tr>" + tableHeadSeq + "</tr>";
        } else {
            pilotResultData += "<table class='pilotresults'><thead><tr><th class='lefthdr' rowspan='2'>&nbsp;</th>" + tableHeadRnd + "</tr>";
        }
        pilotResultData += "<tr>" + tableHeadJudge + "</tr></thead>";
        pilotResultData += "<tbody>";
        for (figKey in tableRowData) {
            pilotResultData += "<tr>" + tableRowData[figKey] + "</tr>";
        }
        pilotResultData += "</tbody>";
        pilotResultData += "<tfoot>";
        pilotResultData += "<tr>" + tableRawSumRow + "</tr>";
        pilotResultData += "<tr>" + tableKSumRow + "</tr>";
        pilotResultData += "<tr>" + tablePenaltyRow + "</tr>";
        pilotResultData += "<tr>" + tableSumRow + "</tr>";
        pilotResultData += "</tfoot>";
        pilotResultData += "</table>";
        pilotResultData += "</div>";

        if (tableCommentCount > 0 || tableMPPCount > 0) {
            var MPPString;
            MPPString = tableMPPCount + " time";
            if (tableMPPCount > 1)
                MPPString += "s";
            pilotResultData += "<table class='comments'><tr><td class='commentshdr'>Comments:</td></tr>" + tableComments.replace("tableMPPCount", MPPString) + "</table>";
        }

        pilotResultData += "<br><br>";
    }
    return (pilotResultData);
}

function getPilotDetails(detail, xmlDoc) {
    if (xmlDoc === null || typeof(xmlDoc) === 'undefined')
      return null;
    var report=xmlDoc.getElementsByTagName("report");
    var pilot=report[0].getElementsByTagName("pilot");
    if (typeof(pilot[0].getElementsByTagName(detail)[0]) === 'undefined') {
        return null;
    } else {
        return (pilot[0].getElementsByTagName(detail)[0].childNodes[0].nodeValue);
    }
}

function isNumeric(n) {
    return !isNaN(parseFloat(n)) && isFinite(n);
}

function numberWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function countColumns (strKey, arrSeqList) {
    var arrCtr;
    var count = 0;
    
    for (arrCtr = 0 ; arrCtr < arrSeqList.length ; arrCtr++) {
        if (arrSeqList[arrCtr].substr(0, strKey.length) === strKey)
            count++;
    }
    return (count);
}

function getParameterByName(name) {
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)");
    results = regex.exec(location.search);
    return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}

