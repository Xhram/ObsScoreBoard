// Connect to WebSocket on same origin
const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const wsUrl = `${protocol}//${window.location.host}`;
const socket = new WebSocket(wsUrl);

const debugDiv = document.getElementById('debug');

socket.onopen = function(event) {
    debugDiv.innerHTML += '<p>WebSocket connected</p>';
};

socket.onmessage = function(event) {
    debugDiv.innerHTML += `<p>Message received: ${event.data}</p>`;
};

socket.onclose = function(event) {
    debugDiv.innerHTML += '<p>WebSocket disconnected</p>';
};

socket.onerror = function(error) {
    debugDiv.innerHTML += `<p>WebSocket error: ${error}</p>`;
};