(function(window, Hammer, Modernizr) {
    'use strict';

    var MIN_TOUCH_SLOP = 8 * 2 * (window.devicePixelRatio || 1);

    var STYLE_TRANSITION_KEY = Modernizr.prefixed('transition'),
        STYLE_TRANSFORM_KEY = Modernizr.prefixed('transform');

    var has3d = Modernizr.csstransforms3d;

    var rAF = (function() {
        return window[Hammer.prefixed(window, 'requestAnimationFrame')] || function(callback) {
            window.setTimeout(callback, 1000 / 60);
        };
    })();

    var cAF = (function() {
        return window[Hammer.prefixed(window, 'cancelAnimationFrame')] || function(callback) {
            window.setTimeout(callback, 1000 / 60);
        };
    })();

    var translate3d = function(x, y, z, scale) {
        x = x ? (x + 'px') : 0;
        y = y ? (y + 'px') : 0;
        z = z ? (z + 'px') : 0;
        scale = scale || 1;

        if (has3d) {
            return 'translate3d(' + [x, y, z].join(',') + ') scale(' + scale + ')';
        }

        return 'translate3d(' + [x, y].join(',') + ') scale(' + scale + ')';
    };


    function Carousel(element, options) {

        this.element = element;
        this.options = options || {};

        this.container = undefined;
        this.slides = undefined;
        this.dots = undefined;
        this.width = 0;

        this.idx = this.options.idx || 0;

        this.maxIdx = this.idx;

        this.offset = 0;

        this.zoom = undefined;

        this.rafId = undefined;

        this.can = true;

        this.onIdxUpdateCallback = undefined;

        this.init();
    }

    Carousel.prototype = {

        init: function() {
            this.container = this.element.querySelector('.carousel-container');

            this.slides = this.container.querySelectorAll('.carousel-slide');
            this.dots = this.element.querySelectorAll('.carousel-dot');
            this.maxIdx = this.slides.length;

            this.setEvents();

            if (this.options.zoomable) {
                this.zoom = new CarouselZoom(this.mc);
            }

            return this.onWindowResize();
        },

        onIdxUpdate: function(callback) {
            this.onIdxUpdateCallback = callback;

            return this;
        },

        setCurrentIndex: function(idx) {
            this.setSlide(idx);

            return this;
        },

        onPanMove: function(e) {
            e.preventDefault();

            /**
             * We're zooming right now, we should exit early from here
             */
            if (e.pointers.length != 1 || (this.zoom && this.zoom.zooming)) return this;

            var dy = Math.abs(e.deltaY);

            if (dy > MIN_TOUCH_SLOP) return this;

            var dx = Math.abs(e.deltaX);

            if (dx > MIN_TOUCH_SLOP && dx * 0.5 > dy) {
                this.offset = (this.width * (this.idx + 1)) - e.deltaX;

                this.requestSetOffset();
            }

            return this;
        },

        onSwipe: function(e) {
            e.preventDefault();

            if (e.pointers.length != 1 || (this.zoom && this.zoom.zooming)) return this;

            var idx = this.idx + (e.deltaX < 0 ? 1 : -1);

            return this.setSlide(idx, e.velocity, true);
        },

        onPanEnd: function(e) {
            e.preventDefault();

            if (e.pointers.length != 1 || (this.zoom && this.zoom.zooming)) return this;

            if (Math.abs(e.deltaX) > 30) {
                return this.onSwipe(e);
            }

            return this.setSlide(this.idx, e.velocity, true);
        },

        onTransitionEnd: function() {
            if (this.zoom && this.zoom.zooming) return this;

            var newIdx = this.idx;

            if (this.idx == -1) newIdx = this.maxIdx - 3;
            if (this.idx == this.maxIdx - 2) newIdx = 0;

            this.idx = newIdx;

            this.offset = this.width * (this.idx + 1);

            this.setOffset();

            if (this.zoom) {
                this.zoom.setElement(this.slides[this.idx + 1]);
            }

            if (this.onIdxUpdateCallback) {
                this.onIdxUpdateCallback(this.idx);
            }

            return this;
        },

        onWindowResize: function() {
            this.width = this.container.offsetWidth;

            this.setSlide(this.idx);

            if (this.zoom) {
                this.zoom.setElement(this.slides[this.idx + 1]);
            }

            return this;
        },

        setSlide: function(idx, velocity, animate) {
            velocity = velocity || 0;
            animate = animate || false;

            if (idx < -1) idx = -1;
            if (idx > this.maxIdx) idx = this.maxIdx;

            this.idx = idx;

            this.offset = this.width * (this.idx + 1);

            this.setOffset(velocity, animate);

            this.setActiveDot();

            if (this.onIdxUpdateCallback) {
                this.onIdxUpdateCallback(this.idx);
            }

            if (!animate) {
                return this.onTransitionEnd();
            }

            return this;
        },

        setOffset: function(velocity, animate) {
            velocity = (velocity && velocity < 2) ? velocity : 0;
            animate = animate || false;

            /**
             * At some point in time, we can use the velocity to calculate
             * the duration of the animation
             *
             * Currently, a 0.2 is fine
             */
            this.container.style[STYLE_TRANSITION_KEY] = animate ? 'all cubic-bezier(0,0,.5,1) 0.2s' : null;
            this.container.style[STYLE_TRANSFORM_KEY] = translate3d(-this.offset);

            if (velocity && this.rafId) {
                cAF(this.rafId);
                this.rafId = undefined;
            }

            this.can = true;

            return this;
        },


        setActiveDot: function() {
            if (!this.dots.length) return this;

            var idx = this.idx;
            if (idx == -1) idx = this.maxIdx - 3;
            if (idx == this.maxIdx - 2) idx = 0;

            for (var i = 0; i < this.dots.length; i++) {
                this.dots[i].className = (i == idx) ? 'carousel-dot active' : 'carousel-dot';
            }

            return this;
        },

        requestSetOffset: function() {
            if (!this.can) return this;

            this.rafId = rAF(this.setOffset.bind(this));
            this.can = false;

            return this;
        },


        setEvents: function() {

            var mc = new Hammer.Manager(this.element, {
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
                .on('panleft panright', this.onPanMove.bind(this))
                .on('swipeleft swiperight', this.onSwipe.bind(this))
                .on('panend', this.onPanEnd.bind(this));

            this.mc = mc;

            this.container.addEventListener('webkitTransitionEnd', this.onTransitionEnd.bind(this));
            this.container.addEventListener('transitionend', this.onTransitionEnd.bind(this));

            window.addEventListener('resize', this.onWindowResize.bind(this));

            return this;
        },

        destroy: function() {
            if (this.zoom) {
                this.zoom.destroy();
            }

            if (this.mc) {
                this.mc.destroy();
            }

            this.container.removeEventListener('webkitTransitionEnd', this.onTransitionEnd.bind(this));
            this.container.removeEventListener('transitionend', this.onTransitionEnd.bind(this));

            window.removeEventListener('resize', this.onWindowResize.bind(this));

            return this;
        }

    };



    function CarouselZoom(mc) {
        this.mc = mc;

        //current
        this.c = {
            // current center
            center: {x: 0, y: 0},
            // current position
            pos: {x: 0, y: 0},
            // last position and position
            last: {x: 0, y: 0, scale: 1},
            // actual scale of the image
            scale: 1
        };

        this.element;

        this.rafId = undefined;

        this.can = true;

        return this.init();
    }


    CarouselZoom.prototype = {
        setElement: function(element) {
            this.reset();

            this.element = element.querySelector('.carousel-zoomable');

            /**
             * Dummy event for stopping propagation and event bubbling up the chain
             */
            this.element.addEventListener('webkitTransitionEnd', this.onTransitionEnd.bind(this));
            this.element.addEventListener('transitionend', this.onTransitionEnd.bind(this));

            return this;
        },

        init: function() {
            return this.setEvents();
        },

        reset: function() {
            if (this.element) {
                this.element.removeAttribute('style');

                /**
                 * Cleanup events so we don't bind more than once
                 */
                this.element.removeEventListener('webkitTransitionEnd', this.onTransitionEnd.bind(this));
                this.element.removeEventListener('transitionend', this.onTransitionEnd.bind(this));
            }

            return this.resetPositionAndScale();
        },

        resetPositionAndScale: function() {
            this.c.center.x = 0;
            this.c.center.y = 0;
            this.c.pos.x = this.c.last.x = 0;
            this.c.pos.y = this.c.last.y = 0;
            this.c.scale = this.c.last.scale = 1;

            return this;
        },

        destroy: function() {
            return this.reset();
        },

        onTransitionEnd: function(e) {
            if (e) {
                e.stopPropagation();
                e.stopImmediatePropagation();
            }

            if (this.c.scale < 1) {
                return this.resetPositionAndScale().scale(0.2);
            }

            if (this.c.scale > 4) {
                return this.setMaxZoom().scale(0.2);
            }

            return this;
        },

        checkBoundaries: function() {
            var changed = false;

            if (this.c.pos.x >= 0) {
                changed = true;
                this.c.pos.x = this.c.last.x = 0;
            }
            if (this.c.pos.y >= 0) {
                changed = true;
                this.c.pos.y = this.c.last.y = 0;
            }

            var offsetWidth = this.element.offsetWidth,
                offsetHeight = this.element.offsetHeight;

            var w = offsetWidth * this.c.scale - offsetWidth;
            var h = offsetHeight * this.c.scale - offsetHeight;

            if (-this.c.pos.x > w) {
                changed = true;
                this.c.pos.x = this.c.last.x = -w;
            }
            if (-this.c.pos.y > h) {
                changed = true;
                this.c.pos.y = this.c.last.y = -h;
            }

            return changed;
        },

        setMaxZoom: function() {
            this.c.scale = this.c.last.scale = 4;
            this.c.pos.x = this.c.last.x = Math.round(this.c.center.x - (this.c.center.x * this.c.scale));
            this.c.pos.y = this.c.last.y = Math.round(this.c.center.y - (this.c.center.y * this.c.scale));

            return this;
        },

        onDoubleTap: function(e) {
            e.preventDefault();

            this.c.center.x = e.center.x;
            this.c.center.y = e.center.y;

            if (this.c.scale >= 4) {
                return this.resetPositionAndScale().scale(0.4).onPinchEnd(e);
            }

            return this.calculateZoomAndPosition(e).scale(0.2).onPinchEnd(e);
        },

        onPinchMove: function(e) {
            e.preventDefault();

            if (e.pointers.length == 2) {
                this.c.center.x = e.center.x;
                this.c.center.y = e.center.y;

                return this.calculateZoomAndPosition(e).requestScale();
            } else if (this.c.scale > 1) {
                return this.calculatePanPosition(e).requestScale();
            }

            return this;
        },

        onPinchEnd: function(e) {
            e.preventDefault();

            this.c.last.x = this.c.pos.x;
            this.c.last.y = this.c.pos.y;

            this.c.last.scale = this.c.scale;

            this.zooming = this.c.scale > 1;

            if (this.c.last.scale < 1) {
                return this.resetPositionAndScale().scale(0.2);
            }

            if (this.c.last.scale > 4) {
                return this.setMaxZoom().scale(0.2);
            }

            if (this.checkBoundaries()) {
                this.scale(0.2);
            }

            return this;
        },

        calculateZoomAndPosition: function(e) {
            var factor = (e.pointers.length == 2) ? e.scale : 1.5;

            this.c.scale = this.c.last.scale * factor;

            this.c.pos.x = Math.round(this.c.center.x - (this.c.center.x - this.c.last.x) * factor);
            this.c.pos.y = Math.round(this.c.center.y - (this.c.center.y - this.c.last.y) * factor);

            return this;
        },

        calculatePanPosition: function(e) {
            this.c.pos.x = this.c.last.x + e.deltaX;
            this.c.pos.y = this.c.last.y + e.deltaY;

            return this;
        },

        scale: function(duration) {
            // ignore timestamp from rAF
            duration = (duration && duration < 2) ? duration : false;

            this.element.style[STYLE_TRANSITION_KEY] = duration ? ('all cubic-bezier(0,0,.5,1) ' + duration + 's') : null;
            this.element.style[STYLE_TRANSFORM_KEY] = translate3d(this.c.pos.x, this.c.pos.y, 0, this.c.scale);

            if (duration && this.rafId) {
                cAF(this.rafId);
                this.rafId = undefined;
            }

            this.can = true;

            return this;
        },

        requestScale: function() {
            if (!this.can) return this;

            this.rafId = rAF(this.scale.bind(this));
            this.can = false;

            return this;
        },

        setEvents: function() {
            this.mc.add(new Hammer.Tap({ event: 'tap', taps: 2 }));
            this.mc.add(new Hammer.Pinch({})).recognizeWith(this.mc.get('pan'));

            this.mc
                .on('tap', this.onDoubleTap.bind(this))
                .on('pan pinch', this.onPinchMove.bind(this))
                .on('panend pinchend', this.onPinchEnd.bind(this));

            return this;
        }
    };


    window.Carousel = Carousel;

})(window, Hammer, Modernizr);

