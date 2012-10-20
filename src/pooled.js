/**
 * gamecore.js - Copyright 2012 Playcraft Labs, Inc. (see licence.txt)
 * pool.js
 */

/**
 * @class gamecore.Pool
 * Easy (high-performance) object pooling
 *
 * A pool of objects for use in situations where you want to minimize object life cycling (and
 * subsequently garbage collection). It also serves as a very high speed, minimal overhead
 * collection for small numbers of objects.
 * <p>
 * This class maintains mutual an array of objects which are free. If you wish to maintain a list of both
 * free and used then see the gamecore.DualPool.
 * <p>
 * Pools are managed by class type, and will auto-expand as required. You can create a custom initial pool
 * size by deriving from the Pool class and statically overriding INITIAL_POOL_SIZE.
 * <p>
 * Keep in mind that objects that are pooled are not constructed; they are "reset" when handed out.
 * You need to "acquire" one and then reset its state, usually via a static create factory method.
 * <p>
 * Example:
 * <pre><code>
 * Point = gamecore.Pooled('Point',
 * {
 *   // Static constructor
 *   create:function (x, y)
 *   {
 *      var n = this._super();
 *      n.x = x;
 *      n.y = y;
 *      return n;
 *   }
 * },
 * {
 *    x:0, y:0,   // instance
 *
 *    init: function(x, y)
 *    {
 *       this.x = x;
 *       this.y = y;
 *    }
 * }
 * </code></pre>
 * To then access the object from the pool, use create, instead of new. Then release it.
 * <pre><code>
 * var p = Point.create(100, 100);
 * // ... do something
 * p.release();
 * </code></pre>
 *
 */

