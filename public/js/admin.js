(function($, undefined) {

/**
 * Unobtrusive scripting adapter for jQuery
 * https://github.com/rails/jquery-ujs
 *
 * Requires jQuery 1.7.0 or later.
 *
 * Released under the MIT license
 *
 */

  // Cut down on the number of issues from people inadvertently including jquery_ujs twice
  // by detecting and raising an error when it happens.
  if ( $.rails !== undefined ) {
    $.error('jquery-ujs has already been loaded!');
  }

  // Shorthand to make it a little easier to call public rails functions from within rails.js
  var rails;

  $.rails = rails = {
    // Link elements bound by jquery-ujs
    linkClickSelector: 'a[data-confirm], a[data-method], a[data-remote], a[data-disable-with]',

    // Button elements boud jquery-ujs
    buttonClickSelector: 'button[data-remote]',

    // Select elements bound by jquery-ujs
    inputChangeSelector: 'select[data-remote], input[data-remote], textarea[data-remote]',

    // Form elements bound by jquery-ujs
    formSubmitSelector: 'form',

    // Form input elements bound by jquery-ujs
    formInputClickSelector: 'form input[type=submit], form input[type=image], form button[type=submit], form button:not([type])',

    // Form input elements disabled during form submission
    disableSelector: 'input[data-disable-with], button[data-disable-with], textarea[data-disable-with]',

    // Form input elements re-enabled after form submission
    enableSelector: 'input[data-disable-with]:disabled, button[data-disable-with]:disabled, textarea[data-disable-with]:disabled',

    // Form required input elements
    requiredInputSelector: 'input[name][required]:not([disabled]),textarea[name][required]:not([disabled])',

    // Form file input elements
    fileInputSelector: 'input[type=file]',

    // Link onClick disable selector with possible reenable after remote submission
    linkDisableSelector: 'a[data-disable-with]',

    // Make sure that every Ajax request sends the CSRF token
    CSRFProtection: function(xhr) {
      var token = $('meta[name="csrf-token"]').attr('content');
      if (token) xhr.setRequestHeader('X-CSRF-Token', token);
    },

    // Triggers an event on an element and returns false if the event result is false
    fire: function(obj, name, data) {
      var event = $.Event(name);
      obj.trigger(event, data);
      return event.result !== false;
    },

    // Default confirm dialog, may be overridden with custom confirm dialog in $.rails.confirm
    confirm: function(message) {
      return confirm(message);
    },

    // Default ajax function, may be overridden with custom function in $.rails.ajax
    ajax: function(options) {
      return $.ajax(options);
    },

    // Default way to get an element's href. May be overridden at $.rails.href.
    href: function(element) {
      return element.attr('href');
    },

    // Submits "remote" forms and links with ajax
    handleRemote: function(element) {
      var method, url, data, elCrossDomain, crossDomain, withCredentials, dataType, options;

      if (rails.fire(element, 'ajax:before')) {
        elCrossDomain = element.data('cross-domain');
        crossDomain = elCrossDomain === undefined ? null : elCrossDomain;
        withCredentials = element.data('with-credentials') || null;
        dataType = element.data('type') || ($.ajaxSettings && $.ajaxSettings.dataType);

        if (element.is('form')) {
          method = element.attr('method');
          url = element.attr('action');
          data = element.serializeArray();
          // memoized value from clicked submit button
          var button = element.data('ujs:submit-button');
          if (button) {
            data.push(button);
            element.data('ujs:submit-button', null);
          }
        } else if (element.is(rails.inputChangeSelector)) {
          method = element.data('method');
          url = element.data('url');
          data = element.serialize();
          if (element.data('params')) data = data + "&" + element.data('params');
        } else if (element.is(rails.buttonClickSelector)) {
          method = element.data('method') || 'get';
          url = element.data('url');
          data = element.serialize();
          if (element.data('params')) data = data + "&" + element.data('params');
        } else {
          method = element.data('method');
          url = rails.href(element);
          data = element.data('params') || null;
        }

        options = {
          type: method || 'GET', data: data, dataType: dataType,
          // stopping the "ajax:beforeSend" event will cancel the ajax request
          beforeSend: function(xhr, settings) {
            if (settings.dataType === undefined) {
              xhr.setRequestHeader('accept', '*/*;q=0.5, ' + settings.accepts.script);
            }
            return rails.fire(element, 'ajax:beforeSend', [xhr, settings]);
          },
          success: function(data, status, xhr) {
            element.trigger('ajax:success', [data, status, xhr]);
          },
          complete: function(xhr, status) {
            element.trigger('ajax:complete', [xhr, status]);
          },
          error: function(xhr, status, error) {
            element.trigger('ajax:error', [xhr, status, error]);
          },
          crossDomain: crossDomain
        };

        // There is no withCredentials for IE6-8 when
        // "Enable native XMLHTTP support" is disabled
        if (withCredentials) {
          options.xhrFields = {
            withCredentials: withCredentials
          };
        }

        // Only pass url to `ajax` options if not blank
        if (url) { options.url = url; }

        var jqxhr = rails.ajax(options);
        element.trigger('ajax:send', jqxhr);
        return jqxhr;
      } else {
        return false;
      }
    },

    // Handles "data-method" on links such as:
    // <a href="/users/5" data-method="delete" rel="nofollow" data-confirm="Are you sure?">Delete</a>
    handleMethod: function(link) {
      var href = rails.href(link),
        method = link.data('method'),
        target = link.attr('target'),
        csrf_token = $('meta[name=csrf-token]').attr('content'),
        csrf_param = $('meta[name=csrf-param]').attr('content'),
        form = $('<form method="post" action="' + href + '"></form>'),
        metadata_input = '<input name="_method" value="' + method + '" type="hidden" />';

      if (csrf_param !== undefined && csrf_token !== undefined) {
        metadata_input += '<input name="' + csrf_param + '" value="' + csrf_token + '" type="hidden" />';
      }

      if (target) { form.attr('target', target); }

      form.hide().append(metadata_input).appendTo('body');
      form.submit();
    },

    /* Disables form elements:
      - Caches element value in 'ujs:enable-with' data store
      - Replaces element text with value of 'data-disable-with' attribute
      - Sets disabled property to true
    */
    disableFormElements: function(form) {
      form.find(rails.disableSelector).each(function() {
        var element = $(this), method = element.is('button') ? 'html' : 'val';
        element.data('ujs:enable-with', element[method]());
        element[method](element.data('disable-with'));
        element.prop('disabled', true);
      });
    },

    /* Re-enables disabled form elements:
      - Replaces element text with cached value from 'ujs:enable-with' data store (created in `disableFormElements`)
      - Sets disabled property to false
    */
    enableFormElements: function(form) {
      form.find(rails.enableSelector).each(function() {
        var element = $(this), method = element.is('button') ? 'html' : 'val';
        if (element.data('ujs:enable-with')) element[method](element.data('ujs:enable-with'));
        element.prop('disabled', false);
      });
    },

   /* For 'data-confirm' attribute:
      - Fires `confirm` event
      - Shows the confirmation dialog
      - Fires the `confirm:complete` event

      Returns `true` if no function stops the chain and user chose yes; `false` otherwise.
      Attaching a handler to the element's `confirm` event that returns a `falsy` value cancels the confirmation dialog.
      Attaching a handler to the element's `confirm:complete` event that returns a `falsy` value makes this function
      return false. The `confirm:complete` event is fired whether or not the user answered true or false to the dialog.
   */
    allowAction: function(element) {
      var message = element.data('confirm'),
          answer = false, callback;
      if (!message) { return true; }

      if (rails.fire(element, 'confirm')) {
        answer = rails.confirm(message);
        callback = rails.fire(element, 'confirm:complete', [answer]);
      }
      return answer && callback;
    },

    // Helper function which checks for blank inputs in a form that match the specified CSS selector
    blankInputs: function(form, specifiedSelector, nonBlank) {
      var inputs = $(), input, valueToCheck,
          selector = specifiedSelector || 'input,textarea',
          allInputs = form.find(selector);

      allInputs.each(function() {
        input = $(this);
        valueToCheck = input.is('input[type=checkbox],input[type=radio]') ? input.is(':checked') : input.val();
        // If nonBlank and valueToCheck are both truthy, or nonBlank and valueToCheck are both falsey
        if (!valueToCheck === !nonBlank) {

          // Don't count unchecked required radio if other radio with same name is checked
          if (input.is('input[type=radio]') && allInputs.filter('input[type=radio]:checked[name="' + input.attr('name') + '"]').length) {
            return true; // Skip to next input
          }

          inputs = inputs.add(input);
        }
      });
      return inputs.length ? inputs : false;
    },

    // Helper function which checks for non-blank inputs in a form that match the specified CSS selector
    nonBlankInputs: function(form, specifiedSelector) {
      return rails.blankInputs(form, specifiedSelector, true); // true specifies nonBlank
    },

    // Helper function, needed to provide consistent behavior in IE
    stopEverything: function(e) {
      $(e.target).trigger('ujs:everythingStopped');
      e.stopImmediatePropagation();
      return false;
    },

    //  replace element's html with the 'data-disable-with' after storing original html
    //  and prevent clicking on it
    disableElement: function(element) {
      element.data('ujs:enable-with', element.html()); // store enabled state
      element.html(element.data('disable-with')); // set to disabled state
      element.bind('click.railsDisable', function(e) { // prevent further clicking
        return rails.stopEverything(e);
      });
    },

    // restore element to its original state which was disabled by 'disableElement' above
    enableElement: function(element) {
      if (element.data('ujs:enable-with') !== undefined) {
        element.html(element.data('ujs:enable-with')); // set to old enabled state
        element.removeData('ujs:enable-with'); // clean up cache
      }
      element.unbind('click.railsDisable'); // enable element
    }

  };

  if (rails.fire($(document), 'rails:attachBindings')) {

    $.ajaxPrefilter(function(options, originalOptions, xhr){ if ( !options.crossDomain ) { rails.CSRFProtection(xhr); }});

    $(document).delegate(rails.linkDisableSelector, 'ajax:complete', function() {
        rails.enableElement($(this));
    });

    $(document).delegate(rails.linkClickSelector, 'click.rails', function(e) {
      var link = $(this), method = link.data('method'), data = link.data('params');
      if (!rails.allowAction(link)) return rails.stopEverything(e);

      if (link.is(rails.linkDisableSelector)) rails.disableElement(link);

      if (link.data('remote') !== undefined) {
        if ( (e.metaKey || e.ctrlKey) && (!method || method === 'GET') && !data ) { return true; }

        var handleRemote = rails.handleRemote(link);
        // response from rails.handleRemote() will either be false or a deferred object promise.
        if (handleRemote === false) {
          rails.enableElement(link);
        } else {
          handleRemote.error( function() { rails.enableElement(link); } );
        }
        return false;

      } else if (link.data('method')) {
        rails.handleMethod(link);
        return false;
      }
    });

    $(document).delegate(rails.buttonClickSelector, 'click.rails', function(e) {
      var button = $(this);
      if (!rails.allowAction(button)) return rails.stopEverything(e);

      rails.handleRemote(button);
      return false;
    });

    $(document).delegate(rails.inputChangeSelector, 'change.rails', function(e) {
      var link = $(this);
      if (!rails.allowAction(link)) return rails.stopEverything(e);

      rails.handleRemote(link);
      return false;
    });

    $(document).delegate(rails.formSubmitSelector, 'submit.rails', function(e) {
      var form = $(this),
        remote = form.data('remote') !== undefined,
        blankRequiredInputs = rails.blankInputs(form, rails.requiredInputSelector),
        nonBlankFileInputs = rails.nonBlankInputs(form, rails.fileInputSelector);

      if (!rails.allowAction(form)) return rails.stopEverything(e);

      // skip other logic when required values are missing or file upload is present
      if (blankRequiredInputs && form.attr("novalidate") == undefined && rails.fire(form, 'ajax:aborted:required', [blankRequiredInputs])) {
        return rails.stopEverything(e);
      }

      if (remote) {
        if (nonBlankFileInputs) {
          // slight timeout so that the submit button gets properly serialized
          // (make it easy for event handler to serialize form without disabled values)
          setTimeout(function(){ rails.disableFormElements(form); }, 13);
          var aborted = rails.fire(form, 'ajax:aborted:file', [nonBlankFileInputs]);

          // re-enable form elements if event bindings return false (canceling normal form submission)
          if (!aborted) { setTimeout(function(){ rails.enableFormElements(form); }, 13); }

          return aborted;
        }

        rails.handleRemote(form);
        return false;

      } else {
        // slight timeout so that the submit button gets properly serialized
        setTimeout(function(){ rails.disableFormElements(form); }, 13);
      }
    });

    $(document).delegate(rails.formInputClickSelector, 'click.rails', function(event) {
      var button = $(this);

      if (!rails.allowAction(button)) return rails.stopEverything(event);

      // register the pressed submit button
      var name = button.attr('name'),
        data = name ? {name:name, value:button.val()} : null;

      button.closest('form').data('ujs:submit-button', data);
    });

    $(document).delegate(rails.formSubmitSelector, 'ajax:beforeSend.rails', function(event) {
      if (this == event.target) rails.disableFormElements($(this));
    });

    $(document).delegate(rails.formSubmitSelector, 'ajax:complete.rails', function(event) {
      if (this == event.target) rails.enableFormElements($(this));
    });

    $(function(){
      // making sure that all forms have actual up-to-date token(cached forms contain old one)
      var csrf_token = $('meta[name=csrf-token]').attr('content');
      var csrf_param = $('meta[name=csrf-param]').attr('content');
      $('form input[name="' + csrf_param + '"]').val(csrf_token);
    });
  }

})( jQuery );
(function($) {
  jQuery.fn.putCursorAtEnd = function() {
    return this.each(function() {
      $(this).focus()

      // If this function exists...
      if (this.setSelectionRange) {
        // ... then use it
        // (Doesn't work in IE)
        // Double the length because Opera is inconsistent about whether a carriage return is one character or two. Sigh.
        var len = $(this).val().length * 2;
        this.setSelectionRange(len, len);
      } else {
        // ... otherwise replace the contents with itself
        // (Doesn't work in Google Chrome)
        $(this).val($(this).val());
      }

      // Scroll to the bottom, in case we're in a tall textarea
      // (Necessary for Firefox and Google Chrome)
      this.scrollTop = 999999;
    });
  };
})(jQuery);
/*!
 * jQuery Cookie Plugin
 * https://github.com/carhartl/jquery-cookie
 *
 * Copyright 2011, Klaus Hartl
 * Dual licensed under the MIT or GPL Version 2 licenses.
 * http://www.opensource.org/licenses/mit-license.php
 * http://www.opensource.org/licenses/GPL-2.0
 */

(function($) {
    $.cookie = function(key, value, options) {

        // key and at least value given, set cookie...
        if (arguments.length > 1 && (!/Object/.test(Object.prototype.toString.call(value)) || value === null || value === undefined)) {
            options = $.extend({}, options);

            if (value === null || value === undefined) {
                options.expires = -1;
            }

            if (typeof options.expires === 'number') {
                var days = options.expires, t = options.expires = new Date();
                t.setDate(t.getDate() + days);
            }

            value = String(value);

            return (document.cookie = [
                encodeURIComponent(key), '=', options.raw ? value : encodeURIComponent(value),
                options.expires ? '; expires=' + options.expires.toUTCString() : '', // use expires attribute, max-age is not supported by IE
                options.path    ? '; path=' + options.path : '',
                options.domain  ? '; domain=' + options.domain : '',
                options.secure  ? '; secure' : ''
            ].join(''));
        }

        // key and possibly options given, get cookie...
        options = value || {};
        var decode = options.raw ? function(s) { return s; } : decodeURIComponent;

        var pairs = document.cookie.split('; ');
        for (var i = 0, pair; pair = pairs[i] && pairs[i].split('='); i++) {
            if (decode(pair[0]) === key) return decode(pair[1] || ''); // IE saves cookies with empty string as "c; ", e.g. without "=" as opposed to EOMB, thus pair[1] may be undefined
        }
        return null;
    };
})(jQuery);
/*
 * Simple Pub/Sub Implementation for jQuery
 *
 * Inspired by work from Peter Higgins (https://github.com/phiggins42/bloody-jquery-plugins/blob/master/pubsub.js)
 *
 * This is about the simplest way to write a pubsub JavaScript implementation for use with jQuery.
 */

 /*
 For example:

 var handle = $.subscribe('notification', function (msg) {
   alert(msg);
 });

 $.publish('notification', ['Hello World']);

 $.unsubscribe(handle);

 */


