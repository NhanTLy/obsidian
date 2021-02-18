/**
 * NOTES:
 * 1. For now we will record the arguments as a string unless we come up with an alternative argument
 * 2. We won't worry about arguments on fields for now
 * 3. We won't worry about aliases for now
 * 4. We won't worry about handling directives for now
 * 5. We wont' worry about fragments for now
 * 6. This function will assume that everything passed in can be a query or a mutation (not both).
 * 7. We won't handle variables for now, but we may very well find we need to
 * 8. We will handle only the meta field "__typename" for now
 * 9. What edge cases as far as field/query names do we have to worry about: special characters, apostrophes, etc???
 *
 */
// this function will destructure a query/mutation operation string into a query/mutation operation object
export function destructureQueries(queryOperationStr) {
  // console.log(queryOperationStr)

  // ignore operation name by finding the beginning of the query strings
  const startIndex = queryOperationStr.indexOf('{');
  const queryStrings = queryOperationStr.substring(startIndex).trim();
  // create an array of individual query strings
  const arrayOfQueryStrings = findQueryStrings(queryStrings);
  // define the type property name of the operation query/mutation
  const typePropName =
    queryOperationStr.trim().slice(0, 8) === 'mutation' ?
    'mutations' :
    'queries';
  // let strippedProp = queryOperationStr.trim();
  // if (strippedProp.slice(0, 3) === 'que') const typePropName = 'queries';
  // else if (strippedProp.slice(0, 3) === 'mut') const typePropName = 'mutations';
  // else if (strippedProp.slice(0, 3) === 'fra') const typePropName = 'fragments';
  // create a queries object from array of query strings
  const queriesObj = createQueriesObj(arrayOfQueryStrings, typePropName);

  console.log(queriesObj)
  return queriesObj;
}

export function destructureQueriesWithFragments(queryOperationStr) {
  // create a copy of the input to mutate
  let copyStr = queryOperationStr;
  // declare an array to hold all fragments
  const fragments = [];
  // helper function to separate fragment from query/mutation
  const separateFragments = (copyStr) => {
    let startFragIndex = copyStr.indexOf('fragment');
    let startFragCurly = copyStr.indexOf('{', startFragIndex);
    let endFragCurly;
    const stack = ['{'];
    const curlsAndParens = {
      '}': '{',
      ')': '('
    };
    for (let i = startFragCurly + 1; i < copyStr.length; i++) {
      let char = copyStr[i];
      if (char === '{' || char === '(') {
        stack.push(char);
      }
      if (char === '}' || char === ')') {
        let topOfStack = stack[stack.length - 1];
        if (topOfStack === curlsAndParens[char]) stack.pop();
      }
      if (!stack[0]) {
        endFragCurly = i;
        break;
      }
    }
    let fragment = copyStr.slice(startFragIndex, endFragCurly + 1);
    fragments.push(fragment);
    let newStr = copyStr.replace(fragment, '');
    return newStr;
  }
  // keep calling helper function as long as 'fragment' is found in the string
  while (copyStr.indexOf('fragment') !== -1) {
    copyStr = separateFragments(copyStr);
  }
  // return an object with an array of fragment strings, as well as the query/mutation
  // separated from the fragments
  const result = {
  	fragArray: fragments,
    strippedString: copyStr
  }
  console.log('result object :', result);
  return result;
  // save fragments as object:
  // {
  //   types,
  //   name of fragments,
  //   fields,
  // }
}

// helper function to create an array of individual query strings from an operation string
export function findQueryStrings(queryStrings) {
  const result = [];
  let queryStartIndex = 1;
  let bracePairs = 0;
  let parensPairs = 0;
  let insideQuery = false;
  // loop begins at index 1 to ignore the open brace
  for (let i = 1; i < queryStrings.length; i += 1) {
    const char = queryStrings[i];
    // flips insideQuery flag when at the beginning of query fields
    if (char === '{' && !bracePairs && !parensPairs) insideQuery = true;
    // bracket/parens counter
    if (char === '{') bracePairs += 1;
    if (char === '}') bracePairs -= 1;
    if (char === '(') parensPairs += 1;
    if (char === ')') parensPairs -= 1;
    // special operation for when we find the end of the query strings
    if (i === queryStrings.length - 1) {
      const queryStr = queryStrings.substring(queryStartIndex, i).trim();
      result.push(queryStr);
      break;
    }
    // finding the beginning of a subsequent query name will trigger storing the current query string and resetting variables
    if (char.match(/[^{}()\s]/) && !bracePairs && !parensPairs && insideQuery) {
      const queryStr = queryStrings.substring(queryStartIndex, i - 1).trim();
      result.push(queryStr);
      insideQuery = false;
      queryStartIndex = i;
      continue;
    }
  }
  console.log('findQueryString result: ', result);
  return result;
}
// helper function to create a queries object from an array of query strings
export function createQueriesObj(arrayOfQueryStrings, typePropName) {
  // define a new empty result object
  const queriesObj = {};
  queriesObj[typePropName] = [];
  // for each query string
  arrayOfQueryStrings.forEach((queryStr) => {
    // split the query string into multiple parts
    const queryObj = splitUpQueryStr(queryStr);
    // recursively convert the fields string to a fields object and update the fields property
    queryObj.fields = findQueryFields(queryObj.fields);
    // push the finished query object into the queries/mutations array on the result object
    queriesObj[typePropName].push(queryObj);
  });
  return queriesObj;
}
// helper function that returns an object with a query string split into multiple parts
export function splitUpQueryStr(queryStr) {
  // creates new queryObj
  const queryObj = {};
  let parensPairs = 0;
  const argsStartIndex = queryStr.indexOf('(');
  const firstBraceIndex = queryStr.indexOf('{');
  // checks to see if there are no arguments
  if (argsStartIndex === -1 || firstBraceIndex < argsStartIndex) {
    queryObj.name = queryStr.substring(0, firstBraceIndex).trim();
    queryObj.arguments = '';
    queryObj.fields = queryStr.substring(firstBraceIndex);
    return queryObj;
  }
  // finds the query name string and assigns it
  queryObj.name = queryStr.substring(0, argsStartIndex).trim();
  // begin iterating through the queryString at the beginning of the arguments
  for (let i = argsStartIndex; i < queryStr.length; i += 1) {
    const char = queryStr[i];
    if (char === '(') parensPairs += 1;
    if (char === ')') parensPairs -= 1;
    // returns the arguments string when the matching closing parens is found
    if (char === ')' && !parensPairs) {
      let argsString = queryStr.substring(argsStartIndex, i + 1);
      // removes whitespace inside parens string;
      argsString = argsString.replace(/\s/g, '');
      // handles edge case where ther are no arguments inside the argument parens pair.
      if (argsString === '()') argsString = '';
      queryObj.arguments = argsString;
      queryObj.fields = queryStr.substring(i + 1).trim();
      return queryObj;
    }
  }
}

