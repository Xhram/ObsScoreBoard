// // Connect to WebSocket on same origin
// const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
// const wsUrl = `${protocol}//${window.location.host}`;
// const socket = new WebSocket(wsUrl);

// const debugDiv = document.getElementById('debug');

// socket.onopen = function(event) {
//     debugDiv.innerHTML += '<p>WebSocket connected</p>';
// };

// socket.onmessage = function(event) {
//     debugDiv.innerHTML += `<p>Message received: ${event.data}</p>`;
// };

// socket.onclose = function(event) {
//     debugDiv.innerHTML += '<p>WebSocket disconnected</p>';
// };

// socket.onerror = function(error) {
//     debugDiv.innerHTML += `<p>WebSocket error: ${error}</p>`;
// };

//
//
//

//fact check #22 in json
// Last, First
let team_home_roster = {
    '-1': 'Player Home Team'
}
let team_away_roster = {
    '-1': 'Player Other Team'
}

async function load_rosters() {
    try {
        const response = await fetch('assets/roster.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        team_home_roster = data;
    } catch (error) {
        console.error('Error loading roster:', error);
    }
}
load_rosters();

const scoreboard_element = document.getElementById('scoreboard');
const meta_data_container_element = scoreboard_element.querySelector('.meta-data-container');
const carousel_elements = scoreboard_element.querySelectorAll('.carousel');
const flag_container_element = scoreboard_element.querySelector('#flag-container');
const flag_status_element = flag_container_element.querySelector('.status'); // set penalty status to 'flag' or 'review'
const flag_blame_element = flag_container_element.querySelector('.blame'); // set player name
const point_score_annoucement_element = scoreboard_element.querySelector('#point-score-announcement'); // used for displaying 'touchdown!' or 'goal!'

const home_team_name_element = scoreboard_element.querySelector('#home-team');
const away_team_name_element = scoreboard_element.querySelector('#away-team');

const game_quarter_element = scoreboard_element.querySelector('.quarter');
const game_clock_element = scoreboard_element.querySelector('.clock');
const game_play_clock_element = scoreboard_element.querySelector('.play-clock');
const game_down_element = scoreboard_element.querySelector('.down');
const game_to_go_element = scoreboard_element.querySelector('.distance');
const game_to_go_suffix_element = scoreboard_element.querySelector('.suffix');

// set color of the team that has the ball. used for touchdown/goal announcement background
function set_target_team (team = 'home') {
    // set --team-target to team color
    if (team === 'home') {
        scoreboard_element.style.setProperty('--team-target', 'var(--team-left-color)');
    } else if (team === 'away') {
        scoreboard_element.style.setProperty('--team-target', 'var(--team-right-color)');
    } else {

    }
}

/**
adds points to a team and updates the scoreboard display
if reason is 'touchdown' or 'field goal', shows the point score announcement
 */
let home_team_score = 0;
let away_team_score = 0;
function add_points_to_team(team = 'home', points = 1, reason = 'unknown') {
    if (team === 'home') {
        home_team_score += points;
        home_team_name_element.querySelector('.score').textContent = Math.max(home_team_score, 0);
    } else if (team === 'away') {
        away_team_score += points;
        away_team_name_element.querySelector('.score').textContent = Math.max(away_team_score, 0);
    }

    if (reason === 'touchdown') {
        show_point_score_announcement(team, 'touchdown!');
    } else if (reason === 'field goal') {
        show_point_score_announcement(team, 'goal!');   
    }
}

function set_team_score(team = 'home', score = 0) {
    if (team === 'home') {
        home_team_score = score;
        home_team_name_element.querySelector('.score').textContent = Math.max(home_team_score, 0);
    } else if (team === 'away') {
        away_team_score = score;
        away_team_name_element.querySelector('.score').textContent = Math.max(away_team_score, 0);
    }
}

let score_animation_timeout = null;
function show_point_score_announcement(team = 'home', text = 'touchdown!') {
    // delete all spans first
    if (score_animation_timeout) {
        clearTimeout(score_animation_timeout);
        score_animation_timeout = null;
    }
    set_target_team(team);
    // set background logo to team logo
    const logo_img = point_score_annoucement_element.querySelector('.logo img');
    if (team === 'home') {
        logo_img.src = team_home_icon;
    } else if (team === 'away') {
        logo_img.src = team_away_icon;
    }
    point_score_annoucement_element.classList.remove('emitted');
    point_score_annoucement_element.getAnimations().forEach(a => a.cancel && a.cancel())
    const spans = point_score_annoucement_element.querySelectorAll('span');
    spans.forEach((span) => span.remove());

    // create new span for the announcement (insert before logo so .logo remains last)
    const logo = point_score_annoucement_element.querySelector('.logo');
    for(let i = 0; i < text.length; i++) {
        const char = text.charAt(i);
        const new_span = document.createElement('span');
        new_span.textContent = char;
        point_score_annoucement_element.appendChild(new_span);

        if (logo) point_score_annoucement_element.insertBefore(new_span, logo);
        else point_score_annoucement_element.appendChild(new_span);
    }

    point_score_annoucement_element.classList.add('emitted');
    score_animation_timeout = setTimeout(() => {
        point_score_annoucement_element.classList.remove('emitted');
    }, 3100); 
}

let team_home_name = 'Home';
let team_away_name = 'Away';
function set_team_name(team = 'home', name = 'Team') {
    if (team === 'home') {
        home_team_name_element.querySelector('.name').textContent = name;
    } else if (team === 'away') {
        away_team_name_element.querySelector('.name').textContent = name;
    }
}

let team_home_color = '#0055ff';
let team_away_color = '#ff5500';
function set_team_color(team = 'home', color = '#ffffff') {
    if (team === 'home') {
        team_home_color = color;
        scoreboard_element.style.setProperty('--team-left-color', team_home_color);
    } else if (team === 'away') {
        team_away_color = color;
        scoreboard_element.style.setProperty('--team-right-color', team_away_color);
    }
}

let team_home_icon = 'assets/phs_ptv_64.png';
let team_away_icon = 'assets/phs_ptv_64.png';
function set_team_icon(team = 'home', icon = 'assets/phs_ptv_64.png') {
    if (team === 'home') {
        home_team_name_element.querySelector('.logo img').src = icon;
        team_home_icon = icon;
    } else if (team === 'away') {
        away_team_name_element.querySelector('.logo img').src = icon;
        team_away_icon = icon;
    }
}

// set which team has possession of ball
function set_team_possession(team = 'home') {
    if (team === 'home') {
        home_team_name_element.querySelector('.possession-indicator').classList.add('in-possession');
        away_team_name_element.querySelector('.possession-indicator').classList.remove('in-possession');
    } else if (team === 'away') {
        away_team_name_element.querySelector('.possession-indicator').classList.add('in-possession');
        home_team_name_element.querySelector('.possession-indicator').classList.remove('in-possession');
    } else {
        home_team_name_element.querySelector('.possession-indicator').classList.remove('in-possession');
        away_team_name_element.querySelector('.possession-indicator').classList.remove('in-possession');
    }
}

function get_athlete_name_from_roster(team = 'home', player_key = '') {
    if(team === 'home') {
        return team_home_roster[player_key] || ['Doe', 'John'];
    } else if(team === 'away') {
        return team_away_roster[player_key] || ['Doe', 'John'];
    }
    return ['Doe', 'John'];
}

function clear_flag(animation = true) {
    flag_container_element.classList.remove('emitted');
    if(animation) {
        setTimeout(() => {
            flag_container_element.className = 'flag-container';
        }, 500);
    } else {
        flag_container_element.className = 'flag-container';
    }
}

// status is either 'flag' or 'review'
// team is either 'home' or 'away' or 'none'
// player_key is the number of the athlete which points to key in the roster
function emit_flag(status = 'flag', team = "none", player_key = '') {
    clear_flag(false);
    flag_container_element.classList.add('emitted');
    flag_status_element.textContent = status;
    
    if(team !== "none") {
        let athlete = get_athlete_name_from_roster(team, player_key);
        let athlete_full_name = `${athlete[1]} ${athlete[0]}`;
        if(athlete_full_name !== "John Doe") {
            // sets blame to athlete name
            flag_container_element.classList.add(`blame-${team === 'home' ? 'left' : 'right'}-with-name`);
            flag_blame_element.innerHTML = `
                <div class="player-badge">
                    <div class="number"><span class="hashtag">#</span>${player_key}</div>
                    <div class="name">${athlete_full_name}</div>
                </div>
            `;
        } else {
            // sets blame just to team side
            flag_container_element.classList.add(`blame-${team === 'home' ? 'left' : 'right'}`);
            flag_blame_element.innerHTML = '';
        }
    }
}

// amount is either 1 or -1
let team_home_timeout = 3;
let team_away_timeout = 3;
function add_timeout(team = 'home', amount = -1) {
    if (team === 'home') {
        team_home_timeout += amount;
        team_home_timeout = Math.min(Math.max(team_home_timeout, 0), 3);
    } else if (team === 'away') {
        team_away_timeout += amount;
        team_away_timeout = Math.min(Math.max(team_away_timeout, 0), 3);
    }
    set_timeouts(team, team === 'home' ? team_home_timeout : team_away_timeout);
}

function set_timeouts(team = 'home', timeouts = 3) {
    if (team === 'home') {
        team_home_timeout = timeouts;
        const timeouts_elements = home_team_name_element.querySelectorAll('.timeout');
        timeouts_elements.forEach((el, index) => {
            if (index < team_home_timeout) {
                el.classList.remove('used');
            } else {
                el.classList.add('used');
            }
        });
    } else if (team === 'away') {
        team_away_timeout = timeouts;
        const timeouts_elements = away_team_name_element.querySelectorAll('.timeout');
        timeouts_elements.forEach((el, index) => {
            if (index < team_away_timeout) {
                el.classList.remove('used');
            } else {
                el.classList.add('used');
            }
        });
    }
}

const quarter_index = {
    1: '1st',
    2: '2nd',
    3: '3rd',
    4: '4th',
    5: 'OT',
    0: 'Final'
}
function set_game_quarter(quarter = 1) {
    game_quarter_element.textContent = quarter_index[quarter] || 'Unknown';
}

let game_clock_seconds =  15 * 60; // default to 15 minutes
let game_clock_interval = null;
function set_game_clock(minutes = 15, seconds = 0) {
    game_clock_seconds = (minutes * 60) + seconds;
}

function start_game_clock() {
    update_game_clock_display();
    if (game_clock_interval) return; // already running
    game_clock_interval = setInterval(() => {
        if (game_clock_seconds > 0) {
            game_clock_seconds--;
            update_game_clock_display();
        } else {
            clearInterval(game_clock_interval);
            game_clock_interval = null;
        }
    }, 1000);
}

function stop_game_clock() {
    update_game_clock_display();
    if (game_clock_interval) {
        clearInterval(game_clock_interval);
        game_clock_interval = null;
    }
}

function reset_game_clock() {
    stop_game_clock();
    game_clock_seconds = 15 * 60; // reset to 15 minutes
    update_game_clock_display();
}

// can be negative to subtract time
function add_seconds_to_game_clock(seconds = 0) {
    game_clock_seconds += seconds;
    if (game_clock_seconds < 0) game_clock_seconds = 0;
    update_game_clock_display();
}

function update_game_clock_display() {
    let minutes = Math.floor(game_clock_seconds / 60);
    let seconds = game_clock_seconds % 60;
    game_clock_element.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

let play_clock_seconds = 40; // default to 40 seconds
let play_clock_interval = null;

function start_play_clock() {
    update_play_clock_display();
    if (play_clock_interval) return; // already running
    play_clock_interval = setInterval(() => {
        if (play_clock_seconds > 0) {
            play_clock_seconds--;
            update_play_clock_display();
        } else {
            clearInterval(play_clock_interval);
            play_clock_interval = null;
        }
    }, 1000);
}

function stop_play_clock() {
    update_play_clock_display();
    if (play_clock_interval) {
        clearInterval(play_clock_interval);
        play_clock_interval = null;
    }
}

function reset_play_clock() {
    stop_play_clock();
    play_clock_seconds = 40;
    update_play_clock_display();
}

function add_seconds_to_play_clock(seconds = 0) {
    play_clock_seconds += seconds;
    if (play_clock_seconds < 0) play_clock_seconds = 0;
    update_play_clock_display();
}

function update_play_clock_display() {
    let seconds = play_clock_seconds % 60;
    game_play_clock_element.textContent = `:${String(seconds).padStart(2, '0')}`;
}

const down_index = {
    1: '1st',
    2: '2nd',
    3: '3rd',
    4: '4th',
}
let current_down = 1;
function set_game_down(down = 1) {
    current_down = down;
    const span = game_down_element.querySelector('span');
    if (span) return span.textContent = down_index[down] || 'Unknown';
    span.textContent = down_index[down] || 'Unknown';
}




let current_to_go = 10;
let current_to_go_suffix = 'YDS';
// if set to "inches" or "GOAL", it will display as INCHES or GOAL
function set_game_to_go(distance = 10, suffix = 'YDS') {
    current_to_go = distance;
    current_to_go_suffix = suffix;
    const span = game_to_go_element.querySelector('span');
    if (span) {
        game_to_go_suffix_element.textContent = '';
        if(suffix.toLowerCase() === 'inches') {
            return span.textContent = 'INCHES';
        } else if(suffix.toLowerCase() === 'goal') {
            return span.textContent = 'GOAL';
        }
        span.textContent = distance;
    }

    game_to_go_suffix_element.textContent = suffix;
}

function start_carousel(duration_per_item = 3, start_up_delay = 1) {
    const elements_in_carousel = carousel_elements[0].children.length;
    scoreboard_element.style.setProperty('--time-carousel-duration', `${elements_in_carousel * duration_per_item}s`);
    scoreboard_element.style.setProperty('--time-carousel-popup-delay', `${start_up_delay}s`);
    meta_data_container_element.classList.add('visible');
}

function stop_carousel() {
    meta_data_container_element.classList.remove('visible');
}

function set_carasuel_data_to_home_team_roster() {
    for(let carousel of carousel_elements) {
        carousel.innerHTML = '';
        for (const key in team_home_roster) {
            let athlete = get_athlete_name_from_roster('home', key);
            let athlete_full_name = `${athlete[1]} ${athlete[0]}`;
            const player_badge = document.createElement('div');
            player_badge.className = 'player-badge';
            player_badge.innerHTML = `
                <div class="number"><span class="hashtag">#</span>${key}</div>
                <div class="name">${athlete_full_name}</div>
            `;
            carousel.appendChild(player_badge);
        }
    }
}

function append_to_carasuel_data(text, duration_per_item = 3, start_up_delay = 1) {
    for(let carousel of carousel_elements) {
        const data_div = document.createElement('div');
        data_div.className = 'data';
        data_div.textContent = text;
        carousel.appendChild(data_div);
    }
    const elements_in_carousel = carousel_elements[0].children.length;
    scoreboard_element.style.setProperty('--time-carousel-duration', `${elements_in_carousel * duration_per_item}s`);
    scoreboard_element.style.setProperty('--time-carousel-popup-delay', `${start_up_delay}s`);
}

function clear_carasuel_data() {
    for(let carousel of carousel_elements) {
        carousel.innerHTML = '';
    }
}

function pop_to_carasuel_data(duration_per_item = 3, start_up_delay = 1) {
    for(let carousel of carousel_elements) {
        if(carousel.children.length > 0) {
            carousel.removeChild(carousel.children[0]);
        }
    }
    const elements_in_carousel = carousel_elements[0].children.length;
    scoreboard_element.style.setProperty('--time-carousel-duration', `${elements_in_carousel * duration_per_item}s`);
    scoreboard_element.style.setProperty('--time-carousel-popup-delay', `${start_up_delay}s`);
}