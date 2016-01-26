var _reqid = 0;
var retryMax = 4;
var retryCount = 1;
const connectionError = 'Error connecting to IRCCloud.\nOpen https://www.irccloud.com/ and login.';
var globalIRCCloudList;

// Kickoff
initConnection(42);

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {	
    //_reqid++;
    switch(request.type){
    	case 'get_cloudlist':    		
    		sendResponse({list: globalIRCCloudList});    		
    		break;
		case 'send':
    		break;
    }
});

function initConnection(Cookie) {	
    if ("WebSocket" in window) {

		// DEBUG
        // replace window. with var
        var rws = new WebSocket("wss://www.irccloud.com/");

        rws.onopen = function()
        {
           console.log('Starting websocket connection.'); // DEBUG
        };

        rws.onmessage = function(evt) {        	
            var cloudEvent = JSON.parse(evt.data);            

        	if(cloudEvent.success === false && cloudEvent.message === "auth"){
        		// We need to change the button icon, and then have the user login again
    			alert(connectionError);
        	}

            switch (cloudEvent.type) {
            	case 'header':
            		// console.log(evt);
            		break;
                case 'oob_include':                	
                    var options = {
                        credentials: 'include'
                    };
                    fetch('https://www.irccloud.com' + cloudEvent.url, options)
                        .then(checkStatus)
                        .then(parseJSON)
                        .then(normalizeBacklog)
                        .then(function(friendlyData) {
                        	console.log('Setting global list.');
                        	console.log(friendlyData);
                            globalIRCCloudList = friendlyData;
                            console.log('done.');
                        })
                        .catch(function(error) {
                            alert(connectionError);
                        });
                    break;
                case 'channel_init':
                // https://github.com/irccloud/irccloud-tools/wiki/API-Stream-Message-Reference#channel_init
                	break;
                case 'you_parted_channel':
                	break;
                case 'you_kicked_channel':
                	break;
                case 'quit':
                	break;                	
                case 'status_changed':
                	if(cloudEvent === 'connected'){
                		// Add server to backlog cache
                	}
                	if(cloudEvent === 'disconnected'){
                		// Remove server from backlog cache
                	}
                	break;                     	
            }
        };

        rws.onclose = function(evt) {        	
            // websocket is closed.
            retryCount++;
            if(retryCount !== retryMax){
            	setTimeout(function(){initConnection(Cookie)}, 5000 * (retryCount * 2));
        	}
        };

        rws.onerror = function(evt) {
            alert(connectionError);
        };

    }

}

function normalizeBacklog(backlogData){
	var response = {};
	backlogData.forEach(function(currentValue, index, array){
        if (currentValue.type === "makeserver") {
            response[currentValue.cid] = {                                        
                name: currentValue.name,
                order: currentValue.order,
                status: currentValue.status,
                buffers: []
            };
        }
        if (currentValue.type === "makebuffer") {
        	if(currentValue.name !== '*'){
	            response[currentValue.cid].buffers.push({
	                name: currentValue.name,
	                bid: currentValue.bid,
	                archive: currentValue.archived
	            });
            }
        }
	});
    return response;
}

function getSessionKey(cb){
	chrome.cookies.get({
        url: 'https://www.irccloud.com/',
        name: 'session'
    }, cb);
}

function checkStatus(response) {	
    if (response.status >= 200 && response.status < 300) {
        return response;
    } else {
        var error = new Error(response.statusText);
        error.response = response;
        throw error;
    }
}

function parseJSON(response) {
    return response.json()
}