// Zoom.js: Apply zoom to scoreboard based on ?zoom=xxx URL param (percentage), mimicking browser zoom
(() => {
	function getZoomFromUrl() {
		const params = new URLSearchParams(window.location.search);
		const zoomStr = params.get('zoom');
		if (!zoomStr) return null;
		const zoom = parseFloat(zoomStr);
		if (isNaN(zoom) || zoom <= 0) return null;
		return zoom;
	}


	function setZoomCSSVariable(zoomPercent) {
		const root = document.documentElement;
		if (!root) return;
		root.style.setProperty('--zoom', zoomPercent / 100);
	}

	const zoom = getZoomFromUrl();
	if (zoom) {
		setZoomCSSVariable(zoom);
	}
})();
