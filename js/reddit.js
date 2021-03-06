attachButtons();

registerNeverEndingRedditListener();


// Handle share button click
function handleShareClick() {
    var self = this;

    var titleDiv = $(self).closest('.entry').find('a.title');
    var title = titleDiv.text();
    var URL = titleDiv.attr('href');

    if(_.startsWith(URL, '/r/')){
        URL = ('https://www.reddit.com' + URL);
    }

    var message = '"' + title + '" ' + URL;

    chrome.storage.local.get('dialogOpts', function(options) {
        chrome.storage.local.get('history', function(history) {

            if (options.dialogOpts) {
                message = options.dialogOpts.format.replace('%title%', title).replace('%url%', URL);
            }

            // Some titles have quotes already
            if(title[0] === '"' && title[title.length -1] === '"'){
                message = message.replace(/\"\"/g, '"');
            }

            // Clicking the share button again will "close" the closest existing dialog
            var existingShareDialogs = $(self).closest('.entry').children('.reddit-irccloud-share');
            if (existingShareDialogs.length !== 0) {
                removeAndDestroy(existingShareDialogs);
                return;
            }

            chrome.runtime.sendMessage({
                type: 'get_cloudlist'
            }, function(response) {

                var shareDialog = buildShareDialog(history, response, message, options.dialogOpts);

                // Events
                shareDialog
                    .find('#sendBtn')
                    .on('click', {
                        shareDialog: shareDialog,
                        shareBtn: self
                    }, sendMessage);

                shareDialog
                    .find('#shareDialogForm')
                    .on('submit', {
                        shareDialog: shareDialog,
                        shareBtn: self
                    }, sendMessage);

                shareDialog
                    .find('a#closeBtn')
                    .on('click', {
                        element: shareDialog
                    }, removeAndDestroyEvent);

                $(self).closest('.buttons').after(shareDialog);
            });
        });
    });
}

function sendMessage(event) {

    event.preventDefault();

    var shareDialog = event.data.shareDialog;
    var selectBox = shareDialog.find('#connectionSelBox option:selected');
    var cid = selectBox.closest('optgroup').attr('value');
    var name = selectBox.text();

    chrome.runtime.sendMessage({
        type: 'send',
        name: name,
        message: shareDialog.find('#ircmsgTxt').val(),
        cid: cid
    }, function(response) {
        $(event.data.shareBtn).text('share-irccloud (sent to ' + name + '!)').css({
            color: 'green'
        });
        removeAndDestroy(shareDialog);
    });
}

function removeAndDestroyEvent(event) {
    removeAndDestroy(event.data.element);
}

function removeAndDestroy(element) {    
    element.remove();
}

function buildShareDialog(sentHistory, bufferHistory, message, options) {
    var select = $('<select id="connectionSelBox" class="c-form-control"></select>');
    for (cid in bufferHistory.list) {    
        console.log(bufferHistory.list[cid].status);
        if(bufferHistory.list[cid].status === 'connected_ready'){
            var li = $('<optgroup value="' + cid + '" label="' + bufferHistory.list[cid].name + '"></optgroup>');
            bufferHistory.list[cid].buffers.forEach(function(buffer) {
                if(options && options.hideArchived && buffer.archived === true){
                    return;            
                }
                if((buffer.buffer_type === 'channel' && buffer.joined == true) || (buffer.buffer_type === 'conversation')){
                    li.append('<option value="' + buffer.bid + '">' + buffer.name + '</option>');
                }        
            });
            select.append(li);    
        }    
    };

    if (sentHistory.history) {
        select.find('option').each(function() {
            this.selected = (this.text == sentHistory.history[0].to);
        });
    }

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
            '<form id="shareDialogForm">',
            '<input id="ircmsgTxt" class="post-sharing-link-input c-form-control" type="text"/>',
            '</form>',
            '</div>',
            '<div class="c-form-group">',
            '<button id="sendBtn" type="button" class="btn btn-primary">Send</button>',
            '</div>',
            '</div>',
            '</div>'
        ].join(''));

    shareDialog.find('#ircmsgTxt').val(message);

    shareDialog
        .prepend(selectWrapper)        
        .show()        

    return shareDialog;
}

function attachButtons(){

    var buttonMenus = $('.link').find('.buttons');

    buttonMenus = buttonMenus.filter(function(index, element){          
        return ($(element).children('.irccloud').length === 0);
    });

    // Create share button
    const redditIRCCLoudShareBtn = $('<li class="irccloud"><a>share-irccloud</a></li>');

    // Attach event handler
    redditIRCCLoudShareBtn.on('click', handleShareClick);

    buttonMenus.append(redditIRCCLoudShareBtn);

}

function registerNeverEndingRedditListener(){
    window.addEventListener("message", function(event) {
      // We only accept messages from ourselves
      if (event.source != window)
        return;

      if (event.data.type && (event.data.type == "neverEndingLoaded")) {    
        attachButtons();
      }
    }, false);

    var elt = document.createElement("script");
    elt.innerHTML = "window.addEventListener('neverEndingLoaded', function(){ window.postMessage({ type: 'neverEndingLoaded' }, '*'); });"
    elt.setAttribute('type', 'text/javascript');
    document.head.appendChild(elt);
}