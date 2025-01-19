/** @module GUI */

import BooleanController from './BooleanController';
import ColorController from './ColorController';
import FunctionController from './FunctionController';
import NumberController from './NumberController';
import OptionController from './OptionController';
import StringController from './StringController';
import FileController from './FileController';

import stylesheet from 'stylesheet';
import _injectStyles from './utils/injectStyles';

let stylesInjected = false;

export default class GUI {

    /**
     * Creates a panel that holds controllers.
     * @example
     * new GUI();
     * new GUI( { container: document.getElementById( 'custom' ) } );
     *
     * @param {object} [options]
     * @param {boolean} [options.autoPlace=true]
     * Adds the GUI to `document.body` and fixes it to the top right of the page.
     *
     * @param {HTMLElement} [options.container]
     * Adds the GUI to this DOM element. Overrides `autoPlace`.
     *
     * @param {number} [options.width=245]
     * Width of the GUI in pixels, usually set when name labels become too long. Note that you can make
     * name labels wider in CSS with `.lil‑gui { ‑‑name‑width: 55% }`.
     *
     * @param {string} [options.title=Controls]
     * Name to display in the title bar.
     *
     * @param {boolean} [options.closeFolders=false]
     * Pass `true` to close all folders in this GUI by default.
     *
     * @param {boolean} [options.injectStyles=true]
     * Injects the default stylesheet into the page if this is the first GUI.
     * Pass `false` to use your own stylesheet.
     *
     * @param {number} [options.touchStyles=true]
     * Makes controllers larger on touch devices. Pass `false` to disable touch styles.
     *
     * @param {GUI} [options.parent]
     * Adds this GUI as a child in another GUI. Usually this is done for you by `addFolder()`.
     */
    constructor( {
        parent,
        autoPlace = parent === undefined,
        container,
        width,
        title = 'Controls',
        closeFolders = false,
        injectStyles = true,
        touchStyles = true
    } = {} ) {

        this.parent = parent;
        this.root = parent ? parent.root : this;
        this.children = [];
        this.controllers = [];
        this.folders = [];
        this._closed = false;
        this._hidden = false;
        this.domElement = document.createElement( 'div' );
        this.domElement.classList.add( 'lil-gui' );
        this.$title = document.createElement( 'button' );
        this.$title.classList.add( 'title' );
        this.$title.setAttribute( 'aria-expanded', true );
        this.$title.addEventListener( 'click', () => this.openAnimated( this._closed ) );
        this.$title.addEventListener( 'touchstart', () => {}, { passive: true } );
        this.$children = document.createElement( 'div' );
        this.$children.classList.add( 'children' );
        this.domElement.appendChild( this.$title );
        this.domElement.appendChild( this.$children );
        this.title( title );

        if ( this.parent ) {
            this.parent.children.push( this );
            this.parent.folders.push( this );
            this.parent.$children.appendChild( this.domElement );
            return;
        }

        this.domElement.classList.add( 'root' );

        if ( touchStyles ) {
            this.domElement.classList.add( 'allow-touch-styles' );
        }

        if ( !stylesInjected && injectStyles ) {
            _injectStyles( stylesheet );
            stylesInjected = true;
        }

        if ( container ) {
            container.appendChild( this.domElement );
        } else if ( autoPlace ) {
            this.domElement.classList.add( 'autoPlace' );
            document.body.appendChild( this.domElement );
        }

        if ( width ) {
            this.domElement.style.setProperty( '--width', width + 'px' );
        }

        this._closeFolders = closeFolders;

    }

    add( object, property, $1, max, step ) {

        if ( Object( $1 ) === $1 ) {
            return new OptionController( this, object, property, $1 );
        }

        const initialValue = object[ property ];

        switch ( typeof initialValue ) {
            case 'number':
                return new NumberController( this, object, property, $1, max, step );
            case 'boolean':
                return new BooleanController( this, object, property );
            case 'string':
                return new StringController( this, object, property );
            case 'function':
                return new FunctionController( this, object, property );
            case 'upload':
                return new FileController( this, object, property );
        }

        console.error( `gui.add failed\nproperty:`, property, `\nobject:`, object, `\nvalue:`, initialValue );

    }

    addColor( object, property, rgbScale = 1 ) {
        return new ColorController( this, object, property, rgbScale );
    }

