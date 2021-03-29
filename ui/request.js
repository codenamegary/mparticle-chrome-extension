(function(){
  console.log("mParticle Request View Loaded");

  const urlParams = new URLSearchParams(window.location.search);
  const requestId = urlParams.get('requestId');

  chrome.runtime.sendMessage({event: "fetch-stored-request-by-id", requestId: requestId}, function(r){
    output(syntaxHighlight(JSON.stringify(r, null, 2)));
  });

  function output(inp) {
    document.body.appendChild(document.createElement('pre')).innerHTML = inp;
  }

    function syntaxHighlight(json) {
        json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
            var cls = 'number';
            if (/^"/.test(match)) {
                if (/:$/.test(match)) {
                    cls = 'key';
                } else {
                    cls = 'string';
                }
            } else if (/true|false/.test(match)) {
                cls = 'boolean';
            } else if (/null/.test(match)) {
                cls = 'null';
            }
            return '<span class="' + cls + '">' + match + '</span>';
        });
    }

    var obj = {a:1, 'b':'foo', c:[false,'false',null, 'null', {d:{e:1.3e5,f:'1.3e5'}}]};
    var str = JSON.stringify(obj, undefined, 4);
  
})();