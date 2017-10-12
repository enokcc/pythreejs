var _ = require('underscore');
var THREE = require('three');
var CloneArrayAutogen = require('./CloneArray.autogen').CloneArrayModel;


function ThreeCloneArray(original, positions, merge) {
    THREE.Object3D.call(this);

    this.original = original;
    this.positions = positions;
    this.merge = merge;

    this.build();
}


ThreeCloneArray.prototype = Object.assign(Object.create(THREE.Object3D.prototype), {

	constructor: ThreeCloneArray,

    clear: function() {

    },

    isComplete: function() {
        return !!this.original && !!this.positions;
    },

    build: function() {
        if (this.children) {
            this.clear();
        }
        if (!this.isComplete()) {
            return;
        }
        if (this.merge) {

            // Make clones of original geometry, translate them, and merge all into one
            // Put this merged geometry in a clone of the original Mesh.
            var geom = new THREE.BufferGeometry();
            // Workaround for threejs issue #11528:
            if (this.original.geometry && this.original.geometry.isBufferGeometry) {
                geom.copy(this.original.geometry);
            } else {
                geom.setFromObject(this.original);
            }

            var N = this.positions.length;
            var count = geom.getAttribute('position').count;

            // Attribute count per
            var merged = new THREE.BufferGeometry();
            var attributes = geom.attributes;
            for (var key in attributes) {
                var attribute = attributes[ key ];
                var attributeArray = attribute.array;
                // Allocate new buffer:
                var mergedAttributeArray = new attributeArray.constructor(attributeArray.length * N);
                var mergedAttribute = new attribute.constructor(mergedAttributeArray, attribute.itemSize, attribute.normalized);
                mergedAttribute.dynamic = attribute.dynamic;
                merged.addAttribute(key, mergedAttribute);
            }

            var oldIndex = geom.getIndex();
            if (oldIndex) {
                var newIndex = [];
                for (var i=0; i < N; ++i) {
                    for (var j=0; j < oldIndex.count; ++j) {
                        newIndex.push(oldIndex.array[j] + i * count);
                    }
                }
                merged.setIndex(newIndex);
            }

            // Loop over positions
            var i = 0;
            this.original.updateMatrix();
            var matrix = this.original.matrix.clone();
            this.positions.forEach(function(pos) {
                var clone = geom.clone();
                matrix.setPosition(pos);
                clone.applyMatrix(matrix);
                merged.merge(clone, count * i++);
            }, this);
            var obj = this.original.clone();
            obj.geometry = merged;
            if (obj.updateMorphTargets) {
                obj.updateMorphTargets();
            }
            this.add(obj);

        } else {

            // Make clones of original, position them, and add as children
            this.positions.forEach(function(pos) {
                var clone = this.original.clone();
                clone.position.copy(pos);
                this.add(clone);
            }, this);

        }
    },

} );


var CloneArrayModel = CloneArrayAutogen.extend({

    constructThreeObject: function() {

        var result = new ThreeCloneArray(
            this.convertThreeTypeModelToThree(this.get('original'), 'original'),
            this.convertVectorArrayModelToThree(this.get('positions'), 'positions'),
            this.get('merge')
        );
        return Promise.resolve(result);

    },

    // push data from model to three object
    syncToThreeObj: function(force) {

        this._needs_rebuild = false;
        CloneArrayAutogen.prototype.syncToThreeObj.call(this, arguments);
        if (this._needs_rebuild) {
            this.obj.build();
        }

    },

    createPropertiesArrays: function() {

        CloneArrayAutogen.prototype.createPropertiesArrays.call(this);

        this.property_assigners['original'] = 'rebuildAssigner';
        this.property_assigners['positions'] = 'rebuildAssigner';
        this.property_assigners['merge'] = 'rebuildAssigner';

    },

    rebuildAssigner: function(obj, key, value) {
        if (key === 'positions') {
            this.assignArray(obj, key, value);
        } else {
            this.assignDirect(obj, key, value);
        }
        this._needs_rebuild = true;
    }

});

module.exports = {
    CloneArrayModel: CloneArrayModel,
};
