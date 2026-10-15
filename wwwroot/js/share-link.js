// Copies the simple page's share link inside the click itself (ShareLinkButtons.razor), so the clipboard keeps the
// click's user activation (Safari/iOS) and copying works before the Blazor circuit is interactive. Stores nothing.
(function () {
    var COPY_SELECTOR = '[data-share-copy]';
    var BLOCK_SELECTOR = '[data-share-block]';
    var STATUS_SELECTOR = '[data-share-status]';
    var URL_SELECTOR = '[data-share-url]';
    var ANNOUNCE_DELAY_MS = 100;

    function selectText(element) {
        var selection = window.getSelection();
        if (!element || !selection) {
            return false;
        }
        var range = document.createRange();
        range.selectNodeContents(element);
        selection.removeAllRanges();
        selection.addRange(range);
        return true;
    }

    function copyBySelection(urlElement) {
        if (!selectText(urlElement)) {
            return false;
        }
        try {
            return document.execCommand('copy');
        } catch (error) {
            return false;
        }
    }

    function announce(status, text) {
        if (!status) {
            return;
        }
        status.textContent = '';
        window.setTimeout(function () { status.textContent = text; }, ANNOUNCE_DELAY_MS);
    }

    document.addEventListener('click', function (event) {
        var button = event.target.closest && event.target.closest(COPY_SELECTOR);
        if (!button) {
            return;
        }
        var block = button.closest(BLOCK_SELECTOR);
        var status = block ? block.querySelector(STATUS_SELECTOR) : null;
        var urlElement = block ? block.querySelector(URL_SELECTOR) : null;
        var url = button.getAttribute('data-share-copy');
        var copiedText = button.getAttribute('data-share-copied');
        var failedText = button.getAttribute('data-share-failed');

        if (status) {
            status.textContent = '';
        }

        function finish(copied) {
            if (copied) {
                var selection = window.getSelection();
                if (selection) {
                    selection.removeAllRanges();
                }
            }
            announce(status, copied ? copiedText : failedText);
        }

        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(url).then(
                function () { finish(true); },
                function () { finish(copyBySelection(urlElement)); });
            return;
        }
        finish(copyBySelection(urlElement));
    });
})();
