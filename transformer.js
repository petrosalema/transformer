/* Transformer.js | (c) 2013 Petro Salema | petrosalema.github.io/transformer */
(function Transformer(global, $) {
	'use strict';

	if (typeof mandox !== 'undefined') {
		eval(uate)('tranformer.js');
	}

	(function showGrid() {
		var size = 50;
		var w = $(window).width() + size;
		var h = $(window).height() + size;
		var rows = Math.ceil(h / size);
		var cols = Math.ceil(w / size);
		var i;
		$('.transformer-grid-line').remove();
		for (i = 0; i < rows; i++) {
			$('<div class="transformer-grid-line"></div>').css({
				position: 'absolute',
				borderTop: '1px dashed rgba(0,0,0,0.1)',
				width: w,
				height: 1,
				left: 0,
				top: size * i
			}).appendTo('body');
		}
		for (i = 0; i < cols; i++) {
			$('<div class="transformer-grid-line"></div>').css({
				position: 'absolute',
				borderLeft: '1px dashed rgba(0,0,0,0.1)',
				width: 1,
				height: h,
				left: size * i,
				top: 0
			}).appendTo('body');
		}
		var timer;
		$(window).resize(function () {
			if (timer) {
				clearTimeout(timer);
			}
			timer = setTimeout(showGrid, 200);
		});
	}());

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
	var MUNGED_ATTRIBUTE = 'data-' + Math.random().toString(16).substr(2)
	                     + '-rotation';

	var PREFIXES = ['-webkit', '-moz', '-o'];
	function vendorPrefix(prop, value) {
		var obj = {};
		var i;
		obj[prop] = value;
		for (i = 0; i < PREFIXES.length; i++) {
			obj[PREFIXES[i] + '-' + prop] = value;
		}
		return obj;
	}

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
			$(this).removeAttr('unselectable', 'on')
			       .css(vendorPrefix('user-select', 'all'));
		}).each(function () {
			this.onselectstart = null;
		});
	}

	function disableSelection($element) {
		($element || $('body')).each(function () {
			$(this).attr('unselectable', 'on')
			       .css(vendorPrefix('user-select', 'none'));
		}).each(function () {
			this.onselectstart = function () { return false; };
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
	function computeOrigin(box) {
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
		var angle = calculateAngle(vector[0], vector[1]);

		// The angle of the direction on which the vector will be projected
		var directionAngle = calculateAngle(direction[0], direction[1]);

		return computeMagnitude(vector) * Math.cos(angle - directionAngle);
	}

	function projectVector(vector, direction) {
		var scalarProjection = computeScalarProjection(vector, direction);
		return [
			scalarProjection * direction[0],
			scalarProjection * direction[1]
		];
	}

	function getDirectionVector(angle) {
		// The angle of the normal calculated from the origin (0, 0) because
		// atan2 expects this.
		var directional = normalizeAngle(angle) - RIGHT_ANGLE;

		// Unit vector from the origin (0, 0) to the direction.
		return [Math.cos(directional), Math.sin(directional)];
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
		return function updateCursors(orientation) {
			var point;
			for (point in winds) {
				if (winds.hasOwnProperty(point)) {
					winds[point].css(
						'cursor',
						cursors[rotateDirection(point, orientation.rotation)]
					);
				}
			}
		};
	}());

	/**
	 * Orientates and shows the given markers around the rotation.
	 */
	function showMarkers(orientation) {
		if (!orientation) {
			return;
		}

		var width = orientation.$element.outerWidth();
		var height = orientation.$element.outerHeight();

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

		var origin = computeOrigin(computeBoundingBox(
			orientation.$element,
			orientation.rotation
		));

		var point;
		var pos;
		for (point in directions) {
			if (directions.hasOwnProperty(point)) {
				pos = translateVector(
					rotateVector(directions[point], orientation.rotation),
					origin
				);
				winds[point].css('left', pos[0]).css('top', pos[1]).show();
			}
		}

		var offset = orientation.$element.offset();

		$boundingbox.show().offset(offset)
		            .css('width', (origin[0] - offset.left) * 2)
		            .css('height', (origin[1] - offset.top) * 2);

		$pivot.show().css('left', origin[0]).css('top', origin[1]);

		updateCursors(orientation);
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
	 * @TODO: use the css transform matrix
	 */
	function getElementRotation($element) {
		return parseFloat($element.attr(MUNGED_ATTRIBUTE)) || 0;
	}

	/**
	 * Cleans an element of transformation annotations.
	 */
	function clearElementAttributes($element) {
		$element.removeAttr(MUNGED_ATTRIBUTE);
	}


	// ---------- Creating ----------


	function startCreating(x, y) {
		disableSelection();
		var $element = $('<div class="transformer-element">⇡</div>').appendTo('body');
		$element.css('position', 'absolute').css({
			left: x,
			top: y
		});
		return {create: {
			$element: $element,
			x: x,
			y: y,
			rotation: 0
		}};
	}

	function updateCreating(operation, x, y) {
		operation.$element.css({
			width: x - operation.x,
			height: y - operation.y
		});
	}

	function endCreating(operation) {
		return operation.$element;
	}


	// ---------- Rotating ----------


	/**
	 * Initializes rotation for the given element at point (x, y).
	 */
	function startRotating(element, x, y) {
		disableSelection();
		var $element = $(element).css('cursor', '-webkit-grabbing');
		var rotation = getElementRotation($element);
		var bounding = computeBoundingBox($element, rotation);
		return {rotate: {
			x: bounding[0],
			y: bounding[1],
			$element : $element,
			origin: computeOrigin(bounding),
			start: rotation,
			rotation: rotation,
			anchor: [x, y]
		}};
	}

	/**
	 * Updates the rotation according to the new coordinates (x, y).
	 */
	function updateRotating(operation, x, y) {
		operation.rotation = normalizeAngle(operation.start + calculateAngle(
			x - operation.origin[0],
			y - operation.anchor[1]
		));
		operation.$element.css(vendorPrefix(
			'transform',
			computeTransformation(operation.rotation)
		));
	}

	/**
	 * Saves the current rotation angle as an attribute on the rotated element
	 * and hides boundingbox, pivot, and markers.
	 */
	function endRotating(operation) {
		operation.$element.attr(MUNGED_ATTRIBUTE, operation.rotation);
		operation.$element.css('cursor', '-webkit-grab');
		return operation.$element;
	}


	// ---------- Resizing ----------


	function startResizing($element, marker, x, y) {
		disableSelection();
		var $marker = $(marker).closest('.transformer-marker');
		var direction = $marker[0].id.replace('transformer-marker-', '');
		var offset = $marker.offset();
		var rotation = getElementRotation($element);
		var normal = compass[direction] + rotation;
		return {resize: {
			$marker: $marker,
			$element: $element,
			direction: getDirectionVector(normal),
			start: [offset.left, offset.top],
			normal: normal,
			compassDirection: direction,
			rotation: rotation
		}};
	}

	// https://en.wikipedia.org/wiki/Vector_projection
	function updateResizing(operation, x, y) {
		var delta = [x - operation.start[0], y - operation.start[1]];
		var direction = operation.direction;
		var $element = operation.$element;
		var projection = projectVector(delta, direction);
		var position = translateVector(operation.start, projection);
		var scalarProjection = computeScalarProjection(delta, direction);
		var offset = $element.offset();

		if ('w' === operation.compassDirection
				|| 'e' === operation.compassDirection) {
			operation.w = $element.width() + scalarProjection;
			$element.width($element.width() + scalarProjection);
		} else if ('n' === operation.compassDirection
				|| 's' === operation.compassDirection) {
			$element.height($element.height() + scalarProjection);
		}

		if (direction[0] < 0) {
			offset.left = offset.left + (scalarProjection * direction[0]);
		}
		if (direction[1] < 0) {
			offset.top = offset.top + (scalarProjection * direction[1]);
		}

		$element.offset(offset);

		operation.$marker.css({
			left: position[0],
			top: position[1]
		});

		operation.start = position;
	}

	function endResizing(operation) {
		return operation.$element;
	}

	function update(operation, x, y) {
		if (operation.create) {
			updateCreating(operation.create, x, y);
		} else if (operation.rotate) {
			updateRotating(operation.rotate, x, y);
		} else if (operation.resize) {
			updateResizing(operation.resize, x, y);
		}
		showMarkers(operation.create || operation.rotate || operation.resize);
	}

	function end(operation) {
		enableSelection();
		if (operation.create) {
			endCreating(operation.create);
		} else if (operation.rotate) {
			endRotating(operation.rotate);
		} else if (operation.resize) {
			endResizing(operation.resize);
		}
		var orientation = operation.create
		               || operation.rotate
		               || operation.resize;
		showMarkers(orientation);
		return orientation.$element;
	}

	/**
	 * ___ __          __ __ __  __      __ __
	 *  | |__) /\ |\ |(_ |_ /  \|__)|\/||_ |__)
	 *  | | \ /--\| \|__)|  \__/| \ |  ||__| \
	 * >--------------------------------------->
	 */
	global.Transformer = {
		startCreating: startCreating,
		startRotating: startRotating,
		startResizing: startResizing,
		updateCreating: updateCreating,
		updateRotating: updateRotating,
		updateResizing: updateResizing,
		endCreating: endCreating,
		endRotating: endRotating,
		endResizing: endResizing,
		update: update,
		end: end,
		clearElementAttributes: clearElementAttributes,
		enableSelection: enableSelection,
		disableSelection: disableSelection,
		toRad: toRad,
		toDeg: toDeg
	};

}(window, window.jQuery));
