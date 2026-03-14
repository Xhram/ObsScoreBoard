function sel(value){
    return document.querySelector(value)
}
function selall(value){
    return document.querySelectorAll(value)
}

let cm = new connection_manager({
    role: "admin",
    reconnectIntervalTime: 2000,
    password: localStorage.getItem("password")
});


cm.onAuth = () => {
    sel("#auth").classList.add("hide")
    sel("#controls").classList.remove("hide")
    updateDebugInfo();
}
cm.onPong = () => {
    updateDebugInfo();
}
sel("#password").value = localStorage.getItem("password")
sel("#login").addEventListener("click", cm.connect);
cm.connect();
sel("#password").addEventListener("input",(input_event)=>{localStorage.setItem("password", input_event.srcElement.value); cm.password = input_event.srcElement.value;});
sel("#password").addEventListener("keydown", (event) => {if (event.key === "Enter") {cm.password = sel("#password").value; cm.connect()}});


updateDebugInfo()
function updateDebugInfo(){
    let output = "";
    if (cm.isConnected) {
        if (cm.isAuthenticated) {
            output = `Online (${cm.role}), IPR: ${cm._intelligentPredictiveRendering ? "Enabled" : "Disabled"}`;
            if(cm.serverTimeSyncFound){
                output += `, Ping: ${(cm.ping * 2).toFixed(0)} ms, Offset: ${cm.serverTimeOffset.toFixed(0)} ms`
            }

        } else {
            output = "Authenticating...";
        }
    } else {
        output = "Offline";
    }
    sel("#connection-status").innerHTML = output;

}

let elm = {
    // Team Scores
    homeTeamScore: sel("#home-team-score"),
    awayTeamScore: sel("#away-team-score"),
    
    // Game Timer
    gameTimerDuration: sel("#game-timer-duration"),
    gameTimerDurationDefault: sel("#game-timer-duration-default"),


    // Shot Clock
    shotClockDuration: sel("#shot-clock-duration"),
    shotClockDurationDefault: sel("#shot-clock-duration-default"),
    
    // Start stop buttons for clocks
    gameTimerToggleButton: sel("#game-timer-toggle"),
    shotClockToggleButton: sel("#shot-clock-toggle"),

    // Down & Distance
    down: sel("#down"),
    distance: sel("#distance"),
    
    // Quarter & Period
    quarter: sel("#quarter"),
    
    // Home Team Management
    homeTeamName: sel("#home-team-name"),
    homeTeamLogo: sel("#home-team-logo"),
    homeTeamColor: sel("#home-team-color"),
    homeTeamColorHex: sel("#home-team-color-hex"),
    homeTimeouts: sel("#home-timeouts"),
    
    // Away Team Management
    awayTeamName: sel("#away-team-name"),
    awayTeamLogo: sel("#away-team-logo"),
    awayTeamColor: sel("#away-team-color"),
    awayTeamColorHex: sel("#away-team-color-hex"),
    awayTimeouts: sel("#away-timeouts"),
    
    // Player Numbers
    homePlayerNumber: sel("#home-player-number"),
    awayPlayerNumber: sel("#away-player-number"),
    
    // Display Settings
    themeSelector: sel("#theme-selector")
}

const toggleUi = {
    visibility: {
        scores: sel("#toggle-scores"),
        gameClock: sel("#toggle-game-clock"),
        playClock: sel("#toggle-play-clock"),
        downDistance: sel("#toggle-down-distance"),
    },
    possession: {
        home: sel("#home-possession"),
        away: sel("#away-possession"),
        none: sel("#clear-possession"),
    },
    flag: {
        emit: sel("#emit-flag"),
        hide: sel("#hide-flag"),
    },
};

let currentPossession = "none";
let currentFlagState = {
    isFlagEmitted: false,
};

function setToggleVisualState(element, isOn) {
    if (!element) {
        return;
    }
    element.classList.toggle("toggle-on", Boolean(isOn));
    element.classList.toggle("toggle-off", !isOn);
}

