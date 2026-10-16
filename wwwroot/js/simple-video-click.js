// Starts a click-to-play video of the simple page (SimpleVideo.razor) on a click on its poster. With preload="none"
// Chromium ignores a click on the video surface while nothing is loaded and only its small play control works. The
// check is deferred, so a browser whose native click toggle runs after this listener is not toggled twice; once the
// video has loaded anything, the native handling stays in charge. Stores nothing.
(function () {
    var VIDEO_SELECTOR = 'video.simple-video';
    var NATIVE_HANDLER_DELAY_MS = 0;

    document.addEventListener('click', function (event) {
        var video = event.target.closest && event.target.closest(VIDEO_SELECTOR);
        if (!video) {
            return;
        }
        window.setTimeout(function () {
            if (video.paused && video.readyState === 0) {
                var started = video.play();
                if (started && started.catch) {
                    started.catch(function () { });
                }
            }
        }, NATIVE_HANDLER_DELAY_MS);
    });
})();
