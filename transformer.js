/**
 * ___ __          __ __ __  __      __ __
 *  | |__) /\ |\ |(_ |_ /  \|__)|\/||_ |__)
 *  | | \ /--\| \|__)|  \__/| \ |  ||__| \
 * ---------------------------------------->
 *
 * TODO:
 * vendor prefixes
 * moving
 * resizing
 */
(function Transformer(global, $) {
	'use strict';

	if (typeof mandox !== 'undefined') {
		eval(uate)('tranformer.js');
	}

	function enableSelection($element) {
		$element.each(function () {
			$(this).removeAttr('unselectable', 'on').css({
				'-webkit-user-select': 'all',
				'   -moz-user-select': 'all',
				'        user-select': 'all'
			}).each(function () {
				this.onselectstart = null;
			});
		});
	}

	function disableSelection($element) {
		$element.each(function () {
			$(this).attr('unselectable', 'on').css({
				'-webkit-user-select': 'none',
				'   -moz-user-select': 'none',
				'        user-select': 'none'
			}).each(function () {
				this.onselectstart = function () { return false; };
			});
		});
	}

	/**
	 * Rotates a vector by the given radian angle.
	 *
	 * Reference: https://en.wikipedia.org/wiki/Rotation_(mathematics)
	 */
	function rotateVector(vec, theta) {
		var cos = Math.cos(theta);
		var sin = Math.sin(theta);
		return [
			(vec[0] * cos) - (vec[1] * sin),
			(vec[0] * sin) + (vec[1] * cos)
		];
	}

	/**
	 * Adds the given vectors and returns a new copy.
	 */
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

	var $markers = (function collectMarkers(markers) {
		var $markers = $();
		var name;
		for (name in markers) {
			if (markers.hasOwnProperty(name)) {
				$markers = $markers.add(markers[name]);
			}
		}
		return $markers;
	}(markers));
	var $boundingbox = $('<div id="transformer-boundingbox">').appendTo('body');
	var $pivot = $('<div id="transformer-pivot">').appendTo('body');

	/**
	 * Orientates and shows the given set of markers around an element.
	 */
	function showMarkers(rotation) {
		var width = rotation.$element.outerWidth();
		var height = rotation.$element.outerHeight();

		var n  = [0, -height / 2];
		var s  = [0,       -n[1]];
		var e  = [width / 2,   0];
		var w  = [-e[0],       0];
		var nw = [w[0],     n[1]];
		var ne = [e[0],     n[1]];
		var sw = [w[0],     s[1]];
		var se = [e[0],     s[1]];

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
					rotateVector(cardinals[name], rotation.angle),
					rotation.pivot
				);
				markers[name].css('left', pos[0]).css('top', pos[1]).show();
			}
		}

		var offset = rotation.$element.offset();

		$boundingbox.show().offset(offset)
		            .css('width', (rotation.pivot[0] - offset.left) * 2)
		            .css('height', (rotation.pivot[1] - offset.top) * 2);

		$pivot.show()
		      .css('left', rotation.pivot[0])
		      .css('top', rotation.pivot[1]);
	}

	(function hideMarkers() {
		$pivot.hide();
		$markers.hide();
		$boundingbox.hide();
	}());

	/**
	 * Converts degrees into radians.
	 *
	 * Reference: https://en.wikipedia.org/wiki/Radian
	 */
	function toRad(degrees) {
		return degrees * (Math.PI / 180);
	}

	var MAX_ANGLE = toRad(360);
	var HALF_ANGLE = toRad(180);
	var RIGHT_ANGLE = toRad(90);
	var CSS_TRANSFORM_PROPERTY_NAME = '-webkit-transform';
	var MUNGED_ATTRIBUTE = 'data-' + Math.random().toString(16).substr(2)
	                     + '-rotation';

	/**
	 * Calculate the angle between (0, 0) and (x, y) in radians.
	 *
	 * Reference: https://en.wikipedia.org/wiki/atan2
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

	function getRotation($element) {
		return parseFloat($element.attr(MUNGED_ATTRIBUTE)) || 0;
	}

	/**
	 * Calculate the height and width of the bounding box for the given
	 * orientation.
	 *
	 * Reference: http://www.codalicio.us/2011/01/how-to-determine-bounding-rectangle-of.html
	 */
	function calculateBoundingBox(w, h, angle) {
		if (angle > HALF_ANGLE) {
			angle -= HALF_ANGLE;
		}
		if (angle > RIGHT_ANGLE) {
			angle -= RIGHT_ANGLE;
			var originalHeight = w;
			w = h;
			h = originalHeight;
		}
		return [(
			// a = cos(q) * h
			(Math.cos(RIGHT_ANGLE - angle) * h)
			+
			(Math.cos(angle) * w)
		), (
			// o = sin(q) * h
			(Math.sin(RIGHT_ANGLE - angle) * h)
			+
			(Math.sin(angle) * w)
		)];
	}

	function calculateOrigin($element, angle) {
		var box = calculateBoundingBox(
			$element.outerWidth(),
			$element.outerHeight(),
			angle
		);
		var offset = $element.offset();
		return [offset.left + (box[0] / 2), offset.top + (box[1] / 2)];
	}

	function calculateTransformation(angle) {
		var cos = Math.cos(angle);
		var sin = Math.sin(angle);
		return 'matrix(' + [cos, sin, -sin, cos, 0, 0].join(',') + ')';
	}

	function normalizeAngle(radians) {
		if (radians < 0) {
			radians = MAX_ANGLE + radians;
		}
		return (radians > MAX_ANGLE) ? radians - MAX_ANGLE : radians;
	}

	/**
	 * Cleans an element of transformation annotations.
	 */
	function clearAttributes($element) {
		$element.removeAttr(MUNGED_ATTRIBUTE);
	}

	/**
	 * Initialize rotation for the given element at poing (x, y).
	 */
	function startRotation(element, x, y) {
		disableSelection($('body'));

		var $element = $(element);
		var angle = getRotation($element);
		var pivot = calculateOrigin($element, angle);
		var anchor = [x, y];
		var start = angle - calculateAngle(anchor[0] - pivot[0], 0);

		var rotation = {
			$element : $element,
			pivot    : pivot,
			anchor   : anchor,
			start    : start,
			angle    : start
		};

		showMarkers(rotation, $pivot, $boundingbox, markers);

		return rotation;
	}

	/**
	 * Saves the current rotation angle as an attribute on the rotated element
	 * and hides boundingbox, pivot, and markers.
	 */
	function endRotation(rotation) {
		if (rotation) {
			rotation.$element.attr(MUNGED_ATTRIBUTE, rotation.angle);
		}
	}

	/**
	 * Update the rotation according to the new coordinates (x, y).
	 */
	function updateRotation(rotation, x, y) {
		rotation.angle = normalizeAngle(rotation.start + calculateAngle(
			x - rotation.pivot[0],
			y - rotation.anchor[1]
		));
		rotation.$element.css(
			CSS_TRANSFORM_PROPERTY_NAME,
			calculateTransformation(rotation.angle)
		);
		showMarkers(rotation, $pivot, $boundingbox, markers);
	}

	/**
	 * ___ __          __ __ __  __      __ __
	 *  | |__) /\ |\ |(_ |_ /  \|__)|\/||_ |__)
	 *  | | \ /--\| \|__)|  \__/| \ |  ||__| \
	 * ---------------------------------------->
	 */
	global.Transformer = {
		startRotation    : startRotation,
		endRotation      : endRotation,
		updateRotation   : updateRotation,
		clearAttributes  : clearAttributes,
		enableSelection  : enableSelection,
		disableSelection : disableSelection
	};

}(window, window.jQuery));
