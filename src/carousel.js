(function(window, Hammer, Modernizr) {
    'use strict';

    var MIN_TOUCH_SLOP = 8 * 2 * (window.devicePixelRatio || 1);

    var STYLE_TRANSITION_KEY = Modernizr.prefixed('transition') || 'transition',
        STYLE_TRANSFORM_KEY = Modernizr.prefixed('transform') || 'transform',
        STYLE_TRANSFORM_DURATION_KEY = Modernizr.prefixed('transform-duration') || 'transform-duration',
        STYLE_TRANSFORM_ORIGIN_KEY = Modernizr.prefixed('transform-origin') || 'transform-origin';

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


    function CarouselHover() {
        var element, img;

        var width, height, offset,
            targetWidth, targetHeight;

        //current
        var c = {
            m: {x: 0, y: 0},
            pos: {x: 0, y: 0},

            scale: 1.7
        };

        var rafId, can = true;

        function reset() {
            offset = undefined;

            if (rafId) {
                cAF(rafId);
            }

            if (element) {
                img.style[STYLE_TRANSFORM_KEY] = '';
                img.style[STYLE_TRANSFORM_ORIGIN_KEY] = '';
                img.style[STYLE_TRANSFORM_DURATION_KEY] = '';
            }

            c.pos.x = 0;
            c.pos.y = 0;

            c.m.x = 0;
            c.m.y = 0;

            can = true;
        }


        function hover() {
            if (!offset) {
                can = true;
                return;
            }

            c.pos.x = c.m.x - offset.left - width / 6;
            c.pos.y = c.m.y - offset.top - height / 6;

            c.pos.x = Math.max(Math.min(c.pos.x, targetWidth - width - 1), 0);
            c.pos.y = Math.max(Math.min(c.pos.y, targetHeight - height - 1), 0);

            img.style[STYLE_TRANSFORM_KEY] = translate3d(-c.pos.x, -c.pos.y, 0, c.scale);

            can = true;
        }


        function requestHover() {
            if (!can) { return; }

            rafId = rAF(hover);
            can = false;
        }


        function onMouseEnter() {
            var rect = element.getBoundingClientRect();

            img.style[STYLE_TRANSFORM_ORIGIN_KEY] = '0 0 0';
            img.style[STYLE_TRANSFORM_DURATION_KEY] = '0.1s';

            offset = {
                top: rect.top,
                left: rect.left
            };
        }


        function onMouseMove(e) {
            c.m.x = e.pageX;
            c.m.y = e.pageY;

            requestHover();
        }


        function setEvents() {
            element.addEventListener('mouseenter', onMouseEnter);
            element.addEventListener('mousemove', onMouseMove);
            element.addEventListener('mouseout', reset);
        }


        function setElement(_element) {
            reset();

            element = _element;
            img = _element.querySelector('div');

            width = element.offsetWidth;
            height = element.offsetHeight;

            targetWidth = width * c.scale;
            targetHeight = height * c.scale;

            offset = element.getBoundingClientRect();

            setEvents();
        }


        function destroy() {
            element.removeEventListener('mouseenter', onMouseEnter);
            element.removeEventListener('mousemove', onMouseMove);
            element.removeEventListener('mouseout', reset);

            reset();
        }


        return {
            setElement: setElement,

            destroy: destroy
        };

    }


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

        var rafId, can = true;

        var zooming = false;

        function resetPositionAndScale() {
            c.center.x = 0;
            c.center.y = 0;
            c.pos.x = c.last.x = 0;
            c.pos.y = c.last.y = 0;
            c.scale = c.last.scale = 1;
        }


        function isZooming() {
            return zooming;
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
                resetPositionAndScale();
                scale(0.2);

                return;
            }

            if (c.scale > 4) {
                setMaxZoom();
                scale(0.2);

                return;
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

            zooming = c.scale > 1;

            if (c.last.scale < 1) {
                resetPositionAndScale();
                scale(0.2);

                return;
            }

            if (c.last.scale > 4) {
                setMaxZoom();
                scale(0.2);

                return;
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


        function requestScale(e, type) {
            if (!can) { return; }

            if (type === 'pan') {
                calculatePanPosition(e);
            } else {
                calculateZoomAndPosition(e);
            }

            rafId = rAF(scale);
            can = false;
        }


        function onPinchMove(e) {
            e.preventDefault();

            if (e.pointers.length === 2) {
                c.center.x = e.center.x;
                c.center.y = e.center.y;

                return requestScale(e, 'zoom');
            }

            if (c.scale > 1) {
                requestScale(e, 'pan');
            }
        }


        function onDoubleTap(e) {
            e.preventDefault();

            c.center.x = e.center.x;
            c.center.y = e.center.y;

            if (c.scale >= 4) {
                resetPositionAndScale();
                scale(0.4);
            } else {
                calculateZoomAndPosition(e);
                scale(0.2);
            }

            onPinchEnd(e);
        }



        function setEvents() {
            mc.add(new Hammer.Tap({ event: 'tap', taps: 2 }));
            mc.add(new Hammer.Pinch({})).recognizeWith(mc.get('pan'));

            mc
                .on('tap', onDoubleTap)
                .on('pan pinch', onPinchMove)
                .on('panend pinchend', onPinchEnd);
        }


        setEvents();

        return {
            setElement: setElement,

            isZooming: isZooming,

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

        var idx;

        var maxIdx = idx;

        var offset = 0;

        var zoom;

        var hover;

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
            if (zoom && zoom.isZooming()) { return; }

            var newIdx = idx;

            if (idx === -1) { newIdx = maxIdx - 3; }
            if (idx === maxIdx - 2) { newIdx = 0; }

            idx = newIdx;

            offset = width * (idx + 1);

            setOffset();

            if (zoom) {
                zoom.setElement(slides[idx + 1]);
            }

            if (hover) {
                hover.setElement(slides[idx + 1]);
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
            if (e.pointers.length !== 1 || (zoom && zoom.isZooming())) {
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

            if (e.pointers.length !== 1 || (zoom && zoom.isZooming())) {
                return;
            }

            var newIdx = idx + (e.deltaX < 0 ? 1 : -1);

            return setSlide(newIdx, e.velocity, true);
        }


        function onPanEnd(e) {
            e.preventDefault();

            if (e.pointers.length !== 1 || (zoom && zoom.isZooming())) {
                return;
            }

            if (Math.abs(e.deltaX) > 30) {
                return onSwipe(e);
            }

            return setSlide(idx, e.velocity, true);
        }


        function onWindowResize() {
            width = container.offsetWidth;

            setSlide(idx || options.idx);

            if (zoom) {
                zoom.setElement(slides[idx + 1]);
            }

            if (hover) {
                hover.setElement(slides[idx + 1]);
            }

            if (onIdxUpdateCallback) {
                onIdxUpdateCallback(idx);
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

            if (hover) {
                hover.destroy();
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

            if (options.hoverable) {
                hover = new CarouselHover();
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

