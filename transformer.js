(function Transformer(global, $) {
	'use strict';

	if (typeof mandox !== 'undefined') {
		eval(uate)('tranformer.js');
	}

	// === markers ===

	// https://en.wikipedia.org/wiki/Rotation_(mathematics)
	function rotateVector(vec, theta) {
		var cos = Math.cos(theta);
		var sin = Math.sin(theta);
		return [
			(vec[0] * cos) - (vec[1] * sin),
			(vec[0] * sin) + (vec[1] * cos)
		];
	}

	function translateVector(vec1, vec2) {
		return [vec1[0] + vec2[0], vec1[1] + vec2[1]];
	}

	var markers = {
		n  : $('<div class="transformer-marker" id="transformer-marker-n" ><div></div></div>').appendTo('body'),
		s  : $('<div class="transformer-marker" id="transformer-marker-s" ><div></div></div>').appendTo('body'),
		e  : $('<div class="transformer-marker" id="transformer-marker-e" ><div></div></div>').appendTo('body'),
		w  : $('<div class="transformer-marker" id="transformer-marker-w" ><div></div></div>').appendTo('body'),
		nw : $('<div class="transformer-marker" id="transformer-marker-nw"><div></div></div>').appendTo('body'),
		sw : $('<div class="transformer-marker" id="transformer-marker-sw"><div></div></div>').appendTo('body'),
		ne : $('<div class="transformer-marker" id="transformer-marker-ne"><div></div></div>').appendTo('body'),
		se : $('<div class="transformer-marker" id="transformer-marker-se"><div></div></div>').appendTo('body')
	};

	function selectMarkers(markers) {
		var $markers = $();
		var name;
		for (name in markers) {
			if (markers.hasOwnProperty(name)) {
				$markers = $markers.add(markers[name]);
			}
		}
		return $markers;
	}

	var $markers = selectMarkers(markers);

	function setMarkers($element, origin, angle) {
		var width = $element.width();
		var height = $element.height();

		var n  = [0,       -height/2];
		var s  = [0,           -n[1]];
		var e  = [width/2,         0];
		var w  = [-e[0],           0];
		var nw = [w[0],         n[1]];
		var ne = [e[0],         n[1]];
		var sw = [w[0],         s[1]];
		var se = [e[0],         s[1]];

		var cardinals = {
			n  : n,
			s  : s,
			e  : e,
			w  : w,
			nw : nw,
			ne : ne,
			sw : sw,
			se : se
		};

		var name;
		var pos;
		for (name in cardinals) {
			if (cardinals.hasOwnProperty(name)) {
				pos = translateVector(
					rotateVector(cardinals[name], angle),
					origin
				);
				markers[name].css('left', pos[0]).css('top', pos[1]);
			}
		}
	}

	/*
	markers.$n.draggable('option', 'axis', 'y');
	markers.$s.draggable('option', 'axis', 'y');
	markers.$w.draggable('option', 'axis', 'x');
	markers.$e.draggable('option', 'axis', 'x');
	*/

	// === /markers ===

	var state = {

		/**
		 * The element in rotation.
		 */
		$element: null,

		/**
		 * Tangent point.  Dragging point.
		 */
		anchor: null,

		/**
		 * Pivot point.  Will always be at the center of the rotated element.
		 */
		pivot: null,

		/**
		 * Angle at start of rotation.
		 */
		start: 0,

		/**
		 * Whether or not we are in rotation mode.
		 */
		rotating: false
	};

	function enableSelection($element) {
		$element.each(function () {
			$(this).removeAttr('unselectable', 'on').css({
				'-webkit-user-select': 'all',
				   '-moz-user-select': 'all',
				        'user-select': 'all'
			}).each(function () {
				this.onselectstart = null;
			});
		});
	}

	function disableSelection($element) {
		$element.each(function () {
			$(this).attr('unselectable', 'on').css({
				'-webkit-user-select': 'none',
				   '-moz-user-select': 'none',
				        'user-select': 'none'
			}).each(function () {
				this.onselectstart = function () { return false; };
			});
		});
	}

	/**
	 * Reference: https://en.wikipedia.org/wiki/Radian
	 */
	function toRad(degrees) {
		return degrees * (Math.PI / 180);
	}

	var MAX_ANGLE = toRad(360);
	var HALF_ANGLE = toRad(180);
	var RIGHT_ANGLE = toRad(90);

	/**
	 * Reference: https://en.wikipedia.org/wiki/atan2
	 *
	 * Calculate the angle between (0, 0) and (x, y) in radians.
	 *
	 * atan2(y, x) is the angle in radians between the positive x-axis of a
	 * plane and the point given by the coordinates (x, y) on it. The angle is
	 * positive for counter-clockwise angles (upper half-plane, y > 0), and
	 * negative for clockwise angles (lower half-plane, y < 0).
	 *
	 * @return {number}
	 */
	function calculateAngle(x, y) {
		return Math.atan2(y, x);
	}

	function elementRotation($element) {
		return parseFloat($element.attr('__rotation__')) || 0;
	}

	var $boundingbox = $('<div id="transformer-boundingbox">').appendTo('body');
	var $pivot = $('<div id="transformer-pivot">').appendTo('body');

	/**
	 * Reference: http://www.codalicio.us/2011/01/how-to-determine-bounding-rectangle-of.html
	 *
	 * SOHCAHTOA:
	 * Sin(q) = Opposite / Hypotenuse
	 * Cos(q) = Adjacent / Hypotenuse 
	 * Tan(q) = Opposite / Adjacent
	 */
	function boundingBox(w, h, angle) {
		if (angle > HALF_ANGLE) {
			angle -= HALF_ANGLE;
		}
		if (angle > RIGHT_ANGLE) {
			angle -= RIGHT_ANGLE;
			var originalHeight = w;
			w = h;
			h = originalHeight;
		}
		return [
			// a = cos(q) * h
			(
				(Math.cos(RIGHT_ANGLE - angle) * h)
				+
				(Math.cos(angle) * w)
			),
			// o = sin(q) * h
			(
				(Math.sin(RIGHT_ANGLE - angle) * h)
				+
				(Math.sin(angle) * w)
			)
		];
	}

	function pivot($element, angle) {
		var box = boundingBox($element.width(), $element.height(), angle);
		var offset = $element.offset();
		$boundingbox.offset(offset).css('width', box[0]).css('height', box[1]);
		return [offset.left + (box[0] / 2), offset.top + (box[1] / 2)];
	}

	function calculateTransformation(angle) {
		var cos = Math.cos(angle);
		var sin = Math.sin(angle);
		return 'matrix(' + [cos, sin, -sin, cos, 0, 0].join(',') + ')';
	}

	/**
	 * Start rotation
	 */
	function start($event) {
		if (!state.rotating) {
			$boundingbox.show();
			$markers.show();

			state.$element = $($event.target);
			state.rotating = true;
			var rotation = elementRotation(state.$element);
			state.pivot = pivot(state.$element, rotation);
			state.anchor = [$event.clientX, $event.clientY];
			state.start = rotation
			            - calculateAngle(state.anchor[0] - state.pivot[0], 0);

			disableSelection($('body'));

			$pivot.show().css('left', state.pivot[0]).css('top', state.pivot[1]);
		}
	}

	function stop($event) {
		if (state.rotating) {
			state.rotating = false;
			state.$element.attr('__rotation__', state.current);

			enableSelection($('body'));

			$boundingbox.hide();
			$markers.hide();
			$pivot.hide();
		}
	}

	function cicle(radians) {
		if (radians < 0) {
			radians = MAX_ANGLE + radians;
		}
		return (radians > MAX_ANGLE) ? radians - MAX_ANGLE : radians;
	}

	function clear($element) {
		$element.removeAttr('__rotation__');
	}

	function rotateElement($event) {
		if (state.rotating) {
			state.current = cicle(state.start + calculateAngle(
				$event.clientX - state.pivot[0],
				$event.clientY - state.anchor[1]
			));
			state.$element.css(
				'-webkit-transform',
				calculateTransformation(state.current)
			);
			setMarkers(state.$element, state.pivot, state.current);
			pivot(state.$element, state.current);
		}
	}

	$(document).on('mousemove', function onmousemove($event) {
		if (state.rotating) {
			rotateElement($event);
		}
	});

	$markers.hide();
	$pivot.hide();
	$boundingbox.hide();

	global.Transformer = {
		start            : start,
		stop             : stop,
		clear            : clear,
		enableSelection  : enableSelection,
		disableSelection : disableSelection
	};

}(window, window.jQuery));
