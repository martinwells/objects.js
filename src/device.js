/**
 * gamecore.js - Copyright 2012 Playcraft Labs, Inc. (see licence.txt)
 * device.js
 * Access to device capabilities
 */

/**
 * @class gamecore.Device
 * Staic class with lots of device information.
 */

gamecore.Device = gamecore.Base.extend('gamecore.Device',
    {
        pixelRatio:0,
        isiPhone:false,
        isiPhone4:false,
        isiPad:false,
        isAndroid:false,
        isTouch:false,
        isFirefox: false,
        isChrome: false,
        isOpera: false,
        isIE: false,
        ieVersion: 0,
        requestAnimFrame: null,
        hasMemoryProfiling: false,

        init:function ()
        {
            this.pixelRatio = window.devicePixelRatio || 1;
            this.isiPhone = navigator.userAgent.toLowerCase().indexOf('iphone') != -1;
            this.isiPhone4 = (this.pixelRatio == 2 && this.isiPhone);
            this.isiPad = navigator.userAgent.toLowerCase().indexOf('ipad') != -1;
            this.isAndroid = navigator.userAgent.toLowerCase().indexOf('android') != -1;
            this.isFirefox = navigator.userAgent.toLowerCase().indexOf('firefox') != -1;
            this.isChrome = navigator.userAgent.toLowerCase().indexOf('chrome') != -1;
            this.isOpera = navigator.userAgent.toLowerCase().indexOf('opera') != -1;
            this.isTouch = window.ontouchstart !== 'undefined';

            this.hasMemoryProfiling =
                window.performance !== 'undefined' &&
                    window.performance.memory !== 'undefined';

            if (/MSIE (\d+\.\d+);/.test(navigator.userAgent))
            {
                this.ieVersion = new Number(RegExp.$1);
                this.isIE = true;
            }

            this.requestAnimFrame = (function ()
            {
                var request =
                    window.requestAnimationFrame ||
                        window.webkitRequestAnimationFrame ||
                        window.mozRequestAnimationFrame ||
                        window.oRequestAnimationFrame ||
                        window.msRequestAnimationFrame ||
                        function (callback, element)
                        {
                            window.setTimeout(callback, 16, Date.now());
                        };

                // apply to our window global to avoid illegal invocations (it's a native)
                return function (callback, element)
                {
                    request.apply(window, [callback, element]);
                };
            })();

            // todo:
            // highres timer
            // game pads
            // fullscreen api
            // mouse lock
        },

        getUsedHeap: function()
        {
            return this.hasMemoryProfiling ? window.performance.memory.usedJSHeapSize : 0;
        },

        getTotalHeap: function()
        {
            return this.hasMemoryProfiling ? window.performance.memory.totalJSHeapSize : 0;
        }


    },
    {
        // Singleton static class, so nothing required here
    });