(function( $ ) {
  // Cache of all topics
  var topics = {};

  // Iterates through all subscribers of a topic and invokes their callback,
  // passing optional arguments.
  $.publish = function( topic, args ) {
    if ( topics[ topic ] ) {
      var thisTopic = topics[ topic ],
        thisArgs = args || [];

      for ( var i = 0, j = thisTopic.length; i < j; i++ ) {
        thisTopic[i].apply( $, thisArgs );
      }
    }
  };

  // Returns a handle needed for unsubscribing
  $.subscribe = function( topic, callback ) {
    if ( !topics[ topic ] ) {
      topics[ topic ] = [];
    }

    topics[ topic ].push( callback );

    return {
      topic: topic,
      callback: callback
    };
  };

  // Removes the subscriber from the particular topic its handle was assigned to
  $.unsubscribe = function( handle ) {
    var topic = handle.topic;

    if ( topics[ topic ] ) {
      var thisTopic = topics[ topic ];

      for ( var i = 0, j = thisTopic.length; i < j; i++ ) {
        if ( thisTopic[i] === handle.callback ) {
          thisTopic.splice( i, 1 );
          // break; here? duplicate handles are possible
        }
      }
    }
  };

})( jQuery );
/*global jQuery */
/*!
* FitVids 1.0
*
* Copyright 2011, Chris Coyier - http://css-tricks.com + Dave Rupert - http://daverupert.com
* Credit to Thierry Koblentz - http://www.alistapart.com/articles/creating-intrinsic-ratios-for-video/
* Released under the WTFPL license - http://sam.zoy.org/wtfpl/
*
* Date: Thu Sept 01 18:00:00 2011 -0500
*/


(function( $ ){

  $.fn.fitVids = function( options ) {
    var settings = {
      customSelector: null
    }

    var div = document.createElement('div'),
        ref = document.getElementsByTagName('base')[0] || document.getElementsByTagName('script')[0];

    div.className = 'fit-vids-style';
    div.innerHTML = '&shy;<style>         \
      .fluid-width-video-wrapper {        \
         width: 100%;                     \
         position: relative;              \
         padding: 0;                      \
      }                                   \
                                          \
      .fluid-width-video-wrapper iframe,  \
      .fluid-width-video-wrapper object,  \
      .fluid-width-video-wrapper embed {  \
         position: absolute;              \
         top: 0;                          \
         left: 0;                         \
         width: 100%;                     \
         height: 100%;                     \
      }                                   \
    </style>';

    ref.parentNode.insertBefore(div,ref);

    if ( options ) {
      $.extend( settings, options );
    }

    return this.each(function(){
      var selectors = [
        "iframe[src^='http://player.vimeo.com']",
        "iframe[src^='http://www.youtube.com']",
        "iframe[src^='https://www.youtube.com']",
        "iframe[src^='http://www.kickstarter.com']",
        "object",
        "embed"
      ];

      if (settings.customSelector) {
        selectors.push(settings.customSelector);
      }

      var $allVideos = $(this).find(selectors.join(','));

      $allVideos.each(function(){
        var $this = $(this);
        if (this.tagName.toLowerCase() == 'embed' && $this.parent('object').length || $this.parent('.fluid-width-video-wrapper').length) { return; }
        var height = this.tagName.toLowerCase() == 'object' ? $this.attr('height') : $this.height(),
            aspectRatio = height / $this.width();
    if(!$this.attr('id')){
      var videoID = 'fitvid' + Math.floor(Math.random()*999999);
      $this.attr('id', videoID);
    }
        $this.wrap('<div class="fluid-width-video-wrapper"></div>').parent('.fluid-width-video-wrapper').css('padding-top', (aspectRatio * 100)+"%");
        $this.removeAttr('height').removeAttr('width');
      });
    });

  }
})( jQuery );
//
// showdown.js -- A javascript port of Markdown.
//
// Copyright (c) 2007 John Fraser.
//
// Original Markdown Copyright (c) 2004-2005 John Gruber
//   <http://daringfireball.net/projects/markdown/>
//
// Redistributable under a BSD-style open source license.
// See license.txt for more information.
//
// The full source distribution is at:
//
//        A A L
//        T C A
//        T K B
//
//   <http://www.attacklab.net/>
//

//
// Wherever possible, Showdown is a straight, line-by-line port
// of the Perl version of Markdown.
//
// This is not a normal parser design; it's basically just a
// series of string substitutions.  It's hard to read and
// maintain this way,  but keeping Showdown close to the original
// design makes it easier to port new features.
//
// More importantly, Showdown behaves like markdown.pl in most
// edge cases.  So web applications can do client-side preview
// in Javascript, and then build identical HTML on the server.
//
// This port needs the new RegExp functionality of ECMA 262,
// 3rd Edition (i.e. Javascript 1.5).  Most modern web browsers
// should do fine.  Even with the new regular expression features,
// We do a lot of work to emulate Perl's regex functionality.
// The tricky changes in this file mostly have the "attacklab:"
// label.  Major or self-explanatory changes don't.
//
// Smart diff tools like Araxis Merge will be able to match up
// this file with markdown.pl in a useful way.  A little tweaking
// helps: in a copy of markdown.pl, replace "#" with "//" and
// replace "$text" with "text".  Be sure to ignore whitespace
// and line endings.
//


//
// Showdown usage:
//
//   var text = "Markdown *rocks*.";
//
//   var converter = new Showdown.converter();
//   var html = converter.makeHtml(text);
//
//   alert(html);
//
// Note: move the sample code to the bottom of this
// file before uncommenting it.
//


//
// Showdown namespace
//
var Showdown = {};

//
// converter
//
// Wraps all "globals" so that the only thing
// exposed is makeHtml().
//
Showdown.converter = function() {

//
// Globals:
//

// Global hashes, used by various utility routines
var g_urls;
var g_titles;
var g_html_blocks;

// Used to track when we're inside an ordered or unordered list
// (see _ProcessListItems() for details):
var g_list_level = 0;


this.makeHtml = function(text) {
//
// Main function. The order in which other subs are called here is
// essential. Link and image substitutions need to happen before
// _EscapeSpecialCharsWithinTagAttributes(), so that any *'s or _'s in the <a>
// and <img> tags get encoded.
//

  // Clear the global hashes. If we don't clear these, you get conflicts
  // from other articles when generating a page which contains more than
  // one article (e.g. an index page that shows the N most recent
  // articles):
  g_urls = new Array();
  g_titles = new Array();
  g_html_blocks = new Array();

  // attacklab: Replace ~ with ~T
  // This lets us use tilde as an escape char to avoid md5 hashes
  // The choice of character is arbitray; anything that isn't
    // magic in Markdown will work.
  text = text.replace(/~/g,"~T");

  // attacklab: Replace $ with ~D
  // RegExp interprets $ as a special character
  // when it's in a replacement string
  text = text.replace(/\$/g,"~D");

  // Standardize line endings
  text = text.replace(/\r\n/g,"\n"); // DOS to Unix
  text = text.replace(/\r/g,"\n"); // Mac to Unix

  // Make sure text begins and ends with a couple of newlines:
  text = "\n\n" + text + "\n\n";

  // Convert all tabs to spaces.
  text = _Detab(text);

  // Strip any lines consisting only of spaces and tabs.
  // This makes subsequent regexen easier to write, because we can
  // match consecutive blank lines with /\n+/ instead of something
  // contorted like /[ \t]*\n+/ .
  text = text.replace(/^[ \t]+$/mg,"");

  // Turn block-level HTML blocks into hash entries
  text = _HashHTMLBlocks(text);

  // Strip link definitions, store in hashes.
  text = _StripLinkDefinitions(text);

  text = _RunBlockGamut(text);

  text = _UnescapeSpecialChars(text);

  // attacklab: Restore dollar signs
  text = text.replace(/~D/g,"$$");

  // attacklab: Restore tildes
  text = text.replace(/~T/g,"~");

  return text;
}


var _StripLinkDefinitions = function(text) {
//
// Strips link definitions from text, stores the URLs and titles in
// hash references.
//

  // Link defs are in the form: ^[id]: url "optional title"

  /*
    var text = text.replace(/
        ^[ ]{0,3}\[(.+)\]:  // id = $1  attacklab: g_tab_width - 1
          [ \t]*
          \n?        // maybe *one* newline
          [ \t]*
        <?(\S+?)>?      // url = $2
          [ \t]*
          \n?        // maybe one newline
          [ \t]*
        (?:
          (\n*)        // any lines skipped = $3 attacklab: lookbehind removed
          ["(]
          (.+?)        // title = $4
          [")]
          [ \t]*
        )?          // title is optional
        (?:\n+|$)
        /gm,
        function(){...});
  */
  var text = text.replace(/^[ ]{0,3}\[(.+)\]:[ \t]*\n?[ \t]*<?(\S+?)>?[ \t]*\n?[ \t]*(?:(\n*)["(](.+?)[")][ \t]*)?(?:\n+|\Z)/gm,
    function (wholeMatch,m1,m2,m3,m4) {
      m1 = m1.toLowerCase();
      g_urls[m1] = _EncodeAmpsAndAngles(m2);  // Link IDs are case-insensitive
      if (m3) {
        // Oops, found blank lines, so it's not a title.
        // Put back the parenthetical statement we stole.
        return m3+m4;
      } else if (m4) {
        g_titles[m1] = m4.replace(/"/g,"&quot;");
      }

      // Completely remove the definition from the text
      return "";
    }
  );

  return text;
}


var _HashHTMLBlocks = function(text) {
  // attacklab: Double up blank lines to reduce lookaround
  text = text.replace(/\n/g,"\n\n");

  // Hashify HTML blocks:
  // We only want to do this for block-level HTML tags, such as headers,
  // lists, and tables. That's because we still want to wrap <p>s around
  // "paragraphs" that are wrapped in non-block-level tags, such as anchors,
  // phrase emphasis, and spans. The list of tags we're looking for is
  // hard-coded:
  var block_tags_a = "p|div|h[1-6]|blockquote|pre|table|dl|ol|ul|script|noscript|form|fieldset|iframe|math|ins|del"
  var block_tags_b = "p|div|h[1-6]|blockquote|pre|table|dl|ol|ul|script|noscript|form|fieldset|iframe|math"

  // First, look for nested blocks, e.g.:
  //   <div>
  //     <div>
  //     tags for inner block must be indented.
  //     </div>
  //   </div>
  //
  // The outermost tags must start at the left margin for this to match, and
  // the inner nested divs must be indented.
  // We need to do this before the next, more liberal match, because the next
  // match will start at the first `<div>` and stop at the first `</div>`.

  // attacklab: This regex can be expensive when it fails.
  /*
    var text = text.replace(/
    (            // save in $1
      ^          // start of line  (with /m)
      <($block_tags_a)  // start tag = $2
      \b          // word break
                // attacklab: hack around khtml/pcre bug...
      [^\r]*?\n      // any number of lines, minimally matching
      </\2>        // the matching end tag
      [ \t]*        // trailing spaces/tabs
      (?=\n+)        // followed by a newline
    )            // attacklab: there are sentinel newlines at end of document
    /gm,function(){...}};
  */
  text = text.replace(/^(<(p|div|h[1-6]|blockquote|pre|table|dl|ol|ul|script|noscript|form|fieldset|iframe|math|ins|del)\b[^\r]*?\n<\/\2>[ \t]*(?=\n+))/gm,hashElement);

  //
  // Now match more liberally, simply from `\n<tag>` to `</tag>\n`
  //

  /*
    var text = text.replace(/
    (            // save in $1
      ^          // start of line  (with /m)
      <($block_tags_b)  // start tag = $2
      \b          // word break
                // attacklab: hack around khtml/pcre bug...
      [^\r]*?        // any number of lines, minimally matching
      .*</\2>        // the matching end tag
      [ \t]*        // trailing spaces/tabs
      (?=\n+)        // followed by a newline
    )            // attacklab: there are sentinel newlines at end of document
    /gm,function(){...}};
  */
  text = text.replace(/^(<(p|div|h[1-6]|blockquote|pre|table|dl|ol|ul|script|noscript|form|fieldset|iframe|math)\b[^\r]*?.*<\/\2>[ \t]*(?=\n+)\n)/gm,hashElement);

  // Special case just for <hr />. It was easier to make a special case than
  // to make the other regex more complicated.

  /*
    text = text.replace(/
    (            // save in $1
      \n\n        // Starting after a blank line
      [ ]{0,3}
      (<(hr)        // start tag = $2
      \b          // word break
      ([^<>])*?      //
      \/?>)        // the matching end tag
      [ \t]*
      (?=\n{2,})      // followed by a blank line
    )
    /g,hashElement);
  */
  text = text.replace(/(\n[ ]{0,3}(<(hr)\b([^<>])*?\/?>)[ \t]*(?=\n{2,}))/g,hashElement);

  // Special case for standalone HTML comments:

  /*
    text = text.replace(/
    (            // save in $1
      \n\n        // Starting after a blank line
      [ ]{0,3}      // attacklab: g_tab_width - 1
      <!
      (--[^\r]*?--\s*)+
      >
      [ \t]*
      (?=\n{2,})      // followed by a blank line
    )
    /g,hashElement);
  */
  text = text.replace(/(\n\n[ ]{0,3}<!(--[^\r]*?--\s*)+>[ \t]*(?=\n{2,}))/g,hashElement);

  // PHP and ASP-style processor instructions (<?...?> and <%...%>)

  /*
    text = text.replace(/
    (?:
      \n\n        // Starting after a blank line
    )
    (            // save in $1
      [ ]{0,3}      // attacklab: g_tab_width - 1
      (?:
        <([?%])      // $2
        [^\r]*?
        \2>
      )
      [ \t]*
      (?=\n{2,})      // followed by a blank line
    )
    /g,hashElement);
  */
  text = text.replace(/(?:\n\n)([ ]{0,3}(?:<([?%])[^\r]*?\2>)[ \t]*(?=\n{2,}))/g,hashElement);

  // attacklab: Undo double lines (see comment at top of this function)
  text = text.replace(/\n\n/g,"\n");
  return text;
}

var hashElement = function(wholeMatch,m1) {
  var blockText = m1;

  // Undo double lines
  blockText = blockText.replace(/\n\n/g,"\n");
  blockText = blockText.replace(/^\n/,"");

  // strip trailing blank lines
  blockText = blockText.replace(/\n+$/g,"");

  // Replace the element text with a marker ("~KxK" where x is its key)
  blockText = "\n\n~K" + (g_html_blocks.push(blockText)-1) + "K\n\n";

  return blockText;
};

var _RunBlockGamut = function(text) {
//
// These are all the transformations that form block-level
// tags like paragraphs, headers, and list items.
//
  text = _DoHeaders(text);

  // Do Horizontal Rules:
  var key = hashBlock("<hr />");
  text = text.replace(/^[ ]{0,2}([ ]?\*[ ]?){3,}[ \t]*$/gm,key);
  text = text.replace(/^[ ]{0,2}([ ]?\-[ ]?){3,}[ \t]*$/gm,key);
  text = text.replace(/^[ ]{0,2}([ ]?\_[ ]?){3,}[ \t]*$/gm,key);

  text = _DoLists(text);
  text = _DoCodeBlocks(text);
  text = _DoBlockQuotes(text);

  // We already ran _HashHTMLBlocks() before, in Markdown(), but that
  // was to escape raw HTML in the original Markdown source. This time,
  // we're escaping the markup we've just created, so that we don't wrap
  // <p> tags around block-level tags.
  text = _HashHTMLBlocks(text);
  text = _FormParagraphs(text);

  return text;
}


var _RunSpanGamut = function(text) {
//
// These are all the transformations that occur *within* block-level
// tags like paragraphs, headers, and list items.
//

  text = _DoCodeSpans(text);
  text = _EscapeSpecialCharsWithinTagAttributes(text);
  text = _EncodeBackslashEscapes(text);

  // Process anchor and image tags. Images must come first,
  // because ![foo][f] looks like an anchor.
  text = _DoImages(text);
  text = _DoAnchors(text);

  // Make links out of things like `<http://example.com/>`
  // Must come after _DoAnchors(), because you can use < and >
  // delimiters in inline links like [this](<url>).
  text = _DoAutoLinks(text);
  text = _EncodeAmpsAndAngles(text);
  text = _DoItalicsAndBold(text);

  // Do hard breaks:
  text = text.replace(/  +\n/g," <br />\n");

  return text;
}

var _EscapeSpecialCharsWithinTagAttributes = function(text) {
//
// Within tags -- meaning between < and > -- encode [\ ` * _] so they
// don't conflict with their use in Markdown for code, italics and strong.
//

  // Build a regex to find HTML tags and comments.  See Friedl's
  // "Mastering Regular Expressions", 2nd Ed., pp. 200-201.
  var regex = /(<[a-z\/!$]("[^"]*"|'[^']*'|[^'">])*>|<!(--.*?--\s*)+>)/gi;

  text = text.replace(regex, function(wholeMatch) {
    var tag = wholeMatch.replace(/(.)<\/?code>(?=.)/g,"$1`");
    tag = escapeCharacters(tag,"\\`*_");
    return tag;
  });

  return text;
}

