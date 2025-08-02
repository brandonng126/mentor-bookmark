// === spotify-content.js ===
// Content script for Spotify Web Player
(function () {
    'use strict';

    let currentTrackData = null;

    function getCurrentTrackInfo() {
        // Try to get current track info from Spotify Web Player
        const titleElement = document.querySelector('[data-testid="entityTitle"]') ||
            document.querySelector('.Root__now-playing-bar .track-info__name a') ||
            document.querySelector('.now-playing .track-info__name');

        const artistElement = document.querySelector('[data-testid="creator-link"]') ||
            document.querySelector('.Root__now-playing-bar .track-info__artists a') ||
            document.querySelector('.now-playing .track-info__artists');

        // Get progress bar for timestamp
        const progressBar = document.querySelector('[data-testid="progress-bar"]') ||
            document.querySelector('.playback-bar__progress-time');

        let currentTime = 0;
        let duration = 0;

        // Try to extract time from progress display
        const timeElements = document.querySelectorAll('.playback-bar__progress-time');
        if (timeElements.length >= 2) {
            currentTime = parseTimeString(timeElements[0].textContent);
            duration = parseTimeString(timeElements[1].textContent);
        }

        // Alternative method: try to find time in data attributes or other elements
        if (currentTime === 0) {
            const progressElement = document.querySelector('[aria-valuenow]');
            if (progressElement) {
                const progress = parseFloat(progressElement.getAttribute('aria-valuenow')) || 0;
                const max = parseFloat(progressElement.getAttribute('aria-valuemax')) || 100;
                currentTime = Math.floor((progress / max) * duration);
            }
        }

        if (!titleElement) return null;

        const title = titleElement.textContent.trim();
        const artist = artistElement ? artistElement.textContent.trim() : '';
        const fullTitle = artist ? `${artist} - ${title}` : title;

        return {
            type: 'spotify',
            title: fullTitle,
            url: window.location.href,
            currentTime: currentTime,
            duration: duration,
            isPlaying: !!document.querySelector('[data-testid="control-button-pause"]')
        };
    }

    function parseTimeString(timeStr) {
        if (!timeStr) return 0;
        const parts = timeStr.split(':').map(p => parseInt(p) || 0);
        if (parts.length === 2) {
            return parts[0] * 60 + parts[1];
        } else if (parts.length === 3) {
            return parts[0] * 3600 + parts[1] * 60 + parts[2];
        }
        return 0;
    }

    function updateTrackData() {
        const newData = getCurrentTrackInfo();
        if (newData && (
            !currentTrackData ||
            currentTrackData.currentTime !== newData.currentTime ||
            currentTrackData.url !== newData.url ||
            currentTrackData.title !== newData.title
        )) {
            currentTrackData = newData;
        }
    }

    // Update track data every second
    setInterval(updateTrackData, 1000);

    // Listen for messages from popup
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === 'getCurrentMedia') {
            updateTrackData();
            sendResponse(currentTrackData);
        }
    });

    // Initial update with delay to let Spotify load
    setTimeout(updateTrackData, 3000);
})();
