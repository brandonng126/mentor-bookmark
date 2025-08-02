// === background.js ===
// Service worker for handling extension lifecycle and data storage
chrome.runtime.onInstalled.addListener(() => {
    console.log('Media Timestamp Bookmarker installed');
});

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'saveBookmark') {
        saveBookmark(message.bookmark)
            .then(result => sendResponse({ success: true, result }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true; // Keep message channel open for async response
    }

    if (message.action === 'getBookmarks') {
        getBookmarks()
            .then(bookmarks => sendResponse({ success: true, bookmarks }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true;
    }

    if (message.action === 'deleteBookmark') {
        deleteBookmark(message.id)
            .then(result => sendResponse({ success: true }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true;
    }
});

async function saveBookmark(bookmark) {
    const bookmarkId = `bookmark_${Date.now()}`;
    const data = {};
    data[bookmarkId] = {
        ...bookmark,
        id: bookmarkId,
        createdAt: new Date().toISOString()
    };

    await chrome.storage.local.set(data);
    return bookmarkId;
}

async function getBookmarks() {
    const result = await chrome.storage.local.get(null);
    const bookmarks = Object.values(result)
        .filter(item => item.id && item.id.startsWith('bookmark_'))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return bookmarks;
}

async function deleteBookmark(bookmarkId) {
    await chrome.storage.local.remove(bookmarkId);
}