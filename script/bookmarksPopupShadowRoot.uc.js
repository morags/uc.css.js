// ==UserScript==
// @name           Bookmarks Popup Mods
// @version        1.2
// @author         aminomancer
// @homepage       https://github.com/aminomancer/uc.css.js
// @description    Implement smooth scrolling for all bookmarks popups that are tall enough to scroll. Add special click functions to their scroll buttons — hovering a scroll button will scroll at a constant rate, as normal. (though faster than vanilla) But clicking a scroll button will immediately jump to the top/bottom of the list. This no longer styles the scroll buttons, since I now style all arrowscrollbox scrollbuttons equally with resources/layout/arrowscrollbox.css. To do that requires chrome.manifest, line 6. This replaces the built-in arrowscrollbox.css with my version that makes the scrollbuttons look a lot prettier. If you want to customize them, just edit arrowscrollbox.css. This script still adds the custom classes though, in case you want to use them to style the elements in userChrome.css.
// @include        main
// ==/UserScript==

const bookmarksPopupShadowRoot = {
    handleEvent(e) {
        if (!e.target.getAttribute("uc-init"))
            setTimeout(() => {
                this.checkPopups(e.target);
            }, 0);
        let scrollbox = e.target.scrollBox.scrollbox;
        let height = window.screen.availHeight;
        let cls = e.target.shadowRoot.querySelector(`hbox`)?.classList;
        if (scrollbox.scrollTopMax < height && scrollbox.clientHeight < height)
            cls.add("BMBsmallContentBox");
        else cls.remove("BMBsmallContentBox");
    },

    checkPopups(popup) {
        popup.setAttribute("uc-init", true);
        this.setUpScroll(popup);
    },

    setUpScroll(popup) {
        popup.shadowRoot?.querySelector(`hbox`).classList.add("BMB-special-innerbox");
        popup.scrollBox.smoothScroll = true;
        popup.scrollBox._scrollIncrement = 150;
        popup.scrollBox._scrollButtonUp.classList.add("BMB-special-scrollbutton-up");
        popup.scrollBox._scrollButtonDown.classList.add("BMB-special-scrollbutton-down");
        popup.scrollBox._onButtonMouseOver = function _onButtonMouseOver(index) {
            if (this._ensureElementIsVisibleAnimationFrame || this._arrowScrollAnim.requestHandle)
                return;
            if (this._clickToScroll) this._continueScroll(index);
            else this._startScroll(index);
        };
        popup.scrollBox._onButtonMouseOut = function _onButtonMouseOut() {
            if (this._ensureElementIsVisibleAnimationFrame || this._arrowScrollAnim.requestHandle)
                return;
            if (this._clickToScroll) this._pauseScroll();
            else this._stopScroll();
        };
        popup.scrollBox._scrollButtonDown.onclick = function scrollToBottom() {
            bookmarksPopupShadowRoot.scrollByIndex(popup.scrollBox, popup.children.length);
        };
        popup.scrollBox._scrollButtonUp.onclick = function scrollToTop() {
            bookmarksPopupShadowRoot.scrollByIndex(popup.scrollBox, -popup.children.length);
        };
    },

    scrollByIndex(box, index, aInstant) {
        if (index == 0) return;
        var rect = box.scrollClientRect;
        var [start, end] = box.startEndProps;
        var x = index > 0 ? rect[end] + 1 : rect[start] - 1;
        var nextElement = box._elementFromPoint(x, index);
        if (!nextElement) return;
        var targetElement;
        if (box.isRTLScrollbox) index *= -1;
        while (index < 0 && nextElement) {
            if (box._canScrollToElement(nextElement)) targetElement = nextElement;
            nextElement = nextElement.previousElementSibling;
            index++;
        }
        while (index > 0 && nextElement) {
            if (box._canScrollToElement(nextElement)) targetElement = nextElement;
            nextElement = nextElement.nextElementSibling;
            index--;
        }
        if (!targetElement || !box._canScrollToElement(targetElement)) return;
        box._stopScroll();
        let animFrame = window.requestAnimationFrame(() => {
            targetElement.scrollIntoView({
                block: "nearest",
                behavior: aInstant ? "instant" : "auto",
            });
            box._ensureElementIsVisibleAnimationFrame = 0;
            box._arrowScrollAnim.requestHandle = 0;
        });
        box._ensureElementIsVisibleAnimationFrame = animFrame;
        box._arrowScrollAnim.requestHandle = animFrame;
    },
    init() {
        document.getElementById("BMB_bookmarksPopup").addEventListener("popupshowing", this, true);
        document.getElementById("bookmarksMenuPopup").addEventListener("popupshowing", this, true);
        document.getElementById("PlacesChevronPopup").addEventListener("popupshowing", this, true);
        CustomizableUI.removeListener(this);
    },
    onWidgetAfterDOMChange(aNode, _aNextNode, _aContainer, aWasRemoval) {
        if (!aWasRemoval && aNode.ownerGlobal === window && aNode === BookmarkingUI.button)
            this.init();
    },
    onWindowClosed(aWindow) {
        try {
            CustomizableUI.removeListener(aWindow.bookmarksPopupShadowRoot);
        } catch (e) {}
    },
    addHandler() {
        if (document.getElementById("bookmarks-menu-button")) this.init();
        else CustomizableUI.addListener(this);
    },
};

(function () {
    if (gBrowserInit.delayedStartupFinished) {
        bookmarksPopupShadowRoot.addHandler();
    } else {
        let delayedListener = (subject, topic) => {
            if (topic == "browser-delayed-startup-finished" && subject == window) {
                Services.obs.removeObserver(delayedListener, topic);
                bookmarksPopupShadowRoot.addHandler();
            }
        };
        Services.obs.addObserver(delayedListener, "browser-delayed-startup-finished");
    }
})();
