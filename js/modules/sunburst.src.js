/**
 * (c) 2016 Highsoft AS
 * Authors: Jon Arild Nygard
 *
 * License: www.highcharts.com/license
 *
 * This is an experimental Highcharts module which enables visualization
 * of a word cloud.
 */
'use strict';
import H from '../parts/Globals.js';
import '../parts/Series.js';
import './treemap.src.js';
var each = H.each,
	grep = H.grep,
	merge = H.merge,
	pick = H.pick,
	Series = H.Series,
	seriesType = H.seriesType,
	seriesTypes = H.seriesTypes,
	treemapPrototype = seriesTypes.treemap.prototype,
	reduce = treemapPrototype.utils.reduce;

var layoutAlgorithm = function layoutAlgorithm(parent, children) {
	var startAngle = parent.start,
		range = parent.end - startAngle,
		total = parent.val,
		x = parent.x,
		y = parent.y,
		radius = 20,
		innerRadius = parent.innerR + parent.r;

	return reduce(children, function (arr, child) {
		var percentage = (1 / total) * child.val,
			radians = percentage * range,
			values = {
				x: x,
				y: y,
				innerR: innerRadius,
				r: radius,
				start: startAngle,
				end: startAngle + radians
			};
		arr.push(values);
		startAngle = values.end;
		return arr;
	}, []);
};

var setShapeArgs = function setShapeArgs(parent, parentValues) {
	var childrenValues = [],
		// Collect all children which should be included
		children = grep(parent.children, function (n) {
			return !n.ignore;
		});
	childrenValues = layoutAlgorithm(parentValues, children);
	each(children, function (child, index) {
		var values = childrenValues[index];
		child.pointValues = {
			shapeArgs: values,
			shapeType: 'arc'
		};
		child.values = merge(values, {
			val: child.childrenTotal
		});
		// If node has children, then call method recursively
		if (child.children.length) {
			setShapeArgs(child, child.values);
		}
	});
};

/**
 * Default options for the Sunburst series.
 */
var sunburstOptions = {

};

/**
 * Properties of the Sunburst series.
 */
var sunburstSeries = {
	drawPoint: function drawPoint(point) {
		var series = this,
			group = series.group,
			renderer = series.chart.renderer,
			shape = point.shapeArgs,
			attr = series.pointAttribs(point, point.selected && 'select');
		point.graphic = renderer[point.shapeType](shape)
		.attr(attr)
		.add(group);
	},
	drawPoints: function drawPoints() {
		var series = this,
			points = series.points;
		each(points, function (point) {
			var node = point.node;
			point.shapeArgs = node.shapeArgs;
			point.shapeType = node.shapeType;
			series.drawPoint(point);
		});
	},
	pointAttribs: Series.prototype.pointAttribs,
	translate: function translate() {
		var series = this,
			chart = series.chart,
			rootId = series.rootNode = pick(series.rootNode, series.options.rootId, ''),
			tree,
			values,
			rootNode;

		// Call prototype function
		Series.prototype.translate.call(series);
		// Create a object map from level to options
		series.levelMap = reduce(series.options.levels, function (arr, item) {
			arr[item.level] = item;
			return arr;
		}, {});
		// @todo Only if series.isDirtyData is true
		tree = series.tree = series.getTree();
		rootNode = series.nodeMap[rootId];
		if (
			rootId !== '' &&
			(!rootNode || !rootNode.children.length)
		) {
			series.drillToNode('', false);
			rootId = series.rootNode;
			rootNode = series.nodeMap[rootId];
		}
		series.setTreeValues(tree);
		values = series.nodeMap[''].values = {
			start: 0,
			end: 2 * Math.PI,
			innerR: 0,
			r: 10,
			val: tree.val,
			x: chart.plotWidth / 2,
			y: chart.plotHeight / 2
		};
		setShapeArgs(tree, values);
	}
};

/**
 * Assemble the Sunburst series type.
 */
seriesType('sunburst', 'treemap', sunburstOptions, sunburstSeries);
