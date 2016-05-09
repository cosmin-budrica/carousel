(function(window, Hammer, Modernizr) {

    var STYLE_TRANSITION_DURATION_KEY = Modernizr.prefixed('transitionDuration');

    var STYLE_TRANSITION_KEY = Modernizr.prefixed('transition');

    var STYLE_TRANSFORM_KEY = Modernizr.prefixed('transform');

    var has3d = Modernizr.csstransforms3d;

    var MIN_TOUCH_SLOP = 8 * 2 * (window.devicePixelRatio || 1);

    function Carousel(element, options) {
        this.element = element;
        this.options = options || {};

        this.options.zoomable = true;

        this.container;
        this.slides;
        this.width;

        this.idx = this.options.idx || 0;

        this.maxIdx = this.idx;

        this.zoom;

        this.init();
    }

    Carousel.prototype = {

        init: function() {
            this.container = this.element.querySelector('.carousel-container');
            this.width = this.container.offsetWidth;

            this.slides = this.container.querySelectorAll('.carousel-slide');
            this.maxIdx = this.slides.length;

            this.setEvents();

            if (this.options.zoomable) {
                this.zoom = new CarouselZoom(this.mc);
            }

            this.setSlide(this.idx);
        },


        onPanMove: function(e) {
            console.log("pan move");
            /**
             * We're zooming right now, we should exit early from here
             */
            if (e.pointers.length != 1 || (this.zoom && this.zoom.zooming)) return;

            var dy = Math.abs(e.deltaY);

            if (dy > MIN_TOUCH_SLOP) {
                return this.onPanEnd(e);
            }

            var dx = Math.abs(e.deltaX);

            if (dx > MIN_TOUCH_SLOP && dx * 0.5 > dy) {
                e.preventDefault();

                var offset = (this.width * (this.idx + 1)) - e.deltaX;

                this.setOffset(offset);
            }
        },


        onSwipe: function(e) {
            console.log("swipe");
            if (e.pointers.length != 1 || (this.zoom && this.zoom.zooming)) return;

            e.preventDefault();
//            this.mc.stop(true);

            var idx = this.idx + (e.deltaX < 0 ? 1 : -1);

            this.setSlide(idx, e.velocity, true);
        },



        onPanEnd: function(e) {
            console.log("panend");
            if (e.pointers.length != 1 || (this.zoom && this.zoom.zooming)) return;

            e.preventDefault();
//            this.mc.stop(true);

            if (Math.abs(e.deltaX) > this.width / 3) {
                this.onSwipe(e);
                return;
            }

            this.setSlide(this.idx, e.velocity, true);
        },


        onTransitionEnd: function() {
            if (this.zoom && this.zoom.zooming) return;

            var newIdx = this.idx;

            if (this.idx == -1) newIdx = this.maxIdx - 3;
            if (this.idx == this.maxIdx - 2) newIdx = 0;

            this.idx = newIdx;

            var offset = this.width * (this.idx + 1);

            this.setOffset(offset);

            if (this.zoom) {
                this.zoom.setElement(this.slides[this.idx + 1]);
            }
        },



        setSlide: function(idx, velocity, animate) {
            velocity = velocity || 0;
            animate = animate || false;

            if (idx < -1) idx = -1;
            if (idx > this.maxIdx) idx = this.maxIdx;

            this.idx = idx;

            var offset = this.width * (this.idx + 1);

            this.setOffset(offset, velocity, animate);

            if (!animate) {
                return this.onTransitionEnd();
            }
        },



        setOffset: function(offset, velocity, animate) {
            velocity = velocity || 0;
            animate = animate || false;

            /**
             * At some point in time, we can use the velocity to calculate
             * exactly how much time the animation should be displayed
             *
             * Currently, a 0.2 is fine
             */
            this.container.style[STYLE_TRANSITION_DURATION_KEY] = animate ? '0.2s' : null;

            this.container.style[STYLE_TRANSFORM_KEY] = this.translate3d(-offset);
        },



        translate3d: function(x, y, z, scale) {
            x = x ? (x + 'px') : 0;
            y = y ? (y + 'px') : 0;
            z = z ? (z + 'px') : 0;
            scale = scale || 1;

            if (has3d) {
                return 'translate3d(' + [x, y, z].join(',') + ') scale(' + scale + ')';
            }

            return 'translate3d(' + [x, y].join(',') + ') scale(' + scale + ')';
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
        },


        destroy: function() {
            if (this.mc) {
                this.mc.destroy();
            }
        }

    };



    function CarouselZoom(mc) {
        this.mc = mc;

        //current
        this.c = {
            // current position
            pos: {x: 0, y: 0},
            // last position
            last: {x: 0, y: 0},
            // actual scale of the image
            scale: 1
        };

        this.element;

        this.init();
    }



    CarouselZoom.prototype.setElement = function(element) {
        this.reset();

        this.element = element.querySelector('.carousel-zoomable');

        /**
         * Dummy event for stopping propagation and event bubbling up the chain
         */
        this.element.addEventListener('webkitTransitionEnd', this.onTransitionEnd.bind(this));
        this.element.addEventListener('transitionend', this.onTransitionEnd.bind(this));
    }


    CarouselZoom.prototype.init = function() {
        this.setEvents();
    }


    CarouselZoom.prototype.reset = function() {
        if (this.element) {
            this.element.removeAttribute('style');

            /**
             * Cleanup events so we don't bind more than once
             */
            this.element.removeEventListener('webkitTransitionEnd', this.onTransitionEnd.bind(this));
            this.element.removeEventListener('transitionend', this.onTransitionEnd.bind(this));
        }

        this.c.pos.x = this.c.last.x = 0;
        this.c.pos.y = this.c.last.y = 0;
        this.c.scale = 1;
    }


    CarouselZoom.prototype.onTransitionEnd = function(e) {
        if (e) {
            e.stopPropagation();
            e.stopImmediatePropagation();
        }

        //does nothing, just prevents bubbling up
    }


    CarouselZoom.prototype.onDoubleTap = function(e) {
        console.log("double tapping: ", this.c);
        e.preventDefault();

        if (this.c.scale >= 4) {
            this.c.pos.x = 0;
            this.c.pos.y = 0;
            this.c.scale = 1;

            this.scale(0.4);

            this.onPinchEnd(e);

            return;
        }

        this.calculateZoomAndPosition(e);

        this.scale(0.2);

        this.onPinchEnd(e);
    },



    CarouselZoom.prototype.onPinchMove = function(e) {
        e.preventDefault();

        if (e.pointers.length == 2) {
            this.calculateZoomAndPosition(e);

            this.scale();
        } else if (this.c.scale > 1) {
            this.calculatePanPosition(e);

            this.scale();
        }

    }


    CarouselZoom.prototype.onPinchEnd = function(e) {
        e.preventDefault();

        this.c.last.x = this.c.pos.x;
        this.c.last.y = this.c.pos.y;

        if (this.c.scale > 1) {
            this.zooming = true;
        } else {
            this.zooming = false;
        }

    }


    CarouselZoom.prototype.calculateZoomAndPosition = function(e) {
        var center = e.center;
        var factor = (e.pointers.length == 2) ? e.scale : 1.5;

        //this assumes the widget is in fullscreen mode
        this.c.pos.x = center.x - (center.x - this.c.pos.x) * factor;
        this.c.pos.y = center.y - (center.y - this.c.pos.y) * factor;

        this.c.scale = this.c.scale * factor;
    }


    CarouselZoom.prototype.calculatePanPosition = function(e) {
        this.c.pos.x = this.c.last.x + e.deltaX;
        this.c.pos.y = this.c.last.y + e.deltaY;
    }


    CarouselZoom.prototype.scale = function(duration) {
        var transition  = duration ? 'all cubic-bezier(0,0,.5,1) ' + duration + 's' : '',
            matrixArray = [this.c.scale, 0, 0, this.c.scale, this.c.pos.x, this.c.pos.y],
            matrix      = 'matrix(' + matrixArray.join(',') + ')';

        this.element.style[STYLE_TRANSITION_KEY] = transition;
        this.element.style[STYLE_TRANSFORM_KEY] = matrix;
    }



    CarouselZoom.prototype.setEvents = function() {
        this.mc.add(new Hammer.Pinch({})).recognizeWith(this.mc.get('pan'));

        this.mc.add(new Hammer.Tap({ event: 'tap', taps: 2 }));

        this.mc
            .on('tap', this.onDoubleTap.bind(this))
//            .on('panstart pinchstart', this.onPinchStart.bind(this))
            .on('pan pinch', this.onPinchMove.bind(this))
            .on('panend pinchend', this.onPinchEnd.bind(this));
    }


    window.Carousel = Carousel;

})(window, Hammer, Modernizr);
