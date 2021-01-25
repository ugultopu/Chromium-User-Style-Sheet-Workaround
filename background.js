chrome.webNavigation.onCommitted.addListener(
  ({tabId}) => {
    chrome.tabs.insertCSS(
      tabId,
      {
        file: 'default.css',
        cssOrigin: 'user',
        // Possible values of 'runAt' are 'document_start',
        // 'document_end' and 'document_idle', with 'document_idle'
        // being the default. However, both 'document_end' and
        // 'document_idle' causes a flash of the website content before
        // the user style takes effect. Hence, the only right way is to
        // give 'document_start' as the value of 'runAt'.
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
