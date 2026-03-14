(() => {
	const STORAGE_KEY = "admin:stickyPreviewEnabled";
	const toggle = document.getElementById("sticky-preview-toggle");
	const previewFrame = document.getElementById("preview-frame");

	if (!toggle || !previewFrame) {
		return;
	}

	const applyStickyState = (enabled) => {
		previewFrame.classList.toggle("sticky-enabled", enabled);
		toggle.checked = enabled;
	};

	const saved = localStorage.getItem(STORAGE_KEY) === "true";
	applyStickyState(saved);

	toggle.addEventListener("change", () => {
		const enabled = toggle.checked;
		localStorage.setItem(STORAGE_KEY, String(enabled));
		applyStickyState(enabled);
	});
})();


// // Scoreboard Controls JavaScript
// class ScoreboardController {
//     constructor() {
//         this.gameState = {
//             homeScore: 0,
//             awayScore: 0,
//             quarter: 1,
//             gameTime: '15:00',
//             shotClock: 40,
//             down: 1,
//             distance: 10,
//             possession: null, // 'home', 'away', or null
//             homeTimeouts: 3,
//             awayTimeouts: 3,
//             homeTeam: {
//                 name: 'Home',
//                 logo: '',
//                 color: '#ff0000'
//             },
//             awayTeam: {
//                 name: 'Away', 
//                 logo: '',
//                 color: '#0000ff'
//             },
//             flag: {
//                 visible: false,
//                 blame: null // 'home-team', 'away-team', 'home-player-#', 'away-player-#'
//             }
//         };
        
//         this.timers = {
//             gameTimer: null,
//             shotClock: null
//         };
        
//         this.init();
//     }
    
//     init() {
//         this.bindEvents();
//         this.updateDisplay();
//     }
    
//     bindEvents() {
//         // Score controls
//         this.bindScoreControls();
        
//         // Timer controls
//         this.bindTimerControls();
        
//         // Down and distance
//         this.bindDownDistanceControls();
        
//         // Quarter controls
//         this.bindQuarterControls();
        
//         // Possession controls
//         this.bindPossessionControls();
        
//         // Team management
//         this.bindTeamControls();
        
//         // Flag controls
//         this.bindFlagControls();
        
//         // Preset controls
//         this.bindPresetControls();
//     }
    
//     bindScoreControls() {
//         // Home score
//         document.querySelectorAll('#home-team-score').forEach(input => {
//             input.addEventListener('change', (e) => {
//                 this.gameState.homeScore = parseInt(e.target.value) || 0;
//                 this.updateDisplay();
//             });
//         });
        
//         // Away score
//         document.querySelectorAll('#away-team-score').forEach(input => {
//             input.addEventListener('change', (e) => {
//                 this.gameState.awayScore = parseInt(e.target.value) || 0;
//                 this.updateDisplay();
//             });
//         });
        
//         // Score increment/decrement buttons
//         document.addEventListener('click', (e) => {
//             if (e.target.classList.contains('increment') || e.target.classList.contains('decrement')) {
//                 this.handleScoreButton(e.target);
//             }
//         });
//     }
    
//     handleScoreButton(button) {
//         const isIncrement = button.classList.contains('increment');
//         const value = parseInt(button.textContent.replace(/[^\d]/g, '')) || 1;
//         const change = isIncrement ? value : -value;
        
//         // Find which team's score to change
//         const homeControls = button.closest('.control-group.home');
//         const awayControls = button.closest('.control-group.away');
        
//         if (homeControls) {
//             this.gameState.homeScore = Math.max(0, this.gameState.homeScore + change);
//             document.getElementById('home-team-score').value = this.gameState.homeScore;
//         } else if (awayControls) {
//             this.gameState.awayScore = Math.max(0, this.gameState.awayScore + change);
//             document.getElementById('away-team-score').value = this.gameState.awayScore;
//         }
        
//         this.updateDisplay();
//     }
    
//     bindTimerControls() {
//         // Game timer start/stop
//         document.getElementById('game-timer-toggle')?.addEventListener('click', () => {
//             this.toggleGameTimer();
//         });
        
//         // Shot clock start/stop
//         document.getElementById('shot-clock-toggle')?.addEventListener('click', () => {
//             this.toggleShotClock();
//         });
//     }
    
//     bindDownDistanceControls() {
//         document.getElementById('down')?.addEventListener('change', (e) => {
//             this.gameState.down = parseInt(e.target.value) || 1;
//             this.updateDisplay();
//         });
        
//         document.getElementById('distance')?.addEventListener('change', (e) => {
//             this.gameState.distance = parseInt(e.target.value) || 10;
//             this.updateDisplay();
//         });
//     }
    
