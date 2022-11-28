//Define constants
const SHEET_NAME="Sheet1";
const GTREND_HOST = "https://trends.google.com";
const EXPLORE_ENDPOINT = "/trends/api/explore";
const MULTILINE_ENDPOINT = "/trends/api/widgetdata/multiline";

/*
Request - Response to Google Trends 
1. First, send a request to GTREND_HOST + EXPLORE_ENDPOINT
1.1. Response fails if no 'Cookie' header was sent. Read 'set-cookie header response and save it
1.2. Re-request to GTREND_HOST + EXPLORE_ENDPOINT with 'Cookie' header
1.3. Read from response json object with widget array info 'interest over time' and id, token values.
2. Request GTREND_HOST + MULTILINE_ENDPOINT with headers: 'Cookie', h1, tz, req (key, geo, category, property), token
2.1. Read from response json object with timelinedata and add to rows in sheet
*/

// To store Cookie
let cookieVal;

/**
 * Get timeline data from Google Trends MULTILINE_ENDPOINT
 * @param {string} keyword  The keyword search term
 * @param {string} geo
 * @param {string} time
 */
function getInterestResults(keyword, geo, time){
  const _id = 'TIMESERIES';

  let params = {    
    method: 'GET',
    host: GTREND_HOST,
    path: EXPLORE_ENDPOINT,
    qs: {
      hl: 'en-US',
      tz: 360,
      req: JSON.stringify({
        comparisonItem: [{
          "keyword": keyword,
          "geo": geo,
          "time": time
        }],
        category: 0,
        property: ""
      })  
    }
  };
  
  let results = request(params);
  if(results){
    const parsedResults = parseResults(results);

    /**
     * Search for the id that matches the search result     
     */
    const resultObj = parsedResults.find(( {id = ''})=> {
      return id.indexOf(_id) > -1;
    });
    if(!resultObj){
      const errorObj = {
        message: 'Available widgets does not contain selected api type',
        requestBody: results
      };
      throw errorObj;
    }

    let req = resultObj.request;
    const token = resultObj.token;

    req = JSON.stringify(req);

    const nextOptions = params;
    nextOptions.path = MULTILINE_ENDPOINT;
    nextOptions.qs.req = req;
    nextOptions.qs.token = token;

    results = request(nextOptions);
    if(results){
      // We got interest over time data 
      // Now we can add to Sheet
      const data = JSON.parse(results.slice(5));
      let sheet = SpreadsheetApp.getActiveSheet();     
      /*if(sheet.getRange(sheet.getLastRow(), 2).getValue()!=="Value"){
        // Append header row
        let headerRow = ['Time', 'Value'];
        sheet.appendRow(headerRow);
      }*/     
      let max = [];
      const timeZone = 'America/Los_Angeles';
      const today = Utilities.formatDate(new Date(), timeZone, 'MMM dd, yyyy');  
      data.default.timelineData.forEach((elem)=>{
        let rowContent = [];
        if(equalDate(elem.formattedTime.split(" at")[0], today))
          max.push(elem.value[0]);                
        if(dataAlreadyExist(sheet, elem.formattedTime)) return;
        rowContent.push(elem.formattedTime, elem.value[0]);
        sheet.appendRow(rowContent);        
      });
      sheet.getRange("todayMaxValue").setValue(Math.max(...max));
    }else{
      // Error or no data
      console.error(`No data for search term: ${keyword}`);
    }
  }
}

/**
 * Send HTTP request to Google Trends
 * @param {String} method  GET | POST
 * @param {String} host    Google Trends host
 * @param {String} path    The API endpoint
 * @param {String} qs      The querystring
 * @return {String | null} Returns the content response or null if no content
 */
function request({method, host, path, qs}){
  //HTTP Request Headers
  let headers = {
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:106.0) Gecko/20100101 Firefox/106.0",
    "Cookie": ""
  };

  if(cookieVal) headers.Cookie = cookieVal;
  
  //UrlFetchApp options
  let options = {
    "method": 'GET',
    "headers": headers,
    "muteHttpExceptions": true
  };
   
  let url = `${host}${path}${addQuery(qs)}`;  
  
  //send HTTP request  
  let response = UrlFetchApp.fetch(url, options);
  if(response.getResponseCode()===429 && response.getHeaders()['Set-Cookie']){
    // Fix for the "too many requests" issue
    // Look for the set-cookie header and re-request
    let cookieHeader = response.getHeaders()['Set-Cookie'];
    cookieVal = cookieHeader.split(";")[0];    
    options.headers.Cookie = cookieVal;

    //re-request
    response = UrlFetchApp.fetch(url, options);    
  }
  if(response.getResponseCode()===200){
    return response.getContentText();
  }
  else{
    //Maybe we've reached too many request, wait...and try again
    return null;
  }
}

/**
 * Main function that trigger runs 
 * No @param
 */
function interestOverTime(){
  let url = SpreadsheetApp.getActiveSheet().getRange("A2").getValue();  
  if(typeof url === 'string'){
    const params = parseQuery(url);      
    getInterestResults(params.q[0], params.geo[0], decodeURIComponent(params.date[0]));
  }  
}

function setTriggers(){
  setupTrigger("interestOverTime");
}

function onOpen(e){
  // Add a custom menu to spreadsheet
  SpreadsheetApp.getUi()
    .createMenu("Auto refresh")
    .addItem("Enable", "setTriggers")
    .addItem("Disable", "deleteAllTriggers")
    .addToUi();
}
