const HOUR_OF_EXECUTION = 7;

/**
 * Encode JSON object to querystring
 * @param {Object}
 * @return {String} Encoded querystring
 */
function addQuery(obj) {
  return Object.keys(obj).reduce(function(p, e, i) {
    return p + (i == 0 ? "?" : "&") +
      (Array.isArray(obj[e]) ? obj[e].reduce(function(str, f, j) {
        return str + e + "=" + encodeURIComponent(f) + (j != obj[e].length - 1 ? "&" : "")
      },"") : e + "=" + encodeURIComponent(obj[e]));
  },"");
}

/**
 * Parse the querystring of the HTTP request
 * @param {String} url  The querystring
 * @return {Object}
 */
function parseQuery(url){  
  let query = url.split("?")[1];
  if(query){
    return query.split("&")
      .reduce(function(o, e){
        let temp = e.split("=");
        let key = temp[0].trim();
        let value = temp[1].trim();
        value = isNaN(value) ? value : Number(value);
        if(o[key]){
          o[key].push(value);
        }else{
          o[key] = [value];
        }
        return o;
      }, {});
  }
  return null;
}
/**
 * Parse the results of the Google API as JSON
 * Throws an Error if the JSON is invalid
 * @param {String} results
 * @return {Object}
 */
function parseResults(results){
  // If this fails, you've hit the rate limit or Google has changed something
  try{
    return JSON.parse(results.slice(4)).widgets;
  }catch(e){
    e.requestBody = results;
    throw e;
  }
}
/**
 * Check if timelinedata is already on sheet
 * @param {Sheet} sheet   
 * @param {Date} date
 * @return {Boolean}  Returns true or false
 */
function dataAlreadyExist(sheet, date){
  let dateValue = sheet.getRange("A2:A"+sheet.getLastRow()).getValues();
  const found = dateValue.find((d)=> d[0] === date);
  return found;
}

function setupTrigger(handler){
  ScriptApp
  .newTrigger(handler)
  .timeBased()
  .atHour(HOUR_OF_EXECUTION)
  .everyDays(1)
  .inTimezone("America/Los_Angeles")
  .create();
}

function equalDate(d1, d2){
  return d1 == d2;
}

function deleteAllTriggers(){
  let triggers = ScriptApp.getProjectTriggers().forEach((trigger)=>{
    ScriptApp.deleteTrigger(trigger);
  });
}
