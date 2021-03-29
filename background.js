(function(){
  'use strict';

  console.log('mParticle Extension Service Worker ready');

  let storedRequests = [];
  let notificationFadeHandler = false;

  chrome.action.onClicked.addListener(function(e){
    let url = chrome.runtime.getURL("ui/inspector.html");
    chrome.tabs.create({url: url});
  });

  let clearLog = function() {
    console.log("clearing log");
    chrome.storage.local.set({requests: null});
    storedRequests = [];
    showNotification(0);
  }

  let messageHandler = function(msg, sender, sendResponse) {
    if(msg.hasOwnProperty("event")) {
      switch(msg.event) {
        case "btn-clear-log-click":
          console.log("Clear log button click event received");
          clearLog();
          sendResponse({event: "log-cleared"});
          chrome.runtime.sendMessage({event: "log-cleared"});
          return;
        case "fetch-stored-requests":
          sendResponse(fetchStoredRequests());
          return;
        case "fetch-stored-request-by-id":
          sendResponse(fetchStoredRequestById(msg.requestId));
        default:
          return;
      }
    }
  }

  chrome.runtime.onMessage.addListener(messageHandler);

  let mapStoredRequests = function(requestFromStorage) {
    switch(requestFromStorage.type) {
      case "v1-forwarding":
        requestFromStorage.request = new mParticleV1RequestBody(requestFromStorage.request);
        return requestFromStorage;
      case "v3-events":
        requestFromStorage.request = new mParticleV3RequestBody(requestFromStorage.request);
        return requestFromStorage;
      default:
        return requestFromStorage;
    }
  }

  let showNotification = function(num) {
    if(!num) {
      chrome.action.setBadgeText({ text: ""});
      return;
    }
    if(notificationFadeHandler) {
      clearInterval(notificationFadeHandler);
    }
    chrome.action.setBadgeText({text: String(num)});
    let current = 0;
    let finish = 210;
    notificationFadeHandler = setInterval(function(){
      if(current > finish) {
        clearInterval(notificationFadeHandler);
      }
      chrome.action.setBadgeBackgroundColor({color:[80,current,80,1]});
      current += 5;
    }, 1);
    
  }

  chrome.storage.local.get(["requests"], function(result){
    if(result.requests && result.requests.length > 0) {
      console.log("Retrieved requests from storage");
      console.log(result.requests);
      storedRequests = result.requests.map(mapStoredRequests);
      showNotification(storedRequests.length);
    } else {
      console.log("No requests in storage yet.");
    }
  });
  
  let storeRequest = function(requestId, type, request) {
    let now = Math.floor(Date.now() / 1000);
    console.log("Storing request with timestamp " + now);
    storedRequests.push({
      requestId: parseInt(requestId),
      type: type,
      timestamp: now,
      request: request,
      statusCode: null
    });
    chrome.storage.local.set({ requests: storedRequests });
    showNotification(storedRequests.length);
    chrome.runtime.sendMessage({event: "event-stored"});
  }

  let updateRequest = function(requestId, statusCode) {
    let found = false;
    storedRequests = storedRequests.map(r => {
      if(r.requestId == parseInt(requestId)) {
        r.statusCode = statusCode;
        found = true;
      }
      return r;
    });
    if(!found) {
      console.log("Request with ID " + requestId + " not found.");
    } else {
      console.log("Request with ID " + requestId + " updated with statusCode " + statusCode);
      chrome.storage.local.set({ requests: storedRequests });
    }
    chrome.runtime.sendMessage({event: "event-updated"});
  }

  let fetchStoredRequests = function() {
    return storedRequests;
  }

  let fetchStoredRequestById = function(requestId) {
    return storedRequests.find(r => r.requestId == requestId);
  }

  let beforeRequestListener = function(details){
    console.log("Request starting");
    if(details.url.includes("://jssdks.mparticle.com/v1") && details.url.includes("/Forwarding")) {
      console.log("Found an mParticle V1 forwarding request...");
      let body = JSON.parse(decodeURIComponent(String.fromCharCode.apply(null, new Uint8Array(details.requestBody.raw[0].bytes))));
      let request = new mParticleV1RequestBody(body);
      storeRequest(details.requestId, "v1-forwarding", request);
    } else if (details.url.includes("://jssdks.mparticle.com/v3") && details.url.includes("/events")) {
      console.log("Found an mParticle V3 events request...");
      let body = JSON.parse(decodeURIComponent(String.fromCharCode.apply(null, new Uint8Array(details.requestBody.raw[0].bytes))));
      let request = new mParticleV3RequestBody(body);
      storeRequest(details.requestId, "v3-events", request);
    } else {
      console.log("Intercepted an unknown request: " + details.url);
    }
  }

  let afterRequestListener = function(details){
    updateRequest(details.requestId, details.statusCode);
    console.log("Request complete.");
    console.log(details);
    showNotification(storedRequests.length);
    chrome.runtime.sendMessage({event: "new-requests"});
  }
  
  let filter = { urls: ["*://jssdks.mparticle.com/*"] };
  
  chrome.webRequest.onBeforeRequest.addListener(
    beforeRequestListener,
    filter,
    ["extraHeaders", "requestBody"]
  );

  chrome.webRequest.onCompleted.addListener(
    afterRequestListener,
    filter,
    []
  );

  class mParticleV1RequestBody {
    constructor(body) {
      this.mid = body.mid;
      this.esid = body.esid;
      this.n = body.n;
      this.sdk = body.sdk;
      this.dt = body.dt;
      this.et = body.et;
      this.dbg = body.dbg;
      this.ct = body.ct;
      this.eec = body.eec;
      this.dp = body.dp;
      this.attrs = new mParticleV1RequestBodyAttributes(body.attrs);
    }
  }

  class mParticleV1RequestBodyAttributes {
    constructor(mParticleRequestAttrs) {
      this.content_type = mParticleRequestAttrs.content_type;
      this.content_author = mParticleRequestAttrs.content_author;
      this.content_topic = mParticleRequestAttrs.content_topic;
      this.content_url_topic = mParticleRequestAttrs.content_url_topic;
      this.platform_referrer = mParticleRequestAttrs.platform_referrer;
      this.search_term = mParticleRequestAttrs.search_term;
      this.page_type = mParticleRequestAttrs.page_type;
      this.user_type = mParticleRequestAttrs.user_type;
      this.session_id = mParticleRequestAttrs.session_id;
      this.depth1 = mParticleRequestAttrs.depth1;
      this.depth2 = mParticleRequestAttrs.depth2;
      this.depth3 = mParticleRequestAttrs.depth3;
      this.depth4 = mParticleRequestAttrs.depth4;
      this.depth5 = mParticleRequestAttrs.depth5;
      this.page = mParticleRequestAttrs.page;
      this.title = mParticleRequestAttrs.title;
      this.referrer = mParticleRequestAttrs.referrer;
      this.survey_sport = mParticleRequestAttrs.survey_sport;
      this.survey_background_screen_enabled = mParticleRequestAttrs.survey_background_screen_enabled;
      this.survey_monetary = mParticleRequestAttrs.survey_monetary;
      this.survey_type = mParticleRequestAttrs.survey_type;
      this.sso_customer_id = mParticleRequestAttrs.sso_customer_id;
      this.ssu_customer_id = mParticleRequestAttrs.ssu_customer_id;
      this.tw_customer_id = mParticleRequestAttrs.tw_customer_id;
      this.tm_customer_id = mParticleRequestAttrs.tm_customer_id;
      this.tu_customer_id = mParticleRequestAttrs.tu_customer_id;
      this.lga_customer_id = mParticleRequestAttrs.lga_customer_id;
      this.go_mo_customer_id = mParticleRequestAttrs.go_mo_customer_id;
      this.sportsengine_employee = mParticleRequestAttrs.sportsengine_employee;
      this.user_email = mParticleRequestAttrs.user_email;
      this.user_roles = mParticleRequestAttrs.user_roles;
      this.user_logged_in = mParticleRequestAttrs.user_logged_in;
      this.user_linked_profile_gender_dob = mParticleRequestAttrs.user_linked_profile_gender_dob;
      this.boss_organization_id = mParticleRequestAttrs.boss_organization_id;
      this.boss_organization_name = mParticleRequestAttrs.boss_organization_name;
      this.boss_organization_addrState = mParticleRequestAttrs.boss_organization_addrState;
      this.boss_organization_sports = mParticleRequestAttrs.boss_organization_sports;
      this.platform_environment = mParticleRequestAttrs.platform_environment;
    }
  }

  class mParticleV3RequestBody {
    constructor(body) {
      this.source_request_id = body.source_request_id;
      this.mpid = body.mpid;
      this.timestamp_unixtime_ms = body.timestamp_unixtime_ms;
      this.environment = body.environment;
      this.mp_deviceid = body.mp_deviceid;
      this.sdk_version = body.sdk_version;
      this.application_info = body.application_info;
      this.consent_state = body.consent_state;
      this.integration_attributes = body.integration_attributes;
      if(body.events && body.events.length > 0) {
        this.events = body.events.map(event => new mParticleV3Event(event));
      }
    }
  }

  class mParticleV3Event {
    constructor(eventJSON) {
      this.event_type = eventJSON.event_type;
      this.data = eventJSON.data;
    }
  }

})();
