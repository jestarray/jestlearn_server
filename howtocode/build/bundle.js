
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
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
    let src_url_equal_anchor;
    function src_url_equal(element_src, url) {
        if (!src_url_equal_anchor) {
            src_url_equal_anchor = document.createElement('a');
        }
        src_url_equal_anchor.href = url;
        return element_src === src_url_equal_anchor.href;
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function null_to_empty(value) {
        return value == null ? '' : value;
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
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function get_binding_group_value(group, __value, checked) {
        const value = new Set();
        for (let i = 0; i < group.length; i += 1) {
            if (group[i].checked)
                value.add(group[i].__value);
        }
        if (!checked) {
            value.delete(__value);
        }
        return Array.from(value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function select_option(select, value) {
        for (let i = 0; i < select.options.length; i += 1) {
            const option = select.options[i];
            if (option.__value === value) {
                option.selected = true;
                return;
            }
        }
        select.selectedIndex = -1; // no option should be selected
    }
    function select_value(select) {
        const selected_option = select.querySelector(':checked') || select.options[0];
        return selected_option && selected_option.__value;
    }
    function custom_event(type, detail, bubbles = false) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, false, detail);
        return e;
    }
    class HtmlTag {
        constructor() {
            this.e = this.n = null;
        }
        c(html) {
            this.h(html);
        }
        m(html, target, anchor = null) {
            if (!this.e) {
                this.e = element(target.nodeName);
                this.t = target;
                this.c(html);
            }
            this.i(anchor);
        }
        h(html) {
            this.e.innerHTML = html;
            this.n = Array.from(this.e.childNodes);
        }
        i(anchor) {
            for (let i = 0; i < this.n.length; i += 1) {
                insert(this.t, this.n[i], anchor);
            }
        }
        p(html) {
            this.d();
            this.h(html);
            this.i(this.a);
        }
        d() {
            this.n.forEach(detach);
        }
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    function afterUpdate(fn) {
        get_current_component().$$.after_update.push(fn);
    }
    function createEventDispatcher() {
        const component = get_current_component();
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
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
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

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
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
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : options.context || []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
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
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.42.2' }, detail), true));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function prop_dev(node, property, value) {
        node[property] = value;
        dispatch_dev('SvelteDOMSetProperty', { node, property, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src/InputProblem.svelte generated by Svelte v3.42.2 */
    const file$5 = "src/InputProblem.svelte";

    // (39:2) {#if show_answer_option}
    function create_if_block$4(ctx) {
    	let details;
    	let summary;
    	let t1;
    	let t2_value = /*data*/ ctx[1].answer + "";
    	let t2;

    	const block = {
    		c: function create() {
    			details = element("details");
    			summary = element("summary");
    			summary.textContent = "show answer";
    			t1 = space();
    			t2 = text(t2_value);
    			add_location(summary, file$5, 40, 6, 1166);
    			add_location(details, file$5, 39, 4, 1150);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, details, anchor);
    			append_dev(details, summary);
    			append_dev(details, t1);
    			append_dev(details, t2);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*data*/ 2 && t2_value !== (t2_value = /*data*/ ctx[1].answer + "")) set_data_dev(t2, t2_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(details);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$4.name,
    		type: "if",
    		source: "(39:2) {#if show_answer_option}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$5(ctx) {
    	let div1;
    	let div0;
    	let raw_value = /*data*/ ctx[1].question + "";
    	let t0;
    	let p;
    	let t1_value = /*data*/ ctx[1].input_answer_hint + "";
    	let t1;
    	let t2;
    	let input;
    	let t3;
    	let mounted;
    	let dispose;
    	let if_block = /*show_answer_option*/ ctx[2] && create_if_block$4(ctx);

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			t0 = space();
    			p = element("p");
    			t1 = text(t1_value);
    			t2 = space();
    			input = element("input");
    			t3 = space();
    			if (if_block) if_block.c();
    			add_location(div0, file$5, 25, 2, 851);
    			add_location(p, file$5, 28, 2, 894);
    			attr_dev(input, "type", "text");
    			add_location(input, file$5, 29, 2, 928);
    			add_location(div1, file$5, 24, 0, 843);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			div0.innerHTML = raw_value;
    			append_dev(div1, t0);
    			append_dev(div1, p);
    			append_dev(p, t1);
    			append_dev(div1, t2);
    			append_dev(div1, input);
    			set_input_value(input, /*input_answer*/ ctx[0]);
    			append_dev(div1, t3);
    			if (if_block) if_block.m(div1, null);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "input", /*input_input_handler*/ ctx[5]),
    					listen_dev(input, "keypress", /*keypress_handler*/ ctx[6], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*data*/ 2 && raw_value !== (raw_value = /*data*/ ctx[1].question + "")) div0.innerHTML = raw_value;			if (dirty & /*data*/ 2 && t1_value !== (t1_value = /*data*/ ctx[1].input_answer_hint + "")) set_data_dev(t1, t1_value);

    			if (dirty & /*input_answer*/ 1 && input.value !== /*input_answer*/ ctx[0]) {
    				set_input_value(input, /*input_answer*/ ctx[0]);
    			}

    			if (/*show_answer_option*/ ctx[2]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block$4(ctx);
    					if_block.c();
    					if_block.m(div1, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			if (if_block) if_block.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('InputProblem', slots, []);
    	let { data } = $$props;
    	let { reset } = $$props;
    	const dispatch = createEventDispatcher();
    	let { input_answer = "" } = $$props;
    	let { show_answer_option } = $$props;

    	afterUpdate(() => {
    		Prism.highlightAll();
    	});

    	const writable_props = ['data', 'reset', 'input_answer', 'show_answer_option'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<InputProblem> was created with unknown prop '${key}'`);
    	});

    	function input_input_handler() {
    		input_answer = this.value;
    		($$invalidate(0, input_answer), $$invalidate(4, reset));
    	}

    	const keypress_handler = e => {
    		if (input_answer.length > 0 && e.key === "Enter") {
    			dispatch("check-answer");
    		}
    	};

    	$$self.$$set = $$props => {
    		if ('data' in $$props) $$invalidate(1, data = $$props.data);
    		if ('reset' in $$props) $$invalidate(4, reset = $$props.reset);
    		if ('input_answer' in $$props) $$invalidate(0, input_answer = $$props.input_answer);
    		if ('show_answer_option' in $$props) $$invalidate(2, show_answer_option = $$props.show_answer_option);
    	};

    	$$self.$capture_state = () => ({
    		data,
    		reset,
    		createEventDispatcher,
    		afterUpdate,
    		dispatch,
    		input_answer,
    		show_answer_option
    	});

    	$$self.$inject_state = $$props => {
    		if ('data' in $$props) $$invalidate(1, data = $$props.data);
    		if ('reset' in $$props) $$invalidate(4, reset = $$props.reset);
    		if ('input_answer' in $$props) $$invalidate(0, input_answer = $$props.input_answer);
    		if ('show_answer_option' in $$props) $$invalidate(2, show_answer_option = $$props.show_answer_option);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*reset*/ 16) {
    			if (reset) {
    				$$invalidate(0, input_answer = "");
    			}
    		}

    		if ($$self.$$.dirty & /*data, input_answer*/ 3) {
    			dispatch("update-check", function check_answer() {
    				// using coersion here. might have to handle cases where evaluation of the expression needs to be done before checking answer
    				// or force everyone to genereate the json evaluted??
    				//console.log(data.answer);
    				let is_correct = data.answer == input_answer || data.answer.toString().toLowerCase() == input_answer.toLowerCase();

    				return is_correct;
    			});
    		}

    		if ($$self.$$.dirty & /*input_answer*/ 1) {
    			dispatch("valid-input", input_answer.length > 0);
    		}
    	};

    	return [
    		input_answer,
    		data,
    		show_answer_option,
    		dispatch,
    		reset,
    		input_input_handler,
    		keypress_handler
    	];
    }

    class InputProblem extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$5, create_fragment$5, safe_not_equal, {
    			data: 1,
    			reset: 4,
    			input_answer: 0,
    			show_answer_option: 2
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "InputProblem",
    			options,
    			id: create_fragment$5.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*data*/ ctx[1] === undefined && !('data' in props)) {
    			console.warn("<InputProblem> was created without expected prop 'data'");
    		}

    		if (/*reset*/ ctx[4] === undefined && !('reset' in props)) {
    			console.warn("<InputProblem> was created without expected prop 'reset'");
    		}

    		if (/*show_answer_option*/ ctx[2] === undefined && !('show_answer_option' in props)) {
    			console.warn("<InputProblem> was created without expected prop 'show_answer_option'");
    		}
    	}

    	get data() {
    		throw new Error("<InputProblem>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set data(value) {
    		throw new Error("<InputProblem>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get reset() {
    		throw new Error("<InputProblem>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set reset(value) {
    		throw new Error("<InputProblem>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get input_answer() {
    		throw new Error("<InputProblem>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set input_answer(value) {
    		throw new Error("<InputProblem>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get show_answer_option() {
    		throw new Error("<InputProblem>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set show_answer_option(value) {
    		throw new Error("<InputProblem>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/SelectProblem.svelte generated by Svelte v3.42.2 */
    const file$4 = "src/SelectProblem.svelte";

    function get_each_context$2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[7] = list[i];
    	child_ctx[9] = i;
    	return child_ctx;
    }

    // (72:6) {#if enable_next_button}
    function create_if_block$3(ctx) {
    	let br;
    	let t;
    	let html_tag;
    	let raw_value = /*option*/ ctx[7].explanation + "";
    	let html_anchor;

    	const block = {
    		c: function create() {
    			br = element("br");
    			t = space();
    			html_tag = new HtmlTag();
    			html_anchor = empty();
    			add_location(br, file$4, 72, 8, 2210);
    			html_tag.a = html_anchor;
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, br, anchor);
    			insert_dev(target, t, anchor);
    			html_tag.m(raw_value, target, anchor);
    			insert_dev(target, html_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*data*/ 1 && raw_value !== (raw_value = /*option*/ ctx[7].explanation + "")) html_tag.p(raw_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(br);
    			if (detaching) detach_dev(t);
    			if (detaching) detach_dev(html_anchor);
    			if (detaching) html_tag.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$3.name,
    		type: "if",
    		source: "(72:6) {#if enable_next_button}",
    		ctx
    	});

    	return block;
    }

    // (61:2) {#each data.answer as option, index}
    function create_each_block$2(ctx) {
    	let label;
    	let input;
    	let t0;
    	let html_tag;
    	let raw_value = /*option*/ ctx[7].text + "";
    	let t1;
    	let t2;
    	let label_class_value;
    	let mounted;
    	let dispose;
    	let if_block = /*enable_next_button*/ ctx[1] && create_if_block$3(ctx);

    	const block = {
    		c: function create() {
    			label = element("label");
    			input = element("input");
    			t0 = space();
    			html_tag = new HtmlTag();
    			t1 = space();
    			if (if_block) if_block.c();
    			t2 = space();
    			attr_dev(input, "type", "checkbox");
    			input.__value = /*index*/ ctx[9];
    			input.value = input.__value;
    			input.disabled = /*enable_next_button*/ ctx[1];
    			/*$$binding_groups*/ ctx[5][0].push(input);
    			add_location(input, file$4, 63, 6, 1981);
    			html_tag.a = t1;
    			attr_dev(label, "class", label_class_value = "" + (null_to_empty(/*color_answers*/ ctx[3](/*option*/ ctx[7].correct)) + " svelte-1vbx4kr"));
    			add_location(label, file$4, 61, 4, 1885);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, label, anchor);
    			append_dev(label, input);
    			input.checked = ~/*selected*/ ctx[2].indexOf(input.__value);
    			append_dev(label, t0);
    			html_tag.m(raw_value, label);
    			append_dev(label, t1);
    			if (if_block) if_block.m(label, null);
    			append_dev(label, t2);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "change", /*input_change_handler*/ ctx[4]),
    					listen_dev(input, "click", click_handler, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*enable_next_button*/ 2) {
    				prop_dev(input, "disabled", /*enable_next_button*/ ctx[1]);
    			}

    			if (dirty & /*selected*/ 4) {
    				input.checked = ~/*selected*/ ctx[2].indexOf(input.__value);
    			}

    			if (dirty & /*data*/ 1 && raw_value !== (raw_value = /*option*/ ctx[7].text + "")) html_tag.p(raw_value);

    			if (/*enable_next_button*/ ctx[1]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block$3(ctx);
    					if_block.c();
    					if_block.m(label, t2);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (dirty & /*data*/ 1 && label_class_value !== (label_class_value = "" + (null_to_empty(/*color_answers*/ ctx[3](/*option*/ ctx[7].correct)) + " svelte-1vbx4kr"))) {
    				attr_dev(label, "class", label_class_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(label);
    			/*$$binding_groups*/ ctx[5][0].splice(/*$$binding_groups*/ ctx[5][0].indexOf(input), 1);
    			if (if_block) if_block.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$2.name,
    		type: "each",
    		source: "(61:2) {#each data.answer as option, index}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$4(ctx) {
    	let div1;
    	let div0;
    	let raw_value = /*data*/ ctx[0].question + "";
    	let t;
    	let each_value = /*data*/ ctx[0].answer;
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$2(get_each_context$2(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			t = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			add_location(div0, file$4, 57, 2, 1801);
    			add_location(div1, file$4, 56, 0, 1793);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			div0.innerHTML = raw_value;
    			append_dev(div1, t);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div1, null);
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*data*/ 1 && raw_value !== (raw_value = /*data*/ ctx[0].question + "")) div0.innerHTML = raw_value;
    			if (dirty & /*color_answers, data, enable_next_button, selected*/ 15) {
    				each_value = /*data*/ ctx[0].answer;
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$2(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$2(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div1, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    const click_handler = function () {
    	
    };

    function instance$4($$self, $$props, $$invalidate) {
    	let selected;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('SelectProblem', slots, []);
    	let { data } = $$props;
    	let { enable_next_button } = $$props;
    	const dispatch = createEventDispatcher();

    	//refresh syntax highlighting!
    	// TODO: warning! it refreshes on every update! maybe we should just use prism to static pre- generate/rendering and shove that into the problem html and not have to worry about dynamic syntax highlighting. Probably not a big deal though if highlightAll() is nothing perf wise
    	// https://prismjs.com/#basic-usage-node
    	afterUpdate(() => {
    		Prism.highlightAll();
    	});

    	function color_answers(is_correct) {
    		if (enable_next_button) {
    			if (is_correct) {
    				return "correct";
    			} else {
    				return "wrong";
    			}
    		} else {
    			return "";
    		}
    	}

    	const writable_props = ['data', 'enable_next_button'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<SelectProblem> was created with unknown prop '${key}'`);
    	});

    	const $$binding_groups = [[]];

    	function input_change_handler() {
    		selected = get_binding_group_value($$binding_groups[0], this.__value, this.checked);
    		($$invalidate(2, selected), $$invalidate(0, data));
    	}

    	$$self.$$set = $$props => {
    		if ('data' in $$props) $$invalidate(0, data = $$props.data);
    		if ('enable_next_button' in $$props) $$invalidate(1, enable_next_button = $$props.enable_next_button);
    	};

    	$$self.$capture_state = () => ({
    		data,
    		enable_next_button,
    		afterUpdate,
    		createEventDispatcher,
    		onMount,
    		dispatch,
    		color_answers,
    		selected
    	});

    	$$self.$inject_state = $$props => {
    		if ('data' in $$props) $$invalidate(0, data = $$props.data);
    		if ('enable_next_button' in $$props) $$invalidate(1, enable_next_button = $$props.enable_next_button);
    		if ('selected' in $$props) $$invalidate(2, selected = $$props.selected);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*data, selected*/ 5) {
    			dispatch("update-check", function check_answer() {
    				let correct_indexes = data.answer.map((item, index) => {
    					if (item.correct) {
    						return index;
    					}
    				}).filter(item => {
    					if (item !== undefined) {
    						return true;
    					}
    				});

    				//did not pick all the answers, therefore got it wrong
    				if (correct_indexes.length !== selected.length) {
    					return false;
    				} else {
    					//if even got one of the selections wrong, you got the whole thing wrong
    					for (let item of correct_indexes) {
    						if (selected.includes(item) == false) {
    							return false;
    						}
    					}

    					//otherwise you got it right
    					//maybe we should not reset it here? since users want to see their selected answers for a bit until clicking the next buttotn
    					$$invalidate(2, selected = []);

    					return true;
    				}
    			});
    		}

    		if ($$self.$$.dirty & /*selected*/ 4) {
    			dispatch("valid-input", selected.length > 0);
    		}
    	};

    	$$invalidate(2, selected = []);

    	return [
    		data,
    		enable_next_button,
    		selected,
    		color_answers,
    		input_change_handler,
    		$$binding_groups
    	];
    }

    class SelectProblem extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, { data: 0, enable_next_button: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "SelectProblem",
    			options,
    			id: create_fragment$4.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*data*/ ctx[0] === undefined && !('data' in props)) {
    			console.warn("<SelectProblem> was created without expected prop 'data'");
    		}

    		if (/*enable_next_button*/ ctx[1] === undefined && !('enable_next_button' in props)) {
    			console.warn("<SelectProblem> was created without expected prop 'enable_next_button'");
    		}
    	}

    	get data() {
    		throw new Error("<SelectProblem>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set data(value) {
    		throw new Error("<SelectProblem>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get enable_next_button() {
    		throw new Error("<SelectProblem>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set enable_next_button(value) {
    		throw new Error("<SelectProblem>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    let correct_answer_sound = new Audio("./question-correct.ogg");
    let wrong_answer_sound = new Audio("./question-wrong.wav");

    class Problem {
        constructor(type, question, answer, input_answer_hint = "") {
            this.type = type;
            this.question = question;
            this.answer = answer;
            this.input_answer_hint = input_answer_hint;
            this.result = "❓";
            this.tries = 0;
            this.time = 0;
            this.hints = 0;
        }
    }
    class ProblemSet$1 {
        constructor(title, id, tags, gen, problems = [], resources = [], emoji_mark = "❓") {
            this.title = title;
            this.id = id;
            this.problem_index = 0;
            this.problems = problems;
            this.tags = tags;
            this.gen = gen;
            this.resources = resources;
            this.emoji_mark = emoji_mark;
            this.last_updated = 0;
        }
    }
    function has_started(problems) {
        for (let i = 0; i < problems.length; i++) {
            if (problems[i].tries >= 1) {
                return true;
            }
        }
        return false;
    }
    //adds back the gen() functions that were not seralized
    function merge_back_deleted_props(without, original) {
        return without.map((val) => {
            let found = original.find((hay) => val.id === hay.id);
            if (found) {
                val.gen = found.gen;
                val.resources = found.resources;
                val.tags = found.tags;
                return val;
            }
            else {
                return val;
            }
        });
    }
    function gen_amount(amount = 1, f) {
        return function g() {
            let res = [];
            for (let i = 0; i < amount; i++) {
                res.push(f());
            }
            return res;
        };
    }

    /// min and max are inclusive
    function ran_int(min = 0, max = 1) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1) + min);
    }
    let racket_math_expressions = new ProblemSet$1("Expressions, Numbers, and Evaluation", 2.0, [], async function get_it() {
        let id = 0;
        let amount = 10;
        let response = await fetch("https://jestlearn.com/exercise", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ id: id, amount: amount }),
        });
        let result = await response.json();
        return result;
    }, [], [
        {
            url_title: "article",
            url: "https://jesthowtocode.netlify.app/expressions.html",
            additional: "",
        },
        { url_title: "video", url: "https://youtu.be/bFLB4dyNKUk", additional: "" },
    ]);
    let racket_string_practice = new ProblemSet$1("Zero based indexing string practice", 2.2, [], gen_amount(10, function get_it() {
        let ran_words = [
            "StRiKeBrEaKeR",
            "InVeStIgAtIoN",
            "AlLoCaTiOn",
            "EnViRoNmEnT",
            "CoRrEcTiOn",
            "CoRrEsPoNdEnCe",
            "InVeStMeNt",
            "DeMoCrAtIc",
            "CoNcLuSiOn",
            "MaInStReAm",
            "PoSsIbIlItY",
            "AdMiRaTiOn",
            "InTeLlIgEnCe",
            "DiSaBiLiTy",
            "ExCiTeMeNt",
            "ReAsOnAbLe",
            "InStRuCtIoN",
            "DiScIpLiNe",
            "NeGoTiAtIoN",
            "OpErAtIoNaL",
        ];
        let word = pick_random_el(ran_words);
        let start = ran_int(0, word.length - 1);
        let end = ran_int(start, word.length - 1);
        //the answer has to be quoted on the offchance that the string is empty
        let result = new Problem("input", `<pre class="line-numbers match-braces rainbow-braces"><code class="language-racket">; what does the following produce?
(substring "${word}" ${start} ${end})</code></pre>`, `"${word.substring(start, end)}"`, 'remember: caps matter, wrap your answer in quotes! e.g: "bOo"');
        return result;
    }), [], [
        {
            url_title: "article",
            url: "https://jesthowtocode.netlify.app/strings.html",
            additional: "",
        },
        { url_title: "video", url: "https://youtu.be/bFLB4dyNKUk", additional: "" },
    ]);
    function pick_random_el(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }
    let all = [racket_math_expressions, racket_string_practice];
    //WARNING: do not stringify this! we need the gen function and a copy of the original questions for resetting and other things
    const TOC_original = all.map((val) => Object.freeze(val));
    // we are mutating this
    //copy over the gen() functions that got removed because of stringify
    let TOC = JSON.parse(JSON.stringify(all)).map((val, index) => {
        let m1 = Object.assign(val, TOC_original[index]);
        //so we can run has_started() since it deleted the prototype link to the clas :/
        m1.__proto__ = ProblemSet$1.prototype;
        return m1;
    });
    //window.toc = TOC;
    //the home page of your course will be at https://yourdomain.com/example_course , where example_course is the name of the course(all spaces are replaced by underscores)
    const COURSE_NAME = "how to code";

    var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

    function createCommonjsModule(fn) {
      var module = { exports: {} };
    	return fn(module, module.exports), module.exports;
    }

    /* PrismJS 1.24.1
    https://prismjs.com/download.html#themes=prism-tomorrow&languages=markup+css+clike+javascript+racket+scheme&plugins=line-numbers+toolbar+download-button+match-braces */

    var prism = createCommonjsModule(function (module) {
    var _self="undefined"!=typeof window?window:"undefined"!=typeof WorkerGlobalScope&&self instanceof WorkerGlobalScope?self:{},Prism=function(u){var c=/\blang(?:uage)?-([\w-]+)\b/i,n=0,e={},M={manual:u.Prism&&u.Prism.manual,disableWorkerMessageHandler:u.Prism&&u.Prism.disableWorkerMessageHandler,util:{encode:function e(n){return n instanceof W?new W(n.type,e(n.content),n.alias):Array.isArray(n)?n.map(e):n.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/\u00a0/g," ")},type:function(e){return Object.prototype.toString.call(e).slice(8,-1)},objId:function(e){return e.__id||Object.defineProperty(e,"__id",{value:++n}),e.__id},clone:function t(e,r){var a,n;switch(r=r||{},M.util.type(e)){case"Object":if(n=M.util.objId(e),r[n])return r[n];for(var i in a={},r[n]=a,e)e.hasOwnProperty(i)&&(a[i]=t(e[i],r));return a;case"Array":return n=M.util.objId(e),r[n]?r[n]:(a=[],r[n]=a,e.forEach(function(e,n){a[n]=t(e,r);}),a);default:return e}},getLanguage:function(e){for(;e&&!c.test(e.className);)e=e.parentElement;return e?(e.className.match(c)||[,"none"])[1].toLowerCase():"none"},currentScript:function(){if("undefined"==typeof document)return null;if("currentScript"in document)return document.currentScript;try{throw new Error}catch(e){var n=(/at [^(\r\n]*\((.*):.+:.+\)$/i.exec(e.stack)||[])[1];if(n){var t=document.getElementsByTagName("script");for(var r in t)if(t[r].src==n)return t[r]}return null}},isActive:function(e,n,t){for(var r="no-"+n;e;){var a=e.classList;if(a.contains(n))return !0;if(a.contains(r))return !1;e=e.parentElement;}return !!t}},languages:{plain:e,plaintext:e,text:e,txt:e,extend:function(e,n){var t=M.util.clone(M.languages[e]);for(var r in n)t[r]=n[r];return t},insertBefore:function(t,e,n,r){var a=(r=r||M.languages)[t],i={};for(var l in a)if(a.hasOwnProperty(l)){if(l==e)for(var o in n)n.hasOwnProperty(o)&&(i[o]=n[o]);n.hasOwnProperty(l)||(i[l]=a[l]);}var s=r[t];return r[t]=i,M.languages.DFS(M.languages,function(e,n){n===s&&e!=t&&(this[e]=i);}),i},DFS:function e(n,t,r,a){a=a||{};var i=M.util.objId;for(var l in n)if(n.hasOwnProperty(l)){t.call(n,l,n[l],r||l);var o=n[l],s=M.util.type(o);"Object"!==s||a[i(o)]?"Array"!==s||a[i(o)]||(a[i(o)]=!0,e(o,t,l,a)):(a[i(o)]=!0,e(o,t,null,a));}}},plugins:{},highlightAll:function(e,n){M.highlightAllUnder(document,e,n);},highlightAllUnder:function(e,n,t){var r={callback:t,container:e,selector:'code[class*="language-"], [class*="language-"] code, code[class*="lang-"], [class*="lang-"] code'};M.hooks.run("before-highlightall",r),r.elements=Array.prototype.slice.apply(r.container.querySelectorAll(r.selector)),M.hooks.run("before-all-elements-highlight",r);for(var a,i=0;a=r.elements[i++];)M.highlightElement(a,!0===n,r.callback);},highlightElement:function(e,n,t){var r=M.util.getLanguage(e),a=M.languages[r];e.className=e.className.replace(c,"").replace(/\s+/g," ")+" language-"+r;var i=e.parentElement;i&&"pre"===i.nodeName.toLowerCase()&&(i.className=i.className.replace(c,"").replace(/\s+/g," ")+" language-"+r);var l={element:e,language:r,grammar:a,code:e.textContent};function o(e){l.highlightedCode=e,M.hooks.run("before-insert",l),l.element.innerHTML=l.highlightedCode,M.hooks.run("after-highlight",l),M.hooks.run("complete",l),t&&t.call(l.element);}if(M.hooks.run("before-sanity-check",l),(i=l.element.parentElement)&&"pre"===i.nodeName.toLowerCase()&&!i.hasAttribute("tabindex")&&i.setAttribute("tabindex","0"),!l.code)return M.hooks.run("complete",l),void(t&&t.call(l.element));if(M.hooks.run("before-highlight",l),l.grammar)if(n&&u.Worker){var s=new Worker(M.filename);s.onmessage=function(e){o(e.data);},s.postMessage(JSON.stringify({language:l.language,code:l.code,immediateClose:!0}));}else o(M.highlight(l.code,l.grammar,l.language));else o(M.util.encode(l.code));},highlight:function(e,n,t){var r={code:e,grammar:n,language:t};return M.hooks.run("before-tokenize",r),r.tokens=M.tokenize(r.code,r.grammar),M.hooks.run("after-tokenize",r),W.stringify(M.util.encode(r.tokens),r.language)},tokenize:function(e,n){var t=n.rest;if(t){for(var r in t)n[r]=t[r];delete n.rest;}var a=new i;return I(a,a.head,e),function e(n,t,r,a,i,l){for(var o in r)if(r.hasOwnProperty(o)&&r[o]){var s=r[o];s=Array.isArray(s)?s:[s];for(var u=0;u<s.length;++u){if(l&&l.cause==o+","+u)return;var c=s[u],g=c.inside,f=!!c.lookbehind,h=!!c.greedy,d=c.alias;if(h&&!c.pattern.global){var p=c.pattern.toString().match(/[imsuy]*$/)[0];c.pattern=RegExp(c.pattern.source,p+"g");}for(var v=c.pattern||c,m=a.next,y=i;m!==t.tail&&!(l&&y>=l.reach);y+=m.value.length,m=m.next){var b=m.value;if(t.length>n.length)return;if(!(b instanceof W)){var k,x=1;if(h){if(!(k=z(v,y,n,f)))break;var w=k.index,A=k.index+k[0].length,P=y;for(P+=m.value.length;P<=w;)m=m.next,P+=m.value.length;if(P-=m.value.length,y=P,m.value instanceof W)continue;for(var E=m;E!==t.tail&&(P<A||"string"==typeof E.value);E=E.next)x++,P+=E.value.length;x--,b=n.slice(y,P),k.index-=y;}else if(!(k=z(v,0,b,f)))continue;var w=k.index,S=k[0],O=b.slice(0,w),L=b.slice(w+S.length),N=y+b.length;l&&N>l.reach&&(l.reach=N);var j=m.prev;O&&(j=I(t,j,O),y+=O.length),q(t,j,x);var C=new W(o,g?M.tokenize(S,g):S,d,S);if(m=I(t,j,C),L&&I(t,m,L),1<x){var _={cause:o+","+u,reach:N};e(n,t,r,m.prev,y,_),l&&_.reach>l.reach&&(l.reach=_.reach);}}}}}}(e,a,n,a.head,0),function(e){var n=[],t=e.head.next;for(;t!==e.tail;)n.push(t.value),t=t.next;return n}(a)},hooks:{all:{},add:function(e,n){var t=M.hooks.all;t[e]=t[e]||[],t[e].push(n);},run:function(e,n){var t=M.hooks.all[e];if(t&&t.length)for(var r,a=0;r=t[a++];)r(n);}},Token:W};function W(e,n,t,r){this.type=e,this.content=n,this.alias=t,this.length=0|(r||"").length;}function z(e,n,t,r){e.lastIndex=n;var a=e.exec(t);if(a&&r&&a[1]){var i=a[1].length;a.index+=i,a[0]=a[0].slice(i);}return a}function i(){var e={value:null,prev:null,next:null},n={value:null,prev:e,next:null};e.next=n,this.head=e,this.tail=n,this.length=0;}function I(e,n,t){var r=n.next,a={value:t,prev:n,next:r};return n.next=a,r.prev=a,e.length++,a}function q(e,n,t){for(var r=n.next,a=0;a<t&&r!==e.tail;a++)r=r.next;(n.next=r).prev=n,e.length-=a;}if(u.Prism=M,W.stringify=function n(e,t){if("string"==typeof e)return e;if(Array.isArray(e)){var r="";return e.forEach(function(e){r+=n(e,t);}),r}var a={type:e.type,content:n(e.content,t),tag:"span",classes:["token",e.type],attributes:{},language:t},i=e.alias;i&&(Array.isArray(i)?Array.prototype.push.apply(a.classes,i):a.classes.push(i)),M.hooks.run("wrap",a);var l="";for(var o in a.attributes)l+=" "+o+'="'+(a.attributes[o]||"").replace(/"/g,"&quot;")+'"';return "<"+a.tag+' class="'+a.classes.join(" ")+'"'+l+">"+a.content+"</"+a.tag+">"},!u.document)return u.addEventListener&&(M.disableWorkerMessageHandler||u.addEventListener("message",function(e){var n=JSON.parse(e.data),t=n.language,r=n.code,a=n.immediateClose;u.postMessage(M.highlight(r,M.languages[t],t)),a&&u.close();},!1)),M;var t=M.util.currentScript();function r(){M.manual||M.highlightAll();}if(t&&(M.filename=t.src,t.hasAttribute("data-manual")&&(M.manual=!0)),!M.manual){var a=document.readyState;"loading"===a||"interactive"===a&&t&&t.defer?document.addEventListener("DOMContentLoaded",r):window.requestAnimationFrame?window.requestAnimationFrame(r):window.setTimeout(r,16);}return M}(_self);module.exports&&(module.exports=Prism),"undefined"!=typeof commonjsGlobal&&(commonjsGlobal.Prism=Prism);
    Prism.languages.markup={comment:/<!--[\s\S]*?-->/,prolog:/<\?[\s\S]+?\?>/,doctype:{pattern:/<!DOCTYPE(?:[^>"'[\]]|"[^"]*"|'[^']*')+(?:\[(?:[^<"'\]]|"[^"]*"|'[^']*'|<(?!!--)|<!--(?:[^-]|-(?!->))*-->)*\]\s*)?>/i,greedy:!0,inside:{"internal-subset":{pattern:/(^[^\[]*\[)[\s\S]+(?=\]>$)/,lookbehind:!0,greedy:!0,inside:null},string:{pattern:/"[^"]*"|'[^']*'/,greedy:!0},punctuation:/^<!|>$|[[\]]/,"doctype-tag":/^DOCTYPE/,name:/[^\s<>'"]+/}},cdata:/<!\[CDATA\[[\s\S]*?\]\]>/i,tag:{pattern:/<\/?(?!\d)[^\s>\/=$<%]+(?:\s(?:\s*[^\s>\/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s'">=]+(?=[\s>]))|(?=[\s/>])))+)?\s*\/?>/,greedy:!0,inside:{tag:{pattern:/^<\/?[^\s>\/]+/,inside:{punctuation:/^<\/?/,namespace:/^[^\s>\/:]+:/}},"special-attr":[],"attr-value":{pattern:/=\s*(?:"[^"]*"|'[^']*'|[^\s'">=]+)/,inside:{punctuation:[{pattern:/^=/,alias:"attr-equals"},/"|'/]}},punctuation:/\/?>/,"attr-name":{pattern:/[^\s>\/]+/,inside:{namespace:/^[^\s>\/:]+:/}}}},entity:[{pattern:/&[\da-z]{1,8};/i,alias:"named-entity"},/&#x?[\da-f]{1,8};/i]},Prism.languages.markup.tag.inside["attr-value"].inside.entity=Prism.languages.markup.entity,Prism.languages.markup.doctype.inside["internal-subset"].inside=Prism.languages.markup,Prism.hooks.add("wrap",function(a){"entity"===a.type&&(a.attributes.title=a.content.replace(/&amp;/,"&"));}),Object.defineProperty(Prism.languages.markup.tag,"addInlined",{value:function(a,e){var s={};s["language-"+e]={pattern:/(^<!\[CDATA\[)[\s\S]+?(?=\]\]>$)/i,lookbehind:!0,inside:Prism.languages[e]},s.cdata=/^<!\[CDATA\[|\]\]>$/i;var t={"included-cdata":{pattern:/<!\[CDATA\[[\s\S]*?\]\]>/i,inside:s}};t["language-"+e]={pattern:/[\s\S]+/,inside:Prism.languages[e]};var n={};n[a]={pattern:RegExp("(<__[^>]*>)(?:<!\\[CDATA\\[(?:[^\\]]|\\](?!\\]>))*\\]\\]>|(?!<!\\[CDATA\\[)[^])*?(?=</__>)".replace(/__/g,function(){return a}),"i"),lookbehind:!0,greedy:!0,inside:t},Prism.languages.insertBefore("markup","cdata",n);}}),Object.defineProperty(Prism.languages.markup.tag,"addAttribute",{value:function(a,e){Prism.languages.markup.tag.inside["special-attr"].push({pattern:RegExp("(^|[\"'\\s])(?:"+a+")\\s*=\\s*(?:\"[^\"]*\"|'[^']*'|[^\\s'\">=]+(?=[\\s>]))","i"),lookbehind:!0,inside:{"attr-name":/^[^\s=]+/,"attr-value":{pattern:/=[\s\S]+/,inside:{value:{pattern:/(^=\s*(["']|(?!["'])))\S[\s\S]*(?=\2$)/,lookbehind:!0,alias:[e,"language-"+e],inside:Prism.languages[e]},punctuation:[{pattern:/^=/,alias:"attr-equals"},/"|'/]}}}});}}),Prism.languages.html=Prism.languages.markup,Prism.languages.mathml=Prism.languages.markup,Prism.languages.svg=Prism.languages.markup,Prism.languages.xml=Prism.languages.extend("markup",{}),Prism.languages.ssml=Prism.languages.xml,Prism.languages.atom=Prism.languages.xml,Prism.languages.rss=Prism.languages.xml;
    !function(s){var e=/(?:"(?:\\(?:\r\n|[\s\S])|[^"\\\r\n])*"|'(?:\\(?:\r\n|[\s\S])|[^'\\\r\n])*')/;s.languages.css={comment:/\/\*[\s\S]*?\*\//,atrule:{pattern:/@[\w-](?:[^;{\s]|\s+(?![\s{]))*(?:;|(?=\s*\{))/,inside:{rule:/^@[\w-]+/,"selector-function-argument":{pattern:/(\bselector\s*\(\s*(?![\s)]))(?:[^()\s]|\s+(?![\s)])|\((?:[^()]|\([^()]*\))*\))+(?=\s*\))/,lookbehind:!0,alias:"selector"},keyword:{pattern:/(^|[^\w-])(?:and|not|only|or)(?![\w-])/,lookbehind:!0}}},url:{pattern:RegExp("\\burl\\((?:"+e.source+"|(?:[^\\\\\r\n()\"']|\\\\[^])*)\\)","i"),greedy:!0,inside:{function:/^url/i,punctuation:/^\(|\)$/,string:{pattern:RegExp("^"+e.source+"$"),alias:"url"}}},selector:{pattern:RegExp("(^|[{}\\s])[^{}\\s](?:[^{};\"'\\s]|\\s+(?![\\s{])|"+e.source+")*(?=\\s*\\{)"),lookbehind:!0},string:{pattern:e,greedy:!0},property:{pattern:/(^|[^-\w\xA0-\uFFFF])(?!\s)[-_a-z\xA0-\uFFFF](?:(?!\s)[-\w\xA0-\uFFFF])*(?=\s*:)/i,lookbehind:!0},important:/!important\b/i,function:{pattern:/(^|[^-a-z0-9])[-a-z0-9]+(?=\()/i,lookbehind:!0},punctuation:/[(){};:,]/},s.languages.css.atrule.inside.rest=s.languages.css;var t=s.languages.markup;t&&(t.tag.addInlined("style","css"),t.tag.addAttribute("style","css"));}(Prism);
    Prism.languages.clike={comment:[{pattern:/(^|[^\\])\/\*[\s\S]*?(?:\*\/|$)/,lookbehind:!0,greedy:!0},{pattern:/(^|[^\\:])\/\/.*/,lookbehind:!0,greedy:!0}],string:{pattern:/(["'])(?:\\(?:\r\n|[\s\S])|(?!\1)[^\\\r\n])*\1/,greedy:!0},"class-name":{pattern:/(\b(?:class|interface|extends|implements|trait|instanceof|new)\s+|\bcatch\s+\()[\w.\\]+/i,lookbehind:!0,inside:{punctuation:/[.\\]/}},keyword:/\b(?:if|else|while|do|for|return|in|instanceof|function|new|try|throw|catch|finally|null|break|continue)\b/,boolean:/\b(?:true|false)\b/,function:/\b\w+(?=\()/,number:/\b0x[\da-f]+\b|(?:\b\d+(?:\.\d*)?|\B\.\d+)(?:e[+-]?\d+)?/i,operator:/[<>]=?|[!=]=?=?|--?|\+\+?|&&?|\|\|?|[?*/~^%]/,punctuation:/[{}[\];(),.:]/};
    Prism.languages.javascript=Prism.languages.extend("clike",{"class-name":[Prism.languages.clike["class-name"],{pattern:/(^|[^$\w\xA0-\uFFFF])(?!\s)[_$A-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\.(?:prototype|constructor))/,lookbehind:!0}],keyword:[{pattern:/((?:^|\})\s*)catch\b/,lookbehind:!0},{pattern:/(^|[^.]|\.\.\.\s*)\b(?:as|assert(?=\s*\{)|async(?=\s*(?:function\b|\(|[$\w\xA0-\uFFFF]|$))|await|break|case|class|const|continue|debugger|default|delete|do|else|enum|export|extends|finally(?=\s*(?:\{|$))|for|from(?=\s*(?:['"]|$))|function|(?:get|set)(?=\s*(?:[#\[$\w\xA0-\uFFFF]|$))|if|implements|import|in|instanceof|interface|let|new|null|of|package|private|protected|public|return|static|super|switch|this|throw|try|typeof|undefined|var|void|while|with|yield)\b/,lookbehind:!0}],function:/#?(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\s*(?:\.\s*(?:apply|bind|call)\s*)?\()/,number:/\b(?:(?:0[xX](?:[\dA-Fa-f](?:_[\dA-Fa-f])?)+|0[bB](?:[01](?:_[01])?)+|0[oO](?:[0-7](?:_[0-7])?)+)n?|(?:\d(?:_\d)?)+n|NaN|Infinity)\b|(?:\b(?:\d(?:_\d)?)+\.?(?:\d(?:_\d)?)*|\B\.(?:\d(?:_\d)?)+)(?:[Ee][+-]?(?:\d(?:_\d)?)+)?/,operator:/--|\+\+|\*\*=?|=>|&&=?|\|\|=?|[!=]==|<<=?|>>>?=?|[-+*/%&|^!=<>]=?|\.{3}|\?\?=?|\?\.?|[~:]/}),Prism.languages.javascript["class-name"][0].pattern=/(\b(?:class|interface|extends|implements|instanceof|new)\s+)[\w.\\]+/,Prism.languages.insertBefore("javascript","keyword",{regex:{pattern:/((?:^|[^$\w\xA0-\uFFFF."'\])\s]|\b(?:return|yield))\s*)\/(?:\[(?:[^\]\\\r\n]|\\.)*\]|\\.|[^/\\\[\r\n])+\/[dgimyus]{0,7}(?=(?:\s|\/\*(?:[^*]|\*(?!\/))*\*\/)*(?:$|[\r\n,.;:})\]]|\/\/))/,lookbehind:!0,greedy:!0,inside:{"regex-source":{pattern:/^(\/)[\s\S]+(?=\/[a-z]*$)/,lookbehind:!0,alias:"language-regex",inside:Prism.languages.regex},"regex-delimiter":/^\/|\/$/,"regex-flags":/^[a-z]+$/}},"function-variable":{pattern:/#?(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\s*[=:]\s*(?:async\s*)?(?:\bfunction\b|(?:\((?:[^()]|\([^()]*\))*\)|(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*)\s*=>))/,alias:"function"},parameter:[{pattern:/(function(?:\s+(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*)?\s*\(\s*)(?!\s)(?:[^()\s]|\s+(?![\s)])|\([^()]*\))+(?=\s*\))/,lookbehind:!0,inside:Prism.languages.javascript},{pattern:/(^|[^$\w\xA0-\uFFFF])(?!\s)[_$a-z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\s*=>)/i,lookbehind:!0,inside:Prism.languages.javascript},{pattern:/(\(\s*)(?!\s)(?:[^()\s]|\s+(?![\s)])|\([^()]*\))+(?=\s*\)\s*=>)/,lookbehind:!0,inside:Prism.languages.javascript},{pattern:/((?:\b|\s|^)(?!(?:as|async|await|break|case|catch|class|const|continue|debugger|default|delete|do|else|enum|export|extends|finally|for|from|function|get|if|implements|import|in|instanceof|interface|let|new|null|of|package|private|protected|public|return|set|static|super|switch|this|throw|try|typeof|undefined|var|void|while|with|yield)(?![$\w\xA0-\uFFFF]))(?:(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*\s*)\(\s*|\]\s*\(\s*)(?!\s)(?:[^()\s]|\s+(?![\s)])|\([^()]*\))+(?=\s*\)\s*\{)/,lookbehind:!0,inside:Prism.languages.javascript}],constant:/\b[A-Z](?:[A-Z_]|\dx?)*\b/}),Prism.languages.insertBefore("javascript","string",{hashbang:{pattern:/^#!.*/,greedy:!0,alias:"comment"},"template-string":{pattern:/`(?:\\[\s\S]|\$\{(?:[^{}]|\{(?:[^{}]|\{[^}]*\})*\})+\}|(?!\$\{)[^\\`])*`/,greedy:!0,inside:{"template-punctuation":{pattern:/^`|`$/,alias:"string"},interpolation:{pattern:/((?:^|[^\\])(?:\\{2})*)\$\{(?:[^{}]|\{(?:[^{}]|\{[^}]*\})*\})+\}/,lookbehind:!0,inside:{"interpolation-punctuation":{pattern:/^\$\{|\}$/,alias:"punctuation"},rest:Prism.languages.javascript}},string:/[\s\S]+/}}}),Prism.languages.markup&&(Prism.languages.markup.tag.addInlined("script","javascript"),Prism.languages.markup.tag.addAttribute("on(?:abort|blur|change|click|composition(?:end|start|update)|dblclick|error|focus(?:in|out)?|key(?:down|up)|load|mouse(?:down|enter|leave|move|out|over|up)|reset|resize|scroll|select|slotchange|submit|unload|wheel)","javascript")),Prism.languages.js=Prism.languages.javascript;
    Prism.languages.scheme={comment:/;.*|#;\s*(?:\((?:[^()]|\([^()]*\))*\)|\[(?:[^\[\]]|\[[^\[\]]*\])*\])|#\|(?:[^#|]|#(?!\|)|\|(?!#)|#\|(?:[^#|]|#(?!\|)|\|(?!#))*\|#)*\|#/,string:{pattern:/"(?:[^"\\]|\\.)*"/,greedy:!0},symbol:{pattern:/'[^()\[\]#'\s]+/,greedy:!0},character:{pattern:/#\\(?:[ux][a-fA-F\d]+\b|[-a-zA-Z]+\b|[\uD800-\uDBFF][\uDC00-\uDFFF]|\S)/,greedy:!0,alias:"string"},"lambda-parameter":[{pattern:/((?:^|[^'`#])[(\[]lambda\s+)(?:[^|()\[\]'\s]+|\|(?:[^\\|]|\\.)*\|)/,lookbehind:!0},{pattern:/((?:^|[^'`#])[(\[]lambda\s+[(\[])[^()\[\]']+/,lookbehind:!0}],keyword:{pattern:/((?:^|[^'`#])[(\[])(?:begin|case(?:-lambda)?|cond(?:-expand)?|define(?:-library|-macro|-record-type|-syntax|-values)?|defmacro|delay(?:-force)?|do|else|export|except|guard|if|import|include(?:-ci|-library-declarations)?|lambda|let(?:rec)?(?:-syntax|-values|\*)?|let\*-values|only|parameterize|prefix|(?:quasi-?)?quote|rename|set!|syntax-(?:case|rules)|unless|unquote(?:-splicing)?|when)(?=[()\[\]\s]|$)/,lookbehind:!0},builtin:{pattern:/((?:^|[^'`#])[(\[])(?:abs|and|append|apply|assoc|ass[qv]|binary-port\?|boolean=?\?|bytevector(?:-append|-copy|-copy!|-length|-u8-ref|-u8-set!|\?)?|caar|cadr|call-with-(?:current-continuation|port|values)|call\/cc|car|cdar|cddr|cdr|ceiling|char(?:->integer|-ready\?|\?|<\?|<=\?|=\?|>\?|>=\?)|close-(?:input-port|output-port|port)|complex\?|cons|current-(?:error|input|output)-port|denominator|dynamic-wind|eof-object\??|eq\?|equal\?|eqv\?|error|error-object(?:-irritants|-message|\?)|eval|even\?|exact(?:-integer-sqrt|-integer\?|\?)?|expt|features|file-error\?|floor(?:-quotient|-remainder|\/)?|flush-output-port|for-each|gcd|get-output-(?:bytevector|string)|inexact\??|input-port(?:-open\?|\?)|integer(?:->char|\?)|lcm|length|list(?:->string|->vector|-copy|-ref|-set!|-tail|\?)?|make-(?:bytevector|list|parameter|string|vector)|map|max|member|memq|memv|min|modulo|negative\?|newline|not|null\?|number(?:->string|\?)|numerator|odd\?|open-(?:input|output)-(?:bytevector|string)|or|output-port(?:-open\?|\?)|pair\?|peek-char|peek-u8|port\?|positive\?|procedure\?|quotient|raise|raise-continuable|rational\?|rationalize|read-(?:bytevector|bytevector!|char|error\?|line|string|u8)|real\?|remainder|reverse|round|set-c[ad]r!|square|string(?:->list|->number|->symbol|->utf8|->vector|-append|-copy|-copy!|-fill!|-for-each|-length|-map|-ref|-set!|\?|<\?|<=\?|=\?|>\?|>=\?)?|substring|symbol(?:->string|\?|=\?)|syntax-error|textual-port\?|truncate(?:-quotient|-remainder|\/)?|u8-ready\?|utf8->string|values|vector(?:->list|->string|-append|-copy|-copy!|-fill!|-for-each|-length|-map|-ref|-set!|\?)?|with-exception-handler|write-(?:bytevector|char|string|u8)|zero\?)(?=[()\[\]\s]|$)/,lookbehind:!0},operator:{pattern:/((?:^|[^'`#])[(\[])(?:[-+*%/]|[<>]=?|=>?)(?=[()\[\]\s]|$)/,lookbehind:!0},number:{pattern:RegExp(function(r){for(var e in r)r[e]=r[e].replace(/<[\w\s]+>/g,function(e){return "(?:"+r[e].trim()+")"});return r[e]}({"<ureal dec>":"\\d+(?:/\\d+)|(?:\\d+(?:\\.\\d*)?|\\.\\d+)(?:e[+-]?\\d+)?","<real dec>":"[+-]?<ureal dec>|[+-](?:inf|nan)\\.0","<imaginary dec>":"[+-](?:<ureal dec>|(?:inf|nan)\\.0)?i","<complex dec>":"<real dec>(?:@<real dec>|<imaginary dec>)?|<imaginary dec>","<num dec>":"(?:#d(?:#[ei])?|#[ei](?:#d)?)?<complex dec>","<ureal box>":"[0-9a-f]+(?:/[0-9a-f]+)?","<real box>":"[+-]?<ureal box>|[+-](?:inf|nan)\\.0","<imaginary box>":"[+-](?:<ureal box>|(?:inf|nan)\\.0)?i","<complex box>":"<real box>(?:@<real box>|<imaginary box>)?|<imaginary box>","<num box>":"#[box](?:#[ei])?|(?:#[ei])?#[box]<complex box>","<number>":"(^|[()\\[\\]\\s])(?:<num dec>|<num box>)(?=[()\\[\\]\\s]|$)"}),"i"),lookbehind:!0},boolean:{pattern:/(^|[()\[\]\s])#(?:[ft]|false|true)(?=[()\[\]\s]|$)/,lookbehind:!0},function:{pattern:/((?:^|[^'`#])[(\[])(?:[^|()\[\]'\s]+|\|(?:[^\\|]|\\.)*\|)(?=[()\[\]\s]|$)/,lookbehind:!0},identifier:{pattern:/(^|[()\[\]\s])\|(?:[^\\|]|\\.)*\|(?=[()\[\]\s]|$)/,lookbehind:!0,greedy:!0},punctuation:/[()\[\]']/};
    Prism.languages.racket=Prism.languages.extend("scheme",{"lambda-parameter":{pattern:/([(\[]lambda\s+[(\[])[^()\[\]'\s]+/,lookbehind:!0}}),Prism.languages.insertBefore("racket","string",{lang:{pattern:/^#lang.+/m,greedy:!0,alias:"keyword"}}),Prism.languages.rkt=Prism.languages.racket;
    !function(){if("undefined"!=typeof Prism&&"undefined"!=typeof document){var o="line-numbers",a=/\n(?!$)/g,e=Prism.plugins.lineNumbers={getLine:function(e,n){if("PRE"===e.tagName&&e.classList.contains(o)){var t=e.querySelector(".line-numbers-rows");if(t){var i=parseInt(e.getAttribute("data-start"),10)||1,r=i+(t.children.length-1);n<i&&(n=i),r<n&&(n=r);var s=n-i;return t.children[s]}}},resize:function(e){u([e]);},assumeViewportIndependence:!0},n=void 0;window.addEventListener("resize",function(){e.assumeViewportIndependence&&n===window.innerWidth||(n=window.innerWidth,u(Array.prototype.slice.call(document.querySelectorAll("pre."+o))));}),Prism.hooks.add("complete",function(e){if(e.code){var n=e.element,t=n.parentNode;if(t&&/pre/i.test(t.nodeName)&&!n.querySelector(".line-numbers-rows")&&Prism.util.isActive(n,o)){n.classList.remove(o),t.classList.add(o);var i,r=e.code.match(a),s=r?r.length+1:1,l=new Array(s+1).join("<span></span>");(i=document.createElement("span")).setAttribute("aria-hidden","true"),i.className="line-numbers-rows",i.innerHTML=l,t.hasAttribute("data-start")&&(t.style.counterReset="linenumber "+(parseInt(t.getAttribute("data-start"),10)-1)),e.element.appendChild(i),u([t]),Prism.hooks.run("line-numbers",e);}}}),Prism.hooks.add("line-numbers",function(e){e.plugins=e.plugins||{},e.plugins.lineNumbers=!0;});}function u(e){if(0!=(e=e.filter(function(e){var n=function(e){return e?window.getComputedStyle?getComputedStyle(e):e.currentStyle||null:null}(e)["white-space"];return "pre-wrap"===n||"pre-line"===n})).length){var n=e.map(function(e){var n=e.querySelector("code"),t=e.querySelector(".line-numbers-rows");if(n&&t){var i=e.querySelector(".line-numbers-sizer"),r=n.textContent.split(a);i||((i=document.createElement("span")).className="line-numbers-sizer",n.appendChild(i)),i.innerHTML="0",i.style.display="block";var s=i.getBoundingClientRect().height;return i.innerHTML="",{element:e,lines:r,lineHeights:[],oneLinerHeight:s,sizer:i}}}).filter(Boolean);n.forEach(function(e){var i=e.sizer,n=e.lines,r=e.lineHeights,s=e.oneLinerHeight;r[n.length-1]=void 0,n.forEach(function(e,n){if(e&&1<e.length){var t=i.appendChild(document.createElement("span"));t.style.display="block",t.textContent=e;}else r[n]=s;});}),n.forEach(function(e){for(var n=e.sizer,t=e.lineHeights,i=0,r=0;r<t.length;r++)void 0===t[r]&&(t[r]=n.children[i++].getBoundingClientRect().height);}),n.forEach(function(e){var n=e.sizer,t=e.element.querySelector(".line-numbers-rows");n.style.display="none",n.innerHTML="",e.lineHeights.forEach(function(e,n){t.children[n].style.height=e+"px";});});}}}();
    !function(){if("undefined"!=typeof Prism&&"undefined"!=typeof document){var i=[],l={},d=function(){};Prism.plugins.toolbar={};var e=Prism.plugins.toolbar.registerButton=function(e,n){var t;t="function"==typeof n?n:function(e){var t;return "function"==typeof n.onClick?((t=document.createElement("button")).type="button",t.addEventListener("click",function(){n.onClick.call(this,e);})):"string"==typeof n.url?(t=document.createElement("a")).href=n.url:t=document.createElement("span"),n.className&&t.classList.add(n.className),t.textContent=n.text,t},e in l?console.warn('There is a button with the key "'+e+'" registered already.'):i.push(l[e]=t);},t=Prism.plugins.toolbar.hook=function(a){var e=a.element.parentNode;if(e&&/pre/i.test(e.nodeName)&&!e.parentNode.classList.contains("code-toolbar")){var t=document.createElement("div");t.classList.add("code-toolbar"),e.parentNode.insertBefore(t,e),t.appendChild(e);var r=document.createElement("div");r.classList.add("toolbar");var n=i,o=function(e){for(;e;){var t=e.getAttribute("data-toolbar-order");if(null!=t)return (t=t.trim()).length?t.split(/\s*,\s*/g):[];e=e.parentElement;}}(a.element);o&&(n=o.map(function(e){return l[e]||d})),n.forEach(function(e){var t=e(a);if(t){var n=document.createElement("div");n.classList.add("toolbar-item"),n.appendChild(t),r.appendChild(n);}}),t.appendChild(r);}};e("label",function(e){var t=e.element.parentNode;if(t&&/pre/i.test(t.nodeName)&&t.hasAttribute("data-label")){var n,a,r=t.getAttribute("data-label");try{a=document.querySelector("template#"+r);}catch(e){}return a?n=a.content:(t.hasAttribute("data-url")?(n=document.createElement("a")).href=t.getAttribute("data-url"):n=document.createElement("span"),n.textContent=r),n}}),Prism.hooks.add("complete",t);}}();
    "undefined"!=typeof Prism&&"undefined"!=typeof document&&document.querySelector&&Prism.plugins.toolbar.registerButton("download-file",function(t){var e=t.element.parentNode;if(e&&/pre/i.test(e.nodeName)&&e.hasAttribute("data-src")&&e.hasAttribute("data-download-link")){var n=e.getAttribute("data-src"),a=document.createElement("a");return a.textContent=e.getAttribute("data-download-link-label")||"Download",a.setAttribute("download",""),a.href=n,a}});
    !function(){if("undefined"!=typeof Prism&&"undefined"!=typeof document){var d={"(":")","[":"]","{":"}"},u={"(":"brace-round","[":"brace-square","{":"brace-curly"},f={"${":"{"},h=0,n=/^(pair-\d+-)(open|close)$/;Prism.hooks.add("complete",function(e){var t=e.element,n=t.parentElement;if(n&&"PRE"==n.tagName){var r=[];if(Prism.util.isActive(t,"match-braces")&&r.push("(","[","{"),0!=r.length){n.__listenerAdded||(n.addEventListener("mousedown",function(){var e=n.querySelector("code"),t=p("brace-selected");Array.prototype.slice.call(e.querySelectorAll("."+t)).forEach(function(e){e.classList.remove(t);});}),Object.defineProperty(n,"__listenerAdded",{value:!0}));var o=Array.prototype.slice.call(t.querySelectorAll("span."+p("token")+"."+p("punctuation"))),l=[];r.forEach(function(e){for(var t=d[e],n=p(u[e]),r=[],c=[],s=0;s<o.length;s++){var i=o[s];if(0==i.childElementCount){var a=i.textContent;(a=f[a]||a)===e?(l.push({index:s,open:!0,element:i}),i.classList.add(n),i.classList.add(p("brace-open")),c.push(s)):a===t&&(l.push({index:s,open:!1,element:i}),i.classList.add(n),i.classList.add(p("brace-close")),c.length&&r.push([s,c.pop()]));}}r.forEach(function(e){var t="pair-"+h+++"-",n=o[e[0]],r=o[e[1]];n.id=t+"open",r.id=t+"close",[n,r].forEach(function(e){e.addEventListener("mouseenter",v),e.addEventListener("mouseleave",m),e.addEventListener("click",b);});});});var c=0;l.sort(function(e,t){return e.index-t.index}),l.forEach(function(e){e.open?(e.element.classList.add(p("brace-level-"+(c%12+1))),c++):(c=Math.max(0,c-1),e.element.classList.add(p("brace-level-"+(c%12+1))));});}}});}function p(e){var t=Prism.plugins.customClass;return t?t.apply(e,"none"):e}function e(e){var t=n.exec(e.id);return document.querySelector("#"+t[1]+("open"==t[2]?"close":"open"))}function v(){Prism.util.isActive(this,"brace-hover",!0)&&[this,e(this)].forEach(function(e){e.classList.add(p("brace-hover"));});}function m(){[this,e(this)].forEach(function(e){e.classList.remove(p("brace-hover"));});}function b(){Prism.util.isActive(this,"brace-select",!0)&&[this,e(this)].forEach(function(e){e.classList.add(p("brace-selected"));});}}();
    });

    ///replace spaces with underscores and lower cases the name
    function convert_to_hash(st) {
        let regex = / /gi;
        let replace_spaces = st.replace(regex, "_");
        let res = replace_spaces.toLowerCase();
        return res;
    }
    var Sync;
    (function (Sync) {
        Sync[Sync["UPDATE"] = 0] = "UPDATE";
        Sync[Sync["INITIAL"] = 1] = "INITIAL";
        Sync[Sync["ARCHIVE"] = 2] = "ARCHIVE";
    })(Sync || (Sync = {}));
    function diff_latest(set_a, set_b) {
        let bigger = set_a;
        let smaller = set_b;
        if (set_a.length < set_b.length) {
            bigger = set_b;
            smaller = set_a;
        }
        //merge the unique ones that the other doesnt have
        for (const item of smaller) {
            let is_unique = true;
            for (const item2 of bigger) {
                if (item.id === item2.id || item.title === item2.title) {
                    is_unique = false;
                    break;
                }
            }
            if (is_unique) {
                bigger.push(item);
            }
        }
        //diffing
        let diffed = bigger.map((val) => {
            let keep = val;
            for (const val2 of smaller) {
                if (val.id == val2.id && val.last_updated < val2.last_updated) {
                    keep = val2;
                    break;
                }
            }
            return keep;
        });
        return diffed;
    }
    const website_sync_point = "https://jestlearn.com/sync";
    //const website_sync_point = "http://localhost:3000/sync";
    async function send_sync(username, TOC, server_copy = [], code = 0) {
        let dlatest = diff_latest(TOC, server_copy);
        let send = {
            code: code,
            course_name: COURSE_NAME,
            username: username,
            problem_sets: dlatest
                .filter((val, index) => {
                let serv = server_copy.find((i) => i.id === val.id);
                let update_server_sync = false;
                if (serv) {
                    update_server_sync = serv.last_updated < val.last_updated;
                }
                else if (val.last_updated !== 0) {
                    //does not exist on the server yet, but only send if they edited it
                    update_server_sync = true;
                }
                //only sync when server data is older than then one here on the client
                return update_server_sync;
            })
                .map((pset) => {
                //no need to send tags& resources, mainly just problem data:
                //have to deep clone
                let clone = JSON.parse(JSON.stringify(pset));
                delete clone.resources;
                delete clone.tags;
                clone.problems = clone.problems.map((problem) => {
                    // keep input_answer_hints and explanations because they might be procedurally generated explanations
                    //delete problem.input_answer_hint;
                    if (Array.isArray(problem.answer)) {
                        problem.answer = problem.answer.map((answ) => {
                            //delete answ.explanation;
                            return answ;
                        });
                    }
                    return problem;
                });
                return clone;
            }),
        };
        ///console.log(send);
        let response = await fetch(website_sync_point, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(send),
        });
        return response.json();
    }

    /* src/ProblemSet.svelte generated by Svelte v3.42.2 */
    const file$3 = "src/ProblemSet.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[18] = list[i];
    	child_ctx[20] = i;
    	return child_ctx;
    }

    // (111:2) {#each data.problems as item, index}
    function create_each_block$1(ctx) {
    	let span;
    	let t_value = /*item*/ ctx[18].result + "";
    	let t;

    	const block = {
    		c: function create() {
    			span = element("span");
    			t = text(t_value);
    			set_style(span, "margin", "0.5rem");
    			add_location(span, file$3, 111, 4, 4505);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*data*/ 1 && t_value !== (t_value = /*item*/ ctx[18].result + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(111:2) {#each data.problems as item, index}",
    		ctx
    	});

    	return block;
    }

    // (131:46) 
    function create_if_block_3(ctx) {
    	let selectproblem;
    	let current;

    	selectproblem = new SelectProblem({
    			props: {
    				data: /*current_problem*/ ctx[8],
    				enable_next_button: /*enable_next_button*/ ctx[3] || /*reset_problems*/ ctx[4]
    			},
    			$$inline: true
    		});

    	selectproblem.$on("update-check", /*update_check_handler_1*/ ctx[13]);
    	selectproblem.$on("valid-input", /*valid_input_handler_1*/ ctx[14]);

    	const block = {
    		c: function create() {
    			create_component(selectproblem.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(selectproblem, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const selectproblem_changes = {};
    			if (dirty & /*current_problem*/ 256) selectproblem_changes.data = /*current_problem*/ ctx[8];
    			if (dirty & /*enable_next_button, reset_problems*/ 24) selectproblem_changes.enable_next_button = /*enable_next_button*/ ctx[3] || /*reset_problems*/ ctx[4];
    			selectproblem.$set(selectproblem_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(selectproblem.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(selectproblem.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(selectproblem, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(131:46) ",
    		ctx
    	});

    	return block;
    }

    // (118:45) 
    function create_if_block_2(ctx) {
    	let inputproblem;
    	let current;

    	inputproblem = new InputProblem({
    			props: {
    				reset: /*reset_input_answer*/ ctx[6],
    				data: /*current_problem*/ ctx[8],
    				show_answer_option: /*show_answer_option*/ ctx[5]
    			},
    			$$inline: true
    		});

    	inputproblem.$on("update-check", /*update_check_handler*/ ctx[11]);
    	inputproblem.$on("valid-input", /*valid_input_handler*/ ctx[12]);

    	inputproblem.$on("check-answer", function () {
    		if (is_function(/*enable_next_button*/ ctx[3]
    		? /*reset*/ ctx[10]
    		: /*check*/ ctx[9])) (/*enable_next_button*/ ctx[3]
    		? /*reset*/ ctx[10]
    		: /*check*/ ctx[9]).apply(this, arguments);
    	});

    	const block = {
    		c: function create() {
    			create_component(inputproblem.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(inputproblem, target, anchor);
    			current = true;
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			const inputproblem_changes = {};
    			if (dirty & /*reset_input_answer*/ 64) inputproblem_changes.reset = /*reset_input_answer*/ ctx[6];
    			if (dirty & /*current_problem*/ 256) inputproblem_changes.data = /*current_problem*/ ctx[8];
    			if (dirty & /*show_answer_option*/ 32) inputproblem_changes.show_answer_option = /*show_answer_option*/ ctx[5];
    			inputproblem.$set(inputproblem_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(inputproblem.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(inputproblem.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(inputproblem, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(118:45) ",
    		ctx
    	});

    	return block;
    }

    // (116:2) {#if data.problems.length <= 0}
    function create_if_block_1$1(ctx) {
    	let h2;

    	const block = {
    		c: function create() {
    			h2 = element("h2");
    			h2.textContent = "Loading...";
    			add_location(h2, file$3, 116, 4, 4616);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h2, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h2);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$1.name,
    		type: "if",
    		source: "(116:2) {#if data.problems.length <= 0}",
    		ctx
    	});

    	return block;
    }

    // (148:4) {:else}
    function create_else_block$1(ctx) {
    	let button;
    	let t;
    	let button_class_value;
    	let button_disabled_value;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			t = text("Check");
    			attr_dev(button, "class", button_class_value = "" + (null_to_empty(/*is_valid*/ ctx[2] ? "button" : "button disabled") + " svelte-ba70j4"));
    			button.disabled = button_disabled_value = !/*is_valid*/ ctx[2];
    			add_location(button, file$3, 148, 6, 5542);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, t);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*check*/ ctx[9], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*is_valid*/ 4 && button_class_value !== (button_class_value = "" + (null_to_empty(/*is_valid*/ ctx[2] ? "button" : "button disabled") + " svelte-ba70j4"))) {
    				attr_dev(button, "class", button_class_value);
    			}

    			if (dirty & /*is_valid*/ 4 && button_disabled_value !== (button_disabled_value = !/*is_valid*/ ctx[2])) {
    				prop_dev(button, "disabled", button_disabled_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$1.name,
    		type: "else",
    		source: "(148:4) {:else}",
    		ctx
    	});

    	return block;
    }

    // (144:4) {#if enable_next_button}
    function create_if_block$2(ctx) {
    	let button;
    	let t_value = (/*finished_all_problems*/ ctx[7] ? "Reset" : "Next") + "";
    	let t;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			t = text(t_value);
    			attr_dev(button, "class", "button svelte-ba70j4");
    			add_location(button, file$3, 144, 6, 5416);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, t);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*reset*/ ctx[10], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*finished_all_problems*/ 128 && t_value !== (t_value = (/*finished_all_problems*/ ctx[7] ? "Reset" : "Next") + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$2.name,
    		type: "if",
    		source: "(144:4) {#if enable_next_button}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$3(ctx) {
    	let title;
    	let t0_value = /*data*/ ctx[0].title + "";
    	let t0;
    	let t1;
    	let div1;
    	let t2;
    	let current_block_type_index;
    	let if_block0;
    	let t3;
    	let div0;
    	let current;
    	let each_value = /*data*/ ctx[0].problems;
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	const if_block_creators = [create_if_block_1$1, create_if_block_2, create_if_block_3];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*data*/ ctx[0].problems.length <= 0) return 0;
    		if (/*current_problem*/ ctx[8].type === "input") return 1;
    		if (/*current_problem*/ ctx[8].type === "select") return 2;
    		return -1;
    	}

    	if (~(current_block_type_index = select_block_type(ctx))) {
    		if_block0 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    	}

    	function select_block_type_1(ctx, dirty) {
    		if (/*enable_next_button*/ ctx[3]) return create_if_block$2;
    		return create_else_block$1;
    	}

    	let current_block_type = select_block_type_1(ctx);
    	let if_block1 = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			title = element("title");
    			t0 = text(t0_value);
    			t1 = space();
    			div1 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t2 = space();
    			if (if_block0) if_block0.c();
    			t3 = space();
    			div0 = element("div");
    			if_block1.c();
    			add_location(title, file$3, 108, 0, 4428);
    			attr_dev(div0, "class", "text-align-center svelte-ba70j4");
    			add_location(div0, file$3, 142, 2, 5349);
    			add_location(div1, file$3, 109, 0, 4456);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, title, anchor);
    			append_dev(title, t0);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, div1, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div1, null);
    			}

    			append_dev(div1, t2);

    			if (~current_block_type_index) {
    				if_blocks[current_block_type_index].m(div1, null);
    			}

    			append_dev(div1, t3);
    			append_dev(div1, div0);
    			if_block1.m(div0, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if ((!current || dirty & /*data*/ 1) && t0_value !== (t0_value = /*data*/ ctx[0].title + "")) set_data_dev(t0, t0_value);

    			if (dirty & /*data*/ 1) {
    				each_value = /*data*/ ctx[0].problems;
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div1, t2);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if (~current_block_type_index) {
    					if_blocks[current_block_type_index].p(ctx, dirty);
    				}
    			} else {
    				if (if_block0) {
    					group_outros();

    					transition_out(if_blocks[previous_block_index], 1, 1, () => {
    						if_blocks[previous_block_index] = null;
    					});

    					check_outros();
    				}

    				if (~current_block_type_index) {
    					if_block0 = if_blocks[current_block_type_index];

    					if (!if_block0) {
    						if_block0 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    						if_block0.c();
    					} else {
    						if_block0.p(ctx, dirty);
    					}

    					transition_in(if_block0, 1);
    					if_block0.m(div1, t3);
    				} else {
    					if_block0 = null;
    				}
    			}

    			if (current_block_type === (current_block_type = select_block_type_1(ctx)) && if_block1) {
    				if_block1.p(ctx, dirty);
    			} else {
    				if_block1.d(1);
    				if_block1 = current_block_type(ctx);

    				if (if_block1) {
    					if_block1.c();
    					if_block1.m(div0, null);
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block0);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block0);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(title);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(div1);
    			destroy_each(each_blocks, detaching);

    			if (~current_block_type_index) {
    				if_blocks[current_block_type_index].d();
    			}

    			if_block1.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let finished_all_problems;
    	let current_problem;
    	let reset_input_answer;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('ProblemSet', slots, []);

    	var __awaiter = this && this.__awaiter || function (thisArg, _arguments, P, generator) {
    		function adopt(value) {
    			return value instanceof P
    			? value
    			: new P(function (resolve) {
    						resolve(value);
    					});
    		}

    		return new (P || (P = Promise))(function (resolve, reject) {
    				function fulfilled(value) {
    					try {
    						step(generator.next(value));
    					} catch(e) {
    						reject(e);
    					}
    				}

    				function rejected(value) {
    					try {
    						step(generator["throw"](value));
    					} catch(e) {
    						reject(e);
    					}
    				}

    				function step(result) {
    					result.done
    					? resolve(result.value)
    					: adopt(result.value).then(fulfilled, rejected);
    				}

    				step((generator = generator.apply(thisArg, _arguments || [])).next());
    			});
    	};

    	
    	let { data } = $$props;
    	const dispatch = createEventDispatcher();
    	let check_answer;
    	let is_valid = false;
    	let enable_next_button = false;
    	let reset_problems = false;
    	let show_answer_option = false;

    	function check() {
    		$$invalidate(6, reset_input_answer = false);
    		$$invalidate(0, data.problems[data.problem_index].tries += 1, data);

    		if (check_answer && check_answer()) {
    			if (data.problems[data.problem_index].tries == 1) {
    				//got it right on the first try
    				$$invalidate(0, data.problems[data.problem_index].result = "✅", data);
    			} else {
    				//got it wrong once but corrected
    				$$invalidate(0, data.problems[data.problem_index].result = "⚠️", data);
    			}

    			//the date timestamp for when they got it correct
    			$$invalidate(0, data.problems[data.problem_index].time = Date.now(), data);

    			$$invalidate(3, enable_next_button = true);
    			$$invalidate(5, show_answer_option = false);
    			correct_answer_sound.currentTime = 0;
    			correct_answer_sound.play();
    		} else {
    			$$invalidate(5, show_answer_option = true);
    			wrong_answer_sound.play();
    			$$invalidate(0, data.problems[data.problem_index].result = "❌", data);
    		}

    		$$invalidate(0, data.last_updated = Date.now(), data);
    		dispatch("save", { code: Sync.UPDATE });
    	}

    	function reset() {
    		return __awaiter(this, void 0, void 0, function* () {
    			if (data.problem_index < data.problems.length - 1) {
    				$$invalidate(0, data.problem_index += 1, data);
    				$$invalidate(3, enable_next_button = false);
    				$$invalidate(1, check_answer = null);
    				$$invalidate(2, is_valid = false);
    			} else {
    				$$invalidate(7, finished_all_problems = true);

    				if (finished_all_problems) {
    					if (reset_problems) {
    						$$invalidate(4, reset_problems = false);
    						$$invalidate(0, data.problem_index = 0, data);
    						$$invalidate(3, enable_next_button = false);
    						$$invalidate(1, check_answer = null);
    						$$invalidate(2, is_valid = false);
    						$$invalidate(7, finished_all_problems = false);

    						if (data.gen) {
    							let generated = yield data.gen();
    							$$invalidate(0, data.problems = generated, data);
    							$$invalidate(0, data);
    						} else {
    							//if the TOC data updates and the user resets the problem, they will get the latest TOC version rather than having an old version of a non-updated TOC
    							let cloned = JSON.parse(JSON.stringify(TOC_original)).find(val => {
    								return val.title === data.title;
    							}).problems;

    							//do not change data.problems = , assignment because it wont work if you do data.problems = .
    							//https://svelte.dev/tutorial/updating-arrays-and-objects
    							$$invalidate(0, data.problems = cloned, data);

    							$$invalidate(0, data);
    						}
    					} else {
    						$$invalidate(4, reset_problems = true);
    					}
    				}
    			}

    			$$invalidate(0, data.last_updated = Date.now(), data);
    			let code = Sync.UPDATE;

    			if (finished_all_problems) {
    				code = Sync.ARCHIVE;
    			}

    			dispatch("save", { code });
    			$$invalidate(6, reset_input_answer = true);
    		});
    	}

    	const writable_props = ['data'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<ProblemSet> was created with unknown prop '${key}'`);
    	});

    	const update_check_handler = event => {
    		$$invalidate(1, check_answer = event.detail);
    	};

    	const valid_input_handler = event => {
    		$$invalidate(2, is_valid = event.detail);
    	};

    	const update_check_handler_1 = event => {
    		$$invalidate(1, check_answer = event.detail);
    	};

    	const valid_input_handler_1 = event => {
    		$$invalidate(2, is_valid = event.detail);
    	};

    	$$self.$$set = $$props => {
    		if ('data' in $$props) $$invalidate(0, data = $$props.data);
    	};

    	$$self.$capture_state = () => ({
    		__awaiter,
    		InputProblem,
    		SelectProblem,
    		correct_answer_sound,
    		wrong_answer_sound,
    		createEventDispatcher,
    		TOC,
    		TOC_original,
    		Prism: prism,
    		Sync,
    		data,
    		dispatch,
    		check_answer,
    		is_valid,
    		enable_next_button,
    		reset_problems,
    		show_answer_option,
    		check,
    		reset,
    		reset_input_answer,
    		finished_all_problems,
    		current_problem
    	});

    	$$self.$inject_state = $$props => {
    		if ('__awaiter' in $$props) __awaiter = $$props.__awaiter;
    		if ('data' in $$props) $$invalidate(0, data = $$props.data);
    		if ('check_answer' in $$props) $$invalidate(1, check_answer = $$props.check_answer);
    		if ('is_valid' in $$props) $$invalidate(2, is_valid = $$props.is_valid);
    		if ('enable_next_button' in $$props) $$invalidate(3, enable_next_button = $$props.enable_next_button);
    		if ('reset_problems' in $$props) $$invalidate(4, reset_problems = $$props.reset_problems);
    		if ('show_answer_option' in $$props) $$invalidate(5, show_answer_option = $$props.show_answer_option);
    		if ('reset_input_answer' in $$props) $$invalidate(6, reset_input_answer = $$props.reset_input_answer);
    		if ('finished_all_problems' in $$props) $$invalidate(7, finished_all_problems = $$props.finished_all_problems);
    		if ('current_problem' in $$props) $$invalidate(8, current_problem = $$props.current_problem);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*data*/ 1) {
    			$$invalidate(8, current_problem = data.problems[data.problem_index]);
    		}
    	};

    	$$invalidate(7, finished_all_problems = false);
    	$$invalidate(6, reset_input_answer = false);

    	return [
    		data,
    		check_answer,
    		is_valid,
    		enable_next_button,
    		reset_problems,
    		show_answer_option,
    		reset_input_answer,
    		finished_all_problems,
    		current_problem,
    		check,
    		reset,
    		update_check_handler,
    		valid_input_handler,
    		update_check_handler_1,
    		valid_input_handler_1
    	];
    }

    class ProblemSet extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, { data: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ProblemSet",
    			options,
    			id: create_fragment$3.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*data*/ ctx[0] === undefined && !('data' in props)) {
    			console.warn("<ProblemSet> was created without expected prop 'data'");
    		}
    	}

    	get data() {
    		throw new Error("<ProblemSet>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set data(value) {
    		throw new Error("<ProblemSet>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/routes/Home.svelte generated by Svelte v3.42.2 */

    const { console: console_1$1 } = globals;
    const file$2 = "src/routes/Home.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[15] = list[i];
    	child_ctx[16] = list;
    	child_ctx[17] = i;
    	return child_ctx;
    }

    // (65:4) {:else}
    function create_else_block(ctx) {
    	let input;
    	let button;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			input = element("input");
    			button = element("button");
    			button.textContent = "Enter";
    			attr_dev(input, "name", "username");
    			attr_dev(input, "type", "text");
    			attr_dev(input, "placeholder", "Username");
    			add_location(input, file$2, 65, 6, 1982);
    			add_location(button, file$2, 70, 8, 2102);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, input, anchor);
    			set_input_value(input, /*username*/ ctx[3]);
    			insert_dev(target, button, anchor);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "input", /*input_input_handler_1*/ ctx[9]),
    					listen_dev(button, "click", /*click_handler_1*/ ctx[10], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*username*/ 8 && input.value !== /*username*/ ctx[3]) {
    				set_input_value(input, /*username*/ ctx[3]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(input);
    			if (detaching) detach_dev(button);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(65:4) {:else}",
    		ctx
    	});

    	return block;
    }

    // (54:4) {#if server_save_cache}
    function create_if_block_1(ctx) {
    	let i;
    	let t0;
    	let t1_value = new Date(/*server_save_cache*/ ctx[1].date_created).toDateString() + "";
    	let t1;
    	let t2;
    	let b;
    	let t3_value = /*server_save_cache*/ ctx[1].username + "";
    	let t3;
    	let t4;
    	let button;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			i = element("i");
    			t0 = text("Joined: ");
    			t1 = text(t1_value);
    			t2 = text(",\n      Logged in as: ");
    			b = element("b");
    			t3 = text(t3_value);
    			t4 = space();
    			button = element("button");
    			button.textContent = "Logout";
    			add_location(i, file$2, 54, 6, 1608);
    			add_location(b, file$2, 55, 20, 1702);
    			attr_dev(button, "class", "logout-button svelte-7dmpn5");
    			add_location(button, file$2, 56, 6, 1744);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, i, anchor);
    			append_dev(i, t0);
    			append_dev(i, t1);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, b, anchor);
    			append_dev(b, t3);
    			insert_dev(target, t4, anchor);
    			insert_dev(target, button, anchor);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*click_handler*/ ctx[8], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*server_save_cache*/ 2 && t1_value !== (t1_value = new Date(/*server_save_cache*/ ctx[1].date_created).toDateString() + "")) set_data_dev(t1, t1_value);
    			if (dirty & /*server_save_cache*/ 2 && t3_value !== (t3_value = /*server_save_cache*/ ctx[1].username + "")) set_data_dev(t3, t3_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(i);
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(b);
    			if (detaching) detach_dev(t4);
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(54:4) {#if server_save_cache}",
    		ctx
    	});

    	return block;
    }

    // (119:10) {#if item.resources}
    function create_if_block$1(ctx) {
    	let button;
    	let t;
    	let button_disabled_value;
    	let mounted;
    	let dispose;

    	function click_handler_3() {
    		return /*click_handler_3*/ ctx[12](/*item*/ ctx[15]);
    	}

    	const block = {
    		c: function create() {
    			button = element("button");
    			t = text("View");
    			button.disabled = button_disabled_value = /*item*/ ctx[15].resources.length <= 0;
    			add_location(button, file$2, 119, 12, 3572);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, t);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", click_handler_3, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty & /*filtered*/ 16 && button_disabled_value !== (button_disabled_value = /*item*/ ctx[15].resources.length <= 0)) {
    				prop_dev(button, "disabled", button_disabled_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(119:10) {#if item.resources}",
    		ctx
    	});

    	return block;
    }

    // (113:4) {#each filtered as item}
    function create_each_block(ctx) {
    	let tr;
    	let td0;
    	let t0_value = /*item*/ ctx[15].id + "";
    	let t0;
    	let t1;
    	let td1;
    	let a0;
    	let t2_value = /*item*/ ctx[15].title + "";
    	let t2;
    	let a0_href_value;
    	let t3;
    	let td2;
    	let t4_value = calculate_progress(/*item*/ ctx[15].problems) + "";
    	let t4;
    	let t5;
    	let td3;
    	let t6;
    	let td4;
    	let a1;
    	let t7;
    	let a1_href_value;
    	let t8;
    	let td5;
    	let select;
    	let option0;
    	let option1;
    	let option2;
    	let option3;
    	let t13;
    	let mounted;
    	let dispose;
    	let if_block = /*item*/ ctx[15].resources && create_if_block$1(ctx);

    	function select_change_handler() {
    		/*select_change_handler*/ ctx[13].call(select, /*each_value*/ ctx[16], /*item_index*/ ctx[17]);
    	}

    	function change_handler() {
    		return /*change_handler*/ ctx[14](/*item*/ ctx[15], /*each_value*/ ctx[16], /*item_index*/ ctx[17]);
    	}

    	const block = {
    		c: function create() {
    			tr = element("tr");
    			td0 = element("td");
    			t0 = text(t0_value);
    			t1 = space();
    			td1 = element("td");
    			a0 = element("a");
    			t2 = text(t2_value);
    			t3 = space();
    			td2 = element("td");
    			t4 = text(t4_value);
    			t5 = space();
    			td3 = element("td");
    			if (if_block) if_block.c();
    			t6 = space();
    			td4 = element("td");
    			a1 = element("a");
    			t7 = text("Github");
    			t8 = space();
    			td5 = element("td");
    			select = element("select");
    			option0 = element("option");
    			option0.textContent = "❓";
    			option1 = element("option");
    			option1.textContent = "⚠️";
    			option2 = element("option");
    			option2.textContent = "✅";
    			option3 = element("option");
    			option3.textContent = "❌";
    			t13 = space();
    			add_location(td0, file$2, 114, 8, 3365);
    			attr_dev(a0, "href", a0_href_value = "#" + convert_to_hash(/*item*/ ctx[15].title));
    			add_location(a0, file$2, 115, 12, 3396);
    			add_location(td1, file$2, 115, 8, 3392);
    			add_location(td2, file$2, 116, 8, 3470);
    			add_location(td3, file$2, 117, 8, 3524);
    			attr_dev(a1, "href", a1_href_value = `${/*base_path*/ ctx[0]}#discuss/${convert_to_hash(/*item*/ ctx[15].title)}`);
    			add_location(a1, file$2, 144, 11, 4488);
    			add_location(td4, file$2, 143, 8, 4473);
    			option0.__value = "❓";
    			option0.value = option0.__value;
    			add_location(option0, file$2, 156, 12, 4844);
    			option1.__value = "⚠️";
    			option1.value = option1.__value;
    			add_location(option1, file$2, 157, 12, 4885);
    			option2.__value = "✅";
    			option2.value = option2.__value;
    			add_location(option2, file$2, 158, 12, 4928);
    			option3.__value = "❌";
    			option3.value = option3.__value;
    			add_location(option3, file$2, 159, 12, 4969);
    			if (/*item*/ ctx[15].emoji_mark === void 0) add_render_callback(select_change_handler);
    			add_location(select, file$2, 149, 11, 4624);
    			add_location(td5, file$2, 148, 8, 4609);
    			add_location(tr, file$2, 113, 6, 3352);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, tr, anchor);
    			append_dev(tr, td0);
    			append_dev(td0, t0);
    			append_dev(tr, t1);
    			append_dev(tr, td1);
    			append_dev(td1, a0);
    			append_dev(a0, t2);
    			append_dev(tr, t3);
    			append_dev(tr, td2);
    			append_dev(td2, t4);
    			append_dev(tr, t5);
    			append_dev(tr, td3);
    			if (if_block) if_block.m(td3, null);
    			append_dev(tr, t6);
    			append_dev(tr, td4);
    			append_dev(td4, a1);
    			append_dev(a1, t7);
    			append_dev(tr, t8);
    			append_dev(tr, td5);
    			append_dev(td5, select);
    			append_dev(select, option0);
    			append_dev(select, option1);
    			append_dev(select, option2);
    			append_dev(select, option3);
    			select_option(select, /*item*/ ctx[15].emoji_mark);
    			append_dev(tr, t13);

    			if (!mounted) {
    				dispose = [
    					listen_dev(select, "change", select_change_handler),
    					listen_dev(select, "change", change_handler, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty & /*filtered*/ 16 && t0_value !== (t0_value = /*item*/ ctx[15].id + "")) set_data_dev(t0, t0_value);
    			if (dirty & /*filtered*/ 16 && t2_value !== (t2_value = /*item*/ ctx[15].title + "")) set_data_dev(t2, t2_value);

    			if (dirty & /*filtered*/ 16 && a0_href_value !== (a0_href_value = "#" + convert_to_hash(/*item*/ ctx[15].title))) {
    				attr_dev(a0, "href", a0_href_value);
    			}

    			if (dirty & /*filtered*/ 16 && t4_value !== (t4_value = calculate_progress(/*item*/ ctx[15].problems) + "")) set_data_dev(t4, t4_value);

    			if (/*item*/ ctx[15].resources) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block$1(ctx);
    					if_block.c();
    					if_block.m(td3, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (dirty & /*base_path, filtered*/ 17 && a1_href_value !== (a1_href_value = `${/*base_path*/ ctx[0]}#discuss/${convert_to_hash(/*item*/ ctx[15].title)}`)) {
    				attr_dev(a1, "href", a1_href_value);
    			}

    			if (dirty & /*filtered*/ 16) {
    				select_option(select, /*item*/ ctx[15].emoji_mark);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(tr);
    			if (if_block) if_block.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(113:4) {#each filtered as item}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let div3;
    	let h1;
    	let t1;
    	let div0;
    	let input;
    	let t2;
    	let t3;
    	let div2;
    	let div1;
    	let span;
    	let t5;
    	let table;
    	let tr;
    	let th0;
    	let t7;
    	let th1;
    	let t9;
    	let th2;
    	let t11;
    	let th3;
    	let t13;
    	let th4;
    	let t15;
    	let th5;
    	let t17;
    	let t18;
    	let a0;
    	let t20;
    	let a1;
    	let t22;
    	let a2;
    	let mounted;
    	let dispose;

    	function select_block_type(ctx, dirty) {
    		if (/*server_save_cache*/ ctx[1]) return create_if_block_1;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);
    	let each_value = /*filtered*/ ctx[4];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div3 = element("div");
    			h1 = element("h1");
    			h1.textContent = `${COURSE_NAME}`;
    			t1 = space();
    			div0 = element("div");
    			input = element("input");
    			t2 = space();
    			if_block.c();
    			t3 = space();
    			div2 = element("div");
    			div1 = element("div");
    			span = element("span");
    			span.textContent = "×";
    			t5 = space();
    			table = element("table");
    			tr = element("tr");
    			th0 = element("th");
    			th0.textContent = "#";
    			t7 = space();
    			th1 = element("th");
    			th1.textContent = "Title";
    			t9 = space();
    			th2 = element("th");
    			th2.textContent = "Progress";
    			t11 = space();
    			th3 = element("th");
    			th3.textContent = "Resources";
    			t13 = space();
    			th4 = element("th");
    			th4.textContent = "Discuss";
    			t15 = space();
    			th5 = element("th");
    			th5.textContent = "Mark";
    			t17 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t18 = space();
    			a0 = element("a");
    			a0.textContent = "Source Code v0.0.4";
    			t20 = text("\n  |\n  ");
    			a1 = element("a");
    			a1.textContent = "Support my work on Patreon!";
    			t22 = text("\n  | ");
    			a2 = element("a");
    			a2.textContent = "Other courses";
    			add_location(h1, file$2, 50, 2, 1454);
    			attr_dev(input, "type", "text");
    			attr_dev(input, "placeholder", "Search");
    			add_location(input, file$2, 52, 4, 1506);
    			attr_dev(div0, "class", "main-bar svelte-7dmpn5");
    			add_location(div0, file$2, 51, 2, 1479);
    			attr_dev(span, "class", "close svelte-7dmpn5");
    			add_location(span, file$2, 93, 6, 2872);
    			attr_dev(div1, "class", "modal-content svelte-7dmpn5");
    			attr_dev(div1, "id", "m-content");
    			add_location(div1, file$2, 92, 4, 2823);
    			attr_dev(div2, "id", "resources-modal");
    			attr_dev(div2, "class", "modal svelte-7dmpn5");
    			add_location(div2, file$2, 91, 2, 2778);
    			attr_dev(th0, "scope", "col");
    			add_location(th0, file$2, 104, 6, 3110);
    			attr_dev(th1, "scope", "col");
    			add_location(th1, file$2, 105, 6, 3139);
    			attr_dev(th2, "scope", "col");
    			add_location(th2, file$2, 106, 6, 3172);
    			attr_dev(th3, "scope", "col");
    			add_location(th3, file$2, 107, 6, 3208);
    			attr_dev(th4, "scope", "col");
    			add_location(th4, file$2, 108, 6, 3245);
    			attr_dev(th5, "scope", "col");
    			add_location(th5, file$2, 109, 6, 3280);
    			add_location(tr, file$2, 103, 4, 3099);
    			add_location(table, file$2, 102, 2, 3087);
    			attr_dev(a0, "href", "https://github.com/jestarray/jestlearn");
    			add_location(a0, file$2, 165, 2, 5069);
    			attr_dev(a1, "href", "https://www.patreon.com/jestarray/");
    			add_location(a1, file$2, 167, 2, 5147);
    			attr_dev(a2, "href", "https://www.jestlearn.com/");
    			add_location(a2, file$2, 168, 4, 5228);
    			add_location(div3, file$2, 49, 0, 1446);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div3, anchor);
    			append_dev(div3, h1);
    			append_dev(div3, t1);
    			append_dev(div3, div0);
    			append_dev(div0, input);
    			set_input_value(input, /*search_text*/ ctx[2]);
    			append_dev(div0, t2);
    			if_block.m(div0, null);
    			append_dev(div3, t3);
    			append_dev(div3, div2);
    			append_dev(div2, div1);
    			append_dev(div1, span);
    			append_dev(div3, t5);
    			append_dev(div3, table);
    			append_dev(table, tr);
    			append_dev(tr, th0);
    			append_dev(tr, t7);
    			append_dev(tr, th1);
    			append_dev(tr, t9);
    			append_dev(tr, th2);
    			append_dev(tr, t11);
    			append_dev(tr, th3);
    			append_dev(tr, t13);
    			append_dev(tr, th4);
    			append_dev(tr, t15);
    			append_dev(tr, th5);
    			append_dev(table, t17);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(table, null);
    			}

    			append_dev(div3, t18);
    			append_dev(div3, a0);
    			append_dev(div3, t20);
    			append_dev(div3, a1);
    			append_dev(div3, t22);
    			append_dev(div3, a2);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "input", /*input_input_handler*/ ctx[7]),
    					listen_dev(span, "click", /*click_handler_2*/ ctx[11], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*search_text*/ 4 && input.value !== /*search_text*/ ctx[2]) {
    				set_input_value(input, /*search_text*/ ctx[2]);
    			}

    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(div0, null);
    				}
    			}

    			if (dirty & /*filtered, Date, dispatch, Sync, base_path, convert_to_hash, document, calculate_progress*/ 49) {
    				each_value = /*filtered*/ ctx[4];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(table, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div3);
    			if_block.d();
    			destroy_each(each_blocks, detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function calculate_progress(progress) {
    	let solved = 0;

    	for (let item of progress) {
    		if (item.result === "✅") {
    			solved++;
    		}
    	}

    	let res = `${solved}/${progress.length}`;
    	return res;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let search_text;
    	let filtered;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Home', slots, []);
    	
    	let { base_path } = $$props;
    	let { merged } = $$props;
    	let { server_save_cache } = $$props;
    	const dispatch = createEventDispatcher();

    	window.onclick = function (event) {
    		var modal = document.getElementById("resources-modal");

    		if (event.target == modal) {
    			modal.style.display = "none";
    		}
    	};

    	let username = "";

    	if (server_save_cache) {
    		username = server_save_cache.username;
    	}

    	const writable_props = ['base_path', 'merged', 'server_save_cache'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1$1.warn(`<Home> was created with unknown prop '${key}'`);
    	});

    	function input_input_handler() {
    		search_text = this.value;
    		$$invalidate(2, search_text);
    	}

    	const click_handler = () => {
    		localStorage.removeItem("save_server");
    		localStorage.removeItem("save");
    		location.reload();
    	};

    	function input_input_handler_1() {
    		username = this.value;
    		$$invalidate(3, username);
    	}

    	const click_handler_1 = function login() {
    		//validate username form
    		if (username.length > 0) {
    			//send the problems worked on to the server
    			send_sync(username.toLowerCase().trim(), TOC, [], Sync.INITIAL).then(data_from_server => {
    				data_from_server.code = Sync.INITIAL;
    				dispatch("save", data_from_server);
    			}).catch(err => {
    				console.warn(err); //force page refresh after save to update the homepage
    				//location.reload();
    			});
    		}
    	};

    	const click_handler_2 = () => {
    		var modal = document.getElementById("resources-modal");
    		modal.style.display = "none";
    	};

    	const click_handler_3 = item => {
    		var modal = document.getElementById("resources-modal");
    		modal.style.display = "block";
    		var modal_content = document.getElementById("m-content");

    		if (item.resources.length > 0) {
    			modal_content.innerHTML = item.resources.map(res => {
    				return `<p>
                  <a href=${res.url} title=${res.url} target="_blank"
                    >${res.url}
                  </a>
                  ${res.additional}
                </p>`;
    			}).reduce((prev, curr) => prev + curr);
    		} else {
    			modal_content.innerHTML = "";
    		}
    	};

    	function select_change_handler(each_value, item_index) {
    		each_value[item_index].emoji_mark = select_value(this);
    		(($$invalidate(4, filtered), $$invalidate(2, search_text)), $$invalidate(6, merged));
    	}

    	const change_handler = (item, each_value, item_index) => {
    		$$invalidate(4, each_value[item_index].last_updated = Date.now(), filtered);
    		dispatch("save", { code: Sync.UPDATE });
    	};

    	$$self.$$set = $$props => {
    		if ('base_path' in $$props) $$invalidate(0, base_path = $$props.base_path);
    		if ('merged' in $$props) $$invalidate(6, merged = $$props.merged);
    		if ('server_save_cache' in $$props) $$invalidate(1, server_save_cache = $$props.server_save_cache);
    	};

    	$$self.$capture_state = () => ({
    		convert_to_hash,
    		TOC,
    		COURSE_NAME,
    		createEventDispatcher,
    		has_started,
    		Sync,
    		send_sync,
    		base_path,
    		merged,
    		server_save_cache,
    		dispatch,
    		calculate_progress,
    		username,
    		search_text,
    		filtered
    	});

    	$$self.$inject_state = $$props => {
    		if ('base_path' in $$props) $$invalidate(0, base_path = $$props.base_path);
    		if ('merged' in $$props) $$invalidate(6, merged = $$props.merged);
    		if ('server_save_cache' in $$props) $$invalidate(1, server_save_cache = $$props.server_save_cache);
    		if ('username' in $$props) $$invalidate(3, username = $$props.username);
    		if ('search_text' in $$props) $$invalidate(2, search_text = $$props.search_text);
    		if ('filtered' in $$props) $$invalidate(4, filtered = $$props.filtered);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*search_text, merged*/ 68) {
    			$$invalidate(4, filtered = search_text.length > 0
    			? merged.filter(item => {
    					let lowercase_search = search_text.toLowerCase();

    					function find_one(arr, search) {
    						for (let item of arr) {
    							if (item.includes(search)) {
    								return true;
    							}
    						}

    						return false;
    					}

    					return item.title.toLowerCase().includes(lowercase_search) || find_one(item.tags, lowercase_search.trim());
    				})
    			: merged);
    		}
    	};

    	$$invalidate(2, search_text = "");

    	return [
    		base_path,
    		server_save_cache,
    		search_text,
    		username,
    		filtered,
    		dispatch,
    		merged,
    		input_input_handler,
    		click_handler,
    		input_input_handler_1,
    		click_handler_1,
    		click_handler_2,
    		click_handler_3,
    		select_change_handler,
    		change_handler
    	];
    }

    class Home extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {
    			base_path: 0,
    			merged: 6,
    			server_save_cache: 1
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Home",
    			options,
    			id: create_fragment$2.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*base_path*/ ctx[0] === undefined && !('base_path' in props)) {
    			console_1$1.warn("<Home> was created without expected prop 'base_path'");
    		}

    		if (/*merged*/ ctx[6] === undefined && !('merged' in props)) {
    			console_1$1.warn("<Home> was created without expected prop 'merged'");
    		}

    		if (/*server_save_cache*/ ctx[1] === undefined && !('server_save_cache' in props)) {
    			console_1$1.warn("<Home> was created without expected prop 'server_save_cache'");
    		}
    	}

    	get base_path() {
    		throw new Error("<Home>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set base_path(value) {
    		throw new Error("<Home>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get merged() {
    		throw new Error("<Home>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set merged(value) {
    		throw new Error("<Home>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get server_save_cache() {
    		throw new Error("<Home>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set server_save_cache(value) {
    		throw new Error("<Home>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    var page = createCommonjsModule(function (module, exports) {
    (function (global, factory) {
    	module.exports = factory() ;
    }(commonjsGlobal, (function () {
    var isarray = Array.isArray || function (arr) {
      return Object.prototype.toString.call(arr) == '[object Array]';
    };

    /**
     * Expose `pathToRegexp`.
     */
    var pathToRegexp_1 = pathToRegexp;
    var parse_1 = parse;
    var compile_1 = compile;
    var tokensToFunction_1 = tokensToFunction;
    var tokensToRegExp_1 = tokensToRegExp;

    /**
     * The main path matching regexp utility.
     *
     * @type {RegExp}
     */
    var PATH_REGEXP = new RegExp([
      // Match escaped characters that would otherwise appear in future matches.
      // This allows the user to escape special characters that won't transform.
      '(\\\\.)',
      // Match Express-style parameters and un-named parameters with a prefix
      // and optional suffixes. Matches appear as:
      //
      // "/:test(\\d+)?" => ["/", "test", "\d+", undefined, "?", undefined]
      // "/route(\\d+)"  => [undefined, undefined, undefined, "\d+", undefined, undefined]
      // "/*"            => ["/", undefined, undefined, undefined, undefined, "*"]
      '([\\/.])?(?:(?:\\:(\\w+)(?:\\(((?:\\\\.|[^()])+)\\))?|\\(((?:\\\\.|[^()])+)\\))([+*?])?|(\\*))'
    ].join('|'), 'g');

    /**
     * Parse a string for the raw tokens.
     *
     * @param  {String} str
     * @return {Array}
     */
    function parse (str) {
      var tokens = [];
      var key = 0;
      var index = 0;
      var path = '';
      var res;

      while ((res = PATH_REGEXP.exec(str)) != null) {
        var m = res[0];
        var escaped = res[1];
        var offset = res.index;
        path += str.slice(index, offset);
        index = offset + m.length;

        // Ignore already escaped sequences.
        if (escaped) {
          path += escaped[1];
          continue
        }

        // Push the current path onto the tokens.
        if (path) {
          tokens.push(path);
          path = '';
        }

        var prefix = res[2];
        var name = res[3];
        var capture = res[4];
        var group = res[5];
        var suffix = res[6];
        var asterisk = res[7];

        var repeat = suffix === '+' || suffix === '*';
        var optional = suffix === '?' || suffix === '*';
        var delimiter = prefix || '/';
        var pattern = capture || group || (asterisk ? '.*' : '[^' + delimiter + ']+?');

        tokens.push({
          name: name || key++,
          prefix: prefix || '',
          delimiter: delimiter,
          optional: optional,
          repeat: repeat,
          pattern: escapeGroup(pattern)
        });
      }

      // Match any characters still remaining.
      if (index < str.length) {
        path += str.substr(index);
      }

      // If the path exists, push it onto the end.
      if (path) {
        tokens.push(path);
      }

      return tokens
    }

    /**
     * Compile a string to a template function for the path.
     *
     * @param  {String}   str
     * @return {Function}
     */
    function compile (str) {
      return tokensToFunction(parse(str))
    }

    /**
     * Expose a method for transforming tokens into the path function.
     */
    function tokensToFunction (tokens) {
      // Compile all the tokens into regexps.
      var matches = new Array(tokens.length);

      // Compile all the patterns before compilation.
      for (var i = 0; i < tokens.length; i++) {
        if (typeof tokens[i] === 'object') {
          matches[i] = new RegExp('^' + tokens[i].pattern + '$');
        }
      }

      return function (obj) {
        var path = '';
        var data = obj || {};

        for (var i = 0; i < tokens.length; i++) {
          var token = tokens[i];

          if (typeof token === 'string') {
            path += token;

            continue
          }

          var value = data[token.name];
          var segment;

          if (value == null) {
            if (token.optional) {
              continue
            } else {
              throw new TypeError('Expected "' + token.name + '" to be defined')
            }
          }

          if (isarray(value)) {
            if (!token.repeat) {
              throw new TypeError('Expected "' + token.name + '" to not repeat, but received "' + value + '"')
            }

            if (value.length === 0) {
              if (token.optional) {
                continue
              } else {
                throw new TypeError('Expected "' + token.name + '" to not be empty')
              }
            }

            for (var j = 0; j < value.length; j++) {
              segment = encodeURIComponent(value[j]);

              if (!matches[i].test(segment)) {
                throw new TypeError('Expected all "' + token.name + '" to match "' + token.pattern + '", but received "' + segment + '"')
              }

              path += (j === 0 ? token.prefix : token.delimiter) + segment;
            }

            continue
          }

          segment = encodeURIComponent(value);

          if (!matches[i].test(segment)) {
            throw new TypeError('Expected "' + token.name + '" to match "' + token.pattern + '", but received "' + segment + '"')
          }

          path += token.prefix + segment;
        }

        return path
      }
    }

    /**
     * Escape a regular expression string.
     *
     * @param  {String} str
     * @return {String}
     */
    function escapeString (str) {
      return str.replace(/([.+*?=^!:${}()[\]|\/])/g, '\\$1')
    }

    /**
     * Escape the capturing group by escaping special characters and meaning.
     *
     * @param  {String} group
     * @return {String}
     */
    function escapeGroup (group) {
      return group.replace(/([=!:$\/()])/g, '\\$1')
    }

    /**
     * Attach the keys as a property of the regexp.
     *
     * @param  {RegExp} re
     * @param  {Array}  keys
     * @return {RegExp}
     */
    function attachKeys (re, keys) {
      re.keys = keys;
      return re
    }

    /**
     * Get the flags for a regexp from the options.
     *
     * @param  {Object} options
     * @return {String}
     */
    function flags (options) {
      return options.sensitive ? '' : 'i'
    }

    /**
     * Pull out keys from a regexp.
     *
     * @param  {RegExp} path
     * @param  {Array}  keys
     * @return {RegExp}
     */
    function regexpToRegexp (path, keys) {
      // Use a negative lookahead to match only capturing groups.
      var groups = path.source.match(/\((?!\?)/g);

      if (groups) {
        for (var i = 0; i < groups.length; i++) {
          keys.push({
            name: i,
            prefix: null,
            delimiter: null,
            optional: false,
            repeat: false,
            pattern: null
          });
        }
      }

      return attachKeys(path, keys)
    }

    /**
     * Transform an array into a regexp.
     *
     * @param  {Array}  path
     * @param  {Array}  keys
     * @param  {Object} options
     * @return {RegExp}
     */
    function arrayToRegexp (path, keys, options) {
      var parts = [];

      for (var i = 0; i < path.length; i++) {
        parts.push(pathToRegexp(path[i], keys, options).source);
      }

      var regexp = new RegExp('(?:' + parts.join('|') + ')', flags(options));

      return attachKeys(regexp, keys)
    }

    /**
     * Create a path regexp from string input.
     *
     * @param  {String} path
     * @param  {Array}  keys
     * @param  {Object} options
     * @return {RegExp}
     */
    function stringToRegexp (path, keys, options) {
      var tokens = parse(path);
      var re = tokensToRegExp(tokens, options);

      // Attach keys back to the regexp.
      for (var i = 0; i < tokens.length; i++) {
        if (typeof tokens[i] !== 'string') {
          keys.push(tokens[i]);
        }
      }

      return attachKeys(re, keys)
    }

    /**
     * Expose a function for taking tokens and returning a RegExp.
     *
     * @param  {Array}  tokens
     * @param  {Array}  keys
     * @param  {Object} options
     * @return {RegExp}
     */
    function tokensToRegExp (tokens, options) {
      options = options || {};

      var strict = options.strict;
      var end = options.end !== false;
      var route = '';
      var lastToken = tokens[tokens.length - 1];
      var endsWithSlash = typeof lastToken === 'string' && /\/$/.test(lastToken);

      // Iterate over the tokens and create our regexp string.
      for (var i = 0; i < tokens.length; i++) {
        var token = tokens[i];

        if (typeof token === 'string') {
          route += escapeString(token);
        } else {
          var prefix = escapeString(token.prefix);
          var capture = token.pattern;

          if (token.repeat) {
            capture += '(?:' + prefix + capture + ')*';
          }

          if (token.optional) {
            if (prefix) {
              capture = '(?:' + prefix + '(' + capture + '))?';
            } else {
              capture = '(' + capture + ')?';
            }
          } else {
            capture = prefix + '(' + capture + ')';
          }

          route += capture;
        }
      }

      // In non-strict mode we allow a slash at the end of match. If the path to
      // match already ends with a slash, we remove it for consistency. The slash
      // is valid at the end of a path match, not in the middle. This is important
      // in non-ending mode, where "/test/" shouldn't match "/test//route".
      if (!strict) {
        route = (endsWithSlash ? route.slice(0, -2) : route) + '(?:\\/(?=$))?';
      }

      if (end) {
        route += '$';
      } else {
        // In non-ending mode, we need the capturing groups to match as much as
        // possible by using a positive lookahead to the end or next path segment.
        route += strict && endsWithSlash ? '' : '(?=\\/|$)';
      }

      return new RegExp('^' + route, flags(options))
    }

    /**
     * Normalize the given path string, returning a regular expression.
     *
     * An empty array can be passed in for the keys, which will hold the
     * placeholder key descriptions. For example, using `/user/:id`, `keys` will
     * contain `[{ name: 'id', delimiter: '/', optional: false, repeat: false }]`.
     *
     * @param  {(String|RegExp|Array)} path
     * @param  {Array}                 [keys]
     * @param  {Object}                [options]
     * @return {RegExp}
     */
    function pathToRegexp (path, keys, options) {
      keys = keys || [];

      if (!isarray(keys)) {
        options = keys;
        keys = [];
      } else if (!options) {
        options = {};
      }

      if (path instanceof RegExp) {
        return regexpToRegexp(path, keys)
      }

      if (isarray(path)) {
        return arrayToRegexp(path, keys, options)
      }

      return stringToRegexp(path, keys, options)
    }

    pathToRegexp_1.parse = parse_1;
    pathToRegexp_1.compile = compile_1;
    pathToRegexp_1.tokensToFunction = tokensToFunction_1;
    pathToRegexp_1.tokensToRegExp = tokensToRegExp_1;

    /**
       * Module dependencies.
       */

      

      /**
       * Short-cuts for global-object checks
       */

      var hasDocument = ('undefined' !== typeof document);
      var hasWindow = ('undefined' !== typeof window);
      var hasHistory = ('undefined' !== typeof history);
      var hasProcess = typeof process !== 'undefined';

      /**
       * Detect click event
       */
      var clickEvent = hasDocument && document.ontouchstart ? 'touchstart' : 'click';

      /**
       * To work properly with the URL
       * history.location generated polyfill in https://github.com/devote/HTML5-History-API
       */

      var isLocation = hasWindow && !!(window.history.location || window.location);

      /**
       * The page instance
       * @api private
       */
      function Page() {
        // public things
        this.callbacks = [];
        this.exits = [];
        this.current = '';
        this.len = 0;

        // private things
        this._decodeURLComponents = true;
        this._base = '';
        this._strict = false;
        this._running = false;
        this._hashbang = false;

        // bound functions
        this.clickHandler = this.clickHandler.bind(this);
        this._onpopstate = this._onpopstate.bind(this);
      }

      /**
       * Configure the instance of page. This can be called multiple times.
       *
       * @param {Object} options
       * @api public
       */

      Page.prototype.configure = function(options) {
        var opts = options || {};

        this._window = opts.window || (hasWindow && window);
        this._decodeURLComponents = opts.decodeURLComponents !== false;
        this._popstate = opts.popstate !== false && hasWindow;
        this._click = opts.click !== false && hasDocument;
        this._hashbang = !!opts.hashbang;

        var _window = this._window;
        if(this._popstate) {
          _window.addEventListener('popstate', this._onpopstate, false);
        } else if(hasWindow) {
          _window.removeEventListener('popstate', this._onpopstate, false);
        }

        if (this._click) {
          _window.document.addEventListener(clickEvent, this.clickHandler, false);
        } else if(hasDocument) {
          _window.document.removeEventListener(clickEvent, this.clickHandler, false);
        }

        if(this._hashbang && hasWindow && !hasHistory) {
          _window.addEventListener('hashchange', this._onpopstate, false);
        } else if(hasWindow) {
          _window.removeEventListener('hashchange', this._onpopstate, false);
        }
      };

      /**
       * Get or set basepath to `path`.
       *
       * @param {string} path
       * @api public
       */

      Page.prototype.base = function(path) {
        if (0 === arguments.length) return this._base;
        this._base = path;
      };

      /**
       * Gets the `base`, which depends on whether we are using History or
       * hashbang routing.

       * @api private
       */
      Page.prototype._getBase = function() {
        var base = this._base;
        if(!!base) return base;
        var loc = hasWindow && this._window && this._window.location;

        if(hasWindow && this._hashbang && loc && loc.protocol === 'file:') {
          base = loc.pathname;
        }

        return base;
      };

      /**
       * Get or set strict path matching to `enable`
       *
       * @param {boolean} enable
       * @api public
       */

      Page.prototype.strict = function(enable) {
        if (0 === arguments.length) return this._strict;
        this._strict = enable;
      };


      /**
       * Bind with the given `options`.
       *
       * Options:
       *
       *    - `click` bind to click events [true]
       *    - `popstate` bind to popstate [true]
       *    - `dispatch` perform initial dispatch [true]
       *
       * @param {Object} options
       * @api public
       */

      Page.prototype.start = function(options) {
        var opts = options || {};
        this.configure(opts);

        if (false === opts.dispatch) return;
        this._running = true;

        var url;
        if(isLocation) {
          var window = this._window;
          var loc = window.location;

          if(this._hashbang && ~loc.hash.indexOf('#!')) {
            url = loc.hash.substr(2) + loc.search;
          } else if (this._hashbang) {
            url = loc.search + loc.hash;
          } else {
            url = loc.pathname + loc.search + loc.hash;
          }
        }

        this.replace(url, null, true, opts.dispatch);
      };

      /**
       * Unbind click and popstate event handlers.
       *
       * @api public
       */

      Page.prototype.stop = function() {
        if (!this._running) return;
        this.current = '';
        this.len = 0;
        this._running = false;

        var window = this._window;
        this._click && window.document.removeEventListener(clickEvent, this.clickHandler, false);
        hasWindow && window.removeEventListener('popstate', this._onpopstate, false);
        hasWindow && window.removeEventListener('hashchange', this._onpopstate, false);
      };

      /**
       * Show `path` with optional `state` object.
       *
       * @param {string} path
       * @param {Object=} state
       * @param {boolean=} dispatch
       * @param {boolean=} push
       * @return {!Context}
       * @api public
       */

      Page.prototype.show = function(path, state, dispatch, push) {
        var ctx = new Context(path, state, this),
          prev = this.prevContext;
        this.prevContext = ctx;
        this.current = ctx.path;
        if (false !== dispatch) this.dispatch(ctx, prev);
        if (false !== ctx.handled && false !== push) ctx.pushState();
        return ctx;
      };

      /**
       * Goes back in the history
       * Back should always let the current route push state and then go back.
       *
       * @param {string} path - fallback path to go back if no more history exists, if undefined defaults to page.base
       * @param {Object=} state
       * @api public
       */

      Page.prototype.back = function(path, state) {
        var page = this;
        if (this.len > 0) {
          var window = this._window;
          // this may need more testing to see if all browsers
          // wait for the next tick to go back in history
          hasHistory && window.history.back();
          this.len--;
        } else if (path) {
          setTimeout(function() {
            page.show(path, state);
          });
        } else {
          setTimeout(function() {
            page.show(page._getBase(), state);
          });
        }
      };

      /**
       * Register route to redirect from one path to other
       * or just redirect to another route
       *
       * @param {string} from - if param 'to' is undefined redirects to 'from'
       * @param {string=} to
       * @api public
       */
      Page.prototype.redirect = function(from, to) {
        var inst = this;

        // Define route from a path to another
        if ('string' === typeof from && 'string' === typeof to) {
          page.call(this, from, function(e) {
            setTimeout(function() {
              inst.replace(/** @type {!string} */ (to));
            }, 0);
          });
        }

        // Wait for the push state and replace it with another
        if ('string' === typeof from && 'undefined' === typeof to) {
          setTimeout(function() {
            inst.replace(from);
          }, 0);
        }
      };

      /**
       * Replace `path` with optional `state` object.
       *
       * @param {string} path
       * @param {Object=} state
       * @param {boolean=} init
       * @param {boolean=} dispatch
       * @return {!Context}
       * @api public
       */


      Page.prototype.replace = function(path, state, init, dispatch) {
        var ctx = new Context(path, state, this),
          prev = this.prevContext;
        this.prevContext = ctx;
        this.current = ctx.path;
        ctx.init = init;
        ctx.save(); // save before dispatching, which may redirect
        if (false !== dispatch) this.dispatch(ctx, prev);
        return ctx;
      };

      /**
       * Dispatch the given `ctx`.
       *
       * @param {Context} ctx
       * @api private
       */

      Page.prototype.dispatch = function(ctx, prev) {
        var i = 0, j = 0, page = this;

        function nextExit() {
          var fn = page.exits[j++];
          if (!fn) return nextEnter();
          fn(prev, nextExit);
        }

        function nextEnter() {
          var fn = page.callbacks[i++];

          if (ctx.path !== page.current) {
            ctx.handled = false;
            return;
          }
          if (!fn) return unhandled.call(page, ctx);
          fn(ctx, nextEnter);
        }

        if (prev) {
          nextExit();
        } else {
          nextEnter();
        }
      };

      /**
       * Register an exit route on `path` with
       * callback `fn()`, which will be called
       * on the previous context when a new
       * page is visited.
       */
      Page.prototype.exit = function(path, fn) {
        if (typeof path === 'function') {
          return this.exit('*', path);
        }

        var route = new Route(path, null, this);
        for (var i = 1; i < arguments.length; ++i) {
          this.exits.push(route.middleware(arguments[i]));
        }
      };

      /**
       * Handle "click" events.
       */

      /* jshint +W054 */
      Page.prototype.clickHandler = function(e) {
        if (1 !== this._which(e)) return;

        if (e.metaKey || e.ctrlKey || e.shiftKey) return;
        if (e.defaultPrevented) return;

        // ensure link
        // use shadow dom when available if not, fall back to composedPath()
        // for browsers that only have shady
        var el = e.target;
        var eventPath = e.path || (e.composedPath ? e.composedPath() : null);

        if(eventPath) {
          for (var i = 0; i < eventPath.length; i++) {
            if (!eventPath[i].nodeName) continue;
            if (eventPath[i].nodeName.toUpperCase() !== 'A') continue;
            if (!eventPath[i].href) continue;

            el = eventPath[i];
            break;
          }
        }

        // continue ensure link
        // el.nodeName for svg links are 'a' instead of 'A'
        while (el && 'A' !== el.nodeName.toUpperCase()) el = el.parentNode;
        if (!el || 'A' !== el.nodeName.toUpperCase()) return;

        // check if link is inside an svg
        // in this case, both href and target are always inside an object
        var svg = (typeof el.href === 'object') && el.href.constructor.name === 'SVGAnimatedString';

        // Ignore if tag has
        // 1. "download" attribute
        // 2. rel="external" attribute
        if (el.hasAttribute('download') || el.getAttribute('rel') === 'external') return;

        // ensure non-hash for the same path
        var link = el.getAttribute('href');
        if(!this._hashbang && this._samePath(el) && (el.hash || '#' === link)) return;

        // Check for mailto: in the href
        if (link && link.indexOf('mailto:') > -1) return;

        // check target
        // svg target is an object and its desired value is in .baseVal property
        if (svg ? el.target.baseVal : el.target) return;

        // x-origin
        // note: svg links that are not relative don't call click events (and skip page.js)
        // consequently, all svg links tested inside page.js are relative and in the same origin
        if (!svg && !this.sameOrigin(el.href)) return;

        // rebuild path
        // There aren't .pathname and .search properties in svg links, so we use href
        // Also, svg href is an object and its desired value is in .baseVal property
        var path = svg ? el.href.baseVal : (el.pathname + el.search + (el.hash || ''));

        path = path[0] !== '/' ? '/' + path : path;

        // strip leading "/[drive letter]:" on NW.js on Windows
        if (hasProcess && path.match(/^\/[a-zA-Z]:\//)) {
          path = path.replace(/^\/[a-zA-Z]:\//, '/');
        }

        // same page
        var orig = path;
        var pageBase = this._getBase();

        if (path.indexOf(pageBase) === 0) {
          path = path.substr(pageBase.length);
        }

        if (this._hashbang) path = path.replace('#!', '');

        if (pageBase && orig === path && (!isLocation || this._window.location.protocol !== 'file:')) {
          return;
        }

        e.preventDefault();
        this.show(orig);
      };

      /**
       * Handle "populate" events.
       * @api private
       */

      Page.prototype._onpopstate = (function () {
        var loaded = false;
        if ( ! hasWindow ) {
          return function () {};
        }
        if (hasDocument && document.readyState === 'complete') {
          loaded = true;
        } else {
          window.addEventListener('load', function() {
            setTimeout(function() {
              loaded = true;
            }, 0);
          });
        }
        return function onpopstate(e) {
          if (!loaded) return;
          var page = this;
          if (e.state) {
            var path = e.state.path;
            page.replace(path, e.state);
          } else if (isLocation) {
            var loc = page._window.location;
            page.show(loc.pathname + loc.search + loc.hash, undefined, undefined, false);
          }
        };
      })();

      /**
       * Event button.
       */
      Page.prototype._which = function(e) {
        e = e || (hasWindow && this._window.event);
        return null == e.which ? e.button : e.which;
      };

      /**
       * Convert to a URL object
       * @api private
       */
      Page.prototype._toURL = function(href) {
        var window = this._window;
        if(typeof URL === 'function' && isLocation) {
          return new URL(href, window.location.toString());
        } else if (hasDocument) {
          var anc = window.document.createElement('a');
          anc.href = href;
          return anc;
        }
      };

      /**
       * Check if `href` is the same origin.
       * @param {string} href
       * @api public
       */
      Page.prototype.sameOrigin = function(href) {
        if(!href || !isLocation) return false;

        var url = this._toURL(href);
        var window = this._window;

        var loc = window.location;

        /*
           When the port is the default http port 80 for http, or 443 for
           https, internet explorer 11 returns an empty string for loc.port,
           so we need to compare loc.port with an empty string if url.port
           is the default port 80 or 443.
           Also the comparition with `port` is changed from `===` to `==` because
           `port` can be a string sometimes. This only applies to ie11.
        */
        return loc.protocol === url.protocol &&
          loc.hostname === url.hostname &&
          (loc.port === url.port || loc.port === '' && (url.port == 80 || url.port == 443)); // jshint ignore:line
      };

      /**
       * @api private
       */
      Page.prototype._samePath = function(url) {
        if(!isLocation) return false;
        var window = this._window;
        var loc = window.location;
        return url.pathname === loc.pathname &&
          url.search === loc.search;
      };

      /**
       * Remove URL encoding from the given `str`.
       * Accommodates whitespace in both x-www-form-urlencoded
       * and regular percent-encoded form.
       *
       * @param {string} val - URL component to decode
       * @api private
       */
      Page.prototype._decodeURLEncodedURIComponent = function(val) {
        if (typeof val !== 'string') { return val; }
        return this._decodeURLComponents ? decodeURIComponent(val.replace(/\+/g, ' ')) : val;
      };

      /**
       * Create a new `page` instance and function
       */
      function createPage() {
        var pageInstance = new Page();

        function pageFn(/* args */) {
          return page.apply(pageInstance, arguments);
        }

        // Copy all of the things over. In 2.0 maybe we use setPrototypeOf
        pageFn.callbacks = pageInstance.callbacks;
        pageFn.exits = pageInstance.exits;
        pageFn.base = pageInstance.base.bind(pageInstance);
        pageFn.strict = pageInstance.strict.bind(pageInstance);
        pageFn.start = pageInstance.start.bind(pageInstance);
        pageFn.stop = pageInstance.stop.bind(pageInstance);
        pageFn.show = pageInstance.show.bind(pageInstance);
        pageFn.back = pageInstance.back.bind(pageInstance);
        pageFn.redirect = pageInstance.redirect.bind(pageInstance);
        pageFn.replace = pageInstance.replace.bind(pageInstance);
        pageFn.dispatch = pageInstance.dispatch.bind(pageInstance);
        pageFn.exit = pageInstance.exit.bind(pageInstance);
        pageFn.configure = pageInstance.configure.bind(pageInstance);
        pageFn.sameOrigin = pageInstance.sameOrigin.bind(pageInstance);
        pageFn.clickHandler = pageInstance.clickHandler.bind(pageInstance);

        pageFn.create = createPage;

        Object.defineProperty(pageFn, 'len', {
          get: function(){
            return pageInstance.len;
          },
          set: function(val) {
            pageInstance.len = val;
          }
        });

        Object.defineProperty(pageFn, 'current', {
          get: function(){
            return pageInstance.current;
          },
          set: function(val) {
            pageInstance.current = val;
          }
        });

        // In 2.0 these can be named exports
        pageFn.Context = Context;
        pageFn.Route = Route;

        return pageFn;
      }

      /**
       * Register `path` with callback `fn()`,
       * or route `path`, or redirection,
       * or `page.start()`.
       *
       *   page(fn);
       *   page('*', fn);
       *   page('/user/:id', load, user);
       *   page('/user/' + user.id, { some: 'thing' });
       *   page('/user/' + user.id);
       *   page('/from', '/to')
       *   page();
       *
       * @param {string|!Function|!Object} path
       * @param {Function=} fn
       * @api public
       */

      function page(path, fn) {
        // <callback>
        if ('function' === typeof path) {
          return page.call(this, '*', path);
        }

        // route <path> to <callback ...>
        if ('function' === typeof fn) {
          var route = new Route(/** @type {string} */ (path), null, this);
          for (var i = 1; i < arguments.length; ++i) {
            this.callbacks.push(route.middleware(arguments[i]));
          }
          // show <path> with [state]
        } else if ('string' === typeof path) {
          this['string' === typeof fn ? 'redirect' : 'show'](path, fn);
          // start [options]
        } else {
          this.start(path);
        }
      }

      /**
       * Unhandled `ctx`. When it's not the initial
       * popstate then redirect. If you wish to handle
       * 404s on your own use `page('*', callback)`.
       *
       * @param {Context} ctx
       * @api private
       */
      function unhandled(ctx) {
        if (ctx.handled) return;
        var current;
        var page = this;
        var window = page._window;

        if (page._hashbang) {
          current = isLocation && this._getBase() + window.location.hash.replace('#!', '');
        } else {
          current = isLocation && window.location.pathname + window.location.search;
        }

        if (current === ctx.canonicalPath) return;
        page.stop();
        ctx.handled = false;
        isLocation && (window.location.href = ctx.canonicalPath);
      }

      /**
       * Escapes RegExp characters in the given string.
       *
       * @param {string} s
       * @api private
       */
      function escapeRegExp(s) {
        return s.replace(/([.+*?=^!:${}()[\]|/\\])/g, '\\$1');
      }

      /**
       * Initialize a new "request" `Context`
       * with the given `path` and optional initial `state`.
       *
       * @constructor
       * @param {string} path
       * @param {Object=} state
       * @api public
       */

      function Context(path, state, pageInstance) {
        var _page = this.page = pageInstance || page;
        var window = _page._window;
        var hashbang = _page._hashbang;

        var pageBase = _page._getBase();
        if ('/' === path[0] && 0 !== path.indexOf(pageBase)) path = pageBase + (hashbang ? '#!' : '') + path;
        var i = path.indexOf('?');

        this.canonicalPath = path;
        var re = new RegExp('^' + escapeRegExp(pageBase));
        this.path = path.replace(re, '') || '/';
        if (hashbang) this.path = this.path.replace('#!', '') || '/';

        this.title = (hasDocument && window.document.title);
        this.state = state || {};
        this.state.path = path;
        this.querystring = ~i ? _page._decodeURLEncodedURIComponent(path.slice(i + 1)) : '';
        this.pathname = _page._decodeURLEncodedURIComponent(~i ? path.slice(0, i) : path);
        this.params = {};

        // fragment
        this.hash = '';
        if (!hashbang) {
          if (!~this.path.indexOf('#')) return;
          var parts = this.path.split('#');
          this.path = this.pathname = parts[0];
          this.hash = _page._decodeURLEncodedURIComponent(parts[1]) || '';
          this.querystring = this.querystring.split('#')[0];
        }
      }

      /**
       * Push state.
       *
       * @api private
       */

      Context.prototype.pushState = function() {
        var page = this.page;
        var window = page._window;
        var hashbang = page._hashbang;

        page.len++;
        if (hasHistory) {
            window.history.pushState(this.state, this.title,
              hashbang && this.path !== '/' ? '#!' + this.path : this.canonicalPath);
        }
      };

      /**
       * Save the context state.
       *
       * @api public
       */

      Context.prototype.save = function() {
        var page = this.page;
        if (hasHistory) {
            page._window.history.replaceState(this.state, this.title,
              page._hashbang && this.path !== '/' ? '#!' + this.path : this.canonicalPath);
        }
      };

      /**
       * Initialize `Route` with the given HTTP `path`,
       * and an array of `callbacks` and `options`.
       *
       * Options:
       *
       *   - `sensitive`    enable case-sensitive routes
       *   - `strict`       enable strict matching for trailing slashes
       *
       * @constructor
       * @param {string} path
       * @param {Object=} options
       * @api private
       */

      function Route(path, options, page) {
        var _page = this.page = page || globalPage;
        var opts = options || {};
        opts.strict = opts.strict || _page._strict;
        this.path = (path === '*') ? '(.*)' : path;
        this.method = 'GET';
        this.regexp = pathToRegexp_1(this.path, this.keys = [], opts);
      }

      /**
       * Return route middleware with
       * the given callback `fn()`.
       *
       * @param {Function} fn
       * @return {Function}
       * @api public
       */

      Route.prototype.middleware = function(fn) {
        var self = this;
        return function(ctx, next) {
          if (self.match(ctx.path, ctx.params)) {
            ctx.routePath = self.path;
            return fn(ctx, next);
          }
          next();
        };
      };

      /**
       * Check if this route matches `path`, if so
       * populate `params`.
       *
       * @param {string} path
       * @param {Object} params
       * @return {boolean}
       * @api private
       */

      Route.prototype.match = function(path, params) {
        var keys = this.keys,
          qsIndex = path.indexOf('?'),
          pathname = ~qsIndex ? path.slice(0, qsIndex) : path,
          m = this.regexp.exec(decodeURIComponent(pathname));

        if (!m) return false;

        delete params[0];

        for (var i = 1, len = m.length; i < len; ++i) {
          var key = keys[i - 1];
          var val = this.page._decodeURLEncodedURIComponent(m[i]);
          if (val !== undefined || !(hasOwnProperty.call(params, key.name))) {
            params[key.name] = val;
          }
        }

        return true;
      };


      /**
       * Module exports.
       */

      var globalPage = createPage();
      var page_js = globalPage;
      var default_1 = globalPage;

    page_js.default = default_1;

    return page_js;

    })));
    });

    /* src/Discussions.svelte generated by Svelte v3.42.2 */

    const file$1 = "src/Discussions.svelte";

    function create_fragment$1(ctx) {
    	let title_1;
    	let t0;
    	let t1;
    	let div1;
    	let h1;
    	let t2_value = /*title*/ ctx[0] + " Discussion" + "";
    	let t2;
    	let t3;
    	let p;
    	let t5;
    	let script;
    	let script_src_value;
    	let t6;
    	let div0;

    	const block = {
    		c: function create() {
    			title_1 = element("title");
    			t0 = text(/*title*/ ctx[0]);
    			t1 = space();
    			div1 = element("div");
    			h1 = element("h1");
    			t2 = text(t2_value);
    			t3 = space();
    			p = element("p");
    			p.textContent = "Ask questions, suggest improvements, etc";
    			t5 = space();
    			script = element("script");
    			t6 = space();
    			div0 = element("div");
    			add_location(title_1, file$1, 4, 0, 40);
    			add_location(h1, file$1, 6, 2, 90);
    			add_location(p, file$1, 7, 2, 125);
    			if (!src_url_equal(script.src, script_src_value = "https://utteranc.es/client.js")) attr_dev(script, "src", script_src_value);
    			attr_dev(script, "repo", "jestarray/jestlearn");
    			attr_dev(script, "issue-term", "title");
    			attr_dev(script, "theme", "github-light");
    			attr_dev(script, "crossorigin", "anonymous");
    			script.async = true;
    			add_location(script, file$1, 8, 2, 175);
    			attr_dev(div0, "class", "utterance-frame");
    			add_location(div0, file$1, 16, 2, 355);
    			attr_dev(div1, "class", "utterances");
    			add_location(div1, file$1, 5, 0, 63);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, title_1, anchor);
    			append_dev(title_1, t0);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, div1, anchor);
    			append_dev(div1, h1);
    			append_dev(h1, t2);
    			append_dev(div1, t3);
    			append_dev(div1, p);
    			append_dev(div1, t5);
    			append_dev(div1, script);
    			append_dev(div1, t6);
    			append_dev(div1, div0);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*title*/ 1) set_data_dev(t0, /*title*/ ctx[0]);
    			if (dirty & /*title*/ 1 && t2_value !== (t2_value = /*title*/ ctx[0] + " Discussion" + "")) set_data_dev(t2, t2_value);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(title_1);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(div1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Discussions', slots, []);
    	let { title } = $$props;
    	const writable_props = ['title'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Discussions> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('title' in $$props) $$invalidate(0, title = $$props.title);
    	};

    	$$self.$capture_state = () => ({ title });

    	$$self.$inject_state = $$props => {
    		if ('title' in $$props) $$invalidate(0, title = $$props.title);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [title];
    }

    class Discussions extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { title: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Discussions",
    			options,
    			id: create_fragment$1.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*title*/ ctx[0] === undefined && !('title' in props)) {
    			console.warn("<Discussions> was created without expected prop 'title'");
    		}
    	}

    	get title() {
    		throw new Error("<Discussions>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set title(value) {
    		throw new Error("<Discussions>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/App.svelte generated by Svelte v3.42.2 */

    const { console: console_1 } = globals;
    const file = "src/App.svelte";

    // (98:0) {#if page !== Home}
    function create_if_block(ctx) {
    	let nav;
    	let a;
    	let t;
    	let a_href_value;

    	const block = {
    		c: function create() {
    			nav = element("nav");
    			a = element("a");
    			t = text("🏠Home");
    			attr_dev(a, "href", a_href_value = `${/*course_base_path*/ ctx[4]}`);
    			add_location(a, file, 99, 4, 4336);
    			attr_dev(nav, "class", "home-alignment svelte-1bnw1jo");
    			add_location(nav, file, 98, 2, 4303);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, nav, anchor);
    			append_dev(nav, a);
    			append_dev(a, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*course_base_path*/ 16 && a_href_value !== (a_href_value = `${/*course_base_path*/ ctx[4]}`)) {
    				attr_dev(a, "href", a_href_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(nav);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(98:0) {#if page !== Home}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let t;
    	let main;
    	let switch_instance;
    	let current;
    	let if_block = /*page*/ ctx[0] !== Home && create_if_block(ctx);
    	var switch_value = /*page*/ ctx[0];

    	function switch_props(ctx) {
    		return {
    			props: {
    				base_path: /*course_base_path*/ ctx[4],
    				title: /*discussion_title*/ ctx[1],
    				data: /*section*/ ctx[2],
    				merged: /*merged*/ ctx[3],
    				server_save_cache: /*server_save_cache*/ ctx[5]
    			},
    			$$inline: true
    		};
    	}

    	if (switch_value) {
    		switch_instance = new switch_value(switch_props(ctx));
    		switch_instance.$on("save", /*save_handler*/ ctx[7]);
    	}

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			t = space();
    			main = element("main");
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			attr_dev(main, "class", "flex-placement svelte-1bnw1jo");
    			add_location(main, file, 103, 0, 4395);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, t, anchor);
    			insert_dev(target, main, anchor);

    			if (switch_instance) {
    				mount_component(switch_instance, main, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*page*/ ctx[0] !== Home) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					if_block.m(t.parentNode, t);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			const switch_instance_changes = {};
    			if (dirty & /*course_base_path*/ 16) switch_instance_changes.base_path = /*course_base_path*/ ctx[4];
    			if (dirty & /*discussion_title*/ 2) switch_instance_changes.title = /*discussion_title*/ ctx[1];
    			if (dirty & /*section*/ 4) switch_instance_changes.data = /*section*/ ctx[2];
    			if (dirty & /*merged*/ 8) switch_instance_changes.merged = /*merged*/ ctx[3];
    			if (dirty & /*server_save_cache*/ 32) switch_instance_changes.server_save_cache = /*server_save_cache*/ ctx[5];

    			if (switch_value !== (switch_value = /*page*/ ctx[0])) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props(ctx));
    					switch_instance.$on("save", /*save_handler*/ ctx[7]);
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, main, null);
    				} else {
    					switch_instance = null;
    				}
    			} else if (switch_value) {
    				switch_instance.$set(switch_instance_changes);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(t);
    			if (detaching) detach_dev(main);
    			if (switch_instance) destroy_component(switch_instance);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function convert_to_title(st) {
    	let words = st.split("_");

    	let upper_cased = words.map(item => {
    		return item.charAt(0).toLocaleUpperCase() + item.slice(1);
    	});

    	let result = upper_cased.reduceRight((item, acc) => {
    		return acc + " " + item;
    	});

    	return result;
    }

    function filter_non_worked_on(arr) {
    	return arr.filter(val => val.last_updated > 0);
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);

    	var __awaiter = this && this.__awaiter || function (thisArg, _arguments, P, generator) {
    		function adopt(value) {
    			return value instanceof P
    			? value
    			: new P(function (resolve) {
    						resolve(value);
    					});
    		}

    		return new (P || (P = Promise))(function (resolve, reject) {
    				function fulfilled(value) {
    					try {
    						step(generator.next(value));
    					} catch(e) {
    						reject(e);
    					}
    				}

    				function rejected(value) {
    					try {
    						step(generator["throw"](value));
    					} catch(e) {
    						reject(e);
    					}
    				}

    				function step(result) {
    					result.done
    					? resolve(result.value)
    					: adopt(result.value).then(fulfilled, rejected);
    				}

    				step((generator = generator.apply(thisArg, _arguments || [])).next());
    			});
    	};

    	let page$1;
    	let discussion_title = "";
    	let section;
    	let merged = TOC;

    	function route_pages(ctx, next) {
    		return __awaiter(this, void 0, void 0, function* () {
    			let hash = ctx.hash;

    			if (hash.includes("discuss")) {
    				$$invalidate(0, page$1 = Discussions);
    				let slash_index = hash.indexOf("/") + 1;
    				let path = hash.slice(slash_index, hash.length);
    				let title = convert_to_title(path);
    				$$invalidate(1, discussion_title = title);
    			} else {
    				//user is on a problem page or the home page
    				// the gen() function was probably not serialized
    				let saved = JSON.parse(localStorage.getItem("save"));

    				if (saved) {
    					$$invalidate(3, merged = merge_back_deleted_props(diff_latest(TOC, saved), TOC));
    					$$invalidate(3, merged);
    				}

    				$$invalidate(2, section = merged.find(item => {
    					return convert_to_hash(item.title) === hash;
    				}));

    				if (section !== undefined) {
    					$$invalidate(0, page$1 = ProblemSet);

    					if (section.problems.length > 0) {
    						// restore from save file
    						$$invalidate(2, section);
    					} else if (section.gen !== undefined) {
    						//if the problem set is randomly generated, generate some problems
    						let generated = yield section.gen();

    						$$invalidate(2, section.problems = generated, section);

    						//re-assign for svelte reactivity or else the UI wont update
    						$$invalidate(2, section);
    					} else {
    						console.warn("should not have gotten here! ");
    						$$invalidate(2, section);
    					}
    				} else {
    					$$invalidate(0, page$1 = Home);
    				}
    			}
    		});
    	}

    	//for when you have a single domain but multiple courses on that domain/server where the vps distributes all the course static files(see server.js), e.g jestlearn.com/computers404 , jestlearn.com/how_to_code , we will attempt to use this instead for the base path. The route below "/" will never run if this is the case
    	let course_base_path = `/${convert_to_hash(COURSE_NAME)}/`;

    	page(`${course_base_path}`, (ctx, next) => {
    		route_pages(ctx);
    	});

    	//if your course is on  a single domain e.g learnhowtocode.com/ hosted on github pages or something, then we will set the base path to /
    	page(`/`, (ctx, next) => {
    		route_pages(ctx);
    		$$invalidate(4, course_base_path = "/");
    	});

    	page("/discuss", () => {
    		$$invalidate(0, page$1 = Discussions);
    	});

    	page.start();
    	let server_save_cache = JSON.parse(localStorage.getItem("save_server"));
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	const save_handler = diff_with => {
    		let server_data = diff_with.detail;

    		if (server_data !== null && server_data.problems !== undefined) {
    			localStorage.setItem("save_server", JSON.stringify(server_data));
    		}

    		$$invalidate(5, server_save_cache = JSON.parse(localStorage.getItem("save_server")));

    		if (server_save_cache !== null) {
    			$$invalidate(3, merged = diff_latest(merged, server_save_cache.problems));

    			if (server_data.code == Sync.ARCHIVE) {
    				console.log("archiving");
    			}

    			//not elseif!
    			if (server_data.code !== Sync.INITIAL) {
    				send_sync(server_save_cache.username, merged, server_save_cache.problems, server_data.code).then(rr => {
    					
    				}).catch(err => {
    					console.warn(err);
    				});
    			}
    		}

    		//merge back the toc tags and stuff
    		$$invalidate(3, merged = merge_back_deleted_props(diff_latest(merged, TOC_original), TOC_original));

    		$$invalidate(3, merged);

    		//todo: dont save the ones that are last_updated 0?
    		localStorage.setItem("save", JSON.stringify(filter_non_worked_on(merged)));

    		//todo: diff with server copy and then upload to server
    		//server should only store old finished attempts for analytics, e.g when the reset button is hit, so need to distuginish
    		console.log("LOG: SAVING");
    	};

    	$$self.$capture_state = () => ({
    		__awaiter,
    		ProblemSet,
    		merge_back_deleted_props,
    		ProblemSetData: ProblemSet$1,
    		Home,
    		Sync,
    		router: page,
    		convert_to_hash,
    		diff_latest,
    		send_sync,
    		TOC,
    		TOC_original,
    		COURSE_NAME,
    		Discussions,
    		convert_to_title,
    		page: page$1,
    		discussion_title,
    		section,
    		merged,
    		route_pages,
    		course_base_path,
    		filter_non_worked_on,
    		server_save_cache
    	});

    	$$self.$inject_state = $$props => {
    		if ('__awaiter' in $$props) __awaiter = $$props.__awaiter;
    		if ('page' in $$props) $$invalidate(0, page$1 = $$props.page);
    		if ('discussion_title' in $$props) $$invalidate(1, discussion_title = $$props.discussion_title);
    		if ('section' in $$props) $$invalidate(2, section = $$props.section);
    		if ('merged' in $$props) $$invalidate(3, merged = $$props.merged);
    		if ('course_base_path' in $$props) $$invalidate(4, course_base_path = $$props.course_base_path);
    		if ('server_save_cache' in $$props) $$invalidate(5, server_save_cache = $$props.server_save_cache);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		page$1,
    		discussion_title,
    		section,
    		merged,
    		course_base_path,
    		server_save_cache,
    		convert_to_title,
    		save_handler
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, { convert_to_title: 6 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}

    	get convert_to_title() {
    		return convert_to_title;
    	}

    	set convert_to_title(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    const app = new App({
        target: document.body,
        props: {
            name: 'world'
        }
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
