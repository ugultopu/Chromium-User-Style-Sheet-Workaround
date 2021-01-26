# Summary
For some reason (either because I'm not using the correct API or of a shortcoming in the design of Chromium extension API), [programmatically injected]["programmatic injection"] style sheets do not take effect as early as [declaratively injected]["declarative injection"] style sheets. That is, when I programmatically inject a style sheet, there is a split second flash of website's original styles before my injected styles take effect. This doesn't happen when I declaratively inject a style sheet.

On the other hand, as far as I can tell, currently the only way of injecting a style sheet with CSS user origin is programmatically injecting it. That is, there isn't a way of injecting a user origin style sheet when injected declaratively. Hence, to prevent the split second flash of the website's styles, I need to inject it declaratively and hence, the injected style sheets will have CSS author origin, instead of CSS user origin.

This makes this a "[hack]", instead of a proper "workaround", since the injected style sheets will have CSS author origin, instead of CSS user origin. The reason is, when the injected style sheet has CSS author origin, there is a chance of the injected styles not winning over the website's styles. If the website's styles are using the `!important` and have a higher specificity than the injected styles, they will win over the injected styles. In this case, the only way is to create a custom style sheet for that website with selectors that have higher specificity.

Had the injected styles had CSS user origin, they would _always_ win over the website's styles whenever the injected styles have `!important` after them. With this solution, they don't. This situation makes this solution a "hack", instead of a proper "workaround".

# Details
This is a "hack" for using user style sheets on Chromium version 32 and above. Beginning at version 32, Chromium stopped honoring the user style sheet at `$PROFILE_PATH/User StyleSheets/Custom.css`, where `$PROFILE_PATH` is the value of the "Profile Path" key that is shown when you navigate to "about:version" on your browser. The Chromium Project decided that browser extensions are ["a better way"] for providing user style sheets. Hence, this is a Chromium extension for using user style sheets on Chromium version 32 and above.

The reason that it is a "[hack]", instead of a "workaround" is because what we are providing with this extension is not really a "user style sheet". We are providing an "author style sheet". That is, a "user style sheet" is a style sheet that has the [user origin], whereas the style sheets provided with this extension have author origin. The difference between user origin and author origin style sheets are as follows:

- A rule without the `!important` declaration in a user origin style sheet always loses against a rule in an author style sheet, even if the rule in the user style sheet has higher specificity than the rule in the author style sheet. This is by design.
- A rule with the `!important` declaration in a user origin style sheet always wins against a rule in an author style sheet, even if the rule in the author style sheet has the `!important` declaration _and_ has a higher specificity. Again, this is by design.

Since an `!important` rule in a user origin style sheet always wins over a rule in an author style sheet (even if the rule in the author style sheet has `!important` and a higher specificity), using user origin style sheet provides a guarantee of being able to override author styles.

However, style sheets injected using `content_scripts` field on `manifest.json` of Chromium extensions have "author" origin. They don't have the "user" origin. Injecting a script or style sheet using the `content_scripts` field on `manifest.json` is called ["declarative injection"]. Injecting a script or a style sheet using `chrome.tabs.executeScript` or [`chrome.tabs.insertCSS`] is called ["programmatic injection"]. The only way of making an injected style sheet have "user" origin is by using the `chrome.tabs.insertCSS` function, which is "programmatic injection".

`chrome.tabs.insertCSS` accepts an argument named "details" which is of type [`chrome.extensionTypes.InjectDetails`]. In turn, `chrome.extensionTypes.InjectDetails` is an object which has a key named [`cssOrigin`]. `cssOrigin` is an enum with two possible values: "author" and "user", with "author" being the default value. Hence, the only way of injecting a style sheet with user origin is using [`chrome.tabs.insertCSS`] and passing to `chrome.tabs.insertCSS` a [`chrome.extensionTypes.InjectDetails`] object whose `cssOrigin` property set to `user`.

However, the problem with this is that it is not as quick as declarative injection. For some reason, there is a split second flash of the website's styles when I inject the style sheet programmatically, as opposed to injecting them declaratively. The reason is maybe due to the event that I'm using to inject them, or maybe it is not possible to inject a style sheet programmatically as fast as injecting it declaratively. These are what I tried:

- ## Use `code` instead of `file` when injecting programmatically:
  I hoped that this would be faster since there wouldn't be the overhead of reading a file, but there wasn't any difference. That is, the split second flash of the website's styles was still there.

  ```javascript
  chrome.webNavigation.onCommitted.addListener(
    ({tabId}) => {
      chrome.tabs.insertCSS(
        tabId,
        {
          // Instead of:
          // file: 'default.css'
          code: '* {background-image: none !important;}',
          cssOrigin: 'user',
          // We are already using `runAt: 'document_start'`, which is
          // the earliest injection possible with
          // `chrome.tabs.insertCSS`.
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
  ```

- ## Try to specify "cssOrigin" while injecting declaratively:
  Doesn't work. `css_origin` has no effect when injecting declaratively. Also, had it worked, it would have been `css_origin` and not `cssOrigin`, because the properties that work (which are `run_at` and `all_frames`) are spelled in snake case, instead of camel case:
  ```json
  {
    "manifest_version": 2,
    "name": "User Style Sheet Workaround",
    "version": "1",

    "content_scripts": [
      {
        "matches": ["<all_urls>"],
        "css": ["default.css"],
        "css_origin": "user"
      }
    ]
  }
  ```

  Doesn't work either. Chromium throws an exception when trying to read this manifest, saying that it expects the values of the `css` array to be strings, instead of objects:
  ```json
  {
    "manifest_version": 2,
    "name": "User Style Sheet Workaround",
    "version": "1",

    "content_scripts": [
      {
        "matches": ["<all_urls>"],
        "css": [
          {
            "file": "default.css",
            "css_origin": "user"
          }
        ]
      }
    ]
  }
  ```

To recap, this is the solution that I currently settled with, which injects author origin style sheets:

manifest.json:
```json
{
  "manifest_version": 2,
  "name": "User Style Sheet Workaround",
  "version": "1",

  "content_scripts": [
    {
      "matches": ["*://*/*"],
      "exclude_matches": ["*://localhost/*"],
      "css": ["default.css"]
    }
  ]
}
```

default.css:
```css
* {
  background-image: none !important;
}
```

The following is the solution that I came up with which injects user origin style sheets, but there is a split second flash of the website's styles before the injected styles take effect. Hence, I won't be using this until I find a way to prevent the split second flash of the website's styles before the injected styles take effect:

manifest.json:
```json
{
  "manifest_version": 2,
  "name": "User Style Sheet Workaround",
  "version": "1",

  "permissions": [
    "*://*/*",
    "webNavigation"
  ],

  "background" : {
    "scripts": ["background.js"]
  }
}
```

background.js:
```javascript
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
```

default.css:
```css
* {
  background-image: none !important;
}
```

# Sources
<https://superuser.com/questions/594358/modify-chrome-user-agent-stylesheet>
<https://stackoverflow.com/questions/21207474/custom-css-has-stopped-working-in-google-chrome-32>
<https://stackoverflow.com/questions/65872487/how-to-inject-css-with-user-origin-in-a-browser-extension>

[hack]: https://en.wikipedia.org/wiki/Kludge#Computer_science
["a better way"]: https://src.chromium.org/viewvc/chrome?revision=234007&view=revision
[user origin]: https://www.w3.org/TR/CSS2/cascade.html#cascade
["declarative injection"]: https://developer.chrome.com/docs/extensions/mv2/content_scripts/#declaratively
["programmatic injection"]: https://developer.chrome.com/docs/extensions/mv2/content_scripts/#programmatic
[`chrome.tabs.insertCSS`]: https://developer.chrome.com/docs/extensions/reference/tabs/#method-insertCSS
[`chrome.extensionTypes.InjectDetails`]: https://developer.chrome.com/docs/extensions/reference/extensionTypes/#type-InjectDetails
[`cssOrigin`]: https://developer.chrome.com/docs/extensions/reference/extensionTypes/#type-CSSOrigin
