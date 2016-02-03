function serverAdded(){

}

function updateServerStatus(cid, status){
    chrome.storage.local.get('conn_buff_list', function(bufferHistory) {                                    
        bufferHistory['conn_buff_list'][cid].status = status;                                                                            
        chrome.storage.local.set({
            'conn_buff_list': bufferHistory['conn_buff_list']
        });
    });
}

function removeHistoryItem(bid, cid){
    chrome.storage.local.get('conn_buff_list', function(bufferHistory) {                                    
        _.remove(bufferHistory['conn_buff_list'][cid].buffers, { 'bid': bid, 'cid': cid });                                                                            
        chrome.storage.local.set({
            'conn_buff_list': bufferHistory['conn_buff_list']
        });
    });
}

function historyItemJoinedStatus(bid, cid, status){
    chrome.storage.local.get('conn_buff_list', function(bufferHistory) {                                    
        _.each(bufferHistory['conn_buff_list'][cid].buffers, function(buffer){
            if(buffer.cid === cid && buffer.bid === bid){
                buffer.joined = status;
            }
        });                                                                            
        chrome.storage.local.set({
            'conn_buff_list': bufferHistory['conn_buff_list']
        });
    });
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
                    cid: currentValue.cid,
                    archived: currentValue.archived,
                    buffer_type: currentValue.buffer_type                    
                };

                if(currentValue.buffer_type === 'channel'){                    
                    newBuffer.joined = false;
                }

                response[currentValue.cid].buffers.push(newBuffer);
            }
        }
        if(currentValue.type === 'channel_init'){                        
            _.each(response[currentValue.cid].buffers, function(buffer){                
                if(buffer.cid === currentValue.cid && buffer.bid === currentValue.bid){
                    buffer.joined = true;
                }                
            });           
        }       
    });
    for (cid in response) {
        response[cid].buffers = _.sortBy(response[cid].buffers, function(o) {
            return o.name;
        });
    }
    
    return response;
}