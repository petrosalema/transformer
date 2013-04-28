/**
 * Azimuth
 * ---------------------------------------->
 *
 * TODO:
 * vendor prefixes
 * moving
 */
(function Transformer(global, $) {
	'use strict';

	if (typeof mandox !== 'undefined') {
		eval(uate)('tranformer.js');
	}

	(function () {
		var i;
		var w = $(window).width();
		var h = $(window).height();
		var division = 10;
		var hd = h / division;
		var wd = w / division;
		for (i = 0; i < division; i++) {
			$('<div style="width:100%;height:1px;position:absolute;background:rgba(0,0,0,0.05);"></div>').offset({
				left: 0,
				top: hd * i
			}).appendTo('body');
			$('<div style="width:1px;height:' + h + 'px;position:absolute;background:rgba(0,0,0,0.05);"></div>').offset({
				left: wd * i,
				top: 0
			}).appendTo('body');
		}
	}());

	var currentRotation;
	var $selectedElement;

	/**
	 * Converts degrees into radians.
	 *
	 * Reference: https://en.wikipedia.org/wiki/Radian
	 */
	function toRad(degrees) {
		return degrees * (Math.PI / 180);
	}

	function toDeg(radians) {
		return radians * (180 / Math.PI);
	}

	var MAX_ANGLE = toRad(360);
	var HALF_ANGLE = toRad(180);
	var RIGHT_ANGLE = toRad(90);
	var CSS_TRANSFORM_PROPERTY_NAME = '-webkit-transform';
	var MUNGED_ATTRIBUTE = 'data-' + Math.random().toString(16).substr(2)
	                     + '-rotation';

	/**
	 * Angles of the 16-point compass rose.
	 *
	 * Reference: https://en.wikipedia.org/wiki/Compass_rose
	 */
	var compass = (function () {
		var eigth = 45;
		var sixteenth = eigth / 2;
		var n   = 0;
		var e   = 90;
		var s   = 180;
		var w   = 270;
		var ne  = n  + eigth;
		var se  = e  + eigth;
		var sw  = s  + eigth;
		var nw  = w  + eigth;
		var nne = n  + sixteenth;
		var ene = ne + sixteenth;
		var nnw = nw + sixteenth;
		var wnw = w  + sixteenth;
		var sse = s  - sixteenth;
		var ese = se - sixteenth;
		var ssw = sw - sixteenth;
		var wsw = w  - sixteenth;
		return {
			n   : toRad(n),
			e   : toRad(e),
			s   : toRad(s),
			w   : toRad(w),
			ne  : toRad(ne),
			se  : toRad(se),
			sw  : toRad(sw),
			nw  : toRad(nw),
			nne : toRad(nne),
			ene : toRad(ene),
			nnw : toRad(nnw),
			wnw : toRad(wnw),
			sse : toRad(sse),
			ese : toRad(ese),
			ssw : toRad(ssw),
			wsw : toRad(wsw)
		};
	}());

	/**
	 * DOM elements for the 8 cardinals and ordinals of the compass.
	 *
	 * Reference: https://en.wikipedia.org/wiki/Principal_winds
	 */
	var winds = {
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
		var point;
		for (point in markers) {
			if (markers.hasOwnProperty(point)) {
				$markers = $markers.add(markers[point]);
			}
		}
		return $markers;
	}(winds));

	var $boundingbox = $('<div id="transformer-boundingbox">').appendTo('body');
	var $pivot = $('<div id="transformer-pivot">').appendTo('body');

	function enableSelection($element) {
		($element || $('body')).each(function () {
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
		($element || $('body')).each(function () {
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

	/**
	 * Orientates and shows the given markers around the rotation.
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

		var directions = {
			n  : n,
			s  : s,
			e  : e,
			w  : w,
			nw : nw,
			ne : ne,
			sw : sw,
			se : se
		};

		var point;
		var pos;
		for (point in directions) {
			if (directions.hasOwnProperty(point)) {
				pos = translateVector(
					rotateVector(directions[point], rotation.angle),
					rotation.pivot
				);
				winds[point].css('left', pos[0]).css('top', pos[1]).show();
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

	/**
	 * Hides rotation markers.
	 */
	(function hideMarkers() {
		$pivot.hide();
		$markers.hide();
		$boundingbox.hide();
	}());

	/**
	 * Calculates the angle between (0, 0) and (x, y) in radians.
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

	/**
	 * @TODO: use the css transform matrix
	 */
	function getElementRotation($element) {
		return parseFloat($element.attr(MUNGED_ATTRIBUTE)) || 0;
	}

	/**
	 * Calculate the height and width of the bounding box for the given
	 * orientation.
	 *
	 * Reference: http://www.codalicio.us/2011/01/how-to-determine-bounding-rectangle-of.html
	 *
	 * @returns {Array.<number>} [x, y, w, h]
	 */
	function computeBoundingBox($element, angle) {
		var w = $element.outerWidth();
		var h = $element.outerHeight();

		if (angle > HALF_ANGLE) {
			angle -= HALF_ANGLE;
		}
		if (angle > RIGHT_ANGLE) {
			angle -= RIGHT_ANGLE;
			var originalHeight = w;
			w = h;
			h = originalHeight;
		}

		var offset = $element.offset();

		return [
			offset.left,
			offset.top, (
				// a = cos(q) * h
				(Math.cos(RIGHT_ANGLE - angle) * h)
				+
				(Math.cos(angle) * w)
			), (
				// o = sin(q) * h
				(Math.sin(RIGHT_ANGLE - angle) * h)
				+
				(Math.sin(angle) * w)
			)
		];
	}

	/**
	 * Calculates the center of the given element when orientated to the given
	 * angle.
	 */
	function computeOrigin($element, angle) {
		var box = computeBoundingBox($element, angle);
		return [box[0] + (box[2] / 2), box[1] + (box[3] / 2)];
	}

	/**
	 * Generates a matrix transformation CSS string to rotate an element by the
	 * given angle.
	 */
	function computeTransformation(angle) {
		var cos = Math.cos(angle);
		var sin = Math.sin(angle);
		return 'matrix(' + [cos, sin, -sin, cos, 0, 0].join(',') + ')';
	}

	function computeMagnitude(vector) {
		return Math.sqrt(vector[0] * vector[0] + vector[1] * vector[1]);
	}

	/**
	 * Normalizes the given angle--cycling through 0 to 360.
	 */
	function normalizeAngle(radians) {
		if (radians < 0) {
			radians = MAX_ANGLE + radians;
		}
		return (radians > MAX_ANGLE) ? radians - MAX_ANGLE : radians;
	}

	// https://en.wikipedia.org/wiki/Scalar_projection
	// s = |a|cos@ = a.^b
	// . dot product operation
	// ^b unit vector in direction of b
	// |a| is the length of a
	// and @ is the angle between a and b
	function computeScalarProjection(vector, direction) {
		var vectorAngle = calculateAngle(vector[0], vector[1]);

		// The angle of the direction on which the vector will be projected
		var directionAngle = calculateAngle(direction[0], direction[1]);

		return (
			computeMagnitude(vector) * Math.cos(vectorAngle - directionAngle)
		);
	}

	function projectVector(vector, direction, normal) {
		var scalarProjection = computeScalarProjection(vector, direction);
		return [
			scalarProjection * direction[0],
			scalarProjection * direction[1]
		];
	}

	/**
	 * Cleans an element of transformation annotations.
	 */
	function clearElementAttributes($element) {
		$element.removeAttr(MUNGED_ATTRIBUTE);
	}

	/**
	 * Initializes rotation for the given element at point (x, y).
	 */
	function startRotation(element, x, y) {
		disableSelection();

		var $element = $(element);
		var angle = getElementRotation($element);
		var pivot = computeOrigin($element, angle);
		var anchor = [x, y];
		var start = angle - calculateAngle(anchor[0] - pivot[0], 0);

		var rotation = {
			$element : $element,
			pivot    : pivot,
			anchor   : anchor,
			start    : start,
			angle    : start
		};

		showMarkers(rotation);
		$element.css('cursor', '-webkit-grabbing');

		return rotation;
	}

	/**
	 * Updates the rotation according to the new coordinates (x, y).
	 */
	function updateRotation(rotation, x, y) {
		rotation.angle = normalizeAngle(rotation.start + calculateAngle(
			x - rotation.pivot[0],
			y - rotation.anchor[1]
		));
		rotation.$element.css(
			CSS_TRANSFORM_PROPERTY_NAME,
			computeTransformation(rotation.angle)
		);
		showMarkers(rotation);
	}

	/**
	 * Given a cardinal or ordinal direction, will return the corresponding
	 * direction at a given angle from it.
	 *
	 * Reference: https://en.wikipedia.org/wiki/Cardinal_direction
	 */
	var rotateDirection = (function () {
		return function rotateDirection(point, angle) {
			angle = normalizeAngle(angle + compass[point]);
			return ((angle < compass.nne)
				? 'n'
				: (angle < compass.ene)
				? 'ne'
				: (angle < compass.ese)
				? 'e'
				: (angle < compass.sse)
				? 'se'
				: (angle < compass.ssw)
				? 's'
				: (angle < compass.wsw)
				? 'sw'
				: (angle < compass.wnw)
				? 'w'
				: (angle < compass.nnw)
				? 'nw'
				: 'n');
		};
	}());

	/**
	 * Updates the resize cursors of all the marker elements.
	 */
	var updateCursors = (function () {
		var cursors = {
			n  : 'ns-resize',
			e  : 'ew-resize',
			s  : 'ns-resize',
			w  : 'ew-resize',
			ne : 'ne-resize',
			sw : 'sw-resize',
			se : 'se-resize',
			nw : 'nw-resize'
		};
		return function updateCursors(angle) {
			var point;
			for (point in winds) {
				if (winds.hasOwnProperty(point)) {
					winds[point].css(
						'cursor',
						cursors[rotateDirection(point, angle)]
					);
				}
			}
		};
	}());

	/**
	 * Saves the current rotation angle as an attribute on the rotated element
	 * and hides boundingbox, pivot, and markers.
	 */
	function endRotation(rotation) {
		if (rotation) {
			rotation.$element.attr(MUNGED_ATTRIBUTE, rotation.angle);
		}
		updateCursors(rotation.angle);
		rotation.$element.css('cursor', '-webkit-grab');
		$selectedElement = rotation.$element;
		currentRotation = rotation;
	}

	var resizing = null;

	// https://en.wikipedia.org/wiki/Vector_projection
	function onMove(event) {
		if (!resizing) {
			return;
		}

		var offset = [
			event.pageX - resizing.start[0],
			event.pageY - resizing.start[1]
		];
		var direction = resizing.direction;
		var $element = resizing.$element;
		var projection = projectVector(offset, resizing.direction);
		var position = translateVector(resizing.start, projection);
		var scalarProjection = computeScalarProjection(offset, direction);
		var before = $element.offset();

		if ('w' === resizing.compassDirection
				|| 'e' === resizing.compassDirection) {
			$element.width($element.width() + scalarProjection);
		} else if ('n' === resizing.compassDirection
				|| 's' === resizing.compassDirection) {
			$element.height($element.height() + scalarProjection);
		} else {
			// ???
		}

		if (direction[0] < 0) {
			before.left = before.left + (scalarProjection * direction[0]);
		}
		if (direction[1] < 0) {
			before.top = before.top + (scalarProjection * direction[1]);
		}

		$element.offset(before);

		resizing.$marker.css({
			left: position[0],
			top: position[1]
		});

		/*
		var angle = resizing.normal - RIGHT_ANGLE;
		var pivot = computeOrigin($element, angle);
		var anchor = [$element.width(), $element.height()];
		var start = angle - calculateAngle(anchor[0] - pivot[0], 0);
		showMarkers({
			$element : $element,
			pivot    : pivot,
			anchor   : anchor,
			start    : start,
			angle    : start
		});
		*/

		resizing.start = position;
	}

	function getDirectionVector(angle) {
		// The angle of the normal calculated from the origin (0, 0) because
		// atan2 expects this.
		var directional = normalizeAngle(angle) - RIGHT_ANGLE;

		// Unit vector from the origin (0, 0) to the direction.
		return [Math.cos(directional), Math.sin(directional)];
	}

	function onMarkerDown(event) {
		disableSelection();

		var $marker = $(event.target).closest('.transformer-marker');
		var direction = $marker[0].id.replace('transformer-marker-', '');
		var offset = $marker.offset();
		var normal = compass[direction] + getElementRotation($selectedElement);

		resizing = {
			$marker: $marker,
			$element: $selectedElement,
			s: $selectedElement.offset(),
			direction: getDirectionVector(normal),
			start: [offset.left, offset.top],
			normal: normal,
			compassDirection: direction
		};
	}

	function onMarkerUp(event) {
		enableSelection();
		resizing = null;
	}

	$markers.on('mousedown', onMarkerDown);
	$(document).on('mousemove', onMove).on('mouseup', onMarkerUp);

	/**
	 * ___ __          __ __ __  __      __ __
	 *  | |__) /\ |\ |(_ |_ /  \|__)|\/||_ |__)
	 *  | | \ /--\| \|__)|  \__/| \ |  ||__| \
	 * ---------------------------------------->
	 */
	global.Transformer = {
		startRotation           : startRotation,
		endRotation             : endRotation,
		updateRotation          : updateRotation,
		clearElementAttributes  : clearElementAttributes,
		getElementRotation      : getElementRotation,
		enableSelection         : enableSelection,
		disableSelection        : disableSelection,
		rotateDirection         : rotateDirection,
		computeOrigin           : computeOrigin,
		computeBoundingBox      : computeBoundingBox,
		toRad                   : toRad,
		toDeg                   : toDeg
	};

}(window, window.jQuery));
