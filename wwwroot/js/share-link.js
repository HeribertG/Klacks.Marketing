// Copies the simple page's share link to the clipboard (ShareLinkButtons.razor). Stores nothing.
window.klacksShare = (function () {
    function copy(text) {
        if (!navigator.clipboard || !window.isSecureContext) {
            return Promise.resolve(false);
        }
        return navigator.clipboard.writeText(text).then(function () { return true; }, function () { return false; });
    }

    return { copy: copy };
})();