function updateVisibilityToggleButtons() {
    setToggleVisualState(toggleUi.visibility.scores, visibilityState.scores !== false);
    setToggleVisualState(toggleUi.visibility.gameClock, visibilityState.gameClock !== false);
    setToggleVisualState(toggleUi.visibility.playClock, visibilityState.playClock !== false);
    setToggleVisualState(toggleUi.visibility.downDistance, visibilityState.downDistance !== false);
}

function updatePossessionToggleButtons() {
    setToggleVisualState(toggleUi.possession.home, currentPossession === "home");
    setToggleVisualState(toggleUi.possession.away, currentPossession === "away");
    setToggleVisualState(toggleUi.possession.none, currentPossession === "none");
}

function updateFlagToggleButtons() {
    setToggleVisualState(toggleUi.flag.emit, currentFlagState.isFlagEmitted === true);
    setToggleVisualState(toggleUi.flag.hide, currentFlagState.isFlagEmitted !== true);
}

// Add event listeners for file inputs
const homeFileInput = sel('#home-team-logo-file');
if (homeFileInput) {
    homeFileInput.addEventListener('change', function(event) {
        handleLogoFileSelection(event, 'home');
    });
}

const awayFileInput = sel('#away-team-logo-file');
if (awayFileInput) {
    awayFileInput.addEventListener('change', function(event) {
        handleLogoFileSelection(event, 'away');
    });
}

cm.reducers["sync:name"] = (nameState) => {
    elm.homeTeamName.value = nameState.home_name;
    elm.awayTeamName.value = nameState.away_name;
}

cm.reducers["sync:score"] = (scoreState) => {
    if(elm.homeTeamScore.value != scoreState.home_score){
        elm.homeTeamScore.value = scoreState.home_score;

    }
    if(elm.awayTeamScore.value != scoreState.away_score){
        elm.awayTeamScore.value = scoreState.away_score;
    }
}

cm.reducers["sync:color"] = (colorState) => {
    elm.homeTeamColor.value = colorState.home_color;
    elm.homeTeamColorHex.value = colorState.home_color;
    elm.awayTeamColor.value = colorState.away_color;
    elm.awayTeamColorHex.value = colorState.away_color;
}

cm.reducers["sync:icon"] = (iconState) => {
    elm.homeTeamLogo.value = iconState.home_icon;
    elm.awayTeamLogo.value = iconState.away_icon;
}

cm.reducers["sync:down"] = (downState) => {
    elm.down.value = downState.down;
    elm.distance.value = downState.distance;
}

cm.reducers["sync:quarter"] = (quarterState) => {
    elm.quarter.value = quarterState.quarter;
}

cm.reducers["sync:possession"] = (possessionState) => {
    currentPossession = possessionState.possession || "none";
    updatePossessionToggleButtons();
}

cm.reducers["sync:timeouts"] = (timeoutsState) => {
    elm.homeTimeouts.value = timeoutsState.home_timeouts;
    elm.awayTimeouts.value = timeoutsState.away_timeouts;
}

cm.reducers["sync:flag"] = (flagState) => {
    currentFlagState = {
        ...currentFlagState,
        ...flagState,
    };
    updateFlagToggleButtons();
}

// Visibility state - initialized here for use in reducer and action functions
let visibilityState = {
    playClock: true,
    gameClock: true,
    scores: true,
    downDistance: true
};

cm.reducers["sync:visibility"] = (visibilityStateFromServer) => {
    visibilityState = visibilityStateFromServer;
    updateVisibilityToggleButtons();
}

cm.reducers["event:team_score"] = (payload) => {
    if(payload.team === "home"){
        elm.homeTeamScore.value = payload.new_score;
    }
    if(payload.team === "away"){
        elm.awayTeamScore.value = payload.new_score;
    }
}

