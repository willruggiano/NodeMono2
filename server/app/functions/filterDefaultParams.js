// contains default parameters for filter functions for pipes (for seed file)
var filterDefaultParams = {
	// single array functions
	maxLength: [4],
	unique: [],
	firstXElements: [],
	slice: [],
	pull: [],
	pullAt: [],
	compact: [],
	sort: ['alphabetic'],
	randomize: [],
	// multiple array functions
	union: [],
	intersection: [],
	xor: [],
	zip: [],
	// single object functions
	omit: ['headline'],
	// special filters applied last
	interleave: [],
	merge: [],
};

module.exports = filterDefaultParams;
