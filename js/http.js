function buildSocketQueryString(highestSinceId, streamId, cb) {
    chrome.storage.local.get('conn_buff_list', function(bufferHistory) {

        // If we lose our global list, we re-fetch full buffe
        if (!bufferHistory.conn_buff_list) {
            console.debug('Buffer history missing; calling websocket with no query string parameters.');
            cb('');
            return;
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