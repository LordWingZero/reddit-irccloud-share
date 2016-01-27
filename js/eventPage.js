var _reqid = 0;

var retryMax = 10;
var retryCount = 1;

const connectionError = 'Error connecting to IRCCloud.\nOpen https://www.irccloud.com/ and make sure you are logged in.';

var ws;

chrome.runtime.onMessage.addListener(redditListener);

function redditListener(request, sender, sendResponse) {   
    _reqid++;

    if(request.type === 'get_cloudlist'){
        sendResponse({list: JSON.parse(localStorage.getItem('conn_buff_list'))});
        return;
    }

    if(request.type === 'send'){

        var payload = {
             "_reqid":_reqid,
             "_method":"say",
             "cid":request.cid,
             "to":request.name,
             "msg":request.message
         };
        
       ws.send(JSON.stringify(payload));            

        sendResponse(); // successful send

        return;
    }

}

(function initConnection() {	
    if ("WebSocket" in window) {

        // Build the query string for since_id an stream_id (reconnect)
        var qs = buildSocketQueryString(localStorage.getItem('highest_since_id'), localStorage.getItem('stream_id'));

        var rws = new WebSocket("wss://www.irccloud.com/?" + qs);

        rws.onopen = function()
        {
            ws = rws;
           console.debug('Starting websocket connection.');
        };

        rws.onmessage = function(evt) {     
            console.log(evt)   	

            var cloudEvent = JSON.parse(evt.data);            

        	if(cloudEvent.success === false && cloudEvent.message === "auth"){
        		// TODO: change the button icon, and then have the user login again
    			alert('1: ' + connectionError);
        	}

            if(cloudEvent.eid && cloudEvent.eid > 0){
                localStorage.setItem('highest_since_id', cloudEvent.eid);                    
            }

            switch (cloudEvent.type) {
            	case 'header':
                    localStorage.setItem('stream_id', cloudEvent.streamid);
            		if(cloudEvent.resumed){
                        retryCount++;
                        console.debug('We missed ' + cloudEvent.accrued + ' events.');
                    }                    
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
                            localStorage.setItem('conn_buff_list', JSON.stringify(friendlyData));
                            console.log(JSON.parse(localStorage.getItem('conn_buff_list')));
                            console.log('done.');
                        })
                        .catch(function(error) {
                            console.error(error);                            
                        });
                    break;
                case 'makeserver':
                    break;
                case 'makebuffer':
                    break;
                case 'deletebuffer':
                    break;                    
                case 'channel_init':                
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
            console.warn('CLOSED. Count: ' + retryCount + ' retrying in ' + ((2000 * (retryCount * 2)) / 1000) + ' seconds.');
            if(retryCount !== retryMax){
            	setTimeout(function(){initConnection()}, 2000 * (retryCount * 2));
        	} else {
                // todo, page?
                alert('Max retry count reached. Unable to connect to IRCCloud');
            }            
        };

        rws.onerror = function(evt) {
            console.error(evt);            
        };

    } else {
        throw Error('Websockets are required to use reddit-irccloud-share');
    }    
})();

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
        	if(currentValue.buffer_type !== 'console'){
	            response[currentValue.cid].buffers.push({
	                name: currentValue.name,
	                bid: currentValue.bid,
	                archive: currentValue.archived
	            });
            }
        }        
	});    
    for(cid in response){
        response[cid].buffers = _.sortBy(response[cid].buffers, function(o) { return o.name; });
    }
    return response;
}

function buildSocketQueryString(highestSinceId, streamId){

    var qs = "";
    if(highestSinceId){
        qs += 'since_id=' + highestSinceId;
    }
    if(streamId){
        if(highestSinceId !== 0){
            qs +='&';
        }
        qs += 'stream_id=' + streamId;
    }

    // If we lose our global list, we re-fetch full buffe
    if(!localStorage.getItem('conn_buff_list')){
        console.debug('Buffer history missing. Refretching full buffer.');
        qs = '';
    }

    return qs;
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