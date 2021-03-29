(function(){
  console.log("mParticle Visualizer loaded");

  let clearLogButton = document.getElementById("btn-clear-log");
  clearLogButton.addEventListener('click', function(e){
    console.log("Firing button click event");
    chrome.runtime.sendMessage({event: "btn-clear-log-click"}, function(response){
      let table = document.getElementById("inspector-request-log");
      table.children[1].innerHTML = "";
    });
  });

  let rowClickHandler = function(event) {
    let requestId = event.target.getAttribute("request-id");
    console.log(event.target.getAttribute("request-id"));
    let url = chrome.runtime.getURL("ui/request.html") + "?requestId=" + requestId;
    chrome.tabs.create({url: url});
  }

  let loadTable = function(requests) {
    let table = document.getElementById("inspector-request-log");
    table.children[1].innerHTML = "";
    requests.sort(function(r1, r2){
      if(r1.timestamp > r2.timestamp) {
        return -1;
      } else {
        return 1;
      }
    });
    requests.map(function(request){
      let row = document.createElement("tr");
      let date = new Date(request.timestamp * 1000);
      let hours = date.getHours();
      let minutes = "0" + date.getMinutes();
      let seconds = "0" + date.getSeconds();
      let formattedTime = hours + ":" + minutes.substr(-2) + ":" + seconds.substr(-2);
      row.innerHTML = "<td>" + formattedTime + "</td><td class='request-type' request-id=" + request.requestId + ">" + request.type + "</td><td>" + request.statusCode + "</td><td></td>";
      table.children[1].appendChild(row);
      if(request.type == "v3-events") {
        request.request.events.map(function(event){
          let childRow = document.createElement("tr");
          let html = "";
          html = "<td>--</td><td>" + event.event_type + "</td>";
          if(event.event_type == "screen_view" && event.data.hasOwnProperty("custom_attributes") && event.data.custom_attributes !== null) {
            html += "<td colspan=2>"
              + event.data.custom_attributes.depth1 + " / "
              + event.data.custom_attributes.depth2 + " / "
              + event.data.custom_attributes.depth3 + " / "
              + event.data.custom_attributes.depth4 + " / "
              + event.data.custom_attributes.depth5 + "</td>";
          } else {
            html += "<td colspan=2>--</td>";
          }
          childRow.innerHTML = html;
          table.children[1].appendChild(childRow);
        });
      }
    });
    let clickables = document.querySelectorAll(".request-type");
    clickables.forEach(el => el.addEventListener('click', rowClickHandler));
  }

  chrome.runtime.sendMessage({event: "fetch-stored-requests"}, loadTable);

  let messageHandler = function(msg, sender, sendResponse) {
    if(msg.hasOwnProperty("event")) {
      switch(msg.event) {
        case "event-stored":
        case "event-updated":
          console.log("Refreshing events");
          chrome.runtime.sendMessage({event: "fetch-stored-requests"}, loadTable);
          return;
        default:
          return;
      }
    }
  }

  chrome.runtime.onMessage.addListener(messageHandler);

})();