const localhostPattern = new RegExp('^https?://localhost[/:]', 'i');

chrome.webNavigation.onCommitted.addListener(
  ({tabId, url, frameId}) => {
    // Don't inject anything if the navigation is on a sub-frame or on
    // localhost
    if(frameId || localhostPattern.test(url)) return;

    chrome.tabs.insertCSS(
      tabId,
      {
        file: 'default.css',
        cssOrigin: 'user',
        runAt: 'document_start'
      }
    );
  },
  {
    url: [
      {schemes: ['http', 'https']}
    ]
  }
);