// Clock Managment
let gameClockInterval = undefined;
let playClockInterval = undefined;
let gameClockSeconds = 15 * 60 * 1000;
let playClockSeconds = 45 * 1000;
cm.reducers["sync:time"] = (timeState) => {
    gameClockSeconds = timeState.gameClockCurrentTime
    playClockSeconds = timeState.playClockCurrentTime
    updateClockDisplay();
    if(timeState.isGameClockRunning){
        startGameClock();
    } else {
        stopGameClock();
    }
    if(timeState.isPlayClockRunning){
        startPlayClock();
    } else {
        stopPlayClock();
        // this will show it if the shot clock is queued to be running
        // but it low key looks a bit jank
        // if(timeState.isPlayClockRunning){
        //     elm.shotClockDuration.classList.add("running-clock");
        // }
    }
}
function updateClockDisplay(){
    updateGameClockDisplay();
    updatePlayClockDisplay();
}
function formatClockValue(ms){
    const totalSeconds = Math.max(Math.floor(ms / 1000), 0);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
function parseClockValue(value){
    const text = String(value || "").trim();
    if(!text){
        return NaN;
    }
    const clockMatch = text.match(/^(\d{1,3}):(\d{1,2})$/);
    if(clockMatch){
        const minutes = parseInt(clockMatch[1], 10);
        const seconds = parseInt(clockMatch[2], 10);
        if(!isNaN(minutes) && !isNaN(seconds) && seconds >= 0 && seconds <= 59){
            return (minutes * 60 + seconds) * 1000;
        }
        return NaN;
    }
    const asSeconds = parseInt(text, 10);
    if(!isNaN(asSeconds) && asSeconds >= 0){
        return asSeconds * 1000;
    }
    return NaN;
}
function updateGameClockDisplay(){
    elm.gameTimerDuration.value = formatClockValue(gameClockSeconds);
}
function updatePlayClockDisplay(){
    elm.shotClockDuration.value = formatClockValue(playClockSeconds);
}


function startGameClock(){
    if(gameClockInterval === undefined){
        elm.gameTimerDuration.classList.add("running-clock");
        elm.gameTimerToggleButton.classList.add("running")
        elm.gameTimerToggleButton.classList.remove("paused")

        let lastTime = Date.now();
        gameClockInterval = setInterval(()=>{
            gameClockSeconds -= Date.now() - lastTime;
            gameClockSeconds = Math.max(gameClockSeconds, 0);
            lastTime = Date.now();
            updateGameClockDisplay();
        }, 10);
    }
}
function stopGameClock(){
    if(gameClockInterval !== undefined){
        elm.gameTimerDuration.classList.remove("running-clock");
        elm.gameTimerToggleButton.classList.remove("running")
        elm.gameTimerToggleButton.classList.add("paused")
        clearInterval(gameClockInterval);
        gameClockInterval = undefined;
    }
}

function startPlayClock(){
    if(playClockInterval === undefined){
        let lastTime = Date.now();
        playClockInterval = setInterval(()=>{
            elm.shotClockDuration.classList.add("running-clock");
            elm.shotClockToggleButton.classList.add("running")
            elm.shotClockToggleButton.classList.remove("paused")
            playClockSeconds -= Date.now() - lastTime;
            playClockSeconds = Math.max(playClockSeconds, 0);
            lastTime = Date.now();
            updatePlayClockDisplay();
        }, 10);
    }
}
function stopPlayClock(){
    if(playClockInterval !== undefined){
        elm.shotClockDuration.classList.remove("running-clock");
        elm.shotClockToggleButton.classList.remove("running")
        elm.shotClockToggleButton.classList.add("paused")
        clearInterval(playClockInterval);
        playClockInterval = undefined;
    }
}

// Score event Listeners
selall(".home .team-score .increment").forEach((elm) => {
    elm.addEventListener("click", (event) => {
        let amount = parseInt(event.srcElement.innerText.replace("+", ""));
        let animation_type = "none";
        if (elm.classList.contains("animation-field-goal")) {animation_type = "field goal";}
        if (elm.classList.contains("animation-touchdown")) {animation_type = "touchdown";}
        cm.actions["add:team_score"]("home", amount, {
            animation: elm.classList.contains("animation-field-goal") || elm.classList.contains("animation-touchdown"),
            animation_type: animation_type
        });
    });
});
selall(".home .team-score .decrement").forEach((elm) => {
    elm.addEventListener("click", (event) => {
        let amount = -parseInt(event.srcElement.innerText.replace("-", ""));
        cm.actions["add:team_score"]("home", amount, { animation: false, animation_type: "none" });
    });
});

selall(".away .team-score .increment").forEach((elm) => {
    elm.addEventListener("click", (event) => {
        let amount = parseInt(event.srcElement.innerText.replace("+", ""));
        let animation_type = "none";
        if (elm.classList.contains("animation-field-goal")) {animation_type = "field goal";}
        if (elm.classList.contains("animation-touchdown")) {animation_type = "touchdown";}
        cm.actions["add:team_score"]("away", amount, {
            animation: elm.classList.contains("animation-field-goal") || elm.classList.contains("animation-touchdown"),
            animation_type: animation_type
        });
    });
});
selall(".away .team-score .decrement").forEach((elm) => {
    elm.addEventListener("click", (event) => {
        let amount = -parseInt(event.srcElement.innerText.replace("-", ""));
        cm.actions["add:team_score"]("away", amount, { animation: false, animation_type: "none" });
    });
});
// Timer Event Listeners
elm.gameTimerToggleButton.addEventListener("click", (event) => {
    if (elm.gameTimerToggleButton.classList.contains("running")) {
        cm.actions["set:clock_state"]("game", false);
        return;
    }    
    if (elm.gameTimerToggleButton.classList.contains("paused")) {
        cm.actions["set:clock_state"]("game", true);
        return;
    }
});
elm.shotClockToggleButton.addEventListener("click", (event) => {
    if (elm.shotClockToggleButton.classList.contains("running")) {
        cm.actions["set:clock_state"]("play", false);
        return;
    }    
    if (elm.shotClockToggleButton.classList.contains("paused")) {
        cm.actions["set:clock_state"]("play", true);
        return;
    }
});
// Timer Input Listeners
function addClockTimeActionIssuer(clock,amount){
    cm.actions["add:clock_time"](clock, amount)
}
function addClockTimeToGameTimerActionIssuer(amount){
    addClockTimeActionIssuer("game",amount)
}
function addClockTimeToPlayClockActionIssuer(amount){
    addClockTimeActionIssuer("play",amount)
}

function setPlayClockToDefaultActionIssuer(){
    const parsed = parseClockValue(elm.shotClockDurationDefault.value);
    if(!isNaN(parsed)){
        cm.actions["set:clock_time"]("play", parsed);
    }
}
function setPlayClockToValueActionIssuer(time){
    cm.actions["set:clock_time"]("play", time);
}
function setGameClockToDefaultActionIssuer(){
    const parsed = parseClockValue(elm.gameTimerDurationDefault.value);
    if(!isNaN(parsed)){
        cm.actions["set:clock_time"]("game", parsed);
    }
}
// Down & Distance Event Listeners
function setDownActionIssuer(down){
    cm.actions["set:down"](down);
}
function setDistanceActionIssuer(distance){
    cm.actions["set:distance"](distance);
}
function addDownActionIssuer(amount){
    cm.actions["add:down"](amount);
}
function addDistanceActionIssuer(amount){
    cm.actions["add:distance"](amount);
}

// Quarter & Period Event Listeners
function setQuarterActionIssuer(quarter){
    cm.actions["set:quarter"](quarter);
}
function addQuarterActionIssuer(amount){
    cm.actions["add:quarter"](amount);
}

// Possession Event Listeners
function setPossessionActionIssuer(team){
    currentPossession = team;
    updatePossessionToggleButtons();
    cm.actions["set:possession"](team);
}

// Timeouts Event Listeners
function setTeamTimeoutsActionIssuer(team, timeouts){
    cm.actions["set:team_timeouts"](team, timeouts);
}
function addTeamTimeoutsActionIssuer(team, amount){
    cm.actions["add:team_timeouts"](team, amount);
}


// Input Box Event Listeners
function setTeamScoreActionIssuer(team, score){
    cm.actions["set:team_score"](team, score);
}

elm.homeTeamScore.addEventListener("change", (event) => {
    let value = elm.homeTeamScore.value
    let newScore = parseInt(value);
    if (!isNaN(newScore) && newScore >= 0) {
        setTeamScoreActionIssuer("home", newScore);
    }

});
elm.awayTeamScore.addEventListener("change", (event) => {
    let value = elm.awayTeamScore.value
    let newScore = parseInt(value);
    if (!isNaN(newScore) && newScore >= 0) {
        setTeamScoreActionIssuer("away", newScore);
    }

});

// Down input box listener
elm.down.addEventListener("change", (event) => {
    let value = elm.down.value;
    let newDown = parseInt(value);
    if (!isNaN(newDown) && newDown >= 1 && newDown <= 4) {
        setDownActionIssuer(newDown);
    }
});

// Distance input box listener
elm.distance.addEventListener("change", (event) => {
    let value = elm.distance.value;
    let newDistance = parseInt(value);
    if (!isNaN(newDistance)) {
        setDistanceActionIssuer(newDistance);
    }
});

// Quarter input box listener
elm.quarter.addEventListener("change", (event) => {
    let value = elm.quarter.value;
    let newQuarter = parseInt(value);
    if (!isNaN(newQuarter) && newQuarter >= 0 && newQuarter <= 5) {
        setQuarterActionIssuer(newQuarter);
    }
});

// Game Timer input box listener
elm.gameTimerDuration.addEventListener("change", (event) => {
    if (gameClockInterval !== undefined) {
        event.preventDefault();
        updateGameClockDisplay();
        return;
    }
    const parsed = parseClockValue(elm.gameTimerDuration.value);
    if (!isNaN(parsed)) {
        cm.actions["set:clock_time"]("game", parsed);
    } else {
        updateGameClockDisplay();
    }
});

// Game Timer keydown/input prevention when running
elm.gameTimerDuration.addEventListener("keydown", (event) => {
    if (gameClockInterval !== undefined) {
        event.preventDefault();
    }
});

elm.gameTimerDuration.addEventListener("input", (event) => {
    if (gameClockInterval !== undefined) {
        event.preventDefault();
        updateGameClockDisplay();
    }
});

// Shot Clock input box listener
elm.shotClockDuration.addEventListener("change", (event) => {
    if (playClockInterval !== undefined) {
        event.preventDefault();
        updatePlayClockDisplay();
        return;
    }
    const parsed = parseClockValue(elm.shotClockDuration.value);
    if (!isNaN(parsed)) {
        cm.actions["set:clock_time"]("play", parsed);
    } else {
        updatePlayClockDisplay();
    }
});

// Shot Clock keydown/input prevention when running
elm.shotClockDuration.addEventListener("keydown", (event) => {
    if (playClockInterval !== undefined) {
        event.preventDefault();
    }
});

elm.shotClockDuration.addEventListener("input", (event) => {
    if (playClockInterval !== undefined) {
        event.preventDefault();
        updatePlayClockDisplay(); 
    }
});

// Team Name input box listeners
elm.homeTeamName.addEventListener("change", (event) => {
    let value = elm.homeTeamName.value;
    if (value.trim() !== "") {
        cm.actions["set:team_name"]("home", value);
    }
});

elm.awayTeamName.addEventListener("change", (event) => {
    let value = elm.awayTeamName.value;
    if (value.trim() !== "") {
        cm.actions["set:team_name"]("away", value);
    }
});

// Team Color input box listeners
elm.homeTeamColor.addEventListener("change", (event) => {
    let value = elm.homeTeamColor.value;
    elm.homeTeamColorHex.value = value; 
    cm.actions["set:team_color"]("home", value);
});

elm.homeTeamColorHex.addEventListener("change", (event) => {
    let value = elm.homeTeamColorHex.value;
    if (value.match(/^#[0-9A-F]{6}$/i)) { // I totally wrote this regex myself :P
        elm.homeTeamColor.value = value; 
        cm.actions["set:team_color"]("home", value);
    }
});

elm.awayTeamColor.addEventListener("change", (event) => {
    let value = elm.awayTeamColor.value;
    elm.awayTeamColorHex.value = value;
    cm.actions["set:team_color"]("away", value);
});

elm.awayTeamColorHex.addEventListener("change", (event) => {
    let value = elm.awayTeamColorHex.value;
    if (value.match(/^#[0-9A-F]{6}$/i)) { 
        elm.awayTeamColor.value = value; 
        cm.actions["set:team_color"]("away", value);
    }
});

// Timeouts input box listeners
elm.homeTimeouts.addEventListener("change", (event) => {
    let value = elm.homeTimeouts.value;
    let newTimeouts = parseInt(value);
    if (!isNaN(newTimeouts) && newTimeouts >= 0 && newTimeouts <= 3) {
        setTeamTimeoutsActionIssuer("home", newTimeouts);
    }
});

elm.awayTimeouts.addEventListener("change", (event) => {
    let value = elm.awayTimeouts.value;
    let newTimeouts = parseInt(value);
    if (!isNaN(newTimeouts) && newTimeouts >= 0 && newTimeouts <= 3) {
        setTeamTimeoutsActionIssuer("away", newTimeouts);
    }
});

// Flags

function setFlagStateActionIssuer(flagState) {
    currentFlagState = {
        ...currentFlagState,
        ...flagState,
    };
    updateFlagToggleButtons();
    cm.actions["set:flag"](flagState);
}

// Visibility toggles
function toggleVisibilityActionIssuer(element) {
    visibilityState[element] = !visibilityState[element];
    updateVisibilityToggleButtons();
    const payload = {};
    payload[element] = visibilityState[element];
    cm.actions["set:visibility"](payload);
}

updateVisibilityToggleButtons();
updatePossessionToggleButtons();
updateFlagToggleButtons();

// Icons 
elm.homeTeamLogo.addEventListener("change", (event) => {
    cm.actions["set:team_icon"]("home", event.target.value);
});

elm.awayTeamLogo.addEventListener("change", (event) => {
    cm.actions["set:team_icon"]("away", event.target.value);
});

function openBrowseFilesToSetIcon(team) {
    const fileInput = sel(`#${team}-team-logo-file`);
    if (fileInput) {
        fileInput.click();
    } else {
        console.error(`File input not found for ${team} team logo`);
    }
}

function handleLogoFileSelection(event, team) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
        alert('Please select a valid image file.');
        return;
    }
    
    // Validate file size (optional - limit to 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > maxSize) {
        alert('Image file is too large. Please select an image smaller than 5MB.');
        return;
    }
    
    // Convert file to data URL
    const reader = new FileReader();
    reader.onload = function(e) {
        const dataUrl = e.target.result;
        
        // Update the input field to show the file name
        const logoInput = sel(`#${team}-team-logo`);
        logoInput.value = file.name;
        
        // Send the data URL to the server
        cm.actions["set:team_icon"](team, dataUrl);
        
        console.log(`${team} team logo updated with file: ${file.name}`);
    };
    
    reader.onerror = function() {
        alert('Error reading the image file. Please try again.');
    };
    
    // Read the file as data URL
    reader.readAsDataURL(file);
}
