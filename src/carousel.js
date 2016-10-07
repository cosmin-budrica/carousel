(function(window, Hammer, Modernizr) {
    'use strict';

    var MIN_TOUCH_SLOP = 8 * 2 * (window.devicePixelRatio || 1);

    var STYLE_TRANSITION_KEY = Modernizr.prefixed('transition') || 'transition',
        STYLE_TRANSFORM_KEY = Modernizr.prefixed('transform') || 'transform';

    var has3d = Modernizr.csstransforms3d;

    var rAF = (function() {
        return window[Hammer.prefixed(window, 'requestAnimationFrame')] || function(callback) {
            window.setTimeout(callback, 1000 / 60);
        };
    }());

    var cAF = (function() {
        return window[Hammer.prefixed(window, 'cancelAnimationFrame')] || function(callback) {
            window.setTimeout(callback, 1000 / 60);
        };
    }());

    var translate3d = function(x, y, z, scale) {
        x = x ? (x + 'px') : 0;
        y = y ? (y + 'px') : 0;
        z = z ? (z + 'px') : 0;
        scale = scale || 1;

        if (has3d) {
            return 'translate3d(' + [x, y, z].join(',') + ') scale(' + scale + ')';
        }

        return 'translate(' + [x, y].join(',') + ') scale(' + scale + ')';
    };


    function CarouselZoom(_mc) {
        var mc = _mc;

        var element;

        //current
        var c = {
            // current center
            center: {x: 0, y: 0},
            // current position
            pos: {x: 0, y: 0},
            // last position and position
            last: {x: 0, y: 0, scale: 1},
            // actual scale of the image
            scale: 1
        };

        var rafId;

        var can = true;

        this.zooming = false;

        function resetPositionAndScale() {
            c.center.x = 0;
            c.center.y = 0;
            c.pos.x = c.last.x = 0;
            c.pos.y = c.last.y = 0;
            c.scale = c.last.scale = 1;
        }


        function scale(duration) {
            // ignore timestamp from rAF
            duration = (duration && duration < 2) ? duration : false;

            element.style[STYLE_TRANSITION_KEY] = duration ? ('all cubic-bezier(0,0,.5,1) ' + duration + 's') : null;
            element.style[STYLE_TRANSFORM_KEY] = translate3d(c.pos.x, c.pos.y, 0, c.scale);

            if (duration && rafId) {
                cAF(rafId);
                rafId = undefined;
            }

            can = true;
        }


        function setMaxZoom() {
            c.scale = c.last.scale = 4;
            c.pos.x = c.last.x = Math.round(c.center.x - (c.center.x * c.scale));
            c.pos.y = c.last.y = Math.round(c.center.y - (c.center.y * c.scale));
        }


        function onTransitionEnd(e) {
            if (e) {
                e.stopPropagation();
                e.stopImmediatePropagation();
            }

            if (c.scale < 1) {
                return resetPositionAndScale() && scale(0.2);
            }

            if (c.scale > 4) {
                return setMaxZoom() && scale(0.2);
            }
        }


        function reset() {
            if (element) {
                element.removeAttribute('style');

                /**
                 * Cleanup events so we don't bind more than once
                 */
                element.removeEventListener('webkitTransitionEnd', onTransitionEnd);
                element.removeEventListener('transitionend', onTransitionEnd);
            }

            return resetPositionAndScale();
        }

        function setElement(_element) {
            reset();

            element = _element.querySelector('.carousel-zoomable');

            /**
             * Dummy event for stopping propagation and event bubbling up the chain
             */
            element.addEventListener('webkitTransitionEnd', onTransitionEnd);
            element.addEventListener('transitionend', onTransitionEnd);
        }


        function requestScale() {
            if (!can) { return; }

            rafId = rAF(scale);
            can = false;
        }


        function checkBoundaries() {
            var changed = false;

            if (c.pos.x >= 0) {
                changed = true;
                c.pos.x = c.last.x = 0;
            }
            if (c.pos.y >= 0) {
                changed = true;
                c.pos.y = c.last.y = 0;
            }

            var offsetWidth = element.offsetWidth,
                offsetHeight = element.offsetHeight;

            var w = offsetWidth * c.scale - offsetWidth;
            var h = offsetHeight * c.scale - offsetHeight;

            if (-c.pos.x > w) {
                changed = true;
                c.pos.x = c.last.x = -w;
            }
            if (-c.pos.y > h) {
                changed = true;
                c.pos.y = c.last.y = -h;
            }

            return changed;
        }




        function onPinchEnd(e) {
            e.preventDefault();

            c.last.x = c.pos.x;
            c.last.y = c.pos.y;

            c.last.scale = c.scale;

            this.zooming = c.scale > 1;

            if (c.last.scale < 1) {
                return resetPositionAndScale() && scale(0.2);
            }

            if (c.last.scale > 4) {
                return setMaxZoom() && scale(0.2);
            }

            if (checkBoundaries()) {
                scale(0.2);
            }
        }


        function calculateZoomAndPosition(e) {
            var factor = (e.pointers.length === 2) ? e.scale : 1.5;

            c.scale = c.last.scale * factor;

            c.pos.x = Math.round(c.center.x - (c.center.x - c.last.x) * factor);
            c.pos.y = Math.round(c.center.y - (c.center.y - c.last.y) * factor);
        }


        function calculatePanPosition(e) {
            c.pos.x = c.last.x + e.deltaX;
            c.pos.y = c.last.y + e.deltaY;
        }


        function onPinchMove(e) {
            e.preventDefault();

            if (e.pointers.length === 2) {
                c.center.x = e.center.x;
                c.center.y = e.center.y;

                return calculateZoomAndPosition(e) && requestScale();
            }

            if (c.scale > 1) {
                return calculatePanPosition(e) && requestScale();
            }
        }


        function onDoubleTap(e) {
            e.preventDefault();

            c.center.x = e.center.x;
            c.center.y = e.center.y;

            if (c.scale >= 4) {
                return resetPositionAndScale() && scale(0.4) && onPinchEnd(e);
            }

            return calculateZoomAndPosition(e) && scale(0.2) && onPinchEnd(e);
        }




        function setEvents() {
            mc.add(new Hammer.Tap({ event: 'tap', taps: 2 }));
            mc.add(new Hammer.Pinch({})).recognizeWith(mc.get('pan'));

            mc
                .on('tap', onDoubleTap)
                .on('pan pinch', onPinchMove)
                .on('panend pinchend', onPinchEnd);
        }


        (function() {
            setEvents();
        }());

        return {
            setElement: setElement,

            destroy: reset
        };
    }


    function Carousel(_element, _options) {

        /**
         * Root element of carousel
         */
        var element = _element;

        /**
         * Options for the carousel
         *
         *  - zoomable: true || false
         *
         * @type Object
         */
        var options = _options || {};

        var mc;

        var container;
        var slides;
        var dots;

        var width = 0;

        var idx = options.idx || undefined;

        var maxIdx = idx;

        var offset = 0;

        var zoom;

        var rafId;

        var can = true;

        var onIdxUpdateCallback;


        function onIdxUpdate(callback) {
            onIdxUpdateCallback = callback;
        }


        function setOffset(velocity, animate) {
            velocity = (velocity && velocity < 2) ? velocity : 0;
            animate = animate || false;

            /**
             * At some point in time, we can use the velocity to calculate
             * the duration of the animation
             *
             * Currently, a 0.2 is fine
             */
            container.style[STYLE_TRANSITION_KEY] = animate ? 'all cubic-bezier(0,0,.5,1) 0.2s' : null;

            container.style[STYLE_TRANSFORM_KEY] = translate3d(-offset);

            if (velocity && rafId) {
                cAF(rafId);
                rafId = undefined;
            }

            can = true;
        }


        function setActiveDot() {
            if (!dots.length) { return; }

            var i;
            var _idx = idx;
            if (_idx === -1) { _idx = maxIdx - 3; }
            if (_idx === maxIdx - 2) { _idx = 0; }

            for (i = 0; i < dots.length; i++) {
                dots[i].className = (i === _idx) ? 'carousel-dot active' : 'carousel-dot';
            }
        }



        function requestSetOffset() {
            if (!can) { return; }

            rafId = rAF(setOffset);
            can = false;
        }



        function onTransitionEnd() {
            if (zoom && zoom.zooming) { return; }

            var newIdx = idx;

            if (idx === -1) { newIdx = maxIdx - 3; }
            if (idx === maxIdx - 2) { newIdx = 0; }

            idx = newIdx;

            offset = width * (idx + 1);

            setOffset();

            if (zoom) {
                zoom.setElement(slides[idx + 1]);
            }

            if (onIdxUpdateCallback) {
                onIdxUpdateCallback(idx);
            }
        }


        function setSlide(_idx, velocity, animate) {
            velocity = velocity || 0;
            animate = animate || false;

            if (_idx < -1) { _idx = -1; }
            if (_idx > maxIdx) { _idx = maxIdx; }

            if (idx === _idx) { return; }

            idx = _idx;

            offset = width * (idx + 1);

            setOffset(velocity, animate);

            setActiveDot();

            if (onIdxUpdateCallback) {
                onIdxUpdateCallback(idx);
            }

            if (!animate) {
                return onTransitionEnd();
            }
        }

        function onPanMove(e) {
            e.preventDefault();

            /**
             * We're zooming right now, we should exit early from here
             */
            if (e.pointers.length !== 1 || (zoom && zoom.zooming)) {
                return;
            }

            var dy = Math.abs(e.deltaY);

            if (dy > MIN_TOUCH_SLOP) {
                return;
            }

            var dx = Math.abs(e.deltaX);

            if (dx > MIN_TOUCH_SLOP && dx * 0.5 > dy) {
                offset = (width * (idx + 1)) - e.deltaX;

                requestSetOffset();
            }
        }


        function onSwipe(e) {
            e.preventDefault();

            if (e.pointers.length !== 1 || (zoom && zoom.zooming)) {
                return;
            }

            var newIdx = idx + (e.deltaX < 0 ? 1 : -1);

            return setSlide(newIdx, e.velocity, true);
        }


        function onPanEnd(e) {
            e.preventDefault();

            if (e.pointers.length !== 1 || (zoom && zoom.zooming)) {
                return;
            }

            if (Math.abs(e.deltaX) > 30) {
                return onSwipe(e);
            }

            return setSlide(idx, e.velocity, true);
        }


        function onWindowResize() {
            width = container.offsetWidth;

            setSlide(idx || 0);

            if (zoom) {
                zoom.setElement(slides[idx + 1]);
            }
        }


        function setEvents() {

            mc = new Hammer.Manager(element, {
                touchAction: 'pan-y',
                domEvents: true
            });

            mc.add(new Hammer.Swipe({
                direction: Hammer.DIRECTION_HORIZONTAL
            }));

            mc.add(new Hammer.Pan({
                direction: Hammer.DIRECTION_HORIZONTAL
            }));

            mc
                .on('panleft panright', onPanMove)
                .on('swipeleft swiperight', onSwipe)
                .on('panend', onPanEnd);

            container.addEventListener('webkitTransitionEnd', onTransitionEnd);
            container.addEventListener('transitionend', onTransitionEnd);

            window.addEventListener('resize', onWindowResize);
        }


        function destroy() {
            if (zoom) {
                zoom.destroy();
            }

            if (mc) {
                mc.destroy();
            }

            container.removeEventListener('webkitTransitionEnd', onTransitionEnd);
            container.removeEventListener('transitionend', onTransitionEnd);

            window.removeEventListener('resize', onWindowResize);
        }


        (function() {
            container = element.querySelector('.carousel-container');

            slides = container.querySelectorAll('.carousel-slide');
            dots = element.querySelectorAll('.carousel-dot');
            maxIdx = slides.length;

            setEvents();

            if (options.zoomable) {
                zoom = new CarouselZoom(mc);
            }

            return onWindowResize();
        }());



        return {
            onIdxUpdate: onIdxUpdate,

            setCurrentIndex: setSlide,

            onWindowResize: onWindowResize,

            destroy: destroy
        };
    }

    window.Carousel = Carousel;

})(window, Hammer, Modernizr);

