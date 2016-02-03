var _reqid = 0;
var retryMax = 10;
var retryCount = 1;
var error = '';

const connectionError = 'Error connecting to IRCCloud.\nOpen https://www.irccloud.com/ and make sure you are logged in.';

var ws;

chrome.runtime.onMessage.addListener(redditListener);

initConnection();

function redditListener(request, sender, sendResponse) {
    _reqid++;

    if (request.type === 'get_cloudlist') {
        chrome.storage.local.get('conn_buff_list', function(bufferHistory) {
            sendResponse({
                list: bufferHistory.conn_buff_list
            });
        })
        return true;
    }

    if(request.type === 'error_check'){
        sendResponse(error);
    }

    if (request.type === 'send') {

        var payload = {
            "_reqid": _reqid,
            "_method": "say",
            "cid": request.cid,
            "to": request.name,
            "msg": request.message
        };

        ws.send(JSON.stringify(payload));

        chrome.storage.local.get('history', function(historyItems) {
            if (!historyItems.history) {
                historyItems.history = [];
            }
            if (historyItems.length > 20) {
                historyItems.pop();
            }
            payload.date = new Date().toString();
            historyItems.history.unshift(payload);
            chrome.storage.local.set({
                "history": historyItems.history
            });
            sendResponse(); // successful send
        });

        return true;
    }

    if (request.type === 'reconnect') {
        initConnection();
        sendResponse(); // successful reconnect
    }

}

function initConnection() {
    if ("WebSocket" in window) {
        
        getSessionKey(function(cookie){

            if(!cookie){
                authenticationFailure();
            } else {
                var sessionKey = cookie.value;
            }            

            // Build the query string for since_id an stream_id (reconnect)
            chrome.storage.local.get('highest_since_id', function(resumeItem) {
                chrome.storage.local.get('stream_id', function(streamItem) {
                    buildSocketQueryString(resumeItem.highest_since_id, streamItem.stream_id, function(qs) {

                        var rws = new WebSocket("wss://api.irccloud.com/?" + qs);

                        rws.onopen = function() {
                            ws = rws;                        
                            console.debug('connection opened.');
                            ws.send(JSON.stringify({_method: "auth", cookie: sessionKey}));
                        };

                        rws.onmessage = function(evt) {

                            var cloudEvent = JSON.parse(evt.data);

                            if(cloudEvent.message === 'set_shard'){
                                var newPath = cloudEvent.host + cloudEvent.websocket_path + qs;                                
                                ws = new WebSocket(newPath);
                            }

                            if (cloudEvent.success === false && cloudEvent.message === "auth") {
                                authenticationFailure();                         
                            } else {
                                chrome.browserAction.setIcon({path:"./images/share/blue/16_share.png"});
                                error = '';
                            }

                            if (cloudEvent.eid && cloudEvent.eid > 0) {
                                chrome.storage.local.set({
                                    'highest_since_id': cloudEvent.eid
                                });
                            }

                            switch (cloudEvent.type) {
                                case 'header':
                                    chrome.storage.local.set({
                                        'stream_id': cloudEvent.streamid
                                    });
                                    if (cloudEvent.resumed) {
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
                                            console.debug('Creating the initial buffer history list.');                                        
                                            chrome.storage.local.set({
                                                'conn_buff_list': friendlyData
                                            }, function(){
                                                console.debug('Buffer saved to disk.');
                                            });
                                        })
                                        .catch(function(error) {
                                            console.error(error);
                                        });
                                    break;
                                case 'delete_buffer':
                                    // channel, user, console deleted.
                                    removeHistoryItem(cloudEvent.bid, cloudEvent.cid);
                                    break;
                                case 'you_parted_channel':
                                    historyItemJoinedStatus(cloudEvent.bid, cloudEvent.cid, false);
                                    break;
                                case 'you_kicked_channel':
                                    historyItemJoinedStatus(cloudEvent.bid, cloudEvent.cid, false);
                                    break;
                                case 'you_joined_channel':
                                    historyItemJoinedStatus(cloudEvent.bid, cloudEvent.cid, true);
                                    break;                                
                                case 'status_changed':
                                    updateServerStatus(cloudEvent.cid, cloudEvent.new_status);
                                    break;
                                case 'makeserver':
                                    // User added a server
                                    break;
                                case 'server_details_changed':
                                    // User changed the name of a server
                                    break;
                            }

                        };

                        rws.onclose = function(evt) {                            
                            console.error(evt);
                            // websocket is closed.  
                            retryCount++;          
                            var warnMsg = 'CLOSED. Attempt: ' + retryCount + ' retrying in ' + ((2000 * (retryCount * 2)) / 1000) + ' seconds.';
                            console.warn(warnMsg);
                            error = warnMsg;
                            if (retryCount < retryMax) {
                                setTimeout(function() {
                                    initConnection();
                                }, (2000 * (retryCount * 2)));
                            } else {
                                chrome.browserAction.setIcon({path:"./images/share/red/16_share.png"});
                                console.debug('Max retry count reached. Unable to connect to IRCCloud');
                            }
                        };

                        rws.onerror = function(evt) {
                            chrome.browserAction.setIcon({path:"./images/share/red/16_share.png"});                            
                            error = evt;
                            console.error(evt);
                        };
                    });
                });
            });
        });

    } else {
        throw Error('Websockets are required to use reddit-irccloud-share');
    }
}

function authenticationFailure(){
    console.error('Authentication failure.');
    chrome.browserAction.setIcon({path:"./images/share/red/16_share.png"});
    error = connectionError;   
};