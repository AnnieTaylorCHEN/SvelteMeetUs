
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.head.appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function validate_store(store, name) {
        if (!store || typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe(store, callback) {
        const unsub = store.subscribe(callback);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }
    function create_slot(definition, ctx, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, fn) {
        return definition[1]
            ? assign({}, assign(ctx.$$scope.ctx, definition[1](fn ? fn(ctx) : {})))
            : ctx.$$scope.ctx;
    }
    function get_slot_changes(definition, ctx, changed, fn) {
        return definition[1]
            ? assign({}, assign(ctx.$$scope.changed || {}, definition[1](fn ? fn(changed) : {})))
            : ctx.$$scope.changed || {};
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        if (value != null || input.value) {
            input.value = value;
        }
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error(`Function called outside component initialization`);
        return current_component;
    }
    function onDestroy(fn) {
        get_current_component().$$.on_destroy.push(fn);
    }
    function createEventDispatcher() {
        const component = current_component;
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }
    // TODO figure out if we still want to support
    // shorthand events, or if we want to implement
    // a real bubbling mechanism
    function bubble(component, event) {
        const callbacks = component.$$.callbacks[event.type];
        if (callbacks) {
            callbacks.slice().forEach(fn => fn(event));
        }
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function add_flush_callback(fn) {
        flush_callbacks.push(fn);
    }
    function flush() {
        const seen_callbacks = new Set();
        do {
            // first, call beforeUpdate functions
            // and update components
            while (dirty_components.length) {
                const component = dirty_components.shift();
                set_current_component(component);
                update(component.$$);
            }
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    callback();
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
    }
    function update($$) {
        if ($$.fragment) {
            $$.update($$.dirty);
            run_all($$.before_update);
            $$.fragment.p($$.dirty, $$.ctx);
            $$.dirty = null;
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    function bind(component, name, callback) {
        if (component.$$.props.indexOf(name) === -1)
            return;
        component.$$.bound[name] = callback;
        callback(component.$$.ctx[name]);
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        if (component.$$.fragment) {
            run_all(component.$$.on_destroy);
            component.$$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            component.$$.on_destroy = component.$$.fragment = null;
            component.$$.ctx = {};
        }
    }
    function make_dirty(component, key) {
        if (!component.$$.dirty) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty = blank_object();
        }
        component.$$.dirty[key] = true;
    }
    function init(component, options, instance, create_fragment, not_equal, prop_names) {
        const parent_component = current_component;
        set_current_component(component);
        const props = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props: prop_names,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty: null
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, props, (key, ret, value = ret) => {
                if ($$.ctx && not_equal($$.ctx[key], $$.ctx[key] = value)) {
                    if ($$.bound[key])
                        $$.bound[key](value);
                    if (ready)
                        make_dirty(component, key);
                }
                return ret;
            })
            : props;
        $$.update();
        ready = true;
        run_all($$.before_update);
        $$.fragment = create_fragment($$.ctx);
        if (options.target) {
            if (options.hydrate) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment.l(children(options.target));
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, detail));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function prop_dev(node, property, value) {
        node[property] = value;
        dispatch_dev("SvelteDOMSetProperty", { node, property, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        dispatch_dev("SvelteDOMSetData", { node: text, data });
        text.data = data;
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
    }

    const subscriber_queue = [];
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = [];
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (let i = 0; i < subscribers.length; i += 1) {
                        const s = subscribers[i];
                        s[1]();
                        subscriber_queue.push(s, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.push(subscriber);
            if (subscribers.length === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                const index = subscribers.indexOf(subscriber);
                if (index !== -1) {
                    subscribers.splice(index, 1);
                }
                if (subscribers.length === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    const meetups = writable([
      {
        id: 'm1',
        title: 'Coding Bootcamp',
        subtitle: 'Learn to code in 2 hours',
        description:
          'In this meetup, we will have some experts that teach you how to code!',
        imageUrl:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/Caffe_Nero_coffee_bar%2C_High_St%2C_Sutton%2C_Surrey%2C_Greater_London.JPG/800px-Caffe_Nero_coffee_bar%2C_High_St%2C_Sutton%2C_Surrey%2C_Greater_London.JPG',
        address: '27th Nerd Road, 32523 New York',
        contactEmail: 'code@test.com',
        isFavorite: false
      },
      {
        id: 'm2',
        title: 'Swim Together',
        subtitle: "Let's go for some swimming",
        description: 'We will simply swim some rounds!',
        imageUrl:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/Olympic_swimming_pool_%28Tbilisi%29.jpg/800px-Olympic_swimming_pool_%28Tbilisi%29.jpg',
        address: '27th Nerd Road, 32523 New York',
        contactEmail: 'swim@test.com',
        isFavorite: false
      }
    ]);

    const customMeetupsStore = {
      subscribe: meetups.subscribe,
      addMeetup: meetupData => {
        const newMeetup = {
          ...meetupData,
          id: Math.random().toString(),
          isFavorite: false
        };
        meetups.update(items => {
          return [newMeetup, ...items];
        });
      },
      updateMeetup: (id, meetupData) => {
        meetups.update(items => {
          const meetupIndex = items.findIndex(i => i.id === id);
          const updatedMeetup = { ...items[meetupIndex], ...meetupData };
          const updatedMeetups = [...items];
          updatedMeetups[meetupIndex] = updatedMeetup;
          return updatedMeetups;
        });
      },
      removeMeetup: (id) => {
          meetups.update(items => {
            return items.filter(i => i.id !== id);
          });
      },
      toggleFavorite: id => {
        meetups.update(items => {
          const updatedMeetup = { ...items.find(m => m.id === id) };
          updatedMeetup.isFavorite = !updatedMeetup.isFavorite;
          const meetupIndex = items.findIndex(m => m.id === id);
          const updatedMeetups = [...items];
          updatedMeetups[meetupIndex] = updatedMeetup;
          return updatedMeetups;
        });
      }
    };

    /* src/UI/Header.svelte generated by Svelte v3.12.1 */

    const file = "src/UI/Header.svelte";

    function create_fragment(ctx) {
    	var header, h1;

    	const block = {
    		c: function create() {
    			header = element("header");
    			h1 = element("h1");
    			h1.textContent = "MeetUs";
    			attr_dev(h1, "class", "svelte-3mmc7n");
    			add_location(h1, file, 22, 2, 354);
    			attr_dev(header, "class", "svelte-3mmc7n");
    			add_location(header, file, 21, 0, 343);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, header, anchor);
    			append_dev(header, h1);
    		},

    		p: noop,
    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(header);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment.name, type: "component", source: "", ctx });
    	return block;
    }

    class Header extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Header", options, id: create_fragment.name });
    	}
    }

    /* src/UI/Button.svelte generated by Svelte v3.12.1 */

    const file$1 = "src/UI/Button.svelte";

    // (91:0) {:else}
    function create_else_block(ctx) {
    	var button, button_class_value, current, dispose;

    	const default_slot_template = ctx.$$slots.default;
    	const default_slot = create_slot(default_slot_template, ctx, null);

    	const block = {
    		c: function create() {
    			button = element("button");

    			if (default_slot) default_slot.c();

    			attr_dev(button, "class", button_class_value = "" + ctx.mode + " " + ctx.color + " svelte-g32zaw");
    			attr_dev(button, "type", ctx.type);
    			button.disabled = ctx.disabled;
    			add_location(button, file$1, 91, 2, 1517);
    			dispose = listen_dev(button, "click", ctx.click_handler);
    		},

    		l: function claim(nodes) {
    			if (default_slot) default_slot.l(button_nodes);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);

    			if (default_slot) {
    				default_slot.m(button, null);
    			}

    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (default_slot && default_slot.p && changed.$$scope) {
    				default_slot.p(
    					get_slot_changes(default_slot_template, ctx, changed, null),
    					get_slot_context(default_slot_template, ctx, null)
    				);
    			}

    			if ((!current || changed.mode || changed.color) && button_class_value !== (button_class_value = "" + ctx.mode + " " + ctx.color + " svelte-g32zaw")) {
    				attr_dev(button, "class", button_class_value);
    			}

    			if (!current || changed.type) {
    				attr_dev(button, "type", ctx.type);
    			}

    			if (!current || changed.disabled) {
    				prop_dev(button, "disabled", ctx.disabled);
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(button);
    			}

    			if (default_slot) default_slot.d(detaching);
    			dispose();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_else_block.name, type: "else", source: "(91:0) {:else}", ctx });
    	return block;
    }

    // (87:0) {#if href}
    function create_if_block(ctx) {
    	var a, current;

    	const default_slot_template = ctx.$$slots.default;
    	const default_slot = create_slot(default_slot_template, ctx, null);

    	const block = {
    		c: function create() {
    			a = element("a");

    			if (default_slot) default_slot.c();

    			attr_dev(a, "href", ctx.href);
    			attr_dev(a, "class", "svelte-g32zaw");
    			add_location(a, file$1, 87, 2, 1476);
    		},

    		l: function claim(nodes) {
    			if (default_slot) default_slot.l(a_nodes);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, a, anchor);

    			if (default_slot) {
    				default_slot.m(a, null);
    			}

    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (default_slot && default_slot.p && changed.$$scope) {
    				default_slot.p(
    					get_slot_changes(default_slot_template, ctx, changed, null),
    					get_slot_context(default_slot_template, ctx, null)
    				);
    			}

    			if (!current || changed.href) {
    				attr_dev(a, "href", ctx.href);
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(a);
    			}

    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block.name, type: "if", source: "(87:0) {#if href}", ctx });
    	return block;
    }

    function create_fragment$1(ctx) {
    	var current_block_type_index, if_block, if_block_anchor, current;

    	var if_block_creators = [
    		create_if_block,
    		create_else_block
    	];

    	var if_blocks = [];

    	function select_block_type(changed, ctx) {
    		if (ctx.href) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(null, ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(changed, ctx);
    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(changed, ctx);
    			} else {
    				group_outros();
    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});
    				check_outros();

    				if_block = if_blocks[current_block_type_index];
    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				}
    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if_blocks[current_block_type_index].d(detaching);

    			if (detaching) {
    				detach_dev(if_block_anchor);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$1.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { type = "button", href = null, mode = null, color = null, disabled = false } = $$props;

    	const writable_props = ['type', 'href', 'mode', 'color', 'disabled'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<Button> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;

    	function click_handler(event) {
    		bubble($$self, event);
    	}

    	$$self.$set = $$props => {
    		if ('type' in $$props) $$invalidate('type', type = $$props.type);
    		if ('href' in $$props) $$invalidate('href', href = $$props.href);
    		if ('mode' in $$props) $$invalidate('mode', mode = $$props.mode);
    		if ('color' in $$props) $$invalidate('color', color = $$props.color);
    		if ('disabled' in $$props) $$invalidate('disabled', disabled = $$props.disabled);
    		if ('$$scope' in $$props) $$invalidate('$$scope', $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => {
    		return { type, href, mode, color, disabled };
    	};

    	$$self.$inject_state = $$props => {
    		if ('type' in $$props) $$invalidate('type', type = $$props.type);
    		if ('href' in $$props) $$invalidate('href', href = $$props.href);
    		if ('mode' in $$props) $$invalidate('mode', mode = $$props.mode);
    		if ('color' in $$props) $$invalidate('color', color = $$props.color);
    		if ('disabled' in $$props) $$invalidate('disabled', disabled = $$props.disabled);
    	};

    	return {
    		type,
    		href,
    		mode,
    		color,
    		disabled,
    		click_handler,
    		$$slots,
    		$$scope
    	};
    }

    class Button extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment$1, safe_not_equal, ["type", "href", "mode", "color", "disabled"]);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Button", options, id: create_fragment$1.name });
    	}

    	get type() {
    		throw new Error("<Button>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set type(value) {
    		throw new Error("<Button>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get href() {
    		throw new Error("<Button>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set href(value) {
    		throw new Error("<Button>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get mode() {
    		throw new Error("<Button>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set mode(value) {
    		throw new Error("<Button>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get color() {
    		throw new Error("<Button>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set color(value) {
    		throw new Error("<Button>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get disabled() {
    		throw new Error("<Button>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set disabled(value) {
    		throw new Error("<Button>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/UI/Badge.svelte generated by Svelte v3.12.1 */

    const file$2 = "src/UI/Badge.svelte";

    function create_fragment$2(ctx) {
    	var span, current;

    	const default_slot_template = ctx.$$slots.default;
    	const default_slot = create_slot(default_slot_template, ctx, null);

    	const block = {
    		c: function create() {
    			span = element("span");

    			if (default_slot) default_slot.c();

    			attr_dev(span, "class", "svelte-18dcboe");
    			add_location(span, file$2, 14, 0, 262);
    		},

    		l: function claim(nodes) {
    			if (default_slot) default_slot.l(span_nodes);
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);

    			if (default_slot) {
    				default_slot.m(span, null);
    			}

    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (default_slot && default_slot.p && changed.$$scope) {
    				default_slot.p(
    					get_slot_changes(default_slot_template, ctx, changed, null),
    					get_slot_context(default_slot_template, ctx, null)
    				);
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(span);
    			}

    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$2.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots = {}, $$scope } = $$props;

    	$$self.$set = $$props => {
    		if ('$$scope' in $$props) $$invalidate('$$scope', $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {};

    	return { $$slots, $$scope };
    }

    class Badge extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$2, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Badge", options, id: create_fragment$2.name });
    	}
    }

    /* src/Meetups/MeetupItem.svelte generated by Svelte v3.12.1 */

    const file$3 = "src/Meetups/MeetupItem.svelte";

    // (85:6) {#if isFav}
    function create_if_block$1(ctx) {
    	var current;

    	var badge = new Badge({
    		props: {
    		$$slots: { default: [create_default_slot_3] },
    		$$scope: { ctx }
    	},
    		$$inline: true
    	});

    	const block = {
    		c: function create() {
    			badge.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			mount_component(badge, target, anchor);
    			current = true;
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(badge.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(badge.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(badge, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block$1.name, type: "if", source: "(85:6) {#if isFav}", ctx });
    	return block;
    }

    // (86:8) <Badge>
    function create_default_slot_3(ctx) {
    	var t;

    	const block = {
    		c: function create() {
    			t = text("FAVORITE");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(t);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_default_slot_3.name, type: "slot", source: "(86:8) <Badge>", ctx });
    	return block;
    }

    // (99:4) <Button mode="outline" type="button" on:click={() => dispatch('edit', id)}>
    function create_default_slot_2(ctx) {
    	var t;

    	const block = {
    		c: function create() {
    			t = text("Edit");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(t);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_default_slot_2.name, type: "slot", source: "(99:4) <Button mode=\"outline\" type=\"button\" on:click={() => dispatch('edit', id)}>", ctx });
    	return block;
    }

    // (102:4) <Button       mode="outline"       color={isFav ? null : 'success'}       type="button"       on:click={toggleFavorite}>
    function create_default_slot_1(ctx) {
    	var t_value = ctx.isFav ? 'Unfavorite' : 'Favorite' + "", t;

    	const block = {
    		c: function create() {
    			t = text(t_value);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},

    		p: function update(changed, ctx) {
    			if ((changed.isFav) && t_value !== (t_value = ctx.isFav ? 'Unfavorite' : 'Favorite' + "")) {
    				set_data_dev(t, t_value);
    			}
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(t);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_default_slot_1.name, type: "slot", source: "(102:4) <Button       mode=\"outline\"       color={isFav ? null : 'success'}       type=\"button\"       on:click={toggleFavorite}>", ctx });
    	return block;
    }

    // (109:4) <Button type="button" on:click={() => dispatch('showdetails', id)}>
    function create_default_slot(ctx) {
    	var t;

    	const block = {
    		c: function create() {
    			t = text("Show Details");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(t);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_default_slot.name, type: "slot", source: "(109:4) <Button type=\"button\" on:click={() => dispatch('showdetails', id)}>", ctx });
    	return block;
    }

    function create_fragment$3(ctx) {
    	var article, header, h1, t0, t1, t2, h2, t3, t4, p0, t5, t6, div0, img, t7, div1, p1, t8, t9, footer, t10, t11, current;

    	var if_block = (ctx.isFav) && create_if_block$1(ctx);

    	var button0 = new Button({
    		props: {
    		mode: "outline",
    		type: "button",
    		$$slots: { default: [create_default_slot_2] },
    		$$scope: { ctx }
    	},
    		$$inline: true
    	});
    	button0.$on("click", ctx.click_handler);

    	var button1 = new Button({
    		props: {
    		mode: "outline",
    		color: ctx.isFav ? null : 'success',
    		type: "button",
    		$$slots: { default: [create_default_slot_1] },
    		$$scope: { ctx }
    	},
    		$$inline: true
    	});
    	button1.$on("click", ctx.toggleFavorite);

    	var button2 = new Button({
    		props: {
    		type: "button",
    		$$slots: { default: [create_default_slot] },
    		$$scope: { ctx }
    	},
    		$$inline: true
    	});
    	button2.$on("click", ctx.click_handler_1);

    	const block = {
    		c: function create() {
    			article = element("article");
    			header = element("header");
    			h1 = element("h1");
    			t0 = text(ctx.title);
    			t1 = space();
    			if (if_block) if_block.c();
    			t2 = space();
    			h2 = element("h2");
    			t3 = text(ctx.subtitle);
    			t4 = space();
    			p0 = element("p");
    			t5 = text(ctx.address);
    			t6 = space();
    			div0 = element("div");
    			img = element("img");
    			t7 = space();
    			div1 = element("div");
    			p1 = element("p");
    			t8 = text(ctx.description);
    			t9 = space();
    			footer = element("footer");
    			button0.$$.fragment.c();
    			t10 = space();
    			button1.$$.fragment.c();
    			t11 = space();
    			button2.$$.fragment.c();
    			attr_dev(h1, "class", "svelte-enhpap");
    			add_location(h1, file$3, 82, 4, 1255);
    			attr_dev(h2, "class", "svelte-enhpap");
    			add_location(h2, file$3, 88, 4, 1350);
    			attr_dev(p0, "class", "svelte-enhpap");
    			add_location(p0, file$3, 89, 4, 1374);
    			attr_dev(header, "class", "svelte-enhpap");
    			add_location(header, file$3, 81, 2, 1242);
    			attr_dev(img, "src", ctx.imageUrl);
    			attr_dev(img, "alt", ctx.title);
    			attr_dev(img, "class", "svelte-enhpap");
    			add_location(img, file$3, 92, 4, 1429);
    			attr_dev(div0, "class", "image svelte-enhpap");
    			add_location(div0, file$3, 91, 2, 1405);
    			attr_dev(p1, "class", "svelte-enhpap");
    			add_location(p1, file$3, 95, 4, 1501);
    			attr_dev(div1, "class", "content svelte-enhpap");
    			add_location(div1, file$3, 94, 2, 1475);
    			attr_dev(footer, "class", "svelte-enhpap");
    			add_location(footer, file$3, 97, 2, 1533);
    			attr_dev(article, "class", "svelte-enhpap");
    			add_location(article, file$3, 80, 0, 1230);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, article, anchor);
    			append_dev(article, header);
    			append_dev(header, h1);
    			append_dev(h1, t0);
    			append_dev(h1, t1);
    			if (if_block) if_block.m(h1, null);
    			append_dev(header, t2);
    			append_dev(header, h2);
    			append_dev(h2, t3);
    			append_dev(header, t4);
    			append_dev(header, p0);
    			append_dev(p0, t5);
    			append_dev(article, t6);
    			append_dev(article, div0);
    			append_dev(div0, img);
    			append_dev(article, t7);
    			append_dev(article, div1);
    			append_dev(div1, p1);
    			append_dev(p1, t8);
    			append_dev(article, t9);
    			append_dev(article, footer);
    			mount_component(button0, footer, null);
    			append_dev(footer, t10);
    			mount_component(button1, footer, null);
    			append_dev(footer, t11);
    			mount_component(button2, footer, null);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (!current || changed.title) {
    				set_data_dev(t0, ctx.title);
    			}

    			if (ctx.isFav) {
    				if (!if_block) {
    					if_block = create_if_block$1(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(h1, null);
    				} else transition_in(if_block, 1);
    			} else if (if_block) {
    				group_outros();
    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});
    				check_outros();
    			}

    			if (!current || changed.subtitle) {
    				set_data_dev(t3, ctx.subtitle);
    			}

    			if (!current || changed.address) {
    				set_data_dev(t5, ctx.address);
    			}

    			if (!current || changed.imageUrl) {
    				attr_dev(img, "src", ctx.imageUrl);
    			}

    			if (!current || changed.title) {
    				attr_dev(img, "alt", ctx.title);
    			}

    			if (!current || changed.description) {
    				set_data_dev(t8, ctx.description);
    			}

    			var button0_changes = {};
    			if (changed.$$scope) button0_changes.$$scope = { changed, ctx };
    			button0.$set(button0_changes);

    			var button1_changes = {};
    			if (changed.isFav) button1_changes.color = ctx.isFav ? null : 'success';
    			if (changed.$$scope || changed.isFav) button1_changes.$$scope = { changed, ctx };
    			button1.$set(button1_changes);

    			var button2_changes = {};
    			if (changed.$$scope) button2_changes.$$scope = { changed, ctx };
    			button2.$set(button2_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);

    			transition_in(button0.$$.fragment, local);

    			transition_in(button1.$$.fragment, local);

    			transition_in(button2.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(if_block);
    			transition_out(button0.$$.fragment, local);
    			transition_out(button1.$$.fragment, local);
    			transition_out(button2.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(article);
    			}

    			if (if_block) if_block.d();

    			destroy_component(button0);

    			destroy_component(button1);

    			destroy_component(button2);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$3.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	

      let { id, title, subtitle, imageUrl, description, address, email, isFav } = $$props;

      const dispatch = createEventDispatcher();

      function toggleFavorite() {
        customMeetupsStore.toggleFavorite(id);
      }

    	const writable_props = ['id', 'title', 'subtitle', 'imageUrl', 'description', 'address', 'email', 'isFav'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<MeetupItem> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => dispatch('edit', id);

    	const click_handler_1 = () => dispatch('showdetails', id);

    	$$self.$set = $$props => {
    		if ('id' in $$props) $$invalidate('id', id = $$props.id);
    		if ('title' in $$props) $$invalidate('title', title = $$props.title);
    		if ('subtitle' in $$props) $$invalidate('subtitle', subtitle = $$props.subtitle);
    		if ('imageUrl' in $$props) $$invalidate('imageUrl', imageUrl = $$props.imageUrl);
    		if ('description' in $$props) $$invalidate('description', description = $$props.description);
    		if ('address' in $$props) $$invalidate('address', address = $$props.address);
    		if ('email' in $$props) $$invalidate('email', email = $$props.email);
    		if ('isFav' in $$props) $$invalidate('isFav', isFav = $$props.isFav);
    	};

    	$$self.$capture_state = () => {
    		return { id, title, subtitle, imageUrl, description, address, email, isFav };
    	};

    	$$self.$inject_state = $$props => {
    		if ('id' in $$props) $$invalidate('id', id = $$props.id);
    		if ('title' in $$props) $$invalidate('title', title = $$props.title);
    		if ('subtitle' in $$props) $$invalidate('subtitle', subtitle = $$props.subtitle);
    		if ('imageUrl' in $$props) $$invalidate('imageUrl', imageUrl = $$props.imageUrl);
    		if ('description' in $$props) $$invalidate('description', description = $$props.description);
    		if ('address' in $$props) $$invalidate('address', address = $$props.address);
    		if ('email' in $$props) $$invalidate('email', email = $$props.email);
    		if ('isFav' in $$props) $$invalidate('isFav', isFav = $$props.isFav);
    	};

    	return {
    		id,
    		title,
    		subtitle,
    		imageUrl,
    		description,
    		address,
    		email,
    		isFav,
    		dispatch,
    		toggleFavorite,
    		click_handler,
    		click_handler_1
    	};
    }

    class MeetupItem extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$3, safe_not_equal, ["id", "title", "subtitle", "imageUrl", "description", "address", "email", "isFav"]);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "MeetupItem", options, id: create_fragment$3.name });

    		const { ctx } = this.$$;
    		const props = options.props || {};
    		if (ctx.id === undefined && !('id' in props)) {
    			console.warn("<MeetupItem> was created without expected prop 'id'");
    		}
    		if (ctx.title === undefined && !('title' in props)) {
    			console.warn("<MeetupItem> was created without expected prop 'title'");
    		}
    		if (ctx.subtitle === undefined && !('subtitle' in props)) {
    			console.warn("<MeetupItem> was created without expected prop 'subtitle'");
    		}
    		if (ctx.imageUrl === undefined && !('imageUrl' in props)) {
    			console.warn("<MeetupItem> was created without expected prop 'imageUrl'");
    		}
    		if (ctx.description === undefined && !('description' in props)) {
    			console.warn("<MeetupItem> was created without expected prop 'description'");
    		}
    		if (ctx.address === undefined && !('address' in props)) {
    			console.warn("<MeetupItem> was created without expected prop 'address'");
    		}
    		if (ctx.email === undefined && !('email' in props)) {
    			console.warn("<MeetupItem> was created without expected prop 'email'");
    		}
    		if (ctx.isFav === undefined && !('isFav' in props)) {
    			console.warn("<MeetupItem> was created without expected prop 'isFav'");
    		}
    	}

    	get id() {
    		throw new Error("<MeetupItem>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set id(value) {
    		throw new Error("<MeetupItem>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get title() {
    		throw new Error("<MeetupItem>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set title(value) {
    		throw new Error("<MeetupItem>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get subtitle() {
    		throw new Error("<MeetupItem>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set subtitle(value) {
    		throw new Error("<MeetupItem>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get imageUrl() {
    		throw new Error("<MeetupItem>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set imageUrl(value) {
    		throw new Error("<MeetupItem>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get description() {
    		throw new Error("<MeetupItem>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set description(value) {
    		throw new Error("<MeetupItem>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get address() {
    		throw new Error("<MeetupItem>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set address(value) {
    		throw new Error("<MeetupItem>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get email() {
    		throw new Error("<MeetupItem>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set email(value) {
    		throw new Error("<MeetupItem>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get isFav() {
    		throw new Error("<MeetupItem>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set isFav(value) {
    		throw new Error("<MeetupItem>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/Meetups/MeetupFilter.svelte generated by Svelte v3.12.1 */

    const file$4 = "src/Meetups/MeetupFilter.svelte";

    function create_fragment$4(ctx) {
    	var div, button0, t_1, button1, dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			button0 = element("button");
    			button0.textContent = "All";
    			t_1 = space();
    			button1 = element("button");
    			button1.textContent = "Favorites";
    			attr_dev(button0, "type", "button");
    			attr_dev(button0, "class", "svelte-wewm0q");
    			toggle_class(button0, "active", ctx.selectedButton === 0);
    			add_location(button0, file$4, 44, 2, 643);
    			attr_dev(button1, "type", "button");
    			attr_dev(button1, "class", "svelte-wewm0q");
    			toggle_class(button1, "active", ctx.selectedButton === 1);
    			add_location(button1, file$4, 53, 2, 816);
    			attr_dev(div, "class", "svelte-wewm0q");
    			add_location(div, file$4, 43, 0, 635);

    			dispose = [
    				listen_dev(button0, "click", ctx.click_handler),
    				listen_dev(button1, "click", ctx.click_handler_1)
    			];
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, button0);
    			append_dev(div, t_1);
    			append_dev(div, button1);
    		},

    		p: function update(changed, ctx) {
    			if (changed.selectedButton) {
    				toggle_class(button0, "active", ctx.selectedButton === 0);
    				toggle_class(button1, "active", ctx.selectedButton === 1);
    			}
    		},

    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(div);
    			}

    			run_all(dispose);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$4.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	const dispatch = createEventDispatcher();

      let selectedButton = 0;

    	const click_handler = () => {
    	      $$invalidate('selectedButton', selectedButton = 0);
    	      dispatch('select', 0);
    	    };

    	const click_handler_1 = () => {
    	      $$invalidate('selectedButton', selectedButton = 1);
    	      dispatch('select', 1);
    	    };

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ('selectedButton' in $$props) $$invalidate('selectedButton', selectedButton = $$props.selectedButton);
    	};

    	return {
    		dispatch,
    		selectedButton,
    		click_handler,
    		click_handler_1
    	};
    }

    class MeetupFilter extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$4, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "MeetupFilter", options, id: create_fragment$4.name });
    	}
    }

    /* src/Meetups/MeetupGrid.svelte generated by Svelte v3.12.1 */

    const file$5 = "src/Meetups/MeetupGrid.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = Object.create(ctx);
    	child_ctx.meetup = list[i];
    	return child_ctx;
    }

    // (43:2) <Button on:click={() => dispatch('add')}>
    function create_default_slot$1(ctx) {
    	var t;

    	const block = {
    		c: function create() {
    			t = text("New Meetup");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(t);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_default_slot$1.name, type: "slot", source: "(43:2) <Button on:click={() => dispatch('add')}>", ctx });
    	return block;
    }

    // (46:2) {#each filteredMeetups as meetup}
    function create_each_block(ctx) {
    	var current;

    	var meetupitem = new MeetupItem({
    		props: {
    		id: ctx.meetup.id,
    		title: ctx.meetup.title,
    		subtitle: ctx.meetup.subtitle,
    		description: ctx.meetup.description,
    		imageUrl: ctx.meetup.imageUrl,
    		email: ctx.meetup.contactEmail,
    		address: ctx.meetup.address,
    		isFav: ctx.meetup.isFavorite
    	},
    		$$inline: true
    	});
    	meetupitem.$on("showdetails", ctx.showdetails_handler);
    	meetupitem.$on("edit", ctx.edit_handler);

    	const block = {
    		c: function create() {
    			meetupitem.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			mount_component(meetupitem, target, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var meetupitem_changes = {};
    			if (changed.filteredMeetups) meetupitem_changes.id = ctx.meetup.id;
    			if (changed.filteredMeetups) meetupitem_changes.title = ctx.meetup.title;
    			if (changed.filteredMeetups) meetupitem_changes.subtitle = ctx.meetup.subtitle;
    			if (changed.filteredMeetups) meetupitem_changes.description = ctx.meetup.description;
    			if (changed.filteredMeetups) meetupitem_changes.imageUrl = ctx.meetup.imageUrl;
    			if (changed.filteredMeetups) meetupitem_changes.email = ctx.meetup.contactEmail;
    			if (changed.filteredMeetups) meetupitem_changes.address = ctx.meetup.address;
    			if (changed.filteredMeetups) meetupitem_changes.isFav = ctx.meetup.isFavorite;
    			meetupitem.$set(meetupitem_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(meetupitem.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(meetupitem.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(meetupitem, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_each_block.name, type: "each", source: "(46:2) {#each filteredMeetups as meetup}", ctx });
    	return block;
    }

    function create_fragment$5(ctx) {
    	var section0, t0, t1, section1, current;

    	var meetupfilter = new MeetupFilter({ $$inline: true });
    	meetupfilter.$on("select", ctx.setFilter);

    	var button = new Button({
    		props: {
    		$$slots: { default: [create_default_slot$1] },
    		$$scope: { ctx }
    	},
    		$$inline: true
    	});
    	button.$on("click", ctx.click_handler);

    	let each_value = ctx.filteredMeetups;

    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			section0 = element("section");
    			meetupfilter.$$.fragment.c();
    			t0 = space();
    			button.$$.fragment.c();
    			t1 = space();
    			section1 = element("section");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}
    			attr_dev(section0, "id", "meetup-controls");
    			attr_dev(section0, "class", "svelte-intkc5");
    			add_location(section0, file$5, 40, 0, 780);
    			attr_dev(section1, "id", "meetups");
    			attr_dev(section1, "class", "svelte-intkc5");
    			add_location(section1, file$5, 44, 0, 926);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, section0, anchor);
    			mount_component(meetupfilter, section0, null);
    			append_dev(section0, t0);
    			mount_component(button, section0, null);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, section1, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(section1, null);
    			}

    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var button_changes = {};
    			if (changed.$$scope) button_changes.$$scope = { changed, ctx };
    			button.$set(button_changes);

    			if (changed.filteredMeetups) {
    				each_value = ctx.filteredMeetups;

    				let i;
    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(changed, child_ctx);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(section1, null);
    					}
    				}

    				group_outros();
    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}
    				check_outros();
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(meetupfilter.$$.fragment, local);

    			transition_in(button.$$.fragment, local);

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(meetupfilter.$$.fragment, local);
    			transition_out(button.$$.fragment, local);

    			each_blocks = each_blocks.filter(Boolean);
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(section0);
    			}

    			destroy_component(meetupfilter);

    			destroy_component(button);

    			if (detaching) {
    				detach_dev(t1);
    				detach_dev(section1);
    			}

    			destroy_each(each_blocks, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$5.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	

      let { meetups } = $$props;

      const dispatch = createEventDispatcher();

      let favsOnly = false;

      function setFilter(event) {
        $$invalidate('favsOnly', favsOnly = event.detail === 1);
      }

    	const writable_props = ['meetups'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<MeetupGrid> was created with unknown prop '${key}'`);
    	});

    	function showdetails_handler(event) {
    		bubble($$self, event);
    	}

    	function edit_handler(event) {
    		bubble($$self, event);
    	}

    	const click_handler = () => dispatch('add');

    	$$self.$set = $$props => {
    		if ('meetups' in $$props) $$invalidate('meetups', meetups = $$props.meetups);
    	};

    	$$self.$capture_state = () => {
    		return { meetups, favsOnly, filteredMeetups };
    	};

    	$$self.$inject_state = $$props => {
    		if ('meetups' in $$props) $$invalidate('meetups', meetups = $$props.meetups);
    		if ('favsOnly' in $$props) $$invalidate('favsOnly', favsOnly = $$props.favsOnly);
    		if ('filteredMeetups' in $$props) $$invalidate('filteredMeetups', filteredMeetups = $$props.filteredMeetups);
    	};

    	let filteredMeetups;

    	$$self.$$.update = ($$dirty = { favsOnly: 1, meetups: 1 }) => {
    		if ($$dirty.favsOnly || $$dirty.meetups) { $$invalidate('filteredMeetups', filteredMeetups = favsOnly ? meetups.filter(m => m.isFavorite) : meetups); }
    	};

    	return {
    		meetups,
    		dispatch,
    		setFilter,
    		filteredMeetups,
    		showdetails_handler,
    		edit_handler,
    		click_handler
    	};
    }

    class MeetupGrid extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$5, safe_not_equal, ["meetups"]);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "MeetupGrid", options, id: create_fragment$5.name });

    		const { ctx } = this.$$;
    		const props = options.props || {};
    		if (ctx.meetups === undefined && !('meetups' in props)) {
    			console.warn("<MeetupGrid> was created without expected prop 'meetups'");
    		}
    	}

    	get meetups() {
    		throw new Error("<MeetupGrid>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set meetups(value) {
    		throw new Error("<MeetupGrid>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/UI/TextInput.svelte generated by Svelte v3.12.1 */

    const file$6 = "src/UI/TextInput.svelte";

    // (61:2) {:else}
    function create_else_block$1(ctx) {
    	var input, dispose;

    	const block = {
    		c: function create() {
    			input = element("input");
    			attr_dev(input, "type", ctx.type);
    			attr_dev(input, "id", ctx.id);
    			input.value = ctx.value;
    			attr_dev(input, "class", "svelte-1mrfx4j");
    			toggle_class(input, "invalid", !ctx.valid && ctx.touched);
    			add_location(input, file$6, 61, 4, 1128);

    			dispose = [
    				listen_dev(input, "input", ctx.input_handler),
    				listen_dev(input, "blur", ctx.blur_handler_1)
    			];
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, input, anchor);
    		},

    		p: function update(changed, ctx) {
    			if (changed.type) {
    				attr_dev(input, "type", ctx.type);
    			}

    			if (changed.id) {
    				attr_dev(input, "id", ctx.id);
    			}

    			if (changed.value) {
    				prop_dev(input, "value", ctx.value);
    			}

    			if ((changed.valid || changed.touched)) {
    				toggle_class(input, "invalid", !ctx.valid && ctx.touched);
    			}
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(input);
    			}

    			run_all(dispose);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_else_block$1.name, type: "else", source: "(61:2) {:else}", ctx });
    	return block;
    }

    // (59:2) {#if controlType === 'textarea'}
    function create_if_block_1(ctx) {
    	var textarea, dispose;

    	const block = {
    		c: function create() {
    			textarea = element("textarea");
    			attr_dev(textarea, "rows", ctx.rows);
    			attr_dev(textarea, "id", ctx.id);
    			attr_dev(textarea, "class", "svelte-1mrfx4j");
    			toggle_class(textarea, "invalid", !ctx.valid && ctx.touched);
    			add_location(textarea, file$6, 59, 4, 1011);

    			dispose = [
    				listen_dev(textarea, "input", ctx.textarea_input_handler),
    				listen_dev(textarea, "blur", ctx.blur_handler)
    			];
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, textarea, anchor);

    			set_input_value(textarea, ctx.value);
    		},

    		p: function update(changed, ctx) {
    			if (changed.value) set_input_value(textarea, ctx.value);

    			if (changed.rows) {
    				attr_dev(textarea, "rows", ctx.rows);
    			}

    			if (changed.id) {
    				attr_dev(textarea, "id", ctx.id);
    			}

    			if ((changed.valid || changed.touched)) {
    				toggle_class(textarea, "invalid", !ctx.valid && ctx.touched);
    			}
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(textarea);
    			}

    			run_all(dispose);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_1.name, type: "if", source: "(59:2) {#if controlType === 'textarea'}", ctx });
    	return block;
    }

    // (64:2) {#if validityMessage && !valid && touched}
    function create_if_block$2(ctx) {
    	var p, t;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t = text(ctx.validityMessage);
    			attr_dev(p, "class", "error-message svelte-1mrfx4j");
    			add_location(p, file$6, 64, 4, 1291);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t);
    		},

    		p: function update(changed, ctx) {
    			if (changed.validityMessage) {
    				set_data_dev(t, ctx.validityMessage);
    			}
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(p);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block$2.name, type: "if", source: "(64:2) {#if validityMessage && !valid && touched}", ctx });
    	return block;
    }

    function create_fragment$6(ctx) {
    	var div, label_1, t0, t1, t2;

    	function select_block_type(changed, ctx) {
    		if (ctx.controlType === 'textarea') return create_if_block_1;
    		return create_else_block$1;
    	}

    	var current_block_type = select_block_type(null, ctx);
    	var if_block0 = current_block_type(ctx);

    	var if_block1 = (ctx.validityMessage && !ctx.valid && ctx.touched) && create_if_block$2(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			label_1 = element("label");
    			t0 = text(ctx.label);
    			t1 = space();
    			if_block0.c();
    			t2 = space();
    			if (if_block1) if_block1.c();
    			attr_dev(label_1, "for", ctx.id);
    			attr_dev(label_1, "class", "svelte-1mrfx4j");
    			add_location(label_1, file$6, 57, 2, 940);
    			attr_dev(div, "class", "form-control svelte-1mrfx4j");
    			add_location(div, file$6, 56, 0, 911);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, label_1);
    			append_dev(label_1, t0);
    			append_dev(div, t1);
    			if_block0.m(div, null);
    			append_dev(div, t2);
    			if (if_block1) if_block1.m(div, null);
    		},

    		p: function update(changed, ctx) {
    			if (changed.label) {
    				set_data_dev(t0, ctx.label);
    			}

    			if (changed.id) {
    				attr_dev(label_1, "for", ctx.id);
    			}

    			if (current_block_type === (current_block_type = select_block_type(changed, ctx)) && if_block0) {
    				if_block0.p(changed, ctx);
    			} else {
    				if_block0.d(1);
    				if_block0 = current_block_type(ctx);
    				if (if_block0) {
    					if_block0.c();
    					if_block0.m(div, t2);
    				}
    			}

    			if (ctx.validityMessage && !ctx.valid && ctx.touched) {
    				if (if_block1) {
    					if_block1.p(changed, ctx);
    				} else {
    					if_block1 = create_if_block$2(ctx);
    					if_block1.c();
    					if_block1.m(div, null);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}
    		},

    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(div);
    			}

    			if_block0.d();
    			if (if_block1) if_block1.d();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$6.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let { controlType = null, id, label, rows = null, value, type = "text", valid = true, validityMessage = "" } = $$props;

      let touched = false;

    	const writable_props = ['controlType', 'id', 'label', 'rows', 'value', 'type', 'valid', 'validityMessage'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<TextInput> was created with unknown prop '${key}'`);
    	});

    	function input_handler(event) {
    		bubble($$self, event);
    	}

    	function textarea_input_handler() {
    		value = this.value;
    		$$invalidate('value', value);
    	}

    	const blur_handler = () => $$invalidate('touched', touched = true);

    	const blur_handler_1 = () => $$invalidate('touched', touched = true);

    	$$self.$set = $$props => {
    		if ('controlType' in $$props) $$invalidate('controlType', controlType = $$props.controlType);
    		if ('id' in $$props) $$invalidate('id', id = $$props.id);
    		if ('label' in $$props) $$invalidate('label', label = $$props.label);
    		if ('rows' in $$props) $$invalidate('rows', rows = $$props.rows);
    		if ('value' in $$props) $$invalidate('value', value = $$props.value);
    		if ('type' in $$props) $$invalidate('type', type = $$props.type);
    		if ('valid' in $$props) $$invalidate('valid', valid = $$props.valid);
    		if ('validityMessage' in $$props) $$invalidate('validityMessage', validityMessage = $$props.validityMessage);
    	};

    	$$self.$capture_state = () => {
    		return { controlType, id, label, rows, value, type, valid, validityMessage, touched };
    	};

    	$$self.$inject_state = $$props => {
    		if ('controlType' in $$props) $$invalidate('controlType', controlType = $$props.controlType);
    		if ('id' in $$props) $$invalidate('id', id = $$props.id);
    		if ('label' in $$props) $$invalidate('label', label = $$props.label);
    		if ('rows' in $$props) $$invalidate('rows', rows = $$props.rows);
    		if ('value' in $$props) $$invalidate('value', value = $$props.value);
    		if ('type' in $$props) $$invalidate('type', type = $$props.type);
    		if ('valid' in $$props) $$invalidate('valid', valid = $$props.valid);
    		if ('validityMessage' in $$props) $$invalidate('validityMessage', validityMessage = $$props.validityMessage);
    		if ('touched' in $$props) $$invalidate('touched', touched = $$props.touched);
    	};

    	return {
    		controlType,
    		id,
    		label,
    		rows,
    		value,
    		type,
    		valid,
    		validityMessage,
    		touched,
    		input_handler,
    		textarea_input_handler,
    		blur_handler,
    		blur_handler_1
    	};
    }

    class TextInput extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$6, safe_not_equal, ["controlType", "id", "label", "rows", "value", "type", "valid", "validityMessage"]);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "TextInput", options, id: create_fragment$6.name });

    		const { ctx } = this.$$;
    		const props = options.props || {};
    		if (ctx.id === undefined && !('id' in props)) {
    			console.warn("<TextInput> was created without expected prop 'id'");
    		}
    		if (ctx.label === undefined && !('label' in props)) {
    			console.warn("<TextInput> was created without expected prop 'label'");
    		}
    		if (ctx.value === undefined && !('value' in props)) {
    			console.warn("<TextInput> was created without expected prop 'value'");
    		}
    	}

    	get controlType() {
    		throw new Error("<TextInput>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set controlType(value) {
    		throw new Error("<TextInput>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get id() {
    		throw new Error("<TextInput>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set id(value) {
    		throw new Error("<TextInput>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get label() {
    		throw new Error("<TextInput>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set label(value) {
    		throw new Error("<TextInput>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get rows() {
    		throw new Error("<TextInput>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set rows(value) {
    		throw new Error("<TextInput>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get value() {
    		throw new Error("<TextInput>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set value(value) {
    		throw new Error("<TextInput>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get type() {
    		throw new Error("<TextInput>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set type(value) {
    		throw new Error("<TextInput>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get valid() {
    		throw new Error("<TextInput>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set valid(value) {
    		throw new Error("<TextInput>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get validityMessage() {
    		throw new Error("<TextInput>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set validityMessage(value) {
    		throw new Error("<TextInput>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/UI/Modal.svelte generated by Svelte v3.12.1 */

    const file$7 = "src/UI/Modal.svelte";

    const get_footer_slot_changes = () => ({});
    const get_footer_slot_context = () => ({});

    // (69:6) <Button on:click={closeModal}>
    function create_default_slot$2(ctx) {
    	var t;

    	const block = {
    		c: function create() {
    			t = text("Close");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(t);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_default_slot$2.name, type: "slot", source: "(69:6) <Button on:click={closeModal}>", ctx });
    	return block;
    }

    function create_fragment$7(ctx) {
    	var div0, t0, div2, h1, t1, t2, div1, t3, footer, current, dispose;

    	const default_slot_template = ctx.$$slots.default;
    	const default_slot = create_slot(default_slot_template, ctx, null);

    	const footer_slot_template = ctx.$$slots.footer;
    	const footer_slot = create_slot(footer_slot_template, ctx, get_footer_slot_context);

    	var button = new Button({
    		props: {
    		$$slots: { default: [create_default_slot$2] },
    		$$scope: { ctx }
    	},
    		$$inline: true
    	});
    	button.$on("click", ctx.closeModal);

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			t0 = space();
    			div2 = element("div");
    			h1 = element("h1");
    			t1 = text(ctx.title);
    			t2 = space();
    			div1 = element("div");

    			if (default_slot) default_slot.c();
    			t3 = space();
    			footer = element("footer");

    			if (!footer_slot) {
    				button.$$.fragment.c();
    			}

    			if (footer_slot) footer_slot.c();
    			attr_dev(div0, "class", "modal-backdrop svelte-1wfedfe");
    			add_location(div0, file$7, 60, 0, 950);
    			attr_dev(h1, "class", "svelte-1wfedfe");
    			add_location(h1, file$7, 62, 2, 1025);

    			attr_dev(div1, "class", "content svelte-1wfedfe");
    			add_location(div1, file$7, 63, 2, 1044);

    			attr_dev(footer, "class", "svelte-1wfedfe");
    			add_location(footer, file$7, 66, 2, 1090);
    			attr_dev(div2, "class", "modal svelte-1wfedfe");
    			add_location(div2, file$7, 61, 0, 1003);
    			dispose = listen_dev(div0, "click", ctx.closeModal);
    		},

    		l: function claim(nodes) {
    			if (default_slot) default_slot.l(div1_nodes);

    			if (footer_slot) footer_slot.l(footer_nodes);
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div2, anchor);
    			append_dev(div2, h1);
    			append_dev(h1, t1);
    			append_dev(div2, t2);
    			append_dev(div2, div1);

    			if (default_slot) {
    				default_slot.m(div1, null);
    			}

    			append_dev(div2, t3);
    			append_dev(div2, footer);

    			if (!footer_slot) {
    				mount_component(button, footer, null);
    			}

    			else {
    				footer_slot.m(footer, null);
    			}

    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (!current || changed.title) {
    				set_data_dev(t1, ctx.title);
    			}

    			if (default_slot && default_slot.p && changed.$$scope) {
    				default_slot.p(
    					get_slot_changes(default_slot_template, ctx, changed, null),
    					get_slot_context(default_slot_template, ctx, null)
    				);
    			}

    			if (!footer_slot) {
    				var button_changes = {};
    				if (changed.$$scope) button_changes.$$scope = { changed, ctx };
    				button.$set(button_changes);
    			}

    			if (footer_slot && footer_slot.p && changed.$$scope) {
    				footer_slot.p(
    					get_slot_changes(footer_slot_template, ctx, changed, get_footer_slot_changes),
    					get_slot_context(footer_slot_template, ctx, get_footer_slot_context)
    				);
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);

    			transition_in(button.$$.fragment, local);

    			transition_in(footer_slot, local);
    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(default_slot, local);
    			transition_out(button.$$.fragment, local);
    			transition_out(footer_slot, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(div0);
    				detach_dev(t0);
    				detach_dev(div2);
    			}

    			if (default_slot) default_slot.d(detaching);

    			if (!footer_slot) {
    				destroy_component(button);
    			}

    			if (footer_slot) footer_slot.d(detaching);
    			dispose();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$7.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$6($$self, $$props, $$invalidate) {
    	

      let { title } = $$props;

      const dispatch = createEventDispatcher();

      function closeModal() {
        dispatch("cancel");
      }

    	const writable_props = ['title'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<Modal> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;

    	$$self.$set = $$props => {
    		if ('title' in $$props) $$invalidate('title', title = $$props.title);
    		if ('$$scope' in $$props) $$invalidate('$$scope', $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => {
    		return { title };
    	};

    	$$self.$inject_state = $$props => {
    		if ('title' in $$props) $$invalidate('title', title = $$props.title);
    	};

    	return { title, closeModal, $$slots, $$scope };
    }

    class Modal extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$6, create_fragment$7, safe_not_equal, ["title"]);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Modal", options, id: create_fragment$7.name });

    		const { ctx } = this.$$;
    		const props = options.props || {};
    		if (ctx.title === undefined && !('title' in props)) {
    			console.warn("<Modal> was created without expected prop 'title'");
    		}
    	}

    	get title() {
    		throw new Error("<Modal>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set title(value) {
    		throw new Error("<Modal>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    function isEmpty(val) {
      return val.trim().length === 0;
    }

    function isValidEmail(val) {
      return new RegExp(
        "[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?"
      ).test(val);
    }

    /* src/Meetups/EditMeetup.svelte generated by Svelte v3.12.1 */

    const file$8 = "src/Meetups/EditMeetup.svelte";

    // (130:4) <Button type="button" mode="outline" on:click={cancel}>
    function create_default_slot_3$1(ctx) {
    	var t;

    	const block = {
    		c: function create() {
    			t = text("Cancel");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(t);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_default_slot_3$1.name, type: "slot", source: "(130:4) <Button type=\"button\" mode=\"outline\" on:click={cancel}>", ctx });
    	return block;
    }

    // (131:4) <Button type="button" on:click={submitForm} disabled={!formIsValid}>
    function create_default_slot_2$1(ctx) {
    	var t;

    	const block = {
    		c: function create() {
    			t = text("Save");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(t);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_default_slot_2$1.name, type: "slot", source: "(131:4) <Button type=\"button\" on:click={submitForm} disabled={!formIsValid}>", ctx });
    	return block;
    }

    // (134:4) {#if id}
    function create_if_block$3(ctx) {
    	var current;

    	var button = new Button({
    		props: {
    		type: "button",
    		$$slots: { default: [create_default_slot_1$1] },
    		$$scope: { ctx }
    	},
    		$$inline: true
    	});
    	button.$on("click", ctx.deleteMeetup);

    	const block = {
    		c: function create() {
    			button.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			mount_component(button, target, anchor);
    			current = true;
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(button.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(button.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(button, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block$3.name, type: "if", source: "(134:4) {#if id}", ctx });
    	return block;
    }

    // (135:6) <Button type="button" on:click={deleteMeetup}>
    function create_default_slot_1$1(ctx) {
    	var t;

    	const block = {
    		c: function create() {
    			t = text("Delete");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(t);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_default_slot_1$1.name, type: "slot", source: "(135:6) <Button type=\"button\" on:click={deleteMeetup}>", ctx });
    	return block;
    }

    // (129:2) <div slot="footer">
    function create_footer_slot(ctx) {
    	var div, t0, t1, current;

    	var button0 = new Button({
    		props: {
    		type: "button",
    		mode: "outline",
    		$$slots: { default: [create_default_slot_3$1] },
    		$$scope: { ctx }
    	},
    		$$inline: true
    	});
    	button0.$on("click", ctx.cancel);

    	var button1 = new Button({
    		props: {
    		type: "button",
    		disabled: !ctx.formIsValid,
    		$$slots: { default: [create_default_slot_2$1] },
    		$$scope: { ctx }
    	},
    		$$inline: true
    	});
    	button1.$on("click", ctx.submitForm);

    	var if_block = (ctx.id) && create_if_block$3(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			button0.$$.fragment.c();
    			t0 = space();
    			button1.$$.fragment.c();
    			t1 = space();
    			if (if_block) if_block.c();
    			attr_dev(div, "slot", "footer");
    			add_location(div, file$8, 128, 2, 3305);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(button0, div, null);
    			append_dev(div, t0);
    			mount_component(button1, div, null);
    			append_dev(div, t1);
    			if (if_block) if_block.m(div, null);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var button0_changes = {};
    			if (changed.$$scope) button0_changes.$$scope = { changed, ctx };
    			button0.$set(button0_changes);

    			var button1_changes = {};
    			if (changed.formIsValid) button1_changes.disabled = !ctx.formIsValid;
    			if (changed.$$scope) button1_changes.$$scope = { changed, ctx };
    			button1.$set(button1_changes);

    			if (ctx.id) {
    				if (!if_block) {
    					if_block = create_if_block$3(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(div, null);
    				} else transition_in(if_block, 1);
    			} else if (if_block) {
    				group_outros();
    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});
    				check_outros();
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(button0.$$.fragment, local);

    			transition_in(button1.$$.fragment, local);

    			transition_in(if_block);
    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(button0.$$.fragment, local);
    			transition_out(button1.$$.fragment, local);
    			transition_out(if_block);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(div);
    			}

    			destroy_component(button0);

    			destroy_component(button1);

    			if (if_block) if_block.d();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_footer_slot.name, type: "slot", source: "(129:2) <div slot=\"footer\">", ctx });
    	return block;
    }

    // (83:0) <Modal title="Edit Meetup Data" on:cancel>
    function create_default_slot$3(ctx) {
    	var form, t0, t1, t2, t3, t4, updating_value, t5, current, dispose;

    	var textinput0 = new TextInput({
    		props: {
    		id: "title",
    		label: "Title",
    		valid: ctx.titleValid,
    		validityMessage: "Please enter a valid title.",
    		value: ctx.title
    	},
    		$$inline: true
    	});
    	textinput0.$on("input", ctx.input_handler);

    	var textinput1 = new TextInput({
    		props: {
    		id: "subtitle",
    		label: "Subtitle",
    		valid: ctx.subtitleValid,
    		validityMessage: "Please enter a valid subtitle.",
    		value: ctx.subtitle
    	},
    		$$inline: true
    	});
    	textinput1.$on("input", ctx.input_handler_1);

    	var textinput2 = new TextInput({
    		props: {
    		id: "address",
    		label: "Address",
    		valid: ctx.addressValid,
    		validityMessage: "Please enter a valid address.",
    		value: ctx.address
    	},
    		$$inline: true
    	});
    	textinput2.$on("input", ctx.input_handler_2);

    	var textinput3 = new TextInput({
    		props: {
    		id: "imageUrl",
    		label: "Image URL",
    		valid: ctx.imageUrlValid,
    		validityMessage: "Please enter a valid image url.",
    		value: ctx.imageUrl
    	},
    		$$inline: true
    	});
    	textinput3.$on("input", ctx.input_handler_3);

    	var textinput4 = new TextInput({
    		props: {
    		id: "email",
    		label: "E-Mail",
    		type: "email",
    		valid: ctx.emailValid,
    		validityMessage: "Please enter a valid email address.",
    		value: ctx.email
    	},
    		$$inline: true
    	});
    	textinput4.$on("input", ctx.input_handler_4);

    	function textinput5_value_binding(value) {
    		ctx.textinput5_value_binding.call(null, value);
    		updating_value = true;
    		add_flush_callback(() => updating_value = false);
    	}

    	let textinput5_props = {
    		id: "description",
    		label: "Description",
    		controlType: "textarea",
    		valid: ctx.descriptionValid,
    		validityMessage: "Please enter a valid description."
    	};
    	if (ctx.description !== void 0) {
    		textinput5_props.value = ctx.description;
    	}
    	var textinput5 = new TextInput({ props: textinput5_props, $$inline: true });

    	binding_callbacks.push(() => bind(textinput5, 'value', textinput5_value_binding));

    	const block = {
    		c: function create() {
    			form = element("form");
    			textinput0.$$.fragment.c();
    			t0 = space();
    			textinput1.$$.fragment.c();
    			t1 = space();
    			textinput2.$$.fragment.c();
    			t2 = space();
    			textinput3.$$.fragment.c();
    			t3 = space();
    			textinput4.$$.fragment.c();
    			t4 = space();
    			textinput5.$$.fragment.c();
    			t5 = space();
    			attr_dev(form, "class", "svelte-no1xoc");
    			add_location(form, file$8, 83, 2, 1934);
    			dispose = listen_dev(form, "submit", ctx.submitForm);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, form, anchor);
    			mount_component(textinput0, form, null);
    			append_dev(form, t0);
    			mount_component(textinput1, form, null);
    			append_dev(form, t1);
    			mount_component(textinput2, form, null);
    			append_dev(form, t2);
    			mount_component(textinput3, form, null);
    			append_dev(form, t3);
    			mount_component(textinput4, form, null);
    			append_dev(form, t4);
    			mount_component(textinput5, form, null);
    			insert_dev(target, t5, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var textinput0_changes = {};
    			if (changed.titleValid) textinput0_changes.valid = ctx.titleValid;
    			if (changed.title) textinput0_changes.value = ctx.title;
    			textinput0.$set(textinput0_changes);

    			var textinput1_changes = {};
    			if (changed.subtitleValid) textinput1_changes.valid = ctx.subtitleValid;
    			if (changed.subtitle) textinput1_changes.value = ctx.subtitle;
    			textinput1.$set(textinput1_changes);

    			var textinput2_changes = {};
    			if (changed.addressValid) textinput2_changes.valid = ctx.addressValid;
    			if (changed.address) textinput2_changes.value = ctx.address;
    			textinput2.$set(textinput2_changes);

    			var textinput3_changes = {};
    			if (changed.imageUrlValid) textinput3_changes.valid = ctx.imageUrlValid;
    			if (changed.imageUrl) textinput3_changes.value = ctx.imageUrl;
    			textinput3.$set(textinput3_changes);

    			var textinput4_changes = {};
    			if (changed.emailValid) textinput4_changes.valid = ctx.emailValid;
    			if (changed.email) textinput4_changes.value = ctx.email;
    			textinput4.$set(textinput4_changes);

    			var textinput5_changes = {};
    			if (changed.descriptionValid) textinput5_changes.valid = ctx.descriptionValid;
    			if (!updating_value && changed.description) {
    				textinput5_changes.value = ctx.description;
    			}
    			textinput5.$set(textinput5_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(textinput0.$$.fragment, local);

    			transition_in(textinput1.$$.fragment, local);

    			transition_in(textinput2.$$.fragment, local);

    			transition_in(textinput3.$$.fragment, local);

    			transition_in(textinput4.$$.fragment, local);

    			transition_in(textinput5.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(textinput0.$$.fragment, local);
    			transition_out(textinput1.$$.fragment, local);
    			transition_out(textinput2.$$.fragment, local);
    			transition_out(textinput3.$$.fragment, local);
    			transition_out(textinput4.$$.fragment, local);
    			transition_out(textinput5.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(form);
    			}

    			destroy_component(textinput0);

    			destroy_component(textinput1);

    			destroy_component(textinput2);

    			destroy_component(textinput3);

    			destroy_component(textinput4);

    			destroy_component(textinput5);

    			if (detaching) {
    				detach_dev(t5);
    			}

    			dispose();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_default_slot$3.name, type: "slot", source: "(83:0) <Modal title=\"Edit Meetup Data\" on:cancel>", ctx });
    	return block;
    }

    function create_fragment$8(ctx) {
    	var current;

    	var modal = new Modal({
    		props: {
    		title: "Edit Meetup Data",
    		$$slots: {
    		default: [create_default_slot$3],
    		footer: [create_footer_slot]
    	},
    		$$scope: { ctx }
    	},
    		$$inline: true
    	});
    	modal.$on("cancel", ctx.cancel_handler);

    	const block = {
    		c: function create() {
    			modal.$$.fragment.c();
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			mount_component(modal, target, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var modal_changes = {};
    			if (changed.$$scope || changed.id || changed.formIsValid || changed.descriptionValid || changed.description || changed.emailValid || changed.email || changed.imageUrlValid || changed.imageUrl || changed.addressValid || changed.address || changed.subtitleValid || changed.subtitle || changed.titleValid || changed.title) modal_changes.$$scope = { changed, ctx };
    			modal.$set(modal_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(modal.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(modal.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(modal, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$8.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$7($$self, $$props, $$invalidate) {
    	

      let { id = null } = $$props;

      let title = "";
      let subtitle = "";
      let address = "";
      let email = "";
      let description = "";
      let imageUrl = "";

      if (id) {
        const unsubscribe = customMeetupsStore.subscribe(items => {
          const selectedMeetup = items.find(i => i.id === id);
          $$invalidate('title', title = selectedMeetup.title);
          $$invalidate('subtitle', subtitle = selectedMeetup.subtitle);
          $$invalidate('address', address = selectedMeetup.address);
          $$invalidate('email', email = selectedMeetup.contactEmail);
          $$invalidate('description', description = selectedMeetup.description);
          $$invalidate('imageUrl', imageUrl = selectedMeetup.imageUrl);
        });

        unsubscribe();
      }

      const dispatch = createEventDispatcher();

      function submitForm() {
        const meetupData = {
          title: title,
          subtitle: subtitle,
          description: description,
          imageUrl: imageUrl,
          contactEmail: email,
          address: address
        };

        // meetups.push(newMeetup); // DOES NOT WORK!
        if (id) {
          customMeetupsStore.updateMeetup(id, meetupData);
        } else {
          customMeetupsStore.addMeetup(meetupData);
        }
        dispatch("save");
      }

      function deleteMeetup() {
        customMeetupsStore.removeMeetup(id);
        dispatch("save");
      }

      function cancel() {
        dispatch("cancel");
      }

    	const writable_props = ['id'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<EditMeetup> was created with unknown prop '${key}'`);
    	});

    	function cancel_handler(event) {
    		bubble($$self, event);
    	}

    	const input_handler = (event) => ($$invalidate('title', title = event.target.value));

    	const input_handler_1 = (event) => ($$invalidate('subtitle', subtitle = event.target.value));

    	const input_handler_2 = (event) => ($$invalidate('address', address = event.target.value));

    	const input_handler_3 = (event) => ($$invalidate('imageUrl', imageUrl = event.target.value));

    	const input_handler_4 = (event) => ($$invalidate('email', email = event.target.value));

    	function textinput5_value_binding(value) {
    		description = value;
    		$$invalidate('description', description);
    	}

    	$$self.$set = $$props => {
    		if ('id' in $$props) $$invalidate('id', id = $$props.id);
    	};

    	$$self.$capture_state = () => {
    		return { id, title, subtitle, address, email, description, imageUrl, titleValid, subtitleValid, addressValid, descriptionValid, imageUrlValid, emailValid, formIsValid };
    	};

    	$$self.$inject_state = $$props => {
    		if ('id' in $$props) $$invalidate('id', id = $$props.id);
    		if ('title' in $$props) $$invalidate('title', title = $$props.title);
    		if ('subtitle' in $$props) $$invalidate('subtitle', subtitle = $$props.subtitle);
    		if ('address' in $$props) $$invalidate('address', address = $$props.address);
    		if ('email' in $$props) $$invalidate('email', email = $$props.email);
    		if ('description' in $$props) $$invalidate('description', description = $$props.description);
    		if ('imageUrl' in $$props) $$invalidate('imageUrl', imageUrl = $$props.imageUrl);
    		if ('titleValid' in $$props) $$invalidate('titleValid', titleValid = $$props.titleValid);
    		if ('subtitleValid' in $$props) $$invalidate('subtitleValid', subtitleValid = $$props.subtitleValid);
    		if ('addressValid' in $$props) $$invalidate('addressValid', addressValid = $$props.addressValid);
    		if ('descriptionValid' in $$props) $$invalidate('descriptionValid', descriptionValid = $$props.descriptionValid);
    		if ('imageUrlValid' in $$props) $$invalidate('imageUrlValid', imageUrlValid = $$props.imageUrlValid);
    		if ('emailValid' in $$props) $$invalidate('emailValid', emailValid = $$props.emailValid);
    		if ('formIsValid' in $$props) $$invalidate('formIsValid', formIsValid = $$props.formIsValid);
    	};

    	let titleValid, subtitleValid, addressValid, descriptionValid, imageUrlValid, emailValid, formIsValid;

    	$$self.$$.update = ($$dirty = { title: 1, subtitle: 1, address: 1, description: 1, imageUrl: 1, email: 1, titleValid: 1, subtitleValid: 1, addressValid: 1, descriptionValid: 1, imageUrlValid: 1, emailValid: 1 }) => {
    		if ($$dirty.title) { $$invalidate('titleValid', titleValid = !isEmpty(title)); }
    		if ($$dirty.subtitle) { $$invalidate('subtitleValid', subtitleValid = !isEmpty(subtitle)); }
    		if ($$dirty.address) { $$invalidate('addressValid', addressValid = !isEmpty(address)); }
    		if ($$dirty.description) { $$invalidate('descriptionValid', descriptionValid = !isEmpty(description)); }
    		if ($$dirty.imageUrl) { $$invalidate('imageUrlValid', imageUrlValid = !isEmpty(imageUrl)); }
    		if ($$dirty.email) { $$invalidate('emailValid', emailValid = isValidEmail(email)); }
    		if ($$dirty.titleValid || $$dirty.subtitleValid || $$dirty.addressValid || $$dirty.descriptionValid || $$dirty.imageUrlValid || $$dirty.emailValid) { $$invalidate('formIsValid', formIsValid =
            titleValid &&
            subtitleValid &&
            addressValid &&
            descriptionValid &&
            imageUrlValid &&
            emailValid); }
    	};

    	return {
    		id,
    		title,
    		subtitle,
    		address,
    		email,
    		description,
    		imageUrl,
    		submitForm,
    		deleteMeetup,
    		cancel,
    		titleValid,
    		subtitleValid,
    		addressValid,
    		descriptionValid,
    		imageUrlValid,
    		emailValid,
    		formIsValid,
    		cancel_handler,
    		input_handler,
    		input_handler_1,
    		input_handler_2,
    		input_handler_3,
    		input_handler_4,
    		textinput5_value_binding
    	};
    }

    class EditMeetup extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$7, create_fragment$8, safe_not_equal, ["id"]);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "EditMeetup", options, id: create_fragment$8.name });
    	}

    	get id() {
    		throw new Error("<EditMeetup>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set id(value) {
    		throw new Error("<EditMeetup>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/Meetups/MeetupDetail.svelte generated by Svelte v3.12.1 */

    const file$9 = "src/Meetups/MeetupDetail.svelte";

    // (71:4) <Button href="mailto:{selectedMeetup.contactEmail}">
    function create_default_slot_1$2(ctx) {
    	var t;

    	const block = {
    		c: function create() {
    			t = text("Contact");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(t);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_default_slot_1$2.name, type: "slot", source: "(71:4) <Button href=\"mailto:{selectedMeetup.contactEmail}\">", ctx });
    	return block;
    }

    // (72:4) <Button type="button" mode="outline" on:click={() => dispatch('close')}>
    function create_default_slot$4(ctx) {
    	var t;

    	const block = {
    		c: function create() {
    			t = text("Close");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(t);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_default_slot$4.name, type: "slot", source: "(72:4) <Button type=\"button\" mode=\"outline\" on:click={() => dispatch('close')}>", ctx });
    	return block;
    }

    function create_fragment$9(ctx) {
    	var section, div0, img, img_src_value, img_alt_value, t0, div1, h1, t1_value = ctx.selectedMeetup.title + "", t1, t2, h2, t3_value = ctx.selectedMeetup.subtitle + "", t3, t4, t5_value = ctx.selectedMeetup.address + "", t5, t6, p, t7_value = ctx.selectedMeetup.description + "", t7, t8, t9, current;

    	var button0 = new Button({
    		props: {
    		href: "mailto:" + ctx.selectedMeetup.contactEmail,
    		$$slots: { default: [create_default_slot_1$2] },
    		$$scope: { ctx }
    	},
    		$$inline: true
    	});

    	var button1 = new Button({
    		props: {
    		type: "button",
    		mode: "outline",
    		$$slots: { default: [create_default_slot$4] },
    		$$scope: { ctx }
    	},
    		$$inline: true
    	});
    	button1.$on("click", ctx.click_handler);

    	const block = {
    		c: function create() {
    			section = element("section");
    			div0 = element("div");
    			img = element("img");
    			t0 = space();
    			div1 = element("div");
    			h1 = element("h1");
    			t1 = text(t1_value);
    			t2 = space();
    			h2 = element("h2");
    			t3 = text(t3_value);
    			t4 = text(" - ");
    			t5 = text(t5_value);
    			t6 = space();
    			p = element("p");
    			t7 = text(t7_value);
    			t8 = space();
    			button0.$$.fragment.c();
    			t9 = space();
    			button1.$$.fragment.c();
    			attr_dev(img, "src", img_src_value = ctx.selectedMeetup.imageUrl);
    			attr_dev(img, "alt", img_alt_value = ctx.selectedMeetup.title);
    			attr_dev(img, "class", "svelte-10utsu1");
    			add_location(img, file$9, 64, 4, 931);
    			attr_dev(div0, "class", "image svelte-10utsu1");
    			add_location(div0, file$9, 63, 2, 907);
    			attr_dev(h1, "class", "svelte-10utsu1");
    			add_location(h1, file$9, 67, 4, 1033);
    			attr_dev(h2, "class", "svelte-10utsu1");
    			add_location(h2, file$9, 68, 4, 1069);
    			attr_dev(p, "class", "svelte-10utsu1");
    			add_location(p, file$9, 69, 4, 1135);
    			attr_dev(div1, "class", "content svelte-10utsu1");
    			add_location(div1, file$9, 66, 2, 1007);
    			attr_dev(section, "class", "svelte-10utsu1");
    			add_location(section, file$9, 62, 0, 895);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			append_dev(section, div0);
    			append_dev(div0, img);
    			append_dev(section, t0);
    			append_dev(section, div1);
    			append_dev(div1, h1);
    			append_dev(h1, t1);
    			append_dev(div1, t2);
    			append_dev(div1, h2);
    			append_dev(h2, t3);
    			append_dev(h2, t4);
    			append_dev(h2, t5);
    			append_dev(div1, t6);
    			append_dev(div1, p);
    			append_dev(p, t7);
    			append_dev(div1, t8);
    			mount_component(button0, div1, null);
    			append_dev(div1, t9);
    			mount_component(button1, div1, null);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if ((!current || changed.selectedMeetup) && img_src_value !== (img_src_value = ctx.selectedMeetup.imageUrl)) {
    				attr_dev(img, "src", img_src_value);
    			}

    			if ((!current || changed.selectedMeetup) && img_alt_value !== (img_alt_value = ctx.selectedMeetup.title)) {
    				attr_dev(img, "alt", img_alt_value);
    			}

    			if ((!current || changed.selectedMeetup) && t1_value !== (t1_value = ctx.selectedMeetup.title + "")) {
    				set_data_dev(t1, t1_value);
    			}

    			if ((!current || changed.selectedMeetup) && t3_value !== (t3_value = ctx.selectedMeetup.subtitle + "")) {
    				set_data_dev(t3, t3_value);
    			}

    			if ((!current || changed.selectedMeetup) && t5_value !== (t5_value = ctx.selectedMeetup.address + "")) {
    				set_data_dev(t5, t5_value);
    			}

    			if ((!current || changed.selectedMeetup) && t7_value !== (t7_value = ctx.selectedMeetup.description + "")) {
    				set_data_dev(t7, t7_value);
    			}

    			var button0_changes = {};
    			if (changed.selectedMeetup) button0_changes.href = "mailto:" + ctx.selectedMeetup.contactEmail;
    			if (changed.$$scope) button0_changes.$$scope = { changed, ctx };
    			button0.$set(button0_changes);

    			var button1_changes = {};
    			if (changed.$$scope) button1_changes.$$scope = { changed, ctx };
    			button1.$set(button1_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(button0.$$.fragment, local);

    			transition_in(button1.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(button0.$$.fragment, local);
    			transition_out(button1.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(section);
    			}

    			destroy_component(button0);

    			destroy_component(button1);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$9.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$8($$self, $$props, $$invalidate) {
    	

      let { id } = $$props;

      let selectedMeetup;

      const unsubscribe = customMeetupsStore.subscribe(items => {
        $$invalidate('selectedMeetup', selectedMeetup = items.find(i => i.id === id));
      });

      const dispatch = createEventDispatcher();

      onDestroy(() => {
        unsubscribe();
      });

    	const writable_props = ['id'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<MeetupDetail> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => dispatch('close');

    	$$self.$set = $$props => {
    		if ('id' in $$props) $$invalidate('id', id = $$props.id);
    	};

    	$$self.$capture_state = () => {
    		return { id, selectedMeetup };
    	};

    	$$self.$inject_state = $$props => {
    		if ('id' in $$props) $$invalidate('id', id = $$props.id);
    		if ('selectedMeetup' in $$props) $$invalidate('selectedMeetup', selectedMeetup = $$props.selectedMeetup);
    	};

    	return {
    		id,
    		selectedMeetup,
    		dispatch,
    		click_handler
    	};
    }

    class MeetupDetail extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$8, create_fragment$9, safe_not_equal, ["id"]);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "MeetupDetail", options, id: create_fragment$9.name });

    		const { ctx } = this.$$;
    		const props = options.props || {};
    		if (ctx.id === undefined && !('id' in props)) {
    			console.warn("<MeetupDetail> was created without expected prop 'id'");
    		}
    	}

    	get id() {
    		throw new Error("<MeetupDetail>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set id(value) {
    		throw new Error("<MeetupDetail>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/App.svelte generated by Svelte v3.12.1 */

    const file$a = "src/App.svelte";

    // (61:2) {:else}
    function create_else_block$2(ctx) {
    	var current;

    	var meetupdetail = new MeetupDetail({
    		props: { id: ctx.pageData.id },
    		$$inline: true
    	});
    	meetupdetail.$on("close", ctx.closeDetails);

    	const block = {
    		c: function create() {
    			meetupdetail.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			mount_component(meetupdetail, target, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var meetupdetail_changes = {};
    			if (changed.pageData) meetupdetail_changes.id = ctx.pageData.id;
    			meetupdetail.$set(meetupdetail_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(meetupdetail.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(meetupdetail.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(meetupdetail, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_else_block$2.name, type: "else", source: "(61:2) {:else}", ctx });
    	return block;
    }

    // (52:2) {#if page === 'overview'}
    function create_if_block$4(ctx) {
    	var t, current;

    	var if_block = (ctx.editMode === 'edit') && create_if_block_1$1(ctx);

    	var meetupgrid = new MeetupGrid({
    		props: { meetups: ctx.$meetups },
    		$$inline: true
    	});
    	meetupgrid.$on("showdetails", ctx.showDetails);
    	meetupgrid.$on("edit", ctx.startEdit);
    	meetupgrid.$on("add", ctx.add_handler);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			t = space();
    			meetupgrid.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, t, anchor);
    			mount_component(meetupgrid, target, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (ctx.editMode === 'edit') {
    				if (if_block) {
    					if_block.p(changed, ctx);
    					transition_in(if_block, 1);
    				} else {
    					if_block = create_if_block_1$1(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(t.parentNode, t);
    				}
    			} else if (if_block) {
    				group_outros();
    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});
    				check_outros();
    			}

    			var meetupgrid_changes = {};
    			if (changed.$meetups) meetupgrid_changes.meetups = ctx.$meetups;
    			meetupgrid.$set(meetupgrid_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);

    			transition_in(meetupgrid.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(if_block);
    			transition_out(meetupgrid.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);

    			if (detaching) {
    				detach_dev(t);
    			}

    			destroy_component(meetupgrid, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block$4.name, type: "if", source: "(52:2) {#if page === 'overview'}", ctx });
    	return block;
    }

    // (53:4) {#if editMode === 'edit'}
    function create_if_block_1$1(ctx) {
    	var current;

    	var editmeetup = new EditMeetup({
    		props: { id: ctx.editedId },
    		$$inline: true
    	});
    	editmeetup.$on("save", ctx.savedMeetup);
    	editmeetup.$on("cancel", ctx.cancelEdit);

    	const block = {
    		c: function create() {
    			editmeetup.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			mount_component(editmeetup, target, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var editmeetup_changes = {};
    			if (changed.editedId) editmeetup_changes.id = ctx.editedId;
    			editmeetup.$set(editmeetup_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(editmeetup.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(editmeetup.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(editmeetup, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_1$1.name, type: "if", source: "(53:4) {#if editMode === 'edit'}", ctx });
    	return block;
    }

    function create_fragment$a(ctx) {
    	var t, main, current_block_type_index, if_block, current;

    	var header = new Header({ $$inline: true });

    	var if_block_creators = [
    		create_if_block$4,
    		create_else_block$2
    	];

    	var if_blocks = [];

    	function select_block_type(changed, ctx) {
    		if (ctx.page === 'overview') return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(null, ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			header.$$.fragment.c();
    			t = space();
    			main = element("main");
    			if_block.c();
    			attr_dev(main, "class", "svelte-1r5xu04");
    			add_location(main, file$a, 50, 0, 950);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			mount_component(header, target, anchor);
    			insert_dev(target, t, anchor);
    			insert_dev(target, main, anchor);
    			if_blocks[current_block_type_index].m(main, null);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(changed, ctx);
    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(changed, ctx);
    			} else {
    				group_outros();
    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});
    				check_outros();

    				if_block = if_blocks[current_block_type_index];
    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				}
    				transition_in(if_block, 1);
    				if_block.m(main, null);
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(header.$$.fragment, local);

    			transition_in(if_block);
    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(header.$$.fragment, local);
    			transition_out(if_block);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(header, detaching);

    			if (detaching) {
    				detach_dev(t);
    				detach_dev(main);
    			}

    			if_blocks[current_block_type_index].d();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$a.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$9($$self, $$props, $$invalidate) {
    	let $meetups;

    	validate_store(customMeetupsStore, 'meetups');
    	component_subscribe($$self, customMeetupsStore, $$value => { $meetups = $$value; $$invalidate('$meetups', $meetups); });

    	

      // let meetups = ;

      let editMode;
      let editedId;
      let page = "overview";
      let pageData = {};

      function savedMeetup(event) {
        $$invalidate('editMode', editMode = null);
        $$invalidate('editedId', editedId = null);
      }

      function cancelEdit() {
        $$invalidate('editMode', editMode = null);
        $$invalidate('editedId', editedId = null);
      }

      function showDetails(event) {
        $$invalidate('page', page = "details");
        $$invalidate('pageData', pageData.id = event.detail, pageData);
      }

      function closeDetails() {
        $$invalidate('page', page = "overview");
        $$invalidate('pageData', pageData = {});
      }

      function startEdit(event) {
        $$invalidate('editMode', editMode = "edit");
        $$invalidate('editedId', editedId = event.detail);
      }

    	const add_handler = () => {$$invalidate('editMode', editMode = 'edit');};

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ('editMode' in $$props) $$invalidate('editMode', editMode = $$props.editMode);
    		if ('editedId' in $$props) $$invalidate('editedId', editedId = $$props.editedId);
    		if ('page' in $$props) $$invalidate('page', page = $$props.page);
    		if ('pageData' in $$props) $$invalidate('pageData', pageData = $$props.pageData);
    		if ('$meetups' in $$props) customMeetupsStore.set($meetups);
    	};

    	return {
    		editMode,
    		editedId,
    		page,
    		pageData,
    		savedMeetup,
    		cancelEdit,
    		showDetails,
    		closeDetails,
    		startEdit,
    		$meetups,
    		add_handler
    	};
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$9, create_fragment$a, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "App", options, id: create_fragment$a.name });
    	}
    }

    // import Header from './UI/Header.svelte';

    const app = new App({
    	// target: document.querySelector('#app')
    	target: document.body
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
