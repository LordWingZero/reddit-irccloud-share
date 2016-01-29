var _reqid = 0;

var retryMax = 10;
var retryCount = 1;

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

        // Build the query string for since_id an stream_id (reconnect)
        chrome.storage.local.get('highest_since_id', function(resumeItem) {
            chrome.storage.local.get('stream_id', function(streamItem) {
                buildSocketQueryString(resumeItem.highest_since_id, streamItem.stream_id, function(qs) {

                    var rws = new WebSocket("wss://www.irccloud.com/?" + qs);

                    rws.onopen = function() {
                        ws = rws;                        
                        console.debug('connection opened.');
                    };

                    rws.onmessage = function(evt) {
                        console.log(evt)

                        var cloudEvent = JSON.parse(evt.data);
                        if (cloudEvent.success === false && cloudEvent.message === "auth") {
                            // TODO: change the button icon, and then have the user login again
                            chrome.browserAction.setIcon({path:"./images/share/red/16_share.png"});
                            alert('1: ' + connectionError);
                        } else {
                            chrome.browserAction.setIcon({path:"./images/share/blue/16_share.png"});
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
                                        console.log('Setting global list for the first time.');                                        
                                        chrome.storage.local.set({
                                            'conn_buff_list': friendlyData
                                        });
                                    })
                                    .catch(function(error) {
                                        console.error(error);
                                    });
                                break;
                            case 'makeserver':
                                // new connection
                                // if channel, joined == false
                                break;
                            case 'makebuffer':
                                // channels/PMs created
                                break;

                            case 'delete_buffer':
                                // channel, user, console deleted.
                                chrome.storage.local.get('conn_buff_list', function(bufferHistory) {
                                    _.each(bufferHistory, function(connection){
                                        connection.buffers = connection.buffer.filter(function(buffer){
                                            return (buffer.cid === cloudEvent.cid && buffer.bid === cloudEvent.bid);
                                        });
                                    });
                                    chrome.storage.local.set({
                                        'conn_buff_list': newBufferList
                                    });
                                });
                                break;

                            case 'channel_init':
                                // Loop through all buffers and set joined == true
                               chrome.storage.local.get('conn_buff_list', function(bufferHistory) {
                                    _.each(bufferHistory, function(connection){
                                        connection.buffer.forEach(function(buffer){
                                            if(buffer.cid === cloudEvent.cid && buffer.bid === cloudEvent.bid){
                                                buffer.joined = true;
                                            }
                                        });
                                    });
                                    chrome.storage.local.set({
                                        'conn_buff_list': newBufferList
                                    });
                                });
                                break;
                            case 'you_parted_channel':
                                break;
                            case 'you_kicked_channel':
                                break;

                            case 'status_changed':                                                      
                                if (cloudEvent.new_status === 'connected') {
                                    // Add server to backlog cache
                                }
                                if (cloudEvent.new_status === 'disconnected') {
                                    // Remove server from backlog cache
                                }
                                break;
                        }

                    };

                    rws.onclose = function(evt) {
                        // websocket is closed.            
                        console.warn('CLOSED. Count: ' + retryCount + ' retrying in ' + ((2000 * (retryCount * 2)) / 1000) + ' seconds.');
                        if (retryCount !== retryMax) {
                            setTimeout(function() {
                                initConnection();
                            }, 2000 * (retryCount * 2));
                        } else {
                            chrome.browserAction.setIcon({path:"./images/share/red/16_share.png"});
                            console.debug('Max retry count reached. Unable to connect to IRCCloud');
                        }
                    };

                    rws.onerror = function(evt) {
                        chrome.browserAction.setIcon({path:"./images/share/red/16_share.png"});                        
                        console.error(evt);
                    };
                });
            });
        });

    } else {
        throw Error('Websockets are required to use reddit-irccloud-share');
    }
}

function normalizeBacklog(backlogData) {    
    var response = {};
    backlogData.forEach(function(currentValue, index, array) {
        if (currentValue.type === "makeserver") {
            response[currentValue.cid] = {
                name: currentValue.name,
                order: currentValue.order,
                status: currentValue.status,
                buffers: []
            };
        }
        if (currentValue.type === "makebuffer") {
            if (currentValue.buffer_type !== 'console') {
                var newBuffer = {
                    name: currentValue.name,
                    bid: currentValue.bid,
                    archived: currentValue.archived,
                    buffer_type: currentValue.buffer_type                    
                };

                if(currentValue.buffer_type === 'channel'){                    
                    newBuffer.joined = false;
                }

                response[currentValue.cid].buffers.push(newBuffer);
            }
        }
    });
    for (cid in response) {
        response[cid].buffers = _.sortBy(response[cid].buffers, function(o) {
            return o.name;
        });
    }
    console.log(response);
    return response;
}

function buildSocketQueryString(highestSinceId, streamId, cb) {
    chrome.storage.local.get('conn_buff_list', function(bufferHistory) {

        // If we lose our global list, we re-fetch full buffe
        if (!bufferHistory.conn_buff_list) {
            console.debug('Buffer history missing; refretching full buffer.');
            cb('');
        }

        var qs = "";
        if (highestSinceId) {
            qs += 'since_id=' + highestSinceId;
        }
        if (streamId) {
            if (highestSinceId) {
                qs += '&';
            }
            qs += 'stream_id=' + streamId;
        }

        cb(qs);
    });
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