var _DoAnchors = function(text) {
//
// Turn Markdown link shortcuts into XHTML <a> tags.
//
  //
  // First, handle reference-style links: [link text] [id]
  //

  /*
    text = text.replace(/
    (              // wrap whole match in $1
      \[
      (
        (?:
          \[[^\]]*\]    // allow brackets nested one level
          |
          [^\[]      // or anything else
        )*
      )
      \]

      [ ]?          // one optional space
      (?:\n[ ]*)?        // one optional newline followed by spaces

      \[
      (.*?)          // id = $3
      \]
    )()()()()          // pad remaining backreferences
    /g,_DoAnchors_callback);
  */
  text = text.replace(/(\[((?:\[[^\]]*\]|[^\[\]])*)\][ ]?(?:\n[ ]*)?\[(.*?)\])()()()()/g,writeAnchorTag);

  //
  // Next, inline-style links: [link text](url "optional title")
  //

  /*
    text = text.replace(/
      (            // wrap whole match in $1
        \[
        (
          (?:
            \[[^\]]*\]  // allow brackets nested one level
          |
          [^\[\]]      // or anything else
        )
      )
      \]
      \(            // literal paren
      [ \t]*
      ()            // no id, so leave $3 empty
      <?(.*?)>?        // href = $4
      [ \t]*
      (            // $5
        (['"])        // quote char = $6
        (.*?)        // Title = $7
        \6          // matching quote
        [ \t]*        // ignore any spaces/tabs between closing quote and )
      )?            // title is optional
      \)
    )
    /g,writeAnchorTag);
  */
  text = text.replace(/(\[((?:\[[^\]]*\]|[^\[\]])*)\]\([ \t]*()<?(.*?)>?[ \t]*((['"])(.*?)\6[ \t]*)?\))/g,writeAnchorTag);

  //
  // Last, handle reference-style shortcuts: [link text]
  // These must come last in case you've also got [link test][1]
  // or [link test](/foo)
  //

  /*
    text = text.replace(/
    (               // wrap whole match in $1
      \[
      ([^\[\]]+)        // link text = $2; can't contain '[' or ']'
      \]
    )()()()()()          // pad rest of backreferences
    /g, writeAnchorTag);
  */
  text = text.replace(/(\[([^\[\]]+)\])()()()()()/g, writeAnchorTag);

  return text;
}

var writeAnchorTag = function(wholeMatch,m1,m2,m3,m4,m5,m6,m7) {
  if (m7 == undefined) m7 = "";
  var whole_match = m1;
  var link_text   = m2;
  var link_id   = m3.toLowerCase();
  var url    = m4;
  var title  = m7;

  if (url == "") {
    if (link_id == "") {
      // lower-case and turn embedded newlines into spaces
      link_id = link_text.toLowerCase().replace(/ ?\n/g," ");
    }
    url = "#"+link_id;

    if (g_urls[link_id] != undefined) {
      url = g_urls[link_id];
      if (g_titles[link_id] != undefined) {
        title = g_titles[link_id];
      }
    }
    else {
      if (whole_match.search(/\(\s*\)$/m)>-1) {
        // Special case for explicit empty url
        url = "";
      } else {
        return whole_match;
      }
    }
  }

  url = escapeCharacters(url,"*_");
  var result = "<a href=\"" + url + "\"";

  if (title != "") {
    title = title.replace(/"/g,"&quot;");
    title = escapeCharacters(title,"*_");
    result +=  " title=\"" + title + "\"";
  }

  result += ">" + link_text + "</a>";

  return result;
}


var _DoImages = function(text) {
//
// Turn Markdown image shortcuts into <img> tags.
//

  //
  // First, handle reference-style labeled images: ![alt text][id]
  //

  /*
    text = text.replace(/
    (            // wrap whole match in $1
      !\[
      (.*?)        // alt text = $2
      \]

      [ ]?        // one optional space
      (?:\n[ ]*)?      // one optional newline followed by spaces

      \[
      (.*?)        // id = $3
      \]
    )()()()()        // pad rest of backreferences
    /g,writeImageTag);
  */
  text = text.replace(/(!\[(.*?)\][ ]?(?:\n[ ]*)?\[(.*?)\])()()()()/g,writeImageTag);

  //
  // Next, handle inline images:  ![alt text](url "optional title")
  // Don't forget: encode * and _

  /*
    text = text.replace(/
    (            // wrap whole match in $1
      !\[
      (.*?)        // alt text = $2
      \]
      \s?          // One optional whitespace character
      \(          // literal paren
      [ \t]*
      ()          // no id, so leave $3 empty
      <?(\S+?)>?      // src url = $4
      [ \t]*
      (          // $5
        (['"])      // quote char = $6
        (.*?)      // title = $7
        \6        // matching quote
        [ \t]*
      )?          // title is optional
    \)
    )
    /g,writeImageTag);
  */
  text = text.replace(/(!\[(.*?)\]\s?\([ \t]*()<?(\S+?)>?[ \t]*((['"])(.*?)\6[ \t]*)?\))/g,writeImageTag);

  return text;
}

var writeImageTag = function(wholeMatch,m1,m2,m3,m4,m5,m6,m7) {
  var whole_match = m1;
  var alt_text   = m2;
  var link_id   = m3.toLowerCase();
  var url    = m4;
  var title  = m7;

  if (!title) title = "";

  if (url == "") {
    if (link_id == "") {
      // lower-case and turn embedded newlines into spaces
      link_id = alt_text.toLowerCase().replace(/ ?\n/g," ");
    }
    url = "#"+link_id;

    if (g_urls[link_id] != undefined) {
      url = g_urls[link_id];
      if (g_titles[link_id] != undefined) {
        title = g_titles[link_id];
      }
    }
    else {
      return whole_match;
    }
  }

  alt_text = alt_text.replace(/"/g,"&quot;");
  url = escapeCharacters(url,"*_");
  var result = "<img src=\"" + url + "\" alt=\"" + alt_text + "\"";

  // attacklab: Markdown.pl adds empty title attributes to images.
  // Replicate this bug.

  //if (title != "") {
    title = title.replace(/"/g,"&quot;");
    title = escapeCharacters(title,"*_");
    result +=  " title=\"" + title + "\"";
  //}

  result += " />";

  return result;
}


var _DoHeaders = function(text) {

  // Setext-style headers:
  //  Header 1
  //  ========
  //
  //  Header 2
  //  --------
  //
  text = text.replace(/^(.+)[ \t]*\n=+[ \t]*\n+/gm,
    function(wholeMatch,m1){return hashBlock('<h1 id="' + headerId(m1) + '">' + _RunSpanGamut(m1) + "</h1>");});

  text = text.replace(/^(.+)[ \t]*\n-+[ \t]*\n+/gm,
    function(matchFound,m1){return hashBlock('<h2 id="' + headerId(m1) + '">' + _RunSpanGamut(m1) + "</h2>");});

  // atx-style headers:
  //  # Header 1
  //  ## Header 2
  //  ## Header 2 with closing hashes ##
  //  ...
  //  ###### Header 6
  //

  /*
    text = text.replace(/
      ^(\#{1,6})        // $1 = string of #'s
      [ \t]*
      (.+?)          // $2 = Header text
      [ \t]*
      \#*            // optional closing #'s (not counted)
      \n+
    /gm, function() {...});
  */

  text = text.replace(/^(\#{1,6})[ \t]*(.+?)[ \t]*\#*\n+/gm,
    function(wholeMatch,m1,m2) {
      var h_level = m1.length;
      return hashBlock("<h" + h_level + ' id="' + headerId(m2) + '">' + _RunSpanGamut(m2) + "</h" + h_level + ">");
    });

  function headerId(m) {
    return m.replace(/[^\w]/g, '').toLowerCase();
  }
  return text;
}

// This declaration keeps Dojo compressor from outputting garbage:
var _ProcessListItems;

var _DoLists = function(text) {
//
// Form HTML ordered (numbered) and unordered (bulleted) lists.
//

  // attacklab: add sentinel to hack around khtml/safari bug:
  // http://bugs.webkit.org/show_bug.cgi?id=11231
  text += "~0";

  // Re-usable pattern to match any entirel ul or ol list:

  /*
    var whole_list = /
    (                  // $1 = whole list
      (                // $2
        [ ]{0,3}          // attacklab: g_tab_width - 1
        ([*+-]|\d+[.])        // $3 = first list item marker
        [ \t]+
      )
      [^\r]+?
      (                // $4
        ~0              // sentinel for workaround; should be $
      |
        \n{2,}
        (?=\S)
        (?!              // Negative lookahead for another list item marker
          [ \t]*
          (?:[*+-]|\d+[.])[ \t]+
        )
      )
    )/g
  */
  var whole_list = /^(([ ]{0,3}([*+-]|\d+[.])[ \t]+)[^\r]+?(~0|\n{2,}(?=\S)(?![ \t]*(?:[*+-]|\d+[.])[ \t]+)))/gm;

  if (g_list_level) {
    text = text.replace(whole_list,function(wholeMatch,m1,m2) {
      var list = m1;
      var list_type = (m2.search(/[*+-]/g)>-1) ? "ul" : "ol";

      // Turn double returns into triple returns, so that we can make a
      // paragraph for the last item in a list, if necessary:
      list = list.replace(/\n{2,}/g,"\n\n\n");;
      var result = _ProcessListItems(list);

      // Trim any trailing whitespace, to put the closing `</$list_type>`
      // up on the preceding line, to get it past the current stupid
      // HTML block parser. This is a hack to work around the terrible
      // hack that is the HTML block parser.
      result = result.replace(/\s+$/,"");
      result = "<"+list_type+">" + result + "</"+list_type+">\n";
      return result;
    });
  } else {
    whole_list = /(\n\n|^\n?)(([ ]{0,3}([*+-]|\d+[.])[ \t]+)[^\r]+?(~0|\n{2,}(?=\S)(?![ \t]*(?:[*+-]|\d+[.])[ \t]+)))/g;
    text = text.replace(whole_list,function(wholeMatch,m1,m2,m3) {
      var runup = m1;
      var list = m2;

      var list_type = (m3.search(/[*+-]/g)>-1) ? "ul" : "ol";
      // Turn double returns into triple returns, so that we can make a
      // paragraph for the last item in a list, if necessary:
      var list = list.replace(/\n{2,}/g,"\n\n\n");;
      var result = _ProcessListItems(list);
      result = runup + "<"+list_type+">\n" + result + "</"+list_type+">\n";
      return result;
    });
  }

  // attacklab: strip sentinel
  text = text.replace(/~0/,"");

  return text;
}

_ProcessListItems = function(list_str) {
//
//  Process the contents of a single ordered or unordered list, splitting it
//  into individual list items.
//
  // The $g_list_level global keeps track of when we're inside a list.
  // Each time we enter a list, we increment it; when we leave a list,
  // we decrement. If it's zero, we're not in a list anymore.
  //
  // We do this because when we're not inside a list, we want to treat
  // something like this:
  //
  //    I recommend upgrading to version
  //    8. Oops, now this line is treated
  //    as a sub-list.
  //
  // As a single paragraph, despite the fact that the second line starts
  // with a digit-period-space sequence.
  //
  // Whereas when we're inside a list (or sub-list), that line will be
  // treated as the start of a sub-list. What a kludge, huh? This is
  // an aspect of Markdown's syntax that's hard to parse perfectly
  // without resorting to mind-reading. Perhaps the solution is to
  // change the syntax rules such that sub-lists must start with a
  // starting cardinal number; e.g. "1." or "a.".

  g_list_level++;

  // trim trailing blank lines:
  list_str = list_str.replace(/\n{2,}$/,"\n");

  // attacklab: add sentinel to emulate \z
  list_str += "~0";

  /*
    list_str = list_str.replace(/
      (\n)?              // leading line = $1
      (^[ \t]*)            // leading whitespace = $2
      ([*+-]|\d+[.]) [ \t]+      // list marker = $3
      ([^\r]+?            // list item text   = $4
      (\n{1,2}))
      (?= \n* (~0 | \2 ([*+-]|\d+[.]) [ \t]+))
    /gm, function(){...});
  */
  list_str = list_str.replace(/(\n)?(^[ \t]*)([*+-]|\d+[.])[ \t]+([^\r]+?(\n{1,2}))(?=\n*(~0|\2([*+-]|\d+[.])[ \t]+))/gm,
    function(wholeMatch,m1,m2,m3,m4){
      var item = m4;
      var leading_line = m1;
      var leading_space = m2;

      if (leading_line || (item.search(/\n{2,}/)>-1)) {
        item = _RunBlockGamut(_Outdent(item));
      }
      else {
        // Recursion for sub-lists:
        item = _DoLists(_Outdent(item));
        item = item.replace(/\n$/,""); // chomp(item)
        item = _RunSpanGamut(item);
      }

      return  "<li>" + item + "</li>\n";
    }
  );

  // attacklab: strip sentinel
  list_str = list_str.replace(/~0/g,"");

  g_list_level--;
  return list_str;
}


var _DoCodeBlocks = function(text) {
//
//  Process Markdown `<pre><code>` blocks.
//

  /*
    text = text.replace(text,
      /(?:\n\n|^)
      (                // $1 = the code block -- one or more lines, starting with a space/tab
        (?:
          (?:[ ]{4}|\t)      // Lines must start with a tab or a tab-width of spaces - attacklab: g_tab_width
          .*\n+
        )+
      )
      (\n*[ ]{0,3}[^ \t\n]|(?=~0))  // attacklab: g_tab_width
    /g,function(){...});
  */

  // attacklab: sentinel workarounds for lack of \A and \Z, safari\khtml bug
  text += "~0";

  text = text.replace(/(?:\n\n|^)((?:(?:[ ]{4}|\t).*\n+)+)(\n*[ ]{0,3}[^ \t\n]|(?=~0))/g,
    function(wholeMatch,m1,m2) {
      var codeblock = m1;
      var nextChar = m2;

      codeblock = _EncodeCode( _Outdent(codeblock));
      codeblock = _Detab(codeblock);
      codeblock = codeblock.replace(/^\n+/g,""); // trim leading newlines
      codeblock = codeblock.replace(/\n+$/g,""); // trim trailing whitespace

      codeblock = "<pre><code>" + codeblock + "\n</code></pre>";

      return hashBlock(codeblock) + nextChar;
    }
  );

  // attacklab: strip sentinel
  text = text.replace(/~0/,"");

  return text;
}

var hashBlock = function(text) {
  text = text.replace(/(^\n+|\n+$)/g,"");
  return "\n\n~K" + (g_html_blocks.push(text)-1) + "K\n\n";
}


var _DoCodeSpans = function(text) {
//
//   *  Backtick quotes are used for <code></code> spans.
//
//   *  You can use multiple backticks as the delimiters if you want to
//   include literal backticks in the code span. So, this input:
//
//     Just type ``foo `bar` baz`` at the prompt.
//
//     Will translate to:
//
//     <p>Just type <code>foo `bar` baz</code> at the prompt.</p>
//
//  There's no arbitrary limit to the number of backticks you
//  can use as delimters. If you need three consecutive backticks
//  in your code, use four for delimiters, etc.
//
//  *  You can use spaces to get literal backticks at the edges:
//
//     ... type `` `bar` `` ...
//
//     Turns to:
//
//     ... type <code>`bar`</code> ...
//

  /*
    text = text.replace(/
      (^|[^\\])          // Character before opening ` can't be a backslash
      (`+)            // $2 = Opening run of `
      (              // $3 = The code block
        [^\r]*?
        [^`]          // attacklab: work around lack of lookbehind
      )
      \2              // Matching closer
      (?!`)
    /gm, function(){...});
  */

  text = text.replace(/(^|[^\\])(`+)([^\r]*?[^`])\2(?!`)/gm,
    function(wholeMatch,m1,m2,m3,m4) {
      var c = m3;
      c = c.replace(/^([ \t]*)/g,"");  // leading whitespace
      c = c.replace(/[ \t]*$/g,"");  // trailing whitespace
      c = _EncodeCode(c);
      return m1+"<code>"+c+"</code>";
    });

  return text;
}


var _EncodeCode = function(text) {
//
// Encode/escape certain characters inside Markdown code runs.
// The point is that in code, these characters are literals,
// and lose their special Markdown meanings.
//
  // Encode all ampersands; HTML entities are not
  // entities within a Markdown code span.
  text = text.replace(/&/g,"&amp;");

  // Do the angle bracket song and dance:
  text = text.replace(/</g,"&lt;");
  text = text.replace(/>/g,"&gt;");

  // Now, escape characters that are magic in Markdown:
  text = escapeCharacters(text,"\*_{}[]\\",false);

// jj the line above breaks this:
//---

//* Item

//   1. Subitem

//            special char: *
//---

  return text;
}


var _DoItalicsAndBold = function(text) {

  // <strong> must go first:
  text = text.replace(/(\*\*|__)(?=\S)([^\r]*?\S[*_]*)\1/g,
    "<strong>$2</strong>");

  text = text.replace(/(\*|_)(?=\S)([^\r]*?\S)\1/g,
    "<em>$2</em>");

  return text;
}


var _DoBlockQuotes = function(text) {

  /*
    text = text.replace(/
    (                // Wrap whole match in $1
      (
        ^[ \t]*>[ \t]?      // '>' at the start of a line
        .+\n          // rest of the first line
        (.+\n)*          // subsequent consecutive lines
        \n*            // blanks
      )+
    )
    /gm, function(){...});
  */

  text = text.replace(/((^[ \t]*>[ \t]?.+\n(.+\n)*\n*)+)/gm,
    function(wholeMatch,m1) {
      var bq = m1;

      // attacklab: hack around Konqueror 3.5.4 bug:
      // "----------bug".replace(/^-/g,"") == "bug"

      bq = bq.replace(/^[ \t]*>[ \t]?/gm,"~0");  // trim one level of quoting

      // attacklab: clean up hack
      bq = bq.replace(/~0/g,"");

      bq = bq.replace(/^[ \t]+$/gm,"");    // trim whitespace-only lines
      bq = _RunBlockGamut(bq);        // recurse

      bq = bq.replace(/(^|\n)/g,"$1  ");
      // These leading spaces screw with <pre> content, so we need to fix that:
      bq = bq.replace(
          /(\s*<pre>[^\r]+?<\/pre>)/gm,
        function(wholeMatch,m1) {
          var pre = m1;
          // attacklab: hack around Konqueror 3.5.4 bug:
          pre = pre.replace(/^  /mg,"~0");
          pre = pre.replace(/~0/g,"");
          return pre;
        });

      return hashBlock("<blockquote>\n" + bq + "\n</blockquote>");
    });
  return text;
}


var _FormParagraphs = function(text) {
//
//  Params:
//    $text - string to process with html <p> tags
//

  // Strip leading and trailing lines:
  text = text.replace(/^\n+/g,"");
  text = text.replace(/\n+$/g,"");

  var grafs = text.split(/\n{2,}/g);
  var grafsOut = new Array();

  //
  // Wrap <p> tags.
  //
  var end = grafs.length;
  for (var i=0; i<end; i++) {
    var str = grafs[i];

    // if this is an HTML marker, copy it
    if (str.search(/~K(\d+)K/g) >= 0) {
      grafsOut.push(str);
    }
    else if (str.search(/\S/) >= 0) {
      str = _RunSpanGamut(str);
      str = str.replace(/^([ \t]*)/g,"<p>");
      str += "</p>"
      grafsOut.push(str);
    }

  }

  //
  // Unhashify HTML blocks
  //
  end = grafsOut.length;
  for (var i=0; i<end; i++) {
    // if this is a marker for an html block...
    while (grafsOut[i].search(/~K(\d+)K/) >= 0) {
      var blockText = g_html_blocks[RegExp.$1];
      blockText = blockText.replace(/\$/g,"$$$$"); // Escape any dollar signs
      grafsOut[i] = grafsOut[i].replace(/~K\d+K/,blockText);
    }
  }

  return grafsOut.join("\n\n");
}


var _EncodeAmpsAndAngles = function(text) {
// Smart processing for ampersands and angle brackets that need to be encoded.

  // Ampersand-encoding based entirely on Nat Irons's Amputator MT plugin:
  //   http://bumppo.net/projects/amputator/
  text = text.replace(/&(?!#?[xX]?(?:[0-9a-fA-F]+|\w+);)/g,"&amp;");

  // Encode naked <'s
  text = text.replace(/<(?![a-z\/?\$!])/gi,"&lt;");

  return text;
}


var _EncodeBackslashEscapes = function(text) {
//
//   Parameter:  String.
//   Returns:  The string, with after processing the following backslash
//         escape sequences.
//

  // attacklab: The polite way to do this is with the new
  // escapeCharacters() function:
  //
  //   text = escapeCharacters(text,"\\",true);
  //   text = escapeCharacters(text,"`*_{}[]()>#+-.!",true);
  //
  // ...but we're sidestepping its use of the (slow) RegExp constructor
  // as an optimization for Firefox.  This function gets called a LOT.

  text = text.replace(/\\(\\)/g,escapeCharacters_callback);
  text = text.replace(/\\([`*_{}\[\]()>#+-.!])/g,escapeCharacters_callback);
  return text;
}


var _DoAutoLinks = function(text) {

  text = text.replace(/<((https?|ftp|dict):[^'">\s]+)>/gi,"<a href=\"$1\">$1</a>");

  // Email addresses: <address@domain.foo>

  /*
    text = text.replace(/
      <
      (?:mailto:)?
      (
        [-.\w]+
        \@
        [-a-z0-9]+(\.[-a-z0-9]+)*\.[a-z]+
      )
      >
    /gi, _DoAutoLinks_callback());
  */
  text = text.replace(/<(?:mailto:)?([-.\w]+\@[-a-z0-9]+(\.[-a-z0-9]+)*\.[a-z]+)>/gi,
    function(wholeMatch,m1) {
      return _EncodeEmailAddress( _UnescapeSpecialChars(m1) );
    }
  );

  return text;
}


var _EncodeEmailAddress = function(addr) {
//
//  Input: an email address, e.g. "foo@example.com"
//
//  Output: the email address as a mailto link, with each character
//  of the address encoded as either a decimal or hex entity, in
//  the hopes of foiling most address harvesting spam bots. E.g.:
//
//  <a href="&#x6D;&#97;&#105;&#108;&#x74;&#111;:&#102;&#111;&#111;&#64;&#101;
//     x&#x61;&#109;&#x70;&#108;&#x65;&#x2E;&#99;&#111;&#109;">&#102;&#111;&#111;
//     &#64;&#101;x&#x61;&#109;&#x70;&#108;&#x65;&#x2E;&#99;&#111;&#109;</a>
//
//  Based on a filter by Matthew Wickline, posted to the BBEdit-Talk
//  mailing list: <http://tinyurl.com/yu7ue>
//

  // attacklab: why can't javascript speak hex?
  function char2hex(ch) {
    var hexDigits = '0123456789ABCDEF';
    var dec = ch.charCodeAt(0);
    return(hexDigits.charAt(dec>>4) + hexDigits.charAt(dec&15));
  }

  var encode = [
    function(ch){return "&#"+ch.charCodeAt(0)+";";},
    function(ch){return "&#x"+char2hex(ch)+";";},
    function(ch){return ch;}
  ];

  addr = "mailto:" + addr;

  addr = addr.replace(/./g, function(ch) {
    if (ch == "@") {
         // this *must* be encoded. I insist.
      ch = encode[Math.floor(Math.random()*2)](ch);
    } else if (ch !=":") {
      // leave ':' alone (to spot mailto: later)
      var r = Math.random();
      // roughly 10% raw, 45% hex, 45% dec
      ch =  (
          r > .9  ?  encode[2](ch)   :
          r > .45 ?  encode[1](ch)   :
                encode[0](ch)
        );
    }
    return ch;
  });

  addr = "<a href=\"" + addr + "\">" + addr + "</a>";
  addr = addr.replace(/">.+:/g,"\">"); // strip the mailto: from the visible part

  return addr;
}


var _UnescapeSpecialChars = function(text) {
//
// Swap back in all the special characters we've hidden.
//
  text = text.replace(/~E(\d+)E/g,
    function(wholeMatch,m1) {
      var charCodeToReplace = parseInt(m1);
      return String.fromCharCode(charCodeToReplace);
    }
  );
  return text;
}


var _Outdent = function(text) {
//
// Remove one level of line-leading tabs or spaces
//

  // attacklab: hack around Konqueror 3.5.4 bug:
  // "----------bug".replace(/^-/g,"") == "bug"

  text = text.replace(/^(\t|[ ]{1,4})/gm,"~0"); // attacklab: g_tab_width

  // attacklab: clean up hack
  text = text.replace(/~0/g,"")

  return text;
}

var _Detab = function(text) {
// attacklab: Detab's completely rewritten for speed.
// In perl we could fix it by anchoring the regexp with \G.
// In javascript we're less fortunate.

  // expand first n-1 tabs
  text = text.replace(/\t(?=\t)/g,"    "); // attacklab: g_tab_width

  // replace the nth with two sentinels
  text = text.replace(/\t/g,"~A~B");

  // use the sentinel to anchor our regex so it doesn't explode
  text = text.replace(/~B(.+?)~A/g,
    function(wholeMatch,m1,m2) {
      var leadingText = m1;
      var numSpaces = 4 - leadingText.length % 4;  // attacklab: g_tab_width

      // there *must* be a better way to do this:
      for (var i=0; i<numSpaces; i++) leadingText+=" ";

      return leadingText;
    }
  );

  // clean up sentinels
  text = text.replace(/~A/g,"    ");  // attacklab: g_tab_width
  text = text.replace(/~B/g,"");

  return text;
}


//
//  attacklab: Utility functions
//


var escapeCharacters = function(text, charsToEscape, afterBackslash) {
  // First we have to escape the escape characters so that
  // we can build a character class out of them
  var regexString = "([" + charsToEscape.replace(/([\[\]\\])/g,"\\$1") + "])";

  if (afterBackslash) {
    regexString = "\\\\" + regexString;
  }

  var regex = new RegExp(regexString,"g");
  text = text.replace(regex,escapeCharacters_callback);

  return text;
}


var escapeCharacters_callback = function(wholeMatch,m1) {
  var charCodeToEscape = m1.charCodeAt(0);
  return "~E"+charCodeToEscape+"E";
}

} // end of Showdown.converter

// export
if (typeof exports != 'undefined') exports.Showdown = Showdown;
//     Underscore.js 1.4.3
//     http://underscorejs.org
//     (c) 2009-2012 Jeremy Ashkenas, DocumentCloud Inc.
//     Underscore may be freely distributed under the MIT license.

(function() {

  // Baseline setup
  // --------------

  // Establish the root object, `window` in the browser, or `global` on the server.
  var root = this;

  // Save the previous value of the `_` variable.
  var previousUnderscore = root._;

  // Establish the object that gets returned to break out of a loop iteration.
  var breaker = {};

  // Save bytes in the minified (but not gzipped) version:
  var ArrayProto = Array.prototype, ObjProto = Object.prototype, FuncProto = Function.prototype;

  // Create quick reference variables for speed access to core prototypes.
  var push             = ArrayProto.push,
      slice            = ArrayProto.slice,
      concat           = ArrayProto.concat,
      toString         = ObjProto.toString,
      hasOwnProperty   = ObjProto.hasOwnProperty;

  // All **ECMAScript 5** native function implementations that we hope to use
  // are declared here.
  var
    nativeForEach      = ArrayProto.forEach,
    nativeMap          = ArrayProto.map,
    nativeReduce       = ArrayProto.reduce,
    nativeReduceRight  = ArrayProto.reduceRight,
    nativeFilter       = ArrayProto.filter,
    nativeEvery        = ArrayProto.every,
    nativeSome         = ArrayProto.some,
    nativeIndexOf      = ArrayProto.indexOf,
    nativeLastIndexOf  = ArrayProto.lastIndexOf,
    nativeIsArray      = Array.isArray,
    nativeKeys         = Object.keys,
    nativeBind         = FuncProto.bind;

  // Create a safe reference to the Underscore object for use below.
  var _ = function(obj) {
    if (obj instanceof _) return obj;
    if (!(this instanceof _)) return new _(obj);
    this._wrapped = obj;
  };

  // Export the Underscore object for **Node.js**, with
  // backwards-compatibility for the old `require()` API. If we're in
  // the browser, add `_` as a global object via a string identifier,
  // for Closure Compiler "advanced" mode.
  if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      exports = module.exports = _;
    }
    exports._ = _;
  } else {
    root._ = _;
  }

  // Current version.
  _.VERSION = '1.4.3';

  // Collection Functions
  // --------------------

  // The cornerstone, an `each` implementation, aka `forEach`.
  // Handles objects with the built-in `forEach`, arrays, and raw objects.
  // Delegates to **ECMAScript 5**'s native `forEach` if available.
  var each = _.each = _.forEach = function(obj, iterator, context) {
    if (obj == null) return;
    if (nativeForEach && obj.forEach === nativeForEach) {
      obj.forEach(iterator, context);
    } else if (obj.length === +obj.length) {
      for (var i = 0, l = obj.length; i < l; i++) {
        if (iterator.call(context, obj[i], i, obj) === breaker) return;
      }
    } else {
      for (var key in obj) {
        if (_.has(obj, key)) {
          if (iterator.call(context, obj[key], key, obj) === breaker) return;
        }
      }
    }
  };

  // Return the results of applying the iterator to each element.
  // Delegates to **ECMAScript 5**'s native `map` if available.
  _.map = _.collect = function(obj, iterator, context) {
    var results = [];
    if (obj == null) return results;
    if (nativeMap && obj.map === nativeMap) return obj.map(iterator, context);
    each(obj, function(value, index, list) {
      results[results.length] = iterator.call(context, value, index, list);
    });
    return results;
  };

  var reduceError = 'Reduce of empty array with no initial value';

  // **Reduce** builds up a single result from a list of values, aka `inject`,
  // or `foldl`. Delegates to **ECMAScript 5**'s native `reduce` if available.
  _.reduce = _.foldl = _.inject = function(obj, iterator, memo, context) {
    var initial = arguments.length > 2;
    if (obj == null) obj = [];
    if (nativeReduce && obj.reduce === nativeReduce) {
      if (context) iterator = _.bind(iterator, context);
      return initial ? obj.reduce(iterator, memo) : obj.reduce(iterator);
    }
    each(obj, function(value, index, list) {
      if (!initial) {
        memo = value;
        initial = true;
      } else {
        memo = iterator.call(context, memo, value, index, list);
      }
    });
    if (!initial) throw new TypeError(reduceError);
    return memo;
  };

  // The right-associative version of reduce, also known as `foldr`.
  // Delegates to **ECMAScript 5**'s native `reduceRight` if available.
  _.reduceRight = _.foldr = function(obj, iterator, memo, context) {
    var initial = arguments.length > 2;
    if (obj == null) obj = [];
    if (nativeReduceRight && obj.reduceRight === nativeReduceRight) {
      if (context) iterator = _.bind(iterator, context);
      return initial ? obj.reduceRight(iterator, memo) : obj.reduceRight(iterator);
    }
    var length = obj.length;
    if (length !== +length) {
      var keys = _.keys(obj);
      length = keys.length;
    }
    each(obj, function(value, index, list) {
      index = keys ? keys[--length] : --length;
      if (!initial) {
        memo = obj[index];
        initial = true;
      } else {
        memo = iterator.call(context, memo, obj[index], index, list);
      }
    });
    if (!initial) throw new TypeError(reduceError);
    return memo;
  };

  // Return the first value which passes a truth test. Aliased as `detect`.
  _.find = _.detect = function(obj, iterator, context) {
    var result;
    any(obj, function(value, index, list) {
      if (iterator.call(context, value, index, list)) {
        result = value;
        return true;
      }
    });
    return result;
  };

  // Return all the elements that pass a truth test.
  // Delegates to **ECMAScript 5**'s native `filter` if available.
  // Aliased as `select`.
  _.filter = _.select = function(obj, iterator, context) {
    var results = [];
    if (obj == null) return results;
    if (nativeFilter && obj.filter === nativeFilter) return obj.filter(iterator, context);
    each(obj, function(value, index, list) {
      if (iterator.call(context, value, index, list)) results[results.length] = value;
    });
    return results;
  };

  // Return all the elements for which a truth test fails.
  _.reject = function(obj, iterator, context) {
    return _.filter(obj, function(value, index, list) {
      return !iterator.call(context, value, index, list);
    }, context);
  };

  // Determine whether all of the elements match a truth test.
  // Delegates to **ECMAScript 5**'s native `every` if available.
  // Aliased as `all`.
  _.every = _.all = function(obj, iterator, context) {
    iterator || (iterator = _.identity);
    var result = true;
    if (obj == null) return result;
    if (nativeEvery && obj.every === nativeEvery) return obj.every(iterator, context);
    each(obj, function(value, index, list) {
      if (!(result = result && iterator.call(context, value, index, list))) return breaker;
    });
    return !!result;
  };

  // Determine if at least one element in the object matches a truth test.
  // Delegates to **ECMAScript 5**'s native `some` if available.
  // Aliased as `any`.
  var any = _.some = _.any = function(obj, iterator, context) {
    iterator || (iterator = _.identity);
    var result = false;
    if (obj == null) return result;
    if (nativeSome && obj.some === nativeSome) return obj.some(iterator, context);
    each(obj, function(value, index, list) {
      if (result || (result = iterator.call(context, value, index, list))) return breaker;
    });
    return !!result;
  };

  // Determine if the array or object contains a given value (using `===`).
  // Aliased as `include`.
  _.contains = _.include = function(obj, target) {
    if (obj == null) return false;
    if (nativeIndexOf && obj.indexOf === nativeIndexOf) return obj.indexOf(target) != -1;
    return any(obj, function(value) {
      return value === target;
    });
  };

  // Invoke a method (with arguments) on every item in a collection.
  _.invoke = function(obj, method) {
    var args = slice.call(arguments, 2);
    return _.map(obj, function(value) {
      return (_.isFunction(method) ? method : value[method]).apply(value, args);
    });
  };

  // Convenience version of a common use case of `map`: fetching a property.
  _.pluck = function(obj, key) {
    return _.map(obj, function(value){ return value[key]; });
  };

  // Convenience version of a common use case of `filter`: selecting only objects
  // with specific `key:value` pairs.
  _.where = function(obj, attrs) {
    if (_.isEmpty(attrs)) return [];
    return _.filter(obj, function(value) {
      for (var key in attrs) {
        if (attrs[key] !== value[key]) return false;
      }
      return true;
    });
  };

  // Return the maximum element or (element-based computation).
  // Can't optimize arrays of integers longer than 65,535 elements.
  // See: https://bugs.webkit.org/show_bug.cgi?id=80797
  _.max = function(obj, iterator, context) {
    if (!iterator && _.isArray(obj) && obj[0] === +obj[0] && obj.length < 65535) {
      return Math.max.apply(Math, obj);
    }
    if (!iterator && _.isEmpty(obj)) return -Infinity;
    var result = {computed : -Infinity, value: -Infinity};
    each(obj, function(value, index, list) {
      var computed = iterator ? iterator.call(context, value, index, list) : value;
      computed >= result.computed && (result = {value : value, computed : computed});
    });
    return result.value;
  };

  // Return the minimum element (or element-based computation).
  _.min = function(obj, iterator, context) {
    if (!iterator && _.isArray(obj) && obj[0] === +obj[0] && obj.length < 65535) {
      return Math.min.apply(Math, obj);
    }
    if (!iterator && _.isEmpty(obj)) return Infinity;
    var result = {computed : Infinity, value: Infinity};
    each(obj, function(value, index, list) {
      var computed = iterator ? iterator.call(context, value, index, list) : value;
      computed < result.computed && (result = {value : value, computed : computed});
    });
    return result.value;
  };

  // Shuffle an array.
  _.shuffle = function(obj) {
    var rand;
    var index = 0;
    var shuffled = [];
    each(obj, function(value) {
      rand = _.random(index++);
      shuffled[index - 1] = shuffled[rand];
      shuffled[rand] = value;
    });
    return shuffled;
  };

  // An internal function to generate lookup iterators.
  var lookupIterator = function(value) {
    return _.isFunction(value) ? value : function(obj){ return obj[value]; };
  };

  // Sort the object's values by a criterion produced by an iterator.
  _.sortBy = function(obj, value, context) {
    var iterator = lookupIterator(value);
    return _.pluck(_.map(obj, function(value, index, list) {
      return {
        value : value,
        index : index,
        criteria : iterator.call(context, value, index, list)
      };
    }).sort(function(left, right) {
      var a = left.criteria;
      var b = right.criteria;
      if (a !== b) {
        if (a > b || a === void 0) return 1;
        if (a < b || b === void 0) return -1;
      }
      return left.index < right.index ? -1 : 1;
    }), 'value');
  };

  // An internal function used for aggregate "group by" operations.
  var group = function(obj, value, context, behavior) {
    var result = {};
    var iterator = lookupIterator(value || _.identity);
    each(obj, function(value, index) {
      var key = iterator.call(context, value, index, obj);
      behavior(result, key, value);
    });
    return result;
  };

  // Groups the object's values by a criterion. Pass either a string attribute
  // to group by, or a function that returns the criterion.
  _.groupBy = function(obj, value, context) {
    return group(obj, value, context, function(result, key, value) {
      (_.has(result, key) ? result[key] : (result[key] = [])).push(value);
    });
  };

  // Counts instances of an object that group by a certain criterion. Pass
  // either a string attribute to count by, or a function that returns the
  // criterion.
  _.countBy = function(obj, value, context) {
    return group(obj, value, context, function(result, key) {
      if (!_.has(result, key)) result[key] = 0;
      result[key]++;
    });
  };

  // Use a comparator function to figure out the smallest index at which
  // an object should be inserted so as to maintain order. Uses binary search.
  _.sortedIndex = function(array, obj, iterator, context) {
    iterator = iterator == null ? _.identity : lookupIterator(iterator);
    var value = iterator.call(context, obj);
    var low = 0, high = array.length;
    while (low < high) {
      var mid = (low + high) >>> 1;
      iterator.call(context, array[mid]) < value ? low = mid + 1 : high = mid;
    }
    return low;
  };

  // Safely convert anything iterable into a real, live array.
  _.toArray = function(obj) {
    if (!obj) return [];
    if (_.isArray(obj)) return slice.call(obj);
    if (obj.length === +obj.length) return _.map(obj, _.identity);
    return _.values(obj);
  };

  // Return the number of elements in an object.
  _.size = function(obj) {
    if (obj == null) return 0;
    return (obj.length === +obj.length) ? obj.length : _.keys(obj).length;
  };

  // Array Functions
  // ---------------

  // Get the first element of an array. Passing **n** will return the first N
  // values in the array. Aliased as `head` and `take`. The **guard** check
  // allows it to work with `_.map`.
  _.first = _.head = _.take = function(array, n, guard) {
    if (array == null) return void 0;
    return (n != null) && !guard ? slice.call(array, 0, n) : array[0];
  };

  // Returns everything but the last entry of the array. Especially useful on
  // the arguments object. Passing **n** will return all the values in
  // the array, excluding the last N. The **guard** check allows it to work with
  // `_.map`.
  _.initial = function(array, n, guard) {
    return slice.call(array, 0, array.length - ((n == null) || guard ? 1 : n));
  };

  // Get the last element of an array. Passing **n** will return the last N
  // values in the array. The **guard** check allows it to work with `_.map`.
  _.last = function(array, n, guard) {
    if (array == null) return void 0;
    if ((n != null) && !guard) {
      return slice.call(array, Math.max(array.length - n, 0));
    } else {
      return array[array.length - 1];
    }
  };

  // Returns everything but the first entry of the array. Aliased as `tail` and `drop`.
  // Especially useful on the arguments object. Passing an **n** will return
  // the rest N values in the array. The **guard**
  // check allows it to work with `_.map`.
  _.rest = _.tail = _.drop = function(array, n, guard) {
    return slice.call(array, (n == null) || guard ? 1 : n);
  };

  // Trim out all falsy values from an array.
  _.compact = function(array) {
    return _.filter(array, _.identity);
  };

  // Internal implementation of a recursive `flatten` function.
  var flatten = function(input, shallow, output) {
    each(input, function(value) {
      if (_.isArray(value)) {
        shallow ? push.apply(output, value) : flatten(value, shallow, output);
      } else {
        output.push(value);
      }
    });
    return output;
  };

  // Return a completely flattened version of an array.
  _.flatten = function(array, shallow) {
    return flatten(array, shallow, []);
  };

  // Return a version of the array that does not contain the specified value(s).
  _.without = function(array) {
    return _.difference(array, slice.call(arguments, 1));
  };

  // Produce a duplicate-free version of the array. If the array has already
  // been sorted, you have the option of using a faster algorithm.
  // Aliased as `unique`.
  _.uniq = _.unique = function(array, isSorted, iterator, context) {
    if (_.isFunction(isSorted)) {
      context = iterator;
      iterator = isSorted;
      isSorted = false;
    }
    var initial = iterator ? _.map(array, iterator, context) : array;
    var results = [];
    var seen = [];
    each(initial, function(value, index) {
      if (isSorted ? (!index || seen[seen.length - 1] !== value) : !_.contains(seen, value)) {
        seen.push(value);
        results.push(array[index]);
      }
    });
    return results;
  };

  // Produce an array that contains the union: each distinct element from all of
  // the passed-in arrays.
  _.union = function() {
    return _.uniq(concat.apply(ArrayProto, arguments));
  };

  // Produce an array that contains every item shared between all the
  // passed-in arrays.
  _.intersection = function(array) {
    var rest = slice.call(arguments, 1);
    return _.filter(_.uniq(array), function(item) {
      return _.every(rest, function(other) {
        return _.indexOf(other, item) >= 0;
      });
    });
  };

  // Take the difference between one array and a number of other arrays.
  // Only the elements present in just the first array will remain.
  _.difference = function(array) {
    var rest = concat.apply(ArrayProto, slice.call(arguments, 1));
    return _.filter(array, function(value){ return !_.contains(rest, value); });
  };

  // Zip together multiple lists into a single array -- elements that share
  // an index go together.
  _.zip = function() {
    var args = slice.call(arguments);
    var length = _.max(_.pluck(args, 'length'));
    var results = new Array(length);
    for (var i = 0; i < length; i++) {
      results[i] = _.pluck(args, "" + i);
    }
    return results;
  };

  // Converts lists into objects. Pass either a single array of `[key, value]`
  // pairs, or two parallel arrays of the same length -- one of keys, and one of
  // the corresponding values.
  _.object = function(list, values) {
    if (list == null) return {};
    var result = {};
    for (var i = 0, l = list.length; i < l; i++) {
      if (values) {
        result[list[i]] = values[i];
      } else {
        result[list[i][0]] = list[i][1];
      }
    }
    return result;
  };

  // If the browser doesn't supply us with indexOf (I'm looking at you, **MSIE**),
  // we need this function. Return the position of the first occurrence of an
  // item in an array, or -1 if the item is not included in the array.
  // Delegates to **ECMAScript 5**'s native `indexOf` if available.
  // If the array is large and already in sort order, pass `true`
  // for **isSorted** to use binary search.
  _.indexOf = function(array, item, isSorted) {
    if (array == null) return -1;
    var i = 0, l = array.length;
    if (isSorted) {
      if (typeof isSorted == 'number') {
        i = (isSorted < 0 ? Math.max(0, l + isSorted) : isSorted);
      } else {
        i = _.sortedIndex(array, item);
        return array[i] === item ? i : -1;
      }
    }
    if (nativeIndexOf && array.indexOf === nativeIndexOf) return array.indexOf(item, isSorted);
    for (; i < l; i++) if (array[i] === item) return i;
    return -1;
  };

  // Delegates to **ECMAScript 5**'s native `lastIndexOf` if available.
  _.lastIndexOf = function(array, item, from) {
    if (array == null) return -1;
    var hasIndex = from != null;
    if (nativeLastIndexOf && array.lastIndexOf === nativeLastIndexOf) {
      return hasIndex ? array.lastIndexOf(item, from) : array.lastIndexOf(item);
    }
    var i = (hasIndex ? from : array.length);
    while (i--) if (array[i] === item) return i;
    return -1;
  };

  // Generate an integer Array containing an arithmetic progression. A port of
  // the native Python `range()` function. See
  // [the Python documentation](http://docs.python.org/library/functions.html#range).
  _.range = function(start, stop, step) {
    if (arguments.length <= 1) {
      stop = start || 0;
      start = 0;
    }
    step = arguments[2] || 1;

    var len = Math.max(Math.ceil((stop - start) / step), 0);
    var idx = 0;
    var range = new Array(len);

    while(idx < len) {
      range[idx++] = start;
      start += step;
    }

    return range;
  };

  // Function (ahem) Functions
  // ------------------

  // Reusable constructor function for prototype setting.
  var ctor = function(){};

  // Create a function bound to a given object (assigning `this`, and arguments,
  // optionally). Binding with arguments is also known as `curry`.
  // Delegates to **ECMAScript 5**'s native `Function.bind` if available.
  // We check for `func.bind` first, to fail fast when `func` is undefined.
  _.bind = function(func, context) {
    var args, bound;
    if (func.bind === nativeBind && nativeBind) return nativeBind.apply(func, slice.call(arguments, 1));
    if (!_.isFunction(func)) throw new TypeError;
    args = slice.call(arguments, 2);
    return bound = function() {
      if (!(this instanceof bound)) return func.apply(context, args.concat(slice.call(arguments)));
      ctor.prototype = func.prototype;
      var self = new ctor;
      ctor.prototype = null;
      var result = func.apply(self, args.concat(slice.call(arguments)));
      if (Object(result) === result) return result;
      return self;
    };
  };

  // Bind all of an object's methods to that object. Useful for ensuring that
  // all callbacks defined on an object belong to it.
  _.bindAll = function(obj) {
    var funcs = slice.call(arguments, 1);
    if (funcs.length === 0) funcs = _.functions(obj);
    each(funcs, function(f) { obj[f] = _.bind(obj[f], obj); });
    return obj;
  };

  // Memoize an expensive function by storing its results.
  _.memoize = function(func, hasher) {
    var memo = {};
    hasher || (hasher = _.identity);
    return function() {
      var key = hasher.apply(this, arguments);
      return _.has(memo, key) ? memo[key] : (memo[key] = func.apply(this, arguments));
    };
  };

  // Delays a function for the given number of milliseconds, and then calls
  // it with the arguments supplied.
  _.delay = function(func, wait) {
    var args = slice.call(arguments, 2);
    return setTimeout(function(){ return func.apply(null, args); }, wait);
  };

  // Defers a function, scheduling it to run after the current call stack has
  // cleared.
  _.defer = function(func) {
    return _.delay.apply(_, [func, 1].concat(slice.call(arguments, 1)));
  };

  // Returns a function, that, when invoked, will only be triggered at most once
  // during a given window of time.
  _.throttle = function(func, wait) {
    var context, args, timeout, result;
    var previous = 0;
    var later = function() {
      previous = new Date;
      timeout = null;
      result = func.apply(context, args);
    };
    return function() {
      var now = new Date;
      var remaining = wait - (now - previous);
      context = this;
      args = arguments;
      if (remaining <= 0) {
        clearTimeout(timeout);
        timeout = null;
        previous = now;
        result = func.apply(context, args);
      } else if (!timeout) {
        timeout = setTimeout(later, remaining);
      }
      return result;
    };
  };

  // Returns a function, that, as long as it continues to be invoked, will not
  // be triggered. The function will be called after it stops being called for
  // N milliseconds. If `immediate` is passed, trigger the function on the
  // leading edge, instead of the trailing.
  _.debounce = function(func, wait, immediate) {
    var timeout, result;
    return function() {
      var context = this, args = arguments;
      var later = function() {
        timeout = null;
        if (!immediate) result = func.apply(context, args);
      };
      var callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      if (callNow) result = func.apply(context, args);
      return result;
    };
  };

  // Returns a function that will be executed at most one time, no matter how
  // often you call it. Useful for lazy initialization.
  _.once = function(func) {
    var ran = false, memo;
    return function() {
      if (ran) return memo;
      ran = true;
      memo = func.apply(this, arguments);
      func = null;
      return memo;
    };
  };

  // Returns the first function passed as an argument to the second,
  // allowing you to adjust arguments, run code before and after, and
  // conditionally execute the original function.
  _.wrap = function(func, wrapper) {
    return function() {
      var args = [func];
      push.apply(args, arguments);
      return wrapper.apply(this, args);
    };
  };

  // Returns a function that is the composition of a list of functions, each
  // consuming the return value of the function that follows.
  _.compose = function() {
    var funcs = arguments;
    return function() {
      var args = arguments;
      for (var i = funcs.length - 1; i >= 0; i--) {
        args = [funcs[i].apply(this, args)];
      }
      return args[0];
    };
  };

  // Returns a function that will only be executed after being called N times.
  _.after = function(times, func) {
    if (times <= 0) return func();
    return function() {
      if (--times < 1) {
        return func.apply(this, arguments);
      }
    };
  };

  // Object Functions
  // ----------------

  // Retrieve the names of an object's properties.
  // Delegates to **ECMAScript 5**'s native `Object.keys`
  _.keys = nativeKeys || function(obj) {
    if (obj !== Object(obj)) throw new TypeError('Invalid object');
    var keys = [];
    for (var key in obj) if (_.has(obj, key)) keys[keys.length] = key;
    return keys;
  };

  // Retrieve the values of an object's properties.
  _.values = function(obj) {
    var values = [];
    for (var key in obj) if (_.has(obj, key)) values.push(obj[key]);
    return values;
  };

  // Convert an object into a list of `[key, value]` pairs.
  _.pairs = function(obj) {
    var pairs = [];
    for (var key in obj) if (_.has(obj, key)) pairs.push([key, obj[key]]);
    return pairs;
  };

  // Invert the keys and values of an object. The values must be serializable.
  _.invert = function(obj) {
    var result = {};
    for (var key in obj) if (_.has(obj, key)) result[obj[key]] = key;
    return result;
  };

  // Return a sorted list of the function names available on the object.
  // Aliased as `methods`
  _.functions = _.methods = function(obj) {
    var names = [];
    for (var key in obj) {
      if (_.isFunction(obj[key])) names.push(key);
    }
    return names.sort();
  };

  // Extend a given object with all the properties in passed-in object(s).
  _.extend = function(obj) {
    each(slice.call(arguments, 1), function(source) {
      if (source) {
        for (var prop in source) {
          obj[prop] = source[prop];
        }
      }
    });
    return obj;
  };

  // Return a copy of the object only containing the whitelisted properties.
  _.pick = function(obj) {
    var copy = {};
    var keys = concat.apply(ArrayProto, slice.call(arguments, 1));
    each(keys, function(key) {
      if (key in obj) copy[key] = obj[key];
    });
    return copy;
  };

   // Return a copy of the object without the blacklisted properties.
  _.omit = function(obj) {
    var copy = {};
    var keys = concat.apply(ArrayProto, slice.call(arguments, 1));
    for (var key in obj) {
      if (!_.contains(keys, key)) copy[key] = obj[key];
    }
    return copy;
  };

  // Fill in a given object with default properties.
  _.defaults = function(obj) {
    each(slice.call(arguments, 1), function(source) {
      if (source) {
        for (var prop in source) {
          if (obj[prop] == null) obj[prop] = source[prop];
        }
      }
    });
    return obj;
  };

  // Create a (shallow-cloned) duplicate of an object.
  _.clone = function(obj) {
    if (!_.isObject(obj)) return obj;
    return _.isArray(obj) ? obj.slice() : _.extend({}, obj);
  };

  // Invokes interceptor with the obj, and then returns obj.
  // The primary purpose of this method is to "tap into" a method chain, in
  // order to perform operations on intermediate results within the chain.
  _.tap = function(obj, interceptor) {
    interceptor(obj);
    return obj;
  };

  // Internal recursive comparison function for `isEqual`.
  var eq = function(a, b, aStack, bStack) {
    // Identical objects are equal. `0 === -0`, but they aren't identical.
    // See the Harmony `egal` proposal: http://wiki.ecmascript.org/doku.php?id=harmony:egal.
    if (a === b) return a !== 0 || 1 / a == 1 / b;
    // A strict comparison is necessary because `null == undefined`.
    if (a == null || b == null) return a === b;
    // Unwrap any wrapped objects.
    if (a instanceof _) a = a._wrapped;
    if (b instanceof _) b = b._wrapped;
    // Compare `[[Class]]` names.
    var className = toString.call(a);
    if (className != toString.call(b)) return false;
    switch (className) {
      // Strings, numbers, dates, and booleans are compared by value.
      case '[object String]':
        // Primitives and their corresponding object wrappers are equivalent; thus, `"5"` is
        // equivalent to `new String("5")`.
        return a == String(b);
      case '[object Number]':
        // `NaN`s are equivalent, but non-reflexive. An `egal` comparison is performed for
        // other numeric values.
        return a != +a ? b != +b : (a == 0 ? 1 / a == 1 / b : a == +b);
      case '[object Date]':
      case '[object Boolean]':
        // Coerce dates and booleans to numeric primitive values. Dates are compared by their
        // millisecond representations. Note that invalid dates with millisecond representations
        // of `NaN` are not equivalent.
        return +a == +b;
      // RegExps are compared by their source patterns and flags.
      case '[object RegExp]':
        return a.source == b.source &&
               a.global == b.global &&
               a.multiline == b.multiline &&
               a.ignoreCase == b.ignoreCase;
    }
    if (typeof a != 'object' || typeof b != 'object') return false;
    // Assume equality for cyclic structures. The algorithm for detecting cyclic
    // structures is adapted from ES 5.1 section 15.12.3, abstract operation `JO`.
    var length = aStack.length;
    while (length--) {
      // Linear search. Performance is inversely proportional to the number of
      // unique nested structures.
      if (aStack[length] == a) return bStack[length] == b;
    }
    // Add the first object to the stack of traversed objects.
    aStack.push(a);
    bStack.push(b);
    var size = 0, result = true;
    // Recursively compare objects and arrays.
    if (className == '[object Array]') {
      // Compare array lengths to determine if a deep comparison is necessary.
      size = a.length;
      result = size == b.length;
      if (result) {
        // Deep compare the contents, ignoring non-numeric properties.
        while (size--) {
          if (!(result = eq(a[size], b[size], aStack, bStack))) break;
        }
      }
    } else {
      // Objects with different constructors are not equivalent, but `Object`s
      // from different frames are.
      var aCtor = a.constructor, bCtor = b.constructor;
      if (aCtor !== bCtor && !(_.isFunction(aCtor) && (aCtor instanceof aCtor) &&
                               _.isFunction(bCtor) && (bCtor instanceof bCtor))) {
        return false;
      }
      // Deep compare objects.
      for (var key in a) {
        if (_.has(a, key)) {
          // Count the expected number of properties.
          size++;
          // Deep compare each member.
          if (!(result = _.has(b, key) && eq(a[key], b[key], aStack, bStack))) break;
        }
      }
      // Ensure that both objects contain the same number of properties.
      if (result) {
        for (key in b) {
          if (_.has(b, key) && !(size--)) break;
        }
        result = !size;
      }
    }
    // Remove the first object from the stack of traversed objects.
    aStack.pop();
    bStack.pop();
    return result;
  };

  // Perform a deep comparison to check if two objects are equal.
  _.isEqual = function(a, b) {
    return eq(a, b, [], []);
  };

  // Is a given array, string, or object empty?
  // An "empty" object has no enumerable own-properties.
  _.isEmpty = function(obj) {
    if (obj == null) return true;
    if (_.isArray(obj) || _.isString(obj)) return obj.length === 0;
    for (var key in obj) if (_.has(obj, key)) return false;
    return true;
  };

  // Is a given value a DOM element?
  _.isElement = function(obj) {
    return !!(obj && obj.nodeType === 1);
  };

  // Is a given value an array?
  // Delegates to ECMA5's native Array.isArray
  _.isArray = nativeIsArray || function(obj) {
    return toString.call(obj) == '[object Array]';
  };

  // Is a given variable an object?
  _.isObject = function(obj) {
    return obj === Object(obj);
  };

  // Add some isType methods: isArguments, isFunction, isString, isNumber, isDate, isRegExp.
  each(['Arguments', 'Function', 'String', 'Number', 'Date', 'RegExp'], function(name) {
    _['is' + name] = function(obj) {
      return toString.call(obj) == '[object ' + name + ']';
    };
  });

  // Define a fallback version of the method in browsers (ahem, IE), where
  // there isn't any inspectable "Arguments" type.
  if (!_.isArguments(arguments)) {
    _.isArguments = function(obj) {
      return !!(obj && _.has(obj, 'callee'));
    };
  }

  // Optimize `isFunction` if appropriate.
  if (typeof (/./) !== 'function') {
    _.isFunction = function(obj) {
      return typeof obj === 'function';
    };
  }

  // Is a given object a finite number?
  _.isFinite = function(obj) {
    return isFinite(obj) && !isNaN(parseFloat(obj));
  };

  // Is the given value `NaN`? (NaN is the only number which does not equal itself).
  _.isNaN = function(obj) {
    return _.isNumber(obj) && obj != +obj;
  };

  // Is a given value a boolean?
  _.isBoolean = function(obj) {
    return obj === true || obj === false || toString.call(obj) == '[object Boolean]';
  };

  // Is a given value equal to null?
  _.isNull = function(obj) {
    return obj === null;
  };

  // Is a given variable undefined?
  _.isUndefined = function(obj) {
    return obj === void 0;
  };

  // Shortcut function for checking if an object has a given property directly
  // on itself (in other words, not on a prototype).
  _.has = function(obj, key) {
    return hasOwnProperty.call(obj, key);
  };

  // Utility Functions
  // -----------------

  // Run Underscore.js in *noConflict* mode, returning the `_` variable to its
  // previous owner. Returns a reference to the Underscore object.
  _.noConflict = function() {
    root._ = previousUnderscore;
    return this;
  };

  // Keep the identity function around for default iterators.
  _.identity = function(value) {
    return value;
  };

  // Run a function **n** times.
  _.times = function(n, iterator, context) {
    var accum = Array(n);
    for (var i = 0; i < n; i++) accum[i] = iterator.call(context, i);
    return accum;
  };

  // Return a random integer between min and max (inclusive).
  _.random = function(min, max) {
    if (max == null) {
      max = min;
      min = 0;
    }
    return min + (0 | Math.random() * (max - min + 1));
  };

  // List of HTML entities for escaping.
  var entityMap = {
    escape: {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;'
    }
  };
  entityMap.unescape = _.invert(entityMap.escape);

  // Regexes containing the keys and values listed immediately above.
  var entityRegexes = {
    escape:   new RegExp('[' + _.keys(entityMap.escape).join('') + ']', 'g'),
    unescape: new RegExp('(' + _.keys(entityMap.unescape).join('|') + ')', 'g')
  };

  // Functions for escaping and unescaping strings to/from HTML interpolation.
  _.each(['escape', 'unescape'], function(method) {
    _[method] = function(string) {
      if (string == null) return '';
      return ('' + string).replace(entityRegexes[method], function(match) {
        return entityMap[method][match];
      });
    };
  });

  // If the value of the named property is a function then invoke it;
  // otherwise, return it.
  _.result = function(object, property) {
    if (object == null) return null;
    var value = object[property];
    return _.isFunction(value) ? value.call(object) : value;
  };

  // Add your own custom functions to the Underscore object.
  _.mixin = function(obj) {
    each(_.functions(obj), function(name){
      var func = _[name] = obj[name];
      _.prototype[name] = function() {
        var args = [this._wrapped];
        push.apply(args, arguments);
        return result.call(this, func.apply(_, args));
      };
    });
  };

  // Generate a unique integer id (unique within the entire client session).
  // Useful for temporary DOM ids.
  var idCounter = 0;
  _.uniqueId = function(prefix) {
    var id = ++idCounter + '';
    return prefix ? prefix + id : id;
  };

  // By default, Underscore uses ERB-style template delimiters, change the
  // following template settings to use alternative delimiters.
  _.templateSettings = {
    evaluate    : /<%([\s\S]+?)%>/g,
    interpolate : /<%=([\s\S]+?)%>/g,
    escape      : /<%-([\s\S]+?)%>/g
  };

  // When customizing `templateSettings`, if you don't want to define an
  // interpolation, evaluation or escaping regex, we need one that is
  // guaranteed not to match.
  var noMatch = /(.)^/;

  // Certain characters need to be escaped so that they can be put into a
  // string literal.
  var escapes = {
    "'":      "'",
    '\\':     '\\',
    '\r':     'r',
    '\n':     'n',
    '\t':     't',
    '\u2028': 'u2028',
    '\u2029': 'u2029'
  };

  var escaper = /\\|'|\r|\n|\t|\u2028|\u2029/g;

  // JavaScript micro-templating, similar to John Resig's implementation.
  // Underscore templating handles arbitrary delimiters, preserves whitespace,
  // and correctly escapes quotes within interpolated code.
  _.template = function(text, data, settings) {
    var render;
    settings = _.defaults({}, settings, _.templateSettings);

    // Combine delimiters into one regular expression via alternation.
    var matcher = new RegExp([
      (settings.escape || noMatch).source,
      (settings.interpolate || noMatch).source,
      (settings.evaluate || noMatch).source
    ].join('|') + '|$', 'g');

    // Compile the template source, escaping string literals appropriately.
    var index = 0;
    var source = "__p+='";
    text.replace(matcher, function(match, escape, interpolate, evaluate, offset) {
      source += text.slice(index, offset)
        .replace(escaper, function(match) { return '\\' + escapes[match]; });

      if (escape) {
        source += "'+\n((__t=(" + escape + "))==null?'':_.escape(__t))+\n'";
      }
      if (interpolate) {
        source += "'+\n((__t=(" + interpolate + "))==null?'':__t)+\n'";
      }
      if (evaluate) {
        source += "';\n" + evaluate + "\n__p+='";
      }
      index = offset + match.length;
      return match;
    });
    source += "';\n";

    // If a variable is not specified, place data values in local scope.
    if (!settings.variable) source = 'with(obj||{}){\n' + source + '}\n';

    source = "var __t,__p='',__j=Array.prototype.join," +
      "print=function(){__p+=__j.call(arguments,'');};\n" +
      source + "return __p;\n";

    try {
      render = new Function(settings.variable || 'obj', '_', source);
    } catch (e) {
      e.source = source;
      throw e;
    }

    if (data) return render(data, _);
    var template = function(data) {
      return render.call(this, data, _);
    };

    // Provide the compiled function source as a convenience for precompilation.
    template.source = 'function(' + (settings.variable || 'obj') + '){\n' + source + '}';

    return template;
  };

  // Add a "chain" function, which will delegate to the wrapper.
  _.chain = function(obj) {
    return _(obj).chain();
  };

  // OOP
  // ---------------
  // If Underscore is called as a function, it returns a wrapped object that
  // can be used OO-style. This wrapper holds altered versions of all the
  // underscore functions. Wrapped objects may be chained.

  // Helper function to continue chaining intermediate results.
  var result = function(obj) {
    return this._chain ? _(obj).chain() : obj;
  };

  // Add all of the Underscore functions to the wrapper object.
  _.mixin(_);

  // Add all mutator Array functions to the wrapper.
  each(['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      var obj = this._wrapped;
      method.apply(obj, arguments);
      if ((name == 'shift' || name == 'splice') && obj.length === 0) delete obj[0];
      return result.call(this, obj);
    };
  });

  // Add all accessor Array functions to the wrapper.
  each(['concat', 'join', 'slice'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      return result.call(this, method.apply(this._wrapped, arguments));
    };
  });

  _.extend(_.prototype, {

    // Start chaining a wrapped Underscore object.
    chain: function() {
      this._chain = true;
      return this;
    },

    // Extracts the result from a wrapped and chained object.
    value: function() {
      return this._wrapped;
    }

  });

}).call(this);
DEBUG = true;

String.prototype.leftPad = function (l, c) { return new Array(l - this.length + 1).join(c || ' ') + this; }

var fn = {
  log: function() {
    if (DEBUG) console.log(arguments.callee.caller.name.toString().leftPad(20), arguments);
  },

  getjQueryElements: function(object) {
    var result = {};
    for (var key in object) {
      result[key] = $(object[key]);
    }
    return result;
  }
};
(function() {
  var CSRFToken, anchoredLink, browserCompatibleDocumentParser, browserIsntBuggy, browserSupportsPushState, cacheCurrentPage, cacheSize, changePage, constrainPageCacheTo, createDocument, crossOriginLink, currentState, executeScriptTags, extractLink, extractTitleAndBody, fetchHistory, fetchReplacement, handleClick, ignoreClick, initializeTurbolinks, installClickHandlerLast, loadedAssets, noTurbolink, nonHtmlLink, nonStandardClick, pageCache, pageChangePrevented, pagesCached, processResponse, recallScrollPosition, referer, reflectNewUrl, reflectRedirectedUrl, rememberCurrentState, rememberCurrentUrl, removeHash, removeNoscriptTags, requestMethod, requestMethodIsSafe, resetScrollPosition, targetLink, triggerEvent, visit, xhr, _ref,
    __hasProp = {}.hasOwnProperty,
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  cacheSize = 10;

  currentState = null;

  referer = null;

  loadedAssets = null;

  pageCache = {};

  createDocument = null;

  requestMethod = ((_ref = document.cookie.match(/request_method=(\w+)/)) != null ? _ref[1].toUpperCase() : void 0) || '';

  xhr = null;

  fetchReplacement = function(url) {
    var safeUrl;
    triggerEvent('page:fetch');
    safeUrl = removeHash(url);
    if (xhr != null) {
      xhr.abort();
    }
    xhr = new XMLHttpRequest;
    xhr.open('GET', safeUrl, true);
    xhr.setRequestHeader('Accept', 'text/html, application/xhtml+xml, application/xml');
    xhr.setRequestHeader('X-XHR-Referer', referer);
    xhr.onload = function() {
      var doc;
      triggerEvent('page:receive');
      if (doc = processResponse()) {
        reflectNewUrl(url);
        changePage.apply(null, extractTitleAndBody(doc));
        reflectRedirectedUrl();
        if (document.location.hash) {
          document.location.href = document.location.href;
        } else {
          resetScrollPosition();
        }
        return triggerEvent('page:load');
      } else {
        return document.location.href = url;
      }
    };
    xhr.onloadend = function() {
      return xhr = null;
    };
    xhr.onabort = function() {
      return rememberCurrentUrl();
    };
    xhr.onerror = function() {
      return document.location.href = url;
    };
    return xhr.send();
  };

  fetchHistory = function(position) {
    var page;
    cacheCurrentPage();
    page = pageCache[position];
    if (xhr != null) {
      xhr.abort();
    }
    changePage(page.title, page.body);
    recallScrollPosition(page);
    return triggerEvent('page:restore');
  };

  cacheCurrentPage = function() {
    pageCache[currentState.position] = {
      url: document.location.href,
      body: document.body,
      title: document.title,
      positionY: window.pageYOffset,
      positionX: window.pageXOffset
    };
    return constrainPageCacheTo(cacheSize);
  };

  pagesCached = function(size) {
    if (size == null) {
      size = cacheSize;
    }
    if (/^[\d]+$/.test(size)) {
      return cacheSize = parseInt(size);
    }
  };

  constrainPageCacheTo = function(limit) {
    var key, value;
    for (key in pageCache) {
      if (!__hasProp.call(pageCache, key)) continue;
      value = pageCache[key];
      if (key <= currentState.position - limit) {
        pageCache[key] = null;
      }
    }
  };

  changePage = function(title, body, csrfToken, runScripts) {
    document.title = title;
    document.documentElement.replaceChild(body, document.body);
    if (csrfToken != null) {
      CSRFToken.update(csrfToken);
    }
    removeNoscriptTags();
    if (runScripts) {
      executeScriptTags();
    }
    currentState = window.history.state;
    return triggerEvent('page:change');
  };

  executeScriptTags = function() {
    var attr, copy, nextSibling, parentNode, script, scripts, _i, _j, _len, _len1, _ref1, _ref2;
    scripts = Array.prototype.slice.call(document.body.querySelectorAll('script:not([data-turbolinks-eval="false"])'));
    for (_i = 0, _len = scripts.length; _i < _len; _i++) {
      script = scripts[_i];
      if (!((_ref1 = script.type) === '' || _ref1 === 'text/javascript')) {
        continue;
      }
      copy = document.createElement('script');
      _ref2 = script.attributes;
      for (_j = 0, _len1 = _ref2.length; _j < _len1; _j++) {
        attr = _ref2[_j];
        copy.setAttribute(attr.name, attr.value);
      }
      copy.appendChild(document.createTextNode(script.innerHTML));
      parentNode = script.parentNode, nextSibling = script.nextSibling;
      parentNode.removeChild(script);
      parentNode.insertBefore(copy, nextSibling);
    }
  };

  removeNoscriptTags = function() {
    var noscript, noscriptTags, _i, _len;
    noscriptTags = Array.prototype.slice.call(document.body.getElementsByTagName('noscript'));
    for (_i = 0, _len = noscriptTags.length; _i < _len; _i++) {
      noscript = noscriptTags[_i];
      noscript.parentNode.removeChild(noscript);
    }
  };

  reflectNewUrl = function(url) {
    if (url !== referer) {
      return window.history.pushState({
        turbolinks: true,
        position: currentState.position + 1
      }, '', url);
    }
  };

  reflectRedirectedUrl = function() {
    var location, preservedHash;
    if (location = xhr.getResponseHeader('X-XHR-Redirected-To')) {
      preservedHash = removeHash(location) === location ? document.location.hash : '';
      return window.history.replaceState(currentState, '', location + preservedHash);
    }
  };

  rememberCurrentUrl = function() {
    return window.history.replaceState({
      turbolinks: true,
      position: Date.now()
    }, '', document.location.href);
  };

  rememberCurrentState = function() {
    return currentState = window.history.state;
  };

  recallScrollPosition = function(page) {
    return window.scrollTo(page.positionX, page.positionY);
  };

  resetScrollPosition = function() {
    return window.scrollTo(0, 0);
  };

  removeHash = function(url) {
    var link;
    link = url;
    if (url.href == null) {
      link = document.createElement('A');
      link.href = url;
    }
    return link.href.replace(link.hash, '');
  };

  triggerEvent = function(name) {
    var event;
    event = document.createEvent('Events');
    event.initEvent(name, true, true);
    return document.dispatchEvent(event);
  };

  pageChangePrevented = function() {
    return !triggerEvent('page:before-change');
  };

  processResponse = function() {
    var assetsChanged, clientOrServerError, doc, extractTrackAssets, intersection, validContent;
    clientOrServerError = function() {
      var _ref1;
      return (400 <= (_ref1 = xhr.status) && _ref1 < 600);
    };
    validContent = function() {
      return xhr.getResponseHeader('Content-Type').match(/^(?:text\/html|application\/xhtml\+xml|application\/xml)(?:;|$)/);
    };
    extractTrackAssets = function(doc) {
      var node, _i, _len, _ref1, _results;
      _ref1 = doc.head.childNodes;
      _results = [];
      for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
        node = _ref1[_i];
        if ((typeof node.getAttribute === "function" ? node.getAttribute('data-turbolinks-track') : void 0) != null) {
          _results.push(node.src || node.href);
        }
      }
      return _results;
    };
    assetsChanged = function(doc) {
      var fetchedAssets;
      loadedAssets || (loadedAssets = extractTrackAssets(document));
      fetchedAssets = extractTrackAssets(doc);
      return fetchedAssets.length !== loadedAssets.length || intersection(fetchedAssets, loadedAssets).length !== loadedAssets.length;
    };
    intersection = function(a, b) {
      var value, _i, _len, _ref1, _results;
      if (a.length > b.length) {
        _ref1 = [b, a], a = _ref1[0], b = _ref1[1];
      }
      _results = [];
      for (_i = 0, _len = a.length; _i < _len; _i++) {
        value = a[_i];
        if (__indexOf.call(b, value) >= 0) {
          _results.push(value);
        }
      }
      return _results;
    };
    if (!clientOrServerError() && validContent()) {
      doc = createDocument(xhr.responseText);
      if (doc && !assetsChanged(doc)) {
        return doc;
      }
    }
  };

  extractTitleAndBody = function(doc) {
    var title;
    title = doc.querySelector('title');
    return [title != null ? title.textContent : void 0, doc.body, CSRFToken.get(doc).token, 'runScripts'];
  };

  CSRFToken = {
    get: function(doc) {
      var tag;
      if (doc == null) {
        doc = document;
      }
      return {
        node: tag = doc.querySelector('meta[name="csrf-token"]'),
        token: tag != null ? typeof tag.getAttribute === "function" ? tag.getAttribute('content') : void 0 : void 0
      };
    },
    update: function(latest) {
      var current;
      current = this.get();
      if ((current.token != null) && (latest != null) && current.token !== latest) {
        return current.node.setAttribute('content', latest);
      }
    }
  };

  browserCompatibleDocumentParser = function() {
    var createDocumentUsingDOM, createDocumentUsingParser, createDocumentUsingWrite, e, testDoc, _ref1;
    createDocumentUsingParser = function(html) {
      return (new DOMParser).parseFromString(html, 'text/html');
    };
    createDocumentUsingDOM = function(html) {
      var doc;
      doc = document.implementation.createHTMLDocument('');
      doc.documentElement.innerHTML = html;
      return doc;
    };
    createDocumentUsingWrite = function(html) {
      var doc;
      doc = document.implementation.createHTMLDocument('');
      doc.open('replace');
      doc.write(html);
      doc.close();
      return doc;
    };
    try {
      if (window.DOMParser) {
        testDoc = createDocumentUsingParser('<html><body><p>test');
        return createDocumentUsingParser;
      }
    } catch (_error) {
      e = _error;
      testDoc = createDocumentUsingDOM('<html><body><p>test');
      return createDocumentUsingDOM;
    } finally {
      if ((testDoc != null ? (_ref1 = testDoc.body) != null ? _ref1.childNodes.length : void 0 : void 0) !== 1) {
        return createDocumentUsingWrite;
      }
    }
  };

  installClickHandlerLast = function(event) {
    if (!event.defaultPrevented) {
      document.removeEventListener('click', handleClick, false);
      return document.addEventListener('click', handleClick, false);
    }
  };

  handleClick = function(event) {
    var link;
    if (!event.defaultPrevented) {
      link = extractLink(event);
      if (link.nodeName === 'A' && !ignoreClick(event, link)) {
        if (!pageChangePrevented()) {
          visit(link.href);
        }
        return event.preventDefault();
      }
    }
  };

  extractLink = function(event) {
    var link;
    link = event.target;
    while (!(!link.parentNode || link.nodeName === 'A')) {
      link = link.parentNode;
    }
    return link;
  };

  crossOriginLink = function(link) {
    return location.protocol !== link.protocol || location.host !== link.host;
  };

  anchoredLink = function(link) {
    return ((link.hash && removeHash(link)) === removeHash(location)) || (link.href === location.href + '#');
  };

  nonHtmlLink = function(link) {
    var url;
    url = removeHash(link);
    return url.match(/\.[a-z]+(\?.*)?$/g) && !url.match(/\.html?(\?.*)?$/g);
  };

  noTurbolink = function(link) {
    var ignore;
    while (!(ignore || link === document)) {
      ignore = link.getAttribute('data-no-turbolink') != null;
      link = link.parentNode;
    }
    return ignore;
  };

  targetLink = function(link) {
    return link.target.length !== 0;
  };

  nonStandardClick = function(event) {
    return event.which > 1 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
  };

  ignoreClick = function(event, link) {
    return crossOriginLink(link) || anchoredLink(link) || nonHtmlLink(link) || noTurbolink(link) || targetLink(link) || nonStandardClick(event);
  };

  initializeTurbolinks = function() {
    rememberCurrentUrl();
    rememberCurrentState();
    createDocument = browserCompatibleDocumentParser();
    document.addEventListener('click', installClickHandlerLast, true);
    return window.addEventListener('popstate', function(event) {
      var state;
      state = event.state;
      if (state != null ? state.turbolinks : void 0) {
        if (pageCache[state.position]) {
          return fetchHistory(state.position);
        } else {
          return visit(event.target.location.href);
        }
      }
    }, false);
  };

  browserSupportsPushState = window.history && window.history.pushState && window.history.replaceState && window.history.state !== void 0;

  browserIsntBuggy = !navigator.userAgent.match(/CriOS\//);

  requestMethodIsSafe = requestMethod === 'GET' || requestMethod === '';

  if (browserSupportsPushState && browserIsntBuggy && requestMethodIsSafe) {
    visit = function(url) {
      referer = document.location.href;
      cacheCurrentPage();
      return fetchReplacement(url);
    };
    initializeTurbolinks();
  } else {
    visit = function(url) {
      return document.location.href = url;
    };
  }

  this.Turbolinks = {
    visit: visit,
    pagesCached: pagesCached
  };

}).call(this);
var Routes = (function() {
  var routes, current;

  return {
    bind: function(routes) {
      this.routes = routes;
    },

    enter: function(page) {
      if (page === undefined)
        page = window.location.pathname;

      for (var route in this.routes) {
        if (new RegExp(route).test(page)) {
          current = this.routes[route];
          var to = current + ':enter';
          fn.log(to);
          $('body').addClass(current);
          $.publish(to);
          break;
        }
      }
    },

    leave: function() {
      var from = current + ':leave';
      fn.log(from);
      $('body').removeClass(current);
      $.publish(from);
      current = '';
    }
  };
})();
// Editor state variables
var state = {
  post         : null,
  preview      : false,
  changed      : false,
  editing      : false,
  beganEditing : false,
  barHidden    : false,
  barPinned    : false,
  saving       : false,
  lastKey      : 0,
  lines        : 0,
  colIndex     : 0,
  itemIndex    : [0, 0]
};

var el,
    $html = $('html');

$(function() {

  // Setup routes
  Routes.bind({
    'admin':    'index',
    'edit|new': 'edit'
  });

  Routes.enter();

  $(document)
    .on('page:fetch', function() {
      Routes.leave();
    })
    .on('page:load', function() {
      Routes.enter();
    })
    .on('page:restore', function() {
      Routes.leave();
      Routes.enter();
    });

  // Clear cache
  localStorage.clear();

  // Permanent bindings
  $(window)
    .mousemove(function windowMouseMove(e){
      addMovingClassToBodyIfMouseMoving();
    });

  // Avoid initial animations
  $('html').addClass('transition');

  // External links
  $('.open-external').click(function(e) {
    e.preventDefault();
    window.open($(this).attr('href'));
  });
});

function makeExpandingAreas() {
  makeExpandingArea(document.getElementById('text-title'));
  makeExpandingArea(document.getElementById('text-content'));
}


// Allows for auto expanding textareas
function makeExpandingArea(container) {
  var area = container.querySelector('textarea'),
      span = container.querySelector('span');

 if (area.addEventListener) {
   area.addEventListener('input', function makeExpandingAreaCallback() {
     span.textContent = area.value;
   }, false);
   span.textContent = area.value;
 } else if (area.attachEvent) {
   // IE8 compatibility
   area.attachEvent('onpropertychange', function makeExpandingAreaCallback() {
     span.innerText = area.value;
   });
   span.innerText = area.value;
 }

 // Enable extra CSS
 container.className += ' active';
}

var movingTimeout, moving = false;
function addMovingClassToBodyIfMouseMoving() {
  if (!moving) {
    moving = true;
    $('body').addClass('moving');
  }

  clearTimeout(movingTimeout);
  movingTimeout = setTimeout(function() {
    moving = false;
    $('body').removeClass('moving');
  }, 1000);
}
;
var showdown       = new Showdown.converter(),
    saveInterval   = 5000,
    previewHeight  = 0,
    hideBarTimeout = null,
    scrollTimeout  = null,
    lineHeight = 24,
    editElements   = {
      admin     : '#admin',
      editor    : '#post-editor',
      title     : '#post_title',
      content   : '#post_content',
      slug      : '#post_slug',
      url       : '#post_url',
      published : '#post_published_at',
      draft     : '#post_draft',
      save      : '#save-button',
      form      : '#new_post, .edit_post',
      bar       : '#bar',
      blog      : '#edit-button',
      publish   : '#publish-button',
      preview   : '#post-preview'
    };

$.subscribe('edit:enter', function(id) {
  state.editing = true;

  el = fn.getjQueryElements(editElements);
  makeExpandingAreas();
  setPostState();
  setDraft(state.post ? state.post.draft : true);
  updatePostState();
  setLineHeight();
  setEditorHeight();

  if (window.location.hash == '#preview')
    showPreview();

  console.log('edit enter');
  setTimeout(function() {
    el.title.focus().putCursorAtEnd();
  }, 0);

  resetAutoSave();
  initBar();
  doEditBindings();
});

$.subscribe('edit:leave', function() {
  state.editing = false;
  savePost();
});

$(window)
  .on('beforeunload', function() {
    if (state.editing)
      savePost();
  })
  .resize(setEditorHeight);

function doEditBindings() {
  // ContentFielset.scroll
  $('#post-editor').on('scroll', function() {
    updatePreviewPosition();
    savePosition();
  });

  // Post.input - preview updating
  $('#post_content,#post_title').on('input',function postInput() {
    if (state.preview) updatePreview();
  });

  // Preview button
  $('#preview-button').click(function previewButtonClick(e){
    e.preventDefault();
    if (state.preview) hidePreview();
    else {
      showPreview();
      updatePreviewPosition();
    }
  });

  // Publish button
  el.publish
    .click(function publishClick(e) {
      e.preventDefault();
      el.publish.html('...');
      setDraft(!state.post.draft);
      savePost();
    });

  // Save.click
  $('#save-button').click(function saveButtonClick(e){
    e.preventDefault();
    savePost();
  });

  // Bar.click
  el.bar.click(function barClick(e) {
    if (state.preview && e.target.id == 'bar') hidePreview();
  });

  // Menu hover
  $('.menu').hover(function() {
    var menu = this;
    setTimeout(function() {
      $('input:first', menu).focus().select();
    }, 0);
  });

  // Wordcount
  $('#stats-button').mouseenter(function() {
    $('#wordcount').html(el.content.val().split(/\s+/).length +' words');
  });
}

function initBar() {
  if ($.cookie('barPinned') == 'true')
    toggleBar();
  else {
    showBar(true);
    delayedHideBar();
  }
}

var autoSaveInterval;
function resetAutoSave() {
  // Interval
  clearInterval(autoSaveInterval);
  autoSaveInterval = setInterval(savePost, saveInterval);

  // Set to dirty on change/input
  $('input, textarea').on('change input', function(){
    state.changed = true;
    el.save.addClass('dirty');
  });
}

function setPostState() {
  state.editing = true;
  state.post = $('#post').data('state');
}

function updatePostState() {
  if (!state.post) return;
  el.slug.val(state.post.slug);
  el.url.val(state.post.url);
  el.published.val(state.post.published_at);
  el.blog.attr('href', '/' + state.post.slug);
}

// Saves the post
function savePost(callback) {
  if (state.saving || (state.post && !state.changed))
    return false;

  state.saving = true;
  state.changed = false;
  el.save.addClass('saving');
  fn.log('Saving', state.changed);

  // POST
  $.ajax({
    type: 'POST',
    url: el.form.attr('action'),
    data: el.form.serialize(),
    dataType: 'text',
    success: function savingSuccess(data) {
      var data = JSON.parse(data);

      // Update state
      state.saving = false;

      // Update save button
      el.save.removeClass('saving dirty').addClass('saved');
      setTimeout(function() {
        if (el.save) el.save.removeClass('saved')
      }, 500);

      // If we just finished creating a new post
      if (!state.post) {
        setFormAction('/' + data.id);
        setFormMethod('put');
      }

      // Update cache and post data
      setCache(data.id, data);
      state.post = data;

      // Update form
      updatePostState();

      fn.log('Saved', data.id, data);
      if (callback) callback.call(this, data);
    },
    error: function (xmlHttpRequest, textStatus, errorThrown) {
      if (xmlHttpRequest.readyState == 0 || xmlHttpRequest.status == 0)
        return;  // it's not really an error
      else {
        alert('Could not save.  Please backup your post!');
        el.save.removeClass('dirty saving').addClass('error');
      }
    }
  });
}

// Get cache
function getCache(id) {
  var string = localStorage.getItem(id);
  return JSON.parse(string);
}

// Set cache
function setCache(id, data) {
  localStorage.setItem(id,JSON.stringify(data));
}

// Load it up
function loadCache(id, callback) {
  var cache = getCache(id);
  if (cache) {
    callback.call(this, cache);
  } else {
    $.getJSON('/get/'+id, function loadCacheCallback(data) {
      setCache(id, data);
      callback.call(this, data);
    });
  }
}

// Set form action
function setFormAction(url) {
  el.form.attr('action',url);
}

// Set form method
function setFormMethod(type) {
  var put = $('form div:first input[value="put"]');
  if (type == 'put' && !put.length) $('form div:first').append('<input name="_method" type="hidden" value="put">');
  else if (type != 'put') put.remove();
}

function setDraft(draft) {
  setDraftInput(draft);
  updateDraftButton(draft);
}

function setDraftInput(draft) {
  state.changed = true;
  el.draft.attr('value',(draft ? 1 : 0));
  el.draft.attr('checked',(draft ? 'checked' : ''));
}

function updateDraftButton(draft) {
  if (draft) el.publish.html('Draft').addClass('icon-edit').removeClass('icon-check');
  else       el.publish.html('Live').removeClass('icon-edit').addClass('icon-check');
}

// Preview
function updatePreviewPosition() {
  if (state.preview) {
    var textareaOffset = el.content.offset().top,
        lineOffset     = parseInt((-textareaOffset)/lineHeight,10),
        percentDown    = lineOffset / state.lines,
        previewOffset  = previewHeight * percentDown;

    el.preview.scrollTop(previewOffset);
  }
}

// Markdown preview
function updatePreview() {
  var title = el.title.val().split("\n").join('<br />');
  $('#post-preview .inner').html('<h1>'+(title ? title : 'No Title')+'</h1>'+showdown.makeHtml(el.content.val()));
  state.lines   = el.content.height()/lineHeight;
  previewHeight = $('#post-preview .inner').height();
}

function togglePreview() {
  if (state.preview) hidePreview();
  else showPreview();
}

function hidePreview() {
  window.location.hash = '';
  el.admin.removeClass('preview');
  $('#preview-button').removeClass('icon-eye-close').addClass('icon-eye-open');
  state.preview = false;
}

function showPreview() {
  updatePreview();
  window.location.hash = 'preview';
  el.admin.addClass('preview');
  makeExpandingAreas();
  $('#preview-button').removeClass('icon-eye-open').addClass('icon-eye-close');
  state.preview = true;
}

function toggleBar() {
  state.barPinned = !state.barPinned;
  $.cookie('barPinned',state.barPinned);
  if (state.barPinned) showBar(true);
  else showBar(false);
}

function showBar(show) {
  state.barHidden = !show;
  if (show) {
    clearTimeout(hideBarTimeout);
    el.bar.removeClass('shy');
  }
  else if (el.bar && !state.barPinned && !el.bar.is(':hover')) {
    el.bar.addClass('shy');
  }
}

function delayedHideBar(time) {
  clearTimeout(hideBarTimeout);
  hideBarTimeout = setTimeout(function(){
    showBar(false)
  }, (time ? time : 1000));
}

function savePosition() {
  clearTimeout(scrollTimeout);
  if (state.editing) {
    scrollTimeout = setTimeout(function() {
      $.cookie('position-'+state.post.id, el.editor.scrollTop());
    },1000);
  }
}

// Scroll to bottom of content and select the end
function scrollToPosition() {
  var cookie = $.cookie('position-'+state.post.id);
  fn.log('Scroll to position',cookie);
  if (cookie) el.editor.scrollTop(cookie);
  else {
    // Scroll to bottom
    el.content.focus().putCursorAtEnd();
    $('#post-editor').scrollTop(el.content.height());
  }
}

function setLineHeight() {
  // Determine line height from css
  lineHeight = $('#line-height').height();
}

function setEditorHeight() {
  if (!state.editing) return false;
  var content_height = $(window).height() - el.title.height() - el.bar.height() - 180;
  // content_height + margin
  $('#text-content').css('min-height', content_height);
}
;
var prevVal = null,
    col_height,
    indexElements = {
      admin     : '#admin',
      title     : '#post_title',
      content   : '#post_content',
      section   : '.split-section',
      published : '#published',
      drafts    : '#drafts',
      curCol    : '#drafts',
      curColUl  : '#drafts ul',
      curItem   : '#drafts li:first'
    };

$.subscribe('index:enter', function() {
  el = fn.getjQueryElements(indexElements);

  el.title.focus();
  selectItem(el.curItem);
  makeExpandingAreas();
  setColumnHeights();
  setupFiltering();
  state.colIndex = 0;
  state.itemIndex = [0, 0];
});

$(window)
  .resize(setColumnHeights)
  .focus(focusTitle);

$html
  .on('click.anywhere', focusTitle);

function setupFiltering() {
  // Filtering and other functions with the title field
  var draftsItems    = $('#drafts ul:first').data('items'),
      publishedItems = $('#published ul:first').data('items');

  el.title
    .on('keyup.filter', function(e) {
      var val = el.title.val();

      if (val) {
        prevVal = val;
        var draftIds = filterTitle(draftsItems, val),
            pubIds   = filterTitle(publishedItems, val);

        draftIds ? showOnly('#drafts li', draftIds) : $('#drafts li').addClass('hidden');
        pubIds   ? showOnly('#published li', pubIds) : $('#published li').addClass('hidden');

        if (!draftIds.length && !pubIds.length) {
          el.title.off('keyup.filter');
          goToNewPost();
        }

        state.itemIndex[0] = 0;
        state.itemIndex[1] = 0;

        var item = $('.col li:not(.hidden):first');
        selectItem(item);
        updateItemState(item);
      }
      else {
        $('#drafts li, #published li').removeClass('hidden');
      }
    })

    .on('keydown.filter', function(e) {
      switch (e.which) {
        // Esc
        case 27:
          e.preventDefault();
          el.title.val('');
          $('#drafts li,#published li').removeClass('hidden');
          break;
      }
    });
}

function goToNewPost() {
  el.title.attr('disabled', 'disabled');
  $('#new-post').attr('href', '/new?title=' + el.title.val())[0].click();
}

function showOnly(context, indices) {
  $(context).each(function() {
    $(this).toggleClass('hidden', !_.contains(indices, $(this).data('id')));
  });
}

// Set column height
function setColumnHeights() {
  if (state.editing) return false;

  var content_height = Math.max($(window).height() - el.title.height() - 100 ,100);
  col_height = $(window).height()-125;

  $('.col ul').css('height', col_height);
  el.content.css('min-height', content_height);
  $('#content-fieldset').css('height', content_height);
  return col_height;
}

// Highlight an item in the column
function selectItem(object, items) {
  el.curItem.removeClass('selected');
  el.curItem = object.addClass('selected');
  return el.curItem.index();
}

function updateItemState(object) {
  var colIndex = object.parents('.col').index();
  if (colIndex != state.colIndex) changeCol();
  state.colIndex = colIndex;

  state.itemIndex[colIndex] = el.curItem.index();
}

// Either uses cache or loads post
function editSelectedItem(callback) {
  el.curItem.children('a')[0].click();
}

// Highlight column
function changeCol() {
  el.curItem.removeClass('selected');

  // to Drafts
  if (el.curCol.is('#published')) {
    state.colIndex = 0;
    el.published.removeClass('active');
    el.curCol = el.drafts.addClass('active');
  }
  // to Published
  else {
    state.colIndex = 1;
    el.drafts.removeClass('active');
    el.curCol = el.published.addClass('active');
  }

  selectItem(el.curCol.find('li:not(.hidden):eq('+state.itemIndex[state.colIndex]+')'));
  el.curColUl = el.curCol.find('ul');
}

function filterTitle(objects, val) {
  return objects.filter(function filterTitleObjects(el) {
      var regex = new RegExp(val.split('').join('.*'), 'i');
      if (el.title.match(regex)) return true;
    }).map(function filterTitleMap(el) {
      return el.id;
    });
}

function focusTitle() {
  if (!state.editing)
    el.title.focus();
}
;
// State
var key = {
  shift: false,
  cmd: false
};

// Bindings
$(window)
  .keydown(function windowKeydown(e) {

    // Not editing
    if (!state.editing) { //!$.inArray(state.lastKey,disableKeys)
      el.title.focus();
      switch (e.which) {
        // Enter
        case 13:
          e.preventDefault();
          if (el.curItem.length > 0) {
            editSelectedItem();
          }
          break;
        // Down, Tab
        case 40: case 9:
          if (!e.shiftKey) {
            e.preventDefault();
            var next = el.curCol.find('li:not(.hidden)').eq(state.itemIndex[state.colIndex]+1);
            if (next.length > 0) {
              state.itemIndex[state.colIndex]++;
              fn.log(state.itemIndex,'col',state.colIndex,'next',next);
              selectItem(next);

              // Scroll column if necessary
              var itemOffset = el.curItem.position().top;
              if (itemOffset > (col_height/2)) {
                el.curColUl.scrollTop(el.curColUl.scrollTop()+el.curItem.height()*2);
              }
            }
            break;
          }
        // Up, Tab
        case 38: case 9:
          e.preventDefault();
          if (e.which == 9 && !e.shiftKey) break;
          if (state.itemIndex[state.colIndex] > 0) {
            var prev = el.curCol.find('li:not(.hidden)').eq(state.itemIndex[state.colIndex]-1);
            if (prev.length > 0) {
              state.itemIndex[state.colIndex]--;
              selectItem(prev);

              // Scroll column if necessary
              var itemOffset = el.curItem.position().top;
              if (itemOffset < (col_height/2)) {
                el.curColUl.scrollTop(el.curColUl.scrollTop()-el.curItem.height()*2);
              }
            }
          }
          break;
        // Right
        case 39:
          e.preventDefault();
          if ($('#published li:not(.hidden)').length) changeCol();
          break;
        // Left
        case 37:
          e.preventDefault();
          if ($('#drafts li:not(.hidden)').length) changeCol();
          break;
        // P
        case 80:
          if (e.metaKey) {
            e.preventDefault();
            editSelectedItem(function() {
              togglePreview();
            });
          }
          break;
      }
    }

    // Editing
    else {
      switch (e.which) {
        // Enter
        case 13:
          if (el.title.is(':focus'))
            e.preventDefault();
          break;
        // Cmd
        case 91:
          key.cmd = true;
          break;
        // Esc
        case 27:
          e.preventDefault();
          if (!state.barPinned && !el.bar.is('.shy')) showBar(false);
          else if (state.preview) hidePreview();
          else $('#back-button')[0].click();
          break;
        // Backspace
        case 8:
          if (!state.beganEditing && el.title.val().length <= 1)
            $('#back-button')[0].click();
          break;
        // S
        case 83:
          if (e.metaKey) {
            e.preventDefault();
            savePost();
          }
          break;
        // P
        case 80:
          if (e.metaKey) {
            e.preventDefault();
            togglePreview();
          }
          break;
        // B
        case 66:
          if (e.metaKey) {
            e.preventDefault();
            toggleBar();
          }
      }
    }

    // Record last key
    state.lastKey = e.which;
  })

  .keyup(function windowKeyup(e) {
    switch(e.which) {
      // Cmd
      case 91:
        key.cmd = false;
        break;
      case 16:
        key.shift = false;
    }
  })

  .blur(function() {
    key.cmd = false;
    key.shift = false;
  });

