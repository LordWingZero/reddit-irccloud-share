// Handle share button click
function getURLData() {
    var self = this;

    var titleDiv = $(self).closest('.entry').find('a.title');
    var title = titleDiv.text();
    var URL = titleDiv.attr('href');
    var message = title + ' - ' + URL;

    chrome.runtime.sendMessage({
        type: 'get_cloudlist'
    }, function(response) {

        var shareDialog = buildShareDialog(response, message);

        // Events
	    shareDialog
	    .find('#sendBtn')
        .on('click', {
            message: message
        }, sendMessage);

        shareDialog
        .find('#closeBtn')
        .on('click', function(){
        	shareDialog.off();
        	shareDialog.remove();
        });

        $(self).closest('.buttons').after(shareDialog);

    });
}

function sendMessage(event) {

    console.log(event.data);
    console.log(event.target);

    // var titleDiv = $(self).closest('.entry').find('a.title'); // wrong
    // var title = titleDiv.text();
    // var URL = titleDiv.attr('href');

    // chrome.runtime.sendMessage({
    //     type: 'send'
    // }, function(response) {

    //     $(self).text('share-irccloud (sent!)').css({
    //         color: 'green'
    //     });

    // });

}

function buildShareDialog(data, message) {

    var select = $('<select class="c-form-control"></select>');    
    for(cid in data.list){    	
    	var li = $('<optgroup label="'+data.list[cid].name+'"></optgroup>');
    	data.list[cid].buffers.forEach(function(buffer){
			li.append('<option value="'+buffer.bid+'">'+buffer.name+'</option>');
    	});
    	select.append(li);
    };

    var shareDialog = $([
    	'<div class="post-sharing" style="display: none;">',
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
        .prepend(select)            
        .show();

        return shareDialog;

}

// Create share button
const redditIRCCLoudShareBtn = $('<li class="irccloud"><a>share-irccloud</a></li>');

// Attache event handler
redditIRCCLoudShareBtn.on('click', getURLData);

// Append to DOM
var buttonMenu = $('.buttons').append(redditIRCCLoudShareBtn);