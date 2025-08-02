// === youtube-content.js ===
// Content script for YouTube pages
(function () {
    'use strict';

    let currentVideoData = null;

    function getCurrentVideoInfo() {
        const video = document.querySelector('video');
        if (!video) return null;

        const titleElement = document.querySelector('h1.ytd-watch-metadata yt-formatted-string') ||
            document.querySelector('h1.title') ||
            document.querySelector('.watch-title');

        const title = titleElement ? titleElement.textContent.trim() : 'YouTube Video';

        return {
            type: 'youtube',
            title: title,
            url: window.location.href.split('&t=')[0], // Remove existing timestamp
            currentTime: Math.floor(video.currentTime),
            duration: Math.floor(video.duration || 0),
            isPlaying: !video.paused
        };
    }

    function updateVideoData() {
        const newData = getCurrentVideoInfo();
        if (newData && (
            !currentVideoData ||
            currentVideoData.currentTime !== newData.currentTime ||
            currentVideoData.url !== newData.url
        )) {
            currentVideoData = newData;
        }
    }

    // Update video data every second
    setInterval(updateVideoData, 1000);

    // Listen for messages from popup
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === 'getCurrentMedia') {
            updateVideoData();
            sendResponse(currentVideoData);
        }
    });

    // Initial update
    setTimeout(updateVideoData, 2000);
})();