// helper function to recursively convert the fields string to a fields object
export function findQueryFields(fieldsStr) {
  const fieldsObj = {};
  let fieldCache = '';
  let foundEndOfFieldName = false;
  // starts at index 1 to skip first open brace
  for (let i = 1; i < fieldsStr.length; i += 1) {
    const char = fieldsStr[i];
    // the brace indicates that we have found the fields object for a complex field
    if (char === '{') {
      const closingBraceIndex = findClosingBrace(fieldsStr, i);
      const complexFieldName = fieldCache;
      const complexFieldObjStr = fieldsStr.substring(i, closingBraceIndex + 1);
      fieldsObj[complexFieldName] = findQueryFields(complexFieldObjStr);
      // reset cache string
      fieldCache = '';
      // update index to resume iteration from
      i = closingBraceIndex;
      foundEndOfFieldName = false;
      continue;
    }
    // finding a whitespace character while the fieldCache has non-zero length indicates the end of a field name
    if (char.match(/\s/) && fieldCache.length) {
      foundEndOfFieldName = true;
      continue;
    }
    // finding a non-whitespace character after the end of fieldname indicates the field is scalar or meta
    if (char.match(/\S/) && foundEndOfFieldName) {
      fieldsObj[fieldCache] = fieldCache === '__typename' ? 'meta' : 'scalar';
      fieldCache = '';
      foundEndOfFieldName = false;
    }
    // break out when you find a closing brace
    if (char === '}') break;
    // adds current non-whitespace character in fieldCache
    if (char.match(/\S/)) fieldCache += char;
  }
  console.log('findQueryFields result: ', fieldsObj);
  return fieldsObj;
}

// helper function to find the partner closing brace
export function findClosingBrace(str, index) {
  let bracePairs = 0;
  // skips ahead 1 index to skip first brace
  for (let i = index + 1; i < str.length; i += 1) {
    const char = str[i];
    if (char === '}' && !bracePairs) return i;
    if (char === '{') bracePairs += 1;
    if (char === '}') bracePairs -= 1;
  }
}

export default destructureQueries;

/*function destructureQueriesWithFragments(queryOperationStr) {
  let copyStr = queryOperationStr;
  const fragments = [];
  
  const separateFragments = (copyStr) => {
    let startFragIndex = copyStr.indexOf('fragment');
    let startFragCurly = copyStr.indexOf('{', startFragIndex);
    let endFragCurly;
    const stack = ['{'];
    const curlsAndParens = {
      '}': '{',
      ')': '('
    };
    for (let i = startFragCurly + 1; i < copyStr.length; i++) {
      let char = copyStr[i];
      if (char === '{' || char === '(') {
        stack.push(char);
      }
      if (char === '}' || char === ')') {
        let topOfStack = stack[stack.length - 1];
        if (topOfStack === curlsAndParens[char]) stack.pop();
      }
      if (!stack[0]) {
        endFragCurly = i;
        break;
      }
    }
    let fragment = copyStr.slice(startFragIndex, endFragCurly + 1);
    fragments.push(fragment);
    let newStr = copyStr.replace(fragment, '');
    return newStr;
  }
  
  while (copyStr.indexOf('fragment') !== -1) {
    copyStr = separateFragments(copyStr);
  }
  const result = {
  	fragArray: fragments,
    strippedString: copyStr
  }
  return result;
}

let str = `query { 
  viewer { 
    ...LoginAndID
  }
}

mutation {
  hi
}

fragment secondFrag on User {
	{}
	()
}

fragment LoginAndID on User {
  login
  id
	{ hi hi hi hello}
	()
}`;

console.log(destructureQueriesWithFragments(str));
*/