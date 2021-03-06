/*!
 * Paper.js v0.9.0 - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2013, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 *
 * Date: Tue May 28 13:54:47 2013 -0700
 *
 ***
 *
 * Straps.js - Inheritance library with support for bean-style accessors and
 * AOP patterns.
 *
 * Copyright (c) 2006 - 2013 Juerg Lehni
 * http://lehni.org/
 *
 * Distributed under the MIT license.
 *
 ***
 *
 * Acorn.js
 * http://marijnhaverbeke.nl/acorn/
 *
 * Acorn is a tiny, fast JavaScript parser written in JavaScript,
 * created by Marijn Haverbeke and released under an MIT license.
 *
 */

var paper = new function() {
// Inline Bootstrap core (the Base class) inside the paper scope first:
/**
 * straps.js - Class inheritance library with support for bean-style accessors
 *
 * Copyright (c) 2006 - 2013 Juerg Lehni
 * http://lehni.org/
 *
 * Distributed under the MIT license.
 *
 * straps.js was created by extracting and simplifying the inheritance framework
 * from boostrap.js, a JavaScript DOM library, also published by Juerg Lehni:
 * https://github.com/lehni/bootstrap.js
 *
 * Inspirations:
 * http://dean.edwards.name/weblog/2006/03/base/
 * http://dev.helma.org/Wiki/JavaScript+Inheritance+Sugar/
 */

var Base = new function() {
	var hidden = /^(statics|generics|preserve|enumerable|prototype|toString|valueOf)$/,
		toString = Object.prototype.toString,
		proto = Array.prototype,
		slice = proto.slice,

		forEach = proto.forEach || function(iter, bind) {
			for (var i = 0, l = this.length; i < l; i++)
				iter.call(bind, this[i], i, this);
		},

		forIn = function(iter, bind) {
			// Do not use Object.keys for iteration as iterators might modify
			// the object we're iterating over, making the hasOwnProperty still
			// necessary.
			for (var i in this)
				if (this.hasOwnProperty(i))
					iter.call(bind, this[i], i, this);
		},

		isArray = Array.isArray = Array.isArray || function(obj) {
			return toString.call(obj) === '[object Array]';
		},

		// A short-cut to a simplified version of Object.create that only
		// supports the first parameter (in the emulation):
		create = Object.create || function(proto) {
			// From all browsers that do not offer Object.create(), we only
			// support Firefox 3.5 & 3.6, and this hack works there:
			return { __proto__: proto };
		},

		describe = Object.getOwnPropertyDescriptor || function(obj, name) {
			// Emulate Object.getOwnPropertyDescriptor for outdated browsers
			var get = obj.__lookupGetter__ && obj.__lookupGetter__(name);
			return get
					? { get: get, set: obj.__lookupSetter__(name),
						enumerable: true, configurable: true }
					: obj.hasOwnProperty(name)
						? { value: obj[name], enumerable: true,
							configurable: true, writable: true }
						: null;
		},

		_define = Object.defineProperty || function(obj, name, desc) {
			// Emulate Object.defineProperty for outdated browsers
			if ((desc.get || desc.set) && obj.__defineGetter__) {
				if (desc.get)
					obj.__defineGetter__(name, desc.get);
				if (desc.set)
					obj.__defineSetter__(name, desc.set);
			} else {
				obj[name] = desc.value;
			}
			return obj;
		},

		define = function(obj, name, desc) {
			// Both Safari and Chrome at one point ignored configurable = true
			// and did not allow overriding of existing properties:
			// https://code.google.com/p/chromium/issues/detail?id=72736
			// https://bugs.webkit.org/show_bug.cgi?id=54289
			// The workaround is to delete the property first.
			// TODO: Remove this fix in July 2014, and use _define directly.
			delete obj[name];
			return _define(obj, name, desc);
		};

	/**
	 * Private function that injects functions from src into dest, overriding
	 * (and inherinting from) base.
	 */
	function inject(dest, src, enumerable, base, preserve, generics) {
		var beans, bean;

		/**
		 * Private function that injects one field with given name and checks if
		 * the field is a function that needs to be wrapped for calls of base().
		 * This is only needed if the function in base is different from the one
		 * in src, and if the one in src is actually calling base through base.
		 * The string of the function is parsed for this.base to detect calls.
		 */
		function field(name, val, dontCheck, generics) {
			// This does even work for prop: 0, as it will just be looked up
			// again through describe.
			var val = val || (val = describe(src, name))
					&& (val.get ? val : val.value);
			// Allow aliases to properties with different names, by having
			// string values starting with '#'
			if (typeof val === 'string' && val[0] === '#')
				val = src[val.substring(1)] || val;
			var isFunc = typeof val === 'function',
				res = val,
				// Only lookup previous value if we preserve or define a
				// function that might need it for this.base(). If we're
				// defining a getter, don't lookup previous value, but look if
				// the property exists (name in dest) and store result in prev
				prev = preserve || isFunc
					? (val && val.get ? name in dest : dest[name]) : null;
			if ((dontCheck || val !== undefined && src.hasOwnProperty(name))
					&& (!preserve || !prev)) {
				// Expose the 'super' function (meaning the one this function is
				// overriding) through #base:
				if (isFunc && prev)
					val.base = prev;
				// Produce bean properties if getters are specified. This does
				// not produce properties for setter-only properties. Just
				// collect beans for now, and look them up in dest at the end of
				// fields injection. This ensures base works for beans too, and
				// inherits setters for redefined getters in subclasses. Only
				// add getter beans if they do not expect arguments. Functions
				// that should function both with optional arguments and as
				// beans should not declare the parameters and use the arguments
				// array internally instead.
				if (isFunc && beans && val.length === 0
						&& (bean = name.match(/^(get|is)(([A-Z])(.*))$/)))
					beans.push([ bean[3].toLowerCase() + bean[4], bean[2] ]);
				// No need to look up getter if this is a function already.
				if (!res || isFunc || !res.get)
					res = { value: res, writable: true };
				// Only set/change configurable and enumerable if this field is
				// configurable
				if ((describe(dest, name)
						|| { configurable: true }).configurable) {
					res.configurable = true;
					res.enumerable = enumerable;
				}
				define(dest, name, res);
			}
			if (generics && isFunc && (!preserve || !generics[name])) {
				generics[name] = function(bind) {
					// Do not call Array.slice generic here, as on Safari,
					// this seems to confuse scopes (calling another
					// generic from generic-producing code).
					return bind && dest[name].apply(bind,
							slice.call(arguments, 1));
				};
			}
		}
		// Iterate through all definitions in src now and call field() for each.
		if (src) {
			beans = [];
			for (var name in src)
				if (src.hasOwnProperty(name) && !hidden.test(name))
					field(name, null, true, generics);
			// IE (and some other browsers?) never enumerate these, even  if
			// they are simply set on an object. Force their creation. Do not
			// create generics for these, and check them for not being defined
			// (by passing undefined for dontCheck).
			field('toString');
			field('valueOf');
			// Now finally define beans as well. Look up methods on dest, for
			// support of this.base() (See above).
			for (var i = 0, l = beans && beans.length; i < l; i++)
				try {
					var bean = beans[i], part = bean[1];
					field(bean[0], {
						get: dest['get' + part] || dest['is' + part],
						set: dest['set' + part]
					}, true);
				} catch (e) {}
		}
		return dest;
	}

	function each(obj, iter, bind, asArray) {
		try {
			if (obj)
				(asArray || typeof asArray === 'undefined' && isArray(obj)
					? forEach : forIn).call(obj, iter, bind = bind || obj);
		} catch (e) {
			if (e !== Base.stop)
				throw e;
		}
		return bind;
	}

	function clone(obj) {
		return each(obj, function(val, i) {
			this[i] = val;
		}, new obj.constructor());
	}

	// Inject into new ctor object that's passed to inject(), and then returned
	// as the Base class.
	return inject(function Base() {}, {
		inject: function(src/*, ... */) {
			if (src) {
				var proto = this.prototype,
					base = Object.getPrototypeOf(proto).constructor,
					// Allow the whole scope to just define statics by defining
					// statics: true.
					statics = src.statics === true ? src : src.statics;
				if (statics != src)
					inject(proto, src, src.enumerable, base && base.prototype,
							src.preserve, src.generics && this);
				// Define new static fields as enumerable, and inherit from
				// base. enumerable is necessary so they can be copied over from
				// base, and it does not harm to have enumerable properties in
				// the constructor. Use the preserve setting in src.preserve for
				// statics too, not their own.
				inject(this, statics, true, base, src.preserve);
			}
			// If there are more than one argument, loop through them and call
			// inject again. Do not simple inline the above code in one loop,
			// since each of the passed objects might override this.inject.
			for (var i = 1, l = arguments.length; i < l; i++)
				this.inject(arguments[i]);
			return this;
		},

		extend: function(src/* , ... */) {
			var base = this,
				ctor;
			// Look for an initialize function in all injection objects and use
			// it directly as the actual constructor.
			for (var i = 0, l = arguments.length; i < l; i++)
				if (ctor = arguments[i].initialize)
					break;
			// If no initialize function is provided, create a constructor that
			// simply calls the base constructor.
			ctor = ctor || function() {
				base.apply(this, arguments);
			};
			ctor.prototype = create(this.prototype);
			// The new prototype extends the constructor on which extend is
			// called. Fix constructor.
			define(ctor.prototype, 'constructor',
					{ value: ctor, writable: true, configurable: true });
			// Copy over static fields, as prototype-like inheritance
			// is not possible for static fields. Mark them as enumerable
			// so they can be copied over again.
			inject(ctor, this, true);
			// Inject all the definitions in src. Use the new inject instead of
			// the one in ctor, in case it was overriden. this is needed when
			// overriding the static .inject(). But only inject if there's
			// something to actually inject.
			return arguments.length ? this.inject.apply(ctor, arguments) : ctor;
		}
		// Pass true for enumerable, so inject() and extend() can be passed on
		// to subclasses of Base through Base.inject() / extend().
	}, true).inject({
		/**
		 * Injects the fields from the given object, adding this.base()
		 * functionality
		 */
		inject: function(/* src, ... */) {
			for (var i = 0, l = arguments.length; i < l; i++)
				inject(this, arguments[i], arguments[i].enumerable);
			return this;
		},

		/**
		 * Returns a new object that inherits all properties from "this",
		 * through proper JS inheritance, not copying.
		 * Optionally, src and hide parameters can be passed to fill in the
		 * newly created object just like in inject(), to copy the behavior
		 * of Function.prototype.extend.
		 */
		extend: function(/* src, ... */) {
			var res = create(this);
			return res.inject.apply(res, arguments);
		},

		each: function(iter, bind) {
			return each(this, iter, bind);
		},

		/**
		 * Creates a new object of the same type and copies over all
		 * name / value pairs from this object.
		 */
		clone: function() {
			return clone(this);
		},

		statics: {
			// Expose some local privates as Base generics.
			each: each,
			clone: clone,
			define: define,
			describe: describe,

			// Base.create does something different from Object.create:
			// It works on constructors and uses their prototype.
			create: function(ctor) {
				return create(ctor.prototype);
			},

			/**
			 * Returns true if obj is a plain JavaScript object literal, or a 
			 * plain Base object, as produced by Base.merge().
			 */
			isPlainObject: function(obj) {
				var ctor = obj != null && obj.constructor;
				// We also need to check for ctor.name === 'Object', in case
				// this is an object from another global scope (e.g. an iframe,
				// or another vm context in node.js).
				return ctor && (ctor === Object || ctor === Base
						|| ctor.name === 'Object');
			},

			check: function(obj) {
				return !!(obj || obj === 0);
			},

			/**
			 * Returns the first argument that is defined. null is counted as
			 * defined too, as !== undefined is used for comparisons.
			 */
			pick: function() {
				for (var i = 0, l = arguments.length; i < l; i++)
					if (arguments[i] !== undefined)
						return arguments[i];
				return null;
			},

			/**
			 * Base.stop can be thrown by iterators passed to each()
			 *
			 * continue (Base.next) is not implemented, as the same can achieved
			 * by using return in the iterator.
			 */
			stop: {}
		}
	});
};




/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2013, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

/**
 * @name Base
 * @class
 * @private
 */
// Extend Base with utility functions used across the library. Also set
// this.Base on the injection scope, since straps.js ommits that.
Base.inject(/** @lends Base# */{
	// Have generics versions of #clone() and #toString():
	generics: true,

	/**
	 * General purpose clone function that delegates cloning to the constructor
	 * that receives the object to be cloned as the first argument.
	 * Note: #clone() needs to be overridden in any class that requires other
	 * cloning behavior.
	 */
	clone: function() {
		return new this.constructor(this);
	},

	/**
	 * Renders base objects to strings in object literal notation.
	 */
	toString: function() {
		return this._id != null
			?  (this.constructor.name || 'Object') + (this._name
				? " '" + this._name + "'"
				: ' @' + this._id)
			: '{ ' + Base.each(this, function(value, key) {
				// Hide internal properties even if they are enumerable
				if (!/^_/.test(key)) {
					var type = typeof value;
					this.push(key + ': ' + (type === 'number'
							? Formatter.instance.number(value)
							: type === 'string' ? "'" + value + "'" : value));
				}
			}, []).join(', ') + ' }';
	},

	/**
	 * Serializes this object to a JSON string.
	 *
	 * @param {Object} [options={ precision: 5 }]
	 */
	exportJSON: function(options) {
		return Base.exportJSON(this, options);
	},

	// To support JSON.stringify:
	toJSON: function() {
		return Base.serialize(this);
	},

	/**
	 * #_set() is part of the mechanism for constructors which take one object
	 * literal describing all the properties to be set on the created instance.
	 * @return {Boolean} {@true if the object is a plain object}
	 */
	_set: function(props) {
		if (props && Base.isPlainObject(props)) {
			for (var key in props)
				if (props.hasOwnProperty(key) && key in this)
					this[key] = props[key];
			return true;
		}
	},

	statics: /** @lends Base */{

		// Keep track of all named classes for serialization and exporting.
		// Also register the Base class itself.
		exports: new Base({ Base: Base }),

		extend: function extend(src) {
			// Override Base.extend() to register named classes in Base.exports,
			// for deserialization and injection into PaperScope.
			var res = extend.base.apply(this, arguments),
				name = res.name;
			if (name)
				Base.exports[name] = res;
			return res;
		},

		/**
		 * Checks if two values or objects are equals to each other, by using
		 * their equals() methods if available, and also comparing elements of
		 * arrays and properties of objects.
		 */ 
		equals: function(obj1, obj2) {
			function checkKeys(o1, o2) {
				for (var i in o1)
					if (o1.hasOwnProperty(i) && typeof o2[i] === 'undefined')
						return false;
				return true;
			}
			if (obj1 == obj2)
				return true;
			// Call #equals() on both obj1 and obj2
			if (obj1 && obj1.equals)
				return obj1.equals(obj2);
			if (obj2 && obj2.equals)
				return obj2.equals(obj1);
			// Compare arrays
			if (Array.isArray(obj1) && Array.isArray(obj2)) {
				if (obj1.length !== obj2.length)
					return false;
				for (var i = 0, l = obj1.length; i < l; i++) {
					if (!Base.equals(obj1[i], obj2[i]))
						return false;
				}
				return true;
			}
			// Compare objects
			if (obj1 && typeof obj1 === 'object'
					&& obj2 && typeof obj2 === 'object') {
				if (!checkKeys(obj1, obj2) || !checkKeys(obj2, obj1))
					return false;
				for (var i in obj1) {
					if (obj1.hasOwnProperty(i) && !Base.equals(obj1[i], obj2[i]))
						return false;
				}
				return true;
			}
			return false;
		},

		/**
		 * When called on a subclass of Base, it reads arguments of the type of
		 * the subclass from the passed arguments list or array, at the given
		 * index, up to the specified length.
		 * When called directly on Base, it reads any value without conversion
		 * from the apssed arguments list or array.
		 * This is used in argument conversion, e.g. by all basic types (Point,
		 * Size, Rectangle) and also higher classes such as Color and Segment.
		 * @param {Array} list the list to read from, either an arguments object
		 *        or a normal array.
		 * @param {Number} start the index at which to start reading in the list
		 * @param {Number} length the amount of elements that can be read
		 * @param {Boolean} clone controls wether passed objects should be
		 *        cloned if they are already provided in the required type
		 */
		read: function(list, start, length, clone, readNull) {
			// See if it's called directly on Base, and if so, read value and
			// return without object conversion.
			if (this === Base) {
				var value = this.peek(list, start);
				list._index++;
				list._read = 1;
				return value;
			}
			var proto = this.prototype,
				readIndex = proto._readIndex,
				index = start || readIndex && list._index || 0;
			if (!length)
				length = list.length - index;
			var obj = list[index];
			if (obj instanceof this || readNull && obj == null && length <= 1) {
				if (readIndex)
					list._index = index + 1;
				return obj && clone ? obj.clone() : obj;
			}
			obj = Base.create(this);
			if (readIndex)
				obj._read = true;
			obj = obj.initialize.apply(obj, index > 0 || length < list.length
				? Array.prototype.slice.call(list, index, index + length)
				: list) || obj;
			if (readIndex) {
				list._index = index + obj._read;
				// Have arguments._read point to the amount of args read in the
				// last read() call
				list._read = obj._read;
				delete obj._read;
			}
			return obj;
		},

		/**
		 * Allows peeking ahead in reading of values and objects from arguments
		 * list through Base.read().
		 * @param {Array} list the list to read from, either an arguments object
		 *        or a normal array.
		 * @param {Number} start the index at which to start reading in the list
		 */
		peek: function(list, start) {
			return list[list._index = start || list._index || 0];
		},

		/**
		 * Reads all readable arguments from the list, handling nested arrays
		 * seperately.
		 * @param {Array} list the list to read from, either an arguments object
		 *        or a normal array.
		 * @param {Number} start the index at which to start reading in the list
		 * @param {Boolean} clone controls wether passed objects should be
		 *        cloned if they are already provided in the required type
		 */
		readAll: function(list, start, clone) {
			var res = [], entry;
			for (var i = start || 0, l = list.length; i < l; i++) {
				res.push(Array.isArray(entry = list[i])
					? this.read(entry, 0, 0, clone) // 0 for length = max
					: this.read(list, i, 1, clone));
			}
			return res;
		},

		/**
		 * Allows using of Base.read() mechanism in combination with reading
		 * named arguments form a passed property object literal. Calling 
		 * Base.readNamed() can read both from such named properties and normal
		 * unnamed arguments through Base.read(). In use for example for the
		 * various Path.Constructors.
		 * @param {Array} list the list to read from, either an arguments object
		 *        or a normal array.
		 * @param {Number} start the index at which to start reading in the list
		 * @param {String} name the property name to read from.
		 */
		readNamed: function(list, name, start, length, clone, readNull) {
			var value = this.getNamed(list, name);
			return this.read(value != null ? [value] : list, start, length,
					clone, readNull);
		},

		/**
		 * @return the named value if the list provides an arguments object,
		 * {@code null} if the named value is {@code null} or {@code undefined},
		 * and {@code undefined} if there is no arguments object. 
		 * If no name is provided, it returns the whole arguments object.
		 */
		getNamed: function(list, name) {
			var arg = list[0];
			if (list._hasObject === undefined)
				list._hasObject = list.length === 1 && Base.isPlainObject(arg);
			if (list._hasObject)
				// Return the whole arguments object if no name is provided.
				return name ? arg[name] : arg;
		},

		/**
		 * Checks if the argument list has a named argument with the given name.
		 * If name is {@code null}, it returns {@code true} if there are any
		 * named arguments.
		 */
		hasNamed: function(list, name) {
			return !!this.getNamed(list, name);
		},

		/**
		 * Serializes the passed object into a format that can be passed to 
		 * JSON.stringify() for JSON serialization.
		 */
		serialize: function(obj, options, compact, dictionary) {
			options = options || {};

			var root = !dictionary,
				res;
			if (root) {
				options.formatter = new Formatter(options.precision);
				// Create a simple dictionary object that handles all the
				// storing and retrieving of dictionary definitions and
				// references, e.g. for symbols and gradients. Items that want
				// to support this need to define globally unique _id attribute. 
				/**
				 * @namespace
				 * @private
				 */
				dictionary = {
					length: 0,
					definitions: {},
					references: {},
					add: function(item, create) {
						// See if we have reference entry with the given id
						// already. If not, call create on the item to allow it
						// to create the definition, then store the reference
						// to it and return it.
						var id = '#' + item._id,
							ref = this.references[id];
						if (!ref) {
							this.length++;
							var res = create.call(item),
								name = item.constructor.name;
							// Also automatically insert class for dictionary
							// entries.
							if (name && res[0] !== name)
								res.unshift(name);
							this.definitions[id] = res;
							ref = this.references[id] = [id];
						}
						return ref;
					}
				};
			}
			if (obj && obj._serialize) {
				res = obj._serialize(options, dictionary);
				// If we don't serialize to compact form (meaning no type
				// identifier), see if _serialize didn't already add the class,
				// e.g. for classes that do not support compact form.
				var name = obj.constructor.name;
				if (name && !compact && !res._compact && res[0] !== name)
					res.unshift(name);
			} else if (Array.isArray(obj)) {
				res = [];
				for (var i = 0, l = obj.length; i < l; i++)
					res[i] = Base.serialize(obj[i], options, compact,
							dictionary);
				// Mark array as compact, so obj._serialize handling above
				// doesn't add the constructor name again.
				if (compact)
					res._compact = true;
			} else if (Base.isPlainObject(obj)) {
				res = {};
				for (var i in obj)
					if (obj.hasOwnProperty(i))
						res[i] = Base.serialize(obj[i], options, compact,
								dictionary);
			} else if (typeof obj === 'number') {
				res = options.formatter.number(obj, options.precision);
			} else {
				res = obj;
			}
			return root && dictionary.length > 0
					? [['dictionary', dictionary.definitions], res]
					: res;
		},

		/**
		 * Deserializes from parsed JSON data. A simple convention is followed:
		 * Array values with a string at the first position are links to
		 * deserializable types through Base.exports, and the values following
		 * in the array are the arguments to their initialize function.
		 * Any other value is passed on unmodified.
		 * The passed data is recoursively traversed and converted, leaves first
		 */
		deserialize: function(obj, data) {
			var res = obj;
			// A data side-car to deserialize that can hold any kind of 'global'
			// data across a deserialization. It's currently just used to hold
			// dictionary definitions.
			data = data || {};
			if (Array.isArray(obj)) {
				// See if it's a serialized type. If so, the rest of the array
				// are the arguments to #initialize(). Either way, we simply
				// deserialize all elements of the array.
				var type = obj[0],
					// Handle stored dictionary specially, since we need to
					// keep is a lookup table to retrieve referenced items from.
					isDictionary = type === 'dictionary';
				if (!isDictionary) {
					// First see if this is perhaps a dictionary reference, and
					// if so return its definition instead.
					if (data.dictionary && obj.length == 1 && /^#/.test(type))
						return data.dictionary[type];
					type = Base.exports[type];
				}
				res = [];
				// Skip first type entry for arguments
				for (var i = type ? 1 : 0, l = obj.length; i < l; i++)
					res.push(Base.deserialize(obj[i], data));
				if (isDictionary) {
					data.dictionary = res[0];
				} else if (type) {
					// Create serialized type and pass collected arguments to
					// #initialize().
					var args = res;
					res = Base.create(type);
					res.initialize.apply(res, args);
				}
			} else if (Base.isPlainObject(obj)) {
				res = {};
				for (var key in obj)
					res[key] = Base.deserialize(obj[key], data);
			}
			return res;
		},

		exportJSON: function(obj, options) {
			return JSON.stringify(Base.serialize(obj, options));
		},

		importJSON: function(json) {
			return Base.deserialize(
					typeof json === 'string' ? JSON.parse(json) : json);
		},

		/**
		 * Utility function for adding and removing items from a list of which
		 * each entry keeps a reference to its index in the list in the private
		 * _index property. Used for PaperScope#projects and Item#children.
		 */
		splice: function(list, items, index, remove) {
			var amount = items && items.length,
				append = index === undefined;
			index = append ? list.length : index;
			if (index > list.length)
				index = list.length;
			// Update _index on the items to be added first.
			for (var i = 0; i < amount; i++)
				items[i]._index = index + i;
			if (append) {
				// Append them all at the end by using push
				list.push.apply(list, items);
				// Nothing removed, and nothing to adjust above
				return [];
			} else {
				// Insert somewhere else and/or remove
				var args = [index, remove];
				if (items)
					args.push.apply(args, items);
				var removed = list.splice.apply(list, args);
				// Delete the indices of the removed items
				for (var i = 0, l = removed.length; i < l; i++)
					delete removed[i]._index;
				// Adjust the indices of the items above.
				for (var i = index + amount, l = list.length; i < l; i++)
					list[i]._index = i;
				return removed;
			}
		},

		/**
		 * Merge all passed hash objects into a newly creted Base object.
		 */
		merge: function() {
			return Base.each(arguments, function(hash) {
				Base.each(hash, function(value, key) {
					this[key] = value;
				}, this);
			}, new Base(), true); // Pass true for asArray, as arguments is none
		},

		/**
		 * Capitalizes the passed string: hello world -> Hello World
		 */
		capitalize: function(str) {
			return str.replace(/\b[a-z]/g, function(match) {
				return match.toUpperCase();
			});
		},

		/**
		 * Camelizes the passed hyphenated string: caps-lock -> capsLock
		 */
		camelize: function(str) {
			return str.replace(/-(.)/g, function(all, chr) {
				return chr.toUpperCase();
			});
		},

		/**
		 * Converst camelized strings to hyphenated ones: CapsLock -> caps-lock
		 */
		hyphenate: function(str) {
			return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
		}
	}
});

/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2013, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

/**
 * @name Callback
 * @namespace
 * @private
 */
var Callback = {
	attach: function(type, func) {
		// If an object literal is passed, attach all callbacks defined in it
		if (typeof type !== 'string') {
			Base.each(type, function(value, key) {
				this.attach(key, value);
			}, this);
			return;
		}
		var entry = this._eventTypes[type];
		if (entry) {
			var handlers = this._handlers = this._handlers || {};
			handlers = handlers[type] = handlers[type] || [];
			if (handlers.indexOf(func) == -1) { // Not added yet, add it now
				handlers.push(func);
				// See if this is the first handler that we're attaching, and 
				// call install if defined.
				if (entry.install && handlers.length == 1)
					entry.install.call(this, type);
			}
		}
	},

	detach: function(type, func) {
		// If an object literal is passed, detach all callbacks defined in it
		if (typeof type !== 'string') {
			Base.each(type, function(value, key) {
				this.detach(key, value);
			}, this);
			return;
		}
		var entry = this._eventTypes[type],
			handlers = this._handlers && this._handlers[type],
			index;
		if (entry && handlers) {
			// See if this is the last handler that we're detaching (or if we
			// are detaching all handlers), and call uninstall if defined.
			if (!func || (index = handlers.indexOf(func)) != -1
					&& handlers.length == 1) {
				if (entry.uninstall)
					entry.uninstall.call(this, type);
				delete this._handlers[type];
			} else if (index != -1) {
				// Just remove this one handler
				handlers.splice(index, 1);
			}
		}
	},

	once: function(type, func) {
		this.attach(type, function() {
			func.apply(this, arguments);
			this.detach(type, func);
		});
	},

	fire: function(type, event) {
		// Returns true if fired, false otherwise
		var handlers = this._handlers && this._handlers[type];
		if (!handlers)
			return false;
		var args = [].slice.call(arguments, 1);
		Base.each(handlers, function(func) {
			// When the handler function returns false, prevent the default
			// behaviour of the event by calling stop() on it
			if (func.apply(this, args) === false && event && event.stop)
				event.stop();
		}, this);
		return true;
	},

	responds: function(type) {
		return !!(this._handlers && this._handlers[type]);
	},

	// Install jQuery-style aliases to our event handler methods
	on: '#attach',
	off: '#detach',
	trigger: '#fire',

	statics: {
		// Override inject() so that sub-classes automatically add the accessors
		// for the event handler functions (e.g. #onMouseDown) for each property
		inject: function inject(/* src, ... */) {
			for (var i = 0, l = arguments.length; i < l; i++) {
				var src = arguments[i],
					events = src._events;
				if (events) {
					// events can either be an object literal or an array of
					// strings describing the on*-names.
					// We need to map lowercased event types to the event
					// entries represented by these on*-names in _events.
					var types = {};
					Base.each(events, function(entry, key) {
						var isString = typeof entry === 'string',
							name = isString ? entry : key,
							part = Base.capitalize(name),
							type = name.substring(2).toLowerCase();
						// Map the event type name to the event entry.
						types[type] = isString ? {} : entry;
						// Create getters and setters for the property
						// with the on*-name name:
						name = '_' + name;
						src['get' + part] = function() {
							return this[name];
						};
						src['set' + part] = function(func) {
							if (func) {
								this.attach(type, func);
							} else if (this[name]) {
								this.detach(type, this[name]);
							}
							this[name] = func;
						};
					});
					src._eventTypes = types;
				}
				inject.base.call(this, src);
			}
			return this;
		}
	}
};

/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2013, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

/**
 * @name PaperScope
 *
 * @class The {@code PaperScope} class represents the scope associated with a
 * Paper context. When working with PaperScript, these scopes are automatically
 * created for us, and through clever scoping the properties and methods of the
 * active scope seem to become part of the global scope.
 *
 * When working with normal JavaScript code, {@code PaperScope} objects need to
 * be manually created and handled.
 *
 * Paper classes can only be accessed through {@code PaperScope} objects. Thus
 * in PaperScript they are global, while in JavaScript, they are available on
 * the global {@link paper} object. For JavaScript you can use
 * {@link PaperScope#install(scope) } to install the Paper classes and objects
 * on the global scope. Note that when working with more than one scope, this
 * still works for classes, but not for objects like {@link PaperScope#project},
 * since they are not updated in the injected scope if scopes are switched.
 *
 * The global {@link paper} object is simply a reference to the currently active
 * {@code PaperScope}.
 */
var PaperScope = Base.extend(/** @lends PaperScope# */{

	/**
	 * Creates a PaperScope object.
	 *
	 * @name PaperScope#initialize
	 * @function
	 */
	initialize: function PaperScope(script) {
		// script is only used internally, when creating scopes for PaperScript.
		// Whenever a PaperScope is created, it automatically becomes the active
		// one.
		paper = this;
		this.project = null;
		this.projects = [];
		this.tools = [];
		this.palettes = [];
		// Assign an id to this canvas that's either extracted from the script
		// or automatically generated.
		this._id = script && (script.getAttribute('id') || script.src)
				|| ('paperscope-' + (PaperScope._id++));
		// Make sure the script tag also has this id now. If it already had an
		// id, we're not changing it, since it's the first option we're
		// trying to get an id from above.
		if (script)
			script.setAttribute('id', this._id);
		PaperScope._scopes[this._id] = this;
		if (!this.support) {
			// Set up paper.support, as an object containing properties that
			// describe the support of various features.
			var ctx = CanvasProvider.getContext(1, 1);
			PaperScope.prototype.support = {
				nativeDash: 'setLineDash' in ctx || 'mozDash' in ctx
			};
			CanvasProvider.release(ctx);
		}
	},

	/**
	 * The version of Paper.js, as a string.
	 *
	 * @type String
	 */
	version: '0.9.0',

	/**
	 * The currently active project.
	 * @name PaperScope#project
	 * @type Project
	 */

	/**
	 * The list of all open projects within the current Paper.js context.
	 * @name PaperScope#projects
	 * @type Project[]
	 */

	/**
	 * The reference to the active project's view.
	 * @type View
	 * @bean
	 */
	getView: function() {
		return this.project && this.project.view;
	},

	/**
	 * The reference to the active tool.
	 * @type Tool
	 * @bean
	 */
	getTool: function() {
		// If no tool exists yet but one is requested, produce it now on the fly
		// so it can be used in PaperScript.
		if (!this._tool)
			this._tool = new Tool();
		return this._tool;
	},

	/**
	 * The list of available tools.
	 * @name PaperScope#tools
	 * @type Tool[]
	 */

	evaluate: function(code) {
		var res = PaperScript.evaluate(code, this);
		View.updateFocus();
		return res;
	},

	/**
	 * Injects the paper scope into any other given scope. Can be used for
	 * examle to inject the currently active PaperScope into the window's global
	 * scope, to emulate PaperScript-style globally accessible Paper classes and
	 * objects:
	 *
	 * @example
	 * paper.install(window);
	 */
	install: function(scope) {
		// Define project, view and tool as getters that redirect to these
		// values on the PaperScope, so they are kept up to date
		var that = this;
		Base.each(['project', 'view', 'tool'], function(key) {
			Base.define(scope, key, {
				configurable: true,
				get: function() {
					return that[key];
				}
			});
		});
		// Copy over all fields from this scope to the destination.
		// Do not use Base.each, since we also want to enumerate over
		// fields on PaperScope.prototype, e.g. all classes
		for (var key in this) {
			if (!/^(version|_id)/.test(key) && !(key in scope))
				scope[key] = this[key];
		}
	},

	/**
	 * Sets up an empty project for us. If a canvas is provided, it also creates
	 * a {@link View} for it, both linked to this scope.
	 *
	 * @param {HTMLCanvasElement} canvas The canvas this scope should be
	 * associated with.
	 */
	setup: function(canvas) {
		// Create an empty project for the scope.
		// Make sure this is the active scope, so the created project and view
		// are automatically associated with it.
		paper = this;
		this.project = new Project(canvas);
		// This is needed in PaperScript.load().
		return this;
	},

	clear: function() {
		// Remove all projects, views and tools.
		// This also removes the installed event handlers.
		for (var i = this.projects.length - 1; i >= 0; i--)
			this.projects[i].remove();
		for (var i = this.tools.length - 1; i >= 0; i--)
			this.tools[i].remove();
		for (var i = this.palettes.length - 1; i >= 0; i--)
			this.palettes[i].remove();
	},

	remove: function() {
		this.clear();
		delete PaperScope._scopes[this._id];
	},

	statics: /** @lends PaperScope */{
		_scopes: {},
		_id: 0,

		/**
		 * Retrieves a PaperScope object with the given id or associated with
		 * the passed canvas element.
		 *
		 * @param id
		 */
		get: function(id) {
			// If a script tag is passed, get the id from it.
			if (typeof id === 'object')
				id = id.getAttribute('id');
			return this._scopes[id] || null;
		}
	}
});

/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2013, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

/**
 * @name PaperScopeItem
 *
 * @class A private base class for all classes that have lists and references in
 * the {@link PaperScope} ({@link Project}, {@link View}, {@link Tool}), so
 * functionality can be shared.
 *
 * @private
 */
var PaperScopeItem = Base.extend(Callback, /** @lends PaperScopeItem# */{

	/**
	 * Creates a PaperScopeItem object.
	 */  
	initialize: function(activate) {
		// Store reference to the currently active global paper scope:
		this._scope = paper;
		// Push it onto this._scope.projects and set index:
		this._index = this._scope[this._list].push(this) - 1;
		// If the project has no active reference, activate this one
		if (activate || !this._scope[this._reference])
			this.activate();
	},

	activate: function() {
		if (!this._scope)
			return false;
		var prev = this._scope[this._reference];
		if (prev && prev != this)
			prev.fire('deactivate');
		this._scope[this._reference] = this;
		this.fire('activate', prev);
		return true;
	},

	isActive: function() {
		return this._scope[this._reference] === this;
	},

	remove: function() {
		if (this._index == null)
			return false;
		Base.splice(this._scope[this._list], null, this._index, 1);
		// Clear the active tool reference if it was pointint to this.
		if (this._scope[this._reference] == this)
			this._scope[this._reference] = null;
		this._scope = null;
		return true;
	}
});


/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2013, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

/**
 * @name Formatter
 * @private
 */
var Formatter = Base.extend({
	/**
	 * @param {Number} [precision=5] the amount of fractional digits.
	 */
	initialize: function(precision) {
		this.precision = precision || 5;
		this.multiplier = Math.pow(10, this.precision);
	},

	/**
	 * Utility function for rendering numbers as strings at a precision of
	 * up to the amount of fractional digits.
	 *
	 * @param {Number} num the number to be converted to a string
	 */
	number: function(val) {
		// It would be nice to use Number#toFixed() instead, but it pads with 0,
		// unecessarily consuming space.
		return Math.round(val * this.multiplier) / this.multiplier;
	},

	point: function(val, separator) {
		return this.number(val.x) + (separator || ',') + this.number(val.y);
	},

	size: function(val, separator) {
		return this.number(val.width) + (separator || ',')
				+ this.number(val.height);
	},

	rectangle: function(val, separator) {
		return this.point(val, separator) + (separator || ',')
				+ this.size(val, separator);
	}
});

Formatter.instance = new Formatter(5);
/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2013, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

var Numerical = new function() {

	// Lookup tables for abscissas and weights with values for n = 2 .. 16.
	// As values are symetric, only store half of them and addapt algorithm
	// to factor in symetry.
	var abscissas = [
		[  0.5773502691896257645091488],
		[0,0.7745966692414833770358531],
		[  0.3399810435848562648026658,0.8611363115940525752239465],
		[0,0.5384693101056830910363144,0.9061798459386639927976269],
		[  0.2386191860831969086305017,0.6612093864662645136613996,0.9324695142031520278123016],
		[0,0.4058451513773971669066064,0.7415311855993944398638648,0.9491079123427585245261897],
		[  0.1834346424956498049394761,0.5255324099163289858177390,0.7966664774136267395915539,0.9602898564975362316835609],
		[0,0.3242534234038089290385380,0.6133714327005903973087020,0.8360311073266357942994298,0.9681602395076260898355762],
		[  0.1488743389816312108848260,0.4333953941292471907992659,0.6794095682990244062343274,0.8650633666889845107320967,0.9739065285171717200779640],
		[0,0.2695431559523449723315320,0.5190961292068118159257257,0.7301520055740493240934163,0.8870625997680952990751578,0.9782286581460569928039380],
		[  0.1252334085114689154724414,0.3678314989981801937526915,0.5873179542866174472967024,0.7699026741943046870368938,0.9041172563704748566784659,0.9815606342467192506905491],
		[0,0.2304583159551347940655281,0.4484927510364468528779129,0.6423493394403402206439846,0.8015780907333099127942065,0.9175983992229779652065478,0.9841830547185881494728294],
		[  0.1080549487073436620662447,0.3191123689278897604356718,0.5152486363581540919652907,0.6872929048116854701480198,0.8272013150697649931897947,0.9284348836635735173363911,0.9862838086968123388415973],
		[0,0.2011940939974345223006283,0.3941513470775633698972074,0.5709721726085388475372267,0.7244177313601700474161861,0.8482065834104272162006483,0.9372733924007059043077589,0.9879925180204854284895657],
		[  0.0950125098376374401853193,0.2816035507792589132304605,0.4580167776572273863424194,0.6178762444026437484466718,0.7554044083550030338951012,0.8656312023878317438804679,0.9445750230732325760779884,0.9894009349916499325961542]
	];

	var weights = [
		[1],
		[0.8888888888888888888888889,0.5555555555555555555555556],
		[0.6521451548625461426269361,0.3478548451374538573730639],
		[0.5688888888888888888888889,0.4786286704993664680412915,0.2369268850561890875142640],
		[0.4679139345726910473898703,0.3607615730481386075698335,0.1713244923791703450402961],
		[0.4179591836734693877551020,0.3818300505051189449503698,0.2797053914892766679014678,0.1294849661688696932706114],
		[0.3626837833783619829651504,0.3137066458778872873379622,0.2223810344533744705443560,0.1012285362903762591525314],
		[0.3302393550012597631645251,0.3123470770400028400686304,0.2606106964029354623187429,0.1806481606948574040584720,0.0812743883615744119718922],
		[0.2955242247147528701738930,0.2692667193099963550912269,0.2190863625159820439955349,0.1494513491505805931457763,0.0666713443086881375935688],
		[0.2729250867779006307144835,0.2628045445102466621806889,0.2331937645919904799185237,0.1862902109277342514260976,0.1255803694649046246346943,0.0556685671161736664827537],
		[0.2491470458134027850005624,0.2334925365383548087608499,0.2031674267230659217490645,0.1600783285433462263346525,0.1069393259953184309602547,0.0471753363865118271946160],
		[0.2325515532308739101945895,0.2262831802628972384120902,0.2078160475368885023125232,0.1781459807619457382800467,0.1388735102197872384636018,0.0921214998377284479144218,0.0404840047653158795200216],
		[0.2152638534631577901958764,0.2051984637212956039659241,0.1855383974779378137417166,0.1572031671581935345696019,0.1215185706879031846894148,0.0801580871597602098056333,0.0351194603317518630318329],
		[0.2025782419255612728806202,0.1984314853271115764561183,0.1861610000155622110268006,0.1662692058169939335532009,0.1395706779261543144478048,0.1071592204671719350118695,0.0703660474881081247092674,0.0307532419961172683546284],
		[0.1894506104550684962853967,0.1826034150449235888667637,0.1691565193950025381893121,0.1495959888165767320815017,0.1246289712555338720524763,0.0951585116824927848099251,0.0622535239386478928628438,0.0271524594117540948517806]
	];

	// Math short-cuts for often used methods and values
	var abs = Math.abs,
		sqrt = Math.sqrt,
		pow = Math.pow,
		cos = Math.cos,
		PI = Math.PI;

	return {
		TOLERANCE: 10e-6,
		// Precision when comparing against 0
		// TODO: Find a good value
		EPSILON: 10e-12,
		// Kappa, see: http://www.whizkidtech.redprince.net/bezier/circle/kappa/
		KAPPA: 4 * (sqrt(2) - 1) / 3,

		/**
		 * Check if the value is 0, within a tolerance defined by
		 * Numerical.EPSILON.
		 */
		isZero: function(val) {
			return abs(val) <= this.EPSILON;
		},

		/**
		 * Gauss-Legendre Numerical Integration.
		 */
		integrate: function(f, a, b, n) {
			var x = abscissas[n - 2],
				w = weights[n - 2],
				A = 0.5 * (b - a),
				B = A + a,
				i = 0,
				m = (n + 1) >> 1,
				sum = n & 1 ? w[i++] * f(B) : 0; // Handle odd n
			while (i < m) {
				var Ax = A * x[i];
				sum += w[i++] * (f(B + Ax) + f(B - Ax));
			}
			return A * sum;
		},

		/**
		 * Root finding using Newton-Raphson Method combined with Bisection.
		 */
		findRoot: function(f, df, x, a, b, n, tolerance) {
			for (var i = 0; i < n; i++) {
				var fx = f(x),
					dx = fx / df(x);
				// See if we can trust the Newton-Raphson result. If not we use
				// bisection to find another candiate for Newton's method.
				if (abs(dx) < tolerance)
					return x;
				// Generate a candidate for Newton's method.
				var nx = x - dx;
				// Update the root-bounding interval and test for containment of
				// the candidate. If candidate is outside the root-bounding
				// interval, use bisection instead.
				// There is no need to compare to lower / upper because the
				// tangent line has positive slope, guaranteeing that the x-axis
				// intercept is larger than lower / smaller than upper.
				if (fx > 0) {
					b = x;
					x = nx <= a ? 0.5 * (a + b) : nx;
				} else {
					a = x;
					x = nx >= b ? 0.5 * (a + b) : nx;
				}
			}
		},

		/**
		 * Solves the quadratic polynomial with coefficients a, b, c for roots
		 * (zero crossings) and and returns the solutions in an array.
		 *
		 * a*x^2 + b*x + c = 0
		 */
		solveQuadratic: function(a, b, c, roots) {
			// Code ported over and adapted from Uintah library (MIT license).
			var epsilon = this.EPSILON;
			// If a is 0, equation is actually linear, return 0 or 1 easy roots.
			if (abs(a) < epsilon) {
				if (abs(b) >= epsilon) {
					roots[0] = -c / b;
					return 1;
				}
				// If all the coefficients are 0, we have infinite solutions!
				return abs(c) < epsilon ? -1 : 0; // Infinite or 0 solutions
			}
			var q = b * b - 4 * a * c;
			if (q < 0)
				return 0; // 0 solutions
			q = sqrt(q);
			a *= 2; // Prepare division by (2 * a)
			var n = 0;
			roots[n++] = (-b - q) / a;
			if (q > 0)
				roots[n++] = (-b + q) / a;
			return n; // 1 or 2 solutions
		},

		/**
		 * Solves the cubic polynomial with coefficients a, b, c, d for roots
		 * (zero crossings) and and returns the solutions in an array.
		 *
		 * a*x^3 + b*x^2 + c*x + d = 0
		 */
		solveCubic: function(a, b, c, d, roots) {
			// Code ported over and adapted from Uintah library (MIT license).
			var epsilon = this.EPSILON;
			// If a is 0, equation is actually quadratic.
			if (abs(a) < epsilon)
				return Numerical.solveQuadratic(b, c, d, roots);
			// Normalize to form: x^3 + b x^2 + c x + d = 0:
			b /= a;
			c /= a;
			d /= a;
			// Compute discriminants
			var bb = b * b,
				p = (bb - 3 * c) / 9,
				q = (2 * bb * b - 9 * b * c + 27 * d) / 54,
				// Use Cardano's formula
				ppp = p * p * p,
				D = q * q - ppp;
			// Substitute x = y - b/3 to eliminate quadric term: x^3 +px + q = 0
			b /= 3;
			if (abs(D) < epsilon) {
				if (abs(q) < epsilon) { // One triple solution.
					roots[0] = - b;
					return 1;
				} 
				// One single and one double solution.
				var sqp = sqrt(p),
					snq = q > 0 ? 1 : -1;
				roots[0] = -snq * 2 * sqp - b;
				roots[1] = snq * sqp - b;
				return 2;
			}
			if (D < 0) { // Casus irreducibilis: three real solutions
				var sqp = sqrt(p),
					phi = Math.acos(q / (sqp * sqp * sqp)) / 3,
					t = -2 * sqp,
					o = 2 * PI / 3;
				roots[0] = t * cos(phi) - b;
				roots[1] = t * cos(phi + o) - b;
				roots[2] = t * cos(phi - o) - b;
				return 3;
			}
			// One real solution
			var A = (q > 0 ? -1 : 1) * pow(abs(q) + sqrt(D), 1 / 3);
			roots[0] = A + p / A - b;
			return 1;
		}
	};
};


// Include Paper classes, which are later injected into PaperScope by setting
// them on the 'this' object, e.g.:
// var Point = Base.extend(...);

/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2013, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

/**
 * @name Point
 *
 * @class The Point object represents a point in the two dimensional space
 * of the Paper.js project. It is also used to represent two dimensional
 * vector objects.
 *
 * @classexample
 * // Create a point at x: 10, y: 5
 * var point = new Point(10, 5);
 * console.log(point.x); // 10
 * console.log(point.y); // 5
 */
var Point = Base.extend(/** @lends Point# */{
	// Tell Base.read that the Point constructor supports reading with index
	_readIndex: true,

	/**
	 * Creates a Point object with the given x and y coordinates.
	 *
	 * @name Point#initialize
	 * @param {Number} x the x coordinate
	 * @param {Number} y the y coordinate
	 *
	 * @example
	 * // Create a point at x: 10, y: 5
	 * var point = new Point(10, 5);
	 * console.log(point.x); // 10
	 * console.log(point.y); // 5
	 */
	/**
	 * Creates a Point object using the numbers in the given array as
	 * coordinates.
	 *
	 * @name Point#initialize
	 * @param {array} array
	 *
	 * @example
	 * // Creating a point at x: 10, y: 5 using an array of numbers:
	 * var array = [10, 5];
	 * var point = new Point(array);
	 * console.log(point.x); // 10
	 * console.log(point.y); // 5
	 *
	 * @example
	 * // Passing an array to a functionality that expects a point:
	 *
	 * // Create a circle shaped path at x: 50, y: 50
	 * // with a radius of 30:
	 * var path = new Path.Circle([50, 50], 30);
	 * path.fillColor = 'red';
	 *
	 * // Which is the same as doing:
	 * var path = new Path.Circle(new Point(50, 50), 30);
	 * path.fillColor = 'red';
	 */
	/**
	 * Creates a Point object using the properties in the given object.
	 *
	 * @name Point#initialize
	 * @param {object} object
	 *
	 * @example
	 * // Creating a point using an object literal with length and angle
	 * // properties:
	 *
	 * var point = new Point({
	 * 	length: 10,
	 * 	angle: 90
	 * });
	 * console.log(point.length); // 10
	 * console.log(point.angle); // 90
	 *
	 * @example
	 * // Creating a point at x: 10, y: 20 using an object literal:
	 *
	 * var point = new Point({
	 * 	x: 10,
	 * 	y: 20
	 * });
	 * console.log(point.x); // 10
	 * console.log(point.y); // 20
	 *
	 * @example
	 * // Passing an object to a functionality that expects a point:
	 *
	 * var center = {
	 * 	x: 50,
	 * 	y: 50
	 * };
	 *
	 * // Creates a circle shaped path at x: 50, y: 50
	 * // with a radius of 30:
	 * var path = new Path.Circle(center, 30);
	 * path.fillColor = 'red';
	 */
	/**
	 * Creates a Point object using the width and height values of the given
	 * Size object.
	 *
	 * @name Point#initialize
	 * @param {Size} size
	 *
	 * @example
	 * // Creating a point using a size object.
	 *
	 * // Create a Size with a width of 100pt and a height of 50pt
	 * var size = new Size(100, 50);
	 * console.log(size); // { width: 100, height: 50 }
	 * var point = new Point(size);
	 * console.log(point); // { x: 100, y: 50 }
	 */
	/**
	 * Creates a Point object using the coordinates of the given Point object.
	 *
	 * @param {Point} point
	 * @name Point#initialize
	 */
	initialize: function Point(arg0, arg1) {
		var type = typeof arg0;
		if (type === 'number') {
			var hasY = typeof arg1 === 'number';
			this.x = arg0;
			this.y = hasY ? arg1 : arg0;
			if (this._read)
				this._read = hasY ? 2 : 1;
		} else if (type === 'undefined' || arg0 === null) {
			this.x = this.y = 0;
			if (this._read)
				this._read = arg0 === null ? 1 : 0;
		} else {
			if (Array.isArray(arg0)) {
				this.x = arg0[0];
				this.y = arg0.length > 1 ? arg0[1] : arg0[0];
			} else if (arg0.x != null) {
				this.x = arg0.x;
				this.y = arg0.y;
			} else if (arg0.width != null) {
				this.x = arg0.width;
				this.y = arg0.height;
			} else if (arg0.angle != null) {
				this.x = arg0.length;
				this.y = 0;
				this.setAngle(arg0.angle);
			} else {
				this.x = this.y = 0;
				if (this._read)
					this._read = 0;
			}
			if (this._read)
				this._read = 1;
		}
	},

	/**
	 * The x coordinate of the point
	 *
	 * @name Point#x
	 * @type Number
	 */

	/**
	 * The y coordinate of the point
	 *
	 * @name Point#y
	 * @type Number
	 */

	set: function(x, y) {
		this.x = x;
		this.y = y;
		return this;
	},

	/**
	 * Checks whether the coordinates of the point are equal to that of the
	 * supplied point.
	 *
	 * @param {Point} point
	 * @return {Boolean} {@true if the points are equal}
	 *
	 * @example
	 * var point = new Point(5, 10);
	 * console.log(point == new Point(5, 10)); // true
	 * console.log(point == new Point(1, 1)); // false
	 * console.log(point != new Point(1, 1)); // true
	 */
	equals: function(point) {
		point = Point.read(arguments);
		return this.x == point.x && this.y == point.y;
	},

	/**
	 * Returns a copy of the point.
	 *
	 * @example
	 * var point1 = new Point();
	 * var point2 = point1;
	 * point2.x = 1; // also changes point1.x
	 *
	 * var point2 = point1.clone();
	 * point2.x = 1; // doesn't change point1.x
	 *
	 * @returns {Point} the cloned point
	 */
	clone: function() {
		return new Point(this.x, this.y);
	},

	/**
	 * @return {String} A string representation of the point.
	 */
	toString: function() {
		var f = Formatter.instance;
		return '{ x: ' + f.number(this.x) + ', y: ' + f.number(this.y) + ' }';
	},

	_serialize: function(options) {
		var f = options.formatter;
		// For speed reasons, we directly call formatter.number() here, instead
		// of converting array through Base.serialize() which makes a copy.
		return [f.number(this.x),
				f.number(this.y)];
	},

	/**
	 * Returns the addition of the supplied value to both coordinates of
	 * the point as a new point.
	 * The object itself is not modified!
	 *
	 * @name Point#add
	 * @function
	 * @param {Number} number the number to add
	 * @return {Point} the addition of the point and the value as a new point
	 *
	 * @example
	 * var point = new Point(5, 10);
	 * var result = point + 20;
	 * console.log(result); // {x: 25, y: 30}
	 */
	/**
	 * Returns the addition of the supplied point to the point as a new
	 * point.
	 * The object itself is not modified!
	 *
	 * @name Point#add
	 * @function
	 * @param {Point} point the point to add
	 * @return {Point} the addition of the two points as a new point
	 *
	 * @example
	 * var point1 = new Point(5, 10);
	 * var point2 = new Point(10, 20);
	 * var result = point1 + point2;
	 * console.log(result); // {x: 15, y: 30}
	 */
	add: function(point) {
		point = Point.read(arguments);
		return new Point(this.x + point.x, this.y + point.y);
	},

	/**
	 * Returns the subtraction of the supplied value to both coordinates of
	 * the point as a new point.
	 * The object itself is not modified!
	 *
	 * @name Point#subtract
	 * @function
	 * @param {Number} number the number to subtract
	 * @return {Point} the subtraction of the point and the value as a new point
	 *
	 * @example
	 * var point = new Point(10, 20);
	 * var result = point - 5;
	 * console.log(result); // {x: 5, y: 15}
	 */
	/**
	 * Returns the subtraction of the supplied point to the point as a new
	 * point.
	 * The object itself is not modified!
	 *
	 * @name Point#subtract
	 * @function
	 * @param {Point} point the point to subtract
	 * @return {Point} the subtraction of the two points as a new point
	 *
	 * @example
	 * var firstPoint = new Point(10, 20);
	 * var secondPoint = new Point(5, 5);
	 * var result = firstPoint - secondPoint;
	 * console.log(result); // {x: 5, y: 15}
	 */
	subtract: function(point) {
		point = Point.read(arguments);
		return new Point(this.x - point.x, this.y - point.y);
	},

	/**
	 * Returns the multiplication of the supplied value to both coordinates of
	 * the point as a new point.
	 * The object itself is not modified!
	 *
	 * @name Point#multiply
	 * @function
	 * @param {Number} number the number to multiply by
	 * @return {Point} the multiplication of the point and the value as a new point
	 *
	 * @example
	 * var point = new Point(10, 20);
	 * var result = point * 2;
	 * console.log(result); // {x: 20, y: 40}
	 */
	/**
	 * Returns the multiplication of the supplied point to the point as a new
	 * point.
	 * The object itself is not modified!
	 *
	 * @name Point#multiply
	 * @function
	 * @param {Point} point the point to multiply by
	 * @return {Point} the multiplication of the two points as a new point
	 *
	 * @example
	 * var firstPoint = new Point(5, 10);
	 * var secondPoint = new Point(4, 2);
	 * var result = firstPoint * secondPoint;
	 * console.log(result); // {x: 20, y: 20}
	 */
	multiply: function(point) {
		point = Point.read(arguments);
		return new Point(this.x * point.x, this.y * point.y);
	},

	/**
	 * Returns the division of the supplied value to both coordinates of
	 * the point as a new point.
	 * The object itself is not modified!
	 *
	 * @name Point#divide
	 * @function
	 * @param {Number} number the number to divide by
	 * @return {Point} the division of the point and the value as a new point
	 *
	 * @example
	 * var point = new Point(10, 20);
	 * var result = point / 2;
	 * console.log(result); // {x: 5, y: 10}
	 */
	/**
	 * Returns the division of the supplied point to the point as a new
	 * point.
	 * The object itself is not modified!
	 *
	 * @name Point#divide
	 * @function
	 * @param {Point} point the point to divide by
	 * @return {Point} the division of the two points as a new point
	 *
	 * @example
	 * var firstPoint = new Point(8, 10);
	 * var secondPoint = new Point(2, 5);
	 * var result = firstPoint / secondPoint;
	 * console.log(result); // {x: 4, y: 2}
	 */
	divide: function(point) {
		point = Point.read(arguments);
		return new Point(this.x / point.x, this.y / point.y);
	},

	/**
	 * The modulo operator returns the integer remainders of dividing the point
	 * by the supplied value as a new point.
	 *
	 * @name Point#modulo
	 * @function
	 * @param {Number} value
	 * @return {Point} the integer remainders of dividing the point by the value
	 *                 as a new point
	 *
	 * @example
	 * var point = new Point(12, 6);
	 * console.log(point % 5); // {x: 2, y: 1}
	 */
	/**
	 * The modulo operator returns the integer remainders of dividing the point
	 * by the supplied value as a new point.
	 *
	 * @name Point#modulo
	 * @function
	 * @param {Point} point
	 * @return {Point} the integer remainders of dividing the points by each
	 *                 other as a new point
	 *
	 * @example
	 * var point = new Point(12, 6);
	 * console.log(point % new Point(5, 2)); // {x: 2, y: 0}
	 */
	modulo: function(point) {
		point = Point.read(arguments);
		return new Point(this.x % point.x, this.y % point.y);
	},

	negate: function() {
		return new Point(-this.x, -this.y);
	},

	/**
	 * Transforms the point by the matrix as a new point. The object itself
	 * is not modified!
	 *
	 * @param {Matrix} matrix
	 * @return {Point} The transformed point
	 */
	transform: function(matrix) {
		return matrix ? matrix._transformPoint(this) : this;
	},

	/**
	 * {@grouptitle Distance & Length}
	 *
	 * Returns the distance between the point and another point.
	 *
	 * @param {Point} point
	 * @param {Boolean} [squared=false] Controls whether the distance should
	 *        remain squared, or its square root should be calculated.
	 * @return {Number}
	 */
	getDistance: function(point, squared) {
		point = Point.read(arguments);
		var x = point.x - this.x,
			y = point.y - this.y,
			d = x * x + y * y;
		return squared ? d : Math.sqrt(d);
	},

	/**
	 * The length of the vector that is represented by this point's coordinates.
	 * Each point can be interpreted as a vector that points from the origin
	 * ({@code x = 0}, {@code y = 0}) to the point's location.
	 * Setting the length changes the location but keeps the vector's angle.
	 *
	 * @type Number
	 * @bean
	 */
	getLength: function() {
		// Supports a hidden parameter 'squared', which controls whether the
		// squared length should be returned. Hide it so it produces a bean
		// property called #length.
		var l = this.x * this.x + this.y * this.y;
		return arguments.length && arguments[0] ? l : Math.sqrt(l);
	},

	setLength: function(length) {
		// Whenever setting x/y, use #set() instead of direct assignment,
		// so LinkedPoint does not report changes twice.
		if (this.isZero()) {
			var angle = this._angle || 0;
			this.set(
				Math.cos(angle) * length,
				Math.sin(angle) * length
			);
		} else {
			var scale = length / this.getLength();
			// Force calculation of angle now, so it will be preserved even when
			// x and y are 0
			if (scale == 0)
				this.getAngle();
			this.set(
				this.x * scale,
				this.y * scale
			);
		}
		return this;
	},

	/**
	 * Normalize modifies the {@link #length} of the vector to {@code 1} without
	 * changing its angle and returns it as a new point. The optional
	 * {@code length} parameter defines the length to normalize to.
	 * The object itself is not modified!
	 *
	 * @param {Number} [length=1] The length of the normalized vector
	 * @return {Point} The normalized vector of the vector that is represented
	 *                 by this point's coordinates.
	 */
	normalize: function(length) {
		if (length === undefined)
			length = 1;
		var current = this.getLength(),
			scale = current != 0 ? length / current : 0,
			point = new Point(this.x * scale, this.y * scale);
		// Preserve angle.
		point._angle = this._angle;
		return point;
	},

	/**
	 * {@grouptitle Angle & Rotation}
	 * Returns the smaller angle between two vectors. The angle is unsigned, no
	 * information about rotational direction is given.
	 *
	 * @name Point#getAngle
	 * @function
	 * @param {Point} point
	 * @return {Number} the angle in degrees
	 */
	/**
	 * The vector's angle in degrees, measured from the x-axis to the vector.
	 *
	 * The angle is unsigned, no information about rotational direction is
	 * given.
	 *
	 * @name Point#getAngle
	 * @bean
	 * @type Number
	 */
	getAngle: function(/* point */) {
		// Hide parameters from Bootstrap so it injects bean too
		return this.getAngleInRadians(arguments[0]) * 180 / Math.PI;
	},

	setAngle: function(angle) {
		angle = this._angle = angle * Math.PI / 180;
		if (!this.isZero()) {
			var length = this.getLength();
			// Use #set() instead of direct assignment of x/y, so LinkedPoint
			// does not report changes twice.
			this.set(
				Math.cos(angle) * length,
				Math.sin(angle) * length
			);
		}
		return this;
	},

	/**
	 * Returns the smaller angle between two vectors in radians. The angle is
	 * unsigned, no information about rotational direction is given.
	 *
	 * @name Point#getAngleInRadians
	 * @function
	 * @param {Point} point
	 * @return {Number} the angle in radians
	 */
	/**
	 * The vector's angle in radians, measured from the x-axis to the vector.
	 *
	 * The angle is unsigned, no information about rotational direction is
	 * given.
	 *
	 * @name Point#getAngleInRadians
	 * @bean
	 * @type Number
	 */
	getAngleInRadians: function(/* point */) {
		// Hide parameters from Bootstrap so it injects bean too
		if (arguments[0] === undefined) {
			if (this._angle == null)
				this._angle = Math.atan2(this.y, this.x);
			return this._angle;
		} else {
			var point = Point.read(arguments),
				div = this.getLength() * point.getLength();
			if (Numerical.isZero(div)) {
				return NaN;
			} else {
				return Math.acos(this.dot(point) / div);
			}
		}
	},

	getAngleInDegrees: function(/* point */) {
		return this.getAngle(arguments[0]);
	},

	/**
	 * The quadrant of the {@link #angle} of the point.
	 *
	 * Angles between 0 and 90 degrees are in quadrant {@code 1}. Angles between
	 * 90 and 180 degrees are in quadrant {@code 2}, angles between 180 and 270
	 * degrees are in quadrant {@code 3} and angles between 270 and 360 degrees
	 * are in quadrant {@code 4}.
	 *
	 * @type Number
	 * @bean
	 *
	 * @example
	 * var point = new Point({
	 * 	angle: 10,
	 * 	length: 20
	 * });
	 * console.log(point.quadrant); // 1
	 *
	 * point.angle = 100;
	 * console.log(point.quadrant); // 2
	 *
	 * point.angle = 190;
	 * console.log(point.quadrant); // 3
	 *
	 * point.angle = 280;
	 * console.log(point.quadrant); // 4
	 */
	getQuadrant: function() {
		return this.x >= 0 ? this.y >= 0 ? 1 : 4 : this.y >= 0 ? 2 : 3;
	},

	/**
	 * Returns the angle between two vectors. The angle is directional and
	 * signed, giving information about the rotational direction.
	 *
	 * Read more about angle units and orientation in the description of the
	 * {@link #angle} property.
	 *
	 * @param {Point} point
	 * @return {Number} the angle between the two vectors
	 */
	getDirectedAngle: function(point) {
		point = Point.read(arguments);
		return Math.atan2(this.cross(point), this.dot(point)) * 180 / Math.PI;
	},

	/**
	 * Rotates the point by the given angle around an optional center point.
	 * The object itself is not modified.
	 *
	 * Read more about angle units and orientation in the description of the
	 * {@link #angle} property.
	 *
	 * @param {Number} angle the rotation angle
	 * @param {Point} center the center point of the rotation
	 * @returns {Point} the rotated point
	 */
	rotate: function(angle, center) {
		if (angle === 0)
			return this.clone();
		angle = angle * Math.PI / 180;
		var point = center ? this.subtract(center) : this,
			s = Math.sin(angle),
			c = Math.cos(angle);
		point = new Point(
			point.x * c - point.y * s,
			point.y * c + point.x * s
		);
		return center ? point.add(center) : point;
	},

	/**
	 * {@grouptitle Tests}
	 *
	 * Checks whether the point is inside the boundaries of the rectangle.
	 *
	 * @param {Rectangle} rect the rectangle to check against
	 * @returns {Boolean} {@true if the point is inside the rectangle}
	 */
	isInside: function(rect) {
		return rect.contains(this);
	},

	/**
	 * Checks if the point is within a given distance of another point.
	 *
	 * @param {Point} point the point to check against
	 * @param {Number} tolerance the maximum distance allowed
	 * @returns {Boolean} {@true if it is within the given distance}
	 */
	isClose: function(point, tolerance) {
		return this.getDistance(point) < tolerance;
	},

	/**
	 * Checks if the vector represented by this point is colinear (parallel) to
	 * another vector.
	 *
	 * @param {Point} point the vector to check against
	 * @returns {Boolean} {@true it is colinear}
	 */
	isColinear: function(point) {
		return this.cross(point) < 0.00001;
	},

	/**
	 * Checks if the vector represented by this point is orthogonal
	 * (perpendicular) to another vector.
	 *
	 * @param {Point} point the vector to check against
	 * @returns {Boolean} {@true it is orthogonal}
	 */
	isOrthogonal: function(point) {
		return this.dot(point) < 0.00001;
	},

	/**
	 * Checks if this point has both the x and y coordinate set to 0.
	 *
	 * @returns {Boolean} {@true both x and y are 0}
	 */
	isZero: function() {
		return Numerical.isZero(this.x) && Numerical.isZero(this.y);
	},

	/**
	 * Checks if this point has an undefined value for at least one of its
	 * coordinates.
	 *
	 * @returns {Boolean} {@true if either x or y are not a number}
	 */
	isNaN: function() {
		return isNaN(this.x) || isNaN(this.y);
	},

	/**
	 * {@grouptitle Vector Math Functions}
	 * Returns the dot product of the point and another point.
	 *
	 * @param {Point} point
	 * @returns {Number} the dot product of the two points
	 */
	dot: function(point) {
		point = Point.read(arguments);
		return this.x * point.x + this.y * point.y;
	},

	/**
	 * Returns the cross product of the point and another point.
	 *
	 * @param {Point} point
	 * @returns {Number} the cross product of the two points
	 */
	cross: function(point) {
		point = Point.read(arguments);
		return this.x * point.y - this.y * point.x;
	},

	/**
	 * Returns the projection of the point on another point.
	 * Both points are interpreted as vectors.
	 *
	 * @param {Point} point
	 * @returns {Point} the projection of the point on another point
	 */
	project: function(point) {
		point = Point.read(arguments);
		if (point.isZero()) {
			return new Point(0, 0);
		} else {
			var scale = this.dot(point) / point.dot(point);
			return new Point(
				point.x * scale,
				point.y * scale
			);
		}
	},

	/**
	 * This property is only present if the point is an anchor or control point
	 * of a {@link Segment} or a {@link Curve}. In this case, it returns
	 * {@true it is selected}
	 *
	 * @name Point#selected
	 * @property
	 * @return {Boolean} {@true the point is selected}
	 */

	statics: /** @lends Point */{
		/**
		 * Returns a new point object with the smallest {@link #x} and
		 * {@link #y} of the supplied points.
		 *
		 * @static
		 * @param {Point} point1
		 * @param {Point} point2
		 * @returns {Point} The newly created point object
		 *
		 * @example
		 * var point1 = new Point(10, 100);
		 * var point2 = new Point(200, 5);
		 * var minPoint = Point.min(point1, point2);
		 * console.log(minPoint); // {x: 10, y: 5}
		 */
		min: function(point1, point2) {
			var _point1 = Point.read(arguments);
				_point2 = Point.read(arguments);
			return new Point(
				Math.min(_point1.x, _point2.x),
				Math.min(_point1.y, _point2.y)
			);
		},

		/**
		 * Returns a new point object with the largest {@link #x} and
		 * {@link #y} of the supplied points.
		 *
		 * @static
		 * @param {Point} point1
		 * @param {Point} point2
		 * @returns {Point} The newly created point object
		 *
		 * @example
		 * var point1 = new Point(10, 100);
		 * var point2 = new Point(200, 5);
		 * var maxPoint = Point.max(point1, point2);
		 * console.log(maxPoint); // {x: 200, y: 100}
		 */
		max: function(point1, point2) {
			var _point1 = Point.read(arguments);
				_point2 = Point.read(arguments);
			return new Point(
				Math.max(_point1.x, _point2.x),
				Math.max(_point1.y, _point2.y)
			);
		},

		/**
		 * Returns a point object with random {@link #x} and {@link #y} values
		 * between {@code 0} and {@code 1}.
		 *
		 * @returns {Point} The newly created point object
		 * @static
		 *
		 * @example
		 * var maxPoint = new Point(100, 100);
		 * var randomPoint = Point.random();
		 *
		 * // A point between {x:0, y:0} and {x:100, y:100}:
		 * var point = maxPoint * randomPoint;
		 */
		random: function() {
			return new Point(Math.random(), Math.random());
		}
	}
}, new function() { // Scope for injecting round, ceil, floor, abs:
	/**
	 * {@grouptitle Math Functions}
	 *
	 * Returns a new point with rounded {@link #x} and {@link #y} values. The
	 * object itself is not modified!
	 *
	 * @name Point#round
	 * @function
	 * @return {Point}
	 *
	 * @example
	 * var point = new Point(10.2, 10.9);
	 * var roundPoint = point.round();
	 * console.log(roundPoint); // {x: 10, y: 11}
	 */

	/**
	 * Returns a new point with the nearest greater non-fractional values to the
	 * specified {@link #x} and {@link #y} values. The object itself is not
	 * modified!
	 *
	 * @name Point#ceil
	 * @function
	 * @return {Point}
	 *
	 * @example
	 * var point = new Point(10.2, 10.9);
	 * var ceilPoint = point.ceil();
	 * console.log(ceilPoint); // {x: 11, y: 11}
	 */

	/**
	 * Returns a new point with the nearest smaller non-fractional values to the
	 * specified {@link #x} and {@link #y} values. The object itself is not
	 * modified!
	 *
	 * @name Point#floor
	 * @function
	 * @return {Point}
	 *
	 * @example
	 * var point = new Point(10.2, 10.9);
	 * var floorPoint = point.floor();
	 * console.log(floorPoint); // {x: 10, y: 10}
	 */

	/**
	 * Returns a new point with the absolute values of the specified {@link #x}
	 * and {@link #y} values. The object itself is not modified!
	 *
	 * @name Point#abs
	 * @function
	 * @return {Point}
	 *
	 * @example
	 * var point = new Point(-5, 10);
	 * var absPoint = point.abs();
	 * console.log(absPoint); // {x: 5, y: 10}
	 */

	return Base.each(['round', 'ceil', 'floor', 'abs'], function(name) {
		var op = Math[name];
		this[name] = function() {
			return new Point(op(this.x), op(this.y));
		};
	}, {});
});

/**
 * @name LinkedPoint
 *
 * @class An internal version of Point that notifies its owner of each change
 * through setting itself again on the setter that corresponds to the getter
 * that produced this LinkedPoint. See uses of LinkedPoint.create()
 * Note: This prototype is not exported.
 *
 * @ignore
 */
var LinkedPoint = Point.extend({
	set: function(x, y, dontNotify) {
		this._x = x;
		this._y = y;
		if (!dontNotify)
			this._owner[this._setter](this);
		return this;
	},

	getX: function() {
		return this._x;
	},

	setX: function(x) {
		this._x = x;
		this._owner[this._setter](this);
	},

	getY: function() {
		return this._y;
	},

	setY: function(y) {
		this._y = y;
		this._owner[this._setter](this);
	},

	statics: {
		create: function(owner, setter, x, y, dontLink) {
			// Support creation of normal Points rather than LinkedPoints
			// through an optional parameter that can be passed to the getters.
			// See e.g. Rectangle#getPoint(true).
			if (dontLink)
				return new Point(x, y);
			var point = Base.create(LinkedPoint);
			point._x = x;
			point._y = y;
			point._owner = owner;
			point._setter = setter;
			return point;
		}
	}
});

/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2013, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

/**
 * @name Size
 *
 * @class The Size object is used to describe the size of something, through
 * its {@link #width} and {@link #height} properties.
 *
 * @classexample
 * // Create a size that is 10pt wide and 5pt high
 * var size = new Size(10, 5);
 * console.log(size.width); // 10
 * console.log(size.height); // 5
 */
var Size = Base.extend(/** @lends Size# */{
	// Tell Base.read that the Point constructor supports reading with index
	_readIndex: true,

	// DOCS: improve Size class description
	/**
	 * Creates a Size object with the given width and height values.
	 *
	 * @name Size#initialize
	 * @param {Number} width the width
	 * @param {Number} height the height
	 *
	 * @example
	 * // Create a size that is 10pt wide and 5pt high
	 * var size = new Size(10, 5);
	 * console.log(size.width); // 10
	 * console.log(size.height); // 5
	 */
	/**
	 * Creates a Size object using the numbers in the given array as
	 * dimensions.
	 *
	 * @name Size#initialize
	 * @param {Array} array
	 *
	 * @example
	 * // Creating a size of width: 320, height: 240 using an array of numbers:
	 * var array = [320, 240];
	 * var size = new Size(array);
	 * console.log(size.width); // 320
	 * console.log(size.height); // 240
	 */
	/**
	 * Creates a Size object using the properties in the given object.
	 *
	 * @name Size#initialize
	 * @param {object} object
	 *
	 * @example
	 * // Creating a size of width: 10, height: 20 using an object literal:
	 *
	 * var size = new Size({
	 * 	width: 10,
	 * 	height: 20
	 * });
	 * console.log(size.width); // 10
	 * console.log(size.height); // 20
	 */
	/**
	 * Creates a Size object using the coordinates of the given Size object.
	 *
	 * @name Size#initialize
	 * @param {Size} size
	 */
	/**
	 * Creates a Size object using the {@link Point#x} and {@link Point#y}
	 * values of the given Point object.
	 *
	 * @name Size#initialize
	 * @param {Point} point
	 *
	 * @example
	 * var point = new Point(50, 50);
	 * var size = new Size(point);
	 * console.log(size.width); // 50
	 * console.log(size.height); // 50
	 */
	initialize: function Size(arg0, arg1) {
		var type = typeof arg0;
		if (type === 'number') {
			var hasHeight = typeof arg1 === 'number';
			this.width = arg0;
			this.height = hasHeight ? arg1 : arg0;
			if (this._read)
				this._read = hasHeight ? 2 : 1;
		} else if (type === 'undefined' || arg0 === null) {
			this.width = this.height = 0;
			if (this._read)
				this._read = arg0 === null ? 1 : 0;
		} else {
			if (Array.isArray(arg0)) {
				this.width = arg0[0];
				this.height = arg0.length > 1 ? arg0[1] : arg0[0];
			} else if (arg0.width != null) {
				this.width = arg0.width;
				this.height = arg0.height;
			} else if (arg0.x != null) {
				this.width = arg0.x;
				this.height = arg0.y;
			} else {
				this.width = this.height = 0;
				if (this._read)
					this._read = 0;
			}
			if (this._read)
				this._read = 1;
		}
	},

	/**
	 * The width of the size
	 *
	 * @name Size#width
	 * @type Number
	 */

	/**
	 * The height of the size
	 *
	 * @name Size#height
	 * @type Number
	 */

	set: function(width, height) {
		this.width = width;
		this.height = height;
		return this;
	},

	/**
	 * Checks whether the width and height of the size are equal to those of the
	 * supplied size.
	 *
	 * @param {Size}
	 * @return {Boolean}
	 *
	 * @example
	 * var size = new Size(5, 10);
	 * console.log(size == new Size(5, 10)); // true
	 * console.log(size == new Size(1, 1)); // false
	 * console.log(size != new Size(1, 1)); // true
	 */
	equals: function(size) {
		size = Size.read(arguments);
		return this.width == size.width && this.height == size.height;
	},

	/**
	 * Returns a copy of the size.
	 */
	clone: function() {
		return new Size(this.width, this.height);
	},

	/**
	 * @return {String} A string representation of the size.
	 */
	toString: function() {
		var f = Formatter.instance;
		return '{ width: ' + f.number(this.width)
				+ ', height: ' + f.number(this.height) + ' }';
	},

	_serialize: function(options) {
		var f = options.formatter;
		// See Point#_serialize()
		return [f.number(this.width),
				f.number(this.height)];
	},

	/**
	 * Returns the addition of the supplied value to the width and height of the
	 * size as a new size. The object itself is not modified!
	 *
	 * @name Size#add
	 * @function
	 * @param {Number} number the number to add
	 * @return {Size} the addition of the size and the value as a new size
	 *
	 * @example
	 * var size = new Size(5, 10);
	 * var result = size + 20;
	 * console.log(result); // {width: 25, height: 30}
	 */
	/**
	 * Returns the addition of the width and height of the supplied size to the
	 * size as a new size. The object itself is not modified!
	 *
	 * @name Size#add
	 * @function
	 * @param {Size} size the size to add
	 * @return {Size} the addition of the two sizes as a new size
	 *
	 * @example
	 * var size1 = new Size(5, 10);
	 * var size2 = new Size(10, 20);
	 * var result = size1 + size2;
	 * console.log(result); // {width: 15, height: 30}
	 */
	add: function(size) {
		size = Size.read(arguments);
		return new Size(this.width + size.width, this.height + size.height);
	},

	/**
	 * Returns the subtraction of the supplied value from the width and height
	 * of the size as a new size. The object itself is not modified!
	 * The object itself is not modified!
	 *
	 * @name Size#subtract
	 * @function
	 * @param {Number} number the number to subtract
	 * @return {Size} the subtraction of the size and the value as a new size
	 *
	 * @example
	 * var size = new Size(10, 20);
	 * var result = size - 5;
	 * console.log(result); // {width: 5, height: 15}
	 */
	/**
	 * Returns the subtraction of the width and height of the supplied size from
	 * the size as a new size. The object itself is not modified!
	 *
	 * @name Size#subtract
	 * @function
	 * @param {Size} size the size to subtract
	 * @return {Size} the subtraction of the two sizes as a new size
	 *
	 * @example
	 * var firstSize = new Size(10, 20);
	 * var secondSize = new Size(5, 5);
	 * var result = firstSize - secondSize;
	 * console.log(result); // {width: 5, height: 15}
	 */
	subtract: function(size) {
		size = Size.read(arguments);
		return new Size(this.width - size.width, this.height - size.height);
	},

	/**
	 * Returns the multiplication of the supplied value with the width and
	 * height of the size as a new size. The object itself is not modified!
	 *
	 * @name Size#multiply
	 * @function
	 * @param {Number} number the number to multiply by
	 * @return {Size} the multiplication of the size and the value as a new size
	 *
	 * @example
	 * var size = new Size(10, 20);
	 * var result = size * 2;
	 * console.log(result); // {width: 20, height: 40}
	 */
	/**
	 * Returns the multiplication of the width and height of the supplied size
	 * with the size as a new size. The object itself is not modified!
	 *
	 * @name Size#multiply
	 * @function
	 * @param {Size} size the size to multiply by
	 * @return {Size} the multiplication of the two sizes as a new size
	 *
	 * @example
	 * var firstSize = new Size(5, 10);
	 * var secondSize = new Size(4, 2);
	 * var result = firstSize * secondSize;
	 * console.log(result); // {width: 20, height: 20}
	 */
	multiply: function(size) {
		size = Size.read(arguments);
		return new Size(this.width * size.width, this.height * size.height);
	},

	/**
	 * Returns the division of the supplied value by the width and height of the
	 * size as a new size. The object itself is not modified!
	 *
	 * @name Size#divide
	 * @function
	 * @param {Number} number the number to divide by
	 * @return {Size} the division of the size and the value as a new size
	 *
	 * @example
	 * var size = new Size(10, 20);
	 * var result = size / 2;
	 * console.log(result); // {width: 5, height: 10}
	 */
	/**
	 * Returns the division of the width and height of the supplied size by the
	 * size as a new size. The object itself is not modified!
	 *
	 * @name Size#divide
	 * @function
	 * @param {Size} size the size to divide by
	 * @return {Size} the division of the two sizes as a new size
	 *
	 * @example
	 * var firstSize = new Size(8, 10);
	 * var secondSize = new Size(2, 5);
	 * var result = firstSize / secondSize;
	 * console.log(result); // {width: 4, height: 2}
	 */
	divide: function(size) {
		size = Size.read(arguments);
		return new Size(this.width / size.width, this.height / size.height);
	},

	/**
	 * The modulo operator returns the integer remainders of dividing the size
	 * by the supplied value as a new size.
	 *
	 * @name Size#modulo
	 * @function
	 * @param {Number} value
	 * @return {Size} the integer remainders of dividing the size by the value
	 *                 as a new size
	 *
	 * @example
	 * var size = new Size(12, 6);
	 * console.log(size % 5); // {width: 2, height: 1}
	 */
	/**
	 * The modulo operator returns the integer remainders of dividing the size
	 * by the supplied size as a new size.
	 *
	 * @name Size#modulo
	 * @function
	 * @param {Size} size
	 * @return {Size} the integer remainders of dividing the sizes by each
	 *                 other as a new size
	 *
	 * @example
	 * var size = new Size(12, 6);
	 * console.log(size % new Size(5, 2)); // {width: 2, height: 0}
	 */
	modulo: function(size) {
		size = Size.read(arguments);
		return new Size(this.width % size.width, this.height % size.height);
	},

	negate: function() {
		return new Size(-this.width, -this.height);
	},

	/**
	 * {@grouptitle Tests}
	 * Checks if this size has both the width and height set to 0.
	 *
	 * @return {Boolean} {@true both width and height are 0}
	 */
	isZero: function() {
		return Numerical.isZero(this.width) && Numerical.isZero(this.height);
	},

	/**
	 * Checks if the width or the height of the size are NaN.
	 *
	 * @return {Boolean} {@true if the width or height of the size are NaN}
	 */
	isNaN: function() {
		return isNaN(this.width) || isNaN(this.height);
	},

	statics: /** @lends Size */{
		/**
		 * Returns a new size object with the smallest {@link #width} and
		 * {@link #height} of the supplied sizes.
		 *
		 * @static
		 * @param {Size} size1
		 * @param {Size} size2
		 * @returns {Size} The newly created size object
		 *
		 * @example
		 * var size1 = new Size(10, 100);
		 * var size2 = new Size(200, 5);
		 * var minSize = Size.min(size1, size2);
		 * console.log(minSize); // {width: 10, height: 5}
		 */
		min: function(size1, size2) {
			return new Size(
				Math.min(size1.width, size2.width),
				Math.min(size1.height, size2.height));
		},

		/**
		 * Returns a new size object with the largest {@link #width} and
		 * {@link #height} of the supplied sizes.
		 *
		 * @static
		 * @param {Size} size1
		 * @param {Size} size2
		 * @returns {Size} The newly created size object
		 *
		 * @example
		 * var size1 = new Size(10, 100);
		 * var size2 = new Size(200, 5);
		 * var maxSize = Size.max(size1, size2);
		 * console.log(maxSize); // {width: 200, height: 100}
		 */
		max: function(size1, size2) {
			return new Size(
				Math.max(size1.width, size2.width),
				Math.max(size1.height, size2.height));
		},

		/**
		 * Returns a size object with random {@link #width} and {@link #height}
		 * values between {@code 0} and {@code 1}.
		 *
		 * @returns {Size} The newly created size object
		 * @static
		 *
		 * @example
		 * var maxSize = new Size(100, 100);
		 * var randomSize = Size.random();
		 * var size = maxSize * randomSize;
		 */
		random: function() {
			return new Size(Math.random(), Math.random());
		}
	}
}, new function() { // Scope for injecting round, ceil, floor, abs:

	/**
	 * {@grouptitle Math Functions}
	 *
	 * Returns a new size with rounded {@link #width} and {@link #height} values.
	 * The object itself is not modified!
	 *
	 * @name Size#round
	 * @function
	 * @return {Size}
	 *
	 * @example
	 * var size = new Size(10.2, 10.9);
	 * var roundSize = size.round();
	 * console.log(roundSize); // {x: 10, y: 11}
	 */

	/**
	 * Returns a new size with the nearest greater non-fractional values to the
	 * specified {@link #width} and {@link #height} values. The object itself is not
	 * modified!
	 *
	 * @name Size#ceil
	 * @function
	 * @return {Size}
	 *
	 * @example
	 * var size = new Size(10.2, 10.9);
	 * var ceilSize = size.ceil();
	 * console.log(ceilSize); // {x: 11, y: 11}
	 */

	/**
	 * Returns a new size with the nearest smaller non-fractional values to the
	 * specified {@link #width} and {@link #height} values. The object itself is not
	 * modified!
	 *
	 * @name Size#floor
	 * @function
	 * @return {Size}
	 *
	 * @example
	 * var size = new Size(10.2, 10.9);
	 * var floorSize = size.floor();
	 * console.log(floorSize); // {x: 10, y: 10}
	 */

	/**
	 * Returns a new size with the absolute values of the specified {@link #width}
	 * and {@link #height} values. The object itself is not modified!
	 *
	 * @name Size#abs
	 * @function
	 * @return {Size}
	 *
	 * @example
	 * var size = new Size(-5, 10);
	 * var absSize = size.abs();
	 * console.log(absSize); // {x: 5, y: 10}
	 */

	return Base.each(['round', 'ceil', 'floor', 'abs'], function(name) {
		var op = Math[name];
		this[name] = function() {
			return new Size(op(this.width), op(this.height));
		};
	}, {});
});

/**
 * @name LinkedSize
 *
 * @class An internal version of Size that notifies its owner of each change
 * through setting itself again on the setter that corresponds to the getter
 * that produced this LinkedSize. See uses of LinkedSize.create()
 * Note: This prototype is not exported.
 *
 * @private
 */
var LinkedSize = Size.extend({
	set: function(width, height, dontNotify) {
		this._width = width;
		this._height = height;
		if (!dontNotify)
			this._owner[this._setter](this);
		return this;
	},

	getWidth: function() {
		return this._width;
	},

	setWidth: function(width) {
		this._width = width;
		this._owner[this._setter](this);
	},

	getHeight: function() {
		return this._height;
	},

	setHeight: function(height) {
		this._height = height;
		this._owner[this._setter](this);
	},

	statics: {
		create: function(owner, setter, width, height, dontLink) {
			// See LinkedPoint.create() for an explanation about dontLink.
			if (dontLink)
				return new Size(width, height);
			var size = Base.create(LinkedSize);
			size._width = width;
			size._height = height;
			size._owner = owner;
			size._setter = setter;
			return size;
		}
	}
});

/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2013, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

/**
 * @name Rectangle
 *
 * @class A Rectangle specifies an area that is enclosed by it's top-left
 * point (x, y), its width, and its height. It should not be confused with a
 * rectangular path, it is not an item.
 */
var Rectangle = Base.extend(/** @lends Rectangle# */{
	// Tell Base.read that the Rectangle constructor supports reading with index
	_readIndex: true,

	/**
	 * Creates a Rectangle object.
	 *
	 * @name Rectangle#initialize
	 * @param {Point} point the top-left point of the rectangle
	 * @param {Size} size the size of the rectangle
	 */
	/**
	 * Creates a Rectangle object.
	 *
	 * @name Rectangle#initialize
	 * @param {Object} object An object literal containing properties to be
	 * set on the rectangle.
	 * 
	 * @example // Create a rectangle between {x: 20, y: 20} and {x: 80, y:80}
	 * var rectangle = new Rectangle({
	 * 	point: [20, 20],
	 * 	size: [60, 60]
	 * });
	 * 
	 * @example // Create a rectangle between {x: 20, y: 20} and {x: 80, y:80}
	 * var rectangle = new Rectangle({
	 * 	from: [20, 20],
	 * 	to: [80, 80]
	 * });
	 */
	/**
	 * Creates a rectangle object.
	 *
	 * @name Rectangle#initialize
	 * @param {Number} x the left coordinate
	 * @param {Number} y the top coordinate
	 * @param {Number} width
	 * @param {Number} height
	 */
	/**
	 * Creates a rectangle object from the passed points. These do not
	 * necessarily need to be the top left and bottom right corners, the
	 * constructor figures out how to fit a rectangle between them.
	 *
	 * @name Rectangle#initialize
	 * @param {Point} from The first point defining the rectangle
	 * @param {Point} to The second point defining the rectangle
	 */
	/**
	 * Creates a new rectangle object from the passed rectangle object.
	 *
	 * @name Rectangle#initialize
	 * @param {Rectangle} rt
	 */
	initialize: function Rectangle(arg0, arg1, arg2, arg3) {
		var type = typeof arg0,
			read = 0;
		if (type === 'number') {
			// new Rectangle(x, y, width, height)
			this.x = arg0;
			this.y = arg1;
			this.width = arg2;
			this.height = arg3;
			read = 4;
		} else if (type === 'undefined' || arg0 === null) {
			// new Rectangle(), new Rectangle(null)
			this.x = this.y = this.width = this.height = 0;
			read = arg0 === null ? 1 : 0;
		} else if (arguments.length === 1) {
			// This can either be an array, or an object literal.
			if (Array.isArray(arg0)) {
				this.x = arg0[0];
				this.y = arg0[1];
				this.width = arg0[2];
				this.height = arg0[3];
				read = 1;
			} else if (arg0.x !== undefined || arg0.width !== undefined) {
				// Another rectangle or a simple object literal
				// describing one. Use duck typing, and 0 as defaults.
				this.x = arg0.x || 0;
				this.y = arg0.y || 0;
				this.width = arg0.width || 0;
				this.height = arg0.height || 0;
				read = 1;
			} else if (arg0.from === undefined && arg0.to === undefined) {
				// Use #_set to support whatever property the rectangle can
				// take, but handle from/to separately below.
				this.x = this.y = this.width = this.height = 0;
				this._set(arg0);
				read = 1;
			}
		}
		if (!read) {
			// Read a point argument and look at the next value to see wether
			// it's a size or a point, then read accordingly.
			// We're supporting both reading from a normal arguments list and
			// covering the Rectangle({ from: , to: }) constructor, through
			// Point.readNamed().
			var point = Point.readNamed(arguments, 'from'),
				next = Base.peek(arguments);
			this.x = point.x;
			this.y = point.y;
			if (next && next.x !== undefined || Base.hasNamed(arguments, 'to')) {
				// new Rectangle(from, to)
				// Read above why we can use readNamed() to cover both cases.
				var to = Point.readNamed(arguments, 'to');
				this.width = to.x - point.x;
				this.height = to.y - point.y;
				// Check if horizontal or vertical order needs to be reversed.
				if (this.width < 0) {
					this.x = to.x;
					this.width = -this.width;
				}
				if (this.height < 0) {
					this.y = to.y;
					this.height = -this.height;
				}
			} else {
				// new Rectangle(point, size)
				var size = Size.read(arguments);
				this.width = size.width;
				this.height = size.height;
			}
			read = arguments._index;
		}
		if (this._read)
			this._read = read;
	},

	/**
	 * The x position of the rectangle.
	 *
	 * @name Rectangle#x
	 * @type Number
	 */

	/**
	 * The y position of the rectangle.
	 *
	 * @name Rectangle#y
	 * @type Number
	 */

	/**
	 * The width of the rectangle.
	 *
	 * @name Rectangle#width
	 * @type Number
	 */

	/**
	 * The height of the rectangle.
	 *
	 * @name Rectangle#height
	 * @type Number
	 */

	// DOCS: Why does jsdocs document this function, when there are no comments?
	/**
	 * @ignore
	 */
	set: function(x, y, width, height) {
		this.x = x;
		this.y = y;
		this.width = width;
		this.height = height;
		return this;
	},

	/**
	 * Returns a copy of the rectangle.
	 */
	clone: function() {
		return new Rectangle(this.x, this.y, this.width, this.height);
	},

	/**
	 * Checks whether the coordinates and size of the rectangle are equal to
	 * that of the supplied rectangle.
	 *
	 * @param {Rectangle} rect
	 * @return {Boolean} {@true if the rectangles are equal}
	 */
	equals: function(rect) {
		rect = Rectangle.read(arguments);
		return this.x == rect.x && this.y == rect.y
				&& this.width == rect.width && this.height == rect.height;
	},

	/**
	 * @return {String} A string representation of this rectangle.
	 */
	toString: function() {
		var f = Formatter.instance;
		return '{ x: ' + f.number(this.x)
				+ ', y: ' + f.number(this.y)
				+ ', width: ' + f.number(this.width)
				+ ', height: ' + f.number(this.height)
				+ ' }';
	},

	_serialize: function(options) {
		var f = options.formatter;
		// See Point#_serialize()
		return [f.number(this.x),
				f.number(this.y),
				f.number(this.width),
				f.number(this.height)];
	},

	/**
	 * The top-left point of the rectangle
	 *
	 * @type Point
	 * @bean
	 */
	getPoint: function(/* dontLink */) {
		// Pass on the optional argument _dontLink which tells LinkedPoint to
		// produce a normal point instead. Used internally for speed reasons.
		return LinkedPoint.create(this, 'setPoint', this.x, this.y, arguments[0]);
	},

	setPoint: function(point) {
		point = Point.read(arguments);
		this.x = point.x;
		this.y = point.y;
	},


	/**
	 * The size of the rectangle
	 *
	 * @type Size
	 * @bean
	 */
	getSize: function(/* dontLink */) {
		return LinkedSize.create(this, 'setSize', this.width, this.height,
				arguments[0]);
	},

	setSize: function(size) {
		size = Size.read(arguments);
		this.width = size.width;
		this.height = size.height;
	},

	/**
	 * {@grouptitle Side Positions}
	 *
	 * The position of the left hand side of the rectangle. Note that this
	 * doesn't move the whole rectangle; the right hand side stays where it was.
	 *
	 * @type Number
	 * @bean
	 */
	getLeft: function() {
		return this.x;
	},

	setLeft: function(left) {
		this.width -= left - this.x;
		this.x = left;
	},

	/**
	 * The top coordinate of the rectangle. Note that this doesn't move the
	 * whole rectangle: the bottom won't move.
	 *
	 * @type Number
	 * @bean
	 */
	getTop: function() {
		return this.y;
	},

	setTop: function(top) {
		this.height -= top - this.y;
		this.y = top;
	},

	/**
	 * The position of the right hand side of the rectangle. Note that this
	 * doesn't move the whole rectangle; the left hand side stays where it was.
	 *
	 * @type Number
	 * @bean
	 */
	getRight: function() {
		return this.x + this.width;
	},

	setRight: function(right) {
		this.width = right - this.x;
	},

	/**
	 * The bottom coordinate of the rectangle. Note that this doesn't move the
	 * whole rectangle: the top won't move.
	 *
	 * @type Number
	 * @bean
	 */
	getBottom: function() {
		return this.y + this.height;
	},

	setBottom: function(bottom) {
		this.height = bottom - this.y;
	},

	/**
	 * The center-x coordinate of the rectangle.
	 *
	 * @type Number
	 * @bean
	 * @ignore
	 */
	getCenterX: function() {
		return this.x + this.width * 0.5;
	},

	setCenterX: function(x) {
		this.x = x - this.width * 0.5;
	},

	/**
	 * The center-y coordinate of the rectangle.
	 *
	 * @type Number
	 * @bean
	 * @ignore
	 */
	getCenterY: function() {
		return this.y + this.height * 0.5;
	},

	setCenterY: function(y) {
		this.y = y - this.height * 0.5;
	},

	/**
	 * {@grouptitle Corner and Center Point Positions}
	 *
	 * The center point of the rectangle.
	 *
	 * @type Point
	 * @bean
	 */
	getCenter: function(/* dontLink */) {
		return LinkedPoint.create(this, 'setCenter',
				this.getCenterX(), this.getCenterY(), arguments[0]);
	},

	setCenter: function(point) {
		point = Point.read(arguments);
		this.setCenterX(point.x);
		this.setCenterY(point.y);
		// A special setter where we allow chaining, because it comes in handy
		// in a couple of places in core.
		return this;
	},

	/**
	 * The top-left point of the rectangle.
	 *
	 * @name Rectangle#topLeft
	 * @type Point
	 */

	/**
	 * The top-right point of the rectangle.
	 *
	 * @name Rectangle#topRight
	 * @type Point
	 */

	/**
	 * The bottom-left point of the rectangle.
	 *
	 * @name Rectangle#bottomLeft
	 * @type Point
	 */

	/**
	 * The bottom-right point of the rectangle.
	 *
	 * @name Rectangle#bottomRight
	 * @type Point
	 */

	/**
	 * The left-center point of the rectangle.
	 *
	 * @name Rectangle#leftCenter
	 * @type Point
	 */

	/**
	 * The top-center point of the rectangle.
	 *
	 * @name Rectangle#topCenter
	 * @type Point
	 */

	/**
	 * The right-center point of the rectangle.
	 *
	 * @name Rectangle#rightCenter
	 * @type Point
	 */

	/**
	 * The bottom-center point of the rectangle.
	 *
	 * @name Rectangle#bottomCenter
	 * @type Point
	 */

	/**
	 * @return {Boolean} {@true the rectangle is empty}
	 */
	isEmpty: function() {
		return this.width == 0 || this.height == 0;
	},

	/**
	 * {@grouptitle Geometric Tests}
	 *
	 * Tests if the specified point is inside the boundary of the rectangle.
	 *
	 * @name Rectangle#contains
	 * @function
	 * @param {Point} point the specified point
	 * @return {Boolean} {@true if the point is inside the rectangle's boundary}
	 *
	 * @example {@paperscript}
	 * // Checking whether the mouse position falls within the bounding
	 * // rectangle of an item:
	 *
	 * // Create a circle shaped path at {x: 80, y: 50}
	 * // with a radius of 30.
	 * var circle = new Path.Circle(new Point(80, 50), 30);
	 * circle.fillColor = 'red';
	 *
	 * function onMouseMove(event) {
	 * 	// Check whether the mouse position intersects with the
	 * 	// bounding box of the item:
	 * 	if (circle.bounds.contains(event.point)) {
	 * 		// If it intersects, fill it with green:
	 * 		circle.fillColor = 'green';
	 * 	} else {
	 * 		// If it doesn't intersect, fill it with red:
	 * 		circle.fillColor = 'red';
	 * 	}
	 * }
	 */
	/**
	 * Tests if the interior of the rectangle entirely contains the specified
	 * rectangle.
	 *
	 * @name Rectangle#contains
	 * @function
	 * @param {Rectangle} rect The specified rectangle
	 * @return {Boolean} {@true if the rectangle entirely contains the specified
	 *                   rectangle}
	 *
	 * @example {@paperscript}
	 * // Checking whether the bounding box of one item is contained within
	 * // that of another item:
	 *
	 * // All newly created paths will inherit these styles:
	 * project.currentStyle = {
	 * 	fillColor: 'green',
	 * 	strokeColor: 'black'
	 * };
	 *
	 * // Create a circle shaped path at {x: 80, y: 50}
	 * // with a radius of 45.
	 * var largeCircle = new Path.Circle(new Point(80, 50), 45);
	 *
	 * // Create a smaller circle shaped path in the same position
	 * // with a radius of 30.
	 * var circle = new Path.Circle(new Point(80, 50), 30);
	 *
	 * function onMouseMove(event) {
	 * 	// Move the circle to the position of the mouse:
	 * 	circle.position = event.point;
	 *
	 * 	// Check whether the bounding box of the smaller circle
	 * 	// is contained within the bounding box of the larger item:
	 * 	if (largeCircle.bounds.contains(circle.bounds)) {
	 * 		// If it does, fill it with green:
	 * 		circle.fillColor = 'green';
	 * 		largeCircle.fillColor = 'green';
	 * 	} else {
	 * 		// If doesn't, fill it with red:
	 * 		circle.fillColor = 'red';
	 * 		largeCircle.fillColor = 'red';
	 * 	}
	 * }
	 */
	contains: function(arg) {
		// Detect rectangles either by checking for 'width' on the passed object
		// or by looking at the amount of elements in the arguments list,
		// or the passed array:
		return arg && arg.width !== undefined
				|| (Array.isArray(arg) ? arg : arguments).length == 4
				? this._containsRectangle(Rectangle.read(arguments))
				: this._containsPoint(Point.read(arguments));
	},

	_containsPoint: function(point) {
		var x = point.x,
			y = point.y;
		return x >= this.x && y >= this.y
				&& x <= this.x + this.width
				&& y <= this.y + this.height;
	},

	_containsRectangle: function(rect) {
		var x = rect.x,
			y = rect.y;
		return x >= this.x && y >= this.y
				&& x + rect.width <= this.x + this.width
				&& y + rect.height <= this.y + this.height;
	},

	/**
	 * Tests if the interior of this rectangle intersects the interior of
	 * another rectangle. Rectangles just touching each other are considered
	 * as non-intersecting.
	 *
	 * @param {Rectangle} rect the specified rectangle
	 * @return {Boolean} {@true if the rectangle and the specified rectangle
	 *                   intersect each other}
	 *
	 * @example {@paperscript}
	 * // Checking whether the bounding box of one item intersects with
	 * // that of another item:
	 *
	 * // All newly created paths will inherit these styles:
	 * project.currentStyle = {
	 * 	fillColor: 'green',
	 * 	strokeColor: 'black'
	 * };
	 *
	 * // Create a circle shaped path at {x: 80, y: 50}
	 * // with a radius of 45.
	 * var largeCircle = new Path.Circle(new Point(80, 50), 45);
	 *
	 * // Create a smaller circle shaped path in the same position
	 * // with a radius of 30.
	 * var circle = new Path.Circle(new Point(80, 50), 30);
	 *
	 * function onMouseMove(event) {
	 * 	// Move the circle to the position of the mouse:
	 * 	circle.position = event.point;
	 *
	 * 	// Check whether the bounding box of the two circle
	 * 	// shaped paths intersect:
	 * 	if (largeCircle.bounds.intersects(circle.bounds)) {
	 * 		// If it does, fill it with green:
	 * 		circle.fillColor = 'green';
	 * 		largeCircle.fillColor = 'green';
	 * 	} else {
	 * 		// If doesn't, fill it with red:
	 * 		circle.fillColor = 'red';
	 * 		largeCircle.fillColor = 'red';
	 * 	}
	 * }
	 */
	intersects: function(rect) {
		rect = Rectangle.read(arguments);
		return rect.x + rect.width > this.x
				&& rect.y + rect.height > this.y
				&& rect.x < this.x + this.width
				&& rect.y < this.y + this.height;
	},

	touches: function(rect) {
		rect = Rectangle.read(arguments);
		return rect.x + rect.width >= this.x
				&& rect.y + rect.height >= this.y
				&& rect.x <= this.x + this.width
				&& rect.y <= this.y + this.height;
	},

	/**
	 * {@grouptitle Boolean Operations}
	 *
	 * Returns a new rectangle representing the intersection of this rectangle
	 * with the specified rectangle.
	 *
	 * @param {Rectangle} rect The rectangle to be intersected with this
	 *                         rectangle
	 * @return {Rectangle} The largest rectangle contained in both the specified
	 *                     rectangle and in this rectangle.
	 *
	 * @example {@paperscript}
	 * // Intersecting two rectangles and visualizing the result using rectangle
	 * // shaped paths:
	 *
	 * // Create two rectangles that overlap each other
	 * var size = new Size(50, 50);
	 * var rectangle1 = new Rectangle(new Point(25, 15), size);
	 * var rectangle2 = new Rectangle(new Point(50, 40), size);
	 *
	 * // The rectangle that represents the intersection of the
	 * // two rectangles:
	 * var intersected = rectangle1.intersect(rectangle2);
	 *
	 * // To visualize the intersecting of the rectangles, we will
	 * // create rectangle shaped paths using the Path.Rectangle
	 * // constructor.
	 *
	 * // Have all newly created paths inherit a black stroke:
	 * project.currentStyle.strokeColor = 'black';
	 *
	 * // Create two rectangle shaped paths using the abstract rectangles
	 * // we created before:
	 * new Path.Rectangle(rectangle1);
	 * new Path.Rectangle(rectangle2);
	 *
	 * // Create a path that represents the intersected rectangle,
	 * // and fill it with red:
	 * var intersectionPath = new Path.Rectangle(intersected);
	 * intersectionPath.fillColor = 'red';
	 */
	intersect: function(rect) {
		rect = Rectangle.read(arguments);
		var x1 = Math.max(this.x, rect.x),
			y1 = Math.max(this.y, rect.y),
			x2 = Math.min(this.x + this.width, rect.x + rect.width),
			y2 = Math.min(this.y + this.height, rect.y + rect.height);
		return new Rectangle(x1, y1, x2 - x1, y2 - y1);
	},

	/**
	 * Returns a new rectangle representing the union of this rectangle with the
	 * specified rectangle.
	 *
	 * @param {Rectangle} rect the rectangle to be combined with this rectangle
	 * @return {Rectangle} the smallest rectangle containing both the specified
	 *                     rectangle and this rectangle.
	 */
	unite: function(rect) {
		rect = Rectangle.read(arguments);
		var x1 = Math.min(this.x, rect.x),
			y1 = Math.min(this.y, rect.y),
			x2 = Math.max(this.x + this.width, rect.x + rect.width),
			y2 = Math.max(this.y + this.height, rect.y + rect.height);
		return new Rectangle(x1, y1, x2 - x1, y2 - y1);
	},

	/**
	 * Adds a point to this rectangle. The resulting rectangle is the
	 * smallest rectangle that contains both the original rectangle and the
	 * specified point.
	 *
	 * After adding a point, a call to {@link #contains(point)} with the added
	 * point as an argument does not necessarily return {@code true}.
	 * The {@link Rectangle#contains(point)} method does not return {@code true}
	 * for points on the right or bottom edges of a rectangle. Therefore, if the
	 * added point falls on the left or bottom edge of the enlarged rectangle,
	 * {@link Rectangle#contains(point)} returns {@code false} for that point.
	 *
	 * @param {Point} point
	 */
	include: function(point) {
		point = Point.read(arguments);
		var x1 = Math.min(this.x, point.x),
			y1 = Math.min(this.y, point.y),
			x2 = Math.max(this.x + this.width, point.x),
			y2 = Math.max(this.y + this.height, point.y);
		return new Rectangle(x1, y1, x2 - x1, y2 - y1);
	},

	/**
	 * Expands the rectangle by the specified amount in both horizontal and
	 * vertical directions.
	 *
	 * @name Rectangle#expand
	 * @function
	 * @param {Number} amount
	 */
	/**
	 * Expands the rectangle in horizontal direction by the specified
	 * {@code hor} amount and in vertical direction by the specified {@code ver}
	 * amount.
	 *
	 * @name Rectangle#expand^2
	 * @function
	 * @param {Number} hor
	 * @param {Number} ver
	 */
	expand: function(hor, ver) {
		if (ver === undefined)
			ver = hor;
		return new Rectangle(this.x - hor / 2, this.y - ver / 2,
				this.width + hor, this.height + ver);
	},

	/**
	 * Scales the rectangle by the specified amount from its center.
	 *
	 * @name Rectangle#scale
	 * @function
	 * @param {Number} amount
	 */
	/**
	 * Scales the rectangle in horizontal direction by the specified
	 * {@code hor} amount and in vertical direction by the specified {@code ver}
	 * amount from its center.
	 *
	 * @name Rectangle#scale^2
	 * @function
	 * @param {Number} hor
	 * @param {Number} ver
	 */
	scale: function(hor, ver) {
		return this.expand(this.width * hor - this.width,
				this.height * (ver === undefined ? hor : ver) - this.height);
	}
}, new function() {
	return Base.each([
			['Top', 'Left'], ['Top', 'Right'],
			['Bottom', 'Left'], ['Bottom', 'Right'],
			['Left', 'Center'], ['Top', 'Center'],
			['Right', 'Center'], ['Bottom', 'Center']
		],
		function(parts, index) {
			var part = parts.join('');
			// find out if the first of the pair is an x or y property,
			// by checking the first character for [R]ight or [L]eft;
			var xFirst = /^[RL]/.test(part);
			// Rename Center to CenterX or CenterY:
			if (index >= 4)
				parts[1] += xFirst ? 'Y' : 'X';
			var x = parts[xFirst ? 0 : 1],
				y = parts[xFirst ? 1 : 0],
				getX = 'get' + x,
				getY = 'get' + y,
				setX = 'set' + x,
				setY = 'set' + y,
				get = 'get' + part,
				set = 'set' + part;
			this[get] = function(/* dontLink */) {
				return LinkedPoint.create(this, set,
						this[getX](), this[getY](), arguments[0]);
			};
			this[set] = function(point) {
				point = Point.read(arguments);
				this[setX](point.x);
				this[setY](point.y);
			};
		}, {});
});

/**
 * @name LinkedRectangle
 *
 * @class An internal version of Rectangle that notifies its owner of each
 * change through setting itself again on the setter that corresponds to the
 * getter that produced this LinkedRectangle.
 * See uses of LinkedRectangle.create()
 * Note: This prototype is not exported.
 *
 * @private
 */
var LinkedRectangle = Rectangle.extend({
	set: function(x, y, width, height, dontNotify) {
		this._x = x;
		this._y = y;
		this._width = width;
		this._height = height;
		if (!dontNotify)
			this._owner[this._setter](this);
		return this;
	},

	statics: {
		/**
		 * Provide a faster creator for Points out of two coordinates that
		 * does not rely on Point#initialize at all. This speeds up all math
		 * operations a lot.
		 *
		 * @ignore
		 */
		create: function(owner, setter, x, y, width, height) {
			var rect = Base.create(LinkedRectangle).set(x, y, width, height, true);
			rect._owner = owner;
			rect._setter = setter;
			return rect;
		}
	}
}, new function() {
	var proto = Rectangle.prototype;

	return Base.each(['x', 'y', 'width', 'height'], function(key) {
		var part = Base.capitalize(key);
		var internal = '_' + key;
		this['get' + part] = function() {
			return this[internal];
		};

		this['set' + part] = function(value) {
			this[internal] = value;
			// Check if this setter is called from another one which sets
			// _dontNotify, as it will notify itself
			if (!this._dontNotify)
				this._owner[this._setter](this);
		};
	}, Base.each(['Point', 'Size', 'Center',
			'Left', 'Top', 'Right', 'Bottom', 'CenterX', 'CenterY',
			'TopLeft', 'TopRight', 'BottomLeft', 'BottomRight',
			'LeftCenter', 'TopCenter', 'RightCenter', 'BottomCenter'],
		function(key) {
			var name = 'set' + key;
			this[name] = function(value) {
				// Make sure the above setters of x, y, width, height do not
				// each notify the owner, as we're going to take care of this
				// afterwards here, only once per change.
				this._dontNotify = true;
				proto[name].apply(this, arguments);
				delete this._dontNotify;
				this._owner[this._setter](this);
			};
		}, /** @lends Rectangle# */{
			/**
			 * {@grouptitle Item Bounds}
			 *
			 * Specifies whether an item's bounds are selected and will also
			 * mark the item as selected.
			 *
			 * Paper.js draws the visual bounds of selected items on top of your
			 * project. This can be useful for debugging.
			 *
			 * @type Boolean
			 * @default false
			 * @bean
			 */
			isSelected: function() {
				return this._owner._boundsSelected;
			},

			setSelected: function(selected) {
				var owner = this._owner;
				if (owner.setSelected) {
					owner._boundsSelected = selected;
					// Update the owner's selected state too, so the bounds
					// actually get drawn. When deselecting, take a path's  
					// _selectedSegmentState into account too, since it will
					// have to remain selected even when bounds are deselected
					owner.setSelected(selected || owner._selectedSegmentState > 0);
				}
			}
		})
	);
});

/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2013, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

// Based on goog.graphics.AffineTransform, as part of the Closure Library.
// Copyright 2008 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");

/**
 * @name Matrix
 *
 * @class An affine transform performs a linear mapping from 2D coordinates
 * to other 2D coordinates that preserves the "straightness" and
 * "parallelness" of lines.
 *
 * Such a coordinate transformation can be represented by a 3 row by 3
 * column matrix with an implied last row of [ 0 0 1 ]. This matrix
 * transforms source coordinates (x,y) into destination coordinates (x',y')
 * by considering them to be a column vector and multiplying the coordinate
 * vector by the matrix according to the following process:
 * <pre>
 *      [ x ]   [ a  b  tx ] [ x ]   [ a * x + b * y + tx ]
 *      [ y ] = [ c  d  ty ] [ y ] = [ c * x + d * y + ty ]
 *      [ 1 ]   [ 0  0  1  ] [ 1 ]   [         1          ]
 * </pre>
 *
 * This class is optimized for speed and minimizes calculations based on its
 * knowledge of the underlying matrix (as opposed to say simply performing
 * matrix multiplication).
 */
var Matrix = Base.extend(/** @lends Matrix# */{
	/**
	 * Creates a 2D affine transform.
	 *
	 * @param {Number} a The scaleX coordinate of the transform
	 * @param {Number} c The shearY coordinate of the transform
	 * @param {Number} b The shearX coordinate of the transform
	 * @param {Number} d The scaleY coordinate of the transform
	 * @param {Number} tx The translateX coordinate of the transform
	 * @param {Number} ty The translateY coordinate of the transform
	 */
	initialize: function Matrix(arg) {
		var count = arguments.length,
			ok = true;
		if (count == 6) {
			this.set.apply(this, arguments);
		} else if (count == 1) {
			if (arg instanceof Matrix) {
				this.set(arg._a, arg._c, arg._b, arg._d, arg._tx, arg._ty);
			} else if (Array.isArray(arg)) {
				this.set.apply(this, arg);
			} else {
				ok = false;
			}
		} else if (count == 0) {
			this.reset();
		} else {
			ok = false;
		}
		if (!ok)
			throw new Error('Unsupported matrix parameters');
	},

	/**
	 * Sets this transform to the matrix specified by the 6 values.
	 *
	 * @param {Number} a The scaleX coordinate of the transform
	 * @param {Number} c The shearY coordinate of the transform
	 * @param {Number} b The shearX coordinate of the transform
	 * @param {Number} d The scaleY coordinate of the transform
	 * @param {Number} tx The translateX coordinate of the transform
	 * @param {Number} ty The translateY coordinate of the transform
	 * @return {Matrix} This affine transform
	 */
	set: function(a, c, b, d, tx, ty) {
		this._a = a;
		this._c = c;
		this._b = b;
		this._d = d;
		this._tx = tx;
		this._ty = ty;
		return this;
	},

	_serialize: function(options) {
		return Base.serialize(this.getValues(), options);
	},

	/**
	 * @return {Matrix} A copy of this transform.
	 */
	clone: function() {
		return new Matrix(this._a, this._c, this._b, this._d,
				this._tx, this._ty);
	},

	/**
	 * Checks whether the two matrices describe the same transformation.
	 *
	 * @param {Matrix} matrix the matrix to compare this matrix to
	 * @return {Boolean} {@true if the matrices are equal}
	 */
	equals: function(mx) {
		return mx && this._a == mx._a && this._b == mx._b && this._c == mx._c
				&& this._d == mx._d && this._tx == mx._tx && this._ty == mx._ty;
	},

	/**
	 * @return {String} A string representation of this transform.
	 */
	toString: function() {
		var f = Formatter.instance;
		return '[[' + [f.number(this._a), f.number(this._b),
					f.number(this._tx)].join(', ') + '], ['
				+ [f.number(this._c), f.number(this._d),
					f.number(this._ty)].join(', ') + ']]';
	},

	/**
	 * "Resets" the matrix by setting its values to the ones of the identity
	 * matrix that results in no transformation.
	 */
	reset: function() {
		this._a = this._d = 1;
		this._c = this._b = this._tx = this._ty = 0;
		return this;
	},

	/**
	 * Concatentates this transform with a scaling transformation.
	 *
	 * @name Matrix#scale
	 * @function
	 * @param {Number} scale The scaling factor
	 * @param {Point} [center] The center for the scaling transformation
	 * @return {Matrix} This affine transform
	 */
	/**
	 * Concatentates this transform with a scaling transformation.
	 *
	 * @name Matrix#scale
	 * @function
	 * @param {Number} hor The horizontal scaling factor
	 * @param {Number} ver The vertical scaling factor
	 * @param {Point} [center] The center for the scaling transformation
	 * @return {Matrix} This affine transform
	 */
	scale: function(scale, center) {
		// Do not modify scale, center, since that would arguments of which
		// we're reading from!
		var _scale = Point.read(arguments),
			_center = Point.read(arguments, 0, 0, false, true); // readNull
		if (_center)
			this.translate(_center);
		this._a *= _scale.x;
		this._c *= _scale.x;
		this._b *= _scale.y;
		this._d *= _scale.y;
		if (_center)
			this.translate(_center.negate());
		return this;
	},

	/**
	 * Concatentates this transform with a translate transformation.
	 *
	 * @name Matrix#translate
	 * @function
	 * @param {Point} point The vector to translate by
	 * @return {Matrix} This affine transform
	 */
	/**
	 * Concatentates this transform with a translate transformation.
	 *
	 * @name Matrix#translate
	 * @function
	 * @param {Number} dx The distance to translate in the x direction
	 * @param {Number} dy The distance to translate in the y direction
	 * @return {Matrix} This affine transform
	 */
	translate: function(point) {
		point = Point.read(arguments);
		var x = point.x,
			y = point.y;
		this._tx += x * this._a + y * this._b;
		this._ty += x * this._c + y * this._d;
		return this;
	},

	/**
	 * Concatentates this transform with a rotation transformation around an
	 * anchor point.
	 *
	 * @name Matrix#rotate
	 * @function
	 * @param {Number} angle The angle of rotation measured in degrees
	 * @param {Point} center The anchor point to rotate around
	 * @return {Matrix} This affine transform
	 */
	/**
	 * Concatentates this transform with a rotation transformation around an
	 * anchor point.
	 *
	 * @name Matrix#rotate
	 * @function
	 * @param {Number} angle The angle of rotation measured in degrees
	 * @param {Number} x The x coordinate of the anchor point
	 * @param {Number} y The y coordinate of the anchor point
	 * @return {Matrix} This affine transform
	 */
	rotate: function(angle, center) {
		center = Point.read(arguments, 1);
		angle = angle * Math.PI / 180;
		// Concatenate rotation matrix into this one
		var x = center.x,
			y = center.y,
			cos = Math.cos(angle),
			sin = Math.sin(angle),
			tx = x - x * cos + y * sin,
			ty = y - x * sin - y * cos,
			a = this._a,
			b = this._b,
			c = this._c,
			d = this._d;
		this._a = cos * a + sin * b;
		this._b = -sin * a + cos * b;
		this._c = cos * c + sin * d;
		this._d = -sin * c + cos * d;
		this._tx += tx * a + ty * b;
		this._ty += tx * c + ty * d;
		return this;
	},

	/**
	 * Concatentates this transform with a shear transformation.
	 *
	 * @name Matrix#shear
	 * @function
	 * @param {Point} point The shear factor in x and y direction
	 * @param {Point} [center] The center for the shear transformation
	 * @return {Matrix} This affine transform
	 */
	/**
	 * Concatentates this transform with a shear transformation.
	 *
	 * @name Matrix#shear
	 * @function
	 * @param {Number} hor The horizontal shear factor
	 * @param {Number} ver The vertical shear factor
	 * @param {Point} [center] The center for the shear transformation
	 * @return {Matrix} This affine transform
	 */
	shear: function(point, center) {
		// Do not modify point, center, since that would arguments of which
		// we're reading from!
		var _point = Point.read(arguments),
			_center = Point.read(arguments, 0, 0, false, true); // readNull
		if (_center)
			this.translate(_center);
		var a = this._a,
			c = this._c;
		this._a += _point.y * this._b;
		this._c += _point.y * this._d;
		this._b += _point.x * a;
		this._d += _point.x * c;
		if (_center)
			this.translate(_center.negate());
		return this;
	},

	/**
	 * @return {Boolean} Whether this transform is the identity transform
	 */
	isIdentity: function() {
		return this._a == 1 && this._c == 0 && this._b == 0 && this._d == 1
				&& this._tx == 0 && this._ty == 0;
	},

	/**
	 * Returns whether the transform is invertible. A transform is not
	 * invertible if the determinant is 0 or any value is non-finite or NaN.
	 *
	 * @return {Boolean} Whether the transform is invertible
	 */
	isInvertible: function() {
		return !!this._getDeterminant();
	},

	/**
	 * Checks whether the matrix is singular or not. Singular matrices cannot be
	 * inverted.
	 *
	 * @return {Boolean} Whether the matrix is singular
	 */
	isSingular: function() {
		return !this._getDeterminant();
	},

	/**
	 * Concatenates an affine transform to this transform.
	 *
	 * @param {Matrix} mx The transform to concatenate
	 * @return {Matrix} This affine transform
	 */
	concatenate: function(mx) {
		var a = this._a,
			b = this._b,
			c = this._c,
			d = this._d;
		this._a = mx._a * a + mx._c * b;
		this._b = mx._b * a + mx._d * b;
		this._c = mx._a * c + mx._c * d;
		this._d = mx._b * c + mx._d * d;
		this._tx += mx._tx * a + mx._ty * b;
		this._ty += mx._tx * c + mx._ty * d;
		return this;
	},

	/**
	 * Pre-concatenates an affine transform to this transform.
	 *
	 * @param {Matrix} mx The transform to preconcatenate
	 * @return {Matrix} This affine transform
	 */
	preConcatenate: function(mx) {
		var a = this._a,
			b = this._b,
			c = this._c,
			d = this._d,
			tx = this._tx,
			ty = this._ty;
		this._a = mx._a * a + mx._b * c;
		this._b = mx._a * b + mx._b * d;
		this._c = mx._c * a + mx._d * c;
		this._d = mx._c * b + mx._d * d;
		this._tx = mx._a * tx + mx._b * ty + mx._tx;
		this._ty = mx._c * tx + mx._d * ty + mx._ty;
		return this;
	},

	/**
	 * Transforms a point and returns the result.
	 *
	 * @name Matrix#transform
	 * @function
	 * @param {Point} point The point to be transformed
	 * @return {Point} The transformed point
	 */
	/**
	 * Transforms an array of coordinates by this matrix and stores the results
	 * into the destination array, which is also returned.
	 *
	 * @name Matrix#transform
	 * @function
	 * @param {Number[]} src The array containing the source points
	 *        as x, y value pairs
	 * @param {Number} srcOff The offset to the first point to be transformed
	 * @param {Number[]} dst The array into which to store the transformed
	 *        point pairs
	 * @param {Number} dstOff The offset of the location of the first
	 *        transformed point in the destination array
	 * @param {Number} numPts The number of points to tranform
	 * @return {Number[]} The dst array, containing the transformed coordinates.
	 */
	transform: function(/* point | */ src, srcOff, dst, dstOff, numPts) {
		return arguments.length < 5
			// TODO: Check for rectangle and use _tranformBounds?
			? this._transformPoint(Point.read(arguments))
			: this._transformCoordinates(src, srcOff, dst, dstOff, numPts);
	},

	/**
	 * A faster version of transform that only takes one point and does not
	 * attempt to convert it.
	 */
	_transformPoint: function(point, dest, dontNotify) {
		var x = point.x,
			y = point.y;
		if (!dest)
			dest = Base.create(Point);
		return dest.set(
			x * this._a + y * this._b + this._tx,
			x * this._c + y * this._d + this._ty,
			dontNotify
		);
	},

	_transformCoordinates: function(src, srcOff, dst, dstOff, numPts) {
		var i = srcOff, j = dstOff,
			srcEnd = srcOff + 2 * numPts;
		while (i < srcEnd) {
			var x = src[i++],
				y = src[i++];
			dst[j++] = x * this._a + y * this._b + this._tx;
			dst[j++] = x * this._c + y * this._d + this._ty;
		}
		return dst;
	},

	_transformCorners: function(rect) {
		var x1 = rect.x,
			y1 = rect.y,
			x2 = x1 + rect.width,
			y2 = y1 + rect.height,
			coords = [ x1, y1, x2, y1, x2, y2, x1, y2 ];
		return this._transformCoordinates(coords, 0, coords, 0, 4);
	},

	/**
	 * Returns the 'transformed' bounds rectangle by transforming each corner
	 * point and finding the new bounding box to these points. This is not
	 * really the transformed reactangle!
	 */
	_transformBounds: function(bounds, dest, dontNotify) {
		var coords = this._transformCorners(bounds),
			min = coords.slice(0, 2),
			max = coords.slice();
		for (var i = 2; i < 8; i++) {
			var val = coords[i],
				j = i & 1;
			if (val < min[j])
				min[j] = val;
			else if (val > max[j])
				max[j] = val;
		}
		if (!dest)
			dest = Base.create(Rectangle);
		return dest.set(min[0], min[1], max[0] - min[0], max[1] - min[1],
				dontNotify);
	},

	/**
	 * Inverse transforms a point and returns the result.
	 *
	 * @param {Point} point The point to be transformed
	 */
	inverseTransform: function(point) {
		return this._inverseTransform(Point.read(arguments));
	},

	/**
	 * Returns the determinant of this transform, but only if the matrix is
	 * reversible, null otherwise.
	 */
	_getDeterminant: function() {
		var det = this._a * this._d - this._b * this._c;
		return isFinite(det) && !Numerical.isZero(det)
				&& isFinite(this._tx) && isFinite(this._ty)
				? det : null;
	},

	_inverseTransform: function(point, dest, dontNotify) {
		var det = this._getDeterminant();
		if (!det)
			return null;
		var x = point.x - this._tx,
			y = point.y - this._ty;
		if (!dest)
			dest = Base.create(Point);
		return dest.set(
			(x * this._d - y * this._b) / det,
			(y * this._a - x * this._c) / det,
			dontNotify
		);
	},

	/**
	 * Attempts to decompose the affine transformation described by this matrix
	 * into {@code translation}, {@code scaling}, {@code rotation} and
	 * {@code shearing}, and returns an object with these properties if it
	 * succeeded, {@code null} otherwise.
	 *
	 * @return {Object} the decomposed matrix, or {@code null} if decomposition
	 * is not possible.
	 */
	decompose: function() {
		// http://dev.w3.org/csswg/css3-2d-transforms/#matrix-decomposition
		// http://stackoverflow.com/questions/4361242/
		// https://github.com/wisec/DOMinator/blob/master/layout/style/nsStyleAnimation.cpp#L946
		var a = this._a, b = this._b, c = this._c, d = this._d;
		if (Numerical.isZero(a * d - b * c))
			return null;

		var scaleX = Math.sqrt(a * a + b * b);
		a /= scaleX;
		b /= scaleX;

		var shear = a * c + b * d;
		c -= a * shear;
		d -= b * shear;

		var scaleY = Math.sqrt(c * c + d * d);
		c /= scaleY;
		d /= scaleY;
		shear /= scaleY;

		// a * d - b * c should now be 1 or -1
		if (a * d < b * c) {
			a = -a;
			b = -b;
			// We don't need c & d anymore, but if we did, we'd have to do this:
			// c = -c;
			// d = -d;
			shear = -shear;
			scaleX = -scaleX;
		}

		return {
			translation: this.getTranslation(),
			scaling: new Point(scaleX, scaleY),
			rotation: -Math.atan2(b, a) * 180 / Math.PI,
			shearing: shear
		};
	},

	/**
	 * The scaling factor in the x-direction ({@code a}).
	 *
	 * @name Matrix#scaleX
	 * @type Number
	 */

	/**
	 * The scaling factor in the y-direction ({@code d}).
	 *
	 * @name Matrix#scaleY
	 * @type Number
	 */

	/**
	 * @return {Number} The shear factor in the x-direction ({@code b}).
	 *
	 * @name Matrix#shearX
	 * @type Number
	 */

	/**
	 * @return {Number} The shear factor in the y-direction ({@code c}).
	 *
	 * @name Matrix#shearY
	 * @type Number
	 */

	/**
	 * The translation in the x-direction ({@code tx}).
	 *
	 * @name Matrix#translateX
	 * @type Number
	 */

	/**
	 * The translation in the y-direction ({@code ty}).
	 *
	 * @name Matrix#translateY
	 * @type Number
	 */

	/**
	 * The transform values as an array, in the same sequence as they are passed
	 * to {@link #initialize(a, c, b, d, tx, ty)}.
	 *
	 * @type Number[]
	 * @bean
	 */
	getValues: function() {
		return [ this._a, this._c, this._b, this._d, this._tx, this._ty ];
	},

	/**
	 * The translation values of the matrix.
	 *
	 * @type Point
	 * @bean
	 */
	getTranslation: function() {
		// No decomposition is required to extract translation, so treat this
		return new Point(this._tx, this._ty);
	},

	/**
	 * The scaling values of the matrix, if it can be decomposed.
	 *
	 * @type Point
	 * @bean
	 * @see Matrix#decompose()
	 */
	getScaling: function() {
		return (this.decompose() || {}).scaling;
	},

	/**
	 * The rotation angle of the matrix, if it can be decomposed.
	 *
	 * @type Number
	 * @bean
	 * @see Matrix#decompose()
	 */
	getRotation: function() {
		return (this.decompose() || {}).rotation;
	},

	/**
	 * Inverts the transformation of the matrix. If the matrix is not invertible
	 * (in which case {@link #isSingular()} returns true), {@code null } is
	 * returned.
	 * 
	 * @return {Matrix} The inverted matrix, or {@code null }, if the matrix is
	 *         singular
	 */
	inverted: function() {
		var det = this._getDeterminant();
		return det && new Matrix(
				this._d / det,
				-this._c / det,
				-this._b / det,
				this._a / det,
				(this._b * this._ty - this._d * this._tx) / det,
				(this._c * this._tx - this._a * this._ty) / det);
	},

	shiftless: function() {
		return new Matrix(this._a, this._c, this._b, this._d, 0, 0);
	},

	/**
	 * Applies this matrix to the specified Canvas Context.
	 *
	 * @param {CanvasRenderingContext2D} ctx
	 */
	applyToContext: function(ctx) {
		ctx.transform(this._a, this._c, this._b, this._d, this._tx, this._ty);
	}
}, new function() {
	return Base.each({
		scaleX: '_a',
		scaleY: '_d',
		translateX: '_tx',
		translateY: '_ty',
		shearX: '_b',
		shearY: '_c'
	}, function(prop, name) {
		name = Base.capitalize(name);
		this['get' + name] = function() {
			return this[prop];
		};
		this['set' + name] = function(value) {
			this[prop] = value;
		};
	}, {});
});

/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2013, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

/**
 * @name Line
 *
 * @class The Line object represents..
 */
var Line = Base.extend(/** @lends Line# */{
	// DOCS: document Line class and constructor
	/**
	 * Creates a Line object.
	 *
	 * @param {Point} point1
	 * @param {Point} point2
	 * @param {Boolean} [asVector=false]
	 */
	initialize: function Line(arg0, arg1, arg2, arg3, arg4) {
		var asVector = false;
		if (arguments.length >= 4) {
			this._px = arg0;
			this._py = arg1;
			this._vx = arg2;
			this._vy = arg3;
			asVector = arg4;
		} else {
			this._px = arg0.x;
			this._py = arg0.y;
			this._vx = arg1.x;
			this._vy = arg1.y;
			asVector = arg2;
		}
		if (!asVector) {
			this._vx -= this._px;
			this._vy -= this._py;
		}
	},

	/**
	 * The starting point of the line
	 *
	 * @name Line#point
	 * @type Point
	 */
	getPoint: function() {
		return new Point(this._px, this._py);
	},

	/**
	 * The vector of the line
	 *
	 * @name Line#vector
	 * @type Point
	 */
	getVector: function() {
		return new Point(this._vx, this._vy);
	},

	/**
	 * @param {Line} line
	 * @param {Boolean} [isInfinite=false]
	 * @return {Point} the intersection point of the lines, {@code undefined}
	 * if the two lines are colinear, or {@code null} if they don't intersect.
	 */
	intersect: function(line, isInfinite) {
		return Line.intersect(
				this._px, this._py, this._vx, this._vy,
				line._px, line._py, line._vx, line._vy,
				true, isInfinite);
	},

	// DOCS: document Line#getSide(point)
	/**
	 * @param {Point} point
	 * @return {Number}
	 */
	getSide: function(point) {
		return Line.getSide(
				this._px, this._py, this._vx, this._vy,
				point.x, point.y, true);
	},

	// DOCS: document Line#getDistance(point)
	/**
	 * @param {Point} point
	 * @return {Number}
	 */
	getDistance: function(point) {
		return Math.abs(Line.getSignedDistance(
				this._px, this._py, this._vx, this._vy,
				point.x, point.y, true));
	},

	statics: /** @lends Line */{
		intersect: function(apx, apy, avx, avy, bpx, bpy, bvx, bvy, asVector,
				isInfinite) {
			// Convert 2nd points to vectors if they are not specified as such.
			if (!asVector) {
				avx -= apx;
				avy -= apy;
				bvx -= bpx;
				bvy -= bpy;
			}
			var cross = bvy * avx - bvx * avy;
			// Avoid divisions by 0, and errors when getting too close to 0
			if (!Numerical.isZero(cross)) {
				var dx = apx - bpx,
					dy = apy - bpy,
					ta = (bvx * dy - bvy * dx) / cross,
					tb = (avx * dy - avy * dx) / cross;
				// Check the ranges of t parameters if the line is not allowed
				// to extend beyond the definition points.
				if ((isInfinite || 0 <= ta && ta <= 1)
						&& (isInfinite || 0 <= tb && tb <= 1))
					return new Point(
								apx + ta * avx,
								apy + ta * avy);
			}
		},

		getSide: function(px, py, vx, vy, x, y, asVector) {
			if (!asVector) {
				vx -= px;
				vy -= py;
			}
			var v2x = x - px,
				v2y = y - py,
				ccw = v2x * vy - v2y * vx; // ccw = v2.cross(v1);
			if (ccw === 0) {
				ccw = v2x * vx + v2y * vy; // ccw = v2.dot(v1);
				if (ccw > 0) {
					// ccw = v2.subtract(v1).dot(v1);
					v2x -= vx;
					v2y -= vy;
					ccw = v2x * vx + v2y * vy;
					if (ccw < 0)
						ccw = 0;
				}
			}
			return ccw < 0 ? -1 : ccw > 0 ? 1 : 0;
		},

		getSignedDistance: function(px, py, vx, vy, x, y, asVector) {
			if (!asVector) {
				vx -= px;
				vy -= py;
			}
			// Cache these values since they're used heavily in fatline code
			var m = vy / vx, // slope
				b = py - m * px; // y offset
			// Distance to the linear equation
			return (y - (m * x) - b) / Math.sqrt(m * m + 1);
		}
	}
});


/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2013, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

/**
 * @name Project
 *
 * @class A Project object in Paper.js is what usually is referred to as the
 * document: The top level object that holds all the items contained in the
 * scene graph. As the term document is already taken in the browser context,
 * it is called Project.
 *
 * Projects allow the manipluation of the styles that are applied to all newly
 * created items, give access to the selected items, and will in future versions
 * offer ways to query for items in the scene graph defining specific
 * requirements, and means to persist and load from different formats, such as
 * SVG and PDF.
 *
 * The currently active project can be accessed through the
 * {@link PaperScope#project} variable.
 *
 * An array of all open projects is accessible through the
 * {@link PaperScope#projects} variable.
 */
var Project = PaperScopeItem.extend(/** @lends Project# */{
	_list: 'projects',
	_reference: 'project',

	// TODO: Add arguments to define pages
	/**
	 * Creates a Paper.js project.
	 *
	 * When working with PaperScript, a project is automatically created for us
	 * and the {@link PaperScope#project} variable points to it.
	 *
	 * @param {View|HTMLCanvasElement} view Either a view object or an HTML
	 * Canvas element that should be wrapped in a newly created view.
	 */
	initialize: function Project(view) {
		// Activate straight away by passing true to base(), so paper.project is
		// set, as required by Layer and DoumentView constructors.
		PaperScopeItem.call(this, true);
		this.layers = [];
		this.symbols = [];
		this._currentStyle = new Style();
		this.activeLayer = new Layer();
		if (view)
			this.view = view instanceof View ? view : View.create(view);
		this._selectedItems = {};
		this._selectedItemCount = 0;
		// See Item#draw() for an explanation of _drawCount
		this._drawCount = 0;
		// Change tracking, not in use for now. Activate once required:
		// this._changes = [];
		// this._changesById = {};
		this.options = {};
	},

	_serialize: function(options, dictionary) {
		// Just serialize layers to an array for now, they will be unserialized
		// into the active project automatically. We might want to add proper
		// project serialization later, but deserialization of a layers array
		// will always work.
		// Pass true for compact, so 'Project' does not get added as the class
		return Base.serialize(this.layers, options, true, dictionary);
	},

	/**
	 * Activates this project, so all newly created items will be placed
	 * in it.
	 *
	 * @name Project#activate
	 * @function
	 */

	// DOCS: Project#clear()

	clear: function() {
		for (var i = 0; i < this.layers.length; i++)
			this.layers[i].remove();
		this.symbols = [];
	},

	/**
	 * Removes this project from the {@link PaperScope#projects} list, and also
	 * removes its view, if one was defined.
	 */
	remove: function remove() {
		if (!remove.base.call(this))
			return false;
		if (this.view)
			this.view.remove();
		return true;
	},

	/**
	 * The reference to the project's view.
	 * @name Project#view
	 * @type View
	 */

	/**
	 * The currently active path style. All selected items and newly
	 * created items will be styled with this style.
	 *
	 * @type Style
	 * @bean
	 *
	 * @example {@paperscript}
	 * project.currentStyle = {
	 * 	fillColor: 'red',
	 * 	strokeColor: 'black',
	 * 	strokeWidth: 5
	 * }
	 *
	 * // The following paths will take over all style properties of
	 * // the current style:
	 * var path = new Path.Circle(new Point(75, 50), 30);
	 * var path2 = new Path.Circle(new Point(175, 50), 20);
	 *
	 * @example {@paperscript}
	 * project.currentStyle.fillColor = 'red';
	 *
	 * // The following path will take over the fill color we just set:
	 * var path = new Path.Circle(new Point(75, 50), 30);
	 * var path2 = new Path.Circle(new Point(175, 50), 20);
	 */
	getCurrentStyle: function() {
		return this._currentStyle;
	},

	setCurrentStyle: function(style) {
		// TODO: Style selected items with the style:
		this._currentStyle.initialize(style);
	},

	/**
	 * The index of the project in the {@link PaperScope#projects} list.
	 *
	 * @type Number
	 * @bean
	 */
	getIndex: function() {
		return this._index;
	},

	/**
	 * The selected items contained within the project.
	 *
	 * @type Item[]
	 * @bean
	 */
	getSelectedItems: function() {
		// TODO: Return groups if their children are all selected,
		// and filter out their children from the list.
		// TODO: The order of these items should be that of their
		// drawing order.
		var items = [];
		for (var id in this._selectedItems) {
			var item = this._selectedItems[id];
			if (item._drawCount === this._drawCount)
				items.push(item);
		}
		return items;
	},

	// DOCS: Project#options
	/**
	 * <b>options.handleSize:</b> 
	 * <b>options.hitTolerance:</b>
	 *
	 * @name Project#options
	 * @type Object
	 */

	// TODO: Implement setSelectedItems?

	_updateSelection: function(item) {
		if (item._selected) {
			this._selectedItemCount++;
			this._selectedItems[item._id] = item;
			// Make sure the item is considered selected right away if it is
			// part of the DOM, even before it's getting drawn for the first
			// time.
			if (item.isInserted())
				item._drawCount = this._drawCount;
		} else {
			this._selectedItemCount--;
			delete this._selectedItems[item._id];
		}
	},

	/**
	 * Selects all items in the project.
	 */
	selectAll: function() {
		for (var i = 0, l = this.layers.length; i < l; i++)
			this.layers[i].setSelected(true);
	},

	/**
	 * Deselects all selected items in the project.
	 */
	deselectAll: function() {
		for (var i in this._selectedItems)
			this._selectedItems[i].setSelected(false);
	},

	/**
	 * Perform a hit test on the items contained within the project at the
	 * location of the specified point.
	 * 
	 * The optional options object allows you to control the specifics of the
	 * hit test and may contain a combination of the following values:
	 * <b>options.tolerance:</b> {@code Number} - The tolerance of the hit test
	 * in points.
	 * <b>options.type:</b> Only hit test again a certain item
	 * type: {@link PathItem}, {@link Raster}, {@link TextItem}, etc.
	 * <b>options.fill:</b> {@code Boolean} - Hit test the fill of items.
	 * <b>options.stroke:</b> {@code Boolean} - Hit test the curves of path
	 * items, taking into account stroke width.
	 * <b>options.segments:</b> {@code Boolean} - Hit test for
	 * {@link Segment#point} of {@link Path} items.
	 * <b>options.handles:</b> {@code Boolean} - Hit test for the handles
	 * ({@link Segment#handleIn} / {@link Segment#handleOut}) of path segments.
	 * <b>options.ends:</b> {@code Boolean} - Only hit test for the first or
	 * last segment points of open path items.
	 * <b>options.bounds:</b> {@code Boolean} - Hit test the corners and
	 * side-centers of the bounding rectangle of items ({@link Item#bounds}).
	 * <b>options.center:</b> {@code Boolean} - Hit test the
	 * {@link Rectangle#center} of the bounding rectangle of items
	 * ({@link Item#bounds}).
	 * <b>options.guides:</b> {@code Boolean} - Hit test items that have
	 * {@link Item#guide} set to {@code true}.
	 * <b>options.selected:</b> {@code Boolean} - Only hit selected items.
	 *
	 * @param {Point} point The point where the hit test should be performed
	 * @param {Object} [options={ fill: true, stroke: true, segments: true,
	 * tolerance: true }]
	 * @return {HitResult} A hit result object that contains more
	 * information about what exactly was hit or {@code null} if nothing was
	 * hit.
	 */
	hitTest: function(point, options) {
		// We don't need to do this here, but it speeds up things since we won't
		// repeatetly convert in Item#hitTest() then.
		point = Point.read(arguments);
		options = HitResult.getOptions(Base.read(arguments));
		// Loop backwards, so layers that get drawn last are tested first
		for (var i = this.layers.length - 1; i >= 0; i--) {
			var res = this.layers[i].hitTest(point, options);
			if (res) return res;
		}
		return null;
	},

	// DOCS: document exportJSON (documented in @private Base)
	// DOCS: document importJSON
	// DOCS: Figure out a way to group these together with importSVG / exportSVG

	importJSON: function(json) {
		this.activate();
		return Base.importJSON(json);
	},

	/**
	 * {@grouptitle Project Hierarchy}
	 *
	 * The layers contained within the project.
	 *
	 * @name Project#layers
	 * @type Layer[]
	 */

	/**
	 * The layer which is currently active. New items will be created on this
	 * layer by default.
	 *
	 * @name Project#activeLayer
	 * @type Layer
	 */

	/**
	 * The symbols contained within the project.
	 *
	 * @name Project#symbols
	 * @type Symbol[]
	 */

	draw: function(ctx, matrix) {
		this._drawCount++;
		ctx.save();
		matrix.applyToContext(ctx);
		var param = {
			offset: new Point(0, 0),
			// A stack of concatenated matrices, to keep track of the current
			// global matrix, since Canvas is not able tell us (yet).
			transforms: [matrix]
		};
		for (var i = 0, l = this.layers.length; i < l; i++)
			this.layers[i].draw(ctx, param);
		ctx.restore();

		// Draw the selection of the selected items in the project:
		if (this._selectedItemCount > 0) {
			ctx.save();
			ctx.strokeWidth = 1;
			// TODO: use Layer#color
			ctx.strokeStyle = ctx.fillStyle = '#009dec';
			for (var id in this._selectedItems) {
				var item = this._selectedItems[id];
				if (item._drawCount === this._drawCount
						&& (item._drawSelected || item._boundsSelected)) {
					var mx = item._globalMatrix;
					if (item._drawSelected)
						item._drawSelected(ctx, mx);
					if (item._boundsSelected) {
						// We need to call the internal _getBounds, to get non-
						// transformed bounds.
						var coords = mx._transformCorners(
								item._getBounds('getBounds'));
						// Now draw a rectangle that connects the transformed
						// bounds corners, and draw the corners.
						ctx.beginPath();
						for (var i = 0; i < 8; i++)
							ctx[i === 0 ? 'moveTo' : 'lineTo'](
									coords[i], coords[++i]);
						ctx.closePath();
						ctx.stroke();
						for (var i = 0; i < 8; i++) {
							ctx.beginPath();
							ctx.rect(coords[i] - 2, coords[++i] - 2, 4, 4);
							ctx.fill();
						}
					}
				}
			}
			ctx.restore();
		}
	}
});

/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2013, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

/**
 * @name Symbol
 *
 * @class Symbols allow you to place multiple instances of an item in your
 * project. This can save memory, since all instances of a symbol simply refer
 * to the original item and it can speed up moving around complex objects, since
 * internal properties such as segment lists and gradient positions don't need
 * to be updated with every transformation.
 */
var Symbol = Base.extend(/** @lends Symbol# */{
	/**
	 * Creates a Symbol item.
	 *
	 * @param {Item} item the source item which is copied as the definition of
	 *               the symbol
	 * @param {Boolean} [dontCenter=false] 
	 * 
	 * @example {@paperscript split=true height=240}
	 * // Placing 100 instances of a symbol:
	 * var path = new Path.Star(new Point(0, 0), 6, 5, 13);
	 * path.style = {
	 *     fillColor: 'white',
	 *     strokeColor: 'black'
	 * };
	 *
	 * // Create a symbol from the path:
	 * var symbol = new Symbol(path);
	 *
	 * // Remove the path:
	 * path.remove();
	 *
	 * // Place 100 instances of the symbol:
	 * for (var i = 0; i < 100; i++) {
	 *     // Place an instance of the symbol in the project:
	 *     var instance = symbol.place();
	 *
	 *     // Move the instance to a random position within the view:
	 *     instance.position = Point.random() * view.size;
	 *
	 *     // Rotate the instance by a random amount between
	 *     // 0 and 360 degrees:
	 *     instance.rotate(Math.random() * 360);
	 *
	 *     // Scale the instance between 0.25 and 1:
	 *     instance.scale(0.25 + Math.random() * 0.75);
	 * }
	 */
	initialize: function Symbol(item, dontCenter) {
		// Define this Symbols's unique id.
		this._id = Symbol._id = (Symbol._id || 0) + 1;
		this.project = paper.project;
		this.project.symbols.push(this);
		if (item)
			this.setDefinition(item, dontCenter);
		// Hash to keep track of placed instances
		this._instances = {};
	},

	_serialize: function(options, dictionary) {
		return dictionary.add(this, function() {
			return Base.serialize([this.constructor.name, this._definition],
					options, false, dictionary);
		});
	},

	// TODO: Symbol#remove()
	// TODO: Symbol#name (accessible by name through project#symbols)

	/**
	 * The project that this symbol belongs to.
	 *
	 * @type Project
	 * @readonly
	 * @name Symbol#project
	 */

	/**
	 * Private notifier that is called whenever a change occurs in this symbol's
	 * definition.
	 *
	 * @param {ChangeFlag} flags describes what exactly has changed.
	 */
	_changed: function(flags) {
		// Notify all PlacedSymbols of the change in our definition, so they
		// can clear cached bounds.
		Base.each(this._instances, function(item) {
			item._changed(flags);
		});
	},

	/**
	 * The symbol definition.
	 *
	 * @type Item
	 * @bean
	 */
	getDefinition: function() {
		return this._definition;
	},

	setDefinition: function(item /*, dontCenter */) {
		// Make sure we're not steatling another symbol's definition
		if (item._parentSymbol)
			item = item.clone();
		// Remove previous definition's reference to this symbol
		if (this._definition)
			delete this._definition._parentSymbol;
		this._definition = item;
		// Remove item from DOM, as it's embedded in Symbol now.
		item.remove();
		item.setSelected(false);
		// Move position to 0, 0, so it's centered when placed.
		if (!arguments[1])
			item.setPosition(new Point());
		item._parentSymbol = this;
		this._changed(5);
	},

	/**
	 * Places in instance of the symbol in the project.
	 *
	 * @param [position] The position of the placed symbol.
	 * @return {PlacedSymbol}
	 */
	place: function(position) {
		return new PlacedSymbol(this, position);
	},

	/**
	 * Returns a copy of the symbol.
	 *
	 * @return {Symbol}
	 */
	clone: function() {
		return new Symbol(this._definition.clone());
	}
});


/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2013, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

/**
 * @name Item
 *
 * @class The Item type allows you to access and modify the items in
 * Paper.js projects. Its functionality is inherited by different project
 * item types such as {@link Path}, {@link CompoundPath}, {@link Group},
 * {@link Layer} and {@link Raster}. They each add a layer of functionality that
 * is unique to their type, but share the underlying properties and functions
 * that they inherit from Item.
 */
var Item = Base.extend(Callback, /** @lends Item# */{
	statics: {
		/**
		 * Override Item.extend() to merge the subclass' _serializeFields with
		 * the parent class' _serializeFields.
		 *
		 * @private
		 */
		extend: function extend(src) {
			if (src._serializeFields)
				src._serializeFields = Base.merge(
						this.prototype._serializeFields, src._serializeFields);
			var res = extend.base.apply(this, arguments),
				name = res.name;
			// Derive the _type string from constructor name
			if (name)
				res.prototype._type = Base.hyphenate(name);
			return res;
		}
	},

	// All items apply their matrix by default.
	// Exceptions are Raster, PlacedSymbol, Clip and Shape.
	_applyMatrix: true,
	_boundsSelected: false,
	// Provide information about fields to be serialized, with their defaults
	// that can be ommited.
	_serializeFields: {
		name: null,
		matrix: new Matrix(),
		locked: false,
		visible: true,
		blendMode: 'normal',
		opacity: 1,
		guide: false,
		clipMask: false,
		data: {}
	},

	initialize: function Item(point) {
		// Define this Item's unique id.
		this._id = Item._id = (Item._id || 0) + 1;
		// If _project is already set, the item was already moved into the DOM
		// hierarchy. Used by Layer, where it's added to project.layers instead
		if (!this._project) {
			var project = paper.project,
				layer = project.activeLayer;
			if (layer)
				layer.addChild(this);
			else
				this._setProject(project);
		}
		this._style = new Style(this._project._currentStyle);
		this._style._item = this;
		this._matrix = new Matrix();
		if (point)
			this._matrix.translate(point);
	},

	_events: new function() {

		// Flags defining which native events are required by which Paper events
		// as required for counting amount of necessary natives events.
		// The mapping is native -> virtual
		var mouseFlags = {
			mousedown: {
				mousedown: 1,
				mousedrag: 1,
				click: 1,
				doubleclick: 1
			},
			mouseup: {
				mouseup: 1,
				mousedrag: 1,
				click: 1,
				doubleclick: 1
			},
			mousemove: {
				mousedrag: 1,
				mousemove: 1,
				mouseenter: 1,
				mouseleave: 1
			}
		};

		// Entry for all mouse events in the _events list
		var mouseEvent = {
			install: function(type) {
				// If the view requires counting of installed mouse events,
				// increase the counters now according to mouseFlags
				var counters = this._project.view._eventCounters;
				if (counters) {
					for (var key in mouseFlags) {
						counters[key] = (counters[key] || 0)
								+ (mouseFlags[key][type] || 0);
					}
				}
			},
			uninstall: function(type) {
				// If the view requires counting of installed mouse events,
				// decrease the counters now according to mouseFlags
				var counters = this._project.view._eventCounters;
				if (counters) {
					for (var key in mouseFlags)
						counters[key] -= mouseFlags[key][type] || 0;
				}
			}
		};

		return Base.each(['onMouseDown', 'onMouseUp', 'onMouseDrag', 'onClick',
			'onDoubleClick', 'onMouseMove', 'onMouseEnter', 'onMouseLeave'],
			function(name) {
				this[name] = mouseEvent;
			}, {
				onFrame: {
					install: function() {
						this._project.view._animateItem(this, true);
					},
					uninstall: function() {
						this._project.view._animateItem(this, false);
					}
				},

				// Only for external sources, e.g. Raster
				onLoad: {}
			}
		);
	},

	_serialize: function(options, dictionary) {
		var props = {},
			that = this;

		function serialize(fields) {
			for (var key in fields) {
				var value = that[key];
				if (!Base.equals(value, fields[key]))
					props[key] = Base.serialize(value, options,
							// Do not use compact mode for data
							key !== 'data', dictionary);
			}
		}

		// Serialize fields that this Item subclass defines first
		serialize(this._serializeFields);
		// Serialize style fields, but only if they differ from defaults.
		// Do not serialize styles on Groups and Layers, since they just unify
		// their children's own styles.
		if (!(this instanceof Group))
			serialize(this._style._defaults);
		// There is no compact form for Item serialization, we always keep the
		// type.
		return [ this.constructor.name, props ];
	},

	/**
	 * Private notifier that is called whenever a change occurs in this item or
	 * its sub-elements, such as Segments, Curves, Styles, etc.
	 *
	 * @param {ChangeFlag} flags describes what exactly has changed.
	 */
	_changed: function(flags) {
		if (flags & 4) {
			// Clear cached bounds and position whenever geometry changes
			delete this._bounds;
			delete this._position;
		}
		if (this._parent
				&& (flags & (4 | 8))) {
			// Clear cached bounds of all items that this item contributes to.
			// We call this on the parent, since the information is cached on
			// the parent, see getBounds().
			this._parent._clearBoundsCache();
		}
		if (flags & 2) {
			// Clear cached bounds of all items that this item contributes to.
			// We don't call this on the parent, since we're already the parent
			// of the child that modified the hierarchy (that's where these
			// HIERARCHY notifications go)
			this._clearBoundsCache();
		}
		if (flags & 1) {
			this._project._needsRedraw = true;
		}
		// If this item is a symbol's definition, notify it of the change too
		if (this._parentSymbol)
			this._parentSymbol._changed(flags);
		// Have project keep track of changed items, so they can be iterated.
		// This can be used for example to update the SVG tree. Needs to be
		// activated in Project
		if (this._project._changes) {
			var entry = this._project._changesById[this._id];
			if (entry) {
				entry.flags |= flags;
			} else {
				entry = { item: this, flags: flags };
				this._project._changesById[this._id] = entry;
				this._project._changes.push(entry);
			}
		}
	},

	/**
	 * Sets those properties of the passed object literal on this item to
	 * the values defined in the object literal, if the item has property of the
	 * given name (or a setter defined for it).
	 * @param {Object} props
	 * @return {Item} the item itself.
	 *
	 * @example {@paperscript}
	 * // Setting properties through an object literal
	 * var circle = new Path.Circle({
	 * 	center: [80, 50],
	 * 	radius: 35
	 * });
	 * 
	 * circle.set({
	 * 	strokeColor: 'red',
	 * 	strokeWidth: 10,
	 * 	fillColor: 'black',
	 * 	selected: true
	 * });
	 */
	set: function(props) {
		if (props)
			this._set(props);
		return this;
	},

	/**
	 * The unique id of the item.
	 *
	 * @type Number
	 * @bean
	 */
	getId: function() {
		return this._id;
	},

	/**
	 * The type of the item as a string.
	 *
	 * @type String('group', 'layer', 'path', 'compound-path', 'raster',
	 * 'placed-symbol', 'point-text')
	 * @bean
	 */
	getType: function() {
		return this._type;
	},

	/**
	 * The name of the item. If the item has a name, it can be accessed by name
	 * through its parent's children list.
	 *
	 * @type String
	 * @bean
	 *
	 * @example {@paperscript}
	 * var path = new Path.Circle({
	 * 	center: [80, 50],
	 * 	radius: 35
	 * });

	 * // Set the name of the path:
	 * path.name = 'example';
	 *
	 * // Create a group and add path to it as a child:
	 * var group = new Group();
	 * group.addChild(path);
	 *
	 * // The path can be accessed by name:
	 * group.children['example'].fillColor = 'red';
	 */
	getName: function() {
		return this._name;
	},

	setName: function(name, unique) {
		// Note: Don't check if the name has changed and bail out if it has not,
		// because setName is used internally also to update internal structures
		// when an item is moved from one parent to another.

		// If the item already had a name, remove the reference to it from the
		// parent's children object:
		if (this._name)
			this._removeFromNamed();
		if (name && this._parent) {
			var children = this._parent._children,
				namedChildren = this._parent._namedChildren,
				orig = name,
				i = 1;
			// If unique is true, make sure we're not overriding other names
			while (unique && children[name])
				name = orig + ' ' + (i++);
			(namedChildren[name] = namedChildren[name] || []).push(this);
			children[name] = this;
		}
		this._name = name || undefined;
		this._changed(32);
	},

	/**
	 * The path style of the item.
	 *
	 * @name Item#getStyle
	 * @type Style
	 * @bean
	 *
	 * @example {@paperscript}
	 * // Applying several styles to an item in one go, by passing an object
	 * // to its style property:
	 * var circle = new Path.Circle({
	 * 	center: [80, 50],
	 * 	radius: 30
	 * });
	 * circle.style = {
	 * 	fillColor: 'blue',
	 * 	strokeColor: 'red',
	 * 	strokeWidth: 5
	 * };
	 *
	 * @example {@paperscript split=true height=100}
	 * // Copying the style of another item:
	 * var path = new Path.Circle({
	 * 	center: [50, 50],
	 * 	radius: 30,
	 * 	fillColor: 'red'
	 * });
	 *
	 * var path2 = new Path.Circle({
	 * 	center: new Point(180, 50),
	 * 	radius: 20
	 * });
	 * 
	 * // Copy the path style of path:
	 * path2.style = path.style;
	 *
	 * @example {@paperscript}
	 * // Applying the same style object to multiple items:
	 * var myStyle = {
	 * 	fillColor: 'red',
	 * 	strokeColor: 'blue',
	 * 	strokeWidth: 4
	 * };
	 *
	 * var path = new Path.Circle({
	 * 	center: [50, 50],
	 * 	radius: 30
	 * });
	 * path.style = myStyle;
	 *
	 * var path2 = new Path.Circle({
	 * 	center: new Point(150, 50),
	 * 	radius: 20
	 * });
	 * path2.style = myStyle;
	 */
	getStyle: function() {
		return this._style;
	},

	setStyle: function(style) {
		this._style.initialize(style);
	},

	hasFill: function() {
		return !!this._style.getFillColor();
	}
}, Base.each(['locked', 'visible', 'blendMode', 'opacity', 'guide'],
	// Produce getter/setters for properties. We need setters because we want to
	// call _changed() if a property was modified.
	function(name) {
		var part = Base.capitalize(name),
			name = '_' + name;
		this['get' + part] = function() {
			return this[name];
		};
		this['set' + part] = function(value) {
			if (value != this[name]) {
				this[name] = value;
				// #locked does not change appearance, all others do:
				this._changed(name === '_locked'
						? 32 : 33);
			}
		};
}, {}), /** @lends Item# */{
	// Note: These properties have their getter / setters produced in the
	// injection scope above.

	/**
	 * Specifies whether the item is locked.
	 *
	 * @name Item#locked
	 * @type Boolean
	 * @default false
	 * @ignore
	 */
	_locked: false,

	/**
	 * Specifies whether the item is visible. When set to {@code false}, the
	 * item won't be drawn.
	 *
	 * @name Item#visible
	 * @type Boolean
	 * @default true
	 *
	 * @example {@paperscript}
	 * // Hiding an item:
	 * var path = new Path.Circle({
	 * 	center: [50, 50],
	 * 	radius: 20,
	 * 	fillColor: 'red'
	 * });
	 *
	 * // Hide the path:
	 * path.visible = false;
	 */
	_visible: true,

	/**
	 * The blend mode of the item.
	 *
	 * @name Item#blendMode
	 * @type String('normal', 'multiply', 'screen', 'overlay', 'soft-light',
	 * 'hard-light', 'color-dodge', 'color-burn', 'darken', 'lighten',
	 * 'difference', 'exclusion', 'hue', 'saturation', 'luminosity', 'color',
	 * 'add', 'subtract', 'average', 'pin-light', 'negation')
	 * @default 'normal'
	 *
	 * @example {@paperscript}
	 * // Setting an item's blend mode:
	 *
	 * // Create a white rectangle in the background
	 * // with the same dimensions as the view:
	 * var background = new Path.Rectangle(view.bounds);
	 * background.fillColor = 'white';
	 *
	 * var circle = new Path.Circle({
	 * 	center: [80, 50],
	 * 	radius: 35,
	 * 	fillColor: 'red'
	 * });
	 *
	 * var circle2 = new Path.Circle({
	 * 	center: new Point(120, 50),
	 * 	radius: 35,
	 * 	fillColor: 'blue'
	 * });
	 *
	 * // Set the blend mode of circle2:
	 * circle2.blendMode = 'multiply';
	 */
	_blendMode: 'normal',

	/**
	 * The opacity of the item as a value between {@code 0} and {@code 1}.
	 *
	 * @name Item#opacity
	 * @type Number
	 * @default 1
	 *
	 * @example {@paperscript}
	 * // Making an item 50% transparent:
	 * var circle = new Path.Circle({
	 * 	center: [80, 50],
	 * 	radius: 35,
	 * 	fillColor: 'red'
	 * });
     *
	 * var circle2 = new Path.Circle({
	 * 	center: new Point(120, 50),
	 * 	radius: 35,
	 * 	fillColor: 'blue',
	 * 	strokeColor: 'green',
	 * 	strokeWidth: 10
	 * });
	 *
	 * // Make circle2 50% transparent:
	 * circle2.opacity = 0.5;
	 */
	_opacity: 1,

	// TODO: Implement guides
	/**
	 * Specifies whether the item functions as a guide. When set to
	 * {@code true}, the item will be drawn at the end as a guide.
	 *
	 * @name Item#guide
	 * @type Boolean
	 * @default true
	 * @ignore
	 */
	_guide: false,

	/**
	 * Specifies whether an item is selected and will also return {@code true}
	 * if the item is partially selected (groups with some selected or partially
	 * selected paths).
	 *
	 * Paper.js draws the visual outlines of selected items on top of your
	 * project. This can be useful for debugging, as it allows you to see the
	 * construction of paths, position of path curves, individual segment points
	 * and bounding boxes of symbol and raster items.
	 *
	 * @type Boolean
	 * @default false
	 * @bean
	 * @see Project#selectedItems
	 * @see Segment#selected
	 * @see Point#selected
	 *
	 * @example {@paperscript}
	 * // Selecting an item:
	 * var path = new Path.Circle({
	 * 	center: [80, 50],
	 * 	radius: 35
	 * });
	 * path.selected = true; // Select the path
	 */
	isSelected: function() {
		if (this._children) {
			for (var i = 0, l = this._children.length; i < l; i++)
				if (this._children[i].isSelected())
					return true;
		}
		return this._selected;
	},

	setSelected: function(selected /*, noChildren */) {
		// Don't recursively call #setSelected() if it was called with
		// noChildren set to true, see #setFullySelected().
		if (this._children && !arguments[1]) {
			for (var i = 0, l = this._children.length; i < l; i++)
				this._children[i].setSelected(selected);
		}
		if ((selected = !!selected) != this._selected) {
			this._selected = selected;
			this._project._updateSelection(this);
			this._changed(33);
		}
	},

	_selected: false,

	isFullySelected: function() {
		if (this._children && this._selected) {
			for (var i = 0, l = this._children.length; i < l; i++)
				if (!this._children[i].isFullySelected())
					return false;
			return true;
		}
		// If there are no children, this is the same as #selected
		return this._selected;
	},

	setFullySelected: function(selected) {
		if (this._children) {
			for (var i = 0, l = this._children.length; i < l; i++)
				this._children[i].setFullySelected(selected);
		}
		// Pass true for hidden noChildren argument
		this.setSelected(selected, true);
	},

	/**
	 * Specifies whether the item defines a clip mask. This can only be set on
	 * paths, compound paths, and text frame objects, and only if the item is
	 * already contained within a clipping group.
	 *
	 * @type Boolean
	 * @default false
	 * @bean
	 */
	isClipMask: function() {
		return this._clipMask;
	},

	setClipMask: function(clipMask) {
		// On-the-fly conversion to boolean:
		if (this._clipMask != (clipMask = !!clipMask)) {
			this._clipMask = clipMask;
			if (clipMask) {
				this.setFillColor(null);
				this.setStrokeColor(null);
			}
			this._changed(33);
			// Tell the parent the clipping mask has changed
			if (this._parent)
				this._parent._changed(256);
		}
	},

	_clipMask: false,

	// TODO: get/setIsolated (print specific feature)
	// TODO: get/setKnockout (print specific feature)
	// TODO: get/setAlphaIsShape

	/**
	 * A plain javascript object which can be used to store
	 * arbitrary data on the item.
	 *
	 * @type Object
	 * @bean
	 *
	 * @example
	 * var path = new Path();
	 * path.data.remember = 'milk';
	 * 
	 * @example
	 * var path = new Path();
	 * path.data.malcolm = new Point(20, 30);
	 * console.log(path.data.malcolm.x); // 20
	 * 
	 * @example
	 * var path = new Path();
	 * path.data = {
	 * 	home: 'Omicron Theta',
	 * 	found: 2338,
	 * 	pets: ['Spot']
	 * };
	 * console.log(path.data.pets.length); // 1
	 * 
	 * @example
	 * var path = new Path({
	 * 	data: {
	 * 		home: 'Omicron Theta',
	 * 		found: 2338,
	 * 		pets: ['Spot']
	 * 	}
	 * });
	 * console.log(path.data.pets.length); // 1
	 */
	getData: function() {
		if (!this._data)
			this._data = {};
		return this._data;
	},

	setData: function(data) {
		this._data = data;		
	},

	/**
	 * {@grouptitle Position and Bounding Boxes}
	 *
	 * The item's position within the project. This is the
	 * {@link Rectangle#center} of the item's {@link #bounds} rectangle.
	 *
	 * @type Point
	 * @bean
	 *
	 * @example {@paperscript}
	 * // Changing the position of a path:
	 *
	 * // Create a circle at position { x: 10, y: 10 }
	 * var circle = new Path.Circle({
	 * 	center: new Point(10, 10),
	 * 	radius: 10,
	 * 	fillColor: 'red'
	 * });
	 *
	 * // Move the circle to { x: 20, y: 20 }
	 * circle.position = new Point(20, 20);
	 *
	 * // Move the circle 100 points to the right and 50 points down
	 * circle.position += new Point(100, 50);
	 *
	 * @example {@paperscript split=true height=100}
	 * // Changing the x coordinate of an item's position:
	 *
	 * // Create a circle at position { x: 20, y: 20 }
	 * var circle = new Path.Circle({
	 * 	center: new Point(20, 20),
	 * 	radius: 10,
	 * 	fillColor: 'red'
	 * });
	 *
	 * // Move the circle 100 points to the right
	 * circle.position.x += 100;
	 */
	getPosition: function(/* dontLink */) {
		// Cache position value.
		// Pass true for dontLink in getCenter(), so receive back a normal point
		var pos = this._position
				|| (this._position = this.getBounds().getCenter(true));
		// Do not cache LinkedPoints directly, since we would not be able to
		// use them to calculate the difference in #setPosition, as when it is
		// modified, it would hold new values already and only then cause the
		// calling of #setPosition.
		return arguments[0] ? pos
				: LinkedPoint.create(this, 'setPosition', pos.x, pos.y);
	},

	setPosition: function(point) {
		// Calculate the distance to the current position, by which to
		// translate the item. Pass true for dontLink, as we do not need a
		// LinkedPoint to simply calculate this distance.
		this.translate(Point.read(arguments).subtract(this.getPosition(true)));
	},

	/**
	 * The item's transformation matrix, defining position and dimensions in the
	 * document.
	 *
	 * @type Matrix
	 * @bean
	 */
	getMatrix: function() {
		return this._matrix;
	},

	setMatrix: function(matrix) {
		// Use Matrix#initialize to easily copy over values.
		this._matrix.initialize(matrix);
		this._changed(5);
	},

	/**
	 * Specifies wether the item has any content or not. The meaning of what
	 * content is differs from type to type. For example, a {@link Group} with
	 * no children, a {@link TextItem} with no text content and a {@link Path}
	 * with no segments all are considered empty.
	 *
	 * @type Boolean
	 */
	isEmpty: function() {
		return this._children.length == 0;
	}
}, Base.each(['getBounds', 'getStrokeBounds', 'getHandleBounds', 'getRoughBounds'],
	function(name) {
		// Produce getters for bounds properties. These handle caching, matrices
		// and redirect the call to the private _getBounds, which can be
		// overridden by subclasses, see below.
		this[name] = function(/* matrix */) {
			var getter = this._boundsGetter,
				// Allow subclasses to override _boundsGetter if they use
				// the same calculations for multiple type of bounds.
				// The default is name:
				bounds = this._getCachedBounds(typeof getter == 'string'
						? getter : getter && getter[name] || name, arguments[0]);
			// If we're returning 'bounds', create a LinkedRectangle that uses
			// the setBounds() setter to update the Item whenever the bounds are
			// changed:
			return name == 'getBounds'
					? LinkedRectangle.create(this, 'setBounds',
							bounds.x, bounds.y, bounds.width, bounds.height) 
					// Return a clone of the cahce, so modifications won't
					// affect it.
					: bounds;
		};
	},
/** @lends Item# */{
	/**
	 * Private method that deals with the calling of _getBounds, recursive
	 * matrix concatenation and handles all the complicated caching mechanisms.
	 */
	_getCachedBounds: function(getter, matrix, cacheItem) {
		// See if we can cache these bounds. We only cache the bounds
		// transformed with the internally stored _matrix, (the default if no
		// matrix is passed).
		var cache = (!matrix || matrix.equals(this._matrix)) && getter;
		// Set up a boundsCache structure that keeps track of items that keep
		// cached bounds that depend on this item. We store this in our parent,
		// for multiple reasons:
		// The parent receives HIERARCHY change notifications for when its
		// children are added or removed and can thus clear the cache, and we
		// save a lot of memory, e.g. when grouping 100 items and asking the
		// group for its bounds. If stored on the children, we would have 100
		// times the same structure.
		// Note: This needs to happen before returning cached values, since even
		// then, _boundsCache needs to be kept up-to-date.
		if (cacheItem && this._parent) {
			// Set-up the parent's boundsCache structure if it does not
			// exist yet and add the cacheItem to it.
			var id = cacheItem._id,
				ref = this._parent._boundsCache
					= this._parent._boundsCache || {
				// Use both a hashtable for ids and an array for the list,
				// so we can keep track of items that were added already
				ids: {},
				list: []
			};
			if (!ref.ids[id]) {
				ref.list.push(cacheItem);
				ref.ids[id] = cacheItem;
			}
		}
		if (cache && this._bounds && this._bounds[cache])
			return this._bounds[cache].clone();
		// If the result of concatinating the passed matrix with our internal
		// one is an identity transformation, set it to null for faster
		// processing
		var identity = this._matrix.isIdentity();
		matrix = !matrix || matrix.isIdentity()
				? identity ? null : this._matrix
				: identity ? matrix : matrix.clone().concatenate(this._matrix);
		// If we're caching bounds on this item, pass it on as cacheItem, so the
		// children can setup the _boundsCache structures for it.
		var bounds = this._getBounds(getter, matrix, cache ? this : cacheItem);
		// If we can cache the result, update the _bounds cache structure
		// before returning
		if (cache) {
			if (!this._bounds)
				this._bounds = {};
			this._bounds[cache] = bounds.clone();
		}
		return bounds;
	},

	/**
	 * Clears cached bounds of all items that the children of this item are
	 * contributing to. See #_getCachedBounds() for an explanation why this
	 * information is stored on parents, not the children themselves.
	 */
	_clearBoundsCache: function() {
		if (this._boundsCache) {
			for (var i = 0, list = this._boundsCache.list, l = list.length;
					i < l; i++) {
				var item = list[i];
				delete item._bounds;
				// We need to recursively call _clearBoundsCache, because if the
				// cache for this item's children is not valid anymore, that
				// propagates up the DOM tree.
				if (item != this && item._boundsCache)
					item._clearBoundsCache();
			}
			delete this._boundsCache;
		}
	},

	/**
	 * Protected method used in all the bounds getters. It loops through all the
	 * children, gets their bounds and finds the bounds around all of them.
	 * Subclasses override it to define calculations for the various required
	 * bounding types.
	 */
	_getBounds: function(getter, matrix, cacheItem) {
		// Note: We cannot cache these results here, since we do not get
		// _changed() notifications here for changing geometry in children.
		// But cacheName is used in sub-classes such as PlacedSymbol and Raster.
		var children = this._children;
		// TODO: What to return if nothing is defined, e.g. empty Groups?
		// Scriptographer behaves weirdly then too.
		if (!children || children.length == 0)
			return new Rectangle();
		var x1 = Infinity,
			x2 = -x1,
			y1 = x1,
			y2 = x2;
		for (var i = 0, l = children.length; i < l; i++) {
			var child = children[i];
			if (child._visible && !child.isEmpty()) {
				var rect = child._getCachedBounds(getter, matrix, cacheItem);
				x1 = Math.min(rect.x, x1);
				y1 = Math.min(rect.y, y1);
				x2 = Math.max(rect.x + rect.width, x2);
				y2 = Math.max(rect.y + rect.height, y2);
			}
		}
		return isFinite(x1)
				? new Rectangle(x1, y1, x2 - x1, y2 - y1)
				: new Rectangle();
	},

	setBounds: function(rect) {
		rect = Rectangle.read(arguments);
		var bounds = this.getBounds(),
			matrix = new Matrix(),
			center = rect.getCenter();
		// Read this from bottom to top:
		// Translate to new center:
		matrix.translate(center);
		// Scale to new Size, if size changes and avoid divisions by 0:
		if (rect.width != bounds.width || rect.height != bounds.height) {
			matrix.scale(
					bounds.width != 0 ? rect.width / bounds.width : 1,
					bounds.height != 0 ? rect.height / bounds.height : 1);
		}
		// Translate to bounds center:
		center = bounds.getCenter();
		matrix.translate(-center.x, -center.y);
		// Now execute the transformation
		this.transform(matrix);
	}

	/**
	 * The bounding rectangle of the item excluding stroke width.
	 *
	 * @name Item#getBounds
	 * @type Rectangle
	 * @bean
	 */

	/**
	 * The bounding rectangle of the item including stroke width.
	 *
	 * @name Item#getStrokeBounds
	 * @type Rectangle
	 * @bean
	 */

	/**
	 * The bounding rectangle of the item including handles.
	 *
	 * @name Item#getHandleBounds
	 * @type Rectangle
	 * @bean
	 */

	/**
	 * The rough bounding rectangle of the item that is shure to include all of
	 * the drawing, including stroke width.
	 *
	 * @name Item#getRoughBounds
	 * @type Rectangle
	 * @bean
	 * @ignore
	 */
}), /** @lends Item# */{
	/**
	 * {@grouptitle Project Hierarchy}
	 * The project that this item belongs to.
	 *
	 * @type Project
	 * @bean
	 */
	getProject: function() {
		return this._project;
	},

	_setProject: function(project) {
		if (this._project != project) {
			this._project = project;
			if (this._children) {
				for (var i = 0, l = this._children.length; i < l; i++) {
					this._children[i]._setProject(project);
				}
			}
		}
	},

	/**
	 * The layer that this item is contained within.
	 *
	 * @type Layer
	 * @bean
	 */
	getLayer: function() {
		var parent = this;
		while (parent = parent._parent) {
			if (parent instanceof Layer)
				return parent;
		}
		return null;
	},

	/**
	 * The item that this item is contained within.
	 *
	 * @type Item
	 * @bean
	 *
	 * @example
	 * var path = new Path();
	 *
	 * // New items are placed in the active layer:
	 * console.log(path.parent == project.activeLayer); // true
	 *
	 * var group = new Group();
	 * group.addChild(path);
	 *
	 * // Now the parent of the path has become the group:
	 * console.log(path.parent == group); // true
	 * 
	 * @example // Setting the parent of the item to another item
	 * var path = new Path();
	 *
	 * // New items are placed in the active layer:
	 * console.log(path.parent == project.activeLayer); // true
	 *
	 * var group = new Group();
	 * group.parent = path;
	 *
	 * // Now the parent of the path has become the group:
	 * console.log(path.parent == group); // true
	 * 
	 * // The path is now contained in the children list of group:
	 * console.log(group.children[0] == path); // true
	 * 
	 * @example // Setting the parent of an item in the constructor
	 * var group = new Group();
	 * 
	 * var path = new Path({
	 * 	parent: group
	 * });
	 * 
	 * // The parent of the path is the group:
	 * console.log(path.parent == group); // true
	 * 
	 * // The path is contained in the children list of group:
	 * console.log(group.children[0] == path); // true
	 */
	getParent: function() {
		return this._parent;
	},

	setParent: function(item) {
		return item.addChild(this);
	},

	/**
	 * The children items contained within this item. Items that define a
	 * {@link #name} can also be accessed by name.
	 *
	 * <b>Please note:</b> The children array should not be modified directly
	 * using array functions. To remove single items from the children list, use
	 * {@link Item#remove()}, to remove all items from the children list, use
	 * {@link Item#removeChildren()}. To add items to the children list, use
	 * {@link Item#addChild(item)} or {@link Item#insertChild(index,item)}.
	 *
	 * @type Item[]
	 * @bean
	 *
	 * @example {@paperscript}
	 * // Accessing items in the children array:
	 * var path = new Path.Circle({
	 * 	center: [80, 50],
	 * 	radius: 35
	 * });
	 *
	 * // Create a group and move the path into it:
	 * var group = new Group();
	 * group.addChild(path);
	 *
	 * // Access the path through the group's children array:
	 * group.children[0].fillColor = 'red';
	 *
	 * @example {@paperscript}
	 * // Accessing children by name:
	 * var path = new Path.Circle({
	 * 	center: [80, 50],
	 * 	radius: 35
	 * });
	 * // Set the name of the path:
	 * path.name = 'example';
	 *
	 * // Create a group and move the path into it:
	 * var group = new Group();
	 * group.addChild(path);
	 *
	 * // The path can be accessed by name:
	 * group.children['example'].fillColor = 'orange';
	 *
	 * @example {@paperscript}
	 * // Passing an array of items to item.children:
	 * var path = new Path.Circle({
	 * 	center: [80, 50],
	 * 	radius: 35
	 * });
	 *
	 * var group = new Group();
	 * group.children = [path];
	 *
	 * // The path is the first child of the group:
	 * group.firstChild.fillColor = 'green';
	 */
	getChildren: function() {
		return this._children;
	},

	setChildren: function(items) {
		this.removeChildren();
		this.addChildren(items);
	},

	/**
	 * The first item contained within this item. This is a shortcut for
	 * accessing {@code item.children[0]}.
	 *
	 * @type Item
	 * @bean
	 */
	getFirstChild: function() {
		return this._children && this._children[0] || null;
	},

	/**
	 * The last item contained within this item.This is a shortcut for
	 * accessing {@code item.children[item.children.length - 1]}.
	 *
	 * @type Item
	 * @bean
	 */
	getLastChild: function() {
		return this._children && this._children[this._children.length - 1]
				|| null;
	},

	/**
	 * The next item on the same level as this item.
	 *
	 * @type Item
	 * @bean
	 */
	getNextSibling: function() {
		return this._parent && this._parent._children[this._index + 1] || null;
	},

	/**
	 * The previous item on the same level as this item.
	 *
	 * @type Item
	 * @bean
	 */
	getPreviousSibling: function() {
		return this._parent && this._parent._children[this._index - 1] || null;
	},

	/**
	 * The index of this item within the list of its parent's children.
	 *
	 * @type Number
	 * @bean
	 */
	getIndex: function() {
		return this._index;
	},

	/**
	 * Checks whether the item and all its parents are inserted into the DOM or
	 * not.
	 *
	 * @return {Boolean} {@true if the item is inserted into the DOM}
	 */
	isInserted: function() {
		return this._parent ? this._parent.isInserted() : false;
	},

	/**
	 * Clones the item within the same project and places the copy above the
	 * item.
	 *
	 * @return {Item} the newly cloned item
	 *
	 * @example {@paperscript}
	 * // Cloning items:
	 * var circle = new Path.Circle({
	 * 	center: [50, 50],
	 * 	radius: 10,
	 * 	fillColor: 'red'
	 * });
	 *
	 * // Make 20 copies of the circle:
	 * for (var i = 0; i < 20; i++) {
	 * 	var copy = circle.clone();
	 *
	 * 	// Distribute the copies horizontally, so we can see them:
	 * 	copy.position.x += i * copy.bounds.width;
	 * }
	 */
	clone: function() {
		return this._clone(new this.constructor());
	},

	_clone: function(copy) {
		// Copy over style
		copy.setStyle(this._style);
		// If this item has children, clone and append each of them:
		if (this._children) {
			// Clone all children and add them to the copy. tell #addChild we're
			// cloning, as needed by CompoundPath#insertChild().
			for (var i = 0, l = this._children.length; i < l; i++)
				copy.addChild(this._children[i].clone(), true);
		}
		// Only copy over these fields if they are actually defined in 'this'
		// TODO: Consider moving this to Base once it's useful in more than one
		// place
		var keys = ['_locked', '_visible', '_blendMode', '_opacity',
				'_clipMask', '_guide'];
		for (var i = 0, l = keys.length; i < l; i++) {
			var key = keys[i];
			if (this.hasOwnProperty(key))
				copy[key] = this[key];
		}
		// Use Matrix#initialize to easily copy over values.
		copy._matrix.initialize(this._matrix);
		// Copy over the selection state, use setSelected so the item
		// is also added to Project#selectedItems if it is selected.
		copy.setSelected(this._selected);
		// Clone the name too, but make sure we're not overriding the original
		// in the same parent, by passing true for the unique parameter.
		if (this._name)
			copy.setName(this._name, true);
		return copy;
	},

	/**
	 * When passed a project, copies the item to the project,
	 * or duplicates it within the same project. When passed an item,
	 * copies the item into the specified item.
	 *
	 * @param {Project|Layer|Group|CompoundPath} item the item or project to
	 * copy the item to
	 * @return {Item} the new copy of the item
	 */
	copyTo: function(itemOrProject) {
		var copy = this.clone();
		if (itemOrProject.layers) {
			itemOrProject.activeLayer.addChild(copy);
		} else {
			itemOrProject.addChild(copy);
		}
		return copy;
	},

	/**
	 * Rasterizes the item into a newly created Raster object. The item itself
	 * is not removed after rasterization.
	 *
	 * @param {Number} [resolution=72] the resolution of the raster in dpi
	 * @return {Raster} the newly created raster item
	 *
	 * @example {@paperscript}
	 * // Rasterizing an item:
	 * var circle = new Path.Circle({
	 * 	center: [50, 50],
	 * 	radius: 5,
	 * 	fillColor: 'red'
	 * });
	 *
	 * // Create a rasterized version of the path:
	 * var raster = circle.rasterize();
	 *
	 * // Move it 100pt to the right:
	 * raster.position.x += 100;
	 *
	 * // Scale the path and the raster by 300%, so we can compare them:
	 * circle.scale(5);
	 * raster.scale(5);
	 */
	rasterize: function(resolution) {
		var bounds = this.getStrokeBounds(),
			scale = (resolution || 72) / 72,
			canvas = CanvasProvider.getCanvas(bounds.getSize().multiply(scale)),
			ctx = canvas.getContext('2d'),
			matrix = new Matrix().scale(scale).translate(-bounds.x, -bounds.y);
		ctx.save();
		matrix.applyToContext(ctx);
		this.draw(ctx, { transforms: [matrix] });
		var raster = new Raster(canvas);
		raster.setBounds(bounds);
		ctx.restore();
		// NOTE: We don't need to release the canvas since it now belongs to the
		// Raster!
		return raster;
	},

	/**
	 * Checks wether the item's geometry contains the given point.
	 * 
	 * @example {@paperscript} // Click within and outside the star below
	 * // Create a star shaped path:
	 * var path = new Path.Star({
	 * 	center: [50, 50],
	 * 	points: 12,
	 * 	radius1: 20,
	 * 	radius2: 40,
	 * 	fillColor: 'black'
	 * });
	 * 
	 * // Whenever the user presses the mouse:
	 * function onMouseDown(event) {
	 * 	// If the position of the mouse is within the path,
	 * 	// set its fill color to red, otherwise set it to
	 * 	// black:
	 * 	if (path.contains(event.point)) {
	 * 		path.fillColor = 'red';
	 * 	} else {
	 * 		path.fillColor = 'black';
	 * 	}
	 * }
	 * 
	 * @param {Point} point The point to check for.
	 */
	contains: function(point) {
		// See CompoundPath#_contains() for the reason for !!
		return !!this._contains(
				this._matrix._inverseTransform(Point.read(arguments)));
	},

	_contains: function(point) {
		if (this._children) {
			for (var i = this._children.length - 1; i >= 0; i--) {
				if (this._children[i].contains(point))
					return true;
			}
			return false;
		}
		// We only implement it here for items with rectangular content,
		// for anything else we need to override #contains()
		return point.isInside(this._getBounds('getBounds'));
	},

	/**
	 * Perform a hit test on the item (and its children, if it is a
	 * {@link Group} or {@link Layer}) at the location of the specified point.
	 * 
	 * The optional options object allows you to control the specifics of the
	 * hit test and may contain a combination of the following values:
	 * <b>tolerance:</b> {@code Number} - The tolerance of the hit test in
	 * points.
	 * <b>options.type:</b> Only hit test again a certain item
	 * type: {@link PathItem}, {@link Raster}, {@link TextItem}, etc.
	 * <b>options.fill:</b> {@code Boolean} - Hit test the fill of items.
	 * <b>options.stroke:</b> {@code Boolean} - Hit test the curves of path
	 * items, taking into account stroke width.
	 * <b>options.segment:</b> {@code Boolean} - Hit test for
	 * {@link Segment#point} of {@link Path} items.
	 * <b>options.handles:</b> {@code Boolean} - Hit test for the handles
	 * ({@link Segment#handleIn} / {@link Segment#handleOut}) of path segments.
	 * <b>options.ends:</b> {@code Boolean} - Only hit test for the first or
	 * last segment points of open path items.
	 * <b>options.bounds:</b> {@code Boolean} - Hit test the corners and
	 * side-centers of the bounding rectangle of items ({@link Item#bounds}).
	 * <b>options.center:</b> {@code Boolean} - Hit test the
	 * {@link Rectangle#center} of the bounding rectangle of items
	 * ({@link Item#bounds}).
	 * <b>options.guides:</b> {@code Boolean} - Hit test items that have
	 * {@link Item#guide} set to {@code true}.
	 * <b>options.selected:</b> {@code Boolean} - Only hit selected items.
	 *
	 * @param {Point} point The point where the hit test should be performed
	 * @param {Object} [options={ fill: true, stroke: true, segments: true,
	 * tolerance: 2 }]
	 * @return {HitResult} A hit result object that contains more
	 * information about what exactly was hit or {@code null} if nothing was
	 * hit.
	 */
	hitTest: function(point, options) {
		function checkBounds(type, part) {
			var pt = bounds['get' + part]();
			// TODO: We need to transform the point back to the coordinate
			// system of the DOM level on which the inquiry was started!
			if (point.getDistance(pt) < options.tolerance)
				return new HitResult(type, that,
						{ name: Base.hyphenate(part), point: pt });
		}

		if (this._locked)
			return null;

		point = Point.read(arguments);
		options = HitResult.getOptions(Base.read(arguments));
		// Check if the point is withing roughBounds + tolerance, but only if
		// this item does not have children, since we'd have to travel up the
		// chain already to determine the rough bounds.
		if (!this._children && !this.getRoughBounds()
				.expand(options.tolerance)._containsPoint(point))
			return null;
		// Transform point to local coordinates but use untransformed point
		// for bounds check above.
		point = this._matrix._inverseTransform(point);
		if ((options.center || options.bounds) &&
				// Ignore top level layers:
				!(this instanceof Layer && !this._parent)) {
			// Don't get the transformed bounds, check against transformed
			// points instead
			var bounds = this.getBounds(),
				that = this,
				// TODO: Move these into a private scope
				points = ['TopLeft', 'TopRight', 'BottomLeft', 'BottomRight',
				'LeftCenter', 'TopCenter', 'RightCenter', 'BottomCenter'],
				res;
			if (options.center && (res = checkBounds('center', 'Center')))
				return res;
			if (options.bounds) {
				for (var i = 0; i < 8; i++)
					if (res = checkBounds('bounds', points[i]))
						return res;
			}
		}

		// TODO: Support option.type even for things like CompoundPath where
		// children are matched but the parent is returned.

		// Filter for guides or selected items if that's required
		return this._children || !(options.guides && !this._guide
				|| options.selected && !this._selected)
					? this._hitTest(point, options) : null;
	},

	_hitTest: function(point, options) {
		if (this._children) {
			// Loop backwards, so items that get drawn last are tested first
			for (var i = this._children.length - 1; i >= 0; i--) {
				var res = this._children[i].hitTest(point, options);
				if (res) return res;
			}
		}
	},

	/**
	 * {@grouptitle Hierarchy Operations}
	 * Adds the specified item as a child of this item at the end of the
	 * its children list. You can use this function for groups, compound
	 * paths and layers.
	 *
	 * @param {Item} item The item to be added as a child
	 */
	addChild: function(item, _preserve) {
		return this.insertChild(undefined, item, _preserve);
	},

	/**
	 * Inserts the specified item as a child of this item at the specified
	 * index in its {@link #children} list. You can use this function for
	 * groups, compound paths and layers.
	 *
	 * @param {Number} index
	 * @param {Item} item The item to be appended as a child
	 */
	insertChild: function(index, item, _preserve) {
		var res = this.insertChildren(index, [item], _preserve);
		return res && res[0];
	},

	/**
	 * Adds the specified items as children of this item at the end of the
	 * its children list. You can use this function for groups, compound
	 * paths and layers.
	 *
	 * @param {Item[]} items The items to be added as children
	 */
	addChildren: function(items, _preserve) {
		return this.insertChildren(this._children.length, items, _preserve);
	},

	/**
	 * Inserts the specified items as children of this item at the specified
	 * index in its {@link #children} list. You can use this function for
	 * groups, compound paths and layers.
	 *
	 * @param {Number} index
	 * @param {Item[]} items The items to be appended as children
	 */
	insertChildren: function(index, items, _preserve, _type) {
		// CompoundPath#insertChildren() requires _preserve and _type:
		// _preserve avoids changing of the children's path orientation
		// _type enforces the inserted type.
		var children = this._children;
		if (children && items && items.length > 0) {
			// We need to clone items because it might be
			// an Item#children array. Also, we're removing elements if they
			// don't match _type. Use Array.prototype.slice becaus items can be
			// an arguments object.
			items = Array.prototype.slice.apply(items);
			// Remove the items from their parents first, since they might be
			// inserted into their own parents, affecting indices.
			// Use the loop also to filter out wrong _type.
			for (var i = items.length - 1; i >= 0; i--) {
				var item = items[i];
				if (_type && item._type !== _type)
					items.splice(i, 1);
				else
					item._remove(true);
			}
			Base.splice(children, items, index, 0);
			for (var i = 0, l = items.length; i < l; i++) {
				var item = items[i];
				item._parent = this;
				item._setProject(this._project);
				// Setting the name again makes sure all name lookup structures
				// are kept in sync.
				if (item._name)
					item.setName(item._name);
			}
			this._changed(3);
		} else {
			items = null;
		}
		return items;
	},

	/**
	 * Inserts this item above the specified item.
	 *
	 * @param {Item} item The item above which it should be inserted
	 * @return {Boolean} {@true it was inserted}
	 */
	insertAbove: function(item, _preserve) {
		var index = item._index;
		if (item._parent == this._parent && index < this._index)
			 index++;
		return item._parent.insertChild(index, this, _preserve);
	},

	/**
	 * Inserts this item below the specified item.
	 *
	 * @param {Item} item The item above which it should be inserted
	 * @return {Boolean} {@true it was inserted}
	 */
	insertBelow: function(item, _preserve) {
		var index = item._index;
		if (item._parent == this._parent && index > this._index)
			 index--;
		return item._parent.insertChild(index, this, _preserve);
	},

	/**
	 * Sends this item to the back of all other items within the same parent.
	 */
	sendToBack: function() {
		return this._parent.insertChild(0, this);
	},

	/**
	 * Brings this item to the front of all other items within the same parent.
	 */
	bringToFront: function() {
		return this._parent.addChild(this);
	},

	/**
	 * Inserts the specified item as a child of this item by appending it to
	 * the list of children and moving it above all other children. You can
	 * use this function for groups, compound paths and layers.
	 *
	 * @param {Item} item The item to be appended as a child
	 * @deprecated use {@link #addChild(item)} instead.
	 */
	appendTop: '#addChild',

	/**
	 * Inserts the specified item as a child of this item by appending it to
	 * the list of children and moving it below all other children. You can
	 * use this function for groups, compound paths and layers.
	 *
	 * @param {Item} item The item to be appended as a child
	 * @deprecated use {@link #insertChild(index, item)} instead.
	 */
	appendBottom: function(item) {
		return this.insertChild(0, item);
	},

	/**
	 * Moves this item above the specified item.
	 *
	 * @param {Item} item The item above which it should be moved
	 * @return {Boolean} {@true it was moved}
	 * @deprecated use {@link #insertAbove(item)} instead.
	 */
	moveAbove: '#insertAbove',

	/**
	 * Moves the item below the specified item.
	 *
	 * @param {Item} item the item below which it should be moved
	 * @return {Boolean} {@true it was moved}
	 * @deprecated use {@link #insertBelow(item)} instead.
	 */
	moveBelow: '#insertBelow',

	/**
	* Removes the item from its parent's named children list.
	*/
	_removeFromNamed: function() {
		var children = this._parent._children,
			namedChildren = this._parent._namedChildren,
			name = this._name,
			namedArray = namedChildren[name],
			index = namedArray ? namedArray.indexOf(this) : -1;
		if (index == -1)
			return;
		// Remove the named reference
		if (children[name] == this)
			delete children[name];
		// Remove this entry
		namedArray.splice(index, 1);
		// If there are any items left in the named array, set
		// the last of them to be this.parent.children[this.name]
		if (namedArray.length) {
			children[name] = namedArray[namedArray.length - 1];
		} else {
			// Otherwise delete the empty array
			delete namedChildren[name];
		}
	},

	/**
	* Removes the item from its parent's children list.
	*/
	_remove: function(notify) {
		if (this._parent) {
			if (this._name)
				this._removeFromNamed();
			if (this._index != null)
				Base.splice(this._parent._children, null, this._index, 1);
			// Notify parent of changed hierarchy
			if (notify)
				this._parent._changed(3);
			this._parent = null;
			return true;
		}
		return false;
	},

	/**
	* Removes the item from the project. If the item has children, they are also
	* removed.
	*
	* @return {Boolean} {@true the item was removed}
	*/
	remove: function() {
		return this._remove(true);
	},

	/**
	 * Removes all of the item's {@link #children} (if any).
	 *
	 * @name Item#removeChildren
	 * @function
	 * @return {Item[]} an array containing the removed items
	 */
	/**
	 * Removes the children from the specified {@code from} index to the
	 * {@code to} index from the parent's {@link #children} array.
	 *
	 * @name Item#removeChildren
	 * @function
	 * @param {Number} from the beginning index, inclusive
	 * @param {Number} [to=children.length] the ending index, exclusive
	 * @return {Item[]} an array containing the removed items
	 */
	removeChildren: function(from, to) {
		if (!this._children)
			return null;
		from = from || 0;
		to = Base.pick(to, this._children.length);
		// Use Base.splice(), wich adjusts #_index for the items above, and
		// deletes it for the removed items. Calling #_remove() afterwards is
		// fine, since it only calls Base.splice() if #_index is set.
		var removed = Base.splice(this._children, null, from, to - from);
		for (var i = removed.length - 1; i >= 0; i--)
			removed[i]._remove(false);
		if (removed.length > 0)
			this._changed(3);
		return removed;
	},

	/**
	 * Reverses the order of the item's children
	 */
	reverseChildren: function() {
		if (this._children) {
			this._children.reverse();
			// Adjust inidces
			for (var i = 0, l = this._children.length; i < l; i++)
				this._children[i]._index = i;
			this._changed(3);
		}
	},

	// TODO: Item#isEditable is currently ignored in the documentation, as
	// locking an item currently has no effect
	/**
	 * {@grouptitle Tests}
	 * Checks whether the item is editable.
	 *
	 * @return {Boolean} {@true when neither the item, nor its parents are
	 * locked or hidden}
	 * @ignore
	 */
	isEditable: function() {
		var item = this;
		while (item) {
			if (!item._visible || item._locked)
				return false;
			item = item._parent;
		}
		return true;
	},

	/**
	 * Checks whether the item is valid, i.e. it hasn't been removed.
	 *
	 * @return {Boolean} {@true the item is valid}
	 */
	// TODO: isValid / checkValid

	/**
	 * Returns -1 if 'this' is above 'item', 1 if below, 0 if their order is not
	 * defined in such a way, e.g. if one is a descendant of the other.
	 */
	_getOrder: function(item) {
		// Private method that produces a list of anchestors, starting with the
		// root and ending with the actual element as the last entry.
		function getList(item) {
			var list = [];
			do {
				list.unshift(item);
			} while (item = item._parent);
			return list;
		}
		var list1 = getList(this),
			list2 = getList(item);
		for (var i = 0, l = Math.min(list1.length, list2.length); i < l; i++) {
			if (list1[i] != list2[i]) {
				// Found the position in the parents list where the two start
				// to differ. Look at who's above who.
				return list1[i]._index < list2[i]._index ? 1 : -1;
			}
		}
		return 0;
	},

	/**
	 * {@grouptitle Hierarchy Tests}
	 *
	 * Checks if the item contains any children items.
	 *
	 * @return {Boolean} {@true it has one or more children}
	 */
	hasChildren: function() {
		return this._children && this._children.length > 0;
	},

	/**
	 * Checks if this item is above the specified item in the stacking order
	 * of the project.
	 *
	 * @param {Item} item The item to check against
	 * @return {Boolean} {@true if it is above the specified item}
	 */
	isAbove: function(item) {
		return this._getOrder(item) == -1;
	},

	/**
	 * Checks if the item is below the specified item in the stacking order of
	 * the project.
	 *
	 * @param {Item} item The item to check against
	 * @return {Boolean} {@true if it is below the specified item}
	 */
	isBelow: function(item) {
		return this._getOrder(item) == 1;
	},

	/**
	 * Checks whether the specified item is the parent of the item.
	 *
	 * @param {Item} item The item to check against
	 * @return {Boolean} {@true if it is the parent of the item}
	 */
	isParent: function(item) {
		return this._parent == item;
	},

	/**
	 * Checks whether the specified item is a child of the item.
	 *
	 * @param {Item} item The item to check against
	 * @return {Boolean} {@true it is a child of the item}
	 */
	isChild: function(item) {
		return item && item._parent == this;
	},

	/**
	 * Checks if the item is contained within the specified item.
	 *
	 * @param {Item} item The item to check against
	 * @return {Boolean} {@true if it is inside the specified item}
	 */
	isDescendant: function(item) {
		var parent = this;
		while (parent = parent._parent) {
			if (parent == item)
				return true;
		}
		return false;
	},

	/**
	 * Checks if the item is an ancestor of the specified item.
	 *
	 * @param {Item} item the item to check against
	 * @return {Boolean} {@true if the item is an ancestor of the specified
	 * item}
	 */
	isAncestor: function(item) {
		return item ? item.isDescendant(this) : false;
	},

	/**
	 * Checks whether the item is grouped with the specified item.
	 *
	 * @param {Item} item
	 * @return {Boolean} {@true if the items are grouped together}
	 */
	isGroupedWith: function(item) {
		var parent = this._parent;
		while (parent) {
			// Find group parents. Check for parent._parent, since don't want
			// top level layers, because they also inherit from Group
			if (parent._parent
				&& /^(group|layer|compound-path)$/.test(parent._type)
				&& item.isDescendant(parent))
					return true;
			// Keep walking up otherwise
			parent = parent._parent;
		}
		return false;
	},

	// Document all style properties which get injected into Item by Style:

	/**
	 * {@grouptitle Stroke Style}
	 *
	 * The color of the stroke.
	 *
	 * @name Item#strokeColor
	 * @property
	 * @type Color
	 *
	 * @example {@paperscript}
	 * // Setting the stroke color of a path:
	 *
	 * // Create a circle shaped path at { x: 80, y: 50 }
	 * // with a radius of 35:
	 * var circle = new Path.Circle({
	 * 	center: [80, 50],
	 * 	radius: 35
	 * });
	 *
	 * // Set its stroke color to RGB red:
	 * circle.strokeColor = new Color(1, 0, 0);
	 */

	/**
	 * The width of the stroke.
	 *
	 * @name Item#strokeWidth
	 * @property
	 * @type Number
	 *
	 * @example {@paperscript}
	 * // Setting an item's stroke width:
	 *
	 * // Create a circle shaped path at { x: 80, y: 50 }
	 * // with a radius of 35:
	 * var circle = new Path.Circle({
	 * 	center: [80, 50],
	 * 	radius: 35,
	 * 	strokeColor: 'red'
	 * });
	 *
	 * // Set its stroke width to 10:
	 * circle.strokeWidth = 10;
	 */

	/**
	 * The shape to be used at the end of open {@link Path} items, when they
	 * have a stroke.
	 *
	 * @name Item#strokeCap
	 * @property
	 * @default 'butt'
	 * @type String('round', 'square', 'butt')
	 *
	 * @example {@paperscript height=200}
	 * // A look at the different stroke caps:
	 *
	 * var line = new Path({
	 * 	segments: [[80, 50], [420, 50]],
	 * 	strokeColor: 'black',
	 * 	strokeWidth: 20,
	 * 	selected: true
	 * });
	 * 
	 * // Set the stroke cap of the line to be round:
	 * line.strokeCap = 'round';
	 * 
	 * // Copy the path and set its stroke cap to be square:
	 * var line2 = line.clone();
	 * line2.position.y += 50;
	 * line2.strokeCap = 'square';
	 * 
	 * // Make another copy and set its stroke cap to be butt:
	 * var line2 = line.clone();
	 * line2.position.y += 100;
	 * line2.strokeCap = 'butt';
	 */

	/**
	 * The shape to be used at the corners of paths when they have a stroke.
	 *
	 * @name Item#strokeJoin
	 * @property
	 * @default 'miter'
	 * @type String('miter', 'round', 'bevel')
	 *
	 *
	 * @example {@paperscript height=120}
	 * // A look at the different stroke joins:
	 * var path = new Path({
	 * 	segments: [[80, 100], [120, 40], [160, 100]],
	 * 	strokeColor: 'black',
	 * 	strokeWidth: 20,
	 * 	// Select the path, in order to see where the stroke is formed:
	 * 	selected: true
	 * });
     *
	 * var path2 = path.clone();
	 * path2.position.x += path2.bounds.width * 1.5;
	 * path2.strokeJoin = 'round';
     *
	 * var path3 = path2.clone();
	 * path3.position.x += path3.bounds.width * 1.5;
	 * path3.strokeJoin = 'bevel';
	 */

	/**
	 * The dash offset of the stroke.
	 *
	 * @name Item#dashOffset
	 * @property
	 * @default 0
	 * @type Number
	 */

	/**
	 * Specifies an array containing the dash and gap lengths of the stroke.
	 *
	 * @example {@paperscript}
	 * var path = new Path.Circle({
	 * 	center: [80, 50],
	 * 	radius: 40,
	 * 	strokeWidth: 2,
	 * 	strokeColor: 'black'
	 * });
	 * 
	 * // Set the dashed stroke to [10pt dash, 4pt gap]:
	 * path.dashArray = [10, 4];
	 *
	 * @name Item#dashArray
	 * @property
	 * @default []
	 * @type Array
	 */

	/**
	 * The miter limit of the stroke.
	 * When two line segments meet at a sharp angle and miter joins have been
	 * specified for {@link Item#strokeJoin}, it is possible for the miter to
	 * extend far beyond the {@link Item#strokeWidth} of the path. The
	 * miterLimit imposes a limit on the ratio of the miter length to the
	 * {@link Item#strokeWidth}.
	 *
	 * @default 10
	 * @property
	 * @name Item#miterLimit
	 * @type Number
	 */

	/**
	 * {@grouptitle Fill Style}
	 *
	 * The fill color of the item.
	 *
	 * @name Item#fillColor
	 * @property
	 * @type Color
	 *
	 * @example {@paperscript}
	 * // Setting the fill color of a path to red:
	 *
	 * // Create a circle shaped path at { x: 80, y: 50 }
	 * // with a radius of 35:
	 * var circle = new Path.Circle({
	 * 	center: [80, 50],
	 * 	radius: 35
	 * });
	 *
	 * // Set the fill color of the circle to RGB red:
	 * circle.fillColor = new Color(1, 0, 0);
	 */

	// DOCS: Document the different arguments that this function can receive.
	/**
	 * {@grouptitle Transform Functions}
	 *
	 * Scales the item by the given value from its center point, or optionally
	 * from a supplied point.
	 *
	 * @name Item#scale
	 * @function
	 * @param {Number} scale the scale factor
	 * @param {Point} [center={@link Item#position}]
	 *
	 * @example {@paperscript}
	 * // Scaling an item from its center point:
	 *
	 * // Create a circle shaped path at { x: 80, y: 50 }
	 * // with a radius of 20:
	 * var circle = new Path.Circle({
	 * 	center: [80, 50],
	 * 	radius: 20,
	 * 	fillColor: 'red'
	 * });
	 *
	 * // Scale the path by 150% from its center point
	 * circle.scale(1.5);
	 *
	 * @example {@paperscript}
	 * // Scaling an item from a specific point:
	 *
	 * // Create a circle shaped path at { x: 80, y: 50 }
	 * // with a radius of 20:
	 * var circle = new Path.Circle({
	 * 	center: [80, 50],
	 * 	radius: 20,
	 * 	fillColor: 'red'
	 * });
	 *
	 * // Scale the path 150% from its bottom left corner
	 * circle.scale(1.5, circle.bounds.bottomLeft);
	 */
	/**
	 * Scales the item by the given values from its center point, or optionally
	 * from a supplied point.
	 *
	 * @name Item#scale
	 * @function
	 * @param {Number} hor the horizontal scale factor
	 * @param {Number} ver the vertical scale factor
	 * @param {Point} [center={@link Item#position}]
	 *
	 * @example {@paperscript}
	 * // Scaling an item horizontally by 300%:
	 *
	 * // Create a circle shaped path at { x: 100, y: 50 }
	 * // with a radius of 20:
	 * var circle = new Path.Circle({
	 * 	center: [100, 50],
	 * 	radius: 20,
	 * 	fillColor: 'red'
	 * });
     *
	 * // Scale the path horizontally by 300%
	 * circle.scale(3, 1);
	 */
	scale: function(hor, ver /* | scale */, center) {
		// See Matrix#scale for explanation of this:
		if (arguments.length < 2 || typeof ver === 'object') {
			center = ver;
			ver = hor;
		}
		return this.transform(new Matrix().scale(hor, ver,
				center || this.getPosition(true)));
	},

	/**
	 * Translates (moves) the item by the given offset point.
	 *
	 * @param {Point} delta the offset to translate the item by
	 */
	translate: function(delta) {
		var mx = new Matrix();
		return this.transform(mx.translate.apply(mx, arguments));
	},

	/**
	 * Rotates the item by a given angle around the given point.
	 *
	 * Angles are oriented clockwise and measured in degrees.
	 *
	 * @param {Number} angle the rotation angle
	 * @param {Point} [center={@link Item#position}]
	 * @see Matrix#rotate
	 *
	 * @example {@paperscript}
	 * // Rotating an item:
	 *
	 * // Create a rectangle shaped path with its top left
	 * // point at {x: 80, y: 25} and a size of {width: 50, height: 50}:
	 * var path = new Path.Rectangle(new Point(80, 25), new Size(50, 50));
	 * path.fillColor = 'black';
     *
	 * // Rotate the path by 30 degrees:
	 * path.rotate(30);
	 *
	 * @example {@paperscript height=200}
	 * // Rotating an item around a specific point:
	 *
	 * // Create a rectangle shaped path with its top left
	 * // point at {x: 175, y: 50} and a size of {width: 100, height: 100}:
	 * var topLeft = new Point(175, 50);
	 * var size = new Size(100, 100);
	 * var path = new Path.Rectangle(topLeft, size);
	 * path.fillColor = 'black';
	 *
	 * // Draw a circle shaped path in the center of the view,
	 * // to show the rotation point:
	 * var circle = new Path.Circle({
	 * 	center: view.center,
	 * 	radius: 5,
	 * 	fillColor: 'white'
	 * });
	 *
	 * // Each frame rotate the path 3 degrees around the center point
	 * // of the view:
	 * function onFrame(event) {
	 * 	path.rotate(3, view.center);
	 * }
	 */
	rotate: function(angle, center) {
		return this.transform(new Matrix().rotate(angle,
				center || this.getPosition(true)));
	},

	// TODO: Add test for item shearing, as it might be behaving oddly.
	/**
	 * Shears the item by the given value from its center point, or optionally
	 * by a supplied point.
	 *
	 * @name Item#shear
	 * @function
	 * @param {Point} point
	 * @param {Point} [center={@link Item#position}]
	 * @see Matrix#shear
	 */
	/**
	 * Shears the item by the given values from its center point, or optionally
	 * by a supplied point.
	 *
	 * @name Item#shear
	 * @function
	 * @param {Number} hor the horizontal shear factor.
	 * @param {Number} ver the vertical shear factor.
	 * @param {Point} [center={@link Item#position}]
	 * @see Matrix#shear
	 */
	shear: function(hor, ver, center) {
		// See Matrix#scale for explanation of this:
		if (arguments.length < 2 || typeof ver === 'object') {
			center = ver;
			ver = hor;
		}
		return this.transform(new Matrix().shear(hor, ver,
				center || this.getPosition(true)));
	},

	/**
	 * Transform the item.
	 *
	 * @param {Matrix} matrix the matrix by which the item shall be transformed.
	 */
	// Remove this for now:
	// @param {String[]} flags Array of any of the following: 'objects',
	//        'children', 'fill-gradients', 'fill-patterns', 'stroke-patterns',
	//        'lines'. Default: ['objects', 'children']
	transform: function(matrix /*, applyMatrix */) {
		// Calling _changed will clear _bounds and _position, but depending
		// on matrix we can calculate and set them again.
		var bounds = this._bounds,
			position = this._position;
		// Simply preconcatenate the internal matrix with the passed one:
		this._matrix.preConcatenate(matrix);
		// Call applyMatrix if we need to directly apply the accumulated
		// transformations to the item's content.
		if (this._applyMatrix || arguments[1])
			this.applyMatrix(false);
		// We always need to call _changed since we're caching bounds on all
		// items, including Group.
		this._changed(5);
		// Detect matrices that contain only translations and scaling
		// and transform the cached _bounds and _position without having to
		// fully recalculate each time.
		if (bounds && matrix.getRotation() % 90 === 0) {
			// Transform the old bound by looping through all the cached bounds
			// in _bounds and transform each.
			for (var key in bounds) {
				var rect = bounds[key];
				matrix._transformBounds(rect, rect);
			}
			// If we have cached bounds, update _position again as its 
			// center. We need to take into account _boundsGetter here too, in 
			// case another getter is assigned to it, e.g. 'getStrokeBounds'.
			var getter = this._boundsGetter,
				rect = bounds[getter && getter.getBounds || getter || 'getBounds'];
			if (rect)
				this._position = rect.getCenter(true);
			this._bounds = bounds;
		} else if (position) {
			// Transform position as well.
			this._position = matrix._transformPoint(position, position);
		}
		// Allow chaining here, since transform() is related to Matrix functions
		return this;
	},

	_transformContent: function(matrix, applyMatrix) {
		var children = this._children;
		if (children && children.length > 0) {
			for (var i = 0, l = children.length; i < l; i++)
				children[i].transform(matrix, applyMatrix);
			return true;
		}
	},

	applyMatrix: function(_dontNotify) {
		// Call #_transformContent() with the internal _matrix and pass true for
		// applyMatrix. Application is not possible on Raster, PointText,
		// PlacedSymbol, since the matrix is where the actual location /
		// transformation state is stored.
		// Pass on the transformation to the content, and apply it there too,
		// by passing true for the 2nd hidden parameter.
		var matrix = this._matrix;
		if (this._transformContent(matrix, true)) {
			// When the matrix could be applied, we also need to transform
			// color styles with matrices (only gradients so far):
			var style = this._style,
				// pass true for dontMerge so we don't recursively transform
				// styles on groups' children.
				fillColor = style.getFillColor(true),
				strokeColor = style.getStrokeColor(true);
			if (fillColor)
				fillColor.transform(matrix);
			if (strokeColor)
				strokeColor.transform(matrix);
			// Reset the internal matrix to the identity transformation if it
			// was possible to apply it.
			matrix.reset();
		}
		if (!_dontNotify)
			this._changed(5);
	},

	/**
	 * Transform the item so that its {@link #bounds} fit within the specified
	 * rectangle, without changing its aspect ratio.
	 *
	 * @param {Rectangle} rectangle
	 * @param {Boolean} [fill=false]
	 *
	 * @example {@paperscript height=100}
	 * // Fitting an item to the bounding rectangle of another item's bounding
	 * // rectangle:
	 *
	 * // Create a rectangle shaped path with its top left corner
	 * // at {x: 80, y: 25} and a size of {width: 75, height: 50}:
	 * var path = new Path.Rectangle({
	 * 	point: [80, 25],
	 * 	size: [75, 50],
	 * 	fillColor: 'black'
	 * });
	 * 
	 * // Create a circle shaped path with its center at {x: 80, y: 50}
	 * // and a radius of 30.
	 * var circlePath = new Path.Circle({
	 * 	center: [80, 50],
	 * 	radius: 30,
	 * 	fillColor: 'red'
	 * });
	 * 
	 * // Fit the circlePath to the bounding rectangle of
	 * // the rectangular path:
	 * circlePath.fitBounds(path.bounds);
	 *
	 * @example {@paperscript height=100}
	 * // Fitting an item to the bounding rectangle of another item's bounding
	 * // rectangle with the fill parameter set to true:
	 *
	 * // Create a rectangle shaped path with its top left corner
	 * // at {x: 80, y: 25} and a size of {width: 75, height: 50}:
	 * var path = new Path.Rectangle({
	 * 	point: [80, 25],
	 * 	size: [75, 50],
	 * 	fillColor: 'black'
	 * });
	 * 
	 * // Create a circle shaped path with its center at {x: 80, y: 50}
	 * // and a radius of 30.
	 * var circlePath = new Path.Circle({
	 * 	center: [80, 50],
	 * 	radius: 30,
	 * 	fillColor: 'red'
	 * });
	 * 
	 * // Fit the circlePath to the bounding rectangle of
	 * // the rectangular path:
	 * circlePath.fitBounds(path.bounds, true);
	 *
	 * @example {@paperscript height=200}
	 * // Fitting an item to the bounding rectangle of the view
	 * var path = new Path.Circle({
	 * 	center: [80, 50],
	 * 	radius: 30,
	 * 	fillColor: 'red'
	 * });
	 *
	 * // Fit the path to the bounding rectangle of the view:
	 * path.fitBounds(view.bounds);
	 */
	fitBounds: function(rectangle, fill) {
		// TODO: Think about passing options with various ways of defining
		// fitting.
		rectangle = Rectangle.read(arguments);
		var bounds = this.getBounds(),
			itemRatio = bounds.height / bounds.width,
			rectRatio = rectangle.height / rectangle.width,
			scale = (fill ? itemRatio > rectRatio : itemRatio < rectRatio)
					? rectangle.width / bounds.width
					: rectangle.height / bounds.height,
			newBounds = new Rectangle(new Point(),
					new Size(bounds.width * scale, bounds.height * scale));
		newBounds.setCenter(rectangle.getCenter());
		this.setBounds(newBounds);
	},

	// DOCS: document exportJSON (documented in @private Base)
	// DOCS: document importJSON
	// DOCS: Figure out a way to group these together with importSVG / exportSVG

	importJSON: function(json) {
		return this.addChild(Base.importJSON(json));
	},

	/**
	 * {@grouptitle Event Handlers}
	 * Item level handler function to be called on each frame of an animation.
	 * The function receives an event object which contains information about
	 * the frame event:
	 *
	 * <b>{@code event.count}</b>: the number of times the frame event was
	 * fired.
	 * <b>{@code event.time}</b>: the total amount of time passed since the
	 * first frame event in seconds.
	 * <b>{@code event.delta}</b>: the time passed in seconds since the last
	 * frame event.
	 *
 	 * @see View#onFrame
	 * @example {@paperscript}
	 * // Creating an animation:
	 *
	 * // Create a rectangle shaped path with its top left point at:
	 * // {x: 50, y: 25} and a size of {width: 50, height: 50}
	 * var path = new Path.Rectangle(new Point(50, 25), new Size(50, 50));
	 * path.fillColor = 'black';
	 *
	 * path.onFrame = function(event) {
	 * 	// Every frame, rotate the path by 3 degrees:
	 * 	this.rotate(3);
	 * }
	 *
	 * @name Item#onFrame
	 * @property
	 * @type Function
	 */

	/**
	 * The function to be called when the mouse button is pushed down on the
	 * item. The function receives a {@link MouseEvent} object which contains
	 * information about the mouse event.
	 *
	 * @name Item#onMouseDown
	 * @property
	 * @type Function
	 *
	 * @example {@paperscript}
	 * // Press the mouse button down on the circle shaped path, to make it red:
	 * 
	 * // Create a circle shaped path at the center of the view:
	 * var path = new Path.Circle({
	 * 	center: view.center,
	 * 	radius: 25,
	 * 	fillColor: 'black'
	 * });
	 * 
	 * // When the mouse is pressed on the item,
	 * // set its fill color to red:
	 * path.onMouseDown = function(event) {
	 * 	this.fillColor = 'red';
	 * }
	 * 
	 * @example {@paperscript}
	 * // Press the mouse on the circle shaped paths to remove them:
	 * 
	 * // Loop 30 times:
	 * for (var i = 0; i < 30; i++) {
	 * 	// Create a circle shaped path at a random position
	 * 	// in the view:
	 * 	var path = new Path.Circle({
	 * 		center: Point.random() * view.size,
	 * 		radius: 25,
	 * 		fillColor: 'black',
	 * 		strokeColor: 'white'
	 * 	});
	 * 
	 * 	// When the mouse is pressed on the item, remove it:
	 * 	path.onMouseDown = function(event) {
	 * 		this.remove();
	 * 	}
	 * }
	 */

	/**
	 * The function to be called when the mouse button is released over the item.
	 * The function receives a {@link MouseEvent} object which contains
	 * information about the mouse event.
	 *
	 * @name Item#onMouseUp
	 * @property
	 * @type Function
	 *
	 * @example {@paperscript}
	 * // Release the mouse button over the circle shaped path, to make it red:
	 * 
	 * // Create a circle shaped path at the center of the view:
	 * var path = new Path.Circle({
	 * 	center: view.center,
	 * 	radius: 25,
	 * 	fillColor: 'black'
	 * });
	 * 
	 * // When the mouse is released over the item,
	 * // set its fill color to red:
	 * path.onMouseUp = function(event) {
	 * 	this.fillColor = 'red';
	 * }
	 */

	/**
	 * The function to be called when the mouse clicks on the item. The function
	 * receives a {@link MouseEvent} object which contains information about the
	 * mouse event.
	 *
	 * @name Item#onClick
	 * @property
	 * @type Function
	 *
	 * @example {@paperscript}
	 * // Click on the circle shaped path, to make it red:
	 * 
	 * // Create a circle shaped path at the center of the view:
	 * var path = new Path.Circle({
	 * 	center: view.center,
	 * 	radius: 25,
	 * 	fillColor: 'black'
	 * });
	 * 
	 * // When the mouse is clicked on the item,
	 * // set its fill color to red:
	 * path.onClick = function(event) {
	 * 	this.fillColor = 'red';
	 * }
	 * 
	 * @example {@paperscript}
	 * // Click on the circle shaped paths to remove them:
	 * 
	 * // Loop 30 times:
	 * for (var i = 0; i < 30; i++) {
	 * 	// Create a circle shaped path at a random position
	 * 	// in the view:
	 * 	var path = new Path.Circle({
	 * 		center: Point.random() * view.size,
	 * 		radius: 25,
	 * 		fillColor: 'black',
	 * 		strokeColor: 'white'
	 * 	});
	 * 
	 * 	// When the mouse clicks on the item, remove it:
	 * 	path.onClick = function(event) {
	 * 		this.remove();
	 * 	}
	 * }
	 */

	/**
	 * The function to be called when the mouse double clicks on the item. The
	 * function receives a {@link MouseEvent} object which contains information
	 * about the mouse event.
	 *
	 * @name Item#onDoubleClick
	 * @property
	 * @type Function
	 *
	 * @example {@paperscript}
	 * // Double click on the circle shaped path, to make it red:
	 * 
	 * // Create a circle shaped path at the center of the view:
	 * var path = new Path.Circle({
	 * 	center: view.center,
	 * 	radius: 25,
	 * 	fillColor: 'black'
	 * });
	 * 
	 * // When the mouse is double clicked on the item,
	 * // set its fill color to red:
	 * path.onDoubleClick = function(event) {
	 * 	this.fillColor = 'red';
	 * }
	 * 
	 * @example {@paperscript}
	 * // Double click on the circle shaped paths to remove them:
	 * 
	 * // Loop 30 times:
	 * for (var i = 0; i < 30; i++) {
	 * 	// Create a circle shaped path at a random position
	 * 	// in the view:
	 * 	var path = new Path.Circle({
	 * 		center: Point.random() * view.size,
	 * 		radius: 25,
	 * 		fillColor: 'black',
	 * 		strokeColor: 'white'
	 * 	});
	 * 
	 * 	// When the mouse is double clicked on the item, remove it:
	 * 	path.onDoubleClick = function(event) {
	 * 		this.remove();
	 * 	}
	 * }
	 */

	/**
	 * The function to be called repeatedly when the mouse moves on top of the
	 * item. The function receives a {@link MouseEvent} object which contains
	 * information about the mouse event.
	 *
	 * @name Item#onMouseMove
	 * @property
	 * @type Function
	 *
	 * @example {@paperscript}
	 * // Move over the circle shaped path, to change its opacity:
	 * 
	 * // Create a circle shaped path at the center of the view:
	 * 	var path = new Path.Circle({
	 * 	center: view.center,
	 * 	radius: 25,
	 * 	fillColor: 'black'
	 * 	});
	 * 
	 * // When the mouse moves on top of the item, set its opacity
	 * // to a random value between 0 and 1:
	 * path.onMouseMove = function(event) {
	 * 	this.opacity = Math.random();
	 * }
	 */

	/**
	 * The function to be called when the mouse moves over the item. This
	 * function will only be called again, once the mouse moved outside of the
	 * item first. The function receives a {@link MouseEvent} object which
	 * contains information about the mouse event.
	 *
	 * @name Item#onMouseEnter
	 * @property
	 * @type Function
	 *
	 * @example {@paperscript}
	 * // When you move the mouse over the item, its fill color is set to red.
	 * // When you move the mouse outside again, its fill color is set back
	 * // to black.
	 * 
	 * // Create a circle shaped path at the center of the view:
	 * var path = new Path.Circle({
	 * 	center: view.center,
	 * 	radius: 25,
	 * 	fillColor: 'black'
	 * });
	 * 
	 * // When the mouse enters the item, set its fill color to red:
	 * path.onMouseEnter = function(event) {
	 * 	this.fillColor = 'red';
	 * }
	 * 
	 * // When the mouse leaves the item, set its fill color to black:
	 * path.onMouseLeave = function(event) {
	 * 	this.fillColor = 'black';
	 * }
	 * @example {@paperscript}
	 * // When you click the mouse, you create new circle shaped items. When you
	 * // move the mouse over the item, its fill color is set to red. When you
	 * // move the mouse outside again, its fill color is set back
	 * // to black.
	 * 
	 * function enter(event) {
	 * 	this.fillColor = 'red';
	 * }
	 * 
	 * function leave(event) {
	 * 	this.fillColor = 'black';
	 * }
	 * 
	 * // When the mouse is pressed:
	 * function onMouseDown(event) {
	 * 	// Create a circle shaped path at the position of the mouse:
	 * 	var path = new Path.Circle(event.point, 25);
	 * 	path.fillColor = 'black';
     * 
	 * 	// When the mouse enters the item, set its fill color to red:
	 * 	path.onMouseEnter = enter;
     * 
	 * 	// When the mouse leaves the item, set its fill color to black:
	 * 	path.onMouseLeave = leave;
	 * }
	 */

	/**
	 * The function to be called when the mouse moves out of the item.
	 * The function receives a {@link MouseEvent} object which contains
	 * information about the mouse event.
	 *
	 * @name Item#onMouseLeave
	 * @property
	 * @type Function
	 *
	 * @example {@paperscript}
	 * // Move the mouse over the circle shaped path and then move it out
	 * // of it again to set its fill color to red:
	 * 
	 * // Create a circle shaped path at the center of the view:
	 * var path = new Path.Circle({
	 * 	center: view.center,
	 * 	radius: 25,
	 * 	fillColor: 'black'
	 * });
	 * 
	 * // When the mouse leaves the item, set its fill color to red:
	 * path.onMouseLeave = function(event) {
	 * 	this.fillColor = 'red';
	 * }
	 */

	/**
	 * {@grouptitle Event Handling}
	 * 
	 * Attach an event handler to the item.
	 *
	 * @name Item#on
	 * @function
	 * @param {String('mousedown', 'mouseup', 'mousedrag', 'click',
	 * 'doubleclick', 'mousemove', 'mouseenter', 'mouseleave')} type the event
	 * type
	 * @param {Function} function The function to be called when the event
	 * occurs
	 *
	 * @example {@paperscript}
	 * // Change the fill color of the path to red when the mouse enters its
	 * // shape and back to black again, when it leaves its shape.
	 * 
	 * // Create a circle shaped path at the center of the view:
	 * var path = new Path.Circle({
	 * 	center: view.center,
	 * 	radius: 25,
	 * 	fillColor: 'black'
	 * });
	 * 
	 * // When the mouse enters the item, set its fill color to red:
	 * path.on('mouseenter', function() {
	 * 	this.fillColor = 'red';
	 * });
	 * 
	 * // When the mouse leaves the item, set its fill color to black:
	 * path.on('mouseleave', function() {
	 * 	this.fillColor = 'black';
	 * });
	 */
	/**
	 * Attach one or more event handlers to the item.
	 *
	 * @name Item#on^2
	 * @function
	 * @param {Object} param An object literal containing one or more of the
	 * following properties: {@code mousedown, mouseup, mousedrag, click,
	 * doubleclick, mousemove, mouseenter, mouseleave}.
	 *
	 * @example {@paperscript}
	 * // Change the fill color of the path to red when the mouse enters its
	 * // shape and back to black again, when it leaves its shape.
	 * 
	 * // Create a circle shaped path at the center of the view:
	 * var path = new Path.Circle({
	 * 	center: view.center,
	 * 	radius: 25
	 * });
	 * path.fillColor = 'black';
	 * 
	 * // When the mouse enters the item, set its fill color to red:
	 * path.on({
	 * 	mouseenter: function(event) {
	 * 		this.fillColor = 'red';
	 * 	},
	 * 	mouseleave: function(event) {
	 * 		this.fillColor = 'black';
	 * 	}
	 * });
	 * @example {@paperscript}
	 * // When you click the mouse, you create new circle shaped items. When you
	 * // move the mouse over the item, its fill color is set to red. When you
	 * // move the mouse outside again, its fill color is set black.
	 * 
	 * var pathHandlers = {
	 * 	mouseenter: function(event) {
	 * 		this.fillColor = 'red';
	 * 	},
	 * 	mouseleave: function(event) {
	 * 		this.fillColor = 'black';
	 * 	}
	 * }
	 * 
	 * // When the mouse is pressed:
	 * function onMouseDown(event) {
	 * 	// Create a circle shaped path at the position of the mouse:
	 * 	var path = new Path.Circle({
	 * 		center: event.point,
	 * 		radius: 25,
	 * 		fillColor: 'black'
	 * 	});
	 * 
	 * 	// Attach the handers inside the object literal to the path:
	 * 	path.on(pathHandlers);
	 * }
	 */

	/**
	 * Detach an event handler from the item.
	 *
	 * @name Item#detach
	 * @function
	 * @param {String('mousedown', 'mouseup', 'mousedrag', 'click',
	 * 'doubleclick', 'mousemove', 'mouseenter', 'mouseleave')} type the event
	 * type
	 * @param {Function} function The function to be detached
	 */
	/**
	 * Detach one or more event handlers to the item.
	 *
	 * @name Item#detach^2
	 * @function
	 * @param {Object} param An object literal containing one or more of the
	 * following properties: {@code mousedown, mouseup, mousedrag, click,
	 * doubleclick, mousemove, mouseenter, mouseleave}
	 */

	/**
	 * Fire an event on the item.
	 *
	 * @name Item#fire
	 * @function
	 * @param {String('mousedown', 'mouseup', 'mousedrag', 'click',
	 * 'doubleclick', 'mousemove', 'mouseenter', 'mouseleave')} type the event
	 * type
	 * @param {Object} event An object literal containing properties describing
	 * the event.
	 */

	/**
	 * Check if the item has one or more event handlers of the specified type.
	 *
	 * @name Item#responds
	 * @function
	 * @param {String('mousedown', 'mouseup', 'mousedrag', 'click',
	 * 'doubleclick', 'mousemove', 'mouseenter', 'mouseleave')} type the event
	 * type
	 * @return {Boolean} {@true if the item has one or more event handlers of
	 * the specified type}
	 */

	/**
	 * Private method that sets Path related styles on the canvas context.
	 * Not defined in Path as it is required by other classes too,
	 * e.g. PointText.
	 */
	_setStyles: function(ctx) {
		// We can access internal properties since we're only using this on
		// items without children, where styles would be merged.
		var style = this._style,
			width = style.getStrokeWidth(),
			join = style.getStrokeJoin(),
			cap = style.getStrokeCap(),
			limit = style.getMiterLimit(),
			fillColor = style.getFillColor(),
			strokeColor = style.getStrokeColor(),
			dashArray = style.getDashArray(),
			dashOffset = style.getDashOffset();
		if (width != null)
			ctx.lineWidth = width;
		if (join)
			ctx.lineJoin = join;
		if (cap)
			ctx.lineCap = cap;
		if (limit)
			ctx.miterLimit = limit;
		if (fillColor)
			ctx.fillStyle = fillColor.toCanvasStyle(ctx);
		if (strokeColor) {
			ctx.strokeStyle = strokeColor.toCanvasStyle(ctx);
			if (paper.support.nativeDash && dashArray && dashArray.length) {
				if ('setLineDash' in ctx) {
					ctx.setLineDash(dashArray);
					ctx.lineDashOffset = dashOffset;
				} else {
					ctx.mozDash = dashArray;
					ctx.mozDashOffset = dashOffset;
				}
			}
		}
		// If the item only defines a strokeColor or a fillColor, draw it
		// directly with the globalAlpha set, otherwise we will do it later when
		// we composite the temporary canvas.
		if (!fillColor || !strokeColor)
			ctx.globalAlpha = this._opacity;
	},

	// TODO: Implement View into the drawing.
	// TODO: Optimize temporary canvas drawing to ignore parts that are
	// outside of the visible view.
	draw: function(ctx, param) {
		if (!this._visible || this._opacity == 0)
			return;
		// Each time the project gets drawn, it's _drawCount is increased.
		// Keep the _drawCount of drawn items in sync, so we have an easy
		// way to filter out selected items that are not being drawn, e.g.
		// because they are currently not part of the DOM.
		this._drawCount = this._project._drawCount;
		// Keep calculating the current global matrix, by keeping a history
		// and pushing / popping as we go along.
		var transforms = param.transforms,
			parentMatrix = transforms[transforms.length - 1],
			globalMatrix = parentMatrix.clone().concatenate(this._matrix);
		transforms.push(this._globalMatrix = globalMatrix);
		// If the item has a blendMode or is defining an opacity, draw it on
		// a temporary canvas first and composite the canvas afterwards.
		// Paths with an opacity < 1 that both define a fillColor
		// and strokeColor also need to be drawn on a temporary canvas
		// first, since otherwise their stroke is drawn half transparent
		// over their fill.
		// Exclude Raster items since they never draw a stroke and handle
		// opacity by themselves (they also don't call _setStyles)
		var parentCtx, itemOffset, prevOffset;
		if (this._blendMode !== 'normal' || this._opacity < 1
				&& this._type !== 'raster' && (this._type !== 'path'
					|| this.getFillColor() && this.getStrokeColor())) {
			// Apply the paren't global matrix to the calculation of correct
			// bounds.
			var bounds = this.getStrokeBounds(parentMatrix);
			if (!bounds.width || !bounds.height)
				return;
			// Store previous offset and save the parent context, so we can
			// draw onto it later
			prevOffset = param.offset;
			// Floor the offset and ceil the size, so we don't cut off any
			// antialiased pixels when drawing onto the temporary canvas.
			itemOffset = param.offset = bounds.getTopLeft().floor();
			// Set ctx to the context of the temporary canvas,
			// so we draw onto it, instead of the parentCtx
			parentCtx = ctx;
			ctx = CanvasProvider.getContext(
					bounds.getSize().ceil().add(new Size(1, 1)));
		}
		ctx.save();
		// Translate the context so the topLeft of the item is at (0, 0)
		// on the temporary canvas.
		if (parentCtx)
			ctx.translate(-itemOffset.x, -itemOffset.y);
		// Apply globalMatrix when blitting into temporary canvas.
		(parentCtx ? globalMatrix : this._matrix).applyToContext(ctx);
		this._draw(ctx, param);
		ctx.restore();
		transforms.pop();
		if (param.clip)
			ctx.clip();
		// If a temporary canvas was created before, composite it onto the
		// parent canvas:
		if (parentCtx) {
			// Restore previous offset.
			param.offset = prevOffset;
			// If the item has a blendMode, use BlendMode#process to
			// composite its canvas on the parentCanvas.
			if (this._blendMode !== 'normal') {
				// The pixel offset of the temporary canvas to the parent
				// canvas.
				BlendMode.process(this._blendMode, ctx, parentCtx,
					this._opacity, itemOffset.subtract(prevOffset));
			} else {
				// Otherwise just set the globalAlpha before drawing the
				// temporary canvas on the parent canvas.
				parentCtx.save();
				parentCtx.globalAlpha = this._opacity;
				parentCtx.drawImage(ctx.canvas, itemOffset.x, itemOffset.y);
				parentCtx.restore();
			}
			// Return the temporary context, so it can be reused
			CanvasProvider.release(ctx);
		}
	}
}, Base.each(['down', 'drag', 'up', 'move'], function(name) {
	this['removeOn' + Base.capitalize(name)] = function() {
		var hash = {};
		hash[name] = true;
		return this.removeOn(hash);
	};
}, /** @lends Item# */{
	/**
	 * {@grouptitle Remove On Event}
	 *
	 * Removes the item when the events specified in the passed object literal
	 * occur.
	 * The object literal can contain the following values:
	 * Remove the item when the next {@link Tool#onMouseMove} event is
	 * fired: {@code object.move = true}
	 *
	 * Remove the item when the next {@link Tool#onMouseDrag} event is
	 * fired: {@code object.drag = true}
	 *
	 * Remove the item when the next {@link Tool#onMouseDown} event is
	 * fired: {@code object.down = true}
	 *
	 * Remove the item when the next {@link Tool#onMouseUp} event is
	 * fired: {@code object.up = true}
	 *
	 * @name Item#removeOn
	 * @function
	 * @param {Object} object
	 *
	 * @example {@paperscript height=200}
	 * // Click and drag below:
	 * function onMouseDrag(event) {
	 * 	// Create a circle shaped path at the mouse position,
	 * 	// with a radius of 10:
	 * 	var path = new Path.Circle({
	 * 		center: event.point,
	 * 		radius: 10,
	 * 		fillColor: 'black'
	 * 	});
	 *
	 * 	// Remove the path on the next onMouseDrag or onMouseDown event:
	 * 	path.removeOn({
	 * 		drag: true,
	 * 		down: true
	 * 	});
	 * }
	 */

	/**
	 * Removes the item when the next {@link Tool#onMouseMove} event is fired.
	 *
	 * @name Item#removeOnMove
	 * @function
	 *
	 * @example {@paperscript height=200}
	 * // Move your mouse below:
	 * function onMouseMove(event) {
	 * 	// Create a circle shaped path at the mouse position,
	 * 	// with a radius of 10:
	 * 	var path = new Path.Circle({
	 * 		center: event.point,
	 * 		radius: 10,
	 * 		fillColor: 'black'
	 * 	});
	 *
	 * 	// On the next move event, automatically remove the path:
	 * 	path.removeOnMove();
	 * }
	 */

	/**
	 * Removes the item when the next {@link Tool#onMouseDown} event is fired.
	 *
	 * @name Item#removeOnDown
	 * @function
	 *
	 * @example {@paperscript height=200}
	 * // Click a few times below:
	 * function onMouseDown(event) {
	 * 	// Create a circle shaped path at the mouse position,
	 * 	// with a radius of 10:
	 * 	var path = new Path.Circle({
	 * 		center: event.point,
	 * 		radius: 10,
	 * 		fillColor: 'black'
	 * 	});
	 *
	 * 	// Remove the path, next time the mouse is pressed:
	 * 	path.removeOnDown();
	 * }
	 */

	/**
	 * Removes the item when the next {@link Tool#onMouseDrag} event is fired.
	 *
	 * @name Item#removeOnDrag
	 * @function
	 *
	 * @example {@paperscript height=200}
	 * // Click and drag below:
	 * function onMouseDrag(event) {
	 * 	// Create a circle shaped path at the mouse position,
	 * 	// with a radius of 10:
	 * 	var path = new Path.Circle({
	 * 		center: event.point,
	 * 		radius: 10,
	 * 		fillColor: 'black'
	 * 	});
	 *
	 * 	// On the next drag event, automatically remove the path:
	 * 	path.removeOnDrag();
	 * }
	 */

	/**
	 * Removes the item when the next {@link Tool#onMouseUp} event is fired.
	 *
	 * @name Item#removeOnUp
	 * @function
	 *
	 * @example {@paperscript height=200}
	 * // Click a few times below:
	 * function onMouseDown(event) {
	 * 	// Create a circle shaped path at the mouse position,
	 * 	// with a radius of 10:
	 * 	var path = new Path.Circle({
	 * 		center: event.point,
	 * 		radius: 10,
	 * 		fillColor: 'black'
	 * 	});
	 *
	 * 	// Remove the path, when the mouse is released:
	 * 	path.removeOnUp();
	 * }
	 */
	// TODO: implement Item#removeOnFrame
	removeOn: function(obj) {
		for (var name in obj) {
			if (obj[name]) {
				var key = 'mouse' + name,
					sets = Tool._removeSets = Tool._removeSets || {};
				sets[key] = sets[key] || {};
				sets[key][this._id] = this;
			}
		}
		return this;
	}
}));

/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2013, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

/**
 * @name Group
 *
 * @class A Group is a collection of items. When you transform a Group, its
 * children are treated as a single unit without changing their relative
 * positions.
 *
 * @extends Item
 */
var Group = Item.extend(/** @lends Group# */{
	_serializeFields: {
		children: []
	},

	// DOCS: document new Group(item, item...);
	/**
	 * Creates a new Group item and places it at the top of the active layer.
	 *
	 * @name Group#initialize
	 * @param {Item[]} [children] An array of children that will be added to the
	 * newly created group.
	 *
	 * @example {@paperscript}
	 * // Create a group containing two paths:
	 * var path = new Path([100, 100], [100, 200]);
	 * var path2 = new Path([50, 150], [150, 150]);
	 *
	 * // Create a group from the two paths:
	 * var group = new Group([path, path2]);
	 *
	 * // Set the stroke color of all items in the group:
	 * group.strokeColor = 'black';
	 *
	 * // Move the group to the center of the view:
	 * group.position = view.center;
	 *
	 * @example {@paperscript height=320}
	 * // Click in the view to add a path to the group, which in turn is rotated
	 * // every frame:
	 * var group = new Group();
	 *
	 * function onMouseDown(event) {
	 * 	// Create a new circle shaped path at the position
	 * 	// of the mouse:
	 * 	var path = new Path.Circle(event.point, 5);
	 * 	path.fillColor = 'black';
	 *
	 * 	// Add the path to the group's children list:
	 * 	group.addChild(path);
	 * }
	 *
	 * function onFrame(event) {
	 * 	// Rotate the group by 1 degree from
	 * 	// the centerpoint of the view:
	 * 	group.rotate(1, view.center);
	 * }
	 */
	/**
	 * Creates a new Group item and places it at the top of the active layer.
	 *
	 * @name Group#initialize
	 * @param {Object} object An object literal containing properties to be
	 * set on the Group.
	 *
	 * @example {@paperscript}
	 * var path = new Path([100, 100], [100, 200]);
	 * var path2 = new Path([50, 150], [150, 150]);
	 * 
	 * // Create a group from the two paths:
	 * var group = new Group({
	 * 	children: [path, path2],
	 * 	// Set the stroke color of all items in the group:
	 * 	strokeColor: 'black',
	 * 	// Move the group to the center of the view:
	 * 	position: view.center
	 * });
	 */
	initialize: function Group(arg) {
		Item.call(this);
		// Allow Group to have children and named children
		this._children = [];
		this._namedChildren = {};
		if (arg && !this._set(arg))
			this.addChildren(Array.isArray(arg) ? arg : arguments);
	},

	_changed: function _changed(flags) {
		_changed.base.call(this, flags);
		if (flags & 2 && !this._matrix.isIdentity()) {
			// Apply matrix now that we have content.
			this.applyMatrix();
		}
		if (flags & (2 | 256)) {
			// Clear cached clip item whenever hierarchy changes
			delete this._clipItem;
		}
	},

	_getClipItem: function() {
		// Allow us to set _clipItem to null when none is found and still return
		// it as a defined value without searching again
		if (this._clipItem !== undefined)
			return this._clipItem;
		for (var i = 0, l = this._children.length; i < l; i++) {
			var child = this._children[i];
			if (child._clipMask)
				return this._clipItem = child;
		}
		// Make sure we're setting _clipItem to null so it won't be searched for
		// nex time.
		return this._clipItem = null;
	},

	/**
	 * Specifies whether the group item is to be clipped.
	 * When setting to {@code true}, the first child in the group is
	 * automatically defined as the clipping mask.
	 *
	 * @type Boolean
	 * @bean
	 * 
	 * @example {@paperscript}
	 * var star = new Path.Star({
	 * 	center: view.center,
	 * 	points: 6,
	 * 	radius1: 20,
	 * 	radius2: 40,
	 * 	fillColor: 'red'
	 * });
	 * 
	 * var circle = new Path.Circle({
	 * 	center: view.center,
	 * 	radius: 25,
	 * 	strokeColor: 'black'
	 * });
	 * 
	 * // Create a group of the two items and clip it:
	 * var group = new Group(circle, star);
	 * group.clipped = true;
	 * 
	 * // Lets animate the circle:
	 * function onFrame(event) {
	 * 	var offset = Math.sin(event.count / 30) * 30;
	 * 	circle.position.x = view.center.x + offset;
	 * }
	 */
	isClipped: function() {
		return !!this._getClipItem();
	},

	setClipped: function(clipped) {
		var child = this.getFirstChild();
		if (child)
			child.setClipMask(clipped);
	},

	_draw: function(ctx, param) {
		var clipItem = this._getClipItem();
		if (clipItem) {
			param.clip = true;
			clipItem.draw(ctx, param);
			param.clip = false;
		}
		for (var i = 0, l = this._children.length; i < l; i++) {
			var item = this._children[i];
			if (item !== clipItem)
				item.draw(ctx, param);
		}
	}
});

/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2013, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

/**
 * @name Layer
 *
 * @class The Layer item represents a layer in a Paper.js project.
 *
 * The layer which is currently active can be accessed through
 * {@link Project#activeLayer}.
 * An array of all layers in a project can be accessed through
 * {@link Project#layers}.
 *
 * @extends Group
 */
var Layer = Group.extend(/** @lends Layer# */{
	// DOCS: improve constructor code example.
	/**
	 * Creates a new Layer item and places it at the end of the
	 * {@link Project#layers} array. The newly created layer will be activated,
	 * so all newly created items will be placed within it.
	 *
	 * @name Layer#initialize
	 * @param {Item[]} [children] An array of items that will be added to the
	 * newly created layer.
	 *
	 * @example
	 * var layer = new Layer();
	 */
	/**
	 * Creates a new Layer item and places it at the end of the
	 * {@link Project#layers} array. The newly created layer will be activated,
	 * so all newly created items will be placed within it.
	 *
	 * @param {Object} object An object literal containing properties to
	 * be set on the layer.
	 *
	 * @example {@paperscript}
	 * var path = new Path([100, 100], [100, 200]);
	 * var path2 = new Path([50, 150], [150, 150]);
	 * 
	 * // Create a layer. The properties in the object literal
	 * // are set on the newly created layer.
	 * var layer = new Layer({
	 * 	children: [path, path2],
	 * 	strokeColor: 'black',
	 * 	position: view.center
	 * });
	 */
	initialize: function Layer(items) {
		this._project = paper.project;
		// Push it onto project.layers and set index:
		this._index = this._project.layers.push(this) - 1;
		Group.apply(this, arguments);
		this.activate();
	},

	/**
	* Removes the layer from its project's layers list
	* or its parent's children list.
	*/
	_remove: function _remove(notify) {
		if (this._parent)
			return _remove.base.call(this, notify);
		if (this._index != null) {
			if (this._project.activeLayer === this)
				this._project.activeLayer = this.getNextSibling()
						|| this.getPreviousSibling();
			Base.splice(this._project.layers, null, this._index, 1);
			// Tell project we need a redraw. This is similar to _changed()
			// mechanism.
			this._project._needsRedraw = true;
			return true;
		}
		return false;
	},

	getNextSibling: function getNextSibling() {		
		return this._parent ? getNextSibling.base.call(this)
				: this._project.layers[this._index + 1] || null;
	},

	getPreviousSibling: function getPreviousSibling() {
		return this._parent ? getPreviousSibling.base.call(this)
				: this._project.layers[this._index - 1] || null;
	},

	isInserted: function isInserted() {
		return this._parent ? isInserted.base.call(this) : this._index != null;
	},

	/**
	 * Activates the layer.
	 *
	 * @example
	 * var firstLayer = project.activeLayer;
	 * var secondLayer = new Layer();
	 * console.log(project.activeLayer == secondLayer); // true
	 * firstLayer.activate();
	 * console.log(project.activeLayer == firstLayer); // true
	 */
	activate: function() {
		this._project.activeLayer = this;
	}
}, new function () {
	function insert(above) {
		return function insert(item) {
			// If the item is a layer and contained within Project#layers, use
			// our own version of move().
			if (item instanceof Layer && !item._parent
						&& this._remove(true)) {
				Base.splice(item._project.layers, [this],
						item._index + (above ? 1 : 0), 0);
				this._setProject(item._project);
				return true;
			}
			return insert.base.call(this, item);
		};
	}

	return {
		insertAbove: insert(true),

		insertBelow: insert(false)
	};
});

/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2013, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

/**
 * @name Clip
 *
 * @class A Clip is a collection of items, similar to a Group. But instead of
 * automatically passing on transformations to its children by calling
 * {@link Item#applyMatrix()}, the transformations are stored in the internal
 * matrix.
 *
 * @extends Group
 */
var Clip = Group.extend(/** @lends Clip# */{
	_applyMatrix: false,

	initialize: function Clip() {
		Group.apply(this, arguments);
	}
});

/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2013, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

/**
 * @name Shape
 *
 * @class
 *
 * @extends Item
 */
var Shape = Item.extend(/** @lends Shape# */{
	_applyMatrix: false,

	initialize: function Shape(type, point, size) {
		Item.call(this, point);
		this._type = type;
		this._size = size;
	},

	_draw: function(ctx, param) {
		var style = this._style,
			size = this._size,
			width = size.width,
			height = size.height,
			fillColor = style.getFillColor(),
			strokeColor = style.getStrokeColor();
		if (fillColor || strokeColor || param.clip) {
			ctx.beginPath();
			switch (this._type) {
			case 'rect':
				ctx.rect(-width / 2, -height / 2, width, height);
				break;
			case 'circle':
				// Average half of width & height for radius...
				ctx.arc(0, 0, (width + height) / 4, 0, Math.PI * 2, true);
				break;
			case 'ellipse':
				var mx = width / 2,
					my = height / 2,
					kappa = Numerical.KAPPA,
					cx = mx * kappa,
					cy = my * kappa;
				ctx.moveTo(0, my);
				ctx.bezierCurveTo(0, my - cy, mx - cx, 0, mx, 0);
				ctx.bezierCurveTo(mx + cx, 0, width, my - cy, width, my);
				ctx.bezierCurveTo(width, my + cy, mx + cx, height, mx, height);
				ctx.bezierCurveTo(mx - cx, height, 0, my + cy, 0, my);
				break;
			}
		}
		if (!param.clip && (fillColor || strokeColor)) {
			this._setStyles(ctx);
			if (fillColor)
				ctx.fill();
			if (strokeColor)
				ctx.stroke();
		}
	},

	_contains: function _contains(point) {
		switch (this._type) {
		case 'rect':
			return _contains.base.call(this, point);
		case 'circle':
		case 'ellipse':
			return point.divide(this._size).getLength() <= 0.5;
		}
	},

	_getBounds: function(getter, matrix) {
		var rect = new Rectangle(this._size).setCenter(0, 0);
		return matrix ? matrix._transformBounds(rect) : rect;
	},

	_hitTest: function(point, options) {
		if (this.hasFill() && this.contains(point))
			return new HitResult('fill', this);
		// TODO: Implement stroke!
	},

	statics: {
		Circle: function(/* center, radius */) {
			var center = Point.readNamed(arguments, 'center'),
				radius = Base.readNamed(arguments, 'radius');
			return new Shape('circle', center, new Size(radius * 2));
		},

		Rectangle: function(/* rectangle */) {
			var rect = Rectangle.readNamed(arguments, 'rectangle');
			return new Shape('rect', rect.getCenter(true), rect.getSize(true));
		},

		Ellipse: function(/* rectangle */) {
			var rect = Rectangle.readNamed(arguments, 'rectangle');
			return new Shape('ellipse', rect.getCenter(true),
					rect.getSize(true));
		}
	}
});

/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2013, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

/**
 * @name Raster
 *
 * @class The Raster item represents an image in a Paper.js project.
 *
 * @extends Item
 */
var Raster = Item.extend(/** @lends Raster# */{
	_applyMatrix: false,
	// Raster doesn't make the distinction between the different bounds,
	// so use the same name for all of them
	_boundsGetter: 'getBounds',
	_boundsSelected: true,
	_serializeFields: {
		source: null
	},

	// TODO: Implement type, width, height.
	// TODO: Have PlacedSymbol & Raster inherit from a shared class?
	/**
	 * Creates a new raster item from the passed argument, and places it in the
	 * active layer. {@code object} can either be a DOM Image, a Canvas, or a
	 * string describing the URL to load the image from, or the ID of a DOM
	 * element to get the image from (either a DOM Image or a Canvas).
	 *
	 * @param {HTMLImageElement|Canvas|String} [source] the source of the raster
	 * @param {HTMLImageElement|Canvas|String} [position] the center position at
	 * which the raster item is placed.
	 * 
	 * @example {@paperscript height=300} // Creating a raster using a url
	 * var url = 'http://upload.wikimedia.org/wikipedia/en/2/24/Lenna.png';
	 * var raster = new Raster(url);
	 * 
	 * // If you create a Raster using a url, you can use the onLoad
	 * // handler to do something once it is loaded:
	 * raster.onLoad = function() {
	 * 	console.log('The image has loaded.');
	 * };
	 * 
	 * @example // Creating a raster using the id of a DOM Image:
	 * 
	 * // Create a raster using the id of the image:
	 * var raster = new Raster('art');
	 * 
	 * @example // Creating a raster using a DOM Image:
	 * 
	 * // Find the element using its id:
	 * var imageElement = document.getElementById('art');
	 * 
	 * // Create the raster:
	 * var raster = new Raster(imageElement);
	 * 
	 * @example {@paperscript height=300}
	 * var raster = new Raster({
	 * 	source: 'http://upload.wikimedia.org/wikipedia/en/2/24/Lenna.png',
	 * 	position: view.center
	 * });
	 * 
	 * raster.scale(0.5);
	 * raster.rotate(10);
	 */
	initialize: function Raster(object, position) {
		// Support two forms of item initialization: Passing one object literal
		// describing all the different properties to be set, or an image
		// (object) and a point where it should be placed (point).
		Item.call(this, position !== undefined && Point.read(arguments, 1));
		// If we can handle setting properties through object literal, we're all
		// set. Otherwise we need to check the type of object:
		if (object && !this._set(object)) {
			if (object.getContext) {
				this.setCanvas(object);
			} else if (typeof object === 'string') {
				// Both data-urls and normal urls are supported here!
				this.setSource(object);
			} else {
				this.setImage(object);
			}
		}
		if (!this._size)
			this._size = new Size();
	},

	clone: function() {
		var element = this._image;
		if (!element) {
			// If the Raster contains a Canvas object, we need to create
			// a new one and draw this raster's canvas on it.
			element = CanvasProvider.getCanvas(this._size);
			element.getContext('2d').drawImage(this._canvas, 0, 0);
		}
		var copy = new Raster(element);
		return this._clone(copy);
	},

	/**
	 * The size of the raster in pixels.
	 *
	 * @type Size
	 * @bean
	 */
	getSize: function() {
		return this._size;
	},

	setSize: function() {
		var size = Size.read(arguments);
		if (!this._size.equals(size)) {
			// Get reference to image before changing canvas
			var element = this.getElement();
			// Setting canvas internally sets _size
			this.setCanvas(CanvasProvider.getCanvas(size));
			// Draw element back onto new canvas
			if (element)
				this.getContext(true).drawImage(element, 0, 0,
						size.width, size.height);
		}
	},

	/**
	 * The width of the raster in pixels.
	 *
	 * @type Number
	 * @bean
	 */
	getWidth: function() {
		return this._size.width;
	},

	/**
	 * The height of the raster in pixels.
	 *
	 * @type Number
	 * @bean
	 */
	getHeight: function() {
		return this._size.height;
	},

	isEmpty: function() {
		return this._size.width == 0 && this._size.height == 0;
	},

	/**
	 * Pixels per inch of the raster at its current size.
	 *
	 * @type Size
	 * @bean
	 */
	getPpi: function() {
		var matrix = this._matrix,
			orig = new Point(0, 0).transform(matrix),
			u = new Point(1, 0).transform(matrix).subtract(orig),
			v = new Point(0, 1).transform(matrix).subtract(orig);
		return new Size(
			72 / u.getLength(),
			72 / v.getLength()
		);
	},

	/**
	 * The Canvas 2d drawing context of the raster.
	 *
	 * @type Context
	 * @bean
	 */
	getContext: function(/* modify */) {
		if (!this._context)
			this._context = this.getCanvas().getContext('2d');
		// Support a hidden parameter that indicates if the context will be used
		// to modify the Raster object. We can notify such changes ahead since
		// they are only used afterwards for redrawing.
		if (arguments[0]) {
			// Also set _image to null since the Raster stops representing it.
			// NOTE: This should theoretically be in our own _changed() handler
			// for ChangeFlag.PIXELS, but since it's only happening in one place
			// this is fine:
			this._image = null;
			this._changed(129);
		}
		return this._context;
	},

	setContext: function(context) {
		this._context = context;
	},

	getCanvas: function() {
		if (!this._canvas) {
			var ctx = CanvasProvider.getContext(this._size);
			// Since drawimage images into canvases might fail based on security
			// policies, wrap the call in try-catch and only set _canvas if we
			// succeeded.
			try {
				if (this._image)
					ctx.drawImage(this._image, 0, 0);
				this._canvas = ctx.canvas;
			} catch (e) {
				CanvasProvider.release(ctx);
			}
		}
		return this._canvas;
	},

	setCanvas: function(canvas) {
		if (this._canvas)
			CanvasProvider.release(this._canvas);
		this._canvas = canvas;
		this._size = new Size(canvas.width, canvas.height);
		this._image = null;
		this._context = null;
		this._changed(5 | 129);
	},

	/**
	 * The HTMLImageElement of the raster, if one is associated.
	 *
	 * @type HTMLImageElement|Canvas
	 * @bean
	 */
	getImage: function() {
		return this._image;
	},

	setImage: function(image) {
		if (this._canvas)
			CanvasProvider.release(this._canvas);
		this._image = image;
		this._size = new Size(image.naturalWidth, image.naturalHeight);
		this._canvas = null;
		this._context = null;
		this._changed(5);
	},

	/**
	 * The source of the raster, which can be set using a DOM Image, a Canvas,
	 * a data url, a string describing the URL to load the image from, or the
	 * ID of a DOM element to get the image from (either a DOM Image or a Canvas). 
	 * Reading this property will return the url of the source image or a data-url.
	 * 
	 * @bean
	 * @type HTMLImageElement|Canvas|String
	 * 
	 * @example {@paperscript}
	 * var raster = new Raster();
	 * raster.source = 'http://paperjs.org/about/resources/paper-js.gif';
	 * raster.position = view.center;
	 * 
	 * @example {@paperscript}
	 * var raster = new Raster({
	 * 	source: 'http://paperjs.org/about/resources/paper-js.gif',
	 * 	position: view.center
	 * });
	 */
	getSource: function() {
		return this._image && this._image.src || this.toDataURL();
	},

	setSource: function(src) {
		var that = this,
			// src can be an URL or a DOM ID to load the image from
			image = document.getElementById(src) || new Image();
		function loaded() {
			that.fire('load');
			if (that._project.view)
				that._project.view.draw(true);
		}
		// Trigger the onLoad event on the image once it's loaded
		DomEvent.add(image, {
			load: function() {
				that.setImage(image);
				loaded();
			}
		});
		if (image.width && image.height) {
			// Fire load event delayed, so behavior is the same as when it's 
			// actually loaded and we give the code time to install event
			setTimeout(loaded, 0);
		} else if (!image.src) {
			image.src = src;
		}
		this.setImage(image);
	},

	// DOCS: document Raster#getElement
	getElement: function() {
		return this._canvas || this._image;
	},

	// DOCS: document Raster#getSubImage
	/**
	 * @param {Rectangle} rect the boundaries of the sub image in pixel
	 * coordinates
	 *
	 * @return {Canvas}
	 */
	getSubImage: function(rect) {
		rect = Rectangle.read(arguments);
		var ctx = CanvasProvider.getContext(rect.getSize());
		ctx.drawImage(this.getCanvas(), rect.x, rect.y,
				rect.width, rect.height, 0, 0, rect.width, rect.height);
		return ctx.canvas;
	},

	/**
	 * Returns a Base 64 encoded {@code data:} URL representation of the raster.
	 *
	 * @return {String}
	 */
	toDataURL: function() {
		// See if the linked image is base64 encoded already, if so reuse it,
		// otherwise try using canvas.toDataURL()
		var src = this._image && this._image.src;
		if (/^data:/.test(src))
			return src;
		var canvas = this.getCanvas();
		return canvas ? canvas.toDataURL() : null;
	},

	/**
	 * Draws an image on the raster.
	 *
	 * @param {HTMLImageELement|Canvas} image
	 * @param {Point} point the offset of the image as a point in pixel
	 * coordinates
	 */
	drawImage: function(image, point) {
		point = Point.read(arguments, 1);
		this.getContext(true).drawImage(image, point.x, point.y);
	},

	/**
	 * Calculates the average color of the image within the given path,
	 * rectangle or point. This can be used for creating raster image
	 * effects.
	 *
	 * @param {Path|Rectangle|Point} object
	 * @return {Color} the average color contained in the area covered by the
	 * specified path, rectangle or point.
	 */
	getAverageColor: function(object) {
		var bounds, path;
		if (!object) {
			bounds = this.getBounds();
		} else if (object instanceof PathItem) {
			// TODO: What if the path is smaller than 1 px?
			// TODO: How about rounding of bounds.size?
			path = object;
			bounds = object.getBounds();
		} else if (object.width) {
			bounds = new Rectangle(object);
		} else if (object.x) {
			// Create a rectangle of 1px size around the specified coordinates
			bounds = new Rectangle(object.x - 0.5, object.y - 0.5, 1, 1);
		}
		// Use a sample size of max 32 x 32 pixels, into which the path is
		// scaled as a clipping path, and then the actual image is drawn in and
		// sampled.
		var sampleSize = 32,
			width = Math.min(bounds.width, sampleSize),
			height = Math.min(bounds.height, sampleSize);
		// Reuse the same sample context for speed. Memory consumption is low
		// since it's only 32 x 32 pixels.
		var ctx = Raster._sampleContext;
		if (!ctx) {
			ctx = Raster._sampleContext = CanvasProvider.getContext(
					new Size(sampleSize));
		} else {
			// Clear the sample canvas:
			ctx.clearRect(0, 0, sampleSize + 1, sampleSize + 1);
		}
		ctx.save();
		// Scale the context so that the bounds ends up at the given sample size
		var matrix = new Matrix()
				.scale(width / bounds.width, height / bounds.height)
				.translate(-bounds.x, -bounds.y);
		matrix.applyToContext(ctx);
		// If a path was passed, draw it as a clipping mask:
		if (path)
			path.draw(ctx, { clip: true, transforms: [matrix] });
		// Now draw the image clipped into it.
		this._matrix.applyToContext(ctx);
		ctx.drawImage(this.getElement(),
				-this._size.width / 2, -this._size.height / 2);
		ctx.restore();
		// Get pixel data from the context and calculate the average color value
		// from it, taking alpha into account.
		var pixels = ctx.getImageData(0.5, 0.5, Math.ceil(width),
				Math.ceil(height)).data,
			channels = [0, 0, 0],
			total = 0;
		for (var i = 0, l = pixels.length; i < l; i += 4) {
			var alpha = pixels[i + 3];
			total += alpha;
			alpha /= 255;
			channels[0] += pixels[i] * alpha;
			channels[1] += pixels[i + 1] * alpha;
			channels[2] += pixels[i + 2] * alpha;
		}
		for (var i = 0; i < 3; i++)
			channels[i] /= total;
		return total ? Color.read(channels) : null;
	},

	/**
	 * {@grouptitle Pixels}
	 * Gets the color of a pixel in the raster.
	 *
	 * @name Raster#getPixel
	 * @function
	 * @param x the x offset of the pixel in pixel coordinates
	 * @param y the y offset of the pixel in pixel coordinates
	 * @return {Color} the color of the pixel
	 */
	/**
	 * Gets the color of a pixel in the raster.
	 *
	 * @name Raster#getPixel
	 * @function
	 * @param point the offset of the pixel as a point in pixel coordinates
	 * @return {Color} the color of the pixel
	 */
	getPixel: function(point) {
		point = Point.read(arguments);
		var data = this.getContext().getImageData(point.x, point.y, 1, 1).data;
		// Alpha is separate now:
		return new Color('rgb', [data[0] / 255, data[1] / 255, data[2] / 255],
				data[3] / 255);
	},

	/**
	 * Sets the color of the specified pixel to the specified color.
	 *
	 * @name Raster#setPixel
	 * @function
	 * @param x the x offset of the pixel in pixel coordinates
	 * @param y the y offset of the pixel in pixel coordinates
	 * @param color the color that the pixel will be set to
	 */
	/**
	 * Sets the color of the specified pixel to the specified color.
	 *
	 * @name Raster#setPixel
	 * @function
	 * @param point the offset of the pixel as a point in pixel coordinates
	 * @param color the color that the pixel will be set to
	 */
	setPixel: function(point, color) {
		var _point = Point.read(arguments),
			_color = Color.read(arguments),
			components = _color._convert('rgb'),
			alpha = _color._alpha,
			ctx = this.getContext(true),
			imageData = ctx.createImageData(1, 1),
			data = imageData.data;
		data[0] = components[0] * 255;
		data[1] = components[1] * 255;
		data[2] = components[2] * 255;
		data[3] = alpha != null ? alpha * 255 : 255;
		ctx.putImageData(imageData, _point.x, _point.y);
	},

	// DOCS: document Raster#createImageData
	/**
	 * {@grouptitle Image Data}
	 * @param {Size} size
	 * @return {ImageData}
	 */
	createImageData: function(size) {
		size = Size.read(arguments);
		return this.getContext().createImageData(size.width, size.height);
	},

	// DOCS: document Raster#getData
	/**
	 * @param {Rectangle} rect
	 * @return {ImageData}
	 */
	getImageData: function(rect) {
		rect = Rectangle.read(arguments);
		if (rect.isEmpty())
			rect = new Rectangle(this.getSize());
		return this.getContext().getImageData(rect.x, rect.y,
				rect.width, rect.height);
	},

	// DOCS: document Raster#setImageData
	/**
	 * @param {ImageData} data
	 * @param {Point} point
	 * @return {ImageData}
	 */
	setImageData: function(data, point) {
		point = Point.read(arguments, 1);
		this.getContext(true).putImageData(data, point.x, point.y);
	},

	_getBounds: function(getter, matrix) {
		var rect = new Rectangle(this._size).setCenter(0, 0);
		return matrix ? matrix._transformBounds(rect) : rect;
	},

	_hitTest: function(point, options) {
		if (this._contains(point)) {
			var that = this;
			return new HitResult('pixel', that, {
				offset: point.add(that._size.divide(2)).round(),
				// Inject as Bootstrap accessor, so #toString renders well too
				color: {
					get: function() {
						return that.getPixel(this.offset);
					}
				}
			});
		}
	},

	_draw: function(ctx) {
		var element = this.getElement();
		if (element) {
			// Handle opacity for Rasters separately from the rest, since
			// Rasters never draw a stroke. See Item#draw().
			ctx.globalAlpha = this._opacity;
			ctx.drawImage(element,
					-this._size.width / 2, -this._size.height / 2);
		}
	}
});

/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2013, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

/**
 * @name PlacedSymbol
 *
 * @class A PlacedSymbol represents an instance of a symbol which has been
 * placed in a Paper.js project.
 *
 * @extends Item
 */
var PlacedSymbol = Item.extend(/** @lends PlacedSymbol# */{
	_applyMatrix: false,
	// PlacedSymbol uses strokeBounds for bounds
	_boundsGetter: { getBounds: 'getStrokeBounds' },
	_boundsSelected: true,
	_serializeFields: {
		symbol: null
	},

	/**
	 * Creates a new PlacedSymbol Item.
	 *
	 * @param {Symbol} symbol the symbol to place
	 * @param {Point} [point] the center point of the placed symbol
	 *
	 * @example {@paperscript split=true height=240}
	 * // Placing 100 instances of a symbol:
	 * // Create a star shaped path at {x: 0, y: 0}:
	 * var path = new Path.Star({
	 * 	center: new Point(0, 0),
	 * 	points: 6,
	 * 	radius1: 5,
	 * 	radius2: 13,
	 * 	fillColor: 'white',
	 * 	strokeColor: 'black'
	 * });
	 *
	 * // Create a symbol from the path:
	 * var symbol = new Symbol(path);
	 *
	 * // Remove the path:
	 * path.remove();
	 *
	 * // Place 100 instances of the symbol:
	 * for (var i = 0; i < 100; i++) {
	 *     // Place an instance of the symbol in the project:
	 *     var instance = new PlacedSymbol(symbol);
	 *
	 *     // Move the instance to a random position within the view:
	 *     instance.position = Point.random() * view.size;
	 *
	 *     // Rotate the instance by a random amount between
	 *     // 0 and 360 degrees:
	 *     instance.rotate(Math.random() * 360);
	 *
	 *     // Scale the instance between 0.25 and 1:
	 *     instance.scale(0.25 + Math.random() * 0.75);
	 * }
	 */
	initialize: function PlacedSymbol(arg0, arg1) {
		// Support two forms of item initialization: Passing one object literal
		// describing all the different properties to be set, or a symbol (arg0)
		// and a point where it should be placed (arg1).
		Item.call(this, arg1 !== undefined && Point.read(arguments, 1));
		// If we can handle setting properties through object literal, we're all
		// set. Otherwise we need to set symbol.
		if (arg0 && !this._set(arg0))
			this.setSymbol(arg0 instanceof Symbol ? arg0 : new Symbol(arg0));
	},

	/**
	 * The symbol that the placed symbol refers to.
	 *
	 * @type Symbol
	 * @bean
	 */
	getSymbol: function() {
		return this._symbol;
	},

	setSymbol: function(symbol) {
		// Remove from previous symbol's instances
		if (this._symbol)
			delete this._symbol._instances[this._id];
		this._symbol = symbol;
		// Add to the new one's
		symbol._instances[this._id] = this;
	},

	clone: function() {
		return this._clone(new PlacedSymbol(this.symbol));
	},

	isEmpty: function() {
		return this._symbol._definition.isEmpty();
	},

	_getBounds: function(getter, matrix) {
		// Redirect the call to the symbol definition to calculate the bounds
		// TODO: Implement bounds caching through passing on of cacheItem, so
		// that Symbol#_changed() notification become unnecessary!
		return this.symbol._definition._getCachedBounds(getter, matrix);
	},

	_hitTest: function(point, options, matrix) {
		var result = this._symbol._definition._hitTest(point, options, matrix);
		// TODO: When the symbol's definition is a path, should hitResult
		// contain information like HitResult#curve?
		if (result)
			result.item = this;
		return result;
	},

	_draw: function(ctx, param) {
		this.symbol._definition.draw(ctx, param);
	}

	// TODO: PlacedSymbol#embed()
});

/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2013, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

/**
 * @name HitResult
 *
 * @class A HitResult object contains information about the results of a hit
 * test. It is returned by {@link Item#hitTest(point)} and
 * {@link Project#hitTest(point)}.
 */
var HitResult = Base.extend(/** @lends HitResult# */{
	initialize: function HitResult(type, item, values) {
		this.type = type;
		this.item = item;
		// Inject passed values, so we can be flexible about the HitResult
		// properties.
		// This allows the definition of getters too, e.g. for 'pixel'.
		if (values) {
			values.enumerable = true;
			this.inject(values);
		}
	},

	/**
	 * Describes the type of the hit result. For example, if you hit a segment
	 * point, the type would be 'segment'.
	 *
	 * @name HitResult#type
	 * @property
	 * @type String('segment', 'handle-in', 'handle-out', 'stroke', 'fill',
	 * 'bounds', 'center', 'pixel')
	 */

	/**
	 * If the HitResult has a {@link HitResult#type} of 'bounds', this property
	 * describes which corner of the bounding rectangle was hit.
	 *
	 * @name HitResult#name
	 * @property
	 * @type String('top-left', 'top-right', 'bottom-left', 'bottom-right',
	 * 'left-center', 'top-center', 'right-center', 'bottom-center')
	 */

	/**
	 * The item that was hit.
	 *
	 * @name HitResult#item
	 * @property
	 * @type Item
	 */

	/**
	 * If the HitResult has a type of 'stroke', this property gives more
	 * information about the exact position that was hit on the path.
	 *
	 * @name HitResult#location
	 * @property
	 * @type CurveLocation
	 */

	/**
	 * If the HitResult has a type of 'pixel', this property refers to the color
	 * of the pixel on the {@link Raster} that was hit.
	 *
	 * @name HitResult#color
	 * @property
	 * @type Color
	 */

	/**
	 * If the HitResult has a type of 'stroke', 'segment', 'handle-in' or
	 * 'handle-out', this property refers to the Segment that was hit or that
	 * is closest to the hitResult.location on the curve.
	 *
	 * @name HitResult#segment
	 * @property
	 * @type Segment
	 */

	/**
	 * Describes the actual coordinates of the segment, handle or bounding box
	 * corner that was hit.
	 *
	 * @name HitResult#point
	 * @property
	 * @type Point
	 */

	statics: {
		/**
		 * Merges default options into options hash for #hitTest() calls, and
		 * marks as merged, to prevent repeated merging in nested calls.
		 *
		 * @private
		 */
		getOptions: function(options) {
			// Use _merged property to not repeatetly call merge in recursion.
			return options && options._merged ? options : Base.merge({
				// Type of item, for instanceof check: PathItem, TexItem, etc
				type: null,
				// Tolerance
				tolerance: paper.project.options.hitTolerance || 2,
				// Hit the fill of items
				fill: !options,
				// Hit the curves of path items, taking into account the stroke
				// width.
				stroke: !options,
				// Hit the part of segments that curves pass through, excluding
				// its segments (Segment#point)
				segments: !options,
				// Hit the parts of segments that define the curvature
				handles: false,
				// Only first or last segment hits on path (mutually exclusive
				// with segments: true)
				ends: false,
				// Hit test the center of the bounds
				center: false,
				// Hit test the corners and side-centers of the boudning box
				bounds: false,
				//  Hit items that are marked as guides
				guides: false,
				// Only hit selected objects
				selected: false,
				// Mark as merged, so next time Base.merge isn't called
				_merged: true
			}, options);
		}
	}
});


/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2013, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

/**
 * @name Segment
 *
 * @class The Segment object represents the points of a path through which its
 * {@link Curve} objects pass. The segments of a path can be accessed through
 * its {@link Path#segments} array.
 *
 * Each segment consists of an anchor point ({@link Segment#point}) and
 * optionaly an incoming and an outgoing handle ({@link Segment#handleIn} and
 * {@link Segment#handleOut}), describing the tangents of the two {@link Curve}
 * objects that are connected by this segment.
 */
var Segment = Base.extend(/** @lends Segment# */{
	/**
	 * Creates a new Segment object.
	 *
	 * @name Segment#initialize
	 * @param {Point} [point={x: 0, y: 0}] the anchor point of the segment
	 * @param {Point} [handleIn={x: 0, y: 0}] the handle point relative to the
	 *        anchor point of the segment that describes the in tangent of the
	 *        segment.
	 * @param {Point} [handleOut={x: 0, y: 0}] the handle point relative to the
	 *        anchor point of the segment that describes the out tangent of the
	 *        segment.
	 *
	 * @example {@paperscript}
	 * var handleIn = new Point(-80, -100);
	 * var handleOut = new Point(80, 100);
	 *
	 * var firstPoint = new Point(100, 50);
	 * var firstSegment = new Segment(firstPoint, null, handleOut);
	 *
	 * var secondPoint = new Point(300, 50);
	 * var secondSegment = new Segment(secondPoint, handleIn, null);
	 *
	 * var path = new Path(firstSegment, secondSegment);
	 * path.strokeColor = 'black';
	 */
	/**
	 * Creates a new Segment object.
	 *
	 * @name Segment#initialize
	 * @param {Object} object An object literal containing properties to
	 * be set on the segment.
	 *
	 * @example {@paperscript}
	 * // Creating segments using object notation:
	 * var firstSegment = new Segment({
	 * 	point: [100, 50],
	 * 	handleOut: [80, 100]
	 * });
	 * 
	 * var secondSegment = new Segment({
	 * 	point: [300, 50],
	 * 	handleIn: [-80, -100]
	 * });
	 * 
	 * var path = new Path({
	 * 	segments: [firstSegment, secondSegment],
	 * 	strokeColor: 'black'
	 * });
	 */
	/**
	 * Creates a new Segment object.
	 *
	 * @param {Number} x the x coordinate of the segment point
	 * @param {Number} y the y coordinate of the segment point
	 * @param {Number} inX the x coordinate of the the handle point relative
	 *        to the anchor point of the segment that describes the in tangent
	 *        of the segment.
	 * @param {Number} inY the y coordinate of the the handle point relative
	 *        to the anchor point of the segment that describes the in tangent
	 *        of the segment.
	 * @param {Number} outX the x coordinate of the the handle point relative
	 *        to the anchor point of the segment that describes the out tangent
	 *        of the segment.
	 * @param {Number} outY the y coordinate of the the handle point relative
	 *        to the anchor point of the segment that describes the out tangent
	 *        of the segment.
	 *
	 * @example {@paperscript}
	 * var inX = -80;
	 * var inY = -100;
	 * var outX = 80;
	 * var outY = 100;
	 * 
	 * var x = 100;
	 * var y = 50;
	 * var firstSegment = new Segment(x, y, inX, inY, outX, outY);
	 * 
	 * var x2 = 300;
	 * var y2 = 50;
	 * var secondSegment = new Segment( x2, y2, inX, inY, outX, outY);
	 * 
	 * var path = new Path(firstSegment, secondSegment);
	 * path.strokeColor = 'black';
	 * @ignore
	 */
	initialize: function Segment(arg0, arg1, arg2, arg3, arg4, arg5) {
		var count = arguments.length,
			createPoint = SegmentPoint.create,
			point, handleIn, handleOut;
		// TODO: Use Point.read or Point.readNamed to read these?
		if (count === 0) {
			// Nothing
		} else if (count === 1) {
			// Note: This copies from existing segments through bean getters
			if (arg0.point) {
				point = arg0.point;
				handleIn = arg0.handleIn;
				handleOut = arg0.handleOut;
			} else {
				point = arg0;
			}
		} else if (count < 6) {
			if (count == 2 && arg1.x === undefined) {
				point = [ arg0, arg1 ];
			} else {
				point = arg0;
				// Doesn't matter if these arguments exist, SegmentPointcreate
				// produces creates points with (0, 0) otherwise
				handleIn = arg1;
				handleOut = arg2;
			}
		} else if (count === 6) {
			point = [ arg0, arg1 ];
			handleIn = [ arg2, arg3 ];
			handleOut = [ arg4, arg5 ];
		}
		createPoint(this, '_point', point);
		createPoint(this, '_handleIn', handleIn);
		createPoint(this, '_handleOut', handleOut);
	},

	_serialize: function(options) {
		// If the Segment is linear, only serialize point, otherwise handles too
		return Base.serialize(this.isLinear() ? this._point
				: [this._point, this._handleIn, this._handleOut], options, true);
	},

	_changed: function(point) {
		if (!this._path)
			return;
		// Delegate changes to affected curves if they exist. Check _curves
		// first to make sure we're not creating it by calling this.getCurve().
		var curve = this._path._curves && this.getCurve(),
			other;
		if (curve) {
			curve._changed();
			// Get the other affected curve, which is the previous one for
			// _point or _handleIn changing when this segment is _segment1 of
			// the curve, for all other cases it's the next (e.g. _handleOut
			// when this segment is _segment2)
			if (other = (curve[point == this._point
					|| point == this._handleIn && curve._segment1 == this
					? 'getPrevious' : 'getNext']())) {
				other._changed();
			}
		}
		this._path._changed(5);
	},

	/**
	 * The anchor point of the segment.
	 *
	 * @type Point
	 * @bean
	 */
	getPoint: function() {
		return this._point;
	},

	setPoint: function(point) {
		point = Point.read(arguments);
		// Do not replace the internal object but update it instead, so
		// references to it are kept alive.
		this._point.set(point.x, point.y);
	},

	/**
	 * The handle point relative to the anchor point of the segment that
	 * describes the in tangent of the segment.
	 *
	 * @type Point
	 * @bean
	 */
	getHandleIn: function() {
		return this._handleIn;
	},

	setHandleIn: function(point) {
		point = Point.read(arguments);
		// See #setPoint:
		this._handleIn.set(point.x, point.y);
		// Update corner accordingly
		// this.corner = !this._handleIn.isColinear(this._handleOut);
	},

	/**
	 * The handle point relative to the anchor point of the segment that
	 * describes the out tangent of the segment.
	 *
	 * @type Point
	 * @bean
	 */
	getHandleOut: function() {
		return this._handleOut;
	},

	setHandleOut: function(point) {
		point = Point.read(arguments);
		// See #setPoint:
		this._handleOut.set(point.x, point.y);
		// Update corner accordingly
		// this.corner = !this._handleIn.isColinear(this._handleOut);
	},

	/**
	 * Specifies whether the segment has no handles defined, meaning it connects
	 * two straight lines.
	 *
	 * @type Point
	 * @bean
	 */
	isLinear: function() {
		return this._handleIn.isZero() && this._handleOut.isZero();
	},

	setLinear: function() {
		this._handleIn.set(0, 0);
		this._handleOut.set(0, 0);
	},

	_isSelected: function(point) {
		var state = this._selectionState;
		return point == this._point ? !!(state & 4)
			: point == this._handleIn ? !!(state & 1)
			: point == this._handleOut ? !!(state & 2)
			: false;
	},

	_setSelected: function(point, selected) {
		var path = this._path,
			selected = !!selected, // convert to boolean
			state = this._selectionState || 0,
			// For performance reasons use array indices to access the various
			// selection states: 0 = point, 1 = handleIn, 2 = handleOut
			selection = [
				!!(state & 4),
				!!(state & 1),
				!!(state & 2)
			];
		if (point == this._point) {
			if (selected) {
				// We're selecting point, deselect the handles
				selection[1] = selection[2] = false;
			} else {
				var previous = this.getPrevious(),
					next = this.getNext();
				// When deselecting a point, the handles get selected instead
				// depending on the selection state of their neighbors.
				selection[1] = previous && (previous._point.isSelected()
						|| previous._handleOut.isSelected());
				selection[2] = next && (next._point.isSelected()
						|| next._handleIn.isSelected());
			}
			selection[0] = selected;
		} else {
			var index = point == this._handleIn ? 1 : 2;
			if (selection[index] != selected) {
				// When selecting handles, the point get deselected.
				if (selected)
					selection[0] = false;
				selection[index] = selected;
			}
		}
		this._selectionState = (selection[0] ? 4 : 0)
				| (selection[1] ? 1 : 0)
				| (selection[2] ? 2 : 0);
		// If the selection state of the segment has changed, we need to let
		// it's path know and possibly add or remove it from
		// project._selectedItems
		if (path && state != this._selectionState) {
			path._updateSelection(this, state, this._selectionState);
			// Let path know that we changed something and the view should be
			// redrawn
			path._changed(33);
		}
	},



	/**
	 * Specifies whether the {@link #point} of the segment is selected.
	 * @type Boolean
	 * @bean
	 * @example {@paperscript}
	 * var path = new Path.Circle({
	 * 	center: [80, 50],
	 * 	radius: 40
	 * });
	 * 
	 * // Select the third segment point:
	 * path.segments[2].selected = true;
	 */
	isSelected: function() {
		return this._isSelected(this._point);
	},

	setSelected: function(selected) {
		this._setSelected(this._point, selected);
	},

	/**
	 * {@grouptitle Hierarchy}
	 *
	 * The index of the segment in the {@link Path#segments} array that the
	 * segment belongs to.
	 *
	 * @type Number
	 * @bean
	 */
	getIndex: function() {
		return this._index !== undefined ? this._index : null;
	},

	/**
	 * The path that the segment belongs to.
	 *
	 * @type Path
	 * @bean
	 */
	getPath: function() {
		return this._path || null;
	},

	/**
	 * The curve that the segment belongs to.
	 *
	 * @type Curve
	 * @bean
	 */
	getCurve: function() {
		if (this._path) {
			var index = this._index;
			// The last segment of an open path belongs to the last curve
			if (!this._path._closed && index == this._path._segments.length - 1)
				index--;
			return this._path.getCurves()[index] || null;
		}
		return null;
	},

	/**
	 * {@grouptitle Sibling Segments}
	 *
	 * The next segment in the {@link Path#segments} array that the segment
	 * belongs to. If the segments belongs to a closed path, the first segment
	 * is returned for the last segment of the path.
	 *
	 * @type Segment
	 * @bean
	 */
	getNext: function() {
		var segments = this._path && this._path._segments;
		return segments && (segments[this._index + 1]
				|| this._path._closed && segments[0]) || null;
	},

	/**
	 * The previous segment in the {@link Path#segments} array that the
	 * segment belongs to. If the segments belongs to a closed path, the last
	 * segment is returned for the first segment of the path.
	 *
	 * @type Segment
	 * @bean
	 */
	getPrevious: function() {
		var segments = this._path && this._path._segments;
		return segments && (segments[this._index - 1]
				|| this._path._closed && segments[segments.length - 1]) || null;
	},

	/**
	 * Returns the reversed the segment, without modifying the segment itself.
	 * @return {Segment} the reversed segment
	 */
	reverse: function() {
		return new Segment(this._point, this._handleOut, this._handleIn);
	},

	/**
	 * Removes the segment from the path that it belongs to.
	 */
	remove: function() {
		return this._path ? !!this._path.removeSegment(this._index) : false;
	},

	clone: function() {
		return new Segment(this._point, this._handleIn, this._handleOut);
	},

	equals: function(segment) {
		return segment == this || segment
				&& this._point.equals(segment._point)
				&& this._handleIn.equals(segment._handleIn)
				&& this._handleOut.equals(segment._handleOut);
	},

	/**
	 * @return {String} A string representation of the segment.
	 */
	toString: function() {
		var parts = [ 'point: ' + this._point ];
		if (!this._handleIn.isZero())
			parts.push('handleIn: ' + this._handleIn);
		if (!this._handleOut.isZero())
			parts.push('handleOut: ' + this._handleOut);
		return '{ ' + parts.join(', ') + ' }';
	},

	_transformCoordinates: function(matrix, coords, change) {
		// Use matrix.transform version() that takes arrays of multiple
		// points for largely improved performance, as no calls to
		// Point.read() and Point constructors are necessary.
		var point = this._point,
			// If change is true, only transform handles if they are set, as
			// _transformCoordinates is called only to change the segment, no
			// to receive the coords.
			// This saves some computation time. If change is false, always
			// use the real handles, as we just want to receive a filled
			// coords array for getBounds().
			handleIn =  !change || !this._handleIn.isZero()
					? this._handleIn : null,
			handleOut = !change || !this._handleOut.isZero()
					? this._handleOut : null,
			x = point._x,
			y = point._y,
			i = 2;
		coords[0] = x;
		coords[1] = y;
		// We need to convert handles to absolute coordinates in order
		// to transform them.
		if (handleIn) {
			coords[i++] = handleIn._x + x;
			coords[i++] = handleIn._y + y;
		}
		if (handleOut) {
			coords[i++] = handleOut._x + x;
			coords[i++] = handleOut._y + y;
		}
		// If no matrix was previded, this was just called to get the coords and
		// we are done now.
		if (matrix) {
			matrix._transformCoordinates(coords, 0, coords, 0, i / 2);
			x = coords[0];
			y = coords[1];
			if (change) {
				// If change is true, we need to set the new values back
				point._x = x;
				point._y = y;
				i  = 2;
				if (handleIn) {
					handleIn._x = coords[i++] - x;
					handleIn._y = coords[i++] - y;
				}
				if (handleOut) {
					handleOut._x = coords[i++] - x;
					handleOut._y = coords[i++] - y;
				}
			} else {
				// We want to receive the results in coords, so make sure
				// handleIn and out are defined too, even if they're 0
				if (!handleIn) {
					coords[i++] = x;
					coords[i++] = y;
				}
				if (!handleOut) {
					coords[i++] = x;
					coords[i++] = y;
				}
			}
		}
		return coords;
		// NOTE: There is a very strange bug in JavaScriptCore that causes
		// segments to receive wrong handleIn values after the transformation of
		// a very large amount of segments.
		// For some strange reason, this unreachable stamement causes
		// JavaScriptCore to optimize code differently and not cause the error.
		// Note that there is no nop() function...
		nop().nop();
	}
});

/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2013, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

/**
 * @name SegmentPoint
 * @class An internal version of Point that notifies its segment of each change
 * Note: This prototype is not exported.
 *
 * @private
 */
var SegmentPoint = Point.extend({
	set: function(x, y) {
		this._x = x;
		this._y = y;
		this._owner._changed(this);
		return this;
	},

	getX: function() {
		return this._x;
	},

	setX: function(x) {
		this._x = x;
		this._owner._changed(this);
	},

	getY: function() {
		return this._y;
	},

	setY: function(y) {
		this._y = y;
		this._owner._changed(this);
	},

	isZero: function() {
		// Provide our own version of Point#isZero() that does not use the x / y
		// accessors but the internal properties directly, for performance
		// reasons, since it is used a lot internally.
		return Numerical.isZero(this._x) && Numerical.isZero(this._y);
	},

	setSelected: function(selected) {
		this._owner._setSelected(this, selected);
	},

	isSelected: function() {
		return this._owner._isSelected(this);
	},

	statics: {
		create: function(segment, key, pt) {
			var point = Base.create(SegmentPoint),
				x, y, selected;
			if (!pt) {
				x = y = 0;
			} else if ((x = pt[0]) !== undefined) { // Array-like
				y = pt[1];
			} else {
				// If not Point-like already, read Point from pt = 3rd argument
				if ((x = pt.x) === undefined) {
					pt = Point.read(arguments, 2);
					x = pt.x;
				}
				y = pt.y;
				selected = pt.selected;
			}
			point._x = x;
			point._y = y;
			point._owner = segment;
			// We need to set the point on the segment before copying over the
			// selected state, as otherwise this won't actually select it.
			segment[key] = point;
			if (selected)
				point.setSelected(true);
			return point;
		}
	}
});

/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2013, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

/**
 * @name Curve
 *
 * @class The Curve object represents the parts of a path that are connected by
 * two following {@link Segment} objects. The curves of a path can be accessed
 * through its {@link Path#curves} array.
 *
 * While a segment describe the anchor point and its incoming and outgoing
 * handles, a Curve object describes the curve passing between two such
 * segments. Curves and segments represent two different ways of looking at the
 * same thing, but focusing on different aspects. Curves for example offer many
 * convenient ways to work with parts of the path, finding lengths, positions or
 * tangents at given offsets.
 */
var Curve = Base.extend(/** @lends Curve# */{
	/**
	 * Creates a new curve object.
	 *
	 * @name Curve#initialize
	 * @param {Segment} segment1
	 * @param {Segment} segment2
	 */
	/**
	 * Creates a new curve object.
	 *
	 * @name Curve#initialize
	 * @param {Point} point1
	 * @param {Point} handle1
	 * @param {Point} handle2
	 * @param {Point} point2
	 */
	/**
	 * Creates a new curve object.
	 *
	 * @name Curve#initialize
	 * @ignore
	 * @param {Number} x1
	 * @param {Number} y1
	 * @param {Number} handle1x
	 * @param {Number} handle1y
	 * @param {Number} handle2x
	 * @param {Number} handle2y
	 * @param {Number} x2
	 * @param {Number} y2
	 */
	initialize: function Curve(arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7) {
		var count = arguments.length;
		if (count === 0) {
			this._segment1 = new Segment();
			this._segment2 = new Segment();
		} else if (count == 1) {
			// Note: This copies from existing segments through bean getters
			this._segment1 = new Segment(arg0.segment1);
			this._segment2 = new Segment(arg0.segment2);
		} else if (count == 2) {
			this._segment1 = new Segment(arg0);
			this._segment2 = new Segment(arg1);
		} else {
			var point1, handle1, handle2, point2;
			if (count == 4) {
				point1 = arg0;
				handle1 = arg1;
				handle2 = arg2;
				point2 = arg3;
			} else if (count == 8) {
				// Convert getValue() array back to points and handles so we
				// can create segments for those.
				point1 = [arg0, arg1];
				point2 = [arg6, arg7];
				handle1 = [arg2 - arg0, arg3 - arg1];
				handle2 = [arg4 - arg6, arg5 - arg7];
			}
			this._segment1 = new Segment(point1, null, handle1);
			this._segment2 = new Segment(point2, handle2, null);
		}
	},

	_changed: function() {
		// Clear cached values.
		delete this._length;
		delete this._bounds;
	},

	/**
	 * The first anchor point of the curve.
	 *
	 * @type Point
	 * @bean
	 */
	getPoint1: function() {
		return this._segment1._point;
	},

	setPoint1: function(point) {
		point = Point.read(arguments);
		this._segment1._point.set(point.x, point.y);
	},

	/**
	 * The second anchor point of the curve.
	 *
	 * @type Point
	 * @bean
	 */
	getPoint2: function() {
		return this._segment2._point;
	},

	setPoint2: function(point) {
		point = Point.read(arguments);
		this._segment2._point.set(point.x, point.y);
	},

	/**
	 * The handle point that describes the tangent in the first anchor point.
	 *
	 * @type Point
	 * @bean
	 */
	getHandle1: function() {
		return this._segment1._handleOut;
	},

	setHandle1: function(point) {
		point = Point.read(arguments);
		this._segment1._handleOut.set(point.x, point.y);
	},

	/**
	 * The handle point that describes the tangent in the second anchor point.
	 *
	 * @type Point
	 * @bean
	 */
	getHandle2: function() {
		return this._segment2._handleIn;
	},

	setHandle2: function(point) {
		point = Point.read(arguments);
		this._segment2._handleIn.set(point.x, point.y);
	},

	/**
	 * The first segment of the curve.
	 *
	 * @type Segment
	 * @bean
	 */
	getSegment1: function() {
		return this._segment1;
	},

	/**
	 * The second segment of the curve.
	 *
	 * @type Segment
	 * @bean
	 */
	getSegment2: function() {
		return this._segment2;
	},

	/**
	 * The path that the curve belongs to.
	 *
	 * @type Path
	 * @bean
	 */
	getPath: function() {
		return this._path;
	},

	/**
	 * The index of the curve in the {@link Path#curves} array.
	 *
	 * @type Number
	 * @bean
	 */
	getIndex: function() {
		return this._segment1._index;
	},

	/**
	 * The next curve in the {@link Path#curves} array that the curve
	 * belongs to.
	 *
	 * @type Curve
	 * @bean
	 */
	getNext: function() {
		var curves = this._path && this._path._curves;
		return curves && (curves[this._segment1._index + 1]
				|| this._path._closed && curves[0]) || null;
	},

	/**
	 * The previous curve in the {@link Path#curves} array that the curve
	 * belongs to.
	 *
	 * @type Curve
	 * @bean
	 */
	getPrevious: function() {
		var curves = this._path && this._path._curves;
		return curves && (curves[this._segment1._index - 1]
				|| this._path._closed && curves[curves.length - 1]) || null;
	},

	/**
	 * Specifies whether the handles of the curve are selected.
	 *
	 * @type Boolean
	 * @bean
	 */
	isSelected: function() {
		return this.getHandle1().isSelected() && this.getHandle2().isSelected();
	},

	setSelected: function(selected) {
		this.getHandle1().setSelected(selected);
		this.getHandle2().setSelected(selected);
	},

	getValues: function() {
		return Curve.getValues(this._segment1, this._segment2);
	},

	getPoints: function() {
		// Convert to array of absolute points
		var coords = this.getValues(),
			points = [];
		for (var i = 0; i < 8; i += 2)
			points.push(new Point(coords[i], coords[i + 1]));
		return points;
	},

	// DOCS: document Curve#getLength(from, to)
	/**
	 * The approximated length of the curve in points.
	 *
	 * @type Number
	 * @bean
	 */
	 // Hide parameters from Bootstrap so it injects bean too
	getLength: function(/* from, to */) {
		var from = arguments[0],
			to = arguments[1],
			fullLength = arguments.length === 0 || from === 0 && to === 1;
		if (fullLength && this._length != null)
			return this._length;
		var length = Curve.getLength(this.getValues(), from, to);
		if (fullLength)
			this._length = length;
		return length;
	},

	getArea: function() {
		return Curve.getArea(this.getValues());
	},

	getPart: function(from, to) {
		return new Curve(Curve.getPart(this.getValues(), from, to));
	},

	/**
	 * Checks if this curve is linear, meaning it does not define any curve
	 * handle.

	 * @return {Boolean} {@true the curve is linear}
	 */
	isLinear: function() {
		return this._segment1._handleOut.isZero()
				&& this._segment2._handleIn.isZero();
	},

	getIntersections: function(curve) {
		return Curve.getIntersections(this.getValues(), curve.getValues(),
				this, curve, []);
	},

	getCrossings: function(point, roots) {
		// Implementation of the crossing number algorithm:
		// http://en.wikipedia.org/wiki/Point_in_polygon
		// Solve the y-axis cubic polynomial for point.y and count all solutions
		// to the right of point.x as crossings.
		var vals = this.getValues(),
			count = Curve.solveCubic(vals, 1, point.y, roots),
			crossings = 0,
			tolerance = 0.00001,
			abs = Math.abs;

		// Checks the y-slope between the current curve and the previous for a
		// change of orientation, when a solution is found at t == 0
		function changesOrientation(curve, tangent) {
			return Curve.evaluate(curve.getPrevious().getValues(), 1, true, 1).y
					* tangent.y > 0;
		}

		// TODO: See if this speeds up code, or slows it down:
		// var bounds = this.getBounds();
		// if (point.y < bounds.getTop() || point.y > bounds.getBottom()
		// 		|| point.x > bounds.getRight())
		// 	return 0;

		if (count === -1) {
			// Infinite solutions, so we have a horizontal curve.
			// Find parameter through getParameterOf()
			roots[0] = Curve.getParameterOf(vals, point.x, point.y);
			count = roots[0] !== null ? 1 : 0;
		}
		for (var i = 0; i < count; i++) {
			var t = roots[i];
			if (t > -tolerance && t < 1 - tolerance) {
				var pt = Curve.evaluate(vals, t, true, 0);
				if (point.x < pt.x + tolerance) {
					// Passing 1 for Curve.evaluate() type calculates tangents
					var tan = Curve.evaluate(vals, t, true, 1);
					// Handle all kind of edge cases when points are on contours
					// or rays are touching countours, to termine wether the
					// crossing counts or not.
					// See if the actual point is on the countour:
					if (abs(pt.x - point.x) < tolerance) {
						// Do not count the crossing if it is on the left hand
						// side of the shape (tangent pointing upwards), since
						// the ray will go out the other end, count as
						// crossing there, and the point is on the contour, so
						// to be considered inside.
						var angle = tan.getAngle();
						if (angle > -180 && angle < 0
							// Handle special case where point is on a corner,
							// in which case this crossing is skipped if both
							// tangents have the same orientation.
							&& (t > tolerance || changesOrientation(this, tan)))
								continue;
					} else  {
						// Skip touching stationary points:
						if (abs(tan.y) < tolerance
							// Check derivate for stationary points. If root is
							// close to 0 and not changing vertical orientation
							// from the previous curve, do not count this root,
							// as it's touching a corner.
							|| t < tolerance && !changesOrientation(this, tan))
								continue;
					}
					crossings++;
				}
			}
		}
		return crossings;
	},

	// TODO: adjustThroughPoint

	/**
	 * Returns a reversed version of the curve, without modifying the curve
	 * itself.
	 *
	 * @return {Curve} a reversed version of the curve
	 */
	reverse: function() {
		return new Curve(this._segment2.reverse(), this._segment1.reverse());
	},

	/**
	 * Divides the curve into two at the specified position. The curve itself is
	 * modified and becomes the first part, the second part is returned as a new
	 * curve. If the modified curve belongs to a path item, the second part is
	 * added to it.
	 *
	 * @param parameter the position at which to split the curve as a value
	 *        between 0 and 1 {@default 0.5}
	 * @return {Curve} the second part of the divided curve
	 */
	divide: function(parameter) {
		var res = null;
		// Accept CurveLocation objects, and objects that act like them:
		if (parameter && parameter.curve === this)
			parameter = parameter.parameter;
		if (parameter > 0 && parameter < 1) {
			var parts = Curve.subdivide(this.getValues(), parameter),
				isLinear = this.isLinear(),
				left = parts[0],
				right = parts[1];

			// Write back the results:
			if (!isLinear) {
				this._segment1._handleOut.set(left[2] - left[0],
						left[3] - left[1]);
				// segment2 is the end segment. By inserting newSegment
				// between segment1 and 2, 2 becomes the end segment.
				// Convert absolute -> relative
				this._segment2._handleIn.set(right[4] - right[6],
						right[5] - right[7]);
			}

			// Create the new segment, convert absolute -> relative:
			var x = left[6], y = left[7],
				segment = new Segment(new Point(x, y),
						!isLinear && new Point(left[4] - x, left[5] - y),
						!isLinear && new Point(right[2] - x, right[3] - y));

			// Insert it in the segments list, if needed:
			if (this._path) {
				// Insert at the end if this curve is a closing curve of a
				// closed path, since otherwise it would be inserted at 0.
				if (this._segment1._index > 0 && this._segment2._index === 0) {
					this._path.add(segment);
				} else {
					this._path.insert(this._segment2._index, segment);
				}
				// The way Path#_add handles curves, this curve will always
				// become the owner of the newly inserted segment.
				// TODO: I expect this.getNext() to produce the correct result,
				// but since we're inserting differently in _add (something
				// linked with CurveLocation#divide()), this is not the case...
				res = this; // this.getNext();
			} else {
				// otherwise create it from the result of split
				var end = this._segment2;
				this._segment2 = segment;
				res = new Curve(segment, end);
			}
		}
		return res;
	},

	/**
	 * Splits the path that this curve belongs to at the given parameter, using
	 * {@link Path#split(index, parameter)}.
	 *
	 * @return {Path} the second part of the split path
	 */
	split: function(parameter) {
		return this._path
			? this._path.split(this._segment1._index, parameter)
			: null;
	},

	/**
	 * Returns a copy of the curve.
	 *
	 * @return {Curve}
	 */
	clone: function() {
		return new Curve(this._segment1, this._segment2);
	},

	/**
	 * @return {String} A string representation of the curve.
	 */
	toString: function() {
		var parts = [ 'point1: ' + this._segment1._point ];
		if (!this._segment1._handleOut.isZero())
			parts.push('handle1: ' + this._segment1._handleOut);
		if (!this._segment2._handleIn.isZero())
			parts.push('handle2: ' + this._segment2._handleIn);
		parts.push('point2: ' + this._segment2._point);
		return '{ ' + parts.join(', ') + ' }';
	},

// Mess with indentation in order to get more line-space below...
statics: {
	create: function(path, segment1, segment2) {
		var curve = Base.create(Curve);
		curve._path = path;
		curve._segment1 = segment1;
		curve._segment2 = segment2;
		return curve;
	},

	getValues: function(segment1, segment2) {
		var p1 = segment1._point,
			h1 = segment1._handleOut,
			h2 = segment2._handleIn,
			p2 = segment2._point;
		return [
			p1._x, p1._y,
			p1._x + h1._x, p1._y + h1._y,
			p2._x + h2._x, p2._y + h2._y,
			p2._x, p2._y
		];
	},

	evaluate: function(v, offset, isParameter, type) {
		var t = isParameter ? offset : Curve.getParameterAt(v, offset, 0),
			p1x = v[0], p1y = v[1],
			c1x = v[2], c1y = v[3],
			c2x = v[4], c2y = v[5],
			p2x = v[6], p2y = v[7],
			x, y;

		// Handle special case at beginning / end of curve
		if (type === 0 && (t === 0 || t === 1)) {
			x = t === 0 ? p1x : p2x;
			y = t === 0 ? p1y : p2y;
		} else {
			// Calculate the polynomial coefficients.
			var cx = 3 * (c1x - p1x),
				bx = 3 * (c2x - c1x) - cx,
				ax = p2x - p1x - cx - bx,

				cy = 3 * (c1y - p1y),
				by = 3 * (c2y - c1y) - cy,
				ay = p2y - p1y - cy - by;
			switch (type) {
			case 0: // point
				// Calculate the curve point at parameter value t
				x = ((ax * t + bx) * t + cx) * t + p1x;
				y = ((ay * t + by) * t + cy) * t + p1y;
				break;
			case 1: // tangent, 1st derivative
			case 2: // normal, 1st derivative
				// Prevent tangents and normals of length 0:
				// http://stackoverflow.com/questions/10506868/
				var tMin = 0.00001;
				if (t < tMin && c1x == p1x && c1y == p1y
						|| t > 1 - tMin && c2x == p2x && c2y == p2y) {
					x = c2x - c1x;
					y = c2y - c1y;
				} else {
					// Simply use the derivation of the bezier function for both
					// the x and y coordinates:
					x = (3 * ax * t + 2 * bx) * t + cx;
					y = (3 * ay * t + 2 * by) * t + cy;
				}
				break;
			case 3: // curvature, 2nd derivative
				x = 6 * ax * t + 2 * bx;
				y = 6 * ay * t + 2 * by;
				break;
			}
		}
		// The normal is simply the rotated tangent:
		return type == 2 ? new Point(y, -x) : new Point(x, y);
	},

	subdivide: function(v, t) {
		var p1x = v[0], p1y = v[1],
			c1x = v[2], c1y = v[3],
			c2x = v[4], c2y = v[5],
			p2x = v[6], p2y = v[7];
		if (t === undefined)
			t = 0.5;
		// Triangle computation, with loops unrolled.
		var u = 1 - t,
			// Interpolate from 4 to 3 points
			p3x = u * p1x + t * c1x, p3y = u * p1y + t * c1y,
			p4x = u * c1x + t * c2x, p4y = u * c1y + t * c2y,
			p5x = u * c2x + t * p2x, p5y = u * c2y + t * p2y,
			// Interpolate from 3 to 2 points
			p6x = u * p3x + t * p4x, p6y = u * p3y + t * p4y,
			p7x = u * p4x + t * p5x, p7y = u * p4y + t * p5y,
			// Interpolate from 2 points to 1 point
			p8x = u * p6x + t * p7x, p8y = u * p6y + t * p7y;
		// We now have all the values we need to build the subcurves:
		return [
			[p1x, p1y, p3x, p3y, p6x, p6y, p8x, p8y], // left
			[p8x, p8y, p7x, p7y, p5x, p5y, p2x, p2y] // right
		];
	},

	// Converts from the point coordinates (p1, c1, c2, p2) for one axis to
	// the polynomial coefficients and solves the polynomial for val
	solveCubic: function (v, coord, val, roots) {
		var p1 = v[coord],
			c1 = v[coord + 2],
			c2 = v[coord + 4],
			p2 = v[coord + 6],
			c = 3 * (c1 - p1),
			b = 3 * (c2 - c1) - c,
			a = p2 - p1 - c - b;
		return Numerical.solveCubic(a, b, c, p1 - val, roots);
	},

	getParameterOf: function(v, x, y) {
		// Handle beginnings and end seperately, as they are not detected
		// sometimes.
		if (Math.abs(v[0] - x) < 0.00001
				&& Math.abs(v[1] - y) < 0.00001)
			return 0;
		if (Math.abs(v[6] - x) < 0.00001
				&& Math.abs(v[7] - y) < 0.00001)
			return 1;
		var txs = [],
			tys = [],
			sx = Curve.solveCubic(v, 0, x, txs),
			sy = Curve.solveCubic(v, 1, y, tys),
			tx, ty;
		// sx, sy == -1 means infinite solutions:
		// Loop through all solutions for x and match with solutions for y,
		// to see if we either have a matching pair, or infinite solutions
		// for one or the other.
		for (var cx = 0;  sx == -1 || cx < sx;) {
			if (sx == -1 || (tx = txs[cx++]) >= 0 && tx <= 1) {
				for (var cy = 0; sy == -1 || cy < sy;) {
					if (sy == -1 || (ty = tys[cy++]) >= 0 && ty <= 1) {
						// Handle infinite solutions by assigning root of
						// the other polynomial
						if (sx == -1) tx = ty;
						else if (sy == -1) ty = tx;
						// Use average if we're within tolerance
						if (Math.abs(tx - ty) < 0.00001)
							return (tx + ty) * 0.5;
					}
				}
				// Avoid endless loops here: If sx is infinite and there was
				// no fitting ty, there's no solution for this bezier
				if (sx == -1)
					break;
			}
		}
		return null;
	},

	// TODO: Find better name
	getPart: function(v, from, to) {
		if (from > 0)
			v = Curve.subdivide(v, from)[1]; // [1] right
		// Interpolate the  parameter at 'to' in the new curve and
		// cut there.
		if (to < 1)
			v = Curve.subdivide(v, (to - from) / (1 - from))[0]; // [0] left
		return v;
	},

	isLinear: function(v) {
		return v[0] === v[2] && v[1] === v[3] && v[4] === v[6] && v[5] === v[7];
	},

	isFlatEnough: function(v, tolerance) {
		// Thanks to Kaspar Fischer and Roger Willcocks for the following:
		// http://hcklbrrfnn.files.wordpress.com/2012/08/bez.pdf
		var p1x = v[0], p1y = v[1],
			c1x = v[2], c1y = v[3],
			c2x = v[4], c2y = v[5],
			p2x = v[6], p2y = v[7],
			ux = 3 * c1x - 2 * p1x - p2x,
			uy = 3 * c1y - 2 * p1y - p2y,
			vx = 3 * c2x - 2 * p2x - p1x,
			vy = 3 * c2y - 2 * p2y - p1y;
		return Math.max(ux * ux, vx * vx) + Math.max(uy * uy, vy * vy)
				< 10 * tolerance * tolerance;
	},

	getBounds: function(v) {
		var min = v.slice(0, 2), // Start with values of point1
			max = min.slice(), // clone
			roots = [0, 0];
		for (var i = 0; i < 2; i++)
			Curve._addBounds(v[i], v[i + 2], v[i + 4], v[i + 6],
					i, 0, min, max, roots);
		return new Rectangle(min[0], min[1], max[0] - min[0], max[1] - min[1]);
	},

	/**
	 * Private helper for both Curve.getBounds() and Path.getBounds(), which
	 * finds the 0-crossings of the derivative of a bezier curve polynomial, to
	 * determine potential extremas when finding the bounds of a curve.
	 * Note: padding is only used for Path.getBounds().
	 */
	_addBounds: function(v0, v1, v2, v3, coord, padding, min, max, roots) {
		// Code ported and further optimised from:
		// http://blog.hackers-cafe.net/2009/06/how-to-calculate-bezier-curves-bounding.html
		function add(value, padding) {
			var left = value - padding,
				right = value + padding;
			if (left < min[coord])
				min[coord] = left;
			if (right > max[coord])
				max[coord] = right;
		}
		// Calculate derivative of our bezier polynomial, divided by 3.
		// Doing so allows for simpler calculations of a, b, c and leads to the
		// same quadratic roots.
		var a = 3 * (v1 - v2) - v0 + v3,
			b = 2 * (v0 + v2) - 4 * v1,
			c = v1 - v0,
			count = Numerical.solveQuadratic(a, b, c, roots),
			// Add some tolerance for good roots, as t = 0 / 1 are added
			// seperately anyhow, and we don't want joins to be added with
			// radiuses in getStrokeBounds()
			tMin = 0.00001,
			tMax = 1 - tMin;
		// Only add strokeWidth to bounds for points which lie  within 0 < t < 1
		// The corner cases for cap and join are handled in getStrokeBounds()
		add(v3, 0);
		for (var i = 0; i < count; i++) {
			var t = roots[i],
				u = 1 - t;
			// Test for good roots and only add to bounds if good.
			if (tMin < t && t < tMax)
				// Calculate bezier polynomial at t.
				add(u * u * u * v0
					+ 3 * u * u * t * v1
					+ 3 * u * t * t * v2
					+ t * t * t * v3,
					padding);
		}
	}
}}, Base.each(['getBounds', 'getStrokeBounds', 'getHandleBounds', 'getRoughBounds'],
	// Note: Although Curve.getBounds() exists, we are using Path.getBounds() to
	// determine the bounds of Curve objects with defined segment1 and segment2
	// values Curve.getBounds() can be used directly on curve arrays, without
	// the need to create a Curve object first, as required by the code that
	// finds path interesections.
	function(name) {
		this[name] = function() {
			if (!this._bounds)
				this._bounds = {};
			var bounds = this._bounds[name];
			if (!bounds) {
				// Calculate the curve bounds by passing a segment list for the
				// curve to the static Path.get*Boudns methods.
				bounds = this._bounds[name] = Path[name](
					[this._segment1, this._segment2], false, this._path._style);
			}
			return bounds.clone();
		};
	},
/** @lends Curve# */{
	/**
	 * The bounding rectangle of the curve excluding stroke width.
	 *
	 * @name Curve#getBounds
	 * @type Rectangle
	 * @bean
	 */

	/**
	 * The bounding rectangle of the curve including stroke width.
	 *
	 * @name Curve#getStrokeBounds
	 * @type Rectangle
	 * @bean
	 */

	/**
	 * The bounding rectangle of the curve including handles.
	 *
	 * @name Curve#getHandleBounds
	 * @type Rectangle
	 * @bean
	 */

	/**
	 * The rough bounding rectangle of the curve that is shure to include all of
	 * the drawing, including stroke width.
	 *
	 * @name Curve#getRoughBounds
	 * @type Rectangle
	 * @bean
	 * @ignore
	 */
}), Base.each(['getPoint', 'getTangent', 'getNormal', 'getCurvature'],
	// Note: Although Curve.getBounds() exists, we are using Path.getBounds() to
	// determine the bounds of Curve objects with defined segment1 and segment2
	// values Curve.getBounds() can be used directly on curve arrays, without
	// the need to create a Curve object first, as required by the code that
	// finds path interesections.
	function(name, index) {
		this[name + 'At'] = function(offset, isParameter) {
			return Curve.evaluate(this.getValues(), offset, isParameter, index);
		};
		// Deprecated and undocumented, but keep around for now.
		// TODO: Remove once enough time has passed (28.01.2013)
		this[name] = function(parameter) {
			return Curve.evaluate(this.getValues(), parameter, true, index);
		};
	},
/** @lends Curve# */{
	/**
	 * Calculates the curve time parameter of the specified offset on the path,
	 * relative to the provided start parameter. If offset is a negative value,
	 * the parameter is searched to the left of the start parameter. If no start
	 * parameter is provided, a default of {@code 0} for positive values of
	 * {@code offset} and {@code 1} for negative values of {@code offset}.
	 * @param {Number} offset
	 * @param {Number} [start]
	 * @return {Number} the curve time parameter at the specified offset.
	 */
	getParameterAt: function(offset, start) {
		return Curve.getParameterAt(this.getValues(), offset,
				start !== undefined ? start : offset < 0 ? 1 : 0);
	},

	/**
	 * Returns the curve time parameter of the specified point if it lies on the
	 * curve, {@code null} otherwise.
	 * @param {Point} point the point on the curve.
	 * @return {Number} the curve time parameter of the specified point.
	 */
	getParameterOf: function(point) {
		point = Point.read(arguments);
		return Curve.getParameterOf(this.getValues(), point.x, point.y);
	},

	/**
	 * Calculates the curve location at the specified offset or curve time
	 * parameter.
	 * @param {Number} offset the offset on the curve, or the curve time
	 *        parameter if {@code isParameter} is {@code true}
	 * @param {Boolean} [isParameter=false] pass {@code true} if {@code offset}
	 *        is a curve time parameter.
	 * @return {CurveLocation} the curve location at the specified the offset.
	 */
	getLocationAt: function(offset, isParameter) {
		if (!isParameter)
			offset = this.getParameterAt(offset);
		return new CurveLocation(this, offset);
	},

	/**
	 * Returns the curve location of the specified point if it lies on the
	 * curve, {@code null} otherwise.
	 * @param {Point} point the point on the curve.
	 * @return {CurveLocation} the curve location of the specified point.
	 */
	getLocationOf: function(point) {
		var t = this.getParameterOf.apply(this, arguments);
		return t != null ? new CurveLocation(this, t) : null;
	},

	getNearestLocation: function(point) {
		point = Point.read(arguments);
		var values = this.getValues(),
			step = 1 / 100,
			tolerance = Numerical.TOLERANCE,
			minDist = Infinity,
			minT = 0,
			max = 1 + tolerance; // Accomodate imprecision

		function refine(t) {
			if (t >= 0 && t <= 1) {
				var dist = point.getDistance(
						Curve.evaluate(values, t, true, 0), true);
				if (dist < minDist) {
					minDist = dist;
					minT = t;
					return true;
				}
			}
		}

		for (var t = 0; t <= max; t += step)
			refine(t);

		// Now iteratively refine solution until we reach desired precision.
		step /= 2;
		while (step > tolerance) {
			if (!refine(minT - step) && !refine(minT + step))
				step /= 2;
		}
		var pt = Curve.evaluate(values, minT, true, 0);
		return new CurveLocation(this, minT, pt, null, point.getDistance(pt));
	},

	getNearestPoint: function(point) {
		return this.getNearestLocation.apply(this, arguments).getPoint();
	}

	/**
	 * Returns the point on the curve at the specified offset.
	 *
	 * @name Curve#getPointAt
	 * @function
	 * @param {Number} offset the offset on the curve, or the curve time
	 *        parameter if {@code isParameter} is {@code true}
	 * @param {Boolean} [isParameter=false] pass {@code true} if {@code offset}
	 *        is a curve time parameter.
	 * @return {Point} the point on the curve at the specified offset.
	 */

	/**
	 * Returns the tangent vector of the curve at the specified position.
	 *
	 * @name Curve#getTangentAt
	 * @function
	 * @param {Number} offset the offset on the curve, or the curve time
	 *        parameter if {@code isParameter} is {@code true}
	 * @param {Boolean} [isParameter=false] pass {@code true} if {@code offset}
	 *        is a curve time parameter.
	 * @return {Point} the tangent of the curve at the specified offset.
	 */

	/**
	 * Returns the normal vector of the curve at the specified position.
	 *
	 * @name Curve#getNormalAt
	 * @function
	 * @param {Number} offset the offset on the curve, or the curve time
	 *        parameter if {@code isParameter} is {@code true}
	 * @param {Boolean} [isParameter=false] pass {@code true} if {@code offset}
	 *        is a curve time parameter.
	 * @return {Point} the normal of the curve at the specified offset.
	 */

	/**
	 * Returns the curvature vector of the curve at the specified position.
	 *
	 * @name Curve#getCurvatureAt
	 * @function
	 * @param {Number} offset the offset on the curve, or the curve time
	 *        parameter if {@code isParameter} is {@code true}
	 * @param {Boolean} [isParameter=false] pass {@code true} if {@code offset}
	 *        is a curve time parameter.
	 * @return {Point} the curvature of the curve at the specified offset.
	 */
}),
new function() { // Scope for methods that require numerical integration

	function getLengthIntegrand(v) {
		// Calculate the coefficients of a Bezier derivative.
		var p1x = v[0], p1y = v[1],
			c1x = v[2], c1y = v[3],
			c2x = v[4], c2y = v[5],
			p2x = v[6], p2y = v[7],

			ax = 9 * (c1x - c2x) + 3 * (p2x - p1x),
			bx = 6 * (p1x + c2x) - 12 * c1x,
			cx = 3 * (c1x - p1x),

			ay = 9 * (c1y - c2y) + 3 * (p2y - p1y),
			by = 6 * (p1y + c2y) - 12 * c1y,
			cy = 3 * (c1y - p1y);

		return function(t) {
			// Calculate quadratic equations of derivatives for x and y
			var dx = (ax * t + bx) * t + cx,
				dy = (ay * t + by) * t + cy;
			return Math.sqrt(dx * dx + dy * dy);
		};
	}

	// Amount of integral evaluations for the interval 0 <= a < b <= 1
	function getIterations(a, b) {
		// Guess required precision based and size of range...
		// TODO: There should be much better educated guesses for
		// this. Also, what does this depend on? Required precision?
		return Math.max(2, Math.min(16, Math.ceil(Math.abs(b - a) * 32)));
	}

	return {
		statics: true,

		getLength: function(v, a, b) {
			if (a === undefined)
				a = 0;
			if (b === undefined)
				b = 1;
			// if (p1 == c1 && p2 == c2):
			if (v[0] == v[2] && v[1] == v[3] && v[6] == v[4] && v[7] == v[5]) {
				// Straight line
				var dx = v[6] - v[0], // p2x - p1x
					dy = v[7] - v[1]; // p2y - p1y
				return (b - a) * Math.sqrt(dx * dx + dy * dy);
			}
			var ds = getLengthIntegrand(v);
			return Numerical.integrate(ds, a, b, getIterations(a, b));
		},

		getArea: function(v) {
			var p1x = v[0], p1y = v[1],
				c1x = v[2], c1y = v[3],
				c2x = v[4], c2y = v[5],
				p2x = v[6], p2y = v[7];
			// http://objectmix.com/graphics/133553-area-closed-bezier-curve.html
			return (  3.0 * c1y * p1x - 1.5 * c1y * c2x
					- 1.5 * c1y * p2x - 3.0 * p1y * c1x
					- 1.5 * p1y * c2x - 0.5 * p1y * p2x
					+ 1.5 * c2y * p1x + 1.5 * c2y * c1x
					- 3.0 * c2y * p2x + 0.5 * p2y * p1x
					+ 1.5 * p2y * c1x + 3.0 * p2y * c2x) / 10;
		},

		getParameterAt: function(v, offset, start) {
			if (offset === 0)
				return start;
			// See if we're going forward or backward, and handle cases
			// differently
			var forward = offset > 0,
				a = forward ? start : 0,
				b = forward ? 1 : start,
				offset = Math.abs(offset),
				// Use integrand to calculate both range length and part
				// lengths in f(t) below.
				ds = getLengthIntegrand(v),
				// Get length of total range
				rangeLength = Numerical.integrate(ds, a, b,
						getIterations(a, b));
			if (offset >= rangeLength)
				return forward ? b : a;
			// Use offset / rangeLength for an initial guess for t, to
			// bring us closer:
			var guess = offset / rangeLength,
				length = 0;
			// Iteratively calculate curve range lengths, and add them up,
			// using integration precision depending on the size of the
			// range. This is much faster and also more precise than not
			// modifing start and calculating total length each time.
			function f(t) {
				var count = getIterations(start, t);
				length += start < t
						? Numerical.integrate(ds, start, t, count)
						: -Numerical.integrate(ds, t, start, count);
				start = t;
				return length - offset;
			}
			return Numerical.findRoot(f, ds,
					forward ? a + guess : b - guess, // Initial guess for x
					a, b, 16, 0.00001);
		}
	};
}, new function() { // Scope for intersection using bezier fat-line clipping
	function addLocation(locations, curve1, parameter, point, curve2) {
		// Avoid duplicates when hitting segments (closed paths too)
		var first = locations[0],
			last = locations[locations.length - 1];
		if ((!first || !point.equals(first._point))
				&& (!last || !point.equals(last._point)))
			locations.push(new CurveLocation(curve1, parameter, point, curve2));
	}

	function addCurveIntersections(v1, v2, curve1, curve2, locations,
			range1, range2, recursion) {
		var bounds1 = Curve.getBounds(v1),
			bounds2 = Curve.getBounds(v2);
		if (bounds1.touches(bounds2)) {
			// See if both curves are flat enough to be treated as lines, either
			// because they have no control points at all, or are "flat enough"
			// If the curve was flat in a previous iteration, we don't need to
			// recalculate since it does not need further subdivision then.
			if ((Curve.isLinear(v1)
					|| Curve.isFlatEnough(v1, 0.00001))
				&& (Curve.isLinear(v2)
					|| Curve.isFlatEnough(v2, 0.00001))) {
				// See if the parametric equations of the lines interesct.
				addLineIntersection(v1, v2, curve1, curve2, locations);
			} else {
				// Subdivide both curves, and see if they intersect.
				// If one of the curves is flat already, no further subdivion
				// is required.
				var v1s = Curve.subdivide(v1),
					v2s = Curve.subdivide(v2);
				for (var i = 0; i < 2; i++)
					for (var j = 0; j < 2; j++)
						Curve.getIntersections(v1s[i], v2s[j], curve1, curve2,
								locations);
			}
		}
		return locations;
	}


	/**
	 * Intersections between curve and line becomes rather simple here mostly
	 * because of Numerical class. We can rotate the curve and line so that the
	 * line is on the X axis, and solve the implicit equations for the X axis
	 * and the curve.
	 */
	function addCurveLineIntersections(v1, v2, curve1, curve2, locations, flip) {
		if (flip === undefined)
			flip = Curve.isLinear(v1);
		var vc = flip ? v2 : v1,
			vl = flip ? v1 : v2,
			l1x = vl[0], l1y = vl[1],
			l2x = vl[6], l2y = vl[7],
			// Rotate both curve and line around l1 so that line is on x axis
			lvx = l2x - l1x,
			lvy = l2y - l1y,
			// Angle with x axis (1, 0)
			angle = Math.atan2(-lvy, lvx),
			sin = Math.sin(angle),
			cos = Math.cos(angle),
			// (rl1x, rl1y) = (0, 0)
			rl2x = lvx * cos - lvy * sin,
			rl2y = lvy * cos + lvx * sin,
			vcr = [];

		for(var i = 0; i < 8; i += 2) {
			var x = vc[i] - l1x,
				y = vc[i + 1] - l1y;
			vcr.push(
				x * cos - y * sin,
				y * cos + x * sin);
		}
		var roots = [],
			count = Curve.solveCubic(vcr, 1, 0, roots);
		// NOTE: count could be -1 for inifnite solutions, but that should only
		// happen with lines, in which case we should not be here.
		for (var i = 0; i < count; i++) {
			var t = roots[i];
			if (t >= 0 && t <= 1) {
				var point = Curve.evaluate(vcr, t, true, 0);
				// We do have a point on the infinite line. Check if it falls on
				// the line *segment*.
				if (point.x  >= 0 && point.x <= rl2x)
					addLocation(locations,
							flip ? curve2 : curve1,
							// The actual intersection point
							t, Curve.evaluate(vc, t, true, 0), 
							flip ? curve1 : curve2);
			}
		}
	}

	function addLineIntersection(v1, v2, curve1, curve2, locations) {
		var point = Line.intersect(
				v1[0], v1[1], v1[6], v1[7],
				v2[0], v2[1], v2[6], v2[7]);
		// Passing null for parameter leads to lazy determination of parameter
		// values in CurveLocation#getParameter() only once they are requested.
		if (point)
			addLocation(locations, curve1, null, point, curve2);
	}

	return { statics: /** @lends Curve */{
		// We need to provide the original left curve reference to the
		// #getIntersections() calls as it is required to create the resulting
		// CurveLocation objects.
		getIntersections: function(v1, v2, curve1, curve2, locations) {
			var linear1 = Curve.isLinear(v1),
				linear2 = Curve.isLinear(v2);
			// Determine the correct intersection method based on values of
			// linear1 & 2:
			(linear1 && linear2
				? addLineIntersection
				: linear1 || linear2
					? addCurveLineIntersections
					: addCurveIntersections)(v1, v2, curve1, curve2, locations);
			return locations;
		}
	}};
});

/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2013, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

/**
 * @name CurveLocation
 *
 * @class CurveLocation objects describe a location on {@link Curve}
 * objects, as defined by the curve {@link #parameter}, a value between
 * {@code 0} (beginning of the curve) and {@code 1} (end of the curve). If
 * the curve is part of a {@link Path} item, its {@link #index} inside the
 * {@link Path#curves} array is also provided.
 *
 * The class is in use in many places, such as
 * {@link Path#getLocationAt(offset, isParameter)},
 * {@link Path#getLocationOf(point)},
 * {@link Path#getNearestLocation(point),
 * {@link PathItem#getIntersections(path)},
 * etc.
 */
var CurveLocation = Base.extend(/** @lends CurveLocation# */{
	// DOCS: CurveLocation class description: add these back when the  mentioned
	// functioned have been added: {@link Path#split(location)}
	/**
	 * Creates a new CurveLocation object.
	 *
	 * @param {Curve} curve
	 * @param {Number} parameter
	 * @param {Point} point
	 */
	initialize: function CurveLocation(curve, parameter, point, _otherCurve,
			_distance) {
		// Define this CurveLocation's unique id.
		this._id = CurveLocation._id = (CurveLocation._id || 0) + 1;
		this._curve = curve;
		// Also store references to segment1 and segment2, in case path
		// splitting / dividing is going to happen, in which case the segments
		// can be used to determine the new curves, see #getCurve(true)
		this._segment1 = curve._segment1;
		this._segment2 = curve._segment2;
		this._parameter = parameter;
		this._point = point;
		this._otherCurve = _otherCurve;
		this._distance = _distance;
	},

	/**
	 * The segment of the curve which is closer to the described location.
	 *
	 * @type Segment
	 * @bean
	 */
	getSegment: function(/* preferFirst */) {
		if (!this._segment) {
			var curve = this.getCurve(),
				parameter = this.getParameter();
			if (parameter === 1) {
				this._segment = curve._segment2;
			} else if (parameter === 0 || arguments[0]) {
				this._segment = curve._segment1;
			} else if (parameter == null) {
				return null;
			} else {
				// Determine the closest segment by comparing curve lengths
				this._segment = curve.getLength(0, parameter)
					< curve.getLength(parameter, 1)
						? curve._segment1
						: curve._segment2;
			}
		}
		return this._segment;
	},

	/**
	 * The curve by which the location is defined.
	 *
	 * @type Curve
	 * @bean
	 */
	getCurve: function(/* uncached */) {
		if (!this._curve || arguments[0]) {
			// If we're asked to get the curve uncached, access current curve
			// objects through segment1 / segment2. Since path splitting or
			// dividing might have happened in the meantime, try segment1's
			// curve, and see if _point lies on it still, otherwise assume it's
			// the curve before segment2.
			this._curve = this._segment1.getCurve();
			if (this._curve.getParameterOf(this._point) == null)
				this._curve = this._segment2.getPrevious().getCurve();
		}
		return this._curve;
	},

	/**
	 * The curve location on the intersecting curve, if this location is the
	 * result of a call to {@link PathItem#getIntersections(path)} /
	 * {@link Curve#getIntersections(curve)}.
	 *
	 * @type CurveLocation
	 * @bean
	 */
	getIntersection: function() {
		var intersection = this._intersection;
		if (!intersection && this._otherCurve) {
			// _point is always defined for intersection
			intersection = this._intersection = new CurveLocation(
					this._otherCurve, null, this._point, this);
			// Link both ways
			intersection._intersection = this;
		}
		return intersection;
	},

	/**
	 * The path this curve belongs to, if any.
	 *
	 * @type Item
	 * @bean
	 */
	getPath: function() {
		var curve = this.getCurve();
		return curve && curve._path;
	},

	/**
	 * The index of the curve within the {@link Path#curves} list, if the
	 * curve is part of a {@link Path} item.
	 *
	 * @type Index
	 * @bean
	 */
	getIndex: function() {
		var curve = this.getCurve();
		return curve && curve.getIndex();
	},

	/**
	 * The length of the path from its beginning up to the location described
	 * by this object.
	 *
	 * @type Number
	 * @bean
	 */
	getOffset: function() {
		var path = this.getPath();
		return path && path._getOffset(this);
	},

	/**
	 * The length of the curve from its beginning up to the location described
	 * by this object.
	 *
	 * @type Number
	 * @bean
	 */
	getCurveOffset: function() {
		var curve = this.getCurve(),
			parameter = this.getParameter();
		return parameter != null && curve && curve.getLength(0, parameter);
	},

	/**
	 * The curve parameter, as used by various bezier curve calculations. It is
	 * value between {@code 0} (beginning of the curve) and {@code 1} (end of
	 * the curve).
	 *
	 * @type Number
	 * @bean
	 */
	getParameter: function(/* uncached */) {
		if ((this._parameter == null || arguments[0]) && this._point) {
			var curve = this.getCurve(arguments[0] && this._point);
			this._parameter = curve && curve.getParameterOf(this._point);
		}
		return this._parameter;
	},

	/**
	 * The point which is defined by the {@link #curve} and
	 * {@link #parameter}.
	 *
	 * @type Point
	 * @bean
	 */
	getPoint: function() {
		if (!this._point && this._parameter != null) {
			var curve = this.getCurve();
			this._point = curve && curve.getPointAt(this._parameter, true);
		}
		return this._point;
	},

	/**
	 * The tangential vector to the {@link #curve} at the given location.
	 *
	 * @type Point
	 * @bean
	 */
	getTangent: function() {
		var parameter = this.getParameter(),
			curve = this.getCurve();
		return parameter != null && curve && curve.getTangentAt(parameter, true);
	},

	/**
	 * The normal vector to the {@link #curve} at the given location.
	 *
	 * @type Point
	 * @bean
	 */
	getNormal: function() {
		var parameter = this.getParameter(),
			curve = this.getCurve();
		return parameter != null && curve && curve.getNormalAt(parameter, true);
	},

	/**
	 * The distance from the queried point to the returned location.
	 *
	 * @type Number
	 * @bean
	 */
	getDistance: function() {
		return this._distance;
	},

	divide: function() {
		var curve = this.getCurve(true);
		return curve && curve.divide(this.getParameter(true));
	},

	split: function() {
		var curve = this.getCurve(true);
		return curve && curve.split(this.getParameter(true));
	},

	/**
	 * @return {String} A string representation of the curve location.
	 */
	toString: function() {
		var parts = [],
			point = this.getPoint(),
			f = Formatter.instance;
		if (point)
			parts.push('point: ' + point);
		var index = this.getIndex();
		if (index != null)
			parts.push('index: ' + index);
		var parameter = this.getParameter();
		if (parameter != null)
			parts.push('parameter: ' + f.number(parameter));
		if (this._distance != null)
			parts.push('distance: ' + f.number(this._distance));
		return '{ ' + parts.join(', ') + ' }';
	}
});

/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2013, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

/**
 * @name PathItem
 *
 * @class The PathItem class is the base for any items that describe paths
 * and offer standardised methods for drawing and path manipulation, such as
 * {@link Path} and {@link CompoundPath}.
 *
 * @extends Item
 */
var PathItem = Item.extend(/** @lends PathItem# */{
	initialize: function PathItem() {
		Item.apply(this, arguments);
	},

	/**
	 * Returns all intersections between two {@link PathItem} items as an array
	 * of {@link CurveLocation} objects. {@link CompoundPath} items are also
	 * supported.
	 *
	 * @param {PathItem} path the other item to find the intersections to.
	 * @return {CurveLocation[]} the locations of all intersection between the
	 * paths
	 * @example {@paperscript}
	 * // Create a rectangular path with its top-left point at
	 * // {x: 30, y: 25} and a size of {width: 50, height: 50}:
	 * var path = new Path.Rectangle(new Point(30, 25), new Size(50, 50));
	 * path.strokeColor = 'black';
	 *
	 * var secondPath = path.clone();
	 * var intersectionGroup = new Group();
	 *
	 * function onFrame(event) {
	 * 	secondPath.rotate(3);
	 *
	 * 	var intersections = path.getIntersections(secondPath);
	 * 	intersectionGroup.removeChildren();
	 *
	 * 	for (var i = 0; i < intersections.length; i++) {
	 * 		var intersectionPath = new Path.Circle({
	 * 			center: intersections[i].point,
	 * 			radius: 4,
	 * 			fillColor: 'red'
	 * 		});
	 * 		intersectionGroup.addChild(intersectionPath);
	 * 	}
	 * }
	 */
	getIntersections: function(path) {
		// First check the bounds of the two paths. If they don't intersect,
		// we don't need to iterate through their curves.
		if (!this.getBounds().touches(path.getBounds()))
			return [];
		var locations = [],
			curves1 = this.getCurves(),
			curves2 = path.getCurves(),
			length2 = curves2.length,
			values2 = [];
		for (var i = 0; i < length2; i++)
			values2[i] = curves2[i].getValues();
		for (var i = 0, l = curves1.length; i < l; i++) {
			var curve1 = curves1[i],
				values1 = curve1.getValues();
			for (var j = 0; j < length2; j++)
				Curve.getIntersections(values1, values2[j], curve1, curves2[j],
						locations);
		}
		return locations;
	},

	setPathData: function(data) {
		// This is a very compact SVG Path Data parser that works both for Path
		// and CompoundPath.

		var parts = data.match(/[a-z][^a-z]*/ig),
			coords,
			relative = false,
			control,
			current = new Point(); // the current position

		function getCoord(index, coord, update) {
			var val = parseFloat(coords[index]);
			if (relative)
				val += current[coord];
			if (update)
				current[coord] = val;
			return val;
		}

		function getPoint(index, update) {
			return new Point(
				getCoord(index, 'x', update),
				getCoord(index + 1, 'y', update)
			);
		}

		// First clear the previous content
		if (this._type === 'path')
			this.removeSegments();
		else
			this.removeChildren();

		for (var i = 0, l = parts.length; i < l; i++) {
			var part = parts[i];
				cmd = part[0],
				lower = cmd.toLowerCase();
			// Split at white-space, commas but also before signs.
			// Use positive lookahead to include signs.
			coords = part.slice(1).trim().split(/[\s,]+|(?=[+-])/);
			relative = cmd === lower;
			var length = coords.length;
			switch (lower) {
			case 'm':
			case 'l':
				for (var j = 0; j < length; j += 2)
					this[j === 0 && lower === 'm' ? 'moveTo' : 'lineTo'](
							getPoint(j, true));
				break;
			case 'h':
			case 'v':
				var coord = lower == 'h' ? 'x' : 'y';
				for (var j = 0; j < length; j++) {
					getCoord(j, coord, true);
					this.lineTo(current);
				}
				break;
			case 'c':
				for (var j = 0; j < length; j += 6) {
					this.cubicCurveTo(
							getPoint(j),
							control = getPoint(j + 2),
							getPoint(j + 4, true));
				}
				break;
			case 's':
				// Shorthand cubic bezierCurveTo, absolute
				for (var j = 0; j < length; j += 4) {
					this.cubicCurveTo(
							// Calculate reflection of previous control points
							current.multiply(2).subtract(control),
							control = getPoint(j),
							getPoint(j + 2, true));
				}
				break;
			case 'q':
				for (var j = 0; j < length; j += 4) {
					this.quadraticCurveTo(
							control = getPoint(j),
							getPoint(j + 2, true));
				}
				break;
			case 't':
				for (var j = 0; j < length; j += 2) {
					this.quadraticCurveTo(
							// Calculate reflection of previous control points
							control = current.multiply(2).subtract(control),
							getPoint(j, true));
				}
				break;
			case 'a':
				// TODO: Implement Arcs!
				break;
			case 'z':
				this.closePath();
				break;
			}
		}
	}

	/**
	 * Smooth bezier curves without changing the amount of segments or their
	 * points, by only smoothing and adjusting their handle points, for both
	 * open ended and closed paths.
	 *
	 * @name PathItem#smooth
	 * @function
	 *
	 * @example {@paperscript}
	 * // Smoothing a closed shape:
	 *
	 * // Create a rectangular path with its top-left point at
	 * // {x: 30, y: 25} and a size of {width: 50, height: 50}:
	 * var path = new Path.Rectangle(new Point(30, 25), new Size(50, 50));
	 * path.strokeColor = 'black';
	 *
	 * // Select the path, so we can see its handles:
	 * path.fullySelected = true;
	 *
	 * // Create a copy of the path and move it 100pt to the right:
	 * var copy = path.clone();
	 * copy.position.x += 100;
	 *
	 * // Smooth the segments of the copy:
	 * copy.smooth();
	 *
	 * @example {@paperscript height=220}
	 * var path = new Path();
	 * path.strokeColor = 'black';
	 *
	 * path.add(new Point(30, 50));
	 *
	 * var y = 5;
	 * var x = 3;
	 *
	 * for (var i = 0; i < 28; i++) {
	 *     y *= -1.1;
	 *     x *= 1.1;
	 *     path.lineBy(x, y);
	 * }
	 *
	 * // Create a copy of the path and move it 100pt down:
	 * var copy = path.clone();
	 * copy.position.y += 120;
	 *
	 * // Set its stroke color to red:
	 * copy.strokeColor = 'red';
	 *
	 * // Smooth the segments of the copy:
	 * copy.smooth();
	 */

	/**
	 * {@grouptitle Postscript Style Drawing Commands}
	 *
	 * On a normal empty {@link Path}, the point is simply added as the path's
	 * first segment. If called on a {@link CompoundPath}, a new {@link Path} is
	 * created as a child and the point is added as its first segment.
	 *
	 * @name PathItem#moveTo
	 * @function
	 * @param {Point} point
	 */

	// DOCS: Document #lineTo()
	/**
	 * @name PathItem#lineTo
	 * @function
	 * @param {Point} point
	 */

	/**
	 * Adds a cubic bezier curve to the path, defined by two handles and a to
	 * point.
	 *
	 * @name PathItem#cubicCurveTo
	 * @function
	 * @param {Point} handle1
	 * @param {Point} handle2
	 * @param {Point} to
	 */

	/**
	 * Adds a quadratic bezier curve to the path, defined by a handle and a to
	 * point.
	 *
	 * @name PathItem#quadraticCurveTo
	 * @function
	 * @param {Point} handle
	 * @param {Point} to
	 */

	// DOCS: Document PathItem#curveTo() 'paramater' param.
	/**
	 * Draws a curve from the position of the last segment point in the path
	 * that goes through the specified {@code through} point, to the specified
	 * {@code to} point by adding one segment to the path.
	 *
	 * @name PathItem#curveTo
	 * @function
	 * @param {Point} through the point through which the curve should go
	 * @param {Point} to the point where the curve should end
	 * @param {Number} [parameter=0.5]
	 *
	 * @example {@paperscript height=300}
	 * // Interactive example. Move your mouse around the view below:
	 *
	 * var myPath;
	 * function onMouseMove(event) {
	 * 	// If we created a path before, remove it:
	 * 	if (myPath) {
	 * 		myPath.remove();
	 * 	}
	 *
	 * 	// Create a new path and add a segment point to it
	 * 	// at {x: 150, y: 150):
	 * 	myPath = new Path();
	 * 	myPath.add(150, 150);
	 *
	 * 	// Draw a curve through the position of the mouse to 'toPoint'
	 * 	var toPoint = new Point(350, 150);
	 * 	myPath.curveTo(event.point, toPoint);
	 *
	 * 	// Select the path, so we can see its segments:
	 * 	myPath.selected = true;
	 * }
	 */

	/**
	 * Draws an arc from the position of the last segment point in the path that
	 * goes through the specified {@code through} point, to the specified
	 * {@code to} point by adding one or more segments to the path.
	 *
	 * @name PathItem#arcTo
	 * @function
	 * @param {Point} through the point where the arc should pass through
	 * @param {Point} to the point where the arc should end
	 *
	 * @example {@paperscript}
	 * var path = new Path();
	 * path.strokeColor = 'black';
	 *
	 * var firstPoint = new Point(30, 75);
	 * path.add(firstPoint);
	 *
	 * // The point through which we will create the arc:
	 * var throughPoint = new Point(40, 40);
	 *
	 * // The point at which the arc will end:
	 * var toPoint = new Point(130, 75);
	 *
	 * // Draw an arc through 'throughPoint' to 'toPoint'
	 * path.arcTo(throughPoint, toPoint);
	 *
	 * // Add a red circle shaped path at the position of 'throughPoint':
	 * var circle = new Path.Circle(throughPoint, 3);
	 * circle.fillColor = 'red';
	 *
	 * @example {@paperscript height=300}
	 * // Interactive example. Click and drag in the view below:
	 *
	 * var myPath;
	 * function onMouseDrag(event) {
	 * 	// If we created a path before, remove it:
	 * 	if (myPath) {
	 * 	    myPath.remove();
	 * 	}
	 *
	 * 	// Create a new path and add a segment point to it
	 * 	// at {x: 150, y: 150):
	 * 	myPath = new Path();
	 * 	myPath.add(150, 150);
	 *
	 * 	// Draw an arc through the position of the mouse to 'toPoint'
	 * 	var toPoint = new Point(350, 150);
	 * 	myPath.arcTo(event.point, toPoint);
	 *
	 * 	// Select the path, so we can see its segments:
	 * 	myPath.selected = true;
	 * }
	 *
	 * // When the mouse is released, deselect the path
	 * // and fill it with black.
	 * function onMouseUp(event) {
	 * 	myPath.selected = false;
	 * 	myPath.fillColor = 'black';
	 * }
	 */
	/**
	 * Draws an arc from the position of the last segment point in the path to
	 * the specified point by adding one or more segments to the path.
	 *
	 * @name PathItem#arcTo
	 * @function
	 * @param {Point} to the point where the arc should end
	 * @param {Boolean} [clockwise=true] specifies whether the arc should be
	 *        drawn in clockwise direction.
	 *
	 * @example {@paperscript}
	 * var path = new Path();
	 * path.strokeColor = 'black';
	 *
	 * path.add(new Point(30, 75));
	 * path.arcTo(new Point(130, 75));
	 *
	 * var path2 = new Path();
	 * path2.strokeColor = 'red';
	 * path2.add(new Point(180, 25));
	 *
	 * // To draw an arc in anticlockwise direction,
	 * // we pass 'false' as the second argument to arcTo:
	 * path2.arcTo(new Point(280, 25), false);
	 *
	 * @example {@paperscript height=300}
	 * // Interactive example. Click and drag in the view below:
	 * var myPath;
	 *
	 * // The mouse has to move at least 20 points before
	 * // the next mouse drag event is fired:
	 * tool.minDistance = 20;
	 *
	 * // When the user clicks, create a new path and add
	 * // the current mouse position to it as its first segment:
	 * function onMouseDown(event) {
	 * 	myPath = new Path();
	 * 	myPath.strokeColor = 'black';
	 * 	myPath.add(event.point);
	 * }
	 *
	 * // On each mouse drag event, draw an arc to the current
	 * // position of the mouse:
	 * function onMouseDrag(event) {
	 * 	myPath.arcTo(event.point);
	 * }
	 */

	/**
	 * Closes the path. When closed, Paper.js connects the first and last
	 * segments.
	 *
	 * @name PathItem#closePath
	 * @function
	 * @see Path#closed
	 */

	/**
	 * {@grouptitle Relative Drawing Commands}
	 *
	 * If called on a {@link CompoundPath}, a new {@link Path} is created as a
	 * child and a point is added as its first segment relative to the
	 * position of the last segment of the current path.
	 *
	 * @name PathItem#moveBy
	 * @function
	 * @param {Point} vector
	 */

	/**
	 * Adds a segment relative to the last segment point of the path.
	 *
	 * @name PathItem#lineBy
	 * @function
	 * @param {Point} vector The vector which is added to the position of the
	 *        last segment of the path, to become the new segment.
	 *
	 * @example {@paperscript}
	 * var path = new Path();
	 * path.strokeColor = 'black';
	 *
	 * // Add a segment at {x: 50, y: 50}
	 * path.add(25, 25);
	 *
	 * // Add a segment relative to the last segment of the path.
	 * // 50 in x direction and 0 in y direction, becomes {x: 75, y: 25}
	 * path.lineBy(50, 0);
	 *
	 * // 0 in x direction and 50 in y direction, becomes {x: 75, y: 75}
	 * path.lineBy(0, 50);
	 *
	 * @example {@paperscript height=300}
	 * // Drawing a spiral using lineBy:
	 * var path = new Path();
	 * path.strokeColor = 'black';
	 *
	 * // Add the first segment at {x: 50, y: 50}
	 * path.add(view.center);
	 *
	 * // Loop 500 times:
	 * for (var i = 0; i < 500; i++) {
	 * 	// Create a vector with an ever increasing length
	 * 	// and an angle in increments of 45 degrees
	 * 	var vector = new Point({
	 * 	    angle: i * 45,
	 * 	    length: i / 2
	 * 	});
	 * 	// Add the vector relatively to the last segment point:
	 * 	path.lineBy(vector);
	 * }
	 *
	 * // Smooth the handles of the path:
	 * path.smooth();
	 *
	 * // Uncomment the following line and click on 'run' to see
	 * // the construction of the path:
	 * // path.selected = true;
	 */

	// DOCS: Document Path#curveBy()
	/**
	 * @name PathItem#curveBy
	 * @function
	 * @param {Point} throughVector
	 * @param {Point} toVector
	 * @param {Number} [parameter=0.5]
	 */

	// DOCS: Document Path#arcBy()
	/**
	 * @name PathItem#arcBy
	 * @function
	 * @param {Point} throughVector
	 * @param {Point} toVector
	 */
});

/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2013, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

/**
 * @name Path
 *
 * @class The Path item represents a path in a Paper.js project.
 *
 * @extends PathItem
 */
// DOCS: Explain that path matrix is always applied with each transformation.
var Path = PathItem.extend(/** @lends Path# */{
	_serializeFields: {
		segments: [],
		closed: false
	},

	/**
	 * Creates a new Path item and places it at the top of the active layer.
	 *
	 * @name Path#initialize
	 * @param {Segment[]} [segments] An array of segments (or points to be
	 * converted to segments) that will be added to the path.
	 *
	 * @example
	 * // Create an empty path and add segments to it:
	 * var path = new Path();
	 * path.strokeColor = 'black';
	 * path.add(new Point(30, 30));
	 * path.add(new Point(100, 100));
	 *
	 * @example
	 * // Create a path with two segments:
	 * var segments = [new Point(30, 30), new Point(100, 100)];
	 * var path = new Path(segments);
	 * path.strokeColor = 'black';
	 */
	/**
	 * Creates a new Path item and places it at the top of the active layer.
	 *
	 * @param {Object} object An object literal containing properties to
	 * be set on the path.
	 *
	 * @example {@paperscript}
	 * var path = new Path({
	 * 	segments: [[20, 20], [80, 80], [140, 20]],
	 * 	fillColor: 'black',
	 * 	closed: true
	 * });
	 *
	 * @example {@paperscript}
	 * var path = new Path({
	 * 	segments: [[20, 20], [80, 80], [140, 20]],
	 * 	strokeColor: 'red',
	 * 	strokeWidth: 20,
	 * 	strokeCap: 'round',
	 * 	selected: true
	 * });
	 */
	initialize: function Path(arg) {
		this._closed = false;
		this._segments = [];
		Item.call(this);
		// arg can either be an object literal describing properties to be set
		// on the path, a list of segments to be set, or the first of multiple
		// arguments describing separate segments.
		// If it is an array, it can also be a description of a point, so
		// check its first entry for object as well.
		// But first see if segments are directly passed at all. If not, try
		// _set(arg).
		var segments = Array.isArray(arg)
			? typeof arg[0] === 'object'
				? arg
				: arguments
			: arg && (arg.point !== undefined || arg.x !== undefined)
				? arguments
				: null;
		this.setSegments(segments || []);
		if (arg && !segments)
			this._set(arg);
	},

	clone: function() {
		var copy = this._clone(new Path(this._segments));
		copy._closed = this._closed;
		if (this._clockwise !== undefined)
			copy._clockwise = this._clockwise;
		return copy;
	},

	_changed: function(flags) {
		// Don't use base() for reasons of performance.
		Item.prototype._changed.call(this, flags);
		if (flags & 4) {
			delete this._length;
			// Clockwise state becomes undefined as soon as geometry changes.
			delete this._clockwise;
			// Curves are no longer valid
			if (this._curves) {
				for (var i = 0, l = this._curves.length; i < l; i++) {
					this._curves[i]._changed(5);
				}
			}
		} else if (flags & 8) {
			// TODO: We could preserve the purely geometric bounds that are not
			// affected by stroke: _bounds.bounds and _bounds.handleBounds
			delete this._bounds;
		}
	},

	/**
	 * The segments contained within the path.
	 *
	 * @type Segment[]
	 * @bean
	 */
	getSegments: function() {
		return this._segments;
	},

	setSegments: function(segments) {
		this._selectedSegmentState = 0;
		this._segments.length = 0;
		// Calculate new curves next time we call getCurves()
		delete this._curves;
		this._add(Segment.readAll(segments));
	},

	/**
	 * The first Segment contained within the path.
	 *
	 * @type Segment
	 * @bean
	 */
	getFirstSegment: function() {
		return this._segments[0];
	},

	/**
	 * The last Segment contained within the path.
	 *
	 * @type Segment
	 * @bean
	 */
	getLastSegment: function() {
		return this._segments[this._segments.length - 1];
	},

	/**
	 * The curves contained within the path.
	 *
	 * @type Curve[]
	 * @bean
	 */
	getCurves: function() {
		var curves = this._curves,
			segments = this._segments;
		if (!curves) {
			var length = this._countCurves();
			curves = this._curves = new Array(length);
			for (var i = 0; i < length; i++)
				curves[i] = Curve.create(this, segments[i],
					// Use first segment for segment2 of closing curve
					segments[i + 1] || segments[0]);
		}
		return curves;
	},

	/**
	 * The first Curve contained within the path.
	 *
	 * @type Curve
	 * @bean
	 */
	getFirstCurve: function() {
		return this.getCurves()[0];
	},

	/**
	 * The last Curve contained within the path.
	 *
	 * @type Curve
	 * @bean
	 */
	getLastCurve: function() {
		var curves = this.getCurves();
		return curves[curves.length - 1];
	},

	/**
	 * The segments contained within the path, described as SVG style path data.
	 *
	 * @type String
	 * @bean
	 */
	getPathData: function(/* precision */) {
		var segments = this._segments,
			style = this._style,
			precision = arguments[0],
			f = Formatter.instance,
			parts = [];

		// TODO: Add support for H/V and/or relative commands, where appropriate
		// and resulting in shorter strings
		function addCurve(seg1, seg2, skipLine) {
			var point1 = seg1._point,
				point2 = seg2._point,
				handle1 = seg1._handleOut,
				handle2 = seg2._handleIn;
			if (handle1.isZero() && handle2.isZero()) {
				if (!skipLine) {
					// L = absolute lineto: moving to a point with drawing
					parts.push('L' + f.point(point2, precision));
				}
			} else {
				// c = relative curveto: handle1, handle2 + end - start,
				// end - start
				var end = point2.subtract(point1);
				parts.push('c' + f.point(handle1, precision)
						+ ' ' + f.point(end.add(handle2), precision)
						+ ' ' + f.point(end, precision));
			}
		}

		if (segments.length === 0)
			return '';
		parts.push('M' + f.point(segments[0]._point));
		for (i = 0, l = segments.length  - 1; i < l; i++)
			addCurve(segments[i], segments[i + 1], false);
		// We only need to draw the connecting curve if it is not a line, and if
		// the path is closed and has a stroke color, or if it is filled.
		// TODO: Verify this, sound dodgy
		if (this._closed && style.getStrokeColor() || style.getFillColor())
			addCurve(segments[segments.length - 1], segments[0], true);
		if (this._closed)
			parts.push('z');
		return parts.join('');
	},

	/**
	 * Specifies whether the path is closed. If it is closed, Paper.js connects
	 * the first and last segments.
	 *
	 * @type Boolean
	 * @bean
	 *
	 * @example {@paperscript}
	 * var myPath = new Path();
	 * myPath.strokeColor = 'black';
	 * myPath.add(new Point(50, 75));
	 * myPath.add(new Point(100, 25));
	 * myPath.add(new Point(150, 75));
	 *
	 * // Close the path:
	 * myPath.closed = true;
	 */
	isClosed: function() {
		return this._closed;
	},

	setClosed: function(closed) {
		// On-the-fly conversion to boolean:
		if (this._closed != (closed = !!closed)) {
			this._closed = closed;
			// Update _curves length
			if (this._curves) {
				var length = this._curves.length = this._countCurves();
				// If we were closing this path, we need to add a new curve now
				if (closed)
					this._curves[length - 1] = Curve.create(this,
						this._segments[length - 1], this._segments[0]);
			}
			this._changed(5);
		}
	},

	// TODO: Consider adding getSubPath(a, b), returning a part of the current
	// path, with the added benefit that b can be < a, and closed looping is
	// taken into account.

	isEmpty: function() {
		return this._segments.length === 0;
	},

	isPolygon: function() {
		for (var i = 0, l = this._segments.length; i < l; i++) {
			if (!this._segments[i].isLinear())
				return false;
		}
		return true;
	},

	_transformContent: function(matrix) {
		var coords = new Array(6);
		for (var i = 0, l = this._segments.length; i < l; i++)
			this._segments[i]._transformCoordinates(matrix, coords, true);
		return true;
	},

	/**
	 * Private method that adds a segment to the segment list. It assumes that
	 * the passed object is a segment already and does not perform any checks.
	 * If a curves list was requested, it will kept in sync with the segments
	 * list automatically.
	 */
	_add: function(segs, index) {
		// Local short-cuts:
		var segments = this._segments,
			curves = this._curves,
			amount = segs.length,
			append = index == null,
			index = append ? segments.length : index,
			fullySelected = this.isFullySelected();
		// Scan through segments to add first, convert if necessary and set
		// _path and _index references on them.
		for (var i = 0; i < amount; i++) {
			var segment = segs[i];
			// If the segments belong to another path already, clone them before
			// adding:
			if (segment._path)
				segment = segs[i] = segment.clone();
			segment._path = this;
			segment._index = index + i;
			// Select newly added segments if path was fully selected before
			if (fullySelected)
				segment._selectionState = 4;
			// If parts of this segment are selected, adjust the internal
			// _selectedSegmentState now
			if (segment._selectionState)
				this._updateSelection(segment, 0, segment._selectionState);
		}
		if (append) {
			// Append them all at the end by using push
			segments.push.apply(segments, segs);
		} else {
			// Insert somewhere else
			segments.splice.apply(segments, [index, 0].concat(segs));
			// Adjust the indices of the segments above.
			for (var i = index + amount, l = segments.length; i < l; i++)
				segments[i]._index = i;
		}
		// Keep the curves list in sync all the time in case it as requested
		// already.
		if (curves || segs._curves) {
			if (!curves)
				curves = this._curves = [];
			// We need to step one index down from the inserted segment to
			// get its curve, except for the first segment.
			var from = index > 0 ? index - 1 : index,
				start = from,
				to = Math.min(from + amount, this._countCurves());
			if (segs._curves) {
				// Reuse removed curves.
				curves.splice.apply(curves, [from, 0].concat(segs._curves));
				start += segs._curves.length;
			}
			// Insert new curves, but do not initialize them yet, since
			// #_adjustCurves() handles all that for us.
			for (var i = start; i < to; i++)
				curves.splice(i, 0, Base.create(Curve));
			// Adjust segments for the curves before and after the removed ones
			this._adjustCurves(from, to);
		}
		this._changed(5);
		return segs;
	},

	/**
	 * Adjusts segments of curves before and after inserted / removed segments.
	 */
	_adjustCurves: function(from, to) {
		var segments = this._segments,
			curves = this._curves,
			curve;
		for (var i = from; i < to; i++) {
			curve = curves[i];
			curve._path = this;
			curve._segment1 = segments[i];
			curve._segment2 = segments[i + 1] || segments[0];
		}
		// If it's the first segment, correct the last segment of closed
		// paths too:
		if (curve = curves[this._closed && from === 0 ? segments.length - 1
				: from - 1])
			curve._segment2 = segments[from] || segments[0];
		// Fix the segment after the modified range, if it exists
		if (curve = curves[to])
			curve._segment1 = segments[to];
	},

	/**
	 * Returns the amount of curves this path item is supposed to have, based
	 * on its amount of #segments and #closed state.
	 */
	_countCurves: function() {
		var length = this._segments.length;
		// Reduce length by one if it's an open path:
		return !this._closed && length > 0 ? length - 1 : length;
	},

	// DOCS: find a way to document the variable segment parameters of Path#add
	/**
	 * Adds one or more segments to the end of the {@link #segments} array of
	 * this path.
	 *
	 * @param {Segment|Point} segment the segment or point to be added.
	 * @return {Segment} the added segment. This is not necessarily the same
	 * object, e.g. if the segment to be added already belongs to another path.
	 * @operator none
	 *
	 * @example {@paperscript}
	 * // Adding segments to a path using point objects:
	 * var path = new Path({
	 * 	strokeColor: 'black'
	 * });
	 *
	 * // Add a segment at {x: 30, y: 75}
	 * path.add(new Point(30, 75));
	 *
	 * // Add two segments in one go at {x: 100, y: 20}
	 * // and {x: 170, y: 75}:
	 * path.add(new Point(100, 20), new Point(170, 75));
	 *
	 * @example {@paperscript}
	 * // Adding segments to a path using arrays containing number pairs:
	 * var path = new Path({
	 * 	strokeColor: 'black'
	 * });
	 *
	 * // Add a segment at {x: 30, y: 75}
	 * path.add([30, 75]);
	 *
	 * // Add two segments in one go at {x: 100, y: 20}
	 * // and {x: 170, y: 75}:
	 * path.add([100, 20], [170, 75]);
	 *
	 * @example {@paperscript}
	 * // Adding segments to a path using objects:
	 * var path = new Path({
	 * 	strokeColor: 'black'
	 * });
	 *
	 * // Add a segment at {x: 30, y: 75}
	 * path.add({x: 30, y: 75});
	 *
	 * // Add two segments in one go at {x: 100, y: 20}
	 * // and {x: 170, y: 75}:
	 * path.add({x: 100, y: 20}, {x: 170, y: 75});
	 *
	 * @example {@paperscript}
	 * // Adding a segment with handles to a path:
	 * var path = new Path({
	 * 	strokeColor: 'black'
	 * });
	 *
	 * path.add(new Point(30, 75));
	 *
	 * // Add a segment with handles:
	 * var point = new Point(100, 20);
	 * var handleIn = new Point(-50, 0);
	 * var handleOut = new Point(50, 0);
	 * var added = path.add(new Segment(point, handleIn, handleOut));
	 *
	 * // Select the added segment, so we can see its handles:
	 * added.selected = true;
	 *
	 * path.add(new Point(170, 75));
	 */
	add: function(segment1 /*, segment2, ... */) {
		return arguments.length > 1 && typeof segment1 !== 'number'
			// addSegments
			? this._add(Segment.readAll(arguments))
			// addSegment
			: this._add([ Segment.read(arguments) ])[0];
	},

	/**
	 * Inserts one or more segments at a given index in the list of this path's
	 * segments.
	 *
	 * @param {Number} index the index at which to insert the segment.
	 * @param {Segment|Point} segment the segment or point to be inserted.
	 * @return {Segment} the added segment. This is not necessarily the same
	 * object, e.g. if the segment to be added already belongs to another path.
	 *
	 * @example {@paperscript}
	 * // Inserting a segment:
	 * var myPath = new Path();
	 * myPath.strokeColor = 'black';
	 * myPath.add(new Point(50, 75));
	 * myPath.add(new Point(150, 75));
	 *
	 * // Insert a new segment into myPath at index 1:
	 * myPath.insert(1, new Point(100, 25));
	 *
	 * // Select the segment which we just inserted:
	 * myPath.segments[1].selected = true;
	 *
	 * @example {@paperscript}
	 * // Inserting multiple segments:
	 * var myPath = new Path();
	 * myPath.strokeColor = 'black';
	 * myPath.add(new Point(50, 75));
	 * myPath.add(new Point(150, 75));
	 *
	 * // Insert two segments into myPath at index 1:
	 * myPath.insert(1, [80, 25], [120, 25]);
	 *
	 * // Select the segments which we just inserted:
	 * myPath.segments[1].selected = true;
	 * myPath.segments[2].selected = true;
	 */
	insert: function(index, segment1 /*, segment2, ... */) {
		return arguments.length > 2 && typeof segment1 !== 'number'
			// insertSegments
			? this._add(Segment.readAll(arguments, 1), index)
			// insertSegment
			: this._add([ Segment.read(arguments, 1) ], index)[0];
	},

	addSegment: function(segment) {
		return this._add([ Segment.read(arguments) ])[0];
	},

	insertSegment: function(index, segment) {
		return this._add([ Segment.read(arguments, 1) ], index)[0];
	},

	/**
	 * Adds an array of segments (or types that can be converted to segments)
	 * to the end of the {@link #segments} array.
	 *
	 * @param {Segment[]} segments
	 * @return {Segment[]} an array of the added segments. These segments are
	 * not necessarily the same objects, e.g. if the segment to be added already
	 * belongs to another path.
	 *
	 * @example {@paperscript}
	 * // Adding an array of Point objects:
	 * var path = new Path({
	 * 	strokeColor: 'black'
	 * });
	 * var points = [new Point(30, 50), new Point(170, 50)];
	 * path.addSegments(points);
	 *
	 * @example {@paperscript}
	 * // Adding an array of [x, y] arrays:
	 * var path = new Path({
	 * 	strokeColor: 'black'
	 * });
	 * var array = [[30, 75], [100, 20], [170, 75]];
	 * path.addSegments(array);
	 *
	 * @example {@paperscript}
	 * // Adding segments from one path to another:
	 *
	 * var path = new Path({
	 * 	strokeColor: 'black'
	 * });
	 * path.addSegments([[30, 75], [100, 20], [170, 75]]);
	 *
	 * var path2 = new Path();
	 * path2.strokeColor = 'red';
	 *
	 * // Add the second and third segments of path to path2:
	 * path2.add(path.segments[1], path.segments[2]);
	 *
	 * // Move path2 30pt to the right:
	 * path2.position.x += 30;
	 */
	addSegments: function(segments) {
		return this._add(Segment.readAll(segments));
	},

	/**
	 * Inserts an array of segments at a given index in the path's
	 * {@link #segments} array.
	 *
	 * @param {Number} index the index at which to insert the segments.
	 * @param {Segment[]} segments the segments to be inserted.
	 * @return {Segment[]} an array of the added segments. These segments are
	 * not necessarily the same objects, e.g. if the segment to be added already
	 * belongs to another path.
	 */
	insertSegments: function(index, segments) {
		return this._add(Segment.readAll(segments), index);
	},

	/**
	 * Removes the segment at the specified index of the path's
	 * {@link #segments} array.
	 *
	 * @param {Number} index the index of the segment to be removed
	 * @return {Segment} the removed segment
	 *
	 * @example {@paperscript}
	 * // Removing a segment from a path:
	 *
	 * // Create a circle shaped path at { x: 80, y: 50 }
	 * // with a radius of 35:
	 * var path = new Path.Circle({
	 * 	center: new Point(80, 50),
	 * 	radius: 35,
	 * 	strokeColor: 'black'
	 * });
	 *
	 * // Remove its second segment:
	 * path.removeSegment(1);
	 *
	 * // Select the path, so we can see its segments:
	 * path.selected = true;
	 */
	removeSegment: function(index) {
		return this.removeSegments(index, index + 1)[0] || null;
	},

	/**
	 * Removes all segments from the path's {@link #segments} array.
	 *
	 * @name Path#removeSegments
	 * @function
	 * @return {Segment[]} an array containing the removed segments
	 */
	/**
	 * Removes the segments from the specified {@code from} index to the
	 * {@code to} index from the path's {@link #segments} array.
	 *
	 * @param {Number} from the beginning index, inclusive
	 * @param {Number} [to=segments.length] the ending index, exclusive
	 * @return {Segment[]} an array containing the removed segments
	 *
	 * @example {@paperscript}
	 * // Removing segments from a path:
	 *
	 * // Create a circle shaped path at { x: 80, y: 50 }
	 * // with a radius of 35:
	 * var path = new Path.Circle({
	 * 	center: new Point(80, 50),
	 * 	radius: 35,
	 * 	strokeColor: 'black'
	 * });
	 *
	 * // Remove the segments from index 1 till index 2:
	 * path.removeSegments(1, 2);
	 *
	 * // Select the path, so we can see its segments:
	 * path.selected = true;
	 */
	removeSegments: function(from, to/*, includeCurves */) {
		from = from || 0;
		to = Base.pick(to, this._segments.length);
		var segments = this._segments,
			curves = this._curves,
			count = segments.length, // segment count before removal
			removed = segments.splice(from, to - from),
			amount = removed.length;
		if (!amount)
			return removed;
		// Update selection state accordingly
		for (var i = 0; i < amount; i++) {
			var segment = removed[i];
			if (segment._selectionState)
				this._updateSelection(segment, segment._selectionState, 0);
			// Clear the indices and path references of the removed segments
			delete segment._index;
			delete segment._path;
		}
		// Adjust the indices of the segments above.
		for (var i = from, l = segments.length; i < l; i++)
			segments[i]._index = i;
		// Keep curves in sync
		if (curves) {
			// If we're removing the last segment, remove the last curve (the
			// one to the left of the segment, not to the right, as normally).
			// Also take into account closed paths, which have one curve more
			// than segments.
			var index = from > 0 && to === count + (this._closed ? 1 : 0)
					? from - 1
					: from,
				curves = curves.splice(index, amount);
			// Return the removed curves as well, if we're asked to include
			// them, but exclude the first curve, since that's shared with the
			// previous segment and does not connect the returned segments.
			if (arguments[2])
				removed._curves = curves.slice(1);
			// Adjust segments for the curves before and after the removed ones
			this._adjustCurves(index, index);
		}
		this._changed(5);
		return removed;
	},

	/**
	 * Specifies whether an path is selected and will also return {@code true}
	 * if the path is partially selected, i.e. one or more of its segments is
	 * selected.
	 *
	 * Paper.js draws the visual outlines of selected items on top of your
	 * project. This can be useful for debugging, as it allows you to see the
	 * construction of paths, position of path curves, individual segment points
	 * and bounding boxes of symbol and raster items.
	 *
	 * @type Boolean
	 * @bean
	 * @see Project#selectedItems
	 * @see Segment#selected
	 * @see Point#selected
	 *
	 * @example {@paperscript}
	 * // Selecting an item:
	 * var path = new Path.Circle({
	 * 	center: new Size(80, 50),
	 * 	radius: 35
	 * });
	 * path.selected = true; // Select the path
	 *
	 * @example {@paperscript}
	 * // A path is selected, if one or more of its segments is selected:
	 * var path = new Path.Circle({
	 * 	center: new Size(80, 50),
	 * 	radius: 35
	 * });
	 *
	 * // Select the second segment of the path:
	 * path.segments[1].selected = true;
	 *
	 * // If the path is selected (which it is), set its fill color to red:
	 * if (path.selected) {
	 * 	path.fillColor = 'red';
	 * }
	 *
	 */
	/**
	 * Specifies whether the path and all its segments are selected.
	 *
	 * @type Boolean
	 * @bean
	 *
	 * @example {@paperscript}
	 * // A path is fully selected, if all of its segments are selected:
	 * var path = new Path.Circle({
	 * 	center: new Size(80, 50),
	 * 	radius: 35
	 * });
	 * path.fullySelected = true;
	 *
	 * var path2 = new Path.Circle({
	 * 	center: new Size(180, 50),
	 * 	radius: 35
	 * });
	 *
	 * // Deselect the second segment of the second path:
	 * path2.segments[1].selected = false;
	 *
	 * // If the path is fully selected (which it is),
	 * // set its fill color to red:
	 * if (path.fullySelected) {
	 * 	path.fillColor = 'red';
	 * }
	 *
	 * // If the second path is fully selected (which it isn't, since we just
	 * // deselected its second segment),
	 * // set its fill color to red:
	 * if (path2.fullySelected) {
	 * 	path2.fillColor = 'red';
	 * }
	 */
	isFullySelected: function() {
		return this._selected && this._selectedSegmentState
				== this._segments.length * 4;
	},

	setFullySelected: function(selected) {
		// No need to call _selectSegments() when selected is false, since
		// #setSelected() does that for us
		if (selected)
			this._selectSegments(true);
		this.setSelected(selected);
	},

	setSelected: function setSelected(selected) {
		// Deselect all segments when path is marked as not selected
		if (!selected)
			this._selectSegments(false);
		// No need to pass true for noChildren since Path has none anyway.
		setSelected.base.call(this, selected);
	},

	_selectSegments: function(selected) {
		var length = this._segments.length;
		this._selectedSegmentState = selected
				? length * 4 : 0;
		for (var i = 0; i < length; i++)
			this._segments[i]._selectionState = selected
					? 4 : 0;
	},

	_updateSelection: function(segment, oldState, newState) {
		segment._selectionState = newState;
		var total = this._selectedSegmentState += newState - oldState;
		// Set this path as selected in case we have selected segments. Do not
		// unselect if we're down to 0, as the path itself can still remain
		// selected even when empty.
		if (total > 0)
			this.setSelected(true);
	},

	/**
	 * Converts the curves in a path to straight lines with an even distribution
	 * of points. The distance between the produced segments is as close as
	 * possible to the value specified by the {@code maxDistance} parameter.
	 *
	 * @param {Number} maxDistance the maximum distance between the points
	 *
	 * @example {@paperscript}
	 * // Flattening a circle shaped path:
	 *
	 * // Create a circle shaped path at { x: 80, y: 50 }
	 * // with a radius of 35:
	 * var path = new Path.Circle({
	 * 	center: new Size(80, 50),
	 * 	radius: 35
	 * });
	 *
	 * // Select the path, so we can inspect its segments:
	 * path.selected = true;
	 *
	 * // Create a copy of the path and move it 150 points to the right:
	 * var copy = path.clone();
	 * copy.position.x += 150;
	 *
	 * // Convert its curves to points, with a max distance of 20:
	 * copy.flatten(20);
	 */
	flatten: function(maxDistance) {
		var flattener = new PathFlattener(this),
			pos = 0,
			// Adapt step = maxDistance so the points distribute evenly.
			step = flattener.length / Math.ceil(flattener.length / maxDistance),
			// Add/remove half of step to end, so imprecisions are ok too.
			// For closed paths, remove it, because we don't want to add last
			// segment again
			end = flattener.length + (this._closed ? -step : step) / 2;
		// Iterate over path and evaluate and add points at given offsets
		var segments = [];
		while (pos <= end) {
			segments.push(new Segment(flattener.evaluate(pos, 0)));
			pos += step;
		}
		this.setSegments(segments);
	},

	/**
	 * Smooths a path by simplifying it. The {@link Path#segments} array is
	 * analyzed and replaced by a more optimal set of segments, reducing memory
	 * usage and speeding up drawing.
	 *
	 * @param {Number} [tolerance=2.5]
	 *
	 * @example {@paperscript height=300}
	 * // Click and drag below to draw to draw a line, when you release the
	 * // mouse, the is made smooth using path.simplify():
	 *
	 * var path;
	 * function onMouseDown(event) {
	 * 	// If we already made a path before, deselect it:
	 * 	if (path) {
	 * 		path.selected = false;
	 * 	}
	 * 
	 * 	// Create a new path and add the position of the mouse
	 * 	// as its first segment. Select it, so we can see the
	 * 	// segment points:
	 * 	path = new Path({
	 * 		segments: [event.point],
	 * 		strokeColor: 'black',
	 * 		selected: true
	 * 	});
	 * }
	 * 
	 * function onMouseDrag(event) {
	 * 	// On every drag event, add a segment to the path
	 * 	// at the position of the mouse:
	 * 	path.add(event.point);
	 * }
	 * 
	 * function onMouseUp(event) {
	 * 	// When the mouse is released, simplify the path:
	 * 	path.simplify();
	 * 	path.selected = true;
	 * }
	 */
	simplify: function(tolerance) {
		if (this._segments.length > 2) {
			var fitter = new PathFitter(this, tolerance || 2.5);
			this.setSegments(fitter.fit());
		}
	},

	// TODO: reduceSegments([flatness])

	/**
	 * Splits the path at the given offset. After splitting, the path will be
	 * open. If the path was open already, splitting will result in two paths.
	 * 
	 * @name Path#split
	 * @function
	 * @param {Number} offset the offset at which to split the path
	 * as a number between 0 and {@link Path#length}
	 * @return {Path} The newly created path, if any.
	 * 
	 * @example {@paperscript} // Splitting an open path
	 * var path = new Path();
	 * path.strokeColor = 'black';
	 * path.add(20, 20);
	 * 
	 * // Add an arc through {x: 90, y: 80} to {x: 160, y: 20}
	 * path.arcTo([90, 80], [160, 20]);
	 * 
	 * // Split the path at 30% of its length:
	 * var path2 = path.split(path.length * 0.3);
	 * path2.strokeColor = 'red';
	 * 
	 * // Move the newly created path 40px to the right:
	 * path2.position.x += 40;
	 * 
	 * @example {@paperscript} // Splitting a closed path
	 * var path = new Path.Rectangle({
	 * 	from: [20, 20],
	 * 	to: [80, 80],
	 * 	strokeColor: 'black'
	 * });
	 * 
	 * // Split the path at 60% of its length:
	 * path.split(path.length * 0.6);
	 * 
	 * // Move the first segment, to show where the path
	 * // was split:
	 * path.firstSegment.point.x += 20;
	 * 
	 * // Select the first segment:
	 * path.firstSegment.selected = true;
	 */
	/**
	 * Splits the path at the given curve location. After splitting, the path
	 * will be open. If the path was open already, splitting will result in two
	 * paths.
	 * 
	 * @name Path#split
	 * @function
	 * @param {CurveLocation} location the curve location at which to split
	 * the path
	 * @return {Path} The newly created path, if any.
	 * 
	 * @example {@paperscript}
	 * var path = new Path.Circle({
	 * 	center: view.center,
	 * 	radius: 40,
	 * 	strokeColor: 'black'
	 * });
	 * 
	 * var pointOnCircle = view.center + {
	 * 	length: 40,
	 * 	angle: 30
	 * };
	 * 
	 * var curveLocation = path.getNearestLocation(pointOnCircle);
	 * 
	 * path.split(curveLocation);
	 * path.lastSegment.selected = true;
	 */
	/**
	 * Splits the path. After splitting, the path will be open. If the path
	 * was open already, splitting will result in two paths.
	 * 
	 * @example {@paperscript} // Splitting an open path
	 * // Draw a V shaped path:
	 * var path = new Path([20, 20], [50, 80], [80, 20]);
	 * path.strokeColor = 'black';
	 * 
	 * // Split the path half-way down its second curve:
	 * var path2 = path.split(1, 0.5);
	 * 
	 * // Give the resulting path a red stroke-color
	 * // and move it 20px to the right:
	 * path2.strokeColor = 'red';
	 * path2.position.x += 20;
	 * 
	 * @example {@paperscript} // Splitting a closed path
	 * var path = new Path.Rectangle({
	 * 	from: [20, 20],
	 * 	to: [80, 80],
	 * 	strokeColor: 'black'
	 * });
	 * 
	 * // Split the path half-way down its second curve:
	 * path.split(2, 0.5);
	 * 
	 * // Move the first segment, to show where the path
	 * // was split:
	 * path.firstSegment.point.x += 20;
	 * 
	 * // Select the first segment:
	 * path.firstSegment.selected = true;
	 * 
	 * @param {Number} index the index of the curve in the {@link Path#curves}
	 * array at which to split
	 * @param {Number} parameter the parameter at which the curve will be split
	 * @return {Path} The newly created path after splitting, if any.
	 */
	split: function(index, parameter) {
		if (parameter === null)
			return;
		if (arguments.length == 1) {
			var arg = index;
			// split(offset), convert offset to location
			if (typeof arg === 'number')
				arg = this.getLocationAt(arg);
			// split(location)
			index = arg.index;
			parameter = arg.parameter;
		}
		if (parameter >= 1) {
			// t == 1 is the same as t == 0 and index ++
			index++;
			parameter--;
		}
		var curves = this.getCurves();
		if (index >= 0 && index < curves.length) {
			// Only divide curves if we're not on an existing segment already.
			if (parameter > 0) {
				// Divide the curve with the index at given parameter.
				// Increase because dividing adds more segments to the path.
				curves[index++].divide(parameter);
			}
			// Create the new path with the segments to the right of given
			// parameter, which are removed from the current path. Pass true
			// for includeCurves, since we want to preserve and move them to
			// the new path through _add(), allowing us to have CurveLocation
			// keep the connection to the new path through moved curves. 
			var segs = this.removeSegments(index, this._segments.length, true),
				path;
			if (this._closed) {
				// If the path is closed, open it and move the segments round,
				// otherwise create two paths.
				this.setClosed(false);
				// Just have path point to this. The moving around of segments
				// will happen below.
				path = this;
			} else if (index > 0) {
				// Pass true for _preserve, in case of CompoundPath, to avoid 
				// reversing of path direction, which would mess with segs!
				// Use _clone to copy over all other attributes, including style
				path = this._clone(new Path().insertAbove(this, true));
			}
			path._add(segs, 0);
			// Add dividing segment again. In case of a closed path, that's the
			// beginning segment again at the end, since we opened it.
			this.addSegment(segs[0]);
			return path;
		}
		return null;
	},

	/**
	 * Specifies whether the path is oriented clock-wise.
	 *
	 * @type Boolean
	 * @bean
	 */
	isClockwise: function() {
		if (this._clockwise !== undefined)
			return this._clockwise;
		return Path.isClockwise(this._segments);
	},

	setClockwise: function(clockwise) {
		// Only revers the path if its clockwise orientation is not the same
		// as what it is now demanded to be.
		// On-the-fly conversion to boolean:
		if (this.isClockwise() != (clockwise = !!clockwise))
			this.reverse();
		// Reverse only flips _clockwise state if it was already set, so let's
		// always set this here now.
		this._clockwise = clockwise;
	},

	/**
	 * Reverses the orientation of the path, by reversing all its segments.
	 */
	reverse: function() {
		this._segments.reverse();
		// Reverse the handles:
		for (var i = 0, l = this._segments.length; i < l; i++) {
			var segment = this._segments[i];
			var handleIn = segment._handleIn;
			segment._handleIn = segment._handleOut;
			segment._handleOut = handleIn;
			segment._index = i;
		}
		// Clear curves since it all has changed.
		delete this._curves;
		// Flip clockwise state if it's defined
		if (this._clockwise !== undefined)
			this._clockwise = !this._clockwise;
	},

	// DOCS: document Path#join in more detail.
	/**
	 * Joins the path with the specified path, which will be removed in the
	 * process.
	 *
	 * @param {Path} path
	 *
	 * @example {@paperscript}
	 * // Joining two paths:
	 * var path = new Path({
	 * 	segments: [[30, 25], [30, 75]],
	 * 	strokeColor: 'black'
	 * });
	 * 
	 * var path2 = new Path({
	 * 	segments: [[200, 25], [200, 75]],
	 * 	strokeColor: 'black'
	 * });
	 * 
	 * // Join the paths:
	 * path.join(path2);
	 *
	 * @example {@paperscript}
	 * // Joining two paths that share a point at the start or end of their
	 * // segments array:
	 * var path = new Path({
	 * 	segments: [[30, 25], [30, 75]],
	 * 	strokeColor: 'black'
	 * });
	 * 
	 * var path2 = new Path({
	 * 	segments: [[30, 25], [80, 25]],
	 * 	strokeColor: 'black'
	 * });
	 * 
	 * // Join the paths:
	 * path.join(path2);
	 * 
	 * // After joining, path with have 3 segments, since it
	 * // shared its first segment point with the first
	 * // segment point of path2.
	 * 
	 * // Select the path to show that they have joined:
	 * path.selected = true;
	 *
	 * @example {@paperscript}
	 * // Joining two paths that connect at two points:
	 * var path = new Path({
	 * 	segments: [[30, 25], [80, 25], [80, 75]],
	 * 	strokeColor: 'black'
	 * });
	 * 
	 * var path2 = new Path({
	 * 	segments: [[30, 25], [30, 75], [80, 75]],
	 * 	strokeColor: 'black'
	 * });
	 * 
	 * // Join the paths:
	 * path.join(path2);
	 * 
	 * // Because the paths were joined at two points, the path is closed
	 * // and has 4 segments.
	 * 
	 * // Select the path to show that they have joined:
	 * path.selected = true;
	 */
	join: function(path) {
		if (path) {
			var segments = path._segments,
				last1 = this.getLastSegment(),
				last2 = path.getLastSegment();
			if (last1._point.equals(last2._point))
				path.reverse();
			var first2 = path.getFirstSegment();
			if (last1._point.equals(first2._point)) {
				last1.setHandleOut(first2._handleOut);
				this._add(segments.slice(1));
			} else {
				var first1 = this.getFirstSegment();
				if (first1._point.equals(first2._point))
					path.reverse();
				last2 = path.getLastSegment();
				if (first1._point.equals(last2._point)) {
					first1.setHandleIn(last2._handleIn);
					// Prepend all segments from path except the last one
					this._add(segments.slice(0, segments.length - 1), 0);
				} else {
					this._add(segments.slice());
				}
			}
			path.remove();
			// Close if they touch in both places
			var first1 = this.getFirstSegment();
			last1 = this.getLastSegment();
			if (last1._point.equals(first1._point)) {
				first1.setHandleIn(last1._handleIn);
				last1.remove();
				this.setClosed(true);
			}
			this._changed(5);
			return true;
		}
		return false;
	},

	/**
	 * For simple paths, reduce always returns the path itself. See
	 * {@link CompoundPath#reduce()} for more explanations.
	 */
	reduce: function() {
		return this;
	},

	/**
	 * The approximate length of the path in points.
	 *
	 * @type Number
	 * @bean
	 */
	getLength: function() {
		if (this._length == null) {
			var curves = this.getCurves();
			this._length = 0;
			for (var i = 0, l = curves.length; i < l; i++)
				this._length += curves[i].getLength();
		}
		return this._length;
	},

	/**
	 * The area of the path in square points. Self-intersecting paths can
	 * contain sub-areas that cancel each other out.
	 *
	 * @type Number
	 * @bean
	 */
	getArea: function() {
		var curves = this.getCurves();
		var area = 0;
		for (var i = 0, l = curves.length; i < l; i++)
			area += curves[i].getArea();
		return area;
	},

	_getOffset: function(location) {
		var index = location && location.getIndex();
		if (index != null) {
			var curves = this.getCurves(),
				offset = 0;
			for (var i = 0; i < index; i++)
				offset += curves[i].getLength();
			var curve = curves[index];
			return offset + curve.getLength(0, location.getParameter());
		}
		return null;
	},

	/**
	 * Returns the curve location of the specified point if it lies on the
	 * path, {@code null} otherwise.
	 * @param {Point} point the point on the path.
	 * @return {CurveLocation} the curve location of the specified point.
	 */
	getLocationOf: function(point) {
		point = Point.read(arguments);
		var curves = this.getCurves();
		for (var i = 0, l = curves.length; i < l; i++) {
			var loc = curves[i].getLocationOf(point);
			if (loc)
				return loc;
		}
		return null;
	},

	// DOCS: document Path#getLocationAt
	/**
	 * {@grouptitle Positions on Paths and Curves}
	 *
	 * @param {Number} offset
	 * @param {Boolean} [isParameter=false]
	 * @return {CurveLocation}
	 */
	getLocationAt: function(offset, isParameter) {
		var curves = this.getCurves(),
			length = 0;
		if (isParameter) {
			// offset consists of curve index and curve parameter, before and
			// after the fractional digit.
			var index = ~~offset; // = Math.floor()
			return curves[index].getLocationAt(offset - index, true);
		}
		for (var i = 0, l = curves.length; i < l; i++) {
			var start = length,
				curve = curves[i];
			length += curve.getLength();
			if (length >= offset) {
				// Found the segment within which the length lies
				return curve.getLocationAt(offset - start);
			}
		}
		// It may be that through impreciseness of getLength, that the end
		// of the curves was missed:
		if (offset <= this.getLength())
			return new CurveLocation(curves[curves.length - 1], 1);
		return null;
	},

	/**
	 * Calculates the point on the path at the given offset.
	 *
	 * @param {Number} offset
	 * @param {Boolean} [isParameter=false]
	 * @return {Point} the point at the given offset
	 *
	 * @example {@paperscript height=150}
	 * // Finding the point on a path at a given offset:
	 *
	 * // Create an arc shaped path:
	 * var path = new Path({
	 * 	strokeColor: 'black'
	 * });
	 * 
	 * path.add(new Point(40, 100));
	 * path.arcTo(new Point(150, 100));
	 * 
	 * // We're going to be working with a third of the length
	 * // of the path as the offset:
	 * var offset = path.length / 3;
	 * 
	 * // Find the point on the path:
	 * var point = path.getPointAt(offset);
	 * 
	 * // Create a small circle shaped path at the point:
	 * var circle = new Path.Circle({
	 * 	center: point,
	 * 	radius: 3,
	 * 	fillColor: 'red'
	 * });
	 *
	 * @example {@paperscript height=150}
	 * // Iterating over the length of a path:
	 *
	 * // Create an arc shaped path:
	 * var path = new Path({
	 * 	strokeColor: 'black'
	 * });
	 *
	 * path.add(new Point(40, 100));
	 * path.arcTo(new Point(150, 100));
	 *
	 * var amount = 5;
	 * var length = path.length;
	 * for (var i = 0; i < amount + 1; i++) {
	 * 	var offset = i / amount * length;
	 *
	 * 	// Find the point on the path at the given offset:
	 * 	var point = path.getPointAt(offset);
	 *
	 * 	// Create a small circle shaped path at the point:
	 * 	var circle = new Path.Circle({
	 * 		center: point,
	 * 		radius: 3,
	 * 		fillColor: 'red'
	 * 	});
	 * }
	 */
	getPointAt: function(offset, isParameter) {
		var loc = this.getLocationAt(offset, isParameter);
		return loc && loc.getPoint();
	},

	/**
	 * Calculates the tangent to the path at the given offset as a vector point.
	 *
	 * @param {Number} offset
	 * @param {Boolean} [isParameter=false]
	 * @return {Point} the tangent vector at the given offset
	 *
	 * @example {@paperscript height=150}
	 * // Working with the tangent vector at a given offset:
	 *
	 * // Create an arc shaped path:
	 * var path = new Path({
	 * 	strokeColor: 'black'
	 * });
	 *
	 * path.add(new Point(40, 100));
	 * path.arcTo(new Point(150, 100));
	 *
	 * // We're going to be working with a third of the length
	 * // of the path as the offset:
	 * var offset = path.length / 3;
	 *
	 * // Find the point on the path:
	 * var point = path.getPointAt(offset);
	 *
	 * // Find the tangent vector at the given offset:
	 * var tangent = path.getTangentAt(offset);
	 *
	 * // Make the tangent vector 60pt long:
	 * tangent.length = 60;
	 *
	 * var line = new Path({
	 * 	segments: [point, point + tangent],
	 * 	strokeColor: 'red'
	 * })
	 *
	 * @example {@paperscript height=200}
	 * // Iterating over the length of a path:
	 *
	 * // Create an arc shaped path:
	 * var path = new Path({
	 * 	strokeColor: 'black'
	 * });
	 *
	 * path.add(new Point(40, 100));
	 * path.arcTo(new Point(150, 100));
	 *
	 * var amount = 6;
	 * var length = path.length;
	 * for (var i = 0; i < amount + 1; i++) {
	 * 	var offset = i / amount * length;
	 *
	 * 	// Find the point on the path at the given offset:
	 * 	var point = path.getPointAt(offset);
	 *
	 * 	// Find the normal vector on the path at the given offset:
	 * 	var tangent = path.getTangentAt(offset);
	 *
	 * 	// Make the tangent vector 60pt long:
	 * 	tangent.length = 60;
	 *
	 * 	var line = new Path({
	 * 		segments: [point, point + tangent],
	 * 		strokeColor: 'red'
	 * 	})
	 * }
	 */
	getTangentAt: function(offset, isParameter) {
		var loc = this.getLocationAt(offset, isParameter);
		return loc && loc.getTangent();
	},

	/**
	 * Calculates the normal to the path at the given offset as a vector point.
	 *
	 * @param {Number} offset
	 * @param {Boolean} [isParameter=false]
	 * @return {Point} the normal vector at the given offset
	 *
	 * @example {@paperscript height=150}
	 * // Working with the normal vector at a given offset:
	 *
	 * // Create an arc shaped path:
	 * var path = new Path({
	 * 	strokeColor: 'black'
	 * });
	 *
	 * path.add(new Point(40, 100));
	 * path.arcTo(new Point(150, 100));
	 *
	 * // We're going to be working with a third of the length
	 * // of the path as the offset:
	 * var offset = path.length / 3;
	 *
	 * // Find the point on the path:
	 * var point = path.getPointAt(offset);
	 *
	 * // Find the normal vector at the given offset:
	 * var normal = path.getNormalAt(offset);
	 *
	 * // Make the normal vector 30pt long:
	 * normal.length = 30;
	 *
	 * var line = new Path({
	 * 	segments: [point, point + normal],
	 * 	strokeColor: 'red'
	 * });
	 *
	 * @example {@paperscript height=200}
	 * // Iterating over the length of a path:
	 *
	 * // Create an arc shaped path:
	 * var path = new Path({
	 * 	strokeColor: 'black'
	 * });
	 *
	 * path.add(new Point(40, 100));
	 * path.arcTo(new Point(150, 100));
	 *
	 * var amount = 10;
	 * var length = path.length;
	 * for (var i = 0; i < amount + 1; i++) {
	 * 	var offset = i / amount * length;
	 *
	 * 	// Find the point on the path at the given offset:
	 * 	var point = path.getPointAt(offset);
	 *
	 * 	// Find the normal vector on the path at the given offset:
	 * 	var normal = path.getNormalAt(offset);
	 *
	 * 	// Make the normal vector 30pt long:
	 * 	normal.length = 30;
	 *
	 * 	var line = new Path({
	 * 		segments: [point, point + normal],
	 * 		strokeColor: 'red'
	 * 	});
	 * }
	 */
	getNormalAt: function(offset, isParameter) {
		var loc = this.getLocationAt(offset, isParameter);
		return loc && loc.getNormal();
	},

	/**
	 * Returns the nearest location on the path to the specified point.
	 *
	 * @function
	 * @param point {Point} The point for which we search the nearest location
	 * @return {CurveLocation} The location on the path that's the closest to
	 * the specified point
	 */
	getNearestLocation: function(point) {
		point = Point.read(arguments);
		var curves = this.getCurves(),
			minDist = Infinity,
			minLoc = null;
		for (var i = 0, l = curves.length; i < l; i++) {
			var loc = curves[i].getNearestLocation(point);
			if (loc._distance < minDist) {
				minDist = loc._distance;
				minLoc = loc;
			}
		}
		return minLoc;
	},

	/**
	 * Returns the nearest point on the path to the specified point.
	 *
	 * @function
	 * @param point {Point} The point for which we search the nearest point
	 * @return {Point} The point on the path that's the closest to the specified
	 * point
	 * 
	 * @example {@paperscript height=200}
	 * var star = new Path.Star({
	 * 	center: view.center,
	 * 	points: 10,
	 * 	radius1: 30,
	 * 	radius2: 60,
	 * 	strokeColor: 'black'
	 * });
	 * 
	 * var circle = new Path.Circle({
	 * 	center: view.center,
	 * 	radius: 3,
	 * 	fillColor: 'red'
	 * });
	 * 
	 * function onMouseMove(event) {
	 * 	// Get the nearest point from the mouse position
	 * 	// to the star shaped path:
	 * 	var nearestPoint = star.getNearestPoint(event.point);
	 * 
	 * 	// Move the red circle to the nearest point:
	 * 	circle.position = nearestPoint;
	 * }
	 */
	getNearestPoint: function(point) {
		return this.getNearestLocation(point).getPoint();
	},

	hasFill: function() {
		// If this path is part of a CompoundPath, we need to check that
		// for fillColor too...
		return !!(this._style.getFillColor()
				|| this._parent._type === 'compound-path'
				&& this._parent._style.getFillColor());
	},

	_contains: function(point) {
		// If the path is not closed, we should not bail out in case it has a
		// fill color!
		var hasFill = this.hasFill();
		if (!this._closed && !hasFill
				// We need to call the internal _getBounds, to get non-
				// transformed bounds.
				|| !this._getBounds('getRoughBounds')._containsPoint(point))
			return false;
		// Note: This only works correctly with even-odd fill rule, or paths
		// that do not overlap with themselves.
		// TODO: Find out how to implement the "Point In Polygon" problem for
		// non-zero fill rule.
		// Use the crossing number algorithm, by counting the crossings of the
		// beam in right y-direction with the shape, and see if it's an odd
		// number, meaning the starting point is inside the shape.
		// http://en.wikipedia.org/wiki/Point_in_polygon
		var curves = this.getCurves(),
			segments = this._segments,
			crossings = 0,
			// Reuse one array for root-finding, give garbage collector a break
			roots = new Array(3);
		for (var i = 0, l = curves.length; i < l; i++)
			crossings += curves[i].getCrossings(point, roots);
		// TODO: Do not close open path for contains(), but create a straight
		// closing lines instead, just like how filling open paths works.
		if (!this._closed && hasFill)
			crossings += Curve.create(this, segments[segments.length - 1],
					segments[0]).getCrossings(point, roots);
		return (crossings & 1) === 1;
	},

	_hitTest: function(point, options) {
		// See #draw() for an explanation of why we can access _style properties
		// directly here:
		var style = this._style,
			tolerance = options.tolerance || 0,
			radius = (options.stroke && style.getStrokeColor()
					? style.getStrokeWidth() / 2 : 0) + tolerance,
			loc,
			res;
		// If we're asked to query for segments, ends or handles, do all that
		// before stroke or fill.
		var coords = [],
			that = this;
		function checkPoint(seg, pt, name) {
			// TODO: We need to transform the point back to the coordinate
			// system of the DOM level on which the inquiry was started!
			if (point.getDistance(pt) < tolerance)
				return new HitResult(name, that, { segment: seg, point: pt });
		}
		function checkSegment(seg, ends) {
			var point = seg._point;
			// Note, when checking for ends, we don't also check for handles,
			// since this will happen afterwards in a separate loop, see below.
			return (ends || options.segments)
					&& checkPoint(seg, point, 'segment')
				|| (!ends && options.handles) && (
					checkPoint(seg, point.add(seg._handleIn), 'handle-in') ||
					checkPoint(seg, point.add(seg._handleOut), 'handle-out'));
		}
		if (options.ends && !options.segments && !this._closed) {
			if (res = checkSegment(this.getFirstSegment(), true)
					|| checkSegment(this.getLastSegment(), true))
				return res;
		} else if (options.segments || options.handles) {
			for (var i = 0, l = this._segments.length; i < l; i++) {
				if (res = checkSegment(this._segments[i]))
					return res;
			}
		}
		// If we're querying for stroke, perform that before fill
		if (options.stroke && radius > 0)
			loc = this.getNearestLocation(point);
		// Don't process loc yet, as we also need to query for stroke after fill
		// in some cases. Simply skip fill query if we already have a matching
		// stroke.
		if (!(loc && loc._distance <= radius) && options.fill
				&& this.hasFill() && this.contains(point))
			return new HitResult('fill', this);
		// Now query stroke if we haven't already
		if (!loc && options.stroke && radius > 0)
			loc = this.getNearestLocation(point);
		if (loc && loc._distance <= radius)
			// TODO: Do we need to transform the location back to the coordinate
			// system of the DOM level on which the inquiry was started?
			return options.stroke
					? new HitResult('stroke', this, { location: loc })
					: new HitResult('fill', this);
	}

	// TODO: intersects(item)
	// TODO: contains(item)
	// TODO: intersect(item)
	// TODO: unite(item)
	// TODO: exclude(item)
}, new function() { // Scope for drawing

	// Note that in the code below we're often accessing _x and _y on point
	// objects that were read from segments. This is because the SegmentPoint
	// class overrides the plain x / y properties with getter / setters and
	// stores the values in these private properties internally. To avoid
	// calling of getter functions all the time we directly access these private
	// properties here. The distinction between normal Point objects and
	// SegmentPoint objects maybe seem a bit tedious but is worth the benefit in
	// performance.

	function drawHandles(ctx, segments, matrix, size) {
		var half = size / 2;

		function drawHandle(index) {
			var hX = coords[index],
				hY = coords[index + 1];
			if (pX != hX || pY != hY) {
				ctx.beginPath();
				ctx.moveTo(pX, pY);
				ctx.lineTo(hX, hY);
				ctx.stroke();
				ctx.beginPath();
				ctx.arc(hX, hY, half, 0, Math.PI * 2, true);
				ctx.fill();
			}
		}

		var coords = new Array(6);
		for (var i = 0, l = segments.length; i < l; i++) {
			var segment = segments[i];
			segment._transformCoordinates(matrix, coords, false);
			var state = segment._selectionState,
				selected = state & 4,
				pX = coords[0],
				pY = coords[1];
			if (selected || (state & 1))
				drawHandle(2);
			if (selected || (state & 2))
				drawHandle(4);
			// Draw a rectangle at segment.point:
			ctx.save();
			ctx.beginPath();
			ctx.rect(pX - half, pY - half, size, size);
			ctx.fill();
			// If the point is not selected, draw a white square that is 1 px
			// smaller on all sides:
			if (!selected) {
				ctx.beginPath();
				ctx.rect(pX - half + 1, pY - half + 1, size - 2, size - 2);
				ctx.fillStyle = '#ffffff';
				ctx.fill();
			}
			ctx.restore();
		}
	}

	function drawSegments(ctx, path, matrix) {
		var segments = path._segments,
			length = segments.length,
			coords = new Array(6),
			first = true,
			curX, curY,
			prevX, prevY,
			inX, inY,
			outX, outY;

		function drawSegment(i) {
			var segment = segments[i];
			// Optimise code when no matrix is provided by accessing semgent
			// points hand handles directly, since this is the default when
			// drawing paths. Matrix is only used for drawing selections.
			if (matrix) {
				segment._transformCoordinates(matrix, coords, false);
				curX = coords[0];
				curY = coords[1];
			} else {
				var point = segment._point;
				curX = point._x;
				curY = point._y;
			}
			if (first) {
				ctx.moveTo(curX, curY);
				first = false;
			} else {
				if (matrix) {
					inX = coords[2];
					inY = coords[3];
				} else {
					var handle = segment._handleIn;
					inX = curX + handle._x;
					inY = curY + handle._y;
				}
				if (inX == curX && inY == curY && outX == prevX && outY == prevY) {
					ctx.lineTo(curX, curY);
				} else {
					ctx.bezierCurveTo(outX, outY, inX, inY, curX, curY);
				}
			}
			prevX = curX;
			prevY = curY;
			if (matrix) {
				outX = coords[4];
				outY = coords[5];
			} else {
				var handle = segment._handleOut;
				outX = prevX + handle._x;
				outY = prevY + handle._y;
			}
		}

		for (var i = 0; i < length; i++)
			drawSegment(i);
		// Close path by drawing first segment again
		if (path._closed && length > 1)
			drawSegment(0);
	}

	return {
		_draw: function(ctx, param) {
			if (!param.compound)
				ctx.beginPath();

			// We can access styles directly on the internal _styles object,
			// since Path items do not have children, thus do not need style
			// accessors for merged styles.
			var style = this._style,
				fillColor = style.getFillColor(),
				strokeColor = style.getStrokeColor(),
				dashArray = style.getDashArray(),
				drawDash = !paper.support.nativeDash && strokeColor
						&& dashArray && dashArray.length;

			// Prepare the canvas path if we have any situation that requires it
			// to be defined.
			if (fillColor || strokeColor && !drawDash || param.compound
					|| param.clip)
				drawSegments(ctx, this);

			if (this._closed)
				ctx.closePath();

			if (!param.clip && !param.compound && (fillColor || strokeColor)) {
				// If the path is part of a compound path or doesn't have a fill
				// or stroke, there is no need to continue.
				this._setStyles(ctx);
				if (fillColor)
					ctx.fill();
				if (strokeColor) {
					if (drawDash) {
						// We cannot use the path created by drawSegments above
						// Use CurveFlatteners to draw dashed paths:
						ctx.beginPath();
						var flattener = new PathFlattener(this),
							from = style.getDashOffset(), to,
							i = 0;
						while (from < flattener.length) {
							to = from + dashArray[(i++) % dashArray.length];
							flattener.drawPart(ctx, from, to);
							from = to + dashArray[(i++) % dashArray.length];
						}
					}
					ctx.stroke();
				}
			}
		},

		_drawSelected: function(ctx, matrix) {
			ctx.beginPath();
			drawSegments(ctx, this, matrix);
			// Now stroke it and draw its handles:
			ctx.stroke();
			drawHandles(ctx, this._segments, matrix,
					this._project.options.handleSize || 4);
		}
	};
}, new function() { // Path Smoothing

	/**
	 * Solves a tri-diagonal system for one of coordinates (x or y) of first
	 * bezier control points.
	 *
	 * @param rhs right hand side vector.
	 * @return Solution vector.
	 */
	function getFirstControlPoints(rhs) {
		var n = rhs.length,
			x = [], // Solution vector.
			tmp = [], // Temporary workspace.
			b = 2;
		x[0] = rhs[0] / b;
		// Decomposition and forward substitution.
		for (var i = 1; i < n; i++) {
			tmp[i] = 1 / b;
			b = (i < n - 1 ? 4 : 2) - tmp[i];
			x[i] = (rhs[i] - x[i - 1]) / b;
		}
		// Back-substitution.
		for (var i = 1; i < n; i++) {
			x[n - i - 1] -= tmp[n - i] * x[n - i];
		}
		return x;
	}

	return {
		// Note: Documentation for smooth() is in PathItem
		smooth: function() {
			// This code is based on the work by Oleg V. Polikarpotchkin,
			// http://ov-p.spaces.live.com/blog/cns!39D56F0C7A08D703!147.entry
			// It was extended to support closed paths by averaging overlapping
			// beginnings and ends. The result of this approach is very close to
			// Polikarpotchkin's closed curve solution, but reuses the same
			// algorithm as for open paths, and is probably executing faster as
			// well, so it is preferred.
			var segments = this._segments,
				size = segments.length,
				n = size,
				// Add overlapping ends for averaging handles in closed paths
				overlap;

			if (size <= 2)
				return;

			if (this._closed) {
				// Overlap up to 4 points since averaging beziers affect the 4
				// neighboring points
				overlap = Math.min(size, 4);
				n += Math.min(size, overlap) * 2;
			} else {
				overlap = 0;
			}
			var knots = [];
			for (var i = 0; i < size; i++)
				knots[i + overlap] = segments[i]._point;
			if (this._closed) {
				// If we're averaging, add the 4 last points again at the
				// beginning, and the 4 first ones at the end.
				for (var i = 0; i < overlap; i++) {
					knots[i] = segments[i + size - overlap]._point;
					knots[i + size + overlap] = segments[i]._point;
				}
			} else {
				n--;
			}
			// Calculate first Bezier control points
			// Right hand side vector
			var rhs = [];

			// Set right hand side X values
			for (var i = 1; i < n - 1; i++)
				rhs[i] = 4 * knots[i]._x + 2 * knots[i + 1]._x;
			rhs[0] = knots[0]._x + 2 * knots[1]._x;
			rhs[n - 1] = 3 * knots[n - 1]._x;
			// Get first control points X-values
			var x = getFirstControlPoints(rhs);

			// Set right hand side Y values
			for (var i = 1; i < n - 1; i++)
				rhs[i] = 4 * knots[i]._y + 2 * knots[i + 1]._y;
			rhs[0] = knots[0]._y + 2 * knots[1]._y;
			rhs[n - 1] = 3 * knots[n - 1]._y;
			// Get first control points Y-values
			var y = getFirstControlPoints(rhs);

			if (this._closed) {
				// Do the actual averaging simply by linearly fading between the
				// overlapping values.
				for (var i = 0, j = size; i < overlap; i++, j++) {
					var f1 = i / overlap,
						f2 = 1 - f1,
						ie = i + overlap,
						je = j + overlap;
					// Beginning
					x[j] = x[i] * f1 + x[j] * f2;
					y[j] = y[i] * f1 + y[j] * f2;
					// End
					x[je] = x[ie] * f2 + x[je] * f1;
					y[je] = y[ie] * f2 + y[je] * f1;
				}
				n--;
			}
			var handleIn = null;
			// Now set the calculated handles
			for (var i = overlap; i <= n - overlap; i++) {
				var segment = segments[i - overlap];
				if (handleIn)
					segment.setHandleIn(handleIn.subtract(segment._point));
				if (i < n) {
					segment.setHandleOut(
							new Point(x[i], y[i]).subtract(segment._point));
					if (i < n - 1)
						handleIn = new Point(
								2 * knots[i + 1]._x - x[i + 1],
								2 * knots[i + 1]._y - y[i + 1]);
					else
						handleIn = new Point(
								(knots[n]._x + x[n - 1]) / 2,
								(knots[n]._y + y[n - 1]) / 2);
				}
			}
			if (this._closed && handleIn) {
				var segment = this._segments[0];
				segment.setHandleIn(handleIn.subtract(segment._point));
			}
		}
	};
}, new function() { // PostScript-style drawing commands
	/**
	 * Helper method that returns the current segment and checks if a moveTo()
	 * command is required first.
	 */
	function getCurrentSegment(that) {
		var segments = that._segments;
		if (segments.length == 0)
			throw new Error('Use a moveTo() command first');
		return segments[segments.length - 1];
	}

	return {
		// Note: Documentation for these methods is found in PathItem, as they
		// are considered abstract methods of PathItem and need to be defined in
		// all implementing classes.
		moveTo: function(point) {
			// moveTo should only be called at the beginning of paths. But it 
			// can ce called again if there is nothing drawn yet, in which case
			// the first segment gets readjusted.
			if (this._segments.length === 1)
				this.removeSegment(0);
			// Let's not be picky about calling moveTo() when not at the
			// beginning of a path, just bail out:
			if (!this._segments.length)
				this._add([ new Segment(Point.read(arguments)) ]);
		},

		moveBy: function(point) {
			throw new Error('moveBy() is unsupported on Path items.');
		},

		lineTo: function(point) {
			// Let's not be picky about calling moveTo() first:
			this._add([ new Segment(Point.read(arguments)) ]);
		},

		cubicCurveTo: function(handle1, handle2, to) {
			var _handle1 = Point.read(arguments),
				_handle2 = Point.read(arguments),
				_to = Point.read(arguments);
			// First modify the current segment:
			var current = getCurrentSegment(this);
			// Convert to relative values:
			current.setHandleOut(_handle1.subtract(current._point));
			// And add the new segment, with handleIn set to c2
			this._add([ new Segment(_to, _handle2.subtract(to)) ]);
		},

		quadraticCurveTo: function(handle, to) {
			var _handle = Point.read(arguments),
				to = Point.read(arguments);
			// This is exact:
			// If we have the three quad points: A E D,
			// and the cubic is A B C D,
			// B = E + 1/3 (A - E)
			// C = E + 1/3 (D - E)
			var current = getCurrentSegment(this)._point;
			this.cubicCurveTo(
				_handle.add(current.subtract(_handle).multiply(1 / 3)),
				_handle.add(to.subtract(_handle).multiply(1 / 3)),
				to
			);
		},

		curveTo: function(through, to, parameter) {
			var _through = Point.read(arguments),
				_to = Point.read(arguments),
				t = Base.pick(Base.read(arguments), 0.5),
				t1 = 1 - t,
				current = getCurrentSegment(this)._point,
				// handle = (through - (1 - t)^2 * current - t^2 * to) /
				// (2 * (1 - t) * t)
				handle = _through.subtract(current.multiply(t1 * t1))
					.subtract(_to.multiply(t * t)).divide(2 * t * t1);
			if (handle.isNaN())
				throw new Error(
					'Cannot put a curve through points with parameter = ' + t);
			this.quadraticCurveTo(handle, _to);
		},

		arcTo: function(to, clockwise /* | through, to */) {
			// Get the start point:
			var current = getCurrentSegment(this),
				from = current._point,
				through,
				point = Point.read(arguments),
				// Peek at next value to see if it's clockwise,
				// with true as default value.
				next = Base.pick(Base.peek(arguments), true);
			if (typeof next === 'boolean') {
				// arcTo(to, clockwise)
				to = point;
				clockwise = next;
				var middle = from.add(to).divide(2),
				through = middle.add(middle.subtract(from).rotate(
						clockwise ? -90 : 90));
			} else {
				// arcTo(through, to)
				through = point;
				to = Point.read(arguments);
			}
			// Construct the two perpendicular middle lines to (from, through)
			// and (through, to), and intersect them to get the center
			var l1 = new Line(from.add(through).divide(2),
						through.subtract(from).rotate(90), true),
				l2 = new Line(through.add(to).divide(2),
						to.subtract(through).rotate(90), true),
				center = l1.intersect(l2, true),
				line = new Line(from, to),
				throughSide = line.getSide(through);
			if (!center) {
				// If the two lines are colinear, there cannot be an arc as the
				// circle is infinitely big and has no center point. If side is
				// 0, the connecting arc line of this huge circle is a line
				// between the two points, so we can use #lineTo instead.
				// Otherwise we bail out:
				if (!throughSide)
					return this.lineTo(to);
				throw new Error("Cannot put an arc through the given points: "
					+ [from, through, to]);
			}
			var vector = from.subtract(center),
				radius = vector.getLength(),
				extent = vector.getDirectedAngle(to.subtract(center)),
				centerSide = line.getSide(center);
			if (centerSide == 0) {
				// If the center is lying on the line, we might have gotten the
				// wrong sign for extent above. Use the sign of the side of the
				// through point.
				extent = throughSide * Math.abs(extent);
			} else if (throughSide == centerSide) {
				// If the center is on the same side of the line (from, to) as
				// the through point, we're extending bellow 180 degrees and
				// need to adapt extent.
				extent -= 360 * (extent < 0 ? -1 : 1);
			}
			var ext = Math.abs(extent),
				count =  ext >= 360 ? 4 : Math.ceil(ext / 90),
				inc = extent / count,
				half = inc * Math.PI / 360,
				z = 4 / 3 * Math.sin(half) / (1 + Math.cos(half)),
				segments = [];
			for (var i = 0; i <= count; i++) {
				// Explicitely use to point for last segment, since depending
				// on values the calculation adds imprecision:
				var pt = i < count ? center.add(vector) : to;
				var out = i < count ? vector.rotate(90).multiply(z) : null;
				if (i == 0) {
					// Modify startSegment
					current.setHandleOut(out);
				} else {
					// Add new Segment
					segments.push(
						new Segment(pt, vector.rotate(-90).multiply(z), out));
				}
				vector = vector.rotate(inc);
			}
			// Add all segments at once at the end for higher performance
			this._add(segments);
		},

		lineBy: function(vector) {
			vector = Point.read(arguments);
			var current = getCurrentSegment(this);
			this.lineTo(current._point.add(vector));
		},

		curveBy: function(throughVector, toVector, parameter) {
			throughVector = Point.read(throughVector);
			toVector = Point.read(toVector);
			var current = getCurrentSegment(this)._point;
			this.curveTo(current.add(throughVector), current.add(toVector),
					parameter);
		},

		arcBy: function(throughVector, toVector) {
			throughVector = Point.read(throughVector);
			toVector = Point.read(toVector);
			var current = getCurrentSegment(this)._point;
			this.arcTo(current.add(throughVector), current.add(toVector));
		},

		closePath: function() {
			var first = this.getFirstSegment(),
				last = this.getLastSegment();
			if (first._point.equals(last._point)) {
				first.setHandleIn(last._handleIn);
				last.remove();
			}
			this.setClosed(true);
		}
	};
}, {  // A dedicated scope for the tricky bounds calculations
	// We define all the different getBounds functions as static methods on Path
	// and have #_getBounds directly access these. All static bounds functions
	// below have the same first four parameters: segments, closed, style,
	// matrix, so they can be called from #_getBounds() and also be used in
	// Curve. But not all of them use all these parameters, and some define
	// additional ones after.

	_getBounds: function(getter, matrix) {
		// See #draw() for an explanation of why we can access _style
		// properties directly here:
		return Path[getter](this._segments, this._closed, this._style, matrix);
	},

// Mess with indentation in order to get more line-space below...
statics: {
	/**
	 * Determines wether the segments describe a path in clockwise or counter-
	 * clockwise orientation.
	 *
	 * @private
	 */
	isClockwise: function(segments) {
		var sum = 0,
			xPre, yPre;
		function edge(x, y) {
			if (xPre !== undefined)
				sum += (xPre - x) * (y + yPre);
			xPre = x;
			yPre = y;
		}
		// Method derived from:
		// http://stackoverflow.com/questions/1165647
		// We treat the curve points and handles as the outline of a polygon of
		// which we determine the orientation using the method of calculating
		// the sum over the edges. This will work even with non-convex polygons,
		// telling you whether it's mostly clockwise
		// TODO: Check if this works correctly for all open paths.
		for (var i = 0, l = segments.length; i < l; i++) {
			var seg1 = segments[i],
				seg2 = segments[i + 1 < l ? i + 1 : 0],
				point1 = seg1._point,
				handle1 = seg1._handleOut,
				handle2 = seg2._handleIn,
				point2 = seg2._point;
			edge(point1._x, point1._y);
			edge(point1._x + handle1._x, point1._y + handle1._y);
			edge(point2._x + handle2._x, point2._y + handle2._y);
			edge(point2._x, point2._y);
		}
		return sum > 0;
	},

	/**
	 * Returns the bounding rectangle of the item excluding stroke width.
	 *
	 * @private
	 */
	getBounds: function(segments, closed, style, matrix, strokePadding) {
		var first = segments[0];
		// If there are no segments, return "empty" rectangle, just like groups,
		// since #bounds is assumed to never return null.
		if (!first)
			return new Rectangle();
		var coords = new Array(6),
			// Make coordinates for first segment available in prevCoords.
			prevCoords = first._transformCoordinates(matrix, new Array(6), false),
			min = prevCoords.slice(0, 2), // Start with values of first point
			max = min.slice(), // clone
			roots = new Array(2);

		function processSegment(segment) {
			segment._transformCoordinates(matrix, coords, false);
			for (var i = 0; i < 2; i++) {
				Curve._addBounds(
					prevCoords[i], // prev.point
					prevCoords[i + 4], // prev.handleOut
					coords[i + 2], // segment.handleIn
					coords[i], // segment.point,
					i, strokePadding ? strokePadding[i] : 0, min, max, roots);
			}
			// Swap coordinate buffers.
			var tmp = prevCoords;
			prevCoords = coords;
			coords = tmp;
		}

		for (var i = 1, l = segments.length; i < l; i++)
			processSegment(segments[i]);
		if (closed)
			processSegment(first);
		return new Rectangle(min[0], min[1], max[0] - min[0], max[1] - min[1]);
	},

	/**
	 * Returns the bounding rectangle of the item including stroke width.
	 *
	 * @private
	 */
	getStrokeBounds: function(segments, closed, style, matrix) {
		/**
		 * Returns the horizontal and vertical padding that a transformed round
		 * stroke adds to the bounding box, by calculating the dimensions of a
		 * rotated ellipse.
		 */
		function getPenPadding(radius, matrix) {
			if (!matrix)
				return [radius, radius];
			// If a matrix is provided, we need to rotate the stroke circle
			// and calculate the bounding box of the resulting rotated elipse:
			// Get rotated hor and ver vectors, and determine rotation angle
			// and elipse values from them:
			var mx = matrix.shiftless(),
				hor = mx.transform(new Point(radius, 0)),
				ver = mx.transform(new Point(0, radius)),
				phi = hor.getAngleInRadians(),
				a = hor.getLength(),
				b = ver.getLength();
			// Formula for rotated ellipses:
			// x = cx + a*cos(t)*cos(phi) - b*sin(t)*sin(phi)
			// y = cy + b*sin(t)*cos(phi) + a*cos(t)*sin(phi)
			// Derivates (by Wolfram Alpha):
			// derivative of x = cx + a*cos(t)*cos(phi) - b*sin(t)*sin(phi)
			// dx/dt = a sin(t) cos(phi) + b cos(t) sin(phi) = 0
			// derivative of y = cy + b*sin(t)*cos(phi) + a*cos(t)*sin(phi)
			// dy/dt = b cos(t) cos(phi) - a sin(t) sin(phi) = 0
			// This can be simplified to:
			// tan(t) = -b * tan(phi) / a // x
			// tan(t) =  b * cot(phi) / a // y
			// Solving for t gives:
			// t = pi * n - arctan(b * tan(phi) / a) // x
			// t = pi * n + arctan(b * cot(phi) / a)
			//   = pi * n + arctan(b / tan(phi) / a) // y
			var sin = Math.sin(phi),
				cos = Math.cos(phi),
				tan = Math.tan(phi),
				tx = -Math.atan(b * tan / a),
				ty = Math.atan(b / (tan * a));
			// Due to symetry, we don't need to cycle through pi * n solutions:
			return [Math.abs(a * Math.cos(tx) * cos - b * Math.sin(tx) * sin),
					Math.abs(b * Math.sin(ty) * cos + a * Math.cos(ty) * sin)];
		}

		// TODO: Find a way to reuse 'bounds' cache instead?
		if (!style.getStrokeColor() || !style.getStrokeWidth())
			return Path.getBounds(segments, closed, style, matrix);
		var length = segments.length - (closed ? 0 : 1),
			radius = style.getStrokeWidth() / 2,
			padding = getPenPadding(radius, matrix),
			bounds = Path.getBounds(segments, closed, style, matrix, padding),
			join = style.getStrokeJoin(),
			cap = style.getStrokeCap(),
			miterLimit,
			miterRadius;
		if (join == 'miter' && length > 1) {
			// miter is relative to stroke width. Divide it by 2 since we're
			// measuring half the distance below
			miterLimit = style.getMiterLimit() * style.getStrokeWidth() / 2;
			// Depending on the path's orientation, mitters are created towards
			// one side or the other
			miterRadius = radius * (Path.isClockwise(segments) ? 1 : -1);
		}
		// Create a rectangle of padding size, used for union with bounds
		// further down
		var joinBounds = new Rectangle(new Size(padding).multiply(2));

		function add(point) {
			bounds = bounds.include(matrix
				? matrix._transformPoint(point, point) : point);
		}

		function addBevelJoin(curve, t) {
			var point = curve.getPointAt(t, true),
				normal = curve.getNormalAt(t, true).normalize(radius);
			add(point.add(normal));
			add(point.subtract(normal));
		}

		function addJoin(segment, join) {
			// When both handles are set in a segment, the join setting is
			// ignored and round is always used.
			if (join === 'round' || !segment._handleIn.isZero()
					&& !segment._handleOut.isZero()) {
				bounds = bounds.unite(joinBounds.setCenter(matrix
					? matrix._transformPoint(segment._point) : segment._point));
			} else if (join === 'bevel') {
				var curve = segment.getCurve();
				addBevelJoin(curve, 0);
				addBevelJoin(curve.getPrevious(), 1);
			} else if (join === 'miter') {
				var curve2 = segment.getCurve(),
					curve1 = curve2.getPrevious(),
					point = curve2.getPointAt(0, true),
					normal1 = curve1.getNormalAt(1, true).normalize(miterRadius),
					normal2 = curve2.getNormalAt(0, true).normalize(miterRadius),
					// Intersect the two lines
					line1 = new Line(point.add(normal1),
							new Point(-normal1.y, normal1.x), true),
					line2 = new Line(point.add(normal2),
							new Point(-normal2.y, normal2.x), true),
					corner = line1.intersect(line2, true);
				// Now measure the distance from the segment to the
				// intersection, which his half of the miter distance
				if (!corner || point.getDistance(corner) > miterLimit) {
					addJoin(segment, 'bevel');
				} else {
					add(corner);
				}
			}
		}

		function addCap(segment, cap, t) {
			switch (cap) {
			case 'round':
				return addJoin(segment, cap);
			case 'butt':
			case 'square':
				// Calculate the corner points of butt and square caps
				var curve = segment.getCurve(),
					point = curve.getPointAt(t, true),
					normal = curve.getNormalAt(t, true).normalize(radius);
				// For square caps, we need to step away from point in the
				// direction of the tangent, which is the rotated normal
				if (cap === 'square')
					point = point.add(normal.rotate(t == 0 ? -90 : 90));
				add(point.add(normal));
				add(point.subtract(normal));
				break;
			}
		}

		for (var i = 1; i < length; i++)
			addJoin(segments[i], join);
		if (closed) {
			addJoin(segments[0], join);
		} else {
			addCap(segments[0], cap, 0);
			addCap(segments[segments.length - 1], cap, 1);
		}
		return bounds;
	},

	/**
	 * Returns the bounding rectangle of the item including handles.
	 *
	 * @private
	 */
	getHandleBounds: function(segments, closed, style, matrix, strokePadding,
			joinPadding) {
		var coords = new Array(6),
			x1 = Infinity,
			x2 = -x1,
			y1 = x1,
			y2 = x2;
		strokePadding = strokePadding / 2 || 0;
		joinPadding = joinPadding / 2 || 0;
		for (var i = 0, l = segments.length; i < l; i++) {
			var segment = segments[i];
			segment._transformCoordinates(matrix, coords, false);
			for (var j = 0; j < 6; j += 2) {
				// Use different padding for points or handles
				var padding = j == 0 ? joinPadding : strokePadding,
					x = coords[j],
					y = coords[j + 1],
					xn = x - padding,
					xx = x + padding,
					yn = y - padding,
					yx = y + padding;
				if (xn < x1) x1 = xn;
				if (xx > x2) x2 = xx;
				if (yn < y1) y1 = yn;
				if (yx > y2) y2 = yx;
			}
		}
		return new Rectangle(x1, y1, x2 - x1, y2 - y1);
	},

	/**
	 * Returns the rough bounding rectangle of the item that is sure to include
	 * all of the drawing, including stroke width.
	 *
	 * @private
	 */
	getRoughBounds: function(segments, closed, style, matrix) {
		// Delegate to handleBounds, but pass on radius values for stroke and
		// joins. Hanlde miter joins specially, by passing the largets radius
		// possible.
		var strokeWidth = style.getStrokeColor() ? style.getStrokeWidth() : 0;
		return Path.getHandleBounds(segments, closed, style, matrix,
				strokeWidth,
				style.getStrokeJoin() == 'miter'
					? strokeWidth * style.getMiterLimit()
					: strokeWidth);
	}
}});

/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2013, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

Path.inject({ statics: new function() {

	function createPath(args) {
		var path = new Path(),
			named = Base.getNamed(args);
		if (named)
			path._set(named);
		return path;
	}

	function createRectangle(/* rectangle */) {
		var rect = Rectangle.readNamed(arguments, 'rectangle'),
			radius = Size.readNamed(arguments, 'radius', 0, 0, false, true), // readNull
			bl = rect.getBottomLeft(true),
			tl = rect.getTopLeft(true),
			tr = rect.getTopRight(true),
			br = rect.getBottomRight(true),
			path = createPath(arguments);
		if (!radius || radius.isZero()) {
			path._add([
				new Segment(bl),
				new Segment(tl),
				new Segment(tr),
				new Segment(br)
			]);
		} else {
			radius = Size.min(radius, rect.getSize(true).divide(2));
			var h = radius.multiply(kappa * 2); // handle vector
			path._add([
				new Segment(bl.add(radius.width, 0), null, [-h.width, 0]),
				new Segment(bl.subtract(0, radius.height), [0, h.height], null),

				new Segment(tl.add(0, radius.height), null, [0, -h.height]),
				new Segment(tl.add(radius.width, 0), [-h.width, 0], null),

				new Segment(tr.subtract(radius.width, 0), null, [h.width, 0]),
				new Segment(tr.add(0, radius.height), [0, -h.height], null),

				new Segment(br.subtract(0, radius.height), null, [0, h.height]),
				new Segment(br.subtract(radius.width, 0), [h.width, 0], null)
			]);
		}
		path._closed = true;
		return path;
	}

	var kappa = Numerical.KAPPA / 2;

	var ellipseSegments = [
		new Segment([0, 0.5], [0, kappa ], [0, -kappa]),
		new Segment([0.5, 0], [-kappa, 0], [kappa, 0 ]),
		new Segment([1, 0.5], [0, -kappa], [0, kappa ]),
		new Segment([0.5, 1], [kappa, 0 ], [-kappa, 0])
	];

	function createEllipse(/* rectangle */) {
		var rect = Rectangle.readNamed(arguments, 'rectangle'),
			path = createPath(arguments),
			point = rect.getPoint(true),
			size = rect.getSize(true),
			segments = new Array(4);
		for (var i = 0; i < 4; i++) {
			var segment = ellipseSegments[i];
			segments[i] = new Segment(
				segment._point.multiply(size).add(point),
				segment._handleIn.multiply(size),
				segment._handleOut.multiply(size)
			);
		}
		path._add(segments);
		path._closed = true;
		return path;
	}

	return /** @lends Path */{
		/**
		 * {@grouptitle Shaped Paths}
		 *
		 * Creates a Path Item with two anchor points forming a line.
		 *
		 * @name Path.Line
		 * @param {Point} from the first anchor point of the path
		 * @param {Point} to the second anchor point of the path
		 * @return {Path} the newly created path
		 *
		 * @example {@paperscript}
		 * var from = new Point(20, 20);
		 * var to = new Point(80, 80);
		 * var path = new Path.Line(from, to);
		 * path.strokeColor = 'black';
		 * 
		 * @example {@paperscript} // Using object notation
		 * var path = new Path.Line({
		 * 	from: [20, 20],
		 * 	to: [80, 80],
		 * 	strokeColor: 'black'
		 * });
		 */
		Line: function(/* from, to */) {
			return new Path(
				Point.readNamed(arguments, 'from'),
				Point.readNamed(arguments, 'to')
			).set(Base.getNamed(arguments));
		},

		/**
		 * Creates a rectangle shaped Path Item from the passed point and size.
		 *
		 * @name Path.Rectangle
		 * @param {Point} point
		 * @param {Size} size
		 * @return {Path} the newly created path
		 *
		 * @example {@paperscript}
		 * var point = new Point(20, 20);
		 * var size = new Size(60, 60);
		 * var path = new Path.Rectangle(point, size);
		 * path.strokeColor = 'black';
		 *
		 * @example {@paperscript} // Using object notation
		 * var path = new Path.Rectangle({
		 * 	point: [20, 20],
		 * 	size: [60, 60],
		 * 	strokeColor: 'black'
		 * });
		 */
		/**
		 * Creates a rectangle shaped Path Item from the passed points. These do not
		 * necessarily need to be the top left and bottom right corners, the
		 * constructor figures out how to fit a rectangle between them.
		 *
		 * @name Path.Rectangle
		 * @param {Point} from The first point defining the rectangle
		 * @param {Point} to The second point defining the rectangle
		 * @return {Path} the newly created path
		 *
		 * @example {@paperscript}
		 * var from = new Point(20, 20);
		 * var to = new Point(80, 80);
		 * var path = new Path.Rectangle(from, to);
		 * path.strokeColor = 'black';
		 *
		 * @example {@paperscript} // Using object notation
		 * var path = new Path.Rectangle({
		 * 	from: [20, 20],
		 * 	to: [80, 80],
		 * 	strokeColor: 'black'
		 * });
		 */
		/**
		 * Creates a rectangle shaped Path Item from the passed abstract
		 * {@link Rectangle}.
		 *
		 * @name Path.Rectangle
		 * @param {Rectangle} rectangle
		 * @return {Path} the newly created path
		 *
		 * @example {@paperscript}
		 * var rectangle = new Rectangle({
		 * 	point: new Point(20, 20),
		 * 	size: new Size(60, 60)
		 * });
		 * var path = new Path.Rectangle(rectangle);
		 * path.strokeColor = 'black';
		 *
		 * @example {@paperscript}
		 * var rectangle = new Rectangle({
		 * 	point: [20, 20],
		 * 	size: [60, 60]
		 * });
		 * 
		 * var path = new Path.Rectangle({
		 * 	rectangle: rectangle,
		 * 	strokeColor: 'black'
		 * });
		 */
		/**
		 * Creates a rectangular Path Item with rounded corners.
		 *
		 * @name Path.Rectangle
		 * @param {Rectangle} rectangle
		 * @param {Size} radius the size of the rounded corners
		 * @return {Path} the newly created path
		 *
		 * @example {@paperscript}
		 * var rectangle = new Rectangle({
		 * 	point: new Point(20, 20),
		 * 	size: new Size(60, 60)
		 * });
		 * var cornerSize = new Size(10, 10);
		 * var path = new Path.Rectangle(rectangle, cornerSize);
		 * path.strokeColor = 'black';
		 *
		 * @example {@paperscript} // Using object notation
		 * var path = new Path.Rectangle({
		 * 	rectangle: {
		 * 		point: [20, 20],
		 * 		size: [60, 60]
		 * 	},
		 * 	radius: 10,
		 * 	strokeColor: 'black'
		 * });
		 */
		Rectangle: createRectangle,

		/**
		 * @deprecated use {@link #Path.Rectangle(rectangle, size)} instead.
		 */
		RoundRectangle: createRectangle,

		/**
		 * Creates an ellipse shaped Path Item.
		 *
		 * @param {Rectangle} rectangle
		 * @param {Boolean} [circumscribed=false] when set to {@code true} the
		 *        ellipse shaped path will be created so the rectangle fits into
		 *        it. When set to {@code false} the ellipse path will fit within
		 *        the rectangle.
		 * @return {Path} the newly created path
		 *
		 * @example {@paperscript}
		 * var rectangle = new Rectangle({
		 * 	point: [20, 20],
		 * 	size: [180, 60]
		 * });
		 * var path = new Path.Ellipse(rectangle);
		 * path.fillColor = 'black';
		 *
		 * @example {@paperscript} // Using object notation
		 * var path = new Path.Ellipse({
		 * 	point: [20, 20],
		 * 	size: [180, 60],
		 * 	fillColor: 'black'
		 * });
		 */
		Ellipse: createEllipse,

		/**
		 * @deprecated use {@link #Path.Ellipse(rectangle)} instead.
		 */
		Oval: createEllipse,

		/**
		 * Creates a circle shaped Path Item.
		 *
		 * @param {Point} center the center point of the circle
		 * @param {Number} radius the radius of the circle
		 * @return {Path} the newly created path
		 *
		 * @example {@paperscript}
		 * var path = new Path.Circle(new Point(80, 50), 30);
		 * path.strokeColor = 'black';
		 *
		 * @example {@paperscript} // Using object notation
		 * var path = new Path.Circle({
		 * 	center: [80, 50],
		 * 	radius: 30,
		 * 	strokeColor: 'black'
		 * });
		 */
		Circle: function(/* center, radius */) {
			var center = Point.readNamed(arguments, 'center'),
				radius = Base.readNamed(arguments, 'radius');
			return createEllipse(new Rectangle(center.subtract(radius),
					new Size(radius * 2, radius * 2)))
					.set(Base.getNamed(arguments));
		},

		/**
		 * Creates a circular arc shaped Path Item.
		 *
		 * @param {Point} from the starting point of the circular arc
		 * @param {Point} through the point the arc passes through
		 * @param {Point} to the end point of the arc
		 * @return {Path} the newly created path
		 *
		 * @example {@paperscript}
		 * var from = new Point(20, 20);
		 * var through = new Point(60, 20);
		 * var to = new Point(80, 80);
		 * var path = new Path.Arc(from, through, to);
		 * path.strokeColor = 'black';
		 *
		 * @example {@paperscript} // Using object notation
		 * var path = new Path.Arc({
		 * 	from: [20, 20],
		 * 	through: [60, 20],
		 * 	to: [80, 80],
		 * 	strokeColor: 'black'
		 * });
		 */
		Arc: function(/* from, through, to */) {
			var from = Point.readNamed(arguments, 'from'),
				through = Point.readNamed(arguments, 'through'),
				to = Point.readNamed(arguments, 'to'),
				path = createPath(arguments);
			path.moveTo(from);
			path.arcTo(through, to);
			return path;
		},

		/**
		 * Creates a regular polygon shaped Path Item.
		 *
		 * @param {Point} center the center point of the polygon
		 * @param {Number} sides the number of sides of the polygon
		 * @param {Number} radius the radius of the polygon
		 * @return {Path} the newly created path
		 *
		 * @example {@paperscript}
		 * var center = new Point(50, 50);
		 * var sides = 3;
		 * var radius = 40;
		 * var triangle = new Path.RegularPolygon(center, sides, radius);
		 * triangle.fillColor = 'black';
		 *
		 * @example {@paperscript} // Using object notation
		 * var triangle = new Path.RegularPolygon({
		 * 	center: [50, 50],
		 * 	sides: 10,
		 * 	radius: 40,
		 * 	fillColor: 'black'
		 * });
		 */
		RegularPolygon: function(/* center, sides, radius */) {
			var center = Point.readNamed(arguments, 'center'),
				sides = Base.readNamed(arguments, 'sides'),
				radius = Base.readNamed(arguments, 'radius'),
				path = createPath(arguments),
				step = 360 / sides,
				three = !(sides % 3),
				vector = new Point(0, three ? -radius : radius),
				offset = three ? -1 : 0.5,
				segments = new Array(sides);
			for (var i = 0; i < sides; i++) {
				segments[i] = new Segment(center.add(
					vector.rotate((i + offset) * step)));
			}
			path._add(segments);
			path._closed = true;
			return path;
		},

		/**
		 * Creates a star shaped Path Item.
		 *
		 * The largest of {@code radius1} and {@code radius2} will be the outer
		 * radius of the star. The smallest of radius1 and radius2 will be the
		 * inner radius.
		 *
		 * @param {Point} center the center point of the star
		 * @param {Number} points the number of points of the star
		 * @param {Number} radius1
		 * @param {Number} radius2
		 * @return {Path} the newly created path
		 *
		 * @example {@paperscript}
		 * var center = new Point(50, 50);
		 * var points = 12;
		 * var radius1 = 25;
		 * var radius2 = 40;
		 * var path = new Path.Star(center, points, radius1, radius2);
		 * path.fillColor = 'black';
		 *
		 * @example {@paperscript} // Using object notation
		 * var path = new Path.Star({
		 * 	center: [50, 50],
		 * 	points: 12,
		 * 	radius1: 25,
		 * 	radius2: 40,
		 * 	fillColor: 'black'
		 * });
		 */
		Star: function(/* center, points, radius1, radius2 */) {
			var center = Point.readNamed(arguments, 'center'),
				points = Base.readNamed(arguments, 'points') * 2,
				radius1 = Base.readNamed(arguments, 'radius1'),
				radius2 = Base.readNamed(arguments, 'radius2'),
				path = createPath(arguments),
				step = 360 / points,
				vector = new Point(0, -1),
				segments = new Array(points);
			for (var i = 0; i < points; i++) {
				segments[i] = new Segment(center.add(
					vector.rotate(step * i).multiply(i % 2 ? radius2 : radius1)));
			}
			path._add(segments);
			path._closed = true;
			return path;
		}
	};
}});

/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2013, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

/**
 * @name CompoundPath
 *
 * @class A compound path contains two or more paths, holes are drawn
 * where the paths overlap. All the paths in a compound path take on the
 * style of the backmost path and can be accessed through its
 * {@link Item#children} list.
 *
 * @extends PathItem
 */
var CompoundPath = PathItem.extend(/** @lends CompoundPath# */{
	_serializeFields: {
		pathData: ''
	},

	/**
	 * Creates a new compound path item and places it in the active layer.
	 *
	 * @param {Path[]} [paths] the paths to place within the compound path.
	 *
	 * @example {@paperscript}
	 * // Create a circle shaped path with a hole in it:
	 * var circle = new Path.Circle({
	 * 	center: new Point(50, 50),
	 * 	radius: 30
	 * });
	 * 
	 * var innerCircle = new Path.Circle({
	 * 	center: new Point(50, 50),
	 * 	radius: 10
	 * });
	 * 
	 * var compoundPath = new CompoundPath([circle, innerCircle]);
	 * compoundPath.fillColor = 'red';
	 * 
	 * // Move the inner circle 5pt to the right:
	 * compoundPath.children[1].position.x += 5;
	 */
	initialize: function CompoundPath(arg) {
		PathItem.call(this);
		// CompoundPath has children and supports named children.
		this._children = [];
		this._namedChildren = {};
		if (arg && !this._set(arg))
			this.addChildren(Array.isArray(arg) ? arg : arguments);
	},

	insertChildren: function insertChildren(index, items, _preserve) {
		// Pass on 'path' for _type, to make sure that only paths are added as
		// children.
		items = insertChildren.base.call(this, index, items, _preserve, 'path');
		// All children except for the bottom one (first one in list) are set
		// to anti-clockwise orientation, so that they appear as holes, but
		// only if their orientation was not already specified before
		// (= _clockwise is defined).
		for (var i = 0, l = !_preserve && items && items.length; i < l; i++) {
			var item = items[i];
			if (item._clockwise === undefined)
				item.setClockwise(item._index === 0);
		}
		return items;
	},

	/**
	 * If this is a compound path with only one path inside,
	 * the path is moved outside and the compound path is erased.
	 * Otherwise, the compound path is returned unmodified.
	 *
	 * @return {CompoundPath|Path} the flattened compound path
	 */
	reduce: function() {
		if (this._children.length == 1) {
			var child = this._children[0];
			child.insertAbove(this);
			this.remove();
			return child;
		}
		return this;
	},

	/**
	 * Reverses the orientation of all nested paths.
	 */
	reverse: function() {
		var children = this._children;
		for (var i = 0, l = children.length; i < l; i++)
			children[i].reverse();
	},

	smooth: function() {
		for (var i = 0, l = this._children.length; i < l; i++)
			this._children[i].smooth();
	},

	/**
	 * Specifies whether the compound path is oriented clock-wise.
	 *
	 * @type Boolean
	 * @bean
	 */
	isClockwise: function() {
		var child = this.getFirstChild();
		return child && child.isClockwise();
	},

	setClockwise: function(clockwise) {
		if (this.isClockwise() != !!clockwise)
			this.reverse();
	},

	/**
	 * The first Segment contained within the path.
	 *
	 * @type Segment
	 * @bean
	 */
	getFirstSegment: function() {
		var first = this.getFirstChild();
		return first && first.getFirstSegment();
	},

	/**
	 * The last Segment contained within the path.
	 *
	 * @type Segment
	 * @bean
	 */
	getLastSegment: function() {
		var last = this.getLastChild();
		return last && last.getLastSegment();
	},

	/**
	 * All the curves contained within the compound-path, from all its child
	 * {@link Path} items.
	 *
	 * @type Curve[]
	 * @bean
	 */
	getCurves: function() {
		var children = this._children,
			curves = [];
		for (var i = 0, l = children.length; i < l; i++)
			curves = curves.concat(children[i].getCurves());
		return curves;
	},

	/**
	 * The first Curve contained within the path.
	 *
	 * @type Curve
	 * @bean
	 */
	getFirstCurve: function() {
		var first = this.getFirstChild();
		return first && first.getFirstCurve();
	},

	/**
	 * The last Curve contained within the path.
	 *
	 * @type Curve
	 * @bean
	 */
	getLastCurve: function() {
		var last = this.getLastChild();
		return last && last.getFirstCurve();
	},

	/**
	 * The area of the path in square points. Self-intersecting paths can
	 * contain sub-areas that cancel each other out.
	 *
	 * @type Number
	 * @bean
	 */
	getArea: function() {
		var children = this._children,
			area = 0;
		for (var i = 0, l = children.length; i < l; i++)
			area += children[i].getArea();
		return area;
	},

	getPathData: function(/* precision */) {
		var children = this._children,
			paths = [];
		for (var i = 0, l = children.length; i < l; i++)
			paths.push(children[i].getPathData(arguments[0]));
		return paths.join(' ');
	},

	/**
	 * A private method to help with both #contains() and #_hitTest().
	 * Instead of simply returning a boolean, it returns a children of all the
	 * children that contain the point. This is required by _hitTest(), and
	 * Item#contains() is prepared for such a result.
	 */
	_contains: function(point) {
		// Compound paths are a little complex: In order to determine wether a
		// point is inside a path or not due to the even-odd rule, we need to
		// check all the children and count how many intersect. If it's an odd
		// number, the point is inside the path. Once we know it's inside the
		// path, _hitTest also needs access to the first intersecting element, 
		// for the HitResult, so we collect and return a list here.
		var children = [];
		for (var i = 0, l = this._children.length; i < l; i++) {
			var child = this._children[i];
			if (child.contains(point))
				children.push(child);
		}
		return (children.length & 1) == 1 && children;
	},

	_hitTest: function _hitTest(point, options) {
		var res = _hitTest.base.call(this, point,
				Base.merge(options, { fill: false }));
		if (!res && options.fill && this._style.getFillColor()) {
			res = this._contains(point);
			res = res ? new HitResult('fill', res[0]) : null;
		}
		return res;
	},

	_draw: function(ctx, param) {
		var children = this._children,
			style = this._style;
		// Return early if the compound path doesn't have any children:
		if (children.length === 0)
			return;
		ctx.beginPath();
		param.compound = true;
		for (var i = 0, l = children.length; i < l; i++)
			children[i].draw(ctx, param);
		param.compound = false;
		if (!param.clip) {
			this._setStyles(ctx);
			if (style.getFillColor())
				ctx.fill();
			if (style.getStrokeColor())
				ctx.stroke();
		}
	}
}, new function() { // Injection scope for PostScript-like drawing functions
	/**
	 * Helper method that returns the current path and checks if a moveTo()
	 * command is required first.
	 */
	function getCurrentPath(that) {
		if (!that._children.length)
			throw new Error('Use a moveTo() command first');
		return that._children[that._children.length - 1];
	}

	var fields = {
		// Note: Documentation for these methods is found in PathItem, as they
		// are considered abstract methods of PathItem and need to be defined in
		// all implementing classes.
		moveTo: function(point) {
			var path = new Path();
			this.addChild(path);
			path.moveTo.apply(path, arguments);
		},

		moveBy: function(point) {
			this.moveTo(getCurrentPath(this).getLastSegment()._point.add(
					Point.read(arguments)));
		},

		closePath: function() {
			getCurrentPath(this).closePath();
		}
	};

	// Redirect all other drawing commands to the current path
	Base.each(['lineTo', 'cubicCurveTo', 'quadraticCurveTo', 'curveTo',
			'arcTo', 'lineBy', 'curveBy', 'arcBy'], function(key) {
		fields[key] = function() {
			var path = getCurrentPath(this);
			path[key].apply(path, arguments);
		};
	});

	return fields;
});

/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2013, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

var PathFlattener = Base.extend({
	initialize: function(path) {
		this.curves = []; // The curve values as returned by getValues()
		this.parts = []; // The calculated, subdivided parts of the path
		this.length = 0; // The total length of the path
		// Keep a current index from the part where we last where in
		// getParameterAt(), to optimise for iterator-like usage of flattener.
		this.index = 0;

		// Instead of relying on path.curves, we only use segments here and
		// get the curve values from them.

		// Now walk through all curves and compute the parts for each of them,
		// by recursively calling _computeParts().
		var segments = path._segments,
			segment1 = segments[0],
			segment2,
			that = this;

		function addCurve(segment1, segment2) {
			var curve = Curve.getValues(segment1, segment2);
			that.curves.push(curve);
			that._computeParts(curve, segment1._index, 0, 1);
		}

		for (var i = 1, l = segments.length; i < l; i++) {
			segment2 = segments[i];
			addCurve(segment1, segment2);
			segment1 = segment2;
		}
		if (path._closed)
			addCurve(segment2, segments[0]);
	},

	_computeParts: function(curve, index, minT, maxT) {
		// Check if the t-span is big enough for subdivision.
		// We're not subdividing more than 32 times...
		// After quite a bit of testing, a tolerance of 0.25 appears to be a
		// good trade-off between speed and precision.
		if ((maxT - minT) > 1 / 32 && !Curve.isFlatEnough(curve, 0.25)) {
			var curves = Curve.subdivide(curve);
			var halfT = (minT + maxT) / 2;
			// Recursively subdive and compute parts again.
			this._computeParts(curves[0], index, minT, halfT);
			this._computeParts(curves[1], index, halfT, maxT);
		} else {
			// Calculate distance between p1 and p2
			var x = curve[6] - curve[0],
				y = curve[7] - curve[1],
				dist = Math.sqrt(x * x + y * y);
			if (dist > 0.00001) {
				this.length += dist;
				this.parts.push({
					offset: this.length,
					value: maxT,
					index: index
				});
			}
		}
	},

	getParameterAt: function(offset) {
		// Make sure we're not beyond the requested offset already. Search the
		// start position backwards from where to then process the loop below.
		var i, j = this.index;
		for (;;) {
			i = j;
			if (j == 0 || this.parts[--j].offset < offset)
				break;
		}
		// Find the part that succeeds the given offset, then interpolate
		// with the previous part
		for (var l = this.parts.length; i < l; i++) {
			var part = this.parts[i];
			if (part.offset >= offset) {
				// Found the right part, remember current position
				this.index = i;
				// Now get the previous part so we can linearly interpolate
				// the curve parameter
				var prev = this.parts[i - 1];
				// Make sure we only use the previous parameter value if its
				// for the same curve, by checking index. Use 0 otherwise.
				var prevVal = prev && prev.index == part.index ? prev.value : 0,
					prevLen = prev ? prev.offset : 0;
				return {
					// Interpolate
					value: prevVal + (part.value - prevVal)
						* (offset - prevLen) /  (part.offset - prevLen),
					index: part.index
				};
			}
		}
		// Return last one
		var part = this.parts[this.parts.length - 1];
		return {
			value: 1,
			index: part.index
		};
	},

	evaluate: function(offset, type) {
		var param = this.getParameterAt(offset);
		return Curve.evaluate(this.curves[param.index], param.value, true, type);
	},

	drawPart: function(ctx, from, to) {
		from = this.getParameterAt(from);
		to = this.getParameterAt(to);
		for (var i = from.index; i <= to.index; i++) {
			var curve = Curve.getPart(this.curves[i],
					i == from.index ? from.value : 0,
					i == to.index ? to.value : 1);
			if (i == from.index)
				ctx.moveTo(curve[0], curve[1]);
			ctx.bezierCurveTo.apply(ctx, curve.slice(2));
		}
	}
});

/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2013, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

// An Algorithm for Automatically Fitting Digitized Curves
// by Philip J. Schneider
// from "Graphics Gems", Academic Press, 1990
// Modifications and optimisations of original algorithm by Juerg Lehni.

var PathFitter = Base.extend({
	initialize: function(path, error) {
		this.points = [];
		var segments = path._segments,
			prev;
		// Copy over points from path and filter out adjacent duplicates.
		for (var i = 0, l = segments.length; i < l; i++) {
			var point = segments[i].point.clone();
			if (!prev || !prev.equals(point)) {
				this.points.push(point);
				prev = point;
			}
		}
		this.error = error;
	},

	fit: function() {
		var points = this.points,
			length = points.length;
		this.segments = length > 0 ? [new Segment(points[0])] : [];
		if (length > 1)
			this.fitCubic(0, length - 1,
				// Left Tangent
				points[1].subtract(points[0]).normalize(),
				// Right Tangent
				points[length - 2].subtract(points[length - 1]).normalize());
		return this.segments;
	},

	// Fit a Bezier curve to a (sub)set of digitized points
	fitCubic: function(first, last, tan1, tan2) {
		//	Use heuristic if region only has two points in it
		if (last - first == 1) {
			var pt1 = this.points[first],
				pt2 = this.points[last],
				dist = pt1.getDistance(pt2) / 3;
			this.addCurve([pt1, pt1.add(tan1.normalize(dist)),
					pt2.add(tan2.normalize(dist)), pt2]);
			return;
		}
		// Parameterize points, and attempt to fit curve
		var uPrime = this.chordLengthParameterize(first, last),
			maxError = Math.max(this.error, this.error * this.error),
			error,
			split;
		// Try 4 iterations
		for (var i = 0; i <= 4; i++) {
			var curve = this.generateBezier(first, last, uPrime, tan1, tan2);
			//	Find max deviation of points to fitted curve
			var max = this.findMaxError(first, last, curve, uPrime);
			if (max.error < this.error) {
				this.addCurve(curve);
				return;
			}
			split = max.index;
			// If error not too large, try reparameterization and iteration
			if (max.error >= maxError)
				break;
			this.reparameterize(first, last, uPrime, curve);
			maxError = max.error;
		}
		// Fitting failed -- split at max error point and fit recursively
		var V1 = this.points[split - 1].subtract(this.points[split]),
			V2 = this.points[split].subtract(this.points[split + 1]),
			tanCenter = V1.add(V2).divide(2).normalize();
		this.fitCubic(first, split, tan1, tanCenter);
		this.fitCubic(split, last, tanCenter.negate(), tan2);
	},

	addCurve: function(curve) {
		var prev = this.segments[this.segments.length - 1];
		prev.setHandleOut(curve[1].subtract(curve[0]));
		this.segments.push(
				new Segment(curve[3], curve[2].subtract(curve[3])));
	},

	// Use least-squares method to find Bezier control points for region.
	generateBezier: function(first, last, uPrime, tan1, tan2) {
		var epsilon = 1e-11,
			pt1 = this.points[first],
			pt2 = this.points[last],
			// Create the C and X matrices
			C = [[0, 0], [0, 0]],
			X = [0, 0];

		for (var i = 0, l = last - first + 1; i < l; i++) {
			var u = uPrime[i],
				t = 1 - u,
				b = 3 * u * t,
				b0 = t * t * t,
				b1 = b * t,
				b2 = b * u,
				b3 = u * u * u,
				a1 = tan1.normalize(b1),
				a2 = tan2.normalize(b2),
				tmp = this.points[first + i]
					.subtract(pt1.multiply(b0 + b1))
					.subtract(pt2.multiply(b2 + b3));
			C[0][0] += a1.dot(a1);
			C[0][1] += a1.dot(a2);
			// C[1][0] += a1.dot(a2);
			C[1][0] = C[0][1];
			C[1][1] += a2.dot(a2);
			X[0] += a1.dot(tmp);
			X[1] += a2.dot(tmp);
		}

		// Compute the determinants of C and X
		var detC0C1 = C[0][0] * C[1][1] - C[1][0] * C[0][1],
			alpha1, alpha2;
		if (Math.abs(detC0C1) > epsilon) {
			// Kramer's rule
			var detC0X  = C[0][0] * X[1]    - C[1][0] * X[0],
				detXC1  = X[0]    * C[1][1] - X[1]    * C[0][1];
			// Derive alpha values
			alpha1 = detXC1 / detC0C1;
			alpha2 = detC0X / detC0C1;
		} else {
			// Matrix is under-determined, try assuming alpha1 == alpha2
			var c0 = C[0][0] + C[0][1],
				c1 = C[1][0] + C[1][1];
			if (Math.abs(c0) > epsilon) {
				alpha1 = alpha2 = X[0] / c0;
			} else if (Math.abs(c1) > epsilon) {
				alpha1 = alpha2 = X[1] / c1;
			} else {
				// Handle below
				alpha1 = alpha2 = 0;
			}
		}

		// If alpha negative, use the Wu/Barsky heuristic (see text)
		// (if alpha is 0, you get coincident control points that lead to
		// divide by zero in any subsequent NewtonRaphsonRootFind() call.
		var segLength = pt2.getDistance(pt1);
		epsilon *= segLength;
		if (alpha1 < epsilon || alpha2 < epsilon) {
			// fall back on standard (probably inaccurate) formula,
			// and subdivide further if needed.
			alpha1 = alpha2 = segLength / 3;
		}

		// First and last control points of the Bezier curve are
		// positioned exactly at the first and last data points
		// Control points 1 and 2 are positioned an alpha distance out
		// on the tangent vectors, left and right, respectively
		return [pt1, pt1.add(tan1.normalize(alpha1)),
				pt2.add(tan2.normalize(alpha2)), pt2];
	},

	// Given set of points and their parameterization, try to find
	// a better parameterization.
	reparameterize: function(first, last, u, curve) {
		for (var i = first; i <= last; i++) {
			u[i - first] = this.findRoot(curve, this.points[i], u[i - first]);
		}
	},

	// Use Newton-Raphson iteration to find better root.
	findRoot: function(curve, point, u) {
		var curve1 = [],
			curve2 = [];
		// Generate control vertices for Q'
		for (var i = 0; i <= 2; i++) {
			curve1[i] = curve[i + 1].subtract(curve[i]).multiply(3);
		}
		// Generate control vertices for Q''
		for (var i = 0; i <= 1; i++) {
			curve2[i] = curve1[i + 1].subtract(curve1[i]).multiply(2);
		}
		// Compute Q(u), Q'(u) and Q''(u)
		var pt = this.evaluate(3, curve, u),
			pt1 = this.evaluate(2, curve1, u),
			pt2 = this.evaluate(1, curve2, u),
			diff = pt.subtract(point),
			df = pt1.dot(pt1) + diff.dot(pt2);
		// Compute f(u) / f'(u)
		if (Math.abs(df) < 0.00001)
			return u;
		// u = u - f(u) / f'(u)
		return u - diff.dot(pt1) / df;
	},

	// Evaluate a Bezier curve at a particular parameter value
	evaluate: function(degree, curve, t) {
		// Copy array
		var tmp = curve.slice();
		// Triangle computation
		for (var i = 1; i <= degree; i++) {
			for (var j = 0; j <= degree - i; j++) {
				tmp[j] = tmp[j].multiply(1 - t).add(tmp[j + 1].multiply(t));
			}
		}
		return tmp[0];
	},

	// Assign parameter values to digitized points
	// using relative distances between points.
	chordLengthParameterize: function(first, last) {
		var u = [0];
		for (var i = first + 1; i <= last; i++) {
			u[i - first] = u[i - first - 1]
					+ this.points[i].getDistance(this.points[i - 1]);
		}
		for (var i = 1, m = last - first; i <= m; i++) {
			u[i] /= u[m];
		}
		return u;
	},

	// Find the maximum squared distance of digitized points to fitted curve.
	findMaxError: function(first, last, curve, u) {
		var index = Math.floor((last - first + 1) / 2),
			maxDist = 0;
		for (var i = first + 1; i < last; i++) {
			var P = this.evaluate(3, curve, u[i - first]);
			var v = P.subtract(this.points[i]);
			var dist = v.x * v.x + v.y * v.y; // squared
			if (dist >= maxDist) {
				maxDist = dist;
				index = i;
			}
		}
		return {
			error: maxDist,
			index: index
		};
	}
});

/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2013, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

/*
 * Boolean Geometric Path Operations
 *
 * This is mostly written for clarity and compatibility, not optimised for
 * performance, and has to be tested heavily for stability.
 *
 * Supported
 *  - Path and CompoundPath items
 *  - Boolean Union
 *  - Boolean Intersection
 *  - Boolean Subtraction
 *  - Resolving a self-intersecting Path
 *
 * Not supported yet
 *  - Boolean operations on self-intersecting Paths
 *  - Paths are clones of each other that ovelap exactly on top of each other!
 *
 * @author Harikrishnan Gopalakrishnan
 * http://hkrish.com/playground/paperjs/booleanStudy.html
 */

PathItem.inject(new function() {

	function splitPath(intersections, collectOthers) {
		// Sort intersections by paths ids, curve index and parameter, so we
		// can loop through all intersections, divide paths and never need to
		// readjust indices.
		intersections.sort(function(loc1, loc2) {
			var path1 = loc1.getPath(),
				path2 = loc2.getPath();
			return path1 === path2
					// We can add parameter (0 <= t <= 1) to index (a integer)
					// to compare both at the same time
					? (loc1.getIndex() + loc1.getParameter())
						- (loc2.getIndex() + loc2.getParameter())
					// Sort by path id to group all locations on the same path.
					: path1._id - path2._id;
		});
		var others = collectOthers && [];
		for (var i = intersections.length - 1; i >= 0; i--) {
			var loc = intersections[i],
				other = loc.getIntersection(),
				curve = loc.divide(),
				// When the curve doesn't need to be divided since t = 0, 1,
				// #divide() returns null and we can use the existing segment.
				segment = curve && curve.getSegment1() || loc.getSegment();
			if (others)
				others.push(other);
			segment._intersection = other;
		}
		return others;
	}

	/**
	 * To deal with a HTML5 canvas requirement where CompoundPaths' child
	 * contours has to be of different winding direction for correctly filling
	 * holes. But if some individual countours are disjoint, i.e. islands, we
	 * have to reorient them so that:
	 * - the holes have opposit winding direction (already handled by paper.js)
	 * - islands have to have the same winding direction as the first child
	 *
	 * NOTE: Does NOT handle self-intersecting CompoundPaths.
	 */
	function reorientPath(path) {
		if (path instanceof CompoundPath) {
			var children = path._children,
				length = children.length,
				bounds = new Array(length),
				counters = new Array(length),
				clockwise = children[0].isClockwise();
			for (var i = 0; i < length; i++) {
				bounds[i] = children[i].getBounds();
				counters[i] = 0;
			}
			for (var i = 0; i < length; i++) {
				for (var j = 1; j < length; j++) {
					if (i !== j && bounds[i].contains(bounds[j]))
						counters[j]++;
				}
				// Omit the first child
				if (i > 0 && counters[i] % 2 === 0)
					children[i].setClockwise(clockwise);
			}
		}
		return path;
	}

	function computeBoolean(path1, path2, operator, subtract) {
		// We do not modify the operands themselves
		// The result might not belong to the same type
		// i.e. subtraction(A:Path, B:Path):CompoundPath etc.
		path1 = reorientPath(path1.clone());
		path2 = reorientPath(path2.clone());
		var path1Clockwise = path1.isClockwise(),
			path2Clockwise = path2.isClockwise(),
			// Calculate all the intersections
			intersections = path1.getIntersections(path2);
		// Split intersections on both paths, by asking the first call to
		// collect the intersections on the other path for us and passing the
		// result of that on to the second call.
		splitPath(splitPath(intersections, true));
		// Do operator specific calculations before we begin
		if (subtract) {
			path2.reverse();
			path2Clockwise = !path2Clockwise;
		}
		var paths = []
				.concat(path1._children || [path1])
				.concat(path2._children || [path2]),
			segments = [],
			result = new CompoundPath();
		// Step 1: Discard invalid links according to the boolean operator
		for (var i = 0, l = paths.length; i < l; i++) {
			var path = paths[i],
				parent = path._parent,
				clockwise = path.isClockwise(),
				segs = path._segments;
			path = parent instanceof CompoundPath ? parent : path;
			for (var j = segs.length - 1; j >= 0; j--) {
				var segment = segs[j],
					midPoint = segment.getCurve().getPoint(0.5),
					insidePath1 = path !== path1 && path1.contains(midPoint)
							&& (clockwise === path1Clockwise || subtract
									|| !testOnCurve(path1, midPoint)),
					insidePath2 = path !== path2 && path2.contains(midPoint)
							&& (clockwise === path2Clockwise
									|| !testOnCurve(path2, midPoint));
				if (operator(path === path1, insidePath1, insidePath2)) {
					// The segment is to be discarded. Don't add it to segments,
					// and mark it as invalid since it might still be found
					// through curves / intersections, see below.
					segment._invalid = true;
				} else {
					segments.push(segment);
				}
			}
		}
		// Step 2: Retrieve the resulting paths from the graph
		for (var i = 0, l = segments.length; i < l; i++) {
			var segment = segments[i];
			if (segment._visited)
				continue;
			var path = new Path(),
				loc = segment._intersection,
				intersection = loc && loc.getSegment(true);
			if (segment.getPrevious()._invalid)
				segment.setHandleIn(intersection
						? intersection._handleIn
						: new Point(0, 0));
			do {
				segment._visited = true;
				if (segment._invalid && segment._intersection) {
					var inter = segment._intersection.getSegment(true);
					path.add(new Segment(segment._point, segment._handleIn,
							inter._handleOut));
					inter._visited = true;
					segment = inter;
				} else {
					path.add(segment.clone());
				}
				segment = segment.getNext();
			} while (segment && !segment._visited && segment !== intersection);
			// Avoid stray segments and incomplete paths
			var amount = path._segments.length;
			if (amount > 1 && (amount > 2 || !path.isPolygon())) {
				path.setClosed(true);
				result.addChild(path, true);
			} else {
				path.remove();
			}
		}
		// Delete the proxies
		path1.remove();
		path2.remove();
		// And then, we are done.
		return result.reduce();
	}

	function testOnCurve(path, point) {
		var curves = path.getCurves(),
			bounds = path.getBounds();
		if (bounds.contains(point)) {
			for (var i = 0, l = curves.length; i < l; i++) {
				var curve = curves[i];
				if (curve.getBounds().contains(point)
						&& curve.getParameterOf(point))
					return true;
			}
		}
		return false;
	}

	// Boolean operators are binary operator functions of the form:
	// function(isPath1, isInPath1, isInPath2)
	//
	// Operators return true if a segment in the operands is to be discarded.
	// They are called for each segment in the graph after all the intersections
	// between the operands are calculated and curves in the operands were split
	// at intersections.
	return /** @lends Path# */{
		/**
		 * Merges the geometry of the specified path from this path's
		 * geometry and returns the result as a new path item.
		 * 
		 * @param {PathItem} path the path to unite with
		 * @return {PathItem} the resulting path item
		 */
		unite: function(path) {
			return computeBoolean(this, path,
					function(isPath1, isInPath1, isInPath2) {
						return isInPath1 || isInPath2;
					});
		},

		/**
		 * Intersects the geometry of the specified path with this path's
		 * geometry and returns the result as a new path item.
		 * 
		 * @param {PathItem} path the path to intersect with
		 * @return {PathItem} the resulting path item
		 */
		intersect: function(path) {
			return computeBoolean(this, path,
					function(isPath1, isInPath1, isInPath2) {
						return !(isInPath1 || isInPath2);
					});
		},

		/**
		 * Subtracts the geometry of the specified path from this path's
		 * geometry and returns the result as a new path item.
		 * 
		 * @param {PathItem} path the path to subtract
		 * @return {PathItem} the resulting path item
		 */
		subtract: function(path) {
			return computeBoolean(this, path,
					function(isPath1, isInPath1, isInPath2) {
						return isPath1 && isInPath2 || !isPath1 && !isInPath1;
					}, true);
		},

		// Compound boolean operators combine the basic boolean operations such
		// as union, intersection, subtract etc. 
		// TODO: cache the split objects and find a way to properly clone them!
		/**
		 * Excludes the intersection of the geometry of the specified path with
		 * this path's geometry and returns the result as a new group item.
		 * 
		 * @param {PathItem} path the path to exclude the intersection of
		 * @return {Group} the resulting group item
		 */
		exclude: function(path) {
			return new Group([this.subtract(path), path.subtract(this)]);
		},

		/**
		 * Splits the geometry of this path along the geometry of the specified
		 * path returns the result as a new group item.
		 * 
		 * @param {PathItem} path the path to divide by
		 * @return {Group} the resulting group item
		 */
		divide: function(path) {
			return new Group([this.subtract(path), this.intersect(path)]);
		}
	};
});


/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2013, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

/**
 * @name TextItem
 *
 * @class The TextItem type allows you to create typography. Its
 * functionality is inherited by different text item types such as
 * {@link PointText}, and {@link AreaText} (coming soon). They each add a
 * layer of functionality that is unique to their type, but share the
 * underlying properties and functions that they inherit from TextItem.
 *
 * @extends Item
 */
var TextItem = Item.extend(/** @lends TextItem# */{
	_boundsSelected: true,
	_serializeFields: {
		content: null
	},
	// TextItem doesn't make the distinction between the different bounds,
	// so use the same name for all of them
	_boundsGetter: 'getBounds',

	initialize: function TextItem(arg) {
		// Support two forms of item initialization: Passing one object literal
		// describing all the different properties to be set, or a point where
		// it should be placed (arg).
		// See if a point is passed, and if so, pass it on to base(). If not, it
		// might be a properties object literal for #setPropeties() at the end.
		var hasProperties = arg && Base.isPlainObject(arg)
				&& arg.x === undefined && arg.y === undefined;
		Item.call(this, hasProperties ? null : Point.read(arguments));
		this._content = '';
		this._lines = [];
		if (hasProperties)
			this._set(arg);
	},

	/**
	 * The text contents of the text item.
	 *
	 * @name TextItem#content
	 * @type String
	 *
	 * @example {@paperscript}
	 * // Setting the content of a PointText item:
	 *
	 * // Create a point-text item at {x: 30, y: 30}:
	 * var text = new PointText(new Point(30, 30));
	 * text.fillColor = 'black';
	 *
	 * // Set the content of the text item:
	 * text.content = 'Hello world';
	 *
	 * @example {@paperscript}
	 * // Interactive example, move your mouse over the view below:
	 *
	 * // Create a point-text item at {x: 30, y: 30}:
	 * var text = new PointText(new Point(30, 30));
	 * text.fillColor = 'black';
	 *
	 * text.content = 'Move your mouse over the view, to see its position';
	 *
	 * function onMouseMove(event) {
	 * 	// Each time the mouse is moved, set the content of
	 * 	// the point text to describe the position of the mouse:
	 * 	text.content = 'Your position is: ' + event.point.toString();
	 * }
	 */

	_clone: function _clone(copy) {
		copy.setContent(this._content);
		return _clone.base.call(this, copy);
	},

	getContent: function() {
		return this._content;
	},

	setContent: function(content) {
		this._content = '' + content;
		this._lines = this._content.split(/\r\n|\n|\r/mg);
		this._changed(69);
	},

	isEmpty: function() {
		return !this._content;
	},

	/**
	 * @private
	 * @deprecated use {@link #getStyle()} instead.
	 */
	getCharacterStyle: '#getStyle',
	setCharacterStyle: '#setStyle',

	/**
	 * @private
	 * @deprecated use {@link #getStyle()} instead.
	 */
	getParagraphStyle: '#getStyle',
	setParagraphStyle: '#setStyle'
});

/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2013, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

/**
 * @name PointText
 *
 * @class A PointText item represents a piece of typography in your Paper.js
 * project which starts from a certain point and extends by the amount of
 * characters contained in it.
 *
 * @extends TextItem
 */
var PointText = TextItem.extend(/** @lends PointText# */{
	/**
	 * Creates a point text item
	 *
	 * @name PointText#initialize
	 * @param {Point} point the position where the text will start
	 *
	 * @example {@paperscript}
	 * var text = new PointText(new Point(200, 50));
	 * text.justification = 'center';
	 * text.fillColor = 'black';
	 * text.content = 'The contents of the point text';
	 * 
	 * @example {@paperscript}
	 * // Using object notation:
	 * var text = new PointText({
	 * 	point: [50, 50],
	 * 	content: 'The contents of the point text',
	 * 	fillColor: 'black',
	 * 	fontSize: 25
	 * });
	 */
	initialize: function PointText() {
		TextItem.apply(this, arguments);
	},

	clone: function() {
		return this._clone(new PointText());
	},

	/**
	 * The PointText's anchor point
	 *
	 * @type Point
	 * @bean
	 */
	getPoint: function() {
		// Se Item#getPosition for an explanation why we create new LinkedPoint
		// objects each time.
		var point = this._matrix.getTranslation();
		return LinkedPoint.create(this, 'setPoint', point.x, point.y);
	},

	setPoint: function(point) {
		this.translate(Point.read(arguments).subtract(
				this._matrix.getTranslation()));
	},

	_draw: function(ctx) {
		if (!this._content)
			return;
		this._setStyles(ctx);
		var style = this._style,
			lines = this._lines,
			leading = style.getLeading();
		ctx.font = style.getFontStyle();
		ctx.textAlign = style.getJustification();
		for (var i = 0, l = lines.length; i < l; i++) {
			var line = lines[i];
			if (style.getFillColor())
				ctx.fillText(line, 0, 0);
			if (style.getStrokeColor())
				ctx.strokeText(line, 0, 0);
			ctx.translate(0, leading);
		}
	}
}, new function() {
	var measureCtx = null;

	return {
		_getBounds: function(getter, matrix) {
			// Create an in-memory canvas on which to do the measuring
			if (!measureCtx)
				measureCtx = CanvasProvider.getContext(1, 1);
			var style = this._style,
				lines = this._lines,
				count = lines.length,
				justification = style.getJustification(),
				leading = style.getLeading(),
				x = 0;
			// Measure the real width of the text. Unfortunately, there is no
			// sane way to measure text height with canvas
			measureCtx.font = style.getFontStyle();
			var width = 0;
			for (var i = 0; i < count; i++)
				width = Math.max(width, measureCtx.measureText(lines[i]).width);
			// Adjust for different justifications
			if (justification !== 'left')
				x -= width / (justification === 'center' ? 2: 1);
			// Until we don't have baseline measuring, assume leading / 4 as a
			// rough guess:
			var bounds = new Rectangle(x,
						count ? leading / 4 + (count - 1) * leading : 0,
						width, -count * leading);
			return matrix ? matrix._transformBounds(bounds, bounds) : bounds;
		}
	};
});


/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2013, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

/**
 * @name Color
 *
 * @class All properties and functions that expect color values in the form
 * of instances of Color objects, also accept named colors and hex values as
 * strings which are then converted to instances of
 * {@link Color} internally.
 *
 * @classexample {@paperscript}
 * // Named color values:
 *
 * // Create a circle shaped path at {x: 80, y: 50}
 * // with a radius of 30.
 * var circle = new Path.Circle(new Point(80, 50), 30);
 *
 * // Pass a color name to the fillColor property, which is internally
 * // converted to a Color.
 * circle.fillColor = 'green';
 *
 * @classexample {@paperscript}
 * // Hex color values:
 *
 * // Create a circle shaped path at {x: 80, y: 50}
 * // with a radius of 30.
 * var circle = new Path.Circle(new Point(80, 50), 30);
 *
 * // Pass a hex string to the fillColor property, which is internally
 * // converted to a Color.
 * circle.fillColor = '#ff0000';
 */
var Color = Base.extend(new function() {

	var types = {
		gray: ['gray'],
		rgb: ['red', 'green', 'blue'],
		hsb: ['hue', 'saturation', 'brightness'],
		hsl: ['hue', 'saturation', 'lightness'],
		gradient: ['gradient', 'origin', 'destination', 'highlight']
	};

	var parsers = {}, // Parsers of values for setters, by type and property
		colorCache = {},
		colorCtx;

	function nameToRGB(name) {
		var cached = colorCache[name];
		if (!cached) {
			// Use a canvas to draw to with the given name and then retrieve rgb
			// values from. Build a cache for all the used colors.
			if (!colorCtx) {
				colorCtx = CanvasProvider.getContext(1, 1);
				colorCtx.globalCompositeOperation = 'copy';
			}
			// Set the current fillStyle to transparent, so that it will be
			// transparent instead of the previously set color in case the new
			// color can not be interpreted.
			colorCtx.fillStyle = 'rgba(0,0,0,0)';
			// Set the fillStyle of the context to the passed name and fill the
			// canvas with it, then retrieve the data for the drawn pixel:
			colorCtx.fillStyle = name;
			colorCtx.fillRect(0, 0, 1, 1);
			var data = colorCtx.getImageData(0, 0, 1, 1).data;
			cached = colorCache[name] = [
				data[0] / 255,
				data[1] / 255,
				data[2] / 255
			];
		}
		return cached.slice();
	}

	function hexToRGB(string) {
		var hex = string.match(/^#?(\w{1,2})(\w{1,2})(\w{1,2})$/);
		if (hex.length >= 4) {
			var components = [0, 0, 0];
			for (var i = 0; i < 3; i++) {
				var value = hex[i + 1];
				components[i] = parseInt(value.length == 1
						? value + value : value, 16) / 255;
			}
			return components;
		}
	}

	// For hsb-rgb conversion, used to lookup the right parameters in the
	// values array.
	var hsbIndices = [
		[0, 3, 1], // 0
		[2, 0, 1], // 1
		[1, 0, 3], // 2
		[1, 2, 0], // 3
		[3, 1, 0], // 4
		[0, 1, 2]  // 5
	];

	// Calling convention for converters:
	// The components are passed as an arguments list, and returned as an array.
	// alpha is left out, because the conversion does not change it.
	var converters = {
		'rgb-hsb': function(r, g, b) {
			var max = Math.max(r, g, b),
				min = Math.min(r, g, b),
				delta = max - min,
				h = delta === 0 ? 0
					:   ( max == r ? (g - b) / delta + (g < b ? 6 : 0)
						: max == g ? (b - r) / delta + 2
						:            (r - g) / delta + 4) * 60; // max == b
			return [h, max === 0 ? 0 : delta / max, max];
		},

		'hsb-rgb': function(h, s, b) {
			var h = (h / 60) % 6, // Scale to 0..6
				i = Math.floor(h), // 0..5
				f = h - i,
				i = hsbIndices[i],
				v = [
					b,						// b, index 0
					b * (1 - s),			// p, index 1
					b * (1 - s * f),		// q, index 2
					b * (1 - s * (1 - f))	// t, index 3
				];
			return [v[i[0]], v[i[1]], v[i[2]]];
		},

		// HSL code is based on:
		// http://mjijackson.com/2008/02/rgb-to-hsl-and-rgb-to-hsv-color-model-conversion-algorithms-in-javascript
		'rgb-hsl': function(r, g, b) {
			var max = Math.max(r, g, b),
				min = Math.min(r, g, b),
				delta = max - min,
				achromatic = delta === 0,
				h = achromatic ? 0
					:   ( max == r ? (g - b) / delta + (g < b ? 6 : 0)
						: max == g ? (b - r) / delta + 2
						:            (r - g) / delta + 4) * 60, // max == b
				l = (max + min) / 2,
				s = achromatic ? 0 : l < 0.5
						? delta / (max + min)
						: delta / (2 - max - min);
			return [h, s, l];
		},

		'hsl-rgb': function(h, s, l) {
			h /= 360;
			if (s === 0)
				return [l, l, l];
			var t3s = [ h + 1 / 3, h, h - 1 / 3 ],
				t2 = l < 0.5 ? l * (1 + s) : l + s - l * s,
				t1 = 2 * l - t2,
				c = [];
			for (var i = 0; i < 3; i++) {
				var t3 = t3s[i];
				if (t3 < 0) t3 += 1;
				if (t3 > 1) t3 -= 1;
				c[i] = 6 * t3 < 1
					? t1 + (t2 - t1) * 6 * t3
					: 2 * t3 < 1
						? t2
						: 3 * t3 < 2
							? t1 + (t2 - t1) * ((2 / 3) - t3) * 6
							: t1;
			}
			return c;
		},

		'rgb-gray': function(r, g, b) {
			// Using the standard NTSC conversion formula that is used for
			// calculating the effective luminance of an RGB color:
			// http://www.mathworks.com/support/solutions/en/data/1-1ASCU/index.html?solution=1-1ASCU
			return [r * 0.2989 + g * 0.587 + b * 0.114];
		},

		'gray-rgb': function(g) {
			return [g, g, g];
		},

		'gray-hsb': function(g) {
			return [0, 0, g];
		},

		'gray-hsl': function(g) {
			// TODO: Is lightness really the same as brightness for gray?
			return [0, 0, g];
		},

		'gradient-rgb': function(gradient) {
			// TODO: Implement
			return [];
		},

		'rgb-gradient': function(r, g, b) {
			// TODO: Implement
			return [];
		}

	};

	// Produce getters and setter methods for the various color components known
	// by the different color types. Requesting any of these components on any
	// color internally converts the color to the required type and then returns
	// its component.
	return Base.each(types, function(properties, type) {
		// Keep track of parser functions per type.
		parsers[type] = [];
		Base.each(properties, function(name, index) {
			var part = Base.capitalize(name),
				// Both hue and saturation have overlapping properties between
				// hsb and hsl. Handle this here separately, by testing for
				// overlaps and skipping conversion if the type is /hs[bl]/
				hasOverlap = /^(hue|saturation)$/.test(name),
				// Produce value parser function for the given type / propeprty
				// name combination.
				parser = parsers[type][index] = name === 'gradient'
					? function(value) {
						var current = this._components[0];
						value = Gradient.read(
								Array.isArray(value) ? value : arguments,
								0, 0, false, true); // readNull
						if (current !== value) {
							if (current)
								current._removeOwner(this);
							if (value)
								value._addOwner(this);
						}
						return value;
					}
					: name === 'hue'
						? function(value) {
							// Keep negative values within modulo 360 too:
							return isNaN(value) ? 0
									: ((value % 360) + 360) % 360;
						}
						: type === 'gradient'
							? function(value) {
								// ..., clone, readNull);
								return Point.read(arguments, 0, 0, true,
										name === 'highlight');
							}
							: function(value) {
								return isNaN(value) ? 0
										: Math.min(Math.max(value, 0), 1);
							};

			this['get' + part] = function() {
				return this._type === type
					|| hasOverlap && /^hs[bl]$/.test(this._type)
						? this._components[index]
						: this._convert(type)[index];
			};

			this['set' + part] = function(value) {
				// Convert to the requrested type before setting the value
				if (this._type !== type
						&& !(hasOverlap && /^hs[bl]$/.test(this._type))) {
					this._components = this._convert(type);
					this._type = type;
				}
				value = parser.call(this, value);
				if (value != null) {
					this._components[index] = value;
					this._changed();
				}
			};
		}, this);
	}, /** @lends Color# */{
		// Tell Base.read that the Point constructor supports reading with index
		_readIndex: true,

		/**
		 * Creates a RGB Color object
		 *
		 * @name Color#initialize
		 * @param {Number} red the amount of red in the color as a value
		 * between {@code 0} and {@code 1}
		 * @param {Number} green the amount of green in the color as a value
		 * between {@code 0} and {@code 1}
		 * @param {Number} blue the amount of blue in the color as a value
		 * between {@code 0} and {@code 1}
		 * @param {Number} [alpha] the alpha of the color as a value between
		 * {@code 0} and {@code 1}
		 *
		 * @example {@paperscript}
		 * // Creating a RGB Color:
		 *
		 * // Create a circle shaped path at {x: 80, y: 50}
		 * // with a radius of 30:
		 * var circle = new Path.Circle(new Point(80, 50), 30);
		 *
		 * // 100% red, 0% blue, 50% blue:
		 * circle.fillColor = new Color(1, 0, 0.5);
		 */
		/**
		 * Creates a GrayColor object
		 *
		 * @name Color#initialize
		 * @param {Number} gray the amount of gray in the color as a value
		 * between {@code 0} and {@code 1}
		 * @param {Number} [alpha] the alpha of the color as a value between
		 * {@code 0} and {@code 1}
		 *
		 * @example {@paperscript}
		 * // Creating a gray Color:
		 *
		 * // Create a circle shaped path at {x: 80, y: 50}
		 * // with a radius of 30:
		 * var circle = new Path.Circle(new Point(80, 50), 30);
		 *
		 * // Create a GrayColor with 50% gray:
		 * circle.fillColor = new Color(0.5);
		 */
		/**
		 * Creates a gradient color object.
		 *
		 * @name Color#initialize
		 * @param {Gradient} gradient
		 * @param {Point} origin
		 * @param {Point} destination
		 * @param {Point} [highlight]
		 *
		 * @example {@paperscript height=200}
		 * // Applying a linear gradient color containing evenly distributed
		 * // color stops:
		 *
		 * // Define two points which we will be using to construct
		 * // the path and to position the gradient color:
		 * var topLeft = view.center - [80, 80];
		 * var bottomRight = view.center + [80, 80];
		 *
		 * // Create a rectangle shaped path between
		 * // the topLeft and bottomRight points:
		 * var path = new Path.Rectangle(topLeft, bottomRight);
		 *
		 * // Create the gradient, passing it an array of colors to be converted
		 * // to evenly distributed color stops:
		 * var gradient = new Gradient(['yellow', 'red', 'blue']);
		 *
		 * // Have the gradient color run between the topLeft and
		 * // bottomRight points we defined earlier:
		 * var gradientColor = new Color(gradient, topLeft, bottomRight);
		 *
		 * // Set the fill color of the path to the gradient color:
		 * path.fillColor = gradientColor;
		 *
		 * @example {@paperscript height=200}
		 * // Applying a radial gradient color containing unevenly distributed
		 * // color stops:
		 *
		 * // Create a circle shaped path at the center of the view
		 * // with a radius of 80:
		 * var path = new Path.Circle({
		 * 	center: view.center,
		 * 	radius: 80
		 * });
		 *
		 * // The stops array: yellow mixes with red between 0 and 15%,
		 * // 15% to 30% is pure red, red mixes with black between 30% to 100%:
		 * var stops = [['yellow', 0], ['red', 0.15], ['red', 0.3], ['black', 0.9]];
		 *
		 * // Create a radial gradient using the color stops array:
		 * var gradient = new Gradient(stops, true);
		 *
		 * // We will use the center point of the circle shaped path as
		 * // the origin point for our gradient color
		 * var from = path.position;
		 *
		 * // The destination point of the gradient color will be the
		 * // center point of the path + 80pt in horizontal direction:
		 * var to = path.position + [80, 0];
		 *
		 * // Create the gradient color:
		 * var gradientColor = new Color(gradient, from, to);
		 *
		 * // Set the fill color of the path to the gradient color:
		 * path.fillColor = gradientColor;
		 */
		// DOCS: Fix HSB Color documentation
		/**
		 * Creates an HSB Color object
		 *
		 * @name Color#initialize
		 * @param {Number} hue the hue of the color as a value in degrees between
		 * {@code 0} and {@code 360}.
		 * @param {Number} saturation the saturation of the color as a value
		 * between {@code 0} and {@code 1}
		 * @param {Number} brightness the brightness of the color as a value
		 * between {@code 0} and {@code 1}
		 * @param {Number} [alpha] the alpha of the color as a value between
		 * {@code 0} and {@code 1}
		 *
		 * @example {@paperscript}
		 * // Creating an HSB Color:
		 *
		 * // Create a circle shaped path at {x: 80, y: 50}
		 * // with a radius of 30:
		 * var circle = new Path.Circle(new Point(80, 50), 30);
		 *
		 * // Create an HSB Color with a hue of 90 degrees, a saturation
		 * // 100% and a brightness of 100%:
		 * circle.fillColor = { hue: 90, saturation: 1, brightness: 1 };
		 */
		// DOCS: Fix HSL Color documentation
		/**
		 * Creates a HSL Color object
		 *
		 * @name Color#initialize
		 * @param {Number} hue the hue of the color as a value in degrees between
		 * {@code 0} and {@code 360}.
		 * @param {Number} saturation the saturation of the color as a value
		 * between {@code 0} and {@code 1}
		 * @param {Number} lightness the lightness of the color as a value
		 * between {@code 0} and {@code 1}
		 * @param {Number} [alpha] the alpha of the color as a value between
		 * {@code 0} and {@code 1}
		 *
		 * @example {@paperscript}
		 * // Creating a HSL Color:
		 *
		 * // Create a circle shaped path at {x: 80, y: 50}
		 * // with a radius of 30:
		 * var circle = new Path.Circle(new Point(80, 50), 30);
		 *
		 * // Create an HslColor with a hue of 90 degrees, a saturation
		 * // 100% and a lightness of 50%:
		 * circle.fillColor = { hue: 90, saturation: 1, lightness: 0.5 };
		 */
		initialize: function Color(arg) {
			// We are storing color internally as an array of components
			var slice = Array.prototype.slice,
				args = arguments,
				read = 0,
				type,
				components,
				alpha,
				values;
			// If first argument is an array, replace arguments with it.
			if (Array.isArray(arg)) {
				args = arg;
				arg = args[0];
			}
			// First see if it's a type string argument, and if so, set it and
			// shift it out of the arguments list.
			var argType = arg != null && typeof arg;
			if (argType === 'string' && arg in types) {
				type = arg;
				arg = args[1];
				if (Array.isArray(arg)) {
					// Internal constructor that is called with the following
					// arguments, without parsing: (type, componets, alpha)
					components = arg;
					alpha = args[2];
				} else {
					// For deserialization, shift out and process normally.
					if (this._read)
						read = 1; // Will be increased below
					// Shift type out of the arguments, and process normally.
					args = slice.call(args, 1);
					argType = typeof arg;
				}
			}
			if (!components) {
				// Determine if there is a values array
				values = argType === 'number'
						? args
						// Do not use Array.isArray() to also support arguments
						: argType === 'object' && arg.length != null
							? arg
							: null;
				// The various branches below produces a values array if the
				// values still need parsing, and a components array if they are
				// already parsed.
				if (values) {
					if (!type)
						// type = values.length >= 4
						// 		? 'cmyk'
						// 		: values.length >= 3
						type = values.length >= 3
								? 'rgb'
								: 'gray';
					var length = types[type].length;
					alpha = values[length];
					if (this._read)
						read += values === arguments
							? length + (alpha != null ? 1 : 0)
							: 1;
					if (values.length > length)
						values = slice.call(values, 0, length);
				} else if (argType === 'string') {
					components = arg.match(/^#[0-9a-f]{3,6}$/i)
							? hexToRGB(arg)
							: nameToRGB(arg);
					type = 'rgb';
				} else if (argType === 'object') {
					if (arg.constructor === Color) {
						type = arg._type;
						components = arg._components.slice();
						alpha = arg._alpha;
						if (type === 'gradient') {
							// Clone all points, since they belong to the other
							// color already.
							for (var i = 1, l = components.length; i < l; i++) {
								var point = components[i];
								if (point)
									components[i] = point.clone();
							}
						}
					} else if (arg.constructor === Gradient) {
						type = 'gradient';
						values = args;
					} else {
						// Determine type by presence of object property names
						type = 'hue' in arg
							? 'lightness' in arg
								? 'hsl'
								: 'hsb'
							: 'gradient' in arg || 'stops' in arg
									|| 'radial' in arg
								? 'gradient'
								: 'gray' in arg
									? 'gray'
									: 'rgb';
						// Convert to array and parse in one loop, for efficiency
						var properties = types[type];
							parse = parsers[type];
						this._components = components = [];
						for (var i = 0, l = properties.length; i < l; i++) {
							var value = arg[properties[i]];
							// Allow implicit definition of gradients through
							// stops / radial properties. Conversion happens
							// here on the fly:
							if (value == null && i === 0 && type === 'gradient'
									&& 'stops' in arg) {
								value = {
									stops: arg.stops,
									radial: arg.radial
								};
							}
							value = parse[i].call(this, value);
							if (value != null)
								components[i] = value;
						}
						alpha = arg.alpha;
					}
				}
				if (this._read && type)
					read = 1;
			}
			// Default fallbacks: rgb, black
			this._type = type || 'rgb';
			// Define this gradient Color's unique id.
			if (type === 'gradient')
				this._id = Color._id = (Color._id || 0) + 1;
			if (!components) {
				// Produce a components array now, and parse values. Even if no
				// values are defined, parsers are still called to produce
				// defaults.
				this._components = components = [];
				var parse = parsers[this._type];
				for (var i = 0, l = parse.length; i < l; i++) {
					var value = parse[i].call(this, values && values[i]);
					if (value != null)
						components[i] = value;
				}
			}
			this._components = components;
			this._alpha = alpha;
			if (this._read)
				this._read = read;
		},

		_serialize: function(options, dictionary) {
			var components = this.getComponents();
			return Base.serialize(
					// We can ommit the type for gray and rgb:
					/^(gray|rgb)$/.test(this._type)
						? components
						: [this._type].concat(components),
					options, true, dictionary);
		},

		/**
		 * Called by various setters whenever a color value changes
		 */
		_changed: function() {
			this._canvasStyle = null;
			if (this._owner)
				this._owner._changed(17);
		},

		/**
		 * @return {Color} a copy of the color object
		 */
		clone: function() {
			return new Color(this._type, this._components.slice(), this._alpha);
		},

		/**
		 * @return {Number[]} the converted components as an array.
		 */
		_convert: function(type) {
			var converter;
			return this._type === type
					? this._components.slice()
					: (converter = converters[this._type + '-' + type])
						? converter.apply(this, this._components)
						// Convert to and from rgb if no direct converter exists
						: converters['rgb-' + type].apply(this,
							converters[this._type + '-rgb'].apply(this,
									this._components));
		},

		convert: function(type) {
			return new Color(type, this._convert(type), this._alpha);
		},

		/**
		 * The type of the color as a string.
		 *
		 * @type String('rgb', 'hsb', 'gray')
		 * @bean
		 *
		 * @example
		 * var color = new Color(1, 0, 0);
		 * console.log(color.type); // 'rgb'
		 */
		getType: function() {
			return this._type;
		},

		setType: function(type) {
			this._components = this._convert(type);
			this._type = type;
		},

		getComponents: function() {
			var components = this._components.slice();
			if (this._alpha != null)
				components.push(this._alpha);
			return components;
		},

		/**
		 * The color's alpha value as a number between {@code 0} and {@code 1}.
		 * All colors of the different subclasses support alpha values.
		 *
		 * @type Number
		 * @bean
		 *
		 * @example {@paperscript}
		 * // A filled path with a half transparent stroke:
		 * var circle = new Path.Circle(new Point(80, 50), 30);
		 *
		 * // Fill the circle with red and give it a 20pt green stroke:
		 * circle.style = {
		 * 	fillColor: 'red',
		 * 	strokeColor: 'green',
		 * 	strokeWidth: 20
		 * };
		 *
		 * // Make the stroke half transparent:
		 * circle.strokeColor.alpha = 0.5;
		 */
		getAlpha: function() {
			return this._alpha != null ? this._alpha : 1;
		},

		setAlpha: function(alpha) {
			this._alpha = alpha == null ? null : Math.min(Math.max(alpha, 0), 1);
			this._changed();
		},

		/**
		 * Checks if the color has an alpha value.
		 *
		 * @return {Boolean} {@true if the color has an alpha value}
		 */
		hasAlpha: function() {
			return this._alpha != null;
		},

		/**
		 * Checks if the component color values of the color are the
		 * same as those of the supplied one.
		 *
		 * @param {Color} color the color to compare with
		 * @return {Boolean} {@true if the colors are the same}
		 */
		equals: function(color) {
			return color && this._type === color._type
					&& this._alpha === color._alpha
					&& Base.equals(this._components, color._components);
		},

		/**
		 * {@grouptitle String Representations}
		 * @return {String} A string representation of the color.
		 */
		toString: function() {
			var properties = types[this._type],
				parts = [],
				isGradient = this._type === 'gradient',
				f = Formatter.instance;
			for (var i = 0, l = properties.length; i < l; i++) {
				var value = this._components[i];
				if (value != null)
					parts.push(properties[i] + ': '
							+ (isGradient ? value : f.number(value)));
			}
			if (this._alpha != null)
				parts.push('alpha: ' + f.number(this._alpha));
			return '{ ' + parts.join(', ') + ' }';
		},

		/**
		 * @return {String} A css string representation of the color.
		 */
		toCss: function(noAlpha) {
			var components = this._convert('rgb'),
				alpha = noAlpha || this._alpha == null ? 1 : this._alpha;
			components = [
				Math.round(components[0] * 255),
				Math.round(components[1] * 255),
				Math.round(components[2] * 255)
			];
			if (alpha < 1)
				components.push(alpha);
			return (components.length == 4 ? 'rgba(' : 'rgb(')
					+ components.join(', ') + ')';
		},

		toCanvasStyle: function(ctx) {
			if (this._canvasStyle)
				return this._canvasStyle;
			// Normal colors are simply represented by their css string.
			if (this._type !== 'gradient')
				return this._canvasStyle = this.toCss();
			// Gradient code form here onwards
			var components = this._components,
				gradient = components[0],
				stops = gradient._stops,
				origin = components[1],
				destination = components[2],
				canvasGradient;
			if (gradient._radial) {
				var radius = destination.getDistance(origin),
					highlight = components[3];
				if (highlight) {
					var vector = highlight.subtract(origin);
					if (vector.getLength() > radius)
						highlight = origin.add(vector.normalize(radius - 0.1));
				}
				var start = highlight || origin;
				canvasGradient = ctx.createRadialGradient(start.x, start.y,
						0, origin.x, origin.y, radius);
			} else {
				canvasGradient = ctx.createLinearGradient(origin.x, origin.y,
						destination.x, destination.y);
			}
			for (var i = 0, l = stops.length; i < l; i++) {
				var stop = stops[i];
				canvasGradient.addColorStop(stop._rampPoint,
						stop._color.toCanvasStyle());
			}
			return this._canvasStyle = canvasGradient;
		},

		/**
		 * Transform the gradient color by the specified matrix.
		 *
		 * @param {Matrix} matrix the matrix to transform the gradient color by
		 */
		transform: function(matrix) {
			if (this._type === 'gradient') {
				var components = this._components;
				for (var i = 1, l = components.length; i < l; i++) {
					var point = components[i];
					matrix._transformPoint(point, point, true);
				}
				this._changed();
			}
		},

		/**
		 * {@grouptitle RGB Components}
		 *
		 * The amount of red in the color as a value between {@code 0} and
		 * {@code 1}.
		 *
		 * @name Color#red
		 * @property
		 * @type Number
		 *
		 * @example {@paperscript}
		 * // Changing the amount of red in a color:
		 * var circle = new Path.Circle(new Point(80, 50), 30);
		 * circle.fillColor = 'blue';
		 *
		 * // Blue + red = purple:
		 * circle.fillColor.red = 1;
		 */

		/**
		 * The amount of green in the color as a value between {@code 0} and
		 * {@code 1}.
		 *
		 * @name Color#green
		 * @property
		 * @type Number
		 *
		 * @example {@paperscript}
		 * // Changing the amount of green in a color:
		 * var circle = new Path.Circle(new Point(80, 50), 30);
		 *
		 * // First we set the fill color to red:
		 * circle.fillColor = 'red';
		 *
		 * // Red + green = yellow:
		 * circle.fillColor.green = 1;
		 */

		/**
		 * The amount of blue in the color as a value between {@code 0} and
		 * {@code 1}.
		 *
		 * @name Color#blue
		 * @property
		 * @type Number
		 *
		 * @example {@paperscript}
		 * // Changing the amount of blue in a color:
		 * var circle = new Path.Circle(new Point(80, 50), 30);
		 *
		 * // First we set the fill color to red:
		 * circle.fillColor = 'red';
		 *
		 * // Red + blue = purple:
		 * circle.fillColor.blue = 1;
		 */

		/**
		 * {@grouptitle Gray Components}
		 *
		 * The amount of gray in the color as a value between {@code 0} and
		 * {@code 1}.
		 *
		 * @name Color#gray
		 * @property
		 * @type Number
		 */

		/**
		 * {@grouptitle HSB Components}
		 *
		 * The hue of the color as a value in degrees between {@code 0} and
		 * {@code 360}.
		 *
		 * @name Color#hue
		 * @property
		 * @type Number
		 *
		 * @example {@paperscript}
		 * // Changing the hue of a color:
		 * var circle = new Path.Circle(new Point(80, 50), 30);
		 * circle.fillColor = 'red';
		 * circle.fillColor.hue += 30;
		 *
		 * @example {@paperscript}
		 * // Hue cycling:
		 *
		 * // Create a rectangle shaped path, using the dimensions
		 * // of the view:
		 * var path = new Path.Rectangle(view.bounds);
		 * path.fillColor = 'red';
		 *
		 * function onFrame(event) {
		 * 	path.fillColor.hue += 0.5;
		 * }
		 */

		/**
		 * The saturation of the color as a value between {@code 0} and {@code 1}.
		 *
		 * @name Color#saturation
		 * @property
		 * @type Number
		 */

		/**
		 * The brightness of the color as a value between {@code 0} and {@code 1}.
		 *
		 * @name Color#brightness
		 * @property
		 * @type Number
		 */

		/**
		 * {@grouptitle HSL Components}
		 *
		 * The lightness of the color as a value between {@code 0} and {@code 1}.
		 *
		 * @name Color#lightness
		 * @property
		 * @type Number
		 */

		/**
		 * {@grouptitle Gradient Components}
		 *
		 * The gradient object describing the type of gradient and the stops.
		 *
		 * @name Color#gradient
		 * @property
		 * @type Gradient
		 */

		/* The origin point of the gradient.
		 *
		 * @name Color#origin
		 * @property
		 * @type Point
		 *
		 * @example {@paperscript height=200}
		 * // Move the origin point of the gradient, by moving your mouse over
		 * // the view below:
		 *
		 * // Create a rectangle shaped path with the same dimensions as
		 * // that of the view and fill it with a gradient color:
		 * var path = new Path.Rectangle(view.bounds);
		 * var gradient = new Gradient(['yellow', 'red', 'blue']);
		 *
		 * // Have the gradient color run from the top left point of the view,
		 * // to the bottom right point of the view:
		 * var from = view.bounds.topLeft;
		 * var to = view.bounds.bottomRight;
		 * var gradientColor = new Color(gradient, from, to);
		 * path.fillColor = gradientColor;
		 *
		 * function onMouseMove(event) {
		 * 	// Set the origin point of the path's gradient color
		 * 	// to the position of the mouse:
		 * 	path.fillColor.origin = event.point;
		 * }
		 */

		/*
		 * The destination point of the gradient.
		 *
		 * @name Color#destination
		 * @property
		 * @type Point
		 *
		 * @example {@paperscript height=300}
		 * // Move the destination point of the gradient, by moving your mouse over
		 * // the view below:
		 *
		 * // Create a circle shaped path at the center of the view,
		 * // using 40% of the height of the view as its radius
		 * // and fill it with a radial gradient color:
		 * var path = new Path.Circle({
		 * 	center: view.center,
		 * 	radius: view.bounds.height * 0.4
		 * });
		 *
		 * var gradient = new Gradient(['yellow', 'red', 'black'], true);
		 * var from = view.center;
		 * var to = view.bounds.bottomRight;
		 * var gradientColor = new Color(gradient, from, to);
		 * path.fillColor = gradientColor;
		 *
		 * function onMouseMove(event) {
		 * 	// Set the origin point of the path's gradient color
		 * 	// to the position of the mouse:
		 * 	path.fillColor.destination = event.point;
		 * }
		 */

		/**
		 * The highlight point of the gradient.
		 *
		 * @name Color#highlight
		 * @property
		 * @type Point
		 *
		 * @example {@paperscript height=300}
		 * // Create a circle shaped path at the center of the view,
		 * // using 40% of the height of the view as its radius
		 * // and fill it with a radial gradient color:
		 * var path = new Path.Circle({
		 * 	center: view.center,
		 * 	radius: view.bounds.height * 0.4
		 * });
		 * 
		 * path.fillColor = {
		 * 	gradient: {
		 * 		stops: ['yellow', 'red', 'black'],
		 * 		radial: true
		 * 	},
		 * 	origin: path.position,
		 * 	destination: path.bounds.rightCenter
		 * };
		 * 
		 * function onMouseMove(event) {
		 * 	// Set the origin highlight of the path's gradient color
		 * 	// to the position of the mouse:
		 * 	path.fillColor.highlight = event.point;
		 * }
		 */

		statics: /** @lends Color */{
			// Export for backward compatibility code below.
			_types: types,

			random: function() {
				var random = Math.random;
				return new Color(random(), random(), random());
			}
		}
	});
});

// Expose Color.RGB, etc. constructors, as well as RgbColor, RGBColor, etc.for
// backward compatibility.
Base.each(Color._types, function(properties, type) {
	var ctor = this[Base.capitalize(type) + 'Color'] = function(arg) {
			var argType = arg != null && typeof arg,
				components = argType === 'object' && arg.length != null
					? arg
					: argType === 'string'
						? null
						: arguments;
			return components
					? new Color(type, components)
					: new Color(arg);
		};
	if (type.length == 3) {
		var acronym = type.toUpperCase();
		Color[acronym] = this[acronym + 'Color'] = ctor;
	}
}, this);

/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2013, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

/**
 * @name Gradient
 *
 * @class The Gradient object.
 * 
 * @classexample {@paperscript height=300}
 * // Applying a linear gradient color containing evenly distributed
 * // color stops:
 *
 * // Define two points which we will be using to construct
 * // the path and to position the gradient color:
 * var topLeft = view.center - [80, 80];
 * var bottomRight = view.center + [80, 80];
 * 
 * // Create a rectangle shaped path between
 * // the topLeft and bottomRight points:
 * var path = new Path.Rectangle(topLeft, bottomRight);
 * 
 * // Fill the path with a gradient of three evenly divided color stops
 * // that runs between the two points we defined earlier:
 * path.fillColor = {
 * 	gradient: {
 * 		stops: ['yellow', 'red', 'blue']
 * 	},
 * 	origin: topLeft,
 * 	destination: bottomRight
 * };
 * 
 * @classexample {@paperscript height=300}
 * // Create a circle shaped path at the center of the view,
 * // using 40% of the height of the view as its radius
 * // and fill it with a radial gradient color:
 * var path = new Path.Circle({
 * 	center: view.center,
 * 	radius: view.bounds.height * 0.4
 * });
 * 
 * // Fill the path with a radial gradient color with three stops:
 * // yellow from 0% to 5%, mix between red from 5% to 20%,
 * // mix between red and black from 20% to 100%:
 * path.fillColor = {
 * 	gradient: {
 * 		stops: [['yellow', 0.05], ['red', 0.2], ['black', 1]],
 * 		radial: true
 * 	},
 * 	origin: path.position,
 * 	destination: path.bounds.rightCenter
 * };
 */
var Gradient = Base.extend(/** @lends Gradient# */{
	// DOCS: Document #initialize()
	initialize: function Gradient(stops, radial) {
		// Define this Gradient's unique id.
		this._id = Gradient._id = (Gradient._id || 0) + 1;
		if (stops && this._set(stops))
			stops = radial = null;
		if (!this._stops)
			this.setStops(stops || ['white', 'black']);
		if (this._radial == null)
			// Support old string type argument and new radial boolean.
			this.setRadial(typeof radial === 'string' && radial === 'radial'
					|| radial || false);
	},

	_serialize: function(options, dictionary) {
		return dictionary.add(this, function() {
			return Base.serialize([this._stops, this._radial],
					options, true, dictionary);
		});
	},

	/**
	 * Called by various setters whenever a gradient value changes
	 */
	_changed: function() {
		// Loop through the gradient-colors that use this gradient and notify
		// them, so they can notify the items they belong to.
		for (var i = 0, l = this._owners && this._owners.length; i < l; i++)
			this._owners[i]._changed();
	},

	/**
	 * Called by Color#setGradient()
	 * This is required to pass on _changed() notifications to the _owners.
	 */
	_addOwner: function(color) {
		if (!this._owners)
			this._owners = [];
		this._owners.push(color);
	},

	/**
	 * Called by Color whenever this gradient stops being used.
	 */
	_removeOwner: function(color) {
		var index = this._owners ? this._owners.indexOf(color) : -1;
		if (index != -1) {
			this._owners.splice(index, 1);
			if (this._owners.length === 0)
				delete this._owners;
		}
	},

	/**
	 * @return {Gradient} a copy of the gradient
	 */
	clone: function() {
		var stops = [];
		for (var i = 0, l = this._stops.length; i < l; i++)
			stops[i] = this._stops[i].clone();
		return new this.constructor(stops);
	},

	/**
	 * The gradient stops on the gradient ramp.
	 *
	 * @type GradientStop[]
	 * @bean
	 */
	getStops: function() {
		return this._stops;
	},

	setStops: function(stops) {
		// If this gradient already contains stops, first remove
		// this gradient as their owner.
		if (this.stops) {
			for (var i = 0, l = this._stops.length; i < l; i++)
				delete this._stops[i]._owner;
		}
		if (stops.length < 2)
			throw new Error(
					'Gradient stop list needs to contain at least two stops.');
		this._stops = GradientStop.readAll(stops, 0, true); // clone
		// Now reassign ramp points if they were not specified.
		for (var i = 0, l = this._stops.length; i < l; i++) {
			var stop = this._stops[i];
			stop._owner = this;
			if (stop._defaultRamp)
				stop.setRampPoint(i / (l - 1));
		}
		this._changed();
	},

	/**
	 * Specifies whether the gradient is radial or linear.
	 *
	 * @type Boolean
	 * @bean
	 */
	getRadial: function() {
		return this._radial;
	},

	setRadial: function(radial) {
		this._radial = radial;
		this._changed();
	},

	/**
	 * Checks whether the gradient is equal to the supplied gradient.
	 *
	 * @param {Gradient} gradient
	 * @return {Boolean} {@true they are equal}
	 */
	equals: function(gradient) {
		if (gradient && gradient.constructor == this.constructor
				&& this._stops.length == gradient._stops.length) {
			for (var i = 0, l = this._stops.length; i < l; i++) {
				if (!this._stops[i].equals(gradient._stops[i]))
					return false;
			}
			return true;
		}
		return false;
	}
});

/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2013, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

// TODO: Support midPoint? (initial tests didn't look nice)
/**
 * @name GradientStop
 *
 * @class The GradientStop object.
 */
var GradientStop = Base.extend(/** @lends GradientStop# */{
	/**
	 * Creates a GradientStop object.
	 *
	 * @param {Color} [color=new Color(0, 0, 0)] the color of the stop
	 * @param {Number} [rampPoint=0] the position of the stop on the gradient
	 *                               ramp as a value between 0 and 1.
	 */
	initialize: function GradientStop(arg0, arg1) {
		if (arg0) {
			var color, rampPoint;
			if (arg1 === undefined && Array.isArray(arg0)) {
				// [color, rampPoint]
				color = arg0[0];
				rampPoint = arg0[1];
			} else if (arg0.color) {
				// stop
				color = arg0.color;
				rampPoint = arg0.rampPoint;
			} else {
				// color, rampPoint
				color = arg0;
				rampPoint = arg1;
			}
			this.setColor(color);
			this.setRampPoint(rampPoint);
		}
	},

	// TODO: Do we really need to also clone the color here?
	/**
	 * @return {GradientStop} a copy of the gradient-stop
	 */
	clone: function() {
		return new GradientStop(this._color.clone(), this._rampPoint);
	},

	_serialize: function(options, dictionary) {
		return Base.serialize([this._color, this._rampPoint], options, true, 
				dictionary);
	},

	/**
	 * Called by various setters whenever a value changes
	 */
	_changed: function() {
		// Loop through the gradients that use this stop and notify them about
		// the change, so they can notify their gradient colors, which in turn
		// will notify the items they are used in:
		if (this._owner)
			this._owner._changed(17);
	},

	/**
	 * The ramp-point of the gradient stop as a value between {@code 0} and
	 * {@code 1}.
	 *
	 * @type Number
	 * @bean
	 *
	 * @example {@paperscript height=300}
	 * // Animating a gradient's ramp points:
	 *
	 * // Create a circle shaped path at the center of the view,
	 * // using 40% of the height of the view as its radius
	 * // and fill it with a radial gradient color:
	 * var path = new Path.Circle({
	 * 	center: view.center,
	 * 	radius: view.bounds.height * 0.4
	 * });
	 * 
	 * path.fillColor = {
	 * 	gradient: {
	 * 		stops: [['yellow', 0.05], ['red', 0.2], ['black', 1]],
	 * 		radial: true
	 * 	},
	 * 	origin: path.position,
	 * 	destination: path.bounds.rightCenter
	 * };
	 * 
	 * var gradient = path.fillColor.gradient;
	 * 
	 * // This function is called each frame of the animation:
	 * function onFrame(event) {
	 * 	var blackStop = gradient.stops[2];
	 * 	// Animate the rampPoint between 0.7 and 0.9:
	 * 	blackStop.rampPoint = Math.sin(event.time * 5) * 0.1 + 0.8;
	 * 
	 * 	// Animate the rampPoint between 0.2 and 0.4
	 * 	var redStop = gradient.stops[1];
	 * 	redStop.rampPoint = Math.sin(event.time * 3) * 0.1 + 0.3;
	 * }
	 */
	getRampPoint: function() {
		return this._rampPoint;
	},

	setRampPoint: function(rampPoint) {
		this._defaultRamp = rampPoint == null;
		this._rampPoint = rampPoint || 0;
		this._changed();
	},

	/**
	 * The color of the gradient stop.
	 *
	 * @type Color
	 * @bean
	 *
	 * @example {@paperscript height=300}
	 * // Animating a gradient's ramp points:
	 *
	 * // Create a circle shaped path at the center of the view,
	 * // using 40% of the height of the view as its radius
	 * // and fill it with a radial gradient color:
	 * var path = new Path.Circle({
	 * 	center: view.center,
	 * 	radius: view.bounds.height * 0.4
	 * });
	 * 
	 * path.fillColor = {
	 * 	gradient: {
	 * 		stops: [['yellow', 0.05], ['red', 0.2], ['black', 1]],
	 * 		radial: true
	 * 	},
	 * 	origin: path.position,
	 * 	destination: path.bounds.rightCenter
	 * };
	 * 
	 * var redStop = path.fillColor.gradient.stops[1];
	 * var blackStop = path.fillColor.gradient.stops[2];
	 * 
	 * // This function is called each frame of the animation:
	 * function onFrame(event) {
	 * 	// Animate the rampPoint between 0.7 and 0.9:
	 * 	blackStop.rampPoint = Math.sin(event.time * 5) * 0.1 + 0.8;
	 * 
	 * 	// Animate the rampPoint between 0.2 and 0.4
	 * 	redStop.rampPoint = Math.sin(event.time * 3) * 0.1 + 0.3;
	 * }
	 */
	getColor: function() {
		return this._color;
	},

	setColor: function(color) {
		// Make sure newly set colors are cloned, since they can only have
		// one owner.
		this._color = Color.read(arguments);
		if (this._color === color)
			this._color = color.clone();
		this._color._owner = this;
		this._changed();
	},

	equals: function(stop) {
		return stop == this || stop instanceof GradientStop
				&& this._color.equals(stop._color)
				&& this._rampPoint == stop._rampPoint;
	}
});

/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2013, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

/**
 * @name Style
 *
 * @class Style is used for changing the visual styles of items
 * contained within a Paper.js project and is returned by
 * {@link Item#style} and {@link Project#currentStyle}.
 *
 * All properties of Style are also reflected directly in {@link Item},
 * i.e.: {@link Item#fillColor}.
 *
 * To set multiple style properties in one go, you can pass an object to
 * {@link Item#style}. This is a convenient way to define a style once and
 * apply it to a series of items:
 *
 * @classexample {@paperscript} // Styling paths
 *
 * var path = new Path.Circle(new Point(80, 50), 30);
 * path.style = {
 * 	fillColor: new Color(1, 0, 0),
 * 	strokeColor: 'black',
 * 	strokeWidth: 5
 * };
 *
 * @classexample {@paperscript} // Styling text items
 * var text = new PointText(view.center);
 * text.content = 'Hello world.';
 * text.style = {
 * 	fontSize: 20,
 * 	fillColor: 'red',
 * 	justification: 'center'
 * };
 * 
 * @classexample {@paperscript} // Styling groups
 * var path1 = new Path.Circle({
 * 	center: [100, 50],
 * 	radius: 30
 * });
 * 
 * var path2 = new Path.Rectangle({
 * 	from: [170, 20],
 * 	to: [230, 80]
 * });
 * 
 * var group = new Group(path1, path2);
 * 
 * // All styles set on a group are automatically
 * // set on the children of the group:
 * group.style = {
 * 	strokeColor: 'black',
 * 	dashArray: [4, 10],
 * 	strokeWidth: 4,
 * 	strokeCap: 'round'
 * };
 * 
 */
var Style = Base.extend(new function() {
	// windingRule / resolution / fillOverprint / strokeOverprint are currently
	// not supported.
	var defaults = {
		// path styles
		fillColor: undefined,
		strokeColor: undefined,
		strokeWidth: 1,
		strokeCap: 'butt',
		strokeJoin: 'miter',
		miterLimit: 10,
		dashOffset: 0,
		dashArray: [],
		// character styles
		font: 'sans-serif',
		fontSize: 12,
		leading: null,
		// paragraph styles
		justification: 'left'
	};

	var flags = {
		strokeWidth: 25,
		strokeCap: 25,
		strokeJoin: 25,
		miterLimit: 25,
		font: 5,
		fontSize: 5,
		leading: 5,
		justification: 5
	};

	var item = {},
		fields = {
			_defaults: defaults,
			// Override default fillColor for text items
			_textDefaults: Base.merge(defaults, {
				fillColor: new Color() // black
			})
		};

	Base.each(defaults, function(value, key) {
		var isColor = /Color$/.test(key),
			part = Base.capitalize(key),
			flag = flags[key],
			set = 'set' + part,
			get = 'get' + part;

		// Define getters and setters to be injected into this class.
		// This is how style values are handled:
		// - Style values are all stored in this._values
		// - The style object starts with an empty _values object, with fallback
		//   on _defaults through code in the getter below.
		// - Only the styles that are explicitely set on the object get defined
		//   in _values.
		// - Color values are not stored as converted colors immediately. The
		//   raw value is stored, and conversion only happens in the getter.
		fields[set] = function(value) {
			var children = this._item && this._item._children;
			// Clone color objects since they reference their owner
			// value = isColor ? Color.read(arguments, 0, 0, true) : value;
			// Only unify styles on children of Groups, excluding CompoundPaths.
			if (children && children.length > 0
					&& this._item._type !== 'compound-path') {
				for (var i = 0, l = children.length; i < l; i++)
					children[i]._style[set](value);
			} else {
				var old = this._values[key];
				if (old != value) {
					if (isColor) {
						if (old)
							delete old._owner;
						if (value && value.constructor === Color)
							value._owner = this._item;
					}
					// Note: We do not convert the values to Colors in the 
					// setter. This only happens once the getter is called.
					this._values[key] = value;
					// Notify the item of the style change STYLE is always set,
					// additional flags come from flags, as used for STROKE:
					if (this._item)
						this._item._changed(flag || 17);
				}
			}
		};

		fields[get] = function(/* dontMerge */) {
			var value,
				children = this._item && this._item._children;
			// If this item has children, walk through all of them and see if
			// they all have the same style.
			// If true is passed for dontMerge, don't merge children styles
			if (!children || children.length === 0 || arguments[0]
					|| this._item._type === 'compound-path') {
				var value = this._values[key];
				if (value === undefined) {
					value = this._defaults[key];
					if (value && value.clone)
						value = value.clone();
					this._values[key] = value;
				} else if (isColor && !(value && value.constructor === Color)) {
					// Convert to a Color and stored result of conversion.
					this._values[key] = value = Color.read(
							[value], 0, 0, true, true); // readNull
					if (value)
						value._owner = this._item;
				}
				return value;
			}
			for (var i = 0, l = children.length; i < l; i++) {
				var childValue = children[i]._style[get]();
				if (!value) {
					value = childValue;
				} else if (!Base.equals(value, childValue)) {
					// If there is another item with a different
					// style, the style is not defined:
					return undefined;
				}
			}
			return value;
		};

		// Inject style getters and setters into the Item class, which redirect
		// calls to the linked style object.
		item[get] = function() {
			return this._style[get]();
		};

		item[set] = function(value) {
			this._style[set](value);
		};
	});

	Item.inject(item);
	return fields;
}, /** @lends Style# */{
	initialize: function Style(style) {
		// We keep values in a separate object that we can iterate over.
		this._values = {};
		if (this._item instanceof TextItem)
			this._defaults = this._textDefaults;
		if (style) {
			// If the passed style object is also a Style, clone its clonable
			// fields rather than simply copying them.
			var isStyle = style instanceof Style,
				// Use the other stlyle's _values object for iteration
				values = isStyle ? style._values : style;
			for (var key in values) {
				if (key in this._defaults) {
					var value = values[key];
					// Delegate to setter, so Group styles work too.
					this[key] = value && isStyle && value.clone
							? value.clone() : value;
				}
			}
		}
	},

	getLeading: function getLeading() {
		// Override leading to return fontSize * 1.2 by default.
		var leading = getLeading.base.call(this);
		return leading != null ? leading : this.getFontSize() * 1.2;
	},

	getFontStyle: function() {
		var size = this.getFontSize();
		return (/[a-z]/i.test(size) ? size + ' ' : size + 'px ')
				+ this.getFont();
	},

	// DOCS: why isn't the example code showing up?
	/**
	 * Style objects don't need to be created directly. Just pass an object to
	 * {@link Item#style} or {@link Project#currentStyle}, it will be converted
	 * to a Style object internally.
	 *
	 * @name Style#initialize
	 * @param {object} style
	 */

	/**
	 * {@grouptitle Stroke Style}
	 *
	 * The color of the stroke.
	 *
	 * @name Style#strokeColor
	 * @property
	 * @type Color
	 *
	 * @example {@paperscript}
	 * // Setting the stroke color of a path:
	 *
	 * // Create a circle shaped path at { x: 80, y: 50 }
	 * // with a radius of 35:
	 * var circle = new Path.Circle(new Point(80, 50), 35);
	 *
	 * // Set its stroke color to RGB red:
	 * circle.strokeColor = new Color(1, 0, 0);
	 */

	/**
	 * The width of the stroke.
	 *
	 * @name Style#strokeWidth
	 * @property
	 * @default 1
	 * @type Number
	 *
	 * @example {@paperscript}
	 * // Setting an item's stroke width:
	 *
	 * // Create a circle shaped path at { x: 80, y: 50 }
	 * // with a radius of 35:
	 * var circle = new Path.Circle(new Point(80, 50), 35);
	 *
	 * // Set its stroke color to black:
	 * circle.strokeColor = 'black';
	 *
	 * // Set its stroke width to 10:
	 * circle.strokeWidth = 10;
	 */

	/**
	 * The shape to be used at the end of open {@link Path} items, when they
	 * have a stroke.
	 *
	 * @name Style#strokeCap
	 * @property
	 * @default 'butt'
	 * @type String('round', 'square', 'butt')
	 *
	 * @example {@paperscript height=200}
	 * // A look at the different stroke caps:
	 *
	 * var line = new Path(new Point(80, 50), new Point(420, 50));
	 * line.strokeColor = 'black';
	 * line.strokeWidth = 20;
	 *
	 * // Select the path, so we can see where the stroke is formed:
	 * line.selected = true;
	 *
	 * // Set the stroke cap of the line to be round:
	 * line.strokeCap = 'round';
	 *
	 * // Copy the path and set its stroke cap to be square:
	 * var line2 = line.clone();
	 * line2.position.y += 50;
	 * line2.strokeCap = 'square';
	 *
	 * // Make another copy and set its stroke cap to be butt:
	 * var line2 = line.clone();
	 * line2.position.y += 100;
	 * line2.strokeCap = 'butt';
	 */

	/**
	 * The shape to be used at the corners of paths when they have a stroke.
	 *
	 * @name Style#strokeJoin
	 * @property
	 * @default 'miter'
	 * @type String('miter', 'round', 'bevel')
	 *
	 * @example {@paperscript height=120}
	 * // A look at the different stroke joins:
	 * var path = new Path();
	 * path.add(new Point(80, 100));
	 * path.add(new Point(120, 40));
	 * path.add(new Point(160, 100));
	 * path.strokeColor = 'black';
	 * path.strokeWidth = 20;
	 *
	 * // Select the path, so we can see where the stroke is formed:
	 * path.selected = true;
	 *
	 * var path2 = path.clone();
	 * path2.position.x += path2.bounds.width * 1.5;
	 * path2.strokeJoin = 'round';
	 *
	 * var path3 = path2.clone();
	 * path3.position.x += path3.bounds.width * 1.5;
	 * path3.strokeJoin = 'bevel';
	 */

	/**
	 * The dash offset of the stroke.
	 *
	 * @name Style#dashOffset
	 * @property
	 * @default 0
	 * @type Number
	 */

	/**
	 * Specifies an array containing the dash and gap lengths of the stroke.
	 *
	 * @example {@paperscript}
	 * var path = new Path.Circle(new Point(80, 50), 40);
	 * path.strokeWidth = 2;
	 * path.strokeColor = 'black';
	 *
	 * // Set the dashed stroke to [10pt dash, 4pt gap]:
	 * path.dashArray = [10, 4];
	 *
	 * @name Style#dashArray
	 * @property
	 * @default []
	 * @type Array
	 */

	/**
	 * The miter limit of the stroke. When two line segments meet at a sharp
	 * angle and miter joins have been specified for {@link #strokeJoin}, it is
	 * possible for the miter to extend far beyond the {@link #strokeWidth} of
	 * the path. The miterLimit imposes a limit on the ratio of the miter length
	 * to the {@link #strokeWidth}.
	 *
	 * @name Style#miterLimit
	 * @property
	 * @default 10
	 * @type Number
	 */

	/**
	 * {@grouptitle Fill Style}
	 *
	 * The fill color.
	 *
	 * @name Style#fillColor
	 * @property
	 * @type Color
	 *
	 * @example {@paperscript}
	 * // Setting the fill color of a path to red:
	 *
	 * // Create a circle shaped path at { x: 80, y: 50 }
	 * // with a radius of 35:
	 * var circle = new Path.Circle(new Point(80, 50), 35);
	 *
	 * // Set the fill color of the circle to RGB red:
	 * circle.fillColor = new Color(1, 0, 0);
	 */

	/**
	 * {@grouptitle Character Style}
	 *
	 * The font to be used in text content.
	 *
	 * @name Style#font
	 * @default 'sans-serif'
	 * @type String
	 */

	/**
	 * The font size of text content, as {@Number} in pixels, or as {@String}
	 * with optional units {@code 'px'}, {@code 'pt'} and {@code 'em'}.
	 *
	 * @name Style#fontSize
	 * @default 10
	 * @type Number|String
	 */

	/**
	 * The text leading of text content.
	 *
	 * @name Style#leading
	 * @default fontSize * 1.2
	 * @type Number|String
	 */

	/**
	 * {@grouptitle Paragraph Style}
	 *
	 * The justification of text paragraphs.
	 *
	 * @name Style#justification
	 * @default 'left'
	 * @type String('left', 'right', 'center')
	 */
});


/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2013, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

/**
 * @name DomElement
 * @namespace
 * @private
 */
var DomElement = new function() {
	// We use a mix of Bootstrap.js legacy and Bonzo.js magic, ported over and
	// furhter simplified to a subset actually required by Paper.js

	var special = /^(checked|value|selected|disabled)$/i,
		translated = { text: 'textContent', html: 'innerHTML' },
		unitless = { lineHeight: 1, zoom: 1, zIndex: 1, opacity: 1 };

	function create(nodes, parent) {
		var res = [];
		for (var i =  0, l = nodes && nodes.length; i < l;) {
			var el = nodes[i++];
			if (typeof el === 'string') {
				el = document.createElement(el);
			} else if (!el || !el.nodeType) {
				continue;
			}
			// Do we have attributes?
			if (Base.isPlainObject(nodes[i]))
				DomElement.set(el, nodes[i++]);
			// Do we have children?
			if (Array.isArray(nodes[i]))
				create(nodes[i++], el);
			// Are we adding to a parent?
			if (parent)
				parent.appendChild(el);
			res.push(el);
		}
		return res;
	}

	return {
		create: function(nodes, parent) {
			var isArray = Array.isArray(nodes),
				res = create(isArray ? nodes : arguments, isArray ? parent : null);
			return res.length == 1 ? res[0] : res;
		},

		find: function(selector, root) {
			return (root || document).querySelector(selector);
		},

		findAll: function(selector, root) {
			return (root || document).querySelectorAll(selector);
		},

		get: function(el, key) {
			return el
				? special.test(key)
					? key === 'value' || typeof el[key] !== 'string'
						? el[key]
						: true
					: key in translated
						? el[translated[key]]
						: el.getAttribute(key)
				: null;
		},

		set: function(el, key, value) {
			if (typeof key !== 'string') {
				for (var name in key)
					if (key.hasOwnProperty(name))
						this.set(el, name, key[name]);
			} else if (!el || value === undefined) {
				return el;
			} else if (special.test(key)) {
				el[key] = value;
			} else if (key in translated) {
				el[translated[key]] = value;
			} else if (key === 'style') {
				this.setStyle(el, value);
			} else if (key === 'events') {
				DomEvent.add(el, value);
			} else {
				el.setAttribute(key, value);
			}
			return el;
		},

		getStyles: function(el) {
			var view = el && el.ownerDocument.defaultView;
			return view && view.getComputedStyle(el, '');
		},

		getStyle: function(el, key) {
			return el && el.style[key] || this.getStyles(el)[key] || null;
		},

		setStyle: function(el, key, value) {
			if (typeof key !== 'string') {
				for (var name in key)
					if (key.hasOwnProperty(name))
						this.setStyle(el, name, key[name]);
			} else {
				if (/^-?[\d\.]+$/.test(value) && !(key in unitless))
					value += 'px';
				el.style[key] = value;
			}
			return el;
		},

		hasClass: function(el, cls) {
			return new RegExp('\\s*' + cls + '\\s*').test(el.className);
		},

		addClass: function(el, cls) {
			el.className = (el.className + ' ' + cls).trim();
		},

		removeClass: function(el, cls) {
			el.className = el.className.replace(
				new RegExp('\\s*' + cls + '\\s*'), ' ').trim();
		},

		remove: function(el) {
			if (el.parentNode)
				el.parentNode.removeChild(el);
		},

		removeChildren: function(el) {
			while (el.firstChild)
				el.removeChild(el.firstChild);
		},

		getBounds: function(el, viewport) {
			var rect = el.getBoundingClientRect(),
				doc = el.ownerDocument,
				body = doc.body,
				html = doc.documentElement,
				x = rect.left - (html.clientLeft || body.clientLeft || 0),
				y = rect.top - (html.clientTop  || body.clientTop  || 0);
			if (!viewport) {
				var view = doc.defaultView;
				x += view.pageXOffset || html.scrollLeft || body.scrollLeft;
				y += view.pageYOffset || html.scrollTop || body.scrollTop;
			}
			return new Rectangle(x, y, rect.width, rect.height);
		},

		getViewportBounds: function(el) {
			var doc = el.ownerDocument,
				view = doc.defaultView,
				html = doc.documentElement;
			return new Rectangle(0, 0, 
				view.innerWidth || html.clientWidth,
				view.innerHeight || html.clientHeight
			);
		},

		getOffset: function(el, viewport) {
			return this.getBounds(el, viewport).getPoint();
		},

		getSize: function(el) {
			return this.getBounds(el, true).getSize();
		},

		/**
		 * Checks if element is invisibile (display: none, ...)
		 */
		isInvisible: function(el) {
			return this.getSize(el).equals([0, 0]);
		},

		/**
		 * Checks if element is visibile in current viewport
		 */
		isInView: function(el) {
			// See if the viewport bounds intersect with the windows rectangle
			// which always starts at 0, 0
			return !this.isInvisible(el) && this.getViewportBounds(el).intersects(
					this.getBounds(el, true));
		}
	};
};

/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2013, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

/**
 * @name DomEvent
 * @namespace
 * @private
 */
var DomEvent = {
	add: function(el, events) {
		for (var type in events) {
			var func = events[type];
			if (el.addEventListener) {
				el.addEventListener(type, func, false);
			} else if (el.attachEvent) {
				// Make a bound closure that calls on the right object and
				// passes on the global event object as a parameter.
				el.attachEvent('on' + type, func.bound = function() {
					func.call(el, window.event);
				});
			}
		}
	},

	remove: function(el, events) {
		for (var type in events) {
			var func = events[type];
			if (el.removeEventListener) {
				el.removeEventListener(type, func, false);
			} else if (el.detachEvent) {
				// Remove the bound closure instead of func itself
				el.detachEvent('on' + type, func.bound);
			}
		}
	},

	getPoint: function(event) {
		var pos = event.targetTouches
				? event.targetTouches.length
					? event.targetTouches[0]
					: event.changedTouches[0]
				: event;
		return new Point(
			pos.pageX || pos.clientX + document.documentElement.scrollLeft,
			pos.pageY || pos.clientY + document.documentElement.scrollTop
		);
	},

	getTarget: function(event) {
		return event.target || event.srcElement;
	},

	getOffset: function(event, target) {
		// Remove target offsets from page coordinates
		return DomEvent.getPoint(event).subtract(DomElement.getOffset(
				target || DomEvent.getTarget(event)));
	},

	preventDefault: function(event) {
		if (event.preventDefault) {
			event.preventDefault();
		} else {
			// IE
			event.returnValue = false;
		}
	},

	stopPropagation: function(event) {
		if (event.stopPropagation) {
			event.stopPropagation();
		} else {
			event.cancelBubble = true;
		}
	},

	stop: function(event) {
		DomEvent.stopPropagation(event);
		DomEvent.preventDefault(event);
	}
};

DomEvent.requestAnimationFrame = new function() {
	var part = 'equestAnimationFrame',
		request = window['r' + part] || window['webkitR' + part]
			|| window['mozR' + part] || window['oR' + part]
			|| window['msR' + part];
	if (request) {
		// Chrome shipped without the time arg in m10. We need to check if time
		// is defined in callbacks, and if not, clear request again so we won't
		// use the faulty method.
		request(function(time) {
			if (time == null)
				request = null;
		});
	}

	// So we need to fake it. Define helper functions first:
	var callbacks = [],
		focused = true,
		timer;

	DomEvent.add(window, {
		focus: function() {
			focused = true;
		},
		blur: function() {
			focused = false;
		}
	});

	return function(callback, element) {
		// See if we can handle natively first
		if (request)
			return request(callback, element);
		// If not, do the callback handling ourself:
		callbacks.push([callback, element]);
		// We're done if there's already a timer installed
		if (timer)
			return;
		// Installs interval timer that checks all callbacks. This results
		// in faster animations than repeatedly installing timout timers.
		timer = setInterval(function() {
			// Checks all installed callbacks for element visibility and
			// execute if needed.
			for (var i = callbacks.length - 1; i >= 0; i--) {
				var entry = callbacks[i],
					func = entry[0],
					el = entry[1];
				if (!el || (PaperScript.getAttribute(el, 'keepalive') == 'true'
						|| focused) && DomElement.isInView(el)) {
					// Handle callback and remove it from callbacks list.
					callbacks.splice(i, 1);
					func(Date.now());
				}
			}
		}, 1000 / 60);
	};
};


/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2013, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

/**
 * @name View
 *
 * @class The View object wraps an HTML element and handles drawing and user
 * interaction through mouse and keyboard for it. It offer means to scroll the
 * view, find the currently visible bounds in project coordinates, or the
 * center, both useful for constructing artwork that should appear centered on
 * screen.
 */
var View = Base.extend(Callback, /** @lends View# */{
	initialize: function View(element) {
		// Store reference to the currently active global paper scope, and the
		// active project, which will be represented by this view
		this._scope = paper;
		this._project = paper.project;
		this._element = element;
		var size;
		// Generate an id for this view / element if it does not have one
		this._id = element.getAttribute('id');
		if (this._id == null)
			element.setAttribute('id', this._id = 'view-' + View._id++);
		// Install event handlers
		DomEvent.add(element, this._viewHandlers);
		// If the element has the resize attribute, resize the it to fill the
		// window and resize it again whenever the user resizes the window.
		if (PaperScript.hasAttribute(element, 'resize')) {
			// Subtract element' viewport offset from the total size, to
			// stretch it in
			var offset = DomElement.getOffset(element, true),
				that = this;
			size = DomElement.getViewportBounds(element)
					.getSize().subtract(offset);
			this._windowHandlers = {
				resize: function(event) {
					// Only update element offset if it's not invisible, as
					// otherwise the offset would be wrong.
					if (!DomElement.isInvisible(element))
						offset = DomElement.getOffset(element, true);
					// Set the size now, which internally calls onResize
					// and redraws the view
					that.setViewSize(DomElement.getViewportBounds(element)
							.getSize().subtract(offset));
				}
			};
			DomEvent.add(window, this._windowHandlers);
		} else {
			// If the element is invisible, we cannot directly access
			// element.width / height, because they would appear 0.
			// Reading the attributes still works.
			size = new Size(parseInt(element.getAttribute('width'), 10),
						parseInt(element.getAttribute('height'), 10));
			// If no size was specified on the canvas, read it from CSS
			if (size.isNaN())
				size = DomElement.getSize(element);
		}
		// Set canvas size even if we just deterined the size from it, since
		// it might have been set to a % size, in which case it would use some
		// default internal size (300x150 on WebKit) and scale up the pixels.
		element.width = size.width;
		element.height = size.height;
		// TODO: Test this on IE:
		if (PaperScript.hasAttribute(element, 'stats')) {
			this._stats = new Stats();
			// Align top-left to the element
			var stats = this._stats.domElement,
				style = stats.style,
				offset = DomElement.getOffset(element);
			style.position = 'absolute';
			style.left = offset.x + 'px';
			style.top = offset.y + 'px';
			document.body.appendChild(stats);
		}
		// Keep track of views internally
		View._views.push(this);
		// Link this id to our view
		View._viewsById[this._id] = this;
		this._viewSize = LinkedSize.create(this, 'setViewSize',
				size.width, size.height);
		this._matrix = new Matrix();
		this._zoom = 1;
		// Make sure the first view is focused for keyboard input straight away
		if (!View._focused)
			View._focused = this;
		// Items that need the onFrame handler called on them
		this._frameItems = {};
		this._frameItemCount = 0;
	},

	/**
	 * Removes this view from and frees the associated element.
	 */
	remove: function() {
		if (!this._project)
			return false;
		// Clear focus if removed view had it
		if (View._focused == this)
			View._focused = null;
		// Remove view from internal structures
		View._views.splice(View._views.indexOf(this), 1);
		delete View._viewsById[this._id];
		// Unlink from project
		if (this._project.view == this)
			this._project.view = null;
		// Uninstall event handlers again for this view.
		DomEvent.remove(this._element, this._viewHandlers);
		DomEvent.remove(window, this._windowHandlers);
		this._element = this._project = null;
		// Removing all onFrame handlers makes the onFrame handler stop
		// automatically through its uninstall method.
		this.detach('frame');
		this._frameItems = {};
		return true;
	},

	/**
	 * @namespace
	 * @ignore
	 */
	_events: {
		/**
		 * @namespace
		 */
		onFrame: {
			install: function() {
				// Call the onFrame handler straight away and initialize the
				// sequence of onFrame calls.
				if (!this._requested) {
					this._animate = true;
					this._handleFrame(true);
				}
			},

			uninstall: function() {
				this._animate = false;
			}
		},

		onResize: {}
	},

	// These are default values for event related properties on the prototype. 
	// Writing item._count++ does not change the defaults, it creates / updates
	// the property on the instance. Useful!
	_animate: false,
	_time: 0,
	_count: 0,

	_handleFrame: function(request) {
		this._requested = false;
		// See if we need to stop due to a call to uninstall()
		if (!this._animate)
			return;
		// Set the global paper object to the current scope
		paper = this._scope;
		if (request) {
			// Request next frame already
			this._requested = true;
			var that = this;
			DomEvent.requestAnimationFrame(function() {
				that._handleFrame(true);
			}, this._element);
		}
		var now = Date.now() / 1000,
			delta = this._before ? now - this._before : 0;
		this._before = now;
		this._handlingFrame = true;
		// Use Base.merge to convert into a Base object, for #toString()
		this.fire('frame', Base.merge({
			// Time elapsed since last redraw in seconds:
			delta: delta,
			// Time since first call of frame() in seconds:
			time: this._time += delta,
			count: this._count++
		}));
		// Update framerate stats
		if (this._stats)
			this._stats.update();
		this._handlingFrame = false;
		// Automatically draw view on each frame.
		this.draw(true);
	},

	_animateItem: function(item, animate) {
		var items = this._frameItems;
		if (animate) {
			items[item._id] = {
				item: item,
				// Additional information for the event callback
				time: 0,
				count: 0
			};
			if (++this._frameItemCount == 1)
				this.attach('frame', this._handleFrameItems);
		} else {
			delete items[item._id];
			if (--this._frameItemCount == 0) {
				// If this is the last one, just stop animating straight away.
				this.detach('frame', this._handleFrameItems);
			}
		}
	},

	// An empty callback that's only there so _frameItems can be handled
	// through the onFrame callback framework that automatically starts and
	// stops the animation for us whenever there's one or more frame handlers
	_handleFrameItems: function(event) {
		for (var i in this._frameItems) {
			var entry = this._frameItems[i];
			entry.item.fire('frame', Base.merge(event, {
				// Time since first call of frame() in seconds:
				time: entry.time += event.delta,
				count: entry.count++
			}));
		}
	},

	_redraw: function() {
		this._project._needsRedraw = true;
		if (this._handlingFrame)
			return;
		if (this._animate) {
			// If we're animating, call _handleFrame staight away, but without
			// requesting another animation frame.
			this._handleFrame();
		} else {
			// Otherwise simply redraw the view now
			this.draw();
		}
	},

	_transform: function(matrix) {
		this._matrix.concatenate(matrix);
		// Force recalculation of these values next time they are requested.
		this._bounds = null;
		this._inverse = null;
		this._redraw();
	},

	/**
	 * The underlying native element.
	 *
	 * @type HTMLCanvasElement
	 * @bean
	 */
	getElement: function() {
		return this._element;
	},

	/**
	 * The size of the view. Changing the view's size will resize it's
	 * underlying element.
	 *
	 * @type Size
	 * @bean
	 */
	getViewSize: function() {
		return this._viewSize;
	},

	setViewSize: function(size) {
		size = Size.read(arguments);
		var delta = size.subtract(this._viewSize);
		if (delta.isZero())
			return;
		this._element.width = size.width;
		this._element.height = size.height;
		// Update _viewSize but don't notify of change.
		this._viewSize.set(size.width, size.height, true);
		this._bounds = null; // Force recalculation
		// Call onResize handler on any size change
		this.fire('resize', {
			size: size,
			delta: delta
		});
		this._redraw();
	},

	/**
	 * The bounds of the currently visible area in project coordinates.
	 *
	 * @type Rectangle
	 * @bean
	 */
	getBounds: function() {
		if (!this._bounds)
			this._bounds = this._getInverse()._transformBounds(
					new Rectangle(new Point(), this._viewSize));
		return this._bounds;
	},

	/**
	 * The size of the visible area in project coordinates.
	 *
	 * @type Size
	 * @bean
	 */
	getSize: function(/* dontLink */) {
		return this.getBounds().getSize(arguments[0]);
	},

	/**
	 * The center of the visible area in project coordinates.
	 *
	 * @type Point
	 * @bean
	 */
	getCenter: function(/* dontLink */) {
		return this.getBounds().getCenter(arguments[0]);
	},

	setCenter: function(center) {
		this.scrollBy(Point.read(arguments).subtract(this.getCenter()));
	},

	/**
	 * The zoom factor by which the project coordinates are magnified.
	 *
	 * @type Number
	 * @bean
	 */
	getZoom: function() {
		return this._zoom;
	},

	setZoom: function(zoom) {
		// TODO: Clamp the view between 1/32 and 64, just like Illustrator?
		this._transform(new Matrix().scale(zoom / this._zoom,
			this.getCenter()));
		this._zoom = zoom;
	},

	/**
	 * Checks whether the view is currently visible within the current browser
	 * viewport.
	 *
	 * @return {Boolean} Whether the view is visible.
	 */
	isVisible: function() {
		return DomElement.isInView(this._element);
	},

	/**
	 * Scrolls the view by the given vector.
	 *
	 * @param {Point} point
	 */
	scrollBy: function(point) {
		this._transform(new Matrix().translate(Point.read(arguments).negate()));
	},

	/**
	 * Draws the view.
	 *
	 * @name View#draw
	 * @function
	 */
	/*
	draw: function(checkRedraw) {
	},
	*/

	// TODO: getInvalidBounds
	// TODO: invalidate(rect)
	// TODO: style: artwork / preview / raster / opaque / ink
	// TODO: getShowGrid
	// TODO: getMousePoint
	// TODO: projectToView(rect)

	projectToView: function(point) {
		return this._matrix._transformPoint(Point.read(arguments));
	},

	viewToProject: function(point) {
		return this._getInverse()._transformPoint(Point.read(arguments));
	},

	_getInverse: function() {
		if (!this._inverse)
			this._inverse = this._matrix.inverted();
		return this._inverse;
	}

	/**
	 * {@grouptitle Event Handlers}
	 * Handler function to be called on each frame of an animation.
	 * The function receives an event object which contains information about
	 * the frame event:
	 *
	 * <b>{@code event.count}</b>: the number of times the frame event was
	 * fired.
	 * <b>{@code event.time}</b>: the total amount of time passed since the
	 * first frame event in seconds.
	 * <b>{@code event.delta}</b>: the time passed in seconds since the last
	 * frame event.
	 *
	 * @example {@paperscript}
	 * // Creating an animation:
	 *
	 * // Create a rectangle shaped path with its top left point at:
	 * // {x: 50, y: 25} and a size of {width: 50, height: 50}
	 * var path = new Path.Rectangle(new Point(50, 25), new Size(50, 50));
	 * path.fillColor = 'black';
	 *
	 * function onFrame(event) {
	 * 	// Every frame, rotate the path by 3 degrees:
	 * 	path.rotate(3);
	 * }
	 *
	 * @name View#onFrame
	 * @property
	 * @type Function
	 */

	/**
	 * Handler function that is called whenever a view is resized.
	 *
	 * @example
	 * // Repositioning items when a view is resized:
	 *
	 * // Create a circle shaped path in the center of the view:
	 * var path = new Path.Circle(view.bounds.center, 30);
	 * path.fillColor = 'red';
	 *
	 * function onResize(event) {
	 * 	// Whenever the view is resized, move the path to its center:
	 * 	path.position = view.center;
	 * }
	 *
	 * @name View#onResize
	 * @property
	 * @type Function
	 */
	/**
	 * {@grouptitle Event Handling}
	 * 
	 * Attach an event handler to the view.
	 *
	 * @name View#on
	 * @function
	 * @param {String('frame', 'resize')} type the event type
	 * @param {Function} function The function to be called when the event
	 * occurs
	 * 
	 * @example {@paperscript}
	 * // Create a rectangle shaped path with its top left point at:
	 * // {x: 50, y: 25} and a size of {width: 50, height: 50}
	 * var path = new Path.Rectangle(new Point(50, 25), new Size(50, 50));
	 * path.fillColor = 'black';
	 * 
	 * var frameHandler = function(event) {
	 * 	// Every frame, rotate the path by 3 degrees:
	 * 	path.rotate(3);
	 * };
	 * 
	 * view.on('frame', frameHandler);
	 */
	/**
	 * Attach one or more event handlers to the view.
	 *
	 * @name View#on^2
	 * @function
	 * @param {Object} param An object literal containing one or more of the
	 * following properties: {@code frame, resize}.
	 * // Create a rectangle shaped path with its top left point at:
	 * // {x: 50, y: 25} and a size of {width: 50, height: 50}
	 * var path = new Path.Rectangle(new Point(50, 25), new Size(50, 50));
	 * path.fillColor = 'black';
	 * 
	 * var frameHandler = function(event) {
	 * 	// Every frame, rotate the path by 3 degrees:
	 * 	path.rotate(3);
	 * };
	 * 
	 * view.on({
	 * 	frame: frameHandler
	 * });
	 */

	/**
	 * Detach an event handler from the view.
	 *
	 * @name View#detach
	 * @function
	 * @param {String('frame', 'resize')} type the event type
	 * @param {Function} function The function to be detached
	 * 
	 * @example {@paperscript}
	 * // Create a rectangle shaped path with its top left point at:
	 * // {x: 50, y: 25} and a size of {width: 50, height: 50}
	 * var path = new Path.Rectangle(new Point(50, 25), new Size(50, 50));
	 * path.fillColor = 'black';
	 * 
	 * var frameHandler = function(event) {
	 * 	// Every frame, rotate the path by 3 degrees:
	 * 	path.rotate(3);
	 * };
	 * 
	 * view.on({
	 * 	frame: frameHandler
	 * });
	 * 
	 * // When the user presses the mouse,
	 * // detach the frame handler from the view:
	 * function onMouseDown(event) {
	 * 	view.detach('frame');
	 * }
	 */
	/**
	 * Detach one or more event handlers from the view.
	 *
	 * @name View#detach^2
	 * @function
	 * @param {Object} param An object literal containing one or more of the
	 * following properties: {@code frame, resize}
	 */

	/**
	 * Fire an event on the view.
	 *
	 * @name View#fire
	 * @function
	 * @param {String('frame', 'resize')} type the event type
	 * @param {Object} event An object literal containing properties describing
	 * the event.
	 */

	/**
	 * Check if the view has one or more event handlers of the specified type.
	 *
	 * @name View#responds
	 * @function
	 * @param {String('frame', 'resize')} type the event type
	 * @return {Boolean} {@true if the view has one or more event handlers of
	 * the specified type}
	 */
}, {
	statics: {
		_views: [],
		_viewsById: {},
		_id: 0,

		create: function(element) {
			if (typeof element === 'string')
				element = document.getElementById(element);
			// Factory to provide the right View subclass for a given element.
			// Produces only CanvasViews for now:
			return new CanvasView(element);
		}
	}
}, new function() {
	// Injection scope for mouse events on the browser
	var tool,
		prevFocus,
		tempFocus,
		dragging = false;

	function getView(event) {
		// Get the view from the current event target.
		var target = DomEvent.getTarget(event);
		// Some node do not have the getAttribute method, e.g. SVG nodes.
		return target.getAttribute && View._viewsById[target.getAttribute('id')];
	}

	function viewToProject(view, event) {
		return view.viewToProject(DomEvent.getOffset(event, view._element));
	}

	function updateFocus() {
		if (!View._focused || !View._focused.isVisible()) {
			// Find the first visible view
			for (var i = 0, l = View._views.length; i < l; i++) {
				var view = View._views[i];
				if (view && view.isVisible()) {
					View._focused = tempFocus = view;
					break;
				}
			}
		}
	}

	function mousedown(event) {
		// Get the view from the event, and store a reference to the view that
		// should receive keyboard input.
		var view = View._focused = getView(event),
			point = viewToProject(view, event);
		dragging = true;
		// Always first call the view's mouse handlers, as required by
		// CanvasView, and then handle the active tool, if any.
		if (view._onMouseDown)
			view._onMouseDown(event, point);
		if (tool = view._scope._tool)
			tool._onHandleEvent('mousedown', point, event);
		// In the end we always call draw(), but pass checkRedraw = true, so we
		// only redraw the view if anything has changed in the above calls.
		view.draw(true);
	}

	function mousemove(event) {
		var view;
		if (!dragging) {
			// See if we can get the view from the current event target, and
			// handle the mouse move over it.
			view = getView(event);
			if (view) {
				// Temporarily focus this view without making it sticky, so
				// Key events are handled too during the mouse over
				prevFocus = View._focused;
				View._focused = tempFocus = view;
			} else if (tempFocus && tempFocus == View._focused) {
				// Clear temporary focus again and update it.
				View._focused = prevFocus;
				updateFocus();
			}
		}
		if (!(view = view || View._focused))
			return;
		var point = event && viewToProject(view, event);
		if (view._onMouseMove)
			view._onMouseMove(event, point);
		if (tool = view._scope._tool) {
			// If there's no onMouseDrag, fire onMouseMove while dragging too.
			if (tool._onHandleEvent(dragging && tool.responds('mousedrag')
					? 'mousedrag' : 'mousemove', point, event))
				DomEvent.stop(event);
		}
		view.draw(true);
	}

	function mouseup(event) {
		var view = View._focused;
		if (!view || !dragging)
			return;
		var point = viewToProject(view, event);
		curPoint = null;
		dragging = false;
		if (view._onMouseUp)
			view._onMouseUp(event, point);
		// Cancel DOM-event if it was handled by our tool
		if (tool && tool._onHandleEvent('mouseup', point, event))
			DomEvent.stop(event);
		view.draw(true);
	}

	function selectstart(event) {
		// Only stop this even if we're dragging already, since otherwise no
		// text whatsoever can be selected on the page.
		if (dragging)
			DomEvent.stop(event);
	}

	// mousemove and mouseup events need to be installed on document, not the
	// view element, since we want to catch the end of drag events even outside
	// our view. Only the mousedown events are installed on the view, as handled
	// by _createHandlers below.

	DomEvent.add(document, {
		mousemove: mousemove,
		mouseup: mouseup,
		touchmove: mousemove,
		touchend: mouseup,
		selectstart: selectstart,
		scroll: updateFocus
	});

	DomEvent.add(window, {
		load: updateFocus
	});

	return {
		_viewHandlers: {
			mousedown: mousedown,
			touchstart: mousedown,
			selectstart: selectstart
		},

		statics: {
			/**
			 * Loops through all views and sets the focus on the first
			 * active one.
			 */
			updateFocus: updateFocus
		}
	};
});

/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2013, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

/**
 * @name CanvasView
 * @class
 * @private
 */
var CanvasView = View.extend(/** @lends CanvasView# */{
	/**
	 * Creates a view object that wraps a canvas element.
	 * 
	 * @param {HTMLCanvasElement} canvas The canvas object that this view should
	 * wrap
	 */
	initialize: function CanvasView(canvas) {
		// Handle canvas argument
		if (!(canvas instanceof HTMLCanvasElement)) {
			// 2nd argument onwards could be view size, otherwise use default:
			var size = Size.read(arguments, 1);
			if (size.isZero())
				size = new Size(1024, 768);
			canvas = CanvasProvider.getCanvas(size);
		}
		this._context = canvas.getContext('2d');
		// Have Item count installed mouse events.
		this._eventCounters = {};
		View.call(this, canvas);
	},

	/**
	 * Draws the view.
	 *
	 * @name View#draw
	 * @function
	 */
	draw: function(checkRedraw) {
		if (checkRedraw && !this._project._needsRedraw)
			return false;
		// Initial tests conclude that clearing the canvas using clearRect
		// is always faster than setting canvas.width = canvas.width
		// http://jsperf.com/clearrect-vs-setting-width/7
		var ctx = this._context,
			size = this._viewSize;
		ctx.clearRect(0, 0, size._width + 1, size._height + 1);
		this._project.draw(ctx, this._matrix);
		this._project._needsRedraw = false;
		return true;
	}
}, new function() { // Item based mouse handling:

	var downPoint,
		lastPoint,
		overPoint,
		downItem,
		lastItem,
		overItem,
		hasDrag,
		doubleClick,
		clickTime;

	// Returns false if event was stopped, true otherwise, wether handler was
	// called or not!
	function callEvent(type, event, point, target, lastPoint, bubble) {
		var item = target,
			mouseEvent;
		while (item) {
			if (item.responds(type)) {
				// Create an reuse the event object if we're bubbling
				if (!mouseEvent)
					mouseEvent = new MouseEvent(type, event, point, target,
							// Calculate delta if lastPoint was passed
							lastPoint ? point.subtract(lastPoint) : null);
				if (item.fire(type, mouseEvent)
						&& (!bubble || mouseEvent._stopped))
					return false;
			}
			item = item.getParent();
		}
		return true;
	}

	function handleEvent(view, type, event, point, lastPoint) {
		if (view._eventCounters[type]) {
			var project = view._project,
				hit = project.hitTest(point, {
					tolerance: project.options.hitTolerance || 0,
					fill: true,
					stroke: true
				}),
				item = hit && hit.item;
			if (item) {
				// If this is a mousemove event and we change the overItem,
				// reset lastPoint to point so delta is (0, 0)
				if (type === 'mousemove' && item != overItem)
					lastPoint = point;
				// If we have a downItem with a mousedrag event, do not send
				// mousemove events to any item while we're dragging.
				// TODO: Do we also need to lock mousenter / mouseleave in the
				// same way?
				if (type !== 'mousemove' || !hasDrag)
					callEvent(type, event, point, item, lastPoint);
				return item;
			}
		}
	}

	return {
		_onMouseDown: function(event, point) {
			var item = handleEvent(this, 'mousedown', event, point);
			// See if we're clicking again on the same item, within the
			// double-click time. Firefox uses 300ms as the max time difference:
			doubleClick = lastItem == item && (Date.now() - clickTime < 300);
			downItem = lastItem = item;
			downPoint = lastPoint = overPoint = point;
			hasDrag = downItem && downItem.responds('mousedrag');
		},

		_onMouseUp: function(event, point) {
			// TODO: Check 
			var item = handleEvent(this, 'mouseup', event, point);
			if (hasDrag) {
				// If the point has changed since the last mousedrag event, send
				// another one
				if (lastPoint && !lastPoint.equals(point))
					callEvent('mousedrag', event, point, downItem, lastPoint);
				// If we had a mousedrag event locking mousemove events and are
				// over another item, send it a mousemove event now.
				// Use point as overPoint, so delta is (0, 0) since this will
				// be the first mousemove event for this item.
				if (item != downItem) {
					overPoint = point;
					callEvent('mousemove', event, point, item, overPoint);
				}
			}
			if (item === downItem) {
				clickTime = Date.now();
				if (!doubleClick
						// callEvent returns false if event is stopped.
						|| callEvent('doubleclick', event, downPoint, item))
					callEvent('click', event, downPoint, item);
				doubleClick = false;
			}
			downItem = null;
			hasDrag = false;
		},

		_onMouseMove: function(event, point) {
			// Call the mousedrag event first if an item was clicked earlier
			if (downItem)
				callEvent('mousedrag', event, point, downItem, lastPoint);
			var item = handleEvent(this, 'mousemove', event, point, overPoint);
			lastPoint = overPoint = point;
			if (item !== overItem) {
				callEvent('mouseleave', event, point, overItem);
				overItem = item;
				callEvent('mouseenter', event, point, item);
			}
		}
	};
});



/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2013, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

/**
 * @name Event
 * @class
 */
var Event = Base.extend(/** @lends Event# */{
	initialize: function Event(event) {
		this.event = event;
	},

	preventDefault: function() {
		this._prevented = true;
		DomEvent.preventDefault(this.event);
	},

	stopPropagation: function() {
		this._stopped = true;
		DomEvent.stopPropagation(this.event);
	},

	stop: function() {
		this.stopPropagation();
		this.preventDefault();
	},

	// DOCS: Document Event#modifiers
	/**
	 * @type object
	 * @bean
	 */
	getModifiers: function() {
		return Key.modifiers;
	}
});

/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2013, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

/**
 * @name KeyEvent
 *
 * @class The KeyEvent object is received by the {@link Tool}'s keyboard
 * handlers {@link Tool#onKeyDown}, {@link Tool#onKeyUp}. The KeyEvent object is
 * the only parameter passed to these functions and contains information about
 * the keyboard event.
 *
 * @extends Event
 */
var KeyEvent = Event.extend(/** @lends KeyEvent# */{
	initialize: function KeyEvent(down, key, character, event) {
		Event.call(this, event);
		this.type = down ? 'keydown' : 'keyup';
		this.key = key;
		this.character = character;
	},

	/**
	 * The type of key event.
	 *
	 * @name KeyEvent#type
	 * @type String('keydown', 'keyup')
	 */

	/**
	 * The string character of the key that caused this key event.
	 *
	 * @name KeyEvent#character
	 * @type String
	 */

	/**
	 * The key that caused this key event.
	 *
	 * @name KeyEvent#key
	 * @type String
	 */

	/**
	 * @return {String} A string representation of the key event.
	 */
	toString: function() {
		return "{ type: '" + this.type
				+ "', key: '" + this.key
				+ "', character: '" + this.character
				+ "', modifiers: " + this.getModifiers()
				+ " }";
	}
});

/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2013, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

/**
 * @name Key
 * @namespace
 */
var Key = new function() {
	// TODO: Make sure the keys are called the same as in Scriptographer
	// Missing: tab, cancel, clear, page-down, page-up, comma, minus, period,
	// slash, etc etc etc.

	var keys = {
		8: 'backspace',
		9: 'tab',
		13: 'enter',
		16: 'shift',
		17: 'control',
		18: 'option',
		19: 'pause',
		20: 'caps-lock',
		27: 'escape',
		32: 'space',
		35: 'end',
		36: 'home',
		37: 'left',
		38: 'up',
		39: 'right',
		40: 'down',
		46: 'delete',
		91: 'command',
		93: 'command', // WebKit right command button
		224: 'command'  // Gecko command button
	},

	// Use Base.merge to convert into a Base object, for #toString()
	modifiers = Base.merge({
		shift: false,
		control: false,
		option: false,
		command: false,
		capsLock: false,
		space: false
	}),

	// Since only keypress gets proper keyCodes that are actually representing
	// characters, we need to perform a little trickery here to use these codes
	// in onKeyDown/Up: keydown is used to store the downCode and handle
	// modifiers and special keys such as arrows, space, etc, keypress fires the
	// actual onKeyDown event and maps the keydown keyCode to the keypress
	// charCode so keyup can do the right thing too.
	charCodeMap = {}, // keyCode -> charCode mappings for pressed keys
	keyMap = {}, // Map for currently pressed keys
	downCode; // The last keyCode from keydown

	function handleKey(down, keyCode, charCode, event) {
		var character = String.fromCharCode(charCode),
			key = keys[keyCode] || character.toLowerCase(),
			type = down ? 'keydown' : 'keyup',
			view = View._focused,
			scope = view && view.isVisible() && view._scope,
			tool = scope && scope._tool;
		keyMap[key] = down;
		if (tool && tool.responds(type)) {
			// Call the onKeyDown or onKeyUp handler if present
			tool.fire(type, new KeyEvent(down, key, character, event));
			if (view)
				view.draw(true);
		}
	}

	DomEvent.add(document, {
		keydown: function(event) {
			var code = event.which || event.keyCode;
			// If the keyCode is in keys, it needs to be handled by keydown and
			// not in keypress after (arrows for example wont be triggering
			// a keypress, but space would).
			var key = keys[code], name;
			if (key) {
				// Detect modifiers and mark them as pressed
				if ((name = Base.camelize(key)) in modifiers)
					modifiers[name] = true;
				// No char code for special keys, but mark as pressed
				charCodeMap[code] = 0;
				handleKey(true, code, null, event);
				// Do not set downCode as we handled it already. Space would
				// be handled twice otherwise, once here, once in keypress.
			} else {
				downCode = code;
			}
		},

		keypress: function(event) {
			if (downCode != null) {
				var code = event.which || event.keyCode;
				// Link the downCode from keydown with the code form keypress,
				// so keyup can retrieve that code again.
				charCodeMap[downCode] = code;
				handleKey(true, downCode, code, event);
				downCode = null;
			}
		},

		keyup: function(event) {
			var code = event.which || event.keyCode,
				key = keys[code], name;
			// Detect modifiers and mark them as released
			if (key && (name = Base.camelize(key)) in modifiers)
				modifiers[name] = false;
			if (charCodeMap[code] != null) {
				handleKey(false, code, charCodeMap[code], event);
				delete charCodeMap[code];
			}
		}
	});

	return /** @lends Key */{
		modifiers: modifiers,

		/**
		 * Checks whether the specified key is pressed.
		 *
		 * @param {String} key One of: 'backspace', 'enter', 'shift', 'control',
		 * 'option', 'pause', 'caps-lock', 'escape', 'space', 'end', 'home',
		 * 'left', 'up', 'right', 'down', 'delete', 'command'
		 * @return {Boolean} {@true if the key is pressed}
		 *
		 * @example
		 * // Whenever the user clicks, create a circle shaped path. If the
		 * // 'a' key is pressed, fill it with red, otherwise fill it with blue:
		 * function onMouseDown(event) {
		 * 	var path = new Path.Circle(event.point, 10);
		 * 	if (Key.isDown('a')) {
		 * 		path.fillColor = 'red';
		 * 	} else {
		 * 		path.fillColor = 'blue';
		 * 	}
		 * }
		 */
		isDown: function(key) {
			return !!keyMap[key];
		}
	};
};
/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2013, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

/**
 * @name MouseEvent
 *
 * @class The MouseEvent object is received by the {@link Item}'s mouse event
 * handlers {@link Item#onMouseDown}, {@link Item#onMouseDrag},
 * {@link Item#onMouseMove}, {@link Item#onMouseUp}, {@link Item#onClick},
 * {@link Item#onDoubleClick}, {@link Item#onMouseEnter} and
 * {@link Item#onMouseLeave}. The MouseEvent object is the only parameter passed
 * to these functions and contains information about the mouse event.
 *
 * @extends Event
 */
var MouseEvent = Event.extend(/** @lends MouseEvent# */{
	initialize: function MouseEvent(type, event, point, target, delta) {
		Event.call(this, event);
		this.type = type;
		this.point = point;
		this.target = target;
		this.delta = delta;
	},

	/**
	 * The type of mouse event.
	 *
	 * @name MouseEvent#type
	 * @type String('mousedown', 'mouseup', 'mousedrag', 'click',
	 * 'doubleclick', 'mousemove', 'mouseenter', 'mouseleave')
	 */

	/**
	 * The position of the mouse in project coordinates when the event was
	 * fired.
	 *
	 * @name MouseEvent#point
	 * @type Point
	 */

	// DOCS: document MouseEvent#target
	/**
	 * @name MouseEvent#target
	 * @type Item
	 */

	// DOCS: document MouseEvent#delta
	/**
	 * @name MouseEvent#delta
	 * @type Point
	 */

	/**
	 * @return {String} A string representation of the mouse event.
	 */
	toString: function() {
		return "{ type: '" + this.type
				+ "', point: " + this.point
				+ ', target: ' + this.target
				+ (this.delta ? ', delta: ' + this.delta : '')
				+ ', modifiers: ' + this.getModifiers()
				+ ' }';
	}
});


/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2013, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

 /**
  * @name Palette
  * @class
  */
var Palette = Base.extend(Callback, /** @lends Palette# */{
	_events: [ 'onChange' ],

	initialize: function Palette(title, components, values) {
		var parent = DomElement.find('.palettejs-panel')
			|| DomElement.find('body').appendChild(
				DomElement.create('div', { 'class': 'palettejs-panel' }));
		this._element = parent.appendChild(
			DomElement.create('table', { 'class': 'palettejs-pane' })),
		this._title = title;
		if (!values)
			values = {};
		for (var name in (this._components = components)) {
			var component = components[name];
			if (!(component instanceof Component)) {
				if (component.value == null)
					component.value = values[name];
				component.name = name;
				component = components[name] = new Component(component);
			}
			this._element.appendChild(component._element);
			component._palette = this;
			// Make sure each component has an entry in values, so observers get
			// installed further down.
			if (values[name] === undefined)
				values[name] = component.value;
		}
		// Now replace each entry in values with a getter / setters so we can
		// directly link the value to the component and  observe change.
		this._values = Base.each(values, function(value, name) {
			var component = components[name];
			if (component) {
				Base.define(values, name, {
					enumerable: true,
					configurable: true,
					get: function() {
						return component._value;
					},
					set: function(val) {
						component.setValue(val);
					}
				});
			}
		});
		if (window.paper)
			paper.palettes.push(this);
	},

	/**
	 * Resets the values of the components to their
	 * {@link Component#defaultValue}.
	 */
	reset: function() {
		for (var i in this._components)
			this._components[i].reset();
	},

	remove: function() {
		DomElement.remove(this._element);
	}
});

/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2013, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

 /**
  * @name Component
  * @class
  */
var Component = Base.extend(Callback, /** @lends Component# */{
	_events: [ 'onChange', 'onClick' ],

	_types: {
		'boolean': {
			type: 'checkbox',
			value: 'checked'
		},

		string: {
			type: 'text'
		},

		number: {
			type: 'number',
			number: true
		},

		button: {
			type: 'button'
		},

		text: {
			tag: 'div',
			value: 'text'
		},

		slider: {
			type: 'range',
			number: true
		},

		list: {
			tag: 'select',

			options: function() {
				DomElement.removeChildren(this._inputItem);
				DomElement.create(Base.each(this._options, function(option) {
					this.push('option', { value: option, text: option });
				}, []), this._inputItem);
			}
		}
	},

	initialize: function Component(obj) {
		this._type = obj.type in this._types
			? obj.type
			: 'options' in obj
				? 'list'
				: 'onClick' in obj
					? 'button'
					: typeof obj.value;
		this._info = this._types[this._type] || { type: this._type };
		var that = this,
			fireChange = false;
		this._inputItem = DomElement.create(this._info.tag || 'input', {
			type: this._info.type,
			events: {
				change: function() {
					that.setValue(
						DomElement.get(this, that._info.value || 'value'));
					if (fireChange) {
						that._palette.fire('change', that, that.name, that._value);
						that.fire('change', that._value);
					}
				},
				click: function() {
					that.fire('click');
				}
			}
		});
		this._element = DomElement.create('tr', [
			this._labelItem = DomElement.create('td'),
			'td', [this._inputItem]
		]);
		Base.each(obj, function(value, key) {
			this[key] = value;
		}, this);
		this._defaultValue = this._value;
		// Only fire change events after we have initalized
		fireChange = true;
	},

	getType: function() {
		return this._type;
	},

	getLabel: function() {
		return this._label;
	},

	setLabel: function(label) {
		this._label = label;
		DomElement.set(this._labelItem, 'text', label + ':');
	},

	getOptions: function() {
		return this._options;
	},

	setOptions: function(options) {
		this._options = options;
		if (this._info.options)
			this._info.options.call(this);
	},

	getValue: function() {
		return this._value;
	},

	setValue: function(value) {
		var key = this._info.value || 'value';
		DomElement.set(this._inputItem, key, value);
		// Read back and convert from input again, to make sure we're in sync
		value = DomElement.get(this._inputItem, key);
		this._value = this._info.number ? parseFloat(value, 10) : value;
	},

	getRange: function() {
		return [parseFloat(DomElement.get(this._inputItem, 'min')),
				parseFloat(DomElement.get(this._inputItem, 'max'))];
	},

	setRange: function(min, max) {
		var range = Array.isArray(min) ? min : [min, max];
		DomElement.set(this._inputItem, { min: range[0], max: range[1] });
	},

	getMin: function() {
		return this.getRange()[0];
	},

	setMin: function(min) {
		this.setRange(min, this.getMax());
	},

	getMax: function() {
		return this.getRange()[1];
	},

	setMax: function(max) {
		this.setRange(this.getMin(), max);
	},

	getStep: function() {
		return parseFloat(DomElement.get(this._inputItem, 'step'));
	},

	setStep: function(step) {
		DomElement.set(this._inputItem, 'step', step);
	},

	reset: function() {
		this.setValue(this._defaultValue);
	}
});

/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2013, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

/**
 * @name ToolEvent
 *
 * @class ToolEvent The ToolEvent object is received by the {@link Tool}'s mouse
 * event handlers {@link Tool#onMouseDown}, {@link Tool#onMouseDrag},
 * {@link Tool#onMouseMove} and {@link Tool#onMouseUp}. The ToolEvent
 * object is the only parameter passed to these functions and contains
 * information about the mouse event.
 *
 * @extends Event
 */
var ToolEvent = Event.extend(/** @lends ToolEvent# */{
	// Have ToolEvent#item fall back to returning null, not undefined.
	_item: null,

	initialize: function ToolEvent(tool, type, event) {
		this.tool = tool;
		this.type = type;
		this.event = event;
	},

	/**
	 * Convenience method to allow local overrides of point values.
	 * See application below.
	 */
	_choosePoint: function(point, toolPoint) {
		return point ? point : toolPoint ? toolPoint.clone() : null;
	},

	/**
	 * The type of tool event.
	 *
	 * @name ToolEvent#type
	 * @type String('mousedown', 'mouseup', 'mousemove', 'mousedrag')
	 */

	/**
	 * The position of the mouse in project coordinates when the event was
	 * fired.
	 *
	 * @example
	 * function onMouseDrag(event) {
	 * 	// the position of the mouse when it is dragged
	 * 	console.log(event.point);
	 * }
	 *
	 * function onMouseUp(event) {
	 * 	// the position of the mouse when it is released
	 * 	console.log(event.point);
	 * }
	 *
	 * @type Point
	 * @bean
	 */
	getPoint: function() {
		return this._choosePoint(this._point, this.tool._point);
	},

	setPoint: function(point) {
		this._point = point;
	},

	/**
	 * The position of the mouse in project coordinates when the previous
	 * event was fired.
	 *
	 * @type Point
	 * @bean
	 */
	getLastPoint: function() {
		return this._choosePoint(this._lastPoint, this.tool._lastPoint);
	},

	setLastPoint: function(lastPoint) {
		this._lastPoint = lastPoint;
	},

	/**
	 * The position of the mouse in project coordinates when the mouse button
	 * was last clicked.
	 *
	 * @type Point
	 * @bean
	 */
	getDownPoint: function() {
		return this._choosePoint(this._downPoint, this.tool._downPoint);
	},

	setDownPoint: function(downPoint) {
		this._downPoint = downPoint;
	},

	/**
	 * The point in the middle between {@link #lastPoint} and
	 * {@link #point}. This is a useful position to use when creating
	 * artwork based on the moving direction of the mouse, as returned by
	 * {@link #delta}.
	 *
	 * @type Point
	 * @bean
	 */
	getMiddlePoint: function() {
		// For explanations, see getDelta()
		if (!this._middlePoint && this.tool._lastPoint) {
			// (point + lastPoint) / 2
			return this.tool._point.add(this.tool._lastPoint).divide(2);
		}
		return this.middlePoint;
	},

	setMiddlePoint: function(middlePoint) {
		this._middlePoint = middlePoint;
	},

	/**
	 * The difference between the current position and the last position of the
	 * mouse when the event was fired. In case of the mouseup event, the
	 * difference to the mousedown position is returned.
	 *
	 * @type Point
	 * @bean
	 */
	getDelta: function() {
		// Do not put the calculated delta into delta, since this only reserved
		// for overriding event.delta.
		// Instead, keep calculating the delta each time, so the result can be
		// directly modified by the script without changing the internal values.
		// We could cache this and use clone, but this is almost as fast...
		return !this._delta && this.tool._lastPoint
		 		? this.tool._point.subtract(this.tool._lastPoint)
				: this._delta;
	},

	setDelta: function(delta) {
		this._delta = delta;
	},

	/**
	 * The number of times the mouse event was fired.
	 *
	 * @type Number
	 * @bean
	 */
	getCount: function() {
		// Return downCount for both mouse down and up, since
		// the count is the same.
		return /^mouse(down|up)$/.test(this.type)
				? this.tool._downCount
				: this.tool._count;
	},

	setCount: function(count) {
		this.tool[/^mouse(down|up)$/.test(this.type) ? 'downCount' : 'count']
			= count;
	},

	/**
	 * The item at the position of the mouse (if any).
	 * 
	 * If the item is contained within one or more {@link Group} or
	 * {@link CompoundPath} items, the most top level group or compound path
	 * that it is contained within is returned.
	 *
	 * @type Item
	 * @bean
	 */
	getItem: function() {
		if (!this._item) {
			var result = this.tool._scope.project.hitTest(this.getPoint());
			if (result) {
				var item = result.item,
					// Find group parent, but exclude layers
					parent = item._parent;
				while (/^(group|compound-path)$/.test(parent._type)) {
					item = parent;
					parent = parent._parent;
				}
				this._item = item;
			}
		}
		return this._item;
	},
	
	setItem: function(item) {
		this._item = item;
	},

	/**
	 * @return {String} A string representation of the tool event.
	 */
	toString: function() {
		return '{ type: ' + this.type
				+ ', point: ' + this.getPoint()
				+ ', count: ' + this.getCount()
				+ ', modifiers: ' + this.getModifiers()
				+ ' }';
	}
});

/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2013, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

/**
 * @name Tool
 *
 * @class The Tool object refers to a script that the user can interact with
 * by using the mouse and keyboard and can be accessed through the global
 * {@code tool} variable. All its properties are also available in the paper
 * scope.
 *
 * The global {@code tool} variable only exists in scripts that contain mouse
 * handler functions ({@link #onMouseMove}, {@link #onMouseDown},
 * {@link #onMouseDrag}, {@link #onMouseUp}) or a keyboard handler
 * function ({@link #onKeyDown}, {@link #onKeyUp}).
 *
 * @classexample
 * var path;
 *
 * // Only execute onMouseDrag when the mouse
 * // has moved at least 10 points:
 * tool.distanceThreshold = 10;
 *
 * function onMouseDown(event) {
 * 	// Create a new path every time the mouse is clicked
 * 	path = new Path();
 * 	path.add(event.point);
 * 	path.strokeColor = 'black';
 * }
 *
 * function onMouseDrag(event) {
 * 	// Add a point to the path every time the mouse is dragged
 * 	path.add(event.point);
 * }
 */
var Tool = PaperScopeItem.extend(/** @lends Tool# */{
	_list: 'tools',
	_reference: '_tool', // PaperScope has accessor for #tool
	_events: [ 'onActivate', 'onDeactivate', 'onEditOptions',
			'onMouseDown', 'onMouseUp', 'onMouseDrag', 'onMouseMove',
			'onKeyDown', 'onKeyUp' ],

	// DOCS: rewrite Tool constructor explanation
	initialize: function Tool(props) {
		PaperScopeItem.call(this);
		this._firstMove = true;
		this._count = 0;
		this._downCount = 0;
		this._set(props);
	},

	/**
	 * Activates this tool, meaning {@link PaperScope#tool} will
	 * point to it and it will be the one that recieves mouse events.
	 *
	 * @name Tool#activate
	 * @function
	 */

	/**
	 * Removes this tool from the {@link PaperScope#tools} list.
	 *
	 * @name Tool#remove
	 * @function
	 */

	/**
	 * The minimum distance the mouse has to drag before firing the onMouseDrag
	 * event, since the last onMouseDrag event.
	 *
	 * @type Number
	 * @bean
	 */
	getMinDistance: function() {
		return this._minDistance;
	},

	setMinDistance: function(minDistance) {
		this._minDistance = minDistance;
		if (this._minDistance != null && this._maxDistance != null
				&& this._minDistance > this._maxDistance) {
			this._maxDistance = this._minDistance;
		}
	},

	/**
	 * The maximum distance the mouse has to drag before firing the onMouseDrag
	 * event, since the last onMouseDrag event.
	 *
	 * @type Number
	 * @bean
	 */
	getMaxDistance: function() {
		return this._maxDistance;
	},

	setMaxDistance: function(maxDistance) {
		this._maxDistance = maxDistance;
		if (this._minDistance != null && this._maxDistance != null
				&& this._maxDistance < this._minDistance) {
			this._minDistance = maxDistance;
		}
	},

	// DOCS: document Tool#fixedDistance
	/**
	 * @type Number
	 * @bean
	 */
	getFixedDistance: function() {
		return this._minDistance == this._maxDistance
			? this._minDistance : null;
	},

	setFixedDistance: function(distance) {
		this._minDistance = distance;
		this._maxDistance = distance;
	},

	/**
	 * {@grouptitle Mouse Event Handlers}
	 *
	 * The function to be called when the mouse button is pushed down. The
	 * function receives a {@link ToolEvent} object which contains information
	 * about the mouse event.
	 *
	 * @name Tool#onMouseDown
	 * @property
	 * @type Function
	 *
	 * @example {@paperscript}
	 * // Creating circle shaped paths where the user presses the mouse button:
	 * function onMouseDown(event) {
	 * 	// Create a new circle shaped path with a radius of 10
	 * 	// at the position of the mouse (event.point):
	 * 	var path = new Path.Circle({
	 * 		center: event.point,
	 * 		radius: 10,
	 * 		fillColor: 'black'
	 * 	});
	 * }
	 */

	/**
	 * The function to be called when the mouse position changes while the mouse
	 * is being dragged. The function receives a {@link ToolEvent} object which
	 * contains information about the mouse event.
	 *
	 * @name Tool#onMouseDrag
	 * @property
	 * @type Function
	 *
	 * @example {@paperscript}
	 * // Draw a line by adding a segment to a path on every mouse drag event:
	 *
	 * // Create an empty path:
	 * var path = new Path({
	 * 	strokeColor: 'black'
	 * });
	 * 
	 * function onMouseDrag(event) {
	 * 	// Add a segment to the path at the position of the mouse:
	 * 	path.add(event.point);
	 * }
	 */

	/**
	 * The function to be called the mouse moves within the project view. The
	 * function receives a {@link ToolEvent} object which contains information
	 * about the mouse event.
	 *
	 * @name Tool#onMouseMove
	 * @property
	 * @type Function
	 *
	 * @example {@paperscript}
	 * // Moving a path to the position of the mouse:
	 *
	 * // Create a circle shaped path with a radius of 10 at {x: 0, y: 0}:
	 * var path = new Path.Circle({
	 * 	center: [0, 0],
	 * 	radius: 10,
	 * 	fillColor: 'black'
	 * });
	 * 
	 * function onMouseMove(event) {
	 * 	// Whenever the user moves the mouse, move the path
	 * 	// to that position:
	 * 	path.position = event.point;
	 * }
	 */

	/**
	 * The function to be called when the mouse button is released. The function
	 * receives a {@link ToolEvent} object which contains information about the
	 * mouse event.
	 *
	 * @name Tool#onMouseUp
	 * @property
	 * @type Function
	 *
	 * @example {@paperscript}
	 * // Creating circle shaped paths where the user releases the mouse:
	 * function onMouseUp(event) {
	 * 	// Create a new circle shaped path with a radius of 10
	 * 	// at the position of the mouse (event.point):
	 * 	var path = new Path.Circle({
	 * 		center: event.point,
	 * 		radius: 10,
	 * 		fillColor: 'black'
	 * 	});
	 * }
	 */

	/**
	 * {@grouptitle Keyboard Event Handlers}
	 *
	 * The function to be called when the user presses a key on the keyboard.
	 * The function receives a {@link KeyEvent} object which contains
	 * information about the keyboard event.
	 * If the function returns {@code false}, the keyboard event will be
	 * prevented from bubbling up. This can be used for example to stop the
	 * window from scrolling, when you need the user to interact with arrow
	 * keys.
	 *
	 * @name Tool#onKeyDown
	 * @property
	 * @type Function
	 *
	 * @example {@paperscript}
	 * // Scaling a path whenever the user presses the space bar:
	 *
	 * // Create a circle shaped path:
	 * 	var path = new Path.Circle({
	 * 		center: new Point(50, 50),
	 * 		radius: 30,
	 * 		fillColor: 'red'
	 * 	});
	 *
	 * function onKeyDown(event) {
	 * 	if (event.key == 'space') {
	 * 		// Scale the path by 110%:
	 * 		path.scale(1.1);
	 *
	 * 		// Prevent the key event from bubbling
	 * 		return false;
	 * 	}
	 * }
	 */

	/**
	 * The function to be called when the user releases a key on the keyboard.
	 * The function receives a {@link KeyEvent} object which contains
	 * information about the keyboard event.
	 * If the function returns {@code false}, the keyboard event will be
	 * prevented from bubbling up. This can be used for example to stop the
	 * window from scrolling, when you need the user to interact with arrow
	 * keys.
	 *
	 * @name Tool#onKeyUp
	 * @property
	 * @type Function
	 *
	 * @example
	 * function onKeyUp(event) {
	 * 	if (event.key == 'space') {
	 * 		console.log('The spacebar was released!');
	 * 	}
	 * }
	 */

	_updateEvent: function(type, point, minDistance, maxDistance, start,
			needsChange, matchMaxDistance) {
		if (!start) {
			if (minDistance != null || maxDistance != null) {
				var minDist = minDistance != null ? minDistance : 0,
					vector = point.subtract(this._point),
					distance = vector.getLength();
				if (distance < minDist)
					return false;
				// Produce a new point on the way to point if point is further
				// away than maxDistance
				var maxDist = maxDistance != null ? maxDistance : 0;
				if (maxDist != 0) {
					if (distance > maxDist) {
						point = this._point.add(vector.normalize(maxDist));
					} else if (matchMaxDistance) {
						return false;
					}
				}
			}
			if (needsChange && point.equals(this._point))
				return false;
		}
		// Make sure mousemove events have lastPoint set even for the first move
		// so event.delta is always defined for them.
		// TODO: Decide wether mousedown also should always have delta set.
		this._lastPoint = start && type == 'mousemove' ? point : this._point;
		this._point = point;
		switch (type) {
		case 'mousedown':
			this._lastPoint = this._downPoint;
			this._downPoint = this._point;
			this._downCount++;
			break;
		case 'mouseup':
			// Mouse up events return the down point for last point, so delta is
			// spanning over the whole drag.
			this._lastPoint = this._downPoint;
			break;
		}
		this._count = start ? 0 : this._count + 1;
		return true;
	},

	fire: function fire(type, event) {
		// Override Callback#fire() so we can handle items marked in removeOn*()
		// calls first,.
		var sets = Tool._removeSets;
		if (sets) {
			// Always clear the drag set on mouseup
			if (type === 'mouseup')
				sets.mousedrag = null;
			var set = sets[type];
			if (set) {
				for (var id in set) {
					var item = set[id];
					// If we remove this item, we also need to erase it from all
					// other sets.
					for (var key in sets) {
						var other = sets[key];
						if (other && other != set)
							delete other[item._id];
					}
					item.remove();
				}
				sets[type] = null;
			}
		}
		return fire.base.call(this, type, event);
	},

	_onHandleEvent: function(type, point, event) {
		// Update global reference to this scope.
		paper = this._scope;
		// Now handle event callbacks
		var called = false;
		switch (type) {
		case 'mousedown':
			this._updateEvent(type, point, null, null, true, false, false);
			if (this.responds(type))
				called = this.fire(type, new ToolEvent(this, type, event));
			break;
		case 'mousedrag':
			// In order for idleInterval drag events to work, we need to not
			// check the first call for a change of position. Subsequent calls
			// required by min/maxDistance functionality will require it,
			// otherwise this might loop endlessly.
			var needsChange = false,
			// If the mouse is moving faster than maxDistance, do not produce
			// events for what is left after the first event is generated in
			// case it is shorter than maxDistance, as this would produce weird
			// results. matchMaxDistance controls this.
				matchMaxDistance = false;
			while (this._updateEvent(type, point, this.minDistance,
					this.maxDistance, false, needsChange, matchMaxDistance)) {
				if (this.responds(type))
					called = this.fire(type, new ToolEvent(this, type, event));
				needsChange = true;
				matchMaxDistance = true;
			}
			break;
		case 'mouseup':
			// If the last mouse drag happened in a different place, call mouse
			// drag first, then mouse up.
			if (!point.equals(this._point)
					&& this._updateEvent('mousedrag', point, this.minDistance,
							this.maxDistance, false, false, false)) {
				if (this.responds('mousedrag'))
					called = this.fire('mousedrag',
							new ToolEvent(this, type, event));
			}
			this._updateEvent(type, point, null, this.maxDistance, false,
					false, false);
			if (this.responds(type))
				called = this.fire(type, new ToolEvent(this, type, event));
			// Start with new values for 'mousemove'
			this._updateEvent(type, point, null, null, true, false, false);
			this._firstMove = true;
			break;
		case 'mousemove':
			while (this._updateEvent(type, point, this.minDistance,
					this.maxDistance, this._firstMove, true, false)) {
				if (this.responds(type))
					called = this.fire(type, new ToolEvent(this, type, event));
				this._firstMove = false;
			}
			break;
		}
		// Return if a callback was called or not.
		return called;
	}
	/**
	 * {@grouptitle Event Handling}
	 * 
	 * Attach an event handler to the tool.
	 *
	 * @name Tool#on
	 * @function
	 * @param {String('mousedown', 'mouseup', 'mousedrag', 'mousemove',
	 * 'keydown', 'keyup')} type the event type
	 * @param {Function} function The function to be called when the event
	 * occurs
	 */
	/**
	 * Attach one or more event handlers to the tool.
	 *
	 * @name Tool#on^2
	 * @function
	 * @param {Object} param An object literal containing one or more of the
	 * following properties: {@code mousedown, mouseup, mousedrag, mousemove,
	 * keydown, keyup}.
	 */

	/**
	 * Detach an event handler from the tool.
	 *
	 * @name Tool#detach
	 * @function
	 * @param {String('mousedown', 'mouseup', 'mousedrag', 'mousemove',
	 * 'keydown', 'keyup')} type the event type
	 * @param {Function} function The function to be detached
	 */
	/**
	 * Detach one or more event handlers from the tool.
	 *
	 * @name Tool#detach^2
	 * @function
	 * @param {Object} param An object literal containing one or more of the
	 * following properties: {@code mousedown, mouseup, mousedrag, mousemove,
	 * keydown, keyup}
	 */

	/**
	 * Fire an event on the tool.
	 *
	 * @name Tool#fire
	 * @function
	 * @param {String('mousedown', 'mouseup', 'mousedrag', 'mousemove',
	 * 'keydown', 'keyup')} type the event type
	 * @param {Object} event An object literal containing properties describing
	 * the event.
	 */

	/**
	 * Check if the tool has one or more event handlers of the specified type.
	 *
	 * @name Tool#responds
	 * @function
	 * @param {String('mousedown', 'mouseup', 'mousedrag', 'mousemove',
	 * 'keydown', 'keyup')} type the event type
	 * @return {Boolean} {@true if the tool has one or more event handlers of
	 * the specified type}
	 */
});


/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2013, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

// TODO: Run through the canvas array to find a canvas with the requested
// width / height, so we don't need to resize it?
var CanvasProvider = {
	canvases: [],

	getCanvas: function(width, height) {
		var size = height === undefined ? width : new Size(width, height);
		if (this.canvases.length) {
			var canvas = this.canvases.pop();
			// If they are not the same size, we don't need to clear them
			// using clearRect and visa versa.
			if ((canvas.width != size.width)
					|| (canvas.height != size.height)) {
				canvas.width = size.width;
				canvas.height = size.height;
			} else {
				// +1 is needed on some browsers to really clear the borders
				canvas.getContext('2d').clearRect(0, 0,
						size.width + 1, size.height + 1);
			}
			return canvas;
		} else {
			var canvas = document.createElement('canvas');
			canvas.width = size.width;
			canvas.height = size.height;
			return canvas;
		}
	},

	getContext: function(width, height) {
		return this.getCanvas(width, height).getContext('2d');
	},

	 // release can receive either a canvas or a context.
	release: function(obj) {
		this.canvases.push(obj.canvas ? obj.canvas : obj);
	},
};

/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2013, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

var BlendMode = {
	process: function(blendMode, srcContext, dstContext, alpha, offset) {
		var srcCanvas = srcContext.canvas,
			dstData = dstContext.getImageData(offset.x, offset.y,
					srcCanvas.width, srcCanvas.height),
			dst  = dstData.data,
			src  = srcContext.getImageData(0, 0,
					srcCanvas.width, srcCanvas.height).data,
			min = Math.min,
			max = Math.max,
			abs = Math.abs,
			sr, sg, sb, sa, // source
			br, bg, bb, ba, // backdrop
			dr, dg, db;     // destination

		// Conversion methods for HSL modes, as described by
		// http://www.aiim.org/documents/standards/pdf/blend_modes.pdf
		// The setters modify the variables dr, dg, db directly.

		function getLum(r, g, b) {
			return 0.2989 * r + 0.587 * g + 0.114 * b;
		}

		function setLum(r, g, b, l) {
			var d = l - getLum(r, g, b);
			dr = r + d;
			dg = g + d;
			db = b + d;
			var l = getLum(dr, dg, db),
				mn = min(dr, dg, db),
				mx = max(dr, dg, db);
			if (mn < 0) {
				var lmn = l - mn;
				dr = l + (dr - l) * l / lmn;
				dg = l + (dg - l) * l / lmn;
				db = l + (db - l) * l / lmn;
			}
			if (mx > 255) {
				var ln = 255 - l, mxl = mx - l;
				dr = l + (dr - l) * ln / mxl;
				dg = l + (dg - l) * ln / mxl;
				db = l + (db - l) * ln / mxl;
			}
		}

		function getSat(r, g, b) {
			return max(r, g, b) - min(r, g, b);
		}

		function setSat(r, g, b, s) {
			var col = [r, g, b],
				mx = max(r, g, b), // max
				mn = min(r, g, b), // min
				md; // mid
			// Determine indices for min and max in col:
			mn = mn == r ? 0 : mn == g ? 1 : 2;
			mx = mx == r ? 0 : mx == g ? 1 : 2;
			// Determine the index in col that is not used yet by min and max,
			// and assign it to mid:
			md = min(mn, mx) == 0 ? max(mn, mx) == 1 ? 2 : 1 : 0;
			// Now perform the actual algorithm
			if (col[mx] > col[mn]) {
				col[md] = (col[md] - col[mn]) * s / (col[mx] - col[mn]);
				col[mx] = s;
			} else {
				col[md] = col[mx] = 0;
			}
			col[mn] = 0;
			// Finally write out the values
			dr = col[0];
			dg = col[1];
			db = col[2];
		}

		var modes = {
			multiply: function() {
				dr = br * sr / 255;
				dg = bg * sg / 255;
				db = bb * sb / 255;
			},

			screen: function() {
				dr = 255 - (255 - br) * (255 - sr) / 255;
				dg = 255 - (255 - bg) * (255 - sg) / 255;
				db = 255 - (255 - bb) * (255 - sb) / 255;
			},

			overlay: function() {
				dr = br < 128 ? 2 * br * sr / 255 : 255 - 2 * (255 - br) * (255 - sr) / 255;
				dg = bg < 128 ? 2 * bg * sg / 255 : 255 - 2 * (255 - bg) * (255 - sg) / 255;
				db = bb < 128 ? 2 * bb * sb / 255 : 255 - 2 * (255 - bb) * (255 - sb) / 255;
			},

			'soft-light': function() {
				var t = sr * br / 255;
				dr = t + br * (255 - (255 - br) * (255 - sr) / 255 - t) / 255;
				t = sg * bg / 255;
				dg = t + bg * (255 - (255 - bg) * (255 - sg) / 255 - t) / 255;
				t = sb * bb / 255;
				db = t + bb * (255 - (255 - bb) * (255 - sb) / 255 - t) / 255;
			},

			'hard-light': function() {
				// = Reverse of overlay
				dr = sr < 128 ? 2 * sr * br / 255 : 255 - 2 * (255 - sr) * (255 - br) / 255;
				dg = sg < 128 ? 2 * sg * bg / 255 : 255 - 2 * (255 - sg) * (255 - bg) / 255;
				db = sb < 128 ? 2 * sb * bb / 255 : 255 - 2 * (255 - sb) * (255 - bb) / 255;
			},

			'color-dodge': function() {
				dr = sr == 255 ? sr : min(255, br * 255 / (255 - sr));
				dg = sg == 255 ? sg : min(255, bg * 255 / (255 - sg));
				db = sb == 255 ? sb : min(255, bb * 255 / (255 - sb));
			},

			'color-burn': function() {
				dr = sr == 0 ? 0 : max(255 - ((255 - br) * 255) / sr, 0);
				dg = sg == 0 ? 0 : max(255 - ((255 - bg) * 255) / sg, 0);
				db = sb == 0 ? 0 : max(255 - ((255 - bb) * 255) / sb, 0);
			},

			darken: function() {
				dr = br < sr ? br : sr;
				dg = bg < sg ? bg : sg;
				db = bb < sb ? bb : sb;
			},

			lighten: function() {
				dr = br > sr ? br : sr;
				dg = bg > sg ? bg : sg;
				db = bb > sb ? bb : sb;
			},

			difference: function() {
				dr = br - sr;
				if (dr < 0)
					dr = -dr;
				dg = bg - sg;
				if (dg < 0)
					dg = -dg;
				db = bb - sb;
				if (db < 0)
					db = -db;
			},

			exclusion: function() {
				dr = br + sr * (255 - br - br) / 255;
				dg = bg + sg * (255 - bg - bg) / 255;
				db = bb + sb * (255 - bb - bb) / 255;
			},

			// HSL Modes:
			hue: function() {
				setSat(sr, sg, sb, getSat(br, bg, bb));
				setLum(dr, dg, db, getLum(br, bg, bb));
			},

			saturation: function() {
				setSat(br, bg, bb, getSat(sr, sg, sb));
				setLum(dr, dg, db, getLum(br, bg, bb));
			},

			luminosity: function() {
				setLum(br, bg, bb, getLum(sr, sg, sb));
			},

			color: function() {
				setLum(sr, sg, sb, getLum(br, bg, bb));
			},

			// TODO: Not in Illustrator:
			add: function() {
				dr = min(br + sr, 255);
				dg = min(bg + sg, 255);
				db = min(bb + sb, 255);
			},

			subtract: function() {
				dr = max(br - sr, 0);
				dg = max(bg - sg, 0);
				db = max(bb - sb, 0);
			},

			average: function() {
				dr = (br + sr) / 2;
				dg = (bg + sg) / 2;
				db = (bb + sb) / 2;
			},

			negation: function() {
				dr = 255 - abs(255 - sr - br);
				dg = 255 - abs(255 - sg - bg);
				db = 255 - abs(255 - sb - bb);
			}
		};

		var process = modes[blendMode];
		if (!process)
			return;

		for (var i = 0, l = dst.length; i < l; i += 4) {
			sr = src[i];
			br = dst[i];
			sg = src[i + 1];
			bg = dst[i + 1];
			sb = src[i + 2];
			bb = dst[i + 2];
			sa = src[i + 3];
			ba = dst[i + 3];
			process();
			var a1 = sa * alpha / 255,
				a2 = 1 - a1;
			dst[i] = a1 * dr + a2 * br;
			dst[i + 1] = a1 * dg + a2 * bg;
			dst[i + 2] = a1 * db + a2 * bb;
			dst[i + 3] = sa * alpha + a2 * ba;
		}
		dstContext.putImageData(dstData, offset.x, offset.y);
	}
};


/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2013, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

var SVGStyles = Base.each({
	fillColor: ['fill', 'color'],
	strokeColor: ['stroke', 'color'],
	strokeWidth: ['stroke-width', 'number'],
	strokeCap: ['stroke-linecap', 'string'],
	strokeJoin: ['stroke-linejoin', 'string'],
	miterLimit: ['stroke-miterlimit', 'number'],
	dashArray: ['stroke-dasharray', 'array'],
	dashOffset: ['stroke-dashoffset', 'number']
}, function(entry, key) {
	var part = Base.capitalize(key);
	this[key] = {
		type: entry[1],
		property: key,
		attribute: entry[0],
		get: 'get' + part,
		set: 'set' + part
	};
}, {});

/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2013, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

var SVGNamespaces = {
	href: 'http://www.w3.org/1999/xlink',
	xlink: 'http://www.w3.org/2000/xmlns'
};

/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2013, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

/**
 * A function scope holding all the functionality needed to convert a
 * Paper.js DOM to a SVG DOM.
 */
new function() {
	var formatter = Formatter.instance;

	function setAttributes(node, attrs) {
		for (var key in attrs) {
			var val = attrs[key],
				namespace = SVGNamespaces[key];
			if (typeof val === 'number')
				val = formatter.number(val);
			if (namespace) {
				node.setAttributeNS(namespace, key, val);
			} else {
				node.setAttribute(key, val);
			}
		}
		return node;
	}

	function createElement(tag, attrs) {
		return setAttributes(
			document.createElementNS('http://www.w3.org/2000/svg', tag), attrs);
	}

	function getDistance(segments, index1, index2) {
		return segments[index1]._point.getDistance(segments[index2]._point);
	}

	function getTransform(item, coordinates) {
		var matrix = item._matrix,
			trans = matrix.getTranslation(),
			attrs = {};
		if (coordinates) {
			// If the item suppports x- and y- coordinates, we're taking out the
			// translation part of the matrix and move it to x, y attributes, to
			// produce more readable markup, and not have to use center points
			// in rotate(). To do so, SVG requries us to inverse transform the
			// translation point by the matrix itself, since they are provided
			// in local coordinates.
			matrix = matrix.shiftless();
			var point = matrix._inverseTransform(trans);
			attrs.x = point.x;
			attrs.y = point.y;
			trans = null;
		}
		if (matrix.isIdentity())
			return attrs;
		// See if we can decompose the matrix and can formulate it as a simple
		// translate/scale/rotate command sequence.
		var decomposed = matrix.decompose();
		if (decomposed && !decomposed.shearing) {
			var parts = [],
				angle = decomposed.rotation,
				scale = decomposed.scaling;
			if (trans && !trans.isZero())
				parts.push('translate(' + formatter.point(trans) + ')');
			if (!Numerical.isZero(scale.x - 1) || !Numerical.isZero(scale.y - 1))
				parts.push('scale(' + formatter.point(scale) +')');
			if (angle)
				parts.push('rotate(' + formatter.number(angle) + ')');
			attrs.transform = parts.join(' ');
		} else {
			attrs.transform = 'matrix(' + matrix.getValues().join(',') + ')';
		}
		return attrs;
	}

	function determineAngle(path, segments, type, center) {
		// If the object is a circle, ellipse, rectangle, or rounded rectangle,
		// see if it is placed at an angle, by figuring out its topCenter point
		// and measuring the angle to its center.
		var topCenter = type === 'rect'
				? segments[1]._point.add(segments[2]._point).divide(2)
				: type === 'roundrect'
				? segments[3]._point.add(segments[4]._point).divide(2)
				: type === 'circle' || type === 'ellipse'
				? segments[1]._point
				: null;
		var angle = topCenter && topCenter.subtract(center).getAngle() + 90;
		return Numerical.isZero(angle || 0) ? 0 : angle;
	}

	function determineType(path, segments) {
		// Returns true if the the two segment indices are the beggining of two
		// lines and if the wto lines are parallel.
		function isColinear(i, j) {
			var seg1 = segments[i],
				seg2 = seg1.getNext(),
				seg3 = segments[j],
				seg4 = seg3.getNext();
			return seg1._handleOut.isZero() && seg2._handleIn.isZero()
					&& seg3._handleOut.isZero() && seg4._handleIn.isZero()
					&& seg2._point.subtract(seg1._point).isColinear(
						seg4._point.subtract(seg3._point));
		}

		// Returns true if the segment at the given index is the beginning of
		// a orthogonal arc segment. The code is looking at the length of the
		// handles and their relation to the distance to the imaginary corner
		// point. If the relation is kappa, then it's an arc.
		function isArc(i) {
			var segment = segments[i],
				next = segment.getNext(),
				handle1 = segment._handleOut,
				handle2 = next._handleIn,
				kappa = Numerical.KAPPA;
			if (handle1.isOrthogonal(handle2)) {
				var from = segment._point,
					to = next._point,
					// Find the corner point by intersecting the lines described
					// by both handles:
					corner = new Line(from, handle1, true).intersect(
							new Line(to, handle2, true), true);
				return corner && Numerical.isZero(handle1.getLength() /
						corner.subtract(from).getLength() - kappa)
					&& Numerical.isZero(handle2.getLength() /
						corner.subtract(to).getLength() - kappa);
			}
		}

		// See if actually have any curves in the path. Differentiate
		// between straight objects (line, polyline, rect, and  polygon) and
		// objects with curves(circle, ellipse, roundedRectangle).
		if (path.isPolygon()) {
			return  segments.length === 4 && path._closed
					&& isColinear(0, 2) && isColinear(1, 3)
					? 'rect'
					: segments.length === 0
						? 'empty'
						: segments.length >= 3
							? path._closed ? 'polygon' : 'polyline'
							: 'line';
		} else if (path._closed) {
			if (segments.length === 8
					&& isArc(0) && isArc(2) && isArc(4) && isArc(6)
					&& isColinear(1, 5) && isColinear(3, 7)) {
				return 'roundrect';
			} else if (segments.length === 4
					&& isArc(0) && isArc(1) && isArc(2) && isArc(3)) {
				// If the distance between (point0 and point2) and (point1
				// and point3) are equal, then it is a circle
				return Numerical.isZero(getDistance(segments, 0, 2)
						- getDistance(segments, 1, 3))
						? 'circle'
						: 'ellipse';
			} 
		}
		return 'path';
	}

	function exportGroup(item) {
		var attrs = getTransform(item),
			children = item._children;
		// Override default SVG style on groups, then apply style.
		attrs.fill = 'none';
		var node = createElement('g', attrs);
		for (var i = 0, l = children.length; i < l; i++) {
			var child = exportSVG(children[i]);
			if (child)
				node.appendChild(child);
		}
		return node;
	}

	function exportRaster(item) {
		var attrs = getTransform(item, true),
			size = item.getSize();
		attrs.x -= size.width / 2;
		attrs.y -= size.height / 2;
		attrs.width = size.width;
		attrs.height = size.height;
		attrs.href = item.toDataURL();
		return createElement('image', attrs);
	}

	function exportText(item) {
		var attrs = getTransform(item, true),
			style = item._style,
			font = style.getFont(),
			fontSize = style.getFontSize();
		if (font)
			attrs['font-family'] = font;
		if (fontSize)
			attrs['font-size'] = fontSize;
		var node = createElement('text', attrs);
		node.textContent = item._content;
		return node;
	}

	function exportPath(item) {
		var segments = item._segments,
			center = item.getPosition(true),
			type = determineType(item, segments),
			angle = determineAngle(item, segments, type, center),
			attrs;
		switch (type) {
		case 'empty':
			return null;
		case 'path':
			var data = item.getPathData();
			attrs = data && { d: data };
			break;
		case 'polyline':
		case 'polygon':
			var parts = [];
			for(i = 0, l = segments.length; i < l; i++)
				parts.push(formatter.point(segments[i]._point));
			attrs = {
				points: parts.join(' ')
			};
			break;
		case 'rect':
			var width = getDistance(segments, 0, 3),
				height = getDistance(segments, 0, 1),
				// Counter-compensate the determined rotation angle
				point = segments[1]._point.rotate(-angle, center);
			attrs = {
				x: point.x,
				y: point.y,
				width: width,
				height: height
			};
			break;
		case 'roundrect':
			type = 'rect';
			// d-variables and point are used to determine the rounded corners
			// for the rounded rectangle
			var width = getDistance(segments, 1, 6),
				height = getDistance(segments, 0, 3),
				// Subtract side lengths from total width and divide by 2 to get
				// corner radius size
				rx = (width - getDistance(segments, 0, 7)) / 2,
				ry = (height - getDistance(segments, 1, 2)) / 2,
				// Calculate topLeft corner point, by using sides vectors and
				// subtracting normalized rx vector to calculate arc corner. 
				left = segments[3]._point, // top-left side point
				right = segments[4]._point, // top-right side point
				point = left.subtract(right.subtract(left).normalize(rx))
						// Counter-compensate the determined rotation angle
						.rotate(-angle, center);
			attrs = {
				x: point.x,
				y: point.y,
				width: width,
				height: height,
				rx: rx,
				ry: ry
			};
			break;
		case'line':
			var first = segments[0]._point,
				last = segments[segments.length - 1]._point;
			attrs = {
				x1: first._x,
				y1: first._y,
				x2: last._x,
				y2: last._y
			};
			break;
		case 'circle':
			var radius = getDistance(segments, 0, 2) / 2;
			attrs = {
				cx: center.x,
				cy: center.y,
				r: radius
			};
			break;
		case 'ellipse':
			var rx = getDistance(segments, 2, 0) / 2,
				ry = getDistance(segments, 3, 1) / 2;
			attrs = {
				cx: center.x,
				cy: center.y,
				rx: rx,
				ry: ry
			};
			break;
		}
		if (angle) {
			attrs.transform = 'rotate(' + formatter.number(angle) + ','
					+ formatter.point(center) + ')';
			// Tell applyStyle() that to transform the gradient the other way
			item._gradientMatrix = new Matrix().rotate(-angle, center);
		}
		return createElement(type, attrs);
	}

	function exportCompoundPath(item) {
		var attrs = getTransform(item, true);
		var data = item.getPathData();
		if (data)
			attrs.d = data;
		return createElement('path', attrs);
	}

	function exportPlacedSymbol(item) {
		var attrs = getTransform(item, true),
			symbol = item.getSymbol(),
			symbolNode = getDefinition(symbol);
			definition = symbol.getDefinition(),
			bounds = definition.getBounds();
		if (!symbolNode) {
			symbolNode = createElement('symbol', {
				viewBox: formatter.rectangle(bounds)
			});
			symbolNode.appendChild(exportSVG(definition));
			setDefinition(symbol, symbolNode);
		}
		attrs.href = '#' + symbolNode.id;
		attrs.x += bounds.x;
		attrs.y += bounds.y;
		attrs.width = formatter.number(bounds.width);
		attrs.height = formatter.number(bounds.height);
		return createElement('use', attrs);
	}

	function exportGradient(color, item) {
		// NOTE: As long as the fillTransform attribute is not implemented,
		// we need to create a separate gradient object for each gradient,
		// even when they share the same gradient defintion.
		// http://www.svgopen.org/2011/papers/20-Separating_gradients_from_geometry/
		// TODO: Implement gradient merging in SVGImport
		var gradientNode = getDefinition(color);
		if (!gradientNode) {
			var gradient = color.getGradient(),
				radial = gradient._radial,
				matrix = item._gradientMatrix,
				origin = color.getOrigin().transform(matrix),
				destination = color.getDestination().transform(matrix),
				attrs;
			if (radial) {
				attrs = {
					cx: origin.x,
					cy: origin.y,
					r: origin.getDistance(destination)
				};
				var highlight = color.getHighlight();
				if (highlight) {
					highlight = highlight.transform(matrix);
					attrs.fx = highlight.x;
					attrs.fy = highlight.y;
				}
			} else {
				attrs = {
					x1: origin.x,
					y1: origin.y,
					x2: destination.x,
					y2: destination.y
				};
			}
			attrs.gradientUnits = 'userSpaceOnUse';
			gradientNode = createElement(
					(radial ? 'radial' : 'linear') + 'Gradient', attrs);
			var stops = gradient._stops;
			for (var i = 0, l = stops.length; i < l; i++) {
				var stop = stops[i],
					stopColor = stop._color,
					alpha = stopColor.getAlpha();
				attrs = {
					offset: stop._rampPoint,
					'stop-color': stopColor.toCss(true)
				};
				// See applyStyle for an explanation of why there are separated
				// opacity / color attributes.
				if (alpha < 1)
					attrs['stop-opacity'] = alpha;
				gradientNode.appendChild(createElement('stop', attrs));
			}
			setDefinition(color, gradientNode);
		}
		return 'url(#' + gradientNode.id + ')';
	}

	var exporters = {
		group: exportGroup,
		layer: exportGroup,
		raster: exportRaster,
		path: exportPath,
		'point-text': exportText,
		'placed-symbol': exportPlacedSymbol,
		'compound-path': exportCompoundPath
	};

	function applyStyle(item, node) {
		var attrs = {},
			style = item._style,
			parent = item.getParent(),
			parentStyle = parent && parent._style;

		if (item._name != null)
			attrs.id = item._name;

		Base.each(SVGStyles, function(entry) {
			// Get a given style only if it differs from the value on the parent
			// (A layer or group which can have style values in SVG).
			var value = style[entry.get]();
			if (!parentStyle || !Base.equals(parentStyle[entry.get](), value)) {
				if (entry.type === 'color' && value != null) {
					// Support for css-style rgba() values is not in SVG 1.1, so
					// separate the alpha value of colors with alpha into the
					// separate fill- / stroke-opacity attribute:
					var alpha = value.getAlpha();
					if (alpha < 1)
						attrs[entry.attribute + '-opacity'] = alpha;
				}
				attrs[entry.attribute] = value == null
					? 'none'
					: entry.type === 'color'
						? value.gradient
							? exportGradient(value, item)
							: value.toCss(true) // false for noAlpha, see above	
						: entry.type === 'array'
							? value.join(',')
							: entry.type === 'number'
								? formatter.number(value)
								: value;
			}
		});

		if (item._opacity != null && item._opacity < 1)
			attrs.opacity = item._opacity;

		if (item._visibility != null && !item._visibility)
			attrs.visibility = 'hidden';

		delete item._gradientMatrix; // see exportPath()
		return setAttributes(node, attrs);
	}

	var definitions;
	function getDefinition(item) {
		if (!definitions)
			definitions = { ids: {}, svgs: {} };
		return definitions.svgs[item._id];
	}

	function setDefinition(item, node) {
		var type = item._type,
			id = definitions.ids[type] = (definitions.ids[type] || 0) + 1;
		node.id = type + '-' + id;
		definitions.svgs[item._id] = node;
	}

	function exportDefinitions(node) {
		if (!definitions)
			return node;
		// We can only use svg nodes as defintion containers. Have the loop
		// produce one if it's a single item of another type (when calling
		// #exportSVG() on an item rather than a whole project)
		// jsdom in Node.js uses uppercase values for nodeName...
		var container = node.nodeName.toLowerCase() === 'svg' && node,
			firstChild = container ? container.firstChild : node;
		for (var i in definitions.svgs) {
			if (!container) {
				container = createElement('svg');
				container.appendChild(node);
			}
			container.insertBefore(definitions.svgs[i], firstChild);
		}
		// Clear definitions at the end of export
		definitions = null;
		return container;
	}

	function exportSVG(item) {
		var exporter = exporters[item._type],
			node = exporter && exporter(item, item._type);
		if (node && item._data)
			node.setAttribute('data-paper-data', JSON.stringify(item._data));
		return node && applyStyle(item, node);
	}

	Item.inject(/** @lends Item# */{
		/**
		 * {@grouptitle SVG Conversion}
		 *
		 * Exports the item and all its children as an SVG DOM, all contained
		 * in one top level SVG node.
		 *
		 * @return {SVGSVGElement} the item converted to an SVG node
		 */
		exportSVG: function() {
			var node = exportSVG(this);
			return exportDefinitions(node);
		}
	});

	Project.inject(/** @lends Project# */{
		/**
		 * {@grouptitle SVG Conversion}
		 *
		 * Exports the project and all its layers and child items as an SVG DOM,
		 * all contained in one top level SVG group node.
		 *
		 * @return {SVGSVGElement} the project converted to an SVG node
		 */
		exportSVG: function() {
			var node = createElement('svg'),
				layers = this.layers,
				size = this.view.getSize();
			for (var i = 0, l = layers.length; i < l; i++)
				node.appendChild(exportSVG(layers[i]));
			return setAttributes(exportDefinitions(node), {
				x: 0,
				y: 0,
				width: size.width,
				height: size.height,
				version: '1.1',
				xmlns: 'http://www.w3.org/2000/svg',
				xlink: 'http://www.w3.org/1999/xlink'
			});
		}
	});
};

/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2013, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

/**
 * A function scope holding all the functionality needed to convert a SVG DOM
 * to a Paper.js DOM.
 */
new function() {
	// Define a couple of helper functions to easily read values from SVG
	// objects, dealing with baseVal, and item lists.
	// index is option, and if passed, causes a lookup in a list.

	function getValue(node, name, isString, allowNull) {
		var namespace = SVGNamespaces[name],
			value = namespace
				? node.getAttributeNS(namespace, name)
				: node.getAttribute(name);
		if (value == 'null')
			value = null;
		// Interpret value as number. Never return NaN, but 0 instead.
		// If the value is a sequence of numbers, parseFloat will
		// return the first occuring number, which is enough for now.
		return value == null
				? allowNull
					? null
					: isString
						? ''
						: 0
				: isString
					? value
					: parseFloat(value);
	}

	function getPoint(node, x, y, allowNull) {
		x = getValue(node, x, false, allowNull);
		y = getValue(node, y, false, allowNull);
		return allowNull && x == null && y == null ? null
				: new Point(x || 0, y || 0);
	}

	function getSize(node, w, h, allowNull) {
		w = getValue(node, w, false, allowNull);
		h = getValue(node, h, false, allowNull);
		return allowNull && w == null && h == null ? null
				: new Size(w || 0, h || 0);
	}

	// Converts a string attribute value to the specified type
	function convertValue(value, type) {
		return value === 'none'
				? null
				: type === 'number'
					? parseFloat(value)
					: type === 'array'
						? value ? value.split(/[\s,]+/g).map(parseFloat) : []
						: type === 'color' && getDefinition(value)
							|| value;
	}

	// Importer functions for various SVG node types

	function importGroup(node, type) {
		var nodes = node.childNodes,
			clip = type === 'clippath',
			item = clip ? new CompoundPath() : new Group(),
			project = item._project,
			currentStyle = project._currentStyle;
		// Style on items needs to be handled differently than all other items:
		// We first apply the style to the item, then use it as the project's
		// currentStyle, so it is used as a default for the creation of all
		// nested items. importSVG then needs to check for items and avoid
		// calling applyAttributes() again.
		// Set the default color to black, since that's how SVG handles fills.
		item.setFillColor('black');
		if (!clip) {
			item = applyAttributes(item, node);
			project._currentStyle = item._style.clone();
		}
		for (var i = 0, l = nodes.length; i < l; i++) {
			var childNode = nodes[i],
				child;
			if (childNode.nodeType == 1 && (child = importSVG(childNode))) {
				// If adding CompoundPaths to other CompoundPaths,
				// we need to "unbox" them first:
				if (clip && child._type === 'compound-path') {
					item.addChildren(child.removeChildren());
					child.remove();
				} else if (!(child instanceof Symbol)) {
					item.addChild(child);
				}
			}
		}
		// clip paths are reduced (unboxed) and their attributes applied at the
		// end.
		if (clip)
			item = applyAttributes(item.reduce(), node);
		// Restore currentStyle
		project._currentStyle = currentStyle;
		if (clip || type === 'defs') {
			// We don't want the defs in the DOM. But we might want to use
			// Symbols for them to save memory?
			item.remove();
			item = null;
		}
		return item;
	}

	function importPoly(node, type) {
		var path = new Path(),
			points = node.points;
		path.moveTo(points.getItem(0));
		for (var i = 1, l = points.numberOfItems; i < l; i++)
			path.lineTo(points.getItem(i));
		if (type === 'polygon')
			path.closePath();
		return path;
	}

	function importPath(node) {
		// Get the path data, and determine wether it is a compound path or a
		// normal path based on the amount of moveTo commands inside it.
		var data = node.getAttribute('d'),
			path = data.match(/m/gi).length > 1
					? new CompoundPath()
					: new Path();
		path.setPathData(data);
		return path;
	}

	function importGradient(node, type) {
		var nodes = node.childNodes,
			stops = [];
		for (var i = 0, l = nodes.length; i < l; i++) {
			var child = nodes[i];
			if (child.nodeType == 1)
				stops.push(applyAttributes(new GradientStop(), child));
		}
		var isRadial = type === 'radialgradient',
			gradient = new Gradient(stops, isRadial),
			origin, destination, highlight;
		if (isRadial) {
			origin = getPoint(node, 'cx', 'cy');
			destination = origin.add(getValue(node, 'r'), 0);
			highlight = getPoint(node, 'fx', 'fy', true);
		} else {
			origin = getPoint(node, 'x1', 'y1');
			destination = getPoint(node, 'x2', 'y2');
		}
		applyAttributes(
			new Color(gradient, origin, destination, highlight), node);
		// We don't return the gradient, since we only need a reference to it in
		// definitions, which is created in applyAttributes()
		return null;
	}

	// NOTE: All importers are lowercase, since jsdom is using uppercase
	// nodeNames still.
	var importers = {
		// http://www.w3.org/TR/SVG/struct.html#Groups
		g: importGroup,
		// http://www.w3.org/TR/SVG/struct.html#NewDocument
		svg: importGroup,
		clippath: importGroup,
		// http://www.w3.org/TR/SVG/shapes.html#PolygonElement
		polygon: importPoly,
		// http://www.w3.org/TR/SVG/shapes.html#PolylineElement
		polyline: importPoly,
		// http://www.w3.org/TR/SVG/paths.html
		path: importPath,
		// http://www.w3.org/TR/SVG/pservers.html#LinearGradients
		lineargradient: importGradient,
		// http://www.w3.org/TR/SVG/pservers.html#RadialGradients
		radialgradient: importGradient,

		// http://www.w3.org/TR/SVG/struct.html#ImageElement
		image: function (node) {
			var raster = new Raster(getValue(node, 'href', true));
			raster.attach('load', function() {
				var size = getSize(node, 'width', 'height');
				this.setSize(size);
				// Since x and y start from the top left of an image, add
				// half of its size:
				this.translate(getPoint(node, 'x', 'y').add(size.divide(2)));
			});
			return raster;
		},

		// http://www.w3.org/TR/SVG/struct.html#SymbolElement
		symbol: function(node, type) {
			// Pass true for dontCenter:
			return new Symbol(importGroup(node, type), true);
		},

		// http://www.w3.org/TR/SVG/struct.html#DefsElement
		defs: importGroup,

		// http://www.w3.org/TR/SVG/struct.html#UseElement
		use: function(node, type) {
			// Note the namespaced xlink:href attribute is just called href
			// as a property on node.
			// TODO: Support overflow and width, height, in combination with
			// overflow: hidden. Paper.js currently does not suport PlacedSymbol
			// clipping, but perhaps it should?
			var id = (getValue(node, 'href', true) || '').substring(1),
				definition = definitions[id],
				point = getPoint(node, 'x', 'y');
			// Use place if we're dealing with a symbol:
			return definition
					? definition instanceof Symbol
						// When placing symbols, we nee to take both point and
						// matrix into account. This just does the right thing:
						? definition.place(point)
						: definition.clone().translate(point)
					: null;
		},

		// http://www.w3.org/TR/SVG/shapes.html#InterfaceSVGCircleElement
		circle: function(node) {
			return new Path.Circle(getPoint(node, 'cx', 'cy'),
					getValue(node, 'r'));
		},

		// http://www.w3.org/TR/SVG/shapes.html#InterfaceSVGEllipseElement
		ellipse: function(node) {
			var center = getPoint(node, 'cx', 'cy'),
				radius = getSize(node, 'rx', 'ry');
			return new Path.Ellipse(new Rectangle(center.subtract(radius),
					center.add(radius)));
		},

		// http://www.w3.org/TR/SVG/shapes.html#RectElement
		rect: function(node) {
			var point = getPoint(node, 'x', 'y'),
				size = getSize(node, 'width', 'height'),
				radius = getSize(node, 'rx', 'ry');
			return new Path.Rectangle(new Rectangle(point, size), radius);
		},

		// http://www.w3.org/TR/SVG/shapes.html#LineElement
		line: function(node) {
			return new Path.Line(getPoint(node, 'x1', 'y1'),
					getPoint(node, 'x2', 'y2'));
		},

		text: function(node) {
			// Not supported by Paper.js
			// x: multiple values for x
			// y: multiple values for y
			// dx: multiple values for x
			// dy: multiple values for y
			// TODO: Support for these is missing in Paper.js right now
			// rotate: character rotation
			// lengthAdjust:
			var text = new PointText(getPoint(node, 'x', 'y', false)
					.add(getPoint(node, 'dx', 'dy', false)));
			text.setContent(node.textContent.trim() || '');
			return text;
		}
	};

	// Attributes and Styles

	// NOTE: Parmeter sequence for all apply*() functions is: 
	// (item, value, name, node) rather than (item, node, name, value),
	// so we can ommit the less likely parameters from right to left.

	function applyTransform(item, value, name, node) {
		// http://www.w3.org/TR/SVG/types.html#DataTypeTransformList
		// Parse SVG transform string. First we split at /)\s*/, to separate
		// commands
		var transforms = (node.getAttribute(name) || '').split(/\)\s*/g),
			matrix = new Matrix();
		for (var i = 0, l = transforms.length; i < l; i++) {
			var transform = transforms[i];
			if (!transform)
				break;
			// Command come before the '(', values after
			var parts = transform.split('('),
				command = parts[0],
				v = parts[1].split(/[\s,]+/g);
			// Convert values to floats
			for (var j = 0, m = v.length; j < m; j++)
				v[j] = parseFloat(v[j]);
			switch (command) {
			case 'matrix':
				matrix.concatenate(
						new Matrix(v[0], v[2], v[1], v[3], v[4], v[5]));
				break;
			case 'rotate':
				matrix.rotate(v[0], v[1], v[2]);
				break;
			case 'translate':
				matrix.translate(v[0], v[1]);
				break;
			case 'scale':
				matrix.scale(v);
				break;
			case 'skewX':
			case 'skewY':
				var value = Math.tan(v[0] * Math.PI / 180),
					isX = command == 'skewX';
				matrix.shear(isX ? value : 0, isX ? 0 : value);
				break;
			}
		}
		item.transform(matrix);
	}

	function applyOpacity(item, value, name) {
		// http://www.w3.org/TR/SVG/painting.html#FillOpacityProperty
		// http://www.w3.org/TR/SVG/painting.html#StrokeOpacityProperty
		var color = item._style[name === 'fill-opacity' ? 'getFillColor'
				: 'getStrokeColor']();
		if (color)
			color.setAlpha(parseFloat(value));
	}

	// Create apply-functions for attributes, and merge in those for SVGStlyes.
	// We need to define style attributes first, and merge in all others after,
	// since transform needs to be applied after fill color, as transformations
	// can affect gradient fills.
	var attributes = Base.merge(Base.each(SVGStyles, function(entry) {
		this[entry.attribute] = function(item, value, name, node) {
			item._style[entry.set](convertValue(value, entry.type));
		};
	}, {}), {
		id: function(item, value) {
			definitions[value] = item;
			if (item.setName)
				item.setName(value);
		},

		'clip-path': function(item, value) {
			// http://www.w3.org/TR/SVG/masking.html#ClipPathProperty
			var clip = getDefinition(value);
			if (clip) {
				clip = clip.clone();
				clip.setClipMask(true);
				return new Group(clip, item);
			}
		},

		gradientTransform: applyTransform,
		transform: applyTransform,

		opacity: function(item, value) {
			// http://www.w3.org/TR/SVG/masking.html#OpacityProperty
			item.setOpacity(parseFloat(value));
		},

		'fill-opacity': applyOpacity,
		'stroke-opacity': applyOpacity,

		'font-family': function(item, value) {
			item.setFont(value.split(',')[0].replace(/^\s+|\s+$/g, ''));
		},

		'font-size': function(item, value) {
			item.setFontSize(parseFloat(value));
		},

		'text-anchor': function(item, value) {
			// http://www.w3.org/TR/SVG/text.html#TextAnchorProperty
			item.setJustification({
				start: 'left',
				middle: 'center',
				end: 'right'
			}[value]);
		},

		visibility: function(item, value) {
			item.setVisible(value === 'visible');
		},

		'stop-color': function(item, value) {
			// http://www.w3.org/TR/SVG/pservers.html#StopColorProperty
			if (item.setColor)
				item.setColor(value);
		},

		'stop-opacity': function(item, value) {
			// http://www.w3.org/TR/SVG/pservers.html#StopOpacityProperty
			// NOTE: It is important that this is applied after stop-color!
			if (item._color)
				item._color.setAlpha(parseFloat(value));
		},

		offset: function(item, value) {
			// http://www.w3.org/TR/SVG/pservers.html#StopElementOffsetAttribute
			var percentage = value.match(/(.*)%$/);
			item.setRampPoint(percentage
					? percentage[1] / 100
					: parseFloat(value));
		},

		viewBox: function(item, value, name, node, styles) {
			// http://www.w3.org/TR/SVG/coords.html#ViewBoxAttribute
			// TODO: implement preserveAspectRatio attribute
			// viewBox will be applied both to the group that's created for the
			// content in Symbol.definition, and the Symbol itself.
			var rect = Rectangle.create.apply(this, convertValue(value, 'array')),
				size = getSize(node, 'width', 'height', true);
			if (item instanceof Group) {
				// This is either a top-level svg node, or the container for a
				// symbol.
				var scale = size ? rect.getSize().divide(size) : 1,
					matrix = new Matrix().translate(rect.getPoint()).scale(scale);
				item.transform(matrix.inverted());
			} else if (item instanceof Symbol) {
				// The symbol is wrapping a group. Note that viewBox was already
				// applied to the group, and above code was executed for it.
				// All that is left to handle here on the Symbol level is
				// clipping. We can't do it at group level because
				// applyAttributes() gets called for groups before their
				// children are added, for styling reasons. See importGroup()
				if (size)
					rect.setSize(size);
				var clip = getAttribute(node, 'overflow', styles) != 'visible',
					group = item._definition;
				if (clip && !rect.contains(group.getBounds())) {
					// Add a clip path at the top of this symbol's group
					clip = new Path.Rectangle(rect).transform(group._matrix);
					clip.setClipMask(true);
					group.addChild(clip);
				}
			}
		}
	});

	function getAttribute(node, name, styles) {
		// First see if the given attribute is defined.
		var attr = node.attributes[name],
			value = attr && attr.value;
		if (!value) {
			// Fallback to using styles. See if there is a style, either set
			// directly on the object or applied to it through CSS rules.
			// We also need to filter out inheritance from their parents.
			var style = Base.camelize(name);
			value = node.style[style];
			if (!value && styles.node[style] !== styles.parent[style])
				value = styles.node[style];
		}
		// Return undefined if attribute is not defined, but null if it's
		// defined as not set (e.g. fill / stroke).
		return !value
				? undefined
				: value === 'none'
					? null
					: value;
	}

	/**
	 * Converts various SVG styles and attributes into Paper.js styles and
	 * attributes and applies them to the passed item.
	 *
	 * @param {SVGSVGElement} node an SVG node to read style and attributes from.
	 * @param {Item} item the item to apply the style and attributes to.
	 */
	function applyAttributes(item, node) {
		// SVG attributes can be set both as styles and direct node attributes,
		// so we need to handle both.
		var styles = {
			node: DomElement.getStyles(node) || {},
			parent: DomElement.getStyles(node.parentNode) || {}
		};
		Base.each(attributes, function(apply, name) {
			var value = getAttribute(node, name, styles);
			if (value !== undefined)
				item = Base.pick(apply(item, value, name, node, styles), item);
		});
		return item;
	}

	var definitions = {};
	function getDefinition(value) {
		// When url() comes from a style property, '#'' seems to be missing on 
		// WebKit, so let's make it optional here:
		var match = value && value.match(/\((?:#|)([^)']+)/);
		return match && definitions[match[1]];
	}

	function importSVG(node, clearDefs) {
		if (typeof node === 'string')
			node = new DOMParser().parseFromString(node, 'image/svg+xml');
		// jsdom in Node.js uses uppercase values for nodeName...
		var type = node.nodeName.toLowerCase(),
			importer = importers[type],
			item = importer && importer(node, type),
			data = node.getAttribute('data-paper-data');
		// See importGroup() for an explanation of this filtering:
		if (item && item._type !== 'group')
			item = applyAttributes(item, node);
		if (item && data)
			item._data = JSON.parse(data);
		// Clear definitions at the end of import?
		if (clearDefs)
			definitions = {};
		return item;
	}

	Item.inject(/** @lends Item# */{
		/**
		 * Converts the passed node node into a Paper.js item and adds it to the
		 * children of this item.
		 *
		 * @param {SVGSVGElement} node the SVG DOM node to convert
		 * @return {Item} the converted Paper.js item
		 */
		importSVG: function(node) {
			return this.addChild(importSVG(node, true));
		}
	});

	Project.inject(/** @lends Project# */{
		/**
		 * Converts the passed node node into a Paper.js item and adds it to the
		 * active layer of this project.
		 *
		 * @param {SVGSVGElement} node the SVG DOM node to convert
		 * @return {Item} the converted Paper.js item
		 */
		importSVG: function(node) {
			this.activate();
			return importSVG(node, true);
		}
	});
};


/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2013, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

/**
 * @name PaperScript
 * @namespace
 */

(function(e){return"object"==typeof exports&&"object"==typeof module?e(exports):"function"==typeof define&&define.amd?define(["exports"],e):(e(this.acorn||(this.acorn={})),void 0)})(function(e){"use strict";function r(e){fr=e||{};for(var r in hr)fr.hasOwnProperty(r)||(fr[r]=hr[r]);mr=fr.sourceFile||null}function t(e,r){var t=vr(pr,e);r+=" ("+t.line+":"+t.column+")";var n=new SyntaxError(r);throw n.pos=e,n.loc=t,n.raisedAt=br,n}function n(e){function r(e){if(1==e.length)return t+="return str === "+JSON.stringify(e[0])+";";t+="switch(str){";for(var r=0;e.length>r;++r)t+="case "+JSON.stringify(e[r])+":";t+="return true}return false;"}e=e.split(" ");var t="",n=[];e:for(var a=0;e.length>a;++a){for(var o=0;n.length>o;++o)if(n[o][0].length==e[a].length){n[o].push(e[a]);continue e}n.push([e[a]])}if(n.length>3){n.sort(function(e,r){return r.length-e.length}),t+="switch(str.length){";for(var a=0;n.length>a;++a){var i=n[a];t+="case "+i[0].length+":",r(i)}t+="}"}else r(e);return Function("str",t)}function a(){this.line=Ar,this.column=br-Sr}function o(){Ar=1,br=Sr=0,Er=!0,u()}function i(e,r){gr=br,fr.locations&&(kr=new a),wr=e,u(),Cr=r,Er=e.beforeExpr}function s(){var e=fr.onComment&&fr.locations&&new a,r=br,n=pr.indexOf("*/",br+=2);if(-1===n&&t(br-2,"Unterminated comment"),br=n+2,fr.locations){Kt.lastIndex=r;for(var o;(o=Kt.exec(pr))&&br>o.index;)++Ar,Sr=o.index+o[0].length}fr.onComment&&fr.onComment(!0,pr.slice(r+2,n),r,br,e,fr.locations&&new a)}function c(){for(var e=br,r=fr.onComment&&fr.locations&&new a,t=pr.charCodeAt(br+=2);dr>br&&10!==t&&13!==t&&8232!==t&&8329!==t;)++br,t=pr.charCodeAt(br);fr.onComment&&fr.onComment(!1,pr.slice(e+2,br),e,br,r,fr.locations&&new a)}function u(){for(;dr>br;){var e=pr.charCodeAt(br);if(32===e)++br;else if(13===e){++br;var r=pr.charCodeAt(br);10===r&&++br,fr.locations&&(++Ar,Sr=br)}else if(10===e)++br,++Ar,Sr=br;else if(14>e&&e>8)++br;else if(47===e){var r=pr.charCodeAt(br+1);if(42===r)s();else{if(47!==r)break;c()}}else if(14>e&&e>8||32===e||160===e)++br;else{if(!(e>=5760&&Wt.test(String.fromCharCode(e))))break;++br}}}function l(){var e=pr.charCodeAt(br+1);return e>=48&&57>=e?E(!0):(++br,i(gt))}function f(){var e=pr.charCodeAt(br+1);return Er?(++br,k()):61===e?x(Ct,2):x(kt,1)}function p(){var e=pr.charCodeAt(br+1);return 61===e?x(Ct,2):x(Ot,1)}function d(e){var r=pr.charCodeAt(br+1);return r===e?x(124===e?It:Lt,2):61===r?x(Ct,2):x(124===e?Ut:Tt,1)}function m(){var e=pr.charCodeAt(br+1);return 61===e?x(Ct,2):x(Rt,1)}function h(e){var r=pr.charCodeAt(br+1);return r===e?x(At,2):61===r?x(Ct,2):x(Et,1)}function v(e){var r=pr.charCodeAt(br+1),t=1;return r===e?(t=62===e&&62===pr.charCodeAt(br+2)?3:2,61===pr.charCodeAt(br+t)?x(Ct,t+1):x(Ft,t)):(61===r&&(t=61===pr.charCodeAt(br+2)?3:2),x(qt,t))}function b(e){var r=pr.charCodeAt(br+1);return 61===r?x(Vt,61===pr.charCodeAt(br+2)?3:2):x(61===e?wt:St,1)}function y(e){switch(e){case 46:return l();case 40:return++br,i(mt);case 41:return++br,i(ht);case 59:return++br,i(bt);case 44:return++br,i(vt);case 91:return++br,i(lt);case 93:return++br,i(ft);case 123:return++br,i(pt);case 125:return++br,i(dt);case 58:return++br,i(yt);case 63:return++br,i(xt);case 48:var r=pr.charCodeAt(br+1);if(120===r||88===r)return C();case 49:case 50:case 51:case 52:case 53:case 54:case 55:case 56:case 57:return E(!1);case 34:case 39:return A(e);case 47:return f(e);case 37:case 42:return p();case 124:case 38:return d(e);case 94:return m();case 43:case 45:return h(e);case 60:case 62:return v(e);case 61:case 33:return b(e);case 126:return x(St,1)}return!1}function g(e){if(e?br=yr+1:yr=br,fr.locations&&(xr=new a),e)return k();if(br>=dr)return i(Dr);var r=pr.charCodeAt(br);if(Qt(r)||92===r)return L();var n=y(r);if(n===!1){var o=String.fromCharCode(r);if("\\"===o||$t.test(o))return L();t(br,"Unexpected character '"+o+"'")}return n}function x(e,r){var t=pr.slice(br,br+r);br+=r,i(e,t)}function k(){for(var e,r,n="",a=br;;){br>=dr&&t(a,"Unterminated regular expression");var o=pr.charAt(br);if(Ht.test(o)&&t(a,"Unterminated regular expression"),e)e=!1;else{if("["===o)r=!0;else if("]"===o&&r)r=!1;else if("/"===o&&!r)break;e="\\"===o}++br}var n=pr.slice(a,br);++br;var s=I();return s&&!/^[gmsiy]*$/.test(s)&&t(a,"Invalid regexp flag"),i(Fr,RegExp(n,s))}function w(e,r){for(var t=br,n=0,a=0,o=null==r?1/0:r;o>a;++a){var i,s=pr.charCodeAt(br);if(i=s>=97?s-97+10:s>=65?s-65+10:s>=48&&57>=s?s-48:1/0,i>=e)break;++br,n=n*e+i}return br===t||null!=r&&br-t!==r?null:n}function C(){br+=2;var e=w(16);return null==e&&t(yr+2,"Expected hexadecimal number"),Qt(pr.charCodeAt(br))&&t(br,"Identifier directly after number"),i(qr,e)}function E(e){var r=br,n=!1,a=48===pr.charCodeAt(br);e||null!==w(10)||t(r,"Invalid number"),46===pr.charCodeAt(br)&&(++br,w(10),n=!0);var o=pr.charCodeAt(br);(69===o||101===o)&&(o=pr.charCodeAt(++br),(43===o||45===o)&&++br,null===w(10)&&t(r,"Invalid number"),n=!0),Qt(pr.charCodeAt(br))&&t(br,"Identifier directly after number");var s,c=pr.slice(r,br);return n?s=parseFloat(c):a&&1!==c.length?/[89]/.test(c)||Vr?t(r,"Invalid number"):s=parseInt(c,8):s=parseInt(c,10),i(qr,s)}function A(e){br++;for(var r="";;){br>=dr&&t(yr,"Unterminated string constant");var n=pr.charCodeAt(br);if(n===e)return++br,i(Or,r);if(92===n){n=pr.charCodeAt(++br);var a=/^[0-7]+/.exec(pr.slice(br,br+3));for(a&&(a=a[0]);a&&parseInt(a,8)>255;)a=a.slice(0,a.length-1);if("0"===a&&(a=null),++br,a)Vr&&t(br-2,"Octal literal in strict mode"),r+=String.fromCharCode(parseInt(a,8)),br+=a.length-1;else switch(n){case 110:r+="\n";break;case 114:r+="\r";break;case 120:r+=String.fromCharCode(S(2));break;case 117:r+=String.fromCharCode(S(4));break;case 85:r+=String.fromCharCode(S(8));break;case 116:r+="	";break;case 98:r+="\b";break;case 118:r+="";break;case 102:r+="\f";break;case 48:r+="\0";break;case 13:10===pr.charCodeAt(br)&&++br;case 10:fr.locations&&(Sr=br,++Ar);break;default:r+=String.fromCharCode(n)}}else(13===n||10===n||8232===n||8329===n)&&t(yr,"Unterminated string constant"),r+=String.fromCharCode(n),++br}}function S(e){var r=w(16,e);return null===r&&t(yr,"Bad character escape sequence"),r}function I(){Dt=!1;for(var e,r=!0,n=br;;){var a=pr.charCodeAt(br);if(Yt(a))Dt&&(e+=pr.charAt(br)),++br;else{if(92!==a)break;Dt||(e=pr.slice(n,br)),Dt=!0,117!=pr.charCodeAt(++br)&&t(br,"Expecting Unicode escape sequence \\uXXXX"),++br;var o=S(4),i=String.fromCharCode(o);i||t(br-1,"Invalid Unicode escape"),(r?Qt(o):Yt(o))||t(br-4,"Invalid Unicode escape"),e+=i}r=!1}return Dt?e:pr.slice(n,br)}function L(){var e=I(),r=jr;return Dt||(Nt(e)?r=ut[e]:(fr.forbidReserved&&(3===fr.ecmaVersion?Bt:Mt)(e)||Vr&&zt(e))&&t(yr,"The keyword '"+e+"' is reserved")),i(r,e)}function U(){Ir=yr,Lr=gr,Ur=kr,g()}function R(e){for(Vr=e,br=Lr;Sr>br;)Sr=pr.lastIndexOf("\n",Sr-2)+1,--Ar;u(),g()}function T(){this.type=null,this.start=yr,this.end=null}function V(){this.start=xr,this.end=null,null!==mr&&(this.source=mr)}function q(){var e=new T;return fr.locations&&(e.loc=new V),fr.ranges&&(e.range=[yr,0]),e}function F(e){var r=new T;return r.start=e.start,fr.locations&&(r.loc=new V,r.loc.start=e.loc.start),fr.ranges&&(r.range=[e.range[0],0]),r}function O(e,r){return e.type=r,e.end=Lr,fr.locations&&(e.loc.end=Ur),fr.ranges&&(e.range[1]=Lr),e}function j(e){return fr.ecmaVersion>=5&&"ExpressionStatement"===e.type&&"Literal"===e.expression.type&&"use strict"===e.expression.value}function D(e){return wr===e?(U(),!0):void 0}function B(){return!fr.strictSemicolons&&(wr===Dr||wr===dt||Ht.test(pr.slice(Lr,yr)))}function M(){D(bt)||B()||X()}function z(e){wr===e?U():X()}function X(){t(yr,"Unexpected token")}function N(e){"Identifier"!==e.type&&"MemberExpression"!==e.type&&t(e.start,"Assigning to rvalue"),Vr&&"Identifier"===e.type&&Xt(e.name)&&t(e.start,"Assigning to "+e.name+" in strict mode")}function W(e){Ir=Lr=br,fr.locations&&(Ur=new a),Rr=Vr=null,Tr=[],g();var r=e||q(),t=!0;for(e||(r.body=[]);wr!==Dr;){var n=J();r.body.push(n),t&&j(n)&&R(!0),t=!1}return O(r,"Program")}function J(){wr===kt&&g(!0);var e=wr,r=q();switch(e){case Br:case Xr:U();var n=e===Br;D(bt)||B()?r.label=null:wr!==jr?X():(r.label=lr(),M());for(var a=0;Tr.length>a;++a){var o=Tr[a];if(null==r.label||o.name===r.label.name){if(null!=o.kind&&(n||"loop"===o.kind))break;if(r.label&&n)break}}return a===Tr.length&&t(r.start,"Unsyntactic "+e.keyword),O(r,n?"BreakStatement":"ContinueStatement");case Nr:return U(),M(),O(r,"DebuggerStatement");case Jr:return U(),Tr.push(Zt),r.body=J(),Tr.pop(),z(rt),r.test=P(),M(),O(r,"DoWhileStatement");case Gr:if(U(),Tr.push(Zt),z(mt),wr===bt)return G(r,null);if(wr===et){var i=q();return U(),K(i,!0),1===i.declarations.length&&D(ct)?H(r,i):G(r,i)}var i=Q(!1,!0);return D(ct)?(N(i),H(r,i)):G(r,i);case Hr:return U(),cr(r,!0);case Kr:return U(),r.test=P(),r.consequent=J(),r.alternate=D(Pr)?J():null,O(r,"IfStatement");case Qr:return Rr||t(yr,"'return' outside of function"),U(),D(bt)||B()?r.argument=null:(r.argument=Q(),M()),O(r,"ReturnStatement");case Yr:U(),r.discriminant=P(),r.cases=[],z(pt),Tr.push(_t);for(var s,c;wr!=dt;)if(wr===Mr||wr===Wr){var u=wr===Mr;s&&O(s,"SwitchCase"),r.cases.push(s=q()),s.consequent=[],U(),u?s.test=Q():(c&&t(Ir,"Multiple default clauses"),c=!0,s.test=null),z(yt)}else s||X(),s.consequent.push(J());return s&&O(s,"SwitchCase"),U(),Tr.pop(),O(r,"SwitchStatement");case Zr:return U(),Ht.test(pr.slice(Lr,yr))&&t(Lr,"Illegal newline after throw"),r.argument=Q(),M(),O(r,"ThrowStatement");case _r:if(U(),r.block=$(),r.handler=null,wr===zr){var l=q();U(),z(mt),l.param=lr(),Vr&&Xt(l.param.name)&&t(l.param.start,"Binding "+l.param.name+" in strict mode"),z(ht),l.guard=null,l.body=$(),r.handler=O(l,"CatchClause")}return r.finalizer=D($r)?$():null,r.handler||r.finalizer||t(r.start,"Missing catch or finally clause"),O(r,"TryStatement");case et:return U(),r=K(r),M(),r;case rt:return U(),r.test=P(),Tr.push(Zt),r.body=J(),Tr.pop(),O(r,"WhileStatement");case tt:return Vr&&t(yr,"'with' in strict mode"),U(),r.object=P(),r.body=J(),O(r,"WithStatement");case pt:return $();case bt:return U(),O(r,"EmptyStatement");default:var f=Cr,p=Q();if(e===jr&&"Identifier"===p.type&&D(yt)){for(var a=0;Tr.length>a;++a)Tr[a].name===f&&t(p.start,"Label '"+f+"' is already declared");var d=wr.isLoop?"loop":wr===Yr?"switch":null;return Tr.push({name:f,kind:d}),r.body=J(),Tr.pop(),r.label=p,O(r,"LabeledStatement")}return r.expression=p,M(),O(r,"ExpressionStatement")}}function P(){z(mt);var e=Q();return z(ht),e}function $(){var e,r=q(),t=!0,n=!1;for(r.body=[],z(pt);!D(dt);){var a=J();r.body.push(a),t&&j(a)&&(e=n,R(n=!0)),t=!1}return n&&!e&&R(!1),O(r,"BlockStatement")}function G(e,r){return e.init=r,z(bt),e.test=wr===bt?null:Q(),z(bt),e.update=wr===ht?null:Q(),z(ht),e.body=J(),Tr.pop(),O(e,"ForStatement")}function H(e,r){return e.left=r,e.right=Q(),z(ht),e.body=J(),Tr.pop(),O(e,"ForInStatement")}function K(e,r){for(e.declarations=[],e.kind="var";;){var n=q();if(n.id=lr(),Vr&&Xt(n.id.name)&&t(n.id.start,"Binding "+n.id.name+" in strict mode"),n.init=D(wt)?Q(!0,r):null,e.declarations.push(O(n,"VariableDeclarator")),!D(vt))break}return O(e,"VariableDeclaration")}function Q(e,r){var t=Y(r);if(!e&&wr===vt){var n=F(t);for(n.expressions=[t];D(vt);)n.expressions.push(Y(r));return O(n,"SequenceExpression")}return t}function Y(e){var r=Z(e);if(wr.isAssign){var t=F(r);return t.operator=Cr,t.left=r,U(),t.right=Y(e),N(r),O(t,"AssignmentExpression")}return r}function Z(e){var r=_(e);if(D(xt)){var t=F(r);return t.test=r,t.consequent=Q(!0),z(yt),t.alternate=Q(!0,e),O(t,"ConditionalExpression")}return r}function _(e){return er(rr(e),-1,e)}function er(e,r,t){var n=wr.binop;if(null!=n&&(!t||wr!==ct)&&n>r){var a=F(e);a.left=e,a.operator=Cr,U(),a.right=er(rr(t),n,t);var a=O(a,/&&|\|\|/.test(a.operator)?"LogicalExpression":"BinaryExpression");return er(a,r,t)}return e}function rr(e){if(wr.prefix){var r=q(),n=wr.isUpdate;return r.operator=Cr,r.prefix=!0,U(),r.argument=rr(e),n?N(r.argument):Vr&&"delete"===r.operator&&"Identifier"===r.argument.type&&t(r.start,"Deleting local variable in strict mode"),O(r,n?"UpdateExpression":"UnaryExpression")}for(var a=tr();wr.postfix&&!B();){var r=F(a);r.operator=Cr,r.prefix=!1,r.argument=a,N(a),U(),a=O(r,"UpdateExpression")}return a}function tr(){return nr(ar())}function nr(e,r){if(D(gt)){var t=F(e);return t.object=e,t.property=lr(!0),t.computed=!1,nr(O(t,"MemberExpression"),r)}if(D(lt)){var t=F(e);return t.object=e,t.property=Q(),t.computed=!0,z(ft),nr(O(t,"MemberExpression"),r)}if(!r&&D(mt)){var t=F(e);return t.callee=e,t.arguments=ur(ht,!1),nr(O(t,"CallExpression"),r)}return e}function ar(){switch(wr){case at:var e=q();return U(),O(e,"ThisExpression");case jr:return lr();case qr:case Or:case Fr:var e=q();return e.value=Cr,e.raw=pr.slice(yr,gr),U(),O(e,"Literal");case ot:case it:case st:var e=q();return e.value=wr.atomValue,e.raw=wr.keyword,U(),O(e,"Literal");case mt:var r=xr,t=yr;U();var n=Q();return n.start=t,n.end=gr,fr.locations&&(n.loc.start=r,n.loc.end=kr),fr.ranges&&(n.range=[t,gr]),z(ht),n;case lt:var e=q();return U(),e.elements=ur(ft,!0,!0),O(e,"ArrayExpression");case pt:return ir();case Hr:var e=q();return U(),cr(e,!1);case nt:return or();default:X()}}function or(){var e=q();return U(),e.callee=nr(ar(),!0),e.arguments=D(mt)?ur(ht,!1):[],O(e,"NewExpression")}function ir(){var e=q(),r=!0,n=!1;for(e.properties=[],U();!D(dt);){if(r)r=!1;else if(z(vt),fr.allowTrailingCommas&&D(dt))break;var a,o={key:sr()},i=!1;if(D(yt)?(o.value=Q(!0),a=o.kind="init"):fr.ecmaVersion>=5&&"Identifier"===o.key.type&&("get"===o.key.name||"set"===o.key.name)?(i=n=!0,a=o.kind=o.key.name,o.key=sr(),wr!==mt&&X(),o.value=cr(q(),!1)):X(),"Identifier"===o.key.type&&(Vr||n))for(var s=0;e.properties.length>s;++s){var c=e.properties[s];if(c.key.name===o.key.name){var u=a==c.kind||i&&"init"===c.kind||"init"===a&&("get"===c.kind||"set"===c.kind);u&&!Vr&&"init"===a&&"init"===c.kind&&(u=!1),u&&t(o.key.start,"Redefinition of property")}}e.properties.push(o)}return O(e,"ObjectExpression")}function sr(){return wr===qr||wr===Or?ar():lr(!0)}function cr(e,r){wr===jr?e.id=lr():r?X():e.id=null,e.params=[];var n=!0;for(z(mt);!D(ht);)n?n=!1:z(vt),e.params.push(lr());var a=Rr,o=Tr;if(Rr=!0,Tr=[],e.body=$(!0),Rr=a,Tr=o,Vr||e.body.body.length&&j(e.body.body[0]))for(var i=e.id?-1:0;e.params.length>i;++i){var s=0>i?e.id:e.params[i];if((zt(s.name)||Xt(s.name))&&t(s.start,"Defining '"+s.name+"' in strict mode"),i>=0)for(var c=0;i>c;++c)s.name===e.params[c].name&&t(s.start,"Argument name clash in strict mode")}return O(e,r?"FunctionDeclaration":"FunctionExpression")}function ur(e,r,t){for(var n=[],a=!0;!D(e);){if(a)a=!1;else if(z(vt),r&&fr.allowTrailingCommas&&D(e))break;t&&wr===vt?n.push(null):n.push(Q(!0))}return n}function lr(e){var r=q();return r.name=wr===jr?Cr:e&&!fr.forbidReserved&&wr.keyword||X(),U(),O(r,"Identifier")}e.version="0.2.01";var fr,pr,dr,mr;e.parse=function(e,t){return pr=e+"",dr=pr.length,r(t),o(),W(fr.program)};var hr=e.defaultOptions={ecmaVersion:5,strictSemicolons:!1,allowTrailingCommas:!0,forbidReserved:!1,locations:!1,onComment:null,ranges:!1,program:null,sourceFile:null},vr=e.getLineInfo=function(e,r){for(var t=1,n=0;;){Kt.lastIndex=n;var a=Kt.exec(e);if(!(a&&r>a.index))break;++t,n=a.index+a[0].length}return{line:t,column:r-n}};e.tokenize=function(e,t){function n(e){return g(e),a.start=yr,a.end=gr,a.startLoc=xr,a.endLoc=kr,a.type=wr,a.value=Cr,a}pr=e+"",dr=pr.length,r(t),o();var a={};return n.jumpTo=function(e,r){if(br=e,fr.locations){Ar=Sr=Kt.lastIndex=0;for(var t;(t=Kt.exec(pr))&&e>t.index;)++Ar,Sr=t.index+t[0].length}pr.charAt(e-1),Er=r,u()},n};var br,yr,gr,xr,kr,wr,Cr,Er,Ar,Sr,Ir,Lr,Ur,Rr,Tr,Vr,qr={type:"num"},Fr={type:"regexp"},Or={type:"string"},jr={type:"name"},Dr={type:"eof"},Br={keyword:"break"},Mr={keyword:"case",beforeExpr:!0},zr={keyword:"catch"},Xr={keyword:"continue"},Nr={keyword:"debugger"},Wr={keyword:"default"},Jr={keyword:"do",isLoop:!0},Pr={keyword:"else",beforeExpr:!0},$r={keyword:"finally"},Gr={keyword:"for",isLoop:!0},Hr={keyword:"function"},Kr={keyword:"if"},Qr={keyword:"return",beforeExpr:!0},Yr={keyword:"switch"},Zr={keyword:"throw",beforeExpr:!0},_r={keyword:"try"},et={keyword:"var"},rt={keyword:"while",isLoop:!0},tt={keyword:"with"},nt={keyword:"new",beforeExpr:!0},at={keyword:"this"},ot={keyword:"null",atomValue:null},it={keyword:"true",atomValue:!0},st={keyword:"false",atomValue:!1},ct={keyword:"in",binop:7,beforeExpr:!0},ut={"break":Br,"case":Mr,"catch":zr,"continue":Xr,"debugger":Nr,"default":Wr,"do":Jr,"else":Pr,"finally":$r,"for":Gr,"function":Hr,"if":Kr,"return":Qr,"switch":Yr,"throw":Zr,"try":_r,"var":et,"while":rt,"with":tt,"null":ot,"true":it,"false":st,"new":nt,"in":ct,"instanceof":{keyword:"instanceof",binop:7,beforeExpr:!0},"this":at,"typeof":{keyword:"typeof",prefix:!0,beforeExpr:!0},"void":{keyword:"void",prefix:!0,beforeExpr:!0},"delete":{keyword:"delete",prefix:!0,beforeExpr:!0}},lt={type:"[",beforeExpr:!0},ft={type:"]"},pt={type:"{",beforeExpr:!0},dt={type:"}"},mt={type:"(",beforeExpr:!0},ht={type:")"},vt={type:",",beforeExpr:!0},bt={type:";",beforeExpr:!0},yt={type:":",beforeExpr:!0},gt={type:"."},xt={type:"?",beforeExpr:!0},kt={binop:10,beforeExpr:!0},wt={isAssign:!0,beforeExpr:!0},Ct={isAssign:!0,beforeExpr:!0},Et={binop:9,prefix:!0,beforeExpr:!0},At={postfix:!0,prefix:!0,isUpdate:!0},St={prefix:!0,beforeExpr:!0},It={binop:1,beforeExpr:!0},Lt={binop:2,beforeExpr:!0},Ut={binop:3,beforeExpr:!0},Rt={binop:4,beforeExpr:!0},Tt={binop:5,beforeExpr:!0},Vt={binop:6,beforeExpr:!0},qt={binop:7,beforeExpr:!0},Ft={binop:8,beforeExpr:!0},Ot={binop:10,beforeExpr:!0};e.tokTypes={bracketL:lt,bracketR:ft,braceL:pt,braceR:dt,parenL:mt,parenR:ht,comma:vt,semi:bt,colon:yt,dot:gt,question:xt,slash:kt,eq:wt,name:jr,eof:Dr,num:qr,regexp:Fr,string:Or};for(var jt in ut)e.tokTypes[jt]=ut[jt];var Dt,Bt=n("abstract boolean byte char class double enum export extends final float goto implements import int interface long native package private protected public short static super synchronized throws transient volatile"),Mt=n("class enum extends super const export import"),zt=n("implements interface let package private protected public static yield"),Xt=n("eval arguments"),Nt=n("break case catch continue debugger default do else finally for function if return switch throw try var while with null true false instanceof typeof void delete new in this"),Wt=/[\u1680\u180e\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]/,Jt="\u00aa\u00b5\u00ba\u00c0-\u00d6\u00d8-\u00f6\u00f8-\u02c1\u02c6-\u02d1\u02e0-\u02e4\u02ec\u02ee\u0370-\u0374\u0376\u0377\u037a-\u037d\u0386\u0388-\u038a\u038c\u038e-\u03a1\u03a3-\u03f5\u03f7-\u0481\u048a-\u0527\u0531-\u0556\u0559\u0561-\u0587\u05d0-\u05ea\u05f0-\u05f2\u0620-\u064a\u066e\u066f\u0671-\u06d3\u06d5\u06e5\u06e6\u06ee\u06ef\u06fa-\u06fc\u06ff\u0710\u0712-\u072f\u074d-\u07a5\u07b1\u07ca-\u07ea\u07f4\u07f5\u07fa\u0800-\u0815\u081a\u0824\u0828\u0840-\u0858\u08a0\u08a2-\u08ac\u0904-\u0939\u093d\u0950\u0958-\u0961\u0971-\u0977\u0979-\u097f\u0985-\u098c\u098f\u0990\u0993-\u09a8\u09aa-\u09b0\u09b2\u09b6-\u09b9\u09bd\u09ce\u09dc\u09dd\u09df-\u09e1\u09f0\u09f1\u0a05-\u0a0a\u0a0f\u0a10\u0a13-\u0a28\u0a2a-\u0a30\u0a32\u0a33\u0a35\u0a36\u0a38\u0a39\u0a59-\u0a5c\u0a5e\u0a72-\u0a74\u0a85-\u0a8d\u0a8f-\u0a91\u0a93-\u0aa8\u0aaa-\u0ab0\u0ab2\u0ab3\u0ab5-\u0ab9\u0abd\u0ad0\u0ae0\u0ae1\u0b05-\u0b0c\u0b0f\u0b10\u0b13-\u0b28\u0b2a-\u0b30\u0b32\u0b33\u0b35-\u0b39\u0b3d\u0b5c\u0b5d\u0b5f-\u0b61\u0b71\u0b83\u0b85-\u0b8a\u0b8e-\u0b90\u0b92-\u0b95\u0b99\u0b9a\u0b9c\u0b9e\u0b9f\u0ba3\u0ba4\u0ba8-\u0baa\u0bae-\u0bb9\u0bd0\u0c05-\u0c0c\u0c0e-\u0c10\u0c12-\u0c28\u0c2a-\u0c33\u0c35-\u0c39\u0c3d\u0c58\u0c59\u0c60\u0c61\u0c85-\u0c8c\u0c8e-\u0c90\u0c92-\u0ca8\u0caa-\u0cb3\u0cb5-\u0cb9\u0cbd\u0cde\u0ce0\u0ce1\u0cf1\u0cf2\u0d05-\u0d0c\u0d0e-\u0d10\u0d12-\u0d3a\u0d3d\u0d4e\u0d60\u0d61\u0d7a-\u0d7f\u0d85-\u0d96\u0d9a-\u0db1\u0db3-\u0dbb\u0dbd\u0dc0-\u0dc6\u0e01-\u0e30\u0e32\u0e33\u0e40-\u0e46\u0e81\u0e82\u0e84\u0e87\u0e88\u0e8a\u0e8d\u0e94-\u0e97\u0e99-\u0e9f\u0ea1-\u0ea3\u0ea5\u0ea7\u0eaa\u0eab\u0ead-\u0eb0\u0eb2\u0eb3\u0ebd\u0ec0-\u0ec4\u0ec6\u0edc-\u0edf\u0f00\u0f40-\u0f47\u0f49-\u0f6c\u0f88-\u0f8c\u1000-\u102a\u103f\u1050-\u1055\u105a-\u105d\u1061\u1065\u1066\u106e-\u1070\u1075-\u1081\u108e\u10a0-\u10c5\u10c7\u10cd\u10d0-\u10fa\u10fc-\u1248\u124a-\u124d\u1250-\u1256\u1258\u125a-\u125d\u1260-\u1288\u128a-\u128d\u1290-\u12b0\u12b2-\u12b5\u12b8-\u12be\u12c0\u12c2-\u12c5\u12c8-\u12d6\u12d8-\u1310\u1312-\u1315\u1318-\u135a\u1380-\u138f\u13a0-\u13f4\u1401-\u166c\u166f-\u167f\u1681-\u169a\u16a0-\u16ea\u16ee-\u16f0\u1700-\u170c\u170e-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176c\u176e-\u1770\u1780-\u17b3\u17d7\u17dc\u1820-\u1877\u1880-\u18a8\u18aa\u18b0-\u18f5\u1900-\u191c\u1950-\u196d\u1970-\u1974\u1980-\u19ab\u19c1-\u19c7\u1a00-\u1a16\u1a20-\u1a54\u1aa7\u1b05-\u1b33\u1b45-\u1b4b\u1b83-\u1ba0\u1bae\u1baf\u1bba-\u1be5\u1c00-\u1c23\u1c4d-\u1c4f\u1c5a-\u1c7d\u1ce9-\u1cec\u1cee-\u1cf1\u1cf5\u1cf6\u1d00-\u1dbf\u1e00-\u1f15\u1f18-\u1f1d\u1f20-\u1f45\u1f48-\u1f4d\u1f50-\u1f57\u1f59\u1f5b\u1f5d\u1f5f-\u1f7d\u1f80-\u1fb4\u1fb6-\u1fbc\u1fbe\u1fc2-\u1fc4\u1fc6-\u1fcc\u1fd0-\u1fd3\u1fd6-\u1fdb\u1fe0-\u1fec\u1ff2-\u1ff4\u1ff6-\u1ffc\u2071\u207f\u2090-\u209c\u2102\u2107\u210a-\u2113\u2115\u2119-\u211d\u2124\u2126\u2128\u212a-\u212d\u212f-\u2139\u213c-\u213f\u2145-\u2149\u214e\u2160-\u2188\u2c00-\u2c2e\u2c30-\u2c5e\u2c60-\u2ce4\u2ceb-\u2cee\u2cf2\u2cf3\u2d00-\u2d25\u2d27\u2d2d\u2d30-\u2d67\u2d6f\u2d80-\u2d96\u2da0-\u2da6\u2da8-\u2dae\u2db0-\u2db6\u2db8-\u2dbe\u2dc0-\u2dc6\u2dc8-\u2dce\u2dd0-\u2dd6\u2dd8-\u2dde\u2e2f\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303c\u3041-\u3096\u309d-\u309f\u30a1-\u30fa\u30fc-\u30ff\u3105-\u312d\u3131-\u318e\u31a0-\u31ba\u31f0-\u31ff\u3400-\u4db5\u4e00-\u9fcc\ua000-\ua48c\ua4d0-\ua4fd\ua500-\ua60c\ua610-\ua61f\ua62a\ua62b\ua640-\ua66e\ua67f-\ua697\ua6a0-\ua6ef\ua717-\ua71f\ua722-\ua788\ua78b-\ua78e\ua790-\ua793\ua7a0-\ua7aa\ua7f8-\ua801\ua803-\ua805\ua807-\ua80a\ua80c-\ua822\ua840-\ua873\ua882-\ua8b3\ua8f2-\ua8f7\ua8fb\ua90a-\ua925\ua930-\ua946\ua960-\ua97c\ua984-\ua9b2\ua9cf\uaa00-\uaa28\uaa40-\uaa42\uaa44-\uaa4b\uaa60-\uaa76\uaa7a\uaa80-\uaaaf\uaab1\uaab5\uaab6\uaab9-\uaabd\uaac0\uaac2\uaadb-\uaadd\uaae0-\uaaea\uaaf2-\uaaf4\uab01-\uab06\uab09-\uab0e\uab11-\uab16\uab20-\uab26\uab28-\uab2e\uabc0-\uabe2\uac00-\ud7a3\ud7b0-\ud7c6\ud7cb-\ud7fb\uf900-\ufa6d\ufa70-\ufad9\ufb00-\ufb06\ufb13-\ufb17\ufb1d\ufb1f-\ufb28\ufb2a-\ufb36\ufb38-\ufb3c\ufb3e\ufb40\ufb41\ufb43\ufb44\ufb46-\ufbb1\ufbd3-\ufd3d\ufd50-\ufd8f\ufd92-\ufdc7\ufdf0-\ufdfb\ufe70-\ufe74\ufe76-\ufefc\uff21-\uff3a\uff41-\uff5a\uff66-\uffbe\uffc2-\uffc7\uffca-\uffcf\uffd2-\uffd7\uffda-\uffdc",Pt="\u0300-\u036f\u0483-\u0487\u0591-\u05bd\u05bf\u05c1\u05c2\u05c4\u05c5\u05c7\u0610-\u061a\u0620-\u0649\u0672-\u06d3\u06e7-\u06e8\u06fb-\u06fc\u0730-\u074a\u0800-\u0814\u081b-\u0823\u0825-\u0827\u0829-\u082d\u0840-\u0857\u08e4-\u08fe\u0900-\u0903\u093a-\u093c\u093e-\u094f\u0951-\u0957\u0962-\u0963\u0966-\u096f\u0981-\u0983\u09bc\u09be-\u09c4\u09c7\u09c8\u09d7\u09df-\u09e0\u0a01-\u0a03\u0a3c\u0a3e-\u0a42\u0a47\u0a48\u0a4b-\u0a4d\u0a51\u0a66-\u0a71\u0a75\u0a81-\u0a83\u0abc\u0abe-\u0ac5\u0ac7-\u0ac9\u0acb-\u0acd\u0ae2-\u0ae3\u0ae6-\u0aef\u0b01-\u0b03\u0b3c\u0b3e-\u0b44\u0b47\u0b48\u0b4b-\u0b4d\u0b56\u0b57\u0b5f-\u0b60\u0b66-\u0b6f\u0b82\u0bbe-\u0bc2\u0bc6-\u0bc8\u0bca-\u0bcd\u0bd7\u0be6-\u0bef\u0c01-\u0c03\u0c46-\u0c48\u0c4a-\u0c4d\u0c55\u0c56\u0c62-\u0c63\u0c66-\u0c6f\u0c82\u0c83\u0cbc\u0cbe-\u0cc4\u0cc6-\u0cc8\u0cca-\u0ccd\u0cd5\u0cd6\u0ce2-\u0ce3\u0ce6-\u0cef\u0d02\u0d03\u0d46-\u0d48\u0d57\u0d62-\u0d63\u0d66-\u0d6f\u0d82\u0d83\u0dca\u0dcf-\u0dd4\u0dd6\u0dd8-\u0ddf\u0df2\u0df3\u0e34-\u0e3a\u0e40-\u0e45\u0e50-\u0e59\u0eb4-\u0eb9\u0ec8-\u0ecd\u0ed0-\u0ed9\u0f18\u0f19\u0f20-\u0f29\u0f35\u0f37\u0f39\u0f41-\u0f47\u0f71-\u0f84\u0f86-\u0f87\u0f8d-\u0f97\u0f99-\u0fbc\u0fc6\u1000-\u1029\u1040-\u1049\u1067-\u106d\u1071-\u1074\u1082-\u108d\u108f-\u109d\u135d-\u135f\u170e-\u1710\u1720-\u1730\u1740-\u1750\u1772\u1773\u1780-\u17b2\u17dd\u17e0-\u17e9\u180b-\u180d\u1810-\u1819\u1920-\u192b\u1930-\u193b\u1951-\u196d\u19b0-\u19c0\u19c8-\u19c9\u19d0-\u19d9\u1a00-\u1a15\u1a20-\u1a53\u1a60-\u1a7c\u1a7f-\u1a89\u1a90-\u1a99\u1b46-\u1b4b\u1b50-\u1b59\u1b6b-\u1b73\u1bb0-\u1bb9\u1be6-\u1bf3\u1c00-\u1c22\u1c40-\u1c49\u1c5b-\u1c7d\u1cd0-\u1cd2\u1d00-\u1dbe\u1e01-\u1f15\u200c\u200d\u203f\u2040\u2054\u20d0-\u20dc\u20e1\u20e5-\u20f0\u2d81-\u2d96\u2de0-\u2dff\u3021-\u3028\u3099\u309a\ua640-\ua66d\ua674-\ua67d\ua69f\ua6f0-\ua6f1\ua7f8-\ua800\ua806\ua80b\ua823-\ua827\ua880-\ua881\ua8b4-\ua8c4\ua8d0-\ua8d9\ua8f3-\ua8f7\ua900-\ua909\ua926-\ua92d\ua930-\ua945\ua980-\ua983\ua9b3-\ua9c0\uaa00-\uaa27\uaa40-\uaa41\uaa4c-\uaa4d\uaa50-\uaa59\uaa7b\uaae0-\uaae9\uaaf2-\uaaf3\uabc0-\uabe1\uabec\uabed\uabf0-\uabf9\ufb20-\ufb28\ufe00-\ufe0f\ufe20-\ufe26\ufe33\ufe34\ufe4d-\ufe4f\uff10-\uff19\uff3f",$t=RegExp("["+Jt+"]"),Gt=RegExp("["+Jt+Pt+"]"),Ht=/[\n\r\u2028\u2029]/,Kt=/\r\n|[\n\r\u2028\u2029]/g,Qt=e.isIdentifierStart=function(e){return 65>e?36===e:91>e?!0:97>e?95===e:123>e?!0:e>=170&&$t.test(String.fromCharCode(e))},Yt=e.isIdentifierChar=function(e){return 48>e?36===e:58>e?!0:65>e?!1:91>e?!0:97>e?95===e:123>e?!0:e>=170&&Gt.test(String.fromCharCode(e))},Zt={kind:"loop"},_t={kind:"switch"}});
 
var PaperScript = new function() {
	// Operators to overload

	var binaryOperators = {
		'+': 'add',
		'-': 'subtract',
		'*': 'multiply',
		'/': 'divide',
		'%': 'modulo',
		'==': 'equals',
		'!=': 'equals'
	};

	var unaryOperators = {
		'-': 'negate',
		'+': null
	};

	// Use very short name for the binary operator (_$_) as well as the
	// unary operator ($_), as operations will be replaced with then.
	// The underscores stands for the values, and the $ for the operators.

	// Binary Operator Handler
	function _$_(left, operator, right) {
		var handler = binaryOperators[operator];
		if (left && left[handler]) {
			var res = left[handler](right);
			return operator === '!=' ? !res : res;
		}
		switch (operator) {
		case '+': return left + right;
		case '-': return left - right;
		case '*': return left * right;
		case '/': return left / right;
		case '%': return left % right;
		case '==': return left == right;
		case '!=': return left != right;
		}
	}

	// Unary Operator Handler
	function $_(operator, value) {
		var handler = unaryOperators[operator];
		if (handler && value && value[handler])
			return value[handler]();
		switch (operator) {
		case '+': return +value;
		case '-': return -value;
		}
	}

	// AST Helpers


	/**
	 * Compiles PaperScript code into JavaScript code.
	 *
	 * @name PaperScript.compile
	 * @function
	 * @param {String} code The PaperScript code.
	 * @return {String} The compiled PaperScript as JavaScript code.
	 */
	function compile(code) {
		// Use Acorn or Esprima to translate the code into an AST structure
		// which is then walked and parsed for operators to overload.
		// Instead of modifying the AST and converting back to code, we directly
		// change the source code based on the parser's range information, so we
		// can preserve line-numbers in syntax errors and remove the need for
		// Escodegen.

		// Tracks code insertions so we can add their differences to the
		// original offsets.
		var insertions = [];

		// Converts an original offset to the one in the current state of the 
		// modified code.
		function getOffset(offset) {
			var start = offset;
			// Add all insertions before this location together to calculate
			// the current offset
			for (var i = 0, l = insertions.length; i < l; i++) {
				var insertion = insertions[i];
				if (insertion[0] >= offset)
					break;
				offset += insertion[1];
			}
			return offset;
		}

		// Returns the node's code as a string, taking insertions into account.
		function getCode(node) {
			return code.substring(getOffset(node.range[0]),
					getOffset(node.range[1]));
		}

		// Replaces the node's code with a new version and keeps insertions
		// information up-to-date.
		function replaceCode(node, str) {
			var start = getOffset(node.range[0]),
				end = getOffset(node.range[1]);
			var insert = 0;
			// Sort insertions by their offset, so getOffest() can do its thing
			for (var i = insertions.length - 1; i >= 0; i--) {
				if (start > insertions[i][0]) {
					insert = i + 1;
					break;
				}
			}
			insertions.splice(insert, 0, [start, str.length - end + start]);
			code = code.substring(0, start) + str + code.substring(end);
		}

		// Recursively walks the AST and replaces the code of certain nodes
		function walkAst(node) {
			for (var key in node) {
				if (key === 'range')
					continue;
				var value = node[key];
				if (Array.isArray(value)) {
					for (var i = 0, l = value.length; i < l; i++)
						walkAst(value[i]);
				} else if (value && typeof value === 'object') {
					// We cannot use Base.isPlainObject() for these since
					// Acorn.js uses its own internal prototypes now.
					walkAst(value);
				}
			}
			switch (node && node.type) {
			case 'BinaryExpression':
				if (node.operator in binaryOperators
						&& node.left.type !== 'Literal') {
					var left = getCode(node.left),
						right = getCode(node.right);
					replaceCode(node, '_$_(' + left + ', "' + node.operator
							+ '", ' + right + ')');
				}
				break;
			case 'AssignmentExpression':
				if (/^.=$/.test(node.operator)
						&& node.left.type !== 'Literal') {
					var left = getCode(node.left),
						right = getCode(node.right);
					replaceCode(node, left + ' = _$_(' + left + ', "'
							+ node.operator[0] + '", ' + right + ')');
				}
				break;
			case 'UpdateExpression':
				if (!node.prefix) {
					var arg = getCode(node.argument);
					replaceCode(node, arg + ' = _$_(' + arg + ', "'
							+ node.operator[0] + '", 1)');
				}
				break;
			case 'UnaryExpression':
				if (node.operator in unaryOperators
						&& node.argument.type !== 'Literal') {
					var arg = getCode(node.argument);
					replaceCode(node, '$_("' + node.operator + '", '
							+ arg + ')');
				}
				break;
			}
		}
		// Now do the parsing magic
		walkAst(acorn.parse(code, { ranges: true }));
		return code;
	}

	/**
	 * Evaluates parsed PaperScript code in the passed {@link PaperScope}
	 * object. It also installs handlers automatically for us.
	 *
	 * @name PaperScript.evaluate
	 * @function
	 * @param {String} code The PaperScript code.
	 * @param {PaperScript} scope The scope in which the code is executed.
	 * @return {Object} The result of the code evaluation.
	 */
	function evaluate(code, scope) {
		// Set currently active scope.
		paper = scope;
		var view = scope.project && scope.project.view,
			res;
		// Define variables for potential handlers, so eval() calls below to
		// fetch their values do not require try-catch around them.
		// Use with(){} in order to make the scope the current 'global' scope
		// instead of window.
		with (scope) {
			// Within this, use a function scope, so local variables to not try
			// and set themselves on the scope object.
			(function() {
				var onActivate, onDeactivate, onEditOptions,
					onMouseDown, onMouseUp, onMouseDrag, onMouseMove,
					onKeyDown, onKeyUp, onFrame, onResize;
				res = eval(compile(code));
				// Only look for tool handlers if something resembling their
				// name is contained in the code.
				if (/on(?:Key|Mouse)(?:Up|Down|Move|Drag)/.test(code)) {
					Base.each(Tool.prototype._events, function(key) {
						var value = eval(key);
						if (value) {
							// Use the getTool accessor that handles auto tool
							// creation for us:
							scope.getTool()[key] = value;
						}
					});
				}
				if (view) {
					view.setOnResize(onResize);
					// Fire resize event directly, so any user
					// defined resize handlers are called.
					view.fire('resize', {
						size: view.size,
						delta: new Point()
					});
					view.setOnFrame(onFrame);
					// Automatically draw view at the end.
					view.draw();
				}
			}).call(scope);
		}
		return res;
	}

	// Code borrowed from Coffee Script:
	function request(url, scope) {
		var xhr = new (window.ActiveXObject || XMLHttpRequest)(
				'Microsoft.XMLHTTP');
		xhr.open('GET', url, true);
		if (xhr.overrideMimeType)
			xhr.overrideMimeType('text/plain');
		xhr.onreadystatechange = function() {
			if (xhr.readyState === 4) {
				return evaluate(xhr.responseText, scope);
			}
		};
		return xhr.send(null);
	}

	function load() {
		var scripts = document.getElementsByTagName('script');
		for (var i = 0, l = scripts.length; i < l; i++) {
			var script = scripts[i];
			// Only load this script if it not loaded already.
			// Support both text/paperscript and text/x-paperscript:
			if (/^text\/(?:x-|)paperscript$/.test(script.type)
					&& !script.getAttribute('data-paper-ignore')) {
				// Produce a new PaperScope for this script now. Scopes are
				// cheap so let's not worry about the initial one that was
				// already created.
				// Define an id for each PaperScript, so its scope can be
				// retrieved through PaperScope.get().
				// If a canvas id is provided, pass it on to the PaperScope
				// so a project is created for it now.
				var canvas = PaperScript.getAttribute(script, 'canvas'),
					// See if there already is a scope for this canvas and reuse
					// it, to support multiple scripts per canvas. Otherwise
					// create a new one.
					scope = PaperScope.get(canvas)
							|| new PaperScope(script).setup(canvas);
				if (script.src) {
					// If we're loading from a source, request that first and then
					// run later.
					request(script.src, scope);
				} else {
					// We can simply get the code form the script tag.
					evaluate(script.innerHTML, scope);
				}
				// Mark script as loaded now.
				script.setAttribute('data-paper-ignore', true);
			}
		}
	}

	// Catch cases where paper.js is loaded after the browser event has already
	// occurred.
	if (document.readyState === 'complete') {
		// Handle it asynchronously
		setTimeout(load);
	} else {
		DomEvent.add(window, { load: load });
	}

	// Produces helpers to e.g. check for both 'canvas' and 'data-paper-canvas'
	// attributes:
	function handleAttribute(name) {
		name += 'Attribute';
		return function(el, attr) {
			return el[name](attr) || el[name]('data-paper-' + attr);
		};
	}

	return {
		compile: compile,
		evaluate: evaluate,
		load: load,
		getAttribute: handleAttribute('get'),
		hasAttribute: handleAttribute('has')
	};

};


/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2013, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

// Add PaperScript and Numerical to exports, inject all exports into PaperScope,
// and create the initial paper object, all in one condensed statement:
var paper = new (PaperScope.inject(Base.exports.inject({
	PaperScript: PaperScript,
	Numerical: Numerical
})))();

return paper;
};
