// === popup.js ===
// Popup script for the extension interface
document.addEventListener('DOMContentLoaded', function () {
    let currentMedia = null;
    let isCapturing = false;

    const statusEl = document.getElementById('status');
    const currentMediaEl = document.getElementById('currentMedia');
    const captureFormEl = document.getElementById('captureForm');
    const noteInputEl = document.getElementById('noteInput');
    const bookmarksListEl = document.getElementById('bookmarksList');

    // Initialize popup
    checkCurrentMedia();
    loadBookmarks();

    // Set up event listeners
    document.getElementById('saveBtn').addEventListener('click', saveBookmark);
    document.getElementById('cancelBtn').addEventListener('click', cancelCapture);

    async function checkCurrentMedia() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

            if (!tab || (!tab.url.includes('youtube.com') && !tab.url.includes('spotify.com'))) {
                showStatus('disconnected', 'Open YouTube or Spotify to start bookmarking');
                return;
            }

            const response = await chrome.tabs.sendMessage(tab.id, { action: 'getCurrentMedia' });

            if (response && response.title) {
                currentMedia = response;
                showCurrentMedia(response);
                showStatus('connected', `Connected to ${response.type}`);
            } else {
                showStatus('disconnected', 'No media detected. Make sure something is playing.');
            }
        } catch (error) {
            console.error('Error checking current media:', error);
            showStatus('disconnected', 'Unable to connect to media. Try refreshing the page.');
        }
    }

    function showStatus(type, message) {
        statusEl.className = `status ${type}`;
        statusEl.textContent = message;
    }

    function showCurrentMedia(media) {
        const icon = media.type === 'youtube' ? '📺' : '🎵';
        const timeStr = formatTime(media.currentTime);
        const durationStr = formatTime(media.duration);

        currentMediaEl.innerHTML = `
            <div class="current-media">
                <div class="media-title">
                    <span>${icon}</span>
                    <span>${media.title}</span>
                </div>
                <div class="media-time">${timeStr} / ${durationStr}</div>
                <button class="bookmark-btn" onclick="startCapture()">
                    📌 Bookmark This Moment
                </button>
            </div>
        `;
        currentMediaEl.style.display = 'block';
    }

    window.startCapture = function () {
        if (!currentMedia) return;

        isCapturing = true;
        captureFormEl.style.display = 'block';
        noteInputEl.focus();

        // Update bookmark button
        const bookmarkBtn = document.querySelector('.bookmark-btn');
        bookmarkBtn.textContent = '⏱️ Adding bookmark for ' + formatTime(currentMedia.currentTime);
        bookmarkBtn.disabled = true;
    };

    function cancelCapture() {
        isCapturing = false;
        captureFormEl.style.display = 'none';
        noteInputEl.value = '';

        const bookmarkBtn = document.querySelector('.bookmark-btn');
        if (bookmarkBtn) {
            bookmarkBtn.textContent = '📌 Bookmark This Moment';
            bookmarkBtn.disabled = false;
        }
    }

    async function saveBookmark() {
        if (!currentMedia) return;

        const note = noteInputEl.value.trim();

        const bookmark = {
            type: currentMedia.type,
            title: currentMedia.title,
            url: currentMedia.url,
            timestamp: formatTime(currentMedia.currentTime),
            timestampSeconds: currentMedia.currentTime,
            note: note,
            platform: currentMedia.type
        };

        try {
            const response = await chrome.runtime.sendMessage({
                action: 'saveBookmark',
                bookmark: bookmark
            });

            if (response.success) {
                cancelCapture();
                loadBookmarks(); // Refresh bookmarks list
                showStatus('connected', '✅ Bookmark saved!');

                // Reset status after 2 seconds
                setTimeout(() => {
                    showStatus('connected', `Connected to ${currentMedia.type}`);
                }, 2000);
            } else {
                console.error('Failed to save bookmark:', response.error);
                showStatus('disconnected', 'Failed to save bookmark');
            }
        } catch (error) {
            console.error('Error saving bookmark:', error);
            showStatus('disconnected', 'Error saving bookmark');
        }
    }

    async function loadBookmarks() {
        try {
            const response = await chrome.runtime.sendMessage({ action: 'getBookmarks' });

            if (response.success) {
                displayBookmarks(response.bookmarks);
            } else {
                bookmarksListEl.innerHTML = '<div class="no-bookmarks">Error loading bookmarks</div>';
            }
        } catch (error) {
            console.error('Error loading bookmarks:', error);
            bookmarksListEl.innerHTML = '<div class="no-bookmarks">Error loading bookmarks</div>';
        }
    }

    function displayBookmarks(bookmarks) {
        if (!bookmarks || bookmarks.length === 0) {
            bookmarksListEl.innerHTML = '<div class="no-bookmarks">No bookmarks yet. Start watching something!</div>';
            return;
        }

        bookmarksListEl.innerHTML = bookmarks.slice(0, 5).map(bookmark => {
            const icon = bookmark.type === 'youtube' ? '📺' : '🎵';
            const date = new Date(bookmark.createdAt).toLocaleDateString();
            const playUrl = bookmark.type === 'youtube'
                ? `${bookmark.url}&t=${bookmark.timestampSeconds}s`
                : bookmark.url;

            return `
                <div class="bookmark-item">
                    <div class="bookmark-title">
                        <span class="${bookmark.type}-icon">${icon}</span>
                        <span>${bookmark.title}</span>
                    </div>
                    <div class="bookmark-time">${bookmark.timestamp} • ${date}</div>
                    ${bookmark.note ? `<div class="bookmark-note">${bookmark.note}</div>` : ''}
                    <div class="bookmark-actions">
                        <a href="${playUrl}" target="_blank" class="btn-link">▶ Play</a>
                        <button class="btn-delete" onclick="deleteBookmark('${bookmark.id}')">🗑️ Delete</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    window.deleteBookmark = async function (bookmarkId) {
        try {
            const response = await chrome.runtime.sendMessage({
                action: 'deleteBookmark',
                id: bookmarkId
            });

            if (response.success) {
                loadBookmarks(); // Refresh list
            }
        } catch (error) {
            console.error('Error deleting bookmark:', error);
        }
    };

    function formatTime(seconds) {
        if (!seconds || seconds < 0) return '0:00';

        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }

    // Refresh current media every 3 seconds
    setInterval(checkCurrentMedia, 3000);
});