gamecore.Pool = gamecore.Base.extend('gamecore.Pool',
    /** @lends gamecore.Pool */
    {
        /** Initial size of all object pools */
        INITIAL_POOL_SIZE:1,

        /** Hashtable of ALL the object pools */
        pools:new gamecore.Hashtable(),
        /** total objects in all pools */
        totalPooled:0,
        /** total objects in use right now */
        totalUsed:0,

        /**
         * Acquire an object from a pool based on the class[name]. Typically this method is
         * automatically called from Pooled.create method and should not be used directly.
         * @param {String} classType Class of object to create
         * @return {gamecore.Pooled} A shiny object you can then configure
         */
        acquire:function (classType)
        {
            var pool = this.getPool(classType);
            if (pool == undefined || pool == null)
            {
                // create a pool for this type of class
                //this.info('Constructing a new pool for ' + classType.fullName + ' objects.');
                pool = new gamecore.Pool(classType, this.INITIAL_POOL_SIZE);
                this.pools.put(classType.fullName, pool);
            }

            return pool.acquire();
        },

        /**
         * Releases an object back into it's corresponding object pool
         * @param {gamecore.Pooled} pooledObj Object to return to the pool
         */
        release:function (pooledObj)
        {
            var pool = this.pools.get(pooledObj.Class.fullName);
            if (pool == undefined)
                throw "Oops, trying to release an object of type " + pooledObj.Class.fullName +
                    " but no pool exists. Did you new an object instead of using create.";

            pool.release(pooledObj);
        },

        /**
         * Returns the pool associated with the given classType, or null if no pool currently exists.
         * @return {gamecore.Pool} Object pool associated with the class type
         */
        getPool:function (classType)
        {
            return this.pools.get(classType.fullName);
        },

        /**
         * Gets stats on the usage of all pools.
         * @return {String} Stats string
         */
        getStats:function ()
        {
            var s = '';

            var keys = this.pools.keys();
            for (var i = 0; i < keys.length; i++)
            {
                var key = keys[i];
                var pool = this.pools.get(key);
                s += key + ': ' + pool.getStats()  + '\n';
            }

            return s;
        }

    },
    /** @lends gamecore.Pool.prototype */
    {
        /** Linked list of currently free objects residing in the pool */
        freeList:null,
        /** Current number of items to expand by: will increase with every expansion */
        expansion: 1,
        /** Array of traces currently active. Tracing must be on. */
        traces: null,

        /**
         * Constructs a pool. Will automatically be called by the static pool method. Generally not called directly.
         * @param {String} classType Class name of the type of objects in the pool
         * @param {Number} initial Starting number of objects in the pool
         */
        init:function (classType, initial)
        {
            this._super();
            this.classType = classType;
            this.freeList = [];

            // instantiate the initial objects for the pool
            this.expand(initial);
        },

        /**
         * Enables tracing on this pool.
         */
        startTracing:function ()
        {
            if (this.tracing) return;
            this.tracing = true;
            if (this.traces)
                this.traces.clear();
            else
                this.traces = new gamecore.Hashtable();
        },

        /**
         * Disables tracing on this pool.
         */
        stopTracing:function ()
        {
            this.tracing = false;
        },

        /**
         * Expand the pool of objects by constructing a bunch of new ones. The pool will
         * automatically expand itself by 10% each time it runs out of space, so generally you
         * shouldn't need to use this.
         * @param {Number} howMany Number of new objects you want to add
         */
        expand:function (howMany)
        {
            gamecore.Pool.totalPooled += howMany;

            //debug: if you want to track expansion
            //this.debug('expanding ' + this.classType.fullName + ' by ' + howMany + ' total=' + gamecore.Pool.totalPooled);

            for (var i = 0; i < howMany; i++)
                this.freeList.push(new this.classType());
        },

        /**
         * Gets the free count of objects left in the pool
         * @return {Number} Number free
         */
        getFreeCount: function()
        {
            return this.freeList.length;
        },

        /**
         * Returns the next free object by moving it from the free pool to the used one. If no free objects are
         * available it will expand the pool
         * @return {gamecore.Pooled} A pooled object
         */
        acquire:function ()
        {
            // check if we have anymore to give out
            if (this.freeList.length <= 0)
            {
                // create some more space (expand by 20%, minimum 1)
                this.expansion = Math.round(this.expansion*1.2)+1;
                this.expand(this.expansion);
            }

            if (this.tracing)
            {
                var stack = printStackTrace();
                var pos = stack.length - 1;
                while (stack[pos].indexOf('Class.addTo') == 0 && pos > 0)
                    pos--;
                var count = this.traces.get(stack[pos]);
                if (count == null)
                    this.traces.put(stack[pos], { value:1 });
                else
                    count.value++;
            }

            return this.freeList.pop();
        },

        /**
         * Releases an object by moving it back onto the free pool
         * @param {gamecore.Pooled} obj The obj to release back into the pool
         */
        release:function (obj)
        {
            this.freeList.push(obj);
        },

        /**
         * Gets stats about the pool
         * @return {String} Stats
         */
        getStats:function ()
        {
            var s = this.Class.fullName + ' stats: ' + this.freeList.length + ' free.';

            if (this.tracing)
            {
                s += 'TRACING\n';
                var traceKeys = this.traces.keys();
                for (var k in traceKeys)
                    s += traceKeys[k] + ' (' + this.traces.get(traceKeys[k]).value + ')\n';
            }
            return s;
        },

        /**
         * Dumps contents of the pool to through info logging (usually console). Mostly used for debugging the pooling
         * system, mostly.
         * @param {String} msg A string to write before the dump
         */
        dump:function (msg)
        {
            this.info('================== ' + msg + ' ===================');
            this.info('FREE');
            this.freeList.dump();
        },

        /**
         * Returns the number of objects in the pool
         * @return {Number} Total objects
         */
        size:function ()
        {
            return this.freeList.length;
        },

        /**
         * Returns the LinkedList of currently free objects in the pool
         * @return {gamecore.LinkedList} List of free objects
         */
        getFreeList:function ()
        {
            return this.freeList;
        }

    });

