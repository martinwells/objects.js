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

gamecore.Pool = gamecore.Base.extend('gamecore.Pool',

    ///
    /// STATICS
    ///
    {
        INITIAL_POOL_SIZE: 1,

        pools: new gamecore.Hashtable(), // all your pools belong to us
        totalPooled: 0,

        /**
         * Acquire an object from a pool based on the class[name]. Typically this method is
         * automatically called from
         * @param classType Class of object to create
         */
        acquire: function(classType)
        {
            var pool = this.pools.get(classType.fullName);
            if (pool == undefined)
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
         * @param pooledObj Object to return to the pool
         * @throws
         */
        release: function(pooledObj)
        {
            var pool = this.pools.get(pooledObj.Class.fullName);
            if (pool == undefined)
                throw "Oops, trying to release an object of type " + pooledObj.Class.fullName +
                    " but no pool exists";

            pool.release(pooledObj);
        }


    },
    ///
    /// INSTANCE
    ///
    {
        freeList: null,
        usedList: null,
        initialSize:   0, // size of the initial object pool
        classType:  null, // the class of object in this pool

        /**
         * Constructs a pool using a base of objects passed in as an array.
         * @param classType Class name of the type of objects in the pool
         * @param initial Starting number of objects in the pool
         */
        init:function (classType, initial)
        {
            this._super();
            this.classType = classType;
            this.freeList = new gamecore.LinkedList();
            this.usedList = new gamecore.LinkedList();

            // instantiate the initial objects for the pool
            this.initialSize = initial;
            this.expand(initial);
        },

        /**
         * Expand the pool of objects by constructing a bunch of new ones. The pool will
         * automatically expand itself by 10% each time it runs out of space, so generally you
         * shouldn't need to use this.
         * @param howMany Number of new objects you want to add
         */
        expand: function(howMany)
        {
            //this.info('Expanding ' + this.classType.fullName + ' pool from ' + this.size() +
            //    ' to ' + (this.size() + howMany) + ' objects');
            gamecore.Pool.totalPooled += howMany;
            for (var i=0; i < howMany; i++)
                this.freeList.add(new this.classType());
        },

        /**
         * Returns the next free object by moving it from the free pool to the used
         * one. If no free objects are available it returns the oldest from the used
         * pool.
         * access to the object
         */
        returnObj: null,

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
            return this.returnObj;
        },

        /**
         * Releases an object by moving it from the used list back to the free list.
         * @param obj {pc.Base} The obj to release back into the pool
         */
        release:function (obj)
        {
            this.freeList.add(obj);
            this.usedList.remove(obj);
            obj.destroyed = true;
        },

        dump: function(msg)
        {
            this.info('================== ' + msg + ' ===================');
            this.info('FREE');
            this.freeList.dump();
            this.info('USED');
            this.usedList.dump();
        },

        /**
         * Returns the number of objects in the pool
         */
        size: function()
        {
            return this.freeList.count + this.usedList.count;
        }

    });


/**
 * @class gamecore.Pooled
 * Used as a base class for objects which are life cycle managed in an object pool.
 */
gamecore.Pooled = gamecore.Base('gamecore.Pooled',
    ///
    /// STATICS
    ///
    {
        /**
         * Static factory method for creating a new object based on its class. This method
         * should be called using this._super from the Class.create that derives from this.
         * @returns An object from the pool
         */
        create: function ()
        {
            return gamecore.Pool.acquire(this);
        }

    },
    ///
    /// INSTANCE
    ///
    {
        destroyed: false,

        init: function()
        {
            this._super();
        },

        release: function ()
        {
            this.onRelease();
            gamecore.Pool.release(this);
        },

        onRelease: function()
        {
        }

    });