//     bindQuarterControls() {
//         document.getElementById('quarter')?.addEventListener('change', (e) => {
//             this.gameState.quarter = parseInt(e.target.value) || 1;
//             this.updateDisplay();
//         });
//     }
    
//     bindPossessionControls() {
//         document.getElementById('home-possession')?.addEventListener('click', () => {
//             this.gameState.possession = 'home';
//             this.updatePossessionDisplay();
//         });
        
//         document.getElementById('away-possession')?.addEventListener('click', () => {
//             this.gameState.possession = 'away';
//             this.updatePossessionDisplay();
//         });
        
//         document.getElementById('clear-possession')?.addEventListener('click', () => {
//             this.gameState.possession = null;
//             this.updatePossessionDisplay();
//         });
//     }
    
//     bindTeamControls() {
//         // Team names
//         document.getElementById('home-team-name')?.addEventListener('change', (e) => {
//             this.gameState.homeTeam.name = e.target.value;
//             this.updateDisplay();
//         });
        
//         document.getElementById('away-team-name')?.addEventListener('change', (e) => {
//             this.gameState.awayTeam.name = e.target.value;
//             this.updateDisplay();
//         });
        
//         // Team colors
//         document.getElementById('home-team-color')?.addEventListener('change', (e) => {
//             this.gameState.homeTeam.color = e.target.value;
//             document.getElementById('home-team-color-hex').value = e.target.value;
//             this.updateDisplay();
//         });
        
//         document.getElementById('away-team-color')?.addEventListener('change', (e) => {
//             this.gameState.awayTeam.color = e.target.value;
//             document.getElementById('away-team-color-hex').value = e.target.value;
//             this.updateDisplay();
//         });
        
//         // Timeouts
//         document.getElementById('home-timeouts')?.addEventListener('change', (e) => {
//             this.gameState.homeTimeouts = parseInt(e.target.value) || 0;
//             this.updateDisplay();
//         });
        
//         document.getElementById('away-timeouts')?.addEventListener('change', (e) => {
//             this.gameState.awayTimeouts = parseInt(e.target.value) || 0;
//             this.updateDisplay();
//         });
//     }
    
//     bindFlagControls() {
//         document.getElementById('emit-flag')?.addEventListener('click', () => {
//             this.gameState.flag.visible = true;
//             this.updateDisplay();
//         });
        
//         document.getElementById('hide-flag')?.addEventListener('click', () => {
//             this.gameState.flag.visible = false;
//             this.gameState.flag.blame = null;
//             this.updateDisplay();
//         });
        
//         document.getElementById('blame-home-team')?.addEventListener('click', () => {
//             this.gameState.flag.blame = 'home-team';
//             this.updateDisplay();
//         });
        
//         document.getElementById('blame-away-team')?.addEventListener('click', () => {
//             this.gameState.flag.blame = 'away-team';
//             this.updateDisplay();
//         });
        
//         document.getElementById('blame-home-player')?.addEventListener('click', () => {
//             const playerNumber = document.getElementById('home-player-number').value;
//             if (playerNumber) {
//                 this.gameState.flag.blame = `home-player-${playerNumber}`;
//                 this.updateDisplay();
//             }
//         });
        
//         document.getElementById('blame-away-player')?.addEventListener('click', () => {
//             const playerNumber = document.getElementById('away-player-number').value;
//             if (playerNumber) {
//                 this.gameState.flag.blame = `away-player-${playerNumber}`;
//                 this.updateDisplay();
//             }
//         });
//     }
    
//     bindPresetControls() {
//         document.getElementById('new-game')?.addEventListener('click', () => {
//             this.resetGame();
//         });
        
//         document.getElementById('reset-all')?.addEventListener('click', () => {
//             this.resetAll();
//         });
//     }
    
//     toggleGameTimer() {
//         const button = document.getElementById('game-timer-toggle');
//         if (button.classList.contains('paused')) {
//             // Start timer
//             this.startGameTimer();
//             button.classList.remove('paused');
//             button.classList.add('running');
//         } else {
//             // Stop timer
//             this.stopGameTimer();
//             button.classList.remove('running');
//             button.classList.add('paused');
//         }
//     }
    
//     toggleShotClock() {
//         const button = document.getElementById('shot-clock-toggle');
//         if (button.classList.contains('paused')) {
//             // Start timer
//             this.startShotClock();
//             button.classList.remove('paused');
//             button.classList.add('running');
//         } else {
//             // Stop timer
//             this.stopShotClock();
//             button.classList.remove('running');
//             button.classList.add('paused');
//         }
//     }
    
