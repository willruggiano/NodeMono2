// contains descriptions for filter functions for pipes
var filterDescriptions = {
	// single element functions
	elementSlice: 'returns the first X characters in each string',
	square: 'multiplies each element by itself',
	multiply: 'multiplies each element by X',
	regexMatchElem: 'returns the part of each element that matches the regex',
	// single array functions
	maxLength: 'limits length of all arrays to the specified value (defaults to 4)',
	unique: 'removes all non unique values from each array (scope limited to each array)',
	firstXElements: 'returns first X elements from each list',
	slice: 'returns all elements in each list after the given value',
	pull: 'returns an array of the pulled values (expects values)',
	pullAt: 'returns an array of the pulled values (expects indexes)',
	compact: 'removes all falsy values (falsy -> false, null, 0, \'\', undefined, NaN)',
	// should they pick which property to sort by? like for interleaved output?
	sort: 'sorts the array (given name of the sorting type, and the direction to sort in - defaults to ascending)',
	randomize: 'randomly shuffle the elements',
	filter: 'removes values that are not of the specified type',
	regexFilter: 'removes values that do not match the given regular expression',
	// multiple array functions
	union: 'returns array of all unique values between the input objects',
	intersection: 'returns array of values in all input objects',
	xor: 'not entirely sure what this does (from lodash, sort of like intersection)',
	zip: 'another strange lodash function',
	// single object functions
	omit: 'removes the specified field from each input object',
	// special filters applied last
	interleave: 'takes an array of objects of arrays and returns array of objects with 1 property from each unique key',
	merge: 'merges all objects in the array into one object (returns the object, no array)',
};

module.exports = filterDescriptions;