    addFolder( title ) {
        const folder = new GUI( { parent: this, title } );
        if ( this.root._closeFolders ) folder.close();
        return folder;
    }

    load( obj, recursive = true ) {
        if ( obj.controllers ) {
            this.controllers.forEach( c => {
                if ( c instanceof FunctionController ) return;
                if ( c._name in obj.controllers ) {
                    c.load( obj.controllers[ c._name ] );
                }
            } );
        }

        if ( recursive && obj.folders ) {
            this.folders.forEach( f => {
                if ( f._title in obj.folders ) {
                    f.load( obj.folders[ f._title ] );
                }
            } );
        }

        return this;
    }

    save( recursive = true ) {
        const obj = {
            controllers: {},
            folders: {}
        };

        this.controllers.forEach( c => {
            if ( c instanceof FunctionController ) return;
            if ( c._name in obj.controllers ) {
                throw new Error( `Cannot save GUI with duplicate property "${c._name}"` );
            }
            obj.controllers[ c._name ] = c.save();
        } );

        if ( recursive ) {
            this.folders.forEach( f => {
                if ( f._title in obj.folders ) {
                    throw new Error( `Cannot save GUI with duplicate folder "${f._title}"` );
                }
                obj.folders[ f._title ] = f.save();
            } );
        }

        return obj;
    }

    open( open = true ) {
        this._setClosed( !open );
        this.$title.setAttribute( 'aria-expanded', !this._closed );
        this.domElement.classList.toggle( 'closed', this._closed );
        return this;
    }

    close() {
        return this.open( false );
    }

    _setClosed( closed ) {
        if ( this._closed === closed ) return;
        this._closed = closed;
        this._callOnOpenClose( this );
    }

    show( show = true ) {
        this._hidden = !show;
        this.domElement.style.display = this._hidden ? 'none' : '';
        return this;
    }

    hide() {
        return this.show( false );
    }

    openAnimated( open = true ) {
        this._setClosed( !open );
        this.$title.setAttribute( 'aria-expanded', !this._closed );
        requestAnimationFrame( () => {
            const initialHeight = this.$children.clientHeight;
            this.$children.style.height = initialHeight + 'px';
            this.domElement.classList.add( 'transition' );

            const onTransitionEnd = e => {
                if ( e.target !== this.$children ) return;
                this.$children.style.height = '';
                this.domElement.classList.remove( 'transition' );
                this.$children.removeEventListener( 'transitionend', onTransitionEnd );
            };

            this.$children.addEventListener( 'transitionend', onTransitionEnd );
            const targetHeight = !open ? 0 : this.$children.scrollHeight;
            this.domElement.classList.toggle( 'closed', !open );

            requestAnimationFrame( () => {
                this.$children.style.height = targetHeight + 'px';
            } );
        } );

        return this;
    }

    title( title ) {
        this._title = title;
        this.$title.textContent = title;
        return this;
    }

	reset( recursive = true ) {
        const controllers = recursive ? this.controllersRecursive() : this.controllers;

        controllers.forEach( controller => {
            controller.reset();
        } );

        if ( recursive ) {
            this.folders.forEach( folder => folder.reset() );
        }

        return this;
    }

    controllersRecursive() {
        let result = this.controllers.slice();
        this.folders.forEach( folder => {
            result = result.concat( folder.controllersRecursive() );
        } );
        return result;
    }

    _callOnOpenClose( gui ) {
        if ( gui._closed ) {
            gui.controllers.forEach( controller => controller.onClose && controller.onClose() );
            gui.folders.forEach( folder => folder._callOnOpenClose( folder ) );
        } else {
            gui.controllers.forEach( controller => controller.onOpen && controller.onOpen() );
            gui.folders.forEach( folder => folder._callOnOpenClose( folder ) );
        }
    }

    destroy() {
        if ( this.parent ) {
            const index = this.parent.folders.indexOf( this );
            if ( index !== -1 ) {
                this.parent.folders.splice( index, 1 );
            }
            this.parent.children.splice( this.parent.children.indexOf( this ), 1 );
        }

        this.domElement.remove();
        this.controllers.forEach( controller => controller.destroy() );
        this.folders.forEach( folder => folder.destroy() );
    }
}