/**
 * @class gamecore.DualPool
 * @description
 * Easy (high-performance) object pooling
 *
 * A pool of objects for use in situations where you want to minimize object life cycling (and
 * subsequently garbage collection). It also serves as a very high speed, minimal overhead
 * collection for small numbers of objects.
 * <p>
 * This class maintains mutual set of doubly-linked lists in order to differentiate between
 * objects that are in use and those that are unallocated from the pool. This allows for much
 * faster cycling of only the in-use objects.
 * <p>
 * Pools are managed by class type, and will auto-expand as required. You can create a custom initial pool
 * size by deriving from the Pool class and statically overriding INITIAL_POOL_SIZE.
 * <p>
 * Keep in mind that objects that are pooled are not constructed; they are "reset" when handed out.
 * You need to "acquire" one and then reset its state, usually via a static create factory method.
 * <p>
 * Example:
 * <code>
 * Point = gamecore.Pooled('Point',
 * {
 *   // Static constructor
 *   create:function (x, y)
 *   {
 *      var n = this._super();
 *      n.x = x;
 *      n.y = y;
 *      return n;
 *   }
 * },
 * {
 *    x:0, y:0,   // instance
 *
 *    init: function(x, y)
 *    {
 *       this.x = x;
 *       this.y = y;
 *    }
 * }
 * </code>
 * To then access the object from the pool, use create, instead of new. Then release it.
 * <code>
 * var p = Point.create(100, 100);
 * // ... do something
 * p.release();
 * </code>
 *
 */
gamecore.DualPool = gamecore.Pool.extend('gamecore.DualPool',
    /** @lends gamecore.DualPool */
    {
        /**
         * Acquire an object from a pool based on the class[name]. Typically this method is
         * automatically called from Pooled.create method and should not be used directly.
         * @param {String} classType Class of object to create
         * @return {gamecore.Pooled} A shiny object you can then configure
         */
        acquire:function (classType)
        {
            var pool = this.getPool(classType);
            if (pool == undefined || pool == null)
            {
                pool = new gamecore.DualPool(classType, this.INITIAL_POOL_SIZE);
                this.pools.put(classType.fullName, pool);
            }

            return pool.acquire();
        },

        /**
         * Gets stats on the usage of all pools.
         * @return {String} Stats string
         */
        getStats:function ()
        {
            var s = '';

            var keys = this.pools.keys();
            for (var i = 0; i < keys.length; i++)
            {
                var key = keys[i];
                var pool = this.pools.get(key);
                s += key + ' (free: ' + pool.freeList.length() + ' used: ' + pool.usedList.length() + ')\n';
            }
            return s;
        }
    },
    /** @lends gamecore.DualPool.prototype */
    {
        /** Linked list of currently free objects residing in the pool */
        freeList:null,
        /** Linked list of currently used objects not in the pool */
        usedList:null,

        /**
         * Constructs a pool. Will automatically be called by the static pool method. Generally not called directly.
         * @param {String} classType Class name of the type of objects in the pool
         * @param {Number} initial Starting number of objects in the pool
         */
        init:function (classType, initial)
        {
            this.classType = classType;
            this.usedList = new gamecore.LinkedList();
            this.freeList = new gamecore.LinkedList();

            // instantiate the initial objects for the pool
            this.expand(initial);
        },

        /**
         * Expand the pool of objects by constructing a bunch of new ones. The pool will
         * automatically expand itself by 10% each time it runs out of space, so generally you
         * shouldn't need to use this.
         * @param {Number} howMany Number of new objects you want to add
         */
        expand:function (howMany)
        {
//            this.info('Expanding ' + this.classType.fullName + ' pool from ' + this.size() +
//                ' to ' + (this.size() + howMany) + ' objects');
            gamecore.Pool.totalPooled += howMany;
            for (var i = 0; i < howMany; i++)
                this.freeList.add(new this.classType());
        },

        returnObj:null,

        /**
         * Returns the next free object by moving it from the free pool to the used one.
         * @return {gamecore.DualPooled} A pooled object you can then configure
         */
        acquire:function ()
        {
            // check if we have anymore to give out
            if (this.freeList.first == null)
            // create some more space (expand by 20%, minimum 1)
                this.expand(Math.round(this.size() / 5) + 1);

            this.returnObj = this.freeList.first.obj;
            this.freeList.remove(this.returnObj);
            this.returnObj.destroyed = false;
            this.usedList.add(this.returnObj);

            if (this.tracing)
            {
                var stack = printStackTrace();
                var pos = stack.length - 1;
                while (stack[pos].indexOf('Class.addTo') == 0 && pos > 0)
                    pos--;
                var count = this.traces.get(stack[pos]);
                if (count == null)
                    this.traces.put(stack[pos], { value:1 });
                else
                    count.value++;
            }

            return this.returnObj;
        },

        /**
         * Releases an object by moving it from the used list back to the free list.
         * @param obj {gamecore.DualPooled} The obj to release back into the pool
         */
        release:function (obj)
        {
            this.freeList.add(obj);
            this.usedList.remove(obj);
        },

        /**
         * Dumps stats about usage to the debug info (generally console)
         * @param {String} msg Message to display before the dump
         */
        dump:function (msg)
        {
            this.info('================== ' + msg + ' ===================');
            this.info('FREE');
            this.freeList.dump();
            this.info('USED');
            this.usedList.dump();
        },

        /**
         * Returns the number of objects in both the free and used pool
         */
        size:function ()
        {
            return this.freeList.count + this.usedList.count;
        },

        /**
         * Returns the LinkedList of current used objects
         * @return {gamecore.LinkedList}
         */
        getUsedList:function ()
        {
            return this.usedList;
        }
    });