//     startGameTimer() {
//         this.timers.gameTimer = setInterval(() => {
//             // Decrement game time
//             const [minutes, seconds] = this.gameState.gameTime.split(':').map(Number);
//             let totalSeconds = minutes * 60 + seconds - 1;
            
//             if (totalSeconds <= 0) {
//                 this.stopGameTimer();
//                 totalSeconds = 0;
//             }
            
//             const newMinutes = Math.floor(totalSeconds / 60);
//             const newSeconds = totalSeconds % 60;
//             this.gameState.gameTime = `${newMinutes.toString().padStart(2, '0')}:${newSeconds.toString().padStart(2, '0')}`;
            
//             document.getElementById('quarter-duration').value = this.gameState.gameTime;
//             this.updateDisplay();
//         }, 1000);
//     }
    
//     stopGameTimer() {
//         if (this.timers.gameTimer) {
//             clearInterval(this.timers.gameTimer);
//             this.timers.gameTimer = null;
//         }
//     }
    
//     startShotClock() {
//         this.timers.shotClock = setInterval(() => {
//             this.gameState.shotClock--;
            
//             if (this.gameState.shotClock <= 0) {
//                 this.stopShotClock();
//                 this.gameState.shotClock = 0;
//             }
            
//             document.getElementById('shot-clock-duration').value = this.gameState.shotClock;
//             this.updateDisplay();
//         }, 1000);
//     }
    
//     stopShotClock() {
//         if (this.timers.shotClock) {
//             clearInterval(this.timers.shotClock);
//             this.timers.shotClock = null;
//         }
//     }
    
//     updatePossessionDisplay() {
//         document.getElementById('home-possession')?.classList.toggle('active', this.gameState.possession === 'home');
//         document.getElementById('away-possession')?.classList.toggle('active', this.gameState.possession === 'away');
//         this.updateDisplay();
//     }
    
//     resetGame() {
//         this.gameState.homeScore = 0;
//         this.gameState.awayScore = 0;
//         this.gameState.quarter = 1;
//         this.gameState.gameTime = '15:00';
//         this.gameState.shotClock = 40;
//         this.gameState.down = 1;
//         this.gameState.distance = 10;
//         this.gameState.possession = null;
//         this.gameState.homeTimeouts = 3;
//         this.gameState.awayTimeouts = 3;
//         this.gameState.flag.visible = false;
//         this.gameState.flag.blame = null;
        
//         this.stopGameTimer();
//         this.stopShotClock();
//         this.updateAllInputs();
//         this.updateDisplay();
//     }
    
//     resetAll() {
//         this.resetGame();
        
//         this.gameState.homeTeam = {
//             name: 'Home',
//             logo: '',
//             color: '#ff0000'
//         };
//         this.gameState.awayTeam = {
//             name: 'Away',
//             logo: '',
//             color: '#0000ff'
//         };
        
//         this.updateAllInputs();
//         this.updateDisplay();
//     }
    
//     updateAllInputs() {
//         document.getElementById('home-team-score').value = this.gameState.homeScore;
//         document.getElementById('away-team-score').value = this.gameState.awayScore;
//         document.getElementById('quarter').value = this.gameState.quarter;
//         document.getElementById('quarter-duration').value = this.gameState.gameTime;
//         document.getElementById('shot-clock-duration').value = this.gameState.shotClock;
//         document.getElementById('down').value = this.gameState.down;
//         document.getElementById('distance').value = this.gameState.distance;
//         document.getElementById('home-timeouts').value = this.gameState.homeTimeouts;
//         document.getElementById('away-timeouts').value = this.gameState.awayTimeouts;
//         document.getElementById('home-team-name').value = this.gameState.homeTeam.name;
//         document.getElementById('away-team-name').value = this.gameState.awayTeam.name;
//         document.getElementById('home-team-color').value = this.gameState.homeTeam.color;
//         document.getElementById('away-team-color').value = this.gameState.awayTeam.color;
//         document.getElementById('home-team-color-hex').value = this.gameState.homeTeam.color;
//         document.getElementById('away-team-color-hex').value = this.gameState.awayTeam.color;
        
//         this.updatePossessionDisplay();
//     }
    
//     updateDisplay() {
//         // Send data to scoreboard iframe
//         this.sendToScoreboard();
//     }
    
//     sendToScoreboard() {
//         const iframe = document.querySelector('iframe');
//         if (iframe && iframe.contentWindow) {
//             iframe.contentWindow.postMessage({
//                 type: 'UPDATE_SCOREBOARD',
//                 data: this.gameState
//             }, '*');
//         }
//     }
// }

// // Initialize controller when DOM is loaded
// document.addEventListener('DOMContentLoaded', () => {
//     window.scoreboardController = new ScoreboardController();
// });
