
/**
 * @class gamecore.HashList
 * @description
 * A map of linked lists mapped by a string value
 */
gamecore.HashList = gamecore.Base.extend('gamecore.HashList',
    {},
    /** @lends gamecore.HashList */
    {
        /** Internal hash table of lists */
        hashtable: null,

        /**
         * Constructs a new hash list
         */
        init: function()
        {
            this.hashtable = new gamecore.Hashtable();
        },

        /**
         * Add an object to a list based on the given key. If the list doesn't yet exist it will be constructed.
         * @param {String} key Key
         * @param {Object} object Object to store
         */
        add: function(key, object)
        {
            // find the list associated with this key and add the object to it
            var list = this.hashtable.get(key);
            if (list == null)
            {
                // no list associated with this key yet, so let's make one
                list = new pc.LinkedList();
                this.hashtable.put(key, list);
            }
            list.add(object);
        },

        /**
         * Removes an object from the list
         * @param {String} key Key for the list to remove the object from
         * @param {Object} object Object to remove
         */
        remove: function(key, object)
        {
            var list = this.hashtable.get(key);
            if (list == null) throw "No list for a key in hashlist when removing";
            list.remove(object);
        },

        /**
         * Get a list associated with a given key
         * @param {String} key The key
         * @return {gamecore.LinkedList} The list
         */
        get: function(key)
        {
            return this.hashtable.get(key);
        }


    });
