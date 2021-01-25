const localhostPattern = new RegExp('^https?://localhost[/:]', 'i');

chrome.webNavigation.onCommitted.addListener(
  ({tabId, url}) => {
    if(localhostPattern.test(url)) return;

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