/**
 * @class gamecore.Pooled
 * @description
 * Used as a base class for objects which are life cycle managed in an object pool.
 */
gamecore.Pooled = gamecore.Base('gamecore.Pooled',
    /** @lends gamecore.Pooled */
    {
        /**
         * Static factory method for creating a new object based on its class. This method
         * should be called using this._super from the Class.create that derives from this.
         * @returns {gamecore.Pooled} An object from the pool
         */
        create:function ()
        {
            return gamecore.Pool.acquire(this);
        },

        /**
         * Get the object pool associated with this object class
         * @return {gamecore.Pool} The object pool
         */
        getPool:function ()
        {
            return gamecore.Pool.getPool(this);
        }

    },
    /** @lends gamecore.Pooled.prototype */
    {
        /** Has the object been destroyed (returned to the pool) */
        destroyed:false,

        /**
         * Constructor for the object (default calls base class init)
         */
        init:function ()
        {
            this._super();
        },

        /**
         * Release the object back into the pool
         */
        release:function ()
        {
            this.onRelease();
            gamecore.Pool.release(this);
        },

        /**
         * Template callback when an object is released; gives you a chance to do your own cleanup / releasing
         */
        onRelease:function ()
        {
        }

    });


/**
 * @class gamecore.DualPooled
 * @description
 * Used as a base class for objects which are life cycle managed in an object pool (the DualPool edition)
 */
gamecore.DualPooled = gamecore.Base('gamecore.DualPooled',
    /** @lends gamecore.DualPool */
    {
        /**
         * Static factory method for creating a new object based on its class. This method
         * should be called using this._super from the Class.create that derives from this.
         * @returns {gamecore.Pooled} An object from the pool
         */
        create:function ()
        {
            return gamecore.DualPool.acquire(this);
        },

        /**
         * Get the object pool associated with this object class
         * @return {gamecore.Pool} The object pool
         */
        getPool:function ()
        {
            return gamecore.DualPool.getPool(this);
        }

    },
    /** @lends gamecore.DualPool.prototype */
    {
        /** Has the object been destroyed (returned to the pool) */
        destroyed:false,

        /**
         * Constructor for the object (default calls base class init)
         */
        init:function ()
        {
            this._super();
        },

        /**
         * Release the object back into the pool
         */
        release:function ()
        {
            this.onRelease();
            gamecore.DualPool.release(this);
        },

        /**
         * Template callback when an object is released; gives you a chance to do your own cleanup / releasing
         */
        onRelease:function ()
        {
        }

    });
