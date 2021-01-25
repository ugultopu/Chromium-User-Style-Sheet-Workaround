chrome.webNavigation.onCommitted.addListener(
  ({tabId}) => {
    chrome.tabs.insertCSS(
      tabId,
      {
        file: 'default.css',
        cssOrigin: 'user'
      }
    );
  },
  {
    url: [
      {schemes: ['http', 'https']}
    ]
  }
);
