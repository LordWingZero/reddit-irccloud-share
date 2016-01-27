// Handle share button click
function getURLData() {
    var self = this;

    var titleDiv = $(self).closest('.entry').find('a.title');
    var title = titleDiv.text();
    var URL = titleDiv.attr('href');
    var message = title + ' - ' + URL;

    var existingShareDialogs = $(self).closest('.entry').children('.reddit-irccloud-share');
    if(existingShareDialogs.length !== 0){
        removeAndDestroy(existingShareDialogs);
        return;
    }

    chrome.runtime.sendMessage({
        type: 'get_cloudlist'
    }, function(response) {    

        var shareDialog = buildShareDialog(response, message);        

        // Events
	    shareDialog
	    .find('#sendBtn')
        .on('click', {
            message: message,
            shareDialog: shareDialog
        }, sendMessage);

        shareDialog
        .find('#closeBtn')
        .on('click', {element: shareDialog}, removeAndDestroyEvent);

        $(self).closest('.buttons').after(shareDialog);

    });
}

function sendMessage(event) {

    var shareDialog = event.data.shareDialog;
    var selectBox = shareDialog.find('#connectionSelBox option:selected');
    var cid = selectBox.closest('optgroup').attr('value');
    var name = selectBox.text();

    chrome.runtime.sendMessage({
        type: 'send',
        name: name,
        message: event.data.message,
        cid: cid
    }, function(response) {
        $(self).text('share-irccloud (sent!)').css({
            color: 'green'
        });
        removeAndDestroy(shareDialog);
    });
}

function removeAndDestroyEvent(event){
    removeAndDestroy(event.data);
}

function removeAndDestroy(element){
    element.off();
    element.remove();
}

function buildShareDialog(data, message) {

    var select = $('<select id="connectionSelBox" class="c-form-control"></select>');    
    for(cid in data.list){    	
    	var li = $('<optgroup value="'+cid+'" label="'+data.list[cid].name+'"></optgroup>');
    	data.list[cid].buffers.forEach(function(buffer){
			li.append('<option value="'+buffer.bid+'">'+buffer.name+'</option>');
    	});
    	select.append(li);
    };

    var selectWrapper = $([
            '<div class="c-form-group">',
                '<div class="post-sharing-label">Channel:</div>',
            '</div>'
        ].join(''));

    selectWrapper.append(select);

    var shareDialog = $([
    	'<div class="reddit-irccloud-share post-sharing" style="display: none;">',
    	'<a id="closeBtn" class="c-close c-hide-text">close this window</a>',
	        '<div class="post-sharing-main post-sharing-form" style="display:block;">',
	    		'<div class="c-form-group">',
	    			'<div class="post-sharing-label">Text:</div>',
	    			'<input class="post-sharing-link-input c-form-control" type="text" value="' + message + '" />', 			                    
	            '</div>',
	    		'<div class="c-form-group">',
	    			'<button id="sendBtn" type="button" class="btn btn-primary">Send</button>', 			                    
	            '</div>',	            
	        '</div>',
        '</div>'
        ].join(''))
        .prepend(selectWrapper)            
        .show();

        return shareDialog;

}

// Create share button
const redditIRCCLoudShareBtn = $('<li class="irccloud"><a>share-irccloud</a></li>');

// Attache event handler
redditIRCCLoudShareBtn.on('click', getURLData);

// Append to DOM
var buttonMenu = $('.buttons').append(redditIRCCLoudShareBtn);